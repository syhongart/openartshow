import * as THREE from "three";
import { CHIBI_ACTION_DUR } from "./chibi-anim.js";
class ChibiAnimationV2 {
  skeleton;
  state = {
    currentAction: null,
    actionTime: 0,
    isLooping: false,
    speed: 0,
    walkPhase: 0,
    idleTime: 0
  };
  bones = /* @__PURE__ */ new Map();
  baseRotations = /* @__PURE__ */ new Map();
  baseMeshPosition;
  constructor(skeleton, meshPosition) {
    this.skeleton = skeleton;
    this.baseMeshPosition = meshPosition.clone();
    this.mapBones();
    this.saveBaseRotations();
  }
  /**
   * 본 맵핑
   */
  mapBones() {
    const boneNames = [
      "Hips",
      "Spine",
      "Chest",
      "Neck",
      "Head",
      "LeftShoulder",
      "LeftUpperArm",
      "LeftForeArm",
      "LeftHand",
      "RightShoulder",
      "RightUpperArm",
      "RightForeArm",
      "RightHand",
      "LeftUpperLeg",
      "LeftLowerLeg",
      "LeftFoot",
      "RightUpperLeg",
      "RightLowerLeg",
      "RightFoot"
    ];
    for (const name of boneNames) {
      const bone = this.findBone(name);
      if (bone) {
        this.bones.set(name, bone);
      }
    }
  }
  /**
   * 기본 회전 저장
   */
  saveBaseRotations() {
    this.bones.forEach((bone, name) => {
      this.baseRotations.set(name, bone.quaternion.clone());
    });
  }
  /**
   * 본 찾기
   */
  findBone(name) {
    for (const bone of this.skeleton.bones) {
      if (bone.name === name) {
        return bone;
      }
      const found = this.searchBone(bone, name);
      if (found) return found;
    }
    return null;
  }
  /**
   * 본 재귀 탐색
   */
  searchBone(parent, targetName) {
    for (const child of parent.children) {
      if (child instanceof THREE.Bone && child.name === targetName) {
        return child;
      }
      if (child instanceof THREE.Bone) {
        const found = this.searchBone(child, targetName);
        if (found) return found;
      }
    }
    return null;
  }
  /**
   * 액션 재생
   */
  playAction(actionName) {
    const duration = CHIBI_ACTION_DUR[actionName];
    if (!duration) {
      console.warn(`Action not found: ${actionName}`);
      return;
    }
    this.state.currentAction = actionName;
    this.state.actionTime = 0;
    this.state.isLooping = false;
    this.setupActionAnimation(actionName);
  }
  /**
   * 액션별 본 애니메이션 설정
   */
  setupActionAnimation(actionName) {
    const duration = CHIBI_ACTION_DUR[actionName];
    switch (actionName) {
      case "wave":
        this.animateWave(duration);
        break;
      case "jump":
        this.animateJump(duration);
        break;
      case "bow":
        this.animateBow(duration);
        break;
      case "clap":
        this.animateClap(duration);
        break;
      case "dance":
        this.animateDance(duration);
        break;
      case "kick":
        this.animateKick(duration);
        break;
      case "breakdance":
        this.animateBreakdance(duration);
        break;
      case "run":
        this.animateRun(duration);
        break;
      case "sit":
        this.animateSit(duration);
        break;
      case "jumpingjack":
        this.animateJumpingJack(duration);
        break;
      case "heart":
        this.animateHeart(duration);
        break;
      case "sulk":
        this.animateSulk(duration);
        break;
    }
  }
  /**
   * 인사 (wave)
   */
  animateWave(duration) {
    const leftArm = this.bones.get("LeftUpperArm");
    if (leftArm) {
      const baseRot = this.baseRotations.get("LeftUpperArm");
      const swingAxis = new THREE.Vector3(0, 0, 1);
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(swingAxis, Math.PI / 4);
      leftArm.quaternion.multiplyQuaternions(baseRot, rotation);
    }
  }
  /**
   * 점프 (jump)
   */
  animateJump(duration) {
    const hips = this.bones.get("Hips");
    if (hips) {
      const jumpHeight = 0.5;
      const progress = this.state.actionTime / duration;
      const arc = Math.sin(progress * Math.PI) * jumpHeight;
      hips.position.y = arc;
    }
  }
  /**
   * 절 (bow)
   */
  animateBow(duration) {
    const spine = this.bones.get("Spine");
    if (spine) {
      const baseRot = this.baseRotations.get("Spine");
      const progress = Math.min(this.state.actionTime / (duration * 0.5), 1);
      const bendAngle = progress * (Math.PI / 3);
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), bendAngle);
      spine.quaternion.multiplyQuaternions(baseRot, rotation);
    }
  }
  /**
   * 박수 (clap)
   */
  animateClap(duration) {
    const leftArm = this.bones.get("LeftUpperArm");
    const rightArm = this.bones.get("RightUpperArm");
    const progress = this.state.actionTime / duration;
    const clapPhase = Math.sin(progress * Math.PI * 4);
    if (leftArm) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        clapPhase * (Math.PI / 6)
      );
      leftArm.quaternion.copy(rotation);
    }
    if (rightArm) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        -clapPhase * (Math.PI / 6)
      );
      rightArm.quaternion.copy(rotation);
    }
  }
  /**
   * 춤 (dance)
   */
  animateDance(duration) {
    const hips = this.bones.get("Hips");
    const chest = this.bones.get("Chest");
    const progress = this.state.actionTime / duration;
    const swayAmount = Math.sin(progress * Math.PI * 2) * 0.3;
    if (hips) {
      hips.position.z = swayAmount;
    }
    if (chest) {
      const baseRot = this.baseRotations.get("Chest");
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        swayAmount * (Math.PI / 4)
      );
      chest.quaternion.multiplyQuaternions(baseRot, rotation);
    }
  }
  /**
   * 발차기 (kick)
   */
  animateKick(duration) {
    const rightLeg = this.bones.get("RightUpperLeg");
    if (rightLeg) {
      const progress = Math.min(this.state.actionTime / (duration * 0.6), 1);
      const kickAngle = progress * (Math.PI / 2);
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), kickAngle);
      rightLeg.quaternion.copy(rotation);
    }
  }
  /**
   * 브레이크댄스 (breakdance)
   */
  animateBreakdance(duration) {
    const head = this.bones.get("Head");
    const hips = this.bones.get("Hips");
    const progress = this.state.actionTime / duration;
    const spinSpeed = progress * Math.PI * 4;
    if (head) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), spinSpeed);
      head.quaternion.copy(rotation);
    }
    if (hips) {
      const bounce = Math.sin(progress * Math.PI * 4) * 0.1;
      hips.position.y = bounce;
    }
  }
  /**
   * 달리기 (run)
   */
  animateRun(duration) {
    const progress = this.state.actionTime / duration;
    const legSwing = Math.sin(progress * Math.PI * 4) * 0.5;
    const leftLeg = this.bones.get("LeftUpperLeg");
    const rightLeg = this.bones.get("RightUpperLeg");
    if (leftLeg) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), legSwing);
      leftLeg.quaternion.copy(rotation);
    }
    if (rightLeg) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -legSwing);
      rightLeg.quaternion.copy(rotation);
    }
  }
  /**
   * 앉기 (sit)
   */
  animateSit(duration) {
    const progress = Math.min(this.state.actionTime / (duration * 0.5), 1);
    const hips = this.bones.get("Hips");
    if (hips) {
      hips.position.y = -0.4 * progress;
    }
    const leftLeg = this.bones.get("LeftUpperLeg");
    const rightLeg = this.bones.get("RightUpperLeg");
    if (leftLeg) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), progress * (Math.PI / 2));
      leftLeg.quaternion.copy(rotation);
    }
    if (rightLeg) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), progress * (Math.PI / 2));
      rightLeg.quaternion.copy(rotation);
    }
  }
  /**
   * 팔벌려뛰기 (jumpingjack)
   */
  animateJumpingJack(duration) {
    const progress = this.state.actionTime / duration;
    const bobAmount = Math.sin(progress * Math.PI * 2) * 0.3;
    const hips = this.bones.get("Hips");
    if (hips) {
      hips.position.y = bobAmount;
    }
    const leftArm = this.bones.get("LeftUpperArm");
    const rightArm = this.bones.get("RightUpperArm");
    if (leftArm) {
      const rotation = new THREE.Quaternion();
      const armAngle = Math.sin(progress * Math.PI * 2) * (Math.PI / 2);
      rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), armAngle);
      leftArm.quaternion.copy(rotation);
    }
    if (rightArm) {
      const rotation = new THREE.Quaternion();
      const armAngle = Math.sin(progress * Math.PI * 2 + Math.PI) * (Math.PI / 2);
      rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), armAngle);
      rightArm.quaternion.copy(rotation);
    }
  }
  /**
   * 하트 (heart)
   */
  animateHeart(duration) {
    const chest = this.bones.get("Chest");
    if (chest) {
      const progress = this.state.actionTime / duration;
      const pulse = Math.sin(progress * Math.PI * 4) * 0.1;
      chest.scale.set(1 + pulse, 1 + pulse, 1 + pulse);
    }
  }
  /**
   * 삐짐 (sulk)
   */
  animateSulk(duration) {
    const head = this.bones.get("Head");
    if (head) {
      const progress = this.state.actionTime / duration;
      const tiltAmount = Math.sin(progress * Math.PI * 2) * (Math.PI / 12);
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tiltAmount);
      head.quaternion.copy(rotation);
    }
  }
  /**
   * 걷기 애니메이션 루프
   */
  updateWalk(delta) {
    this.state.walkPhase += delta * (2 + 6 * Math.min(this.state.speed, 2));
    const swing = Math.sin(this.state.walkPhase);
    const w = Math.min(1, this.state.speed / 1.3);
    const leftLeg = this.bones.get("LeftUpperLeg");
    if (leftLeg) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), swing * 0.6 * w);
      leftLeg.quaternion.copy(rotation);
    }
    const rightLeg = this.bones.get("RightUpperLeg");
    if (rightLeg) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -swing * 0.6 * w);
      rightLeg.quaternion.copy(rotation);
    }
    const leftArm = this.bones.get("LeftUpperArm");
    if (leftArm) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -swing * 0.3 * w);
      leftArm.quaternion.copy(rotation);
    }
    const rightArm = this.bones.get("RightUpperArm");
    if (rightArm) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), swing * 0.3 * w);
      rightArm.quaternion.copy(rotation);
    }
    const hips = this.bones.get("Hips");
    if (hips) {
      hips.position.y = Math.abs(Math.cos(this.state.walkPhase)) * 0.03 * w;
    }
  }
  /**
   * 호흡 애니메이션 (대기 중)
   */
  updateIdle(delta) {
    this.state.idleTime += delta;
    const breathing = Math.sin(this.state.idleTime * 1.5) * 0.05;
    const chest = this.bones.get("Chest");
    if (chest) {
      const rotation = new THREE.Quaternion();
      rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), breathing);
      chest.quaternion.copy(rotation);
    }
  }
  /**
   * 프레임 업데이트
   */
  update(delta) {
    if (this.state.currentAction) {
      this.state.actionTime += delta;
      const duration = CHIBI_ACTION_DUR[this.state.currentAction];
      if (this.state.actionTime >= duration) {
        this.state.currentAction = null;
        this.resetBones();
      }
    } else {
      if (this.state.speed > 0.01) {
        this.updateWalk(delta);
      } else {
        this.updateIdle(delta);
      }
    }
  }
  /**
   * 모든 본을 기본 상태로 리셋
   */
  resetBones() {
    this.bones.forEach((bone, name) => {
      const baseRot = this.baseRotations.get(name);
      if (baseRot) {
        bone.quaternion.copy(baseRot);
      }
      bone.position.set(0, 0, 0);
      bone.scale.set(1, 1, 1);
    });
  }
  /**
   * 이동 속도 설정
   */
  setSpeed(speed) {
    this.state.speed = Math.max(0, speed);
  }
  /**
   * 현재 상태 반환
   */
  getState() {
    return { ...this.state };
  }
}
export {
  ChibiAnimationV2
};
