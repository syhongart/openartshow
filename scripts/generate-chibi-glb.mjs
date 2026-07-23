/**
 * 저폴리 스킨드 메시 캐릭터 GLTF 생성 (Node.js)
 *
 * 사용법:
 *   node scripts/generate-chibi-glb.mjs
 *
 * 출력:
 *   web/assets/models/body-base.gltf
 *   web/assets/models/body-base.bin
 */

import * as THREE from 'three';
import * as BufferGeometryUtilsModule from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const BufferGeometryUtils = BufferGeometryUtilsModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MODELS_DIR = path.join(PROJECT_ROOT, 'web', 'assets', 'models');

// 디렉토리 생성
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 지오메트리 인덱싱 정규화
 */
function normalizeGeometry(geo) {
  if (geo.index) {
    geo = geo.toNonIndexed();
  }
  return geo;
}

/**
 * 저폴리 메시 생성 (~1,200 정점 목표)
 */
function createChibiMesh() {
  const geometries = [];

  // === HEAD ===
  const headGeo = new THREE.IcosahedronGeometry(0.2, 1);
  headGeo.translate(0, 0.65, 0);
  geometries.push(normalizeGeometry(headGeo));

  // 얼굴 정면 (단순)
  const faceGeo = new THREE.PlaneGeometry(0.25, 0.28, 1, 1);
  faceGeo.translate(0, 0.65, 0.2);
  geometries.push(normalizeGeometry(faceGeo));

  // === NECK ===
  const neckGeo = new THREE.CapsuleGeometry(0.05, 0.08, 2, 2);
  neckGeo.translate(0, 0.5, 0);
  geometries.push(normalizeGeometry(neckGeo));

  // === TORSO ===
  const torsoGeo = new THREE.CapsuleGeometry(0.12, 0.3, 3, 2);
  torsoGeo.translate(0, 0.25, 0);
  geometries.push(normalizeGeometry(torsoGeo));

  // === ARMS ===
  const leftArmGeo = new THREE.CapsuleGeometry(0.045, 0.28, 3, 2);
  leftArmGeo.rotateZ(Math.PI / 2.5);
  leftArmGeo.translate(-0.18, 0.4, 0);
  geometries.push(normalizeGeometry(leftArmGeo));

  const rightArmGeo = new THREE.CapsuleGeometry(0.045, 0.28, 3, 2);
  rightArmGeo.rotateZ(-Math.PI / 2.5);
  rightArmGeo.translate(0.18, 0.4, 0);
  geometries.push(normalizeGeometry(rightArmGeo));

  // === HANDS ===
  const leftHandGeo = new THREE.SphereGeometry(0.035, 3, 2);
  leftHandGeo.translate(-0.28, 0.25, 0);
  geometries.push(normalizeGeometry(leftHandGeo));

  const rightHandGeo = new THREE.SphereGeometry(0.035, 3, 2);
  rightHandGeo.translate(0.28, 0.25, 0);
  geometries.push(normalizeGeometry(rightHandGeo));

  // === HIPS ===
  const hipsGeo = new THREE.CapsuleGeometry(0.14, 0.08, 3, 2);
  hipsGeo.translate(0, 0.05, 0);
  geometries.push(normalizeGeometry(hipsGeo));

  // === LEGS ===
  const leftThighGeo = new THREE.CapsuleGeometry(0.06, 0.32, 3, 2);
  leftThighGeo.translate(-0.08, -0.15, 0);
  geometries.push(normalizeGeometry(leftThighGeo));

  const leftCalfGeo = new THREE.CapsuleGeometry(0.055, 0.3, 3, 2);
  leftCalfGeo.translate(-0.08, -0.52, 0);
  geometries.push(normalizeGeometry(leftCalfGeo));

  const rightThighGeo = new THREE.CapsuleGeometry(0.06, 0.32, 3, 2);
  rightThighGeo.translate(0.08, -0.15, 0);
  geometries.push(normalizeGeometry(rightThighGeo));

  const rightCalfGeo = new THREE.CapsuleGeometry(0.055, 0.3, 3, 2);
  rightCalfGeo.translate(0.08, -0.52, 0);
  geometries.push(normalizeGeometry(rightCalfGeo));

  // === FEET ===
  const leftFootGeo = new THREE.SphereGeometry(0.055, 3, 2);
  leftFootGeo.scale(1.2, 0.6, 1.5);
  leftFootGeo.translate(-0.08, -0.82, 0.05);
  geometries.push(normalizeGeometry(leftFootGeo));

  const rightFootGeo = new THREE.SphereGeometry(0.055, 3, 2);
  rightFootGeo.scale(1.2, 0.6, 1.5);
  rightFootGeo.translate(0.08, -0.82, 0.05);
  geometries.push(normalizeGeometry(rightFootGeo));

  // === 지오메트리 병합 ===
  const mergedGeo = BufferGeometryUtils.mergeGeometries(geometries);

  mergedGeo.computeVertexNormals();
  mergedGeo.center();

  // === 정점 색상 초기화 ===
  const posAttr = mergedGeo.getAttribute('position');
  const vertexCount = posAttr.count;
  const colors = new Float32Array(vertexCount * 3);
  colors.fill(0);
  mergedGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return mergedGeo;
}

/**
 * 표준 스켈레톤 생성
 */
function createSkeleton() {
  const bones = [];
  const bonesMap = {};

  const createBone = (name, parent = null) => {
    const bone = new THREE.Bone();
    bone.name = name;
    if (parent) parent.add(bone);
    bones.push(bone);
    bonesMap[name] = bone;
    return bone;
  };

  const armature = new THREE.Bone();
  armature.name = 'Armature';

  // 계층 구조
  const hips = createBone('Hips', armature);
  hips.position.set(0, -0.1, 0);

  const spine = createBone('Spine', hips);
  spine.position.set(0, 0.12, 0);

  const chest = createBone('Chest', spine);
  chest.position.set(0, 0.15, 0);

  const neck = createBone('Neck', chest);
  neck.position.set(0, 0.18, 0);

  const head = createBone('Head', neck);
  head.position.set(0, 0.15, 0);

  // 왼쪽 팔
  const leftShoulder = createBone('LeftShoulder', chest);
  leftShoulder.position.set(-0.18, 0.15, 0);

  const leftUpperArm = createBone('LeftUpperArm', leftShoulder);
  leftUpperArm.position.set(-0.08, 0, 0);

  const leftForeArm = createBone('LeftForeArm', leftUpperArm);
  leftForeArm.position.set(-0.08, 0, 0);

  const leftHand = createBone('LeftHand', leftForeArm);
  leftHand.position.set(-0.08, 0, 0);

  // 오른쪽 팔
  const rightShoulder = createBone('RightShoulder', chest);
  rightShoulder.position.set(0.18, 0.15, 0);

  const rightUpperArm = createBone('RightUpperArm', rightShoulder);
  rightUpperArm.position.set(0.08, 0, 0);

  const rightForeArm = createBone('RightForeArm', rightUpperArm);
  rightForeArm.position.set(0.08, 0, 0);

  const rightHand = createBone('RightHand', rightForeArm);
  rightHand.position.set(0.08, 0, 0);

  // 왼쪽 다리
  const leftUpperLeg = createBone('LeftUpperLeg', hips);
  leftUpperLeg.position.set(-0.08, -0.15, 0);

  const leftLowerLeg = createBone('LeftLowerLeg', leftUpperLeg);
  leftLowerLeg.position.set(0, -0.3, 0);

  const leftFoot = createBone('LeftFoot', leftLowerLeg);
  leftFoot.position.set(0, -0.3, 0);

  // 오른쪽 다리
  const rightUpperLeg = createBone('RightUpperLeg', hips);
  rightUpperLeg.position.set(0.08, -0.15, 0);

  const rightLowerLeg = createBone('RightLowerLeg', rightUpperLeg);
  rightLowerLeg.position.set(0, -0.3, 0);

  const rightFoot = createBone('RightFoot', rightLowerLeg);
  rightFoot.position.set(0, -0.3, 0);

  return {
    armature,
    skeleton: new THREE.Skeleton(bones),
    bones: bonesMap,
  };
}

/**
 * GLTF JSON 문자열 생성
 */
function createGltfJson(mesh, skeleton) {
  const geometry = mesh.geometry;
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const colors = geometry.getAttribute('color');

  // 바이너리 데이터 준비
  const positionData = new Float32Array(positions.array);
  const normalData = new Float32Array(normals.array);
  const colorData = new Float32Array(colors.array);

  // 총 바이너리 크기
  const posSize = positionData.byteLength;
  const normSize = normalData.byteLength;
  const colorSize = colorData.byteLength;
  const totalSize = posSize + normSize + colorSize;

  // GLTF 구조
  const gltf = {
    asset: { version: '2.0', generator: 'Claude GLB Generator' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      {
        mesh: 0,
        skin: 0,
        name: 'ChibiMesh'
      },
      ...skeleton.bones.map((bone, idx) => ({
        name: bone.name,
        translation: [bone.position.x, bone.position.y, bone.position.z],
        rotation: [bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w],
        children: bone.children.map(c => skeleton.bones.indexOf(c) + 1).filter(i => i > 0)
      }))
    ],
    meshes: [
      {
        name: 'Mesh',
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1,
              COLOR_0: 2
            },
            mode: 4 // TRIANGLES
          }
        ]
      }
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: positions.count,
        type: 'VEC3',
        min: [-0.3, -1.0, -0.3],
        max: [0.3, 1.0, 0.3]
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: normals.count,
        type: 'VEC3'
      },
      {
        bufferView: 2,
        componentType: 5126,
        count: colors.count,
        type: 'VEC3'
      }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posSize },
      { buffer: 0, byteOffset: posSize, byteLength: normSize },
      { buffer: 0, byteOffset: posSize + normSize, byteLength: colorSize }
    ],
    buffers: [
      { byteLength: totalSize, uri: 'body-base.bin' }
    ],
    skins: [
      {
        inverseBindMatrices: 3,
        joints: skeleton.bones.map((_, i) => i + 1),
        skeleton: 1
      }
    ]
  };

  return { gltf, positionData, normalData, colorData };
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🎨 저폴리 캐릭터 GLTF 생성 시작...\n');

  ensureDir(MODELS_DIR);

  try {
    console.log('📦 메시 생성 중...');
    const geometry = createChibiMesh();

    console.log('🦴 스켈레톤 생성 중...');
    const { skeleton } = createSkeleton();

    // SkinnedMesh 생성
    const material = new THREE.MeshStandardMaterial({ color: 0xffc9a3 });
    const mesh = new THREE.SkinnedMesh(geometry, material);

    console.log('📝 GLTF 생성 중...');
    const { gltf, positionData, normalData, colorData } = createGltfJson(mesh, skeleton);

    // 바이너리 데이터 결합
    const binaryData = Buffer.concat([
      Buffer.from(positionData),
      Buffer.from(normalData),
      Buffer.from(colorData)
    ]);

    // 파일 저장
    const gltfPath = path.join(MODELS_DIR, 'body-base.gltf');
    const binPath = path.join(MODELS_DIR, 'body-base.bin');

    fs.writeFileSync(gltfPath, JSON.stringify(gltf, null, 2));
    fs.writeFileSync(binPath, binaryData);

    console.log('\n✨ GLTF 생성 완료!');
    console.log(`📊 정보:`);
    console.log(`  - 정점: ${geometry.getAttribute('position').count}`);
    console.log(`  - 본: ${skeleton.bones.length}`);
    console.log(`  - 위치: ${gltfPath}`);
    console.log(`  - 바이너리: ${binPath}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

main();
