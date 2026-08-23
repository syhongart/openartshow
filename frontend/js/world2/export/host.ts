// world2/export/host.ts — 되읽은 GLB 도시를 담아 두고 빌더에 물린다.
//
// ── 왜 `main.ts` 가 아니라 여기인가 ─────────────────────────────────────────
// `main.ts` 는 Composition Root 이고 *"조립만 한다"* 가 그 파일의 규율이다. 그런데
// 되읽기 배선은 상태(지금 어떤 도시인가)와 규칙(GLB 가 마을 원장보다 앞선다)을 함께
// 갖는다 — 조립이 아니라 로직이다. 파일 크기 게이트가 그 사실을 먼저 잡았다
// (`main.ts` +33줄, 감독 지시 2026-08-16 *"파일사이즈 폭주 안되고 모듈 관리 잘되게"*).
//
// ── 왜 빌더를 다시 만들지 않는가 ────────────────────────────────────────────
// `frozenAt` 은 빌더 생성자에서 `readonly` 로 받는다. 그런데 되읽기는 세션 도중에
// 일어나므로 교체가 필요하다. 빌더를 다시 만들면 **슬롯 풀이 함께 다시 태어나고 개수
// 불변식이 깨진다** — 이 세계가 서 있는 바로 그 성질이다.
//
// 그래서 빌더에게는 **클로저 하나**를 주고, 바뀌는 것은 이 안의 변수뿐이다. 빌더도
// 풀도 그대로 살아 있고, 바뀌는 것은 다음 프레임에 무엇을 짓느냐뿐이다.

import type { PlacedPart } from '../parts/types.js';
import type { WorldOverlay } from './overlay.js';

export interface GlbOverlayHost {
  /**
   * 이 파셀의 배치. GLB 가 없으면 `null` — **호출자가 다음 출처로 넘긴다.**
   *
   * `null` 과 빈 배열의 구별이 여기서도 그대로다(`frozenAt` 계약): `null` 은 "내가
   * 답할 것이 없다", 빈 배열은 "GLB 에 이 파셀이 비어 있다" 다. 후자를 `null` 로
   * 접으면 사용자가 지운 파셀이 계산으로 되살아난다.
   */
  lookup(px: number, pz: number): readonly PlacedPart[] | null;
  /** 되읽은 도시를 건다. `null` 이면 평소대로 돌아간다 */
  set(overlay: WorldOverlay | null): void;
  /** 지금 GLB 도시가 걸려 있는가 */
  readonly active: boolean;
}

export function createGlbOverlayHost(): GlbOverlayHost {
  let overlay: WorldOverlay | null = null;
  return {
    lookup: (px, pz) => (overlay ? overlay.layoutFor(px, pz) : null),
    set(next) { overlay = next; },
    get active() { return overlay !== null; },
  };
}
