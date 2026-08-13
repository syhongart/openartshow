// world2/edit/actions.ts — 씬을 **바꾸는** 조작: 놓기·복제·삭제·내보내기.
//
// 넷의 공통점은 «되돌리기 어렵거나 오래 걸린다» 이고, 그래서 넷 다 **화면에 말한다.**
// 조작이 안 먹는 것과 대상이 없는 것과 아직 받는 중인 것은 서로 다른 일이고, 그 구별이
// 화면에 없으면 전부 «또 안 먹네» 로 읽힌다 — 감독 신고 2026-08-12 가 그 형태였다.

import { reviewOverlay } from './export.js';
import type { OverlayEntry, OverlayHost } from './types.js';
import type { EditState } from './state.js';
import type { Panel } from './panel/dom.js';

export interface Actions {
  placeAt(src: string, at: { x: number; z: number }, blobUrl?: string): Promise<void>;
  duplicate(): Promise<void>;
  removeSelected(): void;
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
    if (!st.selected) { panel.say('먼저 물건을 클릭해 고르세요.'); return; }
    host.remove(st.selected);
    st.selected = null;
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

  return { placeAt, duplicate, removeSelected, exportNow, previewUrls };
}
