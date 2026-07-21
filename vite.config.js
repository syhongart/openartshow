// vite.config.js — 아키텍처 로드맵 B-2a "Vite 검증기"
//
// ⚠️ 이 설정은 "검증기"다. Vite가 우리 자기완결·CSP·정적 규율을 깨지 않고
//    산출물을 빌드할 수 있는가를 실증하기 위한 것. 배포기 승격은 별도 B-2b
//    (감독 게이트) — 이 설정은 deploy.yml 을 대체하지 않고, 라이브에 무영향.
//
// 규율 대응:
//  · 외부 호스트 0 — three/RGBELoader 는 bare `three` import → npm three(REVISION 160,
//    vendor 와 정확히 일치)로 번들. peerjs 는 전역 IIFE(window.Peer) 라 소스 로직을
//    바꾸지 않는 이 단계에선 self 로컬 <script>로 유지(폴백, DEVLOG 기록).
//  · CSP default-src 'self' — modulePreload.polyfill:false 로 vite 가 심는 인라인
//    polyfill 스크립트를 제거. 인라인 module 진입점(builder/visit/landing)은
//    vite 가 외부 청크로 추출 → 산출 HTML 의 인라인 script 최소화 목표.
//  · 정적 산출물 — vite build 결과는 정적 파일만(서버 런타임 0).

import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';

const r = (p) => resolve(import.meta.dirname, p);

// B-2a 자기완결 보정 플러그인 — vite 기본이 못 하는 두 지점을 규율에 맞게 마감.
//  (1) 산출 HTML 의 인라인 importmap 제거: three 는 bare specifier 가 이미 번들로
//      해소됐으므로 importmap 은 dead(dist 에 vendor/three.module.js 도 없음).
//      제거해야 "인라인 script 0" 목표에 부합 + CSP sha256(importmap 핀) 불필요해짐.
//  (2) peerjs 직서빙 유지: peerjs.min.js 는 전역 IIFE(window.Peer)라 ES 모듈 번들
//      대상이 아니다(vite 가 "can't be bundled" 경고 후 복사도 안 함 → 404).
//      소스 로직을 바꾸지 않는 이 단계에선 vendor/peerjs.min.js 를 dist/vendor/ 로
//      정적 복사해 self 로 유지(폴백). 모듈 전환은 B 후반(multiplayer.js 수정) 과제.
function b2aSelfContained() {
  return {
    name: 'oas-b2a-self-contained',
    transformIndexHtml(html) {
      return html.replace(/[ \t]*<script type="importmap">[\s\S]*?<\/script>\n?/g, '');
    },
    closeBundle() {
      const dist = r('dist');
      mkdirSync(resolve(dist, 'vendor'), { recursive: true });
      copyFileSync(r('web/vendor/peerjs.min.js'), resolve(dist, 'vendor/peerjs.min.js'));
      // 런타임 동적 자산 — 앱이 문자열 경로로 fetch/load 하는 데이터(vite 가 정적 추적
      // 불가): galleries/index.json, assets/sky·gallery, world/manifest.json 등.
      // self 자기완결을 유지하려면 그대로 복사해야 한다. (번들 자산은 assetsDir='_bundle'
      // 로 분리해 web/assets 런타임 경로와의 이름 충돌을 회피)
      for (const d of ['galleries', 'world', 'assets', 'utils']) {
        const src = r('web/' + d);
        if (existsSync(src)) cpSync(src, resolve(dist, d), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [b2aSelfContained()],
  // HTML 이 web/ 에 있으므로 root 를 web 으로. (소스 구조 기준)
  root: 'web',
  // GitHub Pages 서브패스·재배치(_site/app/) 어디에 놓여도 동작하도록 상대경로.
  base: './',
  build: {
    // 산출물은 프로젝트 루트 dist/ (web 밖). .gitignore 로 커밋 제외.
    outDir: r('dist'),
    emptyOutDir: true,
    // ⚠️ 번들 자산 폴더를 '_bundle' 로 — 앱 런타임이 './assets/sky·gallery' 를 동적
    //    load 하므로 vite 기본 assetsDir='assets' 와 이름 충돌(번들이 데이터 위에 덮임).
    assetsDir: '_bundle',
    // world 진입점은 top-level await(manifest fetch)를 쓴다. 라이브는 native ESM 이라
    // 이미 동작하지만, vite 의 기본 esbuild target(es2020)은 TLA 미지원 → esnext 로.
    // 우리 런타임 타깃은 WebGL2 지원 모던 브라우저라 esnext 로 충분.
    target: 'esnext',
    // 인라인 modulepreload polyfill 제거 — CSP script-src 'self' 로만 로드되게.
    modulePreload: { polyfill: false },
    // 디버깅·검증 편의. 검증기 단계라 압축 여부는 규율에 무관.
    rollupOptions: {
      // 멀티페이지 — web/ 의 모든 HTML(정적 + three 사용 + behind-flag).
      input: {
        index: r('web/index.html'),
        studio: r('web/studio.html'),
        about: r('web/about.html'),
        guide: r('web/guide.html'),
        // ⚠️ landing 제외 — landing.html 은 배포 시 _site/index.html 로 승격되고
        //    나머지 web/ 은 _site/app/ 아래로 재배치된다(deploy.yml). 그래서 landing 의
        //    import 는 `./app/js/*.js`·`./app/vendor/fonts/fonts.css` 를 가리키는데,
        //    web/ 를 root 로 하는 검증기 빌드에는 web/app/ 이 없어 해소 불가.
        //    → B-2b 배포기에서 _site 구조를 재현한 뒤 편입해야 함(검증기 범위 밖).
        //    landing: r('web/landing.html'),
        design: r('web/design.html'),
        world: r('web/world.html'),
        // behind-flag (라이브 미노출) — 빌드 실증만, 링크 노출 아님.
        builder: r('web/builder.html'),
        visit: r('web/visit.html'),
      },
      output: {
        // three·peerjs 를 vendor 청크로 분리(코드 스플릿 관찰용).
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'vendor-three';
          if (id.includes('node_modules/peerjs')) return 'vendor-peerjs';
        },
      },
    },
  },
});
