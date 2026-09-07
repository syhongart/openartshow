// world10/decide/lod-fade.ts — **새 파셀이 얼마나 서서히 나타나는가.** 순수 함수만.
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
import { readNum, readEnum } from '../url-knob.js';

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
 * 기본 성장 시간(초) — 새 부품이 땅에서 제 크기로 자라는 데 걸리는 시간.
 *
 * ── 왜 색 페이드와 별도 축인가 (감독 마크 실측 2026-08-10) ──────────────────
 * 색 페이드는 안개색을 섞는 방식이라 **안개 0% 거리에서는 원리상 무력하다.** 감독
 * 📍 마크가 가리킨 남은 "번쩍" 은 전부 선명 구역의 존재 사건이었다(tier승격 36.8m ·
 * tier강등 41.6m · 파셀생성 67.2m — 표는 `systems/parcel-grow.ts` 머리). 크기는 안개와
 * 무관하게 통한다.
 *
 * 0.45(색 페이드)보다 약간 짧게 두는 이유: 둘이 동시에 걸리는 원거리 등장에서 성장이
 * 먼저 끝나야 "자라는 중인데 색만 남은" 어정쩡한 꼬리가 안 생긴다. **룩 판정 전
 * 잠정치다** — `?grow=` 노브로 감독이 고른 값이 오면 여기 적는다.
 */
export const GROW_SECONDS = 0.4;

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


// ── 부품이 자라고 줄어드는 축 (W8-10 에서 액자와 공유) ──────────────────────
// 이 아래 셋은 원래 `systems/parcel-grow.ts` 의 **모듈 로컬**이었다. 액자(W8-10)가
// 같은 연출을 타면서 «건물은 0.4초인데 액자는 0.5초» 가 조용히 성립할 자리가 생겼고,
// 그것이 이 저장소가 값 미러링으로 반복해서 당한 형태라 판정 계층으로 올렸다.
// 집행은 여전히 둘이다 — 건물은 인스턴스 행렬, 액자는 `Group.scale`.

/**
 * 시작 스케일 배수. 0 으로 두지 않는 이유: three 는 스케일 0 행렬도 그리지만(면적 0),
 * 역행렬이 필요한 경로(노멀 행렬)에서 특이행렬이 된다. 시각적으로 0 과 구별 불가한
 * 최솟값으로 둔다.
 */
export const START_SCALE = 0.02;

/**
 * 기본 수축 시간(초) — 반납되기 전에 줄어드는 시간.
 *
 * 🔴 **이 값이 라이브 실효값이다** (감독 판정 2026-08-20 — *"퇴장할때 수축켜줘.
 * 잘 동작한다"*). 팀장 조건 2(2026-08-10)가 예고한 승격이 그대로 일어났다 —
 * `readParcelAnim()` 의 기본값이 0 에서 이 상수로 올라왔다.
 *
 * ⚠ **그전 판본은 «라이브 실효값은 이 값이 아니라 0 이다» 였고, 지금은 거짓이다.**
 * 승격 커밋에서 함께 고쳤다 — 값을 바꾸면서 그 값을 설명하는 문장을 안 고치면
 * 다음 사람이 화면과 반대되는 서술을 읽는다.
 *
 * 왜 0.25 인가: 캐스터의 그림자는 안개 앞(화면 안)까지 드리워져 있고 0.25s 만에
 * 걷힌다 — ease 가 'out' 이라 첫 다섯 프레임에 절반이 사라진다.
 *
 * ⚠⚠ **알려진 부작용 — 후진 중 그림자 깜빡임.** 이 값으로 켰을 때 파셀이 연달아
 * 반납되면 *"사각 그림자 부분이 빠르게 어둡고 밝게 반복"* 으로 보인 관측이 있다
 * (`?shint=0` 대조로 그림자 축 확정, 2026-08-10). **그래서 0 으로 두고 감독 판정을
 * 기다렸던 것이고, 판정이 「켜라」로 왔다.** 다시 보이면 `?shrinkease=in` 으로 커브를
 * 바꿔 비교한다 — 초반을 느리게 하면 그 깜빡임이 줄어들 여지가 있다(미실측).
 */
export const SHRINK_SECONDS = 0.25;

/**
 * 성장 기본 커브. **`'out'` 인 이유**: 등장은 초반이 빨라야 「없다가 있는」 프레임이 짧다.
 *
 * ⚠ 이 값이 `systems/parcel-grow.ts` 의 `opts.ease ?? 'out'` 과 **두 곳에 적혀 있었다**
 * (검수관 권고, 2026-08-18). 지금은 `?growease=` 노브가 없어 갈릴 일이 드물지만 이
 * 저장소는 값 미러링으로 이미 세 번 사고를 냈다 — 노브가 생긴 뒤에 모으면 늦는다.
 */
export const GROW_EASE: FadeEase = 'out';

/** 부품 등장·소멸 연출의 실효 설정. **건물과 액자가 같은 것을 본다** */
export interface ParcelAnim {
  /** 성장 시간(초). 0 이면 즉시 완성 = 종전 동작(팝) */
  readonly grow: number;
  /** 수축 시간(초). 0 이면 즉시 사라짐. **라이브 기본값은 `SHRINK_SECONDS`**(2026-08-20 승격) */
  readonly shrink: number;
  /** 성장 커브 */
  readonly ease: FadeEase;
  /** 수축 커브. 시간 축과 분리해 판정하려고 따로 둔다(팀장 조건 1) */
  readonly shrinkEase: FadeEase;
}

/**
 * URL 노브에서 읽는다 — **`?grow=` · `?shrink=` · `?shrinkease=` 파싱의 SSOT.**
 *
 * ── 왜 파싱까지 여기로 올렸나 (W8-10) ──────────────────────────────────────
 * 그전에는 `main.ts` 가 읽어 **`ParcelGrowSystem` 에만** 넘겼다. 액자는
 * `features/overlay.ts` 안에서 조립되므로 그 값을 볼 수 없었고, 그러면 감독이
 * `?shrink=1` 로 룩을 판정하는 순간 **건물 1초 / 액자 0.25초의 어긋난 화면을 보고
 * 판정**하게 된다 — `readNum` 의 조용한 클램프가 `?nfog=0` 판정을 한 번 훔친 그 형태다.
 *
 * 선례를 따른다: `decide/art-material.ts` 의 `readArtEnv()` + `ArtworkSceneDeps.artEnv`
 * 의 «생략하면 URL 노브를 읽는다» 규약. 새 패턴이 아니다.
 */
export function readParcelAnim(): ParcelAnim {
  return {
    grow: readNum('grow', GROW_SECONDS, 0, 3),
    // 🔴 **기본값이 상수로 승격됐다** (감독 지시 2026-08-20 — *"퇴장할때 수축켜줘.
    // 잘 동작한다"*). 그전에는 여기가 **0** 이라 노브를 안 주면 즉시 사라졌다.
    shrink: readNum('shrink', SHRINK_SECONDS, 0, 3),
    ease: GROW_EASE,
    shrinkEase: readEnum('shrinkease', GROW_EASE, FADE_EASES),
  };
}

/**
 * 배수 한 걸음 — **건물과 액자가 같은 식을 쓴다**(W8-10).
 *
 * `parcel-grow.ts` 의 `update()` 가 인스턴스에 하던 산술 그대로다. 목표(`up`)가
 * 뒤집히면 부르는 쪽이 `from = 지금 배수`·`elapsed = 0` 으로 다시 시작한다 —
 * **되감지 않는다**(`retarget` 이 `curScale` 을 유지하는 것과 같은 규약).
 *
 * ⚠ **끝값을 정확히 박는 것이 이 함수의 계약이다.** `Math.max(START_SCALE, …)` 가
 * 있는 한 마지막 프레임의 보간값만으로는 1 이나 0 이 보장되지 않는다.
 *
 * @returns `{k, done}` — `k` 는 배수, `done` 은 이번에 목표에 닿았는가
 */
export function scaleStep(
  up: boolean, from: number, elapsed: number, anim: ParcelAnim,
): { k: number; done: boolean } {
  const mix = up
    ? fadeMix(elapsed, anim.grow, anim.ease)
    : fadeMix(elapsed, anim.shrink, anim.shrinkEase);
  if (mix >= 1) return { k: up ? 1 : 0, done: true };
  const k = up ? from + (1 - from) * mix : from * (1 - mix);
  return { k: Math.max(START_SCALE, k), done: false };
}

/** 액자 하나의 등장·소멸 진행 상태. 소비자가 들고 이 모듈이 굴린다 */
export interface ScaleState {
  /** 지금 배수(0~1). 화면 표시 여부는 이 값이 0 인가로 갈린다 */
  k: number;
  /** 지금 향하는 곳 — `true` 면 1, `false` 면 0 */
  up: boolean;
  /** 이번 전이의 경과(초) */
  elapsed: number;
  /** 이번 전이가 시작한 배수. **되감지 않으려고** 든다 */
  from: number;
  /** 아직 한 번도 굴리지 않았다 — 첫 걸음은 목표로 **순간 이동**한다 */
  fresh: boolean;
}

/**
 * 한 걸음 굴린다. **바뀐 것이 없으면 `null`** — 부르는 쪽은 그때 아무것도 대입하지 않는다
 * (「변할 때만 대입」 규약을 산술 쪽에서 보증한다).
 *
 * ── 🔴 `fresh` 는 왜 있나 — 실패 사례가 둘이다 ────────────────────────────
 * 소비자(`systems/artwork-scene.ts`)의 `place()` 는 **전체 대체**다. 새 엔트리가 0 에서
 * 자라기 시작하면:
 *
 * ① 작가가 다섯 번째 작품을 거는 순간 **이미 걸어 둔 넷이 전부 0 에서 다시 자란다.**
 *    그림자 데칼 재베이킹이 `place` 를 타면서 «농도를 조절하는 내내 화면의 모든 그림자가
 *    쪼그라들었다 자라기를 반복» 한 사고와 **같은 형태**다(그래서 `parcel-assets.ts` 에
 *    `retarget` 이 별도 문으로 있다).
 * ② 부팅에서 `START_SCALE` 로 시작하면 바운딩 스피어가 **50배** 작아져 회전 구간에
 *    프러스텀 컬링될 수 있고, 그러면 `info.memory` 계단이 복귀 구간으로 밀려 `[7]` 의
 *    `settledOk` 가 FAIL 한다 — `invariant-judge.mjs` 가 적어 둔 재론 조건을 **우리가
 *    스스로 트리거하는** 셈이다.
 *
 * 그래서 「처음 놓인 것은 애니메이션 없이 목표로 간다」가 계약이다.
 *
 * ⚠ `fresh` 는 **엔트리별**이어야 한다. `place` 는 텍스처 로드에서 제어를 놓으므로
 * 엔트리가 여러 프레임에 걸쳐 담긴다 — 씬 단위 플래그면 먼저 담긴 것만 스냅된다.
 *
 * ⚠⚠ **`fresh` 가 실제로 갈리는 경우는 하나뿐이다** — 「걸린 순간 이미 멀리 있는」 액자다.
 * 소비자가 `k: 1` 로 시작하므로 가까운 경우는 이 플래그가 없어도 같은 결과가 나온다.
 * 첫 판본의 뮤테이션이 **1 failed** 밖에 안 나서 그 사실이 드러났고(집행 축이 사실상
 * 비어 있었다), 그 경우를 시험하는 검사를 넣어 **2 failed** 로 만들었다.
 *
 * ── 뮤테이션 실측 (2026-08-18, `lod-fade` + `artwork-scene` + `overlay-wiring`) ──
 *
 *   `fresh` 무시 (= place 가 애니메이션을 시작)          2 failed
 *   `dt` 무시 (= 즉시 완료)                             4 failed
 *   `visible` 을 수축 즉시 false 로                      2 failed
 *   조명 비례를 토글로 되돌림                            1 failed
 *   `z` 를 균등 스케일로                                 1 failed
 *   되감기 금지를 깨기(`from` 을 끝값으로)               2 failed
 *   **등가 대조군 — 주석만 추가**                       **0 failed**
 */
export function scaleAdvance(
  st: ScaleState, up: boolean, dt: number, anim: ParcelAnim,
): ScaleState | null {
  if (st.fresh) {
    const k = up ? 1 : 0;
    return { k, up, elapsed: 0, from: k, fresh: false };
  }
  if (up === st.up && st.k === (up ? 1 : 0)) return null;   // 목표에 이미 닿았다
  // 방향이 뒤집혔으면 **지금 배수에서** 다시 시작한다(되감기 금지).
  const from = up === st.up ? st.from : st.k;
  const elapsed = (up === st.up ? st.elapsed : 0) + dt;
  return { k: scaleStep(up, from, elapsed, anim).k, up, elapsed, from, fresh: false };
}
