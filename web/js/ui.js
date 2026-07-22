// web/js/ui.js
// OpenArtShow Museum — UI 모듈 (DOM/CSS 전부 JS에서 동적 생성)
// MoMA 미니멀 미학: Helvetica, 화이트/블랙, 골드(#5f9e7d) 포인트

import * as THREE from 'three';
import { AVATAR_COLORS } from './config.js';
import { createAvatarInstance } from './avatar.js';
import { getPlacedArtworks } from './artworks.js';
import {
  DEFAULT_CHIBI,
  CHIBI_HAIR_STYLES,
  CHIBI_EYE_STYLES,
  CHIBI_MOUTH_STYLES,
  CHIBI_BEARD_STYLES,
  CHIBI_BOTTOM_TYPES,
  CHIBI_ACCESSORIES,
  CHIBI_FACE_SHAPES,
  CHIBI_SPECIES,
  CHIBI_GENDERS,
  CHIBI_TOP_PATTERNS,
  CHIBI_OUTFITS,
  CHIBI_PRESETS,
  CHIBI_PRESET_GROUPS,
  CHIBI_ACTIONS,
  CHIBI_ACTION_DUR,
  SPECIES_PRESET,
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  CHIBI_CLOTH_COLORS,
  encodeChibi,
  normalizeChibi,
} from './chibi.js';
import {
  PROVIDERS as AUTH_PROVIDERS,
  MOCK_NAMES as AUTH_MOCK_PREFILL,
  loginWith as authLoginWith,
  logout as authLogout,
  getProfile as authGetProfile,
  onAuthChange,
} from './auth.js';

import { el, injectStyles, GOLD } from './ui-dom.js';
const MAX_CHAT_MESSAGES = 8;
const MAX_NICKNAME_LEN = 12;

// ---------------------------------------------------------------------------
// 내부 상태
// ---------------------------------------------------------------------------
let els = null;              // 생성된 DOM 요소 캐시
let callbacks = { onEnter: null, onChatSend: null, onAvatarChange: null, onMakerToggle: null };
let selectedColor = AVATAR_COLORS[0];
// 아야모(Ayamo) — 자체 제작 유일 캐릭터. 이름은 법무 실사 청신호로 확정
// (2026-07-12 devlog). 내부 식별자는 치비 시절 그대로(chibi: 프로토콜 하위호환).
// 아바타 저장은 유저별 네임스페이스로 분리한다. 로그인 사용자는 provider:name,
// 비로그인은 'guest' — 로그인/로그아웃 시 그 유저의 아바타가 자동 로드되고, 방문
// 간에도 유지된다. 옷장(여러 벌 저장)은 로그인 사용자 전용이다.
const LU_CHIBI_LOOK_PREFIX = 'lu-chibi-look::';
const LU_CHIBI_THUMB_PREFIX = 'lu-chibi-thumb::';
const LU_CHIBI_CLOSET_PREFIX = 'lu-chibi-closet::';
const LU_CHIBI_LEGACY_KEY = 'lu-chibi-look-v1';        // 구버전 단일 전역 키
const LU_CHIBI_LEGACY_THUMB = 'lu-chibi-look-thumb-v1';
const LU_CLOSET_MAX = 12;                              // 옷장 슬롯 상한 (localStorage 용량 보호)

// 현재 사용자 식별자 — 로그인 프로필이 있으면 'provider:name', 없으면 'guest'.
function currentUserId() {
  const p = authGetProfile();
  return p && p.provider && p.name ? `${p.provider}:${p.name}` : 'guest';
}
function chibiLookKey(uid) { return LU_CHIBI_LOOK_PREFIX + (uid || currentUserId()); }
function chibiThumbKey(uid) { return LU_CHIBI_THUMB_PREFIX + (uid || currentUserId()); }
function chibiClosetKey(uid) { return LU_CHIBI_CLOSET_PREFIX + (uid || currentUserId()); }

// 레거시(단일 전역 키) → 게스트 네임스페이스로 1회 이관. 기존 방문자의 꾸미기 보존.
function migrateLegacyChibi() {
  try {
    const legacy = localStorage.getItem(LU_CHIBI_LEGACY_KEY);
    if (legacy && !localStorage.getItem(chibiLookKey('guest'))) {
      localStorage.setItem(chibiLookKey('guest'), legacy);
      const t = localStorage.getItem(LU_CHIBI_LEGACY_THUMB);
      if (t) localStorage.setItem(chibiThumbKey('guest'), t);
    }
  } catch (_) { /* 무시 */ }
}
migrateLegacyChibi();

function readStoredChibi(uid) {
  try {
    const raw = localStorage.getItem(chibiLookKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}
function saveStoredChibi(params, uid) {
  try { localStorage.setItem(chibiLookKey(uid), JSON.stringify(params)); return true; }
  catch (_) { return false; }  // 용량 초과 등 — 호출부에서 사용자 안내
}
function readStoredChibiThumb(uid) {
  try { return localStorage.getItem(chibiThumbKey(uid)) || ''; } catch (_) { return ''; }
}
function saveStoredChibiThumb(dataUrl, uid) {
  try { localStorage.setItem(chibiThumbKey(uid), dataUrl); } catch (_) { /* 무시 */ }
}

// 세션 룩 — 게스트가 "이번 세션에만" 쓰는 캐릭터(저장 안 됨). 캐릭터 저장은 회원가입 필요.
// 로그인 사용자는 저장분을 sessionChibi에도 반영해 세션 내내 일관되게 쓴다.
let sessionChibi = null;
// 지금 세션에서 실제로 쓸 룩 — 세션 룩 우선, 없으면 저장된 룩(로그인/게스트 네임스페이스).
function readActiveChibi() {
  return sessionChibi || readStoredChibi();
}
// 로그인/로그아웃/계정 전환 시 세션 룩을 폐기한다. 그러지 않으면 앞 유저(또는 게스트)의
// 미저장 세션 룩이 다음 유저 네임스페이스로 새어나가 계정 간 캐릭터가 오염된다(검수 반려 사례).
// 이후엔 새 유저의 저장 룩(readStoredChibi) 또는 기본 아야모가 활성 룩이 된다.
onAuthChange(() => { sessionChibi = null; });

// 옷장(로그인 전용) — [{ id, name, look, thumb, ts }]
function readCloset(uid) {
  try {
    const raw = localStorage.getItem(chibiClosetKey(uid));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}
function saveCloset(list, uid) {
  try { localStorage.setItem(chibiClosetKey(uid), JSON.stringify(list)); return true; }
  catch (_) { return false; }  // 용량 초과 등 — 호출부에서 사용자 안내
}

// 프리뷰 WebGL 캔버스를 작은 JPEG 썸네일로 축소한다. 유저별·옷장 다중 저장으로
// 썸네일 개수가 늘어나므로, 큰 PNG 대신 축소 JPEG로 localStorage 용량을 아낀다.
function makeThumbDataUrl(sourceCanvas, w, h) {
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.72);
  } catch (_) { return ''; }
}
let entered = false;         // 로비 통과 여부 (입장 후에만 채팅 활성화)
let currentArtworkId = null; // 작품 패널 재렌더 생략용
let initialized = false;

// 라이트박스 상태
let lightboxOpen = false;
let onLightboxClose = null;
let lightboxCloseTimer = null;

// 작품 목록 패널 상태
let artworkListOpen = false;
let onArtworkSelect = null; // initArtworkList(artworks, onSelect)의 onSelect

// 방명록 패널 상태
let guestbookOpen = false;
let onGuestbookSubmit = null; // initGuestbook({ onSubmit })의 onSubmit
let pendingGuestbookNotes = null; // initUI() 이전에 setGuestbookNotes()가 불렸을 때 대기시켜 둘 값
const MAX_GUESTBOOK_TEXT = 120;

// 투어 바 버튼 콜백 (setTourHandlers로 배선)
let tourHandlers = { onPrev: null, onNext: null, onExit: null, onToggleAuto: null };

// 터치 기기 여부 — 조작 안내/액션 버튼 구성이 달라진다
const IS_TOUCH =
  (typeof window !== 'undefined' && 'ontouchstart' in window) ||
  (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);

// 터치 액션 버튼 콜백 (setActionHandlers로 배선) — 키보드 없는 기기의 M/T/E/G/P 대체
let actionHandlers = { onTour: null, onViewArtwork: null, onGuestbook: null, onCapture: null, onSelfView: null };

// 공유 모달 상태 (SNS 공유 — 포토 모드)
let shareModalOpen = false;
let shareData = { blob: null, dataUrl: '', galleryName: '', shareUrl: '' };
let shareCopyTimer = null;

let makerActiveTab = 'shape';
let makerRebuildTimer = null;    // 파츠 변경 → 프리뷰 재조립 300ms 디바운스
let makerPreviewRAF = null;
let makerPreviewLastT = 0;
let makerDragging = false;
let makerDragLastX = 0;

// 치비 메이커(#lu-chibi-maker) 모달 상태 — 커스터마이저와 동일 패턴, 탭 없음
let chibiOpen = false;
let chibiParams = null;
let chibiPreviewInstance = null;
let chibiPreviewRAF = null;
let chibiPreviewLastT = 0;
let chibiDragging = false;
let chibiDragLastX = 0;
// 프리뷰 자동 회전: 360도 회전 대신 정면 기준 좌우 스윙 (감독 지시)
let chibiSwingT = 0;
let chibiSwingBase = Math.PI;
const CHIBI_SWING_AMPLITUDE = THREE.MathUtils.degToRad(18); // ±18°
const CHIBI_SWING_SPEED = 0.6; // rad/s, 왕복 주기 ≈10.5초

// initUI() 호출 이전에 setGalleryTitle / initGalleryPicker / initArtworkList가
// 먼저 불려도 값을 잃지 않도록 대기시켜 두었다가 DOM 생성 직후 적용한다.
let pendingGalleryTitle = null;
let pendingPicker = null; // { galleries, currentId, onPick }
let pendingArtworkList = null; // artworks 배열


// ---------------------------------------------------------------------------
// 컴포넌트 생성
// ---------------------------------------------------------------------------
function buildLoading() {
  const overlay = el('div', { id: 'lu-loading', className: 'lu' }, [
    el('div', { className: 'lu-spinner' }),
    el('div', { className: 'lu-loading-text', text: 'MUSEUM LOADING...' }),
  ]);
  document.body.appendChild(overlay);
  return overlay;
}

function buildLobby() {
  const title = el('div', { className: 'lu-lobby-title', text: 'OpenArtShow MUSEUM' });
  const sub = el('div', { className: 'lu-lobby-sub', text: 'VIRTUAL EXHIBITION' });
  const rule = el('div', { className: 'lu-lobby-rule' });

  // ---- 소셜 로그인 (현재 mock — auth.js 참고) ----
  const authBox = el('div', { id: 'lu-auth' });

  const socialWrap = el('div', { className: 'lu-social-wrap' });
  const loggedWrap = el('div', { className: 'lu-logged-wrap' });

  const buildSocialButtons = () => {
    socialWrap.textContent = '';
    for (const key of Object.keys(AUTH_PROVIDERS)) {
      const p = AUTH_PROVIDERS[key];
      const btn = el('button', {
        className: `lu-social-btn lu-social-${key}`,
        type: 'button',
      }, [
        el('span', { className: 'lu-social-badge', text: p.short }),
        el('span', { text: p.label }),
      ]);
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.classList.add('lu-social-busy');
        try {
          await authLoginWith(key);
        } catch (_) {
          /* mock에서는 실패 없음 */
        }
        btn.disabled = false;
        btn.classList.remove('lu-social-busy');
      });
      socialWrap.appendChild(btn);
    }
    socialWrap.appendChild(el('div', {
      className: 'lu-social-note',
      text: '계정 연동 준비 중 — 지금은 프로필 미리보기로 동작합니다',
    }));
  };

  const buildLoggedChip = (p) => {
    loggedWrap.textContent = '';
    const avatar = el('span', { className: 'lu-logged-avatar', text: p.initial || p.name.slice(0, 1) });
    const name = el('span', { className: 'lu-logged-name', text: `${p.name}님` });
    const via = el('span', { className: 'lu-logged-via', text: AUTH_PROVIDERS[p.provider] ? AUTH_PROVIDERS[p.provider].short : '' });
    const logoutBtn = el('button', { className: 'lu-logout-btn', type: 'button', text: '로그아웃' });
    logoutBtn.addEventListener('click', () => authLogout());
    loggedWrap.appendChild(el('div', { className: 'lu-logged-chip' }, [avatar, name, via, logoutBtn]));
  };

  const syncAuthUI = (p) => {
    if (p) {
      buildLoggedChip(p);
      socialWrap.style.display = 'none';
      loggedWrap.style.display = '';
      // 프로필 이름을 닉네임에 프리필 (사용자가 수정 가능)
      nickInput.value = p.name.slice(0, MAX_NICKNAME_LEN);
    } else {
      socialWrap.style.display = '';
      loggedWrap.style.display = 'none';
      if (!nickInput.value || Object.values(AUTH_MOCK_PREFILL).includes(nickInput.value)) {
        nickInput.value = '게스트';
      }
    }
    // 로그인/로그아웃 시 그 유저의 저장 아바타 썸네일로 갱신 (유저별 저장 반영)
    syncChibiButtonVisual();
  };

  buildSocialButtons();
  authBox.appendChild(socialWrap);
  authBox.appendChild(loggedWrap);

  const orDivider = el('div', { className: 'lu-auth-or' }, [
    el('span', { text: '소셜 계정 연동 (준비 중)' }),
  ]);

  // 닉네임
  const nickLabel = el('label', { className: 'lu-field-label', for: 'lu-nickname', text: '닉네임' });
  const nickInput = el('input', {
    id: 'lu-nickname',
    type: 'text',
    maxlength: String(MAX_NICKNAME_LEN),
    value: '게스트',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  const nickHint = el('div', { className: 'lu-field-hint', text: `최대 ${MAX_NICKNAME_LEN}자 · 비워두면 '게스트'로 입장합니다` });

  // 캐릭터 — 입장 폼에 편집을 끼워넣지 않고, "캐릭터 디자인" 메뉴 버튼으로 분리한다.
  // 누가 봐도 캐릭터 디자인임이 드러나게 라벨·아이콘을 명확히. 입장은 선택(기본 아야모 가능).
  const charLabel = el('div', { className: 'lu-field-label', text: '캐릭터', style: 'margin-top:26px;' });
  const designBtn = el('button', {
    id: 'lu-char-design',
    className: 'lu-char-design-btn',
    type: 'button',
    'aria-label': '캐릭터 디자인 — 나만의 아야모 만들기',
  });
  function syncChibiButtonVisual() {
    const thumb = readStoredChibiThumb();
    designBtn.textContent = '';
    const media = el('span', { className: 'lu-char-design-media' });
    if (thumb) { media.classList.add('lu-has-thumb'); media.style.backgroundImage = `url('${thumb}')`; }
    else { media.textContent = '🎨'; }
    const txt = el('span', { className: 'lu-char-design-txt' }, [
      el('b', { text: '캐릭터 디자인' }),
      el('span', { text: thumb ? '내 아야모 편집하기' : '나만의 아야모 만들기 (선택)' }),
    ]);
    designBtn.append(media, txt, el('span', { className: 'lu-char-design-arrow', text: '›' }));
  }
  syncChibiButtonVisual();
  designBtn.addEventListener('click', () => openChibiMaker());

  const enterBtn = el('button', { id: 'lu-enter-btn', type: 'button', text: '입장하기' });

  // 전시 선택 섹션 — initGalleryPicker() 호출 전에는 빈 컨테이너
  const pickerBox = el('div', { id: 'lu-picker' });

  // 하단 스튜디오 링크
  const divider = el('div', { className: 'lu-lobby-divider' });
  const studioLink = el('a', {
    className: 'lu-studio-link',
    href: './studio.html',
    target: '_blank',
    rel: 'noopener noreferrer',
    text: '작가 스튜디오에서 나만의 전시 만들기 →',
  });

  // 입장 폼(닉네임·캐릭터·소셜) — 재방문자에겐 접어두고 '바꾸기'로 펼친다 (A: 재방문 스마트 입장)
  const formWrap = el('div', { className: 'lu-lobby-form' }, [
    nickLabel, nickInput, nickHint,
    charLabel, designBtn,
    enterBtn,
    orDivider, authBox,
  ]);

  // 저장된 로그인 프로필 또는 아바타 룩이 있으면 '다시 오셨어요' 원클릭 입장을 상단에 노출
  const quickEnter = el('div', { className: 'lu-quick-enter' });
  function buildQuickEnter() {
    quickEnter.textContent = '';
    const prof = authGetProfile();
    const thumb = readStoredChibiThumb();
    const avatar = el('span', { className: 'lu-quick-avatar' });
    if (thumb) avatar.style.backgroundImage = `url('${thumb}')`; else avatar.textContent = '🙂';
    const greet = el('div', { className: 'lu-quick-greet' }, [
      el('b', { text: (prof ? `${prof.name}님, ` : '') + '다시 오셨어요' }),
      el('span', { text: '저장한 모습으로 바로 입장할 수 있어요' }),
    ]);
    const goBtn = el('button', { className: 'lu-quick-btn', type: 'button', text: '바로 입장' });
    goBtn.addEventListener('click', submit);
    const changeBtn = el('button', { className: 'lu-quick-change', type: 'button', text: '닉네임·캐릭터 바꾸기' });
    changeBtn.addEventListener('click', () => {
      formWrap.classList.remove('lu-collapsed');
      quickEnter.style.display = 'none';
      try { nickInput.focus(); } catch (_) {}
    });
    quickEnter.append(avatar, greet, goBtn, changeBtn);
  }
  const isReturning = !!(authGetProfile() || readStoredChibi());
  if (isReturning) { buildQuickEnter(); formWrap.classList.add('lu-collapsed'); }
  else { quickEnter.style.display = 'none'; }

  const card = el('div', { className: 'lu-lobby-card' }, [
    title, sub, rule,
    quickEnter,
    formWrap,
    pickerBox,
    divider, studioLink,
  ]);
  const overlay = el('div', { id: 'lu-lobby', className: 'lu' }, [card]);
  document.body.appendChild(overlay);

  // 저장된 로그인 세션 복원 + 상태 변화 반영
  syncAuthUI(authGetProfile());
  onAuthChange(syncAuthUI);

  function submit() {
    let nickname = nickInput.value.trim().slice(0, MAX_NICKNAME_LEN);
    if (!nickname) nickname = '게스트';
    // 라벨 색은 닉네임 해시로 자동 배정 — 같은 이름은 늘 같은 색, 선택 UI 제거
    let colorHash = 0;
    for (let i = 0; i < nickname.length; i++) colorHash = (colorHash * 31 + nickname.charCodeAt(i)) >>> 0;
    selectedColor = AVATAR_COLORS[colorHash % AVATAR_COLORS.length];
    // 캐릭터는 치비 단일 — 이번 세션 룩(게스트 세션 편집 포함, 없으면 저장분/기본)로 인코딩
    const char = encodeChibi(Object.assign({}, DEFAULT_CHIBI, readActiveChibi() || {}));
    if (typeof callbacks.onEnter === 'function') {
      callbacks.onEnter({ nickname, color: selectedColor, char });
    }
  }
  enterBtn.addEventListener('click', submit);
  nickInput.addEventListener('keydown', (e) => {
    e.stopPropagation(); // 로비 입력 중 WASD/Enter 전역 처리 차단
    if (e.key === 'Enter') submit();
  });
  nickInput.addEventListener('keyup', (e) => e.stopPropagation());

  // 치비 메이커에서 [저장하고 사용]을 누르면 호출 — 썸네일 갱신
  function onChibiSaved() {
    syncChibiButtonVisual();
  }

  return { overlay, nickInput, pickerBox, onChibiSaved };
}

function buildControls() {
  // 기기별 조작 안내 — 터치 기기에는 키보드 안내 대신 터치 제스처 안내
  const rows = IS_TOUCH
    ? [
        ['왼쪽 드래그', '이동'],
        ['오른쪽 드래그', '시점 회전'],
        ['캐릭터 탭', '콕 찌르기'],
        ['작품 카드', '탭하여 크게 보기'],
      ]
    : [
        ['마우스 드래그', '시점 회전'],
        ['W A S D', '이동'],
        ['Shift', '달리기'],
        ['Enter', '채팅'],
        ['M', '작품 목록'],
        ['T', '투어'],
        ['G', '방명록'],
        ['V', '내 모습 보기'],
        ['C', '캐릭터 디자인'],
        ['P', '사진 촬영'],
        ['클릭', '캐릭터 콕 찌르기'],
      ];
  const panel = el('div', { id: 'lu-controls', className: 'lu lu-hud' });
  panel.appendChild(el('div', { className: 'lu-controls-title', text: 'CONTROLS' }));
  rows.forEach(([key, desc]) => {
    const row = el('div', {}, [
      el('span', { className: 'lu-key', text: key }),
      el('span', { text: desc }),
    ]);
    panel.appendChild(row);
  });
  document.body.appendChild(panel);

  // 터치 기기: 화면을 넓게 쓰도록 접힌 상태로 시작 — '?' 칩으로 토글
  if (IS_TOUCH) {
    panel.classList.add('lu-collapsed');
    const toggle = el('button', {
      id: 'lu-controls-toggle',
      className: 'lu lu-hud',
      type: 'button',
      'aria-label': '조작법 보기',
      text: '?',
    });
    toggle.addEventListener('click', () => {
      panel.classList.toggle('lu-collapsed');
    });
    document.body.appendChild(toggle);
  }

  return panel;
}

function buildMobileDock() {
  // 터치 기기 전용 액션 독 — 키보드 단축키(M/T)의 대체 진입점
  if (!IS_TOUCH) return null;

  // UX 감사 §2 IA: 1차 노출은 [투어][캡처(골드 강조)][더보기]만 — 엄지 호 안 3버튼.
  // 목록/내 모습/채팅/조작법은 더보기 시트로. 채팅은 접속자 ≥2일 때만 독에 동적 승격.
  function toggleChat() {
    const wrap = els && els.chat && els.chat.wrap;
    if (!wrap) return;
    const collapsed = wrap.classList.toggle('lu-chat-collapsed');
    if (!collapsed && els.chat.input) els.chat.input.focus();
    else if (els.chat.input) els.chat.input.blur();
    chatBtn.classList.toggle('lu-on', !collapsed);
  }

  // 스트로크 아이콘 시스템 — 원 안 텍스트는 게임 HUD 문법이 아니다 (디자인 감사 P2)
  const ICONS = {
    chat: '<path d="M20 15a2 2 0 0 1-2 2H9l-5 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',
    tour: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.1 4.9-4.9 2.1 2.1-4.9z"/>',
    capture: '<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',
    more: '<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    list: '<path d="M8.5 6h11.5M8.5 12h11.5M8.5 18h11.5"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',
    self: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0"/>',
    help: '<path d="M9.2 9a2.9 2.9 0 1 1 4.2 2.6c-.9.45-1.4 1.05-1.4 2.1"/><circle cx="12" cy="17.4" r="1" fill="currentColor" stroke="none"/>',
    dress: '<path d="M9 4l3 3 3-3M9 4l-1.5 5 4.5 3 4.5-3L18 4M7.5 9l-2 8h13l-2-8"/>',
  };
  function svgIcon(name) {
    const span = document.createElement('span');
    span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
    return span.firstChild;
  }
  function dockBtn(cls, aria, icon, label) {
    const b = el('button', { className: cls, type: 'button', 'aria-label': aria });
    b.appendChild(svgIcon(icon));
    b.appendChild(el('span', { className: 'lu-dock-label', text: label }));
    // 그림자는 래퍼의 drop-shadow가 담당 (버튼 자체는 배경 블러 레이어)
    const wrap = el('div', { className: 'lu-dock-wrap' }, [b]);
    return { b, wrap };
  }

  const chat = dockBtn('lu-dock-btn', '채팅 열기/닫기', 'chat', '채팅');
  const chatBtn = chat.b;
  chat.wrap.style.display = 'none'; // 접속자 ≥2에서 setPlayerCount가 노출
  chatBtn.addEventListener('click', toggleChat);

  const tour = dockBtn('lu-dock-btn', '투어 시작/종료', 'tour', '투어');
  const tourBtn = tour.b;
  tourBtn.addEventListener('click', () => {
    if (typeof actionHandlers.onTour === 'function') actionHandlers.onTour();
  });

  const capture = dockBtn('lu-dock-btn lu-gold', '사진 촬영', 'capture', '캡처');
  const captureBtn = capture.b;
  captureBtn.addEventListener('click', () => {
    // 촬영 순간 1회 팝 — 눌림이 물리적으로 반응했다는 확인
    captureBtn.classList.remove('lu-cap-pop');
    void captureBtn.offsetWidth;
    captureBtn.classList.add('lu-cap-pop');
    if (typeof actionHandlers.onCapture === 'function') actionHandlers.onCapture();
  });

  const more = dockBtn('lu-dock-btn', '더보기', 'more', '메뉴');
  const moreBtn = more.b;

  // ---- 더보기 시트 ----
  const backdrop = el('div', { id: 'lu-more-backdrop' });
  const sheet = el('div', { id: 'lu-more-sheet' });
  function closeSheet() {
    sheet.classList.remove('lu-open');
    backdrop.classList.remove('lu-open');
  }
  function sheetBtn(icon, label, fn) {
    const b = el('button', { className: 'lu-sheet-btn', type: 'button' });
    b.appendChild(svgIcon(icon));
    b.appendChild(el('span', { text: label }));
    b.addEventListener('click', () => {
      closeSheet();
      fn();
    });
    return b;
  }
  const grid = el('div', { className: 'lu-sheet-grid' }, [
    sheetBtn('list', '작품 목록', () => toggleArtworkList()),
    sheetBtn('self', '내 모습', () => {
      if (typeof actionHandlers.onSelfView === 'function') actionHandlers.onSelfView();
    }),
    sheetBtn('dress', '캐릭터 디자인', () => openChibiMaker()),
    sheetBtn('chat', '채팅', toggleChat),
    sheetBtn('help', '조작법', () => {
      const panel = document.getElementById('lu-controls');
      if (panel) panel.classList.toggle('lu-collapsed');
    }),
  ]);
  sheet.append(el('div', { className: 'lu-sheet-handle' }), grid);
  backdrop.addEventListener('click', closeSheet);
  moreBtn.addEventListener('click', () => {
    const open = sheet.classList.toggle('lu-open');
    backdrop.classList.toggle('lu-open', open);
  });
  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);

  // 방명록은 화면 왼쪽 책갈피 탭(#lu-gbtab)이 담당하므로 독 버튼은 두지 않는다
  const dock = el('div', { id: 'lu-dock', className: 'lu lu-hud' }, [chat.wrap, tour.wrap, capture.wrap, more.wrap]);
  document.body.appendChild(dock);
  dockRefs = { chatBtn, chatWrap: chat.wrap, tourBtn, selfBtn: null, dock };
  return dock;
}

// 독 활성 상태 표시 — main.js가 투어/3인칭 토글 시점에 호출한다
let dockRefs = null;
export function setDockActive(key, on) {
  if (!dockRefs) return;
  if (key === 'tour' && dockRefs.tourBtn) dockRefs.tourBtn.classList.toggle('lu-on', !!on);
  // 'self'는 시트 안 버튼이라 상태 뱃지 대상 아님 — 상태바 문구가 담당
}

function buildTopRight() {
  // FPS는 디버그 지표 — 우상단에 단독으로, 터치 기기에서는 CSS가 숨긴다.
  // 접속자 수는 상단 통합 바(buildGalleryTitle)로 이동 (게임 HUD 감사 §3.4).
  const fps = el('span', { text: '--' });
  const fpsStat = el('div', { className: 'lu-stat' });
  fpsStat.append('FPS ');
  const fpsB = el('b'); fpsB.appendChild(fps); fpsStat.appendChild(fpsB);
  const wrap = el('div', { id: 'lu-topright', className: 'lu lu-hud' }, [fpsStat]);
  document.body.appendChild(wrap);
  // count/countWrap은 상단 바가 생성 후 주입한다 (setPlayerCount 호환)
  return { wrap, fps, count: el('span'), countWrap: null };
}

function buildStatus() {
  const bar = el('div', { id: 'lu-status', className: 'lu lu-hud' });
  document.body.appendChild(bar);
  return bar;
}

function buildChat() {
  const log = el('div', { id: 'lu-chat-log' });
  const input = el('input', {
    id: 'lu-chat-input',
    type: 'text',
    maxlength: '120',
    placeholder: IS_TOUCH ? '탭하여 채팅…' : 'Enter 키로 채팅…',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  const wrap = el('div', { id: 'lu-chat', className: 'lu lu-hud' }, [log, input]);
  if (IS_TOUCH) wrap.classList.add('lu-chat-collapsed');
  document.body.appendChild(wrap);

  // 입력창 포커스 중 키 이벤트가 플레이어 조작(WASD)으로 전파되지 않도록 차단
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      const text = input.value.trim();
      input.value = '';
      input.blur();
      if (text && typeof callbacks.onChatSend === 'function') {
        callbacks.onChatSend(text);
      }
    } else if (e.key === 'Escape') {
      input.value = '';
      input.blur();
    }
  });
  input.addEventListener('keyup', (e) => e.stopPropagation());
  input.addEventListener('keypress', (e) => e.stopPropagation());

  return { wrap, log, input };
}

function buildArtworkPanel() {
  const eyebrow = el('div', { className: 'lu-art-eyebrow', text: 'ARTWORK' });
  const title = el('div', { className: 'lu-art-title' });
  const meta = el('div', { className: 'lu-art-meta' });
  const rule = el('div', { className: 'lu-art-rule' });
  const desc = el('div', { className: 'lu-art-desc' });
  // 힌트를 실제 버튼으로 — 데스크톱은 E키 안내 겸용, 터치는 유일한 진입점
  const hint = el('button', { className: 'lu-art-hint', type: 'button' });
  if (IS_TOUCH) {
    hint.appendChild(document.createTextNode('크게 보기'));
  } else {
    hint.appendChild(el('span', { className: 'lu-key', text: 'E' }));
    hint.appendChild(document.createTextNode(' — 크게 보기'));
  }
  hint.addEventListener('click', (e) => {
    e.stopPropagation(); // 터치의 카드 전체 탭 핸들러와 이중 발화 방지
    if (typeof actionHandlers.onViewArtwork === 'function') actionHandlers.onViewArtwork();
  });
  const panel = el('div', { id: 'lu-artwork', className: 'lu' }, [eyebrow, title, meta, rule, desc, hint]);
  if (IS_TOUCH) {
    // 하단 좌측 미니 캡션에서는 카드 전체가 '크게 보기' 탭 타깃
    panel.addEventListener('click', () => {
      if (typeof actionHandlers.onViewArtwork === 'function') actionHandlers.onViewArtwork();
    });
  }
  document.body.appendChild(panel);
  return { panel, title, meta, desc };
}

function buildGalleryTitle() {
  // 상단 통합 바 — 전시명 + 라이브 접속자 하나의 유리 칩으로
  const title = el('span', { className: 'lu-topbar-title' });
  const count = el('b', { text: '1' });
  const countWrap = el('span', { className: 'lu-topbar-count' });
  countWrap.appendChild(count);
  countWrap.append(' 명');
  const bar = el('div', { id: 'lu-topbar', className: 'lu lu-hud lu-cut-s lu-empty' }, [
    title,
    el('span', { className: 'lu-topbar-sep' }),
    countWrap,
  ]);
  document.body.appendChild(bar);
  bar._count = count;
  bar._countWrap = countWrap;
  return bar;
}

function buildLightbox() {
  const closeBtn = el('button', {
    id: 'lu-lightbox-close', type: 'button', 'aria-label': '닫기', text: '×',
  });

  const stage = el('div', { className: 'lu-lightbox-stage' });

  const titleEl = el('div', { className: 'lu-lightbox-title' });
  const metaEl = el('div', { className: 'lu-lightbox-meta' });
  const ruleEl = el('div', { className: 'lu-lightbox-rule' });
  const descEl = el('div', { className: 'lu-lightbox-desc' });
  const caption = el('div', { className: 'lu-lightbox-caption' }, [titleEl, metaEl, ruleEl, descEl]);

  const overlay = el('div', { id: 'lu-lightbox', className: 'lu' }, [closeBtn, stage, caption]);
  document.body.appendChild(overlay);

  closeBtn.addEventListener('click', () => hideLightbox());
  // 배경(스테이지의 여백) 클릭 시 닫힘 — 이미지/영상 자체 클릭은 통과
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === stage) hideLightbox();
  });

  // ---- 감상 제스처 (UX 감사 §4): 핀치 줌 · 팬 · 더블탭 줌 · 스와이프 넘김/닫기 ----
  const pointers = new Map();
  let zScale = 1;
  let zTx = 0;
  let zTy = 0;
  let pinch0 = 0;
  let scale0 = 1;
  let lastTapT = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  let swipe0 = null;

  function mediaEl() {
    return stage.querySelector('.lu-lightbox-media');
  }
  function applyZoom() {
    const media = mediaEl();
    if (media) media.style.transform = `translate(${zTx}px, ${zTy}px) scale(${zScale})`;
  }
  function resetZoom() {
    zScale = 1;
    zTx = 0;
    zTy = 0;
    applyZoom();
  }

  overlay.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) swipe0 = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
      scale0 = zScale;
    }
  });
  overlay.addEventListener('pointermove', (e) => {
    const pt = pointers.get(e.pointerId);
    if (!pt) return;
    const dx = e.clientX - pt.x;
    const dy = e.clientY - pt.y;
    pt.x = e.clientX;
    pt.y = e.clientY;
    if (pointers.size === 2 && pinch0 > 0) {
      const [a, b] = [...pointers.values()];
      zScale = Math.min(4, Math.max(1, scale0 * (Math.hypot(a.x - b.x, a.y - b.y) / pinch0)));
      if (zScale === 1) { zTx = 0; zTy = 0; }
      applyZoom();
    } else if (pointers.size === 1 && zScale > 1) {
      zTx += dx;
      zTy += dy;
      applyZoom();
    }
  });
  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size !== 0 || !swipe0) return;
    const dt = performance.now() - swipe0.t;
    const dx = e.clientX - swipe0.x;
    const dy = e.clientY - swipe0.y;
    swipe0 = null;
    if (zScale === 1 && dt < 600) {
      if (Math.abs(dx) > 64 && Math.abs(dy) < 56) {
        navLightbox(dx < 0 ? 1 : -1); // 왼쪽으로 쓸면 다음 작품
        return;
      }
      if (dy > 84 && Math.abs(dx) < 60) {
        hideLightbox(); // 아래로 쓸어 닫기 — 모바일 시트 관용구
        return;
      }
    }
    // 더블탭 줌 토글 (이동 거의 없는 짧은 탭 2연속)
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 350) {
      const now = performance.now();
      if (now - lastTapT < 320 && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 44) {
        if (zScale > 1) {
          resetZoom();
        } else {
          zScale = 2.4;
          applyZoom();
        }
        lastTapT = 0;
        return;
      }
      lastTapT = now;
      lastTapX = e.clientX;
      lastTapY = e.clientY;
    }
  }
  overlay.addEventListener('pointerup', endPointer);
  overlay.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));

  return { overlay, closeBtn, stage, title: titleEl, meta: metaEl, rule: ruleEl, desc: descEl, resetZoom };
}

// 라이트박스 이전/다음 작품 — 배치 순서 기준 순환
let lightboxCurrentArt = null;
function navLightbox(dir) {
  const list = getPlacedArtworks();
  if (!lightboxCurrentArt || list.length < 2) return;
  const idx = list.indexOf(lightboxCurrentArt);
  const next = list[((idx === -1 ? 0 : idx) + dir + list.length) % list.length];
  showLightbox(next);
}

// 썸네일 로드 실패(또는 비디오 전용 작품 등 imageUrl 부재) 시 사용할 중립 회색 placeholder
const ARTLIST_THUMB_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#eaeae6"/></svg>'
  );

function renderArtworkList(artworks) {
  const body = els.artworkList.body;
  body.innerHTML = '';
  if (!Array.isArray(artworks) || artworks.length === 0) {
    body.appendChild(el('div', { className: 'lu-artlist-empty', text: '표시할 작품이 없습니다' }));
    return;
  }
  artworks.forEach((art) => {
    const thumb = el('img', {
      className: 'lu-artlist-thumb',
      src: art.imageUrl || ARTLIST_THUMB_FALLBACK,
      alt: art.title || '',
      loading: 'lazy',
    });
    thumb.addEventListener('error', () => { thumb.src = ARTLIST_THUMB_FALLBACK; }, { once: true });

    const info = el('div', { className: 'lu-artlist-info' }, [
      el('div', { className: 'lu-artlist-name', text: art.title || '' }),
      el('div', { className: 'lu-artlist-artist', text: art.artist || '' }),
    ]);
    const card = el('button', { type: 'button', className: 'lu-artlist-card' }, [thumb, info]);
    card.addEventListener('click', () => {
      hideArtworkList();
      if (typeof onArtworkSelect === 'function') onArtworkSelect(art);
    });
    body.appendChild(card);
  });
}

function buildArtworkList() {
  const closeBtn = el('button', { id: 'lu-artlist-close', type: 'button', 'aria-label': '닫기', text: '×' });
  const head = el('div', { id: 'lu-artlist-head' }, [
    el('div', { id: 'lu-artlist-title', text: '작품 목록' }),
    closeBtn,
  ]);
  const body = el('div', { id: 'lu-artlist-body' });
  const panel = el('div', { id: 'lu-artlist', className: 'lu' }, [head, body]);
  document.body.appendChild(panel);

  closeBtn.addEventListener('click', () => hideArtworkList());

  return { panel, body };
}

// ---------------------------------------------------------------------------
// 방명록 패널 — G 키(또는 HUD 버튼)로 열어 전시에 한 줄 메모를 남긴다
// ---------------------------------------------------------------------------

// '3분 전' / '2시간 전' / '어제' / 'YYYY.MM.DD' — 노트 작성 시각을 사람이 읽기 쉬운 형태로.
function formatRelativeTime(ts) {
  const now = Date.now();
  const diffMs = Math.max(0, now - ts);
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;

  const d = new Date(ts);
  const n = new Date(now);
  const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(n) - startOfDay(d)) / 86400000);
  if (dayDiff <= 1) return '어제';

  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

function renderGuestbookNotes(notes) {
  const body = els.guestbook.body;
  body.innerHTML = '';
  if (!Array.isArray(notes) || notes.length === 0) {
    body.appendChild(el('div', { className: 'lu-gbook-empty', text: '첫 방명록을 남겨보세요' }));
    return;
  }
  const DOT_COLORS = ['#e07a5f', '#81b29a', '#5f9e7d', '#8e7dbe', '#6a8caf', '#d68fb8'];
  notes.forEach((note) => {
    const name = note.name || '게스트';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    const dot = el('span', { className: 'lu-gbook-dot' });
    dot.style.background = DOT_COLORS[hash % DOT_COLORS.length];
    const head = el('div', {}, [
      dot,
      el('span', { className: 'lu-gbook-name', text: name }),
      el('span', { className: 'lu-gbook-time', text: formatRelativeTime(note.ts) }),
    ]);
    const text = el('div', { className: 'lu-gbook-text', text: note.text || '' });
    body.appendChild(el('div', { className: 'lu-gbook-note' }, [head, text]));
  });
}

function buildGuestbookPanel() {
  const closeBtn = el('button', { id: 'lu-guestbook-close', type: 'button', 'aria-label': '닫기', text: '×' });
  const head = el('div', { id: 'lu-guestbook-head' }, [
    el('div', { id: 'lu-guestbook-title' }, [
      el('span', { className: 'lu-gb-eyebrow', text: 'GUESTBOOK' }),
      el('span', { className: 'lu-gb-main', text: '방명록' }),
      el('span', { className: 'lu-gb-sub', text: '다녀간 마음을 한 줄 남겨 주세요' }),
    ]),
    closeBtn,
  ]);
  const body = el('div', { id: 'lu-guestbook-body' });

  const input = el('textarea', {
    id: 'lu-gbook-input',
    rows: '3',
    maxlength: String(MAX_GUESTBOOK_TEXT),
    placeholder: '전시에 한 줄 메모를 남겨보세요…',
    spellcheck: 'false',
  });
  const count = el('span', { className: 'lu-gbook-count', text: `0/${MAX_GUESTBOOK_TEXT}` });
  const submitBtn = el('button', { id: 'lu-gbook-submit', type: 'button', text: '남기기' });
  submitBtn.disabled = true;
  const footerRow = el('div', { className: 'lu-gbook-footer-row' }, [count, submitBtn]);
  const statsLine = el('div', {
    id: 'lu-gbook-stats',
    style: 'font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.45);padding:6px 2px 0;',
  });
  const footer = el('div', { id: 'lu-guestbook-footer' }, [input, footerRow, statsLine]);

  // 책갈피 탭 — 패널이 닫혀 있어도 화면 왼쪽 가장자리에 살짝 나와 있고,
  // 패널의 자식이므로 열릴 때 패널과 함께 미끄러진다
  const tab = el('button', {
    id: 'lu-gbtab',
    type: 'button',
    'aria-label': '방명록 열기/닫기 (위아래로 드래그해 위치 이동)',
    title: '드래그해서 위치를 옮길 수 있어요',
    text: '방명록',
  });

  // ---- 탭 수직 드래그 이동 (위치는 localStorage에 기억) ----
  // 모바일에서 왼쪽 가장자리는 이동 조이스틱 영역과 겹칠 수 있어, 사용자가
  // 탭을 원하는 높이로 치울 수 있게 한다. 6px 미만 이동은 탭(열기)으로 처리.
  const GBTAB_TOP_KEY = 'lu-gbtab-top-v1';
  try {
    const saved = parseFloat(localStorage.getItem(GBTAB_TOP_KEY));
    if (Number.isFinite(saved)) tab.style.top = clampTabTop(saved) + 'px';
  } catch (_) { /* 무시 */ }

  function clampTabTop(px) {
    const max = Math.max(80, (window.innerHeight || 800) - 140);
    return Math.min(max, Math.max(60, px));
  }

  let tabDrag = null; // { startY, startTop, moved }
  tab.addEventListener('pointerdown', (e) => {
    const rect = tab.getBoundingClientRect();
    tabDrag = { startY: e.clientY, startTop: rect.top, moved: false };
    tab.setPointerCapture(e.pointerId);
  });
  tab.addEventListener('pointermove', (e) => {
    if (!tabDrag) return;
    const dy = e.clientY - tabDrag.startY;
    if (Math.abs(dy) > 6) tabDrag.moved = true;
    if (tabDrag.moved) tab.style.top = clampTabTop(tabDrag.startTop + dy) + 'px';
  });
  const endTabDrag = () => {
    if (tabDrag && tabDrag.moved) {
      try { localStorage.setItem(GBTAB_TOP_KEY, String(parseFloat(tab.style.top))); } catch (_) { /* 무시 */ }
    }
    // click 이벤트가 pointerup 뒤에 오므로, 드래그였다면 클릭 무시 플래그 유지
    setTimeout(() => { tabDrag = null; }, 0);
  };
  tab.addEventListener('pointerup', endTabDrag);
  tab.addEventListener('pointercancel', endTabDrag);
  tab.addEventListener('click', () => {
    if (tabDrag && tabDrag.moved) return; // 드래그로 끝난 제스처 — 열지 않음
    toggleGuestbook();
  });

  const panel = el('div', { id: 'lu-guestbook', className: 'lu' }, [head, body, footer, tab]);
  document.body.appendChild(panel);

  closeBtn.addEventListener('click', () => hideGuestbook());

  function updateCount() {
    const len = input.value.length;
    count.textContent = `${len}/${MAX_GUESTBOOK_TEXT}`;
    submitBtn.disabled = input.value.trim().length === 0;
  }

  function submit() {
    const text = input.value.trim().slice(0, MAX_GUESTBOOK_TEXT);
    if (!text) return;
    input.value = '';
    updateCount();
    input.blur();
    if (typeof onGuestbookSubmit === 'function') onGuestbookSubmit(text);
  }

  // 입력창 포커스 중 키 이벤트가 플레이어 조작(WASD/G 등)으로 전파되지 않도록 차단
  // (채팅 입력창과 동일 패턴)
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      input.value = '';
      updateCount();
      input.blur();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  });
  input.addEventListener('keyup', (e) => e.stopPropagation());
  input.addEventListener('keypress', (e) => e.stopPropagation());
  input.addEventListener('input', updateCount);

  submitBtn.addEventListener('click', submit);

  return { panel, body, input, count, submitBtn, tab };
}

function buildTourBar() {
  const prevBtn = el('button', { type: 'button', 'aria-label': '이전 작품', text: '◀ 이전' });
  const sep1 = el('span', { className: 'lu-tour-sep' });
  const countEl = el('span', { className: 'lu-tour-count' });
  const titleEl = el('span', { className: 'lu-tour-title' });
  const sep2 = el('span', { className: 'lu-tour-sep' });
  const nextBtn = el('button', { type: 'button', 'aria-label': '다음 작품', text: '다음 ▶' });
  const sep3 = el('span', { className: 'lu-tour-sep' });
  const autoBtn = el('button', { type: 'button', className: 'lu-tour-auto' });
  const sep4 = el('span', { className: 'lu-tour-sep' });
  const exitBtn = el('button', { id: 'lu-tourbar-exit', type: 'button', 'aria-label': '투어 종료', text: '✕ 종료' });

  const bar = el('div', { id: 'lu-tourbar', className: 'lu' }, [
    prevBtn, sep1, countEl, titleEl, sep2, nextBtn, sep3, autoBtn, sep4, exitBtn,
  ]);
  document.body.appendChild(bar);

  prevBtn.addEventListener('click', () => { if (tourHandlers.onPrev) tourHandlers.onPrev(); });
  nextBtn.addEventListener('click', () => { if (tourHandlers.onNext) tourHandlers.onNext(); });
  exitBtn.addEventListener('click', () => { if (tourHandlers.onExit) tourHandlers.onExit(); });
  autoBtn.addEventListener('click', () => { if (tourHandlers.onToggleAuto) tourHandlers.onToggleAuto(); });

  return { bar, prevBtn, nextBtn, autoBtn, exitBtn, countEl, titleEl };
}

// ---------------------------------------------------------------------------
// 셔터 플래시 — 포토 모드(P키) 캡처 순간 흰 화면 페이드
// ---------------------------------------------------------------------------
function buildShutter() {
  const overlay = el('div', { id: 'lu-shutter', className: 'lu' });
  document.body.appendChild(overlay);
  return overlay;
}

// ---------------------------------------------------------------------------
// 공유 모달 — 포토 모드로 캡처한 화면을 SNS(X/Threads)·기기 공유·저장·링크 복사
// ---------------------------------------------------------------------------
function buildShareModal() {
  const closeBtn = el('button', { id: 'lu-share-close', type: 'button', 'aria-label': '닫기', text: '×' });
  const title = el('div', { className: 'lu-share-title', text: '전시 공유하기' });
  const preview = el('img', { className: 'lu-share-preview', alt: '캡처한 전시 화면' });

  const deviceBtn = el('button', { className: 'lu-share-btn lu-share-btn-primary', type: 'button', text: '기기로 공유' });
  const saveBtn = el('button', { className: 'lu-share-btn', type: 'button', text: '이미지 저장' });
  const xBtn = el('button', { className: 'lu-share-btn', type: 'button', text: 'X에 공유' });
  const threadsBtn = el('button', { className: 'lu-share-btn', type: 'button', text: 'Threads에 공유' });
  const copyBtn = el('button', { className: 'lu-share-btn', type: 'button', text: '링크 복사' });

  const actions = el('div', { className: 'lu-share-actions' }, [deviceBtn, saveBtn, xBtn, threadsBtn, copyBtn]);
  const hint = el('div', {
    className: 'lu-share-hint',
    text: '인스타그램은 이미지를 저장하거나 기기로 공유한 뒤 앱에서 올려주세요',
  });

  const card = el('div', { className: 'lu-share-card' }, [closeBtn, title, preview, actions, hint]);
  const overlay = el('div', { id: 'lu-share', className: 'lu' }, [card]);
  document.body.appendChild(overlay);

  closeBtn.addEventListener('click', () => hideShareModal());
  // 카드 바깥(배경) 클릭 시 닫힘 — 카드 자체 클릭은 통과
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hideShareModal(); });

  deviceBtn.addEventListener('click', async () => {
    if (!shareData.blob || typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
    try {
      const file = new File([shareData.blob], 'artshow.png', { type: 'image/png' });
      await navigator.share({
        files: [file],
        title: shareData.galleryName || 'OpenArtShow',
        text: `${shareData.galleryName || 'OpenArtShow'} — OpenArtShow 3D 전시`,
      });
    } catch (_) {
      /* 사용자가 공유 시트를 취소한 경우 등 — 조용히 무시 */
    }
  });

  saveBtn.addEventListener('click', () => {
    if (!shareData.dataUrl) return;
    const a = document.createElement('a');
    a.href = shareData.dataUrl;
    a.download = 'artshow.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  xBtn.addEventListener('click', () => {
    const text = `${shareData.galleryName || 'OpenArtShow'} — OpenArtShow 3D 전시`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareData.shareUrl || '')}`;
    window.open(url, '_blank', 'noopener');
  });

  threadsBtn.addEventListener('click', () => {
    const text = `${shareData.galleryName || 'OpenArtShow'} — OpenArtShow 3D 전시 ${shareData.shareUrl || ''}`;
    const url = `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareData.shareUrl || '');
      if (shareCopyTimer) clearTimeout(shareCopyTimer);
      copyBtn.textContent = '복사됨';
      copyBtn.classList.add('lu-share-btn-copied');
      shareCopyTimer = setTimeout(() => {
        copyBtn.textContent = '링크 복사';
        copyBtn.classList.remove('lu-share-btn-copied');
        shareCopyTimer = null;
      }, 1600);
    } catch (_) {
      /* 클립보드 접근 실패(권한 등) — 조용히 무시 */
    }
  });

  return { overlay, card, title, preview, deviceBtn, saveBtn, xBtn, threadsBtn, copyBtn };
}


// ---------------------------------------------------------------------------
// 치비 메이커 모달 — chibi.js(자체 코드 생성기)의 파라미터를 칩/스와치로 편집.
// DCL 커스터마이저와 동일한 모달 CSS(lu-am-*)를 재사용하되 탭 없이 한 화면이다.
// 프리뷰는 createAvatarInstance('chibi:'+JSON)를 그대로 재사용한다.
// 스와치 팔레트(SKIN_TONES/HAIR_COLORS/EYE_COLORS/CHIBI_CLOTH_COLORS)는 chibi.js(SSOT)에서 import.

// (사진→아야모 휴리스틱 분석기는 감독 판단으로 철회 — "색만 맞춰서는 큰 의미가
// 없다". 비전 AI 버전은 백엔드 확보 후 재도전. 구현은 git 이력 b2ff2f3b 참조.)

// 카테고리 내비 아이콘 — 인라인 SVG(외부 에셋 0), currentColor로 탭 색상 상속
// 잎사귀 모티프 — 오리지널 실루엣(눈물방울 잎 + 잎맥 한 줄). 특정 브랜드 아이콘 카피 아님.
const ICON_LEAF = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.5 19.5C4.5 10 11 4 20 4c0 9-6 15.5-15.5 15.5A1 1 0 0 1 4.5 19.5Z"/><path d="M6.7 17.3C10.2 13.3 14.2 9.3 18 5.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>';
const CHIBI_NAV_CATS = [
  { id: 'species', label: '종족', icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="7" cy="8.3" r="2.1"/><circle cx="12" cy="6.1" r="2.1"/><circle cx="17" cy="8.3" r="2.1"/><path d="M12 11.6c-3.4 0-6.1 2.4-6.1 5.2 0 2 1.8 3.3 3.7 2.6.9-.3 1.7-.3 2.6 0 1.9.7 3.7-.6 3.7-2.6 0-2.8-2.5-5.2-5.9-5.2Z"/></svg>' },
  { id: 'face', label: '얼굴', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10.6" r="0.9" fill="currentColor" stroke="none"/><path d="M8.6 14.6c1 1.1 2.1 1.7 3.4 1.7s2.4-.6 3.4-1.7"/></svg>' },
  { id: 'hair', label: '헤어', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M5 12.5C5 8 8.1 4.5 12 4.5s7 3.5 7 8"/><path d="M6.3 12.5v3.2M10.1 12.5v4.2M13.9 12.5v4.2M17.7 12.5v3.2"/></svg>' },
  { id: 'outfit', label: '의상', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M8.3 4.2 4.3 7.3l2 3 2-1.1v9.6h7.4V9.2l2 1.1 2-3-4-3.1c-.7 1-1.8 1.6-3.7 1.6s-3-.6-3.7-1.6Z"/></svg>' },
  { id: 'acc', label: '장식', icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c.5 3.5 1.7 6.3 5.2 7.6-3.5 1.3-4.7 4.1-5.2 7.6-.5-3.5-1.7-6.3-5.2-7.6C10.3 9.3 11.5 6.5 12 3Z"/><circle cx="19" cy="5.2" r="1.2"/></svg>' },
  { id: 'closet', label: '옷장', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="1.3"/><path d="M12 5.9v1.8"/><path d="M12 7.7 4.3 13.4h15.4L12 7.7Z"/><path d="M4.3 17.4h15.4"/></svg>' },
];

function buildChibiMaker() {
  // 상단 액션 — 저장(✓)·닫기(×)를 헤더 한 곳에 통합(감독 지시). 하단 저장 칸을 없애
  // 위아래 분리를 통합, 스크롤 없이 바로 저장·닫기 할 수 있다.
  const saveV = el('button', { id: 'lu-am-save', type: 'button', 'aria-label': '이 캐릭터 사용', title: '이 캐릭터 사용', text: '✓' });
  const closeX = el('button', { id: 'lu-am-close', type: 'button', 'aria-label': '닫기', text: '×' });
  const titleIcon = el('span', { className: 'lu-am-title-icon', 'aria-hidden': 'true' });
  titleIcon.innerHTML = ICON_LEAF;
  const title = el('div', { className: 'lu-am-title' }, [titleIcon, el('span', { text: '캐릭터 디자인' })]);
  const headActions = el('div', { className: 'lu-am-head-actions' }, [saveV, closeX]);
  const head = el('div', { className: 'lu-am-head' }, [title, headActions]);

  // 프리뷰 "무대" — 300×400 백킹 해상도(ensurePreviewRenderer의 setSize와 정합)는 그대로 두고,
  // 바깥 lu-am-preview 프레임을 장식용 여백으로 감싸 게임 캐릭터 크리에이터급 무대감을 낸다.
  const canvas = el('canvas', { width: '300', height: '400' });
  const stage = el('div', { className: 'lu-am-stage' }, [canvas]);
  // 아바타를 만드는 화면이라 동작 테스트 버튼은 두지 않는다(감독 지시). 대신 캐릭터가
  // 프리뷰 안에서 혼자 신나게 움직인다(자동 연기 — previewFrame 루프에서 랜덤 재생).
  const stageWrap = el('div', { className: 'lu-am-stagewrap' }, [stage]);
  const previewBox = el('div', { className: 'lu-am-preview' }, [stageWrap]);

  // 자동 연기 — 캐릭터가 스스로 밝은 동작을 번갈아 재생한다("혼자 신나게 움직임", 감독
  // 지시). 삐짐·앉기 같은 가라앉는 동작은 빼고 활기찬 것만 고른다. chibiAutoActClock이
  // 0 이하가 되면 랜덤 동작을 재생하고, 동작 길이 + 짧은 휴식만큼 시계를 다시 채운다.
  const CHIBI_AUTO_ACTIONS = ['wave', 'jump', 'clap', 'dance', 'breakdance', 'run', 'jumpingjack', 'heart', 'kick'];
  let chibiAutoActClock = 1.0;


  let previewRenderer = null;
  let previewScene = null;
  let previewCamera = null;
  let previewRotator = null;

  // 프리뷰 배경용 세로 그라데이션 텍스처 — 절차 생성(외부 에셋 0, CSP 'self' 준수). 폭 2px로
  // 메모리 최소. NoToneMapping+SRGB 파이프라인이라 colorSpace를 SRGB로 지정해야 딥톤이 밝게 안 뜬다.
  function makePreviewBackdrop(topHex, bottomHex) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 2; c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, topHex); g.addColorStop(1, bottomHex);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  // 벽 텍스처 — 톤온톤 세로 줄무늬 벽지(감독 선택 V1 등폭 밴드). 절차 CanvasTexture(외부 에셋 0).
  // non-repeat 큰 캔버스 한 장(벽 전체).
  function makeWallTex(base, stripe) {
    if (typeof document === 'undefined') return null;
    const w = 512, h = 307, c = document.createElement('canvas'); // 512:307≈벽 plane 10:6 비율(왜곡 방지)
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    const count = 28, period = w / count;   // 세로 밴드 28개(등폭 V1 톤 유지)
    x.fillStyle = stripe;
    for (let i = 0; i < count; i++) x.fillRect(i * period, 0, period / 2, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;                              // repeat 없음(벽 전체 1장)
  }

  function ensurePreviewRenderer() {
    if (previewRenderer) return;
    previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
    previewRenderer.setSize(300, 400, false);
    // 실시간 접지 그림자 — 캐릭터가 자동 연기로 점프·춤을 추면 정적 CSS 그림자는 발과
    // 어긋나 떠 보였다(감독 신고). 저해상도(512) 그림자맵 한 장으로 동작을 따라가는
    // 접지 그림자를 바닥에 실시간으로 뿌린다. 프리뷰는 캐릭터 하나뿐이라 비용이 작다.
    previewRenderer.shadowMap.enabled = true;
    // VSM(분산 그림자맵) — 경계가 딱딱하지 않게 반그림자(penumbra)를 부드럽게 번지게
    // 한다(감독 지시). radius/blurSamples로 흐림 정도를 준다. 접지 그림자에 적합.
    previewRenderer.shadowMap.type = THREE.VSMShadowMap;
    // 정직한 색 프리뷰 — 스와치에서 고른 피부/옷색이 실제로 그 색으로 보이게.
    // (기존 ACES+강한 웜은 어두운 톤을 주황으로 클리핑시켜 팔레트와 어긋났음)
    previewRenderer.toneMapping = THREE.NoToneMapping;
    previewRenderer.toneMappingExposure = 1.0;
    previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    previewScene = new THREE.Scene();
    // 방 배경 — 벽지 벽 뒤/위쪽 여백을 채우는 웜 라이트 그라데(위 밝게→아래 벽 톤). 벽지 방으로
    // 액자 안을 "다른 공간"으로 만든다(감독 지시). 텍스처는 절차 생성(외부 에셋 0, CSP 'self').
    previewScene.background = makePreviewBackdrop('#f0ead9', '#ddd2bd') || new THREE.Color('#ddd2bd');
    // 포그(벽 베이스 근사색)로 바닥·벽 원경을 배경색으로 녹여 이음매를 없앤다. near 5.5는 캐릭터
    // (카메라 거리 ≈4.1) 뒤에서 시작해 본체는 안 잠긴다. 배경 텍스처는 포그 무관.
    previewScene.fog = new THREE.Fog(0xded3bf, 5.5, 10);
    // 프레이밍 — 발이 프레임 바닥(화면 세로 89%)을 딛고, 하트머리 정점(≈1.59m)도
    // 담기게 잡는다. lookAt.y를 0.85로 올려 캐릭터를 화면 아래로 내려 "바닥에 선"
    // 구도를 만든다(구 lookAt 0.64는 발이 세로 80%에 떠 발밑 여백이 넓어 공중부양처럼
    // 보였다 — 감독 신고). FK 투영 실측으로 발 89%/하트머리 상단 15.5%/정장머리 27%
    // 를 만족하는 (dist 4.0, camY 1.0, lookAtY 0.85) 조합 확정.
    previewCamera = new THREE.PerspectiveCamera(30, 300 / 400, 0.1, 20);
    previewCamera.position.set(0, 1.0, 4.0);
    previewCamera.lookAt(0, 0.85, 0);
    // 채도 살린 스튜디오 조명 — 회색 앰비언트를 어둡게 낮춰 색이 바래지 않게 하고,
    // 흰 키라이트로 앞면을 채워 고른 색이 선명하게 그대로 나온다(감독 'B' 확정).
    previewScene.add(new THREE.HemisphereLight(0xfffaf4, 0x241f18, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(0.7, 2.0, 2.6);
    previewScene.add(key);
    const fill = new THREE.DirectionalLight(0xfffdf8, 0.4);
    fill.position.set(-1.8, 1.1, 1.6);
    previewScene.add(fill);
    // 그림자 전용 라이트 — 거의 수직 위에서 내려 발밑에 접지 그림자를 만든다. 빛 기여는
    // 0(캐릭터 색·음영은 위 조명이 담당, 감독 'B' 확정 유지)이고 그림자맵만 생성한다.
    const shadowLight = new THREE.DirectionalLight(0xffffff, 0.0);
    shadowLight.position.set(0.4, 5, 1.0);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(512, 512); // 저해상도 + 큰 blur라야 penumbra가 넓게 번진다
    shadowLight.shadow.camera.near = 0.5;
    shadowLight.shadow.camera.far = 9;
    shadowLight.shadow.camera.left = -1.3;
    shadowLight.shadow.camera.right = 1.3;
    shadowLight.shadow.camera.top = 1.3;
    shadowLight.shadow.camera.bottom = -1.3;
    shadowLight.shadow.radius = 35;        // 반그림자 흐림 크게 — 경계를 더 부드럽게(감독 재요청)
    shadowLight.shadow.blurSamples = 24;   // VSM 흐림 표본 수(큰 반경에 맞춰 늘림)
    shadowLight.shadow.bias = -0.0005;     // VSM은 acne가 적어 작은 바이어스로 충분
    previewScene.add(shadowLight);
    previewScene.add(shadowLight.target); // target 기본 (0,0,0) — 캐릭터 발밑을 향함
    // 우드 바닥(발 최하단 y≈0) — 벽지 웜샌드와 동계. 무광이라 하이라이트 없이 매트한 방 바닥.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshStandardMaterial({ color: 0xb9a06f, roughness: 0.9, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    previewScene.add(ground);
    // 그림자 캐처 — 불투명 바닥은 그림자 라이트 intensity 0이라 그림자가 안 진다(그림자계수×0=0).
    // ShadowMaterial은 라이트 세기를 무시하고 커버리지×opacity로만 칠하므로 intensity 0으로도
    // 접지 그림자가 우드 바닥 위에 다시 뜬다(조명 'B' 무변경 원칙 유지). y 오프셋+polygonOffset으로 z-fighting 회피.
    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.ShadowMaterial({ opacity: 0.3 }),
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = 0.002;
    shadowCatcher.material.polygonOffset = true;
    shadowCatcher.material.polygonOffsetFactor = -1;
    shadowCatcher.receiveShadow = true;
    previewScene.add(shadowCatcher);
    // 뒤 벽 — 톤온톤 세로 줄무늬 벽지(감독 선택 V1). PlaneGeometry 법선이 +Z(카메라 방향)라 회전 불필요.
    const wallpaperTex = makeWallTex('#e2d7bf', '#efe7d3');
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 6),
      new THREE.MeshStandardMaterial({ map: wallpaperTex, roughness: 0.9, metalness: 0 }),
    );
    wall.position.set(0, 2.2, -2.3);
    previewScene.add(wall);
    previewRotator = new THREE.Group();
    // 치비는 +Z 저작 + π 래퍼로 -Z를 본다 — 카메라(+Z)에서 정면이 보이게 π 시작
    previewRotator.rotation.y = Math.PI;
    previewScene.add(previewRotator);
  }

  // 카테고리 내비 — 종족·얼굴·헤어·의상·장식·옷장 섹션 전환(스크롤 지옥 대신 탭 전환)
  let activeCat = 'species';
  const nav = el('div', { className: 'lu-am-nav', role: 'tablist', 'aria-label': '캐릭터 디자인 카테고리' });
  const panel = el('div', { className: 'lu-am-panel' });
  const page = el('div', { className: 'lu-am-tabpage', id: 'lu-am-tabpanel', role: 'tabpanel', tabindex: '0' });
  panel.appendChild(nav);
  panel.appendChild(page);
  // WAI-ARIA tablist 로빙 — ←/→(및 Home/End)로 탭 포커스·활성 이동.
  nav.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = [...nav.querySelectorAll('.lu-am-navtab')];
    if (!tabs.length) return;
    const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    let next = cur < 0 ? 0 : cur;
    if (e.key === 'ArrowLeft') next = (cur - 1 + tabs.length) % tabs.length;
    else if (e.key === 'ArrowRight') next = (cur + 1) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    e.preventDefault();
    tabs[next].click();      // 활성 탭 전환(renderNav가 aria-selected·tabindex 갱신)
    const after = nav.querySelectorAll('.lu-am-navtab')[next];
    if (after) after.focus();
  });
  const body = el('div', { className: 'lu-am-body' }, [previewBox, panel]);

  // 하단 저장 칸(닫기/저장 버튼 + 회원가입 게이트)은 제거 — 저장·닫기는 상단 헤더(✓/×)로
  // 통합, 회원가입 유도는 캐릭터 화면에서 빼 로비 등으로 옮긴다(감독 지시).
  const card = el('div', { className: 'lu-am-card' }, [head, body]);
  const overlay = el('div', { id: 'lu-chibi-maker', className: 'lu' }, [card]);
  document.body.appendChild(overlay);


  function setParam(key, value) {
    if (!chibiParams) return;
    chibiParams[key] = value;
    // 종족을 동물로 바꾸면 그 종족 기본 팔레트(털색·포인트색)를 함께 적용 — 사람 피부색이
    // 동물에 남아 어색해지는 걸 방지.
    if (key === 'species' && value !== 'human' && SPECIES_PRESET[value]) {
      Object.assign(chibiParams, SPECIES_PRESET[value]);
    }
    chibiParams = normalizeChibi(chibiParams);
    rebuildPreview();
    renderPanel();
  }

  // 프리셋 적용 — 완성 룩을 통째로 로드해 시작점으로. 이후 세부 커스터마이즈 가능.
  function applyPreset(look) {
    chibiParams = normalizeChibi(Object.assign({}, look));
    rebuildPreview();
    renderPanel();
  }

  function presetRow() {
    // 카테고리 섹션 렌더 — 56장 평면 나열은 훑기 어렵다는 감독 피드백으로
    // CHIBI_PRESET_GROUPS(chibi.js SSOT) 순서대로 소제목 + wrap 행을 그린다.
    // cat 미지정 프리셋은 'human'으로 귀속(신규 필드 하위호환).
    for (const grp of CHIBI_PRESET_GROUPS) {
      const items = CHIBI_PRESETS.filter((pre) => (pre.cat || 'human') === grp.id);
      if (!items.length) continue;
      page.appendChild(el('div', { className: 'lu-am-section-title', text: `${grp.name} (${items.length})` }));
      const row = el('div', { className: 'lu-am-tabs lu-am-presets' });
      for (const pre of items) {
        const btn = el('button', { type: 'button', className: 'lu-am-tab lu-am-preset' });
        const c1 = pre.look.skin || DEFAULT_CHIBI.skin;
        const c2 = pre.look.top || pre.look.hairColor || DEFAULT_CHIBI.top;
        const dot = el('span', { className: 'lu-am-preset-dot', 'aria-hidden': 'true' });
        dot.style.background = `conic-gradient(${c1} 0deg 180deg, ${c2} 180deg 360deg)`;
        btn.appendChild(dot);
        btn.appendChild(el('span', { className: 'lu-am-preset-label', text: pre.name }));
        btn.addEventListener('click', () => applyPreset(pre.look));
        row.appendChild(btn);
      }
      page.appendChild(row);
    }
  }

  // 종족 한글 라벨 — 옷장 슬롯 자동 이름에 사용.
  function speciesLabel(id) {
    const s = CHIBI_SPECIES.find((x) => x.id === id);
    return (s && s.name) || '아야모';
  }

  // 내 옷장 — 로그인 사용자 전용. 지금 모습을 여러 벌 저장/불러오기/삭제.
  function closetRow() {
    if (!authGetProfile()) return; // 옷장은 로그인 사용자만
    const uid = currentUserId();
    groupTitle('내 옷장');

    const saveNew = el('button', {
      type: 'button', className: 'lu-am-btn lu-closet-save', text: '＋ 지금 모습 옷장에 저장',
    });
    saveNew.addEventListener('click', () => {
      const list = readCloset(uid);
      if (list.length >= LU_CLOSET_MAX) {
        setStatus(`옷장은 최대 ${LU_CLOSET_MAX}벌까지 저장할 수 있어요`);
        return;
      }
      const slot = {
        id: 'c' + Date.now(),
        name: speciesLabel(chibiParams.species),
        look: JSON.parse(JSON.stringify(chibiParams)),
        thumb: snapshotThumb(120, 160),
        ts: Date.now(),
      };
      list.push(slot);
      if (!saveCloset(list, uid)) {
        setStatus('저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요');
        return;
      }
      renderPanel();
    });
    page.appendChild(saveNew);

    const list = readCloset(uid);
    if (!list.length) {
      page.appendChild(el('div', { className: 'lu-closet-empty', text: '아직 저장한 옷이 없어요. 마음에 드는 모습을 저장해 두세요.' }));
      return;
    }
    const grid = el('div', { className: 'lu-closet-grid' });
    list.forEach((slot) => {
      const cell = el('div', { className: 'lu-closet-cell' });
      const load = el('button', {
        type: 'button', className: 'lu-closet-load', title: `${slot.name} 불러오기`, 'aria-label': `${slot.name} 불러오기`,
      });
      if (slot.thumb) load.style.backgroundImage = `url('${slot.thumb}')`;
      load.appendChild(el('span', { className: 'lu-closet-name', text: slot.name }));
      load.addEventListener('click', () => applyPreset(slot.look));
      const del = el('button', {
        type: 'button', className: 'lu-closet-del', text: '×', title: '삭제', 'aria-label': `${slot.name} 삭제`,
      });
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = readCloset(uid).filter((s) => s.id !== slot.id);
        saveCloset(next, uid);
        renderPanel();
      });
      cell.appendChild(load);
      cell.appendChild(del);
      grid.appendChild(cell);
    });
    page.appendChild(grid);
  }

  const boolOpts = (a, b) => [{ id: false, name: a }, { id: true, name: b }];

  function chipRow(labelText, options, key) {
    page.appendChild(el('div', { className: 'lu-am-section-title', text: labelText }));
    const row = el('div', { className: 'lu-am-tabs' });
    options.forEach((opt) => {
      const btn = el('button', {
        type: 'button',
        className: 'lu-am-tab' + (chibiParams[key] === opt.id ? ' lu-selected' : ''),
        text: opt.name,
      });
      btn.addEventListener('click', () => setParam(key, opt.id));
      row.appendChild(btn);
    });
    page.appendChild(row);
  }

  function swatchRow(labelText, palette, key) {
    page.appendChild(el('div', { className: 'lu-am-section-title', text: labelText }));
    const row = el('div', { className: 'lu-swatches' });
    palette.forEach((hex) => {
      const swatch = el('button', {
        type: 'button',
        className: 'lu-swatch' + (chibiParams[key] === hex ? ' lu-selected' : ''),
        style: `background:${hex};`,
        title: hex,
        'aria-label': `${labelText} ${hex}`,
      });
      swatch.addEventListener('click', () => setParam(key, hex));
      row.appendChild(swatch);
    });
    page.appendChild(row);
  }

  function groupTitle(text) {
    const row = el('div', { className: 'lu-am-group-title' });
    const icon = el('span', { className: 'lu-am-group-icon', 'aria-hidden': 'true' });
    icon.innerHTML = ICON_LEAF;
    row.appendChild(icon);
    row.appendChild(el('span', { text }));
    page.appendChild(row);
  }

  // 카테고리 내비 재구성 — 매 렌더마다 새로 그리되(기존 전체-리렌더 패턴과 동일 비용),
  // 로그인 여부에 따라 옷장 탭 노출을 즉시 반영한다.
  function renderNav() {
    nav.textContent = '';
    const showCloset = !!authGetProfile();
    const cats = CHIBI_NAV_CATS.filter((c) => c.id !== 'closet' || showCloset);
    if (!cats.some((c) => c.id === activeCat)) activeCat = 'species';
    cats.forEach((cat) => {
      const selected = activeCat === cat.id;
      const btn = el('button', {
        type: 'button',
        role: 'tab',
        id: 'lu-am-tab-' + cat.id,
        className: 'lu-am-navtab' + (selected ? ' lu-selected' : ''),
        'aria-selected': selected ? 'true' : 'false',
        'aria-controls': 'lu-am-tabpanel',
        tabindex: selected ? '0' : '-1',   // 로빙 탭인덱스 — 선택 탭만 Tab 포커스 대상
        'aria-label': cat.label,
      });
      btn.innerHTML = cat.icon;
      btn.appendChild(el('span', { className: 'lu-am-navtab-label', text: cat.label }));
      btn.addEventListener('click', () => {
        if (activeCat === cat.id) return;
        activeCat = cat.id;
        renderPanel();
        page.scrollTop = 0;
      });
      nav.appendChild(btn);
    });
    page.setAttribute('aria-labelledby', 'lu-am-tab-' + activeCat); // 패널 ↔ 활성 탭 연결
  }

  function renderPanel() {
    renderNav();
    page.textContent = '';
    if (!chibiParams) return;
    const isAnimal = chibiParams.species && chibiParams.species !== 'human';

    if (activeCat === 'species') {
      // 프리셋(빠른 시작)을 맨 위에 둔다 — 감독 지시. 피부/털색은 "몸" 속성이라
      // 종족과 같은 탭에 둬 얼굴 탭 6줄 세로 넘침을 해소한다(감독 보고: 얼굴 탭
      // 피부색 줄이 아래에 끼여 잘림).
      presetRow();
      groupTitle(isAnimal ? '종족 · 털색' : '종족 · 성별 · 피부색');
      chipRow('종족', CHIBI_SPECIES, 'species');
      if (!isAnimal) chipRow('성별', CHIBI_GENDERS, 'gender');
      swatchRow(isAnimal ? '털 색' : '피부색', SKIN_TONES, 'skin');
    } else if (activeCat === 'face') {
      groupTitle('얼굴');
      chipRow('얼굴형', CHIBI_FACE_SHAPES, 'face');
      chipRow('눈', CHIBI_EYE_STYLES, 'eyeStyle');
      chipRow('입', CHIBI_MOUTH_STYLES, 'mouth');
      if (!isAnimal) chipRow('수염', CHIBI_BEARD_STYLES, 'beardStyle'); // 사람 전용
      chipRow('볼터치', boolOpts('없음', '있음'), 'blush');
      swatchRow('눈동자 색', EYE_COLORS, 'eyeColor');
    } else if (activeCat === 'hair') {
      if (!isAnimal) {
        groupTitle('헤어');
        chipRow('헤어', CHIBI_HAIR_STYLES, 'hairStyle');
        swatchRow('머리 색', HAIR_COLORS, 'hairColor');
      } else {
        groupTitle('포인트');
        swatchRow('귀·꼬리 색', HAIR_COLORS, 'hairColor');
      }
    } else if (activeCat === 'outfit') {
      groupTitle('의상');
      chipRow('상의 패턴', CHIBI_TOP_PATTERNS, 'pattern');
      chipRow('의상 세트', CHIBI_OUTFITS, 'outfit');
      chipRow('하의', CHIBI_BOTTOM_TYPES, 'bottomType');
      swatchRow('상의 색', CHIBI_CLOTH_COLORS, 'top');
      swatchRow('하의 색', CHIBI_CLOTH_COLORS, 'bottom');
      swatchRow('신발 색', CHIBI_CLOTH_COLORS, 'shoes');
    } else if (activeCat === 'acc') {
      groupTitle('장식');
      chipRow('머리 장식', CHIBI_ACCESSORIES, 'acc');
      chipRow('안경', boolOpts('없음', '착용'), 'glasses');
      chipRow('헤일로', boolOpts('없음', '있음'), 'halo');
      chipRow('날개', boolOpts('없음', '있음'), 'wings');
      chipRow('가슴 하트', boolOpts('없음', '있음'), 'heart');
    } else if (activeCat === 'closet') {
      closetRow();
    }
  }

  // 치비 조립은 동기·저비용이라 디바운스 없이 즉시 재조립한다
  function rebuildPreview() {
    if (!chibiParams || !previewRotator) return;
    if (chibiPreviewInstance) {
      previewRotator.remove(chibiPreviewInstance.group);
      chibiPreviewInstance.dispose();
      chibiPreviewInstance = null;
    }
    // blobShadow:false — 수평 원판 그림자는 프리뷰의 얕은 카메라에서 발에 겹쳐 보였다
    // (감독 신고). 대신 실시간 그림자맵으로 바닥에 접지 그림자를 뿌린다(ensurePreviewRenderer).
    chibiPreviewInstance = createAvatarInstance(encodeChibi(chibiParams), GOLD, ' ', { blobShadow: false });
    // 캐릭터 메쉬가 그림자를 드리우게 한다(그림자맵에 렌더될 대상). 재조립마다 새 그룹이라 매번.
    chibiPreviewInstance.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    previewRotator.add(chibiPreviewInstance.group);
  }

  function previewFrame(t) {
    chibiPreviewRAF = requestAnimationFrame(previewFrame);
    // raw = 실제 경과(벽시계, 초). delta는 애니 진행용으로만 캡한다(큰 프레임드랍 시
    // 위상이 한 번에 너무 많이 튀는 것 방지). 프리뷰는 물리 관성이 없어 캡을 0.1까지
    // 완화해도 안전하고, 저프레임 기기에서 동작이 과하게 느려지지 않는다.
    const raw = chibiPreviewLastT ? (t - chibiPreviewLastT) / 1000 : 0;
    const delta = Math.min(0.1, raw);
    chibiPreviewLastT = t;
    if (!chibiDragging) {
      chibiSwingT += delta;
      previewRotator.rotation.y = chibiSwingBase + Math.sin(chibiSwingT * CHIBI_SWING_SPEED) * CHIBI_SWING_AMPLITUDE;
      // 자동 연기 — 드래그로 돌려보는 중이 아닐 때만. 다음 동작 시점은 벽시계(raw)로 세어
      // 저프레임에서도 제때 트리거된다. 한 동작이 끝나면 잠깐 쉬고 다음 랜덤 동작.
      chibiAutoActClock -= raw;
      if (chibiAutoActClock <= 0 && chibiPreviewInstance && typeof chibiPreviewInstance.playAction === 'function') {
        const name = CHIBI_AUTO_ACTIONS[Math.floor(Math.random() * CHIBI_AUTO_ACTIONS.length)];
        chibiPreviewInstance.playAction(name);
        chibiAutoActClock = (CHIBI_ACTION_DUR[name] || 1.5) + 0.6 + Math.random() * 0.9;
      }
    }
    if (chibiPreviewInstance) chibiPreviewInstance.update(delta, 0);
    previewRenderer.render(previewScene, previewCamera);
  }
  function startLoop() {
    if (chibiPreviewRAF) return;
    chibiPreviewLastT = 0;
    chibiPreviewRAF = requestAnimationFrame(previewFrame);
  }
  function stopLoop() {
    if (chibiPreviewRAF) cancelAnimationFrame(chibiPreviewRAF);
    chibiPreviewRAF = null;
  }

  // 드래그 회전 — 포인터 캡처로 카드 밖 드래그도 추적
  canvas.addEventListener('pointerdown', (e) => {
    chibiDragging = true;
    chibiDragLastX = e.clientX;
    previewBox.classList.add('lu-dragging');
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!chibiDragging) return;
    previewRotator.rotation.y += (e.clientX - chibiDragLastX) * 0.012;
    chibiDragLastX = e.clientX;
  });
  const endDrag = () => {
    chibiDragging = false;
    previewBox.classList.remove('lu-dragging');
    // 멈춘 각도에서 끊김 없이 좌우 스윙 재개 (sin(0)=0)
    chibiSwingBase = previewRotator.rotation.y;
    chibiSwingT = 0;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  closeX.addEventListener('click', () => closeChibiMaker());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeChibiMaker(); });

  // 현재 프리뷰를 렌더 직후 스냅샷해 축소 썸네일(dataURL)을 만든다.
  // preserveDrawingBuffer:false 대응 — 같은 태스크 안에서 렌더 직후 읽어야 유효.
  function snapshotThumb(w, h) {
    try {
      if (!previewRenderer) return '';
      previewRenderer.render(previewScene, previewCamera);
      return makeThumbDataUrl(canvas, w, h) || previewRenderer.domElement.toDataURL('image/png');
    } catch (_) { return ''; }
  }

  // 로그인 여부에 따라 상단 저장(✓) 버튼의 접근성 라벨을 갱신한다(로그인=계정 저장, 게스트=세션 적용).
  function syncSaveGate() {
    const loggedIn = !!authGetProfile();
    const label = loggedIn ? '저장하고 사용' : '이 캐릭터 사용';
    saveV.setAttribute('aria-label', label);
    saveV.title = label;
  }

  saveV.addEventListener('click', () => {
    if (!chibiParams) return;
    const look = JSON.parse(JSON.stringify(chibiParams));
    sessionChibi = look;                       // 항상 이번 세션에 적용(게스트 포함)
    const loggedIn = !!authGetProfile();
    if (loggedIn) {
      const ok = saveStoredChibi(look);        // 계정(유저 네임스페이스)에 저장
      const thumb = snapshotThumb(150, 200);
      if (thumb) saveStoredChibiThumb(thumb);
      if (!ok) setStatus('저장 공간이 부족해요 — 옷장에서 몇 벌을 지워 주세요');
    }
    if (els && els.lobby) els.lobby.onChibiSaved();
    // 입장 후 편집이면 월드의 내 아바타에도 즉시 반영(+멀티플레이 전파)
    if (entered && typeof callbacks.onAvatarChange === 'function') {
      callbacks.onAvatarChange(encodeChibi(look));
    }
    // 게스트 안내는 마지막에(성공 토스트에 가려지지 않게)
    if (!loggedIn) setStatus('이 캐릭터로 적용했어요 · 회원가입하면 저장돼요');
    closeChibiMaker();
  });

  function open() {
    activeCat = 'species'; // 새로 열 때는 항상 첫 카테고리(종족)부터 — 이전 탭 유지 방지
    chibiParams = normalizeChibi(Object.assign({}, DEFAULT_CHIBI, readActiveChibi() || {}));
    syncSaveGate(); // 로그인 여부에 따라 저장/회원가입 버튼 상태 갱신
    ensurePreviewRenderer();
    previewRotator.rotation.y = Math.PI; // 정면(카메라 쪽)부터 — 얼굴을 꾸미는 화면이므로
    chibiSwingBase = Math.PI; chibiSwingT = 0;
    chibiAutoActClock = 1.0; // 열고 잠깐 뒤 첫 동작(자동 연기)
    rebuildPreview();
    renderPanel();
    overlay.classList.add('lu-open');
    chibiOpen = true;
    startLoop();
    // 입장 후 편집이면 모달이 화면을 덮는 동안 플레이어 이동·포인터락을 멈춘다
    // (라이트박스/투어와 동일한 확립된 패턴). 로비에서는 이미 비활성이라 main.js가 무시.
    if (typeof callbacks.onMakerToggle === 'function') callbacks.onMakerToggle(true);
  }
  function close() {
    overlay.classList.remove('lu-open');
    chibiOpen = false;
    stopLoop();
    if (chibiPreviewInstance) {
      previewRotator.remove(chibiPreviewInstance.group);
      chibiPreviewInstance.dispose();
      chibiPreviewInstance = null;
    }
    if (typeof callbacks.onMakerToggle === 'function') callbacks.onMakerToggle(false);
  }
  return { open, close };
}

function openChibiMaker() {
  if (!els || !els.chibiMaker) return;
  // 다른 전체 오버레이가 열려 있으면 그 위에 쌓지 않는다(모달 스택 일관성).
  // 로비(입장 전)에서는 이 플래그들이 모두 false라 정상 동작.
  if (chibiOpen || lightboxOpen || shareModalOpen || guestbookOpen || artworkListOpen) return;
  els.chibiMaker.open();
}
function closeChibiMaker() {
  if (els && els.chibiMaker) els.chibiMaker.close();
}

// ---------------------------------------------------------------------------
// 전역 키 핸들러 — Enter로 채팅 입력창 포커스, ESC 우선순위 처리
// ---------------------------------------------------------------------------
// ESC 우선순위 규약:
//   ① 아바타 커스터마이저 모달이 열려 있으면 커스터마이저 모달만 닫는다
//   ② (커스터마이저가 닫혀 있고) 공유 모달이 열려 있으면 공유 모달만 닫는다
//   ③ (위 둘이 닫혀 있고) 라이트박스가 열려 있으면 라이트박스만 닫는다
//   ④ (위 셋이 닫혀 있고) 작품 목록이 열려 있으면 작품 목록만 닫는다
//   ⑤ (위 넷이 닫혀 있고) 방명록이 열려 있으면 방명록만 닫는다
//   ⑥ 다섯 다 닫혀 있으면 ui.js는 아무것도 하지 않는다 (투어 종료는 main.js 담당)
// 채팅/방명록 입력창 포커스 중 ESC는 입력창 자체 keydown 핸들러가 stopPropagation하므로
// 이 전역 핸들러까지 도달하지 않는다 (기존 동작 유지).
function bindGlobalKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (chibiOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeChibiMaker();
        return;
      }
      if (shareModalOpen) {
        e.preventDefault();
        // ui.js 리스너는 main.js보다 먼저 등록되므로 여기서 멈추면
        // 같은 ESC가 main.js의 투어-종료 리스너까지 도달하지 않는다 (ESC=한 동작).
        e.stopImmediatePropagation();
        hideShareModal();
        return;
      }
      if (lightboxOpen) {
        e.preventDefault();
        // 같은 ESC가 main.js의 투어-종료 리스너까지 도달해 라이트박스 닫기 +
        // 투어 종료가 한 번에 일어나는 것을 막는다 (ESC=한 동작). ui.js 리스너는
        // main.js보다 먼저 등록되므로 여기서 멈추면 main.js는 이 ESC를 못 받는다.
        e.stopImmediatePropagation();
        hideLightbox();
        return;
      }
      if (artworkListOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        hideArtworkList();
        return;
      }
      if (guestbookOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        hideGuestbook();
        return;
      }
      return;
    }
    // 라이트박스/공유 모달/커스터마이저 모달이 열려 있는 동안에는 Enter(채팅 포커스) 등
    // 다른 전역 키를 막는다 — 오버레이에 가려진 채팅 입력창이 포커스되는 혼란을 방지.
    if (lightboxOpen || shareModalOpen) return;
    if (!entered) return;
    const active = document.activeElement;
    const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    if (typing) return; // 입력 중이면 각 input의 자체 핸들러가 처리
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      els.chat.input.focus();
    } else if ((e.key === 'c' || e.key === 'C' || e.key === 'ㅊ') && !chibiOpen) {
      // 입장 후 아야모 꾸미기 창 열기 (한글 자판 'ㅊ' 포함). 이미 열려 있으면 무시.
      e.preventDefault();
      e.stopPropagation();
      openChibiMaker();
    }
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initUI({ onEnter, onChatSend, onAvatarChange, onMakerToggle } = {}) {
  if (initialized) {
    callbacks.onEnter = onEnter || callbacks.onEnter;
    callbacks.onChatSend = onChatSend || callbacks.onChatSend;
    callbacks.onAvatarChange = onAvatarChange || callbacks.onAvatarChange;
    callbacks.onMakerToggle = onMakerToggle || callbacks.onMakerToggle;
    return;
  }
  initialized = true;
  callbacks.onEnter = onEnter || null;
  callbacks.onChatSend = onChatSend || null;
  callbacks.onAvatarChange = onAvatarChange || null;
  callbacks.onMakerToggle = onMakerToggle || null;

  injectStyles();

  els = {
    loading: buildLoading(),
    lobby: buildLobby(),
    controls: buildControls(),
    topRight: buildTopRight(),
    status: buildStatus(),
    chat: buildChat(),
    artwork: buildArtworkPanel(),
    galleryTitle: buildGalleryTitle(),
    lightbox: buildLightbox(),
    artworkList: buildArtworkList(),
    guestbook: buildGuestbookPanel(),
    tourBar: buildTourBar(),
    dock: buildMobileDock(),
    shutter: buildShutter(),
    share: buildShareModal(),
    chibiMaker: buildChibiMaker(),
  };
  // 접속자 수 표시는 상단 통합 바 소속 — setPlayerCount가 쓰는 참조를 연결
  els.topRight.count = els.galleryTitle._count;
  els.topRight.countWrap = els.galleryTitle._countWrap;

  bindGlobalKeys();

  // initUI() 호출 이전에 대기 중이던 값이 있으면 지금 적용한다.
  if (pendingGalleryTitle !== null) applyGalleryTitle(pendingGalleryTitle);
  if (pendingPicker) applyGalleryPicker(pendingPicker.galleries, pendingPicker.currentId, pendingPicker.onPick);
  if (pendingArtworkList) renderArtworkList(pendingArtworkList);
  if (pendingGuestbookNotes) renderGuestbookNotes(pendingGuestbookNotes);
}

export function showLoading(show) {
  if (!els) return;
  els.loading.classList.toggle('lu-hidden', !show);
}

export function hideLobby() {
  if (!els) return;
  entered = true;
  els.lobby.overlay.classList.add('lu-hidden');
  // HUD 표시
  els.controls.classList.add('lu-visible');
  els.topRight.wrap.classList.add('lu-visible');
  els.status.classList.add('lu-visible');
  els.chat.wrap.classList.add('lu-visible');
  els.galleryTitle.classList.add('lu-visible');
  els.guestbook.tab.classList.add('lu-visible');
  // [P0] 모바일 독·조작법 토글 — 이 두 줄이 빠져 실기기에서 독이 투명+터치불가로
  // 죽어 있었다 (UX 감사에서 발견). dock은 데스크톱에서 null이므로 가드.
  if (els.dock) els.dock.classList.add('lu-visible');
  const controlsToggle = document.getElementById('lu-controls-toggle');
  if (controlsToggle) controlsToggle.classList.add('lu-visible');
}

export function showArtworkInfo(art) {
  if (!els || !art) return;
  if (currentArtworkId === art.id && els.artwork.panel.classList.contains('lu-open')) {
    return; // 같은 작품이면 재렌더 생략
  }
  currentArtworkId = art.id;
  els.artwork.title.textContent = art.title || '';
  els.artwork.meta.textContent = [art.artist, art.year].filter(Boolean).join(' · ');
  els.artwork.desc.textContent = art.desc || '';
  els.artwork.panel.classList.add('lu-open');
}

export function hideArtworkInfo() {
  if (!els) return;
  currentArtworkId = null;
  els.artwork.panel.classList.remove('lu-open');
}

export function addChatMessage(name, text, isSelf) {
  if (!els) return;
  const msg = el('div', { className: 'lu-chat-msg' + (isSelf ? ' lu-self' : '') }, [
    el('span', { className: 'lu-chat-name', text: name }),
    el('span', { text: text }),
  ]);
  els.chat.log.appendChild(msg);
  while (els.chat.log.children.length > MAX_CHAT_MESSAGES) {
    els.chat.log.removeChild(els.chat.log.firstChild);
  }
}

export function setPlayerCount(n) {
  if (!els) return;
  const prev = els.topRight.count.textContent;
  els.topRight.count.textContent = String(n);
  // 숫자 변화에 스프링 틱 — 살아있는 게이지처럼
  if (prev !== String(n) && els.topRight.countWrap) {
    els.topRight.countWrap.classList.remove('lu-tick');
    void els.topRight.countWrap.offsetWidth;
    els.topRight.countWrap.classList.add('lu-tick');
  }
  // 접속자 ≥2일 때만 독에 채팅 버튼 노출 (혼자일 땐 인지 부하 절감 — UX 감사 §2)
  if (dockRefs && dockRefs.chatWrap) dockRefs.chatWrap.style.display = n >= 2 ? '' : 'none';
}

export function setStatus(text) {
  if (!els) return;
  els.status.textContent = text || '';
}

export function setFPS(n) {
  if (!els) return;
  els.topRight.fps.textContent = String(Math.round(n));
}

// ---------------------------------------------------------------------------
// 전시 제목
// ---------------------------------------------------------------------------

function applyGalleryTitle(name) {
  els.galleryTitle.querySelector('.lu-topbar-title').textContent = name || '';
  els.galleryTitle.classList.toggle('lu-empty', !name);
}

export function setGalleryTitle(name) {
  pendingGalleryTitle = name || '';
  if (!els) return; // initUI() 호출 시 pendingGalleryTitle이 적용됨
  applyGalleryTitle(pendingGalleryTitle);
}

// ---------------------------------------------------------------------------
// 전시 디렉터리 (로비 내 전시 선택)
// ---------------------------------------------------------------------------

function applyGalleryPicker(galleries, currentId, onPick) {
  const box = els.lobby.pickerBox;
  box.innerHTML = '';
  if (!Array.isArray(galleries) || galleries.length === 0) return;

  const label = el('div', {
    className: 'lu-field-label',
    text: '전시 선택',
    style: 'margin-top:26px;',
  });
  box.appendChild(label);

  if (currentId === null || currentId === undefined) {
    box.appendChild(el('div', { className: 'lu-picker-note', text: '공유된 전시 관람 중' }));
  }

  const list = el('div', { className: 'lu-picker-list' });
  galleries.forEach((g) => {
    const isCurrent = g.id === currentId;
    const item = el('button', {
      type: 'button',
      className: 'lu-picker-item' + (isCurrent ? ' lu-picker-current' : ''),
    }, [
      el('div', { className: 'lu-picker-name', text: g.name || g.id }),
      el('div', {
        className: 'lu-picker-meta',
        text: [g.artist, typeof g.count === 'number' ? `${g.count}점` : null]
          .filter(Boolean).join(' · '),
      }),
    ]);
    if (isCurrent) item.disabled = true;
    item.addEventListener('click', () => {
      if (isCurrent) return;
      if (typeof onPick === 'function') onPick(g.id);
    });
    list.appendChild(item);
  });
  box.appendChild(list);
}

export function initGalleryPicker(galleries, currentId, onPick) {
  pendingPicker = { galleries, currentId: currentId ?? null, onPick };
  if (!els) return; // initUI() 호출 시 pendingPicker가 적용됨
  applyGalleryPicker(pendingPicker.galleries, pendingPicker.currentId, pendingPicker.onPick);
}

// ---------------------------------------------------------------------------
// 라이트박스 — 작품 확대 감상
// ---------------------------------------------------------------------------

function clearLightboxMedia() {
  const stage = els.lightbox.stage;
  const media = stage.firstChild;
  if (media && media.tagName === 'VIDEO') {
    media.pause();
    media.removeAttribute('src');
    media.load();
  }
  stage.innerHTML = '';
}

export function showLightbox(art) {
  if (!els || !art) return;
  lightboxCurrentArt = art;
  if (els.lightbox.resetZoom) els.lightbox.resetZoom();
  if (lightboxCloseTimer) {
    clearTimeout(lightboxCloseTimer);
    lightboxCloseTimer = null;
  }

  clearLightboxMedia();

  let media;
  if (art.videoUrl) {
    media = el('video', {
      className: 'lu-lightbox-media',
      src: art.videoUrl,
      controls: 'controls',
      autoplay: 'autoplay',
      loop: 'loop',
      muted: 'muted',
      playsinline: 'playsinline',
    });
    media.muted = true; // 일부 브라우저는 속성만으로 부족
  } else {
    media = el('img', {
      className: 'lu-lightbox-media',
      src: art.imageUrl || '',
      alt: art.title || '',
    });
  }
  els.lightbox.stage.appendChild(media);

  els.lightbox.title.textContent = art.title || '';
  els.lightbox.meta.textContent = [art.artist, art.year].filter(Boolean).join(' · ');
  els.lightbox.desc.textContent = art.desc || '';

  lightboxOpen = true;
  els.lightbox.overlay.classList.add('lu-open');
}

export function hideLightbox() {
  if (!els || !lightboxOpen) return;
  lightboxOpen = false;
  els.lightbox.overlay.classList.remove('lu-open');

  // 페이드 아웃(0.32s)이 끝난 뒤 미디어를 정리해 영상 재생/오디오 로드를 멈춘다.
  if (lightboxCloseTimer) clearTimeout(lightboxCloseTimer);
  lightboxCloseTimer = setTimeout(() => {
    clearLightboxMedia();
    lightboxCloseTimer = null;
  }, 340);

  if (typeof onLightboxClose === 'function') onLightboxClose();
}

export function isLightboxOpen() {
  return lightboxOpen;
}

export function setOnLightboxClose(cb) {
  onLightboxClose = typeof cb === 'function' ? cb : null;
}

// ---------------------------------------------------------------------------
// 작품 목록 패널 — M 키(또는 HUD 버튼)로 열어 작품을 골라 텔레포트
// ---------------------------------------------------------------------------

// artworks: getPlacedArtworks()가 반환하는 작품 배열. onSelect(art)는 카드 클릭 시
// (패널이 자동으로 닫힌 뒤) 호출된다. createArtworks() 완료 후 호출해야 한다.
export function initArtworkList(artworks, onSelect) {
  onArtworkSelect = typeof onSelect === 'function' ? onSelect : null;
  pendingArtworkList = artworks;
  if (!els) return; // initUI() 호출 시 pendingArtworkList가 적용됨
  renderArtworkList(pendingArtworkList);
}

export function toggleArtworkList() {
  if (!els) return;
  if (artworkListOpen) {
    hideArtworkList();
  } else {
    artworkListOpen = true;
    els.artworkList.panel.classList.add('lu-open');
  }
}

export function hideArtworkList() {
  if (!els || !artworkListOpen) return;
  artworkListOpen = false;
  els.artworkList.panel.classList.remove('lu-open');
}

export function isArtworkListOpen() {
  return artworkListOpen;
}

// ---------------------------------------------------------------------------
// 투어 바 — T 키로 시작하는 도슨트 투어의 하단 중앙 컨트롤 바
// ---------------------------------------------------------------------------

// index는 0-based (현재 작품의 배열 인덱스) — 화면에는 index+1 / total로 표시된다.
export function showTourBar({ index, total, title, autoOn } = {}) {
  if (!els) return;
  const t = els.tourBar;
  const pos = Number.isFinite(index) ? index + 1 : 1;
  const tot = Number.isFinite(total) ? total : 0;
  t.countEl.textContent = `● ${pos} / ${tot}`;
  t.titleEl.textContent = ` — ${title || ''}`;
  t.autoBtn.textContent = autoOn ? '자동진행 ON' : '자동진행 OFF';
  t.autoBtn.classList.toggle('lu-tour-on', !!autoOn);
  t.bar.classList.add('lu-open');
}

export function hideTourBar() {
  if (!els) return;
  els.tourBar.bar.classList.remove('lu-open');
}

// 터치 액션 독/작품 패널 버튼 콜백 — 키보드 없는 기기에서 T(투어)/E(크게 보기)/G(방명록)/P(캡처) 대체.
// main.js가 배선한다. 방명록 독 버튼 자체는 ui.js 내부에서 toggleGuestbook()을 직접 호출하므로
// onGuestbook은 현재 ui.js 내부에서 호출하지 않지만, 계약대로 인터페이스에 포함해 둔다.
export function setActionHandlers({ onTour, onViewArtwork, onGuestbook, onCapture, onSelfView } = {}) {
  actionHandlers = {
    onTour: typeof onTour === 'function' ? onTour : null,
    onViewArtwork: typeof onViewArtwork === 'function' ? onViewArtwork : null,
    onGuestbook: typeof onGuestbook === 'function' ? onGuestbook : null,
    onCapture: typeof onCapture === 'function' ? onCapture : null,
    onSelfView: typeof onSelfView === 'function' ? onSelfView : null,
  };
}

// ---------------------------------------------------------------------------
// 공유 모달 — 포토 모드(P키)로 캡처한 화면을 SNS 공유
// ---------------------------------------------------------------------------

// { blob, dataUrl, galleryName, shareUrl } — blob/dataUrl은 워터마크 합성이 끝난 PNG
// (main.js의 capturePhoto()가 canvas.toBlob + toDataURL로 만들어 전달한다).
export function showShareModal({ blob, dataUrl, galleryName, shareUrl } = {}) {
  if (!els) return;
  shareData = {
    blob: blob || null,
    dataUrl: dataUrl || '',
    galleryName: galleryName || '',
    shareUrl: shareUrl || (typeof window !== 'undefined' ? window.location.href : ''),
  };
  els.share.preview.src = shareData.dataUrl;

  // '기기로 공유' 버튼 — Web Share API의 파일 공유를 지원하는 기기에서만 노출
  let canDeviceShare = false;
  if (
    shareData.blob &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      const file = new File([shareData.blob], 'artshow.png', { type: 'image/png' });
      canDeviceShare = navigator.canShare({ files: [file] });
    } catch (_) {
      canDeviceShare = false;
    }
  }
  els.share.deviceBtn.style.display = canDeviceShare ? '' : 'none';

  // 복사 버튼 표시 상태 초기화 (직전 '복사됨' 피드백이 남아있지 않도록)
  if (shareCopyTimer) { clearTimeout(shareCopyTimer); shareCopyTimer = null; }
  els.share.copyBtn.textContent = '링크 복사';
  els.share.copyBtn.classList.remove('lu-share-btn-copied');

  shareModalOpen = true;
  els.share.overlay.classList.add('lu-open');
}

export function hideShareModal() {
  if (!els || !shareModalOpen) return;
  shareModalOpen = false;
  els.share.overlay.classList.remove('lu-open');
}

export function isShareModalOpen() {
  return shareModalOpen;
}

// 캡처 순간 흰 플래시 0.25s 페이드 — capturePhoto()가 renderer.render() 직후 호출한다.
export function flashShutter() {
  if (!els) return;
  const s = els.shutter;
  s.style.transition = 'none';
  s.style.opacity = '1';
  void s.offsetWidth; // 강제 리플로우: opacity:1을 먼저 확정시킨 뒤 트랜지션을 건다
  s.style.transition = 'opacity 0.25s ease';
  s.style.opacity = '0';
}

// onPrev/onNext/onExit/onToggleAuto — 투어 바 버튼 클릭 시 호출될 콜백.
// main.js가 T 키 진입 시(또는 이후 필요 시점에) 배선한다.
export function setTourHandlers({ onPrev, onNext, onExit, onToggleAuto } = {}) {
  tourHandlers = {
    onPrev: typeof onPrev === 'function' ? onPrev : null,
    onNext: typeof onNext === 'function' ? onNext : null,
    onExit: typeof onExit === 'function' ? onExit : null,
    onToggleAuto: typeof onToggleAuto === 'function' ? onToggleAuto : null,
  };
}

// ---------------------------------------------------------------------------
// 방명록 패널 — G 키(또는 HUD 버튼)로 열어 전시에 한 줄 메모를 남긴다
// ---------------------------------------------------------------------------

// onSubmit(text) — 입력창에서 [남기기] 또는 Ctrl/Cmd+Enter로 제출된 본문(트림·120자 이내).
// 닉네임 결합(makeNote) 및 저장/브로드캐스트는 main.js 담당.
/** 방명록 패널 하단 통계 요약 한 줄 갱신 (작가 리포트 — main.js가 주기 호출) */
export function setGuestbookStats(text) {
  const line = document.getElementById('lu-gbook-stats');
  if (line) line.textContent = text || '';
}

export function initGuestbook({ onSubmit } = {}) {
  onGuestbookSubmit = typeof onSubmit === 'function' ? onSubmit : null;
}

export function toggleGuestbook() {
  if (!els) return;
  if (guestbookOpen) {
    hideGuestbook();
  } else {
    guestbookOpen = true;
    els.guestbook.panel.classList.add('lu-open');
  }
}

export function hideGuestbook() {
  if (!els || !guestbookOpen) return;
  guestbookOpen = false;
  els.guestbook.panel.classList.remove('lu-open');
}

export function isGuestbookOpen() {
  return guestbookOpen;
}

// notes: note[] (id/name/text/ts) — 전체 교체 렌더. 최신순으로 전달되어야 한다.
export function setGuestbookNotes(notes) {
  pendingGuestbookNotes = Array.isArray(notes) ? notes : [];
  if (!els) return; // initUI() 호출 시 pendingGuestbookNotes가 적용됨
  renderGuestbookNotes(pendingGuestbookNotes);
}
