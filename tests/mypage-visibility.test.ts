// 공개 프로필 유도 — "다른 사람이 보는 모습".
//
// 이 파일이 지키는 것은 기능이 아니라 **약속**이다. 사용자가 "비공개" 를 켰는데
// 공개 페이지에 남아 있으면 그것은 버그가 아니라 사고다. 그래서 각 스위치를 하나씩
// 끄고 결과가 `null` 인지 본다 — 빈 문자열이 아니라 `null` 인 것까지 단언한다
// (화면이 "비공개" 와 "안 적음" 을 구별할 수 있어야 나중에 문구를 나눌 수 있다).

import { describe, it, expect } from 'vitest';
import { emptyProfile, type Profile } from '../frontend/js/mypage/schema.js';
import { publicView, isEmptyPublicView, isArtistLike } from '../frontend/js/mypage/visibility.js';

/** 모든 항목이 채워진 작가 프로필. 여기서 하나씩 꺼 보며 판정한다. */
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
    exhibitions: '2025 개인전',
    gallery: '갤러리 하나',
    inquiryOpen: true,
    saleOpen: true,
    links: [
      { platform: 'instagram', url: 'https://instagram.com/arthong', handle: '', label: '', sortOrder: 1, isVisible: true },
      { platform: 'website', url: 'https://arthong.com', handle: '', label: '', sortOrder: 0, isVisible: true },
    ],
    ...overrides,
  };
}

describe('publicView — 마스터 스위치', () => {
  it('프로필 공개를 끄면 별명만 남고 전부 사라진다', () => {
    const view = publicView(filled({ visibility: { ...emptyProfile().visibility, profile: false } }));
    expect(view.visible).toBe(false);
    expect(view.nickname).toBe('arthong'); // 주소로 도달했을 때 무엇인지는 알려야 한다
    expect(view.bio).toBe(null);
    expect(view.bioShort).toBe(null);
    expect(view.location).toBe(null);
    expect(view.links).toEqual([]);
    expect(view.genres).toEqual([]);
    expect(view.exhibitions).toBe(null);
    expect(view.gallery).toBe(null);
    expect(view.showInquiry).toBe(false);
    expect(view.saleOpen).toBe(false);
    expect(view.profileImage).toBe(null);
  });
});

describe('publicView — 항목 스위치', () => {
  it('소개를 끄면 bio 와 한 줄 소개가 함께 사라진다', () => {
    // 한 줄 소개만 남으면 스위치가 거짓말을 하는 셈이다.
    const p = filled();
    p.visibility.bio = false;
    const view = publicView(p);
    expect(view.bio).toBe(null);
    expect(view.bioShort).toBe(null);
    // 다른 항목은 그대로여야 한다 — 한 스위치가 다른 것을 끄면 그것도 사고다.
    expect(view.location).toBe('서울');
    expect(view.links.length).toBe(2);
  });

  it('활동 지역을 끄면 지역만 사라진다', () => {
    const p = filled();
    p.visibility.location = false;
    const view = publicView(p);
    expect(view.location).toBe(null);
    expect(view.bio).toBe('미디어 아티스트입니다.');
  });

  it('링크를 끄면 전부 사라진다', () => {
    const p = filled();
    p.visibility.links = false;
    expect(publicView(p).links).toEqual([]);
  });

  it('개별 링크의 isVisible 이 꺼지면 그것만 사라진다', () => {
    const p = filled();
    p.links[0].isVisible = false; // instagram
    const view = publicView(p);
    expect(view.links.length).toBe(1);
    expect(view.links[0].platform).toBe('website');
  });

  it('문의 버튼은 공개 설정과 문의 가능 여부를 함께 본다', () => {
    expect(publicView(filled()).showInquiry).toBe(true);

    const off = filled();
    off.visibility.inquiry = false;
    expect(publicView(off).showInquiry).toBe(false);

    const closed = filled({ inquiryOpen: false });
    expect(publicView(closed).showInquiry).toBe(false);
  });
});

describe('publicView — 링크 표시', () => {
  it('sortOrder 대로 정렬하고 표시 문자열을 함께 준다', () => {
    const view = publicView(filled());
    expect(view.links.map((l) => l.platform)).toEqual(['website', 'instagram']);
    expect(view.links[1].text).toBe('@arthong');
    expect(view.links[0].text).toBe('arthong.com');
  });

  it('URL 이 빈 링크는 공개에 나오지 않는다', () => {
    const p = filled();
    p.links[0].url = '';
    expect(publicView(p).links.length).toBe(1);
  });
});

describe('publicView — 작가 항목', () => {
  it('작가·갤러리만 전시 이력·소속·장르·판매를 보여준다', () => {
    expect(isArtistLike('artist')).toBe(true);
    expect(isArtistLike('gallery')).toBe(true);
    expect(isArtistLike('collector')).toBe(false);
    expect(isArtistLike('member')).toBe(false);
  });

  it('일반 회원으로 바꾸면 옛 전시 이력이 공개에서 사라진다 (저장은 남는다)', () => {
    const p = filled({ userType: 'collector' });
    const view = publicView(p);
    expect(view.exhibitions).toBe(null);
    expect(view.gallery).toBe(null);
    expect(view.genres).toEqual([]);
    expect(view.saleOpen).toBe(false);
    // 저장 자체는 지우지 않는다 — 되돌리면 그대로 돌아와야 한다.
    expect(p.exhibitions).toBe('2025 개인전');
  });

  it('활동 분야 배지는 일반 회원에게 달지 않는다', () => {
    expect(publicView(filled()).userTypeName).toBe('작가');
    expect(publicView(filled({ userType: 'gallery' })).userTypeName).toBe('갤러리');
    expect(publicView(filled({ userType: 'member' })).userTypeName).toBe(null);
  });
});

describe('isEmptyPublicView', () => {
  it('이름 말고 아무것도 없으면 비었다고 본다', () => {
    const bare = { ...emptyProfile(), nickname: 'hong' };
    expect(isEmptyPublicView(publicView(bare))).toBe(true);
  });

  it('한 줄 소개 하나만 있어도 비지 않았다', () => {
    const p = { ...emptyProfile(), nickname: 'hong', bioShort: '안녕하세요' };
    expect(isEmptyPublicView(publicView(p))).toBe(false);
  });

  it('비공개 프로필은 비었다고 본다', () => {
    const p = filled();
    p.visibility.profile = false;
    expect(isEmptyPublicView(publicView(p))).toBe(true);
  });
});
