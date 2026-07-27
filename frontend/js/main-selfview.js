import * as THREE from "three";
function createSelfViewController(ctx) {
  const {
    getScene,
    getCamera,
    getPlayer,
    getSelfInfo,
    isEntered,
    createAvatarInstance,
    EYE_HEIGHT,
    setStatus,
    setDockActive
  } = ctx;
  const SELF_CAM_DIST = 3;
  const SELF_CAM_RISE = 0.7;
  const SELF_CAM_TILT = -0.2;
  let thirdPerson = false;
  let selfAvatar = null;
  let selfPrev = null;
  let selfSpeed = 0;
  const _selfCamSaved = new THREE.Vector3();
  const _selfCamBack = new THREE.Vector3();
  const _selfCamQuatSaved = new THREE.Quaternion();
  function toggle() {
    if (!isEntered()) return;
    thirdPerson = !thirdPerson;
    if (thirdPerson) {
      const info = getSelfInfo();
      if (!selfAvatar && info) {
        try {
          selfAvatar = createAvatarInstance(info.char, info.color, " ");
          selfAvatar.group.traverse((o) => {
            if (o.isSprite) o.visible = false;
          });
          getScene().add(selfAvatar.group);
        } catch (err) {
          console.warn("\uB0B4 \uC544\uBC14\uD0C0 \uC0DD\uC131 \uC2E4\uD328:", err);
          selfAvatar = null;
          thirdPerson = false;
          return;
        }
      }
      if (!selfAvatar) {
        thirdPerson = false;
        return;
      }
      selfAvatar.group.visible = true;
      setDockActive("self", true);
      selfPrev = null;
      selfSpeed = 0;
      setStatus("\uB0B4 \uBAA8\uC2B5 \uBCF4\uAE30 \u2014 V\uD0A4 \uB610\uB294 [\uC2DC\uC810] \uBC84\uD2BC\uC73C\uB85C \uBCF5\uADC0");
    } else if (selfAvatar) {
      selfAvatar.group.visible = false;
      setDockActive("self", false);
    }
  }
  function rebuildAvatar(char) {
    if (!selfAvatar) return;
    const prevGroup = selfAvatar.group;
    const wasVisible = prevGroup.visible;
    const pos = prevGroup.position.clone();
    const ry = prevGroup.rotation.y;
    try {
      const info = getSelfInfo();
      const next = createAvatarInstance(char, info && info.color || "#3498db", " ");
      next.group.traverse((o) => {
        if (o.isSprite) o.visible = false;
      });
      next.group.position.copy(pos);
      next.group.rotation.y = ry;
      next.group.visible = wasVisible;
      getScene().add(next.group);
      getScene().remove(prevGroup);
      selfAvatar.dispose();
      selfAvatar = next;
    } catch (err) {
      console.warn("\uB0B4 \uC544\uBC14\uD0C0 \uAC31\uC2E0 \uC2E4\uD328:", err);
    }
  }
  function applySelfCamOffset() {
    const camera = getCamera();
    _selfCamSaved.copy(camera.position);
    _selfCamQuatSaved.copy(camera.quaternion);
    _selfCamBack.set(0, 0, 1).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(_selfCamBack, SELF_CAM_DIST);
    camera.position.y += SELF_CAM_RISE;
    camera.rotateX(SELF_CAM_TILT);
  }
  function restoreSelfCamOffset() {
    const camera = getCamera();
    camera.position.copy(_selfCamSaved);
    camera.quaternion.copy(_selfCamQuatSaved);
  }
  function tick(delta) {
    if (thirdPerson && selfAvatar) {
      const st = getPlayer().getState();
      selfAvatar.group.position.set(st.x, st.y - EYE_HEIGHT, st.z);
      selfAvatar.group.rotation.y = st.ry;
      if (!selfPrev) selfPrev = { x: st.x, z: st.z };
      const raw = delta > 0 ? Math.hypot(st.x - selfPrev.x, st.z - selfPrev.z) / delta : 0;
      selfSpeed += (raw - selfSpeed) * Math.min(1, 10 * delta);
      selfPrev.x = st.x;
      selfPrev.z = st.z;
      selfAvatar.update(delta, selfSpeed);
    }
  }
  return {
    tick,
    toggle,
    rebuildAvatar,
    applySelfCamOffset,
    restoreSelfCamOffset,
    isThirdPerson: () => thirdPerson,
    getSelfAvatar: () => selfAvatar,
    // 셀프캠 후퇴 거리 — 때리기(bindHitTap) 레이캐스터가 3인칭 카메라 후퇴분을 사거리에
    // 더할 때 읽는다. 셀프캠 상수의 SSOT는 이 컨트롤러이므로 값 복제 대신 getter로 노출한다.
    getSelfCamDist: () => SELF_CAM_DIST
  };
}
export {
  createSelfViewController
};
