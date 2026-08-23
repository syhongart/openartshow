// frontend/js/mypage/limits.ts — 길이·개수 상한 (SSOT)
//
// ── 왜 `schema.ts` 에서 떼어냈나 (검수관 P2, 2026-08-08) ──────────────────
// 원래 `LIMITS` 는 `schema.ts` 에 있었고, `links.ts` 가 그것을 import 했다. 그런데
// `schema.ts` 도 `links.ts` 의 `PLATFORM_IDS` 를 import 한다 — **순환 의존**이다
// (`ARCHITECTURE.md §2` 의 강제 불변식 "순환 0" 위반).
//
// 당시 런타임이 안전했던 이유는 방어가 하나뿐이었다: 양쪽 다 최상위가 아니라 **함수
// 본문에서만** 상대 심볼을 읽는다. 누군가 `links.ts` 최상위에
// `const MAX = LIMITS.linkUrl.max` 를 적는 순간 로드 순서 의존 TDZ 가 된다. 그리고
// **이 저장소에는 순환 검사 게이트가 없다** — 그래서 조용히 통과했다.
//
// 상한만 leaf 로 떼면 `schema → limits`, `links → limits` 로 두 방향이 되고 고리가 끊긴다.
// 값은 한 곳에만 있으므로 여전히 SSOT 다.

/** 스키마 버전. 필드 의미가 바뀌면 올리고 `migrateProfile` 에 단계를 추가한다. */
export const PROFILE_VERSION = 1;

// UI 의 maxlength·검증·서버 컬럼 정의가 전부 여기서 유도된다. 화면에 숫자를 다시
// 적으면 한쪽만 고쳐도 아무도 모른다.
export const LIMITS = {
  nickname: { min: 2, max: 20 },
  displayName: { min: 0, max: 40 },
  bioShort: { min: 0, max: 80 },
  /** 일반 회원. 작가는 `bioArtist` 를 쓴다 — 감독 안의 500 / 1,500 구분. */
  bio: { min: 0, max: 500 },
  bioArtist: { min: 0, max: 1500 },
  location: { min: 0, max: 40 },
  exhibitions: { min: 0, max: 1000 },
  gallery: { min: 0, max: 60 },
  linkUrl: { min: 0, max: 300 },
  linkLabel: { min: 0, max: 30 },
  /** 링크 개수 상한. 감독 안 "기타 링크 최대 3~5개" 를 전체 상한으로 승격했다. */
  links: { min: 0, max: 12 },
  /** 프로필 이미지 dataURL 바이트 상한. localStorage 전체가 보통 5MB 라 여유를 남긴다. */
  profileImageBytes: { min: 0, max: 320 * 1024 },
} as const;

/** 한 프로필이 고를 수 있는 장르 수. 전부 고르면 아무것도 안 고른 것과 같다. */
export const GENRE_MAX = 4;
