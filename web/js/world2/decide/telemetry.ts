// world2/decide/telemetry.ts — 성능 계측 집계·서식. 순수 함수만, import 0.
//
// ── 왜 복사 가능한 리포트인가 ────────────────────────────────────────────────
// 감독은 폰으로 본다. 모바일에는 콘솔이 없으므로 **화면에 띄우고 클립보드로 넘기는 것**이
// 실기기 수치를 받는 유일한 경로다. 지금까지 이 프로젝트의 결정적 진단은 전부 감독 실기기
// 수치에서 나왔다(파이프라인 35→116 증식, frame_ms 11,489ms 프리즈).
//
// ── 무엇을 담을지 ────────────────────────────────────────────────────────────
// 평균은 히칭을 숨긴다. 60fps가 평균이어도 1초에 한 번 200ms가 끼면 "끊긴다"고 느낀다.
// 그래서 **최댓값과 상위 백분위, 그리고 히칭 횟수**를 담는다.
//
// 개수는 최소·최대를 같이 담는다. 상수여야 하는 값이므로 **min≠max면 그 자체가 결함**이고,
// 한 줄만 봐도 판정된다.

/** 이 시간을 넘긴 프레임을 히칭으로 센다(60fps 기준 6프레임분 — 눈에 띄는 경계) */
export const HITCH_MS = 100;

export interface Stat {
  n: number;
  min: number;
  max: number;
  avg: number;
  /** 상위 백분위 — 평균이 숨기는 나쁜 프레임 */
  p95: number;
}

const EMPTY: Stat = { n: 0, min: 0, max: 0, avg: 0, p95: 0 };

/** 표본 통계. 입력을 변형하지 않는다(호출자의 링버퍼를 정렬해버리면 시간 순서가 깨진다). */
export function summarize(samples: readonly number[]): Stat {
  const xs = samples.filter((v) => Number.isFinite(v));
  if (xs.length === 0) return { ...EMPTY };
  const sorted = [...xs].sort((a, b) => a - b);
  const sum = xs.reduce((s, v) => s + v, 0);
  return {
    n: xs.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / xs.length,
    p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
  };
}

/** 임계를 넘긴 표본 수 — "몇 번 끊겼는가" */
export function hitchCount(samples: readonly number[], thresholdMs = HITCH_MS): number {
  let n = 0;
  for (const v of samples) if (Number.isFinite(v) && v > thresholdMs) n++;
  return n;
}

export interface Constancy {
  min: number;
  max: number;
  /** 상수인가 — 개수 불변식의 판정 그 자체 */
  constant: boolean;
}

/**
 * 상수성. 개수(드로우콜·파이프라인 등)에 쓴다.
 *
 * 표본이 없으면 `constant: false`다. "변한 적 없음"과 "관측한 적 없음"은 다르고,
 * 후자를 통과로 적으면 재보지 않은 것이 검증된 것처럼 남는다.
 */
export function constancy(samples: readonly number[]): Constancy {
  const xs = samples.filter((v) => Number.isFinite(v));
  if (xs.length === 0) return { min: 0, max: 0, constant: false };
  let mn = xs[0], mx = xs[0];
  for (const v of xs) { if (v < mn) mn = v; if (v > mx) mx = v; }
  return { min: mn, max: mx, constant: mn === mx };
}

export interface GroupedConstancy {
  /** 모든 그룹이 각각 상수인가 */
  constant: boolean;
  /** 그룹별 (그룹키, min, max). 위반한 그룹을 지목하려면 이게 필요하다 */
  groups: ReadonlyArray<{ key: number; min: number; max: number }>;
  /** 위반한 그룹들 */
  violations: ReadonlyArray<{ key: number; min: number; max: number }>;
}

/**
 * **그룹별** 상수성. 드로우콜에 쓴다.
 *
 * ── 왜 드로우콜만 기준이 다른가 ───────────────────────────────────────────────
 * 개수 불변식이 지키려는 것은 **"파셀을 로드해도 씬의 형태가 변하지 않는다"** 이다. 파이프라인·
 * 지오·텍스처는 그래서 세션 내내 상수여야 한다 — 늘어나면 그 순간 GPU 자원이 새로 태어났다는
 * 뜻이고, 그게 스파이크의 원인이었다.
 *
 * 그런데 **드로우콜은 가시성에 따라 정당하게 변한다.** `sky.js`가 시간대·날씨에 맞춰 구름·별
 * 2겹·비·눈·무지개·오로라·크로스페이드 돔의 `visible`을 토글하기 때문이다. 그리기를 멈춘 것이지
 * 자원이 사라진 게 아니다(파이프라인·지오·텍스처가 상수인 것이 그 증거다).
 *
 * 실제로 그렇게 오판했다 — 감독 실기기 리포트(iPhone/WebGPU, 밀도 8)에서 `draw 9~12`가
 * "불변식 위반"으로 찍혔는데, 같은 리포트의 pipeline 10 · geometry 9 · texture 9는 전부
 * 상수였다. 하늘을 만진 결과를 증식으로 읽은 것이다.
 *
 * 그렇다고 드로우콜을 판정에서 빼면 안 된다. **파셀 로드가 드로우콜을 늘리는 것**은 슬롯 풀
 * 설계가 무너졌다는 뜻이고 반드시 잡아야 한다. 그래서 "전 구간 상수" 대신 **"같은 하늘 상태
 * 안에서 상수"** 로 판정한다 — 하늘을 바꾸면 변해도 되지만, 하늘이 그대로인데 변하면 위반이다.
 *
 * `keys[i]`가 `samples[i]`의 그룹이다. 길이가 다르면 짧은 쪽까지만 본다(링버퍼가 어긋난
 * 순간을 통과로 적지 않으려면 여기서 조용히 잘라야 한다 — 잘린 구간은 애초에 짝이 없다).
 */
export function constancyByGroup(
  samples: readonly number[],
  keys: readonly number[],
): GroupedConstancy {
  const n = Math.min(samples.length, keys.length);
  const by = new Map<number, { key: number; min: number; max: number }>();
  for (let i = 0; i < n; i++) {
    const v = samples[i];
    const k = keys[i];
    if (!Number.isFinite(v) || !Number.isFinite(k)) continue;
    const g = by.get(k);
    if (!g) by.set(k, { key: k, min: v, max: v });
    else { if (v < g.min) g.min = v; if (v > g.max) g.max = v; }
  }
  const groups = [...by.values()];
  const violations = groups.filter((g) => g.min !== g.max);
  // 표본이 없으면 상수가 아니다 — `constancy`와 같은 규약. "변한 적 없음"과 "관측한 적
  // 없음"은 다르고, 후자를 통과로 적으면 재보지 않은 것이 검증된 것처럼 남는다.
  return { constant: groups.length > 0 && violations.length === 0, groups, violations };
}

/** 고정 길이 링버퍼. 오래된 표본을 덮어쓴다 — 세션이 길어져도 메모리가 늘지 않는다. */
export class Ring {
  private buf: number[] = [];
  private i = 0;
  constructor(private readonly cap: number) {}
  push(v: number): void {
    if (!Number.isFinite(v)) return;
    if (this.buf.length < this.cap) this.buf.push(v);
    else { this.buf[this.i] = v; this.i = (this.i + 1) % this.cap; }
  }
  values(): readonly number[] { return this.buf; }
  get length(): number { return this.buf.length; }
  clear(): void { this.buf.length = 0; this.i = 0; }
}

// ── 시간축 ──────────────────────────────────────────────────────────────────
// 통계만으로는 **언제 무엇이 늘었는지**를 못 본다. 이 프로젝트의 결정적 진단이 정확히
// 그것이었다 — 파이프라인 구조 키가 35→52→84→116으로 단조 증가하는 것을 보고서야
// "축출·재생성이 아니라 매번 새 키"임이 밝혀졌다. 스냅샷 하나로는 절대 안 보인다.
//
// 그래서 일정 구간마다 요약을 확정해 쌓는다. 원시 프레임을 전부 들고 있지 않으므로
// 세션이 길어져도 메모리가 선형으로 늘지 않는다.

export interface Bucket {
  /** 구간 시작(초) */
  t0: number;
  frames: number;
  fps: number;
  maxMs: number;
  hitches: number;
  /** 구간 끝 시점의 개수 — 증가 추세를 보는 것이 목적이다 */
  draw: number;
  pipeline: number;
  geometries: number;
  textures: number;
  parcels: number;
  /** 구간 내 신규 생성 수 */
  built: number;
}

export interface TimelineSample {
  frameMs: number;
  draw: number;
  pipeline: number;
  geometries: number;
  textures: number;
  parcels: number;
  built: number;
}

/**
 * 시간 구간별 요약 누적기.
 *
 * `maxBuckets`를 넘으면 오래된 것을 버린다. 다만 기본값(720구간 × 5초 = 1시간)은
 * 실제 세션보다 훨씬 길게 잡아, 실기기 관측에서 앞부분이 잘리는 일이 없게 한다 —
 * 부팅 직후 몇 초가 증식 진단의 핵심 구간이다.
 */
export class Timeline {
  private readonly buckets: Bucket[] = [];
  private cur: Bucket | null = null;
  private frameSum = 0;

  constructor(
    private readonly bucketS = 5,
    private readonly maxBuckets = 720,
  ) {}

  /** `nowS`는 세션 시작 기준 경과(초). */
  add(nowS: number, s: TimelineSample): void {
    if (!Number.isFinite(nowS)) return;
    const t0 = Math.floor(nowS / this.bucketS) * this.bucketS;
    if (!this.cur || this.cur.t0 !== t0) {
      if (this.cur) this.commit();
      this.cur = {
        t0, frames: 0, fps: 0, maxMs: 0, hitches: 0,
        draw: s.draw, pipeline: s.pipeline, geometries: s.geometries,
        textures: s.textures, parcels: s.parcels, built: 0,
      };
      this.frameSum = 0;
    }
    const b = this.cur;
    b.frames++;
    if (Number.isFinite(s.frameMs)) {
      this.frameSum += s.frameMs;
      if (s.frameMs > b.maxMs) b.maxMs = s.frameMs;
      if (s.frameMs > HITCH_MS) b.hitches++;
    }
    // 개수는 **구간 끝 값**을 남긴다. 증가 추세가 목적이므로 마지막 관측이 맞다.
    b.draw = s.draw; b.pipeline = s.pipeline;
    b.geometries = s.geometries; b.textures = s.textures; b.parcels = s.parcels;
    b.built += s.built;
  }

  private commit(): void {
    if (!this.cur) return;
    this.cur.fps = this.frameSum > 0 ? (this.cur.frames * 1000) / this.frameSum : 0;
    this.buckets.push(this.cur);
    while (this.buckets.length > this.maxBuckets) this.buckets.shift();
    this.cur = null;
  }

  /** 진행 중인 구간까지 포함해 돌려준다(복사 시점에 마지막 구간이 빠지면 안 된다). */
  snapshot(): Bucket[] {
    const out = [...this.buckets];
    if (this.cur) {
      out.push({
        ...this.cur,
        fps: this.frameSum > 0 ? (this.cur.frames * 1000) / this.frameSum : 0,
      });
    }
    return out;
  }
}

/**
 * 표시 행 수를 제한하도록 구간을 묶는다.
 *
 * 세션이 길어져도 리포트 길이가 일정해야 한다 — 감독이 대화창에 붙여넣으므로 700행은
 * 옮겨지지 않는다. 묶을 때 **최댓값과 히칭은 합산·최대**로 보존한다. 평균만 남기면
 * 다운샘플이 히칭을 지워버려, 길이를 줄이려다 진단을 잃는다.
 */
export function downsample(buckets: readonly Bucket[], maxRows = 40): Bucket[] {
  if (buckets.length <= maxRows || maxRows < 1) return [...buckets];
  const group = Math.ceil(buckets.length / maxRows);
  const out: Bucket[] = [];
  for (let i = 0; i < buckets.length; i += group) {
    const g = buckets.slice(i, i + group);
    const frames = g.reduce((s, b) => s + b.frames, 0);
    // fps는 프레임 수로 가중 평균해야 한다 — 단순 평균은 짧은 구간을 과대평가한다.
    const wfps = frames > 0 ? g.reduce((s, b) => s + b.fps * b.frames, 0) / frames : 0;
    const last = g[g.length - 1];
    out.push({
      t0: g[0].t0,
      frames,
      fps: wfps,
      maxMs: Math.max(...g.map((b) => b.maxMs)),
      hitches: g.reduce((s, b) => s + b.hitches, 0),
      draw: last.draw, pipeline: last.pipeline,
      geometries: last.geometries, textures: last.textures, parcels: last.parcels,
      built: g.reduce((s, b) => s + b.built, 0),
    });
  }
  return out;
}

/** 시간축 표. 개수가 늘어나면 한눈에 보이는 것이 이 표의 목적이다. */
export function formatTimeline(buckets: readonly Bucket[], maxRows = 40): string {
  if (buckets.length === 0) return '(표본 없음)';
  const rows = downsample(buckets, maxRows);
  const lines = ['   t   fps   max  히칭 draw pipe  geo  tex 파셀 build'];
  for (const b of rows) {
    lines.push(
      String(Math.round(b.t0)).padStart(4)
      + f1(b.fps).padStart(6)
      + String(Math.round(b.maxMs)).padStart(6)
      + String(b.hitches).padStart(5)
      + String(b.draw).padStart(5)
      + String(b.pipeline).padStart(5)
      + String(b.geometries).padStart(5)
      + String(b.textures).padStart(5)
      + String(b.parcels).padStart(5)
      + String(b.built).padStart(6),
    );
  }
  return lines.join('\n');
}

export interface ReportInput {
  /** 기기·백엔드 식별 */
  backend: string;
  ua: string;
  dpr: number;
  screen: string;
  /** 측정 구간(초) */
  elapsedS: number;
  /** 프레임 분해 — 커널 probe에서 온다 */
  frameMs: readonly number[];
  updMs: readonly number[];
  renderMs: readonly number[];
  outMs: readonly number[];
  /** 개수 — 상수여야 한다 */
  draw: readonly number[];
  /**
   * `draw[i]`를 잰 시점의 하늘 상태 id. 드로우콜은 이 그룹 안에서만 상수여야 한다
   * (`constancyByGroup` 주석 참고). 없으면 전 구간 상수로 판정한다 — 옛 리포트 호환.
   */
  drawSkyKey?: readonly number[];
  /** 하늘 상태 id → 사람이 읽는 이름. 위반한 상태를 지목할 때 쓴다 */
  skyKeyNames?: Readonly<Record<number, string>>;
  pipeline: readonly number[];
  geometries: readonly number[];
  textures: readonly number[];
  /** 스트리밍 */
  parcels: readonly number[];
  built: number;
  released: number;
  starved: number;
  /** 적응 */
  pixelRatio: number;
  frameCap: number;
  triAvg: number;
  /** 시간축 구간 요약 — 언제 무엇이 늘었는지 */
  timeline?: readonly Bucket[];
}

const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '—');

function statLine(label: string, s: Stat): string {
  return `${label.padEnd(10)} avg ${f1(s.avg).padStart(7)}  p95 ${f1(s.p95).padStart(7)}  max ${f1(s.max).padStart(8)}`;
}

function countLine(label: string, c: Constancy): string {
  const mark = c.constant ? '상수' : `변동 ${c.min}~${c.max}  ← 불변식 위반`;
  return `${label.padEnd(10)} ${String(c.min).padStart(6)}   ${mark}`;
}

/**
 * 드로우콜 줄. 하늘 상태별로 판정한다 — 왜 다른 기준인지는 `constancyByGroup` 주석에.
 * 상태 키가 없으면(옛 리포트) 전 구간 상수로 떨어진다.
 */
function drawLine(
  samples: readonly number[],
  keys: readonly number[] | undefined,
  names: Readonly<Record<number, string>> | undefined,
): string {
  if (!keys || keys.length === 0) return countLine('draw', constancy(samples));
  const g = constancyByGroup(samples, keys);
  const nameOf = (k: number) => names?.[k] ?? `#${k}`;
  const lo = g.groups.length ? Math.min(...g.groups.map((x) => x.min)) : 0;
  if (g.constant) {
    // 어떤 상태에서 몇이었는지 함께 보여준다 — 하늘을 만졌을 때 드로우콜이 어떻게
    // 움직이는지가 그 자체로 읽을 값이다.
    const detail = g.groups.map((x) => `${nameOf(x.key)}=${x.min}`).join(' · ');
    return `${label10('draw')}${String(lo).padStart(6)}   하늘 상태별 상수 (${detail})`;
  }
  const bad = g.violations.map((x) => `${nameOf(x.key)} ${x.min}~${x.max}`).join(' · ');
  return `${label10('draw')}${String(lo).padStart(6)}   ${bad}  ← 불변식 위반`;
}

const label10 = (s: string) => s.padEnd(10) + ' ';

/**
 * 복사용 리포트. **사람이 읽고 그대로 붙여넣는 텍스트**다.
 *
 * CSV가 아니라 요약문인 이유: 감독이 대화창에 붙여넣어 전달한다. 수천 행 CSV는 읽히지도
 * 옮겨지지도 않는다. 대신 판정에 필요한 것만 남긴다 — 히칭 횟수, 시간이 어디서 사라지는지,
 * 개수가 상수인지.
 */
export function formatReport(r: ReportInput): string {
  const frame = summarize(r.frameMs);
  const fps = frame.avg > 0 ? 1000 / frame.avg : 0;
  const hitches = hitchCount(r.frameMs);
  const upd = summarize(r.updMs);
  const render = summarize(r.renderMs);
  const out = summarize(r.outMs);
  const parcels = constancy(r.parcels);

  const lines: string[] = [];
  lines.push('=== world2 성능 리포트 ===');
  lines.push(`백엔드 ${r.backend} · DPR ${f2(r.dpr)} · 화면 ${r.screen}`);
  lines.push(`측정 ${f1(r.elapsedS)}초 · 프레임 ${frame.n}개 · 평균 ${f1(fps)}fps`);
  lines.push('');
  lines.push(`▶ 히칭(>${HITCH_MS}ms) ${hitches}회` + (hitches > 0 ? `  ← 최악 ${f1(frame.max)}ms` : '  없음'));
  lines.push('');
  lines.push('[프레임 분해 ms]');
  lines.push(statLine('frame', frame));
  lines.push(statLine('upd', upd));
  lines.push(statLine('render', render));
  lines.push(statLine('out', out));
  // out이 크고 upd·render가 작으면 우리 콜백 밖(브라우저 합성·GC·OS)이다. 그 경우
  // 우리 코드를 최적화해도 닿지 않는다 — 표적을 잘못 고르지 않기 위한 분기다.
  if (out.max > frame.max * 0.5 && out.max > HITCH_MS) {
    lines.push('  ※ out이 지배적 — 우리 콜백 밖(합성·GC·OS). 코드 최적화로 안 닿음');
  }
  lines.push('');
  lines.push('[개수 — 상수여야 함]');
  lines.push(drawLine(r.draw, r.drawSkyKey, r.skyKeyNames));
  lines.push(countLine('pipeline', constancy(r.pipeline)));
  lines.push(countLine('geometry', constancy(r.geometries)));
  lines.push(countLine('texture', constancy(r.textures)));
  lines.push('');
  lines.push('[스트리밍]');
  lines.push(`파셀 ${parcels.min}~${parcels.max} · 신규 build ${r.built} · 반납 ${r.released}`);
  lines.push(`슬롯 부족(starved) ${r.starved}` + (r.starved > 0 ? '  ← 풀 예산 부족' : ''));
  lines.push('');
  lines.push('[적응]');
  lines.push(`해상도 배율 ${f2(r.pixelRatio)} · 프레임캡 ${r.frameCap || '없음'} · 삼각형 평균 ${Math.round(r.triAvg)}`);

  if (r.timeline && r.timeline.length > 0) {
    lines.push('');
    lines.push('[시간축 — 개수가 오른쪽으로 갈수록 늘면 증식이다]');
    lines.push(formatTimeline(r.timeline));
  }

  lines.push('');
  lines.push(`UA ${r.ua}`);
  return lines.join('\n');
}
