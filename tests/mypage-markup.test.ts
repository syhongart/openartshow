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
    // 안에 든 것은 아바타 이미지와 이름뿐이라 접근 이름이 안 생긴다.
    expect(el?.getAttribute('aria-label')).toBeTruthy();
  });

  it('신원 블록이 아바타와 이름을 **품는다** — 감독이 지목한 그 영역이다', () => {
    const el = doc.querySelector('[data-mp="preview-identity"]')!;
    expect(el.querySelector('[data-mp="preview-avatar"]'), '아바타').not.toBe(null);
    expect(el.querySelector('[data-mp="preview-name"]'), '이름').not.toBe(null);
  });

  it('신원 블록 안에 **중첩 버튼이 없다** — HTML 이 허용하지 않는다', () => {
    const el = doc.querySelector('[data-mp="preview-identity"]')!;
    expect(el.querySelectorAll('button, a[href], input, select, textarea').length).toBe(0);
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
