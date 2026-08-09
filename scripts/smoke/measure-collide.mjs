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
//     판정: dOn < dOff × MAX_RATIO
//
// 절대 거리도, 막히는 지점도, 무엇이 막는지도 몰라도 된다. 알아야 하는 것은 **"충돌을
// 켜면 덜 간다"** 하나뿐이고, 그것이 이 기능의 정의다.
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
 * 전진 틱 수와 틱 길이. **"몇 미터" 가 아니라 "얼마 동안" 이다** — 거리를 적으면 그것이
 * 곧 배치 의존이 된다.
 *
 * ── 왜 60틱(30초)인가 — **첫 판본 12틱은 아무것도 못 쟀다** (실측 2026-08-08) ──
 * 처음에 *"12틱 × 500ms = 6초 ≈ 30m(WALK_SPEED 5m/s)"* 라고 적었고 **틀렸다.**
 * 실측은 6초에 **11.5m** — 실효 1.9m/s 로 걷기 속도의 38% 다. 헤드리스가 ~4fps 라
 * `dt` 클램프(0.1s)에 걸려 게임 시간이 실시간보다 훨씬 느리게 흐른다. **"m/s × 초"
 * 로 거리를 추정한 것이 재는 축을 잘못 고른 것**이었다.
 *
 * 그 결과 ON·OFF 가 **둘 다 11.5m** 로 같았다. 충돌이 안 걸린 게 아니라 **충돌 지점
 * (스폰 앞 25m)에 닿기도 전에 측정이 끝난 것**이다. 판정은 FAIL 이었지만 그 FAIL 이
 * 말한 원인("배선 회귀 또는 축 상실")은 둘 다 사실이 아니었다.
 *
 * 30초면 실효 1.9m/s 로 약 57m 다 — 스폰 앞 첫 장애물(25m)을 확실히 지나친다.
 * **시간을 추정으로 정하지 않는다**: 이 값이 충분한지는 아래 `MIN_OFF_M` 이 대조군
 * 실측으로 매 회차 확인하고, 못 미치면 FAIL 로 말한다.
 */
const TICKS = 60;
const TICK_MS = 500;

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

/**
 * 충돌 OFF 세션이 최소 이만큼은 가야 측정이 성립한다(m). **못 잰 것은 통과가 아니다.**
 *
 * OFF 가 짧으면 비율 판정 자체가 무의미하다 — 둘 다 0m 면 `0 < 0 × 0.9` 가 거짓이라
 * FAIL 로 떨어지긴 하지만, 원인이 "충돌이 안 먹었다" 가 아니라 "아무도 안 걸었다" 이므로
 * 리포트가 다른 말을 해야 한다.
 *
 * **유도한다 — 손으로 적지 않는다.** 첫 판본은 `8` 이라는 상수였고, `TICKS` 를 12→60 으로
 * 늘렸을 때 따라오지 않아 **하한이 실제 주행의 1/7 로 줄어드는** 형태였다(같은 커밋 안에서
 * 값 미러링이 생긴 것이다). 보수적 실효 속도 0.5m/s 로 유도한다 — 실측 실효는 1.9m/s
 * 이므로 4배 가까운 여유이고, 그만큼 러너 성능 편차에 강하다.
 */
const MIN_OFF_M = (TICKS * TICK_MS) / 1000 * 0.5;

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

/** 한 세션을 열어 정면으로 `TICKS` 만큼 걷고 **이동 거리**를 낸다 */
async function walkOnce(browser, origin, basePath, query, log) {
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
    for (let i = 0; i < TICKS; i++) await page.waitForTimeout(TICK_MS);
    await drive(page, 'move', 0, 0);
    await page.waitForTimeout(TICK_MS);
    const to = await at(page);
    // **직선거리로 잰다.** 경로 길이가 아니라 시작점→끝점이다 — 충돌이 옆으로 미끄러뜨리면
    // 경로는 길어지지만 "앞으로 나아간 정도" 는 직선거리가 더 정직하다.
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    return { dist, from, to, reason: null, errors };
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
  log(`  이동 ${off.dist.toFixed(1)}m  (${off.from.x.toFixed(1)},${off.from.z.toFixed(1)}) → (${off.to.x.toFixed(1)},${off.to.z.toFixed(1)})`);

  log('[2] 기본 — 충돌 ON');
  const on = await walkOnce(browser, origin, basePath, WORLD2_QUERY, log);
  const errors = [...off.errors, ...on.errors];
  if (on.reason) {
    return { pass: false, reason: `기본 세션 실패: ${on.reason}`, onDist: null, offDist: off.dist, ratio: null, errors };
  }
  log(`  이동 ${on.dist.toFixed(1)}m  (${on.from.x.toFixed(1)},${on.from.z.toFixed(1)}) → (${on.to.x.toFixed(1)},${on.to.z.toFixed(1)})`);

  const ratio = off.dist > 0 ? on.dist / off.dist : null;
  log(`\n[판정] ON/OFF = ${ratio === null ? '측정실패' : ratio.toFixed(2)} (임계 < ${MAX_RATIO})`);

  if (off.dist < MIN_OFF_M) {
    return {
      pass: false, onDist: on.dist, offDist: off.dist, ratio, errors,
      reason: `대조군이 ${off.dist.toFixed(1)}m 밖에 안 갔다(최소 ${MIN_OFF_M}m) — 충돌 판정이 아니라 `
        + '**주행 자체가 성립하지 않았다.** 조작 훅·프레임률을 먼저 본다',
    };
  }
  if (ratio === null || ratio >= MAX_RATIO) {
    return {
      pass: false, onDist: on.dist, offDist: off.dist, ratio, errors,
      reason: `충돌을 켜도 같은 거리를 갔다(ON ${on.dist.toFixed(1)}m / OFF ${off.dist.toFixed(1)}m) — `
        + '`resolveMove` 가 실제로 안 걸렸거나(배선 회귀), 걷는 방향에 막을 것이 없다(축 상실). '
        + '**임계를 느슨하게 하는 것으로 넘기지 않는다**',
    };
  }
  if (errors.length) {
    return {
      pass: false, onDist: on.dist, offDist: off.dist, ratio, errors,
      reason: `충돌은 막았으나 콘솔 에러 ${errors.length}건: ${errors.slice(0, 2).join(' | ')}`,
    };
  }
  log('  ✓ PASS — 충돌을 켜면 실제로 덜 간다.');
  return { pass: true, reason: null, onDist: on.dist, offDist: off.dist, ratio, errors };
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
