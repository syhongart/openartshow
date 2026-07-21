// scripts/smoke/assemble.mjs
// deploy.yml 의 _site 조립 레시피를 로컬에서 그대로 재현한다.
// (생성기 실행은 run.mjs 의 검사1 에서 별도 수행 — 여기서는 파일 배치만.)

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SITE_DIR } from './config.mjs';

// deploy.yml `run:` 조립 스텝과 1:1 대응하는 bash 스크립트.
// 유지보수 시 .github/workflows/deploy.yml 의 조립 스텝과 함께 갱신할 것.
const ASSEMBLE_SH = `
set -euo pipefail
rm -rf _site && mkdir -p _site/app
cp web/landing.html _site/index.html
cp web/guide.html   _site/guide.html
cp web/design.html  _site/design.html
cp web/about.html   _site/about.html
cp -r web/.          _site/app/
cp -r devlog team valuation _site/
cp sitemap.xml robots.txt _site/ 2>/dev/null || true
touch _site/.nojekyll
`;

// _site 를 deploy.yml 방식으로 조립. 실패 시 예외 전파.
export function assembleSite() {
  execFileSync('bash', ['-c', ASSEMBLE_SH], { cwd: ROOT, stdio: 'pipe' });
}

// SITE_DIR 하위 일반 파일 개수를 재귀로 센다 (find -type f | wc -l 과 동치).
export function countFiles(dir = SITE_DIR) {
  let n = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) n += countFiles(p);
    else if (ent.isFile()) n += 1;
  }
  return n;
}
