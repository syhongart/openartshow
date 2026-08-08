// frontend/js/mypage/store.ts — 프로필 저장 어댑터
//
// ── 감독 판정 2026-08-08: "어댑터 + 로컬" ─────────────────────────────────
// 스키마는 서버 DB 모양으로 설계하고, 저장은 이 인터페이스 뒤에 둔다. 이번 사이클은
// `LocalProfileStore` 하나뿐이고, 서버가 붙는 날 `RemoteProfileStore` 를 **추가**한다 —
// 화면 코드는 한 줄도 바뀌지 않는다. 감독 우려(*"나중에 공개 작가 페이지를 붙일 때
// 구조를 다시 뜯을 가능성이 큽니다"*)를 여기서 해소한다.
//
// ── 왜 전부 비동기인가 ────────────────────────────────────────────────────
// localStorage 는 동기다. 그런데 인터페이스를 동기로 잡으면 서버가 붙는 순간 모든
// 호출부가 `await` 로 바뀌어야 하고, 그것이 정확히 "구조를 다시 뜯는" 일이다.
// 지금 Promise 로 감싸는 비용은 거의 0 이고, 나중에 안 감싼 대가는 전면 수정이다.
//
// ── 이 파일이 유일하게 시계를 읽는 곳이다 ─────────────────────────────────
// `schema.ts`·`nickname.ts`·`links.ts`·`visibility.ts` 는 전부 순수 함수다(같은 입력 →
// 같은 출력). 타임스탬프가 필요한 것은 저장 시점뿐이므로 여기 한 곳에 가둔다.
// 그래야 나머지를 시간 의존 없이 테스트할 수 있고, 서버 시각으로 바꿀 때도 여기만 본다.

import {
  type Profile,
  emptyProfile,
  migrateProfile,
  normalizeProfile,
} from './schema.js';
import {
  type NicknameCheck,
  checkNickname,
  nicknameKey,
} from './nickname.js';
import { NICKNAME_INDEX_KEY, PROFILE_PREFIX } from './profile-storage.js';

// 로그아웃 정리는 leaf 에 있다. 여기서 **재수출**하는 이유는 소비자 경로를 바꾸지 않기
// 위해서다 — 다만 `auth.js` 는 이 배럴이 아니라 leaf 를 직접 import 해야 번들이 갈린다
// (재수출을 거치면 이 모듈이 그래프에 다시 들어온다).
export { clearProfilesOnLogout } from './profile-storage.js';

export type SaveErrorCode = 'quota' | 'unavailable' | 'nickname' | 'unknown';

export interface SaveResult {
  ok: boolean;
  code: SaveErrorCode | null;
  message: string;
  /** 성공 시 실제로 저장된 프로필(타임스탬프가 채워진 것). */
  profile: Profile | null;
}

/**
 * 프로필 저장소.
 *
 * 구현체는 지금 `LocalProfileStore` 하나다. 서버가 붙으면 같은 인터페이스로
 * `RemoteProfileStore` 를 만들고, 화면은 어느 쪽을 받는지 모르는 채 동작한다.
 */
export interface ProfileStore {
  /**
   * 이 저장소의 별명 중복 판정이 **전역**인가.
   *
   * 로컬 저장소는 false 다 — 이 기기의 저장만 볼 수 있으므로 통과는 "중복이 아니다" 가
   * 아니라 **"아직 모른다"** 이다. 화면은 이 값을 그대로 사용자에게 전한다.
   * 못 잰 것을 통과로 적지 않는다는 규율이 여기에 걸려 있다.
   */
  readonly authoritativeUniqueness: boolean;

  /** 없으면 `null`. 손상된 저장은 정규화해서 돌려준다(버리지 않는다). */
  load(uid: string): Promise<Profile | null>;

  /** 저장. 별명 판정에 실패하면 저장하지 않는다. */
  save(uid: string, profile: Profile): Promise<SaveResult>;

  /** 이 저장소가 아는 별명 판정. `authoritativeUniqueness` 와 함께 읽어야 한다. */
  checkNickname(nickname: string, uid: string): Promise<NicknameCheck>;

  /** 프로필 삭제(계정 설정의 "프로필 초기화"). 별명 예약도 함께 푼다. */
  remove(uid: string): Promise<void>;
}

// ── localStorage 구현 ─────────────────────────────────────────────────────
//
// 키 규약은 기존(`lu-chibi-look::<uid>`)을 그대로 따른다. `uid` 는
// `ui-chibi-store.ts` 의 `currentUserId()` 가 만드는 것과 **같은 문자열**이어야 한다 —
// 프로필과 아바타가 같은 사용자에 붙어야 하므로. 그 함수를 여기서 다시 구현하지 않고
// 호출자가 넘긴다(순환 import 회피 + 값 미러링 회피).
//
// 키 **값**은 leaf(`profile-storage.ts`)가 갖는다 — `auth.js` 가 로그아웃 정리를 위해
// 이 파일을 import 하자 프로필 스키마·링크 플랫폼 표가 **랜딩·미술관 번들**에 실렸다
// (검수관 P1 실측: auth 청크 1,186 B → 12,586 B). 값은 한 곳뿐이므로 SSOT 는 그대로다.

function profileKey(uid: string): string {
  return PROFILE_PREFIX + uid;
}

function readIndex(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NICKNAME_INDEX_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function writeIndex(index: Record<string, string>): boolean {
  try {
    localStorage.setItem(NICKNAME_INDEX_KEY, JSON.stringify(index));
    return true;
  } catch {
    return false;
  }
}

/** 이 기기가 아는, **다른 사용자가 쓰고 있는** 별명 집합. */
function takenBy(index: Record<string, string>, uid: string): ReadonlySet<string> {
  const set = new Set<string>();
  for (const [key, owner] of Object.entries(index)) {
    if (owner !== uid) set.add(key);
  }
  return set;
}

/**
 * `Date.now()` 를 주입받는다. 테스트가 시각을 고정할 수 있어야 하고, 서버 시각으로
 * 바꿀 때도 이 인자만 갈면 된다.
 */
export type Clock = () => number;

export class LocalProfileStore implements ProfileStore {
  /**
   * false — 이 기기의 저장만 본다.
   *
   * 이 값을 true 로 올리는 것은 서버가 붙는 순간이지 로컬 인덱스가 커지는 순간이
   * 아니다. 로컬 인덱스는 보통 항목이 하나뿐이다(그 기기의 사용자). 그것으로
   * "사용 가능합니다" 를 단정하면 거의 항상 통과시키게 되고, 그 통과는 아무것도
   * 보증하지 않는다.
   */
  readonly authoritativeUniqueness = false;

  private readonly now: Clock;

  constructor(now: Clock = () => Date.now()) {
    this.now = now;
  }

  async load(uid: string): Promise<Profile | null> {
    try {
      const raw = localStorage.getItem(profileKey(uid));
      if (!raw) return null;
      return migrateProfile(JSON.parse(raw));
    } catch {
      // 손상된 JSON. 빈 프로필을 주면 사용자는 "내 정보가 날아갔다" 고 느끼지만,
      // null 을 주면 화면이 "아직 안 만듦" 으로 다루므로 새로 쓰게 된다 — 후자가 낫다.
      return null;
    }
  }

  async checkNickname(nickname: string, uid: string): Promise<NicknameCheck> {
    const index = readIndex();
    const current = await this.load(uid);
    return checkNickname(nickname, {
      taken: takenBy(index, uid),
      uniquenessAuthoritative: this.authoritativeUniqueness,
      self: current?.nickname ?? '',
    });
  }

  async save(uid: string, input: Profile): Promise<SaveResult> {
    const previous = await this.load(uid);
    const profile = normalizeProfile(input);

    // 별명은 저장 직전에 **다시** 판정한다. 화면이 검사한 뒤 사용자가 값을 더 고쳤을
    // 수 있고, 다른 탭에서 같은 별명이 예약됐을 수도 있다.
    const check = await this.checkNickname(profile.nickname, uid);
    // `pendingUniqueness` 는 막지 않는다 — 그건 "형식은 맞고 중복은 아직 모른다" 이고,
    // 서버가 없는 지금은 영구히 그 상태다. 여기서 막으면 아무도 저장할 수 없다.
    if (!check.ok) {
      return { ok: false, code: 'nickname', message: check.message, profile: null };
    }

    const now = this.now();
    const stamped: Profile = {
      ...profile,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };

    try {
      localStorage.setItem(profileKey(uid), JSON.stringify(stamped));
    } catch (err) {
      // QuotaExceededError 가 압도적으로 흔하다(프로필 이미지 dataURL). 사파리 사생활
      // 모드처럼 저장 자체가 막힌 경우도 같은 예외로 온다 — 사용자에게는 구별이
      // 의미 없으므로 "무엇을 하면 되는가" 만 말한다.
      const quota = err instanceof DOMException
        && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      return {
        ok: false,
        code: quota ? 'quota' : 'unavailable',
        message: quota
          ? '저장 공간이 가득 찼습니다. 프로필 사진을 줄이거나 지워 주세요.'
          : '이 브라우저에서는 저장할 수 없습니다. (사생활 보호 모드일 수 있습니다)',
        profile: null,
      };
    }

    // 별명 예약 갱신 — 옛 별명은 풀고 새 별명을 잡는다. 실패해도 프로필 저장은
    // 이미 됐으므로 성공으로 친다(인덱스는 편의 기능이지 진실이 아니다).
    const index = readIndex();
    for (const [key, owner] of Object.entries(index)) {
      if (owner === uid) delete index[key];
    }
    if (stamped.nickname) index[nicknameKey(stamped.nickname)] = uid;
    writeIndex(index);

    return { ok: true, code: null, message: '저장했습니다.', profile: stamped };
  }

  async remove(uid: string): Promise<void> {
    try {
      localStorage.removeItem(profileKey(uid));
    } catch {
      /* 무시 — 지우지 못해도 화면이 할 수 있는 일이 없다 */
    }
    const index = readIndex();
    let changed = false;
    for (const [key, owner] of Object.entries(index)) {
      if (owner === uid) {
        delete index[key];
        changed = true;
      }
    }
    if (changed) writeIndex(index);
  }
}


/**
 * 저장소에서 프로필을 읽되, 없으면 빈 프로필을 만든다. 화면은 `null` 을 다룰 필요가 없다.
 *
 * 활동 분야 기본값을 `member` 로 두는 것은 스키마의 몫이다 — 여기서 다시 정하지 않는다.
 */
export async function loadOrCreate(store: ProfileStore, uid: string): Promise<Profile> {
  const loaded = await store.load(uid);
  return loaded ?? emptyProfile();
}
