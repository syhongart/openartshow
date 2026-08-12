// 밀도를 올려도 겹치지 않는가 — **`world2-parcel-slots.test.ts` 가 원리상 못 보는 축.**
//
// ── 왜 별도 파일인가 ────────────────────────────────────────────────────────
// 그 파일의 겹침 불변식은 `parcelLayout(px, pz, tier)` 를 **레이아웃 인자 없이** 부른다
// → `DEFAULT_LAYOUT`(`maxBuildings: 4`) 만 본다. 그런데 `?density=N` 노브가
// `main.ts:259` 에서 `maxBuildings` 를 `4 × N` 으로 만든다. **밀도를 올린 세계는 어느
// 검사도 좌표를 보지 않았다.**
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
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parcelLayout, DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
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

/** `?density=N` 이 만드는 레이아웃. `main.ts:257-261` 과 **같은 식**이어야 한다. */
function densityLayout(n: number): LayoutOptions {
  return {
    ...DEFAULT_LAYOUT,
    maxBuildings: DEFAULT_LAYOUT.maxBuildings * n,
    maxTrees: DEFAULT_LAYOUT.maxTrees * n,
  };
}

describe('밀도를 올려도 겹치지 않는다', () => {
  // 노브 상한이 8 이므로(`main.ts:232` `readNum('density', 1, 1, 8)`) 그 양 끝과 중간을 본다.
  // 값을 여기 적는 대신 노브에서 유도하고 싶지만 `readDensity` 는 `location` 을 읽는
  // 브라우저 함수라 테스트에서 못 부른다 — 대신 **상한을 벗어나면 이 목록이 낡는다**는
  // 것을 아래 `노브 상한과 짝` 단언이 잡는다.
  for (const n of [1, 2, 4, 8]) {
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

  it('밀도를 올리면 건물이 실제로 늘어난다 — 겹침을 막느라 아무것도 안 놓으면 노브가 죽는다', () => {
    // 겹침 0 은 "건물을 하나도 안 놓는다" 로도 달성된다. 그 퇴화를 막는 짝 단언이다.
    const count = (n: number) => {
      let total = 0;
      for (let px = -6; px <= 6; px++) {
        for (let pz = -6; pz <= 6; pz++) {
          total += parcelLayout(px, pz, 'near', densityLayout(n))
            .filter((p) => p.kind === 'building').length;
        }
      }
      return total;
    };
    const one = count(1);
    const eight = count(8);
    expect(one).toBeGreaterThan(0);
    expect(eight, `density=1 은 ${one}채, density=8 은 ${eight}채 — 늘지 않으면 노브가 장식이다`)
      .toBeGreaterThan(one);
  });
});

describe('노브 상한과 짝', () => {
  it('main.ts 의 density 상한이 8 이다 — 위 목록이 그 상한을 덮는다', () => {
    // 상한이 바뀌면 위 `[1,2,4,8]` 이 조용히 낡는다. 소스를 직접 읽어 못박는다 —
    // 값을 테스트에 복사하는 것이 아니라 **두 곳이 어긋나면 빨간불**이 되게 하는 축이다.
    const src = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend/js/world2/main.ts'),
      'utf8',
    );
    const m = src.match(/readNum\('density',\s*1,\s*1,\s*(\d+)\)/);
    expect(m, "★ main.ts 에서 `readNum('density', 1, 1, N)` 을 못 찾았다 — 노브가 바뀌었으면 위 목록도 함께 본다.").not.toBeNull();
    expect(Number(m![1]), '★ density 상한이 바뀌었다 — 위 겹침 검사의 n 목록을 갱신하라.').toBe(8);
  });
});
