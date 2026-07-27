// @vitest-environment jsdom
//
// world2 로딩 화면 컨트롤러 테스트.
//
// 지켜야 할 것은 셋이다. ①진행이 보인다 ②실패하면 사라지지 않고 원인을 말한다
// ③걷힌 뒤에는 되살아나지 않는다. 특히 ②가 중요하다 — 실패 시 조용히 사라지면
// 사용자는 빈 3D 화면 앞에 남고, 그건 검은 화면보다 나쁘다(고쳐진 줄 알기 때문).

import { describe, it, expect, beforeEach } from 'vitest';
import { findLoading, LoadingView, slowNote } from '../frontend/js/world2/ui/loading.js';
import { ROTATE_MS, FADE_MS, RICH_AFTER_MS } from '../frontend/js/world2/decide/loading-copy.js';
import type { BootReport } from '../frontend/js/world2/boot.js';

const MARKUP = `
  <div id="w2-loading">
    <p id="w2-loading-label"></p>
    <div id="w2-loading-bar"></div>
    <span id="w2-loading-pct"></span>
    <p id="w2-loading-copy" data-show="0"></p>
    <p id="w2-loading-note" hidden></p>
  </div>`;

const report = (o: Partial<BootReport> = {}): BootReport => ({
  stage: 'stream', label: '전시 공간 불러오는 중', progress: 0.5,
  elapsedMs: 1000, remainMs: 1000, slow: false, ...o,
});

const el = (id: string) => document.getElementById(id)!;

beforeEach(() => { document.body.innerHTML = MARKUP; });

describe('findLoading — 마크업이 빠진 걸 숨기지 않는다', () => {
  it('전부 있으면 찾는다', () => {
    expect(findLoading(document)).not.toBeNull();
  });

  it('하나라도 없으면 null — no-op 객체를 돌려주지 않는다', () => {
    // 조용히 no-op으로 넘어가면 "로딩이 안 보이는" 버그를 배포까지 끌고 간다.
    el('w2-loading-bar').remove();
    expect(findLoading(document)).toBeNull();
  });

  it('루트가 없으면 null', () => {
    document.body.innerHTML = '';
    expect(findLoading(document)).toBeNull();
  });
});

describe('LoadingView — 진행 표시', () => {
  const view = () => new LoadingView(findLoading(document)!);

  it('진행률을 폭·텍스트·aria에 반영한다', () => {
    view().update(report({ progress: 0.42 }));
    expect(el('w2-loading-bar').style.width).toBe('42%');
    expect(el('w2-loading-pct').textContent).toBe('42%');
    expect(el('w2-loading-bar').getAttribute('aria-valuenow')).toBe('42');
  });

  it('단계 문구를 보여준다', () => {
    view().update(report({ label: '셰이더 예열' }));
    expect(el('w2-loading-label').textContent).toBe('셰이더 예열');
  });

  it('접근성 속성을 세운다 — 화면 낭독기가 진행을 읽을 수 있어야 한다', () => {
    view();
    expect(el('w2-loading').getAttribute('role')).toBe('status');
    expect(el('w2-loading').getAttribute('aria-live')).toBe('polite');
    expect(el('w2-loading-bar').getAttribute('role')).toBe('progressbar');
  });

  it('같은 퍼센트를 다시 쓰지 않는다 — 레이아웃 낭비', () => {
    const v = view();
    v.update(report({ progress: 0.5 }));
    // 유효한 CSS 값이어야 한다 — 무효값은 대입 자체가 무시돼 이 테스트가 헛돈다.
    el('w2-loading-bar').style.width = '123px';
    v.update(report({ progress: 0.502 })); // 반올림하면 같은 50%
    expect(el('w2-loading-bar').style.width).toBe('123px');
  });

  it('느리지 않으면 안내를 숨긴다', () => {
    view().update(report({ slow: false }));
    expect((el('w2-loading-note') as HTMLElement).hidden).toBe(true);
  });

  it('느리면 안내를 띄운다', () => {
    view().update(report({ slow: true, remainMs: 5000 }));
    const note = el('w2-loading-note') as HTMLElement;
    expect(note.hidden).toBe(false);
    expect(note.textContent).toContain('조금 더 걸립니다');
  });
});

describe('LoadingView — 3초 게이트 (감독 지시)', () => {
  const view = (list?: readonly string[]) => new LoadingView(findLoading(document)!, list);
  const RICH = RICH_AFTER_MS;

  it('처음에는 minimal — 프로그레스 바만', () => {
    view().update(report({ elapsedMs: 0 }));
    expect(el('w2-loading').dataset.detail).toBe('minimal');
  });

  it('3초 이하 부팅에서는 끝까지 minimal이다', () => {
    const v = view();
    for (const t of [0, 800, 1_400, RICH - 1]) v.update(report({ elapsedMs: t }));
    expect(el('w2-loading').dataset.detail).toBe('minimal');
  });

  it('3초를 넘기면 rich로 올라간다', () => {
    const v = view();
    v.update(report({ elapsedMs: 0 }));
    v.update(report({ elapsedMs: RICH }));
    expect(el('w2-loading').dataset.detail).toBe('rich');
  });

  it('rich는 되돌아가지 않는다 — 읽던 문장이 지워지면 안 된다', () => {
    const v = view();
    v.update(report({ elapsedMs: RICH }));
    v.update(report({ elapsedMs: 100 })); // 있을 수 없지만 방어
    expect(el('w2-loading').dataset.detail).toBe('rich');
  });

  it('minimal 구간에도 라벨은 채워 둔다 — rich 전환 시 한 박자 늦지 않게', () => {
    view().update(report({ elapsedMs: 500, label: '셰이더 예열' }));
    expect(el('w2-loading-label').textContent).toBe('셰이더 예열');
  });
});

describe('LoadingView — 로딩 문구', () => {
  const view = (list?: readonly string[]) => new LoadingView(findLoading(document)!, list);
  const RICH = RICH_AFTER_MS;

  it('3초 전에는 문구가 아예 뜨지 않는다', () => {
    const v = view(['첫 문구', '둘째 문구']);
    v.update(report({ elapsedMs: 0 }));
    v.update(report({ elapsedMs: 1_400 })); // world2 실측 부팅 시간
    expect(el('w2-loading-copy').textContent).toBe('');
    expect(el('w2-loading-copy').dataset.show).toBe('0');
  });

  it('3초를 넘기면 첫 문구가 곧바로 뜬다 — 페이드로 들어오면 굼떠 보인다', () => {
    const v = view(['첫 문구', '둘째 문구']);
    v.update(report({ elapsedMs: RICH }));
    expect(el('w2-loading-copy').textContent).toBe('첫 문구');
    expect(el('w2-loading-copy').dataset.show).toBe('1');
  });

  it('첫 문구를 읽을 시간을 준다 — 뜨자마자 넘어가지 않는다', () => {
    // 회전 기준이 부팅 경과였다면 3초에 뜨고 0.2초 뒤 교체된다(ROTATE_MS=3200).
    const v = view(['첫 문구', '둘째 문구']);
    v.update(report({ elapsedMs: RICH }));
    v.update(report({ elapsedMs: RICH + ROTATE_MS - 100 }));
    expect(el('w2-loading-copy').dataset.show).toBe('1');
    expect(el('w2-loading-copy').textContent).toBe('첫 문구');
  });

  it('더 길어지면 교체를 시작한다 — 먼저 사라진 뒤 바뀐다', () => {
    const v = view(['첫 문구', '둘째 문구']);
    v.update(report({ elapsedMs: RICH }));
    v.update(report({ elapsedMs: RICH + ROTATE_MS }));
    // 글자가 겹쳐 보이면 읽기 어려우므로, 사라지는 동안에는 옛 문구가 남아 있다.
    expect(el('w2-loading-copy').dataset.show).toBe('0');
    expect(el('w2-loading-copy').textContent).toBe('첫 문구');
  });

  it('같은 구간에서 여러 번 갱신해도 문구를 다시 쓰지 않는다', () => {
    const v = view(['첫 문구', '둘째 문구']);
    v.update(report({ elapsedMs: RICH }));
    el('w2-loading-copy').textContent = 'SENTINEL';
    v.update(report({ elapsedMs: RICH + 900 }));
    expect(el('w2-loading-copy').textContent).toBe('SENTINEL');
  });

  it('실패하면 문구를 감춘다 — 읽어야 할 것은 오류 내용이다', () => {
    const v = view(['첫 문구']);
    v.update(report({ elapsedMs: RICH }));
    v.fail('stream', new Error('타임아웃'));
    expect(el('w2-loading-copy').dataset.show).toBe('0');
  });

  it('걷힌 뒤 늦게 도착한 교체는 화면을 되살리지 않는다', async () => {
    const v = view(['첫 문구', '둘째 문구']);
    v.update(report({ elapsedMs: RICH }));
    v.update(report({ elapsedMs: RICH + ROTATE_MS })); // 교체 타이머 예약
    v.dismiss();
    await new Promise((r) => setTimeout(r, FADE_MS + 50));
    expect(el('w2-loading-copy').textContent).toBe('첫 문구'); // 둘째로 안 바뀜
  });

  it('문구가 없어도 죽지 않는다', () => {
    expect(() => view([]).update(report({ elapsedMs: RICH }))).not.toThrow();
  });
});

describe('LoadingView — 실패는 감추지 않는다', () => {
  const view = () => new LoadingView(findLoading(document)!);

  it('실패하면 화면을 걷지 않고 원인을 보여준다', () => {
    const v = view();
    v.fail('renderer', new Error('WebGPU 어댑터 없음'));
    expect(el('w2-loading').dataset.state).toBe('error');
    expect(el('w2-loading').getAttribute('aria-hidden')).toBeNull(); // 여전히 읽힌다
    expect(el('w2-loading-note').textContent).toContain('WebGPU 어댑터 없음');
    expect(el('w2-loading-note').textContent).toContain('renderer');
  });

  it('Error가 아닌 것도 문자열로 보여준다', () => {
    view().fail('pools', '알 수 없음');
    expect(el('w2-loading-note').textContent).toContain('알 수 없음');
  });

  it('실패 후에는 update가 화면을 되돌리지 않는다', () => {
    const v = view();
    v.fail('warmup', new Error('실패'));
    v.update(report({ progress: 0.9, label: '셰이더 예열' }));
    expect(el('w2-loading-label').textContent).toBe('전시 공간을 열지 못했습니다');
  });

  it('실패 후 dismiss가 화면을 걷지 않는다 — 오류를 지우면 안 된다', () => {
    const v = view();
    v.fail('stream', new Error('타임아웃'));
    v.dismiss();
    expect(el('w2-loading').dataset.state).toBe('error');
  });
});

describe('LoadingView — 걷기', () => {
  const view = () => new LoadingView(findLoading(document)!);

  it('dismiss가 상태를 done으로 바꾸고 낭독기에서 숨긴다', () => {
    const v = view();
    v.dismiss();
    expect(el('w2-loading').dataset.state).toBe('done');
    expect(el('w2-loading').getAttribute('aria-hidden')).toBe('true');
    expect(v.finished).toBe(true);
  });

  it('걷힌 뒤 update는 무시된다 — 로딩 화면이 되살아나지 않는다', () => {
    const v = view();
    v.update(report({ progress: 0.3 }));
    v.dismiss();
    v.update(report({ progress: 0.9 }));
    expect(el('w2-loading-bar').style.width).toBe('30%');
  });

  it('두 번 걷어도 안전하다', () => {
    const v = view();
    v.dismiss();
    expect(() => v.dismiss()).not.toThrow();
  });
});

describe('slowNote — 모르는 건 말하지 않는다', () => {
  it('추정이 없으면 시간을 말하지 않는다', () => {
    expect(slowNote(null)).toBe('이 기기에서는 조금 더 걸립니다.');
  });

  it('초 단위로 말한다', () => {
    expect(slowNote(5_000)).toContain('약 5초 남음');
  });

  it('1초 이하는 곧 끝난다고 한다 — "약 1초 남음"은 어색하다', () => {
    expect(slowNote(400)).toContain('곧 끝납니다');
  });

  it('1분을 넘으면 분으로 말한다', () => {
    expect(slowNote(150_000)).toContain('약 3분 남음');
  });
});
