import * as THREE from "three";
import { easeInOutCubic, lerpAngle } from "./main-math.js";
import { BUILDING, EYE_HEIGHT } from "./config.js";
function createViewFx(ctx) {
  const {
    camera,
    // 값 — init 1회 대입 후 안정
    player,
    // 값 — init 1회 대입 후 안정
    isEntered,
    // getter — 입장 여부 (층안내 게이트)
    setStatus
    // 값 — UI
  } = ctx;
  let tween = null;
  const TWEEN_MIN_DURATION = 0.8;
  const TWEEN_MAX_DURATION = 2.2;
  const tweenEuler = new THREE.Euler(0, 0, 0, "YXZ");
  function startTween(toPose, onDone) {
    const cur = player.getState();
    const toY = typeof toPose.y === "number" ? toPose.y : cur.y;
    const dx = toPose.x - cur.x;
    const dy = toY - cur.y;
    const dz = toPose.z - cur.z;
    const dist = Math.hypot(dx, dy, dz);
    const duration = THREE.MathUtils.clamp(
      TWEEN_MIN_DURATION + dist * 0.035,
      TWEEN_MIN_DURATION,
      TWEEN_MAX_DURATION
    );
    player.disable();
    tween = {
      fromX: cur.x,
      fromY: cur.y,
      fromZ: cur.z,
      fromRy: cur.ry,
      toX: toPose.x,
      toY,
      toZ: toPose.z,
      toRy: toPose.ry,
      duration,
      elapsed: 0,
      onDone: onDone || null
    };
  }
  function updateTween(delta) {
    if (!tween) return;
    tween.elapsed += delta;
    const t = Math.min(1, tween.elapsed / tween.duration);
    const e = easeInOutCubic(t);
    const x = tween.fromX + (tween.toX - tween.fromX) * e;
    const y = tween.fromY + (tween.toY - tween.fromY) * e;
    const z = tween.fromZ + (tween.toZ - tween.fromZ) * e;
    const ry = lerpAngle(tween.fromRy, tween.toRy, e);
    camera.position.set(x, y, z);
    tweenEuler.set(0, ry, 0, "YXZ");
    camera.quaternion.setFromEuler(tweenEuler);
    if (t >= 1) {
      const done = tween.onDone;
      tween = null;
      if (done) done();
    }
  }
  function getTween() {
    return tween;
  }
  function clearTween() {
    tween = null;
  }
  let currentFloorId = null;
  function updateFloorIndicator() {
    if (!isEntered()) return;
    const y = camera.position.y - EYE_HEIGHT;
    let best = null;
    for (const f of BUILDING.floors) {
      if (y >= f.y - 0.9 && (best === null || f.y > best.y)) best = f;
    }
    if (!best) return;
    if (currentFloorId === null) {
      currentFloorId = best.id;
      return;
    }
    if (best.id !== currentFloorId) {
      currentFloorId = best.id;
      setStatus(best.name);
    }
  }
  const ONBOARD_KEY = "lu-onboard-v1";
  let onboardStep = -1;
  let onboardRing = null;
  let onboardPos0 = null;
  let onboardYaw0 = 0;
  let onboardDoneT = 0;
  function startOnboarding() {
    try {
      if (localStorage.getItem(ONBOARD_KEY)) return;
    } catch (_) {
    }
    if (!(typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches)) return;
    onboardStep = 0;
    const st = player.getState();
    onboardPos0 = { x: st.x, z: st.z };
    const styleTag = document.createElement("style");
    styleTag.textContent = "@keyframes lu-ob-pulse { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} 70%{transform:translate(-50%,-50%) scale(1.25);opacity:0.2;} 100%{transform:translate(-50%,-50%) scale(1);opacity:0.75;} }";
    document.head.appendChild(styleTag);
    onboardRing = document.createElement("div");
    onboardRing.style.cssText = "position:fixed;left:24%;bottom:22%;width:110px;height:110px;border-radius:50%;border:3px solid rgba(255,253,247,0.85);pointer-events:none;z-index:60;transform:translate(-50%,-50%);animation:lu-ob-pulse 1.6s ease-in-out infinite;";
    document.body.appendChild(onboardRing);
    setStatus("\uC67C\uCABD \uD654\uBA74\uC744 \uB204\uB978 \uCC44 \uBC00\uBA74 \uAC78\uC5B4\uC694 \u{1F6B6}");
  }
  function tickOnboarding() {
    if (onboardStep < 0) return;
    const st = player.getState();
    if (onboardStep === 0) {
      if (Math.hypot(st.x - onboardPos0.x, st.z - onboardPos0.z) > 1.5) {
        onboardStep = 1;
        onboardYaw0 = st.ry;
        if (onboardRing) {
          onboardRing.remove();
          onboardRing = null;
        }
        setStatus("\uC798\uD588\uC5B4\uC694! \uC624\uB978\uCABD \uD654\uBA74\uC744 \uC4F8\uBA74 \uC8FC\uC704\uB97C \uB458\uB7EC\uBD10\uC694 \u{1F440}");
      }
    } else if (onboardStep === 1) {
      let dy = st.ry - onboardYaw0;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      if (Math.abs(dy) > 0.6) {
        onboardStep = 2;
        onboardDoneT = 0;
        setStatus("\uC791\uD488\uC5D0 \uB2E4\uAC00\uAC00\uBA74 \uC124\uBA85\uC774 \uB098\uD0C0\uB098\uC694 \u2014 \uC5B4\uB824\uC6B0\uBA74 [\uD22C\uC5B4] \uBC84\uD2BC\uC744 \uB20C\uB7EC\uC694 \u{1F5BC}\uFE0F");
      }
    } else if (onboardStep === 2) {
      onboardDoneT += 1;
      if (onboardDoneT > 420) {
        onboardStep = -1;
        try {
          localStorage.setItem(ONBOARD_KEY, "1");
        } catch (_) {
        }
      }
    }
  }
  return {
    // 트윈
    startTween,
    updateTween,
    getTween,
    clearTween,
    // 층안내
    updateFloorIndicator,
    // 온보딩
    startOnboarding,
    tickOnboarding
  };
}
export {
  createViewFx
};
