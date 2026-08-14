// tests/palette-ssot.test.ts — 「1층 색이 rgb 리터럴로 복사돼 SSOT 밖에서 늙는 것」을 막는 축
//
// ── 무엇을 잡는가 ──────────────────────────────────────────────────────────
// 2026-08-09, `about.html`·`guide.html` 의 링크 밑줄이 **폐기된 그린**이었다. 글자는
// 현행 `--oas-green-text` 인데 밑줄만 구 채도 27 값(`rgba(61,107,80,·)`)이라 한 링크에
// 두 그린이 붙어 있었다. 원인은 색을 잘못 고른 것이 아니라 **알파를 붙일 방법이 없어
// rgb 를 손으로 복사한 것**이다 — 복사본은 SSOT 밖이라 2026-07-31 감독의 채도 확정을
// 따라오지 못했다.
//
// 같은 사고의 두 번째 형태가 `tokens.css` 주석에 있었다. *"`var(--oas-on-dark-warm)`
// 참조가 저장소 전체에 0건"* → **참이었지만** 같은 색이 `landing.html` 에 리터럴로
// 18곳 살아 화면을 그리고 있었다. **재는 축(`var()` 참조)이 소비를 안 세고 있었다.**
//
// 처방은 방향을 뒤집는 것이다 — **채널(`--X-rgb: R G B`)이 원본이고 hex 가 파생**.
// 알파 소비처는 `rgb(var(--X-rgb) / α)` 로 SSOT 를 직접 참조하므로 복사할 것이 없다.
// 근거·수단 선택 실측은 `frontend/css/tokens.css` 의 `--oas-green-text-rgb` **한 곳**이다.
//
// ── 이 파일이 지키는 것 ────────────────────────────────────────────────────
// [1] 폐기색이 되살아나지 않는다(값 축).
// [2] **한 파일이 같은 색을 토큰과 리터럴로 섞어 쓰지 않는다.** 목록을 손으로 들지
//     않는다 — 어떤 페이지가 채널을 `var()` 로 한 번이라도 참조하면 그 페이지는 그
//     색을 「이은」 것으로 보고, 같은 색의 리터럴이 0건인지 본다. 아직 안 이은 페이지는
//     참조가 0이라 자동으로 범위 밖이다(2026-08-09 정돈은 `landing` 의 흰 계열과
//     `about`·`guide` 의 green-text 만 이었다 — 나머지는 다음 사람 몫이다).
//     **왜 「섞임」이 축인가**: 사고의 실물이 그것이었다. `about.html` 은 링크 글자를
//     토큰으로, 밑줄을 리터럴로 칠하고 있었다 — 한 링크 안에 두 그린이 생긴 이유가
//     정확히 그 섞임이고, 섞이지 않았다면 색이 갈릴 자리가 없다.
// [3] 아직 **안 이은** 색의 현황을 고정한다(역방향). [2]만 두면 "안 이은 것" 을 말하는
//     `tokens.css` 산문이 낡아도 아무도 모른다 — `link-color-safety.test.ts` 가 안전망
//     유무를 양방향으로 세는 것과 같은 형태다.
// [4] hex 토큰이 채널에서 **파생**되는 형태를 지킨다. 채널과 hex 를 나란히 적으면
//     그 순간 값 미러링이고, 이 파일이 막으려는 사고가 1층 안에서 재현된다.
//
// ── 못 잡는 것 ─────────────────────────────────────────────────────────────
// · **hsl()·color() 표기의 복사**는 안 본다. 이 저장소의 복사본은 전부 rgb 표기였다.
// · **JS 가 조립하는 색 문자열**(`'rgba(' + r + ...`)은 안 본다 — `literal-mirror` 소관.
// · 값이 맞는 복사본은 [2] 밖(= 채널이 없는 색)에서는 통과한다. [3]이 그 현황을
//   세지만 개수까지는 안 본다 — 늘어난 것은 안 잡힌다.
// · 렌더 결과는 안 본다. 「같은 색인가」는 `npm run snapshot:styles` 소관이다.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { LIVE_ENTRIES, srcPath } from '../scripts/lib/entrypoints.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const TOKENS = resolve(ROOT, 'frontend/css/tokens.css');

/** CSS 주석을 걷는다. 주석 안 서술(`같은 rgba(242,242,240,·)` 같은 문장)이 리터럴로
 *  세어지면 안 된다 — 산문은 화면을 그리지 않는다. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * 페이지의 **2층 CSS** — `<style>` 블록 + 링크된 로컬 CSS에서 **1층(`tokens.css`)을 뺀 것**.
 *
 * ⚠ **1층을 빼지 않으면 [2] 축이 통째로 무너진다.** 파생 선언
 * `--oas-white: rgb(var(--oas-white-rgb));` 자체가 `var(--oas-white-rgb)` 를 포함하므로,
 * 1층을 섞어 읽으면 **tokens.css 를 링크한 모든 페이지가 「이었다」로 판정**된다. 실측에서
 * 그 형태로 `builder.html` 이 순백 리터럴 22건으로 FAIL 했다 — 그 페이지는 이번 정돈
 * 범위가 아니었고 아무것도 잘못한 것이 없다. 재는 축이 틀렸던 것이다(이 파일이 잡으려는
 * 사고와 같은 형태가 검사 안에서 재현됐다).
 *
 * HTML 을 통째로 넘기지 않는 이유는 `link-color-safety.test.ts` 의 같은 함수 주석에 있다
 * (스크립트 본문의 중괄호가 파서를 망친다).
 */
function pageStyleText(htmlPath: string): string {
  const html = readFileSync(htmlPath, 'utf8');
  let text = '';
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) text += m[1] + '\n';
  for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/g)) {
    const href = m[0].match(/href=["']([^"']+)["']/)?.[1];
    if (!href || /^(https?:)?\/\//.test(href)) continue;
    if (/(^|\/)tokens\.css$/.test(href)) continue; // 1층은 SSOT 그 자체 — [4]가 따로 본다
    const cssPath = join(dirname(htmlPath), href);
    if (existsSync(cssPath)) text += '\n' + readFileSync(cssPath, 'utf8');
  }
  return text;
}

/** 라이브 진입점의 2층 CSS 전량. 파일명을 붙여 돌려준다(어디가 어긋났는지). */
function liveStyleSources(): { name: string; css: string }[] {
  return (LIVE_ENTRIES as { src: string }[]).map((e) => ({
    name: e.src,
    css: stripComments(pageStyleText(resolve(ROOT, srcPath(e)))),
  }));
}

/** `rgba(R,G,B,…)` / `rgb(R, G, B …)` 리터럴을 센다. 공백은 자유(1층 그림자 토큰은
 *  `rgba(20, 21, 26, 0.05)` 처럼 띄어 적혀 있다). */
function countRgbLiteral(css: string, [r, g, b]: number[]): number {
  const s = String.raw`\s*`;
  const re = new RegExp(`rgba?\\(${s}${r}${s},${s}${g}${s},${s}${b}${s}[,)]`, 'g');
  return (css.match(re) || []).length;
}

/**
 * 채널 표기(`--x-rgb: R G B;`)를 센다.
 *
 * ⚠ **`countRgbLiteral` 만으로는 안 된다** — 2026-08-09 뮤테이션에서 드러난 구멍이다.
 * 채널 값을 폐기색으로 되돌리는 변조(`--oas-green-text-rgb: 61 107 80`)를 걸었더니
 * **아무 검사도 안 깨졌다.** 공백 구분 채널은 `rgba(` 패턴에도, `#hex` 에도 안 걸린다.
 * 하필 그 자리가 **이번에 새로 만든 원본**이라, 거기서 색이 죽으면 파생 hex 와 모든
 * 알파 소비처가 **한꺼번에** 폐기색이 된다 — 가장 크게 틀릴 수 있는 자리에 검출력이
 * 0이었다. 값을 옮기면 그 값을 재는 축도 함께 옮겨야 한다.
 */
function countChannelLiteral(css: string, [r, g, b]: number[]): number {
  const re = new RegExp(`:\\s*${r}\\s+${g}\\s+${b}\\s*;`, 'g');
  return (css.match(re) || []).length;
}

const tokensCss = readFileSync(TOKENS, 'utf8');

describe('[1] 폐기색 — 되살아나지 않는다', () => {
  // 2026-07-31 감독 확정으로 폐기된 구 채도 27 그린(H145/S27/L33). 현행은
  // `--oas-green-text` 다. 값 자체가 죽었으므로 **표기를 가리지 않고** 0건이어야 한다.
  // (`tokens.css` 주석과 `docs/` 는 폐기 사실의 **기록**이라 대상이 아니다 — 여기서는
  //  라이브 진입점이 싣는 CSS 만 본다.)
  const DEPRECATED = { name: '구 green-text (#3d6b50)', hex: '#3d6b50', rgb: [61, 107, 80] };

  // 1층도 함께 본다 — 폐기색은 2층에서 왔지만 되살아나는 자리는 어디든 될 수 있다.
  const targets = [...liveStyleSources(), { name: 'css/tokens.css (1층)', css: stripComments(tokensCss) }];

  it.each(targets)('$name 에 폐기색이 없다 — hex·rgb·채널 세 표기 전부', ({ css }) => {
    expect(countRgbLiteral(css, DEPRECATED.rgb), `${DEPRECATED.name} rgb 리터럴`).toBe(0);
    expect(css.toLowerCase().includes(DEPRECATED.hex), `${DEPRECATED.name} hex`).toBe(false);
    expect(countChannelLiteral(css, DEPRECATED.rgb), `${DEPRECATED.name} 채널 표기`).toBe(0);
  });
});

describe('[2] 이은 페이지 — 같은 색을 토큰과 리터럴로 섞어 쓰지 않는다', () => {
  // `tokens.css` 에서 채널 토큰을 긁는다. 목록을 손으로 들지 않는 것이 요점이다 —
  // 새 색을 채널로 이으면 그날부터 자동으로 이 검사를 받는다.
  const channels = [...stripComments(tokensCss).matchAll(
    /(--oas-[a-z0-9-]+)-rgb\s*:\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*;/g,
  )].map((m) => ({
    base: m[1],
    channel: `${m[1]}-rgb`,
    rgb: [Number(m[2]), Number(m[3]), Number(m[4])],
  }));

  it('채널 토큰이 하나 이상 있다 — 0이면 아래 검사가 통째로 빈다', () => {
    // it.each 는 빈 배열이면 **케이스가 0개**라 조용히 통과한다. 그 형태로 게이트가
    // 장식이 되는 것을 막는다(정규식이 깨지면 여기가 먼저 운다).
    expect(channels.length).toBeGreaterThan(0);
  });

  const sources = liveStyleSources();
  // 「이은」 조합 — 그 페이지가 그 채널을 실제로 참조하는가(실측).
  const cases = channels.flatMap((c) => sources
    .filter((s) => s.css.includes(`var(${c.channel})`))
    .map((s) => ({ ...c, page: s.name, css: s.css })));

  // ── 현황 고정 (역방향) ────────────────────────────────────────────────
  // 2026-08-09 정돈이 실제로 이은 (페이지 × 채널) 전량. **값이 아니라 현황이므로
  // 미러링이 아니다** — 색은 위에서 `tokens.css` 를 읽어 얻는다.
  //
  // ⚠ **이 목록이 없으면 [2]는 한 방향만 센다.** 뮤테이션 M6 실측(2026-08-09):
  // `landing.html` 의 채널 참조 19곳을 **전부** 리터럴로 되돌렸더니 — 즉 ②를 통째로
  // 무르는 변조인데 — **0 failed** 였다. 참조가 0이 되면 그 페이지가 케이스 목록에서
  // 조용히 빠지기 때문이다(케이스가 23→22 로 줄었고, 줄어든 것은 아무도 안 본다).
  // `link-color-safety.test.ts` 가 안전망 유무를 양방향으로 세는 이유와 **같은 형태**이고,
  // 그 주석을 읽고도 한 방향으로 만들었다가 뮤테이션에서 잡혔다.
  // ⚠⚠ **기준선이 2026-08-14 라이트 전환으로 바뀌었다.** 「줄었다」가 둘 있으므로 경위를
  //   적어 둔다 — 위 실패 메시지는 감소를 *"리터럴로 되돌아간 것"* 으로 의심하는데,
  //   이번은 **그 형태가 아니다**:
  //     · `--oas-white-rgb` · `--oas-on-dark-warm-rgb` **제거** — 리터럴로 되돌린 것이 아니라
  //       `landing.html` 의 로컬 채널(`--tint-rgb`·`--tint-warm-rgb`)로 **옮겼다.** 다크에서
  //       「밝은 면·선·글자」였던 알파 오버레이 30여 곳이 라이트에서는 잉크여야 하는데,
  //       1층 「흰색」 토큰에 잉크 값을 덮어쓰면 SSOT 의 이름이 역할을 잃는다(디자이너 권고).
  //     · `--oas-green-text-rgb` **추가** — 글로우 3곳의 `rgba(30,103,66,·)` 리터럴을 이었다.
  //       바로 이 검사가 잡아 준 것이다(내가 라이트 글로우를 리터럴로 새로 넣었다).
  //     · `--oas-paper-rgb` **추가** — 신설 채널. `topnav`·`nav-sheet` 반투명 배경이
  //       종이색에 알파를 요구한다.
  const LINKED: Record<string, string[]> = {
    'landing.html': ['--oas-on-dark-rgb', '--oas-paper-rgb', '--oas-green-text-rgb'],
    'about.html': ['--oas-green-text-rgb'],
    'guide.html': ['--oas-green-text-rgb'],
  };

  it('이은 (페이지 × 채널) 조합이 현황과 정확히 일치한다', () => {
    const actual = cases.map((c) => `${c.page} ${c.channel}`).sort();
    const expected = Object.entries(LINKED)
      .flatMap(([page, chs]) => chs.map((ch) => `${page} ${ch}`)).sort();
    expect(
      actual,
      '이은 현황이 바뀌었다.\n'
      + '  · 줄었다면: 리터럴로 되돌아간 것이다. 그것이 이 검사가 막으려는 회귀다.\n'
      + '  · 늘었다면: 환영이다 — 위 LINKED 에 추가하고 `tokens.css` 의 「안 이은 것」\n'
      + '    문단도 함께 고쳐라(산문만 낡는 것을 막으려고 여기서 센다).',
    ).toEqual(expected);
  });

  it.each(cases)('$page — $channel 을 쓰면서 같은 색 리터럴을 남기지 않았다', ({ css, rgb, base, channel }) => {
    expect(
      countRgbLiteral(css, rgb),
      `${base} 의 rgb(${rgb.join(',')}) 가 리터럴로 남아 있다.\n`
      + `  이 파일은 같은 색을 이미 \`var(${channel})\` 로도 쓰고 있다 — 섞여 있으면\n`
      + `  색을 바꿀 때 토큰 쪽만 따라오고 리터럴은 옛 값으로 남는다(그래서 폐기색이 남았다).\n`
      + `  \`rgb(var(${channel}) / α)\` 로 통일하라.`,
    ).toBe(0);
  });
});

describe('[3] 아직 안 이은 색 — 현황 고정(역방향)', () => {
  // **이 목록은 「괜찮다」가 아니라 「아직 안 이었다」다.** 두 색은 값이 맞아 있어
  // 지금 화면은 정상이고, 그래서 2026-08-09 정돈에서 손대지 않았다(잇는 것 자체가
  // 화면을 건드릴 위험만 새로 낸다 — `tokens.css` 의 `--oas-green-text-rgb` 주석).
  // 이으면 이 검사가 FAIL 한다. **그것이 신호다** — 목록에서 빼고 그 주석을 함께 고쳐라.
  const NOT_YET_LINKED = [
    { name: '--oas-green-500', rgb: [95, 158, 125] },
    { name: '--oas-dark-anchor', rgb: [20, 21, 26] },
  ];

  it.each(NOT_YET_LINKED)('$name 는 아직 rgb 리터럴로 복사돼 있다', ({ rgb }) => {
    const total = liveStyleSources().reduce((n, s) => n + countRgbLiteral(s.css, rgb), 0);
    expect(total).toBeGreaterThan(0);
  });

  it('안 이은 색에는 채널 토큰이 없다 — 두 목록이 겹치지 않는다', () => {
    for (const c of NOT_YET_LINKED) {
      expect(tokensCss.includes(`${c.name}-rgb`), `${c.name} 에 채널이 생겼다`).toBe(false);
    }
  });
});

describe('[4] 1층 구조 — hex 는 채널의 파생이다', () => {
  // 채널과 hex 를 나란히 적으면(`--x-rgb: 30 103 66;` + `--x: #1e6742;`) 그것이 바로
  // 값 미러링이고, 한쪽만 고치는 날 아무도 모른다 — 이 파일이 막으려는 사고가 1층
  // 안에서 재현된다. hex 는 **반드시** 채널에서 나와야 한다.
  const css = stripComments(tokensCss);
  const channels = [...css.matchAll(/(--oas-[a-z0-9-]+)-rgb\s*:/g)].map((m) => m[1]);

  it.each(channels)('%s 는 채널에서 파생된다 — hex 를 다시 적지 않는다', (base) => {
    const decl = css.match(new RegExp(`${base}\\s*:\\s*([^;]+);`));
    expect(decl, `${base} 선언이 없다`).not.toBeNull();
    expect(
      decl![1].trim(),
      `${base} 가 채널을 안 거친다. \`rgb(var(${base}-rgb))\` 형태여야 한다 —\n`
      + `  hex 를 나란히 적으면 채널과 hex 가 서로의 미러가 된다.`,
    ).toBe(`rgb(var(${base}-rgb))`);
  });
});
