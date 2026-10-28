// 편집 **붓**(여러 개 뿌리기)의 판정·집행 테스트 (2026-08-22).
//
// 감독 카드 판정: 워크래프트3 편집기 대비 다음 축으로 「브러시로 여러 개 뿌리기」.
// 배경과 설계 근거는 `decide/brush.ts` 헤더 한 곳이다.
//
// ── 무엇을 재는가 ───────────────────────────────────────────────────────────
// 붓의 결함은 **화면에서만 보이는 형태**로 나온다 — 「가운데 뭉친다」·「가로수처럼
// 늘어선다」·「두 번째 붓질부터 아무것도 안 나온다」·「나무가 서로 파고든다」. 노드에서
// 그것을 재려면 **분포의 성질을 수로 바꿔야** 하고, 이 파일이 하는 일이 그것이다:
//
//   ① 분포     반경 안인가 · **가운데로 뭉치지 않는가**(√u 를 빠뜨리면 뭉친다)
//   ② 변주     회전·크기가 실제로 흩어지는가(둘 다 없으면 가로수가 된다)
//   ③ 간격     겹치지 않는가 · 간격 때문에 덜 나올 수 있다는 계약
//   ④ 재현     같은 시드면 같은 결과 · **같은 자리 두 번째 붓질은 달라야** 한다
//   ⑤ 집행     파셀별로 모아 `freeze` 한 번 · 되돌리기 **한 항목** · 상한·격자 밖 거르기
//
// ── 여기서 못 재는 것 ───────────────────────────────────────────────────────
// · 실제로 숲처럼 보이는가 — 그것은 화면 판정이고 감독 확인이 유일하다
// · 붓질 중 프레임이 튀는가 — 파셀 재빌드 비용은 WebGPU 소관이라 노드에 축이 없다
// · 물 위에 서는가 — **판정 자체를 안 만들었다**(`paintAt` 헤더의 「알고 남기는 구멍」)

import { describe, it, expect } from 'vitest';
import {
  brushDots, clampRadius, clampCount, strokeSeed, R_MIN, R_MAX, N_MIN, N_MAX,
} from '../frontend/js/world2/decide/brush.js';
import { createActions } from '../frontend/js/world2/edit/actions.js';
import { createEditHistory } from '../frontend/js/world2/edit/history-ops.js';
import { createEditState } from '../frontend/js/world2/edit/state.js';
import type { OverlayHost, VillageRead } from '../frontend/js/world2/edit/types.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';
import type { Panel } from '../frontend/js/world2/edit/panel/dom.js';
import { maxPartsPerParcel } from '../frontend/js/world2/parts/index.js';
import { inGrid } from '../frontend/js/world2/decide/grid.js';

const CELL = 32;

function dots(over: Partial<Parameters<typeof brushDots>[0]> = {}) {
  return brushDots({ cx: 0, cz: 0, radius: 10, count: 20, seed: 7, minGap: 0, ...over });
}

describe('★ ① 분포 — 반경 안이고 가운데로 뭉치지 않는다', () => {
  it('전부 반경 안에 있다', () => {
    for (const d of dots({ radius: 5, count: 200 })) {
      expect(Math.hypot(d.x, d.z)).toBeLessThanOrEqual(5 + 1e-9);
    }
  });

  it('🔴 원판 균등이다 — `√u` 를 빠뜨리면 가운데가 빽빽해진다', () => {
    // 원판 균등이면 **반지름 R/√2 안쪽에 절반**이 있다(넓이가 반이므로).
    // `r = R·u` 로 뽑으면 그 안쪽에 약 71% 가 몰린다 — 그 차이를 잰다.
    const R = 10;
    const ds = dots({ radius: R, count: 4000, seed: 12345 });
    const half = ds.filter((d) => Math.hypot(d.x, d.z) <= R / Math.SQRT2).length / ds.length;
    expect(half, `★ 안쪽 비율 ${half.toFixed(3)} — 0.5 에서 멀면 분포가 틀렸다`)
      .toBeGreaterThan(0.46);
    expect(half).toBeLessThan(0.54);
  });

  it('반경 0 이면 전부 한 점 — 경계값에서 안 터진다', () => {
    const ds = dots({ radius: 0, count: 5, minGap: 0 });
    expect(ds).toHaveLength(5);
    for (const d of ds) expect(Math.hypot(d.x, d.z)).toBeCloseTo(0, 9);
  });

  it('개수 0·음수는 빈 결과 — 「자리가 없다」와 구별되게 부르는 쪽이 판단한다', () => {
    expect(dots({ count: 0 })).toHaveLength(0);
    expect(dots({ count: -3 })).toHaveLength(0);
  });
});

describe('★ ② 변주 — 회전과 크기가 흩어진다', () => {
  it('🔴 회전이 한 값에 몰리지 않는다 — 없으면 숲이 가로수가 된다', () => {
    // ⚠ **고유값 개수로 재지 않는다.** 첫 판본이 그랬고 임계를 틀렸다 — 0~2π 를 0.01
    // 단위로 접으면 빈이 628개인데 표본이 400이라, 균등해도 생일 문제로 고유값은
    // 약 296개다(실측 297). 「고정이면 1」과 「균등이면 296」 사이에 임계를 두는 것은
    // 표본 수에 따라 흔들리는 축이라, **사분면 균형**으로 바꿨다: 고정이면 한 칸에 전부
    // 몰리고, 균등이면 넷이 각각 25% 근처다.
    const ds = dots({ count: 800, seed: 99 });
    const quad = [0, 0, 0, 0];
    for (const d of ds) {
      expect(d.ry).toBeGreaterThanOrEqual(0);
      expect(d.ry).toBeLessThan(Math.PI * 2 + 1e-9);
      quad[Math.min(3, Math.floor(d.ry / (Math.PI / 2)))]! += 1;
    }
    for (const [i, n] of quad.entries()) {
      expect(n / ds.length, `★ 회전 ${i}사분면 비율이 치우쳤다`).toBeGreaterThan(0.18);
    }
  });

  it('🔴 크기가 1 근처에서만 흔들린다 — 너무 넓으면 다른 종처럼 보인다', () => {
    const ds = dots({ count: 400, seed: 5 });
    const min = Math.min(...ds.map((d) => d.s));
    const max = Math.max(...ds.map((d) => d.s));
    expect(min, '★ 크기가 너무 작아졌다').toBeGreaterThan(0.8);
    expect(max, '★ 크기가 너무 커졌다').toBeLessThan(1.2);
    // 그러면서 **실제로 흔들려야** 한다 — 전부 1 이면 변주가 없는 것이다.
    expect(max - min, '★ 크기 변주가 사실상 0 이다').toBeGreaterThan(0.15);
  });
});

describe('★ ③ 간격 — 겹치지 않는다', () => {
  it('🔴 최소 간격보다 가까운 쌍이 없다', () => {
    const gap = 3;
    const ds = dots({ radius: 8, count: 60, minGap: gap, seed: 21 });
    for (let i = 0; i < ds.length; i += 1) {
      for (let j = i + 1; j < ds.length; j += 1) {
        expect(Math.hypot(ds[i]!.x - ds[j]!.x, ds[i]!.z - ds[j]!.z),
          '★ 두 점이 최소 간격보다 가깝다 — 나무가 서로 파고든다')
          .toBeGreaterThanOrEqual(gap - 1e-9);
      }
    }
  });

  it('간격 때문에 요청보다 적게 나올 수 있다 — 그 사실이 계약이다', () => {
    const ds = dots({ radius: 2, count: 50, minGap: 4, seed: 3 });
    expect(ds.length).toBeLessThan(50);
    expect(ds.length, '★ 하나도 안 나오면 붓이 죽은 것이다').toBeGreaterThan(0);
  });

  it('개수를 늘려도 앞의 점들이 그대로다 — 슬라이더를 올리면 **더해질 뿐**이다', () => {
    const few = dots({ radius: 6, count: 10, minGap: 2, seed: 77 });
    const many = dots({ radius: 6, count: 20, minGap: 2, seed: 77 });
    expect(many.slice(0, few.length)).toEqual(few);
  });

  it('🔴 간격을 바꿔도 **살아남은 점의 회전·크기가 안 변한다**', () => {
    // 걸러진 점도 자기 몫의 난수를 소비해야 i번째 점의 회전·크기가 「몇 개가 걸러졌나」와
    // 무관해진다. 안 그러면 간격 슬라이더를 조금 조이는 것만으로 **이미 마음에 든 숲의
    // 방향이 통째로 바뀐다** — 조절이 아니라 다시 뽑기다.
    // ⚠ 이 검사는 `decide/brush.ts` 의 그 자리에 적혀 있던 **틀린 근거를 바로잡으며**
    // 만들어졌다(뮤테이션 실측 2026-08-22 — 그때 이 축이 0개였다).
    const loose = dots({ radius: 6, count: 30, minGap: 0, seed: 55 });
    const tight = dots({ radius: 6, count: 30, minGap: 2.5, seed: 55 });
    expect(tight.length, '★ 간격이 아무것도 안 걸렀다 — 이 검사가 빈 검사다')
      .toBeLessThan(loose.length);
    // 살아남은 점은 자리로 짚는다(간격이 거르는 것은 자리이지 회전이 아니다).
    for (const t of tight) {
      const src = loose.find((d) => d.x === t.x && d.z === t.z);
      expect(src, '★ 간격을 조였더니 없던 자리가 생겼다').toBeDefined();
      expect(t.ry, '★ 간격을 바꿨더니 회전이 밀렸다').toBe(src!.ry);
      expect(t.s, '★ 간격을 바꿨더니 크기가 밀렸다').toBe(src!.s);
    }
  });
});

describe('★ ④ 재현 — 시드가 결과를 정한다', () => {
  it('같은 시드면 같은 결과다 — 검사가 붓질을 재현할 수 있어야 한다', () => {
    expect(dots({ seed: 42 })).toEqual(dots({ seed: 42 }));
  });

  it('다른 시드면 다른 결과다', () => {
    expect(dots({ seed: 42 })).not.toEqual(dots({ seed: 43 }));
  });

  it('🔴 같은 자리를 두 번 문지르면 **다른 점**이 나온다 — 붓질 횟수가 시드에 섞인다', () => {
    // 좌표만으로 시드를 만들면 두 번째 붓질이 같은 점을 내고, 간격 검사에 전부 걸려
    // **아무것도 안 놓인다**. 「한 번 더 문지르면 된다」는 조작이 그 순간 거짓이 된다.
    expect(strokeSeed(3, 4, 1)).not.toBe(strokeSeed(3, 4, 2));
    expect(strokeSeed(3, 4, 1)).toBe(strokeSeed(3, 4, 1));
    expect(strokeSeed(3, 4, 1)).not.toBe(strokeSeed(4, 3, 1));
  });

  it('시드가 실수 좌표에서도 갈린다 — cm 단위로 접는다', () => {
    expect(strokeSeed(1.23, 0, 1)).not.toBe(strokeSeed(1.24, 0, 1));
  });
});

describe('★ 슬라이더 값 자르기', () => {
  it('범위 밖은 자른다 — UI 값이라 거절이 없다', () => {
    expect(clampRadius(-5)).toBe(R_MIN);
    expect(clampRadius(999)).toBe(R_MAX);
    expect(clampCount(0)).toBe(N_MIN);
    expect(clampCount(999)).toBe(N_MAX);
  });

  it('개수는 정수다 — 나무 2.5그루는 없다', () => {
    expect(clampCount(3.4)).toBe(3);
    expect(clampCount(3.6)).toBe(4);
  });

  it('NaN 은 하한으로 — 빈 입력칸이 세계를 안 부순다', () => {
    expect(clampRadius(Number.NaN)).toBe(R_MIN);
    expect(clampCount(Number.NaN)).toBe(N_MIN);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('🔴 ⑤ 집행 — `paintAt` 이 세계에 닿는다', () => {
  function fakePanel(): { panel: Panel; said: string[] } {
    const said: string[] = [];
    return { panel: { say: (m: string) => { said.push(m); }, refresh() { } } as unknown as Panel, said };
  }

  /** 파셀별 동결 원장. `freeze` 호출 횟수도 센다 — 「파셀당 한 번」이 축이다 */
  function makeVillage() {
    const frozen = new Map<string, PlacedPart[]>();
    let freezes = 0;
    const village = {
      partsAt: (px: number, pz: number) => (frozen.get(`${px},${pz}`) ?? []).map((p) => ({ ...p })),
      isFrozen: (px: number, pz: number) => frozen.has(`${px},${pz}`),
      freeze(px: number, pz: number, parts: readonly PlacedPart[]) {
        freezes += 1;
        frozen.set(`${px},${pz}`, parts.map((p) => ({ ...p })));
      },
      thaw(px: number, pz: number) { frozen.delete(`${px},${pz}`); },
    } as unknown as VillageRead;
    return { village, frozen, freezes: () => freezes };
  }

  function mount() {
    const v = makeVillage();
    const { panel, said } = fakePanel();
    const st = createEditState();
    const host = {
      entries: () => [],
      remove() { }, apply() { },
      village: v.village,
      cellX: CELL, cellZ: CELL,
      surfaceAt: () => 0,
    } as unknown as OverlayHost;
    const hist = createEditHistory(host, st, panel);
    const actions = createActions(host, st, panel, hist);
    st.brushOn = true;
    return { ...v, panel, said, st, hist, actions, host };
  }

  /** 온 세계에 놓인 파츠 수 */
  const total = (frozen: Map<string, PlacedPart[]>) =>
    [...frozen.values()].reduce((n, a) => n + a.length, 0);

  it('한 번 클릭하면 여러 개가 놓인다', () => {
    const m = mount();
    m.st.brushRadius = 6;
    m.st.brushCount = 8;
    m.actions.placePartAt('tree', { x: 0, z: 0 });
    expect(total(m.frozen), '★ 붓이 하나만 놓았다').toBeGreaterThan(1);
    expect(m.said.at(-1)).toMatch(/뿌렸습니다/);
  });

  it('🔴 붓이 꺼져 있으면 하나만 — 두 경로가 갈리는 자리', () => {
    const m = mount();
    m.st.brushOn = false;
    m.actions.placePartAt('tree', { x: 0, z: 0 });
    expect(total(m.frozen)).toBe(1);
  });

  it('🔴 되돌리기가 **한 항목**이다 — 붓질 하나를 무르려고 여러 번 누르지 않는다', () => {
    const m = mount();
    // 파셀 경계에 걸치도록 큰 붓을 셀 모서리에 놓는다.
    m.st.brushRadius = 16;
    m.st.brushCount = 24;
    m.actions.placePartAt('tree', { x: CELL / 2, z: CELL / 2 });
    expect(m.frozen.size, '★ 여러 파셀에 안 걸쳤다 — 이 검사가 아무것도 안 재고 있다')
      .toBeGreaterThan(1);
    expect(m.hist.depth(), '★ 파셀마다 항목이 쌓였다').toBe(1);
    m.hist.undo();
    expect(total(m.frozen), '★ 되돌렸는데 남은 것이 있다').toBe(0);
  });

  it('🔴 파셀 하나당 `freeze` 는 한 번 — 점마다 부르면 그 파셀이 여러 번 다시 지어진다', () => {
    const m = mount();
    m.st.brushRadius = 4;
    m.st.brushCount = 12;
    m.actions.placePartAt('tree', { x: 0, z: 0 });
    expect(m.freezes()).toBe(m.frozen.size);
  });

  it('🔴 다시하기로 되살아난다', () => {
    const m = mount();
    m.actions.placePartAt('tree', { x: 0, z: 0 });
    const n = total(m.frozen);
    m.hist.undo();
    expect(total(m.frozen)).toBe(0);
    m.hist.redo();
    expect(total(m.frozen)).toBe(n);
  });

  it('🔴 파셀 상한을 넘지 않는다 — 넘으면 그 구역이 조용히 덜 그려진다', () => {
    const m = mount();
    m.st.brushRadius = R_MIN;   // 한 파셀에 몰아넣는다
    m.st.brushCount = N_MAX;
    for (let i = 0; i < 12; i += 1) m.actions.placePartAt('tree', { x: 0, z: 0 });
    const cap = maxPartsPerParcel('tree');
    for (const [key, parts] of m.frozen) {
      expect(parts.filter((p) => p.kind === 'tree').length, `★ ${key} 가 상한 ${cap} 을 넘었다`)
        .toBeLessThanOrEqual(cap);
    }
  });

  it('🔴 격자 밖에는 안 놓는다 — 안 그려지는 파셀을 동결시키지 않는다', () => {
    const m = mount();
    m.st.brushRadius = R_MAX;
    m.st.brushCount = N_MAX;
    // 세계 남동쪽 모서리 바깥. 붓 반경이 안쪽으로도 걸치므로 일부는 놓인다.
    m.actions.placePartAt('tree', { x: 15 * CELL, z: 15 * CELL });
    for (const key of m.frozen.keys()) {
      const [px, pz] = key.split(',').map(Number) as [number, number];
      expect(inGrid(px, pz), `★ 격자 밖 파셀 ${key} 을 동결했다`).toBe(true);
    }
  });

  it('🔴 아무것도 못 놓으면 **말한다** — 조용히 끝나면 «가끔 안 먹는다» 가 된다', () => {
    const m = mount();
    // 세계에서 한참 벗어난 자리 — 붓 반경이 격자에 전혀 안 닿는다.
    m.st.brushRadius = R_MIN;
    m.actions.placePartAt('tree', { x: 999 * CELL, z: 999 * CELL });
    expect(m.frozen.size).toBe(0);
    expect(m.said.at(-1), '★ 화면이 침묵했다').toMatch(/놓지 못했습니다|자리가 없습니다/);
    expect(m.hist.depth(), '★ 아무것도 안 했는데 되돌리기가 쌓였다').toBe(0);
  });

  it('🔴 붓질 뒤에도 고른 것이 안 풀린다 — 문지르는 것이 붓의 본질이다', () => {
    const m = mount();
    m.st.pendingPart = 'tree';
    m.actions.placePartAt('tree', { x: 0, z: 0 });
    expect(m.st.pendingPart, '★ 붓인데 한 번 뿌리고 고르기가 풀렸다').toBe('tree');
  });

  it('하나씩 놓기는 종전대로 고르기가 풀린다 — 두 경로가 다른 것이 의도다', () => {
    const m = mount();
    m.st.brushOn = false;
    m.st.pendingPart = 'tree';
    m.actions.placePartAt('tree', { x: 0, z: 0 });
    expect(m.st.pendingPart).toBeNull();
  });

  it('🔴 놓인 것들이 서로 다른 회전·크기를 갖는다 — 변주가 집행까지 도달한다', () => {
    const m = mount();
    m.st.brushRadius = 10;
    m.st.brushCount = N_MAX;
    m.actions.placePartAt('tree', { x: 0, z: 0 });
    const all = [...m.frozen.values()].flat();
    expect(all.length).toBeGreaterThan(3);
    expect(new Set(all.map((p) => Math.round(p.ry * 100))).size,
      '★ 전부 같은 방향이다 — 변주가 `newPart` 기본값에 먹혔다').toBeGreaterThan(1);
    expect(new Set(all.map((p) => Math.round(p.sx * 100))).size,
      '★ 전부 같은 크기다').toBeGreaterThan(1);
  });

  it('마을 문이 없는 화면에서는 말하고 끝낸다', () => {
    const m = mount();
    (m.host as unknown as { village: null }).village = null;
    m.actions.placePartAt('tree', { x: 0, z: 0 });
    expect(m.said.at(-1)).toMatch(/만질 수 없습니다/);
  });
});
