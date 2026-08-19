// @vitest-environment jsdom
//
// **비행 편집의 배선 축** — 「판정은 도는데 아무도 안 부른다」를 막는다.
//
// ── 왜 이 파일이 따로 있나 ──────────────────────────────────────────────────
// `world2-fly.test.ts` 는 `decide/fly.ts` 의 **순수 판정**을 잰다 — 그 파일은 검사 19건을
// 갖고도 **제품 소비자가 0** 이었다(`G-FLY1`). 부품이 동작하는 것과 조립이 그 부품을
// 무는 것은 다른 일이고, 이 저장소는 그 차이로 이미 두 번 데였다(태스크 #109 ·
// W8-11 의 `onLost` 미배선).
//
// 그래서 여기서는 **사슬을 행위로 잰다**: 키 → `FlyInput` → `host.fly` → `flyBy` → 좌표.
//
// ── 이 파일이 **못** 재는 것 ────────────────────────────────────────────────
// · **화면** — 실제로 날아 보이는지, 안개 상한이 손에 맞는지(`G-FLY2`, 감독 판정)
// · **rAF 타이밍** — jsdom 의 `requestAnimationFrame` 은 실제 프레임이 아니다. 루프가
//   「돈다」는 것만 보고 프레임 간격은 못 잰다
// · **WebGPU 실기기** — 원리적 사각

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlayerSystem } from '../frontend/js/world2/systems/player.js';
import { createFlyInput } from '../frontend/js/world2/edit/fly-input.js';
import { flyLiftMeters, FLY_UP_CELLS, NO_FLY, type FlyInput } from '../frontend/js/world2/decide/fly.js';
import { LIFT_MAX } from '../frontend/js/world2/decide/move.js';

const held = (over: Partial<FlyInput>): FlyInput => ({ ...NO_FLY, ...over });
/** 눈높이를 읽는 유일한 문 — `applyCamera` 가 내는 y */
function makePlayer(opts: Record<string, unknown> = {}) {
  let eyeY = 0;
  let px = 0;
  let pz = 0;
  const p = new PlayerSystem({
    start: { x: 0, z: 0 },
    applyCamera: (x, y, z) => { px = x; eyeY = y; pz = z; },
    ...opts,
  } as ConstructorParameters<typeof PlayerSystem>[0]);
  return { p, eyeY: () => eyeY, pos: () => ({ x: px, z: pz }) };
}

describe('★ flyBy 가 실제로 민다 — 좌표와 고도', () => {
  it('🔴 앞으로 누르면 **시선 방향으로** 간다 (yaw=0 → -z)', () => {
    const { p, pos } = makePlayer();
    p.update({ dt: 0.016, t: 0 } as never);
    const a = pos();
    p.flyBy(held({ forward: true }), 1, 100);
    p.update({ dt: 0.016, t: 0.016 } as never);
    const b = pos();
    // `facing(0) = (0, -1)` — 걷기와 같은 규약이다(`decide/move.ts`).
    expect(b.z, '🔴 앞으로 눌렀는데 -z 로 안 갔다').toBeLessThan(a.z);
    expect(Math.abs(b.x - a.x), '🔴 yaw=0 인데 x 가 움직였다').toBeLessThan(1e-6);
  });

  it('🔴 옆으로 누르면 **수평으로** 간다 — 스트레이프는 피치를 안 섞는다', () => {
    const { p, pos } = makePlayer();
    p.update({ dt: 0.016, t: 0 } as never);
    const a = pos();
    p.flyBy(held({ right: true }), 1, 100);
    p.update({ dt: 0.016, t: 0.016 } as never);
    expect(pos().x, '🔴 오른쪽으로 눌렀는데 +x 로 안 갔다').toBeGreaterThan(a.x);
  });

  it('🔴 위로 누르면 **고도가 오른다** — 배선이 끊기면 0 이다', () => {
    const { p, eyeY } = makePlayer();
    const before = (p.update({ dt: 0.016, t: 0 } as never), eyeY());
    p.flyBy(held({ up: true }), 1, 100);
    p.update({ dt: 0.016, t: 0.016 } as never);
    expect(eyeY(), '🔴 위로 눌렀는데 눈높이가 그대로다 — flyLift 가 소비되지 않는다')
      .toBeGreaterThan(before);
  });

  it('🔴 상한을 넘지 않는다 — `clampFlyLift` 가 실제로 걸린다', () => {
    const { p, eyeY } = makePlayer();
    const cap = 12;
    for (let i = 0; i < 200; i++) p.flyBy(held({ up: true }), 0.1, cap);
    p.update({ dt: 0.016, t: 1 } as never);
    // 눈높이 = eyeHeight + flyLift 이므로 상한 + 눈높이를 넘으면 안 된다.
    expect(eyeY(), '🔴 상한을 넘어 올라갔다').toBeLessThanOrEqual(cap + 3);
  });

  it('🔴 지면 아래로 안 내려간다 — 하한 0', () => {
    const { p, eyeY } = makePlayer();
    const base = (p.update({ dt: 0.016, t: 0 } as never), eyeY());
    for (let i = 0; i < 50; i++) p.flyBy(held({ down: true }), 0.1, 100);
    p.update({ dt: 0.016, t: 1 } as never);
    expect(eyeY(), '🔴 고도가 음수로 내려갔다').toBeCloseTo(base, 5);
  });
});

describe('🔴 궤도와 **칸이 다르다** — 이것이 이 배선의 핵심 판정', () => {
  it('🔴 비행으로 올라간 뒤 궤도를 돌려도 `LIFT_MAX` 로 안 잘린다', () => {
    const { p, eyeY } = makePlayer();
    const cap = LIFT_MAX * 3;                       // 궤도 상한의 세 배까지 난다
    for (let i = 0; i < 400; i++) p.flyBy(held({ up: true }), 0.1, cap);
    p.update({ dt: 0.016, t: 1 } as never);
    const high = eyeY();
    expect(high, '전제: 궤도 상한보다 높이 떠 있어야 한다').toBeGreaterThan(LIFT_MAX);

    // 궤도를 한 번 돌린다 — 같은 칸을 쓰면 여기서 40m 로 잘려 **툭 떨어진다**.
    p.orbit(0, 0, 0, 0.1, 0, 1);
    p.update({ dt: 0.016, t: 2 } as never);
    // ⚠ **`> LIFT_MAX` 로는 못 잡는다.** 칸을 공유하면 궤도가 40 으로 자르는데, 눈높이는
    // `eye + 40 = 41.7` 이라 그 단언을 **통과한다**(뮤테이션 실측 0 failed). 잘렸는지를
    // 보려면 **날았던 높이와 같은가**를 물어야 한다 — 궤도는 고도를 안 건드리는 조작이다.
    expect(eyeY(), '🔴 궤도가 비행 고도를 바꿨다 — lift 칸을 공유하고 있다')
      .toBeCloseTo(high, 5);
  });

  it('★ `endOrbit()` 이 비행 고도도 걷는다 — 편집을 끄면 주행 모델로', () => {
    const { p, eyeY } = makePlayer();
    p.update({ dt: 0.016, t: 0 } as never);
    const ground = eyeY();
    for (let i = 0; i < 100; i++) p.flyBy(held({ up: true }), 0.1, 200);
    p.endOrbit();
    p.update({ dt: 0.016, t: 1 } as never);
    expect(eyeY(), '★ 편집을 껐는데 공중에 떠 있다').toBeCloseTo(ground, 5);
  });

  it('🔴 비행이 `orbitFrom` 을 세운다 — 걸어서 복원이 비행에도 걸린다', () => {
    let resolveCalls = 0;
    const { p } = makePlayer({
      resolveMove: (x: number, z: number, dx: number, dz: number) => {
        resolveCalls++;
        return { x: x + dx, z: z + dz };
      },
    });
    p.flyBy(held({ forward: true }), 1, 100);
    resolveCalls = 0;
    p.endOrbit();
    expect(resolveCalls, '🔴 비행 뒤 endOrbit 이 복원을 안 걸었다 — orbitFrom 이 안 섰다')
      .toBeGreaterThan(0);
  });
});

describe('🔴 기존 배선과 **겹치지 않는다** — 검수관 반려 B1·B2', () => {
  // ── 이 축이 왜 따로 있나 ──────────────────────────────────────────────────
  // 이 파일의 다른 검사는 전부 **「배선이 있는가」**를 잰다. 검수관이 반려한 두 결함은
  // **「배선이 기존 배선과 겹치는가」**에서 났고, 그 축은 여기 하나도 없었다
  // (전체 스위트 4059건 중 0 failed). 방어의 종류가 하나뿐이면 그 종류 밖은 전부 사각이다.

  it('🔴 **변위 0 인 비행 프레임은 `orbitFrom` 을 안 세운다** (B1)', () => {
    // `Shift` 는 비행 키이면서 주행의 달리기 키다. 편집 중 달리기만 해도 루프가 깨어나
    // `flyBy` 에 들어오는데, 그때 복원 출발점이 서면 **편집을 끌 때 걸어온 길을 되짚는다**.
    // 검수관 실측: 벽을 우회해 40m 걸은 뒤 편집을 끄면 32m 뒤로 튀었다.
    let resolveCalls = 0;
    const { p } = makePlayer({
      resolveMove: (x: number, z: number, dx: number, dz: number) => {
        resolveCalls++;
        return { x: x + dx, z: z + dz };
      },
    });
    // `fast` 만 — `flyDelta` 가 `NO_DELTA` 를 낸다(방향 입력이 하나도 없다).
    p.flyBy(held({ fast: true }), 0.016, 100);
    resolveCalls = 0;
    p.endOrbit();
    expect(resolveCalls, '🔴 안 날았는데 복원 걸음이 켜졌다 — Shift 만 눌러도 자리가 튄다')
      .toBe(0);
  });

  it('★ 실제로 난 프레임은 여전히 `orbitFrom` 을 세운다 — 등가 대조군', () => {
    // 위 수정이 「아무것도 안 세운다」로 과하게 가지 않았는지 본다.
    let resolveCalls = 0;
    const { p } = makePlayer({
      resolveMove: (x: number, z: number, dx: number, dz: number) => {
        resolveCalls++;
        return { x: x + dx, z: z + dz };
      },
    });
    p.flyBy(held({ forward: true }), 0.016, 100);
    resolveCalls = 0;
    p.endOrbit();
    expect(resolveCalls, '★ 실제로 날았는데 복원이 안 걸린다').toBeGreaterThan(0);
  });

  it('🔴 **같은 프레임에 걷기와 비행이 겹치지 않는다** (B2)', () => {
    // 주행 키 리스너는 `main.ts` 가 부팅부터 들고 있고 편집이 켜져도 안 뗀다. 비행이 같은
    // WASD 를 쓰므로 keydown 하나가 둘을 함께 켠다 — 검수관 실측 수평 **4배**(20 m/s).
    const a = makePlayer();
    a.p.update({ dt: 0.016, t: 0 } as never);
    const a0 = a.pos();
    a.p.flyBy(held({ forward: true }), 0.1, 100);
    a.p.update({ dt: 0.1, t: 0.1 } as never);
    const flyOnly = Math.hypot(a.pos().x - a0.x, a.pos().z - a0.z);

    const b = makePlayer();
    b.p.update({ dt: 0.016, t: 0 } as never);
    const b0 = b.pos();
    b.p.setInput({ forward: true });        // ← 주행도 함께 눌린 상태
    b.p.flyBy(held({ forward: true }), 0.1, 100);
    b.p.update({ dt: 0.1, t: 0.1 } as never);
    const both = Math.hypot(b.pos().x - b0.x, b.pos().z - b0.z);

    expect(both, '🔴 주행이 겹쳐 더 멀리 갔다 — 비행 속도 유도가 무너지고 벽에도 막힌다')
      .toBeCloseTo(flyOnly, 5);
  });

  it('🔴 **공중에서 헤드밥이 돌지 않는다** — 걷는 신호는 걸을 때만', () => {
    // 겹침의 부수 효과. 주행 입력이 살아 있으면 `ratio ≈ 1` 이 되어 최대 강도로 흔들린다 —
    // 이 저장소가 *"헤드밥이 없으면 활강하는 느낌"* 이라 판정한 축의 정반대 인공물이다.
    const { p, eyeY } = makePlayer();
    p.setInput({ forward: true });
    const ys: number[] = [];
    for (let i = 0; i < 30; i++) {
      p.flyBy(held({ up: true }), 0.05, 100);
      p.update({ dt: 0.05, t: i * 0.05 } as never);
      ys.push(eyeY());
    }
    // 헤드밥이 돌면 상승 곡선에 **진동**이 얹힌다. 순증만 있으면 단조증가다.
    const dips = ys.filter((y, i) => i > 0 && y < ys[i - 1]!).length;
    expect(dips, '🔴 올라가는 중에 눈높이가 내려간 프레임이 있다 — 헤드밥이 돈다').toBe(0);
  });
});

describe('★ 키 → 입력 — `createFlyInput`', () => {
  let editing = true;
  let calls: Array<{ input: FlyInput; dt: number }> = [];
  let handle: ReturnType<typeof createFlyInput>;

  beforeEach(() => {
    editing = true;
    calls = [];
    handle = createFlyInput({
      doc: document,
      fly: (input, dt) => { calls.push({ input, dt }); },
      editing: () => editing,
    });
    handle.bind();
  });

  // ⚠ **앞 케이스가 깨운 루프를 끈다.** 안 끄면 다음 케이스의 「유휴」가 유휴가 아니다 —
  // 실제로 이 줄이 없어서 아래 rAF 검사가 처음에 빨간불이었다. 리스너를 다는 검사에서
  // 뒷정리를 빠뜨리면 **검사끼리 상태가 샌다.**
  afterEach(() => { handle.unbind(); });

  const key = (type: 'keydown' | 'keyup', code: string, target?: EventTarget) => {
    const ev = new KeyboardEvent(type, { code, bubbles: true, cancelable: true });
    (target ?? document).dispatchEvent(ev);
    return ev;
  };

  it('★ WASD 가 상태로 들어온다 (수직 둘은 아래에서 **각각** 잰다)', () => {
    key('keydown', 'KeyW');
    key('keydown', 'KeyA');
    expect(handle.current().forward).toBe(true);
    expect(handle.current().left).toBe(true);
    key('keyup', 'KeyW');
    expect(handle.current().forward).toBe(false);
  });

  it('🔴 `Ctrl`·`Shift` 는 **어떤 비행 동작도 안 한다** — 둘 다 하강이었다가 물러났다', () => {
    // 검수관 반려 B2·B4. `Ctrl` 은 `Ctrl+W`(탭 닫기), `Shift` 는 편집의 팬·와이어·달리기와
    // 삼중 충돌이었다. 지금은 둘 다 비행 키가 아니다.
    for (const c of ['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight']) {
      key('keydown', c);
    }
    expect(handle.current(), '🔴 수식키가 아직 비행 키다').toEqual(NO_FLY);
  });

  it('🔴 편집이 꺼져 있으면 키를 안 받는다 — 주행에서 날면 안 된다', () => {
    editing = false;
    key('keydown', 'KeyW');
    expect(handle.current(), '🔴 주행 중에 비행 키가 먹었다').toEqual(NO_FLY);
  });

  it('🔴 입력칸에서는 안 먹는다 — 수치칸에 `w` 를 치면 날아가면 안 된다', () => {
    const inp = document.createElement('input');
    document.body.appendChild(inp);
    key('keydown', 'KeyW', inp);
    expect(handle.current().forward, '🔴 수치칸 타이핑이 비행으로 샜다').toBe(false);
    inp.remove();
  });

  it('🔴 창을 벗어나면 전부 놓는다 — 알트탭 한 번에 세계 밖으로 가지 않는다', () => {
    key('keydown', 'KeyW');
    key('keydown', 'Space');
    window.dispatchEvent(new Event('blur'));
    expect(handle.current(), '🔴 키가 눌린 채로 남았다').toEqual(NO_FLY);
  });

  it('★ `unbind()` 뒤에는 키가 안 들어온다', () => {
    handle.unbind();
    key('keydown', 'KeyW');
    expect(handle.current()).toEqual(NO_FLY);
  });

  it('🔴 **키를 안 누르면 프레임을 안 잡는다** — 편집 중이라고 늘 돌지 않는다', async () => {
    // 첫 판본은 `bind()` 부터 계속 돌았고 **기존 검사가 그것을 잡았다**
    // (`world2-gizmo.test.ts` 의 «붙을 것이 없으면 프레임을 안 잡는다» — 전역 rAF 호출
    // 수가 13 → 16 으로 밀렸다). 그것은 기즈모 축이 우연히 걸러 준 것이라 **비행 자신의
    // 축**으로 다시 못 박는다. 안 그러면 그 검사를 고치는 날 이 규율이 조용히 사라진다.
    const raw = window.requestAnimationFrame;
    let asked = 0;
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      asked++;
      return raw.call(window, cb);
    }) as typeof window.requestAnimationFrame;
    try {
      const settle = () => new Promise((r) => setTimeout(r, 40));
      await settle();
      const idle = asked;
      await settle();
      expect(asked, '🔴 아무 키도 안 눌렸는데 프레임을 잡고 있다').toBe(idle);

      key('keydown', 'KeyW');
      await settle();
      expect(asked, '🔴 키를 눌렀는데 프레임을 안 잡는다 — 날 수가 없다')
        .toBeGreaterThan(idle);

      key('keyup', 'KeyW');
      await settle();
      const stopped = asked;
      await settle();
      expect(asked, '🔴 키를 뗐는데 루프가 계속 돈다').toBe(stopped);
    } finally {
      window.requestAnimationFrame = raw;
    }
  });

  it('★ `Space` 는 기본 동작을 막는다 — 안 막으면 날면서 화면이 튄다', () => {
    const ev = key('keydown', 'Space');
    expect(ev.defaultPrevented, '★ Space 스크롤을 안 막았다').toBe(true);
  });
});

describe('🔴 조립이 부품을 무는가 — 소스를 문자열로 잰다', () => {
  // ── 왜 문자열인가 ─────────────────────────────────────────────────────────
  // 뮤테이션 실측: `mode.ts` 의 `fly.bind()` 를 지워도, `overlay.ts` 의 `fly` 위임을
  // 통째로 지워도 **추가 실패 0** 이었다. 위 행위 검사들이 `PlayerSystem` 과
  // `createFlyInput` 을 **직접** 부르기 때문이다 — 부품은 도는데 조립을 아무도 안 본다.
  //
  // W8-11 이 같은 형태로 반려를 받았고(`onLost` 미배선), 그때는 **타입 필수화**가 답이었다.
  // 여기서는 그 처방을 못 쓴다: `host.fly?` 는 **선택 사양이어야** 하기 때문이다(궤도가
  // 세운 규약 — 빌더 미리보기처럼 비행을 안 여는 소비자가 있다). 선택 인자는 타입이
  // 「안 넘겼다」를 잡지 못한다.
  //
  // 그래서 차선을 쓴다. **이 검사의 한계를 먼저 적는다:**
  // · 소스에 그 문자열이 있는지만 본다 — **불리는지는 못 본다**(주석 처리하면 잡지만,
  //   조건문 안에 넣어 죽여 두면 통과한다)
  // · 🔴 **그리고 「살아 있는 호출에 틀린 인자」도 못 본다**(검수관 반려, 명세 G4). 첫 판본의
  //   한계 목록은 「죽은 코드」까지만 적었는데, 검수관이 실측한 두 형태는 죽은 코드가 아니다:
  //     M8  `mode.ts` 의 `editing: () => st.editing` → `() => false`
  //     M9  `overlay.ts` 의 `flyBy(input, dt, …)`   → `flyBy(input, 0, …)`
  //   둘 다 **기능이 완전히 죽는데** 문자열은 그대로다. M8 은 이제
  //   `world2-edit-listeners.test.ts` 의 **행위 축**(편집을 실제로 켜고 키를 누른다)이 잡는다.
  //   M9 은 아래에서 **인자 이름까지** 보는 것으로 잡는다.
  //
  //   🔴 **그 한계를 내가 반대로 적었다**(검수관 조건 C2 — 실측으로 뒤집혔다):
  //     M9b `const step = dt * 0;` 로 **이름을 바꾸면**  → **잡힌다**(정규식이 `dt` 를 요구한다)
  //     M9c 이름은 `dt` 그대로 두고 `dt = 0;` **재대입**  → **0 검출 · 이것이 진짜 사각이다**
  //   처음에 *"다른 이름의 0 짜리 변수로 바꾸면 통과한다"* 라고 적었는데 **정확히 반대**였다.
  //   사각의 존재는 맞게 인정했으나 **위치를 반대로 지목**했고, 그러면 다음 사람이 안전한
  //   쪽을 위험으로, 위험한 쪽을 안전으로 읽는다 — 이 저장소가 「게이트 유효성에 대한 거짓
  //   진술」이라 이름 붙인 형태다.
  //
  //   **완전한 방어는 제품 `OverlayHost` 를 태우는 검사**이고 아직 없다(`G-FLY5`).
  //   ⚠ 이 한계 진술은 **여기 한 곳**이다 — 백로그는 이 줄을 가리키기만 한다(같은 문장을
  //   두 곳에 두는 것이 값 미러링이고, 첫 판본이 실제로 그래서 둘 다 틀렸다).
  // · 이름을 바꾸는 정상적인 리팩터에서 **거짓 FAIL** 이 난다. 그때 할 일은 **단언을
  //   지우는 것이 아니라** 새 이름으로 고치는 것이다
  const read = async (rel: string): Promise<string> => {
    const { readFileSync } = await import('node:fs');
    return readFileSync(rel, 'utf8');
  };

  it('🔴 `edit/mode.ts` 가 비행 입력을 **조립하고 bind/unbind 한다**', async () => {
    const src = await read('frontend/js/world2/edit/mode.ts');
    expect(src, '🔴 비행 입력을 아예 안 만든다').toContain('createFlyInput(');
    expect(src, '🔴 편집을 켤 때 bind 를 안 한다 — 키가 죽는다').toContain('fly.bind()');
    expect(src, '🔴 unbind 가 없다 — 편집을 꺼도 주행에서 날아간다').toContain('fly.unbind()');
    // 켜기 1 · 끄기 1 · dispose 1 = **최소 2회의 unbind** 가 있어야 한다(모드 전환 + 종료).
    const unbinds = src.split('fly.unbind()').length - 1;
    expect(unbinds, '🔴 unbind 자리가 모자라다 — 세션 종료 경로가 비었을 수 있다')
      .toBeGreaterThanOrEqual(2);
  });

  it('🔴 `features/overlay.ts` 가 `fly` 문을 **실제로 연다**', async () => {
    const src = await read('frontend/js/world2/features/overlay.ts');
    expect(src, '🔴 host.fly 위임이 없다 — 편집이 키를 눌러도 닿을 곳이 없다')
      .toMatch(/fly:\s*\(/);
    expect(src, '🔴 flyBy 를 안 부른다').toContain('flyBy(');
    // 🔴 **셀→미터 변환을 건너뛰면 2.4m 짜리 천장**이 된다(`flyLiftMeters` 주석).
    // 그 실수는 아무 검사도 안 깨뜨리므로 여기서 이름으로 못 박는다.
    expect(src, '🔴 셀을 미터 자리에 그대로 넘기고 있다 — 2.4m 천장이 된다')
      .toContain('flyLiftMeters(');
    // 🔴 **`dt` 를 그대로 넘기는가**(검수관 실측 M9 — `flyBy(input, 0, …)` 는 기능을 완전히
    // 죽이는데 위 세 단언을 전부 통과했다). 위 한계 주석대로 **이 형태만** 잡는다.
    expect(src, '🔴 flyBy 에 dt 를 안 넘긴다 — 불려도 한 발짝도 안 간다')
      .toMatch(/flyBy\(\s*\w+\s*,\s*dt\s*,/);
  });

  it('🔴 `edit/mode.ts` 가 **모달 중에는 안 날게** 한다', async () => {
    // 검수관 반려 B1-②. `input.ts` 의 `stopPropagation()` 은 `window`(주행 리스너)만 막고
    // **같은 `doc` 노드의 `fly-input` 은 못 막는다**(그건 `stopImmediatePropagation` 이다).
    // 그래서 크기·회전 모달이 열린 채로 WASD 가 그대로 날았다 — 조작하던 대상이 화면에서
    // 달아난다.
    //
    // ⚠ **정적 검사다.** 행위로 재려면 편집 세션에서 무언가를 «골라» 모달을 열어야 하는데,
    // 그 픽 경로는 3D 히트 픽스처를 요구해 하네스가 커진다. 시도했다가 픽이 성립하지 않아
    // 되돌렸고 — **그 사실을 적어 둔다**(못 잰 것을 통과로 적지 않는다). 이 검사가 잡는 것은
    // 「조건이 소스에 있는가」뿐이고, 조건이 **동작하는가**는 안 본다. `G-FLY11`.
    const src = await read('frontend/js/world2/edit/mode.ts');
    expect(src, '🔴 모달 중에도 난다 — 조작 대상이 화면에서 달아난다')
      .toMatch(/editing:\s*\(\)\s*=>\s*st\.editing\s*&&\s*st\.modal\s*===\s*null/);
  });

  it('★ `edit/types.ts` 의 `fly` 문이 **선택 사양**이다 — 궤도와 같은 규약', async () => {
    const src = await read('frontend/js/world2/edit/types.ts');
    expect(src, '★ fly 문이 필수가 되면 빌더 미리보기 같은 소비자가 깨진다')
      .toMatch(/fly\?\(/);
  });
});

describe('🔴 키 배치가 바뀌면 **안내 문구를 함께 보게 한다** — 트립와이어 (검수관 명세 GS-F2)', () => {
  // ── 왜 스냅샷 동결인가 ────────────────────────────────────────────────────
  // 안내 문구와 키 배치가 어긋나는 사고가 **두 번** 났다(2026-08-12 시점 조작 · 2026-08-19
  // 비행). 두 번 다 「키가 바뀐 회차」였고 두 번 다 문구는 안 따라왔다 — 즉 「다음에
  // 바뀌면 함께 본다」는 **사람의 기억에 걸린 조건**이고, 기억 못 해서 난 사고를 그 자리에
  // 다시 놓는 것이다(검수관 지적).
  //
  // 문자열과 상수를 **대조하지 않는다** — 그러면 값 미러링이 된다. 대신 **키 집합만 동결**해
  // 배치가 바뀌는 순간 빨간불을 낸다. 미러링 0이고, 트립와이어라 거짓 FAIL 이 곧 목적이다.
  //
  // ⚠ **이 검사가 못 보는 것**: 문구가 **무엇을 말하는지**. 키를 안 바꾸고 문구만 틀리게
  // 고치는 것 · 상시 범례(`panel/dom.ts`) · 모바일 부재 · 화면 배치 ·
  // 🔴 **다른 파일이 `FLY_KEYS` 를 인용한 문장이 낡는 것**(검수관 권고 P11 — 실제로
  // `systems/player.ts` 의 주석이 «`Shift` 는 비행 키이면서 달리기 키다» 를 적고 있다가
  // 키 교체로 거짓이 됐다, 반려 B5).

  it('🔴 `FLY_KEYS` 의 키 집합이 동결과 다르면 — **`edit/mode.ts` 의 안내 문구를 함께 고쳐라**', async () => {
    const src = await (async () => {
      const { readFileSync } = await import('node:fs');
      return readFileSync('frontend/js/world2/edit/fly-input.ts', 'utf8');
    })();
    const m = src.match(/const FLY_KEYS[^=]*=\s*\{([\s\S]*?)\n\};/);
    expect(m, '★ FLY_KEYS 선언을 못 찾았다').not.toBeNull();
    // ⚠ **주석을 먼저 걷어낸다.** 이 블록은 왜 이 키인지를 길게 적고 있고, 그 산문에도
    // `Ctrl`·`KeyZ` 같은 말이 나온다 — 안 걷으면 설명을 배치로 읽는다.
    // 그리고 한 줄에 여러 키가 있으므로 **줄 시작만 보면 안 된다**(첫 판본이 `^` 를 써서
    // 7개 중 2개만 뽑았고, 그래서 이 검사가 처음에 거짓 빨간불이었다).
    const body = m![1].replace(/\/\/[^\n]*/g, '');
    // 🔴 **코드만 뽑으면 매핑 스왑을 못 잡는다**(검수관 반려 B6 — 실측: `Space:'down'`·
    // `KeyC:'up'` 으로 위아래를 뒤집었는데 **25/25 통과**했다). 「Space 위 · C 아래」를
    // 보증하는 단언이 한 건도 없었는데 「못 보는 것」 목록에도 그 항목이 없었다.
    // **코드:값 쌍**을 동결한다.
    // 🔴 **따옴표를 붙여도 뽑는다**(검수관 조건 1 — 실측으로 뚫렸다). 첫 판본은
    // `(\w+)\s*:` 라 `'AltLeft': 'down'` 을 **추가**하면 쌍이 안 뽑혀 배열이 안 변하고,
    // GS-F2·GS-F3 이 **동시에 통과**했다(MX-1: 0 failed). 지난 회차 B6 과 같은 형태다 —
    // 그때는 값을 안 봤고 이번엔 **표기형**을 안 봤다.
    const pairs = [...body.matchAll(/['"]?(\w+)['"]?\s*:\s*'(\w+)'/g)]
      .map((x) => `${x[1]}=${x[2]}`).sort();
    expect(pairs, [
      '🔴 비행 키 배치가 바뀌었다.',
      '   → `edit/mode.ts` 의 `sayLead` 안내 문구를 **함께** 고치고,',
      '     `panel/dom.ts` 의 상시 키 범례도 본 뒤 이 목록을 갱신하라.',
      '   (단언을 지우지 마라 — 이 검사는 그 두 곳을 보게 하려고 일부러 깨진다.)',
    ].join('\n')).toEqual([
      'KeyA=left', 'KeyC=down', 'KeyD=right', 'KeyS=back', 'KeyW=forward', 'Space=up',
    ]);
  });

  it('🔴 **수식키를 비행 키로 쓰지 않는다** — 검수관 명세 GS-F3', async () => {
    // 하강 키가 **두 번** 틀렸고 두 번 다 수식키였다(`Ctrl` → 브라우저 예약,
    // `Shift` → 편집의 팬·와이어·달리기와 삼중 충돌). 코드표 grep 으로는 안 나오는
    // 형태라 — `ev.shiftKey` 는 키 이름이 아니라 **이벤트 속성**이다 — 검사로 못 박는다.
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('frontend/js/world2/edit/fly-input.ts', 'utf8');
    const m = src.match(/const FLY_KEYS[^=]*=\s*\{([\s\S]*?)\n\};/);
    const body = m![1].replace(/\/\/[^\n]*/g, '');
    // 따옴표 유무와 무관하게 뽑는다 — 근거는 위 트립와이어 주석 한 곳이다.
    const codes = [...body.matchAll(/['"]?(\w+)['"]?\s*:\s*'/g)].map((x) => x[1]);
    const mods = codes.filter((c) => /^(Shift|Control|Alt|Meta|OS)/.test(c));
    expect(mods, [
      '🔴 수식키를 비행 키로 넣었다.',
      '   `edit/input.ts` 가 `ev.shiftKey`(팬 · 와이어)·`ev.altKey`(궤도)를 쓰고,',
      '   `Ctrl`/`Meta` 는 브라우저 예약 조합을 만든다(`Ctrl+W` = 탭 닫기).',
      '   → 수식키가 아닌 단독 코드를 쓰거나, 겹치는 쪽을 먼저 정리하라.',
    ].join('\n')).toEqual([]);
  });

  it('🔴 위/아래가 **각각** 맞다 — 두 키를 함께 누르면 구별이 안 된다', () => {
    // 검수관 반려 B6 의 두 번째 축: 기존 검사가 `Space` 와 하강 키를 **둘 다 누른 뒤**
    // `up`·`down` 을 봐서, 어느 키가 어느 쪽인지 구조적으로 구별할 수 없었다.
    const h = createFlyInput({ doc: document, fly: () => {}, editing: () => true });
    h.bind();
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }));
      expect(h.current().up, '🔴 Space 가 상승이 아니다').toBe(true);
      expect(h.current().down, '🔴 Space 가 하강까지 켰다').toBe(false);
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }));

      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', bubbles: true }));
      expect(h.current().down, '🔴 C 가 하강이 아니다').toBe(true);
      expect(h.current().up, '🔴 C 가 상승까지 켰다').toBe(false);
    } finally {
      h.unbind();
    }
  });

  it('🔴 **`keyup` 은 수식키를 거르지 않는다** — 거르면 키가 고착한다 (검수관 명세 GS-F4)', () => {
    // 🔴 `onDown` 에만 가드가 있는 것이 **의도**인데, 그것을 지키는 검사가 0 이었다
    // (검수관 실측 MX-4: `onUp` 에 같은 가드를 넣어도 **0 failed**).
    //
    // 왜 `onUp` 에는 없어야 하나: 편집 중 `W` 로 날다가 `Shift`+드래그(위아래 팬)를
    // 시작하고 `W` 를 놓으면 **keyup 의 `shiftKey` 가 true** 다. 거기서 걸러 버리면
    // `forward` 가 `held` 에 박혀 **손을 뗐는데 계속 날아간다.** `clampFlyLift` 는 고도만
    // 막고 x·z 는 안 막으므로 세계 밖으로 나간다.
    //
    // 누가 «왜 한쪽만?» 하고 대칭화하는 것은 지극히 자연스러운 리팩터다 — 그래서 검사로 막는다.
    const h = createFlyInput({ doc: document, fly: () => {}, editing: () => true });
    h.bind();
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
      expect(h.current().forward, '전제: 눌렀으면 켜져야 한다').toBe(true);
      // 수식키를 누른 채로 뗀다 — 팬을 시작한 손이 정확히 이 모양이다.
      document.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'KeyW', bubbles: true, shiftKey: true,
      }));
      expect(h.current().forward, '🔴 수식키를 누른 채 뗐더니 키가 고착했다 — 계속 날아간다')
        .toBe(false);
    } finally {
      h.unbind();
    }
  });

  it('🔴 수식키를 누른 채로는 비행 키가 안 먹는다 — `Ctrl+C` 가 하강이 되면 안 된다', () => {
    const h = createFlyInput({ doc: document, fly: () => {}, editing: () => true });
    h.bind();
    try {
      for (const mod of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey'] as const) {
        document.dispatchEvent(new KeyboardEvent('keydown', {
          code: 'KeyC', bubbles: true, [mod]: true,
        }));
        expect(h.current(), `🔴 ${mod} 를 누른 채인데 비행 키가 먹었다`).toEqual(NO_FLY);
      }
    } finally {
      h.unbind();
    }
  });
});
