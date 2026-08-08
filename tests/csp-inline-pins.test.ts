// 소스 HTML 의 CSP 인라인 핀이 **실제 스크립트와 맞는가.**
//
// ── 왜 생겼나 (2026-08-08) ─────────────────────────────────────────────────
// 랜딩에 프로필 서브메뉴를 붙이면서 인라인 module 블록을 370줄 고쳤고, `script-src` 의
// `'sha256-…'` 핀은 그대로 뒀다. 그 결과 **그 블록이 소스에서 차단되는 상태**가 됐는데
// 어떤 게이트도 안 잡았다. 핀은 빌드가 실측해 재작성하는 값의 **사본**이라 값 미러링이고,
// 이 저장소가 이미 세 번 덴 형태다 — 한쪽만 고치면 아무도 모른다.
//
// **배포본은 안전하다**(vite 가 디스크 최종본을 실측해 다시 쓴다). 위험한 것은 소스를
// vite 없이 여는 경로다: `scripts/smoke/assemble.mjs` 의 baseline 이
// `cp frontend/landing.html "$OUT/index.html"` 로 원문을 그대로 쓰고, 로컬에서
// `frontend/` 를 정적 서버로 열 때도 마찬가지다.
//
// 그리고 그 블록에는 **햄버거 배선이 같이 들어 있다.** 차단되면 8/8 감독 실기기 사고
// (모바일에서 메뉴가 안 열려 사이트를 돌아다닐 수 없음)와 **증상이 같다.** 그 사고로
// 만든 `landing-inline-scope.test.ts` 는 스코프만 보므로 이 축을 대신하지 못한다.
//
// ── 내가 여기서 한 번 틀렸다 — 기록해 둔다 ──────────────────────────────────
// 첫 판정은 "핀에 없는 블록 = 차단" 이었고, 그래서 `builder.html`·`visit.html` 을
// **결함으로 오진**했다. 두 파일은 `script-src 'self' 'unsafe-inline'` 이라 해시가 하나도
// 없고, 그 조건에서는 `'unsafe-inline'` 이 유효해 인라인이 전부 허용된다. 반대로 해시가
// **하나라도** 있으면 `'unsafe-inline'` 은 무시된다(CSP3 §7.5). 분기를 안 넣으면 오탐과
// 누락이 동시에 생긴다 — 판정 규약은 `scripts/lib/csp-inline.mjs` 한 곳이다.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
// · **빌드 산출물은 안 본다.** vite 가 재작성하므로 원리상 항상 맞지만, 그 재작성이
//   고장 나는 것은 이 검사가 아니라 `verify-live` 의 콘솔 에러 축이 잡는다.
// · CSP 의 다른 디렉티브(`connect-src`·`frame-src` 등)는 대상 밖이다.
// · 인라인 **스타일**(`style-src 'unsafe-inline'`)은 안 본다.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { reconcilePins } from '../scripts/lib/csp-inline.mjs';

const FRONTEND = resolve(import.meta.dirname, '../frontend');
const PAGES = readdirSync(FRONTEND).filter((f) => f.endsWith('.html')).sort();

function report(file: string) {
  return reconcilePins(readFileSync(resolve(FRONTEND, file), 'utf8'));
}

/**
 * `'unsafe-inline'` 으로 인라인을 통째로 허용하는 페이지. **늘어나면 실패**한다 —
 * 해시 핀을 쓰는 페이지가 여기로 내려오는 것은 XSS 방어의 후퇴이고, 조용히 일어나면
 * 아무도 모른다. 줄이는 것(핀으로 승격)은 자유이고 그때 이 목록에서 지우면 된다.
 *
 * 두 파일 다 behind-flag 는 아니다 — `builder.html` 은 라이브다(studio 가 링크한다).
 * 핀 방식으로 승격하는 것은 백로그 `G-CSP1`.
 */
const UNSAFE_INLINE_PAGES = ['builder.html', 'visit.html'];

/**
 * 대응 블록이 없는 dead 핀이 남아 있는 페이지. 보안상 무해하지만(존재하지 않는
 * 스크립트를 허용) "왜 있는지 모르는 값" 이라 다음 사람을 오도한다.
 * **늘어나면 실패**한다 — 정리는 `G-CSP1`.
 */
const KNOWN_DEAD_PIN_PAGES = ['index.html', 'lab-glb.html', 'world.html'];

describe('측정기 생존 — 이것이 깨지면 아래 통과는 「안 쟀다」 는 뜻이다', () => {
  it('검사 대상 HTML 이 실재한다', () => {
    expect(PAGES.length).toBeGreaterThan(5);
  });

  it('해시 핀 방식을 실제로 쓰는 페이지가 있다', () => {
    // 전부 `'unsafe-inline'` 이 되면 `missing` 은 원리상 항상 0이 되고, 이 검사는
    // 아무것도 안 보면서 초록이 된다.
    const pinned = PAGES.filter((f) => report(f).pinned.size > 0);
    expect(pinned.length, '핀을 쓰는 페이지가 0이다 — 이 검사가 무의미해졌다').toBeGreaterThan(0);
  });

  it('실행되는 인라인 블록이 실재한다', () => {
    const total = PAGES.reduce((n, f) => n + report(f).scripts.length, 0);
    expect(total, '인라인 블록이 0이다 — 스캐너가 고장 났거나 규약이 어긋났다').toBeGreaterThan(0);
  });
});

describe('인라인 스크립트가 소스에서 차단되지 않는다', () => {
  for (const file of PAGES) {
    it(`${file}`, () => {
      const r = report(file);
      const detail = r.missing
        .map((s) => `  ${s.type || '(classic)'} 블록 — 실제 해시 ${s.hash}`)
        .join('\n');
      expect(
        r.missing.length,
        `허용될 근거가 없는 인라인 블록이 있다 — vite 를 안 거치는 경로에서 이 블록이 통째로 실행되지 않는다.\n`
        + `핀을 아래 값으로 갱신하라(빌드는 같은 규약으로 재작성한다):\n${detail}`,
      ).toBe(0);
    });
  }
});

describe('보안 등급이 조용히 내려가지 않는다', () => {
  it("'unsafe-inline' 을 쓰는 페이지가 늘지 않았다", () => {
    const actual = PAGES.filter((f) => report(f).unsafeInlineActive);
    // 늘었으면 해시 핀을 쓰던 페이지가 통째 허용으로 후퇴한 것이다.
    expect(actual).toEqual(UNSAFE_INLINE_PAGES);
  });

  it('dead 핀이 있는 페이지가 늘지 않았다', () => {
    const actual = PAGES.filter((f) => report(f).dead.length > 0);
    expect(actual).toEqual(KNOWN_DEAD_PIN_PAGES);
  });
});

describe('빌드와 검사가 같은 규약을 쓴다', () => {
  it('vite.config.js 가 이 모듈에서 해시를 유도한다 — 규약을 두 곳에 적지 않는다', () => {
    // 규약이 갈리면 "빌드는 통과했는데 검사가 빨간불"(또는 그 반대)이 성립한다.
    const cfg = readFileSync(resolve(import.meta.dirname, '../vite.config.js'), 'utf8');
    expect(cfg).toMatch(/import\s*\{[^}]*inlineExecScripts[^}]*\}\s*from\s*['"]\.\/scripts\/lib\/csp-inline\.mjs['"]/);
    // 옛 인라인 계산이 남아 있으면 그것이 곧 두 벌이다.
    expect(cfg, 'vite.config.js 가 아직 자체 해시 계산을 들고 있다').not.toMatch(/createHash\(['"]sha256['"]\)/);
  });
});
