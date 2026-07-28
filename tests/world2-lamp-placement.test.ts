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
import { specFor } from '../frontend/js/world2/parts/index.js';
import {
  roadDirs, onRoad, edgeX, edgeZ, ROAD_HALF, SETBACK, LAMP_CLEARANCE,
} from '../frontend/js/world2/parts/road-topology.js';

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

/**
 * 세계좌표 `want` 근처의 가로등 수. 경계를 사이에 둔 **두 파셀 모두**에서 센다 —
 * 누가 그 자리를 만드는지가 검사 대상이 아니라, 결과가 맞는지가 대상이기 때문이다.
 */
function countLampsNear(px: number, pz: number, want: { x: number; z: number }): number {
  let n = 0;
  for (const dx of [0, 1, -1]) {
    for (const dz of [0, 1, -1]) {
      for (const p of worldLamps(px + dx, pz + dz)) {
        if (Math.hypot(p.x - want.x, p.z - want.z) < 1e-6) n++;
      }
    }
  }
  return n;
}

function hasLampNear(px: number, pz: number, want: { x: number; z: number }): boolean {
  return countLampsNear(px, pz, want) > 0;
}

describe('가로등은 도로를 따라간다 — 나무처럼 심지 않는다', () => {
  // ── 왜 파셀 단위로 세지 않는가 ─────────────────────────────────────────────
  // 가로등이 **파셀 경계 위**로 옮겨 가면서, 한 경계의 가로등을 두 파셀 중 **하나만**
  // 만든다(양쪽이 만들면 겹친다). 그래서 파셀 하나만 보면 `west` 만 있는 파셀은 0대이고
  // 그것이 정상이다 — 파셀당 개수는 이제 성질이 아니다.
  //
  // 진짜 성질은 경계 쪽에 있다: **길이 지나는 모든 경계에 가로등 한 쌍이 있다.** 이것을
  // 세계좌표에서 확인하면 소유 규칙(누가 만드느냐)과 무관하게 결과만 본다.
  it('길이 지나는 모든 경계에 가로등이 양옆 한 쌍씩 있다', () => {
    const missing: string[] = [];
    for (const [px, pz] of RANGE) {
      // 동서 방향 경계 — 파셀 (px,pz) 와 (px+1,pz) 사이. 세계 x 는 파셀 중심 + 반셀.
      if (edgeX(px, pz)) {
        const wx = px * CELL_X + CELL_X / 2;
        for (const s of [1, -1]) {
          const want = { x: wx, z: pz * CELL_Z + s * LAMP_OFFSET };
          if (!hasLampNear(px, pz, want)) missing.push(`edgeX(${px},${pz}) ${s > 0 ? '+' : '−'}쪽`);
        }
      }
      if (edgeZ(px, pz)) {
        const wz = pz * CELL_Z + CELL_Z / 2;
        for (const s of [1, -1]) {
          const want = { x: px * CELL_X + s * LAMP_OFFSET, z: wz };
          if (!hasLampNear(px, pz, want)) missing.push(`edgeZ(${px},${pz}) ${s > 0 ? '+' : '−'}쪽`);
        }
      }
    }
    expect(missing.slice(0, 12), `빈 자리 ${missing.length}건`).toEqual([]);
  });

  it('한 자리에 두 대가 겹치지 않는다 — 경계를 양쪽이 만들면 그렇게 된다', () => {
    // 위 검사는 "있는가"만 본다. 양쪽 파셀이 같은 경계를 각자 만들면 **같은 좌표에
    // 두 대**가 서고, 그래도 위 검사는 통과한다. 개수를 함께 봐야 한다.
    const dup: string[] = [];
    for (const [px, pz] of RANGE) {
      if (!edgeX(px, pz)) continue;
      const wx = px * CELL_X + CELL_X / 2;
      for (const s of [1, -1]) {
        const want = { x: wx, z: pz * CELL_Z + s * LAMP_OFFSET };
        const n = countLampsNear(px, pz, want);
        if (n !== 1) dup.push(`edgeX(${px},${pz}) ${s > 0 ? '+' : '−'}쪽 ${n}대`);
      }
    }
    expect(dup.slice(0, 12), `중복 ${dup.length}건`).toEqual([]);
  });

  it('한 쌍으로 보일 만큼 붙은 것이 없다 (감독: "2개 한쌍처럼 보이지?")', () => {
    // 이 검사가 이 변경의 본체다. 개수를 세는 것만으로는 **붙어 있는지**를 못 본다.
    //
    // ── 임계를 유도한다 (검수관 권고) ──────────────────────────────────────
    // 처음엔 4m 를 적어 뒀다. 그러면 붙음이 4~13m 로 **좁아지는** 회귀는 그대로
    // 통과한다 — "실측에 여유를 얹은 값은 근거가 아니다" 에 정확히 걸린다.
    //
    // 최솟값은 유도된다. 한 경계의 양옆 두 대가 인도 폭만큼 떨어져 있으므로
    // `2 × LAMP_OFFSET` 이고, 서로 다른 축의 두 대는 `9.75 × √2 = 13.8m` 로 더 멀다.
    // 그러니 이 값이 곧 도달 가능한 최솟값이다 — 인도 폭을 바꾸면 임계도 따라온다.
    const minGap = 2 * LAMP_OFFSET;
    for (const [px, pz] of RANGE) {
      const lamps = lampsAt(px, pz);
      for (let i = 0; i < lamps.length; i++) {
        for (let j = i + 1; j < lamps.length; j++) {
          const d = Math.hypot(lamps[i].x - lamps[j].x, lamps[i].z - lamps[j].z);
          expect(d, `(${px},${pz}) ${i}×${j}`).toBeGreaterThanOrEqual(minGap - 1e-9);
        }
      }
    }
  });

  it('한 방향의 두 대가 길을 사이에 두고 마주 본다', () => {
    // 양옆이라는 것은 **인도 좌표의 부호가 갈린다**는 뜻이다. 둘 다 같은 쪽이면
    // 개수만 늘고 여전히 한 줄이다.
    for (const [px, pz] of RANGE) {
      const lamps = lampsAt(px, pz);
      if (lamps.length === 0) continue;
      // 인도 축 값(±LAMP_OFFSET)만 모아 부호를 센다
      const sides = lamps.map((p) => (Math.abs(Math.abs(p.x) - LAMP_OFFSET) < 1e-9 ? p.x : p.z));
      expect(sides.some((v) => v > 0), `(${px},${pz}) +쪽 없음`).toBe(true);
      expect(sides.some((v) => v < 0), `(${px},${pz}) -쪽 없음`).toBe(true);
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

  // ── 이 검사가 바뀐 이유를 적어 둔다 ────────────────────────────────────────
  // 예전에는 `|x| < cellX/2` 를 요구했다 — "파셀 밖으로 나가지 마라". 가로등이 경계
  // **위**로 옮겨 가면서 그 조건은 정의상 실패한다.
  //
  // 그런데 그 조건은 원래 목적의 **대리 지표**였다. 진짜 목적은 "이웃 파셀 물건과
  // 겹치지 마라"이고, 경계 안에 있으면 그것이 보장되니 값싼 조건으로 대신 본 것이다.
  // 대리 지표가 안 맞게 됐으면 **목적을 직접 재야지**, 조건을 느슨하게 풀 일이 아니다.
  //
  // 파셀 반폭이 `cellX/2 − margin` = 13.5m 라 경계(16m)와의 사이 2.5m 는 어느 파셀의
  // 파츠도 들어오지 않는 땅이다. 그 여유가 실제로 있는지를 여기서 전수로 확인한다 —
  // `margin` 이 줄면 이 검사가 먼저 깨진다.
  it('이웃 파셀 물건과 겹치지 않는다 — 경계 위에 서게 됐으니 직접 잰다', () => {
    const bad: string[] = [];
    for (const [px, pz] of RANGE) {
      const lamps = worldLamps(px, pz);
      if (lamps.length === 0) continue;
      for (const dx of [-1, 0, 1]) {
        for (const dz of [-1, 0, 1]) {
          for (const t of ['near', 'mid', 'far'] as const) {
            for (const q of parcelLayout(px + dx, pz + dz, t)) {
              if (q.kind === 'lamp') continue;
              const r = specFor(q.kind)?.footprint(q) ?? 0;
              if (r <= 0) continue;             // 평면은 겹침 개념이 없다
              const qx = (px + dx) * CELL_X + q.x;
              const qz = (pz + dz) * CELL_Z + q.z;
              for (const L of lamps) {
                const gap = Math.hypot(L.x - qx, L.z - qz) - (r + LAMP_CLEARANCE);
                if (gap < -1e-9) {
                  bad.push(`(${px},${pz})의 등 × (${px + dx},${pz + dz},${t}) ${q.kind} ${(-gap).toFixed(2)}m`);
                }
              }
            }
          }
        }
      }
    }
    expect(bad.slice(0, 12), `겹침 ${bad.length}건`).toEqual([]);
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
  it('인도 폭이 언제나 같다 — 어느 쪽이든 도로에서 같은 거리다', () => {
    // 예전 규칙은 *"비키는 쪽이 언제나 같다"*(한쪽만)였다. 이제 양옆이므로 검사할
    // 것은 **부호가 아니라 거리**다 — 두 줄이 각각 도로에서 같은 만큼 떨어져야
    // 마주 본 두 줄로 읽힌다. 거리가 들쭉날쭉하면 그게 "나무처럼" 이다.
    for (const [px, pz] of RANGE) {
      for (const p of lampsAt(px, pz)) {
        const side = Math.abs(Math.abs(p.x) - LAMP_OFFSET) < 1e-9 ? p.x : p.z;
        expect(Math.abs(side)).toBeCloseTo(LAMP_OFFSET, 9);
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
    let base = 0;
    for (let pz = -3; pz <= 3; pz++) {
      const xs = row(pz * CELL_Z + LAMP_OFFSET, 'x', PXS, pz);
      for (let i = 1; i < xs.length; i++) {
        const gap = xs[i] - xs[i - 1];
        expect(gap / step).toBeCloseTo(Math.round(gap / step), 6);
        // ── 기본 간격이 셀 하나(32m)가 됐다 ──────────────────────────────
        // 예전에는 16m 였다. 교차로 모서리에서 한 대만 서게 되면서(감독: *"왜 2개
        // 한쌍처럼 보이지?"*) 사거리 파셀이 이 인도선에 한 대만 내놓는다.
        //
        // **줄어든 것이 맞다.** 실제 가로등 간격은 25~30m 이고 16m 는 오히려 촘촘
        // 했다. 실측 분포도 32m 가 66회로 지배적이다(16m 13 · 64m 5).
        if (Math.abs(gap - CELL_X) < 1e-9) base++;
      }
    }
    // 전부 정수배인데 기본 간격이 드물면 "줄"이 아니라 띄엄띄엄 흩어진 것이다.
    expect(base).toBeGreaterThan(20);
  });

  it('남북 도로선을 따라 간격이 셀 절반의 정수배다', () => {
    const step = CELL_Z / 2;
    let exact = 0;
    for (let px = -3; px <= 3; px++) {
      const zs = row(px * CELL_X + LAMP_OFFSET, 'z', PXS, px);
      for (let i = 1; i < zs.length; i++) {
        const gap = zs[i] - zs[i - 1];
        expect(gap / step).toBeCloseTo(Math.round(gap / step), 6);
        // 동서선과 같은 이유로 기본 간격이 셀 하나다(위 주석 참고).
        if (Math.abs(gap - CELL_Z) < 1e-9) exact++;
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
