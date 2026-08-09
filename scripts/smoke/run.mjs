// scripts/smoke/run.mjs  —  `npm run smoke` 진입점
//
// 배포 전 헤드리스 스모크의 "실행 보조" 하네스. deploy.yml 의 _site 조립을
// 재현하고, smoke-check 스킬 6항 + 가드A/B 를 헤드리스 크로미움으로 자동 실행한다.
//
// ⚠️ 이 스크립트는 smoke-check 스킬을 대체하지 않는다. 최종 판정·보고의 책임은
//    여전히 구현자와 분리된 독립 executor(haiku) 에게 있고, executor 는 skill 절차에
//    따라 이 하네스를 "실행 보조"로 사용한다. (§10-3 구현자 ≠ 검증자)
//
// 종료코드: 전부 PASS → 0, 하나라도 FAIL → 1 (CI 게이트가 이 코드로 판정).
// 가드A(인라인 script)는 INFO 로만 리포트하며 종료코드에 영향을 주지 않는다.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  ROOT,
  SITE_DIR,
  BASE_PATH,
  GENERATORS,
  GENERATED_ROOT_FILES,
  MANIFEST_TOLERANCE,
  STATIC_ROOT_EXTRA,
  REQUIRED_FILES_BY_MODE,
  LIVE_PAGES,
  VIEWPORTS,
  PAGE_TIMEOUT_MS,
} from './config.mjs';
import { ASSEMBLERS, countFiles } from './assemble.mjs';
import { startServer } from './server.mjs';
import { launchBrowser, collectPage } from './browser-checks.mjs';
import { checkRefs } from './check-refs.mjs';

// ── 모드 선택 ────────────────────────────────────────────────────────
// `node run.mjs`      → baseline(frontend직조립, 현행 deploy.yml 복제)
// `node run.mjs vite` → vite 조립(교체 deploy.yml)
const MODE = process.argv[2] === 'vite' ? 'vite' : 'baseline';
const IS_VITE = MODE === 'vite';
const REQUIRED_FILES = REQUIRED_FILES_BY_MODE[MODE];
const URL_PREFIX = IS_VITE ? BASE_PATH.replace(/\/$/, '') : ''; // '/openartshow'
const SERVE_BASE = IS_VITE ? BASE_PATH : null;                  // 서버 마운트 프리픽스

const results = []; // { id, label, status: 'PASS'|'FAIL'|'INFO', evidence }
const record = (id, label, status, evidence) => results.push({ id, label, status, evidence });

// ── 검사-1: 워킹트리 가드 — "무엇을 쟀는가"를 보고서에 남긴다 ──────────
//
// 배경(2026-07-27 사고). 게이트 스모크를 맡은 에이전트가 대조군 비교를 하려고
// `git checkout <이전커밋> -- <파일>`로 소스를 되돌린 뒤 복구하지 않았다. 그 상태로 돈
// 측정은 **옛 코드를 잰 것**이었는데, 보고서에는 그 사실이 어디에도 나타나지 않았다.
// 수치는 그럴듯했고 아무도 무엇을 쟀는지 알 수 없었다.
//
// 그래서 두 가지를 한다.
//  ① 실행 시점의 HEAD와 워킹트리 변경을 **보고서에 찍는다**(INFO). 사후에 "이 스모크가
//     무엇을 검증한 것인가"를 되짚을 수 있어야 한다.
//  ② 스모크가 도는 동안 추적 파일이 바뀌면 **FAIL**. 측정 중 대상이 바뀌는 것은
//     결과를 통째로 무효화하므로 통과시키면 안 된다.
//
// 산출물(`_site`·`dist`·`node_modules`)은 .gitignore이므로 여기 잡히지 않는다.
function gitLine(args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/**
 * 감시 대상은 **측정 대상인 소스**뿐이다.
 *
 * 스모크는 생성기를 돌려 `devlog/`·`sitemap.xml`·`team/` 등을 의도적으로 재생성한다.
 * 그걸 오염으로 치면 이 가드는 항상 FAIL이라 아무도 안 보게 된다 — 늘 우는 경보는
 * 경보가 아니다. 스모크가 검증하는 것은 `frontend/` 소스와 하네스·테스트·빌드 설정이므로,
 * 그것들이 도중에 바뀌었을 때만 결과가 무효가 된다.
 */
const WATCHED = /^(frontend|backend|scripts|tests)\/|^(vite\.config\.js|vitest\.config\.js|package\.json)$/;

/**
 * 감시 경로의 추적 파일 변경만 추린다(untracked `??`는 제외 — 스크래치 위반은 별건).
 *
 * 먼저 인덱스를 refresh한다. git은 변경 판단에 stat 캐시를 쓰는데, 소스를 막 수정한
 * 직후에는 인덱스가 stale해서 **같은 파일을 시작 시점과 종료 시점에 다르게 읽는다.**
 * 실제로 그 오탐이 한 번 났다(재현되지 않는 FAIL). 가끔 우는 경보는 늘 우는 경보만큼
 * 나쁘다 — 다음에 진짜 오염이 잡혀도 "또 그거겠지"가 되기 때문이다.
 *
 * ── `gitLine` 을 쓰지 않는 이유 (2026-07-29 실측으로 발견한 결함) ─────────────
 * `gitLine` 은 `stdout.trim()` 을 한다. `rev-parse` 같은 단일 값에는 맞지만
 * `status --porcelain` 에는 **틀린다.** porcelain 은 `XY <경로>` — 상태 2글자 +
 * 공백이고, 워킹트리만 변경된 파일은 X 가 **공백**이다(`" M scripts/..."`).
 * `trim()` 이 그 선행 공백을 먹으면 **첫 줄만 3글자가 아니라 2글자 접두사**가 되고,
 * 뒤따르는 `slice(3)` 이 경로 첫 글자를 잘라먹는다 — `"ripts/smoke/..."` 가 되어
 * `WATCHED` 에 안 걸린다.
 *
 * 결과: **정렬상 첫 줄에 오는 변경은 항상 안 보인다.** 감시 파일이 하나뿐이면
 * "변경 0건"으로 보고되어 가드가 통째로 무력해진다. 실제로 `scripts/smoke/assemble.mjs`
 * 를 고친 채 스모크를 돌렸더니 `[-1]` 이 "변경 1건"(config.mjs 만)으로 찍혔다.
 *
 * 이 가드는 "에이전트가 워킹트리를 바꿔 측정이 무효가 되는" 사고(이 저장소 2건)를
 * 잡으라고 만든 것이다. 그 가드가 첫 항목을 못 보고 있었다. 그래서 raw stdout 을 쓴다.
 */
function trackedChanges() {
  spawnSync('git', ['update-index', '--refresh'], { cwd: ROOT, encoding: 'utf8' });
  const r = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return null; // git 없음/저장소 아님 — 검사 생략
  return r.stdout.split('\n')
    // 접두사 3글자를 온전히 보존해야 하므로 trim 하지 않는다. 빈 꼬리줄은 길이로 거른다.
    .filter((l) => l.length > 3 && !l.startsWith('??'))
    // porcelain 형식: 2글자 상태 + 공백 + 경로. 이름 변경은 `->` 뒤가 현재 경로.
    .filter((l) => WATCHED.test(l.slice(3).split(' -> ').pop().replace(/^"|"$/g, '')))
    .sort().join('\n');
}

function recordWorktreeBaseline() {
  const head = gitLine(['rev-parse', '--short', 'HEAD']);
  const changed = trackedChanges();
  if (changed === null) {
    record('-1', '워킹트리 기준점', 'INFO', 'git 사용 불가 — 가드 생략');
    return null;
  }
  const n = changed ? changed.split('\n').length : 0;
  record('-1', '워킹트리 기준점', 'INFO',
    `HEAD ${head ?? '?'} · 추적 파일 변경 ${n}건${n ? `\n${changed}` : ' (HEAD 그대로)'}`);
  return changed;
}

function checkWorktreeUnchanged(baseline) {
  if (baseline === null) return true;
  const now = trackedChanges();
  if (now === baseline) {
    record('-1b', '워킹트리 불변', 'PASS', '스모크 중 추적 파일 변경 없음');
    return true;
  }
  record('-1b', '워킹트리 불변', 'FAIL',
    '스모크가 도는 동안 추적 파일이 바뀌었다 — 측정 대상이 달라졌으므로 이 결과는 무효다.\n'
    + `이전:\n${baseline || '(없음)'}\n이후:\n${now || '(없음)'}`);
  return false;
}

// ── 검사0: 참조 무결성 (no-undef 스코프 — 끊긴 cross-module 참조) ──────
// @ts-nocheck 모듈이 tsc·eslint 정적 게이트의 사각이 되는 문제(C-3(2) chibi 런타임
// 크래시 사건)를 상시 자동화로 막는다. 억제 지시어를 벗긴 사본에서 미해결 참조만 검출.
function checkReferences() {
  const r = checkRefs();
  record('0', '참조 무결성(no-undef)', r.ok ? 'PASS' : 'FAIL', r.evidence);
  return r.ok;
}

// ── 검사1: 생성기 3종 exit 0 ─────────────────────────────────────────
function checkGenerators() {
  for (const g of GENERATORS) {
    const r = spawnSync('node', [g], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) {
      const tail = ((r.stderr || r.stdout || '').trim().split('\n').pop() || '').slice(0, 160);
      record('1', '생성기 통과', 'FAIL', `${g} exit ${r.status} — ${tail}`);
      return false;
    }
  }
  record('1', '생성기 통과', 'PASS', `${GENERATORS.length}개 생성기 exit 0`);
  return true;
}

/**
 * 검사2: 매니페스트 파일수 — **조립 구성요소의 합과 대조한다.**
 *
 * 옛 판본은 실측 상수(vite 148)와 비교했는데, `devlog/` 가 개발일지마다 늘어 실측이
 * 227 이 되도록 상수는 148 이었다 → **84개가 사라져도 PASS** 였다(검수관 P1).
 * 상수를 갱신해도 같은 일이 반복된다 — 낡는 방향이 검출력을 깎는 쪽이기 때문이다.
 *
 * `_site` 는 정의상 `dist + devlog + team + valuation + 루트 정적` 이므로 그 등식이
 * 깨지면 조립이 뭔가 빠뜨린 것이다. 양쪽이 함께 늘어 **값이 낡지 않는다.**
 *
 * baseline 모드는 `cp -r frontend/. $OUT/app/` 라 구성요소가 겹쳐(루트 html 4개가
 * frontend 사본과 중복) 등식이 성립하지 않는다. 그쪽은 배포를 재현하지 않는
 * 대조군이므로 현재값만 INFO 로 남긴다 — **판정하지 않는 것을 판정한 척하지 않는다.**
 *
 * ── 검사2의 사각: 자기참조 항등식 ─────────────────────────────────────
 * 검사2는 `parts.devlog` 를 `_site` 로 복사되는 **바로 그 원본 디렉터리**에서 잰다.
 * 그래서 생성기가 콘텐츠를 **아예 안 만들면** 양변이 함께 줄어 `diff=0` 이 되고
 * 검사2는 PASS 로 남는다. 그 사고는 **검사3(핵심 파일 존재)이 잡는다**
 * (검수관 뮤테이션 실측: 스텁 생성 스킵 → 검사2 PASS · 검사3 FAIL · 전체 FAIL).
 * 즉 검사2의 검출 범위는 "`cp` 단계에서 빠지는 사고" 에 한정된다.
 * `config.mjs` 의 `REQUIRED_FILES_COMMON` 목록이 줄어들면 검사2는 절대 못 잡는다.
 */
function checkManifestCount() {
  const n = countFiles(SITE_DIR);
  if (!IS_VITE) {
    record('2', '매니페스트 파일수', 'INFO',
      `${n} — baseline 조립은 구성요소가 겹쳐 등식이 성립하지 않는다(대조군 전용, 판정 없음)`);
    return;
  }
  const parts = {
    dist: countFiles(path.join(ROOT, 'dist')),
    making: countFiles(path.join(ROOT, 'making')),
    devlog: countFiles(path.join(ROOT, 'devlog')),
    team: countFiles(path.join(ROOT, 'team')),
    valuation: countFiles(path.join(ROOT, 'valuation')),
  };
  // staticRoot = _site **루트에 직접 놓이는** 파일만이다:
  //   sitemap.xml · robots.txt (GENERATED_ROOT_FILES) + _deploy-sha.txt (+1) + .nojekyll
  //
  // 리다이렉트 스텁 3개는 여기 없다. `devlog/index.html`·`team/index.html`·
  // `valuation/index.html` 은 **각 디렉터리 안**에 있고 `cp -r devlog team valuation`
  // 이 통째로 옮기므로 위 `parts.devlog`·`parts.team`·`parts.valuation` 에 이미
  // 세어져 있다. 한때 여기에 `+3` 이 붙어 있었고 그게 이중계상이었다.
  //
  // **그 오진을 부른 것은 로컬 잔재였다.** 개발 머신의 `devlog/` 에는 경로 재편 전
  // 생성한 옛 산출물 139개가 남아 있었고(`.gitignore` 가 가려 눈에 안 띄었다),
  // 그것까지 세니 `parts.devlog` 가 140 으로 부풀어 계산이 어긋났다. 클린 클론
  // (`git archive HEAD`)에서는 1 이다 — CI 는 언제나 그 조건이다.
  // 조립 수치를 의심할 때는 **워킹트리가 아니라 클린 클론에서** 재라.
  const staticRoot = GENERATED_ROOT_FILES.length + 1 + STATIC_ROOT_EXTRA.length; // +1 = DEPLOY_SHA_FILE
  const expected = Object.values(parts).reduce((a, b) => a + b, 0) + staticRoot;
  const diff = n - expected;
  const breakdown = `${Object.entries(parts).map(([k, v]) => `${k} ${v}`).join(' + ')} + 정적 ${staticRoot}`;
  if (Math.abs(diff) > MANIFEST_TOLERANCE) {
    record('2', '매니페스트 파일수', 'FAIL',
      `${n} ≠ 기대 ${expected} (Δ${diff >= 0 ? '+' : ''}${diff}) — ${breakdown}. 조립이 빠뜨렸거나 군더더기가 붙었다`);
  } else {
    record('2', '매니페스트 파일수', 'PASS', `${n} = ${breakdown}`);
  }
}

// ── 검사3: 핵심 파일 존재 ────────────────────────────────────────────
function checkRequiredFiles() {
  const missing = REQUIRED_FILES.filter((rel) => !fs.existsSync(path.join(SITE_DIR, rel)));
  if (missing.length) {
    record('3', '핵심 파일 존재', 'FAIL', `누락 ${missing.length}: ${missing.join(', ')}`);
  } else {
    record('3', '핵심 파일 존재', 'PASS', `${REQUIRED_FILES.length}/${REQUIRED_FILES.length} 존재`);
  }
}

// CSP content 문자열 → 디렉티브 맵
function parseCsp(content) {
  const dirs = {};
  for (const part of content.split(';')) {
    const t = part.trim();
    if (!t) continue;
    const [name, ...vals] = t.split(/\s+/);
    dirs[name.toLowerCase()] = vals;
  }
  return dirs;
}

// 한 페이지 CSP 유효성: script-src(self 또는 sha256), object-src 'none', base-uri 'none'
function evalCsp(content) {
  if (!content) return { ok: false, reason: 'CSP 메타 없음' };
  const d = parseCsp(content);
  const ss = d['script-src'] || [];
  const scriptOk = ss.includes("'self'") || ss.some((v) => v.startsWith("'sha256-") || v.startsWith("'sha384-") || v.startsWith("'sha512-"));
  const objOk = (d['object-src'] || []).includes("'none'");
  const baseOk = (d['base-uri'] || []).includes("'none'");
  if (scriptOk && objOk && baseOk) return { ok: true };
  const miss = [];
  if (!scriptOk) miss.push('script-src(self/hash)');
  if (!objOk) miss.push("object-src 'none'");
  if (!baseOk) miss.push("base-uri 'none'");
  return { ok: false, reason: miss.join(', ') };
}

// 가드B: 페이지 내부 링크가 _site 안 실제 파일로 존재하는지 (동일오리진·상대만)
// vite 모드는 링크가 절대경로 /openartshow/… 이므로 basePath 프리픽스를 strip 해 매핑.
function verifyLinks(pageResults, origin, basePath) {
  let checked = 0;
  const missing = [];
  for (const pr of pageResults) {
    const seen = new Set();
    for (const href of pr.links || []) {
      let u;
      try {
        u = new URL(href);
      } catch {
        continue;
      }
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue; // mailto/tel 제외
      if (u.origin !== origin) continue; // 외부 오리진 제외
      let p = decodeURIComponent(u.pathname);
      if (basePath && p.startsWith(basePath)) p = '/' + p.slice(basePath.length);
      else if (basePath && p + '/' === basePath) p = '/';
      if (p.endsWith('/')) p += 'index.html';
      if (seen.has(p)) continue;
      seen.add(p);
      checked += 1;
      const fp = path.normalize(path.join(SITE_DIR, p));
      if (!fp.startsWith(SITE_DIR) || !fs.existsSync(fp)) missing.push(`${pr.name} → ${p}`);
    }
  }
  return { checked, missing };
}

// ── 브라우저 기반 검사(4/5/6/A/B) 집계 ───────────────────────────────
function aggregateBrowser(pageResults, origin) {
  // ── 검사4-b: 날씨 코드가 **실제로 실행됐는가** ─────────────────────────
  //
  // 하늘 엔진의 기본 날씨는 clear다. 페이지를 띄우기만 하면 비·눈 코드는 한 프레임도
  // 돌지 않으므로, 강수 관련 변경에 "콘솔 에러 0"을 근거로 쓰면 재지 않은 것을 통과로
  // 적는 것이다(2026-07-27 실제 사고 — 검수관이 잡았다).
  //
  // 그래서 프로브가 밟은 날씨를 여기서 **명시적으로 센다.** 프로브 대상 페이지인데
  // 아무것도 못 밟았으면(버튼 셀렉터 변경·패널 제거 등) FAIL이다 — 조용히 건너뛰면
  // 이 검사 자체가 장식이 된다.
  const probeTargets = LIVE_PAGES
    .filter((s) => s.weatherProbe && (!s.viteOnly || IS_VITE))
    .map((s) => s.name);
  if (probeTargets.length) {
    const done = pageResults.filter((p) => probeTargets.includes(p.name));
    const empty = done.filter((p) => !(p.weatherProbed?.length));
    if (empty.length || done.length !== probeTargets.length) {
      record('4b', '날씨 코드 실행', 'FAIL',
        `강수 코드를 실행하지 못한 페이지: ${empty.map((p) => p.name).join(', ') || '(페이지 자체 누락)'}`
        + ' — 날씨 버튼 셀렉터가 바뀌었는지 확인. 이 상태의 "콘솔 에러 0"은 강수 코드에 대해 아무 근거가 아니다.');
    } else {
      record('4b', '날씨 코드 실행', 'PASS',
        done.map((p) => `${p.name}=${p.weatherProbed.join('·')}`).join(' / '));
    }
  }

  // 검사4: 콘솔 에러 0
  const errAgg = pageResults.map((p) => ({
    name: p.name,
    n: (p.consoleErrors?.length || 0) + (p.pageErrors?.length || 0) + (p.failedRequests?.length || 0),
    sample: [...(p.consoleErrors || []), ...(p.pageErrors || []), ...(p.failedRequests || [])][0],
  }));
  const errPages = errAgg.filter((e) => e.n > 0);
  if (errPages.length) {
    const first = errPages[0];
    record('4', '콘솔 에러 0', 'FAIL',
      `${errPages.length}개 페이지에서 에러 — 예: [${first.name}] ${(first.sample || '').slice(0, 120)}`);
  } else {
    record('4', '콘솔 에러 0', 'PASS', `${pageResults.length}개 페이지, console.error·pageerror 0`);
  }

  // 검사5: 가로 넘침 0 (페이지 × 뷰포트)
  //
  // ── `minViewport` — 좁은 화면을 **면제받는 것이 아니라 대상이 아님을 적는다** ──
  // `LIVE_PAGES` 항목이 `minViewport` 를 선언하면 그보다 좁은 뷰포트는 이 검사에서
  // 빠지고, **빠진 만큼이 INFO 로 화면에 찍힌다**(조용히 줄어들면 그때부터 장식이다).
  //
  // 왜 필요했나: three.js editor 를 반입하니 320px 에서 335>320 이 났다(15px). editor 는
  // 드래그·기즈모로 조작하는 **데스크톱 전용 도구**라 초소형 폭이 설계 대상이 아니다.
  // 그렇다고 CSS 를 추측으로 고치면 외부 코드를 근거 없이 개조하는 것이고, 검사를
  // 통째로 끄면 다른 페이지의 회귀까지 잃는다 — **어느 페이지가 어느 폭부터 유효한지**를
  // 데이터로 두는 것이 두 손실을 다 피한다.
  const overflows = [];
  const skipped = [];
  for (const p of pageResults) {
    const min = LIVE_PAGES.find((x) => x.name === p.name)?.minViewport ?? 0;
    for (const o of p.overflow || []) {
      if (o.vw < min) { skipped.push(`${p.name}@${o.vw}px`); continue; }
      if (o.overflow) overflows.push(`[${p.name}] ${o.vw}px: ${o.scrollWidth}>${o.innerWidth}`);
    }
  }
  const totalCells = pageResults.length * VIEWPORTS.length - skipped.length;
  if (overflows.length) {
    record('5', '가로 넘침 0', 'FAIL', `${overflows.length}건 넘침 — ${overflows.slice(0, 3).join(' | ')}`);
  } else {
    const note = skipped.length ? ` · minViewport 로 제외 ${skipped.length}칸(${skipped.join(', ')})` : '';
    record('5', '가로 넘침 0', 'PASS', `${totalCells}조합 넘침 0${note}`);
  }

  // 검사6: CSP 부팅 (메타 유효 + violation 0)
  const cspFails = [];
  let violationTotal = 0;
  for (const p of pageResults) {
    const e = evalCsp(p.cspMeta);
    if (!e.ok) cspFails.push(`[${p.name}] ${e.reason}`);
    const v = p.cspViolations?.length || 0;
    violationTotal += v;
    if (v) cspFails.push(`[${p.name}] violation×${v}: ${p.cspViolations[0]}`);
  }
  if (cspFails.length) {
    record('6', 'CSP 부팅', 'FAIL', cspFails.slice(0, 3).join(' | '));
  } else {
    record('6', 'CSP 부팅', 'PASS', `${pageResults.length}페이지 CSP 유효(self/hash·object-src none·base-uri none), violation ${violationTotal}`);
  }

  // 가드A: 인라인 script 개수 리포트 (실패시키지 않음 — B단계 인라인0 정책 baseline)
  const inlineReport = pageResults
    .map((p) => `${p.name}=${p.inline?.execInline ?? '?'}`)
    .join(' ');
  const inlineTotal = pageResults.reduce((s, p) => s + (p.inline?.execInline || 0), 0);
  const dataTotal = pageResults.reduce((s, p) => s + (p.inline?.dataBlock || 0), 0);
  record('A', '인라인 script(리포트)', 'INFO',
    `실행 인라인 합 ${inlineTotal} (data블록 ${dataTotal} 별도) — ${inlineReport}`);

  // 가드B: 내부 링크 200(파일 존재)
  const { checked, missing } = verifyLinks(pageResults, origin, SERVE_BASE);
  if (missing.length) {
    record('B', '내부 링크 존재', 'FAIL', `${missing.length}/${checked} 누락 — ${missing.slice(0, 4).join(' | ')}`);
  } else {
    record('B', '내부 링크 존재', 'PASS', `${checked}개 동일오리진 링크 모두 _site 내 존재`);
  }

  // 가드C: 외부요청 0 (자기완결 — CDN·폰트·이미지 외부호스트 0). 시도 자체를 포착.
  const extAgg = pageResults.filter((p) => (p.externalRequests?.length || 0) > 0);
  if (extAgg.length) {
    const first = extAgg[0];
    record('C', '외부요청 0(자기완결)', 'FAIL',
      `${extAgg.length}개 페이지 외부요청 — 예: [${first.name}] ${first.externalRequests[0]}`);
  } else {
    record('C', '외부요청 0(자기완결)', 'PASS', `${pageResults.length}페이지 외부호스트 요청 0`);
  }

  // ── 가드 C2: **라이브가 받는 청크**에 wasm·외부호스트가 없다 ────────────
  //
  // `[C]` 는 "요청이 나갔는가" 를 본다. 그런데 번들 **안에** 들어간 것은 요청이 안 나가도
  // 사고를 낸다 — 인라인 wasm 은 CSP(`script-src 'self'`)에 막혀 **페이지를 죽이고**,
  // CDN 리터럴은 조건이 맞는 순간(예: WebXR 진입) 남의 서버를 부른다.
  //
  // ── 이 가드가 두 번 틀렸다. 그 경위가 이 주석의 요점이다 (2026-08-09) ────
  // three.js editor 반입에서 CSP 사고를 쫓았다. 처음엔 **이름 문자열**(`mikktspace`)로
  // 세서 놓쳤고, 그래서 **base64 매직(`AGFzbQ`)** 으로 바꿨다. 그것도 틀렸다 —
  // `meshopt_decoder` 는 wasm 을 base64 가 아닌 형태로 들고 있어서 **가드가 PASS 인 채로
  // 페이지가 계속 죽었다.** 유입 경로가 넷이었다(mikktspace·zstddec×2·meshopt).
  //
  // 그리고 **검수관이 다섯째를 잡았다** — 가드가 아니라 별도 클론 빌드로. `vite.config.js`
  // 의 `node_modules/three` 광역 매칭 때문에 editor 의 31개 포맷 로더가 라이브 공유 청크로
  // 흡수돼 **미술관 방문자가 gzip +174KB 를 더 받고 있었다.** 그때까지 `[C]`·`[C2]` 둘 다
  // 그 축을 안 봤다.
  //
  // 그래서 대상을 **"라이브 HTML 이 참조하는 청크"** 로 좁히고 축을 셋으로 늘렸다.
  // editor 청크는 editor 만 받으므로 이 판정에서 빠진다(behind-flag 도구다).
  //
  // 한계: 정적 스캔이다. 문자열을 조각내 조립하거나 런타임에 만들면 못 잡는다.
  // **크기 회귀는 아직 안 잰다**(기준값 관리가 필요하다 — 검수관 권고, 별건).
  const bundleDir = path.join(SITE_DIR, '_bundle');
  const liveChunks = new Set();
  const htmlFiles = [];
  for (const dir of [SITE_DIR, path.join(SITE_DIR, 'app')]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.html')) htmlFiles.push(path.join(dir, f));
  }
  for (const h of htmlFiles) {
    if (path.basename(h) === 'editor.html') continue;   // behind-flag 도구 — 라이브가 안 받는다
    for (const m of fs.readFileSync(h, 'utf8').matchAll(/_bundle\/([^"'\s>]+\.js)/g)) liveChunks.add(m[1]);
  }
  const findings = [];
  for (const f of liveChunks) {
    const full = path.join(bundleDir, f);
    if (!fs.existsSync(full)) continue;
    const txt = fs.readFileSync(full, 'utf8');
    if (txt.includes('AGFzbQ')) findings.push(`${f}: base64 wasm`);
    if (/WebAssembly\s*\.\s*(instantiate|compile)/.test(txt)) findings.push(`${f}: WebAssembly 호출`);
    for (const m of txt.matchAll(/https:\/\/(cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|esm\.sh)/g)) {
      findings.push(`${f}: CDN 리터럴 ${m[1]}`);
    }
  }
  const uniq = [...new Set(findings)];
  if (uniq.length) {
    record('C2', '라이브 청크 wasm·CDN 0', 'FAIL',
      `${uniq.length}건 — ${uniq.slice(0, 3).join(' | ')} · 라이브 진입점이 받는 청크다`);
  } else {
    record('C2', '라이브 청크 wasm·CDN 0', 'PASS', `라이브 청크 ${liveChunks.size}개에 wasm·CDN 리터럴 0`);
  }
}

// ── 검사9: 라이선스 고지 (법무 §6, 2026-07-31) ─────────────────────────────
//
// three·PeerJS 는 MIT 다. MIT 는 **저작권 고지 유지를 허락의 조건**으로 삼는다 —
// 조건을 어기면 허락 자체가 성립하지 않고, 그 순간 무단 복제가 된다. 웹앱 배포도
// 사본 배포이므로(번들 JS 가 이용자 기기로 전송된다) 조립본에 고지가 있어야 한다.
//
// 두 축을 본다:
//   ① 번들 안의 `@license` 주석 — `vite.config.js` 의 `esbuild.legalComments: 'eof'`
//      가 지키는 것. **기본값에 의존하던 때에도 살아 있었지만**(실측 2026-07-31),
//      기본값이 바뀌면 조용히 사라진다. 그래서 설정과 함께 검사를 둔다.
//   ② 사람이 읽는 고지 페이지 — `making/licenses/`. 미니파이된 JS 안의 주석은
//      기계는 읽어도 방문자는 못 읽는다. 감독 지시("홈피에 라이센스 고지")의 본체다.
//
// **못 잡는 것**: 고지의 정확성(항목 누락·오기)은 못 본다. 문자열 존재만 본다.
// `THIRD-PARTY-NOTICES.md` 에 안 적힌 새 의존성이 들어와도 이 검사는 PASS 다.
function checkLicenseNotice(siteDir) {
  const { readFileSync: rf, existsSync: ex, readdirSync: rd } = fs;
  const bundleDir = path.join(siteDir, '_bundle');
  const problems = [];

  // ① 번들 고지 — esbuild 를 거치는 청크
  if (!ex(bundleDir)) {
    problems.push('_bundle/ 없음 — 번들 고지를 못 쟀다');
  } else {
    const js = rd(bundleDir).filter((f) => f.endsWith('.js'));
    const all = js.map((f) => rf(path.join(bundleDir, f), 'utf8')).join('\n');
    for (const [label, needle] of [['three', 'Three.js Authors'], ['@license', '@license']]) {
      if (!all.includes(needle)) problems.push(`번들에 ${label} 고지 없음`);
    }
  }

  // ①-b PeerJS 는 **파일 안에서 재지 않는다.** 왜 그런지 실측을 남긴다.
  //
  // PeerJS 는 전역 IIFE(window.Peer)라 ES 모듈 번들 대상이 아니어서 `selfContained()`
  // 가 `app/vendor/peerjs.min.js` 로 정적 복사한다(`vite.config.js:91`). esbuild 를
  // 안 거치니 `legalComments` 와도 무관하다.
  //
  // 검수관 권고(2026-07-31)를 받아 이 파일에 라이선스 표기 검사를 붙였다가 **대조군에서
  // FAIL 이 났고, 실측하니 검사 쪽이 틀렸다**: 이 파일(92,865 bytes)에는 선두 배너 주석이
  // 아예 없고, `MIT` 의 첫 출현은 offset 65,612 — 번들에 인라인된 `package.json` 의
  // `"license":"MIT"` **필드**다. 그것은 저작권 고지가 아니라 메타데이터다(MIT 가 요구하는
  // 것은 저작권 고지 **및 허가 고지 전문**이다). "파일에 MIT 문자열이 있다" 는 참이지만
  // 거기서 "고지가 실려 있다" 는 결론은 나오지 않는다.
  //
  // PeerJS 의 고지 의무는 `THIRD-PARTY-NOTICES.md`(저작권자 Michelle Bu·Eric Zhang +
  // MIT 전문)가 충족하고, 그것을 아래 ② 의 고지 페이지가 싣는다. 그래서 재는 축을
  // 파일이 아니라 **고지 페이지**에 둔다 — ② 가 `PeerJS` 문자열을 이미 단언한다.

  // ② 고지 페이지
  const page = path.join(siteDir, 'making', 'licenses', 'index.html');
  if (!ex(page)) {
    problems.push('making/licenses/index.html 없음');
  } else {
    const html = rf(page, 'utf8');
    for (const needle of ['Three.js', 'PeerJS', 'MIT']) {
      if (!html.includes(needle)) problems.push(`고지 페이지에 "${needle}" 없음`);
    }
  }

  if (problems.length) record('9', '라이선스 고지', 'FAIL', problems.join(' | '));
  else record('9', '라이선스 고지', 'PASS', '번들 @license + making/licenses/ 고지 페이지 존재');
}

function printReport() {
  const icon = { PASS: 'PASS', FAIL: 'FAIL', INFO: 'INFO' };
  console.log('\n──────── 스모크 결과 (smoke-check 6항 + 가드A/B) ────────');
  for (const r of results) {
    console.log(`[${r.id}] ${icon[r.status].padEnd(4)}  ${r.label.padEnd(20)}  ${r.evidence}`);
  }
  const fails = results.filter((r) => r.status === 'FAIL');
  const passN = results.filter((r) => r.status === 'PASS').length;
  console.log('────────────────────────────────────────────────────────');
  if (fails.length) {
    console.log(`판정: FAIL (${fails.length}개 항목 실패) — 배포 중단. 실패 항목: ${fails.map((f) => f.id).join(', ')}`);
  } else {
    console.log(`스모크: 통과 (PASS ${passN}, FAIL 0). 최종 판정·보고는 독립 executor 가 skill 절차로 확정할 것.`);
  }
  return fails.length === 0;
}

/**
 * 7/8 — 성능 불변식 게이트. **world2(vite 전용)만 대상이다.**
 *
 * 감독 지시로 스모크에 묶었다: *"개발할때 성능 확보, 성능 유지하는게 모니터링하도록 해."*
 * world1 CSV 가 지킬 것을 확정해 줬다 — 파이프라인 60→227 단조증가가 프리즈의 직접
 * 원인이었고, world2 는 38 상수다. **그 상수성이 깨지는 순간을 여기서 잡는다.**
 *
 * 두 게이트가 보는 축이 다르다:
 *   7) 세션 시뮬(회전·주행·재방문) — 스트리밍과 시야가 만드는 증식
 *   8) 날씨 첫 등장             — 예열이 빠뜨린 레이어
 *
 * 게이트가 **예외로 죽으면 그것도 FAIL 이다.** 못 잰 것을 통과로 적지 않는다.
 * 로그는 전부 삼키고 판정만 리포트에 남긴다 — 스모크 출력이 수백 줄이 되면 아무도 안 읽는다.
 *
 * ── `SMOKE_PERF_GATES` — 러너 롤인용 관측 모드 (검수관 조건 3) ────────────────
 * `enforce`(기본) FAIL 이 스모크를 떨어뜨린다. 로컬·최종 게이트는 이 모드다.
 * `observe`       돌리되 판정을 INFO 로 적는다 — 종료코드에 영향 없음.
 * `off`           아예 안 돈다.
 *
 * **왜 observe 가 필요한가**: 이 둘은 성능 게이트라 러너 성능 편차에 거짓 FAIL 위험이
 * 있는데, **아직 러너에서 한 번도 안 돌려봤다.** 검수관 지적 — 1차부터 차단으로 걸면
 * 배포가 막힌 원인이 "코드 회귀"인지 "게이트 자체의 러너 부적합"인지 못 가른다.
 * 그 전까지 observe 는 **데이터를 모으는 장치이지 면제가 아니다.**
 *
 * ── 승격 조건 (SSOT — CLAUDE.md·ci.yml 주석은 이 문단을 가리킨다) ──────────
 * 10회 연속 관측에서 **셋 다** 성립해야 `enforce` 로 올린다:
 *   ① `[7]` base.geo/base.tex 분산 0        — 러너가 로컬과 같은 씬을 그린다(재현성)
 *   ② `[7]` 10회 전부 maxGeo<=0 && maxTex<=0 — **거짓 FAIL 위험이 없다(판정 안정성)**
 *   ③ `[8]` 10회 전부 lap1 == 0
 * ①만으로는 부족하다 — base 가 매번 똑같아도 delta 가 러너 부하에 따라 튀면 승격은
 * 여전히 위험하다. 처음에 ①만 적었던 것이 **재는 축을 잘못 고른 것**이었다(검수관 B2).
 * 회차 집계는 태스크 #126 에 적는다. Actions 로그는 만료되므로 거기 두면 안 된다.
 *
 * `continue-on-error` 를 쓰지 않는 이유: 그것은 job 전체를 삼켜 필수 게이트 실패까지
 * 가린다. 여기서는 [7][8] 두 항목만 정확히 관측으로 내린다.
 */
const PERF_GATE_MODES = ['enforce', 'observe', 'off'];
const PERF_GATES = (process.env.SMOKE_PERF_GATES || 'enforce').toLowerCase();
if (!PERF_GATE_MODES.includes(PERF_GATES)) {
  // 오타를 조용히 기본값으로 흡수하면 "관측인 줄 알았는데 차단"(또는 그 반대)이 된다.
  console.error(`SMOKE_PERF_GATES 값이 잘못됐다: ${JSON.stringify(process.env.SMOKE_PERF_GATES)} — ${PERF_GATE_MODES.join('|')} 중 하나여야 한다.`);
  process.exit(2);
}

/**
 * observe 는 **성능 판정만** INFO 로 내린다. 하드 실패는 어느 모드에서나 FAIL 이다.
 *
 * ── 왜 가르는가 (검수관 B1) ───────────────────────────────────────────────
 * 두 측정 모듈의 `pass` 는 성능 지표만이 아니다 — `errors.length === 0` 도 곱해져 있다
 * (`measure-invariants.mjs` `pass = maxGeo<=0 && maxTex<=0 && errors.length===0`,
 *  `measure-sky-warm.mjs` `if (errors.length) pass = false`). 그 `errors` 는
 * `console.error` + `pageerror` 다.
 *
 * 그래서 `pass` 하나로 status 를 정하면 **world2 조작 중에만 나는 런타임 에러가 CI 에서
 * INFO 로 내려간다.** observe 의 정당화는 "러너 성능 편차의 거짓 FAIL" 이었는데
 * 페이지 에러는 편차가 아니다. 예외를 observe 에서도 FAIL 로 남긴 논리 — "값이 나빴다"와
 * "아예 못 쟀다"는 다른 일 — 가 `errors[]` 에 적용되지 않은 채였다.
 *
 * 이 구멍이 실질적인 이유: 검사 `[4]` 콘솔 에러 0 은 **로드 시점**만 본다. 회전·주행·
 * 복귀와 날씨 12조합 순회 중에만 나는 에러를 보는 유일한 축이 `[7][7.6][8]` 이다. 그것을
 * 종료코드 밖에 두면 기능적으로 `continue-on-error: true` 와 같아진다.
 *
 * ── `hard` — 성능이 아닌 실패를 함께 받는다 (검수관 반려 B1, 2026-08-08) ──────
 * `errors[]` 와 같은 성격의 축이 하나 더 생겼다: **G-COL1 커버리지**(세션이 실제로 파셀을
 * 건넜는가). 안 움직인 세션은 개수가 늘 리가 없으니 `[7]` 은 초록을 내는데, 그 초록은
 * 판정이 아니라 착시다. 러너 성능 편차와 무관하므로 observe 에서도 FAIL 이어야 한다 —
 * 위 `errors[]` 문단의 논리를 그대로 적용한 것이다.
 */
const perfStatus = (pass, errors, hard = false) => {
  if (pass) return 'PASS';
  if (errors?.length || hard) return 'FAIL';   // 하드 실패 — 관측 대상이 아니다
  return PERF_GATES === 'observe' ? 'INFO' : 'FAIL';
};
const perfLabel = (s) => (PERF_GATES === 'observe' ? `${s}(관측)` : s);

async function runPerfGates(origin, browser) {
  const quiet = () => {};
  try {
    const { runInvariants } = await import('./measure-invariants.mjs');
    const r = await runInvariants({ browser, origin, basePath: BASE_PATH, log: quiet });
    // base 는 **두 분기 모두** 찍는다. 승격 판정("10회 연속 base 분산 0")의 근거가
    // 바로 값이 흔들린 회차인데, PASS 에만 적으면 그 회차에서 base 를 읽을 수 없다
    // (검수관 B2). 관측 모드에서 기록이 판정의 전부라는 점을 잊으면 안 된다.
    const base = `base geo ${r.base?.geo} tex ${r.base?.tex} pipe ${r.base?.pipe}`;
    // 부팅 기준선의 **회차 추이**를 별도 줄로 싣는다(팀장 조건 3). `[7]` 판정은 base
    // 대비 델타만 보므로 **부팅 시 증가를 못 잡는다** — 그 사각을 메우려고 만든
    // 관측인데, `runInvariants` 에 넘기는 `log` 가 `quiet` 라 화면에 안 나왔다.
    // 파일에만 남으면 사람이 못 읽고, 그때부터 장식이다.
    if (r.baselineNote) record(7.5, '기준선 추이(관측)', 'INFO', r.baselineNote);
    // 커버리지(G-COL1)는 **성능이 아니라 세션 유효성**이므로 `hard` 로 넘긴다.
    const covNote = `파셀 ${r.cov?.unique}개·재방문 ${r.cov?.revisits}`;
    record(
      7, perfLabel('개수 불변식(세션)'), perfStatus(r.pass, r.errors, !r.covOk),
      r.pass
        ? `회전12·주행·복귀 내내 상수(${base} · ${covNote})`
        : (r.covOk
          ? `증식 — geo +${r.maxGeo} tex +${r.maxTex} pipe +${r.maxPipe} · ${base}`
          : `세션이 안 돌아다녔다(${covNote}) — 개수 판정이 성립하지 않는다. 경로 ${r.cov?.path?.join(' → ')}`)
        + (r.errors.length ? ` · 콘솔 에러 ${r.errors.length}건(하드 실패 — 관측 대상 아님)` : '')
        + ' → `npm run measure:invariants` 로 구간별 표를 본다',
    );
  } catch (e) {
    // **예외는 observe 에서도 FAIL 이다.** "값이 나빴다"(성능 편차 — 관측 대상)와
    // "아예 못 쟀다"(브라우저 조달 실패·스크립트 오류)는 다른 일이다. 후자는 단계 2가
    // 확인하려는 바로 그것이므로 빨간불이어야 한다. 못 잰 것은 통과가 아니다.
    record(7, perfLabel('개수 불변식(세션)'), 'FAIL', `측정 실패: ${(e.message || String(e)).slice(0, 140)}`);
  }
  // ── [7b] 드로우콜 대조군 — **draw 축을 실제로 지키는 유일한 자리** (태스크 #208) ──
  //
  // `[7]` 은 draw 를 표에 찍기만 하고 판정하지 않는다. 못 해서가 아니라 **하면 안 되기
  // 때문**이다 — 기본 세션에는 NPC 가 있고, 카메라를 돌리는 것만으로 절두체 컬링이
  // 달라져 드로우콜은 정의상 상수가 아니다(실측: 기본 세션 최대 +179).
  //
  // 그래서 감독 리포트에 `draw - 측정 안 됨(표본 0)` 이 두 번 찍혔고(#176), 그동안
  // **draw 만 늘어나는 회귀는 어느 축도 못 잡았다.** 다른 셋이 상수라 위험이 낮아
  // 보였을 뿐이고, 그것은 "안 나온다" 가 아니라 "안 본다" 였다.
  //
  // ── 왜 이제 판정할 수 있나 (실측 2026-08-07) ──────────────────────────────
  // 사람·GLB 를 끈 세계에서 draw 가 상수인지 **재보고 나서** 게이트로 올렸다:
  //
  //     대조군 3회 — 전 구간(회전12·전진6·복귀6·정지) draw 고정, 최대 증가 +0
  //                  회차 간 기준선 편차 0
  //     기본 세션   — 최대 증가 +179 (회전 중 187~241, 전진 중 18)
  //
  // 기본 세션이 전진 중 대조군과 같은 값으로 떨어지는 것이 교차 확인이다 — 그 값이
  // **세계 파츠 자체의 드로우콜**이고, 나머지는 전부 사람·GLB 의 컬링 변동이다.
  //
  // 골든값을 여기 적지 않는다. 판정은 `maxDraw <= 0`(기준선 대비 상대)이라 절대값이
  // 필요 없고, 적는 순간 값 미러링이 된다.
  //
  // ── 검출력 확인 — **뮤테이션으로 실증**했다 (2026-08-07) ────────────────────
  // "통과한다" 는 게이트라는 증거가 아니다. 실제로 결함을 심어 FAIL 하는지 봤다.
  //
  //   M3  대조군 쿼리에서 `&npc=0&vrm=0` 을 뺀다(사람이 남는다)
  //       → **FAIL · draw +143.** 회전 중 62~156 으로 흔들린다.
  //       이 한 건이 두 가지를 동시에 실증한다 — draw 판정이 **실제로 작동한다**는 것과,
  //       대조군 쿼리가 **장식이 아니라 필요조건**이라는 것.
  //
  //   M4  **배칭을 실제로 깬다** — 기준선 캡처 뒤 `InstancedMesh` 의 인스턴스 5개를
  //       같은 지오메트리·재질의 개별 `Mesh` 로 씬에 옮긴다(검수관 블로커 B3).
  //       → **FAIL · draw 18 → 19~23 · geo +0 · tex +0.**
  //       **이 축이 이 게이트를 만든 원래 이유다** — world1 을 무너뜨린 파이프라인 증식이
  //       정확히 이 계열이다. M3 은 "대조군 조건이 깨진 경우" 만 봤고, FAIL 메시지가
  //       주장하는 두 원인 중 **배칭 붕괴 쪽은 실증이 없었다**(검수관 지적).
  //       geo·tex 가 0 인 채 draw 만 오른 것이 **draw 축 단독 검출력**의 증거다.
  //       단 실증된 것은 **인스턴싱 해제 한 갈래뿐이다** — FAIL 메시지가 함께 열거하는
  //       **재질 분화는 별도 뮤테이션으로 확인하지 않았다**(검수관 R5). 판정 로직이
  //       원인이 아니라 **증상 패턴**(geo·tex 상수 · draw 만 증가)을 보므로 검출력
  //       주장 자체는 성립하지만, "두 원인을 다 실증했다"로 읽히면 안 된다.
  //
  // ── 이 게이트가 **못 잡는 것** (같은 뮤테이션이 드러냈다) ────────────────────
  //   M1  카메라의 자식으로 메시 5개를 붙인다(항상 그려지는 자리)
  //       → **PASS.** draw 가 18 → 23 으로 **정확히 +5 올랐는데도** 통과했다.
  //
  // 안 그려진 것이 아니다. **부팅 시점 증가는 기준선에 흡수된다** — 판정이
  // `maxDraw = r.draw - base.draw` 라서, 기준선 자체가 23 으로 잡히고 이후 23 이 유지되면
  // 증가는 0 이다. 이 게이트가 보는 것은 **세션 중 증식**이지 총량이 아니다.
  //
  // `[7]` 이 geo·tex 에 대해 갖는 한계와 **글자 그대로 같은 형태**이고, 그래서 그쪽에는
  // `[7.5] 기준선 추이` 관측이 붙어 있다. draw 에는 아직 그 짝이 없다 — 부팅 시 draw 가
  // 늘어나는 회귀는 지금도 아무 축이 안 본다. **알고 남기는 구멍이지 해결된 문제가 아니다.**
  //
  // ⚠ **이 세션이 `[7]` 을 대체하지 않는다.** `world2-ready.mjs` 가 정확히 그 사고를
  // 기록하고 있다 — 게이트 넷이 `npc=0&vrm=0` 을 켜 둔 채 "개수가 상수다" 를 선언했고
  // 그것은 라이브에 없는 조건의 세계였다. 라이브 상태 판정은 `[7]` 이 그대로 한다.
  try {
    const { runInvariants, DRAW_CONTROL_QUERY } = await import('./measure-invariants.mjs');
    const r = await runInvariants({
      browser, origin, basePath: BASE_PATH, log: quiet,
      query: DRAW_CONTROL_QUERY, judgeDraw: true,
    });
    record(
      7.6, perfLabel('드로우콜 대조군'), perfStatus(r.pass, r.errors, !r.covOk),
      r.pass
        ? `사람·GLB 없는 세계에서 draw 상수 (기준선 ${r.base?.draw} · 파셀 ${r.cov?.unique}개·재방문 ${r.cov?.revisits})`
        : (!r.covOk
          ? `세션이 안 돌아다녔다(파셀 ${r.cov?.unique}개·재방문 ${r.cov?.revisits}) — draw 판정이 성립하지 않는다`
          : `draw +${r.maxDraw} · geo +${r.maxGeo} tex +${r.maxTex} — 배칭이 깨졌거나 숨은 것이 보이게 됐다`)
        + (r.errors.length ? ` · 콘솔 에러 ${r.errors.length}건` : '')
        + ' → `node scripts/smoke/measure-invariants.mjs --control` 로 구간별 표를 본다',
    );
  } catch (e) {
    record(7.6, perfLabel('드로우콜 대조군'), 'FAIL', `측정 실패: ${(e.message || String(e)).slice(0, 140)}`);
  }
  try {
    const { runSkyWarm } = await import('./measure-sky-warm.mjs');
    // 1바퀴면 판정이 된다(증가 0 이 통과 조건). 2바퀴는 FAIL 일 때 원인을 가르는 용도라
    // 단독 실행에 맡긴다 — 스모크에서 3분을 더 쓰지 않는다.
    const r = await runSkyWarm({ browser, origin, basePath: BASE_PATH, laps: 1, log: quiet });
    record(
      8, perfLabel('하늘 예열(첫 등장)'), perfStatus(r.pass, r.errors),
      r.pass
        ? `시간대×날씨 12조합 + fx·번개 순회에 증가 0 (lap1 ${r.lap1})`
        : `첫 등장 비용 잔존 — geo/tex 합 +${r.lap1}`
        + (r.errors.length ? ` · 콘솔 에러 ${r.errors.length}건(하드 실패 — 관측 대상 아님)` : '')
        + ' → `npm run measure:sky-warm` 으로 2바퀴 돌려 원인을 가른다',
    );
  } catch (e) {
    record(8, perfLabel('하늘 예열(첫 등장)'), 'FAIL', `측정 실패: ${(e.message || String(e)).slice(0, 140)}`);
  }

  // ── [11] 물빠짐 상호작용 (검수관 게이트 명세 2026-07-31) ────────────────────
  //
  // **성능 게이트가 아니다 — `perfStatus`/`perfLabel` 을 쓰지 않고 언제나 판정한다.**
  // `[7][8]` 이 observe 로 내려가는 근거는 "러너 성능 편차의 거짓 FAIL" 인데, 이 검사는
  // 성능 수치를 재지 않는다. 물에 들어갔는가·오버레이가 칠해졌는가·걸어 나올 수 있는가는
  // 전부 이산 판정이라 편차가 없다.
  //
  // 왜 신설했나: `[7]` 이 PASS 였지만 **뭍에서만 걸은 결과**였다. 실측으로 강까지 37m
  // 모자랐고, 스모크 원문 어디에도 "물빠짐 미실행" 이라는 단서가 없었다. 판정과 집행이
  // 연결돼 있다는 것(단위 테스트가 본다)과 **브라우저에서 한 번이라도 돌았다**는 것은
  // 다른 명제다.
  //
  // 이 검사는 **강 좌표를 모른다** — `stats().player.submersion` 이 0 을 넘을 때까지만
  // 걷는다. 거리를 적으면 그 값이 곧 값 미러링이고, 강이 옮겨지는 순간 이 게이트가
  // PASS 인 채로 아무것도 안 재게 된다(`[7]` 이 정확히 그 상태였다).
  try {
    const { runSubmerge } = await import('./measure-submerge.mjs');
    const r = await runSubmerge({ browser, origin, basePath: BASE_PATH, log: quiet });
    record(
      11, '물빠짐 상호작용', r.pass ? 'PASS' : 'FAIL',
      r.pass
        ? `진입 ${r.ticksToWater}틱 · 최대 잠김 ${r.peak} · overlay "${r.overlayAtPeak}"`
          + ` · hud/map ${r.hud}/${r.map} · 복귀 ${r.backOut}`
        : `${r.reason} → \`npm run measure:submerge\` 로 단독 실행해 본다`,
    );
  } catch (e) {
    // 못 잰 것은 통과가 아니다 — `[7][8]` 과 같은 규약.
    record(11, '물빠짐 상호작용', 'FAIL', `측정 실패: ${(e.message || String(e)).slice(0, 140)}`);
  }

  // ── [12] 수면 구현 (감독 지시 2026-08-01 · 팀장 조건 3) ─────────────────────
  //
  // `[11]` 과 같은 성격이다 — **성능 게이트가 아니라 이산 판정**이라 `perfStatus` 를
  // 안 쓰고 언제나 판정한다.
  //
  // 왜 신설했나: TSL 노드 물을 붙인 첫 판본이 헤드리스에서 **부팅째로 죽었다**(노드
  // 재질은 레거시 `WebGLRenderer` 가 컴파일하지 못한다). 단위 테스트는 전부 초록이었다 —
  // 판정(`pickWaterMode`)은 순수 함수라 잘 돌았고, **집행**(그 판정을 `ocean.create` 가
  // 실제로 쓰는가)을 보는 축이 없었기 때문이다.
  //
  // 기대는 백엔드에서 유도한다(하드코딩 금지). GPU 러너가 붙는 날 검사 대상이 저절로
  // `tsl` 가지로 넘어가야 하고, 그때 이 게이트를 손볼 일이 없어야 한다.
  try {
    const { runWaterMode } = await import('./measure-water-mode.mjs');
    const r = await runWaterMode({ browser, origin, basePath: BASE_PATH, log: quiet });
    record(
      12, '수면 구현(?water=tsl)', r.pass ? 'PASS' : 'FAIL',
      r.pass
        ? `backend=${r.backend} · active=${r.water?.active} · denied=${r.water?.denied}`
          + (r.backend === 'WebGPU' ? ' (TSL 물이 실제로 컴파일됐다)' : ' (폴백 가지 — TSL 물 자체는 안 돌았다)')
        : `${r.reason} → \`npm run measure:water-mode\` 로 단독 실행해 본다`,
    );
  } catch (e) {
    record(12, '수면 구현(?water=tsl)', 'FAIL', `측정 실패: ${(e.message || String(e)).slice(0, 140)}`);
  }

  // ── [13] 플레이어 충돌 라이브 (G-COL2 — 검수관 반려 B2, 2026-08-08) ──────────
  //
  // `[11][12]` 와 같은 성격이다 — **성능이 아니라 이산 판정**이라 `perfStatus` 를 안 쓰고
  // 언제나 판정한다.
  //
  // 왜 신설했나: 단위 테스트 24건이 판정·조회·집행·배선 네 층을 보는데, **라이브에서
  // 실제로 막히는지 본 축이 0 이었다.** 배선 검사(§4)는 `main.ts` 소스에 `resolveMove:`
  // 라는 글자가 있는지만 보므로 값이 `undefined` 로 계산되는 회귀를 통과시킨다.
  //
  // 판정은 **대조군 비율**이다(`&collide=0` 대비). 좌표·거리를 적지 않는다 — 근거와
  // 한계는 `measure-collide.mjs` 헤더 한 곳이다.
  try {
    const { runCollide } = await import('./measure-collide.mjs');
    const r = await runCollide({ browser, origin, basePath: BASE_PATH, log: quiet });
    // **판정 근거를 둘 다 싣는다.** 자동 우회가 붙은 뒤로 충돌은 "막는 것" 보다
    // "비껴가게 하는 것" 으로 나타나고, 그때 거리비는 임계를 못 넘는다(실측 0.92).
    // 어느 축이 통과시켰는지 리포트가 말하지 않으면, 다음 사람이 거리비만 보고
    // "임계에 아슬아슬하다" 로 오독한다 — **판정과 다른 그림을 주는 리포트**다.
    record(
      13, '플레이어 충돌(라이브)', r.pass ? 'PASS' : 'FAIL',
      r.pass
        ? `ON ${r.onDist?.toFixed(1)}m / OFF ${r.offDist?.toFixed(1)}m`
          + ` = 거리비 ${r.ratio?.toFixed(2)} · 종점 이탈 ${r.drift?.toFixed(1)}m — 충돌이 궤적을 바꿨다`
        : `${r.reason} → \`npm run measure:collide\` 로 단독 실행해 본다`,
    );
  } catch (e) {
    record(13, '플레이어 충돌(라이브)', 'FAIL', `측정 실패: ${(e.message || String(e)).slice(0, 140)}`);
  }

  await recordRenderBackend(browser, origin);
}

// ── [10] 렌더 백엔드 — **판정이 아니라 기록이다** (감독 지시 2026-07-31) ──────
//
// 감독 지적: *"헤드리스가 WebGL/SwiftShader 로 폴백한 것을 'WebGPU 시각 검증 완료' 로
// 기록하지 마라. backend 가 WebGL 이면 WebGPU 테스트는 FAIL 이 아니라 **미측정**으로
// 분리해 보고하라."*
//
// **왜 FAIL 이 아닌가** — 이 컨테이너에 GPU 가 없는 것은 코드 결함이 아니다. FAIL 로 두면
// 개발자가 매번 빨간불을 무시하게 되고, 그러면 진짜 회귀가 났을 때도 무시한다. 반대로
// 조용히 넘기면 "무엇으로 그렸는지 모르는 채" 통과가 쌓인다. 그래서 **INFO 로 남기되
// 라벨에 미측정을 명시**한다.
//
// **이 검사가 막는 것**: 리포트를 읽는 사람이 헤드리스 결과를 실기기 결과로 오해하는 것.
// **못 막는 것**: 아무것도 막지 않는다 — 종료코드에 영향이 없다. 실제 WebGPU 시각 검증은
// GPU self-hosted runner 소관이다(태스크 #170 B단계).
async function recordRenderBackend(browser, origin) {
  const LABEL = '렌더 백엔드';
  let page;
  try {
    page = await browser.newPage();
    await page.goto(`${origin}/app/world2.html`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    await page.waitForFunction(() => !!window.__world2, { timeout: 60000 });
    // 렌더러가 실제로 프레임을 돌린 뒤에 읽는다 — 초기화 직후 값은 아직 확정 전일 수 있다
    await page.waitForTimeout(2500);
    const s = await page.evaluate(() => {
      const st = window.__world2.stats();
      return { detail: st.backendDetail, backend: st.backend, ev: st.backendEvidence };
    });

    // 값이 없으면 **모른다고 적는다.** 옛 판본을 재고 있을 수도 있으니 통과로 갈음하지 않는다.
    if (!s.detail) {
      record('10', LABEL, 'INFO', `측정실패 — stats() 에 backendDetail 없음(backend=${s.backend ?? '?'})`);
      return;
    }

    // ── 두 질문을 분리한다 (검수관 블로커 2026-07-31) ────────────────────────
    // 처음엔 `detail.startsWith('webgpu-')` 하나로 문구를 갈랐다. 그러면
    // **WebGPU 경로를 탔는데 hw/sw 를 못 가른 경우**(`backend==='WebGPU'` 인데
    // `detail==='unknown'`)에 "이 환경은 WebGPU 경로를 안 탄다" 를 찍는다 — 거짓이고,
    // 뒤에 붙는 근거("하드웨어/소프트웨어를 가를 근거 없음")와 한 줄 안에서 모순이 난다.
    //
    // **이 커밋이 막으려던 사고의 거울상이다.** 폴백을 WebGPU 로 오해하는 것을 막으려다
    // 반대 방향 오해를 새로 만들었다. 두 질문은 서로 다른 값이 답한다:
    //   · 경로를 탔는가        → `backend`(프로브가 실제로 고른 것)
    //   · hw/sw 를 가렸는가    → `detail`(근거가 충분했는가)
    const tookWebGPU = s.backend === 'WebGPU';
    const resolved = s.detail !== 'unknown';
    const gl = s.ev?.glRenderer ? ` · GL="${String(s.ev.glRenderer).slice(0, 70)}"` : '';
    const why = s.ev?.note ? ` · ${s.ev.note}` : '';

    let verdict;
    if (tookWebGPU && resolved) verdict = s.detail;                       // 탔고 가렸다
    else if (tookWebGPU) verdict = `${s.detail} — WebGPU 경로는 탔으나 **하드웨어/소프트웨어 미확정**`;
    else if (resolved) verdict = `${s.detail} — **WebGPU 미측정**(이 환경은 WebGPU 경로를 안 탄다. 실기기 판정 아님)`;
    else verdict = `${s.detail} — **측정 미확정**(WebGPU 경로도 안 탔고 GL 근거도 못 읽었다)`;

    record('10', LABEL, 'INFO', `${verdict}${gl}${why}`);
  } catch (e) {
    record('10', LABEL, 'INFO', `측정실패 — ${(e.message || String(e)).slice(0, 120)}`);
  } finally {
    await page?.close().catch(() => {});
  }
}

async function main() {
  const modeLabel = IS_VITE ? 'vite 조립(교체 deploy) + 동등성' : 'frontend직조립(baseline, 현행 deploy)';
  console.log(`스모크 하네스 시작 — [${MODE}] ${modeLabel} + 헤드리스 6항 검증`);

  // -1) 워킹트리 기준점 — 무엇을 재는지 먼저 기록한다
  const worktreeBaseline = recordWorktreeBaseline();

  // 0) 참조 무결성(no-undef 스코프 — 정적 사각 방어)
  checkReferences();

  // 1) 생성기
  checkGenerators();

  // 조립 (deploy.yml 재현). 실패하면 이후 검사 불가 → 즉시 종료.
  try {
    ASSEMBLERS[MODE](SITE_DIR);
  } catch (e) {
    record('*', '_site 조립', 'FAIL', `조립 실패(${MODE}) — ${(e.stderr?.toString() || e.message || '').slice(0, 200)}`);
    printReport();
    process.exit(1);
  }

  // 2) 파일수  3) 핵심 파일
  checkManifestCount();
  checkRequiredFiles();

  // 4/5/6/A/B/C — 서버 + 헤드리스. vite 모드는 BASE_PATH 서브패스에 마운트.
  const srv = await startServer(SITE_DIR, SERVE_BASE);
  let browser;
  let ok;
  try {
    browser = await launchBrowser();
    const pageResults = [];
    // viteOnly 페이지는 vite 번들 전용이라 baseline(raw 직서빙)에서는 부팅되지 않는다.
    for (const spec of LIVE_PAGES.filter((s) => !s.viteOnly || IS_VITE)) {
      try {
        pageResults.push(await collectPage(browser, srv.origin, spec, URL_PREFIX));
      } catch (e) {
        // 로드 자체 실패는 pageerror 로 간주(검사4 FAIL 유발) + CSP 데이터 없음(검사6 FAIL).
        pageResults.push({
          name: spec.name,
          url: spec.url,
          consoleErrors: [],
          pageErrors: [`로드 실패: ${(e.message || String(e)).slice(0, 120)}`],
          cspMeta: null,
          cspViolations: [],
          inline: { execInline: 0, dataBlock: 0, importmap: 0 },
          links: [],
          overflow: [],
          externalRequests: [],
        });
      }
    }
    aggregateBrowser(pageResults, srv.origin);
    // 7/8 — 성능 불변식. **같은 서버·같은 브라우저를 재사용한다**(감독 지시로 스모크에
    // 묶었다). 각자 vite 빌드를 다시 하면 스모크가 3배로 길어지고, 그 시간이 곧
    // "게이트를 안 돌리는 이유"가 된다.
    if (IS_VITE && PERF_GATES !== 'off') {
      await runPerfGates(srv.origin, browser);
    } else if (IS_VITE) {
      // `off` 가 리포트에 흔적을 안 남기면 "스모크: 통과" 만 보고 성능 게이트가 돈 줄
      // 안다. **못 잰 것이 침묵으로 통과가 되는** 이 저장소의 상시 위험 형태다(검수관 R6).
      record(7, '개수 불변식(세션)', 'INFO', '실행 안 함 — SMOKE_PERF_GATES=off');
      record(7.6, '드로우콜 대조군', 'INFO', '실행 안 함 — SMOKE_PERF_GATES=off');
      record(8, '하늘 예열(첫 등장)', 'INFO', '실행 안 함 — SMOKE_PERF_GATES=off');
      // `[11]` 도 같이 적는다(검수관 비블로커 2026-07-31). 이 검사는 성능 게이트가
      // 아니지만 `runPerfGates()` 안에 배선돼 있어 `off` 면 함께 안 돈다. 흔적을 안
      // 남기면 **리포트에서 통째로 사라져** "스모크: 통과" 만 보인다 — 바로 위 두 줄이
      // 막으려던 그 형태를 `[11]` 에서 새로 만든 셈이었다.
      record(11, '물빠짐 상호작용', 'INFO', '실행 안 함 — SMOKE_PERF_GATES=off');
      record(12, '수면 구현(?water=tsl)', 'INFO', '실행 안 함 — SMOKE_PERF_GATES=off');
      record(13, '플레이어 충돌(라이브)', 'INFO', '실행 안 함 — SMOKE_PERF_GATES=off');
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    await srv.close().catch(() => {});
  }

  // 라이선스 고지 — 조립된 `_site` 를 본다(브라우저 불필요, 파일 검사).
  // vite 모드에서만 유효하다: baseline 은 `_bundle/` 을 안 만들고 `making/` 도
  // 조립 구성이 달라 판정 대상이 아니다. **판정 못 하는 것을 판정한 척하지 않는다.**
  if (IS_VITE) checkLicenseNotice(SITE_DIR);
  else record('9', '라이선스 고지', 'INFO', 'baseline 조립은 번들이 없어 판정 대상 아님(대조군 전용)');

  // 측정이 끝난 뒤에 확인한다 — 도는 동안 대상이 바뀌었으면 위 결과는 전부 무효다.
  checkWorktreeUnchanged(worktreeBaseline);

  ok = printReport();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('하네스 예외:', e);
  process.exit(1);
});
