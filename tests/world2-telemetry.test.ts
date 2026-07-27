// world2 계측 집계·서식 테스트.
//
// 이 리포트는 감독이 폰에서 복사해 그대로 전달하는 텍스트다. 즉 **여기 적힌 내용이
// 다음 진단의 출발점**이 된다. 숫자가 틀리거나 판정이 뒤집히면 그 뒤 작업이 통째로
// 엉뚱한 곳을 판다 — 그래서 서식까지 시험한다.

import { describe, it, expect } from 'vitest';
import {
  summarize, hitchCount, constancy, Ring, formatReport, HITCH_MS, type ReportInput,
} from '../web/js/world2/decide/telemetry.js';

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
});
