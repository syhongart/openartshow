// world2/decide/multi-overlay.ts — **작가 문서 여럿을 한 마을로 놓는 계획.** 순수하다.
//
// ── 팀장 판정 (다) 의 집행부 (2026-08-16, W8-3 S5) ─────────────────────────
// *"**문서를 합치지 않는다.** 작가별 오버레이 문서를 각각 normalize 해서 각각 씬에
// 붙인다(그룹 분리). 계약(`decide/overlay.ts`)은 한 글자도 안 바꾼다."*
//
// 이 파일은 **계약을 안 바꾸고** 그 여럿을 어떻게 놓을지만 정한다. `loadOverlay` 를
// 문서마다 부르므로 마이그레이션·검증은 기존 그대로 돈다.
//
// ── ⚠ 층마다 처리가 다르다 — 이것이 이 파일의 전부다 ──────────────────────
// | `items`    | **문서별 그룹**으로 각각 붙인다 | 실패 격리가 여기서 성립한다 |
// | `parcels`  | 대장이 배정한 칸만 골라 **모아서 한 번** | `setAll` 이 전체 대체라서 |
// | `surfaces` | **무시하고 경고**              | 감독 카드 「마을 공통」 |
//
// **`parcels` 를 왜 합치는가**: `village-parcels.ts:169-181` 의 `setAll()` 이
// `index.clear()` 로 시작한다 — **문서마다 부르면 마지막 것만 남고**, 증상은
// «다른 작가 파셀이 안 보인다» 로만 난다. 대장이 칸 겹침을 미리 막으므로 합쳐도 안전하다.
//
// **`surfaces` 를 왜 버리는가**: 감독 카드가 바닥·잔디·도로 재질을 **마을 공통**으로
// 확정했다(2026-08-16). 재질은 종류당 하나를 온 세계가 공유하고(`parcel-assets.ts:29-31`)
// 그 전제 위에 `pools.seal()` 이 서 있다 — 작가별로 열면 부팅에 사용자 수를 미리 알아야
// 하고 드로우콜이 kind×owner 로 증식한다.
// ⚠ **버리되 조용히 삼키지 않는다.** `.GLB` 대문자 사고(`decide/overlay.ts:172-174`)가
// 이 저장소의 전례다 — 무시한 사실이 진단에 떠야 작가가 «왜 내 잔디가 안 바뀌지» 를 안다.
//
// ── 실패 격리 (팀장 병합 조건) ─────────────────────────────────────────────
// **한 문서가 깨져도 나머지가 산다.** 이 보장은 계약이 아니라 **여기**가 진다 — 계약에
// 「여러 문서」 개념을 넣으면 판정 (다)와 모순이기 때문이다. 그래서 팀장이
// *"한 문서를 일부러 깨뜨려 나머지가 렌더되는지 뮤테이션으로 확인하는 테스트"* 를
// 병합 조건으로 걸었고, 이 파일이 순수한 이유가 그것이다 — 브라우저 없이 실증된다.

import { loadOverlay, type OverlayItem, type FrozenParcel } from './overlay.js';
import { isPlotOf, type Ledger } from './village-ledger.js';

/**
 * 저장소가 읽어 온 문서 하나. **`raw` 가 `null` 이면 못 읽은 것**이다.
 *
 * ⚠ 실패 사유를 **문자열로 받아 그대로 실어 보낸다** — `store/types.ts` 의 `LoadFailure`
 * 를 import 하면 `decide/`(순수 판정)가 `store/`(I/O)를 알게 된다. 방향이 거꾸로다.
 */
export interface OverlayDoc {
  owner: string;
  raw: unknown | null;
  /** 못 읽은 이유. 화면·진단에 그대로 나간다 */
  failure?: string | null;
}

export type MergeReason =
  /** 문서를 못 읽었다 — 나머지는 그대로 선다 */
  | 'doc-unreadable'
  /** 대장에 없는 칸을 적어 보냈다 — **남의 땅이므로 버린다** */
  | 'parcel-not-owned'
  /** 작가 문서가 표면 재질을 적었다 — 마을 공통이라 무시한다 */
  | 'surfaces-ignored'
  /** 대장에 배정이 하나도 없는 작가 — 문서는 읽었지만 놓을 땅이 없다 */
  | 'no-plot';

export interface MergeIssue {
  owner: string;
  reason: MergeReason;
  /** `parcel-not-owned` 일 때 그 칸 */
  px?: number;
  pz?: number;
  /** `doc-unreadable` 일 때 저장소가 준 사유 */
  detail?: string;
}

/** 한 작가의 붙일 것들. **그룹이 곧 격리 단위다** */
export interface OverlayGroup {
  owner: string;
  items: OverlayItem[];
}

export interface MergePlan {
  /** 문서별 그룹. 순서는 대장 순서를 따른다 */
  groups: OverlayGroup[];
  /** 합친 동결 파셀. **대장 배정을 통과한 것만** */
  parcels: FrozenParcel[];
  issues: MergeIssue[];
}

/**
 * 문서들을 한 마을로 놓을 계획을 낸다. **던지지 않는다.**
 *
 * @param ledger 마을 대장. 배정이 곧 «누가 어느 칸을 쓸 수 있는가»
 * @param docs   작가별 날것. 순서가 곧 처리 순서다
 */
export function planMerge(ledger: Ledger, docs: readonly OverlayDoc[]): MergePlan {
  const groups: OverlayGroup[] = [];
  const parcels: FrozenParcel[] = [];
  const issues: MergeIssue[] = [];

  for (const doc of docs) {
    const { owner } = doc;

    if (doc.raw === null || doc.raw === undefined) {
      // **여기가 실패 격리다** — 이 문서만 건너뛰고 루프는 계속한다.
      issues.push({ owner, reason: 'doc-unreadable', detail: doc.failure ?? undefined });
      continue;
    }

    // ⚠ **문서마다 `loadOverlay` 를 부른다.** 합쳐서 한 번 부르면 한 문서의 `version`
    // 오타가 **모두를 날린다**(태스크 #53 이 적은 그 사각). 따로 부르면 그 문서만 빈다.
    //
    // 아래 `try/catch` 는 **지금 도달 불가다** — `loadOverlay` 는 어떤 입력에도 안 던지는
    // 계약이고, 그래서 **뮤테이션이 이 방어를 못 잡는다**(M2: `catch` 를 없애도 0 failed).
    // 그것을 알고 남긴다: 실패 격리는 **이 파일이 지는 보장**이고, 남의 계약이 안 던진다는
    // 사실에 기대면 그 보장이 남의 것이 된다. 계약이 던지게 바뀌는 날 이 줄이 유일한 방어다.
    // ⚠ **「검증됐다」고 적지 않는다** — 검출력 0인 채로 남는 것을 아는 상태로 둔다.
    let parsed;
    try {
      parsed = loadOverlay(doc.raw);
    } catch (e) {
      issues.push({
        owner,
        reason: 'doc-unreadable',
        detail: e instanceof Error ? e.message : String(e),
      });
      continue;
    }

    // 표면 재질은 마을 것이다 — 버리되 **말한다**.
    if (parsed.surfaces.length > 0) {
      issues.push({ owner, reason: 'surfaces-ignored' });
    }

    // 남의 땅에 앉히려는 파셀을 **여기서 막는다.** 안 막으면 남의 칸을 덮어쓴다.
    for (const p of parsed.parcels) {
      if (!isPlotOf(ledger, owner, p.px, p.pz)) {
        issues.push({ owner, reason: 'parcel-not-owned', px: p.px, pz: p.pz });
        continue;
      }
      parcels.push(p);
    }

    // ⚠ **`items` 는 대장으로 거르지 않는다.** 자유 좌표라 어느 칸인지 애매하고, 팀장
    // 판정이 *"소유자는 좌표 유도가 아니라 「어느 문서에서 왔는가」로 확정된다"* 로 그
    // 애매함을 **피하는 쪽**을 골랐다. 그룹 분리가 곧 소유 표시다.
    groups.push({ owner, items: parsed.items });

    // 문서는 읽혔는데 대장에 배정이 없다 — 건물은 서지만 파셀 동결은 안 먹는다.
    // 그 사실을 말해야 «왜 내 땅이 안 바뀌지» 를 작가가 안다.
    if (!ledger.plots.some((p) => p.owner === owner)) {
      issues.push({ owner, reason: 'no-plot' });
    }
  }

  return { groups, parcels, issues };
}

/** 계획 안의 총 배치 수. `diag.want` 가 이 값을 쓴다 */
export function totalItems(plan: MergePlan): number {
  let n = 0;
  for (const g of plan.groups) n += g.items.length;
  return n;
}
