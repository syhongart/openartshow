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

  console.log('Loading world...');
  await page.goto(URL, {waitUntil: 'load', timeout: 10000});
  await page.waitForTimeout(4000);

  // 모든 에러/경고 출력
  console.log('\n=== All Errors & Warnings ===');
  consoleLogs.filter(l => ['error', 'warning'].includes(l.type)).forEach(l => {
    console.log(`[${l.type.toUpperCase()}] ${l.text.substring(0, 150)}`);
  });

  // 클릭 테스트
  await page.click('#enter button[data-enter="solo"]').catch(err => {
    console.log(`Click failed: ${err.message}`);
  });
  await page.waitForTimeout(2000);

  const afterClick = await page.evaluate(() => {
    return {
      bodyEntered: document.body.classList.contains('entered'),
      enterHidden: document.getElementById('enter')?.classList.contains('hide')
    };
  });

  console.log('\n=== Result ===');
  if (afterClick.bodyEntered) {
    console.log('✓✓✓ SUCCESS! Button works!');
  } else {
    console.log('✗ Button did not work');
  }

  await page.context().close();
} catch (err) {
  console.error('Error:', err.message);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
