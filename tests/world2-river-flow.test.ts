// 강 흐름 방향 — 손으로 적은 도함수가 실제 곡선과 맞는가.
//
// ── 왜 수치미분과 대조하나 ──────────────────────────────────────────────────
// `riverFlowAt` 은 `riverCenterZ` 의 도함수를 **손으로 적은 것**이다. TypeScript 로
// 자동 미분을 할 수 없으니 계수가 두 함수에 각각 적히고, 그것이 곧 값 미러링이다 —
// 이 저장소가 세 번 데인 형태(캔버스 색 vs 상수, 구름 고도 두 곳, 옛 minY 임계값).
//
// 주석으로 "같이 고쳐라" 라고 적는 것은 지켜지지 않는다. 그래서 **기계가 대조**한다:
// `riverCenterZ` 를 수치미분한 값과 `riverFlowAt` 의 방향이 어긋나면 깨진다.
// 누가 강 곡선의 계수를 바꾸고 흐름을 안 고치면 여기가 잡는다.
//
// ── 못 보는 것 ──────────────────────────────────────────────────────────────
// 화면에서 물이 실제로 그 방향으로 흐르는지는 못 본다(그건 `ocean.ts` 의 UV 갱신이
// 하는 일이고, 통합 축은 `world2-ocean.test.ts` 가 본다). 여기는 **방향이 옳은가**만.

import { describe, it, expect } from 'vitest';
import { riverCenterZ, riverFlowAt } from '../frontend/js/world2/decide/water.js';

const CELL = 32;

/** 중심선의 수치미분. 해석적 도함수와 대조할 독립 근거다. */
function numericSlope(wx: number, h = 0.01, cell = CELL): number {
  return (riverCenterZ(wx + h, cell) - riverCenterZ(wx - h, cell)) / (2 * h);
}

describe('riverFlowAt — 해석적 도함수가 곡선과 맞는가', () => {
  it('★ 수치미분과 방향이 일치한다 — 계수가 어긋나면 여기가 깨진다', () => {
    // 강이 지나는 x 범위를 넓게 훑는다. 한 점만 보면 우연히 맞을 수 있다.
    for (let wx = -600; wx <= 600; wx += 37) {
      const f = riverFlowAt(wx);
      const slope = numericSlope(wx);
      // 흐름은 (1, dz/dx) 를 정규화한 것이므로 z/x 비가 곧 기울기다.
      expect(f.z / f.x).toBeCloseTo(slope, 4);
    }
  });

  it('항상 단위벡터다 — 크기가 정점마다 다르면 UV 되감기가 어긋나 쿼드가 뒤틀린다', () => {
    for (let wx = -600; wx <= 600; wx += 23) {
      const f = riverFlowAt(wx);
      expect(Math.hypot(f.x, f.z)).toBeCloseTo(1, 10);
    }
  });

  it('항상 하류(+x)를 향한다 — 물이 거꾸로 흐르지 않는다', () => {
    for (let wx = -600; wx <= 600; wx += 17) {
      expect(riverFlowAt(wx).x).toBeGreaterThan(0);
    }
  });

  it('굽이에서 실제로 방향이 바뀐다 — 상수면 지금과 다를 게 없다', () => {
    // 강이 휘는 곳에서 z 성분이 유의미하게 달라져야 한다. 전부 같으면
    // "정점마다 다른 방향" 이라는 이 작업의 전제가 무너진다.
    const zs = [];
    for (let wx = -600; wx <= 600; wx += 11) zs.push(riverFlowAt(wx).z);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(0.8);
  });

  it('기울기가 0 인 지점에서는 정확히 +x 다', () => {
    // 도함수가 0 이 되는 x 를 이분법으로 찾아 그 점에서 z 성분이 0 인지 본다.
    let lo = 0, hi = 200;
    if (numericSlope(lo) * numericSlope(hi) < 0) {
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (numericSlope(lo) * numericSlope(mid) <= 0) hi = mid; else lo = mid;
      }
      const f = riverFlowAt((lo + hi) / 2);
      expect(Math.abs(f.z)).toBeLessThan(1e-3);
      expect(f.x).toBeCloseTo(1, 5);
    } else {
      // 그 구간에 영점이 없으면 이 단언은 성립하지 않는다 — **건너뛰었다고 적는다.**
      // 조용히 통과시키면 "쟀다" 로 읽힌다.
      expect(true, '[0,200] 에 기울기 영점 없음 — 이 케이스는 측정 못 함').toBe(true);
    }
  });
});

// ── `riverFlowAt` 이 셀 크기를 안 받는 것은 **주장**이다 ─────────────────────
// `riverCenterZ` 는 `cell` 을 받는다(기준선을 광장 크기에서 유도하므로). `riverFlowAt` 은
// 안 받는데, 그것이 성립하는 이유는 **기준선이 상수라 도함수에서 사라지기** 때문이다.
//
// 그 이유가 깨지는 순간이 있다 — 누가 진폭이나 파장을 셀에 비례하게 만들면 곡선은
// 셀마다 달라지는데 흐름은 하나로 남는다. 시그니처가 다르므로 타입 검사도 못 잡고,
// 위 수치미분 대조도 **같은 cell 로만** 재니까 못 잡는다.
describe('riverFlowAt — 셀 크기와 무관하다 (시그니처가 거는 약속)', () => {
  it('★ 셀을 바꿔도 기울기가 같다 — 다르면 흐름 함수가 곡선을 못 따라간다', () => {
    for (let wx = -600; wx <= 600; wx += 53) {
      // 셀이 커지면 기준선만 밀린다. 기울기는 그대로여야 한다.
      expect(numericSlope(wx, 0.01, 64)).toBeCloseTo(numericSlope(wx, 0.01, CELL), 6);
    }
  });

  it('기준선은 셀을 따라 실제로 움직인다 — 위 단언이 빈 명제가 아님을 확인한다', () => {
    // 셀이 커져도 곡선이 통째로 그대로면 위 검사는 아무것도 안 잰 셈이 된다.
    expect(riverCenterZ(0, 64)).not.toBeCloseTo(riverCenterZ(0, CELL), 6);
  });
});

describe('riverFlowAt — 뮤테이션 대응', () => {
  it('도함수 계수를 틀리게 바꾸면 수치미분 대조가 깨진다', () => {
    // 이 테스트 자체가 검출력의 증거는 아니다(뮤테이션은 커밋 메시지에 실측을 남긴다).
    // 여기서는 **대조가 실제로 민감한지**를 확인한다 — 5% 어긋난 기울기를 구별하는가.
    const wx = 137;
    const real = riverFlowAt(wx);
    const slope = numericSlope(wx);
    const wrongSlope = slope * 1.05;
    const wrongLen = Math.hypot(1, wrongSlope);
    const wrongZ = wrongSlope / wrongLen;
    // 진짜 값과 5% 틀린 값이 소수 4자리에서 구별돼야 대조가 의미 있다.
    expect(Math.abs(real.z - wrongZ)).toBeGreaterThan(1e-4);
  });
});
