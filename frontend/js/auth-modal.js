// auth-modal.js — 공용 로그인 / 회원가입 모달 (베타)
//
// 사이트 어디서든 아래처럼 호출:
//   import { openAuthModal } from './js/auth-modal.js';
//   openAuthModal({ mode: 'login' | 'signup' });   // mode 생략 시 'login'
//
// 자기완결 모듈 — DOM/CSS를 최초 호출 시 1회 지연 생성해 <body>에 붙이고, 이후 호출은 싱글턴을 재사용한다.
// auth.js(PROVIDERS/loginWith/getProfile/logout/onAuthChange/isMockMode)를 그대로 사용하며 이 파일은
// auth.js를 수정하지 않는다(인터페이스 불변).
//
// ── 개인정보보호법 실사 반영 지점 ──────────────────────────────────────────
// 1) 로그인/회원가입 탭 전환                → buildDOM()의 role="tablist" 두 탭, setMode()
// 2) 약관·개인정보 동의 각각 별개 체크박스   → #oasConsent 내 개별 <input data-oas-consent>,
//                                             "전체 동의"는 편의 토글일 뿐 실제 동의 판정은 개별 항목만 사용
// 3) 베타·mock 고지 상시                    → #oasAuthBadge, updateBadge()(isMockMode 기반)
// 4) 수집 최소화(닉네임만, 이메일/식별자 없음) → 입력 필드 자체를 두지 않음(소셜 버튼이 표시명만 부여)
// 5) 무가입 병존(대등 배치)                  → #oasGuestBtn, 소셜 버튼과 동일한 크기/스타일
// 6) 미동의 시 진행 불가(단 mock이라 미저장)  → updateConsentGate() — consent 객체는 메모리에만 존재,
//                                             localStorage/서버로 전송하지 않음
// ─────────────────────────────────────────────────────────────────────────

import { PROVIDERS, loginWith, isMockMode } from './auth.js';

const STYLE_ID = 'oas-auth-modal-styles';

const BRAND_ICON = {
  google: { cls: 'g', label: 'G' },
  kakao: { cls: 'k', label: 'K' },
  naver: { cls: 'n', label: 'N' },
};

const CSS = `
.oas-auth-overlay {
  --oas-surface-1: var(--surface-dark-1, #1F2128);
  --oas-surface-2: var(--surface-dark-2, #2A2C37);
  --oas-border: var(--border-light, var(--border-dark, #3A3D4B));
  --oas-text: var(--text-light, #F5F5F2);
  --oas-dim: var(--text-dim-light, #9A9EB1);
  --oas-violet: var(--violet-500, #8B72FF);
  --oas-violet-300: var(--violet-300, #AB99FF);
  --oas-violet-600: var(--violet-600, #6C4DFF);
  --oas-cyan: var(--cyan-500, #72E6E1);
  --oas-radius: var(--r-card, 3px);
  --oas-accent-ink: var(--accent-ink, #202124);
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(20, 21, 26, 0.6);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  font-family: var(--app-font, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  word-break: keep-all;
  overflow-wrap: break-word;
}
.oas-auth-overlay[hidden] { display: none; }
.oas-auth-card {
  width: min(94vw, 400px);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--oas-surface-2);
  color: var(--oas-text);
  border: 1px solid var(--oas-border);
  border-radius: var(--oas-radius);
  padding: 26px 24px 22px;
  position: relative;
  text-align: left;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}
.oas-auth-card::before {
  content: "";
  display: block;
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, var(--oas-violet-600), var(--oas-violet-300));
  margin-bottom: 16px;
}
.oas-auth-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  font-size: 20px;
  line-height: 1;
  color: var(--oas-dim);
  cursor: pointer;
  border-radius: var(--oas-radius);
}
.oas-auth-close:hover { color: var(--oas-text); }
.oas-auth-badge {
  font-size: 11.5px;
  line-height: 1.6;
  letter-spacing: 0.01em;
  color: var(--oas-cyan);
  background: rgba(114, 230, 225, 0.08);
  border: 1px solid rgba(114, 230, 225, 0.28);
  border-radius: var(--oas-radius);
  padding: 8px 10px;
  margin-bottom: 16px;
}
.oas-auth-badge[hidden] { display: none; }
.oas-auth-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--oas-border);
}
.oas-auth-tab {
  flex: 1 1 50%;
  background: none;
  border: none;
  color: var(--oas-dim);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 10px 4px 12px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.oas-auth-tab.is-active { color: var(--oas-text); border-bottom-color: var(--oas-violet); }
.oas-auth-tab:hover { color: var(--oas-text); }
.oas-auth-head { margin-bottom: 14px; }
.oas-auth-title { font-size: 19px; font-weight: 700; }
.oas-auth-sub { margin: 6px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--oas-dim); }

.oas-auth-consent {
  margin-bottom: 16px;
  border: 1px solid var(--oas-border);
  border-radius: var(--oas-radius);
  padding: 4px 12px;
  background: var(--oas-surface-1);
}
.oas-auth-consent[hidden] { display: none; }
.oas-consent-all {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 0;
  border-bottom: 1px solid var(--oas-border);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--oas-text);
  cursor: pointer;
}
.oas-consent-row {
  display: grid;
  grid-template-columns: 18px 1fr;
  column-gap: 10px;
  row-gap: 3px;
  padding: 10px 0;
  border-bottom: 1px solid var(--oas-border);
}
.oas-consent-row:last-of-type { border-bottom: none; }
.oas-consent-row input[type="checkbox"],
.oas-consent-all input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 2px 0 0;
  accent-color: var(--oas-violet);
  flex: none;
}
.oas-consent-row input[type="checkbox"] { grid-column: 1; grid-row: 1; }
.oas-consent-label-wrap {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  cursor: pointer;
  font-size: 13.5px;
  color: var(--oas-text);
}
.oas-tag {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--oas-dim);
  border: 1px solid var(--oas-border);
  border-radius: var(--oas-radius);
  padding: 1px 6px;
  white-space: nowrap;
}
.oas-consent-link {
  grid-column: 2;
  grid-row: 2;
  font-size: 11.5px;
  color: var(--oas-dim);
  cursor: not-allowed;
  width: fit-content;
}
.oas-consent-link span { margin-left: 3px; opacity: 0.8; }
.oas-consent-note {
  margin: 8px 0 10px;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--oas-dim);
}

.oas-auth-social { margin-top: 4px; }
.oas-auth-btn,
.oas-auth-guest {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 8px;
  border-radius: var(--oas-radius);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease;
}
.oas-auth-btn {
  background: var(--oas-surface-1);
  border: 1px solid var(--oas-border);
  color: var(--oas-text);
}
.oas-auth-btn:hover:not(:disabled) { border-color: var(--oas-violet); background: var(--oas-surface-2); }
.oas-auth-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.oas-auth-ic {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}
/* 소셜 브랜드 컬러 — Google/Kakao/Naver 실제 브랜드색, 팔레트 토큰과 무관(제공자 식별용) */
.oas-auth-ic.g { background: #4285f4; }
.oas-auth-ic.k { background: #fee500; color: #191919; }
.oas-auth-ic.n { background: #03c75a; }

.oas-auth-guest {
  justify-content: center;
  background: transparent;
  border: 1px solid rgba(245, 245, 242, 0.35);
  color: var(--oas-text);
  margin-top: 4px;
}
.oas-auth-guest:hover { border-color: var(--oas-violet); color: var(--oas-violet-300); }

.oas-auth-card :focus-visible {
  outline: 2px solid var(--oas-violet);
  outline-offset: 2px;
  border-radius: var(--oas-radius);
}

@media (max-width: 420px) {
  .oas-auth-card { padding: 22px 18px 18px; }
  .oas-auth-title { font-size: 18px; }
}

@media (prefers-reduced-motion: reduce) {
  .oas-auth-btn, .oas-auth-guest, .oas-auth-tab { transition-duration: .01ms !important; }
}
`;

let root = null;
let mode = 'login';
let lastFocused = null;
let consent = { terms: false, privacy: false, age: false };

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

function allConsentGiven() {
  return consent.terms && consent.privacy && consent.age;
}

function buildDOM() {
  const overlay = document.createElement('div');
  overlay.className = 'oas-auth-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="oas-auth-card" role="dialog" aria-modal="true" aria-labelledby="oasAuthTitle" aria-describedby="oasAuthSub">
      <button type="button" class="oas-auth-close" data-oas-close aria-label="닫기">&times;</button>
      <div class="oas-auth-badge" id="oasAuthBadge" hidden>베타 · 현재 체험용 미리보기이며 실제 개인정보는 수집·저장하지 않습니다</div>
      <div class="oas-auth-tabs" role="tablist" aria-label="로그인 또는 회원가입">
        <button type="button" role="tab" id="oasTabLogin" class="oas-auth-tab" aria-selected="true" aria-controls="oasAuthPanel" data-oas-mode="login">로그인</button>
        <button type="button" role="tab" id="oasTabSignup" class="oas-auth-tab" aria-selected="false" aria-controls="oasAuthPanel" data-oas-mode="signup">회원가입</button>
      </div>
      <div class="oas-auth-panel" id="oasAuthPanel">
        <div class="oas-auth-head">
          <div class="oas-auth-title" id="oasAuthTitle">로그인</div>
          <p class="oas-auth-sub" id="oasAuthSub">소셜 계정으로 다시 시작하세요.</p>
        </div>
        <div class="oas-auth-consent" id="oasConsent" hidden>
          <label class="oas-consent-all">
            <input type="checkbox" id="oasConsentAll">
            <span>전체 동의</span>
          </label>
          <div class="oas-consent-row">
            <input type="checkbox" id="oasConsentTerms" data-oas-consent="terms">
            <label for="oasConsentTerms" class="oas-consent-label-wrap">
              <span>서비스 이용약관 동의</span>
              <span class="oas-tag">필수</span>
            </label>
            <a href="#" class="oas-consent-link" data-oas-policy-link tabindex="0" aria-disabled="true" title="약관은 아직 발행되지 않았습니다">전문 보기<span>(발행 예정)</span></a>
          </div>
          <div class="oas-consent-row">
            <input type="checkbox" id="oasConsentPrivacy" data-oas-consent="privacy">
            <label for="oasConsentPrivacy" class="oas-consent-label-wrap">
              <span>개인정보 수집·이용 동의</span>
              <span class="oas-tag">필수</span>
            </label>
            <a href="#" class="oas-consent-link" data-oas-policy-link tabindex="0" aria-disabled="true" title="개인정보처리방침은 아직 발행되지 않았습니다">전문 보기<span>(발행 예정)</span></a>
          </div>
          <div class="oas-consent-row">
            <input type="checkbox" id="oasConsentAge" data-oas-consent="age">
            <label for="oasConsentAge" class="oas-consent-label-wrap">
              <span>만 14세 이상입니다</span>
              <span class="oas-tag">필수</span>
            </label>
          </div>
          <p class="oas-consent-note">동의 항목은 이 화면에서만 확인되며, 베타 기간 동안 서버로 저장·전송되지 않습니다.</p>
        </div>
        <div class="oas-auth-social" id="oasSocial"></div>
        <button type="button" class="oas-auth-guest" id="oasGuestBtn">무가입으로 둘러보기</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  root = overlay;

  buildSocialButtons();
  wireEvents();
}

function buildSocialButtons() {
  const wrap = root.querySelector('#oasSocial');
  wrap.innerHTML = '';
  Object.keys(PROVIDERS).forEach((key) => {
    const p = PROVIDERS[key];
    const bi = BRAND_ICON[key] || { cls: '', label: '?' };
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'oas-auth-btn';
    btn.dataset.oasProvider = key;
    btn.innerHTML = `<span class="oas-auth-ic ${bi.cls}">${bi.label}</span>${p.label}`;
    btn.addEventListener('click', () => handleProviderClick(key));
    wrap.appendChild(btn);
  });
}

async function handleProviderClick(providerKey) {
  if (mode === 'signup' && !allConsentGiven()) return; // 방어적 가드 — 버튼은 이미 disabled 처리됨
  const buttons = Array.from(root.querySelectorAll('.oas-auth-btn'));
  buttons.forEach((b) => { b.disabled = true; });
  try {
    await loginWith(providerKey);
    closeAuthModal();
  } catch (err) {
    console.error('[auth-modal] 로그인 실패', err);
  } finally {
    updateConsentGate();
  }
}

function syncConsentAll() {
  const allCb = root.querySelector('#oasConsentAll');
  const boxes = Array.from(root.querySelectorAll('[data-oas-consent]'));
  const allChecked = boxes.every((cb) => cb.checked);
  const noneChecked = boxes.every((cb) => !cb.checked);
  allCb.checked = allChecked;
  allCb.indeterminate = !allChecked && !noneChecked;
}

function updateConsentGate() {
  const disable = mode === 'signup' && !allConsentGiven();
  root.querySelectorAll('.oas-auth-btn').forEach((b) => { b.disabled = disable; });
}

function updateBadge() {
  const badge = root.querySelector('#oasAuthBadge');
  const anyMock = Object.keys(PROVIDERS).some((k) => isMockMode(k));
  badge.hidden = !anyMock;
}

function setMode(newMode) {
  mode = newMode === 'signup' ? 'signup' : 'login';
  const isSignup = mode === 'signup';
  const tabLogin = root.querySelector('#oasTabLogin');
  const tabSignup = root.querySelector('#oasTabSignup');
  tabLogin.setAttribute('aria-selected', String(!isSignup));
  tabSignup.setAttribute('aria-selected', String(isSignup));
  tabLogin.classList.toggle('is-active', !isSignup);
  tabSignup.classList.toggle('is-active', isSignup);
  root.querySelector('#oasAuthTitle').textContent = isSignup ? '회원가입' : '로그인';
  root.querySelector('#oasAuthSub').textContent = isSignup
    ? '약관에 동의하고 소셜 계정으로 시작하세요.'
    : '소셜 계정으로 다시 시작하세요.';
  root.querySelector('#oasConsent').hidden = !isSignup;
  updateConsentGate();
}

function resetConsent() {
  consent = { terms: false, privacy: false, age: false };
  if (!root) return;
  root.querySelectorAll('[data-oas-consent]').forEach((cb) => { cb.checked = false; });
  const allCb = root.querySelector('#oasConsentAll');
  if (allCb) { allCb.checked = false; allCb.indeterminate = false; }
}

function getFocusable() {
  return Array.from(
    root.querySelectorAll('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])')
  ).filter((elx) => elx.offsetParent !== null);
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeAuthModal();
    return;
  }
  if (e.key === 'Tab') {
    const f = getFocusable();
    if (f.length === 0) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

function wireEvents() {
  root.querySelector('[data-oas-close]').addEventListener('click', closeAuthModal);
  root.addEventListener('click', (e) => { if (e.target === root) closeAuthModal(); });
  root.addEventListener('keydown', onKeydown);

  root.querySelectorAll('[data-oas-mode]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => setMode(tabBtn.dataset.oasMode));
  });

  root.querySelectorAll('[data-oas-consent]').forEach((cb) => {
    cb.addEventListener('change', () => {
      consent[cb.dataset.oasConsent] = cb.checked;
      syncConsentAll();
      updateConsentGate();
    });
  });

  root.querySelector('#oasConsentAll').addEventListener('change', (e) => {
    const checked = e.target.checked;
    root.querySelectorAll('[data-oas-consent]').forEach((cb) => {
      cb.checked = checked;
      consent[cb.dataset.oasConsent] = checked;
    });
    e.target.indeterminate = false;
    updateConsentGate();
  });

  // 미발행 전문 링크 — 아직 완성되지 않은 방침으로 연결하지 않는다(클릭/키보드 모두 무효화)
  root.querySelectorAll('[data-oas-policy-link]').forEach((a) => {
    a.addEventListener('click', (e) => e.preventDefault());
    a.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
    });
  });

  root.querySelector('#oasGuestBtn').addEventListener('click', closeAuthModal);
}

export function openAuthModal(opts = {}) {
  injectStyles();
  if (!root) buildDOM();
  updateBadge();
  lastFocused = document.activeElement;
  resetConsent();
  setMode(opts && opts.mode === 'signup' ? 'signup' : 'login');
  root.hidden = false;
  document.body.style.overflow = 'hidden';
  const focusTarget = root.querySelector(mode === 'signup' ? '#oasTabSignup' : '#oasTabLogin');
  requestAnimationFrame(() => {
    (focusTarget || root.querySelector('[data-oas-close]')).focus();
  });
}

export function closeAuthModal() {
  if (!root || root.hidden) return;
  root.hidden = true;
  document.body.style.overflow = '';
  if (lastFocused && typeof lastFocused.focus === 'function') {
    try { lastFocused.focus(); } catch (_) { /* 무시 */ }
  }
}
