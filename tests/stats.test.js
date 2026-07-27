// @vitest-environment jsdom
// stats.js 단위테스트 — 작가 리포트(서버 없는 방문·감상 통계)의 회귀 안전망.
// 순수 로직만 고정: 체류 반경 판정(addDwell)·중복 방문 방지(addVisit)·요약 임계(summary).
//
// 시계 의존 주의: todayKey()가 new Date() 시스템시계를 직접 읽는다(주입 불가).
//   → 결정적 테스트를 위해 vitest fake timer로 시스템시계를 고정한다(vi.setSystemTime).
//     소스 수정 없이 시계를 통제하므로 날짜키·디바운스 저장까지 검증 가능.
// [리팩터 여지] todayKey/_save의 Date·setTimeout을 주입 가능하게 빼면 fake timer 없이도
//   테스트할 수 있다(현재는 fake timer로 우회 — 소스 무수정 원칙 유지).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GalleryStats } from '../frontend/js/stats.js';

const FIXED = new Date(2026, 6, 21, 10, 0, 0); // 2026-07-21 (로컬) → todayKey '2026-07-21'

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(FIXED);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('addVisit — 중복 방지·누적·일자 집계', () => {
  it('새 방문자는 누적·오늘 방문을 1 올린다', () => {
    const s = new GalleryStats('g');
    s.addVisit('u1');
    expect(s.data.totalVisits).toBe(1);
    expect(s.data.days['2026-07-21']).toBe(1);
  });

  it('같은 방문자 id는 세션 내 재집계하지 않는다', () => {
    const s = new GalleryStats('g');
    s.addVisit('u1');
    s.addVisit('u1');
    s.addVisit('u2');
    expect(s.data.totalVisits).toBe(2);
  });

  it('falsy 방문자 id는 무시', () => {
    const s = new GalleryStats('g');
    s.addVisit('');
    s.addVisit(null);
    s.addVisit(undefined);
    expect(s.data.totalVisits).toBe(0);
  });

  it('일자 기록은 최근 60일만 유지(초과 시 가장 오래된 날 삭제)', () => {
    const s = new GalleryStats('g');
    for (let i = 0; i < 65; i++) {
      vi.setSystemTime(new Date(2026, 0, 1 + i, 12, 0, 0)); // 하루씩 이동
      s.addVisit('u' + i); // 매번 다른 방문자
    }
    const days = Object.keys(s.data.days);
    expect(days).toHaveLength(60);
    // 가장 이른 날(1/1)은 절단되어 사라지고 총 누적은 65 그대로
    expect(s.data.days['2026-01-01']).toBeUndefined();
    expect(s.data.totalVisits).toBe(65);
  });
});

describe('addDwell — 체류 반경(3.0m) 판정·최근접 작품 적립', () => {
  const artAt = (title, x, z) => ({ title, pos: { x, z } });

  it('반경 안(<3.0)이면 최근접 작품에 seconds 적립', () => {
    const s = new GalleryStats('g');
    s.addDwell([{ x: 0, z: 2.99 }], [artAt('그림', 0, 0)], 5);
    expect(s.data.dwell['그림']).toBe(5);
  });

  it('반경 경계(정확히 3.0)는 적립하지 않는다(엄격 부등호)', () => {
    const s = new GalleryStats('g');
    s.addDwell([{ x: 0, z: 3.0 }], [artAt('그림', 0, 0)], 5);
    expect(s.data.dwell['그림']).toBeUndefined();
  });

  it('여러 작품 중 가장 가까운 것에만 적립', () => {
    const s = new GalleryStats('g');
    const arts = [artAt('A', 0, 0), artAt('B', 0, 1)];
    s.addDwell([{ x: 0, z: 0.9 }], arts, 4); // B(거리 0.1)가 A(0.9)보다 가까움
    expect(s.data.dwell['B']).toBe(4);
    expect(s.data.dwell['A']).toBeUndefined();
  });

  it('여러 사람은 각자 최근접 작품에 누적', () => {
    const s = new GalleryStats('g');
    const arts = [artAt('A', 0, 0), artAt('B', 5, 0)];
    s.addDwell([{ x: 0, z: 0.5 }, { x: 5, z: 0.5 }, { x: 0, z: 1.0 }], arts, 2);
    expect(s.data.dwell['A']).toBe(4); // 두 사람
    expect(s.data.dwell['B']).toBe(2);
  });

  it('title 없는 작품은 적립 대상에서 제외', () => {
    const s = new GalleryStats('g');
    s.addDwell([{ x: 0, z: 0 }], [{ pos: { x: 0, z: 0 } }], 5);
    expect(Object.keys(s.data.dwell)).toHaveLength(0);
  });

  it('빈 입력(사람 없음/작품 없음)은 no-op', () => {
    const s = new GalleryStats('g');
    s.addDwell([], [artAt('A', 0, 0)], 5);
    s.addDwell([{ x: 0, z: 0 }], [], 5);
    s.addDwell(null, null, 5);
    expect(Object.keys(s.data.dwell)).toHaveLength(0);
  });
});

describe('summary — 요약 한 줄·인기작 임계', () => {
  it('기본은 오늘 방문·누적만', () => {
    const s = new GalleryStats('g');
    s.addVisit('u1');
    expect(s.summary()).toBe('오늘 방문 1 · 누적 1');
  });

  it('guestbookCount가 숫자면 방명록 항목 추가', () => {
    const s = new GalleryStats('g');
    expect(s.summary(7)).toContain('방명록 7');
    // 비숫자면 방명록 미표시
    expect(s.summary(undefined)).not.toContain('방명록');
  });

  it('인기작은 체류 10초 이상부터 표시(임계 경계)', () => {
    const s = new GalleryStats('g');
    s.addDwell([{ x: 0, z: 0 }], [{ title: 'X', pos: { x: 0, z: 0 } }], 9);
    expect(s.summary()).not.toContain('인기작');
    s.addDwell([{ x: 0, z: 0 }], [{ title: 'X', pos: { x: 0, z: 0 } }], 1); // 누적 10
    expect(s.summary()).toContain('인기작 「X」 10초');
  });

  it('60초 이상은 분 단위로 표기', () => {
    const s = new GalleryStats('g');
    s.addDwell([{ x: 0, z: 0 }], [{ title: 'X', pos: { x: 0, z: 0 } }], 60);
    expect(s.summary()).toContain('인기작 「X」 1분');
    // 59초는 초 단위
    const s2 = new GalleryStats('g2');
    s2.addDwell([{ x: 0, z: 0 }], [{ title: 'Y', pos: { x: 0, z: 0 } }], 59);
    expect(s2.summary()).toContain('59초');
  });

  it('가장 오래 머문 작품 하나만 인기작으로 뽑는다', () => {
    const s = new GalleryStats('g');
    s.addDwell([{ x: 0, z: 0 }], [{ title: 'A', pos: { x: 0, z: 0 } }], 20);
    s.addDwell([{ x: 0, z: 0 }], [{ title: 'B', pos: { x: 0, z: 0 } }], 40);
    const line = s.summary();
    expect(line).toContain('「B」');
    expect(line).not.toContain('「A」');
  });
});

describe('영속화 — 디바운스 저장 후 재로드', () => {
  it('_save 디바운스(2초) 경과 후 localStorage에 기록, 새 인스턴스가 로드한다', () => {
    const s = new GalleryStats('persist');
    s.addVisit('u1');
    s.addVisit('u2');
    vi.advanceTimersByTime(2000); // 디바운스 flush
    const reloaded = new GalleryStats('persist');
    expect(reloaded.data.totalVisits).toBe(2);
    expect(reloaded.data.days['2026-07-21']).toBe(2);
  });
});
