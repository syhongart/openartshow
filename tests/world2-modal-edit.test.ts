// 블렌더식 모달 조작의 **산술과 상태 기계** — 순수 계층을 직접 부른다.
//
// ── 왜 행위 테스트와 따로 세우나 ────────────────────────────────────────────
// W4 에서 순수 함수의 결함 둘이 **행위 축에서 안 잡혔다**(R3·R5 뮤테이션, 0 failed).
// 원인은 «다른 것이 막아 주고 있어서» 였다 — 저장 경로가 이미 걷어내거나, 하류 필터가
// 같은 일을 한 번 더 해서 상류가 틀려도 결과가 맞았다. 그래서 순수 계층은 **직접 부르는**
// 축을 따로 둔다. 조립을 거치면 «누가 실제로 그 일을 했는가» 가 흐려진다.
//
// ── 여기서 못 재는 것 ───────────────────────────────────────────────────────
// **조작감**이다. 픽셀당 이동량이 손에 맞는지는 감독 화면에서만 갈린다(이 환경은
// swiftshader 헤드리스라 WebGPU 룩도 조작 지연도 원리적으로 못 잰다). 이 파일이 지키는
// 것은 «규칙이 규칙대로 계산되는가» 이지 «그 규칙이 좋은가» 가 아니다.
//
// ── 검출력 실측 (2026-08-13, 별도 클론) ─────────────────────────────────────
// 아래 「뮤테이션」 절 참조. 대조군은 이 파일 44 passed.

import { describe, it, expect } from 'vitest';
import {
  applyDelta, modalDelta, modalLabel, modalOpener, readModalKey, typedValue,
  MOVE_PER_PX, ROT_PER_PX, SCALE_PER_PX, ZERO_DELTA,
  type ModalState, type Pose,
} from '../frontend/js/world2/decide/modal-edit.js';

const POSE: Pose = { x: 10, y: 2, z: -4, ry: 0.5, s: 1.5 };

function st(over: Partial<ModalState> = {}): ModalState {
  return { kind: 'move', axis: null, digits: '', startX: 0, startY: 0, ...over };
}

describe('타이핑 중간 상태 — 아직 수가 아닌 것', () => {
  // 문자열로 드는 이유가 여기 있다: `-` 만 친 순간, `1.` 인 순간이 **정상 상태**다.
  // 숫자로 즉시 파싱하면 그 중간을 표현할 수 없어 소수점을 아예 못 친다.
  it.each(['', '-', '.', '-.'])('«%s» 는 아직 값이 아니다', (s) => {
    expect(typedValue(s)).toBeNull();
  });

  it.each([['2', 2], ['-1.5', -1.5], ['0', 0], ['12.25', 12.25]] as const)(
    '«%s» → %s', (s, want) => { expect(typedValue(s)).toBe(want); },
  );

  it('수가 아닌 문자열은 null — 상태 기계가 걸러도 여기가 마지막 방벽이다', () => {
    expect(typedValue('1e999')).toBeNull(); // Infinity
    expect(typedValue('--')).toBeNull();
  });
});

describe('마우스 이동량 → 델타', () => {
  it('축 자유 이동은 **지면 평면**이다 — 세로 이동이 z 로 간다', () => {
    const d = modalDelta('move', null, '', 100, 40);
    expect(d.dx).toBeCloseTo(100 * MOVE_PER_PX, 10);
    expect(d.dz).toBeCloseTo(40 * MOVE_PER_PX, 10);
    expect(d.dy, '★ 축 자유 이동이 높이를 건드렸다 — 지면 평면이어야 한다').toBe(0);
  });

  it('X 축을 고정하면 **가로 이동만** 먹는다', () => {
    const d = modalDelta('move', 'x', '', 100, 999);
    expect(d.dx).toBeCloseTo(100 * MOVE_PER_PX, 10);
    expect(d.dz, '★ X 로 고정했는데 z 가 움직였다 — 축 고정이 안 먹는다').toBe(0);
    expect(d.dy).toBe(0);
  });

  it('Z 축을 고정하면 **가로 이동이 z 로** 간다 — 축은 화면이 아니라 월드다', () => {
    const d = modalDelta('move', 'z', '', 100, 999);
    expect(d.dz).toBeCloseTo(100 * MOVE_PER_PX, 10);
    expect(d.dx).toBe(0);
  });

  it('★ Y 축은 **위로 끌면 올라간다** — 화면 y 는 아래가 양수다', () => {
    // 부호를 안 뒤집으면 «위로 끌었는데 물건이 내려간다» 가 된다. 화면에서만 드러나는
    // 형태이고, 산술로 못 박지 않으면 다음 사람이 «맞나?» 하며 다시 재본다.
    const up = modalDelta('move', 'y', '', 0, -100);
    expect(up.dy, '★ 위로 끌었는데 값이 안 올라간다').toBeGreaterThan(0);
    expect(up.dy).toBeCloseTo(100 * MOVE_PER_PX, 10);
    expect(modalDelta('move', 'y', '', 0, 100).dy).toBeLessThan(0);
  });

  it('회전은 가로 이동만 본다', () => {
    expect(modalDelta('rotate', null, '', 200, 500).dry).toBeCloseTo(200 * ROT_PER_PX, 10);
  });

  it('크기는 1 을 기준으로 한 **배수**다 — 안 움직이면 1', () => {
    expect(modalDelta('scale', null, '', 0, 0).ks).toBe(1);
    expect(modalDelta('scale', null, '', 500, 0).ks).toBeCloseTo(1 + 500 * SCALE_PER_PX, 10);
  });

  it('★ 크기를 왼쪽으로 끝까지 끌어도 0 이하로 안 내려간다 — 뒤집힌 지오메트리 방지', () => {
    // `1 + dxPx * SCALE_PER_PX` 는 dxPx = -1000 에서 0 이 되고 그 아래는 음수다.
    // 음수 스케일은 면이 뒤집혀 건물 속이 보인다.
    expect(modalDelta('scale', null, '', -2000, 0).ks).toBeGreaterThan(0);
    expect(modalDelta('scale', null, '', -1000, 0).ks).toBeGreaterThan(0);
  });
});

describe('타이핑이 마우스를 이긴다 (블렌더가 하는 것)', () => {
  // 정확한 값을 넣으려는 사람이 손을 떨어도 값이 안 흔들려야 한다.
  it('★ 이동 — 숫자를 치면 마우스 이동량을 무시한다', () => {
    const d = modalDelta('move', 'x', '2.5', 9999, 9999);
    expect(d.dx, '★ 2.5 를 쳤는데 마우스 이동량이 섞였다').toBe(2.5);
    expect(d.dz).toBe(0);
  });

  it('★ 회전은 **도(°)로** 친다 — 라디안을 치는 사람은 없다', () => {
    expect(modalDelta('rotate', null, '90', 9999, 0).dry).toBeCloseTo(Math.PI / 2, 10);
    expect(modalDelta('rotate', null, '-180', 0, 0).dry).toBeCloseTo(-Math.PI, 10);
  });

  it('★ 크기는 **배수 그대로** 친다 — 2 = 두 배', () => {
    expect(modalDelta('scale', null, '2', 9999, 0).ks).toBe(2);
  });

  it('★ 크기에 0 이나 음수를 치면 무시한다(1 로)', () => {
    expect(modalDelta('scale', null, '0', 0, 0).ks).toBe(1);
    expect(modalDelta('scale', null, '-3', 0, 0).ks).toBe(1);
  });

  it('축 자유 이동에 숫자를 치면 x 로 간다 — 두 축에 같은 수를 넣지 않는다', () => {
    const d = modalDelta('move', null, '3', 100, 100);
    expect(d.dx).toBe(3);
    expect(d.dz, '★ 자유 이동에 숫자를 쳤더니 x·z 가 함께 움직였다 — 대각선으로 튄다').toBe(0);
  });
});

describe('시작 스냅샷 + 델타 = 지금 (취소가 성립하는 근거)', () => {
  it('★ ZERO_DELTA 는 항등원이다 — **취소가 이것 하나에 달려 있다**', () => {
    // 취소는 «델타를 0 으로 보고 스냅샷을 그대로 쓴다» 이다. 이 성질이 깨지면
    // Esc 를 눌러도 물건이 원래 자리로 안 돌아간다.
    expect(applyDelta(POSE, ZERO_DELTA)).toEqual(POSE);
  });

  it('위치·회전은 더하고 **크기는 곱한다**', () => {
    // 곱셈인 것은 작은 물건과 큰 물건이 같은 손맛을 내야 하기 때문이다
    // (`decide/edit-pick.ts` 의 `scaleBy` 와 같은 근거).
    const p = applyDelta(POSE, { dx: 1, dy: 2, dz: 3, dry: 0.25, ks: 2 });
    expect(p).toEqual({ x: 11, y: 4, z: -1, ry: 0.75, s: 3 });
  });

  it('★ 스냅샷은 안 바뀐다 — 매 프레임 이것에 다시 델타를 얹기 때문이다', () => {
    const from: Pose = { ...POSE };
    applyDelta(from, { dx: 5, dy: 5, dz: 5, dry: 5, ks: 5 });
    expect(from, '★ applyDelta 가 원본을 고쳤다 — 그러면 조작이 누적돼 취소가 불가능해진다')
      .toEqual(POSE);
  });

  it('★ 같은 델타를 두 번 적용해도 같은 결과다 — 누적이 아니다', () => {
    const d = { dx: 3, dy: 0, dz: 0, dry: 0, ks: 1 };
    expect(applyDelta(POSE, d)).toEqual(applyDelta(POSE, d));
  });
});

describe('키가 상태를 어떻게 옮기는가', () => {
  it('Escape 는 취소, Enter 는 확정', () => {
    expect(readModalKey(st(), 'Escape', 'Escape')).toEqual({ act: 'cancel' });
    expect(readModalKey(st(), 'Enter', 'Enter')).toEqual({ act: 'commit' });
    expect(readModalKey(st(), 'NumpadEnter', 'Enter')).toEqual({ act: 'commit' });
  });

  it('X·Y·Z 가 축을 고정한다', () => {
    expect(readModalKey(st(), 'KeyX', 'x')).toEqual({ act: 'axis', axis: 'x' });
    expect(readModalKey(st(), 'KeyY', 'y')).toEqual({ act: 'axis', axis: 'y' });
    expect(readModalKey(st(), 'KeyZ', 'z')).toEqual({ act: 'axis', axis: 'z' });
  });

  it('★ 같은 축을 두 번 누르면 **해제**된다 — 잘못 눌렀을 때 되돌릴 길', () => {
    expect(readModalKey(st({ axis: 'x' }), 'KeyX', 'x')).toEqual({ act: 'axis', axis: null });
  });

  it('다른 축을 누르면 갈아탄다 — 해제 후 다시 누르게 하지 않는다', () => {
    expect(readModalKey(st({ axis: 'x' }), 'KeyZ', 'z')).toEqual({ act: 'axis', axis: 'z' });
  });

  it('숫자는 뒤에 붙는다', () => {
    expect(readModalKey(st({ digits: '1' }), 'Digit2', '2')).toEqual({ act: 'digit', digits: '12' });
  });

  it('Backspace 는 한 글자 지운다 — 다 지우면 마우스 조작으로 돌아간다', () => {
    expect(readModalKey(st({ digits: '12' }), 'Backspace', 'Backspace'))
      .toEqual({ act: 'digit', digits: '1' });
    expect(readModalKey(st({ digits: '1' }), 'Backspace', 'Backspace'))
      .toEqual({ act: 'digit', digits: '' });
  });

  it('★ 부호는 **맨 앞에서만** — 중간에 끼면 수가 아니게 된다', () => {
    expect(readModalKey(st({ digits: '' }), 'Minus', '-')).toEqual({ act: 'digit', digits: '-' });
    expect(readModalKey(st({ digits: '12' }), 'Minus', '-'), '★ «12-» 가 만들어졌다').toBeNull();
  });

  it('★ 소수점은 한 번만', () => {
    expect(readModalKey(st({ digits: '1' }), 'Period', '.')).toEqual({ act: 'digit', digits: '1.' });
    expect(readModalKey(st({ digits: '1.5' }), 'Period', '.'), '★ «1.5.» 가 만들어졌다').toBeNull();
  });

  it('★ 글자는 `key` 로 본다 — `code` 는 자판 배열에 묶여 있다', () => {
    // 한국어 자판에서 숫자열의 `code` 는 `Digit1` 이지만, 배열에 따라 `Minus`·`Period` 의
    // 자리가 다르다. 찍힌 글자를 봐야 어느 자판에서도 같게 동작한다.
    expect(readModalKey(st(), 'Numpad5', '5')).toEqual({ act: 'digit', digits: '5' });
  });

  it('★ 모르는 키는 null 이다 — 부르는 쪽이 통과시켜 주행이 산다', () => {
    // 이것이 «모달 중에도 WASD 로 걸어다닌다» 의 근거다. 여기가 무언가를 내면
    // `input.ts` 가 `stopPropagation` 을 불러 주행 키가 죽는다.
    expect(readModalKey(st(), 'KeyW', 'w')).toBeNull();
    expect(readModalKey(st(), 'KeyA', 'a')).toBeNull();
    expect(readModalKey(st(), 'KeyS', 's')).toBeNull();
    expect(readModalKey(st(), 'KeyD', 'd')).toBeNull();
    expect(readModalKey(st(), 'Tab', 'Tab')).toBeNull();
  });
});

describe('모달을 여는 키', () => {
  it('G·R·S — 블렌더 표준', () => {
    expect(modalOpener('KeyG')).toBe('move');
    expect(modalOpener('KeyR')).toBe('rotate');
    expect(modalOpener('KeyS')).toBe('scale');
  });

  it('★ 그 외에는 안 연다 — 특히 주행 키 W·A·D', () => {
    // `S` 만 주행과 겹친다(뒤로). 나머지 셋까지 열면 걷기가 통째로 죽는다.
    for (const c of ['KeyW', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX', 'Space', 'Tab']) {
      expect(modalOpener(c), `★ ${c} 가 모달을 연다`).toBeNull();
    }
  });
});

describe('화면이 지금 무엇을 하는지 말한다', () => {
  // 모달은 **보이는 핸들이 없다.** 기즈모는 잡은 축이 색으로 보이지만 모달은 아무것도
  // 안 보이므로, 이 한 줄이 «무엇이 시작됐는지» 의 유일한 표지다.
  it('타이핑 중에는 친 것을 그대로 보여준다 — 단위와 함께', () => {
    expect(modalLabel(st({ digits: '2.5', axis: 'x' }), ZERO_DELTA)).toContain('2.5m');
    expect(modalLabel(st({ kind: 'rotate', digits: '90' }), ZERO_DELTA)).toContain('90°');
    expect(modalLabel(st({ kind: 'scale', digits: '2' }), ZERO_DELTA)).toContain('2배');
  });

  it('★ 고정한 축이 보인다 — 안 보이면 «왜 한쪽으로만 가지» 가 된다', () => {
    expect(modalLabel(st({ axis: 'x' }), ZERO_DELTA)).toContain('X');
    expect(modalLabel(st({ axis: null }), ZERO_DELTA)).not.toContain('X');
  });

  it('마우스로 밀 때는 지금 값이 보인다', () => {
    expect(modalLabel(st(), { ...ZERO_DELTA, dx: 2, dz: 3 })).toContain('2.00');
    expect(modalLabel(st({ kind: 'rotate' }), { ...ZERO_DELTA, dry: Math.PI / 2 }))
      .toContain('90.0°');
    expect(modalLabel(st({ kind: 'scale' }), { ...ZERO_DELTA, ks: 2 })).toContain('2.000');
  });
});
