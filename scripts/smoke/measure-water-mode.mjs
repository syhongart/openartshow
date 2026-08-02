#!/usr/bin/env node
// 수면 구현 게이트 — **`?water=tsl` 을 켠 채로 월드가 뜨는가.**
//
// 감독 지시 2026-08-01: *"물은 이거쓰자. 지금 어색해"* (three `webgpu_backdrop_water`)
// · 팀장 조건 3: *"WebGL 폴백에서 터지지 않는지 스모크 축을 신설할 것"*.
//
// ── 왜 필요했나 — 실제로 터졌다 ────────────────────────────────────────────
// TSL 노드 물을 붙인 첫 판본은 헤드리스에서 **부팅 단계에 통째로 죽었다**:
//
//   resolveIncludes (WebGLProgram.js:261) ← new WebGLProgram ← acquireProgram
//     ← getProgram ← setProgram ← WebGLRenderer.renderBufferDirect
//
// 노드 재질(`MeshBasicNodeMaterial`)에는 `vertexShader` 문자열이 없다. 레거시
// `WebGLRenderer` 는 노드를 GLSL 로 낮출 경로가 아예 없어서, 그 undefined 를 그대로
// `.replace()` 하다 죽는다. 즉 **물만 안 보이는 게 아니라 월드가 안 뜬다.**
//
// `navigator.gpu` 가 없는 기기는 전부 이 경로다 — 헤드리스도, WebGPU 미지원 브라우저도.
// 그래서 `decide/water.ts` 의 `pickWaterMode` 가 백엔드를 보고 고르게 했고, 이 게이트가
// **그 폴백이 실제 브라우저에서 도는지** 본다.
//
// ── 단위 테스트가 못 보는 것을 본다 ────────────────────────────────────────
// `pickWaterMode` 자체는 `tests/world2-water.test.ts` 가 양쪽 가지를 다 돌린다. 하지만
// 그것은 **판정**이다. `ocean.create` 가 그 함수를 실제로 쓰는가(집행)는 거기서 안 걸린다
// — 누가 `const useTsl = true` 로 되돌려도 단위 테스트는 전부 초록이다. 이 저장소가
// 이름 붙인 *"판정/집행 분리의 구멍"* 이 정확히 그 형태다.
//
// ── 백엔드별 기대를 하드코딩하지 않는다 (설계의 핵심) ──────────────────────
// "헤드리스는 WebGL 이니 폴백이 정답" 이라고 적으면, GPU 러너가 붙는 날 이 게이트가
// **거짓 FAIL** 을 낸다(#170). 그래서 `stats().backend` 를 읽어 기대를 **그 자리에서
// 유도한다**:
//
//   backend === 'WebGPU'  → active 'tsl' · denied false   (TSL 물이 실제로 컴파일됐다)
//   그 밖              → active 'std' · denied true    (폴백이 돌았다)
//
// 이러면 러너가 바뀌는 것만으로 검사 대상이 저절로 반대편 가지로 넘어간다.
//
// ── 못 잡는 것 (정직하게) ──────────────────────────────────────────────────
// · **TSL 물이 예쁜가** — 룩 판정은 감독 실기기 육안뿐이다.
// · **WebGPU 가지의 실행** — 이 컨테이너에는 GPU 가 없다. 여기서 도는 것은 폴백 가지
//   하나뿐이고, `tsl` 가지는 GPU 러너가 생기기 전까지 **한 번도 안 돈다.** 그 사실을
//   결과에 `backend` 로 함께 적어 두니, 초록불을 "TSL 물 검증됨" 으로 읽으면 안 된다.
// · **렌더 결과의 유의미성** — 부팅 성공·에러 0 은 빈 화면과 구별되지 않는다.
//
// 실행: `npm run measure:water-mode`

import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
import {
  SITE_DIR, BASE_PATH, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS,
} from './config.mjs';
import { assembleSiteVite } from './assemble.mjs';

/** 부팅 대기 상한(ms). 헤드리스 SwiftShader 는 느리므로 넉넉히 */
const BOOT_TIMEOUT = 60000;
/** 부팅 뒤 몇 프레임 더 돌린다 — 노드 재질은 **첫 렌더**에 터지므로 반드시 필요하다 */
const SETTLE_MS = 5000;

/**
 * 폴백을 알리는 우리 경고. 이것은 **의도된 출력**이라 에러 집계에서 뺀다.
 *
 * `ocean.ts` 가 쓰는 문구의 앞부분과 맞춘다. 값 미러링처럼 보이지만 성격이 다르다 —
 * 어긋나면 이 게이트가 **더 엄격해질 뿐**(경고를 에러로 세어 FAIL) 느슨해지지 않는다.
 * 조용히 통과하는 방향으로는 못 틀어진다.
 */
const EXPECTED_FALLBACK_WARN = '[ocean] ?water=tsl 요청';

/**
 * 게이트 본체. **브라우저·서버를 주입받는다**(`measure-invariants.mjs` 와 같은 규약).
 *
 * @returns {Promise<{pass: boolean, reason: string, booted: boolean,
 *                    backend: string|null, water: object|null, errors: string[]}>}
 */
export async function runWaterMode({ browser, origin, basePath = BASE_PATH, log = console.log }) {
  const context = await browser.newContext({ viewport: { width: 900, height: 600 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (m.text().includes(EXPECTED_FALLBACK_WARN)) return;
    errors.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${String(e.message).slice(0, 200)}`));

  try {
    // 무거운 기능은 끈다 — 이 게이트가 보는 것은 수면 재질 하나다.
    const url = `${origin}${basePath}app/world2.html`
      + '?glb=0&npc=0&vrm=0&time=day&weather=clear&water=tsl';
    await page.goto(url, { waitUntil: 'networkidle', timeout: BOOT_TIMEOUT });

    let booted = false;
    try {
      await page.waitForFunction(() => !!window.__world2?.stats?.(), null, { timeout: BOOT_TIMEOUT });
      booted = true;
    } catch { /* 아래에서 FAIL 로 적는다 */ }

    // **부팅 직후에 판정하지 않는다.** 노드 재질 오류는 재질이 처음 렌더 목록에 오르는
    // 프레임에 난다 — `stats()` 가 뜬 시점에는 아직 안 났을 수 있다.
    await page.waitForTimeout(SETTLE_MS);

    const snap = booted
      ? await page.evaluate(() => {
        const s = window.__world2.stats();
        return { backend: s?.backend ?? null, water: s?.ocean?.water ?? null };
      })
      : { backend: null, water: null };

    const bad = [];
    if (!booted) bad.push(`부팅 실패 — \`__world2.stats()\` 가 ${BOOT_TIMEOUT}ms 안에 안 떴다`);
    if (errors.length) bad.push(`콘솔/페이지 에러 ${errors.length}건 (첫 건: ${errors[0]})`);

    const w = snap.water;
    if (booted && !w) {
      // 진단이 없으면 **아무것도 판정할 수 없다.** 통과로 넘기지 않는다.
      bad.push('`stats().ocean.water` 가 없다 — 진단이 빠졌거나 ocean 기능이 안 켜졌다');
    } else if (booted) {
      if (w.requested !== 'tsl') {
        bad.push(`URL 이 안 읽혔다 — requested=${w.requested} (기대 tsl). \`?water=\` 노브가 끊겼다`);
      }
      // 기대를 백엔드에서 유도한다 — 러너가 바뀌면 검사 대상도 함께 넘어간다.
      const wantTsl = snap.backend === 'WebGPU';
      const wantActive = wantTsl ? 'tsl' : 'std';
      if (w.active !== wantActive) {
        bad.push(`backend=${snap.backend} 인데 active=${w.active} (기대 ${wantActive})`);
      }
      if (w.denied !== !wantTsl) {
        bad.push(`denied=${w.denied} (기대 ${!wantTsl}) — 폴백 여부 보고가 실제와 어긋난다`);
      }
      if (w.backend !== snap.backend) {
        // 두 자리가 어긋나면 진단 자체를 못 믿는다.
        bad.push(`진단 backend 불일치 — ocean=${w.backend} vs stats=${snap.backend}`);
      }
    }

    // 스모크 하네스는 조용한 `log` 를 넘긴다(`run.mjs` 의 `quiet`) — 그쪽에서는 아무것도
    // 안 찍히고, 단독 실행에서만 보인다.
    log(`  backend=${snap.backend} · water=${JSON.stringify(w)} · 에러 ${errors.length}건`);

    return {
      pass: bad.length === 0,
      reason: bad.join(' · '),
      booted, backend: snap.backend, water: w, errors,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
// 단독 실행일 때만 자기가 빌드·서버·브라우저를 세운다. 스모크 하네스는 위 함수를 쓴다.
async function cli() {
  console.log('=== 수면 구현 게이트 (?water=tsl) ===\n');
  assembleSiteVite(SITE_DIR);
  // `BASE_PATH` 를 반드시 넘긴다 — 빠뜨리면 404 이고, 증상은 "부팅이 안 된다" 로만 보인다
  // (`measure-submerge.mjs` 가 실제로 그 함정을 밟았다).
  const { origin, close: closeServer } = await startServer(SITE_DIR, BASE_PATH);
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS, headless: true,
  });
  try {
    const r = await runWaterMode({ browser, origin, basePath: BASE_PATH });
    console.log('');
    console.log(r.pass
      ? `  ✓ PASS — backend=${r.backend} 에서 기대대로 동작했다.`
      : `  ✗ FAIL — ${r.reason}`);
    console.log(`    water=${JSON.stringify(r.water)}`);
    if (r.backend !== 'WebGPU') {
      console.log('    ※ 이 회차가 검증한 것은 **폴백 가지**다. TSL 물 자체는 안 돌았다.');
    }
    for (const e of r.errors.slice(0, 10)) console.log(`    에러: ${e}`);
    process.exitCode = r.pass ? 0 : 1;
  } finally {
    await browser.close().catch(() => {});
    await closeServer().catch(() => {});
  }
}

// `import.meta.main` 은 Node 20 에 없다. argv 로 판별한다.
if (process.argv[1] && process.argv[1].endsWith('measure-water-mode.mjs')) {
  cli().catch((e) => { console.error(`측정 실패(판정 아님): ${e.message}`); process.exit(2); });
}
