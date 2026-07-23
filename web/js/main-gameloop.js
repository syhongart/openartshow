import * as THREE from "three";
function createGameLoop(ctx) {
  const {
    renderer,
    scene,
    camera,
    player,
    gpuInfo,
    // 안정 값
    flyController,
    // 안정 값 (null 가드 유지)
    tourController,
    multiplayerController,
    selfViewController,
    viewfxController,
    perfGovernor,
    sceneTick,
    // 위임 값
    getNearbyArtwork,
    // 값
    showArtworkInfo,
    hideArtworkInfo,
    setStatus
    // UI 값
  } = ctx;
  let clock = null;
  let potatoAccum = 0;
  function loop() {
    let delta = clock.getDelta();
    if (gpuInfo.soft) {
      potatoAccum += delta;
      if (potatoAccum < 0.034) return;
      delta = potatoAccum;
      potatoAccum = 0;
    }
    try {
      if (flyController) flyController.update(delta);
      player.update(delta);
      const mp = multiplayerController.getMp();
      if (mp) player.resolveBodyCollisions(mp.getAvatarPositions());
      viewfxController.updateTween(delta);
      tourController.tick(delta);
      sceneTick(delta);
      viewfxController.updateFloorIndicator();
      multiplayerController.tick(delta);
      viewfxController.tickOnboarding();
      selfViewController.tick(delta);
      const nearby = getNearbyArtwork(camera.position);
      if (nearby) {
        showArtworkInfo(nearby);
      } else {
        hideArtworkInfo();
      }
      perfGovernor.tick(delta);
      if (selfViewController.isThirdPerson() && selfViewController.getSelfAvatar()) {
        selfViewController.applySelfCamOffset();
        renderer.render(scene, camera);
        selfViewController.restoreSelfCamOffset();
      } else {
        renderer.render(scene, camera);
      }
    } catch (err) {
      console.error("\uB80C\uB354 \uB8E8\uD504 \uC624\uB958:", err);
      renderer.setAnimationLoop(null);
      setStatus("\uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uD398\uC774\uC9C0\uB97C \uC0C8\uB85C\uACE0\uCE68\uD574 \uC8FC\uC138\uC694.");
    }
  }
  function start() {
    clock = new THREE.Clock();
    renderer.setAnimationLoop(loop);
  }
  return { start };
}
export {
  createGameLoop
};
