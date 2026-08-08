// frontend/js/mypage/app.ts — 마이페이지 부팅·탭·저장
//
// 가산형 독립 모듈이다. 보호 파일(main·player·artworks·config)을 **import 하지 않는다** —
// `visit.js` 가 잡아 둔 선례를 그대로 따른다. 기존 코드 중 여기서 쓰는 것은 둘뿐이다:
//   · `ui-chibi-store` — 사용자 식별자와 아야모 썸네일(프로필과 아바타가 같은 사용자에
//     붙어야 하므로 식별자를 여기서 다시 만들지 않는다)
//   · `auth` — 로그인 상태 표시
//
// ── 이 파일이 하지 않는 것 ────────────────────────────────────────────────
// 판정을 하지 않는다. 별명·링크·공개 범위는 전부 순수 함수(`nickname`·`links`·
// `visibility`)가 정하고, 여기는 그 결과를 화면과 저장소에 나른다. 판정이 이 파일로
// 새어 들어오면 서버가 붙는 날 같은 규칙을 서버에서 다시 쓰게 된다.

import {
  emptyProfile,
  normalizeProfile,
  LIMITS,
  type Profile,
  type UserType,
} from './schema.js';
import { checkNickname, suggestNicknames, type NicknameCheck } from './nickname.js';
import { publicView } from './visibility.js';
import { LocalProfileStore, type ProfileStore } from './store.js';
import { renderPreview } from './view-preview.js';
import {
  applyLimits,
  renderCounters,
  renderNicknameFeedback,
  writeForm,
  readForm,
  reflectMasterSwitch,
  reflectUserType,
  renderAccount,
} from './view-form.js';
import { writeLinks, readLinks, addLinkRow } from './view-links.js';
import { q, qa, mp, field, fields, setText, setShown, writeValue } from './dom.js';

import { currentUserId, readStoredChibiThumb, makeThumbDataUrl } from '../ui-chibi-store.js';
import { getProfile as authGetProfile, onAuthChange, isMockMode, PROVIDERS } from '../auth.js';

/** 별명 검사 디바운스(ms). 타이핑 중 매 글자마다 저장소를 뒤지지 않는다. */
const NICKNAME_DEBOUNCE = 220;
/** 프로필 사진 한 변 최대 픽셀. 원본을 그대로 넣으면 localStorage 가 바로 찬다. */
const AVATAR_MAX_PX = 320;

export interface MyPageApp {
  destroy(): void;
}

export function createMyPage(root: HTMLElement, store: ProfileStore = new LocalProfileStore()): MyPageApp {
  let uid = currentUserId();
  let profile: Profile = emptyProfile();
  let dirty = false;
  let nicknameTimer = 0;
  const disposers: Array<() => void> = [];

  // ── 화면 갱신 ───────────────────────────────────────────────────────────

  /**
   * 폼의 현재 값으로 Preview 를 다시 그린다.
   *
   * **`publicView()` 를 반드시 통과시킨다.** 편집 중인 원본을 그대로 그리면 사용자가
   * 비공개로 꺼 둔 항목이 Preview 에 남고, 그러면 Preview 는 "다른 사람이 보는 모습"
   * 이 아니게 된다 — 이 화면의 존재 이유가 사라진다.
   */
  function refreshPreview(): void {
    const current = normalizeProfile(collect());
    renderPreview(root, publicView(current), { avatarThumb: readStoredChibiThumb(uid) || '' });
  }

  /** 폼 + 링크를 합쳐 현재 프로필을 만든다. 저장하지 않는다. */
  function collect(): Profile {
    const base = readForm(root, profile);
    return { ...base, links: readLinks(root).links };
  }

  function markDirty(): void {
    dirty = true;
    setText(mp(root, 'save-status'), '저장하지 않은 변경이 있습니다.');
    mp(root, 'save-status')?.classList.remove('is-ok', 'is-error');
  }

  function onFormInput(): void {
    const userType = (readForm(root, profile).userType || profile.userType) as UserType;
    applyLimits(root, userType);
    renderCounters(root, userType);
    reflectUserType(root, userType);
    reflectMasterSwitch(root, q<HTMLInputElement>(root, '[data-mp-vis="profile"]')?.checked ?? true);
    refreshPreview();
    markDirty();
  }

  // ── 별명 ────────────────────────────────────────────────────────────────

  async function runNicknameCheck(): Promise<void> {
    const input = field(root, 'nickname');
    const value = (input && 'value' in input ? String((input as HTMLInputElement).value) : '').trim();

    // 빈 칸은 아직 아무것도 안 한 상태다. 페이지를 열자마자 빨간 문구가 뜨면
    // 사용자는 자기가 뭘 잘못한 줄 안다.
    if (!value) {
      renderNicknameFeedback(root, { ok: false, code: null, message: '', pendingUniqueness: false } as NicknameCheck, [], () => {});
      return;
    }

    const check = await store.checkNickname(value, uid);
    const suggestions = check.code === 'taken'
      ? suggestNicknames(value, { uniquenessAuthoritative: store.authoritativeUniqueness })
      : [];
    renderNicknameFeedback(root, check, suggestions, (picked) => {
      writeValue(field(root, 'nickname'), picked);
      onFormInput();
      void runNicknameCheck();
    });
  }

  function scheduleNicknameCheck(): void {
    window.clearTimeout(nicknameTimer);
    nicknameTimer = window.setTimeout(() => void runNicknameCheck(), NICKNAME_DEBOUNCE);
  }

  // ── 프로필 사진 ─────────────────────────────────────────────────────────

  /**
   * 고른 이미지를 축소해 dataURL 로 만든다.
   *
   * 원본을 그대로 넣지 않는 이유는 용량이다 — 요즘 휴대폰 사진 한 장이 3~5MB 이고
   * localStorage 전체가 보통 5MB 다. 한 장으로 저장이 통째로 막힌다.
   * 축소·JPEG 인코딩은 `ui-chibi-store` 의 `makeThumbDataUrl` 을 그대로 쓴다(아바타
   * 썸네일이 이미 같은 문제를 그 함수로 풀었다 — 여기서 또 만들지 않는다).
   */
  async function readImageFile(file: File): Promise<string> {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
        img.src = url;
      });
      const scale = Math.min(1, AVATAR_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      return makeThumbDataUrl(img, w, h) || '';
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function onPickImage(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    const status = mp(root, 'save-status');
    try {
      const dataUrl = await readImageFile(file);
      if (dataUrl.length > LIMITS.profileImageBytes.max) {
        setText(status, '사진이 너무 큽니다. 더 작은 이미지를 골라 주세요.');
        status?.classList.add('is-error');
        return;
      }
      profile = { ...profile, profileImage: dataUrl };
      refreshPreview();
      markDirty();
    } catch {
      setText(status, '이미지를 읽지 못했습니다.');
      status?.classList.add('is-error');
    } finally {
      // 같은 파일을 다시 고를 수 있어야 한다(change 는 값이 같으면 안 뜬다).
      input.value = '';
    }
  }

  // ── 저장 ────────────────────────────────────────────────────────────────

  async function save(): Promise<void> {
    const status = mp(root, 'save-status');
    status?.classList.remove('is-ok', 'is-error');

    const { links, dropped } = readLinks(root);
    const next: Profile = { ...readForm(root, profile), links, profileImage: profile.profileImage };

    const result = await store.save(uid, next);
    if (!result.ok || !result.profile) {
      setText(status, result.message);
      status?.classList.add('is-error');
      if (result.code === 'nickname') void runNicknameCheck();
      return;
    }

    profile = result.profile;
    dirty = false;
    writeForm(root, profile);
    writeLinks(root, profile.links, { onChange: () => { refreshPreview(); markDirty(); } });
    refreshPreview();

    // 버린 링크가 있으면 **말한다.** 조용히 사라지면 사용자는 저장된 줄 안다.
    setText(status, dropped > 0
      ? `저장했습니다. 주소가 올바르지 않은 링크 ${dropped}개는 저장하지 않았습니다.`
      : '저장했습니다.');
    status?.classList.add(dropped > 0 ? 'is-error' : 'is-ok');
  }

  // ── 탭 ──────────────────────────────────────────────────────────────────

  function selectTab(id: string): void {
    for (const tab of qa(root, '[data-mp-tab]')) {
      const on = tab.dataset.mpTab === id;
      tab.setAttribute('aria-selected', String(on));
      tab.classList.toggle('is-active', on);
    }
    for (const panel of qa(root, '[data-mp-panel]')) {
      setShown(panel, panel.dataset.mpPanel === id);
    }
  }

  // ── 계정 ────────────────────────────────────────────────────────────────

  function renderAuthState(): void {
    const auth = authGetProfile();
    const provider = auth?.provider ?? '';
    const label = auth
      ? `${(PROVIDERS as Record<string, { label: string }>)[provider]?.label ?? provider} · ${auth.name}`
      : '로그인하지 않음 (게스트)';
    // mock 여부는 auth 모듈이 판정한다. 로그인하지 않았어도 지금은 어차피 이 기기에만
    // 저장되므로 안내를 띄운다 — 사용자가 기기를 바꾸면 프로필이 없다는 사실이
    // 알려져야 한다.
    renderAccount(root, label, !auth || isMockMode(provider));
  }

  async function reload(): Promise<void> {
    uid = currentUserId();
    profile = (await store.load(uid)) ?? emptyProfile();
    applyLimits(root, profile.userType);
    writeForm(root, profile);
    writeLinks(root, profile.links, { onChange: () => { refreshPreview(); markDirty(); } });
    renderCounters(root, profile.userType);
    reflectUserType(root, profile.userType);
    reflectMasterSwitch(root, profile.visibility.profile);
    renderAuthState();
    refreshPreview();
    void runNicknameCheck();
    dirty = false;
    setText(mp(root, 'save-status'), '');
  }

  // ── 배선 ────────────────────────────────────────────────────────────────

  function on(el: EventTarget | null, type: string, handler: EventListener): void {
    if (!el) return;
    el.addEventListener(type, handler);
    disposers.push(() => el.removeEventListener(type, handler));
  }

  for (const tab of qa(root, '[data-mp-tab]')) {
    on(tab, 'click', () => selectTab(tab.dataset.mpTab ?? 'basic'));
  }

  // 폼 필드 — 이름을 열거하지 않고 계약 속성으로 모은다. 필드를 추가할 때 여기를
  // 고쳐야 하면 반드시 잊는다.
  for (const el of qa(root, '[data-mp-field]')) {
    if (el.dataset.mpField === 'profileImage') {
      on(el, 'change', () => void onPickImage(el as HTMLInputElement));
      continue;
    }
    on(el, 'input', onFormInput);
    on(el, 'change', onFormInput);
  }
  for (const el of qa(root, '[data-mp-vis]')) {
    on(el, 'change', onFormInput);
  }
  for (const el of fields(root, 'nickname')) {
    on(el, 'input', scheduleNicknameCheck);
  }

  on(mp(root, 'link-add'), 'click', () => {
    if (!addLinkRow(root, { onChange: () => { refreshPreview(); markDirty(); } })) {
      setText(mp(root, 'save-status'), `링크는 ${LIMITS.links.max}개까지 넣을 수 있습니다.`);
      return;
    }
    markDirty();
  });

  on(mp(root, 'save'), 'click', () => void save());

  on(mp(root, 'account-reset'), 'click', () => {
    // 되돌릴 수 없는 동작이다. 확인 없이 지우지 않는다.
    if (!window.confirm('프로필을 초기화합니다. 저장한 소개·링크·공개 설정이 모두 지워집니다. 계속할까요?')) return;
    void store.remove(uid).then(() => reload());
  });

  // 아바타 편집기는 미술관 HUD 안에서 열린다(`ui-hud.ts`). 마이페이지에 그것을
  // 그대로 띄우려면 HUD 컨텍스트(els·state·callbacks)가 필요해 결합이 커진다 —
  // 이번 사이클은 **연결만** 한다(계획서 §9). 인라인 편집기 삽입은 별도 판단이다.
  on(mp(root, 'avatar-open'), 'click', () => {
    if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) return;
    window.location.href = './index.html';
  });

  // 로그인 상태가 바뀌면 그 사용자의 프로필로 갈아탄다. 아바타가 이미 그렇게
  // 동작하고 있어(`ui-chibi-store`), 프로필만 안 따라가면 두 개가 어긋난다.
  const offAuth = onAuthChange(() => void reload());
  if (typeof offAuth === 'function') disposers.push(offAuth);

  // 저장하지 않고 떠나는 것을 막는다. 프로필은 한 번에 여러 칸을 채우는 화면이라
  // 실수로 뒤로 가면 잃는 것이 크다.
  const beforeUnload = (e: BeforeUnloadEvent) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  };
  window.addEventListener('beforeunload', beforeUnload);
  disposers.push(() => window.removeEventListener('beforeunload', beforeUnload));

  // 아바타 썸네일(캐릭터 탭)
  const thumb = mp<HTMLImageElement>(root, 'avatar-thumb');
  if (thumb) {
    const data = readStoredChibiThumb(uid);
    if (data) thumb.src = data;
    setShown(thumb, Boolean(data));
  }

  selectTab('basic');
  void reload();

  return {
    destroy() {
      window.clearTimeout(nicknameTimer);
      for (const dispose of disposers) dispose();
      disposers.length = 0;
    },
  };
}
