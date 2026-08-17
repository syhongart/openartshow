// @vitest-environment node
//
// **작품 조명** — 판정 (W8-4). world2 에 실제 라이트를 넣는 첫 사례라 **팀장 조건 6개가
// 구속**이고, 이 파일은 그중 순수 쪽에서 검사 가능한 것을 전부 검사로 만든다.
//
// | 조건 | 여기서 재는가 |
// |---|---|
// | 1 개수 불변 절대 | **부분** — 풀 크기가 상수임을 잰다. 「세션 중 안 바뀐다」는 집행부 |
// | 2 풀 크기는 유도한다 | ★ **잰다** — 밴드를 바꾸면 풀이 따라오는지 |
// | 3 soft 완화 축 | ★ **잰다** — 켜는 수만 줄고 풀은 그대로인지 |
// | 4 cap 초과는 걸리되 라이트 없이 | ★ **잰다** — `lit=false` 가 계약이다 |
// | 5 castShadow=false | ✗ 집행부 소관(여기엔 three 가 없다) |
// | 6 WebGPU 판정 유보 | ✗ **원리적으로 못 잰다** — 헤드리스는 WebGL 이다 |

import { describe, it, expect } from 'vitest';
import {
  artLightPoolSize, assignArtLights, spotFor,
  ART_LIGHT_PER_PARCEL, ART_LIGHT_PER_PARCEL_SOFT,
  LIGHT_DIST, LIGHT_LIFT, CONE_MARGIN,
} from '../frontend/js/world2/decide/art-light.js';
import { maxLatticePoints, tierReach, DEFAULT_BANDS } from '../frontend/js/world2/decide/lod.js';
import { frameSize, type ArtworkItem } from '../frontend/js/world2/decide/artwork.js';

const CELL = 32;
const art = (over: Partial<ArtworkItem> = {}): ArtworkItem => ({
  src: 'assets/art/a.png', x: 0, y: 3, z: 0, ry: 0, w: 2.4, ar: 1.2, ...over,
});

describe('★ 조건 2 — 풀 크기를 「동시에 보이는 방의 수」에서 유도한다', () => {
  it('★ 밴드에서 유도한다 — 상수를 박으면 밴드를 넓혔을 때 조용히 모자란다', () => {
    const parcels = maxLatticePoints(tierReach('near', DEFAULT_BANDS));
    expect(parcels, '기본 밴드의 near 파셀 최대(실측)').toBe(7);
    expect(artLightPoolSize()).toBe(ART_LIGHT_PER_PARCEL * parcels);
  });

  it('★ 밴드를 넓히면 풀이 **따라온다** — 이것이 「유도」의 정의다', () => {
    const wide = { ...DEFAULT_BANDS, nearExit: 2.4 };
    const got = artLightPoolSize(ART_LIGHT_PER_PARCEL, wide);
    expect(got, '★ 밴드를 넓혔는데 풀이 그대로다 — 상수로 박혔다')
      .toBeGreaterThan(artLightPoolSize());
    expect(got).toBe(ART_LIGHT_PER_PARCEL * maxLatticePoints(2.4));
  });

  it('★ **작품 수와 무관하다** — 감독 카드 「작품 수는 요금제가 정한다」와 충돌하지 않게', () => {
    // 인자에 작품이 안 들어간다는 것 자체가 그 보증이다. 여기서는 그 사실을 못 박는다.
    expect(artLightPoolSize.length, '★ 풀 크기가 작품을 보기 시작했다').toBeLessThanOrEqual(2);
  });

  it('풀은 정수이고 음수 cap 에도 무너지지 않는다', () => {
    expect(Number.isInteger(artLightPoolSize())).toBe(true);
    expect(artLightPoolSize(-3)).toBe(0);
    expect(artLightPoolSize(2.7)).toBe(2 * 7);
  });
});

describe('★ 조건 4 — cap 초과는 **걸리되 라이트 없이**', () => {
  it('파셀당 cap 까지만 켠다', () => {
    const arts = Array.from({ length: 6 }, () => art());
    const { lit, skipped } = assignArtLights(arts, 4, CELL, CELL);
    expect(lit).toEqual([true, true, true, true, false, false]);
    expect(skipped, '★ 몇 개가 조명을 못 받았는지 안 말한다').toBe(2);
  });

  it('★ 초과분도 **목록에 남는다** — 사라지면 「걸리되」가 거짓이 된다', () => {
    const arts = Array.from({ length: 5 }, () => art());
    const { lit } = assignArtLights(arts, 2, CELL, CELL);
    expect(lit, '★ 초과 작품이 통째로 빠졌다').toHaveLength(5);
  });

  it('★ 파셀이 다르면 각자 cap 을 갖는다 — 마을 전체가 한 예산을 나눠 쓰지 않는다', () => {
    const arts = [art({ x: 0 }), art({ x: 0 }), art({ x: CELL }), art({ x: CELL })];
    expect(assignArtLights(arts, 2, CELL, CELL).lit).toEqual([true, true, true, true]);
  });

  it('★ 결정적이다 — 같은 입력이 언제나 같은 답을 낸다(걷는 동안 깜빡이지 않게)', () => {
    const arts = Array.from({ length: 9 }, (_, i) => art({ x: i * 4 }));
    const a = assignArtLights(arts, 3, CELL, CELL).lit;
    const b = assignArtLights(arts, 3, CELL, CELL).lit;
    expect(a).toEqual(b);
  });

  it('cap 0 이면 전부 라이트 없이 — 던지지 않는다', () => {
    const { lit, skipped } = assignArtLights([art(), art()], 0, CELL, CELL);
    expect(lit).toEqual([false, false]);
    expect(skipped).toBe(2);
  });

  it('작품이 없으면 빈 목록', () => {
    expect(assignArtLights([], 4, CELL, CELL)).toEqual({ lit: [], skipped: 0 });
  });
});

describe('★ 조건 3 — soft 완화는 **켜는 수**만 줄인다', () => {
  // ⚠ **풀이 안 줄어드는가는 여기서 못 잰다** — 이 파일은 순수 판정이고, 「누가 무엇을
  // 넘기는가」는 집행부의 성질이다. 첫 판본이 그것을 여기서 재려다
  // `artLightPoolSize(4) === artLightPoolSize(4)` 라는 **동어반복**을 적었고, 검수관
  // 뮤테이션에서 **0 failed** 로 드러났다(블로커 B1). 축은
  // `world2-artwork-scene.test.ts` 의 「★ GS-C」로 옮겼다 — 거기서는 두 세션의 라이트
  // 수를 **한 테스트에서** 비교하므로 동어반복이 성립하지 않는다.
  it('★ soft 는 켜는 수를 실제로 줄인다 — 안 줄면 완화 축이 아니다', () => {
    const arts = Array.from({ length: 6 }, () => art());
    const soft = assignArtLights(arts, ART_LIGHT_PER_PARCEL_SOFT, CELL, CELL);
    const full = assignArtLights(arts, ART_LIGHT_PER_PARCEL, CELL, CELL);
    expect(soft.lit.filter(Boolean)).toHaveLength(ART_LIGHT_PER_PARCEL_SOFT);
    expect(full.lit.filter(Boolean)).toHaveLength(ART_LIGHT_PER_PARCEL);
    expect(soft.lit.filter(Boolean).length, '★ soft 가 안 줄인다')
      .toBeLessThan(full.lit.filter(Boolean).length);
  });

  it('★ 이 함수에 soft 를 넘기면 풀이 **실제로 줄어든다** — 그래서 집행부가 넘기면 안 된다', () => {
    // 이 단언이 이 파일에 있는 이유는 «금지의 근거» 를 눈에 보이게 두기 위해서다.
    // 줄어들지 않는다면 GS-C 가 지키는 규칙 자체가 무의미해지고, 그때는 GS-C 도
    // 아무것도 안 잡는 검사가 된다(두 값이 같으면 비교가 통과하니까).
    expect(artLightPoolSize(ART_LIGHT_PER_PARCEL_SOFT), '★ soft 를 넘겨도 풀이 그대로다 — GS-C 가 무의미해진다')
      .toBeLessThan(artLightPoolSize(ART_LIGHT_PER_PARCEL));
    // 기본 호출은 `ART_LIGHT_PER_PARCEL` 기준이다(기본값이 soft 로 바뀌면 깨진다).
    expect(artLightPoolSize()).toBe(artLightPoolSize(ART_LIGHT_PER_PARCEL));
  });

  it('soft 가 기본보다 작다 — 같으면 완화 축이 아니다', () => {
    expect(ART_LIGHT_PER_PARCEL_SOFT).toBeLessThan(ART_LIGHT_PER_PARCEL);
    expect(ART_LIGHT_PER_PARCEL_SOFT).toBeGreaterThan(0);
  });
});

describe('★ 스포트 배치 — 산술은 실제로 돌려 잰다', () => {
  it('★ 액자 **앞쪽**에서 쏜다 — 부호가 뒤집히면 벽 안에서 쏘고 화면은 그냥 어둡다', () => {
    // `ry = 0` 이면 법선이 +Z(`wallPose` 계약).
    const p = spotFor(art({ x: 0, y: 3, z: 0, ry: 0 }));
    expect(p.pos.z, '★ 벽 안쪽에서 쏜다').toBeCloseTo(LIGHT_DIST, 6);
    expect(p.pos.x).toBeCloseTo(0, 6);
  });

  it('★ +X 를 보는 액자면 조명도 +X 쪽이다', () => {
    const p = spotFor(art({ x: 10, y: 3, z: -5, ry: Math.PI / 2 }));
    expect(p.pos.x).toBeCloseTo(10 + LIGHT_DIST, 6);
    expect(p.pos.z).toBeCloseTo(-5, 6);
  });

  it('★ 위에서 내려 쏜다 — 정면이면 반사가 관람자 눈으로 온다', () => {
    const p = spotFor(art({ y: 3 }));
    expect(p.pos.y).toBeCloseTo(3 + LIGHT_LIFT, 6);
    expect(LIGHT_LIFT, '★ 들어올림이 사라졌다').toBeGreaterThan(0);
  });

  it('★ 각도가 **미술관 관례(약 30도)** 근처다 — 두 상수를 따로 만지면 조용히 어긋난다', () => {
    const deg = Math.atan(LIGHT_LIFT / LIGHT_DIST) * 180 / Math.PI;
    expect(deg, `내림각 ${deg.toFixed(1)}°`).toBeGreaterThan(20);
    expect(deg).toBeLessThan(40);
  });

  it('겨냥점은 액자 중심이다', () => {
    const a = art({ x: 1, y: 2, z: 3 });
    expect(spotFor(a).target).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('★ 큰 작품에는 넓게 쏜다 — 상수 각도면 벽화 가장자리가 죽는다', () => {
    const small = spotFor(art({ w: 1 }));
    const big = spotFor(art({ w: 8 }));
    expect(big.angle, '★ 각도가 액자 크기를 안 본다').toBeGreaterThan(small.angle);
  });

  it('★ 원뿔이 액자 대각선을 **덮는다** — 여유가 1 이면 모서리가 어두워진다', () => {
    const a = art({ w: 3, ar: 1.5 });
    const { w, h } = frameSize(a);
    const half = Math.hypot(w, h) / 2;
    const reach = Math.hypot(LIGHT_DIST, LIGHT_LIFT);
    const need = Math.atan(half / reach);
    expect(spotFor(a).angle, '★ 액자를 다 못 덮는다').toBeGreaterThan(need);
    expect(CONE_MARGIN).toBeGreaterThan(1);
  });

  it('★ 각도가 three 의 상한(π/2) 을 넘지 않는다 — 넘으면 라이트가 조용히 죽는다', () => {
    const huge = spotFor(art({ w: 12, ar: 0.1 }));   // 계약 상한 조합
    expect(huge.angle).toBeLessThan(Math.PI / 2);
    expect(huge.angle).toBeGreaterThan(0);
  });

  it('사거리가 액자 너머에서 끝난다 — 더 멀리 잡으면 뒤쪽 물건까지 셰이딩에 든다', () => {
    const p = spotFor(art());
    const reach = Math.hypot(LIGHT_DIST, LIGHT_LIFT);
    expect(p.distance).toBeGreaterThan(reach);
    expect(p.distance).toBeLessThan(reach * 4);
  });
});
