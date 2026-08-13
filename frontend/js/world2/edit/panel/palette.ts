// world2/edit/panel/palette.ts — 커밋된 GLB 목록을 버튼으로 깐다.
//
// 목록을 못 받아도 **편집은 계속 된다** — 끌어다 놓기 경로가 남아 있다. 그래서 실패를
// 던지지 않고 안내 문구로 바꾼다(`fetch` 실패·404·JSON 깨짐이 전부 같은 자리로 온다).

import type { EditState } from '../state.js';
import type { Panel } from './dom.js';

/**
 * 팔레트를 채운다. **비동기지만 기다리지 않는다** — 목록이 늦게 와도 그때 붙으면 된다.
 *
 * @param modelsUrl `assets/models/index.json` 의 실제 주소
 */
export function loadPalette(panel: Panel, st: EditState, modelsUrl: string): void {
  void (async () => {
    let names: string[] = [];
    try {
      const res = await fetch(modelsUrl, { cache: 'no-cache' });
      if (res.ok) {
        const j = (await res.json()) as { models?: unknown };
        if (Array.isArray(j.models)) names = j.models.filter((n): n is string => typeof n === 'string');
      }
    } catch { /* 목록이 없으면 끌어다 놓기만 쓴다 */ }
    if (names.length === 0) {
      panel.palette.append(panel.el('div', 'note', '커밋된 모델이 없습니다 — GLB 를 끌어다 놓으세요.'));
      return;
    }
    for (const n of names) {
      const src = `assets/models/${n}`;
      const b = panel.button(n, () => {
        st.pendingSrc = st.pendingSrc === src ? null : src;
        panel.say(st.pendingSrc ? '지면을 클릭하면 놓입니다.' : '고르기를 해제했습니다.');
        panel.refresh();
      });
      b.dataset.src = src;
      panel.palette.append(b);
    }
    panel.refresh();
  })();
}
