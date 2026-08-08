// frontend/js/mypage/schema.ts — 프로필 스키마 SSOT
//
// "파라미터가 곧 프로필". space.ts·chibi-schema.ts 가 잡아 둔 계보를 그대로 따른다 —
// 버전 필드 + normalize/migrate 를 **처음부터** 넣는다. 이 둘이 없으면 필드를 하나
// 추가할 때마다 기존 사용자의 저장이 깨지고, 그때 가서 붙이면 이미 깨진 저장을
// 되살릴 방법이 없다.
//
// ── 이 스키마가 서버 테이블 모양인 이유 ──────────────────────────────────
// 감독이 제시한 `users` + `user_social_links` 2테이블 구조를 **그대로** 클라이언트
// 스키마로 쓴다. 지금은 localStorage 에 JSON 으로 들어가지만, 서버가 붙는 날
// 매핑 코드가 생기지 않게 하려는 것이다(감독 우려: *"나중에 공개 작가 페이지를 붙일 때
// 구조를 다시 뜯을 가능성이 큽니다"*).
//
// ── 여기 없는 것 ─────────────────────────────────────────────────────────
//  · 이메일·로그인 정보 — 감독 지시로 공개 프로필과 **완전히 분리**한다. `auth.js` 소관.
//  · 아바타 파라미터 — 이미 `ui-chibi-store.ts` 가 유저별로 저장하고 있다. 여기서
//    복제하면 그 순간 값 미러링이고, 두 곳이 갈라지면 HUD 의 아바타와 프로필의
//    아바타가 서로 다른 모습이 된다. 이 스키마는 **참조(avatarRef)만** 갖는다.

/** 스키마 버전. 필드 의미가 바뀌면 올리고 `migrateProfile` 에 단계를 추가한다. */
export const PROFILE_VERSION = 1;

// ── 길이 상한 (SSOT) ──────────────────────────────────────────────────────
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

// ── 활동 분야 ─────────────────────────────────────────────────────────────
export const USER_TYPES = [
  { id: 'artist', name: '작가' },
  { id: 'gallery', name: '갤러리' },
  { id: 'collector', name: '컬렉터' },
  { id: 'member', name: '일반 회원' },
] as const;
export type UserType = (typeof USER_TYPES)[number]['id'];

// ── 장르 ──────────────────────────────────────────────────────────────────
// NFT 는 넣지 않았다 — 그것은 장르가 아니라 판매·소유 형식이고, 여기 섞으면
// "회화 NFT" 를 표현할 수 없다. 필요해지면 별도 축으로 연다.
export const GENRES = [
  { id: 'painting', name: '회화' },
  { id: 'photo', name: '사진' },
  { id: 'sculpture', name: '조각' },
  { id: 'media', name: '미디어아트' },
  { id: 'installation', name: '설치' },
  { id: 'digital', name: '디지털아트' },
  { id: 'craft', name: '공예' },
  { id: 'drawing', name: '드로잉' },
  { id: 'etc', name: '기타' },
] as const;
export type GenreId = (typeof GENRES)[number]['id'];
/** 한 프로필이 고를 수 있는 장르 수. 전부 고르면 아무것도 안 고른 것과 같다. */
export const GENRE_MAX = 4;

// ── 아바타 참조 ───────────────────────────────────────────────────────────
// 실제 파라미터는 `ui-chibi-store` 가 갖는다(위 주석). 여기는 "어느 시스템의
// 아바타인가" 만 적는다 — 나중에 VRM 등 다른 종류가 생겨도 이 필드만 늘어난다.
export type AvatarKind = 'chibi';
export interface AvatarRef {
  kind: AvatarKind;
}

// ── SNS·외부 링크 (← user_social_links) ──────────────────────────────────
// 플랫폼 목록의 정의는 `links.ts` 한 곳이다. 여기서는 타입만 받는다.
import { PLATFORM_IDS, type PlatformId } from './links.js';
export type { PlatformId };

export interface SocialLink {
  platform: PlatformId;
  /** 저장은 항상 URL. 감독 판단대로 확장성이 낫고, 플랫폼이 바뀌어도 값이 산다. */
  url: string;
  /** 표시용 핸들(`@arthong`). URL 에서 유도되며, 유도 불가면 빈 문자열. */
  handle: string;
  /** `other` 플랫폼에서 사용자가 붙이는 이름. 그 외에는 빈 문자열. */
  label: string;
  sortOrder: number;
  isVisible: boolean;
}

// ── 공개 설정 ─────────────────────────────────────────────────────────────
// 감독 지시: 이메일은 기본 OFF. 나머지는 기본 ON 이되 `profile` 이 꺼지면 전부 덮인다.
export interface Visibility {
  /** 마스터 스위치. 꺼지면 공개 프로필 자체가 비공개다. */
  profile: boolean;
  bio: boolean;
  location: boolean;
  links: boolean;
  /** 기본 false — 로그인 정보와 공개 프로필의 분리 원칙(감독 지시). */
  email: boolean;
  /** 작품 문의 버튼 노출 */
  inquiry: boolean;
}

// ── 프로필 (← users) ──────────────────────────────────────────────────────
export interface Profile {
  v: number;
  /** 전역 유일. 지금은 로컬 예약이고, 서버가 붙으면 `UNIQUE (nickname)` 이 된다. */
  nickname: string;
  /** 작가명 "홍길동 / Hong Gil Dong". 비어 있으면 화면은 nickname 으로 대체한다. */
  displayName: string;
  userType: UserType;
  avatarRef: AvatarRef;
  /** dataURL. 빈 문자열이면 아바타를 대신 쓴다. */
  profileImage: string;
  bioShort: string;
  bio: string;
  location: string;
  genres: GenreId[];
  exhibitions: string;
  gallery: string;
  inquiryOpen: boolean;
  saleOpen: boolean;
  links: SocialLink[];
  visibility: Visibility;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_VISIBILITY: Visibility = {
  profile: true,
  bio: true,
  location: true,
  links: true,
  email: false,
  inquiry: true,
};

/** 빈 프로필. `createdAt`/`updatedAt` 은 호출자가 넣는다(순수성 유지 — 아래 주석). */
export function emptyProfile(): Profile {
  return {
    v: PROFILE_VERSION,
    nickname: '',
    displayName: '',
    userType: 'member',
    avatarRef: { kind: 'chibi' },
    profileImage: '',
    bioShort: '',
    bio: '',
    location: '',
    genres: [],
    exhibitions: '',
    gallery: '',
    inquiryOpen: false,
    saleOpen: false,
    links: [],
    visibility: { ...DEFAULT_VISIBILITY },
    createdAt: 0,
    updatedAt: 0,
  };
}

// ── 정규화 ────────────────────────────────────────────────────────────────
// 이 모듈은 **시계를 읽지 않는다.** `Date.now()` 를 안에서 부르면 같은 입력이 매번
// 다른 출력을 내 테스트가 시간에 의존하게 된다. 타임스탬프는 store 가 찍는다.

function str(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  // 제어문자 제거 — 붙여넣기로 들어오는 NUL·BS·DEL 류가 JSON·화면을 깨뜨린다.
  // 개행(\n)은 남긴다: 소개·주요 전시는 여러 줄이 정상이다.
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '');
  return cleaned.slice(0, max);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const USER_TYPE_IDS: readonly string[] = USER_TYPES.map((t) => t.id);
const GENRE_IDS: readonly string[] = GENRES.map((g) => g.id);

function normalizeLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  const out: SocialLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const src = item as Record<string, unknown>;
    const platform = typeof src.platform === 'string' && (PLATFORM_IDS as readonly string[]).includes(src.platform)
      ? (src.platform as PlatformId)
      : 'other';
    const url = str(src.url, LIMITS.linkUrl.max);
    if (!url) continue; // URL 없는 링크는 존재 이유가 없다
    out.push({
      platform,
      url,
      handle: str(src.handle, LIMITS.linkLabel.max),
      label: str(src.label, LIMITS.linkLabel.max),
      sortOrder: num(src.sortOrder, out.length),
      isVisible: bool(src.isVisible, true),
    });
    if (out.length >= LIMITS.links.max) break;
  }
  // sortOrder 를 신뢰하지 않고 **재부여**한다. 저장이 손상돼 중복·구멍이 생겨도
  // 화면의 순서가 흔들리지 않는다.
  out.sort((a, b) => a.sortOrder - b.sortOrder);
  return out.map((link, i) => ({ ...link, sortOrder: i }));
}

function normalizeGenres(raw: unknown): GenreId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: GenreId[] = [];
  for (const g of raw) {
    if (typeof g !== 'string' || !GENRE_IDS.includes(g) || seen.has(g)) continue;
    seen.add(g);
    out.push(g as GenreId);
    if (out.length >= GENRE_MAX) break;
  }
  return out;
}

/**
 * 어떤 입력이든 유효한 `Profile` 로 만든다. 손상된 저장·옛 저장·직접 편집된 JSON 이
 * 들어와도 화면이 깨지지 않는 것이 이 함수의 계약이다.
 *
 * **길이 상한은 여기서 자른다** — UI 의 `maxlength` 는 사용자 친절이지 방어가 아니다.
 */
export function normalizeProfile(raw: unknown): Profile {
  const base = emptyProfile();
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as Record<string, unknown>;

  const userType = typeof src.userType === 'string' && USER_TYPE_IDS.includes(src.userType)
    ? (src.userType as UserType)
    : base.userType;

  // 소개 상한은 활동 분야에 따라 다르다(작가 1500 / 그 외 500). 작가에서 일반 회원으로
  // 바꾸면 초과분이 잘리는데, 그것이 의도다 — 표시 상한을 넘긴 값이 저장에 남아 있으면
  // 나중에 어느 쪽이 진짜인지 알 수 없다.
  const bioMax = userType === 'artist' ? LIMITS.bioArtist.max : LIMITS.bio.max;

  const vis = (src.visibility && typeof src.visibility === 'object'
    ? src.visibility
    : {}) as Record<string, unknown>;

  const avatarKind = src.avatarRef && typeof src.avatarRef === 'object'
    && (src.avatarRef as Record<string, unknown>).kind === 'chibi' ? 'chibi' : 'chibi';

  return {
    v: PROFILE_VERSION,
    nickname: str(src.nickname, LIMITS.nickname.max),
    displayName: str(src.displayName, LIMITS.displayName.max),
    userType,
    avatarRef: { kind: avatarKind },
    // 이미지는 문자열 상한이 아니라 **바이트 상한**으로 본다. 넘으면 통째로 버린다 —
    // 잘라 낸 dataURL 은 깨진 이미지라 화면에 X 가 뜬다.
    profileImage: typeof src.profileImage === 'string'
      && src.profileImage.length <= LIMITS.profileImageBytes.max
      && /^data:image\/(png|jpeg|webp);base64,/.test(src.profileImage)
      ? src.profileImage
      : '',
    bioShort: str(src.bioShort, LIMITS.bioShort.max),
    bio: str(src.bio, bioMax),
    location: str(src.location, LIMITS.location.max),
    genres: normalizeGenres(src.genres),
    exhibitions: str(src.exhibitions, LIMITS.exhibitions.max),
    gallery: str(src.gallery, LIMITS.gallery.max),
    inquiryOpen: bool(src.inquiryOpen, base.inquiryOpen),
    saleOpen: bool(src.saleOpen, base.saleOpen),
    links: normalizeLinks(src.links),
    visibility: {
      profile: bool(vis.profile, DEFAULT_VISIBILITY.profile),
      bio: bool(vis.bio, DEFAULT_VISIBILITY.bio),
      location: bool(vis.location, DEFAULT_VISIBILITY.location),
      links: bool(vis.links, DEFAULT_VISIBILITY.links),
      email: bool(vis.email, DEFAULT_VISIBILITY.email),
      inquiry: bool(vis.inquiry, DEFAULT_VISIBILITY.inquiry),
    },
    createdAt: num(src.createdAt, base.createdAt),
    updatedAt: num(src.updatedAt, base.updatedAt),
  };
}

/**
 * 옛 저장을 현재 버전으로 올린다. 단계를 **누적**으로 적는다(v1→v2→v3 를 순서대로
 * 통과) — "최신으로 한 번에" 로 적으면 중간 버전을 건너뛴 저장이 조용히 틀린다.
 *
 * v1 이 최초 버전이라 지금은 단계가 없다. 그래도 함수를 두는 이유는, 필요해진
 * 시점에 붙이면 이미 그 전에 저장된 데이터를 못 살리기 때문이다.
 */
export function migrateProfile(raw: unknown): Profile {
  if (!raw || typeof raw !== 'object') return normalizeProfile(raw);
  const src = { ...(raw as Record<string, unknown>) };
  const from = num(src.v, 0);

  // 버전이 없던 저장(v0) → v1. 필드 이름이 같으므로 정규화만으로 충분하다.
  // 앞으로 단계를 추가할 자리:
  //   if (from < 2) { …; src.v = 2 }
  if (from < 1) src.v = 1;

  return normalizeProfile(src);
}

/** 화면에 쓰는 이름. displayName 이 비면 nickname, 그것도 비면 '이름 없음'. */
export function profileDisplayName(profile: Profile): string {
  return profile.displayName || profile.nickname || '이름 없음';
}

/** 현재 활동 분야에서 허용되는 소개 길이. UI 의 카운터와 검증이 함께 쓴다. */
export function bioMaxFor(userType: UserType): number {
  return userType === 'artist' ? LIMITS.bioArtist.max : LIMITS.bio.max;
}
