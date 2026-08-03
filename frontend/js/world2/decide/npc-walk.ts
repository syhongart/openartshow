// 거리를 걷는 사람들의 **경로 판정.** 순수 함수만 — 씬도 치비도 모른다.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"일단 우리 치비 돌아다니게 해볼까? 월드 1처럼."*
//
// world1 의 NPC 는 **작품 앞에 선다**(`npc.js` 의 `getViewingPose`). 오픈월드에는 작품이
// 없으므로 그 행동 모델은 통째로 못 가져온다. 대신 이 세계에 이미 있는 구조를 쓴다 —
// **도로 격자**다.
//
// ── 왜 파셀 중심을 잇는가 ───────────────────────────────────────────────────
// 도로는 파셀 중심에서 네 방향으로 뻗은 십자다(`road-topology.ts`). 그러니 "파셀 중심에서
// 이웃 파셀 중심으로" 가 곧 **도로를 따라가는 것**이고, 교차로에서 방향을 고르는 것이
// 곧 길 찾기다. 별도의 경로망을 만들 필요가 없다.
//
// 이 방식의 좋은 점은 **자기완결**이다. 도로 격자가 바뀌면(슈퍼셀 병합 패턴을 조정하면)
// 사람들이 다니는 길도 저절로 따라간다. 경로를 따로 적어 두면 그때 둘이 어긋난다.
//
// ── 왜 순수 함수인가 ────────────────────────────────────────────────────────
// 걷기 판정에 난수가 들어가는데, 그 난수를 집행부가 쥐고 있으면 "왜 저 사람이 저기로
// 갔나" 를 재현할 수가 없다. 판정을 여기 몰아 두면 시드만 주고 테이블로 검사할 수 있다.

import { inGrid } from './grid.js';
import { parcelWater } from './water.js';
import { roadDirs, type Dir } from '../parts/road-topology.js';

/** 격자 좌표 한 칸 */
export interface Cell {
  px: number;
  pz: number;
}

/** 방향이 가리키는 이웃 칸. 여기가 `road-topology` 의 방향 이름과 좌표를 잇는 유일한 지점이다 */
export function stepOf(dir: Dir): Cell {
  if (dir === 'north') return { px: 0, pz: -1 };
  if (dir === 'south') return { px: 0, pz: 1 };
  if (dir === 'west') return { px: -1, pz: 0 };
  return { px: 1, pz: 0 };
}

/** 반대 방향 — "왔던 길" 을 알아보는 데 쓴다 */
export function opposite(dir: Dir): Dir {
  if (dir === 'north') return 'south';
  if (dir === 'south') return 'north';
  if (dir === 'west') return 'east';
  return 'west';
}

/**
 * 이 칸에서 **실제로 갈 수 있는** 방향들.
 *
 * 도로가 있다는 것만으로는 부족하다. 격자 밖이거나 물인 칸으로 이어지는 길은 세상의
 * 끝으로 가는 길이라 걸러야 한다 — 안 그러면 사람이 바다로 걸어 들어간다(플레이어가
 * 그렇게 되는 문제는 아직 남아 있지만, 여기서까지 같은 일이 벌어질 이유는 없다).
 */
export function walkableDirs(px: number, pz: number, cellX: number, cellZ: number): Dir[] {
  const out: Dir[] = [];
  for (const d of roadDirs(px, pz)) {
    const s = stepOf(d);
    const nx = px + s.px;
    const nz = pz + s.pz;
    if (!inGrid(nx, nz)) continue;
    if (parcelWater(nx, nz, cellX, cellZ) === 'water') continue;
    out.push(d);
  }
  return out;
}

/**
 * 다음에 갈 방향. 갈 곳이 없으면 `null`.
 *
 * ── 왔던 길을 피하는 이유 ──────────────────────────────────────────────────
 * 균등 추첨이면 교차로마다 1/4 확률로 되돌아간다. 그러면 사람이 한 블록을 왕복만 하다
 * 끝나서, 멀리서 보면 제자리에서 떠는 것처럼 보인다. 갈 곳이 있으면 되돌아가지 않는다.
 *
 * **막다른 길에서는 되돌아간다.** 그때까지 금지하면 갈 곳이 없어져 그 자리에 굳는다 —
 * 규칙을 예외 없이 만드는 쪽이 오히려 부자연스러워지는 자리다.
 */
export function nextDir(
  px: number,
  pz: number,
  from: Dir | null,
  rnd: () => number,
  cellX: number,
  cellZ: number,
): Dir | null {
  const all = walkableDirs(px, pz, cellX, cellZ);
  if (all.length === 0) return null;
  const back = from ? opposite(from) : null;
  const fwd = back ? all.filter((d) => d !== back) : all;
  const pick = fwd.length > 0 ? fwd : all;
  return pick[Math.floor(rnd() * pick.length) % pick.length];
}

/**
 * 진행 벡터를 **바라볼 각도(yaw)** 로 바꾼다.
 *
 * `yaw=0 → -Z` 관례다(world1 `world.js:1752` 계승). 여기 부호를 하나 틀리면 사람들이
 * 전부 뒤로 걷는다 — 그래서 식을 집행부에 두지 않고 여기 한 곳에 둔다. 차선 오프셋
 * (`decide/npc-lane.ts` 의 `rightOf`)이 이 각을 **입력으로 받으므로**, 관례가 두 곳에
 * 각각 적히면 사람이 오른쪽 대신 왼쪽으로 비켜서게 된다.
 *
 * 길이 0 이면 방향이 정의되지 않는다 — 그때는 각을 바꾸지 않아야 하므로 호출부가
 * 이전 값을 유지한다(여기서 0 을 돌려주면 도착할 때마다 북쪽을 본다).
 */
export function yawOf(dx: number, dz: number): number | null {
  const d = Math.hypot(dx, dz);
  if (d === 0) return null;
  return Math.atan2(-dx / d, -dz / d);
}

/**
 * 걸을 수 있는 칸인가 — 스폰과 재배치가 쓴다.
 *
 * 도로가 하나도 없는 칸은 제외한다. 그런 칸 한가운데 사람을 놓으면 갈 곳이 없어 그대로
 * 서 있게 되고, 그게 "돌아다니는" 것으로 안 보인다.
 */
export function isWalkable(px: number, pz: number, cellX: number, cellZ: number): boolean {
  if (!inGrid(px, pz)) return false;
  if (parcelWater(px, pz, cellX, cellZ) === 'water') return false;
  return walkableDirs(px, pz, cellX, cellZ).length > 0;
}

/**
 * 플레이어 주변에서 걸을 수 있는 칸을 고른다. 없으면 `null`.
 *
 * ── 왜 "주변" 인가 ─────────────────────────────────────────────────────────
 * 세계는 30×30 인데 안개가 시야를 닫는 거리(`decide/fog.ts`)는 그보다 훨씬 짧다. 그 밖의 사람은 **보이지도
 * 않으면서 비용만 낸다.** 치비 한 체가 드로우콜 45·삼각형 24,360 이라 그 낭비가 크다.
 *
 * 그래서 사람들을 플레이어 근처에 묶어 두고, 멀어지면 다시 앞쪽으로 데려온다. 세계
 * 전체에 인구를 뿌리는 것이 아니라 **보이는 범위에만 유지**하는 것이다. 걸어가면 계속
 * 사람을 만나므로 체감은 "도시에 사람이 산다" 쪽이고, 비용은 상한이 고정된다.
 *
 * `ring` 은 최소 거리다. 0 이면 플레이어가 선 칸에도 놓일 수 있어 눈앞에 사람이 튀어나온다.
 */
export function pickNearby(
  centerPx: number,
  centerPz: number,
  ring: number,
  reach: number,
  rnd: () => number,
  cellX: number,
  cellZ: number,
  taken?: ReadonlySet<string>,
): Cell | null {
  const cands = nearbyCells(centerPx, centerPz, ring, reach, cellX, cellZ, taken);
  if (cands.length === 0) return null;
  return cands[Math.floor(rnd() * cands.length) % cands.length];
}

/** 칸의 신원. 점유 집합의 유일한 표기 — 두 곳에서 다르게 만들면 안 맞는다 */
export function cellKey(px: number, pz: number): string {
  return `${px},${pz}`;
}

/**
 * 밴드 안에서 걸을 수 있는 칸 **전부**. `pickNearby` 가 고르는 후보와 같은 집합이다.
 *
 * 따로 뽑을 수 있게 한 이유: **몇 명을 세울 수 있는지 미리 알아야** 한다. 인원이
 * 후보보다 많으면 같은 칸에 겹쳐 태어나는데, 그 사실이 어디에도 안 나타난다.
 *
 * @param taken 이미 쓴 칸(`cellKey`). 스폰이 서로를 비켜 앉는 데 쓴다
 */
export function nearbyCells(
  centerPx: number,
  centerPz: number,
  ring: number,
  reach: number,
  cellX: number,
  cellZ: number,
  taken?: ReadonlySet<string>,
): Cell[] {
  const out: Cell[] = [];
  for (let dx = -reach; dx <= reach; dx++) {
    for (let dz = -reach; dz <= reach; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) < ring) continue;
      const px = centerPx + dx;
      const pz = centerPz + dz;
      if (taken?.has(cellKey(px, pz))) continue;
      if (isWalkable(px, pz, cellX, cellZ)) out.push({ px, pz });
    }
  }
  return out;
}

/**
 * 이 인원을 **겹치지 않게** 세우려면 밴드를 얼마나 넓혀야 하는가(셀).
 *
 * ── 왜 필요한가 (감독 지시 2026-08-03) ──────────────────────────────────────
 * *"사람을 백 명을 깔아줘. 그래야지 내가 확인 하지."*
 *
 * 스폰 밴드는 **안개 시작 안쪽**으로 묶여 있다(한 겹 링, 후보 평균 7.37칸). 그 안에
 * 100 명을 넣으면 한 칸에 열댓 명이 겹쳐 태어난다 — 확인하려고 늘린 인원이 확인을
 * 방해한다. 그래서 인원이 수용력을 넘으면 **필요한 만큼만** 넓힌다.
 *
 * 기하로 계산하지 않고 **실제로 세는** 이유: 밴드 칸 중 걸을 수 있는 비율은 격자
 * 패턴·물·경계에 따라 다르다. 비율을 가정하면 그 가정이 곧 미러링이 된다.
 *
 * ⚠ **인원이 많으면 안개 시작을 넘는다.** 안개 안에 든 칸 수가 유한하므로 피할 수
 * 없다. 이 함수는 "넓혀도 되는가" 를 판단하지 않고 **필요한 값을 돌려줄 뿐**이고,
 * 기본 인원에서는 `min` 이 그대로 나와 기존 동작이 유지된다(그 불변은 테스트가 본다).
 *
 * @param min 최소 reach. 인원이 적으면 이 값 그대로다(= 기존 동작)
 * @param max 안전 상한. 여기까지 넓혀도 모자라면 그냥 멈춘다 — 무한히 커지지 않는다
 */
export function reachFor(
  count: number,
  centerPx: number,
  centerPz: number,
  ring: number,
  min: number,
  max: number,
  cellX: number,
  cellZ: number,
): number {
  for (let r = min; r < max; r++) {
    if (nearbyCells(centerPx, centerPz, ring, r, cellX, cellZ).length >= count) return r;
  }
  return max;
}
