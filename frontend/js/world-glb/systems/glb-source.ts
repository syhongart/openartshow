// world-glb/systems/glb-source.ts — **세계를 파셀이 아니라 GLB 한 덩어리에서 짓는다.**
//
// ── 이 파일이 world8 이 world2 와 갈리는 «유일한 축» 이다 ────────────────────
// world2 는 세계를 **파셀 스트리밍**으로 짓는다(절차적 배치 목록 → 파츠 조립 → 근처만
// 로드). world8 은 그 자리에 **블렌더를 거친 GLB** 를 놓는다. 나머지 — 그림자·치비·
// 하늘(구름·천둥번개)·조이스틱·물·잔디·입력 — 는 **한 줄도 안 고친다**(포크 규율,
// `world-glb/README.md` 의 「무엇을 바꾸는가」).
//
// ⚠ **왜 포크인가**: 앞선 회차에 world2 의 기능을 임의 GLB 페이지로 **부분 이식**하려
// 했고 다섯 축에서 다섯 번 막혔다. 이식은 원리상 **원본과 다른 물건**을 만든다 —
// 감독이 *"월드 2와 월드8 다르잖아"* 로 지적한 것이 정확히 그 차이다. 표와 경위는
// `world-glb/README.md` 한 곳이다.
//
// ── 무엇을 하는가 ───────────────────────────────────────────────────────────
// ① 고정 자산 GLB 를 받아 파싱한다(`<body data-glb>` 가 가리킨다)
// ② **반복 메시를 `InstancedMesh` 로 되묶는다** — glTF 에 인스턴싱 표현이 없어
//    내보내기가 world2 의 인스턴스를 개별 메시로 **펴서** 저장하기 때문이다.
//    되묶는 것이 원래 상태로의 **복원**이다(근거·실측표는 `glb-instance.js` 헤더).
// ③ 그림자 플래그를 켠다 — `?shint>0` 으로 실시간 캐스터를 켠 세션에서만 의미가 있다.
//
// ── 🔴 그림자 — **내가 적었던 근거는 거짓이었다** (검수관 반려 B2, 2026-08-26) ──
// 이 자리에 원래 *"감독의 판정 축 「그림자 구현방식」은 방향성 그림자와 프러스텀 유도이고
// 그쪽은 포크로 그대로 계승된다"* 라고 적혀 있었다. **실측으로 성립하지 않는다:**
//
//   `world2/main.ts:158`  const SHADOW_INTENSITY = readNum('shint', 0, 0, 1);   ← 기본 0
//   `world2/main.ts:763`  dir.castShadow = SHADOW_INTENSITY > 0                  ← 꺼져 있다
//   `world2/main.ts:145`  감독 판정 2026-08-11 *"그림자 없앤 버전 그게 제일 낫다"*
//                         → **실시간 캐스터 축 자체를 폐지**했다
//
// 즉 내가 「계승된다」고 적은 경로는 **애초에 켜져 있지 않다.** 결론(화면에 그림자가
// 보인다)은 맞았고 근거가 틀렸다 — 이 저장소가 이름 붙인 *"참인 문장에서 성립하지 않는
// 결론을 뽑는 것"* 의 형태다.
//
// **화면에 그림자가 보이는 진짜 이유**: GLB 안에 world2 의 **접촉그림자 데칼이 이미
// 구워져 들어 있다** — 실측 8,625개(전체 28,707 메시의 30%; `shadow:lamp#0` 3,182 ·
// `shadow:tree#0` 2,540 · `shadow:building#0` 2,053 …). 감독이 2026-08-11 에 고른 것이
// 바로 이것이고(`world2/decide/shadow-decal.ts:3-11`), 그 화면이 그대로 온 것이다.
//
// ── ⚠ 그래서 **이 세계의 그림자는 시간대에 반응하지 않는다** ────────────────
// world2 는 `decide/shadow-decal.ts:446` 의 `densityFor(time, base)` 로 시간대마다 농도를
// 바꾸고 「그림자 굽기」 버튼으로 다시 굽는다. world8 에는 `ShadowDecalSystem` **인스턴스가
// 없다** — 그것은 파츠 슬롯(`slotPool`)에 자세를 워프해 굽는 물건이고 GLB 에는 슬롯이
// 없기 때문이다. 실측: 밤으로 돌리면 하늘은 반응하지만(`exposure 1→1.4`,
// `groundLift 1→2.4`) 그림자는 **내보낸 시점 농도 그대로**다.
//
// ⚠⚠ **「반응하지 않는다」는 «구워진 농도(alpha)» 에 대해 참이다**(검수관 권고, 재확인
// 회차). 데칼은 평범한 메시라 **화면상 밝기는 노출·조명 변화를 그대로 따라간다** —
// 밤에 `exposure 1→1.4` 가 걸리면 그림자도 함께 밝아진다. 이 구분을 안 적으면 다음
// 사람이 「밤에도 픽셀이 동일」로 읽고, 실제 화면과 달라 원인을 엉뚱한 데서 찾는다.
//
// ⚠⚠⚠ **`describeGlb().shadowDecals` 는 이 무반응의 «증명이 아니다».** 그 값은 부팅
// 시 1회 산출되는 상수라 어떤 시간대에도 변할 수 없고, 「안 변한다」를 관측해도 정보량이
// 0 이다. 증명은 **구조**에서 온다: `densityFor(time, base)` 의 소비자는
// `systems/shadow-decal.ts:192`(`ShadowDecalSystem` 내부) **하나뿐**이고 그 클래스는
// 이 트리에서 **생성되지 않는다**(import 0 · 인스턴스화 0). 부를 주체가 없다.
//
// **팀장 판정 2026-08-26 — (A) 감수. 조건 2 의 경계는 열지 않는다.** 근거 셋:
//   ① world7·world8 의 존재 이유가 「GLB 를 **있는 그대로** 건다」이다. 데칼을 되살리려면
//      「GLB 메시 → 가상 파츠 슬롯」 변환기가 필요한데, 그것은 world2 「편집본 불러오기」의
//      *다시 세우기* 로 되돌아가는 것이라 **이 페이지를 만든 이유를 스스로 부정한다.**
//   ② 감독이 고른 것은 데칼(정적 화면)이고 **시간대 반응 그림자는 감독 요구였던 적이 없다.**
//      감독이 문제라고 하지 않은 것에 새 축을 열지 않는다.
//   ③ 시간대별로 GLB 를 여러 벌 굽는 대안은 자산 4배(≈21MB 추정)와 전환 멈춤을 새로 만든다.
//
// **재론 조건: 감독이 world8 밤 화면의 그림자를 문제로 발화하는 회차.** 그때 (B)·(C)의
// diff 실물·비용 추정은 백로그 `G-W8H` 에 보존해 두었다 — 같은 추정을 다시 하지 않는다.

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
   * GLB 에 **구워져 들어온 접촉그림자 데칼** 수(재질 이름이 `shadow:` 로 시작하는 메시).
   *
   * ⚠ **이 값이 「그림자가 있는가」의 유일한 검출력 있는 축이다**(검수관 반려 B3).
   * `stats().shadow` 는 `sun.shadow.camera.*` **설정값**이라 두 트리가 같은 상수에서
   * 유도하는 한 **다를 수가 없다** — 그림자 시스템을 통째로 들어내도 `76.8 / 2048` 이
   * 그대로 나온다. 그 값을 동일성 근거로 쓴 것이 이 회차의 반려 사유였다.
   */
  shadowDecals: number;
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
  let shadowDecals = 0;
  gltfScene.traverse((o: Object3D) => {
    const m = o as {
      isMesh?: boolean; material?: { name?: string } | { name?: string }[];
      geometry?: { index?: { count: number } | null; attributes?: { position?: { count: number } } };
    };
    if (!m.isMesh || !m.geometry) return;
    meshes++;
    // 재질 이름이 원산지다 — world2 의 `parts/shadow.ts` 가 `shadow:<kind>` 로 짓는다.
    for (const one of Array.isArray(m.material) ? m.material : [m.material]) {
      if (one?.name?.startsWith('shadow:')) { shadowDecals++; break; }
    }
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

  group.name = 'glb-world:glb-source';
  (scene as unknown as { add(o: Object3D): void }).add(group);

  const b = new THREE.Box3().setFromObject(group as never);
  const r1 = (v: number) => +v.toFixed(1);
  return {
    root: group, collisionRoot: gltfScene, meshes, triangles, made, shadowDecals,
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
  meshes: number; triangles: number; instanced: number;
  shadowDecals: number; box: GlbSourceResult['box'];
} | null {
  if (!src) return null;
  return {
    meshes: src.meshes, triangles: src.triangles, instanced: src.made,
    shadowDecals: src.shadowDecals, box: src.box,
  };
}
