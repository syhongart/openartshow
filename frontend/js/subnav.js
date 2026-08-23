// subnav.js — 서브 페이지(`about.html`·`guide.html`) 주 메뉴의 로그인 영역 배선.
//
// ── 왜 있나 ────────────────────────────────────────────────────────────────
// 감독 판정 2026-08-10 으로 주 메뉴가 홈 기준(후보 B)으로 통일되면서, 서브 두 페이지의
// 메뉴에도 **로그인·회원가입**이 들어왔다. 그 둘은 이동이 아니라 모달을 여는 조작이라
// `<a href>` 가 아니라 `<button>` 이고, 버튼은 배선이 없으면 **보이는데 눌러도 아무 일도
// 안 일어난다.** 그 상태로 두는 것이 이 회차에서 가장 쉬운 회귀였다.
//
// ── 마크업은 HTML 에 있고 이 파일은 배선만 한다 ────────────────────────────
// 버튼을 JS 로 **만들지** 않는다(판정용 임시 노브는 그렇게 했고, 판정과 함께 지웠다).
// 이유 둘:
//   ① 메뉴 구성이 소스 HTML 에 고정돼야 `tests/main-nav.test.ts` 가 **세 페이지를 파싱해**
//      같은 항목·같은 명칭을 단언할 수 있다. JS 가 만들면 소스에는 아무것도 없다.
//   ② 이 스크립트가 못 뜨거나 죽어도 메뉴 자체는 그대로 보인다 — 사라지는 것은
//      「로그인 상태 반영」뿐이다. 내비게이션은 이 페이지의 탈출로다(`landing.html` 이
//      `escapeHtml` 스코프 사고로 모바일 메뉴를 통째로 잃은 뒤 세운 원칙).
//
// ── 여기서 하지 않는 것 ────────────────────────────────────────────────────
// 홈의 **프로필 드롭다운**(개인 프로필·로그아웃)은 재현하지 않는다. 그것을 서브로
// 옮기는 것은 메뉴 구성이 아니라 별도 설계 분기이고, 노브 B 판정에도 포함되지 않았다.
// 로그인 상태에서는 이름을 마이페이지 링크로만 보여 준다 — 감독이 판정한 화면 그대로다.

const MYPAGE = './app/mypage.html';

/** 슬롯을 로그아웃 상태(버튼 둘)로 되돌린다. HTML 초기 상태와 같은 모양이다. */
function renderButtons(slot, open) {
  slot.textContent = '';
  for (const [mode, label] of [['login', '로그인'], ['signup', '회원가입']]) {
    const b = slot.ownerDocument.createElement('button');
    b.type = 'button';
    b.dataset.authMode = mode;
    b.textContent = label;
    b.addEventListener('click', () => open(mode));
    slot.appendChild(b);
  }
}

/** 로그인 상태 — 이름을 마이페이지 링크로. `textContent` 라 마크업 주입 축이 없다. */
function renderProfile(slot, profile) {
  slot.textContent = '';
  const a = slot.ownerDocument.createElement('a');
  a.href = MYPAGE;
  a.textContent = profile.name;
  slot.appendChild(a);
}

/**
 * 슬롯 하나를 배선한다. **HTML 이 이미 그려 둔 버튼에 리스너부터 건다** — 그래야
 * `auth.js` 청크가 늦거나 실패해도 버튼이 동작한다(모달 import 는 클릭 시점이다).
 *
 * @param {Element} slot `#navAuthSlot`
 * @returns {void}
 */
export function wireSubnavAuth(slot) {
  if (!slot) return;

  const open = (mode) => import('./auth-modal.js')
    .then((m) => m.openAuthModal({ mode }))
    .catch((e) => console.warn('[subnav] 로그인 모달을 열지 못했다', e));

  // ① 소스 마크업의 버튼에 리스너를 건다(다시 그리지 않는다).
  for (const b of slot.querySelectorAll('button[data-auth-mode]')) {
    b.addEventListener('click', () => open(b.dataset.authMode));
  }

  // ② 로그인 상태를 따라간다. 실패하면 ①의 로그아웃 화면이 그대로 산다.
  import('./auth.js')
    .then(({ getProfile, onAuthChange }) => {
      const sync = () => {
        const p = getProfile();
        if (p && p.name) renderProfile(slot, p);
        else renderButtons(slot, open);
      };
      onAuthChange(sync);
      sync();
    })
    .catch((e) => console.warn('[subnav] 로그인 상태를 읽지 못했다', e));
}

if (typeof document !== 'undefined') {
  wireSubnavAuth(document.getElementById('navAuthSlot'));
}
