// scripts/lib/devlog-times.mjs
// 개발일지 항목별 **작성 시각**의 조회 계층. 동결 데이터를 읽는다.
//
// ── 이 모듈은 git 을 보지 않는다 (2026-07-30 재설계) ──────────────────────────
// 1차 판본은 매 호출마다 `git log -p -- docs/DEVLOG.md` 를 파싱했다. 검수관이 반려
// 했고, 반려 사유가 예상보다 나빴다:
//
//   CI checkout 은 shallow(`fetch-depth: 1`)다. shallow 에서는 유일 커밋이 "DEVLOG
//   전체를 새로 추가" 한 diff 로 보이므로 **139개 항목 전부가 체크아웃 시각 하나로
//   수렴한다.** 실측(검수관, `git clone --depth=1`): 고유 시각 개수 = 1.
//
// 즉 실패가 아니라 **그럴듯하게 틀린 값**이 조용히 흘렀다. 1차 판본의 이 자리 주석은
// "(a) 시각을 못 얻으면 null" 이라고 적어놨는데 코드가 그렇게 동작하지 않았다 —
// 문서가 틀린 것을 보증하고 있었다. 이 저장소가 반복해 겪은 형태다.
//
// 그래서 축을 없앴다. 시각은 `docs/devlog-times.json` 에 **동결**돼 있고
// `scripts/extract-devlog-times.mjs` 가 full clone 에서만(shallow 면 거부) 만든다.
// shallow 클론에서도 결과가 같다 — 읽는 것이 파일이기 때문이다.
//
// ── 시각의 두 출처와 우선순위 ────────────────────────────────────────────────
//   ① DEVLOG 제목 줄        `## 2026-07-30 08:15 · 제목`   ← 사람이 적은 값. 이긴다.
//   ② 동결 JSON (git 유래)  과거 139건
//   ③ 없으면 null           — 0시로 채우지 않는다
//
// ①이 이기는 이유: 사람이 직접 적은 시각은 **실제 작업 시각**이고 git 커밋 시각은
// "개발일지를 쓴 시각" 이다. 후자가 전자를 덮어쓰면 정확한 값이 부정확한 값에 밀린다.
// 그리고 ①로 적힌 것은 일괄 기록일 수 없다(그 항목을 쓰는 순간 적은 값이다).

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kstTimeOfIso } from './kst.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FROZEN_PATH = join(ROOT, 'docs', 'devlog-times.json');

/**
 * 동결 데이터를 읽는다.
 *
 * 파일이 없거나 깨졌으면 **빈 데이터**를 돌린다(예외를 던지지 않는다) — 시각 표시는
 * 부가 기능이고 없으면 날짜만 나오면 된다. 다만 "파일이 없어서 비었다" 와 "읽었는데
 * 비었다" 를 `available` 로 구별한다. 못 잰 것을 통과로 적지 않기 위해서다.
 *
 * @param {string} [path] 테스트가 다른 파일을 주입할 수 있게. 기본은 docs/devlog-times.json
 * @returns {{times: Object<string,string>, bulkCommits: Set<string>, available: boolean}}
 */
export function loadFrozenTimes(path = FROZEN_PATH) {
  if (!existsSync(path)) {
    return { times: {}, bulkCommits: new Set(), available: false };
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    return {
      times: raw.times ?? {},
      bulkCommits: new Set(raw.bulkCommits ?? []),
      available: true,
    };
  } catch {
    return { times: {}, bulkCommits: new Set(), available: false };
  }
}

/**
 * 항목 하나의 표시용 시각을 판정한다.
 *
 * @param {{key: string, time: string|null}} entry parseEntries() 항목
 * @param {{times: Object<string,string>, bulkCommits: Set<string>}} frozen loadFrozenTimes() 결과
 * @returns {{time: string|null, bulk: boolean}}
 *   time  'HH:mm'(KST) 또는 null
 *   bulk  이 시각이 **일괄 기록 커밋**에서 왔는가. true 면 실제 작업 시각이 아니므로
 *         표시 측이 시각을 감춘다(build-team.mjs). 실측 50/139 건(36%)이 여기 해당한다.
 */
export function timeInfoFor(entry, frozen) {
  // ① 제목 줄에 적힌 시각이 이긴다.
  if (entry.time) return { time: entry.time, bulk: false };

  // ② 동결 JSON
  const iso = frozen.times[entry.key];
  if (!iso) return { time: null, bulk: false };

  return { time: kstTimeOfIso(iso), bulk: frozen.bulkCommits.has(iso) };
}
