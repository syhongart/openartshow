// scripts/smoke/config.mjs
// 배포 전 헤드리스 스모크 하네스 — 고정 상수(SSOT).
//
// ⚠️ **배포 판정 주체는 CI 의 `smoke` job 이다**(§10-3 (a), 팀장 판정 2026-08-10).
//    로컬 실행은 조기 스크리닝이고 그 PASS 를 배포 판정 근거로 기재하지 않는다.
//    이 문단도 오래 *"독립 executor(haiku)가 skill 절차로 수행한다"* 라고 적고 있었다
//    — 폐기된 절차이고 근거는 `run.mjs` 헤더 한 곳이다(검수관 권고 P3, 2026-08-17).
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
  'scripts/build-architecture.mjs',
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
  // 'design.html' 은 2026-08-09 폐지 — 정본은 `docs/DESIGN.md`·`css/tokens.css` 다.
  // 이 목록에서 빠지면 조립 결과에 그 파일이 없어야 통과한다(= 폐지가 실제로 배포에
  // 반영됐는지를 이 줄의 **부재**가 검사한다). 경위는 `docs/DESIGN.md §5-4`.
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
// ⚠️ 이 이름(`LIVE_PAGES`)은 **"라이브 노출 목록" 이 아니라 "검증 대상 목록" 이다.**
// behind-flag 페이지도 여기 들어온다 — 링크 노출 여부와 검증 여부는 다른 축이다.
// 노출 상태의 SSOT 는 `scripts/lib/entrypoints.mjs` 의 `exposure` 다.
//
// ⚠️ 바로 아래 줄은 **2026-08-08 까지 거짓이었다**(검수관 권고 P6). *"behind-flag
// 페이지는 제외"* 라고 적혀 있었는데 목록은 그것들을 이미 **포함**하고 있었다
// (2026-08-05 검수관 반려 B1 로 visit·lab-glb 가 편입됐고 world2 는 그 전부터 있었다).
// 산문만 낡은 채 남아 있었고, world3 를 추가하면서도 그대로 지나칠 뻔했다.
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
  // guide 급 공개 페이지). about.html은 루트 기준 상대경로(브랜드·랜딩 ./index.html,
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
  // ── world2 스타일라이즈드 — **여기서 도는 것은 WebGL 폴백 경로다** ──────────────
  //
  // 감독 지시 2026-08-18(모바일 게임 광고 화면 참조)로 생긴 페이지. `?styl=1` 이 기본이라
  // 잔디 필드가 실제로 부팅되고 랩 갱신이 돌아간다 — 배치 판정(도로·광장·물 회피)과
  // 인스턴스 버퍼 생성이 실제 브라우저에서 검사되는 유일한 자리다.
  //
  // ⚠ **바람과 스타일라이즈드 물은 여기서 안 돈다.** 헤드리스는 swiftshader = WebGL 이고
  // 그 경로는 노드 재질(TSL)을 아예 안 탄다(`decide/grass.ts` 의 `pickGrassWind`).
  // 그러니 이 항목이 초록인 것은 «룩이 맞다» 가 아니라 «폴백 경로가 안 죽는다» 이다 —
  // 룩 판정은 감독 실기기(WebGPU)가 유일한 축이다.
  { name: 'app/world2-stylized', url: '/app/world2-stylized.html', webgl: true, viteOnly: true },
  // ── world2 편집 모드 — **게이트가 처음으로 `?edit=1` 을 본다** (팀장 판정 2026-08-13) ──
  //
  // 왜 생겼나: W4 의 블로커 B1(마을 파츠를 옮기면 그림자가 안 따라감)이 게이트 6종·테스트
  // 45축·뮤테이션 5종을 **전부 통과**했다. 검수관이 원인을 이 사각으로 지목했고, 팀장이
  // W5(편집 화면 개편) 착수의 **선행**으로 걸었다.
  //
  // ⚠ **이 축이 받는 것과 안 받는 것을 정확히 적는다**(팀장 조건 — 커버리지를 넓게 적으면
  // 그것이 「게이트 유효성에 대한 거짓 진술」이 되고, 다음 사람이 확인을 생략한다).
  //
  //   받는 것 — 편집 청크(`edit/mode.js`) 동적 import 실패(네트워크·CSP) · **그리고
  //             `startEditMode()` 실행 중 예외**(패널·기즈모·피커·액션·입력·팔레트
  //             초기화 어디서 던지든) · `?edit=1` 부팅의 콘솔 에러·자산 실패 0.
  //             2026-08-12 사고(편집이 주행을 통째로 죽임)가 이 축의 사정권이다.
  //
  //             ⚠ **두 번째 항목은 공짜가 아니었다.** `features/overlay.ts` 의 try/catch 가
  //             그 예외를 `diag.error` 로만 삼키고 있었고, 스모크의 `collectPage` 는
  //             `window.__world2.stats()` 를 **한 번도 안 읽는다** — 즉 «편집 화면이
  //             통째로 안 뜨는데 게이트는 초록» 이 성립하고 있었다(검수관 블로커
  //             2026-08-13). 그 catch 에 `console.error` 를 넣어 **사각을 닫은 뒤에야**
  //             이 줄이 참이 됐다. 그 줄을 지우면 이 문장도 함께 거짓이 된다.
  //
  //   ⚠ 안 받는 것 — **B1 자신은 이 축으로 안 잡힌다.** B1 은 «집어서 옮긴 뒤» 나는
  //             조작 결함이고 로드 스모크는 부팅만 본다. B1 재발을 잡는 것은
  //             `tests/world2-village-parcels.test.ts` 의 그림자 유도 축 7종이며
  //             뮤테이션 6종 중 5종 검출로 확인돼 있다(나머지 1종은 등가).
  //             조작 중 결함을 브라우저에서 보려면 `[7]` 처럼 세션을 시뮬레이션하는
  //             별도 스크립트가 필요하다 — 이 항목은 **그것이 아니다.**
  //
  //   ⚠ 그리고 WebGPU 룩·조작감은 여기서 원리적으로 안 잡힌다(헤드리스는 swiftshader).
  //
  // `?edit=1` 은 편집 **도구를 쓸 수 있게** 할 뿐이고 부팅 직후는 주행 모드다
  // (`edit/state.ts` 의 `editing` — 2026-08-12 사고의 처방). 그래서 이 페이지는
  // 편집 리스너가 하나도 안 붙은 상태로 뜬다 — 그 자체가 검사 대상이다.
  { name: 'app/world2(편집)',  url: '/app/world2.html?edit=1', webgl: true, viteOnly: true },
  // world3(포근마을): world2 의 포크라 **부팅 성질이 같다** — `three/webgpu` 를 쓰므로
  // vite 전용이고, 날씨 코드도 그대로 승계한다. 그래서 world2 와 같은 플래그를 단다.
  //
  // 포크한 날 **처음부터** 넣는다. 바로 위 visit·lab-glb 가 "나중에 넣기로 하면 그 사이
  // 검사 0 인 페이지가 배포된다" 를 실측으로 남겨 뒀고, 포크는 그 위험이 더 크다 —
  // 파일이 1.9만 줄인데 그중 어느 것도 안 보게 된다.
  //
  // ── ⚠️ world3 가 **안 받는 것** (검수관 명세, 조건 5 이연) ──────────────
  // 이 줄에 들어 있다고 "world3 도 스모크 대상" 으로 읽으면 틀린다. 받는 것은
  //   `[4]`  로드 시점 — 콘솔 에러·pageerror·CSP·자기완결·404
  //   `[4b]` 날씨 4종 전환 + 번개 (전환 후 프레임 갱신까지 실제로 밟는다)
  // 두 축뿐이다. **안 받는 것**:
  //   `[7]`   개수 불변식 — 회전·주행·재방문 세션 시뮬
  //   `[7.6]` 드로우콜 대조군
  //   `[8]`   하늘 예열(날씨 첫 등장)
  // 이 셋은 `measure-invariants.mjs`·`measure-sky-warm.mjs` 가 `/app/world2.html` 을
  // **URL 로 하드코딩**해서 돌기 때문이다. 즉 world3 는 **조작 중에만 나는 콘솔
  // 에러를 보는 축이 `[4b]` 하나**이고, 회전·주행 세션은 아무도 안 본다.
  //
  // behind-flag 인 동안의 이연이다(팀장 조건 5 → 검수관 이연 판정). 라이브 승격의
  // 선결 조건이고, 잊히지 않도록 `tests/verification-tier.test.ts` 의 **GS-4** 가
  // 승격 자체를 막는다 — 산문으로만 남기지 않는다.
  { name: 'app/world3',        url: '/app/world3.html', webgl: true, viteOnly: true, weatherProbe: true },
  // world5(갤러리 스트리트): world2 의 포크라 부팅 성질이 world3 와 같다 —
  // `three/webgpu` 를 쓰므로 vite 전용이고 날씨 코드도 그대로 승계한다.
  //
  // **안 받는 것은 world3 와 동일하다**(바로 위 world3 항목의 이연 명세 참고):
  // `[7]`·`[7.6]`·`[8]` 은 `measure-invariants.mjs`·`measure-sky-warm.mjs` 가
  // `/app/world2.html` 을 URL 하드코딩해 돌므로 여기도 안 온다. behind-flag 인
  // 동안의 이연이고, 승격을 `tests/verification-tier.test.ts` 의 GS-4 가 막는다.
  { name: 'app/world5',        url: '/app/world5.html', webgl: true, viteOnly: true, weatherProbe: true },
  // ── visit·lab-glb: behind-flag 인데 **검사가 0이었다** (검수관 반려 B1, 2026-08-05) ──
  //
  // 검증 등급(#195)을 도입하면서 *"3등급이어도 자기완결·CSP 는 CI 스모크가 등급과 무관하게
  // 도니 면제할 방법이 애초에 없다"* 고 적었다. **그 문장이 틀렸다.** CSP·외부요청 검사는
  // 이 `LIVE_PAGES` 를 순회하는데 두 페이지가 여기 없었다 — 3등급이 되면 검수관·배포 전
  // 스모크·CI 스모크 **세 겹 모두** 이 페이지를 안 본다.
  //
  // 그 문장이 참으로 보였던 이유는 구조가 아니라 **우연**이다: world2 가 behind-flag 인데도
  // 위에 예외로 들어 있어서였다. 예외를 일반 규칙으로 승격해 적은 것이다.
  //
  // 둘 다 importmap 으로 `./vendor/three.module.js` 를 쓰므로(`visit.html:10`·`lab-glb.html:16`,
  // GLTFLoader 도 `../vendor/`) baseline 직서빙에서도 부팅된다 — world2 와 달리 `viteOnly` 가
  // 필요 없다. **이 편입이 빠지면 `tests/verification-tier.test.ts` 의 G1 검사가 FAIL 한다.**
  { name: 'app/visit',         url: '/app/visit.html',  webgl: true },
  { name: 'app/lab-glb',       url: '/app/lab-glb.html', webgl: true },
  // ── world7 — **파일을 고르기 전에는 씬이 비어 있다** (2026-08-25) ────────────
  // 감독 지시로 신설한 «내 GLB 걸어보기». 다른 world* 와 달리 부팅만으로는 아무것도
  // 안 그린다 — 사용자가 파일을 고르면 그때 로더가 돈다. 그래서 `weatherProbe` 도
  // 개수 불변식도 여기서는 성립하지 않는다.
  //
  // 그래도 목록에 **넣는 것**이 중요하다: 콘솔 에러 0 · CSP 유효 · 가로 넘침 0 ·
  // 내부 링크는 파일 없이도 판정되고, 그 축들이 이 페이지의 회귀를 잡는 전부다.
  // (behind-flag 인데 검사가 0이던 사고가 `visit`·`lab-glb` 에서 이미 났다 — 검수관
  //  반려 B1, 2026-08-05.)
  { name: 'app/world7',        url: '/app/world7.html', webgl: true, viteOnly: true },
  // mypage: behind-flag. 위 두 줄과 같은 이유로 **처음부터** 넣는다 — 나중에 넣기로
  // 하면 그 사이 자기완결·CSP 검사가 0 인 페이지가 배포되고, 그것이 정확히 visit·
  // lab-glb 가 겪은 일이다. `tests/verification-tier.test.ts` G1 이 이 편입을 강제한다.
  // three 를 참조하지 않는 폼 페이지라 webgl 대기가 필요 없다(유일하게 false 인 app/ 페이지).
  { name: 'app/mypage',        url: '/app/mypage.html', webgl: false },
  // ── editor: 배치 에디터(three.js editor 반입, 개발용 도구) ──────────────────
  //
  // behind-flag 지만 **처음부터** 넣는다 — 위 세 줄이 적어 둔 그 이유 그대로다.
  // 특히 이 페이지는 **외부 코드를 통째로 들여온 것**이라 자기완결 검사가 가장 절실하다:
  // 원본 three.js editor 는 CDN 세 곳(`@ffmpeg/ffmpeg`·`three-gpu-pathtracer`·
  // `three-mesh-bvh`)을 부르고, 우리는 그것을 걷어냈다. **걷어낸 것이 정말 걷혔는지 재는
  // 축이 `[C] 외부요청 0` 이고, 그 검사는 이 목록을 순회한다.**
  //
  // `viteOnly`: editor 는 bare specifier `three`·`three/addons/` 를 쓴다. baseline
  // 직서빙(importmap 이 `vendor/three.module.js` = **r160**)에서는 버전이 어긋나므로
  // vite 번들(npm r171)에서만 돈다 — world2 와 같은 이유다.
  //
  // `minViewport`: 320px 에서 335>320 이 난다(15px). editor 는 드래그·기즈모로 조작하는
  // **데스크톱 전용 도구**라 초소형 폭이 설계 대상이 아니다 — 면제가 아니라 **대상 밖**이고,
  // 제외된 칸 수는 `[5]` 판정 문구에 INFO 로 찍힌다(조용히 줄지 않는다).
  // ⚠ 감독은 모바일로 링크를 여신다 — **모바일에서는 가로 스크롤이 생긴다는 뜻**이므로
  // 그 사실을 보고에 적는다. 넓은 화면에서 쓰시는 것이 전제다.
  { name: 'app/editor',        url: '/app/editor.html', webgl: true, viteOnly: true, minViewport: 375 },
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
