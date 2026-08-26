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
  // ── 🔴 2026-08-23 라이브에서 **강등**됐다 (감독 지시 «월드 1로 승격») ──────
  // 감독이 카드로 고른 방식: 「새 월드만 — 기존 것은 내린다」. 랜딩의 «오픈월드 입장» 이
  // `app/world2.html` 로 옮겨 갔고 이 페이지는 **어디에서도 링크되지 않는다.**
  //
  // ⚠ **코드도 보호도 그대로 둔다** (팀장 조건 5, 2026-08-23). 감독이 고른 방식의 전제가
  // 「되돌리기 = 링크 한 줄」이고, 그 전제는 이 페이지가 **즉시 가동 가능한 상태로 남는
  // 것**이다. 게다가 직링크·기존 공유 링크 방문자는 랜딩에서 링크가 빠져도 계속 온다.
  // 그래서 `main.js`·`player.js`·`artworks.js`·`config.js` 는 **라이브 런타임 보호파일로
  // 유지**한다(CLAUDE.md 의 그 조항은 안 건드린다).
  //
  // ⚠⚠ **승격의 역방향도 같은 게이트를 탄다** — 이 줄을 바꾸는 순간 GS-3 이 빨간불이 되고
  // `CLAUDE.md` 의 behind-flag 산문도 함께 고쳐야 한다. 그것이 설계다.
  //
  // 재론 조건: 감독이 **world1 코드 폐기**를 명시적으로 지시하는 회차. 그때 보호 해제를
  // 별도 상신한다(팀장 조건 5).
  { key: 'world', src: 'world.html', out: 'app/world.html', exposure: 'flagged' },
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
  // ── 🔴 2026-08-23 **라이브 승격** (감독 지시 «월드 1로 승격») ────────────────
  // 랜딩의 «오픈월드 입장» 이 이 페이지를 가리킨다. 오픈월드 커널 재작성이 정식 진입점이
  // 됐고, 예전 `app/world.html` 은 위에서 flagged 로 강등됐다.
  //
  // ⚠ **승격 전 누적 검수를 거쳤다** — 조항·판정 형태는 `OPERATING-PRINCIPLES.md §10-3`
  // 한 곳이다(전량이 검수관 1회 용량을 넘을 때의 팀장 판정 2026-08-23). **표면을 검수관이
  // 확정**했고, 그 과정에서 내 제안 목록에 **없던 표면 하나를 검수관이 찾아냈다**(스모크
  // 게이트 실행부 2파일이 §10-4 를 어긴 채 편입돼 있었다) — 선정자를 분리한 이유의 실증이다.
  //
  // ⚠⚠ **검수관이 안 본 표면이 남아 있다** — 171파일 중 정독은 약 15개였고, 나머지
  // (`parts/*` 세부·`systems/*` 전량·셰이더 로직·`edit/panel/*` UI 세부)는 줄 단위로
  // 안 봤다. 승격 PR 본문에 그 목록을 그대로 적었다. *"일괄 검수 완료"* 로 요약하면
  // 그것이 곧 게이트 유효성 과대 진술이다(팀장 조건 4).
  //
  // ⚠⚠⚠ **남은 조건 하나**: WebGPU **미지원** 기기의 첫 화면 확인. behind-flag 였을 때는
  // 「누가 보든 상관없다」였지만 랜딩 첫 링크가 되는 순간 그 전제가 사라진다. 헤드리스는
  // `navigator.gpu` 가 없어 **항상 WebGL 폴백 경로를 타므로**(`adapters/renderer.ts`)
  // 콘솔 0 통과가 그 경로가 돈다는 정황은 되지만, **200·0·0 은 빈 화면과 구별되지 않는다.**
  { key: 'world2', src: 'world2.html', out: 'app/world2.html', exposure: 'live' },
  // [실험] 스타일라이즈드 룩 — world2 의 **포크가 아니다.** 실행 코드는 `world2/main.ts`
  // 그대로이고, `world2-stylized-boot.ts` 가 URL 에 `?styl=1` 을 채운 뒤 같은 진입 함수를
  // 부르는 것이 전부다. 그래서 world2 를 고치면 여기도 같이 고쳐진다 — world3·world5 가
  // 지는 no-sync 부채가 없다. 감독 지시 2026-08-18(모바일 게임 광고 화면 참조).
  //
  // ⚠ 키에 **숫자 접미를 안 쓴다**: `world6` 류면 GS-4 의 `/^world\d+$/` 에 자동 편입돼
  // 「world 커널 포크」로 분류되고, 포크에 걸리는 독립성 검사를 포크가 아닌 것이 받는다.
  { key: 'world2-stylized', src: 'world2-stylized.html', out: 'app/world2-stylized.html', exposure: 'flagged' },
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
  // 감독 지시 2026-08-25 *"아까 그 파일을 올려서 월드7로 해봐. 테스트로 보게"* —
  // 내보낸 GLB 를 블렌더에서 손본 뒤 **있는 그대로** 걸어보는 페이지. world2 되읽기는
  // 우리 파츠를 우리 모양으로 다시 세우므로 블렌더의 모양 변경이 안 나타난다.
  { key: 'world7', src: 'world7.html', out: 'app/world7.html', exposure: 'flagged' },
  // 감독 지시 2026-08-26 *"월드8에 그 glb를 올려보자."* → 같은 날 **world2 전체 포크로
  // 재구성됐다**(감독 *"월드 2의 기본 기능 다 들어가야지"* → 팀장 판정 (A)).
  // ⚠ 이 주석은 *"world7 과 같은 스크립트(`js/glb-world.js`)를 쓴다"* 라고 적고 있었고
  // **지금은 거짓이다** — world8 은 `js/world8-boot.js` → `js/world-glb/` 트리를 탄다.
  // 갈리는 것은 「세계 소스」 한 축뿐이고 나머지는 world2 복사다(`js/world-glb/README.md`).
  // 고정 자산(`assets/worlds/world2-blender-edit.glb`)을 부팅 즉시 연다 — 감독이
  // *"지금 그파일이 없어서 내가 못올려"* 라고 해서 그 왕복을 저장소에서 재현해 구웠다.
  { key: 'world8', src: 'world8.html', out: 'app/world8.html', exposure: 'flagged' },
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
