// world2/export/overlay.ts — **되읽은 목록을 파셀 단위로 되돌린다. 순수 함수만, three import 0.**
//
// ── 왜 이 층이 필요한가 ──────────────────────────────────────────────────────
// 되읽기가 내놓는 것은 **월드 좌표의 평평한 배열**이다(17,502개). 그런데 world2 가 소비하는
// 단위는 파셀이다 — 스트리밍이 파셀을 하나씩 올리고 내리면서 `parcelLayout(px,pz,tier)` 로
// 그 칸의 부품을 묻는다. 평평한 배열을 그대로 줄 자리가 없다.
//
// 그래서 여기서 **역색인을 만든다**: 월드 좌표 → 파셀 좌표 + 파셀 중심 기준 오프셋.
// `parcel-builder.ts` 의 `fill()` 이 하는 `ox + p.x` 를 거꾸로 푸는 것이다.
//
// 이 층이 있어서 되읽기가 스트리밍·슬롯 풀·LOD 를 **하나도 건드리지 않는다.** 배치를
// 어디서 얻느냐만 바뀌고, 그 뒤 기계는 전부 그대로다.
//
// ── tier 를 보지 않는다 ──────────────────────────────────────────────────────
// `layoutFor` 는 tier 를 인자로 받지 않는다. `fill()` 이 이미 `p.kind !== kind` 로 종류를
// 거르고, 어떤 종류를 그릴지는 `kindsFor(tier)` 가 정하기 때문이다. 즉 **전 목록을 주면
// tier 동작이 저절로 맞는다.**
//
// 그리고 그 편이 옳다 — 배치 판정의 불변식 ②가 *"tier 는 무엇을 그릴지만 줄이지 어디에
// 그릴지를 바꾸지 않는다"* 이다(`decide/parcel-layout.ts`). tier 와 무관한 목록은 그
// 불변식을 구조적으로 만족한다. tier 별로 다른 목록을 내면 그때 깨진다.

import type { ExportNode } from './collect.js';
import { maxPartsPerParcel } from '../parts/index.js';
import { DEFAULT_LAYOUT } from '../parts/types.js';
import type { LayoutOptions, PlacedPart, ResolvedLayout } from '../parts/types.js';

export interface OverlayStats {
  /** 부품이 하나라도 있는 파셀 수 */
  parcels: number;
  nodes: number;
  /** 종류별 "한 파셀에 몰린 최대 개수". 슬롯 예산과 대조하는 값이다 */
  peakPerParcel: Record<string, number>;
  /**
   * 슬롯 예산을 넘길 것으로 보이는 종류. 비어 있지 않으면 그 종류가 **조용히 덜 그려진다**
   * — 정확히는 `PooledParcelBuilder` 가 `starved` 로 신고하지만, 화면에는 "건물 몇 채가
   * 없다" 로만 보인다.
   */
  overBudget: { kind: string; peak: number; budget: number }[];
}

export interface WorldOverlay {
  /** 그 파셀의 부품. 없으면 빈 배열 — 스트리밍은 빈 파셀도 정상으로 다룬다 */
  layoutFor(px: number, pz: number): PlacedPart[];
  stats: OverlayStats;
}

/**
 * 되읽은 노드를 파셀별로 나눈다.
 *
 * ── 경계에 걸친 부품은 어느 파셀 것인가 ─────────────────────────────────────
 * `Math.round(x / cellX)` — 가장 가까운 파셀 중심에 붙인다. 사용자가 건물을 파셀 밖으로
 * 끌어내면 그 건물의 소속이 바뀌는데, **월드 위치는 그대로다**(px 와 오프셋이 함께
 * 조정되므로). 달라지는 것은 "어느 파셀과 함께 뜨고 지는가" 뿐이라 화면상 차이가 없다.
 *
 * 원본 배치는 부품을 셀 안에 가두지만(`margin`), 되읽기는 그 규칙을 강요하지 않는다 —
 * 편집의 목적이 배치를 바꾸는 것인데 여기서 도로 밀어 넣으면 편집이 무효가 된다.
 */
export function buildOverlay(nodes: readonly ExportNode[], opts: Partial<LayoutOptions> = {}): WorldOverlay {
  const layout: ResolvedLayout = { ...DEFAULT_LAYOUT, ...opts };
  const { cellX, cellZ } = layout;

  const byParcel = new Map<string, PlacedPart[]>();
  const peakPerParcel: Record<string, number> = {};
  // 파셀×종류별 개수 — peak 을 내려면 둘을 함께 세야 한다.
  const perParcelKind = new Map<string, number>();

  for (const n of nodes) {
    const px = Math.round(n.x / cellX);
    const pz = Math.round(n.z / cellZ);
    const key = `${px},${pz}`;
    let list = byParcel.get(key);
    if (list === undefined) { list = []; byParcel.set(key, list); }
    list.push({
      kind: n.kind, tone: n.tone,
      // 파셀 중심 기준 오프셋으로 되돌린다. `fill()` 이 `ox + p.x` 로 다시 더한다.
      x: n.x - px * cellX,
      y: n.y,
      z: n.z - pz * cellZ,
      ry: n.ry, sx: n.sx, sy: n.sy, sz: n.sz,
    });

    const pk = `${key}|${n.kind}`;
    const c = (perParcelKind.get(pk) ?? 0) + 1;
    perParcelKind.set(pk, c);
    if (c > (peakPerParcel[n.kind] ?? 0)) peakPerParcel[n.kind] = c;
  }

  const overBudget: OverlayStats['overBudget'] = [];
  for (const [kind, peak] of Object.entries(peakPerParcel)) {
    const budget = maxPartsPerParcel(kind, layout);
    if (peak > budget) overBudget.push({ kind, peak, budget });
  }

  return {
    layoutFor: (px, pz) => byParcel.get(`${px},${pz}`) ?? [],
    stats: { parcels: byParcel.size, nodes: nodes.length, peakPerParcel, overBudget },
  };
}
