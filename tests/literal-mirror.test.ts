// tests/literal-mirror.test.ts — 리터럴 미러 정합성 게이트
// 세 값이 SSOT 밖 소스(인라인 HTML 스크립트)에 리터럴로 박혀 있다.
// 없앨 수 없으니(CSP default-src 'self') 정합성을 게이트로 묶는다.
//
// SSOT(Single Source of Truth):
// - SAVE_KEY: frontend/js/builder.js
// - PLAN_KEY: frontend/js/studio-plan.ts
// - GOLD: frontend/js/ui-dom.ts
//
// 미러 위치(리터럴 하드코딩):
// - SAVE_KEY: frontend/builder.html, frontend/visit.html
// - PLAN_KEY: frontend/landing.html
// - GOLD: frontend/js/player.js, frontend/js/world-boot.js,
//         frontend/js/main-photo-util.ts, frontend/js/hitfx.js, frontend/js/ui-hud.ts
//
// 주의:
// - player.js는 보호파일(라이브 미술관 서비스 중)이므로 직접 import 하지 않음 — 텍스트로만 읽음
// - builder.html·landing.html·visit.html은 HTML 인라인 스크립트(모듈 import 불가) — 텍스트로만 읽음
// - 못 잡는 것: 문자열 조립(rgb()/hsl() 표기), design.html 제외(색 샘플 정당)

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// SSOT 직접 import
import { SAVE_KEY } from '../frontend/js/builder.js';
import { PLAN_KEY } from '../frontend/js/studio-plan.js';
import { GOLD } from '../frontend/js/ui-dom.js';

describe('literal-mirror — SSOT와 거울 값 정합성', () => {
  /**
   * 파일 텍스트에 값이 **그대로 들어 있는지** 본다. 라인 번호는 안 쓴다(줄이 밀리면 낡는다).
   *
   * ── 따옴표를 요구하지 않는다 (2026-07-29 교정) ──────────────────────────
   * 첫 판본은 `'값'`·`"값"`·`` `값` `` 세 형태만 찾았다. 그래서 **CSS 인라인값을
   * 통째로 놓쳤다** — `player.js` 와 `world-boot.js` 의
   * `background: radial-gradient(..., #5f9e7d)` 는 따옴표가 없다.
   *
   * 하필 그 둘이 검수관이 가장 위험하다고 지적한 자리였다(*"두 파일이 완전히 동일한
   * CSS 규칙 문자열을 각자 갖고 있음"*). 그리고 첫 판본 주석은 그것을 "못 잡는 것"
   * 으로 적어뒀다 — **없는 한계를 문서화한 것**이다. 값은 텍스트에 그대로 있으니
   * 잡을 수 있다.
   *
   * 색은 대소문자를 무시한다(`#5F9E7D` 도 같은 색이다). 키 문자열은 대소문자가
   * 의미를 가지므로 `caseSensitive` 로 구분한다.
   */
  function assertValueInFile(
    filePath: string,
    value: string,
    context: string,
    { caseSensitive = true } = {},
  ) {
    const fullPath = path.resolve(__dirname, '..', filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const haystack = caseSensitive ? content : content.toLowerCase();
    const needle = caseSensitive ? value : value.toLowerCase();

    // 실패 메시지를 expect 에 넘긴다. 첫 판본은 `expect(found).toBe(true)` 뒤에
    // `throw new Error(...)` 를 뒀는데, expect 가 먼저 던지므로 **죽은 코드**였다 —
    // 어느 파일이 어긋났는지가 실제로는 안 나왔다.
    expect(
      haystack.includes(needle),
      `${context}: ${filePath} 에 값이 없다.\n`
      + `  SSOT 가 바뀌었다면 이 파일의 리터럴도 함께 고쳐야 한다.\n`
      + `  (이 미러는 CSP·인라인 스크립트 제약상 import 로 없앨 수 없다 — 파일 상단 주석 참조)`,
    ).toBe(true);
  }

  describe('SAVE_KEY — 공간 문서 저장 키', () => {
    // SSOT 값을 여기 다시 적지 않는다 — 그러면 이 테스트가 **또 하나의 미러**가 된다.
    // (첫 판본이 `expect(SAVE_KEY).toBe('openartshow.space.v1')` 를 넣었고, 뮤테이션에서
    //  난 FAIL 의 일부가 그 줄 때문이었다 — 미러 검출력이 과대평가돼 있었다.)
    // 값이 아니라 **형태**만 본다.
    it('SAVE_KEY 가 비어 있지 않은 문자열이다', () => {
      expect(typeof SAVE_KEY).toBe('string');
      expect(SAVE_KEY.length).toBeGreaterThan(0);
    });

    it('frontend/builder.html에 SAVE_KEY 미러가 있다', () => {
      assertValueInFile(
        'frontend/builder.html',
        SAVE_KEY,
        'SAVE_KEY (builder.html)'
      );
    });

    it('frontend/visit.html에 SAVE_KEY 미러가 있다', () => {
      assertValueInFile(
        'frontend/visit.html',
        SAVE_KEY,
        'SAVE_KEY (visit.html)'
      );
    });
  });

  describe('PLAN_KEY — 결제 플랜 키', () => {
    it('PLAN_KEY SSOT 값 확인', () => {
      expect(typeof PLAN_KEY).toBe('string');
      expect(PLAN_KEY.length).toBeGreaterThan(0);
    });

    it('frontend/landing.html에 PLAN_KEY 미러가 있다', () => {
      assertValueInFile(
        'frontend/landing.html',
        PLAN_KEY,
        'PLAN_KEY (landing.html)'
      );
    });
  });

  describe('GOLD — 브랜드 액센트 그린', () => {
    it('GOLD SSOT 값 확인', () => {
      expect(GOLD).toMatch(/^#[0-9a-f]{6}$/i);
    });

    // `player.js`·`world-boot.js` 는 CSS 인라인값이라 따옴표가 없다:
    //   `background: radial-gradient(..., #5f9e7d)`
    // 첫 판본은 이 둘을 "못 잡는 것" 으로 적었지만 **잡을 수 있다** — 값이 텍스트에
    // 그대로 있고, 검사가 따옴표를 요구하지 않게 고쳤다(`assertValueInFile` 주석).
    //
    // 하필 이 둘이 검수관이 가장 위험하다고 지적한 자리다 — 두 파일이 **완전히 동일한
    // CSS 규칙 문자열**을 각자 들고 있다. 한쪽만 고치면 조이스틱 달리기 표시가 두
    // 화면에서 다른 색이 된다.
    //
    // `player.js` 는 보호파일이라 import 하지 않고 텍스트로만 읽는다.
    it('frontend/js/player.js에 GOLD 미러가 있다 (CSS 인라인)', () => {
      assertValueInFile(
        'frontend/js/player.js',
        GOLD,
        'GOLD (player.js · CSS 인라인)',
        { caseSensitive: false },
      );
    });

    it('frontend/js/world-boot.js에 GOLD 미러가 있다 (CSS 인라인)', () => {
      assertValueInFile(
        'frontend/js/world-boot.js',
        GOLD,
        'GOLD (world-boot.js · CSS 인라인 — player.js 와 동일 규칙 문자열)',
        { caseSensitive: false },
      );
    });

    it('frontend/js/main-photo-util.ts에 GOLD 미러가 있다', () => {
      assertValueInFile(
        'frontend/js/main-photo-util.ts',
        GOLD,
        'GOLD (main-photo-util.ts)'
      );
    });

    it('frontend/js/hitfx.js에 GOLD 미러가 있다', () => {
      assertValueInFile(
        'frontend/js/hitfx.js',
        GOLD,
        'GOLD (hitfx.js)'
      );
    });

    it('frontend/js/ui-hud.ts에 GOLD 미러가 있다', () => {
      assertValueInFile(
        'frontend/js/ui-hud.ts',
        GOLD,
        'GOLD (ui-hud.ts)'
      );
    });
  });

  // 여기 `describe('미러 정합성 — 뮤테이션 테스트 지점')` 이 있었고 그 안에
  // `expect(SAVE_KEY).toBe('openartshow.space.v1')` 하나만 들어 있었다. 지웠다.
  //
  // 그 주석은 스스로 "SSOT 에서 값이 변하면 이 테스트는 통과한다" 고 적어놨는데,
  // 실제로는 리터럴을 박아뒀으니 **값이 바뀌면 이 단언이 먼저 깨졌다.** 그 FAIL 은
  // "미러가 어긋났다" 가 아니라 "테스트가 낡았다" 이고, 그래서 뮤테이션 결과를
  // 잘못 읽게 만든다 — 첫 뮤테이션에서 난 FAIL 개수에 이것이 섞여 있었다.
  //
  // 뮤테이션 지점은 별도 블록이 아니다. **위의 각 미러 존재 검사가 곧 그것**이다:
  // SSOT 를 바꾸면 미러가 안 따라와 해당 파일의 검사가 FAIL 한다.
});
