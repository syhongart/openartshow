// glb-instance.js — **반복되는 메시를 `InstancedMesh` 로 다시 묶는다.**
//
// ── 왜 (감독 신고 2026-08-26 *"8을 보니 프레임이 느린것같아"*) ───────────────
// 실측이 원인을 하나로 좁혔다:
//
//   드로우콜 10,856 · 삼각형 508,852   (프러스텀 컬링 **이후** 값이다)
//   메시 28,707개인데 **고유 (지오메트리 + 재질) 조합은 40개**
//   상위 조합의 반복 수: 7229 · 3182 · 3182 · 2540 · 2540 …
//
// 즉 **같은 물건이 수천 번 낱개로 그려지고 있었다.** world2 는 원래 파츠 종류당
// `InstancedMesh` 하나로 그리는데(개수 불변식), GLB 내보내기가 그것을 **개별 메시로
// 펴서** 저장한다(glTF 에 인스턴싱 표현이 없다 — `EXT_mesh_gpu_instancing` 은 우리
// exporter 가 안 쓴다). 그러니 여기서 **되묶는 것**이 원래 상태로의 복원이다.
//
// ⚠ 내가 먼저 의심한 것은 **그림자**였고(그 회차에 내가 넣었으니) 드로우콜 ON/OFF
// 대조가 차이 0 이라 **기각했다고 적었다. 그 기각은 무효다**(검수관 반려 B1):
// `renderer.info.render.calls` 에는 **그림자 패스가 안 들어간다** — three 가
// `shadowMap.render()` 뒤에 `info.reset()` 을 부른다. 켜고 꺼도 같은 숫자가 나오는 것은
// 「공짜」가 아니라 **그 축의 검출력이 0** 이라는 뜻이다. 그림자는 기각된 것이 아니라
// **안 재진 것**이고 여전히 용의선상에 있다. 재는 법은 `glb-shadow.js` 헤더에 있다.
// 다만 아래 인스턴싱은 그것과 무관하게 성립한다 — 드로우콜 10,856 은 본 패스만의 값이다.
//
// ── 무엇을 안 하는가 ────────────────────────────────────────────────────────
// · ⚠ **`SkinnedMesh` 는 옮기지만 «정확히» 옮겨진다는 보장이 없다**(검수관 부기).
//   skeleton 의 bone 트리가 원본 쪽에 남는데 여기서 `matrix` 를 월드로 굽는 것과
//   `bindMatrix` 가 겹칠 수 있다. **재현 자산이 없어 확인 못 했다** — 그런 GLB 를
//   만나면 이 자리를 먼저 본다.
// · **묶지 않고 그대로 옮기는 것**(`loose`): 다중 재질 메시 · `SkinnedMesh` · 모프 대상 ·
//   `visible=false` · Light · Camera · Points · Line. 앞의 넷은 인스턴싱하면 각각
//   재질 규약·스키닝·모프·가시성이 깨지고, 뒤의 넷은 메시가 아니라 애초에 대상이 아니다.
//   world8 의 고정 자산에는 전부 0건이지만 **world7 은 사용자가 임의 GLB 를 올린다.**
// · 지오메트리를 **복사하지 않는다.** `InstancedMesh` 가 원본을 참조하므로 메모리가
//   늘지 않는다 — 병합(merge)을 안 고른 이유이기도 하다. 병합은 지오를 통째로 복사하고
//   프러스텀 컬링 단위까지 잃는다.
//
// ── 왜 **격자로 나눠** 묶는가 (감독 지시 2026-08-26 *"해결해서 링크 줘"*) ────
// 첫 판본은 (지오, 재질)로만 묶었고 **컬링이 사실상 0 이 됐다** — 씬 전체 1,358,918
// 삼각형 중 1,358,906(99.999%)이 매 프레임 그려졌다. 「종류 전체」가 한 덩어리라
// 화면 뒤쪽도 함께 그린 것이다. 드로우콜 10,856 → 39 는 얻었지만 삼각형이 2.7배가 됐고,
// 저사양 기기에서는 그쪽이 병목일 수 있다(백로그 `G-W8F`).
//
// 그래서 **수평 격자 `GRID`×`GRID` 를 키에 더한다.** 셀마다 따로 묶이므로 프러스텀
// 컬링이 셀 단위로 되살아난다. 드로우콜은 늘지만(최악 `GRID²×조합수`, 실제로는 조합이
// 희소해 훨씬 적다) **화면에 보이는 셀만** 그린다.
//
// ⚠ `GRID` 는 **드로우콜과 컬링의 교환비**다. 크면 컬링이 촘촘해지고 드로우콜이 는다.
// 값의 근거는 아래 상수 주석에 실측으로 적는다.
//
// ── 못 하는 것 / 대가 ───────────────────────────────────────────────────────
// · **수직 방향은 안 나눈다.** 세계가 넓고 낮은 형태(우리 오픈월드 1920×1920×115m)라
//   수평만으로 충분하다고 봤다. 높은 건물 안을 걷는 GLB 에서는 다시 볼 값이다.
// · 인스턴스 단위로 재질을 바꿀 수 없다(이 페이지는 그럴 일이 없다).
// · **원본 노드 이름이 사라진다.** 진단 훅의 `ahead()` 가 «Mesh_11223» 대신 인스턴스
//   이름을 보고한다.

import * as THREE from 'three/webgpu';

/**
 * 수평 격자 분할 수(한 변). 셀마다 따로 묶여 **프러스텀 컬링이 셀 단위로 되살아난다.**
 *
 * 값의 근거 — 실측(world2 blender 왕복 자산, 1920×1920m, 28,707 메시 / 40 조합):
 *
 *   GRID  드로우콜   그려진 삼각형   묶은 벌수   비고
 *      1        39      1,358,906          40     컬링 **0**(99.999% 를 다 그린다)
 *      6       262        970,018         457     컬링 되살아남(-29%)
 *
 * **이 값은 드로우콜과 컬링의 교환비다.** 크면 컬링이 촘촘하고 드로우콜이 는다.
 * 6 을 고른 이유: 1920m / 6 = 320m 셀이고, 드로우콜 262 는 모바일에서 감당되는 범위다
 * (원인이던 값이 10,856 이었다). **8·12 는 안 재봤다** — 삼각형이 더 줄겠지만 드로우콜이
 * 조합 수(40)에 곱해져 빠르게 는다. 감독이 여전히 느리다고 하면 그때 재고 고른다.
 * ⚠ 측정 자리는 **스폰 지점**이다(중심에서 120m, 시야가 도시를 향한다). 다른 자리·
 * 다른 자산에서는 다른 값이 나온다 — 이 표는 「이 자산의 이 자리」다.
 */
const GRID = 6;

/**
 * 씬을 훑어 (지오메트리, 재질) 조합별로 `InstancedMesh` 를 만든다.
 *
 * 원본 트리는 **버린다** — 지오메트리와 재질은 새 인스턴스가 참조하므로 살아 있고,
 * 호출부는 반환된 그룹만 씬에 넣으면 된다.
 *
 * @returns {{group: THREE.Group, made: number, skipped: number, instances: number}}
 */
export function instanceRepeats(root) {
  root.updateMatrixWorld(true);

  /** key `${geoUuid}|${matUuid}` → { geo, mat, mats: Matrix4[] } */
  const buckets = new Map();
  const loose = [];   // 인스턴싱 규약에 안 맞는 것 — 그대로 옮긴다(헤더 목록 참조)

  // 격자 원점·칸 크기 — 세계 바운딩에서 유도한다(상수를 박지 않는다).
  const box = new THREE.Box3().setFromObject(root);
  const cw = Math.max(1e-6, (box.max.x - box.min.x) / GRID);
  const ch = Math.max(1e-6, (box.max.z - box.min.z) / GRID);
  const cellOf = (v) => {
    const cx = Math.min(GRID - 1, Math.max(0, Math.floor((v.x - box.min.x) / cw)));
    const cz = Math.min(GRID - 1, Math.max(0, Math.floor((v.z - box.min.z) / ch)));
    return `${cx}|${cz}`;
  };
  const at = new THREE.Vector3();

  root.traverse((o) => {
    if (o === root) return;
    // ⚠ **메시가 아닌 것도 옮긴다**(검수관 반려 B6). 첫 판본은 `loose` 에 메시만
    // 담고 원본 트리를 버려서 Light·Camera·Points·Line 이 **통째로 사라졌다.**
    // world8 의 고정 자산에는 그런 노드가 없지만 **world7 은 사용자가 임의 GLB 를 올린다.**
    if (!o.isMesh) {
      if (o.isLight || o.isCamera || o.isPoints || o.isLine) loose.push(o);
      return;   // 순수 그룹은 행렬이 자식에 구워지므로 버려도 무해하다
    }
    if (!o.geometry) return;
    // 스키닝·모프는 인스턴싱하면 **애니메이션이 죽는다.** 숨긴 것은 묶으면 **보이게 된다**
    // (`traverse` 는 `visible=false` 도 방문한다). 셋 다 그대로 옮긴다.
    if (o.isSkinnedMesh || o.morphTargetInfluences?.length || !o.visible) { loose.push(o); return; }
    if (Array.isArray(o.material) || !o.material) { loose.push(o); return; }
    // 메시가 **어느 셀에 있는가**를 키에 더한다 — 이것이 컬링을 되살리는 자리다.
    at.setFromMatrixPosition(o.matrixWorld);
    const key = `${cellOf(at)}|${o.geometry.uuid}|${o.material.uuid}`;
    let b = buckets.get(key);
    if (!b) { b = { geo: o.geometry, mat: o.material, mats: [] }; buckets.set(key, b); }
    b.mats.push(o.matrixWorld.clone());
  });

  const group = new THREE.Group();
  group.name = 'glb:instanced';
  let instances = 0;

  for (const b of buckets.values()) {
    const im = new THREE.InstancedMesh(b.geo, b.mat, b.mats.length);
    im.name = `inst:${b.mat.name || 'unnamed'}×${b.mats.length}`;
    for (let i = 0; i < b.mats.length; i++) im.setMatrixAt(i, b.mats[i]);
    im.instanceMatrix.needsUpdate = true;
    // ⚠ **반드시 부른다.** 안 부르면 `boundingSphere` 가 원본 지오의 것(한 개짜리)이라
    // 프러스텀 컬링과 레이캐스트가 인스턴스 전체를 못 감싸고 조용히 틀린다.
    im.computeBoundingSphere();
    group.add(im);
    instances += b.mats.length;
  }

  // 규약 밖 노드는 월드 변환을 구워 그대로 옮긴다.
  for (const o of loose) {
    // ⚠ **`clone(false)` — 재귀를 끈다**(검수관 조건 N1). `Object3D.clone()` 은
    // `recursive = true` 가 기본이라 자식 트리를 통째로 복제하는데, `traverse` 는 그
    // 자식들을 **이미 개별로 방문해 처리했다**(콜백의 `return` 은 순회를 안 멈춘다).
    // 실측: 입력 메시 2개(숨김 부모 + 보이는 자식) → 결과가 **3개**를 그렸고,
    // **숨겨야 할 것의 자식이 보였다.** 자식은 각자 처리되므로 잃지 않는다.
    const clone = o.clone(false);
    clone.matrix.copy(o.matrixWorld);
    clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
    group.add(clone);
  }

  return { group, made: buckets.size, skipped: loose.length, instances };
}
