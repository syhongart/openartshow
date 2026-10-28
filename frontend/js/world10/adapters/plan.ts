// world10/adapters/plan.ts — **요금제 층위를 world2 로 들여오는 유일한 문.**
//
// ── 왜 어댑터인가 (경계 게이트가 밀었다) ──────────────────────────────────
// 첫 판본은 `edit/mode.ts` 가 `../../studio-plan.js` 를 직접 불렀고, `world2-boundary`
// 게이트가 **커밋을 막았다**: *"world2 밖을 참조하는 파일은 어댑터이거나 공용
// 라이브러리뿐이다."* 정당한 신호다 — 요금제는 라이브 스튜디오의 개념이고, world2 가
// 그 파일의 모양에 직접 매이면 «world1 을 지우면 world2 가 안 뜬다» 가 된다.
//
// 그래서 참조를 **한 곳으로 모은다.** 갈아 끼울 자리가 파일 하나이고, 그 사실이
// `tests/world2-boundary.test.ts` 의 `ADAPTERS` 목록에 등록돼 있다.
//
// ── 좁게 연다 ─────────────────────────────────────────────────────────────
// `studio-plan.ts` 는 한도(6/14)·코드 발급·배지 주입까지 갖고 있지만 world2 가 쓰는 것은
// **둘뿐**이다. 넓게 재수출하면 어댑터가 그저 통로가 되고, 그때부터 «world2 가 요금제
// 전체를 안다» 가 참이 된다.
//
// ⚠ **보안 장치가 아니다.** 서버가 없으므로 사용자가 `localStorage` 를 고쳐 어떤 층위든
// 켤 수 있다(`studio-plan.ts` 헤더가 같은 것을 적고 있다). 이것이 막는 것은 «내 등급으로
// 뭘 할 수 있는지 모르는 상태» 이지 악의가 아니다.

import { canUploadGlb as rawCanUpload, planTier, TIER_LABEL } from '../../studio-plan.js';

/** 자기 GLB 건물을 올릴 수 있는가(감독 지시 2026-08-16 「특별 프리미엄」) */
export function canUploadGlb(): boolean {
  return rawCanUpload() === true;
}

/**
 * 지금 등급의 표시명. 모르면 빈 문자열 — **거부 문구가 «지금 무엇인지» 를 말할 수 있게**.
 *
 * 표시명을 여기서 짓지 않는다. `TIER_LABEL` 이 SSOT 이고, 복사하면 요금제 이름이 바뀔 때
 * world2 만 옛 이름을 계속 보여 준다.
 */
export function tierLabel(): string {
  const t = planTier() as keyof typeof TIER_LABEL;
  return TIER_LABEL[t] ?? '';
}
