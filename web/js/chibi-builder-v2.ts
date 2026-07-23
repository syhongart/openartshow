/**
 * 저폴리 스킨드 메시 캐릭터 빌더 (Ayamo 2.0)
 * GLB 로드 → 색상 적용 → 모듈 부착 → 애니메이션 설정
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils';
import {
  createChibiShaderMaterial,
  assignPartColor,
  initializeVertexColors,
} from './chibi-shader-v2';
import { drawFaceCanvas } from './chibi-face';
import { toonRamp, vivid, vividSkin } from './chibi-materials';
import { CHIBI_ACTION_DUR } from './chibi-anim';
import { ChibiAnimationV2 } from './chibi-animation-v2';

type ChibiParams = any;

const gltfLoader = new GLTFLoader();
const MODEL_BASE_PATH = '/app/assets/models';

/**
 * 프로토타입 저폴리 메시 생성 (GLB 없을 때)
 * 기본 형태: 머리(구) + 몸통(캡슐) + 팔×2 + 다리×2
 */
function createPrototypeChibiMesh(): THREE.SkinnedMesh {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // 1. 머리 (구)
  const headGeo = new THREE.SphereGeometry(0.15, 16, 16);
  headGeo.translate(0, 0.5, 0);
  geometries.push(headGeo);

  // 2. 몸통 (캡슐)
  const torsoGeo = new THREE.CapsuleGeometry(0.08, 0.25, 8, 8);
  torsoGeo.translate(0, 0.2, 0);
  geometries.push(torsoGeo);

  // 3. 왼쪽 팔
  const leftArmGeo = new THREE.CapsuleGeometry(0.04, 0.2, 4, 8);
  leftArmGeo.translate(-0.12, 0.35, 0);
  geometries.push(leftArmGeo);

  // 4. 오른쪽 팔
  const rightArmGeo = new THREE.CapsuleGeometry(0.04, 0.2, 4, 8);
  rightArmGeo.translate(0.12, 0.35, 0);
  geometries.push(rightArmGeo);

  // 5. 왼쪽 다리
  const leftLegGeo = new THREE.CapsuleGeometry(0.05, 0.3, 4, 8);
  leftLegGeo.translate(-0.06, -0.05, 0);
  geometries.push(leftLegGeo);

  // 6. 오른쪽 다리
  const rightLegGeo = new THREE.CapsuleGeometry(0.05, 0.3, 4, 8);
  rightLegGeo.translate(0.06, -0.05, 0);
  geometries.push(rightLegGeo);

  // 통합 지오메트리
  const mergedGeo = THREE.BufferGeometryUtils.mergeGeometries(geometries);
  mergedGeo.computeVertexNormals();
  initializeVertexColors(mergedGeo);

  // 기본 스켈레톤 생성
  const bones: THREE.Bone[] = [];
  const boneData = createPrototypeSkeleton();

  // SkinnedMesh 생성
  const material = createChibiShaderMaterial({
    gradientMap: toonRamp(),
    skinColor: new THREE.Color(
      vividSkin(new THREE.Color(0xffdbac))
    ),
    hairColor: new THREE.Color(vivid(new THREE.Color(0x2c2c2c))),
    clothColor: new THREE.Color(vivid(new THREE.Color(0x4488cc))),
  });

  // SkinnedMesh 대신 일반 Mesh 사용 (skinning 제거)
  // 애니메이션은 그룹 피벗 회전으로 처리 (기존 v1 방식과 동일)
  const mesh = new THREE.Mesh(mergedGeo, material as any);
  mesh.add(boneData.armature);

  return mesh as any;
}

/**
 * 프로토타입 스켈레톤 생성
 */
function createPrototypeSkeleton() {
  const armature = new THREE.Bone();
  const bones: { [key: string]: THREE.Bone } = {};

  // 계층 구조
  const hips = new THREE.Bone();
  bones['Hips'] = hips;
  armature.add(hips);

  const spine = new THREE.Bone();
  bones['Spine'] = spine;
  hips.add(spine);

  const chest = new THREE.Bone();
  bones['Chest'] = chest;
  spine.add(chest);

  const neck = new THREE.Bone();
  bones['Neck'] = neck;
  chest.add(neck);

  const head = new THREE.Bone();
  bones['Head'] = head;
  head.position.y = 0.5;
  neck.add(head);

  // 왼쪽 팔
  const leftShoulder = new THREE.Bone();
  bones['LeftShoulder'] = leftShoulder;
  leftShoulder.position.set(-0.12, 0.35, 0);
  chest.add(leftShoulder);

  const leftUpperArm = new THREE.Bone();
  bones['LeftUpperArm'] = leftUpperArm;
  leftShoulder.add(leftUpperArm);

  // 오른쪽 팔
  const rightShoulder = new THREE.Bone();
  bones['RightShoulder'] = rightShoulder;
  rightShoulder.position.set(0.12, 0.35, 0);
  chest.add(rightShoulder);

  const rightUpperArm = new THREE.Bone();
  bones['RightUpperArm'] = rightUpperArm;
  rightShoulder.add(rightUpperArm);

  // 왼쪽 다리
  const leftUpperLeg = new THREE.Bone();
  bones['LeftUpperLeg'] = leftUpperLeg;
  leftUpperLeg.position.set(-0.06, -0.05, 0);
  hips.add(leftUpperLeg);

  const leftLowerLeg = new THREE.Bone();
  bones['LeftLowerLeg'] = leftLowerLeg;
  leftUpperLeg.add(leftLowerLeg);

  // 오른쪽 다리
  const rightUpperLeg = new THREE.Bone();
  bones['RightUpperLeg'] = rightUpperLeg;
  rightUpperLeg.position.set(0.06, -0.05, 0);
  hips.add(rightUpperLeg);

  const rightLowerLeg = new THREE.Bone();
  bones['RightLowerLeg'] = rightLowerLeg;
  rightUpperLeg.add(rightLowerLeg);

  // 스켈레톤 생성
  const allBones = Object.values(bones);
  const skeleton = new THREE.Skeleton(allBones);

  return { armature, skeleton, bones };
}

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
 * GLB 파일에서 Body 메시 로드 (동기 래퍼)
 * 일반적으로 GLTFLoader는 비동기이지만, 프로토타입으로 먼저 반환
 */
async function loadBodyMeshAsync(): Promise<THREE.SkinnedMesh | null> {
  try {
    const gltf = await new Promise<any>((resolve, reject) => {
      gltfLoader.load(
        `${MODEL_BASE_PATH}/body-base.gltf`,
        resolve,
        undefined,
        reject
      );
    });

    // GLTF에서 SkinnedMesh 추출
    const bodyMesh = gltf.scene.children.find(
      (c: any) => c instanceof THREE.SkinnedMesh
    ) as THREE.SkinnedMesh | undefined;

    return bodyMesh || null;
  } catch (error) {
    console.warn('Failed to load body-base.gltf, using prototype:', error);
    return null;
  }
}

/**
 * 저폴리 스킨드 메시 캐릭터 생성 (동기)
 * 프로토타입: 즉시 메시 반환 (GLB는 백그라운드에서 로드 가능)
 *
 * @param params 캐릭터 파라미터 (색상, 헤어스타일 등)
 * @returns ChibiV2Instance
 */
export function buildChibiV2(params: ChibiParams): ChibiV2Instance {
  try {
    // 1. Body 메시 생성 (프로토타입으로 시작)
    // 실제 GLB는 백그라운드에서 로드하고 나중에 교체
    const bodyMesh = createPrototypeChibiMesh();

    // 백그라운드에서 실제 GLB 로드 시도 (비동기)
    let glbLoadedMesh: THREE.SkinnedMesh | null = null;
    loadBodyMeshAsync().then((mesh) => {
      if (mesh && bodyMesh.parent) {
        // GLB 로드 성공: 프로토타입 메시를 교체 (선택사항)
        glbLoadedMesh = mesh;
        console.log('✅ GLB loaded successfully (background)');
      }
    });

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

    // 바디에 적용
    material.uniforms.map.value = faceTexture;

    // 5. 모듈 부착 (헤어, 의상) — TODO: 비동기 로드
    // attachModules(bodyMesh, params);

    // 6. 스켈레톤 기반 애니메이션 컨트롤러 생성
    const animController = new ChibiAnimationV2(bodyMesh.skeleton, bodyMesh.position);

    // 7. 루트 그룹 구성
    const group = new THREE.Group();
    group.add(bodyMesh);

    // 8. 업데이트 루프
    const update = (delta: number, speed: number = 0) => {
      animController.setSpeed(speed);
      animController.update(delta);
    };

    const playAction = (name: string) => {
      animController.playAction(name);
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
    };

    return {
      group,
      mesh: bodyMesh,
      material: material as any,
      skeleton: bodyMesh.skeleton,
      animations: [], // v2는 skeleton FK 기반이므로 clips 불필요
      mixer: null, // 호환성을 위해 null
      update,
      playAction,
      setColor,
      refreshFace,
      dispose,
      animController,
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
