// G-NODE1 — Node 버전이 적힌 **세 축이 서로 다른 것을 말하지 않는가.**
//
// ── 왜 이 파일이 생겼나 (검수관 실측 2026-08-08) ────────────────────────────
// Node 20 → 24 전환은 값을 **세 곳**에 적는다: `.nvmrc`(로컬 개발) ·
// `package.json` 의 `engines.node`(npm) · `.github/workflows/**` 의 `node-version`(CI).
// 부팀장은 이것을 *"각 층이 자기 도구에 필요한 정당한 중복"* 이라고 판단했다.
// **절반만 맞다** — 정당한 중복이려면 어긋남을 잡는 축이 있어야 하는데, 없었다.
//
//   검수관 뮤테이션 M-A: `ci.yml` 의 `node-version: '24'` → `'25'` (2곳).
//   `.nvmrc`·`engines` 는 24 그대로 = 명백한 드리프트.
//   → **게이트 6종 전부 PASS. exit 0.**
//
// 부팀장이 스스로 의심한 문장 — *"워크플로만 25 로 바꿔도 아무도 모른다"* — 이 참이었다.
// 이 저장소의 규율은 *"같은 값을 두 곳에 적으면 한쪽만 고쳐도 아무도 모른다"* 이고,
// 그 처방은 문서가 아니라 검사다. 그래서 검사로 만든다.
//
// ── 검출력 실측 (2026-08-08, 별도 클론) ────────────────────────────────────
// **통과는 검출력의 증거가 아니다.** 결함을 일부러 만들어 실제로 깨지는지 봤다.
//
//   대조군(무수정)                                     5 passed / 0 failed
//   M-A  ci.yml 의 node-version 2곳 → '25'             → 규칙1 FAIL ✓
//   M-B  engines "^24" → ">=24"                        → 규칙2 FAIL ✓
//   M-C  review-record.yml 의 node-version 줄 삭제      → 규칙3 FAIL ✓
//   M-D  ci.yml verify job 의 setup-node 를 npm ci 뒤로 → 규칙4 FAIL ✓
//   M-E  .nvmrc 24 → 22 (다른 축 그대로)               → 규칙1·2 FAIL ✓
//
// 5케이스 전부 **기대한 규칙이** 깨졌다(엉뚱한 규칙이 대신 깨진 것이 아니다 — 그러면
// 규칙이 서로를 가리고 있다는 뜻이라 축이 하나로 뭉개진 것이다). 규칙을 고칠 때는
// 이 표를 다시 뜬다. 안 깨지는 케이스가 생기면 그 규칙은 그때부터 장식이다.
//
// ── 이 게이트가 **못 잡는 것** (적지 않으면 통과를 과신한다) ─────────────────
// · **`.nvmrc` 의 값이 옳은지는 안 본다.** 세 축이 나란히 EOL 버전을 가리켜도
//   **정합이므로 통과한다** — 즉 **이번 사고(20 이 EOL 3개월)를 이 게이트는 못 막았을
//   것이다.** EOL 감시는 별건이다(G-NODE2, 태스크 #220).
// · 러너가 실제로 그 버전을 설치했는지는 안 본다 — **선언만** 본다.
// · `@types/node` 와 런타임의 갭은 안 본다(현재 types 26 vs 런타임 24).
// · Node 메이저에 딸려 오는 **npm 메이저 변경**은 안 본다(24 는 npm 11 을 데려온다).
// · 외부 액션(`uses:`) 자신의 내부 런타임은 안 본다.
//
// ── 거짓 FAIL 위험 ─────────────────────────────────────────────────────────
// 장차 `strategy.matrix` 로 **복수 Node 를 의도적으로** 테스트하게 되면 규칙 1이
// 오탐한다(현재 매트릭스 0건 — 실측). 매트릭스를 도입하는 커밋은 이 게이트를 **먼저**
// 고쳐야 한다. 안 고치면 늑대소년이 되고, 항상 우는 경보는 곧 무시된다.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const WF_DIR = '.github/workflows';

/** `.nvmrc` 의 메이저 = 이 저장소가 쓰기로 한 Node 라인. 나머지 축은 전부 이것을 따른다. */
function nvmrcMajor(): number {
  const raw = readFileSync('.nvmrc', 'utf8').trim();
  const m = /^v?(\d+)/.exec(raw);
  if (!m) throw new Error(`.nvmrc 를 메이저 버전으로 읽을 수 없다: ${JSON.stringify(raw)}`);
  return Number(m[1]);
}

interface Step { text: string; line: number }
interface Job { name: string; file: string; steps: Step[] }

/**
 * 워크플로 YAML 을 job → step 으로 쪼갠다. **정규식 파싱이라 근사값이다** —
 * js-yaml 은 이 저장소의 직접 의존이 아니라(transitive) 쓰지 않는다. 지금 4파일은
 * 전부 `jobs:` → 2칸 job → 6칸 `- ` step 의 평범한 형태이고, 형태가 달라지면
 * 아래 「측정기 생존」 검사가 job 0건으로 떨어져 **조용히 통과하지 않는다.**
 */
function parseJobs(file: string, src: string): Job[] {
  const lines = src.split('\n');
  const jobs: Job[] = [];
  let inJobs = false;
  let cur: Job | null = null;
  let curStep: Step | null = null;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^jobs:\s*$/.test(ln)) { inJobs = true; continue; }
    if (!inJobs) continue;
    if (/^\S/.test(ln) && ln.trim() !== '') { inJobs = false; cur = null; curStep = null; continue; }

    const jobHead = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(ln);
    if (jobHead) {
      cur = { name: jobHead[1], file, steps: [] };
      jobs.push(cur);
      curStep = null;
      continue;
    }
    if (!cur) continue;

    const stepHead = /^ {6}- /.exec(ln);
    if (stepHead) {
      curStep = { text: ln, line: i + 1 };
      cur.steps.push(curStep);
      continue;
    }
    // 스텝 본문(더 깊은 들여쓰기)은 그 스텝에 붙인다.
    if (curStep && /^ {8}/.test(ln)) curStep.text += '\n' + ln;
  }
  return jobs;
}

function workflowFiles(): string[] {
  return readdirSync(WF_DIR).filter((f) => /\.ya?ml$/.test(f)).map((f) => join(WF_DIR, f));
}

const isSetupNode = (s: Step) => /uses:\s*actions\/setup-node[@\s]/.test(s.text);
const hasNodeVersion = (s: Step) => /\bnode-version:\s*['"]?[\w.*-]+/.test(s.text);
const hasNodeVersionFile = (s: Step) => /\bnode-version-file:\s*\S/.test(s.text);

/** 이 스텝이 `run:` 으로 node·npm·npx 를 부르는가. `cache: 'npm'` 같은 값은 제외된다. */
function runsNode(s: Step): boolean {
  const runs = [...s.text.matchAll(/\brun:\s*([\s\S]*?)(?=\n\s*[a-z-]+:|$)/g)].map((m) => m[1]);
  return runs.some((r) => /(?:^|[\s;&|(])(?:node|npm|npx)(?:\s|$)/m.test(r));
}

describe('G-NODE1 — Node 버전 축 정합 (.nvmrc / engines / workflows)', () => {
  const M = nvmrcMajor();
  const files = workflowFiles();
  const jobs = files.flatMap((f) => parseJobs(f, readFileSync(f, 'utf8')));

  it('측정기 생존 — 워크플로와 job 을 실제로 읽었는가', () => {
    // 이것이 없으면 아래 통과가 "정합이다" 인지 "아무것도 안 봤다" 인지 구별되지 않는다.
    // 파싱이 깨지면 여기서 먼저 빨간불이 난다.
    expect(files.length, '워크플로 파일 0건').toBeGreaterThan(0);
    expect(jobs.length, 'job 0건 — 파서가 YAML 형태 변화를 못 따라간 것이다').toBeGreaterThan(0);
    expect(
      jobs.filter((j) => j.steps.some(isSetupNode)).length,
      'setup-node 를 쓰는 job 0건',
    ).toBeGreaterThan(0);
  });

  // ── 규칙 1: 워크플로의 모든 node-version == .nvmrc 메이저 ──────────────────
  // M-A 가 통과하던 자리가 여기다.
  it(`규칙1 — 모든 node-version 이 .nvmrc(${M}) 와 같은 메이저다`, () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      src.split('\n').forEach((ln, i) => {
        const m = /\bnode-version:\s*['"]?([\w.*-]+)/.exec(ln);
        if (!m) return;
        const major = /^v?(\d+)/.exec(m[1]);
        if (!major || Number(major[1]) !== M) bad.push(`${f}:${i + 1} → ${m[1]} (기대 ${M})`);
      });
    }
    expect(bad, `.nvmrc(${M}) 와 어긋난 node-version:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  // ── 규칙 2: engines.node 가 그 라인에 고정돼 있다 ─────────────────────────
  // `>=24` 는 26·27 을 전부 허용한다. `ARCHITECTURE.md §7-0` 은 *"24 **하나로** 맞춘다"*
  // 고 선언하므로, 하한만 두면 문서와 값이 다른 것을 말하게 된다 —
  // **2026-10-28 에 v26 이 LTS 가 되면 갈라진다**(검수관 C1).
  it(`규칙2 — engines.node 가 ${M} 라인에 고정돼 있다 (하한만 두지 않는다)`, () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const range = String(pkg?.engines?.node ?? '');
    // 허용 형태를 열거한다. 새 형태를 쓰려면 이 게이트를 **먼저** 고쳐야 한다(의도적).
    const ok =
      new RegExp(`^\\^${M}(\\.\\d+){0,2}$`).test(range) ||     // ^24 · ^24.0.0
      new RegExp(`^${M}\\.x$`).test(range) ||                  // 24.x
      new RegExp(`^>=\\s*${M}(\\.\\d+){0,2}\\s+<\\s*${M + 1}(\\.\\d+){0,2}$`).test(range); // >=24 <25
    expect(
      ok,
      `engines.node = ${JSON.stringify(range)} 가 ${M} 라인 고정이 아니다. ` +
        `허용: "^${M}" · "${M}.x" · ">=${M} <${M + 1}"`,
    ).toBe(true);
  });

  // ── 규칙 3: 버전을 안 정하는 setup-node 가 없다 ───────────────────────────
  // `node-version` 도 `node-version-file` 도 없으면 러너 기본값이 쓰인다 —
  // 그 기본값은 우리가 정한 것이 아니고, 조용히 바뀐다.
  it('규칙3 — 버전을 지정하지 않는 setup-node 스텝이 0건이다', () => {
    const bad = jobs.flatMap((j) =>
      j.steps
        .filter((s) => isSetupNode(s) && !hasNodeVersion(s) && !hasNodeVersionFile(s))
        .map((s) => `${j.file}:${s.line} (job ${j.name})`),
    );
    expect(bad, `버전 미지정 setup-node:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  // ── 규칙 4: setup-node 보다 앞서 node 를 부르는 스텝이 없다 ────────────────
  // 앞서 부르면 **러너 기본 Node** 로 도는데, 로그만 보면 우리가 정한 버전으로 돈 것처럼
  // 읽힌다. 실제 실행 버전과 선언 버전이 갈리는 형태 — 이 저장소가 가장 비싸게 배운 축이다.
  it('규칙4 — 같은 job 에서 setup-node 앞에 node/npm/npx 실행이 0건이다', () => {
    const bad: string[] = [];
    for (const j of jobs) {
      const setupAt = j.steps.findIndex(isSetupNode);
      const runAt = j.steps.findIndex(runsNode);
      if (runAt === -1) continue;
      if (setupAt === -1 || runAt < setupAt) {
        bad.push(`${j.file} (job ${j.name}): ${j.steps[runAt].line} 줄이 setup-node 보다 앞선다`);
      }
    }
    expect(bad, `setup-node 이전 node 실행:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});
