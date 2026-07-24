// fog-view.js — "플레이어가 바다 원경을 바라보는가" 순수 판정(WebGL 무관, 유닛테스트 가능).
//
// 용도: 오픈월드 fog 자동 전환(평소 프리셋 D / 바다 원경 응시 시 C). 판정만 담당하고
//   fog near/far 보간은 world.js update()가 한다(관심사 분리 → world.js diff 최소화).
//
// 좌표 관례(world.js와 동일): yaw=0 = -Z(북). 전방벡터 fwd = (-sin yaw, -cos yaw)
//   (world.js dirBonus/updateStreaming: fx=-sin(yaw), fz=-cos(yaw)).
// 바다 = 그리드 바깥 전 둘레. 경계 셀(px/pz가 0 또는 w-1/h-1)에서만 바다를 향할 수 있다.
//   바깥 법선: W(px<=0)→(-1,0), E(px>=w-1)→(+1,0), N(pz<=0)→(0,-1), S(pz>=h-1)→(0,+1).
//   코너 셀은 두(이상) 법선 중 시선과 가장 정렬된 것(max 내적)을 쓴다.
// 히스테리시스: 경계 시선이 임계각 근처를 오갈 때 target boolean 진동(깜빡임)을 막기 위해
//   진입은 엄격(반각 45°, cos≈0.707), 유지는 완화(반각 60°, cos=0.5) 임계를 쓴다.

const COS_ENTER = Math.cos(45 * Math.PI / 180); // ≈0.7071 — OFF→ON 진입(엄격)
const COS_EXIT = Math.cos(60 * Math.PI / 180);  // =0.5     — ON 유지(완화)

/**
 * 현재 파셀·시선이 "바다 원경 응시"인지 판정한다.
 * @param {number} px 현재 파셀 x 인덱스(getCurrentParcel)
 * @param {number} pz 현재 파셀 z 인덱스
 * @param {number} yaw 시선 yaw(rad, 0=-Z=북)
 * @param {number} w 그리드 가로 셀 수(manifest grid.w)
 * @param {number} h 그리드 세로 셀 수(grid.h)
 * @param {boolean} wasSea 직전 판정 상태(히스테리시스용)
 * @returns {boolean} 바다 원경 응시면 true
 */
export function isViewingSea(px, pz, yaw, w, h, wasSea) {
  const onW = px <= 0, onE = px >= w - 1, onN = pz <= 0, onS = pz >= h - 1;
  if (!(onW || onE || onN || onS)) return false; // 내부 파셀 → 바다 안 보임(평소 D)
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw); // 전방벡터(world.js 관례)
  let best = -1;
  if (onW) best = Math.max(best, fx * -1); // 서쪽 바다 법선 (-1,0)
  if (onE) best = Math.max(best, fx * 1);  // 동쪽 (+1,0)
  if (onN) best = Math.max(best, fz * -1); // 북쪽 (0,-1)
  if (onS) best = Math.max(best, fz * 1);  // 남쪽 (0,+1)
  return best >= (wasSea ? COS_EXIT : COS_ENTER);
}
