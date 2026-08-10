// 대문의 인라인 스크립트가 **자기 스코프 밖의 이름을 부르지 않는가.**
//
// ── 왜 이 파일이 생겼나 (감독 실기기 2026-08-08) ─────────────────────────────
// 감독: *"지금 햄버거 버튼이 안열려."*
//
// 원인은 스코프였다. `escapeHtml` 은 `<script>` 블록 안 IIFE 에 갇혀 있는데,
// 별도 스코프인 `<script type="module">` 이 그 이름을 불렀다 →
// `ReferenceError: escapeHtml is not defined` → 그 아래 **햄버거 배선이 통째로 실행되지
// 않았다.** 모바일에서 메뉴가 안 열리니 사이트를 돌아다닐 수 없었다.
//
// ── 왜 어떤 게이트도 못 잡았나 (이쪽이 더 중요하다) ─────────────────────────
// ① 그 호출은 **로그인했을 때만** 도달한다(`getProfile()` 이 프로필을 주는 가지).
//    스모크·`verify-live` 는 전부 **로그아웃 상태**로 페이지를 연다 → 전부 초록.
// ② `check:refs`(no-undef)는 `frontend/js` 의 `.ts` 만 본다
//    (`scripts/smoke/check-refs.mjs`: `SRC = frontend/js`). **HTML 인라인 스크립트는
//    대상 밖**이다. 같은 형태의 결함(TS2304 = Cannot find name)인데 파일 종류가 달라
//    사각에 빠졌다.
//
// 여기서는 ②의 좁은 판본을 막는다 — **인라인 스크립트 블록 사이의 스코프 누수**.
// 완전한 no-undef 는 아니다(아래 「이 검사가 못 잡는 것」).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const FILE = 'frontend/landing.html';

interface Block { module: boolean; body: string; index: number }

/** `src=` 없는 인라인 `<script>` 블록만 뽑는다. */
function inlineBlocks(html: string): Block[] {
  const out: Block[] = [];
  const re = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(html)) !== null) {
    out.push({ module: /type\s*=\s*["']module["']/.test(m[1]), body: m[2], index: i++ });
  }
  return out;
}

/**
 * 주석과 문자열 리터럴을 지운 사본. **분석은 이것으로 한다.**
 * 첫 판본은 이걸 안 해서 주석 속 `IIFE(` 를 호출로 셌다 — 오탐이 나면 경고가 무시되고,
 * 무시되는 경고는 없는 것과 같다(`hookify` 규칙에서 같은 교훈을 이미 치렀다).
 */
function strip(body: string): string {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
}

/**
 * 이 블록이 **선언한** 이름(함수·변수·클래스·**매개변수**). 정규식이라 근사값이다.
 * 매개변수를 빠뜨렸다가 `onOpen` 을 스코프 밖 호출로 오판했다 — 콜백을 인자로 받아
 * 부르는 것은 이 파일에서 흔한 형태다.
 */
function declared(body: string): Set<string> {
  const s = new Set<string>();
  for (const m of body.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)) s.add(m[1]);
  for (const m of body.matchAll(/\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)/g)) s.add(m[1]);
  for (const m of body.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)) s.add(m[1]);
  // 매개변수: `function (a, b)` · `(a, b) =>` · `catch (e)`
  for (const m of body.matchAll(/(?:\bfunction\b[^(]*|\bcatch\s*)\(([^)]*)\)/g)) {
    for (const p of m[1].split(',')) {
      const n = p.trim().replace(/=[\s\S]*$/, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) s.add(n);
    }
  }
  for (const m of body.matchAll(/\(([^)]*)\)\s*=>/g)) {
    for (const p of m[1].split(',')) {
      const n = p.trim().replace(/=[\s\S]*$/, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) s.add(n);
    }
  }
  for (const m of body.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) s.add(m[1]);
  return s;
}

/** `import { a, b } from '...'` / `import x from '...'` 로 들어온 이름. */
function imported(body: string): Set<string> {
  const s = new Set<string>();
  for (const m of body.matchAll(/\bimport\s*\{([^}]*)\}\s*from/g)) {
    for (const part of m[1].split(',')) {
      const name = part.split(/\bas\b/).pop()!.trim();
      if (name) s.add(name);
    }
  }
  for (const m of body.matchAll(/\bimport\s+([A-Za-z_$][\w$]*)\s+from/g)) s.add(m[1]);
  return s;
}

/** 호출된 이름 — `foo(` 중 앞에 `.` 이 없는 것(메서드 호출 제외). */
function called(body: string): Set<string> {
  const s = new Set<string>();
  for (const m of body.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) s.add(m[2]);
  return s;
}

// 호출 형태로 잡히지만 이름이 아닌 것 + 브라우저/표준 전역.
const IGNORE = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'new',
  'do', 'else', 'try', 'await', 'void', 'delete', 'in', 'of', 'case', 'yield',
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Math', 'JSON', 'Date', 'RegExp',
  'Error', 'Promise', 'Set', 'Map', 'Symbol', 'parseInt', 'parseFloat', 'isNaN',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'requestAnimationFrame',
  'cancelAnimationFrame', 'fetch', 'alert', 'confirm', 'encodeURIComponent',
  'decodeURIComponent', 'IntersectionObserver', 'ResizeObserver', 'MutationObserver',
  'URL', 'URLSearchParams', 'FormData', 'Image', 'CustomEvent', 'Event', 'AbortController',
  'getComputedStyle', 'matchMedia', 'structuredClone', 'queueMicrotask',
]);

describe('대문 인라인 스크립트 — 블록 간 스코프 누수', () => {
  const html = readFileSync(FILE, 'utf8');
  const blocks = inlineBlocks(html);

  it('인라인 블록이 실재한다 — 0건이면 이 검사가 아무것도 안 보는 것이다', () => {
    // 측정기 생존 확인. 이것이 없으면 아래 통과가 "깨끗하다" 인지 "안 쟀다" 인지 모른다.
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.some((b) => b.module), 'module 블록이 없다').toBe(true);
  });

  // 각 블록이 부르는 이름은 **그 블록 안에서 해결**돼야 한다. 다른 `<script>` 블록이
  // IIFE 로 감싸져 있으면 그 안의 함수는 밖에서 안 보이는데, 같은 파일에 나란히 있어서
  // 눈으로는 "있는 것처럼" 읽힌다 — 이번 사고가 정확히 그 형태였다.
  for (const b of blocks) {
    it(`블록 #${b.index}${b.module ? '(module)' : ''} — 자기 스코프 밖 이름을 부르지 않는다`, () => {
      const src = strip(b.body);
      const own = declared(src);
      const imp = imported(src);

      // ── 판정 범위: **다른 블록에 갇힌 이름을 부르는 것**만 실패로 친다 ──────
      // 완전한 no-undef 를 정규식으로 흉내 내면 오탐과 계속 싸운다 — 실제로 첫 판본은
      // 템플릿 리터럴 안의 CSS(`repeat(`·`minmax(`·`translateX(`)를 호출로 셌다.
      // 늑대소년이 된 경고는 곧 무시되므로, **이번 사고와 같은 형태**로 좁힌다:
      // 같은 파일에 나란히 있어 눈으로는 "있는 것처럼" 읽히지만 스코프가 다른 이름.
      // 미지의 전역(오타·삭제된 함수)은 여기서 안 잡힌다 — 위 「못 잡는 것」에 적었다.
      const detail = [...called(src)]
        .filter((n) => !own.has(n) && !imp.has(n) && !IGNORE.has(n))
        .map((n) => {
          const from = blocks.find((o) => o.index !== b.index && declared(strip(o.body)).has(n));
          return from ? `${n} (블록 #${from.index} 안에 갇혀 있다 — 그 블록 밖에서는 안 보인다)` : null;
        })
        .filter(Boolean);

      expect(detail, `다른 블록에 갇힌 이름 호출:\n  ${detail.join('\n  ')}`).toEqual([]);
    });
  }
});

// ── 이 검사가 못 잡는 것 (적지 않으면 통과를 과신하게 된다) ──────────────────
// · **`frontend/landing.html` 한 파일만** 본다. 다른 페이지의 인라인 스크립트는 대상 밖이다.
// · 정규식 파싱이라 근사값이다 — 문자열·주석 안의 `foo(` 도 호출로 셀 수 있고(과탐),
//   `obj[name]()` 같은 동적 호출은 못 본다(누락).
// · **호출만** 본다. `escapeHtml` 을 부르지 않고 값으로만 참조하면(`var f = escapeHtml`)
//   안 걸린다.
// · 근본 처방은 `check:refs` 를 HTML 인라인 스크립트까지 넓히는 것이다 — 그쪽은
//   `scripts/smoke/**` 변경이라 검수관 게이트를 거쳐야 하므로 후속으로 분리했다.
// · **로그인 상태로 페이지를 여는 축은 아직 0이다.** 이번 사고가 로그아웃 스모크를
//   전부 통과한 이유가 그것인데, 이 검사는 정적이라 그 축을 대신하지 못한다.
