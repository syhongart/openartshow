// `?far=` — 가시 거리를 **자산 크기**에서 유도하는 축의 검출력.
//
// ── 무엇을 막는가 ───────────────────────────────────────────────────────────
// ① **판정이 맞는가**(`decide/view-span.ts` — 순수)
// ② **집행이 그 값을 실제로 쓰는가**(`systems/glb-view.ts` — 안개 객체를 진짜로 고치고
//    컬링 반경을 그 값에서 낸다). 이 저장소가 이름 붙인 «판정/집행 분리의 구멍» 이
//    정확히 ②가 없을 때 열린다 — 판정 함수는 값을 바꾸는데 집행 쪽이 안 읽는 형태다.
// ③ **world7·world8 이 한 글자도 안 바뀌는가** — 옵션(`viewSpan`)을 안 넘기면 `?far=` 를
//    아무리 밀어도 원래 밴드가 그대로여야 한다. 「기본값이 같다」가 아니라 **「경로가
//    없다」**를 단언한다.

import { describe, it, expect } from 'vitest';
import {
  spanOf, viewBand, VIEW_FAR_MUL_DEFAULT, VIEW_FAR_MUL_MIN, VIEW_FAR_MUL_MAX,
} from '../frontend/js/world-glb/decide/view-span.js';
import { applyViewSpan } from '../frontend/js/world-glb/systems/glb-view.js';
import { fogBand } from '../frontend/js/world-glb/decide/fog.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world-glb/parts/types.js';

/** node 환경에는 `location` 이 없다. `url-knob` 이 읽는 그 전역을 세운다 */
function withSearch<T>(search: string, fn: () => T): T {
  const had = 'location' in globalThis;
  const prev = (globalThis as { location?: unknown }).location;
  Object.defineProperty(globalThis, 'location', { value: { search }, configurable: true, writable: true });
  try { return fn(); } finally {
    if (had) Object.defineProperty(globalThis, 'location', { value: prev, configurable: true, writable: true });
    else delete (globalThis as { location?: unknown }).location;
  }
}

/** 맨해튼 자산의 실측 bbox(2026-09-17) — 원점이 0 이 아닌 것도 함께 잰다 */
const MANHATTAN = { min: [-80.5, -2, -78] as const, max: [80.5, 88.105, 84.6] as const };

describe('가시 거리 판정 — `decide/view-span.ts`', () => {
  it('`spanOf` 는 **평면 반대각선**이다 — 한가운데에서 가장 먼 모서리까지', () => {
    // 180 × 180 이면 반대각선 = 180 × √2 / 2 ≈ 127.28
    expect(spanOf({ x: 180, z: 180 })).toBeCloseTo(127.279, 2);
    // y 는 안 본다 — 컬링도 안개도 수평 거리 판정이다
    expect(spanOf({ x: 3, z: 4 })).toBeCloseTo(2.5, 6);
  });

  it('🔴 `spanM` 이 `null` 이면 **밴드를 한 글자도 안 바꾼다** — world7·world8 의 불변', () => {
    const base = { near: 51.2, far: 76.8 };
    expect(viewBand(base, null, VIEW_FAR_MUL_DEFAULT)).toEqual(base);
  });

  it('🔴 그리고 그때 **배수를 아예 안 본다** — 「기본값이 같다」가 아니라 「경로가 없다」', () => {
    // 위 검사와 갈라 두는 이유: 기본 배수(1)에서는 «곱해도 같은 값» 이라 통과해 버린다.
    // 노브를 끝까지 밀어도 안 움직이는 것이 불변의 진짜 내용이다.
    const base = { near: 51.2, far: 76.8 };
    expect(viewBand(base, null, VIEW_FAR_MUL_MAX)).toEqual(base);
    expect(viewBand(base, null, VIEW_FAR_MUL_MIN)).toEqual(base);
  });

  it('`spanM` 이 오면 far 가 그 값이 되고 near 는 **원래 비율**을 지킨다', () => {
    const base = { near: 51.2, far: 76.8 };          // 비율 2/3
    const b = viewBand(base, 127.279, 1);
    expect(b.far).toBeCloseTo(127.279, 3);
    expect(b.near / b.far).toBeCloseTo(base.near / base.far, 9);
  });

  it('배수가 곱해진다 — `?far=2` 는 두 배', () => {
    const base = { near: 51.2, far: 76.8 };
    expect(viewBand(base, 100, 2).far).toBeCloseTo(200, 6);
    expect(viewBand(base, 100, 0.5).far).toBeCloseTo(50, 6);
  });

  it('망가진 `spanM` 은 원래 밴드로 되돌린다 — 0·음수·NaN 은 「세계가 사라짐」이다', () => {
    const base = { near: 51.2, far: 76.8 };
    expect(viewBand(base, 0, 1)).toEqual(base);
    expect(viewBand(base, -5, 1)).toEqual(base);
    expect(viewBand(base, Number.NaN, 1)).toEqual(base);
  });

  it('범위 상수가 서로 모순되지 않는다 — 기본값이 범위 안이다', () => {
    expect(VIEW_FAR_MUL_MIN).toBeLessThan(VIEW_FAR_MUL_DEFAULT);
    expect(VIEW_FAR_MUL_DEFAULT).toBeLessThan(VIEW_FAR_MUL_MAX);
    // 0 을 허용하지 않는다 — 그것은 `?fogd=0` 의 어휘다(그 파일 주석)
    expect(VIEW_FAR_MUL_MIN).toBeGreaterThan(0);
  });
});

describe('집행 — `systems/glb-view.ts` 가 그 값을 실제로 쓴다', () => {
  const base = fogBand(DEFAULT_LAYOUT.cellX);

  it('🔴 `viewSpan` 을 **안 넘기면** `?far=99` 를 밀어도 안개·반경이 종전 그대로다 (world7·world8)', () => {
    const scene = { fog: { near: base.near, far: base.far } };
    const r = withSearch('?far=99', () => applyViewSpan(scene, base, 1, 1.15, MANHATTAN));
    // 안개 객체가 한 글자도 안 바뀐다
    expect(scene.fog.near).toBeCloseTo(base.near, 9);
    expect(scene.fog.far).toBeCloseTo(base.far, 9);
    // 반경도 기존 식(`fog.far × fogd × cull`) 그대로다
    expect(r).toBeCloseTo(base.far * 1 * 1.15, 9);
  });

  it('⭐ `viewSpan` 을 넘기면 **안개 객체가 실제로 고쳐진다** — 반환값만 보는 검사는 이것을 놓친다', () => {
    const scene = { fog: { near: base.near, far: base.far } };
    withSearch('', () => applyViewSpan(scene, base, 1, 1.15, MANHATTAN, spanOf));
    const want = spanOf({ x: 161, z: 162.6 });        // 실측 bbox 의 치수
    expect(scene.fog.far).toBeCloseTo(want, 3);
    expect(scene.fog.far).toBeGreaterThan(base.far);  // 실제로 넓어졌다
  });

  it('⭐ 컬링 반경이 **같은 밴드에서** 나온다 — 안개와 어긋나면 세계가 안개 없이 잘린다', () => {
    const scene = { fog: { near: base.near, far: base.far } };
    const r = withSearch('', () => applyViewSpan(scene, base, 1, 1.15, MANHATTAN, spanOf));
    expect(r).toBeCloseTo(scene.fog.far * 1.15, 6);
  });

  it('⭐ `?far=` 가 집행까지 닿는다 — 2 를 주면 안개 far 도 반경도 두 배다', () => {
    const one = { fog: { near: base.near, far: base.far } };
    const two = { fog: { near: base.near, far: base.far } };
    const r1 = withSearch('?far=1', () => applyViewSpan(one, base, 1, 1.15, MANHATTAN, spanOf));
    const r2 = withSearch('?far=2', () => applyViewSpan(two, base, 1, 1.15, MANHATTAN, spanOf));
    expect(two.fog.far / one.fog.far).toBeCloseTo(2, 6);
    expect(r2 / r1).toBeCloseTo(2, 6);
  });

  it('`?fogd=` 와 직교한다 — 두 배수가 함께 곱해진다', () => {
    const scene = { fog: { near: base.near, far: base.far } };
    const r = withSearch('?far=2', () => applyViewSpan(scene, base, 3, 1.15, MANHATTAN, spanOf));
    const span = spanOf({ x: 161, z: 162.6 });
    expect(scene.fog.far).toBeCloseTo(span * 2 * 3, 3);
    expect(r).toBeCloseTo(span * 2 * 3 * 1.15, 3);
  });

  it('안개가 꺼진 세션(`fog === null`)에서도 죽지 않고 반경만 낸다', () => {
    const scene: { fog: null } = { fog: null };
    const r = withSearch('', () => applyViewSpan(scene, base, 1, 1.15, MANHATTAN, spanOf));
    expect(r).toBeGreaterThan(0);
  });

  it('상한을 넘겨도 화면이 날아가지 않는다 — 클램프가 집행까지 온다', () => {
    const scene = { fog: { near: base.near, far: base.far } };
    withSearch('?far=9999', () => applyViewSpan(scene, base, 1, 1.15, MANHATTAN, spanOf));
    const span = spanOf({ x: 161, z: 162.6 });
    expect(scene.fog.far).toBeCloseTo(span * VIEW_FAR_MUL_MAX, 3);
  });
});
