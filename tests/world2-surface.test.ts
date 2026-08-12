// world2 표면 정합 — **물건이 밟는 바닥에 정확히 얹히는가.**
//
// ── 왜 이 파일이 생겼나 (감독 발견 2026-08-12) ──────────────────────────────
// 감독: *"초록바닥은 왜 그림자가 안 생기지?"*
//
// world2 의 바닥은 한 겹이 아니다 — 지면(0) 위를 잔디 판(0.07)이 파셀째 덮고, 길이
// 지나는 자리에는 도로(0.14)가 또 얹힌다. 그런데 실물 파츠는 전부 `y: 0` 으로 놓였다.
// 결과: 잔디 파셀에서 물건이 **7cm 잠기고**, 그림자 데칼(발밑 +0.02)이 잔디 판 **5cm
// 아래**로 묻혀 아예 안 보였다. 광장에는 잔디를 안 깔아 지면이 드러나므로 거기서만
// 그림자가 정상이었다 — 감독 스크린샷 두 장의 차이가 정확히 그 한 줄이다.
//
// ── 이 파일이 막는 것 ───────────────────────────────────────────────────────
// 배치 파이프라인(`decide/parcel-layout.ts`)이 표면 높이를 더하는 그 한 줄과, 바닥 판·
// 그림자를 그 가산에서 빼는 `absoluteY` 신고. **둘 다 지웠을 때 실제로 깨지는지**를
// 뮤테이션으로 실측했다(팀장 조건 3).
//
// ── 폐지된 `standsOn` 의 목적이 여기로 옮겨 왔다 (팀장 조건 4) ──────────────
// 그 축이 지키던 것은 *"광장 랜드마크(분수·시계탑)가 도로판 0.14 위에 선다"* 하나였고,
// 아래 「광장 랜드마크」 케이스가 그것을 **파츠 신고가 아니라 자리 판정으로** 다시 세운다.
// 목적이 옮겨 온 것을 확인한 뒤에 필드를 걷었다.

import { describe, it, expect } from 'vitest';
import { parcelLayout, DEFAULT_LAYOUT, type PlacedPart } from '../frontend/js/world2/decide/parcel-layout.js';
import { surfaceY } from '../frontend/js/world2/parts/surface.js';
import { GARDEN_SURFACE_Y } from '../frontend/js/world2/parts/garden.js';
import { ROAD_SURFACE_Y } from '../frontend/js/world2/parts/road.js';
import { isPlaza } from '../frontend/js/world2/parts/plaza.js';
import { roadDirs, onRoad } from '../frontend/js/world2/parts/road-topology.js';

const at = (px: number, pz: number, tier: 'near' | 'mid' | 'far' = 'near') => parcelLayout(px, pz, tier);
/** 자기 절대 y 를 갖고 태어나는 것들 — 가산 대상이 아니다(`PartSpec.absoluteY`) */
const PLATES = new Set(['ground', 'garden', 'road']);

/** 파셀 안에서 길이 안 닿는 지점 하나. 없으면 null */
function offRoadSpot(dirs: readonly ReturnType<typeof roadDirs>[number][]): [number, number] | null {
  for (let x = -15; x <= 15; x += 3) {
    for (let z = -15; z <= 15; z += 3) if (!onRoad(x, z, dirs)) return [x, z];
  }
  return null;
}

/** 격자를 훑어 조건에 맞는 첫 파셀. 좌표를 손으로 적으면 지형이 바뀔 때 표본이 빈다 */
function findParcel(pred: (px: number, pz: number) => boolean): [number, number] {
  for (let px = -12; px <= 12; px++) {
    for (let pz = -12; pz <= 12; pz++) if (pred(px, pz)) return [px, pz];
  }
  throw new Error('조건에 맞는 파셀이 격자 −12..12 에 없다 — 표본이 비면 단언이 무의미하다');
}

describe('surfaceY — 그 자리에서 밟는 바닥 높이', () => {
  it('잔디 파셀은 잔디 판 윗면이다', () => {
    // ⚠ *"길이 없는 파셀"* 로 표본을 잡으려다 실패했다 — 격자 −12..12 에 **하나도 없다**
    // (도로 격자가 모든 파셀에 닿는다). 그래서 파셀이 아니라 **지점**으로 가른다:
    // 같은 파셀 안에서도 길 위는 0.14, 길 밖은 잔디다.
    const [px, pz] = findParcel((x, z) => !isPlaza(x, z));
    const dirs = roadDirs(px, pz);
    const spot = offRoadSpot(dirs);
    expect(spot).toBeTruthy();
    expect(surfaceY(px, pz, spot![0], spot![1])).toBe(GARDEN_SURFACE_Y);
  });

  it('광장은 지면이 드러난다 — 잔디를 안 깔기 때문이다', () => {
    const [px, pz] = findParcel(isPlaza);
    // 도로가 없는 구석을 골라야 한다 — 광장에도 길은 깔린다.
    const dirs = roadDirs(px, pz);
    let found = false;
    for (let x = -14; x <= 14 && !found; x += 2) {
      for (let z = -14; z <= 14 && !found; z += 2) {
        if (onRoad(x, z, dirs)) continue;
        expect(surfaceY(px, pz, x, z)).toBe(0);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('길 위는 도로판 윗면이다 — 가장 위에 얹힌 판이 이긴다', () => {
    const [px, pz] = findParcel((x, z) => roadDirs(x, z).length > 0);
    // 파셀 중심에는 길머리가 무조건 있다(`road.ts` — 광장에서도 깐다).
    expect(onRoad(0, 0, roadDirs(px, pz))).toBe(true);
    expect(surfaceY(px, pz, 0, 0)).toBe(ROAD_SURFACE_Y);
  });

  it('잔디 가드와 짝이 맞는다 — 잔디가 깔린 파셀에서 0 을 답하면 다시 잠긴다', () => {
    // `garden.ts` 의 `if (isPlaza) return []` 와 `surface.ts` 의 `if (isPlaza) return 0` 은
    // **같은 조건을 두 곳에서** 본다. 한쪽만 뒤집히면 잔디는 깔렸는데 표면은 0 이라고
    // 답하는(=이번 결함이 그대로 재발하는) 상태가 된다. 배치 결과로 직접 대조한다.
    for (let px = -6; px <= 6; px++) {
      for (let pz = -6; pz <= 6; pz++) {
        const hasGarden = at(px, pz).some((p) => p.kind === 'garden');
        // 길이 없는 구석에서 재야 도로판에 가리지 않는다.
        const dirs = roadDirs(px, pz);
        const corner: [number, number] | null =
          !onRoad(15, 15, dirs) ? [15, 15] : !onRoad(-15, 15, dirs) ? [-15, 15] : null;
        if (!corner) continue;
        expect(surfaceY(px, pz, corner[0], corner[1]) > 0, `parcel ${px},${pz}`).toBe(hasGarden);
      }
    }
  });
});

describe('배치 정합 — 실물이 표면 위에 정확히 얹힌다', () => {
  const realThings = (ps: PlacedPart[]) =>
    ps.filter((p) => !PLATES.has(p.kind) && !p.kind.startsWith('shadow:'));

  it('★★ 잔디 위 실물은 잔디 윗면에 선다 — 잠기지 않는다', () => {
    // 이 단언이 이번 결함의 정면이다. 가산이 죽으면 전부 0 이 되어 깨진다.
    // 길 위에 서는 것(광장 랜드마크)은 다음 케이스 소관이라 여기서 뺀다.
    let checked = 0;
    for (let px = -6; px <= 6; px++) {
      for (let pz = -6; pz <= 6; pz++) {
        if (isPlaza(px, pz)) continue;
        const dirs = roadDirs(px, pz);
        for (const p of realThings(at(px, pz))) {
          if (onRoad(p.x, p.z, dirs)) continue;
          expect(p.y, `${p.kind} @${px},${pz}`).toBeCloseTo(GARDEN_SURFACE_Y, 12);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('★★ 광장 랜드마크는 도로판 위에 선다 (폐지된 standsOn 의 목적)', () => {
    // 분수대·시계탑은 광장 정중앙 고정이고 그 자리에는 도로 중심 조각이 무조건 깔린다.
    // 예전에는 파츠가 `standsOn: ROAD_SURFACE_Y` 로 신고해 이 높이를 얻었다. 이제는
    // **자리**가 답한다 — 파츠 선언에서 그 필드를 걷어도 이 단언이 지켜져야 한다.
    let seen = 0;
    for (let px = -12; px <= 12; px++) {
      for (let pz = -12; pz <= 12; pz++) {
        for (const p of at(px, pz)) {
          if (p.kind !== 'fountain' && p.kind !== 'clock') continue;
          seen++;
          expect(p.y, `${p.kind} @${px},${pz}`).toBeCloseTo(ROAD_SURFACE_Y, 12);
        }
      }
    }
    // 표본이 비면 위 루프가 통째로 장식이다 — 이 프로젝트가 빈 표본으로 이미 겪었다.
    expect(seen).toBeGreaterThan(0);
  });

  it('★ 바닥 판은 가산에서 빠진다 — 더해지면 판이 떠오른다', () => {
    // `absoluteY` 신고를 지우면 잔디가 0.07+0.07=0.14 로, 도로가 0.28 로 부양한다.
    const [px, pz] = findParcel((x, z) => !isPlaza(x, z) && roadDirs(x, z).length > 0);
    const ps = at(px, pz);
    for (const p of ps) {
      if (p.kind === 'ground') expect(p.y).toBe(0);
      if (p.kind === 'garden') expect(p.y).toBe(GARDEN_SURFACE_Y);
      if (p.kind === 'road') expect(p.y).toBe(ROAD_SURFACE_Y);
    }
    expect(ps.some((p) => p.kind === 'road')).toBe(true);
    expect(ps.some((p) => p.kind === 'garden')).toBe(true);
  });

  it('★ `?gsurf=0` 이 옛 화면으로 되돌린다 — 되돌림 노브가 실제로 동작한다', () => {
    // 노브를 만들어 놓고 배선을 안 하면 감독이 링크를 눌러도 아무 일이 안 일어난다.
    // 그 형태가 이 저장소에 실제로 있었다(`sky.js` 의 `lowRes` — 소비자가 false 하드코딩).
    const [px, pz] = findParcel((x, z) => !isPlaza(x, z));
    const dirs = roadDirs(px, pz);
    const off = parcelLayout(px, pz, 'near', { ...DEFAULT_LAYOUT, surface: 0 });
    let checked = 0;
    for (const p of off) {
      if (PLATES.has(p.kind)) continue;
      if (onRoad(p.x, p.z, dirs)) continue;
      expect(p.y, `${p.kind}`).toBe(0);   // 옛 상태 = 전부 지면
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
    // 절반만 올리는 중간값도 산다 — 불리언이 아니라 배수인 이유가 이것이다.
    const half = parcelLayout(px, pz, 'near', { ...DEFAULT_LAYOUT, surface: 0.5 });
    const t = half.find((p) => p.kind === 'tree' && !onRoad(p.x, p.z, dirs));
    if (t) expect(t.y).toBeCloseTo(GARDEN_SURFACE_Y / 2, 12);
  });

  it('★ 그림자는 캐스터와 같은 높이로 태어난다 — 이중 가산이 없다', () => {
    // 그림자 `place` 는 캐스터 자세를 복사한다. 캐스터는 이미 가산된 뒤이므로 여기서
    // 또 더하면 두 배가 된다(잔디에서 0.14, 도로 랜드마크에서 0.28).
    let pairs = 0;
    for (let px = -8; px <= 8; px++) {
      for (let pz = -8; pz <= 8; pz++) {
        const ps = at(px, pz);
        for (const s of ps) {
          if (!s.kind.startsWith('shadow:')) continue;
          const casterKind = s.kind.slice('shadow:'.length);
          const caster = ps.find(
            (c) => c.kind === casterKind && c.x === s.x && c.z === s.z,
          );
          expect(caster, `${s.kind} @${px},${pz} 의 캐스터`).toBeTruthy();
          expect(s.y, `${s.kind} @${px},${pz}`).toBeCloseTo(caster!.y, 12);
          pairs++;
        }
      }
    }
    expect(pairs).toBeGreaterThan(0);
  });
});
