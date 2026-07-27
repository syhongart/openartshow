// world2/decide/water.ts — 어디가 물인가. 순수 함수만, import 0.
//
// ── 이 파일이 SSOT 인 이유 ───────────────────────────────────────────────────
// 물이라는 사실을 **두 계층이 함께 소비한다**:
//
//   · 수면 렌더(`features/ocean.ts`) — 물을 그린다
//   · 파셀 배치(`parts/*.ts`)        — 물을 피한다
//
// 두 곳에 따로 적으면 강 경로를 바꿨을 때 한쪽만 따라오고, 증상은 **건물이 물 위에 서는**
// 것으로 나타난다. 이 프로젝트가 값 미러링으로 이미 세 번 겪은 형태라(캔버스 색 vs 상수 ·
// 구름 고도 두 곳 · 테스트 임계값), 팀장이 바다를 승인하며 조건으로 건 것도 이 구조다.
//
// 도로가 `parts/road-topology.ts` 를 SSOT 로 두고 네 파츠가 그것만 보는 것과 같은 배치다.
//
// ── 지형: 섬 하나 + 그것을 가로지르는 강 ────────────────────────────────────
// 감독 확정. 반경 밖은 바다(세계의 끝), 강이 도시를 가로질러 그 바다로 흘러나간다.
//
// 수면은 **하나의 평면**이다(`y = SEA_Y`). 육지 파셀이 지면(`y = 0`)으로 그 위를 덮고,
// 물인 파셀은 지면을 안 그려서 아래 수면이 드러난다. 바다와 강을 따로 만들 필요가 없고
// 드로우콜도 하나면 된다 — world1 이 쓰던 방식과 같다.

/** 수면 높이(미터). 지면이 y=0 이므로 그보다 낮아야 육지가 물을 덮는다 */
export const SEA_Y = -1.2;

/** 섬 반경(미터). 이 밖은 전부 바다다 */
export const ISLAND_R = 700;

/**
 * 강 중심선. x 를 따라 흐르고 z 가 굽이친다.
 *
 * 사인파 **둘**을 겹친다. 하나면 규칙적인 물결이라 인공물처럼 보이고, 주기가 다른 둘을
 * 더하면 되풀이 주기가 최소공배수로 밀려나 눈에 안 띈다. 도로에서 "바둑판 말고"를 풀 때와
 * 같은 문제이고 같은 해법이다.
 *
 * 진폭 합이 130m — 파셀 4개분이라 도시를 가로지르며 눈에 띄게 휜다.
 */
export function riverCenterZ(wx: number): number {
  return 90 * Math.sin(wx / 420) + 40 * Math.sin(wx / 170 + 1.3);
}

/**
 * 강 반폭(미터). 파셀(32m)보다 넓게 잡는다.
 *
 * 좁으면 강이 지나는 파셀이 한 줄도 안 생기는 구간이 나온다 — 지면은 파셀 한 칸을 통째로
 * 덮는 판이라 "파셀의 절반만 물" 을 표현할 수 없기 때문이다. 반폭 24m(폭 48m)면 어느
 * 구간에서도 최소 한 파셀 열이 물로 판정된다.
 */
export const RIVER_HALF = 24;

/** 월드 좌표가 물인가. **이 함수가 유일한 답이다.** */
export function isWater(wx: number, wz: number): boolean {
  if (wx * wx + wz * wz > ISLAND_R * ISLAND_R) return true;  // 섬 밖 = 바다
  return Math.abs(wz - riverCenterZ(wx)) < RIVER_HALF;        // 강
}

/**
 * 파셀이 물과 어떤 관계인가.
 *
 *   'dry'   — 뭍이다. 평소대로 짓는다
 *   'shore' — 물가다. 지면은 그리되 부품은 물 쪽을 피한다
 *   'water' — 물이다. 지면도 부품도 없다
 *
 * 파셀 네 귀퉁이와 중심 다섯 점을 본다. 전부 물이면 'water', 하나도 아니면 'dry',
 * 섞이면 'shore' 다. 다섯 점은 **정확한 판정이 아니라 분류**다 — 강이 파셀 모서리만
 * 스치는 경우를 놓칠 수 있으나, 그때는 물이 파셀 넓이의 몇 %라 지면으로 덮여도 티가 나지
 * 않는다. 정확도를 올리려면 표본을 늘리면 되고, 그 비용은 파셀 로드마다 몇 번의 sin 이다.
 */
export type WaterClass = 'dry' | 'shore' | 'water';

export function parcelWater(px: number, pz: number, cellX: number, cellZ: number): WaterClass {
  const ox = px * cellX;
  const oz = pz * cellZ;
  const hx = cellX / 2;
  const hz = cellZ / 2;
  let wet = 0;
  // 중심 + 네 귀퉁이
  if (isWater(ox, oz)) wet++;
  if (isWater(ox - hx, oz - hz)) wet++;
  if (isWater(ox + hx, oz - hz)) wet++;
  if (isWater(ox - hx, oz + hz)) wet++;
  if (isWater(ox + hx, oz + hz)) wet++;
  if (wet === 0) return 'dry';
  if (wet === 5) return 'water';
  return 'shore';
}
