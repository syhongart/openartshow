import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:5174/openartshow/app/world.html';

let browser = null;
const consoleLogs = [];

try {
  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: true,
    args: ['--disable-dev-shm-usage']
  });

  const page = await browser.newContext().then(c => c.newPage());

  page.on('console', msg => {
    consoleLogs.push({type: msg.type(), text: msg.text()});
  });

  page.on('pageerror', err => {
    console.error('Page Error:', err.message);
  });

  console.log('Loading world...');
  await page.goto(URL, {waitUntil: 'load', timeout: 10000});
  await page.waitForTimeout(4000);

  // 버튼 확인
  const enterBtn = await page.$('#enter button[data-enter]');
  console.log(`✓ Enter button exists: ${enterBtn ? 'YES' : 'NO'}`);

  // 에러 확인
  const errors = consoleLogs.filter(l => l.type === 'error');
  if (errors.length > 0) {
    console.log('\n=== Console Errors ===');
    errors.forEach(e => console.log(`❌ ${e.text}`));
  } else {
    console.log('✓ No console errors');
  }

  // 렌더링 상태 확인
  const renderState = await page.evaluate(() => {
    const canvas = document.getElementById('c');
    const enter = document.getElementById('enter');
    return {
      canvasExists: !!canvas,
      enterVisible: enter && !enter.classList.contains('hide'),
      renderer: window.R ? 'initialized' : 'not_initialized'
    };
  });
  console.log('✓ Render state:', JSON.stringify(renderState));

  // 버튼 클릭 시뮬레이션
  console.log('\n=== Clicking Button ===');
  if (enterBtn) {
    await page.click('#enter button[data-enter="solo"]').catch(err => {
      console.log(`⚠️ Click failed: ${err.message}`);
    });

    await page.waitForTimeout(2000);

    // 클릭 후 상태
    const afterClick = await page.evaluate(() => {
      return {
        bodyEntered: document.body.classList.contains('entered'),
        enterHidden: document.getElementById('enter')?.classList.contains('hide'),
        canvasVisible: document.getElementById('c')?.style.display !== 'none'
      };
    });

    console.log('✓ After click state:', JSON.stringify(afterClick));
    if (afterClick.bodyEntered) {
      console.log('✓✓✓ SUCCESS: Button click worked! (body has "entered" class)');
    } else {
      console.log('⚠️ Button click did not trigger world entry');
    }
  }

  await page.context().close();
} catch (err) {
  console.error('Test Error:', err.message);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
