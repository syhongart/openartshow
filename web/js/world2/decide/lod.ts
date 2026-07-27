// world2/decide/lod.ts — 거리 tier 판정. 순수 함수만, import 0.
//
// 왜 별 파일인가. 현행 world.js는 tier 판정이 `updateStreaming`(101줄, if 25개) 안에서
// 언로드 실행·큐 정리·쿨다운 부수효과와 뒤엉켜 있어, 판정만 떼어 시험할 지점이 없다.
// 그래서 이 판정에서 난 버그 두 건(`RATIO_FLOOR` no-op 계열)이 실기기에 나가서야 발견됐다.
// 여기 있는 함수들은 전부 입력→출력이므로 테이블 테스트로 경계를 못 박을 수 있다.
//
// 히스테리시스가 규약인 이유: 레퍼런스(hyperfy)의 LOD는 여유대역이 없어 경계에서 깜빡인다.
// 우리는 tier마다 ENTER(들어가는 거리)와 EXIT(나오는 거리)를 따로 두고, EXIT > ENTER를
// 불변식으로 강제한다 — 같은 값이면 경계에 선 물체가 매 프레임 tier를 오간다.

/** 렌더 tier. near=풀 품질 · mid=텍스처만 · far=단색 임포스터 · none=미로드 */
export type Tier = 'near' | 'mid' | 'far' | 'none';

export const TIERS: readonly Tier[] = ['near', 'mid', 'far', 'none'] as const;

/**
 * tier별 거리 임계(셀 단위). ENTER < EXIT 이어야 히스테리시스가 성립한다.
 * 값의 근거: 현행 실측 스트리밍 반경(full 1.15·shell 1.55 CELL)에서 출발해
 * 중간 tier(mid)를 끼워 넣었다. 정지 시 상하좌우(거리 1.0)=near, 대각(1.414)=mid가 되어
 * 현행 로드 개수를 재현한다 — 회귀 기준선을 유지하려는 선택이다.
 */
export interface TierBands {
  nearEnter: number; nearExit: number;
  midEnter: number; midExit: number;
  farEnter: number; farExit: number;
}

export const DEFAULT_BANDS: TierBands = {
  nearEnter: 1.15, nearExit: 1.30,
  midEnter: 1.55, midExit: 1.75,
  farEnter: 2.10, farExit: 2.40,
};

/** ENTER < EXIT 불변식 검사. 밴드를 만드는 모든 경로가 이걸 통과해야 한다. */
export function validBands(b: TierBands): boolean {
  return b.nearEnter < b.nearExit
    && b.nearExit <= b.midEnter
    && b.midEnter < b.midExit
    && b.midExit <= b.farEnter
    && b.farEnter < b.farExit;
}

/**
 * 거리 → tier. `prev`(현재 tier)를 받아 히스테리시스를 적용한다.
 *
 * 규칙: 안쪽으로 올라갈 때는 ENTER를, 바깥으로 내려갈 때는 EXIT를 쓴다.
 * 그래서 ENTER와 EXIT 사이 구간에 있는 물체는 **현재 tier를 유지**한다 — 이것이 깜빡임 차단.
 * `prev`가 없으면(첫 판정) ENTER 기준만 쓴다.
 */
export function tierFor(dist: number, prev: Tier | null, b: TierBands = DEFAULT_BANDS): Tier {
  const rank = (t: Tier) => TIERS.indexOf(t); // 작을수록 안쪽(near=0)
  const byEnter: Tier = dist <= b.nearEnter ? 'near'
    : dist <= b.midEnter ? 'mid'
      : dist <= b.farEnter ? 'far' : 'none';
  if (prev == null) return byEnter;

  // 안쪽으로(= rank 감소) 갈 때는 ENTER를 넘겼으므로 그대로 승격.
  if (rank(byEnter) < rank(prev)) return byEnter;

  // 바깥으로 내려가려면 현재 tier의 EXIT를 넘어야 한다. 아직이면 유지.
  const exitOf: Record<Tier, number> = {
    near: b.nearExit, mid: b.midExit, far: b.farExit, none: Infinity,
  };
  if (dist <= exitOf[prev]) return prev;

  // EXIT를 넘었다 — 한 단계만 내린다(여러 단계 급락 방지: 급락은 그 자체로 스파이크다).
  return TIERS[Math.min(TIERS.length - 1, rank(prev) + 1)];
}

/**
 * 이동방향 look-ahead를 반영한 판정 중심.
 * 현행에서 검증된 값(0.5 CELL)을 계승한다 — 가려는 쪽 파셀을 미리 올려 경계 히칭을 줄인다.
 * 입력이 정규화돼 있지 않아도 안전하게 다룬다(길이 0이면 그대로 위치를 반환).
 */
export function lookAheadCenter(
  px: number, pz: number, dirX: number, dirZ: number, ahead = 0.5,
): { x: number; z: number } {
  const len = Math.hypot(dirX, dirZ);
  if (!(len > 1e-6)) return { x: px, z: pz };
  return { x: px + (dirX / len) * ahead, z: pz + (dirZ / len) * ahead };
}

/**
 * 로드 우선순위. 작을수록 먼저. 거리 위주에 진행방향 보너스를 얹는다.
 * 현행 `prio = 맨해튼거리*10 − dirBonus` 규약을 계승하되 유클리드로 바꿨다 —
 * 격자 맨해튼은 대각 파셀을 과소평가해 시야 정면 대각이 늦게 올라왔다.
 */
export function loadPriority(
  dist: number, towardDot: number, dirBonusWeight = 5,
): number {
  return dist * 10 - (towardDot > 0 ? towardDot * dirBonusWeight : 0);
}
