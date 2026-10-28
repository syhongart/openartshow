#!/usr/bin/env node
// measure-tri-quadrant.mjs — 팀장 조건 C2 (2026-09-04, G-W8N)
// 헤드리스에서 `renderer.info.render.triangles` 를 잔디·GLB·그림자 on/off 로 실측해 표를 만든다.
//
// 2026-09-05 실행 3회(world2 5행 · world8 6행 · world8 --gl-wrap 6행, 전부 EXIT 0)로 표를
// 만들었고 그 표는 `docs/BACKLOG.md` G-W8N 한 곳이다. 스크래치 초안을 편입한 것이다 —
// 재는 수단을 남기지 않으면 다음 사람이 같은 추정을 다시 한다.
//
// ── 읽는 경로 (근거) ─────────────────────────────────────────────────────────
//   world2 : `window.__world2.stats()`   (frontend/js/world2/main.ts:1254, 1313-1314)
//   world8 : `window.__glbWorld.stats()` (frontend/js/world-glb/main.ts:1065, 1127-1128)
//   두 트리의 `adapters/renderer.ts` 는 diff 0 이고 `frameStats()` 가 돌려주는 필드는
//   `{draw, tri, geometries, textures}` (renderer.ts:221-231), `pipelineCount()` 는 -1 이면 측정 실패.
//   stats().frame.tri  ← r.triangles / stats().frame.draw ← r.drawCalls ?? r.calls
//   stats().pipelines  ← WebGL: info.programs.length
//
// ── 카운터가 언제 리셋되는가 (설계의 전제) ──────────────────────────────────
//   `info.autoReset` 을 끄는 코드가 두 트리에 0건이다. three r171 WebGLRenderer.render() 는
//   `shadowMap.render(...)` **뒤**·메인 씬 렌더 **앞**에서 `info.reset()` 을 한다
//   (node_modules/three/build/three.module.js:15865-15871). 따라서
//     ① 프레임 사이(`page.evaluate`)에 읽으면 **직전 프레임 메인 패스** 값이 남아 있다 — 0 이 아니다.
//     ② **그림자 패스의 삼각형은 리셋에 지워진다** — `info.render.triangles` 로는 그림자 축을 못 잰다.
//        (`?shint=1` 행의 tri 가 기본 행과 같아도 「그림자 비용 0」이 아니라 「이 카운터로 못 잼」이다.)
//   ③ 헤드리스는 WebGL 폴백이다. 실기기 WebGPU 는 `render()` 안에 reset 이 없고 우리
//      `beginFrame()`(renderer.ts:216-219) 이 유일한 리셋이라 **그림자 패스가 포함**된다 —
//      같은 이름의 숫자가 두 백엔드에서 다른 것을 센다. 표에 백엔드를 함께 적는다.
//   `--gl-wrap` 옵션은 ②를 우회하려고 WebGL draw 호출을 직접 세는 실험 축이다(검증 안 됨).
//
// ── 실행 ───────────────────────────────────────────────────────────────────
//   node <이 파일> [--no-assemble] [--rows=world2,world8] [--gl-wrap] [--out=<json>]
//   `smoke:vite` 처럼 Bash 상한(10분)을 넘을 수 있다 — 조립 1회 뒤 `--no-assemble --rows=…`
//   로 **월드별로 나눠** 돌린다. 브라우저 검증은 한 번에 하나만(CLAUDE.md, 4코어·GPU 0).

import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const { startServer } = await import('./server.mjs');
const { SITE_DIR, BASE_PATH, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS } = await import('./config.mjs');
const { assembleSiteVite } = await import('./assemble.mjs');
const { waitForWorld2Ready } = await import('./world2-ready.mjs');

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const opt = (k, d) => { const a = argv.find((s) => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

/** 예열 rAF 수. kernel 은 rAF 기반(kernel.ts:106)이고 헤드리스 ~4fps 라 rAF 1회 ≈ 렌더 1회(캡 30fps 게이팅 미달). */
const WARM_FRAMES = Number(opt('warm', 30));
/** 표본 수 · 표본 간 rAF 간격 */
const SAMPLES = 3;
const SAMPLE_GAP_FRAMES = 2;

// ── 행 정의 ──────────────────────────────────────────────────────────────────
// 공통 조건: `weather=clear` 고정(sky.ts:101 기본도 clear — 강수 입자 배제), `time` 은 기본
// daylit(world2 main.ts:623 · world-glb main.ts:528), 스폰 `at` 기본(main.ts:471).
// 노브 근거:
//   grass=0  : stylizedOn(master, own) = (own ?? master) >= 0.5 (decide/stylized.ts:44)
//              STYLIZED_DEFAULT=1 (:34) → 기본 **켜짐**, `grass=0` 이면 create()→null (features/grass.ts:211)
//   glb=0    : 미술관 GLB(glb-city) — world-shared/glb-city.ts:265, DEFAULT_COPIES=1 (기본 켜짐)
//              ⚠ world8 의 «세계 GLB»(`<body data-glb>`, world8.html:487)는 **끄는 노브가 없다**
//   shint=1  : SHADOW_INTENSITY = readNum('shint', 0, 0, 1) (world-glb main.ts:167 · world2 main.ts:158)
//              → dir.castShadow = SHADOW_INTENSITY > 0 (main.ts:690 · world2:763) — 기본 **꺼짐**.
//              그러므로 「그림자 off」가 기본 행이고 「그림자 on」이 shint=1 행이다(팀장 표기의 역).
//   npc=0&vrm=0 : 둘 다 0 이어야 npc feature 가 꺼진다 (features/npc.ts:280, 713)
const ROWS = [
  { world: 'world2', label: 'world2 기본',            q: 'weather=clear' },
  { world: 'world2', label: 'world2 잔디off',         q: 'weather=clear&grass=0' },
  { world: 'world2', label: 'world2 미술관GLB off',   q: 'weather=clear&glb=0' },
  { world: 'world2', label: 'world2 잔디off+GLB off', q: 'weather=clear&grass=0&glb=0' },
  { world: 'world2', label: 'world2 그림자on(shint=1)', q: 'weather=clear&shint=1', shadowAxis: true },
  { world: 'world8', label: 'world8 기본',            q: 'weather=clear' },
  { world: 'world8', label: 'world8 잔디off',         q: 'weather=clear&grass=0' },
  { world: 'world8', label: 'world8 미술관GLB off',   q: 'weather=clear&glb=0' },
  { world: 'world8', label: 'world8 그림자on(shint=1)', q: 'weather=clear&shint=1', shadowAxis: true },
  { world: 'world8', label: 'world8 잔디off+그림자on', q: 'weather=clear&grass=0&shint=1', shadowAxis: true },
  { world: 'world8', label: 'world8 NPC off',         q: 'weather=clear&npc=0&vrm=0' },
];

// ── 브라우저 안에서 도는 코드 ──────────────────────────────────────────────────
/** 훅 이름. world2 는 `__world2`, world7/8 은 `__glbWorld`(main.ts:1065 — 두 페이지 공유 트리 이름). */
const HOOK = { world2: '__world2', world8: '__glbWorld' };

/** rAF n 회를 기다린다 — 시간이 아니라 프레임으로 센다(헤드리스 fps 가 회차마다 다르다). */
const waitFrames = (page, n) => page.evaluate((n) => new Promise((r) => {
  let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f);
}), n);

/** 한 번 읽는다. 없는 필드는 null — 0 과 «못 읽음» 을 가른다(measure-world2.mjs 의 `show` 규약). */
const readOnce = (page, hook) => page.evaluate((hook) => {
  const s = window[hook]?.stats?.();
  if (!s) return null;
  return {
    tri: s.frame?.tri ?? null,
    draw: s.frame?.draw ?? null,
    geo: s.frame?.geometries ?? null,
    tex: s.frame?.textures ?? null,
    pipe: s.pipelines ?? null,
    backend: s.backendDetail ?? s.backend ?? null,
    features: Array.isArray(s.features) ? s.features : null,
    // world8 만: GLB 정적 총합(glb-source.ts:183 — 인덱스 count/3 합) · 거리 컬링 on/total
    glbStaticTri: s.glb?.triangles ?? null,
    glbCellsOn: s.glbStream?.on ?? null,
    glbCellsTotal: s.glbStream?.total ?? null,
    glbTicks: s.glbStream?.ticks ?? null,
    // world2 만: 파셀 스트리밍 정착 판정
    streamPending: s.stream?.pending ?? null,
    streamLoaded: s.stream?.loaded ?? null,
    // 실험 축(--gl-wrap): initScript 가 rAF 프레임마다 갱신
    glWrapTri: window.__triWrap?.lastFrameTri ?? null,
    glWrapCalls: window.__triWrap?.lastFrameCalls ?? null,
  };
}, hook);

/**
 * (--gl-wrap) WebGL draw 호출을 감싸 프레임당 삼각형을 직접 센다 — 그림자 패스 포함.
 * ⚠ 검증 안 됨. 프레임 경계는 «우리 rAF 콜백 사이» 로 정의한다. kernel 의 rAF 와 같은
 * 프레임에 실행되므로 한 프레임의 렌더가 두 구간에 걸쳐 나뉠 수 있다 — 표본 3개 중앙값이
 * 그 흔들림을 얼마나 흡수하는지는 실측 뒤에만 말할 수 있다. mode: TRIANGLES=4,
 * TRIANGLE_STRIP=5, TRIANGLE_FAN=6 (three WebGLInfo.update 와 같은 규칙, three.module.js:4053-4064).
 */
const GL_WRAP_INIT = `(() => {
  const W = { curTri: 0, curCalls: 0, lastFrameTri: null, lastFrameCalls: null };
  window.__triWrap = W;
  const triOf = (mode, count) => mode === 4 ? count / 3 : (mode === 5 || mode === 6) ? Math.max(0, count - 2) : 0;
  const wrap = (proto) => {
    if (!proto) return;
    const p = (name, fn) => { const o = proto[name]; if (!o) return; proto[name] = function (...a) { fn(a); return o.apply(this, a); }; };
    p('drawArrays', ([mode, , count]) => { W.curCalls++; W.curTri += triOf(mode, count); });
    p('drawElements', ([mode, count]) => { W.curCalls++; W.curTri += triOf(mode, count); });
    p('drawArraysInstanced', ([mode, , count, inst]) => { W.curCalls++; W.curTri += triOf(mode, count) * inst; });
    p('drawElementsInstanced', ([mode, count, , , inst]) => { W.curCalls++; W.curTri += triOf(mode, count) * inst; });
  };
  wrap(window.WebGL2RenderingContext?.prototype);
  wrap(window.WebGLRenderingContext?.prototype);
  const tick = () => { W.lastFrameTri = W.curTri; W.lastFrameCalls = W.curCalls; W.curTri = 0; W.curCalls = 0; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})();`;

// ── 부팅 대기 ─────────────────────────────────────────────────────────────────
async function waitReady(page, world) {
  if (world === 'world2') {
    // GLB·VRM·오버레이를 상태로 기다린다(world2-ready.mjs). 파셀 스트리밍만 그 밖이라 pending 을 본다.
    const r = await waitForWorld2Ready(page);
    if (r.reason) throw new Error(r.reason);
    await page.waitForFunction(() => {
      const s = window.__world2?.stats?.();
      return !!s && s.stream && s.stream.pending === 0;
    }, null, { timeout: 60000 }).catch(() => { throw new Error('world2 stream.pending 이 0 이 되지 않았다'); });
    return;
  }
  // world8: `__glbWorld` 는 loading.dismiss()(main.ts:1007, 첫 프레임 그린 뒤) **다음**에
  // 할당된다(main.ts:1065) → 훅 존재 = 첫 프레임 완료. 로딩 DOM 도 확인한다(loading.ts:180
  // `dataset.state='done'`, world8.html:97 `#wg-loading[data-state="done"]`).
  await page.waitForFunction(() => !!window.__glbWorld?.stats?.(), null, { timeout: 120000 })
    .catch(() => { throw new Error('world8 부팅 실패 — __glbWorld.stats() 가 120s 안에 안 떴다'); });
  const st = await page.evaluate(() => document.querySelector('#wg-loading')?.dataset.state ?? null);
  if (st !== 'done') throw new Error(`world8 로딩 상태가 done 이 아니다: ${st}`);
  // 거리 컬링이 한 번은 돌아야 «on/total» 이 뜻을 가진다(glb-stream.ts:69-72: ticks===0 이면 아직 안 잼).
  await page.waitForFunction(() => (window.__glbWorld?.stats?.()?.glbStream?.ticks ?? 0) > 0, null, { timeout: 30000 })
    .catch(() => { throw new Error('world8 glbStream.ticks 가 0 — 거리 컬링이 아직 안 돌았다'); });
}

/** 노브가 실제로 먹었는지 — features 배열로 대조한다. 안 먹은 행은 «측정 실패» 다. */
function checkKnobs(row, sample) {
  const f = sample.features;
  if (!f) return '측정 실패: features 배열 없음';
  const q = new URLSearchParams(row.q);
  const bad = [];
  if (q.get('grass') === '0' && f.includes('grass')) bad.push('grass=0 인데 grass 기능이 켜져 있다');
  if (q.get('grass') !== '0' && !f.includes('grass')) bad.push('grass 기본인데 grass 기능이 없다(기본값이 바뀌었나)');
  if (q.get('glb') === '0' && f.includes('glb-city')) bad.push('glb=0 인데 glb-city 가 켜져 있다');
  if (q.get('npc') === '0' && f.includes('npc')) bad.push('npc=0&vrm=0 인데 npc 가 켜져 있다');
  return bad.length ? `측정 실패: ${bad.join(' · ')}` : null;
}

const median = (xs) => { const a = xs.filter((x) => x != null).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : null; };
const show = (v) => (v == null ? '못잼' : String(v));

async function measureRow(browser, origin, row, glWrap) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 640 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  if (glWrap) await page.addInitScript(GL_WRAP_INIT);
  const url = `${origin}${BASE_PATH}app/${row.world}.html?${row.q}`;
  const t0 = Date.now();
  const out = { ...row, url, samples: [], errors, note: null };
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    await waitReady(page, row.world);
    await waitFrames(page, WARM_FRAMES);
    for (let i = 0; i < SAMPLES; i++) {
      if (i) await waitFrames(page, SAMPLE_GAP_FRAMES);
      const s = await readOnce(page, HOOK[row.world]);
      if (!s) throw new Error(`${HOOK[row.world]}.stats() 를 못 읽었다`);
      out.samples.push(s);
    }
    const last = out.samples[out.samples.length - 1];
    out.note = checkKnobs(row, last);
    out.med = {
      tri: median(out.samples.map((s) => s.tri)),
      draw: median(out.samples.map((s) => s.draw)),
      geo: median(out.samples.map((s) => s.geo)),
      tex: median(out.samples.map((s) => s.tex)),
      pipe: median(out.samples.map((s) => s.pipe)),
      glWrapTri: median(out.samples.map((s) => s.glWrapTri)),
    };
    // tri 가 0 이면 «카운터가 리셋된 뒤 읽었다» 쪽이 먼저 의심된다 — 0 을 «삼각형 0» 으로 적지 않는다.
    if (out.med.tri === 0) out.note = (out.note ? out.note + ' · ' : '') + '측정 의심: tri=0(리셋 뒤 읽었을 수 있다 — 헤더 ① 참조)';
    if (out.med.pipe === -1) out.note = (out.note ? out.note + ' · ' : '') + 'pipe 측정 실패(-1)';
    out.backend = last.backend;
    out.ms = Date.now() - t0;
  } catch (e) {
    out.note = `측정 실패: ${e.message}`;
    out.ms = Date.now() - t0;
  } finally {
    await ctx.close();
  }
  return out;
}

function renderTable(results, glWrap) {
  const head = ['행', 'tri', 'calls', 'geo', 'tex', 'pipe', ...(glWrap ? ['glwrap tri'] : []), 'GLB정적tri', '셀on/total', '백엔드', '비고'];
  const lines = [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`];
  for (const r of results) {
    const m = r.med ?? {};
    const last = r.samples?.[r.samples.length - 1] ?? {};
    const cells = [
      r.label, show(m.tri), show(m.draw), show(m.geo), show(m.tex), show(m.pipe),
      ...(glWrap ? [show(m.glWrapTri)] : []),
      show(last.glbStaticTri), last.glbCellsOn != null ? `${last.glbCellsOn}/${last.glbCellsTotal}` : '해당없음',
      show(r.backend),
      [r.shadowAxis ? '⚠ WebGL info 는 그림자 패스를 안 센다(헤더 ②)' : null, r.note, r.errors?.length ? `콘솔에러 ${r.errors.length}` : null].filter(Boolean).join(' · ') || '',
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('', '못 끄는 축: world8 세계 GLB(노브 없음) · 하늘/구름(sky feature 는 create 가 항상 인스턴스 — features/sky.ts:61) · 지면.');
  return lines.join('\n');
}

async function main() {
  const rowsFilter = opt('rows', 'world2,world8').split(',');
  const rows = ROWS.filter((r) => rowsFilter.includes(r.world));
  const glWrap = flag('gl-wrap');
  if (!flag('no-assemble')) { console.log('[조립] vite build → _site …'); assembleSiteVite(SITE_DIR); }
  const { origin, close } = await startServer(SITE_DIR, BASE_PATH);
  const browser = await chromium.launch({ executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS, headless: true });
  const results = [];
  try {
    for (const row of rows) {
      console.log(`[측정] ${row.label}  ${row.q}`);
      const r = await measureRow(browser, origin, row, glWrap);
      console.log(`   → tri=${show(r.med?.tri)} calls=${show(r.med?.draw)} ${r.note ?? ''} (${r.ms}ms)`);
      results.push(r);
    }
  } finally {
    await browser.close();
    await close();
  }
  console.log('\n' + renderTable(results, glWrap));
  const outPath = opt('out', `/tmp/claude-0/-home-user-openartshow/10dfe60b-b9cb-5564-968f-1fa0c0d50697/scratchpad/tri-quadrant-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify({ warmFrames: WARM_FRAMES, samples: SAMPLES, glWrap, results }, null, 2));
  console.log(`\nJSON: ${outPath}`);
  process.exitCode = results.some((r) => r.note?.startsWith('측정 실패')) ? 2 : 0;
}

main().catch((e) => { console.error(`측정 실패(판정 아님): ${e.message}`); process.exit(2); });
