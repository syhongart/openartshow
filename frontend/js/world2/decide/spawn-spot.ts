// 어디서 시작할 것인가 — **좌표가 아니라 이름으로** 고른다.
//
// ── 감독 지시 2026-08-04 ────────────────────────────────────────────────────
// *"링크로 강 또는 바다로 한번에 갈수있어?"*
//
// 물을 고칠 때마다 감독이 스폰에서 강이나 바다까지 걸어가야 했다. 확인 자체가 일이 되면
// 확인이 덜 일어나고, 그러면 **실기기 판정이 병목이 된다** — 이 저장소에서 실기기 육안은
// 헤드리스가 못 보는 축의 유일한 판정 수단이라 그 병목이 특히 비싸다.
//
// ── 왜 좌표 노브(`?x=&z=`)가 아니라 이름인가 ────────────────────────────────
// 좌표를 쓰면 감독이 숫자를 외워야 하고, 격자나 강이 옮겨지면 그 숫자가 **조용히**
// 엉뚱한 곳을 가리킨다. 이름은 "강가" 라는 **뜻**을 고정하고 좌표는 매번 유도한다.
//
// ── 값을 적지 않고 찾는다 ──────────────────────────────────────────────────
// 강 좌표를 상수로 박으면 `riverCenterZ` 가 바뀌는 날 스폰이 물속이 된다(값 미러링).
// 그래서 **판정 함수에 물어보며 훑는다** — `parcelWater` 가 이 세계에서 물/물가/뭍을
// 가르는 SSOT 이고, 여기서는 그것을 소비만 한다.

import { parcelWater } from './water.js';
import { GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z, SPAWN } from './grid.js';

/** `?at=` 이 받는 값. `default` 는 기존 스폰 그대로다. */
export const SPAWN_SPOTS = ['default', 'river', 'sea'] as const;
export type SpawnSpot = (typeof SPAWN_SPOTS)[number];

export interface Spot { x: number; z: number }

/**
 * 물가에 설 수 있는 칸인가. `shore` 는 "자기는 뭍인데 이웃이 물" 인 칸이라
 * **물을 코앞에서 보면서 발은 젖지 않는** 자리다 — 정확히 우리가 원하는 것이다.
 */
function isShore(px: number, pz: number, cellX: number, cellZ: number): boolean {
  return parcelWater(px, pz, cellX, cellZ) === 'shore';
}

/**
 * 기준점에서 가까운 순으로 물가 칸을 찾는다.
 *
 * @param pick 후보 중 무엇을 고를지 — 강가와 바닷가는 **같은 `shore` 라서** 이 술어로
 *   가른다. 강은 세계 안쪽에 있고 바다는 격자 바깥이므로 경계까지의 거리로 갈린다.
 */
function nearestShore(
  fromPx: number, fromPz: number, cellX: number, cellZ: number,
  pick: (px: number, pz: number) => boolean,
): Spot | null {
  let best: Spot | null = null;
  let bestD = Infinity;
  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      if (!isShore(px, pz, cellX, cellZ) || !pick(px, pz)) continue;
      const d = (px - fromPx) ** 2 + (pz - fromPz) ** 2;
      if (d < bestD) { bestD = d; best = { x: px * cellX, z: pz * cellZ }; }
    }
  }
  return best;
}

/** 격자 가장자리에서 몇 칸 안쪽인가. 바다는 격자 **밖**이므로 이 값이 작을수록 바닷가다. */
function edgeDistance(px: number, pz: number): number {
  return Math.min(px - GRID_MIN_X, GRID_MAX_X - px, pz - GRID_MIN_Z, GRID_MAX_Z - pz);
}

/**
 * 이름 → 좌표. **찾지 못하면 기본 스폰으로 떨어진다** — 물속이나 허공에 세우느니
 * 아무 일도 안 하는 편이 낫다(판정이 바뀌어 물가가 사라지는 날이 올 수 있다).
 *
 * 강가와 바닷가를 가르는 기준: 바다는 격자 **밖**이라 바닷가 `shore` 는 가장자리에
 * 붙어 있고, 강은 세계 **안**을 가로지르므로 강가는 가장자리에서 멀다. 그 사이를
 * `edgeDistance` 한 칸으로 가른다 — 두 물이 만나는 하구에서는 둘 다 참일 수 있는데,
 * 그때는 `from` 에서 **가까운 쪽**이 이긴다(강은 스폰 앞이라 자연히 강이 잡힌다).
 */
export function spawnFor(spot: SpawnSpot, cellX: number, cellZ: number): Spot {
  const fallback: Spot = { x: SPAWN.x, z: SPAWN.z };
  if (spot === 'default') return fallback;
  const fromPx = Math.round(SPAWN.x / cellX);
  const fromPz = Math.round(SPAWN.z / cellZ);
  const found = spot === 'sea'
    // 바다: 격자 가장자리 칸(밖이 곧 바다)
    ? nearestShore(fromPx, fromPz, cellX, cellZ, (px, pz) => edgeDistance(px, pz) === 0)
    // 강: 가장자리에서 떨어진 물가
    : nearestShore(fromPx, fromPz, cellX, cellZ, (px, pz) => edgeDistance(px, pz) > 0);
  return found ?? fallback;
}
