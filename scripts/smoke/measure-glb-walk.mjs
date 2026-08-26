#!/usr/bin/env node
// world7·world8 의 **걷기**를 브라우저로 재고 판정한다 — 지면·벽·방향·조이스틱.
//
// ── 왜 있나 (감독 지시 2026-08-26) ──────────────────────────────────────────
// *"월드8에 월드 2의 기본 기능 다 들어가야지"* · *"월드 7도 동일하게 되어야해"*.
// 두 페이지는 `js/glb-world.js` **한 벌**을 쓴다. 다만 *"world7 을 재면 world8 도 잰
// 것"* 은 **거짓이다**(검수관 반려 B5) — world8 만 타는 갈래가 있다: `data-glb` 의 URL
// 해석 · 고르기 UI 부재 · 실패 시 «새로고침» 분기. 그리고 **감독이 느리다고 신고한
// 페이지가 world8 이다.** 검사 (라)의 `#again` 은 world7 전용 요소다.
// 여기서 재는 것은 **공유 코드**(걷기·충돌·조이스틱)이고 world8 고유 갈래는 안 잰다.
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
// **어느 커밋에서 잰 것인가: `6dffe704` 이후 재실행 확인**(검수관 조건 N3).
// ⚠ 표에 커밋을 적는 이유: B4 로 낡은 수치를 고치자마자 다음 커밋이 충돌 경로를 바꿔
// **표가 곧바로 다시 낡았다.** 값만 고치면 이 사고는 회차마다 재발한다.
// ⚠⚠ 「검사 로직을 안 바꿨으니 재실행 불필요」는 성립하지 않는다 — 검사가 보는 **대상의
// 행동**이 바뀌면 검출력은 다시 재는 것이 기본값이다(검수관 기각). 이번 회차에 그 경고가
// **세 번째로 실현됐다** — 자산의 조형물을 옮기자 (나)가 「아무것도 없는 자리를 밀며
// 벽을 단언」하게 됐고 실측 `9.74m` 로 exit 1 이 났다(검수관 반려 B1).
//
//                  (나) 받침까지   (나-2) z 60→   (나-3) Δx
//   베이스라인        10.92m ✓        57.83 ✓       **-2.49** ✓
//   M1 회전 부호      10.92m ✓        57.83 ✓       **+2.49** FAIL ✓
//   M2 벽 판정 제거   **8.75m** FAIL ✓   —             —
//
// ⚠ **앞 판본의 표는 「M1 부호 12.80m FAIL」이라고 적고 있었고, 그것이 이 검사가
// 부호 축을 본다는 인상을 만들었다 — 이번 실측으로 그것이 깨졌다.** 위 M1 행이
// 보여주듯 (나)·(나-2)는 **회전 항 부호 뒤집기를 하나도 못 잡는다.** 이유는 구조적이다:
// 둘 다 `lookAt(0)` 으로만 돌고 **yaw=0 에서는 `sin = 0` 이라 이동식의 sin 항이 통째로
// 죽는다.** 옛 표의 12.80m 는 **다른 형태의 뮤테이션**(전체 부호)을 잰 것이었고, 그 값이
// 남아 있는 동안 이 구멍은 덮여 있었다. 그래서 **(나-3)을 신설했다** — yaw=π/2 에서는
// `sin=1, cos=0` 이라 sin 항만 남는다.
//
// ⚠⚠ **(나)는 「막혔다」와 「아예 안 움직인다」를 여전히 구별하지 못한다**(검수관 B4).
// 베이스라인 이동량이 0.00m 라 정지 자체가 판정 근거가 되지 않는다. 상대 비교(자유
// 이동량 대비)로 바꾸는 것이 검수관 명세 G5 이고 **아직 다음 회차 과제다.**
// 다만 결함당 차단 케이스는 이제 M1→(나-3) 2건 · M2→(나) 1건이다.
//
// **새 검사를 만들면 그 자리에서 뮤테이션 1회** — 팀장 구속 규율(2026-08-26).
// 「움직였다」가 아니라 **어느 방향으로 얼마나**를 단언한다.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
// · 감독 실기기(WebGPU) — 헤드리스는 WebGL 이다.
// · **CSS transition 의 최종 모습** — 이 환경은 프레임이 느려 전이가 진행되지 않고
//   `getComputedStyle` 이 시작값에 머문다(world2 대조군으로 확인). 그래서 조이스틱은
//   `opacity` 가 아니라 **전이 목표값**으로 본다.
// · 시각 회귀 · 삼각형 단위 충돌 정밀도.
// · **이 커밋의 주 변경(인스턴싱)에 대한 단언이 0건이다**(검수관 B5) — `pose().render`
//   로 `calls`·`tris` 가 나오는데 검사가 안 읽는다. 인스턴싱이 통째로 사라져도 초록이다.
// · **거짓 FAIL 위험**: (나-2)는 9초에 1.85m 를 얻어 임계 1.0m 를 넘는다 — 여유가 임계의
//   85%뿐이고, 씬이 1.5배만 무거워지면 거짓 FAIL 이다. 이번 회차에 이미 4초 판본이
//   임계에 닿아 시간을 늘렸다.
// · ~~`RADIUS` 가 상수 안에 손으로 녹아 있다~~ → **해소(2026-08-26).** 받침 위치·반경은
//   GLB 의 JSON 청크에서, 사람 반경은 `glb-collide.js` 의 `export const RADIUS` 에서
//   **원산지 그대로** 읽는다(아래 `pillarOf`·`bodyRadius`). 조형물을 또 옮기거나 키워도
//   검사가 저절로 따라온다. 남은 전제: 받침 노드가 **부모 변환을 안 갖는다**(블렌더
//   export 는 루트에 둔다) · 노드 이름이 `blender-edit.py` 와 일치한다(틀리면 던진다).
//
//   사용: node scripts/smoke/measure-glb-walk.mjs
import { readFileSync } from 'node:fs';
import { startServer } from './server.mjs';
import { launchBrowser } from './browser-checks.mjs';
import { assembleSiteVite } from './assemble.mjs';
import { SITE_DIR, BASE_PATH } from './config.mjs';
const GLB = new URL('../../frontend/assets/worlds/world2-blender-edit.glb', import.meta.url).pathname;

// ── 🔴 벽 좌표를 **자산에서 유도한다** (검수관 반려 B1, 2026-08-26) ──────────
// 앞 판본은 벽이 원점에 있다고 **박아** 뒀다(`moveTo(0, 2.0, 10.95)` · `hypot(x, z)`).
// 그 벽은 블렌더 조형물의 받침인데, 같은 회차에 그것을 광장 밖 `(60, -60)` 으로 옮기자
// 검사가 **아무것도 없는 자리를 밀며 「벽을 뚫지 않았다」를 단언**하게 됐다 —
// 실측 `9.74m` FAIL(exit 1). 이 파일이 **세 번째**로 무효화된 형태다(헤더 표 참조:
// 54m 자동통과 → 3.6m 미달 → 이번 벽 소실).
//
// 값을 고치면 다음 회차에 또 낡는다. 그래서 **자산을 직접 읽어 유도한다** — GLB 의
// JSON 청크에서 받침 노드의 위치와 수평 반경을 얻으므로, 조형물을 또 옮기거나 키워도
// 검사가 저절로 따라온다. 사람 반경도 `glb-collide.js` 의 `RADIUS` 를 **원산지에서**
// 읽는다(검수관 P5: 그 값이 상수 안에 손으로 녹아 있었다).
//
// ⚠ **못 하는 것**: 노드가 부모 변환을 가지면 틀린다(블렌더 export 는 루트에 둔다).
// 받침 이름(`블렌더_받침`)은 `scripts/asset/blender-edit.py` 가 정하므로 그 이름을
// 바꾸면 여기서 잡힌다 — 조용히 통과하지 않고 **던진다.**
function readGlbJson(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('glTF 매직이 아니다');
  const len = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error('첫 청크가 JSON 이 아니다');
  return JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
}

/** 받침의 **월드 중심(x, z)** 과 **수평 반경**. 둘 다 자산에서 유도한다 */
function pillarOf(path, name = '블렌더_받침') {
  const g = readGlbJson(path);
  const node = (g.nodes ?? []).find((n) => n.name === name);
  if (!node) throw new Error(`GLB 에 '${name}' 노드가 없다 — blender-edit.py 의 이름과 맞는가`);
  const t = node.translation ?? [0, 0, 0];
  const sc = node.scale ?? [1, 1, 1];
  const prim = g.meshes?.[node.mesh]?.primitives?.[0];
  const acc = g.accessors?.[prim?.attributes?.POSITION];
  if (!acc?.min || !acc?.max) throw new Error(`'${name}' 의 POSITION accessor 에 min/max 가 없다`);
  // 수평 반경 — x·z 중 큰 쪽. 스케일을 곱한다.
  const rx = Math.max(Math.abs(acc.min[0]), Math.abs(acc.max[0])) * Math.abs(sc[0]);
  const rz = Math.max(Math.abs(acc.min[2]), Math.abs(acc.max[2])) * Math.abs(sc[2]);
  return { x: t[0], z: t[2], r: Math.max(rx, rz) };
}

/** 사람 반경 — `glb-collide.js` 가 원산지다. 값을 여기 적지 않는다 */
function bodyRadius() {
  const src = readFileSync(new URL('../../frontend/js/glb-collide.js', import.meta.url).pathname, 'utf8');
  const m = /export const RADIUS = ([\d.]+)/.exec(src);
  if (!m) throw new Error('glb-collide.js 에서 RADIUS 를 못 읽었다');
  return Number(m[1]);
}

const PILLAR = pillarOf(GLB);
const BODY_R = bodyRadius();
/** 이 거리에서 멈춰야 한다 — 받침 표면 + 사람 반경 */
const STOP = PILLAR.r + BODY_R;
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
  // 시작은 **정지 거리의 코앞**(+0.10m). yaw 0 은 -z 를 보므로 받침의 +z 쪽에 선다.
  const startZ = PILLAR.z + STOP + 0.10;
  console.log(`    받침 (${PILLAR.x.toFixed(1)}, ${PILLAR.z.toFixed(1)}) · 반경 ${PILLAR.r.toFixed(2)}m`
    + ` · 사람 ${BODY_R} → 정지 ${STOP.toFixed(2)}m · 시작 ${(STOP + 0.10).toFixed(2)}m`);
  await page.evaluate(([x, z]) => { window.__glbWorld.moveTo(x, 2.0, z); window.__glbWorld.lookAt(0); },
    [PILLAR.x, startZ]);
  await page.waitForTimeout(500);
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await page.waitForTimeout(8000);
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));
  const p1 = await page.evaluate(() => window.__glbWorld.pose());
  const r = Math.hypot(p1.pos.x - PILLAR.x, p1.pos.z - PILLAR.z);
  console.log('    pos :', JSON.stringify(p1.pos), `· 받침까지 ${r.toFixed(2)}m (시작 ${(STOP + 0.10).toFixed(2)}m)`);
  // 임계는 정지 거리에서 **유도한다** — 0.35m 는 한 프레임 관통 여유다(헤드리스 8초에
  // 자유 이동 1.85m ≈ 0.23m/s 이므로 1.5프레임분).
  ok(r > STOP - 0.35, `벽을 뚫지 않았다 — ${r.toFixed(2)}m (정지 ${STOP.toFixed(2)}m = 받침 ${PILLAR.r.toFixed(2)} + 사람 ${BODY_R})`);

  // ⚠ **기준을 느슨하게 하지 않고 시간을 늘린다.** 인스턴싱 도입 후 삼각형이 51만 →
  // 136만으로 늘어 헤드리스가 더 느려졌고(드로우콜은 10,856 → 39), 4초에 0.89m 라
  // `< 59` 를 못 넘겼다. 임계를 낮추면 M1(부호 뒤집기) 뮤테이션과의 간격이 좁아진다.
  // ⚠ 여기는 **원점 기준 그대로**다 — 조형물이 광장 밖으로 나가면서 이 경로(z 60→중심)는
  // 오히려 더 깨끗해졌다(막을 것이 없다). 위 (나)와 달리 이 검사는 「무엇에 막히는가」가
  // 아니라 「어느 방향으로 가는가」를 보므로 자산 좌표에 안 매인다.
  console.log('\n(나-2) 방향 — 벽이 없는 쪽으로는 실제로 **앞으로** 가는가');
  await page.evaluate(() => { window.__glbWorld.moveTo(0, 2.0, 60); window.__glbWorld.lookAt(0); });
  await page.waitForTimeout(400);
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await page.waitForTimeout(9000);
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));
  const p1b = await page.evaluate(() => window.__glbWorld.pose());
  console.log('    z: 60 →', p1b.pos.z.toFixed(2));
  ok(p1b.pos.z < 59, `전진이 **중심 쪽**이다 (60 → ${p1b.pos.z.toFixed(2)})`);

  // ── (나-3) **돌아선 채로** 전진 — 회전 항(sin)이 사는 유일한 자리 ──────────
  // ⚠ **이 검사가 없어서 M1(이동식 부호)이 검출되지 않았다**(실측 2026-08-26).
  // (나)·(나-2)는 둘 다 `lookAt(0)` 으로만 돌고, yaw=0 에서는 `sin = 0` 이라
  // 이동식의 **sin 항이 통째로 죽는다** — `tx = (ix·cos + iz·sin)` 에서 `iz·sin` 이
  // 0 이므로 그 항의 부호를 뒤집어도 결과가 **한 자리도 안 바뀐다.** 실측으로 확인했다:
  // 부호를 뒤집은 뮤턴트가 (나) 10.92m ✓ · (나-2) 60→57.83 ✓ 로 **둘 다 초록**이었다.
  //
  // 헤더 표의 옛 「M1 부호 12.80m FAIL」은 **다른 형태의 뮤테이션**(전체 부호)이었고,
  // 그것이 「부호 축을 본다」로 읽히면서 이 구멍을 덮고 있었다.
  //
  // yaw = π/2 로 돌리면 `sin = 1, cos = 0` 이라 sin 항만 남는다. 그 상태에서
  // 「어느 축으로 갔는가」를 본다 — 절대 좌표가 아니라 **부호**다.
  console.log('\n(나-3) 돌아선 채 전진 — 회전 항의 부호가 맞는가');
  await page.evaluate(() => { window.__glbWorld.moveTo(0, 2.0, 300); window.__glbWorld.lookAt(Math.PI / 2); });
  await page.waitForTimeout(400);
  const before3 = await page.evaluate(() => window.__glbWorld.pose());
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await page.waitForTimeout(9000);
  await page.evaluate(() => dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));
  const p1c = await page.evaluate(() => window.__glbWorld.pose());
  const dx = p1c.pos.x - before3.pos.x;
  const dz = p1c.pos.z - before3.pos.z;
  console.log(`    yaw π/2 · Δx ${dx.toFixed(2)} · Δz ${dz.toFixed(2)}`);
  // yaw=π/2 에서 전진(iz=-1)은 `tx = iz·sin = -1` → **-x 방향**이다.
  // 임계는 (나-2)와 같은 근거(9초 자유 이동 ≈ 1.85m)에서 절반을 여유로 잡는다.
  ok(dx < -0.9, `회전 항의 부호가 맞다 — Δx ${dx.toFixed(2)} (-x 로 가야 한다)`);
  ok(Math.abs(dz) < Math.abs(dx), `주 이동이 x 축이다 — |Δz| ${Math.abs(dz).toFixed(2)} < |Δx| ${Math.abs(dx).toFixed(2)}`);

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
