// @ts-nocheck — Ayamo 2.0 v2는 프로토타입 단계, strict 타입은 후속 작업
/**
 * 저폴리 스킨드 메시 셰이더 (Ayamo 2.0)
 * MeshPhongMaterial 기반 — SkinnedMesh 네이티브 지원
 * 부위별 색상은 부위별 메시 + 다른 색상 material로 처리
 */

import * as THREE from 'three';

/**
 * 부위 ID (Vertex Color RGB로 인코딩)
 * - (0, 0, 0) = 피부
 * - (1, 0, 0) = 머리
 * - (0, 1, 0) = 의상
 * - (0, 0, 1) = 액세서리
 */
export const PART_SKIN = 0;
export const PART_HAIR = 1;
export const PART_CLOTH = 2;
export const PART_ACCESSORY = 3;

export interface ChibiShaderUniforms {
  map?: THREE.Texture;
  gradientMap?: THREE.Texture;
  skinColor?: THREE.Color;
  hairColor?: THREE.Color;
  clothColor?: THREE.Color;
  accessoryColor?: THREE.Color;
  lights?: boolean;
  fog?: boolean;
  fogColor?: THREE.Color;
  fogDensity?: number;
}

/**
 * SkinnedMesh용 기본 MeshPhongMaterial 생성
 * 색상은 인자로 전달된 color 사용
 */
export function createChibiShaderMaterial(uniforms: ChibiShaderUniforms = {}) {
  const color = uniforms.skinColor || new THREE.Color(0xffdbac);

  const material = new THREE.MeshPhongMaterial({
    color: color,
    map: uniforms.map || null,
    fog: true,
    side: THREE.FrontSide,
    transparent: false,
    shininess: 10,
  });

  return material;
}

/**
 * 부위별 색상 material 생성 헬퍼
 */
export function createPartMaterial(color: THREE.Color): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color: color,
    fog: true,
    side: THREE.FrontSide,
    transparent: false,
    shininess: 10,
  });
}

/**
 * 주어진 Mesh에 부위 정점 색상 할당
 * geometry: SkinnedMesh의 geometry
 * partId: PART_SKIN, PART_HAIR, PART_CLOTH 등
 * vertexIndices: 해당 부위의 정점 인덱스 배열
 */
export function assignPartColor(
  geometry: THREE.BufferGeometry,
  partId: number,
  vertexIndices: number[]
) {
  // 색상 속성 생성 (없으면)
  if (!geometry.hasAttribute('color')) {
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    colors.fill(0); // 기본 피부색
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
  const colorData = colorAttr.array as Float32Array;

  // 부위별 색상 설정
  const partColors: Record<number, number[]> = {
    [PART_SKIN]: [0, 0, 0],
    [PART_HAIR]: [1, 0, 0],
    [PART_CLOTH]: [0, 1, 0],
    [PART_ACCESSORY]: [0, 0, 1],
  };

  const [r, g, b] = partColors[partId] || [0, 0, 0];

  for (const vertexIdx of vertexIndices) {
    const idx = vertexIdx * 3;
    colorData[idx] = r;
    colorData[idx + 1] = g;
    colorData[idx + 2] = b;
  }

  colorAttr.needsUpdate = true;
}

/**
 * 모든 정점에 색상 속성 초기화 (피부색 기본값)
 */
export function initializeVertexColors(geometry: THREE.BufferGeometry) {
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);

  // 기본값: 피부색 (0, 0, 0)
  colors.fill(0);

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
