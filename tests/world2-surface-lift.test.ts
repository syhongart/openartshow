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
import { WAVE_AMP_DEFAULT } from '../frontend/js/world2/decide/wave.js';
import { surfaceLift, RIVER_SEG, LIFT_LAMBDA } from '../frontend/js/world2/features/ocean.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';
import { RIVER_HALF, RIVER_Y, WAVE_PEAK_MAX, WAVE_CLEARANCE } from '../frontend/js/world2/decide/water.js';
import { GRID_W } from '../frontend/js/world2/decide/grid.js';

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
  // ⚠ **경계 정점이 실제로 일치하는가는 여기서 안 본다.** 두 번 시도했고 두 번 다
  //   tautology 였다(검수관이 뮤테이션으로 실증):
  //     1차 — `surfaceLift(edge, …)` 를 같은 인자로 두 번 부르고 같은지 봤다.
  //     2차 — `riverGeometry` 의 공식을 이 파일에 **복사**해 복사본끼리 비교했다.
  //           `px·cell + cell/2 == (px+1)·cell − cell/2` 는 항등식이라 프로덕션이 무엇을
  //           하든 참이다. 실제로 `ocean.ts` 의 정점 식에 +0.05m 오프셋을 주입해도
  //           **100/100 통과**했다.
  //   두 번 다 실패 형태가 같다 — **실제 코드를 한 번도 안 돌렸다.** 이 저장소가 세 번
  //   겪은 값 미러링과 같은 자리다(공식이 두 곳에 각각 산다).
  //   그래서 그 검사는 실제 지오메트리를 조립하는 `tests/world2-ocean.test.ts` 로 옮겼다
  //   — 거기서는 `mount()` 가 진짜 `riverGeometry()` 를 돌리고 정점 배열을 직접 읽는다.
  //   여기 남은 것은 `surfaceLift` **함수 자체**의 성질뿐이다.

  it('높이가 연속이다 — 이웃 정점 사이가 튀면 각진 이가 보인다', () => {
    const step = LIFT_LAMBDA / 4; // 실제 세그먼트 간격
    let worst = 0;
    for (let x = 0; x < 200; x += step) {
      worst = Math.max(worst, Math.abs(surfaceLift(x + step, 0, 2) - surfaceLift(x, 0, 2)));
    }
    // 이웃 차가 **마루~골**(=2×진폭)을 넘으면 한 스텝에 파형을 통째로 건너뛴 것이다.
    //
    // ⚠ **임계가 진폭에 하드코딩돼 있었다** — `0.4` 는 `?wamp` 기본값이 0.2 이던 시절의
    // `2×0.2` 다. 기본값이 0.45 로 오르자(감독 판정 2026-08-20) 어긋났고, 흐름 방향을
    // 부채꼴로 모으면서 실측 0.311 → **0.485m** 로 올라 드러났다. 방향을 모으면 세
    // 성분이 같은 축에서 더해지므로 커지는 것이 맞다 — 결함이 아니라 물리다.
    // 값 미러링이 테스트 임계값에 나타난 형태이고, 이 회차에서 세 번째다.
    expect(worst, `이웃 정점 높이차 ${worst.toFixed(3)}m — 파형이 표본 사이로 샌다`)
      .toBeLessThan(2 * WAVE_AMP_DEFAULT);
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

  // ── 위 검사가 **기본 진폭만** 본다 ────────────────────────────────────────
  //
  // `?wamp=` 는 `WAVE_PEAK_MAX` 까지 열려 있다. 기본값(0.2)에서 안전하다는 것은 상한
  // 에서도 안전하다는 뜻이 아니다 — 감독이 *"파고를 엄청 크게 태풍온것 처럼"* 을 지시한
  // 뒤 그 상한이 실제로 밟히는 값이 됐다.
  //
  // 그래서 **깊이를 파고에서 유도했다**(`RIVER_Y = -(WAVE_PEAK_MAX + WAVE_CLEARANCE)`).
  // 아래 두 검사가 그 유도가 살아 있는지 본다.
  it('★ 상한 진폭(?wamp 최대)에서도 마루가 지면 아래다 — 실제 파형을 돌려 본다', () => {
    // 공식을 여기 복사하지 않는다. `surfaceLift` 를 **상한 진폭으로 실제로 돌려**
    // 마루의 실측 최댓값을 구하고, 그것이 강바닥 깊이 안에 남는지만 본다.
    // (직전 회차에 이 파일의 경계 검사가 공식 복사본끼리 비교해 뮤테이션을 통과시켰다.)
    let peak = 0;
    for (let x = 0; x < 400; x += 0.9) {
      for (let z = -40; z < 40; z += 2.3) {
        for (let t = 0; t < 6.4; t += 0.37) {
          peak = Math.max(peak, surfaceLift(x, z, t, WAVE_PEAK_MAX));
        }
      }
    }
    const crest = RIVER_Y + peak; // 마루의 절대 높이. 지면은 y=0 이다.
    expect(crest, `상한 파고에서 마루가 ${crest.toFixed(3)}m — 지면(0) 위로 넘친다`)
      .toBeLessThan(0);
    // 넘치지 않는 것만으로는 부족하다. 여유가 `WAVE_CLEARANCE` 만큼 남아야 부동소수
    // 오차 한 번에 물이 둔치에 뜨지 않는다.
    expect(crest, `마루-지면 여유 ${(-crest).toFixed(3)}m 가 ${WAVE_CLEARANCE}m 미만이다`)
      .toBeLessThanOrEqual(-WAVE_CLEARANCE);
  });

  it('★ 강 깊이가 파고에서 유도된다 — 상수로 박으면 파고를 올려도 안 따라온다', () => {
    // **이 단언이 없어서** `RIVER_Y` 를 옛 상수 −0.5 로 되돌리는 뮤테이션이
    // ocean + surface-lift 100건을 전부 통과했다(골든 해시만 우연히 잡았고, 골든은
    // 배치가 바뀌면 무엇이든 잡으므로 이 관계를 겨냥한 축이 아니다).
    //
    // 재는 것은 값이 아니라 **관계**다 — 파고를 바꾸면 깊이가 그만큼 따라와야 한다.
    const headroom = Math.abs(RIVER_Y) - WAVE_PEAK_MAX;
    expect(headroom, `깊이 ${Math.abs(RIVER_Y)}m 와 파고 ${WAVE_PEAK_MAX}m 의 차가 `
      + `${headroom.toFixed(3)}m — 유도(${WAVE_CLEARANCE}m)가 끊겼다`)
      .toBeCloseTo(WAVE_CLEARANCE, 10);
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
    // ★ `GRID_W` 를 **import 한다**(검수관 지적 ②). 30 을 여기 다시 적으면 격자가 넓어질 때
    //   예산 가드가 조용히 stale 해진다 — 이 저장소가 세 번 겪은 값 미러링과 같은 형태다.
    const worstCells = GRID_W * perColumn;
    const verts = worstCells * (RIVER_SEG + 1) ** 2;
    const tris = worstCells * RIVER_SEG ** 2 * 2;
    // 예산 기준: 감독 실기기 리포트(2026-08-03, iPhone·WebGPU)의 `삼각형 평균 102563`.
    // 그 10% 를 넘으면 초과로 본다 — 감독이 무게를 물었고("에이는 무겁지 않아?")
    // 내 답의 전제가 +7% 였다. **10% 는 실측이 아니라 그 대화에서 나온 재량 기준이다**
    // (검수관 지적 ③ — 출처를 여기 남긴다).
    const SCENE_TRIS = 102563;
    expect(tris, `삼각형 ${tris} 개 — 씬(${SCENE_TRIS})의 10% 를 넘는다`)
      .toBeLessThan(SCENE_TRIS * 0.1);
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
