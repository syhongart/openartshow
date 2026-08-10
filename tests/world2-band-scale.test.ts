// 밴드 배율(`?band=` 진단 노브) — **배율을 곱해도 히스테리시스 불변식이 사는가.**
//
// 배율이 순서를 깨면 tierFor 가 경계에서 매 프레임 진동한다 — 이 노브가 분리하려는
// 결함(전환이 화면을 흔든다)을 노브 자신이 만들게 된다. 그 구멍을 이 검사가 막는다.

import { describe, it, expect } from 'vitest';
import { scaleBands, validBands, DEFAULT_BANDS, tierFor } from '../frontend/js/world2/decide/lod.js';

describe('scaleBands', () => {
  it('배율을 곱해도 ENTER<EXIT 순서가 산다 — 노브 범위 전체', () => {
    for (const k of [0.5, 0.75, 1.5, 2, 4]) {
      expect(validBands(scaleBands(DEFAULT_BANDS, k))).toBe(true);
    }
  });

  it('배율 2면 강등선이 실제로 2배로 밀린다 — 실험이 성립하는 근거', () => {
    const b = scaleBands(DEFAULT_BANDS, 2);
    expect(b.nearExit).toBe(DEFAULT_BANDS.nearExit * 2);
    // 원래 강등선(1.30셀=41.6m) 바로 밖 거리가, 배율 2에서는 near 유지.
    expect(tierFor(1.4, 'near', DEFAULT_BANDS)).not.toBe('near');
    expect(tierFor(1.4, 'near', b)).toBe('near');
  });

  it('배율 1·퇴화 입력은 원본 그대로 — 기본 경로 무비용', () => {
    expect(scaleBands(DEFAULT_BANDS, 1)).toBe(DEFAULT_BANDS);
    expect(scaleBands(DEFAULT_BANDS, 0)).toBe(DEFAULT_BANDS);
    expect(scaleBands(DEFAULT_BANDS, Number.NaN)).toBe(DEFAULT_BANDS);
  });
});
