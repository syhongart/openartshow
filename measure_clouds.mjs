import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  // 콘솔 로깅
  page.on('console', msg => console.log(`[console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[error] ${err.message}`));

  console.log('world2 로드 중...');
  await page.goto('http://localhost:8888/openartshow/app/world2.html', { waitUntil: 'domcontentloaded' });

  // window.__world2 정의 대기 (최대 30초)
  let world2Ready = false;
  for (let i = 0; i < 60; i++) {
    world2Ready = await page.evaluate(() => typeof window.__world2 !== 'undefined');
    if (world2Ready) {
      console.log(`world2 준비 완료 (${i * 500}ms)`);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (!world2Ready) {
    console.error('world2 준비 타임아웃');
    process.exit(1);
  }

  // pitch 조정 (약 1.2 rad 위쪽으로)
  console.log('카메라 pitch 조정 중...');
  await page.evaluate(() => {
    const camera = window.__world2.camera;
    if (camera) {
      camera.rotation.x = 1.2;
    }
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 스크린샷 캡처
  const screenshotPath = '/tmp/claude-0/-home-user-openartshow/10dfe60b-b9cb-5564-968f-1fa0c0d50697/scratchpad/world2_sky.png';
  console.log(`스크린샷 캡처: ${screenshotPath}`);
  await page.screenshot({ path: screenshotPath });

  // frame stats 기록
  const stats = await page.evaluate(() => window.__world2?.stats?.());
  console.log('\n=== Frame Stats ===');
  if (stats && stats.frame) {
    console.log(`draw: ${stats.frame.draw || 'N/A'}`);
    console.log(`pipeline: ${stats.frame.pipeline || 'N/A'}`);
    console.log(`geometry: ${stats.frame.geometry || 'N/A'}`);
    console.log(`texture: ${stats.frame.texture || 'N/A'}`);
  } else {
    console.log('stats 미지원');
  }

  // pitch 실측값
  const pitchRad = await page.evaluate(() => window.__world2?.camera?.rotation?.x || 'N/A');
  console.log(`\nPitch (실측): ${pitchRad} rad`);

  // 구름 객체 개수 확인
  const cloudCount = await page.evaluate(() => {
    const scene = window.__world2?.scene;
    if (scene) {
      let count = 0;
      scene.traverse(obj => {
        if (obj.name && obj.name.includes('cloud')) count++;
        if (obj.type === 'InstancedMesh') count++;
      });
      return count;
    }
    return 'N/A';
  });
  console.log(`구름 mesh 객체: ${cloudCount}`);

  await context.close();
  await browser.close();

  console.log('\n측정 완료. Python으로 픽셀 분석 중...');

  // Python 스크립트로 connected component 분석 실행
  execSync(`python3 ${process.cwd()}/analyze_clouds.py`, { stdio: 'inherit' });
})();
