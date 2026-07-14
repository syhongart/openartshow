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
  CHIBI_BOTTOM_TYPES,
  CHIBI_ACCESSORIES,
  CHIBI_FACE_SHAPES,
  CHIBI_SPECIES,
  CHIBI_GENDERS,
  CHIBI_TOP_PATTERNS,
  CHIBI_OUTFITS,
  CHIBI_PRESETS,
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

const GOLD = '#5f9e7d'; // 브랜드 액센트 — 청자(비취) 그린 (2026-07-12 감독 결정, 구 골드)
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
// CSS 주입
// ---------------------------------------------------------------------------
function injectStyles() {
  const css = `
/* 폰트(@font-face·스택)는 SSOT인 vendor/fonts/fonts.css가 담당 — index.html <head>에서
   정적 <link>로 로드된다. 여기선 그 단일 스택(--app-font)만 --lu-font로 잇는다. */
:root {
  --lu-gold: ${GOLD};
  --lu-ink: #17140f;
  /* Gilded Frame HUD 토큰 — 챔퍼 2단계 + 모션 (게임 HUD 디자인 감사 v1.0) */
  --lu-ch-s: 7px;
  --lu-ch-l: 14px;
  --lu-spring: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  --lu-slide: 0.36s cubic-bezier(0.22, 1, 0.36, 1);
  --lu-font: var(--app-font);
}
/* 실루엣 — 라운드 2단계 (챔퍼 컷은 clip-path가 보더를 대각선에서 끊어
   모서리가 덜 만든 것처럼 보였음 — 감독 피드백으로 라운드 회귀) */
.lu-cut-s { border-radius: 10px; }
.lu-cut-l { border-radius: 16px; }

/* 포테이토 모드(소프트웨어 렌더링 감지) — 하드웨어 가속이 꺼진 환경에서는
   컴포지터도 CPU라 backdrop-filter가 매 프레임 CPU 블러가 된다. 전부 해제하고
   불투명도를 올려 가독성을 유지한다. */
.lu-potato #lu-dock .lu-dock-btn, .lu-potato #lu-controls,
.lu-potato #lu-topbar, .lu-potato #lu-status, .lu-potato #lu-topright .lu-stat,
.lu-potato #lu-controls-toggle, .lu-potato #lu-more-sheet, .lu-potato .lu-chat-msg,
.lu-potato #lu-gbtab {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
.lu-potato #lu-topbar, .lu-potato .lu-dock-btn, .lu-potato #lu-controls-toggle,
.lu-potato #lu-status, .lu-potato #lu-topright .lu-stat {
  background: rgba(23,20,15,0.88);
}

.lu * { box-sizing: border-box; margin: 0; padding: 0; }

.lu {
  font-family: var(--lu-font);
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
  color: #fff;
  user-select: none;
}

/* ------------------------------ 로딩 오버레이 ------------------------------ */
#lu-loading {
  position: fixed; inset: 0; z-index: 1000;
  background: #000;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 28px;
  transition: opacity 0.5s ease;
}
#lu-loading.lu-hidden { opacity: 0; pointer-events: none; }
.lu-spinner {
  width: 44px; height: 44px;
  border: 1px solid rgba(255,255,255,0.15);
  border-top-color: var(--lu-gold);
  border-radius: 50%;
  animation: lu-spin 0.9s linear infinite;
}
@keyframes lu-spin { to { transform: rotate(360deg); } }
.lu-loading-text {
  font-size: 13px; letter-spacing: 0.5em; text-indent: 0.5em;
  color: rgba(255,255,255,0.75);
  animation: lu-pulse 1.8s ease-in-out infinite;
}
@keyframes lu-pulse { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }

/* ------------------------------ 로비 오버레이 ------------------------------ */
#lu-lobby {
  position: fixed; inset: 0; z-index: 900;
  background: rgba(8,8,10,0.72);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  transition: opacity 0.6s ease;
}
#lu-lobby.lu-hidden { opacity: 0; pointer-events: none; }
.lu-lobby-card {
  width: 100%; max-width: 400px;
  background: rgba(255,255,255,0.97);
  color: #111;
  padding: 44px 36px 36px;
  box-shadow: 0 30px 80px rgba(0,0,0,0.5);
  text-align: center;
}
.lu-lobby-title {
  font-size: 24px; font-weight: 300;
  letter-spacing: 0.32em; text-indent: 0.32em;
  color: #111;
}
.lu-lobby-sub {
  margin-top: 10px;
  font-size: 11px; letter-spacing: 0.18em; text-indent: 0.18em;
  color: #999;
}
.lu-lobby-rule {
  width: 36px; height: 1px; background: var(--lu-gold);
  margin: 22px auto;
}
.lu-field-label {
  display: block; text-align: left;
  font-size: 11px; letter-spacing: 0.12em;
  color: #666; margin: 0 0 8px 2px;
}
#lu-nickname {
  width: 100%;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 15px; color: #111;
  background: transparent;
  border: none; border-bottom: 1px solid #ccc;
  padding: 8px 2px; outline: none;
  transition: border-color 0.25s ease;
  border-radius: 0;
}
#lu-nickname:focus { border-bottom-color: var(--lu-gold); }
.lu-field-hint {
  text-align: left; font-size: 10px; color: #aaa;
  margin: 6px 0 0 2px;
}
.lu-swatches {
  display: flex; flex-wrap: wrap;
  gap: 12px; margin-top: 4px;
}
.lu-swatch {
  width: 32px; height: 32px; border-radius: 50%;
  border: none; cursor: pointer; padding: 0;
  /* 캔디 페블 입체감 — 상단 하이라이트 + 하단 음영 베벨, 그 위에 근접 드롭섀도 */
  box-shadow:
    inset 0 0 0 1px rgba(47,35,19,0.16),
    inset 0 2px 3px rgba(255,255,255,0.5),
    inset 0 -3px 4px rgba(40,30,10,0.14),
    0 2px 3px rgba(40,30,10,0.18);
  transform: scale(1);
  transition: box-shadow 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.lu-swatch:hover { transform: scale(1.16); box-shadow: inset 0 0 0 1px rgba(47,35,19,0.16), inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -3px 4px rgba(40,30,10,0.14), 0 4px 8px rgba(40,30,10,0.24); }
.lu-swatch:active { transform: scale(0.94); }
.lu-swatch.lu-selected {
  box-shadow:
    inset 0 0 0 1px rgba(47,35,19,0.16), inset 0 2px 3px rgba(255,255,255,0.5),
    0 0 0 2px #fff, 0 0 0 4px var(--am-leaf-dark, var(--lu-gold)), 0 4px 8px rgba(40,30,10,0.28);
  animation: lu-swatchpop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes lu-swatchpop {
  0% { transform: scale(0.75); }
  60% { transform: scale(1.24); }
  100% { transform: scale(1.16); }
}
@media (prefers-reduced-motion: reduce) {
  .lu-swatch, .lu-swatch:hover, .lu-swatch.lu-selected { transition: none; animation: none; }
}
.lu-chars {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 8px; margin-top: 4px;
}
.lu-char-btn {
  font-family: var(--lu-font); font-weight: 500;
  font-size: 12.5px; letter-spacing: 0.03em;
  color: #4a453c; background: #fffdf9;
  border: 1px solid #e6dfcf; border-radius: 12px;
  padding: 10px 15px; cursor: pointer;
  box-shadow: 0 2px 8px rgba(23,20,15,0.04);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}
.lu-char-btn:hover { transform: translateY(-1px); }
.lu-char-btn:hover { border-color: rgba(0,0,0,0.25); }
.lu-char-btn.lu-selected {
  border-color: var(--lu-gold);
  color: #111;
  background: #f6f3ea;
}

/* ------------------------------ 커스텀 아바타 버튼 ------------------------------ */
.lu-char-custom {
  position: relative;
  background-size: cover; background-position: center 18%;
}
.lu-char-custom.lu-has-thumb {
  color: #fff; border-color: #ddd;
  text-shadow: 0 1px 4px rgba(0,0,0,0.75);
}
.lu-char-edit-link {
  display: block;
  margin: 6px auto 0;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 10px; letter-spacing: 0.05em; color: #999;
  background: transparent; border: none; cursor: pointer;
  padding: 2px 4px; text-align: center;
  transition: color 0.2s ease;
}
.lu-char-edit-link:hover { color: var(--lu-gold); }

/* 로비 "캐릭터 디자인" 메뉴 버튼 — 입장 폼과 분리된, 명확히 라벨된 진입점 */
.lu-char-design-btn {
  display: flex; align-items: center; gap: 12px; width: 100%;
  margin-top: 8px; padding: 12px 14px;
  background: #fff; border: 1px solid #e4e0d6; border-radius: 14px;
  cursor: pointer; text-align: left; font-family: var(--lu-font);
  transition: border-color 0.18s ease, transform 0.1s ease, box-shadow 0.18s ease;
}
.lu-char-design-btn:hover { border-color: var(--lu-gold); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(20,38,29,0.06); }
.lu-char-design-btn:focus-visible { outline: 2px solid var(--lu-gold); outline-offset: 2px; }
.lu-char-design-media {
  flex: 0 0 auto; width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
  background: #f4f1e8 center/cover no-repeat; border: 1px solid #e4e0d6;
}
.lu-char-design-media.lu-has-thumb { background-color: #f6f1e3; }
.lu-char-design-txt { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.lu-char-design-txt b { font-size: 14px; font-weight: 700; color: var(--lu-ink, #17140f); }
.lu-char-design-txt span { font-size: 11.5px; color: #8a8577; }
.lu-char-design-arrow { flex: 0 0 auto; font-size: 20px; color: #bdb8a8; }

/* -------------------------- 아바타 커스터마이저 모달 -------------------------- */
/* 자연/크래프트 톤 재스킨(2026-07 감독 지시, 2026-07-14 고급감 리파인) — 카테고리
   탭·프리뷰 무대·프리셋/옷장 카드·원형 스와치 구조는 유지, 비주얼만 자연 감성으로.
   잎사귀·접힌 종이·나무결 모티프는 전부 오리지널 SVG/CSS — 특정 브랜드 아이콘·
   마크·서체·캐릭터 미사용, 특정 게임 카피 아님. 팔레트는 브랜드 그린 램프
   (scripts/build-*.mjs g100~g900)를 기반으로 샌디 크림·우드 브라운을 더해
   "볕 좋은 공방 오후" 톤으로 정합. */
#lu-chibi-maker {
  --am-cream: #fff8e8;
  --am-cream-2: #fbe8bb;
  --am-ink: #2f2313;
  --am-ink-body: #6b5636;
  --am-ink-dim: #a68f68;
  --am-line: #e8cf9c;
  --am-g100: #dcf0dc;
  --am-leaf: #8fd0ab;
  --am-leaf-dark: #4e8a6a;
  --am-wood: #d3a765;
  --am-wood-dark: #a97c42;
  /* 종이 그레인 — 자체 SVG feTurbulence(중회색 스펙클, 저알파) data-URI, 외부 요청 0.
     소스오버 합성이라 밝은 면 위에선 살짝 어둡게, 어두운 면 위에선 살짝 밝게 읽혀
     어느 톤이든 결이 보인다(카드·프레임·오버레이 공용). */
  --am-grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.14 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
  /* 우드 프레임 전용 — 배경이 더 진하고 채도가 높아 은은한 결이 묻히므로 살짝 더 진한 그레인 */
  --am-grain-wood: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.2 0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
}
#lu-avatar-maker, #lu-chibi-maker {
  position: fixed; inset: 0; z-index: 985;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
}
#lu-avatar-maker { background: rgba(20,16,9,0.76); }
#lu-chibi-maker {
  /* 다층 깊이감 — 은은한 상단 광원 + 종이 그레인을 어둑한 스크림 위에 얹어
     배경 자체가 평면 단색이 아니라 하나의 무대처럼 읽히게 한다. */
  background-image: var(--am-grain), radial-gradient(120% 90% at 50% 6%, rgba(74,58,30,0.22), rgba(32,26,12,0) 55%);
  background-repeat: repeat, no-repeat;
  background-color: rgba(20,16,9,0.76);
}
#lu-avatar-maker.lu-open, #lu-chibi-maker.lu-open { opacity: 1; pointer-events: auto; }
.lu-am-card {
  width: 100%; max-width: 860px; max-height: 92vh;
  background-image: var(--am-grain), linear-gradient(165deg, var(--am-cream) 0%, #fffaee 40%, var(--am-cream-2) 100%);
  background-repeat: repeat, no-repeat;
  color: var(--am-ink);
  border-radius: 30px;
  border: 3px solid rgba(211,167,101,0.5);
  /* 근접 접지 그림자 + 원거리 앰비언트 그림자를 겹쳐 카드가 배경 위에 실제로
     "떠 있는" 다층 깊이감을 낸다(평면 단일 그림자 금지). */
  box-shadow:
    0 1px 0 rgba(255,255,255,0.7) inset,
    0 2px 4px rgba(40,30,10,0.16),
    0 10px 20px rgba(40,30,10,0.18),
    0 32px 64px rgba(40,30,10,0.32),
    0 72px 120px rgba(20,15,6,0.28);
  display: flex; flex-direction: column;
  overflow: hidden;
  transform: scale(0.96) translateY(6px); opacity: 0;
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}
#lu-avatar-maker.lu-open .lu-am-card, #lu-chibi-maker.lu-open .lu-am-card { transform: scale(1) translateY(0); opacity: 1; }
.lu-am-head {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0));
  border-bottom: 2px solid var(--am-line);
  box-shadow: 0 1px 0 rgba(255,255,255,0.5);
}
.lu-am-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--am-ink);
}
.lu-am-title-icon {
  display: flex; width: 24px; height: 24px; flex: 0 0 auto;
  color: var(--am-leaf-dark);
  filter: drop-shadow(0 1px 0 rgba(255,255,255,0.55)) drop-shadow(0 2px 3px rgba(78,138,106,0.22));
}
.lu-am-title-icon svg { width: 100%; height: 100%; }
#lu-am-close {
  flex: 0 0 auto;
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: var(--am-cream-2);
  border: 2px solid var(--am-wood);
  border-radius: 50%;
  color: var(--am-wood-dark); font-size: 17px; font-weight: 400; line-height: 1;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 3px 0 rgba(169,124,66,0.45), 0 6px 12px rgba(40,30,10,0.2);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
#lu-am-close:hover { border-color: var(--am-leaf-dark); color: #fff; background: var(--lu-gold); transform: translateY(1px) rotate(90deg); box-shadow: 0 2px 0 rgba(78,138,106,0.5), 0 4px 8px rgba(40,30,10,0.18); }
#lu-am-close:active { transform: translateY(3px) rotate(90deg); box-shadow: none; }
.lu-am-body {
  flex: 1 1 auto; min-height: 0;
  display: flex; gap: 24px;
  padding: 24px;
  overflow: hidden;
}
/* ---- 프리뷰 무대 — 300×400 백킹 해상도(ensurePreviewRenderer)는 불변, 바깥 프레임만 장식 ----
   바깥 padding 링을 우드 톤 다층 그라디언트 + 결 스트라이프로 채워 "액자" 느낌을 낸다. */
.lu-am-preview {
  flex: 0 0 auto;
  align-self: flex-start;   /* 긴 탭에서 프레임이 패널 높이만큼 늘어나 아래 빈 나무 슬래브가 생기지 않게 — 스테이지에 맞춰 감싼다 */
  width: 320px;
  padding: 16px 16px 40px;
  border-radius: 26px;
  position: relative;
  touch-action: none;
  background-image:
    var(--am-grain-wood),
    repeating-linear-gradient(4deg, rgba(255,244,220,0.14) 0 2px, rgba(94,61,20,0.06) 2px 4px, transparent 4px 8px),
    linear-gradient(155deg, #eecb92 0%, var(--am-wood) 48%, var(--am-wood-dark) 130%);
  background-repeat: repeat, repeat, no-repeat;
  border: 3px solid var(--am-wood-dark);
  box-shadow:
    inset 0 0 0 1px rgba(255,244,220,0.35),
    inset 0 3px 4px rgba(255,244,220,0.4),
    inset 0 -5px 10px rgba(58,38,10,0.32),
    0 2px 4px rgba(40,30,10,0.14),
    0 16px 30px rgba(40,30,10,0.2),
    0 36px 64px rgba(40,30,10,0.18);
}
.lu-am-stage {
  width: 100%; aspect-ratio: 3 / 4;
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: #f6f1e3;
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.6), inset 0 0 0 3px rgba(211,167,101,0.3), inset 0 2px 10px rgba(40,30,10,0.12);
}
.lu-am-stage canvas { display: block; width: 100%; height: 100%; cursor: grab; }
.lu-am-preview.lu-dragging .lu-am-stage canvas { cursor: grabbing; }
/* 부드러운 비네트 + 접지 그림자 + 은은한 종이 결 — canvas가 불투명(scene.background)이라
   위에 멀티플라이로 얹는다 */
.lu-am-stage::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image: var(--am-grain), radial-gradient(120% 100% at 50% 24%, rgba(255,247,222,0) 48%, rgba(70,50,20,0.2) 100%);
  background-repeat: repeat, no-repeat;
  mix-blend-mode: multiply;
}
.lu-am-stage::after {
  content: ''; position: absolute; left: 50%; bottom: 7%;
  width: 58%; height: 8%;
  transform: translateX(-50%);
  border-radius: 50%; pointer-events: none;
  background: radial-gradient(closest-side, rgba(58,42,16,0.44), rgba(58,42,16,0) 72%);
  mix-blend-mode: multiply;
  filter: blur(1.5px);
}
.lu-am-preview-hint {
  position: absolute; left: 50%; bottom: 10px;
  transform: translateX(-50%);
  display: flex; align-items: center; gap: 5px;
  padding: 5px 13px;
  border-radius: 999px;
  background: rgba(37,27,14,0.68);
  color: #fff8e8;
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.04em; white-space: nowrap;
  box-shadow: 0 3px 8px rgba(20,14,6,0.3);
  pointer-events: none;
}
.lu-am-preview-hint svg { width: 11px; height: 11px; flex: 0 0 auto; }
/* ---- 카테고리 내비 — 종족·얼굴·헤어·의상·장식·옷장 섹션 전환 ---- */
.lu-am-panel {
  flex: 1 1 auto; min-width: 0; min-height: 0;
  display: flex; flex-direction: column;
}
.lu-am-nav {
  flex: 0 0 auto;
  display: flex; gap: 8px;
  padding-bottom: 12px; margin-bottom: 16px;
  border-bottom: 2px dashed var(--am-line);
  overflow-x: auto;
  scrollbar-width: none;
}
.lu-am-nav::-webkit-scrollbar { display: none; }
.lu-am-navtab {
  flex: 0 0 auto;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  min-width: 58px;
  font-family: var(--lu-font); font-weight: 700;
  font-size: 10.5px; letter-spacing: 0.01em;
  color: var(--am-ink-dim); background: #fff;
  border: 2px solid transparent; border-radius: 18px;
  padding: 8px 12px 7px; cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
}
.lu-am-navtab svg { width: 19px; height: 19px; }
.lu-am-navtab:hover { color: var(--am-ink); background: var(--am-cream-2); transform: translateY(-1px); }
.lu-am-navtab:active { transform: scale(0.94); }
/* 선택 탭 — 통통하게 떠오른 raised pill + 재렌더마다 살짝 튀는 마이크로 팝
   (매 렌더 시 새 DOM 노드로 재생성되므로 애니메이션이 자연히 재생된다) */
.lu-am-navtab.lu-selected {
  color: var(--am-ink); background: var(--am-g100);
  border-color: var(--am-leaf);
  border-radius: 22px 26px 24px 28px;
  box-shadow: 0 3px 0 rgba(78,138,106,0.35), 0 8px 14px rgba(78,138,106,0.18), inset 0 0 0 1px rgba(255,255,255,0.6);
  animation: lu-navpop 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.lu-am-navtab.lu-selected svg { color: var(--am-leaf-dark); }
@keyframes lu-navpop {
  0% { transform: translateY(0) scale(0.84); }
  55% { transform: translateY(-4px) scale(1.06); }
  100% { transform: translateY(-2px) scale(1); }
}
.lu-am-tabs {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.lu-am-tab {
  font-family: var(--lu-font); font-weight: 600;
  font-size: 12px; letter-spacing: 0.01em;
  color: var(--am-ink-body); background: #fffdf6;
  border: 2px solid var(--am-line); border-radius: 16px;
  padding: 8px 16px; cursor: pointer;
  box-shadow: 0 2px 0 rgba(232,207,156,0.7);
  transition: border-color 0.16s ease, color 0.16s ease, background 0.16s ease, transform 0.1s ease, box-shadow 0.16s ease;
}
.lu-am-tab:hover { border-color: var(--am-leaf); color: var(--am-ink); background: var(--am-cream-2); transform: translateY(-1px); }
.lu-am-tab:active { transform: translateY(1px) scale(0.98); box-shadow: none; }
.lu-am-tab.lu-selected {
  border-color: var(--am-leaf-dark); color: var(--am-ink); background: var(--am-g100);
  font-weight: 800;
  box-shadow: 0 2px 0 rgba(78,138,106,0.4), 0 5px 10px rgba(78,138,106,0.16), inset 0 0 0 1px rgba(143,208,171,0.5);
  animation: lu-chippop 0.26s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes lu-chippop {
  0% { transform: scale(0.88); }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
/* 프리셋 카드 — 스킨/포인트 색 미리보기 도트가 붙은 쇼케이스 칩 */
.lu-am-presets { gap: 10px; }
.lu-am-presets .lu-am-tab { display: flex; align-items: center; gap: 9px; padding: 6px 16px 6px 6px; }
.lu-am-preset-dot {
  width: 22px; height: 22px; border-radius: 50%; flex: 0 0 auto;
  box-shadow:
    inset 0 0 0 1px rgba(47,35,19,0.18),
    inset 0 2px 3px rgba(255,255,255,0.55),
    inset 0 -3px 4px rgba(40,30,10,0.16),
    0 2px 3px rgba(40,30,10,0.2);
}
.lu-am-tabpage {
  flex: 1 1 auto; min-height: 0;
  overflow-y: auto;
  padding: 2px 4px 6px 2px;
}
.lu-am-tabpage::-webkit-scrollbar { width: 7px; }
.lu-am-tabpage::-webkit-scrollbar-thumb { background: var(--am-line); border-radius: 8px; }
.lu-am-group-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--am-leaf-dark);
  margin: 0 0 16px;
}
.lu-am-group-icon { display: flex; width: 14px; height: 14px; flex: 0 0 auto; }
.lu-am-group-icon svg { width: 100%; height: 100%; }
.lu-am-section-title {
  font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: var(--am-ink-dim);
  margin: 16px 0 8px;
}
/* 내 옷장 (로그인 전용) */
.lu-closet-save {
  width: 100%; margin: 2px 0 16px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  border: 2px dashed var(--am-leaf-dark); background: rgba(143,208,171,0.14);
  color: var(--am-leaf-dark); font-weight: 800; border-radius: 18px;
  padding: 12px 16px;
}
.lu-closet-save:hover { background: rgba(143,208,171,0.26); border-color: var(--am-leaf-dark); }
.lu-closet-empty { font-size: 12px; color: var(--am-ink-dim); padding: 6px 2px 10px; }
.lu-closet-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 12px;
}
.lu-closet-cell { position: relative; }
.lu-closet-load {
  width: 100%; aspect-ratio: 3 / 4;
  border: 2px solid var(--am-line); border-radius: 16px;
  background-color: var(--am-cream-2); background-size: cover; background-position: center;
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0; overflow: hidden; cursor: pointer; position: relative;
  box-shadow: 0 2px 0 rgba(232,207,156,0.6), 0 5px 12px rgba(40,30,10,0.1);
  transition: border-color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
}
/* 접힌 종이 모서리 — 카탈로그 카드 느낌(오리지널 CSS 그라디언트 폴드, 특정 게임 UI 카피 아님) */
.lu-closet-load::before {
  content: ''; position: absolute; top: 0; right: 0; z-index: 2;
  width: 20px; height: 20px;
  background: linear-gradient(135deg, #fffefa 0%, #fffefa 48%, #ecdcac 52%, #cdb787 100%);
  clip-path: polygon(100% 0, 0 0, 100% 100%);
  filter: drop-shadow(-1.5px 1.5px 1.5px rgba(40,30,10,0.22));
}
.lu-closet-load:hover { border-color: var(--am-leaf); transform: translateY(-3px); box-shadow: 0 4px 0 rgba(232,207,156,0.6), 0 14px 26px rgba(40,30,10,0.2); }
.lu-closet-name {
  width: 100%; font-size: 10px; font-weight: 700; color: #fff;
  padding: 8px 4px 5px; text-align: center;
  background: linear-gradient(to top, rgba(40,30,10,0.66), rgba(40,30,10,0));
  letter-spacing: 0.02em;
}
.lu-closet-del {
  position: absolute; top: -8px; right: -8px; z-index: 3;
  width: 24px; height: 24px; line-height: 21px; padding: 0;
  border-radius: 50%; border: 2px solid #fff; background: #e8735c;
  color: #fff; font-size: 14px; cursor: pointer;
  box-shadow: 0 2px 0 rgba(160,60,40,0.4), 0 3px 6px rgba(40,30,10,0.2);
  transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
.lu-closet-del:hover { background: #d85f47; transform: scale(1.08); }
.lu-closet-del:active { transform: translateY(1px) scale(1.02); box-shadow: 0 1px 0 rgba(160,60,40,0.4); }
.lu-am-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  gap: 8px;
}
.lu-am-thumb {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: #fffdf6; border: 2px solid var(--am-line); border-radius: 14px;
  padding: 6px 4px 7px; cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.lu-am-thumb:hover { border-color: var(--am-leaf); }
.lu-am-thumb.lu-selected { border-color: var(--am-leaf-dark); background: var(--am-g100); }
.lu-am-thumb img {
  width: 48px; height: 48px; object-fit: contain;
  background: #fff; border: 1px solid var(--am-line);
}
.lu-am-thumb-none {
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: #fff; border: 1px solid var(--am-line);
  font-size: 10px; color: var(--am-ink-dim); letter-spacing: 0.02em;
}
.lu-am-thumb-label {
  font-size: 9px; letter-spacing: 0.01em; color: var(--am-ink-dim);
  text-align: center;
  max-width: 62px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lu-am-cute-row { margin-top: 4px; }
.lu-am-cute-label {
  display: flex; justify-content: space-between;
  font-size: 11px; color: var(--am-ink-body); margin-bottom: 8px;
}
.lu-am-cute-label b { color: var(--am-leaf-dark); font-weight: 700; }
#lu-am-cute { width: 100%; accent-color: var(--lu-gold); }
.lu-am-footer {
  flex: 0 0 auto;
  display: flex; flex-direction: column; gap: 12px;
  padding: 16px 24px 20px;
  border-top: 2px solid var(--am-line);
  background: linear-gradient(0deg, rgba(255,255,255,0.5), rgba(255,255,255,0));
}
.lu-am-footer-btns { display: flex; gap: 10px; justify-content: flex-end; align-items: center; }
/* 회원가입 게이트 — 게스트에게만 노출(저장하려면 회원가입) */
.lu-am-guest-gate {
  display: flex; flex-direction: column; gap: 8px;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(191,161,74,0.06); border: 1px solid rgba(191,161,74,0.28);
}
.lu-am-gate-note { font-size: 12px; line-height: 1.55; color: var(--am-ink-body); word-break: keep-all; }
.lu-am-signup-providers { display: flex; flex-wrap: wrap; gap: 8px; }
.lu-am-social {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  font-family: var(--lu-font); font-weight: 700; font-size: 11.5px;
  color: var(--am-ink-body); background: #fff;
  border: 1px solid var(--am-line); border-radius: 999px; padding: 7px 12px;
  transition: border-color 0.15s ease, transform 0.1s ease;
}
.lu-am-social:hover { border-color: var(--lu-gold); transform: translateY(-1px); }
.lu-am-social:disabled { opacity: 0.55; cursor: default; }
.lu-am-social .lu-social-badge {
  width: 16px; height: 16px; border-radius: 50%; font-size: 10px; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
  background: #f0ece0; color: #6b6459;
}
.lu-am-btn {
  font-family: var(--lu-font); font-weight: 700;
  font-size: 12.5px; letter-spacing: 0.02em;
  color: var(--am-ink-body); background: #fffdf6;
  border: 2px solid var(--am-line); border-radius: 999px;
  padding: 12px 20px; cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 0 rgba(232,207,156,0.7), 0 6px 12px rgba(40,30,10,0.08);
  transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease, transform 0.12s ease, box-shadow 0.15s ease;
}
.lu-am-btn:hover { border-color: var(--am-leaf); color: var(--am-ink); transform: translateY(-1px); }
.lu-am-btn:active { transform: translateY(2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 0 rgba(232,207,156,0.7); }
/* 저장 CTA — 캔디 셸 상단 하이라이트("립") + 하단 음영으로 통통한 눌림감을 강조 */
.lu-am-btn-primary {
  color: #fff; background: linear-gradient(180deg, #8fd0ab, var(--lu-gold) 60%, #4e8a6a);
  border-color: #3f7a5c;
  font-weight: 800;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -10px 14px rgba(37,74,55,0.3), 0 4px 0 #3f7a5c, 0 10px 22px rgba(78,138,106,0.4);
}
.lu-am-btn-primary:hover { background: linear-gradient(180deg, #a0dab9, #6bab86 60%, #4e8a6a); transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -10px 14px rgba(37,74,55,0.32), 0 5px 0 #3f7a5c, 0 12px 26px rgba(78,138,106,0.44); }
.lu-am-btn-primary:active { transform: translateY(3px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 0 #3f7a5c, 0 3px 8px rgba(78,138,106,0.3); }
#lu-chibi-maker button:focus-visible {
  outline: 2px solid var(--am-leaf-dark); outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  #lu-avatar-maker, #lu-chibi-maker, .lu-am-card, #lu-am-close, .lu-am-navtab, .lu-am-tab, .lu-am-btn, .lu-closet-load, .lu-closet-del,
  .lu-am-navtab.lu-selected, .lu-am-tab.lu-selected {
    transition: none !important;
    animation: none !important;
  }
}

#lu-enter-btn {
  width: 100%; margin-top: 30px;
  font-family: var(--lu-font); font-weight: 600;
  font-size: 14px; letter-spacing: 0.24em; text-indent: 0.24em;
  color: #17140f; background: var(--lu-gold);
  border: 1px solid var(--lu-gold); border-radius: 999px;
  padding: 15px 0; cursor: pointer;
  box-shadow: 0 6px 20px rgba(95,158,125,0.35);
  transition: transform 0.15s ease, box-shadow 0.25s ease;
}
#lu-enter-btn:hover { transform: translateY(-1px); box-shadow: 0 9px 26px rgba(95,158,125,0.45); }

/* ------------------------------ 전시 선택 ------------------------------ */
.lu-picker-note {
  text-align: left;
  font-size: 11px; letter-spacing: 0.04em;
  color: var(--lu-gold);
  margin: 0 0 10px 2px;
}
.lu-picker-list {
  display: flex; flex-direction: column; gap: 6px;
}
.lu-picker-item {
  display: block; width: 100%; text-align: left;
  font-family: var(--lu-font); font-weight: 300;
  background: #fafafa; border: 1px solid #eee; border-left: 2px solid transparent;
  padding: 10px 14px; cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.lu-picker-item:hover:not(:disabled) { background: #f2f2f0; border-left-color: var(--lu-gold); }
.lu-picker-item:disabled { cursor: default; }
.lu-picker-item.lu-picker-current {
  background: #f6f3ea; border-left-color: var(--lu-gold);
}
.lu-picker-name { font-size: 13px; color: #111; }
.lu-picker-meta { font-size: 10px; letter-spacing: 0.06em; color: #999; margin-top: 3px; }

.lu-lobby-divider { width: 100%; height: 1px; background: #eee; margin: 26px 0 18px; }
.lu-studio-link {
  display: inline-block;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 11px; letter-spacing: 0.1em; color: #999;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.lu-studio-link:hover { color: var(--lu-gold); border-bottom-color: var(--lu-gold); }

/* ------------------------------ 소셜 로그인 ------------------------------ */
#lu-auth { margin: 26px 0 6px; }
.lu-social-wrap { display: flex; flex-direction: column; gap: 9px; }
.lu-social-btn {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 11px 16px;
  background: transparent;
  border: 1px solid rgba(0,0,0,0.18);
  border-radius: 3px;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 13px; letter-spacing: 0.02em;
  color: #222;
  cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, opacity 0.25s ease;
}
.lu-social-btn:hover { border-color: rgba(0,0,0,0.45); }
.lu-social-btn:disabled { opacity: 0.55; cursor: default; }
.lu-social-busy { background: rgba(0,0,0,0.03); }
.lu-social-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px;
  border-radius: 50%;
  font-size: 11px; font-weight: 500;
  flex: 0 0 auto;
}
.lu-social-google .lu-social-badge { background: #fff; border: 1px solid #dadce0; color: #4285f4; }
.lu-social-kakao .lu-social-badge { background: #fee500; color: #191919; }
.lu-social-kakao { background: rgba(254,229,0,0.12); border-color: rgba(210,190,0,0.45); }
.lu-social-kakao:hover { background: rgba(254,229,0,0.22); }
.lu-social-naver .lu-social-badge { background: #03c75a; color: #fff; }
.lu-social-naver { background: rgba(3,199,90,0.07); border-color: rgba(3,150,70,0.35); }
.lu-social-naver:hover { background: rgba(3,199,90,0.14); }
.lu-social-note {
  margin-top: 2px;
  font-size: 10px; letter-spacing: 0.03em;
  color: #b0aca4;
  text-align: center;
}

.lu-logged-chip {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(0,0,0,0.14);
  border-left: 2px solid var(--lu-gold);
  border-radius: 3px;
  background: rgba(0,0,0,0.025);
}
.lu-logged-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: #1a1a1c; color: var(--lu-gold);
  font-size: 13px; font-weight: 400;
  flex: 0 0 auto;
}
.lu-logged-name { font-size: 13px; color: #1a1a1a; }
.lu-logged-via {
  font-size: 10px; color: #999;
  border: 1px solid #ddd; border-radius: 50%;
  width: 17px; height: 17px;
  display: inline-flex; align-items: center; justify-content: center;
}
.lu-logout-btn {
  margin-left: auto;
  background: transparent; border: none;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 11px; letter-spacing: 0.04em;
  color: #999; cursor: pointer;
  transition: color 0.25s ease;
}
.lu-logout-btn:hover { color: var(--lu-gold); }

.lu-auth-or {
  display: flex; align-items: center; gap: 12px;
  margin: 18px 0 4px;
}
.lu-auth-or::before, .lu-auth-or::after {
  content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.1);
}
.lu-auth-or span {
  font-size: 10px; letter-spacing: 0.12em;
  color: #b0aca4;
}

/* --------------------------------- HUD --------------------------------- */
.lu-hud {
  position: fixed; z-index: 500;
  opacity: 0; visibility: hidden; pointer-events: none;
  transition: opacity 0.6s ease, visibility 0.6s;
}
.lu-hud.lu-visible { opacity: 1; visibility: visible; }
/* [P0] 인터랙티브 HUD는 가시화와 함께 터치도 복구 (감사 발견 버그) */
#lu-dock.lu-visible, #lu-controls-toggle.lu-visible { pointer-events: auto; }
/* (작품 카드의 터치 기기 배치는 작품 패널 베이스 CSS 뒤에서 재정의 — 캐스케이드 순서) */

#lu-controls {
  top: calc(16px + env(safe-area-inset-top, 0px));
  left: max(16px, env(safe-area-inset-left, 0px));
  background: rgba(23,20,15,0.82);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  padding: 14px 18px;
  border: 1px solid rgba(253,251,245,0.16);
  border-left: 3px solid var(--lu-gold);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  font-size: 12px; font-weight: 500; line-height: 1.9;
  color: rgba(253,251,245,0.88);
}
#lu-controls .lu-key {
  display: inline-block; min-width: 72px;
  color: var(--lu-gold); letter-spacing: 0.06em;
}
#lu-controls .lu-controls-title {
  font-size: 10px; letter-spacing: 0.24em;
  color: rgba(255,255,255,0.5);
  margin-bottom: 6px;
}

#lu-topright {
  top: calc(16px + env(safe-area-inset-top, 0px));
  right: max(16px, env(safe-area-inset-right, 0px));
  display: flex; flex-direction: column; align-items: flex-end;
  gap: 6px;
  font-size: 12px; letter-spacing: 0.08em;
  text-align: right;
}
#lu-topright .lu-stat {
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  padding: 6px 12px;
  font-weight: 500;
  color: rgba(253,251,245,0.85);
}
#lu-topright .lu-stat b {
  font-weight: 600; font-variant-numeric: tabular-nums; color: #8fd0ab;
}
/* 성능 지표는 디버그 정보 — 터치 기기 1차 HUD에서 제외 (게임 HUD 감사) */
@media (pointer: coarse) { #lu-topright { display: none; } }

/* 상단 통합 바 — 전시명 + 라이브 접속자 (Gilded Frame 유리 칩) */
#lu-topbar {
  border-radius: 17px;
  top: calc(10px + env(safe-area-inset-top, 0px));
  left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px;
  height: 34px; padding: 0 16px;
  max-width: min(78vw, 480px);
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
}
#lu-topbar.lu-empty { opacity: 0 !important; }
.lu-topbar-title {
  font-size: 11px; font-weight: 500;
  letter-spacing: 0.28em; text-indent: 0.28em;
  color: rgba(253,251,245,0.85);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lu-topbar-sep { width: 1px; height: 12px; background: rgba(253,251,245,0.2); flex: none; }
.lu-topbar-count {
  display: flex; align-items: center; gap: 5px; flex: none;
  font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums;
  color: #8fd0ab;
}
.lu-topbar-count::before {
  content: ''; width: 5px; height: 5px; border-radius: 50%;
  background: #7ec97e; box-shadow: 0 0 6px rgba(126,201,126,0.8);
}
.lu-topbar-count b { display: inline-block; font-weight: 600; }
.lu-topbar-count.lu-tick b { animation: lu-count-tick 0.3s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes lu-count-tick { 0% { transform: scale(1.25); } 100% { transform: scale(1); } }

#lu-status {
  /* 하단은 조이스틱·독의 영역 — 토스트는 상단 바 아래로 */
  top: calc(54px + env(safe-area-inset-top, 0px)); left: 50%;
  transform: translateX(-50%);
  max-width: min(80vw, 560px);
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  border-left: 3px solid var(--lu-gold);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  padding: 7px 18px;
  font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
  color: rgba(253,251,245,0.95);
  text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: opacity 0.22s cubic-bezier(0.22,1,0.36,1);
}
#lu-status:empty { opacity: 0; visibility: hidden; }

/* --------------------------------- 채팅 --------------------------------- */
#lu-chat {
  bottom: 16px; left: 16px;
  width: min(340px, calc(100vw - 32px));
  display: flex; flex-direction: column; gap: 8px;
}
/* 터치 기기 기본: 입력창을 접어 하단을 가상 조이스틱 영역으로 비워둔다.
   (실기기 UX 피드백 — 전폭 채팅 입력창이 왼쪽 엄지를 삼켜 키보드가 올라오던 문제) */
#lu-chat.lu-chat-collapsed #lu-chat-input { display: none; }
#lu-chat.lu-chat-collapsed { pointer-events: none; }
#lu-chat-log {
  display: flex; flex-direction: column; gap: 3px;
  max-height: 220px; overflow: hidden;
}
.lu-chat-msg {
  background: rgba(10,10,12,0.5);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  padding: 5px 10px;
  font-size: 12px; line-height: 1.5;
  color: rgba(255,255,255,0.9);
  word-break: break-word;
  animation: lu-chat-in 0.25s ease;
  align-self: flex-start;
  max-width: 100%;
}
@keyframes lu-chat-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.lu-chat-name { font-weight: 400; color: rgba(255,255,255,0.65); margin-right: 6px; }
.lu-chat-msg.lu-self .lu-chat-name { color: var(--lu-gold); }
#lu-chat-input {
  width: 100%;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 13px; color: #fff;
  background: rgba(10,10,12,0.6);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 9px 12px; outline: none;
  opacity: 0.55; pointer-events: auto;
  transition: opacity 0.25s ease, border-color 0.25s ease;
  border-radius: 0;
}
#lu-chat-input::placeholder { color: rgba(255,255,255,0.35); letter-spacing: 0.06em; }
#lu-chat-input:focus { opacity: 1; border-color: var(--lu-gold); }

/* ----------------------------- 작품 정보 패널 ----------------------------- */
#lu-artwork {
  /* 미술관 벽면 캡션 카드 — 크림 종이 + 골드 상단 액센트 */
  position: fixed; z-index: 600;
  top: 50%; right: 16px;
  transform: translate(calc(100% + 40px), -50%);
  width: min(320px, calc(100vw - 28px));
  background: linear-gradient(180deg, #fffdf8 0%, #f8f4ea 100%);
  color: #1c1a16;
  padding: 26px 26px 22px;
  border-radius: 16px;
  border: 1px solid rgba(95,158,125,0.28);
  box-shadow: 0 18px 50px rgba(20,15,8,0.30), 0 2px 8px rgba(20,15,8,0.12);
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}
#lu-artwork::before {
  /* 골드 상단 레일 — 챔퍼 모서리와 정렬되는 좌측 기점 짧은 선 */
  content: '';
  position: absolute; top: 0; left: var(--lu-ch-l, 14px); width: 44px; height: 3px;
  background: linear-gradient(90deg, var(--lu-gold), rgba(95,158,125,0));
}
#lu-artwork.lu-open { transform: translate(0, -50%); }
#lu-artwork .lu-art-eyebrow {
  font-size: 9.5px; letter-spacing: 0.34em;
  color: #3f7a5c; margin-bottom: 10px;
}
#lu-artwork .lu-art-title {
  font-size: 21px; font-weight: 600; line-height: 1.32;
  letter-spacing: -0.01em; color: #17140f;
}
#lu-artwork .lu-art-meta {
  margin-top: 7px;
  font-size: 12px; letter-spacing: 0.05em;
  color: #8a8172;
}
#lu-artwork .lu-art-rule {
  width: 34px; height: 2px; border-radius: 2px;
  background: var(--lu-gold); opacity: 0.65; margin: 16px 0 14px;
}
#lu-artwork .lu-art-desc {
  font-size: 13px; line-height: 1.85; color: #4a453c;
  max-height: 38vh; overflow-y: auto;
}
#lu-artwork .lu-art-hint {
  margin-top: 18px;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; letter-spacing: 0.05em; color: #6b6459;
  font-family: var(--lu-font); font-weight: 500;
  background: rgba(95,158,125,0.10);
  border: 1px solid rgba(95,158,125,0.45); border-radius: 999px;
  cursor: pointer;
  padding: 8px 16px; text-align: center;
  transition: background 0.25s ease, color 0.25s ease;
}
#lu-artwork .lu-art-hint:hover { background: var(--lu-gold); color: #17140f; }
#lu-artwork .lu-art-hint .lu-key {
  display: inline-block;
  min-width: 16px; text-align: center;
  margin-right: 7px;
  padding: 1px 6px;
  border: 1px solid var(--lu-gold);
  color: var(--lu-gold);
  font-size: 10px; letter-spacing: 0.04em;
}
/* 터치 기기: 작품 카드를 하단 좌측 미니 캡션으로 이동 — 시점 드래그 존을
   아예 벗어나므로 pointer-events 핵이 불필요. 카드 전체가 '크게 보기' 탭 타깃. */
@media (pointer: coarse) {
  #lu-artwork {
    top: auto; right: auto;
    left: max(12px, env(safe-area-inset-left, 0px));
    bottom: calc(96px + env(safe-area-inset-bottom, 0px));
    width: min(248px, calc(100vw - 104px)); /* 우측 독 폭 회피 */
    padding: 14px 16px 12px;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(20,15,8,0.35);
    transform: translateY(16px); opacity: 0; pointer-events: none;
    transition: transform var(--lu-slide), opacity 0.25s ease;
  }
  #lu-artwork.lu-open { transform: translateY(0); opacity: 1; pointer-events: auto; }
  #lu-artwork .lu-art-eyebrow { font-size: 9px; letter-spacing: 0.3em; margin-bottom: 6px; }
  #lu-artwork .lu-art-title { font-size: 15px; }
  #lu-artwork .lu-art-meta { font-size: 11px; margin-top: 4px; }
  #lu-artwork .lu-art-rule { margin: 10px 0 0; }
  #lu-artwork .lu-art-desc { display: none; } /* 설명은 라이트박스에서 */
  #lu-artwork .lu-art-hint {
    margin-top: 10px; padding: 6px 12px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
    border-radius: 999px;
  }
}

/* ---------------------- 터치 기기: 조작법 접기 + 액션 독 ---------------------- */
#lu-controls.lu-collapsed { display: none; }
#lu-controls-toggle {
  position: fixed; z-index: 520;
  top: calc(10px + env(safe-area-inset-top, 0px));
  left: max(12px, env(safe-area-inset-left, 0px));
  width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  color: rgba(253,251,245,0.9);
  font-family: var(--lu-font); font-weight: 700; font-size: 14px;
  cursor: pointer;
  transition: transform var(--lu-spring), background-color 0.25s ease;
}
#lu-controls-toggle:active {
  transform: scale(0.90); background-color: rgba(253,251,245,0.14);
  transition-duration: 0s;
}
#lu-dock {
  position: fixed; z-index: 520;
  right: max(12px, env(safe-area-inset-right, 0px));
  bottom: calc(108px + env(safe-area-inset-bottom, 0px));
  display: flex; flex-direction: column; gap: 14px;
}
.lu-dock-wrap { filter: drop-shadow(0 4px 14px rgba(10,8,4,0.45)); }
.lu-dock-btn {
  position: relative; overflow: hidden; /* lu-on 노치가 라운드를 넘지 않게 */
  width: 56px; height: 56px; border-radius: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px;
  background: rgba(23,20,15,0.66);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(253,251,245,0.16);
  box-shadow: inset 0 1px 0 rgba(253,251,245,0.10);
  color: rgba(253,251,245,0.92);
  font-family: var(--lu-font);
  cursor: pointer;
  transition: transform var(--lu-spring), background-color 0.25s ease,
              border-color 0.25s ease, color 0.25s ease;
}
.lu-dock-btn svg {
  width: 21px; height: 21px; fill: none;
  stroke: currentColor; stroke-width: 1.8;
  stroke-linecap: round; stroke-linejoin: round;
}
.lu-dock-label {
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em; opacity: 0.75;
}
.lu-dock-btn:active {
  transform: scale(0.90);
  background-color: rgba(253,251,245,0.14);
  transition-duration: 0s;
}
/* 주 행동(캡처) — 화면 유일의 골드 면 */
.lu-dock-btn.lu-gold {
  background: linear-gradient(180deg, #6fae8c, #4e8a6a);
  border-color: rgba(199,232,213,0.65);
  box-shadow: inset 0 1px 0 rgba(223,240,228,0.55);
  color: var(--lu-ink);
}
.lu-dock-btn.lu-gold .lu-dock-label { opacity: 1; }
.lu-dock-btn.lu-gold.lu-cap-pop { animation: lu-cap-pop 0.45s ease; }
@keyframes lu-cap-pop {
  0% { transform: scale(0.90); }
  55% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
/* 토글 ON — 골드 헤어라인 + 좌측 노치 (면 채움 금지) */
.lu-dock-btn.lu-on {
  border-color: rgba(95,158,125,0.85);
  color: #8fd0ab;
}
.lu-dock-btn.lu-on::before {
  content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px;
  background: var(--lu-gold);
}
#lu-more-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 640;
  border-radius: 16px 16px 0 0;
  padding: 10px 16px calc(18px + env(safe-area-inset-bottom, 0px));
  background: rgba(23,20,15,0.82);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(95,158,125,0.45); /* 시트 유일 골드 — '열림' 신호 */
  transform: translateY(105%);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
#lu-more-sheet.lu-open { transform: translateY(0); }
.lu-sheet-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(253,251,245,0.28);
  margin: 0 auto 12px;
}
.lu-sheet-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
#lu-more-sheet .lu-sheet-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  min-width: 0; padding: 14px 8px; border-radius: 12px;
  background: rgba(253,251,245,0.06);
  border: 1px solid rgba(253,251,245,0.14);
  color: rgba(253,251,245,0.92); font-family: var(--lu-font);
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer;
  transition: transform var(--lu-spring), background-color 0.2s ease;
}
#lu-more-sheet .lu-sheet-btn svg {
  width: 20px; height: 20px; fill: none;
  stroke: currentColor; stroke-width: 1.8;
  stroke-linecap: round; stroke-linejoin: round;
}
#lu-more-sheet .lu-sheet-btn:active {
  transform: scale(0.94); background-color: rgba(253,251,245,0.14);
  transition-duration: 0s;
}
#lu-more-backdrop {
  position: fixed; inset: 0; z-index: 630;
  background: rgba(10,8,4,0.35);
  opacity: 0; pointer-events: none;
  transition: opacity 0.25s ease;
}
#lu-more-backdrop.lu-open { opacity: 1; pointer-events: auto; }
#lu-lightbox { touch-action: none; }
.lu-lightbox-media { transition: transform 0.08s linear; will-change: transform; }

/* -------------------------------- 라이트박스 -------------------------------- */
#lu-lightbox {
  position: fixed; inset: 0; z-index: 950;
  background: rgba(4,4,5,0.96);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 64px 32px 40px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.32s ease;
}
#lu-lightbox.lu-open {
  opacity: 1; pointer-events: auto;
}
#lu-lightbox-close {
  position: fixed; top: 22px; right: 26px; z-index: 951;
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid rgba(255,255,255,0.25);
  border-radius: 50%;
  color: rgba(255,255,255,0.75);
  font-size: 18px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-lightbox-close:hover {
  border-color: var(--lu-gold); color: var(--lu-gold);
  transform: rotate(90deg);
}
.lu-lightbox-stage {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex; align-items: center; justify-content: center;
  transform: scale(0.97); opacity: 0;
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.36s ease;
}
#lu-lightbox.lu-open .lu-lightbox-stage { transform: scale(1); opacity: 1; }
.lu-lightbox-media {
  /* 스테이지(flex 잔여 공간)를 기준으로 맞춰 캡션을 침범하지 않는다 */
  max-width: 100%; max-height: 100%;
  object-fit: contain;
  box-shadow: 0 30px 90px rgba(0,0,0,0.6);
}
.lu-lightbox-caption {
  flex: 0 0 auto;
  width: 100%; max-width: 640px;
  margin-top: 26px;
  text-align: center;
}
.lu-lightbox-title {
  font-size: 25px; font-weight: 600; line-height: 1.35;
  letter-spacing: -0.01em;
  color: #fff;
}
.lu-lightbox-caption::before {
  content: '';
  display: block;
  width: 34px; height: 2px; margin: 0 auto 16px;
  background: var(--lu-gold); border-radius: 2px; opacity: 0.8;
}
.lu-lightbox-meta {
  margin-top: 8px;
  font-size: 12px; letter-spacing: 0.12em;
  color: var(--lu-gold);
}
.lu-lightbox-rule {
  width: 28px; height: 1px; background: rgba(255,255,255,0.2);
  margin: 18px auto;
}
.lu-lightbox-desc {
  font-size: 13px; line-height: 1.85;
  color: rgba(255,255,255,0.55);
  max-height: 16vh; overflow-y: auto;
}
.lu-lightbox-desc:empty { display: none; }

/* ----------------------------- 작품 목록 패널 ----------------------------- */
#lu-artlist {
  position: fixed; z-index: 650;
  top: 0; right: 0; bottom: 0;
  width: min(340px, calc(100vw - 24px));
  background: rgba(255,255,255,0.97);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  color: #111;
  box-shadow: -18px 0 50px rgba(0,0,0,0.28);
  transform: translateX(105%);
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex; flex-direction: column;
}
#lu-artlist.lu-open { transform: translateX(0); }
#lu-artlist-head {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 24px 16px;
  border-bottom: 1px solid #eee;
}
#lu-artlist-title {
  font-size: 13px; letter-spacing: 0.28em; text-indent: 0.28em;
  color: #111;
}
#lu-artlist-close {
  flex: 0 0 auto;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid #ddd; border-radius: 50%;
  color: #999; font-size: 15px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-artlist-close:hover { border-color: var(--lu-gold); color: var(--lu-gold); transform: rotate(90deg); }
#lu-artlist-body {
  flex: 1 1 auto; min-height: 0;
  overflow-y: auto;
}
.lu-artlist-card {
  display: flex; align-items: center; gap: 14px;
  width: 100%; text-align: left;
  font-family: var(--lu-font); font-weight: 300;
  background: transparent; border: none; border-bottom: 1px solid #f0f0ee;
  padding: 14px 24px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.lu-artlist-card:hover { background: #f6f3ea; }
.lu-artlist-thumb {
  flex: 0 0 auto;
  width: 56px; height: 56px; object-fit: cover;
  background: #eee;
}
.lu-artlist-info { min-width: 0; }
.lu-artlist-name {
  font-size: 13px; color: #111;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lu-artlist-artist {
  margin-top: 4px;
  font-size: 11px; letter-spacing: 0.04em; color: #999;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lu-artlist-empty {
  padding: 40px 24px; text-align: center;
  font-size: 12px; color: #aaa;
}

/* ------------------------------- 방명록 패널 ------------------------------- */
/* 작품 목록 패널과 대칭 — 화면 왼쪽에서 슬라이드-인 */
#lu-guestbook {
  position: fixed; z-index: 650;
  top: 0; left: 0; bottom: 0;
  width: min(340px, calc(100vw - 24px));
  overflow: visible; /* 책갈피 탭이 패널 오른쪽 바깥으로 나온다 */
  background: linear-gradient(180deg, #fdfbf5 0%, #f6f1e4 100%);
  color: #1c1a16;
  box-shadow: 18px 0 50px rgba(20,15,8,0.28);
  transform: translateX(-100%); /* 닫혀도 책갈피 탭은 화면에 남는다 */
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  display: flex; flex-direction: column;
}
#lu-guestbook.lu-open { transform: translateX(0); }

/* 책갈피 탭 — 패널 오른쪽 가장자리에 붙어 함께 미끄러진다 */
#lu-gbtab {
  /* 다크 유리 + 골드 라인 책갈피 — 감독 픽 (종이 재질 실험은 회귀) */
  position: absolute;
  right: -33px; top: max(20%, calc(env(safe-area-inset-top, 0px) + 72px));
  writing-mode: vertical-rl;
  padding: 15px 8px 15px 6px;
  background: rgba(10,10,12,0.72);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.16);
  border-left: 2px solid var(--lu-gold);
  border-radius: 0 9px 9px 0;
  color: rgba(255,255,255,0.92);
  font-family: var(--lu-font); font-weight: 300;
  font-size: 12px; letter-spacing: 0.3em;
  cursor: pointer;
  opacity: 0; pointer-events: none;
  transition: opacity 0.6s ease, color 0.25s ease, transform var(--lu-spring);
}
#lu-gbtab.lu-visible { opacity: 1; pointer-events: auto; }
#lu-gbtab:hover { color: var(--lu-gold); }
#lu-gbtab:active { transform: translateX(2px); transition-duration: 0s; }
#lu-guestbook-head {
  flex: 0 0 auto;
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid rgba(95,158,125,0.35);
}
#lu-guestbook-title .lu-gb-eyebrow {
  display: block;
  font-size: 9.5px; letter-spacing: 0.34em; color: #3f7a5c;
  margin-bottom: 6px;
}
#lu-guestbook-title .lu-gb-main {
  display: block;
  font-size: 20px; font-weight: 600; letter-spacing: -0.01em; color: #17140f;
}
#lu-guestbook-title .lu-gb-sub {
  display: block;
  margin-top: 5px;
  font-size: 11.5px; color: #8a8172; letter-spacing: 0.03em;
}
#lu-guestbook-close {
  flex: 0 0 auto;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid #ddd; border-radius: 50%;
  color: #999; font-size: 15px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-guestbook-close:hover { border-color: var(--lu-gold); color: var(--lu-gold); transform: rotate(90deg); }
#lu-guestbook-body {
  flex: 1 1 auto; min-height: 0;
  overflow-y: auto;
}
.lu-gbook-note {
  /* 방명록 한 장 — 종이 카드 + 큰따옴표 워터마크 */
  position: relative;
  margin: 12px 16px 0;
  padding: 14px 16px 14px 18px;
  background: #fffefb;
  border: 1px solid #efe8d6;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(31,26,18,0.05);
}
.lu-gbook-note::before {
  content: '“';
  position: absolute; top: 2px; right: 12px;
  font-size: 34px; line-height: 1; color: rgba(95,158,125,0.28);
  font-family: Georgia, serif;
}
#lu-guestbook-body > .lu-gbook-note:last-child { margin-bottom: 14px; }
.lu-gbook-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  margin-right: 7px; vertical-align: 1px;
}
.lu-gbook-name { font-size: 12.5px; font-weight: 600; color: #3f3a30; }
.lu-gbook-time {
  margin-left: 8px;
  font-size: 10px; letter-spacing: 0.04em; color: #b3ab99;
}
.lu-gbook-text {
  margin-top: 7px;
  font-size: 13px; line-height: 1.7; color: #4a453c;
  word-break: break-word; white-space: pre-wrap;
}
.lu-gbook-empty {
  margin: 20px 16px; padding: 36px 20px; text-align: center;
  font-size: 12.5px; line-height: 1.8; color: #a89f8c;
  border: 1px dashed #ddd3ba; border-radius: 12px;
}
#lu-guestbook-footer {
  flex: 0 0 auto;
  padding: 14px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(95,158,125,0.30);
  background: rgba(255,254,251,0.7);
}
#lu-gbook-input {
  width: 100%; resize: none;
  font-family: var(--lu-font); font-weight: 400;
  font-size: 13px; color: #1c1a16;
  background: #fffefb;
  border: 1px solid #e5dcc4;
  padding: 11px 13px; outline: none;
  border-radius: 12px;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
#lu-gbook-input::placeholder { color: #b3ab99; }
#lu-gbook-input:focus { border-color: var(--lu-gold); box-shadow: 0 0 0 3px rgba(95,158,125,0.15); }
.lu-gbook-footer-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 10px;
}
.lu-gbook-count {
  font-size: 10px; letter-spacing: 0.04em; color: #bbb;
}
#lu-gbook-submit {
  font-family: var(--lu-font); font-weight: 600;
  font-size: 12.5px; letter-spacing: 0.06em;
  color: #17140f;
  background: var(--lu-gold);
  border: 1px solid var(--lu-gold); border-radius: 999px;
  padding: 9px 22px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  box-shadow: 0 3px 12px rgba(95,158,125,0.35);
}
#lu-gbook-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(95,158,125,0.45); }
#lu-gbook-submit:disabled {
  background: transparent; color: #b3ab99;
  border-color: #ddd3ba; box-shadow: none; cursor: default;
}
#lu-gbook-submit:hover { background: var(--lu-gold); border-color: var(--lu-gold); color: #111; }
#lu-gbook-submit:disabled { opacity: 0.35; cursor: default; }
#lu-gbook-submit:disabled:hover { background: #111; border-color: #111; color: #fff; }

/* -------------------------------- 투어 바 -------------------------------- */
#lu-tourbar {
  position: fixed; z-index: 500;
  bottom: 78px; left: 50%;
  display: flex; align-items: center; gap: 16px;
  background: rgba(10,10,12,0.6);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  padding: 11px 24px;
  border-top: 2px solid var(--lu-gold);
  font-size: 12px; letter-spacing: 0.05em;
  color: rgba(255,255,255,0.85);
  max-width: min(90vw, 640px);
  opacity: 0; pointer-events: none;
  transform: translate(-50%, 16px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  white-space: nowrap;
}
#lu-tourbar.lu-open { opacity: 1; pointer-events: auto; transform: translate(-50%, 0); }
#lu-tourbar button {
  font-family: var(--lu-font); font-weight: 300;
  font-size: 12px; letter-spacing: 0.03em;
  color: rgba(255,255,255,0.85);
  background: transparent; border: none;
  cursor: pointer; padding: 4px 2px;
  transition: color 0.2s ease;
}
#lu-tourbar button:hover { color: var(--lu-gold); }
.lu-tour-sep {
  flex: 0 0 auto;
  width: 1px; height: 14px; background: rgba(255,255,255,0.2);
}
.lu-tour-count { color: var(--lu-gold); }
.lu-tour-title {
  display: inline-block;
  max-width: 220px; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; vertical-align: bottom;
  color: rgba(255,255,255,0.85);
}
#lu-tourbar .lu-tour-auto.lu-tour-on { color: var(--lu-gold); }
#lu-tourbar-exit { color: rgba(255,255,255,0.6); }
#lu-tourbar-exit:hover { color: var(--lu-gold); }

/* ------------------------------- 셔터 플래시 ------------------------------- */
/* 포토 모드(P키) 캡처 순간 흰 플래시 — flashShutter()가 opacity를 직접 제어한다 */
#lu-shutter {
  position: fixed; inset: 0; z-index: 970;
  background: #fff;
  opacity: 0; pointer-events: none;
}

/* -------------------------------- 공유 모달 -------------------------------- */
#lu-share {
  position: fixed; inset: 0; z-index: 980;
  background: rgba(4,4,5,0.96);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
}
#lu-share.lu-open { opacity: 1; pointer-events: auto; }
.lu-share-card {
  position: relative;
  width: 100%; max-width: 460px;
  max-height: 92vh; overflow-y: auto;
  background: rgba(255,255,255,0.97);
  color: #111;
  padding: 26px 24px 22px;
  box-shadow: 0 30px 90px rgba(0,0,0,0.5);
  text-align: center;
  transform: scale(0.97); opacity: 0;
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease;
}
#lu-share.lu-open .lu-share-card { transform: scale(1); opacity: 1; }
#lu-share-close {
  position: absolute; top: 14px; right: 14px;
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: 1px solid #ddd; border-radius: 50%;
  color: #999; font-size: 15px; font-weight: 300; line-height: 1;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
#lu-share-close:hover { border-color: var(--lu-gold); color: var(--lu-gold); transform: rotate(90deg); }
.lu-share-title {
  font-size: 13px; letter-spacing: 0.28em; text-indent: 0.28em;
  color: #111; margin-bottom: 18px;
}
.lu-share-preview {
  display: block;
  max-width: 100%; max-height: 55vh;
  margin: 0 auto;
  object-fit: contain;
  border: 1px solid #eee;
  background: #f4f4f2;
}
.lu-share-actions {
  display: flex; flex-direction: column; gap: 8px;
  margin-top: 20px;
}
.lu-share-btn {
  width: 100%;
  font-family: var(--lu-font); font-weight: 300;
  font-size: 13px; letter-spacing: 0.04em;
  color: #222; background: transparent;
  border: 1px solid rgba(0,0,0,0.18);
  border-radius: 3px;
  padding: 11px 16px; cursor: pointer;
  transition: border-color 0.25s ease, background 0.25s ease, color 0.25s ease;
}
.lu-share-btn:hover { border-color: rgba(0,0,0,0.45); }
.lu-share-btn-primary {
  background: var(--lu-gold); border-color: var(--lu-gold); color: #111;
}
.lu-share-btn-primary:hover { background: #c4a02f; border-color: #c4a02f; }
.lu-share-btn-copied { border-color: var(--lu-gold); color: var(--lu-gold); }
.lu-share-hint {
  margin-top: 16px;
  font-size: 10px; letter-spacing: 0.02em; line-height: 1.6;
  color: #b0aca4;
}

/* ------------------------------- 모바일 ------------------------------- */
@media (max-width: 640px) {
  .lu-lobby-card { padding: 34px 22px 26px; }
  .lu-lobby-title { font-size: 19px; }
  #lu-controls { font-size: 11px; padding: 10px 12px; }
  #lu-controls .lu-key { min-width: 60px; }
  #lu-chat { width: calc(100vw - 24px); left: 12px; bottom: 12px; }
  #lu-chat-log { max-height: 130px; }
  #lu-status { font-size: 11px; padding: 6px 14px; }
  #lu-topbar { max-width: 72vw; padding: 0 12px; }
  .lu-topbar-title { font-size: 10px; letter-spacing: 0.2em; text-indent: 0.2em; }
  #lu-lightbox { padding: 56px 18px 28px; }
  #lu-lightbox-close { top: 14px; right: 14px; width: 36px; height: 36px; font-size: 16px; }
  .lu-lightbox-media { max-width: 100%; max-height: 100%; }
  .lu-lightbox-title { font-size: 19px; }
  .lu-lightbox-caption { margin-top: 18px; }
  #lu-artlist { width: calc(100vw - 24px); }
  #lu-artlist-head { padding: 18px 18px 14px; }
  .lu-artlist-card { padding: 12px 18px; gap: 12px; }
  #lu-guestbook { width: calc(100vw - 24px); }
  #lu-guestbook-head { padding: 18px 18px 14px; }
  .lu-gbook-note { padding: 12px 18px; }
  #lu-guestbook-footer { padding: 14px 18px 16px; }
  #lu-tourbar {
    bottom: 92px; padding: 9px 14px; gap: 10px;
    font-size: 11px; max-width: calc(100vw - 20px);
  }
  .lu-tour-title { max-width: 110px; }
  .lu-share-card { padding: 20px 16px 18px; max-width: calc(100vw - 24px); }
  .lu-share-preview { max-height: 42vh; }
}

/* --------------------- 아바타 커스터마이저: 세로 배치 폴백 --------------------- */
@media (max-width: 720px) {
  #lu-avatar-maker, #lu-chibi-maker { padding: 8px; }
  .lu-am-card { max-width: 96vw; max-height: 92vh; border-radius: 24px; }
  .lu-am-head { padding: 14px 16px 12px; }
  .lu-am-body { flex-direction: column; padding: 12px; gap: 10px; overflow-y: auto; }
  .lu-am-preview { width: 168px; max-width: 52vw; margin: 0 auto; padding: 7px 7px 22px; border-radius: 20px; }
  .lu-am-preview-hint { font-size: 8.5px; padding: 3px 8px; bottom: 5px; }
  .lu-am-panel { min-height: 0; }
  .lu-am-nav { padding-bottom: 6px; margin-bottom: 8px; gap: 4px; }
  .lu-am-navtab { min-width: 50px; padding: 6px 6px 5px; font-size: 9.5px; }
  .lu-am-navtab svg { width: 16px; height: 16px; }
  .lu-am-tabpage { min-height: 180px; }
  .lu-am-footer { padding: 12px 16px 16px; }
  .lu-am-btn { padding: 10px 16px; font-size: 12px; }
}
`;
  const style = document.createElement('style');
  style.id = 'lu-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// DOM 빌드 헬퍼
// ---------------------------------------------------------------------------
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'className') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) node.appendChild(child);
  return node;
}

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

  const card = el('div', { className: 'lu-lobby-card' }, [
    title, sub, rule,
    nickLabel, nickInput, nickHint,
    charLabel, designBtn,
    enterBtn,
    orDivider, authBox,
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
const ICON_ROTATE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 12a8 8 0 1 1 2.4 5.7"/><path d="M4 17v-5h5"/></svg>';
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
  const closeX = el('button', { id: 'lu-am-close', type: 'button', 'aria-label': '닫기', text: '×' });
  const titleIcon = el('span', { className: 'lu-am-title-icon', 'aria-hidden': 'true' });
  titleIcon.innerHTML = ICON_LEAF;
  const title = el('div', { className: 'lu-am-title' }, [titleIcon, el('span', { text: '캐릭터 디자인' })]);
  const head = el('div', { className: 'lu-am-head' }, [title, closeX]);

  // 프리뷰 "무대" — 300×400 백킹 해상도(ensurePreviewRenderer의 setSize와 정합)는 그대로 두고,
  // 바깥 lu-am-preview 프레임을 장식용 여백으로 감싸 게임 캐릭터 크리에이터급 무대감을 낸다.
  const canvas = el('canvas', { width: '300', height: '400' });
  const stage = el('div', { className: 'lu-am-stage' }, [canvas]);
  const previewHint = el('div', { className: 'lu-am-preview-hint' });
  previewHint.innerHTML = ICON_ROTATE;
  previewHint.appendChild(el('span', { text: '드래그해서 회전' }));
  const previewBox = el('div', { className: 'lu-am-preview' }, [stage, previewHint]);


  let previewRenderer = null;
  let previewScene = null;
  let previewCamera = null;
  let previewRotator = null;

  function ensurePreviewRenderer() {
    if (previewRenderer) return;
    previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    previewRenderer.setPixelRatio(Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
    previewRenderer.setSize(300, 400, false);
    previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    previewRenderer.toneMappingExposure = 1.1;
    previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color('#f6f1e3');
    // 치비 신장(~1.34m)에 맞춘 근접 프레이밍 — DCL 프리뷰(1.8m)보다 낮고 가깝다
    previewCamera = new THREE.PerspectiveCamera(30, 300 / 400, 0.1, 20);
    previewCamera.position.set(0, 0.86, 3.12);
    previewCamera.lookAt(0, 0.7, 0);
    previewScene.add(new THREE.HemisphereLight(0xfff1d9, 0x2b1f14, 3.0));
    const key = new THREE.DirectionalLight(0xffd9a0, 3.0);
    key.position.set(1.4, 2.6, 2.0);
    previewScene.add(key);
    const fill = new THREE.DirectionalLight(0xffe8c8, 1.1);
    fill.position.set(-1.8, 1.1, 1.6);
    previewScene.add(fill);
    previewRotator = new THREE.Group();
    // 치비는 +Z 저작 + π 래퍼로 -Z를 본다 — 카메라(+Z)에서 정면이 보이게 π 시작
    previewRotator.rotation.y = Math.PI;
    previewScene.add(previewRotator);
  }

  // 카테고리 내비 — 종족·얼굴·헤어·의상·장식·옷장 섹션 전환(스크롤 지옥 대신 탭 전환)
  let activeCat = 'species';
  const nav = el('div', { className: 'lu-am-nav', role: 'tablist', 'aria-label': '캐릭터 디자인 카테고리' });
  const panel = el('div', { className: 'lu-am-panel' });
  const page = el('div', { className: 'lu-am-tabpage' });
  panel.appendChild(nav);
  panel.appendChild(page);
  const body = el('div', { className: 'lu-am-body' }, [previewBox, panel]);

  const saveBtn = el('button', { className: 'lu-am-btn lu-am-btn-primary', type: 'button', text: '저장하고 사용' });
  const closeBtn = el('button', { className: 'lu-am-btn', type: 'button', text: '닫기' });
  const btnRow = el('div', { className: 'lu-am-footer-btns' }, [closeBtn, saveBtn]);

  // 회원가입 게이트 — 캐릭터 저장은 회원가입 필요(감독 방침). 게스트는 저장 없이 이번
  // 세션에만 쓸 수 있고, 회원가입하면 지금 캐릭터가 계정에 저장된다.
  const signupProviders = el('div', { className: 'lu-am-signup-providers' });
  Object.keys(AUTH_PROVIDERS).forEach((key) => {
    const p = AUTH_PROVIDERS[key];
    const b = el('button', { className: `lu-am-social lu-social-${key}`, type: 'button', 'aria-label': p.label }, [
      el('span', { className: 'lu-social-badge', text: p.short }),
      el('span', { text: p.label }),
    ]);
    b.addEventListener('click', async () => {
      b.disabled = true;
      try { await authLoginWith(key); } catch (_) { /* mock 실패 없음 */ }
      b.disabled = false;
      // 회원가입 성공 → 지금 만든 캐릭터를 새 계정에 저장하고 닫는다
      if (authGetProfile() && chibiParams) {
        const look = JSON.parse(JSON.stringify(chibiParams));
        sessionChibi = look;
        saveStoredChibi(look);
        const t = snapshotThumb(150, 200); if (t) saveStoredChibiThumb(t);
        if (els && els.lobby) els.lobby.onChibiSaved();
        if (entered && typeof callbacks.onAvatarChange === 'function') callbacks.onAvatarChange(encodeChibi(look));
        setStatus('회원가입 완료 — 캐릭터가 저장됐어요 ✨');
        closeChibiMaker();
      }
    });
    signupProviders.appendChild(b);
  });
  const guestGate = el('div', { className: 'lu-am-guest-gate' }, [
    el('div', { className: 'lu-am-gate-note', text: '캐릭터를 저장하려면 회원가입이 필요해요. 회원가입 없이도 지금 이 캐릭터로 바로 쓸 수 있어요.' }),
    signupProviders,
  ]);
  const footer = el('div', { className: 'lu-am-footer' }, [guestGate, btnRow]);
  const card = el('div', { className: 'lu-am-card' }, [head, body, footer]);
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
    page.appendChild(el('div', { className: 'lu-am-section-title', text: '프리셋 — 골라서 시작' }));
    const row = el('div', { className: 'lu-am-tabs lu-am-presets' });
    CHIBI_PRESETS.forEach((pre) => {
      const btn = el('button', { type: 'button', className: 'lu-am-tab lu-am-preset' });
      const c1 = pre.look.skin || DEFAULT_CHIBI.skin;
      const c2 = pre.look.top || pre.look.hairColor || DEFAULT_CHIBI.top;
      const dot = el('span', { className: 'lu-am-preset-dot', 'aria-hidden': 'true' });
      dot.style.background = `conic-gradient(${c1} 0deg 180deg, ${c2} 180deg 360deg)`;
      btn.appendChild(dot);
      btn.appendChild(el('span', { className: 'lu-am-preset-label', text: pre.name }));
      btn.addEventListener('click', () => applyPreset(pre.look));
      row.appendChild(btn);
    });
    page.appendChild(row);
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
        className: 'lu-am-navtab' + (selected ? ' lu-selected' : ''),
        'aria-selected': selected ? 'true' : 'false',
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
  }

  function renderPanel() {
    renderNav();
    page.textContent = '';
    if (!chibiParams) return;
    const isAnimal = chibiParams.species && chibiParams.species !== 'human';

    if (activeCat === 'species') {
      presetRow();
      groupTitle('종족 · 성별');
      chipRow('종족', CHIBI_SPECIES, 'species');
      if (!isAnimal) chipRow('성별', CHIBI_GENDERS, 'gender');
    } else if (activeCat === 'face') {
      groupTitle('얼굴');
      chipRow('얼굴형', CHIBI_FACE_SHAPES, 'face');
      chipRow('눈', CHIBI_EYE_STYLES, 'eyeStyle');
      chipRow('입', CHIBI_MOUTH_STYLES, 'mouth');
      chipRow('볼터치', boolOpts('없음', '있음'), 'blush');
      swatchRow(isAnimal ? '털 색' : '피부색', SKIN_TONES, 'skin');
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
    chibiPreviewInstance = createAvatarInstance(encodeChibi(chibiParams), GOLD, ' ');
    previewRotator.add(chibiPreviewInstance.group);
  }

  function previewFrame(t) {
    chibiPreviewRAF = requestAnimationFrame(previewFrame);
    const delta = chibiPreviewLastT ? Math.min(0.05, (t - chibiPreviewLastT) / 1000) : 0;
    chibiPreviewLastT = t;
    if (!chibiDragging) {
      chibiSwingT += delta;
      previewRotator.rotation.y = chibiSwingBase + Math.sin(chibiSwingT * CHIBI_SWING_SPEED) * CHIBI_SWING_AMPLITUDE;
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
  closeBtn.addEventListener('click', () => closeChibiMaker());
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

  // 로그인 여부에 따라 저장 버튼 라벨·회원가입 게이트 노출을 갱신한다.
  function syncSaveGate() {
    const loggedIn = !!authGetProfile();
    saveBtn.textContent = loggedIn ? '저장하고 사용' : '이 캐릭터 사용';
    guestGate.style.display = loggedIn ? 'none' : '';
  }

  saveBtn.addEventListener('click', () => {
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
