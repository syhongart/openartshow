// world2/ui/touch-controls.ts — 모바일 터치 조작(가상 조이스틱 + 시선 드래그).
//
// ── 설계 (2026-08-21 개정, 팀장 판정 (나)) ───────────────────────────────────
//   · **이동** — 좌하단 **전용 원**(`#w2-stick`) 안에서만. `setPointerCapture` 로 붙든다.
//   · **시선** — 캔버스 위 아무 데나 드래그. **편집 중에는 끈다**(아래).
//
// ⚠ **예전에는 「화면 왼쪽 절반 = 이동」이었다.** 그 판정(`decide/touch.ts` 의
// `assignSlot`)이 편집과 충돌하는 근원이었다 — 같은 터치가 조이스틱과 `edit/input.ts` 의
// `pointerdown` 에 **둘 다** 들어가 물건이 선택되면서 동시에 아바타가 걸었다.
// 왜 이 형태를 골랐는지(선택지 셋과 기각 사유)는 그 함수가 있던 자리 한 곳에 있다.
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
  /** 조이스틱 바깥 원. **이제 이것이 판정 영역이다** — 그림만 그리던 요소가 아니다 */
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
    targets.setAxes(0, 0);
  };

  const onStickDown = (e: PointerEvent) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    try { parts.base.setPointerCapture(stickId); } catch { /* 캡처 실패해도 아래가 돈다 */ }
    const r = parts.base.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    parts.base.dataset.on = '1';
    e.preventDefault();
  };
  const onStickMove = (e: PointerEvent) => {
    if (e.pointerId !== stickId) return;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    drawKnob(dx, dy);
    const a = stickAxes(dx, dy, STICK_RADIUS);
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
      try { parts.base.releasePointerCapture(stickId); } catch { /* 이미 풀렸으면 그만 */ }
      stickId = null;
    }
    parts.base.dataset.on = '0';
    resetKnob();
  };
  const onVisibility = () => { if (document.hidden) releaseAll(); };

  parts.base.addEventListener('pointerdown', onStickDown);
  parts.base.addEventListener('pointermove', onStickMove);
  parts.base.addEventListener('pointerup', onStickUp);
  parts.base.addEventListener('pointercancel', onStickUp);
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
      parts.base.removeEventListener('pointerdown', onStickDown);
      parts.base.removeEventListener('pointermove', onStickMove);
      parts.base.removeEventListener('pointerup', onStickUp);
      parts.base.removeEventListener('pointercancel', onStickUp);
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
