// world2 커널 — 프레임 게이팅·System 순서·계측 비상주 규약 테스트.
//
// 커널은 rAF와 now를 주입받도록 만들어서 브라우저 없이 프레임을 시뮬할 수 있다.
// 현행 world.js는 `step`의 게이팅 4개가 클로저 변수를 직접 읽어 이런 시험이 불가능했고,
// 그래서 "프레임 캡이 실제로 걸렸는가"를 세 번의 헛배포로 확인해야 했다(그때 쓴 fps 지표가
// 화면 rAF 틱 빈도라 캡이 걸려도 60을 유지했다 — 계측 대상 오인).

import { describe, it, expect } from 'vitest';
import { Kernel, type System, type FrameCtx, type KernelOptions } from '../frontend/js/world2/kernel.js';

function spySystem(name: string, log: string[]): System {
  return { name, update: (ctx: FrameCtx) => { log.push(`${name}@${ctx.frame}`); } };
}

/** rAF를 부르지 않는 커널 — tick을 직접 돌려 결정론적으로 시뮬한다 */
function makeKernel(opts: Partial<KernelOptions> = {}) {
  const log: string[] = [];
  const renders: number[] = [];
  const k = new Kernel({
    render: () => { renders.push(renders.length); },
    raf: () => 0,          // 자동 루프 없음
    now: () => 0,          // 측정 시간은 0으로 고정(게이팅만 시험)
    ...opts,
  });
  return { k, log, renders };
}

describe('System 순서 계약', () => {
  it('등록 순서가 실행 순서다', () => {
    const { k, log } = makeKernel();
    k.add(spySystem('a', log)).add(spySystem('b', log)).add(spySystem('c', log));
    expect(k.order).toEqual(['a', 'b', 'c']);
    k.tick(16);
    expect(log).toEqual(['a@1', 'b@1', 'c@1']);
  });

  it('렌더는 모든 System 뒤에 한 번 온다', () => {
    const log: string[] = [];
    const k = new Kernel({ render: () => log.push('render'), raf: () => 0, now: () => 0 });
    k.add({ name: 'x', update: () => log.push('x') });
    k.tick(16);
    expect(log).toEqual(['x', 'render']);
  });

  it('시작 후에는 System을 더 넣을 수 없다 — 순서 계약이 흔들리면 안 된다', () => {
    const { k, log } = makeKernel();
    k.start();
    expect(() => k.add(spySystem('late', log))).toThrow(/부팅 중에만/);
    k.stop();
  });
});

describe('프레임 게이팅 — 커널의 관심사', () => {
  it('캡이 없으면 매 tick 돈다', () => {
    const { k, renders } = makeKernel();
    for (let i = 1; i <= 5; i++) k.tick(i * 16);
    expect(renders.length).toBe(5);
  });

  // 첫 프레임은 캡과 무관하게 그린다. 이걸 게이팅으로 건너뛰면 로딩이 끝났는데도
  // 화면이 빈 채로 남는다 — 감독이 "로딩화면이 안나오던데"라고 지적한 계열의 문제다.
  it('첫 프레임은 캡을 무시하고 즉시 그린다', () => {
    const { k, renders } = makeKernel({ capFps: 30 });
    k.tick(1); // 예산 33.3ms에 한참 못 미치지만 통과해야 한다
    expect(renders.length).toBe(1);
  });

  it('캡이 있으면 예산이 찰 때까지 건너뛴다', () => {
    const { k, renders } = makeKernel({ capFps: 30 });
    k.tick(16);                    // 첫 프레임(무조건 통과) — 여기까지가 워밍업
    const base = renders.length;
    // 이후 30fps 캡 = 프레임당 33.3ms. 16ms 간격이면 두 tick마다 한 번 돌아야 한다.
    for (let i = 2; i <= 7; i++) k.tick(i * 16);
    expect(renders.length - base).toBe(2);
  });

  it('건너뛴 시간은 다음 프레임 dt에 합산된다 — 시뮬 시간이 유실되면 안 된다', () => {
    const dts: number[] = [];
    const k = new Kernel({
      capFps: 30, render: () => {}, raf: () => 0, now: () => 0,
    });
    k.add({ name: 'probe', update: (c) => dts.push(c.dt) });
    k.tick(16);             // 첫 프레임 소진
    k.tick(32); k.tick(48); // 16+16=32ms → 33.3ms 미달로 건너뜀
    k.tick(64);             // 누적 48ms → 통과
    expect(dts.length).toBe(2);
    expect(dts[1]).toBeCloseTo(0.048, 3);
  });

  it('markDirty는 게이팅을 한 번 뚫는다(비동기 텍스처 도착 등)', () => {
    const { k, renders } = makeKernel({ capFps: 30 });
    k.tick(16);                          // 첫 프레임 소진(무조건 통과분)
    k.tick(20);                          // 예산 미달 → 건너뜀
    expect(renders.length).toBe(1);
    k.markDirty();
    k.tick(24);                          // 여전히 예산 미달이지만 dirty라 통과
    expect(renders.length).toBe(2);
    k.tick(28);                          // dirty 소진 — 다시 게이팅
    expect(renders.length).toBe(2);
  });

  it('탭 복귀의 거대 dt를 클램프한다 — 물리가 순간이동하지 않게', () => {
    const dts: number[] = [];
    const k = new Kernel({ render: () => {}, raf: () => 0, now: () => 0 });
    k.add({ name: 'p', update: (c) => dts.push(c.dt) });
    k.tick(60_000); // 1분 정지 후 복귀
    expect(dts[0]).toBeLessThanOrEqual(0.1);
  });

  it('setFrameCap으로 집행한다 — 판정은 decide가, 집행은 커널이', () => {
    const { k, renders } = makeKernel();
    k.setFrameCap(30);
    expect(k.frameCap).toBe(30);
    for (let i = 1; i <= 4; i++) k.tick(i * 16);
    expect(renders.length).toBe(2);
    k.setFrameCap(0);
    expect(k.frameCap).toBe(0);
  });
});

describe('계측 비상주 규약', () => {
  it('probe 훅이 없으면 계측이 아예 돌지 않는다', () => {
    // 훅 미주입으로 정상 동작해야 한다. 현행은 계측이 프로덕션 코드에 상주하고
    // profSkip이 루프 제어 흐름에까지 개입했다 — 그 결합을 만들지 않는다.
    const { k, renders } = makeKernel();
    k.add({ name: 'x', update: (c) => { expect(c.probe).toBeUndefined(); } });
    k.tick(16);
    expect(renders.length).toBe(1);
  });

  it('훅을 주면 프레임 분해 4열을 낸다', () => {
    const seen: string[] = [];
    const k = new Kernel({
      render: () => {}, raf: () => 0, now: () => 0,
      probe: (name) => seen.push(name),
    });
    k.tick(16);
    expect(seen).toEqual(['frame_ms', 'upd_ms', 'render_ms', 'out_ms']);
  });

  it('out_ms는 우리 콜백 밖에서 사라진 시간이다 — 음수로 새지 않는다', () => {
    const vals: Record<string, number> = {};
    let clock = 0;
    const k = new Kernel({
      render: () => { clock += 5; },
      raf: () => 0,
      now: () => clock,
      probe: (n, v) => { vals[n] = v; },
    });
    k.add({ name: 'slow', update: () => { clock += 7; } });
    k.tick(30);
    expect(vals.upd_ms).toBe(7);
    expect(vals.render_ms).toBe(5);
    expect(vals.out_ms).toBeGreaterThanOrEqual(0);
  });
});

describe('생애주기', () => {
  it('dispose가 System에 전파된다', () => {
    let disposed = false;
    const k = new Kernel({ render: () => {}, raf: () => 0, now: () => 0 });
    k.add({ name: 'x', update: () => {}, dispose: () => { disposed = true; } });
    k.dispose();
    expect(disposed).toBe(true);
    expect(k.order).toEqual([]);
  });

  it('stop 후에는 tick을 수동으로 불러도 안전하다', () => {
    const { k, renders } = makeKernel();
    k.start(); k.stop();
    k.tick(16);
    expect(renders.length).toBe(1); // tick 자체는 순수하다 — 루프만 멈춘 것
  });
});
