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
export const BASELINE_FILE_COUNT = 175;
export const DROP_THRESHOLD = 5; // baseline - 5 미만이면 FAIL (급감)

// ── 검사3: 조립 결과에 반드시 존재해야 하는 핵심 파일 (SITE_DIR 상대) ──
export const REQUIRED_FILES = [
  'index.html',            // 랜딩 (deploy: landing.html → _site/index.html)
  'guide.html',            // 가이드 루트 (과거 404 사고 지점)
  'design.html',           // 디자인 루트
  'about.html',            // 소개 루트 (deploy: about.html → _site/about.html, 공개 페이지 정본)
  'app/index.html',        // 미술관
  'app/studio.html',       // 스튜디오
  'app/js/main.js',        // 라이브 런타임 진입
  'devlog/index.html',
  'team/index.html',
  'valuation/index.html',
  'sitemap.xml',
];

// ── 라이브 페이지 목록 (검사4/5/6 + 가드A/B 대상) ────────────────────
// behind-flag 페이지(builder.html·visit.html·world.html)는 라이브 미노출이라 제외.
// url 은 SITE_DIR(=http 루트) 기준 "정본 배포 URL". webgl:true 는 swiftshader 부팅 대기 필요.
//
// ※ app/landing.html 은 검사 대상이 아니다: landing.html 의 정본 배포 URL 은 루트
//   /index.html 이며(deploy.yml: landing.html→_site/index.html) 아래에 이미 포함돼 있다.
//   _site/app/landing.html 은 `cp -r web/. _site/app/` 의 부산물 사본으로 어떤 페이지도
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
  // `cp -r web/. _site/app/` 부산물 사본(어떤 페이지도 링크 안 함)이라 검사하지 않는다.
  { name: 'about',             url: '/about.html',      webgl: false },
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
