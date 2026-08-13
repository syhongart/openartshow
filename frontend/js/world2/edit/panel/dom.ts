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

import { scaleBy } from '../../decide/edit-pick.js';
import type { OverlayEntry, OverlayHost } from '../types.js';
import { RY_STEP, S_STEP, Y_STEP, type EditState } from '../state.js';
import { CSS } from './css.js';
import { createInspector } from './inspector.js';

/** 패널이 «자기가 못 하는 일» 을 넘기는 곳. 조립자(`mode.ts`)가 채운다. */
export interface PanelHandlers {
  toggleEditing(): void;
  duplicate(): void;
  removeSelected(): void;
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
  const inspector = createInspector(host, st, () => { refresh(); });
  const status = el('div', 'note', 'GLB 를 이 화면에 끌어다 놓거나, 위에서 골라 지면을 클릭.');
  const hint = el('div', 'note', '');
  /** 접힘/펼침 + 편집/주행을 함께 쥔 버튼. 접혔을 때 화면에 남는 유일한 것이다 */
  const toggle = button('✏️ 편집', () => { handlers.toggleEditing(); });
  toggle.className = 'toggle';

  const nudge = (fn: (e: OverlayEntry) => void) => () => {
    if (!st.selected) { say('먼저 물건을 클릭해 고르세요.'); return; }
    fn(st.selected);
    host.apply(st.selected);
    refresh();
  };

  rowRot.append(
    button('↺ 회전', nudge((e) => { e.ry -= RY_STEP; })),
    button('회전 ↻', nudge((e) => { e.ry += RY_STEP; })),
  );
  rowScale.append(
    button('− 크기', nudge((e) => { e.s = scaleBy(e.s, 1 / S_STEP); })),
    button('크기 +', nudge((e) => { e.s = scaleBy(e.s, S_STEP); })),
  );
  rowY.append(
    button('− 높이', nudge((e) => { e.y -= Y_STEP; })),
    button('높이 +', nudge((e) => { e.y += Y_STEP; })),
    button('바닥에', nudge((e) => { e.y = host.surfaceAt(e.x, e.z); })),
  );
  const snapBtn = button('격자 0.5m', () => { st.snapOn = !st.snapOn; refresh(); });
  rowOps.append(
    snapBtn,
    button('복제', () => { handlers.duplicate(); }),
    button('삭제', () => { handlers.removeSelected(); }),
  );
  rowOut.append(button('JSON 내보내기', () => { handlers.exportNow(); }));

  const head = el('div', 'head');
  head.append(title, toggle);
  const body = el('div', 'body');
  body.append(palette, el('hr'), selLine, inspector.root, rowRot, rowScale, rowY, rowOps,
    el('hr'), rowOut, status, hint);
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
    for (const b of palette.querySelectorAll('button')) {
      b.dataset.on = b.dataset.src === st.pendingSrc ? '1' : '0';
    }
    if (!st.selected && st.villageSel) {
      // ── 마을 파츠 (W4 ②-c) ────────────────────────────────────────────────
      // **아직 조작할 수 없다는 것을 화면이 말한다.** 링만 뜨고 기즈모도 수치칸도 안
      // 붙는 상태인데, 그것을 안 말하면 «골랐는데 아무것도 안 먹는다» 가 된다 —
      // 2026-08-12 사고(편집 모드에서 시점이 안 돌던 것)가 정확히 «화면이 침묵해서»
      // 커진 형태다.
      const v = st.villageSel;
      selLine.textContent = `마을: ${v.kind} · 파셀 (${v.px}, ${v.pz}) #${v.index}`
        + ` · ${v.x.toFixed(1)}, ${v.z.toFixed(1)}`
        + (v.frozen ? ' · 손본 구역' : '');
    } else if (!st.selected) {
      selLine.textContent = `선택: 없음 · 배치 ${host.entries().length}개`;
    } else {
      const sel = st.selected;
      const name = sel.src.replace(/^assets\/models\//, '');
      selLine.textContent = `선택: ${name}${sel.preview ? ' (미리보기)' : ''}`
        + ` · ${sel.x.toFixed(1)}, ${sel.y.toFixed(2)}, ${sel.z.toFixed(1)}`
        + ` · ${((sel.ry * 180) / Math.PI).toFixed(0)}° · ×${sel.s.toFixed(2)}`;
    }
    const previews = host.entries().filter((e) => e.preview).length;
    if (previews > 0) {
      hint.className = 'note warn';
      hint.textContent = `⚠ ${previews}개는 저장소에 없는 파일입니다 — JSON 과 함께 그 GLB 도 주셔야 배포에 붙습니다.`;
    } else if (st.villageSel) {
      hint.className = 'note';
      hint.textContent = '마을 파츠는 아직 고르기만 됩니다 — 옮기기·지우기는 다음 회차입니다.';
    } else {
      hint.className = 'note';
      hint.textContent = '좌드래그 이동 · 우드래그 시점 · Q/E 회전 · R/F 크기 · Z/X 높이 · Del·⌫ 삭제';
    }
    inspector.sync(st.selected);
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
      toggle.textContent = editing ? '✕ 편집 끝' : '✏️ 편집';
    },
    sayLead(msg: string): void {
      status.textContent = msg;
      status.className = 'lead';
    },
    el,
    button,
    dispose(): void {
      panel.remove();
      style.remove();
    },
  };
}
