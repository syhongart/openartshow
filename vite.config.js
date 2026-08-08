// vite.config.js — 아키텍처 로드맵 B-2b "Vite 배포기 승격(검증)"
//
// ⚠️ 이 단계(B-2b-0/1)는 "빌드가 예상 배포구조를 산출하는가"의 검증까지다.
//    deploy.yml 은 무변경(라이브 0영향). 커밋도 하지 않는다(팀장 검증 후 조율).
//
// 설계(승인됨):
//  · base 절대 '/openartshow/' — rollup 멀티페이지의 공유 _bundle 하나를, 깊이가
//    다른 랜딩(루트)·앱(app/)이 함께 참조해야 한다. 상대 base 로는 깊이별 공유 불가.
//    절대 base 면 vite 관리 참조가 /openartshow/_bundle/… 로 깊이 무관. 배포 서브패스
//    (github.io/openartshow/)가 영구 고정이라 회귀 아님.
//  · HTML rename(generateBundle): rollup input 키는 출력경로를 못 정하고 HTML 은 root
//    상대경로로 emit 된다. emit fileName 을 배포구조로 재지정(landing→index, 미술관
//    index→app/index, 앱군→app/…). 절대 base 라 HTML 위치 이동이 자산참조를 안 깬다.
//  · CSP 자동정합(generateBundle 후단): 각 산출 HTML 의 남은 인라인 실행 script 의
//    sha256 을 실측 → script-src 를 'self' + 실측핀으로 재작성. 다른 디렉티브(connect-src
//    등)는 원문 보존. importmap 잔재·무효 핀 제거.

import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { copyFileSync, mkdirSync, cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
// 배포 서브패스의 정의는 `scripts/site-url.mjs` 한 곳이다(검수관 B3). 여기 값을 따로
// 적으면 도메인·저장소명을 옮길 때 한쪽만 고쳐도 아무도 모른다.
import { BASE_PATH } from './scripts/site-url.mjs';
// 진입점 목록·재배치·노출 상태의 **SSOT**. 여기서 유도하지 않고 아래에 다시 적으면
// 그 순간 값 미러링이고, 실제로 `builder.html` 이 라이브가 된 뒤에도 이 파일 주석만
// `// behind-flag` 로 남아 있던 사고가 그것이었다.
// `htmlRename` 은 아래에 **플러그인 함수**로 이미 있다(이름 충돌) — 맵 쪽을 개명해 받는다.
import { viteInput, htmlRename as entryRenameMap } from './scripts/lib/entrypoints.mjs';
// 인라인 script 의 CSP sha256 **계산 규약**의 SSOT. `tests/csp-inline-pins.test.ts` 가
// 같은 모듈로 소스 HTML 을 검사하므로, 빌드가 쓰는 규약과 검사가 보는 규약이 갈리지 않는다.
import { inlineExecScripts } from './scripts/lib/csp-inline.mjs';

const r = (p) => resolve(import.meta.dirname, p);

// ── 플러그인0: .js→.ts 폴백 resolve(감독 B안) ───────────────────────
// 배경(B-5): leaf 모듈을 .ts로 전환하되 소비자 import 는 `.js` 확장자를 유지한다.
// 특히 라이브 보호파일(main.js·player.js·artworks.js·config.js)을 무수정으로 두는 것이
// 이 방식의 목표다. vite/rollup 기본 resolver 는 확장자 명시 `./stats.js` 를 `.ts` 로
// 치환하지 않으므로, "실재하는 .js 가 없고 대응 .ts 가 있을 때만" .ts 절대경로로
// 폴백하는 pre-resolver 를 1회 얹는다.
//   · frontend/js 상대 import 에만 적용: source 가 `./`·`../` 상대경로 + `.js` 로 끝날 때만.
//   · node_modules·vendor 무개입: bare specifier(three·peerjs)는 상대경로가 아니라
//     애초에 매치 안 됨. importer 가 node_modules 안이면 즉시 스킵. vendor/ 의 실재
//     .js 는 existsSync 로 걸러져 그대로 통과(폴백 안 함).
//   · dev/build 공용(플러그인은 양쪽에서 동작). vitest 는 별도 config 라 거기서도 재사용.
export function tsJsFallback() {
  return {
    name: 'oas-ts-js-fallback',
    enforce: 'pre', // vite 기본 resolver 보다 먼저 개입해 .ts 로 리다이렉트
    resolveId(source, importer) {
      if (!importer) return null;                       // 진입점 자체는 대상 아님
      if (importer.includes('node_modules')) return null; // 의존성 내부 상대 import 무개입
      if (!source.startsWith('./') && !source.startsWith('../')) return null; // 상대경로만
      if (!source.endsWith('.js')) return null;         // .js 명시 import 만
      const abs = resolve(dirname(importer), source);
      if (existsSync(abs)) return null;                 // 실재 .js → 폴백 불필요(그대로)
      const tsAbs = abs.slice(0, -3) + '.ts';
      if (existsSync(tsAbs)) return tsAbs;              // .js 부재 + .ts 존재 → .ts 로 해소
      return null;
    },
  };
}

// root=frontend 기준 emit fileName → 배포구조 경로. (맵 미포함 HTML 은 루트 불변)
// **목록은 `scripts/lib/entrypoints.mjs` 가 갖는다** — 노출 상태(behind-flag 여부)와
// 같은 곳에 있어야 검증 등급 판정기가 읽을 수 있고, 두 곳에 적으면 어긋난다.
const HTML_RENAME = entryRenameMap();


// ── 플러그인1: 자기완결(기존 b2a 보강) ──────────────────────────────
//  (1) 산출 HTML 의 인라인 importmap 제거: three 는 bare specifier 로 이미 번들 해소.
//      importmap 은 dead → 제거해야 인라인 최소화 + CSP 불필요 핀 제거.
//  (2) 런타임 동적 자산(문자열 경로로 fetch/load, vite 정적추적 불가)을 정적 복사.
//      ⚠️ 타깃은 dist/app/ — 앱 런타임 상대경로가 /openartshow/app/ 기준이므로.
//      galleries·world·assets·utils·vendor/peerjs.min.js → dist/app/…
//      fonts·three 는 복사하지 않는다: <link>/bare import 로 vite 가 번들해 _bundle 로
//      dedup(중복 방지)한다. (_bundle 은 절대 base 로 루트 dist/_bundle 하나)
function selfContained() {
  return {
    name: 'oas-self-contained',
    transformIndexHtml(html) {
      return html.replace(/[ \t]*<script type="importmap">[\s\S]*?<\/script>\n?/g, '');
    },
    closeBundle() {
      const dist = r('dist');
      mkdirSync(resolve(dist, 'app/vendor'), { recursive: true });
      // peerjs 는 전역 IIFE(window.Peer)라 ES 모듈 번들 대상이 아님 → self 로 정적 유지.
      copyFileSync(r('frontend/vendor/peerjs.min.js'), resolve(dist, 'app/vendor/peerjs.min.js'));
      for (const d of ['galleries', 'world', 'assets', 'utils']) {
        const src = r('frontend/' + d);
        if (existsSync(src)) cpSync(src, resolve(dist, 'app', d), { recursive: true });
      }
    },
  };
}

// ── 플러그인2: HTML rename(generateBundle) ──────────────────────────
// rollup input 키가 정한 emit fileName 을 배포구조로 재지정. 충돌(landing→index,
// 미술관 index→app/index) 회피: 2패스 — 먼저 모든 old 를 제거해 모은 뒤 재삽입.
function htmlRename() {
  return {
    name: 'oas-html-rename',
    enforce: 'post', // vite:build-html 이 HTML 을 emit 한 뒤 실행돼야 bundle 에서 찾힌다.
    generateBundle(_options, bundle) {
      const pending = [];
      for (const [oldName, newName] of Object.entries(HTML_RENAME)) {
        const asset = bundle[oldName];
        if (asset) {
          delete bundle[oldName];
          asset.fileName = newName;
          pending.push([newName, asset]);
        }
      }
      for (const [newName, asset] of pending) bundle[newName] = asset;
    },
  };
}

// ── 플러그인3: CSP 자동정합(closeBundle — 디스크 최종본 기준) ────────
// vite 가 인라인 module 진입점을 외부 청크로 추출하면 원래 CSP 의 sha256 핀 일부가
// dead 가 된다(예: landing 의 module 2블록). generateBundle 시점 재작성은 vite 내부
// post 훅의 추가 변형(base 경로 주입 등)과 어긋날 수 있어, "디스크에 written 된 최종
// HTML"을 직접 실측·재작성한다 → 실측=브라우저가 받는 바이트가 100% 보장.
// script-src 만 'self' + 실측핀으로 재작성. connect-src 등 다른 디렉티브는 원문 보존.
function reconcileHtmlCsp(filePath) {
  let html = readFileSync(filePath, 'utf8');

  // importmap 잔재 제거(방어 — transformIndexHtml 후에도 안전망).
  html = html.replace(/[ \t]*<script type="importmap">[\s\S]*?<\/script>\n?/g, '');

  // 남은 인라인 실행 script 의 sha256 실측(최종 HTML 의 raw body 기준).
  // 계산 규약(주석 제거본에서 스캔 · 실행 type 판정 · body 원문 해시)은
  // `scripts/lib/csp-inline.mjs` **한 곳**이다. 여기에 다시 적으면 그것이 곧 값 미러링이고,
  // 규약이 미묘하게 갈리면 **"빌드는 통과했는데 검사가 빨간불"**(또는 그 반대)이 성립한다 —
  // 소스 핀이 세 파일에서 어긋난 채 아무도 모르고 있던 것을 그 모듈 주석에 적어 뒀다.
  const hashes = new Set(inlineExecScripts(html).map((s) => s.hash));

  // CSP meta 의 script-src 만 재작성(다른 디렉티브 보존).
  html = html.replace(
    /(<meta http-equiv="Content-Security-Policy"[^>]*content=")([^"]*)(")/i,
    (_full, pre, content, post) => {
      const rebuilt = content.replace(
        /script-src[^;]*/i,
        `script-src 'self'${hashes.size ? ' ' + [...hashes].join(' ') : ''}`
      );
      return pre + rebuilt + post;
    }
  );

  writeFileSync(filePath, html);
}

function cspReconcile() {
  return {
    name: 'oas-csp-reconcile',
    closeBundle() {
      const walk = (dir) => {
        for (const ent of readdirSync(dir, { withFileTypes: true })) {
          const p = resolve(dir, ent.name);
          if (ent.isDirectory()) walk(p);
          else if (ent.name.endsWith('.html')) reconcileHtmlCsp(p);
        }
      };
      walk(r('dist'));
    },
  };
}

export default defineConfig({
  // 순서: ts폴백(pre) → rename → CSP(rename 후 fileName 기준). self-contained 는 closeBundle(후처리).
  plugins: [tsJsFallback(), selfContained(), htmlRename(), cspReconcile()],
  root: 'frontend',
  // 배포 서브패스(github.io/openartshow/) — 절대 base 로 깊이 무관 공유.
  base: BASE_PATH,
  build: {
    outDir: r('dist'),
    emptyOutDir: true,
    // 번들 자산 폴더 '_bundle' — 앱 런타임의 './assets/…' 동적 load 와 이름 충돌 회피.
    assetsDir: '_bundle',
    // world 진입점 top-level await(manifest fetch) → esbuild target esnext.
    target: 'esnext',
    // 인라인 modulepreload polyfill 제거 — CSP script-src 'self' 로만 로드.
    modulePreload: { polyfill: false },
    // ── 라이선스 주석을 번들에 남긴다 (법무 §6, 2026-07-31) ───────────────
    // three·PeerJS 는 MIT 다. MIT 는 **저작권 고지 유지를 허락의 조건**으로 삼으므로,
    // 이용자 기기로 전송되는 번들에도 고지가 살아 있어야 한다(웹앱 배포도 사본 배포다).
    //
    // 실측(2026-07-31): 이 줄이 없던 상태에서도 `@license` 주석은 살아남고 있었다 —
    // three 청크 3개 전부에 `Copyright 2010-2024 Three.js Authors` 와 SPDX 가 있었다.
    // 그러니 이것은 위반 해소가 아니라 **기본값 의존을 끊는 것**이다. esbuild 가
    // legalComments 기본값을 바꾸면 고지가 조용히 사라지고, 아무 게이트도 알려주지 않는다.
    // 사람이 읽는 고지는 `/making/licenses/` 가 따로 담당한다(미니파이된 JS 주석은
    // 기계는 읽어도 방문자는 못 읽는다).
    //
    // 실제 보존 설정은 최상위 `esbuild.legalComments` 다(이 파일 아래쪽). vite 의
    // 기본 minifier 가 esbuild 이지만 명시해 둔다 — 기본값이 바뀌면 그 옵션이
    // 통째로 무시되기 때문이다.
    minify: 'esbuild',
    rollupOptions: {
      // 진입점 목록의 SSOT 는 `scripts/lib/entrypoints.mjs` 다. 어느 것이 라이브고
      // 어느 것이 behind-flag 인지도 거기 한 곳에 있다 — 여기 주석으로 적으면 낡는다
      // (`builder.html` 이 라이브가 된 뒤에도 `// behind-flag` 주석이 남아 있었다).
      input: viteInput(r),
      output: {
        manualChunks(id) {
          // [번들 분리] three/webgpu 는 오픈월드(world.js) 한 곳만 쓴다. 그런데 예전에는
          // `node_modules/three` 를 통째로 한 청크에 묶어, WebGPU 를 전혀 안 쓰는
          // 미술관·빌더·스튜디오까지 그 코드를 받았다. vendor-three 가 540KB→1,048KB 로
          // 두 배가 된 정체가 이것이다(gzip 137.6→279.2KB).
          //   · three        → build/three.module.js  (WebGL)
          //   · three/webgpu → build/three.webgpu.js  (오픈월드 전용)
          // 공유 코어(three.core.js)는 vendor-three 에 남아 양쪽이 함께 쓴다.
          // 코어를 먼저 갈라낸다. 안 그러면 three.module ↔ three.webgpu 가 코어를 사이에
          // 두고 서로를 참조해 rollup 이 순환 청크를 만든다(초기화 순서가 깨질 수 있다).
          if (id.includes('node_modules/three/build/three.core')) return 'vendor-three-core';
          // TSL(WebGPU 셰이더 언어)에 의존하는 것은 전부 webgpu 쪽으로 보낸다.
          // three.tsl 과 examples/jsm/tsl·lighting 이 여기 해당하는데, 이것들이 `three`
          // 매칭에 걸려 WebGL 청크로 가 있었고 — 그래서 **WebGL 청크가 WebGPU 청크를
          // import** 했다. 미술관·빌더가 WebGPU 를 안 쓰면서도 받아가던 진짜 경로다.
          if (id.includes('node_modules/three/build/three.webgpu')
            || id.includes('node_modules/three/build/three.tsl')
            || id.includes('node_modules/three/examples/jsm/tsl/')
            || id.includes('node_modules/three/examples/jsm/lighting/')) return 'vendor-three-webgpu';
          if (id.includes('node_modules/three')) return 'vendor-three';
          if (id.includes('node_modules/peerjs')) return 'vendor-peerjs';
        },
      },
    },
  },
  // ── 라이선스 주석 보존 (법무 §6, 2026-07-31) ────────────────────────────
  // `build.minify: 'esbuild'` 와 짝이다. 왜 필요한지는 그쪽 주석에 적었다.
  // 'eof' — 각 산출 파일 **끝에 라이선스 주석을 모은다.** 'inline'(원위치 보존)보다
  // 번들이 작고, 'none' 과 달리 고지가 남는다.
  //
  // 이 값이 지켜지는지는 **스모크 검사9(라이선스 고지)** 가 본다 — 조립된 `_site` 의
  // 번들을 읽어 three·PeerJS 고지 문자열의 존재를 단언한다. vitest 가 아니라 스모크인
  // 이유는 빌드 산출물을 봐야 하기 때문이다(단위 테스트는 빌드를 안 돌린다).
  // 설정만 적어두고 검사하지 않으면, 옵션 이름이 바뀌거나 오타가 나도 아무도 모른다.
  esbuild: {
    legalComments: 'eof',
  },
});
