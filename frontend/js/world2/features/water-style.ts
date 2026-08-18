// world2/features/water-style.ts — 게임풍 수면. **기존 물을 한 줄도 안 건드린다.**
//
// 감독 지시 2026-08-18: 깊이 색 · 프레넬 · 물가 포말 · 태양 스페큘러. 기존 물
// (`features/ocean.ts`)에는 UV 스크롤·정점 파동·윤슬이 이미 있지만 **프레넬과 포말은
// 두 구현 다 0건**이었다 — 이 파일이 그 첫 도입이다.
//
// 판정·색은 `decide/water-style.ts`, 여기는 조립만 한다.

import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';
import { readNum, readNumOpt } from '../url-knob.js';
import { STYLIZED_KNOB, stylizedOn } from '../decide/stylized.js';
import {
  STYLED_WATER_NAMES, HIDE_ONLY_NAMES, pickWaterStyle, SHALLOW, MID, DEEP, FOAM, SKY_TINT,
  FOAM_DEPTH, MID_DEPTH, DEEP_DEPTH, FRESNEL_POW, STYLE_OPACITY,
  type WaterStyleMode,
} from '../decide/water-style.js';

/**
 * 게임풍 수면 재질.
 *
 * ── 깊이를 어떻게 아는가 ────────────────────────────────────────────────────
 * `viewportLinearDepth.sub(linearDepth())` — 이 화소에서 **수면과 그 뒤 표면의 거리**다
 * (`features/ocean-tsl.ts` 가 쓰는 것과 같은 수단). 물가에서 이 값이 작아지는 이유는
 * 육지 지면 판이 수면 바로 뒤에 있기 때문이고, **그래서 포말이 물가에만 생기는 것이
 * 공짜로 나온다** — 물가까지의 거리를 정점에 굽지 않아도 된다.
 *
 * ⚠ 반환 타입이 `Material` 인 것은 `three/webgpu` 타입 선언이 노드 재질을 재수출하지
 * 않아서다(TS2694 — 런타임에는 있다). `features/grass.ts` 의 같은 자리와 같은 이유.
 */
function styledWaterMaterial(foamMul: number, fresMul: number, deepMul: number): THREE.Material {
  const {
    linearDepth, viewportLinearDepth, positionViewDirection, normalView,
    cameraNear, cameraFar,
    uniform, mix, smoothstep, float, vec3, time, mx_noise_float, positionWorld,
  } = TSL as any;

  const mat = new (THREE as any).MeshStandardNodeMaterial({
    transparent: true,
    opacity: STYLE_OPACITY,
    // 물끼리 겹쳐 그려질 때 뒤엣것이 앞엣것을 지우지 않게 한다 — 기존 물이 같은 이유로
    // `depthWrite: false` 다(강 판과 바다 판이 겹치는 구간이 있다).
    depthWrite: false,
    roughness: 0.18,
    metalness: 0.0,
  });

  const shallow = uniform(new THREE.Color(SHALLOW));
  const midC = uniform(new THREE.Color(MID));
  const deepC = uniform(new THREE.Color(DEEP));
  const foamC = uniform(new THREE.Color(FOAM));
  const skyC = uniform(new THREE.Color(SKY_TINT));

  // 이 화소의 물 두께(m).
  //
  // ⚠ **환산이 반드시 있어야 한다**(검수관 반려 B1). `viewportLinearDepth`·`linearDepth()`
  // 는 [0,1] 정규화 깊이라 그 차는 `Δ미터 / (far - near)` 다. world2 의 far 가 7500 이라
  // 환산 없이 쓰면 2.4m 가 3.2e-4 로 들어와 **깊이 그라데이션이 죽고 전 수면이 포말색**이
  // 된다. 근거와 실패 형태는 `decide/water-style.ts` 의 깊이 램프 절에 적었다.
  const thickness = viewportLinearDepth.sub(linearDepth())
    .mul(cameraFar.sub(cameraNear))
    .mul(deepMul);

  // ── 깊이 색: 얕은 청록 → 중간 → 깊은 남청 ───────────────────────────────
  // 두 단계로 섞는 것은 감독 명세가 색을 **셋** 지정했기 때문이다. 두 색만 쓰면
  // 중간 구간이 산술 평균으로 흐려져 «청록이 강하게» 라는 요구가 죽는다.
  const tMid = smoothstep(float(0), float(MID_DEPTH), thickness);
  const tDeep = smoothstep(float(MID_DEPTH), float(DEEP_DEPTH), thickness);
  const body = mix(mix(shallow, midC, tMid), deepC, tDeep);

  // ── 물가 포말 ───────────────────────────────────────────────────────────
  // 깊이가 얕은 띠에만 흰 거품. 경계를 노이즈로 흔드는 것이 요점이다 — 깊이만 쓰면
  // 물가 선이 수학적으로 매끈해 오히려 CG 티가 난다(감독 코멘트가 지적한 그 자리).
  const n = mx_noise_float(vec3(
    positionWorld.x.mul(0.6), positionWorld.z.mul(0.6), time.mul(0.35),
  ));
  const foamEdge = FOAM_DEPTH * foamMul;
  const foamMask = smoothstep(float(foamEdge), float(0), thickness)
    .mul(n.mul(0.4).add(0.75))
    .clamp(0, 1);
  const withFoam = mix(body, foamC, foamMask);

  // ── 프레넬 ──────────────────────────────────────────────────────────────
  // 감독 명세 `pow(1 - dot(viewDir, normal), 3)` 그대로. 정면으로 내려다보면 물빛,
  // 비스듬히 보면 하늘빛 — 이것이 들어가야 «게임 물» 로 읽힌다.
  //
  // ⚠ **두 벡터가 같은 공간이어야 한다**(검수관 반려 B2). 첫 판본은 `normalWorld` 와
  // 짝지었는데 `positionViewDirection` 은 **뷰 공간**(`positionView.negate().normalize()`)
  // 이다. 수면 법선이 월드에서 ≈(0,1,0) 이므로 그 dot 은 사실상 뷰 공간 y 성분이 되고,
  // 결과는 시야각 프레넬이 아니라 **화면에 못 박힌 세로 그라데이션**이 된다(화면 중앙은
  // dot≈0 → 프레넬 1 → 통째로 하늘색). `normalView` 가 올바른 짝이다.
  const fres = positionViewDirection.dot(normalView).clamp(0, 1)
    .oneMinus().pow(FRESNEL_POW).mul(fresMul).clamp(0, 1);

  mat.colorNode = mix(withFoam, skyC, fres);
  return mat;
}

export const waterStyleFeature: Feature = {
  name: 'water-style',
  create(env: FeatureEnv): FeatureInstance | null {
    const master = readNum(STYLIZED_KNOB, 0, 0, 1);
    if (!stylizedOn(master, readNumOpt('wstyle', 0, 1))) return null;

    const requested: WaterStyleMode = 'on';
    const mode = pickWaterStyle(requested, env.adapter.backend);
    if (mode === 'off') {
      // ⚠ 조용히 넘어가지 않는다 — 감독이 «기존 물» 을 «게임풍 물» 로 착각한 채 판정하면
      // 이 노브를 연 목적이 통째로 무효가 된다(`decide/grass.ts` 의 같은 처방).
      console.warn(
        `[water-style] 게임풍 수면은 WebGPU 에서만 켜진다 — 지금 백엔드는 ${env.adapter.backend}`
        + `(${env.adapter.backendDetail}). 기존 수면이 그대로 보인다.`,
      );
      return null;
    }

    const foamMul = readNum('wfoam', 1, 0, 2);
    const fresMul = readNum('wfres', 1, 0, 2);
    const deepMul = readNum('wdeep', 1, 0, 2);

    const material = styledWaterMaterial(foamMul, fresMul, deepMul);
    const added: THREE.Mesh[] = [];
    const hidden: THREE.Object3D[] = [];


    // 층2는 **숨기기만** 한다 — 대역을 얹지 않는 이유는 `decide/water-style.ts` 의
    // `HIDE_ONLY_NAMES` 주석에 있다(트랜스폼 비공유 + 반투명 이중 곱).
    for (const name of HIDE_ONLY_NAMES) {
      const src = env.scene.getObjectByName(name);
      if (!src) continue;
      src.visible = false;
      hidden.push(src);
    }

    for (const name of STYLED_WATER_NAMES) {
      const src = env.scene.getObjectByName(name) as THREE.Mesh | undefined;
      if (!src || !(src as any).isMesh) continue;
      // **지오메트리를 공유한다.** 복사하지 않는 이유가 셋이다: 지오메트리 개수가 안 늘고,
      // ocean 이 매 프레임 갱신하는 정점 파동이 그대로 오며, 두 수면이 갈라질 수가 없다.
      const m = new THREE.Mesh(src.geometry, material);
      m.name = `${name}-styled`;
      m.position.copy(src.position);
      m.rotation.copy(src.rotation);
      m.scale.copy(src.scale);
      m.renderOrder = src.renderOrder;
      m.frustumCulled = src.frustumCulled;
      env.scene.add(m);
      added.push(m);
      src.visible = false;
      hidden.push(src);
    }

    if (added.length !== STYLED_WATER_NAMES.length) {
      // ⚠ **조용한 no-op 금지.** 이름은 `features/ocean.ts` 와의 결합이고, 저쪽이 이름을
      // 바꾸면 여기는 아무것도 안 물린 채 «켜졌다» 고 보고하게 된다. 그 실패는 화면에서
      // «게임풍 물이 왜 기존 물과 똑같지» 로만 드러나 원인을 찾기 어렵다.
      console.warn(
        `[water-style] 수면 메시를 ${added.length}/${STYLED_WATER_NAMES.length} 개만 찾았다.`
        + ' features/ocean.ts 의 mesh.name 과 decide/water-style.ts 의 목록이 어긋났을 수 있다.',
      );
    }

    return {
      diagnostics: () => ({
        mode,
        styled: added.length,
        expected: STYLED_WATER_NAMES.length,
        hiddenOnly: HIDE_ONLY_NAMES.length,
        foamMul, fresMul, deepMul,
        backend: env.adapter.backendDetail,
      }),
      // 켜지면 기존 수면을 그만큼 숨기고 같은 수만큼 얹으므로 드로우콜 총합이 안 변한다.
      drawGroupKey: () => `water-style:${added.length}`,
      dispose: () => {
        for (const m of added) { env.scene.remove(m); }
        // 숨긴 것을 되돌린다 — 우리가 끈 것이므로 우리가 켠다.
        for (const o of hidden) { o.visible = true; }
        // ⚠ 지오메트리는 **dispose 하지 않는다.** 소유는 `features/ocean.ts` 다.
        // 여기서 지우면 기존 수면이 함께 죽고, 그것이 회수 경로가 두 벌일 때 나는 사고다.
        material.dispose();
      },
    };
  },
};
