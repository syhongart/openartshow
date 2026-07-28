// 가로등 배치 — **줄이 맞는가.**
//
// ── 감독 지적에서 생겼다 ────────────────────────────────────────────────────
// *"아니 무슨 가로등을 나무처럼 심어 놨어."*
//
// 그때까지 가로등은 나무·벤치와 똑같은 `pickOffRoad` 를 썼다. 길만 피하고 사분면 안
// 아무 데나 뽑는 함수다. 나무는 그래야 맞지만 가로등은 길을 밝히는 물건이라 정원
// 한가운데 서면 용도를 잃는다.
//
// ── 왜 기존 테스트가 못 잡았나 ──────────────────────────────────────────────
// `world2-parcel-layout-golden.test.ts` 는 좌표가 **변하지 않는지**만 본다(결정론).
// 좌표가 틀린 자리를 결정론적으로 가리켜도 통과한다. `world2-parts-assets.test.ts` 는
// 지오·재질만 본다. 즉 "이 좌표가 **말이 되는 자리인가**" 를 보는 검사가 없었다.
//
// 배치 검사는 골든과 다르다 — 골든은 *바뀌었나*를 묻고, 이 파일은 *맞나*를 묻는다.
//
// ── 무엇을 보는가 ───────────────────────────────────────────────────────────
// 파셀 하나만 보면 "인도 위에 있다" 까지밖에 못 본다. 나무처럼 심긴 모습의 정체는
// **이웃 파셀과 줄이 안 맞는 것**이므로, 경계를 사이에 둔 두 파셀을 세계좌표로 함께
// 놓고 봐야 한다. 그래서 이 파일의 검사는 대부분 파셀 쌍을 본다.

import { describe, it, expect } from 'vitest';
import { parcelLayout, DEFAULT_LAYOUT, type PlacedPart } from '../frontend/js/world2/decide/parcel-layout.js';
import { LAMP_OFFSET } from '../frontend/js/world2/parts/lamp.js';
import { roadDirs, onRoad, ROAD_HALF, SETBACK } from '../frontend/js/world2/parts/road-topology.js';

const { cellX: CELL_X, cellZ: CELL_Z } = DEFAULT_LAYOUT;

/** 파셀의 가로등만. 좌표는 파셀 중심 기준 오프셋이다 */
function lampsAt(px: number, pz: number): PlacedPart[] {
  return parcelLayout(px, pz, 'near').filter((p) => p.kind === 'lamp');
}

/** 세계좌표로 옮긴 가로등 */
function worldLamps(px: number, pz: number) {
  return lampsAt(px, pz).map((p) => ({ x: px * CELL_X + p.x, z: pz * CELL_Z + p.z }));
}

/** 검사 범위 — 슈퍼셀 병합 패턴 다섯 가지가 모두 나오도록 넓게 잡는다 */
const RANGE: [number, number][] = [];
for (let px = -6; px <= 6; px++) for (let pz = -6; pz <= 6; pz++) RANGE.push([px, pz]);

describe('가로등은 도로를 따라간다 — 나무처럼 심지 않는다', () => {
  it('개수가 도로 방향 수와 정확히 같다', () => {
    for (const [px, pz] of RANGE) {
      expect(lampsAt(px, pz).length).toBe(roadDirs(px, pz).length);
    }
  });

  it('길이 없는 파셀에는 한 대도 없다 — 밝힐 길이 없다', () => {
    const noRoad = RANGE.filter(([px, pz]) => roadDirs(px, pz).length === 0);
    for (const [px, pz] of noRoad) expect(lampsAt(px, pz)).toEqual([]);
  });

  it('차도 위에 서지 않는다 — 길 한복판의 가로등은 장애물이다', () => {
    for (const [px, pz] of RANGE) {
      const dirs = roadDirs(px, pz);
      for (const p of lampsAt(px, pz)) expect(onRoad(p.x, p.z, dirs)).toBe(false);
    }
  });

  // 이 검사가 "정원 한가운데" 를 잡는다. 차도를 피하기만 하면 사분면 끝(13.5m)도
  // 통과하므로, **위**로도 막아야 한다.
  it('인도 안에 있다 — 차도 끝과 건물 셋백 사이', () => {
    for (const [px, pz] of RANGE) {
      for (const p of lampsAt(px, pz)) {
        // 두 축 중 하나는 도로 축을 따르고(그 값은 자유), 다른 하나가 인도 폭이다.
        const side = Math.min(Math.abs(p.x), Math.abs(p.z));
        expect(side).toBeGreaterThanOrEqual(ROAD_HALF);
        expect(side).toBeLessThanOrEqual(SETBACK);
      }
    }
  });

  it('파셀 밖으로 나가지 않는다 — 이웃 파셀 땅에 서면 언로드 때 함께 사라진다', () => {
    const halfX = CELL_X / 2, halfZ = CELL_Z / 2;
    for (const [px, pz] of RANGE) {
      for (const p of lampsAt(px, pz)) {
        expect(Math.abs(p.x)).toBeLessThan(halfX);
        expect(Math.abs(p.z)).toBeLessThan(halfZ);
      }
    }
  });
});

// ── 줄 맞춤 — 감독 지적의 본체 ─────────────────────────────────────────────
// 한 파셀만 보면 전부 통과하는데도 걸어 보면 가로등이 길 이쪽저쪽으로 옮겨 다닐 수
// 있다. "진행 방향의 오른쪽" 같은 규칙이 그렇다 — east 와 west 가 **같은 도로선의
// 반대편**을 고르기 때문이다. 그래서 경계를 공유하는 두 파셀을 함께 본다.
describe('이웃 파셀과 줄이 이어진다', () => {
  // 방향을 구현과 같은 방식으로 판별하지 않는다 — 그러면 테스트가 구현을 베낀 것이라
  // 같이 틀린다. 대신 **도로선 하나를 따라 훑는다**: 인도 쪽 좌표를 고정해 놓고 그 선
  // 위에 있는 가로등을 전부 모은다. 줄이 안 맞으면 애초에 이 선에 걸리지 않는다.
  it('옆으로 비키는 쪽이 언제나 같다 — 길 건너로 옮겨 다니지 않는다', () => {
    for (const [px, pz] of RANGE) {
      for (const p of lampsAt(px, pz)) {
        // 두 축 중 하나가 인도 폭이다. 그 값의 **부호**가 갈리면 도로 하나를 두고
        // 가로등이 양쪽에 번갈아 서서, 걸을 때 길 건너로 옮겨 다니는 것처럼 보인다.
        // ("진행 방향의 오른쪽" 규칙이 정확히 이 결과를 낸다.)
        const side = Math.abs(p.x) === LAMP_OFFSET ? p.x : p.z;
        expect(side).toBe(LAMP_OFFSET);
      }
    }
  });

  /** 인도선 하나 위의 가로등 좌표를 축 방향으로 정렬해 돌려준다 */
  function row(fixed: number, along: 'x' | 'z', pxs: number[], pz: number): number[] {
    const out: number[] = [];
    for (const px of pxs) {
      const cell = along === 'x' ? [px, pz] : [pz, px];
      for (const p of worldLamps(cell[0], cell[1])) {
        const side = along === 'x' ? p.z : p.x;
        if (Math.abs(side - fixed) < 1e-9) out.push(along === 'x' ? p.x : p.z);
      }
    }
    return out.sort((a, b) => a - b);
  }

  const PXS = [-3, -2, -1, 0, 1, 2, 3];

  // 간격이 균등해야 "줄지어" 보인다. 축 방향 거리를 반폭에서 뽑으면(`halfX/2`) 파셀
  // 경계를 넘는 순간 18.5m 와 13.5m 가 번갈아 나온다 — 실제로 처음에 그렇게 짰다.
  //
  // 병합된 블록에서는 경계가 꺼져 가로등이 통째로 빠지므로 그 자리는 간격이 벌어진다.
  // 그래서 등간격이 아니라 **기본 간격의 정수배**를 요구한다 — 빠진 것과 어긋난 것은
  // 다르다.
  it('동서 도로선을 따라 간격이 셀 절반의 정수배다', () => {
    const step = CELL_X / 2;
    let exact = 0;
    for (let pz = -3; pz <= 3; pz++) {
      const xs = row(pz * CELL_Z + LAMP_OFFSET, 'x', PXS, pz);
      for (let i = 1; i < xs.length; i++) {
        const gap = xs[i] - xs[i - 1];
        expect(gap / step).toBeCloseTo(Math.round(gap / step), 6);
        if (Math.abs(gap - step) < 1e-9) exact++;
      }
    }
    // 전부 정수배인데 하나도 기본 간격이 아니면 "줄"이 아니라 띄엄띄엄 흩어진 것이다.
    expect(exact).toBeGreaterThan(20);
  });

  it('남북 도로선을 따라 간격이 셀 절반의 정수배다', () => {
    const step = CELL_Z / 2;
    let exact = 0;
    for (let px = -3; px <= 3; px++) {
      const zs = row(px * CELL_X + LAMP_OFFSET, 'z', PXS, px);
      for (let i = 1; i < zs.length; i++) {
        const gap = zs[i] - zs[i - 1];
        expect(gap / step).toBeCloseTo(Math.round(gap / step), 6);
        if (Math.abs(gap - step) < 1e-9) exact++;
      }
    }
    expect(exact).toBeGreaterThan(20);
  });
});

describe('LAMP_OFFSET 은 인도에서 유도된다', () => {
  // 6.25 를 직접 적어 두면 인도 폭을 조정할 때 가로등만 옛 자리에 남는다(값 미러링).
  it('차도 끝과 셋백의 중점이다', () => {
    expect(LAMP_OFFSET).toBe((ROAD_HALF + SETBACK) / 2);
    expect(LAMP_OFFSET).toBeGreaterThan(ROAD_HALF);
    expect(LAMP_OFFSET).toBeLessThan(SETBACK);
  });
});
