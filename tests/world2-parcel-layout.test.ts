// world2 파셀 배치 판정 테스트.
//
// 두 불변식이 이 파일의 전부다.
// ① 좌표 결정론 — 저장하지 않고 매번 다시 계산하므로("파라미터가 곧 공간"), 이게 깨지면
//    파셀이 언로드/재로드될 때마다 세상이 바뀐다.
// ② tier 포함관계 — tier는 무엇을 그릴지만 줄이지 어디에 그릴지를 바꾸지 않는다. 깨지면
//    멀어졌다 가까워질 때 건물이 순간이동한다.

import { describe, it, expect } from 'vitest';
import {
  hash2, rngFrom, parcelLayout, kindsFor, maxPartsPerParcel,
  DEFAULT_LAYOUT, type PartKind, type PlacedPart,
} from '../frontend/js/world2/decide/parcel-layout.js';
import { isPlaza } from '../frontend/js/world2/parts/plaza.js';

const at = (px: number, pz: number, tier: 'near' | 'mid' | 'far' = 'near') => parcelLayout(px, pz, tier);
const only = (ps: PlacedPart[], k: PartKind) => ps.filter((p) => p.kind === k);
const key = (p: PlacedPart) => `${p.kind}:${p.x.toFixed(6)},${p.z.toFixed(6)},${p.ry.toFixed(6)}`;

describe('hash2 / rngFrom — 결정론적 난수', () => {
  it('같은 입력은 같은 해시', () => {
    expect(hash2(3, -7)).toBe(hash2(3, -7));
  });

  it('다른 입력은 다른 해시(인접 좌표 포함)', () => {
    const seen = new Set<number>();
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) seen.add(hash2(x, z));
    expect(seen.size).toBe(81); // 81칸 전부 충돌 없음
  });

  it('음수 좌표에서도 흩어진다 — 대각선 패턴이 생기면 눈에 띈다', () => {
    // px === pz인 대각선에서 값이 뭉치지 않아야 한다.
    const diag = [];
    for (let i = -20; i <= 20; i++) diag.push(hash2(i, i) % 1000);
    expect(new Set(diag).size).toBeGreaterThan(30);
  });

  it('rngFrom은 같은 시드에서 같은 수열', () => {
    const a = rngFrom(12345), b = rngFrom(12345);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('rngFrom은 0~1 범위', () => {
    const r = rngFrom(999);
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('불변식 ① 좌표 결정론', () => {
  it('같은 파셀은 언제나 같은 배치', () => {
    expect(at(5, -3)).toEqual(at(5, -3));
  });

  it('재로드해도 세상이 바뀌지 않는다 — 여러 번 계산해도 동일', () => {
    const first = at(-12, 40);
    for (let i = 0; i < 5; i++) expect(at(-12, 40)).toEqual(first);
  });

  it('다른 파셀은 다른 배치 — 세상이 복사판이면 안 된다', () => {
    const a = at(0, 0), b = at(1, 0), c = at(0, 1);
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('불변식 ② tier 포함관계 — 건물이 순간이동하지 않는다', () => {
  const near = at(7, 11, 'near');
  const mid = at(7, 11, 'mid');
  const far = at(7, 11, 'far');

  it('far ⊆ mid ⊆ near (종류 기준)', () => {
    const kinds = (ps: PlacedPart[]) => new Set(ps.map((p) => p.kind));
    const kn = kinds(near), km = kinds(mid), kf = kinds(far);
    for (const k of kf) expect(km.has(k)).toBe(true);
    for (const k of km) expect(kn.has(k)).toBe(true);
  });

  it('공통 종류의 위치가 완전히 같다 — 이게 이 설계의 핵심', () => {
    for (const kind of ['ground', 'building'] as PartKind[]) {
      expect(only(far, kind).map(key)).toEqual(only(near, kind).map(key));
      expect(only(mid, kind).map(key)).toEqual(only(near, kind).map(key));
    }
    expect(only(mid, 'tree').map(key)).toEqual(only(near, 'tree').map(key));
  });

  it('공통 종류의 크기·색조까지 같다', () => {
    expect(only(far, 'building')).toEqual(only(near, 'building'));
  });

  it('tier가 낮을수록 부품이 적거나 같다', () => {
    expect(far.length).toBeLessThanOrEqual(mid.length);
    expect(mid.length).toBeLessThanOrEqual(near.length);
  });

  it('여러 파셀에서 반복 확인 — 우연히 맞은 게 아니다', () => {
    for (const [px, pz] of [[0, 0], [-5, 8], [13, -2], [100, 100]]) {
      const n = parcelLayout(px, pz, 'near');
      const f = parcelLayout(px, pz, 'far');
      expect(only(f, 'building')).toEqual(only(n, 'building'));
    }
  });
});

describe('kindsFor — tier별 구성', () => {
  it('near가 가장 많고 far가 가장 적다', () => {
    expect(kindsFor('near').length).toBeGreaterThan(kindsFor('mid').length);
    expect(kindsFor('mid').length).toBeGreaterThan(kindsFor('far').length);
  });

  it('모든 tier에 ground와 building이 있다 — 빈 파셀은 구멍으로 보인다', () => {
    for (const t of ['near', 'mid', 'far'] as const) {
      expect(kindsFor(t)).toContain('ground');
      expect(kindsFor(t)).toContain('building');
    }
  });
});

describe('배치 범위 — 이웃 파셀을 침범하지 않는다', () => {
  it('모든 부품이 셀 경계 안에 있다', () => {
    const halfX = DEFAULT_LAYOUT.cellX / 2 - DEFAULT_LAYOUT.margin;
    const halfZ = DEFAULT_LAYOUT.cellZ / 2 - DEFAULT_LAYOUT.margin;
    for (let px = -3; px <= 3; px++) {
      for (let pz = -3; pz <= 3; pz++) {
        for (const p of at(px, pz)) {
          if (p.kind === 'ground') continue; // 지면은 셀 전체를 덮는다
          expect(Math.abs(p.x)).toBeLessThanOrEqual(halfX + 1e-9);
          expect(Math.abs(p.z)).toBeLessThanOrEqual(halfZ + 1e-9);
        }
      }
    }
  });

  it('지면은 셀을 정확히 덮는다 — 틈이 보이면 안 된다', () => {
    const g = only(at(2, 2), 'ground');
    expect(g).toHaveLength(1);
    expect(g[0].sx).toBe(DEFAULT_LAYOUT.cellX);
    expect(g[0].sz).toBe(DEFAULT_LAYOUT.cellZ);
    expect(g[0].x).toBe(0);
    expect(g[0].z).toBe(0);
  });

  it('부품이 땅에 붙어 있다 — 공중에 뜨면 안 된다', () => {
    // 원래는 `toBe(0)` 이었다. 도로가 들어오면서 완화했는데, 그건 도로가 지면과 **정확히
    // 같은 높이면 z-fighting 으로 지글거리기** 때문이다(둘 다 수평면이라 깊이값이 같다).
    // 6cm 올려 그 다툼을 없앤다. 상한 10cm 는 "붙어 있다"가 계속 검사되게 남긴 것이다 —
    // 이 값을 넘기면 부품이 실제로 떠 보이기 시작한다.
    for (const p of at(4, -4)) {
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(0.1);
    }
  });

  it('크기가 모두 양수다 — 0이나 음수는 뒤집힌 메시를 만든다', () => {
    for (let px = -3; px <= 3; px++) {
      for (const p of at(px, px * 2)) {
        expect(p.sx).toBeGreaterThan(0);
        expect(p.sy).toBeGreaterThan(0);
        expect(p.sz).toBeGreaterThan(0);
      }
    }
  });
});

describe('maxPartsPerParcel — 슬롯 예산의 근거', () => {
  it('실제 배치가 신고한 최대를 넘지 않는다(1000 파셀 표본)', () => {
    // 이게 틀리면 슬롯이 모자라 파셀이 조용히 덜 그려진다.
    const kinds: PartKind[] = ['ground', 'building', 'tree', 'lamp'];
    const peak: Record<string, number> = { ground: 0, building: 0, tree: 0, lamp: 0 };
    for (let px = 0; px < 32; px++) {
      for (let pz = 0; pz < 32; pz++) {
        const ps = at(px, pz);
        for (const k of kinds) peak[k] = Math.max(peak[k], only(ps, k).length);
      }
    }
    for (const k of kinds) {
      expect(peak[k]).toBeLessThanOrEqual(maxPartsPerParcel(k));
    }
  });

  it('건물은 광장이 아닌 한 최소 1채 — 우연히 빈 파셀은 없다', () => {
    // 하한이 2였다. 감독이 "건물이 빽빽하다" 고 지적해 1~4로 내리면서 함께 낮췄다 —
    // 하한 2면 "한 채만 선 여유로운 구획" 이 구조적으로 존재할 수 없다.
    //
    // 0채는 **광장에서만** 나온다. 그건 의도된 예외이고, 그 자리에는 분수대나 시계탑이
    // 선다. 광장이 아닌데 0채면 배치가 어딘가 어긋난 것이다.
    let checked = 0;
    for (let px = 0; px < 60; px++) {
      for (let pz = 0; pz < 4; pz++) {
        if (isPlaza(px, pz)) continue;
        checked++;
        expect(only(at(px, pz), 'building').length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(checked).toBeGreaterThan(100); // 표본이 비어 조용히 통과하지 않도록
  });

  it('옵션으로 예산을 줄이면 실제 배치도 줄어든다', () => {
    const tight = parcelLayout(3, 3, 'near', { ...DEFAULT_LAYOUT, maxBuildings: 3, maxTrees: 2 });
    expect(only(tight, 'building').length).toBeLessThanOrEqual(3);
    expect(only(tight, 'tree').length).toBeLessThanOrEqual(2);
  });
});
