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

  // chibi 버전 확인
  const chibiLogs = consoleLogs.filter(l => l.text.includes('아야모') || l.text.includes('Ayamo'));
  console.log('\n=== Chibi Version ===');
  chibiLogs.forEach(l => console.log(`[${l.type}] ${l.text}`));

  // 모든 로그 출력
  console.log('\n=== All Logs ===');
  consoleLogs.slice(0, 30).forEach(l => {
    if (!l.text.includes('Failed to load') && !l.text.includes('getX')) {
      console.log(`[${l.type}] ${l.text.substring(0, 100)}`);
    }
  });

  await page.context().close();
} catch (err) {
  console.error('Error:', err.message);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
