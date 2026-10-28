// systems/glb-normal.ts — 노말맵 강도 노브의 **집행**. 판정은 `decide/glb-normal.ts`.
//
// GLTFLoader 가 만든 재질은 `normalMap`·`normalScale`(Vector2, glTF `scale` 을 x 에, **−scale 을 y 에**)을
// 갖는다. 여기서는 그 벡터에 배율을 곱하기만 한다(부호 보존). `strip` 이면 `normalMap = null`.
// 호출처는 `main.ts` 의 `stream` 단계 — `mountGlbWorld` 직후 한 번(GLB 가 씬에 있어야 한다).
//
// ⚠ 판정/집행 분리의 구멍(CLAUDE.md «경계를 건너는 지점은 아무도 안 본다»): 재질에 텍스처가 붙은 것과
// 화면에 요철이 보이는 것은 다른 일이다. `tests/world-glb-normal-knob.test.ts` 가 three 재질 실물로 이
// 함수를 돌려 `normalScale` 이 실제로 바뀌는지, `strip` 이 `normalMap` 을 실제로 떼는지 본다(팀장 조건 4).
import type { Object3D } from 'three/webgpu';
import type { NormalKnob } from '../decide/glb-normal.js';

interface NormalMaterial { normalMap?: unknown; normalScale?: { x: number; y: number; set(x: number, y: number): unknown }; needsUpdate?: boolean }

/** 루트 아래 모든 메시 재질에 적용. 반환값은 손댄 재질 수(진단용) */
export function applyNormalKnob(root: Object3D, knob: NormalKnob): number {
  const seen = new Set<unknown>();
  let touched = 0;
  root.traverse((o: Object3D) => {
    const m = (o as unknown as { material?: NormalMaterial | NormalMaterial[] }).material;
    if (!m) return;
    for (const one of Array.isArray(m) ? m : [m]) {
      if (seen.has(one) || !one.normalMap) continue;
      seen.add(one);
      if (knob.strip) { one.normalMap = null; }
      else if (one.normalScale) { one.normalScale.set(one.normalScale.x * knob.scale, one.normalScale.y * knob.scale); }
      one.needsUpdate = true;
      touched++;
    }
  });
  return touched;
}
