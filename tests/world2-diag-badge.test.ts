// @vitest-environment jsdom
//
// 화면 진단 배지 — **감독이 폰에서 원인을 판별할 수 있는가.**
//
// ── 이 파일이 막는 것 ───────────────────────────────────────────────────────
// 배지는 기능 이름을 **하나도 몰라야 한다.** 첫 판본이 그것을 어겼다 —
// `stats().glbCity.tamed` 를 직접 골라 읽어서, `features/index.ts` 에서 GLB 한 줄을 지워도
// 배지에 그 이름이 남았다. `tests/world2-glb-city.test.ts` 의 참조자 검사가 잡았다.
//
// 그리고 **기본으로 떠서는 안 된다.** 이 화면의 목적은 캡처이고(감독이 지도를 접게 한
// 이유), 상시 오버레이는 그것을 정면으로 방해한다.
//
// 마지막으로 `setInterval` 을 남기면 페이지를 떠난 뒤에도 계속 돈다 — dispose 누락은
// 이 저장소가 이미 겪은 형태다(강 판을 씬에서 안 뺐다).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { attachDiagBadge } from '../frontend/js/world2/ui/diag-badge.js';
import { collectBadgeLines } from '../frontend/js/world2/features/types.js';

/** `?diag=` 를 바꿔 끼운다. jsdom 은 `location` 을 직접 못 쓰므로 통째로 스텁한다 */
function withSearch(search: string) {
  vi.stubGlobal('location', { search });
}

const text = () => document.getElementById('w2-diag')?.textContent ?? '';

beforeEach(() => { document.body.innerHTML = ''; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('켜는 조건', () => {
  it('?diag=1 이 없으면 붙지 않는다 — 캡처를 방해하지 않는다', () => {
    withSearch('');
    expect(attachDiagBadge(document, () => ({}))).toBeNull();
    expect(document.getElementById('w2-diag')).toBeNull();
  });

  it('?diag=0 도 켜지 않는다 — 존재만으로 켜지면 오타가 기능이 된다', () => {
    withSearch('?diag=0');
    expect(attachDiagBadge(document, () => ({}))).toBeNull();
  });

  it('?diag=1 이면 붙는다', () => {
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => ({}));
    expect(b).not.toBeNull();
    expect(document.getElementById('w2-diag')).not.toBeNull();
    b!.dispose();
  });
});

describe('커널 값 — backend 가 첫 줄이다', () => {
  it('backend 를 보여준다 — 이 저장소의 열린 사각이 전부 그 값에 달려 있다', () => {
    // WebGPU 가 아니면 블룸은 **정상적으로** 안 켜진다(TSL 후보정이 WebGL 에서 부팅을
    // 깨뜨려 의도적으로 막았다). 그 구별을 못 하면 정상을 고장으로 오진한다.
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => ({ backend: 'WebGL', frame: { draw: 108 } }))!;
    expect(text()).toContain('WebGL');
    expect(text()).toContain('108');
    b.dispose();
  });

  it('측정 안 된 값을 0 으로 보여주지 않는다', () => {
    // "못 잰 것은 통과가 아니다" 를 화면에서도 지킨다. `undefined` 가 빈칸이나 0 으로
    // 흘러가면, 값을 못 읽은 것과 값이 0 인 것이 화면에서 같아진다.
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => ({}))!;
    expect(text()).toContain('—');
    expect(text()).not.toMatch(/backend\s+0/);
    b.dispose();
  });

  it('0 을 측정 실패로 표시하지 않는다 — 그 반대 방향도 지킨다', () => {
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => ({ backend: 'WebGPU', frame: { draw: 0 } }))!;
    expect(text()).toMatch(/드로우콜\s+0/);
    b.dispose();
  });
});

describe('기능 줄 — 배지는 기능 이름을 모른다', () => {
  it('넘겨받은 줄을 그대로 싣는다', () => {
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => ({}), () => ['postfx on · night · 세기 1.15'])!;
    expect(text()).toContain('postfx on · night · 세기 1.15');
    b.dispose();
  });

  it('줄이 없으면 커널 값만 나온다 — 없는 기능을 위한 자리를 만들지 않는다', () => {
    // 기능을 목록에서 빼면 그 줄이 저절로 사라져야 한다. 배지가 `GLB —` 같은 빈 자리를
    // 남기면 "안 켠 것" 과 "켰는데 실패한 것" 이 화면에서 같아진다.
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => ({ backend: 'WebGPU' }), () => [])!;
    expect(text().split('\n')).toHaveLength(2);
    b.dispose();
  });

  it('줄 수집이 터져도 화면을 멎게 하지 않는다', () => {
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => ({}), () => { throw new Error('진단 없음'); })!;
    expect(text()).toContain('진단 실패');
    b.dispose();
  });

  it('커널 값 읽기가 터져도 화면을 멎게 하지 않는다', () => {
    // 배지는 있으면 좋은 것이고 월드는 필수다 — `postfx` 가 렌더 훅에서 한 판단과 같다.
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => { throw new Error('어댑터 없음'); })!;
    expect(text()).toContain('진단 실패');
    b.dispose();
  });

  it('스냅샷을 다시 읽어 갱신한다 — 첫 값을 굳혀두지 않는다', () => {
    withSearch('?diag=1');
    let line = 'postfx on · day · 세기 0.00';
    const b = attachDiagBadge(document, () => ({}), () => [line])!;
    expect(text()).toContain('day');
    line = 'postfx on · night · 세기 1.15'; // 神 모드 패널로 시간대를 바꾼 상황
    b.refresh();
    expect(text()).toContain('night');
    b.dispose();
  });
});

describe('collectBadgeLines — 기능별 분기가 없다', () => {
  const mk = (name: string, badgeLine?: () => string | null) => ({
    name,
    instance: badgeLine ? { badgeLine } : {},
  });

  it('기능 이름을 앞에 붙여 모은다 — 기능이 자기 이름을 또 적지 않는다', () => {
    // 이름은 `Feature.name` 에 이미 있다. 기능이 문자열로 다시 적으면 값 미러링이다.
    const out = collectBadgeLines([
      mk('postfx', () => 'on · night'),
      mk('ocean', () => '강 37칸'),
    ] as never);
    expect(out).toEqual(['postfx on · night', 'ocean 강 37칸']);
  });

  it('badgeLine 이 없는 기능은 건너뛴다', () => {
    const out = collectBadgeLines([mk('sky'), mk('ocean', () => '강 37칸')] as never);
    expect(out).toEqual(['ocean 강 37칸']);
  });

  it('null 을 돌려주면 그 줄을 뺀다', () => {
    const out = collectBadgeLines([mk('glbCity', () => null), mk('ocean', () => 'x')] as never);
    expect(out).toEqual(['ocean x']);
  });

  it('한 기능이 터져도 나머지 줄은 살린다', () => {
    const out = collectBadgeLines([
      mk('broken', () => { throw new Error('터짐'); }),
      mk('ocean', () => '강 37칸'),
    ] as never);
    expect(out).toEqual(['broken (진단 실패)', 'ocean 강 37칸']);
  });
});

describe('정리', () => {
  it('dispose 가 요소와 타이머를 함께 없앤다', () => {
    vi.useFakeTimers();
    withSearch('?diag=1');
    let calls = 0;
    const b = attachDiagBadge(document, () => { calls++; return {}; })!;
    const first = calls;
    vi.advanceTimersByTime(2000);
    expect(calls, '주기 갱신이 돌지 않는다').toBeGreaterThan(first);

    b.dispose();
    expect(document.getElementById('w2-diag'), '요소가 남았다').toBeNull();
    const afterDispose = calls;
    vi.advanceTimersByTime(2000);
    // 타이머를 안 지우면 페이지를 떠난 뒤에도 계속 돈다 — dispose 누락은 이 저장소가
    // 이미 겪은 형태다(강 판을 씬에서 안 뺐다).
    expect(calls, 'dispose 뒤에도 타이머가 돈다').toBe(afterDispose);
  });
});
