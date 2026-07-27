// world2 계측 집계·서식 테스트.
//
// 이 리포트는 감독이 폰에서 복사해 그대로 전달하는 텍스트다. 즉 **여기 적힌 내용이
// 다음 진단의 출발점**이 된다. 숫자가 틀리거나 판정이 뒤집히면 그 뒤 작업이 통째로
// 엉뚱한 곳을 판다 — 그래서 서식까지 시험한다.

import { describe, it, expect } from 'vitest';
import {
  summarize, hitchCount, constancy, constancyByGroup, Ring, formatReport, HITCH_MS,
  Timeline, downsample, formatTimeline, type ReportInput, type Bucket, type TimelineSample,
} from '../frontend/js/world2/decide/telemetry.js';

const base = (o: Partial<ReportInput> = {}): ReportInput => ({
  backend: 'WebGL', ua: 'test-ua', dpr: 2, screen: '390x844', elapsedS: 10,
  frameMs: [16, 17, 16], updMs: [1, 1, 1], renderMs: [8, 9, 8], outMs: [7, 7, 7],
  draw: [6, 6, 6], pipeline: [2, 2, 2], geometries: [5, 5, 5], textures: [1, 1, 1],
  parcels: [16, 16, 16], built: 0, released: 0, starved: 0,
  pixelRatio: 2, frameCap: 0, triAvg: 12000, ...o,
});

describe('summarize — 평균은 히칭을 숨긴다', () => {
  it('기본 통계', () => {
    const s = summarize([10, 20, 30]);
    expect(s).toMatchObject({ n: 3, min: 10, max: 30, avg: 20 });
  });

  it('빈 입력에 안전하다', () => {
    expect(summarize([]).n).toBe(0);
  });

  it('입력 배열을 변형하지 않는다 — 링버퍼를 정렬하면 시간 순서가 깨진다', () => {
    const src = [30, 10, 20];
    summarize(src);
    expect(src).toEqual([30, 10, 20]);
  });

  it('p95가 나쁜 프레임을 드러낸다', () => {
    const xs = [...Array(95).fill(16), ...Array(5).fill(300)];
    const s = summarize(xs);
    expect(s.avg).toBeLessThan(35);   // 평균은 멀쩡해 보인다
    expect(s.p95).toBeGreaterThan(200); // p95가 진실을 말한다
  });

  it('NaN·Infinity를 걸러낸다', () => {
    expect(summarize([10, NaN, 20, Infinity]).n).toBe(2);
  });
});

describe('hitchCount', () => {
  it('임계를 넘긴 프레임을 센다', () => {
    expect(hitchCount([16, 150, 16, 900])).toBe(2);
  });

  it('경계값은 세지 않는다(초과만)', () => {
    expect(hitchCount([HITCH_MS])).toBe(0);
    expect(hitchCount([HITCH_MS + 0.1])).toBe(1);
  });

  it('끊김이 없으면 0', () => {
    expect(hitchCount([16, 17, 16])).toBe(0);
  });
});

describe('constancy — 개수 불변식 판정 그 자체', () => {
  it('같은 값만 있으면 상수', () => {
    expect(constancy([6, 6, 6])).toEqual({ min: 6, max: 6, constant: true });
  });

  it('하나라도 다르면 변동', () => {
    expect(constancy([6, 6, 7])).toEqual({ min: 6, max: 7, constant: false });
  });

  it('표본이 없으면 상수가 아니다 — 관측 없음을 통과로 적으면 안 된다', () => {
    expect(constancy([]).constant).toBe(false);
  });
});

describe('Ring — 세션이 길어져도 메모리가 늘지 않는다', () => {
  it('용량을 넘으면 오래된 것을 덮어쓴다', () => {
    const r = new Ring(3);
    for (const v of [1, 2, 3, 4, 5]) r.push(v);
    expect(r.length).toBe(3);
    expect([...r.values()].sort((a, b) => a - b)).toEqual([3, 4, 5]);
  });

  it('유한하지 않은 값은 받지 않는다', () => {
    const r = new Ring(5);
    r.push(NaN); r.push(Infinity); r.push(7);
    expect(r.length).toBe(1);
  });

  it('clear로 비운다', () => {
    const r = new Ring(3);
    r.push(1); r.clear();
    expect(r.length).toBe(0);
  });

  it('오래 돌려도 용량을 넘지 않는다', () => {
    const r = new Ring(10);
    for (let i = 0; i < 10_000; i++) r.push(i);
    expect(r.length).toBe(10);
  });
});

describe('Timeline — 언제 늘었는지 (통계로는 절대 안 보인다)', () => {
  const s = (o: Partial<TimelineSample> = {}): TimelineSample => ({
    frameMs: 16, draw: 7, pipeline: 5, geometries: 6, textures: 2, parcels: 16, built: 0, ...o,
  });

  it('구간마다 하나씩 쌓인다', () => {
    const t = new Timeline(5);
    t.add(0, s()); t.add(2, s()); t.add(6, s()); t.add(11, s());
    expect(t.snapshot().map((b) => b.t0)).toEqual([0, 5, 10]);
  });

  it('진행 중인 구간도 포함한다 — 복사 시점에 마지막이 빠지면 안 된다', () => {
    const t = new Timeline(5);
    t.add(1, s());
    expect(t.snapshot()).toHaveLength(1);
  });

  it('파이프라인 증식이 표에 드러난다 — 이 프로젝트의 결정적 진단', () => {
    const t = new Timeline(5);
    for (const [sec, pipe] of [[1, 35], [6, 52], [11, 84], [16, 116]] as const) t.add(sec, s({ pipeline: pipe }));
    expect(t.snapshot().map((b) => b.pipeline)).toEqual([35, 52, 84, 116]);
  });

  it('개수는 구간 끝 값을 남긴다 — 증가 추세가 목적이다', () => {
    const t = new Timeline(5);
    t.add(0, s({ draw: 7 })); t.add(1, s({ draw: 9 }));
    expect(t.snapshot()[0].draw).toBe(9);
  });

  it('히칭과 최댓값을 구간별로 센다', () => {
    const t = new Timeline(5);
    t.add(0, s({ frameMs: 16 })); t.add(1, s({ frameMs: 250 })); t.add(2, s({ frameMs: 400 }));
    const b = t.snapshot()[0];
    expect(b.hitches).toBe(2);
    expect(b.maxMs).toBe(400);
  });

  it('build는 구간 내 증분을 합산한다', () => {
    const t = new Timeline(5);
    t.add(0, s({ built: 2 })); t.add(1, s({ built: 3 }));
    expect(t.snapshot()[0].built).toBe(5);
  });

  it('fps는 프레임 시간에서 계산된다', () => {
    const t = new Timeline(5);
    for (let i = 0; i < 10; i++) t.add(i * 0.4, s({ frameMs: 20 }));
    expect(t.snapshot()[0].fps).toBeCloseTo(50, 0);
  });

  it('오래 켜 둬도 메모리가 무한히 늘지 않는다', () => {
    const t = new Timeline(5, 10);
    for (let i = 0; i < 500; i++) t.add(i * 5, s());
    expect(t.snapshot().length).toBeLessThanOrEqual(11); // 확정 10 + 진행중 1
  });

  it('이상한 시각은 무시한다', () => {
    const t = new Timeline(5);
    t.add(NaN, s());
    expect(t.snapshot()).toHaveLength(0);
  });
});

describe('downsample — 길이를 줄이되 진단을 잃지 않는다', () => {
  const mk = (n: number): Bucket[] => Array.from({ length: n }, (_, i) => ({
    t0: i * 5, frames: 300, fps: 60, maxMs: 16, hitches: 0,
    draw: 7, pipeline: 5, geometries: 6, textures: 2, parcels: 16, built: 0,
  }));

  it('행 수 이하면 그대로', () => {
    expect(downsample(mk(10), 40)).toHaveLength(10);
  });

  it('넘으면 묶는다 — 700행은 대화창에 옮겨지지 않는다', () => {
    expect(downsample(mk(700), 40).length).toBeLessThanOrEqual(40);
  });

  it('묶어도 히칭이 사라지지 않는다 — 길이를 줄이려다 진단을 잃으면 안 된다', () => {
    const bs = mk(100);
    bs[57].hitches = 3; bs[57].maxMs = 900;
    const d = downsample(bs, 10);
    expect(d.reduce((s, b) => s + b.hitches, 0)).toBe(3);
    expect(Math.max(...d.map((b) => b.maxMs))).toBe(900);
  });

  it('fps는 프레임 수로 가중 평균한다 — 짧은 구간을 과대평가하지 않는다', () => {
    const bs = mk(4);
    bs[0].fps = 10; bs[0].frames = 10;   // 짧고 느린 구간
    bs[1].fps = 60; bs[1].frames = 600;
    bs[2].fps = 60; bs[2].frames = 600;
    bs[3].fps = 60; bs[3].frames = 600;
    const d = downsample(bs, 1);
    expect(d[0].fps).toBeGreaterThan(55); // 단순 평균이면 37.5로 왜곡된다
  });

  it('개수는 마지막 값을 남긴다', () => {
    const bs = mk(4);
    bs[3].pipeline = 99;
    expect(downsample(bs, 1)[0].pipeline).toBe(99);
  });
});

describe('formatTimeline', () => {
  it('표본이 없으면 그렇게 적는다', () => {
    expect(formatTimeline([])).toContain('표본 없음');
  });

  it('헤더와 행을 낸다', () => {
    const t = new Timeline(5);
    t.add(0, { frameMs: 16, draw: 7, pipeline: 5, geometries: 6, textures: 2, parcels: 16, built: 0 });
    const s = formatTimeline(t.snapshot());
    expect(s).toContain('fps');
    expect(s).toContain('pipe');
  });
});

describe('formatReport — 복사되는 그 텍스트', () => {
  it('정상 상태에서 히칭 없음을 적는다', () => {
    const t = formatReport(base());
    expect(t).toContain('히칭');
    expect(t).toContain('없음');
  });

  it('히칭이 있으면 횟수와 최악값을 적는다', () => {
    const t = formatReport(base({ frameMs: [16, 250, 16, 800] }));
    expect(t).toContain('2회');
    expect(t).toContain('800');
  });

  it('개수가 상수면 "상수"로 적는다', () => {
    expect(formatReport(base())).toContain('상수');
  });

  it('개수가 변하면 불변식 위반을 명시한다 — 이게 이 리포트의 핵심 판정이다', () => {
    const t = formatReport(base({ draw: [6, 6, 9] }));
    expect(t).toContain('불변식 위반');
    expect(t).toContain('6~9');
  });

  it('out이 지배적이면 우리 코드 밖임을 알린다', () => {
    // 시간이 render도 upd도 아닌 곳에서 사라지면 코드 최적화로 안 닿는다.
    const t = formatReport(base({
      frameMs: [16, 16, 900], updMs: [1, 1, 2], renderMs: [8, 8, 10], outMs: [7, 7, 880],
    }));
    expect(t).toContain('우리 콜백 밖');
  });

  it('정상 분해에서는 그 경고를 띄우지 않는다', () => {
    expect(formatReport(base())).not.toContain('우리 콜백 밖');
  });

  it('슬롯 부족을 드러낸다', () => {
    expect(formatReport(base({ starved: 12 }))).toContain('풀 예산 부족');
  });

  it('슬롯이 넉넉하면 경고가 없다', () => {
    expect(formatReport(base())).not.toContain('풀 예산 부족');
  });

  it('기기 식별 정보를 담는다 — 어느 기기 수치인지 모르면 비교가 불가능하다', () => {
    const t = formatReport(base({ backend: 'WebGPU', screen: '412x915', ua: 'Pixel' }));
    expect(t).toContain('WebGPU');
    expect(t).toContain('412x915');
    expect(t).toContain('Pixel');
  });

  it('표본이 없어도 죽지 않는다', () => {
    const empty = base({
      frameMs: [], updMs: [], renderMs: [], outMs: [],
      draw: [], pipeline: [], geometries: [], textures: [], parcels: [],
    });
    expect(() => formatReport(empty)).not.toThrow();
  });

  it('프레임캡이 걸리면 값을, 없으면 "없음"을 적는다', () => {
    expect(formatReport(base({ frameCap: 30 }))).toContain('프레임캡 30');
    expect(formatReport(base({ frameCap: 0 }))).toContain('프레임캡 없음');
  });

  it('시간축이 있으면 표를 붙인다 — 감독 지시("시간축으로 축적")', () => {
    const t = new Timeline(5);
    for (const [sec, pipe] of [[1, 35], [6, 52], [11, 84]] as const) {
      t.add(sec, { frameMs: 16, draw: 7, pipeline: pipe, geometries: 6, textures: 2, parcels: 16, built: 0 });
    }
    const s = formatReport(base({ timeline: t.snapshot() }));
    expect(s).toContain('시간축');
    // 증식이 표에 그대로 남아야 한다 — 35 → 52 → 84
    expect(s).toContain('35');
    expect(s).toContain('52');
    expect(s).toContain('84');
  });

  it('시간축이 없으면 그 절을 생략한다', () => {
    expect(formatReport(base())).not.toContain('시간축');
  });
});

describe('constancyByGroup — 드로우콜은 하늘 상태 안에서만 상수여야 한다', () => {
  // 실제 오판. 감독 실기기(iPhone/WebGPU, 밀도 8) 리포트에서 `draw 9~12 ← 불변식 위반`이
  // 찍혔는데, 같은 리포트의 pipeline 10 · geometry 9 · texture 9는 전부 상수였다.
  // sky.js가 시간대·날씨에 따라 구름·별·비·눈의 visible을 토글한 결과였다 — 그리기를
  // 멈춘 것이지 자원이 태어난 게 아니다.
  it('하늘이 바뀌어서 변한 것은 위반이 아니다', () => {
    const draw = [9, 9, 12, 12, 10, 10];
    const sky = [0, 0, 1, 1, 2, 2]; // night|clear · night|rain · day|clear
    const g = constancyByGroup(draw, sky);
    expect(g.constant).toBe(true);
    expect(g.violations).toEqual([]);
    expect(g.groups).toHaveLength(3);
  });

  // 이쪽이 진짜 잡아야 할 것이다 — 하늘이 그대로인데 드로우콜이 늘면 슬롯 풀 설계가
  // 무너진 것이다(파셀 로드가 새 메시를 만들었다는 뜻).
  it('같은 하늘 상태에서 변하면 위반이다', () => {
    const g = constancyByGroup([9, 9, 11], [0, 0, 0]);
    expect(g.constant).toBe(false);
    expect(g.violations).toEqual([{ key: 0, min: 9, max: 11 }]);
  });

  it('위반한 상태만 지목한다 — 멀쩡한 상태까지 싸잡지 않는다', () => {
    const g = constancyByGroup([9, 9, 12, 14], [0, 0, 1, 1]);
    expect(g.violations.map((v) => v.key)).toEqual([1]);
  });

  it('표본이 없으면 상수가 아니다 — 관측 안 한 것을 통과로 적지 않는다', () => {
    expect(constancyByGroup([], []).constant).toBe(false);
    expect(constancyByGroup([9, 9], []).constant).toBe(false);
  });

  it('길이가 어긋나면 짧은 쪽까지만 본다 — 짝 없는 표본을 지어내지 않는다', () => {
    // draw 3개 · key 2개 → 앞 2개만 유효. 세 번째(11)는 짝이 없으므로 판정에 안 들어간다.
    const g = constancyByGroup([9, 9, 11], [0, 0]);
    expect(g.constant).toBe(true);
    expect(g.groups).toEqual([{ key: 0, min: 9, max: 9 }]);
  });

  it('비유한 값은 건너뛴다', () => {
    const g = constancyByGroup([9, NaN, 9], [0, 0, 0]);
    expect(g.constant).toBe(true);
  });
});

describe('formatReport — 드로우콜 줄', () => {
  const base = {
    backend: 'WebGPU', ua: 'test', dpr: 3, screen: '320x519', elapsedS: 39,
    frameMs: [16.7, 16.7], updMs: [0.2], renderMs: [1.5], outMs: [15],
    pipeline: [10, 10], geometries: [9, 9], textures: [9, 9],
    parcels: [16, 16], built: 79, released: 63, starved: 0,
    pixelRatio: 2, frameCap: 0, triAvg: 54205,
  };

  it('하늘 상태별로 상수면 위반이라 적지 않는다', () => {
    const text = formatReport({
      ...base, draw: [9, 9, 12, 12], drawGroupKeys: [0, 0, 1, 1],
      groupKeyNames: { 0: 'night|clear', 1: 'night|rain' },
    });
    const line = text.split('\n').find((l) => l.startsWith('draw'))!;
    expect(line).not.toContain('불변식 위반');
    expect(line).toContain('night|clear=9');
    expect(line).toContain('night|rain=12');
  });

  it('같은 상태에서 변하면 그 상태를 지목해 위반이라 적는다', () => {
    const text = formatReport({
      ...base, draw: [9, 11], drawGroupKeys: [0, 0], groupKeyNames: { 0: 'day|clear' },
    });
    const line = text.split('\n').find((l) => l.startsWith('draw'))!;
    expect(line).toContain('불변식 위반');
    expect(line).toContain('day|clear 9~11');
  });

  it('상태 키가 없으면 옛 판정으로 떨어진다 — 하위호환', () => {
    const text = formatReport({ ...base, draw: [9, 12] });
    const line = text.split('\n').find((l) => l.startsWith('draw'))!;
    expect(line).toContain('불변식 위반');
  });
});

describe('하늘 전이 구간 — 판정에서 빼되 뺀 사실을 적는다', () => {
  const base = {
    backend: 'WebGPU', ua: 'test', dpr: 3, screen: '320x519', elapsedS: 39,
    frameMs: [16.7], updMs: [0.2], renderMs: [1.5], outMs: [15],
    pipeline: [10], geometries: [9], textures: [9],
    parcels: [16], built: 79, released: 63, starved: 0,
    pixelRatio: 2, frameCap: 0, triAvg: 54205,
  };

  // 검수관이 잡은 블로커. set()이 불리면 time/weather는 즉시 새 값이 되는데 fadeDome은
  // 최대 1.8초 더 켜져 있다. 그 표본을 도착 키에 넣으면 그 그룹이 곧바로 "변동"이 된다.
  // 지금은 그 표본을 아예 안 넣으므로 판정이 깨끗하다.
  it('전이 표본을 넣지 않으면 도착 상태가 상수로 남는다', () => {
    // 전이 중 draw=13(fadeDome +1)이었지만 표본에 없다. 남은 것은 안정 구간뿐.
    const text = formatReport({
      ...base, draw: [9, 9, 12, 12], drawGroupKeys: [0, 0, 1, 1],
      groupKeyNames: { 0: 'night|clear', 1: 'night|rain' }, drawSkipped: 108,
    });
    const line = text.split('\n').find((l) => l.startsWith('draw'))!;
    expect(line).not.toContain('불변식 위반');
    expect(line).toContain('상태 전이 중 108표본 제외');
  });

  // 뺀 것을 조용히 숨기면 "재지 않은 구간"이 "통과한 구간"으로 읽힌다.
  it('제외 표본이 0이면 그 문구를 붙이지 않는다', () => {
    const text = formatReport({
      ...base, draw: [9, 9], drawGroupKeys: [0, 0], groupKeyNames: { 0: 'day|clear' },
      drawSkipped: 0,
    });
    const line = text.split('\n').find((l) => l.startsWith('draw'))!;
    expect(line).not.toContain('제외');
  });

  it('위반이 있어도 제외 표본을 함께 적는다 — 둘 다 사실이다', () => {
    const text = formatReport({
      ...base, draw: [9, 11], drawGroupKeys: [0, 0], groupKeyNames: { 0: 'day|clear' },
      drawSkipped: 42,
    });
    const line = text.split('\n').find((l) => l.startsWith('draw'))!;
    expect(line).toContain('불변식 위반');
    expect(line).toContain('상태 전이 중 42표본 제외');
  });
});
