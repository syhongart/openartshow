// world-glb/systems/glb-view.ts — **가시 거리를 자산 크기에 맞춘다.** 판정은 안 한다.
//
// 판정(왜 반대각선인가 · `?far=` 범위 · 성능 교환비)은 `decide/view-span.ts` 한 곳이고
// 이 파일은 그것을 **집행**한다: 안개 밴드를 다시 짓고, 거리 컬링 반경을 돌려준다.
//
// ── 왜 `main.ts` 가 아니라 여기인가 ────────────────────────────────────────
// 두 가지다. ① `world-glb/main.ts` 는 `check:filesize` **동결 파일**(1,250줄)이라 새
// 배선을 그 안에 늘릴 수 없다 — `glb-source.ts` 의 `?pli=` 가 세운 선례와 같은 제약이다.
// ② 그리고 이것은 **한 사안의 두 면**이다: 안개가 닫히는 거리와 셀을 끄는 거리는
// 「안 보이는 것을 안 그린다」라는 한 판정의 앞뒤이고(`systems/glb-stream.ts` 헤더),
// 두 곳에서 각각 계산하면 어긋난 순간 **안개 없이 세계가 잘린다.** world10 이 그 형태로
// 캡처까지 갔다(`world10/decide/nyc-bands.ts` 헤더의 `band05-V1.fogbug.png`).
//
// ── 무엇을 안 하는가 ────────────────────────────────────────────────────────
// · **안개 색을 안 만진다** — 색은 `sky.js` 가 시간대·날씨로 크로스페이드한다.
// · **`?fogd=0` 을 뒤집지 않는다** — 안개가 꺼진 세션에서는 `scene.fog` 가 `null` 이고
//   이 함수는 그것을 그대로 둔다(컬링 자체가 그 경우 안 만들어진다, `main.ts`).
// · **`decide/water.ts` 처럼 판정을 소유하지 않는다** — 산술은 전부 `decide` 쪽이다.

import { spanOf, viewBand, VIEW_FAR_MUL_DEFAULT, VIEW_FAR_MUL_MIN, VIEW_FAR_MUL_MAX } from '../decide/view-span.js';
import { readNum } from '../url-knob.js';

/** `scene.fog` 중 이 파일이 만지는 것만. three 를 import 하지 않으려고 구조만 받는다 */
interface FogLike { near: number; far: number }

/**
 * 안개 밴드를 자산 크기로 다시 짓고 **거리 컬링 반경**을 낸다.
 *
 * @param scene    `fog` 를 가진 것. `null` 이면 안개는 안 건드리고 반경만 돌려준다
 * @param base     셀에서 유도한 원래 밴드(`fogBand(cellX)`)
 * @param fogDist  `?fogd=` 배수 — 기존 식을 그대로 승계한다
 * @param cullMul  `?cull=` 배수 — 〃
 * @param box      씬에 얹힌 GLB 의 bbox(`GlbSourceResult.box`)
 * @param span     `options.viewSpan`. **없으면 아무것도 안 바꾼다**(world7·world8)
 *
 * ⚠ `scene.fog` 를 **제자리에서 고친다**(객체를 갈아 끼우지 않는다). `Fog` 인스턴스를
 * 새로 만들면 three 의 재질 캐시가 그것을 다른 안개로 보고 셰이더를 다시 굽는다 —
 * 그 비용이 바로 이 트리가 `warmUpNode` 로 피하려 한 파이프라인 컴파일 스톨이다.
 */
export function applyViewSpan(
  scene: { fog: FogLike | null } | { fog: unknown },
  base: FogLike,
  fogDist: number,
  cullMul: number,
  box: { min: readonly [number, number, number]; max: readonly [number, number, number] },
  span?: (size: { x: number; y: number; z: number }) => number,
): number {
  let band: FogLike = base;
  if (span) {
    const size = {
      x: box.max[0] - box.min[0],
      y: box.max[1] - box.min[1],
      z: box.max[2] - box.min[2],
    };
    // `spanOf` 는 **기본 정책**(반대각선)이고, 부트가 다른 정책을 주면 그쪽이 이긴다.
    // 여기서 고르지 않는 이유는 「이 자산이 얼마나 보여야 하는가」가 페이지의 사실이기
    // 때문이다 — 트리는 자산을 모른다(`options.ts` 의 경계 조항).
    const spanM = span(size);
    const mul = readNum('far', VIEW_FAR_MUL_DEFAULT, VIEW_FAR_MUL_MIN, VIEW_FAR_MUL_MAX);
    band = viewBand(base, Number.isFinite(spanM) ? spanM : spanOf(size), mul);
    const fog = (scene as { fog: FogLike | null }).fog;
    if (fog) {
      // `?fogd=` 는 기존 식대로 **밴드 위에** 곱한다 — 두 노브가 직교한다
      // (`?far=` 는 「세계가 얼마나 큰가」, `?fogd=` 는 「안개를 얼마나 미는가」).
      fog.near = band.near * fogDist;
      fog.far = band.far * fogDist;
    }
  }
  return band.far * fogDist * cullMul;
}
