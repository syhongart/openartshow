// world2/ui/hud.ts — 성능 HUD + 클립보드 복사.
//
// ── 존재 이유 ────────────────────────────────────────────────────────────────
// 감독은 폰으로 본다. 모바일에는 콘솔이 없으므로 화면에 띄우고 복사하는 것이 실기기 수치를
// 받는 유일한 경로다. 이 프로젝트의 결정적 진단은 전부 감독 실기기 수치에서 나왔다.
//
// ── HUD가 스스로 성능을 먹지 않게 ────────────────────────────────────────────
// 프레임마다 DOM을 만지면 HUD가 측정 대상을 왜곡한다. 표본 수집은 매 프레임(싼 배열 push),
// **화면 갱신은 저빈도**(기본 4Hz)로 분리한다. 관측이 관측 대상을 바꾸지 않게 하는 것이
// 계측의 기본이고, 이 프로젝트는 그걸 한 번 어겨서 계측 자체가 프레임을 먹은 적이 있다.

import {
  Ring, formatReport, summarize, hitchCount, constancy, type ReportInput,
} from '../decide/telemetry.js';

/** 링버퍼 용량 — 60fps에서 약 30초 */
const CAP = 1800;
/** 화면 갱신 주기(ms) */
const REDRAW_MS = 250;

export interface HudParts {
  root: HTMLElement;
  body: HTMLElement;
  copy: HTMLElement;
  toggle: HTMLElement;
}

/** HUD가 매 프레임 읽어갈 값들. main이 구현해 넘긴다. */
export interface HudSource {
  backend: () => string;
  counts: () => { draw: number; pipeline: number; geometries: number; textures: number };
  stream: () => { loaded: number; built: number; released: number; starved: number };
  adapt: () => { pixelRatio: number; frameCap: number; triAvg: number };
}

export interface PerfHud {
  /** 커널 probe에서 호출 — 표본만 쌓는다(싸야 한다) */
  sample(name: string, value: number): void;
  /** 프레임 끝에 호출 — 개수·스트리밍 스냅샷 */
  tick(): void;
  dispose(): void;
}

export function attachHud(parts: HudParts, src: HudSource): PerfHud {
  const frameMs = new Ring(CAP);
  const updMs = new Ring(CAP);
  const renderMs = new Ring(CAP);
  const outMs = new Ring(CAP);
  const draw = new Ring(CAP);
  const pipeline = new Ring(CAP);
  const geometries = new Ring(CAP);
  const textures = new Ring(CAP);
  const parcels = new Ring(CAP);

  let built = 0, released = 0;
  const startedAt = Date.now();
  let open = false;

  const snapshot = (): ReportInput => {
    const s = src.stream(); const a = src.adapt();
    return {
      backend: src.backend(),
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '—',
      dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '—',
      elapsedS: (Date.now() - startedAt) / 1000,
      frameMs: frameMs.values(), updMs: updMs.values(),
      renderMs: renderMs.values(), outMs: outMs.values(),
      draw: draw.values(), pipeline: pipeline.values(),
      geometries: geometries.values(), textures: textures.values(),
      parcels: parcels.values(),
      built, released, starved: s.starved,
      pixelRatio: a.pixelRatio, frameCap: a.frameCap, triAvg: a.triAvg,
    };
  };

  /** 화면용 짧은 요약. 복사본과 달리 한눈에 들어와야 한다. */
  const redraw = () => {
    if (!open) return;
    const f = summarize(frameMs.values());
    const fps = f.avg > 0 ? 1000 / f.avg : 0;
    const h = hitchCount(frameMs.values());
    const cd = constancy(draw.values());
    const cp = constancy(pipeline.values());
    const s = src.stream();
    const a = src.adapt();
    const warn = (ok: boolean) => (ok ? '' : ' ⚠');
    parts.body.textContent = [
      `${fps.toFixed(0)}fps  max ${f.max.toFixed(0)}ms  히칭 ${h}`,
      `draw ${cd.min}${cd.constant ? '' : `~${cd.max}`}${warn(cd.constant)}  pipe ${cp.min}${cp.constant ? '' : `~${cp.max}`}${warn(cp.constant)}`,
      `파셀 ${s.loaded}  build ${built}  starve ${s.starved}${warn(s.starved === 0)}`,
      `px ${a.pixelRatio.toFixed(2)}  cap ${a.frameCap || '—'}  tri ${Math.round(a.triAvg)}`,
    ].join('\n');
  };

  const timer = setInterval(redraw, REDRAW_MS);

  const onCopy = async () => {
    const text = formatReport(snapshot());
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); ok = true; }
    } catch { ok = false; }
    if (!ok) {
      // 클립보드 API는 보안 컨텍스트·권한에 따라 막힌다. 그때 조용히 실패하면 감독은
      // 붙여넣기를 시도하고서야 안다 — 선택 상태로 만들어 손으로라도 복사하게 한다.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:8px;right:8px;bottom:80px;height:38vh;z-index:99;font-size:11px';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      if (ok) ta.remove();
      else setTimeout(() => ta.remove(), 20000); // 손 복사 시간을 준다
    }
    parts.copy.textContent = ok ? '복사됨' : '길게 눌러 복사';
    setTimeout(() => { parts.copy.textContent = '복사'; }, 1800);
  };

  const onToggle = () => {
    open = !open;
    parts.root.dataset.open = open ? '1' : '0';
    if (open) redraw();
  };

  parts.copy.addEventListener('click', onCopy);
  parts.toggle.addEventListener('click', onToggle);

  return {
    sample(name, value) {
      if (name === 'frame_ms') frameMs.push(value);
      else if (name === 'upd_ms') updMs.push(value);
      else if (name === 'render_ms') renderMs.push(value);
      else if (name === 'out_ms') outMs.push(value);
    },
    tick() {
      const c = src.counts();
      draw.push(c.draw); pipeline.push(c.pipeline);
      geometries.push(c.geometries); textures.push(c.textures);
      const s = src.stream();
      parcels.push(s.loaded);
      // built/released는 프레임당 증분이므로 누적한다.
      built += s.built; released += s.released;
    },
    dispose() {
      clearInterval(timer);
      parts.copy.removeEventListener('click', onCopy);
      parts.toggle.removeEventListener('click', onToggle);
    },
  };
}
