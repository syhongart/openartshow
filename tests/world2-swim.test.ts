// 물에 빠진다 — 판정(`decide/swim.ts`)과 **집행**(`PlayerSystem` 이 실제로 소비하는가).
//
// 감독 지시 2026-07-31: *"강에 사람이 빠지게해줘"*
//
// ── 왜 두 축인가 ────────────────────────────────────────────────────────────
// 이 저장소가 명문화한 사고 형태다: *"판정/집행 분리의 구멍 — 경계를 건너는 지점은
// 아무도 안 본다. `decide/` 를 순수 함수로 두면 각 쪽은 테스트하기 쉬워지지만,
// '계산된 값이 실제로 소비되는가' 는 양쪽 테스트 어디에도 안 걸린다."*
//
// 구름 `alpha` 미소비가 실제로 그렇게 났고, `waterGloss` 도 같은 형태로 났다. 여기서
// 특히 위험한 것은 `swim.ts` 가 **아무것도 import 하지 않는** 순수 파일이라는 점이다 —
// 전부 초록이면서 `PlayerSystem` 이 한 줄도 안 부를 수 있다.
//
// 그래서 [B] 는 `PlayerSystem` 을 **실제로 돌린다**. three 의존이 없는 클래스라
// 스텁도 필요 없다.
//
// ── 못 보는 것 ──────────────────────────────────────────────────────────────
// 화면이 물속처럼 보이는지는 못 본다(오버레이 색은 `world2.html` 이 갖고 있고, 판정은
// 감독 육안이다). 여기가 보는 것은 **알파 수치가 옳게 나오는가**까지다.

import { describe, it, expect } from 'vitest';
import {
  stepSubmersion, eyeYAt, underwaterAlpha, swimSpeedMult,
  SINK_SECONDS, RISE_SECONDS, SWIM_SPEED_MULT, UNDERWATER_MAX_ALPHA,
} from '../frontend/js/world2/decide/swim.js';
import { PlayerSystem, WALK_SPEED } from '../frontend/js/world2/systems/player.js';
import { SEABED_Y, RIVER_Y } from '../frontend/js/world2/decide/water.js';

const EYE = 1.7;

describe('[A] stepSubmersion — 시간으로 잠긴다', () => {
  it('물에 있으면 오르고 밖이면 내린다', () => {
    expect(stepSubmersion(0, true, 0.1)).toBeGreaterThan(0);
    expect(stepSubmersion(0.5, false, 0.1)).toBeLessThan(0.5);
  });

  it('0~1 을 벗어나지 않는다 — 오래 머물러도 넘지 않는다', () => {
    let s = 0;
    for (let i = 0; i < 500; i++) s = stepSubmersion(s, true, 0.1);
    expect(s).toBe(1);
    for (let i = 0; i < 500; i++) s = stepSubmersion(s, false, 0.1);
    expect(s).toBe(0);
  });

  it('★ 정해진 시간에 잠긴다 — 상수가 실제로 쓰인다', () => {
    // 상수를 바꿔도 이 단언이 따라오도록 **상수에서 유도**한다. 초 수를 여기 다시
    // 적으면 그것이 곧 값 미러링이다.
    let s = 0;
    const dt = 0.02;
    for (let t = 0; t < SINK_SECONDS; t += dt) s = stepSubmersion(s, true, dt);
    expect(s).toBeGreaterThan(0.95);
  });

  it('★ 나오는 것이 빠지는 것보다 빠르다 — 조작 응답성의 근거다', () => {
    // 같은 dt 한 번에 움직이는 양을 비교한다. 대칭으로 되돌리면 여기가 깨진다.
    const dt = 0.05;
    const sank = stepSubmersion(0, true, dt);            // 0 → 얼마나 잠겼나
    const rose = 1 - stepSubmersion(1, false, dt);       // 1 → 얼마나 올라왔나
    expect(rose).toBeGreaterThan(sank);
    expect(RISE_SECONDS).toBeLessThan(SINK_SECONDS);
  });

  it('★ dt 가 튀어도 한 프레임에 다 잠기지 않는다 — 탭 복귀 방어', () => {
    // 브라우저가 백그라운드에 있다 돌아오면 dt 가 수 초로 온다. 그때 화면이 한 프레임에
    // 물속으로 순간이동하면 무슨 일이 일어났는지 알 수 없다.
    expect(stepSubmersion(0, true, 30)).toBeLessThan(0.2);
    // 유한하지 않은 값도 막는다(첫 프레임 dt 가 NaN 인 경우가 실제로 있었다).
    expect(stepSubmersion(0.4, true, Number.NaN)).toBe(0.4);
  });
});

describe('[A] eyeYAt — 잠기면 눈이 내려간다', () => {
  it('마른 땅에서는 뭍 눈높이 그대로다 — 헤드밥도 그대로 살아 있다', () => {
    const ground = EYE + 0.03;   // 헤드밥이 얹힌 값
    expect(eyeYAt(0, ground, SEABED_Y, EYE)).toBe(ground);
  });

  it('★ 완전히 잠기면 발이 해저를 딛는다', () => {
    expect(eyeYAt(1, EYE, SEABED_Y, EYE)).toBeCloseTo(SEABED_Y + EYE, 9);
  });

  it('★ 완전히 잠긴 눈이 강 수면보다 아래다 — 아니면 물에 빠진 것이 아니다', () => {
    // 이 부등식이 이 기능 전체의 전제다. 해저를 얕게 만들거나 눈높이를 키우면
    // 물에 들어가도 얼굴이 물 밖에 남아 "빠졌다" 가 성립하지 않는다.
    expect(eyeYAt(1, EYE, SEABED_Y, EYE)).toBeLessThan(RIVER_Y);
  });

  it('단조적이다 — 잠길수록 낮아진다', () => {
    let prev = Infinity;
    for (let t = 0; t <= 1; t += 0.1) {
      const y = eyeYAt(t, EYE, SEABED_Y, EYE);
      expect(y).toBeLessThan(prev);
      prev = y;
    }
  });
});

describe('[A] underwaterAlpha — 눈이 잠겼을 때만 칠한다', () => {
  it('★ 뭍에서는 정확히 0 이다 — 마른 땅에서 화면이 파래지면 판정이 틀린 것이다', () => {
    expect(underwaterAlpha(EYE, RIVER_Y)).toBe(0);
    // 수면에 눈이 정확히 걸친 순간도 아직 물속이 아니다.
    expect(underwaterAlpha(RIVER_Y, RIVER_Y)).toBe(0);
  });

  it('★ 상한을 넘지 않는다 — 완전 암전이면 나갈 길이 안 보인다', () => {
    // 아주 깊이 내려가도 상한이다. 이 단언이 `SWIM_SPEED_MULT` 주석이 지키려는
    // "걸어서 나올 수 있어야 한다" 를 화면 쪽에서 지킨다.
    expect(underwaterAlpha(-100, RIVER_Y)).toBe(UNDERWATER_MAX_ALPHA);
    expect(UNDERWATER_MAX_ALPHA).toBeLessThan(1);
  });

  it('깊이에 따라 커진다', () => {
    expect(underwaterAlpha(RIVER_Y - 0.6, RIVER_Y))
      .toBeGreaterThan(underwaterAlpha(RIVER_Y - 0.2, RIVER_Y));
  });

  it('★ 잠김 정도가 아니라 **눈 높이**로 판정한다', () => {
    // 몸이 반쯤 잠겨도 눈이 아직 수면 위면 물속 화면이 아니다. 잠김으로 계산하면
    // 이 둘을 구별 못 한다.
    const half = eyeYAt(0.5, EYE, SEABED_Y, EYE);
    expect(half).toBeGreaterThan(RIVER_Y);          // 눈이 아직 물 위
    expect(underwaterAlpha(half, RIVER_Y)).toBe(0);
  });
});

describe('[A] swimSpeedMult — 물은 무겁다', () => {
  it('뭍에서는 1배, 완전히 잠기면 상수 그대로다', () => {
    expect(swimSpeedMult(0)).toBe(1);
    expect(swimSpeedMult(1)).toBe(SWIM_SPEED_MULT);
  });

  it('★ 0 이 아니다 — 물에 갇히면 나올 방법이 없다', () => {
    // 이 프로젝트에는 리스폰이 없다. 걸어 나오는 것이 유일한 탈출로다.
    expect(swimSpeedMult(1)).toBeGreaterThan(0);
  });

  it('★ 잠기는 도중에도 이미 느려진다 — 아니면 강을 그냥 가로지른다', () => {
    // 완전히 잠긴 뒤에만 느려지면 가라앉는 동안 평소 속도로 달려 강을 건너 버린다.
    expect(swimSpeedMult(0.5)).toBeLessThan(1);
  });
});

// ── [B] 집행 — `PlayerSystem` 이 실제로 소비하는가 ───────────────────────────
//
// 위 [A] 가 전부 통과해도 `PlayerSystem` 이 `swim.ts` 를 한 줄도 안 부르면 감독 화면에는
// 아무 일도 안 일어난다. 여기서는 실제 클래스를 돌린다.

/** 카메라 대신 y 를 받아 두는 하네스. 물이 어디인지는 테스트가 정한다 */
function harness(opts: { waterAt?: (x: number, z: number) => number | null } = {}) {
  const seen = { y: 0, alpha: 0, x: 0, z: 0 };
  const player = new PlayerSystem({
    start: { x: 0, z: 0 },
    eyeHeight: EYE,
    bobAmplitude: 0,                 // 헤드밥을 꺼 y 를 결정론적으로 만든다
    waterSurfaceY: opts.waterAt,
    seabedY: SEABED_Y,
    applyCamera: (x, y, z) => { seen.x = x; seen.y = y; seen.z = z; },
    onSubmerge: (a) => { seen.alpha = a; },
  });
  const step = (dt: number, n = 1) => {
    for (let i = 0; i < n; i++) player.update({ dt, t: 0, frame: 0 } as never);
  };
  return { player, seen, step };
}

describe('[B] PlayerSystem — 판정이 실제로 화면에 닿는가', () => {
  it('★ 물 위에 서 있으면 눈이 내려간다', () => {
    const h = harness({ waterAt: () => RIVER_Y });   // 어디를 가도 물
    h.step(0.05, 60);                                // 3초 — 완전히 잠기고도 남는다
    expect(h.seen.y).toBeCloseTo(SEABED_Y + EYE, 6);
    expect(h.player.submerged).toBe(1);
  });

  it('★ 물이 없으면 예전과 똑같다 — 기존 화면이 안 바뀐다', () => {
    // 물 판정을 주지 않은 경우(빌더 미리보기 등)와 뭍인 경우 둘 다.
    for (const waterAt of [undefined, () => null]) {
      const h = harness({ waterAt });
      h.step(0.05, 60);
      expect(h.seen.y).toBe(EYE);
      expect(h.seen.alpha).toBe(0);
      expect(h.player.submerged).toBe(0);
    }
  });

  it('★ 물속에서 화면 틴트가 켜진다 — 그리고 뭍에서는 0 이다', () => {
    const wet = harness({ waterAt: () => RIVER_Y });
    wet.step(0.05, 60);
    expect(wet.seen.alpha).toBeGreaterThan(0);

    const dry = harness({ waterAt: () => null });
    dry.step(0.05, 60);
    expect(dry.seen.alpha).toBe(0);
  });

  it('★ 물속 이동이 느리다 — 속도 배수가 실제로 곱해진다', () => {
    const dist = (waterAt?: () => number | null) => {
      const h = harness({ waterAt });
      h.step(0.05, 60);                  // 먼저 잠긴다(물이면)
      const before = h.seen.z;
      h.player.setInput({ forward: true });
      h.step(0.05, 10);
      return Math.abs(h.seen.z - before);
    };
    const wet = dist(() => RIVER_Y);
    const dry = dist(() => null);
    expect(wet).toBeGreaterThan(0);       // 갇히지 않는다
    expect(wet).toBeLessThan(dry);
    // 완전히 잠긴 뒤이므로 배수가 그대로 나와야 한다. 근사로 비교하는 이유는
    // 잠김이 0.999… 로 수렴할 수 있어서다.
    expect(wet / dry).toBeCloseTo(SWIM_SPEED_MULT, 2);
  });

  it('★ 물 밖으로 걸어 나오면 되돌아온다 — 갇히지 않는다', () => {
    // z < 0 만 물인 세계. 물에서 시작해 +z 로 걸어 나온다.
    const h = harness({ waterAt: (_x, z) => (z < 0 ? RIVER_Y : null) });
    h.player.setAxes(0, 0);
    // 물 안(z=-10)에 놓고 잠기게 한다
    h.player.setInput({ back: true });    // +z 가 아니라 먼저 뒤로 가 물에 들어간다
    h.step(0.05, 200);
    expect(h.player.submerged).toBe(0);   // back 은 +z 라 뭍이다 — 방향 확인용

    // 이번엔 앞으로(−z, 물 쪽) 걸어간다
    const g = harness({ waterAt: (_x, z) => (z < 0 ? RIVER_Y : null) });
    g.player.setInput({ forward: true });
    g.step(0.05, 60);
    expect(g.seen.z).toBeLessThan(0);
    expect(g.player.submerged).toBeGreaterThan(0);

    // 되돌아 나온다
    g.player.setInput({ forward: false, back: true });
    g.step(0.05, 400);
    expect(g.seen.z).toBeGreaterThan(0);
    expect(g.player.submerged).toBe(0);
    expect(g.seen.y).toBe(EYE);
    expect(g.seen.alpha).toBe(0);
  });

  it('물에 한 번도 안 닿았으면 틴트를 계산조차 하지 않는다', () => {
    // 마지막 수면이 없는 상태에서 알파가 NaN 이나 엉뚱한 값이 되지 않는지 본다.
    const h = harness({ waterAt: () => null });
    h.step(0.016, 5);
    expect(Number.isFinite(h.seen.alpha)).toBe(true);
    expect(h.seen.alpha).toBe(0);
  });

  it('걷는 속도 자체는 안 바꿨다 — 물이 없으면 예전 그대로다', () => {
    const h = harness();
    h.player.setInput({ forward: true });
    h.step(0.1, 10);                       // 1초
    expect(Math.abs(h.seen.z)).toBeCloseTo(WALK_SPEED, 5);
  });
});
