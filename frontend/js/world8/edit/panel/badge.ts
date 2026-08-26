// world2/edit/panel/badge.ts — **지금 무엇을 골랐는지, 화면에 큰 글씨로.**
//
// 감독 지시 2026-08-13: *"내가 뭘 선택했는지 나오게 해줘."* 카드 확인: **화면에 큰 글씨로.**
//
// ── 왜 지금 것으로는 안 보였나 (조사 실측) ──────────────────────────────────
// 가림은 원인이 **아니다** — 선택 링·기즈모 둘 다 `depthTest:false` 에 `renderOrder`
// 999/1000 이라 건물에 파묻혀도 위에 그려진다. 실제 원인은 넷이었다:
//
//   ① 선택 링만 **월드 고정 크기**(마을 파츠 2.2m 상수)라 멀어지면 점이 된다.
//      기즈모는 카메라 거리에 비례해 커지는데 링만 안 커진다
//   ② 링이 **지면에 완전히 눕혀져** 있어(`rotation.x = -π/2`) 눈높이 카메라에서 거의
//      선이다. 게다가 띠 두께가 반지름의 14%뿐이라 마을 파츠 기준 **폭 0.31m** 다
//   ③ 가장 강한 표시(아웃라이너의 보라 채움)가 **1024px 미만에서 통째로 사라지고**,
//      GLB 오버레이는 화면 폭과 무관하게 아웃라이너에 **아예 안 나온다**
//   ④ 선택 문구가 오른쪽 위 패널 안 **11px 청록 글자**다 — 클릭한 자리는 화면 중앙인데
//
// 즉 **표시가 없던 게 아니라 전부 작고 구석에 있었다.** 그래서 크게, 가운데 위로.
//
// ── 왜 왼쪽이 아니라 상단 중앙인가 ──────────────────────────────────────────
// `css.ts` 헤더가 **왼쪽을 쓰지 말라**고 못 박았다 — 터치 조이스틱 판정 영역이 화면 왼쪽
// 절반 전체이고(`decide/touch.ts` 의 `x < viewportWidth / 2`), 거기에 뭘 두면 그 위
// 터치가 캔버스에 도달조차 못 한다. 감독 신고 2026-08-12 의 근거다.
//
// 상단 중앙은 조이스틱과도, 오른쪽 패널과도, 왼쪽 아웃라이너와도 안 겹친다.
//
// ⚠ **포인터 이벤트를 안 받는다**(`pointer-events:none`). 화면 한가운데 뜨는 것이라
// 클릭을 먹으면 그 자리의 건물을 영영 못 고른다.
//
// ⚠ `innerHTML` 을 쓰지 않는다 — 이 저장소의 UI 규약(`knob-bar.ts` 의 XSS 근거).

import type { OverlayHost } from '../types.js';
import type { EditState } from '../state.js';
import { describeShort } from '../target.js';

export interface Badge {
  readonly root: HTMLElement;
  /** 선택이 바뀌었을 때. 문안을 다시 쓰고 숨김을 정한다 */
  sync(): void;
  /** 모드가 바뀌었을 때 — 주행 중에는 안 보인다 */
  setMode(editing: boolean): void;
  dispose(): void;
}

export function createBadge(host: OverlayHost, st: EditState): Badge {
  const doc = host.doc;

  const root = doc.createElement('div');
  root.id = 'w8-badge';
  const name = doc.createElement('div');
  name.className = 'name';
  root.appendChild(name);
  doc.body.appendChild(root);

  /**
   * 지금 이 파셀이 동결됐는가 — **저장소에 직접 묻는다.**
   *
   * `st.villageSel.frozen` 은 **고른 순간의 스냅샷**이라 조작해서 동결시켜도 안 바뀐다.
   * 그러면 «방금 손봤는데 손본 구역이 아니라고 한다» 가 된다.
   */
  function frozenNow(): boolean {
    const v = st.villageSel;
    if (!v) return false;
    return host.village?.isFrozen(v.px, v.pz) ?? v.frozen;
  }

  function sync(): void {
    const base = st.target ? describeShort(st.target, st.selected, st.villageSel) : null;
    const label = base === null ? null : base + (frozenNow() ? ' · 손본 구역' : '');
    // **아무것도 안 골랐으면 숨긴다.** 「선택: 없음」을 크게 띄우는 것은 화면을 가릴 뿐이고,
    // 옛 이름이 남아 있는 것은 그보다 나쁘다(아웃라이너와 같은 판단).
    root.dataset.on = label ? '1' : '0';
    name.textContent = label ?? '';
  }

  return {
    root,
    sync,
    setMode(editing: boolean): void {
      root.dataset.mode = editing ? 'edit' : 'drive';
    },
    dispose(): void { root.remove(); },
  };
}
