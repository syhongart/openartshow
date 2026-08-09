// @vitest-environment jsdom
//
// 주 메뉴 통합 후보 노브(`?nav=`) — `frontend/js/nav-knob.js`.
//
// ── 이 파일이 지키는 것 ────────────────────────────────────────────────────
// ① **A(노브 없음)에서 DOM 이 한 바이트도 안 바뀐다.** 라이브 3개 페이지를 건드리면서
//    지킬 유일한 안전장치가 이것이다. 그래서 "구성이 현행과 같다" 같은 간접 단언이
//    아니라 **실제 소스 HTML 을 파싱해 적용 전후 직렬화를 바이트로 대조**한다.
//    간접 단언으로 두면 A 를 "다시 그려서 같게" 만드는 구현이 통과해 버리고, 그러면
//    안전장치가 매번 재검증 대상이 된다.
// ② **후보 3안의 항목 구성**(라벨·순서·링크·`current`)이 명세와 같다.
// ③ **모바일 시트가 데스크톱과 같은 후보를 따른다.** 감독은 모바일로 보시므로
//    데스크톱만 맞는 구현은 판정 자체를 무효로 만든다.
// ④ **auth 렌더가 지우는 자리에 아무것도 안 넣었다.** `landing.html` 의 `renderNav()`
//    는 `#navAuth`·`#nsAuth` 를 통째로 비우고 다시 채운다 — 그 안에 링크를 넣으면
//    로그인하는 순간 사라진다. **로그아웃 상태로만 여는 스모크는 그것을 못 잡는다**
//    (이 저장소가 이미 그 형태로 한 번 당했다: `escapeHtml` 스코프 사고).
//
// ── 검출력 ─────────────────────────────────────────────────────────────────
// 뮤테이션으로 확인한 것은 보고에 적었다. 요지: `applyNavKnob` 의 조기 반환을 없애
// A 도 다시 그리게 하면 ①이 깨지고, 스튜디오 링크를 `#navAuth` **안**으로 옮기면
// ④가 깨진다. 안 깨지면 이 파일은 장식이다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NAV_VARIANTS,
  NAV_PAGES,
  readNavVariant,
  navPlan,
  applyNavKnob,
} from '../frontend/js/nav-knob.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 소스 HTML 을 그대로 읽어 문서로 만든다. `DOMParser` 는 스크립트를 실행하지 않는다. */
function docOf(file: string): Document {
  const html = readFileSync(resolve(ROOT, 'frontend', file), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
}

const PAGE_FILE: Record<string, string> = {
  home: 'landing.html',
  about: 'about.html',
  guide: 'guide.html',
};

const labels = (nodes: ArrayLike<Element>) =>
  Array.from(nodes).map((n) => (n.textContent || '').trim());

// ───────────────────────────────────────────────────────────────────────────
describe('readNavVariant — 모르는 값은 전부 현행(A)으로 떨어진다', () => {
  it('후보 넷을 읽는다', () => {
    for (const v of NAV_VARIANTS) expect(readNavVariant(`?nav=${v}`)).toBe(v);
  });

  it('대문자·공백은 정규화한다', () => {
    expect(readNavVariant('?nav=B')).toBe('b');
    expect(readNavVariant('?nav=%20C%20')).toBe('c');
  });

  // 감독이 링크를 잘못 눌렀을 때 화면이 아니라 콘솔로만 알려주면 안 된다 —
  // 이상값은 조용히 현행으로 살아야 한다.
  it.each(['', '?', '?nav=', '?nav=zzz', '?nav=0', '?nav=e', '?other=b'])(
    '이상값 %j → a',
    (s) => { expect(readNavVariant(s)).toBe('a'); },
  );

  it('null·undefined 도 던지지 않는다', () => {
    expect(readNavVariant(undefined as unknown as string)).toBe('a');
    expect(readNavVariant(null as unknown as string)).toBe('a');
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('navPlan — 후보별 항목 구성', () => {
  it('A 는 계획이 없다 (= 아무것도 하지 않는다)', () => {
    for (const p of NAV_PAGES) expect(navPlan('a', p as never)).toBeNull();
  });

  it('B = 홈 기준 통일 — 전시·포토월·요금제·소개·가이드, 스튜디오는 auth 영역', () => {
    const plan = navPlan('b', 'home')!;
    expect(plan.links.map((l) => l.label)).toEqual(['전시', '포토월', '요금제', '소개', '가이드']);
    expect(plan.authStudio).toBe(true);
  });

  it('C = 여정 순서 — 전시·소개·가이드·작가 스튜디오, 스튜디오는 links 안', () => {
    const plan = navPlan('c', 'home')!;
    expect(plan.links.map((l) => l.label)).toEqual(['전시', '소개', '가이드', '작가 스튜디오']);
    expect(plan.authStudio).toBe(false);
  });

  it('D = 최소 — 전시·소개·가이드', () => {
    const plan = navPlan('d', 'home')!;
    expect(plan.links.map((l) => l.label)).toEqual(['전시', '소개', '가이드']);
    expect(plan.authStudio).toBe(true);
  });

  // 서브에서 앵커만 쓰면 그 페이지 안을 찾다가 아무 데도 안 간다.
  it('앵커 항목은 홈에서는 페이지 안, 서브에서는 홈으로 건너뛴다', () => {
    expect(navPlan('b', 'home')!.links[0].href).toBe('#exhibitions');
    expect(navPlan('b', 'about')!.links[0].href).toBe('./index.html#exhibitions');
    expect(navPlan('b', 'guide')!.links[1].href).toBe('./index.html#photowall');
  });

  it('명칭은 짧은 쪽으로 통일된다 — "이용 안내"·"전시장 입장"은 어느 후보에도 없다', () => {
    for (const v of ['b', 'c', 'd'] as const) {
      for (const p of NAV_PAGES) {
        const plan = navPlan(v, p as never)!;
        const all = [...plan.links.map((l) => l.label), plan.enter.label];
        expect(all).not.toContain('이용 안내');
        expect(all).not.toContain('전시장 입장');
        expect(all).not.toContain('랜딩'); // 로고가 이미 홈 링크다
        expect(plan.enter.label).toBe('입장하기');
      }
    }
  });

  it('current 는 서브의 현재 페이지에만 붙고 홈에는 없다', () => {
    expect(navPlan('b', 'about')!.links.filter((l) => l.current).map((l) => l.label)).toEqual(['소개']);
    expect(navPlan('b', 'guide')!.links.filter((l) => l.current).map((l) => l.label)).toEqual(['가이드']);
    expect(navPlan('b', 'home')!.links.filter((l) => l.current)).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('A(노브 없음) — 세 페이지의 DOM 이 한 바이트도 안 바뀐다', () => {
  it.each(NAV_PAGES)('%s', (page) => {
    const doc = docOf(PAGE_FILE[page]);
    const before = doc.documentElement.outerHTML;
    const applied = applyNavKnob(doc, 'a', page as never);
    expect(applied).toBe(false);
    expect(doc.documentElement.outerHTML).toBe(before);
    // 노브 CSS 도 안 들어간다 — style 태그 하나가 생기는 것도 "아무것도 안 함" 이 아니다.
    expect(doc.getElementById('oas-nav-knob-styles')).toBeNull();
    expect(doc.documentElement.getAttribute('data-nav-knob')).toBeNull();
  });

  // 이상 노브도 A 와 같아야 한다. 폴백이 `readNavVariant` 에만 있고 적용 쪽이
  // 다른 경로를 타면 여기가 잡는다.
  it.each(['?nav=zzz', '?nav=', ''])('이상 노브 %j 도 홈 DOM 불변', (search) => {
    const doc = docOf('landing.html');
    const before = doc.documentElement.outerHTML;
    applyNavKnob(doc, readNavVariant(search), 'home');
    expect(doc.documentElement.outerHTML).toBe(before);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('홈 적용 — 데스크톱과 모바일 시트가 같은 후보를 따른다', () => {
  function applyHome(variant: 'b' | 'c' | 'd') {
    const doc = docOf('landing.html');
    expect(applyNavKnob(doc, variant, 'home')).toBe(true);
    return doc;
  }

  it.each(['b', 'c', 'd'] as const)('%s — 데스크톱 links 와 시트 항목이 일치한다', (v) => {
    const doc = applyHome(v);
    const want = navPlan(v, 'home')!.links.map((l) => l.label);

    expect(labels(doc.querySelectorAll('.topnav .nav-links a'))).toEqual(want);

    // 시트는 divider 앞이 메뉴 구간이다.
    const sheet = doc.getElementById('navSheet')!;
    const sheetMenu: string[] = [];
    for (const n of Array.from(sheet.children)) {
      if (n.classList.contains('ns-divider')) break;
      sheetMenu.push((n.textContent || '').trim());
    }
    expect(sheetMenu).toEqual(want);
  });

  it.each(['b', 'c', 'd'] as const)('%s — auth 컨테이너와 CTA 를 건드리지 않는다', (v) => {
    const doc = applyHome(v);
    // renderNav 가 채우는 두 컨테이너는 살아 있어야 한다.
    expect(doc.getElementById('navAuth')).not.toBeNull();
    expect(doc.getElementById('nsAuth')).not.toBeNull();
    // 명세상 CTA 는 네 후보 모두 「입장하기」로 같다 — 손대지 않는다.
    expect(doc.querySelector('.topnav .nav-cta')!.getAttribute('href')).toBe('./app/');
    expect(doc.querySelector('#navSheet .ns-enter')!.getAttribute('href')).toBe('./app/');
    expect(doc.querySelector('.topnav')!.getAttribute('aria-label')).toBe('주 메뉴');
  });

  // ④ — 이 단언이 이 파일에서 가장 값이 있다. `#navAuth` 안에 넣는 구현은
  // 로그아웃 상태 스모크를 전부 통과하면서 로그인하는 순간 링크가 사라진다.
  it.each(['b', 'd'] as const)('%s — 작가 스튜디오는 renderNav 가 비우는 컨테이너 **밖**에 있다', (v) => {
    const doc = applyHome(v);
    const navAuth = doc.getElementById('navAuth')!;
    const nsAuth = doc.getElementById('nsAuth')!;
    expect(navAuth.querySelector('a[href="./app/studio.html"]')).toBeNull();
    expect(nsAuth.querySelector('a[href="./app/studio.html"]')).toBeNull();

    // 그러면서 auth 영역 **바로 앞**에 있어야 한다(시각적으로 그 그룹으로 읽힌다).
    const studio = doc.querySelector('.topnav .oasnav-studio')!;
    expect(studio.nextElementSibling).toBe(navAuth);
    expect(studio.querySelector('a')!.getAttribute('href')).toBe('./app/studio.html');

    const sheetStudio = doc.querySelector('#navSheet > a[href="./app/studio.html"]')!;
    expect(sheetStudio.nextElementSibling).toBe(nsAuth);
    // 시트 메뉴 구간(divider 앞)에는 없다 — auth 쪽에 배치한 후보이므로.
    expect(sheetStudio.previousElementSibling!.classList.contains('ns-divider')).toBe(true);
  });

  it('C 는 스튜디오를 links 안에 둔다 — auth 영역에는 없다', () => {
    const doc = applyHome('c');
    expect(labels(doc.querySelectorAll('.topnav .nav-links a'))).toContain('작가 스튜디오');
    expect(doc.querySelector('.topnav .oasnav-studio')).toBeNull();
    expect(doc.querySelector('#navSheet > a[href="./app/studio.html"]')!.nextElementSibling)
      .not.toBe(doc.getElementById('nsAuth'));
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('서브 적용 — 홈과 같은 항목 + 현재 페이지 강조 + 접근성 라벨', () => {
  it.each([
    ['about', '소개'],
    ['guide', '가이드'],
  ] as const)('%s — 항목이 홈과 같고 현재 페이지에 current 가 붙는다', (page, cur) => {
    for (const v of ['b', 'c', 'd'] as const) {
      const doc = docOf(PAGE_FILE[page]);
      expect(applyNavKnob(doc, v, page)).toBe(true);
      const nav = doc.querySelector('.topbar .topnav')!;

      // 링크 라벨 = 후보 links + 입장하기. (로그인·회원가입은 <button> 이라 별도)
      const want = [...navPlan(v, page)!.links.map((l) => l.label), '입장하기'];
      expect(labels(nav.querySelectorAll('a'))).toEqual(want);

      expect(labels(nav.querySelectorAll('.current'))).toEqual([cur]);
      expect(nav.getAttribute('aria-label')).toBe('주 메뉴');
      // 모바일에서 `.topnav{display:none}` 을 이기는 클래스 — 없으면 감독 화면에
      // 서브 메뉴가 통째로 안 나온다.
      expect(nav.classList.contains('oasnav-on')).toBe(true);
      expect(doc.getElementById('oas-nav-knob-styles')).not.toBeNull();

      // 로그인·회원가입은 버튼이고, 소스 CSS 의 `.topnav a, .topnav button` 이 룩을 준다.
      expect(labels(nav.querySelectorAll('button'))).toEqual(['로그인', '회원가입']);

      // 「랜딩」은 사라진다 — 브랜드 로고가 그 역할을 한다.
      expect(labels(nav.querySelectorAll('a'))).not.toContain('랜딩');
      expect(doc.querySelector('.topbar .brand')!.getAttribute('href')).toBe('./index.html');
    }
  });

  it('입장하기는 항상 마지막이고 auth 구분자가 그 앞에 둘 있다', () => {
    const doc = docOf('about.html');
    applyNavKnob(doc, 'b', 'about');
    const nav = doc.querySelector('.topbar .topnav')!;
    const last = nav.lastElementChild!;
    expect(last.tagName).toBe('A');
    expect(last.getAttribute('href')).toBe('./app/');
    expect(nav.querySelectorAll('.oasnav-sep').length).toBe(2);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('배선 — 세 HTML 이 실제로 노브를 부른다', () => {
  // 모듈이 아무리 옳아도 HTML 이 안 부르면 라이브에서는 아무 일도 안 일어난다.
  // 이 검사가 없으면 `<script>` 한 줄이 빠진 것을 아무도 모른다.
  it.each(NAV_PAGES)('%s 가 nav-knob 을 로드한다', (page) => {
    const doc = docOf(PAGE_FILE[page]);
    const tag = doc.querySelector('script[src$="js/nav-knob.js"]')!;
    expect(tag).not.toBeNull();
    expect(tag.getAttribute('type')).toBe('module');
  });

  // 페이지 식별은 **`<html>` 속성**이어야 한다. script 태그에 달면 vite 가 진입점을
  // 바꿔치기하면서 속성을 버려 배포물에서 노브가 죽는다(2026-08-09 실측 — 첫 판본이
  // 그랬고 `dist/*.html` 에서 `type`·`crossorigin`·`src` 만 남았다).
  //
  // ⚠ **이 검사는 소스만 본다.** 산출 HTML 에서 속성이 살아남는지는 vitest 가
  // 빌드를 돌리지 않아 원리상 못 잰다 — 그 축은 배포 전 스모크(`smoke:vite`)가
  // `_site` 를 열 때만 밟힌다. 「소스 통과 + 배포 실패」가 다시 성립할 수 있는
  // 자리이므로 여기에 「다 봤다」로 적지 않는다.
  it.each(NAV_PAGES)('%s 는 data-nav-page 를 <html> 에 단다 (script 태그가 아니라)', (page) => {
    const doc = docOf(PAGE_FILE[page]);
    expect(doc.documentElement.getAttribute('data-nav-page')).toBe(page);
    expect(doc.querySelector('script[data-nav-page]')).toBeNull();
  });

  // `landing.html` 의 auth 모듈이 시트 링크에 「닫기」 리스너를 건다. 노브가 그보다
  // 뒤에 실행되면 노브가 만든 링크에는 리스너가 안 붙어 **모바일에서 메뉴를 눌러도
  // 시트가 안 닫힌다.** module 은 defer 라 문서 순서가 곧 실행 순서다.
  it('홈에서 노브가 auth 모듈보다 먼저 온다', () => {
    const doc = docOf('landing.html');
    const modules = Array.from(doc.querySelectorAll('script[type="module"]'));
    const knob = modules.findIndex((s) => (s.getAttribute('src') || '').endsWith('js/nav-knob.js'));
    const auth = modules.findIndex((s) => (s.textContent || '').includes('auth-modal.js'));
    expect(knob).toBeGreaterThanOrEqual(0);
    expect(auth).toBeGreaterThanOrEqual(0);
    expect(knob).toBeLessThan(auth);
  });

  // 서브 두 페이지의 `.topnav` 룩 규칙이 `<button>` 까지 덮는지 — 안 덮으면 로그인·
  // 회원가입만 브라우저 기본 버튼으로 튀어나온다(값을 노브 CSS 에 복제하지 않기로
  // 한 결정이 여기에 걸려 있다).
  it.each(['about.html', 'guide.html'])('%s 의 topnav 규칙이 button 을 포함한다', (file) => {
    const css = readFileSync(resolve(ROOT, 'frontend', file), 'utf8');
    expect(css).toContain('.topnav a, .topnav button {');
    expect(css).toContain('.topnav :is(a, button):hover');
    expect(css).toContain('.topnav :is(a, button).current');
  });
});
