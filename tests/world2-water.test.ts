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
    // 표본 간격은 **강 폭보다 훨씬 촘촘해야** 한다. 예전엔 50m 간격에 ±600m 범위였는데,
    // 그건 섬이 반경 700m 이던 시절 값이다. 섬이 240m 로 줄자 표본이 37점으로 쪼그라들어
    // 물 몇 점 차이로 비율이 크게 튀었다 — 통과·실패가 표본 운에 달린 상태였다.
    // 간격 4m 면 섬 안 표본이 만 단위라 면적비에 수렴한다.
    let dry = 0, n = 0;
    for (let x = -ISLAND_R; x <= ISLAND_R; x += 4) {
      for (let z = -ISLAND_R; z <= ISLAND_R; z += 4) {
        if (x * x + z * z > ISLAND_R * ISLAND_R) continue;
        n++;
        if (!isWater(x, z)) dry++;
      }
    }
    expect(n).toBeGreaterThan(5000); // 표본이 성기면 아래 비율은 아무 뜻이 없다
    // 섬 안에서 강이 먹는 비율은 크지 않아야 한다 — 대부분이 뭍이어야 도시가 선다.
    expect(dry / n).toBeGreaterThan(0.8);
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

  it('강이 파셀 열을 실제로 적신다 — 반폭이 파셀 중심 간격의 절반보다 넓다', () => {
    // `parcelWater` 가 파셀 중심으로 판정하므로, 강 중심선에서 최근접 파셀 중심까지의
    // 최대 거리(= 셀의 절반)보다 반폭이 커야 그 칸이 물로 분류된다. 이 부등식을 어기면
    // 강이 지면에 덮여 통째로 사라진다.
    expect(RIVER_HALF).toBeGreaterThan(CELL / 2);
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

  it('뭍 파셀은 물에 바로 닿지 않는다 — 사이에 반드시 물가가 있다', () => {
    // 'dry' 와 'water' 가 맞닿으면 지면이 물가 처리 없이 뚝 끊긴다. 물가 한 줄이 항상
    // 사이에 끼는 것이 `parcelWater` 의 계약이다.
    for (let px = -12; px <= 12; px++) {
      for (let pz = -12; pz <= 12; pz++) {
        if (parcelWater(px, pz, CELL, CELL) !== 'dry') continue;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          expect(parcelWater(px + dx, pz + dz, CELL, CELL)).not.toBe('water');
        }
      }
    }
  });

  // ── 이 테스트가 예전에 강 끊김을 놓쳤다 ─────────────────────────────────────
  // 원래는 `px = 3` **한 열만** 훑었다. 강이 파셀 대각선을 비스듬히 지나는 구간에서만
  // 끊겼는데 하필 그 열이 아니어서 통과했고, 실제로 두 개의 x 열에 물 파셀이 하나도
  // 없었다. 한 표본의 통과는 성질의 증거가 아니다 — 강이 지나는 **모든** 열을 본다.
  it('강이 지나는 모든 열에 물 파셀이 있다 — 어디서도 끊기지 않는다', () => {
    const half = Math.ceil(ISLAND_R / CELL);
    const broken: number[] = [];
    for (let px = -half; px <= half; px++) {
      // 이 열이 섬 안에서 강과 만나는가 — 강 중심선이 섬 안에 있는 열만 본다
      const cz = riverCenterZ(px * CELL);
      if ((px * CELL) ** 2 + cz * cz > ISLAND_R * ISLAND_R) continue;
      let wet = 0;
      for (let pz = -half; pz <= half; pz++) {
        if (parcelWater(px, pz, CELL, CELL) === 'water') wet++;
      }
      if (wet === 0) broken.push(px);
    }
    expect(broken).toEqual([]);
  });

  it('강을 건너면 물가 → 물 → 물가 순으로 지난다', () => {
    // 강 중심선을 가로지르는 줄을 훑어 분류가 이어지는지 본다.
    //
    // 양 끝이 'dry' 인지는 보지 않는다 — 줄이 길면 섬 가장자리에 닿아 바다 물가가 되고,
    // 그건 강과 무관한 사실이다. 실제 계약은 **물이 한 덩어리이고 그 양옆이 물가**라는
    // 것이다. 물이 두 덩어리로 갈리면 중간에 지면이 끼어 강이 두 줄기로 보이고,
    // 물가 없이 뭍이 바로 붙으면 지면이 물에 뚝 끊긴다.
    for (const px of [-4, -3, -1, 0, 2, 4]) {
      const cz = riverCenterZ(px * CELL);
      const seq: string[] = [];
      for (let pz = Math.floor((cz - 80) / CELL); pz <= Math.ceil((cz + 80) / CELL); pz++) {
        const c = parcelWater(px, pz, CELL, CELL);
        if (seq[seq.length - 1] !== c) seq.push(c);
      }
      const at = seq.indexOf('water');
      expect(seq.filter((c) => c === 'water')).toHaveLength(1);
      expect(seq[at - 1]).toBe('shore');
      expect(seq[at + 1]).toBe('shore');
    }
  });
});

describe('수면 높이', () => {
  it('지면보다 낮다 — 육지가 물을 덮는다', () => {
    // 지면은 y=0 에 두께 0.1 로 깔린다. 수면이 그보다 높으면 뭍에서도 물이 보인다.
    expect(SEA_Y).toBeLessThan(-0.1);
  });
});
