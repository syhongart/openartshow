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

import { appendFileSync } from 'node:fs';
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
// 판본 폴링(1단계)은 **라운드당 비용이 대기시간뿐**이라 페이지 스윕이 끼던 때보다
// 실질 경과가 3배 짧아진다 — 6라운드면 2.5분이고, 마감 11분 중 23%만 쓰고 포기한다
// (검수관 조건 1, N1 수정의 부작용). Pages 반영이 빌드 큐에 밀리면 5분을 넘기는 일이
// 드물지 않다. 그때 뜨는 `stale` FAIL 은 라이브가 멀쩡한데 우는 경보이고, 하필
// **첫 10회가 승격 관측 표본**이라 오탐이 데이터를 오염시킨다.
// 16라운드 = 8분. 나머지 3분이 페이지 스윕·재시도 몫이다.
const SHA_ROUNDS = Number(process.env.SMOKE_LIVE_SHA_ROUNDS || 16);
// **`timeout-minutes` 를 판정 수단으로 쓰지 않는다.** 러너가 job 을 죽이면 리포트가
// 통째로 안 나와 페이지별 근거가 한 줄도 안 남는다 — "못 잰 것"이 로그에서 사라진다.
// 그래서 스크립트가 스스로 마감을 지키고, 마감이 와도 **리포트는 반드시 출력한다**.
// 마감은 **라운드 내부에서도** 확인한다(`runRound`) — 경계에서만 보면 라운드 하나가
// 마감을 몇 분 넘겨도 못 끊어 그 보증이 거짓이 된다(검수관 N4).
const DEADLINE_MS = Number(process.env.SMOKE_LIVE_DEADLINE_MS || 11 * 60_000);
// 기대 커밋 SHA. CI 에서만 있다(로컬 검증에는 없다 → 반영 판정을 건너뛴다).
const EXPECT_SHA = process.env.GITHUB_SHA || '';
// CI 에서 `GITHUB_SHA` 가 없으면 ④가 조용히 사라져 게이트가 자기 축 하나를 잃은 채
// 통과한다. 러너는 항상 넣어주지만, **축이 꺼진 채 초록불이 나는 경로는 남기지 않는다**
// (검수관 N2). 로컬에서만 건너뛴다.
const IS_CI = !!process.env.CI;

const started = Date.now();
// 판본이 몇 라운드·몇 초에 확정됐는가 — 폴링 예산의 유일한 실측 근거(관측 지표 ②).
let shaSettledAt = null;
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
  // 판정에서 뺀 ERR_ABORTED — **끄되 흔적은 남긴다.** 이 파일은 같은 자리에서 세 번
  // 반대로 판단했다(도달 실패를 INFO 로 흘리지 않고 FAIL 로, CI 의 SHA 부재를 FAIL 로,
  // 못 잰 항목을 표에서 빼지 않고 남김). 이번 필터만 축을 조용히 없애면 그 원칙이
  // 깨진다. 그리고 이 페이지의 자산 관측은 고정 예산(WEBGL_WAIT_MS+300ms) 안에서만
  // 이뤄지므로, **삼킨 건수가 늘어나는 것이 "라이브가 느려졌다"의 유일한 신호**다.
  //
  // **읽을 때 단서 하나**(검수관 R5): 404 도 여기 섞인다 — 404 응답 뒤 Chromium 이 그
  // 요청을 abort 하기 때문이다. 그래서 신호로 읽을 때는 **PASS 줄의 숫자만** 본다.
  // FAIL 줄의 건수에는 404 몫이 포함돼 있어 합산하면 느려짐을 과대평가한다.
  const abortedIgnored = [];

  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(String(e?.message || e)));
  // 실패 요청 — HTML 이 200 이어도 자산이 404 면 여기 걸린다(base path·.nojekyll 축).
  page.on('response', (r) => {
    if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
  });
  page.on('requestfailed', (r) => {
    const err = r.failure()?.errorText || '?';
    // [ERR_ABORTED 제외] 이건 "자산이 깨졌다"가 아니라 **"우리가 끊었다"** 다.
    // `context.close()` 시점에 살아 있던 요청이 전부 여기로 온다.
    //
    // 라이브에서 미술관 첫 화면의 작품 영상(`frontend/assets/neon-motion.mp4`, 2.79MB)이
    // 이 축에 걸려 배포마다 빨간불이 났다. **간헐적이었다** — 같은 파일이 통과와 실패를
    // 오갔고, 코드 변경과 무관했다.
    //
    // ── 실제 타임라인 (검수관 계측, `_site/app/index.html`) ─────────────────
    //      136ms  REQ  syhongart.json
    //      136ms  --- load ---
    //      654ms  --- networkidle 성립 ---
    //     3556ms  REQ  neon-motion.mp4      ← networkidle 이 끝난 뒤 2.9초에 **시작**
    //     6657ms  --- WEBGL_WAIT_MS(6000) 종료 ---
    //     7575ms  RES 200 neon-motion.mp4
    //     8527ms  --- 300ms 유예 종료 --- 8547ms close
    //
    // 여기서 두 가지를 바로잡는다(처음 이 자리에 적었던 설명이 틀렸다):
    //   · mp4 는 `networkidle` 을 "통과"한 것이 아니라 **그 뒤에 태어난다.**
    //   · Playwright 의 `networkidle` 은 **연결 0개 500ms** 다. "2개 이하"는 Puppeteer
    //     의 `networkidle2` 이고 여기와 무관하다.
    //   · 이 페이지의 실효 예산은 300ms 가 아니라 **`WEBGL_WAIT_MS`(6000) + 300ms** 다
    //     (미술관은 `webgl: true`). 300ms 만 지목하면 다음 사람이 틀린 값을 만진다.
    //
    // ── 대기를 늘리는 것은 처방이 아니다 (검수관 실측) ───────────────────────
    // latency 0 인 127.0.0.1 에서조차 결과가 흔들린다:
    //     유예 300ms  → FAIL · PASS · PASS
    //     유예 10초   → PASS · FAIL · FAIL      ← 10초를 줘도 안 낫는다
    // 로컬에서 2.79MB 전송은 수십 ms 다. 대역폭 문제가 아니라 **미디어 요청의 수명이
    // 페이지 수명과 어긋나는 구조**의 문제다.
    //
    // ── 404 검출력은 그대로다 (검수관 17케이스 실측, 손실 0건) ───────────────
    // 그 축은 위 `response` 핸들러(`status >= 400`)가 담당한다. script·img·css·video·
    // `_bundle` 모듈·지연 404·`load` 후 fetch 전부 이 변경 뒤에도 FAIL 로 잡히고,
    // **큰 미디어와 404 가 한 페이지에 섞여 있어도 404 가 남는다.** 게다가 404 는 콘솔
    // 에러("Failed to load resource … 404")를 동반하는데 ERR_ABORTED 는 콘솔에 아무것도
    // 안 남긴다 — 두 축이 갈린다.
    //
    // 잃는 것: 서버가 실제로 연결을 끊는 경우. 그건 ERR_CONNECTION_RESET·
    // ERR_EMPTY_RESPONSE 등 다른 코드로 온다. **CSP 차단은 `errorText` 가 그냥 `csp` 다**
    // (검수관 실측 — `ERR_BLOCKED_BY_CSP` 가 아니다). 셋 다 이 필터에 안 걸린다.
    if (err === 'net::ERR_ABORTED') { abortedIgnored.push(r.url()); return; }
    failedRequests.push(`FAILED ${err} ${r.url()}`);
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
    // **networkidle 이후에 시작된 요청의 마지막 창.** 위 타임라인이 보여주듯 이 페이지의
    // 실제 자산은 networkidle(654ms)이 끝난 뒤에 태어나므로, 그 구간을 덮는 것은
    // `WEBGL_WAIT_MS` 와 이 유예뿐이다.
    // (원래 주석은 이 대기가 ERR_ABORTED 도 가라앉힌다고 적었으나 **못 가라앉혔다** —
    //  그 축은 위 `requestfailed` 핸들러의 제외 규칙이 담당한다.)
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
    // 판정에 넣지 않는다(INFO) — 위 핸들러 주석 참조. 리포트에만 남는다.
    abortedIgnored,
  };
}

// ④ 배포 판본 반영 — 라이브의 `_deploy-sha.txt` 가 이번 커밋인가.
// 반환: { state: 'match'|'stale'|'absent'|'skip'|'unreachable', live, expect }
async function checkDeploySha(browser) {
  if (!EXPECT_SHA) return { state: 'skip' };
  // 캐시버스터 — Pages 엣지가 이 파일을 캐시하면 반영이 끝난 뒤에도 `stale` 이 뜬다.
  // 마감(11분)과 엣지 캐시 수명이 같은 자릿수라 거짓 FAIL 위험이 실재한다(검수관 R11).
  const url = `${BASE_URL}/${DEPLOY_SHA_FILE}?t=${Date.now()}`;
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

// 마감을 **라운드 내부에서도** 지킨다. 라운드 경계에서만 보면 라운드 하나가 마감을
// 몇 분 넘겨도 못 끊고, 그러면 러너가 job 을 죽여 **리포트가 통째로 안 나온다**
// (검수관 N4). 못 잰 페이지는 `unmeasured` 로 표에 남긴다 — 조용히 빠지면 표본
// 가드가 "하네스 결함"으로만 보고하고 어디까지 쟀는지가 사라진다.
async function runRound(browser, specs) {
  const results = [];
  for (const spec of specs) {
    if (Date.now() - started > DEADLINE_MS) {
      results.push({
        name: spec.name, url: `${BASE_URL}${spec.url}`, status: 0,
        unreachable: false, unmeasured: true, ok: false,
        assetFails: [], consoleErrors: [], pageErrors: [],
      });
      continue;
    }
    results.push(await checkPage(browser, spec));
  }
  return results;
}

function shaLine(sha) {
  switch (sha.state) {
    case 'match': return `[PASS] ${'배포 판본 반영'.padEnd(16)} ${sha.live.slice(0, 7)} = 이번 커밋`;
    case 'stale': return `[FAIL] ${'배포 판본 반영'.padEnd(16)} 라이브 ${String(sha.live).slice(0, 7)} ≠ 기대 ${sha.expect.slice(0, 7)} — 옛 판본이 서빙되고 있다`;
    case 'absent': return `[FAIL] ${'배포 판본 반영'.padEnd(16)} ${DEPLOY_SHA_FILE} 없음 — 조립 스텝이 안 심었거나 반영 전`;
    // **`unreachable` 은 통과가 아니다**(검수관 N2). 못 잰 축을 INFO 로 흘리면
    // "④를 못 쟀는데 그 실행이 초록불"이 성립한다 — 이 저장소가 반복해 데인 형태다.
    case 'unreachable': return `[FAIL] ${'배포 판본 반영'.padEnd(16)} 못 쟀다 — ${DEPLOY_SHA_FILE} 도달 실패(재시도 소진)`;
    // CI 에서 `GITHUB_SHA` 가 없으면 게이트가 자기 축 하나를 잃은 채 통과한다.
    // 로컬(`CI` 미설정)에서만 건너뛴다.
    default: return IS_CI
      ? `[FAIL] ${'배포 판본 반영'.padEnd(16)} GITHUB_SHA 없음 — CI 인데 판본 축이 꺼졌다`
      : `[INFO] ${'배포 판본 반영'.padEnd(16)} 건너뜀 — GITHUB_SHA 없음(로컬 실행)`;
  }
}

// ④가 판정을 통과시켜도 되는 상태인가. `match` 와 로컬 `skip` 뿐이다.
const shaAcceptable = (sha) => sha.state === 'match' || (sha.state === 'skip' && !IS_CI);

function report(results, specs, sha) {
  log('\n──────── 라이브 검증 (publish 이후) ────────');
  log(`대상: ${BASE_URL}${ENV_BASE ? '  ⚠ SMOKE_LIVE_BASE_URL 주입됨(로컬 검증 모드)' : ''}`);
  // 판본이 확정되지 않았으면 페이지 결과는 **옛 판본을 잰 값**이다. 판정 근거가 아니라
  // 정황일 뿐이므로 그렇게 적는다(검수관 N1).
  const pagesAuthoritative = shaAcceptable(sha);
  if (!pagesAuthoritative) log('※ 아래 페이지 결과는 판본 확정 전 측정이라 INFO 다 — 판정 근거가 아니다.');
  for (const r of results) {
    const mark = r.unmeasured ? 'MISS' : (!pagesAuthoritative ? 'INFO' : (r.ok ? 'PASS' : 'FAIL'));
    // 판정에서 뺀 ERR_ABORTED — **PASS 줄에도 보인다.** 삼킨 건이 나타날 자리가 거기다.
    // 판정에는 안 들어가지만(INFO), 건수가 늘면 라이브가 느려졌다는 신호다.
    const ignored = r.abortedIgnored?.length
      ? ` · 중단 무시 ${r.abortedIgnored.length}건: ${r.abortedIgnored.slice(0, 2).map((u) => u.split('/').pop()).join(', ')}`
      : '';
    const detail = r.unmeasured
      ? '측정 안 함 — 마감 초과로 라운드를 끊었다'
      : r.ok
        ? `${r.status}${ignored}`
        : [
          `HTTP ${r.status}`,
          r.assetFails.length ? `자산 실패 ${r.assetFails.length}건: ${r.assetFails.slice(0, 2).join(' | ')}` : '',
          r.consoleErrors.length ? `콘솔 에러 ${r.consoleErrors.length}건: ${r.consoleErrors[0]?.slice(0, 100)}` : '',
          r.pageErrors.length ? `pageerror ${r.pageErrors.length}건: ${r.pageErrors[0]?.slice(0, 100)}` : '',
        ].filter(Boolean).join(' · ') + ignored;
    log(`[${mark}] ${r.name.padEnd(18)} ${detail}`);
  }
  log(shaLine(sha));
  log('────────────────────────────────────────────');

  // 표본 자체가 비면 `[].every()` 가 true 라 "0페이지 전부 통과"가 된다. 빈 평균이
  // 단언을 통과시킨 전례가 이 저장소에 있다(CLAUDE.md 검증 규율).
  // 기대 개수는 **호출자가 넘긴 specs** 로 센다 — `LIVE_PAGES.length + 1` 은 "합성
  // spec 이 정확히 1개"를 단언에 복사한 것이라 spec 이 늘면 정상 실행이 FAIL 이 된다.
  if (specs.length === 0 || results.length !== specs.length) {
    log(`판정: FAIL — 표본이 안 맞는다(검사 ${results.length} / 기대 ${specs.length}). 하네스 결함이다.`);
    return false;
  }

  // **판본이 안 맞으면 그것만으로 FAIL 이다.** 페이지가 전부 200 이어도 그것은 옛
  // 판본이 살아 있다는 뜻일 뿐이고, "이번 배포가 라이브에 도달했는가"에 답하지 못한다.
  if (!pagesAuthoritative) {
    log(`판정: FAIL — 배포 판본 미반영(${sha.state}). 이번 커밋이 라이브에 도달했는지 확인되지 않았다.`);
    return false;
  }

  const bad = results.filter((r) => !r.ok);
  const unreach = results.filter((r) => r.unreachable);
  const missed = results.filter((r) => r.unmeasured);
  // **못 잰 것과 깨진 것을 가른다.** 전 페이지가 도달 실패면 러너가 대상에 못 닿은
  // 것이고, 그것을 "라이브가 깨져 있다"로 적으면 다음에 진짜 사고가 나도 "또 그거겠지"
  // 가 된다. 종료코드는 1 그대로다 — 못 잰 것은 통과가 아니다.
  if (bad.length === results.length && unreach.length === results.length) {
    log('판정: 판정 불가 — 전 페이지 도달 실패(네트워크·프록시·DNS). 라이브 상태는 알 수 없다.');
    log('  이 컨테이너에서는 정상이다(프록시가 github.io CONNECT 를 403 으로 막는다).');
    return false;
  }
  if (bad.length) {
    // 부분 도달 실패를 breakage 로 뭉뚱그리지 않는다(검수관 R13).
    const parts = [
      bad.length - unreach.length - missed.length ? `깨짐 ${bad.length - unreach.length - missed.length}` : '',
      unreach.length ? `도달 실패 ${unreach.length}` : '',
      missed.length ? `미측정 ${missed.length}` : '',
    ].filter(Boolean).join(' · ');
    log(`판정: FAIL — ${results.length}건 중 ${parts}.`);
    return false;
  }
  log(`판정: PASS — ${results.length}건 200 · 자산 실패 0 · 콘솔 에러 0${sha.state === 'match' ? ' · 판본 일치' : ''}`);
  return true;
}

/**
 * 관측 지표를 job summary 에 한 줄로 남긴다 — **run 목록에서 열지 않고 보인다.**
 *
 * 승격 관측(태스크 #128)이 필요로 하는 4종이 여기 다 들어간다:
 *   ①최종 판정 ②판본 확정 라운드·초 ③④ 상태 ④총 소요
 *
 * 저장소에 파일로 누적하지 않는다(검수관 판정). 그 경로는 이 job 에 쓰기 권한을
 * 요구해 "관찰만 한다"는 성격을 없애고, push 가 `deploy.yml` 을 다시 트리거해
 * **자기 트리거 루프**(배포 → verify-live → 커밋 → 배포 …)를 만든다. 게다가
 * "생성물은 추적하지 않는다"는 이 저장소의 구조 규율에도 어긋난다.
 * 리포트 전문은 Actions 로그에 남고, 관측 기간(14일)보다 보존이 길다.
 */
function writeSummary(results, sha, ok) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const secs = Math.round((Date.now() - started) / 1000);
  const bad = results.filter((r) => !r.ok);
  const verdict = ok ? 'PASS' : (bad.length === results.length && results.every((r) => r.unreachable) ? '판정 불가' : 'FAIL');
  const rows = [
    `| 최종 판정 | **${verdict}** |`,
    `| 배포 판본(④) | ${sha.state}${sha.state === 'match' ? ` (${String(sha.live).slice(0, 7)})` : ''} |`,
    `| 판본 확정 | ${shaSettledAt ?? '—'} |`,
    `| 총 소요 | ${secs}초 |`,
    `| 페이지 | ${results.length - bad.length}/${results.length} 통과 |`,
  ];
  try {
    appendFileSync(file,
      `### 라이브 검증 (관측 #128)\n\n| 항목 | 값 |\n|---|---|\n${rows.join('\n')}\n\n`);
  } catch { /* summary 를 못 써도 판정에는 영향이 없다 */ }
}

async function main() {
  // 디렉터리 루트(`…/openartshow/`)는 사람이 실제로 여는 주소이고 Pages 의 인덱스
  // 해석에 달린 **별개 요청**이다. LIVE_PAGES 는 전부 `.html` 명시라 이 축이 없었다.
  const specs = [{ name: '루트(디렉터리)', url: '/', webgl: false }, ...LIVE_PAGES];

  log(`라이브 검증 시작 — ${BASE_URL} (${specs.length}건, 최대 ${ROUNDS}라운드)`);
  let browser;
  let results = [];
  let sha = { state: 'skip' };
  const outOfTime = () => Date.now() - started > DEADLINE_MS;
  const wait = () => new Promise((r) => setTimeout(r, ROUND_WAIT_MS));

  try {
    browser = await chromium.launch({ executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS });

    // ── 1단계: 판본부터 확정한다. 페이지는 아직 안 잰다. ────────────────────
    //
    // **순서가 판정을 결정한다**(검수관 N1). 페이지를 먼저 재고 통과한 것을 재시도에서
    // 빼면, 라운드1 에서 옛 판본이 전부 200 → pending 이 비고 → 라운드2 에서 판본만
    // 바뀌어 break → **옛 판본을 잰 결과가 "판본 일치"와 함께 PASS 로 나간다.**
    // 새 배포가 guide.html 을 빠뜨려도 초록불이 된다 — 이 게이트를 만든 바로 그 사고다.
    //
    // 그래서 판본이 `match` 가 된 **이후에 수집한 결과만** 유효 표본으로 쓴다.
    // 재시도 좁히기는 "같은 판본 안에서"만 성립한다.
    if (EXPECT_SHA) {
      for (let round = 1; round <= SHA_ROUNDS; round++) {
        sha = await checkDeploySha(browser);
        if (sha.state === 'match') {
          // 이 값이 폴링 예산의 유일한 실측 근거다 — 관측 지표 ②(태스크 #128).
          shaSettledAt = `라운드 ${round}/${SHA_ROUNDS}, ${Math.round((Date.now() - started) / 1000)}초`;
          log(`판본 확정 — ${sha.live.slice(0, 7)} (${shaSettledAt})`);
          break;
        }
        if (round === SHA_ROUNDS || outOfTime()) break;
        log(`라운드 ${round}/${SHA_ROUNDS} — 판본 ${sha.state} → ${ROUND_WAIT_MS / 1000}초 후 재확인(Pages 반영 대기)`);
        await wait();
      }
    }

    // ── 2단계: 전 표본 1회 스윕 ────────────────────────────────────────────
    // 판본이 확정되지 않았어도 스윕은 한다 — 리포트에 정황을 남기려는 것이고,
    // `report` 가 그 결과를 INFO 로 강등하고 판정은 FAIL 로 낸다.
    const byName = new Map();
    for (const r of await runRound(browser, specs)) byName.set(r.name, r);

    // ── 3단계: 실패한 것만 재시도(같은 판본 안이므로 안전) ──────────────────
    if (shaAcceptable(sha)) {
      for (let round = 1; round <= ROUNDS; round++) {
        const pending = specs.filter((s) => !byName.get(s.name)?.ok);
        if (!pending.length) break;
        if (round === ROUNDS || outOfTime()) {
          if (outOfTime()) log(`마감(${Math.round(DEADLINE_MS / 60000)}분) 초과 — 재시도를 끊고 지금까지의 결과로 판정한다.`);
          break;
        }
        log(`재시도 ${round}/${ROUNDS} — 실패 ${pending.map((s) => s.name).join(', ')} → ${ROUND_WAIT_MS / 1000}초 후`);
        await wait();
        for (const r of await runRound(browser, pending)) byName.set(r.name, r);
      }
    }
    results = specs.map((s) => byName.get(s.name)).filter(Boolean);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
  const ok = report(results, specs, sha);
  writeSummary(results, sha, ok);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  // 하네스가 죽은 것도 FAIL 이다. 못 잰 것을 통과로 적지 않는다.
  console.error('라이브 검증 하네스 예외:', e);
  process.exit(1);
});
