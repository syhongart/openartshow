// builder.js — 공간 빌더 에디터 (MVP 핵심 루프: 배치·스냅·회전·삭제·undo·저장)
// -----------------------------------------------------------------------------
// 리서치 확정 심즈 패턴: 그리드 스냅 기본(구조 1m·90° / 오브젝트 0.5m·15°) + 고스트 프리뷰
// + 표준 단축키(R 회전·Del 삭제·Ctrl+Z undo). 80캡(작품+스크린)은 UI가 강제.
// 데스크톱 편집 전용(모바일은 builder.html이 크롬을 숨겨 열람만).
// 테스트 가능성: createBuilder()가 스크립트 API를 반환 → 헤드리스로 전 경로 검증.
// -----------------------------------------------------------------------------
import * as THREE from 'three';
import { normalizeSpace, newSpace, PART_TYPES, encodeSpace, decodeSpace, SPACE_PREFIX } from './space.js';
import { buildSpaceGroup, disposeSpaceGroup, spaceDims, partY, uniqueTexCount, ART_SCREEN_CAP, UNIQUE_TEX_TYPES, buildPartPreview, addRoomLighting } from './space-render.js';
import { youtubeId } from './ytembed.js';

const SAVE_KEY = 'openartshow.space.v1';

// 환경맵(PMREM) — 은은한 반사로 재질 깊이·고급감. 스포트라이트가 바닥에 반질하게 번지게.
function makeEnvMap(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  es.add(new THREE.HemisphereLight(0xdfe4f2, 0x3a3630, 1.0));
  const hi = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: 0xffe9c8 })); hi.position.set(0, 5, -6); es.add(hi);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(4, 8), new THREE.MeshBasicMaterial({ color: 0x2a2c3a })); side.position.set(-6, 3, 0); side.rotation.y = Math.PI / 2; es.add(side);
  const tex = pm.fromScene(es, 0.02).texture; pm.dispose();
  [hi, side].forEach((m) => { m.geometry.dispose(); m.material.dispose(); }); // 임시 씬 자원 정리(검수 권고)
  return tex;
}

function snapPos(type, x, z) {
  const step = PART_TYPES[type].grid === 'structure' ? 1.0 : 0.5;
  return { x: Math.round(x / step) * step, z: Math.round(z / step) * step };
}
function snapRot(type, ry) {
  const step = PART_TYPES[type].grid === 'structure' ? Math.PI / 2 : (15 * Math.PI / 180);
  return Math.round(ry / step) * step;
}
const clampToRoom = (v, half, t) => Math.max(-half + t + 0.2, Math.min(half - t - 0.2, v));

export function createBuilder(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  renderer.setClearColor(0x15161a);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 접지 그림자(디자이너 P0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.16; // 필믹 그레이드(디자이너 아트디렉션)
  const scene = new THREE.Scene();
  // 앰비언트는 낮게(그림자 깊게·대비↑) — 연출 조명(스포트/다운라이트)이 무드를 주도. 바이올렛 언더톤.
  scene.add(new THREE.HemisphereLight(0xfff3e6, 0x241f30, 0.58));
  scene.environment = makeEnvMap(renderer); // 은은한 환경 반사(글로시 바닥·재질 깊이)
  const key = new THREE.DirectionalLight(0xfff2e0, 0.85); key.position.set(3, 6, 4);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005;
  { const c = key.shadow.camera; c.left = -9; c.right = 9; c.top = 7; c.bottom = -7; c.near = 0.5; c.far = 30; c.updateProjectionMatrix(); } // 룸 풋프린트 타이트
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);

  // 카메라 오빗 상태 (천장 숨긴 방 안이 내려다보이는 3/4 부감 시작)
  const orbit = { az: 0.5, pol: 0.82, rad: 9.5, target: new THREE.Vector3(0, 0.9, 0) };
  function applyCamera() {
    const { az, pol, rad, target } = orbit;
    camera.position.set(target.x + rad * Math.sin(pol) * Math.sin(az), target.y + rad * Math.cos(pol), target.z + rad * Math.sin(pol) * Math.cos(az));
    camera.lookAt(target);
  }

  let space; try { space = normalizeSpace(opts.space || newSpace()); } catch { space = newSpace(); } // opts.space 외부 유입 방어(상위버전 등)
  let group = null;
  const undoStack = [];
  let placingType = null;   // 팔레트에서 고른 배치 대기 타입
  let ghost = null;         // 배치 고스트 프리뷰(실제 파츠 모양)
  let ghostMat = null;      // 고스트 공용 반투명 재질(전 메쉬 공유 → 색 일괄 변경)
  let selected = -1;        // 선택된 파츠 index
  let selectMesh = null;    // 선택 하이라이트 아웃라인
  const raycaster = new THREE.Raycaster();
  const listeners = {};
  const emit = (ev, d) => (listeners[ev] || []).forEach((f) => f(d));

  function rebuild() {
    if (group) { scene.remove(group); disposeSpaceGroup(group); }
    group = buildSpaceGroup(space, { pickable: true, hideCeiling: true });
    // 바닥 글로시(거칠기↓·환경반사↑)로 스포트라이트가 반질하게 번지게 — 디자이너 아트디렉션
    const floor = group.userData.floor; // userData 참조(자식 순서 결합 제거, 검수 권고)
    if (floor && floor.material) { floor.material.roughness = 0.16; floor.material.envMapIntensity = 1.35; }
    addRoomLighting(group); // 작품 스포트라이트·천장 다운라이트·접촉그림자
    scene.add(group);
    refreshSelection();
  }
  function pushUndo() { undoStack.push(JSON.stringify(space)); if (undoStack.length > 50) undoStack.shift(); }

  // ── 배치 ──
  function beginPlace(type) { placingType = PART_TYPES[type] ? type : null; makeGhost(); emit('mode', { placing: placingType }); }
  function disposeGhost() {
    if (!ghost) return;
    scene.remove(ghost);
    ghost.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); // 지오메트리 정리
    if (ghostMat) { ghostMat.dispose(); ghostMat = null; }            // 공용 재질 1개만 정리
    ghost = null;
  }
  function cancelPlace() { placingType = null; disposeGhost(); }
  function makeGhost() {
    disposeGhost();
    if (!placingType) return;
    // 실제 파츠 모양(벽·계단 등)을 반투명으로 미리보기(감독: 미리 볼 수 있게). 박스 대체.
    ghost = buildPartPreview(placingType);
    ghostMat = new THREE.MeshBasicMaterial({ color: 0x8b7bd8, transparent: true, opacity: 0.42, depthWrite: false });
    ghost.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material; // buildPartPreview가 만든 실제 재질(텍스처 clone 포함)은 정리 후 고스트 재질로 교체
      if (m) { if (m.map && m.map.dispose) m.map.dispose(); if (m.normalMap && m.normalMap.dispose) m.normalMap.dispose(); if (m.dispose) m.dispose(); }
      o.material = ghostMat;
    });
    ghost.visible = false; scene.add(ghost);
  }
  function moveGhostTo(x, z) {
    if (!ghost || !placingType) return;
    const { hw, hd, t, H } = spaceDims(space);
    const s = snapPos(placingType, clampToRoom(x, hw, t), clampToRoom(z, hd, t));
    ghost.position.set(s.x, partY(placingType, H), s.z); ghost.visible = true;
    const bad = uniqueTexCapReached(placingType);
    ghostMat.color.setHex(bad ? 0xb0503f : 0x8b7bd8); // 불가=테라코타
  }
  function uniqueTexCapReached(type) { return UNIQUE_TEX_TYPES.has(type) && uniqueTexCount(space) >= ART_SCREEN_CAP; }

  /** 파츠 추가. 성공 시 index, 실패(캡 초과) 시 -1 */
  function addPart(type, x, z, extra = {}) {
    if (!PART_TYPES[type]) return -1;
    if (uniqueTexCapReached(type)) { emit('cap', { type, cap: ART_SCREEN_CAP }); return -1; }
    const { hw, hd, t } = spaceDims(space);
    const s = snapPos(type, clampToRoom(x, hw, t), clampToRoom(z, hd, t));
    pushUndo();
    const part = Object.assign({ t: type, x: s.x, z: s.z, ry: 0 }, extra);
    space = normalizeSpace({ ...space, parts: [...space.parts, part] });
    rebuild(); emit('change', { space });
    return space.parts.length - 1;
  }

  // ── 선택·회전·삭제 ──
  function selectIndex(i) { selected = (i >= 0 && i < space.parts.length) ? i : -1; refreshSelection(); emit('select', { index: selected, part: selected >= 0 ? space.parts[selected] : null }); }
  function refreshSelection() {
    if (selectMesh) { scene.remove(selectMesh); selectMesh.geometry.dispose(); selectMesh.material.dispose(); selectMesh = null; }
    if (selected < 0 || selected >= space.parts.length) return;
    const p = space.parts[selected]; const [w, h, d] = PART_TYPES[p.t].size; const { H } = spaceDims(space);
    selectMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06 + 0.05, h * 1.06 + 0.05, d * 1.06 + 0.05), new THREE.MeshBasicMaterial({ color: 0x6fe3ff, wireframe: true }));
    selectMesh.position.set(p.x, partY(p.t, H), p.z); selectMesh.rotation.y = p.ry; scene.add(selectMesh);
  }
  function rotateSelected(dir = 1) {
    if (selected < 0) return;
    pushUndo();
    const p = { ...space.parts[selected] };
    const stepStruct = PART_TYPES[p.t].grid === 'structure';
    p.ry = snapRot(p.t, p.ry + dir * (stepStruct ? Math.PI / 2 : 15 * Math.PI / 180) + 1e-4);
    const parts = space.parts.slice(); parts[selected] = p;
    space = normalizeSpace({ ...space, parts }); rebuild(); emit('change', { space });
  }
  function rotateSelectedFine(deltaRad) { // 미세 각도 조정(스냅 없음) — 감독: 선택 시 각도 수정
    if (selected < 0) return;
    pushUndo();
    const p = { ...space.parts[selected], ry: (space.parts[selected].ry || 0) + deltaRad };
    const parts = space.parts.slice(); parts[selected] = p;
    space = normalizeSpace({ ...space, parts }); rebuild(); emit('change', { space });
  }
  function deleteSelected() {
    if (selected < 0) return;
    pushUndo();
    const parts = space.parts.slice(); parts.splice(selected, 1);
    space = normalizeSpace({ ...space, parts }); selected = -1;
    rebuild(); emit('change', { space });
  }
  function undo() {
    if (!undoStack.length) return false;
    space = normalizeSpace(JSON.parse(undoStack.pop())); selected = -1;
    rebuild(); emit('change', { space }); return true;
  }
  // 스크린 파츠에 유튜브 영상 설정 — 검증된 11자 ID만 저장(ytembed.youtubeId). 실패 시 '' (지움).
  function setScreenVideo(index, url) {
    if (index < 0 || !space.parts[index] || space.parts[index].t !== 'screen') return false;
    const id = youtubeId(url);
    pushUndo();
    const parts = space.parts.slice(); parts[index] = { ...parts[index], src: id || '' };
    space = normalizeSpace({ ...space, parts }); rebuild(); emit('change', { space });
    return !!id;
  }
  function getScreenVideo(index) { const p = space.parts[index]; return (p && p.t === 'screen') ? (p.src || '') : ''; }

  // ── 저장/불러오기/내보내기 ──
  // 외부 유입 문서(로드/가져오기)는 스키마 경계에서 80캡을 강제 — addPart UI 밖 우회 방지.
  // scene.js 방문자뷰 통합·파일가져오기 UI 연결 시에도 이 경계가 draw call 예산을 보증한다.
  function clampCap(sp) {
    if (uniqueTexCount(sp) <= ART_SCREEN_CAP) return sp;
    let n = 0; const parts = [];
    for (const p of sp.parts) { if (UNIQUE_TEX_TYPES.has(p.t)) { if (n >= ART_SCREEN_CAP) continue; n++; } parts.push(p); }
    const trimmed = normalizeSpace({ ...sp, parts });
    emit('cap', { type: null, cap: ART_SCREEN_CAP, trimmed: true });
    return trimmed;
  }
  function save() { try { localStorage.setItem(SAVE_KEY, encodeSpace(space)); emit('saved', {}); return true; } catch { return false; } }
  function load() { const dec = decodeSpace(localStorage.getItem(SAVE_KEY)); if (!dec) return false; space = clampCap(dec); undoStack.length = 0; selected = -1; rebuild(); emit('change', { space }); return true; }
  function exportJSON() { return JSON.stringify(space, null, 0); }
  function importJSON(str) {
    const s = (typeof str === 'string' && str.startsWith(SPACE_PREFIX)) ? str : SPACE_PREFIX + String(str);
    const dec = decodeSpace(s); if (!dec) return false; // 파손·상위버전(SPACE_VERSION_AHEAD) → false
    space = clampCap(dec); undoStack.length = 0; selected = -1; rebuild(); emit('change', { space }); return true;
  }

  // ── 픽킹(포인터 → 파츠/바닥) ──
  function ndc(px, py, rect) { return new THREE.Vector2(((px - rect.left) / rect.width) * 2 - 1, -((py - rect.top) / rect.height) * 2 + 1); }
  function pickPart(v2) {
    raycaster.setFromCamera(v2, camera);
    const objs = (group.userData.partRefs || []).map((r) => r.object);
    const hit = raycaster.intersectObjects(objs, false)[0];
    return hit ? hit.object.userData.partIndex : -1;
  }
  function pickFloor(v2) {
    raycaster.setFromCamera(v2, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pt = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, pt) ? { x: pt.x, z: pt.z } : null;
  }

  // ── 이벤트 바인딩(데스크톱) ──
  let dragging = false, lastX = 0, lastY = 0, moved = false;
  // ── 카메라 이동(팬) — 중심 회전만이 아니라 방 안을 돌아다니며 빌드(감독 요청·심즈식) ──
  function clampTarget() {
    const dims = group && group.userData.dims; const hw = dims ? dims.hw + 4 : 12, hd = dims ? dims.hd + 4 : 12;
    orbit.target.x = Math.max(-hw, Math.min(hw, orbit.target.x));
    orbit.target.z = Math.max(-hd, Math.min(hd, orbit.target.z));
  }
  function panBy(fwd, right) { // 화면 기준 전/후·좌/우(카메라 방위각 반영)
    const fx = -Math.sin(orbit.az), fz = -Math.cos(orbit.az), rx = Math.cos(orbit.az), rz = -Math.sin(orbit.az);
    orbit.target.x += fwd * fx + right * rx; orbit.target.z += fwd * fz + right * rz; clampTarget();
  }
  let panning = false;
  function onDown(e) { dragging = true; moved = false; panning = e.shiftKey || e.button === 1 || e.button === 2; lastX = e.clientX; lastY = e.clientY; }
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (panning) { const s = orbit.rad * 0.0016; panBy(dy * s, -dx * s); }
      else { orbit.az -= dx * 0.008; orbit.pol = Math.max(0.25, Math.min(1.45, orbit.pol - dy * 0.006)); }
      lastX = e.clientX; lastY = e.clientY; applyCamera();
    } else if (placingType) {
      const f = pickFloor(ndc(e.clientX, e.clientY, rect)); if (f) moveGhostTo(f.x, f.z);
    }
  }
  function onUp(e) {
    dragging = false;
    if (moved) return;
    const rect = canvas.getBoundingClientRect(); const v = ndc(e.clientX, e.clientY, rect);
    if (placingType) { const f = pickFloor(v); if (f) addPart(placingType, f.x, f.z); }
    else selectIndex(pickPart(v));
  }
  function onWheel(e) { orbit.rad = Math.max(3, Math.min(20, orbit.rad + Math.sign(e.deltaY) * 0.6)); applyCamera(); e.preventDefault(); }
  function onKey(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // 입력창 타이핑 중엔 단축키 무시(WASD·Del 등)
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') cancelPlace();
    else if (k === 'r') rotateSelected(e.shiftKey ? -1 : 1);           // 회전 그리드 스텝(양방향)
    else if (k === 'q') rotateSelectedFine(-5 * Math.PI / 180);        // 미세 회전 ±5°
    else if (k === 'e') rotateSelectedFine(5 * Math.PI / 180);
    else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    else if ((e.ctrlKey || e.metaKey) && k === 'z') { undo(); e.preventDefault(); }
    else if (k === 'w' || e.key === 'ArrowUp') { panBy(0.5, 0); applyCamera(); e.preventDefault(); }
    else if (k === 's' || e.key === 'ArrowDown') { panBy(-0.5, 0); applyCamera(); e.preventDefault(); }
    else if (k === 'a' || e.key === 'ArrowLeft') { panBy(0, -0.5); applyCamera(); e.preventDefault(); }
    else if (k === 'd' || e.key === 'ArrowRight') { panBy(0, 0.5); applyCamera(); e.preventDefault(); }
  }
  if (!opts.headless && typeof window !== 'undefined') {
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // 우클릭 팬 시 컨텍스트메뉴 억제
    window.addEventListener('keydown', onKey);
  }

  function resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  let raf = 0;
  function renderOnce() { applyCamera(); renderer.render(scene, camera); }
  function loop() { renderOnce(); raf = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame(loop) : 0; }

  rebuild(); applyCamera();
  if (!opts.headless) loop();

  return {
    // 스크립트 API (헤드리스 검증·UI 배선 공용)
    beginPlace, cancelPlace, addPart, selectIndex, rotateSelected, rotateSelectedFine, deleteSelected, undo,
    setScreenVideo, getScreenVideo,
    save, load, exportJSON, importJSON, resize, renderOnce,
    getSpace: () => space, getSelected: () => selected,
    getStats: () => { renderOnce(); return { parts: space.parts.length, uniqueTex: uniqueTexCount(space), calls: renderer.info.render.calls }; },
    on: (ev, f) => { (listeners[ev] = listeners[ev] || []).push(f); },
    get renderer() { return renderer; }, get camera() { return camera; }, get orbit() { return orbit; },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      cancelPlace(); // ghost 정리
      if (selectMesh) { scene.remove(selectMesh); selectMesh.geometry.dispose(); selectMesh.material.dispose(); selectMesh = null; }
      if (group) disposeSpaceGroup(group);
      if (scene.environment) { scene.environment.dispose(); scene.environment = null; } // PMREM envMap 해제(검수 권고)
      renderer.dispose();
    },
  };
}
