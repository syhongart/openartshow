// builder.js — 공간 빌더 에디터 (MVP 핵심 루프: 배치·스냅·회전·삭제·undo·저장)
// -----------------------------------------------------------------------------
// 리서치 확정 심즈 패턴: 그리드 스냅 기본(구조 1m·90° / 오브젝트 0.5m·15°) + 고스트 프리뷰
// + 표준 단축키(R 회전·Del 삭제·Ctrl+Z undo). 80캡(작품+스크린)은 UI가 강제.
// 데스크톱 편집 전용(모바일은 builder.html이 크롬을 숨겨 열람만).
// 테스트 가능성: createBuilder()가 스크립트 API를 반환 → 헤드리스로 전 경로 검증.
// -----------------------------------------------------------------------------
import * as THREE from 'three';
import { normalizeSpace, newSpace, PART_TYPES, FINISH, FOOTPRINT, encodeSpace, decodeSpace, SPACE_PREFIX } from './space.js';
import { buildSpaceGroup, disposeSpaceGroup, spaceDims, partY, uniqueTexCount, ART_SCREEN_CAP, UNIQUE_TEX_TYPES, buildPartPreview, addRoomLighting, bakeShellLightmaps } from './space-render.js';
import { youtubeId } from './ytembed.js';
import { SPACE_PRESETS, getPreset, presetThumb } from './space-presets.js';
import { createBuilderWalk } from './builder-walk.js';

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
  let gridSnap = true;      // 그리드 스냅 on/off(HUD 기즈모 토글)
  let viewMode = 'edit';    // 'edit' | 'view'(관람 미리보기)
  let lightColor = null;    // 유저 지정 조명 색(THREE.Color) — 키라이트+스포트에 적용
  let baked = false;        // GPU 셸 라이트맵 베이크 상태(굽기 완료 = 방문자 화면)
  const applySnap = (type, x, z) => gridSnap ? snapPos(type, x, z) : { x, z }; // 스냅 off면 자유 배치
  let selected = -1;        // 선택된 파츠 index
  let selectMesh = null;    // 선택 하이라이트 아웃라인
  let moveMode = false;     // 이동 모드(모바일 경량 신규) — on이면 단일 드래그가 오빗 대신 선택 파츠를 이동
  let moveDragActive = false;
  let moveTargetXZ = null;  // 드래그 중 스냅된 목표 xz(포인터업에서 1회 커밋)
  // ── 걸어서 빌드 모드(신규 가산 — 팀장 설계) ──
  // orbit과 병존: walkOn일 때만 렌더 루프가 walkInstance.update()로 카메라를 대신 구동한다.
  // orbit 상태 객체(orbit.az/pol/rad/target)는 이 블록 어디에서도 쓰지 않는다.
  let walkOn = false;
  let walkInstance = null;
  const clock = new THREE.Clock(); // walkOn 델타타임 전용(orbit 경로는 델타 불필요·무영향)
  const raycaster = new THREE.Raycaster();
  const listeners = {};
  const emit = (ev, d) => (listeners[ev] || []).forEach((f) => f(d));

  function rebuild() {
    if (group) { scene.remove(group); disposeSpaceGroup(group); }
    baked = false; // 재빌드(편집)하면 실시간으로 복귀
    group = buildSpaceGroup(space, { pickable: true, hideCeiling: true, onAsyncTex: () => renderOnce() }); // 작품 이미지 비동기 로드 시 온디맨드 리렌더
    // 바닥 글로시(거칠기↓·환경반사↑)로 스포트라이트가 반질하게 번지게 — 디자이너 아트디렉션.
    // grass=매트 유지(글로시 강제 제외), water=자체 레시피(roughness 0.1)라 덮어쓰기 제외.
    const floor = group.userData.floor; // userData 참조(자식 순서 결합 제거, 검수 권고)
    const fkind = space.shell.finish.floor;
    if (floor && floor.material && fkind !== 'grass' && fkind !== 'water') { floor.material.roughness = 0.16; floor.material.envMapIntensity = 1.35; }
    addRoomLighting(group); // 작품 스포트라이트·천장 다운라이트·접촉그림자
    applyLightColorToGroup(); // 유저 지정 조명색을 새 스포트라이트에 재적용
    scene.add(group);
    refreshSelection();
  }
  function applyLightColorToGroup() { if (lightColor && group) group.traverse((o) => { if (o.isSpotLight) o.color.copy(lightColor); }); }
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
  function cancelPlace() { placingType = null; disposeGhost(); emit('mode', { placing: placingType }); } // beginPlace와 대칭으로 emit(모바일 취소버튼 UI 동기화)
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
  function moveGhostTo(x, z, y) {
    if (!ghost || !placingType) return;
    const { hw, hd, t, H } = spaceDims(space);
    const s = applySnap(placingType, clampToRoom(x, hw, t), clampToRoom(z, hd, t));
    ghost.position.set(s.x, (y != null ? y : partY(placingType, H)), s.z); ghost.visible = true; // v2 스택: y 있으면 위로
    const bad = uniqueTexCapReached(placingType);
    ghostMat.color.setHex(bad ? 0xb0503f : 0x8b7bd8); // 불가=테라코타
  }
  function uniqueTexCapReached(type) { return UNIQUE_TEX_TYPES.has(type) && uniqueTexCount(space) >= ART_SCREEN_CAP; }

  /** 파츠 추가. 성공 시 index, 실패(캡 초과) 시 -1 */
  function addPart(type, x, z, extra = {}) {
    if (!PART_TYPES[type]) return -1;
    if (uniqueTexCapReached(type)) { emit('cap', { type, cap: ART_SCREEN_CAP }); return -1; }
    const { hw, hd, t } = spaceDims(space);
    const s = applySnap(type, clampToRoom(x, hw, t), clampToRoom(z, hd, t));
    pushUndo();
    const part = Object.assign({ t: type, x: s.x, z: s.z, ry: 0 }, extra);
    space = normalizeSpace({ ...space, parts: [...space.parts, part] });
    rebuild(); emit('change', { space });
    return space.parts.length - 1;
  }

  // ── 선택·회전·삭제 ──
  function selectIndex(i) {
    selected = (i >= 0 && i < space.parts.length) ? i : -1;
    if (moveMode) { moveMode = false; moveDragActive = false; moveTargetXZ = null; emit('movemode', { moveMode }); } // 선택 바뀌면 이동모드 해제(안전)
    refreshSelection(); emit('select', { index: selected, part: selected >= 0 ? space.parts[selected] : null });
  }
  function refreshSelection() {
    if (selectMesh) { scene.remove(selectMesh); selectMesh.geometry.dispose(); selectMesh.material.dispose(); selectMesh = null; }
    if (selected < 0 || selected >= space.parts.length) return;
    const p = space.parts[selected]; const [w, h, d] = PART_TYPES[p.t].size; const { H } = spaceDims(space);
    selectMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06 + 0.05, h * 1.06 + 0.05, d * 1.06 + 0.05), new THREE.MeshBasicMaterial({ color: 0x6fe3ff, wireframe: true }));
    selectMesh.position.set(p.x, (p.y != null ? p.y : partY(p.t, H)), p.z); selectMesh.rotation.y = p.ry; scene.add(selectMesh); // v2 스택: p.y 우선
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
  // ── 이동(모바일 경량 신규 — 기존엔 파츠 이동 API가 없었음, 배치/삭제만 존재) ──
  // moveMode on 상태에서 단일 포인터 드래그 = 오빗 대신 선택 파츠를 xz로 이동.
  // 라이브 프리뷰는 선택 아웃라인(selectMesh)만 옮긴다(accent 메쉬가 partRefs와 분리돼 있어
  // 실제 파츠를 프레임마다 재조립하면 무겁고 액자/유리 등 부속이 따로 놀 수 있음) → 가볍게, 확정은 포인터업 1회 커밋.
  function setMoveMode(on) {
    moveMode = !!on && selected >= 0;
    if (!moveMode) { moveDragActive = false; moveTargetXZ = null; }
    emit('movemode', { moveMode });
    return moveMode;
  }
  function beginMoveDrag() {
    if (!moveMode || selected < 0) return false;
    moveDragActive = true; moveTargetXZ = null;
    return true;
  }
  function updateMoveDrag(x, z) {
    if (!moveDragActive || selected < 0 || !selectMesh) return;
    const p = space.parts[selected]; if (!p) return;
    const { hw, hd, t } = spaceDims(space);
    const s = applySnap(p.t, clampToRoom(x, hw, t), clampToRoom(z, hd, t));
    selectMesh.position.x = s.x; selectMesh.position.z = s.z;
    moveTargetXZ = s;
  }
  function endMoveDrag() {
    const wasActive = moveDragActive; moveDragActive = false;
    if (!wasActive || !moveTargetXZ || selected < 0) { moveTargetXZ = null; return; }
    const idx = selected; const { x, z } = moveTargetXZ; moveTargetXZ = null;
    const p = space.parts[idx]; if (!p) return;
    if (p.x !== x || p.z !== z) {
      pushUndo();
      const parts = space.parts.slice(); parts[idx] = { ...parts[idx], x, z };
      space = normalizeSpace({ ...space, parts });
      rebuild(); emit('change', { space });
    }
    moveMode = false; emit('movemode', { moveMode }); // 1회 이동 후 자동 해제 → 다음 드래그는 다시 오빗(모바일 UX 안전장치)
  }
  function deleteSelected() {
    if (selected < 0) return;
    pushUndo();
    const parts = space.parts.slice(); parts.splice(selected, 1);
    space = normalizeSpace({ ...space, parts }); selected = -1;
    if (moveMode) { moveMode = false; moveDragActive = false; moveTargetXZ = null; emit('movemode', { moveMode }); }
    rebuild(); emit('change', { space });
  }
  function undo() {
    if (!undoStack.length) return false;
    space = normalizeSpace(JSON.parse(undoStack.pop())); selected = -1;
    if (moveMode) { moveMode = false; moveDragActive = false; moveTargetXZ = null; emit('movemode', { moveMode }); }
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
  // 작품 파츠에 이미지(dataURL) 설정 — 스크린 유튜브 패턴 계승. artwork만(아니면 false).
  // dataURL이 빈 문자열이면 이미지 제거(src=''). 스키마 신규 필드 0 — 기존 src를 이미지 dataURL 저장에 사용.
  function setArtworkImage(index, dataURL, ar) {
    if (index < 0 || !space.parts[index] || space.parts[index].t !== 'artwork') return false;
    const src = typeof dataURL === 'string' ? dataURL : '';
    pushUndo();
    const parts = space.parts.slice();
    const next = { ...parts[index], src };
    // ar(종횡비): next는 기존 파츠 스프레드라 기존 ar을 이미 품고 있다. 아래 규칙으로 갱신·유지·제거를 가른다.
    if (!src) delete next.ar;                                     // 이미지 제거 → ar 제거(빈 액자=고정 1.2×1.6 폴백)
    else if (typeof ar === 'number' && isFinite(ar) && ar > 0) next.ar = ar; // 유효 종횡비 → 갱신
    else if (ar !== undefined) delete next.ar;                    // 무효값(NaN·0·음수·비수치) 명시 전달 → 제거(기존 동작 보존)
    // else(ar===undefined): 기존 next.ar 유지 — 이미지만 교체하고 비율 생략해도 종횡비 무손실(신규 방어)
    parts[index] = next;
    space = normalizeSpace({ ...space, parts }); rebuild(); emit('change', { space });
    return true;
  }
  function getArtworkImage(index) { const p = space.parts[index]; return (p && p.t === 'artwork') ? (p.src || '') : ''; }

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
  function load() { const dec = decodeSpace(localStorage.getItem(SAVE_KEY)); if (!dec) return false; space = clampCap(dec); undoStack.length = 0; selected = -1; rebuild(); resetCamera(); emit('change', { space }); return true; }
  function exportJSON() { return JSON.stringify(space, null, 0); }
  function importJSON(str) {
    const s = (typeof str === 'string' && str.startsWith(SPACE_PREFIX)) ? str : SPACE_PREFIX + String(str);
    const dec = decodeSpace(s); if (!dec) return false; // 파손·상위버전(SPACE_VERSION_AHEAD) → false
    space = clampCap(dec); undoStack.length = 0; selected = -1; rebuild(); resetCamera(); emit('change', { space }); return true;
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
  // v2 스택: 파츠 위로 레이가 맞으면 그 파츠 윗면 좌표 반환 → "위에 쌓기"(감독 #46).
  function pickStack(v2) {
    raycaster.setFromCamera(v2, camera);
    const objs = (group.userData.partRefs || []).map((r) => r.object);
    const hit = raycaster.intersectObjects(objs, false)[0];
    if (!hit) return null;
    const idx = hit.object.userData.partIndex; const p = space.parts[idx];
    if (!p) return null;
    const { H } = spaceDims(space);
    const cy = (p.y != null) ? p.y : partY(p.t, H);      // 아래 파츠 중심 y
    const topY = cy + PART_TYPES[p.t].size[1] / 2;         // 아래 파츠 윗면
    return { index: idx, x: p.x, z: p.z, topY };
  }
  // 배치 대상 좌표 결정: 파츠 위(스택) 우선, 없으면 바닥. 반환에 y(스택 시)를 포함.
  function pickPlacement(v2, type) {
    const st = pickStack(v2);
    if (st) return { x: st.x, z: st.z, y: st.topY + PART_TYPES[type].size[1] / 2 };
    const f = pickFloor(v2);
    return f ? { x: f.x, z: f.z } : null;
  }

  // ── 이벤트 바인딩(데스크톱 + 터치) ──
  // pointerdown/move/up은 마우스·터치 공용(Pointer Events). 멀티터치는 activePointers로 손가락별 추적해
  // 핀치줌+2손가락팬을 얹는다 — 1손가락 흐름(오빗/배치/선택)은 그대로 두고 손가락이 2개가 될 때만 분기.
  let dragging = false, lastX = 0, lastY = 0, moved = false;
  let movingPart = false;   // 이번 드래그가 오빗이 아니라 moveMode 파츠 이동인지
  const activePointers = new Map(); // pointerId → {x,y}
  let pinch = null;         // { startDist, startRad, startMid } — 2손가락째부터 존재
  // ── 카메라 이동(팬) — 중심 회전만이 아니라 방 안을 돌아다니며 빌드(감독 요청·심즈식) ──
  function clampTarget() {
    const dims = group && group.userData.dims; const hw = dims ? dims.hw + 1 : 6, hd = dims ? dims.hd + 1 : 6;
    orbit.target.x = Math.max(-hw, Math.min(hw, orbit.target.x));
    orbit.target.z = Math.max(-hd, Math.min(hd, orbit.target.z));
  }
  // 줌 거리 상한을 공간 크기에 비례로 묶는다 — 모바일 터치(큰 폭)에서 카메라가 공간 밖으로
  // 멀어져 회색만 보이던 이탈 버그 방지. resetCamera 초기 rad와 동일 식 기반(초기 rad < 상한 보장).
  function clampRad(r) {
    const [fw, fd] = FOOTPRINT[space.shell.footprint] || [9, 7];
    const radMax = Math.min(20, Math.max(9.5, Math.hypot(fw, fd) * 0.6) * 1.5);
    return Math.max(3, Math.min(radMax, r));
  }
  function panBy(fwd, right) { // 화면 기준 전/후·좌/우(카메라 방위각 반영)
    const fx = -Math.sin(orbit.az), fz = -Math.cos(orbit.az), rx = Math.cos(orbit.az), rz = -Math.sin(orbit.az);
    orbit.target.x += fwd * fx + right * rx; orbit.target.z += fwd * fz + right * rz; clampTarget();
  }
  const ptDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const ptMid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  let panning = false;
  function onDown(e) {
    if (walkOn) return; // 걸어서 모드: 포인터로 오빗/선택/배치 조작 안 함(orbit 상태 불변 보장)
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size >= 2) { // 2번째 손가락 → 핀치 시작(진행 중이던 단일 드래그는 취소)
      dragging = false; movingPart = false;
      const pts = [...activePointers.values()];
      pinch = { startDist: Math.max(1, ptDist(pts[0], pts[1])), startRad: orbit.rad, startMid: ptMid(pts[0], pts[1]) };
      return;
    }
    dragging = true; moved = false;
    if (moveMode && selected >= 0 && !placingType && !e.shiftKey && e.button !== 1 && e.button !== 2) {
      movingPart = beginMoveDrag(); panning = false; // 이동모드: 드래그=선택 파츠 이동(오빗 대신)
    } else {
      movingPart = false;
      panning = e.shiftKey || e.button === 1 || e.button === 2;
    }
    lastX = e.clientX; lastY = e.clientY;
  }
  function onMove(e) {
    if (walkOn) return; // 걸어서 모드: 오빗 팬/줌·고스트 포인터 추적 비활성(orbit 상태 불변 보장)
    if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && activePointers.size >= 2) { // 핀치 줌(onWheel과 동일 orbit.rad 범위) + 2손가락 팬
      const pts = [...activePointers.values()];
      const d = Math.max(1, ptDist(pts[0], pts[1])), mid = ptMid(pts[0], pts[1]);
      orbit.rad = clampRad(pinch.startRad * (pinch.startDist / d));
      const dx = mid.x - pinch.startMid.x, dy = mid.y - pinch.startMid.y;
      const s = orbit.rad * 0.0016; panBy(dy * s, -dx * s);
      pinch.startMid = mid; applyCamera();
      e.preventDefault(); return;
    }
    const rect = canvas.getBoundingClientRect();
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (movingPart) {
        const f = pickFloor(ndc(e.clientX, e.clientY, rect)); if (f) updateMoveDrag(f.x, f.z);
      } else if (panning) { const s = orbit.rad * 0.0016; panBy(dy * s, -dx * s); }
      else { orbit.az -= dx * 0.008; orbit.pol = Math.max(0.35, Math.min(1.45, orbit.pol - dy * 0.006)); }
      lastX = e.clientX; lastY = e.clientY; applyCamera();
    } else if (placingType) {
      const pl = pickPlacement(ndc(e.clientX, e.clientY, rect), placingType); if (pl) moveGhostTo(pl.x, pl.z, pl.y);
    }
  }
  function onUp(e) {
    activePointers.delete(e.pointerId); // 걸어서 모드에서도 포인터 추적 정합성만 유지(추가 동작 없음)
    if (walkOn) return;
    if (activePointers.size < 2) pinch = null;
    if (activePointers.size >= 1) { // 두 손가락 중 하나만 뗌 — 남은 손가락 기준으로 이어감(점프 방지), 탭 판정은 생략
      const [rem] = activePointers.values(); if (rem) { lastX = rem.x; lastY = rem.y; moved = true; }
      return;
    }
    dragging = false;
    if (movingPart) { endMoveDrag(); movingPart = false; return; }
    if (moved) return;
    const rect = canvas.getBoundingClientRect(); const v = ndc(e.clientX, e.clientY, rect);
    if (placingType) { const pl = pickPlacement(v, placingType); if (pl) addPart(placingType, pl.x, pl.z, pl.y != null ? { y: pl.y } : {}); }
    else selectIndex(pickPart(v));
  }
  function onCancel(e) { // 브라우저가 제스처를 가로챌 때(pointercancel) — 커밋 없이 정리만
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) pinch = null;
    if (activePointers.size === 0) {
      dragging = false;
      if (movingPart) { movingPart = false; moveDragActive = false; moveTargetXZ = null; refreshSelection(); } // 아웃라인 원위치 복귀
    }
  }
  function onWheel(e) {
    if (walkOn) { e.preventDefault(); return; } // 걸어서 모드: 휠 줌 비활성(orbit.rad 불변 보장)
    orbit.rad = clampRad(orbit.rad + Math.sign(e.deltaY) * 0.6); applyCamera(); e.preventDefault();
  }
  function onKey(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // 입력창 타이핑 중엔 단축키 무시(WASD·Del 등)
    if (e.key === 'Escape') { if (walkOn) exitWalk(); else cancelPlace(); return; }
    if (walkOn) {
      // 걸어서 모드: 이동은 builder-walk.js 자체 리스너가 처리. 여기서는 "놓기"만 담당하고
      // 조망 전용 단축키(WASD팬·R/Q/E회전·Del삭제·Ctrl+Z undo)는 전부 비활성(조망에 위임, MVP 제외 범위).
      const k = e.key.toLowerCase();
      if ((e.key === ' ' || e.key === 'Enter' || k === 'f') && placingType && walkInstance) {
        walkPlaceForward();
        e.preventDefault();
      }
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'r') rotateSelected(e.shiftKey ? -1 : 1);           // 회전 그리드 스텝(양방향)
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
    window.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // 우클릭 팬 시 컨텍스트메뉴 억제
    window.addEventListener('keydown', onKey);
  }

  function resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  let raf = 0;
  function renderOnce() {
    const dt = clock.getDelta(); // walkOn 여부와 무관하게 매 프레임 소비 — 재진입 시 델타 점프 방지
    if (walkOn && walkInstance) {
      walkInstance.update(dt);
      if (placingType) { // 걸어서 모드에서도 고스트는 기존 applySnap+clampToRoom 경로(moveGhostTo)로 표시
        const pt = walkInstance.getForwardPoint(1.2);
        if (pt) moveGhostTo(pt.x, pt.z);
      }
    } else {
      applyCamera();
    }
    renderer.render(scene, camera);
  }
  function loop() { renderOnce(); raf = (typeof requestAnimationFrame !== 'undefined') ? requestAnimationFrame(loop) : 0; }

  // ── 걸어서 빌드 모드 진입/이탈(신규 훅) ──
  function enterWalk() {
    if (walkOn) return true;
    if (!walkInstance) walkInstance = createBuilderWalk({ scene, camera, clampToRoom, getSpace: () => space });
    walkInstance.enter();
    walkOn = true;
    clock.getDelta(); // 진입 직전까지의 편집 경과시간을 버려 첫 walk 프레임 델타 급증 방지
    emit('walkmode', { walking: true });
    return true;
  }
  function exitWalk() {
    if (!walkOn) return false;
    if (walkInstance) walkInstance.exit();
    walkOn = false;
    clock.getDelta(); // walk 경과시간을 버려 조망 복귀 직후 델타 급증 방지(조망은 델타 미사용이라 안전장치 성격)
    applyCamera(); // orbit 상태(변경 없음)로 즉시 원상 복귀
    renderOnce();
    emit('walkmode', { walking: false });
    return true;
  }

  // ── 걸어서 모드 모바일 입력 프록시(신규 가산 — builder.html 조이스틱/드래그 HUD가 호출) ──
  // walkInstance.setMove/setYaw/getForwardPoint를 그대로 위임. 시그니처·로직은 builder-walk.js 원본 불변.
  function walkMove(vx, vz) { if (walkOn && walkInstance) walkInstance.setMove(vx, vz); }
  function walkYaw(dy) { if (walkOn && walkInstance) walkInstance.setYaw(dy); }
  function walkPlaceForward() { // "여기 놓기" — 걸어서 모드의 Space/Enter/F 키와 동일 배치 경로(단일 지점화)
    if (!walkOn || !walkInstance || !placingType) return -1;
    const pt = walkInstance.getForwardPoint(1.2);
    return pt ? addPart(placingType, pt.x, pt.z) : -1;
  }

  // ── HUD 컨트롤 API (프리미엄 글래스 HUD 배선) ──
  function resetCamera() { // 공간 크기에 맞춰 조망 거리 자동(감독 #1: 큰 방이 한눈에 들어오게)
    const [fw, fd] = FOOTPRINT[space.shell.footprint] || [9, 7];
    orbit.az = 0.5; orbit.pol = 0.82; orbit.rad = Math.max(9.5, Math.hypot(fw, fd) * 0.6);
    orbit.target.set(0, 0.9, 0); applyCamera();
  }
  function setGridSnap(on) { gridSnap = !!on; return gridSnap; }
  function setLightIntensity(mult) { renderer.toneMappingExposure = 1.16 * Math.max(0.5, Math.min(2, mult || 1)); renderOnce(); } // 조명 강도(노출)
  function setViewMode(mode) { // 'view'=관람 미리보기(배치·선택 종료)
    viewMode = mode === 'view' ? 'view' : 'edit';
    if (viewMode === 'view') { cancelPlace(); selectIndex(-1); }
    emit('viewmode', { mode: viewMode }); return viewMode;
  }
  function setSpaceName(name) { // 전시 타이틀 → 스키마 meta.name(저장 시 함께 인코딩)
    const nm = String(name || '').slice(0, 60);
    space = normalizeSpace({ ...space, meta: { ...space.meta, name: nm } });
    emit('change', { space }); return nm;
  }
  function setLightColor(hex) { // 조명 색(감독: 색도 정할 수 있게) — 키라이트+스포트에 적용
    lightColor = new THREE.Color(hex);
    if (baked) { baked = false; rebuild(); emit('unbaked', {}); } // 베이크 중 색 변경 → 실시간 복귀(검수 조건1). renderOnce는 아래 1회로 통합(검수 권고1)
    key.color.copy(lightColor); applyLightColorToGroup(); renderOnce();
  }
  // 마감(재질) 변경 — kind ∈ {wall,floor,ceiling,featureFinish,featureWall}. normalizeSpace가 검증·클램프.
  const FINISH_SET = { wall: FINISH.wall.ids, floor: FINISH.floor.ids, ceiling: FINISH.ceiling.ids, trim: FINISH.trim.ids, featureFinish: FINISH.feature.ids, featureWall: ['none', 'north', 'south', 'east', 'west'] };
  function setFinish(kind, id) {
    const set = FINISH_SET[kind];
    if (!set || !set.includes(id)) return space.shell.finish[kind]; // 무효 id 무시(현재값 유지) — 기본값 리셋 방지. kintsugi를 벽에 넣는 등 오용 차단(1면 강제 보강).
    if (baked) { baked = false; emit('unbaked', {}); } // 베이크 상태에서 재질 바꾸면 실시간 복귀(색 변경 규율과 동일)
    space = normalizeSpace({ ...space, shell: { ...space.shell, finish: { ...space.shell.finish, [kind]: id } } });
    rebuild(); emit('change', { space });
    return space.shell.finish[kind];
  }
  // 공간 크기(footprint) 변경 — 감독 #1: 작품이 다 들어가게 더 큰 방. FOOTPRINT 프리셋 id.
  const FOOTPRINT_IDS = new Set(Object.keys(FOOTPRINT));
  function setFootprint(id) {
    if (!FOOTPRINT_IDS.has(id)) return space.shell.footprint; // 무효 id 무시(현재값 유지)
    if (baked) { baked = false; emit('unbaked', {}); } // 크기 바뀌면 베이크 무효 → 실시간 복귀
    pushUndo();
    space = normalizeSpace({ ...space, shell: { ...space.shell, footprint: id } });
    rebuild(); resetCamera(); emit('change', { space }); // 새 방 크기에 카메라 맞춤
    return space.shell.footprint;
  }
  // 프리셋(심즈식 "완성된 방으로 시작", #49) — 기존 파츠·스키마만. 현재 공간 교체(undo 가능).
  function getPresets() { return SPACE_PRESETS.map((p) => ({ id: p.id, name: p.name, desc: p.desc, thumb: presetThumb(p.space) })); }
  function applyPreset(id) {
    const pr = getPreset(id); if (!pr) return false;
    pushUndo(); cancelPlace(); selectIndex(-1);
    if (baked) { baked = false; emit('unbaked', {}); }
    space = clampCap(normalizeSpace(pr.space)); // 외부 유입 경계에서 80캡 강제(load/import와 동형)
    rebuild(); emit('change', { space });
    return true;
  }
  function clearSpace() { // 클리어(감독: 지우고 다시) — 파츠 전부 비움, 방 셸은 유지. undo 가능.
    pushUndo(); cancelPlace(); selectIndex(-1);
    space = normalizeSpace({ ...space, parts: [] }); rebuild(); emit('change', { space });
  }
  // ── GPU 셸 라이트맵 베이크(팀장 승인: 무저장·방문 즉시·하이브리드) ──
  function bake() {
    if (!group || baked) return { ok: false };
    cancelPlace(); selectIndex(-1);
    const r = bakeShellLightmaps(group, renderer, {});
    baked = true; renderOnce(); emit('baked', r); return { ok: true, ...r };
  }
  function unbake() { if (baked) { baked = false; rebuild(); renderOnce(); emit('unbaked', {}); } } // 다시 편집(실시간 복귀)

  rebuild(); applyCamera();
  if (!opts.headless) loop();

  return {
    // 스크립트 API (헤드리스 검증·UI 배선 공용)
    beginPlace, cancelPlace, addPart, selectIndex, rotateSelected, rotateSelectedFine, deleteSelected, undo,
    setMoveMode, isMoveMode: () => moveMode,
    setScreenVideo, getScreenVideo, setArtworkImage, getArtworkImage,
    resetCamera, setGridSnap, setLightIntensity, setViewMode, setSpaceName, setLightColor, setFinish, setFootprint, getPresets, applyPreset, clearSpace, bake, unbake, isBaked: () => baked,
    save, load, exportJSON, importJSON, resize, renderOnce,
    enterWalk, exitWalk, isWalking: () => walkOn, // 걸어서 빌드 모드(신규 가산)
    walkMove, walkYaw, walkPlaceForward, // 걸어서 모드 모바일 입력 프록시(신규 가산 — HUD 배선용)
    getSpace: () => space, getSelected: () => selected, getViewMode: () => viewMode,
    getStats: () => { renderOnce(); return { parts: space.parts.length, uniqueTex: uniqueTexCount(space), calls: renderer.info.render.calls }; },
    on: (ev, f) => { (listeners[ev] = listeners[ev] || []).push(f); },
    get renderer() { return renderer; }, get camera() { return camera; }, get orbit() { return orbit; }, getGroup: () => group,
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      if (walkInstance) walkInstance.dispose(); // 걸어서 아바타·리스너 정리
      cancelPlace(); // ghost 정리
      if (selectMesh) { scene.remove(selectMesh); selectMesh.geometry.dispose(); selectMesh.material.dispose(); selectMesh = null; }
      if (group) disposeSpaceGroup(group);
      if (scene.environment) { scene.environment.dispose(); scene.environment = null; } // PMREM envMap 해제(검수 권고)
      renderer.dispose();
    },
  };
}
