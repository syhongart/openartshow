#!/usr/bin/env node
// 하늘 예열 회귀 게이트 (#114) — **날씨를 처음 켜는 순간 개수가 오르지 않는가.**
//
// ── 무엇을 재는가 ────────────────────────────────────────────────────────────
// 시간대×날씨 12조합 + 무지개·오로라·번개를 **두 바퀴** 순회하며 `geometry`·`texture`·
// `pipeline` 개수를 찍는다. 부팅 예열이 제대로 굽고 있으면 **1바퀴부터 증가가 0**이다.
//
// ── 왜 필요한가 (감독 실기기 실측 2026-07-29) ────────────────────────────────
// 감독 50채 리포트에서 pipeline 31→33 · geometry 92→95 · texture 32→35 가 낮→밤→천둥을
// 바꾼 30~35초 구간에 계단으로 오르고 그 뒤 상수였다.
//
// `sky.js`는 레이어를 부팅 때 전부 만들어 `visible=false`로 재워 둔다. 그래서 오랫동안
// "개수 불변식은 이미 지켜져 있다"고 적혀 있었는데, 재는 축이 틀렸다 — three의
// `info.memory`는 객체를 **만들 때**가 아니라 **처음 그릴 때** 오른다. 재워둔 메시는
// 렌더 목록에 안 오르므로 GPU에는 아무것도 없었다.
//
// 이 스크립트가 그 계단을 처음 재현했다(수정 전 실측: 1바퀴 geo +4 · tex +4 · pipe +3,
// 2바퀴 전부 0). 그래서 그대로 게이트로 남긴다.
//
// ── 판정 ─────────────────────────────────────────────────────────────────────
//   · 1바퀴·2바퀴 모두 0        → PASS. 예열이 전부 굽고 있다
//   · 1바퀴만 오르고 2바퀴 0    → FAIL. 예열이 **빠뜨린 레이어**가 있다(첫 등장 비용 잔존)
//   · 2바퀴에서도 오른다        → FAIL. 지연 생성이 아니라 증식이다. 원인이 다른 데 있다
//
// 마지막 갈래가 중요하다. 같은 FAIL이라도 고칠 곳이 다르다 — 전자는 `sky.js prewarm()`의
// 레이어 목록, 후자는 개수 불변식 자체가 깨진 것이다.
//
// ── 백엔드 ───────────────────────────────────────────────────────────────────
// geometry·texture는 백엔드 무관 카운터라 헤드리스(WebGL)에서도 유효하다. pipeline은
// 백엔드 의존이므로 참고값이다 — 감독 실기기(WebGPU)의 파이프라인 수를 이 값으로
// 대신하지 않는다.
//
// 실행: `npm run measure:sky-warm` (약 3분)

import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
import {
  SITE_DIR, BASE_PATH, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS,
} from './config.mjs';
import { assembleSiteVite } from './assemble.mjs';
import { WORLD2_QUERY, waitForWorld2Ready } from './world2-ready.mjs';

const TIMES = ['day', 'sunset', 'night'];
const WEATHERS = ['clear', 'overcast', 'rain', 'snow'];
/** 전환 후 대기(ms). 헤드리스는 ~4fps라 크로스페이드가 프레임 수로 느리게 진행된다. */
const SETTLE_MS = 2600;

const show = (v) => (v === undefined || v === null ? 'N/A' : String(v));

async function readCounts(page) {
  return page.evaluate(() => {
    const s = window.__world2?.stats?.();
    if (!s) return null;
    return {
      geo: s.frame?.geometries ?? null,
      tex: s.frame?.textures ?? null,
      pipe: s.pipelines ?? null,
      draw: s.frame?.draw ?? null,
      time: s.sky?.time ?? null,
      weather: s.sky?.weather ?? null,
      settling: s.sky?.settling ?? null,
    };
  });
}

async function click(page, sel) {
  const ok = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
  if (!ok) throw new Error(`셀렉터를 못 찾았다: ${sel} — 조작하지 못했으므로 이 회차는 측정 실패다`);
}

/**
 * 게이트 본체. **브라우저·서버를 주입받는다** — 스모크 하네스가 이미 세워 둔 것을 다시
 * 세우면 vite 빌드가 한 번 더 돈다.
 *
 * `laps` 는 기본 2 다. 예열이 정상이면 1바퀴로도 판정이 되지만(증가가 0 이므로), 2바퀴는
 * **FAIL 일 때 원인을 가른다** — 1바퀴만 오르면 예열이 빠뜨린 레이어, 2바퀴에서도 오르면
 * 증식이다. 스모크에 묶을 때는 시간을 아끼려고 1 로 부르고, 단독 실행은 2 로 둔다.
 */
export async function runSkyWarm({ browser, origin, basePath, laps = 2, log = console.log }) {
  {
    const context = await browser.newContext({ viewport: { width: 1024, height: 640 } });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));

    // GLB 가 기본 노출로 바뀐 뒤 게이트도 기본 상태를 재야 한다. 대기는 world2-ready.mjs 소유.
    const url = `${origin}${basePath}app/world2.html${WORLD2_QUERY}`;
    log(`[2] 접속: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // 부팅 완료 = `stats()` 노출 + GLB 로드 종료. 시간 대기가 아니라 조건 대기다.
    const ready = await waitForWorld2Ready(page);
    if (ready.reason) throw new Error(ready.reason);
    await page.waitForTimeout(6000); // 스트리밍 초기 파셀이 다 붙을 때까지
    log('✓ 부팅 완료\n');

    // 패널 펼치기 — 접힌 상태에서도 .click() 은 버블링되지만, 열어두면 실사용과 같아진다.
    await click(page, '#w2-god [aria-expanded]').catch(() => {});

    const base = await readCounts(page);
    if (!base) throw new Error('stats() 를 읽지 못했다 — 측정 자체가 성립하지 않는다');
    log(`[3] 기준선  geo=${show(base.geo)} tex=${show(base.tex)} pipe=${show(base.pipe)}\n`);

    const rows = [];
    for (let lap = 1; lap <= laps; lap++) {
      for (const t of TIMES) {
        for (const w of WEATHERS) {
          await click(page, `button[data-time="${t}"]`);
          await click(page, `button[data-weather="${w}"]`);
          await page.waitForTimeout(SETTLE_MS);
          const c = await readCounts(page);
          rows.push({ lap, label: `${t}/${w}`, ...c });
        }
      }
      // fx 는 조합 축이 아니라 토글이라 바퀴 끝에서 한 번씩 켠다.
      for (const fx of ['rainbow', 'aurora']) {
        await click(page, `button[data-fx="${fx}"]`);
        await page.waitForTimeout(SETTLE_MS);
        rows.push({ lap, label: `fx:${fx}`, ...(await readCounts(page)) });
      }
      // 번개 — 비일 때만 발동한다. 비로 맞춘 뒤 때린다.
      await click(page, 'button[data-weather="rain"]');
      await page.waitForTimeout(SETTLE_MS);
      const bolted = await page.evaluate(() => {
        const b = document.querySelector('button[data-bolt]');
        if (b) { b.click(); return 'button'; }
        return 'none';
      });
      await page.waitForTimeout(SETTLE_MS);
      rows.push({ lap, label: `bolt(${bolted})`, ...(await readCounts(page)) });
    }

    log('[4] 순회 결과 — 개수가 오른쪽 바퀴에서도 늘면 증식이다\n');
    log('lap  조합              geo   tex  pipe   draw');
    let prev = base;
    const lapDelta = {};
    for (let i = 1; i <= laps; i++) lapDelta[i] = { geo: 0, tex: 0, pipe: 0 };
    for (const r of rows) {
      const d = (a, b) => (a == null || b == null ? '  ?' : (b - a > 0 ? `+${b - a}` : '  '));
      if (prev.geo != null && r.geo != null) lapDelta[r.lap].geo += Math.max(0, r.geo - prev.geo);
      if (prev.tex != null && r.tex != null) lapDelta[r.lap].tex += Math.max(0, r.tex - prev.tex);
      if (prev.pipe != null && r.pipe != null) lapDelta[r.lap].pipe += Math.max(0, r.pipe - prev.pipe);
      log(
        `  ${r.lap}  ${r.label.padEnd(16)} ${show(r.geo).padStart(4)}${d(prev.geo, r.geo)} `
        + `${show(r.tex).padStart(4)}${d(prev.tex, r.tex)} `
        + `${show(r.pipe).padStart(4)}${d(prev.pipe, r.pipe)} ${show(r.draw).padStart(6)}`,
      );
      prev = r;
    }

    log('\n[5] 판정\n');
    log(`  1바퀴 증가분  geo +${lapDelta[1].geo}  tex +${lapDelta[1].tex}  pipe +${lapDelta[1].pipe}`);
    if (laps >= 2) log(`  2바퀴 증가분  geo +${lapDelta[2].geo}  tex +${lapDelta[2].tex}  pipe +${lapDelta[2].pipe}`);

    // 개수 판정은 백엔드 무관 카운터로만 한다. pipeline 은 참고로 찍되 통과·실패를
    // 가르지 않는다 — 헤드리스(WebGL)와 실기기(WebGPU)의 파이프라인 개념이 다르다.
    const lap1 = lapDelta[1].geo + lapDelta[1].tex;
    const lap2 = laps >= 2 ? lapDelta[2].geo + lapDelta[2].tex : 0;
    let pass = false;
    if (lap1 === 0 && lap2 === 0) {
      pass = true;
      log('\n  ✓ PASS — 첫 바퀴부터 증가 0. 예열이 날씨 레이어를 전부 굽고 있다.');
    } else if (lap2 === 0) {
      log('\n  ✗ FAIL — 1바퀴에서만 올랐다(첫 등장 비용 잔존).');
      log('    예열이 **빠뜨린 레이어**가 있다. `sky.js`의 `prewarm()` 목록을 본다.');
      log('    위 표에서 어느 조합에 `+` 가 붙었는지가 곧 빠진 레이어다.');
    } else {
      log('\n  ✗ FAIL — 2바퀴에서도 올랐다. 지연 생성이 아니라 **증식**이다.');
      log('    예열로 고칠 문제가 아니다. 개수 불변식 자체가 깨진 곳을 찾아야 한다.');
    }

    log(`\n  콘솔 에러 ${errors.length}건${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
    if (errors.length) pass = false;
    await context.close();
    return { pass, lap1, lap2, lapDelta, rows, errors };
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
async function cli() {
  log('=== 하늘 전환 개수 계단 재현 (#114) ===\n');
  log('[1] vite 빌드 및 _site 조립...');
  assembleSiteVite(SITE_DIR);
  log('✓ 완료\n');
  const { origin, close: closeServer } = await startServer(SITE_DIR, BASE_PATH);
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE, args: CHROMIUM_ARGS, headless: true,
  });
  try {
    const r = await runSkyWarm({ browser, origin, basePath: BASE_PATH, laps: 2 });
    process.exitCode = r.pass ? 0 : 1;
  } finally {
    await browser.close();
    await closeServer();
  }
}

// 측정 자체가 실패한 것과 측정 결과가 FAIL 인 것을 구별한다. 전자는 "못 쟀다"이지
// "통과 못 했다"가 아니다 — 리포트에 그렇게 적혀야 한다.
if (process.argv[1] && process.argv[1].endsWith('measure-sky-warm.mjs')) {
  cli().catch((e) => { console.error(`측정 실패(판정 아님): ${e.message}`); process.exit(2); });
}

/** CLI 전용 로거 — 함수 본체는 주입받은 `log` 를 쓴다 */
function log(...a) { console.log(...a); }
