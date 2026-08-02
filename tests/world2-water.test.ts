// 물 판정 테스트.
//
// 이 판정은 **두 계층이 함께 소비한다** — 수면을 그리는 쪽과 물을 피하는 쪽. 두 곳이
// 어긋나면 건물이 물 위에 서고, 어느 한쪽 테스트로도 안 걸린다. 그래서 판정 자체의
// 성질을 여기서 못 박아 둔다.

import { describe, it, expect } from 'vitest';
import {
  isWater, isRiver, parcelWater, riverCenterZ, worldHalfExtent, waterSurfaceY,
  RIVER_HALF, SEA_Y, RIVER_Y, SEABED_Y, WATER_MODES, pickWaterMode,
} from '../frontend/js/world2/decide/water.js';
import { isCentralPlaza as isPlaza, GRID_MIN_X, GRID_MAX_X, PLAZA_R } from '../frontend/js/world2/decide/grid.js';
// 지면 두께는 파츠 쪽 상수지만 **수면에서 유도되므로** 관계를 여기서 지킨다 — 두 파일에
// 나눠 적으면 어느 쪽 테스트에도 경계가 안 걸린다(판정/집행 분리의 그 구멍).
import { GROUND_DEPTH } from '../frontend/js/world2/parts/ground.js';
// 물 판정 API 가 전제하는 "정사각 셀" 을 검사로 고정하려면 실제 레이아웃이 필요하다.
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';

const CELL = 32;
/** 세계의 바깥 가장자리(미터) — 격자에서 유도된다 */
const EDGE = worldHalfExtent(CELL);
const wet = (x: number, z: number) => isWater(x, z, CELL);
const centerZ = (x: number) => riverCenterZ(x, CELL);

describe('세계의 끝 — 격자 밖은 바다다', () => {
  it('원점은 뭍이다 — 스폰 지점이 물이면 시작부터 빠진다', () => {
    expect(Math.abs(centerZ(0))).toBeGreaterThan(RIVER_HALF);
    expect(wet(0, 0)).toBe(false);
  });

  // ── 이 검사가 새로 생긴 이유 ──────────────────────────────────────────────
  // 스폰 한 점만 보던 검사는 **강이 광장을 관통하는 것을 놓쳤다.** `riverCenterZ(0)` 은
  // 반폭 밖이지만, 사인이 광장 쪽으로 최대가 되는 x 에서는 중심선이 광장까지 들어와
  // 가로질렀다. 한 점이 마른 것과 광장 전체가 마른 것은 다른 명제다.
  it('중앙 광장 전체가 뭍이다 — 한 점이 아니라 모든 칸', () => {
    let checked = 0;
    for (let px = -4; px <= 4; px++) {
      for (let pz = -4; pz <= 4; pz++) {
        if (!isPlaza(px, pz)) continue;
        checked++;
        expect(parcelWater(px, pz, CELL, CELL)).toBe('dry');
      }
    }
    expect(checked).toBeGreaterThan(0); // 표본이 비면 위 단언이 한 번도 안 돈다
  });

  it('강 가장자리가 광장에 닿지 않는다 — 상수 넷의 합이 만드는 성질이라 못 박는다', () => {
    // 원점에서 강 띠까지의 최단 거리. **부호에 기대지 않는다** — 예전에는
    // `riverCenterZ(x) − RIVER_HALF` 의 최솟값을 봤는데, 그 식은 강이 `+z` 에 있을
    // 때만 "광장 쪽 가장자리" 를 뜻한다. 감독 지시로 강을 `−z`(스폰 정면)로 옮기자
    // 그 식이 강의 **먼 쪽** 가장자리를 재게 됐다 — 값은 그대로인데 뜻이 뒤집힌,
    // 이 저장소가 `GROUND_DEPTH` 로 이미 겪은 형태다.
    let minGap = Infinity;
    for (let x = -EDGE; x <= EDGE; x += 3) {
      minGap = Math.min(minGap, Math.abs(centerZ(x)) - RIVER_HALF);
    }
    // ── 임계값을 광장에서 유도한다 ────────────────────────────────────────
    // 예전엔 `CELL` 을 그대로 썼고 주석이 "2×2 이므로" 라 적고 있었다. 광장이 3×3 으로
    // 커진 뒤에도 그 값이 안 따라와서, 실제 필요한 마진보다 느슨한 값을 재고 있었다.
    // 결과적으로는 안전했지만 **임계값이 실제 불변식과 어긋난 채 남아 있는 것** 자체가
    // 이 프로젝트가 세 번 겪은 값 미러링이다.
    //
    // 기준은 광장의 기하학적 가장자리가 아니라 **광장 밖 첫 링 파셀의 중심**이다.
    // `parcelWater` 가 중심 좌표로 판정하므로 그 칸이 젖으면 광장이 물가가 된다
    // (`riverBase` 가 같은 기준을 쓴다 — 여기가 그 유도의 감시자다).
    const firstRingCenter = (PLAZA_R + 1) * CELL;
    expect(minGap).toBeGreaterThan(firstRingCenter);
  });

  // ── 감독 지시 2026-07-31 *"스폰 앞 주변에 흐르는 강이있으면"* ────────────────
  // 이 지시는 **부호 하나로 뒤집힌다.** 스폰(`z = +10`)의 기본 시선 `yaw = 0` 이 `−z` 를
  // 보므로(`grid.ts`), 강이 `+z` 에 있으면 돌아서야 보인다. 실제로 옛 강이 `+180` 이라
  // 등 뒤였다. "가깝다" 만 재면 그 뒤집힘을 못 잡으므로 **방향과 거리를 함께** 본다.
  it('★ 강이 스폰 정면(−z)에 있다 — 등 뒤로 가면 지시가 뒤집힌 것이다', () => {
    // `wx = 0` 이 스폰의 정면 축이다. 거기서 강이 광장에 가장 가까워야 한다.
    expect(centerZ(0)).toBeLessThan(0);

    // 그리고 그 x 가 **가장 가까운** 자리여야 한다 — 위상을 흐트러뜨리면 강이 정면에서
    // 멀어지고 옆구리로 온다. 원점에서 강 띠까지의 거리를 훑어 최솟값의 위치를 본다.
    let bestX = NaN, best = Infinity;
    for (let x = -EDGE; x <= EDGE; x += 2) {
      const gap = Math.abs(centerZ(x)) - RIVER_HALF;
      if (gap < best) { best = gap; bestX = x; }
    }
    // 주기가 둘이라 정확히 0 은 아닐 수 있다. 부 파동의 반주기 안이면 정면으로 친다.
    expect(Math.abs(bestX)).toBeLessThan(CELL);

    // 보이는 거리인가. 스폰에서 강 가장자리까지가 세계 절반을 넘으면 "앞에 있다" 가
    // 지도상의 사실일 뿐 화면의 사실이 아니다.
    expect(best).toBeLessThan(EDGE / 2);
  });

  it('격자 밖은 전부 물이다', () => {
    for (const d of [EDGE + 1, EDGE + 50, EDGE + 400]) {
      expect(wet(d, 0)).toBe(true);
      expect(wet(-d, 0)).toBe(true);
      expect(wet(0, d)).toBe(true);
      expect(wet(0, -d)).toBe(true);
      expect(wet(d, d)).toBe(true);   // 모서리 — 원형이던 시절 여기가 제일 먼저 깨졌다
    }
  });

  // 세계 크기를 격자에서 유도하는 것이 이 변경의 핵심이다. 둘이 어긋나면 넓은 쪽이
  // 조용히 무시되고, 어느 단위 테스트에도 안 걸린다.
  it('격자 끝 파셀이 물에 잠기지 않는다 — 세계 크기가 두 곳에서 어긋나면 안 된다', () => {
    for (const px of [GRID_MIN_X, GRID_MAX_X]) {
      for (const pz of [GRID_MIN_X, GRID_MAX_X]) {
        // 강에 걸린 칸은 당연히 물이므로 제외하고, 그 외에는 육지로 남아야 한다
        if (isRiver(px * CELL, pz * CELL, CELL)) continue;
        expect(parcelWater(px, pz, CELL, CELL)).not.toBe('water');
      }
    }
  });

  it('격자 안이면서 강에서 먼 곳은 뭍이다', () => {
    let dry = 0, n = 0;
    for (let x = -EDGE; x <= EDGE; x += 8) {
      for (let z = -EDGE; z <= EDGE; z += 8) {
        n++;
        if (!wet(x, z)) dry++;
      }
    }
    expect(n).toBeGreaterThan(5000); // 표본이 성기면 아래 비율은 아무 뜻이 없다
    expect(dry / n).toBeGreaterThan(0.8);
  });
});

describe('강 — 굽이치고 이어진다', () => {
  it('파셀 중심에서 본 중심선 위는 물이고 충분히 먼 곳은 아니다', () => {
    // ── 이 검사가 두 번 고쳐졌다 (감독 발견 2026-08-01) ──────────────────────
    // `isWater` 는 이제 **파셀 단위**로 답한다(`waterSurfaceY` 참고). 그래서 두 가지가
    // 예전 형태로는 성립하지 않는다:
    //
    // ① **임의의 x 에서 "중심선 위 = 물" 이 참이 아니다.** `parcelWater` 는 파셀
    //    **중심 한 점**으로 판정하는데, x 가 파셀 중심이 아니면 그 칸이 보는 중심선은
    //    `riverCenterZ(px·cell)` 이라 최대 `기울기(0.4455) × cell/2 ≈ 7.1m` 어긋나고,
    //    z 반올림이 최대 `cell/2` 를 더한다. 둘을 합치면 `RIVER_HALF`(24)에 육박해
    //    어떤 x 에서는 넘어간다.
    //
    //    **이것은 이번에 생긴 결함이 아니라 원래 있던 성질이다** — 강은 파셀 격자에
    //    맞춰 계단으로 나타난다. 연속 판정으로 물어보던 동안 가려져 있었을 뿐이다.
    //    강이 끊기지 않는다는 것은 「강이 지나는 모든 열에 물 파셀이 있다」가 본다.
    //
    //    그래서 **x 를 파셀 중심에 맞춰** 표집한다. 그러면 그 칸이 보는 중심선이 곧
    //    우리가 계산한 중심선이고, 남는 오차는 z 반올림(≤ cell/2 = 16)뿐이라
    //    `RIVER_HALF`(24) 안에 확실히 들어간다.
    //
    // ② **"반폭 + 5m" 로는 물 밖이라고 단정할 수 없다.** 그 점이 속한 파셀의 중심이
    //    아직 강 안일 수 있고, 그때 그 칸은 지면이 없으므로 물이라고 답하는 것이 맞다.
    //    여유를 `RIVER_HALF + CELL` 로 잡아 ①의 두 오차를 전부 덮는다.
    //
    // **단언을 느슨하게 만든 것이 아니라 재는 축이 바뀐 것이다.** 아래 두 검사가
    // 그 축을 정면으로 본다.
    let checked = 0;
    for (let px = -12; px <= 12; px++) {
      const x = px * CELL;                      // ← 파셀 중심
      const cz = centerZ(x);
      if (Math.abs(cz) + RIVER_HALF + CELL > EDGE) continue; // 세계 밖은 어차피 바다
      checked++;
      expect(wet(x, cz)).toBe(true);
      expect(wet(x, cz + RIVER_HALF + CELL)).toBe(false);
      expect(wet(x, cz - RIVER_HALF - CELL)).toBe(false);
    }
    expect(checked).toBeGreaterThan(10);   // 표본이 비면 위 단언이 한 번도 안 돈다
  });

  // ── ★ 감독 발견 2026-08-01: *"강 가기 전에 빠져."* ──────────────────────────
  //
  // 물빠짐을 붙이면서 `waterSurfaceY` 가 `isRiver`(연속 좌표)로 판정했다. 그런데 지면은
  // `parcelWater`(파셀 단위)가 정한다 — 두 해상도가 다르면 **땅을 밟고 서서 물로
  // 판정되는 띠**가 생기고, 최악의 경우 반 칸(16m)을 먼저 빠진다.
  //
  // 값이 틀린 것이 아니라 **재는 축의 해상도가 달랐다.** 그리고 이 저장소는 바로 그
  // 파일(`parcelWater` 주석)에 *"파셀보다 정밀한 판정은 그릴 방법이 없다"* 고 적어
  // 두고도, 새 기능에서 그보다 정밀한 판정을 만들었다.
  it('★ 지면이 있는 칸에서는 어디에 서도 안 빠진다 — 판정 해상도가 지면과 같다', () => {
    let checked = 0;
    for (let px = -12; px <= 12; px++) {
      for (let pz = -12; pz <= 12; pz++) {
        // 물 파셀은 지면이 없다 — 거기서 빠지는 것이 이 기능이다.
        if (parcelWater(px, pz, CELL, CELL) === 'water') continue;
        // 지면이 있는 칸. **칸 안 어디에 서도** 물이면 안 된다(가장자리 포함).
        for (const dx of [-0.49, 0, 0.49]) {
          for (const dz of [-0.49, 0, 0.49]) {
            checked++;
            expect(
              waterSurfaceY((px + dx) * CELL, (pz + dz) * CELL, CELL),
              `파셀 (${px},${pz}) 은 지면이 있는데 오프셋 (${dx},${dz}) 에서 물이다`,
            ).toBeNull();
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);  // 표본이 비면 위 단언이 한 번도 안 돈다
  });

  it('★ 물 파셀에서는 어디에 서도 빠진다 — 반대 방향도 어긋나면 안 된다', () => {
    // 위 검사만 있으면 `waterSurfaceY` 가 **항상 null** 을 반환해도 통과한다.
    // 물빠짐 기능 자체가 죽는 뮤테이션을 이 짝이 막는다.
    let checked = 0;
    for (let px = -12; px <= 12; px++) {
      for (let pz = -12; pz <= 12; pz++) {
        if (parcelWater(px, pz, CELL, CELL) !== 'water') continue;
        for (const dx of [-0.49, 0, 0.49]) {
          for (const dz of [-0.49, 0, 0.49]) {
            checked++;
            expect(waterSurfaceY((px + dx) * CELL, (pz + dz) * CELL, CELL)).toBe(RIVER_Y);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  // 사인파 하나만 쓰면 강이 규칙적인 물결이 되어 인공물처럼 보인다. 둘을 겹친 것이
  // 그 처방이고, 여기서 실제로 되풀이되지 않는지 본다.
  it('규칙적인 물결이 아니다 — 주기가 눈에 띄지 않는다', () => {
    // 넉넉한 구간에서 극값 위치를 모은다. 균등 간격이면 단일 사인파라는 뜻이다.
    // **구간 길이를 파장에서 유도하지 않는다** — 파장을 여기 적으면 그것이 곧 미러링이고,
    // 필요한 것은 "여러 주기가 들어가는 넉넉한 구간" 뿐이라 상수로 충분하다.
    const peaks: number[] = [];
    let prev = centerZ(-1400);
    let rising = centerZ(-1399) > prev;
    for (let x = -1399; x <= 1400; x++) {
      const v = centerZ(x);
      const up = v > prev;
      if (rising && !up) peaks.push(x);
      rising = up;
      prev = v;
    }
    expect(peaks.length).toBeGreaterThan(2);
    const gaps = peaks.slice(1).map((p, i) => p - peaks[i]);
    const spread = Math.max(...gaps) - Math.min(...gaps);
    // 단일 사인파면 간격이 모두 같아 spread 가 0에 가깝다.
    expect(spread).toBeGreaterThan(60);
  });

  it('강이 파셀 열을 실제로 적신다 — 반폭이 파셀 중심 간격의 절반보다 넓다', () => {
    // `parcelWater` 가 파셀 중심으로 판정하므로, 강 중심선에서 최근접 파셀 중심까지의
    // 최대 거리(= 셀의 절반)보다 반폭이 커야 그 칸이 물로 분류된다. 이 부등식을 어기면
    // 강이 지면에 덮여 통째로 사라진다.
    expect(RIVER_HALF).toBeGreaterThan(CELL / 2);
  });
});

describe('파셀 분류', () => {
  it('세 부류가 모두 나온다', () => {
    const seen = new Set<string>();
    for (let px = -25; px <= 25; px++) {
      for (let pz = -25; pz <= 25; pz++) seen.add(parcelWater(px, pz, CELL, CELL));
    }
    expect([...seen].sort()).toEqual(['dry', 'shore', 'water']);
  });

  it('뭍 파셀은 물에 바로 닿지 않는다 — 사이에 반드시 물가가 있다', () => {
    // 'dry' 와 'water' 가 맞닿으면 지면이 물가 처리 없이 뚝 끊긴다. 물가 한 줄이 항상
    // 사이에 끼는 것이 `parcelWater` 의 계약이다.
    for (let px = -12; px <= 12; px++) {
      for (let pz = -12; pz <= 12; pz++) {
        if (parcelWater(px, pz, CELL, CELL) !== 'dry') continue;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          expect(parcelWater(px + dx, pz + dz, CELL, CELL)).not.toBe('water');
        }
      }
    }
  });

  // ── 이 테스트가 예전에 강 끊김을 놓쳤다 ─────────────────────────────────────
  // 원래는 `px = 3` **한 열만** 훑었다. 강이 파셀 대각선을 비스듬히 지나는 구간에서만
  // 끊겼는데 하필 그 열이 아니어서 통과했고, 실제로 두 개의 x 열에 물 파셀이 하나도
  // 없었다. 한 표본의 통과는 성질의 증거가 아니다 — 강이 지나는 **모든** 열을 본다.
  it('강이 지나는 모든 열에 물 파셀이 있다 — 어디서도 끊기지 않는다', () => {
    const broken: number[] = [];
    for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
      // 이 열에서 강 중심선이 격자 안에 있는가 — 밖이면 바다에 이어진 것이라 건너뛴다
      const cz = centerZ(px * CELL);
      if (Math.abs(cz) > EDGE - CELL) continue;
      let wetCells = 0;
      for (let pz = GRID_MIN_X; pz <= GRID_MAX_X; pz++) {
        if (parcelWater(px, pz, CELL, CELL) === 'water') wetCells++;
      }
      if (wetCells === 0) broken.push(px);
    }
    expect(broken).toEqual([]);
  });

  it('강을 건너면 물가 → 물 → 물가 순으로 지난다', () => {
    // 강 중심선을 가로지르는 줄을 훑어 분류가 이어지는지 본다.
    //
    // 양 끝이 'dry' 인지는 보지 않는다 — 줄이 길면 섬 가장자리에 닿아 바다 물가가 되고,
    // 그건 강과 무관한 사실이다. 실제 계약은 **물이 한 덩어리이고 그 양옆이 물가**라는
    // 것이다. 물이 두 덩어리로 갈리면 중간에 지면이 끼어 강이 두 줄기로 보이고,
    // 물가 없이 뭍이 바로 붙으면 지면이 물에 뚝 끊긴다.
    for (const px of [-4, -3, -1, 0, 2, 4]) {
      const cz = centerZ(px * CELL);
      const seq: string[] = [];
      for (let pz = Math.floor((cz - 80) / CELL); pz <= Math.ceil((cz + 80) / CELL); pz++) {
        const c = parcelWater(px, pz, CELL, CELL);
        if (seq[seq.length - 1] !== c) seq.push(c);
      }
      const at = seq.indexOf('water');
      expect(seq.filter((c) => c === 'water')).toHaveLength(1);
      expect(seq[at - 1]).toBe('shore');
      expect(seq[at + 1]).toBe('shore');
    }
  });
});

// ── `waterSurfaceY` — 어느 물인가 (뮤테이션이 뚫은 자리, 2026-07-31) ──────────
//
// 이 블록은 **뮤테이션이 없어서 생겼다.** 감독 지시 *"강에 사람이 빠지게해줘"* 로
// `waterSurfaceY` 를 신설한 뒤 검출력을 재 봤더니, `return isRiver(...) ? RIVER_Y : null`
// 의 `RIVER_Y` 를 `SEA_Y` 로 바꿔도 **1,287 테스트가 전부 통과했다.**
//
// 즉 강에 바다 높이를 물려도 아무도 몰랐다. 그런데 그 두 값은 감독이 직접 지시한 것이다:
// *"강은 땅보다 50 cm 밑, 바다는 땅보다 1미터 밑에 있게해."* 상수 자체를 지키는 단언은
// 아래 describe 에 있었지만, **그 상수가 옳은 좌표에 쓰이는가**를 보는 축이 없었다.
//
// 상수와 사용처는 다른 명제다 — 이 저장소가 구름 `alpha`·`waterGloss` 로 두 번 겪은
// 판정/집행 구멍의 또 다른 형태다.
describe('waterSurfaceY — 강과 바다를 가른다', () => {
  it('★ 강 위에서는 강 수면이다 — 바다 높이가 오면 감독 지시가 뒤집힌다', () => {
    // 강 중심선 위를 여러 x 에서 훑는다. 한 점만 보면 우연히 맞을 수 있다.
    let checked = 0;
    for (let x = -EDGE + 60; x <= EDGE - 60; x += 47) {
      const cz = centerZ(x);
      if (Math.abs(cz) + RIVER_HALF > EDGE) continue;   // 바다에 이어진 구간은 제외
      checked++;
      expect(waterSurfaceY(x, cz, CELL)).toBe(RIVER_Y);
    }
    expect(checked).toBeGreaterThan(5);  // 표본이 비면 위 단언이 한 번도 안 돈다
  });

  it('★ 세계 밖에서는 바다 수면이다', () => {
    for (const d of [EDGE + 1, EDGE + 200]) {
      expect(waterSurfaceY(d, 0, CELL)).toBe(SEA_Y);
      expect(waterSurfaceY(0, -d, CELL)).toBe(SEA_Y);
    }
  });

  it('★ 두 수면이 서로 다르다 — 같아지면 위 두 검사가 빈 명제가 된다', () => {
    // 이 단언이 없으면 `RIVER_Y === SEA_Y` 로 만드는 것만으로 위 검사들이 통과한다.
    expect(RIVER_Y).not.toBe(SEA_Y);
  });

  it('뭍에서는 null 이다 — 0 이 아니다(0 은 유효한 높이다)', () => {
    expect(waterSurfaceY(0, 0, CELL)).toBeNull();
  });

  // ── 이 API 는 정사각 셀을 전제한다 (검수관 조건 2026-07-31) ──────────────
  // `worldHalfExtent`·`waterSurfaceY`·`isWater`·`riverCenterZ` 는 전부 **단일 `cell`**
  // 을 받는다. x·z 스케일이 갈라지면 그 시그니처로는 표현할 방법이 아예 없다.
  //
  // 검수관이 `main.ts` 에서 `CELL_X` 를 넘기던 것을 잡았고(강 기준선은 z 방향 유도라
  // `CELL_Z` 가 맞다) 그 자리는 고쳤다. 하지만 **고친 것은 호출 한 줄이고, 전제 자체는
  // 여전히 암묵적이다** — 누가 레이아웃을 직사각으로 바꾸면 물 판정이 조용히 틀린다.
  //
  // 그래서 전제를 검사로 만든다. 이 단언이 깨지는 날은 "값을 고칠 날" 이 아니라
  // **API 시그니처를 고칠 날**이라는 신호다.
  it('★ 물 판정 API 가 전제하는 정사각 셀이 실제로 정사각이다', () => {
    expect(DEFAULT_LAYOUT.cellX).toBe(DEFAULT_LAYOUT.cellZ);
    // 위 단언이 참인 동안에는 이 파일이 쓰는 `CELL` 이 곧 레이아웃의 셀이어야 한다 —
    // 아니면 여기서 재는 것과 실제 세계가 다른 셀로 계산된다.
    expect(CELL).toBe(DEFAULT_LAYOUT.cellX);
  });

  it('★ `isWater` 와 한 치도 어긋나지 않는다 — 판정이 갈리면 SSOT 가 아니다', () => {
    // `isWater` 를 `waterSurfaceY` 위에 다시 세운 것이 이 커밋의 리팩터다. 둘이 갈리면
    // 그 리팩터가 무의미해지고, 갈린 사실은 어느 쪽 단위 테스트에도 안 걸린다.
    let n = 0;
    for (let x = -EDGE - 40; x <= EDGE + 40; x += 29) {
      for (let z = -EDGE - 40; z <= EDGE + 40; z += 29) {
        n++;
        expect(waterSurfaceY(x, z, CELL) !== null).toBe(isWater(x, z, CELL));
      }
    }
    expect(n).toBeGreaterThan(1000);
  });
});

describe('수면 높이', () => {
  it('지면보다 낮다 — 육지가 물을 덮는다', () => {
    // 지면 상면이 y=0 이다. 수면이 그보다 높으면 뭍에서도 물이 보인다.
    //
    // 예전에는 이 단언이 `-0.1` 이었고 주석이 "지면은 두께 0.1 로 깔린다" 고 적었다.
    // 그 두께는 그 뒤 두 번 바뀌었고(0.8 → 유도값) 주석만 남아 근거가 거짓이 됐다.
    // 두께는 아래 describe 가 따로 본다 — 여기서는 **상면(0)** 만 기준으로 삼는다.
    expect(SEA_Y).toBeLessThan(0);
    expect(RIVER_Y).toBeLessThan(0);
  });
});

// ── 지면 판이 물바닥까지 내려가는가 ─────────────────────────────────────────
//
// 이 검사는 두 번 고쳐졌고, 두 번 다 **재는 축이 낮은 시점을 못 보고 있었다.**
//
// ① `GROUND_DEPTH` 가 `0.8` 상수이던 시절 — 물이 −0.5m 하나였을 때 "수면보다 30cm
//    깊다" 는 뜻이었고 그때는 맞았다. 감독이 물을 강 −0.5 / 바다 −1.0 으로 가르자
//    **0.8 이 바다 수면보다 얕아졌다.** 값은 그대로인데 뜻이 바뀌어 어떤 단언에도
//    안 걸렸다(검수관 블로커). → `SEA_Y` 에서 유도하게 고쳤다.
//
// ② 그 유도가 **물 밖 시점에서만 충분했다** (감독 실기기 2026-08-02). 물에 빠지는
//    기능이 생기면서 시점이 수면 아래로 내려갔고, 거기서 보니 판 아랫면(−1.3)과
//    해저(−3.4) 사이 2.1m 가 뚫려 있었다. 육지가 "떠 있는 판" 으로 보이고 그 밑으로
//    헤엄쳐 들어갈 수 있다. → `SEABED_Y` 에서 유도하게 고쳤다.
//
// **두 번 다 값이 아니라 축이 틀렸다.** 그래서 이번에는 물이 닿는 **가장 낮은 자리**를
// 기준으로 못 박는다 — 해저보다 낮으면 어느 시점에서도 아래가 열리지 않는다.
describe('지면 두께 — 해저에서 유도한다', () => {
  it('지면 판 아랫면이 두 수면보다 모두 아래다 — 물가에 틈이 없다', () => {
    // 판 아랫면 = −GROUND_DEPTH. 두 수면 중 **더 낮은 쪽**보다도 낮아야 양쪽이 덮인다.
    const bottom = -GROUND_DEPTH;
    expect(bottom, '지면 판이 바다 수면까지 닿지 않는다 — 바닷가에서 옆면이 드러난다')
      .toBeLessThan(SEA_Y);
    expect(bottom).toBeLessThan(RIVER_Y);
  });

  it('★ 지면 판 아랫면이 해저보다도 아래다 — 물속에서 육지 밑이 열리면 안 된다', () => {
    // 이 단언이 이번 결함을 잡는 축이다. **없어서 통과했다.**
    // 물에 빠진 플레이어는 해저에 앉으므로 눈높이가 판 아랫면과 해저 사이 틈의
    // 한가운데다 — 그 틈이 0 이어야 벽으로 보이고 통과가 막힌다.
    expect(-GROUND_DEPTH, '판 아랫면과 해저 사이가 뚫려 있다 — 물속에서 육지 밑으로 들어간다')
      .toBeLessThan(SEABED_Y);
  });

  it('해저를 옮기면 따라온다 — 상수를 박아두지 않았다', () => {
    // 유도 관계 자체를 본다. 여유값(margin)을 여기 적지 않고 **차이의 부호**만 본다 —
    // 그러면 여유를 조정해도 이 단언이 살아 있다.
    const margin = Math.abs(SEABED_Y) - GROUND_DEPTH;
    expect(margin, '지면 두께가 해저 깊이에서 유도되지 않았다').toBeLessThan(0);
  });

  it('물 밖에서 보이는 흙벽 높이는 두께가 아니라 **수심이 정한다** — 절벽이 되지 않는다', () => {
    // 옛 판본은 `GROUND_DEPTH < 3` 으로 "물가 흙벽이 3m 면 절벽이다" 를 지켰다.
    // 그 단언은 **전제가 틀렸다** — 두께 전체가 물가에서 보인다고 가정했는데, 물이
    // 채워져 있으므로 물 밖 관찰자에게 드러나는 높이는 수면까지뿐이다. 판을 아무리
    // 두껍게 해도 그 아래는 물에 잠긴다.
    //
    // 그래서 재는 대상을 **노출 높이**로 바꾼다. 이 값은 `GROUND_DEPTH` 와 무관하게
    // `|SEA_Y|` 이고, 두께를 키운 이번 변경이 여기를 건드리지 않았음을 못 박는다.
    const exposedAtSea = Math.abs(SEA_Y);
    expect(exposedAtSea, '바닷가 흙벽이 절벽처럼 높다').toBeLessThan(3);
    expect(Math.abs(RIVER_Y), '강가 흙벽이 절벽처럼 높다').toBeLessThan(3);
    // 그리고 물속 벽은 깊어도 된다 — 그것이 이번 변경의 목적이다.
    expect(GROUND_DEPTH, '판이 해저까지 안 내려간다').toBeGreaterThan(exposedAtSea);
  });
});

// ── 어느 수면 구현이 걸리는가 (감독 지시 2026-08-01) ──────────────────────────
// 이 판정이 `ocean.create` 안의 한 줄이던 동안에는 **어떤 테스트도 못 닿았다.**
// 헤드리스 스모크는 항상 WebGL 이라 폴백 가지 하나만 밟고, `WebGPU → tsl` 가지는
// 감독 실기기에서만 실행된다 — 즉 그 가지가 뒤집혀도 배포 전에는 아무도 모른다.
// 순수 함수로 뺀 이유가 이것이고, 그래서 여기서 **양쪽 가지를 다** 돌린다.
describe('pickWaterMode — 요청과 백엔드가 함께 정한다', () => {
  it('WebGPU 에서 tsl 요청이면 tsl 이다 — 헤드리스가 영원히 못 밟는 가지', () => {
    expect(pickWaterMode('tsl', 'WebGPU')).toBe('tsl');
  });

  it('★ WebGL 에서 tsl 요청이면 std 로 폴백한다 — 안 그러면 월드가 통째로 안 뜬다', () => {
    // 실측(2026-08-01): 노드 재질을 레거시 WebGLRenderer 에 넘기면 첫 렌더에서
    //   resolveIncludes (WebGLProgram.js:261) ← … ← WebGLRenderer.renderBufferDirect
    // 로 죽는다. 부팅 실패이지 물만 안 보이는 게 아니다.
    expect(pickWaterMode('tsl', 'WebGL')).toBe('std');
  });

  it('std 요청은 백엔드와 무관하게 std 다 — 게이팅이 기본 경로를 건드리지 않는다', () => {
    for (const backend of ['WebGL', 'WebGPU']) {
      expect(pickWaterMode('std', backend)).toBe('std');
    }
  });

  it('★ 모르는 백엔드는 std 다 — 화이트리스트여야 새 백엔드가 저절로 열리지 않는다', () => {
    // "WebGL 이 아니면 통과" 로 적으면 백엔드가 하나 더 늘었을 때 **검증되지 않은
    // 경로가 저절로 열린다.** 그 형태를 여기서 못 박는다.
    expect(pickWaterMode('tsl', 'WebGPU2')).toBe('std');
    expect(pickWaterMode('tsl', '')).toBe('std');
  });

  it('후보 목록이 두 구현을 다 담는다 — URL 노브가 파싱할 수 있어야 한다', () => {
    // `readEnum('water', 'std', WATER_MODES)` 가 이 배열로 요청을 거른다. 여기서
    // 'tsl' 이 빠지면 `?water=tsl` 이 조용히 기본값으로 떨어지고, 화면상으로는
    // 폴백과 구별되지 않는다.
    expect(WATER_MODES).toContain('std');
    expect(WATER_MODES).toContain('tsl');
  });
});
