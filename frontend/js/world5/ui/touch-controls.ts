// world2/ui/touch-controls.ts — 모바일 터치 조작(가상 조이스틱 + 시선 드래그).
//
// ── 설계 ─────────────────────────────────────────────────────────────────────
// 화면 왼쪽 절반 = 이동 조이스틱, 오른쪽 절반 = 시선 드래그. 조이스틱은 **누른 자리에
// 생긴다**(고정 위치가 아니다) — 한 손으로 쥔 채 엄지가 닿는 위치가 기기·손 크기마다
// 다르므로, 고정하면 누군가는 늘 불편하다.
//
// ── stale 터치 방어 ──────────────────────────────────────────────────────────
// 실기기에서 나왔던 사고를 처음부터 막는다. 메인 스레드가 길게 블록되면 touchend가
// 유실돼 슬롯이 영구히 남고, 그러면 아바타가 저절로 걷는다. 그래서 매 터치 이벤트마다
// `e.touches`(지금 닿아 있는 것 전부)로 죽은 슬롯을 청소하고, blur·visibilitychange
// 에서도 전량 해제한다 — 탭 전환 시 touchend를 주지 않는 기기가 있다.

import {
  stickAxes, knobOffset, reconcile, assignSlot, lookDelta, isTouchDevice,
  STICK_RADIUS, NO_SLOTS, type TouchSlots,
} from '../decide/touch.js';

export interface TouchTargets {
  /** 이동 축 (x=우, z=앞. 음수 z가 전진) */
  setAxes: (x: number, z: number) => void;
  /** 시선 회전(라디안 델타) */
  look: (yaw: number, pitch: number) => void;
}

export interface TouchParts {
  /** 조이스틱 바깥 원 */
  base: HTMLElement;
  /** 손잡이 */
  knob: HTMLElement;
}

export interface TouchControls {
  readonly active: boolean;
  dispose(): void;
}

/**
 * 터치 조작을 붙인다. 터치 기기가 아니면 아무것도 하지 않고 `active=false`를 돌려준다
 * (데스크톱에 조이스틱이 뜨지 않게).
 */
export function attachTouchControls(
  surface: HTMLElement,
  parts: TouchParts,
  targets: TouchTargets,
): TouchControls {
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const touch = isTouchDevice(typeof navigator !== 'undefined' ? navigator : undefined, coarse);
  if (!touch) return { active: false, dispose() {} };

  let slots: TouchSlots = { ...NO_SLOTS };
  /** 조이스틱이 생긴 자리 */
  let originX = 0, originY = 0;
  /** 시선 드래그의 직전 좌표 */
  let lastLookX = 0, lastLookY = 0;

  const showStick = (x: number, y: number) => {
    originX = x; originY = y;
    parts.base.style.left = `${x}px`;
    parts.base.style.top = `${y}px`;
    parts.base.dataset.on = '1';
    parts.knob.style.transform = 'translate(-50%, -50%)';
  };
  const hideStick = () => {
    parts.base.dataset.on = '0';
    parts.knob.style.transform = 'translate(-50%, -50%)';
    targets.setAxes(0, 0);
  };

  const find = (list: TouchList, id: number): Touch | null => {
    for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
    return null;
  };
  const liveIds = (list: TouchList): number[] => {
    const out: number[] = [];
    for (let i = 0; i < list.length; i++) out.push(list[i].identifier);
    return out;
  };

  /** 매 이벤트의 첫 줄. 죽은 슬롯을 청소하고, 사라진 조이스틱을 접는다. */
  const sync = (e: TouchEvent) => {
    const before = slots;
    slots = reconcile(slots, liveIds(e.touches));
    if (before.move !== null && slots.move === null) hideStick();
  };

  const onStart = (e: TouchEvent) => {
    sync(e);
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const slot = assignSlot(slots, t.clientX, window.innerWidth || 1);
      if (slot === 'move') {
        slots = { ...slots, move: t.identifier };
        showStick(t.clientX, t.clientY);
      } else if (slot === 'look') {
        slots = { ...slots, look: t.identifier };
        lastLookX = t.clientX; lastLookY = t.clientY;
      }
    }
    if (slots.move !== null || slots.look !== null) e.preventDefault();
  };

  const onMove = (e: TouchEvent) => {
    sync(e);
    if (slots.move !== null) {
      const t = find(e.touches, slots.move);
      if (t) {
        const dx = t.clientX - originX;
        const dy = t.clientY - originY;
        const k = knobOffset(dx, dy, STICK_RADIUS);
        parts.knob.style.transform = `translate(calc(-50% + ${k.x}px), calc(-50% + ${k.y}px))`;
        const a = stickAxes(dx, dy, STICK_RADIUS);
        // 화면 위로 밀면 전진 — 월드에서 전진은 -z 이므로 y를 그대로 z 로 넘긴다.
        targets.setAxes(a.x, a.y);
      }
    }
    if (slots.look !== null) {
      const t = find(e.touches, slots.look);
      if (t) {
        const d = lookDelta(t.clientX - lastLookX, t.clientY - lastLookY);
        lastLookX = t.clientX; lastLookY = t.clientY;
        targets.look(d.x, d.y);
      }
    }
    if (slots.move !== null || slots.look !== null) e.preventDefault();
  };

  const onEnd = (e: TouchEvent) => { sync(e); };

  /** 전량 해제. 탭 전환·창 이탈에서 touchend를 안 주는 기기가 있다. */
  const releaseAll = () => {
    slots = { ...NO_SLOTS };
    hideStick();
  };
  const onVisibility = () => { if (document.hidden) releaseAll(); };

  surface.addEventListener('touchstart', onStart, { passive: false });
  surface.addEventListener('touchmove', onMove, { passive: false });
  surface.addEventListener('touchend', onEnd, { passive: false });
  surface.addEventListener('touchcancel', onEnd, { passive: false });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', onVisibility);

  return {
    active: true,
    dispose() {
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
