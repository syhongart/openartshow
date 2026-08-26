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

/**
 * **시간대**를 반영한다 — 조명 각도·색, 하늘색, 안개. 0~24시.
 *
 * ⚠ 이것은 world2 의 하늘 엔진(`sky.js`, 1,609줄)이 **아니다.** 구름·비·별이 없고
 * 시간대만 움직인다. 화면 문구도 「날씨」가 아니라 「시간대」라고 적는다 — 없는 것을
 * 있는 것처럼 부르지 않는다. 엔진 이식은 별건이다(팀장 판정: 2차).
 */
export function applyTimeOfDay(scene, sun, hour) {
  const h = ((hour % 24) + 24) % 24;
  // 태양 고도 — 6시에 뜨고 18시에 진다. 정오에 최고.
  const t = (h - 6) / 12;                        // 0=일출 1=일몰
  const el = Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
  const day = Math.max(0, el);                   // 0(밤) ~ 1(정오)
  const az = Math.PI * (t - 0.5);
  sun.position.set(Math.sin(az) * 300, Math.max(12, el * 320), Math.cos(az) * 300);
  sun.intensity = 0.12 + day * 1.6;
  // 낮은 해는 붉다 — 색온도를 고도로 민다.
  sun.color.setRGB(1, 0.72 + day * 0.23, 0.5 + day * 0.44);
  // 하늘·안개: 낮 하늘색 → 노을 → 밤. 한 줄로 섞는다.
  const sky = new THREE.Color(0x0b1526).lerp(new THREE.Color(0x8fb4d8), day);
  if (day > 0 && day < 0.35) sky.lerp(new THREE.Color(0xd98b52), (0.35 - day) / 0.35 * 0.55);
  scene.background = sky;
  if (!scene.fog) scene.fog = new THREE.Fog(sky.getHex(), 300, 2600);
  else scene.fog.color.copy(sky);
  const hemi = scene.children.find((o) => o.isHemisphereLight);
  if (hemi) hemi.intensity = 0.35 + day * 1.9;
}
