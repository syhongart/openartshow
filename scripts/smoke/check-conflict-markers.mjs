#!/usr/bin/env node
/**
 * 🔴 **병합 마커가 커밋되는 것을 막는다.**
 *
 * ── 왜 생겼나 (2026-09-22) ─────────────────────────────────────────────────
 * 커밋 `3a6edc9e` 가 `docs/BACKLOG.md`·`docs/BOARD.md` 에 병합 마커 6줄을 **신규로
 * 도입**했다. 내가 `git merge origin/main` 의 해소를 놓쳤고, **게이트 8종 어느 것도
 * 그 형태를 안 봤다.** 잡은 것은 검수관이었다(조건부 승인 · 블로커 B1).
 *
 * 그 결과가 무엇이었나: `docs/BACKLOG.md` 는 G-WALK5 와 G-WALK6 항목이 겹쳐 읽히고,
 * `docs/BOARD.md` 는 팀장 판정 하나와 부팀장 보고 이력 블록 **전체**가 충돌 안에
 * 갇혔다. 이 저장소에서 게시판은 **조직의 유일한 공유 장소**다 — 직원은 세션마다
 * 백지에서 시작하고 거기 적힌 것만 본다. 마커 세 줄이 그 창을 닫는다.
 *
 * ── 명세 (검수관 판정 2026-09-22) ─────────────────────────────────────────
 * 네 마커를 **서로 독립된 OR 트리거**로 본다 — 짝이 맞는지 확인하지 않는다.
 * 한쪽만 남아도 그 자체로 고장난 파일이고, 페어링 로직을 넣으면 오히려 놓치는 경로가
 * 생긴다(내 첫 설계가 페어링을 전제해 *"`=======` 만 남으면 못 잡는다"* 는 한계를
 * 스스로 만들고 있었다 — 검수관이 그 전제를 지웠다).
 *
 * `|||||||` 는 `merge.conflictStyle=diff3` 에서 나오는 base 마커다. 지금 사고와는
 * 무관하지만 비용이 0 이라 함께 본다.
 *
 * ── 범위 ──────────────────────────────────────────────────────────────────
 * `git ls-files` 로 **추적 파일만**. `node_modules`·`dist`·`_site` 는 애초에 추적되지
 * 않아 자동으로 빠지고, 바이너리는 `git grep` 이 알아서 건너뛴다.
 *
 * ⚠ **이 파일 자신이 마커 문자열을 품으면 자기 자신에 걸린다.** 그래서 정규식을
 * 리터럴로 적지 않고 문자 반복으로 조립한다 — 「검사가 자기 때문에 못 도는」 형태는
 * 다음 사람이 원인을 찾는 데 가장 오래 걸리는 종류다.
 *
 * ⚠⚠ **못 잡는 것**: 커밋되지 않은 워킹트리 밖(stash·다른 워크트리) · 마커가 문자열
 * 리터럴로 정당하게 들어간 코드(지금 저장소에 0건이고, 생기면 그때 예외 목록이 아니라
 * **이 주석**을 고친다 — 예외 목록은 조용히 자라기 때문이다).
 *
 * ⚠⚠⚠ **오탐이 날 수 있는 두 형태**(검수관 권고 2026-09-22 · 현재 저장소 실측 0건):
 * ① **마크다운 setext 제목** — 제목 줄 **다음 줄**에 `=======` 만 있는 형태다. 이
 *    저장소 문서는 전부 ATX(`#`·`##`)라 지금은 0건이지만, 다른 스타일의 문서가
 *    들어오면 걸린다. ② **diff 를 리터럴로 인용한 문서** — 충돌 해소법을 설명하는
 *    글이 마커를 그대로 적으면 걸린다.
 * 둘 중 하나가 실제로 나면 **예외 목록을 만들지 말고** 이 주석과 판정을 고친다.
 */
import { execFileSync } from 'node:child_process';

/** 마커 네 종. 리터럴로 적지 않는다(위 ⚠ 참조) */
const MARKERS = [
  { name: '시작', re: new RegExp(`^${'<'.repeat(7)}( |$)`) },
  { name: '가운데', re: new RegExp(`^${'='.repeat(7)}$`) },
  // ⚠ `|` 는 **정규식 alternation** 이다 — 이스케이프를 빼면 `|||||||` 가 「빈 패턴 8개
  //   중 하나」가 되어 **모든 줄이 매치된다.** 첫 판본이 그랬고 추적 파일에서 460,035줄이
  //   걸려 즉시 드러났다. 조용히 틀리는 쪽이 아니라 시끄럽게 틀려서 다행인 경우다.
  { name: 'base(diff3)', re: new RegExp(`^${'\\|'.repeat(7)}( |$)`) },
  { name: '끝', re: new RegExp(`^${'>'.repeat(7)}( |$)`) },
];

function tracked() {
  // ⚠ **중복을 지운다** — 병합 충돌 중(`UU`)에는 `git ls-files` 가 같은 파일을 **stage
  // 2·3 으로 세 번** 낸다. 안 지우면 마커 한 줄이 세 번 보고돼 「9줄」처럼 읽힌다.
  // 실측 2026-09-22: 충돌 1건(`docs/BACKLOG.md` 3줄)이 9줄로 나왔다. 판정은 맞았지만
  // 수가 틀렸고, **수가 틀리면 다음 사람이 규모를 오해한다.**
  const out = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 << 20 })
    .split('\0').filter(Boolean);
  return [...new Set(out)];
}

/** 한 파일의 마커 줄. 바이너리·읽기 실패는 조용히 건너뛴다(검사 대상이 아니다) */
function hitsIn(file, read) {
  let text;
  try { text = read(file); } catch { return []; }
  // NUL 이 있으면 바이너리다 — `git grep` 의 판정과 같은 기준
  if (text.includes('\0')) return [];
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const m of MARKERS) {
      if (m.re.test(lines[i])) out.push({ file, line: i + 1, kind: m.name, text: lines[i] });
    }
  }
  return out;
}

/** 검사 본체. 테스트가 파일 목록과 읽기를 갈아 끼울 수 있게 주입받는다 */
export function findConflictMarkers(files, read) {
  return files.flatMap((f) => hitsIn(f, read));
}

function main() {
  const fs = require('node:fs');
  const hits = findConflictMarkers(tracked(), (f) => fs.readFileSync(f, 'utf8'));
  if (!hits.length) {
    console.log('병합 마커 0건.');
    return 0;
  }
  console.error(`병합 마커 FAIL — ${hits.length}줄:`);
  for (const h of hits.slice(0, 40)) {
    console.error(`  ${h.file}:${h.line}  [${h.kind}]  ${h.text.slice(0, 60)}`);
  }
  if (hits.length > 40) console.error(`  … 그리고 ${hits.length - 40}줄 더`);
  console.error('');
  console.error('  `git merge` 해소를 마치지 않은 채 커밋하려는 것이다.');
  console.error('  ⚠ 어느 쪽을 남길지 **판단**하고 지워라 — 마커만 지우면 한쪽 내용이 사라진다.');
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { createRequire } = await import('node:module');
  globalThis.require = createRequire(import.meta.url);
  process.exit(main());
}
