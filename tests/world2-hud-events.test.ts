// 이벤트 로그와 마크 — **감독의 지각과 내부 전이를 같은 축에 올리는 장치**가 실제로 도는가.
//
// ── 왜 이 파일이 필요한가 ───────────────────────────────────────────────────
// 이 장치는 감독 실기기에서 **단 한 번** 쓰이고 그 한 번으로 진단이 갈린다. 그때
// 이벤트가 비어 있거나 마크가 안 찍히면, 리포트는 조용히 *"이 창에 이벤트 0건"* 을
// 출력하고 `formatEvents` 주석은 그것을 *"전이가 아니라 연속 변화"* 로 읽으라고
// 적어 두었다 — 즉 **배선 결함이 결론으로 둔갑한다.** 그 형태가 이 저장소의 상시
// 위험(*"못 잰 것이 통과로 적히는 경향"*)이라, 배선 자체를 검사로 못 박는다.
//
// 그래서 순수 함수(`formatEvents`)와 **실제 `attachHud`** 를 둘 다 돌린다. 경계를
// 건너는 지점(probe 이름 → 이벤트 목록 → 리포트)은 어느 쪽 단위 테스트에도 안 걸린다.

import { describe, it, expect } from 'vitest';
import { formatEvents, formatReport, MARK_WINDOW_S, type Ev } from '../frontend/js/world2/decide/telemetry.js';
import { attachHud, type HudParts, type HudSource } from '../frontend/js/world2/ui/hud.js';

function el() {
  const handlers: Record<string, Array<() => void>> = {};
  return {
    textContent: '',
    dataset: {} as Record<string, string>,
    addEventListener(t: string, cb: () => void) { (handlers[t] ??= []).push(cb); },
    removeEventListener(t: string, cb: () => void) {
      const a = handlers[t] ?? []; const i = a.indexOf(cb); if (i >= 0) a.splice(i, 1);
    },
    fire(t: string) { for (const cb of [...(handlers[t] ?? [])]) cb(); },
  };
}

const SRC: HudSource = {
  backend: () => 'WebGL',
  counts: () => ({ draw: 100, pipeline: 10, geometries: 20, textures: 15 }),
  stream: () => ({ loaded: 9, built: 0, released: 0, starved: 0 }),
  adapt: () => ({ pixelRatio: 1, frameCap: 0, triAvg: 1000 }),
};

function makeHud(withMark = true) {
  const root = el(); const body = el(); const copy = el(); const toggle = el(); const mark = el();
  const hud = attachHud(
    { root, body, copy, toggle, mark: withMark ? mark : null } as unknown as HudParts,
    SRC,
  );
  return { hud, mark, root, body, copy, toggle };
}

const ev = (t: number, name: string, value = 0): Ev => ({ t, name, value });

describe('formatEvents — 마크 주변만 뽑는다', () => {
  it('마크 창 밖 이벤트는 안 나온다', () => {
    const evs = [ev(1, '멀리'), ev(10, '가까이'), ev(30, '멀리2')];
    const s = formatEvents(evs, [10]);
    expect(s).toContain('가까이');
    expect(s).not.toContain('멀리');
  });

  it('창 경계는 포함이다 — ±MARK_WINDOW_S 가 정확히 그 폭이다', () => {
    // 경계를 배타로 바꾸면 반응이 느린 회차의 이벤트가 통째로 사라진다. 그 손실은
    // 화면에 "0건" 으로만 보이므로 아무도 눈치채지 못한다.
    const evs = [ev(10 - MARK_WINDOW_S, '경계앞'), ev(10 + MARK_WINDOW_S, '경계뒤')];
    const s = formatEvents(evs, [10]);
    expect(s).toContain('경계앞');
    expect(s).toContain('경계뒤');
  });

  it('마크 기준 상대 시각을 부호와 함께 적는다', () => {
    const s = formatEvents([ev(9.5, '앞'), ev(10.5, '뒤')], [10]);
    expect(s).toContain('-0.50s');
    expect(s).toContain('+0.50s');
  });

  it('빈 창은 그 자체가 결론이라고 적는다', () => {
    // 이 문장이 없으면 빈 목록이 "계측이 안 붙었나" 로도 읽힌다. 무엇을 뜻하는지는
    // 데이터가 아니라 이 줄이 말해 준다.
    const s = formatEvents([ev(1, '먼것')], [50]);
    expect(s).toContain('이벤트 0건');
    expect(s).toContain('연속 변화');
  });

  it('마크가 없으면 최근 것만 주면서 **생략했다는 사실**을 적는다', () => {
    const evs = Array.from({ length: 40 }, (_, i) => ev(i, `e${i}`));
    const s = formatEvents(evs, [], MARK_WINDOW_S, 25);
    expect(s).toContain('마크 없음');
    expect(s).toContain('15건은 생략');   // 40 - 25
    expect(s).toContain('e39');
    expect(s).not.toContain('e0 ');
  });

  it('마크 여러 개는 각각의 창으로 나뉜다', () => {
    const s = formatEvents([ev(10, 'A'), ev(50, 'B')], [10, 50]);
    expect(s).toContain('마크 10.0초');
    expect(s).toContain('마크 50.0초');
    expect(s).toContain('A');
    expect(s).toContain('B');
  });
});

describe('HUD — probe 의 ev: 접두가 이벤트로 간다', () => {
  it('ev: 이벤트는 프레임 통계를 오염시키지 않는다', () => {
    // 이름 판정을 잘못 두면 이벤트 값(거리 m)이 프레임 링에 들어가 fps 가 무너진다.
    // `away_ms` 에서 이미 한 번 겪은 형태다(`world2-hud-away.test.ts`).
    const { hud, toggle, body } = makeHud();
    for (let i = 0; i < 60; i++) hud.sample('frame_ms', 16.7);
    hud.sample('ev:tier강등', 4000);
    toggle.fire('click');
    expect(body.textContent).toContain('60fps');
    hud.dispose();
  });

  it('**수집됐다는 것**까지 본다 — 개수가 화면에 나온다', () => {
    // ⚠ 위 단언만으로는 검출력이 0 이다. **뮤테이션으로 실측했다**: `sample` 의 `ev:`
    // 분기를 통째로 지워도 값이 어느 링에도 안 들어가 조용히 사라질 뿐이라 위 테스트가
    // 그대로 초록이었다. "오염되지 않았다" 와 "수집됐다" 는 다른 명제다.
    const { hud, toggle, body } = makeHud();
    hud.sample('frame_ms', 16.7);
    hud.sample('ev:tier강등', 40);
    hud.sample('ev:파셀반납', 70);
    toggle.fire('click');
    expect(body.textContent).toContain('이벤트 2');
    hud.dispose();
  });

  it('마크 개수도 화면에 나온다', () => {
    const { hud, mark, toggle, body } = makeHud();
    hud.sample('frame_ms', 16.7);
    mark.fire('click');
    toggle.fire('click');
    expect(body.textContent).toContain('마크 1');
    hud.dispose();
  });

  it('마크를 누르면 버튼이 번호를 보여준다', () => {
    // 반응이 없으면 감독은 눌렸는지 모른 채 다시 누른다 — 마크가 겹치면 창이 갈린다.
    const { hud, mark } = makeHud();
    mark.fire('click');
    expect(mark.textContent).toBe('📍1');
    mark.fire('click');
    expect(mark.textContent).toBe('📍2');
    hud.dispose();
  });

  it('마크 버튼이 없어도 HUD 는 그대로 돈다', () => {
    // 진단용 추가물이 기본 기능을 인질로 잡지 않는다는 성질. 버튼 id 오타 하나로
    // 실기기 수치를 통째로 못 받는 일이 없어야 한다.
    const { hud, toggle, body } = makeHud(false);
    for (let i = 0; i < 60; i++) hud.sample('frame_ms', 16.7);
    expect(() => toggle.fire('click')).not.toThrow();
    expect(body.textContent).toContain('60fps');
    hud.dispose();
  });
});

describe('리포트 — 이벤트 절이 실제로 실린다', () => {
  const base = {
    backend: 'WebGPU', ua: 'test', dpr: 3, screen: '320x519', elapsedS: 10,
    frameMs: [16.7], updMs: [1], renderMs: [2], outMs: [12],
    draw: [100], pipeline: [10], geometries: [20], textures: [15],
    parcels: [9], built: 0, released: 0, starved: 0,
    pixelRatio: 1, frameCap: 0, triAvg: 1000,
  };

  it('마크가 있으면 제목에 개수가 나온다', () => {
    const s = formatReport({ ...base, events: [ev(5, 'tier강등', 40)], marks: [5] });
    expect(s).toContain('[이벤트 — 마크 1개');
    expect(s).toContain('tier강등');
  });

  it('마크가 없으면 **경고를 제목에 단다**', () => {
    // 마크 없는 리포트는 "어느 줄이 증상과 짝인지 모른다" 는 상태다. 조용히 목록만
    // 주면 읽는 사람이 아무 줄이나 원인으로 지목하게 된다.
    const s = formatReport({ ...base, events: [ev(5, 'tier강등', 40)], marks: [] });
    expect(s).toContain('마크가 없다');
  });

  it('이벤트가 하나도 없으면 절 자체를 안 만든다 — 빈 제목은 노이즈다', () => {
    const s = formatReport({ ...base, events: [], marks: [] });
    expect(s).not.toContain('[이벤트');
  });
});
