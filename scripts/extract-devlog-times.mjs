#!/usr/bin/env node
// scripts/extract-devlog-times.mjs
// DEVLOG 항목별 작성 시각을 git 이력에서 **한 번 뽑아 동결**한다 → docs/devlog-times.json
//
// ── 왜 동결인가 (감독 결정 2026-07-30) ──────────────────────────────────────
// 1차 구현은 배포마다 git log 를 파싱했다. 검수관이 반려했고 실패 모드가 예상보다
// 나빴다: CI checkout 은 shallow(`fetch-depth: 1`)라 **139개 항목 전부가 체크아웃
// 커밋의 시각 하나로 수렴**했다. null 이 아니라 "그럴듯하게 틀린 값" 이 조용히 흘렀다.
//
// 동결하면 그 축이 통째로 없어진다 — 런타임에 git 을 안 본다. 대가는 "새 항목이
// 자동으로 안 들어온다" 인데, **앞으로 쓰는 항목은 제목 줄에 시각을 직접 적으면 된다**:
//   ## 2026-07-30 08:15 · 제목
// 그러면 이 스크립트를 다시 돌릴 일도 없다(과거 항목만 여기 남는다).
//
// 선례: `docs/devlog-legacy-slugs.json` 이 배포된 URL 을 같은 방식으로 동결했다.
//
// ── 실행 ────────────────────────────────────────────────────────────────────
//   node scripts/extract-devlog-times.mjs          # 갱신
//   node scripts/extract-devlog-times.mjs --check  # 쓰지 않고 차이만 보고(종료코드로 판정)
//
// **CI 에서 돌지 않는다.** deploy.yml·ci.yml 어디에도 없다 — 손으로 돌려 커밋하는
// 파일이다. full clone 을 요구하기 때문이고, 그 전제를 아래에서 강제한다.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTRY_RE, entryKey } from './lib/devlog-entries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'devlog-times.json');
const DEVLOG = 'docs/DEVLOG.md';

const CHECK_ONLY = process.argv.includes('--check');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

// ── shallow 거부 ────────────────────────────────────────────────────────────
// 이것이 이 스크립트의 가장 중요한 줄이다. shallow repository 에서 돌리면 모든
// 항목이 체크아웃 커밋 시각 하나로 수렴한 **오염된 파일**이 만들어지고, 그것이
// 커밋되면 아무도 눈치채지 못한다(값이 그럴듯하다). 못 재면 재지 않는다.
const isShallow = git(['rev-parse', '--is-shallow-repository']).trim() === 'true';
if (isShallow) {
  console.error('거부: shallow repository 다 (git rev-parse --is-shallow-repository = true).');
  console.error('');
  console.error('  shallow 에서는 유일 커밋이 "DEVLOG 전체를 새로 추가" 한 diff 로 보이므로');
  console.error('  모든 항목이 체크아웃 시각 하나로 수렴한다 — 실패가 아니라 오염된 값이');
  console.error('  나오고, 그 값은 그럴듯해서 검토를 통과한다.');
  console.error('');
  console.error('  해결: full clone 에서 실행하라 (git fetch --unshallow).');
  process.exit(2);
}

// ── git 이력에서 항목별 **최초 등장** 시각을 뽑는다 ──────────────────────────
// `--reverse` 로 오래된 커밋부터 본다. 같은 제목이 여러 커밋에 나타나면(오탈자 수정
// 등으로 제목 줄이 재작성되면) **처음 것만** 채택한다 — 나중 것을 쓰면 "첫 등장" 이
// 최근 편집 시각으로 밀린다(검수관 지적 엣지케이스).
const log = git(['log', '--reverse', '--format=C|%aI', '-p', '--unified=0', '--', DEVLOG]);

/** @type {Map<string, string>} entryKey → ISO8601 (최초 등장) */
const firstSeen = new Map();
/** @type {Map<string, Set<string>>} ISO8601 → 그 커밋에 등장한 항목의 날짜 집합 */
const datesPerCommit = new Map();

let commitIso = null;
for (const line of log.split('\n')) {
  if (line.startsWith('C|')) {
    commitIso = line.slice(2).trim();
    continue;
  }
  // 추가된 줄만 본다. `-` 줄(삭제된 옛 제목)을 채택하면 지워진 제목의 시각이 섞인다.
  if (!line.startsWith('+') || line.startsWith('+++')) continue;

  // ENTRY_RE 를 재사용한다 — 제목 정규식을 여기 또 적으면 5번째 미러가 된다.
  // `+` 를 떼고 개행을 붙이면 본문 캡처가 빈 문자열로 매치된다.
  const m = `${line.slice(1)}\n`.match(ENTRY_RE);
  if (!m || !commitIso) continue;

  const date = m[1];
  // ── 제목에 시각이 적힌 항목은 동결 대상이 **아니다** ──────────────────────
  // 그 시각이 git 커밋 시각을 이긴다(사람이 적은 실제 작업 시각 vs 일지를 쓴 시각).
  // 동결 파일에 넣으면 쓰이지 않는 값이 쌓이고, `--check` 가 그것을 "신규" 로 요구해
  // 게이트를 떨어뜨린다 — 실제로 승격 항목(`## 2026-07-30 12:19 · …`)에서 그랬다.
  // 앞으로 모든 항목이 시각을 적으면 이 파일은 더 자라지 않는다. 의도한 설계다.
  if (m[2]) continue;
  const key = entryKey(date, m[3].trim());
  if (!firstSeen.has(key)) firstSeen.set(key, commitIso);

  if (!datesPerCommit.has(commitIso)) datesPerCommit.set(commitIso, new Set());
  datesPerCommit.get(commitIso).add(date);
}

// ── 일괄 기록 커밋 판정 ─────────────────────────────────────────────────────
// **정의로 판정한다 — 임계값을 추측하지 않는다.**
//
// 일괄 기록이란 "여러 날짜의 항목이 한 커밋에 함께 들어온 것" 이다. 한 커밋에 담긴
// 항목의 **고유 날짜가 2개 이상**이면, 그 커밋 시각은 최소한 일부 항목에게는 실제
// 작업 시각이 아니다(다른 날 한 일을 그때 적은 것이다). 같은 날 항목 여러 개를 한
// 번에 커밋하는 것은 정상이므로 개수 임계값("N개 이상이면 일괄")은 쓰지 않는다 —
// 그것은 실측에 여유를 얹은 값이 되고, 이 저장소가 이미 그 패턴으로 사고를 냈다.
const bulkCommits = [...datesPerCommit.entries()]
  .filter(([, dates]) => dates.size >= 2)
  .map(([iso]) => iso)
  .sort();

// ── 기존 파일과 병합 — 기존 키는 덮어쓰지 않는다 ─────────────────────────────
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { times: {} };
const prevTimes = prev.times ?? {};

const times = { ...prevTimes };
let added = 0;
// **불일치는 따로 모은다.** 갱신 모드는 기존 값을 지키지만(제목 편집으로 "첫 등장" 이
// 최신 편집 시각으로 밀리는 것을 막는 설계), `--check` 는 그것을 **보고해야 한다**.
//
// 이 구분이 없던 첫 판본은 --check 가 기존 값을 그대로 통과시켰다. 그래서 파일의 시각
// 하나를 임의로 바꿔도 종료코드 0 이었다 — 뮤테이션(M4-b)으로 확인했다. 그 상태로
// 테스트 주석에 "check:devlog-times 가 이 오염을 잡는다" 고 적어뒀는데 **거짓이었다.**
const mismatched = [];
for (const [key, iso] of [...firstSeen.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (!(key in times)) {
    times[key] = iso;
    added++;
  } else if (times[key] !== iso) {
    mismatched.push({ key, stored: times[key], git: iso });
  }
}
// 키 정렬 — diff 를 읽을 수 있게. Object 삽입 순서가 JSON 출력 순서다.
const sortedTimes = Object.fromEntries(
  Object.entries(times).sort((a, b) => a[0].localeCompare(b[0]))
);

const next = {
  // 이 파일이 무엇이고 어떻게 만들어졌는지 파일 자신이 말한다.
  _note: 'DEVLOG 항목별 작성 시각(git 커밋 시각) 동결. scripts/extract-devlog-times.mjs 가 생성. 손으로 고치지 말 것.',
  source: 'git log --reverse -p --unified=0 -- docs/DEVLOG.md (full clone)',
  // bulkCommits: 여러 날짜의 항목이 함께 들어온 커밋 시각. 이 시각을 가진 항목은
  // "개발일지를 몰아 쓴 시각" 이므로 표시 측이 시각을 감춘다(build-team.mjs).
  bulkCommits,
  times: sortedTimes,
};

const nextJson = `${JSON.stringify(next, null, 2)}\n`;
const prevJson = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';

console.log(`항목 ${firstSeen.size}건 · 신규 ${added}건 · 총 ${Object.keys(sortedTimes).length}건`);
console.log(`일괄 기록 커밋 ${bulkCommits.length}건: ${bulkCommits.join(', ') || '(없음)'}`);

if (mismatched.length) {
  console.error('');
  console.error(`저장된 시각이 git 이력과 다르다 (${mismatched.length}건):`);
  for (const m of mismatched.slice(0, 10)) {
    console.error(`  ${m.key}`);
    console.error(`    저장: ${m.stored}`);
    console.error(`    git : ${m.git}`);
  }
  if (mismatched.length > 10) console.error(`  … 외 ${mismatched.length - 10}건`);
  console.error('');
  console.error('  값이 손으로 편집됐거나 이력이 재작성됐다. 둘 중 하나다:');
  console.error('   · 오염이면 → git 값으로 되돌려라 (docs/devlog-times.json 을 git checkout)');
  console.error('   · 의도한 것이면 → 왜 다른지 커밋 메시지에 남겨라');
}

if (CHECK_ONLY) {
  // 불일치는 파일 크기 변화가 없어도 **실패로 잡는다.** 첫 판본은 `nextJson !== prevJson`
  // 만 봤고, 갱신 로직이 기존 키를 덮어쓰지 않으므로 변조된 값이 그대로 유지돼 두 문자열
  // 이 같았다 → 종료코드 0. 뮤테이션(M4-b)이 그것을 드러냈다.
  if (mismatched.length || nextJson !== prevJson) {
    console.error('차이 있음 — 위 내용을 확인하고 필요하면 갱신/되돌려라.');
    process.exit(1);
  }
  console.log('변경 없음 · git 이력과 일치.');
  process.exit(0);
}

if (nextJson !== prevJson) {
  writeFileSync(OUT, nextJson, 'utf8');
  console.log(`기록: docs/devlog-times.json`);
} else {
  console.log('변경 없음.');
}
