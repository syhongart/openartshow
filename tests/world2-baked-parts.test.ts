// @vitest-environment jsdom
//
// 조각을 구워 만든 파츠 — **실제 three 로 굽는다.**
//
// ── 뮤테이션이 시켜서 생겼다 ────────────────────────────────────────────────
// 가로등에서 **갓을 빼고**, 벤치에서 **다리를 빼고** 테스트를 돌렸는데 전부 통과했다.
// 즉 가로등이 다시 막대기가 되고 벤치가 통짜 판이 되어도 아무도 안 잡는다.
//
// 왜 안 잡혔나:
//   · 배치 골든 — 인스턴스 **좌표**만 본다. 지오 안에 무엇이 들었는지는 모른다.
//   · 파츠 자산 — "지오와 재질이 만들어졌나" 만 본다. 내용은 안 본다.
//   · 그 둘 다 three 를 **스텁으로** 갈아 끼우므로 정점 배열이 애초에 비어 있다.
//
// 나무는 `world2-tree-geometry.test.ts` 가 실제 three 로 보고 있었다. 가로등·벤치·화분이
// 같은 방식으로 조각을 굽기 시작했으니 같은 안전망이 필요하다.
//
// ── 무엇을 보는가 ───────────────────────────────────────────────────────────
// **정점색 계열 수**가 핵심이다. 조각이 하나뿐이면 굽는 의미가 없고, 색이 하나면 조각이
// 하나로 합쳐졌다는 뜻이다. 갓·다리·화분통이 사라지면 여기서 걸린다.
//
// 대칭도 본다. 벤치 다리 **하나만** 빠지면 색 계열은 그대로 둘이라 위 검사를 통과하는데,
// 좌우 대칭이 깨지므로 그쪽에서 잡힌다.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { lamp } from '../frontend/js/world2/parts/lamp.js';
import { bench } from '../frontend/js/world2/parts/bench.js';
import { planter } from '../frontend/js/world2/parts/planter.js';
import type { ThreeNS } from '../frontend/js/world2/parts/types.js';

// 가로등이 **발광 마스크 텍스처**를 굽기 시작하면서 2D 컨텍스트가 필요해졌다(갓만
// 빛나게 하려고 2×1 마스크를 깐다). jsdom 에는 네이티브 캔버스가 없어 `getContext` 가
// null 이다 — 여기서 보는 것은 **지오메트리**이므로 그리기는 전부 no-op 이어도 된다.
const ctx2d = {
  fillStyle: '',
  fillRect() {},
};
(HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () => ctx2d;

const T = THREE as unknown as ThreeNS;

/** 정점색을 반올림해 **몇 가지 색으로 칠해졌는지** 센다 */
function colorFamilies(geo: { attributes: Record<string, { array: ArrayLike<number> }> }) {
  const c = geo.attributes.color.array;
  const seen = new Set<string>();
  for (let i = 0; i < c.length; i += 3) {
    seen.add(`${c[i].toFixed(2)},${c[i + 1].toFixed(2)},${c[i + 2].toFixed(2)}`);
  }
  return seen.size;
}

/** x=0 을 기준으로 좌우가 같은가 — 정점 x 의 합이 0 에 가까우면 대칭이다 */
function xBalance(geo: { attributes: Record<string, { array: ArrayLike<number> }> }) {
  const p = geo.attributes.position.array;
  let sum = 0, scale = 0;
  for (let i = 0; i < p.length; i += 3) { sum += p[i]; scale += Math.abs(p[i]); }
  return scale > 0 ? Math.abs(sum) / scale : 0;
}

// 타입을 명시하지 않는다 — `three` 는 `BufferGeometry` 를 타입 네임스페이스로 재수출
// 하지 않아서(TS2694) 적으면 컴파일이 안 된다. `ocean.ts` 의 `CanvasTexture`, 나무
// 지오 테스트에서 이미 두 번 겪은 함정이라 같은 처방을 쓴다: 추론에 맡긴다.
function bbox(geo: { computeBoundingBox(): void; boundingBox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } | null }) {
  geo.computeBoundingBox();
  return geo.boundingBox!;
}

describe('가로등 — world1 실물(기둥 + 갓)', () => {
  const geo = lamp.asset(T).geometry;

  it('조각이 둘 이상이다 — 갓이 빠지면 다시 막대기가 된다', () => {
    expect(colorFamilies(geo)).toBeGreaterThanOrEqual(2);
  });

  it('사람 키를 훌쩍 넘는다 — world1 기둥 3.0m + 갓', () => {
    const b = bbox(geo);
    expect(b.max.y).toBeGreaterThan(3.1);
  });

  it('밑동이 바닥에 있다 — 떠 있으면 배치 좌표가 거짓말이 된다', () => {
    expect(bbox(geo).min.y).toBeGreaterThan(-0.05);
  });

  it('기둥 축을 중심으로 대칭이다', () => {
    expect(xBalance(geo)).toBeLessThan(0.02);
  });
});

describe('벤치 — world1 실물(좌석 + 다리 둘)', () => {
  const geo = bench.asset(T).geometry;

  it('조각이 둘 이상이다 — 통짜 박스면 벤치로 안 읽힌다', () => {
    expect(colorFamilies(geo)).toBeGreaterThanOrEqual(2);
  });

  // 다리 **하나만** 빼면 색 계열은 그대로 둘이라 위 검사를 통과한다. 여기서 잡는다.
  it('좌우 대칭이다 — 다리 하나가 빠져도 잡힌다', () => {
    expect(xBalance(geo)).toBeLessThan(0.02);
  });

  it('앉는 높이가 사람 기준이다 — world1 좌석 0.45m', () => {
    const b = bbox(geo);
    expect(b.max.y).toBeGreaterThan(0.45);
    expect(b.max.y).toBeLessThan(0.6);
  });

  it('가로로 길다 — 한 사람이 아니라 여럿이 앉는다', () => {
    const b = bbox(geo);
    expect(b.max.x - b.min.x).toBeGreaterThan(b.max.z - b.min.z);
  });
});

describe('화분 — world1 실물(통 + 덤불)', () => {
  const geo = planter.asset(T).geometry;

  it('조각이 둘 이상이다 — 덤불만 남으면 땅에서 솟은 초록 공이 된다', () => {
    expect(colorFamilies(geo)).toBeGreaterThanOrEqual(2);
  });

  it('아래가 통, 위가 덤불이다 — 순서가 뒤집히면 화분이 공 위에 얹힌다', () => {
    const p = geo.attributes.position.array;
    const c = geo.attributes.color.array;
    // 초록(g > r)인 정점의 평균 높이가 그렇지 않은 쪽보다 높아야 한다
    let leafY = 0, leafN = 0, potY = 0, potN = 0;
    for (let i = 0; i < c.length; i += 3) {
      const y = p[i + 1];
      if (c[i + 1] > c[i]) { leafY += y; leafN++; } else { potY += y; potN++; }
    }
    expect(leafN).toBeGreaterThan(0);
    expect(potN).toBeGreaterThan(0);
    expect(leafY / leafN).toBeGreaterThan(potY / potN);
  });

  it('밑동이 바닥에 있다', () => {
    expect(bbox(geo).min.y).toBeGreaterThan(-0.05);
  });
});
