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
  WEATHER_PROBE_MS,
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

  // ── 날씨 전환 프로브 ────────────────────────────────────────────────────
  //
  // 하늘 엔진(`sky.js`)의 기본 상태는 `weather:'clear'`다. 그래서 페이지를 띄우기만
  // 해서는 **비·눈 코드가 단 한 프레임도 실행되지 않는다.** 강수 관련 변경을 하고
  // "스모크 콘솔 에러 0"을 근거로 쓰면 그건 그 코드를 재지 않은 것이다 — 실제로
  // 그렇게 통과시킨 적이 있다(2026-07-27, 눈을 Points→InstancedMesh로 바꾼 커밋을
  // 검수관이 잡았다). 못 잰 것은 통과가 아니다.
  //
  // 여기서 보는 것은 **JS 런타임 예외**다(인덱스 초과·잘못된 인자·null 참조 등).
  // 눈이 화면에 실제로 보이는지는 WebGPU 문제라 헤드리스로 검증할 수 없지만,
  // 코드가 터지는지는 WebGL에서도 똑같이 잡힌다. 그 축은 여기서 닫는다.
  //
  // 버튼은 접힌 패널 안에 있어도 `.click()`은 DOM 호출이라 동작한다.
  const weatherProbed = [];
  if (pageSpec.weatherProbe) {
    for (const w of ['rain', 'snow', 'overcast', 'clear']) {
      const hit = await page.evaluate((weather) => {
        const b = document.querySelector(`button[data-weather="${weather}"]`);
        if (!b) return false;
        b.click();
        return true;
      }, w).catch(() => false);
      if (!hit) continue;
      weatherProbed.push(w);
      // 강수 입자가 실제로 몇 프레임 갱신되게 둔다(setMatrixAt 루프 진입).
      await page.waitForTimeout(WEATHER_PROBE_MS);
    }
  }

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
    // 실제로 밟은 날씨. 빈 배열이면 **프로브가 아무것도 실행하지 않았다**는 뜻이고,
    // 그때 "콘솔 에러 0"은 강수 코드에 대해 아무 말도 하지 않는다. run.mjs가 이 값을
    // 보고 판정한다 — 실행 여부를 보고하지 않으면 이 프로브도 장식이 된다.
    weatherProbed,
  };
}
