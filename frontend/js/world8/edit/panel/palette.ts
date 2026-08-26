// world8/edit/panel/palette.ts — **에셋 라이브러리.** 놓을 수 있는 것을 전부 깐다.
//
// ── 감독 지시에서 생겼다 ────────────────────────────────────────────────────
// *"아셋 라이브러리가 있고 … 진짜 전문 에디터로 만들어줘."* 카드로 범위 확정
// (2026-08-14): **마을 파츠부터 노출.**
//
// 그전까지 이 파일은 40행이었고 `assets/models/index.json` 의 GLB 파일명을 버튼으로
// 까는 것이 전부였다. 마을 건물·나무·가로등은 **목록에 아예 없었다** — 이미 놓인 것을
// 고쳐 쓸 수만 있었고, 새로 놓을 방법이 없었다.
//
// ── 무엇이 판정이고 무엇이 여기 있나 ────────────────────────────────────────
// 「무엇을 목록에 낼 것인가」·「검색어가 무엇을 남기는가」·「놓아도 되는가」는 전부
// `decide/asset-library.ts` 다. 여기는 **DOM 만** 만든다. 그래서 "놓을 수 없는 것이
// 목록에 뜨는가" 를 테스트가 DOM 없이 물어볼 수 있다.
//
// ── 목록을 못 받아도 편집은 계속 된다 ───────────────────────────────────────
// GLB 목록(`fetch`)이 실패·404·JSON 깨짐이면 그 칸만 안내 문구가 되고 **마을 파츠는
// 그대로 뜬다** — 파츠는 코드에서 나오므로 네트워크와 무관하다. 예전에는 fetch 실패가
// 곧 «팔레트 전체가 빈 것» 이었다.

import type { EditState } from '../state.js';
import type { Panel } from './dom.js';
import {
  filterAssets, modelAssets, partAssets, pickAsset, type AssetItem,
} from '../../decide/asset-library.js';
import { PARTS, tonesFor } from '../../parts/index.js';

/** 색 스와치 한 조각. 파츠 버튼 앞에 붙는다 — 「어떤 계열인가」를 공짜로 말한다 */
function swatch(panel: Panel, tone: number): HTMLElement {
  const s = panel.el('span', 'sw');
  s.style.background = `#${tone.toString(16).padStart(6, '0')}`;
  return s;
}

/**
 * 팔레트를 채운다. **비동기지만 기다리지 않는다** — 마을 파츠는 즉시 뜨고, GLB 목록은
 * 늦게 와도 그때 붙으면 된다.
 *
 * @param modelsUrl `assets/models/index.json` 의 실제 주소
 */
export function loadPalette(panel: Panel, st: EditState, modelsUrl: string): void {
  const root = panel.palette;

  // ── 검색 ──────────────────────────────────────────────────────────────────
  // ⚠ `input` 요소다. `edit/input.ts` 의 `onKeyDown` 이 **맨 앞에서** `INPUT`·`TEXTAREA`
  // 를 통과시키므로(`t.tagName === 'INPUT'`) 여기에 타이핑해도 편집 키가 안 먹는다 —
  // 그 가드가 없으면 「나무」를 치는 순간 `R`·`S` 가 모달을 열고 `Del` 이 지운다.
  const search = panel.el('input', 'find') as HTMLInputElement;
  search.type = 'search';
  search.placeholder = '검색 (예: 나무 · tree · glb)';
  root.append(search);

  const partsBox = panel.el('div', 'cat');
  const modelsBox = panel.el('div', 'cat');
  root.append(partsBox, modelsBox);

  /** 마을 파츠 — 코드에서 나온다. 네트워크와 무관하므로 **언제나 있다** */
  const parts = partAssets(PARTS.map((p) => p.kind), tonesFor);
  /** GLB — 늦게 오고, 안 올 수도 있다 */
  let models: AssetItem[] = [];
  /** 목록을 못 받은 이유. `null` 이면 아직 받는 중이거나 정상이다 */
  let modelsNote: string | null = null;

  function section(box: HTMLElement, title: string, items: AssetItem[], note: string | null): void {
    box.textContent = '';
    // 빈 칸을 **접는다** — 검색으로 한쪽이 0개가 됐을 때 빈 제목만 남으면 «고장났나» 가
    // 된다. 단 안내 문구가 있으면 제목과 함께 보여준다(그것이 곧 이유다).
    if (items.length === 0 && note === null) return;
    box.append(panel.el('div', 'cat-h', `${title} · ${items.length}`));
    if (note !== null) box.append(panel.el('div', 'note', note));
    for (const a of items) {
      const b = panel.button(a.label, () => { pick(a); });
      // ⚠ 종류를 **데이터 속성으로 함께** 든다. `refresh()` 가 강조를 맞출 때 라벨이
      //   아니라 이것으로 대조한다 — 라벨은 사람이 읽는 것이고 언제든 바뀐다.
      b.dataset.asset = a.kind;
      b.dataset.id = a.id;
      if (a.kind === 'model') b.dataset.src = `assets/models/${a.id}`;
      if (a.tone !== undefined) b.prepend(swatch(panel, a.tone));
      box.append(b);
    }
  }

  /**
   * 고른다. **판정은 `pickAsset` 이 한다** — 여기는 그 결과를 상태에 옮길 뿐이다.
   *
   * 배타성(둘이 동시에 안 찬다)과 「같은 것을 다시 누르면 푼다」가 그 함수의 성질이고,
   * 그래서 DOM 없이 왕복을 다 밟아 볼 수 있다. 여기 두었을 때는 뮤테이션이 못 잡았다 —
   * 근거는 `decide/asset-library.ts` 의 `pickAsset` 헤더 한 곳이다.
   */
  function pick(a: AssetItem): void {
    const next = pickAsset({ src: st.pendingSrc, part: st.pendingPart }, a);
    st.pendingSrc = next.src;
    st.pendingPart = next.part;
    panel.say(next.src || next.part
      ? '지면을 클릭하면 놓입니다.'
      : '고르기를 해제했습니다.');
    panel.refresh();
  }

  function render(): void {
    const q = search.value;
    section(partsBox, '마을 파츠', filterAssets(parts, q), null);
    section(modelsBox, '모델(GLB)', filterAssets(models, q), modelsNote);
    panel.refresh();
  }

  search.addEventListener('input', render);
  render();

  void (async () => {
    let names: string[] = [];
    try {
      const res = await fetch(modelsUrl, { cache: 'no-cache' });
      if (res.ok) {
        const j = (await res.json()) as { models?: unknown };
        if (Array.isArray(j.models)) names = j.models.filter((n): n is string => typeof n === 'string');
      }
    } catch { /* 목록이 없으면 파츠와 끌어다 놓기만 쓴다 */ }
    models = modelAssets(names);
    modelsNote = names.length === 0
      ? '커밋된 모델이 없습니다 — GLB 를 끌어다 놓으세요.'
      : null;
    render();
  })();
}
