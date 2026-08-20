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
  SHORE_ATTR, FOAM_EDGE, MID_EDGE, FRESNEL_POW, STYLE_OPACITY,
  RIPPLE_WAVE_M, RIPPLE_SPEED_MPS, RIPPLE_CREST_LO, RIPPLE_CREST_HI,
  RIPPLE_WARP_M, RIPPLE_WARP_K, RIPPLE_L2_WAVE, RIPPLE_L2_SPEED, RIPPLE_MIX,
  type WaterStyleMode,
} from '../decide/water-style.js';
import { riverCenterZ, RIVER_HALF } from '../decide/water.js';

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
function styledWaterMaterial(
  foamMul: number, fresMul: number, deepMul: number, ripMul: number,
): THREE.Material {
  const {
    positionViewDirection, normalView, attribute,
    uniform, mix, smoothstep, float, vec3, time, sin, mx_noise_float, positionWorld,
  } = TSL as any;

  const mat = new (THREE as any).MeshStandardNodeMaterial({
    transparent: true,
    opacity: STYLE_OPACITY,
    // 물끼리 겹쳐 그려질 때 뒤엣것이 앞엣것을 지우지 않게 한다 — 기존 물이 같은 이유로
    // `depthWrite: false` 다.
    depthWrite: false,
    roughness: 0.18,
    metalness: 0.0,
  });

  const shallow = uniform(new THREE.Color(SHALLOW));
  const midC = uniform(new THREE.Color(MID));
  const deepC = uniform(new THREE.Color(DEEP));
  const foamC = uniform(new THREE.Color(FOAM));
  const skyC = uniform(new THREE.Color(SKY_TINT));

  // 물가까지의 정규화 거리. **부팅에 정점으로 구워 온다**(`bakeShoreDistance`) —
  // 화면 깊이 텍스처를 쓰던 첫 판본이 WebGPU 에서 왜 죽었는지는
  // `decide/water-style.ts` 의 `SHORE_ATTR` 주석에 있다.
  const shore = attribute(SHORE_ATTR, 'float');
  // 0 = 강 중심(깊다) · 1 = 물가(얕다). `deepMul` 은 대비 노브다.
  const depthT = shore.oneMinus().mul(deepMul).clamp(0, 1);

  // ── 물빛: 얕은 청록 → 중간 → 깊은 남청 ──────────────────────────────────
  // 두 단계로 섞는 것은 감독 명세가 색을 **셋** 지정했기 때문이다. 두 색만 쓰면 중간
  // 구간이 산술 평균으로 흐려져 «청록이 강하게» 라는 요구가 죽는다.
  const tMid = smoothstep(float(0), float(1 - MID_EDGE), depthT);
  const tDeep = smoothstep(float(1 - MID_EDGE), float(1), depthT);
  const body = mix(mix(shallow, midC, tMid), deepC, tDeep);

  // ── 셀 물결 무늬 ────────────────────────────────────────────────────────
  // 근거·유도는 `decide/water-style.ts` 의 `RIPPLE_*` 한 곳이다.
  //
  // 줄을 **결정적 `sin`** 으로 만들고 노이즈는 구불림에만 쓴다 — 노이즈로 임계를 만들면
  // 굵기가 노이즈 분포에 묶여 추측이 된다(돌풍에서 배운 그것).
  //
  // ⚠ **포말보다 먼저 섞는다.** 포말이 무늬 위에 얹혀야 물가가 또렷하게 남는다 —
  // 순서를 바꾸면 물가 띠에 줄무늬가 겹쳐 경계가 흐려진다.
  const warp = mx_noise_float(vec3(
    positionWorld.x.mul(RIPPLE_WARP_K), positionWorld.z.mul(RIPPLE_WARP_K), 0.5,
  )).mul(RIPPLE_WARP_M);
  // 층 하나 — `dx·x + dz·z` 가 흐름 축이고 `t·speed` 가 그 축을 따라 흐른다.
  const layer = (waveM: number, speedMps: number, dx: number, dz: number, seed: number) => {
    const u = positionWorld.x.mul(dx).add(positionWorld.z.mul(dz)).add(warp).add(seed);
    const phase = u.sub(time.mul(speedMps)).mul((Math.PI * 2) / waveM);
    const band = sin(phase).mul(0.5).add(0.5);
    return smoothstep(float(RIPPLE_CREST_LO), float(RIPPLE_CREST_HI), band);
  };
  // 두 층을 다른 파장·속도·방향으로 겹친다. 한 층이면 줄이 시계처럼 규칙적이다.
  const crest = layer(RIPPLE_WAVE_M, RIPPLE_SPEED_MPS, 0.94, 0.34, 0)
    .add(layer(RIPPLE_WAVE_M * RIPPLE_L2_WAVE, RIPPLE_SPEED_MPS * RIPPLE_L2_SPEED, -0.42, 0.91, 37))
    .clamp(0, 1);
  const withRipple = mix(body, foamC, crest.mul(RIPPLE_MIX * ripMul));

  // ── 물가 포말 ───────────────────────────────────────────────────────────
  // 물가 띠에만 흰 거품. 경계를 노이즈로 흔드는 것이 요점이다 — 거리만 쓰면 물가 선이
  // 수학적으로 매끈해 오히려 CG 티가 난다(감독 코멘트가 지적한 자리).
  const n = mx_noise_float(vec3(
    positionWorld.x.mul(0.6), positionWorld.z.mul(0.6), time.mul(0.35),
  ));
  const foamMask = smoothstep(float(1 - FOAM_EDGE * foamMul), float(1), shore)
    .mul(n.mul(0.4).add(0.75))
    .clamp(0, 1);
  const withFoam = mix(withRipple, foamC, foamMask);

  // ── 프레넬 ──────────────────────────────────────────────────────────────
  // 감독 명세 `pow(1 - dot(viewDir, normal), 3)` 그대로. 정면으로 내려다보면 물빛,
  // 비스듬히 보면 하늘빛 — 이것이 들어가야 «게임 물» 로 읽힌다.
  //
  // ⚠ **두 벡터가 같은 공간이어야 한다**(검수관 반려 B2). `positionViewDirection` 은
  // 뷰 공간이므로 짝은 `normalView` 다. `normalWorld` 와 dot 하면 시야각 프레넬이 아니라
  // 화면에 못 박힌 세로 그라데이션이 된다.
  const fres = positionViewDirection.dot(normalView).clamp(0, 1)
    .oneMinus().pow(FRESNEL_POW).mul(fresMul).clamp(0, 1);

  mat.colorNode = mix(withFoam, skyC, fres);
  return mat;
}

/**
 * 물가까지의 정규화 거리를 정점에 굽는다. `0` = 강 중심, `1` = 물가.
 *
 * **기존 지오메트리에 어트리뷰트를 하나 더 붙인다.** 기존 어트리뷰트는 한 글자도 안
 * 건드리므로 `features/ocean.ts` 의 정점 파동·UV 스크롤에 영향이 없다. 지오메트리 **개수**도
 * 안 변한다(개수 불변식은 지오를 세지 어트리뷰트를 세지 않는다).
 *
 * 이미 붙어 있으면 다시 굽지 않는다 — 바다·강이 지오메트리를 공유할 수 있고, 두 번 구우면
 * 같은 값을 두 번 쓰는 낭비다.
 *
 * ⚠ `riverCenterZ` 를 **호출해서** 쓴다(계수를 TSL 로 옮겨 적지 않는다). `decide/water.ts`
 * 의 `RIVER_WAVES` 는 export 가 아니고 그 파일은 `check:filesize` 동결이라 열 수도 없다 —
 * 그런데 그것이 오히려 옳다: 계수를 셰이더에 다시 적으면 강 경로를 바꿨을 때 물빛만 옛
 * 자리에 남고, 그 어긋남은 화면에만 나타난다.
 */
function bakeShoreDistance(geo: THREE.BufferGeometry, cell: number, isSea: boolean): void {
  if (geo.getAttribute(SHORE_ATTR)) return;
  const pos = geo.getAttribute('position');
  const out = new Float32Array(pos.count);
  if (!isSea) {
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // 중심선에서 떨어진 거리를 반폭으로 정규화 — 물가에서 1, 중심에서 0
      out[i] = Math.min(1, Math.abs(z - riverCenterZ(x, cell)) / RIVER_HALF);
    }
  }
  // 바다는 전부 0(깊은 물). `Float32Array` 는 0 으로 초기화되므로 그대로 둔다.
  geo.setAttribute(SHORE_ATTR, new THREE.BufferAttribute(out, 1));
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
    // 물결 무늬 세기(감독 선택 2026-08-20). **0 이 정확히 무늬 이전 상태**다.
    const ripMul = readNum('wrip', 1, 0, 2);

    const material = styledWaterMaterial(foamMul, fresMul, deepMul, ripMul);
    const added: THREE.Mesh[] = [];
    const hidden: THREE.Object3D[] = [];


    // 층2는 **숨기기만** 한다 — 대역을 얹지 않는 이유는 `decide/water-style.ts` 의
    // `HIDE_ONLY_NAMES` 주석에 있다(트랜스폼 비공유 + 반투명 이중 곱).
    let hidOnly = 0;
    for (const name of HIDE_ONLY_NAMES) {
      const src = env.scene.getObjectByName(name);
      if (!src) continue;
      src.visible = false;
      hidden.push(src);
      hidOnly++;
    }

    for (const name of STYLED_WATER_NAMES) {
      const src = env.scene.getObjectByName(name) as THREE.Mesh | undefined;
      if (!src || !(src as any).isMesh) continue;
      // **지오메트리를 공유한다.** 복사하지 않는 이유가 셋이다: 지오메트리 개수가 안 늘고,
      // ocean 이 매 프레임 갱신하는 정점 파동이 그대로 오며, 두 수면이 갈라질 수가 없다.
      // 물가 거리를 굽는다. 지오메트리는 ocean 소유라 **어트리뷰트만 더한다**.
      bakeShoreDistance(src.geometry as THREE.BufferGeometry, env.cell, name === 'ocean');
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

    // ⚠ 층2 숨김 실패도 함께 센다(검수관 권고 R5). 이름이 드리프트하면 대역은 0개인데
    // 층2만 사라져 **고치기 전보다 나쁜 화면**이 되는데, `added` 만 세면 그 경우가 안 잡힌다.
    if (added.length !== STYLED_WATER_NAMES.length || hidOnly !== HIDE_ONLY_NAMES.length) {
      // ⚠ **조용한 no-op 금지.** 이름은 `features/ocean.ts` 와의 결합이고, 저쪽이 이름을
      // 바꾸면 여기는 아무것도 안 물린 채 «켜졌다» 고 보고하게 된다. 그 실패는 화면에서
      // «게임풍 물이 왜 기존 물과 똑같지» 로만 드러나 원인을 찾기 어렵다.
      console.warn(
        `[water-style] 수면 메시를 대역 ${added.length}/${STYLED_WATER_NAMES.length}`
        + ` · 숨김 ${hidOnly}/${HIDE_ONLY_NAMES.length} 개만 찾았다.`
        + ' features/ocean.ts 의 mesh.name 과 decide/water-style.ts 의 목록이 어긋났을 수 있다.',
      );
    }

    return {
      diagnostics: () => ({
        mode,
        styled: added.length,
        expected: STYLED_WATER_NAMES.length,
        hiddenOnly: hidOnly,
        hiddenOnlyExpected: HIDE_ONLY_NAMES.length,
        foamMul, fresMul, deepMul,
        backend: env.adapter.backendDetail,
      }),
      // ⚠ 첫 판본은 *"그만큼 숨기고 같은 수만큼 얹으므로 총합이 안 변한다"* 라고 적었고
      // 층2 대역을 걷은 뒤로 **거짓이 됐다**(검수관 조건 C1) — 지금은 4개를 숨기고 2개를
      // 얹어 **순 −2** 다. `[7.6]` 판정이 유효한 이유는 총합 불변이 아니라 이 키가
      // **세션 내 상수**이기 때문이다(부팅에 정해지고 그 뒤 안 변한다).
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
