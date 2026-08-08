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
import { LocalProfileStore, type ProfileStore, type SaveResult } from './store.js';
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
// 딥링크 문자열을 여기 적지 않는다 — `avatar-deeplink.ts` 가 SSOT 다(검수관 P2).
import { buildAvatarDeepLink } from '../avatar-deeplink.js';

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
  // 한글 IME 조합 중인가. 조합 중에는 별명 판정을 미룬다 — 아래 `scheduleNicknameCheck` 참조.
  let composing = false;
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

    // 저장소가 터져도 타이핑이 멈추면 안 된다. 판정을 못 받으면 그 사실만 말하고
    // 화면은 계속 돈다 — 여기서 던지면 디바운스 타이머가 unhandled rejection 을 낸다.
    let check: NicknameCheck;
    try {
      check = await store.checkNickname(value, uid);
    } catch {
      renderNicknameFeedback(
        root,
        { ok: false, code: null, message: '별명을 확인하지 못했습니다.', pendingUniqueness: false },
        [],
        () => {},
      );
      return;
    }
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
    // ── 한글 조합 중에는 판정하지 않는다 ─────────────────────────────────
    // IME 는 조합 중에도 `input` 을 쏜다. "홍길동" 을 치면 중간에 `ㅎ`·`호`·`홍ㄱ` 이
    // 지나가고, 그때마다 판정하면 **빨간 "자음·모음 하나만 쓸 수는 없습니다" 가
    // 깜빡인다.** 사용자는 자기가 뭘 잘못 치고 있다고 읽는다.
    //
    // 조합이 끝나는 순간(`compositionend`)에 한 번만 본다. 영문·숫자 입력에는
    // composition 이벤트가 없으므로 기존 동작 그대로다.
    if (composing) return;
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

    let result: SaveResult;
    try {
      result = await store.save(uid, next);
    } catch {
      setText(status, '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      status?.classList.add('is-error');
      return;
    }
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
    try {
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
    } catch {
      // ── 삼키지 않고 **사용자에게 말한다** ──────────────────────────────────
      // 그냥 두면 unhandled promise rejection 이 되고, 그것은 스모크의 `pageerror`
      // 축에 걸려 배포가 막힌다(실제로 이 테스트가 그렇게 잡았다). 더 중요한 것은
      // 화면 쪽이다 — 프로필이 안 실렸는데 폼이 비어 보이면 사용자는 "내 정보가
      // 날아갔다" 고 읽고, 그 위에 저장하면 진짜로 덮어쓴다.
      setText(mp(root, 'save-status'), '프로필을 불러오지 못했습니다. 새로고침해 주세요.');
      mp(root, 'save-status')?.classList.add('is-error');
    } finally {
      // ── `is-loading` 은 반드시 벗긴다 ─────────────────────────────────────
      // 마크업이 이 클래스를 **초기값으로** 달고 오고(CSS 가 편집 영역에
      // `pointer-events:none` 을 건다), 벗기는 책임은 JS 에 있다. 안 벗기면 화면이
      // 열리긴 하는데 **아무것도 입력되지 않는다** — 에러도 안 나고 콘솔도 조용하다.
      //
      // 실제로 그렇게 났다(2026-08-08). 마크업과 로직을 둘이 나눠 만들면 이런 경계가
      // 조용히 빈다: 마크업 쪽은 "JS 가 뗀다" 고 적었고, 로직 쪽은 그 문장을 못 봤다.
      // 단위 테스트도 못 잡는다 — 픽스처에는 그 클래스가 없기 때문이다.
      //
      // `finally` 인 것이 요점이다. 로드가 실패해도 화면은 열려야 한다. 저장이
      // 깨졌다고 사용자가 프로필을 **고칠 수조차 없게** 되는 것이 더 나쁘다.
      root.classList.remove('is-loading');
    }
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
    on(el, 'compositionstart', () => { composing = true; });
    on(el, 'compositionend', () => {
      composing = false;
      scheduleNicknameCheck();
    });
    // ── 안전망 (검수관 R2) ────────────────────────────────────────────────
    // 모바일 IME 는 `blur` 중 `compositionend` 를 빠뜨리는 알려진 버그가 있다.
    // 그러면 `composing` 이 **영영 true 로 남아 별명 판정이 화면에서 영구히
    // 멈춘다** — 사용자는 별명 칸에서 아무 피드백도 못 받고, 무엇이 잘못됐는지
    // 알 방법이 없다. 조합이 끝날 다른 신호에서도 함께 푼다.
    on(el, 'blur', () => {
      composing = false;
      scheduleNicknameCheck();
    });
    on(el, 'change', () => { composing = false; });
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
    void store.remove(uid)
      .then(() => reload())
      .catch(() => {
        setText(mp(root, 'save-status'), '초기화하지 못했습니다.');
        mp(root, 'save-status')?.classList.add('is-error');
      });
  });

  // ── 캐릭터 꾸미기 → 편집기가 **바로 열린다** ──────────────────────────────
  // 감독 지시 2026-08-08: *"캐릭터 꾸미기 누르면 캐릭터 디자인으로 바로 이동해야지."*
  //
  // 처음에는 `./index.html`(미술관 로비)로만 보냈다. 버튼 이름은 "캐릭터 꾸미기" 인데
  // 실제로는 미술관 입구에 떨어뜨리고 사용자가 편집기를 다시 찾게 만들었다 —
  // **버튼이 약속한 것과 일어나는 일이 달랐다.**
  //
  // 편집기 자체는 미술관 HUD 소유라(`ui-hud.ts`) 마이페이지 안에 인라인으로 띄우려면
  // HUD 컨텍스트를 흉내 내야 한다. 그 대신 딥링크로 **편집기가 열린 상태로** 보낸다.
  // `back=mypage` 는 돌아올 길이다 — 저장하든 닫든 여기로 되돌아온다.
  //
  // 진입점이 **둘**이다(감독 지시 2026-08-08 *"빨간 표시를 누르면 캐릭터 꾸미기 화면으로
  // 바로 가게 하자"* — Preview 의 아바타+이름 블록). 같은 함수를 공유한다: 두 곳에
  // 각각 적으면 미저장 확인이나 back 타깃이 한쪽만 바뀌는 형태가 열린다.
  const goAvatarEditor = () => {
    if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) return;
    window.location.href = buildAvatarDeepLink('./index.html', 'mypage');
  };
  on(mp(root, 'avatar-open'), 'click', goAvatarEditor);
  on(mp(root, 'preview-identity'), 'click', goAvatarEditor);

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
