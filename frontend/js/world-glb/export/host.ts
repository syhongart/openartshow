// world-glb/export/host.ts — 되읽은 GLB 도시를 담아 두고 빌더에 물린다.
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
//
// ── 우선순위: GLB → 마을 원장 → 계산 ────────────────────────────────────────
// GLB 는 **세계 전체 대체** 모델이므로 GLB 에 없는 파셀 = 사용자가 지운 것이다. 그래서
// 원장보다 앞선다 — 원장 데이터 자체는 보존되고 **가려질 뿐**이다(되읽기를 끄면 돌아온다).
//
// ⚠ **구현자 설계 판단(2026-08-25) — 팀장 판정으로 승인.** 첫 판본은 `main.ts` 에
// *"감독 요청 2026-08-06"* 이라고 적었는데 **성립하지 않는다**: `frozenAt` 도
// `village-parcels.ts` 도 2026-08-13 생성이라(`git log --diff-filter=A`), 08-06 의 발화가
// 일주일 뒤 생길 메커니즘과의 우선순위를 정했을 수 없다. **감독 근거로 인용할 때는 발화
// 원문 + 날짜를 붙이고, 붙일 수 없으면 그것은 내 판단이다**(팀장 규율, 이 형태가 네 번째다).
//
// 재론 조건: 감독이 「GLB 와 마을 편집 동시 적용」을 명시 요구하는 회차.

import { forTier, withShadows } from '../decide/parcel-freeze.js';
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
  lookup(px: number, pz: number, tier: 'near' | 'mid' | 'far'): readonly PlacedPart[] | null;
  /** 되읽은 도시를 건다. `null` 이면 평소대로 돌아간다 */
  set(overlay: WorldOverlay | null): void;
  /** 지금 GLB 도시가 걸려 있는가 */
  readonly active: boolean;
}

export function createGlbOverlayHost(): GlbOverlayHost {
  let overlay: WorldOverlay | null = null;
  return {
    // ── 마을 동결과 **같은 규약을 탄다** (검수관 반려 B5, 2026-08-23) ──────────
    // `decide/parcel-freeze.ts:114` 가 못 박은 짝이다: 저장은 캐스터만(`stripShadows`),
    // 조회는 그림자를 다시 유도(`withShadows`). 첫 판본은 되읽은 목록을 **그대로** 냈고,
    // 그래서 블렌더에서 건물을 옮기면 **그림자만 옛 자리에 남았다.**
    //
    // 2026-08-13 에 이미 반려된 형태가 새 경로로 되살아난 것이다 — `shadowOf` 를 함수로
    // 뽑은 이유가 정확히 그것이었다(`parts/shadow.ts:422`). 짝을 손으로 맞추는 대신
    // 여기서도 같은 두 함수를 부른다.
    //
    // `forTier` 까지 타는 것도 `village-parcels.ts:140` 과 같다 — tier 가 무엇을 그릴지
    // 정하는 축이므로 출처가 달라도 그 필터는 같아야 한다.
    lookup: (px, pz, tier) => (overlay ? forTier(withShadows(overlay.layoutFor(px, pz)), tier) : null),
    set(next) { overlay = next; },
    get active() { return overlay !== null; },
  };
}
