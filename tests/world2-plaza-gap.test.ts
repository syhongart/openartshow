// world2 중앙 광장 — **사거리 한복판에 지면이 드러나지 않는다.**
//
// ── 감독 지적 (2026-08-09) ───────────────────────────────────────────────────
// *"월드2에서 길 겹쳐져있는 곳 저렇게 나오는데."* → 내가 증상을 거꾸로 읽자 정정:
// ***"길이 겹쳐진 곳이 회색으로 되어있잖아"***
//
// 회색은 `ground` 판이었다. `road.place` 가 광장 파셀에서 **중심 조각을 생략**했고
// (`if (!isPlaza(px,pz))`), 광장에는 잔디도 안 깔려서(`garden.ts` 의 같은 가드),
// 팔 넷이 만나는 자리에 `ROAD_SEG`×`ROAD_SEG` 빈칸이 남고 그리로 지면이 드러났다.
//
// 밤 선형휘도로 지면 0.324 대 아스팔트 0.063 — **5.2배**라 밤에 특히 도드라졌다
// (`NIGHT_GROUND_LIFT` 가 지면 알베도를 들어 올린다).
//
// ══════════════════════════════════════════════════════════════════════════
// ★ 이 파일이 막는 것 — **주석이 참이라고 믿는 상태**
// ══════════════════════════════════════════════════════════════════════════
// 생략을 정당화한 주석은 *"그 자리에 분수대나 시계탑이 선다"* 였다. 그 문장이
// **광장 9칸 중 2칸에서만 참**이었고(나머지 6칸은 `plazaLandmark` 가 `null`),
// **그것을 재는 검사가 하나도 없었다.**
//
// 이 저장소가 반복해 데인 형태다 — 주석이 조건을 선언하고, 그 조건이 실제로 성립하는지는
// 아무도 안 본다. 그래서 여기서는 **주석을 믿지 않고 좌표로 센다.**
//
// ── 그리고 랜드마크 칸도 못 덮는다 (팀장 조건 2) ────────────────────────────
// 처음 처방은 가드를 `plazaLandmark !== null` 로 **좁히는** 것이었다. 팀장이 뒤집었다 —
// 분수대 최대 반경이 2.4m 라 5×5 를 못 덮어 **네 귀퉁이가 남고**, 감독 스크린샷이
// 하필 분수대 정면이다. *"수치(6칸)가 맞아도 화면(분수 칸)이 안 고쳐지면 미완이다."*
//
// 그래서 검사도 6칸이 아니라 **9칸 전부**를 본다.
//
// ── 그리고 9칸도 전부가 아니었다 (골든이 알려줬다) ──────────────────────────
// 가드가 부른 것은 `isCentralPlaza` 가 아니라 **`isPlaza`** 이고, 그것은 중앙 광장
// 말고 **위성 광장**에도 참이다. 골든(`world2-parcel-layout-golden`)이 파츠 수 +90
// 을 물고 늘어져서 드러났다 — 골든이 도는 −12..12 안 `isPlaza` 칸이 **30개**이고
// 전부 길이 있어, `30 × 3 tier = 90` 이 정확히 맞아떨어진다.
//
// **격자 전체(−15..14)로는 38칸**(중앙 9 · 위성 29)이다 — 골든의 창이 세상보다 좁아
// 8칸이 골든 밖에 있었다. 그러니 골든의 +90 을 결함의 전량으로 읽으면 안 된다.
//
// 위성 29칸에는 랜드마크가 아예 안 선다(`plazaLandmark` 는 중앙 2칸만). 즉 옛 주석은
// 그 29칸에서 **참이었던 적이 한 번도 없다.** 감독이 본 것은 38개 중 하나였다.
//
// 그래서 아래 검사는 중앙 9칸을 따로 못 박되(감독이 본 자리다), 범위는 `isPlaza`
// **전체**로 돈다.

import { describe, it, expect } from 'vitest';
import { road } from '../frontend/js/world2/parts/road.js';
import { roadDirs, ROAD_SEG } from '../frontend/js/world2/parts/road-topology.js';
import { isPlaza, plazaLandmark } from '../frontend/js/world2/parts/plaza.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';
import type { PlaceContext } from '../frontend/js/world2/parts/types.js';
import {
  GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z, isCentralPlaza, PLAZA_R,
} from '../frontend/js/world2/decide/grid.js';

const O = DEFAULT_LAYOUT;

function placeAt(px: number, pz: number) {
  return road.place({
    px, pz,
    // 도로는 난수를 하나도 안 쓴다(`place` 주석). 고정값을 줘도 결과가 같아야 한다.
    rnd: () => 0.5,
    o: O,
    halfX: O.cellX / 2,
    halfZ: O.cellZ / 2,
    placed: [],
  } as unknown as PlaceContext);
}

/** 중심 조각인가 — 원점에 놓인 정사각 조각 하나다(팔은 축을 따라 밀려 있다) */
const isCenterPiece = (p: { x: number; z: number; sz: number }) =>
  p.x === 0 && p.z === 0 && p.sz === ROAD_SEG;

/**
 * 광장 칸 전부(중앙 + 위성). **격자 전체**(−15..14)를 돈다 — 골든은 −12..12 만
 * 보므로 세상보다 좁다(그래서 골든은 38칸 중 30칸분만 셌다).
 */
function plazaCells(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      if (isPlaza(px, pz)) out.push([px, pz]);
    }
  }
  return out;
}

describe('광장 — 사거리 한복판에 구멍이 없다', () => {
  it('표본이 실재한다 — 중앙 9칸 + 위성 광장, 전부 길이 있다', () => {
    // 빈 표본이 아래 단언을 전부 통과시킨 전례가 이 저장소에 여럿이다.
    let central = 0, satellite = 0, withRoad = 0;
    for (let px = -PLAZA_R; px <= PLAZA_R; px++) {
      for (let pz = -PLAZA_R; pz <= PLAZA_R; pz++) {
        if (isCentralPlaza(px, pz)) central++;
      }
    }
    for (const [px, pz] of plazaCells()) {
      if (!isCentralPlaza(px, pz)) satellite++;
      if (roadDirs(px, pz).length > 0) withRoad++;
    }
    expect(central).toBe(9);
    // 위성 광장이 0 이면 아래 전역 순회가 중앙 9칸만 도는 것과 같아진다.
    expect(satellite).toBeGreaterThan(0);
    // 길 없는 광장 칸이 있으면 그 칸은 이 결함과 무관하다 — 표본이 흐려지므로 못 박는다.
    expect(withRoad).toBe(central + satellite);
  });

  // ★ 본체. 길이 있는 광장 칸이면 **반드시** 중심 조각이 있어야 한다.
  //   뮤테이션: `road.ts` 의 `seg(0, 0, 0, ROAD_SEG)` 앞에 `if (!isPlaza(px, pz))` 를
  //   되살리면 깨진다(그것이 이 결함의 원문이다).
  it('길이 있는 광장 칸에는 전부 중심 조각이 있다 — 중앙도 위성도 하나도 빠지지 않는다', () => {
    const missing: string[] = [];
    let checked = 0;
    for (const [px, pz] of plazaCells()) {
      if (roadDirs(px, pz).length === 0) continue;
      checked++;
      if (!placeAt(px, pz).some(isCenterPiece)) missing.push(`(${px},${pz})`);
    }
    expect(missing).toEqual([]);
    // 격자 전체(−15..14)에서 **38칸**(중앙 9 · 위성 29). 이 수가 줄면 순회가 좁아진
    // 것이지 결함이 없어진 게 아니다 — 빈 표본이 통과하는 형태를 여기서 막는다.
    expect(checked).toBe(38);
  });

  // ⚠️ **랜드마크가 있는 칸도 예외가 아니다.** 옛 처방(가드를 `plazaLandmark !== null`
  //    로 좁히기)이었다면 이 검사가 깨진다 — 그리고 그것이 감독이 본 화면이다.
  it('랜드마크가 서는 칸도 중심 조각을 받는다 — 분수 반경이 5×5 를 못 덮는다', () => {
    const withLandmark: string[] = [];
    for (let px = -PLAZA_R; px <= PLAZA_R; px++) {
      for (let pz = -PLAZA_R; pz <= PLAZA_R; pz++) {
        if (!isCentralPlaza(px, pz)) continue;
        if (plazaLandmark(px, pz) === null) continue;
        withLandmark.push(`(${px},${pz})`);
        if (roadDirs(px, pz).length === 0) continue;
        expect(placeAt(px, pz).some(isCenterPiece), `${px},${pz} 중심 조각 없음`).toBe(true);
      }
    }
    // 랜드마크 칸이 실제로 존재해야 위 단언이 뜻을 갖는다. 0 이면 공허하게 통과한다.
    expect(withLandmark.length).toBeGreaterThan(0);
  });

  // 옛 주석의 주장을 **좌표로 반증해 둔다.** 이것이 결함의 뿌리였다 —
  // *"그 자리에 분수대나 시계탑이 선다"* 가 9칸 중 2칸에서만 참이었고 아무도 안 쟀다.
  //
  // 뮤테이션: `plaza.ts` 의 `plazaLandmark` 가 모든 광장 칸에 랜드마크를 주게 하면 깨진다.
  // 그때는 옛 주석이 참이 되므로 이 검사와 주석을 함께 고치는 것이 맞다.
  it('광장 9칸 중 랜드마크가 서는 칸은 소수다 — 옛 주석이 왜 거짓이었는가', () => {
    let landmark = 0, empty = 0;
    for (let px = -PLAZA_R; px <= PLAZA_R; px++) {
      for (let pz = -PLAZA_R; pz <= PLAZA_R; pz++) {
        if (!isCentralPlaza(px, pz)) continue;
        if (plazaLandmark(px, pz) !== null) landmark++; else empty++;
      }
    }
    expect(landmark).toBeGreaterThan(0);
    // **빈 칸이 다수다.** 그래서 "랜드마크가 덮는다" 를 근거로 중심을 비울 수 없다.
    expect(empty).toBeGreaterThan(landmark);
  });
});

describe('광장 밖도 그대로다 — 회귀가 광장에만 머문다', () => {
  // 가드를 없앤 변경이 **광장 밖 도로를 바꾸지 않았는지** 본다. 광장 밖에는 원래
  // 중심 조각이 있었으므로 개수·모양이 그대로여야 한다.
  it('광장 밖 길 있는 파셀도 전부 중심 조각을 갖는다', () => {
    let checked = 0;
    for (let px = GRID_MIN_X; px <= GRID_MAX_X; px += 3) {
      for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz += 3) {
        if (isPlaza(px, pz)) continue;
        if (roadDirs(px, pz).length === 0) continue;
        checked++;
        expect(placeAt(px, pz).some(isCenterPiece), `(${px},${pz})`).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  // `maxPerParcel` 은 슬롯 예산의 근거다. 광장에 중심이 들어오면서 실제 최댓값이
  // 늘었는지 본다 — 예산보다 크면 조각이 **조용히 잘린다**(그 실패는 아무 데도 안 뜬다).
  //
  // 실측(2026-08-09, 전 파셀 순회): 최댓값 **9**, 예산 **9** — 딱 맞는다. 광장 칸도
  // 9 다(중심이 들어와도 팔이 넷을 넘지 않으므로 광장 밖 사거리와 같은 수다).
  //
  // 그래서 `<=` 가 아니라 **`===`** 로 못 박는다. 한쪽만 봐서는 안 되기 때문이다:
  //   · 실제 > 예산 → 조각이 잘린다(화면에서 사라지고 아무 데도 안 뜬다)
  //   · 실제 < 예산 → 슬롯을 쓰지도 않고 잡는다(스트리밍 예산의 낭비)
  // `<=` 만 두면 예산을 20 으로 올려도 초록이라 **검출력이 절반**이다.
  it('실제 조각 수의 최댓값이 `maxPerParcel` 예산과 정확히 같다', () => {
    const budget = road.maxPerParcel!(O);
    let seen = 0;
    for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
      for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
        const n = placeAt(px, pz).length;
        seen = Math.max(seen, n);
        expect(n, `(${px},${pz}) 가 예산 초과`).toBeLessThanOrEqual(budget);
      }
    }
    expect(seen).toBe(budget);
  });
});
