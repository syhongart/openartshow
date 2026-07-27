// world2 이동 계산 테스트.
//
// 대각선 정규화가 이 파일의 핵심이다. 정규화가 빠지면 W+D가 W보다 √2배 빨라지는데,
// 플레이어는 그걸 버그로 인지하지 못하고 그냥 대각선으로만 다니게 된다 — 그러면 스트리밍
// look-ahead 판정까지 함께 왜곡된다.

import { describe, it, expect } from 'vitest';
import {
  moveDelta, facing, clampPitch, NO_INPUT, PlayerSystem,
  stepBobPhase, bobHeight, BOB_AMPLITUDE, WALK_SPEED, RUN_MULT,
  type MoveInput,
} from '../frontend/js/world2/systems/player.js';
import type { FrameCtx } from '../frontend/js/world2/kernel.js';

const inp = (o: Partial<MoveInput> = {}): MoveInput => ({ ...NO_INPUT, ...o });
const len = (d: { dx: number; dz: number }) => Math.hypot(d.dx, d.dz);
const ctx = (o: Partial<FrameCtx> = {}): FrameCtx => ({ dt: 1, ageMs: 0, frame: 1, hidden: false, ...o });

describe('moveDelta — 대각선이 빠르면 안 된다', () => {
  it('직진과 대각선의 속력이 같다', () => {
    const straight = moveDelta(inp({ forward: true }), 0, 10, 1);
    const diagonal = moveDelta(inp({ forward: true, right: true }), 0, 10, 1);
    expect(len(diagonal)).toBeCloseTo(len(straight), 6);
  });

  it('네 방향 모두 같은 속력', () => {
    const dirs = [{ forward: true }, { back: true }, { left: true }, { right: true }];
    const lens = dirs.map((d) => len(moveDelta(inp(d), 0.7, 10, 1)));
    for (const l of lens) expect(l).toBeCloseTo(lens[0], 6);
  });

  it('입력이 없으면 움직이지 않는다', () => {
    expect(moveDelta(NO_INPUT, 1.2, 10, 1)).toEqual({ dx: 0, dz: 0 });
  });

  it('상반된 입력은 상쇄된다', () => {
    expect(moveDelta(inp({ forward: true, back: true }), 0, 10, 1)).toEqual({ dx: 0, dz: 0 });
    expect(moveDelta(inp({ left: true, right: true }), 0, 10, 1)).toEqual({ dx: 0, dz: 0 });
  });

  it('dt에 비례한다 — 프레임률이 속도를 바꾸면 안 된다', () => {
    const a = len(moveDelta(inp({ forward: true }), 0, 10, 1 / 60));
    const b = len(moveDelta(inp({ forward: true }), 0, 10, 2 / 60));
    expect(b).toBeCloseTo(a * 2, 9);
  });

  it('달리기가 더 빠르다', () => {
    const walk = len(moveDelta(inp({ forward: true }), 0, 10, 1));
    const run = len(moveDelta(inp({ forward: true, fast: true }), 0, 10, 1));
    expect(run).toBeGreaterThan(walk);
  });

  it('yaw를 돌리면 이동 방향도 함께 돈다 — 속력은 그대로', () => {
    const a = moveDelta(inp({ forward: true }), 0, 10, 1);
    const b = moveDelta(inp({ forward: true }), Math.PI / 2, 10, 1);
    expect(len(a)).toBeCloseTo(len(b), 6);
    expect(a.dx).not.toBeCloseTo(b.dx, 3);
  });

  it('yaw 0에서 전진은 -Z 방향 — 시선 방향과 일치한다', () => {
    const d = moveDelta(inp({ forward: true }), 0, 10, 1);
    const f = facing(0);
    expect(Math.sign(d.dz)).toBe(Math.sign(f.z));
    expect(d.dx).toBeCloseTo(0, 6);
  });

  // ── 회귀: 시선을 돌리면 좌우가 뒤집히던 버그 ────────────────────────────
  // 회전 변환의 부호를 틀렸는데 yaw=0에서는 두 식이 우연히 같아 통과했다. 감독이
  // 실기기에서 "조이스틱 방향이 전혀 안 맞는다"고 발견했다. 속력만 비교하는 테스트로는
  // 절대 못 잡는다 — 반드시 facing과 방향까지 대조해야 한다.
  it.each([0, 30, 45, 90, 135, 180, 270, -60])('yaw %i°에서 전진이 시선과 같은 방향이다', (deg) => {
    const yaw = (deg * Math.PI) / 180;
    const d = moveDelta(inp({ forward: true }), yaw, 10, 1);
    const f = facing(yaw);
    const n = Math.hypot(d.dx, d.dz);
    expect(d.dx / n).toBeCloseTo(f.x, 6);
    expect(d.dz / n).toBeCloseTo(f.z, 6);
  });

  it.each([0, 45, 90, 180])('yaw %i°에서 우측 이동이 시선의 오른쪽이다', (deg) => {
    const yaw = (deg * Math.PI) / 180;
    const d = moveDelta(inp({ right: true }), yaw, 10, 1);
    const f = facing(yaw);
    // 오른쪽 = forward를 y축으로 -90° 돌린 것. 외적으로 검사한다(부호가 뒤집히면 음수).
    const cross = f.x * d.dz - f.z * d.dx;
    expect(cross).toBeGreaterThan(0);
  });

  it('후진은 시선의 반대다', () => {
    const yaw = 1.1;
    const d = moveDelta(inp({ back: true }), yaw, 10, 1);
    const f = facing(yaw);
    const n = Math.hypot(d.dx, d.dz);
    expect(d.dx / n).toBeCloseTo(-f.x, 6);
    expect(d.dz / n).toBeCloseTo(-f.z, 6);
  });
});

describe('facing / clampPitch', () => {
  it('facing은 단위벡터', () => {
    for (const yaw of [0, 0.5, 2.2, -1.7, Math.PI]) {
      expect(Math.hypot(facing(yaw).x, facing(yaw).z)).toBeCloseTo(1, 9);
    }
  });

  it('피치가 수직을 넘지 않는다 — 넘으면 화면이 뒤집힌다', () => {
    expect(clampPitch(99)).toBeLessThan(Math.PI / 2);
    expect(clampPitch(-99)).toBeGreaterThan(-Math.PI / 2);
  });

  it('범위 안이면 그대로', () => {
    expect(clampPitch(0.3)).toBe(0.3);
  });
});

describe('PlayerSystem', () => {
  it('입력대로 이동하고 위치를 노출한다', () => {
    const p = new PlayerSystem({ speed: 10, start: { x: 0, z: 0 } });
    p.setInput({ forward: true });
    p.update(ctx({ dt: 1 }));
    expect(Math.hypot(p.position.x, p.position.z)).toBeCloseTo(10, 6);
  });

  it('카메라에 위치와 각도를 반영한다', () => {
    const seen: number[] = [];
    const p = new PlayerSystem({ applyCamera: (x, y, z, yaw, pitch) => { seen.push(x, y, z, yaw, pitch); } });
    p.update(ctx());
    expect(seen).toHaveLength(5);
    expect(seen[1]).toBeGreaterThan(0); // 눈높이
  });

  it('정지 중에는 시선 방향을 direction으로 준다 — 서서 둘러볼 때 그쪽을 미리 올린다', () => {
    const p = new PlayerSystem();
    p.look(100, 0);
    const f = facing(p.angles.yaw);
    expect(p.direction.x).toBeCloseTo(f.x, 9);
    expect(p.direction.z).toBeCloseTo(f.z, 9);
  });

  it('이동 중에는 이동 방향을 준다', () => {
    const p = new PlayerSystem({ speed: 10 });
    p.setInput({ right: true });
    p.update(ctx({ dt: 0.1 }));
    expect(Math.hypot(p.direction.x, p.direction.z)).toBeCloseTo(1, 6);
    expect(p.direction.x).toBeCloseTo(1, 6);
  });

  it('look이 시선을 돌리고 피치를 가둔다', () => {
    const p = new PlayerSystem();
    p.look(0, 100000);
    expect(Math.abs(p.angles.pitch)).toBeLessThan(Math.PI / 2);
  });

  it('입력을 부분만 바꿔도 나머지가 유지된다', () => {
    const p = new PlayerSystem({ speed: 10 });
    p.setInput({ forward: true });
    p.setInput({ fast: true });
    p.update(ctx({ dt: 1 }));
    expect(Math.hypot(p.position.x, p.position.z)).toBeGreaterThan(10);
  });
});

// ── 헤드밥 ───────────────────────────────────────────────────────────────────
//
// 감독 판정 **"땅에 붙어가는 느낌이야"** 의 처방 절반이다(나머지 절반은 속도).
//
// 여기가 이 프로젝트가 반복해 뚫린 자리다 — **판정과 집행의 경계.** `bobHeight` 가 옳은
// 값을 돌려줘도 `update` 가 그걸 카메라 y 에 안 더하면 화면은 아무 일도 안 일어나고,
// 순수 함수 테스트는 전부 초록이다. 구름 `alpha` 미소비가 정확히 이 형태였다.
// 그래서 아래 "실제로 카메라에 전달된다" 묶음이 이 파일에서 제일 중요하다.

describe('bobHeight / stepBobPhase — 순수 판정', () => {
  it('빨리 걸으면 위상이 빨리 간다 — 고정 각속도면 발과 화면이 어긋난다', () => {
    const slow = stepBobPhase(0, 0.5, 0.1);
    const fast = stepBobPhase(0, 1.0, 0.1);
    expect(fast).toBeCloseTo(slow * 2, 9);
  });

  it('멈춰 있으면 위상이 안 간다', () => {
    expect(stepBobPhase(3, 0, 0.1)).toBe(3);
  });

  it('진폭 0이면 언제나 0 — 끌 수 있어야 감독이 비교한다', () => {
    // `toBe(0)`이 아니라 근사 비교인 이유: `sin(4) * 0`은 **-0**이고 `Object.is(-0, 0)`은
    // false다. 카메라 y에 더하면 차이가 없으므로 부호 있는 0을 구분할 이유가 없다.
    for (const ph of [0, 1, 2.5, 4]) expect(bobHeight(ph, 1, 0)).toBeCloseTo(0, 12);
  });

  it('강도 0이면 0 — 정지 중 화면이 흔들리면 안 된다', () => {
    expect(bobHeight(1.2, 0)).toBe(0);
  });

  it('위아래로 모두 간다 — 한쪽으로만 밀리면 눈높이가 바뀐 것이지 걸음이 아니다', () => {
    const ys = [];
    for (let i = 0; i < 24; i++) ys.push(bobHeight(i * 0.4, 1));
    expect(Math.max(...ys)).toBeGreaterThan(0);
    expect(Math.min(...ys)).toBeLessThan(0);
  });

  it('강도가 진폭을 넘지 못한다', () => {
    for (let i = 0; i < 30; i++) {
      expect(Math.abs(bobHeight(i * 0.7, 1, BOB_AMPLITUDE))).toBeLessThanOrEqual(BOB_AMPLITUDE + 1e-12);
    }
  });
});

describe('헤드밥이 실제로 카메라에 전달된다 — 판정/집행 경계', () => {
  /** 걸으면서 카메라 y 를 모은다 */
  const walk = (opts: { bobAmplitude?: number } = {}, frames = 12) => {
    const ys: number[] = [];
    const p = new PlayerSystem({ speed: 10, applyCamera: (_x, y) => { ys.push(y); }, ...opts });
    p.setInput({ forward: true });
    for (let i = 0; i < frames; i++) p.update(ctx({ dt: 0.1, frame: i + 1 }));
    return ys;
  };

  it('걸으면 눈높이가 위아래로 흔들린다 — 안 흔들리면 활강이지 걷기가 아니다', () => {
    const ys = walk();
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.01);
  });

  it('흔들림이 눈높이를 중심으로 한다 — 통째로 올라가면 그냥 키가 커진 것이다', () => {
    const ys = walk();
    expect(Math.max(...ys)).toBeGreaterThan(1.7);
    expect(Math.min(...ys)).toBeLessThan(1.7);
  });

  it('bob=0이면 걸어도 정확히 눈높이 — 끄기가 실제로 먹는가', () => {
    for (const y of walk({ bobAmplitude: 0 })) expect(y).toBe(1.7);
  });

  it('가만히 서 있으면 흔들리지 않는다', () => {
    const ys: number[] = [];
    const p = new PlayerSystem({ applyCamera: (_x, y) => { ys.push(y); } });
    for (let i = 0; i < 10; i++) p.update(ctx({ dt: 0.1, frame: i + 1 }));
    for (const y of ys) expect(y).toBe(1.7);
  });

  it('멈추면 흔들림이 잦아든다 — 키를 떼는 순간 툭 끊기면 화면이 튄다', () => {
    const p = new PlayerSystem({ speed: 10, applyCamera: (_x, y) => { ys.push(y); } });
    const ys: number[] = [];
    p.setInput({ forward: true });
    for (let i = 0; i < 12; i++) p.update(ctx({ dt: 0.1, frame: i + 1 }));
    const moving = Math.max(...ys) - Math.min(...ys);
    p.setInput({ forward: false });
    ys.length = 0;
    for (let i = 0; i < 30; i++) p.update(ctx({ dt: 0.1, frame: 100 + i }));
    // 뒤쪽 절반은 사실상 멎어 있어야 한다
    const tail = ys.slice(15);
    expect(Math.max(...tail) - Math.min(...tail)).toBeLessThan(moving * 0.1);
  });

  it('느리게 걸으면 덜 흔들린다 — 강도가 속력을 따라간다', () => {
    // 같은 speed 설정에서 조이스틱을 살짝만 민다(0.3) vs 끝까지(1.0)
    const amp = (stick: number) => {
      const ys: number[] = [];
      const p = new PlayerSystem({ speed: 10, applyCamera: (_x, y) => { ys.push(y); } });
      p.setAxes(0, -stick);
      for (let i = 0; i < 40; i++) p.update(ctx({ dt: 0.1, frame: i + 1 }));
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(amp(0.3)).toBeLessThan(amp(1));
  });
});

describe('걷는 속도 — 자동차가 아니어야 한다', () => {
  it('기본 걷기가 사람 범위다', () => {
    expect(WALK_SPEED).toBeGreaterThan(2);
    expect(WALK_SPEED).toBeLessThan(7);
  });

  it('달리기가 전력질주 상한을 넘지 않는다 — 예전 19.8m/s는 시속 71km였다', () => {
    expect(WALK_SPEED * RUN_MULT).toBeLessThan(12);
  });

  it('주입이 없으면 기본 걷기 속도를 쓴다 — 상수와 따로 놀면 아무도 모른다', () => {
    const p = new PlayerSystem();
    p.setInput({ forward: true });
    p.update(ctx({ dt: 1 }));
    expect(Math.hypot(p.position.x, p.position.z)).toBeCloseTo(WALK_SPEED, 6);
  });
});
