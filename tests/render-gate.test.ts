// 오버레이 렌더 게이트 테스트.
//
// ── 왜 이 파일이 필요한가 ────────────────────────────────────────────────────
// 감독 신고: *"캐릭터 디자인페이지에서 밑에 종족·얼굴·헤어 등 버튼을 누르면 바로 안
// 바뀌고 한 템포 느리게 반응해."* 진단 결과 클릭 핸들러(최대 9.1ms)는 프레임 예산
// 안이었고, 진짜 비용은 **오버레이가 덮고 있는데도 계속 그려지던 미술관 씬**(115
// draw/frame)이었다. 처방이 `render-gate.ts` + 게임루프의 스킵 분기다.
//
// 여기가 이 프로젝트가 반복해 뚫린 자리다 — **판정과 집행의 경계.** `isSceneCovered()`
// 가 true 를 정확히 돌려줘도, 게임루프가 그 값을 안 보면 씬은 그대로 그려진다. 그리고
// 그 상태는 "고쳤다"와 **화면상 구별되지 않는다** — 오버레이가 덮고 있으니 눈으로도
// 안 보인다. 순수 함수만 테스트하면 정확히 이 실패가 통과한다(구름 `alpha` 미소비·
// 물 `offset` 미갱신이 같은 형태였다).
//
// 그래서 아래 「집행」 블록은 **실제 `createGameLoop` 을 돌려** renderer.render 호출
// 횟수를 센다. three 는 `Clock`(delta 소스) 하나만 쓰므로 모듈째 스텁으로 갈아 끼운다.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// main-gameloop 이 쓰는 three API 는 `Clock` 하나뿐이다. delta 를 테스트가 통제해야
// 프레임 캡 분기를 결정론적으로 밟는다.
vi.mock('three', () => ({
  Clock: class {
    getDelta() { return 0.016; }
  },
}));

import {
  setSceneCover, isSceneCovered, getSceneCovers, resetSceneCover,
} from '../frontend/js/render-gate.js';
import { createGameLoop } from '../frontend/js/main-gameloop.js';

beforeEach(() => { resetSceneCover(); });

describe('render-gate — 판정', () => {
  it('기본은 가려지지 않은 상태다 (씬을 그린다)', () => {
    expect(isSceneCovered()).toBe(false);
    expect(getSceneCovers()).toEqual([]);
  });

  it('덮으면 가려지고, 걷으면 풀린다', () => {
    setSceneCover('chibi-maker', true);
    expect(isSceneCovered()).toBe(true);
    setSceneCover('chibi-maker', false);
    expect(isSceneCovered()).toBe(false);
  });

  it('같은 출처가 두 번 덮어도 한 번 걷으면 풀린다 (open 중복 호출 내성)', () => {
    setSceneCover('chibi-maker', true);
    setSceneCover('chibi-maker', true);
    expect(getSceneCovers()).toEqual(['chibi-maker']);
    setSceneCover('chibi-maker', false);
    expect(isSceneCovered()).toBe(false);
  });

  // 이것이 boolean 대신 Set 을 쓴 이유다 — boolean 이면 나중에 닫힌 쪽이 아직 열려
  // 있는 오버레이의 게이트까지 풀어, 덮여 있는데 렌더가 되살아난다.
  it('출처가 둘일 때 하나만 걷으면 여전히 가려져 있다', () => {
    setSceneCover('chibi-maker', true);
    setSceneCover('lightbox', true);
    setSceneCover('chibi-maker', false);
    expect(isSceneCovered()).toBe(true);
    expect(getSceneCovers()).toEqual(['lightbox']);
    setSceneCover('lightbox', false);
    expect(isSceneCovered()).toBe(false);
  });

  it('걷지 않은 출처를 걷어도 다른 출처를 건드리지 않는다', () => {
    setSceneCover('chibi-maker', true);
    setSceneCover('never-opened', false);
    expect(isSceneCovered()).toBe(true);
  });
});

/** 게임루프 ctx 스텁 — 관찰 대상은 render 호출 횟수와 시뮬 tick 호출 횟수다. */
function makeLoopHarness(opts: { thirdPerson?: boolean } = {}) {
  const calls = { render: 0, playerUpdate: 0, mpTick: 0, sceneTick: 0, camOffset: 0 };
  let registered: (() => void) | null = null;

  const ctx = {
    renderer: {
      render() { calls.render++; },
      setAnimationLoop(fn: (() => void) | null) { registered = fn; },
    },
    scene: {},
    camera: { position: {} },
    player: {
      update() { calls.playerUpdate++; },
      resolveBodyCollisions() {},
    },
    gpuInfo: { soft: false },
    flyController: null,
    tourController: { tick() {} },
    multiplayerController: {
      getMp: () => null,
      tick() { calls.mpTick++; },
    },
    selfViewController: {
      tick() {},
      isThirdPerson: () => !!opts.thirdPerson,
      // 3인칭 렌더 분기는 자기 아바타가 있을 때만 탄다.
      getSelfAvatar: () => (opts.thirdPerson ? {} : null),
      applySelfCamOffset() { calls.camOffset++; },
      restoreSelfCamOffset() {},
    },
    viewfxController: { updateTween() {}, updateFloorIndicator() {}, tickOnboarding() {} },
    perfGovernor: { tick() {} },
    sceneTick() { calls.sceneTick++; },
    getNearbyArtwork: () => null,
    showArtworkInfo() {},
    hideArtworkInfo() {},
    setStatus() {},
  };

  const loop = createGameLoop(ctx as never);
  loop.start();                       // clock 생성 + setAnimationLoop 등록
  if (!registered) throw new Error('setAnimationLoop 에 프레임 콜백이 등록되지 않았다');
  return { calls, frame: registered as () => void };
}

describe('render-gate — 집행 (실제 게임루프가 값을 소비하는가)', () => {
  it('가려지지 않았으면 프레임마다 씬을 그린다', () => {
    const { calls, frame } = makeLoopHarness();
    frame();
    frame();
    expect(calls.render).toBe(2);
  });

  // 이 단언이 이 파일의 존재 이유다. 게임루프에서 `if (!isSceneCovered())` 를 지우면
  // 여기서 깨진다 — 판정만 있고 집행이 없는 상태를 잡는 유일한 자리다.
  it('가려져 있으면 씬을 그리지 않는다', () => {
    const { calls, frame } = makeLoopHarness();
    setSceneCover('chibi-maker', true);
    frame();
    frame();
    expect(calls.render).toBe(0);
  });

  it('걷으면 다음 프레임부터 다시 그린다 (게이트가 붙박이가 아니다)', () => {
    const { calls, frame } = makeLoopHarness();
    setSceneCover('chibi-maker', true);
    frame();
    expect(calls.render).toBe(0);
    setSceneCover('chibi-maker', false);
    frame();
    expect(calls.render).toBe(1);
  });

  // 렌더 경로가 둘이다(1인칭·3인칭). 하나만 게이트 안에 넣으면 3인칭 사용자에게는
  // 최적화가 통째로 무효인데, 1인칭 테스트만 있으면 그 사실이 안 드러난다.
  it('3인칭 렌더 경로도 함께 막힌다', () => {
    const { calls, frame } = makeLoopHarness({ thirdPerson: true });
    frame();
    expect(calls.render).toBe(1);
    expect(calls.camOffset).toBe(1);   // 3인칭 분기를 실제로 탔다는 확인

    setSceneCover('chibi-maker', true);
    frame();
    expect(calls.render).toBe(1);      // 늘지 않았다
    expect(calls.camOffset).toBe(1);   // 카메라 오프셋 조작도 건너뛴다
  });

  // 경계 판정(render-gate.ts 머리말): 막는 것은 **렌더뿐**이다. 시뮬까지 멈추면 다른
  // 접속자에게 내가 얼어붙어 보이고, 오버레이를 닫는 순간 누적 delta 가 한 번에 튄다.
  it('가려져 있어도 시뮬레이션 tick 은 계속 돈다', () => {
    const { calls, frame } = makeLoopHarness();
    setSceneCover('chibi-maker', true);
    frame();
    frame();
    expect(calls.render).toBe(0);
    expect(calls.playerUpdate).toBe(2);
    expect(calls.mpTick).toBe(2);
    expect(calls.sceneTick).toBe(2);
  });
});
