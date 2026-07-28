// world2/features/postfx.ts — 후보정(post-processing). 지금은 **블룸** 하나다.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"가로등 조명 옆에 블룸 효과 가능할까. 비용 커지나?"* → *"후보정 파일 별도로 만들어."*
//
// 비용이 커지는 것은 맞다(아래 §비용). 그래서 **파일을 따로 두고 껐다 켤 수 있게** 한다 —
// `features/index.ts` 에서 한 줄을 빼면 후보정 전체가 사라지고, `?bloom=0` 으로 세션
// 단위로도 끌 수 있다. 감독 기기에서 프레임을 재고 판단할 수 있어야 하기 때문이다.
//
// ── 왜 `three/webgpu` 의 TSL 블룸인가 ───────────────────────────────────────
// 익숙한 `UnrealBloomPass`(EffectComposer)는 GLSL `ShaderMaterial` 기반이라 **WebGPU
// 렌더 경로가 없다.** CLAUDE.md 가 "아직 열려 있는 사각" 으로 적어 둔 그것이고, 감독
// 실기기가 WebGPU 라 그쪽을 쓰면 헤드리스 통과가 아무 의미도 없어진다.
//
// `three/examples/jsm/tsl/display/BloomNode.js` 는 TSL 노드라 렌더러가 WebGPU 든
// WebGL 폴백이든 같은 정의에서 각 백엔드 셰이더를 만든다. **두 백엔드에서 같은 수단**을
// 고른다는 이 저장소의 규율에 맞는 유일한 선택지다.
//
// ── 비용 ────────────────────────────────────────────────────────────────────
// 화면 전체를 렌더타깃에 받고 다운샘플 체인 + 블러 + 합성을 돈다. 픽셀 바운드라
// **해상도에 정비례**한다 — 감독 기기는 DPR 3 에 320×519 이므로 실제 960×1557 ≈
// 150만 픽셀이고, 그것이 패스마다 반복된다.
//
// 그래서 **`threshold` 를 높게 잡는다.** 밝은 픽셀만 걸러 블러 대상 자체를 줄이는
// 것이 패스 수를 줄이는 것보다 효과가 크고, 감독이 원한 것도 "가로등 조명 옆" 이지
// 화면 전체가 뿌예지는 것이 아니다.
//
// ── 개수 불변식 ─────────────────────────────────────────────────────────────
// 후보정 셰이더가 파이프라인을 몇 개 추가하지만 **부팅 시 고정**이다. 세션 중에
// 켰다 껐다 하지 않는다 — `strength` 를 0 으로 내려도 파이프라인은 그대로 남으므로
// 낮/밤 전환에 재컴파일이 없다.

import * as THREE from 'three/webgpu';
// TSL 함수는 `three/tsl` 에 있다. `three/webgpu` 에는 `PassNode` **클래스**만 있고
// `pass()` **함수**가 없어서, 거기서 찾다가 조용히 null 로 빠졌다(첫 시도의 실패 원인).
import { pass } from 'three/tsl';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { nightness } from '../decide/night.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

/**
 * 번짐 세기. 1.0 을 넘기면 등이 뭉개져 형태가 사라진다 — 감독이 갓 모양을 보고
 * "가로등" 이라 읽는데, 그 실루엣을 지우면 켜진 얼룩이 된다.
 */
const STRENGTH = 0.75;

/**
 * 번짐 반경. 크게 잡을수록 부드럽지만 다운샘플 단계가 늘어 비용이 붙는다.
 * 0.4 는 등 지름의 두어 배로 번지는 정도다.
 */
const RADIUS = 0.4;

/**
 * 이 밝기를 **넘는 픽셀만** 번진다.
 *
 * 낮게 잡으면 밤하늘의 별과 물 하이라이트까지 걸려 화면이 통째로 뿌예진다. 가로등의
 * 자체발광은 조명과 무관하게 더해지는 값이라 주변보다 확실히 밝고, 이 문턱이 그 차이를
 * 가른다. 감독 지시가 *"가로등 조명 옆"* 이라 **좁게 거는 쪽**을 택했다.
 */
const THRESHOLD = 0.85;

/** `?bloom=0` 이면 아예 켜지 않는다 — 대조군 측정용 */
function enabled(): boolean {
  if (typeof location === 'undefined') return true;
  return new URLSearchParams(location.search).get('bloom') !== '0';
}

export const postfxFeature: Feature = {
  name: 'postfx',

  create(env: FeatureEnv): FeatureInstance | null {
    if (!enabled()) return null;

    // `PostProcessing` 은 `three/webgpu` 의 신형 파이프라인이다. 렌더러를 받아 자기
    // 렌더타깃을 관리하고, `outputNode` 에 적은 노드 그래프대로 합성한다.
    const PP = (THREE as unknown as { PostProcessing?: new (r: unknown) => PostProcessingLike }).PostProcessing;

    let pp: PostProcessingLike | null = null;
    let bloomNode: { strength: { value: number } } | null = null;
    /**
     * 왜 못 켰는가. **조용히 사라지지 않기 위한 것이다.**
     *
     * 첫 시도에서 `pass` 를 `three/webgpu` 에서 찾다가 못 찾아 `null` 을 돌려줬는데,
     * 기능이 목록에서 통째로 빠지니 진단에도 안 남아 "왜 블룸이 없지" 를 추적할 수가
     * 없었다. VRM 본을 하나도 못 찾고도 아무 신호가 없던 것과 **같은 실패**다.
     *
     * 그래서 실패해도 기능은 남기고 이유를 싣는다. 월드는 기본 렌더 경로로 그대로 돈다.
     */
    let failure: string | null = null;

    if (env.adapter.backend !== 'WebGPU') {
      // ── WebGL 백엔드에서는 켜지 않는다 (헤드리스 실측) ─────────────────────
      // 켜면 warmup 에서 부팅이 깨진다:
      //   TypeError: Cannot read properties of undefined (reading 'replace')
      // 스택이 **WebGL 청크**를 가리킨다 — TSL 노드 그래프를 WebGL 백엔드용 셰이더로
      // 내리는 경로에서 터진다.
      //
      // WebGPU 가 없는 기기는 이 폴백을 타므로, 여기서 막지 않으면 그 사용자들이
      // **화면을 아예 못 본다.** 블룸은 있으면 좋은 것이고 월드는 필수다.
      //
      // ── 그래서 이 기능은 헤드리스로 검증할 수 없다 ─────────────────────────
      // CLAUDE.md 가 적어 둔 사각 그대로다 — 헤드리스는 WebGL(swiftshader), 감독
      // 실기기는 WebGPU. 블룸이 실제로 어떻게 보이는지, 프레임을 얼마나 먹는지는
      // **감독 기기 실측이 유일한 판정**이다. 여기서 통과했다고 적으면 거짓이 된다.
      failure = 'WebGL 백엔드 — TSL 후보정이 부팅을 깨뜨려 켜지 않는다(WebGPU 전용)';
    } else if (!PP) {
      failure = 'three/webgpu 에 PostProcessing 이 없다';
    } else {
      try {
        pp = new PP(env.adapter.renderer);
        const scenePass = pass(env.scene, env.camera) as unknown as { add(x: unknown): unknown };
        const b = bloom(scenePass, STRENGTH, RADIUS, THRESHOLD) as unknown as {
          strength: { value: number };
        };
        bloomNode = b;
        // 원본 + 번짐. `add` 로 더하는 것이 블룸의 정의다 — 곱하거나 섞으면 어두운
        // 부분까지 영향을 받아 대비가 죽는다.
        pp.outputNode = scenePass.add(b);
        // ── 렌더 중 실패해도 화면은 살린다 ─────────────────────────────────
        // 조립이 성공해도 **첫 렌더에서** 터질 수 있다(WebGL 백엔드에서 실제로 그랬다).
        // 훅 안에서 터지면 매 프레임 예외가 나고 화면이 통째로 멎는다 — 블룸 하나 때문에
        // 월드를 못 보는 것은 어떤 경우에도 옳지 않다.
        //
        // 그래서 첫 예외에서 훅을 스스로 떼고 기본 경로로 돌아간다. 다음 프레임부터
        // 평소대로 그려지고, 무슨 일이 있었는지는 진단에 남는다.
        env.adapter.setRenderHook((scene, camera) => {
          try {
            pp!.render();
          } catch (err) {
            failure = `렌더 실패로 자동 해제: ${String(err).slice(0, 120)}`;
            bloomNode = null;
            env.adapter.setRenderHook(null);
            env.adapter.render(scene, camera); // 이 프레임도 빠뜨리지 않는다
          }
        });
      } catch (err) {
        failure = `노드 그래프 조립 실패: ${String(err).slice(0, 120)}`;
        // 훅을 걸었을 수도 있으니 반드시 되돌린다 — 안 하면 화면이 멎는다.
        env.adapter.setRenderHook(null);
        pp = null;
        bloomNode = null;
      }
    }

    // 밤에만 번진다. 낮에 켜 두면 하늘이 부옇게 떠서 대낮의 대비가 죽는다.
    // **파이프라인은 그대로 두고 세기만** 흔든다 — 노드를 갈아 끼우면 재컴파일이다.
    let lastLevel = -1;
    function applyLevel(time: string): void {
      if (!bloomNode) return;
      const level = STRENGTH * nightness(time);
      if (level === lastLevel) return;
      lastLevel = level;
      bloomNode.strength.value = level;
    }

    return {
      system: {
        name: 'postfx',
        update() {
          // 하늘 상태를 직접 읽지 않는다 — 기능끼리 상태를 공유하지 않는 규약이다.
          // 대신 **씬 조명**으로 시간대를 읽는다. `env.hemi` 는 커널이 소유하고 모든
          // 기능에 공식으로 열려 있는 것이라, 이건 공유가 아니라 관측이다.
          applyLevel(env.hemi.intensity < DAY_HEMI_MIN ? 'night' : 'day');
        },
      },

      // `on` 이 false 면 블룸이 안 걸린 것이고, `failure` 가 이유를 말한다.
      diagnostics: () => ({
        on: !!bloomNode,
        failure,
        strength: lastLevel,
        radius: RADIUS,
        threshold: THRESHOLD,
      }),

      dispose() {
        env.adapter.setRenderHook(null); // 기본 렌더 경로로 되돌린다 — 안 하면 화면이 멎는다
        (pp as unknown as { dispose?(): void } | null)?.dispose?.();
      },
    };
  },
};

/**
 * 이 값보다 반구광이 어두우면 밤으로 본다.
 *
 * `sky.js` 의 밤 반구광은 0.55 이고 우리 하한이 0.85 다. 낮은 1.0 이므로 그 사이인
 * 0.95 를 문턱으로 잡는다. 노을(0.85)은 밤 쪽으로 읽히는데, 해 질 녘에 등이 번지기
 * 시작하는 것이 오히려 자연스럽다.
 */
const DAY_HEMI_MIN = 0.95;

interface PostProcessingLike {
  outputNode: unknown;
  render(): void;
}
