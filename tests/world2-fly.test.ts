// @vitest-environment node
//
// **편집 중 비행**의 순수 판정 (감독 지시 2026-08-19 *"내가 하늘을 날아서 보고 편집하게
// 하는건 어때"*, 팀장 판정 (가)).
//
// ── 🔴 부호를 「여러 yaw 에서」 재는 이유 — 이 저장소가 이미 데인 형태 ──────
// `systems/player.ts` 의 `moveFromAxes` 주석이 그 사고를 적어 두었다:
//
//   *"부호를 한 번 틀린 적이 있다. yaw=0 에서는 두 식이 우연히 같아서 통과했고, 시선을
//    돌린 뒤에야 좌우가 뒤집혔다(90°에서 정확히 반대편). 그래서 이 함수의 테스트는
//    반드시 **여러 yaw 에서 facing 과 일치하는지**로 해야 한다 — 속력만 비교하면 못 잡는다."*
//
// 비행은 거기에 **피치**가 더해져 축이 하나 더 있다. 그래서 아래는 ① 여러 yaw ②
// 여러 pitch ③ **걷기와의 일치**(pitch=0 이면 전후가 `moveDelta` 와 같아야 한다)를 잰다.
// ③이 특히 중요하다 — 두 경로가 갈리면 «걸을 때와 날 때 앞이 다른 쪽» 이 된다.
//
// ── 검출력 실측 (뮤테이션 4건, `npx vitest run tests/world2-fly.test.ts`) ──
//   F1  좌우 부호 뒤집기(`side` 항의 부호)              **1 failed**
//   F2  피치 무시(`cp = 1` — 수평 비행이 된다)           **1 failed**
//   F3  수직을 정규화에 포함                            **2 failed**
//   F4  `FLY_UP_CELLS` 를 `1.6` 으로 하드코딩            **0 failed** ← 등가
//
// ⚠ **F4 가 0 인 것은 검출력 부족이 아니라 원리적 한계다.** 지금 `FOG_NEAR_CELLS` 가
// 1.6 이므로 「유도한 값」과 「같은 수를 적은 값」이 **런타임에 구별되지 않는다.** 갈리는
// 것은 `FOG_NEAR_CELLS` 를 바꾸는 순간인데, 상수를 바꿀 수 없는 검사로는 그 순간을 못
// 만든다. 즉 이 축은 **「미러링이 아니다」를 증명하지 못한다** — 증명하는 것은 코드가
// `import` 로 가리키고 있다는 사실뿐이고, 그것은 사람이 읽어야 한다.
//
// ── 이 파일이 **못** 재는 것 ────────────────────────────────────────────────
// · 🔴 **배선 — 지금 이 판정을 부르는 제품 코드가 0 이다.** 다음 커밋(`PlayerSystem`
//   확장)에서 붙이고 그때 통합 검사를 함께 만든다. 이 저장소에는 「배선 0 인 판정」이
//   이미 하나 있고(태스크 #109) 그것이 방치의 본보기라, 여기 적어 두고 다음 회차에 건다.
// · **손맛** — 속도 배수·상한이 손에 맞는지는 감독 체감이고 노브로 판정받는다.
// · **집행** — `PlayerSystem` 이 이 값을 실제로 소비하는지는 여기서 안 본다(판정/집행
//   경계는 아무도 안 본다는 그 자리다). 배선 회차에서 통합 검사를 함께 붙인다.
// · **화면** — 안개가 실제로 그 고도에서 100% 가 되는지는 브라우저 몫이다. 여기서는
//   상한이 **어느 상수에서 유도됐는지**만 잰다(값을 다시 적지 않는 것이 요점이다).

import { describe, it, expect } from 'vitest';
import {
  flyDelta, clampFlyLift, flyLiftMeters, NO_FLY,
  FLY_CEIL_CELLS, FLY_UP_CELLS, FLY_SPEED_MULT, type FlyInput,
} from '../frontend/js/world2/decide/fly.js';
import { moveDelta, facing, RUN_MULT, NO_INPUT } from '../frontend/js/world2/systems/player.js';
import { DEFAULT_BANDS } from '../frontend/js/world2/decide/lod.js';
import { FOG_NEAR_CELLS } from '../frontend/js/world2/decide/fog.js';

const YAWS = [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2, 2.7, -1.1];
const fly = (over: Partial<FlyInput> = {}): FlyInput => ({ ...NO_FLY, ...over });

describe('★ 상한은 **유도된 값**이다 — 여기 수를 적지 않는다', () => {
  it('🔴 하드 상한 = 안개 100% 선(`farExit`)', () => {
    expect(FLY_CEIL_CELLS).toBe(DEFAULT_BANDS.farExit);
  });

  it('🔴 기본 상한 = 안개 시작선(`FOG_NEAR_CELLS`)', () => {
    expect(FLY_UP_CELLS).toBe(FOG_NEAR_CELLS);
  });

  it('★ 기본이 하드 상한보다 낮다 — 기본이 이미 안개 속이면 「선명한 최대」가 아니다', () => {
    expect(FLY_UP_CELLS).toBeLessThan(FLY_CEIL_CELLS);
  });

  it('★ 속도 배수가 1보다 크다 — 걷기와 같으면 비행의 값어치 절반이 없다', () => {
    expect(FLY_SPEED_MULT).toBeGreaterThan(1);
  });
});

describe('★ 방향 — 여러 yaw·pitch 에서 재야 한다', () => {
  it('🔴 pitch 0 에서 전진은 `facing()` 과 **같은 쪽**이다 (모든 yaw)', () => {
    for (const yaw of YAWS) {
      const d = flyDelta(fly({ forward: true }), yaw, 0, 10, 1, RUN_MULT);
      const f = facing(yaw);
      // 방향만 본다 — 크기는 속도·dt 가 정한다.
      const len = Math.hypot(d.dx, d.dz);
      expect(d.dx / len, `yaw=${yaw} 에서 전진 x 가 facing 과 다르다`).toBeCloseTo(f.x, 6);
      expect(d.dz / len, `yaw=${yaw} 에서 전진 z 가 facing 과 다르다`).toBeCloseTo(f.z, 6);
      expect(d.dy, '★ pitch 0 인데 위아래로 움직인다').toBeCloseTo(0, 6);
    }
  });

  it('🔴 pitch 0 에서 **걷기와 완전히 같다** — 걸을 때와 날 때 앞이 달라지면 안 된다', () => {
    for (const yaw of YAWS) {
      for (const keys of [
        { forward: true }, { back: true }, { left: true }, { right: true },
        { forward: true, right: true }, { back: true, left: true },
      ]) {
        const f = flyDelta(fly(keys), yaw, 0, 5, 0.5, RUN_MULT);
        const w = moveDelta({ ...NO_INPUT, ...keys }, yaw, 5, 0.5);
        expect(f.dx, `yaw=${yaw} ${JSON.stringify(keys)} dx`).toBeCloseTo(w.dx, 6);
        expect(f.dz, `yaw=${yaw} ${JSON.stringify(keys)} dz`).toBeCloseTo(w.dz, 6);
      }
    }
  });

  it('🔴 위를 보고 전진하면 **올라간다** — 그것이 「난다」의 조작이다', () => {
    const up = flyDelta(fly({ forward: true }), 0, 0.6, 10, 1, RUN_MULT);
    expect(up.dy, '🔴 위를 봤는데 고도가 안 오른다').toBeGreaterThan(0);
    const down = flyDelta(fly({ forward: true }), 0, -0.6, 10, 1, RUN_MULT);
    expect(down.dy, '🔴 아래를 봤는데 고도가 안 내린다').toBeLessThan(0);
  });

  it('🔴 위를 볼수록 **앞으로 덜 간다** — 수평 성분이 `cos(pitch)` 로 줄어야 한다', () => {
    const flat = flyDelta(fly({ forward: true }), 0, 0, 10, 1, RUN_MULT);
    const tilt = flyDelta(fly({ forward: true }), 0, 1.0, 10, 1, RUN_MULT);
    const flatLen = Math.hypot(flat.dx, flat.dz);
    const tiltLen = Math.hypot(tilt.dx, tilt.dz);
    expect(tiltLen).toBeLessThan(flatLen);
    expect(tiltLen / flatLen, '★ 줄어드는 비율이 cos(pitch) 가 아니다').toBeCloseTo(Math.cos(1.0), 6);
  });

  it('🔴 좌우(스트레이프)는 **피치를 안 탄다** — 옆으로 갈 때 고도가 변하면 안 된다', () => {
    for (const pitch of [-1.2, -0.4, 0, 0.4, 1.2]) {
      const d = flyDelta(fly({ right: true }), 0.9, pitch, 10, 1, RUN_MULT);
      expect(d.dy, `pitch=${pitch} 에서 스트레이프가 고도를 바꿨다`).toBeCloseTo(0, 6);
    }
  });

  it('★ 상하 키는 **시선과 무관**하게 절대 y 다', () => {
    for (const yaw of YAWS) {
      for (const pitch of [-1, 0, 1]) {
        const u = flyDelta(fly({ up: true }), yaw, pitch, 10, 1, RUN_MULT);
        expect(u.dy).toBeCloseTo(10, 6);
        expect(Math.hypot(u.dx, u.dz), '★ 상승이 수평으로도 밀었다').toBeCloseTo(0, 6);
      }
    }
  });
});

describe('★ 크기 — 대각선과 달리기', () => {
  it('🔴 대각선이 √2 배 빠르지 않다', () => {
    const one = flyDelta(fly({ forward: true }), 0, 0, 10, 1, RUN_MULT);
    const two = flyDelta(fly({ forward: true, right: true }), 0, 0, 10, 1, RUN_MULT);
    expect(Math.hypot(two.dx, two.dz)).toBeCloseTo(Math.hypot(one.dx, one.dz), 6);
  });

  it('🔴 상하는 정규화에 **안 들어간다** — 「위로 가면서 앞으로」가 느려지면 안 된다', () => {
    const flat = flyDelta(fly({ forward: true }), 0, 0, 10, 1, RUN_MULT);
    const both = flyDelta(fly({ forward: true, up: true }), 0, 0, 10, 1, RUN_MULT);
    expect(Math.hypot(both.dx, both.dz), '🔴 상승을 섞었더니 전진이 느려졌다')
      .toBeCloseTo(Math.hypot(flat.dx, flat.dz), 6);
    expect(both.dy).toBeCloseTo(10, 6);
  });

  it('🔴 `fast` 배수를 **인자로 받는다** — 값을 이 파일이 안 갖는다', () => {
    const slow = flyDelta(fly({ forward: true }), 0, 0, 10, 1, RUN_MULT);
    const fast = flyDelta(fly({ forward: true, fast: true }), 0, 0, 10, 1, RUN_MULT);
    expect(Math.hypot(fast.dx, fast.dz) / Math.hypot(slow.dx, slow.dz)).toBeCloseTo(RUN_MULT, 6);
    // 다른 배수를 넘기면 그대로 따른다 — 이것이 「미러링이 아니다」의 증거다.
    const other = flyDelta(fly({ forward: true, fast: true }), 0, 0, 10, 1, 5);
    expect(Math.hypot(other.dx, other.dz) / Math.hypot(slow.dx, slow.dz)).toBeCloseTo(5, 6);
  });

  it('★ 입력이 없으면 0 이다 — 안 누르는 것이 가장 흔한 상태다', () => {
    const d = flyDelta(NO_FLY, 1.2, 0.3, 10, 1, RUN_MULT);
    expect([d.dx, d.dy, d.dz]).toEqual([0, 0, 0]);
  });

  it('★ dt 가 유한하지 않거나 0 이하면 0 이다', () => {
    for (const dt of [0, -1, NaN, Infinity]) {
      const d = flyDelta(fly({ forward: true }), 0, 0, 10, dt, RUN_MULT);
      expect([d.dx, d.dy, d.dz], `dt=${dt}`).toEqual([0, 0, 0]);
    }
  });
});

describe('★ 고도 클램프', () => {
  it('🔴 상한을 넘지 않고 지면 아래로 안 내려간다', () => {
    expect(clampFlyLift(999, 50)).toBe(50);
    expect(clampFlyLift(-5, 50)).toBe(0);
    expect(clampFlyLift(20, 50)).toBe(20);
  });

  it('★ 상한이 음수면 0 으로 — 「위로도 아래로도 못 간다」가 정직한 답이다', () => {
    expect(clampFlyLift(10, -3)).toBe(0);
  });

  it('🔴 셀↔미터 경계를 **함수가** 넘긴다 — 셀 값을 상한에 그대로 넣으면 2.4m 천장이 된다', () => {
    // 검수관 재검수 B-3 부수: 변환을 배선에 맡기면 단위가 다른 두 수가 같은 자리에
    // 들어가도 아무 검사가 안 깨진다.
    expect(flyLiftMeters(FLY_UP_CELLS, 32)).toBeCloseTo(FLY_UP_CELLS * 32, 6);
    expect(flyLiftMeters(FLY_CEIL_CELLS, 32)).toBeCloseTo(FLY_CEIL_CELLS * 32, 6);
    // 셀을 그대로 넘긴 것과 변환한 것이 **확연히 다르다** — 그 차이가 이 함수의 존재 이유다.
    expect(clampFlyLift(30, FLY_UP_CELLS)).toBeLessThan(clampFlyLift(30, flyLiftMeters(FLY_UP_CELLS, 32)));
    expect(flyLiftMeters(NaN, 32)).toBe(0);
    expect(flyLiftMeters(2, -5)).toBe(0);
  });

  it('★ 유한하지 않은 고도는 **0** — NaN 이 자세로 새면 화면이 통째로 사라진다', () => {
    // ⚠ `Infinity` 도 0 이다(상한으로 자르지 **않는다**). 첫 판본은 `50` 을 기대했고
    // 틀렸는데, 실제 동작 쪽이 옳다 — 고도가 망가졌을 때 **지면으로 돌아오는** 것이
    // 하늘 끝에 붙는 것보다 안전하고, 「유한하지 않다」 하나로 판정이 갈리는 편이
    // 다음 사람에게도 읽힌다.
    expect(clampFlyLift(NaN, 50)).toBe(0);
    expect(clampFlyLift(Infinity, 50)).toBe(0);
    expect(clampFlyLift(-Infinity, 50)).toBe(0);
  });
});
