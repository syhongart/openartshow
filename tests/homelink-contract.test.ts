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
// - **그룹 셀렉터 재선언**: `.a, .homelink { … }` 는 정규식이 안 잡는다 — 그렇게 쓰면
//   아래 「중복 금지」 축도 함께 빠져나간다(`ruleBody` 주석의 거짓 FAIL 절 참조).
//
// ── 2026-08-09 보강 — 검수관이 **승인 뒤에** 뮤테이션을 더 돌려 찾은 사각 둘 ───────
// 둘 다 병합 차단은 아니었으나 하나는 실제 위험이었다:
//   S1 **거짓 통과**: `mypage.css` 하단에 `.homelink { font-size:20px }` 를 덧붙이면
//      17 passed 였다(CSS 는 나중 규칙이 이기는데 첫 매치만 봤다) → `ruleBody` 가
//      중복을 **던진다** + 아래 전용 항목이 명시적으로 단언한다.
//   S2 **거짓 FAIL**: `var(--accent, #1e6742)` 처럼 fallback 만 붙여도 1 failed 였다
//      → `resolveToken` 이 fallback 인자를 읽는다.
// 교훈은 값이 아니라 절차다 — *"뮤테이션은 「몇 종을 돌렸나」가 아니라 「어느 축을
// 돌렸나」다. 요구자가 예시로 적은 뮤테이션만 돌리면 요구자가 고른 축만 검증된다."*
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
 * 최상위에서 `selector { … }` 블록 본문을 **전부** 꺼낸다.
 * 중첩(`@media`) 안쪽은 보지 않는다 — 위 「못 잡는 것」에 적은 그대로다.
 *
 * ⚠ `selector` 는 **이미 정규식으로 이스케이프된 문자열**을 받는다(`'\\.homelink'`).
 * 첫 판본은 여기서 한 번 더 이스케이프해서 `\.homelink` 가 `\\\.homelink` 가 됐고,
 * 존재하지 않는 백슬래시를 찾느라 **모든 블록을 못 찾았다**. 15 failed 로 즉시
 * 드러났다 — 초록으로 고장났으면 그대로 붙었을 것이다(이 사이클에 그 형태를
 * 디자이너가 두 번, 검수관이 한 번 겪었다).
 */
function ruleBodies(css: string, selector: string): string[] {
  const src = decomment(css);
  const re = new RegExp(`(^|[};])\\s*${selector}\\s*\\{`, 'gm');
  const out: string[] = [];
  for (const m of src.matchAll(re)) {
    const start = src.indexOf('{', m.index + m[0].length - 1) + 1;
    let depth = 1;
    for (let i = start; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') {
        depth -= 1;
        if (depth === 0) { out.push(src.slice(start, i)); break; }
      }
    }
  }
  return out;
}

/**
 * 한 블록만 꺼낸다. **중복이 있으면 던진다** — 통과가 아니라 실패로 만든다.
 *
 * ── 왜 (검수관 사각 S1, 2026-08-09) ────────────────────────────────────────
 * 첫 판본은 `re.exec` 로 **첫 매치만** 봤다. 그런데 CSS 는 같은 명시도면 **나중 규칙이
 * 이긴다** — 검수관이 `mypage.css` **하단에** `.homelink { font-size: 20px }` 를 덧붙이자
 * 화면은 갈렸는데 이 검사는 **17 passed** 였다. 값 미러링을 막으려고 만든 게이트가
 * 미러링의 가장 흔한 형태(같은 파일 안 중복 선언)를 **원리상 못 보고 있었다.**
 *
 * 처방으로 「마지막 매치를 본다」가 아니라 **「중복 자체를 금지한다」** 를 골랐다
 * (검수관 권고 ⓑ). 이 게이트의 목적이 *"값이 두 곳에 있어도 갈리지 않게"* 인데,
 * 한 파일 안의 중복을 허용하면 값이 사는 자리가 **셋**이 된다 — 목적과 정면으로 어긋난다.
 *
 * 거짓 FAIL 위험: 낮다. 이 정규식은 앞이 `^`·`}`·`;` 일 때만 잡으므로
 * `.homelink.is-active {`(셀렉터가 다름)도, `.a, .homelink {`(앞이 `,`)도 안 걸린다.
 * ⚠ **뒤집으면 그 둘은 「중복이어도 못 잡는다」는 뜻이기도 하다** — 그룹 셀렉터로
 * 다시 선언하면 이 검사를 빠져나간다. 실측(2026-08-09): 지금 두 파일에 `.homelink`
 * 최상위 선언은 각 1건이고 그룹 선언은 0건이다.
 */
function ruleBody(css: string, selector: string): string | null {
  const all = ruleBodies(css, selector);
  if (all.length > 1) {
    throw new Error(
      `«${selector}» 최상위 규칙이 ${all.length}개다 — CSS 는 나중 규칙이 이기므로 ` +
        '값이 어느 것인지 이 검사로는 판정할 수 없다. 중복 선언을 하나로 합쳐라.',
    );
  }
  return all[0] ?? null;
}

/** 블록 본문에서 한 속성값을 꺼낸다(공백 정규화). */
function decl(body: string, prop: string): string | null {
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'm');
  const m = re.exec(body);
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}

/**
 * `var(--x)` → 페이지 `:root` → `tokens.css` 로 내려가 종단 hex 를 얻는다.
 *
 * ── fallback 인자를 받는다 (검수관 사각 S2, 2026-08-09) ──────────────────────
 * 첫 판본의 정규식은 `^var\(\s*(--[\w-]+)\s*\)$` 라 **`var(--x, 기본값)` 표기를 아예
 * 못 읽었다.** 검수관이 `var(--accent)` → `var(--accent, #1e6742)`(값은 동일, fallback 만
 * 추가)로 바꾸자 **1 failed** — 화면은 1픽셀도 안 바뀌는데 게이트가 울었다.
 * 남의 표기가 아니다: 이 저장소가 실제로 쓰는 형태이고(`gallery.css:166`), 거짓 FAIL 은
 * 거짓 통과보다 조용히 비싸다 — 매번 우는 경보는 결국 아무도 안 보게 된다.
 *
 * 해석 순서는 **CSS 실제 동작과 같다**: 토큰이 정의돼 있으면 그 값, 없을 때만 fallback.
 * 그래서 fallback 이 정의값과 달라도 검출력이 죽지 않는다 — 정의값끼리 비교한다.
 */
function resolveToken(value: string, pageRoot: string, tokens: string): string {
  let cur = value.trim();
  for (let i = 0; i < 8; i += 1) {
    const m = /^var\(\s*(--[\w-]+)\s*(?:,([\s\S]*))?\)$/.exec(cur);
    if (!m) return cur.toLowerCase();
    const name = m[1];
    const fallback = m[2]?.trim();
    const next = decl(pageRoot, name) ?? decl(tokens, name) ?? (fallback || undefined);
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

  // 검수관 사각 S1. 위 `A`·`B` 는 모듈 로드 시점에 `ruleBody` 를 거치므로 중복이 있으면
  // 이 파일 전체가 이미 터진다 — 그래도 여기서 **한 번 더 명시적으로** 센다.
  // 이유: 던지기만 하면 실패가 «어느 셀렉터의 몇 개» 인지 스택에 묻히고, 무엇보다
  // 「이 게이트가 중복을 본다」가 테스트 이름으로 **읽히지 않는다**. 읽히지 않는 보호는
  // 다음 사람이 같은 뮤테이션을 다시 돌려서야 존재를 안다.
  it.each([
    ['studio.html', () => studioCss],
    ['mypage.css', () => decomment(mypageCss)],
  ])('%s — `.homelink` 계열이 한 파일 안에서 **중복 선언되지 않았다**', (_f, get) => {
    const css = get();
    for (const sel of ['\\.homelink', '\\.homelink svg', '\\.homelink \\.dot', '\\.homelink:hover']) {
      const n = ruleBodies(css, sel).length;
      expect(n, `«${sel}» 이 ${n}개 선언됐다 — 나중 규칙이 이기므로 값이 조용히 갈린다`).toBeLessThan(2);
    }
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
