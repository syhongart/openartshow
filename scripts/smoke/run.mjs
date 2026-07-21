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
  GENERATORS,
  BASELINE_FILE_COUNT,
  DROP_THRESHOLD,
  REQUIRED_FILES,
  LIVE_PAGES,
  VIEWPORTS,
} from './config.mjs';
import { assembleSite, countFiles } from './assemble.mjs';
import { startServer } from './server.mjs';
import { launchBrowser, collectPage } from './browser-checks.mjs';

const results = []; // { id, label, status: 'PASS'|'FAIL'|'INFO', evidence }
const record = (id, label, status, evidence) => results.push({ id, label, status, evidence });

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

// ── 검사2: 매니페스트 파일수 (급감 감지) ─────────────────────────────
function checkManifestCount() {
  const n = countFiles(SITE_DIR);
  if (BASELINE_FILE_COUNT == null) {
    record('2', '매니페스트 파일수', 'INFO', `현재 ${n} — baseline 미설정(현재값을 config 에 기록 권장)`);
    return;
  }
  const delta = n - BASELINE_FILE_COUNT;
  if (n < BASELINE_FILE_COUNT - DROP_THRESHOLD) {
    record('2', '매니페스트 파일수', 'FAIL', `${n} (baseline ${BASELINE_FILE_COUNT}, Δ${delta}) — 급감(파일 누락 의심)`);
  } else {
    record('2', '매니페스트 파일수', 'PASS', `${n} (baseline ${BASELINE_FILE_COUNT}, Δ${delta >= 0 ? '+' : ''}${delta})`);
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
function verifyLinks(pageResults, origin) {
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
  // 검사4: 콘솔 에러 0
  const errAgg = pageResults.map((p) => ({
    name: p.name,
    n: (p.consoleErrors?.length || 0) + (p.pageErrors?.length || 0),
    sample: [...(p.consoleErrors || []), ...(p.pageErrors || [])][0],
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
  const { checked, missing } = verifyLinks(pageResults, origin);
  if (missing.length) {
    record('B', '내부 링크 존재', 'FAIL', `${missing.length}/${checked} 누락 — ${missing.slice(0, 4).join(' | ')}`);
  } else {
    record('B', '내부 링크 존재', 'PASS', `${checked}개 동일오리진 링크 모두 _site 내 존재`);
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

async function main() {
  console.log('스모크 하네스 시작 — deploy.yml 조립 재현 + 헤드리스 6항 검증');

  // 1) 생성기
  checkGenerators();

  // 조립 (deploy.yml 재현). 실패하면 이후 검사 불가 → 즉시 종료.
  try {
    assembleSite();
  } catch (e) {
    record('*', '_site 조립', 'FAIL', `조립 실패 — ${(e.stderr?.toString() || e.message || '').slice(0, 200)}`);
    printReport();
    process.exit(1);
  }

  // 2) 파일수  3) 핵심 파일
  checkManifestCount();
  checkRequiredFiles();

  // 4/5/6/A/B — 서버 + 헤드리스
  const srv = await startServer(SITE_DIR);
  let browser;
  try {
    browser = await launchBrowser();
    const pageResults = [];
    for (const spec of LIVE_PAGES) {
      try {
        pageResults.push(await collectPage(browser, srv.origin, spec));
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
        });
      }
    }
    aggregateBrowser(pageResults, srv.origin);
  } finally {
    if (browser) await browser.close().catch(() => {});
    await srv.close().catch(() => {});
  }

  const ok = printReport();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('하네스 예외:', e);
  process.exit(1);
});
