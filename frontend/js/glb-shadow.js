// glb-shadow.js — **임의 GLB 에 그림자를 건다.** world7·world8 전용.
//
// world2 도 실시간 그림자를 쓴다(감독 지시 2026-08-26 「기본 기능 다」). 다만 그쪽은
// 프러스텀을 **파셀 격자 셀 크기**에서 잡는데 임의 GLB 에 그 값이 없으므로 바운딩에서
// 유도한다.
//
// ⚠ 그림자 정책을 `glb-instance.js` 가 겸하고 있었다(검수관 권고 P4). 이름과 안 맞고,
// **그림자 대조 측정을 할 때 끄는 자리가 두 곳으로 갈린다.** 여기 한 곳으로 모은다.
//
// ⚠⚠ **드로우콜로 그림자 비용을 재려 하지 마라**(검수관 반려 B1). three r171 의
// `WebGLRenderer.render()` 는 `shadowMap.render()` **뒤에** `info.reset()` 을 부르므로
// (`three.module.js:15865,15871`) `renderer.info.render.calls` 에 그림자 패스가 **안
// 들어간다.** 켜고 꺼도 같은 숫자가 나오고, 그것은 「그림자가 공짜」가 아니라 **그 축의
// 검출력이 0** 이라는 뜻이다. 재려면 `info.autoReset = false` → 프레임 직전
// `info.reset()` → `render()` → 읽기.

import * as THREE from 'three';

/**
 * 씬 바운딩에서 그림자 프러스텀을 유도하고 캐스터/리시버를 켠다.
 *
 * @param renderer  `shadowMap` 을 켜는 주체
 * @param sun       방향광 — 이것이 그림자를 드리운다
 * @param scene     `sun.target` 을 붙일 곳
 * @param root      캐스터/리시버를 켤 트리(인스턴싱 **후** 그룹이면 39벌만 훑는다)
 * @param box       월드 바운딩
 */
export function setupShadow(renderer, sun, scene, root, box) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const mid = box.getCenter(new THREE.Vector3());
  // 세계가 커도 그림자 해상도를 지키려면 프러스텀에 상한이 필요하다. 하한은 작은 모델용.
  const half = Math.min(Math.max(Math.max(size.x, size.z) * 0.09, 40), 260);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const c = sun.shadow.camera;
  c.left = -half; c.right = half; c.top = half; c.bottom = -half;
  c.near = 1;
  c.far = Math.max(600, size.y * 4 + half * 4);
  c.updateProjectionMatrix();
  // ⚠ 태양은 **중심 고정**이다 — 사람을 안 따라간다. 그래서 1920m 세계에서는 중심
  // 근처 `half` 반경 안에서만 그림자가 진다. 따라다니게 하려면 매 프레임 프러스텀을
  // 옮겨야 하고 그러면 그림자 맵을 매번 다시 굽는다. 「경계도 판정이다」로 여기서 멈춘다.
  sun.target.position.copy(mid);
  scene.add(sun.target);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}
