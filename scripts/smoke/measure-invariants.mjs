#!/usr/bin/env node
// 성능 불변식 상시 게이트 — **개수가 상수인가.** (감독 지시 2026-07-29)
//
// ── 무엇을 지키는 게이트인가 ─────────────────────────────────────────────────
// 감독 지시: *"개발할때 성능 확보, 성능 유지하는게 모니터링하도록 해."*
//
// world1 실기기 CSV 76.5초가 원인을 확정했다. 파이프라인이 **60 → 227 로 단조증가**했고,
// 크게 늘어난 프레임이 곧 프리즈 프레임이었다:
//
//   t=23.8  stage 없음 · stage_ms 0 · pk_tri 7,691   ← 조립도 아니고 삼각형도 적은데
//           render_ms 3,677 · pipe 130→153(+23)      ← 렌더가 3.7초, 새 파이프라인 23개
//
// **"양"이 아니라 "새 조합이 처음 그려지는 것"이 비용이다.** 그래서 world1 에서 시도한
// 열 처방 중 양을 겨눈 여덟이 전부 무효였다(tri 절반 → fps 25→26, 텍스처 -58% → 불변,
// 그림자 OFF → 12회→12회). 들었던 둘은 개수를 고정한 것이었다.
//
// world2 는 부팅 때 전량 사전 할당하고 봉인해서 38 상수다. **이 게이트는 그 상수성이
// 깨지는 순간을 잡는다.** 깨지면 world1 이 겪은 것이 그대로 돌아온다.
//
// ── 왜 회전까지 도는가 ───────────────────────────────────────────────────────
// 같은 CSV 에서, **아무것도 새로 로드하지 않고 카메라만 돌렸을 때** 파이프라인이 늘었다:
//
//   t=40~65  yaw 90 고정   pipe 191 정체   fps 60
//   t=67.2   yaw →171      pipe →209       fps 10
//
// 회전은 스트리밍과 **독립된 증식 축**이다. 걷기만 시뮬하면 통째로 놓친다.
//
// ── 무엇을 안 재는가 (정직하게) ──────────────────────────────────────────────
// **프레임 시간을 재지 않는다.** 헤드리스는 swiftshader 라 절대 시간이 실기기와 무관하고,
// 이 저장소는 그 수치로 실기기를 대신하려다 여러 번 틀렸다(오늘도 예열 비용에서 +21%가
// 실기기 0 이었다). 개수는 백엔드와 무관한 카운터라 헤드리스에서도 유효하다 — **잴 수
// 있는 것만 잰다.** 프레임 판정은 감독 실기기 리포트가 유일한 수단이고 그건 그대로 둔다.
//
// 파이프라인 수는 백엔드 의존이라 **참고값**으로만 찍는다(WebGL 프로그램 ≠ WebGPU 파이프라인).
// 통과·실패는 geometry·texture 로 가른다.
//
// ── 이 게이트가 **못 잡는 것** (뮤테이션으로 확인) ───────────────────────────
// 검출력을 확인하려고 파셀마다 새 지오메트리를 만드는 결함을 일부러 심었다. 두 번 심었고
// **결과가 갈렸다:**
//
//   ① y=200 (화면 밖), frustumCulled 기본  →  PASS (못 잡음)
//   ② 카메라 앞, frustumCulled=false        →  FAIL, geometry +28 (잡음)
//
// 이유는 오늘 예열 작업에서 배운 것과 같다 — three 의 `info.memory` 는 객체를 만들 때가
// 아니라 **처음 그릴 때** 오른다. 그래서 **화면에 한 번도 안 나오는 누수는 이 게이트에
// 안 보인다.** 그런 객체도 CPU 메모리와 GPU 자원을 먹지만 카운터에는 없다.
//
// 실용적으로는 큰 구멍이 아니다 — world1 을 무너뜨린 증식은 전부 화면에 그려지는
// 파츠였고, 안 그려지는 것은 애초에 프레임을 안 먹는다. 다만 **"개수 상수 = 누수 없음"
// 이 아니다.** 메모리 누수는 별도 수단으로 봐야 한다.
//
// 실행: `npm run measure:invariants` (약 2분)

import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
import {
  SITE_DIR, BASE_PATH, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS,
} from './config.mjs';
import { assembleSiteVite } from './assemble.mjs';

/** 회전 스텝 — 360°를 이 수로 나눠 돈다 */
const SPIN_STEPS = 12;
/** 한 스텝 뒤 렌더가 실제로 일어나게 기다리는 시간(ms). 헤드리스는 ~4fps다 */
const STEP_MS = 700;
/** 직진 구간 수. 파셀 경계를 여러 번 넘어야 스트리밍 증식이 드러난다 */
const WALK_LEGS = 6;
const WALK_MS = 1500;

const show = (v) => (v === undefined || v === null ? '측정실패(값 없음)' : String(v));

async function counts(page) {
  return page.evaluate(() => {
    const s = window.__world2?.stats?.();
    if (!s) return null;
    return {
      geo: s.frame?.geometries ?? null,
      tex: s.frame?.textures ?? null,
      pipe: s.pipelines ?? null,
      draw: s.frame?.draw ?? null,
      parcels: s.stream?.loaded ?? null,
      built: s.stream?.built ?? null,
    };
  });
}

/** `__world2` 조작 훅. 없으면 **측정 실패**다 — 조작 못 한 것을 통과로 적지 않는다. */
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
  if (!ok) throw new Error(`__world2.${fn}() 를 못 불렀다 — 조작 훅이 없어 세션 시뮬이 성립하지 않는다`);
}

/**
 * 게이트 본체. **브라우저·서버를 주입받는다** — 스모크 하네스가 이미 세워 둔 것을 다시
 * 세우면 vite 빌드가 한 번 더 돌고, 그 시간이 곧 "게이트를 안 돌리는 이유"가 된다.
 *
 * @param {{browser: import('playwright-core').Browser, origin: string, basePath: string,
 *          log?: (s: string) => void}} env
 * @returns {Promise<{pass: boolean, maxGeo: number, maxTex: number, maxPipe: number,
 *                    rows: unknown[], errors: string[], base: unknown}>}
 */
export async function runInvariants({ browser, origin, basePath, log = console.log }) {
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 640 } });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));

    // GLB 실험은 끈다 — 그 기능은 개수 불변식을 **일부러** 깨는 것이라 여기 섞이면
    // 게이트가 의미를 잃는다. NPC·VRM 도 끄고 코어 스트리밍만 본다.
    const url = `${origin}${basePath}app/world2.html?glb=0&npc=0&vrm=0&time=day&weather=clear`;
    log(`접속: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(() => !!window.__world2?.stats?.(), null, { timeout: 60000 });
    // 초기 파셀이 다 붙을 때까지. 부팅 중 개수가 오르는 것은 정상이므로 **기준선을
    // 그 뒤에 잡는다** — 안 그러면 정상 상승이 위반으로 찍힌다.
    await page.waitForTimeout(8000);

    const base = await counts(page);
    if (!base) throw new Error('stats() 를 못 읽었다 — 측정이 성립하지 않는다');
    log(`\n기준선  geo=${show(base.geo)} tex=${show(base.tex)} pipe=${show(base.pipe)} 파셀=${show(base.parcels)}\n`);

    const rows = [];
    const snap = async (label) => {
      const c = await counts(page);
      rows.push({ label, ...c });
      return c;
    };

    // ── ① 제자리 회전 — world1 이 여기서 무너졌다 ────────────────────────────
    log('[1] 제자리 360° 회전…');
    const stepRad = (Math.PI * 2) / SPIN_STEPS;
    for (let i = 0; i < SPIN_STEPS; i++) {
      await drive(page, 'look', stepRad, 0);
      await page.waitForTimeout(STEP_MS);
      await snap(`회전 ${Math.round(((i + 1) * 360) / SPIN_STEPS)}°`);
    }

    // ── ② 직진 — 파셀 경계를 여러 번 넘는다 ─────────────────────────────────
    log('[2] 직진 주행…');
    for (let i = 0; i < WALK_LEGS; i++) {
      await drive(page, 'move', 0, -1); // 전진
      await page.waitForTimeout(WALK_MS);
      await snap(`전진 ${i + 1}`);
    }
    await drive(page, 'move', 0, 0);

    // ── ③ 되돌아오기 — 언로드된 파셀을 다시 로드한다 ────────────────────────
    // **재방문이 핵심이다.** 슬롯 반납이 제대로 안 되면 여기서 개수가 오른다.
    log('[3] 되돌아오기(재방문)…');
    await drive(page, 'look', Math.PI, 0);
    await page.waitForTimeout(STEP_MS);
    for (let i = 0; i < WALK_LEGS; i++) {
      await drive(page, 'move', 0, -1);
      await page.waitForTimeout(WALK_MS);
      await snap(`복귀 ${i + 1}`);
    }
    await drive(page, 'move', 0, 0);
    await page.waitForTimeout(1500);
    await snap('정지');

    // ── 판정 ────────────────────────────────────────────────────────────────
    log('\n[결과] 기준선 대비 증가분 — 하나라도 + 면 증식이다\n');
    log('  구간              geo   tex  pipe   draw  파셀');
    let maxGeo = 0, maxTex = 0, maxPipe = 0;
    for (const r of rows) {
      const d = (b, v) => (b == null || v == null ? '  ?' : (v - b > 0 ? `+${v - b}` : '  '));
      if (base.geo != null && r.geo != null) maxGeo = Math.max(maxGeo, r.geo - base.geo);
      if (base.tex != null && r.tex != null) maxTex = Math.max(maxTex, r.tex - base.tex);
      if (base.pipe != null && r.pipe != null) maxPipe = Math.max(maxPipe, r.pipe - base.pipe);
      log(
        `  ${r.label.padEnd(16)} ${show(r.geo).padStart(4)}${d(base.geo, r.geo)} `
        + `${show(r.tex).padStart(4)}${d(base.tex, r.tex)} `
        + `${show(r.pipe).padStart(4)}${d(base.pipe, r.pipe)} `
        + `${show(r.draw).padStart(6)} ${show(r.parcels).padStart(5)}`,
      );
    }

    log('\n[판정]\n');
    log(`  geometry  최대 증가 ${maxGeo >= 0 ? '+' : ''}${maxGeo}`);
    log(`  texture   최대 증가 ${maxTex >= 0 ? '+' : ''}${maxTex}`);
    log(`  pipeline  최대 증가 ${maxPipe >= 0 ? '+' : ''}${maxPipe}  (참고 — 백엔드 의존)`);

    // 통과·실패는 백엔드 무관 카운터로만 가른다.
    const pass = maxGeo <= 0 && maxTex <= 0 && errors.length === 0;
    if (pass) {
      log('\n  ✓ PASS — 회전·주행·재방문 내내 개수가 상수다.');
    } else if (maxGeo > 0 || maxTex > 0) {
      log('\n  ✗ FAIL — 세션 중 개수가 늘었다. **world1 이 겪은 증식이 돌아왔다.**');
      log('    위 표에서 어느 구간에 + 가 붙었는지가 원인 지점이다:');
      log('      회전 구간   → 시야에 따라 새 조합이 생긴다(재질 변종·LOD tier 등)');
      log('      전진 구간   → 스트리밍이 객체를 새로 만든다(슬롯 방식이 깨짐)');
      log('      복귀 구간   → 슬롯 반납이 안 되어 재방문마다 쌓인다');
    }
    if (maxPipe > 0 && maxGeo <= 0 && maxTex <= 0) {
      // 이 조합은 "지오·텍스처는 그대로인데 파이프라인만 늘었다" — 재질 **구조**가
      // 바뀌는 경로가 생겼다는 뜻이다. WebGL 에서도 잡히면 실기기(WebGPU)에서는 더 크다.
      log('\n  ⚠ 경고 — geometry·texture 는 상수인데 pipeline 이 늘었다.');
      log('    재질 구조 신호(맵 유무·transparent·조명 수)가 런타임에 바뀌는 경로가 있다.');
      log('    world1 을 무너뜨린 것이 정확히 이 축이다. FAIL 은 아니지만 반드시 본다.');
    }

    log(`\n  콘솔 에러 ${errors.length}건${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
    await context.close();
    return { pass, maxGeo, maxTex, maxPipe, rows, errors, base };
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
// 단독 실행(`npm run measure:invariants`)일 때만 자기가 빌드·서버·브라우저를 세운다.
// 스모크 하네스에서 부를 때는 위 `runInvariants` 를 직접 쓴다.
async function cli() {
  console.log('=== 성능 불변식 게이트 (개수 상수성) ===\n');
  assembleSiteVite(SITE_DIR);
  const { origin, close: closeServer } = await startServer(SITE_DIR, BASE_PATH);
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS, headless: true,
  });
  try {
    const r = await runInvariants({ browser, origin, basePath: BASE_PATH });
    process.exitCode = r.pass ? 0 : 1;
  } finally {
    await browser.close();
    await closeServer();
  }
}

// `import.meta.main` 은 Node 20 에 없다. argv 로 판별한다.
if (process.argv[1] && process.argv[1].endsWith('measure-invariants.mjs')) {
  cli().catch((e) => { console.error(`측정 실패(판정 아님): ${e.message}`); process.exit(2); });
}
