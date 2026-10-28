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
// - 못 잡는 것: 문자열 조립(rgb()/hsl() 표기)
//   (2026-08-09 이전에는 "design.html 제외(색 샘플 정당)"도 여기 있었다 — 그 페이지가
//    폐지되면서 예외 자체가 사라졌다. 경위는 `docs/DESIGN.md §5-4`)

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

    // ⚠ **미러가 사라졌다 — 그것이 개선이다**(2026-08-16, W8-3 S1).
    //
    // 이 검사는 원래 *"landing.html 에 PLAN_KEY 미러가 **있다**"* 를 단언했다. 그 시절
    // 랜딩은 키 문자열과 판정 로직(`=== 'premium'` · 해시 검증)을 **자기 안에 복제**하고
    // 있었고, 이 검사는 «복제된 값이 SSOT 와 같은가» 를 지켰다.
    //
    // 요금제를 층위(무료·프리미엄·특별 프리미엄)로 넓히면서 랜딩이 `studio-plan.js` 를
    // **직접 import** 하게 됐다 — 복제가 없어졌으므로 지킬 미러도 없다. 그래서 이 검사가
    // 빨간불이 됐고, **그것은 회귀가 아니라 목적 달성이다.**
    //
    // 단언을 뒤집는다: 이제 **미러가 다시 생기는 것**이 회귀다.
    it('★ landing.html 이 PLAN_KEY 를 복제하지 않는다 — 모듈에서 받는다', () => {
      const html = fs.readFileSync(path.resolve(__dirname, '..', 'frontend/landing.html'), 'utf8');
      // 주석은 걷어낸다 — 위 경위를 인용하는 것이 규율이고, 주석은 실행되지 않는다.
      const code = html.replace(/<!--[\s\S]*?-->/g, '');
      expect(code, `★ PLAN_KEY(${PLAN_KEY}) 가 랜딩에 다시 복제됐다 — 층위가 갈라진다`)
        .not.toContain(PLAN_KEY);
      expect(code, '★ 랜딩이 studio-plan 을 안 쓴다 — 판정이 또 따로 살게 된다')
        .toContain('studio-plan.js');
    });
  });

  describe('GOLD — 브랜드 액센트 그린', () => {
    it('GOLD SSOT 값 확인', () => {
      expect(GOLD).toMatch(/^#[0-9a-f]{6}$/i);
    });

    // ── ⚠ `player.js`·`world-boot.js` 의 GOLD 미러 검사는 **없앴다** (2026-08-24) ──
    //
    // 그 둘은 조이스틱 CSS 안에서 `background: radial-gradient(..., #5f9e7d)` 로 GOLD 를
    // 인라인으로 들고 있었고, 이 검사는 **그 미러가 존재하는지**를 확인했다. 검수관이
    // 가장 위험하다고 지적한 자리였기 때문이다 — 두 파일이 완전히 동일한 CSS 규칙
    // 문자열을 각자 갖고 있었고 한쪽만 고치면 두 화면의 색이 갈렸다.
    //
    // 감독 지시(*"전부 같게 해라"*)로 **다섯 곳의 조이스틱 CSS 가 전부
    // `js/shared/joystick-look.js` 한 곳에서 나온다.** 즉 미러가 사라졌고, 「미러가
    // 있는가」를 묻는 이 검사는 이제 **틀린 것을 요구한다.**
    //
    // ⚠ **검사를 줄인 것이 아니다** — 축이 옮겨 갔다. 대체는
    // `tests/joystick-single-source.test.ts` 이고 **더 넓게** 본다: 특정 두 파일이 아니라
    // `frontend/` 전체를 훑어 룩 값이 모듈 밖에 있으면 실패한다. 실제로 그 검사가
    // 내가 세다 놓친 **다섯 번째 조이스틱**(`lab-glb.js`)을 찾아냈다.
    //
    // ⚠⚠ **잃은 것**: GOLD 라는 브랜드 상수와 조이스틱 초록이 **같은 값이어야 한다**는
    // 연결은 이제 아무도 안 본다. 모듈은 자기 `GREEN` 을 따로 갖고 있다. 두 값이
    // 갈라져도 게이트는 조용하다 — 원래 이 검사가 지키던 것의 절반이고, 그것을
    // 되살리려면 모듈이 `ui-dom.ts` 의 GOLD 를 **가져다 써야** 한다. 그 편입은
    // 브랜드 상수와 세계 UI 의 결합이라 판단이 필요해 이번 회차에 하지 않았다.
    // 백로그: `G-UI4`.

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
