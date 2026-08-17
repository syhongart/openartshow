// tests/gate.test.ts — 게이트 자체를 게이트로 지킨다.
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────────────
// `npm run gate` 는 "게이트를 손으로 조립하다가 두 번 틀린 것" 을 구조로 없애기 위해
// 만들었다. 그런데 그 스크립트 자신이 조용히 낡으면 같은 문제가 돌아온다:
//
//   · `GATES` 목록의 script 이름을 package.json 에서 지우거나 이름을 바꾸면
//     → `npm run <없는 이름>` 이 에러를 내며 게이트가 **항상 FAIL** 하거나(눈에 띔),
//       npm 버전에 따라 다르게 굴 수 있다
//   · 새 검사(`check:*`)를 package.json 에 추가하고 `GATES` 에 안 넣으면
//     → 그 검사는 **아무도 안 돌린다.** 조용하고, 이게 진짜 위험이다
//
// 후자를 잡는 것이 이 파일의 목적이다. 검사를 만들어놓고 배선을 잊는 것은 이 저장소가
// 여러 번 겪은 형태다(검사2 가 장식이었던 일, 성능 게이트가 observe 로 남은 일).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATES, RISK_PATHS, changeSummary } from '../scripts/gate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

describe('gate.mjs — 게이트 목록', () => {
  it('import 만으로 게이트가 실행되지 않는다 (실행 가드)', () => {
    // 이 테스트가 **끝난다는 것 자체**가 증거다. 가드가 없으면 import 시점에 게이트가
    // 돌고, 그 게이트가 test 를 부르고, 그 test 가 이 파일을 다시 import 한다.
    expect(Array.isArray(GATES)).toBe(true);
    expect(GATES.length).toBeGreaterThan(0);
  });

  it('모든 게이트가 package.json 의 실제 script 를 가리킨다', () => {
    const missing = GATES.filter((g) => !(g.cmd in (pkg.scripts ?? {})));
    expect(
      missing.map((g) => g.cmd),
      `package.json 에 없는 script 를 가리킨다 — 이름이 바뀌었거나 지워졌다`,
    ).toEqual([]);
  });

  it('package.json 의 check:* 검사가 전부 게이트에 배선돼 있다', () => {
    // **이것이 이 파일의 핵심 단언이다.** 검사를 만들고 배선을 잊으면 그 검사는
    // 장식이 되고, 아무 신호도 나지 않는다.
    const checks = Object.keys(pkg.scripts ?? {}).filter((k) => k.startsWith('check:'));
    const wired = new Set(GATES.map((g) => g.cmd));
    const unwired = checks.filter((c) => !wired.has(c));
    expect(
      unwired,
      `package.json 에 있으나 npm run gate 가 안 돌리는 검사:\n  ${unwired.join('\n  ')}\n`
      + `  scripts/gate.mjs 의 GATES 에 추가하거나, 게이트가 아닌 이유를 여기 적어라.`,
    ).toEqual([]);
  });

  it('lint·typecheck·test 가 포함돼 있다', () => {
    const wired = new Set(GATES.map((g) => g.cmd));
    for (const must of ['lint', 'typecheck', 'test']) {
      expect(wired.has(must), `${must} 가 게이트에 없다`).toBe(true);
    }
  });

  it('스모크는 포함하지 않는다 — CI 의 smoke job 이 판정 주체다', () => {
    // ⚠ 이 단언의 제목은 오래 *"§10-3 독립 executor 소관"* 이었고 **2026-08-10 팀장 판정으로
    // 폐기된 절차**다(검수관 권고 P3). 단언 자체는 그대로 유효하다 — 이유가 바뀌었을 뿐이다:
    // `smoke:vite` 는 10분 이상 걸려 로컬 게이트에 넣으면 매 커밋이 그만큼 느려지고,
    // **배포 판정은 어차피 CI 의 `smoke` job 이 한다**(§10-3 (a) — 로컬 PASS 는 판정
    // 근거로 기재 금지). 로컬에서 돌리는 것 자체는 조기 스크리닝으로 허용된다.
    const wired = GATES.map((g) => g.cmd);
    expect(wired.filter((c) => c.startsWith('smoke'))).toEqual([]);
  });

  it('싼 것이 먼저 온다 — test 가 마지막', () => {
    // lint 로 걸릴 것을 test 16초 뒤에 알 이유가 없다.
    expect(GATES[GATES.length - 1].cmd).toBe('test');
  });

  it('gate script 가 package.json 에 등록돼 있다', () => {
    expect(pkg.scripts?.gate).toBe('node scripts/gate.mjs');
  });
});

// ── GS-A · `GATES` ↔ `ci.yml` 정합 ─────────────────────────────────────────
//
// **왜 이 describe 가 생겼나 (검수관 블로커 B2, 2026-08-17).**
// `check:cycles`·`check:filesize` 를 신설하면서 `GATES` 에만 넣고 `ci.yml` 에 안 넣었다.
// 위의 「package.json 의 check:* 가 전부 게이트에 배선돼 있다」는 초록이었지만, 그것은
// **로컬 게이트까지만** 보는 축이다. 필수 상태검사는 `verify`·`smoke` 둘이므로 두 게이트는
// **PR·병합·배포 어느 단계도 막지 못했다** — 유일한 집행이 pre-commit 훅이었고 그것은
// `--no-verify`·훅 미설치 세션·GitHub 웹 편집을 전부 통과한다.
//
// 즉 게이트 목록이 **두 곳에 따로 적힌 값 미러링**이었고, 한쪽만 고쳐도 아무도 몰랐다.
//
// ⚠ **이 검사가 못 잡는 것**(정직하게 적는다):
//   · `smoke` job 쪽 검사 — 여기서는 `verify` job 만 본다
//   · GitHub 의 required status check **목록 자체** — 저장소 파일이 아니라 설정이라 못 읽는다
//   · 훅이 설치 안 된 세션 — 그건 `gate.mjs` 의 `ensureHooksWired` 소관
//   · `ciExempt` 사유의 **타당성** — 문자열이 있는지만 본다
describe('GS-A — GATES ↔ ci.yml verify job 정합', () => {
  const ciPath = join(ROOT, '.github', 'workflows', 'ci.yml');
  const ci = readFileSync(ciPath, 'utf8');

  /** `verify` job 본문만 잘라낸다 — `smoke` job 의 스텝을 커버로 세면 안 된다 */
  function verifyJobBody(text: string): string {
    const start = text.indexOf('\n  verify:');
    expect(start, 'ci.yml 에 verify job 이 없다').toBeGreaterThan(-1);
    // 다음 최상위 job(들여쓰기 2칸 + 이름 + `:`)까지
    const rest = text.slice(start + 1);
    const m = rest.slice(1).match(/\n {2}[a-z][\w-]*:\n/);
    return m ? rest.slice(0, (m.index ?? 0) + 1) : rest;
  }

  /**
   * YAML 주석을 걷어낸다. **이것이 없으면 검사가 통째로 죽는다.**
   *
   * ⚠ 첫 판본은 주석을 안 걷었고, 그 결과 `ci.yml` 의 설명 주석에 있던
   * *"로컬 `npm run gate` 와 …"* 라는 **산문 한 줄**이 실행 스텝으로 세어져
   * `inCi.has('gate')` 가 참이 됐다 → 아래 「모든 게이트가 CI 에서도 돈다」가
   * **항상 조기 return** 했다. 뮤테이션 M6(`Import cycles` 스텝 제거)에서 **0 failed**
   * 로 드러났다 — 거짓 FAIL 을 막으려고 넣은 우회로가 **거짓 PASS** 를 만든 것이다.
   *
   * 검출력이 «구조적으로 0» 인 이 형태는 hookify 첫 판본(`action: warn` 이라 종료코드를
   * 안 바꿈)과 같고, 이 저장소가 검수관 반려로 이미 한 번 겪었다.
   */
  function stripYamlComments(text: string): string {
    return text.split('\n').map((line) => {
      const i = line.indexOf('#');
      if (i < 0) return line;
      // 줄 시작이거나 앞이 공백일 때만 주석이다(값 안의 `#` 은 건드리지 않는다).
      if (i === 0 || /\s/.test(line[i - 1])) return line.slice(0, i);
      return line;
    }).join('\n');
  }

  /** 그 job 이 **실제로 돌리는** npm script 이름들 — 주석의 산문은 세지 않는다 */
  function npmScriptsIn(body: string): Set<string> {
    const out = new Set<string>();
    const code = stripYamlComments(body);
    // `npm run <x>` 와 `npm test`(= run test 의 별칭) 둘 다 본다.
    for (const m of code.matchAll(/\bnpm\s+run\s+([A-Za-z][\w:.-]*)/g)) out.add(m[1]);
    if (/\bnpm\s+test\b/.test(code)) out.add('test');
    return out;
  }

  const body = verifyJobBody(ci);
  const inCi = npmScriptsIn(body);

  it('★ 파서가 **주석의 산문**을 실행 스텝으로 세지 않는다', () => {
    // 이 단언이 뮤테이션 M6 의 산물이다. 주석을 안 걷으면 `npm run gate` 라는 **설명 문장**
    // 하나가 아래 「모든 게이트가 CI 에서도 돈다」를 통째로 무력화한다(조기 return).
    const fake = 'jobs:\n  verify:\n    steps:\n      # 로컬 `npm run gate` 로 돌린다\n      - run: npm run lint\n';
    const got = npmScriptsIn(fake);
    expect([...got], '★ 주석 안의 npm run 을 실행 스텝으로 셌다').toEqual(['lint']);
  });

  it('★ 지금 ci.yml 에서도 `gate` 우회가 발동하지 않는다 — 발동하면 아래가 전부 공허하다', () => {
    // 우회 자체는 정당하다(ci.yml 을 `npm run gate` 한 줄로 바꾸면 전부 커버된다).
    // 위험한 것은 **그것이 의도치 않게 켜지는 것**이라 지금 상태를 못 박아 둔다.
    expect(inCi.has('gate'), '★ gate 우회가 켜져 GS-A 가 스킵되고 있다').toBe(false);
  });

  it('파서가 실제로 무언가를 찾았다 — 0건이면 아래 단언들이 전부 공허하다', () => {
    // ⚠ 이것이 없으면 파서가 깨져 빈 집합을 내도 **차집합이 전체가 되어** FAIL 하거나,
    // 반대로 정규식이 모든 것을 매치해 **전부 통과**한다. 어느 쪽이든 축이 죽는다.
    expect(inCi.size, 'ci.yml verify job 파싱이 0건이다 — 정규식이나 job 경계가 깨졌다')
      .toBeGreaterThan(3);
    expect(inCi.has('lint'), '파서가 lint 를 못 찾았다').toBe(true);
    expect(inCi.has('typecheck'), '파서가 typecheck 를 못 찾았다').toBe(true);
  });

  it('verify job 이 smoke job 을 침범하지 않는다 — job 경계가 맞다', () => {
    expect(body.includes('smoke:vite'), 'verify 본문에 smoke job 스텝이 섞였다').toBe(false);
  });

  it('★ 모든 게이트가 CI 에서도 돈다 — 안 도는 것은 `ciExempt` 로 사유를 적는다', () => {
    // ci.yml 이 `npm run gate` 한 줄로 바뀌면 그것이 전부를 커버한다(거짓 FAIL 방지).
    if (inCi.has('gate')) return;
    const missing = GATES
      .filter((g) => !inCi.has(g.cmd))
      .filter((g) => !g.ciExempt);
    expect(
      missing.map((g) => g.cmd),
      `GATES 에 있는데 ci.yml 의 verify job 에 없다 — **배포를 못 막는다**:\n`
      + `  ${missing.map((g) => g.cmd).join('\n  ')}\n`
      + `  ci.yml 에 스텝을 넣거나, gate.mjs 의 그 항목에 ciExempt: '<사유>' 를 적어라.`,
    ).toEqual([]);
  });

  it('★ `ciExempt` 는 사유가 있어야 한다 — 빈 문자열은 면제가 아니라 누락이다', () => {
    const empty = GATES.filter((g) => 'ciExempt' in g && !String(g.ciExempt ?? '').trim());
    expect(
      empty.map((g) => g.cmd),
      'ciExempt 가 비어 있다 — 왜 CI 에서 안 도는지 적지 않으면 다음 사람이 판단할 수 없다',
    ).toEqual([]);
  });

  it('★ 면제는 **정말 못 도는 것**만이다 — 지금 면제는 하나뿐이고 근거가 실측이다', () => {
    // 면제가 늘어나면 이 검사가 통과하면서 CI 커버리지는 줄어든다. 개수를 못 박아
    // **늘리려면 이 줄을 고치게** 만든다(그때 근거를 쓰게 된다).
    const exempt = GATES.filter((g) => g.ciExempt);
    expect(exempt.map((g) => g.cmd), '면제 목록이 바뀌었다 — 근거를 확인하고 이 단언을 갱신하라')
      .toEqual(['check:devlog-times']);
  });
});

describe('pre-commit 훅', () => {
  const hook = join(ROOT, 'scripts', 'githooks', 'pre-commit');

  it('파일이 존재한다', () => {
    expect(existsSync(hook)).toBe(true);
  });

  it('실행 권한이 있다', () => {
    // 권한이 없으면 git 이 조용히 무시한다 — 훅이 있는데 안 도는 최악의 상태다.
    // eslint-disable-next-line no-bitwise
    expect((statSync(hook).mode & 0o111) !== 0, 'chmod +x 가 안 돼 있다').toBe(true);
  });

  it('스탬프 경로가 gate.mjs 와 같은 이름을 쓴다', () => {
    // 값 미러링 지점이다. 셸 스크립트라 import 로 없앨 수 없으니 정합을 검사한다.
    const src = readFileSync(hook, 'utf8');
    expect(src).toContain('.gate-stamp');
    expect(readFileSync(join(ROOT, 'scripts', 'gate.mjs'), 'utf8')).toContain('.gate-stamp');
  });

  it('.gate-stamp 가 실제로 추적되지 않는다', () => {
    // ── 첫 판본은 `.gitignore` **파일 내용**만 봤다 ────────────────────────
    // 그래서 `.gate-stamp` 가 이미 추적 중인 상태를 통과시켰다. 실제로 그 상태로
    // 커밋됐고(`b1e9421`), git 규칙상 **이미 추적된 파일은 .gitignore 가 무시하지
    // 않는다** — 패턴을 적어둔 것만으로는 아무것도 보장되지 않는다.
    //
    // 또 하나의 "없는 보증" 이었다. 지금은 `git ls-files` 로 **결과**를 본다.
    const r = spawnSync('git', ['ls-files', '.gate-stamp'], { cwd: ROOT, encoding: 'utf8' });
    expect(
      (r.stdout ?? '').trim(),
      '.gate-stamp 가 추적되고 있다 — `git rm --cached .gate-stamp` 로 빼라.\n'
      + '  커밋되면 다른 세션의 스탬프가 섞여 pre-commit 검사가 무의미해진다.',
    ).toBe('');

    // 패턴도 함께 확인한다(둘 다 필요하다 — 패턴이 없으면 다음에 또 추가된다).
    expect(readFileSync(join(ROOT, '.gitignore'), 'utf8')).toMatch(/^\/?\.gate-stamp$/m);
  });

  it('SessionStart 훅이 hooksPath 를 설정한다', () => {
    // 세션마다 새 컨테이너다. 수동 설치를 기대하면 훅은 영원히 안 돈다.
    const settings = JSON.parse(readFileSync(join(ROOT, '.claude', 'settings.json'), 'utf8'));
    type HookEntry = { command?: string };
    const cmds: string[] = (settings.hooks?.SessionStart ?? [])
      .flatMap((g: { hooks?: HookEntry[] }) => g.hooks ?? [])
      .map((h: HookEntry) => h.command ?? '');
    expect(cmds.some((c: string) => c.includes('core.hooksPath')), 'SessionStart 에 hooksPath 설정이 없다').toBe(true);
    expect(cmds.some((c: string) => c.includes('scripts/githooks')), 'hooksPath 가 scripts/githooks 를 가리키지 않는다').toBe(true);
  });
});

describe('변경 범위 요약 — 패턴 A(확인 없이 단정) 방지 축', () => {
  it('위험 경로 목록이 CLAUDE.md 의 규율과 정합한다', () => {
    // 값 미러링 지점이다. CLAUDE.md 는 산문이라 import 로 없앨 수 없으니 정합을 검사한다.
    const claude = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
    expect(claude).toContain('.github/workflows/**');
    expect(claude).toContain('scripts/smoke/**');
    // 보호파일 이름이 CLAUDE.md 에 실제로 적혀 있는가
    for (const name of ['main.js', 'player.js', 'artworks.js']) {
      expect(claude, `CLAUDE.md 에 보호파일 ${name} 언급이 없다`).toContain(name);
    }
  });

  it('보호파일 정규식이 실재 파일을 잡는다 (존재하지 않는 config.js 를 기준으로 삼지 않는다)', () => {
    const guard = RISK_PATHS.find((p) => p.label.includes('보호파일'))!;
    // config.ts 가 실재이고 config.js 는 없다(태스크 #138). 둘 다 잡히게 두되,
    // **실재하는 쪽이 반드시 잡혀야 한다**.
    expect(guard.re.test('frontend/js/config.ts')).toBe(true);
    expect(guard.re.test('frontend/js/main.js')).toBe(true);
    expect(existsSync(join(ROOT, 'frontend/js/config.ts'))).toBe(true);
    // 무관한 파일은 안 잡는다
    expect(guard.re.test('frontend/js/ui-dom.ts')).toBe(false);
  });

  it('워크플로·스모크 경로를 정확히 분류한다', () => {
    const wf = RISK_PATHS.find((p) => p.label.includes('workflows'))!;
    expect(wf.re.test('.github/workflows/deploy.yml')).toBe(true);
    expect(wf.re.test('.github/workflows/ci.yml')).toBe(true);
    expect(wf.re.test('scripts/gate.mjs')).toBe(false);

    const sm = RISK_PATHS.find((p) => p.label.includes('smoke'))!;
    expect(sm.re.test('scripts/smoke/run.mjs')).toBe(true);
    expect(sm.re.test('scripts/gate.mjs')).toBe(false);
  });

  it('changeSummary 가 0 건인 버킷도 보고한다 — "만지지 않았다" 를 화면에서 확인할 수 있어야 한다', () => {
    // 위험 경로를 하나도 안 만졌을 때 그 줄이 **사라지면** 안 된다. 사라지면 "안 만졌다"
    // 와 "요약이 그 축을 잊었다" 가 화면에서 구별되지 않는다.
    const s = changeSummary('HEAD');
    expect(s).not.toBeNull();
    expect(s!.buckets.length).toBe(RISK_PATHS.length);
    for (const b of s!.buckets) expect(Array.isArray(b.hits)).toBe(true);
  });

  it('index 를 본다 — 아직 커밋되지 않은 staged 신규 파일이 요약에 나온다', () => {
    // ── 이 테스트는 실제 사고를 재현한다 ──────────────────────────────────
    // 첫 판본은 `${base}...HEAD` 였다. 게이트는 **항상 커밋 전에** 도는데 그 범위는
    // 커밋된 것만 보므로, 이 세션에서 `.github/workflows/review-record.yml` 을 신설한
    // 직후 게이트가 "workflows 0 파일" 로 보고했다 — 검수관 무조건 트리거인 파일을
    // 추가하면서 그 신호를 놓쳤다. 요약이 막으려던 실패를 요약 자신이 저지른 것이다.
    //
    // **저장소 워킹트리를 건드리지 않는다**(규율). `changeSummary` 의 `cwd` 파라미터로
    // 임시 저장소를 대신 넘긴다 — 그래서 이 검출력은 현재 워킹트리 상태와 무관하게
    // 항상 성립한다. `changeSummary('HEAD')` 의 결과로 검사하면 staged 가 0 인 순간
    // (커밋 직후)에는 아무것도 못 잡는 테스트가 된다.
    const tmp = mkdtempSync(join(tmpdir(), 'gate-index-'));
    const g = (...args: string[]) =>
      // `commit.gpgsign=false` 를 함께 끊는다 — 이 임시 저장소는 **개발자의 전역 git
      // 설정을 상속하면 안 된다.** user.email·user.name 을 -c 로 준 것과 같은 이유이고,
      // 서명만 빠져 있었다. 이 세션 환경은 `commit.gpgsign=true` +
      // `gpg.ssh.program=/tmp/code-sign` 이 전역으로 걸려 있는데, 그 서명 프로그램이
      // 저장소 밖의 임시 repo 를 거부해 `fatal: failed to write commit object` 로 죽는다.
      // 그러면 `changeSummary` 가 null 을 받아 이 테스트가 실패하는데, **실패 사유가
      // 검사 대상(index 를 보는가)과 아무 상관이 없다.** CI 에는 서명 설정이 없어
      // 통과하므로 로컬에서만 깨졌고, 그 형태는 "환경 때문에 게이트를 못 도는" 것이라
      // pre-commit 훅이 커밋을 막는다. 검출력은 그대로다 — 서명은 이 테스트의 축이 아니다.
      spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd: tmp, encoding: 'utf8' });
    try {
      g('init', '-q');
      writeFileSync(join(tmp, 'seed.txt'), 'seed\n');
      g('add', 'seed.txt');
      g('commit', '-qm', 'seed');

      // 검수관 무조건 트리거 경로를 신설하고 add 만 한다(= 사고 당시의 상태).
      mkdirSync(join(tmp, '.github', 'workflows'), { recursive: true });
      writeFileSync(join(tmp, '.github', 'workflows', 'x.yml'), 'name: x\n');
      g('add', '.github/workflows/x.yml');

      const s = changeSummary('HEAD', tmp);
      expect(s).not.toBeNull();
      expect(s!.files, 'staged 신규 파일이 요약에 없다 — index 가 아니라 HEAD 를 보고 있다')
        .toContain('.github/workflows/x.yml');
      const wf = s!.buckets.find((b) => b.label.includes('workflows'))!;
      expect(wf.hits, '워크플로 신설이 위험 버킷으로 분류되지 않았다').toEqual(['.github/workflows/x.yml']);

      // ── unstaged 는 요약에 **나오지 않는다** ────────────────────────────
      // 이 단언이 없으면 위 케이스만으로는 `--cached` 를 지워도 테스트가 통과한다.
      // 실측(뮤테이션 M1): staged 변경만 있을 때 `git diff HEAD` 와
      // `git diff --cached HEAD` 는 **같은 답을 낸다** — 두 범위가 갈리는 것은
      // unstaged 변경이 있을 때뿐이다. 그래서 그 상태를 만들어 재야 한다.
      //
      // 요약이 unstaged 를 포함하면 "이 브랜치가 만진 것" 이 **커밋될 내용과 달라진다.**
      // 스탬프 거부가 같은 상태를 따로 막지만, 요약은 그보다 먼저 화면에 찍히므로
      // 그 사이에 틀린 근거를 보여줄 수 있다. 요약의 기준은 index 하나여야 한다.
      writeFileSync(join(tmp, 'seed.txt'), 'seed\ndirty\n'); // add 하지 않는다
      const s2 = changeSummary('HEAD', tmp);
      expect(s2!.files, 'unstaged 변경이 요약에 섞였다 — index 가 아니라 워킹트리를 보고 있다')
        .toEqual(['.github/workflows/x.yml']);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('존재하지 않는 base 면 null (게이트를 깨뜨리지 않는다)', () => {
    expect(changeSummary('존재하지-않는-ref-xyz')).toBeNull();
  });
});

describe('훅 배선 — 설정은 추적되지 않는다', () => {
  it('gate.mjs 가 core.hooksPath 를 확인·복구한다', () => {
    // executor 재현이 드러낸 사각: `core.hooksPath` 는 `.git/config` 에만 있어
    // **클론에 따라가지 않는다.** 훅 파일은 추적돼 따라오지만 git 이 안 본다.
    // SessionStart 만으로는 새 클론·별도 worktree 를 못 덮는다.
    const src = readFileSync(join(ROOT, 'scripts', 'gate.mjs'), 'utf8');
    expect(src).toContain('core.hooksPath');
    expect(src, 'ensureHooksWired() 가 없다 — 배선 복구 경로가 사라졌다').toContain('ensureHooksWired');
  });

  // ── CI 에서는 건너뛴다 — 그리고 그것이 이 테스트의 교훈이다 ────────────────
  // 첫 판본은 무조건 단언했고 주석에 이렇게 적었다: *"`npm run gate` 가 이 테스트를
  // 돌리므로, 게이트를 한 번이라도 돌렸으면 배선돼 있다."* **로컬에서만 참이었다.**
  // CI 는 `npm test` 를 직접 돌려 `ensureHooksWired()` 를 거치지 않으므로 갓 checkout
  // 한 저장소에는 `core.hooksPath` 가 없다. 실측: run 30512622471 의 `verify` FAIL
  // (`expected '' to be 'scripts/githooks'`, 1 failed | 1116 passed).
  //
  // **로컬 게이트 PASS 가 CI PASS 를 보증하지 않는 지점을 내가 스스로 만든 것이다** —
  // 게이트가 테스트보다 먼저 환경을 바꾸고, 그 테스트가 바뀐 환경을 단언했다. 앞서
  // executor 가 "훅이 클론에 안 따라간다" 를 드러냈을 때 `gate.mjs` 만 고치고 이 테스트가
  // 같은 전제를 박아둔 것은 안 봤다.
  //
  // **단언을 약화시키는 것이 아니다.** CI 는 커밋하지 않으므로 pre-commit 훅 배선은 CI 의
  // 검증 대상이 아니다(있어야 할 이유가 없다). 로컬에서는 단언이 그대로 남아 M7 뮤테이션
  // (`ensureHooksWired()` 호출 제거)의 검출력이 유지된다 — 거기가 이 축이 의미를 갖는
  // 유일한 환경이다.
  it.skipIf(process.env.CI)('현재 저장소에 훅이 실제로 배선돼 있다 (로컬 전용)', () => {
    const r = spawnSync('git', ['config', '--get', 'core.hooksPath'], { cwd: ROOT, encoding: 'utf8' });
    expect(
      (r.stdout ?? '').trim(),
      'core.hooksPath 가 scripts/githooks 가 아니다 — pre-commit 이 돌지 않는다.\n'
      + '  `npm run gate` 를 한 번 돌리면 ensureHooksWired() 가 복구한다.',
    ).toBe('scripts/githooks');
  });
});
