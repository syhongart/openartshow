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
import { isCentralPlaza, GRID_W, GRID_H } from '../decide/grid.js';
import { parcelWater } from '../decide/water.js';

// ══════════════════════════════════════════════════════════════════════════
// 도심 밀도 — **프리셋 하나로 묶는다** (팀장 판정 (다), 2026-08-09)
// ══════════════════════════════════════════════════════════════════════════
//
// ── 무엇이 잘못돼 있었나 ─────────────────────────────────────────────────────
// `DOWNTOWN_R = 6` 은 world2(30×30) 시절 리터럴이었고 주석은 *"세계가 30×30(960m)
// 이므로 한 변의 40%"* 라고 적고 있었다. world5 가 20×20 으로 줄면서 **값은 그대로인데
// 세계가 줄어** 도심이 18.8% → 42.3% 로 2.25배가 됐다. 같은 원인이 이번 회차에만
// 강 진폭·공원 배치·NPC 스폰 범위·미니맵 반경에서 났다 — 다섯 번째다.
//
// ── ★ 명목 비율은 거짓말한다 (팀장 조건 3, 실측으로 확인) ────────────────────
// 도심이 42.3% 라는 것은 **명목**이다. `isTowerParcel` 이 광장·물·길없음을 배제하고
// 공원에는 타워가 안 서므로, R=6 의 명목 169칸에서 실제로 타워가 설 수 있는 칸은 **89**
// 뿐이다(공원 20 · 광장 16 · 물/물가 44 를 뺀다). 실효는 22.3% 다.
//
// 그래서 **프리셋의 축은 면적 비율이 아니라 마천루 실측 개수**다. 비율만 보고 R 을 고르면
// 스카이라인이 몇 채로 서는지를 아무도 모른 채 값이 정해진다 — 실제로 브리프에 적은
// 기댓값(R=4 에서 9.7기)이 배제 조건을 안 뺀 값이라 **틀렸고, 실측은 3기였다.**
//
// ── 실측표 (격자 20×20, 기본 레이아웃) ──────────────────────────────────────
//
//   share   R   실효 도심   마천루   비고
//   0.19    4      34         3      P_CORE 0.12 — 도심이 좁고 마천루가 드물다
//   0.19    4      34         8      P_CORE 0.24 — **기본**. 현행 마천루 수를 보존한다
//   0.19    4      34        10      P_CORE 0.30
//   0.42    6      89         8      P_CORE 0.12 — 현행(축소 미반영). 도심만 넓다
//   0.42    6      89        15      P_CORE 0.20
//
// **R 을 줄이면서 확률을 함께 올리는 것이 "축소를 따라간다" 의 진짜 의미다.** 도심 면적
// 비율만 보존하고 확률을 그대로 두면 마천루가 8기 → 3기로 줄어, 감독 지시 *"진짜
// 뉴욕처럼"* 과 정면으로 부딪힌다. 팀장이 프리셋으로 묶으라고 한 이유가 이것이다 —
// *"노브 3개를 따로 물으면 판정이 아니라 숙제가 된다."*
//
// ⚠️ **어느 프리셋에서도 스폰 로드반경 안의 확률 마천루는 0기다**(최근접 98m). 중앙
// 광장 3×3(96m)이 그 반경을 통째로 먹기 때문이고, 이 값으로는 풀리지 않는다.
//
// ⚠️⚠️ **그 반경은 76.8m 가 아니라 67.2m 다**(2026-08-09 실측 정정). 76.8 은
// `DEFAULT_BANDS.farExit` 인데 그것은 **이미 far 인 파셀이 유지되는** 히스테리시스
// 한계이고, 처음 로드되는지를 정하는 것은 `farEnter`(2.10셀 = 67.2m)다 —
// `tierFor(dist, null)` 이 ENTER 만 본다. 이 줄이 오래 넓은 쪽 값을 적고 있었고,
// 그 탓에 `(0,-2)`(74m)가 첫 화면에 있는 것으로 계산됐다. **실제로는 없다.**
// 정면(±40°)에 로드되는 파셀은 4칸이고 전부 중앙 광장이다.
//
// 처방은 이 파일 밖에서 붙었다(2026-08-09): 광장을 채우는 일은
// `parts/adfacade.ts`(타임스퀘어 광고 파사드)가, 랜드마크 1기는
// `decide/grid.ts` 의 `LANDMARK_PARCEL` + `parts/tower.ts` 의 `LANDMARK_H` 가 맡는다.
//
// ⚠️ **이 노브는 감독 판정과 함께 제거한다**(태스크 #13). 확정값을 상수로 굳히고 판정을
// 값 옆에 적는다 — 남으면 그때부터 장식이다.

/** 도심 밀도 프리셋. **감독이 카드로 고르는 단위**이고, 낱개 노브를 노출하지 않는다 */
export interface DowntownPreset {
  /** 도심이 세계에서 차지하는 **명목** 면적 비율. 반경은 여기서 유도한다 */
  readonly share: number;
  /** 도심 안 고층 타워 확률 */
  readonly core: number;
}

export const DOWNTOWN_PRESETS = {
  /** 마천루 3기. 도심이 좁고 랜드마크가 드물다 — 걷다 만나면 사건이 된다 */
  calm: { share: 0.19, core: 0.12 },
  /** 마천루 8기. **기본값** — 도심은 좁히되(축소 반영) 마천루 수는 현행을 보존한다 */
  city: { share: 0.19, core: 0.24 },
  /** 마천루 15기. 도심이 넓고 빽빽하다 — 참고안의 *"꽉 찬 블록"* 쪽 */
  dense: { share: 0.42, core: 0.20 },
} as const satisfies Record<string, DowntownPreset>;

export type DowntownPresetName = keyof typeof DOWNTOWN_PRESETS;
export const DEFAULT_DOWNTOWN_PRESET: DowntownPresetName = 'city';

/**
 * 명목 면적 비율에서 도심 반경(파셀)을 유도한다. **리터럴을 적지 않는 자리다.**
 *
 * 도심은 체비쇼프 반경이므로 `(2R+1)²` 칸이다. 그것이 `share × GRID_W × GRID_H` 가
 * 되게 하는 R 을 풀면 `R = (√(share·W·H) − 1) / 2` 이고, 칸은 정수이므로 반올림한다.
 *
 * 체비쇼프 거리를 쓰는 이유는 그대로다 — 격자가 사각형이므로 도심도 사각형이어야
 * 블록 경계와 어긋나지 않는다. 원형으로 자르면 모서리 파셀만 애매하게 반쯤 걸린다.
 */
export function downtownRadius(share: number): number {
  return Math.round((Math.sqrt(share * GRID_W * GRID_H) - 1) / 2);
}

// ── 현재 프리셋 ─────────────────────────────────────────────────────────────
//
// ⚠️ **이 파일에서 유일한 가변 상태다.** 순수 판정 파일에 상태를 두는 것은 규율에 어긋
// 나지만, 대안이 더 나빴다: 프리셋을 인자로 흘리면 `isTowerParcel` → `tower.place` →
// `building.place` 까지 서명이 번지고, 그 셋은 `PartSpec` 계약이라 파츠 전체가 바뀐다.
//
// 안전한 이유는 **쓰기가 부팅 한 번**이라는 것이다(`world5-boot.ts` 가 URL 을 읽어
// 부른다). 파셀 배치는 스트리밍 시점에 계산되므로 그 뒤로는 상수와 구별되지 않는다.
// 그리고 이 상태는 **노브와 함께 사라진다**(태스크 #13) — 영구 구조가 아니다.
let current: DowntownPreset = DOWNTOWN_PRESETS[DEFAULT_DOWNTOWN_PRESET];

/**
 * 프리셋을 고른다. **부팅 시 한 번만 부른다** — 이미 만들어진 파셀은 다시 계산되지 않아
 * 도중에 바꾸면 이미 로드된 구역과 새 구역이 다른 도시가 된다.
 *
 * @param name 프리셋 이름. 모르는 이름이면 기본값으로 떨어진다(fail-closed).
 * @returns 실제로 적용된 이름
 */
export function applyDowntownPreset(name: string | null | undefined): DowntownPresetName {
  const key = (name ?? '') as DowntownPresetName;
  const picked: DowntownPresetName = key in DOWNTOWN_PRESETS ? key : DEFAULT_DOWNTOWN_PRESET;
  current = DOWNTOWN_PRESETS[picked];
  return picked;
}

/** 지금 적용된 도심 반경(파셀). 프리셋의 `share` 에서 유도된다 */
export function downtownR(): number {
  return downtownRadius(current.share);
}

/**
 * 도심 밖 고층 타워 확률. **프리셋에 안 넣었다 — 축이 다르다.**
 *
 * 0 이 아닌 것은 의도다: 외따로 선 타워 하나가 도시의 끝을 알려준다. 그 역할은 도심이
 * 넓든 좁든 같으므로 프리셋마다 다를 이유가 없고, 넣으면 감독이 고를 것이 하나 늘 뿐이다.
 */
export const TOWER_P_OUTER = 0.01;

const SALT_TOWER = 0x7f4a7c15;

/** 중앙 광장 기준 체비쇼프 거리가 도심 반경 이하인가 */
export function isDowntown(px: number, pz: number): boolean {
  return Math.max(Math.abs(px), Math.abs(pz)) <= downtownR();
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
  const p = isDowntown(px, pz) ? current.core : TOWER_P_OUTER;
  return h2(px, pz, SALT_TOWER) / 4294967296 < p;
}
