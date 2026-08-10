// nav-knob.js — 주 메뉴 통합 후보 4안 노브(`?nav=`)
//
// ── 왜 있나 ────────────────────────────────────────────────────────────────
// 지금 주 메뉴가 **두 벌**이다(실측 2026-08-09):
//   홈  `landing.html`  전시 · 포토월 · 요금제 · 소개 · 가이드 | 로그인·회원가입 | [입장하기]
//   서브 `about.html`·`guide.html`  랜딩 · 소개 · 전시장 입장 · 작가 스튜디오 · 이용 안내
// 드러난 불일치 셋: ① 같은 목적지를 다른 이름으로 부른다(`guide.html` = "가이드"/"이용
// 안내", `./app/` = "입장하기"/"전시장 입장") ② 「작가 스튜디오」가 서브에만 있다
// ③ 「랜딩」이 브랜드 로고와 역할 중복(로고가 이미 홈 링크).
//
// 어느 통합안이 맞는지는 **화면으로만 갈린다.** 그래서 글로 설득하지 않고 네 후보를
// 한 배포에 담아 노브로 연다 — 감독이 링크 하나로 눌러 비교하고 판정하신다
// (`CLAUDE.md` 「판단이 갈리는 것은 이 사이클로 결정한다」 2·3항).
//
// ── 이 파일이 지키는 안전장치 ──────────────────────────────────────────────
// **노브가 없으면 아무것도 하지 않는다.** `readNavVariant` 가 `'a'` 를 돌려주면
// `applyNavKnob` 은 DOM 을 **한 노드도** 만지지 않고 즉시 돌아간다. 라이브 3개 페이지에
// 손을 대면서 지킬 유일한 안전장치가 이것이라, A 를 "다시 그려서 같게" 만들지 않았다 —
// 다시 그리면 「같은가」가 매번 재검증 대상이 되고, 그 검증은 언젠가 생략된다.
// `tests/nav-knob.test.ts` 가 세 페이지의 A 경로를 **적용 전후 outerHTML 바이트 동일**로
// 못 박는다(그 단언을 지우면 이 문단이 곧 거짓 진술이 된다).
//
// ── 왜 인라인이 아니라 파일인가 ────────────────────────────────────────────
// 세 페이지의 CSP 가 전부 `script-src 'self' 'sha256-…'` 이다. 인라인으로 쓰면
// ① 소스 HTML 세 곳의 핀을 손으로 다시 계산해야 하고(`tests/csp-inline-pins.test.ts`
// 가 검사한다) ② 같은 코드가 세 벌이 되어 그 순간 값 미러링이다. 외부 파일은
// `'self'` 로 이미 허용되고, vite 가 `<script type="module" src>` 를 진입점으로 잡아
// 번들하므로 배포물에도 그대로 들어간다.

/** 후보 식별자. `'a'` 는 현행(= 노브 없음)이다. */
export const NAV_VARIANTS = ['a', 'b', 'c', 'd'];

/** 이 노브가 붙는 페이지. `<script data-nav-page="…">` 로 각 HTML 이 자기를 알린다. */
export const NAV_PAGES = ['home', 'about', 'guide'];

/**
 * `?nav=` 를 읽는다. **모르는 값은 전부 `'a'`(현행)로 떨어진다** — 오타·대문자·빈 값·
 * 파라미터 부재가 전부 같은 안전한 결과를 낸다. 여기서 예외를 던지면 조용한 콘솔
 * 에러가 되고, 감독이 링크를 잘못 눌렀을 때 화면이 아니라 로그로만 알려주게 된다.
 *
 * @param {string} search `location.search` 형태(`'?nav=b'`). 빈 문자열 허용.
 * @returns {'a'|'b'|'c'|'d'}
 */
export function readNavVariant(search) {
  let raw = '';
  try {
    raw = new URLSearchParams(String(search || '')).get('nav') || '';
  } catch {
    return 'a'; // URLSearchParams 가 던질 입력은 없지만, 파싱은 실패해도 현행으로 산다.
  }
  const v = raw.trim().toLowerCase();
  return NAV_VARIANTS.includes(v) ? /** @type {'a'|'b'|'c'|'d'} */ (v) : 'a';
}

// ── 항목 사전 ──────────────────────────────────────────────────────────────
// **명칭은 여기 한 곳**이다. 후보 정의(`PLANS`)는 id 만 나열한다 — 라벨을 후보마다
// 적으면 "가이드"/"이용 안내" 가 갈린 지금 상태를 코드 안에서 재현하게 된다.
//
// `anchor` 는 홈 섹션 id 다. 홈에서는 `#exhibitions`, 서브에서는 `./index.html#exhibitions`
// 로 **유도**한다(서브에서 앵커만 쓰면 그 페이지 안을 찾다가 아무 데도 안 간다).
const ITEMS = {
  exhibitions: { label: '전시', anchor: 'exhibitions' },
  photowall: { label: '포토월', anchor: 'photowall' },
  pricing: { label: '요금제', anchor: 'pricing' },
  about: { label: '소개', href: './about.html' },
  guide: { label: '가이드', href: './guide.html' },
  studio: { label: '작가 스튜디오', href: './app/studio.html' },
  enter: { label: '입장하기', href: './app/' },
};

/** 페이지별 `current` 대상 항목. 홈은 없다 — 홈 링크 역할은 브랜드 로고가 한다. */
const CURRENT_OF = { home: null, about: 'about', guide: 'guide' };

/**
 * 후보 구성. **항목 구성이 이 노브의 판정 축**이므로 라벨·순서를 여기서 바꾸면
 * 감독이 비교하는 대상 자체가 바뀐다. 값을 만질 때는 판정 결과를 옆에 적을 것.
 *
 *   B = 홈 기준 통일   홈 메뉴를 서브에 그대로 옮긴다. 「랜딩」 제거(로고가 그 역할),
 *                      「작가 스튜디오」는 auth 영역. 명칭은 홈 쪽으로.
 *   C = 여정 순서      관람(전시) → 이해(소개·가이드) → 창작(스튜디오) 순. 포토월·
 *                      요금제는 홈 섹션으로만 두고 메뉴에서 뺀다.
 *   D = 최소          메뉴에 셋만. 작가 스튜디오는 auth 영역.
 *
 * `authStudio: true` 는 「작가 스튜디오」를 links 가 아니라 로그인·회원가입 쪽에
 * 붙인다는 뜻이다 — 관람 동선과 창작 동선을 시각적으로 가른다.
 */
const PLANS = {
  b: { links: ['exhibitions', 'photowall', 'pricing', 'about', 'guide'], authStudio: true },
  c: { links: ['exhibitions', 'about', 'guide', 'studio'], authStudio: false },
  d: { links: ['exhibitions', 'about', 'guide'], authStudio: true },
};

/**
 * 항목 id 를 그 페이지에서의 실제 링크로 바꾼다.
 * @param {string} id
 * @param {'home'|'about'|'guide'} page
 */
function hrefOf(id, page) {
  const it = ITEMS[id];
  if (it.href) return it.href;
  // 앵커 항목: 홈이면 페이지 안, 서브면 홈으로 건너뛴다.
  return page === 'home' ? `#${it.anchor}` : `./index.html#${it.anchor}`;
}

/**
 * 후보 + 페이지 → 메뉴 계획. **`'a'` 는 계획이 없다**(`null`) — 그것이 "아무것도 하지
 * 않는다" 의 코드상 표현이다.
 *
 * @param {'a'|'b'|'c'|'d'} variant
 * @param {'home'|'about'|'guide'} page
 * @returns {null | {links: Array<{id:string,label:string,href:string,current:boolean}>,
 *                   authStudio: boolean, enter: {label:string,href:string}}}
 */
export function navPlan(variant, page) {
  if (variant === 'a') return null;
  if (!NAV_PAGES.includes(page)) return null;
  const plan = PLANS[variant];
  if (!plan) return null;
  const cur = CURRENT_OF[page];
  return {
    links: plan.links.map((id) => ({
      id,
      label: ITEMS[id].label,
      href: hrefOf(id, page),
      current: id === cur,
    })),
    authStudio: plan.authStudio,
    enter: { label: ITEMS.enter.label, href: ITEMS.enter.href },
  };
}

// ── 노브 전용 CSS ──────────────────────────────────────────────────────────
// **후보에서만 주입한다.** A 에서는 이 `<style>` 태그가 아예 생기지 않는다.
//
// 값(색·간격·타이포)을 여기서 새로 정하지 않는다 — 전부 기존 규칙이 걸리도록
// 기존 클래스(`nav-auth`·`nav-auth-link`)를 재사용하거나 `currentColor` 로 받는다.
// 이번 축은 **항목 구성**이지 룩이 아니다.
//
// ⚠ 이 문자열 안에서는 **백틱을 쓰지 마라.** 템플릿 리터럴이라 주석 안의 백틱 하나가
// 문자열을 조기 종료시키고, 그 순간 파일 전체가 파싱 에러다(첫 판본이 그렇게 죽었다 —
// 이 저장소 주석 관례가 식별자를 백틱으로 감싸는 것이라 반사적으로 그렇게 썼다).
const KNOB_CSS = `
/* 서브 페이지 — 모바일에서 메뉴를 되살린다.
   about.html / guide.html 은 @media(max-width:640px) 에서 .topnav{display:none} 이라
   **모바일에 주 메뉴가 아예 없다**(실측: about.html:284 · guide.html:435). 감독은
   모바일로 보시므로 그 상태로는 서브 후보를 비교할 수 없다.
   미디어쿼리를 복제해 되돌리지 않는다 — 복제하면 640 을 한쪽만 고치는 날 조용히
   어긋난다. 미디어쿼리는 명시도를 올리지 않으므로 (0,3,0) 셀렉터로 그냥 이긴다.
   .topnav 는 원래 flex-wrap:wrap 이라 좁은 폭에서 줄바꿈된다(가로넘침 0). */
.topbar .topnav.oasnav-on { display: flex; align-items: center; }

/* 서브 페이지 로그인·회원가입은 button 이다(링크가 아니라 모달을 연다).
   시각값은 소스의 ".topnav a, .topnav button" 규칙이 준다 — 여기서는 브라우저
   기본 버튼 껍데기만 벗긴다. 값 복제 0. */
.topnav button.oasnav-btn {
  background: none;
  border-width: 0 0 1px;
  font-family: inherit;
  cursor: pointer;
}

/* 서브 페이지 구분자 — 관람 항목 | 로그인·회원가입 | 입장하기 를 가른다.
   (홈은 자기 .nav-auth-sep 을 그대로 쓴다 — 여기 규칙은 .topbar 안에서만 걸린다.)

   ⚠ 첫 판본은 background: currentColor + opacity 로 「값을 안 정하는」 쪽을 골랐다.
   **화면에서 안 보였다**(육안 실측 2026-08-09, about/guide 데스크톱·모바일 모두).
   .topnav 에도 .topbar 에도 color 선언이 없어 상속되는 것이 본문 잉크
   rgb(32,33,36) 였고, 다크 밴드 위에서 사실상 검정이다. 링크가 color 를 자기
   규칙으로 따로 받고 있어서 「인접 링크와 같은 색」이라는 전제 자체가 틀렸다.
   **값을 안 적는 것이 값을 틀리게 적는 것보다 낫지 않았다.**
   그래서 명시한다: 이 페이지 내비의 흰 계열 알파를 쓰되(링크 0.72) 그보다 낮춰
   구분자가 항목을 이기지 않게 한다. 0.25 는 홈 .nav-auth-sep 과 같은 역할·같은 알파다. */
.topbar .topnav .oasnav-sep {
  flex: none;
  align-self: center;
  width: 1px;
  height: 12px;
  background: rgba(255, 255, 255, 0.25);
}

/* 홈 — 「작가 스튜디오」를 auth 영역에 붙인다(후보 B·D).
   #navAuth **안**에 넣으면 안 된다: landing.html 의 renderNav() 가 로그인 상태가
   바뀔 때마다 그 컨테이너를 textContent='' 로 비우고 다시 채운다(실측
   landing.html:1817) — 넣은 링크가 로그인하는 순간 사라진다. 그래서 **형제**로 두고
   같은 .nav-auth 클래스를 준다: margin-left:auto · display:flex · 모바일
   display:none 이 전부 그대로 걸려서 브레이크포인트(720px)를 복제할 일이 없다.
   뒤따르는 진짜 #navAuth 의 margin-left:auto 만 죽인다 — 둘 다 auto 면 flex 가
   남은 공간을 둘 사이에 **나눠** 스튜디오가 중앙으로 밀린다. */
.topnav .oasnav-studio ~ .nav-auth { margin-left: 0; }
.topnav .oasnav-studio .nav-auth-link { text-decoration: none; }
`;

const STYLE_ID = 'oas-nav-knob-styles';

function injectCss(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const st = doc.createElement('style');
  st.id = STYLE_ID;
  st.textContent = KNOB_CSS;
  (doc.head || doc.documentElement).appendChild(st);
}

/** 메뉴 링크 하나. `current` 는 소스 CSS 의 `.topnav a.current` 강조를 그대로 쓴다. */
function anchorOf(doc, item, cls) {
  const a = doc.createElement('a');
  a.href = item.href;
  a.textContent = item.label;
  if (cls) a.className = cls;
  if (item.current) a.classList.add('current');
  return a;
}

function sepOf(doc) {
  const s = doc.createElement('span');
  s.className = 'oasnav-sep';
  s.setAttribute('aria-hidden', 'true');
  return s;
}

// ── 홈(landing.html) 적용 ──────────────────────────────────────────────────
function applyHome(doc, plan) {
  // ① 데스크톱 링크 행
  const links = doc.querySelector('.topnav .nav-links');
  if (links) {
    links.textContent = '';
    for (const it of plan.links) links.appendChild(anchorOf(doc, it));
  }

  // ② 모바일 시트 — 같은 후보를 따라야 한다. 데스크톱만 바꾸면 감독 화면(모바일)이
  //    후보와 어긋나고, 그러면 판정 자체가 무효다.
  const sheet = doc.getElementById('navSheet');
  const divider = sheet && sheet.querySelector('.ns-divider');
  if (sheet && divider) {
    // divider **앞**이 메뉴 링크 구간이다. 뒤(auth·입장하기)는 건드리지 않는다.
    for (const n of Array.from(sheet.children)) {
      if (n === divider) break;
      n.remove();
    }
    for (const it of plan.links) sheet.insertBefore(anchorOf(doc, it), divider);
  }

  // ③ 작가 스튜디오 — auth 영역(후보 B·D)
  if (plan.authStudio) {
    const navAuth = doc.getElementById('navAuth');
    if (navAuth && navAuth.parentNode) {
      const box = doc.createElement('div');
      box.className = 'nav-auth oasnav-studio';
      const a = doc.createElement('a');
      a.className = 'nav-auth-link';
      a.href = ITEMS.studio.href;
      a.textContent = ITEMS.studio.label;
      box.appendChild(a);
      navAuth.parentNode.insertBefore(box, navAuth);
    }
    const nsAuth = doc.getElementById('nsAuth');
    if (sheet && nsAuth) {
      // 시트에서도 auth 구간(divider 뒤)에 둔다. `#nsAuth` 는 renderNav 가 비우므로
      // 여기서도 **형제**다. `.nav-sheet > a` 규칙이 그대로 걸려 다른 메뉴 항목과
      // 같은 룩이 된다.
      sheet.insertBefore(anchorOf(doc, { ...ITEMS.studio, current: false }, ''), nsAuth);
    }
  }
}

// ── 서브(about.html · guide.html) 적용 ─────────────────────────────────────
function applySub(doc, plan) {
  const nav = doc.querySelector('.topbar .topnav');
  if (!nav) return;
  nav.textContent = '';
  nav.classList.add('oasnav-on');
  // 홈의 `<nav class="topnav" aria-label="주 메뉴">` 와 같은 랜드마크 라벨을 준다.
  // 후보 B·C·D 에서 이 nav 는 홈과 **같은 항목**을 담으므로 보조기술에도 같은
  // 이름으로 읽혀야 한다. A 에서는 이 코드가 돌지 않으므로 현행 마크업은 불변이다.
  nav.setAttribute('aria-label', '주 메뉴');

  for (const it of plan.links) nav.appendChild(anchorOf(doc, it));
  nav.appendChild(sepOf(doc));

  // auth 자리 — 컨테이너만 동기로 만들고 내용은 아래 `wireSubAuth` 가 채운다.
  // 홈의 `#navAuth` 와 같은 역할이라 로그인 상태에 따라 갈아끼워진다.
  const authBox = doc.createElement('span');
  authBox.className = 'oasnav-auth';
  authBox.style.display = 'contents'; // 레이아웃에 관여하지 않는 순수 그룹
  nav.appendChild(authBox);

  nav.appendChild(sepOf(doc));
  nav.appendChild(anchorOf(doc, { ...plan.enter, current: false }, ''));
  return authBox;
}

/** 로그인/회원가입 버튼 두 개. 소스의 `.topnav a, .topnav button` 규칙이 룩을 준다. */
function authButtons(doc, onOpen) {
  const out = [];
  for (const [mode, label] of [['login', '로그인'], ['signup', '회원가입']]) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'oasnav-btn';
    b.textContent = label;
    b.addEventListener('click', () => onOpen(mode));
    out.push(b);
  }
  return out;
}

/**
 * 서브 페이지 auth 배선. **동적 import 다** — A 경로에서는 이 함수 자체가 안 불리므로
 * `auth.js`·`auth-modal.js` 청크를 받지도 않는다.
 *
 * ⚠ 여기서 하지 않는 것: 홈의 프로필 **드롭다운 메뉴**(개인 프로필·로그아웃)는
 * 재현하지 않는다. 이번 노브의 판정 축은 **메뉴 항목 구성**이고, 드롭다운을 옮기는
 * 것은 그 자체가 별도 설계 분기다. 로그인 상태에서는 이름을 마이페이지 링크로만
 * 보여 준다 — 후보 판정에 필요한 만큼이다.
 */
function wireSubAuth(doc, authBox) {
  const open = (mode) => import('./auth-modal.js')
    .then((m) => m.openAuthModal({ mode }))
    .catch((e) => console.warn('[nav-knob] 로그인 모달을 열지 못했다', e));

  const render = (profile) => {
    authBox.textContent = '';
    if (profile && profile.name) {
      const a = doc.createElement('a');
      a.href = './app/mypage.html';
      a.textContent = profile.name;
      authBox.appendChild(a);
      return;
    }
    for (const b of authButtons(doc, open)) authBox.appendChild(b);
  };

  render(null); // 먼저 그린다 — auth 청크가 늦어도 메뉴가 비어 보이지 않는다.
  import('./auth.js')
    .then(({ getProfile, onAuthChange }) => {
      const sync = () => render(getProfile());
      onAuthChange(sync);
      sync();
    })
    .catch((e) => console.warn('[nav-knob] 로그인 상태를 읽지 못했다', e));
}

/**
 * 노브를 적용한다. **`variant === 'a'` 면 DOM 을 한 노드도 만지지 않고 돌아간다.**
 *
 * @param {Document} doc
 * @param {'a'|'b'|'c'|'d'} variant
 * @param {'home'|'about'|'guide'} page
 * @returns {boolean} 적용했으면 true(= 후보 B·C·D), 현행이면 false
 */
export function applyNavKnob(doc, variant, page) {
  const plan = navPlan(variant, page);
  if (!plan) return false;
  injectCss(doc);
  if (page === 'home') applyHome(doc, plan);
  else {
    const box = applySub(doc, plan);
    if (box) wireSubAuth(doc, box);
  }
  doc.documentElement.setAttribute('data-nav-knob', variant);
  return true;
}

// ── 부트 ───────────────────────────────────────────────────────────────────
// 페이지 식별은 **`<html data-nav-page>`** 다.
//
// ⚠ 처음에는 `<script src="…" data-nav-page="home">` 로 script 태그에 달았다.
// **배포물에서 죽는다**(2026-08-09 실측). vite 는 `<script type="module" src>` 를
// rollup 진입점으로 바꿔치기하면서 태그를 다시 쓰는데, 그때 **원래 속성을 버린다** —
// 산출 HTML 에 남는 것은 `type`·`crossorigin`·`src` 뿐이다. 게다가 `landing.html` 은
// module 세 개가 청크 하나로 합쳐져 **태그 자체가 사라졌다.** 소스만 보는 단위테스트는
// 전부 통과하고 라이브에서만 노브가 안 도는, 이 저장소가 이름 붙인 그 형태다.
// `<html>` 속성은 vite 가 건드리지 않는다(실측: `dist/*.html` 세 파일에서 보존 확인).
//
// `location.pathname` 추정으로 가지 않은 이유: 배포 서브패스(`/openartshow/`)·루트
// 서빙·`_site/app/` 부산물 사본에서 같은 파일이 서로 다른 경로로 열린다. 경로 추정은
// 그 차이만큼 틀릴 자리를 만들고, 틀려도 조용하다.
if (typeof document !== 'undefined' && document.documentElement) {
  const page = document.documentElement.getAttribute('data-nav-page');
  if (page && NAV_PAGES.includes(page)) {
    const variant = readNavVariant(typeof location !== 'undefined' ? location.search : '');
    applyNavKnob(document, variant, /** @type {'home'|'about'|'guide'} */ (page));
  }
}
