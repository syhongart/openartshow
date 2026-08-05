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

import { parcelWater, isRiver, worldHalfExtent } from './water.js';
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

/** 물인 이웃이 있는 방향. `shore` 칸은 정의상 하나 이상 있다. 없으면 `null`. */
function waterDir(
  px: number, pz: number, cellX: number, cellZ: number,
): { dx: number; dz: number } | null {
  const dirs = [{ dx: 0, dz: -1 }, { dx: 0, dz: 1 }, { dx: -1, dz: 0 }, { dx: 1, dz: 0 }];
  for (const d of dirs) {
    if (parcelWater(px + d.dx, pz + d.dz, cellX, cellZ) === 'water') return d;
  }
  return null;
}

/**
 * **물 경계**에서 뭍 쪽으로 남기는 여유(m).
 *
 * **거리를 고르는 값이 아니다** — 목표는 "물가에 바짝" 이고, 이것은 경계에 정확히 서서
 * 부동소수 한 번에 물로 넘어가는 것만 피한다.
 *
 * 왜 유도값이 아닌가 — 유도할 근거가 **이 세계에 없다.** 팀장이 제시한 후보였던 플레이어
 * 충돌 반경은 world2 에 존재하지 않고(태스크 #182: 건물·나무·지형을 전부 통과한다),
 * 몸 반경은 아바타를 씬에서 실측하는 값이라 부팅 초기의 스폰 계산 시점에는 없다.
 * 1인칭이면 아바타 자체가 없다. 그래서 **거리를 고르지 않는 쪽**을 골랐다 —
 * 고르지 않으면 틀릴 값도 없다(감독 결정 2026-08-05, 팀장 판정 (ㄱ) 카메라 비의존).
 */
const EDGE_KEEP = 1;

/**
 * 칸 중심에서 물 방향으로 **실제 물에 닿기 직전**까지 민다.
 *
 * ⚠ 칸 **경계**까지 밀면 안 된다. 파셀은 32m 단위라 `shore` 로 분류된 칸도 그 일부는
 * 이미 물속이다 — 처음에 경계까지 밀었더니 `?at=river` 가 z=−79 로 가서 **강 안**
 * (경계 −72)에 들어갔고, 기존 테스트 *"강가가 강 폭 안쪽으로 들어가지 않는다 — 들어가면
 * 물에 빠진 채 시작한다"* 가 그것을 잡았다. 파셀 판정은 거칠고 물 경계는 연속이다.
 * **미는 기준은 연속 쪽이어야 한다.**
 *
 * 이분 탐색으로 뭍인 최대 지점을 찾는다 — 강 경계는 `wx` 에 따라 굽이치므로(`riverCenterZ`)
 * 공식을 여기 복사하지 않고 판정 함수에 직접 묻는다(값 미러링 회피).
 *
 * ⚠ `isWater` 를 쓰면 안 된다. 그것도 **파셀 해상도**다 — 안에서 좌표를 반올림해
 * `parcelWater` 에 묻는다(`waterSurfaceY`). 그리는 물이 파셀 단위이기 때문이고 그 자체는
 * 옳지만, 여기서 필요한 것은 **연속 강 경계**다. 파셀로 물으면 칸 안쪽 어디서나 같은
 * 답이 나와 미는 거리를 못 정한다 — 실제로 그래서 강 안 7m 까지 밀려 테스트가 잡았다.
 */
/**
 * 연속 좌표 기준 물 판정. 강은 `isRiver`(굽이침 포함), 바다는 세계 밖이다.
 * `isWater` 와 달리 파셀로 반올림하지 않는다 — 미는 거리를 정하려면 연속이어야 한다.
 */
function isWaterAt(wx: number, wz: number, cell: number): boolean {
  const half = worldHalfExtent(cell);
  if (Math.abs(wx) > half || Math.abs(wz) > half) return true;
  return isRiver(wx, wz, cell);
}

function pushToWaterEdge(
  cx: number, cz: number, dir: { dx: number; dz: number },
  cellX: number, cellZ: number,
): Spot {
  const span = dir.dx !== 0 ? cellX / 2 : cellZ / 2;
  let dry = 0;        // 중심 — 뭍이다(`shore` 판정의 전제)
  let wet = span;     // 칸 경계 — 물일 수 있다
  // 14회면 32m 구간이 2mm 까지 좁혀진다. 물에 안 닿는 쪽으로만 `dry` 를 옮긴다.
  for (let i = 0; i < 14; i++) {
    const mid = (dry + wet) / 2;
    if (isWaterAt(cx + dir.dx * mid, cz + dir.dz * mid, cellX)) wet = mid;
    else dry = mid;
  }
  const back = Math.max(0, dry - EDGE_KEEP);
  return { x: cx + dir.dx * back, z: cz + dir.dz * back };
}

/**
 * 기준점에서 가까운 순으로 물가 칸을 찾는다.
 *
 * 칸의 **중심이 아니라 물 쪽 경계 부근**을 돌려준다. 중심에 세웠더니 물이 실제로 보이는
 * 자리까지 16m 여서 "물가에 선다" 가 아니라 "물가 칸 한가운데 선다" 가 됐다 —
 * 부팀장이 화면을 직접 보고 확인했다(2026-08-04). 수치 검증은 "물 픽셀 13.44%" 로
 * 통과시켰는데, 비율은 물이 **있는가**를 재지 **얼마나 가까운가**를 재지 않는다.
 *
 * @param pick 후보 중 무엇을 고를지 — 강가와 바닷가는 **같은 `shore` 라서** 이 술어로
 *   가른다. 강은 세계 안쪽에 있고 바다는 격자 바깥이므로 경계까지의 거리로 갈린다.
 */
function nearestShore(
  fromPx: number, fromPz: number, cellX: number, cellZ: number,
  pick: (px: number, pz: number) => boolean,
): Spot | null {
  let bestPx = 0, bestPz = 0;
  let found = false;
  let bestD = Infinity;
  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      if (!isShore(px, pz, cellX, cellZ) || !pick(px, pz)) continue;
      const d = (px - fromPx) ** 2 + (pz - fromPz) ** 2;
      if (d < bestD) { bestD = d; bestPx = px; bestPz = pz; found = true; }
    }
  }
  if (!found) return null;
  const cx = bestPx * cellX;
  const cz = bestPz * cellZ;
  const dir = waterDir(bestPx, bestPz, cellX, cellZ);
  // 물 이웃을 못 찾으면 중심에 선다 — `shore` 정의상 있어야 하지만, 판정이 바뀌는 날
  // 물속으로 미는 것보다 안 미는 편이 안전하다.
  if (!dir) return { x: cx, z: cz };
  return pushToWaterEdge(cx, cz, dir, cellX, cellZ);
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
