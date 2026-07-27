// world2 터치 조작 판정 테스트.
//
// 이 파일의 핵심은 `reconcile` — 실기기에서만 드러났던 사고를 테스트로 못 박는 지점이다.
// 메인 스레드가 길게 블록되면 touchend가 유실돼 슬롯이 영구히 남고, 그러면 조이스틱이
// 화면에 붙은 채 반응하지 않으면서 아바타가 저절로 걷는다.

import { describe, it, expect } from 'vitest';
import {
  stickAxes, knobOffset, reconcile, assignSlot, lookDelta, isTouchDevice,
  STICK_RADIUS, DEADZONE, NO_SLOTS, type TouchSlots,
} from '../web/js/world2/decide/touch.js';
import { moveFromAxes } from '../web/js/world2/systems/player.js';

const len = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);

describe('stickAxes — 살짝 밀면 천천히 (정규화가 아니라 클램프)', () => {
  it('중심에서는 0', () => {
    expect(stickAxes(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('데드존 안은 0 — 손가락을 얹기만 해도 걷지 않는다', () => {
    expect(len(stickAxes(STICK_RADIUS * DEADZONE * 0.5, 0))).toBe(0);
  });

  it('반경 끝은 길이 1', () => {
    expect(len(stickAxes(STICK_RADIUS, 0))).toBeCloseTo(1, 5);
  });

  it('반경을 넘겨도 1을 넘지 않는다', () => {
    expect(len(stickAxes(STICK_RADIUS * 5, 0))).toBeCloseTo(1, 5);
  });

  it('중간쯤 밀면 중간 속도 — 이게 아날로그의 전부다', () => {
    const half = len(stickAxes(STICK_RADIUS * 0.6, 0));
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1);
  });

  it('데드존 경계에서 속도가 튀지 않는다', () => {
    const justInside = len(stickAxes(STICK_RADIUS * (DEADZONE + 0.001), 0));
    expect(justInside).toBeLessThan(0.05); // 0에서 매끄럽게 시작
  });

  it('방향이 보존된다', () => {
    const a = stickAxes(30, 40);
    expect(a.x / a.y).toBeCloseTo(30 / 40, 5);
  });

  it('이상한 입력에 안전하다', () => {
    expect(stickAxes(NaN, 0)).toEqual({ x: 0, y: 0 });
    expect(stickAxes(0, Infinity)).toEqual({ x: 0, y: 0 });
  });
});

describe('knobOffset — 손잡이는 원 밖으로 안 나간다', () => {
  it('반경 안이면 그대로', () => {
    expect(knobOffset(10, 0)).toEqual({ x: 10, y: 0 });
  });

  it('반경 밖이면 잘린다', () => {
    expect(len(knobOffset(500, 0))).toBeCloseTo(STICK_RADIUS, 5);
  });
});

describe('reconcile — stale 터치 방어 (실기기 사고의 회귀)', () => {
  const slots = (o: Partial<TouchSlots> = {}): TouchSlots => ({ ...NO_SLOTS, ...o });

  it('살아 있는 터치는 유지한다', () => {
    expect(reconcile(slots({ move: 7 }), [7])).toEqual({ move: 7, look: null });
  });

  it('사라진 터치를 청소한다 — touchend가 유실돼도 다음 이벤트에서 풀린다', () => {
    // 이게 안 되면 아바타가 저절로 걷는다.
    expect(reconcile(slots({ move: 7 }), [])).toEqual({ move: null, look: null });
  });

  it('다른 손가락만 남았으면 죽은 슬롯이 풀린다', () => {
    expect(reconcile(slots({ move: 7, look: 9 }), [9])).toEqual({ move: null, look: 9 });
  });

  it('둘 다 살아 있으면 둘 다 유지', () => {
    expect(reconcile(slots({ move: 1, look: 2 }), [1, 2])).toEqual({ move: 1, look: 2 });
  });

  it('빈 슬롯은 그대로 빈다', () => {
    expect(reconcile(NO_SLOTS, [1, 2, 3])).toEqual(NO_SLOTS);
  });

  it('id 0도 유효한 값이다 — falsy 판정으로 지우면 안 된다', () => {
    expect(reconcile(slots({ move: 0 }), [0])).toEqual({ move: 0, look: null });
  });
});

describe('assignSlot — 왼쪽은 이동, 오른쪽은 시선', () => {
  it('왼쪽 절반은 이동', () => {
    expect(assignSlot(NO_SLOTS, 100, 800)).toBe('move');
  });

  it('오른쪽 절반은 시선', () => {
    expect(assignSlot(NO_SLOTS, 700, 800)).toBe('look');
  });

  it('이미 찬 슬롯이면 거부 — 한 손가락이 두 역할을 겸하지 않는다', () => {
    expect(assignSlot({ move: 3, look: null }, 100, 800)).toBeNull();
    expect(assignSlot({ move: null, look: 3 }, 700, 800)).toBeNull();
  });

  it('반대쪽이 비어 있으면 배정된다', () => {
    expect(assignSlot({ move: 3, look: null }, 700, 800)).toBe('look');
  });
});

describe('lookDelta', () => {
  it('오른쪽으로 쓸면 시야가 왼쪽으로 돈다(카메라 관례)', () => {
    expect(lookDelta(10, 0).x).toBeLessThan(0);
  });

  it('움직임이 없으면 0', () => {
    expect(lookDelta(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('이상한 입력에 안전하다', () => {
    expect(lookDelta(NaN, 5)).toEqual({ x: 0, y: 0 });
  });
});

describe('isTouchDevice — 화면 폭이 아니라 포인터 종류로 판정', () => {
  it('터치 포인트가 있으면 터치 기기', () => {
    expect(isTouchDevice({ maxTouchPoints: 5 }, false)).toBe(true);
  });

  it('coarse 포인터면 터치 기기', () => {
    expect(isTouchDevice({ maxTouchPoints: 0 }, true)).toBe(true);
  });

  it('둘 다 아니면 데스크톱 — 좁은 창에 조이스틱이 뜨면 안 된다', () => {
    expect(isTouchDevice({ maxTouchPoints: 0 }, false)).toBe(false);
  });

  it('navigator가 없어도 죽지 않는다', () => {
    expect(isTouchDevice(undefined, false)).toBe(false);
  });
});

describe('moveFromAxes — 조이스틱이 실제 이동으로 이어진다', () => {
  it('축 크기가 속도에 반영된다', () => {
    const half = moveFromAxes(0, -0.5, 0, 10, 1);
    const full = moveFromAxes(0, -1, 0, 10, 1);
    expect(Math.hypot(half.dx, half.dz)).toBeCloseTo(Math.hypot(full.dx, full.dz) / 2, 5);
  });

  it('길이 1을 넘으면 자른다 — 대각선이 빨라지지 않는다', () => {
    const diag = moveFromAxes(1, -1, 0, 10, 1);
    const straight = moveFromAxes(0, -1, 0, 10, 1);
    expect(Math.hypot(diag.dx, diag.dz)).toBeCloseTo(Math.hypot(straight.dx, straight.dz), 5);
  });

  it('조이스틱을 위로 밀면 앞으로 간다', () => {
    // 화면 위로 밀면 y가 음수 → z 음수 → 전진(-Z)
    const d = moveFromAxes(0, -1, 0, 10, 1);
    expect(d.dz).toBeLessThan(0);
  });

  it('입력이 없으면 안 움직인다', () => {
    expect(moveFromAxes(0, 0, 0, 10, 1)).toEqual({ dx: 0, dz: 0 });
  });

  it('이상한 입력에 안전하다', () => {
    expect(moveFromAxes(NaN, 0, 0, 10, 1)).toEqual({ dx: 0, dz: 0 });
  });
});
