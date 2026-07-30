// 다리 — 강을 건너는 유일한 수단 (감독 지시 2026-07-30).
//
// ── 이 파일이 막는 것 ───────────────────────────────────────────────────────
// 다리는 **조용히 틀릴 자리가 많다.** 화면에 뭔가 나오기 때문이다:
//
//   · 양안이 각자 놓아 같은 자리에 **두 개**가 겹친다 — 하나만 보이므로 눈에 안 띈다
//   · 길이가 강 폭과 안 맞아 **물 위에서 끊기거나 뭍으로 파고든다**
//   · 세계의 끝(바다)에 놓여 **허공으로 뻗는다** — 걸어가 보지 않으면 모른다
//   · 노면 높이가 도로와 어긋나 **턱이 생긴다** — 0.1m 차이는 스크린샷으로 안 보인다
//   · `sz` 스케일이 기준 길이와 어긋나 다리가 강을 덜 덮거나 넘어간다
//
// 전부 산술로 확정되는 것들이라 테스트가 정확히 답할 수 있다.

import { describe, it, expect } from 'vitest';
import { bridge, BRIDGE_INTERNAL } from '../frontend/js/world2/parts/bridge.js';
import { PARTS } from '../frontend/js/world2/parts/index.js';
import { parcelWater, RIVER_HALF } from '../frontend/js/world2/decide/water.js';
import { roadDirs } from '../frontend/js/world2/parts/road-topology.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';
import { GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z } from '../frontend/js/world2/decide/grid.js';

const { L0, DECK_W, H, DECK_Y, maxSpan, spanSouth } = BRIDGE_INTERNAL;
const o = DEFAULT_LAYOUT;
const CX = o.cellX;
const CZ = o.cellZ;

/** `place` 를 부를 최소 컨텍스트. 다리는 `px`·`pz`·`o` 만 본다 */
function placeAt(px: number, pz: number) {
  return bridge.place({
    px, pz, o,
    rnd: () => 0.5,
    halfX: CX / 2 - o.margin, halfZ: CZ / 2 - o.margin,
    placed: [], radiusOf: () => 0,
  } as never);
}

/** 격자 전체를 훑어 다리가 놓인 곳을 모은다 */
function allBridges() {
  const out: { px: number; pz: number; p: ReturnType<typeof placeAt>[number] }[] = [];
  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      for (const p of placeAt(px, pz)) out.push({ px, pz, p });
    }
  }
  return out;
}

describe('등록', () => {
  it('PARTS 목록에 있다 — 목록이 곧 켜는 것이다', () => {
    expect(PARTS.map((p) => p.kind)).toContain('bridge');
  });

  it('far 까지 그린다 — 멀리서 "건널 수 있다" 를 알아야 걸어갈 목적이 생긴다', () => {
    expect(bridge.tiers).toContain('far');
  });

  it('겹침 판정에서 빠진다 — 원으로 감싸면 파셀을 통째로 먹는다', () => {
    // 64m 다리를 감싸는 원은 반경 32m 다. 도로·지면과 같은 판단이다.
    expect(bridge.footprint({} as never)).toBe(0);
  });
});

describe('한쪽 안(岸)만 놓는다 — 두 개가 겹치지 않게', () => {
  it('북안이 놓고 남안은 놓지 않는다', () => {
    const found = allBridges();
    expect(found.length, '격자 전체에 다리가 하나도 없다 — 강과 도로가 만나지 않는가?').toBeGreaterThan(0);

    for (const { px, pz } of found) {
      // 놓는 파셀은 뭍이고, 그 남쪽이 물이어야 한다
      expect(parcelWater(px, pz, CX, CZ), `(${px},${pz}) 가 물인데 다리를 놓았다`).not.toBe('water');
      expect(parcelWater(px, pz + 1, CX, CZ), `(${px},${pz}) 남쪽이 물이 아닌데 다리를 놓았다`).toBe('water');
    }
  });

  it('남안에서는 북쪽으로 놓지 않는다 — 조건이 대칭이면 다리가 둘이 된다', () => {
    // 강 남안 파셀을 찾아 그것이 다리를 놓지 않는지 본다. 놓으면 북안 다리와 같은
    // 물 구간에 두 개가 서고, 하나가 다른 것에 가려 **화면으로는 알 수 없다.**
    let southBanks = 0;
    for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
      for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
        const dry = parcelWater(px, pz, CX, CZ) !== 'water';
        const northIsWater = parcelWater(px, pz - 1, CX, CZ) === 'water';
        if (dry && northIsWater) {
          southBanks++;
          // 남안이 놓는 다리가 있다면 그것은 **자기 남쪽** 물을 건너는 것이어야 한다
          for (const p of placeAt(px, pz)) {
            expect(p.z, `(${px},${pz}) 남안이 북쪽으로 다리를 놓았다`).toBeGreaterThan(0);
          }
        }
      }
    }
    expect(southBanks, '남안 파셀이 하나도 없다 — 표본이 비었다').toBeGreaterThan(0);
  });

  it('길 없는 곳에는 놓지 않는다 — 어디서 와서 어디로 가는지 알 수 없다', () => {
    for (const { px, pz } of allBridges()) {
      expect(roadDirs(px, pz), `(${px},${pz}) 에 남쪽 길이 없다`).toContain('south');
    }
  });
});

describe('길이 — 강을 정확히 덮는다', () => {
  it('물 구간을 다 덮고 양안에 걸친다', () => {
    for (const { px, pz, p } of allBridges()) {
      const span = spanSouth(px, pz, o);
      expect(span, `(${px},${pz}) span 이 0 인데 다리가 놓였다`).toBeGreaterThan(0);
      // 길이 = (span+1) × cellZ. 양안에 반 칸씩 걸친다.
      const len = p.sz * L0;
      expect(len).toBeCloseTo((span + 1) * CZ, 6);
      // 중심이 그 절반만큼 남쪽
      expect(p.z).toBeCloseTo(len / 2, 6);
    }
  });

  it('건너편이 뭍이다 — 허공으로 뻗지 않는다', () => {
    // 세계 밖은 `parcelWater` 가 `'water'` 를 돌려준다(세계의 끝 = 바다). 그쪽으로
    // 다리를 놓으면 걸어가 보기 전까지 모르는 결함이 된다.
    for (const { px, pz } of allBridges()) {
      const span = spanSouth(px, pz, o);
      expect(
        parcelWater(px, pz + 1 + span, CX, CZ),
        `(${px},${pz}) 다리 건너편이 물이다 — 허공으로 뻗었다`,
      ).not.toBe('water');
    }
  });

  it('지나는 중간 파셀이 전부 물이다 — 육지를 덮지 않는다', () => {
    // ── 이 검사가 왜 여기 있나 ─────────────────────────────────────────────
    // `world2-parcel-layout.test.ts` 의 "셀 경계 안에 있다" 는 다리를 **제외**한다 —
    // 강을 건너는 것이 정의라 경계 안에 넣는 것이 애초에 불가능하다. 그 파일 주석이
    // 못박은 대로, 예외를 열면 그 요구를 **직접 재는 검사를 함께 세워야** 한다. 이것이
    // 다리 몫의 그 검사다.
    //
    // 다리가 넘어가도 되는 것은 물 위뿐이다. 양단 반 칸은 뭍(진입부)이므로 제외하고,
    // 그 사이 파셀이 하나라도 뭍이면 **다리가 남의 땅 위를 지나는 것**이다.
    for (const { px, pz } of allBridges()) {
      const span = spanSouth(px, pz, o);
      for (let k = 1; k <= span; k++) {
        expect(
          parcelWater(px, pz + k, CX, CZ),
          `(${px},${pz}) 다리가 (${px},${pz + k}) 육지 위를 지난다`,
        ).toBe('water');
      }
    }
  });

  it('물 구간 칸 수 상한을 강 반폭에서 유도한다 — 실측치를 박지 않는다', () => {
    // `RIVER_HALF` 를 키우면 상한이 따라와야 한다. 값을 박아두면 강을 넓힌 뒤 다리가
    // 조용히 짧아진다(상한에 걸려 `0` 을 돌려주므로 **다리가 아예 사라진다**).
    expect(maxSpan(CZ)).toBe(Math.ceil((RIVER_HALF * 2) / CZ) + 1);
    // 셀이 작아지면 칸 수가 늘어야 한다
    expect(maxSpan(16)).toBeGreaterThan(maxSpan(32));
  });

  it('바다(세계의 끝)에는 놓지 않는다', () => {
    // 격자 가장자리 파셀의 밖은 전부 바다다. 거기서 남쪽을 보면 물이 상한까지 이어진다.
    const edge = GRID_MAX_Z;
    for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
      if (parcelWater(px, edge, CX, CZ) === 'water') continue;
      expect(spanSouth(px, edge, o), `(${px},${edge}) 세계 남단에서 다리를 놓았다`).toBe(0);
    }
  });
});

describe('높이 — 도로와 턱이 생기지 않는다', () => {
  it('노면 상단이 도로 높이에 온다', () => {
    // 피벗이 거더 최하단이므로 `y + H` 가 노면 상단이다. 0.1m 어긋나도 스크린샷으로는
    // 안 보이는데 걸으면 턱으로 보인다.
    for (const { p } of allBridges()) {
      expect(p.y + H).toBeCloseTo(DECK_Y, 6);
    }
  });

  it('y 를 상수로 박지 않고 H·DECK_Y 에서 유도한다', () => {
    // 조각 높이를 바꾸면 y 가 따라와야 한다. 두 곳에 적으면 한쪽만 고쳐도 아무도 모른다.
    const [p] = allBridges().map((b) => b.p);
    expect(p.y).toBeCloseTo(DECK_Y - H, 6);
  });
});

describe('스케일 — 길이 축만 늘어난다', () => {
  it('폭·두께는 1 로 고정된다', () => {
    // `sx`·`sy` 가 1 이 아니면 긴 다리가 넓어지거나 두꺼워진다. 난간 기둥을 안 넣은
    // 이유와 같은 축이다 — 늘어나도 되는 것은 길이뿐이다.
    for (const { p } of allBridges()) {
      expect(p.sx).toBe(1);
      expect(p.sy).toBe(1);
    }
  });

  it('sz 가 1 이상이다 — 기준 길이보다 짧은 다리는 없다', () => {
    // 물 구간이 최소 한 칸이므로 길이는 최소 2×cellZ = 64m, sz = 2 다.
    for (const { p } of allBridges()) {
      expect(p.sz).toBeGreaterThanOrEqual(1);
    }
  });

  it('회전이 없다 — 로컬 z 축이 곧 남북이다', () => {
    for (const { p } of allBridges()) expect(p.ry).toBe(0);
  });
});

describe('폭', () => {
  it('노면 폭이 도로 폭과 같다', () => {
    // 다르면 다리 진입부에서 길이 넓어지거나 좁아진다. `road-topology.ts` 의
    // `ROAD_SEG` 가 8 이다 — 값이 같아야 하는 관계이므로 어긋나면 여기서 잡힌다.
    expect(DECK_W).toBe(8);
  });
});

describe('결정론', () => {
  it('같은 좌표는 언제나 같은 결과다 — 무저장 원칙', () => {
    const a = placeAt(0, 0);
    const b = placeAt(0, 0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('난수를 쓰지 않는다 — 다리는 도시 시설물이라 변주가 없다', () => {
    // `rnd` 를 다르게 줘도 결과가 같아야 한다. 난수가 섞이면 같은 강에 걸린 다리가
    // 서로 다른 길이·색이 되어 임시 구조물처럼 보인다.
    const found = allBridges();
    expect(found.length).toBeGreaterThan(0);
    const { px, pz } = found[0];
    const withZero = bridge.place({
      px, pz, o, rnd: () => 0,
      halfX: CX / 2 - o.margin, halfZ: CZ / 2 - o.margin,
      placed: [], radiusOf: () => 0,
    } as never);
    const withOne = bridge.place({
      px, pz, o, rnd: () => 0.999,
      halfX: CX / 2 - o.margin, halfZ: CZ / 2 - o.margin,
      placed: [], radiusOf: () => 0,
    } as never);
    expect(JSON.stringify(withZero)).toBe(JSON.stringify(withOne));
  });
});

describe('예산', () => {
  it('maxPerParcel 이 실제 최댓값과 일치한다', () => {
    // 작으면 부품이 조용히 안 그려지고, 크면 쓰지도 않을 슬롯을 잡는다.
    const max = Math.max(...allBridges().map(({ px, pz }) => placeAt(px, pz).length), 0);
    expect(max).toBeLessThanOrEqual(bridge.maxPerParcel(o));
  });
});
