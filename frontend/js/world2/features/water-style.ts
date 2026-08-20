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
  NORMAL_MUL, shallowAlpha, LAYER2_NAMES,
} from '../decide/water-style.js';
import { riverCenterZ, RIVER_HALF, SEA_Y, waterGloss } from '../decide/water.js';
// ⚠ **알파 배분을 새로 만들지 않는다.** 반투명 두 겹이 곱해지는 문제를 기존 물이 이미
// 풀어 뒀고(`sea`/`sea2`), 그 함수를 그대로 쓴다. 여기 공식을 다시 적으면 그 순간
// 미러링이고, 한쪽만 고쳐도 아무도 모른다.
// ⚠ 검수관 권고(2026-08-20): 이 함수는 상태 없는 **순수 판정**이라 `decide/` 가 더 맞는
// 자리다(이 파일이 `SEA_Y` 를 `decide/water.ts` 에서 직접 받는 것과 같은 모양이 된다).
// 이번 회차에 안 옮긴 이유는 `features/ocean.ts` 가 `check:filesize` 동결이라 옮기는
// 것이 그 파일과 `decide/` 양쪽을 건드리는 별개 작업이기 때문이다 — 백로그 `G-STYL22`.
import { layerOpacity } from './ocean.js';

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
  foamMul: number, fresMul: number, deepMul: number, ripMul: number, clearMul: number,
  layers: number,
): THREE.Material {
  const {
    positionViewDirection, normalView, attribute,
    uniform, mix, smoothstep, float, vec3, time, sin, mx_noise_float, positionWorld,
  } = TSL as any;

  // 겹 수만큼 알파를 나눈다 — 두 겹을 곱해 총 `STYLE_OPACITY` 가 되게. 한 겹이면
  // `layerOpacity` 가 그대로 돌려주므로 분기가 필요 없다.
  const deepA = layerOpacity(STYLE_OPACITY, layers);
  const mat = new (THREE as any).MeshStandardNodeMaterial({
    transparent: true,
    opacity: deepA,
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

  // ── 맑음: 알파를 **깊이에 건다** (감독 *"물의 투명함"* 2026-08-20) ─────────
  // 지금까지 알파는 재질 상수 하나였다 — 얕든 깊든 82%. 실물 물은 얕은 곳에서 바닥이
  // 비치고 깊은 곳에서만 물빛이 서고, **그 차이**가 맑음으로 읽힌다.
  //
  // `depthT` 를 그대로 재사용한다(0 = 물가, 1 = 깊은 곳). 새 입력을 만들지 않는다 —
  // 색이 이미 이 값으로 갈라지므로 알파도 같은 축을 타야 둘이 어긋나지 않는다.
  //
  // `clearMul` 은 **노브다**(`?wclear`). `0` 이면 `STYLE_OPACITY` 상수로 정확히
  // 되돌아간다(항등원) — 화면 판정이 뒤집혔을 때 되돌릴 자리가 이 곱 하나다.
  //
  // ⚠ 바다는 `shore` 가 전부 0 이라 `depthT` 가 1 로 포화한다 → 균일하게
  // `STYLE_OPACITY`. 근거는 `decide/water-style.ts` 의 `CLEAR_SHALLOW` 주석 한 곳이다.
  // ⚠ **양 끝을 각각 배분한다.** 재질 상수만 나누면 물가(얕은 쪽)는 안 나뉘어 그
  // 구간에서만 색이 탁해진다 — 겹이 둘일 때 그 어긋남은 물가 띠에서 가장 잘 보인다.
  //
  // ⚠⚠ **끝점은 정확하고 중간은 선형이 아니다** (검수관 실측, 2026-08-20).
  // `mix` 를 «층별 알파» 공간에서 하고 화면에서 `1-(1-a)²` 로 합성하는데, 그 합성이
  // 오목(concave)이라 옌센 부등식에 의해 중간 `depthT` 에서 **두 목표값의 선형 블렌드보다
  // 항상 더 불투명한 쪽으로** 치우친다. `clearMul=1` 최악 실측:
  //
  //   depthT   0      0.25    0.5     0.75    1
  //   합성     0.300  0.462   0.603   0.722   0.820   ← 0 과 1 은 목표와 정확히 같다
  //   선형      —     0.430   0.560   0.690    —      (최대 +4.3%p, depthT 0.5)
  //
  // 즉 물가→깊은 곳 전환이 «중간에서 더 빨리 불투명해지는» 곡선이다. 이 코드가 약속한
  // 것은 **끝점 보존**이고 그것은 지킨다 — 다만 이 문단이 없으면 다음 사람이 선형
  // 그라데이션으로 읽는다. 화면에서 문제인지는 판정 불가(WebGPU 전용)이고, 문제로
  // 드러나면 합성 공간에서 보간하도록(`layerOpacity(mix(...))`) 뒤집으면 된다.
  const shallowA = float(layerOpacity(shallowAlpha(clearMul), layers));
  mat.opacityNode = mix(shallowA, float(deepA), depthT);

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
    // 맑음(깊이 알파). `0` 이 정확히 이전 상태(균일 `STYLE_OPACITY`)다 — 되돌릴 자리다.
    const clearMul = readNum('wclear', 1, 0, 1);
    // 잔파도(노멀맵) 세기 배율. `0` 이면 매끈한 면 = 이전 상태.
    const normMul = readNum('wnorm', NORMAL_MUL, 0, 3);
    // 층2를 대역할 것인가. `0` 이면 예전처럼 숨기기만 한다(되돌릴 자리 하나).
    // 근거는 `decide/water-style.ts` 의 `LAYER2_NAMES` 주석 한 곳이다.
    const layer2On = readNum('wlayer2', 1, 0, 1) >= 0.5;

    const proxyNames: readonly string[] = layer2On
      ? [...STYLED_WATER_NAMES, ...LAYER2_NAMES]
      : STYLED_WATER_NAMES;
    const hideNames: readonly string[] = layer2On ? [] : HIDE_ONLY_NAMES;
    const layers = layer2On ? 2 : 1;

    const material = styledWaterMaterial(foamMul, fresMul, deepMul, ripMul, clearMul, layers);
    const added: THREE.Mesh[] = [];
    const hidden: THREE.Object3D[] = [];
    /** 매 프레임 자세를 따라갈 (대역, 원본) 쌍. 층2 바다는 플레이어를 스냅 추종한다 */
    const follow: Array<{ proxy: THREE.Mesh; src: THREE.Object3D }> = [];

    let hidOnly = 0;
    for (const name of hideNames) {
      const src = env.scene.getObjectByName(name);
      if (!src) continue;
      src.visible = false;
      hidden.push(src);
      hidOnly++;
    }

    for (const name of proxyNames) {
      const src = env.scene.getObjectByName(name) as THREE.Mesh | undefined;
      if (!src || !(src as any).isMesh) continue;
      // **지오메트리를 공유한다.** 복사하지 않는 이유가 셋이다: 지오메트리 개수가 안 늘고,
      // ocean 이 매 프레임 갱신하는 정점 파동이 그대로 오며, 두 수면이 갈라질 수가 없다.
      // 물가 거리를 굽는다. 지오메트리는 ocean 소유라 **어트리뷰트만 더한다**.
      // ⚠ 바다 계열은 **둘 다** 물가 개념이 없다(전부 깊은 물). 이름으로 가르면 층2가
      // 추가될 때마다 여기를 손봐야 하므로 접두로 판정한다.
      const isSea = name.startsWith('ocean');
      bakeShoreDistance(src.geometry as THREE.BufferGeometry, env.cell, isSea);
      const m = new THREE.Mesh(src.geometry, material);
      m.name = `${name}-styled`;
      m.position.copy(src.position);
      // ⚠ **바다 층1은 원래 높이로 되돌린다** (2026-08-20).
      // 기존 물에서 `ocean` 은 층2 패치의 **골 밑**에 내려가 있다 — 반투명 두 판이
      // 교차하면 그 선이 수면 위에 드러나기 때문이고, 그 깊이가 `?wamp` 에 비례한다.
      // 그런데 여기서는 그 층2(`ocean-wave2`)를 **숨긴다** — 교차할 상대가 없으므로
      // 내릴 이유도 없다. 내린 채로 두면 스타일 물에서만 바다가 `?wamp` 만큼 낮아지고,
      // 진폭 노브가 **여기서는 수면 높이 노브가 된다**(기존 물에서 방금 걷어낸 결함이
      // 스타일 경로로 옮겨 앉는 형태다).
      //
      // `SEA_Y` 를 `decide/water.ts` 에서 **직접 받는다.** 값을 여기 적는 것이 아니라
      // 저쪽과 같은 SSOT 를 각자 import 하는 것이라 미러링이 아니다 —
      // `features/ocean.ts` 도 같은 곳에서 받는다.
      // ⚠ **층2를 대역하면 이 되돌림을 하면 안 된다.** 층1이 골 밑에 내려가 있는 것은
      // 층2와 교차하지 않게 하려는 몫이고, 층2가 살아 있으면 그 몫이 필요하다.
      // 되돌리는 것은 층2를 **숨겼을 때**뿐이다 — 그때는 교차할 상대가 없다.
      if (name === 'ocean' && !layer2On) m.position.y = SEA_Y;
      m.rotation.copy(src.rotation);
      m.scale.copy(src.scale);
      m.renderOrder = src.renderOrder;
      m.frustumCulled = src.frustumCulled;
      env.scene.add(m);
      added.push(m);
      // ⚠ **자세를 매 프레임 따라간다** — `features/ocean.ts` 가 층2 바다(`sea2`)의
      // `position` 을 플레이어에게 스냅 추종시키므로, 한 번만 복사하면 대역이 스폰
      // 자리에 남고 파형이 월드와 어긋난다(검수관 반려 B3 의 이유 ①). 정점 버퍼를
      // 공유해도 이 축은 안 따라온다 — 공유되는 것은 정점이지 트랜스폼이 아니다.
      follow.push({ proxy: m, src });
      src.visible = false;
      hidden.push(src);
    }

    // ── 잔파도: 기존 물의 노멀맵을 **공유한다** (감독 *"잔파도의 일렁임"* 2026-08-20) ──
    //
    // 지금까지 이 재질에는 `normalNode`·`normalMap` 이 **둘 다 없었다** — 완전히 매끈한
    // 면이라 빛이 한 방향으로만 반사되고, 그래서 «플라스틱» 으로 읽힌다. 그 사실은
    // `decide/water-style.ts` 의 `RIPPLE_*` 주석이 이미 적고 있었다(*"기존 물의 UV 스크롤
    // 노멀맵도 재질을 대체하면서 함께 사라졌다"*). 거기서 고른 처방이 **색 무늬**였고
    // 감독이 *"이게 뭐여"* 로 반려했다 — 요철을 색으로 대신하려던 것이 틀렸다.
    //
    // **새로 만들지 않는다.** 위에서 지오메트리를 공유한 것과 같은 이유로 텍스처도
    // 공유한다: 텍스처 개수가 안 늘고(개수 불변식 `[7]`), `ocean.ts` 의 `update()` 가
    // 미는 `normA.offset` 스크롤이 **그대로 따라온다**(메시가 숨겨져도 그 갱신은 돈다).
    // 복사하면 그 스크롤이 안 와서 화면에서는 «잔물결이 굳었다» 로만 드러난다.
    //
    // 세기도 값을 여기 적지 않는다 — `waterGloss(time)` 이 시간대별 `normalScale` 의
    // SSOT 이고 같은 텍스처를 쓰므로 같은 곳에서 받아야 한다.
    // ⚠ **시간대 전환에는 안 따라온다** — 이 재질은 부팅에 한 번 만들어지고 갱신 경로가
    // 없다(색·프레넬도 마찬가지다. 새 부채가 아니라 스타일 물 전체의 성질이다).
    // ⚠ 타입을 **구조로** 받는다 — `three/webgpu` 선언이 `MeshStandardMaterial` 을
    // 재수출하지 않는다(런타임에는 있다). 이 파일 위쪽 `styledWaterMaterial` 의 반환
    // 타입이 `Material` 인 것과 같은 이유다.
    type NormalMapped = { normalMap?: THREE.Texture | null; normalScale?: THREE.Vector2 };
    const oceanSrc = hidden.find((o) => o.name === 'ocean') as THREE.Mesh | undefined;
    const baseMap = (oceanSrc?.material as NormalMapped | undefined)?.normalMap ?? null;
    if (baseMap) {
      const ns = waterGloss(env.time()).normalScale * normMul;
      (material as NormalMapped).normalMap = baseMap;
      (material as NormalMapped).normalScale = new THREE.Vector2(ns, ns);
    } else {
      // 조용한 no-op 금지 — `?water=tsl` 처럼 원본이 노드 재질이면 노멀맵이 없다.
      // 그 경우 «잔파도만 없는» 화면이 되는데, 원인이 화면에 안 나타난다.
      console.warn('[water-style] 원본 수면에 normalMap 이 없다 — 잔파도 요철 없이 뜬다');
    }

    // ⚠ 층2 숨김 실패도 함께 센다(검수관 권고 R5). 이름이 드리프트하면 대역은 0개인데
    // 층2만 사라져 **고치기 전보다 나쁜 화면**이 되는데, `added` 만 세면 그 경우가 안 잡힌다.
    if (added.length !== proxyNames.length || hidOnly !== hideNames.length) {
      // ⚠ **조용한 no-op 금지.** 이름은 `features/ocean.ts` 와의 결합이고, 저쪽이 이름을
      // 바꾸면 여기는 아무것도 안 물린 채 «켜졌다» 고 보고하게 된다. 그 실패는 화면에서
      // «게임풍 물이 왜 기존 물과 똑같지» 로만 드러나 원인을 찾기 어렵다.
      console.warn(
        `[water-style] 수면 메시를 대역 ${added.length}/${proxyNames.length}`
        + ` · 숨김 ${hidOnly}/${hideNames.length} 개만 찾았다.`
        + ' features/ocean.ts 의 mesh.name 과 decide/water-style.ts 의 목록이 어긋났을 수 있다.',
      );
    }

    return {
      // ⚠ **이 기능에 `system` 이 생긴 것은 이번이 처음이다.** 층2 바다 대역이 원본의
      // 스냅 추종을 따라가야 하기 때문이고(`LAYER2_NAMES` 주석의 이유 ①), 그것 말고는
      // 매 프레임 할 일이 없다. 회전·스케일은 물 판이 만들어진 뒤 안 바뀌므로 안 본다.
      system: {
        name: 'water-style',
        update() {
          for (const f of follow) f.proxy.position.copy(f.src.position);
          // 층1 바다만 예외 — 층2를 숨겼을 때는 원래 높이로 되돌린 상태를 유지한다.
          if (!layer2On) {
            const o = added.find((m) => m.name === 'ocean-styled');
            if (o) o.position.y = SEA_Y;
          }
        },
      },
      diagnostics: () => ({
        mode,
        layer2: layer2On,
        layers,
        styled: added.length,
        expected: proxyNames.length,
        hiddenOnly: hidOnly,
        hiddenOnlyExpected: hideNames.length,
        foamMul, fresMul, deepMul, clearMul, normMul,
        normalMapShared: !!baseMap,
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
