// 도로 위상 테스트.
//
// 검사하는 것이 셋이다.
//
//  ① **이웃 조회 없이 길이 이어지는가.** 파셀은 서로를 모르고("파라미터가 곧 공간"),
//     이웃은 아직 로드 안 됐거나 이미 언로드됐을 수 있다. 그런데도 내 동쪽 끝에서 길이
//     나가면 옆 파셀 서쪽 끝에서 들어와야 한다. 어긋나면 세상이 끊긴 길 조각으로 덮인다.
//
//  ② **`onRoad` 가 실제로 깔린 조각을 덮는가.** 도로를 그리는 것(`road.place`)과 도로를
//     피하는 것(`onRoad`)은 **다른 함수**다. 어긋나면 건물이 길 위에 서거나, 반대로 멀쩡한
//     땅을 비워 도시가 휑해진다. 어느 쪽 단위 테스트로도 걸리지 않는 전형적인 경계다.
//
//  ③ **길의 성격.** 전부 통과로면 격자무늬가 된다 — 감독이 "바둑판 말고" 라고 한 그 모습.
//     막다른 길과 꺾인 길이 섞여야 도시로 읽힌다.

import { describe, it, expect } from 'vitest';
import {
  edgeX, edgeZ, roadDirs, onRoad, pickOffRoad, ROAD_SEG, ROAD_HALF, EDGE_P,
} from '../frontend/js/world2/parts/road-topology.js';
import { road } from '../frontend/js/world2/parts/road.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';

const HALF_X = DEFAULT_LAYOUT.cellX / 2 - DEFAULT_LAYOUT.margin;
const HALF_Z = DEFAULT_LAYOUT.cellZ / 2 - DEFAULT_LAYOUT.margin;

function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('① 이웃 조회 없이 길이 이어진다', () => {
  it('내 동쪽이 열리면 옆 파셀 서쪽도 열린다', () => {
    for (let px = -20; px <= 20; px++) {
      for (let pz = -20; pz <= 20; pz++) {
        const mine = roadDirs(px, pz).includes('east');
        const theirs = roadDirs(px + 1, pz).includes('west');
        expect(mine).toBe(theirs);
      }
    }
  });

  it('내 남쪽이 열리면 아래 파셀 북쪽도 열린다', () => {
    for (let px = -20; px <= 20; px++) {
      for (let pz = -20; pz <= 20; pz++) {
        expect(roadDirs(px, pz).includes('south')).toBe(roadDirs(px, pz + 1).includes('north'));
      }
    }
  });

  // 북쪽을 `edgeZ(px, pz)` 로 잘못 적으면 북과 남이 같은 값을 보게 되고, 길이 늘 남북으로
  // 관통하거나 아예 없는 세상이 된다. 그 실수는 위 두 테스트를 **통과한다** — 대칭은
  // 여전히 성립하기 때문이다. 그래서 축이 실제로 갈라져 있는지 따로 본다.
  it('네 경계가 서로 독립이다 — 북=남 이나 동=서 로 붙어 있지 않다', () => {
    let nsSame = 0, ewSame = 0, n = 0;
    for (let px = -20; px <= 20; px++) {
      for (let pz = -20; pz <= 20; pz++) {
        const d = roadDirs(px, pz);
        if (d.includes('north') === d.includes('south')) nsSame++;
        if (d.includes('west') === d.includes('east')) ewSame++;
        n++;
      }
    }
    // 독립이면 일치율은 p²+(1-p)² = 0.52 근방이다. 붙어 있으면 1.0 이 된다.
    expect(nsSame / n).toBeLessThan(0.7);
    expect(ewSame / n).toBeLessThan(0.7);
  });

  it('길이 하나도 없는 세상이 아니다', () => {
    let withRoad = 0;
    for (let px = 0; px < 40; px++) for (let pz = 0; pz < 40; pz++) if (roadDirs(px, pz).length) withRoad++;
    expect(withRoad / 1600).toBeGreaterThan(0.9); // 이론값 97.4%
  });
});

describe('② onRoad 가 실제로 깔린 조각을 덮는다', () => {
  // 조각이 놓인 자리를 `onRoad` 가 "도로 아님" 이라고 하면 그 위에 건물이 선다.
  it('모든 도로 조각의 네 귀퉁이가 도로로 판정된다', () => {
    for (let px = -8; px <= 8; px++) {
      for (let pz = -8; pz <= 8; pz++) {
        const dirs = roadDirs(px, pz);
        const parts = road.place({ px, pz, rnd: rngFrom(1), o: DEFAULT_LAYOUT, halfX: HALF_X, halfZ: HALF_Z });
        const h = ROAD_SEG / 2 - 0.01; // 귀퉁이 안쪽 — 경계 위 부동소수 다툼을 피한다
        for (const p of parts) {
          for (const [dx, dz] of [[-h, -h], [h, -h], [-h, h], [h, h]] as const) {
            expect(onRoad(p.x + dx, p.z + dz, dirs)).toBe(true);
          }
        }
      }
    }
  });

  it('길이 없는 파셀은 어디도 도로가 아니다', () => {
    // 길 없는 파셀을 하나 찾아서 확인한다(이론상 2.6% 이므로 반드시 있다)
    let found = false;
    for (let px = 0; px < 60 && !found; px++) {
      for (let pz = 0; pz < 60 && !found; pz++) {
        if (roadDirs(px, pz).length) continue;
        found = true;
        expect(road.place({ px, pz, rnd: rngFrom(1), o: DEFAULT_LAYOUT, halfX: HALF_X, halfZ: HALF_Z })).toEqual([]);
        for (const v of [-15, -5, 0, 5, 15]) expect(onRoad(v, v, [])).toBe(false);
      }
    }
    expect(found).toBe(true);
  });

  it('신고한 최대 9조각을 넘지 않는다 — 슬롯 예산의 근거', () => {
    let peak = 0;
    for (let px = -25; px <= 25; px++) {
      for (let pz = -25; pz <= 25; pz++) {
        const n = road.place({ px, pz, rnd: rngFrom(1), o: DEFAULT_LAYOUT, halfX: HALF_X, halfZ: HALF_Z }).length;
        peak = Math.max(peak, n);
      }
    }
    expect(peak).toBe(9);                       // 사거리 = 중심 1 + 4방향 × 2
    expect(road.maxPerParcel(DEFAULT_LAYOUT)).toBeGreaterThanOrEqual(peak);
  });
});

describe('③ 길의 성격 — 바둑판이 아니다', () => {
  it('막다른 길과 사거리가 둘 다 나온다', () => {
    const hist = [0, 0, 0, 0, 0];
    for (let px = 0; px < 60; px++) for (let pz = 0; pz < 60; pz++) hist[roadDirs(px, pz).length]++;
    const n = 3600;
    // 이론값 B(4, 0.6): 2.6% / 15.4% / 34.6% / 34.6% / 13.0%
    expect(hist[1] / n).toBeGreaterThan(0.08); // 막다른 길이 있어야 한다
    expect(hist[4] / n).toBeGreaterThan(0.06); // 사거리도 있어야 한다
    expect(hist[2] / n).toBeLessThan(0.55);    // 통과로만 있으면 그게 바둑판이다
  });

  it('EDGE_P 를 1로 올리면 전부 사거리가 된다 — 확률이 실제로 먹는다', () => {
    for (let px = 0; px < 10; px++) {
      expect(roadDirs(px, px * 7, 1).length).toBe(4);
      expect(roadDirs(px, px * 7, 0).length).toBe(0);
    }
    expect(EDGE_P).toBeGreaterThan(0);
    expect(EDGE_P).toBeLessThan(1);
  });
});

describe('pickOffRoad — 언제나 도로 밖을 준다', () => {
  it('어떤 파셀에서도 도로 위를 반환하지 않는다', () => {
    for (let px = -12; px <= 12; px++) {
      for (let pz = -12; pz <= 12; pz++) {
        const dirs = roadDirs(px, pz);
        const rnd = rngFrom(px * 7919 + pz);
        for (let i = 0; i < 20; i++) {
          const p = pickOffRoad(rnd, HALF_X, HALF_Z, dirs);
          expect(onRoad(p.x, p.z, dirs)).toBe(false);
          expect(Math.abs(p.x)).toBeLessThanOrEqual(HALF_X);
          expect(Math.abs(p.z)).toBeLessThanOrEqual(HALF_Z);
        }
      }
    }
  });

  // 재시도 방식이었을 때 사거리 파셀에서 자리를 못 찾아 **건물이 1채로 떨어졌다.**
  // 사분면 표집으로 바꾼 것이 그 수정이고, 여기서 그 성질을 고정한다.
  it('사거리 파셀에서도 반드시 자리를 찾는다', () => {
    const all = ['north', 'south', 'west', 'east'] as const;
    const rnd = rngFrom(42);
    for (let i = 0; i < 200; i++) {
      const p = pickOffRoad(rnd, HALF_X, HALF_Z, all);
      expect(onRoad(p.x, p.z, all)).toBe(false);
      // 사분면 표집이므로 두 축 모두 도로 반폭 밖이다
      expect(Math.abs(p.x)).toBeGreaterThanOrEqual(ROAD_HALF - 1e-9);
      expect(Math.abs(p.z)).toBeGreaterThanOrEqual(ROAD_HALF - 1e-9);
    }
  });

  it('길 없는 파셀은 한가운데도 쓴다 — 도넛처럼 비지 않는다', () => {
    const rnd = rngFrom(7);
    let nearCenter = 0;
    for (let i = 0; i < 500; i++) {
      const p = pickOffRoad(rnd, HALF_X, HALF_Z, []);
      if (Math.abs(p.x) < ROAD_HALF && Math.abs(p.z) < ROAD_HALF) nearCenter++;
    }
    expect(nearCenter).toBeGreaterThan(0);
  });
});

describe('경계 함수 자체', () => {
  it('같은 경계는 언제나 같은 답 — 결정론', () => {
    for (let i = -30; i <= 30; i++) {
      expect(edgeX(i, i * 3)).toBe(edgeX(i, i * 3));
      expect(edgeZ(i, i * 3)).toBe(edgeZ(i, i * 3));
    }
  });

  it('X 경계와 Z 경계가 같은 값을 내지 않는다 — 소금이 갈려 있다', () => {
    let same = 0;
    for (let i = 0; i < 400; i++) if (edgeX(i, i * 5) === edgeZ(i, i * 5)) same++;
    expect(same).toBeLessThan(340); // 독립이면 208 근방, 같은 해시면 400
  });
});
