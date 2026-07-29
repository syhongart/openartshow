// tests/sanitize-incoming-note.test.ts — P2P 신뢰 경계 입력 새니타이저
// sanitizeIncomingNote(n) — multiplayer.js의 방명록 노트 수신 검증 함수
// SSOT: frontend/js/multiplayer.js:32-40
//
// 함수가 실제로 막는 것 (검증 실패 → null 반환):
// 1. null/undefined 입력
// 2. 객체가 아닌 입력 (string, number, array, ...)
// 3. id 필드가 없는 객체
// 4. id가 string이 아닌 객체
//
// 함수가 하는 것 (정규화 — 통과 가능한 객체는 다시 만듦):
// 1. id: 처음 32자만 (초과이면 자르기)
// 2. name: 없으면 '익명', 있으면 GB_NAME_MAX(40)자로 자르기
// 3. text: 없으면 '', 있으면 GB_TEXT_MAX(200)자로 자르기
// 4. ts: finite이면 유지, 아니면 Date.now() (단, 현재시간은 테스트에서 사전 고정 불가)
// 5. 객체의 추가 필드는 무시
//
// 못 잡는 것 (이 함수 범위 밖):
// - XSS 페이로드: 새니타이징 로직 0 (표시 단계에서 이스케이프 기대)
// - 극단적 ts 값: Number.isFinite(n.ts) 만 확인 (음수·미래시간 대체 검증 안 함)
// - 다른 필드의 타입 강제: String() 강제형변환만 함 (의도한 설계)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeIncomingNote } from '../frontend/js/multiplayer.js';

const GB_NAME_MAX = 40;
const GB_TEXT_MAX = 200;

describe('sanitizeIncomingNote — 방명록 노트 입력 검증', () => {
  describe('입력 검증 — 무효 입력은 null 반환', () => {
    it('null 입력은 null 반환', () => {
      expect(sanitizeIncomingNote(null)).toBe(null);
    });

    it('undefined 입력은 null 반환', () => {
      expect(sanitizeIncomingNote(undefined)).toBe(null);
    });

    it('string 입력은 null 반환', () => {
      expect(sanitizeIncomingNote('invalid')).toBe(null);
    });

    it('number 입력은 null 반환', () => {
      expect(sanitizeIncomingNote(42)).toBe(null);
    });

    it('array 입력은 null 반환', () => {
      expect(sanitizeIncomingNote([1, 2, 3])).toBe(null);
    });

    it('id 필드가 없는 객체는 null 반환', () => {
      expect(sanitizeIncomingNote({ name: 'test' })).toBe(null);
    });

    it('id가 null인 객체는 null 반환', () => {
      expect(sanitizeIncomingNote({ id: null })).toBe(null);
    });

    it('id가 number인 객체는 null 반환', () => {
      expect(sanitizeIncomingNote({ id: 123 })).toBe(null);
    });

    it('id가 boolean인 객체는 null 반환', () => {
      expect(sanitizeIncomingNote({ id: true })).toBe(null);
    });

    it('id가 undefined인 객체는 null 반환', () => {
      expect(sanitizeIncomingNote({ id: undefined })).toBe(null);
    });

    it('id가 array인 객체는 null 반환', () => {
      expect(sanitizeIncomingNote({ id: ['a', 'b'] })).toBe(null);
    });

    it('id가 object인 객체는 null 반환', () => {
      expect(sanitizeIncomingNote({ id: {} })).toBe(null);
    });
  });

  describe('정규화 — 유효 입력은 필드별로 처리됨', () => {
    it('최소 유효 객체: id만 있으면 통과', () => {
      const result = sanitizeIncomingNote({ id: 'test-123' });
      expect(result).not.toBeNull();
      if (!result) throw new Error('result should not be null');
      expect(result!.id).toBe('test-123');
      expect(result!.name).toBe('익명'); // name 없으면 기본값
      expect(result!.text).toBe(''); // text 없으면 빈 문자열
      expect(typeof result.ts).toBe('number'); // ts는 숫자
    });

    describe('id 필드 처리 — 32자 제한', () => {
      it('id 32자 미만이면 그대로 유지', () => {
        const id = 'short-id';
        const result = sanitizeIncomingNote({ id });
        expect(result!.id).toBe(id);
      });

      it('id 정확히 32자면 그대로 유지', () => {
        const id = 'a'.repeat(32);
        const result = sanitizeIncomingNote({ id });
        expect(result!.id).toBe(id);
        expect(result!.id.length).toBe(32);
      });

      it('id 33자 이상이면 32자로 자르기', () => {
        const id = 'a'.repeat(100);
        const result = sanitizeIncomingNote({ id });
        expect(result!.id).toBe('a'.repeat(32));
        expect(result!.id.length).toBe(32);
      });

      it('id 유니코드(멀티바이트) 포함 시 글자 단위로 자르기', () => {
        const id = '한글' + 'a'.repeat(30); // 한글 2글자 + 영문 30자 = 32글자
        const result = sanitizeIncomingNote({ id });
        // JavaScript slice는 코드 유닛 기준이므로, 멀티바이트도 잘림
        expect(result!.id.length).toBeLessThanOrEqual(32);
      });
    });

    describe('name 필드 처리 — 기본값 + 40자 제한', () => {
      it('name 없으면 "익명" 사용', () => {
        const result = sanitizeIncomingNote({ id: 'test' });
        expect(result!.name).toBe('익명');
      });

      it('name이 null이면 "익명" 사용', () => {
        const result = sanitizeIncomingNote({ id: 'test', name: null });
        expect(result!.name).toBe('익명');
      });

      it('name이 undefined이면 "익명" 사용', () => {
        const result = sanitizeIncomingNote({ id: 'test', name: undefined });
        expect(result!.name).toBe('익명');
      });

      it('name이 empty string이면 "익명" 사용', () => {
        const result = sanitizeIncomingNote({ id: 'test', name: '' });
        expect(result!.name).toBe('익명');
      });

      it('name이 number면 String() 강제변환', () => {
        const result = sanitizeIncomingNote({ id: 'test', name: 42 });
        expect(result!.name).toBe('42');
      });

      it('name이 boolean이면 String() 강제변환', () => {
        const result = sanitizeIncomingNote({ id: 'test', name: true });
        expect(result!.name).toBe('true');
      });

      it('name 40자 미만이면 그대로 유지', () => {
        const name = 'short-name';
        const result = sanitizeIncomingNote({ id: 'test', name });
        expect(result!.name).toBe(name);
      });

      it('name 정확히 40자면 그대로 유지', () => {
        const name = 'a'.repeat(40);
        const result = sanitizeIncomingNote({ id: 'test', name });
        expect(result!.name).toBe(name);
        expect(result!.name.length).toBe(40);
      });

      it('name 41자 이상이면 40자로 자르기', () => {
        const name = 'a'.repeat(100);
        const result = sanitizeIncomingNote({ id: 'test', name });
        expect(result!.name).toBe('a'.repeat(40));
        expect(result!.name.length).toBe(40);
      });

      it('name에 한글 포함 시 문자 단위로 자르기', () => {
        const name = '한글이름' + 'a'.repeat(36); // 한글 4글자 + 영문 36자 = 40글자
        const result = sanitizeIncomingNote({ id: 'test', name });
        expect(result!.name.length).toBeLessThanOrEqual(40);
      });
    });

    describe('text 필드 처리 — 기본값 + 200자 제한', () => {
      it('text 없으면 빈 문자열 사용', () => {
        const result = sanitizeIncomingNote({ id: 'test' });
        expect(result!.text).toBe('');
      });

      it('text가 null이면 빈 문자열 사용', () => {
        const result = sanitizeIncomingNote({ id: 'test', text: null });
        expect(result!.text).toBe('');
      });

      it('text가 undefined이면 빈 문자열 사용', () => {
        const result = sanitizeIncomingNote({ id: 'test', text: undefined });
        expect(result!.text).toBe('');
      });

      it('text가 number면 String() 강제변환', () => {
        const result = sanitizeIncomingNote({ id: 'test', text: 123 });
        expect(result!.text).toBe('123');
      });

      it('text 200자 미만이면 그대로 유지', () => {
        const text = 'a'.repeat(100);
        const result = sanitizeIncomingNote({ id: 'test', text });
        expect(result!.text).toBe(text);
      });

      it('text 정확히 200자면 그대로 유지', () => {
        const text = 'a'.repeat(200);
        const result = sanitizeIncomingNote({ id: 'test', text });
        expect(result!.text).toBe(text);
        expect(result!.text.length).toBe(200);
      });

      it('text 201자 이상이면 200자로 자르기', () => {
        const text = 'a'.repeat(500);
        const result = sanitizeIncomingNote({ id: 'test', text });
        expect(result!.text).toBe('a'.repeat(200));
        expect(result!.text.length).toBe(200);
      });
    });

    describe('ts 필드 처리 — 타임스탬프 검증', () => {
      it('ts 없으면 현재 시간(Date.now()) 사용', () => {
        const beforeCall = Date.now();
        const result = sanitizeIncomingNote({ id: 'test' });
        const afterCall = Date.now();

        expect(result!.ts).toBeGreaterThanOrEqual(beforeCall);
        expect(result!.ts).toBeLessThanOrEqual(afterCall + 100); // 100ms 여유
      });

      it('ts가 유효한 finite number면 그대로 유지', () => {
        const ts = 1234567890;
        const result = sanitizeIncomingNote({ id: 'test', ts });
        expect(result!.ts).toBe(ts);
      });

      it('ts가 음수도 유효하면 그대로 유지 (음수 타임스탬프 거부 안 함)', () => {
        const ts = -1000;
        const result = sanitizeIncomingNote({ id: 'test', ts });
        expect(result!.ts).toBe(ts);
      });

      it('ts가 0이면 그대로 유지', () => {
        const result = sanitizeIncomingNote({ id: 'test', ts: 0 });
        expect(result!.ts).toBe(0);
      });

      it('ts가 null이면 현재 시간 사용', () => {
        const beforeCall = Date.now();
        const result = sanitizeIncomingNote({ id: 'test', ts: null });
        const afterCall = Date.now();

        expect(result!.ts).toBeGreaterThanOrEqual(beforeCall);
        expect(result!.ts).toBeLessThanOrEqual(afterCall + 100);
      });

      it('ts가 undefined이면 현재 시간 사용', () => {
        const beforeCall = Date.now();
        const result = sanitizeIncomingNote({ id: 'test', ts: undefined });
        const afterCall = Date.now();

        expect(result!.ts).toBeGreaterThanOrEqual(beforeCall);
        expect(result!.ts).toBeLessThanOrEqual(afterCall + 100);
      });

      it('ts가 Infinity이면 현재 시간 사용', () => {
        const beforeCall = Date.now();
        const result = sanitizeIncomingNote({ id: 'test', ts: Infinity });
        const afterCall = Date.now();

        expect(result!.ts).toBeGreaterThanOrEqual(beforeCall);
        expect(result!.ts).toBeLessThanOrEqual(afterCall + 100);
      });

      it('ts가 -Infinity이면 현재 시간 사용', () => {
        const beforeCall = Date.now();
        const result = sanitizeIncomingNote({ id: 'test', ts: -Infinity });
        const afterCall = Date.now();

        expect(result!.ts).toBeGreaterThanOrEqual(beforeCall);
        expect(result!.ts).toBeLessThanOrEqual(afterCall + 100);
      });

      it('ts가 NaN이면 현재 시간 사용', () => {
        const beforeCall = Date.now();
        const result = sanitizeIncomingNote({ id: 'test', ts: NaN });
        const afterCall = Date.now();

        expect(result!.ts).toBeGreaterThanOrEqual(beforeCall);
        expect(result!.ts).toBeLessThanOrEqual(afterCall + 100);
      });

      it('ts가 string이면 현재 시간 사용 (타입 강제변환 안 함)', () => {
        const beforeCall = Date.now();
        const result = sanitizeIncomingNote({ id: 'test', ts: '1234567890' });
        const afterCall = Date.now();

        // String은 Number.isFinite()를 통과하지 못하므로 Date.now() 사용
        expect(result!.ts).toBeGreaterThanOrEqual(beforeCall);
        expect(result!.ts).toBeLessThanOrEqual(afterCall + 100);
      });
    });

    it('추가 필드는 무시된다 (반환 객체에 없음)', () => {
      const result = sanitizeIncomingNote({
        id: 'test',
        extraField: 'should-be-ignored',
        another: 123,
      });
      expect(result).toEqual({
        id: 'test',
        name: '익명',
        text: '',
        ts: expect.any(Number),
      });
      expect(result).not.toHaveProperty('extraField');
      expect(result).not.toHaveProperty('another');
    });
  });

  describe('못 잡는 것 — 함수 범위 밖', () => {
    it('XSS 페이로드는 새니타이징 안 됨 (이스케이프는 표시 단계에서)', () => {
      const xssPayload = '<script>alert("xss")</script>';
      const result = sanitizeIncomingNote({ id: 'test', text: xssPayload });
      // 함수는 그대로 통과시킴
      expect(result!.text).toBe(xssPayload);
    });

    it('HTML 테그가 포함된 text도 통과', () => {
      const htmlText = '<img src=x onerror=alert("xss")>';
      const result = sanitizeIncomingNote({ id: 'test', text: htmlText });
      expect(result!.text).toBe(htmlText);
    });

    it('극단적으로 미래의 타임스탬프도 통과', () => {
      const farFuture = Number.MAX_SAFE_INTEGER;
      const result = sanitizeIncomingNote({ id: 'test', ts: farFuture });
      expect(result!.ts).toBe(farFuture);
    });

    it('매우 작은 음수 타임스탬프도 통과', () => {
      const veryNegative = -Number.MAX_SAFE_INTEGER;
      const result = sanitizeIncomingNote({ id: 'test', ts: veryNegative });
      expect(result!.ts).toBe(veryNegative);
    });
  });

  describe('엣지 케이스 조합', () => {
    it('모든 필드가 극단값', () => {
      const result = sanitizeIncomingNote({
        id: 'x'.repeat(100),
        name: 'y'.repeat(50),
        text: 'z'.repeat(300),
        ts: -999999,
      });
      expect(result!.id).toBe('x'.repeat(32));
      expect(result!.name).toBe('y'.repeat(40));
      expect(result!.text).toBe('z'.repeat(200));
      expect(result!.ts).toBe(-999999);
    });

    it('id만 있고 나머지는 모두 기본값', () => {
      const result = sanitizeIncomingNote({ id: 'only-id' });
      expect(result).toEqual({
        id: 'only-id',
        name: '익명',
        text: '',
        ts: expect.any(Number),
      });
    });

    it('반환값은 항상 4개 필드만 포함 (id, name, text, ts)', () => {
      const result = sanitizeIncomingNote({
        id: 'test',
        name: 'alice',
        text: 'hello',
        ts: 1000,
        extra: 'field',
        another: 'value',
      });
      expect(result).not.toBeNull();
      if (!result) throw new Error('result should not be null');
      const keys = Object.keys(result);
      expect(keys).toEqual(['id', 'name', 'text', 'ts']);
    });
  });
});
