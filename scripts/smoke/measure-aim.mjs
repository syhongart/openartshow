#!/usr/bin/env node
// 조준 화면 게이트 — **재캐스트 횟수와 확정 조건을 브라우저에서 실제로 잰다** (W8-6).
//
// 감독 지시 2026-08-17: *"조준 화면 그것도 해줘"*. 팀장 판정 (B).
//
// ── 🔴 왜 이 축이 필요한가 — 잴 수 있는 것이 이것뿐이다 ─────────────────────
// 조준 화면은 「지금 벽에 맞았는가」를 **실시간으로** 보여주고, 그 판정은 확정 경로와
// 같은 함수(`pickFace()`)를 탄다. 그런데 그 함수가 싸지 않다 — `systems/instancing.ts`
// 의 `refreshBounds()` 가 **풀 용량 전체**를 돌고, 미사용 슬롯이 `ZERO` 행렬이라 three 의
// 경계구 사전 필터가 거의 항상 통과한다. 근거·수치는 `frontend/js/world2/decide/aim.ts`
// 헤더 한 곳이다 — 여기에 다시 적지 않는다.
//
// **그 비용을 시간으로 잴 방법이 이 저장소에 없다.** 프레임 시간을 일부러 안 재고
// (swiftshader 는 실기기와 무관) `scripts/smoke/` 에 시간 측정이 0건이다. 그래서 시간
// 대신 **횟수**를 잰다 — 「몇 번 쏘는가」는 이산이고, 개수 불변식과 같은 부류다.
//
// ⚠⚠ **이것은 대리 축이다.** 횟수가 상한 안이어도 한 번이 느리면 화면은 버벅인다.
// 성능 판정은 **감독 실기기가 유일**하다 — 이 게이트의 PASS 를 「성능 통과」로 적지 않는다.
//
// ── 성능 게이트가 아니다 ────────────────────────────────────────────────────
// `[7][7.6][8]` 이 CI 에서 `observe` 인 근거는 «러너 성능 편차의 거짓 FAIL» 인데, 여기서
// 재는 것은 **횟수**이고 이산이다. 정지 상태에서 재캐스트 조건이 서 있으면 델타가 정확히
// 0 이고, 없으면 프레임마다 는다 — 그 사이에 편차가 들어올 자리가 없다. `[11]`·`[11.5]`
// 와 같은 부류이고 `perfStatus`/`perfLabel` 을 쓰지 않는다.
//
// ── ⚠ 거짓 FAIL 위험 — 정직하게 적는다 ─────────────────────────────────────
// ① **도달 축(`reached`)은 월드 기하에 의존한다.** 마을 배치는 시드 고정이라 결정적이지만
//    (`decide/parcel-layout.ts`: *"같은 (px,pz)는 언제나 같은 배치를 낸다"*), 배치 규칙을
//    바꾸는 회차에는 이 축이 **정당하게** 빨간불이 될 수 있다. 그때는 게이트를 고치는 것이
//    아니라 **팀장 재상신**이다 — `wallPose`/`WALL_MAX_TILT` 또는 월드 기하 문제다.
// ② **콘솔 에러 축은 개수가 아니다.** `[11.5]` 헤더가 같은 경고를 갖는다 — 편집 화면에서만
//    나는 산발적 에러가 거짓 FAIL 이 될 창이 있고, 그 폭은 아직 안 쟀다.
//
// ── 이 게이트가 **못 잡는 것** ──────────────────────────────────────────────
// - CPU 시간(위). - 조준선이 화면에 **보이는지**(DOM 존재만 본다 — 픽셀은 안 본다).
// - 실기기 터치·WebGPU. - 사람이 그 자세를 실제로 찾아내는가(화면 문제, 감독 판정).

import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
import { SITE_DIR, BASE_PATH, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS } from './config.mjs';
import { assembleSiteVite } from './assemble.mjs';

/** 한 자세에서 다음 자세로 넘어가며 조준 루프가 한 번 돌 시간. `AIM_MIN_MS`(80) + 여유 */
const SETTLE_MS = 180;
/** 정지 상태를 관찰하는 시간. 이 동안 재캐스트가 **하나도** 늘면 안 된다 */
const IDLE_MS = 2500;
/** 도달 탐색 — 한 바퀴를 몇 등분하나 */
const YAW_STEP = 15;

export async function runAim({ browser, origin, basePath, log = () => {} }) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  try {
    await page.goto(`${origin}${basePath}app/world2.html?edit=1`, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(
      () => window.__world2?.stats?.()?.overlay?.state === 'ready', null, { timeout: 90000 },
    );
    await page.click('#w2-edit .toggle');
    await page.waitForFunction(
      () => document.getElementById('w2-edit')?.dataset.mode === 'edit', null, { timeout: 15000 },
    );

    const aimOf = () => page.evaluate(() => window.__world2.stats()?.overlay?.aim ?? null);
    const artOf = () => page.evaluate(() => window.__world2.stats()?.overlay?.art?.frames ?? -1);

    // 진단 문이 없으면 **못 잰 것**이다 — 통과로 적지 않는다.
    if (await aimOf() === null) {
      return { pass: false, reason: 'stats().overlay.aim 이 없다 — 진단 문이 안 열렸다', errors };
    }

    // ── 조준을 연다 ────────────────────────────────────────────────────────
    const png = await page.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 300; c.height = 100;
      const g = c.getContext('2d');
      g.fillStyle = '#6cf'; g.fillRect(0, 0, 300, 100);
      const b = await new Promise((r) => c.toBlob(r, 'image/png'));
      return Array.from(new Uint8Array(await b.arrayBuffer()));
    });
    await page.setInputFiles('#w2-edit input[type=file]', {
      name: 'aim-gate.png', mimeType: 'image/png', buffer: Buffer.from(png),
    });
    await page.waitForTimeout(SETTLE_MS * 3);

    // 조준 화면이 실제로 떴고 **패널이 접혔는가.** 이 회차의 존재 이유가 그것이다 —
    // 화면 한가운데가 패널에 덮여 있으면 조준 자체가 성립하지 않는다.
    const ui = await page.evaluate(() => {
      const aim = document.getElementById('w2-aim');
      const panel = document.getElementById('w2-edit');
      const body = panel?.querySelector('.body');
      const el = document.elementFromPoint(
        Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2),
      );
      return {
        on: aim?.dataset.on === '1',
        cross: !!aim?.querySelector('.cross'),
        folded: !!body && getComputedStyle(body).display === 'none',
        centerInPanel: !!(panel && el && panel.contains(el)),
      };
    });
    if (!ui.on || !ui.cross) {
      return { pass: false, reason: '조준 화면이 안 떴다(#w2-aim)', ui, errors };
    }

    // ── 축 ① 정지 상태에서 재캐스트가 **안 는다** ───────────────────────────
    const idle0 = (await aimOf()).casts;
    await page.waitForTimeout(IDLE_MS);
    const idle1 = (await aimOf()).casts;

    // ── 축 ② 벽을 찾을 수 있는가(도달 가능성) ──────────────────────────────
    let reached = false;
    for (let i = 0; i < Math.round(360 / YAW_STEP); i++) {
      await page.evaluate((d) => window.__world2.look(d, 0), YAW_STEP);
      await page.waitForTimeout(SETTLE_MS);
      if ((await aimOf()).hit) { reached = true; break; }
    }

    // ── 축 ③ 히트가 **아닐 때** 확정이 막히는가 ─────────────────────────────
    // 벽에서 벗어난 자세를 만든 뒤 「여기 걸기」를 누른다. 걸리면 팀장 조건 1 위반이다.
    let blocked = null;
    for (let i = 0; i < Math.round(360 / YAW_STEP); i++) {
      await page.evaluate((d) => window.__world2.look(0, d), 30);   // 하늘을 본다
      await page.waitForTimeout(SETTLE_MS);
      if (!(await aimOf()).hit) break;
    }
    if (!(await aimOf()).hit) {
      const before = await artOf();
      await page.click('#w2-aim .bar button');
      await page.waitForTimeout(SETTLE_MS * 4);
      blocked = (await artOf()) === before;
    }

    const pass = idle1 === idle0 && reached && blocked === true && errors.length === 0;
    return {
      pass, ui, reached, blocked, idle: { before: idle0, after: idle1 }, errors,
      reason: pass ? '' : [
        idle1 !== idle0 && `정지 ${IDLE_MS}ms 에 재캐스트 ${idle1 - idle0}회 — 가만히 있는데 쏜다`,
        !reached && '한 바퀴를 돌아도 벽을 한 번도 못 찾았다 — wallPose/월드 기하를 본다(팀장 재상신)',
        blocked === false && '히트가 아닌데 확정됐다 — 팀장 조건 1 위반((B) 가 (C) 로 무너진 것)',
        blocked === null && '하늘을 보는 자세를 못 만들어 확정 차단을 못 쟀다',
        errors.length > 0 && `콘솔 에러 ${errors.length}건`,
      ].filter(Boolean).join(' · '),
    };
  } finally {
    log('');
    await page.close();
  }
}

// ── 단독 실행 ───────────────────────────────────────────────────────────────
// `npm run measure:aim`. 스모크가 FAIL 을 낼 때 여기서 혼자 돌려 본다.
//
// ⚠ **`BASE_PATH` 를 반드시 넘긴다** — 안 넘기면 서버가 접두어를 안 붙여 404 가 나고,
// 증상은 «`__world2` 가 안 뜬다» 로만 보인다. `measure-surface-textures.mjs` 와
// `measure-submerge.mjs` 가 각각 이 실수를 적어 두었다(둘 다 실제로 밟았다).
async function cli() {
  console.log('=== 조준 화면 게이트 ===\n');
  assembleSiteVite(SITE_DIR);
  const { origin, close: closeServer } = await startServer(SITE_DIR, BASE_PATH);
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS, headless: true,
  });
  try {
    const r = await runAim({ browser, origin, basePath: BASE_PATH });
    console.log('');
    console.log(r.pass
      ? `  ✓ PASS — 정지 재캐스트 0 · 벽 도달 ✓ · 비히트 확정 차단 ✓`
      : `  ✗ FAIL — ${r.reason}`);
    console.log(`    ui=${JSON.stringify(r.ui)} idle=${JSON.stringify(r.idle)}`);
    for (const e of (r.errors ?? []).slice(0, 10)) console.log(`    에러: ${e}`);
    process.exitCode = r.pass ? 0 : 1;
  } finally {
    await browser.close().catch(() => {});
    await closeServer().catch(() => {});
  }
}

if (process.argv[1] && process.argv[1].endsWith('measure-aim.mjs')) {
  cli().catch((e) => { console.error(`측정 실패(판정 아님): ${e.message}`); process.exit(2); });
}
