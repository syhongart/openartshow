// debug-hud.js — 개발용 월드 상태 디버그 HUD + 시계열 로그 (behind-flag `?debug=hud`).
//
// 목적: 개발 단계에서 위치·시선·LOD 프리셋·fog·스트리밍·FPS를 상시 HUD로 보고,
//       0.5초 주기로 상태를 시계열 링버퍼에 축적해 "복사"(CSV 클립보드)·"저장"(CSV 파일)으로
//       뽑아 파셀 경계 히칭·팝인 같은 순간 부하를 사후 분석한다(perf 로그와 동일 방식).
//
// 완전 분리(감독 요청): world.js·world-boot.js 로직 무접촉. world 공개 API만 읽는다. FPS는 자체 rAF.
// behind-flag: world-boot이 `?debug=hud`일 때만 동적 import → 일반 방문자 로드·실행 0. "책갈피처럼 상시".
// 자기완결: 외부 호스트 0, 인라인 스크립트 아님. 복사/저장은 navigator.clipboard·로컬 Blob만(네트워크 0).
//   CSP `default-src 'self'` 유지(perf HUD와 동일 패턴).

const REC_CAP = 3600;       // 0.5초 샘플 × 3600 = 최근 30분 링버퍼(초과 시 오래된 것부터 회전)
const REC_INTERVAL_MS = 500; // 시계열 샘플 주기(HUD 갱신과 동일)
const CSV_HEADER = 't_s,fps,lod,shellFlat,fog_near,fog_far,dpr,px,pz,posx,posz,y,groundY,yaw_deg,pitch_deg,draw,loadedFull,loadedShell,queue';

/**
 * 월드 상태 디버그 HUD + 시계열 로그를 마운트한다.
 * @param {object} world world.js가 반환한 월드 객체(공개 API만 사용)
 * @returns {{el:HTMLElement, getCsv:Function, getText:Function, dispose:Function}|undefined}
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
    'pointer-events:none',            // 조작 무방해 — 버튼 바만 개별 auto
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

  // 버튼 바(상시) — 부모 pointer-events:none이라 이 바만 auto. 복사(시계열 CSV) + 저장(CSV 파일).
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:6px;pointer-events:auto;flex-wrap:wrap;';
  const btnCss =
    'pointer-events:auto;min-height:28px;padding:4px 12px;border-radius:7px;' +
    'border:1px solid rgba(120,230,225,0.6);background:rgba(20,30,30,0.92);color:#bfe3ec;' +
    'font:700 12px/1 ui-monospace,Menlo,Consolas,monospace;cursor:pointer;' +
    '-webkit-tap-highlight-color:transparent;touch-action:manipulation;';
  const btnCopy = document.createElement('button');
  btnCopy.type = 'button'; btnCopy.textContent = '복사'; btnCopy.style.cssText = btnCss;
  const btnSave = document.createElement('button');
  btnSave.type = 'button'; btnSave.textContent = '저장'; btnSave.style.cssText = btnCss;
  const btnClear = document.createElement('button');
  btnClear.type = 'button'; btnClear.textContent = '지움'; btnClear.style.cssText = btnCss;
  const hint = document.createElement('span');
  hint.style.cssText = 'font-size:10px;font-weight:700;opacity:0.9;color:#CFFFC0;';
  bar.appendChild(btnCopy); bar.appendChild(btnSave); bar.appendChild(btnClear); bar.appendChild(hint);
  el.appendChild(bar);
  (document.body || document.documentElement).appendChild(el);

  // ── FPS 자체 rAF 계측(월드 무접촉) + 시계열 링버퍼 ──
  let frames = 0, acc = 0, lastT = performance.now(), fps = 0, raf = 0;
  const startT = performance.now();
  const rec = []; // CSV 행 문자열 링버퍼(최근 REC_CAP개)

  const num = (v, d = 1) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d) : '?');

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
    return {
      fps, lod, shellFlat: !!s.shellFlat,
      px: p.px, pz: p.pz,
      posx: pos.x, posz: pos.z, y: pos.y, groundY: gy,
      yawDeg: yaw * 180 / Math.PI, pitchDeg: pitch * 180 / Math.PI,
      fogNear: fog ? fog.near : null, fogFar: fog ? fog.far : null,
      dpr, draw: rinfo ? rinfo.calls : null,
      loadedFull: s.loadedFull, loadedShell: s.loadedShell, queue: s.queue,
    };
  }

  function render() {
    const d = snapshot();
    bodyEl.textContent =
      `FPS ${num(d.fps, 0)}\n` +
      `LOD ${d.lod}  shell:${d.shellFlat ? 'flat' : 'off'}\n` +
      `fog ${num(d.fogNear)}/${num(d.fogFar)}  dpr ${num(d.dpr, 2)}\n` +
      `파셀 (${d.px ?? '?'},${d.pz ?? '?'})  y ${num(d.y)} (지면 ${num(d.groundY)})\n` +
      `pos ${num(d.posx)},${num(d.posz)}\n` +
      `yaw ${num(d.yawDeg, 0)}°  pitch ${num(d.pitchDeg, 0)}°\n` +
      `draw ${d.draw ?? '?'}  load ${d.loadedFull ?? '?'}f/${d.loadedShell ?? '?'}s q${d.queue ?? '?'}`;
    hint.textContent = rec.length ? `rec ${rec.length} (${Math.round(rec.length * REC_INTERVAL_MS / 1000)}s)` : '';
  }

  // 현재 스냅샷 1줄(헤드리스 훅·수동 복사용)
  function copyText() {
    const d = snapshot();
    return `[world?lod=${d.lod}] FPS ${num(d.fps, 0)} | fog ${num(d.fogNear)}/${num(d.fogFar)} shell:${d.shellFlat ? 'flat' : 'off'} ` +
      `dpr ${num(d.dpr, 2)} | 파셀(${d.px},${d.pz}) pos(${num(d.posx)},${num(d.posz)}) y${num(d.y)} | ` +
      `yaw${num(d.yawDeg, 0)}° pitch${num(d.pitchDeg, 0)}° | draw ${d.draw} load ${d.loadedFull}f/${d.loadedShell}s q${d.queue} | ${navigator.userAgent}`;
  }

  // 시계열 CSV 행(숫자 원본 — 사후 분석용)
  function recRow(now) {
    const d = snapshot();
    const t = ((now - startT) / 1000).toFixed(1);
    const c = (v, dg = 2) => (typeof v === 'number' && isFinite(v) ? v.toFixed(dg) : '');
    return [
      t, num(d.fps, 0), d.lod, d.shellFlat ? 1 : 0,
      c(d.fogNear, 1), c(d.fogFar, 1), c(d.dpr, 2),
      d.px ?? '', d.pz ?? '', c(d.posx, 1), c(d.posz, 1), c(d.y, 1), c(d.groundY, 1),
      c(d.yawDeg, 0), c(d.pitchDeg, 0), d.draw ?? '',
      d.loadedFull ?? '', d.loadedShell ?? '', d.queue ?? '',
    ].join(',');
  }

  function buildCsv() { return CSV_HEADER + '\n' + rec.join('\n'); }

  function flash(msg) { hint.textContent = msg; clearTimeout(flash._t); flash._t = setTimeout(render, 2000); }

  // 클립보드 쓰기(보안컨텍스트 우선, execCommand·textarea 폴백 — perf HUD 패턴)
  async function clipboardWrite(txt) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(txt); return true;
      }
    } catch (_) { /* 폴백 */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = txt; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      (document.body || document.documentElement).appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove(); return !!ok;
    } catch (_) { return false; }
  }

  async function onCopyLog() {
    if (!rec.length) { flash('샘플 대기…(0.5s)'); return; }
    const ok = await clipboardWrite(buildCsv());
    flash(ok ? `로그 복사 ${rec.length}행` : '복사 실패→저장 사용');
  }

  function onSaveLog() {
    if (!rec.length) { flash('샘플 대기…(0.5s)'); return; }
    try {
      const blob = new Blob([buildCsv()], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const d = new Date();
      const p2 = (n) => (n < 10 ? '0' + n : '' + n);
      const stamp = d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds());
      const a = document.createElement('a');
      a.href = url; a.download = 'worldhud-' + stamp + '.csv'; a.style.display = 'none';
      (document.body || document.documentElement).appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
      flash(`CSV 저장 ${rec.length}행`);
    } catch (_) { flash('저장 불가→복사 사용'); }
  }

  function onClear() { rec.length = 0; flash('로그 지움'); }

  btnCopy.addEventListener('click', onCopyLog);
  btnSave.addEventListener('click', onSaveLog);
  btnClear.addEventListener('click', onClear);

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = now - lastT; lastT = now;
    frames++; acc += dt;
    if (acc >= REC_INTERVAL_MS) {
      fps = (frames * 1000) / acc; frames = 0; acc = 0;
      render();
      rec.push(recRow(now));
      if (rec.length > REC_CAP) rec.shift();
    }
  }
  render();
  raf = requestAnimationFrame(tick);

  const api = {
    el,
    getCsv: () => buildCsv(),           // 헤드리스/자동화용 시계열 훅
    getText: () => copyText(),          // 현재 스냅샷 1줄 훅
    getSampleCount: () => rec.length,
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
