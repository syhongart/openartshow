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
export function startServer(rootDir) {
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
