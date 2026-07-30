// scripts/lib/devlog-entries.mjs
// 개발일지 항목 파싱 SSOT — 항목 경계·제목 정규화·시각 파싱.
//
// ── 왜 SSOT 여야 하나 (2026-07-30 확장) ─────────────────────────────────────
// 같은 제목 정규식이 4곳에 있었다:
//   build-devlog.mjs:22 · build-making.mjs:104 · devlog-contributors.mjs:183 · 여기
// 그리고 **이미 어긋나 있었다** — ★ 제거 규칙이 두 갈래였다:
//   build-devlog.mjs   `/^★+\s*/`  (전량 제거)
//   devlog-entries.mjs `/^★\s*/`   (하나만)
// ★★ 로 시작하는 항목에서 두 파서가 서로 다른 제목을 만든다. 아무도 몰랐다.
//
// 제목 줄에 **시각을 옵션으로 허용**하기로 하면서 이것을 더 방치할 수 없게 됐다.
// 정규식이 시각을 모르는 파서는 `## 2026-07-30 08:15 · 제목` 을 **매치 실패로
// 처리해 항목을 조용히 버린다**(`return null`/`continue`). 개발일지 페이지에서
// 사라지고, README 건수에서 빠지고, 기여 집계에도 안 잡힌다 — 어느 게이트도 그것을
// "사라졌다" 고 말해주지 않는다. 그래서 네 소비자를 전부 이 모듈로 모았다.

/**
 * 항목 제목 줄. 시각(HH:MM)은 **옵션**이다.
 *
 *   ## 2026-07-30 08:15 · 제목     ← 신규(시각 있음)
 *   ## 2026-07-29 · 제목           ← 기존(시각 없음, 그대로 유효)
 *
 * 캡처: 1=날짜 2=시각|undefined 3=제목(★ 포함) 4=본문(제목 줄 제외)
 */
export const ENTRY_RE = /^## (\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))? · (.+)\n([\s\S]*)$/;

/**
 * 제목에서 ★ 접두를 **전량** 제거한다.
 *
 * 하나만 떼는 패턴(★ 뒤 공백까지, 수량자 없음)으로는 ★★ 항목이 ★ 하나를 남긴 채
 * 렌더링에 노출된다 — 실제로 그랬고 `build-devlog.mjs` 만 고쳐져 있었다.
 */
export function stripStars(title) {
  return String(title).replace(/^★+\s*/, '').trim();
}

/**
 * 항목의 안정 키. `docs/devlog-times.json`·`docs/devlog-legacy-slugs.json` 의
 * 키 형식이며 **두 파일이 같은 형식을 쓴다**(`devlog-slug.mjs` 의 `${date} · ${clean}`).
 *
 * ★ 를 제거한 제목을 쓴다 — ★ 는 표시·분류 축이고 키에 들어가면 ★ 를 붙이거나
 * 떼는 순간 키가 갈라진다.
 */
export function entryKey(date, title) {
  return `${date} · ${stripStars(title)}`;
}

/**
 * DEVLOG.md 를 항목별로 파싱한다.
 *
 * @param {string} md DEVLOG.md 의 전체 마크다운
 * @returns {Array<{date: string, time: string|null, rawTitle: string, title: string,
 *                  content: string, body: string, key: string}>}
 *   date     YYYY-MM-DD
 *   time     HH:MM — 제목 줄에 적혀 있으면. 없으면 null(0시로 채우지 않는다)
 *   rawTitle ★ 를 **포함한** 제목 — 카테고리 판정이 ★ 를 볼 수 있어야 한다
 *   title    ★ 를 제거한 표시용 제목
 *   content  제목 줄을 **제외한** 본문
 *   body     제목 줄을 **포함한** 전체 블록(역할 패턴 매칭이 제목까지 봐야 한다)
 *   key      entryKey() — 동결 데이터 조회용
 */
export function parseEntries(md) {
  // CRLF 정규화를 여기서 한다. 예전에는 build-devlog.mjs 만 했고 나머지 세 파서는
  // 안 했다 — Windows 워킹트리에서 그 셋만 블록 파싱이 깨지는 비대칭이었다.
  const src = String(md).replace(/\r\n/g, '\n');

  return src.split(/\n(?=## )/).map((b) => {
    const m = b.match(ENTRY_RE);
    if (!m) return null;
    const rawTitle = m[3].trim();
    const date = m[1];
    return {
      date,
      time: m[2] ?? null,
      rawTitle,
      title: stripStars(rawTitle),
      content: m[4],
      body: b,
      key: entryKey(date, rawTitle),
    };
  }).filter((x) => x !== null);
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
