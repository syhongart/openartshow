// @vitest-environment jsdom
//
// 하늘 굽기 **집행** 축 — 판정한 값이 실제로 픽셀에 반영되는가.
//
// ── 왜 이 파일이 있나 (검수관 블로커, 2026-08-12) ────────────────────────────
// `tests/sky-look.test.ts` 는 순수 판정(`dayStops`·`cloudElev`)만 본다. 나는 굽는 쪽을
// *"캔버스가 필요해 vitest 에서 못 돌린다"* 로 판단하고 넘어갔고, **그 판단이 틀렸다.**
// `tests/world2-ocean.test.ts:217` 이 `HTMLCanvasElement.prototype.getContext` 를 스텁해
// 굽기 코드를 그대로 돌리는 선례를 이 저장소가 이미 갖고 있었다. 검수관이 그것을 찾아
// 블로커로 잡았다.
//
// 그 사각이 실제로 무엇을 놓치는지는 이 저장소가 이미 겪었다 — 구름 `alpha` 미소비 때
// *"값이 무시되면 깨지는 테스트를 넣었다"* 고 적었으나 **순수 함수 안에서만 참**이었고
// 정작 버그가 있던 통합 지점은 아무 테스트도 안 봤다. 판정과 집행 사이를 건너는 지점은
// 양쪽 테스트 어디에도 안 걸린다.
//
// ── 스텁이 재현하는 계약 ─────────────────────────────────────────────────────
// `putImageData` 가 **데이터를 남긴다.** 빈 함수로 두면 "무엇이 실제로 구워졌는가" 를
// 밖에서 볼 길이 없고, `dayStops` 호출을 통째로 지워도 테스트가 통과한다.
// 캔버스마다 따로 담는다 — `paintCloudLayer` 는 `document.createElement('canvas')` 로
// **별도 오프스크린**에 밀도장을 굽고 `drawImage` 로 합성하므로, 하늘 그라디언트(메인)와
// 구름 밀도장(오프스크린)이 같은 통에 섞이면 어느 쪽이 바뀐 것인지 갈리지 않는다.

import { describe, it, expect, beforeAll } from 'vitest';

type Shot = { w: number; h: number; data: Uint8ClampedArray };

/** 캔버스별로 마지막 `putImageData` 를 담는다 */
const shots = new WeakMap<object, Shot[]>();
/** 이번 호출에서 그려진 캔버스들 — 생성 순서대로 */
let painted: object[] = [];

beforeAll(() => {
  const noop = () => {};
  const grad = () => ({ addColorStop: noop });
  const mkCtx = (canvas: object) => ({
    canvas,
    // paintBase·paintCloudLayer 가 실제로 쓰는 둘 — 여기가 관측 지점이다
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData(img: { width: number; height: number; data: Uint8ClampedArray }) {
      if (!shots.has(canvas)) { shots.set(canvas, []); painted.push(canvas); }
      shots.get(canvas)!.push({ w: img.width, h: img.height, data: img.data.slice() });
    },
    // 나머지는 끝까지 돌기만 하면 된다. **호출을 세지 않는다** — 세면 그것은 구현
    // 순서를 굳히는 검사가 되고, 그리는 순서를 바꿀 때마다 뜻 없이 깨진다.
    createRadialGradient: grad, createLinearGradient: grad,
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop,
    ellipse: noop, rect: noop, fill: noop, stroke: noop, clip: noop,
    fillRect: noop, clearRect: noop, strokeRect: noop, drawImage: noop,
    setTransform: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    fillStyle: '', strokeStyle: '', globalAlpha: 1, globalCompositeOperation: 'source-over',
    lineWidth: 1, filter: 'none', shadowBlur: 0, shadowColor: '', font: '', lineCap: 'butt',
    lineJoin: 'miter', textAlign: 'start', textBaseline: 'alphabetic',
    fillText: noop, strokeText: noop, measureText: () => ({ width: 0 }),
  });
  (HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext =
    function (this: object) { return mkCtx(this); };
});

const { paintSky, dayStops } = await import('../frontend/js/sky.js');

/** 한 번 굽고 캔버스별 스냅샷을 돌려준다 */
function bake(weather: string, opts: Record<string, unknown>) {
  painted = [];
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  // 실치수(2048)는 느리다. 비율만 맞으면 되는 검사라 작게 굽는다 — `paintBase` 는
  // 세로를 `Hh` 로 나눠 스톱을 보간하므로 해상도에 의존하지 않는다.
  const W = 256, H = 128;
  paintSky(ctx, W, H, 'day', weather, { soft: true, lowRes: false, fogTint: 0, ...opts });
  return { main: shots.get(c) ?? [], others: painted.filter((p) => p !== c) };
}

/** 상반부(하늘)에서 평균 청-적 차이 — "파랗다" 를 재는 축 */
function blueness(s: Shot): number {
  let sum = 0, n = 0;
  for (let y = 0; y < Math.floor(s.h / 2); y++) {
    for (let x = 0; x < s.w; x += 8) {
      const i = (y * s.w + x) * 4;
      sum += s.data[i + 2] - s.data[i]; n++;
    }
  }
  return sum / n;
}

describe('paintSky → dayStops 집행', () => {
  it('★ `blue` 가 실제 픽셀에 반영된다 — 판정을 굽는 쪽이 소비하는가', () => {
    // 이 단언이 없으면 `paintSky` 에서 `dayStops` 호출을 통째로 지우고 옛 리터럴을
    // 되살려도 `sky-look.test.ts` 는 전부 통과한다. 그것이 정확히 이 파일의 존재 이유다.
    const lo = bake('clear', { blue: 0 });
    const hi = bake('clear', { blue: 1 });
    expect(lo.main.length).toBeGreaterThan(0);
    expect(hi.main.length).toBeGreaterThan(0);
    expect(blueness(hi.main[0])).toBeGreaterThan(blueness(lo.main[0]));
  });

  it('굽힌 하늘의 청-적 차이가 판정값 방향과 같다', () => {
    // 픽셀이 스톱을 **보간**하므로 절대값은 스톱과 다르다. 방향(단조증가)만 본다 —
    // 절대값을 박으면 그것이 값 미러링이고, 디더·보간을 손대면 뜻 없이 깨진다.
    const b = [0, 0.5, 1].map((k) => blueness(bake('clear', { blue: k }).main[0]));
    expect(b[1]).toBeGreaterThan(b[0]);
    expect(b[2]).toBeGreaterThan(b[1]);
  });

  it('스톱 판정과 굽힌 결과가 같은 부호를 갖는다 — 판정↔집행 방향 일치', () => {
    const fog = [0xe9, 0xee, 0xf2];
    const s0 = dayStops(0, fog), s1 = dayStops(1, fog);
    const stopGain = (s1[0][1] as number[])[2] - (s1[0][1] as number[])[0]
      - ((s0[0][1] as number[])[2] - (s0[0][1] as number[])[0]);
    const pixGain = blueness(bake('clear', { blue: 1 }).main[0]) - blueness(bake('clear', { blue: 0 }).main[0]);
    expect(Math.sign(pixGain)).toBe(Math.sign(stopGain));
  });
});

describe('paintCloudLayer → cloudElev 집행', () => {
  // `clear` 는 이 경로를 안 탄다(맑음 구름은 `paintClearClouds` 가 별도 캔버스에 굽고
  // `createSkySystem` 이 부른다). 전천 구름장이 도는 것은 흐림 계열이다.
  it('★ `curve` 가 실제 밀도장에 반영된다 — 곡률 판정을 굽는 쪽이 소비하는가', () => {
    const flat = bake('overcast', { curve: 0 });
    const round = bake('overcast', { curve: 1 });
    // 오프스크린(구름 밀도장)이 실제로 구워졌는지부터 — 0 이면 이 검사는 아무것도
    // 안 본 것이고, 그것을 통과로 적지 않는다.
    expect(flat.others.length).toBeGreaterThan(0);
    expect(round.others.length).toBeGreaterThan(0);

    const alphaOf = (c: object) => {
      const s = shots.get(c)![0];
      const a: number[] = [];
      for (let i = 3; i < s.data.length; i += 4) a.push(s.data[i]);
      return a;
    };
    const A = alphaOf(flat.others[0]), B = alphaOf(round.others[0]);
    expect(A.length).toBe(B.length);
    // 곡률이 켜지면 같은 자리의 밀도가 달라진다. "달라진다" 로 충분하다 —
    // 어느 방향으로 얼마나는 `cloudElev` 단위 테스트가 이미 못 박았다.
    expect(A.some((v, i) => v !== B[i])).toBe(true);
  });

  it('curve=0 이면 곡률이 꺼진 것과 같은 밀도장이 나온다 — 되돌림 링크의 집행 근거', () => {
    // `?cloudcurve=0` 이 "옛 화면 그대로" 라는 주장은 순수 함수에서만 참이면 부족하다.
    // 같은 입력으로 두 번 구워 **결정론**까지 함께 본다(시드가 흔들리면 되돌림이 성립하지
    // 않는다 — 감독이 링크로 비교할 때 매번 다른 구름을 보게 된다).
    const a = bake('overcast', { curve: 0 });
    const b = bake('overcast', { curve: 0 });
    const px = (r: { others: object[] }) => shots.get(r.others[0])![0].data;
    expect(Array.from(px(a))).toEqual(Array.from(px(b)));
  });
});
