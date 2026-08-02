#!/usr/bin/env node
// 물빠짐 상호작용 게이트 — **브라우저에서 실제로 물에 들어가 본다.**
//
// 감독 지시 2026-07-31: *"강에 사람이 빠지게해줘"* · 검수관 게이트 명세로 신설.
//
// ── 왜 필요했나 — 단위 테스트가 전부 초록인데 아무것도 안 돌았다 ─────────────
// `decide/swim.ts` 판정과 `PlayerSystem` 집행은 단위 테스트가 본다. 검수관이 뮤테이션
// 으로 그 연결이 진짜임을 실증하기까지 했다(`player.ts` 의 물 판정을 끊자 `[B]` 4건이
// 정확히 깨졌다).
//
// **그런데 브라우저에서는 한 줄도 안 돌았다.** 실측:
//
//   스폰 z = 10 · 강 가장자리 z = −72 → 필요 82.0m
//   `[7]` 주행 = 6 legs × 1.5s × 5m/s = 45.0m
//   → 37.0m 모자람. 주행 종점 (0, −35) 는 물이 아니다.
//
// `[7]` PASS 는 **뭍에서만 걸은 결과**였고, 스모크 원문 어디에도 "물빠짐 미실행" 이라는
// 단서가 없었다. 이 저장소가 세 번 이름 붙인 *"못 잰 것이 통과로 적히는 경향"* 의 형태다.
//
// "연결돼 있다" 와 "실제 렌더 루프·DOM 에서 한 번이라도 돌았다" 는 다른 명제다. 후자를
// 보는 축이 여기다 — `onSubmerge` 가 정말 `#w2-underwater` 에 닿는지, 그 CSS 가 실제로
// 칠해지는지, 전이 구간에 콘솔 에러가 없는지.
//
// ── 좌표를 여기 적지 않는다 (이 파일 설계의 핵심) ────────────────────────────
// "z −72 까지 걸어라" 를 적는 순간 그 값이 값 미러링이 된다 — 감독이 강을 또 옮기면
// 소리 없이 못 미치는 값이 되고, 그때 이 게이트는 **PASS 인 채로 아무것도 안 잰다.**
// 실제로 `[7]` 이 정확히 그렇게 되어 있었다.
//
// 그래서 `stats().player.submersion` 을 보고 **"0 보다 커질 때까지"** 만 걷는다. 강이
// 어디에 있든, 얼마나 멀든, 폭이 얼마든 이 게이트는 안 고쳐도 된다.
//
// ── 못 잡는 것 (정직하게) ────────────────────────────────────────────────────
// · **색감·톤** — opacity 가 0 보다 큰지만 본다. "물처럼 보이는가" 는 감독 육안뿐이다.
// · **WebGPU** — 헤드리스는 SwiftShader 다. DOM 오버레이라 렌더 경로와 무관하다는 것은
//   타당한 논증이지만 **논증이지 실측이 아니다.** 이 사각은 여기서 안 닫힌다.
// · **픽셀 오버랩** — HUD 요소가 DOM 에 있고 숨겨지지 않았음까지만 본다. 실제 컴포지팅
//   에서 물빛에 덮이는지는 스크린샷 판정의 영역이다.
//
// 실행: `npm run measure:submerge`

import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
import {
  SITE_DIR, BASE_PATH, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS,
} from './config.mjs';
import { assembleSiteVite } from './assemble.mjs';
import { WORLD2_QUERY, waitForWorld2Ready } from './world2-ready.mjs';

/**
 * 물에 닿을 때까지 걷는 상한(틱). **정답 거리가 아니라 무한루프 방지선이다.**
 *
 * 현재 실측 필요거리는 82m 이고 틱당 `TICK_MS` 만큼 전진하므로, 상한은 그 **3배 이상**
 * 여유를 둔다(검수관 조건). 타이트하게 잡으면 헤드리스 성능 편차로 거짓 FAIL 이 난다.
 *
 * 상한에 걸리고도 물에 안 닿으면 **FAIL 이다** — 측정 실패를 통과로 적지 않는다.
 */
const MAX_TICKS = 240;
const TICK_MS = 250;

/** 물에 들어간 뒤 더 걸어 잠김이 유의미하게 오르는지 볼 틱 수 */
const SINK_TICKS = 16;
/** 잠김이 이만큼은 올라야 "실제로 가라앉았다" 로 친다 */
const SINK_TARGET = 0.5;
/** 뭍으로 되돌아오기 상한(틱). 들어온 만큼 나가야 하므로 넉넉히 */
const RETURN_TICKS = 320;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** 지금 화면 상태 한 장. **판정에 쓰는 값은 전부 여기서 한 번에 읽는다** */
async function probe(page) {
  return page.evaluate(() => {
    const s = window.__world2?.stats?.();
    const el = document.getElementById('w2-underwater');
    // `style.opacity` 는 인라인 값이다 — `main.ts` 가 쓰는 바로 그 자리라, 계산값이
    // 아니라 **우리 코드가 실제로 쓴 것**을 본다. 계산값을 보면 CSS 기본값과 섞인다.
    const inline = el ? el.style.opacity : null;
    const vis = (id) => {
      const n = document.getElementById(id);
      if (!n) return 'missing';
      const cs = getComputedStyle(n);
      return (cs.display === 'none' || cs.visibility === 'hidden') ? 'hidden' : 'shown';
    };
    return {
      submersion: s?.player?.submersion ?? null,
      z: s?.player?.z ?? null,
      overlay: inline,
      hud: vis('w2-hud'),
      map: vis('w2-mapwrap'),
    };
  });
}

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
  if (!ok) throw new Error(`__world2.${fn}() 를 못 불렀다 — 조작 훅이 없어 상호작용을 시뮬할 수 없다`);
}

/**
 * 게이트 본체. **브라우저·서버를 주입받는다**(`measure-invariants.mjs` 와 같은 규약).
 *
 * @returns {Promise<{pass: boolean, reason: string, peak: number|null,
 *                    ticksToWater: number|null, overlayAtPeak: string|null,
 *                    hud: string, map: string, backOut: boolean, errors: string[]}>}
 */
export async function runSubmerge({ browser, origin, basePath, log = console.log }) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 640 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  const fail = (reason, extra = {}) => ({
    pass: false, reason, peak: null, ticksToWater: null, overlayAtPeak: null,
    hud: 'unknown', map: 'unknown', backOut: false, errors, ...extra,
  });

  try {
    // GLB 가 기본 노출로 바뀐 뒤 게이트도 기본 상태를 재야 한다. 대기는 world2-ready.mjs 소유.
    const url = `${origin}${basePath}app/world2.html${WORLD2_QUERY}`;
    log(`접속: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    const ready = await waitForWorld2Ready(page);
    if (ready.reason) return fail(ready.reason);
    await page.waitForTimeout(4000);   // 초기 파셀

    const start = await probe(page);
    if (start.submersion === null) {
      // 훅이 `submersion` 을 안 열었으면 **이 게이트 전체가 성립하지 않는다.** 조용히
      // 넘어가면 "돌았는데 아무 일도 없었다" 와 구별이 안 된다.
      return fail('stats().player.submersion 이 없다 — 진단 훅이 이 축을 안 연다');
    }
    if (start.submersion !== 0) {
      return fail(`스폰이 이미 물이다(submersion=${start.submersion}) — 전제가 깨져 판정할 수 없다`);
    }
    log(`기준선  submersion=${start.submersion} z=${num(start.z)} overlay="${start.overlay}"`);

    // ── ① 물에 닿을 때까지 전진 — **거리를 모른 채** ──────────────────────────
    // `yaw = 0` 이 −z 를 보므로 축 `(0,-1)` 이 정면 전진이다. 강이 스폰 정면에 있다는
    // 것이 이번 감독 지시의 내용이므로, 정면으로 걷다 보면 닿는 것이 맞다.
    // **안 닿으면 그 자체가 결함이다**(강이 정면이 아니라는 뜻).
    await drive(page, 'move', 0, -1);
    let ticksToWater = null;
    for (let i = 1; i <= MAX_TICKS; i++) {
      await page.waitForTimeout(TICK_MS);
      const p = await probe(page);
      if (num(p.submersion) > 0) { ticksToWater = i; break; }
    }
    if (ticksToWater === null) {
      await drive(page, 'move', 0, 0);
      const p = await probe(page);
      return fail(
        `${MAX_TICKS}틱(${(MAX_TICKS * TICK_MS) / 1000}초) 전진했는데 물에 안 닿았다 — `
        + `submersion 이 0 그대로다(z=${num(p.z)})`,
      );
    }
    log(`물 진입: ${ticksToWater}틱`);

    // ── ② 더 걸어 실제로 가라앉는지 ──────────────────────────────────────────
    let peak = 0;
    let overlayAtPeak = null;
    // ── HUD·미니맵은 **매 틱 누적으로** 판정한다 (검수관 비블로커 2026-07-31) ──
    // 처음에는 peak 시점의 스냅샷 하나만 봤다. 그러면 구간 중간에 HUD 가 잠깐 가려졌다
    // 마지막 틱에 다시 보이는 경우를 못 잡는다 — 물에 빠진 순간 조작 UI 가 깜빡이는
    // 것은 "나갈 길을 못 찾는다" 는 이 기능의 실패 모드 그 자체다.
    // 지금 그런 플리커가 날 근거는 없지만, **없을 근거가 있다는 것과 검사가 본다는 것은
    // 다른 일이다.** 한 번이라도 안 보이면 그 값이 남는다.
    let hud = 'unknown', map = 'unknown';
    const worst = (prev, now) => (prev === 'unknown' || prev === 'shown' ? now : prev);
    for (let i = 0; i < SINK_TICKS; i++) {
      await page.waitForTimeout(TICK_MS);
      const p = await probe(page);
      const s = num(p.submersion) ?? 0;
      if (s >= peak) { peak = s; overlayAtPeak = p.overlay; }
      hud = worst(hud, p.hud);
      map = worst(map, p.map);
    }
    await drive(page, 'move', 0, 0);
    log(`최대 잠김: ${peak} · overlay="${overlayAtPeak}" · hud=${hud} map=${map}`);

    // ── ③ 되돌아 나오기 — **갇히지 않는가** ──────────────────────────────────
    // 이것이 `SWIM_SPEED_MULT` 를 0 으로 두지 않은 이유를 브라우저에서 확인하는 자리다.
    // 이 프로젝트에는 리스폰이 없어 걸어 나오는 것이 유일한 탈출로다.
    await drive(page, 'move', 0, 1);
    let backOut = false;
    let endOverlay = null;
    let returnTicks = null;
    for (let i = 1; i <= RETURN_TICKS; i++) {
      await page.waitForTimeout(TICK_MS);
      const p = await probe(page);
      if (num(p.submersion) === 0) { backOut = true; endOverlay = p.overlay; returnTicks = i; break; }
    }
    await drive(page, 'move', 0, 0);
    // 복귀 틱을 남긴다(검수관 비블로커) — ⓔ 가 FAIL 일 때 "못 나왔다" 와 "느리게
    // 나왔다" 를 가르는 유일한 수치다.
    log(`복귀: ${backOut ? `${returnTicks}틱` : `실패(${RETURN_TICKS}틱 상한)`} · overlay="${endOverlay}"`);

    // ── 판정 (검수관 명세 ⓐ~ⓔ) ──────────────────────────────────────────────
    const bad = [];
    if (!(peak > SINK_TARGET)) bad.push(`ⓐ 잠김이 ${SINK_TARGET} 를 못 넘었다(최대 ${peak})`);
    if (errors.length) bad.push(`ⓑ 콘솔 에러 ${errors.length}건`);
    // 인라인 opacity 는 문자열이다. `"0"`·빈 문자열·`null` 이면 안 칠해진 것이다.
    if (!(overlayAtPeak && overlayAtPeak !== '0' && Number(overlayAtPeak) > 0)) {
      bad.push(`ⓒ 물속인데 오버레이 opacity 가 "${overlayAtPeak}" 다`);
    }
    if (hud !== 'shown') bad.push(`ⓓ HUD 가 ${hud}`);
    if (map !== 'shown') bad.push(`ⓓ 미니맵이 ${map}`);
    if (!backOut) bad.push('ⓔ 뭍으로 못 돌아왔다 — 물에 갇힌다');
    else if (endOverlay && endOverlay !== '0' && Number(endOverlay) > 0) {
      bad.push(`ⓔ 뭍인데 오버레이가 남아 있다(opacity ${endOverlay})`);
    }

    return {
      pass: bad.length === 0,
      reason: bad.join(' · '),
      peak, ticksToWater, overlayAtPeak, hud, map, backOut, returnTicks, errors,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
// 단독 실행(`npm run measure:submerge`)일 때만 자기가 빌드·서버·브라우저를 세운다.
// 스모크 하네스에서 부를 때는 위 `runSubmerge` 를 직접 쓴다(`measure-invariants.mjs` 규약).
async function cli() {
  console.log('=== 물빠짐 상호작용 게이트 ===\n');
  assembleSiteVite(SITE_DIR);
  // **`BASE_PATH` 를 반드시 넘긴다.** 처음에 빠뜨렸더니 서버가 그 접두어를 안 붙여
  // `…/openartshow/app/world2.html` 이 404 였고, 증상은 "`__world2` 가 60초 안에 안
  // 뜬다" 로만 보였다 — 원인과 한참 떨어진 자리에서 나타난다.
  const { origin, close: closeServer } = await startServer(SITE_DIR, BASE_PATH);
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS, headless: true,
  });
  try {
    const r = await runSubmerge({ browser, origin, basePath: BASE_PATH });
    console.log('');
    console.log(r.pass ? '  ✓ PASS — 물에 들어갔다 나왔고 화면·조작이 온전하다.' : `  ✗ FAIL — ${r.reason}`);
    console.log(`    진입 ${r.ticksToWater}틱 · 최대 잠김 ${r.peak} · overlay "${r.overlayAtPeak}"`);
    console.log(`    hud=${r.hud} map=${r.map} 복귀=${r.backOut}${r.returnTicks ? ` (${r.returnTicks}틱)` : ""}`);
    for (const e of r.errors.slice(0, 10)) console.log(`    에러: ${e}`);
    process.exitCode = r.pass ? 0 : 1;
  } finally {
    await browser.close().catch(() => {});
    await closeServer().catch(() => {});
  }
}

// `import.meta.main` 은 Node 20 에 없다. argv 로 판별한다.
if (process.argv[1] && process.argv[1].endsWith('measure-submerge.mjs')) {
  cli().catch((e) => { console.error(`측정 실패(판정 아님): ${e.message}`); process.exit(2); });
}
