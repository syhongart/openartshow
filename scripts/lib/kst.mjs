// scripts/lib/kst.mjs
// KST (한국 표준시, UTC+9) 날짜·시각 산출. SSOT.
//
// 왜 신설했나: build-valuation.mjs 와 build-readme.mjs 가 "오늘"을 다르게 계산했다.
// · valuation: KST (Date.now() + 9*3600*1000) ✓
// · readme: UTC (toISOString) ✗ — cron 이 04:07 KST = 19:07 UTC 에 돌아서
//   README 갱신일이 매일 하루 늦게 찍혔다.
//
// 두 생성기가 이 모듈만 쓰게 한다. Date.now() 를 안에서 부르지 말고 인자로
// 받아라 — 테스트 가능해야 한다.

const KST_OFFSET_MS = 9 * 3600 * 1000; // UTC+9

/**
 * UTC 타임스탬프를 KST 날짜로 변환한다.
 * @param {number} now Date.now() 값 (밀리초). 기본값은 현재 시각.
 * @returns {string} 'YYYY-MM-DD' 형식 KST 날짜
 */
export function kstDate(now = Date.now()) {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * UTC 타임스탬프를 KST 날짜·시각으로 변환한다.
 * @param {number} now Date.now() 값 (밀리초). 기본값은 현재 시각.
 * @returns {string} 'YYYY-MM-DD HH:mm' 형식 KST 날짜·시각
 */
export function kstDateTime(now = Date.now()) {
  const iso = new Date(now + KST_OFFSET_MS).toISOString();
  return iso.slice(0, 16).replace('T', ' ');
}

export { KST_OFFSET_MS };
