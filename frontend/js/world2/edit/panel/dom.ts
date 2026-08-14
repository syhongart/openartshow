// world2/edit/panel/dom.ts — 패널을 짓고, **화면에 말한다**.
//
// ── 이 파일이 소유하는 것 ───────────────────────────────────────────────────
// `say()`(한 줄 상태)와 `refresh()`(선택·개수·경고 갱신). 편집의 거의 모든 동작이 끝에
// 이 둘을 부르므로, 여기가 «화면이 지금 무엇을 말하고 있는가» 의 단일 지점이다.
//
// ── 왜 조작 버튼(회전·크기·높이)까지 여기인가 ──────────────────────────────
// 그 버튼들이 하는 일은 «선택된 항목의 수를 한 칸 옮기고 반영» 뿐이고, **선택이 없을 때
// 무엇을 말하는가**가 그 동작의 절반이다(아래 `nudge`). 동작과 안내를 갈라 두면 한쪽만
// 고쳐져 «버튼은 말하는데 키는 침묵» 같은 어긋남이 난다 — 이 저장소가 실제로 겪은 형태다
// (`input.ts` 의 키 핸들러 주석).
//
// ⚠ `innerHTML` 을 쓰지 않는다 — 이 저장소의 UI 규약이다(`knob-bar.ts` 의 XSS 근거).

import type { OverlayHost, VillagePick } from '../types.js';
import { RY_STEP, S_STEP, Y_STEP, type EditState } from '../state.js';
import { describe as describeTarget, nudgeScale, type EditTarget } from '../target.js';
import { CSS } from './css.js';
import { createInspector } from './inspector.js';
import { createOutliner } from './outliner.js';
import { createBadge } from './badge.js';
import type { ViewSide } from '../../decide/orbit.js';
import { SHADING_LABEL, SHADING_MODES, type ShadingMode } from '../../decide/shading.js';

/** 패널이 «자기가 못 하는 일» 을 넘기는 곳. 조립자(`mode.ts`)가 채운다. */
export interface PanelHandlers {
  toggleEditing(): void;
  duplicate(): void;
  removeSelected(): void;
  /** 고른 마을 파츠가 속한 파셀을 계산 배치로 되돌린다 */
  thawSelected(): void;
  /**
   * 아웃라이너 목록에서 골랐다. **3D 클릭과 같은 `select()` 로 이어져야 한다** —
   * 갈라지면 «목록으로 고른 것은 기즈모가 안 붙는다» 가 난다.
   */
  pickVillage(v: VillagePick): void;
  /** 정해진 시점으로 간다(W6). **키와 같은 함수로 이어져야 한다** */
  setView(side: ViewSide | 'focus'): void;
  /** 셰이딩을 그 모드로(W6). 위와 같은 이유로 키와 한 함수다 */
  setShading(m: ShadingMode): void;
  exportNow(): void;
}

export interface Panel {
  readonly root: HTMLElement;
  /** 팔레트 버튼이 들어갈 자리 */
  readonly palette: HTMLElement;
  say(msg: string, warn?: boolean): void;
  refresh(): void;
  /** 모드가 바뀌었을 때 겉모습(펼침·토글 라벨·강조)을 맞춘다 */
  setMode(editing: boolean): void;
  /** 모드 전환 안내는 평범한 note 보다 크게 말한다 */
  sayLead(msg: string): void;
  el(tag: string, cls?: string, text?: string): HTMLElement;
  button(label: string, onClick: () => void): HTMLButtonElement;
  dispose(): void;
}

export function createPanel(
  host: OverlayHost,
  st: EditState,
  handlers: PanelHandlers,
  /** `refresh()` 끝에 불린다 — 선택 링 갱신처럼 DOM 밖의 후속을 조립자가 건다 */
  onRefresh: () => void,
): Panel {
  const doc = host.doc;

  const style = doc.createElement('style');
  style.textContent = CSS;
  doc.head.appendChild(style);

  const panel = doc.createElement('div');
  panel.id = 'w2-edit';

  const el = (tag: string, cls?: string, text?: string): HTMLElement => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const button = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  };

  const title = el('h4', undefined, '배치 편집');
  const palette = el('div', 'row pal');
  const selLine = el('div', 'sel', '선택: 없음');
  const rowRot = el('div', 'row');
  const rowScale = el('div', 'row');
  const rowY = el('div', 'row');
  const rowOps = el('div', 'row');
  const rowOut = el('div', 'row');
  const rowView = el('div', 'row');
  const rowShade = el('div', 'row');
  const inspector = createInspector(host, st, () => { refresh(); });
  // 아웃라이너는 **패널 밖**에 산다(왼쪽 별도 컨테이너). 넓은 화면에서만 보이는 것은
  // CSS 가 정하고 여기서는 폭을 모른다 — `css.ts` 의 미디어 쿼리 한 곳이 판정한다.
  const outliner = createOutliner(host, st, (v) => { handlers.pickVillage(v); });
  // 배지도 패널 **밖**에 산다(화면 상단 중앙). 근거는 `badge.ts` 헤더 한 곳이다 —
  // 「뭘 골랐는지」를 크게 말하는 것이 이 회차 감독 요구다.
  const badge = createBadge(host, st);
  const status = el('div', 'note', 'GLB 를 이 화면에 끌어다 놓거나, 위에서 골라 지면을 클릭.');
  const hint = el('div', 'note', '');
  /** 접힘/펼침 + 편집/주행을 함께 쥔 버튼. 접혔을 때 화면에 남는 유일한 것이다 */
  const toggle = button('✏️ 편집', () => { handlers.toggleEditing(); });
  toggle.className = 'toggle';

  const nudge = (fn: (t: EditTarget) => void) => () => {
    if (!st.target) { say('먼저 물건을 클릭해 고르세요.'); return; }
    fn(st.target);
    st.target.apply();
    // 버튼 한 번은 «조작이 끝났다» 이다 — 드래그와 달리 이어질 프레임이 없다.
    st.target.commit();
    refresh();
  };

  rowRot.append(
    button('↺ 회전', nudge((e) => { e.ry -= RY_STEP; })),
    button('회전 ↻', nudge((e) => { e.ry += RY_STEP; })),
  );
  rowScale.append(
    button('− 크기', nudge((t) => { nudgeScale(t, 1 / S_STEP); })),
    button('크기 +', nudge((t) => { nudgeScale(t, S_STEP); })),
  );
  rowY.append(
    button('− 높이', nudge((e) => { e.y -= Y_STEP; })),
    button('높이 +', nudge((e) => { e.y += Y_STEP; })),
    button('바닥에', nudge((t) => { t.y = t.ground(); })),
  );
  const snapBtn = button('격자 0.5m', () => { st.snapOn = !st.snapOn; refresh(); });
  // 「구역 되돌리기」는 **마을을 골랐을 때만** 뜬다. 늘 보이면 «무엇이 되돌아가는가» 가
  // 모호하고(오버레이 배치는 파셀 개념이 없다), 안 보이면 되돌릴 방법이 없는 줄 안다.
  const thawBtn = button('구역 되돌리기', () => { handlers.thawSelected(); });
  rowOps.append(
    snapBtn,
    button('복제', () => { handlers.duplicate(); }),
    button('삭제', () => { handlers.removeSelected(); }),
    thawBtn,
  );
  rowOut.append(button('JSON 내보내기', () => { handlers.exportNow(); }));
  // ── 정해진 시점 (W6, 감독 지시 2026-08-13) ────────────────────────────────
  // *"보는 시점도 탑. 왼쪽오른쪽. f누르면 확대 등."*
  // 버튼과 키가 **같은 함수**로 간다(`handlers.setView` → `input.setView`) — 각자
  // 구현하면 한쪽만 고쳐져 어긋난다.
  rowView.append(
    button('탑', () => { handlers.setView('top'); }),
    button('정면', () => { handlers.setView('front'); }),
    button('좌', () => { handlers.setView('left'); }),
    button('우', () => { handlers.setView('right'); }),
    button('확대', () => { handlers.setView('focus'); }),
  );
  // ── 셰이딩 뷰 (W6, 감독 지시 2026-08-13) ──────────────────────────────────
  // *"그리고 와이어 프레임 뷰. 솔리드 뷰도 구현해줘."*
  //
  // 라벨은 `SHADING_LABEL` 한 곳에서 온다 — 여기에 «와이어» 라고 직접 적으면 키 안내
  // (`input.ts`)와 값 미러링이 되고, 한쪽만 고쳐도 아무도 모른다.
  //
  // 버튼은 **절대 지정**이고 `Shift+Z` 는 토글이다. 다른 함수인 이유는 `Input.setShading`
  // 주석 한 곳에 있다.
  const shadeBtns = SHADING_MODES.map((m) =>
    button(SHADING_LABEL[m], () => { handlers.setShading(m); }));
  rowShade.append(...shadeBtns);

  const head = el('div', 'head');
  head.append(title, toggle);
  const body = el('div', 'body');
  body.append(palette, el('hr'), selLine, inspector.root, rowRot, rowScale, rowY, rowOps,
    el('hr'), rowView, rowShade, rowOut, status, hint);
  panel.append(head, body);
  panel.dataset.open = '0';
  panel.dataset.mode = 'drive';
  doc.body.appendChild(panel);

  function say(msg: string, warn = false): void {
    status.textContent = msg;
    status.className = warn ? 'note warn' : 'note';
  }

  function refresh(): void {
    snapBtn.dataset.on = st.snapOn ? '1' : '0';
    // ── 셰이딩 버튼 ────────────────────────────────────────────────────────
    // **지금 모드를 강조한다.** 없으면 눌러도 화면이 그대로인 모드(재질)에서 «안 먹었나» 가
    // 된다 — 이 저장소가 «조작이 안 먹는 것과 대상이 없는 것은 다른 일» 로 여러 번 적은 축이다.
    //
    // 문이 없는 소비자(빌더 미리보기·테스트 하네스)에서는 **행 자체를 감춘다.** 누를 수
    // 없는 버튼을 보여주는 것은 안내가 아니라 막다른 길이다.
    const curShade = host.shading?.() ?? null;
    rowShade.hidden = curShade === null;
    for (let i = 0; i < shadeBtns.length; i++) {
      shadeBtns[i]!.dataset.on = SHADING_MODES[i] === curShade ? '1' : '0';
    }
    thawBtn.hidden = st.villageSel === null;
    for (const b of palette.querySelectorAll('button')) {
      b.dataset.on = b.dataset.src === st.pendingSrc ? '1' : '0';
    }
    // 문안은 `target.ts` 의 `describe` 한 곳이 만든다 — 두 형태의 표시를 여기서 나누면
    // 새 형태가 생길 때마다 이 분기가 자란다.
    // ⚠ 동결 여부는 **저장소에 직접 묻는다** — `st.villageSel.frozen` 은 고른 순간의
    // 스냅샷이라 조작해서 동결시켜도 안 바뀐다(`target.ts` 의 `describeShort` 주석).
    const v = st.villageSel;
    const frozenNow = v ? (host.village?.isFrozen(v.px, v.pz) ?? v.frozen) : false;
    selLine.textContent = st.target
      ? describeTarget(st.target, st.selected, v) + (frozenNow ? ' · 손본 구역' : '')
      : `선택: 없음 · 배치 ${host.entries().length}개`;
    const previews = host.entries().filter((e) => e.preview).length;
    if (st.detached) {
      // ⚠ **끊긴 것은 미리보기뿐이다** — 값은 계속 바뀌고 확정도 정상이다(`state.ts`).
      // 그 둘을 갈라 말하지 않으면 감독이 «편집이 죽었다» 로 읽고 조작을 멈춘다.
      hint.className = 'note warn';
      hint.textContent = '⚠ 그 구역이 화면에서 멀어져 미리보기가 끊겼습니다 —'
        + ' 조작과 저장은 그대로 됩니다. 가까이 가서 다시 고르면 다시 보입니다.';
    } else if (previews > 0) {
      hint.className = 'note warn';
      hint.textContent = `⚠ ${previews}개는 저장소에 없는 파일입니다 — JSON 과 함께 그 GLB 도 주셔야 배포에 붙습니다.`;
    } else if (st.villageSel) {
      hint.className = 'note';
      hint.textContent = '마을 파츠 — 옮기면 그 구역이 「손본 구역」이 되어 밀도 슬라이더에서 빠집니다.'
        + ' 「구역 되돌리기」로 계산 배치로 돌아갑니다.';
    } else {
      hint.className = 'note';
      // ⚠ 이 줄은 **키 목록의 두 번째 사본이다**(첫 번째는 `input.ts` 의 `EDIT_KEYS`
      // 와 `modalOpener`). 값 미러링이고, 한쪽만 고치면 «화면이 광고하는 키가 안 먹는다»
      // 가 난다 — 실제로 R/F 를 뺄 때 이 줄을 함께 고쳐야 했다. 태스크 #44 가 그것이다.
      hint.textContent = 'R 회전 · S 크기 (마우스로 밀고 클릭 확정 · Esc 취소 · 숫자 입력)'
        + ' · 중클릭(또는 Alt+좌)드래그 = 대상 중심으로 돌기 · Shift+드래그 = 위아래 · 휠 = 줌'
        + ' · 시점 1 정면 / 3 우 / 7 탑 / 9 좌 · F 확대 · Shift+Z 와이어 토글'
        + ' · 좌드래그 이동 · 우드래그 시점 · Q/E 회전 · Z/X 높이 · Del·⌫ 삭제';
    }
    inspector.sync(st.target);
    outliner.sync();
    badge.sync();
    onRefresh();
  }

  return {
    root: panel,
    palette,
    say,
    refresh,
    setMode(editing: boolean): void {
      panel.dataset.open = editing ? '1' : '0';
      panel.dataset.mode = editing ? 'edit' : 'drive';
      // 주행 중에는 아웃라이너를 감춘다 — 편집 도구가 걸어다니는 화면을 가리지 않는다.
      outliner.root.dataset.mode = editing ? 'edit' : 'drive';
      badge.setMode(editing);
      toggle.textContent = editing ? '✕ 편집 끝' : '✏️ 편집';
    },
    sayLead(msg: string): void {
      status.textContent = msg;
      status.className = 'lead';
    },
    el,
    button,
    dispose(): void {
      badge.dispose();
      outliner.dispose();
      panel.remove();
      style.remove();
    },
  };
}
