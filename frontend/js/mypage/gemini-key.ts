// Gemini API 키의 **보관과 삭제** — leaf. 이 파일이 키를 아는 유일한 곳이다.
//
// ── 왜 별도 leaf 인가 (팀장 판정 2026-08-10, 조건 (나)①) ───────────────────
// *"키 읽기/쓰기를 **전용 모듈 1곳**으로 격리하고 `studio-storage` 계열이 그것을
// import 할 수 없게 **구조로 막는다**(값이 아니라 경로를 끊는다)."*
//
// `profile-storage.ts` 가 같은 이유로 갈라져 나온 선례다 — `auth.js` 가 로그아웃 정리를
// 위해 `store.js` 를 import 했더니 번들러가 모듈 그래프를 통째로 끌어와, **미술관을 여는
// 사람이 프로필 스키마를 내려받고** 있었다. 여기서도 같다: 키를 아는 코드가 발행·공유
// 경로의 모듈 그래프에 **닿지 않아야** 한다.
//
// ── 이 키가 새는 경로는 무엇인가 ───────────────────────────────────────────
// 이 저장소는 상태를 **URL 로 실어 나른다**(`studio-storage.ts` 의 `#gz=`). 그리고
// **손으로 조작한 링크는 발행 관문을 안 탄다**(보안담당 R-4). 즉 키가 직렬화 대상에
// 한 번이라도 들어가면 **링크를 받은 사람 전부가 감독의 키를 갖는다.**
//
// 그래서 이 모듈은 **키를 반환만 하고 어떤 직렬화기에도 자기를 넘기지 않는다.**
// 그것이 지켜지는지는 `tests/gemini-key-isolation.test.ts` 가 단언한다 —
// URL·해시뿐 아니라 **PeerJS 데이터채널**(멀티플레이어 상태 동기화)까지 본다(팀장 조건 (나)③).
//
// ── ⚠ 로그인은 이 키의 보호막이 아니다 (팀장 조건 (가)①) ──────────────────
// **로그인 상태를 키의 보호막으로 설계하지도 서술하지도 않는다.** `localStorage` 의
// 실제 경계는 로그인이 아니라 **오리진**이다 — 같은 오리진에서 도는 JS 는 로그인 여부와
// 무관하게 이 키를 읽는다. 지금 로그인이 목업(mock OAuth)인 것과도 **무관하다**:
// 목업이 뚫려도 공격자가 보는 것은 **자기 브라우저의 빈 localStorage** 다.
//
// 잘못된 안전감을 적어 두면 다음 사람이 확인을 생략한다 — 이 저장소가 `main`
// unprotected 오기로 7일을 잃은 그 형태다.

/** 이 기기에 저장된 Gemini API 키. **접두사가 아니라 단일 키다**(호스트 1명 = 기기 1개). */
export const GEMINI_KEY = 'lu-gemini-key-v1';

/** 저장소가 막혀 있으면(사생활 보호 모드 등) 조용히 실패한다 — 페이지를 죽이지 않는다. */
function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 저장된 키를 읽는다. 없으면 `''`. */
export function readGeminiKey(): string {
  const s = safeStorage();
  if (!s) return '';
  try {
    return s.getItem(GEMINI_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * 키를 저장한다. **빈 문자열이면 삭제**한다(입력란을 비우는 것이 곧 삭제다 —
 * 지우는 방법을 따로 찾게 만들지 않는다).
 */
export function writeGeminiKey(key: string): void {
  const s = safeStorage();
  if (!s) return;
  try {
    const v = String(key ?? '').trim();
    if (v) s.setItem(GEMINI_KEY, v);
    else s.removeItem(GEMINI_KEY);
  } catch {
    /* 저장소가 막혀 있으면 할 수 있는 일이 없다 */
  }
}

/**
 * 로그아웃할 때 이 기기에서 키를 지운다 (팀장 조건 (가)②).
 *
 * **왜 로그아웃에 묶는가**: 공용 기기(가족 PC·PC방)에서 로그아웃한 뒤 키가 남아 있으면
 * 다음 사람이 그 브라우저로 **감독의 요금을 쓴다.** `clearProfilesOnLogout` 과 같은
 * 경로에 붙어 있어야 "로그아웃했는데 이건 안 지워졌다" 가 생기지 않는다.
 *
 * ⚠ 이것은 **로그인이 키를 지켜준다는 뜻이 아니다**(위 헤더 참조). 로그아웃은
 * *"이 기기를 떠난다"* 는 **사용자 의사 표시**이고, 그때 지우는 것이 맞을 뿐이다.
 */
export function clearGeminiKeyOnLogout(): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.removeItem(GEMINI_KEY);
  } catch {
    /* 위와 같다 */
  }
}
