// scripts/smoke/assemble.mjs
// _site 조립 레시피를 로컬에서 재현한다. 두 방식 모두 지원:
//  · assembleSite()     = web직조립(baseline) — 현행 deploy.yml 의 cp 재배치 복제.
//  · assembleSiteVite() = vite 조립 — 교체될 deploy.yml(B-2b-3) 의 vite build 기반.
// (생성기 실행은 run.mjs 의 검사1 에서 선행 — 여기서는 파일 배치만.)

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SITE_DIR } from './config.mjs';

// ── baseline: web직조립 (현행 deploy.yml `run:` 조립 스텝과 1:1) ──────
// 유지보수 시 .github/workflows/deploy.yml 의 조립 스텝과 함께 갱신할 것.
// $OUT 은 대상 디렉토리(기본 _site).
const ASSEMBLE_BASELINE_SH = `
set -euo pipefail
rm -rf "$OUT" && mkdir -p "$OUT/app"
cp web/landing.html "$OUT/index.html"
cp web/guide.html   "$OUT/guide.html"
cp web/design.html  "$OUT/design.html"
cp web/about.html   "$OUT/about.html"
cp -r web/.          "$OUT/app/"
cp -r devlog team valuation "$OUT/"
cp sitemap.xml robots.txt "$OUT/" 2>/dev/null || true
touch "$OUT/.nojekyll"
`;

// ── vite 조립 (교체될 deploy.yml B-2b-3 과 1:1) ──────────────────────
// vite build → dist(base /openartshow/, HTML rename·CSP정합·자기완결 플러그인 적용) →
// dist 를 통째 $OUT 으로 복사 → 생성기/정적(devlog·team·valuation·sitemap·robots·.nojekyll)
// 을 얹는다. 즉 vite _site = dist + 생성기 + 정적. (rename 은 vite 플러그인이 수행 —
// baseline 의 cp 재배치 로직이 사라진다.)
const ASSEMBLE_VITE_SH = `
set -euo pipefail
./node_modules/.bin/vite build
rm -rf "$OUT" && mkdir -p "$OUT"
cp -r dist/.          "$OUT/"
cp -r devlog team valuation "$OUT/"
cp sitemap.xml robots.txt "$OUT/" 2>/dev/null || true
touch "$OUT/.nojekyll"
`;

// _site 를 web직조립(baseline) 방식으로 조립. 실패 시 예외 전파.
export function assembleSite(targetDir = SITE_DIR) {
  execFileSync('bash', ['-c', ASSEMBLE_BASELINE_SH], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, OUT: targetDir },
  });
}

// _site 를 vite 조립 방식으로 조립(vite build 포함). 실패 시 예외 전파.
export function assembleSiteVite(targetDir = SITE_DIR) {
  execFileSync('bash', ['-c', ASSEMBLE_VITE_SH], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, OUT: targetDir },
  });
}

// 모드별 조립 함수 선택기.
export const ASSEMBLERS = {
  baseline: assembleSite,
  vite: assembleSiteVite,
};

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
