// @vitest-environment jsdom
//
// **조준 화면** — 「보고 거는」 흐름 전체를 실행으로 잰다 (W8-6).
//
// ── 이 파일이 재는 것 둘 ───────────────────────────────────────────────────
// ① **팀장 조건 1** — *"벽 히트 실시간 시각 신호 + 확정은 히트 상태에서만 유효.
//    이것이 빠지면 (B) 는 「패널만 접힌 (C)」다."*
// ② **비용의 이산 축** — 재캐스트 **횟수**. `pickFace()` 는 풀 용량 전체를 훑으므로
//    (`decide/aim.ts` 헤더) 빈도가 이 회차의 실제 위험이고, 시간을 못 재는 대신 횟수를 잰다.
//
// ── ⚠ 여기서 못 재는 것 ───────────────────────────────────────────────────
// **CPU 시간을 안 잰다.** 이 저장소는 프레임 시간을 일부러 안 재고(swiftshader 는 실기기와
// 무관) 잴 수단도 없다. 횟수가 상한 안이어도 한 번이 느리면 화면은 버벅인다 — **감독
// 실기기가 유일한 판정**이다. 여기 초록을 「성능 통과」로 적지 않는다.
//
// 실제 조준선이 화면 한가운데 보이는지, 손가락이 버튼에 닿는지도 여기서 못 잰다.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldRecast, aimHint, AIM_MIN_MS, AIM_MOVE_EPS, AIM_TURN_EPS, type AimPose,
} from '../frontend/js/world2/decide/aim.js';
import { createAimMode } from '../frontend/js/world2/edit/aim-mode.js';
import type { ArtworkMode } from '../frontend/js/world2/edit/artwork-mode.js';
import type { Panel } from '../frontend/js/world2/edit/panel/dom.js';
import type { Picker } from '../frontend/js/world2/edit/pick.js';
import type { OverlayHost } from '../frontend/js/world2/edit/types.js';
import type { WallHit } from '../frontend/js/world2/decide/artwork.js';

const AT = (o: Partial<AimPose> = {}): AimPose =>
  ({ x: 0, y: 2, z: 0, dx: 0, dy: 0, dz: -1, ...o });

// ── 순수 판정 ───────────────────────────────────────────────────────────────

describe('★ 언제 다시 쏠 것인가 — 정지 상태에서 0회가 요점이다', () => {
  it('첫 회는 쏜다 — 화면이 뜬 순간 무엇을 보고 있는지 말해야 한다', () => {
    expect(shouldRecast(null, AT(), AIM_MIN_MS)).toBe(true);
  });

  it('★ 🔴 가만히 있으면 **안 쏜다** — 이 회차가 얻는 가장 큰 절약이다', () => {
    // 조준 화면은 사용자가 «걸 자리를 정하느라» 멈춰 있는 시간이 길다. 그동안 결과가
    // 같은데 계속 쏘면 풀 용량 전체를 초당 수십 번 훑는다.
    expect(shouldRecast(AT(), AT(), 10_000)).toBe(false);
  });

  it('★ 🔴 간격을 **먼저** 본다 — 상한이 모든 경로 위에 있어야 한다', () => {
    // 자세 비교를 먼저 하면 빠른 프레임에서 문턱을 넘는 순간마다 쏘게 되고 상한이
    // 성립하지 않는다. **크게 움직여도** 간격 미달이면 안 쏜다.
    expect(shouldRecast(AT(), AT({ x: 999 }), AIM_MIN_MS - 1)).toBe(false);
    expect(shouldRecast(null, AT(), AIM_MIN_MS - 1)).toBe(false);
  });

  it('움직이면 쏜다 — 위치·방향 각각', () => {
    expect(shouldRecast(AT(), AT({ x: AIM_MOVE_EPS * 3 }), AIM_MIN_MS)).toBe(true);
    expect(shouldRecast(AT(), AT({ dx: AIM_TURN_EPS * 3 }), AIM_MIN_MS)).toBe(true);
  });

  it('★ 문턱 **아래**는 안 쏜다 — 부동소수 흔들림이 매 프레임 재캐스트가 되지 않게', () => {
    expect(shouldRecast(AT(), AT({ x: AIM_MOVE_EPS / 2 }), AIM_MIN_MS)).toBe(false);
    expect(shouldRecast(AT(), AT({ dx: AIM_TURN_EPS / 2 }), AIM_MIN_MS)).toBe(false);
  });

  it('★ 안내 문구가 두 상태를 **실제로 가른다**', () => {
    // 한 문구가 둘 다 덮으면 화면이 「맞았다」를 못 말하고 이 회차가 무의미해진다.
    expect(aimHint(true)).not.toBe(aimHint(false));
    expect(aimHint(false), '★ 할 일을 안 말한다').toContain('돌려');
  });
});

// ── 집행 ────────────────────────────────────────────────────────────────────

/** `+X` 를 향하는 벽 — `wallPose` 를 반드시 통과한다 */
const WALL: WallHit = { point: { x: 10, y: 2, z: 5 }, normal: { x: 1, y: 0, z: 0 } };
/** 바닥 — `WALL_MAX_TILT` 가 걸러야 한다 */
const FLOOR: WallHit = { point: { x: 1, y: 0, z: 1 }, normal: { x: 0, y: 1, z: 0 } };

function harness(opts: { hit?: WallHit | null; name?: string } = {}) {
  const said: { msg: string; warn: boolean }[] = [];
  let aiming = false;
  const panel = {
    say(msg: string, warn?: boolean) { said.push({ msg, warn: warn === true }); },
    setAiming(on: boolean) { aiming = on; },
  } as unknown as Panel;

  let casts = 0;
  let face: WallHit | null = opts.hit === undefined ? WALL : opts.hit;
  const picker = {
    castCenter: () => { casts++; return true; },
    pickFace: () => face,
  } as unknown as Picker;

  const committed: { src: string; pose: unknown }[] = [];
  const art = {
    judge: (f: File) => (f.name === 'bad name.png'
      ? { ok: false as const, msg: '쓸 수 없는 이름입니다' }
      : { ok: true as const, src: `assets/art/${f.name}` }),
    commit: async (_f: File, src: string, pose: unknown) => { committed.push({ src, pose }); },
  } as unknown as ArtworkMode;

  // 카메라는 **가변 객체**다 — 테스트가 자세를 움직여 재캐스트 축을 잰다.
  const cam = {
    position: { x: 0, y: 2, z: 0 },
    matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
  };
  const host = { doc: document, camera: cam } as unknown as OverlayHost;

  // rAF 를 손으로 돈다 — 시간과 프레임을 통제해야 「정지 시 0회」를 잴 수 있다.
  let pending: (() => void) | null = null;
  let clock = 1000;
  const mode = createAimMode({
    host, panel, picker, art,
    now: () => clock,
    raf: (fn) => { pending = fn; return 1; },
    cancel: () => { pending = null; },
  });

  return {
    mode, said, committed, cam,
    aiming: () => aiming,
    picks: () => casts,
    setFace: (f: WallHit | null) => { face = f; },
    advance: (ms: number) => { clock += ms; },
    frame: (n = 1) => { for (let i = 0; i < n; i++) { const p = pending; pending = null; p?.(); } },
    running: () => pending !== null,
    file: (name = opts.name ?? 'a.png') => ({ name }) as unknown as File,
  };
}

describe('★ 조준 화면 — 보고 거는 흐름', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('★ 이름이 안 되면 **조준을 시작하지 않는다** — 벽을 맞춘 뒤 거절하면 «왜 안 걸리지»', () => {
    const h = harness();
    expect(h.mode.start(h.file('bad name.png'))).toBe(false);
    expect(h.mode.active(), '★ 거절했는데 조준이 떴다').toBe(false);
    expect(h.said.at(-1)?.warn).toBe(true);
    expect(h.aiming(), '★ 패널을 접었다 — 아무것도 안 하는데').toBe(false);
  });

  it('★ 시작하면 패널이 접히고 조준 화면이 뜬다', () => {
    const h = harness();
    expect(h.mode.start(h.file())).toBe(true);
    expect(h.aiming(), '★ 패널이 안 접힌다 — 화면 한가운데가 가려진 채다').toBe(true);
    expect(document.getElementById('w2-aim')?.dataset.on).toBe('1');
  });

  it('★ 🔴 가만히 있으면 재캐스트가 **안 늘어난다**', () => {
    const h = harness();
    h.mode.start(h.file());
    h.advance(AIM_MIN_MS * 2); h.frame();          // 첫 회 — 쏜다
    const after1 = h.picks();
    expect(after1, '★ 첫 프레임에 안 쐈다 — 화면이 상태를 모른다').toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) { h.advance(50); h.frame(); }
    expect(h.picks(), '★ 정지 상태인데 계속 쏜다 — 풀 용량을 초당 수십 번 훑는다')
      .toBe(after1);
  });

  it('★ 카메라가 움직이면 다시 쏘고, **상한을 넘지 않는다**', () => {
    const h = harness();
    h.mode.start(h.file());
    h.advance(AIM_MIN_MS); h.frame();
    const base = h.picks();
    // 1초 동안 매 프레임(16ms) 움직인다 = 60 프레임
    for (let i = 0; i < 60; i++) {
      h.cam.position.x += 1;
      h.advance(16);
      h.frame();
    }
    const casts = h.picks() - base;
    expect(casts, '★ 움직이는데 한 번도 안 쐈다').toBeGreaterThan(0);
    // 1000ms / AIM_MIN_MS = 12.5 → 여유 1
    expect(casts, `★ 상한을 넘었다 — ${casts}회/초`).toBeLessThanOrEqual(Math.ceil(1000 / AIM_MIN_MS) + 1);
  });

  it('★ 🔴 벽이면 히트 신호, 아니면 아니다 (팀장 조건 1 — 실시간 시각 신호)', () => {
    const h = harness({ hit: FLOOR });
    h.mode.start(h.file());
    h.advance(AIM_MIN_MS); h.frame();
    expect(document.getElementById('w2-aim')?.dataset.hit, '★ 바닥인데 걸린다고 한다').toBe('0');
    expect(h.mode.stats().hit).toBe(false);

    h.setFace(WALL);
    h.cam.position.x += 5;                    // 움직여야 다시 쏜다
    h.advance(AIM_MIN_MS); h.frame();
    expect(document.getElementById('w2-aim')?.dataset.hit, '★ 벽인데 신호가 안 바뀐다').toBe('1');
    expect(h.mode.stats().hit).toBe(true);
  });

  it('★ 🔴 히트가 **아니면 확정되지 않는다** (팀장 조건 1 — 그리고 사유를 말한다)', async () => {
    const h = harness({ hit: FLOOR });
    h.mode.start(h.file());
    h.advance(AIM_MIN_MS); h.frame();
    document.querySelector<HTMLButtonElement>('#w2-aim .bar button')!.click();
    await Promise.resolve();
    expect(h.committed.length, '★ 벽이 아닌데 걸렸다 — (B) 가 (C) 로 무너진 것이다').toBe(0);
    expect(h.said.at(-1)?.warn, '★ 아무 말도 안 한다 — «버튼이 고장났나» 가 된다').toBe(true);
    expect(h.mode.active(), '★ 실패했는데 조준이 닫혔다').toBe(true);
  });

  it('★ 히트면 확정되고 조준이 닫힌다', async () => {
    const h = harness();
    h.mode.start(h.file('photo.png'));
    h.advance(AIM_MIN_MS); h.frame();
    document.querySelector<HTMLButtonElement>('#w2-aim .bar button')!.click();
    await Promise.resolve(); await Promise.resolve();
    expect(h.committed.length, '★ 벽인데 안 걸렸다').toBe(1);
    expect(h.committed[0]!.src).toBe('assets/art/photo.png');
    expect(h.mode.active()).toBe(false);
    expect(h.aiming(), '★ 걸었는데 패널이 접힌 채다').toBe(false);
  });

  it('★ 🔴 확정 시 **자세를 다시 읽는다** — 마지막 tick 이후에도 고개는 움직인다', async () => {
    const h = harness();
    h.mode.start(h.file());
    h.advance(AIM_MIN_MS); h.frame();
    const before = h.picks();
    h.setFace(FLOOR);                          // tick 없이 벽에서 벗어났다
    document.querySelector<HTMLButtonElement>('#w2-aim .bar button')!.click();
    await Promise.resolve();
    expect(h.picks(), '★ 확정이 캐시만 믿는다 — 화면이 가리킨 벽과 걸리는 벽이 갈린다')
      .toBeGreaterThan(before);
    expect(h.committed.length, '★ 벽에서 벗어났는데 걸렸다').toBe(0);
  });

  it('★ 취소하면 안 걸리고 rAF 가 **멈춘다**', () => {
    const h = harness();
    h.mode.start(h.file());
    h.advance(AIM_MIN_MS); h.frame();
    expect(h.running(), '★ 조준 중인데 루프가 안 돈다').toBe(true);
    expect(h.mode.cancel()).toBe(true);
    h.frame();
    expect(h.running(), '★ 취소했는데 루프가 계속 돈다 — 영원히 쏜다').toBe(false);
    expect(h.committed.length).toBe(0);
    expect(h.aiming()).toBe(false);
  });

  it('★ Esc 가 취소한다 — `input.ts` 를 안 건드리고', () => {
    const h = harness();
    h.mode.start(h.file());
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
    expect(h.mode.active(), '★ Esc 가 안 먹는다').toBe(false);
  });

  it('★ 조준 중이 아니면 `cancel()` 이 **거짓을 낸다** — 다른 소비자가 그 키를 쓰게', () => {
    const h = harness();
    expect(h.mode.cancel()).toBe(false);
  });

  it('★ dispose 가 루프와 DOM 을 **둘 다** 걷는다', () => {
    const h = harness();
    h.mode.start(h.file());
    h.advance(AIM_MIN_MS); h.frame();
    h.mode.dispose();
    expect(h.running(), '★ dispose 후에도 루프가 돈다').toBe(false);
    expect(document.getElementById('w2-aim'), '★ DOM 이 남았다').toBeNull();
  });

  it('★ 진단이 **캐시된 값**이다 — 읽는 것만으로 쏘지 않는다', () => {
    const h = harness();
    h.mode.start(h.file());
    h.advance(AIM_MIN_MS); h.frame();
    const before = h.picks();
    for (let i = 0; i < 10; i++) h.mode.stats();
    expect(h.picks(), '★ 리포트를 읽자 레이캐스트가 돌았다 — 게이트가 자기 자신을 센다')
      .toBe(before);
  });

  it('★ 조준선은 클릭을 **안 먹는다** — 화면 한가운데가 클릭을 먹으면 건물을 못 고른다', () => {
    const h = harness();
    h.mode.start(h.file());
    // 판정은 CSS 가 하므로 여기서는 **구조**를 못 박는다: 조준선은 버튼과 다른 층에 있다.
    const aim = document.getElementById('w2-aim')!;
    expect(aim.querySelector('.cross'), '★ 조준선이 없다').not.toBeNull();
    expect(aim.querySelector('.bar button'), '★ 버튼이 없다').not.toBeNull();
    expect(aim.querySelector('.cross')!.contains(aim.querySelector('.bar')!),
      '★ 버튼이 조준선 안에 있다 — pointer-events 를 함께 물려받아 클릭이 죽는다').toBe(false);
  });
});
