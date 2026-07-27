// 미니맵 판정 테스트.
//
// 미니맵은 **지형 판정을 다시 계산해서** 그린다 — 렌더가 만든 것을 읽는 게 아니다.
// 그래서 눈앞의 지형과 지도가 어긋날 수 있고, 그건 지도를 아예 안 그리는 것보다 나쁘다.
// 여기서 두 계산이 같은 답을 내는지 못 박는다.

import { describe, it, expect } from 'vitest';
import { mapCells, nearestLandmark } from '../frontend/js/world2/decide/minimap.js';
import { roadDirs } from '../frontend/js/world2/parts/road-topology.js';
import { plazaLandmark } from '../frontend/js/world2/parts/plaza.js';
import { parcelWater } from '../frontend/js/world2/decide/water.js';

const CELL = 32;

describe('mapCells — 지도와 지형이 같은 답을 낸다', () => {
  it('(2r+1)² 칸을 빠짐없이 낸다', () => {
    for (const r of [1, 3, 7]) {
      expect(mapCells(0, 0, r, CELL, CELL)).toHaveLength((2 * r + 1) ** 2);
    }
  });

  // 지도가 자기만의 지형 계산을 갖기 시작하면 눈앞과 어긋난다. 같은 SSOT 를 보는지 본다.
  it('길·물·랜드마크가 지형 판정과 일치한다', () => {
    for (const c of mapCells(5, -3, 5, CELL, CELL)) {
      expect(c.dirs).toEqual(roadDirs(c.px, c.pz));
      expect(c.water).toBe(parcelWater(c.px, c.pz, CELL, CELL));
      expect(c.landmark).toBe(plazaLandmark(c.px, c.pz));
    }
  });

  it('중심이 실제로 가운데다', () => {
    const cells = mapCells(4, 9, 3, CELL, CELL);
    const mid = cells[Math.floor(cells.length / 2)];
    expect([mid.px, mid.pz]).toEqual([4, 9]);
  });

  // 렌더는 far 76.8m 까지만 그리는데 지도는 그보다 넓어야 쓸모가 있다. 지형이 순수
  // 함수라 아직 로드되지 않은 파셀도 물어보면 답이 나온다 — 그게 이 설계의 이득이다.
  it('렌더 반경 밖도 답한다 — 지도가 로드된 범위에 매이지 않는다', () => {
    const far = mapCells(0, 0, 7, CELL, CELL).filter(
      (c) => Math.hypot(c.px * CELL, c.pz * CELL) > 76.8,
    );
    expect(far.length).toBeGreaterThan(100);
  });
});

describe('nearestLandmark — 방향과 거리', () => {
  it('반경 안에 랜드마크가 있으면 찾는다', () => {
    // 랜드마크가 있는 좌표를 하나 찾아 그 근처에서 물어본다
    let found: { px: number; pz: number } | null = null;
    for (let px = 0; px < 40 && !found; px++) {
      for (let pz = 0; pz < 40 && !found; pz++) {
        if (plazaLandmark(px, pz)) found = { px, pz };
      }
    }
    expect(found).not.toBeNull();
    const near = nearestLandmark(found!.px * CELL, found!.pz * CELL, 3, CELL, CELL);
    expect(near).not.toBeNull();
    expect(near!.dist).toBeLessThan(1e-6); // 바로 그 자리
  });

  it('방위각이 실제 방향과 맞다', () => {
    // 랜드마크 한 곳을 찾아 남쪽에서 바라본다 → 북쪽(0 라디안 근처)을 가리켜야 한다
    let found: { px: number; pz: number } | null = null;
    for (let px = 0; px < 40 && !found; px++) {
      for (let pz = 0; pz < 40 && !found; pz++) {
        if (plazaLandmark(px, pz)) found = { px, pz };
      }
    }
    const from = { x: found!.px * CELL, z: found!.pz * CELL + 64 }; // 두 칸 남쪽
    const near = nearestLandmark(from.x, from.z, 4, CELL, CELL);
    expect(near).not.toBeNull();
    expect(Math.abs(near!.bearing)).toBeLessThan(0.01); // 북쪽 = 0
    expect(near!.dist).toBeCloseTo(64, 0);
  });

  it('반경 안에 하나도 없으면 null', () => {
    // 반경 0 이면 자기 칸만 보는데, 그 칸이 광장이 아니면 null 이어야 한다
    let plain: { px: number; pz: number } | null = null;
    for (let px = 0; px < 20 && !plain; px++) {
      for (let pz = 0; pz < 20 && !plain; pz++) {
        if (!plazaLandmark(px, pz)) plain = { px, pz };
      }
    }
    expect(nearestLandmark(plain!.px * CELL, plain!.pz * CELL, 0, CELL, CELL)).toBeNull();
  });

  it('더 가까운 쪽을 고른다', () => {
    // 넓은 반경에서 찾은 것이, 좁혀도 나오면 같아야 한다(가장 가까운 것은 하나뿐이다)
    for (const [x, z] of [[0, 0], [300, -200], [-500, 700]] as const) {
      const wide = nearestLandmark(x, z, 7, CELL, CELL);
      if (!wide) continue;
      const narrow = nearestLandmark(x, z, 7, CELL, CELL);
      expect(narrow!.dist).toBeCloseTo(wide.dist, 6);
      expect(narrow!.kind).toBe(wide.kind);
    }
  });
});
