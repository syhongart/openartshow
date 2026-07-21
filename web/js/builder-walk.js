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
import { PART_TYPES } from './space';
import { getProfile } from './auth.js';

const LU_CHIBI_LOOK_PREFIX = 'lu-chibi-look::'; // ui.js LU_CHIBI_LOOK_PREFIX와 동일 상수(저장 포맷 SSOT는 ui.js)

const WALK_SPEED = 2.4;   // m/s — 걷기 체감 속도(달리기 없음, MVP)
const TURN_RATE = 12;     // 아바타 몸통이 이동 방향으로 도는 관성(높을수록 즉각 회전)
const CAM_BACK = 2.3;     // 카메라 ↔ 아바타 수평 거리(어깨너머) — 몰입 위해 약간 축소(감독 #76 B)
const CAM_HEIGHT = 1.82;  // 카메라 y(아바타 뒤 약간 위)
const LOOK_Y = 0.45;      // 카메라가 바라보는 목표 y(발 앞 바닥+전방 벽면이 함께 들어오게 — 감독 #76 C)
const LOOK_FWD = 1.15;    // 바라보는 목표를 아바타 전방으로 밀어(배치 지점=전방 1.2m 바닥이 화면 중앙 쪽)
const AVATAR_R = 0.34;    // 아바타 몸 반경(파츠 충돌 근사) — 가구에 끼이지 않게 밀어냄(감독 지적)
// ── walk 카메라 FOV(감독 #76 B: 망원 해소) ──────────────────────────────────
// orbit 계약: 원복 값(52)의 SSOT는 builder.js PerspectiveCamera(52,...)이므로 여기서
// 하드코딩하지 않고 enter()에서 camera.fov를 읽어 savedFov에 보관 → exit()에서 그대로 원복.
const WALK_FOV = 70;         // walk 기본 수직 FOV(데스크탑) — 공간감 확대(감독 #76 선택: 세로 ~80°)
const WALK_FOV_MAX = 80;     // 세로 보정 상한 — 감독 "80도" 확정(긴 폰에서도 80° 초과 안 함)
const PORTRAIT_GAIN = 22;    // 세로(aspect<1) 수평 시야 부족 보정 계수 — 좁을수록 FOV 상향(표준 세로≈80°)
// 방 내부 경계·파츠 AABB에 대한 2D 카메라 당김(감독 #76 A: 벽 파묻힘).
const CAM_MIN_BACK = 0.8;    // 벽/파츠에 붙어도 최소 이 거리는 확보(카메라가 아바타에 너무 붙지 않게)
const CAM_HIT_MARGIN = 0.9;  // hit 거리의 90% 지점까지만 물러남(벽 뒤로 안 넘어가게)
const CAM_PART_MINH = 1.1;   // 이 높이 이상 solid 파츠만 카메라 가림 대상(낮은 가구는 카메라가 위로 넘어감)
// 아바타 전체 반투명(감독 #76 확정): 큰 머리가 어깨너머 뷰의 뒤 공간을 가려 배치가 어렵다 →
// 아바타를 반투명으로 만들어 뒤 벤치·바닥·전방 벽이 비치게 한다. 아웃라인(BackSide)은 불투명
// 유지해 실루엣이 또렷하고 접촉그림자도 유지. 값 조정은 이 상수 한 줄로(감독이 0.6 등 변경 가능).
const WALK_AVATAR_OPACITY = 0.5;

// walk 진입 시점의 화면비에 맞춘 목표 FOV(세로는 수평 시야가 좁아 상향 보정).
function walkFovFor(aspect) {
  const a = (Number.isFinite(aspect) && aspect > 0) ? aspect : 1;
  if (a >= 1) return WALK_FOV; // 가로: 기본
  return Math.min(WALK_FOV_MAX, WALK_FOV + (1 - a) * PORTRAIT_GAIN); // 세로: 좁을수록 상향(상한 clamp)
}
// 머리(ox,oz)가 내부인 축정렬 박스 [-bx,bx]×[-bz,bz]를 back 방향으로 나가는 최소 거리(벽까지).
function rayBoxExit(ox, oz, dx, dz, bx, bz) {
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (bx - ox) / dx); else if (dx < -1e-6) t = Math.min(t, (-bx - ox) / dx);
  if (dz > 1e-6) t = Math.min(t, (bz - oz) / dz); else if (dz < -1e-6) t = Math.min(t, (-bz - oz) / dz);
  return t;
}
// (ox,oz)에서 dir(dx,dz)로 쏜 레이가 중심(cx,cz)·반경(hx,hz) 박스에 처음 닿는 거리(slab). 없으면 Infinity.
function rayBoxEntry(ox, oz, dx, dz, cx, cz, hx, hz) {
  const minx = cx - hx, maxx = cx + hx, minz = cz - hz, maxz = cz + hz;
  let tmin = -Infinity, tmax = Infinity;
  if (Math.abs(dx) < 1e-6) { if (ox < minx || ox > maxx) return Infinity; }
  else { let t1 = (minx - ox) / dx, t2 = (maxx - ox) / dx; if (t1 > t2) { const s = t1; t1 = t2; t2 = s; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); }
  if (Math.abs(dz) < 1e-6) { if (oz < minz || oz > maxz) return Infinity; }
  else { let t1 = (minz - oz) / dz, t2 = (maxz - oz) / dz; if (t1 > t2) { const s = t1; t1 = t2; t2 = s; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); }
  if (tmax < Math.max(tmin, 0)) return Infinity; // 교차 없음(또는 레이 뒤쪽)
  return tmin > 0 ? tmin : 0; // 머리가 박스 안이면 0(즉시 당김)
}

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
  let savedFov = null;      // walk 진입 직전 orbit FOV 보관 → exit 시 원복(orbit 무영향)
  let lastFov = null;       // 마지막 적용 FOV(변할 때만 updateProjectionMatrix — 매 프레임 호출 방지)
  let walkMats = null;      // 반투명용 clone material 목록(원본 미오염) → exit()에서 dispose
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

    // ── 아바타 전체 반투명(감독 #76 확정) ──────────────────────────────────
    // 아웃라인(side===BackSide)을 제외한 모든 mesh material을 clone → transparent·opacity로
    // 반투명 적용. 원본 material(chibi.js가 mats 배열로 소유·dispose)은 건드리지 않는다.
    // clone은 map(texture)을 원본과 공유하지만 clone.dispose()는 texture를 dispose하지 않으므로
    // 원본 텍스처 미오염. 공유 material은 cloneCache로 1회만 clone(중복 방지).
    walkMats = [];
    const cloneCache = new Map();
    avatar.group.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      const next = arr.map((m) => {
        if (!m || m.side === THREE.BackSide) return m; // 아웃라인: 불투명 유지(실루엣·접촉그림자)
        let cl = cloneCache.get(m);
        if (!cl) {
          cl = m.clone();
          cl.transparent = true;
          cl.opacity = WALK_AVATAR_OPACITY;
          cl.depthWrite = true; // 자기겹침 안정(감독: 기본 true 유지 — depthWrite:false는 악화 확인됨)
          cloneCache.set(m, cl);
          walkMats.push(cl);
        }
        return cl;
      });
      o.material = Array.isArray(o.material) ? next : next[0];
    });

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

    // FOV: orbit 값(52) 보관 후 walk용으로 확대. 세로 보정은 update가 매 프레임 갱신.
    try {
      savedFov = camera.fov;
      const f = walkFovFor(camera.aspect);
      camera.fov = f; lastFov = f; camera.updateProjectionMatrix();
    } catch {
      // 예외 시 이미 대입됐을 walk fov를 orbit 값으로 되돌린다(FOV 누수 봉쇄 — 검수관 권고).
      if (savedFov != null) { try { camera.fov = savedFov; camera.updateProjectionMatrix(); } catch {} }
      lastFov = null;
    }

    active = true;
    bindKeys();
    return true;
  }
  /** 걸어서→조망 이탈: 아바타 제거·정리 + FOV 원복. orbit 상태(az/pol/rad/target)는 절대 건드리지 않는다(복귀는 호출부의 applyCamera 책임). */
  function exit() {
    if (!active) return false;
    unbindKeys();
    // FOV 원복: 진입 시 보관한 orbit FOV로 되돌림(orbit 무영향 계약).
    if (savedFov != null) { try { camera.fov = savedFov; camera.updateProjectionMatrix(); } catch {} }
    savedFov = null; lastFov = null;
    // 반투명 clone material 해제(원본은 avatar.dispose가 정리 — clone은 우리 소유).
    // clone.dispose()는 공유 map(texture)을 dispose하지 않으므로 원본 텍스처 미오염.
    if (walkMats) { for (const m of walkMats) { try { m.dispose(); } catch {} } walkMats = null; }
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

    // 세로 화면 대응 FOV 갱신(리사이즈 등 aspect 변화 시에만 updateProjectionMatrix).
    const targetFov = walkFovFor(camera.aspect);
    if (lastFov == null || Math.abs(targetFov - lastFov) > 0.01) {
      camera.fov = targetFov; lastFov = targetFov; camera.updateProjectionMatrix();
    }

    // 카메라는 camYaw 기준(프리룩 시 아바타와 독립적으로 둘러봄, 이동 시 진행방향 추적).
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
    // ── 벽 파묻힘 방지(감독 #76 A): 머리에서 카메라(뒤) 방향으로 2D 레이 → 벽·키 큰 solid 파츠에
    //    닿기 직전으로 CAM_BACK를 당김. THREE.Raycaster 대신 방 경계·파츠 AABB 산술(결정적·경량,
    //    매 프레임 씬 순회 없음 — 감독이 허용한 AABB 근사). 카메라가 벽 뒤로 넘어가지 않는다.
    const backx = -fx, backz = -fz; // 카메라가 물러나는 단위 방향(= camYaw 반대)
    let camBack = CAM_BACK;
    if (sp) {
      const dims = spaceDims(sp);
      const bx = dims.hw - dims.t - 0.15, bz = dims.hd - dims.t - 0.15; // 벽 안쪽면 살짝 안쪽
      const wallT = rayBoxExit(pos.x, pos.z, backx, backz, bx, bz);
      if (Number.isFinite(wallT) && wallT > 0) camBack = Math.min(camBack, wallT * CAM_HIT_MARGIN);
      if (Array.isArray(sp.parts)) {
        for (const p of sp.parts) {
          const spec = PART_TYPES[p.t];
          if (!spec || !spec.solid || spec.size[1] < CAM_PART_MINH) continue; // 낮은 가구는 카메라가 위로 넘어감 → 제외
          const swap = Math.abs(Math.sin(p.ry || 0)) > 0.7;
          const hx = (swap ? spec.size[2] : spec.size[0]) * 0.5;
          const hz = (swap ? spec.size[0] : spec.size[2]) * 0.5;
          const t = rayBoxEntry(pos.x, pos.z, backx, backz, p.x, p.z, hx, hz);
          if (Number.isFinite(t) && t < camBack) camBack = Math.min(camBack, t * CAM_HIT_MARGIN);
        }
      }
    }
    if (camBack < CAM_MIN_BACK) camBack = CAM_MIN_BACK;
    camera.position.set(pos.x + backx * camBack, CAM_HEIGHT, pos.z + backz * camBack);
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
