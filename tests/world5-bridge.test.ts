// world5 다리 배치 — **검수관 블로커 B2 의 게이트.**
//
// ── 무엇이 났었나 ────────────────────────────────────────────────────────────
// 센트럴파크 호수를 `(0,−4)` 에 놓았더니 `bridge.place` 의 ② 물 가드
// (`parcelWater(px,pz) === 'water'` 면 배치 안 함)에 걸려 **중앙 다리가 소리 없이
// 사라졌다.** 남은 다리 둘은 스폰에서 392m — far 반경 76.8m 의 다섯 배라 화면에 없는
// 것과 같았다. 감독이 *"맨해튼 다리도 있고"* 를 지목했는데 첫 화면에 다리가 없었다.
//
// 그 실패는 **아무 데도 안 나타난다.** `bridge.ts` 의 ⑤ 주석이 이미 그렇게 적어 두었다 —
// *"`starved` 는 슬롯 고갈에서만 오르고, 여기서 `[]` 를 돌려주면 조립부는 이 파셀에
// 다리를 요청하지도 않는다."* 그 예언대로 됐고, 예언을 적어 둔 것만으로는 못 막았다.
// 그래서 **개수를 세는 게이트**로 만든다.
//
// ⚠️ 이 파일은 `place`(순수 배치)만 부른다. `asset` 은 three 를 요구하므로 여기서
//    돌리지 않는다 — 발광 배선은 `tests/world5-neon-glow.test.ts` 소관이다.

import { describe, it, expect } from 'vitest';
import { bridge } from '../frontend/js/world5/parts/bridge.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world5/parts/types.js';
import type { PlaceContext } from '../frontend/js/world5/parts/types.js';
import { GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z, SPAWN } from '../frontend/js/world5/decide/grid.js';
import { DEFAULT_BANDS } from '../frontend/js/world5/decide/lod.js';
import { parcelWater } from '../frontend/js/world5/decide/water.js';

const O = DEFAULT_LAYOUT;
const CX = O.cellX;
const CZ = O.cellZ;

/** far tier 가 그리기를 멈추는 거리(미터). 상수로 적으면 밴드를 바꿔도 안 따라온다 */
const FAR_M = DEFAULT_BANDS.farExit * CX;

function placeAt(px: number, pz: number) {
  const ctx = {
    px, pz,
    // 다리는 난수를 하나도 안 쓴다(`place` 주석). 그래도 계약상 필요하므로 고정값을
    // 준다 — 여기서 결과가 난수에 흔들리면 그 자체가 회귀다.
    rnd: () => 0.5,
    o: O,
    halfX: CX / 2,
    halfZ: CZ / 2,
    placed: [],
  } as unknown as PlaceContext;
  return bridge.place(ctx);
}

/** 다리를 소유한 파셀 전부 — 소유는 강 **북쪽 물가** 한쪽만 한다(`bridge.ts`) */
function bridgeOwners() {
  const out: { px: number; pz: number; spans: number; dist: number }[] = [];
  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      const spans = placeAt(px, pz).length;
      if (spans > 0) {
        out.push({
          px, pz, spans,
          dist: Math.hypot(px * CX - SPAWN.x, pz * CZ - SPAWN.z),
        });
      }
    }
  }
  return out;
}

describe('다리 — 실제로 서는가 (B2)', () => {
  it('다리를 소유한 파셀이 하나 이상 있다', () => {
    expect(bridgeOwners().length).toBeGreaterThan(0);
  });

  // ★ B2 의 본체. 다리가 "어딘가에 있다" 로는 부족하다 — 감독이 다리를 지목했고,
  //   far 반경 밖의 다리는 화면에 없는 것과 같다.
  it('스폰 far 반경 안에 다리가 하나 이상 있다', () => {
    const near = bridgeOwners().filter((b) => b.dist <= FAR_M);
    expect(near.length).toBeGreaterThanOrEqual(1);
  });

  it('다리 열이 셋이다 — 하나면 병목, 파셀마다면 덮개', () => {
    // `BRIDGE_EVERY` 주석의 실측(px = −9, 0, 9)을 못 박는다. 간격을 바꾸면 여기가
    // 깨지고, 그때 주석의 "서너 개" 도 함께 다시 세게 된다.
    const cols = new Set(bridgeOwners().map((b) => b.px));
    expect(cols.size).toBe(3);
  });

  it('소유 파셀은 뭍이고 그 남쪽 이웃이 물이다 — 한쪽만 소유하는 규칙', () => {
    for (const b of bridgeOwners()) {
      expect(parcelWater(b.px, b.pz, CX, CZ)).not.toBe('water');
      expect(parcelWater(b.px, b.pz + 1, CX, CZ)).toBe('water');
    }
  });

  it('구간 수가 maxPerParcel 예산을 넘지 않는다 — 넘으면 뒤 구간이 조용히 잘린다', () => {
    const budget = bridge.maxPerParcel!(O);
    for (const b of bridgeOwners()) expect(b.spans).toBeLessThanOrEqual(budget);
  });

  it('건너편이 뭍이다 — 다리가 바다로 뻗지 않는다', () => {
    for (const b of bridgeOwners()) {
      // 마지막 구간이 닿는 칸. `place` 가 `rows` 를 센 뒤 `rows+1` 개 구간을 내므로
      // 건너편 물가는 `pz + spans` 다.
      expect(parcelWater(b.px, b.pz + b.spans, CX, CZ)).not.toBe('water');
    }
  });
});
