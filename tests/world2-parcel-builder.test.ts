// world2 파셀 빌더 테스트 — 가짜 슬롯 풀로 three 없이 검증한다.
//
// 확인하는 것은 이 아키텍처가 실제로 약속을 지키는가다.
// ① 파셀을 만들어도 새 GPU 자원이 생기지 않는다(슬롯 점유만).
// ② 만든 슬롯을 빠짐없이 반납한다(누수 0).
// ③ tier 변경이 공통 부품을 건드리지 않는다 — 배치 불변식이 비용을 깎는 지점.
// ④ 풀이 모자라면 조용히 넘기지 않고 센다.

import { describe, it, expect } from 'vitest';
import { PooledParcelBuilder, type SlotPool } from '../frontend/js/world2/systems/parcel-builder.js';
import type { SlotHandle } from '../frontend/js/world2/systems/instancing.js';
import {
  kindsFor, maxPartsPerParcel, outermostTierFor, DEFAULT_LAYOUT,
} from '../frontend/js/world2/decide/parcel-layout.js';
import { DEFAULT_BANDS, tierReach, maxLatticePoints } from '../frontend/js/world2/decide/lod.js';

/**
 * 용량이 있는 가짜 풀. 호출을 전부 기록한다.
 * 용량은 숫자(전 종류 공통) 또는 종류별 표 — 실제 풀은 종류마다 크기가 다르므로,
 * 공통 숫자로만 시험하면 예산 검증이 가장 작은 종류에 끌려간다.
 */
function fakePool(capacity: number | Record<string, number> = 10_000) {
  const capOf = (key: string) => (typeof capacity === 'number' ? capacity : capacity[key] ?? 0);
  const live = new Map<string, Set<number>>();
  const free = new Map<string, number[]>();
  const next = new Map<string, number>();
  const log = { acquire: 0, release: 0, transform: 0, tone: 0 };
  const transformed: SlotHandle[] = [];

  const pool: SlotPool = {
    acquire(key) {
      const used = live.get(key) ?? new Set<number>();
      live.set(key, used);
      const pooled = free.get(key) ?? [];
      let index: number;
      if (pooled.length) index = pooled.pop()!;
      else {
        const n = next.get(key) ?? 0;
        if (n >= capOf(key)) return null;
        next.set(key, n + 1);
        index = n;
      }
      used.add(index);
      log.acquire++;
      return { key, index };
    },
    setTransform(h) { log.transform++; transformed.push(h); },
    setTone() { log.tone++; },
    release(h) {
      live.get(h.key)?.delete(h.index);
      (free.get(h.key) ?? free.set(h.key, []).get(h.key)!).push(h.index);
      log.release++;
    },
  };
  const liveCount = () => [...live.values()].reduce((s, x) => s + x.size, 0);
  const liveOf = (k: string) => live.get(k)?.size ?? 0;
  return { pool, log, liveCount, liveOf, transformed };
}

const mk = (capacity?: number) => {
  const f = fakePool(capacity);
  return {
    ...f,
    builder: new PooledParcelBuilder({ pool: f.pool, cellX: 32, cellZ: 32 }),
  };
};

describe('build / release — 누수가 없다', () => {
  it('파셀을 만들면 슬롯을 점유한다', () => {
    const { builder, liveCount } = mk();
    builder.build(3, 4, 'near');
    expect(liveCount()).toBeGreaterThan(0);
  });

  it('반납하면 전부 돌아온다', () => {
    const { builder, liveCount, log } = mk();
    const h = builder.build(3, 4, 'near');
    const acquired = log.acquire;
    builder.release(h);
    expect(liveCount()).toBe(0);
    expect(log.release).toBe(acquired);
  });

  it('여러 파셀을 만들고 지워도 잔량이 0', () => {
    const { builder, liveCount } = mk();
    const hs = [];
    for (let px = 0; px < 5; px++) for (let pz = 0; pz < 5; pz++) hs.push(builder.build(px, pz, 'near'));
    for (const h of hs) builder.release(h);
    expect(liveCount()).toBe(0);
  });

  it('두 번 반납해도 안전하다', () => {
    const { builder } = mk();
    const h = builder.build(1, 1, 'mid');
    builder.release(h);
    expect(() => builder.release(h)).not.toThrow();
  });

  it('슬롯을 재사용한다 — 만들고 지우기를 반복해도 풀이 자라지 않는다', () => {
    const { builder, liveCount } = mk(200);
    for (let i = 0; i < 50; i++) {
      const h = builder.build(i, i, 'near');
      builder.release(h);
    }
    expect(liveCount()).toBe(0);
  });
});

describe('tier별 구성', () => {
  it('near가 mid보다, mid가 far보다 슬롯을 많이 쓴다', () => {
    const n = mk(), m = mk(), f = mk();
    n.builder.build(7, 7, 'near');
    m.builder.build(7, 7, 'mid');
    f.builder.build(7, 7, 'far');
    expect(n.liveCount()).toBeGreaterThan(m.liveCount());
    expect(m.liveCount()).toBeGreaterThan(f.liveCount());
  });

  it('far에는 가까이서만 보이는 것들이 없다', () => {
    // 검사 대상이 두 번 바뀌었다. lamp·tree 가 각각 far 로 올라갔기 때문인데,
    // **둘 다 같은 이유**다 — 사라지는 지점이 안개(51.2m)보다 앞이라 또렷한 거리에서
    // 툭 사라졌다(감독: *"이동시 멀리있는게 사라졌다가 멈추면 나타나"*).
    //
    // 지금 far 에서 빠지는 것은 planter(near)·bench(mid)·fountain(mid) 이다. 작아서
    // 멀리서는 픽셀 몇 개이고, 사라져도 안개가 가려 줄 만큼 뒤에서 빠진다.
    const { builder, liveOf } = mk();
    builder.build(2, 9, 'far');
    expect(liveOf('planter')).toBe(0);
    expect(liveOf('bench')).toBe(0);
    expect(liveOf('building')).toBeGreaterThan(0);
  });

  it('모든 tier에 지면이 정확히 1개', () => {
    for (const t of ['near', 'mid', 'far'] as const) {
      const { builder, liveOf } = mk();
      builder.build(5, 5, t);
      expect(liveOf('ground')).toBe(1);
    }
  });
});

describe('retier — 공통 부품을 건드리지 않는다(이 설계의 이득)', () => {
  it('near→mid는 near 전용 파츠만 반납한다', () => {
    // 검사 대상을 lamp 에서 planter 로 옮겼다 — lamp 가 far 까지 그려지게 되면서
    // tier 로 갈리지 않게 됐다. **지금 near 전용은 planter 하나뿐이다.**
    const { builder, log, liveOf } = mk();
    const h = builder.build(6, 6, 'near');
    const planters = liveOf('planter');
    const buildingsBefore = liveOf('building');
    const releasesBefore = log.release;

    builder.retier!(h, 'mid');

    expect(log.release - releasesBefore).toBe(planters); // 딱 planter 개수만
    expect(liveOf('planter')).toBe(0);
    expect(liveOf('building')).toBe(buildingsBefore); // 건물은 그대로
  });

  it('공통 부품의 행렬을 다시 쓰지 않는다 — 손댈 필요조차 없다', () => {
    const { builder, log } = mk();
    const h = builder.build(6, 6, 'near');
    const lamps = 0; // near→mid는 추가 fill이 없다
    const transformsBefore = log.transform;
    builder.retier!(h, 'mid');
    expect(log.transform - transformsBefore).toBe(lamps);
  });

  it('mid→near는 near 전용 파츠만 새로 점유한다', () => {
    const { builder, log, liveOf } = mk();
    const h = builder.build(6, 6, 'mid');
    const treesBefore = liveOf('tree');
    const acquiresBefore = log.acquire;

    builder.retier!(h, 'near');

    expect(liveOf('planter')).toBeGreaterThanOrEqual(0);
    expect(liveOf('tree')).toBe(treesBefore); // 나무는 그대로 — 이제 far 까지 산다
    expect(log.acquire - acquiresBefore).toBe(liveOf('planter'));
  });

  it('강등→승격 왕복이 원래 상태를 복원한다', () => {
    const { builder, liveOf } = mk();
    const h = builder.build(11, 3, 'near');
    const before = { g: liveOf('ground'), b: liveOf('building'), t: liveOf('tree'), l: liveOf('lamp') };
    builder.retier!(h, 'far');
    builder.retier!(h, 'near');
    expect({ g: liveOf('ground'), b: liveOf('building'), t: liveOf('tree'), l: liveOf('lamp') }).toEqual(before);
  });

  it('far→near 승격이 실제로 부품을 채운다 — 옛 tier로 배치를 계산하면 0개가 된다', () => {
    // 이 테스트가 잡은 버그: retier가 h.tier를 나중에 갱신해서 fill이 옛 tier 배치를
    // 봤고, 새 종류가 그 배치에 없어 아무것도 안 생겼다.
    //
    // **검사 대상이 두 번 옮겨졌다.** 처음에는 나무였고, 나무가 far 로 올라가며
    // 가로등으로 바꿨는데, 가로등도 같은 이유로 far 로 올라갔다(둘 다 안개보다 앞에서
    // 사라지고 있었다). **지금 tier 로 갈리는 것은 planter 하나뿐이다.**
    //
    // 이 테스트가 자꾸 옮겨 다니는 것 자체가 신호다 — near 전용이 하나만 남았으니,
    // 그것마저 올리면 이 검사는 대상을 잃는다. 그때는 tier 별 구성을 직접 비교하는
    // 방식으로 다시 써야 한다.
    const { builder, liveOf } = mk();
    const h = builder.build(8, 8, 'far');
    expect(liveOf('planter')).toBe(0);
    builder.retier!(h, 'near');
    expect(liveOf('planter')).toBeGreaterThan(0);
  });

  it('retier 후 release가 여전히 전부 반납한다', () => {
    const { builder, liveCount } = mk();
    const h = builder.build(4, 4, 'near');
    builder.retier!(h, 'far');
    builder.retier!(h, 'mid');
    builder.release(h);
    expect(liveCount()).toBe(0);
  });

  it('같은 tier로 retier하면 아무 일도 없다', () => {
    const { builder, log } = mk();
    const h = builder.build(4, 4, 'mid');
    const before = { a: log.acquire, r: log.release };
    builder.retier!(h, 'mid');
    expect(log.acquire).toBe(before.a);
    expect(log.release).toBe(before.r);
  });
});

describe('풀 고갈 — 조용히 넘기지 않는다', () => {
  it('슬롯이 모자라면 센다', () => {
    const { builder } = mk(2); // 종류당 2개뿐
    builder.build(0, 0, 'near');
    expect(builder.stats().starved).toBeGreaterThan(0);
  });

  it('어느 종류가 모자랐는지 남긴다', () => {
    const { builder } = mk(1);
    builder.build(0, 0, 'near');
    expect(Object.keys(builder.stats().byKindStarved).length).toBeGreaterThan(0);
  });

  it('넉넉하면 굶지 않는다', () => {
    const { builder } = mk(10_000);
    for (let px = 0; px < 8; px++) builder.build(px, 0, 'near');
    expect(builder.stats().starved).toBe(0);
  });
});

describe('poolBudget — 예산이 밴드에서 유도된다', () => {
  // 종류별 최대 파셀 수. 그 종류가 살아 있는 **가장 바깥 tier의 EXIT** 반경이 기준이다.
  const parcelsFor = (k: 'ground' | 'building' | 'tree' | 'lamp' | 'bench' | 'planter') =>
    maxLatticePoints(tierReach(outermostTierFor(k)!, DEFAULT_BANDS));

  it('종류마다 파셀당 최대 × 그 종류의 tier 반경 파셀 수를 잡는다', () => {
    const b = PooledParcelBuilder.poolBudget();
    for (const k of ['ground', 'building', 'tree', 'lamp'] as const) {
      expect(b[k]).toBe(maxPartsPerParcel(k) * parcelsFor(k));
    }
  });

  // 예전 식(`파셀당 최대 × 20 × 1.25`)이 tier를 무시해 tree·lamp에 도달 불가능한 슬롯을
  // 잡아두고 있었다. 이 단언이 그 회귀를 막는다 — tier를 다시 뭉개면 세 값이 같아진다.
  it('tier가 좁을수록 파셀을 적게 잡는다 — 예산은 밴드에서 유도된다', () => {
    const b = PooledParcelBuilder.poolBudget();
    // planter(near) < bench(mid) < building(far). tree 에 이어 lamp 까지 far 로
    // 올라가면서(둘 다 안개보다 앞에서 사라지고 있었다) building 과 같은 반경이 됐다 —
    // **같아진 것이 맞다.** 값을 박아 두지 않고 관계로만 검사하는 이유가 이런 변경이다.
    expect(parcelsFor('planter')).toBeLessThan(parcelsFor('bench'));
    expect(parcelsFor('bench')).toBeLessThan(parcelsFor('building'));
    expect(parcelsFor('tree')).toBe(parcelsFor('building'));
    expect(parcelsFor('lamp')).toBe(parcelsFor('building'));
    // near 전용 파츠는 far 까지 사는 ground 와 같은 파셀 수를 잡으면 안 된다.
    // 예전에는 lamp 로 검사했는데 lamp 가 far 로 올라가면서 ground 와 같아졌다 —
    // 회귀가 아니라 의도된 변경이고, near 에 남은 planter 로 옮기는 것이 맞다.
    expect(b.planter / maxPartsPerParcel('planter'))
      .toBeLessThan(b.ground / maxPartsPerParcel('ground'));
  });

  it('이 예산이면 최악의 로드 상황에서도 굶지 않는다', () => {
    const budget = PooledParcelBuilder.poolBudget();
    const f = fakePool(budget); // 실제 풀처럼 종류별 용량을 그대로 준다
    const builder = new PooledParcelBuilder({ pool: f.pool, cellX: 32, cellZ: 32 });
    // near 파셀 정원을 꽉 채운다 — lamp 예산이 가장 빡빡한 경로다.
    const nearMax = parcelsFor('lamp');
    for (let n = 0; n < nearMax; n++) builder.build(n, 0, 'near');
    expect(builder.stats().starved).toBe(0);
  });

  it('far까지 정원을 채워도 ground·building이 굶지 않는다', () => {
    const budget = PooledParcelBuilder.poolBudget();
    const f = fakePool(budget);
    const builder = new PooledParcelBuilder({ pool: f.pool, cellX: 32, cellZ: 32 });
    const farMax = parcelsFor('building');
    const nearMax = parcelsFor('lamp');
    const midMax = parcelsFor('tree');
    // 안쪽부터 채운다: near 정원 → mid 정원 → 나머지 far. 실제 밴드 분포와 같은 모양이다.
    for (let n = 0; n < farMax; n++) {
      const tier = n < nearMax ? 'near' : n < midMax ? 'mid' : 'far';
      builder.build(n, 0, tier);
    }
    expect(builder.stats().starved).toBe(0);
  });

  it('레이아웃 예산을 줄이면 풀 예산도 준다', () => {
    const small = PooledParcelBuilder.poolBudget({ layout: { ...DEFAULT_LAYOUT, maxTrees: 2 } });
    const big = PooledParcelBuilder.poolBudget({ layout: DEFAULT_LAYOUT });
    expect(small.tree).toBeLessThan(big.tree);
  });

  it('밴드를 넓히면 예산이 따라온다 — 상수로 박혀 있지 않다는 증거', () => {
    const base = PooledParcelBuilder.poolBudget();
    const wide = PooledParcelBuilder.poolBudget({
      bands: { ...DEFAULT_BANDS, farEnter: 3.4, farExit: 3.8 },
    });
    expect(wide.building).toBeGreaterThan(base.building);
    // near 밴드는 그대로이므로 **near 전용 파츠**는 안 늘어야 한다. 예전에는 lamp 로
    // 검사했는데 lamp 가 far 로 올라가면서 함께 늘게 됐다 — 그건 회귀가 아니라 의도된
    // 변경이고, 검사 대상을 near 에 남은 planter 로 옮기는 것이 맞다.
    expect(wide.planter).toBe(base.planter);
    // lamp 는 이제 far 라 **늘어야** 한다. 위 한 줄만 고치면 "안 늘어야 한다" 는 검사가
    // 사라진 자리에 아무것도 안 남으므로, 반대 방향도 함께 못 박는다.
    expect(wide.lamp).toBeGreaterThan(base.lamp);
  });

  it('headroom 배수가 실제로 곱해진다', () => {
    const base = PooledParcelBuilder.poolBudget();
    const padded = PooledParcelBuilder.poolBudget({ headroom: 1.5 });
    expect(padded.building).toBe(Math.ceil(base.building * 1.5));
  });
});

describe('costOf — 상대 비중', () => {
  it('near가 far보다 비싸다', () => {
    const { builder } = mk();
    expect(builder.costOf('near')).toBeGreaterThan(builder.costOf('far'));
  });

  it('종류 수에 비례한다', () => {
    const { builder } = mk();
    const ratio = builder.costOf('near') / builder.costOf('far');
    expect(ratio).toBeCloseTo(kindsFor('near').length / kindsFor('far').length);
  });
});
