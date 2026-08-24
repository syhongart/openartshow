// frontend/js/shared/joystick-look.js — **가상 조이스틱 룩의 SSOT.**
//
// 감독 지시 2026-08-24: *"작가갤러리룸의 조이스틱과 형식을 맞춰주고. **하드코딩하지말고
// 가지고 오는 방향으로** 해."*
//
// ── 왜 생겼나 — 같은 CSS 가 세 벌이었다 ─────────────────────────────────────
// 실측(2026-08-24):
//
//   `js/player.js:137-164`      갤러리(작가갤러리룸, `app/index.html`) — 원본
//   `js/world-boot.js:224-250`  오픈월드(`app/world.html`) — **복사본**
//                               (그 파일이 자인한다: *"player.js는 수정하지 않는다 …
//                                클래스명(lu-joy-*)은 player.js와 같은 이름을 재사용"*)
//   `world2.html` 인라인         world2 — **내가 만든 세 번째 복사본**(2026-08-23)
//
// 세 벌이 **완전히 같은 값**이었다. 한쪽만 고치면 아무도 모른다 — 이 저장소가 색
// 미러링으로 이미 세 번 데인 그 형태다. 감독 지시는 그 부채를 끊으라는 것이다.
//
// ── 셀렉터를 주입받는 이유 ──────────────────────────────────────────────────
// 세 소비자의 **셀렉터와 상태 표현이 다르다**:
//
//   갤러리·오픈월드  `.lu-joy-base` / `.lu-joy-knob`  + 상태는 **클래스**(`.lu-live`)
//   world2          `#w2-stick` / `#w2-stick-knob`   + 상태는 **속성**(`[data-on="1"]`)
//
// 셀렉터를 통일하려면 세 곳의 DOM 을 함께 고쳐야 하고 그중 `player.js` 는 **라이브 런타임
// 보호파일**이다. 그래서 **값만 공유하고 셀렉터는 주입**받는다 — 소비자가 늘어도 값은
// 여기 한 곳이다.
//
// ── 왜 `js/shared/` 인가 ────────────────────────────────────────────────────
// 처음에 `js/` 루트에 두었더니 `tests/world2-boundary.test.ts` 의 자족성 게이트가
// **빨간불이 됐다** — world2 밖 참조는 어댑터이거나 공용 접두(`vendor/`·`utils/`·
// `js/world-shared/`·`js/shared/`)여야 한다. `reserved-names.ts` 가 2026-08-16 에 겪은
// 것과 **같은 형태이고 같은 처방**이다: 규칙을 넓혀 통과시키지 않고 **성격에 맞는 자리로
// 옮긴다.**
//
// 넷 중 `js/shared/` 인 이유는 그 자리의 정의가 *"라이브·세계를 가리지 않는 **의존 0
// leaf**"* 이기 때문이다. 이 모듈은 아무것도 import 하지 않고(의존 0 — 실측), 갤러리
// (라이브 `app/index.html`)와 world2(세계)가 **함께 쓸 예정**이다. `world-shared/` 는
// *"세계 3종이 공유"* 라 라이브가 들어오면 그 이름이 거짓이 되고, `utils/`·`vendor/` 는
// `frontend/` 직하라 남의 코드(three·peerjs)를 두는 자리다.
//
// ⚠ **「예정」이라고 적는 이유** (검수관 권고 P2, 2026-08-24): 첫 판본은 *"함께 쓴다"* 라고
// 적었는데 **지금 이 모듈을 import 하는 것은 world2 하나뿐이다.** 선례로 든
// `reserved-names.ts` 는 실제로 마이페이지(라이브)와 world2 **둘 다**가 쓰고 있어 그
// 대응이 정확하지 않다. 자리 자체는 「의존 0 leaf」 요건을 실측으로 충족하므로 유효하지만,
// **아직 안 일어난 일을 일어난 것처럼 적지 않는다** — 갤러리 편입은 보호파일 수정이라
// 팀장 판정 사안이다(백로그 `G-UI3`).
//
// ── ⚠ 지금 이 모듈을 쓰는 것은 world2 뿐이다 ────────────────────────────────
// `player.js`(보호파일)와 `world-boot.js` 는 **아직 자기 복사본을 갖고 있다.** 그 둘을
// 편입하는 것은 보호파일 수정이 딸린 설계 분기라 팀장 판정 사안이다(백로그 `G-UI3`).
// **그러므로 미러링이 완전히 사라진 것이 아니다** — 3벌에서 2벌로 줄었고, 그 2벌이
// 갈라지는 것은 `tests/world2-touch-controls.test.ts` 의 `GS-J8` 이 대조로 잡는다.
// 이것을 「해소됨」으로 적지 않는다.
//
// ⚠⚠ **그 대조의 범위를 정확히 적는다** (검수관 블로커 B1, 2026-08-24). 첫 판본은
// *"값이 갈라지는 것은 이 축이 유일하게 잡는다"* 라고 적었고 **그것은 거짓이었다** —
// 검수관 뮤테이션 실측에서 `GREEN` 과 `INK` 를 바꿔도 **0 failed** 였다. 개별 선언을
// 뽑아 맞대는 방식이라 **뽑는 것을 잊은 선언은 통과**했던 것이다(`SHADOW` 는 아예 대조
// 대상 밖이었다).
//
// 지금은 GS-J8 이 원본 6블록의 **선언 전량**을 맞댄다. 재실측(2026-08-24, 6/6 검출):
//
//     GREEN·INK·SHADOW 각각 변조 / JOY_BASE_PX 112→100 / 점선→실선 / glow 10px→8px
//
// 그래도 **이 축이 못 보는 것은 그대로다**: 렌더 결과 · WebGPU 실기기 색 · 두 곳을
// **동시에 같은 값으로** 고치는 것(그건 의도된 변경이다). 게이트 유효성에 대한 진술은
// 실측 범위 안에서만 한다 — 이 저장소가 `main` unprotected 오기로 7일을 잃은 형태다.

/** 링 지름(px). 갤러리 원본 `.lu-joy-base` 의 값 */
export const JOY_BASE_PX = 112;
/** 손잡이 지름(px). 갤러리 원본 `.lu-joy-knob` 의 값 */
export const JOY_KNOB_PX = 44;

/**
 * 손잡이가 중심에서 벗어날 수 있는 최대 반경(px).
 *
 * 갤러리·오픈월드가 `JOYSTICK_RADIUS` 라는 이름으로 각자 들고 있는 값과 같다.
 * ⚠ 링 반경이 56 이므로 이 값이 그보다 크면 **손잡이가 링을 넘어간다** — 원본이 그렇게
 * 보이는 이유이고, 화면에 드러나는 성질이라 임의로 줄이면 룩이 갈린다.
 */
export const JOY_RADIUS = 60;

/**
 * 「움직인다」와 「질주한다」를 가르는 기울기 임계.
 *
 * 🔴 **감독 지시 2026-08-24**: *"기존 월드는 움직이면 초록색으로 변하는것 같더만.
 * 달리면 더 색깔이 진해지고.. 그렇게 해줘."*
 *
 * ⚠ **원본은 실제로 한 단계다** — 갤러리·오픈월드 모두 `> 0.85` 하나뿐이고 그 아래는
 * 색이 안 변한다(`player.js:256`, `world-boot.js` 의 같은 자리). 감독이 본 것은
 * 「많이 밀면 초록」이었고 그것을 두 단계로 기억하신 것으로 읽었다. **문언이 「그렇게
 * 해줘」이므로 감독이 말한 대로 두 단계로 만든다** — 관찰의 재현이 아니라 지시의 이행이다.
 *
 * ⚠⚠ 이 두 단계가 **거짓 피드백이 아닌 이유**: `decide/touch.ts` 의 `stickAxes` 가
 * 미는 정도에 비례해 0~1 을 내고 그것이 이동에 곱해진다. 즉 **많이 밀면 실제로 빨라진다.**
 * 색이 그 사실을 보여주는 것이라 「없는 상태를 흉내 내는 것」이 아니다.
 */
export const LEAN_MOVE = 0.02;
export const LEAN_RUN = 0.85;

/** 상태 값 — 소비자가 DOM 에 새기는 것과 이 모듈의 CSS 가 보는 것이 같아야 한다 */
export const LEAN_NONE = '0';
export const LEAN_MOVING = '1';
export const LEAN_RUNNING = '2';

/**
 * 기울기 크기 → 상태. **순수 판정**이라 테스트가 직접 돌린다.
 *
 * @param {number} mag `Math.hypot(axes.x, axes.y)` — 0~1
 * @returns {string} `LEAN_NONE` · `LEAN_MOVING` · `LEAN_RUNNING`
 */
export function leanState(mag) {
  if (!Number.isFinite(mag) || mag < LEAN_MOVE) return LEAN_NONE;
  return mag >= LEAN_RUN ? LEAN_RUNNING : LEAN_MOVING;
}

// ── 색 ───────────────────────────────────────────────────────────────────────
// 크림·먹빛은 갤러리 원본 값 그대로다. 초록은 원본의 `.lu-run` 색(`95,158,125` 계열)이고,
// **중간 단계(움직임)는 이번에 새로 정한 값**이라 화면 판정을 안 받았다 — 아래 주석 참조.
const CREAM = '253,251,245';
const INK = '23,20,15';
const SHADOW = '10,8,4';
const GREEN = '95,158,125';

/**
 * 조이스틱 룩 CSS 를 만든다. **값은 이 파일이 갖고 셀렉터만 받는다.**
 *
 * @param {object} sel
 * @param {string} sel.base 링 셀렉터 (예: `'#w2-stick'`)
 * @param {string} sel.knob 손잡이 셀렉터
 * @param {string} sel.on   「보인다」 상태 셀렉터 (예: `'#w2-stick[data-on="1"]'`)
 * @param {(v: string) => string} sel.lean 상태별 링 셀렉터를 만드는 함수
 * @param {(v: string) => string} sel.leanKnob 상태별 손잡이 셀렉터
 * @param {boolean} [sel.fixed] `position:fixed` 인가(갤러리·오픈월드) 아니면
 *   `absolute` 인가(world2 — 구역 안에 중첩된다). 기본 `false`.
 * @param {'margin'|'transform'} [sel.knobCenter] 손잡이의 **중심을 잡는 수단**. 기본 `'transform'`.
 *
 *   ⚠ 이 옵션은 취향이 아니라 **DOM 구조의 차이**다. 갤러리·오픈월드는 손잡이가 링의
 *   **형제**이고 좌표를 직접 옮긴다(`style.left/top = 터치 지점`) — 그래서 자기 크기의
 *   절반만큼 `margin` 으로 당겨야 그 좌표가 중심이 된다. world2 는 손잡이가 링의
 *   **자식**이라 `left:50%;top:50%` + `translate(-50%,-50%)` 로 잡는다.
 *
 *   DOM 을 통일하면 이 옵션이 없어도 되지만 그러려면 `player.js`(**라이브 런타임
 *   보호파일**)의 DOM 을 바꿔야 한다 — 룩을 맞추는 회차에 구조 변경을 포개면 무엇이
 *   화면을 깼는지 안 갈린다. **옵션 하나가 DOM 변경보다 싸다.**
 *
 * @param {string} [sel.knobOn] 손잡이가 「보인다」 상태 셀렉터. 생략하면 손잡이는 따로
 *   숨지 않는다(world2 — 링이 통째로 등장하고 손잡이는 그 자식이라 함께 사라진다).
 *   갤러리·오픈월드는 **형제**라 손잡이가 자기 몫으로 숨어야 한다.
 */
export function joystickCss(sel) {
  const pos = sel.fixed ? 'fixed' : 'absolute';
  const half = JOY_BASE_PX / 2;
  const knobHalf = JOY_KNOB_PX / 2;
  // 중심 잡기 — 둘 다 「좌표가 곧 중심」을 만들지만 수단이 다르다(위 주석).
  const knobCenter = sel.knobCenter === 'margin'
    ? `margin:-${knobHalf}px 0 0 -${knobHalf}px;`
    : `left:50%;top:50%;transform:translate(-50%,-50%);`;
  // 형제 구조에서만 필요한 두 줄. 값은 링의 등장과 같게 둔다 — 따로 두면 링과 손잡이가
  // 다른 속도로 나타나 「하나의 물건」으로 안 보인다.
  const knobHide = sel.knobOn ? `opacity:0;transition:opacity .12s ease,` : 'transition:';
  const knobShow = sel.knobOn ? `\n${sel.knobOn}{opacity:1}` : '';
  return `
${sel.base}{
  position:${pos};width:${JOY_BASE_PX}px;height:${JOY_BASE_PX}px;
  margin:-${half}px 0 0 -${half}px;border-radius:50%;pointer-events:none;
  border:1.5px solid rgba(${CREAM},.38);
  background:radial-gradient(circle, rgba(${INK},.10) 55%, rgba(${INK},.34) 100%);
  box-shadow:0 2px 12px rgba(${SHADOW},.30), inset 0 0 0 1px rgba(${INK},.20);
  opacity:0;transform:scale(.78);
  transition:opacity .12s ease, transform .16s cubic-bezier(.34,1.56,.64,1);
}
${sel.on}{opacity:1;transform:scale(1)}
${sel.base}::before{
  content:'';position:absolute;inset:-1.5px;border-radius:50%;
  background:
    linear-gradient(rgba(${CREAM},.5), rgba(${CREAM},.5)) 50% 0 / 2px 8px no-repeat,
    linear-gradient(rgba(${CREAM},.5), rgba(${CREAM},.5)) 50% 100% / 2px 8px no-repeat,
    linear-gradient(rgba(${CREAM},.5), rgba(${CREAM},.5)) 0 50% / 8px 2px no-repeat,
    linear-gradient(rgba(${CREAM},.5), rgba(${CREAM},.5)) 100% 50% / 8px 2px no-repeat;
}
${sel.base}::after{
  content:'';position:absolute;inset:5px;border-radius:50%;
  border:1px dashed rgba(${CREAM},.22);
  transition:border-color .15s ease, box-shadow .15s ease;
}
/* 🔴 움직임 — 감독 지시의 1단계. 원본에 **없던** 단계라 이 색은 화면 판정 전이다.
   원본 질주색(rgba(${GREEN},.9))보다 옅게 잡아 «켜졌다» 와 «끝까지 갔다» 가 구별되게 했다. */
${sel.lean(LEAN_MOVING)}::after{
  border-color:rgba(${GREEN},.55);border-style:solid;
  box-shadow:0 0 6px rgba(${GREEN},.25);
}
/* 질주 — 원본 .lu-run 값 그대로다 */
${sel.lean(LEAN_RUNNING)}::after{
  border-color:rgba(${GREEN},.9);border-style:solid;
  box-shadow:0 0 10px rgba(${GREEN},.5), inset 0 0 8px rgba(${GREEN},.25);
}
${sel.knob}{
  position:${pos};width:${JOY_KNOB_PX}px;height:${JOY_KNOB_PX}px;border-radius:50%;
  /* ⚠ 형제 구조에서는 이 줄이 동작을 좌우한다. 갤러리·오픈월드는 손잡이가 링의 자식이
     아니라 body 직속 형제라 링의 pointer-events:none 이 상속되지 않는다 — 빠지면
     손잡이가 터치를 가로채 그 위에서 손가락을 움직일 때 이동이 끊긴다. world2 에서는
     부모가 이미 none 이라 중복이지만, 조건부로 내면 「어느 쪽이었더라」가 생긴다.
     원본에도 있는 값이므로 항상 낸다.
     ⚠⚠ 이 주석에 백틱을 쓰지 마라 — 여기는 템플릿 리터럴 안이고 백틱 하나로 끊긴다.
     같은 실수를 두 번 했다(2026-08-24 오전 ReferenceError, 오후 파싱 에러). */
  pointer-events:none;
  ${knobCenter}
  background:radial-gradient(circle at 32% 28%, #fffdf8, #e8e2d2);
  border:1px solid rgba(${INK},.28);
  box-shadow:0 3px 8px rgba(${SHADOW},.40), inset 0 -2px 4px rgba(${INK},.14);
  ${knobHide}background .15s ease, border-color .15s ease, box-shadow .15s ease;
}${knobShow}
/* 움직임 — 진주에서 연초록으로. 화면 판정 전 값이다(위와 같은 이유). */
${sel.leanKnob(LEAN_MOVING)}{
  background:radial-gradient(circle at 32% 28%, #ddf0e4, #9ac4ac);
  border-color:rgba(32,74,52,.40);
  box-shadow:0 0 0 1px rgba(${GREEN},.5), 0 0 8px rgba(${GREEN},.3),
    inset 0 -2px 4px rgba(32,74,52,.22);
}
/* 질주 — 원본 .lu-joy-knob.lu-run 값 그대로다 */
${sel.leanKnob(LEAN_RUNNING)}{
  background:radial-gradient(circle at 32% 28%, #b8e4c9, #5f9e7d);
  border-color:rgba(32,74,52,.55);
  box-shadow:0 0 0 1px rgba(${GREEN},.9), 0 0 14px rgba(${GREEN},.55),
    inset 0 -2px 4px rgba(32,74,52,.30);
}
@media (prefers-reduced-motion: reduce){
  ${sel.base}{transition:none}
  ${sel.knob}{transition:none}
}`;
}

/**
 * 스타일을 문서에 한 번만 넣는다.
 *
 * ⚠ `id` 로 중복을 막는다 — 갤러리·오픈월드가 같은 방식을 쓰고 있고(`lu-joy-style`),
 * 두 번 넣으면 뒤엣것이 이기므로 조용한 룩 차이가 난다.
 */
export function injectJoystickStyle(doc, id, css) {
  if (doc.getElementById(id)) return;
  const el = doc.createElement('style');
  el.id = id;
  el.textContent = css;
  doc.head.appendChild(el);
}
