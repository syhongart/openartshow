// @vitest-environment jsdom
// guestbook.js 단위테스트 — 방명록 데이터 계층의 회귀 안전망.
// 병합(id 멱등·ts 내림차순)·정규화(slice 상한)·localStorage 라운드트립을 케이스로 고정.
// jsdom: loadNotes/saveNotes가 localStorage에 의존(crypto.getRandomValues도 jsdom 제공).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadNotes, saveNotes, mergeNotes, makeNote } from '../frontend/js/guestbook.js';

beforeEach(() => {
  localStorage.clear();
});

describe('makeNote — 노트 생성·정규화', () => {
  it('name은 40자, text는 120자로 자른다', () => {
    const n = makeNote('가'.repeat(50), 'b'.repeat(200));
    expect(n.name).toHaveLength(40);
    expect(n.text).toHaveLength(120);
  });

  it('falsy name은 "익명", falsy text는 빈 문자열', () => {
    const n = makeNote('', null);
    expect(n.name).toBe('익명');
    expect(n.text).toBe('');
    // 숫자 0도 falsy로 취급되어 익명 처리(현 동작 고정)
    expect(makeNote(0, 0).name).toBe('익명');
  });

  it('id는 8자 16진, ts는 숫자', () => {
    const n = makeNote('A', 'hi');
    expect(n.id).toMatch(/^[0-9a-f]{8}$/);
    expect(typeof n.ts).toBe('number');
  });

  it('연속 생성 시 id는 (거의 확실히) 서로 다르다', () => {
    const ids = new Set(Array.from({ length: 50 }, () => makeNote('a', 'b').id));
    expect(ids.size).toBe(50);
  });
});

describe('mergeNotes — id 멱등 병합 + ts 내림차순', () => {
  it('중복 id는 하나로 합치고 뒤 배열 값이 이긴다', () => {
    const out = mergeNotes([{ id: '1', ts: 1, name: 'A' }], [{ id: '1', ts: 2, name: 'B' }]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('B');
    expect(out[0].ts).toBe(2);
  });

  it('ts 내림차순으로 정렬한다', () => {
    const out = mergeNotes(
      [{ id: 'a', ts: 10 }, { id: 'b', ts: 30 }],
      [{ id: 'c', ts: 20 }]
    );
    expect(out.map((n) => n.id)).toEqual(['b', 'c', 'a']);
  });

  it('id가 문자열이 아닌 항목(및 null)은 버린다', () => {
    const out = mergeNotes([{ id: 5, ts: 1 }, null, { id: 'ok', ts: 2 }], []);
    expect(out.map((n) => n.id)).toEqual(['ok']);
  });

  it('두 빈 배열 병합은 빈 배열', () => {
    expect(mergeNotes([], [])).toEqual([]);
  });
});

describe('saveNotes/loadNotes — localStorage 라운드트립', () => {
  it('저장 후 로드하면 동일 노트를 얻는다', () => {
    const notes = [makeNote('A', 'x'), makeNote('B', 'y')];
    saveNotes('g1', notes);
    const loaded = loadNotes('g1');
    expect(loaded).toHaveLength(2);
    expect(new Set(loaded.map((n) => n.id))).toEqual(new Set(notes.map((n) => n.id)));
  });

  it('저장 시 ts 내림차순으로 정렬된다', () => {
    saveNotes('g1', [
      { id: 'a', name: 'a', text: '', ts: 1 },
      { id: 'b', name: 'b', text: '', ts: 3 },
      { id: 'c', name: 'c', text: '', ts: 2 },
    ]);
    expect(loadNotes('g1').map((n) => n.id)).toEqual(['b', 'c', 'a']);
  });

  it('200개 초과분은 저장 시 절단(최신 200개만)', () => {
    const many = Array.from({ length: 250 }, (_, i) => ({ id: 'n' + i, name: 'x', text: '', ts: i }));
    saveNotes('g1', many);
    const loaded = loadNotes('g1');
    expect(loaded).toHaveLength(200);
    // ts 큰(최신) 순으로 남으므로 가장 오래된 n0은 사라짐
    expect(loaded.some((n) => n.id === 'n0')).toBe(false);
    expect(loaded[0].id).toBe('n249');
  });

  it('없는 키는 빈 배열', () => {
    expect(loadNotes('nope')).toEqual([]);
  });

  it('파손된 JSON·배열 아님은 빈 배열(예외 삼킴)', () => {
    localStorage.setItem('lu-guestbook-g1', '{망가진');
    expect(loadNotes('g1')).toEqual([]);
    localStorage.setItem('lu-guestbook-g1', '{"not":"array"}');
    expect(loadNotes('g1')).toEqual([]);
  });

  it('로드 시 id 없는 항목은 걸러낸다', () => {
    localStorage.setItem(
      'lu-guestbook-g1',
      JSON.stringify([{ id: 'ok', ts: 1 }, { ts: 2 }, null, { id: 3 }])
    );
    expect(loadNotes('g1').map((n) => n.id)).toEqual(['ok']);
  });

  it('galleryId 생략 시 "shared" 키를 쓴다(id별로 격리)', () => {
    saveNotes(undefined, [{ id: 's', name: 'x', text: '', ts: 1 }]);
    expect(localStorage.getItem('lu-guestbook-shared')).not.toBeNull();
    // 다른 갤러리 키는 서로 섞이지 않는다
    expect(loadNotes('other')).toEqual([]);
  });
});
