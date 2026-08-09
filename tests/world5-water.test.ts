// world5 물 판정 — **강을 남쪽 가장자리로 옮긴 판정을 지키는 게이트**(팀장 재판정 (C)).
//
// ── 왜 world2 테스트로 갈음할 수 없나 ────────────────────────────────────────
// world5 는 world2 의 **포크**다(`frontend/js/world5/README.md`). 두 트리는 서로를
// import 하지 않으므로 `tests/world2-water.test.ts` 는 world5 의 어떤 값도 안 본다.
// world3 에서 정확히 이 착각으로 검수관 블로커 B1 이 났다 — 주석이 world2 테스트가
// 지킨다고 적고 있었고 거짓이었다.
//
// ══════════════════════════════════════════════════════════════════════════
// ★ 이 파일이 재는 축 — **선언이 아니라 `parcelWater`**
// ══════════════════════════════════════════════════════════════════════════
// 검수관 블로커 B1 의 핵심은 값이 아니라 **재는 축**이었다. 앞선 판본의 검사는
// `isParkLake` 라는 **신고**를 4-이웃으로 세어 "호수 3개" 를 통과시켰는데, 화면에 물로
// 나타나는 것은 `parcelWater(...) === 'water'` 다(스트리밍이 그 칸을 안 만들고, 그
// 구멍으로 수면이 비친다). 강이 공원을 관통하면 신고와 화면이 갈라진다 — 실제로
// 갈라져 있었고, 신고 축 검사는 **전부 초록이었다.**
//
// 그래서 여기서는 하나도 빠짐없이 `parcelWater` 로 센다. 같은 형태의 착각을
// (계산된 값이 실제로 소비되는가) 이 저장소가 이미 네 번 겪었다.

import { describe, it, expect } from 'vitest';
import {
  parcelWater, riverCenterZ, riverFlowAt, isRiver, worldHalfExtent,
  RIVER_HALF, RIVER_SOUTH_BANK, riverSlopeLimit,
} from '../frontend/js/world5/decide/water.js';
import {
  GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z,
  isCentralPark, isCentralPlaza, isParkLake, SPAWN,
} from '../frontend/js/world5/decide/grid.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world5/parts/types.js';

const CX = DEFAULT_LAYOUT.cellX;
const CZ = DEFAULT_LAYOUT.cellZ;

/** 격자 전체를 훑어 `parcelWater` 가 `'water'` 로 준 파셀 목록 */
function waterParcels(): [number, number][] {
  const out: [number, number][] = [];
  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      if (parcelWater(px, pz, CX, CZ) === 'water') out.push([px, pz]);
    }
  }
  return out;
}

/**
 * 물 파셀을 **4-이웃 연결**로 묶는다. 대각선을 연결로 치지 않는 것이 요점이다 —
 * 지면은 파셀 한 칸을 통째로 덮는 판이라, 두 물 칸이 꼭짓점에서만 닿으면 그 사이를
 * **걸어서 건널 수 있다.** 화면에서도 강이 토막 난 웅덩이로 보인다.
 */
function clumps(cells: [number, number][]): [number, number][][] {
  const k = (a: number, b: number) => `${a},${b}`;
  const all = new Set(cells.map(([a, b]) => k(a, b)));
  const seen = new Set<string>();
  const out: [number, number][][] = [];
  for (const [px, pz] of cells) {
    if (seen.has(k(px, pz))) continue;
    seen.add(k(px, pz));
    const stack: [number, number][] = [[px, pz]];
    const group: [number, number][] = [];
    while (stack.length) {
      const [a, b] = stack.pop()!;
      group.push([a, b]);
      for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = k(a + da, b + db);
        if (all.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push([a + da, b + db]); }
      }
    }
    out.push(group);
  }
  return out;
}

describe('강 — 남쪽 가장자리를 끊김 없이 가로지른다', () => {
  // 팀장 재판정 (C) 의 본체. 부호가 뒤집히면 강이 도시 북쪽으로 돌아가고 공원과 겹친다.
  it('강은 +z(남쪽)에 있다 — 판정 (C) 의 부호', () => {
    for (let x = -worldHalfExtent(CX); x <= worldHalfExtent(CX); x += 8) {
      expect(riverCenterZ(x, CZ)).toBeGreaterThan(0);
    }
  });

  // ★ 끊김 검사. `parcelWater` 가 x 열마다 중심선을 한 번 평가하므로, 기울기가 크면
  //   이웃 열과 공통 파셀이 없어 강이 토막 난다(실측으로 드러난 결함 — `swingBySlope`).
  it('강 물 파셀이 하나의 4-이웃 덩어리로 x 전 폭을 관통한다', () => {
    // 강만 본다 — 바다(격자 밖 이웃)와 공원 호수는 별개 덩어리다.
    const river = waterParcels().filter(([px, pz]) => isRiver(px * CX, pz * CZ, CZ));
    const g = clumps(river);
    expect(g.length).toBe(1);
    const xs = g[0].map(([px]) => px);
    expect(Math.min(...xs)).toBe(GRID_MIN_X);
    expect(Math.max(...xs)).toBe(GRID_MAX_X);
    // 모든 x 열에 물이 최소 한 칸 있다 — 위 두 단언은 양 끝만 보므로 가운데가 비어도
    // 통과할 수 있다(덩어리가 하나라는 조건이 막기는 하지만, 왜 막는지를 여기 적는다).
    const cols = new Set(xs);
    expect(cols.size).toBe(GRID_MAX_X - GRID_MIN_X + 1);
  });

  it('중심선의 실제 최대 기울기가 끊김 상한 아래다 — 원인 축', () => {
    // 상한은 `decide/` 가 유도한다. 여기서 다시 적으면 유도와 검사가 각자 틀릴 수 있다.
    const limit = riverSlopeLimit(CZ);
    const h = 0.5;
    let max = 0;
    for (let x = -worldHalfExtent(CX); x <= worldHalfExtent(CX); x += 1) {
      const d = Math.abs((riverCenterZ(x + h, CZ) - riverCenterZ(x - h, CZ)) / (2 * h));
      max = Math.max(max, d);
    }
    expect(max).toBeLessThan(limit);
  });

  it('강 남쪽에 뭍이 최소 RIVER_SOUTH_BANK 줄 남는다 — 다리 건너에 갈 곳이 있다', () => {
    for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
      let rows = 0;
      for (let pz = GRID_MAX_Z; pz >= GRID_MIN_Z; pz--) {
        if (parcelWater(px, pz, CX, CZ) === 'water') break;
        rows++;
      }
      expect(rows).toBeGreaterThanOrEqual(RIVER_SOUTH_BANK);
    }
  });
});

describe('센트럴파크 — 호수 3영역 (감독 지시)', () => {
  // ★ B1 처방. `isParkLake` 신고가 아니라 **화면에 물로 나오는 것**을 센다.
  it('공원 안에만 있는 물 덩어리가 정확히 3개다', () => {
    const inPark = waterParcels().filter(([px, pz]) => isCentralPark(px, pz));
    const g = clumps(inPark);
    // 공원 밖으로 새어 나간 덩어리가 있으면(강이 공원에 닿으면) 그것도 여기 잡힌다 —
    // 공원 안 칸만 모아 묶었으므로, 강이 관통하면 덩어리 수가 3을 넘거나 크기가 튄다.
    expect(g.length).toBe(3);
    // 셋의 크기가 서로 달라야 "물웅덩이 셋" 이 아니라 연못·호수·저수지로 읽힌다
    // (`decide/grid.ts` 의 `PARK_LAKES` 주석이 명시한 의도).
    const sizes = g.map((c) => c.length).sort((a, b) => a - b);
    expect(new Set(sizes).size).toBe(3);
  });

  it('공원 안의 물은 전부 호수다 — 강이 공원을 침범하지 않는다', () => {
    const intruder = waterParcels()
      .filter(([px, pz]) => isCentralPark(px, pz) && !isParkLake(px, pz));
    expect(intruder).toEqual([]);
  });

  it('중앙 광장은 전 칸이 뭍(dry)이다 — 물가조차 아니다', () => {
    // `'shore'` 도 실패로 친다. 배치는 물을 모르므로 무너지는 것은 없지만, 미니맵에서
    // 광장 한 칸이 물가 색으로 뜬다 — 실측에서 연못을 한 칸 남쪽에 놓았을 때 시계탑이
    // 서는 `(0,−1)` 이 그렇게 됐다(`PARK_LAKES` 주석의 `dz = 0` 금지).
    for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
      for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
        if (!isCentralPlaza(px, pz)) continue;
        expect(parcelWater(px, pz, CX, CZ)).toBe('dry');
      }
    }
  });

  it('스폰 지점이 뭍이다', () => {
    const px = Math.round(SPAWN.x / CX);
    const pz = Math.round(SPAWN.z / CZ);
    expect(parcelWater(px, pz, CX, CZ)).toBe('dry');
  });
});

describe('riverFlowAt — 유도가 곡선과 맞는가', () => {
  it('해석적 도함수가 수치미분과 일치한다', () => {
    const h = 0.01;
    for (let x = -300; x <= 300; x += 7) {
      const num = (riverCenterZ(x + h, CZ) - riverCenterZ(x - h, CZ)) / (2 * h);
      const f = riverFlowAt(x, CZ);
      expect(f.z / f.x).toBeCloseTo(num, 5);
    }
  });

  it('언제나 단위벡터다 — 속력이 다르면 UV 되감기에서 쿼드가 뒤틀린다', () => {
    for (let x = -320; x <= 320; x += 13) {
      const f = riverFlowAt(x, CZ);
      expect(Math.hypot(f.x, f.z)).toBeCloseTo(1, 9);
    }
  });

  // world2 에서는 `cell` 을 **안 받는 것**이 시그니처의 약속이었다(진폭·파장이 미터
  // 리터럴이라 도함수가 셀과 무관했다). world5 는 둘 다 세계 크기에서 유도하므로 그
  // 약속이 깨졌고, 인자를 추가했다. **그 추가가 의미를 갖는지**를 여기서 본다 —
  // 안에서 상수 셀을 쓰고 인자를 무시해도 컴파일은 통과하고 흐름만 어긋난다.
  it('셀 크기에 실제로 의존한다 — 인자를 무시하면 깨진다', () => {
    // ⚠️ 표본은 **정의역 안**이어야 한다. 처음에는 `CZ * 2`(=64)를 썼는데 그것은
    //    `2 × RIVER_HALF`(48) 밖이라 유도가 퇴화하는 영역이다 — 검사가 그 위에 서
    //    있었다(검수관 C2). 지금은 `swingBySlope` 가 거기서 던지므로 이 검사는 예외로
    //    깨지겠지만, **깨지는 이유가 재려던 것과 다르면 그것은 검사가 아니다.**
    const a = riverFlowAt(200, CZ);
    const b = riverFlowAt(200, CZ * 0.75);
    expect(a.z).not.toBeCloseTo(b.z, 4);
  });
});

describe('유도의 정의역 — 밖에서는 조용히 퇴화하지 않고 던진다 (검수관 C2)', () => {
  it('정의역 밖 셀에서 `riverCenterZ` 가 던진다', () => {
    // `cell ≥ 2 × RIVER_HALF` 면 파셀이 강을 표현할 수 없다. 실측(검수관):
    // cell=48 에서 굽이가 0(직선), cell=64 에서 강 덩어리가 2개(끊김)였다.
    expect(() => riverCenterZ(0, 2 * RIVER_HALF)).toThrow(RangeError);
    expect(() => riverCenterZ(0, 2 * RIVER_HALF + 16)).toThrow(RangeError);
    // 경계 바로 안쪽은 멀쩡해야 한다 — 던지는 범위가 넓으면 그것도 결함이다.
    expect(() => riverCenterZ(0, 2 * RIVER_HALF - 8)).not.toThrow();
  });

  it('메시지가 무엇을 해야 하는지 말한다 — 던지기만 하면 다음 사람이 막힌다', () => {
    let msg = '';
    try { riverCenterZ(0, 2 * RIVER_HALF); } catch (e) { msg = String(e); }
    // 정의역 값과 함께 "무엇을 다시 정해야 하는지" 가 있어야 한다.
    expect(msg).toContain(String(2 * RIVER_HALF));
    expect(msg).toContain('RIVER_HALF');
  });

  // ★ P2 — `RIVER_SOUTH_BANK` 제약은 기본 레이아웃에서 **지지 않는다**(64 vs 35.1).
  //   지지 않는 제약은 검출력이 0 이라 "죽은 코드" 로 오해받고 지워지기 쉽다.
  //   검수관 실측: `cell ≤ 28` 에서 `byBank` 가 이긴다. 그 셀을 표본으로 넣어 닫는다.
  it('작은 셀에서는 남쪽 둔치 제약이 이긴다 — 죽은 제약이 아니다', () => {
    const SMALL = 16;
    // 그 셀에서 남쪽 뭍이 정확히 `RIVER_SOUTH_BANK` 줄로 깎인다 — 기울기 제약이
    // 이겼다면 더 넉넉했을 것이다(기본 셀에서는 4줄이다).
    let minRows = Infinity;
    for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
      let rows = 0;
      for (let pz = GRID_MAX_Z; pz >= GRID_MIN_Z; pz--) {
        if (parcelWater(px, pz, SMALL, SMALL) === 'water') break;
        rows++;
      }
      minRows = Math.min(minRows, rows);
    }
    expect(minRows).toBe(RIVER_SOUTH_BANK);
  });
});
