// visit.js — 방문자뷰(관람 워크스루) 경량 1인칭 컨트롤러 (behind-flag)
// -----------------------------------------------------------------------------
// 아키텍처 A(가산형 독립 방문자 모드): 라이브 미술관 런타임(main/player/artworks/config)
// 을 일절 건드리지 않고, 빌더와 동일한 재사용 자산(space.js·space-render.js)만 소비하는
// 자체 완결 워크스루. 카메라/이동은 player.js와 공통화하지 않고 여기 독립 구현(팀장 §10-2).
//
// createVisit({ canvas, space, opts }) → 스크립트 API(헤드리스 검증 가능):
//   getCamera/getRenderer/getScene/getGroup/renderOnce/update/walk/dispose/on ...
//   opts.headless: RAF·포인터락·이벤트 바인딩 비활성(헤드리스에서 walk/update 직접 호출).
// -----------------------------------------------------------------------------
import * as THREE from 'three';
import { buildSpaceGroup, disposeSpaceGroup, partY, addRoomLighting, bakeShellLightmapsAsync } from './space-render.js';
import { PART_TYPES } from './space';

const EYE = 1.5;            // 시점 높이(m)
const SPEED = 3.0;          // 이동 속도(m/s)
const RADIUS = 0.3;         // 플레이어 반경(충돌 마진)
const PITCH_LIMIT = 1.45;   // 상하 시선 클램프(rad)

// 빌더(builder.js)의 makeEnvMap 계승 — 은은한 PMREM 환경 반사(글로시 바닥·재질 깊이).
function makeEnvMap(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  es.add(new THREE.HemisphereLight(0xdfe4f2, 0x3a3630, 1.0));
  const hi = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: 0xffe9c8 })); hi.position.set(0, 5, -6); es.add(hi);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(4, 8), new THREE.MeshBasicMaterial({ color: 0x2a2c3a })); side.position.set(-6, 3, 0); side.rotation.y = Math.PI / 2; es.add(side);
  const tex = pm.fromScene(es, 0.02).texture; pm.dispose();
  [hi, side].forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
  return tex;
}

export function createVisit({ canvas, space, opts = {} } = {}) {
  const headless = !!opts.headless;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95; // 방문자 톤(빌더보다 살짝 차분)
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff3e6, 0x241f30, 0.6));
  scene.environment = makeEnvMap(renderer);
  const key = new THREE.DirectionalLight(0xfff2e0, 0.7); key.position.set(3, 6, 4);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005;
  { const c = key.shadow.camera; c.left = -9; c.right = 9; c.top = 7; c.bottom = -7; c.near = 0.5; c.far = 30; c.updateProjectionMatrix(); }
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 200);

  // 공간 조립 — 방문자뷰: pickable 없음(인스턴싱 이점)·천장 표시(hideCeiling 미지정).
  // onAsyncTex: 작품 이미지 비동기 로드 완료 시 리렌더(헤드리스=연속 루프 없음 대비). 연속 루프면 자동 반영.
  const group = buildSpaceGroup(space, { onAsyncTex: () => { if (!disposed) renderOnce(); } });
  addRoomLighting(group);
  scene.add(group);
  const dims = group.userData.dims; // {fw,fd,hw,hd,H,t}

  // 대기 원근(fog) — 방 스케일에 맞춤. 젤다식 깊이감. 색은 은은한 중립.
  const FOG_COLOR = 0x20232b;
  const diag = Math.hypot(dims.fw, dims.fd);
  const fogNear = Math.min(dims.fw, dims.fd) * 0.5;
  const fogFar = diag * 1.5;
  const fogObj = new THREE.Fog(FOG_COLOR, fogNear, fogFar);
  scene.fog = fogObj;
  scene.background = new THREE.Color(FOG_COLOR);
  renderer.setClearColor(FOG_COLOR, 1);

  // 물 바닥 스크롤 소스 — 텍스처 있으면 애니, 없으면 정적 폴백(무동작).
  const floorMat = group.userData.floor && group.userData.floor.material;
  const waterMap = (space.shell.finish.floor === 'water' && floorMat && floorMat.map) ? floorMat.map : null;

  // ── 1인칭 상태 ──
  const spawn = space.spawn || { x: 0, z: 0, ry: 0 };
  const pos = new THREE.Vector3(spawn.x, EYE, spawn.z);
  let yaw = spawn.ry || 0;   // Y축 회전(좌우)
  let pitch = 0;             // 상하 시선

  function applyPose() {
    camera.position.set(pos.x, pos.y, pos.z);
    const cp = Math.cos(pitch);
    const dir = new THREE.Vector3(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
    camera.lookAt(pos.x + dir.x, pos.y + dir.y, pos.z + dir.z);
  }

  // ── 충돌: (1) 방 경계 clamp (2) solid 파츠 XZ AABB ──
  // solid 파츠는 space.parts에서 직접 취득 — partRefs는 인스턴싱(비-pickable) 솔리드를
  // 누락하므로(canInstance 분기) 완전한 충돌 목록을 위해 space 문서를 순회한다.
  const solids = (space.parts || []).filter((p) => PART_TYPES[p.t] && PART_TYPES[p.t].solid).map((p) => {
    const [w, h, d] = PART_TYPES[p.t].size;
    const c = Math.abs(Math.cos(p.ry || 0)), s = Math.abs(Math.sin(p.ry || 0));
    const ex = (w / 2) * c + (d / 2) * s;   // 회전 사각형의 정확한 AABB 반폭(ry 임의각 허용)
    const ez = (w / 2) * s + (d / 2) * c;
    const cy = (p.y != null) ? p.y : partY(p.t, dims.H);
    return { x: p.x, z: p.z, ex, ez, bottom: cy - h / 2, top: cy + h / 2 };
  });

  function clampRoom(v, half) { return Math.max(-half + dims.t + RADIUS, Math.min(half - dims.t - RADIUS, v)); }
  // 파츠 침투 여부(반경 R 확장 AABB에 점 포함). y 겹침: 밟고 걷는 바닥면(floorTile top=0.1)만
  // 통과 허용하고, 그보다 높은 solid는 전부 차단(space.js 계약 "solid=충돌"). 걸림턱 높이 STEP_OVER
  // 임계 0.12는 floorTile(0.1)만 넘고 wallPanel(top=0.2)·벤치 등은 차단 → 낮은 벽 관통 방지(검수 BLOCKER-2).
  const STEP_OVER = 0.12;
  function blockedByParts(x, z) {
    for (const b of solids) {
      if (b.top <= STEP_OVER) continue; // 밟고 걷는 바닥면(floorTile)만 통과
      if (b.bottom >= 1.7) continue;    // 머리 위 스택 파츠는 바닥 이동에 영향 없음
      if (Math.abs(x - b.x) <= b.ex + RADIUS && Math.abs(z - b.z) <= b.ez + RADIUS) return true;
    }
    return false;
  }

  /** yaw 기준 전/우로 이동(축분리 슬라이딩 충돌). 대각 정규화. */
  function walk(fwdAmt, rightAmt, dt) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let dx = fwdAmt * fx + rightAmt * rx;
    let dz = fwdAmt * fz + rightAmt * rz;
    const len = Math.hypot(dx, dz);
    if (len > 1e-6) { dx /= len; dz /= len; }      // 방향 정규화(대각 과속 방지)
    else return;
    dx *= SPEED * dt; dz *= SPEED * dt;
    // X축 시도 → 방 clamp → 파츠 검사(막히면 유지). 이후 Z축 동일.
    let tx = clampRoom(pos.x + dx, dims.hw);
    if (!blockedByParts(tx, pos.z)) pos.x = tx;
    let tz = clampRoom(pos.z + dz, dims.hd);
    if (!blockedByParts(pos.x, tz)) pos.z = tz;
    applyPose();
  }

  function lookDelta(dx, dy) {
    yaw -= dx;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch - dy));
    applyPose();
  }

  // ── 입력(키/터치) ──
  const kmov = { fwd: 0, right: 0 };   // 키보드 이동 축(-1..1)
  const tmov = { fwd: 0, right: 0 };   // 터치 조이스틱 이동 축
  const keys = {};
  function recomputeKeyMove() {
    kmov.fwd = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
    kmov.right = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  }

  const listeners = {};
  const emit = (ev, d) => (listeners[ev] || []).forEach((f) => f(d));

  // ── RAF ──
  let raf = 0, last = 0;
  function step(now) {
    const t = now || 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    update(dt);
    raf = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame(step) : 0;
  }

  /** 한 프레임 전진: 입력 이동 + 물 스크롤 + 렌더. 헤드리스에서 dt 지정 호출 가능. */
  function update(dt) {
    const d = (typeof dt === 'number' && isFinite(dt)) ? dt : 0.016;
    const f = kmov.fwd + tmov.fwd, r = kmov.right + tmov.right;
    if (f || r) walk(f, r, d);
    if (waterMap) { waterMap.offset.x = (waterMap.offset.x + d * 0.012) % 1; waterMap.offset.y = (waterMap.offset.y + d * 0.008) % 1; }
    renderer.render(scene, camera);
  }
  function renderOnce() { applyPose(); renderer.render(scene, camera); }

  // ── 포인터락 + 이벤트(데스크톱) / 터치(모바일) ──
  let locked = false;
  function onMouseMove(e) { if (locked) lookDelta((e.movementX || 0) * 0.0025, (e.movementY || 0) * 0.0025); }
  function onLockChange() { locked = (typeof document !== 'undefined') && document.pointerLockElement === canvas; emit('lock', { locked }); }
  function onCanvasClick() { if (canvas.requestPointerLock) canvas.requestPointerLock(); }
  function onKeyDown(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys[k] = true; recomputeKeyMove(); e.preventDefault(); }
  }
  function onKeyUp(e) { const k = e.key.toLowerCase(); if (k in keys) { keys[k] = false; recomputeKeyMove(); } }

  if (!headless && typeof window !== 'undefined') {
    canvas.addEventListener('click', onCanvasClick);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / (h || 1); camera.updateProjectionMatrix(); }

  applyPose();
  if (!headless) { resize((typeof window !== 'undefined' ? window.innerWidth : 1280), (typeof window !== 'undefined' ? window.innerHeight : 720)); raf = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame(step) : 0; }

  // ── 설정 ──
  function setFog(on) { scene.fog = on ? fogObj : null; return !!scene.fog; }
  function toggleFog() { return setFog(!scene.fog); }
  // 비동기 베이크(#54): 첫 방문을 막지 않는다. 표면을 프레임에 나눠 구우며 라이트맵이 점진적으로
  // 채워진다(렌더 루프가 매 프레임 그려 진행이 보인다). 소프트 GPU는 256² 폴백(space-render bakeRes).
  // 반환은 Promise — 헤드리스는 await로 완료를 관측. dispose 시 진행 중 베이크를 cancel.
  let bakeCtl = null, baking = false, disposed = false;
  function bake(o = {}) {
    if (baking || (group.userData && group.userData.baked)) return bakeCtl ? bakeCtl.promise : Promise.resolve({ surfaces: 0 });
    baking = true;
    bakeCtl = bakeShellLightmapsAsync(group, renderer, { ...o, onProgress: (d, t) => { if (disposed) return; emit('bakeprogress', { done: d, total: t }); if (headless) renderOnce(); } });
    bakeCtl.promise.then((r) => { baking = false; if (disposed || r.cancelled) return; renderOnce(); emit('baked', r); }); // dispose/취소 후 좀비 콜백 방지(검수 MINOR)
    return bakeCtl.promise;
  }

  return {
    // 컨트롤러 API(헤드리스 검증·HTML 배선 공용)
    walk, update, renderOnce, resize, lookDelta,
    setFog, toggleFog, bake,
    // 터치/키 브리지(visit.html에서 사용)
    setTouchMove: (fwd, right) => { tmov.fwd = fwd || 0; tmov.right = right || 0; },
    setKey: (k, v) => { keys[String(k).toLowerCase()] = !!v; recomputeKeyMove(); },
    getPosition: () => pos.clone(),
    setPosition: (x, y, z) => { pos.set(x, y == null ? EYE : y, z); applyPose(); },
    getYaw: () => yaw, setYaw: (v) => { yaw = v; applyPose(); },
    getPitch: () => pitch,
    isLocked: () => locked,
    hasWater: () => !!waterMap,
    getDims: () => ({ ...dims }),
    on: (ev, f) => { (listeners[ev] = listeners[ev] || []).push(f); },
    get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; }, get group() { return group; },
    getScene: () => scene, getCamera: () => camera, getRenderer: () => renderer, getGroup: () => group,
    dispose() {
      disposed = true; // 사후 bake 콜백(renderOnce/emit) 무력화 — disposed 렌더러 접근 방지(검수 MINOR)
      if (bakeCtl) bakeCtl.cancel(); // 진행 중 비동기 베이크 중단(dispose된 지오메트리 접근 방지)
      if (raf) cancelAnimationFrame(raf);
      if (!headless && typeof window !== 'undefined') {
        canvas.removeEventListener('click', onCanvasClick);
        document.removeEventListener('pointerlockchange', onLockChange);
        document.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      }
      if (group) { scene.remove(group); disposeSpaceGroup(group); }
      if (scene.environment) { scene.environment.dispose(); scene.environment = null; }
      renderer.dispose();
    },
  };
}
