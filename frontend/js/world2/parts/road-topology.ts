// world2/parts/road-topology.ts — 도로 위상. 순수 함수만, import 0.
//
// ── 풀어야 할 문제 ───────────────────────────────────────────────────────────
// 파셀은 **서로를 모른다.** 배치는 `(px,pz)` 만으로 계산되고, 이웃 파셀은 아직 로드되지
// 않았을 수도, 이미 언로드됐을 수도 있다("파라미터가 곧 공간" — 저장하지 않는다).
//
// 그런데 도로는 이어져야 한다. 내 파셀 동쪽 끝에서 길이 나가면 옆 파셀 서쪽 끝에서도
// 길이 들어와야 하고, 안 그러면 세상이 끊긴 길 조각으로 뒤덮인다.
//
// ── 해법: 경계를 파셀이 아니라 **경계 자신의 좌표**로 해시한다 ──────────────
// 두 파셀 사이의 경계를 유일한 좌표로 식별하면, 양쪽이 각자 계산해도 **같은 값**이 나온다.
// 이웃을 조회할 필요가 없다.
//
//   파셀 (px,pz) 의 동쪽 경계 = 파셀 (px+1,pz) 의 서쪽 경계 = `edgeX(px, pz)`
//   파셀 (px,pz) 의 남쪽 경계 = 파셀 (px,pz+1) 의 북쪽 경계 = `edgeZ(px, pz)`
//
// 각 경계가 "길이 지나는가"를 스스로 정하고, 파셀은 자기 네 경계를 물어보기만 한다.
//
// ── 왜 이 확률인가 ───────────────────────────────────────────────────────────
// 경계 활성 확률 0.6 일 때 활성 경계 수는 이항분포 B(4, 0.6) 을 따른다:
//
//   0개  2.6%   길 없는 구획 — 공원이나 큰 부지처럼 읽힌다
//   1개 15.4%   막다른 길
//   2개 34.6%   통과로(직선 또는 꺾임)
//   3개 34.6%   T 자
//   4개 13.0%   사거리
//
// 막다른 길이 15% 있는 것이 의도다. 전부 통과로면 격자무늬가 되고, 감독이 "바둑판 말고"
// 라고 한 것이 그 모습이다. 끊기고 꺾이는 길이 섞여야 도시로 읽힌다.

/** 32비트 해시. `decide/parcel-layout.ts` 의 것과 같은 알고리즘이되 소금이 다르다 */
function h2(a: number, b: number, salt: number): number {
  let h = salt >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x27d4eb2d);
  return (h ^ (h >>> 15)) >>> 0;
}

const SALT_X = 0x517cc1b7;
const SALT_Z = 0x27220a95;

/** 경계 활성 확률. 위 분포의 근거값이다 — 바꾸면 길의 성격이 통째로 바뀐다 */
export const EDGE_P = 0.6;

/** 파셀 (px,pz) 와 (px+1,pz) 사이 경계에 길이 지나는가 */
export function edgeX(px: number, pz: number, p: number = EDGE_P): boolean {
  return h2(px, pz, SALT_X) / 4294967296 < p;
}

/** 파셀 (px,pz) 와 (px,pz+1) 사이 경계에 길이 지나는가 */
export function edgeZ(px: number, pz: number, p: number = EDGE_P): boolean {
  return h2(px, pz, SALT_Z) / 4294967296 < p;
}

/** 파셀의 네 방향. 배열 순서가 곧 배치 순서다 */
export type Dir = 'north' | 'south' | 'west' | 'east';
export const DIRS: readonly Dir[] = ['north', 'south', 'west', 'east'];

/**
 * 이 파셀에서 길이 나가는 방향들.
 *
 * 북쪽은 `(px, pz-1)` 과의 경계이므로 `edgeZ(px, pz-1)` 을 본다 — **한 칸 뒤로 물러난
 * 좌표**다. 여기를 `edgeZ(px, pz)` 로 적으면 북쪽과 남쪽이 같은 값을 보게 되고, 길이
 * 항상 남북으로 관통하거나 아예 없는 세상이 된다.
 */
export function roadDirs(px: number, pz: number, p: number = EDGE_P): Dir[] {
  const out: Dir[] = [];
  if (edgeZ(px, pz - 1, p)) out.push('north');
  if (edgeZ(px, pz, p)) out.push('south');
  if (edgeX(px - 1, pz, p)) out.push('west');
  if (edgeX(px, pz, p)) out.push('east');
  return out;
}

/**
 * 도로가 차지하는 반폭(미터). 건물·나무가 이 안에 들어오면 길 위에 서게 된다.
 *
 * 조각 크기(`ROAD_SEG`)의 절반에 여유를 조금 얹는다 — 정확히 반폭으로 자르면 건물 벽이
 * 도로 경계선에 딱 붙어서, 인도 없이 차도에서 바로 벽이 서는 모습이 된다.
 */
export const ROAD_SEG = 8;
export const ROAD_HALF = ROAD_SEG / 2 + 1.5;

/**
 * 건물·나무·가로등이 물러서는 안쪽 경계(미터). **도로 판정(`ROAD_HALF`)보다 넓다.**
 *
 * 둘을 같은 값으로 쓰다가 갈랐다. `ROAD_HALF` 는 "여기가 길인가"를 답하는 값이고,
 * 셋백은 "여기까지는 안 짓는다"는 값이라 역할이 다르다. 같게 두면 건물 벽이 차도 끝에
 * 딱 붙어 서고 인도가 없다 — 디자이너가 "숨 쉴 곳이 없다"고 지적한 지점의 일부다.
 *
 * 7.0 = 도로 반폭 4 + 인도 3.
 */
export const SETBACK = 7;

/**
 * 파셀 안 좌표 `(x,z)`(중심 기준 오프셋)가 도로 위인가.
 *
 * 도로는 **중심에서 각 활성 방향으로 뻗은 십자**이므로, 그 축들 중 하나에 걸치면 도로다.
 * 방향이 하나도 없으면 이 파셀에 길이 없고, 그때는 어디든 지을 수 있다.
 *
 * 건물·나무·가로등이 이 함수를 보고 자리를 피한다. **파츠끼리 직접 참조하지 않는다** —
 * 서로를 import 하기 시작하면 파츠 하나를 빼는 순간 다른 파츠가 깨진다. 공용 판정을
 * 여기 두고 양쪽이 이것만 본다.
 */
export function onRoad(x: number, z: number, dirs: readonly Dir[]): boolean {
  if (dirs.length === 0) return false;
  // 중심 교차 패치 — 방향이 하나뿐(막다른 길)이어도 중심에는 길이 있다
  if (Math.abs(x) <= ROAD_HALF && Math.abs(z) <= ROAD_HALF) return true;
  for (const d of dirs) {
    if (d === 'north' && z < 0 && Math.abs(x) <= ROAD_HALF) return true;
    if (d === 'south' && z > 0 && Math.abs(x) <= ROAD_HALF) return true;
    if (d === 'west' && x < 0 && Math.abs(z) <= ROAD_HALF) return true;
    if (d === 'east' && x > 0 && Math.abs(z) <= ROAD_HALF) return true;
  }
  return false;
}

/**
 * 도로를 피해 자리를 고른다. **언제나 성공한다.**
 *
 * ── 왜 재시도 방식을 버렸나 ────────────────────────────────────────────────
 * 처음에는 "아무 데나 뽑고 도로면 다시 뽑기"를 네 번까지 하고 실패하면 그 부품을 건너뛰게
 * 했다. 실측에서 **건물이 1채인 파셀이 나왔다** — 사거리 파셀은 십자 도로가 넓이의 57% 를
 * 먹어서 네 번으로 모자란다. 시도를 늘려도 확률만 줄지 0이 되지 않고, 늘린 만큼 난수
 * 소비도 늘어 배치가 통째로 바뀐다.
 *
 * 대신 **도로가 아닌 영역에서 바로 뽑는다.** 도로는 중심에서 뻗은 십자이므로 그 여집합은
 * 네 사분면이고, 사분면 하나를 골라 그 안에서 균등 표집하면 재시도가 필요 없다.
 * 난수 소비도 항상 3개로 고정이다(사분면 · x · z).
 *
 * 길이 없는 파셀(2.6%)은 사분면으로 자르지 않는다 — 그러면 멀쩡한 땅 한가운데가 늘 비어
 * 도넛처럼 보인다.
 */
export function pickOffRoad(
  rnd: () => number,
  halfX: number,
  halfZ: number,
  dirs: readonly Dir[],
): { x: number; z: number } {
  const q = Math.floor(rnd() * 4);
  return pickInQuadrant(rnd, halfX, halfZ, dirs, q);
}

/**
 * 사분면을 **지정해서** 자리를 고른다. 난수는 두 개만 쓴다(x·z).
 *
 * 건물이 이걸 쓴다. `pickOffRoad` 는 사분면을 무작위로 고르므로 두 채가 같은 사분면에
 * 배정될 수 있고, 사분면 폭이 6.5m 인데 건물 폭이 3~8m 라 **겹친다.** 디자이너가
 * "붙어 선다"의 실체로 지목한 지점이다.
 *
 * 채수를 4 이하로 제한하고 사분면을 1:1로 나눠 주면 겹침이 **구조적으로** 사라진다 —
 * 충돌 판정도, 재시도도 필요 없다.
 *
 * 길이 없는 파셀은 안쪽 경계를 두지 않는다(사분면으로 나누기만 한다). 비켜설 도로가
 * 없는데 가운데를 비우면 땅이 도넛처럼 보인다.
 */
export function pickInQuadrant(
  rnd: () => number,
  halfX: number,
  halfZ: number,
  dirs: readonly Dir[],
  quad: number,
  /**
   * 사분면 안쪽 경계의 **하한**. 호출자가 자기 부품의 최대 반폭을 넘긴다.
   *
   * 길 없는 파셀에는 비켜설 도로가 없어 안쪽 경계가 0인데, 그러면 인접 사분면의 두
   * 부품이 중심선 근처에서 만나 **겹친다**(1024 파셀 표본에서 실제로 4건 나왔다).
   * 중심 거리가 `2 × inset` 이므로 `inset ≥ 최대 반폭` 이면 겹침이 사라진다.
   */
  minInset = 0,
): { x: number; z: number } {
  const u = rnd();
  const v = rnd();
  // 파셀이 셋백보다 좁으면(설정을 크게 바꾼 경우) 폭이 음수가 되므로 눌러 준다.
  const inset = dirs.length === 0 ? minInset : Math.max(SETBACK, minInset);
  const x0 = Math.min(inset, halfX);
  const z0 = Math.min(inset, halfZ);
  const sx = quad & 1 ? 1 : -1;
  const sz = quad & 2 ? 1 : -1;
  return {
    x: sx * (x0 + u * (halfX - x0)),
    z: sz * (z0 + v * (halfZ - z0)),
  };
}

/**
 * 사분면 0~3 을 섞어 돌려준다. 난수 3개 고정(Fisher-Yates 4원소).
 *
 * 건물을 사분면에 1:1로 나눌 때 쓴다. 섞지 않으면 첫 건물이 늘 같은 사분면에 서서
 * 도시 전체가 한쪽으로 쏠린 규칙성을 띤다.
 */
export function shuffledQuadrants(rnd: () => number): number[] {
  const q = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = q[i]; q[i] = q[j]; q[j] = t;
  }
  return q;
}
