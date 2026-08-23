// @vitest-environment jsdom
//
// 주 메뉴 — **세 라이브 페이지가 같은 구성·같은 명칭을 갖는다**를 소스 HTML 로 못 박는다.
//
// ── 왜 이 파일이 있나 ──────────────────────────────────────────────────────
// 주 메뉴는 오래 **두 벌**이었다(실측 2026-08-09): 홈은 「가이드」·「입장하기」, 서브는
// 같은 목적지를 「이용 안내」·「전시장 입장」으로 불렀고 「작가 스튜디오」는 서브에만
// 있었다. 후보 넷을 `?nav=` 노브로 라이브에 올려 감독이 비교·판정하셨고(2026-08-10,
// **B = 홈 기준 통일**), 그 결과를 소스에 직접 반영하면서 노브와 `tests/nav-knob.test.ts`
// 를 지웠다. **그 자리가 그냥 비면 통일은 다음 편집 한 번으로 조용히 풀린다** — 세 파일에
// 흩어진 메뉴가 서로 어긋나는 것을 아무도 못 보는 것이 애초의 사고였다. 그래서 노브
// 검사를 지우는 커밋에서 이 파일을 만든다.
//
// ── 무엇을 못 잡나 (정직하게) ──────────────────────────────────────────────
// · **소스만 본다.** vitest 는 빌드를 안 돌리므로 산출 HTML 에서 살아남는지는 원리상
//   못 잰다 — 그 축은 `smoke:vite` 가 `_site` 를 열 때만 밟힌다.
// · **화면을 안 본다.** 항목이 실제로 보이는지·가로로 넘치는지는 여기서 안 잡는다
//   (브라우저 실측으로 따로 재고 보고에 적었다).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PAGE_FILE = {
  home: 'landing.html',
  about: 'about.html',
  guide: 'guide.html',
} as const;
type Page = keyof typeof PAGE_FILE;
const PAGES = Object.keys(PAGE_FILE) as Page[];

const srcOf = (page: Page) => readFileSync(resolve(ROOT, 'frontend', PAGE_FILE[page]), 'utf8');

/**
 * 주석을 걷어낸 소스. **CSS 규칙의 부재를 검사할 때는 이쪽을 봐야 한다** — 지운 규칙을
 * 주석에 인용해 두는 것이 이 저장소의 관례라(왜 지웠는지를 그 자리에 남긴다) 원문 검사는
 * 그 인용에 걸려 오탐을 낸다. 실제로 첫 판본이 그렇게 걸렸다.
 * 검사를 느슨하게 하는 것이 아니다: 주석은 브라우저가 안 읽으므로 규칙이 아니다.
 */
function codeOf(file: string): string {
  return readFileSync(resolve(ROOT, 'frontend', file), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}
/** 소스 HTML 을 그대로 파싱한다. `DOMParser` 는 스크립트를 실행하지 않는다. */
const docOf = (page: Page) => new DOMParser().parseFromString(srcOf(page), 'text/html');

const text = (n: Element) => (n.textContent || '').trim().replace(/\s+/g, ' ');

/**
 * 그 페이지의 **관람 메뉴 항목**(로그인·입장하기 앞 구간)을 뽑는다.
 *
 * 홈은 `.nav-links` 라는 전용 컨테이너가 있고, 서브는 `.topnav` 직계라 첫 구분자
 * (`.nav-sep`) 앞까지가 그 구간이다. 두 페이지의 마크업이 원래 다르므로 **추출도
 * 갈린다** — 갈리는 자리를 여기 한 곳에 모아 둔다.
 */
function menuItems(doc: Document, page: Page): Element[] {
  if (page === 'home') return Array.from(doc.querySelectorAll('.topnav .nav-links a'));
  const nav = doc.querySelector('.topbar .topnav')!;
  const out: Element[] = [];
  for (const n of Array.from(nav.children)) {
    if (n.classList.contains('nav-sep')) break;
    if (n.tagName === 'A') out.push(n);
  }
  return out;
}

/** 감독 판정(후보 B)이 확정한 항목. **이 배열이 이 파일의 명세다.** */
const B_LABELS = ['전시', '포토월', '요금제', '소개', '가이드'];
/** 통일로 사라진 이름들. 하나라도 되살아나면 두 벌 상태로 되돌아간 것이다. */
const RETIRED = ['이용 안내', '전시장 입장', '랜딩'];

// ───────────────────────────────────────────────────────────────────────────
describe('세 페이지가 같은 주 메뉴를 갖는다 (감독 판정 B — 홈 기준 통일)', () => {
  it.each(PAGES)('%s — 항목이 전시·포토월·요금제·소개·가이드 다', (page) => {
    expect(menuItems(docOf(page), page).map(text)).toEqual(B_LABELS);
  });

  // 세 페이지를 각각 재는 위 검사만 두면, 명세 배열을 고치는 편집 하나로 셋이 **함께**
  // 어긋날 수 있다. 서로를 기준으로 한 번 더 묶는다.
  it('세 페이지의 항목 목록이 서로 바이트 단위로 같다', () => {
    const [home, about, guide] = PAGES.map((p) => menuItems(docOf(p), p).map(text));
    expect(about).toEqual(home);
    expect(guide).toEqual(home);
  });

  it.each(PAGES)('%s — 폐기된 명칭(이용 안내·전시장 입장·랜딩)이 주 메뉴에 없다', (page) => {
    const doc = docOf(page);
    const nav = doc.querySelector('.topnav')!;
    const all = Array.from(nav.querySelectorAll('a,button')).map(text);
    for (const dead of RETIRED) expect(all).not.toContain(dead);
  });

  it.each(PAGES)('%s — 주 메뉴에 aria-label 이 있다', (page) => {
    const doc = docOf(page);
    const nav = doc.querySelector('nav.topnav') || doc.querySelector('.topbar .topnav')!;
    expect(nav.getAttribute('aria-label')).toBe('주 메뉴');
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('링크 대상 — 서브의 앵커는 홈으로 건너뛴다', () => {
  it('홈에서는 페이지 안 앵커다', () => {
    const hrefs = menuItems(docOf('home'), 'home').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#exhibitions', '#photowall', '#pricing', './about.html', './guide.html']);
  });

  // 서브에서 `#exhibitions` 만 쓰면 그 페이지 안을 찾다가 **아무 데도 안 간다.**
  it.each(['about', 'guide'] as const)('%s 에서는 ./index.html#… 이다', (page) => {
    const hrefs = menuItems(docOf(page), page).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      './index.html#exhibitions',
      './index.html#photowall',
      './index.html#pricing',
      './about.html',
      './guide.html',
    ]);
  });

  it.each(PAGES)('%s — 입장하기는 ./app/ 이다', (page) => {
    const doc = docOf(page);
    const sel = page === 'home' ? '.topnav .nav-cta' : '.topbar .topnav > a:last-of-type';
    const cta = doc.querySelector(sel)!;
    expect(text(cta)).toBe('입장하기');
    expect(cta.getAttribute('href')).toBe('./app/');
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('현재 페이지 강조', () => {
  it.each([
    ['about', '소개'],
    ['guide', '가이드'],
  ] as const)('%s 는 「%s」에만 current 가 붙는다', (page, label) => {
    const doc = docOf(page);
    expect(Array.from(doc.querySelectorAll('.topnav .current')).map(text)).toEqual([label]);
  });

  // 홈에는 current 가 없다 — 홈 링크 역할은 브랜드 로고가 한다(그래서 「랜딩」을 뺐다).
  it('홈에는 current 가 없고 로고가 홈 링크다', () => {
    const doc = docOf('home');
    expect(doc.querySelectorAll('.topnav .current').length).toBe(0);
    expect(doc.querySelector('.topnav .nav-logo')!.getAttribute('href')).toBe('#top');
  });

  it.each(['about', 'guide'] as const)('%s 의 브랜드 로고가 홈 링크다', (page) => {
    expect(docOf(page).querySelector('.topbar .brand')!.getAttribute('href')).toBe('./index.html');
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('홈 — 작가 스튜디오는 auth 영역, 그리고 renderNav 가 비우는 컨테이너 **밖**', () => {
  // 이 절이 이 파일에서 가장 값이 있다. `#navAuth`·`#nsAuth` 는 `renderNav()` 가
  // `textContent=''` 로 비우고 다시 채운다 — 그 **안**에 넣은 링크는 로그인하는 순간
  // 사라지고, 로그아웃 상태로만 여는 스모크·verify-live 는 전부 통과한다.
  it('데스크톱 — #navAuth 밖이면서 바로 앞이다', () => {
    const doc = docOf('home');
    const navAuth = doc.getElementById('navAuth')!;
    expect(navAuth.querySelector('a[href="./app/studio.html"]')).toBeNull();

    const studio = doc.querySelector('.topnav .nav-studio')!;
    expect(text(studio)).toBe('작가 스튜디오');
    expect(studio.nextElementSibling).toBe(navAuth);
    expect(studio.querySelector('a')!.getAttribute('href')).toBe('./app/studio.html');
  });

  it('모바일 시트 — #nsAuth 밖이면서 바로 앞이고, divider 뒤(auth 구간)다', () => {
    const doc = docOf('home');
    const nsAuth = doc.getElementById('nsAuth')!;
    expect(nsAuth.querySelector('a[href="./app/studio.html"]')).toBeNull();

    const studio = doc.querySelector('#navSheet > a[href="./app/studio.html"]')!;
    expect(studio.nextElementSibling).toBe(nsAuth);
    expect(studio.previousElementSibling!.classList.contains('ns-divider')).toBe(true);
  });

  // 서브에는 스튜디오가 없다 — 노브 B 가 그린 그대로이고 감독이 그 화면을 고르셨다.
  // 이 비대칭이 **의도**임을 여기 못 박는다(안 적으면 다음 사람이 누락으로 읽고 넣는다).
  it.each(['about', 'guide'] as const)('%s 의 주 메뉴에는 작가 스튜디오가 없다', (page) => {
    const nav = docOf(page).querySelector('.topbar .topnav')!;
    expect(nav.querySelector('a[href="./app/studio.html"]')).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('홈 모바일 시트가 데스크톱과 같은 후보를 따른다', () => {
  // 데스크톱만 맞는 구현은 **감독 화면(모바일)** 과 어긋난다.
  it('시트의 메뉴 구간(divider 앞)이 데스크톱 links 와 같다', () => {
    const doc = docOf('home');
    const sheet = doc.getElementById('navSheet')!;
    const out: string[] = [];
    for (const n of Array.from(sheet.children)) {
      if (n.classList.contains('ns-divider')) break;
      out.push(text(n));
    }
    expect(out).toEqual(menuItems(doc, 'home').map(text));
  });

  it('시트의 입장하기가 마지막이다', () => {
    const doc = docOf('home');
    const sheet = doc.getElementById('navSheet')!;
    const last = sheet.lastElementChild!;
    expect(last.classList.contains('ns-enter')).toBe(true);
    expect(last.getAttribute('href')).toBe('./app/');
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('서브 — 로그인·회원가입은 button 이고 배선이 실려 있다', () => {
  it.each(['about', 'guide'] as const)('%s — 슬롯 안에 버튼 둘이 있다', (page) => {
    const doc = docOf(page);
    const slot = doc.getElementById('navAuthSlot')!;
    expect(Array.from(slot.querySelectorAll('button')).map(text)).toEqual(['로그인', '회원가입']);
    // 배선(`subnav.js`)이 잡는 손잡이다. 속성이 사라지면 클릭이 죽는다.
    expect(Array.from(slot.querySelectorAll('button')).map((b) => b.getAttribute('data-auth-mode')))
      .toEqual(['login', 'signup']);
  });

  // 모듈이 아무리 옳아도 HTML 이 안 부르면 라이브에서는 아무 일도 안 일어난다 —
  // 버튼이 **보이는데 눌러도 아무 일이 없는** 상태가 이 회차에서 가장 쉬운 회귀였다.
  it.each(['about', 'guide'] as const)('%s 가 subnav.js 를 module 로 부른다', (page) => {
    const doc = docOf(page);
    const tag = doc.querySelector('script[src$="js/subnav.js"]')!;
    expect(tag).not.toBeNull();
    expect(tag.getAttribute('type')).toBe('module');
    expect(existsSync(resolve(ROOT, 'frontend/js/subnav.js'))).toBe(true);
  });

  it.each(['about', 'guide'] as const)('%s — 구분자가 둘이다 (관람 | 로그인 | 입장하기)', (page) => {
    expect(docOf(page).querySelectorAll('.topbar .topnav .nav-sep').length).toBe(2);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('서브 CSS — 통일이 성립하려면 남아 있어야 하는 것 둘', () => {
  // ① `<button>` 이 룩 규칙에 포함된다. 빠지면 로그인·회원가입만 브라우저 기본
  //    버튼으로 튀어나온다(값을 배선 쪽에 복제하지 않기로 한 결정이 여기 걸려 있다).
  it.each(['about.html', 'guide.html'])('%s 의 topnav 규칙이 button 을 덮는다', (file) => {
    const css = codeOf(file);
    expect(css).toContain('.topnav a, .topnav button {');
    expect(css).toContain('.topnav :is(a, button):hover');
    expect(css).toContain('.topnav :is(a, button).current');
    // 브라우저 기본 버튼 껍데기를 벗기는 규칙. 없으면 로그인·회원가입만 테두리가 남는다.
    expect(css).toMatch(/\.topnav button\s*\{[^}]*border-width/);
  });

  // ② 서브 모바일에서 주 메뉴가 살아 있다. 이 줄이 되살아나면 **폰에서 주 메뉴가
  //    통째로 사라진다**(서브에는 홈 같은 햄버거 시트가 없다) — 메뉴를 통일해 놓고
  //    감독이 보시는 화면에서만 없어지는, 통일이 반쪽이 되는 형태다.
  it.each(['about.html', 'guide.html'])('%s 가 모바일에서 .topnav 를 숨기지 않는다', (file) => {
    const css = codeOf(file);
    expect(css).not.toMatch(/\.topnav\s*\{[^}]*display:\s*none/);
    // 되살아나는 형태가 `display:none` 하나만은 아니다 — 폭·가시성으로 접는 것도 같은
    // 결과다. 실제 규칙만 보도록 주석을 걷은 소스에서 본다.
    expect(css).not.toMatch(/\.topnav\s*\{[^}]*visibility:\s*hidden/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('판정용 임시 노브가 남김없이 걷혔다', () => {
  // 「임시가 영구가 된다」가 이 저장소의 반복된 패턴이라 제거 자체를 검사로 만든다.
  it('노브 파일과 그 검사가 없다', () => {
    expect(existsSync(resolve(ROOT, 'frontend/js/nav-knob.js'))).toBe(false);
    expect(existsSync(resolve(ROOT, 'tests/nav-knob.test.ts'))).toBe(false);
  });

  it.each(PAGES)('%s 에 노브 잔재가 없다', (page) => {
    const src = srcOf(page);
    expect(src).not.toContain('nav-knob');
    expect(src).not.toContain('data-nav-page');
    expect(src).not.toContain('oasnav');
  });
});
