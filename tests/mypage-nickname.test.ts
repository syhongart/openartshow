// 별명 검증·추천.
//
// 감독 안의 "실시간 또는 중복확인 버튼 / 2~20자 / 한글·영문·숫자·_ / 금칙어 및
// 운영자·공식계정 사칭 방지" 를 하나씩 건다.
//
// ── 여기서 특히 조심하는 것 ─────────────────────────────────────────────────
// 통과 판정이 **무엇을 보증하는가**. 서버가 없는 지금 `ok: true` 는 "중복이 아니다" 가
// 아니라 "형식은 맞고 중복은 아직 모른다" 이다. 그것을 화면이 ✓ 로 보여주면 우리는
// 못 잰 것을 통과로 적는 것이다 — 이 저장소가 명문화한 상시 위험이 정확히 그 형태다.
// 그래서 `pendingUniqueness` 를 단언한다.

import { describe, it, expect } from 'vitest';
import {
  checkNickname,
  suggestNicknames,
  nicknameKey,
  nicknameLength,
} from '../frontend/js/mypage/nickname.js';
import { LIMITS } from '../frontend/js/mypage/schema.js';

const authoritative = { uniquenessAuthoritative: true };

describe('checkNickname — 형식', () => {
  it('한글·영문·숫자·밑줄을 통과시킨다', () => {
    for (const ok of ['arthong', '홍길동', 'art_hong', 'a1', '작가99', 'ART']) {
      expect(checkNickname(ok, authoritative).ok, ok).toBe(true);
    }
  });

  it('길이 경계 — 미만은 막고 경계값은 통과한다', () => {
    const { min, max } = LIMITS.nickname;
    expect(checkNickname('a'.repeat(min - 1), authoritative).code).toBe('too-short');
    expect(checkNickname('a'.repeat(min), authoritative).ok).toBe(true);
    expect(checkNickname('a'.repeat(max), authoritative).ok).toBe(true);
    expect(checkNickname('a'.repeat(max + 1), authoritative).code).toBe('too-long');
  });

  it('한글은 코드포인트로 센다 — 사용자가 세는 것과 같아야 한다', () => {
    expect(nicknameLength('홍길동')).toBe(3);
    // 20자 한글이 통과해야 한다. UTF-16 바이트로 세면 여기서 막힌다.
    expect(checkNickname('가'.repeat(LIMITS.nickname.max), authoritative).ok).toBe(true);
  });

  it('허용하지 않는 문자를 막는다', () => {
    for (const bad of ['art hong', 'art-hong', 'art.hong', 'art@hong', '작가!', 'アート']) {
      expect(checkNickname(bad, authoritative).code, bad).toBe('charset');
    }
  });

  it('한글 자모 단독은 charset 이 아니라 jamo 로 가른다 — 이유를 알려줘야 고친다', () => {
    for (const bad of ['ㄱㄴ', 'ㅏㅏ', '홍ㄱ동']) {
      expect(checkNickname(bad, authoritative).code, bad).toBe('jamo');
    }
  });

  it('밑줄로 시작하거나 끝날 수 없다', () => {
    expect(checkNickname('_hong', authoritative).code).toBe('edge');
    expect(checkNickname('hong_', authoritative).code).toBe('edge');
    expect(checkNickname('h_o_n_g', authoritative).ok).toBe(true);
  });

  it('숫자로만 만들 수 없다 — 나중에 내부 번호와 구별되지 않는다', () => {
    expect(checkNickname('12345', authoritative).code).toBe('numeric');
    expect(checkNickname('1a', authoritative).ok).toBe(true);
  });

  it('빈 입력·공백만은 empty', () => {
    expect(checkNickname('', authoritative).code).toBe('empty');
    expect(checkNickname('   ', authoritative).code).toBe('empty');
  });
});

describe('checkNickname — 금칙어·사칭', () => {
  it('금칙어가 부분 문자열로 들어 있으면 막는다', () => {
    expect(checkNickname('시발작가', authoritative).code).toBe('banned');
    expect(checkNickname('myfuckart', authoritative).code).toBe('banned');
  });

  it('운영자·공식 계정 사칭을 막는다', () => {
    for (const bad of ['admin', 'ADMIN', 'openartshow', '관리자', '운영자', 'official', '아야모']) {
      expect(checkNickname(bad, authoritative).code, bad).toBe('reserved');
    }
  });

  it('밑줄·숫자 치환 우회도 막는다', () => {
    for (const bad of ['a_d_m_i_n', '4dmin', 'r00t', '0fficial']) {
      expect(checkNickname(bad, authoritative).code, bad).toBe('reserved');
    }
  });

  it('예약어를 포함하기만 하는 이름은 막지 않는다 — 부분 일치는 과잉 차단이다', () => {
    for (const ok of ['admiral', 'administrator2', '관리자님', 'modern']) {
      expect(checkNickname(ok, authoritative).ok, ok).toBe(true);
    }
  });
});

describe('checkNickname — 중복', () => {
  it('taken 에 있으면 막는다 (대소문자 무시)', () => {
    const taken = new Set([nicknameKey('ArtHong')]);
    expect(checkNickname('arthong', { taken, ...authoritative }).code).toBe('taken');
    expect(checkNickname('ARTHONG', { taken, ...authoritative }).code).toBe('taken');
  });

  it('자기 자신의 별명에는 걸리지 않는다 — 편집 중 자기 이름을 막으면 저장이 안 된다', () => {
    const taken = new Set([nicknameKey('arthong')]);
    expect(checkNickname('arthong', { taken, self: 'ArtHong', ...authoritative }).ok).toBe(true);
  });

  it('전역 판정이 아니면 통과해도 pendingUniqueness 가 켜진다', () => {
    // 이것이 이 파일의 핵심 단언이다. 로컬만 보고 "사용 가능합니다" 라고 말하면
    // 못 잰 것을 통과로 적는 것이다.
    const local = checkNickname('arthong');
    expect(local.ok).toBe(true);
    expect(local.pendingUniqueness).toBe(true);
    expect(local.message).toContain('중복 확인은');

    const server = checkNickname('arthong', authoritative);
    expect(server.ok).toBe(true);
    expect(server.pendingUniqueness).toBe(false);
    expect(server.message).toBe('사용 가능한 별명입니다.');
  });
});

describe('suggestNicknames', () => {
  it('감독 안의 형태를 만든다 — 숫자 꼬리와 밑줄 분절', () => {
    const taken = new Set([nicknameKey('arthong')]);
    const list = suggestNicknames('arthong', { taken, ...authoritative });
    expect(list.length).toBe(3);
    // 전부 실제로 통과하는 별명이어야 한다. 추천이 다시 거부당하면 추천이 아니다.
    for (const s of list) {
      expect(checkNickname(s, { taken, ...authoritative }).ok, s).toBe(true);
    }
    expect(list.some((s) => /^arthong\d+$/.test(s))).toBe(true);
    expect(list.some((s) => s.includes('_'))).toBe(true);
  });

  it('결정적이다 — 같은 입력이면 같은 후보. 화면을 다시 열어도 고르던 것이 남는다', () => {
    const a = suggestNicknames('arthong', authoritative);
    const b = suggestNicknames('arthong', authoritative);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('상한을 넘기지 않는다', () => {
    const long = 'a'.repeat(LIMITS.nickname.max);
    for (const s of suggestNicknames(long, authoritative)) {
      expect(nicknameLength(s)).toBeLessThanOrEqual(LIMITS.nickname.max);
    }
  });

  it('금칙·사칭 입력에는 후보를 만들지 않는다 — 금칙어에 숫자만 붙여 권할 수는 없다', () => {
    expect(suggestNicknames('시발', authoritative)).toEqual([]);
    expect(suggestNicknames('admin', authoritative)).toEqual([]);
  });

  it('쓸 문자가 하나도 없으면 빈 배열', () => {
    expect(suggestNicknames('!!!', authoritative)).toEqual([]);
    expect(suggestNicknames('', authoritative)).toEqual([]);
  });
});
