// tests/link-color-safety.test.ts — 「글자색 선언이 빠져 UA 기본값이 나오는 것」을 막는 축
//
// ── 무엇을 잡는가 ──────────────────────────────────────────────────────────
// 2026-08-09, 홈 전시 카드의 제목이 **진파랑(#0000EE)** 이었다. 다크 카드(#1F2128)
// 위 대비 **1.71**. 원인은 색을 잘못 고른 것이 아니라 **아무도 안 고른 것**이다:
// 그 카드는 `<a>` 인데(`createElement("a")`) `.exh-card` 에 `color` 선언이 없었고,
// 페이지에도 `a` 기본 글자색이 없어서 브라우저 UA 스타일시트의 링크색이 그대로 나왔다.
// 형제(`.exh-meta`·`.exh-enter`)는 자기 색이 있어 멀쩡했다 — 그래서 「한 줄만 파랗다」로
// 보였고, 그 형태 때문에 오래 살아남았다.
//
// **이 검사는 그 사고를 「잡는」 것이 아니라 「일어날 수 없게」 만든 것을 지킨다.**
// 처방이 `a { color: inherit }` 안전망이었기 때문이다 — 안전망이 있으면 색을 안 준
// 링크는 파랑이 아니라 문맥의 잉크를 받는다. 그러므로 여기서 지켜야 하는 것은
// 「카드에 color 가 있는가」가 아니라 **「안전망이 그대로 있는가」** 다.
//
// ── 왜 계산색을 안 보는가 (못 재는 것) ────────────────────────────────────
// 가장 정확한 축은 실브라우저에서 `getComputedStyle(...).color` 가 UA 기본색
// (`rgb(0, 0, 238)` / `rgb(85, 26, 139)`)인지 보는 것이고, 실제로 그렇게 실측했다
// (2026-08-09: 7페이지 × 1440 — **보이는 요소 중 UA 기본색 0**). 그러나 그 축은
// jsdom 으로 재현되지 않는다. jsdom 은 UA 스타일시트의 링크색을 구현하지 않아서
// **결함이 있어도 통과한다** — 즉 여기 두면 검출력이 0 인 장식이 된다.
// 브라우저를 띄우는 축은 게이트가 아니라 스모크 소관이다(`npm run gate` 는 브라우저를
// 안 띄운다 — `scripts/gate.mjs` 헤더).
//
// 그래서 이 파일은 **정적 축**만 맡고, 그 한계를 위에 적어 둔다.
// 여기 초록이 「라이브에 파란 링크가 없다」를 뜻하지 않는다. 뜻하는 것은
// 「파랑이 나올 자리를 막아 둔 페이지 목록이 안 줄었다」뿐이다.
//
// ── 양방향으로 센다 ────────────────────────────────────────────────────────
// 안전망이 **있는** 페이지와 **없는** 페이지를 둘 다 박아 둔다. 한쪽만 세면
// ① 안전망을 지워도 「없음」 목록이 늘 뿐 아무도 모르고 ② 새로 안전망을 깐 페이지가
// 목록에서 빠져 산문이 낡는다. GS-3 이 `CLAUDE.md` 의 behind-flag 목록을 양방향으로
// 대조하는 것과 같은 형태다.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { LIVE_ENTRIES, srcPath } from '../scripts/lib/entrypoints.mjs';

const ROOT = resolve(import.meta.dirname, '..');

/**
 * 최상위(깊이 1) CSS 규칙만 순회한다. `@media` 안의 규칙은 **조건부라 안전망이 아니다**
 * — 뷰포트가 조건을 벗어나면 사라진다. 실제로 `landing.html` 의 `.nav-sheet > a` 는
 * `@media (max-width: 860px)` 안에 있어서, 1440 에서는 시트 링크가 전부 UA 기본색이다
 * (화면에 안 보여 무해할 뿐이다). 깊이를 안 세면 그런 규칙을 안전망으로 잘못 센다.
 */
function topLevelRules(source: string): { selector: string; body: string }[] {
  // ⚠ **주석을 먼저 걷는다.** 안 걷으면 규칙 앞의 주석이 셀렉터에 통째로 붙어
  // (`/* … */ a` 가 셀렉터가 된다) 매칭이 전부 빗나간다. 이 저장소는 주석이 긴
  // 편이라 사실상 모든 규칙이 영향을 받는다 — 실제로 첫 판본이 그렇게 빗나갔다.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: { selector: string; body: string }[] = [];
  let depth = 0;
  let buf = '';
  let selector = '';
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      depth++;
      if (depth === 1) { selector = buf.trim(); buf = ''; continue; }
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        // `@media`·`@supports` 같은 at-rule 블록은 내용을 버린다(조건부).
        if (!selector.startsWith('@')) rules.push({ selector, body: buf });
        buf = '';
        selector = '';
        continue;
      }
    }
    buf += ch;
  }
  return rules;
}

/** 규칙 하나가 `a` **자체**를 겨냥하면서 `color` 를 주는가 */
function isLinkColorSafetyNet(selector: string, body: string): boolean {
  if (!/(^|;)\s*color\s*:/.test(';' + body)) return false;
  return selector.split(',').some((s) => /^a(:link|:any-link|:-webkit-any-link)?$/.test(s.trim()));
}

/**
 * 페이지의 `<style>` 블록 + 그 페이지가 `<link rel=stylesheet>` 로 부르는 로컬 CSS.
 *
 * ⚠ **HTML 을 통째로 넘기면 안 된다.** 첫 판본이 그랬고 파서가 조용히 망가졌다 —
 * `<script>` 안 JS 의 중괄호까지 깊이에 세어져서, 안전망을 실제로 넣은 `landing.html`
 * 이 「없음」으로 판정됐다. 더 나쁜 것은 `guide`·`about`·`studio` 가 그 상태로
 * **통과했다**는 점이다(깊이가 우연히 맞았다). 초록이 근거가 아니었다.
 */
function styleTextOf(htmlPath: string): string {
  const html = readFileSync(htmlPath, 'utf8');
  let text = '';
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) text += m[1] + '\n';
  for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/g)) {
    const href = m[0].match(/href=["']([^"']+)["']/)?.[1];
    if (!href || /^(https?:)?\/\//.test(href)) continue;
    const cssPath = join(dirname(htmlPath), href);
    if (existsSync(cssPath)) text += '\n' + readFileSync(cssPath, 'utf8');
  }
  return text;
}

function hasSafetyNet(entrySrc: string): boolean {
  const text = styleTextOf(resolve(ROOT, 'frontend', entrySrc));
  return topLevelRules(text).some((r) => isLinkColorSafetyNet(r.selector, r.body));
}

describe('링크 기본 글자색 안전망 — UA 기본색이 나올 자리를 막는다', () => {
  // ── 안전망이 있어야 하는 페이지 ────────────────────────────────────────
  // `landing.html` 이 2026-08-09 에 여기 합류했다(전시 카드 진파랑 사고의 처방).
  // 이 배열에서 하나를 빼면 아래 「없음」 배열과 합이 안 맞아 마지막 검사가 잡는다.
  const WITH_SAFETY_NET = [
    'landing.html',
    'guide.html',
    'about.html',
    'studio.html',
  ];

  // ── 아직 안전망이 없는 페이지 ──────────────────────────────────────────
  // **이 목록은 「괜찮다」가 아니라 「아직 안 깔았다」다.** 2026-08-09 실측으로 이
  // 페이지들에 지금 보이는 UA 기본색 요소는 0 이지만, 그것은 링크마다 색을 준 덕이지
  // 구조가 막아서가 아니다 — 색을 안 준 링크가 하나 생기면 그날 파랑이 뜬다.
  // 안전망을 까는 것은 이번 단계(그린 전환 미완 수리) 범위 밖이라 현황만 고정한다.
  // **줄이는 방향의 변경은 환영이고, 그때 이 배열에서 빼면서 위 배열에 넣으면 된다.**
  const WITHOUT_SAFETY_NET = [
    'index.html',   // 미술관(3D) — 링크가 HUD 안에만 있다
    'builder.html',
    'mypage.html',
    'world.html',
  ];

  it.each(WITH_SAFETY_NET)('%s 는 `a` 기본 글자색을 정한다', (src) => {
    expect(hasSafetyNet(src)).toBe(true);
  });

  it.each(WITHOUT_SAFETY_NET)('%s 는 아직 안전망이 없다(현황 고정)', (src) => {
    expect(hasSafetyNet(src)).toBe(false);
  });

  it('두 목록이 라이브 진입점 전체를 정확히 덮는다', () => {
    // 한쪽만 세면 새 페이지가 어느 목록에도 없이 태어나고, 그러면 이 축이
    // **그 페이지에 대해서는 존재하지 않는다.** 합집합이 곧 검사 범위다.
    const listed = [...WITH_SAFETY_NET, ...WITHOUT_SAFETY_NET].sort();
    const live = LIVE_ENTRIES.map((e: { src: string }) => e.src).sort();
    expect(listed).toEqual(live);
  });

  it('진입점 소스가 실재한다 — 목록이 사라진 파일을 가리키지 않는다', () => {
    // `design.html` 폐지(2026-08-09) 때 이 축이 없었다면 목록만 남아 조용히 통과했다.
    for (const e of LIVE_ENTRIES as { src: string }[]) {
      expect(existsSync(resolve(ROOT, srcPath(e))), e.src).toBe(true);
    }
  });
});
