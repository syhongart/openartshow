// world2/decide/lod-fade.ts — **새 파셀이 얼마나 서서히 나타나는가.** 순수 함수만.
//
// ── 왜 필요한가 (감독 지시 2026-08-07) ──────────────────────────────────────
// *"ldo로 건물들이 나타날때 디졸브 철럼 나오게 가능? 현재는 팍"*
//
// ── "팍" 의 정체는 유도된다 — 안개가 파셀 등장을 다 감추지 못한다 ────────────
// 파셀은 `DEFAULT_BANDS.farEnter`(2.10 셀)에서 태어나고, 안개는 `FOG_NEAR_CELLS`
// (1.60 셀)에서 시작해 `FOG_FAR_CELLS`(2.40 셀)에서 닫힌다. `THREE.Fog` 는 near~far
// 선형이므로 등장 지점의 안개 진행률은
//
//     (2.10 − 1.60) / (2.40 − 1.60) = 0.625
//
// 즉 **태어나는 순간 이미 37.5% 의 자기 색을 드러낸 채로 튀어나온다.** 감독이 본
// "팍" 이 이 37.5% 다. 이 값은 `residualAtSpawn()` 이 밴드에서 유도하고 테스트가
// 못 박는다 — 밴드를 만지면 이 수가 따라 움직이는 것을 알아야 하기 때문이다.
//
// ── 왜 밴드를 밀지 않고 페이드로 메우는가 ───────────────────────────────────
// `farEnter` 를 `FOG_FAR_CELLS` 밖으로 밀면 등장이 안개 100% 뒤에서 일어나 원인이
// 사라진다. 그런데 그건 렌더 반경을 넓히는 것이고, 슬롯 예산(`poolBudget`)이 밴드
// 반경 안 격자점 수에서 유도되므로 **파셀 수와 슬롯 수가 함께 늘어난다** — 개수
// 불변식은 지키지만 상수 자체가 커진다. 팀장 판정(2026-08-07)이 A안(instanceColor
// 색 보간)을 고른 이유가 이것이다: 등장 시점을 바꾸지 않고 **드러나는 속도만** 늦춘다.
//
// ── 여기에 three 가 없는 이유 ───────────────────────────────────────────────
// 집행(`systems/parcel-fade.ts`)이 색을 섞고, 여기는 "지금 몇 % 드러났는가" 만 낸다.
// 그래야 커브·시간 판정을 렌더러 없이 테이블로 시험할 수 있다.

import { DEFAULT_BANDS, type TierBands } from './lod.js';
import { FOG_NEAR_CELLS, FOG_FAR_CELLS } from './fog.js';

/** 페이드 커브 이름. URL 노브 `?lodease=` 가 이 중 하나를 고른다 */
export type FadeEase = 'lin' | 'in' | 'out' | 'smooth';

export const FADE_EASES: readonly FadeEase[] = ['lin', 'in', 'out', 'smooth'] as const;

/**
 * 커브. 전부 `f(0)=0` · `f(1)=1` · 단조증가다 — 이 세 성질을 테스트가 못 박는다.
 * 하나라도 깨지면 "나타나다 말고 되돌아가는" 화면이 된다.
 *
 * `in`(t²)이 이름 그대로 **디졸브에 가장 가깝다** — 초반이 거의 0 이라 한동안 안개
 * 속에 잠겨 있다가 뒤늦게 드러난다. `out` 은 반대라 등장 자체는 여전히 급하다.
 */
export const EASINGS: Record<FadeEase, (t: number) => number> = {
  lin: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  smooth: (t) => t * t * (3 - 2 * t),
};

/**
 * 기본 페이드 시간(초).
 *
 * ── 상한이 유도된다 ─────────────────────────────────────────────────────────
 * 페이드가 끝나기 전에 파셀이 안개 안쪽(`FOG_NEAR_CELLS`)까지 들어와 버리면, 다 드러나야
 * 할 거리에서 아직 반투명한 모습이 된다 — 팝인을 고치려다 **더 이상한 것**을 만든다.
 * 정면으로 곧장 걸을 때 등장(2.10 셀)에서 안개 시작(1.60 셀)까지는 0.50 셀 = 16m 이고,
 * 달리기(speed 9 × fast 2.2 ≈ 19.8m/s)면 **0.81초**만에 통과한다.
 *
 * 그래서 기본값을 그 절반 근처인 0.45 로 둔다. **이 값은 룩 판정이 아직 안 끝난
 * 잠정치다** — 감독 판정은 `?lodfade=` 노브로 받는다(사이클 2항: 후보를 여럿 동시에).
 * 판정이 오면 그 값과 근거를 여기 적는다.
 */
export const FADE_SECONDS = 0.45;

/** 기본 커브. `in` 이 디졸브에 가장 가깝다는 위 근거 — 감독 판정 대기 중인 잠정치다 */
export const FADE_EASE: FadeEase = 'in';

/**
 * 파셀이 태어나는 순간 **자기 색이 몇 % 드러나 있는가**(0~1).
 *
 * 0 이면 안개가 완전히 감춰 팝인이 원리적으로 안 보인다. 1 이면 안개가 아무 일도
 * 하지 않는다. 지금은 0.375 다 — 감독이 "팍" 이라고 부른 그 수다.
 *
 * 밴드나 안개 배수를 만지면 이 값이 저절로 따라온다. **여기에 0.375 를 적어두지
 * 않는 이유가 그것이다**(값 미러링 금지 — 상수를 바꿔도 아무도 모르는 사태를 막는다).
 */
export function residualAtSpawn(bands: TierBands = DEFAULT_BANDS): number {
  const span = FOG_FAR_CELLS - FOG_NEAR_CELLS;
  if (!(span > 0)) return 1; // 안개 밴드가 뒤집혔거나 폭이 0 — 감출 수 없다
  const t = (bands.farEnter - FOG_NEAR_CELLS) / span;
  return 1 - Math.min(1, Math.max(0, t));
}

/**
 * 경과 시간 → 드러난 정도(0~1).
 *
 * `duration <= 0` 이면 즉시 1 이다 — **페이드를 끄는 것이 곧 종전 동작**이라는 뜻이고,
 * `?lodfade=0` 이 그 문이다. 0 을 "기본값으로 되돌림" 으로 해석하지 않는다(`readNum` 의
 * 조용한 클램프가 `?nfog=0` 을 0.05 로 잘라 감독 판정을 한 번 훔친 적이 있다).
 */
export function fadeMix(elapsed: number, duration: number, ease: FadeEase = FADE_EASE): number {
  if (!(duration > 0)) return 1;
  const t = Math.min(1, Math.max(0, elapsed / duration));
  return EASINGS[ease](t);
}
