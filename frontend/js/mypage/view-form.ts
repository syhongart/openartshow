// frontend/js/mypage/view-form.ts — 폼 ↔ Profile 양방향 바인딩
//
// 링크는 개수가 동적이라 `view-links.ts` 가 따로 맡는다. 여기는 고정 필드만 본다.
//
// ── 상한을 HTML 에 적지 않는 이유 ─────────────────────────────────────────
// `maxlength` 를 마크업에 손으로 적으면 그것이 `LIMITS` 와 두 곳에 적힌 같은 값이다.
// 한쪽만 고치면 아무도 모르고, 이 저장소는 정확히 그 형태로 세 번 데었다. 그래서
// `applyLimits()` 가 부팅 시 DOM 에 주입한다 — 값의 출처는 `schema.ts` 하나다.

import {
  LIMITS,
  GENRES,
  GENRE_MAX,
  bioMaxFor,
  type Profile,
  type UserType,
  type GenreId,
  type Visibility,
} from './schema.js';
import { type NicknameCheck } from './nickname.js';
import { isArtistLike } from './visibility.js';
import {
  q,
  qa,
  mp,
  field,
  fields,
  errorSlot,
  countSlot,
  setText,
  setShown,
  setStateClass,
  readValue,
  writeValue,
  readChecked,
  writeChecked,
  readGroup,
  writeGroup,
  readCheckedValues,
  writeCheckedValues,
  clear,
} from './dom.js';

/** 판정 문구의 배타적 상태 클래스. 디자이너 명세와 같은 이름이다. */
export const FEEDBACK_CLASSES = ['is-ok', 'is-error', 'is-pending'] as const;

const GENRE_IDS: readonly string[] = GENRES.map((g) => g.id);

// ── 상한 주입 ─────────────────────────────────────────────────────────────

/** 텍스트 입력의 `maxlength` 를 `LIMITS` 에서 채운다. 소개는 활동 분야에 따라 다르다. */
export function applyLimits(root: ParentNode, userType: UserType): void {
  const put = (name: string, max: number) => {
    for (const el of fields(root, name)) {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.maxLength = max;
      }
    }
  };
  put('nickname', LIMITS.nickname.max);
  put('displayName', LIMITS.displayName.max);
  put('bioShort', LIMITS.bioShort.max);
  put('bio', bioMaxFor(userType));
  put('location', LIMITS.location.max);
  put('exhibitions', LIMITS.exhibitions.max);
  put('gallery', LIMITS.gallery.max);
}

// ── 글자수 카운터 ─────────────────────────────────────────────────────────

const COUNTED = ['nickname', 'bioShort', 'bio', 'exhibitions'] as const;

export function renderCounters(root: ParentNode, userType: UserType): void {
  const max = (name: string): number => {
    if (name === 'bio') return bioMaxFor(userType);
    if (name === 'nickname') return LIMITS.nickname.max;
    if (name === 'bioShort') return LIMITS.bioShort.max;
    return LIMITS.exhibitions.max;
  };
  for (const name of COUNTED) {
    const slot = countSlot(root, name);
    if (!slot) continue;
    // 코드포인트로 센다. `.length` 로 세면 이모지가 2로 세어져 사용자가 세는 것과 다르다.
    const used = Array.from(readValue(field(root, name))).length;
    setText(slot, `${used} / ${max(name)}`);
    slot.classList.toggle('is-full', used >= max(name));
  }
}

// ── 별명 피드백 ───────────────────────────────────────────────────────────

/**
 * 별명 판정을 화면에 낸다.
 *
 * `pendingUniqueness` 를 `is-ok` 로 그리지 않는 것이 이 함수의 요점이다. 서버가 없어
 * 전역 중복을 **확인할 수 없는 상태**이고, 사용자에게 그 사실이 그대로 전달돼야 한다.
 * 초록 체크로 보이면 우리가 못 잰 것을 통과로 말하는 셈이다.
 */
export function renderNicknameFeedback(
  root: ParentNode,
  check: NicknameCheck,
  suggestions: readonly string[],
  onPick: (value: string) => void,
): void {
  const slot = errorSlot(root, 'nickname');
  if (slot) {
    setText(slot, check.message);
    const state = !check.ok ? 'is-error' : (check.pendingUniqueness ? 'is-pending' : 'is-ok');
    setStateClass(slot, FEEDBACK_CLASSES, state);
    setShown(slot, check.message !== '');
  }

  // 추천은 "이미 쓰이고 있다" 일 때만 의미가 있다. 형식이 틀린 것에 대안을 내밀면
  // 사용자는 왜 자기 입력이 거부됐는지 모른 채 남의 이름을 고르게 된다.
  const box = q(root, '[data-mp-suggest="nickname"]');
  if (!box) return;
  clear(box);
  const show = check.code === 'taken' && suggestions.length > 0;
  if (show) {
    for (const value of suggestions) {
      const btn = box.ownerDocument.createElement('button');
      btn.type = 'button';
      btn.className = 'mp-suggest';
      btn.textContent = value;
      btn.addEventListener('click', () => onPick(value));
      box.appendChild(btn);
    }
  }
  setShown(box, show);
}

// ── Profile → DOM ─────────────────────────────────────────────────────────

export function writeForm(root: ParentNode, profile: Profile): void {
  writeValue(field(root, 'nickname'), profile.nickname);
  writeValue(field(root, 'displayName'), profile.displayName);
  writeGroup(fields(root, 'userType'), profile.userType);
  writeValue(field(root, 'bioShort'), profile.bioShort);
  writeValue(field(root, 'bio'), profile.bio);
  writeValue(field(root, 'location'), profile.location);
  writeCheckedValues(fields(root, 'genres'), profile.genres);
  writeValue(field(root, 'exhibitions'), profile.exhibitions);
  writeValue(field(root, 'gallery'), profile.gallery);
  writeChecked(field(root, 'inquiryOpen'), profile.inquiryOpen);
  writeChecked(field(root, 'saleOpen'), profile.saleOpen);
  writeVisibility(root, profile.visibility);
}

// ── DOM → Profile ─────────────────────────────────────────────────────────

/**
 * 폼의 현재 값을 `base` 위에 얹는다. **링크는 건드리지 않는다** — `view-links` 소관이고,
 * 여기서 함께 읽으면 두 곳이 같은 필드를 쓰게 된다.
 *
 * 정규화(길이 자르기·알 수 없는 값 버리기)는 하지 않는다. 그건 `normalizeProfile` 이
 * 저장 직전에 한 번만 하는 일이다 — 여기서 또 하면 규칙이 두 곳에 생긴다.
 */
export function readForm(root: ParentNode, base: Profile): Profile {
  const userType = (readGroup(fields(root, 'userType')) || base.userType) as UserType;
  const genres = readCheckedValues(fields(root, 'genres'))
    .filter((g): g is GenreId => GENRE_IDS.includes(g))
    .slice(0, GENRE_MAX);

  return {
    ...base,
    nickname: readValue(field(root, 'nickname')).trim(),
    displayName: readValue(field(root, 'displayName')).trim(),
    userType,
    bioShort: readValue(field(root, 'bioShort')).trim(),
    bio: readValue(field(root, 'bio')),
    location: readValue(field(root, 'location')).trim(),
    genres,
    exhibitions: readValue(field(root, 'exhibitions')),
    gallery: readValue(field(root, 'gallery')).trim(),
    inquiryOpen: readChecked(field(root, 'inquiryOpen')),
    saleOpen: readChecked(field(root, 'saleOpen')),
    visibility: readVisibility(root, base.visibility),
  };
}

// ── 공개 설정 ─────────────────────────────────────────────────────────────

const VIS_KEYS = ['profile', 'bio', 'location', 'links', 'email', 'inquiry'] as const;

function visInput(root: ParentNode, key: string): HTMLElement | null {
  return q(root, `[data-mp-vis="${key}"]`);
}

export function writeVisibility(root: ParentNode, visibility: Visibility): void {
  for (const key of VIS_KEYS) writeChecked(visInput(root, key), visibility[key]);
  reflectMasterSwitch(root, visibility.profile);
}

export function readVisibility(root: ParentNode, base: Visibility): Visibility {
  const out = { ...base };
  for (const key of VIS_KEYS) {
    const el = visInput(root, key);
    if (el) out[key] = readChecked(el);
  }
  return out;
}

/**
 * 마스터 스위치가 꺼졌을 때 나머지 토글을 **비활성**으로 만든다.
 *
 * 값을 끄지는 않는다 — 마스터를 다시 켰을 때 사용자가 정해 둔 항목별 설정이 그대로
 * 돌아와야 한다. 화면에서만 "지금은 의미 없다" 를 보여준다. `publicView()` 가 이미
 * 마스터를 우선 적용하므로 실제 공개 판정에는 영향이 없다.
 */
export function reflectMasterSwitch(root: ParentNode, profileVisible: boolean): void {
  for (const key of VIS_KEYS) {
    if (key === 'profile') continue;
    const el = visInput(root, key);
    if (el instanceof HTMLInputElement) el.disabled = !profileVisible;
    const row = el?.closest('[data-mp-vis-row]') ?? el?.parentElement ?? null;
    if (row instanceof HTMLElement) row.classList.toggle('is-muted', !profileVisible);
  }
}

// ── 활동 분야에 따른 탭 노출 ──────────────────────────────────────────────

/**
 * 작가·갤러리가 아니면 「작가 정보」 탭을 숨긴다.
 *
 * 값을 지우지는 않는다. 활동 분야를 되돌리면 적어 둔 전시 이력이 그대로 돌아와야
 * 한다 — `publicView()` 도 같은 방침이다(공개만 멈추고 저장은 남긴다). 화면과 판정이
 * 같은 규칙을 따르게 하려고 `isArtistLike` 를 양쪽이 함께 쓴다.
 */
export function reflectUserType(root: ParentNode, userType: UserType): void {
  const artist = isArtistLike(userType);
  const tab = q(root, '[data-mp-tab="artist"]');
  const panel = q(root, '[data-mp-panel="artist"]');
  setShown(tab, artist);
  if (!artist && panel && !panel.hidden) {
    // 열려 있던 탭이 사라지면 갈 곳이 없다. 기본 탭으로 돌려보낸다.
    for (const el of qa(root, '[data-mp-panel]')) setShown(el, el.dataset.mpPanel === 'basic');
    for (const el of qa(root, '[data-mp-tab]')) {
      el.setAttribute('aria-selected', String(el.dataset.mpTab === 'basic'));
    }
  }
  // 판매 문의 항목도 작가 계열에서만 의미가 있다.
  const sale = field(root, 'saleOpen');
  const saleRow = sale?.closest('[data-mp-row]') ?? sale?.parentElement ?? null;
  if (saleRow instanceof HTMLElement) setShown(saleRow, artist);
}

/** 계정 탭 안내 — 지금 로그인이 mock 이라는 사실을 숨기지 않는다. */
export function renderAccount(root: ParentNode, providerLabel: string, mock: boolean): void {
  setText(mp(root, 'account-provider'), providerLabel);
  const notice = mp(root, 'account-notice');
  if (!notice) return;
  setText(
    notice,
    mock
      ? '지금 로그인은 시험용(mock)입니다. 실제 계정 연동 전까지 프로필은 이 브라우저에만 저장되고, 별명 중복 확인도 이 기기 안에서만 이뤄집니다.'
      : '',
  );
  setShown(notice, mock);
}
