// frontend/js/ui-hud.ts (C-1 단계4에서 ui.js → ui-hud.ts 로 개명. 셸 + HUD 빌더 + Public API)
// 타입: 후속 #96에서 @ts-nocheck 제거 완료 — strict 통과. 타입 주석·지역 캐스팅만
//   더했고 런타임 로직은 무변경이다. els는 15개 빌더 결과가 런타임 조립되고 프로퍼티가
//   추가 주입되는 이질 컨테이너라 any로 표현한다(각 빌더 반환은 지역에서 타입 검증됨).
// OpenArtShow Museum — UI 모듈 (DOM/CSS 전부 JS에서 동적 생성)
// MoMA 미니멀 미학: Helvetica, 화이트/블랙, 골드(#5f9e7d) 포인트

import { AVATAR_COLORS } from './config.js';
import { getPlacedArtworks } from './artworks.js';
import {
  DEFAULT_CHIBI,
  CHIBI_ACTIONS,
  encodeChibi,
} from './chibi.js';
import {
  PROVIDERS as AUTH_PROVIDERS,
  MOCK_NAMES as AUTH_MOCK_PREFILL,
  loginWith as authLoginWith,
  logout as authLogout,
  getProfile as authGetProfile,
  onAuthChange,
} from './auth.js';

import { el } from './ui-dom.js';
import {
  readStoredChibi,
  readStoredChibiThumb,
  readActiveChibi,
} from './ui-chibi-store.js';
// 아바타(아야모) 편집기 클러스터는 별도 모듈로 분리됨(C-1 단계3). 편집기는 ui.js(HUD)를
// import 하지 않는다(순환 0) — ui.js가 소유한 것을 createChibiMaker(ctx)로 주입한다.
import { createChibiMaker } from './ui-avatar-editor.js';
const MAX_CHAT_MESSAGES = 8;
const MAX_NICKNAME_LEN = 12;

// ---------------------------------------------------------------------------
// 내부 상태
// ---------------------------------------------------------------------------
// els는 15개 빌더 결과가 런타임 조립되고 이후 프로퍼티(chibiMaker·topRight.count 등)가
// 추가 주입되는 이질 컨테이너다. 각 빌더 반환은 지역에서 타입 검증되므로 여기선 any로 표현한다.
let els: any = null;              // 생성된 DOM 요소 캐시
// initUI 콜백 배선 — 함수 또는 null (typeof 가드로 호출)
type UICallback = ((...args: any[]) => void) | null;
let callbacks: { onEnter: UICallback; onChatSend: UICallback; onAvatarChange: UICallback; onMakerToggle: UICallback } =
  { onEnter: null, onChatSend: null, onAvatarChange: null, onMakerToggle: null };
let selectedColor = AVATAR_COLORS[0];
// chibi(아야모) 퍼시스턴스 스토어는 중립 leaf `ui-chibi-store.js`로 분리됨(C-1 단계2).
// localStorage 키 생성·세션 룩·옷장·썸네일 — HUD 빌더/아바타 편집기 공용.
// 공유 mutable 상태 — HUD와 아바타 편집기(ui-avatar-editor)가 함께 읽고 쓴다(C-1 단계3).
//   chibiOpen: 편집기가 open/close 시 씀 · HUD(openChibiMaker·bindGlobalKeys)가 읽음.
//   entered  : HUD(hideLobby)가 씀 · 편집기(저장 시 월드 아바타 반영 여부)와 HUD가 읽음.
// ui.js가 소유·생성해 편집기에 ctx.state로 참조 주입한다(양방향 결합을 단일 객체로 해소).
const uiState = { chibiOpen: false, entered: false };
let currentArtworkId: string | null = null; // 작품 패널 재렌더 생략용
let initialized = false;

// 라이트박스 상태
let lightboxOpen = false;
let onLightboxClose: (() => void) | null = null;
let lightboxCloseTimer: ReturnType<typeof setTimeout> | null = null;

// 작품 목록 패널 상태
let artworkListOpen = false;
let onArtworkSelect: ((art: any) => void) | null = null; // initArtworkList(artworks, onSelect)의 onSelect

// 방명록 패널 상태
let guestbookOpen = false;
let onGuestbookSubmit: ((text: string) => void) | null = null; // initGuestbook({ onSubmit })의 onSubmit
let pendingGuestbookNotes: any[] | null = null; // initUI() 이전에 setGuestbookNotes()가 불렸을 때 대기시켜 둘 값
const MAX_GUESTBOOK_TEXT = 120;

// 투어 바 버튼 콜백 (setTourHandlers로 배선)
type TourHandler = (() => void) | null;
let tourHandlers: { onPrev: TourHandler; onNext: TourHandler; onExit: TourHandler; onToggleAuto: TourHandler } =
  { onPrev: null, onNext: null, onExit: null, onToggleAuto: null };

// 터치 기기 여부 — 조작 안내/액션 버튼 구성이 달라진다
const IS_TOUCH =
  (typeof window !== 'undefined' && 'ontouchstart' in window) ||
  (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);

// 터치 액션 버튼 콜백 (setActionHandlers로 배선) — 키보드 없는 기기의 M/T/E/G/P 대체
type ActionHandler = (() => void) | null;
let actionHandlers: {
  onTour: ActionHandler; onViewArtwork: ActionHandler; onGuestbook: ActionHandler;
  onCapture: ActionHandler; onSelfView: ActionHandler;
} = { onTour: null, onViewArtwork: null, onGuestbook: null, onCapture: null, onSelfView: null };

// 공유 모달 상태 (SNS 공유 — 포토 모드)
let shareModalOpen = false;
let shareData: { blob: Blob | null; dataUrl: string; galleryName: string; shareUrl: string } =
  { blob: null, dataUrl: '', galleryName: '', shareUrl: '' };
let shareCopyTimer: ReturnType<typeof setTimeout> | null = null;

// 치비 메이커(아바타 편집기) 전용 상태·프리뷰 렌더러·상수는 ui-avatar-editor.ts로
// 순수 이동됨(C-1 단계3). 크로스 결합 플래그 chibiOpen 은 위 uiState.chibiOpen 으로 승격.

// initUI() 호출 이전에 setGalleryTitle / initGalleryPicker / initArtworkList가
// 먼저 불려도 값을 잃지 않도록 대기시켜 두었다가 DOM 생성 직후 적용한다.
let pendingGalleryTitle: string | null = null;
let pendingPicker: { galleries: any[]; currentId: any; onPick: any } | null = null; // { galleries, currentId, onPick }
let pendingArtworkList: any[] | null = null; // artworks 배열


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
      const p = AUTH_PROVIDERS[key as keyof typeof AUTH_PROVIDERS];
      const btn = el('button', {
        className: `lu-social-btn lu-social-${key}`,
        type: 'button',
      }, [
        el('span', { className: 'lu-social-badge', text: p.short }),
        el('span', { text: p.label }),
      ]);
      btn.addEventListener('click', async () => {
        (btn as HTMLButtonElement).disabled = true;
        btn.classList.add('lu-social-busy');
        try {
          await authLoginWith(key);
        } catch (_) {
          /* mock에서는 실패 없음 */
        }
        (btn as HTMLButtonElement).disabled = false;
        btn.classList.remove('lu-social-busy');
      });
      socialWrap.appendChild(btn);
    }
    socialWrap.appendChild(el('div', {
      className: 'lu-social-note',
      text: '계정 연동 준비 중 — 지금은 프로필 미리보기로 동작합니다',
    }));
  };

  const buildLoggedChip = (p: any) => {
    loggedWrap.textContent = '';
    const avatar = el('span', { className: 'lu-logged-avatar', text: p.initial || p.name.slice(0, 1) });
    const name = el('span', { className: 'lu-logged-name', text: `${p.name}님` });
    const via = el('span', { className: 'lu-logged-via', text: AUTH_PROVIDERS[p.provider as keyof typeof AUTH_PROVIDERS] ? AUTH_PROVIDERS[p.provider as keyof typeof AUTH_PROVIDERS].short : '' });
    const logoutBtn = el('button', { className: 'lu-logout-btn', type: 'button', text: '로그아웃' });
    logoutBtn.addEventListener('click', () => authLogout());
    loggedWrap.appendChild(el('div', { className: 'lu-logged-chip' }, [avatar, name, via, logoutBtn]));
  };

  const syncAuthUI = (p: any) => {
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
  }) as HTMLInputElement;
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

  // 입장 폼(닉네임·캐릭터·소셜) — 재방문자에겐 접어두고 '캐릭터 꾸미기'로 펼친다
  // (A: 재방문 스마트 입장). 그 버튼은 펼치는 동시에 편집기를 연다 — `buildQuickEnter` 참조.
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
    // 감독 지시 2026-08-08: *"닉네임 캐릭터 바꾸기에서 캬릭터 꾸미기로 바꾸고. 바로
    // 편집창으로 이동하게 해줘."* — 라벨이 가리키는 곳으로 한 번에 간다. 예전에는 이
    // 버튼이 폼을 펼치기만 했고, 편집기까지는 그 안의 [캐릭터 디자인]을 한 번 더 눌러야
    // 했다(재방문자 기준 2탭).
    //
    // **폼을 펼치는 동작은 남긴다.** 편집기를 닫으면 그 뒤에 닉네임·입장 폼이 이미 펼쳐져
    // 있어 닉네임 변경 경로가 유지된다 — 라벨에서 '닉네임'이 빠졌다고 기능까지 빼면
    // 재방문자는 닉네임을 바꿀 자리가 사라진다(라벨 변경 ≠ 기능 제거).
    const changeBtn = el('button', { className: 'lu-quick-change', type: 'button', text: '캐릭터 꾸미기' });
    changeBtn.addEventListener('click', () => {
      formWrap.classList.remove('lu-collapsed');
      quickEnter.style.display = 'none';
      // nickInput.focus() 를 부르지 않는다 — 편집기가 곧바로 그 위에 열리므로, 뒤쪽
      // 입력에 포커스를 주면 모바일에서 키보드가 편집기를 덮고 올라온다.
      openChibiMaker();
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
  function svgIcon(name: string) {
    const span = document.createElement('span');
    span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name as keyof typeof ICONS] + '</svg>';
    return span.firstChild as Node; // innerHTML로 svg를 세팅하므로 항상 존재
  }
  function dockBtn(cls: string, aria: string, icon: string, label: string) {
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
  function sheetBtn(icon: string, label: string, fn: () => void) {
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
let dockRefs: any = null;
export function setDockActive(key: string, on: boolean) {
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
  }) as HTMLInputElement;
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
  // setPlayerCount가 참조하는 카운트 엘리먼트를 DOM 노드에 커스텀 프로퍼티로 실어 보낸다
  (bar as any)._count = count;
  (bar as any)._countWrap = countWrap;
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
  let swipe0: { x: number; y: number; t: number } | null = null;

  function mediaEl() {
    return stage.querySelector('.lu-lightbox-media') as HTMLElement | null;
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
  function endPointer(e: PointerEvent) {
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
let lightboxCurrentArt: any = null;
function navLightbox(dir: number) {
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

function renderArtworkList(artworks: any[]) {
  const body = els.artworkList.body;
  body.innerHTML = '';
  if (!Array.isArray(artworks) || artworks.length === 0) {
    body.appendChild(el('div', { className: 'lu-artlist-empty', text: '표시할 작품이 없습니다' }));
    return;
  }
  artworks.forEach((art: any) => {
    const thumb = el('img', {
      className: 'lu-artlist-thumb',
      src: art.imageUrl || ARTLIST_THUMB_FALLBACK,
      alt: art.title || '',
      loading: 'lazy',
    }) as HTMLImageElement;
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
function formatRelativeTime(ts: number) {
  const now = Date.now();
  const diffMs = Math.max(0, now - ts);
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;

  const d = new Date(ts);
  const n = new Date(now);
  const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(n) - startOfDay(d)) / 86400000);
  if (dayDiff <= 1) return '어제';

  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}

function renderGuestbookNotes(notes: any[]) {
  const body = els.guestbook.body;
  body.innerHTML = '';
  if (!Array.isArray(notes) || notes.length === 0) {
    body.appendChild(el('div', { className: 'lu-gbook-empty', text: '첫 방명록을 남겨보세요' }));
    return;
  }
  const DOT_COLORS = ['#e07a5f', '#81b29a', '#5f9e7d', '#8e7dbe', '#6a8caf', '#d68fb8'];
  notes.forEach((note: any) => {
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
  }) as HTMLTextAreaElement;
  const count = el('span', { className: 'lu-gbook-count', text: `0/${MAX_GUESTBOOK_TEXT}` });
  const submitBtn = el('button', { id: 'lu-gbook-submit', type: 'button', text: '남기기' }) as HTMLButtonElement;
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
    // getItem은 string|null — null이면 '' 로 대체(parseFloat(null)·parseFloat('') 모두
    // NaN이라 아래 Number.isFinite 가드에서 동일하게 걸러진다. 런타임 결과 불변).
    const saved = parseFloat(localStorage.getItem(GBTAB_TOP_KEY) ?? '');
    if (Number.isFinite(saved)) tab.style.top = clampTabTop(saved) + 'px';
  } catch (_) { /* 무시 */ }

  function clampTabTop(px: number) {
    const max = Math.max(80, (window.innerHeight || 800) - 140);
    return Math.min(max, Math.max(60, px));
  }

  let tabDrag: { startY: number; startTop: number; moved: boolean } | null = null; // { startY, startTop, moved }
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

function openChibiMaker() {
  if (!els || !els.chibiMaker) return;
  // 다른 전체 오버레이가 열려 있으면 그 위에 쌓지 않는다(모달 스택 일관성).
  // 로비(입장 전)에서는 이 플래그들이 모두 false라 정상 동작.
  if (uiState.chibiOpen || lightboxOpen || shareModalOpen || guestbookOpen || artworkListOpen) return;
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
      if (uiState.chibiOpen) {
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
    if (!uiState.entered) return;
    const active = document.activeElement;
    const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    if (typing) return; // 입력 중이면 각 input의 자체 핸들러가 처리
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      els.chat.input.focus();
    } else if ((e.key === 'c' || e.key === 'C' || e.key === 'ㅊ') && !uiState.chibiOpen) {
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

export function initUI({ onEnter, onChatSend, onAvatarChange, onMakerToggle }: {
  onEnter?: (...a: any[]) => void; onChatSend?: (...a: any[]) => void;
  onAvatarChange?: (...a: any[]) => void; onMakerToggle?: (...a: any[]) => void;
} = {}) {
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
  };
  // 아바타 편집기 — els가 완성된 뒤 별도로 생성·연결한다(편집기가 els.lobby.onChibiSaved를
  // 참조하므로 els 리터럴이 먼저 확정돼야 함). 편집기는 ui.js를 import 하지 않으므로(순환 0)
  // HUD가 소유한 것(els·uiState·callbacks·setStatus)을 ctx로 주입한다(C-1 단계3).
  els.chibiMaker = createChibiMaker({ els, state: uiState, callbacks, setStatus });
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

export function showLoading(show: boolean) {
  if (!els) return;
  els.loading.classList.toggle('lu-hidden', !show);
}

export function hideLobby() {
  if (!els) return;
  uiState.entered = true;
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

export function showArtworkInfo(art: any) {
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

export function addChatMessage(name: string, text: string, isSelf: boolean) {
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

export function setPlayerCount(n: number) {
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

export function setStatus(text: string) {
  if (!els) return;
  els.status.textContent = text || '';
}

export function setFPS(n: number) {
  if (!els) return;
  els.topRight.fps.textContent = String(Math.round(n));
}

// ---------------------------------------------------------------------------
// 전시 제목
// ---------------------------------------------------------------------------

function applyGalleryTitle(name: string) {
  els.galleryTitle.querySelector('.lu-topbar-title').textContent = name || '';
  els.galleryTitle.classList.toggle('lu-empty', !name);
}

export function setGalleryTitle(name: string) {
  pendingGalleryTitle = name || '';
  if (!els) return; // initUI() 호출 시 pendingGalleryTitle이 적용됨
  applyGalleryTitle(pendingGalleryTitle);
}

// ---------------------------------------------------------------------------
// 전시 디렉터리 (로비 내 전시 선택)
// ---------------------------------------------------------------------------

function applyGalleryPicker(galleries: any[], currentId: any, onPick: any) {
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
    if (isCurrent) (item as HTMLButtonElement).disabled = true;
    item.addEventListener('click', () => {
      if (isCurrent) return;
      if (typeof onPick === 'function') onPick(g.id);
    });
    list.appendChild(item);
  });
  box.appendChild(list);
}

export function initGalleryPicker(galleries: any[], currentId: any, onPick: any) {
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

export function showLightbox(art: any) {
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
    (media as HTMLVideoElement).muted = true; // 일부 브라우저는 속성만으로 부족
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

export function setOnLightboxClose(cb: any) {
  onLightboxClose = typeof cb === 'function' ? cb : null;
}

// ---------------------------------------------------------------------------
// 작품 목록 패널 — M 키(또는 HUD 버튼)로 열어 작품을 골라 텔레포트
// ---------------------------------------------------------------------------

// artworks: getPlacedArtworks()가 반환하는 작품 배열. onSelect(art)는 카드 클릭 시
// (패널이 자동으로 닫힌 뒤) 호출된다. createArtworks() 완료 후 호출해야 한다.
export function initArtworkList(artworks: any[], onSelect: any) {
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
export function showTourBar({ index, total, title, autoOn }: {
  index?: number; total?: number; title?: string; autoOn?: boolean;
} = {}) {
  if (!els) return;
  const t = els.tourBar;
  const pos = Number.isFinite(index) ? (index as number) + 1 : 1;
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
export function setActionHandlers({ onTour, onViewArtwork, onGuestbook, onCapture, onSelfView }: {
  onTour?: () => void; onViewArtwork?: () => void; onGuestbook?: () => void;
  onCapture?: () => void; onSelfView?: () => void;
} = {}) {
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
export function showShareModal({ blob, dataUrl, galleryName, shareUrl }: {
  blob?: Blob | null; dataUrl?: string; galleryName?: string; shareUrl?: string;
} = {}) {
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
export function setTourHandlers({ onPrev, onNext, onExit, onToggleAuto }: {
  onPrev?: () => void; onNext?: () => void; onExit?: () => void; onToggleAuto?: () => void;
} = {}) {
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
export function setGuestbookStats(text: string) {
  const line = document.getElementById('lu-gbook-stats');
  if (line) line.textContent = text || '';
}

export function initGuestbook({ onSubmit }: { onSubmit?: (text: string) => void } = {}) {
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
export function setGuestbookNotes(notes: any) {
  pendingGuestbookNotes = Array.isArray(notes) ? notes : [];
  if (!els) return; // initUI() 호출 시 pendingGuestbookNotes가 적용됨
  renderGuestbookNotes(pendingGuestbookNotes);
}
