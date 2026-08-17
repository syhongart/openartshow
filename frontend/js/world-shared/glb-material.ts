// world2/systems/glb-material.ts — 불러온 GLB 의 재질을 실기기에서 **뜨게** 만든다.
//
// ── 왜 이 파일이 따로 있나 ────────────────────────────────────────────────────
// 처방 자체는 `features/glb-city.ts` 안에 있었다. 그런데 `glb-city` 는 *"목록에서 한 줄을
// 지우면 곧 제거"* 되는 실험 기능이고, **다른 기능이 그것을 import 하지 않는다**는 규율이
// 게이트로 집행된다(`tests/world2-glb-city.test.ts`). 그래서 오버레이(감독 배치)가 같은
// 처방을 쓰려고 `glb-city` 를 import 했더니 그 게이트가 정확히 막았다(2026-08-12).
//
// **막힌 것이 옳다.** 처방이 실험 기능에 갇혀 있던 것이 문제였지 게이트가 문제가 아니다.
// 그래서 정의를 여기로 옮기고 양쪽이 이것을 쓴다 — 값이 한 곳에만 있다.

import type { Object3D } from 'three/webgpu';

/**
 * 확장이 만드는 재질 속성. `disableMatExtensions` 는 이 값들만 **끄고** 재질 클래스는
 * 그대로 둔다.
 */
export const EXT_OFF: Record<string, number> = {
  sheen: 0, sheenRoughness: 0,
  clearcoat: 0, clearcoatRoughness: 0,
  specularIntensity: 1, // 1 이 "확장 없음"과 같은 상태다(0 은 반사를 아예 죽인다)
  anisotropy: 0,
  iridescence: 0,
  transmission: 0,
  ior: 1.5, // glTF 기본값
};

/**
 * 재질 **확장 값만** 끈다. 클래스·텍스처·노멀맵·AO·emissive 는 전부 그대로 둔다.
 *
 * ── 이것이 `three/webgpu` 사각의 처방이다 (감독 판정 2026-07-29) ──────────────
 * 실기기 WebGPU 에서 `sheen`·`clearcoat`·`anisotropy`·`ior` 가 화면을 먹는다.
 * 판정표: **raw 안 보임 / noext 보임 / std 보임 / box 보임.** 가장 적게 버리는 선택지가
 * 곧 답이었다 — 클래스도 텍스처도 노멀맵도 AO 도 emissive 도 전부 살고, 꺼지는 것은
 * 확장 값뿐이다.
 *
 * ⚠ **GLB 를 씬에 놓는 모든 경로가 이 함수를 지나야 한다.** 오버레이(감독 배치)가 이것을
 * 안 거치고 원본 그대로 놓다가 실기기에서 렌더 파이프라인이 통째로 무효가 됐다
 * (2026-08-12 감독 콘솔: `TSL.NormalNode: Vertex attribute "normal" not found` →
 * `[Invalid RenderPipeline "renderPipeline_m.DarkShine_*"]` 가 매 프레임 쏟아지며 화면
 * 정지). 같은 판정이 2026-07-29 에 이미 나와 있었는데 그 처방이 `glb-city` 안에만 있어서
 * 오버레이가 못 받았다 — **처방을 기능 안에 가둔 대가**다.
 *
 * ⚠ **헤드리스는 WebGL 이라 이 축을 원리적으로 못 본다.** 게이트가 아니라 *"놓는 경로는
 * 반드시 이 함수를 지난다"* 는 구조가 유일한 방어이고, 실기기 판정은 감독 확인뿐이다.
 *
 * 재질 인스턴스를 새로 만들지 않으므로 개수 불변식에 영향이 없다(clone 이 참조를 공유하니
 * 한 번 고치면 N 채 전부에 적용된다).
 *
 * @returns 실제로 값을 바꾼 재질 수
 */
export function disableMatExtensions(model: Object3D): number {
  const seen = new Set<unknown>();
  let n = 0;
  model.traverse((o: Object3D & { isMesh?: boolean; material?: unknown }) => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list as Array<Record<string, unknown>>) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      let touched = false;
      for (const [k, v] of Object.entries(EXT_OFF)) {
        if (typeof m[k] === 'number') { m[k] = v; touched = true; }
      }
      if (touched) n++;
    }
  });
  return n;
}
