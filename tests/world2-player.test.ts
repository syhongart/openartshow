// world2 이동 계산 테스트.
//
// 대각선 정규화가 이 파일의 핵심이다. 정규화가 빠지면 W+D가 W보다 √2배 빨라지는데,
// 플레이어는 그걸 버그로 인지하지 못하고 그냥 대각선으로만 다니게 된다 — 그러면 스트리밍
// look-ahead 판정까지 함께 왜곡된다.

import { describe, it, expect } from 'vitest';
import { moveDelta, facing, clampPitch, NO_INPUT, PlayerSystem, type MoveInput } from '../web/js/world2/systems/player.js';
import type { FrameCtx } from '../web/js/world2/kernel.js';

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
