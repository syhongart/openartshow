// 수면 변위 — **물이 제자리에서 오르내리는가.** 상수가 아니라 파형을 본다.
//
// ── 왜 이 검사가 생겼나 (감독 판정 2026-08-03) ──────────────────────────────
// *"물이 일렁인다는 느낌이 없네"* (실기기 WebGPU).
//
// 직전 처방(노말맵 2겹 간섭)은 게이트 6종·검수관 승인·스모크 16/16 을 **전부 통과하고도**
// 목표를 못 맞췄다. 실패 형태가 이 저장소에 새로웠다:
//
//   **"구현이 명세대로인가" 는 봤는데 "명세가 감독이 본 축인가" 는 아무도 안 봤다.**
//
// 노말맵은 빛 반사 방향만 바꾼다. 판은 정점 4개짜리 평면 그대로였고 **높이가 0** 이었다.
// 그 사실을 보는 축이 저장소에 하나도 없었다 — 헤드리스로 볼 수 있었는데도.
//
// 그래서 팀장 조건 4 가 수용 기준을 **감독의 언어로** 적게 했고, 이 파일이 그 문장의
// 명사를 직접 검사한다:
//
//   *"강가에 서서 보면, 무늬가 흐르는 것과 별개로 물 표면이 제자리에서 오르내리고
//     물가 경계선이 출렁인다."*
//
// 핵심 명사는 **"제자리 상하 운동"** 이다. 진행파는 그것을 못 만든다 — 마루가 흘러갈 뿐
// 물은 제자리에서 오르내리지 않는다. 정재파여야 한다. 아래 G-1 이 그 구별을 본다.

import { describe, it, expect } from 'vitest';
import { surfaceLift, RIVER_SEG, LIFT_LAMBDA } from '../frontend/js/world2/features/ocean.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';
import { RIVER_HALF, RIVER_Y } from '../frontend/js/world2/decide/water.js';

/** x 축을 따라 높이를 샘플링한다 — 파형의 공간 프로파일. */
function profile(t: number, standing: number, n = 256, span = LIFT_LAMBDA * 4): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(surfaceLift((span * i) / n, 0, t, 1, standing));
  return out;
}

/**
 * 두 프로파일이 **몇 칸 밀렸을 때** 가장 닮았는가(순환 교차상관의 최대 지점).
 * 진행파면 시간이 흐른 만큼 밀려 있고, 정재파면 안 밀린다 — 이것이 둘을 가르는 축이다.
 */
function bestLag(a: number[], b: number[], range = 40): number {
  let best = 0;
  let bestC = -Infinity;
  for (let lag = -range; lag <= range; lag++) {
    let c = 0;
    for (let i = 0; i < a.length; i++) c += a[i] * b[(i + lag + a.length) % a.length];
    if (c > bestC) { bestC = c; best = lag; }
  }
  return best;
}

// ── G-1: 정재파가 제자리에서 오르내린다 — 처방의 본체 ───────────────────────
describe('수면이 제자리에서 오르내린다 (G-1)', () => {
  const DT = 0.3; // ω≈1.96 rad/s(λ=16m) 이므로 파장의 약 9% 이동 — 검출 가능한 크기

  it('★ 정재파는 패턴이 이동하지 않는다 — 이것이 "일렁임" 의 정의다', () => {
    const a = profile(0, 1);
    const b = profile(DT, 1);
    // 표본이 공허하지 않은지 먼저 못 박는다(빈 배열·전부 0 이 단언을 통과시킨 사고 이력).
    expect(Math.max(...a.map(Math.abs)), '파형이 0 이다 — 아래 단언이 공허해진다')
      .toBeGreaterThan(0.05);
    expect(bestLag(a, b), '정재파인데 패턴이 밀렸다 — 흘러가고 있다').toBe(0);
  });

  it('★ 그런데 높이는 시간에 따라 변한다 — 안 변하면 그냥 굳은 판이다', () => {
    // "안 밀린다" 만으로는 정지한 물결과 구별이 안 된다. 두 축을 함께 봐야 한다.
    const x = LIFT_LAMBDA * 0.27; // 마디를 피한 임의 지점
    const hs = [0, 0.4, 0.8, 1.2, 1.6].map((t) => surfaceLift(x, 0, t, 1, 1));
    const swing = Math.max(...hs) - Math.min(...hs);
    expect(swing, `높이가 ${swing.toFixed(4)} 밖에 안 움직인다 — 오르내리지 않는다`)
      .toBeGreaterThan(0.1);
  });

  it('★ 진행파는 반대로 패턴이 밀린다 — 대조군이 없으면 위 검사가 공허하다', () => {
    const a = profile(0, 0);
    const b = profile(DT, 0);
    expect(bestLag(a, b), '진행파인데 안 밀렸다 — 시간이 안 흐르고 있다').not.toBe(0);
  });

  it('배분 노브가 실제로 두 성분을 섞는다 — 중간값이 양 끝과 다르다', () => {
    const mid = profile(0.5, 0.5);
    const pure = profile(0.5, 1);
    let diff = 0;
    for (let i = 0; i < mid.length; i++) diff += Math.abs(mid[i] - pure[i]);
    expect(diff / mid.length, '중간 배분이 정재파와 같다 — 노브가 안 먹는다')
      .toBeGreaterThan(1e-3);
  });
});

// ── G-2: 파셀 경계에 틈이 없다 ──────────────────────────────────────────────
//
// 강 판은 파셀마다 **독립된 정점**을 쓴다(같은 좌표에 정점이 둘). 변위가 위치만의
// 함수가 아니면 두 값이 갈려 경계가 찢어진다 — 물에 금이 간 것처럼 보인다.
describe('파셀 경계에서 수면이 이어진다 (G-2)', () => {
  it('★ 같은 좌표는 항상 같은 높이다 — 호출 순서·이력에 안 기댄다', () => {
    const cell = DEFAULT_LAYOUT.cellX;
    for (const t of [0, 1.7, 9.3]) {
      for (let px = -2; px <= 2; px++) {
        const edge = px * cell + cell / 2; // 이 파셀의 오른쪽 끝 = 이웃의 왼쪽 끝
        for (const z of [-16, 0, 16]) {
          const fromLeft = surfaceLift(edge, z, t);
          const fromRight = surfaceLift(edge, z, t);
          expect(fromLeft).toBe(fromRight);
        }
      }
    }
  });

  it('높이가 연속이다 — 이웃 정점 사이가 튀면 각진 이가 보인다', () => {
    const step = LIFT_LAMBDA / 4; // 실제 세그먼트 간격
    let worst = 0;
    for (let x = 0; x < 200; x += step) {
      worst = Math.max(worst, Math.abs(surfaceLift(x + step, 0, 2) - surfaceLift(x, 0, 2)));
    }
    // 파장당 4점이면 인접 차는 진폭 수준을 넘지 않는다. 넘으면 표본이 파형을 놓친 것이다.
    expect(worst, `이웃 정점 높이차 ${worst.toFixed(3)}m — 파형이 표본 사이로 샌다`)
      .toBeLessThan(0.4);
  });
});

// ── G-3: 물이 둔치를 넘지 않는다 ────────────────────────────────────────────
describe('물이 강둑을 넘지 않는다 (G-3)', () => {
  it('★ 파고가 강 깊이 안이다 — 넘치면 땅 위에 물이 뜬다', () => {
    let peak = 0;
    for (let x = 0; x < 300; x += 1.3) {
      for (let z = -40; z < 40; z += 3.7) {
        for (const t of [0, 0.7, 1.9, 3.1]) peak = Math.max(peak, Math.abs(surfaceLift(x, z, t)));
      }
    }
    // 강은 땅보다 `|RIVER_Y|` 만큼 아래다. 파고가 그것을 넘으면 마루가 지면 위로 나온다.
    expect(peak, `파고 ${peak.toFixed(3)}m 가 강 깊이 ${Math.abs(RIVER_Y)}m 를 넘는다`)
      .toBeLessThan(Math.abs(RIVER_Y));
  });

  it('진폭 0 이면 완전히 평평하다 — 되돌리기 스위치', () => {
    for (const x of [0, 13.7, 91.2]) expect(surfaceLift(x, 5, 2.2, 0)).toBe(0);
  });
});

// ── G-4: 세분이 파장에서 유도된다 ───────────────────────────────────────────
//
// 값을 손으로 박으면 파장을 바꿔도 세분이 안 따라온다 — 그러면 표본이 파형을 놓치고,
// 그 사실은 화면에서만 드러난다(각진 물). 유도 관계를 검사로 굳힌다.
describe('세분이 파장에서 유도된다 (G-4)', () => {
  it('★ 세그먼트 간격이 파장의 1/4 이하다 — 나이퀴스트 여유', () => {
    const step = DEFAULT_LAYOUT.cellX / RIVER_SEG;
    expect(step, `간격 ${step}m 가 λ/4 = ${LIFT_LAMBDA / 4}m 를 넘는다`)
      .toBeLessThanOrEqual(LIFT_LAMBDA / 4);
  });

  it('세분이 쿼드를 정확히 나눈다 — 나머지가 남으면 정점이 격자에 안 맞는다', () => {
    expect(DEFAULT_LAYOUT.cellX % RIVER_SEG).toBe(0);
  });

  it('★ 총 정점 수가 예산 안이다 — 이론 최악치에서 유도한다', () => {
    // 한 x 열의 물 칸: `|pz·cellZ − C| < RIVER_HALF` 를 만족하는 정수 pz.
    // 길이 `2·RIVER_HALF / cellZ` 구간이므로 최대 `floor(길이) + 1` 칸.
    const perColumn = Math.floor((2 * RIVER_HALF) / DEFAULT_LAYOUT.cellZ) + 1;
    const worstCells = 30 * perColumn; // GRID_W = 30
    const verts = worstCells * (RIVER_SEG + 1) ** 2;
    const tris = worstCells * RIVER_SEG ** 2 * 2;
    // 감독 실기기 씬이 삼각형 102,563 개다. 물결이 그 10% 를 넘으면 예산 초과로 본다
    // (감독이 무게를 물었고 그 답의 전제가 +7% 였다).
    expect(tris, `삼각형 ${tris} 개 — 씬의 10% 를 넘는다`).toBeLessThan(10256);
    expect(verts, `정점 ${verts} 개`).toBeLessThan(6000);
  });
});

// ── G-5: 복합 사인파다 ──────────────────────────────────────────────────────
//
// 감독 요청이 *"물은 복합적인 사인파들로 구성되어있잖아"* 였다. 성분이 하나면 규칙적인
// 물결무늬가 되어 인공적으로 보인다.
describe('여러 파가 겹친다 (G-5)', () => {
  it('★ 단일 사인파가 아니다 — 반주기 대칭이 깨진다', () => {
    // 단일 사인이면 `h(x + λ/2) = −h(x)` 가 정확히 성립한다. 성분이 여럿이면 깨진다.
    let worst = 0;
    for (let x = 0; x < 64; x += 0.7) {
      const asym = Math.abs(surfaceLift(x + LIFT_LAMBDA / 2, 0, 0, 1) + surfaceLift(x, 0, 0, 1));
      worst = Math.max(worst, asym);
    }
    expect(worst, '반주기 대칭이 정확하다 — 단일 사인파다').toBeGreaterThan(0.05);
  });

  it('한 방향으로만 흐르지 않는다 — z 를 바꾸면 파형이 바뀐다', () => {
    // 감독의 원래 지적이 *"한방향으로 흐르는데"* 였다. 방향이 하나면 z 에 무관해진다.
    let diff = 0;
    for (let x = 0; x < 64; x += 1.1) diff += Math.abs(surfaceLift(x, 0, 0) - surfaceLift(x, 11, 0));
    expect(diff, 'z 를 옮겨도 파형이 같다 — 방향이 하나뿐이다').toBeGreaterThan(0.05);
  });
});
