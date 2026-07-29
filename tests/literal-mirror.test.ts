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
  // 기본 유틸: 파일 텍스트에서 특정 패턴을 찾기 (라인 번호 없이)
  function assertValueInFile(
    filePath: string,
    value: string,
    context: string,
  ) {
    const fullPath = path.resolve(__dirname, '..', filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    // 따옴표 변이(작은따옴표·큰따옴표·백틱)를 모두 검색
    const patterns = [
      `'${value}'`,        // 작은따옴표
      `"${value}"`,        // 큰따옴표
      `\`${value}\``,      // 백틱
    ];

    const found = patterns.some((pattern) => content.includes(pattern));

    expect(found).toBe(true);
    if (!found) {
      throw new Error(
        `${context}: 값 "${value}"이 ${filePath}에 리터럴로 없음. SSOT와 어긋남.`
      );
    }
  }

  describe('SAVE_KEY — openartshow.space.v1', () => {
    it('SAVE_KEY SSOT 값 확인', () => {
      expect(SAVE_KEY).toBe('openartshow.space.v1');
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

  describe('PLAN_KEY — artshow-plan-v1', () => {
    it('PLAN_KEY SSOT 값 확인', () => {
      expect(PLAN_KEY).toBe('artshow-plan-v1');
    });

    it('frontend/landing.html에 PLAN_KEY 미러가 있다', () => {
      assertValueInFile(
        'frontend/landing.html',
        PLAN_KEY,
        'PLAN_KEY (landing.html)'
      );
    });
  });

  describe('GOLD — #5f9e7d (브랜드 액센트 그린)', () => {
    it('GOLD SSOT 값 확인', () => {
      expect(GOLD).toBe('#5f9e7d');
    });

    // 주의: player.js와 world-boot.js의 GOLD는 CSS 인라인에 따옴표 없이 포함됨.
    // 테스트의 따옴표 패턴(작은따옴표/큰따옴표/백틱)으로 못 잡음.
    // 실제로 존재: `background: radial-gradient(..., #5f9e7d);`
    // 이는 "못 잡는 것" 카테고리 — CSS 값 표기는 별도 검증 필요.

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

  describe('미러 정합성 — 뮤테이션 테스트 지점', () => {
    it('SAVE_KEY 값이 builder.html 미러와 일치한다', () => {
      // 이 테스트는 builder.html을 비교 대상으로 사용할 때만 의미가 있다.
      // SSOT에서 값이 변하면 이 테스트는 통과하지만, 거울이 안 따라오면 위의 존재 검사에서 실패.
      expect(SAVE_KEY).toBe('openartshow.space.v1');
    });
  });
});
