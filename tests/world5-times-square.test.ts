// world5 타임스퀘어 + 랜드마크 마천루 — **첫 화면이 채워지는가.**
//
// ── 무엇을 지키는 검사인가 ──────────────────────────────────────────────────
// (아래 인용의 `빌딩증` 은 감독 발화 **원문**이다 — 다듬지 마라. 이유는
//  `parts/zoning.ts` 의 같은 인용 옆 한 곳에 적혀 있다.)
// 감독 지시 2026-08-08 *"진짜 뉴욕처럼 하고. … 엠파이어 빌딩증 뉴욕 상징물을 넣어줘.
// 타임스퀘어도 하고."* 가 화면에 나타나는 지점이 둘이고, 둘 다 **위치의 문제**다:
//
//   ① 스폰 정면에 구조물이 하나도 없었다 — 로드 반경 안 정면 4칸이 전부 중앙 광장이다
//   ② 마천루가 여덟 기인데 전부 32~60m 라 "저기가 중심이다" 를 말하는 것이 없었다
//
// 그래서 여기서 재는 것은 룩이 아니라 **기하**다. 파사드가 실제로 서는가, 도로를
// 덮지 않는가, 모서리에서 서로를 뚫지 않는가, 광장 안쪽을 보는가, 스폰 정면 시야에
// 들어오는가, 랜드마크가 정확히 한 기인가, 그림자 프러스텀이 그것을 담는가.
//
// ⚠️ **룩 판정은 여기서 못 한다.** 헤드리스는 WebGL(swiftshader)이고 감독 기기는
// WebGPU 라 톤매핑 뒤의 인상이 같지 않다 — *"압도적인가"*·*"타임스퀘어로 읽히는가"* 는
// 감독 화면이 유일한 판정 수단이다. 이 파일이 보증하는 것은 **구조가 성립한다**까지다.
//
// ── 난수를 하나로 고정하지 않는다 ───────────────────────────────────────────
// 파사드는 폭·높이·변을 따라가는 위치를 전부 난수로 흔든다. 시드 하나로 재면 "그 시드
// 에서는 안 겹쳤다" 를 "안 겹친다" 로 적게 되는데, 이 저장소가 *"실측은 밟아본 경로의
// 최댓값일 뿐 도달 가능한 최댓값이 아니다"* 라고 명문화한 형태가 정확히 그것이다.
// 그래서 기하 성질은 **`SEEDS` 전체 × 광장 전 칸**에 대해 단언한다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as T3 from 'three';

import {
  PLAZA_R, SPAWN, LANDMARK_PARCEL, isLandmarkParcel, isCentralPlaza, plazaRimSides,
  GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z,
} from '../frontend/js/world5/decide/grid.js';
import { DEFAULT_BANDS, tierFor, type Tier } from '../frontend/js/world5/decide/lod.js';
import { parcelWater } from '../frontend/js/world5/decide/water.js';
import { shadowFrustum } from '../frontend/js/world5/decide/shadow.js';
import {
  adfacade, PANEL_BACK, PANEL_FRONT, rimInset, panelWidth,
} from '../frontend/js/world5/parts/adfacade.js';
import { clocktower } from '../frontend/js/world5/parts/clocktower.js';
import { tower, MAX_H, LANDMARK_H, WORLD_MAX_H } from '../frontend/js/world5/parts/tower.js';
import { plazaOccupied, isPlaza } from '../frontend/js/world5/parts/plaza.js';
// 랜드마크 전제 단언(검수관 C-2)이 `isTowerParcel` 의 세 배제 조건을 그대로 잰다.
import { roadDirs } from '../frontend/js/world5/parts/road-topology.js';
import { SETBACK, LAMP_CLEARANCE, EAVE } from '../frontend/js/world5/parts/road-topology.js';
import { NEON_PARTS } from '../frontend/js/world5/parts/index.js';
import { V, luma } from '../frontend/js/world5/parts/palette.js';
import {
  DEFAULT_LAYOUT, type PlacedPart, type PlaceContext, type ThreeNS,
} from '../frontend/js/world5/parts/types.js';

const O = DEFAULT_LAYOUT;
const HALF_X = O.cellX / 2;
const HALF_Z = O.cellZ / 2;
/** 파츠가 물러서야 하는 선. 이 안쪽에만 몸통이 있어야 도로·가로등을 안 덮는다 */
const KEEP_OUT = SETBACK + LAMP_CLEARANCE;

/** 결정론 난수. `Math.random()` 이면 실패가 재현되지 않아 원인을 못 짚는다 */
function makeRnd(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEEDS = Array.from({ length: 48 }, (_, i) => 0x9e3779b1 + i * 0x01000193);

function ctx(px: number, pz: number, rnd: () => number): PlaceContext {
  return {
    px, pz, rnd, o: O,
    halfX: HALF_X - O.margin, halfZ: HALF_Z - O.margin,
    placed: [],
    radiusOf: () => 0,
  };
}

/** 중앙 광장 3×3 의 모든 칸 */
const PLAZA_CELLS: Array<[number, number]> = [];
for (let px = -PLAZA_R; px <= PLAZA_R; px++) {
  for (let pz = -PLAZA_R; pz <= PLAZA_R; pz++) PLAZA_CELLS.push([px, pz]);
}

// ══════════════════════════════════════════════════════════════════════════
// §1 격자가 정하는 자리 — 광장의 바깥 변
// ══════════════════════════════════════════════════════════════════════════

describe('§1 `plazaRimSides` — 광장 칸의 어느 변이 바깥인가', () => {
  it('표본이 실재한다 — 광장 칸이 비면 아래가 전부 공허하다', () => {
    expect(PLAZA_CELLS.length).toBe((2 * PLAZA_R + 1) ** 2);
    expect(PLAZA_CELLS.length).toBeGreaterThan(1);
  });

  // 뮤테이션: `if (!isCentralPlaza(px,pz)) return []` 를 지우면 광장 밖 칸이 변을 내어 깨진다.
  it('광장 밖은 언제나 빈 배열이다', () => {
    let checked = 0;
    for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
      for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
        if (isCentralPlaza(px, pz)) continue;
        expect(plazaRimSides(px, pz), `(${px},${pz})`).toEqual([]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  // 뮤테이션: `pz === -PLAZA_R` 를 `pz <= 0` 로 느슨하게 하면 가운데 칸이 north 를 얻어 깨진다.
  it('가운데 칸은 어느 변도 바깥이 아니다', () => {
    expect(plazaRimSides(0, 0)).toEqual([]);
  });

  /**
   * **이것이 이 함수의 의미다.** "바깥 변" 이란 그 방향 이웃이 광장이 아니라는 뜻이고,
   * 그 동치를 직접 잰다 — 좌표식을 옆에 다시 쓰는 것이 아니라 `isCentralPlaza` 로
   * 되물어 확인하므로, 판정식을 어떻게 바꾸든 의미가 어긋나면 깨진다.
   *
   * 뮤테이션: north 를 `pz === PLAZA_R` 로 뒤집으면 `(0,1)` 의 north 이웃이 `(0,0)`
   * (광장)이라 깨진다. `px === -PLAZA_R`(west) 줄을 지우면 아래 역방향 검사가 깨진다.
   */
  it('낸 변은 전부 광장 바깥과 맞닿고, 맞닿은 변은 전부 낸다 — 양방향', () => {
    const NEIGHBOR = {
      north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0],
    } as const;
    let sides = 0;
    for (const [px, pz] of PLAZA_CELLS) {
      const got = new Set<string>(plazaRimSides(px, pz));
      for (const [side, [dx, dz]] of Object.entries(NEIGHBOR)) {
        const outside = !isCentralPlaza(px + dx, pz + dz);
        expect(got.has(side), `(${px},${pz}) ${side}: 바깥=${outside} 신고=${got.has(side)}`)
          .toBe(outside);
      }
      sides += got.size;
    }
    // 3×3 이면 둘레 변이 12 다 — 네 변에 3칸씩.
    expect(sides).toBe(4 * (2 * PLAZA_R + 1));
  });
});

// ══════════════════════════════════════════════════════════════════════════
// §2 광고 파사드의 기하 — **실물 `place` 를 돌린다**
// ══════════════════════════════════════════════════════════════════════════

/** 한 시드로 광장 전 칸의 파사드를 모은다. 파셀 좌표를 함께 들고 다닌다 */
function facadesFor(seed: number): Array<{ px: number; pz: number; p: PlacedPart }> {
  const out: Array<{ px: number; pz: number; p: PlacedPart }> = [];
  for (const [px, pz] of PLAZA_CELLS) {
    const rnd = makeRnd(seed ^ (px * 0x9e3779b1) ^ (pz * 0x85ebca6b));
    for (const p of adfacade.place(ctx(px, pz, rnd))) out.push({ px, pz, p });
  }
  return out;
}

/** 파사드 지오의 실제 z 범위(단위 지오, 미터). **자산에서 읽는다 — 상수를 안 베낀다** */
const FACADE_Z = (() => {
  const geo = withCanvas(() => adfacade.asset(T3 as unknown as ThreeNS)).geometry as unknown as {
    computeBoundingBox(): void;
    boundingBox: { min: { z: number }; max: { z: number } };
  };
  geo.computeBoundingBox();
  return { min: geo.boundingBox.min.z, max: geo.boundingBox.max.z };
})();

/**
 * 파사드 한 장이 파셀 좌표계에서 차지하는 축정렬 상자. **회전을 반영한다.**
 *
 * `rotateY(ry)` 는 `+Z` 를 `(sin ry, 0, cos ry)`, `+X` 를 `(cos ry, 0, −sin ry)` 로
 * 보낸다. 폭은 `sx` 로 늘어나고 두께는 지오에 실치수로 굽혀 있으므로(`sz` 는 언제나 1),
 * 네 모서리를 직접 돌려 감싸는 것이 유일하게 정확한 방법이다.
 *
 * ⚠️ **첫 판본은 여기를 근사했다** — 앞면을 `p.z` 에 두고 두께 전체를 뒤로 셌다. 그
 * 근사가 실제 겹침 0.06m 를 통과시켰고, 정확히 계산하자 드러났다. **측정기가 틀리면
 * 결함이 아니라 측정기가 통과를 만든다.**
 */
function facadeBox(p: PlacedPart) {
  const nx = Math.sin(p.ry);
  const nz = Math.cos(p.ry);
  const wx = Math.cos(p.ry);
  const wz = -Math.sin(p.ry);
  const xs: number[] = [];
  const zs: number[] = [];
  for (const dz of [FACADE_Z.min, FACADE_Z.max]) {
    for (const dx of [-p.sx / 2, p.sx / 2]) {
      xs.push(p.x + dx * wx + dz * nx);
      zs.push(p.z + dx * wz + dz * nz);
    }
  }
  return {
    x0: Math.min(...xs), x1: Math.max(...xs),
    z0: Math.min(...zs), z1: Math.max(...zs),
  };
}

describe('§2 파사드는 광장 테두리에 서고 도로를 덮지 않는다', () => {
  it('표본이 실재한다', () => {
    expect(SEEDS.length).toBeGreaterThan(10);
    expect(facadesFor(SEEDS[0]).length).toBeGreaterThan(0);
  });

  // 뮤테이션: `plazaOccupied` 가드를 지우면 12 장이 되어 깨진다.
  //           `plazaRimSides` 대신 상수를 쓰면 개수가 달라져 깨진다.
  it('광장 둘레 변마다 한 장씩, 미술관 칸만 뺀다', () => {
    const occupiedSides = PLAZA_CELLS
      .filter(([px, pz]) => plazaOccupied(px, pz))
      .reduce((n, [px, pz]) => n + plazaRimSides(px, pz).length, 0);
    const want = 4 * (2 * PLAZA_R + 1) - occupiedSides;
    // 미술관 칸이 실제로 변을 갖고 있어야 이 뺄셈에 뜻이 있다
    expect(occupiedSides).toBeGreaterThan(0);
    for (const seed of SEEDS) {
      expect(facadesFor(seed).length, `seed ${seed}`).toBe(want);
    }
  });

  // 뮤테이션: `place` 의 `plazaRimSides` 조기반환을 지우면 광장 밖에도 서서 깨진다.
  it('광장 밖 파셀에는 한 장도 서지 않는다', () => {
    for (const seed of SEEDS.slice(0, 8)) {
      for (const [px, pz] of [[3, 3], [-4, 2], [0, -5], [7, -7], [2, 0]] as const) {
        expect(adfacade.place(ctx(px, pz, makeRnd(seed))), `(${px},${pz})`).toEqual([]);
      }
    }
  });

  /**
   * 뮤테이션: `rimInset` 에서 `- PANEL_T` 를 지우면 몸통 뒷면이 셋백 선을 넘어 깨진다.
   * `SETBACK + LAMP_CLEARANCE` 를 `SETBACK` 만으로 줄여도 가로등 여유를 먹어 깨진다.
   */
  it('몸통 전체가 도로 셋백 안이다 — 전 시드 · 전 칸', () => {
    let checked = 0;
    for (const seed of SEEDS) {
      for (const { p } of facadesFor(seed)) {
        const b = facadeBox(p);
        expect(b.x0, `seed ${seed} x0`).toBeGreaterThanOrEqual(-(HALF_X - KEEP_OUT) - 1e-9);
        expect(b.x1, `seed ${seed} x1`).toBeLessThanOrEqual(HALF_X - KEEP_OUT + 1e-9);
        expect(b.z0, `seed ${seed} z0`).toBeGreaterThanOrEqual(-(HALF_Z - KEEP_OUT) - 1e-9);
        expect(b.z1, `seed ${seed} z1`).toBeLessThanOrEqual(HALF_Z - KEEP_OUT + 1e-9);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(400);
  });

  /**
   * **모서리 칸에서 두 판이 직각으로 만난다.** 각자 자기 변 방향으로 길게 뻗으면 서로를
   * 관통하고, 화면에서는 광고판이 서로를 뚫고 나온 모습이 된다.
   *
   * 뮤테이션: `panelWidth` 의 `- EAVE` 를 지우면 두 판이 정확히 닿아 깨진다.
   *           `W_MIN_RATIO` 를 1 보다 크게 하면 폭이 상한을 넘어 깨진다.
   */
  /**
   * **최악 경우를 유도로 못 박는다 — 난수 표본으로는 못 잡는다.**
   *
   * ⚠️ 아래 "전 시드" 검사만 있을 때 뮤테이션 둘이 통과했다: `panelWidth` 의 여유를
   * **통째로 지워도**(`2 × rimInset`) 48시드 × 4모서리 = 192 표본에서 겹침이 한 번도
   * 안 나왔다. 폭이 `W_MIN_RATIO`~1 배로 뽑히므로 상한에 닿는 조합 자체가 드물기
   * 때문이다 — 이 저장소가 *"실측은 밟아본 경로의 최댓값일 뿐 도달 가능한 최댓값이
   * 아니다"* 라고 적어 둔 형태 그대로다.
   *
   * 그래서 표본이 아니라 **부등식**을 잰다. 최대 폭 판의 끝이 이웃 판의 앞면
   * (`rimInset − PANEL_FRONT`)에 닿지 않으면 어떤 난수에서도 겹칠 수 없다.
   *
   * 뮤테이션: `panelWidth` 에서 `- EAVE` 만 지워도, `- PANEL_FRONT - EAVE` 를 통째로
   * 지워도 깨진다.
   */
  it('폭 상한이 모서리 겹침 조건을 만족한다 — 부등식으로', () => {
    for (const half of [HALF_X, HALF_Z, 20, 40]) {
      const halfW = panelWidth(half) / 2;
      expect(halfW, `half=${half}`).toBeLessThan(rimInset(half) - PANEL_FRONT);
      expect(halfW, `half=${half} 폭이 양수여야 판이 존재한다`).toBeGreaterThan(0);
    }
  });

  /**
   * 난수의 **양 끝**을 직접 먹인다. `place` 는 폭·높이·jitter 를 순서대로 뽑으므로
   * 상수 난수를 주면 최대·최소 조합이 그대로 나온다 — "그 조합이 나올 때까지 시드를
   * 돌리는" 대신 만들어서 넣는 것이다.
   *
   * 뮤테이션: `jitter` 의 `slack` 을 키우면 깨진다(위 부등식은 jitter 를 안 보므로
   * 이 검사가 그 축을 맡는다).
   */
  it('난수 극단(최대 폭·최소 폭)에서도 모서리가 안 겹친다', () => {
    const corners = PLAZA_CELLS.filter(([px, pz]) => plazaRimSides(px, pz).length === 2);
    // `rnd` 는 [0,1) 이므로 1 을 그대로 주면 `tone` 인덱스가 배열을 넘는다
    const EXTREMES = [() => 1 - 1e-12, () => 0, () => 0.5];
    for (const r of EXTREMES) {
      for (const [px, pz] of corners) {
        const ps = adfacade.place(ctx(px, pz, r));
        if (ps.length < 2) continue;
        const a = facadeBox(ps[0]);
        const b = facadeBox(ps[1]);
        expect(a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1,
          `(${px},${pz}) ${JSON.stringify([a, b])}`).toBe(false);
        // 셋백도 극단에서 함께 본다
        expect(a.x0).toBeGreaterThanOrEqual(-(HALF_X - KEEP_OUT) - 1e-9);
        expect(a.x1).toBeLessThanOrEqual(HALF_X - KEEP_OUT + 1e-9);
        expect(a.z0).toBeGreaterThanOrEqual(-(HALF_Z - KEEP_OUT) - 1e-9);
        expect(a.z1).toBeLessThanOrEqual(HALF_Z - KEEP_OUT + 1e-9);
      }
    }
  });

  it('모서리 칸의 두 파사드가 서로를 뚫지 않는다 — 전 시드', () => {
    const corners = PLAZA_CELLS.filter(([px, pz]) => plazaRimSides(px, pz).length === 2);
    expect(corners.length).toBe(4);           // 3×3 이면 모서리가 넷
    let pairs = 0;
    for (const seed of SEEDS) {
      for (const [px, pz] of corners) {
        const rnd = makeRnd(seed ^ (px * 0x9e3779b1) ^ (pz * 0x85ebca6b));
        const ps = adfacade.place(ctx(px, pz, rnd));
        if (ps.length < 2) continue;          // 미술관 칸은 0 장
        const a = facadeBox(ps[0]);
        const b = facadeBox(ps[1]);
        const overlap = a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
        expect(overlap, `seed ${seed} (${px},${pz}) ${JSON.stringify([a, b])}`).toBe(false);
        pairs++;
      }
    }
    expect(pairs).toBeGreaterThan(100);
  });

  /**
   * 뮤테이션: `north` 의 `ry: 0` 을 `Math.PI` 로 바꾸면 판이 광장에 등을 돌려 깨진다.
   * `west`/`east` 의 부호를 맞바꿔도 깨진다.
   */
  it('앞면이 광장 중심을 본다 — 전 시드 · 전 장', () => {
    let checked = 0;
    for (const seed of SEEDS) {
      for (const { px, pz, p } of facadesFor(seed)) {
        // `rotateY(ry)` 는 +Z 를 (sin ry, 0, cos ry) 로 보낸다 — 그것이 판의 앞면 법선.
        const nx = Math.sin(p.ry);
        const nz = Math.cos(p.ry);
        // 판의 월드 위치에서 광장 한가운데(원점)로 향하는 방향
        const toCenterX = -(px * O.cellX + p.x);
        const toCenterZ = -(pz * O.cellZ + p.z);
        const dot = nx * toCenterX + nz * toCenterZ;
        expect(dot, `seed ${seed} (${px},${pz}) ry=${p.ry}`).toBeGreaterThan(0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(400);
  });

  /**
   * 광고 타워는 광장 북쪽 칸 한가운데(파셀 원점)에 서고 실루엣 반경이
   * `clocktower.footprint` 다. 파사드가 그 원 안으로 들어오면 판이 탑을 뚫는다.
   *
   * 뮤테이션: `rimInset` 을 상수 2 로 바꾸면 파사드가 탑 쪽으로 밀려 들어와 깨진다.
   */
  it('광고 타워를 뚫지 않는다', () => {
    const clockCell = PLAZA_CELLS.find(([px, pz]) => clocktower.place(ctx(px, pz, makeRnd(1))).length > 0);
    expect(clockCell, '광고 타워가 서는 칸을 못 찾았다').toBeTruthy();
    const [cx, cz] = clockCell!;
    const clockPart = clocktower.place(ctx(cx, cz, makeRnd(1)))[0];
    const r = clocktower.footprint(clockPart);
    expect(r).toBeGreaterThan(1);
    for (const seed of SEEDS) {
      const rnd = makeRnd(seed ^ (cx * 0x9e3779b1) ^ (cz * 0x85ebca6b));
      for (const p of adfacade.place(ctx(cx, cz, rnd))) {
        const b = facadeBox(p);
        // 탑 중심(파셀 원점)에서 판 상자까지의 최단거리
        const dx = Math.max(b.x0 - clockPart.x, 0, clockPart.x - b.x1);
        const dz = Math.max(b.z0 - clockPart.z, 0, clockPart.z - b.z1);
        expect(Math.hypot(dx, dz), `seed ${seed}`).toBeGreaterThan(r);
      }
    }
  });

  /**
   * **자리 유도가 기대는 두 값이 실제 지오와 같은가.**
   *
   * `rimInset` 은 `PANEL_BACK` 만큼 몸통이 뒤로 뻗는다고 믿고 셋백을 유도하고,
   * `panelWidth` 는 `PANEL_FRONT` 만큼 앞으로 내민다고 믿고 모서리 여유를 유도한다.
   * **그 믿음이 지오와 어긋나면 두 유도가 통째로 거짓이 되는데, 화면에서는 "광고판이
   * 도로를 조금 덮었다"·"모서리가 살짝 뚫렸다" 로만 나타난다.**
   *
   * 첫 판본이 정확히 그 상태였다 — 크라운 네온이 코니스 두께의 절반만큼 더 앞으로
   * 나가 `PANEL_FRONT`(0.04)가 실제로는 0.661 이었고, `PANEL_BACK` 은 `PANEL_T` 만
   * 세고 있어 뒷면이 0.042m 더 뒤였다. 둘 다 이 검사가 있었으면 즉시 잡혔다.
   *
   * 뮤테이션: 어느 조각이든 z 를 앞뒤로 옮기면 깨진다. 상수만 고치고 지오를 안 고쳐도
   * 깨진다 — **양쪽을 함께 봐야만 통과한다는 것이 이 검사의 값이다.**
   */
  it('신고한 두께(`PANEL_BACK`·`PANEL_FRONT`)가 지오의 실제 z 범위와 같다', () => {
    // 허용 오차 1e-5 m 는 **정점이 `Float32BufferAttribute` 에 담기기 때문**이다
    // (`bake.ts`). 1.24m 에서 float32 의 최소 단위가 약 1.2e-7 이라 그보다 엄격하게
    // 잡으면 값이 맞아도 깨진다. 검출력은 남는다 — 이 검사가 잡은 실제 어긋남은
    // 뒷면 0.042m · 앞면 0.621m 로 허용치보다 **네 자리** 크다.
    expect(FACADE_Z.min).toBeCloseTo(-PANEL_BACK, 5);
    expect(FACADE_Z.max).toBeCloseTo(PANEL_FRONT, 5);
  });

  it('파츠당 지오 하나 · 재질 하나', () => {
    const a = withCanvas(() => adfacade.asset(T3 as unknown as ThreeNS));
    expect(a.geometry).toBeTruthy();
    expect(Array.isArray(a.material)).toBe(false);
  });

  // 뮤테이션: `maxPerParcel` 을 1 로 내리면 모서리 칸의 둘째 장이 슬롯을 못 얻는다 —
  //           배치는 정상인데 화면에서만 조용히 사라지는 형태다.
  it('신고한 최대 개수가 실제 배치의 최댓값과 같다', () => {
    let most = 0;
    for (const seed of SEEDS) {
      for (const [px, pz] of PLAZA_CELLS) {
        const rnd = makeRnd(seed ^ (px * 0x9e3779b1) ^ (pz * 0x85ebca6b));
        most = Math.max(most, adfacade.place(ctx(px, pz, rnd)).length);
      }
    }
    expect(most).toBe(adfacade.maxPerParcel(O));
  });
});

// ══════════════════════════════════════════════════════════════════════════
// §3 첫 화면 — **이 작업의 성공 기준을 직접 잰다**
// ══════════════════════════════════════════════════════════════════════════
//
// 스폰(0,10)에 서서 기본 시선(`yaw = 0` → -z)으로 볼 때, 정면에 구조물이 들어오는가.
//
// ⚠️ **반경은 `farEnter` 다.** `farExit`(2.40셀 = 76.8m)는 *이미 far 인 파셀이 유지되는*
// 히스테리시스 한계라 첫 진입에는 안 쓰인다 — `tierFor(dist, null)` 이 ENTER 만 본다.
// 이 둘을 섞으면 실제보다 넓은 반경으로 계산하게 되고, 실제로 브리프의 대조군 실측이
// 그렇게 되어 있어 공원 `(0,-2)`(74m)가 첫 화면에 있는 것으로 잡혀 있었다.

/** 스폰 시점의 판정 중심(셀 단위). 정지 상태라 look-ahead 가 0 이다 */
const SPAWN_CELL = { cx: SPAWN.x / O.cellX, cz: SPAWN.z / O.cellZ };

function spawnTier(px: number, pz: number): Tier {
  if (parcelWater(px, pz, O.cellX, O.cellZ) === 'water') return 'none';
  return tierFor(Math.hypot(px - SPAWN_CELL.cx, pz - SPAWN_CELL.cz), null, DEFAULT_BANDS);
}

/** 스폰에서 본 방위각(도). 0 이 정면(-z) */
function bearing(wx: number, wz: number): number {
  return Math.abs(Math.atan2(wx - SPAWN.x, -(wz - SPAWN.z))) * 180 / Math.PI;
}

describe('§3 스폰 정면이 채워진다', () => {
  /**
   * 변경 전 실측이 여기 남아 있어야 이 검사가 무엇을 지키는지 알 수 있다:
   * 정면(±40°) 로드 반경 안 파셀은 `(0,0)`·`(0,-1)`·`(±1,-1)` **네 칸이고 전부
   * 중앙 광장**이었다. 그 사실 자체는 변경 후에도 참이다 — 바뀐 것은 그 칸들이
   * **비어 있지 않다**는 것이다.
   */
  it('정면 로드 반경 안 파셀은 여전히 중앙 광장뿐이다 — 이 작업은 격자를 안 건드렸다', () => {
    const front: Array<[number, number]> = [];
    for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
      for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
        if (spawnTier(px, pz) === 'none') continue;
        if (bearing(px * O.cellX, pz * O.cellZ) > 40) continue;
        front.push([px, pz]);
      }
    }
    expect(front.length).toBe(4);
    for (const [px, pz] of front) expect(isCentralPlaza(px, pz), `(${px},${pz})`).toBe(true);
  });

  /**
   * **이것이 이 작업의 성공 기준이다.** 정면 ±40° 안, 스폰에서 로드되는 tier 안에
   * 광고 파사드가 한 장이라도 서는가. 변경 전에는 이 수가 **0** 이었다.
   *
   * 뮤테이션: `PARTS` 에서 `adfacade` 를 빼면 0 → 깨진다. `tiers` 를 `['near']` 로
   * 좁혀도 `(±1,-1)` 이 far 라 정면 파사드가 사라져 깨진다.
   */
  it('정면 시야에 광고 파사드가 선다 — 변경 전에는 0 장이었다', () => {
    for (const seed of SEEDS) {
      const seen = facadesFor(seed).filter(({ px, pz, p }) => {
        const t = spawnTier(px, pz);
        if (t === 'none') return false;
        // 그 tier 에서 실제로 그려지는가 — 자리에 있어도 tier 밖이면 화면에 없다
        if (!adfacade.tiers.includes(t)) return false;
        return bearing(px * O.cellX + p.x, pz * O.cellZ + p.z) <= 40;
      });
      expect(seen.length, `seed ${seed}`).toBeGreaterThan(0);
    }
  });

  /**
   * 브리프의 경고를 검사로 옮긴 것이다 — *"비율만 묻지 마라. 화면 어딘가에 있는지만
   * 재면 안 된다"*(이 저장소에는 물 픽셀 13.44% 로 PASS 가 났는데 그 물이 수평선 너머
   * 바다였던 사고가 있다). 그래서 **거리와 겉보기 크기**를 함께 잰다.
   *
   * ── 기준을 절대값에서 상대 비교로 바꿨다 (첫 판본이 틀렸다) ─────────────────
   * 처음엔 *"수직 FOV 70° 의 절반의 절반 = 17.5° 를 넘을 것"* 으로 적었다. **근거가
   * 없는 값이다** — 화면 세로를 사등분한 것뿐이고, 왜 사등분인지 말할 수 없었다.
   * 실측이 17.39° 로 나오자 그 자의성이 드러났고, 기준을 0.1° 내리면 통과한다는 사실
   * 자체가 그 문턱에 뜻이 없다는 증거다.
   *
   * 그래서 **같은 화면에 이미 있는 구조물**과 비교한다. 광고 타워는 감독 지시로 광장
   * 한가운데 서 있고 스폰 정면 42m 에 있다 — 첫 화면의 유일한 기준점이다. 파사드가
   * 그 세로 시각의 **절반**을 넘으면 "함께 광장을 이루는 것" 이고, 그 아래면 원경의
   * 배경이다. 광고 타워 크기를 바꾸면 이 기준도 따라 움직인다(값 미러링 없음).
   *
   * ⚠️ 실패가 알려준 진짜 정보는 기준이 아니라 **구현**이었다: 스폰 정면에서 가장
   * 가까운 파사드는 광장 북쪽 변의 **한 장뿐**이고 그 한 장이 높이 하한을 뽑을 수 있다.
   * 그 사실은 `H_MIN` 을 14 → 16 으로 올려 반영했다 — 기준만 옮긴 것이 아니다.
   *
   * 뮤테이션: `H_MIN` 을 8 로 내리면 시각이 모자라 깨진다. `rimInset` 을 크게 키워
   * 파사드를 멀리 밀어도 깨진다.
   */
  it('정면 파사드가 광고 타워의 절반 이상으로 보인다 — 거리와 겉보기 크기로 잰다', () => {
    const EYE = 1.7;
    /** 스폰에서 본 광고 타워의 세로 시각(도). 첫 화면의 유일한 기준점이다 */
    const clockCell = PLAZA_CELLS.find(([px, pz]) => clocktower.place(ctx(px, pz, makeRnd(1))).length > 0)!;
    const clockD = Math.hypot(clockCell[0] * O.cellX - SPAWN.x, clockCell[1] * O.cellZ - SPAWN.z);
    const clockRise = Math.atan((geoHeight(clocktower) - EYE) / clockD) * 180 / Math.PI;
    expect(clockRise).toBeGreaterThan(20);     // 기준점이 실재한다

    let worst = Infinity;
    for (const seed of SEEDS) {
      const front = facadesFor(seed)
        .filter(({ px, pz, p }) => {
          const t = spawnTier(px, pz);
          return t !== 'none' && adfacade.tiers.includes(t)
            && bearing(px * O.cellX + p.x, pz * O.cellZ + p.z) <= 40;
        })
        .map(({ px, pz, p }) => {
          const d = Math.hypot(px * O.cellX + p.x - SPAWN.x, pz * O.cellZ + p.z - SPAWN.z);
          return { d, rise: Math.atan((p.sy - EYE) / d) * 180 / Math.PI };
        });
      expect(front.length, `seed ${seed}`).toBeGreaterThan(0);
      const best = front.reduce((a, b) => (b.rise > a.rise ? b : a));
      // 로드 반경(farEnter = 67.2m) 안이어야 애초에 그려진다
      expect(best.d, `seed ${seed} 거리`).toBeLessThan(DEFAULT_BANDS.farEnter * O.cellX);
      expect(best.rise, `seed ${seed} 세로시각`).toBeGreaterThan(clockRise / 2);
      worst = Math.min(worst, best.rise);
    }
    // **여유가 실재한다.** 문턱에 겨우 닿는 값은 다음 조정에서 조용히 죽는다 —
    // 이 저장소가 블룸 문턱(0.85 대 휘도 0.805)에서 이미 치른 값이다.
    expect(worst).toBeGreaterThan(clockRise * 0.6);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// §4 랜드마크 마천루 — 세계에 한 기
// ══════════════════════════════════════════════════════════════════════════

/** 세계 전체를 훑어 실제로 서는 마천루를 모은다. **실물 `tower.place` 를 돌린다** */
function allTowers(seed: number): Array<{ px: number; pz: number; p: PlacedPart }> {
  const out: Array<{ px: number; pz: number; p: PlacedPart }> = [];
  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      const rnd = makeRnd(seed ^ (px * 0x9e3779b1) ^ (pz * 0x85ebca6b));
      for (const p of tower.place(ctx(px, pz, rnd))) out.push({ px, pz, p });
    }
  }
  return out;
}

describe('§4 랜드마크', () => {
  /**
   * 뮤테이션: `isLandmarkParcel` 을 `px === LANDMARK_PARCEL.px`(pz 무시)로 느슨하게
   * 하면 한 열 전체가 랜드마크가 되어 깨진다. `place` 의 랜드마크 분기를 지우면 0 기가
   * 되어 깨진다.
   */
  it('`MAX_H` 를 넘는 마천루가 세계에 정확히 한 기다 — 전 시드', () => {
    for (const seed of SEEDS) {
      const tall = allTowers(seed).filter(({ p }) => p.sy > MAX_H);
      expect(tall.length, `seed ${seed}`).toBe(1);
      expect([tall[0].px, tall[0].pz]).toEqual([LANDMARK_PARCEL.px, LANDMARK_PARCEL.pz]);
      expect(tall[0].p.sy).toBeCloseTo(LANDMARK_H, 6);
    }
  });

  // 뮤테이션: 확률 마천루가 랜드마크 높이에 닿게 `MAX_H` 를 96 으로 올리면, 위 검사의
  // "정확히 한 기" 가 여러 기가 되어 깨진다 — 즉 두 축이 서로를 지킨다.
  it('일반 마천루는 하나도 `MAX_H` 를 넘지 않는다', () => {
    for (const seed of SEEDS.slice(0, 12)) {
      for (const { px, pz, p } of allTowers(seed)) {
        if (isLandmarkParcel(px, pz)) continue;
        expect(p.sy, `seed ${seed} (${px},${pz})`).toBeLessThanOrEqual(MAX_H);
      }
    }
  });

  /**
   * 뮤테이션: `LANDMARK_PARCEL` 을 `{ px: PLAZA_R + 3, pz: 0 }` 로 옮기면 로드 반경
   * 밖으로 나가 깨진다 — 그 자리는 스폰에서 걸어가야만 나타난다.
   */
  it('스폰에서 처음부터 로드되는 자리다', () => {
    const t = spawnTier(LANDMARK_PARCEL.px, LANDMARK_PARCEL.pz);
    expect(t).not.toBe('none');
    expect(tower.tiers).toContain(t);
    const d = Math.hypot(LANDMARK_PARCEL.px * O.cellX - SPAWN.x, LANDMARK_PARCEL.pz * O.cellZ - SPAWN.z);
    expect(d).toBeLessThan(DEFAULT_BANDS.farEnter * O.cellX);
  });

  /**
   * **정직하게 적어 두는 검사다.** 랜드마크는 스폰 정지 화면의 정면에 **안 들어온다** —
   * 방위각이 40° 를 넘는다. 그것을 "들어온다" 로 적으면 다음 사람이 확인을 생략하고,
   * 반대로 아무 데도 안 적으면 값을 만질 때 그 사실이 사라진다.
   *
   * 뮤테이션: 랜드마크를 정면(예: `pz` 를 음수로)으로 옮기면 이 단언이 깨지고, 그때는
   * 이 검사와 주석을 함께 고치는 것이 맞다.
   */
  it('스폰 정면(±40°)에는 안 들어온다 — 고개를 돌려야 보인다', () => {
    const b = bearing(LANDMARK_PARCEL.px * O.cellX, LANDMARK_PARCEL.pz * O.cellZ);
    expect(b).toBeGreaterThan(40);
    // 그래도 반 바퀴 밖은 아니다 — 광장에 서서 옆을 보면 있는 자리다
    expect(b).toBeLessThan(90);
  });

  /**
   * **도달 불가능한 가지를 도달 불가능하게 만드는 조건을 잰다.**
   *
   * `tower.place` 의 물 배제(`landmark && parcelWater(…) !== 'dry'`)는 지금 **한 번도
   * 안 돌아간다** — 랜드마크 자리가 뭍이기 때문이다. 그래서 그 줄을 지우는 뮤테이션이
   * 아무 검사도 깨뜨리지 못한다(실측했다). 가지 자체를 도달시킬 방법이 없다:
   * `LANDMARK_PARCEL` 은 격자 상수라 테스트가 물 칸으로 옮길 수 없다.
   *
   * 그래서 **전제를 대신 잰다.** 강 진폭·바다 경계는 이 저장소에서 이미 여러 번
   * 움직인 값이고, 그것이 이 칸을 적시는 날 이 검사가 먼저 빨간불이 된다 — 그때
   * 비로소 그 배제 가지가 실효를 갖는다.
   *
   * 뮤테이션: `LANDMARK_PARCEL` 을 물 칸으로 옮기면 깨진다.
   */
  it('랜드마크 자리가 뭍이다 — 이것이 물 배제 가지가 도달 불가인 이유다', () => {
    expect(parcelWater(LANDMARK_PARCEL.px, LANDMARK_PARCEL.pz, O.cellX, O.cellZ)).toBe('dry');
  });

  /**
   * ★ **물 전제에는 짝이 있었어야 했다** (검수관 조건 C-2, 2026-08-09).
   *
   * `tower.place` 의 랜드마크 분기는 `isTowerParcel` 을 통째로 우회한다. 그 함수가
   * 배제하는 것은 셋인데(**부광장** · 길없음 · 물), 랜드마크가 다시 받는 것은 **물
   * 하나**다. 위 검사가 물 전제를 잰 것처럼 **부광장 전제도 재야 한다.**
   *
   * ── 내가 이 단언을 넣지 말자고 했고, 틀렸다 ────────────────────────────────
   * *"도달 불가능한 조건에 검사를 붙이는 것은 장식"* 이라고 반론했는데 **두 물건을
   * 혼동한 것이다.** 도달 불가능한 것은 `tower.place` 의 **코드 가지**이고, 전제
   * 단언은 *「도달 불가능하다는 사실 자체」* 를 감시한다 — 방향이 반대다. 전자는
   * 영영 안 깨지고, 후자는 **전제가 깨지는 날** 깨진다.
   *
   * 검수관이 실측으로 갈랐다: 도로 위상이 바뀌어 `(2,0)` 이 부광장이 되는 상황을
   * 시뮬레이션하니 **85건 전부 통과**했다. 96m 랜드마크가 광장 한복판에 서는데 어느
   * 축도 안 본다. `isTowerParcel` 이 광장을 배제하는 이유가 *"트인 곳이 목적인 자리다.
   * 거기 60m 짜리를 세우면 광장이 아니다"* 인데, 랜드마크는 그 배제를 우회한다.
   *
   * 좌표를 옮기는 경로는 이미 막혀 있다(`스폰에서 처음부터 로드되는 자리다` 가 어느
   * 칸으로 옮겨도 깨진다). **남은 구멍은 위상 쪽 하나**이고 이 단언이 그것을 메운다.
   *
   * 뮤테이션: `isPlaza` 가 이 칸에서 참이 되도록 도로 위상·확률을 바꾸면 깨진다.
   */
  it('랜드마크 자리가 부광장이 아니다 — 광장 한복판에 96m 가 서지 않는다', () => {
    expect(isPlaza(LANDMARK_PARCEL.px, LANDMARK_PARCEL.pz)).toBe(false);
    // 중앙 광장도 아니다. 이쪽은 `LANDMARK_PARCEL = PLAZA_R + 1` 이라 정의상 밖이지만,
    // 그 유도가 바뀌는 날 조용히 안으로 들어올 수 있다.
    expect(isCentralPlaza(LANDMARK_PARCEL.px, LANDMARK_PARCEL.pz)).toBe(false);
    // 길이 있다 — 갈 수 없는 랜드마크는 랜드마크가 아니다(`isTowerParcel` 의 셋째 배제).
    expect(roadDirs(LANDMARK_PARCEL.px, LANDMARK_PARCEL.pz).length).toBeGreaterThan(0);
  });

  // 뮤테이션: `LANDMARK_RATIO` 를 8 로 올리면 비례 범위를 벗어나 깨진다.
  it('비례가 이 파츠의 범위(2.5:1 ~ 6.7:1) 안이다', () => {
    const { p } = allTowers(SEEDS[0]).find(({ px, pz }) => isLandmarkParcel(px, pz))!;
    const ratio = p.sy / p.sx;
    expect(ratio).toBeGreaterThanOrEqual(2.5);
    expect(ratio).toBeLessThanOrEqual(6.7);
  });

  /**
   * 배치 부등식. `place` 안의 `maxHalf` 가드가 `[]` 를 돌려주면 랜드마크가 **소리 없이
   * 사라지고 아무 카운터에도 안 잡힌다**(그 가드 주석이 잃은 관측을 기록하고 있다).
   * 위 "정확히 한 기" 가 이미 그것을 잡지만, 여유가 얼마나 남았는지를 여기서 못 박는다.
   *
   * 뮤테이션: `LANDMARK_SIDE` 를 18 로 올리면 한계 17 을 넘어 깨진다.
   */
  it('바닥이 도로 셋백 안에 들어간다 — 여유가 실재한다', () => {
    const { p } = allTowers(SEEDS[0]).find(({ px, pz }) => isLandmarkParcel(px, pz))!;
    const maxHalf = Math.min(O.cellX, O.cellZ) / 2 - KEEP_OUT - EAVE;
    expect(p.sx / 2).toBeLessThan(maxHalf);
  });

  /**
   * **위계**: 랜드마크 > 일반 마천루 > 광고 타워 > 광고 파사드.
   *
   * 광고 타워와 파사드는 지오가 실치수라 자산의 바운딩 박스에서 직접 읽는다 — 저쪽
   * 상수를 여기 다시 적으면 그 값을 바꿀 때 이 검사만 옛 값을 지킨다.
   *
   * 뮤테이션: `H_MAX`(파사드)를 25 로 올리면 광고 타워를 넘어 깨진다.
   */
  it('높이 위계가 선다 — 랜드마크 > MAX_H > 광고 타워 > 파사드 상한', () => {
    const clockH = geoHeight(clocktower);
    const facadeMax = Math.max(...SEEDS.flatMap((s) => facadesFor(s).map(({ p }) => p.sy)));
    expect(LANDMARK_H).toBeGreaterThan(MAX_H);
    expect(MAX_H).toBeGreaterThan(clockH);
    expect(clockH).toBeGreaterThan(facadeMax);
  });

  /**
   * **그림자 프러스텀이 랜드마크를 담는가.** 이 축이 뚫리면 96m 짜리의 꼭대기 그림자만
   * 소리 없이 잘리고, 화면에서 원인을 짚기 가장 어려운 형태가 된다.
   *
   * `main.ts` 는 three 를 import 하므로 여기서 로드할 수 없다 — 대신 그 호출의 인자를
   * 소스에서 확인한다. 뮤테이션: `WORLD_MAX_H` 를 `MAX_H` 로 되돌리면 깨진다.
   */
  it('그림자 프러스텀이 랜드마크 꼭대기를 담는다', () => {
    expect(WORLD_MAX_H).toBeGreaterThanOrEqual(LANDMARK_H);
    expect(WORLD_MAX_H).toBeGreaterThanOrEqual(MAX_H);
    // **판정을 직접 돌린다.** `main.ts` 와 같은 인자로 불러 깊이가 실제로 랜드마크를
    // 덮는지 본다 — 소스를 읽는 것만으로는 `shadowFrustum` 쪽 유도가 바뀌었을 때
    // 알 수 없다.
    const f = shadowFrustum(O.cellX, DEFAULT_BANDS.nearExit, WORLD_MAX_H, 1024);
    expect(f.dist - f.near).toBeGreaterThanOrEqual(LANDMARK_H);
    expect(f.far).toBeGreaterThan(f.dist + LANDMARK_H);
    // 반폭은 안 커져야 한다 — 커지면 텍셀이 굵어져 감독이 요구한 하드라이트가 무너진다
    expect(f.half).toBe(O.cellX * DEFAULT_BANDS.nearExit);
  });

  /**
   * `main.ts` 는 three 를 import 하므로 여기서 로드할 수 없다 — 그래서 소스를 읽는다.
   *
   * ⚠️ **첫 판본은 호출 인자에 `'WORLD_MAX_H'` 라는 글자가 있는지만 봤고, 뮤테이션이
   * 통과했다**: `import { MAX_H as WORLD_MAX_H }` 로 별칭만 붙이면 호출부 글자는 그대로
   * 인 채 값이 60 으로 돌아간다. **이름을 세는 검사는 이름을 바꾸는 우회를 못 잡는다** —
   * 그래서 import 절을 쪼개 **별칭 없이** 가져오는지까지 본다(`'MAX_H as WORLD_MAX_H'`
   * 는 쪼갠 배열에 통째로 남아 일치하지 않는다).
   *
   * 뮤테이션: 호출 인자를 `MAX_H` 로 되돌려도, 별칭으로 우회해도 깨진다.
   */
  it('`main.ts` 가 그 값을 별칭 없이 가져와 그림자에 쓴다', () => {
    const src = readFileSync(join(process.cwd(), 'frontend/js/world5/main.ts'), 'utf8');
    const imp = /import\s*\{([^}]*)\}\s*from\s*'\.\/parts\/tower\.js'/.exec(src);
    expect(imp, 'main.ts 에서 tower.js import 를 못 찾았다').toBeTruthy();
    expect(imp![1].split(',').map((s) => s.trim())).toContain('WORLD_MAX_H');
    const call = /shadowFrustum\(([^)]*)\)/.exec(src);
    expect(call, 'main.ts 에서 shadowFrustum 호출을 못 찾았다').toBeTruthy();
    expect(call![1]).toContain('WORLD_MAX_H');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// §5 발광 — 신고와 마스크
// ══════════════════════════════════════════════════════════════════════════
//
// `tests/world5-neon-glow.test.ts` 의 G3·G3-b 가 실물 `asset()` × 실물 `NeonGlow` 를
// 이미 본다(`emissive` 비검정 · `emissiveMap` 존재 · 밤 세기 도달). `neon` 한 줄을
// 신고하면 그 검사들이 자동으로 이 파츠를 집으므로 **여기에 다시 적지 않는다.**
// 여기서 재는 것은 그쪽이 안 덮는 축이다 — 광장 안에서의 밝기 위계와 색의 출처.

/** 마스크 칠을 **기록하는** 캔버스. `fillRect` 시점의 색·세기를 그대로 잡는다 */
function recordingCanvas() {
  const paints: Array<{ x: number; w: number; fill: string; alpha: number }> = [];
  const ctx2d: Record<string, unknown> = { fillStyle: '', globalAlpha: 1 };
  ctx2d.fillRect = (x: number, _y: number, w: number) => {
    paints.push({ x, w, fill: String(ctx2d.fillStyle), alpha: Number(ctx2d.globalAlpha) });
  };
  for (const m of ['clearRect', 'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'translate', 'scale']) {
    ctx2d[m] = () => {};
  }
  ctx2d.createRadialGradient = () => ({ addColorStop: () => {} });
  return { paints, canvas: { width: 1, height: 1, getContext: () => ctx2d } };
}

/** `asset()` 을 부르는 동안만 `document` 를 스텁으로. 전역을 영구히 바꾸지 않는다 */
function withCanvas<R>(fn: () => R): R {
  const g = globalThis as { document?: unknown };
  const had = 'document' in g;
  const prev = g.document;
  const ctx2d: Record<string, unknown> = { fillStyle: '', globalAlpha: 1 };
  for (const m of ['fillRect', 'clearRect', 'save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'translate', 'scale']) {
    ctx2d[m] = () => {};
  }
  ctx2d.createRadialGradient = () => ({ addColorStop: () => {} });
  g.document = {
    createElement: (tag: string) =>
      (tag === 'canvas' ? { width: 1, height: 1, getContext: () => ctx2d } : {}),
  };
  try {
    return fn();
  } finally {
    if (had) g.document = prev; else delete g.document;
  }
}

/**
 * 파츠의 마스크 칠 목록. **한 텍셀짜리 칠만** 남긴다 — 바탕(폭 8)은 칠이 아니라 배경이다.
 * 실물 `asset()` 을 돌려 얻으므로 마스크 코드를 옆에 다시 쓰지 않는다.
 */
function maskPaints(spec: { asset(T: ThreeNS): unknown }) {
  const rec = recordingCanvas();
  const g = globalThis as { document?: unknown };
  const had = 'document' in g;
  const prev = g.document;
  g.document = { createElement: (tag: string) => (tag === 'canvas' ? rec.canvas : {}) };
  try {
    spec.asset(T3 as unknown as ThreeNS);
  } finally {
    if (had) g.document = prev; else delete g.document;
  }
  return rec.paints.filter((p) => p.w === 1);
}

/** 실치수 지오의 높이(m). 상수를 옆에 다시 적지 않으려고 자산에서 읽는다 */
function geoHeight(spec: { asset(T: ThreeNS): { geometry: unknown } }): number {
  const geo = withCanvas(() => spec.asset(T3 as unknown as ThreeNS)).geometry as unknown as {
    computeBoundingBox(): void;
    boundingBox: { min: { y: number }; max: { y: number } };
  };
  geo.computeBoundingBox();
  return geo.boundingBox.max.y - geo.boundingBox.min.y;
}

describe('§5 광고 파사드의 발광', () => {
  // 뮤테이션: `adfacade` 의 `neon` 신고를 지우면 배선이 이 파츠를 아예 안 집는다 —
  //           낮에도 밤에도 영원히 꺼진 채 남고, 화면에서는 "좀 어둡다" 로만 보인다.
  it('발광을 신고한다 — 이것이 없으면 `NeonGlow` 가 이 파츠를 못 찾는다', () => {
    expect(NEON_PARTS.map((p) => p.kind)).toContain('adfacade');
  });

  // 뮤테이션: `day` 를 0 으로 두면 낮에 검은 판때기가 되어 깨진다.
  it('낮에도 꺼지지 않는다 — 대형 스크린은 주간에 오히려 더 밝게 튼다', () => {
    const f = NEON_PARTS.find((p) => p.kind === 'adfacade')!;
    expect(f.day).toBeGreaterThan(0.5);
    expect(f.night).toBeGreaterThanOrEqual(f.day);
  });

  it('표본이 실재한다 — 칠이 0 이면 아래가 전부 공허하다', () => {
    expect(maskPaints(adfacade).length).toBeGreaterThan(4);
    expect(maskPaints(clocktower).length).toBeGreaterThan(4);
  });

  /**
   * **광장의 밝기 위계.** 주인공은 한가운데 광고 타워이고 파사드는 그것을 둘러싼
   * 배경이다 — 배경이 더 밝으면 시선이 갈 곳을 잃는다. 두 파츠는 서로를 import 하지
   * 않으므로(파츠 하나 = 파일 하나) 이 관계를 지킬 자리가 여기밖에 없다.
   *
   * 뮤테이션: 파사드의 `put(M.magenta, …, 0.82)` 를 0.98 로 올리면 깨진다.
   */
  it('파사드가 광고 타워보다 어둡다 — 한 텍셀도 넘지 않는다', () => {
    const facadeMax = Math.max(...maskPaints(adfacade).map((p) => p.alpha));
    const clockMax = Math.max(...maskPaints(clocktower).map((p) => p.alpha));
    expect(facadeMax).toBeLessThan(clockMax);
  });

  // 뮤테이션: 마스크에 팔레트 밖 hex 를 쓰면 깨진다(§1 의 리터럴 검사와 다른 축이다 —
  //           저쪽은 소스 텍스트를, 이쪽은 실제로 칠해진 색을 본다).
  it('모든 칠의 색이 팔레트 값이다', () => {
    const palette = new Set(Object.values(V).map((h) => `#${h.toString(16).padStart(6, '0')}`));
    for (const p of maskPaints(adfacade)) {
      // 바탕 칠(회색 강도)은 색이 아니라 강도다 — `greyCss` 가 내는 형태만 통과시킨다
      if (/^#(0{6}|(\w\w)\2\2)$/.test(p.fill) && !palette.has(p.fill)) continue;
      expect(palette.has(p.fill), `${p.fill} 는 팔레트에 없다`).toBe(true);
    }
  });

  /**
   * 세기 순서가 뒤집히면 룩이 무너진다 — 꺼진 판이 켜진 판보다 밝으면 광고판이 아니라
   * 얼룩이 된다. 절대값은 톤매핑에 달렸으므로(헤드리스 WebGL ≠ 감독 WebGPU) **고정하는
   * 것은 순서뿐**이다.
   *
   * ── 축을 알파에서 **실제 휘도**로 옮겼다 (2026-08-09) ──────────────────────
   * 옛 단언은 `alpha` 만 내림차순으로 정렬해 *"네온 4색 ≳ 흰 패널"* 을 못 박고 있었다.
   * 그 축은 **화면 순서를 못 본다** — 발광 픽셀의 밝기는 `luma(색) × alpha` 이고, 색을
   * 빼면 어두운 색의 높은 알파와 밝은 색의 낮은 알파가 구별되지 않는다.
   *
   * 실측이 그 차이를 보여 준다. 지금 값에서 알파 순서와 휘도 순서가 **다르다**:
   *
   *   알파:  magenta .82 > cyan .80 > amber .78 > white .72 > warm .52 > dim .28 > dark .08
   *   휘도:  white .692 > cyan .531 > amber .520 > warm .434 > magenta .271 > dim .248 > dark .020
   *
   * 마젠타는 알파가 가장 높은데 실제로는 dim 다음으로 어둡다(`luma(neonMagenta)` 가
   * 0.331 로 흰빛의 1/3 이라서다). 즉 옛 단언은 **참이면서 화면에 대해 아무 말도 하지
   * 않는** 상태였고, 이번 회차에 블룸 문턱 검사가 같은 형태로 죽어 있던 것과 같은
   * 사고다(`tests/world5-neon-glow.test.ts` 의 그 블록 주석).
   *
   * 그래서 순서 자체도 바뀌었다 — **흰 패널이 맨 위**다. 근거는 `palette.ts` 의
   * `neonWhite` 주석 한 곳이 소유한다(번지는 것은 흰빛이 맡고 색은 원색이 맡는다).
   *
   * 뮤테이션: `TEXELS` 의 `M.dark` 알파를 0.9 로 올리면 마지막 부등식이 깨지고,
   *           `M.white` 색을 `V.neonMagenta` 로 바꾸면 첫 부등식이 깨진다.
   */
  it('실제 발광 휘도: 흰 패널 ≫ 어두운 화면 ≫ 거의 꺼짐', () => {
    const paints = maskPaints(adfacade);
    // 원색 넷(마젠타·시안·앰버) + 따뜻한 화면 + 흰 패널 + dim + dark = 일곱 칠
    expect(paints.length).toBe(7);
    const lit = paints.map((p) => ({ ...p, L: luma(parseInt(p.fill.slice(1), 16)) * p.alpha }))
      .sort((a, b) => b.L - a.L);
    const [top, , , , , dim, dark] = lit;

    // ① 가장 밝은 것은 **흰 패널**이다 — 원색이 아니다.
    expect(luma(parseInt(top.fill.slice(1), 16)), '가장 밝은 칠이 흰빛이 아니다')
      .toBeGreaterThan(0.9);
    // ② 켜진 것 중 가장 어두운 것도 전환 중 화면보다 밝다 — 그래야 "꺼진 판" 이 갈린다.
    expect(lit[4].L, '켜진 판이 전환 중 화면에 묻힌다').toBeGreaterThan(dim.L);
    expect(dim.L).toBeGreaterThan(dark.L * 2);
    // ③ 알파는 배수라 1 을 넘으면 마스크가 포화된다.
    expect(Math.max(...paints.map((p) => p.alpha))).toBeLessThan(1);
  });
});
