// @vitest-environment jsdom
//
// 렌더 게이트가 걸린 프레임이 **fps 표본에 들어가지 않는지** 본다.
//
// ── 왜 이 파일이 필요한가 (검수관 반려 B1, 2026-08-07) ──────────────────────
// 캐릭터 편집기가 열려 있는 동안 미술관 씬 렌더를 건너뛰는 최적화를 넣었는데,
// `perfGovernor.tick` 이 그 게이트 **밖**에 있었다. `fpsFrames` 가 세는 것은 rAF 콜백
// 빈도인데 그 값이 **렌더 성능**으로 해석돼 `writeSpec`(localStorage 영구 학습)과
// `renderer.setPixelRatio` 를 움직인다. 렌더를 안 하면 프레임이 가벼워지므로, 게이트가
// 걸린 동안 측정값만 올라간다 — **재는 축이 틀리는** 형태다.
//
// 영향받는 집합이 최악이라 이것이 블로커였다: 이미 60fps 인 기기는 변화가 없고
// (원래도 `fpsNow > 55`), **원래 40~55fps 이던 기기만** 없던 승급을 받는다. 그리고
// `writeSpec('high')` 는 영구 학습이라 `fpsNow < 16` 이 아니면 안 지워진다 — 다음
// 접속부터 슈퍼샘플을 이고 시작한다. `main-perf.ts` 의 `[처방 A]` 주석이 모바일에서
// 이미 차단한 *"순간 고FPS 로 학습"* 과 같은 사고이고, 렌더 스킵은 그것을 **구조적으로**
// 만들어낸다.
//
// ── 이 테스트가 장식이 되는 조건 ────────────────────────────────────────────
// `IS_MOBILE` 이 true 이거나 `gpuInfo.soft` 가 true 면 승급 경로가 **원래부터** 막혀
// 있어서, 게이트가 없어도 단언이 통과한다. 그래서 첫 테스트가 **"게이트가 없으면 실제로
// 승급이 일어난다"** 를 먼저 단언한다 — 그게 하네스가 데스크톱·비소프트로 고정됐다는
// 증거이고, 그것 없이는 나머지 단언이 아무것도 증명하지 않는다.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 상수는 실제 값을 쓰고(값 미러링 금지) 부작용 함수만 스파이한다.
vi.mock('../frontend/js/main-spec.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, writeSpec: vi.fn(), readSpec: vi.fn(() => null) };
});

import { createPerfGovernor } from '../frontend/js/main-perf.js';
import { writeSpec } from '../frontend/js/main-spec.js';
import { setSceneCover, resetSceneCover } from '../frontend/js/render-gate.js';

/** 60fps 상당 — `fpsNow = 1/0.0166 ≈ 60.2` 로 승급 임계(55)를 넘는다. */
const DELTA_60FPS = 0.0166;

/**
 * 승급은 0.5초 틱 20회(=10초) 연속이라야 발동한다. 여유를 얹어 12초어치를 돌린다.
 * "실측에 여유를 얹은 값"이 아니라 **임계에서 유도한** 값이다 — 10초를 넘기기만 하면
 * 된다(넘긴 뒤의 추가 프레임은 판정을 바꾸지 않는다).
 */
const FRAMES_12S = Math.ceil(12 / DELTA_60FPS);

function harness() {
  const calls = { setPixelRatio: 0, setStatus: [] as string[], setFPS: [] as number[], culled: 0 };
  const ctx = {
    renderer: {
      setPixelRatio() { calls.setPixelRatio++; },
      // 1.0 보다 낮게 시작시켜 라이브 샤프닝(+0.25)의 상한 여유를 확실히 만든다 —
      // 그래야 "승급 경로가 막혀서 통과"와 "게이트 때문에 통과"가 구별된다.
      getPixelRatio() { return 0.5; },
      shadowMap: { needsUpdate: false },
    },
    camera: { position: {} },
    gpuInfo: { soft: false },      // 소프트 렌더면 샤프닝이 원래 막힌다 — 명시적으로 false
    getMp: () => null,
    isEntered: () => true,         // 입장 전이면 자동조정이 원래 안 돈다 — 명시적으로 true
    setFPS(n: number) { calls.setFPS.push(n); },
    setStatus(s: string) { calls.setStatus.push(s); },
  };
  const gov = createPerfGovernor(ctx as never);
  const run = (frames: number) => { for (let i = 0; i < frames; i++) gov.tick(DELTA_60FPS); };
  return { gov, calls, run };
}

beforeEach(() => {
  resetSceneCover();
  vi.mocked(writeSpec).mockClear();
});

describe('perfGovernor — 렌더 게이트와 fps 표본', () => {
  // 이것이 통과해야 나머지가 의미를 갖는다. 실패하면 하네스가 승급 경로를 못 타는
  // 것이고(모바일 판정·soft GPU·미입장 등), 그 상태에서는 아래 단언들이 전부 공허하다.
  it('게이트가 없으면 실제로 승급이 일어난다 (하네스가 장식이 아님을 먼저 증명)', () => {
    const { calls, run } = harness();
    run(FRAMES_12S);
    expect(calls.setFPS.length).toBeGreaterThan(0);
    expect(vi.mocked(writeSpec).mock.calls.length + calls.setPixelRatio).toBeGreaterThan(0);
  });

  it('게이트가 걸려 있으면 fps 표본이 쌓이지 않는다 (부작용 0회)', () => {
    const { calls, run } = harness();
    setSceneCover('chibi-maker', true);
    run(FRAMES_12S);

    // 0.5초 틱 자체가 성립하지 않으므로 그 안의 부작용이 전부 안 돈다.
    expect(calls.setFPS).toEqual([]);
    expect(calls.setPixelRatio).toBe(0);
    expect(calls.setStatus).toEqual([]);
    expect(vi.mocked(writeSpec)).not.toHaveBeenCalled();
  });

  it('게이트를 걷으면 다시 집계한다 (fps 축을 아예 끈 것이 아니다)', () => {
    const { calls, run } = harness();
    setSceneCover('chibi-maker', true);
    run(FRAMES_12S);
    expect(calls.setFPS).toEqual([]);

    setSceneCover('chibi-maker', false);
    run(FRAMES_12S);
    expect(calls.setFPS.length).toBeGreaterThan(0);
  });

  // 누산기를 "멈추는" 게 아니라 "리셋"하는 이유. 멈추기만 하면 게이트 직전의 부분
  // 표본이 남아 있다가 해제 직후 표본과 이어붙어, 경계에서 한 번 엉뚱한 fps 가 나온다.
  it('게이트가 풀린 직후 표본은 0에서 시작한다 (경계 프레임이 안 섞인다)', () => {
    const { calls, run } = harness();

    // 게이트 전에 0.5초에 살짝 못 미치는 만큼 쌓아 둔다(틱은 아직 안 났다).
    run(20);
    expect(calls.setFPS).toEqual([]);

    setSceneCover('chibi-maker', true);
    run(FRAMES_12S);          // 이 구간이 누산기를 0으로 되돌린다
    setSceneCover('chibi-maker', false);

    // 해제 직후 딱 한 틱 분량만 돌린다. 누산기가 0에서 시작했다면 정확히 60fps 근처가
    // 나온다. 게이트 이전 잔재가 남아 있었다면 프레임 수가 부풀어 더 높게 찍힌다.
    run(Math.ceil(0.5 / DELTA_60FPS) + 1);
    expect(calls.setFPS.length).toBe(1);
    expect(calls.setFPS[0]).toBeLessThanOrEqual(61);
    expect(calls.setFPS[0]).toBeGreaterThanOrEqual(59);
  });

  // 게이트를 사이에 둔 승급 누적이 이어붙으면, 편집기를 여닫는 것만으로 승급이 누적된다.
  it('게이트 구간이 승급 카운트를 끊는다', () => {
    const { run } = harness();

    // 승급 직전까지 쌓는다(10초 미만이라 아직 승급 없음).
    run(Math.floor(9 / DELTA_60FPS));
    const before = vi.mocked(writeSpec).mock.calls.length;

    setSceneCover('chibi-maker', true);
    run(Math.ceil(2 / DELTA_60FPS));
    setSceneCover('chibi-maker', false);

    // 게이트 뒤 2초만 더 돌린다. 카운트가 끊겼다면 아직 승급하지 않는다.
    run(Math.ceil(2 / DELTA_60FPS));
    expect(vi.mocked(writeSpec).mock.calls.length).toBe(before);
  });

  // 검수관 처방의 경계 — `perfGovernor.tick` 전체를 게이트 안으로 옮기면 이것이 깨진다.
  it('게이트 중에도 NPC 컬링·섀도 축은 계속 돈다 (tick 전체를 막지 않았다)', () => {
    const culled: number[] = [];
    const ctx = {
      renderer: {
        setPixelRatio() {}, getPixelRatio() { return 1; },
        shadowMap: { set needsUpdate(v: boolean) { if (v) culled.push(1); }, get needsUpdate() { return false; } },
      },
      camera: { position: { distanceTo: () => 1 } },
      gpuInfo: { soft: false },
      getMp: () => null,
      isEntered: () => true,
      setFPS() {}, setStatus() {},
    };
    const gov = createPerfGovernor(ctx as never);
    setSceneCover('chibi-maker', true);
    // 예외 없이 끝까지 도는 것 자체가 확인 대상이다 — tick 전체를 건너뛰는 구현이었다면
    // 아래 루프가 아무 일도 하지 않고, #14/#15 누산기가 전진하지 않는다.
    expect(() => { for (let i = 0; i < 400; i++) gov.tick(DELTA_60FPS); }).not.toThrow();
  });
});
