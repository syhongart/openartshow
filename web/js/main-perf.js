import { readSpec, writeSpec, PX_BUDGET, MOBILE_PX_CAP, LITE_ENTER_FPS, LITE_EXIT_FPS, LITE_VISIBLE_NPCS } from "./main-spec.js";
const IS_MOBILE = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
function createPerfGovernor(ctx) {
  const {
    renderer,
    // 값 — init 1회 대입 후 안정
    camera,
    // 값 — init 1회 대입 후 안정 (applyNpcCulling 거리 정렬용)
    gpuInfo,
    // 값 — init probeGpu() 후 안정 ({ name, soft })
    getMp,
    // getter — 입장 전 null, 동적
    isEntered,
    // getter — 입장 여부 (lite 전환·섀도 warmup 게이트)
    setFPS,
    // 값 — UI
    setStatus
    // 값 — UI
  } = ctx;
  let liteMode = false;
  let liteToggleCooldown = 0;
  let liteCullAccum = 0;
  let shadowRebakeInterval = 0;
  let shadowRebakeAccum = 0;
  let shadowWarmupDone = false;
  let specFastTicks = 0;
  let fpsFrames = 0;
  let fpsElapsed = 0;
  function applyNpcCulling() {
    const mp = getMp();
    if (!mp) return;
    const npcs = [];
    for (const [rid, av] of mp.remoteAvatars) {
      if (rid.startsWith("npc-")) npcs.push(av);
    }
    if (!liteMode) {
      for (const av of npcs) av.group.visible = true;
      return;
    }
    npcs.sort((a, b) => a.group.position.distanceTo(camera.position) - b.group.position.distanceTo(camera.position));
    npcs.forEach((av, i) => {
      av.group.visible = i < LITE_VISIBLE_NPCS;
    });
  }
  function setShadowInterval(seconds) {
    shadowRebakeInterval = seconds;
  }
  function tick(delta) {
    const entered = isEntered();
    fpsFrames += 1;
    fpsElapsed += delta;
    if (fpsElapsed >= 0.5) {
      const fpsNow = fpsFrames / fpsElapsed;
      setFPS(Math.round(fpsNow));
      fpsFrames = 0;
      fpsElapsed = 0;
      liteToggleCooldown = Math.max(0, liteToggleCooldown - 0.5);
      if (liteToggleCooldown === 0 && entered) {
        if (!liteMode && fpsNow < LITE_ENTER_FPS) {
          liteMode = true;
          liteToggleCooldown = 10;
          if (fpsNow < 16) writeSpec("low");
          const dprNow = window.devicePixelRatio || 1;
          const liteCap = IS_MOBILE ? MOBILE_PX_CAP : Math.max(1, dprNow * 0.75);
          renderer.setPixelRatio(Math.min(renderer.getPixelRatio(), liteCap));
          setStatus("\uC6D0\uD65C\uD55C \uAD00\uB78C\uC744 \uC704\uD574 \uD654\uC9C8\uC744 \uC7A0\uC2DC \uB0AE\uCDC4\uC5B4\uC694");
        } else if (liteMode && fpsNow > LITE_EXIT_FPS) {
          liteMode = false;
          liteToggleCooldown = 10;
          applyNpcCulling();
        }
        if (!liteMode && fpsNow > 55) {
          specFastTicks += 1;
          if (specFastTicks >= 20) {
            const cur = readSpec();
            if (cur === "low") writeSpec(null);
            else if (cur === null && !IS_MOBILE) writeSpec("high");
            const maxHigh = Math.min(
              2.5,
              Math.sqrt(PX_BUDGET.high / (window.innerWidth * window.innerHeight))
            );
            const nowRatio = renderer.getPixelRatio();
            if (!gpuInfo.soft && !IS_MOBILE && nowRatio < maxHigh) {
              renderer.setPixelRatio(Math.min(maxHigh, nowRatio + 0.25));
              setStatus("\uD654\uC9C8\uC744 \uD55C \uB2E8\uACC4 \uB192\uC600\uC5B4\uC694 \u2728");
            }
            specFastTicks = 0;
          }
        } else {
          specFastTicks = 0;
        }
      }
    }
    liteCullAccum += delta;
    if (liteCullAccum >= 2) {
      liteCullAccum = 0;
      if (liteMode) applyNpcCulling();
    }
    if (shadowRebakeInterval > 0) {
      shadowRebakeAccum += delta;
      if (shadowRebakeAccum >= shadowRebakeInterval) {
        shadowRebakeAccum = 0;
        renderer.shadowMap.needsUpdate = true;
      }
    }
    if (!shadowWarmupDone && entered) {
      shadowWarmupDone = true;
      renderer.shadowMap.needsUpdate = true;
    }
  }
  return {
    tick,
    setShadowInterval,
    getLite: () => liteMode
    // ?debug=perf HUD 전용 접근자 — 적응형 저사양(lite) 실시간 상태 노출(로직 무변경, 순수 getter)
  };
}
export {
  createPerfGovernor
};
