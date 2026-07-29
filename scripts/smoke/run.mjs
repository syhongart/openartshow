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
    devlog: countFiles(path.join(ROOT, 'devlog')),
    team: countFiles(path.join(ROOT, 'team')),
    valuation: countFiles(path.join(ROOT, 'valuation')),
  };
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
  const overflows = [];
  for (const p of pageResults) {
    for (const o of p.overflow || []) {
      if (o.overflow) overflows.push(`[${p.name}] ${o.vw}px: ${o.scrollWidth}>${o.innerWidth}`);
    }
  }
  const totalCells = pageResults.length * VIEWPORTS.length;
  if (overflows.length) {
    record('5', '가로 넘침 0', 'FAIL', `${overflows.length}건 넘침 — ${overflows.slice(0, 3).join(' | ')}`);
  } else {
    record('5', '가로 넘침 0', 'PASS', `${totalCells}조합(${pageResults.length}페이지×${VIEWPORTS.length}뷰포트) 넘침 0`);
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
 * 복귀와 날씨 12조합 순회 중에만 나는 에러를 보는 유일한 축이 `[7][8]` 이다. 그것을
 * 종료코드 밖에 두면 기능적으로 `continue-on-error: true` 와 같아진다.
 */
const perfStatus = (pass, errors) => {
  if (pass) return 'PASS';
  if (errors?.length) return 'FAIL';           // 하드 실패 — 관측 대상이 아니다
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
    record(
      7, perfLabel('개수 불변식(세션)'), perfStatus(r.pass, r.errors),
      r.pass
        ? `회전12·주행6·복귀6 내내 상수(${base})`
        : `증식 — geo +${r.maxGeo} tex +${r.maxTex} pipe +${r.maxPipe} · ${base}`
        + (r.errors.length ? ` · 콘솔 에러 ${r.errors.length}건(하드 실패 — 관측 대상 아님)` : '')
        + ' → `npm run measure:invariants` 로 구간별 표를 본다',
    );
  } catch (e) {
    // **예외는 observe 에서도 FAIL 이다.** "값이 나빴다"(성능 편차 — 관측 대상)와
    // "아예 못 쟀다"(브라우저 조달 실패·스크립트 오류)는 다른 일이다. 후자는 단계 2가
    // 확인하려는 바로 그것이므로 빨간불이어야 한다. 못 잰 것은 통과가 아니다.
    record(7, perfLabel('개수 불변식(세션)'), 'FAIL', `측정 실패: ${(e.message || String(e)).slice(0, 140)}`);
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
      record(8, '하늘 예열(첫 등장)', 'INFO', '실행 안 함 — SMOKE_PERF_GATES=off');
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    await srv.close().catch(() => {});
  }

  // 측정이 끝난 뒤에 확인한다 — 도는 동안 대상이 바뀌었으면 위 결과는 전부 무효다.
  checkWorktreeUnchanged(worktreeBaseline);

  ok = printReport();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('하네스 예외:', e);
  process.exit(1);
});
