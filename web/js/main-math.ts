// @ts-nocheck — main.js 분해 1차 순수 leaf 이동(byte 무결성), strict 타입은 후속.
// main-math.js — 순수 수학·각도 보간·해시·시각 판정 유틸(공유 상태·import 불요).
//   main.js에서 verbatim 추출(C-3 main 분해 1차). 인자/반환만 쓰는 leaf.

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 최단 각도 보간 (라디안). yaw가 -PI..PI 경계를 도는 방향으로 자연스럽게 회전한다.
export function lerpAngle(a, b, t) {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

// 'auto' 테마 → 관람객의 현지 시각으로 실제 테마 결정 (입장 시점 1회 — 추가 부하 없음).
// 06~16시 daylight / 16~19시 sunset / 그 외 night.
export function resolveAutoTheme(theme) {
  if (theme !== 'auto') return theme;
  const h = new Date().getHours();
  if (h >= 6 && h < 16) return 'daylight';
  if (h >= 16 && h < 19) return 'sunset';
  return 'night';
}

// 짧은 문자열 요약 (공유 링크 전시의 룸 키용 — 같은 링크 = 같은 방)
export function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
