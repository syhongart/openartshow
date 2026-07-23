/**
 * 저폴리 스킨드 메시 셰이더 (Ayamo 2.0)
 * 정점 색상 기반 부위 판별 + toonRamp 톤 셰이딩
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
 * 정점 셰이더: 스킨드 메시 + 정점 색상 전달
 */
const vertexShader = `
#include <common>
#include <skinning_pars_vertex>
#include <fog_pars_vertex>

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vPartColor;

void main() {
  #include <skinning_vertex>

  vec4 mvPosition = vec4(transformed, 1.0);
  mvPosition = modelViewMatrix * mvPosition;
  gl_Position = projectionMatrix * mvPosition;

  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vViewPosition = -mvPosition.xyz;

  // 정점 색상 (부위 ID)를 프래그먼트 셰이더로 전달
  vPartColor = color;

  #include <fog_vertex>
}
`;

/**
 * 프래그먼트 셰이더: 정점 색상 기반 부위 판별 + toonRamp
 */
const fragmentShader = `
#include <common>
#include <fog_pars_fragment>

uniform sampler2D map;
uniform sampler2D gradientMap;

uniform vec3 skinColor;
uniform vec3 hairColor;
uniform vec3 clothColor;
uniform vec3 accessoryColor;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vPartColor;

// 라이팅
uniform vec3 directionalLights[NUM_DIR_LIGHTS];
uniform vec3 directionalLightDirections[NUM_DIR_LIGHTS];

vec3 getLighting() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // 기본 라이팅 (앞쪽 +Z)
  vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
  float diffuse = max(0.0, dot(normal, lightDir));

  // 역광
  diffuse = mix(diffuse, 1.0 - diffuse, 0.3);

  // toonRamp 적용 (2단 하드 스텝)
  vec4 toneMapped = texture2D(gradientMap, vec2(diffuse, 0.5));

  return toneMapped.rgb;
}

void main() {
  // 정점 색상에서 부위 판별
  // 정규화된 정점 색상 확인
  float partR = vPartColor.r;
  float partG = vPartColor.g;
  float partB = vPartColor.b;

  // 텍스처 샘플링
  vec4 texColor = texture2D(map, vUv);

  // 부위별 색상 결정 (혼합)
  vec3 baseColor = skinColor;

  // Hair 우선순위
  if (partR > 0.5) {
    baseColor = mix(skinColor, hairColor, 0.8);
  }

  // Cloth 우선순위
  if (partG > 0.5) {
    baseColor = mix(skinColor, clothColor, 0.7);
  }

  // Accessory 우선순위
  if (partB > 0.5) {
    baseColor = mix(skinColor, accessoryColor, 0.9);
  }

  // 텍스처와 색상 혼합 (텍스처가 있을 경우)
  vec3 finalColor = baseColor * mix(vec3(1.0), texColor.rgb, 0.5);

  // 라이팅 적용
  vec3 lit = finalColor * getLighting();

  gl_FragColor = vec4(lit, 1.0);

  #include <fog_fragment>
}
`;

/**
 * 저폴리 스킨드 메시용 커스텀 머티리얼 생성
 */
export function createChibiShaderMaterial(uniforms: ChibiShaderUniforms = {}) {
  const defaultUniforms = {
    map: { value: uniforms.map || null },
    gradientMap: { value: uniforms.gradientMap || null },
    skinColor: { value: uniforms.skinColor || new THREE.Color(0xffdbac) },
    hairColor: { value: uniforms.hairColor || new THREE.Color(0x2c2c2c) },
    clothColor: { value: uniforms.clothColor || new THREE.Color(0x4488cc) },
    accessoryColor: { value: uniforms.accessoryColor || new THREE.Color(0xffaa00) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.common,
      THREE.UniformsLib.lights,
      THREE.UniformsLib.fog,
      defaultUniforms,
    ]),
    vertexShader,
    fragmentShader,
    skinning: true,
    fog: true,
    lights: true,
    side: THREE.FrontSide,
    transparent: false,
    wireframe: false,
  });

  return material;
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
  const partColors = {
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
