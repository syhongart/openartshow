// 카테고리 랜덤의 선택 규칙 테스트.
//
// ── 왜 이 파일이 필요한가 ────────────────────────────────────────────────────
// 감독 요청은 *"또 누르면 그 카테고리안에서 랜덤으로 선택"* 이고, 그 계약의 핵심은
// **누를 때마다 무언가 달라진다**는 것이다. 순수 균등 추출은 현재 값을 다시 뽑을 수
// 있고, 그러면 화면이 그대로여서 **버튼이 안 먹은 것과 구별되지 않는다.** 이 편집기의
// 옵션 수는 작다 — 눈·입은 3개라 3번에 1번이 "먹통"으로 보인다.
//
// 그 계약은 `Math.random()` 한 줄로 쉽게 무너진다(누가 "단순화" 하면서 필터를 지우면
// 그만이다). 그래서 성질로 고정한다.

import { describe, it, expect } from 'vitest';
import {
  pickDifferent, pickAny, pickForRandomize, canRandomize,
  RANDOM_MIN_OPTIONS, FORCE_CHANGE_MIN_OPTIONS,
} from '../frontend/js/random-pick.js';

describe('pickDifferent — 반드시 달라진다', () => {
  // 확률적 함수라 한 번 통과는 증거가 아니다. 가장 불리한 조건(옵션 3개 — 균등 추출이면
  // 약 3분의 1 확률로 현재 값이 나온다)에서 충분히 반복해 "한 번도 안 나온다"를 본다.
  it('현재 값은 한 번도 나오지 않는다 (옵션 3개, 300회)', () => {
    const opts = ['a', 'b', 'c'];
    for (let i = 0; i < 300; i++) expect(pickDifferent(opts, 'b')).not.toBe('b');
  });

  it('현재 값을 뺀 나머지가 모두 나온다 (한쪽으로 굳지 않는다)', () => {
    const opts = ['a', 'b', 'c', 'd'];
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(pickDifferent(opts, 'a'));
    expect([...seen].sort()).toEqual(['b', 'c', 'd']);
  });

  it('현재 값이 목록에 없어도 목록 안에서 고른다', () => {
    const opts = ['a', 'b'];
    for (let i = 0; i < 50; i++) expect(opts).toContain(pickDifferent(opts, 'zzz'));
  });

  // 호출부가 분기하지 않아도 되게 한 계약 — 깨지면 편집기가 undefined 를 적용한다.
  it('고를 것이 없으면 현재 값을 그대로 돌려준다', () => {
    expect(pickDifferent(['only'], 'only')).toBe('only');
    expect(pickDifferent([], 'x')).toBe('x');
  });
});

describe('pickAny — 균등 추출', () => {
  it('양쪽이 모두 나온다 (한쪽으로 굳지 않는다)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(pickAny(['on', 'off'], 'on'));
    expect([...seen].sort()).toEqual(['off', 'on']);
  });

  it('빈 목록이면 fallback', () => {
    expect(pickAny([], 'x')).toBe('x');
  });
});

describe('pickForRandomize — 개수로 규칙이 갈린다', () => {
  // 3개 이상: 반드시 달라진다. 안 그러면 "눌렀는데 그대로"가 생긴다.
  it('3개 이상이면 현재 값이 다시 나오지 않는다 (300회)', () => {
    const opts = ['a', 'b', 'c'];
    for (let i = 0; i < 300; i++) expect(pickForRandomize(opts, 'a')).not.toBe('a');
  });

  // 2개: 균등이라 현재 값이 유지될 수 있다. 이게 의도다 — "반드시 바뀐다"를 적용하면
  // 장식 탭의 안경·헤일로·날개·하트 넷이 매번 **한꺼번에** 뒤집혀 토글처럼 보인다.
  it('2개면 현재 값이 유지되는 경우도 나온다 (토글이 아니다)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(pickForRandomize(['on', 'off'], 'on'));
    expect([...seen].sort()).toEqual(['off', 'on']); // 유지도 변경도 일어난다
  });

  it('경계값이 상수와 일치한다 (값을 두 곳에 적지 않는다)', () => {
    const three = ['a', 'b', 'c'];
    expect(three.length).toBe(FORCE_CHANGE_MIN_OPTIONS);
    for (let i = 0; i < 100; i++) expect(pickForRandomize(three, 'a')).not.toBe('a');
  });

  it('색 문자열에도 그대로 쓰인다 (스와치 줄)', () => {
    const palette = ['#111', '#222', '#333'];
    for (let i = 0; i < 100; i++) expect(pickForRandomize(palette, '#222')).not.toBe('#222');
  });
});

describe('canRandomize — 굴릴 것이 있는 줄인가', () => {
  it('1개 이하는 거른다 (굴려도 결과가 하나뿐)', () => {
    expect(canRandomize(0)).toBe(false);
    expect(canRandomize(1)).toBe(false);
  });

  // 2지선다도 카테고리 랜덤의 일부다 — 여러 줄을 동시에 굴리므로 조합이 달라진다.
  it('2개부터 포함한다', () => {
    expect(canRandomize(2)).toBe(true);
    expect(canRandomize(18)).toBe(true);
  });

  it('임계는 상수로 노출돼 있다', () => {
    expect(canRandomize(RANDOM_MIN_OPTIONS)).toBe(true);
    expect(canRandomize(RANDOM_MIN_OPTIONS - 1)).toBe(false);
  });
});
