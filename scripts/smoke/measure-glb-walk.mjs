#!/usr/bin/env node
// world7·world8 의 **걷기**를 브라우저로 재고 판정한다 — 지면·벽·방향·조이스틱.
//
// ── 왜 있나 (감독 지시 2026-08-26) ──────────────────────────────────────────
// *"월드8에 월드 2의 기본 기능 다 들어가야지"* · *"월드 7도 동일하게 되어야해"*.
// 두 페이지는 `js/glb-world.js` **한 벌**을 쓰므로 여기서 world7 을 재면 world8 도
// 같은 코드를 잰 것이다. 다만 world7 은 **고른 파일**(blob URL) 경로라 갈래가 다르므로
// 이쪽으로 연다.
//
// ⚠ **이것은 게이트가 아니다.** CI 에 안 물려 있고 배포를 막지 않는다. `measure-*` 와
// 같은 지위의 진단 도구다. 다만 진단 도구도 **판정은 한다**.
//
// ── 🔴 이 파일의 앞 판본은 **장식이었다** (뮤테이션 실측, 2026-08-26) ────────
// 벽 검사를 14m 에서 시작해 8초 밀었는데, 헤드리스는 그 사이 3.1m 밖에 못 가고 벽은
// 3.6m 앞이었다 — **벽 판정을 통째로 꺼도(`blocked` 가 늘 false) 초록이었다.**
// 그전 판본은 벽이 54m 앞이었고 역시 자동 통과였다. 두 번 다 「닿지도 않은 채 통과」다.
//
// 지금은 **벽 표면 코앞**(10.95m — 정지 거리 10.85m 바로 밖)에서 시작한다. 그래야
// 정상과 뮤턴트가 갈린다. 실측:
//
//   베이스라인            10.9m 부근 유지        PASS
//   M1 이동 부호 뒤집기    14.08m (뒤로 감)      FAIL ✓
//   M2 벽 판정 끄기        7.50m (벽을 통과)     FAIL ✓
//
// **새 검사를 만들면 그 자리에서 뮤테이션 1회** — 팀장 구속 규율(2026-08-26).
// 「움직였다」가 아니라 **어느 방향으로 얼마나**를 단언한다.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
// · 감독 실기기(WebGPU) — 헤드리스는 WebGL 이다.
// · **CSS transition 의 최종 모습** — 이 환경은 프레임이 느려 전이가 진행되지 않고
//   `getComputedStyle` 이 시작값에 머문다(world2 대조군으로 확인). 그래서 조이스틱은
//   `opacity` 가 아니라 **전이 목표값**으로 본다.
// · 시각 회귀 · 성능 · 삼각형 단위 충돌 정밀도.
//
//   사용: node scripts/smoke/measure-glb-walk.mjs
import { startServer } from './server.mjs';
import { launchBrowser } from './browser-checks.mjs';
import { assembleSiteVite } from './assemble.mjs';
import { SITE_DIR, BASE_PATH } from './config.mjs';
const GLB = new URL('../../frontend/assets/worlds/world2-blender-edit.glb', import.meta.url).pathname;
let fails = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗'} ${m}`); if (!c) fails++; };

assembleSiteVite(SITE_DIR);
const { origin, close } = await startServer(SITE_DIR, BASE_PATH);
const browser = await launchBrowser();
const errs = [], perrs = [], info = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 560 }, hasTouch: true });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); if (m.type() === 'info') info.push(m.text()); });
  page.on('pageerror', (e) => perrs.push(String(e)));

  console.log('(가) world7 부팅 → 파일 고르기');
  await page.goto(`${origin}${BASE_PATH}/app/world7.html`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator('#pickBtn').waitFor({ state: 'visible', timeout: 60_000 });
  await page.locator('#file').setInputFiles(GLB);
  await page.waitForFunction(() => window.__glbWorld?.pose?.().ready === true, null, { timeout: 600_000 });
  const p0 = await page.evaluate(() => window.__glbWorld.pose());
  console.log('    pos :', JSON.stringify(p0.pos), '· fly:', p0.fly, '· 근처:', p0.near);
  console.log('    준비 로그:', info.filter((t) => t.includes('충돌 준비')).join(' | ') || '(없음)');
  ok(p0.near > 0, '충돌 판정기가 돈다 (근처 메시 목록이 채워졌다)');
  ok(p0.fly === false, '기본이 걷기다');
  ok(p0.pos.y > 0 && p0.pos.y < 10, `지면 위에 섰다 (y=${p0.pos.y})`);

  // ── (나) 벽 ──────────────────────────────────────────────────────────────
  // ⚠ **앞 판본은 장식이었다**(뮤테이션 실측): 벽 판정을 통째로 꺼도 초록이었다.
  // 14m 에서 시작해 8초를 미는데 헤드리스는 3.1m 밖에 못 가고 벽은 3.6m 앞이라
  // **뮤턴트도 벽에 닿기 전에 시간이 끝났다.** 「벽 54m 앞에서 자동 통과」와 같은 형태다.
  //
  // 그래서 **벽 표면 바로 앞**(정지 거리 10.85m 의 코앞인 10.95m)에서 시작한다.
  //   정상  : 10.85 부근에서 더 못 간다  → r 이 거의 그대로
  //   뮤턴트: 벽을 지나 안으로 들어간다   → r 이 확 줄어든다
  console.log('\n(나) 벽에 막히는가 — **벽 표면 바로 앞**에서 민다');
  await page.evaluate(() => { window.__glbWorld.moveTo(0, 2.0, 10.95); window.__glbWorld.lookAt(0); });
  await page.waitForTimeout(500);
  const wallStart = Math.hypot(0, 10.95);
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await page.waitForTimeout(8000);
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));
  const p1 = await page.evaluate(() => window.__glbWorld.pose());
  const r = Math.hypot(p1.pos.x, p1.pos.z);
  console.log('    pos :', JSON.stringify(p1.pos), `· 중심까지 ${r.toFixed(2)}m (시작 ${wallStart.toFixed(2)}m)`);
  ok(r > 10.5, `벽을 뚫지 않았다 — ${r.toFixed(2)}m (받침 10.4 + 사람 0.45 = 10.85)`);

  console.log('\n(나-2) 방향 — 벽이 없는 쪽으로는 실제로 **앞으로** 가는가');
  await page.evaluate(() => { window.__glbWorld.moveTo(0, 2.0, 60); window.__glbWorld.lookAt(0); });
  await page.waitForTimeout(400);
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await page.waitForTimeout(4000);
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));
  const p1b = await page.evaluate(() => window.__glbWorld.pose());
  console.log('    z: 60 →', p1b.pos.z.toFixed(2));
  ok(p1b.pos.z < 59, `전진이 **중심 쪽**이다 (60 → ${p1b.pos.z.toFixed(2)})`);

  console.log('\n(다) 조이스틱');
  await page.evaluate(() => {
    const t = new Touch({ identifier: 1, target: document.body, clientX: 200, clientY: 400 });
    dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true }));
  });
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => {
    const b = document.getElementById('gw-stick');
    if (!b) return null;
    const a = b.getAnimations();
    let target = null;
    for (const x of a) { try { const kf = x.effect.getKeyframes(); if (x.transitionProperty === 'opacity') target = String(kf[kf.length - 1].opacity); } catch {} }
    return { on: b.getAttribute('data-on'), left: b.style.left, anims: a.map((x) => x.transitionProperty ?? '?'), target };
  });
  console.log('   ', JSON.stringify(st));
  ok(st?.on === '1', '손잡이가 켜졌다');
  ok(st?.target === '1', '전이 목표값이 1이다');

  console.log('\n(라) 「다른 파일」 버튼 — world7 고유 기능이 살아 있는가');
  const again = await page.evaluate(() => !document.getElementById('again')?.hidden);
  ok(again === true, '「다른 파일」 버튼이 남아 있다');

  await ctx.close();
  console.log(`\n  ${errs.length === 0 ? '✓' : '✗'} 콘솔 에러 ${errs.length}${errs.length ? ' | ' + errs.slice(0, 3).join(' | ') : ''}`);
  if (errs.length) fails++;
  console.log(`  ${perrs.length === 0 ? '✓' : '✗'} pageerror ${perrs.length}${perrs.length ? ' | ' + perrs.slice(0, 2).join(' | ') : ''}`);
  if (perrs.length) fails++;
} finally { await browser.close(); await close(); }
console.log(`\n판정: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`);
process.exit(fails === 0 ? 0 : 1);
