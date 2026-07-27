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
  lines.push(countLine('draw', constancy(r.draw)));
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
  lines.push('');
  lines.push(`UA ${r.ua}`);
  return lines.join('\n');
}
