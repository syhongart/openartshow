// 스폰 밴드 — **값이 소비자 계약을 만족하는가.** 문자열이 아니라 함수를 부른다.
//
// ── 이 검사가 생긴 이유 (검수관 반려 B1, 2026-08-02) ────────────────────────
// `SPAWN_REACH` 를 안개에서 유도하면서 **비정수**(1.6)로 뒀다. 소비자 `pickNearby`
// 는 정수 셀 인덱스가 계약인데(`for (let dx = -reach; dx <= reach; dx++)`),
// 비정수를 넣으니 후보 12개 중 정수 좌표가 **0개**가 됐다.
//
// 그리고 그것이 격자 판정을 통째로 무력화했다 — `floorMod(px, 2) !== 0` 이 비정수
// 에서 **항상 참**이라 `roadDirs` 가 언제나 4방향을 반환하고, NPC 가 도로 위상을
// 무시하고 블록·건물 안쪽을 가로질렀다. **라이브 런타임 회귀였다.**
//
// ── 왜 기존 검사가 못 잡았나 ────────────────────────────────────────────────
// `world2-fog.test.ts` 는 소스를 **문자열로** 읽어 `SPAWN_REACH` 가 `FOG_NEAR_CELLS`
// 를 포함하는지만 봤다. 포함했으므로 PASS 했다. **어디서 왔는지는 봤고 그 값이
// 쓸 수 있는 값인지는 안 봤다.**
//
// CLAUDE.md 가 이름 붙인 자리다 — *"`decide/` 를 순수 함수로 두면 각 쪽은
// 테스트하기 쉬워지지만, **계산된 값이 실제로 소비되는가**는 양쪽 테스트 어디에도
// 안 걸린다. 새 판정 값을 만들면 집행 쪽 통합 테스트를 함께 붙인다."*
//
// 그래서 이 파일은 **`pickNearby` 를 실제로 호출**한다.

import { describe, it, expect } from 'vitest';
import { pickNearby, reachFor, nearbyCells, cellKey } from '../frontend/js/world2/decide/npc-walk.js';
import { fogBand } from '../frontend/js/world2/decide/fog.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';
// ★ **실물 상수를 import 한다.** 처음엔 같은 유도식을 여기 복제했고, 그래서
// `npc.ts` 의 `Math.floor` 를 `ceil` 로 바꿔도 저장소 전체 게이트가 **하나도 안
// 깨졌다**(검수관 뮤테이션 실증, 1371/1371 통과). 값을 다시 적는 것만 미러링이
// 아니라 **식을 다시 적는 것도 미러링**이다 — 검사가 자기가 만든 값을 검사하면
// 실물이 무엇이든 통과한다. B1 이 샌 사각과 정확히 같은 형태이고 이번이 세 번째다.
import { SPAWN_REACH, SPAWN_RING } from '../frontend/js/world2/features/npc.js';

const { cellX, cellZ } = DEFAULT_LAYOUT;
const REACH = SPAWN_REACH;
const RING = SPAWN_RING;

/** 결정론 난수. `npc.ts:rngFrom` 과 같은 알고리즘 — 시드가 같으면 같은 결과 */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 여러 시드·여러 원점에서 후보를 모은다 — 한 점만 보면 우연히 통과할 수 있다 */
function samples(ring: number, reach: number) {
  const out: { px: number; pz: number }[] = [];
  for (let seed = 1; seed <= 40; seed++) {
    const r = rng(seed * 0x9e3779b9);
    for (const [ox, oz] of [[0, 0], [3, 5], [-7, 2], [11, -4]]) {
      const c = pickNearby(ox, oz, ring, reach, r, cellX, cellZ);
      if (c) out.push({ px: c.px - ox, pz: c.pz - oz });
    }
  }
  return out;
}

describe('스폰 밴드가 pickNearby 계약을 만족한다 (G-1)', () => {
  const got = samples(RING, REACH);

  it('후보를 실제로 얻었다 — 표본이 비면 아래 단언이 전부 공허해진다', () => {
    // 빈 배열이 단언을 통과시킨 사고가 이 저장소에 있다. 표본부터 못 박는다.
    // (물·격자밖이면 `pickNearby` 가 null 을 준다. 전부 null 이면 그것도 결함이다.)
    expect(got.length, 'pickNearby 가 후보를 하나도 안 줬다').toBeGreaterThan(20);
  });

  it('★ 셀 좌표가 정수다 — B1 이 정확히 여기로 샜다', () => {
    const bad = got.filter((c) => !Number.isInteger(c.px) || !Number.isInteger(c.pz));
    // 실패 메시지가 곧 진단이 되게 한다.
    expect(bad.slice(0, 5), `비정수 셀 ${bad.length}건 — 격자 판정이 무력화된다`).toEqual([]);
  });

  it('밴드가 상수와 일치한다 — 체비셰프 거리가 [ring, reach] 안이다', () => {
    const out = got.filter((c) => {
      const d = Math.max(Math.abs(c.px), Math.abs(c.pz));
      return d < RING || d > REACH;
    });
    expect(out.slice(0, 5), `밴드 밖 ${out.length}건`).toEqual([]);
  });
});

// ── G-2: 주장 자체를 유클리드 거리로 검사한다 ───────────────────────────────
//
// 검수관 지적의 핵심: `pickNearby` 의 밴드는 **체비셰프 박스**라 코너가
// `reach × √2` 까지 나간다. 그래서 "reach 를 안개 시작에 맞췄다" 는 것만으로는
// **밴드가 안개 안쪽이라는 보장이 안 된다.**
//
// 실제로 이전 값(reach 2)에서는 후보의 67% 가 안개 시작 밖이었고, 비정수로
// 바꾼 뒤에도 **67% 그대로**였다. 즉 처방이 그 축에서는 아무것도 안 했다.
// 검사하지 않는 주장은 이렇게 오래 참인 척한다.
describe('스폰 밴드가 안개 시작 안쪽이다 (G-2)', () => {
  it('★ 코너까지 안개 시작 안쪽 — 이 검사가 처방의 본체다', () => {
    const near = fogBand(cellX).near;
    const over = samples(RING, REACH)
      .map((c) => Math.hypot(c.px * cellX, c.pz * cellZ))
      .filter((d) => d > near);
    expect(
      over.length,
      `안개 시작 밖 스폰 ${over.length}건 (최대 ${Math.max(0, ...over).toFixed(1)}m > ${near}m)`,
    ).toBe(0);
  });

  it('변경 전 값(reach 2)이라면 이 검사가 깨진다 — 검출력 확인', () => {
    // 뮤테이션을 코드로 굳힌다. 옛 밴드를 되살리면 실제로 잡히는지를 **검사 자신이**
    // 증명한다 — 손으로 되돌려 보고 "깨졌다" 고 적는 것보다 오래 간다.
    const near = fogBand(cellX).near;
    const over = samples(1, 2)
      .map((c) => Math.hypot(c.px * cellX, c.pz * cellZ))
      .filter((d) => d > near);
    expect(over.length, '옛 밴드가 안개를 안 넘는다 — 이 검사가 무력하다').toBeGreaterThan(0);
  });
});

// ── G-3: 인원에 맞춘 밴드 확장 (감독 지시 2026-08-03) ───────────────────────
//
// *"사람을 백 명을 깔아줘. 그래야지 내가 확인 하지."*
//
// 밴드가 한 겹 링이라 후보가 8칸 남짓이다. 거기 100 명을 넣으면 한 칸에 열댓이 겹쳐
// 태어나 **확인하려고 늘린 인원이 확인을 방해한다.** 그래서 인원이 수용력을 넘으면
// 필요한 만큼만 넓힌다.
//
// ⚠ 이 확장은 본편 ① 이 세운 조건("스폰은 안개 시작 안쪽")을 **인원이 많을 때 깬다.**
// 안개 안 칸 수가 유한하므로 물리적으로 피할 수 없다. 그래서 **기본 인원에서 값이
// 안 바뀌는 것**을 못 박는다 — 그것이 깨지면 라이브 회귀다.
describe('스폰 밴드가 인원에 맞춰 넓어진다 (G-3)', () => {
  const at = (c: number, r: number = SPAWN_REACH) =>
    reachFor(c, 0, 0, SPAWN_RING, r, 15, cellX, cellZ);

  it('★ 기본 인원에서는 밴드가 그대로다 — 이게 깨지면 라이브 회귀다', () => {
    // 치비 기본 6 + VRM 0. 지금 라이브가 도는 값이다.
    expect(at(6)).toBe(SPAWN_REACH);
    expect(at(1)).toBe(SPAWN_REACH);
    // 수용력 경계까지도 안 넓어진다.
    const cap = nearbyCells(0, 0, SPAWN_RING, SPAWN_REACH, cellX, cellZ).length;
    expect(cap, '기본 밴드에 후보가 없다 — 아래 단언이 공허해진다').toBeGreaterThan(0);
    expect(at(cap)).toBe(SPAWN_REACH);
  });

  it('★ 인원이 수용력을 넘으면 넓어진다', () => {
    const cap = nearbyCells(0, 0, SPAWN_RING, SPAWN_REACH, cellX, cellZ).length;
    expect(at(cap + 1)).toBeGreaterThan(SPAWN_REACH);
    expect(at(100)).toBeGreaterThan(SPAWN_REACH);
  });

  it('★ 100 명이 겹치지 않을 만큼 후보가 확보된다', () => {
    const r = at(100);
    const cells = nearbyCells(0, 0, SPAWN_RING, r, cellX, cellZ);
    expect(cells.length, `100 명인데 후보가 ${cells.length}칸 — 겹쳐 태어난다`)
      .toBeGreaterThanOrEqual(100);
  });

  it('필요한 만큼만 넓힌다 — 한 단계 좁히면 모자란다', () => {
    // 과하게 넓히면 사람들이 멀리 흩어져 또 안 보인다. 최소성을 단언한다.
    const r = at(100);
    if (r > SPAWN_REACH) {
      const less = nearbyCells(0, 0, SPAWN_RING, r - 1, cellX, cellZ).length;
      expect(less, `${r - 1} 로도 충분한데 ${r} 까지 넓혔다`).toBeLessThan(100);
    }
  });

  it('상한에서 멈춘다 — 도달 불가능한 인원에도 무한히 안 커진다', () => {
    expect(at(1e9)).toBe(15);
  });

  it('★ 점유를 배제하면 같은 칸이 다시 안 나온다 — 겹쳐 태어나는 경로 차단', () => {
    const r = at(40);
    const taken = new Set<string>();
    const rng2 = rng(0x1234);
    const got: string[] = [];
    for (let i = 0; i < 40; i++) {
      const c = pickNearby(0, 0, SPAWN_RING, r, rng2, cellX, cellZ, taken);
      expect(c, `${i}번째에서 후보가 동났다`).not.toBeNull();
      const k = cellKey(c!.px, c!.pz);
      got.push(k);
      taken.add(k);
    }
    expect(new Set(got).size, '같은 칸이 두 번 나왔다').toBe(got.length);
  });
});
