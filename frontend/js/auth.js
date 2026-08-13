// auth.js — 소셜 로그인 (구글/카카오/네이버)
//
// ⚠️ 현재는 목(mock) 구현이다. 실제 OAuth 키가 발급되면 loginWith() 내부의
// mock 분기를 각 플랫폼 JS SDK 호출로 교체하면 된다 (인터페이스 불변):
//   - Google: Google Identity Services (accounts.google.com/gsi/client)
//   - Kakao:  Kakao JS SDK (Kakao.Auth.login)
//   - Naver:  네아로 JS SDK (naver_id_login)
// 키는 아래 CONFIG에 채운다. 키가 비어 있으면 자동으로 mock 모드로 동작한다.

// 로그아웃 시 마이페이지 프로필 정리. 저장 키를 아는 쪽(`mypage/store`)이 함수를
// 갖고, 여기서는 부르기만 한다(값 미러링 회피). `store` 는 `auth` 를 import 하지
// 않으므로 순환이 아니다.
// **leaf 를 직접** import 한다(`mypage/store.js` 재수출을 거치지 않는다). 거치면 프로필
// 스키마·링크 플랫폼 표가 이 모듈 그래프에 딸려 들어와 **랜딩·미술관 번들**에 실린다 —
// 실측으로 auth 청크가 1,186 B → 12,586 B 였다(검수관 P1).
import { clearProfilesOnLogout } from './mypage/profile-storage.js';
// 키 전용 leaf 를 **직접** import 한다 — `mypage/store.js` 재수출을 거치면 프로필
// 스키마가 auth 청크로 딸려 들어온다(`profile-storage.ts` 헤더의 실측 그대로).
import { clearGeminiKeyOnLogout } from './mypage/gemini-key.js';

const CONFIG = {
  google: { clientId: '' }, // Google Cloud Console OAuth 클라이언트 ID
  kakao: { jsKey: '' },     // Kakao Developers JavaScript 키
  naver: { clientId: '' },  // Naver Developers Client ID
};

export const PROVIDERS = {
  google: { label: 'Google로 계속하기', short: 'G' },
  kakao: { label: '카카오로 계속하기', short: 'K' },
  naver: { label: '네이버로 계속하기', short: 'N' },
};

const STORAGE_KEY = 'lu-auth-profile-v1';

// mock 로그인 시 부여되는 표시 이름 (플랫폼별 감성 차이만 살짝)
export const MOCK_NAMES = {
  google: '아트러버',
  kakao: '전시나들이',
  naver: '갤러리워커',
};

let profile = null; // { provider, name, initial } | null
let changeListeners = [];

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p && typeof p.provider === 'string' && typeof p.name === 'string') return p;
  } catch (_) {
    /* 무시 */
  }
  return null;
}

function persist() {
  try {
    if (profile) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(STORAGE_KEY);
  } catch (_) {
    /* 무시 */
  }
}

function emitChange() {
  for (const cb of changeListeners) {
    try {
      cb(profile);
    } catch (_) {
      /* 리스너 오류는 무시 */
    }
  }
}

profile = loadProfile();

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

export function getProfile() {
  return profile;
}

export function isMockMode(provider) {
  const c = CONFIG[provider];
  if (!c) return true;
  return !Object.values(c).some((v) => typeof v === 'string' && v.length > 0);
}

// 로그인 — 성공 시 profile 반환. mock 모드에서는 잠깐의 지연 후 가짜 프로필 부여.
export async function loginWith(provider) {
  if (!PROVIDERS[provider]) throw new Error('unknown provider: ' + provider);

  if (isMockMode(provider)) {
    // 실제 SDK 왕복처럼 느껴지도록 짧은 지연
    await new Promise((r) => setTimeout(r, 450));
    const name = MOCK_NAMES[provider] || '관람객';
    profile = { provider, name, initial: name.slice(0, 1) };
    persist();
    emitChange();
    return profile;
  }

  // TODO(키 발급 후): 플랫폼별 실제 SDK 로그인으로 교체
  throw new Error('SDK 연동은 키 발급 후 활성화됩니다');
}

export function logout() {
  profile = null;
  persist();
  // ── 이 기기에 남은 프로필도 지운다 (검수관 P5) ──────────────────────────
  // `persist()` 는 로그인 정보(`lu-auth-profile-v1`)만 지운다. 마이페이지 프로필
  // (`lu-profile::<uid>`)은 그대로 남는데, 신원이 아직 mock 이라 사용자 식별자가
  // **자칭 문자열**이다 — 공용 PC 에서 뒷사람이 같은 이름을 자칭하면 앞사람의
  // 프로필 사진·활동 지역을 그대로 본다.
  //
  // behind-flag 인 동안에는 아무도 그 화면에 도달하지 못해 문제가 아니었다.
  // **홈에서 링크로 접근 가능해지는 순간 성질이 달라진다**(감독 지시 2026-08-08).
  //
  // 문자열은 `mypage/store` 가 갖는다 — 여기 프리픽스를 다시 적으면 값 미러링이고,
  // 한쪽만 고치면 지워지지 않는 것이 조용히 남는다.
  clearProfilesOnLogout();
  // Gemini API 키도 같은 경로에서 지운다 (팀장 조건 2026-08-10).
  //
  // **공용 기기가 이유다** — 가족 PC·PC방에서 로그아웃한 뒤 키가 남으면 다음 사람이
  // 그 브라우저로 **감독의 요금을 쓴다.** 프로필 정리와 **같은 자리**에 있어야
  // "로그아웃했는데 이것만 안 지워졌다" 가 안 생긴다.
  //
  // ⚠ 이것이 *"로그인이 키를 지켜준다"* 는 뜻은 아니다 — `localStorage` 의 경계는
  // 로그인이 아니라 **오리진**이고, 같은 오리진 JS 는 로그인과 무관하게 키를 읽는다.
  // 근거는 `mypage/gemini-key.ts` 헤더 한 곳이다(여기에 다시 적지 않는다).
  clearGeminiKeyOnLogout();
  emitChange();
}

export function onAuthChange(cb) {
  if (typeof cb === 'function') changeListeners.push(cb);
}
