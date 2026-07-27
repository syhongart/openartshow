// 물 판정 테스트.
//
// 이 판정은 **두 계층이 함께 소비한다** — 수면을 그리는 쪽과 물을 피하는 쪽. 두 곳이
// 어긋나면 건물이 물 위에 서고, 어느 한쪽 테스트로도 안 걸린다. 그래서 판정 자체의
// 성질을 여기서 못 박아 둔다.

import { describe, it, expect } from 'vitest';
import {
  isWater, parcelWater, riverCenterZ, ISLAND_R, RIVER_HALF, SEA_Y,
} from '../frontend/js/world2/decide/water.js';

const CELL = 32;

describe('섬 — 반경 밖은 바다다', () => {
  it('원점은 뭍이다 — 스폰 지점이 물이면 시작부터 빠진다', () => {
    // 원점이 강 중심선 위인지 먼저 확인한다. riverCenterZ(0) 가 0 근처면 스폰이 강 한복판이다.
    expect(Math.abs(riverCenterZ(0))).toBeGreaterThan(RIVER_HALF);
    expect(isWater(0, 0)).toBe(false);
  });

  it('반경 밖은 전부 물이다', () => {
    for (let a = 0; a < 16; a++) {
      const th = (a / 16) * Math.PI * 2;
      const r = ISLAND_R + 50;
      expect(isWater(Math.cos(th) * r, Math.sin(th) * r)).toBe(true);
    }
  });

  it('반경 안쪽이면서 강에서 먼 곳은 뭍이다', () => {
    let dry = 0, n = 0;
    for (let x = -600; x <= 600; x += 50) {
      for (let z = -600; z <= 600; z += 50) {
        if (x * x + z * z > (ISLAND_R - 60) ** 2) continue;
        n++;
        if (!isWater(x, z)) dry++;
      }
    }
    // 섬 안에서 강이 먹는 비율은 크지 않아야 한다 — 대부분이 뭍이어야 도시가 선다.
    expect(dry / n).toBeGreaterThan(0.75);
  });
});

describe('강 — 굽이치고 이어진다', () => {
  it('중심선 위는 물이고 반폭 밖은 아니다', () => {
    for (let x = -500; x <= 500; x += 37) {
      const cz = riverCenterZ(x);
      if (x * x + cz * cz > ISLAND_R * ISLAND_R) continue; // 섬 밖은 어차피 바다
      expect(isWater(x, cz)).toBe(true);
      expect(isWater(x, cz + RIVER_HALF + 5)).toBe(false);
      expect(isWater(x, cz - RIVER_HALF - 5)).toBe(false);
    }
  });

  // 사인파 하나만 쓰면 강이 규칙적인 물결이 되어 인공물처럼 보인다. 둘을 겹친 것이
  // 그 처방이고, 여기서 실제로 되풀이되지 않는지 본다.
  it('규칙적인 물결이 아니다 — 주기가 눈에 띄지 않는다', () => {
    // 한 주기(2π·420 ≈ 2639m) 안에서 극값 위치가 균등 간격이면 단일 사인파다.
    const peaks: number[] = [];
    let prev = riverCenterZ(-1400);
    let rising = riverCenterZ(-1399) > prev;
    for (let x = -1399; x <= 1400; x++) {
      const v = riverCenterZ(x);
      const up = v > prev;
      if (rising && !up) peaks.push(x);
      rising = up;
      prev = v;
    }
    expect(peaks.length).toBeGreaterThan(2);
    const gaps = peaks.slice(1).map((p, i) => p - peaks[i]);
    const spread = Math.max(...gaps) - Math.min(...gaps);
    // 단일 사인파면 간격이 모두 같아 spread 가 0에 가깝다.
    expect(spread).toBeGreaterThan(60);
  });

  it('강이 파셀 열을 실제로 적신다 — 반폭이 파셀보다 넓다', () => {
    // 반폭이 좁으면 "파셀의 일부만 물" 인 구간이 생기는데, 지면은 파셀을 통째로 덮는
    // 판이라 그런 강은 그려지지 않는다. 이 부등식이 그 함정을 막는 근거다.
    expect(RIVER_HALF * 2).toBeGreaterThan(CELL);
  });
});

describe('파셀 분류', () => {
  it('세 부류가 모두 나온다', () => {
    const seen = new Set<string>();
    for (let px = -25; px <= 25; px++) {
      for (let pz = -25; pz <= 25; pz++) seen.add(parcelWater(px, pz, CELL, CELL));
    }
    expect([...seen].sort()).toEqual(['dry', 'shore', 'water']);
  });

  it('물 파셀은 중심도 물이다 — 분류와 점 판정이 어긋나지 않는다', () => {
    for (let px = -25; px <= 25; px++) {
      for (let pz = -25; pz <= 25; pz++) {
        if (parcelWater(px, pz, CELL, CELL) !== 'water') continue;
        expect(isWater(px * CELL, pz * CELL)).toBe(true);
      }
    }
  });

  it('뭍 파셀은 어느 귀퉁이도 물이 아니다', () => {
    const h = CELL / 2;
    for (let px = -25; px <= 25; px++) {
      for (let pz = -25; pz <= 25; pz++) {
        if (parcelWater(px, pz, CELL, CELL) !== 'dry') continue;
        for (const [dx, dz] of [[-h, -h], [h, -h], [-h, h], [h, h]] as const) {
          expect(isWater(px * CELL + dx, pz * CELL + dz)).toBe(false);
        }
      }
    }
  });

  it('강을 건너면 물가 → 물 → 물가 순으로 지난다', () => {
    // 강 중심선을 가로지르는 한 줄을 훑어 분류가 이어지는지 본다. 중간에 'dry' 가
    // 끼면 강이 끊긴 것이다.
    const px = 3;
    const cz = riverCenterZ(px * CELL);
    const start = Math.floor((cz - 90) / CELL);
    const end = Math.ceil((cz + 90) / CELL);
    const seq: string[] = [];
    for (let pz = start; pz <= end; pz++) {
      const c = parcelWater(px, pz, CELL, CELL);
      if (seq[seq.length - 1] !== c) seq.push(c);
    }
    // dry … (shore) water (shore) … dry — 중간에 물이 한 덩어리로 있어야 한다
    const waterRuns = seq.filter((c) => c === 'water').length;
    expect(waterRuns).toBe(1);
    expect(seq[0]).toBe('dry');
    expect(seq[seq.length - 1]).toBe('dry');
  });
});

describe('수면 높이', () => {
  it('지면보다 낮다 — 육지가 물을 덮는다', () => {
    // 지면은 y=0 에 두께 0.1 로 깔린다. 수면이 그보다 높으면 뭍에서도 물이 보인다.
    expect(SEA_Y).toBeLessThan(-0.1);
  });
});
