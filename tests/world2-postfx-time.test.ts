// @vitest-environment jsdom
//
// 블룸 세기가 **시간대를 옳게 소비하는가** — 판정/집행 경계.
//
// ── 이 파일이 막는 결함 (감독 발견 2026-07-30) ───────────────────────────────
// 감독 화면에서 가로등 블룸이 사라졌고, `?bloom=0`(대조군)과 **구별조차 되지 않았다.**
//
// 원인은 판정도 집행도 아니고 **그 사이**였다. `postfx` 가 시간대를 계약으로 받지 못해
// 반구광 세기로 추측했다:
//
//     applyLevel(env.hemi.intensity < 0.95 ? 'night' : 'day')
//
// 문턱 0.95 의 근거는 "밤 반구광 하한이 0.85" 였는데, 밤을 밝히는 커밋이 그 하한을
// **1.2** 로 올렸다. 그 뒤로:
//
//     낮   1.0  → 'day'    → 세기 0
//     노을 0.85 → 'night'  → 세기 최대   ← 뒤집혔다
//     밤   1.2  → 'day'    → 세기 0      ← 감독이 본 화면
//
// `nightness` 는 내내 옳았고 `applyLevel` 도 옳았다. 어느 단위 테스트도 안 걸렸다.
//
// ── 그래서 무엇을 재는가 ────────────────────────────────────────────────────
// 스텁 env 로 **실제 `postfx` 코드의 update 경로를 돌려** 블룸 노드의 `strength` 를 읽는다.
// `tests/world2-sky-system.test.ts` 가 세운 방식이다 — three 의존을 스텁으로 갈고 실제
// 코드를 태운다.
//
// **성능·시각은 이 파일의 소관이 아니다.** 블룸의 실제 모습은 WebGPU 전용이라 헤드리스로
// 검증할 방법이 없다(`postfx.ts` 가 그 사각을 적어 두었다). 여기서 지키는 것은 "밤에 세기가
// 0 이 아니고 낮에 0 이다" 라는 **수치 정합**까지다. 화면 확인은 감독 실기기가 유일한 판정이다.

import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { SkyTime } from '../frontend/js/world2/decide/night.js';

/** 블룸 노드 스텁 — 관찰 대상은 `strength.value` 하나다 */
const bloomNode = { strength: { value: -1 } };

/** 후보정 파이프라인 스텁. `render` 는 부르지 않는다(렌더 훅을 돌리지 않으므로) */
class FakePostProcessing {
  outputNode: unknown = null;
  render(): void {}
  dispose(): void {}
}

vi.mock('three/webgpu', () => ({
  PostProcessing: FakePostProcessing,
}));

vi.mock('three/tsl', () => ({
  // `pass()` 는 `.add()` 가 있는 노드처럼 행동하면 된다
  pass: () => ({ add: (x: unknown) => x }),
}));

vi.mock('three/examples/jsm/tsl/display/BloomNode.js', () => ({
  // 실제 `bloom()` 처럼 세기를 들고 있는 노드를 돌려준다. **인자를 보관해** 세기 기본값이
  // 실제로 전달됐는지도 볼 수 있게 한다.
  bloom: (_scene: unknown, strength: number) => {
    bloomNode.strength.value = strength;
    return bloomNode;
  },
}));

beforeAll(() => {
  // `readNum` 이 `location.search` 를 읽는다. jsdom 기본값(빈 쿼리)이면 기본 상수를 쓴다.
});

const { postfxFeature } = await import('../frontend/js/world2/features/postfx.js');
const { nightness } = await import('../frontend/js/world2/decide/night.js');

/**
 * 시간대를 주고 `update` 를 한 번 돌린 뒤 블룸 세기를 돌려준다.
 *
 * `backend: 'WebGPU'` 로 주는 것이 중요하다 — WebGL 이면 `postfx` 가 의도적으로 켜지 않는다
 * (TSL 후보정이 WebGL 백엔드에서 부팅을 깨뜨린다). 그 분기는 실기기 보호 장치이고 여기서
 * 재려는 것이 아니다.
 */
function levelAt(time: SkyTime): { level: number; diagTime: unknown; failure: unknown } {
  bloomNode.strength.value = -1;
  let current = time;
  const env = {
    scene: {}, camera: {},
    adapter: {
      backend: 'WebGPU',
      renderer: {},
      setRenderHook() {},
      render() {},
    },
    hemi: { intensity: 999 }, // **일부러 터무니없는 값** — 이것을 보면 안 된다(아래 참조)
    time: () => current,
    setTime: (t: SkyTime) => { current = t; },
  };
  const inst = postfxFeature.create(env as never)!;
  inst.system!.update({ dt: 0.016 } as never);
  const diag = inst.diagnostics!() as { strength: number; time: unknown; failure: unknown };
  return { level: diag.strength, diagTime: diag.time, failure: diag.failure };
}

describe('블룸 세기가 시간대를 따른다', () => {
  it('밤에 0 이 아니다 — 감독이 본 결함이 이것이었다', () => {
    const { level, failure } = levelAt('night');
    expect(failure, `블룸이 아예 안 켜졌다: ${String(failure)}`).toBeNull();
    expect(level, '밤인데 블룸 세기가 0 — 가로등이 번지지 않는다').toBeGreaterThan(0);
  });

  it('낮에 0 이다 — 대낮에 켜 두면 하늘이 부옇게 뜬다', () => {
    expect(levelAt('day').level).toBe(0);
  });

  it('노을이 밤보다 약하다 — 뒤집히면 노을에만 번진다(실제로 그랬다)', () => {
    const night = levelAt('night').level;
    const sunset = levelAt('sunset').level;
    expect(sunset).toBeGreaterThan(0);
    expect(sunset, '노을이 밤보다 세다 — 판정이 뒤집혔다').toBeLessThan(night);
  });

  it('세기가 nightness 에 정비례한다 — 소비 자체가 빠지면 낮도 0 이 아니다', () => {
    // `× nightness(time)` 를 `× 1` 로 바꾸는 뮤테이션(M2)을 잡는다. 비율을 보므로
    // 기본 세기 상수를 여기 적지 않는다.
    const night = levelAt('night').level;
    const sunset = levelAt('sunset').level;
    expect(sunset / night).toBeCloseTo(nightness('sunset') / nightness('night'), 9);
  });

  it('반구광 세기를 보지 않는다 — 그것이 무효가 된 옛 축이다', () => {
    // 위 `levelAt` 이 `hemi.intensity = 999` 를 준다. 옛 코드는 그 값을 문턱과 비교해
    // 낮/밤을 갈랐으므로, 999 면 무조건 'day'(세기 0)가 됐다. 밤 세기가 0 보다 크다는
    // 것 자체가 **그 축을 더 이상 보지 않는다**는 증거다.
    //
    // 밤 하한(`NIGHT_HEMI_I`)을 어떻게 바꿔도 이 테스트는 영향받지 않는다(뮤테이션 M3) —
    // 그것이 계약으로 옮긴 이유다.
    expect(levelAt('night').level).toBeGreaterThan(0);
  });
});

describe('진단이 판정된 시간대를 말한다', () => {
  it('세기 0 의 이유를 구별할 수 있다 — "낮이라 0" 과 "고장이라 0"', () => {
    // 이번 사고 때 진단에 `strength: 0` 만 있었고, 그것만으로는 정상인지 고장인지
    // 구별할 수 없었다. 감독 화면을 보고서야 드러난 이유다(뮤테이션 M4).
    expect(levelAt('day').diagTime).toBe('day');
    expect(levelAt('night').diagTime).toBe('night');
    expect(levelAt('sunset').diagTime).toBe('sunset');
  });
});
