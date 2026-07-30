// @vitest-environment jsdom
//
// 화면 진단 배지 — **감독이 폰에서 원인을 판별할 수 있는가.**
//
// ── 이 파일이 막는 것 ───────────────────────────────────────────────────────
// 이 배지는 진단을 **다시 계산하지 않고** `stats()` 를 그대로 읽는다. 그 규율이 깨지면
// 화면과 실제가 갈리고, 그 순간 배지는 거짓말하는 장치가 된다 — 진단을 못 믿게 되면
// 안 만든 것보다 나쁘다.
//
// 그리고 **기본으로 떠서는 안 된다.** 이 화면의 목적은 캡처이고(감독이 지도를 접게 한
// 이유), 상시 오버레이는 그것을 정면으로 방해한다.
//
// 마지막으로 `setInterval` 을 남기면 페이지를 떠난 뒤에도 계속 돈다 — dispose 누락은
// 이 저장소가 이미 겪은 형태다(강 판을 씬에서 안 뺐다).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { attachDiagBadge } from '../frontend/js/world2/ui/diag-badge.js';

/** `?diag=` 를 바꿔 끼운다. jsdom 은 `location` 을 직접 못 쓰므로 통째로 스텁한다 */
function withSearch(search: string) {
  vi.stubGlobal('location', { search });
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

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

describe('무엇을 보여주는가', () => {
  it('블룸이 안 켜진 이유를 그대로 적는다 — "왜 안 보이나" 의 답이다', () => {
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => ({
      backend: 'WebGL',
      postfx: { on: false, failure: 'WebGL 백엔드 — TSL 후보정이 부팅을 깨뜨려 켜지 않는다(WebGPU 전용)', strength: -1, time: 'night' },
    }))!;
    const t = document.getElementById('w2-diag')!.textContent!;
    // backend 가 이 판별의 핵이다 — WebGPU 가 아니면 블룸은 **정상적으로** 안 켜진다
    expect(t).toContain('WebGL');
    expect(t).toContain('WebGPU 전용');
    b.dispose();
  });

  it('세기 0 과 기능 고장을 구별한다 — 이번 사고가 그 둘을 못 갈랐다', () => {
    withSearch('?diag=1');
    // 낮이라 0 인 정상 상태
    const ok = attachDiagBadge(document, () => ({
      backend: 'WebGPU',
      postfx: { on: true, failure: null, strength: 0, time: 'day' },
    }))!;
    const okText = document.getElementById('w2-diag')!.textContent!;
    expect(okText).toContain('on');
    expect(okText).toContain('day');
    ok.dispose();

    // 기능이 아예 없는 상태 — 같은 "세기 0" 이지만 다른 일이다
    const gone = attachDiagBadge(document, () => ({ backend: 'WebGPU' }))!;
    expect(document.getElementById('w2-diag')!.textContent).toContain('기능 없음');
    gone.dispose();
  });

  it('측정 안 된 값을 0 으로 보여주지 않는다', () => {
    // "못 잰 것은 통과가 아니다" 를 화면에서도 지킨다. `undefined` 가 빈칸이나 0 으로
    // 흘러가면, 값을 못 읽은 것과 값이 0 인 것이 화면에서 같아진다.
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => ({}))!;
    const t = document.getElementById('w2-diag')!.textContent!;
    expect(t).toContain('—');
    expect(t).not.toMatch(/backend\s+0/);
    b.dispose();
  });

  it('강 파셀 수를 보여준다 — 0 이면 강이 안 보인다는 신호다', () => {
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => ({ ocean: { riverParcels: 37 } }))!;
    expect(document.getElementById('w2-diag')!.textContent).toContain('37');
    b.dispose();
  });
});

describe('값의 출처가 하나다', () => {
  it('스냅샷을 다시 읽어 갱신한다 — 첫 값을 굳혀두지 않는다', () => {
    withSearch('?diag=1');
    let time = 'day';
    const b = attachDiagBadge(document, () => ({
      postfx: { on: true, failure: null, strength: 0, time },
    }))!;
    expect(document.getElementById('w2-diag')!.textContent).toContain('day');
    // 神 모드 패널로 시간대를 바꾼 상황
    time = 'night';
    b.refresh();
    expect(document.getElementById('w2-diag')!.textContent).toContain('night');
    b.dispose();
  });

  it('스냅샷이 터져도 화면을 멎게 하지 않는다', () => {
    // 배지는 있으면 좋은 것이고 월드는 필수다 — `postfx` 가 렌더 훅에서 한 판단과 같다.
    withSearch('?diag=1');
    const b = attachDiagBadge(document, () => { throw new Error('진단 없음'); })!;
    expect(document.getElementById('w2-diag')!.textContent).toContain('진단 실패');
    b.dispose();
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
