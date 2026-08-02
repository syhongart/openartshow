// world2/parts/zoning.ts — **용도 지대 판정. 순수 함수만.**
//
// ── 왜 생겼나 ────────────────────────────────────────────────────────────────
// 감독 지시 2026-08-02: 대도시의 스카이라인을 원한다.
//
// 그런데 이 세계에는 **"이 파셀이 무슨 용도인가" 를 정하는 층이 없었다.** 물인지
// (`decide/water.ts`), 광장인지(`plaza.ts`), 길이 어디로 나는지(`road-topology.ts`)만
// 있고 나머지는 각 파츠가 자기 자리를 스스로 뽑았다. 그래서 도시가 **어디나 똑같다** —
// 중심이 없고, 밀도 차가 없고, 걸어도 "여기가 어디쯤인지" 를 알 수 없다.
//
// 디자이너 진단(2026-08-02)이 이 지점을 짚었다: *"스카이라인이 평평한 건 건물 형태가
// 아니라 높이 상한과 배치 확률 때문이다."* 형태를 아무리 다듬어도 **도심이 없으면**
// 스카이라인이 안 생긴다. 그래서 형태보다 이것이 먼저다.
//
// ── 판정이지 배치가 아니다 ───────────────────────────────────────────────────
// `plaza.ts` 와 같은 자리에 둔다. 이 사실을 여러 파츠가 소비한다 — 고층 타워는 여기에
// 서고, 일반 건물은 여기를 피한다. 파츠마다 따로 정하면 두 판정이 어긋나 같은 파셀에
// 둘 다 서거나 둘 다 안 선다.
//
// ── `decide/` 가 아니라 `parts/` 인 이유 ─────────────────────────────────────
// **전례를 따른 것이다.** `plaza.ts` 가 이미 같은 성격의 순수 판정(`isPlaza`)을
// `parts/` 에 두고 있다 — 도로 위상을 소비해 "이 파셀이 무엇인가" 를 답하고, 그 답을
// 파츠 여럿이 함께 본다. 이 파일이 하는 일이 정확히 그것이다.
//
// 처음엔 여기에 "`decide/` 에 두면 decide → parts 방향 import 가 새로 생긴다" 고
// 적었다. **사실이 아니었다**(검수관 R1 2026-08-02) — `decide/parcel-slots.ts` 가 이미
// `parts/road-topology.js` 를, `decide/parcel-layout.ts` 가 `parts/index.js` 를
// import 한다. 그 방향은 이 파일 이전부터 있었다.
//
// 결론(`parts/` 에 둔 것)은 그대로 두되 근거를 고친다. 틀린 선례 주장이 코드에 남으면
// 다음 사람이 그것을 아키텍처 사실로 믿고 판단한다 — 주석은 읽히므로 틀리면 퍼진다.

import { roadDirs } from './road-topology.js';
import { isPlaza, h2 } from './plaza.js';
import { isCentralPlaza } from '../decide/grid.js';
import { parcelWater } from '../decide/water.js';

/**
 * 도심 반경(파셀). 중앙 광장에서 이 거리 안이 도심이다.
 *
 * 6 파셀 = 192m. 세계가 30×30(960m) 이므로 **한 변의 40%** 가 도심이다. 이보다 좁으면
 * 도심이 광장 몇 칸 수준이라 "지구" 로 안 읽히고, 넓으면 도심 아닌 곳이 없어져 대비가
 * 사라진다.
 *
 * 체비쇼프 거리(`max(|px|,|pz|)`)를 쓴다 — 격자가 사각형이므로 도심도 사각형이어야
 * 블록 경계와 어긋나지 않는다. 원형으로 자르면 모서리 파셀만 애매하게 반쯤 걸린다.
 */
export const DOWNTOWN_R = 6;

/**
 * 고층 타워 확률. **도심 안과 밖이 다르다** — 이 차이가 곧 스카이라인의 형태다.
 *
 * ── 이 값들은 아직 실측되지 않았다 (정직하게) ───────────────────────────────
 * 디자이너가 제안한 시작값이고, `PLAZA_P` 처럼 "최근접 거리 중앙값" 을 실측해 고른 것이
 * **아니다.** 광장은 601×601 격자에 400지점을 샘플링해 안개 가시거리와 비교했는데
 * (`plaza.ts` 의 `PLAZA_P` 주석), 타워는 그 작업을 아직 안 했다.
 *
 * 대신 **테스트가 분포를 못 박는다**(`tests/world2-zoning.test.ts`) — 도심 밀도가 외곽의
 * 몇 배인지, 도심에서 타워끼리 얼마나 떨어져 있는지를 단언한다. 값을 바꾸면 그 단언이
 * 깨지므로, 바꿀 때 "무엇이 달라지는지" 를 보고 바꾸게 된다.
 */
export const TOWER_P_CORE = 0.12;
/** 도심 밖. 0 이 아닌 것은 의도다 — 외따로 선 타워 하나가 도시의 끝을 알려준다 */
export const TOWER_P_OUTER = 0.01;

const SALT_TOWER = 0x7f4a7c15;

/** 중앙 광장 기준 체비쇼프 거리가 `DOWNTOWN_R` 이하인가 */
export function isDowntown(px: number, pz: number): boolean {
  return Math.max(Math.abs(px), Math.abs(pz)) <= DOWNTOWN_R;
}

/**
 * 이 파셀에 고층 타워가 서는가.
 *
 * 배제 조건이 셋이고 **전부 이유가 다르다**:
 *   · 광장 — 트인 곳이 목적인 자리다. 거기 60m 짜리를 세우면 광장이 아니다
 *   · 길 없음 — 갈 수 없는 랜드마크는 랜드마크가 아니다(`isPlaza` 와 같은 논리)
 *   · 물 아님 — 일반 건물은 이 검사가 없어 물가에 설 여지가 남아 있다
 *     (`decide/water.ts` 가 "셋백 미구현" 이라고 스스로 적어둔 자리다). 타워는 덩치가
 *     훨씬 크므로 그 여지를 물려받지 않는다
 *
 * @param cellX 파셀 가로(m) — 물 판정에 필요하다
 * @param cellZ 파셀 세로(m)
 */
export function isTowerParcel(px: number, pz: number, cellX: number, cellZ: number): boolean {
  if (isCentralPlaza(px, pz)) return false;
  if (isPlaza(px, pz)) return false;
  if (roadDirs(px, pz).length === 0) return false;
  if (parcelWater(px, pz, cellX, cellZ) !== 'dry') return false;
  const p = isDowntown(px, pz) ? TOWER_P_CORE : TOWER_P_OUTER;
  return h2(px, pz, SALT_TOWER) / 4294967296 < p;
}
