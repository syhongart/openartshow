// main-math.js 순수 유틸 단위테스트 — #94 안전망 후속(R5, 누락 순수함수 보강).
// main.js 분해 1차로 leaf 추출된 순수 수학·각도보간·해시·시각판정 유틸(공유상태 없음).
// 되돌리기 힘든 경계(각도 랩어라운드·시각대 경계·해시 결정성)를 케이스로 고정한다.
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  easeInOutCubic,
  lerpAngle,
  resolveAutoTheme,
  djb2,
} from '../frontend/js/main-math.js';

const PI = Math.PI;

describe('easeInOutCubic', () => {
  it('경계값: 0→0, 1→1, 0.5→0.5(대칭 변곡점)', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 12);
  });
  it('단조 증가 + 대칭(t와 1-t가 1로 합산)', () => {
    let prev = -Infinity;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const v = easeInOutCubic(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
      expect(v + easeInOutCubic(1 - t)).toBeCloseTo(1, 12);
    }
  });
});

describe('lerpAngle (최단 경로 각도 보간)', () => {
  it('t=0/1 端点', () => {
    expect(lerpAngle(0.3, 1.2, 0)).toBeCloseTo(0.3, 12);
    expect(lerpAngle(0.3, 1.2, 1)).toBeCloseTo(1.2, 12);
  });
  it('직선 구간은 통상 lerp', () => {
    expect(lerpAngle(0, 1, 0.5)).toBeCloseTo(0.5, 12);
  });
  it('±PI 경계를 넘을 때 최단 방향으로 회전(장거리로 돌지 않음)', () => {
    // 3.0 → -3.0: 직선 차 -6.0이지만 최단은 +0.28…(2PI-6) 방향
    const mid = lerpAngle(3.0, -3.0, 0.5);
    // 최단 경로는 PI 경계를 넘어 ~±PI 근처를 지난다 — |중간값|이 3.0 이상
    expect(Math.abs(mid)).toBeGreaterThan(3.0);
  });
  it('반대편(≈PI 차)도 유한값 반환', () => {
    expect(Number.isFinite(lerpAngle(0, PI, 0.5))).toBe(true);
  });
});

describe('resolveAutoTheme (auto → 현지 시각 테마)', () => {
  afterEach(() => vi.useRealTimers());
  const at = (h) => {
    vi.useFakeTimers();
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    vi.setSystemTime(d);
  };
  it("비-auto 테마는 그대로 통과(패스스루)", () => {
    expect(resolveAutoTheme('night')).toBe('night');
    expect(resolveAutoTheme('daylight')).toBe('daylight');
    expect(resolveAutoTheme('sunset')).toBe('sunset');
  });
  it('06~15시 → daylight', () => {
    for (const h of [6, 10, 15]) { at(h); expect(resolveAutoTheme('auto')).toBe('daylight'); }
  });
  it('16~18시 → sunset', () => {
    for (const h of [16, 18]) { at(h); expect(resolveAutoTheme('auto')).toBe('sunset'); }
  });
  it('19시~05시 → night', () => {
    for (const h of [19, 23, 0, 5]) { at(h); expect(resolveAutoTheme('auto')).toBe('night'); }
  });
});

describe('djb2 (짧은 문자열 해시 — 공유 룸 키)', () => {
  it('결정적: 같은 입력 = 같은 출력', () => {
    expect(djb2('gallery-abc')).toBe(djb2('gallery-abc'));
  });
  it('빈 문자열 = 초기 시드(5381)의 base36', () => {
    expect(djb2('')).toBe((5381).toString(36));
  });
  it('다른 입력은 (사실상) 다른 출력', () => {
    expect(djb2('room-a')).not.toBe(djb2('room-b'));
  });
  it('base36 문자만(부호·소수점 없음, unsigned)', () => {
    expect(djb2('any-string-🎨')).toMatch(/^[0-9a-z]+$/);
  });
});
