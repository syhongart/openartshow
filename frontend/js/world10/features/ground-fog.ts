// features/ground-fog.ts — 지면 안개 **집행**. 판정·식·노드 조립은 `world-shared/ground-fog.ts`.
//
// ⚠ world2 와 world-glb 에 **같은 파일**이 하나씩 있다(포크는 no-sync 다). 둘이 갈리면
// `tests/ground-fog.test.ts` 가 잡는다 — 갈려야 할 이유가 생기면 그 검사부터 고쳐라.
// 이 파일이 아는 것은 「노브를 읽어 넘기고, 켤 조건이면 `scene.fogNode` 에 단다」뿐이다.
//
// ── 켜지는 조건 셋 — 하나라도 아니면 `null`(종전 화면 그대로) ──────────────
// ① `?fogs=` 세기가 0 보다 크다. 기본값은 0 이라 **노브 없이는 아무것도 안 한다** —
//    감독 확정값이다(2026-09-05 *"기본이 낫다"*, `world-shared/ground-fog.ts` 의 기본값 주석).
// ② 백엔드가 WebGPU 다. 헤드리스 폴백은 레거시 `WebGLRenderer` 라 `fogNode` 를
//    모른다 — 달아도 무해하지만 "달았는데 안 보인다" 는 진단을 남기지 않기 위해 안 단다.
// ③ `scene.fog` 가 있다. `?fogd=0` 이면 거리 안개가 없고, 색·near·far 를 참조할 대상도 없다.
//
// ── 부팅 1회 ────────────────────────────────────────────────────────────────
// `create` 에서 한 번 달고 끝이다. `fogNode` 는 재질 캐시키에 들어가므로 세션 중 바꾸면
// 파이프라인이 다시 구워져 [7] 개수 불변식이 계단을 낸다(`Nodes.js` `getCacheKey`).

import * as tsl from 'three/tsl';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';
import { readNum } from '../url-knob.js';
import {
  buildGroundFogNode, groundFogEnabled, DEFAULT_GROUND_FOG, GROUND_FOG_MAX,
  type FogLike, type TslLike, type GroundFogParams,
} from '../../world-shared/ground-fog.js';

/** URL 노브 → 매개변수. 이름은 거리 안개 노브(`?fogd=`)와 같은 접두를 쓴다 */
export function readGroundFogKnobs(): GroundFogParams {
  return {
    h0: readNum('fogh', DEFAULT_GROUND_FOG.h0, 0, GROUND_FOG_MAX.h0),
    k: readNum('fogk', DEFAULT_GROUND_FOG.k, 0.01, GROUND_FOG_MAX.k),
    strength: readNum('fogs', DEFAULT_GROUND_FOG.strength, 0, GROUND_FOG_MAX.strength),
  };
}

export const groundFogFeature: Feature = {
  name: 'groundFog',

  create(env: FeatureEnv): FeatureInstance | null {
    const p = readGroundFogKnobs();
    if (!groundFogEnabled(p)) return null;
    if (env.adapter.backend !== 'WebGPU') return null;
    const fog = env.scene.fog as FogLike | null;
    if (!fog) return null;

    const scene = env.scene as unknown as { fogNode?: unknown };
    scene.fogNode = buildGroundFogNode(tsl as unknown as TslLike, fog, p);

    return {
      diagnostics: () => ({ ...p, attached: scene.fogNode != null }),
    };
  },
};
