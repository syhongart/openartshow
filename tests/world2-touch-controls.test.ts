// @vitest-environment jsdom
// tests/world2-touch-controls.test.ts — 터치 조작 **집행부**의 행위 (`G-EDIT14`).
//
// ── 왜 순수 함수 테스트로 부족했나 ──────────────────────────────────────────
// `tests/world2-touch.test.ts` 는 `decide/touch.ts` 의 산술만 본다. 그런데 2026-08-21
// 개정의 핵심은 산술이 아니라 **배선**이다 — 「이동은 전용 원 안에서만」·「편집 중에는
// 시선을 안 잡는다」는 `ui/touch-controls.ts` 가 리스너를 어디에 어떻게 다는가의 문제다.
//
// 🔴 **이 파일이 생긴 이유를 정직하게 적는다.** 개정을 다 하고 뮤테이션을 돌렸더니
// `onStart` 의 `editing ||` 가드를 **통째로 지워도 0 failed** 였다 — 그 축을 재는 검사가
// 하나도 없었다. 「테스트 통과는 검출력의 증거가 아니다」의 실물이라 그 자리에서 메웠다.
//
// ── 여기서 **못** 재는 것 ───────────────────────────────────────────────────
// ⚠ 실기기에서 **같은 한 번의 탭에 조이스틱과 편집이 둘 다 반응하는가** 는 여전히 못
// 잰다(jsdom 은 브라우저의 이벤트 캡처 순서를 흉내만 낸다). 여기서 재는 것은
// 「이 구현이 리스너를 어디에 다는가」와 「편집 플래그가 시선을 끊는가」 둘이다.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { attachTouchControls } from '../frontend/js/world2/ui/touch-controls.js';

/** 터치 기기인 척한다 — 아니면 `attachTouchControls` 가 즉시 빠진다 */
function pretendTouch(): void {
  vi.stubGlobal('matchMedia', () => ({ matches: true, media: '', addListener() {}, removeListener() {} }));
}

/** jsdom 에 `TouchEvent` 생성자가 없어도 되게 — 필요한 속성만 얹는다 */
function touchEvent(type: string, touches: Array<{ id: number; x: number; y: number }>): Event {
  const list = touches.map((t) => ({ identifier: t.id, clientX: t.x, clientY: t.y }));
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'touches', { value: list });
  Object.defineProperty(ev, 'changedTouches', { value: list });
  return ev;
}

function pointerEvent(type: string, id: number, x: number, y: number): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'pointerId', { value: id });
  Object.defineProperty(ev, 'clientX', { value: x });
  Object.defineProperty(ev, 'clientY', { value: y });
  return ev;
}

function mount() {
  const canvas = document.createElement('canvas');
  const base = document.createElement('div');
  const knob = document.createElement('div');
  base.append(knob);
  document.body.append(canvas, base);
  // jsdom 은 레이아웃이 없어 `getBoundingClientRect` 가 전부 0 이다 — 중심을 알려 준다.
  base.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 112, height: 112, right: 112, bottom: 112, x: 0, y: 0, toJSON() {},
  }) as DOMRect;
  // 포인터 캡처도 jsdom 에 없다. 있는 척만 하면 된다 — 이 검사의 축이 아니다.
  base.setPointerCapture = () => {};
  base.releasePointerCapture = () => {};

  const axes: Array<{ x: number; z: number }> = [];
  const looks: Array<{ yaw: number; pitch: number }> = [];
  const ctl = attachTouchControls(canvas, { base, knob }, {
    setAxes: (x, z) => { axes.push({ x, z }); },
    look: (yaw, pitch) => { looks.push({ yaw, pitch }); },
  });
  return { canvas, base, knob, axes, looks, ctl };
}

beforeEach(() => {
  document.body.innerHTML = '';
  pretendTouch();
});

// ── 🔴 GS-J3 — 편집 중에는 시선을 안 잡는다 ─────────────────────────────────
describe('🔴 GS-J3 — 편집이 켜지면 캔버스 드래그가 시선을 안 돌린다', () => {
  it('평소에는 캔버스 드래그가 시선을 돌린다 (대조군)', () => {
    const h = mount();
    expect(h.ctl.active, '전제 — 터치 기기로 인식돼야 한다').toBe(true);
    h.canvas.dispatchEvent(touchEvent('touchstart', [{ id: 1, x: 100, y: 100 }]));
    h.canvas.dispatchEvent(touchEvent('touchmove', [{ id: 1, x: 140, y: 100 }]));
    expect(h.looks.length, '대조군이 안 돌면 아래 단언이 헛돈다').toBeGreaterThan(0);
  });

  it('🔴 편집 중에는 같은 드래그가 시선을 **안** 돌린다 — 기즈모 끌기와 겹치기 때문이다', () => {
    const h = mount();
    h.ctl.setEditing(true);
    h.canvas.dispatchEvent(touchEvent('touchstart', [{ id: 1, x: 100, y: 100 }]));
    h.canvas.dispatchEvent(touchEvent('touchmove', [{ id: 1, x: 140, y: 100 }]));
    expect(h.looks, '🔴 편집 중에 화면이 돌아간다 — 물건을 끌면 시점까지 따라 돈다')
      .toEqual([]);
  });

  it('🔴 편집을 끄면 시선이 돌아온다 — 한쪽만 고치면 영영 안 돌아간다', () => {
    const h = mount();
    h.ctl.setEditing(true);
    h.ctl.setEditing(false);
    h.canvas.dispatchEvent(touchEvent('touchstart', [{ id: 1, x: 100, y: 100 }]));
    h.canvas.dispatchEvent(touchEvent('touchmove', [{ id: 1, x: 140, y: 100 }]));
    expect(h.looks.length, '🔴 편집을 껐는데 시선이 죽어 있다').toBeGreaterThan(0);
  });

  it('🔴 잡고 있던 중에 편집이 켜지면 그 손가락을 놓는다', () => {
    // 안 놓으면 편집 첫 프레임에 화면이 한 번 튄다.
    const h = mount();
    h.canvas.dispatchEvent(touchEvent('touchstart', [{ id: 1, x: 100, y: 100 }]));
    h.ctl.setEditing(true);
    h.canvas.dispatchEvent(touchEvent('touchmove', [{ id: 1, x: 200, y: 100 }]));
    expect(h.looks, '🔴 편집을 켠 순간 화면이 튄다').toEqual([]);
  });
});

// ── 🔴 GS-J4 — 이동은 전용 원 안에서만, 그리고 편집 중에도 산다 ─────────────
describe('🔴 GS-J4 — 이동 조이스틱은 전용 원이 받는다', () => {
  it('원을 밀면 축이 나온다', () => {
    const h = mount();
    h.base.dispatchEvent(pointerEvent('pointerdown', 5, 56, 56));
    h.base.dispatchEvent(pointerEvent('pointermove', 5, 56 + 60, 56));
    const last = h.axes.at(-1)!;
    expect(last.x, '🔴 원을 밀었는데 이동 축이 0이다').toBeGreaterThan(0);
  });

  it('🔴 **편집 중에도** 원은 산다 — 폰에는 궤도·줌·비행이 없어 이것마저 끊으면 못 움직인다', () => {
    const h = mount();
    h.ctl.setEditing(true);
    h.base.dispatchEvent(pointerEvent('pointerdown', 5, 56, 56));
    h.base.dispatchEvent(pointerEvent('pointermove', 5, 56 + 60, 56));
    expect(h.axes.at(-1)!.x, '🔴 편집 중에 조이스틱이 죽었다').toBeGreaterThan(0);
  });

  it('🔴 캔버스를 끌어도 이동 축은 안 생긴다 — 「왼쪽 절반」 판정이 되살아나면 깨진다', () => {
    const h = mount();
    h.canvas.dispatchEvent(touchEvent('touchstart', [{ id: 1, x: 10, y: 300 }]));
    h.canvas.dispatchEvent(touchEvent('touchmove', [{ id: 1, x: 10, y: 200 }]));
    // 화면 왼쪽 끝을 끌었다 — 예전 설계라면 이동이 잡혔을 자리다.
    expect(h.axes.filter((a) => a.x !== 0 || a.z !== 0), '🔴 캔버스가 아직 이동을 먹는다')
      .toEqual([]);
  });

  it('손을 떼면 멈춘다', () => {
    const h = mount();
    h.base.dispatchEvent(pointerEvent('pointerdown', 5, 56, 56));
    h.base.dispatchEvent(pointerEvent('pointermove', 5, 56 + 60, 56));
    h.base.dispatchEvent(pointerEvent('pointerup', 5, 56 + 60, 56));
    expect(h.axes.at(-1), '🔴 손을 뗐는데 계속 걷는다').toEqual({ x: 0, z: 0 });
  });
});
