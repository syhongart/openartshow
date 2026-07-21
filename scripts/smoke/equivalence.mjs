// scripts/smoke/equivalence.mjs  —  B-2b-2 동등성 판정
//
// "현행 라이브 배포(origin/main web직조립) vs vite조립(교체 deploy)" 이 같은 배포를
// 낸다는 증명. 즉 "deploy 를 vite 로 교체해도 라이브 배포 URL·내용이 안 바뀐다".
// 배포 URL 관점의 회귀(공개 페이지가 사라지거나 위치가 바뀜)를 잡는다.
//
// ⚠️ 대조 baseline 은 이 브랜치 web/ 가 아니라 origin/main web/ 이다: 이 브랜치의
//    랜딩군 소스는 vite 전제로 이미 조정돼(ab2ce53) web직서빙 시 깨지므로, 현행 라이브를
//    재현하려면 main 소스로 web직조립해야 한다. (assembleSiteBaselineFromMain)
//
//  E1) sitemap 동일 + sitemap 등재 공개 URL 이 양쪽 조립본에 모두 파일로 존재(같은 경로).
//      → 공개 URL 집합의 SSOT(sitemap)가 양쪽에서 동일 위치로 해소됨을 보장.
//  E2) 정본 공개 페이지(LIVE_PAGES)를 양쪽 조립본에서 실제 로드해 상태 대조 —
//      양쪽 모두 콘솔에러0·CSP위반0·외부요청0 이어야 동등(URL 집합·내용 동일).
//
// vite 측 로드 결과(vitePageResults)는 run.mjs 가 이미 수집한 것을 재사용(중복 로드 회피).
// 이 모듈은 baseline(main web직조립) 측만 새로 조립·로드해 대조한다.

import fs from 'node:fs';
import path from 'node:path';
import { BASE_PATH, LIVE_PAGES } from './config.mjs';
import { assembleSiteBaselineFromMain } from './assemble.mjs';
import { startServer } from './server.mjs';
import { collectPage } from './browser-checks.mjs';

// sitemap.xml 의 <loc> 를 조립본 상대 파일경로로. '/openartshow/'→'', '/team/'→'team/index.html'.
function locToRel(loc) {
  let p;
  try {
    p = new URL(loc).pathname;
  } catch {
    return null;
  }
  if (p.startsWith(BASE_PATH)) p = p.slice(BASE_PATH.length);
  else p = p.replace(/^\//, '');
  if (p === '' || p.endsWith('/')) p += 'index.html';
  return p;
}

function readSitemapLocs(siteDir) {
  const xml = fs.readFileSync(path.join(siteDir, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return { xml, locs };
}

// 페이지 로드 상태를 (에러·CSP위반·외부요청) 3수치로 요약.
function summarize(p) {
  return {
    errors: (p.consoleErrors?.length || 0) + (p.pageErrors?.length || 0),
    csp: p.cspViolations?.length || 0,
    ext: p.externalRequests?.length || 0,
  };
}
const isClean = (s) => s.errors === 0 && s.csp === 0 && s.ext === 0;

// 동등성 검사 실행 → [{ id, label, status, evidence }] 반환.
export async function checkEquivalence({ browser, vitePageResults, viteSiteDir, baselineSiteDir }) {
  const out = [];

  // ── baseline(origin/main web직조립 = 현행 라이브 배포) 조립 ──────────
  try {
    assembleSiteBaselineFromMain(baselineSiteDir);
  } catch (e) {
    out.push({ id: 'E1', label: '동등성:sitemap/URL존재', status: 'FAIL',
      evidence: `baseline 조립 실패 — ${(e.stderr?.toString() || e.message || '').slice(0, 160)}` });
    out.push({ id: 'E2', label: '동등성:공개페이지 로드', status: 'FAIL', evidence: 'baseline 미조립으로 대조 불가' });
    return out;
  }

  // ── E1: sitemap 동일 + 등재 공개 URL 양쪽 파일 존재 ─────────────────
  const vSm = readSitemapLocs(viteSiteDir);
  const bSm = readSitemapLocs(baselineSiteDir);
  const sitemapSame = vSm.xml === bSm.xml;
  const rels = vSm.locs.map(locToRel).filter(Boolean);
  const missViteFs = rels.filter((rel) => !fs.existsSync(path.join(viteSiteDir, rel)));
  const missBaseFs = rels.filter((rel) => !fs.existsSync(path.join(baselineSiteDir, rel)));
  if (!sitemapSame || missViteFs.length || missBaseFs.length) {
    const parts = [];
    if (!sitemapSame) parts.push('sitemap.xml 바이트 불일치');
    if (missViteFs.length) parts.push(`vite 누락 ${missViteFs.length}: ${missViteFs.slice(0, 3).join(', ')}`);
    if (missBaseFs.length) parts.push(`baseline 누락 ${missBaseFs.length}: ${missBaseFs.slice(0, 3).join(', ')}`);
    out.push({ id: 'E1', label: '동등성:sitemap/URL존재', status: 'FAIL', evidence: parts.join(' | ') });
  } else {
    out.push({ id: 'E1', label: '동등성:sitemap/URL존재', status: 'PASS',
      evidence: `sitemap 동일·공개 URL ${rels.length}개 양쪽 조립본 모두 존재` });
  }

  // ── E2: 정본 공개 페이지 로드 대조(양쪽 clean) ──────────────────────
  const srv = await startServer(baselineSiteDir, null); // web직조립은 루트 서빙
  const baselineResults = [];
  try {
    for (const spec of LIVE_PAGES) {
      try {
        baselineResults.push(await collectPage(browser, srv.origin, spec, ''));
      } catch (e) {
        baselineResults.push({ name: spec.name, url: spec.url,
          consoleErrors: [], pageErrors: [`로드 실패: ${(e.message || String(e)).slice(0, 100)}`],
          cspViolations: [], externalRequests: [], inline: {}, links: [], overflow: [] });
      }
    }
  } finally {
    await srv.close().catch(() => {});
  }

  // URL(이름) 집합 동일 + 각 페이지 양쪽 clean 대조.
  const viteByName = new Map(vitePageResults.map((p) => [p.name, p]));
  const problems = [];
  for (const b of baselineResults) {
    const v = viteByName.get(b.name);
    if (!v) { problems.push(`[${b.name}] vite 측 결과 없음(URL 집합 불일치)`); continue; }
    const bs = summarize(b);
    const vs = summarize(v);
    if (!isClean(bs)) problems.push(`[${b.name}] baseline 오염 err${bs.errors}/csp${bs.csp}/ext${bs.ext}`);
    if (!isClean(vs)) problems.push(`[${b.name}] vite 오염 err${vs.errors}/csp${vs.csp}/ext${vs.ext}`);
  }
  // vite 에만 있고 baseline 에 없는 페이지(비대칭)도 잡는다.
  const baseNames = new Set(baselineResults.map((p) => p.name));
  for (const v of vitePageResults) if (!baseNames.has(v.name)) problems.push(`[${v.name}] baseline 측 결과 없음`);

  if (problems.length) {
    out.push({ id: 'E2', label: '동등성:공개페이지 로드', status: 'FAIL',
      evidence: `${problems.length}건 — ${problems.slice(0, 4).join(' | ')}` });
  } else {
    out.push({ id: 'E2', label: '동등성:공개페이지 로드', status: 'PASS',
      evidence: `${LIVE_PAGES.length}개 정본 공개 페이지 양쪽 조립본 모두 콘솔0·CSP0·외부0(내용 동등)` });
  }

  return out;
}
