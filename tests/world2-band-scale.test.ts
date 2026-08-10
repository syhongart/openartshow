// 밴드 배율(`?band=` 진단 노브) — **배율을 곱해도 히스테리시스 불변식이 사는가.**
//
// 배율이 순서를 깨면 tierFor 가 경계에서 매 프레임 진동한다 — 이 노브가 분리하려는
// 결함(전환이 화면을 흔든다)을 노브 자신이 만들게 된다. 그 구멍을 이 검사가 막는다.

import { describe, it, expect } from 'vitest';
import { scaleBands, withNearExit, withFarEnter, validBands, DEFAULT_BANDS, tierFor } from '../frontend/js/world2/decide/lod.js';
import { kindsFor } from '../frontend/js/world2/parts/index.js';

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

describe('withNearExit — 깜빡임 처방 후보(?nearx=)', () => {
  it('후보 전 구간에서 순서 불변식이 산다 — mid·far 최소 보정 포함', () => {
    for (const x of [1.4, 1.6, 1.75, 2.0, 2.2]) {
      expect(validBands(withNearExit(DEFAULT_BANDS, x))).toBe(true);
    }
  });

  it('강등선이 실제로 옮겨진다 — 원래 강등 거리(1.4셀)에서 near 유지', () => {
    const b = withNearExit(DEFAULT_BANDS, 1.75);
    expect(b.nearExit).toBe(1.75);
    expect(tierFor(1.4, 'near', DEFAULT_BANDS)).not.toBe('near');
    expect(tierFor(1.4, 'near', b)).toBe('near');
    // 히스테리시스 폭(0.15)은 유지 — 폭이 죽으면 경계 진동이 되살아난다.
    expect(b.nearExit - b.nearEnter).toBeCloseTo(DEFAULT_BANDS.nearExit - DEFAULT_BANDS.nearEnter);
  });

  it('mid·far 는 원래 값보다 안으로 오지 않는다 — 바깥 tier 침식 금지', () => {
    const b = withNearExit(DEFAULT_BANDS, 2.0);
    expect(b.midEnter).toBeGreaterThanOrEqual(DEFAULT_BANDS.midEnter);
    expect(b.farExit).toBeGreaterThanOrEqual(DEFAULT_BANDS.farExit);
  });

  it('퇴화 입력(0·NaN·동일값)은 원본 그대로', () => {
    expect(withNearExit(DEFAULT_BANDS, Number.NaN)).toBe(DEFAULT_BANDS);
    expect(withNearExit(DEFAULT_BANDS, 0)).toBe(DEFAULT_BANDS);
    expect(withNearExit(DEFAULT_BANDS, DEFAULT_BANDS.nearExit)).toBe(DEFAULT_BANDS);
  });
});

describe('withFarEnter — 생성을 안개 뒤로(?calm=)', () => {
  it('안개 100% 지점(2.40)으로 밀어도 순서 불변식이 살고 폭이 유지된다', () => {
    const b = withFarEnter(DEFAULT_BANDS, 2.40);
    expect(validBands(b)).toBe(true);
    expect(b.farEnter).toBe(2.40);
    // 생성↔반납 히스테리시스 폭(0.30) 유지 — 죽으면 경계에서 파셀이 명멸한다.
    expect(b.farExit - b.farEnter).toBeCloseTo(DEFAULT_BANDS.farExit - DEFAULT_BANDS.farEnter);
    // near·mid 무변경 — 그 전환들은 tiers 연장으로 이미 화면상 no-op 이다.
    expect(b.nearExit).toBe(DEFAULT_BANDS.nearExit);
    expect(b.midExit).toBe(DEFAULT_BANDS.midExit);
  });

  it('퇴화 입력(0·NaN·동일값)은 원본 그대로', () => {
    expect(withFarEnter(DEFAULT_BANDS, Number.NaN)).toBe(DEFAULT_BANDS);
    expect(withFarEnter(DEFAULT_BANDS, 0)).toBe(DEFAULT_BANDS);
    expect(withFarEnter(DEFAULT_BANDS, DEFAULT_BANDS.farEnter)).toBe(DEFAULT_BANDS);
  });
});

describe('tiers 전 계층 연장 — 소멸 사건이 정말 사라졌는가', () => {
  it('near→mid→far 어느 전환에서도 종류 집합이 같다 — retier 가 화면상 no-op', () => {
    // 이 단언이 처방 (a′)의 소멸 축 그 자체다. 어떤 파츠든 tiers 를 도로 좁히면
    // 여기가 깨진다 — planter.ts 주석의 "다시 좁히면 깜빡임이 되살아난다"의 검사판.
    const near = new Set(kindsFor('near'));
    const mid = new Set(kindsFor('mid'));
    const far = new Set(kindsFor('far'));
    expect([...near].sort()).toEqual([...mid].sort());
    expect([...mid].sort()).toEqual([...far].sort());
  });
});
