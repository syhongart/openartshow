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
import { FOG_NEAR_CELLS, FOG_FAR_CELLS, type FogBand } from './fog.js';

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
 * 등장에서 안개 안쪽까지의 거리(셀). 페이드가 이 안에 끝나야 한다.
 *
 * 페이드가 끝나기 전에 파셀이 안개 안쪽(`FOG_NEAR_CELLS`)까지 들어와 버리면, 다 드러나야
 * 할 거리에서 아직 덜 드러난 모습이 된다 — 팝인을 고치려다 **더 이상한 것**을 만든다.
 */
export function crossingCells(bands: TierBands = DEFAULT_BANDS): number {
  return Math.max(0, bands.farEnter - FOG_NEAR_CELLS);
}

/**
 * 그 구간을 정면으로 곧장 달려 통과하는 데 걸리는 시간(초).
 *
 * ── 왜 함수인가 (검수관 지적 2026-08-07) ────────────────────────────────────
 * 첫 판본은 이 유도를 **주석에 숫자로** 적었고, 그 숫자가 이미 폐기된 값이었다 —
 * `speed 9 × 2.2 ≈ 19.8m/s` 라고 썼는데 `WALK_SPEED` 는 2026-07-27(`e9442d6`)에
 * 5.0 이 됐고, `player.ts` 의 `RUN_MULT` 주석은 그때부터 *"예전 19.8은 시속 71km였다"*
 * 라고 적고 있었다. **나는 그 옆에 있는 폐기 기록을 보면서 폐기된 값을 베꼈다.**
 *
 * 결론(0.45 가 안전)은 오히려 여유가 커지는 방향이라 안 흔들렸다. 그래서 더 위험하다 —
 * 결론이 맞으면 근거는 검산되지 않는다. 이제 인자로 받고, `tests/world2-lod-fade.test.ts`
 * 가 **실제 `WALK_SPEED`·`RUN_MULT` 를 넣어** `FADE_SECONDS` 와의 관계를 못 박는다.
 * 속도 상수가 바뀌어 여유가 사라지면 그 테스트가 깨져서 알려준다.
 *
 * @param cell    파셀 한 변(m)
 * @param speed   걷기 속도(m/s) — `systems/player.ts` 의 `WALK_SPEED`
 * @param runMult 달리기 배수 — 같은 파일의 `RUN_MULT`
 */
export function crossingSeconds(
  cell: number, speed: number, runMult: number, bands: TierBands = DEFAULT_BANDS,
): number {
  const v = speed * runMult;
  if (!(v > 0)) return Infinity;
  return (crossingCells(bands) * cell) / v;
}

/**
 * 기본 페이드 시간(초).
 *
 * 위 `crossingSeconds` 가 내는 시간보다 **넉넉히 짧아야** 한다. 현재 상수들에서는
 * 통과에 1.4초 남짓 걸리므로 0.45 는 그 3분의 1 이하다.
 *
 * **이 값은 룩 판정이 아직 안 끝난 잠정치다** — 감독 판정은 `?lodfade=` 노브로 받는다
 * (사이클 2항: 후보를 여럿 동시에). 판정이 오면 그 값과 근거를 여기 적는다.
 */
export const FADE_SECONDS = 0.45;

/** 기본 커브. `in` 이 디졸브에 가장 가깝다는 위 근거 — 감독 판정 대기 중인 잠정치다 */
export const FADE_EASE: FadeEase = 'in';

/**
 * 그 거리에서 **얼마나 안개에 묻혀 있는가**(0~1). 0=선명 · 1=완전히 안개색.
 *
 * `THREE.Fog` 가 near~far 선형이므로 같은 식이다. 여기 있는 이유는 **집행이 이 값을
 * 알아야 하기 때문**이다(`systems/parcel-fade.ts`) — 안개가 실제로 얼마나 감춰주는지
 * 모른 채 덮으면 아래 사고가 난다.
 *
 * ── 왜 필요해졌나 (감독 실기기 2026-08-09) ──────────────────────────────────
 * *"가까이 가면 뭔가 건물이 번쩍해"*
 *
 * 페이드는 새 부품을 **안개색으로 덮었다가** 제 색으로 되돌린다. 안개가 짙은 거리에서는
 * 그것이 디졸브다. 그런데 **안개색은 거의 검정(`0x0b0d12`)이고, 부품은 안개가 0% 인
 * 거리에서도 태어난다** — 그러면 디졸브가 아니라 **검은 덩어리가 나타났다 밝아지는 것**이다.
 *
 * 실측(실물 시스템 조립, 11m/s 60초 주행 · 1,769건 등장):
 *
 *     build/building   최소 50.07m  안개율 0.0000
 *     build/lamp       최소 50.41m  안개율 0.0000
 *     promote/planter  최소 20.22m  안개율 0.0000   ← tier 승격으로 태어난다
 *
 * 안개는 `fogBand(32).near` = 51.2m 부터다. 그보다 가까운 등장이 1,769건 중
 * 안개율 0.05 미만만 **146건**이었다.
 *
 * ── 아래 `residualAtSpawn` 이 이것을 못 본 이유 ─────────────────────────────
 * 그 값(0.375)은 **참이지만 전제가 둘 다 좁다**: ① 파셀 **중심** 거리(67.2m) 기준인데
 * 부품은 파셀 안 어디에나 앉는다(셀 32m → ±16m 더 가까이) ② **신규 파셀 등장(none→far)**
 * 만 본다 — tier 승격으로 태어나는 부품은 그 식 밖이다.
 * *"참인 문장에서 성립하지 않는 결론 — 값이 아니라 재는 축이 틀린다"* 의 재현이다.
 */
export function fogFactorAt(dist: number, band: FogBand): number {
  const span = band.far - band.near;
  if (!(span > 0)) return dist >= band.far ? 1 : 0;
  return Math.min(1, Math.max(0, (dist - band.near) / span));
}

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
