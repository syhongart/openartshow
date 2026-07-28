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
//  ③ **길의 성격.** 감독 지시로 **격자**가 됐다 — *"월드 1처럼 격자로 해주고."* 예전에는
//     경계마다 확률 0.6 독립 추첨이라 막다른 길이 15% 섞였는데, 의도는 "바둑판 말고"
//     였지만 결과는 길이 곳곳에서 끊긴 도시였다. 이제 기본은 전부 이어지고, 불규칙은
//     **블록 크기**가 만든다(2×2 슈퍼셀이 내부 경계 하나를 끄면 두 칸이 한 블록).

import { describe, it, expect } from 'vitest';
import {
  edgeX, edgeZ, roadDirs, onRoad, pickOffRoad, ROAD_SEG, ROAD_HALF,
  SETBACK,
} from '../frontend/js/world2/parts/road-topology.js';
import { road } from '../frontend/js/world2/parts/road.js';
import { parcelLayout } from '../frontend/js/world2/decide/parcel-layout.js';
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
  // 북쪽을 `edgeZ(px, pz)` 로 잘못 적으면 북과 남이 같은 값을 보게 된다. 격자에서는
  // 대부분의 경계가 열려 있어 "일치율" 로는 그 실수를 못 잡는다 — 정상일 때도 높다.
  // 대신 **축이 실제로 갈라지는 지점**을 본다: 블록 병합이 일어난 칸에서는 한쪽 축만
  // 닫히므로, 북≠남 인 파셀과 동≠서 인 파셀이 둘 다 존재해야 한다.
  it('네 경계가 서로 독립이다 — 북=남 이나 동=서 로 붙어 있지 않다', () => {
    let nsDiffer = 0, ewDiffer = 0;
    for (let px = -20; px <= 20; px++) {
      for (let pz = -20; pz <= 20; pz++) {
        const d = roadDirs(px, pz);
        if (d.includes('north') !== d.includes('south')) nsDiffer++;
        if (d.includes('west') !== d.includes('east')) ewDiffer++;
      }
    }
    expect(nsDiffer).toBeGreaterThan(0);
    expect(ewDiffer).toBeGreaterThan(0);
  });

  it('길이 끊기지 않는다 — 격자이므로 모든 파셀이 길에 닿는다', () => {
    for (let px = -20; px <= 20; px++) {
      for (let pz = -20; pz <= 20; pz++) {
        // 병합된 블록의 한 칸도 바깥 경계는 열려 있어야 도달 가능하다.
        expect(roadDirs(px, pz).length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('② onRoad 가 실제로 깔린 조각을 덮는다', () => {
  // 조각이 놓인 자리를 `onRoad` 가 "도로 아님" 이라고 하면 그 위에 건물이 선다.
  it('모든 도로 조각의 네 귀퉁이가 도로로 판정된다', () => {
    for (let px = -8; px <= 8; px++) {
      for (let pz = -8; pz <= 8; pz++) {
        const dirs = roadDirs(px, pz);
        const parts = road.place({ px, pz, rnd: rngFrom(1), o: DEFAULT_LAYOUT, halfX: HALF_X, halfZ: HALF_Z, placed: [], radiusOf: () => 0 });
        const h = ROAD_SEG / 2 - 0.01; // 귀퉁이 안쪽 — 경계 위 부동소수 다툼을 피한다
        for (const p of parts) {
          for (const [dx, dz] of [[-h, -h], [h, -h], [-h, h], [h, h]] as const) {
            expect(onRoad(p.x + dx, p.z + dz, dirs)).toBe(true);
          }
        }
      }
    }
  });

  // 격자로 바뀐 뒤 "길 없는 파셀"은 세상에 존재하지 않는다(앞의 ①이 그것을 고정한다).
  // 그래도 방향이 빈 경우의 계약은 남겨둔다 — `road.place` 와 `onRoad` 는 방향 배열을
  // 인자로 받는 순수 함수라, 빈 배열이 들어오는 경로가 사라진 것이지 함수가 사라진 건
  // 아니다. 병합된 블록 안쪽을 계산할 때 실제로 빈 방향을 넘기게 된다.
  it('방향이 비면 어디도 도로가 아니다', () => {
    for (const v of [-15, -5, 0, 5, 15]) expect(onRoad(v, v, [])).toBe(false);
    expect(onRoad(0, 0, [])).toBe(false); // 중심 교차 패치도 방향이 없으면 안 걸린다
  });

  it('격자에서는 모든 파셀에 도로 조각이 깔린다', () => {
    for (const [px, pz] of [[0, 0], [3, -7], [-11, 5], [14, 14]]) {
      const segs = road.place({ px, pz, rnd: rngFrom(px * 31 + pz), o: DEFAULT_LAYOUT, halfX: HALF_X, halfZ: HALF_Z, placed: [], radiusOf: () => 0 });
      expect(segs.length).toBeGreaterThan(0);
    }
  });

  it('신고한 최대 9조각을 넘지 않는다 — 슬롯 예산의 근거', () => {
    let peak = 0;
    for (let px = -25; px <= 25; px++) {
      for (let pz = -25; pz <= 25; pz++) {
        const n = road.place({ px, pz, rnd: rngFrom(1), o: DEFAULT_LAYOUT, halfX: HALF_X, halfZ: HALF_Z, placed: [], radiusOf: () => 0 }).length;
        peak = Math.max(peak, n);
      }
    }
    expect(peak).toBe(9);                       // 사거리 = 중심 1 + 4방향 × 2
    expect(road.maxPerParcel(DEFAULT_LAYOUT)).toBeGreaterThanOrEqual(peak);
  });
});

describe('③ 길의 성격 — 격자이되 칸 크기가 고르지 않다', () => {
  it('대부분은 사거리다 — 격자로 이어진다', () => {
    const hist = [0, 0, 0, 0, 0];
    for (let px = 0; px < 60; px++) for (let pz = 0; pz < 60; pz++) hist[roadDirs(px, pz).length]++;
    const n = 3600;
    expect(hist[4] / n).toBeGreaterThan(0.5); // 사거리가 다수
    expect(hist[0]).toBe(0);                  // 길에서 끊긴 칸은 없다
    expect(hist[1]).toBe(0);                  // 막다른 길도 없다
  });

  // 감독 지시: *"칸의 크기는 모두 같은 크기가 아니라 조금 달랐으면해. 2개 셀이 한개인
  // 것도 있고."* — 전부 사거리이기만 하면 그게 바둑판이다. 병합이 실제로 일어나는지
  // 본다. 이 테스트가 없으면 `blockPattern` 이 늘 `None` 을 돌려줘도 아무도 모른다.
  it('두 칸이 한 블록이 되는 곳이 있다 — 전부 같은 크기면 바둑판이다', () => {
    let merged = 0;
    for (let px = 0; px < 60; px++) {
      for (let pz = 0; pz < 60; pz++) {
        if (roadDirs(px, pz).length < 4) merged++;
      }
    }
    // 슈퍼셀의 60%가 내부 경계 하나를 끄고, 그 경계에 접한 칸이 둘이므로 대략 30%.
    expect(merged / 3600).toBeGreaterThan(0.15);
    expect(merged / 3600).toBeLessThan(0.45);
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

  // 격자에서는 두 축 모두 대부분 열려 있어 "일치율"로는 축이 붙었는지 알 수 없다 —
  // 정상일 때도 높다. 대신 **두 축이 서로 다른 값을 내는 좌표가 실제로 존재하는지**를
  // 본다. `gridEdgeZ` 가 `gridEdgeX` 를 그대로 부르는 실수를 하면 이것이 0이 된다.
  it('X 경계와 Z 경계가 서로 다르게 닫히는 곳이 있다 — 두 축이 붙어 있지 않다', () => {
    let xOnly = 0, zOnly = 0;
    for (let px = -30; px <= 30; px++) {
      for (let pz = -30; pz <= 30; pz++) {
        const ex = edgeX(px, pz), ez = edgeZ(px, pz);
        if (!ex && ez) xOnly++;
        if (ex && !ez) zOnly++;
      }
    }
    expect(xOnly).toBeGreaterThan(0);
    expect(zOnly).toBeGreaterThan(0);
  });
});

describe('건물 밀도 — 감독 지적 "빽빽하다" 의 처방', () => {
  // ── 이 검사가 있는 이유 ──────────────────────────────────────────────────
  // 감독 판정: *"이렇게 건물이 빽빽하게 있는 것도 말이 안되잖아."*
  //
  // 디자이너 진단으로 원인이 셋으로 갈렸다 — ① 밀도가 world1 의 2.25배(1000㎡당 3.91채
  // vs 1.74채) ② **최소 간격 규칙이 없어 겹칠 수 있다** ③ 하한이 2라 빈 구획이 없다.
  //
  // ②가 가장 눈에 띄는 결함이다. 사분면 폭이 6.5m 인데 건물 폭이 3~8m 라, 두 채가 같은
  // 사분면에 배정되면 실제로 겹쳐 선다. 채수를 4 이하로 두고 사분면을 1:1로 나눠 그
  // 가능성을 구조적으로 없앴는데, **그게 실제로 성립하는지는 재봐야 안다.**

  /** 건물의 바닥 AABB. 직각 회전이므로 90°·270° 에서 폭과 깊이가 바뀐다 */
  function aabb(p: { x: number; z: number; ry: number; sx: number; sz: number }) {
    const swapped = Math.abs(Math.sin(p.ry)) > 0.5;
    const w = swapped ? p.sz : p.sx;
    const d = swapped ? p.sx : p.sz;
    return { x0: p.x - w / 2, x1: p.x + w / 2, z0: p.z - d / 2, z1: p.z + d / 2 };
  }

  it('한 파셀 안에서 건물끼리 겹치지 않는다 (1024 파셀)', () => {
    const overlaps: string[] = [];
    for (let px = 0; px < 32; px++) {
      for (let pz = 0; pz < 32; pz++) {
        const bs = parcelLayout(px, pz, 'near').filter((p) => p.kind === 'building').map(aabb);
        for (let i = 0; i < bs.length; i++) {
          for (let j = i + 1; j < bs.length; j++) {
            const a = bs[i], b = bs[j];
            if (a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1) {
              overlaps.push(`(${px},${pz}) #${i}×#${j}`);
            }
          }
        }
      }
    }
    expect(overlaps).toEqual([]);
  });

  it('밀도가 world1 수준으로 내려왔다', () => {
    let total = 0;
    const n = 32 * 32;
    for (let px = 0; px < 32; px++) {
      for (let pz = 0; pz < 32; pz++) {
        total += parcelLayout(px, pz, 'near').filter((p) => p.kind === 'building').length;
      }
    }
    const avg = total / n;
    // 파셀 1024㎡ 기준 1000㎡당 채수. world1 은 576㎡ 당 1채 = 1.74채/1000㎡ 였고,
    // 고치기 전 world2 는 3.91 이었다. 목표는 2.4 언저리 — world1 의 1.4배.
    const per1000 = avg / 1.024;
    expect(per1000).toBeGreaterThan(1.9); // 너무 비면 버려진 도시가 된다
    expect(per1000).toBeLessThan(2.9);    // 3 을 넘으면 다시 빽빽해진다
  });

  it('건물이 도로 셋백 안쪽으로 들어오지 않는다 — 인도가 남는다', () => {
    for (let px = -10; px <= 10; px++) {
      for (let pz = -10; pz <= 10; pz++) {
        const dirs = roadDirs(px, pz);
        if (dirs.length === 0) continue; // 길 없는 파셀은 셋백이 없다
        for (const b of parcelLayout(px, pz, 'near').filter((p) => p.kind === 'building')) {
          expect(Math.abs(b.x)).toBeGreaterThanOrEqual(SETBACK - 1e-9);
          expect(Math.abs(b.z)).toBeGreaterThanOrEqual(SETBACK - 1e-9);
        }
      }
    }
  });
});
