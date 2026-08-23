// world2/features/ocean-tsl.ts — TSL 노드 수면. **`?water=tsl` 뒤에서만 산다.**
//
// 감독 지시 2026-08-01: *"물은 이거쓰자. 지금 어색해"* +
// https://github.com/mrdoob/three.js/blob/master/examples/webgpu_backdrop_water.html
//
// 출처: three.js `examples/webgpu_backdrop_water.html` (MIT, three.js authors).
// 노드 구성을 참고했고 상수·색·스케일은 이 세계에 맞춰 다시 잡았다.
// 법무 판정 🟡 조건부(2026-08-01) — 조건 넷 중 이 파일에 걸리는 것:
//   · `textures/water.jpg`·`Michelle.glb` **반입 금지** → 안 쓴다. 물결은 절차적
//     노이즈(`mx_worley_noise_float`)로만 만든다.
//   · 출처를 주석에 명기 → 이 블록.
//   · MaterialX/OSL 고지 → `THIRD-PARTY-NOTICES.md` §2-1 (`mx_worley_noise_float` 는
//     three 자체 저작물이 아니라 MaterialX→OSL 트랜스파일이다).
//
// ── 왜 별도 파일인가 (팀장 판정 B, 2026-08-01) ───────────────────────────────
// 기존 물(`ocean.ts` 의 `MeshStandardMaterial`)을 **지우지 않는다.** 물 룩의 유일한
// 판정자는 감독 실기기 육안인데, 전면 교체는 그 판정을 받기 전에 되돌릴 수 없는
// 지점(노브 5개·슬라이더 배선)을 지나버린다. 그래서 둘을 나란히 두고 감독이 고른다.
//
// **이 파일은 감독 판정 뒤에 사라지거나 기존 물을 대체한다.** 둘 다 남기는 것은
// 결과가 아니다(팀장 조건 5 — 청산 조항). 감독이 *"코드지저분하게하지말고"* 라고
// 한 것이 그 이유다.
//
// ── 무엇이 다른가 — 예제의 핵심은 텍스처가 아니라 backdrop 이다 ──────────────
// 기존 물은 노멀맵으로 표면 굴곡을 흉내 내고 `transparent + opacity` 로 비쳐 보이게
// 했다. 물 **아래**가 실제로 굴절되지는 않는다.
//
// 이 방식은 화면 자체를 다시 샘플링한다:
//   ① `viewportLinearDepth − linearDepth()` 로 **물의 두께**를 구한다 →
//      얕은 곳은 맑고 깊은 곳은 물색이 이긴다(`depthEffect`)
//   ② 물결 세기만큼 `screenUV` 를 밀어 **굴절**시킨다(`refractionUV`)
//   ③ 굴절된 자리가 물보다 **앞**이면 굴절을 취소한다(`finalUV` 의 `lessThan(0)`) —
//      이것이 없으면 물 앞에 선 물체가 물에 비쳐 딸려 들어간다
//
// ── 못 하는 것 ───────────────────────────────────────────────────────────────
// · **WebGL 폴백에서 어떻게 보이는지 모른다.** `viewportSharedTexture` 는 화면 버퍼를
//   읽으므로 백엔드 구현 차이가 가장 큰 종류다. 스모크는 "터지지 않는가" 까지만 본다
//   (팀장 조건 3) — 룩은 못 잰다.
// · 시간대별 색 변화가 기존 물보다 단순하다. `waterGloss` 의 `normalScale`·`roughness`
//   축이 노드 재질에는 그대로 대응되지 않는다(그쪽은 PBR 파라미터다).

import type * as THREENS from 'three/webgpu';

/**
 * 물 색 두 가지. 얕은 쪽 → 깊은 쪽으로 섞인다.
 *
 * 예제 값(`0x0487e2` / `0x74ccf4`)은 열대 수영장 색이라 이 세계의 강에는 너무 밝고
 * 파랗다. world2 는 안개가 `0x0b0d12` 이고 하늘이 시간대별로 도는 어두운 도시라,
 * 청록 쪽으로 내리고 채도를 낮춘다.
 *
 * **여기가 색의 SSOT 다** — 기존 물의 색은 `ocean.ts` 가 따로 갖고 있고, 둘은 서로
 * 다른 물이므로 공유하지 않는다. 감독이 하나를 고르면 진 쪽과 함께 사라진다.
 */
const SHALLOW = 0x2e7f9e;
const DEEP = 0x0d3d52;

/**
 * 물결 노이즈의 공간 스케일. 값이 크면 잔물결, 작으면 큰 너울.
 *
 * 예제는 `4` 와 `2` 인데 그것은 50m 판 기준이다. 우리 강은 폭 48m·길이 수백 m 이고
 * 바다는 960m 사방이라 같은 값을 쓰면 물결이 보이지 않을 만큼 잘다. 미터 단위로
 * 환산해 **파장 약 12m·24m** 가 되도록 잡는다.
 */
const RIPPLE_A = 1 / 12;
const RIPPLE_B = 1 / 24;

/** 물결이 흐르는 속도(초당 노이즈 좌표 이동량) */
const FLOW = 0.35;

/**
 * 굴절 세기 — 물결이 화면 UV 를 미는 양(화면 비율).
 *
 * 예제는 `.1` 인데 그건 수영장을 내려다보는 구도라 크게 흔들려도 자연스럽다.
 * 1인칭으로 물가에 서면 그 정도는 멀미가 나므로 낮춘다.
 */
const REFRACT = 0.035;

/**
 * 물이 완전히 불투명해지는 깊이(미터).
 *
 * `depthEffect` 의 `remapClamp` 상한이다. 예제는 `.04` 라는 정규화 깊이값을 쓰는데
 * 그것은 **카메라 near/far 에 묶인 값**이라 우리 세계에서는 뜻이 달라진다. 그래서
 * **미터로 다시 잡는다** — `WATER_DEPTH` 가 2.4m 이므로 그보다 얕게 두어야 바닥이
 * 어렴풋이 비친다.
 *
 * ⚠ 여기 *"(near 0.1 · far 1200)"* 이라고 far 값이 적혀 있었다. far 가 유도값으로
 * 바뀌면서 **거짓이 됐다**(검수관 조건 2). `OPAQUE_AT` 은 그 숫자에 수치적으로
 * 의존하지 않고 오히려 *"미터로 다시 잡는다"* 는 결론을 강화하므로, 숫자를 지우는
 * 것으로 족하다.
 *
 * far **값**은 `world2/main.ts` 가 `DOME_MAX × 1.25` 로 만들고, `systems/sky.ts` 의
 * `DOME_MAX` 독블록이 소유하는 것은 **왜 그래도 되는가(근거)** 다 — 둘은 다르다.
 * (검수관 권고: *"far 의 소유자는 sky.ts"* 라고만 적으면 값을 찾아간 사람이 거기서
 * `6000` 을 보는데 실제 far 는 `7500` 이다 — 위에서 없앤 것과 같은 종류의 오독이다.)
 *
 * **이 클래스에는 게이트가 없다** — 다른 파일의 산문에 박힌 값이 거짓이 되는 것을
 * 잡는 검사가 0이다. 같은 커밋에서 세 번째 사본이 나왔고, 셋 다 사람이 찾았다.
 */
const OPAQUE_AT = 1.6;

export interface TslWaterHandle {
  material: THREENS.Material;
  /** 시간대에 따라 물빛을 조금 옮긴다. 기존 물의 `applyGloss` 에 대응하는 자리 */
  setTime(time: 'day' | 'sunset' | 'night'): void;
  dispose(): void;
}

/**
 * TSL 노드 수면 재질을 만든다. **`three/tsl` 을 동적으로 받지 않고 인자로 받는다** —
 * 이 파일이 `three` 를 직접 import 하면 `?water=tsl` 을 안 켠 사람도 번들에 이 경로가
 * 실린다. 조립부가 필요할 때만 넘긴다.
 *
 * @param THREE `three/webgpu` 네임스페이스
 * @param tsl   `three/tsl` 네임스페이스
 */
export function createTslWater(
  THREE: typeof THREENS,
  tsl: TslNamespace,
): TslWaterHandle {
  const {
    vec2, linearDepth, screenUV, viewportLinearDepth,
    viewportDepthTexture, viewportSharedTexture, mx_worley_noise_float,
    positionWorld, time, uniform,
  } = tsl;

  // ── 물결 — **절차적이다. 텍스처를 안 쓴다** ────────────────────────────────
  // 법무 조건(`water.jpg` 반입 금지)을 우회하는 것이 아니라, 예제의 물결 자체가
  // 원래 절차적이다. `water.jpg` 는 예제에서 바닥 타일에 쓰인다.
  //
  // `positionWorld.xzy` 로 **월드 좌표**를 노이즈 입력에 쓴다. UV 가 아니라 월드라
  // 판이 아무리 커도 물결 크기가 일정하고, 강과 바다가 이어져도 이음매가 없다.
  const t = time.mul(FLOW);
  const floorUV = positionWorld.xzy;
  const layer0 = mx_worley_noise_float(floorUV.mul(RIPPLE_A).add(t));
  const layer1 = mx_worley_noise_float(floorUV.mul(RIPPLE_B).add(t));
  const intensity = layer0.mul(layer1);

  // 시간대별 물빛. `uniform` 이라 매 프레임 셰이더를 다시 안 짠다 —
  // 값만 바꾸면 되고, 그것이 `setTime` 이 싼 이유다.
  // `uniform(...)` 은 **이미 노드다.** 예제가 `color(0x0487e2)` 로 감싸는 것은 상수를
  // 노드로 올리려는 것이라, uniform 을 또 감싸면 타입 변환이 실패한다 —
  // 실측: `TypeError: Cannot read properties of undefined (reading 'replace')` 로
  // 부팅이 통째로 죽었다(warmup 단계). 그대로 쓴다.
  const shallow = uniform(new THREE.Color(SHALLOW));
  const deep = uniform(new THREE.Color(DEEP));
  const waterColor = intensity.mul(1.4).mix(shallow, deep);

  // ── 깊이로 두께를 잰다 ────────────────────────────────────────────────────
  // `viewportLinearDepth` 는 **이미 그려진 것**(바닥·지면)까지의 거리, `linearDepth()`
  // 는 이 수면까지의 거리다. 차이가 곧 물의 두께다.
  const depth = linearDepth();
  const depthWater = viewportLinearDepth.sub(depth);
  const depthEffect = depthWater.remapClamp(0, OPAQUE_AT);

  // ── 굴절 ──────────────────────────────────────────────────────────────────
  // 물결 세기만큼 화면 UV 를 세로로 민다. 가로로도 밀면 좌우로 출렁여 어지럽다.
  const refractionUV = screenUV.add(vec2(0, intensity.mul(REFRACT)));

  // **굴절 취소 조건** — 굴절해서 집어 온 자리가 물보다 앞이면(음수) 그것은 물 앞에
  // 선 물체다. 그대로 두면 물에 비쳐 딸려 들어간다. 그럴 때는 안 민 UV 를 쓴다.
  const depthTestForRefraction = linearDepth(viewportDepthTexture(refractionUV)).sub(depth);
  const finalUV = depthTestForRefraction.lessThan(0).select(screenUV, refractionUV);
  const depthRefraction = depthTestForRefraction.remapClamp(0, OPAQUE_AT);

  const viewportTexture = viewportSharedTexture(finalUV);

  const material = new THREE.MeshBasicNodeMaterial();
  material.colorNode = waterColor;
  material.backdropNode = depthEffect.mix(
    viewportSharedTexture(),
    viewportTexture.mul(depthRefraction.mix(1, waterColor)),
  );
  material.backdropAlphaNode = depthRefraction.oneMinus();
  material.transparent = true;
  // 양면으로 둔다 — 물에 잠기면 **아래에서 수면을 올려다본다**. `FrontSide` 면 그때
  // 수면이 사라져 "물속" 이라는 신호가 화면에서 없어진다(물빠짐이 오버레이에만
  // 의존하게 된다).
  material.side = THREE.DoubleSide;

  return {
    material,
    setTime(when) {
      // 밤에는 물빛을 내리고 채도를 죽인다. 낮 색 그대로 두면 밤에 물만 형광으로
      // 뜬다 — 감독이 예전에 *"밤인데 빛이 이렇게 많지 않잖아"* 로 잡은 것이 이 축이다.
      const k = when === 'night' ? 0.34 : when === 'sunset' ? 0.72 : 1;
      shallow.value.setHex(SHALLOW).multiplyScalar(k);
      deep.value.setHex(DEEP).multiplyScalar(k);
    },
    dispose() {
      material.dispose();
    },
  };
}

/**
 * `three/tsl` 에서 우리가 쓰는 것만. **전체를 타입으로 받지 않는다** — three 가
 * 마이너 판올림에서 노드를 추가·개명하는데, 전체를 요구하면 그때마다 타입이 깨진다.
 */
export interface TslNamespace {
  color: (v: unknown) => AnyNode;
  vec2: (x: unknown, y: unknown) => AnyNode;
  linearDepth: (v?: unknown) => AnyNode;
  screenUV: AnyNode;
  viewportLinearDepth: AnyNode;
  viewportDepthTexture: (uv: unknown) => AnyNode;
  viewportSharedTexture: (uv?: unknown) => AnyNode;
  mx_worley_noise_float: (v: unknown) => AnyNode;
  positionWorld: AnyNode;
  time: AnyNode;
  uniform: (v: unknown) => { value: THREENS.Color };
}

/**
 * TSL 노드. 체이닝 메서드가 수십 개라 전부 적는 것은 값 미러링이고, three 가 추가할
 * 때마다 여기가 깨진다. **이 파일이 실제로 부르는 것만** 적는다.
 */
export interface AnyNode {
  mul: (v: unknown) => AnyNode;
  add: (v: unknown) => AnyNode;
  sub: (v: unknown) => AnyNode;
  mix: (a: unknown, b: unknown) => AnyNode;
  oneMinus: () => AnyNode;
  remapClamp: (a: number, b: number) => AnyNode;
  lessThan: (v: unknown) => AnyNode;
  select: (a: unknown, b: unknown) => AnyNode;
  xzy: AnyNode;
}
