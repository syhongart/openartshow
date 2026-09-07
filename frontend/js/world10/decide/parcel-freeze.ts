// world10/decide/parcel-freeze.ts — **동결된 파셀을 계산 대신 쓴다.** 순수 함수만.
//
// ── 무엇을 위한 것인가 (감독 판정 2026-08-12) ───────────────────────────────
// 감독이 마을 건물·나무를 손으로 옮기려면 그 파셀은 «계산된 배치» 가 아니라 «저장된
// 배치» 를 써야 한다. 카드 답이 그것을 이렇게 정했다: **«손본 구역은 슬라이더에서
// 빠진다»** — 즉 한 번 손대면 그 파셀은 밀도 노브(`?bld=`·`?tree=`)의 영향을 안 받고
// 저장된 배열 전체를 쓴다.
//
// 이 방식이 고른 이유는 **파츠를 가리킬 안정적인 이름이 없기 때문**이다. 실측(파셀
// (3,-7) near): `?bld=2` 하나로 나무가 **3그루 → 0그루**가 됐다 — 건물이 늘면 나무가
// 자리를 잃고 `break` 한다. 「3번 나무」라는 표시가 슬라이더 한 번에 무의미해진다.
// 배열 전체를 저장하면 그 안에서 인덱스가 자기 완결적이라 **가리킬 이름 자체가 불필요**하다.
//
// ── ⚠ 왜 `parcelLayout` **바깥**인가 ────────────────────────────────────────
// 그 함수 안에 분기를 넣으면 골든 해시(38,241 파츠 9필드 SHA-256)가 깨진다. 그때 고칠
// 것은 해시가 아니라 설계다 — `parcel-layout.ts` 헤더가 이것을 명시적으로 못 박아 뒀고,
// 이 파일이 그 «바깥» 이다. 빌더는 여기서 나온 것을 쓰거나, 없으면 계산한다.

import { kindsFor } from '../parts/index.js';
import type { PlacedPart } from '../parts/types.js';
import type { FrozenParcel } from './overlay.js';

export type { PlacedPart };

/**
 * 동결 목록을 좌표로 찾을 수 있게 색인한다.
 *
 * 배열을 매번 훑지 않는 이유: `fill()` 은 **파셀 × 종류**마다 불린다(종류가 늘면 호출도
 * 는다). 동결이 수십 개만 돼도 그 곱이 프레임에 얹히고, 그것은 «스트리밍이 끊긴다» 로만
 * 드러난다 — 원인을 짐작하기 어려운 형태다.
 */
export function indexFrozen(parcels: readonly FrozenParcel[]): Map<string, readonly PlacedPart[]> {
  const m = new Map<string, readonly PlacedPart[]>();
  for (const p of parcels) m.set(keyOf(p.px, p.pz), p.parts);
  return m;
}

/** 파셀 좌표 → 색인 키. **한 곳에서만 만든다** — 두 곳이면 한쪽만 고쳐도 아무도 모른다 */
export function keyOf(px: number, pz: number): string {
  return `${px | 0},${pz | 0}`;
}

/**
 * 동결 배치를 tier 에 맞게 거른다.
 *
 * **동결은 near 기준 배열 하나만 담는다**(계약 `decide/overlay.ts`). tier 별로 세 벌
 * 저장하면 불변식 ②(`far ⊆ mid ⊆ near` 이고 공통 원소의 **위치가 동일**)를 **데이터가
 * 깰 수 있다** — 저장된 세 벌이 서로 어긋나도 아무도 못 막는다. near 하나만 두고 여기서
 * 거르면 그 성질을 필터 규칙이 소유하므로 구조적으로 유지된다.
 *
 * 거르는 기준은 `kindsFor(tier)` 다 — 계산 경로(`parcelLayout` 의 `spec.tiers.includes`)와
 * 같은 출처를 본다. 두 경로가 다른 목록을 보면 «멀어졌다 가까워질 때 건물이 나타났다
 * 사라진다» 가 된다.
 *
 * ⚠⚠ **지금 이 함수는 항등이다 — 아무것도 안 거른다**(실측 2026-08-13).
 * `kindsFor` 가 near·mid·far 에서 **완전히 같은 목록**(19종)을 내고, `parcelLayout` 도
 * 세 tier 에서 같은 개수를 낸다(파셀 (0,-7)·(3,-7) 33개, (5,-7) 31개 — 셋 다 동일).
 * 즉 **지금은 tier 가 무엇도 줄이지 않는다.**
 *
 * ⚠ 첫 판본은 이 자리에 *"그 성질을 필터 규칙이 소유하므로 구조적으로 유지된다"* 라고만
 * 적었고, 그것은 **지킬 것이 없는 상태에서의 주장**이었다. 뮤테이션이 드러냈다 —
 * 이 `filter` 를 통째로 지워도 **0 failed** 였다(그래서 그것을 재던 두 축이 빈 검사였다).
 *
 * **그래도 남겨 두는 이유**: 동결이 near 배열이라는 계약은 tier 가 갈리는 날에도 그대로고,
 * 그때 이 자리가 없으면 «먼 파셀에 안 보여야 할 것이 보인다» 가 된다. 대신 아래 테스트가
 * **지금 항등임을 단언**한다 — tier 가 실제로 갈리는 날 그 축이 빨간불이 되어, 이 함수와
 * 그 검사를 함께 재검토하게 만든다.
 *
 * ⚠ 별개 관측: **LOD tier 가 지금 아무것도 안 줄이고 있다**는 것 자체가 성능 관점에서
 * 볼 만한 사실이다(`parcel-builder.ts` 헤더는 *"near→mid 는 lamp 슬롯만 반납하면 끝"*
 * 이라고 적고 있는데 반납할 것이 없다). 이 파일의 스코프가 아니라 태스크로 뽑았다.
 */
export function forTier(
  parts: readonly PlacedPart[],
  tier: 'near' | 'mid' | 'far',
): readonly PlacedPart[] {
  const kinds = new Set<string>(kindsFor(tier));
  return parts.filter((p) => kinds.has(p.kind));
}

/**
 * 빌더가 쓰는 조회 하나. 동결이 없으면 `null` — 그러면 부르는 쪽이 **계산한다.**
 *
 * `null` 과 «빈 배열» 은 다른 뜻이다: `null` = «이 파셀은 안 손댔다(계산해라)»,
 * 빈 배열 = «손대서 전부 지웠다(아무것도 놓지 마라)». 계약이 그 둘을 구별하려고
 * `FrozenParcel.parts` 를 빈 배열로 허용한다 — 여기서 뭉개면 «다 지웠는데 다시 생긴다» 가 된다.
 */
export function createFrozenLookup(
  parcels: readonly FrozenParcel[],
): (px: number, pz: number, tier: 'near' | 'mid' | 'far') => readonly PlacedPart[] | null {
  const index = indexFrozen(parcels);
  if (index.size === 0) return () => null; // 동결이 하나도 없으면 조회 비용도 0
  return (px, pz, tier) => {
    const parts = index.get(keyOf(px, pz));
    return parts === undefined ? null : forTier(parts, tier);
  };
}

// ── 그림자는 저장하지 않고 **유도한다** (검수관 반려 B1, 2026-08-13) ─────────
//
// 마을 배치에는 `shadow:*` 파츠가 **실제로 들어 있다** — 11×11 파셀 샘플에서 3,716개 중
// 1,238개(33%)가 그것이다(검수관 실측). `parcel-layout.ts` 안에 `shadow:` 리터럴이 없다는
// 것은 참이지만 `PARTS = [...BASE, ...shadowParts(BASE)]` 를 순회하므로 대량 생성된다.
// **참인 문장에서 성립하지 않는 결론을 뽑은 것**이고, 그 오류로 W4 ④ 가 반려됐다.
//
// 문제: 편집이 캐스터 하나를 옮기면 같은 배열의 짝 그림자는 그대로 남는다. 동결된 파셀은
// `parcelLayout` 을 다시 안 돌므로 유도가 끊긴다 — 실측으로 «옮기면 옛 자리에 유령 그림자,
// 지우면 그림자만 남음» 이 재현됐다.
//
// **처방은 짝을 맞추는 것이 아니라 저장하지 않는 것이다.** 짝을 맞추면 자세가 두 벌이 되어
// 반드시 갈라진다(이 저장소가 값 미러링으로 반복해 데인 형태 — 캔버스 색·구름 고도·테스트
// 임계값). 그림자는 캐스터의 **파생물**이므로 소유자를 하나로 둔다:
//
//   저장(`freeze`)  캐스터만 담는다        ← `stripShadows`
//   조회(`lookup`)  그림자를 다시 유도한다  ← `withShadows`
//
// 그러면 편집이 어떤 경로로 캐스터를 바꾸든(기즈모·수치칸·버튼·키·삭제) 그림자가 저절로
// 따라온다. **새 편집 경로가 생겨도 빠뜨릴 자리가 없다** — 그것이 짝 맞추기와의 차이다.

import { shadowOf } from '../parts/shadow.js';
import { SHADOW_CASTERS } from '../parts/index.js';

/** `shadow:` 접두 파츠를 걷어낸다. 동결로 **저장할 것**을 만드는 자리 */
export function stripShadows(parts: readonly PlacedPart[]): PlacedPart[] {
  return parts.filter((p) => !p.kind.startsWith('shadow:'));
}

/**
 * 캐스터에서 그림자를 유도해 **뒤에 붙인다.** 동결을 빌더에게 **줄 때**의 자리.
 *
 * ⚠ 순서가 계약이다 — 그림자는 캐스터 **뒤**에 온다. `parcel-layout.ts` 가 캐스터를 먼저
 * 놓고 그림자를 뒤에 놓으며(`PARTS` 순서), `makeShadowPart` 의 `absoluteY` 주석이
 * *"캐스터는 파츠 목록에서 그림자보다 앞이라 이미 표면 높이를 더한 뒤"* 라고 그 순서에
 * 기대고 있다. 앞에 붙이면 y 가 이중 가산된다.
 *
 * ⚠ 이미 그림자가 섞여 있으면 **먼저 걷어낸다.** 안 그러면 파일을 한 번 읽고 다시 저장할
 * 때마다 그림자가 배로 늘어난다.
 */
export function withShadows(parts: readonly PlacedPart[]): PlacedPart[] {
  const casters = stripShadows(parts);
  const out: PlacedPart[] = [...casters];
  for (const p of casters) {
    if (SHADOW_CASTERS.has(p.kind)) out.push(shadowOf(p));
  }
  return out;
}
