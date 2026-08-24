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

// ── 🔴 GS-J8 — 조이스틱 룩이 **오픈월드(world1) 원본과 같은가** ──────────────
//
// 감독 지시 2026-08-23: *"오픈월드에서 사용하는 조이스틱 방식과 동일하게 해. 터치해야
// 조이스틱 나오고. 형태 크기 똑같이. **새로 만들라는게 아니라. 가지고 와야지.**"*
//
// ⚠ **이 검사는 GS-J7 을 대체한다.** GS-J7 은 `?stick=` 후보 넷의 배선을 봤는데, 그
// 후보들은 **감독 문언을 잘못 읽고 새로 만든 것**이라 이번 회차에 전부 걷어냈다.
// 「통일」의 상대가 같은 페이지의 다른 UI 가 아니라 **다른 페이지(world1)** 였다.
//
// ── 이 검사가 막는 것 — **값 미러링** ───────────────────────────────────────
// 원본은 `frontend/js/player.js` 의 `lu-joy-style` 인데 그 파일은 **라이브 런타임
// 보호파일**이라 CSS 를 공유 모듈로 뺄 수 없다(그 리팩터 자체가 보호파일 수정이고
// 팀장 판정 사안 — 백로그 `G-UI3`). 그래서 값을 **복사**했고, 복사는 곧 미러링이다.
//
// 이 저장소는 색 미러링으로 **세 번** 데였다. 한쪽만 고치면 아무도 모른다 — 특히
// world1 을 손보는 사람은 world2 를 볼 이유가 없다. 그러니 **두 파일을 실제로 읽어
// 대조**한다. 텍스트 대조라 "브라우저가 어떻게 그리는가"는 못 보지만, **갈라지는 것**은
// 이 축이 유일하게 잡는다.
//
// ⚠ 못 잡는 것: ① 두 곳을 **동시에 같은 값으로** 고치는 것(그건 의도된 변경이다)
// ② 실제 렌더 결과 ③ world1 이 파일을 옮기거나 CSS 를 다른 방식으로 주입하게 바뀌면
// 아래 정규식이 빗나가 **거짓 FAIL** 이 난다 — 그때는 검사를 지우지 말고 함께 고친다.

describe('🔴 GS-J8 — 조이스틱이 오픈월드 원본과 같은 값이다', () => {
  /** jsdom 이라 `import.meta.url` 이 `file:` 이 아니다 — 위 헬퍼와 같이 cwd 기준으로 읽는다 */
  async function readPlayerJs(): Promise<string> {
    const fs = await import('node:fs/promises');
    return fs.readFile('frontend/js/player.js', 'utf8');
  }

  /** 원본에서 한 선언의 값을 뽑는다. 못 찾으면 `null` — 그 자체가 실패 신호다 */
  function pick(src: string, re: RegExp): string | null {
    const m = re.exec(src);
    return m ? m[1]!.replace(/\s+/g, ' ').trim() : null;
  }

  it('★ 원본을 실제로 찾을 수 있다 — 못 찾으면 아래 대조가 전부 공허하다', async () => {
    const player = await readPlayerJs();
    expect(player, '★ `lu-joy-base` 가 없다 — world1 조이스틱이 옮겨졌나?')
      .toContain('.lu-joy-base');
    expect(player, '★ `lu-joy-knob` 이 없다').toContain('.lu-joy-knob');
  });

  it('★ 링 크기가 같다 (112px)', async () => {
    const [player, CSS] = await Promise.all([readPlayerJs(), readWorld2Html()]);
    const orig = pick(player, /\.lu-joy-base\s*\{[^}]*?width:\s*(\d+px)/);
    expect(orig, '★ 원본에서 링 폭을 못 뽑았다').toBe('112px');
    expect(CSS, `★ 링이 원본(${orig})과 다르다`).toMatch(/#w2-stick\{[^}]*width:112px/);
  });

  it('🔴 노브 크기가 같다 (44px) — 감독 문언 「형태 크기 똑같이」', async () => {
    const [player, CSS] = await Promise.all([readPlayerJs(), readWorld2Html()]);
    const orig = pick(player, /\.lu-joy-knob\s*\{[^}]*?width:\s*(\d+px)/);
    expect(orig, '★ 원본에서 노브 폭을 못 뽑았다').toBe('44px');
    expect(CSS, `★ 노브가 원본(${orig})과 다르다 — 이 회차 전에는 46px 이었다`)
      .toMatch(/#w2-stick-knob\{[^}]*width:44px/);
  });

  it('🔴 이동 반경이 같다 (60) — 링을 넘어가는 정도가 화면에 보인다', async () => {
    const player = await readPlayerJs();
    const m = /JOYSTICK_RADIUS\s*=\s*(\d+)/.exec(player);
    expect(m, '★ 원본에서 `JOYSTICK_RADIUS` 를 못 뽑았다').not.toBeNull();
    const { STICK_RADIUS } = await import('../frontend/js/world2/decide/touch.js');
    expect(STICK_RADIUS, `★ 반경이 원본(${m![1]})과 다르다 — 52 일 때는 노브가 링(반경 56) `
      + '안에 머물렀고 60 이면 넘어간다. 화면에 보이는 차이다')
      .toBe(Number(m![1]));
  });

  it('★ 링의 크림 테두리 색이 같다', async () => {
    const [player, CSS] = await Promise.all([readPlayerJs(), readWorld2Html()]);
    const orig = pick(player, /\.lu-joy-base\s*\{[^}]*?border:\s*[^;]*?(rgba\([^)]+\))/);
    expect(orig, '★ 원본에서 링 테두리 색을 못 뽑았다').not.toBeNull();
    // 원본은 `0.38`, 여기는 `.38` 로 적힐 수 있어 앞 0 을 지우고 비교한다.
    const norm = (v: string) => v.replace(/(\D)0\./g, '$1.').replace(/\s/g, '');
    expect(norm(CSS), `★ 링 테두리가 원본(${orig})과 다르다`).toContain(norm(orig!));
  });

  it('★ 노브의 진주 그라디언트가 같다', async () => {
    const [player, CSS] = await Promise.all([readPlayerJs(), readWorld2Html()]);
    const orig = pick(player, /\.lu-joy-knob\s*\{[^}]*?background:\s*(radial-gradient\([^;]+\))/);
    expect(orig, '★ 원본에서 노브 배경을 못 뽑았다').not.toBeNull();
    const norm = (v: string) => v.replace(/\s/g, '');
    expect(norm(CSS), `★ 노브 배경이 원본과 다르다`).toContain(norm(orig!));
  });

  it('★ 십자 눈금과 안쪽 점선 링을 가져왔다 — 원본의 형태 특징이다', async () => {
    const CSS = await readWorld2Html();
    expect(CSS, '★ `::before` 십자 눈금이 없다').toMatch(/#w2-stick::before/);
    expect(CSS, '★ `::after` 안쪽 링이 없다').toMatch(/#w2-stick::after/);
    expect(CSS, '★ 점선이 아니다 — 원본은 `1px dashed` 다').toMatch(/dashed rgba\(253,251,245/);
  });

  it('🔴 「누르는 동안만」 구조가 살아 있다 — 감독 판정 «고정이 불편해»', async () => {
    const CSS = await readWorld2Html();
    expect(CSS).toMatch(/#w2-stick\{[^}]*opacity:0/);
    expect(CSS).toMatch(/#w2-stick\[data-on="1"\]\{opacity:1/);
  });

  it('★ 등장 스프링을 가져왔다 — 원본과 같은 `scale(.78) → scale(1)`', async () => {
    const CSS = await readWorld2Html();
    expect(CSS, '★ 시작 배율이 없다').toMatch(/#w2-stick\{[^}]*transform:scale\(\.78\)/);
    expect(CSS, '★ 켜질 때 배율이 1 로 안 간다')
      .toMatch(/#w2-stick\[data-on="1"\]\{[^}]*transform:scale\(1\)/);
  });

  it('★ 후보 노브(`?stick=`)가 남아 있지 않다 — 감독 «새로 만들라는게 아니라»', async () => {
    const CSS = await readWorld2Html();
    expect(CSS, '★ `data-look` 규칙이 남았다').not.toMatch(/data-look/);
  });

  it('★ 레이아웃 값은 그대로다 — 룩 이식이 자리를 건드리면 회귀다', async () => {
    const CSS = await readWorld2Html();
    expect(CSS).toMatch(/#w2-stick-zone\{[^}]*width:min\(44vw/);
    expect(CSS).toMatch(/#w2-stick\{[^}]*margin:-56px/);
  });

  it('★ `prefers-reduced-motion` 분기가 살아 있다', async () => {
    const CSS = await readWorld2Html();
    expect(CSS).toMatch(/prefers-reduced-motion/);
  });
});
