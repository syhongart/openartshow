// 블렌더식 모달 조작의 **산술과 상태 기계** — 순수 계층을 직접 부른다.
//
// ── 왜 행위 테스트와 따로 세우나 ────────────────────────────────────────────
// W4 에서 순수 함수의 결함 둘이 **행위 축에서 안 잡혔다**(R3·R5 뮤테이션, 0 failed).
// 원인은 «다른 것이 막아 주고 있어서» 였다 — 저장 경로가 이미 걷어내거나, 하류 필터가
// 같은 일을 한 번 더 해서 상류가 틀려도 결과가 맞았다. 그래서 순수 계층은 **직접 부르는**
// 축을 따로 둔다. 조립을 거치면 «누가 실제로 그 일을 했는가» 가 흐려진다.
//
// ── ⚠ 이동(`G`)이 사라져 이 파일의 절반이 줄었다 (감독 지시 2026-08-13) ─────
// *"단축키 이동은 없애고"* → 카드로 **`G`(이동)만** 으로 좁혔다. 그런데 **축 고정
// (`X`/`Y`/`Z`)이 함께 죽었다** — 그것은 이동 전용이었다(회전은 `ry` 하나, 크기는 균등).
// 근거는 `decide/modal-edit.ts` 헤더 한 곳이다.
//
// 그래서 옛 판본의 「축 고정」·「지면 평면 이동」·「Y 축 부호」 절이 통째로 사라졌다.
// **죽은 축을 남기지 않는다** — 남기면 다음 사람이 그 기능이 있는 줄 안다.
//
// ── 여기서 못 재는 것 ───────────────────────────────────────────────────────
// **조작감**이다. 픽셀당 회전량이 손에 맞는지는 감독 화면에서만 갈린다(이 환경은
// swiftshader 헤드리스라 WebGPU 룩도 조작 지연도 원리적으로 못 잰다). 이 파일이 지키는
// 것은 «규칙이 규칙대로 계산되는가» 이지 «그 규칙이 좋은가» 가 아니다.

import { describe, it, expect } from 'vitest';
import {
  applyDelta, modalDelta, modalLabel, modalOpener, readModalKey, typedValue,
  ROT_PER_PX, SCALE_PER_PX, ZERO_DELTA,
  type ModalState, type Pose,
} from '../frontend/js/world2/decide/modal-edit.js';

const POSE: Pose = { x: 10, y: 2, z: -4, ry: 0.5, s: 1.5 };

function st(over: Partial<ModalState> = {}): ModalState {
  return { kind: 'rotate', digits: '', startX: 0, ...over };
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

describe('마우스 가로 이동량 → 델타', () => {
  it('회전은 가로 이동에 비례한다', () => {
    expect(modalDelta('rotate', '', 200).dry).toBeCloseTo(200 * ROT_PER_PX, 10);
  });

  it('★ 반대로 끌면 반대로 돈다', () => {
    expect(modalDelta('rotate', '', -200).dry).toBeCloseTo(-200 * ROT_PER_PX, 10);
  });

  it('크기는 1 을 기준으로 한 **배수**다 — 안 움직이면 1', () => {
    expect(modalDelta('scale', '', 0).ks).toBe(1);
    expect(modalDelta('scale', '', 500).ks).toBeCloseTo(1 + 500 * SCALE_PER_PX, 10);
  });

  it('★ 크기를 왼쪽으로 끝까지 끌어도 0 이하로 안 내려간다 — 뒤집힌 지오메트리 방지', () => {
    // `1 + dxPx * SCALE_PER_PX` 는 dxPx = -1000 에서 0 이 되고 그 아래는 음수다.
    // 음수 스케일은 면이 뒤집혀 건물 속이 보인다.
    expect(modalDelta('scale', '', -2000).ks).toBeGreaterThan(0);
    expect(modalDelta('scale', '', -1000).ks).toBeGreaterThan(0);
  });

  it('망가진 입력에도 유한한 값을 낸다', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(Number.isFinite(modalDelta('rotate', '', bad).dry), `회전 ${bad}`).toBe(true);
      expect(Number.isFinite(modalDelta('scale', '', bad).ks), `크기 ${bad}`).toBe(true);
      expect(modalDelta('scale', '', bad).ks).toBeGreaterThan(0);
    }
  });
});

describe('타이핑이 마우스를 이긴다 (블렌더가 하는 것)', () => {
  // 정확한 값을 넣으려는 사람이 손을 떨어도 값이 안 흔들려야 한다.
  it('★ 회전은 **도(°)로** 친다 — 라디안을 치는 사람은 없다', () => {
    expect(modalDelta('rotate', '90', 9999).dry).toBeCloseTo(Math.PI / 2, 10);
    expect(modalDelta('rotate', '-180', 0).dry).toBeCloseTo(-Math.PI, 10);
  });

  it('★ 크기는 **배수 그대로** 친다 — 2 = 두 배', () => {
    expect(modalDelta('scale', '2', 9999).ks).toBe(2);
  });

  it('★ 크기에 0 이나 음수를 치면 무시한다(1 로)', () => {
    expect(modalDelta('scale', '0', 0).ks).toBe(1);
    expect(modalDelta('scale', '-3', 0).ks).toBe(1);
  });
});

describe('시작 스냅샷 + 델타 = 지금 (취소가 성립하는 근거)', () => {
  it('★ ZERO_DELTA 는 항등원이다 — **취소가 이것 하나에 달려 있다**', () => {
    // 취소는 «델타를 0 으로 보고 스냅샷을 그대로 쓴다» 이다. 이 성질이 깨지면
    // Esc 를 눌러도 물건이 원래 값으로 안 돌아간다.
    expect(applyDelta(POSE, ZERO_DELTA)).toEqual(POSE);
  });

  it('회전은 더하고 **크기는 곱한다**', () => {
    // 곱셈인 것은 작은 물건과 큰 물건이 같은 손맛을 내야 하기 때문이다
    // (`decide/edit-pick.ts` 의 `scaleBy` 와 같은 근거).
    const p = applyDelta(POSE, { dry: 0.25, ks: 2 });
    expect(p).toEqual({ x: 10, y: 2, z: -4, ry: 0.75, s: 3 });
  });

  it('★ 위치는 **모달이 안 건드린다** — 이동 모달이 사라졌다', () => {
    // 그래도 `Pose` 에 x·y·z 를 남긴 이유는 취소가 **자세 전체**를 되돌리는 것이
    // 계약이기 때문이다(`decide/modal-edit.ts` 의 `Pose` 주석). 그것이 지켜지는지 본다.
    const p = applyDelta(POSE, { dry: 1, ks: 3 });
    expect([p.x, p.y, p.z], '★ 회전·크기 조작이 위치를 옮겼다').toEqual([POSE.x, POSE.y, POSE.z]);
  });

  it('★ 스냅샷은 안 바뀐다 — 매 프레임 이것에 다시 델타를 얹기 때문이다', () => {
    const from: Pose = { ...POSE };
    applyDelta(from, { dry: 5, ks: 5 });
    expect(from, '★ applyDelta 가 원본을 고쳤다 — 그러면 조작이 누적돼 취소가 불가능해진다')
      .toEqual(POSE);
  });

  it('★ 같은 델타를 두 번 적용해도 같은 결과다 — 누적이 아니다', () => {
    const d = { dry: 0.3, ks: 1.2 };
    expect(applyDelta(POSE, d)).toEqual(applyDelta(POSE, d));
  });
});

describe('키가 상태를 어떻게 옮기는가', () => {
  it('Escape 는 취소, Enter 는 확정', () => {
    expect(readModalKey(st(), 'Escape', 'Escape')).toEqual({ act: 'cancel' });
    expect(readModalKey(st(), 'Enter', 'Enter')).toEqual({ act: 'commit' });
    expect(readModalKey(st(), 'NumpadEnter', 'Enter')).toEqual({ act: 'commit' });
  });

  it('★ 축 키(X·Y·Z)는 **더 이상 안 받는다** — 이동과 함께 사라졌다', () => {
    // 회전은 `ry` 하나뿐이고 크기는 균등이라 고정할 축이 없다. 그리고 이 키들이
    // `null` 이 되면서 **모달 밖의 `Z`/`X`(높이)와 겹치던 것도 풀렸다** — 같은 키가
    // 상황에 따라 다르게 동작하던 형태다.
    expect(readModalKey(st(), 'KeyX', 'x')).toBeNull();
    expect(readModalKey(st(), 'KeyY', 'y')).toBeNull();
    expect(readModalKey(st(), 'KeyZ', 'z')).toBeNull();
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
    // 배열에 따라 `Minus`·`Period` 의 자리가 다르다. 찍힌 글자를 봐야 어느 자판에서도
    // 같게 동작한다.
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
  it('R·S 만 — 블렌더 표준에서 회전·크기', () => {
    expect(modalOpener('KeyR')).toBe('rotate');
    expect(modalOpener('KeyS')).toBe('scale');
  });

  it('★ `G` 는 **더 이상 안 연다** — 감독 지시로 이동 모달을 걷었다', () => {
    // 이 축이 이 회차의 요구 그 자체다. 되살아나면 「단축키 이동은 없애고」가 무효가 된다.
    expect(modalOpener('KeyG'), '★ G 가 다시 모달을 연다').toBeNull();
  });

  it('★ 그 외에는 안 연다 — 특히 주행 키 W·A·D', () => {
    // `S` 만 주행과 겹친다(뒤로). 나머지까지 열면 걷기가 통째로 죽는다.
    for (const c of ['KeyW', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyZ', 'KeyX', 'Space', 'Tab']) {
      expect(modalOpener(c), `★ ${c} 가 모달을 연다`).toBeNull();
    }
  });
});

describe('화면이 지금 무엇을 하는지 말한다', () => {
  // 모달은 **보이는 핸들이 없다.** 기즈모는 잡은 축이 색으로 보이지만 모달은 아무것도
  // 안 보이므로, 이 한 줄이 «무엇이 시작됐는지» 의 유일한 표지다.
  it('타이핑 중에는 친 것을 그대로 보여준다 — 단위와 함께', () => {
    expect(modalLabel(st({ digits: '90' }), ZERO_DELTA)).toContain('90°');
    expect(modalLabel(st({ kind: 'scale', digits: '2' }), ZERO_DELTA)).toContain('2배');
  });

  it('마우스로 밀 때는 지금 값이 보인다', () => {
    expect(modalLabel(st(), { ...ZERO_DELTA, dry: Math.PI / 2 })).toContain('90.0°');
    expect(modalLabel(st({ kind: 'scale' }), { ...ZERO_DELTA, ks: 2 })).toContain('2.000');
  });

  it('★ 무엇을 하는 중인지 이름이 나온다 — 회전과 크기가 구별된다', () => {
    expect(modalLabel(st(), ZERO_DELTA)).toContain('회전');
    expect(modalLabel(st({ kind: 'scale' }), ZERO_DELTA)).toContain('크기');
  });
});
