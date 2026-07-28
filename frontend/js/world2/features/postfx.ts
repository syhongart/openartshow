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
import { nightness, LAMP_LUMINANCE, LAMP_MAX_GLOW } from '../decide/night.js';
import { BLOOM_THRESHOLD } from './postfx-params.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

/**
 * 번짐 세기. 크게 잡으면 등이 뭉개져 형태가 사라진다 — 감독이 갓 모양을 보고
 * "가로등" 이라 읽는데, 그 실루엣을 지우면 켜진 얼룩이 된다.
 */
const STRENGTH = 1.15;

/**
 * 번짐 반경 — 정확히는 **저해상 밉을 얼마나 섞을지**다.
 *
 * ── 감독 지적: "블룸이 사각형으로 보이긴 하던데. 원으로 해야지" ──────────────
 * 가우시안 블러 자체는 본래 원형이다. 사각으로 보인 것은 **해상도 아티팩트**였다.
 *
 * three 의 블룸은 밉 5단계를 쓰고 각 단계가 해상도 절반이다:
 *
 *   화면 960×1557(DPR 3) → 밉0 480×778 · 밉1 240×389 · … · 밉4 30×48
 *
 * 밉4 는 **30×48 픽셀**이라, 그것이 전체 화면으로 늘어나면 한 텍셀이 32화면픽셀짜리
 * 블록이 된다. `radius` 가 클수록 그 저해상 밉의 기여가 커지고, 그래서 번짐 가장자리에
 * 사각 블록이 드러난다. 0.4 는 그 블록이 눈에 보이는 값이었다.
 *
 * 0.15 면 밉0~1(고해상)이 지배해 가장자리가 부드러운 원으로 남는다. 번짐 폭이 좁아지는
 * 대신 `STRENGTH` 를 올려 밝기로 보상한다 — 폭이 아니라 세기로 존재감을 만드는 쪽이
 * 등불에는 더 맞다(실제 등도 코어가 밝고 헤일로는 얇다).
 *
 * 화면이 작을수록 밉이 더 잘게 쪼개지므로 이 값은 **해상도에 민감하다.** 감독 화면은
 * 320×519 라 특히 그렇다. 그래서 `?bloomrad=` 로 열어 두었다.
 */
const RADIUS = 0.15;

/**
 * 이 밝기를 **넘는 픽셀만** 번진다.
 *
 * ── 이 값 때문에 블룸이 통째로 죽어 있었다 ─────────────────────────────────
 * 처음에 0.85 로 잡았는데 등불색의 휘도가 **0.805** 라 문턱을 못 넘었다. 블룸은
 * 정상적으로 돌면서 걸리는 픽셀이 하나도 없었고, 감독 화면은 *"가로등 똑같은데"* 였다.
 * "별까지 안 걸리게 좁게" 를 정하면서 **가로등이 그 문턱을 넘는지 계산하지 않은** 것이다.
 *
 * 지금은 등 쪽을 HDR 로 올려(`LAMP_MAX_GLOW` 1.8 → 휘도 1.45) 문턱 위로 보내고, 문턱은
 * 0.75 로 조금만 낮춘다. 둘 사이 여유가 충분해야 등이 **번지고**, 문턱이 별·물보다
 * 높아야 그것들은 **안 번진다.** 그 관계는 `tests/world2-night.test.ts` 가 지킨다.
 */
const THRESHOLD = BLOOM_THRESHOLD;

/** URL 로 값을 읽는다. 없거나 이상하면 기본값 */
function num(key: string, fallback: number): number {
  if (typeof location === 'undefined') return fallback;
  const raw = new URLSearchParams(location.search).get(key);
  if (raw === null) return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * `?bloom=0` 이면 아예 켜지 않는다 — 대조군 측정용.
 *
 * 세기·문턱·반경도 URL 로 연다(`?bloomstr=` `?bloomthr=` `?bloomrad=`). **내가 이
 * 기능을 볼 수 없기 때문이다** — 헤드리스는 WebGL 이라 블룸이 아예 안 켜지고, 실제
 * 모습은 감독 기기(WebGPU)에서만 나온다. 값을 찾는 일을 코드 수정·배포 왕복으로
 * 하면 한 번에 몇 분씩 걸리므로, 그 자리에서 돌려볼 수 있게 열어 둔다.
 */
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
        const b = bloom(
          scenePass,
          num('bloomstr', STRENGTH),
          num('bloomrad', RADIUS),
          num('bloomthr', THRESHOLD),
        ) as unknown as { strength: { value: number } };
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
      const level = num('bloomstr', STRENGTH) * nightness(time);
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
        radius: num('bloomrad', RADIUS),
        threshold: num('bloomthr', THRESHOLD),
        // 가로등이 문턱을 넘는가. 이 둘이 뒤집히면 블룸이 켜져도 아무것도 안 번진다.
        lampPeak: +(LAMP_LUMINANCE * LAMP_MAX_GLOW).toFixed(3),
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
