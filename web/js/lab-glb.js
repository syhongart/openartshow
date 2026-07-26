// lab-glb.js — [실험] GLB 공간 1인칭 워크스루 미리보기 (behind-flag, 라이브 무접촉).
//
// 목적: 감독이 반입 판정 전에 GLB 공간(web/assets/models/lab-space.glb)을 직접 걸어다니며
// "어떤 느낌인지" 확인한다. 완성된 미술관 통합이 아니라 순수 미리보기 — 과한 물리·정밀 계단
// 승강 없이, 조명·1인칭 이동·간이 충돌·층 전환 버튼만으로 공간감을 정직하게 보여주는 게 목표다.
//
// 확정 사실(부팀장 레이캐스트 실사 결과, GLB 자체에 라이트 0개):
//   1F 바닥 y≈0.3 → 천장 y≈3.0 · 2F 바닥 y≈3.7 → 지붕 y≈6.4 · 월드 바운딩 X[-7.8,9.4] Z[-17.1,7.5]
//   실내는 유리 커튼월(Window020~039, m.GlassReal) 위주 — 계단 지오메트리 없음(노드 덤프로 확인) →
//   층 이동은 순간이동 버튼으로 대체(요건 4).
//
// world-boot.js(오픈월드)의 터치 조작 규약을 그대로 따른다 — 특히 pruneStale(스테일 터치 방어):
// 메인스레드가 길게 블록되면 touchend가 유실돼 조이스틱이 풀리지 않는 문제를 매 터치 이벤트마다
// e.touches(지금 실제로 닿아 있는 것)로 청소해 방지한다.

import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { probeGpu } from './main-gpu.js';

// ── 공간 상수(부팀장 실사 결과 기준) ──────────────────────────────────────
const EYE_HEIGHT = 1.6;
const WALK_SPEED = 2.6;   // m/s
const RUN_SPEED = 4.6;    // m/s (Shift / 조이스틱 끝까지 밀기)
const ACCEL = 10.0;       // 가감속 감쇠 계수(1/s) — player.js와 동일한 지수 감쇠로 "게임급" 손맛
const MOUSE_SENS = 0.0022;
const TOUCH_LOOK_SENS = 0.0058;
const PITCH_LIMIT = THREE.MathUtils.degToRad(89);
const JOYSTICK_RADIUS = 60;
const PLAYER_RADIUS = 0.32; // 레이캐스트 충돌 여유(벽면에 카메라가 파고들지 않도록)

// 층 정의 — 계단 지오메트리가 없어(GLB 노드 덤프 확인) 물리 승강 대신 순간이동 버튼(요건 4).
const FLOORS = [
  { id: 1, label: '1F', y: 0.3, spawn: { x: 0, z: -6 } },   // 1F 실내 중앙 근처
  { id: 2, label: '2F', y: 3.7, spawn: { x: 1, z: -9 } },   // 2F 실내 중앙 근처(X[-3.77~6.23] Z[-15.14~-3.14])
];

// 월드 바운딩(부팀장 실사) 안쪽으로 살짝 여유를 둔 이동 안전망 — 레이캐스트가 놓친 개구부로
// 모델 밖 허공까지 나가는 것만 막는 최후 방어선(주 충돌은 아래 레이캐스트가 담당).
const BOUND = { minX: -7.6, maxX: 9.2, minZ: -16.9, maxZ: 7.2 };

// 모델 경로 — base(BASE_URL)에서 계산(world-boot.js 매니페스트 fetch와 동일 패턴).
// selfContained 플러그인이 web/assets → dist/app/assets 로 복사하므로, 이 HTML 자체가
// dist 루트/ app/ 어디에 배치되든(HTML_RENAME 매핑 유무 무관) 경로가 항상 유효하다.
const BASE = import.meta.env.BASE_URL || '/';
const MODEL_URL = (BASE.endsWith('/') ? BASE.slice(0, -1) : BASE) + '/app/assets/models/lab-space.glb';

// ── DOM 참조 ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const loadingOv = document.getElementById('loading');
const loadFill = document.getElementById('loadFill');
const loadPct = document.getElementById('loadPct');
const enterOv = document.getElementById('enter');
const enterHint = document.getElementById('enterHint');
const enterBtn = document.getElementById('enterBtn');
const hudEl = document.getElementById('hud');
const floorPanel = document.getElementById('floorPanel');

const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
document.body.classList.toggle('is-touch', isTouch);
enterHint.textContent = isTouch
  ? '왼쪽 조이스틱으로 이동 · 오른쪽 드래그로 시선'
  : '클릭 후 WASD로 이동 · 마우스로 시선 · ESC로 커서 해제';

// ── 렌더러 · 씬 · 카메라 ──────────────────────────────────────────────────
const gpuInfo = probeGpu(); // 소프트웨어 렌더러(swiftshader 등) 감지 — AA·톤매핑·그림자를 그에 맞춰 낮춘다
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !gpuInfo.soft, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, gpuInfo.soft ? 1 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = gpuInfo.soft ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;
renderer.shadowMap.enabled = !gpuInfo.soft;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // 정적 씬 — 최초 1회만 베이크(main.js/world.js와 동일 절약 관례)

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfd6ea); // 담청 하늘색 — 커튼월 밖이 허공(검정)으로 뜨지 않게

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
camera.rotation.order = 'YXZ';

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize); resize();

// ── 조명 설계 ────────────────────────────────────────────────────────────
// GLB에 라이트 0개(부팀장 실사). m.GlassReal은 glTF 원문에 pbrMetallicRoughness/투과 확장이
// 전혀 없어(빈 머티리얼 = 기본값 baseColor 흰색·metallic 1·roughness 1) — 유리·DarkMetal·
// m.DarkShine 등 금속류가 environment(IBL) 없이는 반사할 게 없어 "완전 검정"으로 렌더된다
// (1차 헤드리스 스크린샷으로 실증 — 반사할 환경맵이 없는 금속 PBR의 전형적 증상). 재질 교체는
// 범위 밖이므로 그대로 두고, 조명 레이어에서 3단으로 대응했다:
//   (1) PMREM 환경맵(makeEnvMap) — builder.js/visit.js/world.js와 동일하게 외부 HDR 없이
//       절차적 미니 씬(하늘색 + 창 하이라이트 평면)을 1회 프리필터링해 scene.environment로
//       얹는다. 금속·유리 표면이 이걸 반사해 "완전 검정" 문제가 해소되고, 비금속 표면도
//       IBL 확산광을 받아 한결 밝아진다(가장 효과가 큰 단일 조치).
//   (2) Hemisphere + Ambient = 주 조명. 앰비언트 근사라 오클루전에 영향받지 않고 모든 면에
//       균일히 깔려 "유리가 불투명해도 실내가 안 보이는" 문제를 근본적으로 우회한다.
//   (3) Directional = 옥외 입체감(그림자·하이라이트) 전용. 실내까지 투과를 기대하지 않는다.
//   (4) 천장 픽스처 지오메트리(lights.002/lights.003 노드)가 GLB 안에 실제로 존재한다 —
//       모델러가 조명 위치를 의도한 흔적이다. 그 자리에 실제 PointLight를 얹어(좌표는 노드
//       transform 그대로) 저비용으로 실내 국소 광원감을 보탰다(섀도 없음 — 가벼움).
function makeEnvMap() {
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  es.add(new THREE.HemisphereLight(0xdce8ff, 0x8a8272, 1.0));
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 0xe6f3ff }));
  sky.position.set(0, 6, -8); es.add(sky);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(6, 10), new THREE.MeshBasicMaterial({ color: 0xfff8e8 }));
  win.position.set(-8, 2, 0); win.rotation.y = Math.PI / 2; es.add(win);
  const win2 = new THREE.Mesh(new THREE.PlaneGeometry(6, 10), new THREE.MeshBasicMaterial({ color: 0xfff4dd }));
  win2.position.set(8, 2, 0); win2.rotation.y = -Math.PI / 2; es.add(win2);
  const tex = pm.fromScene(es, 0.03).texture;
  pm.dispose();
  [sky, win, win2].forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
  return tex;
}
scene.environment = makeEnvMap();

// [헤드리스 실측 근거] 픽셀 리드백으로 확인한 결과, GLB의 벽 재질(plaster·Sand-Finish 등)이
// alphaMode=BLEND + clearcoat/specular/sheen 확장을 쓰고 있어(원본 그대로, 손대지 않음)
// 기본 세기의 조명으로는 상당 부분이 실측 RGB 10 미만(거의 암전)으로 나왔다 — 재질 문제라
// 조명만으로 완전히 상쇄되진 않지만, 전반 밝기를 크게 올려 "안 보이는" 구간을 최대한 줄였다.
const hemi = new THREE.HemisphereLight(0xdce8ff, 0x9a9078, 3.4);
scene.add(hemi);
scene.add(new THREE.AmbientLight(0xffffff, 0.9)); // 방향 무관 최저 밝기 바닥(전면 암전 방지)

const sun = new THREE.DirectionalLight(0xfff2dc, 2.2);
sun.position.set(14, 22, 10);
sun.target.position.set(0.8, 1.5, -5);
scene.add(sun); scene.add(sun.target);
if (!gpuInfo.soft) {
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  const sc = sun.shadow.camera;
  sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 60;
  sc.updateProjectionMatrix();
}

// 천장 픽스처 노드 실측 위치(GLB "lights.002"/"lights.003" 노드 translation, 부모 루트가
// 항등변환이라 로컬=월드) — 모델러가 의도한 조명 자리에 저비용 PointLight로 실내 국소감 보강.
const fixtureLights = [
  { pos: [-0.290, 2.993, 0.455] },
  { pos: [-5.121, 2.993, -13.679] },
];
for (const f of fixtureLights) {
  const pl = new THREE.PointLight(0xffdcb0, 10, 10, 2);
  pl.position.set(f.pos[0], f.pos[1], f.pos[2]);
  scene.add(pl);
}

// ── HUD/로딩 유틸 ────────────────────────────────────────────────────────
function setLoadPct(pct, extra) {
  loadFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  loadPct.textContent = (extra || (pct.toFixed(0) + '%'));
}

let currentFloor = FLOORS[0];

// ── 모델 로드 ────────────────────────────────────────────────────────────
const collidables = []; // 레이캐스트 충돌 대상 메시(전체 씬 메시 — 벽·기둥·유리창 모두 포함)
let triCount = 0;

const loader = new GLTFLoader();
loader.load(
  MODEL_URL,
  (gltf) => {
    const root = gltf.scene;
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        collidables.push(o);
        const geo = o.geometry;
        if (geo && geo.index) triCount += geo.index.count / 3;
        else if (geo && geo.attributes && geo.attributes.position) triCount += geo.attributes.position.count / 3;
      }
    });
    scene.add(root);
    if (!gpuInfo.soft) renderer.shadowMap.needsUpdate = true; // 정적 1회 베이크

    // 스폰 — 1F 실내 중앙 근처(요건 3). 벽 속/실외 시작 방지는 spawn 좌표 자체가 실내 중앙이라
    // 충돌 레이캐스트와 무관하게 안전하다.
    teleportToFloor(FLOORS[0], 0);

    loadingOv.classList.add('hide');
    enterOv.classList.remove('hide');
  },
  (xhr) => {
    if (xhr.lengthComputable && xhr.total > 0) {
      setLoadPct((xhr.loaded / xhr.total) * 100);
    } else {
      // 총 용량을 서버가 안 주는 경우 — 퍼센트를 지어내지 않고 받은 용량만 정직하게 표시.
      setLoadPct(0, (xhr.loaded / 1048576).toFixed(1) + ' MB 로드 중…');
      loadFill.classList.add('indeterminate');
    }
  },
  (err) => {
    console.error('[lab-glb] GLB 로드 실패:', err);
    loadingOv.querySelector('.loadtitle').textContent = '공간을 불러오지 못했습니다';
    loadPct.textContent = String(err && err.message || err);
  },
);

// ── 이동/충돌 상태 ───────────────────────────────────────────────────────
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const velocity = new THREE.Vector2(0, 0); // world x, z 속도
const keys = { forward: false, backward: false, left: false, right: false, run: false };
let moveTouch = null; // { id, startX, startY }
let lookTouch = null; // { id, lastX, lastY }
let controlsEnabled = false;

const raycaster = new THREE.Raycaster();
const _dir3 = new THREE.Vector3();
const _origin3 = new THREE.Vector3();

// 진행 방향으로 짧은 레이를 쏴서 막히면 그 축 이동을 취소한다(요건 5 — 간이 충돌).
function rayBlocked(ox, oy, oz, dx, dz, dist) {
  if (dist < 1e-6) return false;
  _origin3.set(ox, oy, oz);
  _dir3.set(dx, 0, dz).normalize();
  raycaster.set(_origin3, _dir3);
  raycaster.far = dist + PLAYER_RADIUS;
  raycaster.near = 0;
  const hits = raycaster.intersectObjects(collidables, false);
  return hits.length > 0 && hits[0].distance < dist + PLAYER_RADIUS;
}

// 대각 이동이 막히면 축별로 독립 시도 → 벽을 따라 슬라이딩(player.js와 동일 철학).
function tryMove(px, pz, dx, dz, floorY) {
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-6) return { x: px, z: pz };
  const oy = floorY + EYE_HEIGHT;
  if (!rayBlocked(px, oy, pz, dx, dz, dist)) return { x: px + dx, z: pz + dz };
  return null;
}

function clampBounds(x, z) {
  return {
    x: THREE.MathUtils.clamp(x, BOUND.minX, BOUND.maxX),
    z: THREE.MathUtils.clamp(z, BOUND.minZ, BOUND.maxZ),
  };
}

function teleportToFloor(floor, ry) {
  currentFloor = floor;
  camera.position.set(floor.spawn.x, floor.y + EYE_HEIGHT, floor.spawn.z);
  euler.set(0, ry === undefined ? euler.y : ry, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
  velocity.set(0, 0);
  floorPanel.querySelectorAll('button[data-floor]').forEach((b) => {
    b.classList.toggle('on', Number(b.dataset.floor) === floor.id);
  });
}

floorPanel.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-floor]');
  if (!b) return;
  const floor = FLOORS.find((f) => f.id === Number(b.dataset.floor));
  if (floor) teleportToFloor(floor, undefined);
});

function updateMovement(dt) {
  if (!controlsEnabled) return;
  let inputX = 0, inputZ = 0;
  if (keys.forward) inputZ -= 1;
  if (keys.backward) inputZ += 1;
  if (keys.left) inputX -= 1;
  if (keys.right) inputX += 1;
  let speed = keys.run ? RUN_SPEED : WALK_SPEED;

  if (moveTouch && inputX === 0 && inputZ === 0) {
    inputX = moveTouch.ux; inputZ = moveTouch.uz;
    const mag = Math.hypot(inputX, inputZ);
    if (mag < 0.14) { inputX = 0; inputZ = 0; } // 데드존(갤러리 동일 0.14)
    speed = WALK_SPEED + (RUN_SPEED - WALK_SPEED) * Math.min(1, Math.max(0, (mag - 0.85) / 0.15));
  } else {
    const len = Math.hypot(inputX, inputZ);
    if (len > 1) { inputX /= len; inputZ /= len; }
  }

  euler.setFromQuaternion(camera.quaternion, 'YXZ');
  const yaw = euler.y;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const targetVX = (inputX * cos + inputZ * sin) * speed;
  const targetVZ = (-inputX * sin + inputZ * cos) * speed;

  const damp = 1 - Math.exp(-ACCEL * dt);
  velocity.x += (targetVX - velocity.x) * damp;
  velocity.y += (targetVZ - velocity.y) * damp;

  const pos = camera.position;
  const dx = velocity.x * dt, dz = velocity.y * dt;
  let moved = tryMove(pos.x, pos.z, dx, dz, currentFloor.y);
  if (!moved) {
    const onlyX = tryMove(pos.x, pos.z, dx, 0, currentFloor.y);
    const onlyZ = tryMove(pos.x, pos.z, 0, dz, currentFloor.y);
    moved = onlyX || onlyZ;
  }
  if (moved) {
    const c = clampBounds(moved.x, moved.z);
    pos.x = c.x; pos.z = c.z;
  }
  pos.y = currentFloor.y + EYE_HEIGHT; // 층은 버튼 순간이동 전용 — 수평 이동 중 y 고정
}

// ── 데스크톱: 포인터락 + 마우스룩 + WASD ─────────────────────────────────
function requestLock() {
  if (!isTouch && canvas.requestPointerLock) canvas.requestPointerLock();
}
enterBtn.addEventListener('click', () => {
  enterOv.classList.add('hide');
  controlsEnabled = true;
  requestLock();
});
document.addEventListener('pointerlockchange', () => {
  if (!isTouch) {
    const locked = document.pointerLockElement === canvas;
    if (!locked && controlsEnabled) enterOv.classList.remove('hide'); // 커서 해제 시 재진입 안내
    else if (locked) enterOv.classList.add('hide');
  }
});
canvas.addEventListener('click', () => { if (controlsEnabled && !isTouch) requestLock(); });

document.addEventListener('mousemove', (e) => {
  if (!controlsEnabled || isTouch) return;
  if (document.pointerLockElement !== canvas) return;
  euler.setFromQuaternion(camera.quaternion, 'YXZ');
  euler.y -= e.movementX * MOUSE_SENS;
  euler.x -= e.movementY * MOUSE_SENS;
  euler.x = THREE.MathUtils.clamp(euler.x, -PITCH_LIMIT, PITCH_LIMIT);
  euler.z = 0;
  camera.quaternion.setFromEuler(euler);
});

function setKey(code, pressed) {
  switch (code) {
    case 'KeyW': case 'ArrowUp': keys.forward = pressed; break;
    case 'KeyS': case 'ArrowDown': keys.backward = pressed; break;
    case 'KeyA': case 'ArrowLeft': keys.left = pressed; break;
    case 'KeyD': case 'ArrowRight': keys.right = pressed; break;
    case 'ShiftLeft': case 'ShiftRight': keys.run = pressed; break;
  }
}
document.addEventListener('keydown', (e) => { if (controlsEnabled) setKey(e.code, true); });
document.addEventListener('keyup', (e) => setKey(e.code, false));

// ── 모바일: 좌 조이스틱(이동) + 우 드래그(시선) — world-boot.js와 동일 규약 ──
// (stale 터치 방어 pruneStale 포함 — 메인스레드 프리즈로 touchend가 유실돼도 조이스틱이
// 눌린 채로 영구히 남지 않게 매 터치 이벤트마다 e.touches 기준으로 청소한다.)
if (isTouch) {
  if (!document.getElementById('lgb-joy-style')) {
    const st = document.createElement('style');
    st.id = 'lgb-joy-style';
    st.textContent = `
.lgb-joy-base { position: fixed; width: 112px; height: 112px; margin: -56px 0 0 -56px;
  border-radius: 50%; border: 1.5px solid rgba(253,251,245,0.38);
  background: radial-gradient(circle, rgba(23,20,15,0.10) 55%, rgba(23,20,15,0.34) 100%);
  box-shadow: 0 2px 12px rgba(10,8,4,0.30), inset 0 0 0 1px rgba(23,20,15,0.20);
  pointer-events: none; z-index: 40; opacity: 0; transform: scale(0.78);
  transition: opacity 0.12s ease, transform 0.16s cubic-bezier(0.34,1.56,0.64,1); }
.lgb-joy-base.lgb-live { opacity: 1; transform: scale(1); }
.lgb-joy-base::after { content: ''; position: absolute; inset: 5px; border-radius: 50%;
  border: 1px dashed rgba(253,251,245,0.22);
  transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.lgb-joy-base.lgb-run::after { border-color: rgba(114,230,225,0.9); border-style: solid;
  box-shadow: 0 0 10px rgba(114,230,225,0.5), inset 0 0 8px rgba(114,230,225,0.25); }
.lgb-joy-knob { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px;
  border-radius: 50%; background: radial-gradient(circle at 32% 28%, #fffdf8, #e8e2d2);
  border: 1px solid rgba(23,20,15,0.28);
  box-shadow: 0 3px 8px rgba(10,8,4,0.40), inset 0 -2px 4px rgba(23,20,15,0.14);
  pointer-events: none; z-index: 41; opacity: 0; transition: opacity 0.12s ease; }
.lgb-joy-knob.lgb-live { opacity: 1; }
.lgb-joy-knob.lgb-run { background: radial-gradient(circle at 32% 28%, #bdeeec, #72E6E1);
  border-color: rgba(20,80,78,0.55);
  box-shadow: 0 0 0 1px rgba(114,230,225,0.9), 0 0 14px rgba(114,230,225,0.55),
    inset 0 -2px 4px rgba(20,80,78,0.30); }`;
    document.head.appendChild(st);
  }
  const joyBase = document.createElement('div'); joyBase.className = 'lgb-joy-base';
  const joyKnob = document.createElement('div'); joyKnob.className = 'lgb-joy-knob';
  document.body.appendChild(joyBase); document.body.appendChild(joyKnob);
  let wasRunning = false;

  function releaseMove() {
    moveTouch = null; wasRunning = false;
    joyBase.classList.remove('lgb-live', 'lgb-run');
    joyKnob.classList.remove('lgb-live', 'lgb-run');
  }
  // [stale 터치 방어] 메인스레드가 길게 블록되면(로딩 스파이크 등) 그 사이 손을 뗀 touchend가
  // 유실돼 moveTouch/lookTouch가 영구히 남을 수 있다 — 매 터치 이벤트마다 지금 실제로 화면에
  // 닿아 있는 id 집합(e.touches)과 대조해 죽은 참조를 청소한다(world-boot.js와 동일 규약).
  function pruneStale(e) {
    const live = new Set();
    for (const t of e.touches) live.add(t.identifier);
    if (moveTouch && !live.has(moveTouch.id)) releaseMove();
    if (lookTouch && !live.has(lookTouch.id)) lookTouch = null;
  }
  const releaseAll = () => { if (moveTouch) releaseMove(); lookTouch = null; };
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });

  function onTouchStart(e) {
    if (!controlsEnabled) return;
    pruneStale(e);
    for (const t of e.changedTouches) {
      const half = window.innerWidth * 0.5;
      if (t.clientX < half && moveTouch === null) {
        moveTouch = { id: t.identifier, startX: t.clientX, startY: t.clientY, ux: 0, uz: 0 };
        joyBase.style.left = t.clientX + 'px'; joyBase.style.top = t.clientY + 'px';
        joyKnob.style.left = t.clientX + 'px'; joyKnob.style.top = t.clientY + 'px';
        joyBase.classList.add('lgb-live'); joyKnob.classList.add('lgb-live');
      } else if (t.clientX >= half && lookTouch === null) {
        lookTouch = { id: t.identifier, lastX: t.clientX, lastY: t.clientY };
      }
    }
    if (e.cancelable) e.preventDefault();
  }

  function onTouchMove(e) {
    if (!controlsEnabled) return;
    pruneStale(e);
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) {
        const dx = t.clientX - moveTouch.startX, dy = t.clientY - moveTouch.startY;
        const len = Math.hypot(dx, dy);
        const scale = len > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / len : 1;
        moveTouch.ux = (dx * scale) / JOYSTICK_RADIUS;
        moveTouch.uz = (dy * scale) / JOYSTICK_RADIUS;
        joyKnob.style.left = moveTouch.startX + dx * scale + 'px';
        joyKnob.style.top = moveTouch.startY + dy * scale + 'px';
        const mag = Math.hypot(moveTouch.ux, moveTouch.uz);
        const running = mag > 0.85;
        joyBase.classList.toggle('lgb-run', running);
        joyKnob.classList.toggle('lgb-run', running);
        if (running && !wasRunning && navigator.vibrate) navigator.vibrate(10);
        wasRunning = running;
      } else if (lookTouch && t.identifier === lookTouch.id) {
        euler.setFromQuaternion(camera.quaternion, 'YXZ');
        euler.y -= (t.clientX - lookTouch.lastX) * TOUCH_LOOK_SENS;
        euler.x -= (t.clientY - lookTouch.lastY) * TOUCH_LOOK_SENS;
        euler.x = THREE.MathUtils.clamp(euler.x, -PITCH_LIMIT, PITCH_LIMIT);
        euler.z = 0;
        camera.quaternion.setFromEuler(euler);
        lookTouch.lastX = t.clientX; lookTouch.lastY = t.clientY;
      }
    }
    if (e.cancelable) e.preventDefault();
  }

  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) releaseMove();
      else if (lookTouch && t.identifier === lookTouch.id) lookTouch = null;
    }
    pruneStale(e);
  }

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchcancel', onTouchEnd);
}

// ── HUD(요건 7): fps · 삼각형 · 드로우콜 · 현재 층 한 줄 ─────────────────
let frames = 0, acc = 0, fps = 0;
function drawHud() {
  const info = renderer.info.render;
  const triK = (info.triangles / 1000).toFixed(1);
  hudEl.textContent = `${fps.toFixed(0)} FPS · ${triK}k tri · ${info.calls} draw · ${currentFloor.label}`;
}

// ── 메인 루프 ────────────────────────────────────────────────────────────
let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  updateMovement(dt);
  renderer.render(scene, camera);

  frames++; acc += dt * 1000;
  if (acc >= 500) {
    fps = (frames * 1000) / acc;
    frames = 0; acc = 0;
    drawHud();
  }
}
requestAnimationFrame(animate);

// QA 전용 인트로스펙션 훅 — behind-flag 실험 페이지라 노출 위험 0(민감정보 없음, 카메라 좌표뿐).
// 헤드리스 검증(스폰 위치·이동 여부)에 쓰고, 감독 확인용 기능에는 관여하지 않는다.
window.__labGlb = {
  getState: () => ({
    x: camera.position.x, y: camera.position.y, z: camera.position.z,
    floor: currentFloor.id, collidables: collidables.length, tri: Math.round(triCount),
  }),
  enable: () => { controlsEnabled = true; enterOv.classList.add('hide'); },
  setKeys: (k) => Object.assign(keys, k),
};
