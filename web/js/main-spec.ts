// @ts-nocheck — main.js 분해 1차 순수 leaf 이동(byte 무결성), strict 타입은 후속.
// main-spec.js — 품질 사다리 학습(localStorage)·저사양(lite) FPS 임계·렌더 픽셀
//   예산 상수. main.js에서 verbatim 추출(C-3 main 분해 1차). 공유 상태 무접근 leaf.
//   ※ spec 승급 카운터 specFastTicks는 4차 A군에서 perfGovernor(main-perf.js) 소유로 이전됨.

export const LITE_ENTER_FPS = 24;
export const LITE_EXIT_FPS = 45;
export const LITE_VISIBLE_NPCS = 3;

// 품질 사다리 학습 — AA/해상도 배율은 렌더러 생성 시에만 정할 수 있어,
// 이번 세션의 실측 FPS로 다음 접속의 시작 품질을 학습한다.
//   'low'  : AA off, 배율 1.25 (저사양 모드가 발동됐던 기기)
//   null   : AA on, 터치 1.5 / 데스크톱 최소 1.5× 슈퍼샘플 (기본)
//   'high' : AA on + 2.0× 풀 슈퍼샘플 (FPS 55+가 10초 지속됐던 기기)
// 고FPS 지속 시 low→기본→high로 한 단계씩 승급, 저사양 모드 발동 시 즉시 low.
const SPEC_KEY = 'lu-spec-v2';
// 성능 세대 — 베이킹처럼 부하 구조가 크게 바뀌는 최적화를 배포할 때 +1.
// 과거 세대에서 학습된 low/high 판정은 무효화하고 기본값에서 재평가한다
// (실기기 제보: 무겁던 시절 low로 학습된 폰이 최적화 후에도 AA off로 남던 문제).
// gen3: 소프트웨어 렌더링(WARP) 세션에서 학습된 low가 가속을 켠 뒤에도 남아
// 화면이 뿌옇던 문제 + 천장/나무 지오메트리 병합(드로우콜 -60%) 반영 재평가.
const PERF_GEN = 4;
export function readSpec() {
  try {
    const raw = localStorage.getItem(SPEC_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.gen === PERF_GEN && (parsed.v === 'low' || parsed.v === 'high')) return parsed.v;
      return null; // 세대 불일치 — 재평가
    }
    return null;
  } catch (_) {
    return null;
  }
}
export function writeSpec(v) {
  try {
    if (v) localStorage.setItem(SPEC_KEY, JSON.stringify({ v, gen: PERF_GEN }));
    else localStorage.removeItem(SPEC_KEY);
    localStorage.removeItem('lu-spec-v1');
    localStorage.removeItem('lu-lowspec-v1');
  } catch (_) { /* 무시 */ }
}
// 총 렌더 픽셀 예산(px) — low: 1080p×2, base: ≈1440p×3, high: 4K×2.2 상당
export const PX_BUDGET = { low: 8.3e6, base: 11e6, high: 18e6 };
