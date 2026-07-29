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
// - **XSS 페이로드 — 그리고 그것이 맞다.** 이 함수에 새니타이징 로직이 0 인 것은
//   결함이 아니다. 방어는 렌더 계층이 한다: `ui-dom.ts` 의 `el()` 이 `text` 옵션을
//   `node.textContent` 로 넣으므로 태그가 문자로 표시된다.
//   **함수 이름이 오해를 부른다** — `sanitize` 라서 "여기서 막힌다" 고 읽히지만
//   실제로는 타입·길이 정규화다. 그 착각이 위험해서 여기 적어둔다.
//   실제 방어 지점은 이 파일 하단 `describe('XSS 방어 …')` 가 테스트로 고정한다.
// - 극단적 ts 값: Number.isFinite(n.ts) 만 확인 (음수·미래시간 대체 검증 안 함)
// - 다른 필드의 타입 강제: String() 강제형변환만 함 (의도한 설계)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeIncomingNote } from '../frontend/js/multiplayer.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

// ── XSS 방어의 실제 자리는 이 함수가 아니다 ────────────────────────────────
//
// `sanitizeIncomingNote` 는 **타입·길이 정규화**만 한다. 이름이 `sanitize` 라서
// "여기서 XSS 를 막는다" 고 읽히지만 그런 로직은 없다 — 그리고 **없는 것이 맞다.**
// 방어는 렌더 계층이 한다.
//
// 경로를 실제로 따라가 보면:
//   multiplayer.js  onChat/onGuestbook 콜백으로 넘긴다 (innerHTML·textContent 0건)
//   main.js:502     addChatMessage(name, text, false)
//   ui-hud.ts:1240  el('span', { text: name }) · el('span', { text })
//   ui-dom.ts:1695  else if (k === 'text') node.textContent = v;   ← 여기가 방어다
//
// **그 방어가 주석 한 줄로만 보증돼 있었다.** `multiplayer.js:547` 의
// *"렌더는 textContent라 XSS 아님"* 이 유일한 근거였고, 누가 `ui-dom.ts:1695` 를
// `innerHTML` 로 바꾸면 P2P 로 들어온 텍스트가 그대로 실행되는데 잡을 것이 없었다.
//
// 이 저장소가 반복해서 겪은 형태다 — 문서가 지키는 불변식. 그래서 게이트로 옮긴다.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
//  · **정적 검사다.** `el()` 을 우회해 직접 `innerHTML` 을 쓰는 새 코드는 안 걸린다.
//  · 렌더 경로가 바뀌는 것(`addChatMessage` 가 `el()` 을 안 쓰게 되는 경우)도 안 걸린다.
//    아래 ②가 그 일부만 본다.
//  · 실제 브라우저 동작이 아니다. DOM 스텁 없이 소스를 읽는다 — `[6] CSP 부팅` 스모크가
//    그 축을 별도로 본다.
describe('XSS 방어 — 렌더 경로가 textContent 임을 고정한다', () => {
  const uiDom = readFileSync(join(ROOT, 'frontend/js/ui-dom.ts'), 'utf8');
  const uiHud = readFileSync(join(ROOT, 'frontend/js/ui-hud.ts'), 'utf8');
  const mp = readFileSync(join(ROOT, 'frontend/js/multiplayer.js'), 'utf8');

  it('① el() 의 text 옵션이 textContent 로 들어간다 — 방어의 실제 자리', () => {
    // 이 줄이 innerHTML 로 바뀌면 채팅·방명록 전체가 XSS 에 열린다.
    expect(
      /k === 'text'\s*\)\s*node\.textContent\s*=/.test(uiDom),
      'ui-dom.ts 의 el() 이 text 를 textContent 로 넣지 않는다 — '
      + 'P2P 로 들어온 채팅·방명록 텍스트가 실행될 수 있다',
    ).toBe(true);
  });

  it('② addChatMessage 가 el({ text }) 로 그린다 — innerHTML 을 안 쓴다', () => {
    const body = uiHud.slice(uiHud.indexOf('export function addChatMessage'));
    const fn = body.slice(0, body.indexOf('\n}') + 2);
    expect(fn.includes('innerHTML'), 'addChatMessage 가 innerHTML 을 쓴다').toBe(false);
    expect(/text:\s*(name|text)/.test(fn), 'addChatMessage 가 el({ text }) 경로를 안 쓴다').toBe(true);
  });

  it('③ multiplayer.js 는 DOM 을 직접 만지지 않는다 — 콜백으로만 넘긴다', () => {
    // 수신부가 DOM 을 직접 그리기 시작하면 방어 지점이 둘로 갈라진다.
    expect(mp.includes('innerHTML'), 'multiplayer.js 가 innerHTML 을 쓴다').toBe(false);
  });

  // ── ④ 오픈월드는 두 번째 렌더 경로다 (검수관 권고, 2026-07-29) ─────────────
  //
  // ①~③ 은 미술관 경로만 본다: `main.js:502 → ui-hud.ts:1240 → ui-dom.ts:1695`.
  // **오픈월드는 별도 경로로 그린다** — `world.js:2268` 의
  // `mp.onChat = (name, text) => emit('chat', {...})` 가 `world-boot.js` 의
  // `V.on('chat', ...)` 로 가고, 거기서 말풍선을 직접 만든다.
  //
  // 처음 이 게이트를 만들 때 그 경로를 **안 봤다**(검수관에게 "못 본 것" 으로
  // 신고했고, 검수관이 실제 사각임을 확인했다). 오픈월드는 랜딩에서 정식 링크된
  // **라이브**다 — 같은 커밋에서 `world.js` 주석의 `behind-flag` 오기재를 고친 것이
  // 그 사실이다.
  //
  // 현재 코드는 안전하다. `innerHTML` 은 **빈 정적 템플릿**이고 사용자 값은
  // `textContent` 로만 들어간다:
  //
  //     b.innerHTML = `<span class="nm"></span><span class="tx"></span>`;
  //     b.querySelector('.nm').textContent = name;
  //     b.querySelector('.tx').textContent = text;
  //
  // 위험은 누가 이걸 "한 줄로 정리" 하면서 보간으로 바꾸는 것이다. 그 순간 P2P
  // 채팅이 실행되고, ①~③ 은 아무것도 안 잡는다.
  it('④ 오픈월드 말풍선의 innerHTML 이 정적 템플릿이다 — 사용자 값 보간 없음', () => {
    const wb = readFileSync(join(ROOT, 'frontend/js/world-boot.js'), 'utf8');
    // `V.on('chat', ...)` 핸들러 본문만 잘라 본다(파일 전체를 보면 무관한 innerHTML 에 걸린다).
    const start = wb.indexOf("V.on('chat'");
    expect(start, "world-boot.js 에서 V.on('chat') 을 못 찾았다 — 렌더 경로가 바뀌었다").toBeGreaterThan(-1);
    const handler = wb.slice(start, start + 700);

    // innerHTML 할당에 템플릿 보간(`${`)이 없어야 한다. 있으면 사용자 값이 HTML 로 들어간다.
    const innerHtmlAssigns = handler.match(/innerHTML\s*=\s*[`'"][^`'"]*[`'"]/g) || [];
    for (const a of innerHtmlAssigns) {
      expect(
        a.includes('${'),
        `오픈월드 말풍선 innerHTML 에 보간이 들어갔다 — P2P 채팅이 실행될 수 있다:\n  ${a}`,
      ).toBe(false);
    }

    // 그리고 name·text 는 textContent 로 들어가야 한다.
    expect(
      /\.textContent\s*=\s*name/.test(handler) && /\.textContent\s*=\s*text/.test(handler),
      'world-boot.js 채팅 핸들러가 name·text 를 textContent 로 넣지 않는다',
    ).toBe(true);
  });
});
