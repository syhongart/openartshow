// 그림자 프러스텀 유도 — **값 넷이 서로 맞는가.**
//
// ── 이 검사가 겨누는 실패 ────────────────────────────────────────────────────
// 감독 지시 *"주간에 하드라이트 느낌이 없어"* 의 원인은 `main.ts` 가 `shadow.camera` 를
// 아예 설정하지 않아 three 기본 **±5m** 가 쓰이고 있던 것이다. 셀이 32m 인 세계에서 그
// 반경은 발밑뿐이라, `castShadow` 를 단 파츠들이 전부 그림자를 못 그렸다.
//
// 그런데 **넓히기만 하면 다른 방식으로 사라진다.** 반폭을 키우고 `far` 를 그대로 두면
// 먼 구조물이 프러스텀 뒤로 밀리고, 광원 거리(`dist`)가 씬 두께보다 짧으면 타워 꼭대기가
// 카메라보다 뒤에 놓인다. 셋 다 화면에는 **"원래 그림자가 없는 것"과 똑같이** 보인다.
//
// 그래서 개별 값이 아니라 **관계**를 검사한다. 값 하나를 눈대중으로 고치면 깨지도록.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
// 이 프러스텀이 화면에서 실제로 하드라이트로 보이는지는 여기서 알 수 없다. 그것은 감독
// 실기기 판정이고, 헤드리스는 WebGL 이라 WebGPU 근거도 되지 못한다.

import { describe, it, expect } from 'vitest';
import { shadowFrustum } from '../frontend/js/world2/decide/shadow.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { DEFAULT_BANDS } from '../frontend/js/world2/decide/lod.js';
import { MAX_H as TOWER_MAX_H } from '../frontend/js/world2/parts/tower.js';

const MAP = 1024;
/** 실제 세계가 쓰는 조합. 상수를 하드코딩하지 않고 **소유자에게서 가져온다** */
const REAL = shadowFrustum(DEFAULT_LAYOUT.cellX, DEFAULT_BANDS.nearExit, TOWER_MAX_H, MAP);

describe('그림자 프러스텀 — 값들이 서로 맞는가', () => {
  it('세계에서 가장 높은 것이 프러스텀 안에 들어간다', () => {
    // 태양 방향으로 투영한 씬 두께의 **상한**은 `half + maxHeight` 다(cos·sin ≤ 1).
    // 광원이 그보다 가까이 서면 꼭대기가 카메라 뒤로 밀려 그림자가 사라진다.
    const worstDepth = REAL.half + TOWER_MAX_H;
    expect(REAL.dist, '광원이 씬 두께보다 가깝다 — 높은 것이 카메라 뒤로 밀린다')
      .toBeGreaterThan(worstDepth);
    expect(REAL.far, 'far 가 씬 뒤끝에 못 미친다 — 먼 그림자가 잘린다')
      .toBeGreaterThanOrEqual(REAL.dist + worstDepth);
    expect(REAL.near).toBeGreaterThan(0);
    expect(REAL.near).toBeLessThan(REAL.far);
  });

  it('반폭이 near 밴드를 덮는다 — 자세히 그리는 범위에는 그림자가 있어야 한다', () => {
    expect(REAL.half).toBeCloseTo(DEFAULT_LAYOUT.cellX * DEFAULT_BANDS.nearExit, 9);
    // three 기본값 ±5 로 되돌아가는 회귀를 직접 겨눈다.
    expect(REAL.half, '기본값 ±5 수준이면 발밑 말고는 그림자가 없다').toBeGreaterThan(20);
  });

  it('텍셀이 그림자 경계를 뭉갤 만큼 크지 않다 (하드라이트 조건)', () => {
    expect(REAL.texel).toBeCloseTo((REAL.half * 2) / MAP, 9);
    // 사람 키의 1/10 을 넘으면 경계가 계단으로 보이기 시작한다.
    expect(REAL.texel, `텍셀 ${REAL.texel.toFixed(3)}m — 경계가 뭉개진다`).toBeLessThan(0.17);
    // 법선 오프셋은 텍셀에서 유도된다. 상수로 박으면 반폭을 바꿀 때 얼룩이 돌아온다.
    expect(REAL.normalBias).toBeCloseTo(REAL.texel, 9);
  });

  it('맵을 키우면 텍셀만 줄고 기하는 그대로다 — 축이 섞이지 않는다', () => {
    const hi = shadowFrustum(DEFAULT_LAYOUT.cellX, DEFAULT_BANDS.nearExit, TOWER_MAX_H, MAP * 2);
    expect(hi.half).toBe(REAL.half);
    expect(hi.dist).toBe(REAL.dist);
    expect(hi.far).toBe(REAL.far);
    expect(hi.texel).toBeCloseTo(REAL.texel / 2, 9);
  });

  it('세계가 커지면 함께 따라온다 — 유도지 상수가 아니다', () => {
    const big = shadowFrustum(DEFAULT_LAYOUT.cellX * 2, DEFAULT_BANDS.nearExit, TOWER_MAX_H, MAP);
    expect(big.half).toBeGreaterThan(REAL.half);
    expect(big.far).toBeGreaterThan(REAL.far);

    // 타워를 높이면 깊이가 따라와야 한다. 안 따라오면 꼭대기 그림자가 조용히 잘린다 —
    // `tower.ts` 의 `MAX_H` 를 export 한 이유가 이것이다.
    const tall = shadowFrustum(DEFAULT_LAYOUT.cellX, DEFAULT_BANDS.nearExit, TOWER_MAX_H * 2, MAP);
    expect(tall.dist).toBeGreaterThan(REAL.dist);
    expect(tall.half, '높이는 반폭을 건드리지 않는다 — 축이 섞이면 텍셀이 함께 나빠진다')
      .toBe(REAL.half);
  });
});
