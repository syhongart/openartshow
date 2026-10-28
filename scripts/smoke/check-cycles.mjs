// scripts/smoke/check-cycles.mjs — 모듈 **순환 의존** 정적 검사.
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────────────
// `docs/ARCHITECTURE.md` §2 강제 불변식 2 가 **「순환 의존 0」** 을 세우고 *"위반 =
// 교차리뷰 반려"* 라고 적는다. 그런데 **그 선언을 검사하는 것이 아무것도 없었다**
// (2026-08-16 실측 — `tests/`·`scripts/` 전수 검색에서 순환 검사 0건). 즉 규칙이
// 사람 눈에만 걸려 있었고, 이 저장소가 반복해서 데인 형태다:
//
//   *"게이트 유효성에 대한 거짓 진술은 다음 사람이 확인을 생략하게 만든다"*
//
// 순환은 특히 사람 눈이 못 잡는다 — A→B→C→A 는 파일 셋을 **동시에** 봐야 보이고,
// 리뷰는 diff 단위라 그 셋이 한 화면에 오는 일이 드물다. 그리고 증상이 나중에
// 엉뚱한 곳에서 난다(ESM 순환은 `undefined` 를 조용히 반환한다 — TDZ 위반이 아니라
// **초기화 전 바인딩**이라 던지지도 않는다).
//
// ── 방법 ────────────────────────────────────────────────────────────────────
// `ts.preProcessFile`(파서만, 타입 체크 없음)로 각 파일의 import 목록을 뽑고,
// `ts.resolveModuleName` 으로 실제 파일 경로를 해소한 뒤 Tarjan SCC 로 순환을 찾는다.
// **새 의존성 0** — `check-refs.mjs` 가 이미 쓰는 `typescript` 를 재사용한다.
//
// 정규식으로 import 를 긁지 않는 이유: 주석 안의 `import`, 문자열 리터럴, 여러 줄에
// 걸친 import 절에 전부 속는다. 파서는 안 속는다.
//
// ── 대상 ────────────────────────────────────────────────────────────────────
// `frontend/js/**` 의 `.ts`·`.js`·`.mjs` **전부(재귀)**. `vendor/` 와 `.min.js` 는 제외
// (남의 코드다). ⚠ `check-refs.mjs` 는 `readdirSync` **비재귀**라 root 직속만 보는데,
// 이 검사는 **전체를 본다** — 순환은 하위 디렉터리 안에서 나는 것이 대부분이다.
//
// 「무엇을 대상으로 하는지」를 `covered` 로 반환한다. 검수관 GS-O4 가 `check-refs.mjs`
// 에 요구한 것과 같은 이유다 — *"목록을 돌려주면 그 주장을 사람이 세는 대신 테스트가 읽는다."*
//
// ── 이 검사가 **못 잡는 것** ────────────────────────────────────────────────
// · **계산된 동적 import** — `import(someVar)` 는 경로가 런타임에 정해져 정적으로 못 본다
// · **`require()`** — 이 저장소는 ESM 전용이라 대상이 아니지만, 쓰이면 안 보인다
// · **타입 전용 순환** — `import type` 도 여기서는 **순환으로 센다.** 런타임에는 지워져
//   문제가 없지만 «설계상 서로를 안다» 는 사실은 같고, ARCHITECTURE §2 가 막는 것이
//   런타임 사고가 아니라 **의존 방향의 붕괴**다. 오탐이 아니라 의도다.
//   (그 판정이 뒤집히면 `preProcessFile` 결과에서 `isTypeOnly` 를 걸러내면 된다 —
//    `ts.preProcessFile` 은 그 정보를 안 주므로 그때는 `ts.createSourceFile` 로 내려간다.)
//
// ── 실측 (2026-08-16 신설 시점) ─────────────────────────────────────────────
// 파일 382 · 엣지 **1,060** · **순환 0**. baseline 을 두지 않는 이유가 이것이다 —
// 지금 0이므로 처음부터 error 로 걸 수 있다. **하나라도 생기면 그날 빨간불이 된다.**
//
// ⚠ 설계 단계에서 정규식으로 근사했을 때는 엣지가 **954** 였다. 파서가 **106개를 더**
// 찾았다 — 정규식이 놓친 형태(여러 줄 import 절, `export … from`, 동적 `import()`)가
// 그만큼이라는 뜻이다. **근사로 「순환 0」을 확인하고 끝냈다면 그 106개 위의 순환은
// 안 보였을 것이다.** 이것이 파서를 쓰는 이유의 실측이다.
//
// ── 검출력 실측 (뮤테이션 3케이스, 2026-08-16) ──────────────────────────────
// 임시 모듈을 넣어 실제로 빨간불이 되는지 확인했다(기존 파일 무수정, 검사 후 삭제):
//
//   M1  a ↔ b            (2-순환)      → FAIL  [2] a.ts ↔ b.ts
//   M2  x → y → z → x    (3-순환)      → FAIL  [3] x.ts ↔ y.ts ↔ z.ts
//   M3  s → s            (자기참조)     → FAIL  [1] s.ts
//
// 셋 다 종료코드 1, 정리 후 다시 0. **규칙당 위반 케이스 2개 이상**을 요구하는 규율
// (hookify 첫 판본이 `action: warn` 이라 검출력이 구조적으로 0이었던 그 형태)을 지킨다.
//
// 종료코드: 순환 0 → 0, 하나라도 있으면 1(+ 사이클 경로 출력).

import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'frontend', 'js');

/** 남의 코드·산출물. 순환이 있어도 우리가 고칠 대상이 아니다. */
const SKIP_RE = /(^|[/\\])(vendor)([/\\]|$)|\.min\.js$/;

const EXT = ['.ts', '.js', '.mjs'];

const RESOLVE_OPTIONS = {
  // `check-refs.mjs` 와 같은 값을 쓴다. 다르면 같은 소스에서 다른 그래프가 나온다.
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowJs: true,
};

/** `frontend/js` 아래 소스 파일 전부(재귀). */
function listSources(dir = SRC, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP_RE.test(p)) continue;
    if (e.isDirectory()) listSources(p, out);
    else if (EXT.includes(path.extname(e.name))) out.push(p);
  }
  return out;
}

/**
 * import 하나를 실제 파일로 해소한다. 못 하면 `null`.
 *
 * ⚠ 이 저장소는 소스가 `.ts` 인데 import 는 `.js` 로 적는다(ESM 규약 — 산출 기준).
 * `moduleResolution: Bundler` 가 그것을 해소하지만, 실패하면 확장자를 손으로 바꿔
 * 한 번 더 시도한다. 그 폴백이 없으면 **그래프가 조용히 비고 순환이 0으로 보인다** —
 * 이 검사에서 가장 위험한 실패 모드이므로 아래 `unresolved` 로 세어 보고한다.
 */
function resolveImport(spec, from, host) {
  if (!spec.startsWith('.')) return null; // 패키지 import 는 대상 밖
  const r = ts.resolveModuleName(spec, from, RESOLVE_OPTIONS, host);
  const f = r.resolvedModule?.resolvedFileName;
  if (f) return path.normalize(f);

  // 폴백 — `./x.js` → `./x.ts`, 확장자 없음 → 각 확장자
  const base = path.resolve(path.dirname(from), spec);
  const cands = [];
  if (path.extname(base)) cands.push(base.replace(/\.[^.]+$/, ''));
  else cands.push(base);
  for (const c of cands) {
    for (const ext of EXT) {
      const p = c + ext;
      if (fs.existsSync(p)) return path.normalize(p);
    }
  }
  return null;
}

/** import 그래프를 만든다. 노드는 절대경로. */
export function buildGraph() {
  const files = listSources().map((f) => path.normalize(f));
  const known = new Set(files);
  const host = ts.createCompilerHost(RESOLVE_OPTIONS);
  const graph = new Map();
  let edges = 0;
  const unresolved = [];

  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    // `preProcessFile(text, readImportFiles, detectJavaScriptImports)`
    const pre = ts.preProcessFile(src, true, true);
    const deps = new Set();
    for (const ref of pre.importedFiles) {
      const target = resolveImport(ref.fileName, f, host);
      if (target && known.has(target)) {
        deps.add(target);
        edges++;
      } else if (ref.fileName.startsWith('.') && !target) {
        unresolved.push({ from: path.relative(ROOT, f), spec: ref.fileName });
      }
    }
    graph.set(f, deps);
  }
  return { files, graph, edges, unresolved };
}

/**
 * Tarjan 강결합요소. 크기 2 이상인 SCC = 순환. 자기 자신을 import 하는 것도 순환이다.
 *
 * 재귀가 아니라 **명시 스택**이다 — 382 파일에서 재귀 깊이가 스택 한계에 닿을 수 있고,
 * 그때 나는 것은 「순환 0」이 아니라 **크래시**라 증상이 다르지만, 애초에 재귀를 안 쓰면
 * 그 갈림이 없다.
 */
export function findCycles(graph) {
  const idx = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  let counter = 0;
  const cycles = [];

  for (const root of graph.keys()) {
    if (idx.has(root)) continue;
    const work = [[root, [...(graph.get(root) ?? [])], 0]];
    idx.set(root, counter); low.set(root, counter); counter++;
    stack.push(root); onStack.add(root);

    while (work.length) {
      const frame = work[work.length - 1];
      const [node, deps] = frame;
      let descended = false;
      while (frame[2] < deps.length) {
        const w = deps[frame[2]++];
        if (!idx.has(w)) {
          idx.set(w, counter); low.set(w, counter); counter++;
          stack.push(w); onStack.add(w);
          work.push([w, [...(graph.get(w) ?? [])], 0]);
          descended = true;
          break;
        }
        if (onStack.has(w)) low.set(node, Math.min(low.get(node), idx.get(w)));
      }
      if (descended) continue;

      work.pop();
      if (work.length) {
        const parent = work[work.length - 1][0];
        low.set(parent, Math.min(low.get(parent), low.get(node)));
      }
      if (low.get(node) === idx.get(node)) {
        const comp = [];
        for (;;) {
          const w = stack.pop();
          onStack.delete(w);
          comp.push(w);
          if (w === node) break;
        }
        const selfLoop = comp.length === 1 && (graph.get(comp[0]) ?? new Set()).has(comp[0]);
        if (comp.length > 1 || selfLoop) cycles.push(comp);
      }
    }
  }
  return cycles;
}

/** `gate.mjs`·테스트가 재사용하는 결과 반환 래퍼. */
export function checkCycles() {
  const { files, graph, edges, unresolved } = buildGraph();
  const cycles = findCycles(graph);
  const covered = files.map((f) => path.relative(ROOT, f));
  return {
    ok: cycles.length === 0,
    fileCount: files.length,
    edges,
    covered,
    unresolved,
    cycles: cycles.map((c) => c.map((f) => path.relative(ROOT, f)).sort()),
    evidence: cycles.length === 0
      ? `파일 ${files.length} · 엣지 ${edges} · 순환 0`
      : `순환 ${cycles.length}건 — ${cycles.map((c) => c.length).join(', ')}개짜리`,
  };
}

// 단독 실행 진입점.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const r = checkCycles();
  // 해소 실패는 **그래프가 비었다는 신호**라 순환 0 보다 먼저 말한다. 이것을 조용히
  // 넘기면 «검사가 아무것도 안 보는데 PASS» 가 된다 — 이 저장소의 상시 위험이다.
  if (r.unresolved.length > 0) {
    console.log(`  ⚠ 해소 못 한 상대 import ${r.unresolved.length}건 (그래프에서 빠졌다):`);
    for (const u of r.unresolved.slice(0, 10)) console.log(`      ${u.from} → ${u.spec}`);
    if (r.unresolved.length > 10) console.log(`      … 외 ${r.unresolved.length - 10}건`);
  }
  if (r.ok) {
    console.log(`순환 의존 0 — ${r.evidence}.`);
    process.exit(0);
  }
  console.error(`순환 의존 FAIL — ${r.evidence}:`);
  for (const c of r.cycles) {
    console.error(`  [${c.length}] ${c.join('  ↔  ')}`);
  }
  console.error('');
  console.error('  docs/ARCHITECTURE.md §2 강제 불변식 2 — 순환 의존 0.');
  process.exit(1);
}
