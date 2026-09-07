// world-glb/features/shading.ts — 셰이딩 뷰(머티리얼 / 솔리드 / 와이어) **집행**.
//
// 감독 지시: *"그리고 와이어 프레임 뷰. 솔리드 뷰도 구현해줘."* 판정은
// `decide/shading.ts` 에 있고 여기는 그 명세를 three 재질로 만들어 씬에 꽂을 뿐이다.
//
// ── 왜 `scene.overrideMaterial` 인가 — 재질 토글은 **배제했다** ──────────────
// 후보는 둘이었고 하나는 이 저장소가 가장 못 보는 형태의 사고를 낸다.
//
//   ✗ `material.wireframe = true` + `needsUpdate`
//       · `needsUpdate` 를 **안 하면** 선분 인덱스를 삼각형 토폴로지로 그린다 → 화면 붕괴
//       · **하면** 옛 파이프라인이 캐시에서 삭제되고 새것이 생긴다(`Pipelines.js:176-210`).
//         그런데 `caches.size` 는 **거의 그대로**다 — 계측기가 크기만 보므로
//         `createRenderPipeline` 이 토글마다 도는 것을 **원리적으로 못 잡는다.**
//
//   ✓ `scene.overrideMaterial`
//       · 기존 재질을 **한 글자도 안 만진다** → `material.version` 불변 → 기존
//         파이프라인이 산다. 오버라이드용 파이프라인은 한 번 만들어져 캐시에 남는다.
//       · three.js editor 가 쓰는 것과 같은 처방(`frontend/editor/js/Viewport.js:677`).
//
// ── 씬 전체를 덮어도 되는가 — **실측으로 닫았다**(2026-08-14) ────────────────
// `Renderer.js:1645-1680` 은 오버라이드를 적용할 때 «원본 재질에 `positionNode` 가 있으면
// 그것을 오버라이드 재질에 꽂았다 뺐다» 한다. 그러면 프레임마다 오버라이드의 노드 구성이
// 흔들려 파이프라인이 재생성될 수 있다 — 이것이 유일한 실무 위험이었다.
//
// **이 씬에서는 안 일어난다.** 실측 2건:
//   · ⚠ **이 줄은 2026-08-18 에 거짓이 됐다** — `features/grass.ts` 가 잔디 바람을
//     `mat.positionNode` 로 넣는다(TSL). 아래 「전제가 바뀌면」이 예고한 그 시점이다.
//     **집행으로 전제를 되살렸다**: `systems/grass-field.ts` 가 `env.shading() !== 'material'`
//     인 동안 잔디 메시를 `visible=false` 로 둔다. `visible=false` 인 오브젝트는 렌더
//     목록에 안 올라 `Renderer.js` 의 `renderObject()` 에 도달하지 않고, 따라서
//     `overridePositionNode` 스왑 경로를 아예 안 탄다(three r171 소스 실측).
//     즉 지금 참인 명제는 «사용 0건» 이 아니라 **«오버라이드가 걸린 동안 사용 0건»** 이다.
//     정점 변형을 쓰는 기능을 새로 만들면 같은 숨김을 함께 넣어야 이 문장이 참으로 남는다.
//   · `NodeMaterial` 을 쓰는 자리는 `features/ocean-tsl.ts:167` 하나뿐이고 그것도
//     `?water=tsl` 노브 뒤다(`decide/water.ts:514` — *"요청이지 채택이 아니다"*)
// 씬 재질은 전부 코어 `MeshStandardMaterial`/`MeshBasicMaterial` 이다(파츠 12곳 실측).
//
// ⚠ **전제가 바뀌면 이 판단도 바뀐다.** TSL 물을 기본으로 승격하거나 정점 변형 셰이더를
// 넣으면 위 실측이 거짓이 되고, 그때는 오버라이드 범위를 좁혀야 한다. 그 시점에 이
// 주석이 근거를 들고 있어야 다시 재지 않는다.
//
// ── 첫 전환에 비용이 있다. 감추지 않는다 ────────────────────────────────────
//   · `Geometries.js:235-257` — 와이어를 켜면 **지오메트리마다 선분 인덱스 버퍼**를 새로
//     만든다(`getWireframeIndex`). `WeakMap` 캐시라 두 번째부터는 공짜지만 첫 전환은 아니다
//   · `RenderObject.js:218` — 와이어면 `rangeFactor = 2`. 드로우콜 수는 같고 **정점
//     처리량이 2배**다
//   · `WebGPUUtils.js:72` — 토폴로지가 `LineList` 로 갈린다 = 파이프라인이 갈린다
//
// **예열(`prewarm`)은 이번 회차에 안 넣는다.** 계약은 이미 있어서 넣으면 부팅에 흡수되지만
// 그만큼 부팅이 는다. 먼저 예열 없이 내고 **첫 전환 스파이크를 감독이 체감하는지** 본 뒤
// 판정한다 — *"경계도 판정이다"*.
//
// ── 이 환경은 이것을 검증할 수 없다 ─────────────────────────────────────────
// 헤드리스는 코어 `WebGLRenderer`(swiftshader)이고 `WebGLPrograms` 캐시키에 `wireframe` 이
// **없다.** 셰이딩 전환이 파이프라인에 미치는 영향을 원리적으로 못 잰다. **감독 실기기가
// 유일한 판정 축**이고, 게이트 통과를 그 근거로 쓰지 않는다.

import * as THREE_NS from 'three/webgpu';
import { shadingSpec, type ShadingMode } from '../decide/shading.js';
import type { ThreeNS } from '../parts/types.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

// ── 왜 캐스팅하는가 ─────────────────────────────────────────────────────────
// `import * as THREE from 'three/webgpu'` 로는 **코어 재질 타입이 안 잡힌다**(TS2724:
// *"'rest' has no exported member named 'MeshStandardMaterial'"*). 그 진입점이
// `export * from './Three.Core.js'` 로 시작하는 재수출 체인이라 TS 가 끝까지 못 따라간다 —
// `features/types.ts` 헤더가 적은 TS2694 와 같은 뿌리다.
//
// **런타임에는 있다**(빌드 `three.webgpu.js` 에 `MeshStandardMaterial` 실재, 파츠 12곳이
// 이미 그것으로 돌고 있다). 그래서 파츠가 쓰는 `ThreeNS`(= `typeof import('three/webgpu')`)
// 를 그대로 빌려 쓴다 — 같은 형태를 두 번 만들지 않는다.
//
// ⚠ **노드 재질로 바꾸면 이 기능이 성립하지 않는다.** `MeshStandardNodeMaterial` 은 타입이
// 잡히지만 `NodeMaterial` 계열에는 `wireframe` 속성이 **없다**(실측 0건). 렌더러는
// `material.wireframe === true` 를 **직접** 읽어 토폴로지를 가르므로(`WebGPUUtils.js:72`),
// 노드 재질에서는 와이어프레임이 원리적으로 불가능하다. 타입이 편하다고 갈아타면 안 된다.
const THREE = THREE_NS as unknown as ThreeNS;

/**
 * 재질 둘을 **미리 만든다.** 부팅 비용은 0 이다 — three 의 `info.memory` 는 객체 생성이
 * 아니라 **첫 렌더**에 오르므로, 안 그리는 재질은 GPU 에 아무것도 없다(이 저장소가
 * 하늘 날씨 레이어에서 실측으로 배운 것이다).
 *
 * 미리 만드는 대신 얻는 것은 `dispose` 의 확실성이다 — 지연 생성이면 «만들어졌는지» 를
 * 정리 시점에 다시 물어야 하고, 그 분기는 세션에서 한 번도 안 도는 경로가 된다.
 */
type SolidMat = InstanceType<ThreeNS['MeshStandardMaterial']>;
type WireMat = InstanceType<ThreeNS['MeshBasicMaterial']>;
/** 씬에 꽂을 수 있는 것. `null` 은 «오버라이드 없음» 이다 */
type OverrideMat = SolidMat | WireMat | null;

function createMaterials(): { solid: SolidMat; wire: WireMat } {
  const s = shadingSpec('solid');
  const w = shadingSpec('wire');
  return {
    // ── 왜 Lambert 가 아니라 Standard 인가 ────────────────────────────────
    // 씬의 모든 파츠가 이미 `MeshStandardMaterial` 이다(실측 12곳). 같은 계열을 쓰면
    // «이 백엔드에서 이 재질이 도는가» 를 다시 묻지 않아도 된다. 비용도 걱정이 아니다 —
    // 오버라이드가 걸리면 **씬 전체가 재질 하나**라 파이프라인이 오히려 준다.
    //
    // `roughness: 1` · `metalness: 0` 은 반사를 지운다. 솔리드 뷰의 요점은 «재질을 빼고
    // 덩어리만 본다» 이므로 하이라이트가 남으면 목적을 반쯤 잃는다.
    solid: new THREE.MeshStandardMaterial({
      color: s.color, roughness: 1, metalness: 0,
      // ⚠ `vertexColors` 를 **일부러 끈다.** 벤치·화분이 정점 색을 쓰고 인스턴스도
      // 색을 갖는데, 그것이 살아 있으면 «단색» 이 아니게 된다.
      vertexColors: false,
    }),
    // 와이어는 조명을 안 받는다(`spec.lit === false`) — 선의 밝기가 시간대에 따라
    // 변하면 밤에 안 보인다. 도구는 시간대와 무관해야 한다.
    wire: new THREE.MeshBasicMaterial({
      color: w.color, wireframe: w.wireframe, vertexColors: false,
    }),
  };
}

export const shadingFeature: Feature = {
  name: 'shading',
  create(env: FeatureEnv): FeatureInstance | null {
    const mats = createMaterials();
    /** 마지막으로 씬에 반영한 모드. 폴링이 매 프레임 씬을 만지지 않게 하는 축 */
    let applied: ShadingMode | null = null;

    /**
     * 모드를 씬에 반영한다. **머티리얼이면 `null` 로 지운다** — 이것을 빠뜨리면 한 번
     * 와이어를 켠 세션이 영원히 와이어로 남는다(뮤테이션 검출 축 중 하나다).
     */
    function apply(m: ShadingMode): void {
      const spec = shadingSpec(m);
      const scene = env.scene as unknown as { overrideMaterial: OverrideMat };
      scene.overrideMaterial = spec.kind === 'solid' ? mats.solid
        : spec.kind === 'wire' ? mats.wire
          : null;
      applied = m;
    }

    // 부팅 시점의 모드를 즉시 반영한다 — `?shading=wire` 로 들어온 세션이 첫 프레임부터
    // 와이어여야 한다. System 의 첫 `update` 를 기다리면 한 프레임 깜빡인다.
    apply(env.shading());

    return {
      system: {
        name: 'shading',
        update() {
          // 폴링이다. 조립부가 소유한 값이 언제 바뀌는지 기능은 모르고, 알 필요도 없다
          // (`time` 을 하늘이 소비하는 방식과 같다). 문자열 비교 한 번이라 공짜다.
          const want = env.shading();
          if (want !== applied) apply(want);
        },
      },

      /**
       * 드로우콜 판정의 «상태». **`null` 을 내지 않는다.**
       *
       * 셰이딩은 카메라 방향과 달리 논리 상태가 확정적이라 판정을 유예할 이유가 없다.
       * `npc`·`glb-city` 가 조건 없이 `null` 을 내는 바람에 **기본 구성의 draw 축이 영원히
       * 안 재지는** 형태를 이미 만들어 놨다(`features/types.ts` 의 `drawGroupKeyOf` 헤더).
       * 그 목록을 늘리지 않는다.
       */
      drawGroupKey: () => applied ?? env.shading(),

      diagnostics: () => ({ mode: applied }),

      dispose() {
        // 씬에서 먼저 뗀다 — 재질을 dispose 한 뒤에도 참조가 남아 있으면 다음 렌더가
        // 해제된 GPU 자원을 본다.
        (env.scene as unknown as { overrideMaterial: OverrideMat }).overrideMaterial = null;
        mats.solid.dispose();
        mats.wire.dispose();
      },
    };
  },
};
