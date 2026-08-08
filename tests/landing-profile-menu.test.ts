// @vitest-environment jsdom
//
// 대문 프로필 서브메뉴 — **실제 인라인 배선을 실행해서** 본다.
//
// ── 왜 이 파일이 필요한가 (다른 축이 전부 못 보는 자리다) ────────────────────
// 이 메뉴는 **로그인했을 때만 존재한다.** 그리고 이 저장소의 화면 검증은 전부
// 로그아웃 상태로 페이지를 연다:
//   · `smoke:vite` / `verify-live` — 세션을 안 심는다 → 트리거가 아예 렌더되지 않는다
//   · `landing-inline-scope.test.ts` — 정적 분석이라 배선을 실행하지 않는다
//                                       (그 파일도 *"로그인 상태로 여는 축은 0"* 이라 적었다)
// 그래서 **2026-08-08 감독 실기기 사고**가 났다: `renderNav()` 가 로그인 가지에서
// `escapeHtml is not defined` 로 죽어 모바일 메뉴가 통째로 안 열렸는데, 게이트는 전부
// 초록이었다. 같은 함수에 이번에 메뉴가 하나 더 붙었다 — 축을 안 만들면 다음 사고도
// 감독 실기기가 첫 발견자가 된다.
//
// ── 왜 모듈로 빼지 않고 인라인 소스를 실행하는가 ──────────────────────────────
// `frontend/js/nav-profile-menu.ts` 로 리팩터링하면 테스트는 쉬워지지만, 디자이너가
// 실브라우저로 실측한 6경로 × 4폭이 **그 순간 무효**가 된다(옮긴 코드는 잰 적 없는
// 코드다). 그래서 옮기지 않고, `<script type="module">` 블록의 **원문을 읽어** import 만
// 인자로 바꿔 실행한다. 픽스처를 손으로 베끼지 않으므로 값 미러링도 없다 —
// **마크업이 바뀌면 이 테스트가 바뀐 그것을 실행한다.**
//
// ── 이 검사가 못 잡는 것 (적지 않으면 통과를 과신한다) ───────────────────────
// · **레이아웃·룩은 하나도 못 본다.** jsdom 은 CSS 를 계산하지 않는다 — 메뉴가 화면
//   밖으로 나가는지(가로 넘침), 시트에서 아래 CTA 를 덮는지는 여기서 0이다. 그 축은
//   디자이너 실측(`getBoundingClientRect`)이 유일하고, 스모크 `[5]` 는 팝오버를
//   **원리상** 못 본다(absolute 요소는 `scrollWidth` 를 안 늘린다 — 디자이너 실측).
// · `<script>` 블록 **구조**에 기댄다. IIFE 가 아니게 되거나 import 형태가 바뀌면 이
//   하네스가 먼저 깨진다 — 조용히 통과하는 게 아니라 깨지는 쪽이라 안전한 실패다.
// · 실제 `auth.js` 를 안 부른다(스텁). 로그아웃이 프로필을 지우는지는
//   `mypage-store.test.ts` 소관이고, 여기서는 **로그아웃 버튼이 그것을 부르는가**만 본다.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HTML = readFileSync(resolve(import.meta.dirname, '../frontend/landing.html'), 'utf8');

/** 이 블록이 import 하는 이름 — 실행할 때 인자로 넣어 준다. */
const INJECTED = ['openAuthModal', 'getProfile', 'logout', 'onAuthChange'] as const;

/** `auth.js` 를 쓰는 인라인 module 블록의 **원문**. */
function navBlockSource(): string {
  const blocks = [...HTML.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const block = blocks.find((b) => b.includes('./js/auth.js'));
  if (!block) throw new Error('auth.js 를 import 하는 module 블록을 못 찾았다 — 하네스가 낡았다');
  // `import ... from '...';` 줄만 걷어낸다. 나머지는 **한 글자도 고치지 않는다.**
  return block.replace(/^\s*import\s[\s\S]*?from\s*['"][^'"]+['"];\s*$/gm, '');
}

interface Harness {
  logout: ReturnType<typeof vi.fn>;
  openAuthModal: ReturnType<typeof vi.fn>;
  /** 폭을 바꾸고 resize 를 쏜다 */
  resizeTo(width: number): void;
}

/** 실제 body 마크업 위에서 실제 배선을 돌린다. */
function boot(profile: unknown): Harness {
  const bodyHtml = /<body[^>]*>([\s\S]*)<\/body>/.exec(HTML)?.[1];
  if (!bodyHtml) throw new Error('body 를 못 찾았다');
  // `innerHTML` 로 넣은 `<script>` 는 실행되지 않는다 — 마크업만 필요하다.
  document.body.innerHTML = bodyHtml;

  const logout = vi.fn();
  const openAuthModal = vi.fn();
  const getProfile = vi.fn(() => profile);
  const onAuthChange = vi.fn();

  const args: Record<string, unknown> = { openAuthModal, getProfile, logout, onAuthChange };
  // eslint-disable-next-line no-new-func -- 인라인 소스를 원문 그대로 실행하는 것이 이 파일의 요점이다
  const run = new Function(...INJECTED, navBlockSource());
  run(...INJECTED.map((k) => args[k]));

  return {
    logout,
    openAuthModal,
    resizeTo(width: number) {
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
      window.dispatchEvent(new Event('resize'));
    },
  };
}

const PROFILE = { provider: 'google', name: '홍길동', initial: '홍' };

function triggers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-nav-profile="trigger"]'));
}
function wrapOf(trigger: Element): HTMLElement {
  return trigger.closest('.nav-profile') as HTMLElement;
}
function isOpen(trigger: Element): boolean {
  return trigger.getAttribute('aria-expanded') === 'true';
}
/** 실제 클릭 — document 까지 버블링해야 바깥클릭 리스너와 같은 조건이 된다. */
function click(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}
function key(target: EventTarget, k: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
}

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true, writable: true });
  document.body.innerHTML = '';
});

describe('하네스 생존 — 이것이 깨지면 아래 통과는 「안 쟀다」 는 뜻이다', () => {
  it('블록 원문을 찾고, 실행하면 트리거가 렌더된다', () => {
    expect(navBlockSource()).toContain('renderNav');
    boot(PROFILE);
    // 데스크톱(`#navAuth`)과 모바일 시트(`#nsAuth`) 두 곳에 각각 하나씩.
    expect(triggers().length).toBe(2);
  });

  it('로그아웃 상태에서는 트리거가 **없다** — 이것이 스모크가 못 보는 이유다', () => {
    boot(null);
    expect(triggers().length).toBe(0);
    expect(document.querySelectorAll('[data-nav-profile]').length).toBe(0);
  });
});

describe('DOM 계약', () => {
  beforeEach(() => { boot(PROFILE); });

  it('네 자리가 전부 있고 요소 종류가 맞다', () => {
    for (const t of triggers()) {
      const wrap = wrapOf(t);
      expect(t.tagName, 'trigger').toBe('BUTTON');
      expect(wrap.querySelector('[data-nav-profile="menu"]')?.tagName, 'menu').toBe('DIV');
      const mypage = wrap.querySelector('[data-nav-profile="mypage"]');
      const logout = wrap.querySelector('[data-nav-profile="logout"]');
      // **링크는 진짜 `<a href>` 다.** `<button>`+JS 이동이면 새 탭·주소 복사가 죽고,
      // 이 스크립트가 죽는 날 마이페이지로 갈 방법이 아예 없어진다(그런 날이 있었다).
      expect(mypage?.tagName, 'mypage').toBe('A');
      expect(mypage?.getAttribute('href')).toBe('./app/mypage.html');
      expect(logout?.tagName, 'logout').toBe('BUTTON');
    }
  });

  it('마이페이지 링크는 배포 경로와 맞다 — entrypoints 의 out 이 SSOT', () => {
    // 값 미러링 방지: 링크를 손으로 적어 두고 배포 경로가 바뀌면 아무도 모른다.
    const entry = readFileSync(resolve(import.meta.dirname, '../scripts/lib/entrypoints.mjs'), 'utf8');
    const out = /key:\s*'mypage'[^}]*out:\s*'([^']+)'/.exec(entry)?.[1];
    expect(out, 'entrypoints 에서 mypage out 을 못 읽었다').toBeTruthy();
    const href = document.querySelector('[data-nav-profile="mypage"]')!.getAttribute('href')!;
    // 랜딩은 루트에 배포되므로 `./` + out 이 그대로 배포 경로다.
    expect(href.replace(/^\.\//, '')).toBe(out);
  });

  it('트리거가 메뉴를 가졌다고 알린다 — aria-haspopup/expanded', () => {
    for (const t of triggers()) {
      expect(t.getAttribute('aria-haspopup')).toBe('menu');
      expect(t.getAttribute('aria-expanded')).toBe('false');
    }
  });

  it('ARIA 트리가 유효하다 — menu 의 자식은 menuitem·separator·presentation 뿐', () => {
    const menu = document.querySelector('[data-nav-profile="menu"]')!;
    const roles = Array.from(menu.children).map((c) => c.getAttribute('role'));
    // role 없는 자식이 하나라도 있으면 스크린리더가 메뉴 구조를 잘못 읽는다.
    expect(roles).toEqual(['presentation', 'separator', 'menuitem', 'separator', 'menuitem']);
  });

  it('로그아웃은 **맨 아래**다 — 파괴적 동작의 관례', () => {
    const menu = document.querySelector('[data-nav-profile="menu"]')!;
    expect(menu.lastElementChild?.getAttribute('data-nav-profile')).toBe('logout');
  });

  it('신원 블록이 이름을 보여준다 — 지금 누구로 로그인해 있는가', () => {
    const id = document.querySelector('[data-nav-profile="identity"]')!;
    expect(id.textContent).toContain('홍길동');
    // 이메일이 없으면 공급자로 떨어진다(`auth.js` 스키마에 email 이 아직 없다).
    expect(id.textContent).toContain('Google');
  });

  it('이메일이 생기면 이메일이 1순위다 — auth.js 에 필드가 붙는 날을 대비한 축', () => {
    document.body.innerHTML = '';
    boot({ ...PROFILE, email: 'a@b.com' });
    const id = document.querySelector('[data-nav-profile="identity"]')!;
    expect(id.textContent).toContain('a@b.com');
    expect(id.textContent).not.toContain('Google');
  });

  it('이름을 textContent 로 넣는다 — 마크업 주입이 안 된다', () => {
    document.body.innerHTML = '';
    boot({ ...PROFILE, name: '<img src=x onerror=alert(1)>' });
    expect(document.querySelector('[data-nav-profile="identity"] img')).toBe(null);
    expect(document.querySelector('[data-nav-profile="trigger"] img')).toBe(null);
  });
});

describe('여는 경로', () => {
  beforeEach(() => { boot(PROFILE); });

  it('트리거 클릭으로 열리고, 다시 누르면 닫힌다', () => {
    const t = triggers()[0];
    click(t);
    expect(isOpen(t)).toBe(true);
    expect(wrapOf(t).classList.contains('is-open')).toBe(true);
    click(t);
    expect(isOpen(t)).toBe(false);
  });

  it('↓ 로 열면서 첫 항목으로 들어가고, ↑ 는 마지막 항목으로 간다', () => {
    const t = triggers()[0];
    key(t, 'ArrowDown');
    expect(isOpen(t)).toBe(true);
    expect(document.activeElement?.getAttribute('data-nav-profile')).toBe('mypage');

    click(t); // 닫고
    key(t, 'ArrowUp');
    expect(document.activeElement?.getAttribute('data-nav-profile')).toBe('logout');
  });

  it('메뉴 안에서 ↑↓ 로 이동하고 끝에서 순환한다', () => {
    const t = triggers()[0];
    key(t, 'ArrowDown');                       // mypage 에 포커스
    key(document.activeElement!, 'ArrowDown'); // → logout
    expect(document.activeElement?.getAttribute('data-nav-profile')).toBe('logout');
    key(document.activeElement!, 'ArrowDown'); // → 순환해서 mypage
    expect(document.activeElement?.getAttribute('data-nav-profile')).toBe('mypage');
  });

  it('Home/End 가 처음·끝으로 간다', () => {
    const t = triggers()[0];
    key(t, 'ArrowDown');
    key(document.activeElement!, 'End');
    expect(document.activeElement?.getAttribute('data-nav-profile')).toBe('logout');
    key(document.activeElement!, 'Home');
    expect(document.activeElement?.getAttribute('data-nav-profile')).toBe('mypage');
  });
});

// 닫히는 경로는 **소스 주석이 여섯 개라고 선언**한다. 여섯 개를 각각 건다 —
// 하나라도 빠지면 메뉴가 화면에 남아 아래 내용을 가린다(모바일에서는 CTA 를 덮는다).
describe('닫히는 경로 여섯', () => {
  beforeEach(() => { boot(PROFILE); });

  it('① 바깥 클릭', () => {
    const t = triggers()[0];
    click(t);
    click(document.querySelector('.hero') ?? document.body);
    expect(isOpen(t)).toBe(false);
  });

  it('① 메뉴 **안** 클릭으로는 닫히지 않는다 — 오작동 축', () => {
    const t = triggers()[0];
    click(t);
    click(document.querySelector('[data-nav-profile="identity"]')!);
    expect(isOpen(t)).toBe(true);
  });

  it('② ESC — 닫으면서 포커스를 트리거로 되돌린다', () => {
    const t = triggers()[0];
    click(t);
    key(document, 'Escape');
    expect(isOpen(t)).toBe(false);
    // 포커스를 안 돌려주면 키보드 사용자는 문서 맨 위로 떨어진다.
    expect(document.activeElement).toBe(t);
  });

  it('③ 항목 선택 — 개인 프로필', () => {
    const t = triggers()[0];
    click(t);
    click(wrapOf(t).querySelector('[data-nav-profile="mypage"]')!);
    expect(isOpen(t)).toBe(false);
  });

  it('③ 항목 선택 — 로그아웃은 닫고 logout() 을 부른다', () => {
    const h = boot(PROFILE);
    const t = triggers()[0];
    click(t);
    click(wrapOf(t).querySelector('[data-nav-profile="logout"]')!);
    expect(isOpen(t)).toBe(false);
    expect(h.logout).toHaveBeenCalledTimes(1);
  });

  it('④ 다른 메뉴 열기 — 동시에 둘이 열리지 않는다', () => {
    const [a, b] = triggers();
    click(a);
    click(b);
    expect([isOpen(a), isOpen(b)]).toEqual([false, true]);
  });

  // ⚠ **이 테스트는 햄버거 리스너를 검증하지 못한다 — 등가 뮤테이션이다.**
  // 뮤테이션 실측(2026-08-08, 17건 중 이것만 안 깨졌다): 소스에서
  // `burger.addEventListener('click', () => closeProfile(false))` 를 통째로 지워도
  // 29건이 전부 통과했다. 원인은 **겹친 방어**다 — `navBurger`(landing.html:1031)는
  // `navAuth`(:1041)·`nsAuth`(:1054)의 **형제**라 프로필 메뉴 wrap 밖이고,
  // `stopPropagation` 이 파일 전체에 0건이므로 햄버거 클릭이 document 까지 버블링해
  // **① 바깥클릭 리스너가 이미 같은 일을 한다.**
  //
  // 즉 행동이 불변이라 **어떤 테스트로도 원리상 못 잡는다.** 이것을 "테스트가 없다" 로
  // 적으면 틀린다(위임 보고가 실제로 그렇게 해석했다) — 테스트는 있고, 다른 경로가
  // 잡아서 통과한 것이다. 관측과 해석은 다른 일이다.
  //
  // 그래도 소스의 그 줄을 지우지 않는 이유: ① 리스너가 나중에 좁아지면(예: 특정 영역만
  // 바깥으로 치면) 그때는 이 줄이 유일한 방어가 된다. 명시적 방어를 지우는 대가는
  // 조용하다.
  it('④ 햄버거 — 시트를 여닫으면 프로필 메뉴가 닫힌다', () => {
    const t = triggers()[0];
    click(t);
    click(document.getElementById('navBurger')!);
    expect(isOpen(t)).toBe(false);
  });

  it('⑤ 포커스 이탈 — Tab 으로 메뉴 밖으로 나가면 닫힌다', () => {
    const t = triggers()[0];
    click(t);
    const outside = document.getElementById('navBurger')!;
    outside.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(isOpen(t)).toBe(false);
  });

  it('⑥ 브레이크포인트 횡단 — 열린 채 폭이 넘어가면 닫는다', () => {
    const h = boot(PROFILE);
    const t = triggers()[0];
    click(t);
    h.resizeTo(390);
    // 안 닫으면 데스크톱으로 돌아왔을 때 열린 채로 되살아난다(유령 상태).
    expect(isOpen(t)).toBe(false);
  });

  it('⑥ 같은 구간 안의 resize 로는 닫지 않는다 — 스크롤바·주소창 변화로 닫히면 안 된다', () => {
    const h = boot(PROFILE);
    const t = triggers()[0];
    click(t);
    h.resizeTo(1100); // 여전히 > 720
    expect(isOpen(t)).toBe(true);
  });
});

describe('시트 연동', () => {
  it('시트 안에서 항목을 고르면 시트도 함께 닫힌다', () => {
    boot(PROFILE);
    const sheet = document.getElementById('navSheet')!;
    const burger = document.getElementById('navBurger')!;
    click(burger);
    expect(sheet.classList.contains('is-open')).toBe(true);

    const sheetTrigger = document.querySelector('#nsAuth [data-nav-profile="trigger"]')!;
    click(sheetTrigger);
    click(document.querySelector('#nsAuth [data-nav-profile="mypage"]')!);
    // 시트가 열린 채 남으면 이동 후 뒤로가기로 돌아왔을 때 화면을 덮는다.
    expect(sheet.classList.contains('is-open')).toBe(false);
  });

  it('로그인 전에도 햄버거는 열린다 — 내비게이션은 탈출로다', () => {
    boot(null);
    const sheet = document.getElementById('navSheet')!;
    click(document.getElementById('navBurger')!);
    expect(sheet.classList.contains('is-open')).toBe(true);
  });
});

describe('자기완결·CSP', () => {
  beforeEach(() => { boot(PROFILE); });

  it('아이콘이 인라인 SVG 다 — 외부 호스트 0', () => {
    const menu = document.querySelector('[data-nav-profile="menu"]')!;
    expect(menu.querySelectorAll('svg').length).toBeGreaterThan(0);
    for (const el of Array.from(document.querySelectorAll('.nav-profile *'))) {
      for (const attr of ['src', 'href', 'srcset'] as const) {
        const v = el.getAttribute(attr);
        if (v) expect(/^(https?:)?\/\//i.test(v), `${el.tagName} ${attr}="${v}"`).toBe(false);
      }
    }
  });

  it('아이콘은 스크린리더가 읽지 않는다 — 옆 텍스트와 중복', () => {
    for (const svg of Array.from(document.querySelectorAll('.nav-profile svg'))) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('인라인 이벤트 핸들러가 없다 — CSP 와 어긋난다', () => {
    for (const el of Array.from(document.querySelectorAll('.nav-profile, .nav-profile *'))) {
      for (const attr of Array.from(el.attributes)) {
        expect(attr.name.startsWith('on'), `${el.tagName} ${attr.name}`).toBe(false);
      }
    }
  });
});
