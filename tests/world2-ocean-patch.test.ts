// tests/world2-ocean-patch.test.ts — 바다 정점 파동 패치의 **경계**를 셀 수 있게 박는다.
//
// 팀장 판정 A(2026-08-05) 의 조건 1 이 요구한 것이 이 파일이다:
//   *"정점 수가 4,860(강 이론 최악치)을 넘는 far 에 도달하면 구현 재판정(팀장 재상정).
//     가능하면 테스트로 셀 수 있게 하라. 이것이 A 의 경계다 — 안 적으면 #202 때 같은
//     고리를 또 돈다."*
//
// **경계도 판정이다**(CLAUDE.md 의사결정 사이클 5). 주석에만 적으면 #202 가 안개를
// 미는 날 아무도 안 읽는다 — 그때 이 테스트가 빨간불로 말한다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SEA_PATCH_METRICS, peakOf, surfaceLift, LIFT_LAMBDA, RIVER_SEG,
  patchVertexY, PATCH_SEP,
} from '../frontend/js/world2/features/ocean.js';
import { fogBand } from '../frontend/js/world2/decide/fog.js';
import { GRID_W } from '../frontend/js/world2/decide/grid.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';

describe('바다 패치 — 예산 경계 (팀장 조건 1)', () => {
  it('정점 수가 강 판의 이론 최악치를 넘지 않는다', () => {
    // ⚠ 이 단언이 깨졌다면 값을 고치지 말고 **팀장에게 재상정하라.**
    // 패치가 강보다 무거워졌다는 뜻이고, 그것이 A 안을 고른 근거였다.
    expect(SEA_PATCH_METRICS.vertices).toBeLessThanOrEqual(SEA_PATCH_METRICS.riverWorstVertices);
  });

  it('★ 스냅 최악에서도 안개 far 를 덮는다 — 이 단언이 검수관 BL-2 다', () => {
    const far = fogBand(DEFAULT_LAYOUT.cellX).far;
    // ⚠ 처음엔 `span/2 >= far` 로 적었다. **패치가 항상 플레이어 중심일 때만 참이다.**
    // 패치는 `SNAP` 단위로만 움직이므로 플레이어는 중심에서 최대 `SNAP/2` 어긋나고,
    // 그때 보장되는 반경은 `span/2 − snap/2` 다. 그 차이(12.08m)가 **가시 47%** 지점이라
    // 울렁이는 물과 평평한 물의 경계가 눈에 보였다.
    const worst = SEA_PATCH_METRICS.span / 2 - SEA_PATCH_METRICS.snap / 2;
    expect(worst).toBeGreaterThanOrEqual(far);
  });

  it('세그먼트 간격이 λ/4 이하다 — 나이퀴스트 여유', () => {
    const spacing = SEA_PATCH_METRICS.span / SEA_PATCH_METRICS.seg;
    expect(spacing).toBeLessThanOrEqual(LIFT_LAMBDA / 4);
  });

  // ⚠ 여기 *"스냅 단위가 span 을 정수로 나눈다"* 단언이 있었다. **항상 참이었다**
  // (검수관 G6). `SPAN = TILES × LAYER2_TILE_M` · `SNAP = LAYER2_TILE_M` 이므로
  // `span/snap = TILES` 이고 `TILES` 는 `Math.ceil` 결과다 — 구조상 정수일 수밖에 없다.
  // 검수관이 뮤테이션으로 실증했다: `LAYER2_TILE_M` 을 텍스처 유도에서 완전히 떼어내도
  // **12/12 통과.** 무늬가 실제로 어긋나는 것을 이 단언은 못 본다.
  //
  // 진짜 불변식은 "**스냅 보폭이 실제 월드 무늬 크기의 정수배인가**" 이고, 그것은
  // 지오 UV 와 텍스처 `repeat` 를 **함께** 읽어야 판정된다. `tests/world2-ocean.test.ts`
  // 의 G5 로 옮겼다 — 거기서는 mount 후 실제 객체를 읽으므로 발화한다.
  //
  // 교훈: 상수끼리 비교하는 단언은 유도 관계를 재확인할 뿐 **집행을 안 본다.**

  it('상한 기준값이 유도식과 일치한다', () => {
    const derived = GRID_W * 2 * (RIVER_SEG + 1) ** 2;
    expect(SEA_PATCH_METRICS.riverWorstVertices).toBe(derived);
  });

  it('★ 상한 기준값이 **리터럴이 아니다** — 값 비교로는 못 잡는다 (검수관 BL-4)', () => {
    // ── 왜 소스를 읽는가 (뮤테이션 실측 2026-08-05) ────────────────────────
    // 위 검사만 두고 `RIVER_WORST_VERTICES` 를 `4860` 리터럴로 되돌리는 뮤테이션을
    // 돌렸더니 **111건 전부 통과했다.** 당연하다 — 지금 유도값이 정확히 4860 이라
    // 두 판본이 **같은 값**이고, 값을 비교하는 한 구별할 수단이 없다.
    //
    // 구별되는 것은 "`RIVER_SEG` 가 바뀌면 따라오는가" 인데 그것은 모듈 상수라
    // 런타임에 흔들 수 없다. 그래서 **축을 바꾼다** — 소스에 유도식이 살아 있는지 본다.
    // 검사가 닿지 않는 범위를 값으로 우기지 않는다.
    const src = readFileSync(
      join(import.meta.dirname, '..', 'frontend/js/world2/features/ocean.ts'), 'utf8',
    );
    const m = src.match(/const RIVER_WORST_VERTICES\s*=\s*([^;]+);/);
    expect(m, 'RIVER_WORST_VERTICES 정의를 못 찾았다 — 이 검사가 무효다').not.toBeNull();
    const expr = m![1];
    expect(/\bGRID_W\b/.test(expr), '격자 폭을 안 참조한다 — 리터럴로 되돌아갔다').toBe(true);
    expect(/\bRIVER_SEG\b/.test(expr), '강 세그먼트를 안 참조한다 — 리터럴로 되돌아갔다').toBe(true);
    expect(/^\s*\d+\s*$/.test(expr), '숫자 리터럴이다').toBe(false);
  });
});

describe('peakOf — 진단이 상수가 아니라 결과를 읽는가', () => {
  it('평평한 배열은 정확히 0 이다', () => {
    // x, y, z 세 쌍. y 가 전부 같다.
    const flat = new Float32Array([0, 5, 0, 1, 5, 1, 2, 5, 2]);
    expect(peakOf(flat)).toBe(0);
  });

  it('마루~골 차이를 그대로 돌려준다', () => {
    const wavy = new Float32Array([0, 1, 0, 1, -2, 1, 2, 3, 2]);
    expect(peakOf(wavy)).toBeCloseTo(5, 10);
  });

  it('빈 배열에서 NaN·Infinity 를 내지 않는다', () => {
    expect(peakOf(new Float32Array([]))).toBe(0);
  });
});

describe('surfaceLift — 패치를 옮겨도 파형이 제자리인가', () => {
  // 이것이 A 안이 성립하는 이유다. 패치는 스냅 단위로 튀며 움직이는데, 그 순간
  // 물결이 함께 튀면 즉효로 어색하다. `surfaceLift` 가 **월드 좌표만의 함수**라
  // 판이 어디 있든 같은 월드 지점에서 같은 높이가 나온다.
  it('같은 월드 좌표는 판 위치와 무관하게 같은 높이다', () => {
    const t = 3.7;
    // 판이 원점에 있을 때의 로컬 (10, 20) = 월드 (10, 20)
    const a = surfaceLift(10, 20, t);
    // 판이 (100, 100) 으로 옮겨간 뒤의 로컬 (−90, −80) = 같은 월드 (10, 20)
    const b = surfaceLift(-90 + 100, -80 + 100, t);
    expect(b).toBeCloseTo(a, 12);
  });

  it('진폭 0 이면 정확히 0 이다 — 되돌리기가 실제로 평평해진다', () => {
    expect(surfaceLift(13, 27, 5, 0)).toBe(0);
  });

  it('시간이 흐르면 높이가 변한다 — 안 변하면 정지한 물이다', () => {
    const at0 = surfaceLift(13, 27, 0);
    const at1 = surfaceLift(13, 27, 1.1);
    expect(Math.abs(at1 - at0)).toBeGreaterThan(1e-6);
  });
});

describe('patchVertexY — 평균 수면이 진폭에 딸려 오르지 않는다', () => {
  // ── 왜 이 검사가 없었나, 그리고 왜 그것이 비쌌나 ──────────────────────────
  // 패치 정점 y 는 오래 갱신 루프 안에 인라인으로 `0.01 + LIFT_AMP + surfaceLift(...)`
  // 라고 적혀 있었다. `+ LIFT_AMP` 는 골을 아래 층 위로 들어올리려던 것인데, 그것이
  // **평균 수면도 함께 밀어 올렸다** — `?wamp` 가 파도 세기 노브이면서 수면 높이
  // 노브를 겸했다는 뜻이다.
  //
  // 이 저장소가 이름 붙인 **판정/집행 분리의 구멍**이 정확히 그 형태다: `surfaceLift`
  // 는 순수 함수라 단위 테스트가 촘촘히 보고 있었지만, **그 값을 정점에 꽂는 한 줄**은
  // 어느 테스트도 안 봤다. 그래서 함수(`patchVertexY`)로 올리고 여기서 본다.
  //
  // 판정 축은 «평균» 이다. 마루~골(`peakOf`)은 리프트가 있어도 그대로라 이 결함을
  // 구별하지 못한다 — 실제로 `seaPatch.peak` 진단은 내내 정상값을 내고 있었다.

  /** 넓은 격자의 평균. 파장이 무리수비라 완전한 주기 정수배가 없으므로 표본으로 낸다. */
  const meanY = (amp: number, t: number): number => {
    let sum = 0;
    let n = 0;
    for (let x = 0; x < 96; x += 1.5) {
      for (let z = 0; z < 96; z += 1.5) { sum += patchVertexY(x, z, t, amp); n += 1; }
    }
    return sum / n;
  };

  /** 이 검사가 훑는 진폭의 최댓값. 임계를 여기서 **유도한다** */
  const MAX_AMP = 0.75;
  // ⚠ **임계는 진폭에 비례해야 한다.** `surfaceLift` 가 마지막에 `h * amp` 를 하므로
  // 표본 평균의 편차도 진폭에 정비례한다. 리터럴로 박으면 진폭을 만질 때 손으로 따라
  // 고쳐야 하고, 실제로 집행 쪽 같은 검사가 `?wamp` 기본값 변경(0.2 → 0.45)에서 그렇게
  // 깨졌다 — 값 미러링이 테스트 임계값에 나타나는 형태다.
  //
  // 실측: 96m×96m·1.5m 간격에서 최대 편차 **0.102mm**(진폭 0.75 포함) = 진폭의 0.014%.
  // 뮤테이션(리프트 복원)이면 100% 다. 5% 는 실측의 360배 여유이자 뮤테이션의 1/20 이다.
  const TOL_M = MAX_AMP * 0.05;

  it('★ 진폭을 바꿔도 평균 수면이 안 움직인다 — 리프트를 되살리면 깨진다', () => {
    for (const amp of [0, 0.2, 0.45, 0.75]) {
      for (const t of [0, 0.7, 1.9, 3.3]) {
        expect(Math.abs(meanY(amp, t) - PATCH_SEP)).toBeLessThan(TOL_M);
      }
    }
  });

  // ⚠ 소스를 정규식으로 훑어 `PATCH_SEP + LIFT_AMP` 복원을 막는 검사를 만들었다가
  // **지웠다.** 자기 자신의 정정 주석(`원래 이 자리는 … 였다`)에 걸려 빨간불이 났다 —
  // 즉 그 축은 코드와 주석을 못 가른다. 아래 평균 검사가 뮤테이션 대비 200배 여유로
  // 같은 것을 잡으므로, 남겼으면 **오탐만 내는 장식**이었다.

  it('진폭 0 이면 정확히 baseline 이다 — `?wamp=0` 이 1cm 분리를 잃지 않는다', () => {
    expect(patchVertexY(12, -7, 2.5, 0)).toBe(PATCH_SEP);
  });

  it('파동은 그대로 실린다 — 평균만 고정된 것이지 평평해진 것이 아니다', () => {
    // 평균 단언만 있으면 «파동을 통째로 0 으로 만든» 구현도 통과한다. 그 구멍을 막는다.
    let lo = Infinity;
    let hi = -Infinity;
    for (let x = 0; x < 64; x += 1) {
      const y = patchVertexY(x, 0, 0, 0.2);
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
    expect(hi - lo).toBeGreaterThan(0.2);
  });

});
