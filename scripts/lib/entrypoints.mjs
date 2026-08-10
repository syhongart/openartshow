// 배포되는 HTML 진입점과 **그 노출 상태** — 한 곳.
//
// ── 왜 생겼나 (태스크 #195, 팀장 조건 2·6) ──────────────────────────────────
// 검증 등급을 "라이브 진입점에서 도달 가능한가" 로 기계 판정하려면 **라이브 진입점이
// 무엇인지가 코드에 있어야 한다.** 조사해 보니 없었다 — behind-flag 라는 사실이 주석
// 다섯 곳에 흩어진 산문이었다:
//
//   CLAUDE.md            "어디에도 링크하지 않는 페이지는 …이다" (산문)
//   vite.config.js       `HTML_RENAME` 값 옆 줄 주석 `// behind-flag`
//   vite.config.js       `input` 항목 옆 `// [실험] … 어디에도 링크하지 않는다`
//   scripts/smoke/config.mjs  `LIVE_PAGES` 위 주석
//   docs/ARCHITECTURE.md 모듈 지도 표
//
// 다섯 곳 중 **어느 것도 기계가 읽을 수 없고**, 정합을 검사하는 축도 없었다. 실제로
// `vite.config.js` 의 `builder.html` 주석은 오랫동안 `// behind-flag` 였는데 그 사이
// builder 는 라이브가 돼 있었다(같은 파일 다른 줄이 그 사고를 이미 기록해 뒀다).
//
// ── `LIVE_PAGES` 를 쓰면 안 된다 ────────────────────────────────────────────
// `scripts/smoke/config.mjs` 의 `LIVE_PAGES` 는 이름과 달리 **"라이브 노출 목록" 이
// 아니라 "검증 대상 목록"** 이다 — behind-flag 인 world2 가 거기 들어 있다(그 파일이
// *"링크 노출 여부와 검증 여부는 별개다"* 라고 적어 뒀다). 등급 판정이 그것을 노출
// 판정에 쓰면 **틀린 축을 재게 된다.**
//
// ── 이 파일이 SSOT 다 ───────────────────────────────────────────────────────
// `vite.config.js` 가 여기서 `input` 과 `HTML_RENAME` 을 **유도**한다. 목록을 저쪽에도
// 적으면 그 순간 값 미러링이고, 위에 적은 사고가 그대로 재현된다.

/**
 * 배포되는 HTML 진입점.
 *
 * @property key  vite `rollupOptions.input` 키. 번들 파일명에 쓰이므로 바꾸면 산출물
 *                경로가 바뀐다.
 * @property src  `frontend/` 기준 소스 경로.
 * @property out  배포 구조에서의 경로. `src` 와 같으면 재배치 없음.
 * @property exposure
 *   `live`    — 사이트 어딘가에서 링크된다. 방문자가 도달한다.
 *   `flagged` — **어디에도 링크하지 않는다**(behind-flag). 단 **배포는 되고 URL 직접
 *               접근이 가능하다** — 그래서 자기완결·CSP 는 여기에도 걸린다(팀장 조건 3).
 *               라이브 노출은 감독·팀장 게이트다(`CLAUDE.md`).
 */
export const ENTRYPOINTS = [
  // ── 랜딩군(루트 배포) ────────────────────────────────────────────────────
  { key: 'landing', src: 'landing.html', out: 'index.html', exposure: 'live' },
  { key: 'guide', src: 'guide.html', out: 'guide.html', exposure: 'live' },
  { key: 'about', src: 'about.html', out: 'about.html', exposure: 'live' },
  // ⚠ **`design.html` 은 2026-08-09 에 폐지됐다.** 여기 있던 항목은 *"링크되어
  // 있으므로 `live` 다"* 라고 적고 있었고 **그 문장이 거짓이었다** — 폐지 시점에
  // 저장소 전체에서 `href` 로 그 파일을 가리키는 곳이 **0건**이었다(실측). 즉
  // 아무도 도달할 수 없는 페이지를 「라이브」로 분류한 채 배포하고 있었다.
  // 폐지 경위·판정은 `docs/DESIGN.md §5-4` 한 곳이다.

  // ── 앱군(app/ 배포) ──────────────────────────────────────────────────────
  { key: 'index', src: 'index.html', out: 'app/index.html', exposure: 'live' },
  { key: 'studio', src: 'studio.html', out: 'app/studio.html', exposure: 'live' },
  { key: 'world', src: 'world.html', out: 'app/world.html', exposure: 'live' },
  // 라이브다 — `studio.html` 이 "전시 공간 직접 꾸미기(베타)" 카드로 링크한다.
  { key: 'builder', src: 'builder.html', out: 'app/builder.html', exposure: 'live' },
  // ── 마이페이지 — 2026-08-08 라이브 승격 ─────────────────────────────────
  // 감독 지시: *"홈화면에 개인 프로필 사진을 누르면 서브메뉴가 나와서 개인 프로필
  // 항목이 나오고 그것을 클릭하면 개인 프로필 편집하는 창으로 이동하게 해줘."*
  // 랜딩(`landing.html`)의 프로필 메뉴가 링크한다.
  //
  // ⚠ **승격 시점에 무엇을 확인했나** (검수관 P5 가 선결 조건으로 걸어 둔 것):
  //   · `auth.logout()` 이 `lu-profile::` 를 **지우게 했다**(`clearProfilesOnLogout`).
  //     그전에는 안 지웠고, 신원이 mock 이라 공용 PC 에서 뒷사람이 같은 이름을
  //     자칭하면 앞사람의 **프로필 사진·활동 지역**을 그대로 봤다.
  //   · **그러나 신원 위조 자체는 여전히 못 막는다.** 로그아웃을 거치지 않고 브라우저를
  //     닫으면 저장이 남는다. 근본 해소는 실제 OAuth 다 — `docs/MYPAGE-PLAN.md` §3,
  //     백로그 `G-MP1`. **이 페이지가 라이브라는 것이 그 조건이 해소됐다는 뜻이 아니다.**
  { key: 'mypage', src: 'mypage.html', out: 'app/mypage.html', exposure: 'live' },

  // ── behind-flag ─────────────────────────────────────────────────────────
  { key: 'visit', src: 'visit.html', out: 'app/visit.html', exposure: 'flagged' },
  // [실험] GLB 공간 워크스루 — 반입 판정 전이므로 존재가 채택을 뜻하지 않는다.
  { key: 'lab-glb', src: 'lab-glb.html', out: 'app/lab-glb.html', exposure: 'flagged' },
  // [실험] 오픈월드 커널 재작성 — 빌드에 넣는 것은 실증(타입·번들 회귀 감지)을 위해서다.
  { key: 'world2', src: 'world2.html', out: 'app/world2.html', exposure: 'flagged' },
  // [실험] 포근마을 — world2 의 **포크**다(분기 근거·no-sync 정책은
  // `frontend/js/world3/README.md`). 감독 지시 2026-08-08 *"월드3으로 하고 … 독립적으로
  // 해"* 로 착수했다. world2 파일을 한 줄도 import 하지 않으며 그 사실은
  // `tests/world3-independence.test.ts` 가 지킨다 — 포크의 존재 이유가 격리이므로
  // 그것을 산문이 아니라 검사로 둔다(팀장 조건 2).
  { key: 'world3', src: 'world3.html', out: 'app/world3.html', exposure: 'flagged' },
  // [실험] 갤러리 스트리트 — world2 의 **포크**다(분기 근거·no-sync 정책은
  // `frontend/js/world5/README.md`). 감독 지시 2026-08-08 *"월드3 킵해놓고. 월드5를
  // 만들어보자 … 뉴욕 갤러리 거리를 만들고 싶어. 맨해탄 다리도 있고"* 로 착수했다.
  //
  // ⚠️ **`world4` 는 결번이다.** 감독이 명시적으로 "월드5" 라고 지시했고, 팀장이
  // *"명시 발화에 정정을 되묻는 것은 이미 답이 있는 질문이고 그 왕복이 감독 시간을
  // 쓴다"* 로 유지 판정했다. 기능상 문제는 없다 — GS-4 의 `/^world\d+$/` 가 숫자
  // 접미로 판정하므로 결번과 무관하게 자동 편입된다. 이 줄은 다음 사람이
  // *"world4 가 어디 갔나"* 를 찾는 고리를 막으려고 있다.
  { key: 'world5', src: 'world5.html', out: 'app/world5.html', exposure: 'flagged' },
  // [도구] 배치 에디터 — three.js r171 `editor/` 반입. 감독 지시 2026-08-09
  // *"월드2를 내가 직접 배치. 튜닝할수있는 편집 툴가능? glb파일을 내가 직접 넣고"* →
  // *"three.js 방식이니깐. 거기 에디터를 깃에서 가지고 와서 활용하는방안"*.
  //
  // ⚠️ **다른 flagged 와 성격이 다르다.** world2/3/5 는 "채택 판정 전인 실험 월드" 지만
  // 이것은 **방문자에게 제공할 계획이 없는 도구**다 — 감독 지시 *"에디터는 개발용으로만
  // 쓸거니"*. 그래서 라이브 승격이 목표가 아니고, `flagged` 가 종착지일 수 있다.
  // (그래도 `flagged` 인 이상 자기완결·CSP 는 걸린다 — 배포되고 URL 직접 접근이 되므로.)
  { key: 'editor', src: 'editor.html', out: 'app/editor.html', exposure: 'flagged' },
];

/** 링크되어 방문자가 도달하는 진입점 */
export const LIVE_ENTRIES = ENTRYPOINTS.filter((e) => e.exposure === 'live');

/** 어디에도 링크하지 않는 진입점. 배포는 되므로 URL 직접 접근은 가능하다 */
export const FLAGGED_ENTRIES = ENTRYPOINTS.filter((e) => e.exposure === 'flagged');

/**
 * 소스 루트. `src` 는 **여기 기준 상대경로**다.
 *
 * ⚠ 처음에는 이 상수를 두지 않고 *"이 파일은 경로 규약(`frontend/` 접두사)을 모르는 편이
 * 낫다 — 호출자가 준다"* 고 적었다. **그 판단이 틀렸다는 것이 배포 전 스모크에서 실증됐다**
 * (2026-08-05): `vite.config.js` 가 `viteInput(r)` 로 받으면서 접두사가 사라져
 * `Could not resolve entry module "landing.html"` 로 빌드가 죽었다. 규약을 소비자에게
 * 맡기면 **소비자 수만큼 틀릴 자리가 생긴다** — 실제로 판정기(`verification-tier.mjs`)는
 * `join(FRONTEND, e.src)` 로 제대로 붙이고 있었고 vite 쪽만 틀렸다. 두 소비자가 같은
 * 규약을 각자 적고 있었으니 그것이 곧 값 미러링이었다.
 */
export const SRC_ROOT = 'frontend';

/** 저장소 루트 기준 소스 경로. **접두사를 소비자가 붙이지 않는다** (위 주석 참조) */
export function srcPath(entry) {
  return `${SRC_ROOT}/${entry.src}`;
}

/**
 * vite 의 `rollupOptions.input` 형태로. `resolve` 는 호출자가 준다 —
 * **저장소 루트 기준** 경로를 절대경로로 바꾸는 함수여야 한다.
 */
export function viteInput(resolve) {
  return Object.fromEntries(ENTRYPOINTS.map((e) => [e.key, resolve(srcPath(e))]));
}

/**
 * emit 파일명 → 배포 경로. **재배치가 필요한 것만** 담는다(vite 가 맵에 없는 것은
 * 그대로 두므로, 항등 매핑을 넣으면 그것이 곧 노이즈다).
 */
export function htmlRename() {
  return Object.fromEntries(
    ENTRYPOINTS.filter((e) => e.src !== e.out).map((e) => [e.src, e.out]),
  );
}
