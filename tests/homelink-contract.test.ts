// tests/homelink-contract.test.ts — `.homelink` 두 페이지 동형 계약
//
// ── 왜 이 파일이 생겼나 (검수관 블로커 B1, 2026-08-09) ────────────────────────
// `studio.html` 과 `mypage.css` 가 `.homelink` 의 CSS 값 9개와 마크업 5줄을 **각각**
// 적었다. 그 값 미러링을 정당화한 근거가 *"`tests/homelink-contract.test.ts` 가 지킨다"*
// 라는 두 주석이었는데 **그 파일이 없었다.** 한쪽만 고쳐도 아무 일이 안 일어났다.
//
// 게시판 바로 아래 항목(디자이너가 `palette.ts` 에서 없는 테스트 파일을 게이트로 인용)과
// **같은 형태이고 하루 만에 재발**했다. 검수관 판정: *"같은 형태가 이틀 연속이면 개인의
// 부주의가 아니라 **주석에 게이트 이름을 적는 행위에 아무 검사가 없다**는 구조 문제다."*
//
// 그래서 문장을 고치는 대신 **주장을 참으로 만든다** — GS-3 이 같은 처방이었다.
// (「게이트 이름이 실재하는가」를 세는 축은 별건으로 백로그에 남긴다.)
//
// ── 무엇을 보는가 ───────────────────────────────────────────────────────────
// ① 형태값(치수·자간 등)은 **문자열로 동일**해야 한다.
// ② 색은 이름이 달라도(`--violet-ink` vs `--accent`) **체인 종단이 같아야** 한다 —
//    두 페이지의 2층 토큰 이름이 다른 것은 의도다(각자 자기 페이지 어휘를 쓴다).
// ③ 마크업은 정규화 후 동일해야 한다.
//
// ── 못 잡는 것 (검수관 명세) ────────────────────────────────────────────────
// - **렌더 결과**: 두 로고가 화면에서 같아 보이는지는 안 본다(정적 검사다).
// - **둘이 함께 틀리는 경우**: 동형만 보고 «옳음»은 안 본다. 12px 하한(§4-5)이나
//   자간 정본 같은 판정은 각 파일 주석이 지고 이 검사는 그것을 모른다.
// - **`@media` 안의 재정의**: 최상위 블록만 본다. 한쪽이 미디어쿼리에서 값을 덮으면
//   여기는 통과한다.
// - ⚠ **파서의 사각을 상속한다**: `link-color-safety.test.ts` 의 헬퍼를 재사용하는데,
//   그 파일이 실제로 두 번 고장났다(HTML 통째 파싱 시 `<script>` 중괄호가 깊이에
//   섞임 / CSS 주석이 셀렉터에 붙음). 여기서는 `<style>` 본문만 떼어 쓰고 주석을
//   먼저 지워 그 둘을 피했으나, **그 헬퍼가 바뀌면 이 검사도 함께 흔들린다.**

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = (p: string): string => readFileSync(resolve(ROOT, p), 'utf8');

/** `<style>` 본문만 이어 붙인다 — `<script>` 의 중괄호를 깊이에 섞지 않기 위해서다. */
function styleText(html: string): string {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
}

/** CSS 주석 제거 — 주석이 셀렉터에 붙어 매칭이 빗나가는 것을 막는다. */
const decomment = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * 최상위에서 `selector { … }` 블록 본문을 꺼낸다.
 * 중첩(`@media`) 안쪽은 보지 않는다 — 위 「못 잡는 것」에 적은 그대로다.
 *
 * ⚠ `selector` 는 **이미 정규식으로 이스케이프된 문자열**을 받는다(`'\\.homelink'`).
 * 첫 판본은 여기서 한 번 더 이스케이프해서 `\.homelink` 가 `\\\.homelink` 가 됐고,
 * 존재하지 않는 백슬래시를 찾느라 **모든 블록을 못 찾았다**. 15 failed 로 즉시
 * 드러났다 — 초록으로 고장났으면 그대로 붙었을 것이다(이 사이클에 그 형태를
 * 디자이너가 두 번, 검수관이 한 번 겪었다).
 */
function ruleBody(css: string, selector: string): string | null {
  const src = decomment(css);
  const re = new RegExp(`(^|[};])\\s*${selector}\\s*\\{`, 'm');
  const m = re.exec(src);
  if (!m) return null;
  const start = src.indexOf('{', m.index + m[0].length - 1) + 1;
  let depth = 1;
  for (let i = start; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i);
    }
  }
  return null;
}

/** 블록 본문에서 한 속성값을 꺼낸다(공백 정규화). */
function decl(body: string, prop: string): string | null {
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'm');
  const m = re.exec(body);
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}

/** `var(--x)` → 페이지 `:root` → `tokens.css` 로 내려가 종단 hex 를 얻는다. */
function resolveToken(value: string, pageRoot: string, tokens: string): string {
  let cur = value.trim();
  for (let i = 0; i < 8; i += 1) {
    const m = /^var\(\s*(--[\w-]+)\s*\)$/.exec(cur);
    if (!m) return cur.toLowerCase();
    const name = m[1];
    const next = decl(pageRoot, name) ?? decl(tokens, name);
    if (!next) return `«${name} 미해결»`;
    cur = next;
  }
  return '«순환»';
}

describe('.homelink — studio·mypage 동형 계약', () => {
  const studioHtml = read('frontend/studio.html');
  const mypageCss = read('frontend/css/mypage.css');
  const mypageHtml = read('frontend/mypage.html');
  const tokens = decomment(read('frontend/css/tokens.css'));

  const studioCss = decomment(styleText(studioHtml));
  const studioRoot = ruleBody(studioCss, ':root') ?? '';
  const mypageRoot = ruleBody(decomment(styleText(mypageHtml)), ':root') ?? '';

  const A = ruleBody(studioCss, '\\.homelink');
  const B = ruleBody(decomment(mypageCss), '\\.homelink');

  it('두 곳에 규칙이 **둘 다** 있다 — 한쪽이 사라지면 계약이 깨진다', () => {
    expect(A, 'studio.html 의 <style> 에서 .homelink 를 못 찾았다').not.toBe(null);
    expect(B, 'frontend/css/mypage.css 에서 .homelink 를 못 찾았다').not.toBe(null);
  });

  // 형태값 — 문자열로 같아야 한다. 색은 아래에서 따로 본다(이름이 달라도 되기 때문).
  const SHAPE = [
    'display', 'width', 'align-items', 'gap', 'margin-bottom',
    'font-size', 'font-weight', 'letter-spacing', 'text-decoration', 'transition',
  ];
  it.each(SHAPE)('형태값 `%s` 가 두 곳에서 같다', (prop) => {
    const a = decl(A!, prop);
    const b = decl(B!, prop);
    expect(a, `studio 쪽에 ${prop} 선언이 없다`).not.toBe(null);
    expect(b, `mypage 쪽에 ${prop} 선언이 없다`).not.toBe(null);
    expect(b, `${prop} 이 갈렸다 — studio="${a}" vs mypage="${b}"`).toBe(a);
  });

  it('svg 치수·선 굵기가 같다', () => {
    const a = ruleBody(studioCss, '\\.homelink svg');
    const b = ruleBody(decomment(mypageCss), '\\.homelink svg');
    expect(a, 'studio 의 .homelink svg 규칙이 없다').not.toBe(null);
    expect(b, 'mypage 의 .homelink svg 규칙이 없다').not.toBe(null);
    for (const prop of ['width', 'height', 'stroke-width']) {
      expect(decl(b!, prop), `svg ${prop} 이 갈렸다`).toBe(decl(a!, prop));
    }
  });

  it('`.dot` 흐림값이 같다', () => {
    const a = ruleBody(studioCss, '\\.homelink \\.dot');
    const b = ruleBody(decomment(mypageCss), '\\.homelink \\.dot');
    expect(decl(b!, 'opacity'), '.dot opacity 가 갈렸다').toBe(decl(a!, 'opacity'));
  });

  // 색 — **이름이 다른 것은 의도**다(각 페이지가 자기 2층 어휘를 쓴다).
  // 그래서 이름이 아니라 체인 종단을 비교한다.
  it.each([
    ['.homelink 본문색', '\\.homelink', 'color'],
    ['.w-lead 강조색', '\\.homelink \\.w-lead', 'color'],
    ['hover 색', '\\.homelink:hover', 'color'],
  ])('%s 은 토큰 이름이 달라도 **종단 값이 같다**', (_label, sel, prop) => {
    const rawA = decl(ruleBody(studioCss, sel) ?? '', prop);
    const rawB = decl(ruleBody(decomment(mypageCss), sel) ?? '', prop);
    expect(rawA, `studio 의 ${sel} { ${prop} } 을 못 찾았다`).not.toBe(null);
    expect(rawB, `mypage 의 ${sel} { ${prop} } 을 못 찾았다`).not.toBe(null);
    const a = resolveToken(rawA!, studioRoot, tokens);
    const b = resolveToken(rawB!, mypageRoot, tokens);
    expect(a, `studio 쪽 토큰 체인이 안 풀렸다: ${rawA}`).toMatch(/^#|^rgb/);
    expect(b, `mypage 쪽 토큰 체인이 안 풀렸다: ${rawB}`).toMatch(/^#|^rgb/);
    expect(b, `${sel} 의 최종 색이 갈렸다 — studio ${rawA}=${a} vs mypage ${rawB}=${b}`).toBe(a);
  });

  it('마크업이 같다 — 두 페이지의 홈 링크는 같은 물건이어야 한다', () => {
    const pick = (html: string): string | null => {
      const m = /<a class="homelink"[\s\S]*?<\/a>/.exec(html);
      return m ? m[0].replace(/\s+/g, ' ').trim() : null;
    };
    const a = pick(studioHtml);
    const b = pick(mypageHtml);
    expect(a, 'studio.html 에 .homelink 마크업이 없다').not.toBe(null);
    expect(b, 'mypage.html 에 .homelink 마크업이 없다').not.toBe(null);
    expect(b, '마크업이 갈렸다 — svg path·워드마크 구조·href·aria-label 중 하나가 다르다').toBe(a);
  });
});
