// glb-stick.js — **터치 조이스틱 손잡이를 그린다.** world7·world8 전용 배선.
//
// ── 왜 필요했나 (감독 신고 2026-08-26) ──────────────────────────────────────
// *"8을 클릭해보니 스폰 위치도 없고. 걸어다닐수가 없네"* 의 절반이 이것이었다. 이 두
// 페이지는 「반쪽 터치」다 — 왼쪽 절반이 이동, 오른쪽 절반이 시점. 구역이 화면의 절반이라
// **그릴 손잡이가 없다** 는 것이 원래 설계 근거였고(`glb-world.js` 옛 주석), 그래서
// 화면에 아무 표시가 없었다. 그 위에 조작 안내까지 모바일에서 숨겨져 있었으니 감독은
// **단서가 0** 인 화면을 본 것이다.
//
// 그리고 감독이 *"월드 2의 기본 기능 다 들어가야지"* 라고 했다. world2 에는 조이스틱이
// 있다. 그러므로 여기에도 있어야 한다.
//
// ── 값은 여기 없다 ─────────────────────────────────────────────────────────
// 색·크기·상태 표현은 `shared/joystick-look.js` 한 곳이다(감독 지시 2026-08-24
// *"하드코딩하지말고 가지고 오는 방향으로"*). 여기는 **셀렉터와 자리**만 준다.
//
// ── world2 와 무엇이 다른가 ────────────────────────────────────────────────
// world2 는 좌하단 **고정 구역**(`#w2-stick-zone`) 안에서 원이 움직인다. 여기는 구역이
// 화면 왼쪽 절반이라 고정 자리가 없다 — **누른 자리에 원이 나타난다**(동적 조이스틱).
// 룩은 같고 자리를 잡는 방식만 다르다.

import {
  joystickCss, injectJoystickStyle, leanState, LEAN_NONE,
  JOY_BASE_PX, JOY_RADIUS,
} from './shared/joystick-look.js';

/**
 * 조이스틱 DOM 을 배선한다. 마크업이 없으면 **아무 일도 안 한다**(null 반환) —
 * 이 스크립트는 두 페이지를 섬기고 한쪽이 마크업을 안 둘 수 있다.
 *
 * @returns {{show(x,y):void, move(ux,uz,mag):void, hide():void}|null}
 */
export function createStick(doc) {
  const base = doc.getElementById('gw-stick');
  const knob = doc.getElementById('gw-stick-knob');
  if (!base || !knob) return null;

  injectJoystickStyle(doc, 'gw-joy-style', joystickCss({
    base: '#gw-stick',
    knob: '#gw-stick-knob',
    on: '#gw-stick[data-on="1"]',
    lean: (v) => `#gw-stick[data-lean="${v}"]`,
    leanKnob: (v) => `#gw-stick[data-lean="${v}"] #gw-stick-knob`,
    // 손잡이가 링의 **자식**이고 `left/top` 을 px 로 준다 — 그래서 `margin` 으로 중심을
    // 잡는다(갤러리와 같은 방식). `transform` 방식이면 이동을 얹을 때 중심 보정을
    // 문자열로 다시 계산해야 해서 값이 두 곳에 갈린다.
    knobCenter: 'margin',
    // ⚠ `fixed` 를 쓰지 않는다. 그 옵션은 **링과 손잡이 양쪽**에 걸리는데(모듈이
    // 하나의 `pos` 를 둘에 쓴다) 손잡이는 링의 **자식**이라 `fixed` 가 되면 링을
    // 기준으로 놓이지 않고 화면 구석으로 달아난다 — 실측으로 잡았다.
    // 그래서 world2 와 같은 구조를 쓴다: **화면을 덮는 구역**(`#gw-stick-zone`)이
    // `fixed` 를 갖고, 링은 그 안에서 `absolute` 로 움직인다.
    fixed: false,
    // 층위는 구역이 갖는다 — 「필요 없다」를 값으로 적는다(생략은 모듈이 던진다).
    z: null,
  }));

  const half = JOY_BASE_PX / 2;
  let on = false;

  return {
    /** 누른 자리에 링을 띄운다. (x, y)는 화면 좌표. */
    show(x, y) {
      // ⚠ 중심 보정을 **여기서 하지 않는다.** `joystickCss` 의 base 규칙이 이미
      // `margin:-56px 0 0 -56px` 로 「좌표가 곧 중심」을 만든다(모듈 주석). 처음에
      // 여기서 `x - half` 를 또 빼서 **두 번 보정**했고 손잡이가 손가락에서 112px
      // 어긋났다 — 실측으로 잡았다.
      base.style.left = `${x}px`;
      base.style.top = `${y}px`;
      base.setAttribute('data-on', '1');
      base.setAttribute('data-lean', LEAN_NONE);
      knob.style.left = `${half}px`;
      knob.style.top = `${half}px`;
      on = true;
    },
    /**
     * 손잡이를 옮긴다. `ux`·`uz` 는 -1~1 로 정규화된 방향, `mag` 는 0~1 세기.
     * ⚠ 화면 y 축과 이동 z 축이 같은 부호다(아래로 끌면 뒤로 간다) — 호출부가 그 규약을
     * 이미 쓰고 있어 여기서 뒤집지 않는다.
     */
    move(ux, uz, mag) {
      if (!on) return;
      knob.style.left = `${half + ux * JOY_RADIUS}px`;
      knob.style.top = `${half + uz * JOY_RADIUS}px`;
      base.setAttribute('data-lean', leanState(mag));
    },
    /** 손을 뗐다. */
    hide() {
      on = false;
      base.setAttribute('data-on', '0');
      base.setAttribute('data-lean', LEAN_NONE);
    },
  };
}
