#!/usr/bin/env node
// 플레이어 충돌 라이브 게이트 (G-COL2) — **브라우저에서 실제로 막히는지 본다.**
//
// 감독 지시 2026-08-08(태스크 #182): *"통과하면 안 됨"* 계열의 요구이고, 검수관 반려 B2
// 가 이 축의 신설을 해소 조건으로 걸었다.
//
// ── 왜 필요한가 — 단위 테스트 24건이 전부 초록인데 라이브를 본 축이 0 이었다 ──
// `tests/world2-collide.test.ts` 는 판정(`decide/collide.ts`)·조회(`systems/collision.ts`)·
// 집행(`PlayerSystem`)·배선(`main.ts` 정문자열) 네 층을 본다. 검수관이 뮤테이션으로
// 그 검출력을 실증하기까지 했다(`resolveMove` 주입을 끊자 3건 FAIL).
//
// **그런데 그 넷이 다 초록인 상태로도 라이브에서는 안 막힐 수 있다.** §4 배선 검사는
// `main.ts` 소스에 `resolveMove:` 라는 글자가 있는지만 보므로, 값이 `undefined` 로
// 계산되는 경로(예: `collide` 노브의 기본값이 0 이 되는 회귀)를 통째로 통과시킨다.
// 이 저장소가 반복해서 값을 치른 형태 — *"연결돼 있다" 와 "실제 렌더 루프에서 한 번이라도
// 돌았다" 는 다른 명제다* — 의 충돌 판이고, 후자를 보는 축이 여기다.
//
// ── 좌표를 여기 적지 않는다 (`measure-submerge.mjs` 와 같은 규약) ─────────────
// *"z 3.5 에서 멈춰야 한다"* 를 적으면 그 값이 값 미러링이 된다 — 배치(#149)나 스폰
// (`decide/grid.ts`)을 만지는 날 소리 없이 어긋나고, 그때 이 게이트는 **PASS 인 채로
// 아무것도 안 잰다.** 그래서 **대조군과의 비율**로만 판정한다:
//
//     같은 조작 시퀀스를 두 세션에 준다
//       기본        (충돌 ON)  → 이동 거리 dOn
//       &collide=0  (충돌 OFF) → 이동 거리 dOff
//     판정: dOn < dOff × MAX_RATIO   **또는**   두 세션 종점 사이 거리 > MIN_DRIFT_M
//
// 절대 거리도, 막히는 지점도, 무엇이 막는지도 몰라도 된다. 알아야 하는 것은 **"충돌을
// 켜면 덜 갔거나 다른 데로 갔다"** 하나뿐이다.
//
// ⚠ **둘째 축은 나중에 붙었다** (감독 판정 2026-08-08 *"플레이어 자동 우회"*). 자동
// 우회가 들어오면서 충돌이 **막는 것**이 아니라 **비껴가게 하는 것**으로 나타났고,
// 거리비 하나로는 그 작동이 안 보인다(실측 0.92 — 임계 0.9 미달로 거짓 FAIL). 이
// 헤더는 한 회차 동안 *"판정은 거리비 하나뿐"* 이라고 적힌 채로 남아 있었다(검수관
// 권고 P3) — 게이트 유효성에 대한 거짓 진술은 다음 사람이 확인을 생략하게 만든다.
//
// ── 이 게이트가 **못 잡는 것** (정직하게) ────────────────────────────────────
// · **무엇이 막는가** — 어느 파츠의 `footprint` 가 옳은지는 안 본다. 나무가 안 막고
//   벤치만 막아도 dOn < dOff 는 성립한다. 그 축은 단위 테스트(§1) 소관이다.
// · **슬라이딩 품질** — 벽에 붙어 미끄러지는 감각·떨림은 감독 육안뿐이다.
// · **뚫림의 부재** — "막혔다" 는 재지만 "어떤 경우에도 안 뚫린다" 는 못 잰다(터널링은
//   dt 클램프에 의존하고, 이 하네스는 정상 프레임률에서만 돈다).
// · **WebGPU** — 헤드리스는 SwiftShader 다. 충돌은 렌더 경로와 무관한 CPU 산술이라는
//   논증은 타당하지만 **논증이지 실측이 아니다.**
//
// ⚠ **거짓 FAIL 이 아니라 "축을 잃었다" 인 경우가 하나 있다.** 배치가 바뀌어 스폰 정면이
// 완전히 트이면 dOn == dOff 가 되어 FAIL 한다. 그때 고칠 것은 이 임계가 아니라 **세션의
// 걷는 방향**이다 — 막을 것이 없는 방향으로 걸어서 "안 막혔다" 를 얻은 것이므로, 임계를
// 느슨하게 하면 게이트가 아니라 장식이 된다.
//
// 실행: `npm run measure:collide`

import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
import {
  SITE_DIR, BASE_PATH, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS,
} from './config.mjs';
import { assembleSiteVite } from './assemble.mjs';
import { WORLD2_QUERY, waitForWorld2Ready } from './world2-ready.mjs';

/**
 * 대조군이 **반드시 걸어야 하는 거리**(m). 여기 도달하면 즉시 멈춘다.
 *
 * ── 왜 시간이 아니라 거리인가 — **시간 기준은 CI 에서 무너졌다** (실측 2026-08-09) ──
 * 이 자리는 원래 `TICKS = 60`(30초)이었고, 그 주석은 *"'몇 미터' 가 아니라 '얼마 동안'
 * 이다 — 거리를 적으면 그것이 곧 배치 의존이 된다"* 라고 적고 있었다. **논리가 반쪽만
 * 맞았다.** 거리를 적으면 배치 의존인 것은 사실이지만, 시간을 적으면 **러너 성능 의존**
 * 이 되고 그 대가가 더 크다 — 회차마다 **어느 구간을 걷는지가 달라진다.**
 *
 * 실측: 같은 커밋(`4546a19`)·같은 30초에
 *
 *     이 환경(4코어 CPU 래스터)   ON 84.8m / OFF 81.5m · 이탈 3.3m → PASS
 *     GitHub Actions 러너         ON 73.8m / OFF 74.0m · 이탈 0.4m → **FAIL**
 *
 * 충돌이 안 걸린 게 아니었다. **74~85m 구간에 있는 첫 유효 장애물에 CI 가 닿지 못한
 * 것**이다. 그리고 그 FAIL 이 지목한 원인 둘(*"배선 회귀"*·*"축 상실"*)은 **또 둘 다
 * 사실이 아니었다** — 12틱 판본에서 이미 한 번 겪은 그 형태다. 같은 실수를 두 번 했고,
 * 원인도 같다: **재는 축을 시간으로 잡으면 무엇을 지나갔는지가 보장되지 않는다.**
 *
 * 100m 인 이유: 위 실측이 첫 유효 장애물을 74~85m 사이로 좁혔고, 100m 면 그것을 확실히
 * 지난다. **이것은 "결과 좌표" 가 아니라 "측정 성립 조건" 이다** — 원래 주석이 금지한
 * 것(*"z 3.5 에서 멈춰야 한다"*)은 판정을 배치에 묶는 것이고, 이 값은 판정이 아니라
 * **판정할 자격을 얻기 위해 걸어야 하는 최소 거리**다. 실제로 예전의 `MIN_OFF_M`(대조군
 * 최소 거리 사후 검사)이 이미 그 역할을 하고 있었고, 여기서 그것을 **사후 검사에서 종료
 * 조건으로 승격**한 것뿐이다(그래서 그 상수는 없앴다 — 아래 문단).
 */
const TARGET_M = 100;
const TICK_MS = 500;

/**
 * 목표 거리까지 걷는 데 허용하는 최대 틱. 넘으면 **측정 무효 FAIL**(못 잰 것은 통과가 아니다).
 *
 * 240틱 = 120초. CI 실측 실효 속력(74m/30s ≈ 2.5m/s)이면 100m 는 약 40초·80틱이고,
 * 그보다 **3배 느린 러너**까지 흡수한다. 보통 회차는 80틱 근처에서 조기 종료하므로
 * 이 상한이 걸리는 일 자체가 신호다 — 러너가 이상하게 느리거나 주행이 막혔다는 뜻이다.
 */
const MAX_TICKS = 240;

/**
 * 충돌 ON 이 OFF 대비 이 비율보다 **적게** 가야 한다.
 *
 * 0.9 인 이유: 헤드리스 프레임률 편차로 두 세션의 이동량이 몇 % 어긋날 수 있다. 실제로
 * 막히면 차이는 **배 단위**로 나므로(스폰 앞 분수: 25m vs 30m+ 이상, 방향에 따라 3배)
 * 0.9 는 편차를 흡수하면서도 "안 막혔다" 를 그냥 통과시키지 않는 자리다.
 *
 * ⚠ 임계를 올리는(느슨하게 하는) 것으로 FAIL 을 넘기지 않는다 — 위 「축을 잃었다」 문단.
 */
const MAX_RATIO = 0.9;

// ── `MIN_OFF_M` 은 없앴다 — `TARGET_M` 이 그 일을 한다 (2026-08-09) ──────────────
// *"대조군이 최소 이만큼은 가야 측정이 성립한다"* 는 **사후 검사**였다. 지금은 대조군이
// 목표에 닿을 때까지 걷고, 못 닿으면 그 자체가 무효 판정이다. 하한 상수를 따로 두면
// `TARGET_M` 과 값 미러링이 되고, 그것은 이 파일이 이미 한 번 겪은 형태다(첫 판본의
// 하한 `8` 이 `TICKS` 변경을 따라오지 않아 실제 주행의 1/7 로 줄었다).

/**
 * 두 세션의 **종점 사이 거리**가 이보다 크면 "충돌이 경로를 틀었다" 로 본다(m).
 *
 * 자동 우회가 붙은 뒤로 충돌은 **막는 것**보다 **비껴가게 하는 것**으로 나타난다.
 * 거리비만 보면 그 작동이 안 보인다 — 순수 모듈 실측에서 우회 전 25.3m / 우회 후
 * 198.1m(200m 시도)로, 거리비 0.99 라 거짓 FAIL 이 났다.
 *
 * 2m 인 이유: 우회가 한 번이라도 걸리면 **원 하나를 돌아간다.** 가장 작은 파츠(화분)의
 * 유효 반경이 `footprint 0.405~0.51 + bodyR 0.34` = **0.745~0.85m** 이므로 그 왕복만으로
 * 1.5m 이상이 벌어지고, 실제로는 여러 번 걸린다(실측 4.3m). 몸 반경(`DEFAULT_BODY_R`
 * 0.34)의 6배이기도 하다 — 부동소수·프레임률 편차로 이만큼 벌어질 수는 없다.
 *
 * ⚠ 첫 판본은 *"가장 작은 파츠의 유효 반경이 0.85m"* 라고 적었는데 **0.85 는 그 범위의
 * 최댓값**이다(검수관 권고 P2, `parts/planter.ts:28,66` 실측). 결론(2m)은 어느 하한을
 * 써도 실측 4.3m 에 한참 못 미치므로 바뀌지 않지만, 근거 문장이 틀린 채로 남으면 다음
 * 사람이 이 임계를 만질 때 없는 여유를 믿는다.
 */
const MIN_DRIFT_M = 2;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

async function drive(page, fn, ...args) {
  const ok = await page.evaluate(
    ([name, a]) => {
      const w = window.__world2;
      if (!w || typeof w[name] !== 'function') return false;
      w[name](...a);
      return true;
    },
    [fn, args],
  );
  if (!ok) throw new Error(`__world2.${fn}() 를 못 불렀다 — 조작 훅이 없어 충돌을 시뮬할 수 없다`);
}

async function at(page) {
  return page.evaluate(() => {
    const s = window.__world2?.stats?.();
    return { x: s?.player?.x ?? null, z: s?.player?.z ?? null };
  });
}

/**
 * 한 세션을 열어 정면으로 걷고 **이동 거리**를 낸다.
 *
 * `fixedTicks` 를 주면 **거리와 무관하게 그 틱만큼** 걷는다(기본 세션이 대조군과 같은
 * 조작량을 받게 하려는 것이다 — 이것이 없으면 두 세션이 다른 양을 조작받아 비교가
 * 성립하지 않는다). 안 주면 `TARGET_M` 도달 또는 `MAX_TICKS` 소진까지 걷는다.
 */
async function walkOnce(browser, origin, basePath, query, log, fixedTicks = null) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 640 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  // **어느 자산이 실패했는지까지 남긴다.** 브라우저 콘솔의 404 문구는 URL 을 안 담아서
  // "404 한 건" 만 보고는 원인을 짚을 수 없다 — 진단 한 회차를 그 상태로 날렸다.
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`HTTP ${res.status()} ${res.url()}`);
  });
  page.on('requestfailed', (req) => {
    errors.push(`요청 실패 ${req.url()} — ${req.failure()?.errorText ?? '이유 미상'}`);
  });
  try {
    const url = `${origin}${basePath}app/world2.html${query}`;
    log(`접속: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    const ready = await waitForWorld2Ready(page);
    if (ready.reason) {
      // **부팅 실패의 원인은 거의 늘 콘솔에 있다.** `reason` 만 올리면 "60초 안에 안 떴다"
      // 라는 증상만 남고, 실제 원인(자산 404·모듈 예외)이 통째로 사라진다 — 그 상태로
      // 진단을 한 회차 날렸다(2026-08-08).
      return {
        dist: null, errors,
        reason: `${ready.reason}${errors.length ? ` · 콘솔 ${errors.length}건: ${errors.slice(0, 4).join(' | ')}` : ' · 콘솔은 조용했다'}`,
      };
    }
    await page.waitForTimeout(4000); // 초기 파셀

    const from = await at(page);
    if (num(from.x) === null) {
      return { dist: null, reason: 'stats().player 가 좌표를 안 낸다 — 이동을 잴 수 없다', errors };
    }
    // `yaw = 0` 이 −z 를 보므로 축 `(0,-1)` 이 정면 전진이다.
    await drive(page, 'move', 0, -1);
    const limit = fixedTicks ?? MAX_TICKS;
    let ticks = 0;
    let last = from;
    for (; ticks < limit; ticks++) {
      await page.waitForTimeout(TICK_MS);
      // 고정 틱 모드에서는 거리를 안 본다 — 대조군이 정한 조작량을 그대로 받는 것이 목적이다.
      if (fixedTicks !== null) continue;
      last = await at(page);
      if (num(last.x) === null) break;
      if (Math.hypot(last.x - from.x, last.z - from.z) >= TARGET_M) { ticks++; break; }
    }
    await drive(page, 'move', 0, 0);
    await page.waitForTimeout(TICK_MS);
    const to = await at(page);
    // **직선거리로 잰다.** 경로 길이가 아니라 시작점→끝점이다 — 충돌이 옆으로 미끄러뜨리면
    // 경로는 길어지지만 "앞으로 나아간 정도" 는 직선거리가 더 정직하다.
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    return { dist, from, to, ticks, reason: null, errors };
  } finally {
    await context.close();
  }
}

/**
 * 게이트 본체. **브라우저·서버를 주입받는다**(`measure-invariants.mjs` 와 같은 규약).
 *
 * @returns {Promise<{pass: boolean, reason: string|null, onDist: number|null,
 *                    offDist: number|null, ratio: number|null, errors: string[]}>}
 */
export async function runCollide({ browser, origin, basePath, log = console.log }) {
  // **대조군을 먼저 돈다.** ON 이 먼저면 "ON 이 0m 였다" 를 보고도 비교 기준이 없어
  // 원인을 못 가른다(브라우저 조달 실패인지 충돌인지).
  log('[1] 대조군 — 충돌 OFF(&collide=0)');
  const off = await walkOnce(browser, origin, basePath, `${WORLD2_QUERY}&collide=0`, log);
  if (off.reason) {
    return { pass: false, reason: `대조군 실패: ${off.reason}`, onDist: null, offDist: null, ratio: null, errors: off.errors };
  }
  log(`  이동 ${off.dist.toFixed(1)}m  (${off.from.x.toFixed(1)},${off.from.z.toFixed(1)}) → (${off.to.x.toFixed(1)},${off.to.z.toFixed(1)})  ${off.ticks}틱`);

  // **대조군이 목표에 못 닿았으면 여기서 끝낸다** — 기본 세션을 도는 것은 시간 낭비이고,
  // 그 결과로 내리는 판정은 어차피 무효다(어느 구간을 걸었는지 보장되지 않는다).
  if (off.dist < TARGET_M) {
    return {
      pass: false, onDist: null, offDist: off.dist, ratio: null, drift: null, errors: off.errors,
      reason: `대조군이 ${MAX_TICKS}틱(${(MAX_TICKS * TICK_MS) / 1000}초) 안에 ${off.dist.toFixed(1)}m 밖에 못 갔다`
        + `(목표 ${TARGET_M}m) — 충돌 판정이 아니라 **주행 자체가 성립하지 않았다.** `
        + '러너가 이상하게 느리거나 조작 훅·프레임률에 문제가 있다. 임계를 낮춰 넘기지 않는다',
    };
  }

  // **기본 세션은 대조군과 같은 틱을 받는다.** 거리로 끊으면 "충돌 때문에 덜 갔다" 를
  // 잴 수가 없다 — 목표에 닿을 때까지 계속 걸어버리기 때문이다.
  log(`[2] 기본 — 충돌 ON (대조군과 같은 ${off.ticks}틱)`);
  const on = await walkOnce(browser, origin, basePath, WORLD2_QUERY, log, off.ticks);
  const errors = [...off.errors, ...on.errors];
  if (on.reason) {
    return { pass: false, reason: `기본 세션 실패: ${on.reason}`, onDist: null, offDist: off.dist, ratio: null, errors };
  }
  log(`  이동 ${on.dist.toFixed(1)}m  (${on.from.x.toFixed(1)},${on.from.z.toFixed(1)}) → (${on.to.x.toFixed(1)},${on.to.z.toFixed(1)})`);

  const ratio = off.dist > 0 ? on.dist / off.dist : null;
  // 두 세션의 **종점 사이 거리**. 충돌이 경로를 틀었으면 여기가 벌어진다.
  const drift = Math.hypot(on.to.x - off.to.x, on.to.z - off.to.z);
  log(`\n[판정] ON/OFF 거리비 ${ratio === null ? '측정실패' : ratio.toFixed(2)} (임계 < ${MAX_RATIO})`);
  log(`       종점 이탈 ${drift.toFixed(1)}m (임계 > ${MIN_DRIFT_M})`);

  // ── 판정: **덜 갔거나, 다른 데로 갔거나** (자동 우회 도입 2026-08-08) ─────────
  //
  // 첫 판본은 거리비 하나였다(`ON/OFF < 0.9`). 자동 우회(`decide/collide.ts` 의 접선
  // 슬라이딩)를 붙이자 **막혀도 계속 걷게 되어 그 축이 무효가 됐다** — 순수 모듈 실측:
  // 스폰에서 200m 시도에 우회 전 25.3m, 우회 후 **198.1m**(막힌 프레임 3495 → 1).
  // 거리비로는 0.99 라 **거짓 FAIL** 이 난다.
  //
  // 그래서 축을 **"충돌이 궤적에 영향을 줬는가"** 로 넓힌다. 둘 중 하나면 성립한다:
  //   ① 덜 갔다      — 우회가 안 통하는 자리(정통 충돌·막다른 곳)
  //   ② 다른 데로 갔다 — 우회가 통한 자리(옆으로 스쳐 지나갔다)
  //
  // 이 둘은 **같은 기능의 두 얼굴**이고, 어느 쪽도 안 나타나면 충돌이 실제로 안 걸린
  // 것이다. 우회를 붙이기 전에도 ①이 성립했으므로 이 축은 **양쪽 판본에서 유효**하다.
  const lessFar = ratio !== null && ratio < MAX_RATIO;
  const veered = drift > MIN_DRIFT_M;
  if (!lessFar && !veered) {
    return {
      pass: false, onDist: on.dist, offDist: off.dist, ratio, drift, errors,
      reason: `충돌을 켜도 **같은 거리를 같은 방향으로** 갔다(ON ${on.dist.toFixed(1)}m / `
        + `OFF ${off.dist.toFixed(1)}m · 종점 이탈 ${drift.toFixed(1)}m) — `
        + '`resolveMove` 가 실제로 안 걸렸거나(배선 회귀), 걷는 방향에 막을 것이 없다(축 상실). '
        + '**임계를 느슨하게 하는 것으로 넘기지 않는다**',
    };
  }
  if (errors.length) {
    return {
      pass: false, onDist: on.dist, offDist: off.dist, ratio, drift, errors,
      reason: `충돌은 걸렸으나 콘솔 에러 ${errors.length}건: ${errors.slice(0, 2).join(' | ')}`,
    };
  }
  log(`  ✓ PASS — 충돌이 궤적을 바꿨다(${lessFar ? '덜 갔다' : ''}${lessFar && veered ? ' · ' : ''}${veered ? '옆으로 비켰다' : ''}).`);
  return { pass: true, reason: null, onDist: on.dist, offDist: off.dist, ratio, drift, errors };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  await assembleSiteVite();
  // 둘째 인자가 **`BASE_PATH` strip** 이다 — 안 넘기면 `/openartshow/app/world2.html` 을
  // 그대로 파일 경로로 찾아 404 가 된다. 형제 측정기 셋이 전부 넘기고 있는데 이 파일만
  // 빠뜨려서 "부팅 실패" 로 두 회차를 날렸다(2026-08-08). 증상이 페이지 404 였는데
  // `_site` 에는 파일이 있어서 조립 결함으로 오진했다.
  const server = await startServer(SITE_DIR, BASE_PATH);
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE,
    args: CHROMIUM_ARGS,
  });
  try {
    const r = await runCollide({ browser, origin: server.origin, basePath: BASE_PATH });
    if (!r.pass) console.error(`\nFAIL — ${r.reason}`);
    process.exitCode = r.pass ? 0 : 1;
  } finally {
    await browser.close();
    await server.close();
  }
}
