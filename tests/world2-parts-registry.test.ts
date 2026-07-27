// world2 파츠 레지스트리 계약 테스트.
//
// 확인하는 것은 하나다 — **파츠를 추가하면서 한 조각을 빠뜨렸을 때 여기서 걸리는가.**
//
// 이 구조를 만든 이유가 그것이다. 예전에는 도로 하나를 추가하려면 아홉 군데를 손대야
// 했고(`PartKind`·`KINDS_BY_TIER`·`KIND_SALT`·`countFor`·`makePart`·`maxPartsPerParcel`
// ·`TONE_PALETTE`·`createPartAssets`·`ALL_KINDS`), 그중 하나를 빠뜨렸을 때의 증상이
// 전부 조용했다:
//
//   · `KIND_SALT` 누락    → 다른 종류와 같은 난수를 받아 **정확히 겹쳐 선다**
//   · `TONE_PALETTE` 누락 → 흰색으로 칠해진다(팔레트가 없으니 기본값)
//   · `maxPartsPerParcel` 과소 → 슬롯이 모자라 **파셀이 조용히 덜 그려진다**
//
// 이제 그 아홉이 파츠 파일 하나가 됐지만, 그 파일 안에서 한 필드를 잘못 적는 것은 여전히
// 가능하다. 아래가 그것을 잡는다.

import { describe, it, expect } from 'vitest';
import { PARTS, ALL_KINDS, kindsFor, outermostTierFor, maxPartsPerParcel, tonesFor } from '../frontend/js/world2/parts/index.js';
import { parcelLayout, DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';

const TIERS = ['near', 'mid', 'far'] as const;

describe('파츠 선언 — 서로 부딪히지 않는다', () => {
  it('종류 이름이 겹치지 않는다', () => {
    expect(new Set(ALL_KINDS).size).toBe(PARTS.length);
  });

  // 같은 소금이면 같은 난수를 받는다. 두 종류가 **정확히 같은 자리에** 겹쳐 서는데,
  // 위에서 보면 하나만 있는 것처럼 보여서 눈으로는 좀처럼 안 잡힌다.
  it('난수 소금이 겹치지 않는다', () => {
    expect(new Set(PARTS.map((p) => p.salt)).size).toBe(PARTS.length);
  });

  it('모든 파츠가 색 팔레트를 갖는다 — 없으면 흰색으로 튄다', () => {
    for (const p of PARTS) expect(p.tones.length).toBeGreaterThan(0);
  });

  it('모든 파츠가 최소 한 tier 에 등장한다 — 어디에도 없으면 죽은 선언이다', () => {
    for (const p of PARTS) {
      expect(p.tiers.length).toBeGreaterThan(0);
      expect(outermostTierFor(p.kind)).not.toBeNull();
    }
  });

  // 멀리서 보이는 것은 가까이서도 보여야 한다. 깨지면 다가갈수록 사물이 사라진다.
  it('near 가 상위집합이다 — mid·far 에 있으면 near 에도 있다', () => {
    for (const p of PARTS) {
      if (p.tiers.includes('mid') || p.tiers.includes('far')) {
        expect(p.tiers).toContain('near');
      }
    }
  });
});

describe('배치와 선언이 어긋나지 않는다', () => {
  // `place` 가 반환하는 `kind` 는 자기 선언과 같아야 한다. 파츠 파일을 복사해 새 파츠를
  // 만들 때 흔히 남는 실수이고, 틀리면 그 부품은 **다른 종류의 슬롯을 먹는다**.
  it('place 가 자기 kind 로만 부품을 낸다', () => {
    for (const p of PARTS) {
      const rnd = mulberry(12345);
      const parts = p.place({ px: 1, pz: 2, rnd, o: DEFAULT_LAYOUT, halfX: 13.5, halfZ: 13.5 });
      for (const part of parts) expect(part.kind).toBe(p.kind);
    }
  });

  it('kindsFor 가 각 파츠의 tiers 선언과 일치한다', () => {
    for (const t of TIERS) {
      const declared = PARTS.filter((p) => p.tiers.includes(t)).map((p) => p.kind);
      expect([...kindsFor(t)]).toEqual(declared);
    }
  });

  // 실제 배치에 나타나는 종류가 그 tier 에 선언돼 있어야 한다.
  it('배치 결과의 종류가 전부 그 tier 에 선언돼 있다', () => {
    for (const t of TIERS) {
      const allowed = new Set(kindsFor(t));
      for (let px = 0; px < 12; px++) {
        for (const part of parcelLayout(px, px * 3 + 1, t)) {
          expect(allowed.has(part.kind as never)).toBe(true);
        }
      }
    }
  });
});

describe('슬롯 예산 — 신고한 최대가 실제 최대를 덮는다', () => {
  // 신고가 실제보다 작으면 슬롯이 모자라 파셀이 조용히 덜 그려진다. 이게 이 레지스트리에서
  // **판정(배치)과 집행(풀 크기)이 만나는 유일한 지점**이고, 두 값이 다른 함수에서 나오므로
  // 어느 한쪽 테스트로는 걸리지 않는다.
  it('1024 파셀 표본에서 신고 최대를 넘지 않는다', () => {
    const peak = new Map<string, number>();
    for (let px = 0; px < 32; px++) {
      for (let pz = 0; pz < 32; pz++) {
        const counts = new Map<string, number>();
        for (const part of parcelLayout(px, pz, 'near')) {
          counts.set(part.kind, (counts.get(part.kind) ?? 0) + 1);
        }
        for (const [k, n] of counts) peak.set(k, Math.max(peak.get(k) ?? 0, n));
      }
    }
    for (const p of PARTS) {
      expect(peak.get(p.kind) ?? 0).toBeLessThanOrEqual(maxPartsPerParcel(p.kind));
    }
  });

  it('옵션으로 상한을 줄이면 신고값도 따라 줄어든다', () => {
    expect(maxPartsPerParcel('building', { ...DEFAULT_LAYOUT, maxBuildings: 3 })).toBe(3);
    expect(maxPartsPerParcel('tree', { ...DEFAULT_LAYOUT, maxTrees: 2 })).toBe(2);
  });

  it('모르는 종류는 0 — 슬롯을 잡지 않는다', () => {
    expect(maxPartsPerParcel('없는파츠')).toBe(0);
    expect(outermostTierFor('없는파츠')).toBeNull();
    expect(tonesFor('없는파츠')).toEqual([0xffffff]); // 흰색 — 빠진 것이 눈에 띄어야 한다
  });
});

/** 테스트 전용 난수. 배치의 결정론을 시험하는 것이 아니므로 간단한 것으로 충분하다 */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
