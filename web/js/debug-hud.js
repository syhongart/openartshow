// debug-hud.js — 개발용 월드 상태 디버그 HUD (behind-flag `?debug=hud`).
//
// 목적: 개발 단계에서 현재 위치·시선·LOD 프리셋·fog·스트리밍 상태와 FPS를 상시 보고,
//       "복사" 버튼으로 한 줄 상태 텍스트를 클립보드에 담아 버그 보고에 바로 붙여넣는다.
//
// 완전 분리(감독 요청): world.js·world-boot.js 로직에 절대 손대지 않는다. world 공개
//   API만 읽는다(getStats·getCurrentParcel·getYaw/getPitch·getGroundY·getScene·getRenderer·
//   getCamera). FPS는 이 모듈이 자체 rAF로 계측한다(월드 무접촉).
//
// behind-flag: world-boot이 `?debug=hud`일 때만 동적 import → 일반 방문자는 네트워크
//   로드·실행 자체가 0(완전 무영향). "책갈피처럼 상시" = 개발자가 ?debug=hud URL을 북마크.
//
// 자기완결: 외부 호스트 0, 인라인 스크립트 아님(모듈 파일). 복사는 navigator.clipboard
//   (+ execCommand 폴백)만 — 네트워크 전송 0. CSP `default-src 'self'` 유지(perf HUD와 동일 패턴).

/**
 * 월드 상태 디버그 HUD를 마운트한다.
 * @param {object} world world.js가 반환한 월드 객체(공개 API만 사용)
 * @returns {{el:HTMLElement, getText:Function, dispose:Function}|undefined}
 */
export function mountDebugHud(world) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !world) return;
  if (window.__debugHudMounted) return window.__debugHudMounted; // 중복 마운트 방지

  const renderer = typeof world.getRenderer === 'function' ? world.getRenderer() : null;
  const scene = typeof world.getScene === 'function' ? world.getScene() : null;
  const camera = typeof world.getCamera === 'function' ? world.getCamera() : null;
  const lod = new URLSearchParams(location.search).get('lod') || 'a';

  // ── 오버레이 — 좌상단 고정(perf HUD 우상단과 안 겹침), 터치 통과 ──
  const el = document.createElement('div');
  el.id = 'debug-hud';
  el.style.cssText = [
    'position:fixed',
    'top:max(10px,env(safe-area-inset-top,0px))',
    'left:max(10px,env(safe-area-inset-left,0px))',
    'z-index:2147483646',
    'pointer-events:none',            // 조작 무방해 — 복사 버튼 바만 개별 auto
    'user-select:none',
    'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    'color:#fff',
    'background:rgba(0,0,0,0.72)',
    'border:2px solid rgba(120,230,225,0.5)',
    'border-radius:10px',
    'padding:7px 10px 8px',
    'font-size:12px',
    'font-weight:600',
    'line-height:1.28',
    'white-space:pre',
    'text-shadow:0 1px 2px #000',
    'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
  ].join(';');

  const bodyEl = document.createElement('div');
  el.appendChild(bodyEl);

  // 복사 버튼(상시) — 부모 pointer-events:none이라 이 바만 auto로 클릭 수신
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:6px;pointer-events:auto;';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.textContent = '복사';
  btn.style.cssText =
    'pointer-events:auto;min-height:28px;padding:4px 14px;border-radius:7px;' +
    'border:1px solid rgba(120,230,225,0.6);background:rgba(20,30,30,0.92);color:#bfe3ec;' +
    'font:700 12px/1 ui-monospace,Menlo,Consolas,monospace;cursor:pointer;' +
    '-webkit-tap-highlight-color:transparent;touch-action:manipulation;';
  const hint = document.createElement('span');
  hint.style.cssText = 'font-size:10px;font-weight:700;opacity:0.9;color:#CFFFC0;';
  bar.appendChild(btn); bar.appendChild(hint);
  el.appendChild(bar);
  (document.body || document.documentElement).appendChild(el);

  // ── FPS 자체 rAF 계측(월드 무접촉) ──
  let frames = 0, acc = 0, lastT = performance.now(), fps = 0, raf = 0;

  function snapshot() {
    const s = safe(() => world.getStats(), {});
    const p = safe(() => world.getCurrentParcel(), {});
    const yaw = safe(() => world.getYaw(), 0);
    const pitch = safe(() => world.getPitch(), 0);
    const gy = safe(() => world.getGroundY(), 0);
    const pos = camera && camera.position ? camera.position : { x: 0, y: 0, z: 0 };
    const fog = scene && scene.fog ? scene.fog : null;
    const dpr = renderer && typeof renderer.getPixelRatio === 'function' ? renderer.getPixelRatio() : 0;
    const rinfo = renderer && renderer.info ? renderer.info.render : null;
    const num = (v, d = 1) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d) : '?');
    return {
      fps: num(fps, 0),
      lod, shellFlat: !!s.shellFlat,
      parcel: `(${p.px ?? '?'},${p.pz ?? '?'})`,
      posx: num(pos.x), posz: num(pos.z), y: num(pos.y), groundY: num(gy),
      yaw: num(yaw * 180 / Math.PI, 0), pitch: num(pitch * 180 / Math.PI, 0),
      fog: fog ? `${num(fog.near)}/${num(fog.far)}` : '—',
      dpr: num(dpr, 2),
      draw: rinfo ? rinfo.calls : '?',
      loaded: `${s.loadedFull ?? '?'}f/${s.loadedShell ?? '?'}s`,
      queue: s.queue ?? '?',
    };
  }

  function render() {
    const d = snapshot();
    bodyEl.textContent =
      `FPS ${d.fps}\n` +
      `LOD ${d.lod}  shell:${d.shellFlat ? 'flat' : 'off'}\n` +
      `fog ${d.fog}  dpr ${d.dpr}\n` +
      `파셀 ${d.parcel}  y ${d.y} (지면 ${d.groundY})\n` +
      `pos ${d.posx},${d.posz}\n` +
      `yaw ${d.yaw}°  pitch ${d.pitch}°\n` +
      `draw ${d.draw}  load ${d.loaded} q${d.queue}`;
  }

  function copyText() {
    const d = snapshot();
    return `[world?lod=${d.lod}] FPS ${d.fps} | fog ${d.fog} shell:${d.shellFlat ? 'flat' : 'off'} dpr ${d.dpr} ` +
      `| 파셀${d.parcel} pos(${d.posx},${d.posz}) y${d.y} 지면${d.groundY} | yaw${d.yaw}° pitch${d.pitch}° ` +
      `| draw ${d.draw} load ${d.loaded} q${d.queue} | ${navigator.userAgent}`;
  }

  function flash(msg) { hint.textContent = msg; clearTimeout(flash._t); flash._t = setTimeout(() => { hint.textContent = ''; }, 2000); }

  async function onCopy() {
    const txt = copyText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(txt); flash('복사됨'); return;
      }
    } catch (_) { /* 폴백 */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = txt; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      (document.body || document.documentElement).appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove(); flash(ok ? '복사됨' : '복사 실패');
    } catch (_) { flash('복사 실패'); }
  }
  btn.addEventListener('click', onCopy);

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = now - lastT; lastT = now;
    frames++; acc += dt;
    if (acc >= 500) { fps = (frames * 1000) / acc; frames = 0; acc = 0; render(); } // 0.5초 갱신
  }
  render();
  raf = requestAnimationFrame(tick);

  const api = {
    el,
    getText: () => copyText(),        // 헤드리스/자동화용 훅
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (window.__debugHudMounted === api) window.__debugHudMounted = null;
    },
  };
  window.__debugHudMounted = api;
  return api;
}

function safe(fn, dflt) { try { const v = fn(); return v == null ? dflt : v; } catch (_) { return dflt; } }
