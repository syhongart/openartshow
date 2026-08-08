// world2/parts/index.ts — **켜져 있는 파츠 목록. 여기가 유일한 선언 지점이다.**
//
// 파츠를 빼려면 이 배열에서 한 줄을 지운다. 넣으려면 한 줄을 넣는다. 종류 유니온·tier
// 구성·난수 시드·색 팔레트·슬롯 예산이 전부 이 목록에서 **유도된다** — 예전처럼 아홉
// 군데에 같은 사실을 나눠 적지 않는다.
//
// ── 순서의 의미 — **이제 룩을 바꾼다** ──────────────────────────────────────
// 이 배열 순서가 곧 **배치 우선순위**다. `parcelLayout` 이 앞서 놓인 것들을 뒤 파츠에
// 넘기고, 뒤 파츠는 그 자리를 피해 앉는다(`PlaceContext.placed`). 예전에는 순서가 배열
// 정렬에만 영향을 줬지만("실제 동작은 순서와 무관") 지금은 아니다.
//
// 감독 지시에서 바뀐 것이다 — *"나무 건물 가로등 겹쳐져 있는 것들이 보여."* 그 전까지
// 파츠는 서로를 몰랐고, 각자 도로만 피해 자리를 뽑았다.
//
// **자리가 굳은 것부터 놓는다:**
//
//   ground · garden · road    바닥 평면. `footprint` 가 0이라 경쟁에 끼지 않는다
//   fountain · clocktower     광장 랜드마크. 자리가 파셀 중앙으로 **고정**이라 양보 불가
//   building                  사분면에 1:1 배정. 가장 크고 자리 선택이 좁다
//   lamp                      도로 축 고정. 그려지지 않는 tier 에서도 자리는 예약된다
//   tree · bench · planter    남은 슬롯을 나눠 갖는다. 자리가 없으면 덜 놓인다
//
// 랜드마크를 나무 앞으로 옮긴 것이 이번 변경이다. 뒤에 있으면 나무가 먼저 중앙을 차지한
// 뒤 분수가 그 위에 박힌다 — `placed` 는 **앞선 것만** 담으므로 순서가 곧 보호 순위다.
//
// 순서를 바꾸면 배치 골든 스냅샷이 깨진다. 이제는 배열 순서만이 아니라 **세상 자체가**
// 달라지므로, 갱신 전에 겹침 게이트(`tests/world2-parcel-slots.test.ts`)를 먼저 본다.

import { DEFAULT_LAYOUT, type PartSpec, type LayoutOptions } from './types.js';
import { TINTS } from './palette.js';
import type { Tier } from '../decide/lod.js';
import { ground } from './ground.js';
import { road } from './road.js';
import { garden } from './garden.js';
import { plazaFloor } from './plaza.js';
import { building } from './building.js';
import { tower } from './tower.js';
import { tree } from './tree.js';
import { lamp } from './lamp.js';
import { fountain } from './fountain.js';
import { clocktower } from './clocktower.js';
import { bridge } from './bridge.js';
import { bench } from './bench.js';
import { planter } from './planter.js';

export const PARTS = [
  // 바닥 평면. `footprint` 가 0이라 경쟁에 끼지 않는다.
  //
  // **광장 바닥은 도로 뒤다** — 순서가 배치에는 아무 영향이 없지만(둘 다 반경 0),
  // 목록이 곧 층 순서를 읽는 자리이므로 y 가 낮은 것부터 적는다:
  // 정원 0.07 → 도로 0.14 → 광장 0.22. 광장이 도로를 덮는 것은 의도다(`plaza.ts`).
  ground, garden, road, plazaFloor,
  // 랜드마크. 자리가 **고정**이라 양보할 수 없다.
  //
  // **다리가 분수·시계탑보다 앞이다.** 자리를 강과 격자가 통째로 정하므로(난수 0)
  // 양보할 여지가 아예 없고, 셋 중 유일하게 **파셀 밖으로 뻗는다**. 실제로는 강가와
  // 중앙 광장이 겹치지 않아 다툴 일이 없다 — 순서는 그 사실이 언젠가 바뀔 때를 위한
  // 방어다(`tower` 를 `building` 앞에 둔 것과 같은 성격).
  bridge,
  fountain, clocktower,
  // 타워는 건물보다 **앞**이다. 파셀당 한 채가 중앙 고정이라 자리를 양보할 수 없고,
  // 건물은 사분면에서 뽑으므로 물러설 여지가 있다. 다만 지금은 `zoning.ts` 가 두
  // 파셀 집합을 배타로 가르므로 실제로 겹칠 일은 없다 — 순서는 그 판정이 언젠가
  // 느슨해질 때를 위한 방어다.
  tower,
  building, lamp,
  tree, bench, planter,
] as const;

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
  return BY_KIND.get(kind)?.tones ?? [TINTS.plain];
}

export { DEFAULT_LAYOUT };
export type { PartSpec, PlacedPart, PartAsset, LayoutOptions, ResolvedLayout, PlaceContext, ThreeNS } from './types.js';

/**
 * 발광을 신고한 파츠 — `PartSpec.neon` 을 가진 것들.
 *
 * ── 왜 목록이 여기 있고 판정이 저기 있는가 ──────────────────────────────────
 * `GROUND_KEYS` 는 `decide/ground-albedo.ts` 에 있는데 이것은 여기 있다. 갈린 이유는
 * **순환**이다: `parts/lamp.ts` 가 밤 세기 상수(`LAMP_MAX_GLOW`)를 `decide/night.ts`
 * 에서 되읽으므로, 저쪽이 `PARTS` 를 import 하면 고리가 닫힌다
 * (`parts/index` → `parts/lamp` → `decide/night` → `parts/index`).
 *
 * 지면 파츠는 밤 상수를 되읽지 않아 그 고리가 없었다. **같은 패턴이 한쪽에서만
 * 성립하는 것이 아니라, 의존 방향이 달라서 자리가 다른 것이다.**
 *
 * 어느 쪽이든 요점은 같다 — **목록을 손으로 나열하지 않는다.** 파츠에 `neon` 한 줄을
 * 적으면 저절로 집히고, 안 적으면 안 빛난다. 배선 쪽에 이름을 적어 두면 파츠를 추가할
 * 때마다 저쪽을 고쳐야 하고, 안 고치면 **조용히 안 빛난다** — 포크 직후가 정확히 그
 * 상태였다(`features/sky.ts` 가 `materialOf('lamp')` 한 종류만 만지고 있었다).
 */
export const NEON_PARTS: readonly { kind: string; day: number; night: number }[] =
  PARTS.filter((p) => p.neon !== undefined)
    .map((p) => ({ kind: p.kind, day: p.neon!.day, night: p.neon!.night }));
