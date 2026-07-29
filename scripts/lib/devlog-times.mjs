// scripts/lib/devlog-times.mjs
// DEVLOG.md 의 항목별 작성 시각을 git 커밋 로그에서 유도한다.
//
// 목표: build-team.mjs 의 입사일·마지막 활동을 "월일 시·분"까지 표시.
//
// 문제: DEVLOG.md 에 시각이 없다(## 2026-07-29 · 제목만 있음).
//
// 방법: git log 로 DEVLOG 변경 커밋을 순회하고, "어느 커밋에서 어느 항목이
// 추가됐는가" 를 파싱한다.
//   git log --reverse --format="C|%aI" -p --unified=0 -- docs/DEVLOG.md
// 에서 `C|<ISO8601>` 뒤의 `+## YYYY-MM-DD · 제목` 줄들이 그 커밋에서
// 추가된 항목이다 → 제목 → 커밋시각 맵.
//
// 한계 셋:
// (a) CI 는 shallow clone (기본값 fetch-depth: 1). 시각을 못 얻으면 null.
// (b) 시각을 못 찾은 항목을 0시로 채우지 말 것 — 못 잰 것을 통과로 적는 것.
// (c) 초기 일괄 커밋은 여러 항목이 한 커밋에 들어가 개별 시각이 아니다.

import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * git log 에서 DEVLOG.md 변경을 파싱해 항목별 시각 맵을 만든다.
 *
 * @returns {Object.<string, string|null>}
 *          제목 → ISO8601 시각 (또는 null 시각을 못 찾은 경우)
 *
 * 한계:
 * - shallow clone 이면 맵이 비거나 일부만 찬다. 에러를 던지지 않는다.
 * - 초기 일괄 커밋에서 여러 항목이 함께 추가되면 전부 같은 시각이다.
 *   그것은 개별 작업 시각이 아니라 "개발일지를 쓴 시각" — 이 한계를
 *   호출자가 명시해야 한다.
 */
export function extractDevlogTimes() {
  const times = {};

  try {
    // git log: --reverse(오래→새), --format="C|%aI"(커밋시각 ISO 앞 마커),
    // -p(패치), --unified=0(컨텍스트 0줄 — 변경 줄만).
    // DEVLOG.md 만.
    const log = execSync(
      'git log --reverse --format="C|%aI" -p --unified=0 -- docs/DEVLOG.md',
      { cwd: ROOT, encoding: 'utf8' }
    );

    const lines = log.split('\n');
    let currentTime = null; // 현재 커밋 시각

    for (const line of lines) {
      // 커밋 마커: "C|<ISO8601>"
      if (line.startsWith('C|')) {
        currentTime = line.slice(2); // "C|" 제거
      }
      // 추가 줄: "+## YYYY-MM-DD · 제목"
      // diff unified 형식에서 추가는 "+"로 시작.
      else if (line.startsWith('+') && line.includes('## ')) {
        const match = line.match(/^\+## \d{4}-\d{2}-\d{2} · (.+)$/);
        if (match) {
          const title = match[1].trim();
          times[title] = currentTime; // null 일 수도, ISO 시각일 수도
        }
      }
    }
  } catch (e) {
    // git 명령 실패 (예: shallow clone, git 미설치)
    // 조용히 빈 맵 반환. 에러 던지지 말 것 — 호출자가 null 처리한다.
    // console.error(`devlog-times: git log 실패 — ${e.message}`);
  }

  return times;
}

/**
 * 항목 제목에서 시각을 조회한다. 없으면 null.
 * @param {Object.<string, string|null>} timesMap extractDevlogTimes() 반환값
 * @param {string} title 항목 제목
 * @returns {string|null} ISO8601 시각 또는 null
 */
export function getDevlogTime(timesMap, title) {
  return timesMap[title] ?? null;
}
