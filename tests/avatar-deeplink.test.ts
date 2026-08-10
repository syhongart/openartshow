// 캐릭터 디자인 딥링크 프로토콜 — 검수관 게이트 명세 G-A · G-D · G-E (순수 축).
//
// ── 왜 이 파일이 생겼나 (검수관 반려, 2026-08-08) ─────────────────────────
// 첫 판본은 **테스트가 0건**이었다. 코드를 통째로 지워도 아무것도 안 깨졌고, 그 상태로
// 블로커 3건이 들어갔다:
//   B1 미술관에서 편집기를 다시 열고 저장하면 페이지가 튕겨 나갔다
//   B2 ESC·배경클릭으로 닫으면 복귀가 안 됐다(주석은 된다고 적고 있었다)
//   B3 사진 공유 링크에 딥링크가 실려 나가 제3자가 편집기 화면을 봤다
//
// **셋의 뿌리는 하나였다 — 1회 명령을 세션 상태로 남긴 것.** 그래서 이 파일이 가장
// 무겁게 보는 축은 `stripDeepLinkParams` 다: 파라미터가 URL 에서 사라지는가, 그리고
// **다른 파라미터는 살아남는가.**
//
// ── 못 보는 것 ────────────────────────────────────────────────────────────
// 이 파일은 순수 함수만 본다. "편집기가 실제로 열리는가"·"닫으면 돌아오는가" 는
// `tests/avatar-deeplink-hud.test.ts`(jsdom) 소관이다. 실기기·터치·WebGPU 는 둘 다 못 본다.

import { describe, it, expect } from 'vitest';
import {
  AVATAR_PARAM,
  AVATAR_ON,
  BACK_PARAM,
  buildAvatarDeepLink,
  readAvatarDeepLink,
  resolveBackTarget,
  backTargetKeys,
  stripDeepLinkParams,
} from '../frontend/js/avatar-deeplink.js';

// ── G-A · 생산자와 소비자가 같은 프로토콜을 쓴다 ──────────────────────────
// **값을 다시 적지 않는다.** 생산자가 만든 URL 을 소비자 해석기에 통과시켜 왕복이
// 성립하는지만 본다 — 여기에 `'avatar=1'` 을 문자열로 박으면 그것이 세 번째 미러다.
describe('G-A — 프로토콜 왕복', () => {
  it('생산자가 만든 링크를 소비자가 그대로 읽는다', () => {
    const url = buildAvatarDeepLink('./index.html', 'mypage');
    const search = url.slice(url.indexOf('?'));
    const intent = readAvatarDeepLink(search);
    expect(intent.open).toBe(true);
    expect(intent.backTarget).toBe('./mypage.html');
  });

  it('파라미터 이름을 바꿔도 왕복이 유지된다 — 미러가 없다는 증거', () => {
    // SSOT 상수를 그대로 써서 URL 을 만들면, 이름이 바뀌어도 이 테스트는 통과한다.
    // 통과하는 것이 정상이다(검수관 G-A 뮤테이션 ①).
    const search = `?${AVATAR_PARAM}=${AVATAR_ON}&${BACK_PARAM}=mypage`;
    expect(readAvatarDeepLink(search).open).toBe(true);
  });

  it('돌아올 곳이 없으면 back 을 붙이지 않는다', () => {
    const url = buildAvatarDeepLink('./index.html');
    expect(url.includes(BACK_PARAM)).toBe(false);
    expect(readAvatarDeepLink(url.slice(url.indexOf('?'))).backTarget).toBe(null);
  });

  it('생산 단계에서 이미 화이트리스트를 거른다', () => {
    const url = buildAvatarDeepLink('./index.html', 'https://evil.example');
    expect(url.includes('evil')).toBe(false);
  });
});

describe('readAvatarDeepLink — 열기 판정', () => {
  it('값이 정확히 켜짐일 때만 연다', () => {
    expect(readAvatarDeepLink(`?${AVATAR_PARAM}=${AVATAR_ON}`).open).toBe(true);
    for (const off of ['0', '', 'true', 'yes', '11']) {
      expect(readAvatarDeepLink(`?${AVATAR_PARAM}=${off}`).open, off).toBe(false);
    }
    expect(readAvatarDeepLink('').open).toBe(false);
    expect(readAvatarDeepLink('?g=abc').open).toBe(false);
  });
});

// ── G-E · 화이트리스트 견고성 ─────────────────────────────────────────────
describe('G-E — 돌아갈 곳은 화이트리스트로만 정한다', () => {
  it('등록된 키만 통과한다', () => {
    expect(resolveBackTarget('mypage')).toBe('./mypage.html');
    for (const key of ['', 'unknown', 'index', 'MYPAGE']) {
      expect(resolveBackTarget(key), key).toBe(null);
    }
  });

  it('외부 주소는 키가 아니다 — 열린 리다이렉트 차단', () => {
    for (const bad of [
      'https://evil.example',
      '//evil.example',
      'http://evil.example/x',
      'javascript:alert(1)',
      '/etc/passwd',
    ]) {
      expect(resolveBackTarget(bad), bad).toBe(null);
    }
  });

  it('**프로토타입 체인 키가 통과하지 않는다** — 첫 판본은 뚫려 있었다', () => {
    // ── 검수관 P1 이 실측으로 찾은 구멍 ─────────────────────────────────
    // 첫 판본은 plain object 조회(`BACK_TARGETS[key]`)라 `Object.prototype` 멤버가
    // truthy 로 걸렸다:
    //   ?back=constructor → function Object() { [native code] }
    //   ?back=toString    → function toString() { [native code] }
    //   ?back=__proto__   → [object Object]
    // 외부 호스트로는 못 나가서 열린 리다이렉트는 아니었지만, 주석은
    // *"화이트리스트로만 정한다"* 고 단언하고 있었고 그것이 부정확했다.
    // **보안 처방의 자기주장은 케이스 표로 확인하기 전까지 주장일 뿐이다.**
    for (const key of [
      'constructor', 'toString', '__proto__', 'valueOf',
      'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString',
    ]) {
      expect(resolveBackTarget(key), key).toBe(null);
    }
  });

  it('null·undefined·비문자열에도 죽지 않는다', () => {
    expect(resolveBackTarget(null)).toBe(null);
    expect(resolveBackTarget(undefined)).toBe(null);
  });

  it('등록된 값은 전부 상대 경로다 — 나중에 외부 URL 이 들어오는 것까지 막는다', () => {
    const keys = backTargetKeys();
    expect(keys.length).toBeGreaterThan(0); // 표본이 비어 통과하는 것을 막는다
    for (const key of keys) {
      const target = resolveBackTarget(key);
      expect(target, key).toBeTruthy();
      expect(target!.startsWith('./'), `${key} → ${target}`).toBe(true);
    }
  });
});

// ── G-D · 파라미터를 소비한다 (블로커 B1·B3 의 뿌리) ──────────────────────
describe('G-D — 딥링크 파라미터가 URL 에 남지 않는다', () => {
  it('avatar 와 back 을 둘 다 덜어낸다', () => {
    expect(stripDeepLinkParams(`?${AVATAR_PARAM}=${AVATAR_ON}&${BACK_PARAM}=mypage`)).toBe('');
  });

  it('둘을 **각각** 덜어낸다 — 한 단언에 묶지 않는다', () => {
    // 검수관 명세: 한쪽만 지우는 뮤테이션이 통과하지 않도록 개별로 단언한다.
    expect(stripDeepLinkParams(`?${AVATAR_PARAM}=${AVATAR_ON}`)).toBe('');
    expect(stripDeepLinkParams(`?${BACK_PARAM}=mypage`)).toBe('');
  });

  it('**다른 파라미터는 보존한다** — 없으면 "전부 지우기" 가 통과한다', () => {
    // 이 단언이 없으면 갤러리 전환(`?g=`)·성능 디버그(`?debug=perf`)가 조용히 깨진다.
    expect(stripDeepLinkParams(`?g=abc&${AVATAR_PARAM}=${AVATAR_ON}`)).toBe('?g=abc');
    expect(stripDeepLinkParams(`?${AVATAR_PARAM}=${AVATAR_ON}&debug=perf`)).toBe('?debug=perf');
    expect(stripDeepLinkParams(`?g=abc&${AVATAR_PARAM}=${AVATAR_ON}&${BACK_PARAM}=mypage&debug=perf`))
      .toBe('?g=abc&debug=perf');
  });

  it('딥링크가 없으면 원문을 그대로 둔다 — 불필요한 히스토리 조작을 막는다', () => {
    expect(stripDeepLinkParams('?g=abc')).toBe('?g=abc');
    expect(stripDeepLinkParams('')).toBe('');
  });

  it('공유 URL 에 실려 나가지 않는다 — 제3자가 편집기 화면을 보던 경로', () => {
    // B3: `getShareUrl()` 이 `location.href` 를 직반환하므로, 소비가 안 되면
    // 사진 공유 링크에 딥링크가 그대로 실린다.
    const consumed = stripDeepLinkParams(`?g=main&${AVATAR_PARAM}=${AVATAR_ON}&${BACK_PARAM}=mypage`);
    expect(consumed.includes(AVATAR_PARAM)).toBe(false);
    expect(consumed.includes(BACK_PARAM)).toBe(false);
    expect(consumed).toBe('?g=main');
  });
});
