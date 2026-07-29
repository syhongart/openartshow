// world2 기능 레지스트리 테스트.
//
// 확인하는 것은 하나다 — **기능을 빼면 그 기능에 관한 모든 것이 함께 빠지는가.**
//
// 이 구조를 만든 이유가 그것이다. 예전에는 하늘을 켜려면 `main.ts` 다섯 군데를 건드려야
// 했고(생성·커널 등록·HUD 판정 키·진단 훅·패널 배선), 그래서 하늘을 빼는 것이 "선언 한 줄
// 지우기"가 아니라 수술이었다. 바다·NPC·멀티플레이어를 그대로 얹으면 그 하드코딩이 넷으로
// 늘어난다.
//
// 여기서는 `Feature` 계약을 실제로 돌려 "빠지는가"를 검사한다. 계약이 지켜지는 한 조립부는
// 기능이 몇 개든 같은 코드다.

import { describe, it, expect } from 'vitest';
import {
  mountFeatures, combineDrawGroupKey, collectDiagnostics, prewarmFeatures,
  type Feature, type FeatureEnv, type FeatureInstance,
} from '../frontend/js/world2/features/types.js';
import type { System } from '../frontend/js/world2/kernel.js';

/** 기능이 실제로 무엇을 받는지는 이 테스트의 관심이 아니다 — 계약만 본다 */
const env = {} as FeatureEnv;

function sys(name: string): System {
  return { name, update() { /* 이 테스트는 프레임을 돌리지 않는다 */ } };
}

/** 원하는 조각만 제공하는 기능 — "전부 선택"이라는 계약을 시험하려면 이게 필요하다 */
function feature(name: string, inst: FeatureInstance | null): Feature {
  return { name, create: () => inst };
}

describe('mountFeatures — 조립부에 기능별 분기가 없다', () => {
  it('선언 순서대로 조립한다 — 그 순서가 곧 System 실행 순서다', () => {
    const m = mountFeatures(
      [feature('a', { system: sys('a') }), feature('b', { system: sys('b') })],
      env,
    );
    expect(m.map((x) => x.name)).toEqual(['a', 'b']);
  });

  // 기능 자신이 "이번엔 켜지 않는다"를 판단한다(DOM이 없다, 백엔드가 꺼져 있다 등).
  // 조립부가 기능별 조건을 알면 그게 다시 하드코딩이다.
  it('create가 null이면 조립하지 않는다', () => {
    const m = mountFeatures([feature('on', {}), feature('off', null)], env);
    expect(m.map((x) => x.name)).toEqual(['on']);
  });

  // 하늘이 죽었다고 월드 전체가 안 뜨는 건 과잉이다.
  it('한 기능이 던져도 나머지는 켠다', () => {
    const errs: string[] = [];
    const boom: Feature = { name: 'boom', create() { throw new Error('폭발'); } };
    const m = mountFeatures([feature('a', {}), boom, feature('b', {})], env, (n) => errs.push(n));
    expect(m.map((x) => x.name)).toEqual(['a', 'b']);
    expect(errs).toEqual(['boom']);
  });

  it('목록이 비면 빈 결과 — 기능 0개로도 조립이 성립한다', () => {
    expect(mountFeatures([], env)).toEqual([]);
  });
});

describe('combineDrawGroupKey — 드로우콜 판정 그룹', () => {
  it('키를 내는 기능이 없으면 빈 문자열 — 그래도 유효한 그룹이라 판정은 돈다', () => {
    expect(combineDrawGroupKey(mountFeatures([feature('a', {})], env))).toBe('');
    expect(combineDrawGroupKey([])).toBe('');
  });

  it('여러 기능의 키를 합친다', () => {
    const m = mountFeatures([
      feature('sky', { drawGroupKey: () => 'night|rain' }),
      feature('ocean', { drawGroupKey: () => 'calm' }),
    ], env);
    expect(combineDrawGroupKey(m)).toBe('ocean=calm sky=night|rain');
  });

  // 목록 순서에 의존하면 기능을 재배치하는 것만으로 판정 그룹이 갈라진다.
  // 그러면 "같은 상태인데 다른 그룹"이 생겨 위반이 아닌 것이 위반으로 찍힌다.
  it('선언 순서를 바꿔도 같은 키가 나온다', () => {
    const a = mountFeatures([
      feature('sky', { drawGroupKey: () => 'day|clear' }),
      feature('ocean', { drawGroupKey: () => 'calm' }),
    ], env);
    const b = mountFeatures([
      feature('ocean', { drawGroupKey: () => 'calm' }),
      feature('sky', { drawGroupKey: () => 'day|clear' }),
    ], env);
    expect(combineDrawGroupKey(a)).toBe(combineDrawGroupKey(b));
  });

  // 어느 기능이든 "지금 그리는 것이 논리 상태와 어긋난다"고 하면 그 프레임 표본은 못 믿는다.
  // 하늘 크로스페이드가 그 경우이고, 훗날 바다·아바타도 같은 상황을 가질 수 있다.
  it('하나라도 null이면 전체가 null이다 — 그 표본은 판정에서 빠진다', () => {
    const m = mountFeatures([
      feature('sky', { drawGroupKey: () => null }),
      feature('ocean', { drawGroupKey: () => 'calm' }),
    ], env);
    expect(combineDrawGroupKey(m)).toBeNull();
  });

  it('키를 내는 기능과 안 내는 기능이 섞여도 된다', () => {
    const m = mountFeatures([
      feature('quiet', {}),
      feature('sky', { drawGroupKey: () => 'day|clear' }),
    ], env);
    expect(combineDrawGroupKey(m)).toBe('sky=day|clear');
  });
});

describe('collectDiagnostics — 진단도 기능이 스스로 낸다', () => {
  it('이름을 키로 모은다', () => {
    const m = mountFeatures([
      feature('sky', { diagnostics: () => ({ time: 'night' }) }),
      feature('ocean', { diagnostics: () => ({ waves: 3 }) }),
    ], env);
    expect(collectDiagnostics(m)).toEqual({ sky: { time: 'night' }, ocean: { waves: 3 } });
  });

  it('진단을 안 내는 기능은 빠진다', () => {
    const m = mountFeatures([feature('a', {}), feature('b', { diagnostics: () => 1 })], env);
    expect(collectDiagnostics(m)).toEqual({ b: 1 });
  });

  // 진단은 관측 수단이다. 하나가 던져서 전체 스냅샷이 날아가면 그 순간 아무것도 못 잰다.
  it('한 기능의 진단이 던져도 나머지는 모은다', () => {
    const m = mountFeatures([
      feature('bad', { diagnostics() { throw new Error('x'); } }),
      feature('good', { diagnostics: () => 42 }),
    ], env);
    const d = collectDiagnostics(m);
    expect(d.good).toBe(42);
    expect(d.bad).toBe('(진단 실패)'); // 조용히 빠지지 않는다 — 실패했다고 적힌다
  });
});

// ── 부팅 예열 ────────────────────────────────────────────────────────────────
// 예열은 "숨은 것을 잠시 켜고 한 프레임 그린다"이다. 켜는 것보다 **되돌리는 것**이
// 중요하다 — 안 되돌리면 날씨 레이어가 전부 보이는 하늘로 세션이 시작되고, 그건 예열을
// 안 한 것보다 나쁘다.
describe('prewarmFeatures — 예열 자세와 원상복구', () => {
  it('예열을 내놓은 기능만 켜고, 반환 함수가 전부 되돌린다', () => {
    const log: string[] = [];
    const m = mountFeatures([
      feature('sky', { prewarm: () => { log.push('sky:on'); return () => log.push('sky:off'); } }),
      feature('ocean', {}), // 예열을 안 내놓는 기능 — 건드리지 않는다
      feature('npc', { prewarm: () => { log.push('npc:on'); return () => log.push('npc:off'); } }),
    ], env);

    const undo = prewarmFeatures(m);
    expect(log).toEqual(['sky:on', 'npc:on']); // 렌더는 이 시점에 일어난다
    undo();
    expect(log).toEqual(['sky:on', 'npc:on', 'sky:off', 'npc:off']);
  });

  it('되돌릴 것이 없는 예열(반환 없음)도 받는다', () => {
    let on = 0;
    const m = mountFeatures([feature('x', { prewarm: () => { on++; } })], env);
    const undo = prewarmFeatures(m);
    expect(on).toBe(1);
    expect(() => undo()).not.toThrow(); // 되돌릴 것이 없을 뿐 실패가 아니다
  });

  it('한 기능의 예열이 던져도 나머지는 켜진다 — 예열은 최적화이지 정합성이 아니다', () => {
    const log: string[] = [];
    const m = mountFeatures([
      feature('bad', { prewarm: () => { throw new Error('x'); } }),
      feature('good', { prewarm: () => { log.push('on'); return () => log.push('off'); } }),
    ], env);
    const undo = prewarmFeatures(m);
    expect(log).toEqual(['on']);
    undo();
    expect(log).toEqual(['on', 'off']);
  });

  it('한 기능의 복구가 던져도 나머지는 되돌아온다', () => {
    // 여기가 이 함수에서 제일 위험한 지점이다. 복구를 한 덩어리로 묶으면 첫 실패에서
    // 멈춰, 그 뒤 기능들이 **켜진 채로** 세션에 들어간다.
    const log: string[] = [];
    const m = mountFeatures([
      feature('bad', { prewarm: () => () => { throw new Error('x'); } }),
      feature('good', { prewarm: () => () => log.push('off') }),
    ], env);
    prewarmFeatures(m)();
    expect(log).toEqual(['off']);
  });
});

// ── 이 파일의 결론 ───────────────────────────────────────────────────────────
// 아래 셋이 이 구조의 약속이고, 위 테스트가 전부 그것을 검사한다.
describe('약속: 기능을 빼면 그 기능에 관한 모든 것이 함께 빠진다', () => {
  let warmed = 0;
  const skyLike: Feature = feature('sky', {
    system: sys('sky'),
    diagnostics: () => ({ time: 'night', weather: 'rain' }),
    drawGroupKey: () => 'night|rain',
    prewarm: () => { warmed++; },
  });
  const oceanLike: Feature = feature('ocean', { system: sys('ocean') });

  it('켰을 때 — System·진단·판정 키·예열이 모두 나타난다', () => {
    warmed = 0;
    const m = mountFeatures([skyLike, oceanLike], env);
    expect(m.map((x) => x.instance.system?.name)).toEqual(['sky', 'ocean']);
    expect(Object.keys(collectDiagnostics(m))).toEqual(['sky']);
    expect(combineDrawGroupKey(m)).toBe('sky=night|rain');
    prewarmFeatures(m);
    expect(warmed).toBe(1);
  });

  it('뺐을 때 — 넷 다 함께 사라지고, 남은 기능은 그대로 돈다', () => {
    warmed = 0;
    const m = mountFeatures([oceanLike], env); // 목록에서 sky 한 줄을 지운 것과 같다
    expect(m.map((x) => x.instance.system?.name)).toEqual(['ocean']);
    expect(collectDiagnostics(m)).toEqual({});      // 진단에서 사라짐
    expect(combineDrawGroupKey(m)).toBe('');        // 판정 키에서 사라짐 (null 아님 — 정상 그룹)
    prewarmFeatures(m);
    expect(warmed).toBe(0);                         // 예열에서도 사라짐
  });

  it('전부 뺐을 때 — 조립이 여전히 성립한다(코어만으로 월드가 돈다)', () => {
    const m = mountFeatures([], env);
    expect(m).toEqual([]);
    expect(collectDiagnostics(m)).toEqual({});
    expect(combineDrawGroupKey(m)).toBe('');
  });
});
