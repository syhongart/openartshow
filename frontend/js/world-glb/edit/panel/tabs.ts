// world-glb/edit/panel/tabs.ts — 편집 패널의 **카테고리 탭**(DOM). 판정은 안 한다.
//
// 감독 지시 2026-08-19: *"우리 개발용 편집창도 카테고리 탭. 공용기능. 블렌더 유니티 창을
// 참조해서 만들어봐. 막 나열하니 정신없잖아"*
//
// **무엇을 어느 탭에 넣는가·왜 넷인가·왜 시점과 셰이딩은 탭 밖인가**는 전부
// `decide/edit-tabs.ts` 한 곳이 소유한다 — 여기에 다시 적지 않는다. 이 파일은 그 표를
// 받아 버튼과 칸을 만들고 하나만 보이게 하는 일만 한다.
//
// ⚠ `innerHTML` 을 쓰지 않는다 — 이 저장소의 UI 규약(`knob-bar.ts` 의 XSS 근거).

import { EDIT_TABS, TAB_DEFAULT, tabHasContent, type EditTab } from '../../decide/edit-tabs.js';
import type { OverlayHost } from '../types.js';

export interface Tabs {
  /** 탭 버튼 줄. 패널 위쪽에 붙인다 */
  readonly bar: HTMLElement;
  /**
   * 탭별 내용 칸. 조립(`panel/dom.ts`)이 여기에 기존 행들을 나눠 담는다.
   *
   * ⚠ **칸을 만들어 두고 감추는 방식**이지 «필요할 때 만든다» 가 아니다. 후자면 탭을
   * 옮길 때마다 DOM 이 새로 나고, 그러면 **입력칸에 치던 값과 포커스가 사라진다** —
   * 인스펙터가 「포커스 있는 칸은 안 건드린다」로 지킨 그 축이 통째로 무너진다.
   */
  readonly panes: Readonly<Record<EditTab, HTMLElement>>;
  /** 그 탭을 보인다. 이미 그 탭이면 아무 일도 안 한다 */
  show(tab: EditTab): void;
  current(): EditTab;
  /** 「지금 볼 게 있나」 표시 갱신. 근거는 `decide/edit-tabs.ts` 의 `tabHasContent` */
  sync(hasTarget: boolean): void;
}

export function createTabs(host: OverlayHost): Tabs {
  const doc = host.doc;

  const bar = doc.createElement('div');
  bar.className = 'tabbar';

  const panes = {} as Record<EditTab, HTMLElement>;
  const btns = new Map<EditTab, HTMLButtonElement>();
  let cur: EditTab = TAB_DEFAULT;

  for (const t of EDIT_TABS) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.dataset.tab = t.id;
    // 아이콘과 글을 **한 요소에** 둔다 — 나누면 좁은 폭에서 둘이 다른 줄로 접힌다.
    b.textContent = `${t.icon} ${t.label}`;
    // 스크린리더에는 그림글자가 소음이다 — 읽을 이름은 글자만으로 준다.
    b.setAttribute('aria-label', t.label);
    b.addEventListener('click', () => { show(t.id); });
    btns.set(t.id, b);
    bar.appendChild(b);

    const pane = doc.createElement('div');
    pane.className = 'pane';
    pane.dataset.tab = t.id;
    panes[t.id] = pane;
  }

  function paint(): void {
    for (const [id, b] of btns) b.dataset.on = id === cur ? '1' : '0';
    for (const t of EDIT_TABS) panes[t.id].dataset.on = t.id === cur ? '1' : '0';
  }

  function show(tab: EditTab): void {
    if (tab === cur) return;
    cur = tab;
    paint();
  }

  paint();

  return {
    bar,
    panes,
    show,
    current: () => cur,
    sync(hasTarget: boolean): void {
      for (const [id, b] of btns) {
        // ⚠ **`disabled` 를 쓰지 않는다** — 근거는 `tabHasContent` 주석 한 곳이다.
        // 여기서는 흐리게만 하고 클릭은 살려 둔다.
        b.dataset.empty = tabHasContent(id, hasTarget) ? '0' : '1';
      }
    },
  };
}
