// 지면 안개 — **식이 맞는가, 그래프가 SSOT 를 참조하는가, 두 트리가 같은 것을 다는가.**
//
// ── 이 검사가 못 보는 것을 먼저 적는다 ─────────────────────────────────────
// 화면. 스모크는 레거시 `WebGLRenderer` 로 떨어져 `fogNode` 가 아예 안 돈다. 여기서
// 초록인 것은 「CPU 식 = 셰이더 식」·「노드 그래프가 `scene.fog` 를 참조한다」·「두 트리의
// 집행 파일이 같다」까지다. 안개가 리얼한지는 감독 실기기 링크만 안다.
//
// ── 왜 판정/집행 경계를 여기서 보나 ─────────────────────────────────────────
// `decide/` 를 순수 함수로 두면 "계산된 값이 실제로 소비되는가" 는 양쪽 테스트 어디에도
// 안 걸린다(검증 규율). 그래서 빌더에 **스텁 tsl 을 주입**해 그래프에 `strength`·
// `positionWorld.y`·`reference('color', …, scene.fog)` 가 실제로 들어가는지 센다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  smoothstep, heightFactor, rangeFactor, groundFactor, combineFog, groundFogFactor,
  groundFogEnabled, buildGroundFogNode, DEFAULT_GROUND_FOG, GROUND_FOG_MAX,
  GROUND_FOG_STRENGTH, type TslLike, type TslNodeLike, type GroundFogParams,
} from '../frontend/js/world-shared/ground-fog.js';

const P: GroundFogParams = { h0: 1, k: 0.45, strength: 0.7 };

describe('지면 안개 — 식', () => {
  it('smoothstep 이 GLSL 과 같다 — 끝점·중간·클램프', () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 10);
    expect(smoothstep(10, 20, 5)).toBe(0);
    expect(smoothstep(10, 20, 25)).toBe(1);
    expect(smoothstep(10, 20, 12.5)).toBeCloseTo(0.15625, 10);
  });

  it('고도 인자 — h0 이하는 1, 위로 갈수록 단조 감소, 0~1 안', () => {
    expect(heightFactor(P.h0, P)).toBe(1);
    expect(heightFactor(-5, P)).toBe(1);
    const a = heightFactor(3, P), b = heightFactor(6, P), c = heightFactor(20, P);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    // 두께 감각 3/k m 에서 e^-3 ≈ 0.05
    expect(heightFactor(P.h0 + 3 / P.k, P)).toBeCloseTo(Math.exp(-3), 10);
  });

  it('지면 안개 인자 — 눈앞(viewZ 0)은 0, near 에서 고도 인자 × 세기', () => {
    expect(groundFactor(0, 0, 51.2, P)).toBe(0);
    expect(groundFactor(0, 51.2, 51.2, P)).toBeCloseTo(P.strength, 10);
    expect(groundFactor(0, 200, 51.2, P)).toBeCloseTo(P.strength, 10);
  });

  it('세기 0 이면 지면 안개 인자가 0 — 종전 화면과 같다', () => {
    const off = { ...P, strength: 0 };
    expect(groundFactor(0, 100, 51.2, off)).toBe(0);
    expect(groundFogFactor(0, 60, 51.2, 76.8, off)).toBe(rangeFactor(60, 51.2, 76.8));
    expect(groundFogEnabled(off)).toBe(false);
    expect(groundFogEnabled(P)).toBe(true);
  });

  it('합성 — 한쪽이 1 이면 1, 둘 다 0 이면 0, 1 을 넘지 않는다', () => {
    expect(combineFog(1, 0.3)).toBe(1);
    expect(combineFog(0.3, 1)).toBe(1);
    expect(combineFog(0, 0)).toBe(0);
    for (const a of [0, 0.2, 0.5, 0.9, 1]) for (const b of [0, 0.4, 0.7, 1]) {
      const f = combineFog(a, b);
      expect(f).toBeGreaterThanOrEqual(Math.max(a, b) - 1e-12);
      expect(f).toBeLessThanOrEqual(1 + 1e-12);
    }
  });

  it('최종 인자 — far 밖은 1, 발치·중거리는 거리 안개보다 진하다', () => {
    expect(groundFogFactor(0, 100, 51.2, 76.8, P)).toBe(1);
    const ground = groundFogFactor(0, 60, 51.2, 76.8, P);
    const rangeOnly = rangeFactor(60, 51.2, 76.8);
    expect(ground).toBeGreaterThan(rangeOnly);
    // 높은 곳(건물 위)은 거리 안개에 수렴한다
    expect(groundFogFactor(40, 60, 51.2, 76.8, P)).toBeCloseTo(rangeOnly, 3);
  });
});

describe('지면 안개 — 기본값과 경계', () => {
  it('기본 세기 0 — 감독 판정 전에는 라이브 화면을 바꾸지 않는다', () => {
    // 판정이 나면 값을 옮기고 이 단언과 `world-shared/ground-fog.ts` 의 주석을 함께 고친다.
    expect(GROUND_FOG_STRENGTH).toBe(0);
    expect(DEFAULT_GROUND_FOG.strength).toBe(0);
    expect(groundFogEnabled(DEFAULT_GROUND_FOG)).toBe(false);
  });

  it('기본값이 노브 상한 안에 있다 — 아니면 링크 기본이 클램프된다', () => {
    expect(DEFAULT_GROUND_FOG.h0).toBeLessThanOrEqual(GROUND_FOG_MAX.h0);
    expect(DEFAULT_GROUND_FOG.k).toBeLessThanOrEqual(GROUND_FOG_MAX.k);
    expect(DEFAULT_GROUND_FOG.k).toBeGreaterThan(0);
  });
});

// ── 노드 빌더 — 스텁 tsl 로 그래프를 센다 ──────────────────────────────────
type Rec = { op: string; args: unknown[] };
function makeStub(withGroup: boolean) {
  const calls: Rec[] = [];
  const node = (op: string, ...args: unknown[]): TslNodeLike & { op: string; args: unknown[] } => {
    const n = {
      op, args,
      negate: () => node('negate', n),
      sub: (b: unknown) => node('sub', n, b),
      mul: (b: unknown) => node('mul', n, b),
      add: (b: unknown) => node('add', n, b),
      setGroup: (g: unknown) => { calls.push({ op: 'setGroup', args: [n, g] }); return n; },
    };
    return n;
  };
  const tsl: TslLike = {
    fog: (c, f) => { calls.push({ op: 'fog', args: [c, f] }); return { fogged: true, c, f }; },
    reference: (name, type, obj) => { const n = node('reference', name, type, obj); calls.push({ op: 'reference', args: [name, type, obj] }); return n; },
    positionWorld: { y: node('positionWorld.y') },
    positionView: { z: node('positionView.z') },
    smoothstep: (a, b, x) => node('smoothstep', a, b, x),
    float: (v) => node('float', v),
    exp: (x) => node('exp', x),
    saturate: (x) => node('saturate', x),
    ...(withGroup ? { renderGroup: { group: 'render' } } : {}),
  };
  return { tsl, calls };
}

/** 그래프를 평탄화해 어떤 op·값이 들어 있는지 센다 */
function flatten(n: unknown, out: Rec[] = []): Rec[] {
  if (n && typeof n === 'object' && 'op' in (n as Rec)) {
    const r = n as Rec;
    out.push(r);
    for (const a of r.args) flatten(a, out);
  }
  return out;
}

describe('지면 안개 — 노드 그래프가 SSOT 를 참조한다', () => {
  const fog = { color: { r: 0.1 }, near: 51.2, far: 76.8 };

  it('scene.fog 의 color·near·far 를 reference 로 읽는다 — 값을 복사하지 않는다', () => {
    const { tsl, calls } = makeStub(true);
    buildGroundFogNode(tsl, fog, P);
    const refs = calls.filter((c) => c.op === 'reference').map((c) => c.args);
    expect(refs).toEqual(expect.arrayContaining([
      ['color', 'color', fog], ['near', 'float', fog], ['far', 'float', fog],
    ]));
    expect(refs).toHaveLength(3);
  });

  it('fog(color, factor) 를 정확히 한 번 만들고 색은 그 reference 다', () => {
    const { tsl, calls } = makeStub(true);
    const out = buildGroundFogNode(tsl, fog, P) as { fogged: boolean; c: Rec };
    expect(out.fogged).toBe(true);
    expect(calls.filter((c) => c.op === 'fog')).toHaveLength(1);
    expect(out.c.op).toBe('reference');
    expect(out.c.args[0]).toBe('color');
  });

  it('인자 그래프에 고도(positionWorld.y)·세기·h0·k 가 실제로 들어간다', () => {
    const { tsl } = makeStub(true);
    const out = buildGroundFogNode(tsl, fog, P) as { f: unknown };
    const ops = flatten(out.f);
    expect(ops.some((r) => r.op === 'positionWorld.y'), '고도를 안 본다 — 높이 안개가 아니다').toBe(true);
    expect(ops.some((r) => r.op === 'positionView.z'), '거리를 안 본다').toBe(true);
    expect(ops.some((r) => r.op === 'mul' && r.args[1] === P.strength), '세기가 그래프에 없다').toBe(true);
    expect(ops.some((r) => r.op === 'mul' && r.args[1] === P.k), 'k 가 그래프에 없다').toBe(true);
    expect(ops.some((r) => r.op === 'float' && r.args[0] === P.h0), 'h0 가 그래프에 없다').toBe(true);
    expect(ops.some((r) => r.op === 'exp')).toBe(true);
    expect(ops.some((r) => r.op === 'saturate')).toBe(true);
  });

  it('renderGroup 이 있으면 reference 셋에 setGroup 을 건다 — 프레임당 1회 갱신', () => {
    const { tsl, calls } = makeStub(true);
    buildGroundFogNode(tsl, fog, P);
    expect(calls.filter((c) => c.op === 'setGroup')).toHaveLength(3);
  });

  it('renderGroup 이 없어도 조립된다', () => {
    const { tsl, calls } = makeStub(false);
    expect(() => buildGroundFogNode(tsl, fog, P)).not.toThrow();
    expect(calls.filter((c) => c.op === 'setGroup')).toHaveLength(0);
  });
});

// ── 집행 배선 — 두 트리가 같은 것을 단다 ────────────────────────────────────
describe('지면 안개 — 집행 배선 (world2 · world-glb)', () => {
  const src = (p: string) => readFileSync(p, 'utf8');
  const TREES = ['frontend/js/world2', 'frontend/js/world-glb'] as const;

  it('두 트리의 feature 파일이 한 글자도 다르지 않다 — no-sync 포크의 체리픽 표는 쓰인 적이 없다', () => {
    const [a, b] = TREES.map((t) => src(`${t}/features/ground-fog.ts`));
    expect(a).toBe(b);
  });

  for (const t of TREES) {
    it(`${t}: FEATURES 배열에 groundFogFeature 가 등록돼 있다`, () => {
      const s = src(`${t}/features/index.ts`);
      expect(s).toMatch(/import \{ groundFogFeature \} from '\.\/ground-fog\.js'/);
      expect(s).toMatch(/^\s*groundFogFeature,/m);
    });

    it(`${t}: feature 가 공용 빌더를 쓰고 scene.fogNode 에 단다`, () => {
      const s = src(`${t}/features/ground-fog.ts`);
      expect(s).toContain("from '../../world-shared/ground-fog.js'");
      expect(s).toMatch(/scene\.fogNode = buildGroundFogNode\(/);
      // 노브 이름 셋 — 개발일지 노브 목록과 링크가 이것을 가리킨다
      for (const k of ['fogh', 'fogk', 'fogs']) expect(s).toContain(`'${k}'`);
      // 세기 0·WebGL·안개 없음 → null
      expect(s).toMatch(/if \(!groundFogEnabled\(p\)\) return null/);
      expect(s).toMatch(/backend !== 'WebGPU'\) return null/);
    });

    it(`${t}: main.ts 는 fogNode 를 모른다 — 집행은 feature 한 곳`, () => {
      expect(src(`${t}/main.ts`)).not.toContain('fogNode');
    });
  }

  it('world-shared 빌더는 three 를 import 하지 않는다 — 주입만 받는다(R3 와 스텁 테스트의 전제)', () => {
    const s = src('frontend/js/world-shared/ground-fog.ts');
    expect(s).not.toMatch(/^import /m);
  });
});
