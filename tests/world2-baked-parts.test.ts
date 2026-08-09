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
import { clocktower, PALETTES, clockLook, H as CLOCK_H } from '../frontend/js/world2/parts/clocktower.js';
import { rgb } from '../frontend/js/world2/parts/bake.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';
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

// ── 시계탑 — world3 종탑 형태로 교체 (감독 지시 2026-08-09) ──────────────────
//
// *"시계탑도 동물의 숲에 있는 시계탑을 world2로 교체하자"*
//
// 옛 판은 **4각 기둥 하나 + 캔버스 텍스처**였다. 그때 이 파일이 볼 것이 없었던 이유가
// 그것이다 — 조각이 하나뿐이면 "조각이 사라졌는가" 를 물을 수 없다.
//
// 지금은 조각 20여 개를 한 지오로 굽는다. 그래서 이 파일이 가로등·벤치·화분에 대해
// 하던 일(**뮤테이션이 시켜서 생긴 검사**)이 시계탑에도 필요해졌다.
//
// ⚠️ 아래 기댓값은 **전부 실측이다.** 추측으로 적으면 그 순간 장식이 된다.
describe('시계탑 — world3 종탑 이식', () => {
  const geo = clocktower.asset(T).geometry;

  /**
   * `footprint(p)` 에 넘길 배치 한 조각. 시계탑의 `footprint` 는 **인자를 안 본다**
   * (`() => R + 0.4`) — 그래도 여기서 `R + 0.4` 를 손으로 적으면 값 미러링이라,
   * 실제 `place` 가 내는 것과 같은 모양을 주고 함수에게 물어본다.
   */
  const CLOCK_AT_ORIGIN: PlacedPart = {
    kind: 'clock', x: 0, z: 0, y: 0, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0,
  };

  // 조각이 빠지면 가장 먼저 줄어드는 수다. 색 계열보다 민감하다 —
  // 같은 색 조각이 빠져도 여기서는 잡힌다.
  it('정점 수가 실측값 그대로다 — 조각이 빠지면 줄어든다', () => {
    expect(geo.attributes.position.count).toBe(1740);
  });

  // 팔레트가 12색이고 **12색 전부 실제로 칠해진다**(실측: 가장 적은 roof 24 정점,
  // 가장 많은 metal 528). 조각이 합쳐지거나 색 하나가 안 쓰이면 줄어든다.
  //
  // ⚠️ **이 축은 조각이 사라져도 안 움직일 수 있다.** 시계면을 통째로 지우는 뮤테이션
  // (M7)에서 12계열이 **그대로 유지**됐다 — 시계면이 쓰는 `roofShade`·`trim`·`metal`
  // 이 처마·차양·창틀·종 꼭지에도 이미 쓰이기 때문이다. 그때 잡은 것은 위의 정점 수다.
  // 색 계열 수는 "팔레트를 다 쓰는가" 를 보는 축이지 "조각이 다 있는가" 가 아니다.
  it('정점색이 12계열이다 — 팔레트를 다 쓴다', () => {
    expect(colorFamilies(geo)).toBe(12);
  });

  // 높이는 `H` 에서 유도된다. 여기 12 를 다시 적으면 값 미러링이라 상수를 읽는다.
  it('꼭대기가 정확히 H 이고 밑동이 바닥에 있다', () => {
    const b = bbox(geo);
    expect(b.max.y).toBeCloseTo(CLOCK_H, 5);
    expect(b.min.y).toBeGreaterThan(-0.001);
  });

  /**
   * **`footprint` 를 넘지 않는다.** 종탑은 파셀 중앙 고정 배치라 자리를 양보할 수
   * 없고, 실루엣이 커지면 겹침 판정이 아니라 화면에서 이웃을 파고든다.
   *
   * 실측 최대 반경 **1.725**(지붕 처마 띠) — 여유가 0.075 밖에 없다. 그래서 상한만
   * 보지 않고 **실측값도 못 박는다**: 상한만 보면 조각을 키워 1.79 로 만들어도 초록이라
   * "여유가 사라졌다" 는 사실이 아무 데도 안 뜬다.
   */
  it('모든 정점이 footprint 안이다 — 실측 최대 반경까지 못 박는다', () => {
    const p = geo.attributes.position.array;
    let maxR = 0;
    for (let i = 0; i < p.length; i += 3) maxR = Math.max(maxR, Math.hypot(p[i], p[i + 2]));
    expect(maxR).toBeLessThanOrEqual(clocktower.footprint!(CLOCK_AT_ORIGIN));
    // ⚠️ 이 줄이 없으면 처마를 **줄이는** 변경이 통과한다 — 실측(M4, 2026-08-09):
    // `2.44 → 2.30` 으로 좁혔을 때 상한 단언은 초록이고 **이 줄만 깨졌다.**
    expect(maxR).toBeCloseTo(1.725, 3);
  });

  /**
   * ★ **종탑이 네 기둥으로 서 있다.** 이것이 이번 교체의 요점이다 — 막힌 단으로 만들고
   * 어두운 판을 붙여 뚫린 척하는 편이 조각은 적지만, 그러면 종이 안 보이고 **종탑이
   * 아니라 그냥 2층**이 된다.
   *
   * ⚠️ 처음엔 "중심축 근처에 정점이 없다" 로 재려 했고 **틀린 축이었다** — 거기서 잡힌
   * 144개는 벽이 아니라 **종과 걸이보**였다. 뚫림은 중심이 비었는가가 아니라 **네 모서리
   * 에만 살점이 있는가**다.
   *
   * 기둥은 `BoxGeometry` 라 중간 높이에 정점이 없다(위아래 두 평면뿐). 그래서 y 창을
   * 종탑 전 구간(5.18~8.28)으로 잡아야 걸린다 — 좁히면 표본이 0 이 되어 공허하게 통과한다.
   */
  it('종탑 구간에 기둥이 네 귀퉁이 전부에 선다', () => {
    const p = geo.attributes.position.array;
    const corners = new Set<string>();
    for (let i = 0; i < p.length; i += 3) {
      const [x, y, z] = [p[i], p[i + 1], p[i + 2]];
      if (y < 5.1 || y > 8.3) continue;
      if (Math.abs(Math.abs(x) - 0.72) < 0.14 && Math.abs(Math.abs(z) - 0.72) < 0.14) {
        corners.add(`${Math.sign(x)},${Math.sign(z)}`);
      }
    }
    expect([...corners].sort()).toEqual(['-1,-1', '-1,1', '1,-1', '1,1']);
  });

  // 종이 실재하는가. `bake` 가 sRGB→선형 변환을 하므로 **같은 변환을 거친 값**과 비교한다
  // (hex 를 그대로 비교하면 영원히 안 맞고, 그 실패는 "종이 없다" 로 오독된다).
  it('종탑 안에 황동 종이 걸려 있다', () => {
    const p = geo.attributes.position.array;
    const c = geo.attributes.color.array;
    const want = rgb(PALETTES.village.brass);
    let bell = 0;
    for (let i = 0; i < c.length; i += 3) {
      const y = p[i + 1];
      if (y < 6.4 || y > 7.5) continue;
      if (Math.abs(c[i] - want[0]) < 1e-3 && Math.abs(c[i + 1] - want[1]) < 1e-3
        && Math.abs(c[i + 2] - want[2]) < 1e-3) bell++;
    }
    expect(bell).toBeGreaterThan(0);
  });

  // 4각 탑이므로 좌우 대칭이다. 한쪽 조각만 빠지면 색 계열·정점 수가 그대로여도 여기서 걸린다.
  it('좌우 대칭이다', () => {
    expect(xBalance(geo)).toBeLessThan(0.01);
  });
});

// ── 색 노브 — 두 안이 실제로 다르고, 형태는 같다 ─────────────────────────────
//
// 감독 판정 대기 중인 임시 노브다(`?clock=village|city`). 판정이 나면 진 쪽과 함께
// 이 describe 도 지운다.
describe('시계탑 색 노브', () => {
  const withKnob = <R,>(search: string, fn: () => R): R => {
    const g = globalThis as unknown as { location?: { search: string } };
    const prev = g.location;
    g.location = { search };
    try { return fn(); } finally { g.location = prev; }
  };

  it('두 팔레트가 같은 키를 채운다 — 하나라도 비면 그 조각이 검게 굽힌다', () => {
    expect(Object.keys(PALETTES.city).sort()).toEqual(Object.keys(PALETTES.village).sort());
  });

  /**
   * ★ **12색이 하나도 겹치지 않는다.**
   *
   * ⚠️ 이 검사는 **뮤테이션이 시켜서 생겼다.** 아래 "실제로 다른 색을 낸다" 하나만
   * 있을 때 `city.roof` 를 `village.roof` 와 **같은 값으로 바꿔도 22/22 통과**했다
   * (M6, executor 실측 2026-08-09). 12색 중 1색만 겹치면 정점색 차이가 11/12 =
   * **91.7%** 라 `> 0.9` 임계를 그냥 넘는다.
   *
   * 비율 단언은 "두 팔레트가 대체로 다르다" 까지만 말한다 — **어느 한 색이 잘못
   * 복사됐는가**는 못 본다. 그래서 키별로 본다.
   */
  it('두 팔레트의 12색이 하나도 겹치지 않는다', () => {
    const same = (Object.keys(PALETTES.village) as Array<keyof typeof PALETTES.village>)
      .filter((k) => PALETTES.village[k] === PALETTES.city[k]);
    expect(same).toEqual([]);
  });

  // 위가 **값**을 보고 이것이 **집행**을 본다 — 팔레트를 고쳐도 구운 결과가 안 바뀌면
  // (예: `asset` 이 한쪽을 하드코딩) 위 검사는 초록인 채로 통과한다. 경계를 건너는
  // 지점은 양쪽 테스트 어디에도 안 걸린다는 것이 이 저장소가 반복해 데인 형태다.
  it('village 와 city 가 실제로 다른 색을 낸다', () => {
    const a = withKnob('?clock=village', () => clocktower.asset(T).geometry.attributes.color.array);
    const b = withKnob('?clock=city', () => clocktower.asset(T).geometry.attributes.color.array);
    expect(a.length).toBe(b.length);
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-3) diff++;
    // 두 팔레트가 12색 전부 다르므로 대부분의 성분이 갈려야 한다.
    expect(diff / a.length).toBeGreaterThan(0.9);
  });

  it('색만 바뀌고 형태는 한 점도 안 움직인다', () => {
    const a = withKnob('?clock=village', () => clocktower.asset(T).geometry.attributes.position.array);
    const b = withKnob('?clock=city', () => clocktower.asset(T).geometry.attributes.position.array);
    expect(Array.from(b)).toEqual(Array.from(a));
  });

  it('목록 밖 값은 village 로 떨어진다 — 손으로 고친 URL 이 화면을 깨뜨리지 않는다', () => {
    expect(withKnob('?clock=nope', clockLook)).toBe('village');
    expect(withKnob('', clockLook)).toBe('village');
    expect(withKnob('?clock=city', clockLook)).toBe('city');
  });
});
