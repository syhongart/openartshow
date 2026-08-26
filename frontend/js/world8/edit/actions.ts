// world8/edit/actions.ts — 씬을 **바꾸는** 조작: 놓기·복제·삭제·내보내기.
//
// 넷의 공통점은 «되돌리기 어렵거나 오래 걸린다» 이고, 그래서 넷 다 **화면에 말한다.**
// 조작이 안 먹는 것과 대상이 없는 것과 아직 받는 중인 것은 서로 다른 일이고, 그 구별이
// 화면에 없으면 전부 «또 안 먹네» 로 읽힌다 — 감독 신고 2026-08-12 가 그 형태였다.

import { reviewOverlay } from './export.js';
import { pendingAssets, pendingNotice } from '../decide/upload-plan.js';
import { canPlacePart, newPart, PART_LABEL } from '../decide/asset-library.js';
import { parcelOf } from '../decide/edit-pick.js';
import { maxPartsPerParcel } from '../parts/index.js';
import type { ArtsPort } from '../systems/art-port.js';
import type { OverlayEntry, OverlayHost } from './types.js';
import { select, type EditState } from './state.js';
import { thawParcel } from './target.js';
import type { Panel } from './panel/dom.js';
import { parcelSnap, type EditHistory, type ParcelSnap } from './history-ops.js';
import { brushDots, strokeSeed, S_JITTER } from '../decide/brush.js';
import { radiusOf } from '../decide/parcel-layout.js';
import { inGrid } from '../decide/grid.js';
import { combine, type Undoable } from '../decide/history.js';
import type { PlacedPart } from '../parts/types.js';

export interface Actions {
  /** 고른 것(`pendingSrc`·`pendingPart`)을 푼다. 풀 것이 있었으면 `true` — 근거는 구현부 */
  cancelPending(): boolean;
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
  /**
   * **붓으로 그 자리에 여러 개 뿌린다** (2026-08-22, 감독 카드).
   *
   * `placePartAt` 이 `st.brushOn` 일 때 이리로 넘긴다 — 클릭 경로를 가르지 않으므로
   * `edit/input.ts` 는 **한 줄도 안 바뀐다**(그 파일은 683줄 동결이다).
   */
  paintAt(kind: string, at: { x: number; z: number }): void;
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

/**
 * @param history 되돌리기 스택(2026-08-22). **선택 사양이 아니다** — 안 넘기면 놓기·
 *                삭제가 조용히 안 쌓이고, 그러면 Ctrl+Z 가 **그 앞의 조작**을 되돌린다.
 *                「배선을 빠뜨리면 검사가 아니라 `tsc` 가 막는다」는 이 저장소의 처방
 *                (`edit/target-art.ts` 의 `onLost` 절)을 그대로 따른다.
 * @param arts 벽에 걸린 작품(W8-4 D3). **생략 가능** — 없으면 「보낼 준비가 됐다」가
 *             GLB 만 센다(구소비자의 기존 동작 그대로).
 */
export function createActions(
  host: OverlayHost, st: EditState, panel: Panel, history: EditHistory, arts?: ArtsPort,
): Actions {
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
      // 놓은 것을 되돌릴 수 있게 쌓는다. **`select` 보다 먼저 쌓을 이유가 없다** —
      // 되돌리기는 선택을 안 건드린다(`history-ops.ts` 헤더).
      history.add(history.ops.placed(e, '놓기'));
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
    // 붓 모드면 여러 개를 뿌린다. **여기서 가르는 것이 요점** — 클릭을 받는 쪽
    // (`edit/input.ts`)은 「파츠를 놓는다」만 알면 되고, 「어떻게 놓는가」는 여기 하나다.
    if (st.brushOn) { paintAt(kind, at); return; }
    const village = host.village;
    if (!village) { panel.say('이 화면에서는 마을을 만질 수 없습니다.', true); return; }
    const p = parcelOf(at.x, at.z, host.cellX, host.cellZ);
    // ⚠ `partsAt` 은 **매 호출 새 배열**이다(`village-parcels.ts` 가 그렇게 보증한다).
    //   그래서 여기에 밀어 넣어도 저장소의 것이 오염되지 않는다 — `freeze` 가 확정한다.
    const parts = village.partsAt(p.px, p.pz);
    const v = canPlacePart(kind, parts, maxPartsPerParcel(kind));
    if (!v.ok) { panel.say(v.reason ?? '놓을 수 없습니다.', true); return; }
    // ⚠ **`parts.push` 보다 먼저 뜬다.** `partsAt` 은 매 호출 새 배열이지만 **항목은
    // 공유**이므로(`parcelSnap` 주석), 스냅샷을 나중에 뜨면 방금 민 것까지 들어간다.
    const before = parcelSnap(village, p.px, p.pz);
    // 높이는 **바닥 판이 정한다**(잔디 0.07 · 도로 0.14 · 광장 0). `surfaceAt` 이 계산
    // 배치와 같은 `surfaceY` 를 타므로 새로 놓은 것도 같은 높이에 앉는다.
    //
    // ⚠ 되돌림 노브 `?gsurf=` 의 배수는 **안 탄다** — 그 노브는 옛 화면과 나란히 보려고
    //   연 것이고 편집으로 놓은 것까지 따라가게 하면 저장된 값이 노브에 따라 달라진다.
    parts.push(newPart(kind, p.lx, p.lz, host.surfaceAt(at.x, at.z)));
    village.freeze(p.px, p.pz, parts);
    history.add(history.ops.parcel(before, `${PART_LABEL[kind] ?? kind} 놓기`));
    // 놓았으면 고르기를 푼다 — GLB 와 같은 이유다(감독 신고 2026-08-13 *"흩어뿌리기 식"*).
    st.pendingPart = null;
    panel.say(`${PART_LABEL[kind] ?? kind} 을(를) 놓았습니다 —`
      + ` 이 구역은 「손본 구역」이 됐습니다. 클릭해 고르면 옮길 수 있습니다.`);
    panel.refresh();
  }

  /**
   * 붓질 한 번 (2026-08-22, 감독 카드 「브러시로 여러 개 뿌리기」).
   *
   * ── 이 함수가 하는 일은 **거르기**다 ────────────────────────────────────────
   * 「어디에 찍을까」는 `decide/brush.ts` 가 순수 함수로 답하고, 여기는 그 점들을
   * 세계의 규칙에 통과시킨다. 거르는 축이 셋이고 **각 판정의 소유자가 이미 있다**:
   *
   *   격자 밖   `inGrid`                     — 없으면 안 그려지는 파셀을 동결시킨다
   *   파셀 상한 `canPlacePart`               — 넘기면 «구역이 조용히 덜 그려진다»
   *   점 간격   `radiusOf`(→ `brushDots`)    — 없으면 나무가 서로 파고든다
   *
   * ⚠ **물 위 판정은 안 한다.** 하나씩 놓기(`placePartAt`)도 안 하므로 여기서만 하면
   * 두 경로의 규칙이 갈린다. 붓이 반경 때문에 물에 걸칠 확률이 더 높은 것은 사실이라
   * **알고 남기는 구멍**이다 — 재론 조건은 감독이 「물 위에 나무가 섰다」고 말하는 것이다.
   *
   * ── 되돌리기는 **한 항목**이다 ──────────────────────────────────────────────
   * 한 붓질이 파셀 넷까지 바꾸는데(반경 상한이 셀 절반), 파셀마다 쌓으면 무르는 데
   * Ctrl+Z 를 넷 눌러야 하고 그 사이 화면은 반쯤 지워진 숲이 된다. 근거는
   * `decide/history.ts` 의 `combine` 한 곳이다.
   */
  function paintAt(kind: string, at: { x: number; z: number }): void {
    const village = host.village;
    if (!village) { panel.say('이 화면에서는 마을을 만질 수 없습니다.', true); return; }
    const cap = maxPartsPerParcel(kind);
    const name = PART_LABEL[kind] ?? kind;
    st.strokeNo += 1;
    const dots = brushDots({
      cx: at.x, cz: at.z,
      radius: st.brushRadius,
      count: st.brushCount,
      seed: strokeSeed(at.x, at.z, st.strokeNo),
      // 간격은 **파츠가 신고한 점유 반경의 두 배**다 — 두 그루가 서로의 반경 밖에 서려면
      // 중심 거리가 반경 합이어야 하고, 같은 종류이므로 그것이 곧 지름이다.
      //
      // ⚠ **크기 변주를 함께 반영한다**(검수관 권고 P4, 2026-08-22). `radiusOf` 는 `s=1`
      // 기준인데 붓은 `S_JITTER` 만큼 키우므로, 안 곱하면 **큰 쪽 둘이 만났을 때 그만큼
      // 파고든다.** 최악(둘 다 최대)을 기준으로 잡는다 — 간격은 넉넉한 쪽 오차가 싸다
      // (조금 성기게 뿌려질 뿐, 파고들면 화면이 깨진다).
      minGap: radiusOf(newPart(kind, 0, 0, 0)) * 2 * (1 + S_JITTER),
    });

    /** 파셀별로 모은다 — 동결은 파셀 단위이고 한 파셀에 여럿을 넣어도 `freeze` 는 한 번이다 */
    const touched = new Map<string, {
      px: number; pz: number; parts: PlacedPart[]; before: ParcelSnap;
    }>();
    let placed = 0;
    for (const d of dots) {
      const p = parcelOf(d.x, d.z, host.cellX, host.cellZ);
      if (!inGrid(p.px, p.pz)) continue;
      const key = `${p.px},${p.pz}`;
      let slot = touched.get(key);
      if (!slot) {
        // ⚠ **스냅샷은 이 파셀을 처음 만질 때 뜬다** — 두 번째 점에서 다시 뜨면
        // 「첫 점을 넣은 뒤」가 기준이 되어 되돌리기가 그 하나를 남긴다.
        slot = { px: p.px, pz: p.pz, parts: village.partsAt(p.px, p.pz), before: parcelSnap(village, p.px, p.pz) };
        touched.set(key, slot);
      }
      if (!canPlacePart(kind, slot.parts, cap).ok) continue;
      const part = newPart(kind, p.lx, p.lz, host.surfaceAt(d.x, d.z));
      // 붓의 성질(무작위 회전·크기 변주)을 여기서 얹는다 — `newPart` 는 「하나씩 놓기」의
      // 기본값(정면·×1)을 소유하고, 그것을 바꾸면 두 경로가 함께 바뀐다.
      slot.parts.push({ ...part, ry: d.ry, sx: part.sx * d.s, sy: part.sy * d.s, sz: part.sz * d.s });
      placed += 1;
    }

    if (placed === 0) {
      // ⚠ **조용히 끝내지 않는다.** 아무것도 안 놓였는데 화면이 침묵하면 «가끔 안 먹는다»
      // 가 되고, 그것이 이 저장소에서 가장 비쌌던 형태다(감독 신고 2026-08-12).
      panel.say(dots.length === 0
        ? `${name} 을(를) 놓을 자리가 없습니다 — 붓 크기를 키워 보세요.`
        : `${name} 을(를) 놓지 못했습니다 — 세계 밖이거나 이 구역이 가득 찼습니다.`, true);
      return;
    }

    const undos: Undoable[] = [];
    for (const t of touched.values()) {
      village.freeze(t.px, t.pz, t.parts);
      const u = history.ops.parcel(t.before, `${name} 붓질`);
      if (u) undos.push(u);
    }
    history.add(combine(`${name} 붓질`, undos));
    // 요청과 실제를 **함께** 말한다 — 「12개」만 적으면 감독이 슬라이더를 20으로 두고도
    // 12개가 나온 이유를 알 수 없다.
    const short = st.brushCount - placed;
    panel.say(`${name} ${placed}개를 뿌렸습니다`
      + (short > 0 ? ` (요청 ${st.brushCount}개 중 ${short}개는 자리가 없어 건너뛰었습니다)` : '')
      + ` · 구역 ${touched.size}칸이 「손본 구역」이 됐습니다. 이어서 문지를 수 있습니다.`);
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
      if (e) {
        st.selected = e;
        history.add(history.ops.placed(e, '복제'));
      }
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
    // ── 되돌리기 스냅샷은 **지우기 전에** 뜬다 (2026-08-22) ────────────────────
    // 지운 뒤에는 «무엇이 있었나» 를 물을 데가 없다. 세 저장소의 단위가 각각 다른 이유는
    // `edit/history-ops.ts` 헤더 한 곳이다 — 여기서는 그 셋을 각각 뜨기만 한다.
    //
    // ⚠ **`kind` 로 갈라 하나만 뜨지 않는다.** 셋 다 뜨고 «채워진 것» 을 쓴다 — `kind` 와
    // 실제로 채워진 칸이 어긋나면(어댑터가 `null` 로 떨어지는 경로가 있다) 조용히 아무것도
    // 안 쌓이고, 그것이 이 회차가 막으려는 «가끔 안 먹는다» 그 자체다.
    const goneEntry = st.selected;
    const goneAt = goneEntry ? host.entries().indexOf(goneEntry) : -1;
    const v = st.villageSel;
    const beforeParcel = v && host.village ? parcelSnap(host.village, v.px, v.pz) : null;
    const beforeArts = st.artSel !== null && arts ? arts.list() : null;
    if (!st.target.remove()) { panel.say('지울 수 없습니다.', true); return; }
    if (goneEntry && goneAt >= 0) history.add(history.ops.removed(goneEntry, goneAt, '삭제'));
    else if (beforeParcel) history.add(history.ops.parcel(beforeParcel, '삭제'));
    else if (beforeArts) history.add(history.ops.arts(beforeArts, '삭제'));
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
    const before = host.village ? parcelSnap(host.village, v.px, v.pz) : null;
    if (!thawParcel(host, v)) { panel.say('되돌릴 수 없습니다.', true); return; }
    // 「구역 되돌리기」 자체도 되돌린다 — 손본 배치를 통째로 버리는 조작이라 오히려
    // 여기가 되돌리기가 가장 필요한 자리다.
    if (before) history.add(history.ops.parcel(before, '구역 되돌리기'));
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
    // ── 「올렸다」가 아니라 「보낼 준비가 됐다」 (W8-3 S7) ───────────────────
    // 드롭한 GLB 는 `src` 형식이 계약에 맞으므로 관문(`reviewOverlay`)이 **깨끗하다고
    // 판정한다** — 그런데 그 파일은 저장소에 없다. 이 줄이 없으면 «저장했습니다» 가
    // 거짓이 되고, 작가는 라이브의 빈 자리를 보고서야 안다. 근거는
    // `decide/upload-plan.ts` 헤더 한 곳이다.
    // ⚠ **두 미리보기 집합을 합친다**(D3). GLB 는 이 파일이 들고(`previewUrls`) 작품은
    // 포트가 든다(`arts.localOnly()`) — 소유자가 다르므로 합치는 자리가 여기 하나다.
    // 한쪽만 넘기면 «저장했습니다» 가 그 종류에 대해서만 거짓이 되고, 그 어긋남은
    // 라이브의 빈 자리로만 드러난다.
    const local = new Set(previewUrls.keys());
    for (const s of arts?.localOnly() ?? []) local.add(s);
    const pending = pendingAssets(rev.json, local);
    const notice = pendingNotice(pending);
    panel.say(`저장했습니다 · ${rev.summary}${notice ? ` — ${notice}` : ''}`, notice !== '');
  }

  /**
   * 🔴 **고른 것을 취소한다** (태스크 #97, 2026-08-20). 취소했으면 `true`.
   *
   * ── 왜 필요했나 ────────────────────────────────────────────────────────
   * 그전에는 취소하는 문이 **그 팔레트 버튼을 다시 누르는 것 하나**였다. 「고른 상태」는
   * 화면에 크게 안 드러나는데(커서가 안 바뀐다) **지면을 클릭하면 물건이 생긴다** —
   * 그래서 취소를 모르면 의도치 않게 놓게 되고, 놓은 것을 다시 지워야 한다.
   *
   * ⚠ **선택(놓은 뒤)은 안 건드린다.** 고른 것(`pendingSrc`·`pendingPart`)과 선택한 것
   * (`selected`·`villageSel`)은 다른 축이고, 후자를 함께 풀면 «크기를 조절하다 `Esc` 를
   * 눌렀더니 대상이 사라진다» 가 된다.
   *
   * ⚠ **`false` 를 내는 것이 계약의 절반이다** — 부르는 쪽이 그때 이벤트를 삼키지 않아야
   * 다른 `Esc` 소비자가 살아 있다. 고를 것이 없을 때 조용히 `true` 를 내면 «아무것도 안
   * 골랐는데 `Esc` 가 먹통» 이 된다.
   *
   * 편집을 끄는 경로(`mode.ts`)도 같은 둘을 비운다 — 거기서는 조준·드래그까지 함께
   * 정리하므로 이 함수를 부르지 않는다(그쪽이 더 넓다).
   */
  function cancelPending(): boolean {
    if (!st.pendingSrc && !st.pendingPart) return false;
    st.pendingSrc = null;
    st.pendingPart = null;
    panel.say('고른 것을 취소했습니다 — 지면을 클릭해도 놓이지 않습니다.');
    panel.refresh();
    return true;
  }

  return {
    placeAt, placePartAt, paintAt, duplicate, removeSelected, thawSelected, exportNow,
    cancelPending, previewUrls,
  };
}
