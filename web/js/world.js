// world.js — 오픈월드 파셀 스트리밍 워크스루 (behind-flag · 첫 스파이크)
// -----------------------------------------------------------------------------
// 아키텍처(가산형 독립): 라이브 미술관 런타임(main/player/artworks/config)과 방문자뷰
// (visit.js)를 일절 수정하지 않고, 재사용 자산(space-render·avatar·npc)만 소비하는
// 자체 완결 컨트롤러. visit.js의 검증된 이동·충돌 로직을 "여러 파셀(단칸 공간)을 그리드에
// 타일링하고 인접분만 스트리밍"하도록 확장한다. "파라미터가 곧 공간"을 파셀 단위로 확장.
//
// 파셀 모델(복셀스): 파셀 = 하늘 아래 대지. 정수 그리드 (px,pz), 월드 오프셋 = (px*cellX, 0, pz*cellZ).
//   대지 중앙부에 건물(footprint·층고·층수 자유), 가장자리는 길. 이동은 개방(월드 소프트 클램프만),
//   건물 벽 = solid 세그먼트(computeShellSolids, 문 구간 비움) → 출입은 문으로만.
//
// createWorld({ canvas, parcels, opts }) → 스크립트 API(헤드리스 검증 가능):
//   parcels: [{ px, pz, space, npc? }]  (npc: { roster, count } — 그 파셀에 직원 NPC 소환)
//   walk/update/renderOnce/lookDelta/getPosition/getLoadedKeys/dispose/on ...
//   opts.cellX/cellZ: 축별 파셀 셀 크기(m). opts.cell: 정사각 폴백(기본 32). opts.headless: RAF·이벤트 바인딩 비활성.
// -----------------------------------------------------------------------------
import * as THREE from 'three';
import { mergeGeometries } from '../utils/BufferGeometryUtils.js';
import { buildSpaceGroup, disposeSpaceGroup, addRoomLighting, spaceDims, partY, DOOR_W } from './space-render.js';
import { PART_TYPES } from './space.js';
import { createAvatarInstance } from './avatar.js';
import { NpcCrowd } from './npc.js';
import { PEER_ROOM_ID, EYE_HEIGHT } from './config.js';
import { MultiplayerManager } from './multiplayer.js';

const EYE = 1.5;            // 시점 높이(m)
const SPEED = 3.0;         // 이동 속도(m/s)
const RADIUS = 0.3;        // 플레이어 반경(충돌 마진)
const PITCH_LIMIT = 1.45;  // 상하 시선 클램프(rad)
const STEP_OVER = 0.12;    // 걸림턱(바닥타일만 통과) — visit.js 계약 계승
const STEP_TOLERANCE = 0.65; // [다층] 프레임당 허용 고저차(계단 등반·추락 방지) — player.js 이식
const GROUND_LERP_RATE = 12; // [다층] 지면 y 추종 보간(계단이 매끄러운 경사로)
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
  // 비정사각 셀(cellX/cellZ) — 복셀스 개방 도시는 정사각 24×24(셀 > 건물 → 가장자리가 길).
  // opts.cell(스칼라) 폴백 유지 → 스파이크(createWorld({cell:9}))·정사각 그리드 무회귀.
  const CELLX = opts.cellX || opts.cell || 32;
  const CELLZ = opts.cellZ || opts.cell || 32;
  const CELL_MAX = Math.max(CELLX, CELLZ); // fog 스케일 대표값

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // [복셀스] 야외 낮 씬 — 하늘색 헤미 + 태양 디렉셔널(플레이어 추종 타이트 섀도) + 스카이돔.
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xcfe4f7, 0x8fa385, 1.0)); // 그림자 대비 완화(야외 앰비언트)
  scene.environment = makeEnvMap(renderer);
  const sun = new THREE.DirectionalLight(0xfff2dc, 0.95);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0005;
  { const c = sun.shadow.camera; c.left = -22; c.right = 22; c.top = 22; c.bottom = -22; c.near = 0.5; c.far = 130; c.updateProjectionMatrix(); }
  scene.add(sun); scene.add(sun.target);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 900);

  // 하늘 — 캔버스 그라디언트 스카이돔(자기완결·외부 텍스처 0, fog 미적용) + 밝은 대기 fog.
  const FOG_COLOR = 0xcfe0ee;
  scene.fog = new THREE.Fog(FOG_COLOR, CELL_MAX * 1.1, CELL_MAX * 3.4);
  renderer.setClearColor(FOG_COLOR, 1);
  function makeSkyDome() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const x = c.getContext('2d');
    const grd = x.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#5f9fd6'); grd.addColorStop(0.55, '#a8cbe8'); grd.addColorStop(0.8, '#dbe8f2'); grd.addColorStop(1, '#e9eef2');
    x.fillStyle = grd; x.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
    const m = new THREE.Mesh(new THREE.SphereGeometry(520, 24, 12), mat);
    m.renderOrder = -1;
    return m;
  }
  const sky = makeSkyDome(); scene.add(sky);

  // 지면·도로·물·다리 공유 재질(파셀 복제 방지) — dispose()에서 일괄 회수.
  const T = {
    grass: new THREE.MeshStandardMaterial({ color: 0x7fa46a, roughness: 1.0, metalness: 0 }),
    plaza: new THREE.MeshStandardMaterial({ color: 0xcac3b6, roughness: 0.95, metalness: 0 }),
    road: new THREE.MeshStandardMaterial({ color: 0x5b5e66, roughness: 0.98, metalness: 0 }),
    bridge: new THREE.MeshStandardMaterial({ color: 0x8a7a64, roughness: 0.9, metalness: 0 }),
    water: new THREE.MeshStandardMaterial({ color: 0x3f6f8f, roughness: 0.32, metalness: 0.12, transparent: true, opacity: 0.92 }),
    // 거리 가구 공유 재질 — 파스텔 중채도(치비 세계관). dispose()에서 일괄 회수.
    treeTrunk: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.95, metalness: 0 }),
    treeCanopy: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 }), // instanceColor로 톤 틴트
    lampPost: new THREE.MeshStandardMaterial({ color: 0x353842, roughness: 0.6, metalness: 0.3 }), // 진회색 기둥
    lampHead: new THREE.MeshStandardMaterial({ color: 0x6b5836, roughness: 0.5, metalness: 0.2, emissive: 0xffcf8a, emissiveIntensity: 0.8 }), // 웜톤 갓(실제 THREE.Light 0 — 라이브 규율 계승)
    benchWood: new THREE.MeshStandardMaterial({ color: 0x9a8461, roughness: 0.85, metalness: 0 }),
    planterVC: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }), // 테라코타 화분 + 녹색 관목(정점색)
  };
  // 캐노피 톤 — 채도 낮은 녹색 2~3톤(잔디 0x7fa46a보다 진하게). setColorAt으로 인스턴스별 지정.
  const CANOPY_TONES = [new THREE.Color(0x4c6b42), new THREE.Color(0x3d5a36), new THREE.Color(0x5f7d4e)];

  // 거리 가구 공유 지오메트리(파셀 간 재사용 — InstancedMesh/개별 Mesh가 참조). createWorld dispose에서 회수.
  const paintGeo = (g, hex) => {
    const c = new THREE.Color(hex), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3)); return g;
  };
  const SG = (() => {
    const trunk = new THREE.CylinderGeometry(0.16, 0.22, 2.0, 7); trunk.translate(0, 1.0, 0);
    const cLo = new THREE.SphereGeometry(1.05, 10, 8); cLo.scale(1, 0.82, 1); cLo.translate(0, 2.5, 0);
    const cHi = new THREE.ConeGeometry(0.82, 1.3, 9); cHi.translate(0, 3.42, 0);
    const canopy = mergeGeometries([cLo, cHi]); cLo.dispose(); cHi.dispose();
    const lampPost = new THREE.CylinderGeometry(0.06, 0.09, 3.0, 8); lampPost.translate(0, 1.5, 0);
    const lampHead = new THREE.SphereGeometry(0.22, 10, 8); lampHead.scale(1, 0.8, 1); lampHead.translate(0, 3.06, 0);
    const seat = new THREE.BoxGeometry(1.4, 0.09, 0.44); seat.translate(0, 0.45, 0);
    const bLegL = new THREE.BoxGeometry(0.12, 0.42, 0.4); bLegL.translate(-0.58, 0.21, 0);
    const bLegR = new THREE.BoxGeometry(0.12, 0.42, 0.4); bLegR.translate(0.58, 0.21, 0);
    const bench = mergeGeometries([seat, bLegL, bLegR]); [seat, bLegL, bLegR].forEach((g) => g.dispose());
    const pot = new THREE.CylinderGeometry(0.28, 0.2, 0.42, 12); pot.translate(0, 0.21, 0);
    const bush = new THREE.SphereGeometry(0.3, 10, 8); bush.scale(1, 0.92, 1); bush.translate(0, 0.62, 0);
    const planter = mergeGeometries([paintGeo(pot, 0x9a5b43), paintGeo(bush, 0x4c6b42)]); pot.dispose(); bush.dispose();
    return { trunk, canopy, lampPost, lampHead, bench, planter };
  })();
  const _tmpM = new THREE.Matrix4(), _tmpC = new THREE.Color();

  // 거리 가구 배치 배열(def.street) → 렌더 Mesh + solid AABB(같은 데이터 파생 = 렌더-물리 정합).
  // shellOnly(대각 임포스터) 파셀은 생략(원거리 draw call 절약). 반환: 회수 대상 Mesh 배열.
  function buildStreet(street, group, ox, oz, solids) {
    const meshes = [];
    const trees = street.filter((s) => s.kind === 'tree');
    if (trees.length) {
      const trunkIM = new THREE.InstancedMesh(SG.trunk, T.treeTrunk, trees.length);
      const canopyIM = new THREE.InstancedMesh(SG.canopy, T.treeCanopy, trees.length);
      trees.forEach((s, i) => {
        _tmpM.makeTranslation(ox + s.x, 0, oz + s.z);
        trunkIM.setMatrixAt(i, _tmpM); canopyIM.setMatrixAt(i, _tmpM);
        canopyIM.setColorAt(i, _tmpC.copy(CANOPY_TONES[(s.tone | 0) % 3]));
        solids.push({ x: ox + s.x, z: oz + s.z, ex: 0.25, ez: 0.25, bottom: 0, top: 2.0 }); // 줄기 충돌
      });
      trunkIM.castShadow = true; canopyIM.castShadow = true;
      trunkIM.instanceMatrix.needsUpdate = true; canopyIM.instanceMatrix.needsUpdate = true;
      if (canopyIM.instanceColor) canopyIM.instanceColor.needsUpdate = true;
      group.add(trunkIM, canopyIM); meshes.push(trunkIM, canopyIM);
    }
    for (const s of street) {
      if (s.kind === 'lamp') {
        const post = new THREE.Mesh(SG.lampPost, T.lampPost); post.position.set(ox + s.x, 0, oz + s.z); post.castShadow = true;
        const head = new THREE.Mesh(SG.lampHead, T.lampHead); head.position.set(ox + s.x, 0, oz + s.z);
        group.add(post, head); meshes.push(post, head);
        solids.push({ x: ox + s.x, z: oz + s.z, ex: 0.22, ez: 0.22, bottom: 0, top: 3.0 }); // 기둥 충돌
      } else if (s.kind === 'bench') {
        const b = new THREE.Mesh(SG.bench, T.benchWood); b.position.set(ox + s.x, 0, oz + s.z); b.rotation.y = s.ry || 0;
        b.castShadow = true; b.receiveShadow = true; group.add(b); meshes.push(b);
        const c = Math.abs(Math.cos(s.ry || 0)), sn = Math.abs(Math.sin(s.ry || 0));
        solids.push({ x: ox + s.x, z: oz + s.z, ex: 0.7 * c + 0.22 * sn, ez: 0.7 * sn + 0.22 * c, bottom: 0, top: 0.5 }); // top 0.5 > STEP_OVER
      } else if (s.kind === 'planter') {
        const p = new THREE.Mesh(SG.planter, T.planterVC); p.position.set(ox + s.x, 0, oz + s.z); p.castShadow = true;
        group.add(p); meshes.push(p);
        solids.push({ x: ox + s.x, z: oz + s.z, ex: 0.3, ez: 0.3, bottom: 0, top: 0.9 });
      }
    }
    return meshes;
  }

  // ── 파셀 인덱스 / 로드 상태 ──
  const keyOf = (px, pz) => px + ',' + pz;
  const index = new Map();  // "px,pz" → def({px,pz,space,npc?})
  for (const d of parcels) index.set(keyOf(d.px, d.pz), d);
  const loaded = new Map(); // "px,pz" → { group, def, ox, oz, dims, solids, crowd, avatars, lod }
  let mp = null; // 실시간 멀티플레이어(opts.mp 지정 + window.Peer 존재 시 생성)

  function parcelArts(def, ox, oz) {
    // NPC는 지면층 작품만 감상(상층 p.floor>0 제외 — NPC 단층 고정 계약)
    return (def.space.parts || []).filter((p) => p.t === 'artwork' && !(p.floor > 0)).map((p) => ({
      pos: { x: ox + p.x, y: 0, z: oz + p.z }, rotY: p.ry || 0, floorY: 0,
      title: (def.space.meta && def.space.meta.name) || '작품', featured: !!p.featured,
    }));
  }
  // [복셀스] 건물 4벽 → solid AABB 세그먼트(entries 방향은 문 폭 비움) — "방에 가두기"에서
  // "벽이 막기"로 반전. buildSpaceGroup의 벽 배열·문틀 분할과 동일 수식(렌더-물리 정합).
  function computeShellSolids(dims, entries, cx, cz) {
    const { fw, fd, hw, hd, t, totalH } = dims;
    const out = [], open = new Set(entries), DIRS = ['north', 'south', 'west', 'east'];
    [[0, -hd, fw + t, t], [0, hd, fw + t, t], [-hw, 0, t, fd - t], [hw, 0, t, fd - t]].forEach(([x, z, ww, dd], wi) => {
      const horiz = ww >= dd;
      const len = horiz ? ww : dd, thick = horiz ? dd : ww;
      if (open.has(DIRS[wi]) && len > DOOR_W + 0.8) {
        const side = (len - DOOR_W) / 2, off = DOOR_W / 2 + side / 2;
        for (const s of [-1, 1]) {
          const sx = x + (horiz ? s * off : 0), sz = z + (horiz ? 0 : s * off);
          out.push({ x: cx + sx, z: cz + sz, ex: (horiz ? side : thick) / 2, ez: (horiz ? thick : side) / 2, bottom: 0, top: totalH });
        }
        // [다층] 문은 지면층(f=0)에만 렌더됨(buildSpaceGroup) — 문 상공의 상층 벽(H~totalH)을 물리에도 복제(렌더-물리 정합, 검증 MINOR).
        if (dims.floors > 1) out.push({ x: cx + x, z: cz + z, ex: (horiz ? DOOR_W : thick) / 2, ez: (horiz ? thick : DOOR_W) / 2, bottom: dims.H, top: totalH });
      } else {
        out.push({ x: cx + x, z: cz + z, ex: ww / 2, ez: dd / 2, bottom: 0, top: totalH });
      }
    });
    return out;
  }
  // solid 파츠 → 월드 XZ AABB (visit.js solids 규칙을 파셀 오프셋으로 확장)
  function computeSolids(def, ox, oz, dims) {
    return (def.space.parts || []).filter((p) => PART_TYPES[p.t] && PART_TYPES[p.t].solid).map((p) => {
      const [w, h, d] = PART_TYPES[p.t].size;
      const c = Math.abs(Math.cos(p.ry || 0)), s = Math.abs(Math.sin(p.ry || 0));
      const ex = (w / 2) * c + (d / 2) * s, ez = (w / 2) * s + (d / 2) * c;
      const cy = (p.y != null) ? p.y : partY(p.t, dims.H) + (p.floor || 0) * dims.H; // [다층] p.floor 층 오프셋
      return { x: ox + p.x, z: oz + p.z, ex, ez, bottom: cy - h / 2, top: cy + h / 2 };
    });
  }

  function loadParcel(px, pz, lod) {
    const k = keyOf(px, pz); const def = index.get(k); if (!def) return;
    const ex = loaded.get(k);
    if (ex) { if (ex.lod === lod) return; unloadParcel(k); } // LOD 변경 시 재로드
    const ox = px * CELLX, oz = pz * CELLZ;
    const shellOnly = lod === 'shell';
    // [복셀스] 파셀 루트 = 지면(또는 다리) + 건물(있으면). own = 파셀 소유 지오(공유 재질 제외 회수).
    const group = new THREE.Group();
    const own = [];
    if (def.water) {
      const bg = new THREE.BoxGeometry(CELLX, 0.12, 3); own.push(bg); // 동서 다리(강 z 중앙)
      const bm = new THREE.Mesh(bg, T.bridge); bm.position.set(ox, -0.02, oz); bm.receiveShadow = true; group.add(bm);
    } else {
      const gg = new THREE.BoxGeometry(CELLX, 0.1, CELLZ); own.push(gg); // 대지(잔디/광장 — 결정론 믹스)
      const gm = new THREE.Mesh(gg, ((px * 7 + pz * 13) % 4 === 0) ? T.plaza : T.grass);
      gm.position.set(ox, -0.056, oz); gm.receiveShadow = true; group.add(gm);
      const rgS = new THREE.BoxGeometry(CELLX, 0.1, 2.5); own.push(rgS); // 남 가장자리 도로(이웃 북측과 5m 도로망)
      const rs = new THREE.Mesh(rgS, T.road); rs.position.set(ox, -0.05, oz + CELLZ / 2 - 1.25); rs.receiveShadow = true; group.add(rs);
      const rgE = new THREE.BoxGeometry(2.5, 0.1, CELLZ); own.push(rgE); // 동 가장자리 도로
      const re = new THREE.Mesh(rgE, T.road); re.position.set(ox + CELLX / 2 - 1.25, -0.05, oz); re.receiveShadow = true; group.add(re);
    }
    let bldGroup = null, bld = null, dims = null, solids = [], floorsY = [0], stairBands = [], crowd = null;
    const avatars = new Map();
    if (def.space) {
      const bx = ox + (def.bx || 0), bz = oz + (def.bz || 0);
      bldGroup = buildSpaceGroup(def.space, { shellOnly, onAsyncTex: () => { if (!disposed) renderOnce(); } });
      bldGroup.position.set(bx, 0, bz);
      if (!shellOnly) addRoomLighting(bldGroup);
      group.add(bldGroup);
      dims = spaceDims(def.space);
      bld = { cx: bx, cz: bz, hw: dims.hw, hd: dims.hd }; // 건물 내부 판정용(지면 후보)
      floorsY = []; for (let f = 0; f < dims.floors; f++) floorsY.push(f * dims.H);
      stairBands = (def.space.shell.stairs || []).map((s) => ({
        xMin: bx + Math.min(s.x0, s.x1), xMax: bx + Math.max(s.x0, s.x1),
        z0: bz + s.z0, z1: bz + s.z1, yFrom: s.yFrom, yTo: s.yTo,
      }));
      solids = (shellOnly ? [] : computeSolids(def, bx, bz, dims))
        .concat(computeShellSolids(dims, def.space.shell.entries || [], bx, bz)); // 벽=충돌(문 구간 비움)
      if (!shellOnly && def.npc) {
        const arts = parcelArts(def, bx, bz);
        if (arts.length) crowd = new NpcCrowd(arts, def.npc.count || null, { roster: def.npc.roster });
      }
    }
    // 거리 가구 — 풀디테일 파셀만(대각 shell 임포스터는 생략). 배치·solid 동일 데이터 파생.
    let streetMeshes = null;
    if (!shellOnly && def.street && def.street.length) streetMeshes = buildStreet(def.street, group, ox, oz, solids);
    scene.add(group);
    loaded.set(k, { group, bldGroup, own, def, ox, oz, dims, bld, solids, floorsY, stairBands, crowd, avatars, streetMeshes, lod, px, pz });
  }

  function unloadParcel(k) {
    const L = loaded.get(k); if (!L) return;
    if (L.crowd) { for (const a of L.avatars.values()) { scene.remove(a.inst.group); a.inst.dispose(); } }
    scene.remove(L.group);
    if (L.bldGroup) disposeSpaceGroup(L.bldGroup);
    // 거리 가구: InstancedMesh는 인스턴스 버퍼 회수(공유 지오 SG·재질 T는 유지 → createWorld dispose에서 일괄).
    if (L.streetMeshes) for (const sm of L.streetMeshes) if (sm.dispose) sm.dispose();
    for (const g of L.own) g.dispose(); // 파셀 소유 지오(공유 재질 T는 dispose에서 일괄)
    loaded.delete(k);
  }

  // ── [복셀스] 바다(월드 전체 아래 고정 물 평면 — 월드 밖·강 파셀에서 드러남) + 월드 소프트 경계 ──
  let minPx = Infinity, maxPx = -Infinity, minPz = Infinity, maxPz = -Infinity;
  for (const d of parcels) { minPx = Math.min(minPx, d.px); maxPx = Math.max(maxPx, d.px); minPz = Math.min(minPz, d.pz); maxPz = Math.max(maxPz, d.pz); }
  if (!parcels.length) { minPx = maxPx = minPz = maxPz = 0; }
  const seaGeo = new THREE.BoxGeometry((maxPx - minPx + 40) * CELLX, 0.1, (maxPz - minPz + 40) * CELLZ);
  const sea = new THREE.Mesh(seaGeo, T.water);
  sea.position.set(((minPx + maxPx) / 2) * CELLX, -0.3, ((minPz + maxPz) / 2) * CELLZ);
  scene.add(sea);
  const wMinX = (minPx - 0.9) * CELLX, wMaxX = (maxPx + 0.9) * CELLX;
  const wMinZ = (minPz - 0.9) * CELLZ, wMaxZ = (maxPz + 0.9) * CELLZ;
  const clampWorld = (x, z) => ({ x: Math.max(wMinX, Math.min(wMaxX, x)), z: Math.max(wMinZ, Math.min(wMaxZ, z)) });

  // ── 플레이어 상태 — 첫 파셀 건물 남문 앞 길에서 시작(건물을 바라봄) ──
  const first = parcels[0] || null;
  const pos = new THREE.Vector3(0, EYE, 0);
  let yaw = 0, pitch = 0;
  let groundY = 0; // 발이 딛는 지면 y(거리 0 / 건물 층 f*H / 강 -0.4). 카메라 y = groundY + EYE.
  if (first) {
    const bx = first.px * CELLX + (first.bx || 0), bz = first.pz * CELLZ + (first.bz || 0);
    const hd = first.space ? spaceDims(first.space).hd : 0;
    pos.set(bx, EYE, bz + hd + 2.2); yaw = 0; // 남쪽 길, 북쪽 건물 정면
  }

  function applyPose() {
    // [복셀스] 태양·스카이돔 플레이어 추종 — 모든 렌더 경로(walk/renderOnce/setPosition)에서 조명 정합.
    sun.position.set(pos.x + 34, 58, pos.z + 20);
    sun.target.position.set(pos.x, 0, pos.z); sun.target.updateMatrixWorld();
    sky.position.set(pos.x, 0, pos.z);
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

  // ── [다층] 지면 해석 (player.js stairGroundAt/groundCandidatesAt/resolveGround 이식, 파셀 오프셋 인지) ──
  function stairGroundAt(x, z) {
    for (const L of loaded.values()) for (const s of L.stairBands) {
      if (x < s.xMin || x > s.xMax) continue;
      const zMin = Math.min(s.z0, s.z1), zMax = Math.max(s.z0, s.z1);
      if (z < zMin || z > zMax) continue;
      const t = Math.max(0, Math.min(1, (z - s.z0) / (s.z1 - s.z0)));
      return s.yFrom + t * (s.yTo - s.yFrom); // 경사 밴드 선형 보간
    }
    return null;
  }
  // [복셀스] 지면 후보: 거리·마당 0 / 건물 내부 층 슬래브 f*H / 강 다리 0·강물 -0.4(첨벙) / 미로드·월드 밖 -0.4(바다).
  function groundCandidatesAt(x, z) {
    const c = [];
    const sy = stairGroundAt(x, z); if (sy !== null) c.push(sy);
    const L = loaded.get(keyOf(Math.round(x / CELLX), Math.round(z / CELLZ)));
    if (!L) { c.push(-0.4); return c; }
    if (L.def.water) {
      c.push(Math.abs(z - L.oz) < 1.5 ? 0 : -0.4); // 다리 폭 3m / 그 밖은 강물
    } else if (L.bld && Math.abs(x - L.bld.cx) < L.bld.hw && Math.abs(z - L.bld.cz) < L.bld.hd) {
      for (const fy of L.floorsY) c.push(fy);      // 건물 내부: 각 층 슬래브 상면
    } else {
      c.push(0);                                    // 거리·마당
    }
    return c;
  }
  // 후보 중 현재 지면 + STEP_TOLERANCE 안 넘는 최고. 급락(추락)은 null(이동 취소).
  function resolveGround(x, z, cur) {
    const cands = groundCandidatesAt(x, z);
    let best = null;
    for (const v of cands) if (v <= cur + STEP_TOLERANCE && (best === null || v > best)) best = v;
    if (best === null) return null;
    if (cur - best > STEP_TOLERANCE) return null;
    return best;
  }

  // ── 충돌 — solid AABB(파츠 + 건물 벽 세그먼트). 개방 세계라 파셀 경계 clamp 없음. ──
  function blocked(x, z) {
    for (const L of loaded.values()) for (const b of L.solids) {
      if (b.top <= groundY + STEP_OVER) continue;   // 현재 발높이 기준 걸림턱(바닥타일 통과)
      if (b.bottom >= groundY + 1.7) continue;      // 머리 위 스택은 이동 무영향
      if (Math.abs(x - b.x) <= b.ex + RADIUS && Math.abs(z - b.z) <= b.ez + RADIUS) return true;
    }
    return false;
  }
  /** [복셀스] yaw 기준 전/우 이동 — 개방 세계: 월드 소프트 클램프 + 벽·파츠 solid 충돌(축분리 슬라이딩). */
  function walk(fwdAmt, rightAmt, dt) {
    dt = Math.min(0.05, Math.abs(dt) || 0); // 공개 API 보호: 큰 dt로 벽 터널링 방지(RAF 경로와 동일 클램프 — 검증 MINOR)
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let dx = fwdAmt * fx + rightAmt * rx, dz = fwdAmt * fz + rightAmt * rz;
    const len = Math.hypot(dx, dz);
    if (len > 1e-6) { dx /= len; dz /= len; } else return;
    dx *= SPEED * dt; dz *= SPEED * dt;
    let c = clampWorld(pos.x + dx, pos.z);
    if (!blocked(c.x, pos.z) && resolveGround(c.x, pos.z, groundY) !== null) pos.x = c.x;
    c = clampWorld(pos.x, pos.z + dz);
    if (!blocked(pos.x, c.z) && resolveGround(pos.x, c.z, groundY) !== null) pos.z = c.z;
    const g = resolveGround(pos.x, pos.z, groundY); // 지면 갱신(계단·강 첨벙, 급턱이면 유지)
    if (g !== null) groundY = g;
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
    // 카메라 y를 groundY 추종(계단·강 경사 부드럽게). 태양·스카이 추종은 applyPose 안.
    pos.y += ((groundY + EYE) - pos.y) * Math.min(1, GROUND_LERP_RATE * d);
    applyPose();
    stepNpcs(d);
    // 원격 아바타 발바닥 = groundY(다층·강 반영). 원격 간 충돌은 데모 스코프 아웃.
    if (mp) { mp.sendState({ x: pos.x, y: groundY + EYE_HEIGHT, z: pos.z, ry: yaw }); mp.update(d); }
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

  // ── 실시간 멀티플레이어(2단계) — 같은 월드 접속자끼리 아바타 상호 가시성 ──
  // 기존 multiplayer.js(PeerJS 호스트릴레이) 재사용. 단일 월드 룸(디스트릭트 샤딩은 확장 시).
  // window.Peer(vendor/peerjs) 없으면(헤드리스 등) 조용히 미배선 — 오픈월드는 1인 모드로 정상 동작.
  if (opts.mp && typeof window !== 'undefined' && window.Peer) {
    mp = new MultiplayerManager(scene, { nickname: opts.mp.nickname, color: opts.mp.color, char: opts.mp.char, roomId: PEER_ROOM_ID + '-openworld' });
    mp.onStatus = (s) => emit('mpstatus', s);
    mp.onPlayerCount = (n) => emit('players', n);
    mp.onChat = (name, text) => emit('chat', { name, text });
    mp.connect();
  }

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
    setPosition: (x, y, z) => { pos.set(x, y == null ? EYE : y, z); groundY = 0; updateStreaming(); applyPose(); }, // 순간이동=지면층 리셋(스테일 급락 판정 방지)
    getYaw: () => yaw, setYaw: (v) => { yaw = v; applyPose(); },
    getGroundY: () => groundY, // [다층] 현재 발 높이(검증·디버그용)
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
      if (mp) { mp.dispose(); mp = null; }
      for (const k of Array.from(loaded.keys())) unloadParcel(k);
      // [복셀스] 하늘·바다·공유 재질 회수
      scene.remove(sky); sky.geometry.dispose(); if (sky.material.map) sky.material.map.dispose(); sky.material.dispose();
      scene.remove(sea); seaGeo.dispose();
      for (const key3 in SG) SG[key3].dispose(); // 거리 가구 공유 지오
      for (const key2 in T) T[key2].dispose();
      if (scene.environment) { scene.environment.dispose(); scene.environment = null; }
      renderer.dispose();
    },
  };
}
