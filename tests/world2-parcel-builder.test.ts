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
  it('세 tier 가 같은 슬롯 수를 쓴다 — 소멸 사건 제거 규약 (2026-08-10)', () => {
    // ⚠ 원래 두 검사였다 — *"near>mid>far 로 슬롯을 많이 쓴다"* 와 *"far 에는
    // 가까이서만 보이는 것들이 없다"*. 그 규약 아래서 lamp·tree 가 "안개보다 앞에서
    // 툭 사라진다" 로 하나씩 far 로 올라갔고(감독: *"이동시 멀리있는게 사라졌다가
    // 멈추면 나타나"*), 마지막 남은 planter·bench·fountain 까지 같은 이유로 올라간
    // 것이 깜빡임 처방 (a′)다(근거는 `parts/planter.ts` 의 tiers 주석 한 곳).
    // 같은 결함이 파츠를 바꿔가며 다섯 번 재발한 것 — 규약 자체를 뒤집는 게 맞다:
    // 이제 tier 는 슬롯 구성을 바꾸지 않는다.
    const n = mk(), m = mk(), f = mk();
    n.builder.build(7, 7, 'near');
    m.builder.build(7, 7, 'mid');
    f.builder.build(7, 7, 'far');
    expect(n.liveCount()).toBeGreaterThan(0);
    expect(n.liveCount()).toBe(m.liveCount());
    expect(m.liveCount()).toBe(f.liveCount());
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

  it('far→near 승격이 슬롯을 하나도 안 만들고 안 지운다 — 전환은 화면상 no-op (2026-08-10)', () => {
    // 이 검사는 원래 *"승격이 실제로 부품을 채운다"* 였고, 검사 대상이 나무→가로등→
    // 화분으로 **세 번** 옮겨 다녔다 — 전부 "안개보다 앞에서 사라진다" 는 같은 이유로
    // tier 가 올라갔기 때문이다. 마지막 화분까지 올라간 것이 깜빡임 처방 (a′)이고
    // (근거는 `parts/planter.ts` 의 tiers 주석 한 곳), 옛 주석이 예언한 대로 방식을
    // 바꾼다: 이제 규약은 반대다 — **어느 전환도 슬롯을 만들거나 지우면 안 된다.**
    // 예전 버그(retier 가 h.tier 를 늦게 갱신해 fill 이 옛 배치를 봄)는 tier 별 종류가
    // 다시 갈리는 날에만 표면이 생긴다 — 그날은 `kindsFor` 집합 동일 검사
    // (`world2-band-scale.test.ts`)가 먼저 빨간불이 된다.
    const { builder, liveCount } = mk();
    const h = builder.build(8, 8, 'far');
    const before = liveCount();
    expect(before).toBeGreaterThan(0);
    builder.retier!(h, 'near');
    expect(liveCount()).toBe(before);
    builder.retier!(h, 'mid');
    expect(liveCount()).toBe(before);
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
    // ⚠ 원래 *"planter(near) < bench(mid) < building(far)"* 계단 검사였고, 파츠들이
    // "안개보다 앞에서 사라진다" 는 같은 이유로 하나씩 far 로 올라갈 때마다 검사
    // 대상을 옮겨 왔다. 2026-08-10 깜빡임 처방 (a′)로 **전 종류가 far** 가 되면서
    // 계단 자체가 사라졌다 — 이제 규약은 "모든 종류가 가장 넓은 반경(=building)과
    // 같은 파셀 수를 잡는다" 다. 근거는 `parts/planter.ts` 의 tiers 주석 한 곳.
    expect(parcelsFor('planter')).toBe(parcelsFor('building'));
    expect(parcelsFor('bench')).toBe(parcelsFor('building'));
    expect(parcelsFor('tree')).toBe(parcelsFor('building'));
    expect(parcelsFor('lamp')).toBe(parcelsFor('building'));
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
    // ⚠ 여기 *"near 전용 파츠(planter)는 안 늘어야 한다"* 는 단언이 있었고, 2026-08-10
    // 깜빡임 처방 (a′)로 **near 전용 종류 자체가 없어졌다**(전 계층 연장 — 근거는
    // `parts/planter.ts` 의 tiers 주석 한 곳). 새 규약에서는 far 밴드 확장이 **모든**
    // 종류의 예산을 늘려야 한다 — 하나라도 안 늘면 그 종류가 몰래 tier 를 도로
    // 좁혔다는 신호다(그 순간 깜빡임이 되살아난다).
    for (const k of Object.keys(base) as (keyof typeof base)[]) {
      if (base[k] === 0) continue; // 어느 tier 에도 없는 종류는 0 유지
      expect(wide[k]).toBeGreaterThan(base[k]);
    }
  });

  it('headroom 배수가 실제로 곱해진다', () => {
    const base = PooledParcelBuilder.poolBudget();
    const padded = PooledParcelBuilder.poolBudget({ headroom: 1.5 });
    expect(padded.building).toBe(Math.ceil(base.building * 1.5));
  });
});

describe('costOf — 상대 비중', () => {
  it('세 tier 의 비용이 같다 — 종류 집합이 같아졌으므로 (2026-08-10 처방 (a′))', () => {
    // 원래 *"near 가 far 보다 비싸다"* 였다. 종류 집합이 tier 무관 동일이 된 지금은
    // 같아야 맞다 — 달라지면 kindsFor 가 갈라졌다는 신호다.
    const { builder } = mk();
    expect(builder.costOf('near')).toBe(builder.costOf('far'));
  });

  it('종류 수에 비례한다', () => {
    const { builder } = mk();
    const ratio = builder.costOf('near') / builder.costOf('far');
    expect(ratio).toBeCloseTo(kindsFor('near').length / kindsFor('far').length);
  });
});
