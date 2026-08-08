// frontend/js/mypage/visibility.ts — 공개 프로필 유도 (순수 함수)
//
// ── 이 파일 하나가 "다른 사람이 보는 모습" 의 유일한 정의다 ───────────────
// 마이페이지 상단 Preview 와 (나중에 생길) `/@nickname` 공개 페이지가 **같은 함수**를
// 쓴다. 두 벌로 만들면 반드시 갈라지고, 갈라진 쪽이 공개 페이지면 사용자는 자기가
// 숨긴 줄 알았던 것이 공개돼 있는 것을 모른다 — 그건 버그가 아니라 사고다.
//
// 그래서 화면 코드는 `Profile` 을 직접 읽지 않는다. `publicView()` 가 돌려준 것만
// 그린다. 이 규율이 지켜지는지는 통합 테스트가 본다(판정/집행 경계는 아무도 안 보는
// 자리라는 것이 이 저장소의 기록이다).

import {
  type Profile,
  type SocialLink,
  type UserType,
  type GenreId,
  profileDisplayName,
} from './schema.js';
import { linkDisplayText } from './links.js';

/** 공개 링크 하나. `SocialLink` 와 달리 `isVisible` 이 없다 — 여기 있는 것은 전부 공개다. */
export interface PublicLink {
  platform: string;
  url: string;
  /** 화면에 그대로 찍는 문자열. `@arthong` 이거나 호스트명이다. */
  text: string;
}

/**
 * 공개 프로필. **비공개 항목은 빈 값이 아니라 아예 없다**(`null`).
 *
 * 빈 문자열로 두지 않는 이유: 화면이 `if (bio)` 로 분기하면 "비공개" 와 "안 적음" 이
 * 같아 보이고, 나중에 "비공개입니다" 를 표시하려 할 때 구별할 방법이 없다.
 */
export interface PublicProfile {
  /** 마스터 스위치가 꺼졌으면 false — 아래 필드는 전부 null/빈 배열이다. */
  visible: boolean;
  nickname: string;
  displayName: string;
  userType: UserType;
  /** 표시용 활동 분야 이름. 'member'(일반 회원)는 굳이 배지로 달지 않는다. */
  userTypeName: string | null;
  avatarKind: string;
  profileImage: string | null;
  bioShort: string | null;
  bio: string | null;
  location: string | null;
  genres: GenreId[];
  exhibitions: string | null;
  gallery: string | null;
  links: PublicLink[];
  /** 작품 문의 버튼을 띄우는가. `inquiryOpen` 과 공개 설정을 함께 본 결과다. */
  showInquiry: boolean;
  saleOpen: boolean;
}

import { USER_TYPES } from './schema.js';

function userTypeName(id: UserType): string | null {
  if (id === 'member') return null; // 기본값이라 배지로 달면 노이즈다
  return USER_TYPES.find((t) => t.id === id)?.name ?? null;
}

/** 비공개 상태의 공개 프로필. 별명만 남긴다(주소로 도달했을 때 무엇인지는 알려야 한다). */
function hidden(profile: Profile): PublicProfile {
  return {
    visible: false,
    nickname: profile.nickname,
    displayName: '',
    userType: profile.userType,
    userTypeName: null,
    avatarKind: profile.avatarRef.kind,
    profileImage: null,
    bioShort: null,
    bio: null,
    location: null,
    genres: [],
    exhibitions: null,
    gallery: null,
    links: [],
    showInquiry: false,
    saleOpen: false,
  };
}

function publicLinks(links: SocialLink[], allowed: boolean): PublicLink[] {
  if (!allowed) return [];
  return links
    .filter((link) => link.isVisible && link.url)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => ({
      platform: link.platform,
      url: link.url,
      text: linkDisplayText(link.platform, link.url, link.label),
    }));
}

/** 작가 전용 항목인가. 갤러리·컬렉터·일반 회원에게는 전시 이력·소속을 묻지 않는다. */
export function isArtistLike(userType: UserType): boolean {
  return userType === 'artist' || userType === 'gallery';
}

/**
 * 공개 설정을 적용해 "다른 사람이 보는 모습" 을 만든다.
 *
 * 규칙은 셋이다:
 *  1. `visibility.profile` 이 꺼지면 나머지는 보지 않는다(마스터 스위치).
 *  2. 항목 스위치가 꺼지면 `null`.
 *  3. **작가 항목은 활동 분야가 맞을 때만** 나온다 — 일반 회원으로 바꾼 사람의
 *     옛 전시 이력이 계속 공개되지 않게 한다. 저장은 남고 노출만 멈춘다(되돌리면
 *     그대로 돌아온다).
 */
export function publicView(profile: Profile): PublicProfile {
  if (!profile.visibility.profile) return hidden(profile);

  const artistLike = isArtistLike(profile.userType);
  const vis = profile.visibility;

  return {
    visible: true,
    nickname: profile.nickname,
    displayName: profileDisplayName(profile),
    userType: profile.userType,
    userTypeName: userTypeName(profile.userType),
    avatarKind: profile.avatarRef.kind,
    profileImage: profile.profileImage || null,
    // 한 줄 소개는 `bio` 스위치를 함께 따른다 — 사용자가 "소개 비공개" 를 켰는데
    // 한 줄 소개만 남아 있으면 스위치가 거짓말을 하는 셈이다.
    bioShort: vis.bio && profile.bioShort ? profile.bioShort : null,
    bio: vis.bio && profile.bio ? profile.bio : null,
    location: vis.location && profile.location ? profile.location : null,
    genres: artistLike ? profile.genres : [],
    exhibitions: artistLike && profile.exhibitions ? profile.exhibitions : null,
    gallery: artistLike && profile.gallery ? profile.gallery : null,
    links: publicLinks(profile.links, vis.links),
    showInquiry: vis.inquiry && profile.inquiryOpen,
    saleOpen: artistLike && profile.saleOpen,
  };
}

/**
 * 공개 프로필이 실질적으로 비어 있는가. 이름 말고 아무것도 없으면 화면은
 * "아직 소개가 없습니다" 를 보여준다 — 빈 카드를 그리는 것보다 낫다.
 */
export function isEmptyPublicView(view: PublicProfile): boolean {
  if (!view.visible) return true;
  return (
    !view.bioShort
    && !view.bio
    && !view.location
    && view.genres.length === 0
    && !view.exhibitions
    && !view.gallery
    && view.links.length === 0
  );
}
