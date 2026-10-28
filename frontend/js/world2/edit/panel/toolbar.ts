// world2/edit/panel/toolbar.ts — **상시 툴바.** 무엇을 골랐든 늘 필요한 것만 모은다.
//
// ── 왜 탭 밖인가 (감독 지시 2026-08-19 개편) ────────────────────────────────
// 블렌더 뷰포트 헤더·유니티 씬뷰 툴바가 같은 문제를 푼 방식이다 — 「지금 다루는 대상」과
// 무관한 조작은 탭 안에 넣으면 «표면을 만지다가 위에서 보려면 탭을 옮겨야» 한다.
// 판정 근거는 `decide/edit-tabs.ts` 헤더 한 곳이다(여기에 다시 적지 않는다).
//
// ── 왜 별도 파일인가 (2026-08-22) ───────────────────────────────────────────
// 실행취소가 들어오면서 `panel/dom.ts` 가 **566줄**이 됐고 파일 크기 게이트 상한(512)을
// 넘었다. 그 게이트가 제시하는 두 길 중 **쪼개는 쪽**을 골랐다 — 감독 지시가
// *"파일 분리해서 파일사이즈 폭주 안되고 모듈 관리 잘되게"*(2026-08-16)이고,
// 이 세 행은 이미 «상시» 라는 이름으로 묶여 있어 경계가 새로 생기는 것이 아니라
// **이미 있던 경계를 파일로 옮기는 것**이다.
//
// ⚠ **셋을 한 상자에 담아 함께 고정한다**(검수관 권고 P-h). 시점·셰이딩만 위에 두고
// 탭 바만 sticky 로 하면 「늘 필요하다」던 것이 스크롤에서 먼저 사라진다.

import { SHADING_LABEL, SHADING_MODES, type ShadingMode } from '../../decide/shading.js';
import type { ViewSide } from '../../decide/orbit.js';

/** 툴바가 «자기가 못 하는 일» 을 넘기는 곳. `PanelHandlers` 의 부분집합이다 */
export interface ToolbarHandlers {
  setView(side: ViewSide | 'focus'): void;
  setShading(m: ShadingMode): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

export interface Toolbar {
  readonly root: HTMLElement;
  /**
   * 화면을 맞춘다. `panel.refresh()` 가 매번 부른다.
   *
   * @param shading 지금 셰이딩. **`null` 이면 그 행을 통째로 감춘다** — 문이 없는
   *                소비자(빌더 미리보기·테스트 하네스)에서 누를 수 없는 버튼을 보여
   *                주는 것은 안내가 아니라 막다른 길이다.
   */
  sync(shading: ShadingMode | null): void;
}

export function createToolbar(
  doc: Document,
  handlers: ToolbarHandlers,
  el: (tag: string, cls?: string, text?: string) => HTMLElement,
  button: (label: string, onClick: () => void) => HTMLButtonElement,
  /** 탭 바. 툴바 **맨 아래**에 함께 고정된다 */
  tabBar: HTMLElement,
): Toolbar {
  // ── 실행취소 (2026-08-22, 감독 지시 *"워크래프트3 편집기 … 개선해봐"*) ───────
  // **맨 위다.** 실수를 무르는 조작이라 찾는 데 시간이 들면 그동안 다른 조작을 더 하게
  // 되고, 그러면 무를 것이 늘어난다. 그리고 **아무것도 안 골랐을 때도** 필요하다
  // (방금 지운 것을 되돌리는 순간이 정확히 그 상태다) — 「속성」 탭이 아닌 이유가 그것이다.
  //
  // 키 안내는 `title` 로 단다 — 이 패널은 폭이 212px 이라 안내 줄을 늘리면 조작칸이
  // 그만큼 밀린다(`decide/edit-tabs.ts` 가 센 그 문제).
  const rowHist = el('div', 'row');
  const undoBtn = button('↶ 되돌리기', () => { handlers.undo(); });
  const redoBtn = button('다시하기 ↷', () => { handlers.redo(); });
  undoBtn.title = 'Ctrl+Z';
  redoBtn.title = 'Ctrl+Shift+Z (또는 Ctrl+Y)';
  rowHist.append(undoBtn, redoBtn);

  // ── 정해진 시점 (W6, 감독 지시 2026-08-13) ────────────────────────────────
  // *"보는 시점도 탑. 왼쪽오른쪽. f누르면 확대 등."*
  // 버튼과 키가 **같은 함수**로 간다(`handlers.setView` → `input.setView`) — 각자
  // 구현하면 한쪽만 고쳐져 어긋난다.
  const rowView = el('div', 'row');
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
  const rowShade = el('div', 'row');
  const shadeBtns = SHADING_MODES.map((m) =>
    button(SHADING_LABEL[m], () => { handlers.setShading(m); }));
  rowShade.append(...shadeBtns);

  const root = el('div', 'toolbar');
  root.append(rowHist, rowView, rowShade, tabBar);

  return {
    root,
    sync(shading) {
      // 되돌릴 것이 없으면 **흐리게 한다.** 눌러도 되지만(그때는 화면이 「되돌릴 것이
      // 없습니다」라고 말한다), 흐린 것이 먼저 보여야 «눌렀는데 아무 일이 없다» 로 안 읽힌다.
      undoBtn.disabled = !handlers.canUndo();
      redoBtn.disabled = !handlers.canRedo();
      // **지금 모드를 강조한다.** 없으면 눌러도 화면이 그대로인 모드(재질)에서 «안 먹었나»
      // 가 된다 — 이 저장소가 «조작이 안 먹는 것과 대상이 없는 것은 다른 일» 로 여러 번
      // 적은 축이다.
      rowShade.hidden = shading === null;
      for (let i = 0; i < shadeBtns.length; i += 1) {
        shadeBtns[i]!.dataset.on = SHADING_MODES[i] === shading ? '1' : '0';
      }
    },
  };
}
