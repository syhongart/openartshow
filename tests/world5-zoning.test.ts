// world5 도심 밀도 — **축소 미반영 리터럴을 유도로 바꾼 것을 지키는 게이트.**
//
// ── 왜 이 파일이 생겼나 ──────────────────────────────────────────────────────
// world5 는 world2(30×30)의 포크인데 격자를 20×20 으로 줄였다. 그런데 세계 크기를
// 전제로 잡힌 값들이 **리터럴이라 따라오지 않았고**, 이번 회차에만 다섯 곳에서 났다:
// 강 진폭 · 공원 배치 · 도심 반경 · NPC 스폰 상한 · 미니맵 반경.
//
// 공통 형태는 하나다 — **주석이 유도를 "설명" 하고 값은 리터럴이었다.** 예:
//   *"세계 한 변이 30 파셀이므로 그 절반"* → `const MAX_SPAWN_REACH = 15;`
// 설명은 유도가 아니다. 설명은 세계가 줄어도 안 따라온다.
//
// 그래서 셋 다 산술로 바꾸고, **그 산술이 격자를 실제로 읽는지**를 여기서 잰다.
// 값을 다시 적어 비교하면 미러링이라 뜻이 없으므로, 검사의 축은 **관계**다 —
// "격자가 이 값을 정하는가", "이 값이 지키겠다고 한 조건을 지키는가".
//
// ── 명목과 실효 (팀장 조건 3, 2026-08-09) ────────────────────────────────────
// 도심 비율은 **명목이 거짓말한다.** `isTowerParcel` 이 광장·물·길없음을 배제하고
// 공원에는 타워가 안 서므로, 명목 42.3%(169칸) 중 실제로 타워가 설 수 있는 칸은 89 다.
// 팀장 원문: *"42.3% 라는 명목치가 이미 거짓말하고 있음을 브리프 스스로 실측했다."*
// 그 간극이 사라지지 않도록 검사로 고정한다.

import { describe, it, expect } from 'vitest';
import {
  DOWNTOWN_SHARE, TOWER_P_CORE, TOWER_P_OUTER,
  downtownRadius, downtownR, isDowntown, isTowerParcel,
} from '../frontend/js/world5/parts/zoning.js';
import { MAX_SPAWN_REACH } from '../frontend/js/world5/decide/npc-walk.js';
import { MAP_R_VISIBLE } from '../frontend/js/world5/decide/minimap.js';
import {
  GRID_W, GRID_H, GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z,
  isCentralPark, isCentralPlaza,
} from '../frontend/js/world5/decide/grid.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world5/parts/types.js';
import { parcelWater } from '../frontend/js/world5/decide/water.js';

const CX = DEFAULT_LAYOUT.cellX;
const CZ = DEFAULT_LAYOUT.cellZ;

// ✅ **전역 상태가 사라졌다** — 감독 판정과 함께 노브를 제거했으므로 `afterEach` 로
//    프리셋을 되돌릴 것이 없다. 그 상태는 *"판정과 함께 사라지는 조건"* 으로만
//    승인됐던 것이고(검수관·팀장), 지금 이 파일이 순수 함수만 부르는 것이 그 증거다.

/** 세계 전체에 서는 마천루 수 */
function towerCount(): number {
  let n = 0;
  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      // 공원에는 `tower.place` 가 가드로 막지만 `isTowerParcel` 은 그것을 모른다 —
      // 화면에 서는 수를 세려면 여기서 함께 빼야 한다.
      if (isCentralPark(px, pz)) continue;
      if (isTowerParcel(px, pz, CX, CZ)) n++;
    }
  }
  return n;
}

describe('도심 반경은 격자에서 유도된다', () => {
  it('반경이 명목 면적 비율을 실제로 만족한다', () => {
    // `(2R+1)²` 이 `share × W × H` 에 가장 가까운 정수 R 이어야 한다. 산술을 다시
    // 적는 대신 **이웃 반경보다 더 가까운가**를 본다 — 반올림이 옳은지를 재는 축이다.
    for (const share of [0.12, 0.19, 0.30, 0.42]) {
      const R = downtownRadius(share);
      const target = share * GRID_W * GRID_H;
      const err = (r: number) => Math.abs((2 * r + 1) ** 2 - target);
      expect(err(R), `share=${share}`).toBeLessThanOrEqual(err(R - 1));
      expect(err(R), `share=${share}`).toBeLessThanOrEqual(err(R + 1));
    }
  });

  it('격자가 줄면 반경도 준다 — 이것이 리터럴이었을 때 안 일어난 일이다', () => {
    // 같은 비율이라도 세계가 작으면 반경이 작아야 한다. 리터럴 `6` 은 이 관계를
    // 만족하지 않았고, 그래서 world5 에서 도심이 2.25배가 됐다.
    expect(downtownRadius(0.19)).toBeLessThan(downtownRadius(0.42));
    // 격자를 직접 바꿔 볼 수는 없으므로(모듈 상수다) 비율 축으로 단조성을 본다.
    let prev = -1;
    for (const share of [0.05, 0.12, 0.19, 0.30, 0.42, 0.60]) {
      const R = downtownRadius(share);
      expect(R).toBeGreaterThanOrEqual(prev);
      prev = R;
    }
  });
});

describe('확정값 — 감독 판정 "기본"(마천루 8기)', () => {
  // ★ 이 회차의 판정 그 자체다. 노브를 열어 감독이 고른 값이고, 노브는 함께 제거했다.
  //   뮤테이션: `TOWER_P_CORE` 를 0.12(축소 미반영 시절 값)로 되돌리면 깨진다.
  it('마천루가 정확히 8기 선다', () => {
    expect(towerCount()).toBe(8);
  });

  // ⚠️ **이것이 왜 별도 검사인가** — 위 "8기" 만으로는 *"확률만 올려 우연히 8이 됐다"*
  //    와 구별되지 않는다. 도심 반경이 실제로 줄어야(축소를 따라가야) 판정이 성립한다.
  //    뮤테이션: `DOWNTOWN_SHARE` 를 0.42(현행 미반영)로 되돌리면 깨진다.
  it('도심 반경이 축소를 따라간 값이다 — 면적 비율이 world2 실측을 보존한다', () => {
    expect(downtownR()).toBe(4);
    // 명목 면적이 world2 의 18.8% 언저리다. 42.3%(축소 미반영)와는 두 배 이상 벌어진다.
    const nominal = (2 * downtownR() + 1) ** 2 / (GRID_W * GRID_H);
    expect(nominal).toBeGreaterThan(0.15);
    expect(nominal).toBeLessThan(0.25);
  });

  // 밀도와 면적이 **함께** 움직여야 한다는 것이 이 회차의 교훈이다. 면적만 따라가고
  // 확률을 그대로 뒀다면 마천루가 3기가 됐고, 감독 지시와 정면으로 부딪혔을 것이다.
  it('확률이 축소 이전 값보다 높다 — 좁아진 도심을 밀도로 보상한다', () => {
    // 0.12 는 30×30 시절 값이다. 그 값을 그대로 두면 실측 3기다.
    expect(TOWER_P_CORE).toBeGreaterThan(0.12);
    // 그렇다고 아무 값이나 되는 것은 아니다 — 도심 밖(0.01)과의 격차가 곧 스카이라인이다.
    expect(TOWER_P_CORE).toBeGreaterThan(TOWER_P_OUTER * 10);
    expect(TOWER_P_CORE).toBeLessThan(0.5);
  });

  it('도심 밖 확률이 0 이 아니다 — 외따로 선 타워가 도시의 끝을 알려준다', () => {
    expect(TOWER_P_OUTER).toBeGreaterThan(0);
    expect(TOWER_P_OUTER).toBeLessThan(TOWER_P_CORE);
  });

  it('`share` 상수가 반경 유도에 실제로 쓰인다 — 상수만 바꾸고 함수가 안 따라오면 깨진다', () => {
    expect(downtownR()).toBe(downtownRadius(DOWNTOWN_SHARE));
  });
});

describe('명목 도심은 실효 도심보다 크다 — 비율이 거짓말하는 지점', () => {
  it('배제 조건이 실제로 칸을 걷어낸다', () => {
    // 확정값(R=4)에서 잰다. 노브가 있던 동안에는 `dense`(명목 42.3%)로 재서 간극이
    // 더 크게 보였는데, 확정값에서도 간극은 그대로 성립한다 — 그것이 요점이다.
    const R = downtownR();
    let nominal = 0, effective = 0;
    let park = 0, plaza = 0, wet = 0;
    for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
      for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
        if (Math.max(Math.abs(px), Math.abs(pz)) > R) continue;
        nominal++;
        // 배제 조건은 `isTowerParcel` 이 SSOT 다. 여기서는 **왜 빠지는지**를 세려고
        // 나눠 보는 것이고, 물 판정만은 `parcelWater` 를 직접 부른다 — 그것이 물의
        // SSOT 이므로 다시 적는 것이 아니라 그대로 쓰는 것이다.
        if (isCentralPark(px, pz)) { park++; continue; }
        if (isCentralPlaza(px, pz)) { plaza++; continue; }
        if (parcelWater(px, pz, CX, CZ) !== 'dry') { wet++; continue; }
        effective++;
      }
    }
    // 명목이 0 이 아니어야 아래 비교가 뜻을 갖는다(빈 표본이 단언을 통과시킨 전례가 있다).
    expect(nominal).toBeGreaterThan(0);
    // 셋 다 실제로 칸을 걷어내야 한다. 하나라도 0 이면 그 배제 조건은 이 세계에서
    // 도달 불가능한 것이고, 그러면 "명목이 거짓말한다" 는 근거가 그만큼 약해진다.
    expect(park).toBeGreaterThan(0);
    expect(plaza).toBeGreaterThan(0);
    expect(wet).toBeGreaterThan(0);
    expect(effective).toBe(nominal - park - plaza - wet);
    // 간극이 **작지 않다** — 명목의 절반 언저리다. "조금 다르다" 가 아니라 "비율을
    // 그대로 읽으면 두 배 틀린다" 가 이 검사의 요점이다.
    expect(effective).toBeLessThan(nominal * 0.7);
  });
});

describe('NPC 스폰 상한 · 미니맵 반경 — 격자에서 유도된다', () => {
  it('스폰 상한이 세계 한 변의 절반을 덮는다', () => {
    // 주석의 주장: "세계 한 변의 절반이면 어디에 서 있든 세계 전체가 후보에 든다."
    // 세계 끝에 선 사람이 반대쪽 끝까지 닿을 필요는 없고, **중앙에서 양끝**에 닿으면
    // 된다. 그것이 `한 변 / 2` 다.
    expect(MAX_SPAWN_REACH).toBeGreaterThanOrEqual(Math.max(GRID_W, GRID_H) / 2);
    // 그리고 무의미하게 크지 않다 — 한 변을 통째로 넘으면 루프만 길어진다.
    expect(MAX_SPAWN_REACH).toBeLessThan(Math.max(GRID_W, GRID_H));
    // 정수여야 한다. `pickNearby` 가 정수 셀 인덱스를 계약으로 받는다(B1 전말은
    // `features/npc.ts` 의 `SPAWN_REACH` 주석).
    expect(Number.isInteger(MAX_SPAWN_REACH)).toBe(true);
  });

  it('미니맵이 세계 끝 바깥까지 담는다 — "유한 세계" 가 지도에서 읽힌다', () => {
    // 이 값이 지키겠다고 한 조건 그대로다: 어느 방향으로 봐도 지도 안에 바다가 있어야
    // 세계가 끝난 것으로 읽힌다. 리터럴 `8` 은 world5 에서 이 조건을 어기고 있었다.
    for (const edge of [GRID_MAX_X + 1, -GRID_MIN_X, GRID_MAX_Z + 1, -GRID_MIN_Z]) {
      expect(MAP_R_VISIBLE).toBeGreaterThan(edge);
    }
    expect(Number.isInteger(MAP_R_VISIBLE)).toBe(true);
  });
});
