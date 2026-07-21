// scripts/smoke/server.mjs
// _site 를 서빙하는 최소 정적 http 서버 (file:// 아님 — 라이브와 동일 오리진 로드).
// 포트 0 자동할당. 끝나면 close() 로 확실히 닫는다.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

// rootDir 를 오리진 루트로 서빙. resolve → { server, port, origin, close }.
//
// basePath(예 '/openartshow/')가 주어지면 그 서브패스에 rootDir 를 마운트한다:
// vite 산출물은 자산을 절대경로 /openartshow/_bundle/… 로 참조하므로, 서버가
// 프리픽스를 strip 해 rootDir 하위로 매핑한다(= github.io/openartshow/ 배포 재현).
// basePath 밖 요청(예 브라우저 자동 /favicon.ico)은 strip 없이 통과 → 아래 404/204 로직.
export function startServer(rootDir, basePath = null) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath;
      try {
        urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      } catch {
        res.writeHead(400);
        res.end('bad request');
        return;
      }
      // 서브패스 마운트: 프리픽스 strip. '/openartshow/' → '/', '/openartshow/app/x'
      // → '/app/x'. 프리픽스 없는 정확히 '/openartshow'(끝슬래시 없음)도 '/' 로 흡수.
      if (basePath) {
        if (urlPath.startsWith(basePath)) urlPath = '/' + urlPath.slice(basePath.length);
        else if (urlPath + '/' === basePath) urlPath = '/';
      }
      if (urlPath.endsWith('/')) urlPath += 'index.html';

      let filePath = path.normalize(path.join(rootDir, urlPath));
      // 루트 이탈 방지
      if (filePath !== rootDir && !filePath.startsWith(rootDir + path.sep)) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      try {
        const st = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
        if (st && st.isDirectory()) filePath = path.join(filePath, 'index.html');
        if (!fs.existsSync(filePath)) {
          // favicon.ico 부재는 브라우저가 자동 요청하는 노이즈다. 콘솔 error 오염을
          // 막기 위해 204(빈 응답)로 흡수한다. 그 외 404 는 실제 누락 신호로 남긴다.
          if (path.basename(filePath) === 'favicon.ico') {
            res.writeHead(204);
            res.end();
            return;
          }
          res.writeHead(404);
          res.end('404');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        port,
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
