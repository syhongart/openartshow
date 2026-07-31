// scripts/smoke/config.mjs
// 배포 전 헤드리스 스모크 하네스 — 고정 상수(SSOT).
//
// ⚠️ 이 자동화는 smoke-check 스킬을 "대체"하지 않는다. 판정·보고의 책임은
//    여전히 구현자와 분리된 독립 executor(haiku)가 skill 절차로 수행한다.
//    본 스크립트는 그 절차의 "실행 보조"(재현 가능한 하네스)일 뿐이다. (§10-3)
//
// 경로·뷰포트·페이지 목록·크로미움 인자는 전부 여기에 상수로 고정한다.
//
// **배포 게이트가 도는 것은 `npm run smoke:vite` 하나다**(`ci.yml` smoke job).
// `npm run smoke`(baseline)는 frontend직조립 대조군이고 **어떤 배포도 재현하지 않는다** —
// 이름이 짧아서 그쪽을 돌리면 존재하지 않는 레이아웃을 검사한 PASS 를 받는다.
// 이 줄이 오래 `npm run smoke` 를 기본 재현 수단으로 안내하고 있었다(검수관 지적 N2).
// baseline 의 지위는 `assemble.mjs` 헤더 참조.

import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 저장소 루트 (scripts/smoke/ 에서 두 단계 위)
export const ROOT = path.resolve(__dirname, '..', '..');

// 조립 산출물 위치 — deploy.yml 과 동일하게 루트의 _site (이미 .gitignore 됨).
export const SITE_DIR = path.join(ROOT, '_site');

// ── 배포 서브패스(vite 모드) ─────────────────────────────────────────
// vite 산출물의 자산참조는 절대경로 /openartshow/_bundle/… 이므로, vite 모드에서는
// 서버가 이 프리픽스를 strip 하고 브라우저는 이 프리픽스를 붙여 접근한다
// (= github.io/openartshow/ 배포 재현).
// baseline(frontend직조립) 모드는 서브패스 없이 루트 서빙.
//
// 정의는 `scripts/site-url.mjs` 한 곳이다 — 여기 값을 다시 적으면 도메인을 옮길 때
// 한쪽만 고쳐도 아무도 모른다(검수관 B3). 재수출만 한다.
export { BASE_PATH } from '../site-url.mjs';

// ── 검사1: deploy.yml 이 실행하는 생성기 (exit 0 요구) ─────────────────
// 개수를 주석에 적지 않는다 — 목록과 숫자가 따로 놀면 한쪽만 고쳐도 아무도 모른다.
// 이 배열이 SSOT 이고 `deploy.yml` 의 실행 목록과 1:1 이어야 한다. 어긋나면
// "스모크 PASS + 배포 실패" 가 성립한다(실제로 성립한 적 있다).
export const GENERATORS = [
  'scripts/build-devlog.mjs',
  'scripts/build-team.mjs',
  'scripts/build-valuation.mjs',
  'scripts/build-making.mjs',
  'scripts/build-licenses.mjs',
];

// ── 검사2: 매니페스트 파일수 ─────────────────────────────────────────
//
// ── 왜 baseline 상수를 버렸나 (검수관 P1, 2026-07-29) ──────────────────────
// 예전에는 실측 상수(vite 148)와 비교해 `n < baseline - 5` 면 FAIL 이었다. 그런데
// `devlog/` 는 개발일지를 쓸 때마다 늘어난다 — 실측이 227 이 되도록 상수는 148 이었고,
// **84개가 사라져도 PASS 가 찍히는 상태**였다. 급감을 잡으라고 만든 검사가 급감을
// 못 잡고 있었다.
//
// "급증은 PASS" 규칙 때문에 조용히 벌어졌다. 상수를 227 로 갱신해도 같은 일이 반복된다 —
// **낡는 방향이 검출력을 깎는 쪽**이기 때문이다. 그래서 상수를 안 쓴다.
//
// 대신 조립 구성요소의 합과 대조한다. `_site` 는 정의상
//     dist(또는 frontend 사본) + devlog + team + valuation + 루트 정적
// 이므로, 그 등식이 깨지면 조립이 뭔가 빠뜨린 것이다. devlog 가 아무리 늘어도
// 양쪽이 함께 늘어 **값이 낡지 않는다.** 실측으로 등식 성립 확인(227 = 223 + 4).
//
// 루트 정적 = GENERATED_ROOT_FILES(sitemap·robots) + DEPLOY_SHA_FILE + .nojekyll.
// 여기 값을 세지 않고 그 상수들에서 센다 — 파일이 늘면 자동으로 따라온다.
export const STATIC_ROOT_EXTRA = ['.nojekyll'];
// 등식이 정확히 0 이어야 한다. 오차를 허용하면 그 오차만큼 다시 못 잡는다.
export const MANIFEST_TOLERANCE = 0;

/**
 * 생성기가 만드는 **루트 산출물** — 이 목록의 SSOT.
 *
 * `deploy.yml` 은 `set -euo pipefail` 아래에서 이 파일들을 복사하므로 **없으면 배포가
 * 죽는다.** 그런데 오래도록 `[3]` 핵심파일 목록에는 `robots.txt` 가 없었고, 조립
 * 스크립트는 복사 실패를 삼켰다 — 두 겹으로 안 잡혀 "스모크 PASS + 배포 실패" 가
 * 성립했다(검수관 지적 2026-07-29).
 *
 * 그것을 고치면서 `['sitemap.xml','robots.txt']` 를 `assemble.mjs` 에 **또 적었다.**
 * 값 미러링을 지적해 만든 커밋이 값 미러링을 하나 늘린 셈이라 검수관이 다시 잡았다.
 * 여기가 정의이고 `assemble.mjs` 의 `requireGenerated()` 는 이것을 import 한다.
 *
 * (쉘 레시피 문자열 2곳과 `deploy.yml` 의 `cp` 줄은 여전히 같은 값을 적는다. 그것은
 *  "레시피를 문자 그대로 미러링한다"는 설계의 대가이고, 없애려면 verify 가 `_site` 를
 *  artifact 로 넘기고 deploy 가 그것을 publish 하는 구조로 가야 한다 — 별건 상신.)
 */
export const GENERATED_ROOT_FILES = ['sitemap.xml', 'robots.txt'];

/**
 * 배포물이 자기 커밋 SHA 를 들고 있게 하는 파일(SITE_DIR 상대). `deploy.yml` 이 조립
 * 스텝에서 쓰고 `verify-live.mjs` 가 읽어 대조한다.
 *
 * 없으면 라이브 검증이 **"옛 판본이 그대로 200"을 통과시킨다**(검수관 B1). 그러면
 * 폴링도 죽은 코드가 된다 — 판본과 무관한 종료 조건은 거의 항상 1라운드에서 끝나므로.
 *
 * **`assemble.mjs` 도 같은 파일을 만든다**(로컬은 `git rev-parse HEAD`). 처음엔
 * `deploy.yml` 에만 두고 "CI 배포에서만 생기는 의도된 비대칭"이라고 적었는데, 그러면
 * 그 줄의 오타가 **프로덕션 배포 후에야** 드러난다(검수관 R14). 조립 레시피를 1:1 로
 * 미러링하는 이유가 그것을 미리 밟아보려는 것이므로, 비대칭을 없앴다.
 * 그래서 `REQUIRED_FILES_VITE` 에도 들어간다 — 조립이 이 줄을 빠뜨리면 `[3]` 이 잡는다.
 */
export const DEPLOY_SHA_FILE = '_deploy-sha.txt';

// ── 검사3: 조립 결과에 반드시 존재해야 하는 핵심 파일 (SITE_DIR 상대) ──
// 두 조립 방식은 레이아웃이 다르다:
//  · frontend직조립(baseline): app/ 아래 frontend 전체 사본 → app/js/main.js 존재.
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
  'making/index.html',     // 만드는 이야기 허브
  'devlog/index.html',     // 리다이렉트 스텁
  'team/index.html',       // 리다이렉트 스텁
  'valuation/index.html',  // 리다이렉트 스텁
  ...GENERATED_ROOT_FILES,
];
export const REQUIRED_FILES_BASELINE = [
  ...REQUIRED_FILES_COMMON,
  'app/js/main.js',        // 라이브 런타임 진입 (frontend직조립 사본)
];
export const REQUIRED_FILES_VITE = [
  ...REQUIRED_FILES_COMMON,
  '_bundle',               // vite 번들 폴더 (js·폰트 dedup 산출물)
  DEPLOY_SHA_FILE,         // 배포 판본 표식 — verify-live 의 ④ 축이 이것을 읽는다
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
//
// ── 왜 세 단계로 푸는가 ──────────────────────────────────────────────
// 예전에는 개발 컨테이너 절대 경로 한 줄이었다. 그리고 **그 하드코딩 하나가 스모크를
// CI 에 못 올리게 막고 있었다** — GitHub Actions 러너에는 그 경로가 없다. 게이트를
// 만들어 놓고 게이트가 도는 곳을 늘리지 못하는 상태였고, 그래서 배포는 사람이 손으로
// 스모크를 돌릴 때만 검증됐다(규율이지 강제가 아니다).
//
//   ① `SMOKE_CHROMIUM_EXECUTABLE`  — CI·다른 기계가 명시로 덮어쓴다
//   ② 개발 컨테이너 경로가 실재하면 그것
//   ③ 둘 다 아니면 `undefined` — playwright 가 자기 기본 경로를 찾는다
//
// ── ③만 쓰면 안 되는 이유 (실측) ─────────────────────────────────────
// "그냥 playwright 에게 맡기자"가 제일 깔끔해 보이지만 **로컬이 즉시 깨진다.**
// playwright-core 1.61.1 이 찾는 경로는
// `chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell`
// 인데, 이 컨테이너에 설치된 것은 **1194** 뿐이다(`chromium-1194` 와
// `chromium_headless_shell-1194` 둘 다 있지만 **버전이 다르다**).
// ②의 `existsSync` 폴백이 그래서 필수다.
//
// (첫 판본 주석은 "headless shell 만 설치돼 있다"고 적었는데 사실이 아니었다 —
//  `chromium-1194` 도 있다. 결론은 그대로 유효하지만 근거가 틀렸었다. 검수관이 잡았다.
//  **참인 결론 뒤에 틀린 근거를 남기는 것**이 이 저장소가 반복해서 데인 패턴이다.)
//
// `undefined` 는 `executablePath` 를 아예 안 준 것과 같게 처리된다 — 소비처 4곳
// (`browser-checks`·`measure-invariants`·`measure-sky-warm`·`measure-world2`)은
// **무수정**이다. 값이 갈리는 지점을 여기 하나로 묶어 둔다(값 미러링 금지).
const DEV_CONTAINER_CHROMIUM =
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

export const CHROMIUM_EXECUTABLE = resolveChromium();

function resolveChromium() {
  const fromEnv = process.env.SMOKE_CHROMIUM_EXECUTABLE;
  if (fromEnv) return fromEnv;
  if (existsSync(DEV_CONTAINER_CHROMIUM)) return DEV_CONTAINER_CHROMIUM;
  return undefined;
}
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
