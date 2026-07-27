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
import { createHash } from 'node:crypto';

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
const HTML_RENAME = {
  'landing.html': 'index.html',     // 랜딩 → 루트
  'index.html': 'app/index.html',   // 미술관 → app/
  'studio.html': 'app/studio.html',
  'world.html': 'app/world.html',
  'builder.html': 'app/builder.html', // behind-flag
  'visit.html': 'app/visit.html',     // behind-flag
  'lab-glb.html': 'app/lab-glb.html', // behind-flag(실험) — GLB 공간 워크스루 미리보기
  'world2.html': 'app/world2.html',   // behind-flag(실험) — 오픈월드 커널 재작성 검증
  // guide.html·about.html·design.html → 루트 불변(맵 미포함)
};

// 인라인 실행 script 타입(CSP script-src 해시 대상). ld+json·importmap 은 비실행.
const EXEC_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);

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
  // ⚠️ HTML 주석 안의 `<script>` 텍스트(예: CSP 설명 주석)가 정규식 매치를 오염시키면
  //    body 경계가 어긋나 브라우저 실제 해시와 불일치한다. 브라우저는 주석 안 script 를
  //    무시하므로, 해시 스캔은 "주석 제거본"에서 한다(파일 자체는 주석 유지).
  const scan = html.replace(/<!--[\s\S]*?-->/g, '');
  const hashes = new Set();
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(scan)) !== null) {
    const attrs = m[1];
    const body = m[2];
    if (/\bsrc\s*=/i.test(attrs)) continue; // 외부 참조 script 는 해시 불필요
    const typeM = attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i);
    const type = typeM ? typeM[1].toLowerCase() : '';
    if (!EXEC_TYPES.has(type)) continue; // ld+json·importmap 등 비실행
    const h = createHash('sha256').update(body, 'utf8').digest('base64');
    hashes.add(`'sha256-${h}'`);
  }

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
  // 배포 서브패스(github.io/openartshow/) 영구 고정 — 절대 base 로 깊이 무관 공유.
  base: '/openartshow/',
  build: {
    outDir: r('dist'),
    emptyOutDir: true,
    // 번들 자산 폴더 '_bundle' — 앱 런타임의 './assets/…' 동적 load 와 이름 충돌 회피.
    assetsDir: '_bundle',
    // world 진입점 top-level await(manifest fetch) → esbuild target esnext.
    target: 'esnext',
    // 인라인 modulepreload polyfill 제거 — CSP script-src 'self' 로만 로드.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        // 랜딩군(루트 배포) — landing 편입(B-2b 배포기 승격의 핵심).
        landing: r('frontend/landing.html'),
        guide: r('frontend/guide.html'),
        about: r('frontend/about.html'),
        design: r('frontend/design.html'),
        // 앱군(app/ 배포)
        index: r('frontend/index.html'),
        studio: r('frontend/studio.html'),
        world: r('frontend/world.html'),
        // 라이브다 — studio.html 이 "전시 공간 직접 꾸미기(베타)" 카드로 링크한다.
        // (예전 주석은 behind-flag 라고 적고 있었다. CLAUDE.md 와 smoke/config.mjs 의
        //  LIVE_PAGES 는 진작 정정됐는데 여기만 남아 있었다 — 값 미러링 사고 그대로다.)
        builder: r('frontend/builder.html'),
        visit: r('frontend/visit.html'),
        // [실험] GLB 공간 워크스루 — 감독이 "어떤 느낌일지" 보려는 미리보기. 라이브 미술관과 완전 분리,
        // 어디에도 링크하지 않는다. 반입 판정 전이므로 이 페이지의 존재가 채택을 뜻하지 않는다.
        'lab-glb': r('frontend/lab-glb.html'),
        // [실험] 오픈월드 커널 재작성 — 라이브 world.html과 완전 분리. 어디에도 링크하지
        // 않으며, 빌드에 넣는 것은 실증(타입·번들 회귀 감지)을 위해서지 채택이 아니다.
        world2: r('frontend/world2.html'),
      },
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
});
