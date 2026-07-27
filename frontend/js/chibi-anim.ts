// @ts-nocheck — 순수 이동(C-3 chibi 분해), strict 타입은 후속 작업.
// chibi-anim.js — 이징·액션 지속시간/라벨·sit 골반 안전곡선. 순수(THREE 미참조).
//   chibi.js에서 분해(C-3 S3). builder 공용.

// ---------------------------------------------------------------------------
// 이징 곡선 — 사용자 액션(인사/절/박수 등)의 비대칭 모션용. 걷기/숨쉬기의 순수
// 사인파와 달리, 이 곡선들은 "훅 들어갔다 스르륵 돌아오는" 류의 生동감을 낸다.
// 모듈 1회 정의 · 상태 없음 · 모든 아바타가 공유.
// ---------------------------------------------------------------------------
export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const easeInCubic = (x) => x * x * x;
export const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// 오버슈트 — 목표를 살짝 지나쳤다 안착(백스윙). x>1 근방에서 1을 살짝 넘었다 수렴한다.
export const easeOutBack = (x) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// 사용자 액션 목록 — 지속시간(초). playAction(name)이 참조하는 SSOT.
// ※ 저장 파라미터가 아니라 런타임 재생 상태다 — encodeChibi/normalizeChibi와 무관.
// UI(꾸미기 프리뷰 재생 강조 타이머)도 이 값을 공유하도록 export한다.
export const CHIBI_ACTION_DUR = {
  // 기존 6 — P1~P6
  wave: 1.7, jump: 0.72, bow: 1.5, clap: 1.6, dance: 2.6, kick: 0.85,
  // 신규 6 — 무릎 세분화(감독 착수 지시)로 가능해진 동작. 총 12개.
  breakdance: 2.8, run: 1.8, sit: 1.8, jumpingjack: 1.6, heart: 1.6, sulk: 1.8,
};
export const CHIBI_ACTIONS = Object.keys(CHIBI_ACTION_DUR);
// 액션 한글 라벨 — 꾸미기 프리뷰 액션 테스트 버튼 등 UI가 공유하는 SSOT.
export const CHIBI_ACTION_LABELS = {
  wave: '인사', jump: '점프', bow: '절', clap: '박수', dance: '춤', kick: '발차기',
  breakdance: '브레이크댄스', run: '달리기', sit: '앉기', jumpingjack: '팔벌려뛰기', heart: '하트', sulk: '삐짐',
};

// ---------------------------------------------------------------------------
// sit 골반(wrapper.y) 안전 곡선 (검수관 지적 — 3차 재수정)
// 발은 SphereGeometry(0.082)를 (1, 0.72, 1.25)로 스케일한 타원체라 y반경(0.059)보다
// z반경(0.1025)이 크다. "발 중심 − y반경"으로 바닥면을 근사하던 이전 튜닝은 발이
// 고관절+무릎 합산 회전으로 기울어지는 중간 구간에서 실제로는 더 큰 z반경 쪽이
// 바닥을 향해 dip이 훨씬 깊어지는 걸 놓쳤다(실측 -0.13, 관통). HIP_MAX/KNEE_MAX를
// 아무리 다시 스케일해도 이 중간-각도 dip은 사라지지 않고(회전각 자체의 기하학적
// 성질이라 소거 불가) 오히려 그 구간에서 골반을 살짝 들어올려야 안전하다는 것을
// 헤드리스 Box3(회전 반영) 실측으로 확인했다. sitK 0→1 전 구간을 스캔해 "이 값
// 이상이면 항상 세이프 마진(0.015) 확보"하는 wrapper.y 하한선을 구해 표로 굳혔다
// (선형보간). HIP_MAX=0.4, KNEE_MAX=1.9(선형, 리드 없음) 기준으로 산출.
export const SIT_WY_TABLE = [
  0.0120, 0.0223, 0.0312, 0.0386, 0.0446, 0.0490, 0.0519, 0.0533, 0.0530, 0.0512,
  0.0479, 0.0429, 0.0365, 0.0285, 0.0191, 0.0083, -0.0038, -0.0172, -0.0319, -0.0477, -0.0645,
];
export function sitWrapperY(k) {
  const kk = Math.max(0, Math.min(1, k)) * (SIT_WY_TABLE.length - 1);
  const i0 = Math.floor(kk);
  const i1 = Math.min(SIT_WY_TABLE.length - 1, i0 + 1);
  const f = kk - i0;
  return SIT_WY_TABLE[i0] * (1 - f) + SIT_WY_TABLE[i1] * f;
}
