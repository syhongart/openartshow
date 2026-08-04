// `?at=river` / `?at=sea` — **좌표가 아니라 뜻을 고정한다.**
//
// ── 감독 지시 2026-08-04 ────────────────────────────────────────────────────
// *"링크로 강 또는 바다로 한번에 갈수있어?"*
//
// 물을 고칠 때마다 감독이 스폰에서 물가까지 걸어가야 했다. 확인이 번거로우면 확인이
// 덜 일어나고, 실기기 육안은 헤드리스가 못 보는 축의 **유일한** 판정 수단이라 그
// 병목이 특히 비싸다.
//
// ── 이 검사가 막는 것 ──────────────────────────────────────────────────────
// 좌표를 상수로 박았다면 `riverCenterZ` 나 격자가 바뀌는 날 **스폰이 물속이 된다.**
// 그것도 조용히 — 링크를 눌러 봐야 안다. 그래서 구현은 `parcelWater` 에 물어보며
// 찾고, 이 파일은 **찾은 결과가 실제로 설 수 있는 자리인지** 본다.

import { describe, it, expect } from 'vitest';
import { spawnFor, SPAWN_SPOTS } from '../frontend/js/world2/decide/spawn-spot.js';
import { parcelWater, isRiver, RIVER_HALF } from '../frontend/js/world2/decide/water.js';
import { SPAWN, GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z } from '../frontend/js/world2/decide/grid.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';

const { cellX, cellZ } = DEFAULT_LAYOUT;
const at = (spot: 'default' | 'river' | 'sea') => spawnFor(spot, cellX, cellZ);
const parcelOf = (p: { x: number; z: number }) => ({
  px: Math.round(p.x / cellX),
  pz: Math.round(p.z / cellZ),
});

describe('링크로 물가에 바로 선다', () => {
  it('★ 기본값은 옛 스폰 그대로다 — 링크를 안 붙이면 아무것도 안 바뀐다', () => {
    // 이게 깨지면 **모든 방문자의 시작 위치가 바뀐다.** 라이브 회귀다.
    expect(at('default')).toEqual({ x: SPAWN.x, z: SPAWN.z });
  });

  it('★ 강가·바닷가 둘 다 실제로 물가(shore) 칸이다 — 물속이나 허공이 아니다', () => {
    for (const spot of ['river', 'sea'] as const) {
      const { px, pz } = parcelOf(at(spot));
      expect(parcelWater(px, pz, cellX, cellZ), `${spot} 가 물가가 아니다`).toBe('shore');
    }
  });

  it('★ 두 곳이 서로 다르다 — 같으면 노브가 둘 중 하나를 못 찾은 것이다', () => {
    expect(at('river')).not.toEqual(at('sea'));
  });

  it('강가는 실제로 강 옆이다 — 한 칸 안쪽이 강물이다', () => {
    const { px, pz } = parcelOf(at('river'));
    // 네 이웃 중 하나는 강이어야 한다(`shore` 의 정의가 "이웃이 물" 이지만,
    // 그 물이 **강**인지 바다인지는 구별해야 한다).
    const touchesRiver = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .some(([dx, dz]) => isRiver((px + dx) * cellX, (pz + dz) * cellZ, cellZ));
    expect(touchesRiver, '강가라는데 이웃에 강이 없다').toBe(true);
  });

  it('바닷가는 격자 가장자리다 — 격자 밖이 곧 바다다', () => {
    const { px, pz } = parcelOf(at('sea'));
    const onEdge = px === GRID_MIN_X || px === GRID_MAX_X || pz === GRID_MIN_Z || pz === GRID_MAX_Z;
    expect(onEdge, `바닷가가 가장자리가 아니다 (px=${px}, pz=${pz})`).toBe(true);
  });

  it('강가가 강 폭 안쪽으로 들어가지 않는다 — 들어가면 물에 빠진 채 시작한다', () => {
    const p = at('river');
    expect(Math.abs(p.z - riverZAt(p.x)), '강 중심에서 강 반폭 안이다')
      .toBeGreaterThanOrEqual(RIVER_HALF);
  });

  it('두 이름 다 격자 안이다 — 밖이면 지면이 없다', () => {
    for (const spot of ['river', 'sea'] as const) {
      const { px, pz } = parcelOf(at(spot));
      expect(px, `${spot} px`).toBeGreaterThanOrEqual(GRID_MIN_X);
      expect(px, `${spot} px`).toBeLessThanOrEqual(GRID_MAX_X);
      expect(pz, `${spot} pz`).toBeGreaterThanOrEqual(GRID_MIN_Z);
      expect(pz, `${spot} pz`).toBeLessThanOrEqual(GRID_MAX_Z);
    }
  });

  it('노브 목록에 기본값이 들어 있다 — 빠지면 `readEnum` 이 기본값을 거른다', () => {
    expect(SPAWN_SPOTS).toContain('default');
  });
});

/** 강 중심 z 를 실제 판정으로 되찾는다 — 상수를 다시 적지 않으려고 이분 탐색한다. */
function riverZAt(x: number): number {
  let lo = -1000;
  let hi = 1000;
  // `isRiver` 가 참인 구간의 가운데를 찾는다. 강은 z 방향으로 이어진 띠다.
  const zs: number[] = [];
  for (let z = lo; z <= hi; z += 2) if (isRiver(x, z, cellZ)) zs.push(z);
  if (!zs.length) return Infinity; // 이 x 에 강이 없으면 거리 판정이 무의미해진다
  return (zs[0] + zs[zs.length - 1]) / 2;
}
