// @vitest-environment jsdom
//
// 저장 어댑터 — `LocalProfileStore`.
//
// ── 감독 판정(2026-08-08)이 여기 걸려 있다 ────────────────────────────────
// "어댑터 + 로컬" 을 고른 이유는 서버가 붙을 때 화면을 안 뜯기 위해서다. 그 약속이
// 지켜지는지는 **인터페이스가 비동기인가**와 **로컬 구현이 자기 한계를 스스로 말하는가**
// 두 가지로 확인된다. 후자가 `authoritativeUniqueness` 다 — 로컬은 이 기기밖에 못 보므로
// 통과가 "중복 아님" 을 뜻하지 않는다. 그 사실이 저장소 밖으로 새어 나가야 화면이
// 사용자에게 거짓말을 하지 않는다.
//
// 시계는 주입한다. 이 파일이 시각에 의존하면 CI 에서 간헐 실패가 나고, 그 실패는
// "가끔 깨지는 테스트" 로 취급돼 결국 아무도 안 본다.

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalProfileStore, loadOrCreate } from '../frontend/js/mypage/store.js';
import { emptyProfile, type Profile } from '../frontend/js/mypage/schema.js';

let clock = 1_000;
const now = () => clock;

function store() {
  return new LocalProfileStore(now);
}

function profile(overrides: Partial<Profile> = {}): Profile {
  return { ...emptyProfile(), nickname: 'arthong', ...overrides };
}

beforeEach(() => {
  localStorage.clear();
  clock = 1_000;
});

describe('인터페이스 계약', () => {
  it('모든 메서드가 Promise 를 준다 — 서버로 갈아탈 때 호출부가 안 바뀐다', () => {
    const s = store();
    expect(s.load('u1')).toBeInstanceOf(Promise);
    expect(s.save('u1', profile())).toBeInstanceOf(Promise);
    expect(s.checkNickname('arthong', 'u1')).toBeInstanceOf(Promise);
    expect(s.remove('u1')).toBeInstanceOf(Promise);
  });

  it('로컬 저장소는 전역 유일성을 판정하지 못한다고 스스로 말한다', () => {
    expect(store().authoritativeUniqueness).toBe(false);
  });
});

describe('load / save', () => {
  it('없으면 null, 저장하면 돌아온다', async () => {
    const s = store();
    expect(await s.load('u1')).toBe(null);

    const saved = await s.save('u1', profile({ bioShort: '안녕' }));
    expect(saved.ok).toBe(true);
    expect(saved.profile?.bioShort).toBe('안녕');

    const loaded = await s.load('u1');
    expect(loaded?.nickname).toBe('arthong');
    expect(loaded?.bioShort).toBe('안녕');
  });

  it('사용자별로 분리된다 — 한 기기에 여러 계정이 있어도 섞이지 않는다', async () => {
    const s = store();
    await s.save('google:A', profile({ nickname: 'aaa' }));
    await s.save('guest', profile({ nickname: 'bbb' }));
    expect((await s.load('google:A'))?.nickname).toBe('aaa');
    expect((await s.load('guest'))?.nickname).toBe('bbb');
  });

  it('createdAt 은 최초 저장에 고정되고 updatedAt 만 움직인다', async () => {
    const s = store();
    await s.save('u1', profile());
    clock = 5_000;
    const second = await s.save('u1', profile({ bioShort: '수정' }));
    expect(second.profile?.createdAt).toBe(1_000);
    expect(second.profile?.updatedAt).toBe(5_000);
  });

  it('저장 전에 정규화한다 — 화면을 우회해 들어온 값도 상한을 받는다', async () => {
    const s = store();
    const r = await s.save('u1', profile({ bioShort: 'x'.repeat(500) }));
    expect(r.profile?.bioShort.length).toBe(80);
  });

  it('손상된 JSON 은 null 로 — 화면은 "아직 안 만듦" 으로 다룬다', async () => {
    localStorage.setItem('lu-profile::u1', '{not json');
    expect(await store().load('u1')).toBe(null);
  });

  it('버전 없는 옛 저장도 읽어 낸다', async () => {
    localStorage.setItem('lu-profile::u1', JSON.stringify({ nickname: 'old', bio: '옛 소개' }));
    const loaded = await store().load('u1');
    expect(loaded?.nickname).toBe('old');
    expect(loaded?.bio).toBe('옛 소개');
  });
});

describe('별명 판정', () => {
  it('형식이 틀리면 저장하지 않는다', async () => {
    const r = await store().save('u1', profile({ nickname: 'a' }));
    expect(r.ok).toBe(false);
    expect(r.code).toBe('nickname');
    expect(await store().load('u1')).toBe(null);
  });

  it('중복을 모른다는 이유로 저장을 막지는 않는다 — 막으면 아무도 저장할 수 없다', async () => {
    const check = await store().checkNickname('arthong', 'u1');
    expect(check.ok).toBe(true);
    expect(check.pendingUniqueness).toBe(true);
    expect((await store().save('u1', profile())).ok).toBe(true);
  });

  it('이 기기의 다른 사용자가 쓰는 별명은 막는다', async () => {
    const s = store();
    await s.save('google:A', profile({ nickname: 'arthong' }));
    const check = await s.checkNickname('arthong', 'guest');
    expect(check.code).toBe('taken');
    expect((await s.save('guest', profile({ nickname: 'arthong' }))).code).toBe('nickname');
  });

  it('자기 별명을 유지한 채 다른 항목만 고칠 수 있다', async () => {
    const s = store();
    await s.save('u1', profile({ nickname: 'arthong' }));
    const again = await s.save('u1', profile({ nickname: 'arthong', bioShort: '수정' }));
    expect(again.ok).toBe(true);
  });

  it('별명을 바꾸면 옛 별명이 풀린다 — 자기 자신이 쓰던 이름에 갇히지 않는다', async () => {
    const s = store();
    await s.save('u1', profile({ nickname: 'arthong' }));
    await s.save('u1', profile({ nickname: 'hongart' }));
    // 다른 사용자가 옛 이름을 쓸 수 있어야 한다.
    expect((await s.checkNickname('arthong', 'guest')).ok).toBe(true);
    expect((await s.checkNickname('hongart', 'guest')).code).toBe('taken');
  });
});

describe('remove', () => {
  it('프로필과 별명 예약을 함께 푼다', async () => {
    const s = store();
    await s.save('u1', profile({ nickname: 'arthong' }));
    await s.remove('u1');
    expect(await s.load('u1')).toBe(null);
    expect((await s.checkNickname('arthong', 'guest')).ok).toBe(true);
  });
});

describe('저장 실패', () => {
  it('용량 초과를 사용자가 할 수 있는 말로 돌려준다', async () => {
    const original = Storage.prototype.setItem;
    // 프로필 키에만 실패시킨다 — 별명 인덱스까지 막으면 무엇이 실패했는지 흐려진다.
    Storage.prototype.setItem = function patched(key: string, value: string) {
      if (key.startsWith('lu-profile::')) {
        throw new DOMException('quota', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
    try {
      const r = await store().save('u1', profile());
      expect(r.ok).toBe(false);
      expect(r.code).toBe('quota');
      expect(r.message).toContain('프로필 사진');
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

describe('loadOrCreate', () => {
  it('없으면 빈 프로필을 준다 — 화면은 null 을 다루지 않는다', async () => {
    const p = await loadOrCreate(store(), 'u1');
    expect(p.nickname).toBe('');
    expect(p.userType).toBe('member');
  });

  it('있으면 그것을 준다', async () => {
    const s = store();
    await s.save('u1', profile({ nickname: 'arthong' }));
    expect((await loadOrCreate(s, 'u1')).nickname).toBe('arthong');
  });
});
