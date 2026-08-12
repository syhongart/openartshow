// world2 파셀 배치 판정 테스트.
//
// 두 불변식이 이 파일의 전부다.
// ① 좌표 결정론 — 저장하지 않고 매번 다시 계산하므로("파라미터가 곧 공간"), 이게 깨지면
//    파셀이 언로드/재로드될 때마다 세상이 바뀐다.
// ② tier 포함관계 — tier는 무엇을 그릴지만 줄이지 어디에 그릴지를 바꾸지 않는다. 깨지면
//    멀어졌다 가까워질 때 건물이 순간이동한다.

import { describe, it, expect } from 'vitest';
import {
  hash2, rngFrom, parcelLayout, kindsFor, maxPartsPerParcel,
  DEFAULT_LAYOUT, type PartKind, type PlacedPart,
} from '../frontend/js/world2/decide/parcel-layout.js';
import { isTowerParcel } from '../frontend/js/world2/parts/zoning.js';
import { isPlaza } from '../frontend/js/world2/parts/plaza.js';
import { surfaceY } from '../frontend/js/world2/parts/surface.js';
import { ALL_KINDS } from '../frontend/js/world2/parts/index.js';

const at = (px: number, pz: number, tier: 'near' | 'mid' | 'far' = 'near') => parcelLayout(px, pz, tier);
const only = (ps: PlacedPart[], k: PartKind) => ps.filter((p) => p.kind === k);
const key = (p: PlacedPart) => `${p.kind}:${p.x.toFixed(6)},${p.z.toFixed(6)},${p.ry.toFixed(6)}`;

describe('hash2 / rngFrom — 결정론적 난수', () => {
  it('같은 입력은 같은 해시', () => {
    expect(hash2(3, -7)).toBe(hash2(3, -7));
  });

  it('다른 입력은 다른 해시(인접 좌표 포함)', () => {
    const seen = new Set<number>();
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) seen.add(hash2(x, z));
    expect(seen.size).toBe(81); // 81칸 전부 충돌 없음
  });

  it('음수 좌표에서도 흩어진다 — 대각선 패턴이 생기면 눈에 띈다', () => {
    // px === pz인 대각선에서 값이 뭉치지 않아야 한다.
    const diag = [];
    for (let i = -20; i <= 20; i++) diag.push(hash2(i, i) % 1000);
    expect(new Set(diag).size).toBeGreaterThan(30);
  });

  it('rngFrom은 같은 시드에서 같은 수열', () => {
    const a = rngFrom(12345), b = rngFrom(12345);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('rngFrom은 0~1 범위', () => {
    const r = rngFrom(999);
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('불변식 ① 좌표 결정론', () => {
  it('같은 파셀은 언제나 같은 배치', () => {
    expect(at(5, -3)).toEqual(at(5, -3));
  });

  it('재로드해도 세상이 바뀌지 않는다 — 여러 번 계산해도 동일', () => {
    const first = at(-12, 40);
    for (let i = 0; i < 5; i++) expect(at(-12, 40)).toEqual(first);
  });

  it('다른 파셀은 다른 배치 — 세상이 복사판이면 안 된다', () => {
    const a = at(0, 0), b = at(1, 0), c = at(0, 1);
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('불변식 ② tier 포함관계 — 건물이 순간이동하지 않는다', () => {
  const near = at(7, 11, 'near');
  const mid = at(7, 11, 'mid');
  const far = at(7, 11, 'far');

  it('far ⊆ mid ⊆ near (종류 기준)', () => {
    const kinds = (ps: PlacedPart[]) => new Set(ps.map((p) => p.kind));
    const kn = kinds(near), km = kinds(mid), kf = kinds(far);
    for (const k of kf) expect(km.has(k)).toBe(true);
    for (const k of km) expect(kn.has(k)).toBe(true);
  });

  it('공통 종류의 위치가 완전히 같다 — 이게 이 설계의 핵심', () => {
    for (const kind of ['ground', 'building'] as PartKind[]) {
      expect(only(far, kind).map(key)).toEqual(only(near, kind).map(key));
      expect(only(mid, kind).map(key)).toEqual(only(near, kind).map(key));
    }
    expect(only(mid, 'tree').map(key)).toEqual(only(near, 'tree').map(key));
  });

  it('공통 종류의 크기·색조까지 같다', () => {
    expect(only(far, 'building')).toEqual(only(near, 'building'));
  });

  it('tier가 낮을수록 부품이 적거나 같다', () => {
    expect(far.length).toBeLessThanOrEqual(mid.length);
    expect(mid.length).toBeLessThanOrEqual(near.length);
  });

  it('여러 파셀에서 반복 확인 — 우연히 맞은 게 아니다', () => {
    for (const [px, pz] of [[0, 0], [-5, 8], [13, -2], [100, 100]]) {
      const n = parcelLayout(px, pz, 'near');
      const f = parcelLayout(px, pz, 'far');
      expect(only(f, 'building')).toEqual(only(n, 'building'));
    }
  });
});

describe('kindsFor — tier별 구성', () => {
  it('세 tier 의 종류 집합이 같다 — 소멸 사건 제거 규약 (2026-08-10)', () => {
    // ⚠ 이 단언은 원래 *"near 가 가장 많고 far 가 가장 적다"* 였고 그 규약이 **깜빡임의
    // 원인이었다** — tier 강등이 종류를 걷어내는 순간이 화면에서 잡혔다(감독 실측,
    // 근거는 `parts/planter.ts` 의 tiers 주석 한 곳). 지금 규약은 반대다: 전환이
    // 어떤 종류도 안 바꿔야 한다. 처방 자체의 검사판은 `world2-band-scale.test.ts` 다.
    expect([...kindsFor('near')].sort()).toEqual([...kindsFor('far')].sort());
  });

  it('모든 tier에 ground와 building이 있다 — 빈 파셀은 구멍으로 보인다', () => {
    for (const t of ['near', 'mid', 'far'] as const) {
      expect(kindsFor(t)).toContain('ground');
      expect(kindsFor(t)).toContain('building');
    }
  });
});

describe('배치 범위 — 이웃 파셀을 침범하지 않는다', () => {
  // 반폭(`cell/2 − margin`)은 파셀 **안쪽** 한계이고, 그 바깥 `margin` 띠는 어느 파셀의
  // 파츠도 들어오지 않는 완충지다. 가로등만 그 띠를 넘어 경계 위에 선다 — 두 도로의
  // 가로등 줄이 교차로에서 붙는 것을 피하려고 일부러 그리로 옮겼다(감독: *"왜 가로등이
  // 2개 한쌍처럼 보이지?"*). 그래서 **가로등만 셀 경계까지** 허용한다.
  //
  // 예외를 열면서 이 검사가 원래 지키려던 것("이웃 파셀 물건과 안 겹친다")은 대리
  // 지표로 못 보게 됐다. 그쪽은 `world2-lamp-placement.test.ts` 가 이웃 3×3 파셀 ×
  // 3 tier 전수로 **직접** 잰다 — 예외를 열 때 검사를 함께 옮겨 두지 않으면 그 순간
  // 사각이 생긴다.
  it('모든 부품이 셀 경계 안에 있다 — 가로등만 경계 위까지', () => {
    const halfX = DEFAULT_LAYOUT.cellX / 2 - DEFAULT_LAYOUT.margin;
    const halfZ = DEFAULT_LAYOUT.cellZ / 2 - DEFAULT_LAYOUT.margin;
    for (let px = -3; px <= 3; px++) {
      for (let pz = -3; pz <= 3; pz++) {
        for (const p of at(px, pz)) {
          if (p.kind === 'ground') continue; // 지면은 셀 전체를 덮는다
          // 그림자 데칼은 **자기 자리를 뽑지 않는다** — 캐스터 자세를 그대로 복사하므로
          // (`parts/shadow.ts` 의 `place`), 여기서 다시 재면 같은 좌표를 두 번 재는 것이고
          // `shadow:lamp` 처럼 예외를 종류마다 또 열거해야 한다. 복사라는 사실 자체는
          // `world2-parcel-layout-golden.test.ts` 의 「자세가 캐스터의 복사다」 가 단언한다.
          //
          // ⚠ 그림자가 **월드에서** 파셀 경계를 넘는 것은 사실이고 의도다(태양 저고도).
          // 그 경계는 좌표가 아니라 길이 상한이 정한다 — `SHADOW_MAX_LEN` 과
          // `world2-shadow-decal.test.ts` 의 상한 단언이 그 축이다.
          if (p.kind.startsWith('shadow:')) continue;
          const lx = p.kind === 'lamp' ? DEFAULT_LAYOUT.cellX / 2 : halfX;
          const lz = p.kind === 'lamp' ? DEFAULT_LAYOUT.cellZ / 2 : halfZ;
          expect(Math.abs(p.x), `${p.kind} x`).toBeLessThanOrEqual(lx + 1e-9);
          expect(Math.abs(p.z), `${p.kind} z`).toBeLessThanOrEqual(lz + 1e-9);
        }
      }
    }
  });

  it('지면은 셀을 정확히 덮는다 — 틈이 보이면 안 된다', () => {
    const g = only(at(2, 2), 'ground');
    expect(g).toHaveLength(1);
    expect(g[0].sx).toBe(DEFAULT_LAYOUT.cellX);
    expect(g[0].sz).toBe(DEFAULT_LAYOUT.cellZ);
    expect(g[0].x).toBe(0);
    expect(g[0].z).toBe(0);
  });

  // ── 바닥 판과 실물을 갈라서 본다 ────────────────────────────────────────
  // 원래는 전부 `toBe(0)` 이었고, 도로가 들어오며 `≤ 0.1` 로 완화했다. 그런데 그 둘은
  // **성질이 다른 값**이다:
  //
  //   실물(건물·나무·벤치) — 밑동이 땅에 **닿아야** 한다. 조금이라도 뜨면 떠 보인다.
  //   바닥 판(도로·정원)   — 수평면끼리 깊이 다툼을 피하려는 **미세 오프셋**이다.
  //                          땅에 닿는 것이 아니라 땅 바로 위에 얹히는 것이다.
  //
  // 하나의 상한으로 둘을 재면 실물 쪽이 헐거워진다(0.1 까지 떠도 통과). 갈라 놓으면
  // 실물은 정확히 0 을 요구할 수 있고, 판은 필요한 만큼 벌릴 수 있다.
  const DECALS = new Set(['ground', 'garden', 'road']);

  // ⚠ **2026-08-12 에 재는 축을 고쳤다** (감독 발견 → 팀장 판정 B).
  // 이 단언은 오래 `expect(p.y).toBe(0)` 이었고, 문장(*"밑동이 땅에 있다"*)은 내내 참인데
  // **결론이 거짓**이었다 — `y=0` 은 **지면 판 상단**이지 화면에서 밟는 바닥이 아니다.
  // 그 위를 잔디 판(0.07)이 파셀째 덮고 도로(0.14)가 또 얹히므로, `y=0` 으로 놓인 실물은
  // 실제로는 잔디에 **7cm 잠겨** 있었다(그림자는 판 아래로 묻혀 아예 안 보였다).
  // 참인 문장에서 성립하지 않는 결론을 뽑은 두 번째 사례다(첫 번째는 `info.memory` —
  // *"객체를 부팅 때 다 만들어 둔다"* 가 참이면서 GPU 자원 계단을 못 막았던 그것).
  //
  // 이제 표면 높이는 `decide/parcel-layout.ts` 가 한 곳에서 더하고, 파츠가 내는 것은
  // **로컬 높이**다. 그래서 여기서 보는 것도 로컬(= 최종 y − 그 자리 표면 높이)이다.
  // 표면 정합 자체는 `tests/world2-surface.test.ts` 가 따로 본다 — 두 축을 한 단언에
  // 섞으면 어느 쪽이 깨졌는지 구별되지 않는다.
  it('실물 부품은 로컬 밑동이 정확히 0 이다 — 표면 위에 정확히 얹힌다', () => {
    // ── 한 파셀로는 모자란다 ─────────────────────────────────────────────
    // 처음엔 `at(4,-4)` 한 파셀만 봤다. 나무를 8cm 띄우는 뮤테이션이 **살아남았다** —
    // 그 파셀에 나무가 없었기 때문이다. `checked > 0` 을 넣어 뒀지만 그건 "무언가는
    // 검사했다" 일 뿐 "모든 종류를 검사했다" 가 아니다. 이 프로젝트가 빈 표본으로
    // 이미 겪은 형태이고, 여기서는 표본이 **비지는 않았는데도** 구멍이 났다.
    //
    // 여러 파셀을 훑고, 실물 종류가 전부 표본에 들었는지 **레지스트리와 대조**한다 —
    // 파츠를 추가하면 표본 요구도 자동으로 늘어난다.
    const seen = new Set<string>();
    for (let px = -5; px <= 5; px++) {
      for (let pz = -5; pz <= 5; pz++) {
        for (const p of at(px, pz)) {
          if (DECALS.has(p.kind)) continue;
          seen.add(p.kind);
          expect(p.y - surfaceY(px, pz, p.x, p.z)).toBe(0);
        }
      }
    }
    expect(ALL_KINDS.filter((k) => !DECALS.has(k) && !seen.has(k))).toEqual([]);
  });

  it('바닥 판은 지면 바로 위에 얹힌다 — 깊이 다툼을 피할 만큼만', () => {
    let checked = 0;
    for (const p of at(4, -4)) {
      if (!DECALS.has(p.kind)) continue;
      checked++;
      expect(p.y).toBeGreaterThanOrEqual(0);
      // 20cm 를 넘으면 판이 실제로 떠 보이기 시작한다. 지금 최대는 도로의 14cm 다.
      expect(p.y).toBeLessThanOrEqual(0.2);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('바닥 판끼리 높이가 겹치지 않는다 — 같은 높이면 지글거린다', () => {
    const ys = new Map<string, number>();
    for (const p of at(4, -4)) if (DECALS.has(p.kind)) ys.set(p.kind, p.y);
    const sorted = [...ys.values()].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      // 5cm 는 벌어져야 먼 거리에서도 순서가 유지된다
      expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(0.05);
    }
  });

  it('크기가 모두 양수다 — 0이나 음수는 뒤집힌 메시를 만든다', () => {
    for (let px = -3; px <= 3; px++) {
      for (const p of at(px, px * 2)) {
        expect(p.sx).toBeGreaterThan(0);
        expect(p.sy).toBeGreaterThan(0);
        expect(p.sz).toBeGreaterThan(0);
      }
    }
  });
});

describe('maxPartsPerParcel — 슬롯 예산의 근거', () => {
  it('실제 배치가 신고한 최대를 넘지 않는다(1000 파셀 표본)', () => {
    // 이게 틀리면 슬롯이 모자라 파셀이 조용히 덜 그려진다.
    const kinds: PartKind[] = ['ground', 'building', 'tree', 'lamp'];
    const peak: Record<string, number> = { ground: 0, building: 0, tree: 0, lamp: 0 };
    for (let px = 0; px < 32; px++) {
      for (let pz = 0; pz < 32; pz++) {
        const ps = at(px, pz);
        for (const k of kinds) peak[k] = Math.max(peak[k], only(ps, k).length);
      }
    }
    for (const k of kinds) {
      expect(peak[k]).toBeLessThanOrEqual(maxPartsPerParcel(k));
    }
  });

  it('건물은 광장·타워 파셀이 아닌 한 최소 1채 — 우연히 빈 파셀은 없다', () => {
    // 하한이 2였다. 감독이 "건물이 빽빽하다" 고 지적해 1~4로 내리면서 함께 낮췄다 —
    // 하한 2면 "한 채만 선 여유로운 구획" 이 구조적으로 존재할 수 없다.
    //
    // 0채는 **의도된 예외에서만** 나온다. 그리고 그 예외 목록이 이번에 하나 늘었다:
    //   · 광장 — 트인 곳이 목적이고, 중앙 광장에는 분수대·시계탑이 선다
    //   · 타워 파셀 — 고층이 파셀 중앙을 통째로 쓴다(`parts/tower.ts`). 건물이 사분면
    //     에서 자리를 뽑으면 안쪽이 타워와 겹치므로 아예 비운다
    //
    // **이 목록에 없는데 0채면 배치가 어긋난 것이다.** 예외를 늘릴 때마다 여기에
    // 적히므로, "언제부터인가 빈 파셀이 늘었다" 가 조용히 지나가지 않는다.
    let checked = 0;
    for (let px = 0; px < 60; px++) {
      for (let pz = 0; pz < 4; pz++) {
        if (isPlaza(px, pz)) continue;
        if (isTowerParcel(px, pz, DEFAULT_LAYOUT.cellX, DEFAULT_LAYOUT.cellZ)) continue;
        checked++;
        expect(only(at(px, pz), 'building').length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(checked).toBeGreaterThan(100); // 표본이 비어 조용히 통과하지 않도록
  });

  it('★ 타워 파셀에는 건물이 하나도 없다 — 겹침은 판정으로만 막힌다', () => {
    // 위 검사가 타워를 **건너뛰므로**, 그 자리에서 실제로 0인지는 따로 봐야 한다.
    // 건너뛰기만 하고 확인을 안 하면 "예외로 뒀더니 아무도 안 보는 자리" 가 된다 —
    // 이 저장소가 반복해서 데인 형태다.
    let towers = 0;
    for (let px = -20; px < 20; px++) {
      for (let pz = -20; pz < 20; pz++) {
        if (!isTowerParcel(px, pz, DEFAULT_LAYOUT.cellX, DEFAULT_LAYOUT.cellZ)) continue;
        towers++;
        const ps = at(px, pz);
        expect(only(ps, 'building').length, `타워 파셀 (${px},${pz}) 에 건물이 섰다`).toBe(0);
        expect(only(ps, 'tower').length, `타워 파셀 (${px},${pz}) 에 정작 타워가 없다`).toBe(1);
      }
    }
    expect(towers, '표본에 타워 파셀이 없다 — 이 검사가 아무것도 안 봤다')
      .toBeGreaterThan(3);
  });

  it('옵션으로 예산을 줄이면 실제 배치도 줄어든다', () => {
    const tight = parcelLayout(3, 3, 'near', { ...DEFAULT_LAYOUT, maxBuildings: 3, maxTrees: 2 });
    expect(only(tight, 'building').length).toBeLessThanOrEqual(3);
    expect(only(tight, 'tree').length).toBeLessThanOrEqual(2);
  });
});
