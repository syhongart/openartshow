// world5 의 **세계 모양** — 감독이 카드로 고른 것이 실제로 그렇게 됐는가.
//
// ── 감독 지시 (2026-08-08) ──────────────────────────────────────────────────
// 카드 선택: *"권장으로 10*10부터 해보자. **중앙에 호수도 넣어줘. 호수 3개 영역.
// 끝은 바다.**"* / 뒤이어 *"센트럴파크 공원도 넣고."*
//
// 이 파일이 지키는 것은 **룩이 아니라 구조**다. 공원이 예쁜지·도시가 꽉 찼는지는
// 감독 화면이 판정한다(팀장 판정: 게이트는 하한, 상한은 감독). 여기서는 세 가지만
// 본다 — 세계가 닫혀 있는가, 공원이 있는가, 호수가 셋인가.
//
// ── 왜 이 검사가 필요한가 ───────────────────────────────────────────────────
// 이 저장소 머리말(`decide/grid.ts`)이 스스로 경고한다: *"'여기가 세계 안인가' 를 묻는
// 곳이 여럿이다 — 스트리밍·미니맵·물·배치. 각자 적으면 격자를 바꿀 때 한쪽만 따라오고,
// 증상은 **지도에는 있는데 걸어가면 없는 땅**으로 나타난다."*
//
// 격자 크기를 30 → 20 으로 줄이면서 그 위험이 실제로 열렸다. 물 경계(`worldHalfExtent`)
// 는 격자에서 유도되므로 따라오지만, **공원·호수는 이번에 새로 넣은 것**이라 유도 사슬에
// 아직 묶여 있지 않다. 그 사슬을 검사로 못 박는다.

import { describe, it, expect } from 'vitest';
import {
  GRID_W, GRID_H, GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z,
  inGrid, isCentralPlaza, isCentralPark, isParkLake, PARK_X, PARK_Z, SPAWN,
} from '../frontend/js/world5/decide/grid.js';
import { parcelWater, worldHalfExtent } from '../frontend/js/world5/decide/water.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world5/parts/types.js';

const CELL = DEFAULT_LAYOUT.cellX;

/** 세계 안 모든 파셀. 검사가 표본을 실제로 훑는지 먼저 확인하려고 배열로 만든다 */
const ALL: { px: number; pz: number }[] = [];
for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
  for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) ALL.push({ px, pz });
}

describe('세계는 유한하고 끝은 바다다', () => {
  it('표본이 격자 크기와 맞는다 — 비면 아래 단언이 전부 공허하다', () => {
    expect(ALL.length).toBe(GRID_W * GRID_H);
    expect(ALL.length).toBeGreaterThan(100);
  });

  it('감독이 고른 "10×10 블록" 이 20×20 파셀이다', () => {
    // 블록 = 2×2 슈퍼셀(`blockPattern` 이 정의하는 단위)이므로 10 블록 = 20 파셀이다.
    // 근거 전문은 `decide/grid.ts` 의 `GRID_W` 주석 한 곳에 있다 — 여기 다시 적지 않는다.
    expect(GRID_W).toBe(20);
    expect(GRID_H).toBe(20);
    // 640m 사방. 이 숫자가 바뀌면 위 해석이 바뀐 것이므로 주석도 함께 봐야 한다.
    expect(GRID_W * CELL).toBe(640);
  });

  it('격자 밖은 전부 물이다 — 이것이 "끝은 바다" 다', () => {
    // 네 방향 모두. 한 방향만 보면 부호 실수를 놓친다(좌표 절반이 음수인 세계다).
    const outside = [
      { px: GRID_MIN_X - 1, pz: 0 }, { px: GRID_MAX_X + 1, pz: 0 },
      { px: 0, pz: GRID_MIN_Z - 1 }, { px: 0, pz: GRID_MAX_Z + 1 },
    ];
    for (const p of outside) {
      expect(inGrid(p.px, p.pz), `(${p.px},${p.pz}) 가 격자 안으로 잡힌다`).toBe(false);
      expect(parcelWater(p.px, p.pz, CELL, CELL), `(${p.px},${p.pz})`).toBe('water');
    }
  });

  it('바다 경계가 격자에서 유도된다 — 둘이 어긋나면 없는 땅이 생긴다', () => {
    // `worldHalfExtent` 가 격자를 안 보고 자기 상수를 들고 있으면, 격자를 줄인 지금
    // **지도에는 있는데 걸어가면 바다인** 칸이 생긴다. 유도값인지 산술로 확인한다.
    expect(worldHalfExtent(CELL)).toBe(Math.max(-GRID_MIN_X, GRID_MAX_X + 1) * CELL);
  });

  it('스폰 지점은 세계 안이고 뭍이다 — 첫 프레임이 물속이면 게임이 아니다', () => {
    const px = Math.round(SPAWN.x / CELL);
    const pz = Math.round(SPAWN.z / CELL);
    expect(inGrid(px, pz)).toBe(true);
    expect(parcelWater(px, pz, CELL, CELL)).not.toBe('water');
  });
});

describe('센트럴파크', () => {
  const park = ALL.filter((p) => isCentralPark(p.px, p.pz));

  it('공원이 실재한다 — 빈 표본이면 아래가 전부 공허하다', () => {
    expect(park.length).toBeGreaterThan(4);
  });

  it('세계 안에 있다', () => {
    for (const p of park) expect(inGrid(p.px, p.pz), `(${p.px},${p.pz})`).toBe(true);
  });

  it('중앙 광장과 겹치지 않는다 — 겹치면 스폰 첫 화면이 잔디가 된다', () => {
    // 감독이 정한 첫 구도(*분수대를 앞에 두고 시계탑을 배경으로*)가 사라지는 자리다.
    for (const p of park) {
      expect(isCentralPlaza(p.px, p.pz), `(${p.px},${p.pz}) 가 광장과 겹친다`).toBe(false);
    }
  });

  it('세로로 길다 — 정사각 공원은 공원이 아니라 빈 광장으로 읽힌다', () => {
    const w = PARK_X[1] - PARK_X[0] + 1;
    const h = PARK_Z[1] - PARK_Z[0] + 1;
    expect(h, `공원이 ${w}×${h} — 세로가 더 길어야 한다`).toBeGreaterThan(w);
  });

  it('공원이 격자에서 유도된다 — 세계를 줄이면 함께 따라온다', () => {
    // 좌표를 직접 적었으면 격자를 줄이는 날 공원만 세계 밖에 남는다.
    expect(PARK_Z[0]).toBe(GRID_MIN_Z + 2);
  });
});

describe('호수 3영역', () => {
  const lakes = ALL.filter((p) => isParkLake(p.px, p.pz));

  it('호수 칸이 실재한다', () => {
    expect(lakes.length).toBeGreaterThan(2);
  });

  it('전부 공원 안이다 — 밖으로 새면 도로 한복판에 물이 생긴다', () => {
    for (const p of lakes) {
      expect(isCentralPark(p.px, p.pz), `호수 (${p.px},${p.pz}) 가 공원 밖`).toBe(true);
    }
  });

  it('**영역이 정확히 셋이다** — 감독이 "호수 3개 영역" 이라고 했다', () => {
    // 인접한 칸끼리 묶어 덩어리 수를 센다. 칸 수가 아니라 **영역 수**가 셋이어야 한다 —
    // 한 덩어리가 세 칸이면 그것은 호수 하나지 셋이 아니다.
    const key = (px: number, pz: number) => `${px},${pz}`;
    const set = new Set(lakes.map((p) => key(p.px, p.pz)));
    const seen = new Set<string>();
    let groups = 0;
    for (const p of lakes) {
      if (seen.has(key(p.px, p.pz))) continue;
      groups++;
      // 너비 우선으로 한 덩어리를 통째로 삼킨다(4-이웃 연결)
      const queue = [p];
      seen.add(key(p.px, p.pz));
      while (queue.length) {
        const c = queue.pop()!;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const k = key(c.px + dx, c.pz + dz);
          if (set.has(k) && !seen.has(k)) {
            seen.add(k);
            queue.push({ px: c.px + dx, pz: c.pz + dz });
          }
        }
      }
    }
    expect(groups).toBe(3);
  });

  it('물 판정이 호수를 물로 본다 — 안 그러면 잔디 위에 수면이 뜬다', () => {
    // 격자는 "여기가 호수다" 를 알고 물은 "여기가 물이다" 를 안다. 둘이 갈리면
    // 지면은 깔리는데 수면도 그려지는 상태가 된다.
    for (const p of lakes) {
      expect(parcelWater(p.px, p.pz, CELL, CELL), `(${p.px},${p.pz})`).toBe('water');
    }
  });

  it('호숫가가 `shore` 로 잡힌다 — 물가 판정이 호수를 모르면 미니맵이 틀린다', () => {
    // 호수 칸의 이웃 중 물이 아닌 칸은 반드시 물가여야 한다.
    const near = new Set<string>();
    for (const p of lakes) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        near.add(`${p.px + dx},${p.pz + dz}`);
      }
    }
    let checked = 0;
    for (const k of near) {
      const [px, pz] = k.split(',').map(Number);
      const c = parcelWater(px, pz, CELL, CELL);
      if (c === 'water') continue; // 호수끼리 붙은 칸
      expect(c, `(${px},${pz}) 가 호숫가인데 ${c}`).toBe('shore');
      checked++;
    }
    // 물가 칸이 하나도 없으면 위 루프가 안 돈 것이다 — 빈 표본 방어.
    expect(checked).toBeGreaterThan(3);
  });
});
