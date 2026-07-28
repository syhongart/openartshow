// 파셀 안 물건이 서로 겹치지 않는가 — **이 기능의 성패가 여기 있다.**
//
// ── 감독 지시에서 생겼다 ────────────────────────────────────────────────────
// *"나무 건물 다른 것들 가로등, 겹쳐져 있는 것들이 보여. 구획을 잘 배치해서 균형,
// 통일감 있게 보이게 해줘."*
//
// ── 왜 검사가 핵심인가 ──────────────────────────────────────────────────────
// 겹침은 **눈으로 찾는 결함**이었다. 감독이 화면을 보고 지적할 때까지 아무도 몰랐고,
// 그 전에도 같은 계열이 두 번 있었다(건물끼리 붙어 섬 · 사분면 경계에서 만남). 매번
// 눈이 게이트였다.
//
// 배치가 순수 함수라 **전수에 가깝게 물어볼 수 있다.** 그러면 이 결함은 다시 눈에
// 의존하지 않는다. `pickInQuadrant` 주석이 *"1024 파셀 표본에서 실제로 4건 나왔다"* 고
// 적은 것도 같은 방식의 조사였는데, 그때는 조사로 끝나고 검사로 남지 않았다.

import { describe, it, expect } from 'vitest';
import { parcelLayout, DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { specFor, PARTS } from '../frontend/js/world2/parts/index.js';
import {
  parcelSlots, freeSlots, takeSlots, jitterIn, SLOTS_PER_PARCEL,
} from '../frontend/js/world2/decide/parcel-slots.js';
import { roadDirs, lampAnchors, LAMP_CLEARANCE } from '../frontend/js/world2/parts/road-topology.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';

const TIERS = ['near', 'mid', 'far'] as const;
const HALF_X = DEFAULT_LAYOUT.cellX / 2 - DEFAULT_LAYOUT.margin;
const HALF_Z = DEFAULT_LAYOUT.cellZ / 2 - DEFAULT_LAYOUT.margin;

const radiusOf = (p: PlacedPart) => specFor(p.kind)?.footprint(p) ?? 0;

/** 두 부품이 바닥에서 겹치는가. 겹침 깊이를 함께 돌려준다 — 얼마나 나쁜지 알아야 한다 */
function overlap(a: PlacedPart, b: PlacedPart): number {
  const ra = radiusOf(a);
  const rb = radiusOf(b);
  if (ra <= 0 || rb <= 0) return 0; // 평면은 겹침 개념이 없다
  const d = Math.hypot(a.x - b.x, a.z - b.z);
  return Math.max(0, ra + rb - d);
}

/** 파셀 하나의 겹치는 쌍 목록 */
function overlapsIn(px: number, pz: number, tier: (typeof TIERS)[number]) {
  const parts = parcelLayout(px, pz, tier);
  const bad: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const d = overlap(parts[i], parts[j]);
      if (d > 1e-9) {
        bad.push(`(${px},${pz},${tier}) ${parts[i].kind}×${parts[j].kind} ${d.toFixed(2)}m`);
      }
    }
  }
  return bad;
}

describe('겹침이 사라졌는가 — 감독 지적의 본체', () => {
  it('41×41 파셀 × 3 tier 에서 겹치는 쌍이 하나도 없다', () => {
    const bad: string[] = [];
    for (let px = -20; px <= 20; px++) {
      for (let pz = -20; pz <= 20; pz++) {
        for (const t of TIERS) bad.push(...overlapsIn(px, pz, t));
      }
    }
    // 실패하면 어디가 얼마나 겹쳤는지 보여준다 — "0이 아니다" 만으로는 고칠 수 없다.
    expect(bad.slice(0, 12), `겹침 ${bad.length}건 (앞 12건)`).toEqual([]);
  });

  it('가로등 자리도 비어 있다 — 그려지지 않는 tier 에서도', () => {
    // 자리는 tier 와 무관한 **예약**이다. 가로등이 안 그려지는 거리에서 다른 물건이
    // 그 자리에 들어오면, 가까이 왔을 때 등이 나무 속에서 켜진다.
    const bad: string[] = [];
    for (let px = -12; px <= 12; px++) {
      for (let pz = -12; pz <= 12; pz++) {
        const anchors = lampAnchors(DEFAULT_LAYOUT, roadDirs(px, pz));
        for (const t of TIERS) {
          for (const p of parcelLayout(px, pz, t)) {
            if (p.kind === 'lamp') continue;
            const r = radiusOf(p);
            if (r <= 0) continue;
            for (const a of anchors) {
              const d = Math.hypot(p.x - a.x, p.z - a.z);
              if (d < r + LAMP_CLEARANCE - 1e-9) {
                bad.push(`(${px},${pz},${t}) ${p.kind} 이 가로등 자리 침범 ${(r + LAMP_CLEARANCE - d).toFixed(2)}m`);
              }
            }
          }
        }
      }
    }
    expect(bad.slice(0, 12), `침범 ${bad.length}건`).toEqual([]);
  });
});

describe('tier 포함관계가 유지되는가 — 자리를 서로 참조하게 됐으니 위험이 커졌다', () => {
  // 파츠가 `placed` 를 보게 되면서 새 위험이 생겼다: **좁은 tier 의 파츠를 참조하면**
  // 그것이 사라지는 tier 에서 위치가 달라진다. 가로등을 예약으로 뺀 이유가 그것이고,
  // 이 검사가 그 처방이 실제로 듣는지 본다.
  //
  // 원래 불변식: far ⊆ mid ⊆ near 이고 **공통 원소의 위치가 같다.**
  it('같은 종류는 tier 가 달라도 같은 자리에 있다', () => {
    const bad: string[] = [];
    for (let px = -14; px <= 14; px++) {
      for (let pz = -14; pz <= 14; pz++) {
        const near = parcelLayout(px, pz, 'near');
        for (const t of ['mid', 'far'] as const) {
          for (const p of parcelLayout(px, pz, t)) {
            const twin = near.find(
              (q) => q.kind === p.kind
                && Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.z - p.z) < 1e-9
                && Math.abs(q.sx - p.sx) < 1e-9,
            );
            if (!twin) bad.push(`(${px},${pz}) ${t} 의 ${p.kind} (${p.x.toFixed(2)},${p.z.toFixed(2)}) 가 near 에 없다`);
          }
        }
      }
    }
    expect(bad.slice(0, 8), `불일치 ${bad.length}건`).toEqual([]);
  });
});

describe('결정론 — 같은 좌표는 언제나 같은 세상', () => {
  it('두 번 계산한 결과가 완전히 같다', () => {
    for (const [px, pz] of [[0, 0], [3, -7], [-11, 5], [20, 20]] as const) {
      for (const t of TIERS) {
        expect(parcelLayout(px, pz, t)).toEqual(parcelLayout(px, pz, t));
      }
    }
  });
});

describe('슬롯 예산 — 파츠가 신고한 최대치를 실제로 넘지 않는가', () => {
  // 신고치가 실제보다 작으면 부품이 조용히 안 그려진다. 슬롯 제한이 생겨 실제 개수는
  // 줄어들 수 있지만, **상한은 여전히 상한이어야** 한다.
  it('어떤 파셀도 신고한 개수를 넘기지 않는다', () => {
    const over: string[] = [];
    for (let px = -20; px <= 20; px++) {
      for (let pz = -20; pz <= 20; pz++) {
        for (const t of TIERS) {
          const count = new Map<string, number>();
          for (const p of parcelLayout(px, pz, t)) {
            count.set(p.kind, (count.get(p.kind) ?? 0) + 1);
          }
          for (const [kind, n] of count) {
            const max = specFor(kind)!.maxPerParcel(DEFAULT_LAYOUT);
            if (n > max) over.push(`(${px},${pz},${t}) ${kind} ${n} > ${max}`);
          }
        }
      }
    }
    expect(over.slice(0, 8), `초과 ${over.length}건`).toEqual([]);
  });
});

describe('슬롯 계산 자체', () => {
  it('파셀당 슬롯 수가 상수다 — 예산 계산이 이 값에 기댄다', () => {
    for (const dirs of [[], ['east'], ['north', 'south', 'east', 'west']] as const) {
      expect(parcelSlots(DEFAULT_LAYOUT, HALF_X, HALF_Z, dirs)).toHaveLength(SLOTS_PER_PARCEL);
    }
  });

  it('슬롯끼리 겹치지 않는다 — 겹치면 두 물건이 각자 빈 자리를 잡고도 부딪힌다', () => {
    const slots = parcelSlots(DEFAULT_LAYOUT, HALF_X, HALF_Z, ['north', 'south', 'east', 'west']);
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const d = Math.hypot(slots[i].x - slots[j].x, slots[i].z - slots[j].z);
        expect(d, `슬롯 ${i}×${j}`).toBeGreaterThanOrEqual(slots[i].r + slots[j].r - 1e-9);
      }
    }
  });

  it('흔들림이 슬롯을 벗어나지 않는다 — 벗어나면 겹침 보장이 깨진다', () => {
    const s = { q: 0, x: 10, z: 10, r: 1.6 };
    const myR = 0.5;
    let a = 12345;
    const rnd = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
    for (let i = 0; i < 500; i++) {
      const p = jitterIn(rnd, s, myR);
      const d = Math.hypot(p.x - s.x, p.z - s.z);
      expect(d).toBeLessThanOrEqual(s.r - myR + 1e-9);
    }
  });

  it('물건이 슬롯보다 크면 중심에 그대로 선다 — 억지로 흔들면 삐져나간다', () => {
    const s = { q: 0, x: 4, z: -4, r: 1.0 };
    const p = jitterIn(() => 0.9, s, 2.0);
    expect(p.x).toBe(s.x);
    expect(p.z).toBe(s.z);
  });
});

describe('freeSlots — 자리 판정 그 자체', () => {
  const slots = parcelSlots(DEFAULT_LAYOUT, HALF_X, HALF_Z, ['east']);

  it('아무것도 없으면 전부 비어 있다', () => {
    expect(freeSlots(slots, [], radiusOf, 0.5)).toHaveLength(SLOTS_PER_PARCEL);
  });

  it('큰 것이 놓이면 그 둘레 슬롯이 빠진다', () => {
    const big: PlacedPart = {
      kind: 'building', x: slots[0].x, z: slots[0].z, y: 0, ry: 0,
      sx: 8, sy: 6, sz: 8, tone: 0,
    };
    const free = freeSlots(slots, [big], radiusOf, 0.5);
    expect(free.length).toBeLessThan(SLOTS_PER_PARCEL);
    expect(free.some((s) => s.x === slots[0].x && s.z === slots[0].z)).toBe(false);
  });

  it('평면(footprint 0)은 아무 자리도 막지 않는다', () => {
    const flat: PlacedPart = {
      kind: 'garden', x: 0, z: 0, y: 0, ry: 0, sx: 32, sy: 1, sz: 32, tone: 0,
    };
    expect(freeSlots(slots, [flat], radiusOf, 0.5)).toHaveLength(SLOTS_PER_PARCEL);
  });

  it('큰 물건일수록 들어갈 자리가 적거나 같다 — 단조성', () => {
    const small = freeSlots(slots, [], radiusOf, 0.3).length;
    const large = freeSlots(slots, [], radiusOf, 3.0, [{ x: 8, z: 6.25, r: 0.9 }]).length;
    expect(large).toBeLessThanOrEqual(small);
  });
});

describe('takeSlots — 같은 파츠끼리도 겹치지 않게', () => {
  const slots = parcelSlots(DEFAULT_LAYOUT, HALF_X, HALF_Z, ['east', 'west']);
  const rndFrom = (seed: number) => {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };

  it('고른 자리끼리 겹치지 않는다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const taken = takeSlots(rndFrom(seed), slots, 6, 1.2);
      for (let i = 0; i < taken.length; i++) {
        for (let j = i + 1; j < taken.length; j++) {
          const d = Math.hypot(taken[i].x - taken[j].x, taken[i].z - taken[j].z);
          expect(d, `seed ${seed}`).toBeGreaterThanOrEqual(2.4 - 1e-9);
        }
      }
    }
  });

  it('요청보다 많이 주지 않는다', () => {
    expect(takeSlots(rndFrom(7), slots, 3, 0.5).length).toBeLessThanOrEqual(3);
  });

  it('자리가 모자라면 있는 만큼만 — 억지로 밀어 넣지 않는다', () => {
    const taken = takeSlots(rndFrom(9), slots, 999, 2.0);
    expect(taken.length).toBeLessThan(999);
    expect(taken.length).toBeGreaterThan(0);
  });
});

describe('파츠 계약 — 새 파츠가 반경 신고를 빠뜨리지 않게', () => {
  it('모든 파츠가 footprint 를 가진다', () => {
    for (const p of PARTS) expect(typeof p.footprint, p.kind).toBe('function');
  });

  it('반경이 음수가 아니다 — 음수면 겹침 판정이 조용히 무력화된다', () => {
    const sample: PlacedPart = {
      kind: 'x', x: 0, z: 0, y: 0, ry: 0, sx: 1.5, sy: 1.5, sz: 1.5, tone: 0,
    };
    for (const p of PARTS) expect(p.footprint(sample), p.kind).toBeGreaterThanOrEqual(0);
  });

  it('자리가 굳은 파츠가 유연한 파츠보다 앞에 온다 — 순서가 곧 보호 순위다', () => {
    // `placed` 는 **앞선 것만** 담는다. 랜드마크가 나무 뒤에 있으면 나무가 먼저 중앙을
    // 차지한 뒤 분수가 그 위에 박힌다(실제로 그 순서였고, 이 검사가 그것을 막는다).
    const idx = (k: string) => PARTS.findIndex((p) => p.kind === k);
    for (const fixed of ['fountain', 'clock', 'building']) {
      for (const flexible of ['tree', 'bench', 'planter']) {
        expect(idx(fixed), `${fixed} 는 ${flexible} 앞에 와야 한다`).toBeLessThan(idx(flexible));
      }
    }
  });
});
