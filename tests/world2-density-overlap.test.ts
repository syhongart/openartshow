// 밀도를 올려도 겹치지 않는가 — **`world2-parcel-slots.test.ts` 가 원리상 못 보는 축.**
//
// ── 왜 별도 파일인가 ────────────────────────────────────────────────────────
// 그 파일의 겹침 불변식은 `parcelLayout(px, pz, tier)` 를 **레이아웃 인자 없이** 부른다
// → `DEFAULT_LAYOUT`(`maxBuildings: 4`) 만 본다. 그런데 `?density=`·`?bld=`·`?tree=` 노브가
// `decide/village-rules.ts` 의 `villageLayout` 으로 그 상한을 배수만큼 올린다.
// **밀도를 올린 세계는 어느 검사도 좌표를 보지 않았다.**
//
// ── 커버리지 착시 ───────────────────────────────────────────────────────────
// `world2-slot-budget.test.ts:210-221` 이 `maxBuildings * 8`(=32) 로 실제 스트리밍을
// 돌려 그 분기를 파셀마다 수십 번 **밟는다.** 그런데 단언하는 것이 풀 예산 위반과
// `starved` 뿐이라 **좌표를 한 번도 안 본다.** 밟는 것과 보는 것은 다른 일이다.
//
// 그래서 두 축을 한 파일에 섞지 않는다 — 그 파일은 예산, 이 파일은 배치다.
//
// ── 이 검사가 처음 잡은 것 (2026-08-12) ─────────────────────────────────────
// `building.ts:82` 가 `shuffledQuadrants(rnd)` 로 사분면 **4개**를 받아 `quads[i]` 로
// 배정하는데, `n` 이 4를 넘으면 `quads[i]` 가 `undefined` 다. 그리고
// `road-topology.ts:310-311` 의 `quad & 1` 은 `undefined & 1 === 0` 이라 **예외도 NaN 도
// 없이 사분면 0 으로 떨어진다.** 순열이라 사분면 0 에는 이미 건물이 서 있다.
//
// 원인은 시차였다 — `?density` 노브가 `bfbc333`(07-27 06:56), *"4를 넘기지 마라"* 제약이
// `98539a6`(07-27 14:00). 7시간 뒤에 들어온 제약이 기존 노브와 화해되지 않았다.

import { describe, it, expect } from 'vitest';
import { parcelLayout, DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { villageLayout, MUL_MAX } from '../frontend/js/world2/decide/village-rules.js';
import { specFor } from '../frontend/js/world2/parts/index.js';
import type { PlacedPart, LayoutOptions } from '../frontend/js/world2/parts/types.js';

const TIERS = ['near', 'mid', 'far'] as const;
const radiusOf = (p: PlacedPart) => specFor(p.kind)?.footprint(p) ?? 0;

function overlapsAt(px: number, pz: number, tier: (typeof TIERS)[number], layout: LayoutOptions) {
  const parts = parcelLayout(px, pz, tier, layout);
  const bad: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const ra = radiusOf(parts[i]), rb = radiusOf(parts[j]);
      if (ra <= 0 || rb <= 0) continue;
      const d = ra + rb - Math.hypot(parts[i].x - parts[j].x, parts[i].z - parts[j].z);
      if (d > 1e-9) bad.push(`(${px},${pz},${tier}) ${parts[i].kind}×${parts[j].kind} ${d.toFixed(2)}m`);
    }
  }
  return bad;
}

/**
 * `?density=N` 이 만드는 레이아웃. **`main.ts` 와 같은 함수를 부른다** — 곱셈을 여기
 * 다시 적으면 규칙이 바뀔 때 한쪽만 낡는다(`decide/village-rules.ts` 헤더 참조).
 */
const densityLayout = (n: number): LayoutOptions => villageLayout({ density: n });

// 노브 범위의 양 끝과 중간. 상한을 실제로 덮는지는 아래 「노브 상한과 짝」이 단언한다
// — 목록을 손으로 적는 이상 그것이 낡지 않게 하는 축이 따로 있어야 한다.
const DENSITIES = [1, 2, 4, 8];

describe('밀도를 올려도 겹치지 않는다', () => {
  for (const n of DENSITIES) {
    it(`density=${n} — 21×21 파셀 × 3 tier 에서 겹치는 쌍이 하나도 없다`, () => {
      const layout = densityLayout(n);
      const bad: string[] = [];
      for (let px = -10; px <= 10; px++) {
        for (let pz = -10; pz <= 10; pz++) {
          for (const t of TIERS) bad.push(...overlapsAt(px, pz, t, layout));
        }
      }
      expect(bad.slice(0, 8), `density=${n} 겹침 ${bad.length}건 (앞 8건)`).toEqual([]);
    });
  }

  it('사분면 넷을 넘겨 실제로 더 놓는다 — 이게 `findFree` 가 사는지 보는 유일한 축', () => {
    // ⚠ 처음엔 *"총 건물 수가 늘어나는가"* 로 적었고 **장식이었다**(executor 뮤테이션 M4:
    // `findFree` 를 항상 `null` 로 만들어도 **0 failed**). 5채째부터 전부 포기해도
    // `n = 1 + floor(rnd() × maxBuildings)` 의 분포 때문에 총합은 여전히 늘기 때문이다 —
    // `density=1` 은 `n ∈ [1,4]`(평균 2.5), `density=8` 은 4에서 잘려도 평균 3.6.
    // **참인 문장에서 성립하지 않는 결론을 뽑은 것**이고, 이 저장소가 이름 붙인 그 고장이다.
    //
    // 재는 축을 바꾼다: `findFree` 가 죽으면 **한 파셀에 5채 이상이 원리상 불가능**하다.
    // 사분면이 넷뿐이기 때문이다. 그러니 그것을 직접 센다.
    const maxPerParcel = (n: number) => {
      let most = 0;
      for (let px = -6; px <= 6; px++) {
        for (let pz = -6; pz <= 6; pz++) {
          const c = parcelLayout(px, pz, 'near', densityLayout(n))
            .filter((p) => p.kind === 'building').length;
          if (c > most) most = c;
        }
      }
      return most;
    };
    expect(maxPerParcel(1), 'density=1 에서 한 파셀 최대 건물 수').toBeLessThanOrEqual(4);
    expect(
      maxPerParcel(MUL_MAX),
      `★ density=${MUL_MAX} 인데 한 파셀에 5채 이상이 한 번도 안 섰다 — findFree 가 자리를 `
      + '전혀 못 찾고 있다(또는 죽었다). 겹침 0 은 "아무것도 안 놓는다" 로도 달성된다.',
    ).toBeGreaterThan(4);
  });
});

describe('노브 상한과 짝', () => {
  it('겹침 검사가 노브 상한을 실제로 덮는다', () => {
    // 위 `[1,2,4,8]` 은 손으로 적은 목록이라 `MUL_MAX` 가 오르면 조용히 낡는다 —
    // 그러면 "밀도를 다 봤다" 가 거짓이 된다. 상한을 **심볼로** 읽어 대조한다.
    expect(
      DENSITIES,
      `★ 노브 상한이 ${MUL_MAX} 인데 겹침 검사가 거기까지 안 간다 — 목록을 갱신하라.`,
    ).toContain(MUL_MAX);
  });

  it('곱 상한이 기존 노브의 최대치를 넘지 않는다 — 아무도 안 재본 세계를 열지 않는다', () => {
    // `?density` 하나만 있던 시절의 최대치가 곧 스모크·게이트가 돌아 본 범위다.
    // `density × building` 을 그대로 두면 4×8×8 = 256 이 되는데 그것은 미측정 영역이다.
    const both = villageLayout({ density: MUL_MAX, building: MUL_MAX, tree: MUL_MAX });
    const densityOnly = villageLayout({ density: MUL_MAX });
    expect(both.maxBuildings).toBe(densityOnly.maxBuildings);
    expect(both.maxTrees).toBe(densityOnly.maxTrees);
  });

  it('배수가 전부 1 이면 기본 레이아웃 **그 자체**를 돌려준다', () => {
    // 참조 동등성이다. 감독이 매일 보는 화면이 이 곱셈을 **지나지 않는다**는 것을
    // 눈이 아니라 단언이 말하게 한다.
    expect(villageLayout({})).toBe(DEFAULT_LAYOUT);
    expect(villageLayout({ density: 1, building: 1, tree: 1 })).toBe(DEFAULT_LAYOUT);
    expect(villageLayout({ density: 2 })).not.toBe(DEFAULT_LAYOUT);
  });

  it('범위 밖 배수는 클램프된다 — 손으로 친 `?bld=99` 가 마을을 날리지 않게', () => {
    expect(villageLayout({ building: 999 }).maxBuildings)
      .toBe(villageLayout({ building: MUL_MAX }).maxBuildings);
    expect(villageLayout({ building: 0 })).toBe(DEFAULT_LAYOUT);
    expect(villageLayout({ building: NaN })).toBe(DEFAULT_LAYOUT);
  });
});
