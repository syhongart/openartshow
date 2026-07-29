// scripts/lib/devlog-entries.mjs
// 개발일지 항목 파싱 SSOT — 항목 경계 정의(날짜 기반)
//
// ── 왜 신설했나 ────────────────────────────────────────────────────────────
// build-devlog.mjs·devlog-contributors.mjs·build-readme.mjs 등이 각자 정규식을 들고
// 동일한 값을 여러 방식으로 셌다(값 미러링). 이 모듈로 SSOT를 확보한다.
// 향후 이를 모두 경유하도록 이관할 예정이지만 현재는 build-readme.mjs만 사용.

/**
 * DEVLOG.md 를 항목별로 파싱한다.
 *
 * @param {string} md DEVLOG.md 의 전체 마크다운
 * @returns {Array<{date: string, title: string, body: string}>}
 *          date: YYYY-MM-DD, title: 제목(★ 제외), body: 제목 포함 전체 블록
 */
export function parseEntries(md) {
  // 항목 경계: `## YYYY-MM-DD · 제목\n` (정규식은 build-devlog.mjs:22 와 동일)
  const blocks = md.split(/\n(?=## )/).map((b) => {
    const match = b.match(/^## (\d{4}-\d{2}-\d{2}) · (.+)\n/);
    if (!match) return null;
    return {
      date: match[1],
      title: match[2].trim().replace(/^★\s*/, ''), // ★ 제거
      body: b,
    };
  }).filter((x) => x !== null);

  return blocks;
}

/**
 * 항목 개수를 반환한다. parseEntries() 결과의 길이.
 *
 * @param {string} md DEVLOG.md 의 전체 마크다운
 * @returns {number} 항목 개수
 */
export function countEntries(md) {
  return parseEntries(md).length;
}
