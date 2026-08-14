// world2/edit/actions.ts — 씬을 **바꾸는** 조작: 놓기·복제·삭제·내보내기.
//
// 넷의 공통점은 «되돌리기 어렵거나 오래 걸린다» 이고, 그래서 넷 다 **화면에 말한다.**
// 조작이 안 먹는 것과 대상이 없는 것과 아직 받는 중인 것은 서로 다른 일이고, 그 구별이
// 화면에 없으면 전부 «또 안 먹네» 로 읽힌다 — 감독 신고 2026-08-12 가 그 형태였다.

import { reviewOverlay } from './export.js';
import { canPlacePart, newPart, PART_LABEL } from '../decide/asset-library.js';
import { parcelOf } from '../decide/edit-pick.js';
import { maxPartsPerParcel } from '../parts/index.js';
import type { OverlayEntry, OverlayHost } from './types.js';
import { select, type EditState } from './state.js';
import { thawParcel } from './target.js';
import type { Panel } from './panel/dom.js';

export interface Actions {
  placeAt(src: string, at: { x: number; z: number }, blobUrl?: string): Promise<void>;
  /**
   * **마을 파츠**를 그 자리에 놓는다(W6 E). GLB 와 달리 로드가 없어 동기다.
   *
   * 놓는다 = 그 파셀의 배치 배열에 항목을 하나 더해 **동결**한다. 그래서 놓는 순간
   * 그 구역이 「손본 구역」이 되고 밀도 슬라이더에서 빠진다 — 화면이 그 사실을 말한다.
   */
  placePartAt(kind: string, at: { x: number; z: number }): void;
  duplicate(): Promise<void>;
  removeSelected(): void;
  /** 고른 마을 파츠가 속한 파셀의 동결을 푼다 */
  thawSelected(): void;
  exportNow(): void;
  /** 드래그드롭한 파일의 임시 주소. 복제할 때 같은 주소를 다시 쓴다 */
  readonly previewUrls: Map<string, string>;
}

/** 받은 바이트를 MB 로. 소수 한 자리면 12.9MB 짜리에서 눈에 띄게 움직인다 */
function mb(bytes: number): string {
  return (bytes / 1048576).toFixed(1);
}

export function createActions(host: OverlayHost, st: EditState, panel: Panel): Actions {
  const doc = host.doc;
  const previewUrls = new Map<string, string>();

  async function placeAt(src: string, at: { x: number; z: number }, blobUrl?: string): Promise<void> {
    if (st.busy) { panel.say('아직 불러오는 중입니다 — 끝나면 놓입니다.'); return; }
    st.busy = true;
    const label = src.replace(/^assets\/models\//, '');
    panel.say(`${label} 불러오는 중…`);
    try {
      const e = await host.place(
        src, { x: at.x, y: host.surfaceAt(at.x, at.z), z: at.z }, blobUrl,
        (pct, loaded) => {
          // `pct === null` 은 총 용량을 모른다는 뜻이다 — 지어내지 않고 받은 양만 적는다.
          panel.say(pct === null
            ? `${label} ${mb(loaded)}MB 받는 중…`
            : `${label} ${Math.round(pct)}% (${mb(loaded)}MB)`);
        },
      );
      if (!e) {
        // 예전엔 여기가 *"콘솔의 진단을 보세요"* 였는데 이 경로에 `console.*` 호출이
        // **0건**이었다 — 감독이 콘솔을 열어도 아무것도 없는 막다른 길이었다.
        const why = host.lastFailure();
        panel.say(why ? `놓지 못했습니다 — ${why}` : '놓지 못했습니다 — 파일을 읽을 수 없습니다.', true);
        return;
      }
      st.selected = e;
      // ⚠ **놓았으면 고르기를 푼다** (감독 신고 2026-08-13: *"지금은 클릭하면 다시
      // 선택되었으면 하는데.. 지금은 흩어뿌리기 식으로 되어 있어"*).
      //
      // 예전에는 `pendingSrc` 가 **팔레트 버튼으로만** 풀렸다. 그래서 한 번 고르면 그 뒤
      // 모든 지면 클릭이 «또 놓기» 가 됐고, 방금 놓은 것을 옮기려고 옆을 클릭하는 순간
      // 하나가 더 생겼다. 감독이 «흩어뿌리기» 라고 부른 것이 그것이다.
      //
      // **놓기는 한 번의 동작이고 그 다음은 다루기다** — 놓자마자 선택되므로 기즈모가
      // 바로 뜨고, 이어서 옮기고 돌리고 키울 수 있다. 여러 개를 연속으로 놓으려면 위에서
      // 다시 고르면 된다(그 안내를 화면에 적는다).
      st.pendingSrc = null;
      // 놓은 자리가 카메라 코앞이면 **건물 안에 갇힌 것처럼 보인다**(실측 2026-08-12:
      // 스폰 4m 앞에 26m 자산을 놓으니 벽이 화면을 채웠다). `glb-city` 가 *"원점이 곧
      // 스폰 지점인데 거기 미술관을 세워 조이스틱이 안 먹는 것처럼 보였다"* 로 이미 겪은
      // 축이다. 거기서는 칸을 비웠지만 여기서는 감독이 고른 자리를 옮길 수 없으니 **말한다.**
      panel.say('놓았습니다 — 기즈모로 옮기세요. 하나 더 놓으려면 위에서 다시 고르세요.');
    } finally {
      // 성공이든 실패든 잠금을 푼다 — `finally` 가 아니면 로드 실패 한 번이 편집을
      // 세션 내내 잠근다.
      st.busy = false;
      panel.refresh();
    }
  }

  /**
   * 마을 파츠를 놓는다(W6 E, 감독 카드 확정 *"마을 파츠부터 노출"*).
   *
   * ── 개수 불변식과 부딪히는 자리다 ─────────────────────────────────────────
   * 항목이 하나 늘면 재빌드가 GPU 인스턴스 슬롯을 하나 더 집는다. 상한은 **만들지 않고**
   * 파츠가 이미 신고한 `maxPartsPerParcel(kind)` 를 쓴다(근거는 `decide/asset-library.ts`
   * 의 「놓기 판정」 절 한 곳 — 여기에 다시 적지 않는다).
   *
   * ⚠ **이 호출은 `DEFAULT_LAYOUT` 을 쓴다**(인자를 안 넘긴다). 그런데 실제 슬롯 예산
   * (`systems/parcel-builder.ts` 의 `poolBudget`)이 보는 것은 `main.ts` 의 `LAYOUT` 이고,
   * 그것은 `?bld=`·`?tree=`·`?density=` 노브로 `villageLayout()` 이 만든 **다른 레이아웃일
   * 수 있다.** 두 곳이 서로 다른 layout 을 참조하는 값 미러링 형태다(검수관 비블로커 1).
   *
   * **지금은 안전하고, 안전한 이유가 우연이 아니다**: `decide/village-rules.ts:25` 의
   * `MUL_MIN = 1` 이 배수의 하한이고 `clampMul` 이 `Math.max(MUL_MIN, n)` 로 집행하므로,
   * 노브가 만든 `maxBuildings`·`maxTrees` 는 **언제나 `DEFAULT_LAYOUT` 값 이상**이다.
   * 즉 편집이 쓰는 상한이 실제 예산보다 **작은 쪽으로만** 어긋난다 — 더 엄격히 거절할
   * 뿐 초과 배치는 구조적으로 안 난다.
   *
   * ⚠⚠ **`MUL_MIN` 을 1 아래로 내리면 이 보장이 깨진다.** 그때는 노브가 예산을 줄이는데
   * 편집은 기본값 기준으로 허용해 초과가 성립한다. 그 값을 만지는 사람이 여기를 안 볼
   * 것이므로 **`village-rules.ts` 의 `MUL_MIN` 옆에도 이 종속을 적어 두었다.**
   *
   * ⚠ **거절은 반드시 말한다.** 조용히 안 놓이면 «가끔 안 먹는다» 가 되고, 그것이 이
   * 저장소에서 가장 비쌌던 형태다(감독 신고 2026-08-12 이 그랬다).
   */
  function placePartAt(kind: string, at: { x: number; z: number }): void {
    const village = host.village;
    if (!village) { panel.say('이 화면에서는 마을을 만질 수 없습니다.', true); return; }
    const p = parcelOf(at.x, at.z, host.cellX, host.cellZ);
    // ⚠ `partsAt` 은 **매 호출 새 배열**이다(`village-parcels.ts` 가 그렇게 보증한다).
    //   그래서 여기에 밀어 넣어도 저장소의 것이 오염되지 않는다 — `freeze` 가 확정한다.
    const parts = village.partsAt(p.px, p.pz);
    const v = canPlacePart(kind, parts, maxPartsPerParcel(kind));
    if (!v.ok) { panel.say(v.reason ?? '놓을 수 없습니다.', true); return; }
    // 높이는 **바닥 판이 정한다**(잔디 0.07 · 도로 0.14 · 광장 0). `surfaceAt` 이 계산
    // 배치와 같은 `surfaceY` 를 타므로 새로 놓은 것도 같은 높이에 앉는다.
    //
    // ⚠ 되돌림 노브 `?gsurf=` 의 배수는 **안 탄다** — 그 노브는 옛 화면과 나란히 보려고
    //   연 것이고 편집으로 놓은 것까지 따라가게 하면 저장된 값이 노브에 따라 달라진다.
    parts.push(newPart(kind, p.lx, p.lz, host.surfaceAt(at.x, at.z)));
    village.freeze(p.px, p.pz, parts);
    // 놓았으면 고르기를 푼다 — GLB 와 같은 이유다(감독 신고 2026-08-13 *"흩어뿌리기 식"*).
    st.pendingPart = null;
    panel.say(`${PART_LABEL[kind] ?? kind} 을(를) 놓았습니다 —`
      + ` 이 구역은 「손본 구역」이 됐습니다. 클릭해 고르면 옮길 수 있습니다.`);
    panel.refresh();
  }

  async function duplicate(): Promise<void> {
    if (!st.selected) { panel.say('먼저 물건을 클릭해 고르세요.'); return; }
    // 복제도 `host.place` 를 탄다. 원본이 캐시에 있으면 빨리 끝나지만 **미리보기(blob)는
    // 캐시 키가 달라 다시 받을 수 있으므로** 같은 잠금을 건다.
    if (st.busy) { panel.say('아직 불러오는 중입니다 — 끝나면 복제합니다.'); return; }
    st.busy = true;
    const s: OverlayEntry = st.selected;
    try {
      const e = await host.place(
        s.src, { x: s.x + 2, y: s.y, z: s.z + 2, ry: s.ry, s: s.s },
        s.preview ? previewUrls.get(s.src) : undefined,
      );
      if (e) st.selected = e;
    } finally {
      st.busy = false;
      panel.refresh();
    }
  }

  function removeSelected(): void {
    if (!st.target) { panel.say('먼저 물건을 클릭해 고르세요.'); return; }
    // 무엇을 지웠는지 말한다 — 마을 파츠는 지우면 **그 구역이 「손본 구역」이 된다.**
    // 되돌릴 방법이 있다는 것을 그 자리에서 알려야 «지웠는데 되살릴 수가 없다» 가 안 된다.
    const wasVillage = st.target.kind === 'village';
    if (!st.target.remove()) { panel.say('지울 수 없습니다.', true); return; }
    select(st, host, null);
    if (wasVillage) panel.say('지웠습니다 — 이 구역은 「손본 구역」이 됐습니다. 「구역 되돌리기」로 되살립니다.');
    panel.refresh();
  }

  /**
   * 고른 마을 파츠가 속한 **파셀의 동결을 푼다** — 계산 배치로 돌아간다.
   *
   * 파츠 하나만 되돌릴 수 없는 이유는 계약이다: 동결은 배열 전체이고, 계산 배치의
   * «그 하나» 를 가리킬 이름이 애초에 없다(`decide/overlay.ts` 가 길게 적은 그 문제).
   */
  function thawSelected(): void {
    const v = st.villageSel;
    if (!v) { panel.say('마을 건물이나 나무를 먼저 고르세요.'); return; }
    if (!v.frozen) { panel.say('이 구역은 아직 손대지 않았습니다 — 되돌릴 것이 없습니다.'); return; }
    if (!thawParcel(host, v)) { panel.say('되돌릴 수 없습니다.', true); return; }
    select(st, host, null);
    panel.say(`파셀 (${v.px}, ${v.pz}) 를 되돌렸습니다 — 계산 배치로 돌아갑니다.`);
    panel.refresh();
  }

  function exportNow(): void {
    const rev = reviewOverlay(host.toRaw());
    if (!rev.clean && !st.armed) {
      st.armed = true;
      const first = rev.badIndexes[0];
      if (first !== undefined) {
        st.selected = host.entries()[first] ?? null;
        panel.refresh();
      }
      panel.say(`⚠ ${rev.summary} — 한 번 더 누르면 이대로 저장합니다.`, true);
      return;
    }
    st.armed = false;
    const blob = new Blob([rev.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = 'world2-overlay.json';
    doc.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    panel.say(`저장했습니다 · ${rev.summary}`);
  }

  return { placeAt, placePartAt, duplicate, removeSelected, thawSelected, exportNow, previewUrls };
}
