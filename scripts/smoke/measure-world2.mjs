#!/usr/bin/env node
// 헤드리스 world2 수면 기능 측정 스크립트
// vite 빌드 → 서빙 → Playwright 측정

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startServer } from './server.mjs';
import { SITE_DIR, BASE_PATH, CHROMIUM_EXECUTABLE, CHROMIUM_ARGS, WEBGL_WAIT_MS } from './config.mjs';
import { assembleSiteVite } from './assemble.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

/**
 * 값을 그대로 찍되 **0 과 "못 쟀다"를 구별한다.**
 *
 * `x || 'N/A'` 로 쓰면 `starved: 0`(정상 통과 신호)과 `draw: 0` 이 측정실패로 찍힌다.
 * 이 프로젝트가 상시 위험으로 규정한 "못 잰 것이 통과로 적히는 경향"의 거울상이다 —
 * 이번엔 **통과가 못 잰 것으로** 적힌다. 어느 쪽이든 리포트가 사실과 달라진다.
 */
const show = (v) => (v === undefined || v === null ? '측정실패(값 없음)' : String(v));

// 측정 실행
async function measure() {
  console.log('=== world2 수면 기능 측정 ===\n');

  // vite 빌드 및 _site 조립
  console.log('[1] vite 빌드 및 _site 조립 중...');
  try {
    assembleSiteVite(SITE_DIR);
    console.log('✓ _site 조립 완료\n');
  } catch (e) {
    console.error('✗ _site 조립 실패:', e.message);
    process.exit(1);
  }

  // 서버 시작
  console.log('[2] 정적 서버 시작 중...');
  const { origin, close: closeServer } = await startServer(SITE_DIR, BASE_PATH);
  console.log(`✓ 서버 시작: ${origin}\n`);

  try {
    // 크로미움 시작
    console.log('[3] 헤드리스 크로미움 시작 중...');
    const browser = await chromium.launch({
      executablePath: CHROMIUM_EXECUTABLE,
      args: CHROMIUM_ARGS,
      headless: true,
    });
    console.log('✓ 크로미움 시작\n');

    // 페이지 열기
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    // 콘솔 에러 감시
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    // world2 접속
    console.log('[4] world2.html 접속...');
    const url = `${origin}${BASE_PATH}app/world2.html`;
    console.log(`    URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✓ 페이지 로드 완료\n');

    // WebGL 부팅 대기
    console.log(`[5] WebGL 부팅 대기 (${WEBGL_WAIT_MS}ms)...`);
    await page.waitForTimeout(WEBGL_WAIT_MS);
    console.log('✓ 부팅 완료\n');

    // 첫 번째 진단 읽기
    console.log('[6] 첫 번째 진단 수집...');
    const diag1 = await page.evaluate(() => window.__world2?.stats());
    if (!diag1) {
      throw new Error('window.__world2 undefined or stats() failed');
    }
    if (!diag1.ocean || !Array.isArray(diag1.ocean.flowA)) {
      throw new Error(
        'ocean 진단을 읽지 못했다 — 물결이 멈춘 것이 아니라 잴 수 없는 상태다. '
        + `stats() 키: ${Object.keys(diag1).join(', ')}`,
      );
    }
    const ocean1 = diag1.ocean;
    console.log(`    flowA (초기): [${ocean1.flowA?.[0]}, ${ocean1.flowA?.[1]}]`);
    console.log(`    flowB (초기): [${ocean1.flowB?.[0]}, ${ocean1.flowB?.[1]}]`);
    console.log(`    draw (초기): ${show(diag1.frame?.draw)}`);
    console.log(`    pipelines (초기): ${show(diag1.pipelines)}`);
    console.log(`    starved (초기): ${show(diag1.builder?.starved)}`);
    console.log(`    loaded (초기): ${show(diag1.stream?.loaded)}\n`);

    // 60프레임 이상 대기 (swiftshader ~4fps → 15초 이상)
    console.log('[7] 60프레임 이상 실행 (17초 대기)...');
    await page.waitForTimeout(17000);
    console.log('✓ 완료\n');

    // 두 번째 진단 읽기
    console.log('[8] 두 번째 진단 수집...');
    const diag2 = await page.evaluate(() => window.__world2?.stats());
    if (!diag2) {
      throw new Error('window.__world2 undefined or stats() failed on second read');
    }
    const ocean2 = diag2.ocean;
    console.log(`    flowA (이후): [${ocean2.flowA?.[0]}, ${ocean2.flowA?.[1]}]`);
    console.log(`    flowB (이후): [${ocean2.flowB?.[0]}, ${ocean2.flowB?.[1]}]`);
    console.log(`    draw (이후): ${show(diag2.frame?.draw)}`);
    console.log(`    pipelines (이후): ${show(diag2.pipelines)}`);
    console.log(`    starved (이후): ${show(diag2.builder?.starved)}`);
    console.log(`    loaded (이후): ${show(diag2.stream?.loaded)}\n`);

    // 분석
    console.log('[9] 분석:\n');

    // 흐름 변화
    const flowA1 = ocean1.flowA || [null, null];
    const flowA2 = ocean2.flowA || [null, null];
    const flowB1 = ocean1.flowB || [null, null];
    const flowB2 = ocean2.flowB || [null, null];

    const flowAChanged = flowA1[0] !== flowA2[0] || flowA1[1] !== flowA2[1];
    const flowBChanged = flowB1[0] !== flowB2[0] || flowB1[1] !== flowB2[1];

    console.log(`  ✓ flowA 변화: ${flowAChanged ? '예' : '아니오'}`);
    console.log(`  ✓ flowB 변화: ${flowBChanged ? '예' : '아니오'}`);

    // 외적 계산 (두 층이 다른 방향인가)
    const cross = flowA2[0] * flowB2[1] - flowA2[1] * flowB2[0];
    if (!Number.isFinite(cross)) {
      throw new Error(`외적이 유한수가 아니다(${cross}) — 흐름 값이 온전치 않다`);
    }
    console.log(`  ✓ 외적 (flowA × flowB): ${cross.toFixed(6)} (0이 아님 = 다른 방향)`);

    // draw 변동
    const draw1 = diag1.frame?.draw;
    const draw2 = diag2.frame?.draw;
    console.log(`\n  ✓ draw 변동: ${draw1} → ${draw2} (변화: ${draw2 - draw1})`);

    // pipelines 변동
    const pip1 = diag1.pipelines;
    const pip2 = diag2.pipelines;
    const pipSame = pip1 === pip2 && pip1 !== -1;
    console.log(`  ✓ pipelines 안정: ${pipSame ? '예' : '아니오'} (${pip1} → ${pip2})`);

    // starved
    const starved = diag2.builder?.starved;
    console.log(`  ✓ starved = 0인가: ${starved === 0 ? '예' : '아니오'} (값: ${starved})`);

    // loaded
    const loaded = diag2.stream?.loaded;
    console.log(`  ✓ loaded 파셀 수: ${loaded}\n`);

    // 콘솔 에러
    console.log(`[10] 콘솔 에러 수집:\n`);
    if (errors.length === 0) {
      console.log('  ✓ 에러 0건\n');
    } else {
      console.log(`  ✗ 에러 ${errors.length}건:`);
      errors.forEach((e) => console.log(`    - ${e}`));
      console.log();
    }

    // 최종 보고
    console.log('=== 최종 판정 ===\n');
    const allGood = flowAChanged && flowBChanged && Math.abs(cross) > 0.0001 && pipSame && starved === 0 && errors.length === 0;
    if (allGood) {
      console.log('✓ PASS: 물결이 흐르고 있습니다.');
    } else {
      console.log('✗ ISSUES 발견:');
      if (!flowAChanged) console.log('  - flowA 정지됨');
      if (!flowBChanged) console.log('  - flowB 정지됨');
      if (Math.abs(cross) <= 0.0001) console.log('  - 두 층이 평행하게 흐름');
      if (!pipSame) console.log(`  - pipelines 불안정: ${pip1} → ${pip2}`);
      if (starved !== 0) console.log(`  - starved 비정상: ${starved}`);
      if (errors.length > 0) console.log(`  - 콘솔 에러 ${errors.length}건`);
    }

    // 정리
    await context.close();
    await browser.close();
    await closeServer();

    process.exit(allGood ? 0 : 1);
  } catch (e) {
    console.error('\n✗ 측정 실패:', e.message);
    await closeServer();
    process.exit(1);
  }
}

measure();
