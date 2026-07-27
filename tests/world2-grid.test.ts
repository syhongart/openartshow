// 격자 SSOT 테스트 — 세계의 크기와 블록 나눔.
//
// 감독 지시: *"월드 1처럼 격자로 해주고. 가로 30. 세로 30 으로 하자. 칸의 크기는 모두
// 같은 크기가 아니라 조금 달랐으면해. 2개 셀이 한개인것도 있고."*
//
// 여기서 지켜야 할 것이 서로 당긴다. **격자여야 하고**(길이 끊기면 안 된다) 동시에
// **고르지 않아야 한다**(전부 같은 칸이면 바둑판이다). 한쪽만 검사하면 다른 쪽이 조용히
// 무너진다 — `blockPattern` 이 늘 `None` 을 돌려줘도 "격자다" 테스트는 전부 통과한다.

import { describe, it, expect } from 'vitest';
import {
  GRID_W, GRID_H, GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z,
  inGrid, isPlaza, plazaCenter, blockPattern, gridEdgeX, gridEdgeZ, BlockPattern,
} from '../frontend/js/world2/decide/grid.js';

describe('세계의 크기 — 감독 확정 30×30', () => {
  it('가로세로 30칸이다', () => {
    expect(GRID_W).toBe(30);
    expect(GRID_H).toBe(30);
    expect(GRID_MAX_X - GRID_MIN_X + 1).toBe(GRID_W);
    expect(GRID_MAX_Z - GRID_MIN_Z + 1).toBe(GRID_H);
  });

  // 0-기반(0…29)으로 두면 스폰 지점 `(0,0)` 이 세계의 **모서리**가 된다. 원점이 안쪽
  // 깊숙이 있어야 어느 방향으로 걸어도 세계가 이어진다.
  it('원점이 세계 한복판이다 — 스폰이 모서리면 안 된다', () => {
    expect(inGrid(0, 0)).toBe(true);
    expect(GRID_MIN_X).toBeLessThan(-10);
    expect(GRID_MAX_X).toBeGreaterThan(10);
    expect(GRID_MIN_Z).toBeLessThan(-10);
    expect(GRID_MAX_Z).toBeGreaterThan(10);
  });

  it('경계 바로 밖은 세계가 아니다', () => {
    expect(inGrid(GRID_MIN_X, 0)).toBe(true);
    expect(inGrid(GRID_MIN_X - 1, 0)).toBe(false);
    expect(inGrid(GRID_MAX_X, 0)).toBe(true);
    expect(inGrid(GRID_MAX_X + 1, 0)).toBe(false);
    expect(inGrid(0, GRID_MIN_Z - 1)).toBe(false);
    expect(inGrid(0, GRID_MAX_Z + 1)).toBe(false);
  });

  it('칸 수가 정확히 30×30 이다 — 넉넉히 훑어 센다', () => {
    let n = 0;
    for (let px = -40; px <= 40; px++) for (let pz = -40; pz <= 40; pz++) if (inGrid(px, pz)) n++;
    expect(n).toBe(GRID_W * GRID_H);
  });
});

describe('중앙 광장', () => {
  it('2×2 네 칸이다 — 1칸이면 분수대와 시계탑이 서로 가린다', () => {
    let n = 0;
    for (let px = -40; px <= 40; px++) for (let pz = -40; pz <= 40; pz++) if (isPlaza(px, pz)) n++;
    expect(n).toBe(4);
  });

  // 30이 짝수라 "정확히 가운데 한 칸"이 없다. 2×2 로 잡아야 광장 **중심**이 월드 원점에
  // 온다 — 홀수 격자로 바꾸면 이 관계가 깨지므로 여기서 고정한다.
  it('광장 중심이 월드 원점이다 — 스폰이 곧 광장이다', () => {
    const c = plazaCenter();
    expect(c.x).toBe(0);
    expect(c.z).toBe(0);
    // 원점을 둘러싼 네 칸이 정확히 광장이어야 중심이 원점에 온다
    for (const [px, pz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
      expect(isPlaza(px, pz)).toBe(true);
    }
  });

  it('광장은 세계 안에 있다', () => {
    for (let px = -2; px <= 1; px++) {
      for (let pz = -2; pz <= 1; pz++) {
        if (isPlaza(px, pz)) expect(inGrid(px, pz)).toBe(true);
      }
    }
  });
});

describe('블록 — "칸의 크기가 조금 달랐으면"', () => {
  it('패턴이 결정론이다 — 같은 슈퍼셀은 언제나 같은 나눔', () => {
    for (let i = -20; i < 20; i++) {
      expect(blockPattern(i, i * 3)).toBe(blockPattern(i, i * 3));
    }
  });

  it('다섯 패턴이 모두 나온다 — 하나라도 안 나오면 그 가지는 죽은 코드다', () => {
    const seen = new Set<number>();
    for (let sx = -30; sx <= 30; sx++) for (let sz = -30; sz <= 30; sz++) seen.add(blockPattern(sx, sz));
    expect(seen.size).toBe(5);
  });

  it('대부분은 나누지 않는다 — 2칸 블록이 흔하면 그것도 규칙적이다', () => {
    let none = 0, n = 0;
    for (let sx = -40; sx <= 40; sx++) for (let sz = -40; sz <= 40; sz++) { if (blockPattern(sx, sz) === BlockPattern.None) none++; n++; }
    expect(none / n).toBeGreaterThan(0.3);  // 설계값 0.4
    expect(none / n).toBeLessThan(0.5);
  });
});

describe('격자 경계 — 이어지되 고르지 않다', () => {
  // 슈퍼셀 **사이**의 경계까지 꺼지면 4칸·6칸짜리 블록이 생겨 격자가 무너진다.
  it('슈퍼셀 사이 경계는 언제나 길이다', () => {
    for (let px = -30; px <= 30; px++) {
      for (let pz = -30; pz <= 30; pz++) {
        // px 가 홀수면 (px, px+1) 이 서로 다른 슈퍼셀이다
        if (Math.abs(px % 2) === 1) expect(gridEdgeX(px, pz)).toBe(true);
        if (Math.abs(pz % 2) === 1) expect(gridEdgeZ(px, pz)).toBe(true);
      }
    }
  });

  it('내부 경계가 실제로 꺼진다 — 안 꺼지면 전부 같은 크기다', () => {
    let offX = 0, offZ = 0;
    for (let px = -30; px <= 30; px++) {
      for (let pz = -30; pz <= 30; pz++) {
        if (!gridEdgeX(px, pz)) offX++;
        if (!gridEdgeZ(px, pz)) offZ++;
      }
    }
    expect(offX).toBeGreaterThan(0);
    expect(offZ).toBeGreaterThan(0);
  });

  // ── 음수 좌표 ──────────────────────────────────────────────────────────────
  // JS 의 `%` 는 부호를 피제수에서 가져와 `-1 % 2 === -1` 이다. 그대로 쓰면 원점 왼쪽·
  // 위쪽 절반에서 슈퍼셀 경계가 어긋나 도시가 원점을 기준으로 두 겹으로 갈라진다.
  // 원점이 세계 한복판이므로 **세계의 절반이 그 버그를 맞는다.**
  it('음수 쪽에서도 슈퍼셀이 어긋나지 않는다', () => {
    // 같은 슈퍼셀에 속한 좌표들은 같은 패턴을 봐야 한다.
    // (-2,-2)(-1,-2)(-2,-1)(-1,-1) 이 한 슈퍼셀이다(floorDiv(-1,2) === -1).
    const p = blockPattern(-1, -1);
    for (const [px, pz] of [[-2, -2], [-1, -2], [-2, -1], [-1, -1]]) {
      // 내부 경계 판정이 이 패턴과 모순되지 않는지 — 짝수 좌표에서만 꺼질 수 있다
      const canOffX = px % 2 === 0;
      if (!canOffX) expect(gridEdgeX(px, pz)).toBe(true);
    }
    expect(p).toBe(blockPattern(-1, -1));
  });

  it('음수·양수 양쪽에서 블록 병합이 고르게 일어난다', () => {
    const count = (x0: number, x1: number) => {
      let off = 0;
      for (let px = x0; px < x1; px++) for (let pz = x0; pz < x1; pz++) { if (!gridEdgeX(px, pz)) off++; if (!gridEdgeZ(px, pz)) off++; }
      return off;
    };
    const neg = count(-30, 0), pos = count(0, 30);
    // 한쪽만 0이면 음수 나눗셈이 깨진 것이다
    expect(neg).toBeGreaterThan(0);
    expect(pos).toBeGreaterThan(0);
    // 대략 비슷해야 한다 — 2배 넘게 벌어지면 좌표계가 한쪽으로 쏠린 것
    expect(Math.max(neg, pos) / Math.min(neg, pos)).toBeLessThan(2);
  });
});
