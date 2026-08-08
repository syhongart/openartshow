// @vitest-environment jsdom
//
// 화면 통합 — **판정이 실제로 소비되는가**.
//
// ── 왜 이 파일이 있는가 ───────────────────────────────────────────────────
// 이 저장소가 명문화한 사고 형태: *"판정/집행 분리의 구멍 — 경계를 건너는 지점은
// 아무도 안 본다. 순수 함수로 두면 각 쪽은 테스트하기 쉬워지지만, '계산된 값이 실제로
// 소비되는가' 는 양쪽 테스트 어디에도 안 걸린다."* 구름 alpha 미소비가 정확히 그렇게
// 빠져나갔다 — 순수 함수 테스트는 통과했고 통합 지점은 아무도 안 봤다.
//
// 그래서 여기서 보는 것은 `publicView()` 가 맞는 값을 내는가가 아니라(그건
// `mypage-visibility.test.ts` 소관), **그 값이 DOM 에 닿는가**다.
//
// ── 못 보는 것 ────────────────────────────────────────────────────────────
// 실제 `frontend/mypage.html` 이 이 계약을 지키는지는 여기서 못 본다 — 아래 픽스처는
// 계약을 아는 사람이 직접 쓴 마크업이라 당연히 지킨다. 그 축은 별도 테스트
// (`mypage-markup.test.ts`)가 실제 HTML 파일을 읽어서 본다.

import { describe, it, expect, beforeEach } from 'vitest';
import { emptyProfile, type Profile } from '../frontend/js/mypage/schema.js';
import { publicView } from '../frontend/js/mypage/visibility.js';
import { renderPreview } from '../frontend/js/mypage/view-preview.js';
import {
  writeForm,
  readForm,
  renderCounters,
  renderNicknameFeedback,
  reflectMasterSwitch,
  reflectUserType,
} from '../frontend/js/mypage/view-form.js';
import { writeLinks, readLinks, addLinkRow } from '../frontend/js/mypage/view-links.js';
import { checkNickname } from '../frontend/js/mypage/nickname.js';

/** 계약 속성만 담은 최소 마크업. 룩은 디자이너 몫이라 여기 없다. */
const FIXTURE = `
<div data-mp="root">
  <div data-mp="preview">
    <img data-mp="preview-avatar" alt="">
    <span data-mp="preview-avatar-fallback"></span>
    <h2 data-mp="preview-name"></h2>
    <span data-mp="preview-nickname"></span>
    <span data-mp="preview-type"></span>
    <p data-mp="preview-bioshort"></p>
    <p data-mp="preview-bio"></p>
    <span data-mp="preview-location"></span>
    <div data-mp="preview-genres"></div>
    <div data-mp="preview-links"></div>
    <button data-mp="preview-inquiry">작품 문의</button>
    <p data-mp="preview-empty">아직 소개가 없습니다</p>
    <p data-mp="preview-private">비공개입니다</p>
  </div>

  <button data-mp-tab="basic">기본</button>
  <button data-mp-tab="artist">작가</button>
  <section data-mp-panel="basic"></section>
  <section data-mp-panel="artist"></section>

  <input data-mp-field="nickname">
  <span data-mp-count="nickname"></span>
  <span data-mp-error="nickname"></span>
  <div data-mp-suggest="nickname"></div>

  <input data-mp-field="displayName">
  <select data-mp-field="userType">
    <option value="artist">작가</option>
    <option value="gallery">갤러리</option>
    <option value="collector">컬렉터</option>
    <option value="member">일반</option>
  </select>
  <input data-mp-field="bioShort">
  <span data-mp-count="bioShort"></span>
  <textarea data-mp-field="bio"></textarea>
  <span data-mp-count="bio"></span>
  <input data-mp-field="location">
  <input type="checkbox" data-mp-field="genres" value="painting">
  <input type="checkbox" data-mp-field="genres" value="photo">
  <input type="checkbox" data-mp-field="genres" value="media">
  <textarea data-mp-field="exhibitions"></textarea>
  <span data-mp-count="exhibitions"></span>
  <input data-mp-field="gallery">
  <label data-mp-row><input type="checkbox" data-mp-field="inquiryOpen"></label>
  <label data-mp-row><input type="checkbox" data-mp-field="saleOpen"></label>

  <div data-mp="links-list"></div>
  <button data-mp="link-add">추가</button>
  <template data-mp="link-row">
    <div class="row">
      <select data-mp-link="platform"></select>
      <input data-mp-link="url">
      <span data-mp-link-labelbox><input data-mp-link="label"></span>
      <input type="checkbox" data-mp-link="visible">
      <button data-mp-link="remove">삭제</button>
      <span data-mp-link="error"></span>
    </div>
  </template>

  <label data-mp-vis-row><input type="checkbox" data-mp-vis="profile"></label>
  <label data-mp-vis-row><input type="checkbox" data-mp-vis="bio"></label>
  <label data-mp-vis-row><input type="checkbox" data-mp-vis="location"></label>
  <label data-mp-vis-row><input type="checkbox" data-mp-vis="links"></label>
  <label data-mp-vis-row><input type="checkbox" data-mp-vis="email"></label>
  <label data-mp-vis-row><input type="checkbox" data-mp-vis="inquiry"></label>
</div>`;

let root: HTMLElement;

function mount(): HTMLElement {
  document.body.innerHTML = FIXTURE;
  return document.querySelector<HTMLElement>('[data-mp="root"]')!;
}

function get(name: string): HTMLElement {
  return root.querySelector<HTMLElement>(`[data-mp="${name}"]`)!;
}

function filled(overrides: Partial<Profile> = {}): Profile {
  return {
    ...emptyProfile(),
    nickname: 'arthong',
    displayName: 'ART.HONG',
    userType: 'artist',
    bioShort: '빛과 공간을 탐구합니다',
    bio: '미디어 아티스트입니다.',
    location: '서울',
    genres: ['media', 'photo'],
    inquiryOpen: true,
    links: [
      { platform: 'instagram', url: 'https://instagram.com/arthong', handle: 'arthong', label: '', sortOrder: 0, isVisible: true },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  root = mount();
});

describe('renderPreview — 판정이 DOM 에 닿는가', () => {
  it('공개 프로필의 값이 그대로 화면에 찍힌다', () => {
    renderPreview(root, publicView(filled()));
    expect(get('preview-name').textContent).toBe('ART.HONG');
    expect(get('preview-nickname').textContent).toBe('@arthong');
    expect(get('preview-type').textContent).toBe('작가');
    expect(get('preview-bioshort').textContent).toBe('빛과 공간을 탐구합니다');
    expect(get('preview-location').textContent).toBe('서울');
    expect(get('preview-genres').children.length).toBe(2);
    expect(get('preview-links').children.length).toBe(1);
    expect(get('preview-inquiry').hidden).toBe(false);
  });

  it('**공개 설정을 끄면 화면에서 사라진다** — 이 단언이 이 파일의 존재 이유다', () => {
    const p = filled();
    p.visibility.bio = false;
    p.visibility.location = false;
    p.visibility.links = false;
    renderPreview(root, publicView(p));
    // 값이 남아 있으면 사용자가 숨긴 것이 남의 눈에 보인다.
    expect(get('preview-bioshort').hidden).toBe(true);
    expect(get('preview-bioshort').textContent).toBe('');
    expect(get('preview-location').hidden).toBe(true);
    expect(get('preview-links').children.length).toBe(0);
    expect(get('preview-links').hidden).toBe(true);
  });

  it('마스터 스위치를 끄면 비공개 안내가 뜨고 본문이 전부 사라진다', () => {
    const p = filled();
    p.visibility.profile = false;
    renderPreview(root, publicView(p));
    expect(get('preview').classList.contains('is-private')).toBe(true);
    expect(get('preview-private').hidden).toBe(false);
    expect(get('preview-bioshort').hidden).toBe(true);
    expect(get('preview-genres').children.length).toBe(0);
    expect(get('preview-inquiry').hidden).toBe(true);
    // 별명은 남는다 — 주소로 도달했을 때 무엇인지는 알려야 한다.
    expect(get('preview-nickname').textContent).toBe('@arthong');
  });

  it('빈 프로필에는 안내를 띄운다', () => {
    renderPreview(root, publicView({ ...emptyProfile(), nickname: 'hong' }));
    expect(get('preview-empty').hidden).toBe(false);
    // 비공개 안내와 함께 뜨지 않는다 — 화면이 두 번 사과하지 않는다.
    expect(get('preview-private').hidden).toBe(true);
  });

  it('링크는 새 창 + noopener 로 연다 — 탭내빙 차단', () => {
    renderPreview(root, publicView(filled()));
    const a = get('preview-links').querySelector('a')!;
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('href')).toBe('https://instagram.com/arthong');
    expect(a.textContent).toBe('@arthong');
  });

  it('사용자가 적은 글은 마크업으로 실행되지 않는다', () => {
    const p = filled({ bioShort: '<img src=x onerror=alert(1)>' });
    renderPreview(root, publicView(p));
    const slot = get('preview-bioshort');
    expect(slot.querySelector('img')).toBe(null);
    expect(slot.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('사진이 없으면 이니셜로 떨어진다', () => {
    renderPreview(root, publicView(filled()));
    expect(get('preview-avatar').hidden).toBe(true);
    expect(get('preview-avatar-fallback').hidden).toBe(false);
    expect(get('preview-avatar-fallback').textContent).toBe('A');

    renderPreview(root, publicView(filled()), { avatarThumb: 'data:image/png;base64,iVBORw0KGgo=' });
    expect(get('preview-avatar').hidden).toBe(false);
    expect(get('preview-avatar-fallback').hidden).toBe(true);
  });
});

describe('writeForm / readForm — 왕복', () => {
  it('쓴 값을 그대로 읽는다', () => {
    const p = filled();
    writeForm(root, p);
    const back = readForm(root, emptyProfile());
    expect(back.nickname).toBe('arthong');
    expect(back.displayName).toBe('ART.HONG');
    expect(back.userType).toBe('artist');
    expect(back.bioShort).toBe(p.bioShort);
    expect(back.location).toBe('서울');
    expect(new Set(back.genres)).toEqual(new Set(['media', 'photo']));
    expect(back.inquiryOpen).toBe(true);
    expect(back.visibility.email).toBe(false);
    expect(back.visibility.profile).toBe(true);
  });

  it('readForm 은 링크를 건드리지 않는다 — 그건 view-links 소관이다', () => {
    const base = filled();
    writeForm(root, base);
    expect(readForm(root, base).links).toBe(base.links);
  });
});

describe('글자수 카운터', () => {
  it('상한을 LIMITS 에서 읽어 표시한다 — 마크업에 숫자를 적지 않는다', () => {
    writeForm(root, filled({ bioShort: '열두글자입니다여기' }));
    renderCounters(root, 'artist');
    expect(root.querySelector('[data-mp-count="bioShort"]')!.textContent).toBe('9 / 80');
  });

  it('소개 상한은 활동 분야를 따른다', () => {
    writeForm(root, filled({ bio: '가나다' }));
    renderCounters(root, 'artist');
    expect(root.querySelector('[data-mp-count="bio"]')!.textContent).toBe('3 / 1500');
    renderCounters(root, 'member');
    expect(root.querySelector('[data-mp-count="bio"]')!.textContent).toBe('3 / 500');
  });
});

describe('별명 피드백 — 세 상태', () => {
  const slot = () => root.querySelector<HTMLElement>('[data-mp-error="nickname"]')!;
  const box = () => root.querySelector<HTMLElement>('[data-mp-suggest="nickname"]')!;

  it('규칙 위반은 is-error', () => {
    renderNicknameFeedback(root, checkNickname('a'), [], () => {});
    expect(slot().classList.contains('is-error')).toBe(true);
    expect(slot().classList.contains('is-ok')).toBe(false);
  });

  it('**중복을 모르는 통과는 is-ok 가 아니라 is-pending 이다**', () => {
    // 여기가 이 화면에서 가장 중요한 단언이다. 서버가 없어 전역 중복을 확인할 수
    // 없는 상태를 초록 체크로 그리면, 우리가 못 잰 것을 통과로 말하는 셈이다.
    renderNicknameFeedback(root, checkNickname('arthong'), [], () => {});
    expect(slot().classList.contains('is-pending')).toBe(true);
    expect(slot().classList.contains('is-ok')).toBe(false);
    expect(slot().textContent).toContain('중복 확인은');
  });

  it('서버가 확인한 통과만 is-ok', () => {
    renderNicknameFeedback(root, checkNickname('arthong', { uniquenessAuthoritative: true }), [], () => {});
    expect(slot().classList.contains('is-ok')).toBe(true);
    expect(slot().classList.contains('is-pending')).toBe(false);
  });

  it('추천은 중복일 때만 뜨고, 누르면 값이 전달된다', () => {
    const taken = new Set(['arthong']);
    const check = checkNickname('arthong', { taken, uniquenessAuthoritative: true });
    let picked = '';
    renderNicknameFeedback(root, check, ['arthong76', 'art_hong'], (v) => { picked = v; });
    expect(box().hidden).toBe(false);
    expect(box().children.length).toBe(2);
    (box().children[0] as HTMLButtonElement).click();
    expect(picked).toBe('arthong76');

    // 형식 오류에는 추천을 내지 않는다 — 왜 거부됐는지 모른 채 남의 이름을 고르게 된다.
    renderNicknameFeedback(root, checkNickname('a'), ['aa'], () => {});
    expect(box().hidden).toBe(true);
    expect(box().children.length).toBe(0);
  });
});

describe('공개 설정 마스터 스위치', () => {
  it('꺼지면 나머지 토글이 비활성되지만 값은 남는다', () => {
    const p = filled();
    writeForm(root, p);
    reflectMasterSwitch(root, false);
    const bio = root.querySelector<HTMLInputElement>('[data-mp-vis="bio"]')!;
    expect(bio.disabled).toBe(true);
    // 값이 살아 있어야 마스터를 다시 켰을 때 사용자의 설정이 돌아온다.
    expect(bio.checked).toBe(true);
    expect(readForm(root, p).visibility.bio).toBe(true);

    reflectMasterSwitch(root, true);
    expect(bio.disabled).toBe(false);
  });
});

describe('활동 분야에 따른 작가 탭', () => {
  it('작가·갤러리에만 보인다', () => {
    reflectUserType(root, 'artist');
    expect(root.querySelector<HTMLElement>('[data-mp-tab="artist"]')!.hidden).toBe(false);
    reflectUserType(root, 'collector');
    expect(root.querySelector<HTMLElement>('[data-mp-tab="artist"]')!.hidden).toBe(true);
  });

  it('열려 있던 작가 탭이 사라지면 기본 탭으로 돌려보낸다', () => {
    root.querySelector<HTMLElement>('[data-mp-panel="artist"]')!.hidden = false;
    root.querySelector<HTMLElement>('[data-mp-panel="basic"]')!.hidden = true;
    reflectUserType(root, 'member');
    expect(root.querySelector<HTMLElement>('[data-mp-panel="basic"]')!.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>('[data-mp-panel="artist"]')!.hidden).toBe(true);
  });
});

describe('링크 편집', () => {
  const noop = { onChange: () => {} };

  it('저장된 링크를 행으로 펼치고 그대로 읽어 낸다', () => {
    writeLinks(root, filled().links, noop);
    const rows = root.querySelectorAll('[data-mp-link-row]');
    expect(rows.length).toBe(1);
    const { links, dropped } = readLinks(root);
    expect(dropped).toBe(0);
    expect(links.length).toBe(1);
    expect(links[0].url).toBe('https://instagram.com/arthong');
    expect(links[0].handle).toBe('arthong');
  });

  it('플랫폼 옵션은 JS 가 채운다 — 마크업에 목록을 적지 않는다', () => {
    addLinkRow(root, noop);
    const select = root.querySelector<HTMLSelectElement>('[data-mp-link="platform"]')!;
    expect(select.options.length).toBeGreaterThan(5);
    expect(Array.from(select.options).map((o) => o.value)).toContain('instagram');
  });

  it('아이디로 넣어도 URL 로 저장된다', () => {
    addLinkRow(root, noop);
    const row = root.querySelector('[data-mp-link-row]')!;
    row.querySelector<HTMLSelectElement>('[data-mp-link="platform"]')!.value = 'instagram';
    row.querySelector<HTMLInputElement>('[data-mp-link="url"]')!.value = '@arthong';
    const { links } = readLinks(root);
    expect(links[0].url).toBe('https://instagram.com/arthong');
  });

  it('잘못된 링크는 버리고 그 개수를 알려준다 — 조용히 사라지면 저장된 줄 안다', () => {
    addLinkRow(root, noop);
    const row = root.querySelector('[data-mp-link-row]')!;
    row.querySelector<HTMLSelectElement>('[data-mp-link="platform"]')!.value = 'instagram';
    row.querySelector<HTMLInputElement>('[data-mp-link="url"]')!.value = 'javascript:alert(1)';
    const { links, dropped } = readLinks(root);
    expect(links.length).toBe(0);
    expect(dropped).toBe(1);
  });

  it('**플랫폼과 다른 호스트의 주소를 버린다** — 이 축이 비어 있었다', () => {
    // ── 뮤테이션 M6 이 찾아낸 구멍 (2026-08-08) ───────────────────────────
    // `readLinks` 의 `checkLink` 블록을 일부러 지웠는데 **아무 테스트도 안 깨졌다.**
    // 바로 아래의 `normalizeLinkUrl` 실패 검사가 위험 스킴을 이미 덮고 있었고,
    // 위 테스트가 `javascript:` 하나만 보고 있었기 때문이다.
    //
    // 하지만 `normalizeLinkUrl` 은 **이미 절대 URL 인 입력을 그대로 통과시킨다** —
    // 호스트가 맞는지는 `checkLink` 만 본다. 그래서 그 블록이 없으면 인스타그램
    // 칸에 페이스북 주소가 저장되고, 공개 프로필에는 "@x" 가 인스타그램 아이콘을
    // 달고 뜬다. 프로필을 보는 사람만 속고 주인은 모른다.
    addLinkRow(root, noop);
    const row = root.querySelector('[data-mp-link-row]')!;
    row.querySelector<HTMLSelectElement>('[data-mp-link="platform"]')!.value = 'instagram';
    row.querySelector<HTMLInputElement>('[data-mp-link="url"]')!.value = 'https://facebook.com/someoneelse';
    const { links, dropped } = readLinks(root);
    expect(links.length).toBe(0);
    expect(dropped).toBe(1);
  });

  it('**기타 링크에 이름이 없으면 버린다** — 같은 블록의 다른 축이다', () => {
    // 위와 같은 이유다. `normalizeLinkUrl` 은 이름 유무를 모른다 — `checkLink` 만 본다.
    addLinkRow(root, noop);
    const row = root.querySelector('[data-mp-link-row]')!;
    row.querySelector<HTMLSelectElement>('[data-mp-link="platform"]')!.value = 'other';
    row.querySelector<HTMLInputElement>('[data-mp-link="url"]')!.value = 'https://a.example';
    expect(readLinks(root).dropped).toBe(1);

    row.querySelector<HTMLInputElement>('[data-mp-link="label"]')!.value = '포트폴리오';
    const after = readLinks(root);
    expect(after.dropped).toBe(0);
    expect(after.links[0].label).toBe('포트폴리오');
  });

  it('빈 행은 버린 것으로 세지 않는다 — 아직 안 적었을 뿐이다', () => {
    addLinkRow(root, noop);
    const { links, dropped } = readLinks(root);
    expect(links.length).toBe(0);
    expect(dropped).toBe(0);
  });

  it('삭제 버튼이 행을 없앤다', () => {
    writeLinks(root, filled().links, noop);
    root.querySelector<HTMLButtonElement>('[data-mp-link="remove"]')!.click();
    expect(root.querySelectorAll('[data-mp-link-row]').length).toBe(0);
    expect(readLinks(root).links.length).toBe(0);
  });

  it('기타 링크일 때만 이름 칸이 보인다', () => {
    addLinkRow(root, noop);
    const row = root.querySelector<HTMLElement>('[data-mp-link-row]')!;
    const labelBox = row.querySelector<HTMLElement>('[data-mp-link-labelbox]')!;
    const select = row.querySelector<HTMLSelectElement>('[data-mp-link="platform"]')!;
    select.value = 'instagram';
    select.dispatchEvent(new Event('change'));
    expect(labelBox.hidden).toBe(true);
    select.value = 'other';
    select.dispatchEvent(new Event('change'));
    expect(labelBox.hidden).toBe(false);
  });

  it('링크 개수 상한에서 더 늘지 않는다', () => {
    for (let i = 0; i < 20; i += 1) addLinkRow(root, noop);
    expect(root.querySelectorAll('[data-mp-link-row]').length).toBe(12);
  });
});
