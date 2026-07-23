// scripts/smoke/browser-checks.mjs
// 헤드리스 크로미움으로 라이브 페이지를 로드하고 검사4/5/6 + 가드A/B 에
// 필요한 원시 데이터를 페이지별로 수집한다. 판정·집계는 run.mjs 가 한다.

import { chromium } from 'playwright-core';
import {
  CHROMIUM_EXECUTABLE,
  CHROMIUM_ARGS,
  PAGE_TIMEOUT_MS,
  WEBGL_WAIT_MS,
  REFLOW_WAIT_MS,
  VIEWPORTS,
} from './config.mjs';

export async function launchBrowser() {
  return chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE,
    args: CHROMIUM_ARGS,
  });
}

// 한 페이지를 로드해 원시 데이터를 수집한다.
// urlPrefix: 서브패스 마운트 프리픽스(vite 모드 '/openartshow', baseline '') — 정본
//   배포 URL(github.io/openartshow/…)을 재현해 절대경로 자산참조가 실제로 해소되는지 검증.
// 반환: { consoleErrors, pageErrors, cspMeta, cspViolations, inline, links, overflow, externalRequests }
export async function collectPage(browser, origin, pageSpec, urlPrefix = '') {
  const context = await browser.newContext({ viewport: { width: VIEWPORTS[VIEWPORTS.length - 1], height: 900 } });

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = []; // 404 및 기타 실패 요청
  // 외부요청(자기완결 위반) 수집: 로컬 서버 origin·data:·blob: 이외의 네트워크 요청.
  // CSP default-src 'self' 로 대부분 차단되나, 시도 자체를 직접 포착해 0 을 증명한다.
  const externalRequests = [];

  // CSP 위반(securitypolicyviolation)은 DOM 이벤트다 — goto 전에 리스너를 심어
  // 초기 로드 위반까지 잡는다. 수집 배열은 window 에 둔다.
  await context.addInitScript(() => {
    window.__cspv = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__cspv.push(`${e.violatedDirective} <- ${e.blockedURI || e.sourceFile || 'inline'}`);
    });
  });

  const page = await context.newPage();
  page.on('console', (m) => {
    const text = m.text();
    // console.error 캡처 (가장 흔함)
    if (m.type() === 'error') {
      consoleErrors.push(text);
    }
  });
  page.on('pageerror', (e) => pageErrors.push(e.message || String(e)));
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith('data:') || u.startsWith('blob:')) return;
    if (!u.startsWith(origin + '/')) externalRequests.push(u.slice(0, 120));
  });
  page.on('response', (r) => {
    // ≥400 응답 모두 캡처 (404 외에도 403, 500 등)
    if (r.status() >= 400) {
      const url = r.url().replace(origin, '').slice(0, 120);
      failedRequests.push(`${r.status()} ${url}`);
    }
  });

  const url = origin + urlPrefix + pageSpec.url;
  await page.goto(url, { waitUntil: 'load', timeout: PAGE_TIMEOUT_MS });

  // 네트워크 안정 대기 + WebGL 씬은 부팅 시간 추가 확보(swiftshader 느림).
  try {
    await page.waitForLoadState('networkidle', { timeout: PAGE_TIMEOUT_MS });
  } catch {
    /* networkidle 미도달은 치명적이지 않음 — 계속 진행 */
  }
  if (pageSpec.webgl) await page.waitForTimeout(WEBGL_WAIT_MS);

  // CSP 메타 + 인라인 script + 내부 링크 + 위반 로그를 한 번에 추출.
  const dom = await page.evaluate(() => {
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy" i]');
    const scripts = Array.from(document.querySelectorAll('script:not([src])'));
    const typeOf = (s) => (s.getAttribute('type') || '').toLowerCase().trim();
    const execTypes = new Set(['', 'module', 'text/javascript', 'application/javascript']);
    let importmap = 0;
    let dataBlock = 0;
    let execInline = 0;
    for (const s of scripts) {
      const t = typeOf(s);
      if (t === 'importmap') importmap += 1;
      else if (execTypes.has(t)) execInline += 1;
      else dataBlock += 1; // application/ld+json 등 비실행 데이터 블록
    }
    const links = Array.from(document.querySelectorAll('a[href]')).map((a) => a.href);
    return {
      cspMeta: meta ? meta.getAttribute('content') : null,
      inline: { execInline, dataBlock, importmap },
      links,
      cspViolations: window.__cspv || [],
    };
  });

  // 검사5: 각 뷰포트에서 가로 넘침 측정 (같은 페이지, 뷰포트만 변경 후 재배치 대기).
  const overflow = [];
  for (const vw of VIEWPORTS) {
    await page.setViewportSize({ width: vw, height: 900 });
    await page.waitForTimeout(REFLOW_WAIT_MS);
    const m = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    overflow.push({ vw, ...m, overflow: m.scrollWidth > m.innerWidth });
  }

  await context.close();

  return {
    name: pageSpec.name,
    url: pageSpec.url,
    consoleErrors,
    pageErrors,
    failedRequests,
    cspMeta: dom.cspMeta,
    cspViolations: dom.cspViolations,
    inline: dom.inline,
    links: dom.links,
    overflow,
    externalRequests,
  };
}
