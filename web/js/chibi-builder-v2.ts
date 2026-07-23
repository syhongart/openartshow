/**
 * 저폴리 스킨드 메시 캐릭터 빌더 (Ayamo 2.0)
 * GLB 로드 → 색상 적용 → 모듈 부착 → 애니메이션 설정
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import {
  createChibiShaderMaterial,
  assignPartColor,
  initializeVertexColors,
} from './chibi-shader-v2';
import { drawFaceCanvas } from './chibi-face';
import { toonRamp, vivid, vividSkin } from './chibi-materials';
import type { ChibiParams } from './chibi-schema';
import { CHIBI_ACTION_DUR } from './chibi-anim';

const gltfLoader = new GLTFLoader();
const MODEL_BASE_PATH = './assets/models';

interface ChibiV2Instance {
  group: THREE.Group;
  mesh: THREE.SkinnedMesh;
  material: THREE.ShaderMaterial;
  skeleton: THREE.Skeleton;
  animations: THREE.AnimationClip[];
  mixer: THREE.AnimationMixer;
  update: (delta: number) => void;
  dispose: () => void;
  playAction: (name: string) => void;
  setColor: (part: string, hex: number) => void;
  refreshFace: (expr?: any, wound?: number) => void;
}

/**
 * GLB 로드
 */
async function loadGLB(path: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(path, (gltf) => {
      resolve(gltf.scene);
    }, undefined, reject);
  });
}

/**
 * 저폴리 스킨드 메시 캐릭터 생성
 *
 * @param params 캐릭터 파라미터 (색상, 헤어스타일 등)
 * @returns ChibiV2Instance
 */
export async function buildChibiV2(params: ChibiParams): Promise<ChibiV2Instance> {
  try {
    // 1. Body GLB 로드
    const bodyGroup = await loadGLB(`${MODEL_BASE_PATH}/body-base.glb`);
    const bodyMesh = bodyGroup.children.find(
      (c) => c instanceof THREE.SkinnedMesh
    ) as THREE.SkinnedMesh;

    if (!bodyMesh) {
      throw new Error('Body SkinnedMesh not found in GLB');
    }

    // 2. 셰이더 머티리얼 생성
    const material = createChibiShaderMaterial({
      gradientMap: toonRamp(),
      skinColor: new THREE.Color(
        vividSkin(new THREE.Color(params.skinColor || 0xffdbac))
      ),
      hairColor: new THREE.Color(vivid(new THREE.Color(params.hairColor || 0x2c2c2c))),
      clothColor: new THREE.Color(vivid(new THREE.Color(params.topColor || 0x4488cc))),
      accessoryColor: new THREE.Color(vivid(new THREE.Color(params.accColor || 0xffaa00))),
    });

    bodyMesh.material = material as any;

    // 3. 정점 색상 초기화 (부위 판별용)
    initializeVertexColors(bodyMesh.geometry);

    // 4. 얼굴 텍스처 생성 및 적용
    const faceCanvas = drawFaceCanvas(params);
    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    faceTexture.anisotropy = 4;

    // Head 메시에 얼굴 텍스처 적용 (또는 별도 메시)
    const headMesh = bodyMesh.children?.find(
      (c) => (c as any).name === 'Head' || (c as any).name === 'head'
    ) as THREE.Mesh | undefined;

    if (headMesh) {
      (headMesh.material as THREE.MeshToonMaterial).map = faceTexture;
    } else {
      // 바디 자체에 적용 (모든 폴리곤이 통합된 경우)
      material.uniforms.map.value = faceTexture;
    }

    // 5. 모듈 부착 (헤어, 의상)
    await attachModules(bodyMesh, params);

    // 6. 애니메이션 설정
    const mixer = new THREE.AnimationMixer(bodyMesh);
    const animationClips = setupAnimations(bodyMesh, params);

    // 7. 루트 그룹 구성
    const group = new THREE.Group();
    group.add(bodyMesh);

    // 8. 업데이트 루프 (걷기, 호흡 등)
    let walkPhase = 0;
    let currentAction: string | null = null;
    let actionTime = 0;

    const update = (delta: number) => {
      mixer.update(delta);

      // 걷기/호흡 루프 (액션 중이 아닐 때)
      if (!currentAction) {
        walkPhase += delta * 3; // 걷기 주기
        const bob = Math.sin(walkPhase) * 0.02;
        bodyMesh.position.y = bob;

        // 가슴 회전 (호흡)
        const breathing = Math.sin(walkPhase * 0.5) * 0.05;
        if (bodyMesh.skeleton) {
          const chestBone = findBone(bodyMesh.skeleton, 'Chest');
          if (chestBone) {
            chestBone.rotation.x = breathing;
          }
        }
      }
    };

    const playAction = (name: string) => {
      const clip = THREE.AnimationClip.findByName(animationClips, name);
      if (clip) {
        const action = mixer.clipAction(clip);
        action.play();
        currentAction = name;
        actionTime = 0;
      }
    };

    const setColor = (part: string, hex: number) => {
      const color = vivid(new THREE.Color(hex));
      switch (part) {
        case 'skin':
          material.uniforms.skinColor.value.setHex(hex);
          break;
        case 'hair':
          material.uniforms.hairColor.value.setHex(hex);
          break;
        case 'cloth':
          material.uniforms.clothColor.value.setHex(hex);
          break;
        case 'accessory':
          material.uniforms.accessoryColor.value.setHex(hex);
          break;
      }
      material.uniforms[part + 'Color'].needsUpdate = true;
    };

    const refreshFace = (expr?: any, wound?: number) => {
      const newCanvas = drawFaceCanvas(params, expr, wound);
      const newTexture = new THREE.CanvasTexture(newCanvas);
      newTexture.colorSpace = THREE.SRGBColorSpace;
      material.uniforms.map.value = newTexture;
      material.uniforms.map.needsUpdate = true;
    };

    const dispose = () => {
      bodyMesh.geometry.dispose();
      (material as any).dispose();
      mixer.stopAllAction();
    };

    return {
      group,
      mesh: bodyMesh,
      material: material as any,
      skeleton: bodyMesh.skeleton,
      animations: animationClips,
      mixer,
      update,
      playAction,
      setColor,
      refreshFace,
      dispose,
    };
  } catch (error) {
    console.error('Failed to build ChibiV2:', error);
    throw error;
  }
}

/**
 * 모듈 부착 (헤어, 의상 등)
 */
async function attachModules(bodyMesh: THREE.SkinnedMesh, params: ChibiParams) {
  try {
    // 헤어 부착 (예: hairstyle-1.glb)
    if (params.hairStyle && params.hairStyle !== 'none') {
      const hairGroup = await loadGLB(
        `${MODEL_BASE_PATH}/hair/${params.hairStyle}.glb`
      );
      const hairMesh = hairGroup.children.find(
        (c) => c instanceof THREE.SkinnedMesh || c instanceof THREE.Mesh
      ) as THREE.Mesh | undefined;

      if (hairMesh) {
        // Head 본에 부착
        const headBone = findBone(bodyMesh.skeleton, 'Head');
        if (headBone) {
          hairMesh.position.copy(headBone.position);
          hairMesh.quaternion.copy(headBone.quaternion);
          bodyMesh.add(hairMesh);
        }
      }
    }

    // 의상 부착 (선택사항)
    if (params.outfit && params.outfit !== 'none') {
      const outfitGroup = await loadGLB(
        `${MODEL_BASE_PATH}/clothes/${params.outfit}.glb`
      );
      const outfitMesh = outfitGroup.children.find(
        (c) => c instanceof THREE.Mesh
      ) as THREE.Mesh | undefined;

      if (outfitMesh) {
        bodyMesh.add(outfitMesh);
      }
    }
  } catch (error) {
    console.warn('Failed to attach modules:', error);
    // 모듈 로드 실패는 무시하고 진행
  }
}

/**
 * 애니메이션 설정
 */
function setupAnimations(mesh: THREE.SkinnedMesh, params: ChibiParams): THREE.AnimationClip[] {
  const clips: THREE.AnimationClip[] = [];

  // 기본 걷기 애니메이션
  clips.push(createWalkAnimation(mesh.skeleton));

  // 대기 (호흡)
  clips.push(createIdleAnimation(mesh.skeleton));

  // 액션 애니메이션들 (wave, jump, bow, dance 등)
  for (const [actionName, duration] of Object.entries(CHIBI_ACTION_DUR)) {
    clips.push(createActionAnimation(mesh.skeleton, actionName, duration));
  }

  return clips;
}

/**
 * 걷기 애니메이션 생성
 */
function createWalkAnimation(skeleton: THREE.Skeleton): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = [];
  const duration = 1.0; // 1초 사이클

  // 왼쪽 다리 (High → Low)
  const leftLegBone = findBone(skeleton, 'LeftUpperLeg');
  if (leftLegBone) {
    const rotationTrack = new THREE.QuaternionKeyframeTrack(
      `${leftLegBone.uuid}.quaternion`,
      [0, 0.25, 0.5, 0.75, 1],
      [
        0, 0, 0, 1, // neutral
        0.3, 0, 0, 0.95, // forward swing
        0, 0, 0, 1, // neutral
        -0.3, 0, 0, 0.95, // backward swing
        0, 0, 0, 1, // neutral
      ]
    );
    tracks.push(rotationTrack);
  }

  // 오른쪽 다리 (반대)
  const rightLegBone = findBone(skeleton, 'RightUpperLeg');
  if (rightLegBone) {
    const rotationTrack = new THREE.QuaternionKeyframeTrack(
      `${rightLegBone.uuid}.quaternion`,
      [0, 0.25, 0.5, 0.75, 1],
      [
        0, 0, 0, 1,
        -0.3, 0, 0, 0.95,
        0, 0, 0, 1,
        0.3, 0, 0, 0.95,
        0, 0, 0, 1,
      ]
    );
    tracks.push(rotationTrack);
  }

  return new THREE.AnimationClip('walk', duration, tracks);
}

/**
 * 대기 (호흡) 애니메이션 생성
 */
function createIdleAnimation(skeleton: THREE.Skeleton): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = [];
  const duration = 2.0; // 2초 사이클

  // 가슴 호흡
  const chestBone = findBone(skeleton, 'Chest');
  if (chestBone) {
    const rotationTrack = new THREE.QuaternionKeyframeTrack(
      `${chestBone.uuid}.quaternion`,
      [0, 0.5, 1, 1.5, 2],
      [
        0, 0, 0, 1, // neutral
        0.02, 0, 0, 0.99998, // breathe in
        0, 0, 0, 1, // neutral
        -0.02, 0, 0, 0.99998, // breathe out
        0, 0, 0, 1, // neutral
      ]
    );
    tracks.push(rotationTrack);
  }

  return new THREE.AnimationClip('idle', duration, tracks);
}

/**
 * 액션 애니메이션 생성 (wave, jump, bow 등)
 */
function createActionAnimation(
  skeleton: THREE.Skeleton,
  actionName: string,
  duration: number
): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = [];

  switch (actionName) {
    case 'wave':
      // 왼쪽 팔 흔들기
      const leftArmBone = findBone(skeleton, 'LeftUpperArm');
      if (leftArmBone) {
        const track = new THREE.QuaternionKeyframeTrack(
          `${leftArmBone.uuid}.quaternion`,
          [0, 0.3, 0.6, duration],
          [
            0, 0, 0, 1, // down
            0.3, 0, 0, 0.95, // up
            0.3, 0, 0, 0.95, // up
            0, 0, 0, 1, // down
          ]
        );
        tracks.push(track);
      }
      break;

    case 'jump':
      // 위로 점프
      const hipsBone = findBone(skeleton, 'Hips');
      if (hipsBone) {
        const positionTrack = new THREE.VectorKeyframeTrack(
          `${hipsBone.uuid}.position`,
          [0, 0.3, 0.6, duration],
          [
            0, 0, 0, // start
            0, 0.5, 0, // peak
            0, 0.5, 0, // peak
            0, 0, 0, // end
          ]
        );
        tracks.push(positionTrack);
      }
      break;

    case 'bow':
      // 절하기 (가슴 앞으로)
      const chestBowBone = findBone(skeleton, 'Chest');
      if (chestBowBone) {
        const track = new THREE.QuaternionKeyframeTrack(
          `${chestBowBone.uuid}.quaternion`,
          [0, 0.5, 1, duration],
          [
            0, 0, 0, 1, // up
            0.5, 0, 0, 0.87, // bent
            0.5, 0, 0, 0.87, // bent
          ]
        );
        tracks.push(track);
      }
      break;

    default:
      // 기본 애니메이션 없음
      break;
  }

  return new THREE.AnimationClip(actionName, duration, tracks);
}

/**
 * Skeleton에서 본 찾기
 */
function findBone(skeleton: THREE.Skeleton, boneName: string): THREE.Bone | null {
  for (const bone of skeleton.bones) {
    if (bone.name === boneName) {
      return bone;
    }
  }
  return null;
}
