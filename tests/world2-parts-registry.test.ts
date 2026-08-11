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
import { readFileSync, readdirSync } from 'node:fs';
import { PARTS, ALL_KINDS, kindsFor, outermostTierFor, maxPartsPerParcel, tonesFor } from '../frontend/js/world2/parts/index.js';
import { parcelLayout, DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { atlasGrid } from '../frontend/js/world2/decide/shadow-decal.js';
import { SHADOW_ATLAS_PX } from '../frontend/js/world2/parts/shadow.js';

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
      const parts = p.place({ px: 1, pz: 2, rnd, o: DEFAULT_LAYOUT, halfX: 13.5, halfZ: 13.5, placed: [], radiusOf: () => 0 });
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

describe('레지스트리 밖에 파츠 목록을 다시 적지 않는다', () => {
  // ── 이 검사가 있는 이유 ────────────────────────────────────────────────────
  // 레지스트리를 만들면서 "아홉 군데를 한 곳으로 모았다"고 적었는데, 검수관이 **열 번째**를
  // 찾았다 — `main.ts` 가 `['ground','building','tree','lamp']` 를 따로 들고 부팅 때
  // 파츠별 인스턴스 풀을 만들고 있었다.
  //
  // 하필 그 자리가 최악이다. 새 파츠를 `PARTS` 에 넣어도 이 루프가 모르고 지나가면
  // **그 종류의 풀이 아예 안 만들어지고**, 증상은 "그 파츠만 화면에 없음"이다. 배치는
  // 정상이고 테스트도 통과하므로 원인을 짐작하기 어렵다 — 이 리팩터가 없애려던 바로 그
  // 종류의 조용한 누락이다.
  //
  // 사람이 세는 것으로는 또 놓친다. 그래서 검사로 만든다.

  it('world2 소스에 파츠 이름이 나열된 곳이 없다', () => {
    const quoted = ALL_KINDS.flatMap((k) => [`'${k}'`, `"${k}"`]);
    const offenders: string[] = [];

    for (const file of walk(new URL('../frontend/js/world2/', import.meta.url).pathname)) {
      // `parts/` 는 선언 자체가 사는 곳이다. 테스트도 목록을 다뤄야 하므로 제외한다.
      if (file.includes('/parts/')) continue;
      const src = readFileSync(file, 'utf8');
      src.split('\n').forEach((line, i) => {
        // 한 줄에 파츠 이름이 **둘 이상** 따옴표로 등장하면 목록을 다시 적은 것이다.
        // 하나만 나오는 것은 정상이다(특정 종류를 지목하는 코드가 있을 수 있다).
        if (quoted.filter((q) => line.includes(q)).length >= 2) {
          offenders.push(`${file.split('/world2/')[1]}:${i + 1}  ${line.trim().slice(0, 70)}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

/** 디렉터리를 재귀로 훑어 `.ts` 파일 경로를 모은다 */
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

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

describe('그림자 골격 선언 — 빠뜨리면 그 파츠만 조용히 그림자가 없다', () => {
  // ── 이 절은 검수관 반려로 생겼다 (블로커 2, 2026-08-11) ────────────────────
  // `parts/types.ts` 의 `shadowProfile` 주석이 *"`tests/world2-parts-registry.test.ts` 가
  // 두 조건의 동치를 단언한다 — 빠뜨리면 빨간불이다"* 라고 적었는데, **그 검사가 없었다.**
  // 실측: 그 파일에 `shadowProfile` 문자열이 0건. 지금은 8개 캐스터에 전부 붙어 있어
  // 우연히 참이었지만, 그 참을 지키는 것은 아무것도 없었다.
  //
  // 이 저장소가 반복해 못 박은 형태다 — **게이트 유효성에 대한 거짓 진술은 다음 사람이
  // 확인을 생략하게 만든다.** 문장을 지우는 대신 검사를 만들어 문장을 참으로 되돌린다.
  it('footprint() > 0 ⇔ shadowProfile 선언 (전 파츠)', () => {
    // 대표 인스턴스로 footprint 를 잰다. 파츠마다 스케일 의존이 다르므로(건물은
    // `max(sx,sz)` 를 보고 나무는 `sx` 를 본다) 1배 인스턴스를 공통 표본으로 쓴다.
    const probe = { kind: '', x: 0, z: 0, y: 0, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 };
    let casters = 0, flats = 0;
    for (const p of PARTS) {
      const solid = p.footprint({ ...probe, kind: p.kind }) > 0;
      if (solid) casters++; else flats++;
      expect(Boolean(p.shadowProfile), `${p.kind}: footprint>0=${solid} 인데 shadowProfile=${p.shadowProfile}`)
        .toBe(solid);
    }
    // 양쪽이 비어 있으면 위 루프가 헛돈다 — 빈 표본이 단언을 통과시킨 전례가 있다.
    expect(casters).toBeGreaterThan(0);
    expect(flats).toBeGreaterThan(0);
  });

  it('골격 값이 허용된 셋 중 하나다', () => {
    for (const p of PARTS) {
      if (!p.shadowProfile) continue;
      expect(['round', 'box', 'post'], p.kind).toContain(p.shadowProfile);
    }
  });

  it('아틀라스 셀이 캐스터를 다 담고, 셀이 너무 작아지지 않는다', () => {
    // 캐스터가 늘면 셀이 작아져 실루엣이 뭉개진다. 그 판단을 격자 함수가 삼키지 않게
    // **넘어가는 순간 여기서 빨간불**이 되도록 하한을 둔다(근거는 `atlasGrid` 주석).
    const casters = PARTS.filter((p) => p.shadowProfile).length;
    const g = atlasGrid(casters, SHADOW_ATLAS_PX);
    expect(g.cellPx).toBeGreaterThanOrEqual(64);
    // 마지막 셀이 캔버스를 넘지 않는다.
    const lastCell = g.cellOf(casters - 1);
    expect(lastCell.px + lastCell.size).toBeLessThanOrEqual(SHADOW_ATLAS_PX);
  });
});
