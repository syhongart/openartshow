// scripts/smoke/config.mjs
// 배포 전 헤드리스 스모크 하네스 — 고정 상수(SSOT).
//
// ⚠️ 이 자동화는 smoke-check 스킬을 "대체"하지 않는다. 판정·보고의 책임은
//    여전히 구현자와 분리된 독립 executor(haiku)가 skill 절차로 수행한다.
//    본 스크립트는 그 절차의 "실행 보조"(재현 가능한 하네스)일 뿐이다. (§10-3)
//
// 경로·뷰포트·페이지 목록·크로미움 인자는 전부 여기에 상수로 고정한다.
// → 인자 없이 `npm run smoke` 로 언제든 동일 재현.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 저장소 루트 (scripts/smoke/ 에서 두 단계 위)
export const ROOT = path.resolve(__dirname, '..', '..');

// 조립 산출물 위치 — deploy.yml 과 동일하게 루트의 _site (이미 .gitignore 됨).
export const SITE_DIR = path.join(ROOT, '_site');

// ── 배포 서브패스(vite 모드) ─────────────────────────────────────────
// vite.config 의 base '/openartshow/' 와 1:1. vite 산출물의 자산참조는 절대경로
// /openartshow/_bundle/… 이므로, vite 모드에서는 서버가 이 프리픽스를 strip 하고
// 브라우저는 이 프리픽스를 붙여 접근한다(= github.io/openartshow/ 배포 재현).
// baseline(web직조립) 모드는 서브패스 없이 루트 서빙(deploy.yml 현행과 동일).
export const BASE_PATH = '/openartshow/';

// ── 검사1: deploy.yml 이 실행하는 생성기 3종 (exit 0 요구) ─────────────
export const GENERATORS = [
  'scripts/build-devlog.mjs',
  'scripts/build-team.mjs',
  'scripts/build-valuation.mjs',
];

// ── 검사2: 매니페스트 파일수 baseline ────────────────────────────────
// _site 조립 결과 파일 수. 직전 통과 조립 대비 급감 시 파일 누락 신호 → FAIL.
// null 이면 "baseline 미설정"으로 현재값만 기록(INFO). 최초 통과 후 실측값을 채운다.
// 실측: 2026-07-21 arch-safety-net 브랜치 = 175 파일(about.html 루트 배포 +1 반영).
// (DEVLOG 항목 추가 등으로 늘어나는 것은 정상 — 급증은 PASS, 급감만 FAIL)
//
// vite 모드는 파일수가 다르다: web직조립은 `cp -r frontend/. _site/app/` 로 js/폰트를
// 통째 복사하지만, vite 는 js 를 번들해 _bundle 로 dedup(중복 제거)하고 app/js 폴더가
// 없다. → vite 조립본은 더 적다. 실측: 2026-07-21 vite 조립본 = 148 파일.
// (_bundle 해시파일명은 빌드마다 바뀌나 개수는 동일 → 값 안정. devlog 증가는 급증=PASS)
export const BASELINE_FILE_COUNT = 175;      // web직조립(baseline) 모드
export const BASELINE_FILE_COUNT_VITE = 148; // vite 조립 모드
export const BASELINE_FILE_COUNT_BY_MODE = {
  baseline: BASELINE_FILE_COUNT,
  vite: BASELINE_FILE_COUNT_VITE,
};
export const DROP_THRESHOLD = 5; // baseline - 5 미만이면 FAIL (급감)

// ── 검사3: 조립 결과에 반드시 존재해야 하는 핵심 파일 (SITE_DIR 상대) ──
// 두 조립 방식은 레이아웃이 다르다:
//  · web직조립(baseline): app/ 아래 web 전체 사본 → app/js/main.js 존재.
//  · vite 조립: js 는 _bundle 로 번들(app/js 폴더 없음) → _bundle 디렉토리 존재.
// 공통 정본 공개 페이지는 양쪽 동일 위치. 모드별 차이만 분기한다.
const REQUIRED_FILES_COMMON = [
  'index.html',            // 랜딩 (landing.html → 루트 index.html)
  'guide.html',            // 가이드 루트 (과거 404 사고 지점)
  'design.html',           // 디자인 루트
  'about.html',            // 소개 루트 (공개 페이지 정본)
  'app/index.html',        // 미술관
  'app/studio.html',       // 스튜디오
  'app/world.html',        // 월드 (정식 노출 — sitemap 등재)
  'devlog/index.html',
  'team/index.html',
  'valuation/index.html',
  'sitemap.xml',
];
export const REQUIRED_FILES_BASELINE = [
  ...REQUIRED_FILES_COMMON,
  'app/js/main.js',        // 라이브 런타임 진입 (web직조립 사본)
];
export const REQUIRED_FILES_VITE = [
  ...REQUIRED_FILES_COMMON,
  '_bundle',               // vite 번들 폴더 (js·폰트 dedup 산출물)
];
export const REQUIRED_FILES_BY_MODE = {
  baseline: REQUIRED_FILES_BASELINE,
  vite: REQUIRED_FILES_VITE,
};
// 하위호환: 기존 import 명 유지(baseline 기본).
export const REQUIRED_FILES = REQUIRED_FILES_BASELINE;

// ── 라이브 페이지 목록 (검사4/5/6 + 가드A/B 대상) ────────────────────
// behind-flag 페이지(visit.html·lab-glb.html·world2.html)는 라이브 미노출이라 제외.
// world.html 은 B-2b 에서 정식 노출(sitemap 등재)로 편입 → 검사 대상에 포함.
// builder.html 도 라이브다 — studio.html 이 "전시 공간 직접 꾸미기(베타)" 카드로 링크한다
// (감독·팀장 게이트를 거친 정당한 해제). 이 주석이 오래 builder 를 behind-flag 로 적어
// 라이브 페이지가 회귀 검사에서 빠져 있었다 → 아래 목록에 편입.
// url 은 SITE_DIR(=http 루트) 기준 "정본 배포 URL"(vite 모드는 서버가 BASE_PATH strip).
// webgl:true 는 swiftshader 부팅 대기 필요.
//
// ※ app/landing.html 은 검사 대상이 아니다: landing.html 의 정본 배포 URL 은 루트
//   /index.html 이며(deploy.yml: landing.html→_site/index.html) 아래에 이미 포함돼 있다.
//   _site/app/landing.html 은 `cp -r frontend/. _site/app/` 의 부산물 사본으로 어떤 페이지도
//   링크하지 않고(sitemap 에도 없음), landing 의 루트 기준 상대경로가 app/ 컨텍스트에서
//   필연적으로 깨지므로 라이브 진입점이 아니다. → 정본 URL(/index.html)만 검사.
export const LIVE_PAGES = [
  { name: 'index(랜딩)',       url: '/index.html',      webgl: false },
  { name: 'app/index(미술관)', url: '/app/index.html',  webgl: true },
  { name: 'app/studio',        url: '/app/studio.html', webgl: true },
  { name: 'guide',             url: '/guide.html',      webgl: false },
  // about 정본 URL은 루트 /about.html (deploy.yml: about.html→_site/about.html, landing/
  // guide/design 급 공개 페이지). about.html은 루트 기준 상대경로(브랜드·랜딩 ./index.html,
  // 전시장 ./app/)라 루트 배포에서 정합. _site/app/about.html은 app/landing.html과 같은
  // `cp -r frontend/. _site/app/` 부산물 사본(어떤 페이지도 링크 안 함)이라 검사하지 않는다.
  { name: 'about',             url: '/about.html',      webgl: false },
  // world: B-2b 정식 노출(sitemap 등재). WebGL 씬(top-level await manifest fetch).
  { name: 'app/world',         url: '/app/world.html',  webgl: true, weatherProbe: true },
  // builder: studio 진입 카드로 링크된 라이브 페이지. WebGL 씬.
  { name: 'app/builder',       url: '/app/builder.html', webgl: true },
  // world2: behind-flag(무링크)지만 **검증 대상에는 넣는다.**
  //
  // 스모크에 없다는 것은 "콘솔 에러 0" 판정이 이 페이지를 한 번도 안 봤다는 뜻이다.
  // 실제로 감독이 매일 실기기로 여는 페이지인데 게이트가 비어 있었다 — `builder.html`이
  // 라이브가 된 뒤에도 한동안 스모크 대상에서 빠져 있던 것과 똑같은 구멍이다(CLAUDE.md).
  // 링크 노출 여부와 검증 여부는 별개다.
  //
  // vite 번들 전용(`three/webgpu`·`three/addons/*` import)이라 baseline 모드에서는
  // raw 직서빙으로 부팅되지 않는다 — 그래서 vite 모드에서만 검사한다.
  { name: 'app/world2',        url: '/app/world2.html', webgl: true, viteOnly: true, weatherProbe: true },
];

// ── 검사5: 가로 넘침 뷰포트 (px). 320 은 초소형(모달 wrap 회귀 감지용) 필수 ──
export const VIEWPORTS = [320, 375, 1280];

// ── 헤드리스 크로미움 (playwright-core 로 구동) ──────────────────────
export const CHROMIUM_EXECUTABLE =
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
export const CHROMIUM_ARGS = [
  '--no-sandbox',
  '--use-gl=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage',
];

// ── 타이밍 ───────────────────────────────────────────────────────────
export const PAGE_TIMEOUT_MS = 30000; // goto 타임아웃
export const WEBGL_WAIT_MS = 6000;    // 미술관 등 WebGL 씬 부팅 대기 (swiftshader 느림)
export const REFLOW_WAIT_MS = 250;    // 뷰포트 변경 후 반응형 재배치 대기
// 날씨 전환 후 강수 입자가 몇 프레임 갱신되도록 두는 시간. swiftshader가 ~4fps라
// 넉넉히 잡아야 setMatrixAt 루프가 실제로 돈다(짧으면 코드를 안 재고 통과한다).
export const WEATHER_PROBE_MS = 900;
