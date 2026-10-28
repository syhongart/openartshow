#!/usr/bin/env node
// world2 를 브라우저에서 열어 **GLB 를 내보내 파일로 받는다.**
//
// ── 무엇에 쓰나 ─────────────────────────────────────────────────────────────
// `world8` 의 고정 자산을 만드는 첫 단계다. 두 번째 단계(`blender-edit.py`)가 이
// 파일을 블렌더로 열어 조형물을 하나 얹고 다시 내보낸다.
//
// ⚠ **이것은 게이트가 아니다.** CI 에 물려 있지 않고 배포를 막지 않는다. 자산을
// 다시 구워야 할 때 손으로 돌리는 도구다. 판정도 하지 않는다 — 받은 파일이 옳은지는
// `measure:glb-roundtrip` 이 본다(그쪽이 판정 주체다).
//
// ⚠⚠ **브라우저를 쓰므로 다른 브라우저 작업과 겹쳐 돌리지 않는다**(`CLAUDE.md`:
// 이 환경은 4코어·GPU 0 이라 CPU 래스터라이저 두 벌이 코어를 나눠 쓴다).
//
//   사용: node scripts/asset/extract-world2-glb.mjs <출력경로.glb>

import fs from 'node:fs';
import { startServer } from '../smoke/server.mjs';
import { launchBrowser } from '../smoke/browser-checks.mjs';
import { assembleSiteVite } from '../smoke/assemble.mjs';
import { SITE_DIR, BASE_PATH } from '../smoke/config.mjs';

const out = process.argv[2];
if (!out) { console.error('사용: node scripts/asset/extract-world2-glb.mjs <출력경로.glb>'); process.exit(2); }

console.log('[1] 조립');
assembleSiteVite(SITE_DIR);

const { origin, close } = await startServer(SITE_DIR, BASE_PATH);
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, acceptDownloads: true });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));

try {
  console.log('[2] world2 부팅');
  await page.goto(`${origin}${BASE_PATH}/app/world2.html`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => !!window.__world2, null, { timeout: 180_000 });

  console.log('[3] 내보내기 패널 열기');
  await page.locator('#w2-god-toggle').click({ noWaitAfter: true, timeout: 120_000 });
  await page.locator('#w2-export-glb').waitFor({ state: 'visible', timeout: 120_000 });

  console.log('[4] 내보내기 — 다운로드 대기');
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 900_000 }),
    page.locator('#w2-export-glb').click({ noWaitAfter: true, timeout: 120_000 }),
  ]);
  await dl.saveAs(out);
  const mb = (fs.statSync(out).size / 1048576).toFixed(2);
  console.log(`[5] 받음 — ${out} (${mb}MB)`);
  if (errs.length) console.log(`⚠ 콘솔 에러 ${errs.length}건 — ${errs.slice(0, 3).join(' | ')}`);
} finally {
  await browser.close();
  await close();
}
