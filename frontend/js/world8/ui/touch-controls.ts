// world2/ui/touch-controls.ts — 모바일 터치 조작(가상 조이스틱 + 시선 드래그).
//
// ── 설계 (2026-08-21 재개정, 감독 판정 «조이스틱 고정이 불편해») ────────────
//   · **이동** — 좌하단 **구역**(`#w8-stick-zone`)이 터치를 받고, 원은 **누른 자리에**
//     그려진다. `setPointerCapture` 로 붙든다.
//   · **시선** — 캔버스 위 아무 데나 드래그. **편집 중에는 끈다**(아래).
//
// ⚠ **하루에 두 번 바뀐 자리다. 두 판본의 이유를 둘 다 남긴다.**
//   ① 원래: 「화면 왼쪽 **절반 전체** = 이동」 — 누른 자리에 원이 생겼다. 편집과 충돌했다
//      (같은 터치가 `edit/input.ts` 의 `pointerdown` 에도 들어가 **물건이 선택되면서
//      동시에 아바타가 걸었다**).
//   ② 첫 개정(팀장 판정 (나)): 좌하단 **112px 고정 원**. 충돌은 없앴지만 **자리가 굳었고**,
//      감독이 실기기에서 *"조이스틱 고정이 불편해"* 라고 판정했다 — 그때 코드에 적어 둔
//      되돌릴 조건이 그대로 발동한 것이다.
//   ③ 지금: **구역이 받고 원이 따라간다.** ①의 「엄지가 닿는 자리」와 ②의 「구역 밖은
//      편집 전용」을 **둘 다** 만족한다. 갈랐던 지점은 «판정 영역이 화면 절반인가, 왼쪽
//      아래 일부인가» 였다 — 「누른 자리에 생긴다」와 양립 불가였던 것은 **고정된 원**이지
//      **정해진 구역**이 아니었다.
//
// ⚠⚠ **①의 실패를 ③이 되풀이하지 않는 이유를 정확히 적는다**: 구역은 `pointerdown` 을
// **자기 요소에서** 받고 캡처하므로, 구역 밖 캔버스에는 그 이벤트가 애초에 안 간다.
// ①은 캔버스 전체가 받아서 갈랐기 때문에 갈라도 남이 이미 본 뒤였다.
//
// ── 편집 중에 무엇이 죽고 무엇이 사는가 ─────────────────────────────────────
//   **이동은 산다.** 원 안은 편집 판정 영역이 아니므로 충돌이 없고, 폰에는 궤도·줌·비행이
//   없어 이것을 끄면 «다른 자리로 옮겨 편집» 이 불가능해진다(팀장이 그 안을 기각한 이유).
//   **시선은 죽는다.** 그것만은 캔버스 위 아무 데서나 시작하므로 기즈모 끌기와 겹친다.
//   대신 패널의 시점 버튼(탑·정면·좌·우)이 그 자리를 맡는다 — 이미 있는 문이다.
//
// ⚠ 그래서 **「편집 중에도 걷는다」는 결함이 아니라 사양이다**(팀장 판정 5). 단
// **조이스틱을 거쳤을 때만** 그렇다 — 캔버스를 끌어서 걷는 일은 이제 없다.
//
// ── stale 터치 방어 ──────────────────────────────────────────────────────────
// 실기기 사고를 그대로 막는다. 메인 스레드가 길게 블록되면 touchend 가 유실돼 슬롯이
// 영구히 남는다. 그래서 매 터치 이벤트마다 `e.touches` 로 죽은 슬롯을 청소하고,
// blur·visibilitychange 에서도 전량 해제한다.
// ⚠ 이동 쪽은 이제 이 방어가 **필요 없다** — `setPointerCapture` 가 `pointercancel` 까지
// 보장하므로 브라우저가 정리해 준다. 시선 쪽에만 남겼다.

import { joystickCss, injectJoystickStyle, leanState, LEAN_NONE } from '../../shared/joystick-look.js';
import {
  stickAxes, knobOffset, reconcile, lookDelta, isTouchDevice,
  STICK_RADIUS, NO_SLOTS, type TouchSlots,
} from '../decide/touch.js';

export interface TouchTargets {
  /** 이동 축 (x=우, z=앞. 음수 z가 전진) */
  setAxes: (x: number, z: number) => void;
  /** 시선 회전(라디안 델타) */
  look: (yaw: number, pitch: number) => void;
}

export interface TouchParts {
  /**
   * **판정 영역**. 좌하단 구역이고 고정이다 — 터치를 받는 것은 이것 하나다.
   * 없으면(`undefined`) `base` 가 그 역할을 겸한다(고정 원 판본과의 호환).
   */
  zone?: HTMLElement;
  /** 조이스틱 바깥 원. **누른 자리로 움직인다** — 그림만 그린다 */
  base: HTMLElement;
  /** 손잡이 */
  knob: HTMLElement;
}

export interface TouchControls {
  readonly active: boolean;
  /**
   * 편집 모드가 켜졌다/꺼졌다. **시선 드래그만** 끊는다(이동은 유지 — 파일 헤더).
   *
   * 배선이 `FeatureEnv` 를 타고 오는 이유: 편집을 켜고 끄는 자리(`edit/mode.ts` 의
   * `setEditing`)와 터치를 붙드는 자리(조립부)가 서로를 모르는 계층이다. 문 하나로
   * 좁게 잇는다 — `retargetSlot` 과 같은 형태다.
   */
  setEditing(on: boolean): void;
  dispose(): void;
}

/**
 * 터치 조작을 붙인다. 터치 기기가 아니면 아무것도 하지 않고 `active=false`를 돌려준다
 * (데스크톱에 조이스틱이 뜨지 않게).
 *
 * @param surface 시선 드래그를 받을 면(캔버스)
 * @param parts   `base` 가 **이동 판정 영역**이다
 */
export function attachTouchControls(
  surface: HTMLElement,
  parts: TouchParts,
  targets: TouchTargets,
): TouchControls {
  // 룩은 **터치 판정보다 먼저** 주입한다. 아래 조기 반환 뒤에 두면 데스크톱에서 스타일이
  // 안 붙고, 그러면 창을 좁혀 보는 확인·헤드리스 스윕이 늘 룩 없는 화면을 보게 된다
  // — 「못 잰 것이 통과로 적히는」 그 형태다. 그림에만 걸리므로 조작과 무관하다.
  //
  // 🔴 **값은 여기 없다** (감독 지시 2026-08-24 *"하드코딩하지말고 가지고 오는 방향으로"*).
  // 색·크기·상태 색은 `js/shared/joystick-look.js` 한 곳이고 여기는 **셀렉터만** 준다.
  injectJoystickStyle(parts.base.ownerDocument, 'w8-joy-style', joystickCss({
    base: '#w8-stick',
    knob: '#w8-stick-knob',
    on: '#w8-stick[data-on="1"]',
    lean: (v) => `#w8-stick[data-lean="${v}"]`,
    leanKnob: (v) => `#w8-stick[data-lean="${v}"] #w8-stick-knob`,
    // 손잡이가 링의 **자식**이다 — 갤러리는 형제라 `margin` 으로 잡는다(모듈 주석 참조).
    // `knobOn` 을 안 주는 것도 같은 이유다: 링이 통째로 등장하면 자식은 함께 온다.
    knobCenter: 'transform',
    // 층위가 필요 없다 — `#w8-stick-zone` 이 이미 층을 갖고 조이스틱은 그 **자식**이다.
    // 「필요 없다」를 값으로 적는다(생략은 모듈이 던진다 — 조용한 소실을 막는 장치다).
    z: null,
  }));

  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const touch = isTouchDevice(typeof navigator !== 'undefined' ? navigator : undefined, coarse);
  if (!touch) return { active: false, setEditing() {}, dispose() {} };

  let slots: TouchSlots = { ...NO_SLOTS };
  /** 시선 드래그의 직전 좌표 */
  let lastLookX = 0, lastLookY = 0;
  /** 편집 중인가 — 시선만 가른다 */
  let editing = false;

  // ── 이동: 전용 원 + 포인터 캡처 ───────────────────────────────────────────
  /** 지금 원을 쥔 포인터. 하나만 받는다 — 두 손가락이 같은 스틱을 밀 이유가 없다 */
  let stickId: number | null = null;
  /** 원의 중심(화면 좌표). `pointerdown` 마다 다시 잰다 — 방향 전환·스크롤로 움직인다 */
  let cx = 0, cy = 0;

  const drawKnob = (dx: number, dy: number) => {
    const k = knobOffset(dx, dy, STICK_RADIUS);
    parts.knob.style.transform = `translate(calc(-50% + ${k.x}px), calc(-50% + ${k.y}px))`;
  };
  const resetKnob = () => {
    parts.knob.style.transform = 'translate(-50%, -50%)';
    parts.base.setAttribute('data-lean', LEAN_NONE);
    targets.setAxes(0, 0);
  };

  /** 터치를 받는 요소. 구역이 있으면 구역, 없으면 원 자신(옛 판본 호환) */
  const hit = parts.zone ?? parts.base;

  const onStickDown = (e: PointerEvent) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    try { hit.setPointerCapture(stickId); } catch { /* 캡처 실패해도 아래가 돈다 */ }
    // **누른 자리가 중심이 된다** (감독 판정 «고정이 불편해»). 구역이 없으면 옛 판본대로
    // 원의 기하 중심을 쓴다 — 그때는 원 자체가 판정 영역이라 그것이 곧 누른 자리다.
    if (parts.zone) {
      cx = e.clientX; cy = e.clientY;
      const z = parts.zone.getBoundingClientRect();
      // 구역 로컬 좌표로 옮긴다 — 원이 `position:absolute` 라 구역 기준이다.
      parts.base.style.left = `${e.clientX - z.left}px`;
      parts.base.style.top = `${e.clientY - z.top}px`;
    } else {
      const r = parts.base.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    }
    parts.base.dataset.on = '1';
    e.preventDefault();
  };
  const onStickMove = (e: PointerEvent) => {
    if (e.pointerId !== stickId) return;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    drawKnob(dx, dy);
    const a = stickAxes(dx, dy, STICK_RADIUS);
    // 🔴 **미는 정도를 색으로 보여준다** (감독 지시 2026-08-24 *"움직이면 초록색으로
    // 변하는것 같더만. 달리면 더 색깔이 진해지고.. 그렇게 해줘."*).
    // 임계·색은 `joystick-look.js` 한 곳이고 여기는 **판정 결과를 DOM 에 새기기만** 한다.
    // ⚠ `a` 는 데드존을 걷어낸 뒤의 값이라 「손을 얹기만 한 것」은 이미 0 이다.
    parts.base.setAttribute('data-lean', leanState(Math.hypot(a.x, a.y)));
    // 화면 위로 밀면 전진 — 월드에서 전진은 -z 이므로 y를 그대로 z 로 넘긴다.
    targets.setAxes(a.x, a.y);
    e.preventDefault();
  };
  const onStickUp = (e: PointerEvent) => {
    if (e.pointerId !== stickId) return;
    stickId = null;
    parts.base.dataset.on = '0';
    resetKnob();
  };

  // ── 시선: 캔버스 터치 ─────────────────────────────────────────────────────
  const find = (list: TouchList, id: number): Touch | null => {
    for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
    return null;
  };
  const liveIds = (list: TouchList): number[] => {
    const out: number[] = [];
    for (let i = 0; i < list.length; i++) out.push(list[i].identifier);
    return out;
  };

  const onStart = (e: TouchEvent) => {
    slots = reconcile(slots, liveIds(e.touches));
    // 편집 중에는 시선을 잡지 않는다 — 기즈모 끌기와 같은 드래그이기 때문이다.
    if (editing || slots.look !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    slots = { look: t.identifier };
    lastLookX = t.clientX; lastLookY = t.clientY;
    e.preventDefault();
  };

  const onMove = (e: TouchEvent) => {
    slots = reconcile(slots, liveIds(e.touches));
    if (slots.look === null) return;
    const t = find(e.touches, slots.look);
    if (!t) return;
    const d = lookDelta(t.clientX - lastLookX, t.clientY - lastLookY);
    lastLookX = t.clientX; lastLookY = t.clientY;
    targets.look(d.x, d.y);
    e.preventDefault();
  };

  const onEnd = (e: TouchEvent) => { slots = reconcile(slots, liveIds(e.touches)); };

  /** 전량 해제. 탭 전환·창 이탈에서 touchend를 안 주는 기기가 있다. */
  const releaseAll = () => {
    slots = { ...NO_SLOTS };
    if (stickId !== null) {
      try { hit.releasePointerCapture(stickId); } catch { /* 이미 풀렸으면 그만 */ }
      stickId = null;
    }
    parts.base.dataset.on = '0';
    resetKnob();
  };
  const onVisibility = () => { if (document.hidden) releaseAll(); };

  hit.addEventListener('pointerdown', onStickDown);
  hit.addEventListener('pointermove', onStickMove);
  hit.addEventListener('pointerup', onStickUp);
  hit.addEventListener('pointercancel', onStickUp);
  surface.addEventListener('touchstart', onStart, { passive: false });
  surface.addEventListener('touchmove', onMove, { passive: false });
  surface.addEventListener('touchend', onEnd, { passive: false });
  surface.addEventListener('touchcancel', onEnd, { passive: false });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', onVisibility);

  return {
    active: true,
    setEditing(on: boolean) {
      editing = on;
      // 켜는 순간 잡고 있던 시선을 놓는다 — 안 놓으면 편집 첫 프레임에 화면이 돌아간다.
      if (on) slots = { ...NO_SLOTS };
    },
    dispose() {
      hit.removeEventListener('pointerdown', onStickDown);
      hit.removeEventListener('pointermove', onStickMove);
      hit.removeEventListener('pointerup', onStickUp);
      hit.removeEventListener('pointercancel', onStickUp);
      surface.removeEventListener('touchstart', onStart);
      surface.removeEventListener('touchmove', onMove);
      surface.removeEventListener('touchend', onEnd);
      surface.removeEventListener('touchcancel', onEnd);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onVisibility);
      releaseAll();
    },
  };
}
