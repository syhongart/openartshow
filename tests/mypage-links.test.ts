// SNS·외부 링크 — 정규화·검증·표시.
//
// 감독 판단("SNS 아이디만 받는 것보다 URL 을 저장하는 방식이 확장성은 더 좋습니다")을
// 구현하되, **입력은 아이디로도 받는다**. 작가에게 URL 을 조립해 오라고 요구하지 않는다.
//
// 보안 축도 여기 있다 — `javascript:` 를 링크로 저장할 수 있으면 공개 프로필이
// 그대로 공격 표면이 된다. CSP 가 인라인 스크립트를 막아도 `href` 는 별개다.

import { describe, it, expect } from 'vitest';
import {
  PLATFORMS,
  PLATFORM_IDS,
  findPlatform,
  normalizeLinkUrl,
  checkLink,
  handleFromUrl,
  linkDisplayText,
} from '../frontend/js/mypage/links.js';
import { LIMITS } from '../frontend/js/mypage/schema.js';

describe('플랫폼 정의', () => {
  it('id 가 유일하고 other·website 가 있다', () => {
    expect(new Set(PLATFORM_IDS).size).toBe(PLATFORM_IDS.length);
    expect(PLATFORM_IDS).toContain('other');
    expect(PLATFORM_IDS).toContain('website');
    expect(PLATFORMS.length).toBe(PLATFORM_IDS.length);
  });

  it('알 수 없는 id 는 null', () => {
    expect(findPlatform('myspace')).toBe(null);
  });
});

describe('normalizeLinkUrl — 아이디도 URL 도 받는다', () => {
  it('@아이디 → 플랫폼 URL', () => {
    expect(normalizeLinkUrl('instagram', '@arthong')).toBe('https://instagram.com/arthong');
    expect(normalizeLinkUrl('instagram', 'arthong')).toBe('https://instagram.com/arthong');
    expect(normalizeLinkUrl('youtube', '@arthong')).toBe('https://youtube.com/@arthong');
    expect(normalizeLinkUrl('tiktok', 'arthong')).toBe('https://tiktok.com/@arthong');
  });

  it('스킴 없는 도메인은 https 를 붙인다', () => {
    expect(normalizeLinkUrl('website', 'arthong.com')).toBe('https://arthong.com/');
    expect(normalizeLinkUrl('website', 'arthong.com/works')).toBe('https://arthong.com/works');
  });

  it('프로토콜 상대 주소(//host)도 https 로 고정한다', () => {
    expect(normalizeLinkUrl('website', '//arthong.com')).toBe('https://arthong.com/');
  });

  it('website·other 는 아이디를 받지 않는다 — 도메인이 곧 값이다', () => {
    expect(normalizeLinkUrl('website', '@arthong')).toBe('');
    expect(normalizeLinkUrl('other', 'arthong')).toBe('');
  });

  it('위험 스킴은 정규화되지 않는다', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd', 'vbscript:x']) {
      expect(normalizeLinkUrl('website', bad), bad).toBe('');
      expect(normalizeLinkUrl('instagram', bad), bad).toBe('');
    }
  });

  it('**호스트를 가진 위험 스킴**도 막는다 — 이 축이 비어 있었다', () => {
    // ── 뮤테이션 M16 이 찾아낸 구멍 (2026-08-08) ──────────────────────────
    // `parseUrl` 의 프로토콜 검사를 일부러 지웠는데 **아무 테스트도 안 깨졌다.**
    // 바로 아래 줄의 `if (!url.hostname) return null` 이 대부분을 덮고 있었기
    // 때문이다 — `javascript:alert(1)` 은 hostname 이 비어 걸린다.
    //
    // 그런데 `javascript://example.com/%0aalert(1)` 은 다르다. `//` 뒤가 host 로
    // 파싱돼 `hostname === 'example.com'` 이 되고, hostname 검사를 **통과한다.**
    // 개행(%0a) 뒤의 코드는 브라우저가 실행한다 — 실제 우회 수법이다.
    //
    // 즉 두 방어가 겹쳐 있어서 하나를 없애도 다른 하나가 덮었고, 그래서 프로토콜
    // 검사가 **테스트로는 장식**이었다. 각 방어를 직접 겨냥해야 검출력이 생긴다.
    for (const bad of [
      'javascript://example.com/%0aalert(1)',
      'javascript://comment%0aalert(1)',
      'data://example.com/x',
      'vbscript://example.com/x',
    ]) {
      expect(normalizeLinkUrl('website', bad), bad).toBe('');
      expect(checkLink('website', bad).ok, bad).toBe(false);
    }
  });
});

describe('checkLink — 판정', () => {
  it('빈 입력', () => {
    expect(checkLink('instagram', '').code).toBe('empty');
  });

  it('위험 스킴은 malformed 가 아니라 scheme 으로 가른다 — 이유가 달라야 고칠 수 있다', () => {
    const r = checkLink('website', 'javascript:alert(1)');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('scheme');
  });

  it('플랫폼과 호스트가 다르면 막는다', () => {
    expect(checkLink('instagram', 'https://facebook.com/arthong').code).toBe('host');
    // 서브도메인은 인정한다.
    expect(checkLink('instagram', 'https://www.instagram.com/arthong').ok).toBe(true);
  });

  it('구 twitter.com 링크를 살려 준다 — 사용자가 예전에 복사해 둔 주소다', () => {
    expect(checkLink('x', 'https://twitter.com/arthong').ok).toBe(true);
    expect(checkLink('x', 'https://x.com/arthong').ok).toBe(true);
  });

  it('website·other 는 호스트를 따지지 않는다', () => {
    expect(checkLink('website', 'https://anything.example/a/b').ok).toBe(true);
  });

  it('기타 링크는 이름이 없으면 막는다', () => {
    expect(checkLink('other', 'https://a.example').code).toBe('label');
    expect(checkLink('other', 'https://a.example', '포트폴리오').ok).toBe(true);
  });

  it('길이 상한', () => {
    const long = `https://a.example/${'x'.repeat(LIMITS.linkUrl.max)}`;
    expect(checkLink('website', long).code).toBe('too-long');
  });
});

describe('handleFromUrl — 표시용 핸들', () => {
  it('경로 첫 조각을 뽑는다', () => {
    expect(handleFromUrl('instagram', 'https://instagram.com/arthong')).toBe('arthong');
    expect(handleFromUrl('instagram', 'https://instagram.com/arthong/')).toBe('arthong');
  });

  it('유튜브·틱톡은 @ 접두가 실제 경로에 있을 때만 핸들이다', () => {
    expect(handleFromUrl('youtube', 'https://youtube.com/@arthong')).toBe('arthong');
    // 존재하지 않는 핸들을 지어내지 않는다 — 채널 URL 은 핸들이 아니다.
    expect(handleFromUrl('youtube', 'https://youtube.com/channel/UCabc123')).toBe('');
    expect(handleFromUrl('youtube', 'https://youtube.com/c/ArtHong')).toBe('');
    expect(handleFromUrl('tiktok', 'https://tiktok.com/@arthong')).toBe('arthong');
  });

  it('website·other 는 핸들 개념이 없다', () => {
    expect(handleFromUrl('website', 'https://arthong.com/me')).toBe('');
  });
});

describe('linkDisplayText — 화면 문자열', () => {
  it('핸들이 있으면 플랫폼 규칙대로 @ 를 붙인다', () => {
    expect(linkDisplayText('instagram', 'https://instagram.com/arthong')).toBe('@arthong');
    // Behance·ArtStation 은 @ 를 쓰지 않는다.
    expect(linkDisplayText('behance', 'https://behance.net/arthong')).toBe('arthong');
  });

  it('핸들을 못 뽑으면 호스트명을 쓴다 — 빈칸을 두지 않는다', () => {
    expect(linkDisplayText('youtube', 'https://youtube.com/channel/UCabc')).toBe('youtube.com');
    expect(linkDisplayText('website', 'https://www.arthong.com/works')).toBe('arthong.com');
  });

  it('기타 링크는 사용자가 붙인 이름을 쓴다', () => {
    expect(linkDisplayText('other', 'https://a.example', '포트폴리오')).toBe('포트폴리오');
  });
});
