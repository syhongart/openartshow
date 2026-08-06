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
  Ring, Timeline, formatReport, summarize, hitchCount, constancy, constancyByGroup,
  type ReportInput,
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
  /**
   * 지금의 하늘 상태를 사람이 읽는 한 줄로. 드로우콜 판정이 이 그룹 안에서만 상수를 요구한다
   * (`decide/telemetry.ts`의 `constancyByGroup` 참고). 없으면 전 구간 상수로 판정한다.
   */
  drawGroupKey?: () => string | null;
  /**
   * `drawGroupKey()` 가 `null` 을 냈을 때 **누가 막았는지**. 리포트가 이름을 지목하려고 쓴다.
   * 없어도 계측은 돌고 개수만 남는다 — 훅 부재가 수집을 죽이지 않는다.
   */
  drawBlockers?: () => readonly { readonly name: string; readonly hint?: string }[];
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
  /**
   * `draw`와 짝을 이루는 하늘 상태 id 링. 같은 인덱스가 같은 프레임이어야 하므로
   * **`draw`를 넣는 곳에서만** 함께 넣는다(둘이 어긋나면 판정이 엉뚱한 짝을 본다).
   */
  const drawGroupKeys = new Ring(CAP);
  /** 상태 문자열 → id. 리포트에서 사람이 읽는 이름으로 되돌리려고 양방향으로 들고 있다 */
  const groupIds = new Map<string, number>();
  const groupNames: Record<number, string> = {};
  const groupIdOf = (s: string): number => {
    let id = groupIds.get(s);
    if (id === undefined) { id = groupIds.size; groupIds.set(s, id); groupNames[id] = s; }
    return id;
  };

  /** 하늘 전이 중이라 드로우콜 판정에서 뺀 표본 수. 리포트에 그대로 적는다 */
  let drawSkipped = 0;
  /**
   * **누가** 판정을 막았는지. 이름을 안 남기면 리포트가 "유예됐다" 만 말하고, 읽는 사람은
   * *"곧 재지겠지"* 로 읽는다 — 실제로는 `npc`·`glb-city` 가 조건 없이 막고 있어 영원히
   * 안 재진다(감독 실기기에서 두 번 나왔다: #176, 2026-08-06).
   */
  const drawBlockers = new Map<string, string | undefined>();
  /**
   * 자리비움 복귀 프레임 — 프레임 표본에서 뺀 것. 횟수와 합계를 함께 들고 있다가 리포트에
   * 적는다. 커널이 `away_ms`로 갈라 보내므로 여기서는 세기만 한다.
   */
  let awayCount = 0;
  let awayMsTotal = 0;

  let built = 0, released = 0;
  const startedAt = Date.now();
  let open = false;
  /**
   * 시간축 누적. 링버퍼(30초)는 오래된 표본을 버리므로 "언제 늘었나"를 못 본다.
   * 이건 세션 시작부터 5초 구간 요약을 계속 쌓는다 — 원시 프레임을 안 들고 있으므로
   * 오래 켜 둬도 메모리가 선형으로 늘지 않는다.
   */
  const timeline = new Timeline(5);
  /** 마지막 프레임 시간 — 시간축 표본에 붙인다 */
  let lastFrameMs = 0;

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
      draw: draw.values(),
      drawGroupKeys: src.drawGroupKey ? drawGroupKeys.values() : undefined,
      groupKeyNames: src.drawGroupKey ? { ...groupNames } : undefined,
      drawSkipped,
      drawBlockedBy: drawBlockers.size > 0
        ? [...drawBlockers].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([name, hint]) => (hint ? { name, hint } : { name }))
        : undefined,
      away: { count: awayCount, totalMs: awayMsTotal },
      pipeline: pipeline.values(),
      geometries: geometries.values(), textures: textures.values(),
      parcels: parcels.values(),
      built, released, starved: s.starved,
      pixelRatio: a.pixelRatio, frameCap: a.frameCap, triAvg: a.triAvg,
      timeline: timeline.snapshot(),
    };
  };

  /** 화면용 짧은 요약. 복사본과 달리 한눈에 들어와야 한다. */
  const redraw = () => {
    if (!open) return;
    const f = summarize(frameMs.values());
    const fps = f.avg > 0 ? 1000 / f.avg : 0;
    const h = hitchCount(frameMs.values());
    // 화면 HUD도 같은 기준을 쓴다. 여기만 옛 판정을 남기면 감독은 리포트와 화면이 서로
    // 다른 말을 하는 걸 보게 된다 — 그게 "어느 쪽이 맞나"를 매번 다시 묻게 만든다.
    const gd = src.drawGroupKey
      ? constancyByGroup(draw.values(), drawGroupKeys.values())
      : null;
    const cd = constancy(draw.values());
    const drawOk = gd ? gd.constant : cd.constant;
    const cp = constancy(pipeline.values());
    const s = src.stream();
    const a = src.adapt();
    const warn = (ok: boolean) => (ok ? '' : ' ⚠');
    parts.body.textContent = [
      `${fps.toFixed(0)}fps  max ${f.max.toFixed(0)}ms  히칭 ${h}`,
      // 범위가 보이는데 경고가 없으면 "왜 안 뜨지"로 읽힌다. 하늘 상태 수를 함께 적어
      // "상태가 여럿이라 범위가 나오는 게 정상"임을 그 자리에서 알 수 있게 한다.
      `draw ${cd.min}${cd.min === cd.max ? '' : `~${cd.max}`}${gd && gd.groups.length > 1 ? `(하늘${gd.groups.length})` : ''}${warn(drawOk)}  pipe ${cp.min}${cp.constant ? '' : `~${cp.max}`}${warn(cp.constant)}`,
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
      // 자리비움 복귀 프레임은 **어느 링에도 안 넣는다.** 그 프레임의 `frame_ms`는 감독이
      // 자리를 비운 시간이고, `out_ms`도 같은 시간을 다시 세는 것이다. 한 프레임을 잃는
      // 대신 평균과 히칭이 사실을 말한다. 뺀 사실은 아래 `away`로 리포트에 남는다.
      if (name === 'away_ms') { awayCount++; awayMsTotal += value; return; }
      if (name === 'frame_ms') { frameMs.push(value); lastFrameMs = value; }
      else if (name === 'upd_ms') updMs.push(value);
      else if (name === 'render_ms') renderMs.push(value);
      else if (name === 'out_ms') outMs.push(value);
    },
    tick() {
      const c = src.counts();
      // ── draw와 하늘 상태의 링 정합 ──────────────────────────────────────
      // 둘은 같은 인덱스가 같은 프레임이어야 한다. 그래서 **키를 먼저 구하고, 넣을지
      // 말지를 정한 뒤, 넣을 때는 둘 다 넣는다.** `draw.push` 뒤에 키를 구하면 그 사이
      // 예외 하나로 두 링이 영구히 한 칸씩 어긋나고, 그러고도 판정은 조용히 통과한다.
      //
      // 키가 `null`이면 하늘 전이 중이다 — 그리는 것이 섞여 있는 구간이라 판정에서 뺀다
      // (`main.ts`의 `drawGroupKey` 주석 참고). 뺀 개수는 리포트에 적는다.
      let key: string | null | undefined;
      if (src.drawGroupKey) {
        try { key = src.drawGroupKey(); } catch { key = undefined; }
        // 막은 기능 이름은 별도 훅에서 받는다(있으면). 없으면 이름 없이 개수만 남는다 —
        // **못 잰 것을 조용히 넘기지 않되, 훅이 없다고 수집을 죽이지도 않는다.**
        if (key == null && src.drawBlockers) {
          try {
            for (const b of src.drawBlockers()) {
              // 힌트가 있는 보고를 우선한다 — 같은 기능이 두 번 올라오면 정보가 많은 쪽.
              if (b.hint || !drawBlockers.has(b.name)) drawBlockers.set(b.name, b.hint);
            }
          } catch { /* 훅 실패는 계측을 죽이지 않는다 */ }
        }
      }
      if (src.drawGroupKey && key == null) {
        drawSkipped++; // draw도 넣지 않는다 — 두 링의 길이가 항상 같게
      } else {
        draw.push(c.draw);
        if (src.drawGroupKey) drawGroupKeys.push(groupIdOf(key as string));
      }
      pipeline.push(c.pipeline);
      geometries.push(c.geometries); textures.push(c.textures);
      const s = src.stream();
      parcels.push(s.loaded);
      // built/released는 프레임당 증분이므로 누적한다.
      built += s.built; released += s.released;
      timeline.add((Date.now() - startedAt) / 1000, {
        frameMs: lastFrameMs,
        draw: c.draw, pipeline: c.pipeline,
        geometries: c.geometries, textures: c.textures,
        parcels: s.loaded, built: s.built,
      });
    },
    dispose() {
      clearInterval(timer);
      parts.copy.removeEventListener('click', onCopy);
      parts.toggle.removeEventListener('click', onToggle);
    },
  };
}
