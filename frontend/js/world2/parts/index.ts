// world2/parts/index.ts — **켜져 있는 파츠 목록. 여기가 유일한 선언 지점이다.**
//
// 파츠를 빼려면 이 배열에서 한 줄을 지운다. 넣으려면 한 줄을 넣는다. 종류 유니온·tier
// 구성·난수 시드·색 팔레트·슬롯 예산이 전부 이 목록에서 **유도된다** — 예전처럼 아홉
// 군데에 같은 사실을 나눠 적지 않는다.
//
// ── 순서의 의미 ──────────────────────────────────────────────────────────────
// 이 배열 순서가 곧 **배치 생성 순서**다. 종류마다 시드가 갈려 있어 순서가 난수에 영향을
// 주지는 않지만(그게 tier 포함관계 불변식의 근거다), `parcelLayout` 이 내는 배열의 순서는
// 이것을 따른다. 순서를 바꾸면 배치 골든 스냅샷이 깨진다 — 세상은 그대로지만 배열이
// 다르므로, 의도한 변경일 때만 스냅샷을 갱신한다.
//
// ── 순서에 하나 더 ───────────────────────────────────────────────────────────
// `road` 가 `building` 앞에 있다. 건물·나무·가로등이 `road-topology` 를 보고 길을 피해
// 자리를 잡으므로, 읽는 순서도 그렇게 두는 편이 흐름과 맞다. (실제 동작은 순서와 무관하다
// — 도로 위상은 좌표 해시로 정해지지 파츠 실행 순서에 기대지 않는다.)

import { DEFAULT_LAYOUT, type PartSpec, type LayoutOptions } from './types.js';
import type { Tier } from '../decide/lod.js';
import { ground } from './ground.js';
import { road } from './road.js';
import { building } from './building.js';
import { tree } from './tree.js';
import { lamp } from './lamp.js';
import { fountain } from './fountain.js';
import { clocktower } from './clocktower.js';

export const PARTS = [ground, road, building, tree, lamp, fountain, clocktower] as const;

/** 파츠 종류 유니온. 목록에서 유도되므로 파츠를 넣고 빼면 타입이 저절로 따라온다. */
export type PartKind = (typeof PARTS)[number]['kind'];

export const ALL_KINDS: readonly PartKind[] = PARTS.map((p) => p.kind as PartKind);

const BY_KIND = new Map<string, PartSpec>(PARTS.map((p) => [p.kind, p]));

/** 종류로 스펙을 찾는다. 없는 종류는 null — 호출자가 판단한다 */
export function specFor(kind: string): PartSpec | null {
  return BY_KIND.get(kind) ?? null;
}

/**
 * tier 별로 그릴 종류. **near 가 상위집합**이라는 규약이 각 파츠의 `tiers` 에 표현돼 있고,
 * 여기서는 그것을 모으기만 한다.
 */
export function kindsFor(tier: Exclude<Tier, 'none'>): readonly PartKind[] {
  return PARTS.filter((p) => p.tiers.includes(tier)).map((p) => p.kind as PartKind);
}

/**
 * 반경이 넓은 tier 부터. `outermostTierFor` 가 이 순서로 훑는다.
 *
 * 근거는 `validBands` 의 `nearExit ≤ midEnter < midExit ≤ farEnter < farExit` 이다 —
 * EXIT 반경이 near < mid < far 로 단조 중첩되므로 far 가 언제나 가장 넓다.
 */
const TIER_OUTWARD_IN = ['far', 'mid', 'near'] as const;

/**
 * 이 종류가 그려지는 **반경이 가장 넓은 tier**. 어디에도 없으면 null.
 *
 * 슬롯 예산이 여기서 나온다 — lamp 는 near 에만 있으므로 near 반경 안에 들어올 수 있는
 * 파셀 수만큼만 있으면 되고, 그건 far 반경 파셀 수의 1/3이다. 예산을 종류와 무관하게
 * "최대 파셀 수" 로 잡으면 tree·lamp 가 도달 불가능한 최악치를 잡고 앉아 있게 된다.
 */
export function outermostTierFor(kind: string): Exclude<Tier, 'none'> | null {
  const spec = BY_KIND.get(kind);
  if (!spec) return null;
  for (const t of TIER_OUTWARD_IN) if (spec.tiers.includes(t)) return t;
  return null;
}

/**
 * 종류별 최대 개수 — 슬롯 풀 예산의 근거.
 *
 * 이 값이 실제 배치보다 작으면 슬롯이 모자라 파셀이 조용히 덜 그려진다. 파츠가 스스로
 * 신고하고, `tests/world2-parts-registry.test.ts` 가 실제 배치 표본과 대조한다.
 */
export function maxPartsPerParcel(kind: string, opts: LayoutOptions = DEFAULT_LAYOUT): number {
  return BY_KIND.get(kind)?.maxPerParcel({ ...DEFAULT_LAYOUT, ...opts }) ?? 0;
}

/** 색 팔레트. 없는 종류는 흰색 — 눈에 띄어야 빠진 것을 안다 */
export function tonesFor(kind: string): readonly number[] {
  return BY_KIND.get(kind)?.tones ?? [0xffffff];
}

export { DEFAULT_LAYOUT };
export type { PartSpec, PlacedPart, PartAsset, LayoutOptions, ResolvedLayout, PlaceContext, ThreeNS } from './types.js';
