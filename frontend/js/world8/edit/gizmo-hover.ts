// world2/edit/gizmo-hover.ts — **커서를 얹기만 해도 그 축이 반응한다.**
//
// 감독 지시 2026-08-22: *"마우스를 대면 그 축이 변화가 바로 생겼으면해."*
//
// 그전에는 **잡아야만** 달라졌다. 그래서 「이 축이 잡히긴 하나」를 알려면 일단 눌러 봐야
// 했고, 엉뚱한 축이면 되돌려야 한다 — **확인 비용이 조작 비용과 같았다.** 강조 규칙
// (얹음은 밝히기만, 잡음은 나머지까지 흐리기)은 `decide/gizmo-math.ts` 의 `partOpacity`
// 한 곳이다 — 여기에 다시 적지 않는다.
//
// ── 왜 `edit/input.ts` 가 아니라 새 파일인가 ────────────────────────────────
// `history-input.ts`·`fly-input.ts` 가 선 선례와 **같은 이유**이고, 이번에는 그 파일이
// 자기 헤더에 **조건문으로** 적어 둔 트리거가 실제로 발동했다:
//
//   *"이 파일에 「주석이 아닌 줄」이 늘어나는 다음 회차에는 키 처리 블록 분리를 선결로 한다."*
//
// 얹기 판정은 `onPointerMove` 안에서 **코드 3줄**이면 되는데, 그 3줄이 정확히 그 조건을
// 만족한다. 선택지는 둘이었다 — ⓐ 키 블록 186줄을 먼저 뜯고 그 위에 얹거나 ⓑ 얹기를
// 밖으로 내거나. **ⓑ 를 골랐다**: 같은 헤더가 *"주석 전용이 아닌 diff 에 구조 변경을
// 얹으면 행위 위험을 새로 만든다"* 를 적고 있고, 이번 회차는 감독이 신고한 **동작 결함
// 수정**이 본체다. 186줄 이동을 그 위에 포개면 「기즈모가 왜 안 움직였나」의 diff 가
// 「input.ts 를 뜯었다」로 읽힌다. 키 블록 분리는 그 자체로 한 회차다.
//
// ⚠ 그러므로 **트리거는 아직 살아 있다** — 미룬 것이지 해소한 것이 아니다. `input.ts` 에
// 코드 줄이 실제로 늘어나는 다음 회차에 그 분리가 선결이다.
//
// ── 이 파일이 못 하는 것 ────────────────────────────────────────────────────
// · **터치**: `pointermove` 는 손가락에서도 오지만 화면을 짚기 전에는 커서가 없다.
//   폰에서는 얹기 강조가 사실상 「짚은 직후 한 프레임」이라 안 보인다 — 그 축의 대안은
//   잡았을 때의 강조와 상태줄 글자이고, 둘 다 이미 있다.
// · **가림**: 광선이 먼저 맞은 것만 본다. 기즈모가 물체에 가려도 `depthTest:false` 라
//   화면에는 보이는데, 그 경우 `hitTest` 는 여전히 기즈모를 집는다(`input.ts` 의
//   *"기즈모가 항목보다 먼저다"* 와 같은 판정을 쓴다).

import type { Gizmo } from './gizmo.js';

export interface GizmoHoverDeps {
  readonly doc: Document;
  readonly canvas: HTMLElement;
  readonly gizmo: Gizmo;
  /**
   * 지금 얹기 판정을 할 상황인가.
   *
   * 드래그 중이면 강조는 **잡은 것**의 몫이고(`partOpacity` 가 `active` 를 우선한다),
   * 아무것도 안 골랐으면 기즈모가 아예 없다. 둘 다 광선을 쏠 이유가 없는데
   * `pointermove` 는 초당 수십 번 온다 — 이 술어가 곧 「쏠 이유가 있는가」다.
   */
  readonly shouldProbe: () => boolean;
  /** 커서 아래 것들. 광선을 못 쏘면 `null`(그 프레임은 얹은 것이 없다고 본다) */
  readonly probe: (ev: PointerEvent) => readonly { object: unknown }[] | null;
}

export interface GizmoHover {
  bind(): void;
  unbind(): void;
}

export function createGizmoHover(deps: GizmoHoverDeps): GizmoHover {
  const onMove = (ev: PointerEvent): void => {
    // ⚠ **캔버스 밖이면 무조건 걷는다.** 커서가 패널로 나갔는데 마지막 축이 밝은 채로
    // 남으면 「저기 얹혀 있다」는 거짓말이 된다. `shouldProbe()` 보다 먼저인 이유는
    // 드래그가 끝나 술어가 false 가 된 순간에도 이 정리는 돌아야 하기 때문이다.
    if (ev.target !== deps.canvas) { deps.gizmo.hover(null); return; }
    if (!deps.shouldProbe()) return;
    const hits = deps.probe(ev);
    deps.gizmo.hover(hits ? deps.gizmo.hitTest(hits) : null);
  };

  // 커서가 창 밖으로 나가면 `pointermove` 가 끊긴다 — 그때도 걷는다.
  const onLeave = (): void => { deps.gizmo.hover(null); };

  return {
    bind(): void {
      deps.doc.addEventListener('pointermove', onMove);
      deps.doc.addEventListener('pointerleave', onLeave);
    },
    unbind(): void {
      deps.doc.removeEventListener('pointermove', onMove);
      deps.doc.removeEventListener('pointerleave', onLeave);
      // 떼면서 강조를 남기지 않는다 — 주행 모드로 나갔는데 축이 밝은 채로 굳는다.
      deps.gizmo.hover(null);
    },
  };
}
