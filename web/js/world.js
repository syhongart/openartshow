// world.js — 오픈월드 파셀 스트리밍 워크스루 (behind-flag · 첫 스파이크)
// -----------------------------------------------------------------------------
// 아키텍처(가산형 독립): 라이브 미술관 런타임(main/player/artworks/config)과 방문자뷰
// (visit.js)를 일절 수정하지 않고, 재사용 자산(space-render·avatar·npc)만 소비하는
// 자체 완결 컨트롤러. visit.js의 검증된 이동·충돌 로직을 "여러 파셀(단칸 공간)을 그리드에
// 타일링하고 인접분만 스트리밍"하도록 확장한다. "파라미터가 곧 공간"을 파셀 단위로 확장.
//
// 파셀 모델: 각 공간은 정수 그리드 좌표 (px,pz)에 놓인다. 월드 오프셋 = (px*cellX, 0, pz*cellZ).
//   이웃 참조는 저장하지 않고 (px±1, pz±1) 계산으로 조회(그리드의 핵심 이점).
//   shell.entries(space.js 가산)에 든 방향 + 이웃 파셀 로드 시 문틀 통로로 통과 허용.
//
// createWorld({ canvas, parcels, opts }) → 스크립트 API(헤드리스 검증 가능):
//   parcels: [{ px, pz, space, npc? }]  (npc: { roster, count } — 그 파셀에 직원 NPC 소환)
//   walk/update/renderOnce/lookDelta/getPosition/getLoadedKeys/dispose/on ...
//   opts.cellX/cellZ: 축별 파셀 셀 크기(m). opts.cell: 정사각 폴백(기본 32). opts.headless: RAF·이벤트 바인딩 비활성.
// -----------------------------------------------------------------------------
import * as THREE from 'three';
import { buildSpaceGroup, disposeSpaceGroup, addRoomLighting, spaceDims, partY, DOOR_W } from './space-render.js';
import { PART_TYPES } from './space.js';
import { createAvatarInstance } from './avatar.js';
import { NpcCrowd } from './npc.js';

const EYE = 1.5;            // 시점 높이(m)
const SPEED = 3.0;         // 이동 속도(m/s)
const RADIUS = 0.3;        // 플레이어 반경(충돌 마진)
const PITCH_LIMIT = 1.45;  // 상하 시선 클램프(rad)
const STEP_OVER = 0.12;    // 걸림턱(바닥타일만 통과) — visit.js 계약 계승
// DOOR_W(문틀 통로 폭)는 space-render.js에서 import — 렌더/통과 판정 단일 상수(드리프트 방지).

// 빌더/방문자뷰 계승 — 은은한 PMREM 환경 반사(글로시 바닥·재질 깊이).
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

export function createWorld({ canvas, parcels = [], opts = {} } = {}) {
  const headless = !!opts.headless;
  // 비정사각 셀(cellX/cellZ) — 통일 footprint(medium 9×7)면 cellX=9,cellZ=7로 벽 정확 정합.
  // opts.cell(스칼라) 폴백 유지 → 스파이크(createWorld({cell:9}))·정사각 그리드 무회귀.
  const CELLX = opts.cellX || opts.cell || 32;
  const CELLZ = opts.cellZ || opts.cell || 32;
  const CELL_MAX = Math.max(CELLX, CELLZ); // fog 스케일 대표값

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff3e6, 0x241f30, 0.6));
  scene.environment = makeEnvMap(renderer);
  const key = new THREE.DirectionalLight(0xfff2e0, 0.7); key.position.set(3, 6, 4);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005;
  { const c = key.shadow.camera; c.left = -14; c.right = 14; c.top = 10; c.bottom = -10; c.near = 0.5; c.far = 44; c.updateProjectionMatrix(); }
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 400);

  // 대기 원근(fog) — 파셀 스케일. 방들이 보이도록 near/far를 넉넉히.
  const FOG_COLOR = 0x20232b;
  scene.fog = new THREE.Fog(FOG_COLOR, CELL_MAX * 0.9, CELL_MAX * 3.0);
  scene.background = new THREE.Color(FOG_COLOR);
  renderer.setClearColor(FOG_COLOR, 1);

  // ── 파셀 인덱스 / 로드 상태 ──
  const keyOf = (px, pz) => px + ',' + pz;
  const index = new Map();  // "px,pz" → def({px,pz,space,npc?})
  for (const d of parcels) index.set(keyOf(d.px, d.pz), d);
  const loaded = new Map(); // "px,pz" → { group, def, ox, oz, dims, solids, crowd, avatars, lod }

  function parcelArts(def, ox, oz) {
    return (def.space.parts || []).filter((p) => p.t === 'artwork').map((p) => ({
      pos: { x: ox + p.x, y: 0, z: oz + p.z }, rotY: p.ry || 0, floorY: 0,
      title: (def.space.meta && def.space.meta.name) || '작품', featured: !!p.featured,
    }));
  }
  // solid 파츠 → 월드 XZ AABB (visit.js solids 규칙을 파셀 오프셋으로 확장)
  function computeSolids(def, ox, oz, dims) {
    return (def.space.parts || []).filter((p) => PART_TYPES[p.t] && PART_TYPES[p.t].solid).map((p) => {
      const [w, h, d] = PART_TYPES[p.t].size;
      const c = Math.abs(Math.cos(p.ry || 0)), s = Math.abs(Math.sin(p.ry || 0));
      const ex = (w / 2) * c + (d / 2) * s, ez = (w / 2) * s + (d / 2) * c;
      const cy = (p.y != null) ? p.y : partY(p.t, dims.H);
      return { x: ox + p.x, z: oz + p.z, ex, ez, bottom: cy - h / 2, top: cy + h / 2 };
    });
  }

  function loadParcel(px, pz, lod) {
    const k = keyOf(px, pz); const def = index.get(k); if (!def) return;
    const ex = loaded.get(k);
    if (ex) { if (ex.lod === lod) return; unloadParcel(k); } // LOD 변경 시 재로드
    const ox = px * CELLX, oz = pz * CELLZ;
    const shellOnly = lod === 'shell';
    const group = buildSpaceGroup(def.space, { shellOnly, onAsyncTex: () => { if (!disposed) renderOnce(); } });
    group.position.set(ox, 0, oz);
    if (!shellOnly) addRoomLighting(group);
    scene.add(group);
    const dims = spaceDims(def.space);
    const solids = shellOnly ? [] : computeSolids(def, ox, oz, dims);
    let crowd = null; const avatars = new Map();
    if (!shellOnly && def.npc) {
      const arts = parcelArts(def, ox, oz);
      if (arts.length) crowd = new NpcCrowd(arts, def.npc.count || null, { roster: def.npc.roster });
    }
    loaded.set(k, { group, def, ox, oz, dims, solids, crowd, avatars, lod, px, pz });
  }

  function unloadParcel(k) {
    const L = loaded.get(k); if (!L) return;
    if (L.crowd) { for (const a of L.avatars.values()) { scene.remove(a.inst.group); a.inst.dispose(); } }
    scene.remove(L.group); disposeSpaceGroup(L.group);
    loaded.delete(k);
  }

  // ── 플레이어 상태 — 첫 파셀 spawn ──
  const first = parcels[0] || null;
  const pos = new THREE.Vector3(0, EYE, 0);
  let yaw = 0, pitch = 0;
  if (first) { const s = first.space.spawn || { x: 0, z: 0, ry: 0 }; pos.set(first.px * CELLX + (s.x || 0), EYE, first.pz * CELLZ + (s.z || 0)); yaw = s.ry || 0; }

  function applyPose() {
    camera.position.set(pos.x, pos.y, pos.z);
    const cp = Math.cos(pitch);
    const dir = new THREE.Vector3(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
    camera.lookAt(pos.x + dir.x, pos.y + dir.y, pos.z + dir.z);
  }

  const currentParcel = () => ({ px: Math.round(pos.x / CELLX), pz: Math.round(pos.z / CELLZ) });

  // ── 스트리밍: 현재 파셀 3×3. 직교 인접(맨해튼≤1)=풀디테일, 대각=shell 임포스터. ──
  function updateStreaming() {
    const { px, pz } = currentParcel();
    const want = new Map();
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const k = keyOf(px + dx, pz + dz);
      if (!index.has(k)) continue;
      want.set(k, (Math.abs(dx) + Math.abs(dz)) <= 1 ? 'full' : 'shell');
    }
    for (const k of Array.from(loaded.keys())) if (!want.has(k)) unloadParcel(k);
    for (const [k, lod] of want) { const [qx, qz] = k.split(',').map(Number); loadParcel(qx, qz, lod); }
  }

  // ── 충돌 (1) 파셀 경계 clamp + 개구부 통과 (2) solid 파츠 AABB ──
  function blocked(x, z) {
    for (const L of loaded.values()) for (const b of L.solids) {
      if (b.top <= STEP_OVER) continue;   // 바닥타일만 통과
      if (b.bottom >= 1.7) continue;      // 머리 위 스택은 바닥 이동 무영향
      if (Math.abs(x - b.x) <= b.ex + RADIUS && Math.abs(z - b.z) <= b.ez + RADIUS) return true;
    }
    return false;
  }
  // 파셀 경계 clamp — 벽 안쪽에 가두되, shell.entries 개구부 방향 + 이웃 로드 + 문 폭 범위면 통과.
  function clampPos(x, z) {
    const px = Math.round(x / CELLX), pz = Math.round(z / CELLZ);
    const L = loaded.get(keyOf(px, pz));
    if (!L) return { x, z }; // 로드 안 된 파셀 위(경계 넘는 순간) — 다음 프레임 이웃 파셀 기준으로 재판정
    const ox = px * CELLX, oz = pz * CELLZ, dims = L.dims;
    let lx = x - ox, lz = z - oz;
    const xlim = dims.hw - dims.t - RADIUS, zlim = dims.hd - dims.t - RADIUS;
    const entries = new Set(L.def.space.shell.entries || []);
    const doorHalf = DOOR_W / 2 - RADIUS;
    const open = (dir, npx, npz, along) => entries.has(dir) && loaded.has(keyOf(npx, npz)) && Math.abs(along) < doorHalf;
    if (lx > xlim) { if (!open('east', px + 1, pz, lz)) lx = xlim; }
    else if (lx < -xlim) { if (!open('west', px - 1, pz, lz)) lx = -xlim; }
    if (lz > zlim) { if (!open('south', px, pz + 1, lx)) lz = zlim; }
    else if (lz < -zlim) { if (!open('north', px, pz - 1, lx)) lz = -zlim; }
    return { x: ox + lx, z: oz + lz };
  }

  /** yaw 기준 전/우 이동(축분리 슬라이딩 충돌 + 파셀 clamp). */
  function walk(fwdAmt, rightAmt, dt) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let dx = fwdAmt * fx + rightAmt * rx, dz = fwdAmt * fz + rightAmt * rz;
    const len = Math.hypot(dx, dz);
    if (len > 1e-6) { dx /= len; dz /= len; } else return;
    dx *= SPEED * dt; dz *= SPEED * dt;
    let c = clampPos(pos.x + dx, pos.z);
    if (!blocked(c.x, pos.z)) pos.x = c.x;
    c = clampPos(pos.x, pos.z + dz);
    if (!blocked(pos.x, c.z)) pos.z = c.z;
    updateStreaming();
    applyPose();
  }

  function lookDelta(dx, dy) {
    yaw -= dx;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch - dy));
    applyPose();
  }

  // ── NPC 렌더/보간 (사람과 완전히 동일한 avatar 경로) ──
  function stepNpcs(d) {
    for (const L of loaded.values()) {
      if (!L.crowd) continue;
      const humans = [{ x: pos.x, z: pos.z }]; // y 생략 → NpcCrowd 회피·인사 정상(단층)
      const states = L.crowd.update(d, humans);
      for (const id in states) {
        const s = states[id];
        let a = L.avatars.get(id);
        if (!a) {
          const inst = createAvatarInstance(s.char, s.color, s.nickname);
          inst.group.position.set(s.x, 0, s.z); inst.group.rotation.y = s.ry; // floorY=0 발바닥
          scene.add(inst.group); a = { inst }; L.avatars.set(id, a);
        } else {
          const dxm = s.x - a.inst.group.position.x, dzm = s.z - a.inst.group.position.z;
          const spd = Math.hypot(dxm, dzm) / Math.max(1e-3, d);
          a.inst.group.position.set(s.x, 0, s.z);
          a.inst.group.rotation.y = s.ry;
          a.inst.update(d, spd);
        }
      }
      let chat; while ((chat = L.crowd.takeChat())) emit('chat', chat);
    }
  }

  // ── 입력(키/터치) ──
  const kmov = { fwd: 0, right: 0 }, tmov = { fwd: 0, right: 0 }, keys = {};
  function recomputeKeyMove() {
    kmov.fwd = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
    kmov.right = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  }
  const listeners = {};
  const emit = (ev, d) => (listeners[ev] || []).forEach((f) => f(d));

  // ── RAF ──
  let raf = 0, last = 0, disposed = false;
  function step(now) {
    const t = now || 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    update(dt);
    raf = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame(step) : 0;
  }
  function update(dt) {
    const d = (typeof dt === 'number' && isFinite(dt)) ? dt : 0.016;
    const f = kmov.fwd + tmov.fwd, r = kmov.right + tmov.right;
    if (f || r) walk(f, r, d);
    stepNpcs(d);
    renderer.render(scene, camera);
  }
  function renderOnce() { applyPose(); renderer.render(scene, camera); }

  // ── 포인터락 + 이벤트(데스크톱) ──
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

  // 초기 로드 — 첫 파셀 주변 스트리밍
  updateStreaming();
  applyPose();
  if (!headless) {
    resize((typeof window !== 'undefined' ? window.innerWidth : 1280), (typeof window !== 'undefined' ? window.innerHeight : 720));
    raf = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame(step) : 0;
  }

  return {
    walk, update, renderOnce, resize, lookDelta,
    setTouchMove: (fwd, right) => { tmov.fwd = fwd || 0; tmov.right = right || 0; },
    setKey: (k, v) => { keys[String(k).toLowerCase()] = !!v; recomputeKeyMove(); },
    getPosition: () => pos.clone(),
    setPosition: (x, y, z) => { pos.set(x, y == null ? EYE : y, z); updateStreaming(); applyPose(); },
    getYaw: () => yaw, setYaw: (v) => { yaw = v; applyPose(); },
    getPitch: () => pitch,
    getCurrentParcel: () => currentParcel(),
    getLoadedKeys: () => Array.from(loaded.keys()),
    isLocked: () => locked,
    on: (ev, f) => { (listeners[ev] = listeners[ev] || []).push(f); },
    get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; },
    getScene: () => scene, getCamera: () => camera, getRenderer: () => renderer,
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (!headless && typeof window !== 'undefined') {
        canvas.removeEventListener('click', onCanvasClick);
        document.removeEventListener('pointerlockchange', onLockChange);
        document.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      }
      for (const k of Array.from(loaded.keys())) unloadParcel(k);
      if (scene.environment) { scene.environment.dispose(); scene.environment = null; }
      renderer.dispose();
    },
  };
}
