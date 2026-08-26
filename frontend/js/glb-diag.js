// glb-diag.js — **「어디에 서 있는가」를 재는 축.** world7·world8 진단 훅.
//
// ── 왜 있나 (감독 신고 2026-08-26) ──────────────────────────────────────────
// *"8을 클릭해보니 스폰 위치도 없고. 걸어다닐수가 없네"*. 그 직전 회차의 내 실측은
// **PASS 였다** — HUD 가 떴고 첫 화면이 물러났다. **모델이 실렸다는 것과 사람이 설
// 자리에 섰다는 것은 다른 일**인데 그것을 가르는 축이 하나도 없었다.
//
// 바로 앞 회차에 world2 되읽기에서 *"라벨이 아니라 씬을 세라"* 는 훅
// (`__world2.importedGlb`)을 만들어 놓고도 여기서 같은 형태를 반복했다. 그래서
// **좌표로** 재는 것을 따로 떼어 둔다 — 다음 사람이 이 파일의 존재를 보고 「무엇을
// 재야 하는가」를 알게.
//
// ⚠ 이것은 게이트가 아니다. 진단 도구이고, 스모크가 이 훅을 쓸 수는 있으나 지금은
// 쓰지 않는다(`scripts/smoke/config.mjs` 의 world8 항목이 무엇을 보는지는 그 자리에
// 적혀 있다).

import * as THREE from 'three';

/**
 * `window.__glbWorld` 에 진단 훅을 심는다.
 *
 * @param {() => object} snap 현재 상태를 돌려주는 함수.
 *        `{ pos, yaw, pitch, ready, fly, box, camera, root, walker }`
 */
export function installDiag(snap) {
  const r2 = (v) => +v.toFixed(2);
  globalThis.__glbWorld = {
    pose: () => {
      const s = snap();
      const b = s.box && !s.box.isEmpty() ? s.box : null;
      return {
        pos: { x: r2(s.pos.x), y: r2(s.pos.y), z: r2(s.pos.z) },
        yaw: +s.yaw.toFixed(3), pitch: +s.pitch.toFixed(3),
        ready: s.ready, fly: s.fly,
        near: s.walker ? s.walker.nearCount() : 0,
        box: b ? {
          min: { x: r2(b.min.x), y: r2(b.min.y), z: r2(b.min.z) },
          max: { x: r2(b.max.x), y: r2(b.max.y), z: r2(b.max.z) },
        } : null,
        far: s.camera.far,
        // ⚠ **프레임 시간은 안 잰다** — swiftshader 라 실기기와 무관하다(규율).
        // 대신 **드로우콜·삼각형**을 본다.
        // ⚠⚠ **이 값으로 그림자를 재려 하지 마라**(검수관 반려 B1): three 가
        // `shadowMap.render()` 뒤에 `info.reset()` 을 불러 **그림자 패스가 안 들어간다.**
        // 켜고 꺼도 같은 숫자다 — 「공짜」가 아니라 검출력 0 이다. 재는 법은
        // `glb-shadow.js` 헤더 한 곳이다.
        render: s.renderer ? {
          calls: s.renderer.info.render.calls,
          tris: s.renderer.info.render.triangles,
          shadow: s.renderer.shadowMap.enabled,
          autoUpdate: s.renderer.shadowMap.autoUpdate,
        } : null,
      };
    },
    /**
     * **진단용 순간이동.** 벽 충돌처럼 「특정 자리에서만 성립하는 것」을 재려면 거기까지
     * 걸어가야 하는데, 헤드리스는 프레임이 느려 6초를 걸어도 2m 밖에 못 간다 — 그래서
     * 검사가 **벽 근처에 가지도 못한 채 통과**한다(실측으로 그 형태가 났다).
     * 조작 API 가 아니라 측정 도구다.
     */
    moveTo: (x, y, z) => { const s = snap(); s.pos.set(x, y, z); return s.pos.toArray().map(r2); },
    /** 시선을 돌린다(라디안). 벽을 정면으로 두고 밀어보기 위한 것이다. */
    lookAt: (yaw) => snap().setYaw(yaw),
    /** 카메라 정면으로 쏴서 **무엇이 얼마나 떨어져 있는지** 본다. 빈 화면의 실측이다. */
    ahead: () => {
      const s = snap();
      if (!s.root) return null;
      const rc = new THREE.Raycaster();
      const dir = new THREE.Vector3(0, 0, -1).applyEuler(s.camera.rotation);
      rc.set(s.camera.position, dir);
      rc.far = s.camera.far;
      const hit = rc.intersectObject(s.root, true)[0];
      return hit ? { dist: +hit.distance.toFixed(1), name: hit.object.name || '(무명)' } : null;
    },
  };
}
