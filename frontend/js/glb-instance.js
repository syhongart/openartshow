// glb-instance.js — **반복되는 메시를 `InstancedMesh` 로 다시 묶는다.**
//
// ── 왜 (감독 신고 2026-08-26 *"8을 보니 프레임이 느린것같아"*) ───────────────
// 실측이 원인을 하나로 좁혔다:
//
//   드로우콜 10,856 · 삼각형 508,852   (프러스텀 컬링 **이후** 값이다)
//   그림자 ON/OFF 대조 → calls 차이 **0** — 그림자는 원인이 아니다
//   메시 28,707개인데 **고유 (지오메트리 + 재질) 조합은 40개**
//   상위 조합의 반복 수: 7229 · 3182 · 3182 · 2540 · 2540 …
//
// 즉 **같은 물건이 수천 번 낱개로 그려지고 있었다.** world2 는 원래 파츠 종류당
// `InstancedMesh` 하나로 그리는데(개수 불변식), GLB 내보내기가 그것을 **개별 메시로
// 펴서** 저장한다(glTF 에 인스턴싱 표현이 없다 — `EXT_mesh_gpu_instancing` 은 우리
// exporter 가 안 쓴다). 그러니 여기서 **되묶는 것**이 원래 상태로의 복원이다.
//
// ⚠ 이 판정에 이르기까지 내가 먼저 의심한 것은 **그림자**였다(그 회차에 내가 넣었으니).
// 대조 측정이 그것을 **기각**했다 — 추측대로 고쳤으면 원인은 그대로 남고 기능만 잃었다.
//
// ── 무엇을 안 하는가 ────────────────────────────────────────────────────────
// · **다중 재질 메시는 건드리지 않는다.** `material` 이 배열이면 `groups` 로 나뉘어
//   있어 인스턴싱 규약과 안 맞는다. 그대로 둔다(이 자산에는 0건이지만 임의 GLB 대비).
// · 지오메트리를 **복사하지 않는다.** `InstancedMesh` 가 원본을 참조하므로 메모리가
//   늘지 않는다 — 병합(merge)을 안 고른 이유이기도 하다. 병합은 지오를 통째로 복사하고
//   프러스텀 컬링 단위까지 잃는다.
//
// ── 못 하는 것 / 대가 ───────────────────────────────────────────────────────
// · **컬링 단위가 커진다.** 낱개 28,707개일 때는 화면 밖 메시가 개별로 걸러졌는데,
//   묶으면 「그 종류 전체」가 하나의 컬링 단위다. 삼각형은 늘 수 있다 — 드로우콜과
//   맞바꾸는 것이고, 모바일에서는 드로우콜이 대개 더 비싸다. **실측으로 확인한다.**
// · 인스턴스 단위로 재질을 바꿀 수 없다(이 페이지는 그럴 일이 없다).
// · **원본 노드 이름이 사라진다.** 진단 훅의 `ahead()` 가 «Mesh_11223» 대신 인스턴스
//   이름을 보고한다.

import * as THREE from 'three';

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
  const loose = [];   // 인스턴싱 규약에 안 맞는 것 — 그대로 옮긴다

  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (Array.isArray(o.material) || !o.material) { loose.push(o); return; }
    const key = `${o.geometry.uuid}|${o.material.uuid}`;
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
    im.castShadow = true;
    im.receiveShadow = true;
    group.add(im);
    instances += b.mats.length;
  }

  // 규약 밖 메시는 월드 변환을 구워 그대로 옮긴다 — 잃지 않는다.
  for (const o of loose) {
    const clone = o.clone();
    clone.matrix.copy(o.matrixWorld);
    clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
    clone.castShadow = true;
    clone.receiveShadow = true;
    group.add(clone);
  }

  return { group, made: buckets.size, skipped: loose.length, instances };
}
