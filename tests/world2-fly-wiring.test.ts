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

  it('★ WASD·Space·Ctrl 가 상태로 들어온다', () => {
    key('keydown', 'KeyW');
    key('keydown', 'Space');
    expect(handle.current().forward).toBe(true);
    expect(handle.current().up).toBe(true);
    key('keyup', 'KeyW');
    expect(handle.current().forward).toBe(false);
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
  });

  it('★ `edit/types.ts` 의 `fly` 문이 **선택 사양**이다 — 궤도와 같은 규약', async () => {
    const src = await read('frontend/js/world2/edit/types.ts');
    expect(src, '★ fly 문이 필수가 되면 빌더 미리보기 같은 소비자가 깨진다')
      .toMatch(/fly\?\(/);
  });
});
