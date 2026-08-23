// @vitest-environment jsdom
//
// 부팅 통합 — `createMyPage()` 를 실제로 돌린다.
//
// ── 왜 이 파일이 생겼나 (2026-08-08) ──────────────────────────────────────
// 마크업이 `class="mp is-loading"` 을 **초기값으로** 달고 오고, CSS 가 그 클래스에
// `pointer-events: none` 을 건다. 벗기는 책임은 JS 에 있는데 **아무도 안 벗겼다.**
//
// 결과는 조용했다 — 페이지는 정상으로 열리고, 콘솔 에러도 요청 실패도 0 이며,
// 계약 속성은 전부 제자리에 있다. 그런데 **아무것도 입력되지 않는다.** 실제 브라우저로
// 열어 보고서야 드러났다(playwright 가 "element is not visible" 로 30초를 기다렸다).
//
// 기존 테스트 세 겹이 전부 이것을 못 봤다:
//   · `mypage-view.test.ts`  — 픽스처를 계약 아는 사람이 써서 `is-loading` 이 없다
//   · `mypage-markup.test.ts` — 속성이 **있는지**만 본다. 클래스가 벗겨지는지는 모른다
//   · `mypage-store.test.ts`  — 화면을 아예 안 본다
//
// 빈 자리는 **마크업과 로직 사이**였다. 둘을 다른 사람이 만들면 그 경계가 넓어진다 —
// 마크업 쪽은 "JS 가 뗀다" 고 주석에 적었고, 로직 쪽은 그 문장을 못 봤다.
// 그래서 여기서는 픽스처에 **`is-loading` 을 실제로 달고** 부팅시킨다.
//
// ── 못 보는 것 ────────────────────────────────────────────────────────────
// CSS 가 실제로 무엇을 잠그는지는 jsdom 이 모른다(스타일시트를 안 읽는다). 여기서
// 보는 것은 "약속된 클래스가 벗겨지는가" 까지다. 화면이 정말 조작 가능한지는
// 배포 전 스모크(실제 브라우저)가 본다.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createMyPage } from '../frontend/js/mypage/app.js';
import { LocalProfileStore, type ProfileStore } from '../frontend/js/mypage/store.js';
import { emptyProfile, type Profile } from '../frontend/js/mypage/schema.js';
// 옷장은 **실제 저장소**를 쓴다 — 모킹하면 편집기와 같은 곳을 읽는다는 주장을
// 검증하지 못하고, 형식이 어긋나도 테스트만 통과한다.
import {
  currentUserId,
  saveCloset,
  readStoredChibi,
  readStoredChibiThumb,
  saveStoredChibi,
  saveStoredChibiThumb,
} from '../frontend/js/ui-chibi-store.js';

/** 실제 마크업과 같이 `is-loading` 을 달고 시작한다 — 그것이 이 파일의 요점이다. */
const FIXTURE = `
<div class="mp is-loading" data-mp="root">
  <div data-mp="preview">
    <button data-mp="preview-identity"></button>
    <img data-mp="preview-avatar" alt=""><span data-mp="preview-avatar-fallback"></span>
    <h2 data-mp="preview-name"></h2><span data-mp="preview-nickname"></span>
    <span data-mp="preview-type"></span><p data-mp="preview-bioshort"></p>
    <p data-mp="preview-bio"></p><span data-mp="preview-location"></span>
    <div data-mp="preview-genres"></div><div data-mp="preview-links"></div>
    <button data-mp="preview-inquiry"></button>
    <p data-mp="preview-empty"></p><p data-mp="preview-private"></p>
  </div>
  <button data-mp-tab="basic"></button><button data-mp-tab="about"></button>
  <button data-mp-tab="artist"></button>
  <section data-mp-panel="basic"></section><section data-mp-panel="about"></section>
  <section data-mp-panel="artist"></section>
  <input data-mp-field="nickname"><span data-mp-count="nickname"></span>
  <span data-mp-error="nickname"></span><div data-mp-suggest="nickname"></div>
  <input data-mp-field="displayName">
  <select data-mp-field="userType">
    <option value="artist"></option><option value="gallery"></option>
    <option value="collector"></option><option value="member"></option>
  </select>
  <input data-mp-field="bioShort"><span data-mp-count="bioShort"></span>
  <textarea data-mp-field="bio"></textarea><span data-mp-count="bio"></span>
  <input data-mp-field="location">
  <input type="checkbox" data-mp-field="genres" value="media">
  <textarea data-mp-field="exhibitions"></textarea><span data-mp-count="exhibitions"></span>
  <input data-mp-field="gallery">
  <input type="checkbox" data-mp-field="inquiryOpen">
  <input type="checkbox" data-mp-field="saleOpen">
  <div data-mp="links-list"></div><button data-mp="link-add"></button>
  <template data-mp="link-row"><div>
    <select data-mp-link="platform"></select><input data-mp-link="url">
    <span data-mp-link-labelbox><input data-mp-link="label"></span>
    <input type="checkbox" data-mp-link="visible"><button data-mp-link="remove"></button>
    <span data-mp-link="error"></span>
  </div></template>
  <input type="checkbox" data-mp-vis="profile"><input type="checkbox" data-mp-vis="bio">
  <input type="checkbox" data-mp-vis="location"><input type="checkbox" data-mp-vis="links">
  <input type="checkbox" data-mp-vis="email"><input type="checkbox" data-mp-vis="inquiry">
  <button data-mp="save"></button><span data-mp="save-status"></span>
  <img data-mp="avatar-thumb"><button data-mp="avatar-open"></button>
  <div data-mp="closet">
    <span data-mp="closet-count"></span>
    <p data-mp="closet-empty" hidden><span data-mp="closet-empty-guest" hidden></span></p>
    <p data-mp="closet-status"></p>
    <div data-mp="closet-list"></div>
    <template data-mp="closet-cell"><button data-mp-closet="load">
      <img data-mp-closet="thumb" alt=""><span data-mp-closet="name"></span>
    </button></template>
  </div>
  <span data-mp="account-provider"></span><button data-mp="account-reset"></button>
  <p data-mp="account-notice"></p>
</div>`;

let root: HTMLElement;

function mount(): HTMLElement {
  document.body.innerHTML = FIXTURE;
  return document.querySelector<HTMLElement>('[data-mp="root"]')!;
}

/** 부팅은 비동기다(`store.load`). 마이크로태스크가 가라앉을 때까지 기다린다. */
async function settle(): Promise<void> {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
}

beforeEach(() => {
  localStorage.clear();
  root = mount();
});

describe('부팅', () => {
  it('**`is-loading` 을 벗긴다** — 안 벗기면 화면이 조용히 잠긴다', async () => {
    expect(root.classList.contains('is-loading')).toBe(true);
    const app = createMyPage(root, new LocalProfileStore(() => 1000));
    await settle();
    expect(root.classList.contains('is-loading')).toBe(false);
    app.destroy();
  });

  it('저장소가 터져도 화면은 열린다 — 못 고치게 되는 것이 더 나쁘다', async () => {
    // `finally` 로 벗기는 이유가 이것이다. 로드 실패로 화면이 잠기면 사용자는
    // 프로필을 고칠 수조차 없다.
    const broken: ProfileStore = {
      authoritativeUniqueness: false,
      load: () => Promise.reject(new Error('boom')),
      save: () => Promise.reject(new Error('boom')),
      checkNickname: () => Promise.reject(new Error('boom')),
      remove: () => Promise.resolve(),
    };
    const app = createMyPage(root, broken);
    await settle();
    expect(root.classList.contains('is-loading')).toBe(false);
    app.destroy();
  });

  it('기본 탭이 열리고 나머지는 닫힌다', async () => {
    const app = createMyPage(root, new LocalProfileStore(() => 1000));
    await settle();
    expect(root.querySelector<HTMLElement>('[data-mp-panel="basic"]')!.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>('[data-mp-panel="about"]')!.hidden).toBe(true);
    expect(root.querySelector('[data-mp-tab="basic"]')!.getAttribute('aria-selected')).toBe('true');
    app.destroy();
  });

  it('저장된 프로필을 폼과 Preview 에 함께 올린다', async () => {
    const store = new LocalProfileStore(() => 1000);
    const saved: Profile = {
      ...emptyProfile(), nickname: 'arthong', displayName: 'ART.HONG',
      userType: 'artist', bioShort: '빛과 공간',
    };
    await store.save('guest', saved);

    const app = createMyPage(root, store);
    await settle();
    expect(root.querySelector<HTMLInputElement>('[data-mp-field="nickname"]')!.value).toBe('arthong');
    expect(root.querySelector('[data-mp="preview-name"]')!.textContent).toBe('ART.HONG');
    expect(root.querySelector('[data-mp="preview-type"]')!.textContent).toBe('작가');
    app.destroy();
  });
});

describe('편집 → Preview 반영', () => {
  it('입력하면 Preview 가 따라온다', async () => {
    const app = createMyPage(root, new LocalProfileStore(() => 1000));
    await settle();

    const bioShort = root.querySelector<HTMLInputElement>('[data-mp-field="bioShort"]')!;
    bioShort.value = '빛과 공간을 탐구합니다';
    bioShort.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    expect(root.querySelector('[data-mp="preview-bioshort"]')!.textContent).toBe('빛과 공간을 탐구합니다');
    app.destroy();
  });

  it('**공개 설정을 끄면 Preview 에서 즉시 사라진다** — publicView 를 통과한다는 증거다', async () => {
    // `refreshPreview` 가 `publicView()` 를 건너뛰고 원본을 그리면 이 단언이 깨진다.
    // 화면 코드가 판정을 우회하지 않는지 보는 유일한 자리다.
    const app = createMyPage(root, new LocalProfileStore(() => 1000));
    await settle();

    const bioShort = root.querySelector<HTMLInputElement>('[data-mp-field="bioShort"]')!;
    bioShort.value = '숨길 소개';
    bioShort.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(root.querySelector<HTMLElement>('[data-mp="preview-bioshort"]')!.hidden).toBe(false);

    const visBio = root.querySelector<HTMLInputElement>('[data-mp-vis="bio"]')!;
    visBio.checked = false;
    visBio.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
    expect(root.querySelector<HTMLElement>('[data-mp="preview-bioshort"]')!.hidden).toBe(true);
    app.destroy();
  });
});

describe('저장', () => {
  it('저장하면 결과를 알리고 다시 열었을 때 남아 있다', async () => {
    const store = new LocalProfileStore(() => 1000);
    const app = createMyPage(root, store);
    await settle();

    const nick = root.querySelector<HTMLInputElement>('[data-mp-field="nickname"]')!;
    nick.value = 'arthong';
    nick.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector<HTMLButtonElement>('[data-mp="save"]')!.click();
    await settle();

    expect(root.querySelector('[data-mp="save-status"]')!.textContent).toContain('저장했습니다');
    expect((await store.load('guest'))?.nickname).toBe('arthong');
    app.destroy();
  });

  it('별명이 규칙에 안 맞으면 저장하지 않고 이유를 말한다', async () => {
    const store = new LocalProfileStore(() => 1000);
    const app = createMyPage(root, store);
    await settle();

    const nick = root.querySelector<HTMLInputElement>('[data-mp-field="nickname"]')!;
    nick.value = 'admin';
    nick.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector<HTMLButtonElement>('[data-mp="save"]')!.click();
    await settle();

    expect(root.querySelector('[data-mp="save-status"]')!.textContent).toContain('운영자');
    expect(await store.load('guest')).toBe(null);
    app.destroy();
  });
});

describe('계정', () => {
  it('로그인이 mock 이라는 사실을 숨기지 않는다', async () => {
    const app = createMyPage(root, new LocalProfileStore(() => 1000));
    await settle();
    const notice = root.querySelector<HTMLElement>('[data-mp="account-notice"]')!;
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toContain('시험용');
    app.destroy();
  });

  it('프로필 초기화는 확인을 받고서야 지운다', async () => {
    const store = new LocalProfileStore(() => 1000);
    await store.save('guest', { ...emptyProfile(), nickname: 'arthong' });
    const app = createMyPage(root, store);
    await settle();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    root.querySelector<HTMLButtonElement>('[data-mp="account-reset"]')!.click();
    await settle();
    expect((await store.load('guest'))?.nickname).toBe('arthong'); // 취소했으면 남는다

    confirmSpy.mockReturnValue(true);
    root.querySelector<HTMLButtonElement>('[data-mp="account-reset"]')!.click();
    await settle();
    expect(await store.load('guest')).toBe(null);

    confirmSpy.mockRestore();
    app.destroy();
  });
});

describe('destroy', () => {
  it('이벤트를 떼어 낸다 — 뗀 뒤의 입력은 아무 일도 하지 않는다', async () => {
    const app = createMyPage(root, new LocalProfileStore(() => 1000));
    await settle();
    app.destroy();

    const before = root.querySelector('[data-mp="preview-bioshort"]')!.textContent;
    const bioShort = root.querySelector<HTMLInputElement>('[data-mp-field="bioShort"]')!;
    bioShort.value = '뗀 뒤 입력';
    bioShort.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(root.querySelector('[data-mp="preview-bioshort"]')!.textContent).toBe(before);
  });
});

// ── GS-4 (검수관 명세, 2026-08-08) ──────────────────────────────────────────
// **한글 IME 조합 중에는 별명 판정을 하지 않는다.**
//
// 검수관이 이 배선의 검출력이 **0** 임을 실측했다 — `if (composing) return;` 을 지워도,
// `compositionend` 리스너를 통째로 지워도 152개가 전부 통과했다.
//
// 특히 `compositionend` 제거가 크다: `composing` 이 **영영 `true` 로 남아 별명 판정이
// 화면에서 영구히 멈춘다.** 사용자는 별명 칸에서 아무 피드백도 못 받고 무엇이
// 잘못됐는지 알 방법이 없다. 증상은 큰데 검사가 없는 형태다.
//
// ── 여기서 재는 것이 무엇인지 정확히 ──────────────────────────────────────
// **IME 가 실기기에서 어떤 순서로 이벤트를 쏘는지는 못 잰다**(jsdom 이다).
// 재는 것은 **`composing` 플래그가 판정을 막는가** — 그건 우리가 쓴 상태 기계라
// jsdom 으로 완전히 잰다. 이 구별이 요점이다. 검수관 표현대로 *"재는 대상을 잘못
// 잡으면"* 못 잴 것을 재려다 아무것도 안 재게 된다.
describe('별명 — 한글 IME 조합', () => {
  const feedback = () => root.querySelector<HTMLElement>('[data-mp-error="nickname"]')!;

  /** 디바운스(220ms)보다 넉넉히 기다린다. */
  const afterDebounce = () => new Promise((r) => setTimeout(r, 350));

  async function boot() {
    const app = createMyPage(root, new LocalProfileStore(() => 1000));
    await settle();
    return app;
  }

  it('**조합 중에는 판정이 뜨지 않는다** — 중간 자모에 빨간 경고가 깜빡이면 안 된다', async () => {
    const app = await boot();
    const input = root.querySelector<HTMLInputElement>('[data-mp-field="nickname"]')!;

    input.dispatchEvent(new Event('compositionstart', { bubbles: true }));
    // "홍길동" 을 치는 중간 상태. 이대로 판정하면 'jamo' 오류가 뜬다.
    input.value = '홍ㄱ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await afterDebounce();

    expect(feedback().textContent, '조합 중에 판정이 떴다').toBe('');
    app.destroy();
  });

  it('**조합이 끝나면 한 번 판정한다**', async () => {
    const app = await boot();
    const input = root.querySelector<HTMLInputElement>('[data-mp-field="nickname"]')!;

    input.dispatchEvent(new Event('compositionstart', { bubbles: true }));
    input.value = '홍ㄱ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await afterDebounce();
    expect(feedback().textContent).toBe('');

    input.value = '홍길동';
    input.dispatchEvent(new Event('compositionend', { bubbles: true }));
    await afterDebounce();

    // 완성된 한글은 통과한다 — 그리고 중복은 모르는 상태다.
    expect(feedback().textContent).toContain('쓸 수 있는 형식입니다');
    expect(feedback().classList.contains('is-pending')).toBe(true);
    app.destroy();
  });

  it('**`blur` 로도 조합이 풀린다** — 모바일 IME 가 compositionend 를 빠뜨려도 멈추지 않는다', async () => {
    // 검수관 R2. `compositionend` 가 안 오면 `composing` 이 영영 true 로 남는다.
    const app = await boot();
    const input = root.querySelector<HTMLInputElement>('[data-mp-field="nickname"]')!;

    input.dispatchEvent(new Event('compositionstart', { bubbles: true }));
    input.value = '홍길동';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await afterDebounce();
    expect(feedback().textContent).toBe('');

    // compositionend 없이 blur 만 — 모바일에서 실제로 나는 형태.
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await afterDebounce();

    expect(feedback().textContent, 'blur 뒤에도 판정이 멈춰 있다').not.toBe('');
    app.destroy();
  });

  it('영문 입력은 조합 이벤트가 없으므로 그대로 즉시 판정한다', async () => {
    const app = await boot();
    const input = root.querySelector<HTMLInputElement>('[data-mp-field="nickname"]')!;
    input.value = 'arthong';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await afterDebounce();
    expect(feedback().textContent).toContain('쓸 수 있는 형식입니다');
    app.destroy();
  });
});

// 감독 지시 2026-08-08: *"빨간 표시를 누르면 캐릭터 꾸미기 화면으로 바로 가게 하자"*
// — Preview 의 아바타+이름 블록이 두 번째 진입점이다.
//
// **두 진입점이 같은 곳으로 가는지**를 본다. 각각 따로 배선하면 미저장 확인이나 back
// 타깃이 한쪽만 바뀌는 형태가 열리는데, 그것은 화면에서 조용하다(둘 다 "이동은 한다").
describe('캐릭터 편집 진입점 — 둘이 같은 곳으로 간다', () => {
  /**
   * jsdom 은 실제 이동을 안 하므로 `href` 대입을 가로챈다.
   *
   * ── ⚠ `reset()` 이 이 하네스의 핵심이다 (검수관 B1, 2026-08-08) ──────────────
   * 첫 판본은 `get()` 만 있었고 **검출력이 0이었다.** `get()` 은 *마지막으로 대입된*
   * href 를 돌려주는데, preview 클릭 **직전에 탭 클릭이 이미 값을 넣어 둔다.**
   * 그래서 preview 배선을 통째로 지워도 잔상이 남아 네 단언이 **전부 통과**했다
   * (실측: 배선 줄 삭제 → 전체 2053 테스트에서 추가 실패 **0**).
   *
   * **"같음" 을 단언하는 테스트는 "둘 다 안 움직임" 도 같음으로 읽는다.** 정합 검사에는
   * **측정기 생존**(각 축이 실제로 값을 냈는가)이 반드시 함께 있어야 한다 — 이 저장소가
   * `minY` 빈 배열의 평균 0 이 단언을 통과시킨 일로 이미 지불한 형태다.
   *
   * `restore()` 도 함께 둔다. `window.location` 을 Proxy 로 덮은 채 두면 뒤에 오는
   * 테스트가 같은 전역을 읽어 오염된다.
   */
  function captureNav(): { get(): string; reset(): void; restore(): void } {
    let last = '';
    const original = Object.getOwnPropertyDescriptor(window, 'location');
    const loc = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new Proxy(loc, {
        set(_t, prop, value) {
          if (prop === 'href') { last = String(value); return true; }
          return Reflect.set(loc, prop, value);
        },
        get(t, prop) {
          const v = Reflect.get(t, prop);
          return typeof v === 'function' ? v.bind(t) : v;
        },
      }),
    });
    return {
      get: () => last,
      reset: () => { last = ''; },
      restore: () => {
        if (original) Object.defineProperty(window, 'location', original);
      },
    };
  }

  async function bootApp() {
    const app = createMyPage(root, new LocalProfileStore(() => 1000));
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    return app;
  }

  it('「캐릭터」 탭 버튼과 Preview 신원 블록이 **같은 URL** 로 보낸다', async () => {
    const nav = captureNav();
    const app = await bootApp();
    try {
      nav.reset();
      root.querySelector<HTMLElement>('[data-mp="avatar-open"]')!.click();
      const fromTab = nav.get();

      // ⚠ **리셋하지 않으면 아래 전부가 잔상을 검사한다**(위 주석의 B1).
      nav.reset();
      root.querySelector<HTMLElement>('[data-mp="preview-identity"]')!.click();
      const fromPreview = nav.get();

      expect(fromTab, '탭 버튼이 이동하지 않았다').toBeTruthy();
      expect(fromPreview, 'Preview 신원 블록이 이동하지 않았다').toBeTruthy();
      expect(fromPreview).toBe(fromTab);
      // 편집기가 **열린 채로** 열려야 한다. 로비에 떨어뜨리면 버튼이 약속한 것과 다르다.
      expect(fromPreview).toContain('avatar=1');
      // 돌아올 길이 있어야 한다 — 없으면 편집 후 미술관에 갇힌다.
      expect(fromPreview).toContain('back=mypage');
    } finally {
      app.destroy();
      nav.restore();
    }
  });

  // 검수관 P2. 위 테스트는 **URL 만** 본다 — preview 쪽이 `goAvatarEditor` 를 안 쓰고
  // 미저장 확인 없이 같은 URL 로 이동해도 원리상 못 잡는다. 그 축을 따로 건다.
  it('미저장 변경이 있으면 **두 진입점 다** 확인을 묻는다', async () => {
    const nav = captureNav();
    const app = await bootApp();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    try {
      // 값을 고쳐 dirty 로 만든다.
      const input = root.querySelector<HTMLInputElement>('[data-mp-field="displayName"]')!;
      input.value = '고친 이름';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      for (const key of ['avatar-open', 'preview-identity']) {
        confirmSpy.mockClear();
        nav.reset();
        root.querySelector<HTMLElement>(`[data-mp="${key}"]`)!.click();
        expect(confirmSpy, `${key} 가 미저장 확인을 묻지 않았다`).toHaveBeenCalledTimes(1);
        // 사용자가 취소했으므로 **이동하면 안 된다** — 여기서 편집 내용을 잃는다.
        expect(nav.get(), `${key} 가 취소를 무시하고 이동했다`).toBe('');
      }
    } finally {
      confirmSpy.mockRestore();
      app.destroy();
      nav.restore();
    }
  });
});

// 감독 지시 2026-08-08: *"옷장리스트가 나오게 해줘."*
//
// **편집기와 같은 저장소를 읽는가**가 요점이라 `saveCloset` 을 그대로 불러 심는다.
//
// ⚠ **그러나 그것으로 묶이는 것은 「어디에」뿐이고 「무엇을」은 안 묶인다**
// (검수관 C3 실측, 2026-08-08). 첫 판본 주석은 *"형식이 바뀌면 함께 깨져야 한다"* 고
// 적었고 **거짓이었다** — `readCloset` 은 `Array.isArray` 외에 검증을 **0건** 하는 JSON
// 통과기라, 편집기가 슬롯 키 `name` 을 `label` 로 바꿔도(= 사용자는 이름 없는 빈 버튼을
// 보게 된다) 전체 2101 테스트에서 **추가 실패 0** 이었다. 형식을 다시 적은 곳은 아래
// `SLOT_A/SLOT_B` 리터럴, 즉 **이 픽스처 자신**이었다.
//
// 그래서 문장을 고치는 대신 **참으로 만든다** — 맨 아래 「생산자 계약」 테스트가 편집기의
// 슬롯 생성부를 읽어 키를 대조한다. 키 프리픽스(저장 위치) 축은 별개로 이미 잡힌다.
describe('내 옷장', () => {
  async function bootApp() {
    const app = createMyPage(root, new LocalProfileStore(() => 1000));
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    return app;
  }

  const SLOT_A = {
    id: 'c1', name: '초록 원피스', ts: 1,
    look: { species: 'human', outfit: 'dress' },
    thumb: 'data:image/jpeg;base64,AAAA',
  };
  const SLOT_B = {
    id: 'c2', name: '파란 후디', ts: 2,
    look: { species: 'human', outfit: 'hoodie' },
    thumb: 'data:image/jpeg;base64,BBBB',
  };

  const cells = () => Array.from(root.querySelectorAll<HTMLElement>('[data-mp-closet="load"]'));

  it('비어 있으면 **안내를 보여주고 목록은 비운다**', async () => {
    const app = await bootApp();
    expect(cells().length).toBe(0);
    // 빈 화면과 "로드 실패" 는 구별되지 않는다 — 문구가 그 구별을 만든다.
    expect(root.querySelector<HTMLElement>('[data-mp="closet-empty"]')!.hidden).toBe(false);
    app.destroy();
  });

  it('저장된 옷을 **편집기와 같은 저장소에서** 읽어 그린다', async () => {
    saveCloset([SLOT_A, SLOT_B], currentUserId());
    const app = await bootApp();

    expect(cells().length, '옷장 칸이 그려지지 않았다').toBe(2);
    expect(cells()[0].textContent).toContain('초록 원피스');
    expect(cells()[1].textContent).toContain('파란 후디');
    // 이름만으로는 **무엇을 하는 버튼인지** 안 읽힌다.
    expect(cells()[0].getAttribute('aria-label')).toBe('초록 원피스 입기');
    expect(root.querySelector<HTMLElement>('[data-mp="closet-empty"]')!.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('[data-mp="closet-count"]')!.textContent).toBe('2벌');
    app.destroy();
  });

  it('누르면 **그 옷으로 갈아입는다** — 저장분과 썸네일이 함께 바뀐다', async () => {
    saveCloset([SLOT_A, SLOT_B], currentUserId());
    const app = await bootApp();

    cells()[1].click();

    const uid = currentUserId();
    // `look` 만 바꾸고 썸네일을 안 바꾸면 화면과 실제 캐릭터가 어긋난다.
    expect(readStoredChibi(uid)).toEqual(SLOT_B.look);
    expect(readStoredChibiThumb(uid)).toBe(SLOT_B.thumb);
    // 캐릭터 탭 썸네일도 즉시 따라와야 한다(안 따라오면 눌러도 아무 일 없어 보인다).
    expect(root.querySelector<HTMLImageElement>('[data-mp="avatar-thumb"]')!.src).toContain('BBBB');
    // ⚠ **Preview 아바타 축** (검수관 C1/M1). 첫 판본은 이 줄이 없어서 `refreshPreview()`
    // 를 지워도 통과했다 — 갱신 지점 넷 중 하나에 측정기가 없었고, 그것은 화면에서
    // 조용하다(캐릭터 탭만 바뀌고 위쪽 미리보기는 옛 옷 그대로 남는다).
    expect(
      root.querySelector<HTMLImageElement>('[data-mp="preview-avatar"]')!.src,
      'Preview 아바타가 안 따라왔다 — 두 화면이 어긋난다',
    ).toContain('BBBB');
    // ⚠ **프로필 저장 상태줄이 아니라 옷장 전용 줄**이다(검수관 P5) — 공유하면
    // "저장하지 않은 변경이 있습니다" 경고가 지워져 저장된 것처럼 읽힌다.
    expect(root.querySelector<HTMLElement>('[data-mp="closet-status"]')!.textContent).toContain('갈아입었');
    app.destroy();
  });

  it('`look` 이 없는 슬롯은 **아무 일도 하지 않는다** — 옛 저장분 방어', async () => {
    // ⚠ **대조군을 먼저 심는다** (검수관 C1/M9, 2026-08-08).
    // 첫 판본은 아무것도 안 심고 `before = null` 상태에서 `toEqual(before)` 를 단언했다.
    // 그러면 가드를 약화했을 때(`!slot?.look` → `!slot`) `saveStoredChibi(undefined)` 가
    // 문자열 `"undefined"` 를 넣고 → 읽기의 `JSON.parse` 가 던져 **`null` 을 반환**한다.
    // 즉 **저장된 캐릭터가 파괴됐는데 `null === null` 로 통과**했다. 실측으로 확인된
    // 검출력 0이고, 하루 전 같은 파일에서 나온 「측정기 생존」이 그대로 재발한 것이다.
    saveStoredChibi({ species: 'human', outfit: 'original' }, currentUserId());
    saveCloset([{ id: 'c3', name: '깨진 것', ts: 3 }], currentUserId());
    const app = await bootApp();

    const before = readStoredChibi(currentUserId());
    expect(before, '대조군이 null 이면 이 단언은 파괴를 못 잡는다').not.toBe(null);

    cells()[0].click();

    expect(readStoredChibi(currentUserId())).toEqual(before);
    app.destroy();
  });

  // 검수관 E1. 옷장은 **로그인 전용**이라(편집기가 탭 자체를 숨긴다) 빈 안내에 로그인
  // 문구를 덧붙였는데, 그것은 **게스트에게만 참**이다. 로그인 사용자에게 뜨면 거짓말이다.
  //
  // ⚠ 이 테스트가 생긴 경위 자체가 값이다 — 바로 앞 커밋에서 *"픽스처와 마크업이 갈린
  // 곳은 전부 이 구멍이다"* 라고 **일반화를 적어 놓고**, 같은 커밋에서 이 요소를 마크업에
  // 추가하면서 계약 배열에도 픽스처에도 안 넣었다. **일반화를 적은 순간 그 문장이 적용될
  // 자리를 세지 않으면, 다음 사람은 그 문장을 읽고 확인을 생략한다.**
  it('빈 옷장 안내 — 로그인 문구는 **게스트에게만** 뜬다', async () => {
    const guest = await bootApp();
    expect(
      root.querySelector<HTMLElement>('[data-mp="closet-empty-guest"]')!.hidden,
      '게스트에게 로그인 안내가 안 뜬다',
    ).toBe(false);
    guest.destroy();

    // 로그인 상태를 만드는 수단은 저장소에 이미 있다(`mypage-store.test.ts` 와 같은 패턴).
    const { loginWith } = await import('../frontend/js/auth.js');
    await loginWith('google');
    root = mount();
    const member = await bootApp();
    expect(
      root.querySelector<HTMLElement>('[data-mp="closet-empty-guest"]')!.hidden,
      '로그인 사용자에게 "로그인이 필요합니다" 가 뜬다 — 거짓말이다',
    ).toBe(true);
    member.destroy();
  });

  // 검수관 D2. 「갈아입기」 테스트가 `wearFromCloset` 안의 호출로 통과해 버려서,
  // **부팅 때 썸네일이 아예 안 그려져도 초록**이었다. 그 축을 따로 건다.
  it('부팅하면 저장된 아바타 썸네일을 **캐릭터 탭에 그린다**', async () => {
    saveStoredChibiThumb('data:image/jpeg;base64,CCCC', currentUserId());
    const app = await bootApp();
    const img = root.querySelector<HTMLImageElement>('[data-mp="avatar-thumb"]')!;
    expect(img.src, '부팅 시 썸네일이 안 그려졌다').toContain('CCCC');
    expect(img.hidden).toBe(false);
    app.destroy();
  });

  // 검수관 P5. 갈아입기가 프로필 저장 상태줄을 쓰면 미저장 경고가 지워지고 초록으로
  // 바뀐다 — `dirty` 는 그대로라 **저장이 안 됐는데 된 것처럼 읽힌다.**
  it('갈아입어도 **미저장 경고를 지우지 않는다** — 상태줄이 별개다', async () => {
    saveCloset([SLOT_A], currentUserId());
    const app = await bootApp();

    const input = root.querySelector<HTMLInputElement>('[data-mp-field="displayName"]')!;
    input.value = '고친 이름';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const warning = root.querySelector<HTMLElement>('[data-mp="save-status"]')!.textContent;
    expect(warning, '대조군이 비면 이 단언은 아무것도 안 잡는다').toContain('저장하지 않은');

    cells()[0].click();

    expect(root.querySelector<HTMLElement>('[data-mp="save-status"]')!.textContent).toBe(warning);
    expect(root.querySelector<HTMLElement>('[data-mp="closet-status"]')!.textContent).toContain('갈아입었');
    app.destroy();
  });

  // 검수관 P11. 이름도 썸네일도 없는 옛 슬롯이 **라벨도 그림도 없는 빈 버튼**이 되면
  // 스크린리더에는 " 입기" 로, 화면에는 빈칸으로 나온다.
  it('이름이 빈 슬롯도 **읽을 수 있는 라벨**을 갖는다', async () => {
    saveCloset([{ id: 'c9', ts: 9, look: { species: 'human' } }], currentUserId());
    const app = await bootApp();
    expect(cells()[0].textContent?.trim()).toBeTruthy();
    expect(cells()[0].getAttribute('aria-label')).not.toBe(' 입기');
    app.destroy();
  });

  it('썸네일이 없는 슬롯은 **깨진 이미지를 보이지 않는다**', async () => {
    saveCloset([{ id: 'c4', name: '썸네일 없음', ts: 4, look: { species: 'human' } }], currentUserId());
    const app = await bootApp();
    const img = cells()[0].querySelector<HTMLImageElement>('[data-mp-closet="thumb"]')!;
    // `src` 가 빈 `<img>` 는 브라우저에서 깨진 아이콘으로 나온다.
    expect(img.hidden).toBe(true);
    app.destroy();
  });
});

// 옷장 슬롯의 **생산자는 편집기**(`ui-avatar-editor.ts`)이고 소비자가 마이페이지다.
// 그 사이에는 검증이 없다 — `readCloset` 은 JSON 을 그대로 통과시킨다. 그래서 생산자가
// 키 이름을 바꾸면 소비자는 조용히 빈 값을 그린다(실측: 이름 없는 빈 버튼).
//
// 이 검사는 **소스를 읽어 계약을 대조**한다. 런타임 값이 아니라 문자열을 보는 것이므로
// 강한 축은 아니지만, 이 저장소에서 실제로 일어난 형태(생산자만 바꾸고 소비자를 잊음)를
// 잡는다. **못 잡는 것**: 키 이름이 같은데 의미가 바뀌는 것(`thumb` 이 URL → Blob 등),
// 편집기가 슬롯을 다른 자리에서도 만드는 경우(지금은 한 곳이다).
describe('옷장 슬롯 — 생산자(편집기) 계약', () => {
  it('편집기가 만드는 슬롯이 마이페이지가 읽는 키를 **전부** 가진다', () => {
    const src = readFileSync(
      resolve(import.meta.dirname, '../frontend/js/ui-avatar-editor.ts'),
      'utf8',
    );
    const block = /const slot\s*=\s*\{([\s\S]*?)\n\s*\};/.exec(src);
    expect(block, '편집기의 슬롯 생성부를 못 찾았다 — 이 검사가 낡았다').not.toBe(null);

    const keys = new Set(
      [...block![1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1]),
    );
    // 마이페이지가 실제로 읽는 것들(`app.ts` 의 `renderCloset`·`wearFromCloset`).
    for (const key of ['name', 'look', 'thumb']) {
      expect(keys.has(key), `편집기 슬롯에 '${key}' 가 없다 — 마이페이지가 빈 값을 그린다`).toBe(true);
    }
  });
});
