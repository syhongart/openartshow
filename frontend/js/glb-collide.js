// glb-collide.js — **임의 GLB 에서 걸어다니기.** 지면을 딛고, 벽에 막히고, 미끄러진다.
//
// ── 왜 world2 의 충돌을 안 가져오나 (감독 지시 2026-08-26) ───────────────────
// 감독이 *"월드8에 월드 2의 기본 기능 다 들어가야지"* 라고 했다. 그런데 world2 의
// 충돌은 **파츠별 원형 footprint + 완전평면 지면**을 전제한다(`world2/decide/collide.ts`)
// — 「어디에 무엇이 서 있는가」를 절차적 배치 목록에서 읽는다. 임의 GLB 에는 그 목록이
// 없으므로 **그 코드는 옮길 수 없다.**
//
// ⚠ 그러나 「옮길 수 없다」가 「기능이 불가능하다」는 아니다. 감독이 요구한 것은 코드가
// 아니라 **결과**다. 그래서 임의 씬에서 성립하는 방식으로 새로 짠다 — 레이캐스트.
//
// ── 비용을 어떻게 감당하나 ──────────────────────────────────────────────────
// `glb-world.js` 헤더가 *"임의 지오의 레이캐스트는 비용이 크다"* 며 충돌을 일부러 뺐고,
// 그 판단 자체는 **씬 전체를 매 프레임 훑을 때** 참이다(world2 GLB 는 메시 28,707개).
// 여기서는 둘로 나눠 감당한다:
//
//   ① **월드 바운딩 구를 부팅 때 1회** 구워 배열로 들고 있는다(`buildColliders`).
//      매 프레임 `matrixWorld` 를 다시 곱하지 않는다.
//   ② **근처만** 레이캐스트한다. 그 목록을 `REFRESH_MS` 마다 한 번 갱신하고, 프레임
//      사이에는 재사용한다. 갱신은 배열 순회 + 거리 비교라 삼각형 검사보다 훨씬 싸다.
//
// 즉 매 프레임 도는 것은 **근처 메시 몇 개에 대한 레이캐스트 3회**(전진 x · 전진 z ·
// 발밑)이지 28,707개가 아니다.
//
// ⚠ **못 하는 것**: 근처 목록이 `REFRESH_MS` 동안 낡는다 — 그 사이 `NEAR_R` 밖에서
// 안으로 순간이동하면(스폰 직후 등) 한 틱 동안 충돌이 없다. 그리고 움직이는 물체는
// 안 따라간다(이 페이지의 GLB 는 정적이다). 삼각형 단위 정밀 판정도 아니다 —
// 반경 `RADIUS` 의 광선 하나이므로 아주 얇은 기둥 사이는 지나갈 수 있다.

import * as THREE from 'three';

/** 근처로 볼 반경(m). 이 안의 메시만 레이캐스트 대상이 된다. */
const NEAR_R = 45;
/** 근처 목록 갱신 주기(ms). 짧으면 정확하고 길면 싸다. */
const REFRESH_MS = 350;
/** 사람 반경(m) — 벽에 이만큼 앞서 막힌다. */
export const RADIUS = 0.45;
/** 이 높이까지는 걸어 오른다(계단·연석). 그보다 높으면 벽이다. */
const STEP_UP = 0.7;
/** 발밑을 이만큼 아래까지 찾는다(m). 절벽에서 내려갈 때의 상한이다. */
const FALL_LOOK = 80;

/**
 * **스폰 1회용** 지면 탐색 — (x, z) 위에서 아래로 씬 전체에 한 번 쏜다.
 *
 * ⚠ `createWalker` 의 `ground` 와 **다른 물건**이다. 저쪽은 「근처 목록」이 필요하고
 * 그 목록은 사람이 이미 어딘가 서 있어야 만들어진다 — **스폰은 그 이전**이라 쓸 수 없다.
 * 그래서 여기서는 씬 전체(`intersectObject(root, true)`)를 훑는다. 비싸지만 1회다.
 *
 * 바운딩 최저점을 지면으로 쓰면 안 되는 이유가 감독 신고의 절반이었다 — world2 는
 * `box.min.y` 가 **물 바닥**이라 거기 서면 땅속이다.
 *
 * 못 맞으면 `box.min.y` 로 폴백한다(속이 빈 모델 — 그때는 최저점이 최선이다).
 */
export function groundBelow(root, x, z, box) {
  if (!root) return box.min.y;
  const rc = new THREE.Raycaster();
  rc.set(new THREE.Vector3(x, box.max.y + 1, z), new THREE.Vector3(0, -1, 0));
  rc.far = (box.max.y - box.min.y) + 2;
  const hit = rc.intersectObject(root, true)[0];
  return hit ? hit.point.y : box.min.y;
}

/**
 * 씬의 모든 메시에 대해 **월드 좌표 바운딩 구**를 굽는다. 부팅 1회용이다.
 *
 * 반환은 `{o, c, r}` 배열 — 메시·중심·반경. 매 프레임 이 배열을 거리로 거른다.
 */
export function buildColliders(root) {
  const out = [];
  root.updateMatrixWorld(true);
  const s = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    // ⚠ `InstancedMesh` 는 **자기 바운딩**을 봐야 한다. `geometry.boundingSphere` 는
    // 인스턴스 **하나**의 크기라, 7,229번 반복되는 종류를 그 작은 구로 재면 「근처」
    // 판정이 조용히 틀린다(2026-08-26 인스턴싱 도입과 함께 열린 자리).
    if (o.isInstancedMesh) {
      if (!o.boundingSphere) o.computeBoundingSphere();
      const ib = o.boundingSphere;
      if (!ib) return;
      out.push({ o, c: ib.center.clone(), r: ib.radius });
      return;
    }
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    const bs = o.geometry.boundingSphere;
    if (!bs) return;
    // 스케일은 축마다 다를 수 있다 — 가장 큰 성분으로 키워야 **덜 잡는 일이 없다**.
    s.setFromMatrixScale(o.matrixWorld);
    out.push({
      o,
      c: bs.center.clone().applyMatrix4(o.matrixWorld),
      r: bs.radius * Math.max(s.x, s.y, s.z),
    });
  });
  return out;
}

/**
 * 걷기 판정기. `buildColliders` 의 배열을 받아 프레임마다 질의한다.
 *
 * 상태는 「근처 목록」 하나뿐이고 씬을 만지지 않는다 — 판정과 집행을 갈라 둔다.
 */
export function createWalker(all) {
  const rc = new THREE.Raycaster();
  const from = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let near = [];
  let nearAt = -1e9;

  /** 근처 목록을 갱신한다. 주기 안이면 아무 일도 안 한다. */
  function refresh(pos, now) {
    if (now - nearAt < REFRESH_MS) return;
    nearAt = now;
    near = [];
    for (const it of all) {
      // 구 표면까지의 거리로 본다 — 큰 메시(지면 한 장)는 중심이 멀어도 걸려야 한다.
      if (it.c.distanceTo(pos) - it.r < NEAR_R) near.push(it.o);
    }
  }

  /**
   * (x, z) 발밑의 지면 높이. 못 찾으면 `null`.
   *
   * 눈높이보다 `STEP_UP` 위에서 쏜다 — 그래야 낮은 턱을 «걸어 오를 수 있는 것» 으로
   * 보고, 그보다 높은 것은 아래 `blocked` 가 벽으로 잡는다.
   */
  function ground(x, y, z) {
    if (!near.length) return null;
    from.set(x, y + STEP_UP, z);
    dir.set(0, -1, 0);
    rc.set(from, dir);
    rc.far = STEP_UP + FALL_LOOK;
    const hit = rc.intersectObjects(near, false)[0];
    return hit ? hit.point.y : null;
  }

  /**
   * (x,y,z) 에서 (dx,dz) 로 `dist` 만큼 가는 길이 막혔는가.
   *
   * ⚠ 무릎 높이에서 쏜다(`y - EYE + STEP_UP`이 아니라 눈높이 그대로면 난간을 못 본다).
   * 호출부가 눈높이를 주므로 여기서 내려 쏜다.
   */
  function blocked(x, y, z, dx, dz, dist, kneeDrop) {
    if (!near.length) return false;
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) return false;
    from.set(x, y - kneeDrop, z);
    dir.set(dx / len, 0, dz / len);
    rc.set(from, dir);
    rc.far = dist;
    return rc.intersectObjects(near, false).length > 0;
  }

  return { refresh, ground, blocked, nearCount: () => near.length };
}
