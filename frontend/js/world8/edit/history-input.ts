// world8/edit/history-input.ts — **되돌리기 키.** `Ctrl+Z` · `Ctrl+Shift+Z` · `Ctrl+Y`.
//
// 감독 지시 2026-08-22: *"워크래프트3 편집기 보니깐 … 우리 편집기 보고 개선해봐."*
// 배경은 `decide/history.ts` 헤더 한 곳이다.
//
// ── 왜 `edit/input.ts` 가 아니라 새 파일인가 ────────────────────────────────
// `edit/fly-input.ts` 가 선 선례와 **같은 이유 둘**이다:
// ① 그 파일은 683줄 **동결**이다(파일 크기 게이트). 늘리려면 baseline 을 다시 구워야
//    하고, 그 커밋의 diff 가 「되돌리기」가 아니라 「input.ts 를 만졌다」로 읽힌다.
// ② 성격이 다르다 — `input.ts` 의 키는 **고른 것을 조작**하고, 이것은 **아무것도 안
//    골랐을 때도 동작해야 한다.** 실제로 되돌리기가 가장 필요한 순간이 「방금 지워서
//    아무것도 안 골라진」 상태다. 그 파일에 넣으면 `if (!st.target)` 가드 앞에 예외를
//    하나 더 파야 하고, 그 가드는 이미 셰이딩 예외를 안고 있다.
//
// ── ⚠ 캡처 단계인 것이 이 파일의 핵심이다 ──────────────────────────────────
// `Ctrl+Shift+Z`(다시하기)의 `KeyZ` 는 `input.ts` 에서 **셰이딩 토글**이고
// (`ev.shiftKey && ev.code === 'KeyZ'`), 맨 `KeyZ` 는 **높이 내리기**다. 같은 `doc` 에
// 나란히 붙으면 등록 순서가 승부를 가르는데, 그것은 조립 순서를 바꾸는 것만으로 조용히
// 뒤집히는 종류의 의존이다. **캡처 단계 + `stopPropagation` 이면 순서와 무관하다.**
//
// ⚠⚠ 그래도 `input.ts` 의 셰이딩 조건에 `!ev.ctrlKey && !ev.metaKey` 를 **함께** 넣었다.
// 두 겹인 이유는 `fly-input.ts` 가 같은 자리에 적은 것과 같다 — 리스너가 안 붙는 소비자
// (테스트 하네스·빌더 미리보기)에서 한쪽만으로는 셰이딩이 튀고, 그 증상은 원인이 안 보인다.
//
// `metaKey` 를 함께 보는 것은 맥이다 — `input.ts` 가 `Delete` 옆에 `Backspace` 를 받는
// 것과 같은 이유이고(맥 키보드에 `Delete` 코드의 키가 없다), 맥에서 되돌리기는 `Cmd+Z` 다.

/** 이 키가 무엇을 뜻하나. **순수 판정** — 테스트가 이 함수를 직접 돌린다 */
export function readHistoryKey(
  ev: { code: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
): 'undo' | 'redo' | null {
  if (!ev.ctrlKey && !ev.metaKey) return null;
  // `Ctrl+Y` 는 다시하기 하나뿐이다(윈도 관례). `Ctrl+Shift+Z` 는 블렌더·맥 관례.
  if (ev.code === 'KeyY') return 'redo';
  if (ev.code !== 'KeyZ') return null;
  return ev.shiftKey ? 'redo' : 'undo';
}

export interface HistoryInput {
  bind(): void;
  unbind(): void;
}

export interface HistoryInputDeps {
  readonly doc: Document;
  undo(): void;
  redo(): void;
  /** 편집 중인가. 주행 중에는 브라우저 기본 되돌리기를 뺏지 않는다 */
  editing(): boolean;
}

export function createHistoryInput(deps: HistoryInputDeps): HistoryInput {
  const onKey = (ev: KeyboardEvent): void => {
    if (!deps.editing()) return;
    // 입력칸 안에서는 **텍스트 되돌리기가 우선**이다 — 수치칸에 「12.5」를 치다 Ctrl+Z 를
    // 누르면 감독이 기대하는 것은 방금 친 글자이지 3D 배치가 아니다.
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const what = readHistoryKey(ev);
    if (!what) return;
    ev.preventDefault();
    // 캡처 단계에서 끊는다 — 위 헤더의 그 이유다.
    ev.stopPropagation();
    if (what === 'undo') deps.undo();
    else deps.redo();
  };

  return {
    bind() { deps.doc.addEventListener('keydown', onKey, true); },
    unbind() { deps.doc.removeEventListener('keydown', onKey, true); },
  };
}
