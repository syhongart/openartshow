// @ts-nocheck — Ayamo 2.0 v2는 프로토타입 단계, strict 타입은 후속 작업
/**
 * 저폴리 스킨드 메시 캐릭터 빌더 (Ayamo 2.0)
 * GLB 로드 → 색상 적용 → 모듈 부착 → 애니메이션 설정
 */

import * as THREE from 'three';
// 자기완결 원칙 — 외부 호스트·패키지 서브경로가 아니라 저장소 안의 사본을 쓴다.
// (`three/examples/jsm/...`를 가리키고 있었는데, 같은 파일의 `.js` 산출물은 처음부터
//  이 vendor 경로였다. `.js`가 서빙되고 있었으므로 이 어긋남이 드러날 일이 없었다.)
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { mergeGeometries } from '../utils/BufferGeometryUtils.js';
import {
  createChibiShaderMaterial,
  assignPartColor,
  initializeVertexColors,
} from './chibi-shader-v2.js';
import { drawFaceCanvas } from './chibi-face.js';
import { toonRamp, vivid, vividSkin } from './chibi-materials.js';
import { CHIBI_ACTION_DUR } from './chibi-anim.js';
import { ChibiAnimationV2 } from './chibi-animation-v2.js';

type ChibiParams = any;

const gltfLoader = new GLTFLoader();
const MODEL_BASE_PATH = '/app/assets/models';

/**
 * 헤어·의상 GLB 모듈 매니페스트 — **스타일 ID → `MODEL_BASE_PATH` 하위 상대경로**.
 *
 * ⚠ 지금 비어 있는 것이 정상이다. 실측(2026-08-16): `frontend/assets/models/` 에 있는
 * 것은 `body-base.gltf`·`lab-space.glb` 둘뿐이고 `hair/`·`clothes/` 디렉터리는 **아예
 * 없다**. 그리고 `params.hairStyle`·`params.outfit` 은 `chibi-schema.ts` 의
 * `CHIBI_HAIR_STYLES`·`CHIBI_OUTFITS`(`bald`·`bob`·`twintail`·`hanbok`…)에서 오는
 * **절차적 지오메트리 스타일 ID** 이지 파일명이 아니다 — `chibi-builder.ts` 가 그 ID 로
 * 지오메트리를 직접 만든다.
 *
 * 그래서 `attachModules` 를 "스타일 ID = 파일명" 으로 곧장 배선하면 아바타를 만들 때마다
 * `/app/assets/models/hair/twintail.glb` 같은 **없는 파일**을 요청한다. 기본 룩부터
 * `hairStyle: 'twintail'` 이라 404 가 상시로 난다 — `verify-live` 의 「자산 실패 0」 축에
 * 걸리는 형태이고, 그 전에 이미 방문자 대역을 버린다.
 *
 * 매니페스트를 한 겹 두는 이유가 그것이다: **등록되지 않은 스타일은 요청 자체를 하지
 * 않는다**(fail-closed — 검증 등급 판정기와 같은 원리). 실물 GLB 가 생기면 파일을 넣고
 * 여기 한 줄을 등록하면 그때부터 부착된다. 부수 효과로 경로 조작이 구조적으로 0 이다 —
 * 스타일 ID 는 `#c=` 코드에서 오는 사용자 입력인데, URL 에 들어가는 것은 우리가 적어 둔
 * 화이트리스트 값뿐이다.
 *
 * **경계**: 「GLB 모듈 파이프라인을 만든다」는 이 TODO 의 범위가 아니다. 여기서 멈춘다 —
 * 에셋·리깅·본 매핑은 별개 결정이고, 그것 없이 배선만 켜면 위의 404 가 된다.
 */
export const CHIBI_MODULE_GLB: Record<string, Record<string, string>> = {
  hair: {},
  outfit: {},
};

/**
 * 스타일 ID 를 실제 GLB 주소로 해석한다. 등록되지 않았으면 `null` — 호출자는 요청을
 * 만들지 않는다.
 */
export function resolveChibiModuleGlb(
  kind: string,
  styleId: unknown,
  manifest: Record<string, Record<string, string>> = CHIBI_MODULE_GLB
): string | null {
  if (typeof styleId !== 'string' || !styleId || styleId === 'none') return null;
  const file = manifest?.[kind]?.[styleId];
  if (typeof file !== 'string' || !file) return null;
  return `${MODEL_BASE_PATH}/${file}`;
}

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
  // `THREE.BufferGeometryUtils`는 실재하지 않는다 — three는 이걸 네임스페이스에 노출하지
  // 않는다. 이 줄은 실행되면 그 자리에서 TypeError였고, `USE_SKINNED_MESH_V2=false`라
  // 실행 경로가 죽어 있어서 6개월간 아무도 밟지 않았다.
  const mergedGeo = mergeGeometries(geometries);
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

  // SkinnedMesh로 skinning 활성화
  const skinnedMesh = new THREE.SkinnedMesh(mergedGeo, material as any);
  skinnedMesh.add(boneData.armature);
  skinnedMesh.bind(boneData.skeleton);

  return skinnedMesh;
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

    // MeshPhongMaterial에 직접 적용
    material.map = faceTexture;

    // 5. 모듈 부착 (헤어, 의상) — 비동기. 본체는 기다리지 않는다.
    //
    // `buildChibiV2` 는 동기 계약이다(`avatar.js` 가 반환값을 그 자리에서 씬에 넣는다).
    // 그래서 부착은 fire-and-forget 이고, 도착이 `dispose()` 보다 늦을 수 있다 —
    // `modulesDisposed` 가 그 경주를 받는다. 이것을 안 두면 떼어낸 아바타의 머리카락이
    // 씬에 남고, 그 메시는 아무도 참조하지 않으므로 누구도 반납하지 못한다.
    const attachedModules: THREE.Object3D[] = [];
    let modulesDisposed = false;
    attachModules(bodyMesh, params).then((parts) => {
      if (modulesDisposed) {
        parts.forEach(disposeModule);
        return;
      }
      attachedModules.push(...parts);
    });

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

    // ⚠️ 부위별 채색이 되지 않는다 — `USE_SKINNED_MESH_V2` 를 켜기 전에 반드시 고쳐야 한다.
    //
    // 구버전(`ShaderMaterial`)은 skin/hair/cloth/accessory 를 각각의 유니폼으로 **독립
    // 채색**했다. `MeshPhongMaterial` 로 옮기면서 `vertexColors` 를 켜지 않았으므로 부위를
    // 가릴 수단이 없고, 그래서 지금은 세 부위가 **같은 `material.color` 하나를 서로 덮어쓴다**
    // (`accessory` 는 아예 빠졌다). 마지막에 호출된 부위의 색이 몸 전체에 칠해진다.
    //
    // `USE_SKINNED_MESH_V2 = false` 라 도달 불가능한 경로여서 6개월간 드러나지 않았다.
    // 되살리려면 `assignPartColor` 가 이미 심어 둔 정점 색상을 쓰도록 `vertexColors: true`
    // 로 재질을 만들고, 부위별 색은 정점 색상 갱신으로 처리해야 한다. `chibi-shader-v2.ts`
    // 의 `PART_SKIN`/`PART_HAIR`/`PART_CLOTH`/`PART_ACCESSORY` 가 그 인덱스다.
    const setColor = (part: string, hex: number) => {
      if (part === 'skin' || part === 'cloth' || part === 'hair') {
        material.color.setHex(hex);
        material.needsUpdate = true;
      }
    };

    const refreshFace = (expr?: any, wound?: number) => {
      const newCanvas = drawFaceCanvas(params, expr, wound);
      const newTexture = new THREE.CanvasTexture(newCanvas);
      newTexture.colorSpace = THREE.SRGBColorSpace;
      material.map = newTexture;
      material.needsUpdate = true;
    };

    const dispose = () => {
      modulesDisposed = true;
      attachedModules.forEach(disposeModule);
      attachedModules.length = 0;
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
 * 부착된 모듈 하나를 떼고 GPU 자원을 반납한다.
 *
 * 본체(`bodyMesh`)와 달리 모듈은 **늦게 도착**하므로, 이미 `dispose()` 된 인스턴스에
 * 도착하는 경우가 있다. 그때도 여기로 들어온다 — 부모에서 떼는 것부터 하는 이유다.
 */
function disposeModule(part: any) {
  part.removeFromParent?.();
  part.geometry?.dispose?.();
  const mat = part.material;
  if (Array.isArray(mat)) mat.forEach((m: any) => m?.dispose?.());
  else mat?.dispose?.();
}

/**
 * 모듈 부착 (헤어, 의상 등) — 비동기.
 *
 * 등록된 모듈이 하나도 없으면 **네트워크 요청을 만들지 않고** 즉시 빈 배열이다
 * (`CHIBI_MODULE_GLB` 머리말 참조). 헤어 실패가 의상 부착을 막지 않도록 두 갈래를
 * 따로 감싼다 — 하나의 `try` 로 묶으면 먼저 던진 쪽이 나머지를 통째로 건너뛴다.
 *
 * @returns 실제로 씬에 붙은 오브젝트들. 호출자가 `dispose` 때 정리한다.
 */
export async function attachModules(
  bodyMesh: THREE.SkinnedMesh,
  params: ChibiParams,
  opts: { load?: (path: string) => Promise<THREE.Group>; manifest?: any } = {}
): Promise<THREE.Object3D[]> {
  const load = opts.load || loadGLB;
  const manifest = opts.manifest || CHIBI_MODULE_GLB;
  const attached: THREE.Object3D[] = [];

  // 헤어 부착 — Head 본을 못 찾으면 붙이지 않는다(허공에 뜬 머리카락보다 없는 편이 낫다).
  const hairPath = resolveChibiModuleGlb('hair', params.hairStyle, manifest);
  if (hairPath) {
    try {
      const hairGroup = await load(hairPath);
      const hairMesh = hairGroup.children.find(
        (c) => c instanceof THREE.SkinnedMesh || c instanceof THREE.Mesh
      ) as THREE.Mesh | undefined;

      if (hairMesh) {
        const headBone = findBone(bodyMesh.skeleton, 'Head');
        if (headBone) {
          hairMesh.position.copy(headBone.position);
          hairMesh.quaternion.copy(headBone.quaternion);
          bodyMesh.add(hairMesh);
          attached.push(hairMesh);
        }
      }
    } catch (error) {
      console.warn('Failed to attach hair module:', error);
    }
  }

  // 의상 부착 (선택사항)
  const outfitPath = resolveChibiModuleGlb('outfit', params.outfit, manifest);
  if (outfitPath) {
    try {
      const outfitGroup = await load(outfitPath);
      const outfitMesh = outfitGroup.children.find(
        (c) => c instanceof THREE.Mesh
      ) as THREE.Mesh | undefined;

      if (outfitMesh) {
        bodyMesh.add(outfitMesh);
        attached.push(outfitMesh);
      }
    } catch (error) {
      console.warn('Failed to attach outfit module:', error);
    }
  }

  return attached;
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
