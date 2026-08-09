// world2/decide/minimap.ts — 미니맵에 무엇을 그릴지. 순수 판정만.
//
// ── world1 과 무엇이 다른가 ──────────────────────────────────────────────────
// world1 미니맵은 **세계 전체**를 그렸다. 고정 그리드(예: 9×9)라 지도 한 장에 다 들어갔고,
// 방문한 칸을 음영으로 표시해 "얼마나 돌아봤나" 를 보여줬다.
//
// world2 는 무한 스트리밍이라 전체가 없다. 대신 **플레이어 둘레를 잘라 낸다** — 종이 지도가
// 아니라 레이더에 가깝다.
//
// ── 로드된 파셀에 매이지 않는다 ─────────────────────────────────────────────
// 지형이 전부 순수 함수(`roadDirs` · `isPlaza` · `isWater`)로 정해지므로, 아직 로드되지
// 않은 파셀도 **물어보면 답이 나온다.** 그래서 미니맵 반경을 렌더 반경(far 76.8m)보다
// 훨씬 넓게 잡을 수 있다. 눈에 안 보이는 곳까지 지도에 뜨는 것이 지도의 쓸모다.
//
// 이건 "파라미터가 곧 공간" 이라는 규약이 뜻밖에 돌려준 이득이다. 세계를 저장했다면
// 미니맵도 저장된 범위만 그릴 수 있었다.

import { roadDirs, type Dir } from '../parts/road-topology.js';
import { isPlaza, plazaLandmark, type PlazaLandmark } from '../parts/plaza.js';
import { parcelWater, type WaterClass } from './water.js';
// 지도 반경을 격자에서 유도한다(`MAP_R_VISIBLE`).
import { GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z } from './grid.js';

/** 미니맵 한 칸(= 파셀 하나)에 그릴 것 */
export interface MapCell {
  px: number;
  pz: number;
  /** 이 파셀에서 길이 나가는 방향들. 비어 있으면 길 없는 구획 */
  dirs: readonly Dir[];
  water: WaterClass;
  /** 광장이면 무엇이 서 있는가. 광장이 아니면 null */
  landmark: PlazaLandmark | null;
  plaza: boolean;
}

/**
 * 플레이어 둘레 `(2r+1)²` 칸을 훑는다.
 *
 * 반경은 파셀 단위다. 7이면 15×15 = 225칸이고 실제 거리로는 ±224m — 렌더 반경(76.8m)의
 * 약 3배다. 지도에는 아직 안 보이는 곳이 떠야 갈 곳을 정할 수 있다.
 */
export function mapCells(centerPx: number, centerPz: number, r: number, cellX: number, cellZ: number): MapCell[] {
  const out: MapCell[] = [];
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const px = centerPx + dx;
      const pz = centerPz + dz;
      const plaza = isPlaza(px, pz);
      out.push({
        px, pz,
        dirs: roadDirs(px, pz),
        water: parcelWater(px, pz, cellX, cellZ),
        landmark: plaza ? plazaLandmark(px, pz) : null,
        plaza,
      });
    }
  }
  return out;
}

/**
 * 가장 가까운 랜드마크까지의 방향과 거리(미터).
 *
 * 지도에 점만 찍으면 화면 밖으로 나간 순간 잊힌다. 방향 표시가 있으면 "저쪽에 시계탑이
 * 있다" 는 정보가 지도를 안 보는 동안에도 남는다.
 *
 * 없으면 `null` — 반경 안에 하나도 없을 수 있다(광장은 52파셀에 하나다).
 */
export function nearestLandmark(
  wx: number, wz: number, r: number, cellX: number, cellZ: number,
): { kind: PlazaLandmark; dist: number; bearing: number } | null {
  const cpx = Math.round(wx / cellX);
  const cpz = Math.round(wz / cellZ);
  let best: { kind: PlazaLandmark; dist: number; bearing: number } | null = null;
  for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
      const px = cpx + dx;
      const pz = cpz + dz;
      const kind = plazaLandmark(px, pz);
      if (!kind) continue;
      const ex = px * cellX - wx;
      const ez = pz * cellZ - wz;
      const dist = Math.hypot(ex, ez);
      if (best && dist >= best.dist) continue;
      // 북쪽(-z)이 0, 시계 방향으로 증가. 화면 좌표계와 같은 방향이라 회전에 그대로 쓴다.
      best = { kind, dist, bearing: Math.atan2(ex, -ez) };
    }
  }
  return best;
}

/**
 * 지도 반경(파셀). **격자에서 유도한다** — 세계 끝이 언제나 지도 안에 들어온다.
 *
 * 감독 지시 *"월드2도 유한세계"* 가 지도에서 읽히려면 **끝이 보여야 한다.** 7(±224m)
 * 이었을 때는 어느 방향으로 가도 지도 끝까지 육지라 무한한 세계와 구분되지 않았다.
 *
 * ⚠️ **여기 `8` 이 적혀 있었고 근거는 "섬 반경이 240m 이므로" 였다**(2026-08-09 전수
 * 점검). 그 원형 섬(`ISLAND_R`)은 격자로 바뀌면서 **이미 사라진 개념**이다. world5 의
 * 세계 반경은 320m(10 파셀)이라 8 이면 ±256m — **지도에 바다가 안 나온다.** 즉 이 값이
 * 지키려던 바로 그 조건을 스스로 어긴 상태였고, 주석은 사라진 섬을 근거로 들고 있었다.
 *
 * 옛 주석은 *"`ISLAND_R / cell` 로 유도할 수도 있지만 섬이 커지면 칸이 작아져 길이 안
 * 읽히게 되므로 손으로 정하는 편이 정직하다"* 고 적었다. **유도를 피한 그 판단이 값을
 * 낡게 만들었다** — 정직한 쪽은 손으로 적는 것이 아니라, 무엇을 보장하는지를 산술로
 * 적고 그 보장이 깨지면 드러나게 두는 것이다.
 *
 * `+1` 은 세계 끝 바깥 한 줄을 뜻한다. 딱 맞추면 가장자리가 지도 테두리에 붙어 "끝" 인지
 * "잘린 것" 인지 구별되지 않는다 — 바다 한 줄이 보여야 끝으로 읽힌다.
 *
 * 세계가 아주 커지면 칸이 작아져 길이 안 읽히는 문제는 **그대로 남는다.** 그때는 크기가
 * 아니라 표현(전체 지도 / 확대 지도 전환)을 다시 정해야 한다.
 */
export const MAP_R_VISIBLE = Math.max(GRID_MAX_X + 1, -GRID_MIN_X, GRID_MAX_Z + 1, -GRID_MIN_Z) + 1;
