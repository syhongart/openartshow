import * as THREE from "three";
const PART_SKIN = 0;
const PART_HAIR = 1;
const PART_CLOTH = 2;
const PART_ACCESSORY = 3;
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

  // \uC815\uC810 \uC0C9\uC0C1 (\uBD80\uC704 ID)\uB97C \uD504\uB798\uADF8\uBA3C\uD2B8 \uC170\uC774\uB354\uB85C \uC804\uB2EC
  vPartColor = color;

  #include <fog_vertex>
}
`;
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

// \uB77C\uC774\uD305
uniform vec3 directionalLights[NUM_DIR_LIGHTS];
uniform vec3 directionalLightDirections[NUM_DIR_LIGHTS];

vec3 getLighting() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // \uAE30\uBCF8 \uB77C\uC774\uD305 (\uC55E\uCABD +Z)
  vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));
  float diffuse = max(0.0, dot(normal, lightDir));

  // \uC5ED\uAD11
  diffuse = mix(diffuse, 1.0 - diffuse, 0.3);

  // toonRamp \uC801\uC6A9 (2\uB2E8 \uD558\uB4DC \uC2A4\uD15D)
  vec4 toneMapped = texture2D(gradientMap, vec2(diffuse, 0.5));

  return toneMapped.rgb;
}

void main() {
  // \uC815\uC810 \uC0C9\uC0C1\uC5D0\uC11C \uBD80\uC704 \uD310\uBCC4
  // \uC815\uADDC\uD654\uB41C \uC815\uC810 \uC0C9\uC0C1 \uD655\uC778
  float partR = vPartColor.r;
  float partG = vPartColor.g;
  float partB = vPartColor.b;

  // \uD14D\uC2A4\uCC98 \uC0D8\uD50C\uB9C1
  vec4 texColor = texture2D(map, vUv);

  // \uBD80\uC704\uBCC4 \uC0C9\uC0C1 \uACB0\uC815 (\uD63C\uD569)
  vec3 baseColor = skinColor;

  // Hair \uC6B0\uC120\uC21C\uC704
  if (partR > 0.5) {
    baseColor = mix(skinColor, hairColor, 0.8);
  }

  // Cloth \uC6B0\uC120\uC21C\uC704
  if (partG > 0.5) {
    baseColor = mix(skinColor, clothColor, 0.7);
  }

  // Accessory \uC6B0\uC120\uC21C\uC704
  if (partB > 0.5) {
    baseColor = mix(skinColor, accessoryColor, 0.9);
  }

  // \uD14D\uC2A4\uCC98\uC640 \uC0C9\uC0C1 \uD63C\uD569 (\uD14D\uC2A4\uCC98\uAC00 \uC788\uC744 \uACBD\uC6B0)
  vec3 finalColor = baseColor * mix(vec3(1.0), texColor.rgb, 0.5);

  // \uB77C\uC774\uD305 \uC801\uC6A9
  vec3 lit = finalColor * getLighting();

  gl_FragColor = vec4(lit, 1.0);

  #include <fog_fragment>
}
`;
function createChibiShaderMaterial(uniforms = {}) {
  const defaultUniforms = {
    map: { value: uniforms.map || null },
    gradientMap: { value: uniforms.gradientMap || null },
    skinColor: { value: uniforms.skinColor || new THREE.Color(16767916) },
    hairColor: { value: uniforms.hairColor || new THREE.Color(2894892) },
    clothColor: { value: uniforms.clothColor || new THREE.Color(4491468) },
    accessoryColor: { value: uniforms.accessoryColor || new THREE.Color(16755200) }
  };
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.common,
      THREE.UniformsLib.lights,
      THREE.UniformsLib.fog,
      defaultUniforms
    ]),
    vertexShader,
    fragmentShader,
    skinning: true,
    fog: true,
    lights: true,
    side: THREE.FrontSide,
    transparent: false,
    wireframe: false
  });
  return material;
}
function assignPartColor(geometry, partId, vertexIndices) {
  if (!geometry.hasAttribute("color")) {
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    colors.fill(0);
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }
  const colorAttr = geometry.getAttribute("color");
  const colorData = colorAttr.array;
  const partColors = {
    [PART_SKIN]: [0, 0, 0],
    [PART_HAIR]: [1, 0, 0],
    [PART_CLOTH]: [0, 1, 0],
    [PART_ACCESSORY]: [0, 0, 1]
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
function initializeVertexColors(geometry) {
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  colors.fill(0);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}
export {
  PART_ACCESSORY,
  PART_CLOTH,
  PART_HAIR,
  PART_SKIN,
  assignPartColor,
  createChibiShaderMaterial,
  initializeVertexColors
};
