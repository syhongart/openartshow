import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {
  createChibiShaderMaterial,
  initializeVertexColors
} from "./chibi-shader-v2";
import { drawFaceCanvas } from "./chibi-face";
import { toonRamp, vivid, vividSkin } from "./chibi-materials";
import { CHIBI_ACTION_DUR } from "./chibi-anim";
import { ChibiAnimationV2 } from "./chibi-animation-v2";
const gltfLoader = new GLTFLoader();
const MODEL_BASE_PATH = "/app/assets/models";
function createPrototypeChibiMesh() {
  const geometries = [];
  const materials = [];
  const headGeo = new THREE.SphereGeometry(0.15, 16, 16);
  headGeo.translate(0, 0.5, 0);
  geometries.push(headGeo);
  const torsoGeo = new THREE.CapsuleGeometry(0.08, 0.25, 8, 8);
  torsoGeo.translate(0, 0.2, 0);
  geometries.push(torsoGeo);
  const leftArmGeo = new THREE.CapsuleGeometry(0.04, 0.2, 4, 8);
  leftArmGeo.translate(-0.12, 0.35, 0);
  geometries.push(leftArmGeo);
  const rightArmGeo = new THREE.CapsuleGeometry(0.04, 0.2, 4, 8);
  rightArmGeo.translate(0.12, 0.35, 0);
  geometries.push(rightArmGeo);
  const leftLegGeo = new THREE.CapsuleGeometry(0.05, 0.3, 4, 8);
  leftLegGeo.translate(-0.06, -0.05, 0);
  geometries.push(leftLegGeo);
  const rightLegGeo = new THREE.CapsuleGeometry(0.05, 0.3, 4, 8);
  rightLegGeo.translate(0.06, -0.05, 0);
  geometries.push(rightLegGeo);
  const mergedGeo = THREE.BufferGeometryUtils.mergeGeometries(geometries);
  mergedGeo.computeVertexNormals();
  initializeVertexColors(mergedGeo);
  const bones = [];
  const boneData = createPrototypeSkeleton();
  const material = createChibiShaderMaterial({
    gradientMap: toonRamp(),
    skinColor: new THREE.Color(
      vividSkin(new THREE.Color(16767916))
    ),
    hairColor: new THREE.Color(vivid(new THREE.Color(2894892))),
    clothColor: new THREE.Color(vivid(new THREE.Color(4491468)))
  });
  const skinnedMesh = new THREE.SkinnedMesh(mergedGeo, material);
  skinnedMesh.add(boneData.armature);
  skinnedMesh.bind(boneData.skeleton);
  return skinnedMesh;
}
function createPrototypeSkeleton() {
  const armature = new THREE.Bone();
  const bones = {};
  const hips = new THREE.Bone();
  bones["Hips"] = hips;
  armature.add(hips);
  const spine = new THREE.Bone();
  bones["Spine"] = spine;
  hips.add(spine);
  const chest = new THREE.Bone();
  bones["Chest"] = chest;
  spine.add(chest);
  const neck = new THREE.Bone();
  bones["Neck"] = neck;
  chest.add(neck);
  const head = new THREE.Bone();
  bones["Head"] = head;
  head.position.y = 0.5;
  neck.add(head);
  const leftShoulder = new THREE.Bone();
  bones["LeftShoulder"] = leftShoulder;
  leftShoulder.position.set(-0.12, 0.35, 0);
  chest.add(leftShoulder);
  const leftUpperArm = new THREE.Bone();
  bones["LeftUpperArm"] = leftUpperArm;
  leftShoulder.add(leftUpperArm);
  const rightShoulder = new THREE.Bone();
  bones["RightShoulder"] = rightShoulder;
  rightShoulder.position.set(0.12, 0.35, 0);
  chest.add(rightShoulder);
  const rightUpperArm = new THREE.Bone();
  bones["RightUpperArm"] = rightUpperArm;
  rightShoulder.add(rightUpperArm);
  const leftUpperLeg = new THREE.Bone();
  bones["LeftUpperLeg"] = leftUpperLeg;
  leftUpperLeg.position.set(-0.06, -0.05, 0);
  hips.add(leftUpperLeg);
  const leftLowerLeg = new THREE.Bone();
  bones["LeftLowerLeg"] = leftLowerLeg;
  leftUpperLeg.add(leftLowerLeg);
  const rightUpperLeg = new THREE.Bone();
  bones["RightUpperLeg"] = rightUpperLeg;
  rightUpperLeg.position.set(0.06, -0.05, 0);
  hips.add(rightUpperLeg);
  const rightLowerLeg = new THREE.Bone();
  bones["RightLowerLeg"] = rightLowerLeg;
  rightUpperLeg.add(rightLowerLeg);
  const allBones = Object.values(bones);
  const skeleton = new THREE.Skeleton(allBones);
  return { armature, skeleton, bones };
}
async function loadGLB(path) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(path, (gltf) => {
      resolve(gltf.scene);
    }, void 0, reject);
  });
}
async function loadBodyMeshAsync() {
  try {
    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(
        `${MODEL_BASE_PATH}/body-base.gltf`,
        resolve,
        void 0,
        reject
      );
    });
    const bodyMesh = gltf.scene.children.find(
      (c) => c instanceof THREE.SkinnedMesh
    );
    return bodyMesh || null;
  } catch (error) {
    console.warn("Failed to load body-base.gltf, using prototype:", error);
    return null;
  }
}
function buildChibiV2(params) {
  try {
    const bodyMesh = createPrototypeChibiMesh();
    let glbLoadedMesh = null;
    loadBodyMeshAsync().then((mesh) => {
      if (mesh && bodyMesh.parent) {
        glbLoadedMesh = mesh;
        console.log("\u2705 GLB loaded successfully (background)");
      }
    });
    const material = createChibiShaderMaterial({
      gradientMap: toonRamp(),
      skinColor: new THREE.Color(
        vividSkin(new THREE.Color(params.skinColor || 16767916))
      ),
      hairColor: new THREE.Color(vivid(new THREE.Color(params.hairColor || 2894892))),
      clothColor: new THREE.Color(vivid(new THREE.Color(params.topColor || 4491468))),
      accessoryColor: new THREE.Color(vivid(new THREE.Color(params.accColor || 16755200)))
    });
    bodyMesh.material = material;
    initializeVertexColors(bodyMesh.geometry);
    const faceCanvas = drawFaceCanvas(params);
    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    faceTexture.anisotropy = 4;
    material.uniforms.map.value = faceTexture;
    const animController = new ChibiAnimationV2(bodyMesh.skeleton, bodyMesh.position);
    const group = new THREE.Group();
    group.add(bodyMesh);
    const update = (delta, speed = 0) => {
      animController.setSpeed(speed);
      animController.update(delta);
    };
    const playAction = (name) => {
      animController.playAction(name);
    };
    const setColor = (part, hex) => {
      const color = vivid(new THREE.Color(hex));
      switch (part) {
        case "skin":
          material.uniforms.skinColor.value.setHex(hex);
          break;
        case "hair":
          material.uniforms.hairColor.value.setHex(hex);
          break;
        case "cloth":
          material.uniforms.clothColor.value.setHex(hex);
          break;
        case "accessory":
          material.uniforms.accessoryColor.value.setHex(hex);
          break;
      }
      material.uniforms[part + "Color"].needsUpdate = true;
    };
    const refreshFace = (expr, wound) => {
      const newCanvas = drawFaceCanvas(params, expr, wound);
      const newTexture = new THREE.CanvasTexture(newCanvas);
      newTexture.colorSpace = THREE.SRGBColorSpace;
      material.uniforms.map.value = newTexture;
      material.uniforms.map.needsUpdate = true;
    };
    const dispose = () => {
      bodyMesh.geometry.dispose();
      material.dispose();
    };
    return {
      group,
      mesh: bodyMesh,
      material,
      skeleton: bodyMesh.skeleton,
      animations: [],
      // v2는 skeleton FK 기반이므로 clips 불필요
      mixer: null,
      // 호환성을 위해 null
      update,
      playAction,
      setColor,
      refreshFace,
      dispose,
      animController
    };
  } catch (error) {
    console.error("Failed to build ChibiV2:", error);
    throw error;
  }
}
async function attachModules(bodyMesh, params) {
  try {
    if (params.hairStyle && params.hairStyle !== "none") {
      const hairGroup = await loadGLB(
        `${MODEL_BASE_PATH}/hair/${params.hairStyle}.glb`
      );
      const hairMesh = hairGroup.children.find(
        (c) => c instanceof THREE.SkinnedMesh || c instanceof THREE.Mesh
      );
      if (hairMesh) {
        const headBone = findBone(bodyMesh.skeleton, "Head");
        if (headBone) {
          hairMesh.position.copy(headBone.position);
          hairMesh.quaternion.copy(headBone.quaternion);
          bodyMesh.add(hairMesh);
        }
      }
    }
    if (params.outfit && params.outfit !== "none") {
      const outfitGroup = await loadGLB(
        `${MODEL_BASE_PATH}/clothes/${params.outfit}.glb`
      );
      const outfitMesh = outfitGroup.children.find(
        (c) => c instanceof THREE.Mesh
      );
      if (outfitMesh) {
        bodyMesh.add(outfitMesh);
      }
    }
  } catch (error) {
    console.warn("Failed to attach modules:", error);
  }
}
function setupAnimations(mesh, params) {
  const clips = [];
  clips.push(createWalkAnimation(mesh.skeleton));
  clips.push(createIdleAnimation(mesh.skeleton));
  for (const [actionName, duration] of Object.entries(CHIBI_ACTION_DUR)) {
    clips.push(createActionAnimation(mesh.skeleton, actionName, duration));
  }
  return clips;
}
function createWalkAnimation(skeleton) {
  const tracks = [];
  const duration = 1;
  const leftLegBone = findBone(skeleton, "LeftUpperLeg");
  if (leftLegBone) {
    const rotationTrack = new THREE.QuaternionKeyframeTrack(
      `${leftLegBone.uuid}.quaternion`,
      [0, 0.25, 0.5, 0.75, 1],
      [
        0,
        0,
        0,
        1,
        // neutral
        0.3,
        0,
        0,
        0.95,
        // forward swing
        0,
        0,
        0,
        1,
        // neutral
        -0.3,
        0,
        0,
        0.95,
        // backward swing
        0,
        0,
        0,
        1
        // neutral
      ]
    );
    tracks.push(rotationTrack);
  }
  const rightLegBone = findBone(skeleton, "RightUpperLeg");
  if (rightLegBone) {
    const rotationTrack = new THREE.QuaternionKeyframeTrack(
      `${rightLegBone.uuid}.quaternion`,
      [0, 0.25, 0.5, 0.75, 1],
      [
        0,
        0,
        0,
        1,
        -0.3,
        0,
        0,
        0.95,
        0,
        0,
        0,
        1,
        0.3,
        0,
        0,
        0.95,
        0,
        0,
        0,
        1
      ]
    );
    tracks.push(rotationTrack);
  }
  return new THREE.AnimationClip("walk", duration, tracks);
}
function createIdleAnimation(skeleton) {
  const tracks = [];
  const duration = 2;
  const chestBone = findBone(skeleton, "Chest");
  if (chestBone) {
    const rotationTrack = new THREE.QuaternionKeyframeTrack(
      `${chestBone.uuid}.quaternion`,
      [0, 0.5, 1, 1.5, 2],
      [
        0,
        0,
        0,
        1,
        // neutral
        0.02,
        0,
        0,
        0.99998,
        // breathe in
        0,
        0,
        0,
        1,
        // neutral
        -0.02,
        0,
        0,
        0.99998,
        // breathe out
        0,
        0,
        0,
        1
        // neutral
      ]
    );
    tracks.push(rotationTrack);
  }
  return new THREE.AnimationClip("idle", duration, tracks);
}
function createActionAnimation(skeleton, actionName, duration) {
  const tracks = [];
  switch (actionName) {
    case "wave":
      const leftArmBone = findBone(skeleton, "LeftUpperArm");
      if (leftArmBone) {
        const track = new THREE.QuaternionKeyframeTrack(
          `${leftArmBone.uuid}.quaternion`,
          [0, 0.3, 0.6, duration],
          [
            0,
            0,
            0,
            1,
            // down
            0.3,
            0,
            0,
            0.95,
            // up
            0.3,
            0,
            0,
            0.95,
            // up
            0,
            0,
            0,
            1
            // down
          ]
        );
        tracks.push(track);
      }
      break;
    case "jump":
      const hipsBone = findBone(skeleton, "Hips");
      if (hipsBone) {
        const positionTrack = new THREE.VectorKeyframeTrack(
          `${hipsBone.uuid}.position`,
          [0, 0.3, 0.6, duration],
          [
            0,
            0,
            0,
            // start
            0,
            0.5,
            0,
            // peak
            0,
            0.5,
            0,
            // peak
            0,
            0,
            0
            // end
          ]
        );
        tracks.push(positionTrack);
      }
      break;
    case "bow":
      const chestBowBone = findBone(skeleton, "Chest");
      if (chestBowBone) {
        const track = new THREE.QuaternionKeyframeTrack(
          `${chestBowBone.uuid}.quaternion`,
          [0, 0.5, 1, duration],
          [
            0,
            0,
            0,
            1,
            // up
            0.5,
            0,
            0,
            0.87,
            // bent
            0.5,
            0,
            0,
            0.87
            // bent
          ]
        );
        tracks.push(track);
      }
      break;
    default:
      break;
  }
  return new THREE.AnimationClip(actionName, duration, tracks);
}
function findBone(skeleton, boneName) {
  for (const bone of skeleton.bones) {
    if (bone.name === boneName) {
      return bone;
    }
  }
  return null;
}
export {
  buildChibiV2
};
