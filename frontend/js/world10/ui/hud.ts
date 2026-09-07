// world10/ui/hud.ts — 성능 HUD + 클립보드 복사.
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
  type ReportInput, type Ev,
} from '../decide/telemetry.js';

/** 링버퍼 용량 — 60fps에서 약 30초 */
const CAP = 1800;
/** 화면 갱신 주기(ms) */
const REDRAW_MS = 250;

/**
 * 이벤트 보관 상한. 넘으면 **오래된 것을 버린다.**
 *
 * 마크는 대개 세션 후반에 찍히므로 최근 쪽이 살아남는 것이 맞다. 다만 마크가 이 창보다
 * 앞이면 그 주변이 이미 없을 수 있고, 그 경우 리포트에 `이벤트 0건` 이 찍힌다 —
 * `formatEvents` 가 그것을 *"전이가 없었다"* 로 읽으라고 적어 두었으므로 **여기서 버린
 * 것이 거기서 결론으로 둔갑할 수 있다.** 그래서 넉넉히 잡는다(전이는 초당 몇 건이다).
 */
const EV_CAP = 600;
/** 마크 상한. 감독이 여러 번 눌러도 리포트가 감당할 길이 */
const MARK_CAP = 12;

export interface HudParts {
  root: HTMLElement;
  body: HTMLElement;
  copy: HTMLElement;
  toggle: HTMLElement;
  /**
   * 증상을 본 순간 누르는 버튼. **없어도 HUD 는 그대로 돈다** — 이 파일이 마크 없이도
   * 최근 이벤트를 보여주기 때문이다(진단용 추가물이 기본 기능을 인질로 잡지 않게).
   */
  mark?: HTMLElement | null;
}

/** HUD가 매 프레임 읽어갈 값들. main이 구현해 넘긴다. */
export interface HudSource {
  backend: () => string;
  /** 어느 페이지인가 — 리포트 제목에 쓴다(`world7`/`world8`). 근거는 `decide/telemetry.ts` */
  page?: string;
  /** 거리 컬링 상태 — 이 세계의 스트리밍이다. 근거는 `decide/telemetry.ts` 의 `cull` */
  cull?: () => { on: number; total: number; radius: number; ticks: number; grid: number } | null;
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
  // ⚠ `released`·`starved` 는 뺐다(검수관 P9) — 리포트·화면 소비처가 둘 다 0 인데
  // 조립부가 하드코딩 0 을 공급하고 있었다.
  stream: () => { loaded: number; built: number };
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

  let built = 0;
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

  /**
   * 이벤트 로그와 마크. **커널을 안 바꾸고 `probe` 를 그대로 쓴다** — 시스템이
   * `ctx.probe('ev:이름', 값)` 으로 부르면 아래 `sample` 이 접두를 보고 이리로 보낸다.
   * 커널의 훅은 `(string, number)` 하나뿐이고, 그것을 바꾸면 world3·world5 까지 함께
   * 움직인다(포크 셋이 같은 커널 모양을 쓴다).
   */
  const events: Ev[] = [];
  const marks: number[] = [];
  const nowS = () => (Date.now() - startedAt) / 1000;

  const snapshot = (): ReportInput => {
    const s = src.stream(); const a = src.adapt();
    return {
      backend: src.backend(),
      page: src.page,
      cull: src.cull?.() ?? null,
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
      built,   // ⚠ `released`·`starved` 는 리포트 소비처가 0 이라 계약에서 뺐다(검수관 P9)
      pixelRatio: a.pixelRatio, frameCap: a.frameCap, triAvg: a.triAvg,
      timeline: timeline.snapshot(),
      events: [...events],
      marks: [...marks],
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
      `파셀 ${s.loaded}  build ${built}`,
      `px ${a.pixelRatio.toFixed(2)}  cap ${a.frameCap || '—'}  tri ${Math.round(a.triAvg)}`,
      // ── 이 줄이 없으면 이벤트 수집이 죽어도 아무도 모른다 ────────────────────
      // 뮤테이션으로 확인했다: `sample` 의 `ev:` 분기를 통째로 지워도 값이 어느 링에도
      // 안 들어가 **조용히 사라질 뿐**이라 다른 단언은 전부 초록이었다. 즉 그 축의
      // 검출력이 0 이었다. 화면에 개수를 내면 테스트가 그것을 읽을 수 있고, 감독도
      // 마크가 눌렸는지·이벤트가 쌓이는지를 그 자리에서 본다.
      `이벤트 ${events.length}  마크 ${marks.length}`,
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

  /**
   * 증상을 본 순간을 시간축에 못 박는다.
   *
   * **누른 것이 보여야 한다** — 아무 반응이 없으면 감독은 눌렸는지 모른 채 다시 누르고,
   * 그러면 마크가 겹쳐 창이 둘로 갈린다. 그래서 번호를 즉시 라벨에 쓴다.
   */
  const onMark = () => {
    if (marks.length >= MARK_CAP) marks.shift();
    marks.push(nowS());
    const el = parts.mark;
    if (el) {
      el.textContent = `📍${marks.length}`;
      // 배경 깜빡임은 안 준다 — HUD 가 화면을 가리는 것보다 조용한 편이 낫고,
      // 숫자가 늘어나는 것만으로 눌린 것이 확인된다.
    }
  };

  parts.copy.addEventListener('click', onCopy);
  parts.toggle.addEventListener('click', onToggle);
  parts.mark?.addEventListener('click', onMark);

  return {
    sample(name, value) {
      // 자리비움 복귀 프레임은 **어느 링에도 안 넣는다.** 그 프레임의 `frame_ms`는 감독이
      // 자리를 비운 시간이고, `out_ms`도 같은 시간을 다시 세는 것이다. 한 프레임을 잃는
      // 대신 평균과 히칭이 사실을 말한다. 뺀 사실은 아래 `away`로 리포트에 남는다.
      if (name === 'away_ms') { awayCount++; awayMsTotal += value; return; }
      // `ev:` 접두는 **시점이 중요한 것**이다. 통계 링이 아니라 이벤트 목록으로 간다 —
      // 링에 넣으면 "몇 번" 은 알아도 "언제" 를 잃는다.
      if (name.startsWith('ev:')) {
        if (events.length >= EV_CAP) events.shift();
        events.push({ t: nowS(), name: name.slice(3), value });
        return;
      }
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
      // built는 프레임당 증분이므로 누적한다.
      built += s.built;
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
      parts.mark?.removeEventListener('click', onMark);
    },
  };
}
