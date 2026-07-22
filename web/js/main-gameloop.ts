// main-gameloop.js — animate 게임루프 전체를 main.js에서 추출한다. 4차의 마지막·최고난도
//   단위("미술관 심장"). A·B·C는 "상태 소유 이전 + tick 위임"이었지만, D는 성격이 다르다:
//   이건 도메인 상태 컨트롤러가 아니라 "프레임 순서 + render() + setAnimationLoop 콜백 경계를
//   소유한 오케스트레이터"다. 그래서 패턴이 다르다 — 안정 참조 값 주입 + 순서 1바이트 보존 +
//   render 경계 무변형. A·B·C에서 확립한 "값 주입·순서 보존"이 안전판, render/setAnimationLoop
//   경계가 새 위험이라 verbatim으로 조인다.
//
//   소유(프레임 상태): clock(THREE.Clock — delta 소스)·potatoAccum(포테이토 캡 시간 누적).
//   둘 다 루프 밖에서 참조되지 않아 소유 이전이 캡슐화만 개선한다. clock 생성은 start()에서
//   (원본 init 말미 `clock = new THREE.Clock()` 직후 setAnimationLoop 순서를 1바이트 재현).
//
//   ctx 전량 값 주입: renderer·scene·camera·player·gpuInfo는 init 1회 대입 후 안정. 위임 tick
//   컨트롤러(flyController·tourController·multiplayerController·selfViewController·
//   viewfxController·perfGovernor)도 init에서 1회 대입 후 재대입 없음 → 값(프레임당 getter
//   오버헤드 0). flyController는 init에서 initFly()로 1회 대입(재대입 없음)이라 값이되, 원본의
//   `if (flyController)` null 가드는 그대로 유지. UI/위임 함수(sceneTick·getNearbyArtwork·
//   showArtworkInfo·hideArtworkInfo·setStatus)도 값. 이 모듈은 프레임 안에서 신규 객체 할당 0.

import * as THREE from 'three';

// main.js가 주입하는 게임루프 계약(전량 값 주입 — 위임 tick 컨트롤러는 호출 멤버만 최소 선언).
interface GameLoopCtx {
  renderer: { render(scene: object, camera: object): void; setAnimationLoop(fn: (() => void) | null): void };
  scene: object;
  camera: { position: object };
  player: { update(delta: number): void; resolveBodyCollisions(positions: unknown): void };
  gpuInfo: { soft: boolean };
  flyController: { update(delta: number): void } | null;
  tourController: { tick(delta: number): void };
  multiplayerController: { getMp(): { getAvatarPositions(): unknown } | null; tick(delta: number): void };
  selfViewController: {
    tick(delta: number): void;
    isThirdPerson(): boolean;
    getSelfAvatar(): unknown;
    applySelfCamOffset(): void;
    restoreSelfCamOffset(): void;
  };
  viewfxController: { updateTween(delta: number): void; updateFloorIndicator(): void; tickOnboarding(): void };
  perfGovernor: { tick(delta: number): void };
  sceneTick(delta: number): void;
  getNearbyArtwork(position: object): unknown;
  showArtworkInfo(art: unknown): void;
  hideArtworkInfo(): void;
  setStatus(msg: string): void;
}

export function createGameLoop(ctx: GameLoopCtx) {
  const {
    renderer, scene, camera, player, gpuInfo,   // 안정 값
    flyController,                               // 안정 값 (null 가드 유지)
    tourController,
    multiplayerController,
    selfViewController,
    viewfxController,
    perfGovernor,
    sceneTick,                                   // 위임 값
    getNearbyArtwork,                            // 값
    showArtworkInfo,
    hideArtworkInfo,
    setStatus,                                   // UI 값
  } = ctx;

  // --- 프레임 상태 SSOT (main.js에서 이전) ---
  let clock: { getDelta(): number } | null = null;   // start()에서 생성 (원본 setAnimationLoop 직전 생성 순서 재현)
  let potatoAccum = 0;

  function loop() {
    // loop는 start()에서 clock 대입 후에만 setAnimationLoop로 등록되므로 여기서 clock은 항상 non-null.
    let delta = clock!.getDelta();

    // 포테이토 모드 프레임 캡(~20fps) — 소프트웨어 렌더는 프레임 시간이 널뛰어
    // 입력 지연 체감이 더 나쁘다. 일정한 20fps가 오히려 안정적으로 걸린다.
    // 건너뛴 시간은 누적해 다음 프레임의 delta로 넘긴다(시뮬 시간 보존).
    if (gpuInfo.soft) {
      potatoAccum += delta;
      if (potatoAccum < 0.034) return; // ~30fps 캡 (씬 경량화 후 상향)
      delta = potatoAccum;
      potatoAccum = 0;
    }

    try {
      // 비행 입력 → player.liftOffset 갱신(카메라 y 조립 전에 실행). fly 미탑재면 no-op.
      if (flyController) flyController.update(delta);
      // 이동/회전 (트윈/투어 중에는 player.disable 상태이므로 update는 사실상 no-op)
      player.update(delta);
      // 몸 충돌 — 다른 캐릭터(사람+NPC)를 뚫고 지나가지 못하게 밀어낸다
      const mp = multiplayerController.getMp();
      if (mp) player.resolveBodyCollisions(mp.getAvatarPositions());

      // 카메라 트윈(텔레포트/투어) 갱신 — 별도 루프 없이 기존 animate 루프에 포함 (viewfx 위임)
      viewfxController.updateTween(delta);

      // 도슨트 투어 자동진행 — 목적지 도착 후 머무름 중 && 라이트박스가 닫혀 있고
      // 새 트윈이 진행 중이 아닐 때만 카운트한다 (라이트박스 여는 동안 일시정지).
      // 판정식·임계·delta 누적·다음전환 호출은 컨트롤러 tick이 원본과 1바이트 동치로 소유.
      tourController.tick(delta);

      // 나비·새 애니메이션
      sceneTick(delta);

      // 층 이동 안내 — 카메라 y로 현재 층 판정, 바뀔 때 1회 표시 (viewfx 위임)
      viewfxController.updateFloorIndicator();

      // 멀티플레이어 (입장 후에만) — 트윈/투어 중에도 카메라 기준으로 계속 전송.
      // mp 생성·null 가드·sendState/update는 컨트롤러 tick이 원본과 동치로 소유(mp=null이면 no-op).
      multiplayerController.tick(delta);

      viewfxController.tickOnboarding();

      // 3인칭 자기 아바타 — 눈 위치/yaw를 발밑 기준으로 반영 + 속도 평활 (컨트롤러 tick 위임)
      selfViewController.tick(delta);

      // 근접 작품 안내 — ui.js가 중복 렌더를 막으므로 매 프레임 호출해도 안전
      const nearby = getNearbyArtwork(camera.position);
      if (nearby) {
        showArtworkInfo(nearby);
      } else {
        hideArtworkInfo();
      }

      // 성능/렌더 거버너 — FPS 집계+저사양 히스테리시스+spec 학습+pixelRatio 라이브 조정,
      // NPC 컬링(2초), 섀도 재베이크+입장 warmup을 perfGovernor.tick이 원본과 1바이트 동치로
      // 소유(4차 A군). render()는 여기서 건드리지 않는다(아래 분기가 그대로 소유).
      perfGovernor.tick(delta);

      if (selfViewController.isThirdPerson() && selfViewController.getSelfAvatar()) {
        selfViewController.applySelfCamOffset();
        renderer.render(scene, camera);
        selfViewController.restoreSelfCamOffset();
      } else {
        renderer.render(scene, camera);
      }
    } catch (err) {
      console.error('렌더 루프 오류:', err);
      renderer.setAnimationLoop(null);
      setStatus('오류가 발생했습니다. 페이지를 새로고침해 주세요.');
    }
  }

  // 렌더 루프 시작 — 원본 init 말미의 `clock = new THREE.Clock(); renderer.setAnimationLoop(animate)`
  // 순서를 1바이트 재현한다(clock 생성 → 등록). 등록/해제는 동일 renderer 인스턴스.
  function start() {
    clock = new THREE.Clock();
    renderer.setAnimationLoop(loop);
  }

  return { start };
}
