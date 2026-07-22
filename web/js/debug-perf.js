// debug-perf.js — 실기기 성능 계측 디버그 HUD (behind-flag).
//
// 목적: swiftshader 헤드리스가 실 GPU를 재현 못 해, 감독이 실기기(PC·모바일)
//       스크린샷으로 프레임 실수치를 회신할 수 있게 화면에 성능 지표를 띄운다.
//
// behind-flag 규율: 이 모듈은 각 진입점의 `?debug=perf` 게이트 뒤 "동적 import"로만
//   로드된다. 쿼리스트링이 없으면 네트워크 로드·실행 자체가 0 → 일반 방문자 완전 무영향.
//
// 자기완결: 외부 호스트 0(폰트·스크립트·이미지 전부 self). 인라인 스크립트 아님(모듈 파일).
//   DOM 오버레이만 생성하며 렌더 파이프라인에 개입하지 않는다(pointer-events:none).

/**
 * 성능 HUD를 마운트한다.
 * @param {import('three').WebGLRenderer} renderer 대상 렌더러(getPixelRatio·info 조회)
 * @param {string} page 페이지 식별 라벨(index/world/builder)
 * @param {{getSpec?:()=>*, getLite?:()=>*}} [extra] 페이지별 부가 지표 조회기(선택)
 * @returns {{el:HTMLElement, dispose:Function}|undefined}
 */
export function mountPerfHud(renderer, page = '?', extra = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !renderer) return;
  if (window.__perfHudMounted) return window.__perfHudMounted; // 중복 마운트 방지(다중 진입 안전)

  const getSpec = typeof extra.getSpec === 'function' ? extra.getSpec : () => null;
  const getLite = typeof extra.getLite === 'function' ? extra.getLite : () => undefined;

  // ── 오버레이 컨테이너 — 우상단 고정, safe-area(노치·상단바) 회피, 터치 통과 ──
  const el = document.createElement('div');
  el.id = 'perf-hud';
  el.style.cssText = [
    'position:fixed',
    'top:max(10px,env(safe-area-inset-top,0px))',
    'right:max(10px,env(safe-area-inset-right,0px))',
    'z-index:2147483647',            // 어떤 UI(조이스틱·HUD)보다 위 — 단 pointer-events:none이라 조작 방해 0
    'pointer-events:none',           // 터치·클릭 통과(감독 조작 무방해)
    'user-select:none',
    'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    'color:#fff',
    'background:rgba(0,0,0,0.74)',   // 고대비 배경 플레이트 — 밝은 씬에서도 숫자 판독
    'border:2px solid rgba(255,255,255,0.4)',
    'border-radius:12px',
    'padding:8px 12px 9px',
    'text-align:right',
    'text-shadow:0 1px 2px #000, 0 0 6px rgba(0,0,0,0.9)',
    'line-height:1.12',
    'max-width:64vw',
    'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
  ].join(';');

  // FPS — 최상단, 가장 큰 글씨(감독이 프레임 수치를 제일 먼저 본다)
  const fpsLine = document.createElement('div');
  fpsLine.style.cssText = 'font-size:36px;font-weight:800;letter-spacing:0.3px;';

  // 최악 프레임(직전 1초 창의 최소 FPS = 버벅 순간) + 세션 최소
  const subLine = document.createElement('div');
  subLine.style.cssText = 'font-size:14px;font-weight:700;opacity:0.95;margin-top:1px;';

  // 나머지 지표(spec·pixelRatio·lite·드로우콜·삼각형·텍스처힙·페이지) — FPS 아래 작게
  const info = document.createElement('div');
  info.style.cssText = 'font-size:12px;font-weight:600;opacity:0.9;margin-top:6px;white-space:pre;';

  el.appendChild(fpsLine);
  el.appendChild(subLine);
  el.appendChild(info);
  (document.body || document.documentElement).appendChild(el);

  // ── rAF 실측 — 1초 평균 + 그 1초 창의 최악(가장 느린) 프레임 + 세션 최소 ──
  let frames = 0;
  let acc = 0;             // 1초 창 누적 시간(ms)
  let worstDt = 0;         // 1초 창 내 최대 프레임 간격(ms) → 최악 FPS
  let warm = 0;            // 초기 워밍업 프레임 스킵(첫 렌더 스파이크 배제)
  let lastT = performance.now();
  let avg = 0;             // 1초 평균 FPS
  let worst = 0;           // 직전 1초 창의 최악 FPS
  let gmin = Infinity;     // 세션 누적 최소(최악 창의 최소값)
  let raf = 0;

  function draw() {
    const rInfo = renderer.info && renderer.info.render ? renderer.info.render : { calls: 0, triangles: 0 };
    const mInfo = renderer.info && renderer.info.memory ? renderer.info.memory : { textures: 0 };
    const pr = typeof renderer.getPixelRatio === 'function' ? renderer.getPixelRatio() : (renderer.getPixelRatio || 0);
    const prTxt = typeof pr === 'number' ? pr.toFixed(2) : String(pr);
    const spec = getSpec();
    const lite = getLite();

    fpsLine.textContent = (avg > 0 ? avg.toFixed(0) : '--') + ' FPS';
    // 고대비 색상 신호 — 50↑ 초록 / 30↑ 노랑 / 그 이하 빨강
    fpsLine.style.color = avg >= 50 ? '#7CFC7C' : avg >= 30 ? '#FFD54A' : '#FF6060';

    subLine.textContent =
      'worst ' + (worst > 0 ? worst.toFixed(0) : '--') +
      ' · min ' + (isFinite(gmin) ? gmin.toFixed(0) : '--');

    const rows = [];
    let l1 = 'spec ' + (spec == null ? '—' : spec);
    if (lite !== undefined) l1 += ' · lite ' + (lite ? 'ON' : 'off');
    rows.push(l1);
    rows.push('px ' + prTxt);
    rows.push('draw ' + rInfo.calls + ' · tri ' + (rInfo.triangles / 1000).toFixed(1) + 'k');
    rows.push('tex ' + mInfo.textures);
    rows.push('page ' + page);
    info.textContent = rows.join('\n');
  }

  function tick(now) {
    const dt = now - lastT;
    lastT = now;
    raf = requestAnimationFrame(tick);
    if (warm < 3) { warm++; return; } // 첫 몇 프레임(리소스 업로드 스파이크) 제외
    frames++;
    acc += dt;
    if (dt > worstDt) worstDt = dt;
    if (acc >= 1000) {
      avg = (frames * 1000) / acc;
      worst = worstDt > 0 ? 1000 / worstDt : 0;
      if (worst < gmin) gmin = worst;
      frames = 0; acc = 0; worstDt = 0;
      draw();
    }
  }

  draw();                              // 진입 즉시 골격 표시(첫 1초 집계 전에도 HUD 가시)
  raf = requestAnimationFrame(tick);

  const api = {
    el,
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (window.__perfHudMounted === api) window.__perfHudMounted = null;
    },
  };
  window.__perfHudMounted = api;
  return api;
}
