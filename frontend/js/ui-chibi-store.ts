// frontend/js/ui-chibi-store.ts — chibi(아야모) 퍼시스턴스 스토어 (ui.js 분해 C-1 단계2)
// 중립 leaf: HUD 빌더·아바타 편집기가 공용으로 쓰는 저장/세션 상태. 두 그룹이 서로
// import 하지 않고 이 leaf만 import 하도록 하여 향후 순환(ui-hud↔ui-avatar-editor)을 차단.
// [불변] localStorage 키 생성 로직·프리픽스·레거시 키는 1바이트도 바꾸지 않는다
//         (키가 바뀌면 사용자 저장이 유실됨). ui.js에서 로직·값 무변경으로 순수 이동.
// [리졸브] vite.config의 .js→.ts 폴백(감독 B안)이 소비자의 확장자 명시 .js import를
//         대응 .ts로 해소하므로, ui.js의 import는 './ui-chibi-store.js' 그대로 유지한다.

import {
  getProfile as authGetProfile,
  onAuthChange,
} from './auth.js';

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
export const LU_CLOSET_MAX = 12;                       // 옷장 슬롯 상한 (localStorage 용량 보호)

// 현재 사용자 식별자 — 로그인 프로필이 있으면 'provider:name', 없으면 'guest'.
export function currentUserId() {
  const p = authGetProfile();
  return p && p.provider && p.name ? `${p.provider}:${p.name}` : 'guest';
}
function chibiLookKey(uid?: string) { return LU_CHIBI_LOOK_PREFIX + (uid || currentUserId()); }
function chibiThumbKey(uid?: string) { return LU_CHIBI_THUMB_PREFIX + (uid || currentUserId()); }
function chibiClosetKey(uid?: string) { return LU_CHIBI_CLOSET_PREFIX + (uid || currentUserId()); }

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

export function readStoredChibi(uid?: string) {
  try {
    const raw = localStorage.getItem(chibiLookKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}
export function saveStoredChibi(params: any, uid?: string) {
  try { localStorage.setItem(chibiLookKey(uid), JSON.stringify(params)); return true; }
  catch (_) { return false; }  // 용량 초과 등 — 호출부에서 사용자 안내
}
export function readStoredChibiThumb(uid?: string) {
  try { return localStorage.getItem(chibiThumbKey(uid)) || ''; } catch (_) { return ''; }
}
export function saveStoredChibiThumb(dataUrl: string, uid?: string) {
  try { localStorage.setItem(chibiThumbKey(uid), dataUrl); } catch (_) { /* 무시 */ }
}

// 세션 룩 — 게스트가 "이번 세션에만" 쓰는 캐릭터(저장 안 됨). 캐릭터 저장은 회원가입 필요.
// 로그인 사용자는 저장분을 sessionChibi에도 반영해 세션 내내 일관되게 쓴다.
let sessionChibi: any = null;
// 세션 룩 설정 — ui.js 편집기 저장 시점에서 이번 세션에 즉시 적용(게스트 포함).
// (ES 모듈 live binding은 import측 재할당 불가 → setter로 노출)
export function setSessionChibi(look: any) { sessionChibi = look; }
// 지금 세션에서 실제로 쓸 룩 — 세션 룩 우선, 없으면 저장된 룩(로그인/게스트 네임스페이스).
export function readActiveChibi() {
  return sessionChibi || readStoredChibi();
}
// 로그인/로그아웃/계정 전환 시 세션 룩을 폐기한다. 그러지 않으면 앞 유저(또는 게스트)의
// 미저장 세션 룩이 다음 유저 네임스페이스로 새어나가 계정 간 캐릭터가 오염된다(검수 반려 사례).
// 이후엔 새 유저의 저장 룩(readStoredChibi) 또는 기본 아야모가 활성 룩이 된다.
onAuthChange(() => { sessionChibi = null; });

// 옷장(로그인 전용) — [{ id, name, look, thumb, ts }]
export function readCloset(uid?: string) {
  try {
    const raw = localStorage.getItem(chibiClosetKey(uid));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}
export function saveCloset(list: any[], uid?: string) {
  try { localStorage.setItem(chibiClosetKey(uid), JSON.stringify(list)); return true; }
  catch (_) { return false; }  // 용량 초과 등 — 호출부에서 사용자 안내
}

// 프리뷰 WebGL 캔버스를 작은 JPEG 썸네일로 축소한다. 유저별·옷장 다중 저장으로
// 썸네일 개수가 늘어나므로, 큰 PNG 대신 축소 JPEG로 localStorage 용량을 아낀다.
export function makeThumbDataUrl(sourceCanvas: CanvasImageSource, w: number, h: number) {
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.72);
  } catch (_) { return ''; }
}
