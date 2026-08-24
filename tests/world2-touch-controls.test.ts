// @vitest-environment jsdom
// tests/world2-touch-controls.test.ts — 터치 조작 **집행부**의 행위 (`G-EDIT14`).
//
// ── 왜 순수 함수 테스트로 부족했나 ──────────────────────────────────────────
// `tests/world2-touch.test.ts` 는 `decide/touch.ts` 의 산술만 본다. 그런데 2026-08-21
// 개정의 핵심은 산술이 아니라 **배선**이다 — 「이동은 전용 원 안에서만」·「편집 중에는
// 시선을 안 잡는다」는 `ui/touch-controls.ts` 가 리스너를 어디에 어떻게 다는가의 문제다.
//
// 🔴 **이 파일이 생긴 이유를 정직하게 적는다.** 개정을 다 하고 뮤테이션을 돌렸더니
// `onStart` 의 `editing ||` 가드를 **통째로 지워도 0 failed** 였다 — 그 축을 재는 검사가
// 하나도 없었다. 「테스트 통과는 검출력의 증거가 아니다」의 실물이라 그 자리에서 메웠다.
//
// ── 여기서 **못** 재는 것 ───────────────────────────────────────────────────
// ⚠ 실기기에서 **같은 한 번의 탭에 조이스틱과 편집이 둘 다 반응하는가** 는 여전히 못
// 잰다(jsdom 은 브라우저의 이벤트 캡처 순서를 흉내만 낸다). 여기서 재는 것은
// 「이 구현이 리스너를 어디에 다는가」와 「편집 플래그가 시선을 끊는가」 둘이다.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { attachTouchControls } from '../frontend/js/world2/ui/touch-controls.js';

/** 터치 기기인 척한다 — 아니면 `attachTouchControls` 가 즉시 빠진다 */
function pretendTouch(): void {
  vi.stubGlobal('matchMedia', () => ({ matches: true, media: '', addListener() {}, removeListener() {} }));
}

/** jsdom 에 `TouchEvent` 생성자가 없어도 되게 — 필요한 속성만 얹는다 */
function touchEvent(type: string, touches: Array<{ id: number; x: number; y: number }>): Event {
  const list = touches.map((t) => ({ identifier: t.id, clientX: t.x, clientY: t.y }));
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'touches', { value: list });
  Object.defineProperty(ev, 'changedTouches', { value: list });
  return ev;
}

function pointerEvent(type: string, id: number, x: number, y: number): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'pointerId', { value: id });
  Object.defineProperty(ev, 'clientX', { value: x });
  Object.defineProperty(ev, 'clientY', { value: y });
  return ev;
}

/**
 * @param withZone 구역을 둘 것인가. `false` 면 옛 「고정 원」 판본을 흉내낸다 —
 *   그 경로가 아직 살아 있으므로(계약이 `zone?` 이다) 대조군으로 함께 잰다.
 */
function mount(withZone = true) {
  const canvas = document.createElement('canvas');
  const zone = document.createElement('div');
  const base = document.createElement('div');
  const knob = document.createElement('div');
  base.append(knob);
  zone.append(base);
  document.body.append(canvas, zone);
  // jsdom 은 레이아웃이 없어 `getBoundingClientRect` 가 전부 0 이다 — 값을 알려 준다.
  const rect = (l: number, t: number, w: number, h: number) => () => ({
    left: l, top: t, width: w, height: h, right: l + w, bottom: t + h, x: l, y: t, toJSON() {},
  }) as DOMRect;
  zone.getBoundingClientRect = rect(0, 400, 300, 300);
  base.getBoundingClientRect = rect(0, 0, 112, 112);
  // 포인터 캡처도 jsdom 에 없다. 있는 척만 하면 된다 — 이 검사의 축이 아니다.
  for (const el of [zone, base]) {
    el.setPointerCapture = () => {};
    el.releasePointerCapture = () => {};
  }

  const axes: Array<{ x: number; z: number }> = [];
  const looks: Array<{ yaw: number; pitch: number }> = [];
  const ctl = attachTouchControls(canvas, withZone ? { zone, base, knob } : { base, knob }, {
    setAxes: (x, z) => { axes.push({ x, z }); },
    look: (yaw, pitch) => { looks.push({ yaw, pitch }); },
  });
  return { canvas, zone, base, knob, axes, looks, ctl, hit: withZone ? zone : base };
}

beforeEach(() => {
  document.body.innerHTML = '';
  pretendTouch();
});

// ── 🔴 GS-J3 — 편집 중에는 시선을 안 잡는다 ─────────────────────────────────
describe('🔴 GS-J3 — 편집이 켜지면 캔버스 드래그가 시선을 안 돌린다', () => {
  it('평소에는 캔버스 드래그가 시선을 돌린다 (대조군)', () => {
    const h = mount();
    expect(h.ctl.active, '전제 — 터치 기기로 인식돼야 한다').toBe(true);
    h.canvas.dispatchEvent(touchEvent('touchstart', [{ id: 1, x: 100, y: 100 }]));
    h.canvas.dispatchEvent(touchEvent('touchmove', [{ id: 1, x: 140, y: 100 }]));
    expect(h.looks.length, '대조군이 안 돌면 아래 단언이 헛돈다').toBeGreaterThan(0);
  });

  it('🔴 편집 중에는 같은 드래그가 시선을 **안** 돌린다 — 기즈모 끌기와 겹치기 때문이다', () => {
    const h = mount();
    h.ctl.setEditing(true);
    h.canvas.dispatchEvent(touchEvent('touchstart', [{ id: 1, x: 100, y: 100 }]));
    h.canvas.dispatchEvent(touchEvent('touchmove', [{ id: 1, x: 140, y: 100 }]));
    expect(h.looks, '🔴 편집 중에 화면이 돌아간다 — 물건을 끌면 시점까지 따라 돈다')
      .toEqual([]);
  });

  it('🔴 편집을 끄면 시선이 돌아온다 — 한쪽만 고치면 영영 안 돌아간다', () => {
    const h = mount();
    h.ctl.setEditing(true);
    h.ctl.setEditing(false);
    h.canvas.dispatchEvent(touchEvent('touchstart', [{ id: 1, x: 100, y: 100 }]));
    h.canvas.dispatchEvent(touchEvent('touchmove', [{ id: 1, x: 140, y: 100 }]));
    expect(h.looks.length, '🔴 편집을 껐는데 시선이 죽어 있다').toBeGreaterThan(0);
  });

  it('🔴 잡고 있던 중에 편집이 켜지면 그 손가락을 놓는다', () => {
    // 안 놓으면 편집 첫 프레임에 화면이 한 번 튄다.
    const h = mount();
    h.canvas.dispatchEvent(touchEvent('touchstart', [{ id: 1, x: 100, y: 100 }]));
    h.ctl.setEditing(true);
    h.canvas.dispatchEvent(touchEvent('touchmove', [{ id: 1, x: 200, y: 100 }]));
    expect(h.looks, '🔴 편집을 켠 순간 화면이 튄다').toEqual([]);
  });
});

// ── 🔴 GS-J4 — 이동은 전용 원 안에서만, 그리고 편집 중에도 산다 ─────────────
describe('🔴 GS-J4 — 이동 조이스틱은 전용 원이 받는다', () => {
  it('원을 밀면 축이 나온다', () => {
    const h = mount();
    h.hit.dispatchEvent(pointerEvent('pointerdown', 5, 56, 56));
    h.hit.dispatchEvent(pointerEvent('pointermove', 5, 56 + 60, 56));
    const last = h.axes.at(-1)!;
    expect(last.x, '🔴 원을 밀었는데 이동 축이 0이다').toBeGreaterThan(0);
  });

  it('🔴 **편집 중에도** 원은 산다 — 폰에는 궤도·줌·비행이 없어 이것마저 끊으면 못 움직인다', () => {
    const h = mount();
    h.ctl.setEditing(true);
    h.hit.dispatchEvent(pointerEvent('pointerdown', 5, 56, 56));
    h.hit.dispatchEvent(pointerEvent('pointermove', 5, 56 + 60, 56));
    expect(h.axes.at(-1)!.x, '🔴 편집 중에 조이스틱이 죽었다').toBeGreaterThan(0);
  });

  it('🔴 캔버스를 끌어도 이동 축은 안 생긴다 — 「왼쪽 절반」 판정이 되살아나면 깨진다', () => {
    const h = mount();
    h.canvas.dispatchEvent(touchEvent('touchstart', [{ id: 1, x: 10, y: 300 }]));
    h.canvas.dispatchEvent(touchEvent('touchmove', [{ id: 1, x: 10, y: 200 }]));
    // 화면 왼쪽 끝을 끌었다 — 예전 설계라면 이동이 잡혔을 자리다.
    expect(h.axes.filter((a) => a.x !== 0 || a.z !== 0), '🔴 캔버스가 아직 이동을 먹는다')
      .toEqual([]);
  });

  it('손을 떼면 멈춘다', () => {
    const h = mount();
    h.hit.dispatchEvent(pointerEvent('pointerdown', 5, 56, 56));
    h.hit.dispatchEvent(pointerEvent('pointermove', 5, 56 + 60, 56));
    h.hit.dispatchEvent(pointerEvent('pointerup', 5, 56 + 60, 56));
    expect(h.axes.at(-1), '🔴 손을 뗐는데 계속 걷는다').toEqual({ x: 0, z: 0 });
  });
});

// ── 🔴 GS-J5 — 조이스틱이 **누른 자리에** 생긴다 (감독 «고정이 불편해») ──────
//
// 2026-08-21 에 이 자리가 하루 두 번 바뀌었다. 첫 개정이 원을 좌하단에 **고정**했고
// 감독이 실기기에서 불편하다고 판정했다 — 그때 코드에 적어 둔 되돌릴 조건이 그대로
// 발동했다. 지금은 **구역이 터치를 받고 원이 손을 따라간다.**
//
// ⚠ 이 검사가 없으면 「구역만 만들고 원은 그대로 두는」 절반짜리 조치가 통과한다 —
// 그러면 감독 체감은 하나도 안 달라지는데 코드는 바뀐 것처럼 보인다.
describe('🔴 GS-J5 — 원이 누른 자리로 간다', () => {
  it('구역 안 어디를 누르든 그 자리에 원이 선다', () => {
    const h = mount();
    // 구역은 (0,400) 에서 300×300. 그 안 (220, 520) 을 누른다.
    h.zone.dispatchEvent(pointerEvent('pointerdown', 3, 220, 520));
    expect(h.base.style.left, '🔴 원이 누른 자리로 안 왔다 — 고정 판본 그대로다').toBe('220px');
    expect(h.base.style.top).toBe('120px'); // 520 - 400 (구역 로컬 좌표)
  });

  it('🔴 다른 자리를 누르면 원도 그리로 옮겨 간다', () => {
    const h = mount();
    h.zone.dispatchEvent(pointerEvent('pointerdown', 3, 60, 460));
    h.zone.dispatchEvent(pointerEvent('pointerup', 3, 60, 460));
    h.zone.dispatchEvent(pointerEvent('pointerdown', 4, 250, 660));
    expect(h.base.style.left, '🔴 첫 자리에 붙박였다').toBe('250px');
    expect(h.base.style.top).toBe('260px');
  });

  it('🔴 축은 **누른 자리 기준**으로 난다 — 원의 옛 중심이 아니라', () => {
    const h = mount();
    h.zone.dispatchEvent(pointerEvent('pointerdown', 3, 100, 500));
    // 누른 자리에서 오른쪽으로 60px. 중심이 (100,500) 이면 +x 가 나와야 한다.
    h.zone.dispatchEvent(pointerEvent('pointermove', 3, 160, 500));
    const a = h.axes.at(-1)!;
    expect(a.x, '🔴 중심을 잘못 잡았다 — 손이 가는 방향과 아바타가 어긋난다').toBeGreaterThan(0);
    expect(Math.abs(a.z), '세로로는 안 밀었다').toBeLessThan(0.05);
  });

  it('구역 밖(캔버스)은 여전히 이동을 안 먹는다 — 편집 충돌 방지가 살아 있다', () => {
    const h = mount();
    h.canvas.dispatchEvent(touchEvent('touchstart', [{ id: 1, x: 10, y: 700 }]));
    h.canvas.dispatchEvent(touchEvent('touchmove', [{ id: 1, x: 10, y: 600 }]));
    expect(h.axes.filter((a) => a.x !== 0 || a.z !== 0)).toEqual([]);
  });

  it('구역이 없으면 옛 「고정 원」 경로로 돈다 — 계약이 선택 사양이다', () => {
    const h = mount(false);
    h.base.dispatchEvent(pointerEvent('pointerdown', 3, 56, 56));
    expect(h.base.style.left, '구역이 없으면 원을 옮기지 않는다').toBe('');
    h.base.dispatchEvent(pointerEvent('pointermove', 3, 116, 56));
    expect(h.axes.at(-1)!.x, '그래도 이동은 난다').toBeGreaterThan(0);
  });
});

// ── 🔴 GS-J6 — 구역이 화면 중앙을 넘지 않는다 (검수관 블로커, 2026-08-21) ────
//
// 첫 구역 판본이 `52vw` 였고 **어떤 뷰포트에서도 중앙(50vw)을 넘었다.** 하단 중앙에는
// 조준 막대(`#w2-aim .bar` — `left:50%` 정중앙 대칭, `z-index:46` > 구역의 `6`)가 있어서
// 겹치는 자리의 터치를 그쪽이 가져간다. 조준 중에 다가가려고 미는 손이 거기서 씹힌다.
//
// ⚠ **이것은 「구역으로 넓히기」가 새로 만든 회귀였다** — 그전 판본(112px 고정,
// `left:18px`)은 왼쪽 130px 안에 갇혀 중앙까지 닿지 못했다. 검수관이 CSS 값 계산만으로
// 잡았고, 나는 그 자리를 *"확인 못 했다"* 로 넘겼다.
//
// ⚠⚠ **이 검사는 CSS 텍스트를 읽는다.** 실제 렌더 폭이 아니라 선언값을 보는 것이라
// 「브라우저가 그 값을 어떻게 해석하는가」는 못 잡는다. 그래도 **넓히려는 편집을 그
// 자리에서 멈추게** 하는 것이 목적이고, 그것은 텍스트만으로 성립한다.
/** jsdom 환경이라 `import.meta.url` 이 `file:` 이 아니다 — cwd 기준으로 읽는다 */
async function readWorld2Html(): Promise<string> {
  const fs = await import('node:fs/promises');
  return fs.readFile('frontend/world2.html', 'utf8');
}

describe('🔴 GS-J6 — 조이스틱 구역이 조준 막대와 안 겹친다', () => {
  it('구역 폭이 50vw 미만이다 — 화면 중앙을 넘으면 하단 중앙 막대와 겹친다', async () => {
    const html = await readWorld2Html();
    const m = /#w2-stick-zone\{[\s\S]*?width:min\((\d+)vw/.exec(html);
    expect(m, '🔴 `#w2-stick-zone` 의 width 선언을 못 찾았다 — 검사가 헛돈다').not.toBeNull();
    const vw = Number(m![1]);
    expect(vw, `🔴 구역이 ${vw}vw 라 화면 중앙(50vw)을 넘는다 — 조준 막대가 터치를 가져간다`)
      .toBeLessThan(50);
  });

  it('조준 중에는 구역이 막대 위로 올라간다', async () => {
    const html = await readWorld2Html();
    // 막대가 커지는 경우까지 피하려고 아예 띄운다. 그 규칙이 사라지면 안 된다.
    // 셀렉터 형태를 못 박지 않는다 — `:has()` 든 다른 방식이든 **구역을 띄우기만** 하면 된다.
    const rule = html.split('\n').find((l) => l.includes('#w2-stick-zone') && l.includes('#w2-aim'));
    expect(rule, '🔴 조준 중 회피 규칙이 사라졌다').toBeDefined();
    expect(rule!, '🔴 규칙은 있는데 구역을 안 띄운다').toMatch(/bottom:\s*[1-9]\d*px/);
  });

  it('🔴 회피 높이가 막대 실측 높이보다 크다 — 「있기만 하면 된다」로는 안 잡혔다', async () => {
    const html = await readWorld2Html();
    const rule = html.split('\n').find((l) => l.includes('#w2-stick-zone') && l.includes('#w2-aim'));
    const px = Number(/bottom:\s*(\d+)px/.exec(rule ?? '')?.[1] ?? 0);
    // 🔴 하한의 근거는 **헤드리스 4기기 실측**이다(검수관, 2026-08-21):
    //   막대 상단이 화면 바닥에서 90.4px(iPhone SE 는 129px) 위 — 안내 문구 줄이 항상
    //   있어서 실제 높이가 74.4~113.4px 이기 때문이다. 첫 조치는 `72px` 이었고 **네 기기
    //   전부에서 겹쳤다**(세로 18.4~57.4px).
    // ⚠ 이 검사도 여전히 **텍스트**를 본다 — 막대가 3단이 되면 이 하한도 낡는다.
    //   그때는 「값이 낡았다」가 아니라 「추정으로 값을 정했다」가 다시 문제가 된다.
    //   **줄이려면 렌더해서 재라.**
    expect(px, `🔴 회피가 ${px}px 라 조준 막대(실측 상단 최대 129px)를 못 피한다`)
      .toBeGreaterThanOrEqual(130);
  });
});
// ── 🔴 GS-J8 — 조이스틱 룩이 **모듈에서 온다** ─────────────────────────────
//
// 감독 지시 2026-08-24: *"전부 같게 해라"* (카드 판정 「크림+십자눈금 쪽」).
//
// ⚠⚠ **이 검사의 축이 이번 회차에 바뀌었다.** 직전 판본은 `player.js` 의 **인라인 CSS** 를
// 원본으로 읽어 world2 의 생성 CSS 와 **맞대는** 검사였다. 이제 `player.js` 도 같은 모듈에서
// CSS 를 받아 가므로 **맞댈 두 곳이 없다** — 값이 같은 것은 구조가 보증한다.
//
// 그래서 대조 계열 열 개를 걷어내고 두 축으로 나눴다:
//
//   ① **출처가 하나인가** → `tests/joystick-single-source.test.ts` (모든 파일을 훑는다.
//      직전 회차가 이름으로 세다 놓친 다섯 번째 조이스틱을 **그 검사가 찾아냈다**)
//   ② **모듈이 내는 값이 그대로인가** → 아래 「골든 값」. 원본이 사라졌으니 값의 근거는
//      이제 모듈 자신이고, 바꾸려면 **이 검사를 함께 고쳐야** 하므로 의도가 diff 에 남는다.
//
// ⚠ 이것을 「검사를 줄였다」로 읽지 마라 — 훑는 범위는 오히려 넓어졌다. 다만 **잃은 것도
// 있다**: 「갤러리 원본과 같은가」를 값 단위로 확인하던 축은 이제 없다. 원본이 모듈이 된
// 이상 그 질문 자체가 성립하지 않지만, **모듈 값이 통째로 바뀌면 골든 검사 하나만 고치면
// 통과한다**는 뜻이기도 하다. 그 경우 diff 에 골든 변경이 보이는 것이 유일한 방어다.

// ── 뮤테이션 실측 (2026-08-24) — **이 describe 의 검출력** ──────────────────
//
//   JOY_BASE_PX 112→100 / JOY_RADIUS 60→52        → 각 1 failed ✅
//   CREAM·INK·SHADOW·GREEN 각각 변조               → 각 1~2 failed ✅
//   knobOn 옵션 무시(형제 갈래 숨김 죽이기)         → 1 failed ✅
//   knob 의 pointer-events 선언 삭제               → 1 failed ✅
//
// ⚠ 마지막 것은 **처음에 0 failed 였다.** 모듈이 그 선언 옆에 적어 둔 설명 주석에 같은
// 글자가 들어 있어 정규식이 그것을 물었기 때문이다. 이 회차에만 같은 형태의 실수
// (**글자가 있는 것을 선언이 있는 것으로 읽음**)를 **세 번** 했다 — `-lean1` 문자열 유무,
// `declsOf` 의 가짜 선언, 그리고 여기. 셋 다 뮤테이션이 아니었으면 통과로 적혔다.

describe('🔴 GS-J8 — 조이스틱 룩이 모듈에서 온다', () => {
  async function readWorld2(): Promise<string> {
    const fs = await import('node:fs/promises');
    return fs.readFile('frontend/world2.html', 'utf8');
  }
  /** world2 가 실제로 주입하는 CSS 를 그대로 만든다 — 소비자와 같은 인자를 쓴다 */
  async function world2Css(): Promise<string> {
    const m = await import('../frontend/js/shared/joystick-look.js');
    return m.joystickCss({
      base: '#w2-stick',
      knob: '#w2-stick-knob',
      on: '#w2-stick[data-on="1"]',
      lean: (v: string) => `#w2-stick[data-lean="${v}"]`,
      leanKnob: (v: string) => `#w2-stick[data-lean="${v}"] #w2-stick-knob`,
      knobCenter: 'transform',
    });
  }

  it('🔴 골든 값 — 크기·반경이 그대로다', async () => {
    // 이 셋은 **화면에 직접 드러나는** 값이라 바뀌면 룩이 갈린다. 반경은 룩이자 **감도**다
    // (같은 손가락 거리에서 기울기가 달라진다) — 그래서 세 값을 한자리에서 못 박는다.
    const m = await import('../frontend/js/shared/joystick-look.js');
    expect(m.JOY_BASE_PX, '★ 링 지름이 바뀌었다').toBe(112);
    expect(m.JOY_KNOB_PX, '★ 손잡이 지름이 바뀌었다').toBe(44);
    expect(m.JOY_RADIUS, '★ 이동 반경이 바뀌었다 — 감도도 함께 바뀐다').toBe(60);
    const { STICK_RADIUS } = await import('../frontend/js/world2/decide/touch.js');
    expect(STICK_RADIUS, '★ world2 가 쓰는 반경이 모듈 값과 다르다').toBe(m.JOY_RADIUS);
  });

  it('🔴 골든 값 — 색이 그대로다', async () => {
    // 색은 모듈 안의 `const` 라 밖에서 못 읽는다. **생성된 CSS 로** 확인한다 — 소비자가
    // 실제로 받는 것이 그것이기 때문이다(상수를 직접 보면 「쓰이는가」를 못 본다).
    const css = await world2Css();
    expect(css, '★ 크림 테두리가 바뀌었다').toContain('rgba(253,251,245,.38)');
    expect(css, '★ 진주 손잡이가 바뀌었다')
      .toContain('radial-gradient(circle at 32% 28%, #fffdf8, #e8e2d2)');
    expect(css, '★ 질주 손잡이가 바뀌었다')
      .toContain('radial-gradient(circle at 32% 28%, #b8e4c9, #5f9e7d)');
    expect(css, '★ 초록이 바뀌었다').toContain('rgba(95,158,125,.9)');
    expect(css, '★ 어두운 radial 배경이 바뀌었다').toContain('rgba(23,20,15,.10)');
    expect(css, '★ 그림자 색이 바뀌었다').toContain('rgba(10,8,4,.30)');
  });

  it('★ 형태 특징이 살아 있다 — 십자 눈금과 안쪽 점선 링', async () => {
    const css = await world2Css();
    expect(css, '★ `::before` 십자 눈금이 없다').toContain('#w2-stick::before');
    expect(css, '★ `::after` 안쪽 링이 없다').toContain('#w2-stick::after');
    expect(css, '★ 점선이 아니다').toMatch(/dashed rgba\(253,251,245/);
  });

  it('🔴 「누르는 동안만」 구조가 살아 있다 — 감독 판정 «고정이 불편해»', async () => {
    const css = await world2Css();
    expect(css).toMatch(/#w2-stick\{[^}]*opacity:0/);
    expect(css).toMatch(/#w2-stick\[data-on="1"\]\{opacity:1/);
  });

  it('★ 등장 스프링이 살아 있다 — `scale(.78) → scale(1)`', async () => {
    const css = await world2Css();
    expect(css, '★ 시작 배율이 없다').toMatch(/#w2-stick\{[^}]*transform:scale\(\.78\)/);
    expect(css, '★ 켜질 때 배율이 1 로 안 간다')
      .toMatch(/#w2-stick\[data-on="1"\]\{[^}]*transform:scale\(1\)/);
  });

  it('🔴 두 단계가 실제로 열린다 — 감독 「움직이면 초록 / 달리면 더 진하게」', async () => {
    const css = await world2Css();
    expect(css, '★ 움직임 단계 규칙이 없다').toContain('#w2-stick[data-lean="1"]');
    expect(css, '★ 질주 단계 규칙이 없다').toContain('#w2-stick[data-lean="2"]');
    const move = /#w2-stick\[data-lean="1"\] #w2-stick-knob\{([^}]*)\}/.exec(css);
    const run = /#w2-stick\[data-lean="2"\] #w2-stick-knob\{([^}]*)\}/.exec(css);
    expect(move, '★ 움직임 노브 규칙을 못 찾았다').not.toBeNull();
    expect(run, '★ 질주 노브 규칙을 못 찾았다').not.toBeNull();
    expect(move![1], '★ 두 단계가 같은 값이다 — 「더 진해진다」가 안 보인다').not.toBe(run![1]);
  });

  it('🔴 손잡이 중심 정렬이 모듈에서 온다 — 두 DOM 구조를 모듈이 안다', async () => {
    // 갤러리·오픈월드·방문자뷰·실험실은 손잡이가 링의 **형제**(좌표를 직접 옮기고 `margin`
    // 으로 절반을 당긴다), world2 는 **자식**(`50%` + `translate`). 두 갈래를 **둘 다** 본다
    // — 한쪽만 보면 옵션이 무시돼도 그 한쪽은 통과한다.
    const m = await import('../frontend/js/shared/joystick-look.js');
    const sel = { base: '#b', knob: '#k', on: '#b.on', lean: (v: string) => `#b.l${v}`,
      leanKnob: (v: string) => `#b.l${v} #k` };
    expect(m.joystickCss({ ...sel, knobCenter: 'transform' }), '★ 자식 갈래가 없다')
      .toMatch(/#k\{[^}]*left:50%;top:50%;transform:translate\(-50%,-50%\)/);
    expect(m.joystickCss({ ...sel, knobCenter: 'margin' }), '★ 형제 갈래가 없다')
      .toMatch(new RegExp(`#k\\{[^}]*margin:-${m.JOY_KNOB_PX / 2}px 0 0 -${m.JOY_KNOB_PX / 2}px`));
    expect(await world2Css(), '★ world2 가 자식 갈래를 안 쓴다').toContain('left:50%;top:50%');
  });

  it('🔴 형제 갈래에서 손잡이가 따로 숨는다 — `knobOn` 옵션', async () => {
    // 갤러리는 링과 손잡이가 **형제**라 링이 숨어도 손잡이는 남는다. 이 옵션이 죽으면
    // 손잡이만 화면에 떠 있게 된다 — 룩이 아니라 **버그**다.
    const m = await import('../frontend/js/shared/joystick-look.js');
    const sel = { base: '.b', knob: '.k', on: '.b.on', lean: (v: string) => `.b.l${v}`,
      leanKnob: (v: string) => `.b.l${v} .k` };
    const sibling = m.joystickCss({ ...sel, knobOn: '.k.on', knobCenter: 'margin' });
    expect(sibling, '★ 손잡이가 안 숨는다').toMatch(/\.k\{[^}]*opacity:0/);
    expect(sibling, '★ 손잡이가 안 나타난다').toContain('.k.on{opacity:1}');
    // 자식 갈래에는 이 두 줄이 **없어야** 한다 — 있으면 링과 따로 놀아 깜빡인다.
    expect(m.joystickCss(sel), '★ 자식 갈래에 불필요한 숨김이 있다').not.toMatch(/\.k\{[^}]*opacity:0/);
  });

  it('🔴 손잡이가 터치를 가로채지 않는다 — 형제 구조에서 동작을 좌우한다', async () => {
    // 형제 구조에서는 링의 `pointer-events` 가 상속되지 않는다. 빠지면 손잡이 위에서
    // 손가락을 움직일 때 이동이 끊긴다 — 값 대조로는 안 잡히는 **동작** 결함이다.
    //
    // ⚠ **주석을 먼저 걷는다** (2026-08-24 뮤테이션 실측). 첫 판본은 생성 CSS 를 그대로
    // 정규식에 넣었는데, 선언을 통째로 지워도 **0 failed** 였다 — 모듈이 그 선언 옆에
    // 적어 둔 **설명 주석**에 같은 글자가 들어 있어 정규식이 그것을 물었다.
    // 「어딘가에 그 글자가 있다」는 「그 선언이 있다」가 아니다. 이 회차에만 같은 형태의
    // 실수를 세 번 했다(`-lean1` 문자열 유무 · `declsOf` 의 가짜 선언 · 여기).
    const css = (await world2Css()).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css, '★ 손잡이에 `pointer-events:none` 이 없다')
      .toMatch(/#w2-stick-knob\{[^}]*pointer-events:none/);
  });

  it('★ `prefers-reduced-motion` 분기가 살아 있다', async () => {
    expect(await world2Css()).toMatch(/prefers-reduced-motion/);
  });

  it('★ 레이아웃 값은 그대로다 — 룩을 옮기면서 자리를 건드리면 회귀다', async () => {
    // 구역 크기는 **레이아웃**이라 HTML 에 남는다 — 검수관 블로커와 헤드리스 4기기
    // 실측으로 정해진 값이다.
    expect(await readWorld2()).toMatch(/#w2-stick-zone\{[^}]*width:min\(44vw/);
  });

  it('🔴 후보 노브 잔재가 없다 — 감독 문언을 잘못 읽고 만든 것들이다', async () => {
    // `?stick=jelly|outline|tint|plate` 는 *"조이스틱에 통일감이 없잖아"* 를 world2 내부
    // UI 로 잘못 읽고 새로 만든 후보들이다. 되살아나도 아무도 모르면 안 된다.
    const [html, css] = await Promise.all([readWorld2(), world2Css()]);
    for (const look of ['jelly', 'outline', 'tint', 'plate']) {
      expect(html, `★ 후보 \`${look}\` 잔재가 HTML 에 있다`).not.toContain(`data-look="${look}"`);
      expect(css, `★ 후보 \`${look}\` 잔재가 생성 CSS 에 있다`).not.toContain(look);
    }
    expect(html, '★ `?stick=` 노브가 남아 있다').not.toMatch(/stick=/);
  });
});

// ── 🔴 GS-J9 — 두 단계 판정 (감독 「움직이면 초록 / 달리면 더 진하게」) ────────
//
// `leanState` 는 순수 함수라 **직접 돌린다.** 위 GS-J8 은 「CSS 에 규칙이 있는가」를 보고
// 이것은 「어느 기울기에서 어느 단계가 나오는가」를 본다 — 규칙이 있어도 판정이 늘 `0`
// 이면 색은 영영 안 변한다. 「계산된 값이 실제로 소비되는가」의 판정 쪽 절반이고,
// 집행 쪽은 맨 아래 배선 케이스가 본다.
describe('🔴 GS-J9 — 미는 정도가 단계로 갈린다', () => {
  it('★ 손을 얹기만 하면 중립이다 — 데드존 안은 색이 안 변한다', async () => {
    const { leanState, LEAN_NONE } = await import('../frontend/js/shared/joystick-look.js');
    expect(leanState(0)).toBe(LEAN_NONE);
    expect(leanState(0.001)).toBe(LEAN_NONE);
  });

  it('🔴 조금만 밀어도 「움직임」이 된다 — 감독 문언의 1단계', async () => {
    const { leanState, LEAN_MOVING } = await import('../frontend/js/shared/joystick-look.js');
    expect(leanState(0.1)).toBe(LEAN_MOVING);
    expect(leanState(0.5)).toBe(LEAN_MOVING);
    expect(leanState(0.84)).toBe(LEAN_MOVING);
  });

  it('🔴 끝까지 밀면 「질주」다 — 임계는 원본과 같은 0.85', async () => {
    const { leanState, LEAN_RUNNING, LEAN_RUN } = await import('../frontend/js/shared/joystick-look.js');
    expect(LEAN_RUN, '★ 임계가 원본(0.85)과 다르다').toBe(0.85);
    expect(leanState(0.85)).toBe(LEAN_RUNNING);
    expect(leanState(1)).toBe(LEAN_RUNNING);
  });

  it('★ 이상한 값에도 안 터진다 — 중립으로 떨어진다', async () => {
    const { leanState, LEAN_NONE } = await import('../frontend/js/shared/joystick-look.js');
    expect(leanState(NaN)).toBe(LEAN_NONE);
    expect(leanState(-1)).toBe(LEAN_NONE);
  });

  it('🔴 배선 — 스타일이 실제로 주입되고 미는 만큼 단계가 새겨진다', () => {
    // 판정과 CSS 가 둘 다 참인데 아무도 주입·기록 안 하면 룩이 영영 안 나온다.
    document.getElementById('w2-joy-style')?.remove();
    const m = mount();
    expect(document.getElementById('w2-joy-style'), '★ 스타일이 안 붙었다 — 룩이 안 나온다')
      .not.toBeNull();
    // 원 중심에서 조금 민다 → 「움직임」
    m.hit.dispatchEvent(pointerEvent('pointerdown', 1, 150, 550));
    m.hit.dispatchEvent(pointerEvent('pointermove', 1, 170, 550));
    expect(m.base.getAttribute('data-lean'), '★ 조금 밀었는데 단계가 안 새겨졌다').toBe('1');
    // 끝까지 민다 → 「질주」
    m.hit.dispatchEvent(pointerEvent('pointermove', 1, 250, 550));
    expect(m.base.getAttribute('data-lean'), '★ 끝까지 밀었는데 질주가 안 된다').toBe('2');
    // 손을 뗀다 → 중립
    m.hit.dispatchEvent(pointerEvent('pointerup', 1, 250, 550));
    expect(m.base.getAttribute('data-lean'), '★ 손을 뗐는데 색이 남았다').toBe('0');
  });
});
