#!/usr/bin/env node
// scripts/gate.mjs — 게이트 조립을 코드로 고정한다. `npm run gate`
//
// ── 왜 스크립트인가 (감독 지시 2026-07-30) ──────────────────────────────────
// 감독: *"지금보니 너 동작할때 자꾸 빠뜨리고. 실패하고. 우리 메모리 기능을 넣을까?"*
//
// 실측으로 원인을 나눴다. CLAUDE.md 는 이미 17,756자·규율 29개다. 그날 어긴 것 중
// 셋은 **적혀 있는데 어긴 것**이었고(문서를 늘려도 무효), 둘은 **아예 안 적힌 것**
// 이었다. 그리고 가장 여러 번 반복된 실패는 셋 다 아니었다 — **게이트를 매번 손으로
// 조립한 것**이다.
//
//   1회차: `npm run lint; npm run typecheck; npm test` 처럼 `;` 로 나열
//          → 읽는 사람이 판정자가 되고, typecheck=2 를 화면에서 보고도 커밋했다
//   2회차: `set -e` 로 고쳤다. 그런데 `| tail -4` 로 파이프했다
//          → **pipefail 이 없으면 종료코드가 tail 의 것(0)** 이라 set -e 가 안 걸린다
//          → 또 typecheck 에러를 화면에 띄운 채 "게이트 4종 전부 통과" 라고 적었다
//
// 두 번 다 형태만 달랐고 원인은 같다: **매번 손으로 조립하니 매번 다르게 틀렸다.**
// 조립을 없애면 틀릴 자리가 없어진다. Node 는 자식 프로세스의 종료코드를 직접 받으므로
// 파이프·pipefail 문제가 구조적으로 존재하지 않는다.
//
// ── 무엇을 안 하는가 ────────────────────────────────────────────────────────
// 스모크(`smoke:vite`)는 넣지 않는다 — 브라우저를 띄워 수십 초가 걸리고, 배포 전
// **독립 executor** 가 돌리는 것이 규율이다(§10-3, 구현자 본인 금지). 여기 넣으면
// 구현자가 스모크를 돌리는 습관이 생긴다.

import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const STAMP_PATH = join(ROOT, '.gate-stamp');

/**
 * 게이트 목록. **순서가 곧 실행 순서**이고 싼 것부터 둔다 — lint 로 걸릴 것을
 * test 16초 뒤에 알 이유가 없다.
 *
 * `cmd` 는 package.json 의 script 이름이다. 여기에 명령줄을 직접 적지 않는다
 * (그러면 package.json 과 값 미러링이 된다).
 */
export const GATES = [
  { name: 'lint', cmd: 'lint' },
  { name: 'typecheck', cmd: 'typecheck' },
  // check:refs — `@ts-nocheck` 로 tsc 가 건너뛰는 .ts 모듈의 미해결 참조를 본다.
  // ci.yml:46 과 스모크에는 배선돼 있었으나 **로컬 게이트에만 빠져 있었다**(신설한
  // tests/gate.test.ts 가 첫 실행에서 잡았다). 로컬에서 통과한 것이 CI 에서 깨지는
  // 상태였고, 이 검사가 보는 것은 런타임 ReferenceError 라 가장 늦게 알면 안 된다.
  { name: 'check:refs', cmd: 'check:refs' },
  { name: 'check:gitadd', cmd: 'check:gitadd' },
  { name: 'check:devlog-times', cmd: 'check:devlog-times' },
  { name: 'test', cmd: 'test' },
];

/**
 * 스탬프를 지운다. **실패·거부 경로에서 반드시 부른다.**
 *
 * 안 지우면 **옛 통과를 상속한다.** 뮤테이션이 드러냈다: 게이트가 거부(exit 1)해도
 * 이전 실행의 스탬프가 남아 있고, index 가 그대로면(워킹트리만 고친 경우) 훅이 그
 * 해시와 일치한다고 판정해 통과시킨다 — 검수관이 재현한 시나리오가 그대로 성립한다.
 * "쓰지 않는다" 로는 부족하고 "지운다" 여야 한다.
 */
function clearStamp() {
  if (existsSync(STAMP_PATH)) unlinkSync(STAMP_PATH);
}

/** 현재 index 의 트리 해시. 커밋될 내용을 그대로 가리킨다. */
export function indexTreeHash(cwd = ROOT) {
  const r = spawnSync('git', ['write-tree'], { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/**
 * 위험 경로 — 여기를 만졌으면 별도 절차가 붙는다.
 *
 * CLAUDE.md 의 규율과 같은 값을 적고 있으므로 `tests/gate.test.ts` 가 정합을 검사한다
 * (한쪽만 고치면 테스트가 깨진다). `config.js` 는 **일부러 넣지 않았다** — 그 파일은
 * 존재하지 않고 실재는 `config.ts` 다(태스크 #138).
 */
export const RISK_PATHS = [
  { label: '.github/workflows/', re: /^\.github\/workflows\//, why: '§10-4 검수관 무조건' },
  { label: 'scripts/smoke/', re: /^scripts\/smoke\//, why: '§10-4 검수관 무조건' },
  { label: '보호파일(라이브 런타임)', re: /^frontend\/js\/(main|player|artworks|config)\.(js|ts)$/, why: '팀장 사전서명' },
];

/**
 * 이 브랜치가 만진 것을 위험도별로 요약한다. **0 이어도 출력한다.**
 *
 * ── 왜 이것이 게이트에 있나 (감독 지시 2026-07-30 *"실수가 왜 이렇게 많지?"*) ──
 * 그날 실수 40건을 패턴으로 묶으니 최대 집단이 **"확인할 수 있었는데 확인 없이 단정"**
 * 이었다. 그리고 그 주장들은 전부 같은 종류였다 — *이 브랜치가 무엇을 만졌는가*:
 *   · "typecheck 0" (게이트 결과를 안 보고)
 *   · "워크플로 diff 0" (ci.yml 만 보고 deploy.yml 을 안 봐서 거짓이 됐다)
 *   · "미러 6곳 중 4곳만 잡는다" (grep 한 번이면 6곳 다 잡을 수 있었다)
 *   · "권고 3건 반영" (git diff 에 없었다)
 * 전부 **단일 명령으로 확인 가능**했는데 안 했다. 그럴듯해서 확인하지 않은 것이다.
 *
 * 그래서 확인을 선택에서 뺐다. 내가 보든 안 보든 **매번 화면에 나온다.** 게이트는
 * 자연어 주장을 검사할 수 없지만, 그 주장의 근거를 눈앞에 놓을 수는 있다.
 */
export function changeSummary(base = 'origin/main', cwd = ROOT) {
  const r = spawnSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd, encoding: 'utf8' });
  if (r.status !== 0) return null; // base 를 못 찾으면(오프라인 등) 조용히 생략
  const files = (r.stdout ?? '').split('\n').map((s) => s.trim()).filter(Boolean);

  const buckets = RISK_PATHS.map((p) => ({ ...p, hits: files.filter((f) => p.re.test(f)) }));
  const risky = new Set(buckets.flatMap((b) => b.hits));
  const other = files.filter((f) => !risky.has(f));

  // 로컬 잔재 — 무시된 생성물이 워킹트리에 쌓여 있으면 진단을 오염시킨다. 실제 사고:
  // 검사2 의 `+3` 이중계상을 "devlog 140" 근거로 진단했는데, 그 140 은 경로 재편 전
  // 산출물 139개가 로컬에 남아 있던 것이었다(클린 클론에서는 1). 결론은 맞고 근거가
  // 틀렸다 — `git status` 에 안 보여서 아무도 몰랐다.
  const ig = spawnSync('git', ['status', '--porcelain', '--ignored', '--untracked-files=all'], { cwd, encoding: 'utf8' });
  const stale = (ig.stdout ?? '').split('\n')
    .filter((l) => l.startsWith('!!'))
    .map((l) => l.slice(3).trim())
    // 의존성·빌드 산출물은 **노이즈다.** 첫 판본이 이것을 안 걸러 8,398개를 세었고
    // (node_modules 7,671 · _site 370 · dist 68) 정작 봐야 할 수(making 143 ·
    // devlog 140)가 묻혔다. 진단을 오염시키는 것은 **생성기 산출물**이다.
    .filter((p) => !/^(node_modules|dist|_site|\.git)\//.test(p))
    .length;

  return { files, buckets, other, stale, base };
}

function printChangeSummary() {
  const s = changeSummary();
  if (!s) return;
  // base 의 신선도를 함께 찍는다(검수관 권고) — `origin/main` 이 낡았으면 범위가
  // 오판된다. fetch 여부를 코드가 강제할 수는 없으니 눈으로 볼 수 있게 한다.
  const bi = spawnSync('git', ['log', '-1', '--format=%h %ad', '--date=format:%m-%d %H:%M', s.base],
    { cwd: ROOT, encoding: 'utf8' });
  const baseInfo = bi.status === 0 ? bi.stdout.trim() : '?';
  console.log('');
  console.log(`── 이 브랜치가 만진 것 (${s.base} = ${baseInfo} 대비) ${'─'.repeat(10)}`);
  for (const b of s.buckets) {
    const mark = b.hits.length ? '⚠' : ' ';
    console.log(`  ${mark} ${b.label.padEnd(24)} ${String(b.hits.length).padStart(3)} 파일${b.hits.length ? `   → ${b.why}` : ''}`);
    for (const f of b.hits) console.log(`      ${f}`);
  }
  console.log(`    ${'그 외'.padEnd(23)} ${String(s.other.length).padStart(3)} 파일`);
  if (s.stale > 0) {
    console.log('');
    console.log(`  ⚠ 무시된 산출물 ${s.stale}개가 워킹트리에 있다 — 수치를 진단 근거로 쓸 때`);
    console.log('    클린 클론에서 다시 재라(로컬 잔재가 근거를 오염시킨 전례가 있다).');
  }
  console.log('─'.repeat(60));
}

function run(gate) {
  const label = gate.name.padEnd(20);
  process.stdout.write(`  ${label} `);
  const r = spawnSync('npm', ['run', '--silent', gate.cmd], {
    cwd: ROOT,
    encoding: 'utf8',
    // 출력을 삼키지 않는다 — 실패했을 때 왜 실패했는지 그대로 보여준다.
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const code = r.status ?? -1;
  if (code === 0) {
    console.log('PASS (exit 0)');
    return { ...gate, code, out: r.stdout ?? '', err: r.stderr ?? '' };
  }
  console.log(`FAIL (exit ${code})`);
  return { ...gate, code, out: r.stdout ?? '', err: r.stderr ?? '' };
}

function main() {
  let failed = null;
  for (const gate of GATES) {
    const res = run(gate);
    if (res.code !== 0) {
      failed = res;
      break; // 첫 실패에서 멈춘다. 뒤를 돌려도 정보가 늘지 않고 시간만 쓴다.
    }
  }

  if (failed) {
    console.log('');
    console.log(`── ${failed.name} 실패 출력 ${'─'.repeat(40)}`);
    const body = `${failed.out}\n${failed.err}`.trim().split('\n');
    // 앞부분이 아니라 **뒤 40줄**을 보여준다 — 에러 요약이 보통 끝에 있다.
    console.log(body.slice(-40).join('\n'));
    console.log('─'.repeat(60));
    console.log('');
    console.log(`게이트 실패: ${failed.name} (exit ${failed.code})`);
    clearStamp();
    console.log('스탬프를 지웠다 — pre-commit 훅이 커밋을 막는다.');
    return 1;
  }

  // ── 워킹트리와 index 가 어긋나면 스탬프를 쓰지 않는다 ──────────────────────
  //
  // **검수관이 재현한 블로커(2026-07-30).** 첫 판본은 이 검사가 없어서, 이 도구가
  // 없애려던 패턴을 도구 자신이 새로 만들고 있었다:
  //
  //   1. 깨진 코드를 `git add` (index = 깨진 버전)
  //   2. 워킹트리에서 고친다. **재-add 하지 않는다** (disk = 고친 버전)
  //   3. `npm run gate` → lint·tsc·vitest 는 **디스크**를 읽으므로 PASS.
  //      그런데 스탬프는 `git write-tree`(= **index**, 깨진 버전)의 해시다
  //   4. `git commit` → 훅이 index 해시를 다시 계산해 "일치 — 통과"
  //   5. 커밋된 HEAD 는 **게이트가 본 적 없는 깨진 코드**다(typecheck 실패 상태)
  //
  // 검수관이 별도 클론에서 실제로 재현했다. 사람이 게이트 결과를 정확히 읽어도 안
  // 잡힌다 — 앞선 사고들("사람이 결과를 잘못 읽었다")과 종류가 다르고 더 나쁘다.
  // `git add` 뒤 편집을 이어가는 것은 드문 실수가 아니라 일상적 편집 흐름이다.
  //
  // 그래서 **게이트가 검사한 것과 커밋될 것이 같음**을 확인한 뒤에만 스탬프를 쓴다.
  // `git diff --quiet` 는 추적 파일의 unstaged 변경을 본다(untracked 는 커밋에 안
  // 들어가므로 대상이 아니다). 실측: 게이트 실행 자체는 워킹트리를 더럽히지 않는다
  // (exit 0) — 거짓 FAIL 위험이 낮다.
  const unstaged = spawnSync('git', ['diff', '--quiet'], { cwd: ROOT }).status;
  if (unstaged !== 0) {
    const names = spawnSync('git', ['diff', '--name-only'], { cwd: ROOT, encoding: 'utf8' });
    console.log('');
    console.log('게이트는 통과했지만 **스탬프를 쓰지 않는다.**');
    console.log('  워킹트리에 staged 되지 않은 변경이 있다 — 게이트가 검사한 내용과');
    console.log('  커밋될 내용이 다르다(게이트는 디스크를, 커밋은 index 를 쓴다).');
    console.log('');
    for (const f of (names.stdout ?? '').split('\n').filter(Boolean).slice(0, 20)) {
      console.log(`    ${f}`);
    }
    console.log('');
    console.log('  `git add` 로 맞춘 뒤 다시 돌려라.');
    clearStamp();
    printChangeSummary();
    return 1;
  }

  // 통과했으면 **그때의 index 트리 해시**를 남긴다. pre-commit 훅이 이것과 현재 해시를
  // 비교해 "게이트를 통과한 그 내용이 맞는지" 본다. 통과 후 파일을 더 고치면 해시가
  // 달라지므로 다시 돌려야 한다 — 그게 맞다.
  const tree = indexTreeHash();
  if (tree) writeFileSync(STAMP_PATH, `${tree}\n`, 'utf8');

  console.log('');
  console.log(`게이트 ${GATES.length}종 전부 exit 0.${tree ? ` 스탬프: ${tree.slice(0, 12)}` : ''}`);

  // 통과했어도 **변경 범위는 항상 본다.** 이것이 보고 문장의 근거다.
  printChangeSummary();
  return 0;
}

// **실행 가드.** 이것이 없으면 `import { GATES }` 만 해도 게이트가 통째로 돌아간다 —
// 실제로 그랬고, 그래서 게이트 목록을 검사하는 테스트를 쓸 수 없었다(테스트가 게이트를
// 부르고 그 게이트가 테스트를 부르는 재귀가 된다). 부작용을 실행 경로에 가둔다.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main());
}
