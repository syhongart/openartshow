// 파셀 동결 — **손본 구역이 계산을 대신하는가**, 그리고 그것이 무엇을 안 깨는가.
//
// ── 두 층 ───────────────────────────────────────────────────────────────────
// ① 순수(`decide/parcel-freeze.ts`) — 색인·tier 필터·`null` vs 빈 배열
// ② 경계(`systems/parcel-builder.ts`) — **그 판정이 실제로 슬롯에 먹는가**
//
// ②가 없으면 «계산된 값이 실제로 소비되는가» 를 아무도 안 본다 — 이 저장소가 구름 `alpha`
// 미소비로 이미 데인 형태이고, 팀장이 기즈모 승인 조건 1로 못 박은 것과 같은 축이다.
//
// ── 이 파일이 지키는 가장 중요한 것 ─────────────────────────────────────────
// **골든 해시가 안 깨진다.** 동결은 `parcelLayout` **바깥**이라 그 함수의 출력이 하나도
// 안 바뀌어야 한다. 깨지면 고칠 것은 해시가 아니라 설계다.

import { describe, it, expect } from 'vitest';
import {
  createFrozenLookup, forTier, indexFrozen, keyOf,
} from '../frontend/js/world2/decide/parcel-freeze.js';
import { parcelLayout } from '../frontend/js/world2/decide/parcel-layout.js';
import { PooledParcelBuilder, type SlotPool } from '../frontend/js/world2/systems/parcel-builder.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';
import type { SlotHandle } from '../frontend/js/world2/systems/instancing.js';

function part(kind: string, x: number, z: number): PlacedPart {
  return { kind, x, y: 0, z, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 } as PlacedPart;
}

describe('동결 조회 — 순수', () => {
  it('좌표로 찾는다', () => {
    const idx = indexFrozen([{ px: 3, pz: -7, parts: [part('building', 1, 2)] }]);
    expect(idx.get(keyOf(3, -7))).toHaveLength(1);
    expect(idx.get(keyOf(0, 0))).toBeUndefined();
  });

  it('★ `null`(안 손댔다)과 빈 배열(다 지웠다)은 다른 뜻이다', () => {
    // 이 둘을 뭉개면 «다 지웠는데 다시 생긴다» 가 된다 — 감독이 비운 구역이 재방문마다
    // 되살아나는 형태이고, 화면에서만 드러난다.
    const look = createFrozenLookup([{ px: 1, pz: 1, parts: [] }]);
    expect(look(1, 1, 'near'), '빈 배열은 「아무것도 놓지 마라」다').toEqual([]);
    expect(look(9, 9, 'near'), 'null 은 「계산해라」다').toBeNull();
  });

  it('동결이 하나도 없으면 언제나 null — 라이브 기본값', () => {
    const look = createFrozenLookup([]);
    expect(look(0, 0, 'near')).toBeNull();
  });

  it('★ 지금 tier 는 아무것도 안 줄인다 — 갈리는 날 이 축이 빨간불이 된다', () => {
    // ⚠ **이 축은 「필터가 동작한다」 를 재지 않는다.** 뮤테이션이 그것을 드러냈다 —
    // `forTier` 의 `filter` 를 통째로 지워도 **0 failed** 였다(2026-08-13). 이유는
    // 단순하다: `kindsFor` 가 near·mid·far 에서 **완전히 같은 목록**을 내므로 거를 것이
    // 없다. 그 상태에서 「거른다」를 재던 옛 축 둘은 **빈 검사**였다.
    //
    // 그래서 재는 대상을 바꿨다 — **지금 항등이라는 사실 자체**를 못 박는다. tier 가
    // 실제로 갈리는 날 이 축이 빨간불이 되고, 그때 `forTier` 와 그것을 재는 검사를
    // 함께 재검토하게 된다. 「검출력 0인 축」을 초록으로 두는 것보다 정직하다.
    const near = parcelLayout(3, -7, 'near');
    for (const tier of ['mid', 'far'] as const) {
      expect(
        forTier(near, tier),
        `★ tier=${tier} 가 near 와 갈렸다 — 이제 필터가 실제로 거른다.`
        + ' `forTier` 의 검출력 축을 여기서 새로 세워라(지금은 항등이라 못 세운다).',
      ).toEqual(near);
      expect(
        parcelLayout(3, -7, tier).length,
        `★ 계산 경로도 tier=${tier} 에서 갈렸다 — LOD 가 실제로 줄이기 시작했다`,
      ).toBe(near.length);
    }
  });

});

// ── 경계 — 동결이 실제로 슬롯에 먹는가 ──────────────────────────────────────

interface Placed { key: string; x: number; z: number }

function makePool(): { pool: SlotPool; placed: Placed[] } {
  const placed: Placed[] = [];
  let n = 0;
  const pool: SlotPool = {
    acquire(key) { return { key, index: n++ } as unknown as SlotHandle; },
    setTransform(h, x, _y, z) { placed.push({ key: (h as unknown as { key: string }).key, x, z }); },
    setTone() { },
    release() { },
  };
  return { pool, placed };
}

function build(frozenAt?: (px: number, pz: number, tier: 'near' | 'mid' | 'far') => readonly PlacedPart[] | null) {
  const { pool, placed } = makePool();
  const b = new PooledParcelBuilder({ pool, cellX: 40, cellZ: 40, frozenAt });
  b.build(0, 0, 'near');
  return placed;
}

describe('동결 경계 — 빌더가 실제로 쓰는가', () => {
  it('동결이 없으면 계산한 대로 놓는다', () => {
    const placed = build();
    const computed = parcelLayout(0, 0, 'near');
    expect(placed.length, '★ 계산 경로가 깨졌다').toBe(computed.length);
  });

  it('★ 동결이 있으면 그것을 놓는다 — 계산을 안 쓴다', () => {
    const frozen = [part('building', 7, 9)];
    const placed = build((px, pz) => (px === 0 && pz === 0 ? frozen : null));
    expect(placed.length, '★ 동결 배열이 안 먹었다 — 계산 결과가 그대로 놓였다').toBe(1);
    // 파셀 원점(0,0)이라 로컬 좌표가 곧 월드 좌표다
    expect(placed[0].x).toBe(7);
    expect(placed[0].z).toBe(9);
  });

  it('★ 빈 배열로 동결하면 아무것도 안 놓는다', () => {
    const placed = build(() => []);
    expect(placed.length, '★ 다 지웠는데 되살아났다').toBe(0);
  });

  it('다른 파셀은 그대로 계산된다 — 예외는 파셀 단위이고 전역이 아니다', () => {
    const { pool, placed } = makePool();
    const b = new PooledParcelBuilder({
      pool, cellX: 40, cellZ: 40,
      frozenAt: (px, pz) => (px === 0 && pz === 0 ? [] : null),
    });
    b.build(1, 0, 'near'); // 동결 안 한 파셀
    expect(placed.length, '★ 한 파셀을 동결했더니 다른 파셀까지 비었다').toBeGreaterThan(0);
  });
});

describe('동결은 계산을 오염시키지 않는다', () => {
  it('★ `parcelLayout` 은 동결을 모른다 — 골든 해시가 이 개정 뒤에도 그대로다', () => {
    // 이 축이 깨지면 누군가 `parcelLayout` 안에 분기를 넣은 것이다. 그때 고칠 것은
    // 해시가 아니라 설계다(`parcel-layout.ts` 헤더 · `parcel-freeze.ts` 헤더).
    //
    // 골든 해시 자체는 `world2-parcel-layout-golden.test.ts` 가 잠근다. 여기서는
    // **같은 입력이 같은 출력을 낸다**(동결이 있든 없든)를 직접 본다 — 동결 조회를
    // 만들어 두고 계산을 다시 돌려도 결과가 안 바뀌어야 한다.
    const before = parcelLayout(3, -7, 'near');
    createFrozenLookup([{ px: 3, pz: -7, parts: [part('building', 0, 0)] }]);
    const after = parcelLayout(3, -7, 'near');
    expect(after).toEqual(before);
  });
});
