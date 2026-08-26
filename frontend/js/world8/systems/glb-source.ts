// world8/systems/glb-source.ts — **세계를 파셀이 아니라 GLB 한 덩어리에서 짓는다.**
//
// ── 이 파일이 world8 이 world2 와 갈리는 «유일한 축» 이다 ────────────────────
// world2 는 세계를 **파셀 스트리밍**으로 짓는다(절차적 배치 목록 → 파츠 조립 → 근처만
// 로드). world8 은 그 자리에 **블렌더를 거친 GLB** 를 놓는다. 나머지 — 그림자·치비·
// 하늘(구름·천둥번개)·조이스틱·물·잔디·입력 — 는 **한 줄도 안 고친다**(포크 규율,
// `world8/README.md` 의 「무엇을 바꾸는가」).
//
// ⚠ **왜 포크인가**: 앞선 회차에 world2 의 기능을 임의 GLB 페이지로 **부분 이식**하려
// 했고 다섯 축에서 다섯 번 막혔다. 이식은 원리상 **원본과 다른 물건**을 만든다 —
// 감독이 *"월드 2와 월드8 다르잖아"* 로 지적한 것이 정확히 그 차이다. 표와 경위는
// `world8/README.md` 한 곳이다.
//
// ── 무엇을 하는가 ───────────────────────────────────────────────────────────
// ① 고정 자산 GLB 를 받아 파싱한다(`<body data-glb>` 가 가리킨다)
// ② **반복 메시를 `InstancedMesh` 로 되묶는다** — glTF 에 인스턴싱 표현이 없어
//    내보내기가 world2 의 인스턴스를 개별 메시로 **펴서** 저장하기 때문이다.
//    되묶는 것이 원래 상태로의 **복원**이다(근거·실측표는 `glb-instance.js` 헤더).
// ③ 그림자 플래그를 켠다 — world2 의 방향성 그림자(프러스텀 유도, `decide/shadow.ts`)가
//    GLB 메시에도 그대로 걸리게 하는 자리다. **그림자 구현을 새로 짜지 않는다.**
//
// ⚠ **접촉그림자 데칼(`ShadowDecalSystem`)은 이 세계에 안 붙는다.** 그것은 파츠 슬롯
// (`slotPool`)에 자세를 워프해 굽는 물건이고, GLB 에는 우리 파츠 슬롯이 **없다.**
// 코드를 고쳐서 뺀 것이 아니라 **붙을 대상이 없는 것**이다 — 파셀 전제 자리이므로
// 「세계 소스」 축에 포함된다. 감독의 판정 축 「그림자 구현방식」은 방향성 그림자와
// 프러스텀 유도이고 그쪽은 포크로 그대로 계승된다.

import * as THREE from 'three/webgpu';
import type { Object3D, Scene } from 'three/webgpu';
import { instanceRepeats } from './glb-instance.js';

export interface GlbSourceResult {
  /** 씬에 얹힌 루트(인스턴싱 **후**) */
  root: Object3D;
  /** 충돌·지면이 볼 트리(인스턴싱 **전**) — 아래 경고 참조 */
  collisionRoot: Object3D;
  /** 되묶기 전 메시 수 */
  meshes: number;
  /** 되묶기 전 삼각형 수 */
  triangles: number;
  /** 만든 `InstancedMesh` 벌수 */
  made: number;
  /**
   * 세계의 크기(m). **「떴다」와 「보인다」를 가르는 축이다** — 로드는 성공했는데
   * 화면이 비는 형태가 이 저장소에서 반복됐고, 그때마다 「어디에 얼마나 큰 것이
   * 놓였는가」를 아무도 안 재고 있었다.
   */
  box: { min: [number, number, number]; max: [number, number, number] };
}

/**
 * GLB 를 받아 씬에 세계로 얹는다.
 *
 * ⚠ **충돌·지면은 인스턴싱 «전» 트리를 본다**(검수관 반려 B2, 2026-08-26).
 * `InstancedMesh.raycast` 는 바운딩 구로 한 번 거른 뒤 `count` **전부**를 순회한다
 * (three `three.core.js:15046-15077`). 7,229번 반복되는 종류 하나가 근처에 걸리면
 * 그 한 번의 레이캐스트가 7,229개 인스턴스를 돈다 — 실측 0.011ms → **9.945ms**(937배).
 * 그것은 JS 라 백엔드와 무관하게 **실기기에서도 그대로** 난다.
 *
 * 원본 트리는 씬에 **안 들어간다**(그리지 않는다). 레이캐스트 대상으로만 산다 —
 * 지오메트리는 인스턴스가 참조하므로 메모리도 두 벌이 아니다.
 */
export function mountGlbWorld(
  scene: Scene,
  gltfScene: Object3D,
  opts: { castShadow: boolean },
): GlbSourceResult {
  // ── 되묶기 «전» 에 센다 ────────────────────────────────────────────────────
  // ⚠ 되묶은 뒤 세면 **357배 축소된 수**가 나온다(검수관 반려 B3): `InstancedMesh` 는
  // 트리에서 노드 하나이고 `geometry` 도 한 벌이라, 28,705 메시가 40 으로, 삼각형이
  // 1,358,918 → 3,808 로 보인다. 화면에 그것을 적으면 **거짓을 적는 것**이다.
  let meshes = 0;
  let triangles = 0;
  gltfScene.traverse((o: Object3D) => {
    const m = o as { isMesh?: boolean; geometry?: { index?: { count: number } | null; attributes?: { position?: { count: number } } } };
    if (!m.isMesh || !m.geometry) return;
    meshes++;
    const idx = m.geometry.index;
    const pos = m.geometry.attributes?.position;
    triangles += Math.floor((idx ? idx.count : (pos?.count ?? 0)) / 3);
  });

  // 그림자 플래그 — **되묶기 전에** 켠다. `instanceRepeats` 가 재질·지오를 그대로
  // 넘기지만 플래그는 노드 속성이라, 인스턴스 쪽에도 옮겨 준다(아래).
  if (opts.castShadow) {
    gltfScene.traverse((o: Object3D) => {
      const m = o as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
    });
  }

  const { group, made } = instanceRepeats(gltfScene as unknown as never) as {
    group: Object3D; made: number;
  };

  if (opts.castShadow) {
    group.traverse((o: Object3D) => {
      const m = o as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
    });
  }

  group.name = 'world8:glb-source';
  (scene as unknown as { add(o: Object3D): void }).add(group);

  const b = new THREE.Box3().setFromObject(group as never);
  const r1 = (v: number) => +v.toFixed(1);
  return {
    root: group, collisionRoot: gltfScene, meshes, triangles, made,
    box: {
      min: [r1(b.min.x), r1(b.min.y), r1(b.min.z)],
      max: [r1(b.max.x), r1(b.max.y), r1(b.max.z)],
    },
  };
}

/**
 * 리포트용 요약. **수는 되묶기 «전» 값이다.**
 *
 * ⚠ `InstancedMesh` 로 묶은 뒤 세면 28,707 메시가 457 로, 삼각형도 수천으로 보인다
 * (357배 축소를 실측한 회차가 있다). 화면·리포트에 그것을 적으면 **거짓을 적는 것**이다
 * (검수관 반려 B3). 그래서 `mountGlbWorld` 가 묶기 전에 세어 들고 있고 여기서는 그 값을
 * 그대로 낸다 — 세는 자리와 적는 자리를 갈라 두면 한쪽만 고쳐지는 일이 생긴다.
 */
export function describeGlb(src: GlbSourceResult | null): {
  meshes: number; triangles: number; instanced: number; box: GlbSourceResult['box'];
} | null {
  if (!src) return null;
  return { meshes: src.meshes, triangles: src.triangles, instanced: src.made, box: src.box };
}
