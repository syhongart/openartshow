// tests/sky-star-scale.test.ts — 별 각크기 노브(`?star=`)가 **실제로 그리기에 도달하는가**.
//
// ── 왜 이 검사가 있나 (감독 실기기 2026-08-06) ───────────────────────────────
// 감독이 `dome=520` 과 `dome=6000` 스크린샷 두 장을 나란히 올려 *"현재 같은데?"* 로
// 잡았다. `?dome=` 은 **배선은 멀쩡한데 화면에 아무 영향이 없는** 노브였다 — 돔이
// 카메라를 따라오면 반경은 카메라 중심 스케일 변환이라 화면 각도를 안 바꾼다.
//
// 그 자리를 `?star=`(별 각크기)로 대체하면서, **같은 형태를 반대 방향으로 만들 위험**이
// 생겼다: 배선이 끊겨 값이 안 닿는 경우다. 증상은 둘 다 *"화면이 같다"* 로 동일하고,
// 감독 화면에서는 구별되지 않는다.
//
// ── 이 검사가 못 하는 것 (정직하게) ─────────────────────────────────────────
// **화면 인상은 안 본다.** 헤드리스(swiftshader/WebGL)로 `star=1`·`star=0.2` 를 실제
// 렌더해 비교했으나 두 화면이 구별되지 않았고, 원인은 헤드리스에 **큰 십자 별 자체가
// 안 나타난다**는 것이었다(감독 기기는 WebGPU + 블룸). 그 사각은 아직 열려 있고
// 감독 실기기 판정이 유일한 수단이다 — 여기서 그것을 대신했다고 적지 않는다.
//
// 여기서 잠그는 것은 딱 하나: **`scale` 이 그리기 좌표를 바꾸는가.**

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { paintTwinkleStars, TWK_BASE_COUNT, TWK_MAX_COUNT } from '../frontend/js/sky.js';

/** 그리기 호출을 기록만 하는 페이크 2D 컨텍스트. three·DOM 없이 순수 계측. */
function fakeCtx() {
  const arcs: { r: number }[] = [];
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  let mx = 0, my = 0;
  return {
    arcs, lines,
    clearRect() {},
    createRadialGradient() { return { addColorStop() {} }; },
    beginPath() {},
    arc(_x: number, _y: number, r: number) { arcs.push({ r }); },
    fill() {},
    moveTo(x: number, y: number) { mx = x; my = y; },
    lineTo(x: number, y: number) { lines.push({ x1: mx, y1: my, x2: x, y2: y }); },
    stroke() {},
    set fillStyle(_v: string) {},
    set strokeStyle(_v: string) {},
    set lineWidth(_v: number) {},
  };
}

function paint(scale: number) {
  const a = fakeCtx(), b = fakeCtx();
  paintTwinkleStars(a, b, 2048, 512, scale);
  const arcs = [...a.arcs, ...b.arcs];
  const lines = [...a.lines, ...b.lines];
  // 십자 가로획 길이 = 2s. 세로획도 같은 s 이므로 가로만 본다.
  const crossLens = lines.filter((l) => l.y1 === l.y2).map((l) => Math.abs(l.x2 - l.x1));
  return {
    count: arcs.length,
    maxGlowR: Math.max(...arcs.map((v) => v.r)),
    maxCross: Math.max(...crossLens),
  };
}

describe('별 각크기 노브 — 값이 그리기에 도달한다', () => {
  it('★ scale 을 줄이면 광구 반경과 십자 길이가 **둘 다** 줄어든다', () => {
    const big = paint(1);
    const small = paint(0.2);
    expect(small.maxGlowR).toBeLessThan(big.maxGlowR);
    expect(small.maxCross).toBeLessThan(big.maxCross);
  });

  it('★ 십자에 **비례** 축소가 걸린다 — 상수항이 바닥을 만들지 않는다', () => {
    // 옛 식은 `s = 5 + r·3.4` 였고 `r` 에만 scale 이 곱했다. 그러면 scale→0 에서도
    // `s` 가 5px(=1.76°) 아래로 안 내려가 **노브가 바닥에서 죽는다.**
    // 지금 식은 `(5 + rBase·3.4)·scale` 이므로 정확히 비례해야 한다.
    const a = paint(1).maxCross;
    const b = paint(0.25).maxCross;
    expect(b / a).toBeCloseTo(0.25, 2);
  });

  it('광구도 비례한다', () => {
    expect(paint(0.5).maxGlowR / paint(1).maxGlowR).toBeCloseTo(0.5, 2);
  });

  it('작아지면 개수가 역수로 늘어난다 — 하늘이 휑해지지 않게', () => {
    expect(paint(1).count).toBe(TWK_BASE_COUNT);
    expect(paint(0.5).count).toBe(TWK_BASE_COUNT * 2);
    expect(paint(0.25).count).toBe(TWK_BASE_COUNT * 4);
  });

  it('개수 상한이 걸린다 — 페인트 비용이 터지지 않는다', () => {
    // 하한 0.1 에서 340 이 되므로 잘려야 한다.
    expect(paint(0.1).count).toBe(TWK_MAX_COUNT);
    // 노브 하한 밖(0)으로 들어와도 0 나누기가 안 난다.
    expect(paint(0).count).toBe(TWK_MAX_COUNT);
  });

  it('★ world2 기본값이 감독 판정값 0.25 다 — 되돌아가면 벽지로 돌아간다', () => {
    // 감독 판정(2026-08-06): 후보 다섯 중 `?star=0.25`. 근거표는 `sky.ts` 의
    // `STAR_SCALE` 독블록 한 곳이 소유한다 — 여기에 값을 다시 적지 않는다(0.25 하나만
    // 본다). 이 검사가 없으면 리팩터링 중 기본값이 1 로 돌아가도 아무도 모르고,
    // 화면은 감독이 **거부한 상태**(보름달 8.76배)로 조용히 되돌아간다.
    const src = readFileSync(join(import.meta.dirname, '..', 'frontend/js/world2/systems/sky.ts'), 'utf8');
    const m = src.match(/readNum\(\s*'star'\s*,\s*([\d.]+)/);
    expect(m, "`readNum('star', …)` 를 못 찾았다 — 노브가 사라졌거나 이 검사가 딴것을 본다").not.toBeNull();
    expect(Number(m![1])).toBe(0.25);
  });

  it('라이브 world1 은 여전히 scale=1 이다 — world2 판정이 서비스로 새지 않는다', () => {
    // `sky.js` 는 두 월드 공용이다. world2 기본값을 0.25 로 내린 것이 **라이브 미술관
    // 하늘까지 바꾸면 안 된다** — 그 판정은 world2 화면에서 받았다.
    const src = readFileSync(join(import.meta.dirname, '..', 'frontend/js/sky.js'), 'utf8');
    expect(
      /starScale\s*=\s*1\b/.test(src),
      'sky.js 의 starScale 기본값이 1 이 아니다 — 라이브 world1 하늘이 함께 바뀐다',
    ).toBe(true);
  });

  it('기본값 1 은 옛 고정 동작과 같다 — 라이브 world1 무영향', () => {
    const withArg = paint(1);
    const a = fakeCtx(), b = fakeCtx();
    paintTwinkleStars(a, b, 2048, 512); // 인자 생략 = 기본 1
    expect([...a.arcs, ...b.arcs].length).toBe(withArg.count);
    expect(Math.max(...[...a.arcs, ...b.arcs].map((v) => v.r))).toBeCloseTo(withArg.maxGlowR, 6);
  });
});
