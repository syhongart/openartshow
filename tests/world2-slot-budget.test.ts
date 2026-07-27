// world2 슬롯 예산 통합 테스트 — 판정과 집행이 경계를 건너는 지점을 실제로 돌린다.
//
// ── 왜 별 파일인가 ────────────────────────────────────────────────────────────
// `poolBudget`은 순수 함수라 표로 시험하기 쉽고, `PooledParcelBuilder`도 가짜 풀로
// 시험하기 쉽다. 그런데 **"산정한 예산이 실제 스트리밍에서 정말 안 넘치는가"** 는 양쪽
// 테스트 어디에도 안 걸린다. 판정은 자기가 낸 숫자만 보고, 집행은 주어진 용량만 본다.
//
// 이 사각이 이미 한 번 대가를 치렀다. `MAX_PARCELS = 20`이 이론 최악치(21)보다 작았는데
// 예산에 곱해둔 여유 배수 1.25가 그 부족을 덮어 `starved`가 계속 0으로 나왔다 — 지표가
// 정상이라고 두 값 다 맞는 게 아니었다. 여기서는 **실제 판정 계층으로 이동시키면서**
// 슬롯 점유를 매 프레임 감시한다.
//
// 여유 배수를 1.0으로 없앴으므로 이 파일이 그 결정의 유일한 자동 근거다.
//
// ── 이 파일이 못 잡는 것 (뮤테이션으로 확인했다) ─────────────────────────────
// `poolBudget`의 headroom을 0.85로 낮추면 3건이 깨진다 — 예산 부족은 잡는다.
// 그런데 `diffParcels`의 **강등 우선 정렬을 제거해도 아무것도 깨지지 않는다.** 별도 탐색
// (속도 5종 × 프레임시간 4종 × 1,500프레임 = 30,000샘플, 방향 회전 포함)에서도 초과가
// 0건이었다. 그러니 그 정렬은 보험이지 이 테스트가 지키는 성질이 아니다 — "테스트가
// 통과했으니 정렬이 검증됐다"고 읽으면 안 된다.

import { describe, it, expect } from 'vitest';
import { PooledParcelBuilder, type SlotPool } from '../web/js/world2/systems/parcel-builder.js';
import { StreamingSystem } from '../web/js/world2/systems/streaming.js';
import type { SlotHandle } from '../web/js/world2/systems/instancing.js';
import type { FrameCtx } from '../web/js/world2/kernel.js';
import { DEFAULT_LAYOUT, type PartKind } from '../web/js/world2/decide/parcel-layout.js';

const KINDS: readonly PartKind[] = ['ground', 'building', 'tree', 'lamp'];
const CELL = 32;

/**
 * 용량이 고정된 가짜 풀. 실제 `InstancePools`와 같은 규약으로 점유/반납을 센다.
 * `peakUsed`를 남겨 "어느 순간에도 넘지 않았는가"를 사후가 아니라 **최댓값**으로 본다.
 */
function budgetedPool(budget: Record<PartKind, number>) {
  const used = new Map<string, number>();
  const peak = new Map<string, number>();
  let starvedAcquires = 0;
  let seq = 0;

  const pool: SlotPool = {
    acquire(key) {
      const u = used.get(key) ?? 0;
      if (u >= (budget[key as PartKind] ?? 0)) { starvedAcquires++; return null; }
      used.set(key, u + 1);
      peak.set(key, Math.max(peak.get(key) ?? 0, u + 1));
      return { key, index: seq++ } as unknown as SlotHandle;
    },
    setTransform() { /* 예산만 보므로 행렬은 관심 밖 */ },
    setTone() { /* 위와 같음 */ },
    release(h) {
      const k = (h as unknown as { key: string }).key;
      used.set(k, Math.max(0, (used.get(k) ?? 0) - 1));
    },
  };

  return {
    pool,
    usedOf: (k: PartKind) => used.get(k) ?? 0,
    peakOf: (k: PartKind) => peak.get(k) ?? 0,
    get starvedAcquires() { return starvedAcquires; },
  };
}

const ctx = (frame: number, dt = 0.0001): FrameCtx => ({
  dt, ageMs: frame * 16, frame, hidden: false,
});

function harness(layout = DEFAULT_LAYOUT) {
  const budget = PooledParcelBuilder.poolBudget({ layout });
  const p = budgetedPool(budget);
  const builder = new PooledParcelBuilder({
    pool: p.pool, cellX: CELL, cellZ: CELL, layout,
  });
  const pos = { x: 0, z: 0 };
  const dir = { x: 0, z: 0 };
  const sys = new StreamingSystem({
    builder, cellX: CELL, cellZ: CELL,
    getPosition: () => pos, getDirection: () => dir,
  });

  let frame = 0;
  const violations: string[] = [];

  /** 한 프레임 돌리고 **그 즉시** 불변식을 검사한다. 사후 검사로는 순간 초과를 놓친다. */
  const step = (dt = 0.0001) => {
    sys.update(ctx(++frame, dt));
    for (const k of KINDS) {
      if (p.usedOf(k) > budget[k]) {
        violations.push(`frame ${frame}: ${k} ${p.usedOf(k)} > 예산 ${budget[k]}`);
      }
    }
    // ground는 파셀당 정확히 1개이고 모든 tier가 그린다 — 두 값은 항상 같아야 한다.
    if (p.usedOf('ground') !== sys.stats().loaded) {
      violations.push(
        `frame ${frame}: ground ${p.usedOf('ground')} ≠ loaded ${sys.stats().loaded}`,
      );
    }
  };

  /** 목표 지점까지 실제 속도로 걸어간다(순간이동이 아니다) — tier 전이를 밟게 하려는 것 */
  const walkTo = (tx: number, tz: number, speedMps = 8) => {
    for (let i = 0; i < 4000; i++) {
      const dx = tx - pos.x;
      const dz = tz - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.01) break;
      const stepLen = Math.min(d, speedMps / 60);
      dir.x = dx / d; dir.z = dz / d;
      pos.x += dir.x * stepLen;
      pos.z += dir.z * stepLen;
      step(1 / 60);
    }
    dir.x = 0; dir.z = 0;
  };

  const settle = (n = 60) => { for (let i = 0; i < n; i++) step(); };

  return { sys, builder, budget, pool: p, pos, dir, step, walkTo, settle, violations };
}

describe('슬롯 예산 — 여유 배수 1.0이 실제로 버티는가', () => {
  it('부팅 충전에서 어느 종류도 예산을 넘지 않는다', () => {
    const h = harness();
    h.settle();
    expect(h.violations).toEqual([]);
    expect(h.builder.stats().starved).toBe(0);
    expect(h.pool.starvedAcquires).toBe(0);
  });

  // 이 테스트가 이 파일의 핵심이다. 직선 이동만 재면 tier 전이가 한 방향으로만 일어나
  // "승격과 강등이 같은 프레임에 겹치는" 상황을 한 번도 밟지 않는다 — 여유 배수를 없앨 때
  // 유일하게 걱정한 경로가 정확히 그것이었다.
  it('여러 방향으로 걸어다녀도 예산을 넘지 않는다', () => {
    const h = harness();
    h.settle();
    // 축 방향·대각·되돌아오기를 섞는다. 대각 이동은 한 프레임에 여러 파셀의 tier가
    // 동시에 바뀌므로 승격·강등이 겹친다.
    const route: Array<[number, number]> = [
      [CELL * 3, 0], [CELL * 3, CELL * 3], [0, CELL * 3], [0, 0],
      [CELL * 2, CELL * 2], [-CELL * 2, CELL * 2], [-CELL * 2, -CELL * 2], [0, 0],
      [CELL * 5, CELL * 1], [CELL * 1, CELL * 5], [0, 0],
    ];
    for (const [x, z] of route) h.walkTo(x, z);
    expect(h.violations).toEqual([]);
    expect(h.builder.stats().starved).toBe(0);
  });

  it('프레임 예산이 빠듯해도 넘지 않는다 — 작업이 잘려 다음 프레임으로 밀리는 경우', () => {
    const h = harness();
    h.settle();
    // dt를 목표(16.7ms)보다 크게 줘 `streamBudgetMs`가 최소치(0.5ms)만 내주게 한다.
    // 그러면 retier·load가 매 프레임 잘린다 — 강등이 밀릴 수 있는 유일한 조건이다.
    for (let i = 0; i < 600; i++) {
      h.pos.x += 0.6;
      h.dir.x = 1; h.dir.z = 0;
      h.step(0.05); // 20fps 상당
    }
    expect(h.violations).toEqual([]);
    expect(h.builder.stats().starved).toBe(0);
  });

  it('순간이동해도 넘지 않는다 — tier가 한 단계씩만 내려가는 성질의 최악 경로', () => {
    const h = harness();
    h.settle();
    // `tierFor`는 EXIT를 넘겨도 한 프레임에 한 단계만 강등한다. 멀리 튀면 순회 범위 안에
    // 남은 파셀들이 곧장 사라지지 않고 mid·far를 거친다 — 그동안 새 위치의 파셀도 올라온다.
    for (const [x, z] of [[CELL * 40, CELL * 40], [0, 0], [-CELL * 25, CELL * 13]] as const) {
      h.pos.x = x; h.pos.z = z;
      h.settle(30);
    }
    expect(h.violations).toEqual([]);
    expect(h.builder.stats().starved).toBe(0);
  });

  it('밀도 8에서도 같다 — 파셀당 파츠가 8배여도 예산은 파셀 수에서 나온다', () => {
    const h = harness({
      ...DEFAULT_LAYOUT,
      maxBuildings: DEFAULT_LAYOUT.maxBuildings * 8,
      maxTrees: DEFAULT_LAYOUT.maxTrees * 8,
      maxLamps: DEFAULT_LAYOUT.maxLamps * 8,
    });
    h.settle();
    for (const [x, z] of [[CELL * 3, CELL * 3], [-CELL * 3, 0], [0, 0]] as const) h.walkTo(x, z);
    expect(h.violations).toEqual([]);
    expect(h.builder.stats().starved).toBe(0);
  });

  it('예산에 실제로 근접한다 — 조인 것이 헛되지 않았다는 증거', () => {
    const h = harness();
    h.settle();
    for (const [x, z] of [[CELL * 3, CELL * 3], [0, 0], [CELL * 2, -CELL * 4]] as const) {
      h.walkTo(x, z);
    }
    // ground는 파셀당 1개라 사용률이 곧 파셀 충전율이다. 절반도 못 쓰면 예산이 여전히
    // 헐거운 것이므로 이 단언이 다음 번 조임의 트리거가 된다.
    expect(h.pool.peakOf('ground') / h.budget.ground).toBeGreaterThan(0.5);
  });

  // 주의: "원점으로 돌아오면 점유도 처음과 같다"는 **성립하지 않는다.** 첫 진입은 prev가
  // 없어 ENTER 기준으로 tier가 정해지지만, 돌아왔을 때는 EXIT 대역 파셀이 안쪽 tier를
  // 유지하고 있다. 히스테리시스가 있는 시스템의 정상 동작이라 그걸 누수로 읽으면 안 된다
  // (첫 작성에서 실제로 그렇게 단언했다가 13→15로 깨졌다). 누수는 **발산**으로 잰다.
  it('반납 누수가 없다 — 왕복을 반복해도 점유가 발산하지 않는다', () => {
    const h = harness();
    h.settle();
    const after: number[][] = [];
    for (let lap = 0; lap < 4; lap++) {
      h.walkTo(CELL * 4, CELL * 4);
      h.walkTo(0, 0);
      h.settle(60);
      after.push(KINDS.map((k) => h.pool.usedOf(k)));
    }
    // 2회차부터는 이력이 포화되므로 값이 같아야 한다. 계속 늘면 반납이 새는 것이다.
    expect(after[3]).toEqual(after[1]);
    expect(after[2]).toEqual(after[1]);
    expect(h.violations).toEqual([]);
  });

  it('dispose가 슬롯을 전부 반납한다', () => {
    const h = harness();
    h.settle();
    expect(h.pool.usedOf('ground')).toBeGreaterThan(0);
    h.sys.dispose();
    for (const k of KINDS) expect(h.pool.usedOf(k)).toBe(0);
  });
});
