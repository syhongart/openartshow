#!/usr/bin/env node
// scripts/smoke/verify-live.mjs
// **배포된 라이브 URL 을 실제로 열어본다.** publish 이후를 보는 유일한 검사다.
//
// ── 왜 필요한가 ─────────────────────────────────────────────────────────────
// 나머지 게이트는 전부 `publish` 스텝 **이전**에 끝난다. `_site` 검사 PASS 는
// `https://…/openartshow/guide.html` 200 을 뜻하지 않는다 — gh-pages 반영, Pages
// 빌드, base path 해석, 캐시가 전부 그 사이에 있다.
//
// 검수관을 신설하게 만든 사고가 이 자리에서 났다: **guide.html 라이브 404.**
// 조립본에는 있었고 배포된 사이트에는 없었다.
//
// 이 검사만 잡을 수 있는 것이 하나 더 있다 — **`.nojekyll` 유실.** Jekyll 은 `_` 로
// 시작하는 디렉터리를 버리므로 `_bundle` 이 통째로 404 가 되는데, 로컬 스모크는 정적
// 서버라 `.nojekyll` 이 없어도 통과한다. `deploy.yml` 의 `touch` 한 줄이 유일한
// 방어였고 그것을 검증하는 축이 지금까지 없었다.
//
// ── 이 검사의 성격 — 막지 못한다. 알린다. ──────────────────────────────────
// `needs: deploy` 로 붙으므로 **배포가 끝난 뒤에** 돈다. FAIL 이 나도 이미 나간 배포를
// 되돌리지 않는다. 자동 롤백은 일부러 안 묶었다 — 롤백은 이 저장소에서 이미 사고를
// 낸 메커니즘이고(롤백 시 보안패치 유실), 한 번도 안 돌려본 판정기에 되돌리기 권한을
// 주는 것은 순서가 거꾸로다. `SMOKE_PERF_GATES` 가 밟은 길(관측 → 승격)을 따른다.
// **승격 조건은 태스크 #128 에 적혀 있다** — 조건 없는 알림은 3주 뒤 아무도 안 보는
// 빨간불이 된다.
//
// ── 무엇을 보는가 ───────────────────────────────────────────────────────────
//  ① HTTP 200            — 파일 자체가 배포에서 빠지는 사고(guide.html 404)
//  ② 실패 요청 0          — HTML 은 200 인데 JS/CSS 가 404 인 사고. **base path 축이다.**
//  ③ 콘솔 에러·pageerror 0 — 스모크 `[4]` 의 라이브 판본
//  ④ **배포 판본 반영**    — `_deploy-sha.txt` 가 이번 커밋인가. ①②③ 만으로는 "옛
//                          판본이 그대로 200"이 통과한다(검수관 B1). 그러면 폴링도
//                          죽은 코드가 된다 — 판본과 무관한 종료 조건은 거의 항상
//                          1라운드에서 끝나므로.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
//  · **자기완결(외부호스트 0).** 로컬 스모크의 가드C 에 대응하는 축이 없다. 게다가
//    라이브에서는 외부 요청이 **성공해버려** ②로도 안 잡힌다 — 로컬보다 검출력이
//    낮은 유일한 축이다. 자기완결은 `smoke:vite` 가 지킨다.
//  · 렌더 결과의 유의미성. 200·0·0 은 **빈 화면과 구별되지 않는다.**
//  · behind-flag 링크 노출 회귀. 링크 그래프를 안 본다.
//  · 시각 회귀·레이아웃. 브라우저를 띄우지만 픽셀은 안 본다.
//  · WebGPU 렌더 경로. 여기도 swiftshader 다.
//  · CDN 엣지별 편차. ④는 우리가 받은 엣지 하나만 본다.
//  · `concurrency: cancel-in-progress` 와의 상호작용 — 폴링 중 후속 push 가 나면 이
//    job 이 취소되고, 그 배포는 라이브 검증을 못 받은 채 기록도 안 남는다.
//
// ── 개발 컨테이너에서는 실제 라이브를 못 본다 (실측) ────────────────────────
// 이 컨테이너의 에이전트 프록시가 `syhongart.github.io:443` CONNECT 를 **403(정책
// 거부)** 로 막는다. 그냥 돌리면 전 페이지가 `ERR_TUNNEL_CONNECTION_FAILED` 인데
// 그것은 **라이브가 깨진 것이 아니라 못 잰 것**이다. 아래 `판정 불가` 분기가 그 둘을
// 가른다(종료코드는 1 유지 — 못 잰 것은 통과가 아니다).
//
// 실행: npm run smoke:live                                        (CI — 실제 라이브)
//       SMOKE_LIVE_BASE_URL=http://127.0.0.1:PORT/openartshow \
//       SMOKE_LIVE_ROUNDS=1 npm run smoke:live                    (로컬 로직 검증)

import { chromium } from 'playwright-core';
import { BASE_URL as SITE_BASE_URL } from '../site-url.mjs';
import {
  CHROMIUM_EXECUTABLE,
  CHROMIUM_ARGS,
  DEPLOY_SHA_FILE,
  LIVE_PAGES,
  PAGE_TIMEOUT_MS,
  VIEWPORTS,
  WEBGL_WAIT_MS,
} from './config.mjs';

// 대상 오리진. env 는 **로컬 로직 검증용 주입점**이고 CI 는 주지 않는다.
const ENV_BASE = process.env.SMOKE_LIVE_BASE_URL;
const BASE_URL = (ENV_BASE || SITE_BASE_URL).replace(/\/$/, '');

// Pages 반영에는 시간이 걸린다. 첫 라운드 실패를 바로 FAIL 로 적지 않는다 — 그것은
// "배포 실패"가 아니라 "아직 안 올라옴"일 수 있고, 둘을 섞으면 가끔 우는 경보가 된다.
const ROUNDS = Number(process.env.SMOKE_LIVE_ROUNDS || 6);
const ROUND_WAIT_MS = Number(process.env.SMOKE_LIVE_ROUND_WAIT_MS || 30_000);
// **`timeout-minutes` 를 판정 수단으로 쓰지 않는다.** 러너가 job 을 죽이면 리포트가
// 통째로 안 나와 페이지별 근거가 한 줄도 안 남는다 — "못 잰 것"이 로그에서 사라진다.
// 그래서 스크립트가 스스로 마감을 지키고, 마감이 와도 **리포트는 반드시 출력한다**.
const DEADLINE_MS = Number(process.env.SMOKE_LIVE_DEADLINE_MS || 11 * 60_000);
// 기대 커밋 SHA. CI 에서만 있다(로컬 검증에는 없다 → 반영 판정을 건너뛴다).
const EXPECT_SHA = process.env.GITHUB_SHA || '';

const started = Date.now();
const log = (s) => console.log(s);

// 도달 실패(네트워크·프록시·DNS)와 "라이브가 깨짐"을 가르는 표지.
const UNREACHABLE = /net::ERR_|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|Timeout .* exceeded/;

async function checkPage(browser, spec) {
  const url = `${BASE_URL}${spec.url}`;
  const context = await browser.newContext({
    viewport: { width: Math.max(...VIEWPORTS), height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(String(e?.message || e)));
  // 실패 요청 — HTML 이 200 이어도 자산이 404 면 여기 걸린다(base path·.nojekyll 축).
  page.on('response', (r) => {
    if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
  });
  page.on('requestfailed', (r) => {
    failedRequests.push(`FAILED ${r.failure()?.errorText || '?'} ${r.url()}`);
  });

  let status = 0;
  let unreachable = false;
  try {
    // `browser-checks.mjs` 와 같은 레시피를 쓴다 — 라이브는 로컬보다 지연이 크고
    // 가변인데 대기가 더 짧으면 늦게 도착하는 404 를 놓친다(검수관 B5).
    // ②가 ①보다 중요하다고 적어놓고 그 축을 성기게 재고 있었다.
    const resp = await page.goto(url, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });
    status = resp?.status() ?? 0;
    await page.waitForLoadState('networkidle', { timeout: PAGE_TIMEOUT_MS }).catch(() => {});
    if (spec.webgl) await page.waitForTimeout(WEBGL_WAIT_MS);
    // networkidle 이후 한 박자 — 컨텍스트를 닫는 순간 살아 있던 요청이 ERR_ABORTED 로
    // 잡히면 그것은 실제 실패가 아니다. 닫기 전에 가라앉힌다.
    await page.waitForTimeout(300);
  } catch (e) {
    const msg = String(e?.message || e);
    unreachable = UNREACHABLE.test(msg);
    pageErrors.push(`goto 실패: ${msg.slice(0, 160)}`);
  }

  await context.close();

  // 문서 자신의 404 는 failedRequests 에도 들어간다 — 중복 보고를 막는다.
  const assetFails = failedRequests.filter((f) => !f.endsWith(url));
  return {
    name: spec.name, url, status, unreachable,
    ok: status === 200 && assetFails.length === 0 && consoleErrors.length === 0 && pageErrors.length === 0,
    assetFails, consoleErrors, pageErrors,
  };
}

// ④ 배포 판본 반영 — 라이브의 `_deploy-sha.txt` 가 이번 커밋인가.
// 반환: { state: 'match'|'stale'|'absent'|'skip'|'unreachable', live, expect }
async function checkDeploySha(browser) {
  if (!EXPECT_SHA) return { state: 'skip' };
  const url = `${BASE_URL}/${DEPLOY_SHA_FILE}`;
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    if (!resp || resp.status() === 404) return { state: 'absent', expect: EXPECT_SHA };
    const live = (await resp.text()).trim();
    return { state: live === EXPECT_SHA ? 'match' : 'stale', live, expect: EXPECT_SHA };
  } catch {
    return { state: 'unreachable', expect: EXPECT_SHA };
  } finally {
    await context.close();
  }
}

async function runRound(browser, specs) {
  const results = [];
  for (const spec of specs) results.push(await checkPage(browser, spec));
  return results;
}

function shaLine(sha) {
  switch (sha.state) {
    case 'match': return `[PASS] ${'배포 판본 반영'.padEnd(16)} ${sha.live.slice(0, 7)} = 이번 커밋`;
    case 'stale': return `[FAIL] ${'배포 판본 반영'.padEnd(16)} 라이브 ${String(sha.live).slice(0, 7)} ≠ 기대 ${sha.expect.slice(0, 7)} — 옛 판본이 서빙되고 있다`;
    case 'absent': return `[FAIL] ${'배포 판본 반영'.padEnd(16)} ${DEPLOY_SHA_FILE} 없음 — 조립 스텝이 안 심었거나 반영 전`;
    case 'unreachable': return `[INFO] ${'배포 판본 반영'.padEnd(16)} 판정 불가 — ${DEPLOY_SHA_FILE} 도달 실패`;
    default: return `[INFO] ${'배포 판본 반영'.padEnd(16)} 건너뜀 — GITHUB_SHA 없음(로컬 실행)`;
  }
}

function report(results, sha) {
  log('\n──────── 라이브 검증 (publish 이후) ────────');
  log(`대상: ${BASE_URL}${ENV_BASE ? '  ⚠ SMOKE_LIVE_BASE_URL 주입됨(로컬 검증 모드)' : ''}`);
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
  log(shaLine(sha));
  log('────────────────────────────────────────────');

  // 표본 자체가 비면 `[].every()` 가 true 라 "0페이지 전부 통과"가 된다. 빈 평균이
  // 단언을 통과시킨 전례가 이 저장소에 있다(CLAUDE.md 검증 규율).
  if (results.length !== LIVE_PAGES.length + 1 || LIVE_PAGES.length === 0) {
    log(`판정: FAIL — 표본이 안 맞는다(검사 ${results.length} / 기대 ${LIVE_PAGES.length + 1}). 하네스 결함이다.`);
    return false;
  }

  const bad = results.filter((r) => !r.ok);
  // **못 잰 것과 깨진 것을 가른다.** 전 페이지가 도달 실패면 러너가 대상에 못 닿은
  // 것이고, 그것을 "라이브가 깨져 있다"로 적으면 다음에 진짜 사고가 나도 "또 그거겠지"
  // 가 된다. 종료코드는 1 그대로다 — 못 잰 것은 통과가 아니다.
  if (bad.length === results.length && results.every((r) => r.unreachable)) {
    log('판정: 판정 불가 — 전 페이지 도달 실패(네트워크·프록시·DNS). 라이브 상태는 알 수 없다.');
    log('  이 컨테이너에서는 정상이다(프록시가 github.io CONNECT 를 403 으로 막는다).');
    return false;
  }
  const shaBad = sha.state === 'stale' || sha.state === 'absent';
  if (bad.length || shaBad) {
    log(`판정: FAIL — 페이지 ${bad.length}/${results.length}${shaBad ? ' · 배포 판본 미반영' : ''}. 라이브가 깨져 있다.`);
    return false;
  }
  log(`판정: PASS — ${results.length}페이지 200 · 자산 실패 0 · 콘솔 에러 0${sha.state === 'match' ? ' · 판본 일치' : ''}`);
  return true;
}

async function main() {
  // 디렉터리 루트(`…/openartshow/`)는 사람이 실제로 여는 주소이고 Pages 의 인덱스
  // 해석에 달린 **별개 요청**이다. LIVE_PAGES 는 전부 `.html` 명시라 이 축이 없었다.
  const specs = [{ name: '루트(디렉터리)', url: '/', webgl: false }, ...LIVE_PAGES];

  log(`라이브 검증 시작 — ${BASE_URL} (${specs.length}건, 최대 ${ROUNDS}라운드)`);
  let browser;
  let results = [];
  let sha = { state: 'skip' };
  try {
    browser = await chromium.launch({ executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS });
    // 통과한 페이지는 이미 라이브 확인이 끝났으므로 재시도 대상에서 뺀다. 전면 장애
    // 시 8페이지×30초×6라운드로 마감을 넘겨 리포트가 통째로 사라지는 것을 막는다.
    let pending = specs;
    const byName = new Map();
    for (let round = 1; round <= ROUNDS; round++) {
      const got = await runRound(browser, pending);
      for (const r of got) byName.set(r.name, r);
      sha = await checkDeploySha(browser);

      const stillBad = got.filter((r) => !r.ok);
      const shaOk = sha.state !== 'stale' && sha.state !== 'absent';
      if (!stillBad.length && shaOk) break;

      const outOfTime = Date.now() - started > DEADLINE_MS;
      if (round === ROUNDS || outOfTime) {
        if (outOfTime) log(`마감(${Math.round(DEADLINE_MS / 60000)}분) 초과 — 라운드를 끊고 지금까지의 결과로 판정한다.`);
        break;
      }
      pending = specs.filter((s) => !byName.get(s.name)?.ok);
      const why = [stillBad.length ? `실패 ${stillBad.map((r) => r.name).join(', ')}` : '', shaOk ? '' : '판본 미반영'].filter(Boolean).join(' · ');
      log(`라운드 ${round}/${ROUNDS} — ${why} → ${ROUND_WAIT_MS / 1000}초 후 재시도(Pages 반영 대기)`);
      await new Promise((r) => setTimeout(r, ROUND_WAIT_MS));
    }
    results = specs.map((s) => byName.get(s.name)).filter(Boolean);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  process.exit(report(results, sha) ? 0 : 1);
}

main().catch((e) => {
  // 하네스가 죽은 것도 FAIL 이다. 못 잰 것을 통과로 적지 않는다.
  console.error('라이브 검증 하네스 예외:', e);
  process.exit(1);
});
