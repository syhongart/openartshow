#!/usr/bin/env node
// 표면 재질 편집 세션 개수 게이트 — **브라우저에서 실제로 텍스처를 갈아 끼워 본다.**
//
// 감독 지시 2026-08-14: *"땅의 텍스쳐 심리스를 주면 그대로 적용할수있게 하는거지."*
// 태스크 #71 · W7 계획서가 「기능만 넣고 미루지 않는다」로 못 박은 축이다.
//
// ── 왜 필요한가 — 두 사실이 겹치면 아무도 못 본다 ───────────────────────────
// ① 텍스처를 갈아 끼울 때 옛 것을 회수하지 않으면 `info.memory.textures` 가 **단조증가**
//    한다. `features/overlay.ts` 의 제거 경로에 `dispose()` 가 0건이었다는 것이 조사 실측
//    이고, W7 이 그 회수 경로를 새로 만들었다.
// ② **그 증가를 보는 축이 라이브 게이트에 0개였다.** `[7]` 개수 불변식은 `?edit=1` 을
//    안 연다 — `measure-invariants.mjs` 가 `WORLD2_QUERY = '?time=day&weather=clear'` 를
//    쓰고, `?edit=1` 은 `LIVE_PAGES` 항목이라 **로드 시점 검사만** 받는다(`config.mjs`).
//    그 config 주석이 스스로 적고 있다: *"조작 중 결함을 보려면 세션을 시뮬레이션하는 별도
//    스크립트가 필요하다 — 이 항목은 그것이 아니다."*
//
// 이 파일이 그 «별도 스크립트» 다.
//
// ── 성능 게이트가 아니다 ────────────────────────────────────────────────────
// `[7][7.6][8]` 이 CI 에서 `observe` 로 내려간 근거는 «러너 성능 편차의 거짓 FAIL» 인데,
// 여기서 재는 것은 **개수**이고 이산이다. 회수가 서 있으면 델타가 0, 없으면 교체 횟수만큼
// 늘어난다 — 그 사이에 편차가 들어올 자리가 없다. 그래서 `[11]` 물빠짐과 같은 부류이고
// `perfStatus`/`perfLabel` 을 쓰지 않는다.
//
// ── 값을 여기 적지 않는다 ───────────────────────────────────────────────────
// 「텍스처가 몇 장 있어야 한다」·「배율은 얼마」 같은 것을 적으면 그 순간 값 미러링이고,
// 목록이 바뀌면 이 게이트가 **PASS 인 채로 아무것도 안 잰다**(`[7]` 이 정확히 그렇게 되어
// 있었다 — 뭍에서만 걷고 물빠짐을 통과시켰다). 그래서 **화면에 실제로 뜬 옵션**을 읽어
// 그 사이를 순환한다. 옵션이 2개 미만이면 순환이 성립하지 않으므로 **FAIL 이다** —
// 못 잰 것을 통과로 적지 않는다.
//
// ── 검출력을 실측했다 (뮤테이션 2건, 2026-08-15) ────────────────────────────
// 기준선 `tex=47 owned=1 → 20회 교체 tex=47 owned=1 → 걷어냄 owned=0` (PASS) 에서:
//
//   G1  `release()` 의 `dispose()` 를 지운다        → FAIL  tex=67 (+20)
//   G2  `applyOne()` 의 `release(key)` 를 지운다     → FAIL  tex=67 (+20)
//
// ⚠ **둘이 같은 관측을 냈다.** 회수가 어디서 끊기든 증상이 «교체 횟수만큼 증가» 로 같기
// 때문이고, 이 게이트의 목적(회수가 새는가)에는 그것으로 충분하다 — 어디서 끊겼는지를
// 가르는 것은 단위 테스트 몫이다(`tests/world2-surface-paint.test.ts` 의 M1·M2 가 서로 다른
// 축을 깬다).
//
// ⚠⚠ **판정식 셋 중 둘은 아직 실증되지 않았다.** `pass` 는 세 조건의 곱인데,
//
//   ① `deltaTex === 0`                 ← G1·G2 가 실증했다
//   ② `after.owned === base.owned`     ← **미실증** (교체가 보유 수를 누적시키는 결함)
//   ③ `cleared.owned === 0`            ← **미실증** (걷어내기가 회수를 안 하는 결함)
//
// ②③을 깨는 뮤테이션을 아직 안 돌렸다. 「테스트 통과는 검출력의 증거가 아니다」가 이
// 저장소의 규율이므로 **그 둘을 검출력 있는 축으로 세지 않는다** — 지금은 ①만 실물이고
// ②③은 «있으면 좋은 이중 확인» 이다. 실증하려면 `owned` 를 안 지우는 뮤테이션과 `reset()`
// 의 회수를 지우는 뮤테이션을 각각 돌린다.
//
// ── 못 잡는 것 (정직하게) ───────────────────────────────────────────────────
// · **룩** — 무늬가 이어지는가·배율이 적당한가는 감독 실기기뿐이다. 여기서는 개수만 본다.
// · **WebGPU** — 헤드리스는 SwiftShader(코어 WebGLRenderer)다. `MeshStandardNodeMaterial`
//   의 재컴파일 거동은 이 환경에서 **원리적으로 못 잰다.** 개수는 백엔드와 무관한 축이라
//   이 측정이 성립하지만, 그 사실이 «재컴파일도 괜찮다» 를 뜻하지는 않는다.
// · **드롭 경로** — `<select>` 로 고르는 경로만 탄다. 파일 드롭은 헤드리스에서
//   `DataTransfer` 를 만들어야 하고, 그 대역이 실물과 같은지를 다시 증명해야 한다.
//   드롭이 같은 `patch()` 로 합류하는 것은 `tests/world2-surface-panel.test.ts` 가 본다.
//
// 실행: `npm run measure:surface`

import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
import {
  SITE_DIR, BASE_PATH, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS,
} from './config.mjs';
import { assembleSiteVite } from './assemble.mjs';
import { waitForWorld2Ready } from './world2-ready.mjs';

/**
 * 편집 세션 쿼리. `[7]` 이 쓰는 것에 `edit=1` 만 더한다 — 시간대·날씨를 고정하는 이유는
 * 그쪽과 같다(하늘이 바뀌면 개수가 그 축으로도 움직여 원인이 갈리지 않는다).
 */
const EDIT_QUERY = '?time=day&weather=clear&edit=1';

/**
 * 텍스처를 몇 번 갈아 끼울 것인가.
 *
 * **회수가 없으면 이만큼 는다**는 것이 이 게이트의 판정 근거다. 20 인 이유는 판단이다 —
 * 적으면(3~4회) 부팅 잔여 증가와 구별이 안 되고, 많으면 스모크가 길어진다. 회수가 서 있는
 * 한 이 수를 올려도 델타는 0 이므로, **의심스러우면 올려서 다시 돌리면 된다.**
 */
const SWAPS = 20;

/**
 * 한 번 바꾼 뒤 기다릴 프레임 수. 집행이 **폴링**이라(`surface-paint.ts` 의 `update`)
 * 다음 프레임에 반영되고, 텍스처는 그 뒤 첫 렌더에 GPU 로 올라간다.
 */
const SETTLE_FRAMES = 3;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

async function frames(page, n) {
  await page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) {
      await new Promise((r) => requestAnimationFrame(() => r()));
    }
  }, n);
}

/** 지금 개수 한 장. **판정에 쓰는 값을 한 번에 읽는다** */
async function probe(page) {
  return page.evaluate(() => {
    const s = window.__world2?.stats?.();
    return {
      tex: s?.frame?.textures ?? null,
      geo: s?.frame?.geometries ?? null,
      // 집행이 스스로 신고하는 «우리가 들고 있는 텍스처 수». `info.memory` 와 **다른 축**
      // 이라 둘을 함께 본다 — 하나만 보면 «집행은 0 이라는데 GPU 는 늘었다» 를 못 가른다.
      owned: s?.surface?.owned ?? null,
      surfaces: s?.surface?.surfaces ?? null,
    };
  });
}

/**
 * 게이트 본체. **브라우저·서버를 주입받는다**(`measure-invariants.mjs` 와 같은 규약).
 *
 * @returns {Promise<{pass: boolean, reason: string, base: object|null,
 *                    after: object|null, deltaTex: number|null, swaps: number,
 *                    options: number, cleared: boolean, errors: string[]}>}
 */
export async function runSurfaceTextures({ browser, origin, basePath, log = console.log }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  const fail = (reason, extra = {}) => ({
    pass: false, reason, base: null, after: null, deltaTex: null,
    swaps: 0, options: 0, cleared: false, errors, ...extra,
  });

  try {
    await page.goto(`${origin}${basePath}/app/world2.html${EDIT_QUERY}`, {
      waitUntil: 'domcontentloaded',
    });
    const ready = await waitForWorld2Ready(page);
    if (!ready.booted) return fail(ready.reason);

    // ── 편집 모드를 켠다 ──────────────────────────────────────────────────
    // **버튼을 실제로 누른다** — 감독이 하는 것과 같은 경로다. 키(`Tab`)로도 되지만
    // 버튼과 키가 같은 함수로 가는 것은 단위 테스트가 이미 보고 있고, 여기서 보고 싶은
    // 것은 «화면에 그 버튼이 있고 눌린다» 쪽이다.
    const toggled = await page.evaluate(() => {
      const b = document.querySelector('#w2-edit .toggle');
      if (!b) return false;
      b.click();
      return true;
    });
    if (!toggled) return fail('편집 토글 버튼을 못 찾았다 — 편집 패널이 안 떴다');
    await frames(page, 2);

    // ── 표면 패널이 실재하는가 ────────────────────────────────────────────
    // 없으면 이 게이트는 **아무것도 못 잰다.** 조용히 통과시키지 않는다.
    const slots = await page.evaluate(
      () => document.querySelectorAll('#w2-edit .surf-slot').length,
    );
    if (slots === 0) return fail('표면 재질 패널이 없다 — 슬롯 칸을 못 찾았다');

    // ── 고를 수 있는 텍스처를 화면에서 읽는다 ─────────────────────────────
    // 목록은 `index.json` fetch 라 늦게 온다. 값을 적지 않고 **뜰 때까지 기다린다.**
    let options = [];
    try {
      await page.waitForFunction(() => {
        const sel = document.querySelector('#w2-edit .surf-slot[data-slot="map"] select');
        return !!sel && sel.querySelectorAll('option').length >= 3; // 「없음」 + 2장 이상
      }, null, { timeout: 15000 });
      options = await page.evaluate(() => {
        const sel = document.querySelector('#w2-edit .surf-slot[data-slot="map"] select');
        return [...sel.querySelectorAll('option')].map((o) => o.value).filter(Boolean);
      });
    } catch {
      return fail(
        '고를 수 있는 텍스처가 2장 미만이다 — 순환 교체가 성립하지 않아 회수를 잴 수 없다'
        + ' (`assets/textures/index.json` 과 실제 파일을 본다)',
      );
    }

    /** 그 슬롯에 이 `src` 를 건다. **화면의 실제 경로**를 탄다 */
    const applyMap = async (src) => page.evaluate((v) => {
      const sel = document.querySelector('#w2-edit .surf-slot[data-slot="map"] select');
      if (!sel) return false;
      sel.value = v;
      sel.dispatchEvent(new Event('change'));
      return true;
    }, src);

    // ── 기준선 — **첫 적용 뒤에 잡는다** ──────────────────────────────────
    // 첫 적용은 «없던 슬롯이 생기는» 구조 변경이라 텍스처가 1장 늘고 재질이 재컴파일된다.
    // 그것은 설계된 비용이고(`surface-paint.ts` 헤더 ⓐ~ⓒ) 이 게이트가 보는 것이 아니다.
    // 여기서 보는 것은 **그 다음부터의 교체**다.
    if (!(await applyMap(options[0]))) return fail('맵 슬롯 select 를 못 찾았다');
    await frames(page, SETTLE_FRAMES);
    const base = await probe(page);
    if (base.tex == null) return fail('`stats().frame.textures` 를 못 읽었다 — 개수 축이 비었다');
    if (base.owned == null) {
      return fail('`stats().surface.owned` 가 없다 — 집행이 진단을 안 내면 회수를 못 본다');
    }

    // ── 갈아 끼우기 ───────────────────────────────────────────────────────
    for (let i = 1; i <= SWAPS; i++) {
      await applyMap(options[i % options.length]);
      await frames(page, SETTLE_FRAMES);
    }
    const after = await probe(page);
    const deltaTex = num(after.tex) != null && num(base.tex) != null ? after.tex - base.tex : null;

    // ── 걷어내기 — 부팅 상태로 돌아오는가 ─────────────────────────────────
    // 회수 경로의 나머지 절반이다. 교체는 «옛 것을 버리고 새 것을 든다» 이고, 걷어내기는
    // «버리고 아무것도 안 든다» 라 `owned` 가 0 으로 떨어져야 한다.
    await applyMap('');
    await frames(page, SETTLE_FRAMES);
    const cleared = await probe(page);

    const pass = deltaTex === 0
      && after.owned === base.owned
      && cleared.owned === 0
      && errors.length === 0;

    log(
      `기준선 tex=${base.tex} owned=${base.owned}`
      + ` → ${SWAPS}회 교체 tex=${after.tex} owned=${after.owned}`
      + ` → 걷어냄 owned=${cleared.owned}`,
    );

    return {
      pass,
      reason: pass
        ? ''
        : (deltaTex !== 0
          ? `교체 ${SWAPS}회에 텍스처 +${deltaTex} — 옛 것을 회수하지 않는다`
          : after.owned !== base.owned
            ? `보유 수가 ${base.owned} → ${after.owned} 로 변했다 — 교체가 누적된다`
            : cleared.owned !== 0
              ? `걷어냈는데 보유 ${cleared.owned} 이 남았다 — 되돌리기가 회수를 안 한다`
              : `콘솔 에러 ${errors.length}건`),
      base, after, deltaTex, swaps: SWAPS, options: options.length,
      cleared: cleared.owned === 0, errors,
    };
  } finally {
    await context.close();
  }
}

// ── 단독 실행 ───────────────────────────────────────────────────────────────
async function cli() {
  console.log('=== 표면 재질 편집 세션 게이트 ===\n');
  assembleSiteVite(SITE_DIR);
  // ⚠ **`BASE_PATH` 를 반드시 넘긴다.** 안 넘기면 서버가 그 접두어를 안 붙여
  // `…/openartshow/app/world2.html` 이 404 가 되고, 증상은 «`__world2` 가 60초 안에 안
  // 뜬다» 로만 보인다 — 원인과 한참 떨어진 자리에서 나타난다.
  //
  // `measure-submerge.mjs:250` 이 이 실수를 **이미 적어 두었고 나는 그대로 반복했다**
  // (첫 실행이 정확히 그 404 로 죽었다). 다음 측정을 만드는 사람이 또 밟지 않게 여기에도
  // 남긴다 — 새 파일을 만들 때 남의 파일 주석을 읽는 경로가 없기 때문이다.
  const { origin, close: closeServer } = await startServer(SITE_DIR, BASE_PATH);
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS, headless: true,
  });
  try {
    const r = await runSurfaceTextures({ browser, origin, basePath: BASE_PATH });
    console.log('');
    console.log(r.pass
      ? `  ✓ PASS — ${r.swaps}회 갈아 끼워도 텍스처가 안 는다 (선택지 ${r.options}장)`
      : `  ✗ FAIL — ${r.reason}`);
    for (const e of r.errors.slice(0, 10)) console.log(`    에러: ${e}`);
    process.exitCode = r.pass ? 0 : 1;
  } finally {
    await browser.close().catch(() => {});
    await closeServer().catch(() => {});
  }
}

if (process.argv[1] && process.argv[1].endsWith('measure-surface-textures.mjs')) {
  cli().catch((e) => { console.error(`측정 실패(판정 아님): ${e.message}`); process.exit(2); });
}
