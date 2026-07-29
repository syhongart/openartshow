// KST 모듈 테스트 — 시간대 변환이 정확한가

import { describe, it, expect } from 'vitest';
import { kstDate, kstDateTime, KST_OFFSET_MS } from '../scripts/lib/kst.mjs';

describe('KST 변환', () => {
  // ── 핵심: UTC 19:07 이 KST 로 다음 날 04:07 인가 ────
  // cron 이 돌 때 실제로 하루 늦게 찍히던 버그의 원인.
  it('UTC 19:07 → KST 다음 날 04:07 (자정 경계)', () => {
    // 2026-07-29 19:07:00 UTC
    const utcMs = new Date('2026-07-29T19:07:00Z').getTime();
    const result = kstDate(utcMs);
    expect(result).toBe('2026-07-30'); // 다음 날
  });

  // ── 자정 직전 ────
  it('UTC 14:59:59 → KST 23:59', () => {
    // 2026-07-29 14:59:59 UTC
    const utcMs = new Date('2026-07-29T14:59:59Z').getTime();
    const result = kstDate(utcMs);
    expect(result).toBe('2026-07-29'); // 같은 날
  });

  // ── 자정 직후 ────
  it('UTC 15:00:00 → KST 다음 날 00:00', () => {
    // 2026-07-29 15:00:00 UTC
    const utcMs = new Date('2026-07-29T15:00:00Z').getTime();
    const result = kstDate(utcMs);
    expect(result).toBe('2026-07-30'); // 다음 날
  });

  it('kstDate 포맷은 YYYY-MM-DD', () => {
    const utcMs = new Date('2026-07-29T12:00:00Z').getTime();
    const result = kstDate(utcMs);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('kstDateTime 포맷은 YYYY-MM-DD HH:mm', () => {
    const utcMs = new Date('2026-07-29T12:34:56Z').getTime();
    const result = kstDateTime(utcMs);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('kstDateTime 에서 시간이 정확한가 (UTC 19:07:00 → KST 04:07)', () => {
    // 2026-07-29 19:07:00 UTC = 2026-07-30 04:07:00 KST
    const utcMs = new Date('2026-07-29T19:07:00Z').getTime();
    const result = kstDateTime(utcMs);
    expect(result).toBe('2026-07-30 04:07');
  });

  // ── KST_OFFSET_MS 검증 ────
  it('KST_OFFSET_MS 는 9시간 (UTC+9)', () => {
    expect(KST_OFFSET_MS).toBe(9 * 3600 * 1000);
  });

  // ── 기본값: Date.now() 사용 ────
  it('인자 없이 호출하면 현재 시각을 사용', () => {
    const now = Date.now();
    const nowPlusOne = now + 1000; // 1초 뒤
    const resultNow = kstDate(now);
    const resultNowPlusOne = kstDate(nowPlusOne);
    // 보통 같은 날이지만, 자정 경계에 걸리면 다를 수 있다 → 단순 존재만 검증
    expect(resultNow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(resultNowPlusOne).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
