// frontend/js/mypage/index.ts — 마이페이지 배럴(파사드)
//
// ARCHITECTURE §4. 소비자는 이 경로 하나로만 접근하고, 내부 파일 재배치는 이 뒤에서
// 자유롭게 한다. 화면(view-*)이 `./schema.js` 를 직접 집어 가기 시작하면 배럴이 있으나
// 마나가 되므로, **화면 코드의 import 는 이 파일에서만** 온다.

export {
  PROFILE_VERSION,
  LIMITS,
  USER_TYPES,
  GENRES,
  GENRE_MAX,
  DEFAULT_VISIBILITY,
  emptyProfile,
  normalizeProfile,
  migrateProfile,
  profileDisplayName,
  bioMaxFor,
  type Profile,
  type SocialLink,
  type Visibility,
  type UserType,
  type GenreId,
  type AvatarKind,
  type AvatarRef,
} from './schema.js';

export {
  PLATFORMS,
  PLATFORM_IDS,
  findPlatform,
  normalizeLinkUrl,
  checkLink,
  handleFromUrl,
  linkDisplayText,
  bareHost,
  type Platform,
  type PlatformId,
  type LinkCheck,
  type LinkErrorCode,
} from './links.js';

export {
  checkNickname,
  suggestNicknames,
  nicknameKey,
  nicknameLength,
  type NicknameCheck,
  type NicknameErrorCode,
  type CheckOptions,
} from './nickname.js';

export {
  publicView,
  isEmptyPublicView,
  isArtistLike,
  type PublicProfile,
  type PublicLink,
} from './visibility.js';

export {
  LocalProfileStore,
  loadOrCreate,
  type ProfileStore,
  type SaveResult,
  type SaveErrorCode,
  type Clock,
} from './store.js';
