// scripts/nyc/capture.mjs — 거리 6 시점 고정 캡처 하네스.
// 헤드리스 WebGL(swiftshader) · 900×560 · DPR 1 · 30초 대기 · 프레임 시간 안 잼 · 블룸 안 켜짐
//
// 사용: node scripts/nyc/capture.mjs --out=<dir> --shots=<name:query;name:query;...>
// 예: node scripts/nyc/capture.mjs --out=docs/nyc/evidence/iteration-01-p13 \
//       --shots="V1:world10.html;V2:world10.html?cam=9,-1,315,-4;V3:world10.html?cam=15.36,-4.5,270,-6"
//
import { chromium } from '/home/user/openartshow/node_modules/playwright-core/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../../dist');

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.glb': 'model/gltf-binary',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

// 인자 파싱
let outDir = null;
let shots = [];
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--out=')) {
    outDir = arg.slice(6);
  } else if (arg.startsWith('--shots=')) {
    const shotStr = arg.slice(8);
    // 샷 구분자: 세미콜론 (URL의 ?cam= 안 콤마와 충돌 회피)
    shots = shotStr.split(';').map((s) => {
      const i = s.indexOf(':');
      return { name: s.slice(0, i), query: s.slice(i + 1) };
    });
  }
}

if (!outDir || shots.length === 0) {
  console.error('Usage: node scripts/nyc/capture.mjs --out=<dir> --shots=<name:query,...>');
  process.exit(1);
}

// 출력 디렉터리 생성
fs.mkdirSync(outDir, { recursive: true });

// HTTP 서버 (dist/를 /openartshow/ 접두로 서빙)
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/openartshow/, '');
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(8123);

// Chromium 브라우저 시작
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
  ],
});

// 캡처 결과
const captureResults = [];

// 각 샷마다 페이지 열어 캡처
for (const shot of shots) {
  const url = `http://localhost:8123/openartshow/app/${shot.query}`;
  const page = await browser.newPage({ viewport: { width: 900, height: 560 } });

  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() === 404) errs.push('404 ' + r.url());
  });

  let bytes = 0;
  page.on('response', async (r) => {
    try {
      const h = r.headers()['content-length'];
      bytes += h ? Number(h) : (await r.body()).length;
    } catch {}
  });

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(30000);  // 30초 대기

  const info = await page.evaluate(() => {
    const g = globalThis;
    const w = g.__oas || g.__world || g.__w2 || null;
    try {
      const r = w?.renderer || w?.adapter?.renderer;
      return r
        ? JSON.stringify({
            render: r.info?.render,
            memory: r.info?.memory,
            dpr: r.getPixelRatio?.(),
          })
        : null;
    } catch (e) {
      return 'err ' + e;
    }
  });

  await page.screenshot({ path: `${outDir}/${shot.name}.png` });

  captureResults.push({
    name: shot.name,
    url: url,
    errors: errs.slice(0, 3),
    bytes: bytes,
    info: info,
  });

  console.log(shot.name, 'errors:', JSON.stringify(errs.slice(0, 3)), 'bytes≈', bytes, 'info:', info);
  await page.close();
}

await browser.close();
srv.close();

// capture.json 저장
fs.writeFileSync(
  path.join(outDir, 'capture.json'),
  JSON.stringify(captureResults, null, 2)
);

console.log(`Capture complete. Results saved to ${outDir}/capture.json`);
