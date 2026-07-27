// @vitest-environment jsdom
// main-tour.js 단위테스트 — 도슨트 투어 tick 자동진행 판정식의 회귀 안전망.
// 검수관 권고(C-3(7) 투어): tick의 4분기 판정식
//   touring && tourWaiting && tourAutoOn && !getTween() && !isLightboxOpen()
//   → tourStayElapsed 누적 → TOUR_STAY_SECONDS(6s) 도달 시 next() 를 고정한다.
//
// 상태(touring·tourWaiting·tourAutoOn)는 컨트롤러 내부 SSOT라 직접 세팅 불가 →
//   startTour()로 진입시켜 자연스러운 상태를 만든다. 이때 mock startTween이 도착
//   콜백을 "즉시 동기 실행"하면 tourWaiting=true가 되어(정상 도착 상태), tick 판정을
//   검증할 수 있다. tourWaiting=false 분기(④)는 콜백을 실행 안 하는 mock으로 만든다.
//   next() 발생은 getIndex() 변화(0→1)로 관측한다.
import { describe, it, expect, vi } from 'vitest';
import { createTourController } from '../frontend/js/main-tour.js';

// 3개짜리 작품 배열(길이>0이면 됨 — 내용은 판정에 무관)
const ARTS = [{ title: 'a0' }, { title: 'a1' }, { title: 'a2' }];

// mock ctx 팩토리 — 케이스별로 getTween·isLightboxOpen·startTween 콜백 실행 여부만 바꾼다.
function makeCtx(overrides = {}) {
  return {
    getPlacedArtworks: () => ARTS,
    getPlayer: () => ({
      setPose: vi.fn(),
      disable: vi.fn(),
      enable: vi.fn(),
      getState: () => ({ x: 0, z: 0, ry: 0 }),
    }),
    isEntered: () => true,
    getTween: () => null,
    clearTween: vi.fn(),
    // 기본: 도착 콜백 즉시 실행 → tourWaiting=true (정상 도착 상태)
    startTween: (pose, cb) => { if (cb) cb(); },
    getViewingPose: () => ({ x: 0, z: 0, ry: 0 }),
    showTourBar: vi.fn(),
    hideTourBar: vi.fn(),
    setDockActive: vi.fn(),
    isLightboxOpen: () => false,
    isArtworkListOpen: () => false,
    hideArtworkList: vi.fn(),
    ...overrides,
  };
}

describe('tour tick — 자동진행 판정식 4분기', () => {
  it('① 투어중+대기중+auto+트윈없음+라이트박스닫힘: 임계 도달 시 next() (index 0→1)', () => {
    const tour = createTourController(makeCtx());
    tour.startTour(); // touring=true, tourAutoOn=true, 콜백 즉시실행→tourWaiting=true, index 0
    expect(tour.isTouring()).toBe(true);
    expect(tour.getIndex()).toBe(0);

    // 임계(6s) 미만 누적 — 아직 진행 안 함
    tour.tick(3);
    expect(tour.getIndex()).toBe(0);
    // 누적이 6s에 도달 → next() → index 1
    tour.tick(3);
    expect(tour.getIndex()).toBe(1);
  });

  it('② 트윈 진행 중(getTween 반환): 누적 안 함 → next 미발생', () => {
    // getTween이 truthy(진행 중 트윈 객체)를 반환하면 판정식이 막힌다.
    const tour = createTourController(makeCtx({ getTween: () => ({ elapsed: 0 }) }));
    tour.startTour();
    expect(tour.getIndex()).toBe(0);
    tour.tick(10); // 임계를 훌쩍 넘겨도
    tour.tick(10);
    expect(tour.getIndex()).toBe(0); // 트윈 중이라 누적 자체가 안 됨
  });

  it('③ 라이트박스 열림(isLightboxOpen true): 누적 안 함 → next 미발생', () => {
    // 라이트박스가 열려 있으면(관람 중) 자동진행을 일시정지한다.
    // startTour는 isLightboxOpen이면 진입 자체를 막으므로, 진입 후 열리는 상황을 토글로 만든다.
    let lightbox = false;
    const tour = createTourController(makeCtx({ isLightboxOpen: () => lightbox }));
    tour.startTour(); // 닫힌 상태로 진입 (touring=true, index 0)
    expect(tour.getIndex()).toBe(0);
    lightbox = true; // 이후 라이트박스 열림
    tour.tick(10);
    tour.tick(10);
    expect(tour.getIndex()).toBe(0); // 열려 있어 누적 안 됨
  });

  it('④ 대기 아님(tourWaiting=false): 누적 안 함 → next 미발생', () => {
    // 도착 콜백을 실행하지 않는 startTween → goToTourIndex가 tourWaiting=false로 두고
    // 콜백 미실행이라 tourWaiting=true가 되지 않는다(트윈 이동 중 상태 모사).
    const tour = createTourController(makeCtx({ startTween: () => { /* 콜백 미실행 */ } }));
    tour.startTour(); // touring=true지만 tourWaiting=false
    expect(tour.getIndex()).toBe(0);
    tour.tick(10);
    tour.tick(10);
    expect(tour.getIndex()).toBe(0); // 대기 상태가 아니라 누적 안 됨
  });
});
