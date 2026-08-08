// 프로필 스키마 — 정규화·마이그레이션.
//
// 이 저장소가 스키마에서 낸 사고들을 겨냥한다:
//  · 옛 저장이 들어오면 조용히 빈 값이 되는 것 (chibi 레거시 키 이관이 그 자리였다)
//  · 상한을 UI 에만 걸어 두고 저장에는 안 거는 것 — `maxlength` 는 친절이지 방어가 아니다
//  · **빈 배열의 평균이 0 이라 단언을 통과하는 것** — 표본이 비었는데 통과한 전례가 있어,
//    아래 링크·장르 테스트는 "몇 개가 남았는가" 를 먼저 단언한다

import { describe, it, expect } from 'vitest';
import {
  PROFILE_VERSION,
  LIMITS,
  GENRE_MAX,
  emptyProfile,
  normalizeProfile,
  migrateProfile,
  profileDisplayName,
  bioMaxFor,
  type Profile,
} from '../frontend/js/mypage/schema.js';

describe('emptyProfile — 기본값', () => {
  it('현재 버전이 찍히고 이메일 공개는 꺼져 있다', () => {
    const p = emptyProfile();
    expect(p.v).toBe(PROFILE_VERSION);
    // 감독 지시: 이메일과 로그인 정보는 공개 프로필과 완전히 분리한다.
    expect(p.visibility.email).toBe(false);
    expect(p.visibility.profile).toBe(true);
  });

  it('타임스탬프를 스스로 찍지 않는다 — 시계는 store 한 곳에만 있다', () => {
    expect(emptyProfile().createdAt).toBe(0);
    expect(emptyProfile().updatedAt).toBe(0);
  });
});

describe('normalizeProfile — 방어', () => {
  it('아무것도 아닌 입력에도 유효한 프로필을 준다', () => {
    for (const junk of [null, undefined, 0, '', [], 'nope', true]) {
      const p = normalizeProfile(junk);
      expect(p.v).toBe(PROFILE_VERSION);
      expect(p.userType).toBe('member');
      expect(Array.isArray(p.links)).toBe(true);
    }
  });

  it('길이 상한을 저장 단계에서 자른다', () => {
    const p = normalizeProfile({ nickname: 'あ'.repeat(200), bioShort: 'x'.repeat(500) });
    expect(p.nickname.length).toBe(LIMITS.nickname.max);
    expect(p.bioShort.length).toBe(LIMITS.bioShort.max);
  });

  it('소개 상한은 활동 분야를 따른다 — 작가 1500 / 그 외 500', () => {
    const long = 'ㅁ'.repeat(2000);
    expect(normalizeProfile({ userType: 'artist', bio: long }).bio.length).toBe(LIMITS.bioArtist.max);
    expect(normalizeProfile({ userType: 'member', bio: long }).bio.length).toBe(LIMITS.bio.max);
    expect(bioMaxFor('artist')).toBe(LIMITS.bioArtist.max);
    expect(bioMaxFor('collector')).toBe(LIMITS.bio.max);
  });

  it('제어문자는 제거하되 개행은 남긴다 — 소개·전시 이력은 여러 줄이 정상이다', () => {
    const p = normalizeProfile({ bio: 'A\u0000B\u001fC\nD' });
    expect(p.bio).toBe('ABC\nD');
  });

  it('알 수 없는 활동 분야·장르는 버린다', () => {
    const p = normalizeProfile({ userType: 'wizard', genres: ['painting', '해킹', 'photo'] });
    expect(p.userType).toBe('member');
    expect(p.genres).toEqual(['painting', 'photo']);
  });

  it('장르는 GENRE_MAX 개까지, 중복은 하나로', () => {
    const p = normalizeProfile({
      genres: ['painting', 'painting', 'photo', 'sculpture', 'media', 'digital', 'craft'],
    });
    expect(p.genres.length).toBe(GENRE_MAX);
    expect(new Set(p.genres).size).toBe(GENRE_MAX);
  });

  it('프로필 이미지는 이미지 dataURL 만 통과한다', () => {
    const good = 'data:image/png;base64,iVBORw0KGgo=';
    expect(normalizeProfile({ profileImage: good }).profileImage).toBe(good);
    // 스크립트를 이미지인 척 넣는 경로를 막는다. 잘라 내지 않고 통째로 버린다 —
    // 잘린 dataURL 은 깨진 이미지라 화면에 X 가 뜬다.
    for (const bad of [
      'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'https://example.com/a.png',
      'data:image/svg+xml;base64,PHN2Zz4=', // SVG 는 스크립트를 품을 수 있어 제외
    ]) {
      expect(normalizeProfile({ profileImage: bad }).profileImage).toBe('');
    }
  });

  it('용량을 넘는 이미지는 버린다', () => {
    const huge = `data:image/png;base64,${'A'.repeat(LIMITS.profileImageBytes.max)}`;
    expect(normalizeProfile({ profileImage: huge }).profileImage).toBe('');
  });
});

describe('normalizeProfile — 링크', () => {
  it('URL 없는 링크는 버리고, sortOrder 를 0부터 다시 매긴다', () => {
    const p = normalizeProfile({
      links: [
        { platform: 'instagram', url: 'https://instagram.com/b', sortOrder: 9 },
        { platform: 'x', url: '', sortOrder: 1 },
        { platform: 'website', url: 'https://a.example', sortOrder: 3 },
      ],
    });
    // 표본이 비어 통과하는 사고를 막는다 — 개수를 먼저 단언한다.
    expect(p.links.length).toBe(2);
    expect(p.links.map((l) => l.sortOrder)).toEqual([0, 1]);
    // 끝의 `/` 는 URL 표준 정규화 결과다(`new URL(...).toString()`). B1 수정으로
    // 정규화가 `safeLinkUrl` 을 지나면서 생겼다 — 단언을 **느슨하게 한 것이 아니라**
    // 저장되는 실제 값이 바뀐 것이다.
    expect(p.links[0].url).toBe('https://a.example/');
  });

  it('알 수 없는 플랫폼은 other 로 접어 넣는다 — 링크 자체를 잃지 않는다', () => {
    const p = normalizeProfile({ links: [{ platform: 'myspace', url: 'https://a.example' }] });
    expect(p.links.length).toBe(1);
    expect(p.links[0].platform).toBe('other');
  });

  // ── GS-1 (검수관 명세, 블로커 B1) ────────────────────────────────────────
  // **저장에 실행 가능한 스킴이 남지 않는다.**
  //
  // 이 검사가 없던 동안 `javascript:alert(1)` 이 `normalizeProfile` → `publicView` →
  // `renderPreview` 를 지나 `<a href>` 에 그대로 들어갔다(검수관이 실행으로 확인).
  // 화면 경로의 `checkLink` 가 우연히 막고 있었을 뿐이고, 우리가 만들겠다고 코드에
  // 적어 둔 `/@nickname` 공개 페이지에는 그 왕복이 없다.
  //
  // **GS-2(경계 통합)와 짝이다.** 하나만 두면 두 방어가 다시 서로를 가린다 —
  // 이 diff 가 이미 M6·M16 으로 그 형태를 두 번 겪었다.
  it('**위험 스킴 링크는 저장에서 제거된다** — 정규화가 마지막 문이다', () => {
    const evil = [
      'javascript:alert(1)',
      'javascript://example.com/%0aalert(1)',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'vbscript://example.com/x',
      'file:///etc/passwd',
    ];
    for (const url of evil) {
      const p = normalizeProfile({ links: [{ platform: 'website', url }] });
      expect(p.links.length, url).toBe(0);
    }
    // 같은 입력에 정상 링크를 섞으면 정상만 남는다 — 통째로 버리지 않는다.
    const mixed = normalizeProfile({
      links: [
        { platform: 'website', url: 'javascript:alert(1)' },
        { platform: 'website', url: 'https://arthong.example/works' },
      ],
    });
    expect(mixed.links.length).toBe(1);
    expect(mixed.links[0].url).toBe('https://arthong.example/works');
  });

  it('링크 개수 상한을 넘기지 않는다', () => {
    const many = Array.from({ length: LIMITS.links.max + 8 }, (_, i) => ({
      platform: 'website', url: `https://a${i}.example`, sortOrder: i,
    }));
    expect(normalizeProfile({ links: many }).links.length).toBe(LIMITS.links.max);
  });
});

describe('migrateProfile', () => {
  it('버전 없는 옛 저장을 현재 버전으로 올린다', () => {
    const legacy = { nickname: 'arthong', bio: '안녕하세요' };
    const p = migrateProfile(legacy);
    expect(p.v).toBe(PROFILE_VERSION);
    // 값이 살아 있어야 한다. 마이그레이션이 조용히 초기화하는 것이 가장 무서운 실패다.
    expect(p.nickname).toBe('arthong');
    expect(p.bio).toBe('안녕하세요');
  });

  it('현재 버전 저장은 그대로 통과한다', () => {
    const now: Profile = { ...emptyProfile(), nickname: 'hong', createdAt: 1, updatedAt: 2 };
    const p = migrateProfile(now);
    expect(p.nickname).toBe('hong');
    expect(p.createdAt).toBe(1);
    expect(p.updatedAt).toBe(2);
  });
});

describe('profileDisplayName', () => {
  it('작가명 → 별명 → 이름 없음 순으로 떨어진다', () => {
    const base = emptyProfile();
    expect(profileDisplayName({ ...base, displayName: '홍길동', nickname: 'hong' })).toBe('홍길동');
    expect(profileDisplayName({ ...base, displayName: '', nickname: 'hong' })).toBe('hong');
    expect(profileDisplayName(base)).toBe('이름 없음');
  });
});
