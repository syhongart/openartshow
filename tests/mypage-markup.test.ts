// @vitest-environment jsdom
//
// **실제 `frontend/mypage.html` 이 DOM 계약을 지키는가.**
//
// ── 이 파일이 없으면 생기는 구멍 ──────────────────────────────────────────
// `mypage-view.test.ts` 는 계약을 아는 사람이 직접 쓴 픽스처 위에서 돈다. 그 픽스처는
// 당연히 계약을 지키므로, **실제 마크업에서 속성 하나가 빠져도 전부 통과한다.**
// 그리고 빠진 자리는 조용하다 — `querySelector` 가 `null` 을 주고, 화면 코드는
// 그것을 정상 반환으로 다루도록 짜여 있어 아무 에러도 안 난다. 기능 하나가
// **말없이 없어진다.**
//
// 이 저장소가 명문화한 형태 그대로다: *"판정/집행 분리의 구멍 — 경계를 건너는 지점은
// 아무도 안 본다."* 마크업과 로직은 사람이 둘로 나뉘어 만드는 만큼 그 경계가 더 넓다.
//
// ── 못 보는 것 ────────────────────────────────────────────────────────────
// 속성이 **있다**는 것만 본다. 그것이 옳은 요소에 붙었는지(예: `data-mp-field="bio"`
// 가 `<textarea>` 인지), 화면에서 실제로 보이는지는 여기서 못 본다. 요소 종류는
// 아래에서 일부만 단언하고, 룩·레이아웃은 디자이너 육안 판정과 스모크 소관이다.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HTML_PATH = resolve(import.meta.dirname, '../frontend/mypage.html');

let doc: Document;
let html: string;

beforeAll(() => {
  html = readFileSync(HTML_PATH, 'utf8');
  doc = new DOMParser().parseFromString(html, 'text/html');
});

function has(selector: string): boolean {
  return doc.querySelector(selector) !== null;
}

describe('셸', () => {
  it('루트와 저장 UI 가 있다', () => {
    expect(has('[data-mp="root"]')).toBe(true);
    expect(has('[data-mp="save"]')).toBe(true);
    expect(has('[data-mp="save-status"]')).toBe(true);
  });

  it('저장 상태는 스크린리더에 읽힌다', () => {
    const status = doc.querySelector('[data-mp="save-status"]')!;
    // 저장 결과는 시각적으로만 바뀌므로 aria-live 가 없으면 스크린리더 사용자에게는
    // 아무 일도 안 일어난 것과 같다.
    expect(status.getAttribute('aria-live')).toBeTruthy();
  });

  it('탭 7개와 패널 7개가 짝을 이룬다', () => {
    const ids = ['basic', 'avatar', 'about', 'links', 'artist', 'privacy', 'account'];
    for (const id of ids) {
      expect(has(`[data-mp-tab="${id}"]`), `탭 ${id}`).toBe(true);
      expect(has(`[data-mp-panel="${id}"]`), `패널 ${id}`).toBe(true);
    }
    // 계약에 없는 탭이 늘어나 있으면 로직이 모르는 화면이 생긴 것이다.
    expect(doc.querySelectorAll('[data-mp-tab]').length).toBe(ids.length);
    expect(doc.querySelectorAll('[data-mp-panel]').length).toBe(ids.length);
  });
});

describe('Preview', () => {
  const slots = [
    'preview', 'preview-avatar', 'preview-avatar-fallback', 'preview-name',
    'preview-nickname', 'preview-type', 'preview-bioshort', 'preview-bio',
    'preview-location', 'preview-genres', 'preview-links', 'preview-inquiry',
    'preview-empty', 'preview-private',
  ];

  it('모든 자리가 있다', () => {
    for (const name of slots) {
      expect(has(`[data-mp="${name}"]`), name).toBe(true);
    }
  });

  it('아바타 자리는 <img> 다 — JS 가 src 를 채운다', () => {
    expect(doc.querySelector('[data-mp="preview-avatar"]')?.tagName).toBe('IMG');
  });

  // 감독 지시 2026-08-08: *"빨간 표시를 누르면 캐릭터 꾸미기 화면으로 바로 가게 하자"*
  it('신원 블록이 **버튼**이다 — 키보드로 도달할 수 있어야 한다', () => {
    const el = doc.querySelector('[data-mp="preview-identity"]');
    // `<div>` + click 리스너로 두면 마우스에서만 동작하고, 「캐릭터」 탭의 같은 기능은
    // 버튼이라 그쪽만 접근 가능해진다 — 같은 일을 하는 두 진입점의 접근성이 갈린다.
    expect(el?.tagName).toBe('BUTTON');
    expect(el?.getAttribute('type'), 'form 안이 아니어도 type 을 명시한다').toBe('button');
  });

  it('접근 이름이 **이름을 가리지 않는다** — `aria-label` 로 덮지 않는다 (검수관 C1)', () => {
    const el = doc.querySelector('[data-mp="preview-identity"]')!;
    // `aria-label`·`aria-labelledby` 는 자손 텍스트보다 우선해 접근 이름을 **완전히
    // 대체**한다. 그러면 스크린리더 사용자는 이 카드에서 자기 이름·별명·타입을 못 읽는다
    // — 그것이 이 카드의 목적인데. `<div>` 였을 때는 읽혔으므로 회귀가 된다.
    expect(el.getAttribute('aria-label'), 'aria-label 이 이름을 덮는다').toBe(null);
    expect(el.getAttribute('aria-labelledby'), 'labelledby 도 같은 문제를 만든다').toBe(null);
    // 대신 목적은 시각 숨김 텍스트가 말한다 — 접근 이름이 "이름 + 목적" 으로 누적된다.
    const sr = el.querySelector('.sr-only');
    expect(sr, '목적을 알리는 시각 숨김 텍스트가 없다').not.toBe(null);
    expect(sr?.textContent?.trim()).toBeTruthy();
  });

  it('`.sr-only` 가 **접근성 트리에서 사라지지 않게** 숨긴다', () => {
    // `display:none`·`visibility:hidden` 이면 스크린리더도 못 읽어 C1 처방이 무의미해진다.
    const css = readFileSync(resolve(import.meta.dirname, '../frontend/css/mypage.css'), 'utf8');
    const rule = /\.sr-only\s*\{([^}]*)\}/.exec(css);
    expect(rule, '.sr-only 규칙이 없다').not.toBe(null);
    const body = rule![1];
    expect(body, 'display:none 이면 리더도 못 읽는다').not.toMatch(/display\s*:\s*none/);
    expect(body, 'visibility:hidden 이면 리더도 못 읽는다').not.toMatch(/visibility\s*:\s*hidden/);
    expect(body, '실제로 숨기지 않는다').toMatch(/clip-path|clip\s*:/);
  });

  it('신원 블록이 아바타와 이름을 **품는다** — 감독이 지목한 그 영역이다', () => {
    const el = doc.querySelector('[data-mp="preview-identity"]')!;
    expect(el.querySelector('[data-mp="preview-avatar"]'), '아바타').not.toBe(null);
    expect(el.querySelector('[data-mp="preview-name"]'), '이름').not.toBe(null);
  });

  it('신원 블록 안에 **중첩 인터랙티브가 없다** — HTML 이 허용하지 않는다', () => {
    const el = doc.querySelector('[data-mp="preview-identity"]')!;
    // 검수관 P6 — 첫 판본은 `button, a[href], input, select, textarea` 뿐이었다.
    // 막으려는 것이 "중첩 인터랙티브" 인데 목록이 그보다 좁으면 검사가 이름값을 못 한다.
    const interactive = 'button, a[href], input, select, textarea, label, summary,'
      + ' [tabindex], [contenteditable], audio[controls], video[controls], details, iframe';
    expect(el.querySelectorAll(interactive).length).toBe(0);
  });
});

describe('폼 필드', () => {
  const textFields = ['nickname', 'displayName', 'bioShort', 'bio', 'location', 'exhibitions', 'gallery'];

  it('모든 필드가 있다', () => {
    for (const name of [...textFields, 'userType', 'genres', 'inquiryOpen', 'saleOpen', 'profileImage']) {
      expect(has(`[data-mp-field="${name}"]`), name).toBe(true);
    }
  });

  it('여러 줄 필드는 <textarea> 다', () => {
    for (const name of ['bio', 'exhibitions']) {
      expect(doc.querySelector(`[data-mp-field="${name}"]`)?.tagName, name).toBe('TEXTAREA');
    }
  });

  it('활동 분야는 select 이거나 라디오 그룹이고, 값 4개를 전부 낸다', () => {
    const els = Array.from(doc.querySelectorAll('[data-mp-field="userType"]'));
    const values = els.length === 1 && els[0].tagName === 'SELECT'
      ? Array.from((els[0] as HTMLSelectElement).options).map((o) => o.value)
      : els.map((el) => el.getAttribute('value') ?? '');
    expect(new Set(values)).toEqual(new Set(['artist', 'gallery', 'collector', 'member']));
  });

  it('장르 체크박스 9개가 스키마와 같은 id 를 쓴다', () => {
    const values = Array.from(doc.querySelectorAll('[data-mp-field="genres"]'))
      .map((el) => el.getAttribute('value'));
    expect(new Set(values)).toEqual(new Set([
      'painting', 'photo', 'sculpture', 'media', 'installation', 'digital', 'craft', 'drawing', 'etc',
    ]));
  });

  it('프로필 사진은 파일 입력이다', () => {
    const el = doc.querySelector('[data-mp-field="profileImage"]') as HTMLInputElement | null;
    expect(el?.tagName).toBe('INPUT');
    expect(el?.getAttribute('type')).toBe('file');
  });

  it('**상한을 마크업에 적지 않았다** — 값의 출처는 schema.ts 하나다', () => {
    // maxlength 가 HTML 에 박혀 있으면 LIMITS 와 같은 값이 두 곳에 생기고,
    // 한쪽만 고치면 아무도 모른다. 이 저장소가 세 번 덴 형태다.
    for (const name of textFields) {
      for (const el of Array.from(doc.querySelectorAll(`[data-mp-field="${name}"]`))) {
        expect(el.hasAttribute('maxlength'), `${name} 에 maxlength 가 박혀 있다`).toBe(false);
      }
    }
  });
});

describe('피드백 자리', () => {
  it('별명 판정·카운터·추천 자리가 있다', () => {
    expect(has('[data-mp-error="nickname"]')).toBe(true);
    expect(has('[data-mp-suggest="nickname"]')).toBe(true);
    for (const name of ['nickname', 'bioShort', 'bio', 'exhibitions']) {
      expect(has(`[data-mp-count="${name}"]`), name).toBe(true);
    }
  });
});

describe('링크 편집', () => {
  it('목록·추가 버튼·행 템플릿이 있다', () => {
    expect(has('[data-mp="links-list"]')).toBe(true);
    expect(has('[data-mp="link-add"]')).toBe(true);
    expect(has('template[data-mp="link-row"]')).toBe(true);
  });

  it('행 템플릿이 부품 6개를 담는다', () => {
    const tpl = doc.querySelector<HTMLTemplateElement>('template[data-mp="link-row"]')!;
    const frag = tpl.content;
    for (const name of ['platform', 'url', 'label', 'visible', 'remove', 'error']) {
      expect(frag.querySelector(`[data-mp-link="${name}"]`) !== null, name).toBe(true);
    }
    // 행의 루트가 하나여야 복제 후 `firstElementChild` 로 잡힌다.
    expect(frag.children.length).toBe(1);
  });

  it('플랫폼 목록을 마크업에 적지 않았다 — JS 가 PLATFORMS 에서 채운다', () => {
    const tpl = doc.querySelector<HTMLTemplateElement>('template[data-mp="link-row"]')!;
    const select = tpl.content.querySelector('[data-mp-link="platform"]');
    expect(select?.children.length ?? 0).toBe(0);
  });
});

describe('공개 설정', () => {
  it('토글 6개가 있고 전부 체크박스다', () => {
    for (const key of ['profile', 'bio', 'location', 'links', 'email', 'inquiry']) {
      const el = doc.querySelector(`[data-mp-vis="${key}"]`) as HTMLInputElement | null;
      expect(el, key).not.toBe(null);
      expect(el?.getAttribute('type'), key).toBe('checkbox');
    }
  });

  it('이메일 공개는 기본 꺼짐이다 — 감독 지시(로그인 정보와 공개 프로필의 분리)', () => {
    const email = doc.querySelector('[data-mp-vis="email"]')!;
    expect(email.hasAttribute('checked')).toBe(false);
  });
});

describe('캐릭터·계정 탭', () => {
  it('필요한 자리가 있다', () => {
    for (const name of ['avatar-open', 'avatar-thumb', 'account-provider', 'account-reset', 'account-notice']) {
      expect(has(`[data-mp="${name}"]`), name).toBe(true);
    }
  });

  // 감독 지시 2026-08-08: *"옷장리스트가 나오게 해줘."*
  it('옷장 자리와 행 템플릿이 있다', () => {
    // ⚠ `closet-status` 가 빠지면 갈아입기는 되는데 **아무 메시지도 안 뜬다**
    // (`setText(null)` 이 조용한 no-op 이다) — 앱 테스트는 픽스처를 쓰므로 실제 마크업
    // 누락을 원리상 못 본다(검수관 D3). **픽스처와 마크업이 갈린 곳은 전부 이 구멍이다.**
    for (const name of ['closet', 'closet-list', 'closet-empty', 'closet-count', 'closet-status',
      'closet-empty-guest']) {
      expect(has(`[data-mp="${name}"]`), name).toBe(true);
    }
    const tpl = doc.querySelector<HTMLTemplateElement>('template[data-mp="closet-cell"]');
    expect(tpl, '행 템플릿이 없다').not.toBe(null);
    const frag = tpl!.content;
    // 행의 루트가 하나여야 복제 후 `firstElementChild` 로 잡힌다.
    expect(frag.children.length).toBe(1);
    expect(frag.firstElementChild?.tagName, '칸은 눌리는 것이므로 버튼이다').toBe('BUTTON');
    for (const part of ['load', 'thumb', 'name']) {
      expect(frag.querySelector(`[data-mp-closet="${part}"]`) !== null, part).toBe(true);
    }
  });

  it('옷 목록을 마크업에 적지 않았다 — JS 가 저장소에서 채운다', () => {
    // 여기에 예시 칸을 적어 두면 로그인 전에도 남의 옷이 보이고, 저장소 형식이
    // 바뀌어도 화면은 그대로라 어긋난 것을 아무도 모른다.
    expect(doc.querySelector('[data-mp="closet-list"]')!.children.length).toBe(0);
  });

  // ⚠ **이것은 CSS 축 게이트가 아니다** (검수관 C2/GS-CSS1, 2026-08-08).
  // 캐스케이드·특이성·상속을 **전혀 안 본다** — 다른 셀렉터가 이겨서 실제 화면이 안
  // 중앙정렬돼도 통과한다. 문자열 존재만 본다. 백로그 `G-CSSVAR1`·「셀렉터 회귀 축」을
  // 대체하지 않는다.
  //
  // 첫 판본은 `align-items: center` **한 줄만** 봤고 검출력이 반쪽이었다(실측:
  // `display:flex` 를 지워도, `flex-direction` 을 지워도, `.avatar__frame` 규칙을 통째로
  // 없애도 전부 통과). `align-items` 는 flex/grid 컨테이너가 아니면 **완전히 무효**이고
  // 주축이 가로면 세로중앙이 된다 — 즉 감독 지시가 통째로 회귀해도 초록이었다.
  // 그래서 **그 선언이 효력을 갖는 최소 조건 집합**을 함께 단언한다.
  //
  // 거짓 FAIL 위험: 나중에 `display:grid` + `place-items:center` 로 바꾸는 **올바른
  // 수정**이 여기서 FAIL 한다. 그때는 정규식을 `(flex|grid)` 로 넓히지 말고 **명세를
  // 다시 쓴다**(게이트가 정답을 벌주는 형태를 정규식으로 덮으면 검사가 장식이 된다).
  it('캐릭터 패널 스타일이 **효력을 갖는 형태로** 있다 — 없으면 왼쪽에 붙고 원본 크기로 나온다', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../frontend/css/mypage.css'), 'utf8');
    const rule = (sel: string) => new RegExp(`${sel}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? null;

    const avatar = rule('\\.avatar');
    expect(avatar, '.avatar 규칙이 없다').not.toBe(null);
    // 셋이 **함께** 있어야 세로 배치 + 가로 중앙이 된다. 하나라도 빠지면 무효다.
    expect(avatar, 'flex 컨테이너가 아니면 align-items 가 무효다').toMatch(/display\s*:\s*flex/);
    expect(avatar, '주축이 가로면 align-items:center 는 세로중앙이 된다').toMatch(/flex-direction\s*:\s*column/);
    expect(avatar, '중앙정렬이 아니다 — 감독 지시의 핵심이다').toMatch(/align-items\s*:\s*center/);

    // 썸네일이 원본 크기로 나오던 것이 이 diff 가 고친 사고다 — 프레임이 크기를 정한다.
    const frame = rule('\\.avatar__frame');
    expect(frame, '.avatar__frame 규칙이 없다 — 썸네일이 원본 크기가 된다').not.toBe(null);
    expect(frame, '프레임이 크기를 정하지 않는다').toMatch(/width\s*:/);
    const thumb = rule('\\.avatar__thumb');
    expect(thumb, '.avatar__thumb 규칙이 없다').not.toBe(null);
    expect(thumb, '프레임을 채우지 않는다').toMatch(/object-fit\s*:/);

    expect(rule('\\.closet__grid'), '.closet__grid 규칙이 없다').not.toBe(null);
  });
});

describe('자기완결·보안', () => {
  it('외부 호스트를 참조하지 않는다', () => {
    // CDN·웹폰트·원격 이미지 0 이 이 프로젝트의 강제 불변식이다. CSP 의
    // `frame-src`(없음)와 별개로 마크업 자체를 본다.
    const attrs = ['src', 'href', 'srcset', 'poster', 'data'];
    for (const el of Array.from(doc.querySelectorAll('*'))) {
      for (const attr of attrs) {
        const value = el.getAttribute(attr);
        if (!value) continue;
        expect(/^(https?:)?\/\//i.test(value), `${el.tagName} ${attr}="${value}"`).toBe(false);
      }
    }
  });

  it('인라인 이벤트 핸들러가 없다 — CSP 와 어긋난다', () => {
    for (const el of Array.from(doc.querySelectorAll('*'))) {
      for (const attr of Array.from(el.attributes)) {
        expect(attr.name.startsWith('on'), `${el.tagName} ${attr.name}`).toBe(false);
      }
    }
  });

  it('CSP 메타가 있고 자기완결 기본형을 지킨다', () => {
    const meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta).not.toBe(null);
    const content = meta!.getAttribute('content') ?? '';
    expect(content).toContain("default-src 'self'");
    expect(content).toContain("object-src 'none'");
    // 프로필 사진이 dataURL 이라 이것이 없으면 사진이 표시되지 않는다.
    expect(content).toMatch(/img-src[^;]*data:/);
  });

  it('[hidden] 이 실제로 숨긴다 — flex/grid 자식은 hidden 을 무시한다', () => {
    // JS 는 `hidden` 속성 하나로 보이기/숨기기를 한다. 레이아웃 display 가 이기면
    // 비공개로 꺼 둔 항목이 화면에 남는다 — 조용하고 위험한 실패다.
    const css = readFileSync(resolve(import.meta.dirname, '../frontend/css/mypage.css'), 'utf8');
    expect(css.replace(/\s+/g, ' ')).toMatch(/\[hidden\][^{]*\{[^}]*display:\s*none\s*!important/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 면 대비 — 2026-08-09 감독 지적 *"피씨에서 봤을때 디자인이 구린데"* 의 회귀 축.
//
// ── 왜 이 검사가 생겼나 ───────────────────────────────────────────────────
// 그 지적의 직접 원인은 **입력 채움과 그 뒤 면의 대비가 1.03** 이었다는 것이다:
//
//     조합                                   명도 대비   판정
//     입력 #fdfbf5 vs 패널 #ffffff (사고)      1.03      사람 눈에 사실상 같은 색
//     입력 #efe6d3 vs 바탕 #F3F0E9 (정본)      1.09      studio.html 과 같은 조합
//
// 1.03 이면 입력이 「면」이 아니라 「테두리만 있는 빈 구멍」으로 읽히고, 그 상태에서는
// 폭을 좁혀도 허전함이 안 풀린다(studio 는 같은 입력이 925px 인데 어색하지 않다).
// **이 회귀를 잡는 검사가 그때까지 하나도 없었다** — 색 토큰은 전부 유효했고, 마크업
// 계약도 온전했고, 게이트 6종이 전부 초록이었다. 값이 틀린 게 아니라 **두 값의 관계**가
// 틀린 것이라 단일 값을 보는 검사로는 원리상 안 잡힌다.
//
// ── 못 보는 것 (통과로 적지 않는다) ───────────────────────────────────────
// ① 캐스케이드·특이성을 안 본다. 다른 규칙이 이겨 실제 화면 색이 달라도 통과한다.
// ② `.panel` 이 투명일 때 뒤가 `--bg` 라고 **가정**한다. 중간에 다른 면을 끼우면 그
//    가정이 깨지는데 이 검사는 모른다.
// ③ 대비가 충분해도 색이 어울리는지는 안 본다 — 그건 디자이너 육안 판정 소관이다.
//
// ── ⚠ 한계의 **크기** (한계를 적는 것과 그 크기를 적는 것은 다른 일이다) ──────
// 위 ①을 *"캐스케이드를 안 본다"* 라고만 적으면 얼마나 큰 구멍인지 안 보인다. 교차리뷰가
// 실측으로 크기를 재 줬다(검수관 R-C): 파일 **끝에** `.inp{background:var(--oas-paper)}`
// 와 `.panel{background:var(--surface)}` 를 재선언하고 `--surface-2` 를 paper 로 되돌리면
// **화면상 정확히 1.03 사고인데 이 파일은 33 passed** 다. 나중 선언이 이기는 것을
// 이 검사가 못 보기 때문이다.
//   → 즉 이 게이트가 지키는 것은 **「`.panel` 이 투명한가 + 첫 선언의 토큰이 무엇인가」**
//     이지 화면의 최종 색이 아니다. 셀렉터·특이성 회귀 축(백로그)이 이것을 대체하지 않는
//     한, 여기 초록을 「화면이 옳다」로 읽지 마라.
//
// ── ⚠ 주 처방이 이 게이트 밖에 있다 ──────────────────────────────────────
// 뮤테이션 M2(`--surface-2` 만 paper 로 되돌림)는 **통과한다.** 그것이 설계다 —
// paper vs ivory 는 1.0998 이라 사고 조합이 아니고, 이 검사는 토큰 이름이 아니라 대비를
// 본다. 다만 그 결과 **지켜지는 것은 `.panel` 의 투명이고 `--surface-2` 의 값이 아니다.**
// `mypage.html` 의 `--surface-2` 주석은 sand 전환을 *"둘 중 효과가 큰 쪽"* 이라고
// 단언하는데, **그 주 처방을 되돌려도 이 파일은 초록이다.** 값 자체를 고정하고 싶으면
// 별도 축이 필요하다(지금은 없다 — 없다는 사실을 여기 적어 둔다).
//
// ── 거짓 FAIL 위험 (게이트가 정답을 벌주는 형태) ──────────────────────────
// 이 검사는 규칙을 **셀렉터 문자열로** 찾는다(`bgOf`). 그래서 아래는 전부 **정당한
// 수정인데 FAIL** 한다 — 실측으로 확인된 것부터 적는다:
//   · `.inp {` → `.inp, .inp-x {` 로 셀렉터를 묶으면 `규칙이 없다: \.inp` 로 1 failed
//     (검수관 실측). 그룹핑은 CSS 에서 가장 흔한 정리이므로 언제든 밟는다.
//   · `.panel`·`.pv__card` 를 다른 셀렉터(예: `.ed .panel`)로 옮겨도 같다.
//   · 배경을 `background` 대신 `background-image`(그라디언트)로 주면 토큰이 안 잡힌다.
// **그때 정규식을 느슨하게 넓히지 마라** — 넓히는 순간 이 검사는 "무엇이든 하나 있으면
// 통과" 로 바뀐다(이 저장소가 `/재확인\s*:\s*\S+/` 로 이미 지불한 형태다).
// 대신 **명세를 다시 쓴다**: 셀렉터를 못 믿게 되면 문자열 파싱을 버리고 실브라우저
// 계산값(스모크)으로 축을 옮기는 것이 옳은 방향이다. 그 전까지는 여기서 멈춘다.
describe('면 대비 — 입력이 「빈 구멍」으로 보이지 않는가', () => {
  // 임계값의 근거는 실측 두 점이다: 사고 1.03 / 정본 1.09. 그 사이를 끊는다.
  // 올리면 정본(1.09)이 아슬아슬해지고, 내리면 사고(1.03)를 놓친다.
  const MIN_SURFACE_CONTRAST = 1.06;
  // UI 요소(채움 버튼)는 WCAG 비텍스트 대비 기준을 그대로 쓴다.
  const MIN_UI_CONTRAST = 3;

  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

  function varMap(css: string): Map<string, string> {
    const m = new Map<string, string>();
    for (const hit of stripComments(css).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/gi)) {
      if (!m.has(hit[1])) m.set(hit[1], hit[2].trim());
    }
    return m;
  }

  /**
   * `var(--a)` 체인을 끝까지 따라가 실제 값을 낸다. 미정의·순환이면 던진다.
   *
   * ⚠ **`rgb(var(--x-rgb))` 도 따라간다**(2026-08-09 추가). 1층 `tokens.css` 가 알파를
   * 붙일 수 있는 색을 **채널 원본 + hex 파생** 구조로 바꾸면서 최종 값이 hex 가 아닌
   * 토큰이 생겼다(경위는 `tokens.css` 의 `--oas-green-text-rgb` 한 곳). 이 함수는
   * `var(--a)` **단독** 형태만 알았기 때문에 그 파생 선언을 문자열 그대로 돌려줬고,
   * `luminance` 가 `hex 가 아니다` 로 던졌다 — **색도 대비도 안 바뀌었는데** 3건이 FAIL 했다.
   * 즉 깨진 것은 이 검사가 재려던 것(면 대비)이 아니라 *"1층 토큰의 최종 값은 hex 다"*
   * 라는 파서의 암묵 전제다. 임계값·단언은 한 글자도 안 바꿨다.
   */
  function resolve1(name: string, maps: Map<string, string>[], depth = 0): string {
    if (depth > 12) throw new Error(`토큰 순환: ${name}`);
    let v: string | undefined;
    for (const mm of maps) if (mm.has(name)) { v = mm.get(name); break; }
    if (v === undefined) throw new Error(`정의되지 않은 토큰: ${name}`);
    const ref = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(v);
    if (ref) return resolve1(ref[1], maps, depth + 1);
    // `rgb(var(--x-rgb))` — 안쪽 채널 토큰을 해소해 `rgb(R G B)` 로 만든다.
    const wrapped = /^rgba?\(\s*var\(\s*(--[a-z0-9-]+)\s*\)\s*\)$/i.exec(v);
    if (wrapped) return `rgb(${resolve1(wrapped[1], maps, depth + 1)})`;
    return v;
  }

  /**
   * hex 또는 `rgb(R G B)` / `rgb(R, G, B)` 를 상대휘도로. **읽을 수 없으면 던진다** —
   * 알 수 없는 표기를 0 이나 기본값으로 때우면 대비가 조용히 아무 값이나 되고, 그러면
   * 이 검사는 통과하지만 아무것도 안 재는 상태가 된다(못 잰 것은 통과가 아니다).
   */
  function luminance(color: string): number {
    const raw = color.trim();
    let rgb: number[] | null = null;
    const m = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*[,)/]?/.exec(raw);
    if (m) {
      rgb = [Number(m[1]), Number(m[2]), Number(m[3])];
    } else {
      const h = raw.replace('#', '');
      const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
      if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`색을 읽을 수 없다: ${color}`);
      rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    }
    const ch = rgb.map((c) => c / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  function contrast(a: string, b: string): number {
    const [x, y] = [luminance(a), luminance(b)];
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  /** 규칙 블록에서 background 선언의 토큰 이름(또는 리터럴)을 뽑는다. */
  function bgOf(css: string, selector: string): string | null {
    const body = new RegExp(`(?:^|[\\s,}])${selector}\\s*\\{([^}]*)\\}`)
      .exec(stripComments(css))?.[1];
    if (body == null) throw new Error(`규칙이 없다: ${selector}`);
    const bg = /background(?:-color)?\s*:\s*([^;]+)/.exec(body)?.[1]?.trim();
    return bg ?? null;
  }

  let maps: Map<string, string>[];
  let css: string;
  beforeAll(() => {
    css = readFileSync(resolve(import.meta.dirname, '../frontend/css/mypage.css'), 'utf8');
    const tokens = readFileSync(resolve(import.meta.dirname, '../frontend/css/tokens.css'), 'utf8');
    // 앞이 우선 — 페이지 2층(mypage.html :root)이 1층(tokens.css)을 덮는다.
    maps = [varMap(html), varMap(tokens)];
  });

  const tokenOf = (decl: string) => /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(decl)?.[1] ?? null;

  it('입력 채움이 그 뒤 면과 **구별된다** — 대비 1.03 회귀를 잡는다', () => {
    const inpBg = bgOf(css, '\\.inp');
    expect(inpBg, '.inp 에 background 선언이 없다').not.toBe(null);
    const inpTok = tokenOf(inpBg!);
    expect(inpTok, `.inp 배경이 토큰이 아니다(${inpBg}) — 색 리터럴은 이 파일에서 금지다`).not.toBe(null);

    // 입력이 실제로 놓이는 면: `.panel` 이 칠하면 그 색, 투명이면 페이지 바탕(--bg).
    const panelBg = bgOf(css, '\\.panel');
    const behindTok = (panelBg == null || /^transparent$/i.test(panelBg))
      ? '--bg'
      : tokenOf(panelBg);
    expect(behindTok, `.panel 배경이 토큰도 transparent 도 아니다(${panelBg})`).not.toBe(null);

    const inpHex = resolve1(inpTok!, maps);
    const behindHex = resolve1(behindTok!, maps);
    const ratio = contrast(inpHex, behindHex);

    expect(
      ratio,
      `입력(${inpTok} ${inpHex})이 그 뒤 면(${behindTok} ${behindHex})과 대비 ${ratio.toFixed(2)} 다. `
      + `${MIN_SURFACE_CONTRAST} 미만이면 입력이 「면」이 아니라 「빈 구멍」으로 읽힌다 — `
      + `2026-08-09 감독 지적의 직접 원인이 이 값 1.03 이었다.`,
    ).toBeGreaterThanOrEqual(MIN_SURFACE_CONTRAST);
  });

  it('Preview 의 CTA 채움이 라이트 표면에서 **원색으로 튀지 않는다**', () => {
    // 다크 시절 「작품 문의」는 --oas-cta(#1fd677) 채움이었다. 표면을 라이트로 되돌릴 때
    // 이 토큰을 함께 안 바꾸면 아이보리 위 대비 1.69:1 의 형광 버튼이 남는다 —
    // DESIGN.md 안티패턴 「풀채도 네온 대비」이자 UI 대비 기준(3:1) 미달이다.
    const ctaHex = resolve1('--pv-cta', maps);
    const onHex = resolve1('--pv-surface', maps);
    const ratio = contrast(ctaHex, onHex);
    expect(
      ratio,
      `--pv-cta(${ctaHex})가 --pv-surface(${onHex}) 위에서 대비 ${ratio.toFixed(2)} 다 `
      + `(기준 ${MIN_UI_CONTRAST}). 라이트 표면에는 -ink 딥변형을 쓴다.`,
    ).toBeGreaterThanOrEqual(MIN_UI_CONTRAST);
  });

  it('CTA 채움 위 **글자**도 읽힌다 — 채움만 고치고 라벨을 안 고치는 회귀를 잡는다', () => {
    const ratio = contrast(resolve1('--pv-cta-label', maps), resolve1('--pv-cta', maps));
    expect(ratio, `--pv-cta-label 이 --pv-cta 위에서 대비 ${ratio.toFixed(2)} 다`)
      .toBeGreaterThanOrEqual(4.5);
  });

  // ── Preview 층 사슬 ─────────────────────────────────────────────────────
  // 왜 「토큰 쌍」이 아니라 「사슬」인가 —
  // 교차리뷰에서 *"`--pv-bg` 와 `--pv-surface-2` 가 같은 값이라 대비 1.00 이다"* 라는
  // 지적을 받았다. **두 토큰 값이 같은 것은 사실이지만 결론은 틀렸다** — 브라우저에서
  // 비공개 상태를 띄워 조상 체인을 실측하니 `.pv__lock` 의 뒤 면은 `.pv`(sand)가 아니라
  // `.pv__card`(흰색)였다. 둘 사이에 불투명한 면이 하나 있어서 **화면에서 맞닿지 않는다**
  // (실측 1.2404 · 다크 시절 같은 자리 1.1588 — 전환은 이 축에서 개선이었다).
  //
  // 교훈: **대비는 토큰끼리가 아니라 DOM 에서 맞닿는 면끼리 성립한다.** 그래서 토큰 쌍을
  // 나열하지 않고 층 순서대로 사슬을 걸고, 그 사슬이 성립하는 **전제**(중간 면이 실제로
  // 불투명한가)를 함께 단언한다 — 전제가 깨지면 두 면이 직접 맞닿아 정말로 1.00 이 된다.
  it('Preview 4층이 각 단마다 구별된다 — 중간 면이 사라지면 1.00 이 되는 것을 막는다', () => {
    // 사슬은 [요소, 배경 토큰]. 뒤 면은 바로 앞 단이다.
    const chain: Array<[string, string]> = [
      ['body(페이지)', '--bg'],
      ['.pv 프레임', '--pv-bg'],
      ['.pv__card', '--pv-surface'],
      ['.pv__lock·.pv__avatar·.pv__genres 칩', '--pv-surface-2'],
    ];
    for (let i = 1; i < chain.length; i += 1) {
      const [name, tok] = chain[i];
      const [prevName, prevTok] = chain[i - 1];
      const ratio = contrast(resolve1(tok, maps), resolve1(prevTok, maps));
      expect(
        ratio,
        `${name}(${tok})이 뒤 면 ${prevName}(${prevTok})과 대비 ${ratio.toFixed(4)} 다`,
      ).toBeGreaterThanOrEqual(MIN_SURFACE_CONTRAST);
    }

    // 사슬의 전제 — `.pv__card` 가 실제로 칠해져 있어야 `--pv-surface-2` 와 `--pv-bg` 가
    // 맞닿지 않는다. 이 선언이 사라지면(투명·삭제) 둘이 직접 만나 대비 1.00 이 된다.
    const cardBg = bgOf(css, '\\.pv__card');
    expect(cardBg, '.pv__card 에 background 선언이 없다 — 사슬이 끊어진다').not.toBe(null);
    expect(cardBg, `.pv__card 가 투명하면 --pv-surface-2 와 --pv-bg 가 직접 맞닿는다`)
      .not.toMatch(/^transparent$/i);
    const cardTok = tokenOf(cardBg!);
    expect(cardTok, `.pv__card 배경이 토큰이 아니다(${cardBg})`).not.toBe(null);
    // 그리고 그 토큰이 실제로 사슬의 그 자리여야 한다(다른 토큰으로 바꿔치면 위 사슬이
    // 검사하는 값과 화면이 갈린다).
    expect(cardTok, '.pv__card 가 --pv-surface 이외의 면을 쓴다 — 사슬 검사가 무의미해진다')
      .toBe('--pv-surface');
  });

  // ── 사슬의 **두 번째** 전제 — 채움면이 실제로 그 안에 있는가 ────────────────
  // ⚠ 위 검사만 있던 판본에서 검수관이 사각을 실측했다(조건 R1): `.pv__lock` 을
  // `.pv__card` **밖으로** 옮기면(jsdom 확정 `lock.parent = pv`) 화면은 sand on sand =
  // **대비 1.00** 인데 **34 passed** 였다. 발생 경로가 CSS 가 아니라 **마크업 이동**이라
  // 위 검사가 못 본다.
  //
  // 그 판본의 주석은 *"사슬이 성립하는 전제(중간 면이 실제로 불투명한가)를 함께 단언한다"*
  // 라고 적고 있었다 — **거짓은 아니지만 전제를 하나만 셌다.** 전제는 둘이다:
  //   ① 중간 면이 불투명한가        ← 위 검사
  //   ② 채움면이 실제로 그 안에 있는가 ← 이 검사
  // 하나만 지키면 다른 하나로 사고가 그대로 들어온다. 그리고 이 파일은 **이미 jsdom 으로
  // `doc` 을 파싱하므로** `closest()` 한 줄이면 닫힌다 — 못 한 것이 아니라 **안 한 것**이었다.
  it('채움면이 .pv__card 안에 있다 — 밖으로 나가면 프레임과 직접 맞닿는다', () => {
    // `--pv-surface-2` 를 쓰는 면들. 사슬 검사가 "뒤 면 = .pv__card" 를 전제하므로
    // 그 전제가 마크업에서 실제로 성립하는지 본다.
    const fills = ['.pv__lock', '.pv__avatar'];
    for (const sel of fills) {
      const el = doc.querySelector(sel);
      expect(el, `${sel} 가 마크업에 없다 — 이 검사가 낡았다`).not.toBe(null);
      expect(
        el!.closest('.pv__card'),
        `${sel} 가 .pv__card 밖에 있다 — 뒤 면이 .pv(--pv-bg)가 되어 --pv-surface-2 와 `
        + '직접 맞닿는다(둘 다 sand 라 대비 1.00). 사슬 검사는 이 이동을 못 본다.',
      ).not.toBe(null);
    }
  });
});
