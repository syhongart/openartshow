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
//   M-F  ci.yml step 들여쓰기 6칸 → 4칸 (YAML 유효)     → 「측정기 생존」FAIL ✓
//   M-F + M-D                                          → 「측정기 생존」FAIL ✓
//   M-F + M-C′                                         → 「측정기 생존」FAIL ✓
//   M-G  ci.yml 의 **smoke job 만** 4칸 + setup-node 를 뒤로 → 「측정기 생존」FAIL ✓
//   M-G′ M-G 의 들여쓰기 변경만                          → 「측정기 생존」FAIL ✓
//   REUSE-1  재사용 워크플로 전용 파일 추가              → **PASS**(면제가 작동한다) ✓
//
// **M-F 3케이스는 강화 전에 전부 5 passed 였다**(= 검출력 0). 아래 parseJobs 주석의 B-A 가
// 그것이고, 생존 검사를 파일 단위로 바꾼 뒤 셋 다 단독으로 FAIL 한다.
// **M-G 2케이스는 파일 단위 강화 후에도 5 passed 였다**(= C1). job 단위로 내린 뒤 FAIL 한다.
//
// ⚠ **위임 실측 보고 2건이 틀렸다**(2026-08-08). executor 가 `M-C → PASS`(기대는 규칙3 FAIL)
// 와 `REUSE-1 → FAIL`(기대는 PASS)을 보고했는데, **부팀장이 직접 재현하니 둘 다 기대대로**
// 였다 — 뮤테이션 **적용 자체를 실패**한 것이지 게이트 결함이 아니었다(M-C 는 치환 대상을
// 못 찾았고, REUSE-1 은 파일 형식이 달랐다). 태스크 #192 와 같은 형태다.
// **받은 뮤테이션 보고의 "안 깨졌다" 는 게이트 결함과 뮤테이션 미적용을 구별하지 못한다** —
// 기대와 어긋난 케이스는 위임자가 직접 재현한다.
//
// 규칙2 허용 범위도 9케이스로 실측했다 —
//   PASS: "24" · "^24" · "~24" · "24.x" · "24.19.0" · ">=24 <25"
//   FAIL: ">=24"(상한 없음) · "^24 || ^26" · "*"
//
// 전부 **기대한 규칙이** 깨졌다(엉뚱한 규칙이 대신 깨진 것이 아니다 — 그러면 규칙이 서로를
// 가리고 있다는 뜻이라 축이 하나로 뭉개진 것이다). 규칙을 고칠 때는 이 표를 다시 뜬다.
// 안 깨지는 케이스가 생기면 그 규칙은 그때부터 장식이다.
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
// ① 장차 `strategy.matrix` 로 **복수 Node 를 의도적으로** 테스트하게 되면 규칙 1이
//    오탐한다(현재 매트릭스 0건 — 실측). 매트릭스를 도입하는 커밋은 이 게이트를 **먼저**
//    고쳐야 한다. 안 고치면 늑대소년이 되고, 항상 우는 경보는 곧 무시된다.
// ② 규칙2는 `engines.node` 의 **형태**를 본다(semver 파서가 없다). 위 허용 목록 밖의
//    표기를 쓰면 그 값이 라인 고정이더라도 FAIL 한다 — 실패 메시지가 허용 목록을
//    알려주므로 막히지는 않지만, 새 표기를 쓸 거면 이 게이트를 먼저 고쳐라.
// ③ 순수 액션 워크플로(step 은 있는데 node 를 안 쓰는 파일 — labeler 등)를 추가하면
//    「측정기 생존」의 `setup-node ≥ 1` 이 오탐한다 → `NO_NODE_WORKFLOWS` 에 넣는다.
//    ⚠ 이 줄은 원래 **재사용 워크플로 호출 job**(`uses: ./.github/workflows/ci.yml`)까지
//    같은 탈출로가 듣는 것처럼 적고 있었고 **거짓이었다**(검수관 C2, 실측). 그런 job 은
//    step 이 0건이라 `NO_NODE_WORKFLOWS` 에 넣어도 **여전히 FAIL** 했고, 게다가
//    `step 0건 — 들여쓰기 형태가 바뀌었다` 라는 **오진 메시지**로 다음 사람을 없는 문제로
//    보냈다. 가설이 아니다 — `deploy.yml` 의 `verify:` job 이 이미 그 형태다. 지금은
//    파서가 job 레벨 `uses:` 를 `reusable` 로 인식해 **목록에 넣을 필요 없이** 면제된다.
//    **없는 탈출로를 적어두는 것은 탈출로가 없는 것보다 나쁘다.**
// ④ 「측정기 생존」이 FAIL 한 회차에서는 규칙3·4 의 초록을 **근거로 쓰지 마라.**
//    step 배열이 비면 순회 대상이 없어 vacuous pass 로 초록이 된다(검수관 P-D).

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
/**
 * `reusable` — job 레벨(4칸) `uses:` 로 **재사용 워크플로를 호출하는** job.
 * 그런 job 은 `steps` 가 원래 없다(`deploy.yml` 의 `verify:` 가 실물이다). step 0건을
 * 결함으로 세면 즉시 오탐이 난다.
 */
interface Job { name: string; file: string; steps: Step[]; reusable: boolean }

/**
 * 워크플로 YAML 을 job → step 으로 쪼갠다. **정규식 파싱이라 근사값이다** —
 * js-yaml 은 이 저장소의 직접 의존이 아니라(transitive) 쓰지 않는다. transitive 를
 * import 하면 lockfile 이 바뀌는 날 게이트가 조용히 죽는다.
 *
 * ⚠ **이 자리에 원래 *"형태가 달라지면 「측정기 생존」 검사가 job 0건으로 떨어져 조용히
 * 통과하지 않는다"* 라고 적혀 있었고 거짓이었다**(검수관 실측 2026-08-08, 블로커 B-A).
 * `ci.yml` 의 step 들여쓰기를 6칸 → 4칸으로 바꾸면 **YAML 로는 완전히 유효하고 Actions 도
 * 정상 실행되는데**, 규칙3·4 의 검출력이 **0** 이 되고 생존 검사는 그대로 통과했다:
 *
 *   M-F(들여쓰기 4칸) + M-D  → 5 passed / 0 failed   (규칙4 검출력 0)
 *   M-F              + M-C′ → 5 passed / 0 failed   (규칙3 검출력 0)
 *
 * 떨어지는 것은 job 이 아니라 **step** 인데 step 을 세는 단언이 없었고, `setup-node ≥ 1`
 * 단언은 **전 파일 합산**이라 나머지 3파일이 채웠다. 그래서 검사를 **파일 단위**로 내렸다.
 *
 * ⚠⚠ **그리고 그 처방에 *"주장을 참으로 만들었다"* 라고 적었는데 그것도 거짓이었다**
 * (검수관 3차, 블로커 C1). 파일 단위로도 부족했다 — `ci.yml` 의 **smoke job 만** 4칸으로
 * 낮추고 그 job 의 `setup-node` 를 `npm ci` 뒤로 옮기면(YAML 유효):
 *
 *   M-G(job 하나만 4칸 + setup-node 를 뒤로) → **5 passed / 0 failed**
 *
 * 같은 파일의 `verify` job 이 step 을 채워서 통과한 것이다. 진단이 한 단계 얕았다 —
 * 원인은 *"합산의 단위"* 가 아니라 **생존 검사의 단위가 파서가 죽을 수 있는 최소 단위
 * (job)보다 컸다**는 것이다. 지금은 **job 단위**로 내렸고 M-G 가 단독으로 FAIL 한다.
 *
 * **여전히 못 잡는 것**(이번에는 "참으로 만들었다" 고 쓰지 않는다): `steps:` 키 이름이
 * 바뀌거나 플로우 시퀀스 표기(`steps: [{...}]`)를 쓰면 이 파서는 여전히 못 읽는다.
 * job head(2칸) 들여쓰기가 바뀌면 파일 내 전 job 이 사라지지만 그것은 파일 단위 검사가
 * 잡는다.
 *
 * 이 형태가 이 저장소에서 **네 번째다** — behind-flag 괄호의 거짓 주장, hookify 검출력 0,
 * B-A, 그리고 이것. **세 번째를 고치는 커밋이 네 번째를 만들었다.** 교훈을 좁혀 적는다:
 * **게이트를 강화한 뒤 "닫았다" 를 적기 전에, 강화가 닫은 것이 *케이스* 인지 *형태* 인지
 * 구분하라.** 케이스를 닫고 형태를 닫았다고 적으면 다음 사람이 확인을 생략한다.
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
      cur = { name: jobHead[1], file, steps: [], reusable: false };
      jobs.push(cur);
      curStep = null;
      continue;
    }
    if (!cur) continue;

    // job 레벨(4칸) `uses:` = 재사용 워크플로 호출. **step 안의 `- uses:`(6칸)와 구별한다** —
    // 넓게 잡으면 모든 job 이 면제되어 검사가 통째로 죽는다(검수관 명세 2 의 거짓 FAIL 위험).
    if (/^ {4}uses:\s*\S/.test(ln)) { cur.reusable = true; continue; }

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

/**
 * node 를 쓰지 않는 워크플로 — 「측정기 생존」의 `setup-node ≥ 1` 에서 **명시적으로** 뺀다.
 * 현재 해당 0건이다(실측). 순수 액션 워크플로(labeler 등)를 추가하면 여기 넣어야 하고,
 * **넣는 것 자체가 검토 신호**다 — 자동 면제로 두면 그 파일은 영원히 안 보이게 된다.
 */
const NO_NODE_WORKFLOWS = new Set<string>([]);

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

  it('측정기 생존 — 각 워크플로 파일을 실제로 읽었는가 (파일 단위)', () => {
    // 이것이 없으면 아래 통과가 "정합이다" 인지 "아무것도 안 봤다" 인지 구별되지 않는다.
    //
    // **전 파일 합산이 아니라 파일 단위로 본다.** 합산이면 한 파일의 파싱이 통째로 죽어도
    // 나머지가 채워서 통과한다 — 그것이 블로커 B-A 였다(위 parseJobs 주석).
    expect(files.length, '워크플로 파일 0건').toBeGreaterThan(0);

    const dead: string[] = [];
    for (const f of files) {
      const js = jobs.filter((j) => j.file === f);
      if (js.length === 0) { dead.push(`${f}: job 0건 — 파서가 형태 변화를 못 따라갔다`); continue; }

      // ── job 단위 ────────────────────────────────────────────────────────
      // **파일 단위로도 부족했다**(검수관 M-G): 한 job 만 다른 들여쓰기로 써도 그 job 의
      // step 이 0건이 되는데, 같은 파일의 다른 job 이 채워서 통과했다. 파서가 죽을 수 있는
      // **최소 단위가 job** 이므로 검사도 거기까지 내려간다.
      for (const j of js) {
        if (!j.reusable && j.steps.length === 0) {
          dead.push(`${f} (job ${j.name}): step 0건 — 들여쓰기 형태가 바뀌었거나 파서가 못 읽었다`);
        }
      }

      // ── 파일 단위: setup-node 존재 ──────────────────────────────────────
      // 모든 job 이 재사용 워크플로 호출이면 이 파일 자체에 node 실행이 없다 → 면제.
      // (`NO_NODE_WORKFLOWS` 는 step 은 있는데 node 를 안 쓰는 파일용이다. 예전에는 이
      //  목록이 step 0건 검사 **뒤에만** 걸려서 재사용 워크플로 파일에는 탈출로가
      //  아예 없었다 — 검수관 블로커 C2, 실측으로 확인된 결함이다.)
      const exempt = NO_NODE_WORKFLOWS.has(f.split('/').pop()!) || js.every((j) => j.reusable);
      if (!exempt && !js.some((j) => j.steps.some(isSetupNode))) {
        dead.push(`${f}: setup-node 스텝 0건 — node 를 안 쓰는 파일이면 NO_NODE_WORKFLOWS 에 넣어라`);
      }
    }
    expect(dead, `측정기가 죽은 파일:\n  ${dead.join('\n  ')}`).toEqual([]);
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
    // 판정 **의도**는 "M+1 을 허용하는가" 이고, **수단은 형태 열거**다(semver 파서가 없다 —
    // 헤더 「거짓 FAIL 위험 ②」 참조). 첫 판본은 허용 형태를 좁게 열거해서
    // `"24"`·`"~24"`·`"24.19.0"` 을 거부했는데(검수관 P-1 실측), 그 셋은 전부 라인 고정이거나
    // **더 엄격하다.** 정당한 값이 막히면 다음 사람이 게이트를 우회한다 — 넓혔다.
    const pinned = new RegExp(`^[\\^~]?${M}(\\.(?:\\d+|x)){0,2}$`).test(range); // 24 · ^24 · ~24.19 · 24.19.0 · 24.x
    const bounded = new RegExp(`^>=\\s*${M}(\\.\\d+){0,2}\\s+<\\s*${M + 1}(\\.\\d+){0,2}$`).test(range);
    expect(
      pinned || bounded,
      `engines.node = ${JSON.stringify(range)} 가 ${M} 라인 고정이 아니다.\n` +
        `  허용: "${M}" · "^${M}" · "~${M}" · "${M}.x" · "${M}.19.0" · ">=${M} <${M + 1}"\n` +
        `  거부: ">=${M}"(상한 없음 — 26·27 을 허용한다) · "^${M} || ^${M + 2}" · "*"`,
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
