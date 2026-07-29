#!/usr/bin/env node
// scripts/smoke/verify-live.mjs
// **배포된 라이브 URL 을 실제로 열어본다.** publish 이후를 보는 유일한 검사다.
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────────────
// 나머지 게이트는 전부 `publish` 스텝 **이전**에 끝난다. `_site` 검사 PASS 는
// `https://…/openartshow/guide.html` 200 을 뜻하지 않는다 — gh-pages 반영, Pages
// 빌드, base path `/openartshow/` 해석, 캐시가 전부 그 사이에 있다.
//
// 검수관을 신설하게 만든 사고가 정확히 이 자리에서 났다: **guide.html 라이브 404.**
// 조립본에는 있었고 배포된 사이트에는 없었다. 그 구멍이 오늘까지 열려 있었다.
//
// ── 이 검사의 성격 — 막지 못한다. 알린다. ──────────────────────────────────
// `needs: deploy` 로 붙으므로 **배포가 끝난 뒤에** 돈다. 여기서 FAIL 이 나도
// 이미 나간 배포를 되돌리지 않는다. 자동 롤백은 범위 밖이다(별건).
// 그래도 가치가 있는 이유: 지금은 라이브가 깨진 것을 **감독이 발견**한다. 그 사이
// 시간이 이 게이트가 줄이는 것이다. "막는 게이트"로 읽지 말 것.
//
// ── 무엇을 보는가 ───────────────────────────────────────────────────────────
//  ① HTTP 200            — 파일 자체가 배포에서 빠지는 사고(guide.html 404)
//  ② 실패 요청 0          — HTML 은 200 인데 JS/CSS 가 404 인 사고. **base path 축이다.**
//                          이것이 200 만 보는 검사보다 실질적으로 더 중요하다.
//  ③ 콘솔 에러·pageerror 0 — 스모크 `[4]` 의 라이브 판본
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
//  · **"방금 배포한 판본이 반영됐는가"는 판정하지 않는다.** 옛 판본이 그대로 200 이면
//    통과한다. 배포물에 커밋 SHA 를 심어야 정확해지는데, 그러면 조립 레시피 미러링이
//    한 겹 늘어난다(deploy.yml·assemble.mjs·핵심파일 목록). 이 검사의 목표는 "파일이
//    라이브에 있는가"이고 반영 지연은 다른 축이라 분리했다. 폴링으로 시간만 준다.
//  · 시각 회귀·레이아웃. 브라우저를 띄우지만 픽셀은 안 본다.
//  · WebGPU 렌더 경로. 여기도 swiftshader 다.
//  · CDN·브라우저 캐시가 옛 자산을 주는 경우.
//
// ── 개발 컨테이너에서는 실제 라이브를 못 본다 (실측) ────────────────────────
// 이 컨테이너의 에이전트 프록시가 `syhongart.github.io:443` 으로의 CONNECT 를
// **403(정책 거부)** 로 막는다. 로컬에서 그냥 돌리면 8페이지 전부
// `ERR_TUNNEL_CONNECTION_FAILED` 로 FAIL 이 뜨는데, 그것은 **라이브가 깨진 것이
// 아니라 못 잰 것**이다. 둘을 구별하지 못하면 이 게이트는 가끔 우는 경보가 된다.
//
// 그래서 `SMOKE_LIVE_BASE_URL` 로 대상 오리진을 바꿀 수 있게 뒀다. 로컬에서는
// `_site` 를 서브패스로 띄우고 그 주소를 넣어 **검사 로직 자체**(200·자산 실패·콘솔
// 에러 판정)를 검증한다 — 뮤테이션도 그렇게 돌린다(파일을 하나 지우면 FAIL 이 나는가).
// CI 러너에는 이 프록시가 없으므로 env 없이 실제 라이브를 본다.
//
// 실행: node scripts/smoke/verify-live.mjs                    (CI — 실제 라이브)
//       SMOKE_LIVE_BASE_URL=http://127.0.0.1:PORT/openartshow  node …  (로컬 로직 검증)

import { chromium } from 'playwright-core';
import { BASE_URL as SITE_BASE_URL } from '../site-url.mjs';
import {
  CHROMIUM_EXECUTABLE,
  CHROMIUM_ARGS,
  LIVE_PAGES,
  PAGE_TIMEOUT_MS,
  VIEWPORTS,
  WEBGL_WAIT_MS,
} from './config.mjs';

// Pages 반영에는 시간이 걸린다. 첫 라운드에서 404 여도 바로 FAIL 로 적지 않는다 —
// 그것은 "배포 실패"가 아니라 "아직 안 올라옴"일 수 있고, 둘을 섞으면 이 게이트가
// 가끔 우는 경보가 된다. 다만 무한정 기다리지도 않는다.
// 로컬 로직 검증·뮤테이션에서는 기다릴 이유가 없다(대상이 이미 떠 있는 서버다).
// 반영 대기는 실제 Pages 배포에만 필요하므로 회차를 env 로 줄일 수 있게 뒀다.
const ROUNDS = Number(process.env.SMOKE_LIVE_ROUNDS || 6);
const ROUND_WAIT_MS = Number(process.env.SMOKE_LIVE_ROUND_WAIT_MS || 30_000);

// 대상 오리진. env 는 **로컬 로직 검증용 주입점**이고 CI 는 주지 않는다(위 주석 참조).
const BASE_URL = (process.env.SMOKE_LIVE_BASE_URL || SITE_BASE_URL).replace(/\/$/, '');

const log = (s) => console.log(s);

async function checkPage(browser, spec) {
  const url = `${BASE_URL}${spec.url}`;
  const context = await browser.newContext({
    viewport: { width: VIEWPORTS[VIEWPORTS.length - 1], height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(String(e?.message || e)));
  // 실패 요청 — HTML 이 200 이어도 자산이 404 면 여기 걸린다(base path 사고 축).
  page.on('response', (r) => {
    if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
  });
  page.on('requestfailed', (r) => {
    failedRequests.push(`FAILED ${r.failure()?.errorText || '?'} ${r.url()}`);
  });

  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    status = resp?.status() ?? 0;
    // WebGL 씬은 부팅에 시간이 걸린다. 자산 요청이 그 뒤에 나므로 기다려야 ②가 유효하다.
    await page.waitForTimeout(spec.webgl ? WEBGL_WAIT_MS : 1200);
  } catch (e) {
    pageErrors.push(`goto 실패: ${String(e?.message || e).slice(0, 160)}`);
  }

  await context.close();

  // 문서 자신의 404 는 failedRequests 에도 들어간다 — 중복 보고를 막는다.
  const assetFails = failedRequests.filter((f) => !f.endsWith(url));
  return {
    name: spec.name, url, status,
    ok: status === 200 && assetFails.length === 0 && consoleErrors.length === 0 && pageErrors.length === 0,
    assetFails, consoleErrors, pageErrors,
  };
}

async function runRound(browser) {
  const results = [];
  for (const spec of LIVE_PAGES) results.push(await checkPage(browser, spec));
  return results;
}

function report(results) {
  log('\n──────── 라이브 검증 (publish 이후) ────────');
  for (const r of results) {
    const mark = r.ok ? 'PASS' : 'FAIL';
    const detail = r.ok
      ? `${r.status}`
      : [
        `HTTP ${r.status}`,
        r.assetFails.length ? `자산 실패 ${r.assetFails.length}건: ${r.assetFails.slice(0, 2).join(' | ')}` : '',
        r.consoleErrors.length ? `콘솔 에러 ${r.consoleErrors.length}건: ${r.consoleErrors[0]?.slice(0, 100)}` : '',
        r.pageErrors.length ? `pageerror ${r.pageErrors.length}건: ${r.pageErrors[0]?.slice(0, 100)}` : '',
      ].filter(Boolean).join(' · ');
    log(`[${mark}] ${r.name.padEnd(18)} ${detail}`);
  }
  const bad = results.filter((r) => !r.ok);
  log('────────────────────────────────────────────');
  if (bad.length) {
    log(`판정: FAIL — ${bad.length}/${results.length} 페이지. 라이브가 깨져 있다.`);
    log(`대상: ${BASE_URL}`);
  } else {
    log(`판정: PASS — ${results.length}페이지 전부 200 · 자산 실패 0 · 콘솔 에러 0`);
  }
  return bad.length === 0;
}

async function main() {
  log(`라이브 검증 시작 — ${BASE_URL} (${LIVE_PAGES.length}페이지)`);
  let browser;
  let results = [];
  try {
    browser = await chromium.launch({ executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS });
    for (let round = 1; round <= ROUNDS; round++) {
      results = await runRound(browser);
      if (results.every((r) => r.ok)) break;
      if (round < ROUNDS) {
        const bad = results.filter((r) => !r.ok).map((r) => r.name).join(', ');
        log(`라운드 ${round}/${ROUNDS} — 아직 실패: ${bad} → ${ROUND_WAIT_MS / 1000}초 후 재시도(Pages 반영 대기)`);
        await new Promise((r) => setTimeout(r, ROUND_WAIT_MS));
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  process.exit(report(results) ? 0 : 1);
}

main().catch((e) => {
  // 하네스가 죽은 것도 FAIL 이다. 못 잰 것을 통과로 적지 않는다.
  console.error('라이브 검증 하네스 예외:', e);
  process.exit(1);
});
