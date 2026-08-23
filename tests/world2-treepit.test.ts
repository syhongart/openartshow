// world2 나무 발치 pit — 나무를 정확히 따라가는가.
//
// ── 이 파츠만의 위험 ─────────────────────────────────────────────────────────
// `treepit` 은 **자기 난수로 자리를 뽑지 않는 유일한 파츠**다. `placed` 에서 나무를 찾아
// 그 위에 얹힌다. 그래서 다른 파츠에는 없는 실패 방식이 둘 생긴다:
//
//   ① **목록 순서에 의존한다.** `parts/index.ts` 에서 나무보다 앞에 놓이면 볼 나무가
//      없어 **하나도 안 놓인다 — 그리고 조용하다.** 에러도 경고도 없이 그냥 0개다.
//   ② **tier 마다 참조 대상이 달라질 수 있다.** 나무는 far 까지 있고 pit 은 mid 까지다.
//      방향이 뒤집히면(pit 이 더 넓은 tier) far 에서 볼 나무가 없어 위치가 갈리고,
//      멀어졌다 가까워질 때 순간이동한다.
//
// 둘 다 화면에서는 "흙이 안 보인다"·"흙이 깜빡인다" 로만 나타나 원인을 짚기 어렵다.

import { describe, it, expect } from 'vitest';
import { parcelLayout, DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { PARTS, ALL_KINDS, kindsFor, maxPartsPerParcel, tonesFor } from '../frontend/js/world2/parts/index.js';
import { TREE_RADIUS_UNIT } from '../frontend/js/world2/parts/tree.js';
import { DIRT_BASE, treepit } from '../frontend/js/world2/parts/treepit.js';
import { GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z } from '../frontend/js/world2/decide/grid.js';
import { parcelWater } from '../frontend/js/world2/decide/water.js';

const { cellX, cellZ } = DEFAULT_LAYOUT;

/** 세계 전체를 훑어 (파셀, 배치) 쌍을 낸다. 표본이 아니라 전수다 — 861파셀이면 감당된다 */
function* landParcels(tier: 'near' | 'mid' | 'far' = 'near') {
  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      if (parcelWater(px, pz, cellX, cellZ) === 'water') continue;
      yield { px, pz, parts: parcelLayout(px, pz, tier) };
    }
  }
}

describe('등록', () => {
  it('파츠 목록에서 나무 뒤에 온다 — 앞에 있으면 조용히 0개가 된다', () => {
    const order = PARTS.map((p) => p.kind);
    const t = order.indexOf('tree');
    const p = order.indexOf('treepit');
    expect(t).toBeGreaterThanOrEqual(0);
    expect(p).toBeGreaterThan(t);
  });

  it('종류 목록에 편입된다 — 슬롯 예산·GLB 내보내기가 여기서 유도된다', () => {
    expect(ALL_KINDS).toContain('treepit');
  });

  it('나무보다 좁은 tier 다 — 참조 방향이 뒤집히면 far 에서 순간이동한다', () => {
    expect(treepit.tiers).toEqual(['near', 'mid']);
    expect(kindsFor('near')).toContain('treepit');
    expect(kindsFor('mid')).toContain('treepit');
    expect(kindsFor('far')).not.toContain('treepit');
  });

  it('tones 가 흰색 하나다 — 텍스처에 색을 구웠으므로 곱하면 두 번 어두워진다', () => {
    expect(tonesFor('treepit')).toEqual([0xffffff]);
  });

  it('지면 파츠로 자기 바탕색을 신고한다 — 밤 알베도 배선에 편입되려면 필요하다', () => {
    expect(treepit.groundBase).toBe(DIRT_BASE);
  });
});

describe('나무를 정확히 따라간다', () => {
  it('모든 파셀에서 나무 수와 pit 수가 같다', () => {
    let trees = 0, pits = 0, parcelsWithTrees = 0;
    for (const { parts } of landParcels()) {
      const t = parts.filter((p) => p.kind === 'tree').length;
      const q = parts.filter((p) => p.kind === 'treepit').length;
      expect(q).toBe(t);
      trees += t; pits += q;
      if (t > 0) parcelsWithTrees++;
    }
    // 표본이 비면 위 단언이 전부 공회전한다 — 이 저장소가 실제로 당한 형태다.
    expect(trees).toBeGreaterThan(1000);
    expect(pits).toBe(trees);
    expect(parcelsWithTrees).toBeGreaterThan(100);
  });

  it('위치와 회전이 나무와 같다', () => {
    let checked = 0;
    for (const { parts } of landParcels()) {
      const trees = parts.filter((p) => p.kind === 'tree');
      const pits = parts.filter((p) => p.kind === 'treepit');
      for (let i = 0; i < trees.length; i++) {
        expect(pits[i].x).toBe(trees[i].x);
        expect(pits[i].z).toBe(trees[i].z);
        expect(pits[i].ry).toBe(trees[i].ry);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('반경이 나무 수관 반경과 같다 — 나무가 비워 둔 자리에 정확히 들어간다', () => {
    // 이 성질이 곧 "도로·건물과 안 겹친다" 의 근거다. 반경을 따로 키우면 그 근거가
    // 사라지고 world1 처럼 클램프가 필요해진다.
    let checked = 0;
    for (const { parts } of landParcels()) {
      const trees = parts.filter((p) => p.kind === 'tree');
      const pits = parts.filter((p) => p.kind === 'treepit');
      for (let i = 0; i < trees.length; i++) {
        expect(pits[i].sx).toBeCloseTo(TREE_RADIUS_UNIT * trees[i].sx, 9);
        expect(pits[i].sz).toBeCloseTo(TREE_RADIUS_UNIT * trees[i].sx, 9);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('지면 위에 뜬다 — 정원(0.07) 위, 도로(0.14) 아래', () => {
    let checked = 0;
    for (const { parts } of landParcels()) {
      for (const p of parts) {
        if (p.kind !== 'treepit') continue;
        expect(p.y).toBeGreaterThan(0.07);
        expect(p.y).toBeLessThan(0.14);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('나무가 없는 파셀에는 pit 도 없다', () => {
    let emptyChecked = 0;
    for (const { parts } of landParcels()) {
      if (parts.some((p) => p.kind === 'tree')) continue;
      expect(parts.filter((p) => p.kind === 'treepit')).toHaveLength(0);
      emptyChecked++;
    }
    expect(emptyChecked).toBeGreaterThan(0);
  });
});

describe('tier 불변식 — mid 에서도 같은 자리다', () => {
  it('near 와 mid 의 pit 배치가 완전히 같다', () => {
    // 깨지면 멀어졌다 가까워질 때 흙 원반이 순간이동한다.
    let checked = 0;
    for (let px = -8; px <= 8; px++) {
      for (let pz = -8; pz <= 8; pz++) {
        if (parcelWater(px, pz, cellX, cellZ) === 'water') continue;
        const near = parcelLayout(px, pz, 'near').filter((p) => p.kind === 'treepit');
        const mid = parcelLayout(px, pz, 'mid').filter((p) => p.kind === 'treepit');
        expect(mid).toEqual(near);
        checked += near.length;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('far 에는 아예 없다', () => {
    for (let px = -8; px <= 8; px++) {
      for (let pz = -8; pz <= 8; pz++) {
        if (parcelWater(px, pz, cellX, cellZ) === 'water') continue;
        expect(parcelLayout(px, pz, 'far').filter((p) => p.kind === 'treepit')).toHaveLength(0);
      }
    }
  });
});

describe('슬롯 예산', () => {
  it('신고한 상한이 실제 최대와 맞는다 — 작으면 조용히 덜 그려진다', () => {
    const budget = maxPartsPerParcel('treepit', DEFAULT_LAYOUT);
    let peak = 0;
    for (const { parts } of landParcels()) {
      peak = Math.max(peak, parts.filter((p) => p.kind === 'treepit').length);
    }
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(budget);
    // 나무와 같은 상한이어야 한다 — 나무 하나에 pit 하나이므로.
    expect(budget).toBe(maxPartsPerParcel('tree', DEFAULT_LAYOUT));
  });
});
