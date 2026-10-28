// world2/export/overlay.ts — **되읽은 목록을 파셀 단위로 되돌린다. 순수 함수만, three import 0.**
//
// ── 왜 이 층이 필요한가 ──────────────────────────────────────────────────────
// 되읽기가 내놓는 것은 **월드 좌표의 평평한 배열**이다(28,704개). 그런데 world2 가 소비하는
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

import { parcelDrawn, type ExportNode } from './collect.js';
import { GRID_W, GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z, inGrid } from '../decide/grid.js';
import { parcelWater } from '../decide/water.js';
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
  /**
   * **좌표가 세계 밖인 부품 수.** 격자(30×30) 바깥으로 옮긴 것들이다.
   *
   * ⚠ **손실 신고가 아니다** — 격자로 클램프하므로 이런 부품도 가장자리 파셀에 실려
   * 뜨고 진다(월드 좌표는 그대로다). 실제로 사라진 수는 `dropped` 다. 이 값은
   * «사용자가 세계 밖에 뒀다» 를 알리는 정보다.
   *
   * **편집하지 않은 원본에서는 0 이다**(실측). 한때 196 이었는데 그것은 세계가 그런
   * 것이 아니라 `Math.round` 가 경계 램프를 격자 밖으로 밀어낸 탓이었다
   * (`roundHalfDown` 주석). 여기가 0 이 아니면 사용자가 실제로 옮긴 것이다.
   */
  outsideGrid: number;
  /**
   * 좌표가 물 파셀인 부품 수. 역시 **정보이지 손실이 아니다** — 이웃 육지 파셀에
   * 실린다(강 한복판이라 이웃이 다 물이면 그때 `dropped` 로 넘어간다).
   *
   * `outsideGrid` 와 같이 **원본에서는 0 이다**(한때 144 였고 원인도 같았다).
   */
  onWater: number;
  /**
   * **실을 파셀을 못 찾아 사라지는 부품 수.** 이것만이 손실 신고다.
   *
   * ── 이 필드가 생긴 이유 (실측 2026-08-25) ─────────────────────────────────
   * 처음에는 `Math.round` 로 파셀을 고르고 격자로 클램프했다. 그 판본은 **편집하지
   * 않은 원본을 되읽어도 340개를 잃었다** — 격자밖 196 · 물 144.
   *
   * **그 손실을 여기서 세게 만든 것이 원인을 찾게 했다.** 처음 진단은 «경계 부품은
   * 양쪽 파셀이 동률이라 소속을 복원할 수 없다» 였고, 그 위에서 클램프와 이웃 탐색을
   * 붙여 340 → 0 을 만들었다. **진단이 절반만 맞았다** — 복원 불가는 사실이지만 손실의
   * 원인은 그것이 아니라 `Math.round` 가 **동점을 위로 올린다**는 것 하나였다
   * (`roundHalfDown` 주석). 그것을 고치니 격자 밖·물로 나가는 부품이 **애초에 생기지
   * 않는다.**
   *
   * 남은 클램프·이웃 탐색은 **편집된 파일 전용**이다. 원본에서는 안 탄다.
   *
   * ── 도달 가능한가 (검수관 권고 P4, 2026-08-25) ────────────────────────────
   * 지형만 보면 도달 불가다 — 클램프가 격자 안을 보장하고, 격자 안에는 뭍이 861칸
   * 있으며, 링 상한이 격자 한 변이라 반드시 찾는다. 나는 그 근거로 이 갈래를 «죽은
   * 방어선» 으로 의심했고, 검수관이 **반증했다**: 좌표가 `NaN` 이면 클램프가 `NaN` 을
   * 그대로 통과시키고 링 탐색이 전부 실패해 **실제로 도달한다**(실측 `dropped = 1`).
   * 손상된 GLB 나 남의 도구가 낸 파일에서 나올 수 있는 값이다.
   *
   * 그리고 도달 불가였더라도 남길 값이었다 — «찾았다고 치고» 물 칸에 실으면 그 부품이
   * **조용히** 사라진다. 이것은 계기판이고, `expect(dropped).toBe(0)` 이 그것을 실제로
   * 읽고 있다(`parcelWater` 의 «광장 무조건 dry» 처럼 아무도 안 보는 분기가 아니다).
   */
  dropped: number;
}

export interface WorldOverlay {
  /** 그 파셀의 부품. 없으면 빈 배열 — 스트리밍은 빈 파셀도 정상으로 다룬다 */
  layoutFor(px: number, pz: number): PlacedPart[];
  stats: OverlayStats;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * 반올림하되 **동점(정확히 반 칸)은 아래 칸으로** 보낸다. `Math.round` 는 위로 올린다.
 *
 * ── 이 한 줄이 소속을 한 칸씩 밀고 있었다 (검수관 권고 P1, 2026-08-25) ──────
 * 램프는 파셀 **경계**에 선다. 그런데 실측해 보니 한쪽으로만 선다 — 전 격자·전 tier
 * 에서 반 칸 경계에 있는 부품은 램프 계열뿐이고 **`+16` 이 9,546개 · `-16` 이 0개**다
 * (도로 위상이 동쪽·남쪽 경계에만 가로등을 세운다).
 *
 * `Math.round` 는 `p + 0.5` 를 `p + 1` 로 올리므로 **그 램프 전부가 다음 칸으로
 * 넘어간다.** 원본 계산에서는 `parcelLayout(p, …)` 이 낸 것이니 `p` 가 그리는데,
 * 되읽기만 `p + 1` 에 싣는 것이다. 세계 안쪽에서는 서로 밀어내 균형이 맞지만
 * (그래서 예전 판본의 `overBudget` 이 0 이었다) 격자 끝·물가에서는 밀 곳이 없어
 * **한 칸에 두 칸 몫이 겹친다** — 검수관 실측으로 lamp 슬롯 풀이 84 인데 수요가 90 이
 * 됐고, 그러면 `starved` 가 올라 가로등이 조용히 덜 그려진다.
 *
 * 동점을 아래로 보내면 **전원이 제자리로 돌아온다.** 격자 밖으로 나가는 램프도,
 * 물 칸으로 넘어가는 램프도 애초에 생기지 않는다.
 *
 * ⚠ **이 규칙은 «반 칸 경계에 `-16` 이 없다» 는 전제 위에서만 옳다.** `-16` 이 생기면
 * 그쪽이 반대로 밀린다 — 좌표만으로는 원래 소속을 복원할 수 없기 때문이고, 그때는
 * 어느 반올림 규칙도 양쪽을 동시에 만족시키지 못한다. 그 전제를 산문으로 두지 않고
 * `tests/world2-export-wiring.test.ts` 가 전 격자를 훑어 단언한다.
 */
const roundHalfDown = (v: number) => Math.ceil(v - 0.5);

/**
 * 이웃을 몇 겹까지 뒤질 것인가(파셀). 클램프한 칸이 **물일 때만** 쓴다.
 *
 * 격자 한 변만큼 열어 둔다 — 뭍이 하나라도 있으면 반드시 찾는다. 넓어 보이지만 이
 * 탐색은 «클램프한 칸이 물인 부품» 에서만 돌고 그런 부품은 거의 `r = 1` 에서 끝난다
 * (강은 한두 줄이라 이웃이 곧 뭍이다). 상한을 좁게 잡으면 강을 넓히는 날 조용히
 * 손실이 살아나므로, 비용이 안 드는 쪽으로 넉넉히 연다.
 */
const RING_MAX = GRID_W;

/**
 * 이 부품을 실을 파셀. **좌표를 반올림한 칸이 아니라 「그려지는 칸 중 가까운 것」**.
 * 못 찾으면 `null` — 그 부품은 사라지고 `dropped` 가 센다.
 *
 * ── ① 격자 밖은 **클램프한다**(버리지 않는다) ──────────────────────────────
 * 사용자가 블렌더에서 건물을 세계 밖으로 끌어냈다면 그것은 **편집이다.** 되읽기가
 * 그것을 버리면 파일을 한 번 왕복시킨 대가로 편집이 사라진다 — 편집 도구로서 가장
 * 나쁜 실패다. 가장자리 칸에 실어 두면 월드 좌표가 보존되므로 다시 내보낼 때 그대로
 * 나간다.
 *
 * ⚠ 링 탐색으로는 이것을 못 푼다 — 세계에서 몇십 칸 밖이면 어느 이웃도 격자 안이
 * 아니다. 실제로 링만 돌던 판본이 `x = 40·32` 를 버렸다(검사가 잡았다).
 *
 * ── ② 물은 **이웃으로 비킨다** ──────────────────────────────────────────────
 * 사용자가 부품을 강 위로 옮긴 경우다. 물 칸은 스트리밍이 만들지 않으므로 그대로 두면
 * 사라진다.
 *
 * ⚠ **원본에서는 이 갈래가 안 탄다.** 한때 경계 램프 144개가 여기로 흘러들었는데,
 * 그것은 세계가 그런 것이 아니라 `Math.round` 가 그 램프를 강 쪽 칸으로 밀어낸
 * 탓이었다(`roundHalfDown`). 즉 ①②는 **편집된 파일 전용 안전망**이다.
 *
 * 어느 칸에 실리든 **월드 좌표는 보존된다**(px 와 오프셋이 함께 조정된다). 달라지는 것은
 * «어느 파셀과 함께 뜨고 지는가» 뿐이라 화면 위치가 안 변한다. 그러므로 그려지는 칸을
 * 고르는 데 망설일 이유가 없다.
 *
 * ⚠ **최근접을 보장하지는 않는다.** 링을 안쪽부터 훑어 처음 찾은 링에서 최소를 고른다 —
 * `r ≥ 2` 에서는 바깥 링에 더 가까운 칸이 있을 수 있다(링 r 의 대각선 `r·√2·cell` 이
 * 링 r+1 의 최단 `(r+0.5)·cell` 보다 멀어진다). 화면 위치가 안 변하므로 실익이 없어
 * 정확도를 사지 않았다. 원본 왕복은 `r ≤ 1` 에서 끝나 영향 자체가 없다.
 */
function hostParcel(
  x: number, z: number, cellX: number, cellZ: number,
): { px: number; pz: number } | null {
  // ① 격자로 먼저 끌어온다. 여기서부터가 «세계 안» 이다.
  const rx = clamp(roundHalfDown(x / cellX), GRID_MIN_X, GRID_MAX_X);
  const rz = clamp(roundHalfDown(z / cellZ), GRID_MIN_Z, GRID_MAX_Z);
  if (parcelDrawn(rx, rz, cellX, cellZ)) return { px: rx, pz: rz };

  // ② 그 칸이 물이면 이웃으로 비킨다.
  for (let r = 1; r <= RING_MAX; r++) {
    let best: { px: number; pz: number } | null = null;
    let bestD = Infinity;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        // 링의 **테두리만** 본다 — 안쪽은 이전 회차에서 이미 봤다.
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const px = rx + dx;
        const pz = rz + dz;
        if (!parcelDrawn(px, pz, cellX, cellZ)) continue;
        const ex = x - px * cellX;
        const ez = z - pz * cellZ;
        const d = ex * ex + ez * ez;
        if (d < bestD) { bestD = d; best = { px, pz }; }
      }
    }
    if (best) return best;
  }
  return null;
}

export function buildOverlay(nodes: readonly ExportNode[], opts: Partial<LayoutOptions> = {}): WorldOverlay {
  const layout: ResolvedLayout = { ...DEFAULT_LAYOUT, ...opts };
  const { cellX, cellZ } = layout;

  const byParcel = new Map<string, PlacedPart[]>();
  const peakPerParcel: Record<string, number> = {};
  // 파셀×종류별 개수 — peak 을 내려면 둘을 함께 세야 한다.
  const perParcelKind = new Map<string, number>();
  let outsideGrid = 0;
  let onWater = 0;
  let dropped = 0;

  for (const n of nodes) {
    // 좌표가 세계 밖·물 위였는지는 **정보로만 센다** — 배정은 아래가 따로 한다.
    const rawPx = roundHalfDown(n.x / cellX);
    const rawPz = roundHalfDown(n.z / cellZ);
    if (!inGrid(rawPx, rawPz)) outsideGrid++;
    else if (parcelWater(rawPx, rawPz, cellX, cellZ) === 'water') onWater++;

    // 실을 칸은 **그려지는 칸 중 가장 가까운 것**이다(`hostParcel` 주석).
    const host = hostParcel(n.x, n.z, cellX, cellZ);
    if (!host) { dropped++; continue; }
    const { px, pz } = host;
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
    // ── 없는 파셀에 `[]` 를 준다. `null` 이 아니다 (팀장 판정 2026-08-25, 조건 4) ──
    // `frozenAt` 계약에서 `null` 은 "내가 답할 것 없음"(다음 출처로 넘겨라), `[]` 는
    // "손대서 비웠다" 다. GLB 는 **세계 전체 대체** 모델이므로 파일에 없는 파셀은
    // 사용자가 블렌더에서 **지운 것**이다 — 그러므로 `[]` 가 맞다.
    //
    // ⚠ **`null` 로 바꾸는 안(B)을 검토해 기각했다.** 그러면 마을 편집·계산이 살아남아
    // 두 편집이 공존하지만, **지운 파셀이 되살아난다** — "지웠는데 남아 있다" 는 편집
    // 도구로서 더 나쁜 실패다. 팀장이 같은 근거로 기각했다.
    //
    // 재론 조건: 감독이 「GLB 와 마을 편집 동시 적용」을 명시 요구하는 회차.
    layoutFor: (px, pz) => byParcel.get(`${px},${pz}`) ?? [],
    stats: { parcels: byParcel.size, nodes: nodes.length, peakPerParcel, overBudget, outsideGrid, onWater, dropped },
  };
}
