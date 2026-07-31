// @vitest-environment jsdom
//
// URL 노브 — 값을 밖에서 여는 유일한 지점.
//
// ── 왜 이 파일이 생겼나 (감독 지시 2026-07-31 "URL로 값 조절할 수 있게 열어둬") ──
// `readNumOpt` 가 신설되면서 이 모듈에 **"없음"과 "0"을 구별해야 하는 책임**이 생겼다.
// 그 구별이 무너지는 방식이 둘 다 조용하다:
//
//   · `null` 대신 fallback 을 주면 → 소비처의 상황별 기본값(시간대 등)이 통째로 죽는다
//   · `?k=0` 을 "없음"으로 읽으면  → 0 을 지정하려는 시도가 조용히 무시된다
//
// 둘 다 화면에서는 "노브가 안 먹는다" 로만 보인다. 그래서 여기서 잰다.
//
// ── 못 보는 것 ──────────────────────────────────────────────────────────────
// 이 값이 소비처에서 실제로 재질·유니폼에 닿는지는 못 본다 — 그것이 판정/집행 경계이고,
// 수면 쪽은 `tests/world2-ocean.test.ts` 의 「URL 노브」 블록이 실제 `create` 를 태워 본다.

import { describe, it, expect, afterEach } from 'vitest';
import { readNum, readNumOpt, readEnum, writeNumOpt } from '../frontend/js/world2/url-knob.js';

/** jsdom 의 주소를 바꾼다. 모듈은 호출 시점에 `location.search` 를 읽으므로 이것으로 족하다 */
const setSearch = (s: string) => window.history.replaceState({}, '', s || location.pathname);
afterEach(() => setSearch(''));

describe('readNumOpt — "지정 안 됨"을 값으로 구별한다', () => {
  it('★ 파라미터가 없으면 null 이다 — 이것이 `readNum` 과 갈리는 지점이다', () => {
    setSearch('?other=1');
    expect(readNumOpt('k', 0, 10)).toBeNull();
  });

  it('★ 0 은 유효한 지정이다 — null 로 뭉개면 0 을 고를 수 없다', () => {
    // 소비처가 `노브 ?? 기본값` 으로 쓰므로, 여기서 0 을 null 로 돌려주면
    // `?k=0` 이 기본값으로 되돌아간다. 평평한 수면을 보려는 시도가 그 값이다.
    setSearch('?k=0');
    expect(readNumOpt('k', 0, 10)).toBe(0);
  });

  it('숫자가 아니면 null 이다 — 지정으로 치지 않는다', () => {
    setSearch('?k=abc');
    expect(readNumOpt('k', 0, 10)).toBeNull();
  });

  it('빈 값은 null 이다 — `?k=` 는 지정이 아니다', () => {
    // `Number('')` 는 0 이다. 그대로 두면 `?k=` 가 "0 을 지정함" 이 되는데,
    // 주소창에서 값을 지우다 만 상태가 그 형태라 의도로 읽을 수 없다.
    setSearch('?k=');
    expect(readNumOpt('k', 1, 10)).toBeNull();
  });

  it('Infinity·NaN 은 null 이다 — 클램프를 통과시키면 안 된다', () => {
    setSearch('?k=Infinity');
    expect(readNumOpt('k', 0, 10)).toBeNull();
    setSearch('?k=NaN');
    expect(readNumOpt('k', 0, 10)).toBeNull();
  });

  it('★ 범위 밖은 클램프한다 — `?k=999` 로 화면이 날아가지 않는다', () => {
    setSearch('?k=999');
    expect(readNumOpt('k', 0, 3)).toBe(3);
    setSearch('?k=-50');
    expect(readNumOpt('k', 0, 3)).toBe(0);
  });

  it('범위 안 소수는 그대로 통과한다', () => {
    setSearch('?k=1.45');
    expect(readNumOpt('k', 0, 3)).toBe(1.45);
  });

  it('음수 범위도 다룬다 — 하한이 0 이라고 가정하지 않는다', () => {
    setSearch('?k=-2');
    expect(readNumOpt('k', -5, 5)).toBe(-2);
  });
});

// ── writeNumOpt — 슬라이더가 주소를 갱신한다 (감독 지시 "유아이 바를 만들어봐") ──
//
// 이 함수가 지키는 것은 **"주소가 곧 값"** 이다. 감독이 화면에서 고른 값을 나에게
// 전할 때 숫자를 눈으로 읽어 옮기지 않아도 되게 하는 것이 목적이므로, 라운드트립
// (`write` 한 것을 `read` 가 그대로 돌려주는가)이 이 축의 본질이다.
describe('writeNumOpt — 주소가 곧 값이 된다', () => {
  it('★ 쓴 값을 읽으면 그대로다 — 라운드트립이 이 함수의 존재 이유다', () => {
    setSearch('');
    writeNumOpt('wns', 1.35);
    expect(readNumOpt('wns', 0, 3)).toBe(1.35);
  });

  it('★ null 을 쓰면 파라미터가 사라진다 — 되돌리기가 곧 null 쓰기다', () => {
    setSearch('?wns=2');
    writeNumOpt('wns', null);
    expect(readNumOpt('wns', 0, 3)).toBeNull();
    expect(location.search).not.toContain('wns');
  });

  it('다른 파라미터를 건드리지 않는다 — 노브 하나가 시간대·날씨를 날리면 안 된다', () => {
    setSearch('?time=night&wns=1');
    writeNumOpt('wrough', 0.5);
    expect(readEnum('time', 'day', ['day', 'night'] as const)).toBe('night');
    expect(readNumOpt('wns', 0, 3)).toBe(1);
    expect(readNumOpt('wrough', 0, 1)).toBe(0.5);
  });

  it('같은 키를 다시 쓰면 덮는다 — 슬라이더를 미는 동안 값이 누적되면 안 된다', () => {
    setSearch('');
    writeNumOpt('wns', 1);
    writeNumOpt('wns', 2);
    writeNumOpt('wns', 3);
    expect(readNumOpt('wns', 0, 3)).toBe(3);
    // `?wns=1&wns=2&wns=3` 이 되면 첫 값이 읽힌다 — 슬라이더가 안 먹는 것처럼 보인다.
    expect(location.search.match(/wns=/g)?.length).toBe(1);
  });

  it('★ 마지막 값을 지우면 `?` 만 남지 않는다', () => {
    setSearch('?wns=2');
    writeNumOpt('wns', null);
    expect(location.search).toBe('');
    expect(location.href.endsWith('?')).toBe(false);
  });

  it('히스토리를 쌓지 않는다 — 슬라이더 한 번에 뒤로가기가 수십 번 눌리면 안 된다', () => {
    setSearch('');
    const before = history.length;
    for (let i = 0; i < 12; i++) writeNumOpt('wns', i / 10);
    expect(history.length).toBe(before);
  });

  it('0 을 쓸 수 있다 — null 과 구별된다', () => {
    setSearch('');
    writeNumOpt('wns', 0);
    expect(readNumOpt('wns', 0, 3)).toBe(0);
    expect(location.search).toContain('wns=0');
  });
});

describe('readNum — 기존 계약이 그대로다 (회귀)', () => {
  // `readNumOpt` 를 만들면서 `readNum` 을 그 위에 얹어 다시 쓰고 싶은 유혹이 있다.
  // 그러면 **0 의 처리가 갈린다** — `readNumOpt('k') ?? fallback` 는 옳지만
  // `readNumOpt('k') || fallback` 는 `?k=0` 을 삼킨다. 계약을 못으로 박아 둔다.
  it('없으면 fallback', () => {
    setSearch('');
    expect(readNum('k', 7, 0, 10)).toBe(7);
  });

  it('★ 0 을 지정하면 0 이다 — fallback 으로 되돌아가지 않는다', () => {
    setSearch('?k=0');
    expect(readNum('k', 7, 0, 10)).toBe(0);
  });

  it('숫자가 아니면 fallback', () => {
    setSearch('?k=zzz');
    expect(readNum('k', 7, 0, 10)).toBe(7);
  });

  it('클램프한다', () => {
    setSearch('?k=100');
    expect(readNum('k', 7, 0, 10)).toBe(10);
  });
});

describe('readEnum — 허용 목록 밖은 fallback (회귀)', () => {
  const ALLOWED = ['day', 'sunset', 'night'] as const;

  it('목록 안이면 그 값', () => {
    setSearch('?time=night');
    expect(readEnum('time', 'day', ALLOWED)).toBe('night');
  });

  it('★ 목록 밖이면 fallback — `?time=밤` 이 그대로 넘어가면 팔레트 조회가 undefined 가 된다', () => {
    setSearch('?time=밤');
    expect(readEnum('time', 'day', ALLOWED)).toBe('day');
  });

  it('없으면 fallback', () => {
    setSearch('');
    expect(readEnum('time', 'sunset', ALLOWED)).toBe('sunset');
  });
});
