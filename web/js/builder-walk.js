// builder-walk.js — 빌더 "걸어서 빌드" 모드 (신규 가산 모듈, 팀장 설계)
// -----------------------------------------------------------------------------
// 목적: 아야모가 공간 안을 걸으며 그 자리에 가구를 배치(실제 인테리어처럼).
// 병존 원칙: 조망(orbit) 모드는 완전히 그대로 두고, 이 모듈은 진입/이탈 시에만
// 카메라를 대신 구동한다. builder.js의 orbit 상태 객체(az/pol/rad/target)는
// 이 파일 어디에서도 읽거나 쓰지 않는다(팀장 지시 — orbit 절대 변경 금지).
//
// player.js(보호4파일) import/결합 금지 — 자체 경량 3인칭 컨트롤러.
// 이동 입력은 setMove(vx,vz)/setYaw(dy) 추상 API로 받는다:
//   - vx/vz: 로컬 입력축(전방=-1, 후방=+1, 좌=-1, 우=+1) — player.js와 동일 관례.
//     크기(magnitude)가 1을 넘으면 정규화(대각 이동 가속 방지).
//   - dy: 카메라 팔로우 기준 yaw에 대한 상대 회전(향후 모바일 "룩" 조이스틱 대비 —
//     MVP는 WASD만 쓰므로 미사용이어도 API는 항상 존재).
// 데스크탑 WASD/화살표는 이 모듈이 직접 window keydown/keyup을 구독해 처리한다
// (builder.js의 기존 키 핸들러와는 분리 — builder.js는 걸어서 모드일 때 자신의
// WASD/회전/삭제/undo 단축키를 비활성화만 한다).
//
// 아바타 정체성: ui.js의 chibiLookKey(uid) 저장 형식을 그대로 재현해 저장된 룩을
// 읽는다('lu-chibi-look::' + (provider:name | 'guest')). ui.js를 통째로 import하지
// 않고 auth.js(경량)만 참조해 키를 재구성한다 — 저장/포맷 SSOT는 ui.js가 유지.
// -----------------------------------------------------------------------------
import * as THREE from 'three';
import { buildChibi } from './chibi.js';
import { spaceDims } from './space-render.js';
import { PART_TYPES } from './space.js';
import { getProfile } from './auth.js';

const LU_CHIBI_LOOK_PREFIX = 'lu-chibi-look::'; // ui.js LU_CHIBI_LOOK_PREFIX와 동일 상수(저장 포맷 SSOT는 ui.js)

const WALK_SPEED = 2.4;   // m/s — 걷기 체감 속도(달리기 없음, MVP)
const TURN_RATE = 12;     // 아바타 몸통이 이동 방향으로 도는 관성(높을수록 즉각 회전)
const CAM_BACK = 2.5;     // 카메라 ↔ 아바타 수평 거리(어깨너머)
const CAM_HEIGHT = 1.85;  // 카메라 y(아바타 뒤 약간 위)
const LOOK_Y = 0.35;      // 카메라가 바라보는 목표 y(발 앞 바닥이 보이도록 낮게)
const LOOK_FWD = 0.9;     // 바라보는 목표를 아바타 전방으로 살짝 밀어(전방 시야 확보)
const AVATAR_R = 0.34;    // 아바타 몸 반경(파츠 충돌 근사) — 가구에 끼이지 않게 밀어냄(감독 지적)

function currentLookKey() {
  try {
    const p = getProfile();
    const uid = (p && p.provider && p.name) ? `${p.provider}:${p.name}` : 'guest';
    return LU_CHIBI_LOOK_PREFIX + uid;
  } catch { return LU_CHIBI_LOOK_PREFIX + 'guest'; }
}
function readStoredLook() {
  try {
    const raw = localStorage.getItem(currentLookKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : null;
  } catch { return null; }
}
// 최단 경로 각도 보간(±π 랩어라운드) — 아바타가 반대방향으로 돌 때 먼 길로 안 돌게.
function lerpAngle(a, b, t) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + diff * t;
}

/**
 * @param {{ scene: THREE.Scene, camera: THREE.PerspectiveCamera,
 *           clampToRoom: (v:number,half:number,t:number)=>number, getSpace: () => object }} deps
 *   clampToRoom·getSpace(→spaceDims 입력)는 builder.js 기존 함수를 그대로 주입받아 재사용한다
 *   (로직 복제 방지 — 벽 경계 계산이 한 곳에만 존재).
 */
export function createBuilderWalk({ scene, camera, clampToRoom, getSpace }) {
  let active = false;
  let group = null;   // 걸어서 모드 전용 아바타 컨테이너(공간 group과 별개 — rebuild에 영향 없음)
  let avatar = null;  // buildChibi() 반환물
  const pos = new THREE.Vector3(0, 0, 0);
  let ry = 0;          // 아바타 몸통 yaw(= 진행 방향으로 서서히 수렴)
  let camYaw = 0;      // 카메라 팔로우 기준 yaw(향후 look 입력 대비 — MVP는 ry와 동기)
  let moveX = 0, moveZ = 0; // 정규화된 로컬 입력 벡터(전방=-z, 우측=+x)
  const keyState = { w: false, s: false, a: false, d: false, up: false, down: false, left: false, right: false };

  function applyMove(vx, vz) {
    let x = Number.isFinite(vx) ? vx : 0;
    let z = Number.isFinite(vz) ? vz : 0;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    moveX = x; moveZ = z;
  }
  function recomputeFromKeys() {
    let x = 0, z = 0;
    if (keyState.w || keyState.up) z -= 1;
    if (keyState.s || keyState.down) z += 1;
    if (keyState.a || keyState.left) x -= 1;
    if (keyState.d || keyState.right) x += 1;
    applyMove(x, z);
  }
  function onKeyDown(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // 입력창 타이핑 중엔 무시(builder.js 관례 계승)
    const k = e.key.toLowerCase();
    let hit = true;
    if (k === 'w') keyState.w = true;
    else if (k === 's') keyState.s = true;
    else if (k === 'a') keyState.a = true;
    else if (k === 'd') keyState.d = true;
    else if (e.key === 'ArrowUp') keyState.up = true;
    else if (e.key === 'ArrowDown') keyState.down = true;
    else if (e.key === 'ArrowLeft') keyState.left = true;
    else if (e.key === 'ArrowRight') keyState.right = true;
    else hit = false;
    if (hit) { recomputeFromKeys(); e.preventDefault(); }
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    let hit = true;
    if (k === 'w') keyState.w = false;
    else if (k === 's') keyState.s = false;
    else if (k === 'a') keyState.a = false;
    else if (k === 'd') keyState.d = false;
    else if (e.key === 'ArrowUp') keyState.up = false;
    else if (e.key === 'ArrowDown') keyState.down = false;
    else if (e.key === 'ArrowLeft') keyState.left = false;
    else if (e.key === 'ArrowRight') keyState.right = false;
    else hit = false;
    if (hit) recomputeFromKeys();
  }
  function bindKeys() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }
  function unbindKeys() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }

  /** 조망→걸어서 진입: 아야모 스폰(저장된 look, 없으면 기본 룩). */
  function enter() {
    if (active) return true;
    let look = null;
    try { look = readStoredLook(); } catch { look = null; }
    let built;
    try { built = buildChibi(look || undefined); } catch { built = buildChibi(undefined); } // look 파손 방어 → 기본 룩 폴백
    avatar = built;
    group = new THREE.Group();
    group.add(avatar.group);

    const sp = typeof getSpace === 'function' ? getSpace() : null;
    const dims = sp ? spaceDims(sp) : null;
    const startZ = dims ? Math.min(1.2, Math.max(0, dims.hd * 0.35)) : 0.8; // 방 중앙 살짝 남쪽에서 시작
    pos.set(0, 0, startZ);
    ry = 0; camYaw = 0; // yaw=0 → -Z(방 안쪽) 바라봄
    moveX = 0; moveZ = 0;
    for (const k of Object.keys(keyState)) keyState[k] = false;

    group.position.set(pos.x, 0, pos.z);
    group.rotation.y = ry;
    scene.add(group);

    active = true;
    bindKeys();
    return true;
  }
  /** 걸어서→조망 이탈: 아바타 제거·정리. orbit 상태는 여기서 절대 건드리지 않는다(복귀는 호출부의 applyCamera 책임). */
  function exit() {
    if (!active) return false;
    unbindKeys();
    if (group) { scene.remove(group); group = null; }
    if (avatar) { try { avatar.dispose(); } catch {} avatar = null; }
    active = false;
    moveX = 0; moveZ = 0;
    return true;
  }

  function setMove(vx, vz) { applyMove(vx, vz); } // 모바일 조이스틱 등 외부 API(가산) — 키보드 상태와 무관하게 즉시 반영
  function setYaw(dy) { if (Number.isFinite(dy)) camYaw += dy; } // 향후 룩 입력용(MVP 미사용이어도 API 계약 유지)

  /** 매 프레임 호출(빌더 렌더 루프에서). delta(초) 기준 이동·회전·카메라 팔로우. */
  function update(delta) {
    if (!active || !avatar || !group) return;
    const d = Math.min(Math.max(delta || 0, 0), 0.1); // 탭 전환 등 큰 델타 방어(builder.js chibi.js 관례와 동일 클램프)
    const mag = Math.min(1, Math.hypot(moveX, moveZ));

    if (mag > 0.001) {
      // 이동: 카메라(camYaw)가 보는 방향 기준 로컬 입력 → 월드 방향(player.js 변환식 재사용).
      const s = Math.sin(camYaw), c = Math.cos(camYaw);
      const wx = moveX * c + moveZ * s;
      const wz = -moveX * s + moveZ * c;
      const wlen = Math.hypot(wx, wz) || 1;
      pos.x += (wx / wlen) * WALK_SPEED * d * mag;
      pos.z += (wz / wlen) * WALK_SPEED * d * mag;
      const targetRy = Math.atan2(-wx, -wz); // npc.js "yaw=0 → -Z" 관례와 동일 부호
      ry = lerpAngle(ry, targetRy, 1 - Math.exp(-TURN_RATE * d));
      // 이동 중엔 카메라를 진행 방향으로 부드럽게 정렬(뒤에서 따라감).
      camYaw = lerpAngle(camYaw, ry, 1 - Math.exp(-TURN_RATE * d));
    } else {
      // 정지: 프리룩(감독 결정 A) — setYaw(우측 드래그)로 누적된 camYaw를 유지해 제자리서
      // 둘러보고, 아바타 몸통(ry)이 그 방향으로 서서히 수렴. getForwardPoint가 ry 기준이라
      // 둘러본 방향 앞에 배치된다("실제 인테리어처럼 서서 둘러보고 놓기").
      ry = lerpAngle(ry, camYaw, 1 - Math.exp(-TURN_RATE * d));
    }

    const sp = typeof getSpace === 'function' ? getSpace() : null;
    if (sp && typeof clampToRoom === 'function') {
      const dims = spaceDims(sp);
      pos.x = clampToRoom(pos.x, dims.hw, dims.t);
      pos.z = clampToRoom(pos.z, dims.hd, dims.t);
    }
    // 파츠 충돌(감독: 아바타가 가구에 끼이지 않게) — solid 파츠 AABB에서 최소 침투축으로 밀어냄.
    // 회전은 45° 기준 폭/깊이 swap으로 근사(파츠는 대부분 90° 스냅). 2회 반복으로 코너 안정.
    if (sp && Array.isArray(sp.parts)) {
      for (let it = 0; it < 2; it++) {
        for (const p of sp.parts) {
          const spec = PART_TYPES[p.t];
          if (!spec || !spec.solid) continue;
          const swap = Math.abs(Math.sin(p.ry || 0)) > 0.7;
          const ew = (swap ? spec.size[2] : spec.size[0]) * 0.5 + AVATAR_R;
          const ed = (swap ? spec.size[0] : spec.size[2]) * 0.5 + AVATAR_R;
          const dx = pos.x - p.x, dz = pos.z - p.z;
          if (Math.abs(dx) < ew && Math.abs(dz) < ed) {
            const penX = ew - Math.abs(dx), penZ = ed - Math.abs(dz);
            if (penX < penZ) pos.x += (dx < 0 ? -penX : penX);
            else pos.z += (dz < 0 ? -penZ : penZ);
          }
        }
      }
      // 밀어낸 뒤 다시 벽 경계 안으로(구석에서 벽-파츠 사이 끼임 방지).
      if (typeof clampToRoom === 'function') {
        const dims = spaceDims(sp);
        pos.x = clampToRoom(pos.x, dims.hw, dims.t);
        pos.z = clampToRoom(pos.z, dims.hd, dims.t);
      }
    }
    group.position.set(pos.x, 0, pos.z);
    group.rotation.y = ry;
    avatar.update(d, mag * WALK_SPEED); // chibi 걷기 애니메이션(팔다리·바운스)

    // 카메라는 camYaw 기준(프리룩 시 아바타와 독립적으로 둘러봄, 이동 시 진행방향 추적).
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
    camera.position.set(pos.x - fx * CAM_BACK, CAM_HEIGHT, pos.z - fz * CAM_BACK);
    camera.lookAt(pos.x + fx * LOOK_FWD, LOOK_Y, pos.z + fz * LOOK_FWD);
  }

  /** 배치 대상 = 아바타 전방 dist(m) 바닥 좌표. y 스냅/클램프는 호출부(builder.js)의 기존 applySnap+clampToRoom이 담당. */
  function getForwardPoint(dist = 1.2) {
    if (!active) return null;
    const fx = -Math.sin(ry), fz = -Math.cos(ry);
    return { x: pos.x + fx * dist, z: pos.z + fz * dist };
  }

  function dispose() { exit(); }

  return {
    enter, exit, update, setMove, setYaw, getForwardPoint,
    isActive: () => active,
    getAvatarGroup: () => group,
    dispose,
  };
}
