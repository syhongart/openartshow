// @ts-nocheck — 순수 이동(C-3 scene 분해), strict 타입은 후속 작업.
// scene-building.js — 다층 미술관 건축(BUILDING 청사진 소비): 슬래브·바닥마감·
//   코퍼천장·외피벽·회반죽라이닝·남측파사드·계단·난간·옥상·접촉그림자.
//   scene-textures의 파케/콘크리트/회반죽/AO 맵 소비. scene.js에서 분해(C-3 S4).
import * as THREE from 'three';
import { mergeGeometries } from '../utils/BufferGeometryUtils.js';
import { ROOM, BUILDING } from './config.js';
import {
  createParquetMaps, createPlasterMaps, createConcreteMaps, getAOStripTexture,
} from './scene-textures.js';

const HALF = ROOM.size / 2;          // 25
const WALL_T = 0.3;                  // 벽 두께
const BASEBOARD_H = 0.12;            // 걸레받이 높이
const BASEBOARD_T = 0.02;            // 걸레받이 돌출
const MULLION_GAP = 2.5;             // 유리 멀리언 간격 (m)
// ---------------------------------------------------------------------------
// 건축 요소
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 다층 미술관 건축 — BUILDING(config.js) 청사진 소비
// B1 미디어 갤러리 / 1F 메인 / 2F(중앙 보이드) / 옥상 테라스
// 코퍼 천장·계단·난간 전부 실물 지오메트리 (텍스처 페이크 금지)
// ---------------------------------------------------------------------------

// 사각형에서 구멍들을 뺀 나머지를 사각 세그먼트로 분할
function splitRect(outer, holes) {
  let rects = [outer];
  for (const h of holes) {
    const next = [];
    for (const r of rects) {
      // 교차 없음 → 그대로
      if (h.x1 <= r.x0 || h.x0 >= r.x1 || h.z1 <= r.z0 || h.z0 >= r.z1) {
        next.push(r);
        continue;
      }
      const ix0 = Math.max(r.x0, h.x0);
      const ix1 = Math.min(r.x1, h.x1);
      const iz0 = Math.max(r.z0, h.z0);
      const iz1 = Math.min(r.z1, h.z1);
      if (r.z0 < iz0) next.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: iz0 });
      if (iz1 < r.z1) next.push({ x0: r.x0, x1: r.x1, z0: iz1, z1: r.z1 });
      if (r.x0 < ix0) next.push({ x0: r.x0, x1: ix0, z0: iz0, z1: iz1 });
      if (ix1 < r.x1) next.push({ x0: ix1, x1: r.x1, z0: iz0, z1: iz1 });
    }
    rects = next;
  }
  return rects.filter((r) => r.x1 - r.x0 > 0.01 && r.z1 - r.z0 > 0.01);
}

function floorById(id) {
  return BUILDING.floors.find((f) => f.id === id);
}

// 파케 바닥 텍스처를 세그먼트에 — 전역 정렬(오프셋)로 세그먼트 경계가 이어진다
function parquetSegmentMaterial(rect, tint) {
  const maps = createParquetMaps();
  const perM = 16 / 50; // 원본 repeat 16/50m
  const w = rect.x1 - rect.x0;
  const d = rect.z1 - rect.z0;
  const map = maps.map.clone();
  const nrm = maps.normalMap.clone();
  for (const t of [map, nrm]) {
    t.needsUpdate = true;
    t.repeat.set(perM * w, perM * d);
    t.offset.set(((rect.x0 - BUILDING.minX) * perM) % 1, ((rect.z0 - BUILDING.minZ) * perM) % 1);
  }
  return new THREE.MeshStandardMaterial({
    map,
    normalMap: nrm,
    normalScale: new THREE.Vector2(0.7, 0.7),
    color: tint || 0xffffff,
    roughness: 0.4,
    metalness: 0.0,
  });
}

function concreteMaterial(repeatX, repeatY, colorTint) {
  const cm = createConcreteMaps();
  const map = cm.map.clone();
  const nrm = cm.normalMap.clone();
  for (const t of [map, nrm]) {
    t.needsUpdate = true;
    t.repeat.set(repeatX, repeatY);
  }
  return new THREE.MeshStandardMaterial({
    map,
    normalMap: nrm,
    normalScale: new THREE.Vector2(0.55, 0.55),
    color: colorTint || 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
  });
}

function plasterMaterial() {
  return new THREE.MeshStandardMaterial({
    map: createPlasterMaps().map,
    normalMap: createPlasterMaps().normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.0,
  });
}

const railSteelMat = () => new THREE.MeshStandardMaterial({
  color: 0x26241f,
  roughness: 0.4,
  metalness: 0.75,
});

// 난간: 시작→끝 (x0,z0)-(x1,z1) 직선 구간, floorY 위에 세운다
function buildRailing(scene, x0, z0, x1, z1, floorY) {
  const mat = railSteelMat();
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8e4e8,
    transparent: true,
    opacity: 0.22,
    roughness: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = Math.atan2(x1 - x0, z1 - z0); // z축 기준 yaw
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;

  const group = new THREE.Group();

  // 상부 레일
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 10), mat);
  top.rotation.x = Math.PI / 2;
  top.position.y = 1.05;
  group.add(top);

  // 포스트 (1.2m 간격)
  const nPosts = Math.max(2, Math.round(len / 1.2) + 1);
  for (let i = 0; i < nPosts; i++) {
    const t = nPosts === 1 ? 0.5 : i / (nPosts - 1);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.05, 0.045), mat);
    post.position.set(0, 0.525, -len / 2 + t * len);
    group.add(post);
  }

  // 유리 패널
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.85), glassMat);
  glass.rotation.y = Math.PI / 2;
  glass.position.y = 0.55;
  group.add(glass);

  group.rotation.y = ang;
  group.position.set(cx, floorY, cz);
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(group);
}

// 계단: 청사진 스펙대로 솔리드 스텝 + 핸드레일
function buildStair(scene, s) {
  const mat = concreteMaterial(1.2, 2.4);
  const rise = s.yTo - s.yFrom;
  const runLen = s.z1 - s.z0;
  const steps = 24;
  const stepRise = rise / steps;
  const stepRun = runLen / steps;
  const width = s.x1 - s.x0;
  const cx = (s.x0 + s.x1) / 2;

  for (let i = 0; i < steps; i++) {
    const topY = s.yFrom + (i + 1) * stepRise;
    const h = topY - s.yFrom + 0.25; // 바닥에서 이어지는 솔리드 매스
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(width, h, stepRun),
      mat
    );
    step.position.set(cx, topY - h / 2, s.z0 + (i + 0.5) * stepRun);
    step.castShadow = true;
    step.receiveShadow = true;
    scene.add(step);
  }

  // 핸드레일 (양측 경사 파이프 + 포스트)
  const railMat = railSteelMat();
  const slopeLen = Math.hypot(runLen, rise);
  const slopeAng = Math.atan2(rise, runLen);
  for (const rx of [s.x0 + 0.06, s.x1 - 0.06]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, slopeLen, 10), railMat);
    rail.rotation.x = Math.PI / 2 - slopeAng;
    rail.position.set(rx, (s.yFrom + s.yTo) / 2 + 0.95, (s.z0 + s.z1) / 2);
    rail.castShadow = true;
    scene.add(rail);

    for (const t of [0.08, 0.5, 0.92]) {
      const py = s.yFrom + rise * t;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.95, 0.045), railMat);
      post.position.set(rx, py + 0.475, s.z0 + runLen * t);
      post.castShadow = true;
      scene.add(post);
    }
  }
}

// 실물 코퍼(우물반자) 천장 — 직교 보 그리드 + 리세스 + 매입등
function buildCofferCeiling(scene, floorY, segments, lightsOut, theme, lightGrid, fullLights) {
  const ceilY = floorY + BUILDING.clearH;      // 보 밑면
  const beamD = 0.32;                          // 보 깊이
  const beamW = 0.14;
  const gap = 1.1;

  const beamMat = concreteMaterial(2, 0.4, 0xcfc9bf);
  const recessMat = new THREE.MeshStandardMaterial({
    color: 0x35322d,
    normalMap: createPlasterMaps().normalMap,
    normalScale: new THREE.Vector2(0.25, 0.25),
    roughness: 0.95,
  });
  const canMat = new THREE.MeshStandardMaterial({ color: 0x1a1816, roughness: 0.5, metalness: 0.6 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff6e0,
    emissive: theme.downlight.emissive,
    emissiveIntensity: 2.5 * (theme.downlight.intensity / 22),
    roughness: 1.0,
  });

  // 보·캔·벌브는 개별 메시 대신 지오메트리로 모아 층당 머티리얼별 1콜로 병합.
  // (드로우콜 계측: 보 247 + 캔 218 + 벌브 218 = 683콜이 씬 최대 항목이었다 —
  //  20fps iGPU 제보의 주범. 정적 지오메트리라 병합은 무손실)
  const beamGeos = [];
  const canGeos = [];
  const bulbGeos = [];
  for (const r of segments) {
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;

    // 리세스 패널 (보 위쪽)
    const recess = new THREE.Mesh(new THREE.PlaneGeometry(w, d), recessMat);
    recess.rotation.x = Math.PI / 2;
    recess.position.set((r.x0 + r.x1) / 2, ceilY + beamD, (r.z0 + r.z1) / 2);
    scene.add(recess);

    // X 방향 보 (z 그리드 위치마다) — 전역 그리드에 정렬
    const zStart = Math.ceil((r.z0 - BUILDING.minZ) / gap);
    for (let k = zStart; ; k++) {
      const z = BUILDING.minZ + k * gap;
      if (z > r.z1 - 0.05) break;
      if (z < r.z0 + 0.05) continue;
      const g = new THREE.BoxGeometry(w, beamD, beamW);
      g.translate((r.x0 + r.x1) / 2, ceilY + beamD / 2, z);
      beamGeos.push(g);
    }
    // Z 방향 보 (x 그리드)
    const xStart = Math.ceil((r.x0 - BUILDING.minX) / gap);
    for (let k = xStart; ; k++) {
      const x = BUILDING.minX + k * gap;
      if (x > r.x1 - 0.05) break;
      if (x < r.x0 + 0.05) continue;
      const g = new THREE.BoxGeometry(beamW, beamD, d);
      g.translate(x, ceilY + beamD / 2, (r.z0 + r.z1) / 2);
      beamGeos.push(g);
    }

    // 코퍼 셀 발광 픽스처 (3칸마다 하나, 메시만 — 실제 광원은 lightGrid에서)
    for (let kx = xStart; ; kx++) {
      const cxCell = BUILDING.minX + kx * gap + gap / 2;
      if (cxCell > r.x1 - 0.2) break;
      if (cxCell < r.x0 + 0.2) continue;
      for (let kz = zStart; ; kz++) {
        const czCell = BUILDING.minZ + kz * gap + gap / 2;
        if (czCell > r.z1 - 0.2) break;
        if (czCell < r.z0 + 0.2) continue;
        if (((kx * 7 + kz * 5) % 3) !== 0) continue;
        const cg = new THREE.CylinderGeometry(0.07, 0.08, 0.1, 12);
        cg.translate(cxCell, ceilY + beamD - 0.06, czCell);
        canGeos.push(cg);
        const bg = new THREE.CylinderGeometry(0.055, 0.055, 0.02, 12);
        bg.translate(cxCell, ceilY + beamD - 0.12, czCell);
        bulbGeos.push(bg);
      }
    }
  }
  if (beamGeos.length) {
    const beams = new THREE.Mesh(mergeGeometries(beamGeos), beamMat);
    beams.castShadow = true;
    scene.add(beams);
  }
  if (canGeos.length) scene.add(new THREE.Mesh(mergeGeometries(canGeos), canMat));
  if (bulbGeos.length) scene.add(new THREE.Mesh(mergeGeometries(bulbGeos), bulbMat));

  // 실제 광원 — 층당 소수만. 포인트라이트는 포워드 렌더러의 모든 픽셀 셰이딩
  // 비용에 곱해지므로 정상 GPU(fullLights)에서만 켠다. 소프트웨어 렌더링/저사양
  // 에서는 생략하고 집계부의 웜 앰비언트 1개가 실내 보강을 대신한다 (3fps 진단:
  // 폰 60fps/PC 3fps는 씬이 아니라 그 PC의 GPU 가속 문제 — 전원 화질 저하는 부당).
  if (fullLights) {
    for (const [lx, lz] of lightGrid) {
      const light = new THREE.PointLight(theme.downlight.color, theme.downlight.intensity * 0.7, 9, 2);
      light.position.set(lx, ceilY - 0.15, lz);
      scene.add(light);
      lightsOut.push(light);
    }
  }

  return bulbMat;
}

// 남측 파사드 — 1F 커튼월(중앙 입구), 2F 리본 윈도우
function buildSouthFacade(scene) {
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xdcecf2,
    transparent: true,
    opacity: 0.1,
    roughness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mullionMat = railSteelMat();
  const z = BUILDING.maxZ;
  const W = BUILDING.maxX - BUILDING.minX;
  const f1 = floorById('f1');
  const f2 = floorById('f2');

  // ---- 1F 커튼월 (중앙 3m는 입구 개구부 — 유리 없음) ----
  const H1 = BUILDING.clearH;
  for (const [gx0, gx1] of [[BUILDING.minX, -1.5], [1.5, BUILDING.maxX]]) {
    const gw = gx1 - gx0;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(gw, H1), glassMat);
    pane.position.set((gx0 + gx1) / 2, f1.y + H1 / 2, z);
    pane.rotation.y = Math.PI;
    scene.add(pane);
  }
  // 멀리언 (2.2m 간격) + 입구 프레임
  for (let x = BUILDING.minX; x <= BUILDING.maxX + 0.01; x += 2.2) {
    if (x > -1.5 && x < 1.5) continue;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, H1, 0.12), mullionMat);
    post.position.set(x, f1.y + H1 / 2, z);
    post.castShadow = true;
    scene.add(post);
  }
  for (const x of [-1.5, 1.5]) {
    const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.18, H1, 0.18), mullionMat);
    jamb.position.set(x, f1.y + H1 / 2, z);
    jamb.castShadow = true;
    scene.add(jamb);
  }
  const header = new THREE.Mesh(new THREE.BoxGeometry(W, 0.14, 0.16), mullionMat);
  header.position.set(0, f1.y + H1 - 0.07, z);
  scene.add(header);

  // ---- 2F: 리본 윈도우 (y+1.2 ~ y+2.6), 위아래는 회반죽 밴드 ----
  const pMat = plasterMaterial();
  const below = new THREE.Mesh(new THREE.BoxGeometry(W, 1.2, BUILDING.wallT), pMat);
  below.position.set(0, f2.y + 0.6, z);
  below.castShadow = true;
  below.receiveShadow = true;
  scene.add(below);
  const above = new THREE.Mesh(new THREE.BoxGeometry(W, BUILDING.clearH - 2.6 + 0.6, BUILDING.wallT), pMat);
  above.position.set(0, f2.y + 2.6 + (BUILDING.clearH - 2.6 + 0.6) / 2, z);
  above.castShadow = true;
  above.receiveShadow = true;
  scene.add(above);
  const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(W, 1.4), glassMat);
  ribbon.position.set(0, f2.y + 1.9, z);
  ribbon.rotation.y = Math.PI;
  scene.add(ribbon);
  for (let x = BUILDING.minX; x <= BUILDING.maxX + 0.01; x += 2.2) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.08), mullionMat);
    post.position.set(x, f2.y + 1.9, z);
    scene.add(post);
  }

  // ---- B1 남측: 지하 솔리드 ----
  const b1 = floorById('b1');
  const b1wall = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, BUILDING.storyH, BUILDING.wallT), concreteMaterial(4, 1));
  b1wall.position.set(0, b1.y + BUILDING.storyH / 2, z);
  scene.add(b1wall);
}

export function createBuilding(scene, theme, fullLights) {
  const B = BUILDING;
  const W = B.maxX - B.minX;
  const D = B.maxZ - B.minZ;
  const outer = { x0: B.minX, x1: B.maxX, z0: B.minZ, z1: B.maxZ };
  const lights = [];
  let bulbMat = null;

  // ---- 층별 슬래브 + 바닥 마감 + 코퍼 천장 ----
  const roomFloors = ['b1', 'f1', 'f2'];
  for (const f of B.floors) {
    const holes = B.slabHoles[f.id] || [];
    const segs = splitRect(outer, holes);

    for (const r of segs) {
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      // 슬래브 (콘크리트 매스)
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(w, B.slabT, d),
        concreteMaterial(w / 6, d / 6)
      );
      slab.position.set((r.x0 + r.x1) / 2, f.y - B.slabT / 2, (r.z0 + r.z1) / 2);
      slab.castShadow = true;
      slab.receiveShadow = true;
      scene.add(slab);

      // 바닥 마감 — 실내는 파케(B1은 어두운 틴트), 옥상은 우드 데크
      const top = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        parquetSegmentMaterial(r, f.id === 'b1' ? 0x9a8870 : (f.id === 'roof' ? 0xcdb894 : 0xffffff))
      );
      top.rotation.x = -Math.PI / 2;
      top.position.set((r.x0 + r.x1) / 2, f.y + 0.002, (r.z0 + r.z1) / 2);
      top.receiveShadow = true;
      scene.add(top);
    }
  }

  // ---- 코퍼 천장 (각 실내층: 천장 = 위층 슬래브 밑) ----
  const lightGrids = {
    b1: [[-6, -3], [0, -3], [6, -3], [0, 3]],
    f1: [[-7, -4], [0, -4], [7, -4], [-7, 4], [0, 4], [7, 4]],
    f2: [[-7, -4.5], [0, -4.5], [7, -4.5], [-7, 5], [7, 5]],
  };
  const aboveOf = { b1: 'f1', f1: 'f2', f2: 'roof' };
  for (const id of roomFloors) {
    const f = floorById(id);
    const holesAbove = B.slabHoles[aboveOf[id]] || [];
    const segs = splitRect(outer, holesAbove);
    const bm = buildCofferCeiling(scene, f.y, segs, lights, theme, lightGrids[id], fullLights);
    if (!bulbMat) bulbMat = bm;
  }

  // ---- 외피 벽 (북/동/서 — 지하부터 옥상 파라펫 하단까지) ----
  const shellMat = concreteMaterial(3, 2);
  const shellH = floorById('roof').y - floorById('b1').y; // 12.6
  const shellYc = floorById('b1').y + shellH / 2;
  const north = new THREE.Mesh(new THREE.BoxGeometry(W + B.wallT * 2, shellH, B.wallT), shellMat);
  north.position.set(0, shellYc, B.minZ - B.wallT / 2);
  north.castShadow = true;
  north.receiveShadow = true;
  scene.add(north);
  for (const [x, sx] of [[B.minX - B.wallT / 2, 1], [B.maxX + B.wallT / 2, 1]]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(B.wallT, shellH, D), shellMat);
    side.position.set(x, shellYc, 0);
    side.castShadow = true;
    side.receiveShadow = true;
    scene.add(side);
  }

  // ---- 실내 회반죽 라이닝 (층별 북/동/서) ----
  for (const id of roomFloors) {
    const f = floorById(id);
    const pMat = plasterMaterial();
    const lining = [
      { w: W, h: BUILDING.clearH, x: 0, z: B.minZ + 0.02, ry: 0 },
      { w: D, h: BUILDING.clearH, x: B.maxX - 0.02, z: 0, ry: -Math.PI / 2 },
      { w: D, h: BUILDING.clearH, x: B.minX + 0.02, z: 0, ry: Math.PI / 2 },
    ];
    for (const L of lining) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), pMat);
      p.position.set(L.x, f.y + BUILDING.clearH / 2, L.z);
      p.rotation.y = L.ry;
      p.receiveShadow = true;
      scene.add(p);
    }
  }

  // ---- 남측 파사드 ----
  buildSouthFacade(scene);

  // ---- 계단 ----
  for (const s of B.stairs) buildStair(scene, s);

  // ---- 난간 (개구부/보이드 가장자리 — 계단 진입변은 개방) ----
  const f1y = floorById('f1').y;
  const f2y = floorById('f2').y;
  const roofY = floorById('roof').y;
  // 1F: B1 계단 개구부 (동변 + 북변; 남변은 계단 도착 지점이라 개방)
  buildRailing(scene, -8.7, -7, -8.7, -1, f1y);
  buildRailing(scene, -10.7, -7, -8.7, -7, f1y);
  // 2F: 1F→2F 계단 개구부 (동변 + 남변; 북변 도착 개방)
  buildRailing(scene, -8.7, 1, -8.7, 7, f2y);
  buildRailing(scene, -10.7, 1, -8.7, 1, f2y);
  // 2F: 중앙 보이드 4변
  buildRailing(scene, -4, -3, 5, -3, f2y);
  buildRailing(scene, -4, 3, 5, 3, f2y);
  buildRailing(scene, -4, -3, -4, 3, f2y);
  buildRailing(scene, 5, -3, 5, 3, f2y);
  // 옥상: 2F→옥상 계단 개구부 (서변 + 남변; 북변 도착 개방)
  buildRailing(scene, 8.7, 1, 8.7, 7, roofY);
  buildRailing(scene, 8.7, 1, 10.7, 1, roofY);

  // ---- 옥상: 파라펫 + 벤치 + 조각 + 계단 캐노피 ----
  const parapetMat = concreteMaterial(4, 0.5);
  const pH = 1.1;
  const pT = 0.25;
  const pSegs = [
    { w: W + 0.6, d: pT, x: 0, z: B.minZ - pT / 2 },
    { w: W + 0.6, d: pT, x: 0, z: B.maxZ + pT / 2 },
    { w: pT, d: D, x: B.minX - pT / 2, z: 0 },
    { w: pT, d: D, x: B.maxX + pT / 2, z: 0 },
  ];
  for (const s of pSegs) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(s.w, pH, s.d), parapetMat);
    seg.position.set(s.x, roofY + pH / 2, s.z);
    seg.castShadow = true;
    seg.receiveShadow = true;
    scene.add(seg);
  }

  // 벤치 2
  const benchWood = new THREE.MeshStandardMaterial({
    map: createParquetMaps().map,
    color: 0xb99a6f,
    roughness: 0.6,
  });
  for (const [bx, bz] of [[-4, 4], [2, -4]]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.09, 0.55), benchWood);
    seat.position.set(bx, roofY + 0.45, bz);
    seat.castShadow = true;
    scene.add(seat);
    for (const lx of [-0.9, 0.9]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.5), railSteelMat());
      leg.position.set(bx + lx, roofY + 0.21, bz);
      scene.add(leg);
    }
  }

  // 브론즈 조각 (정원에서 옥상으로 이전)
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x4f4436, roughness: 0.45, metalness: 0.65 });
  const sculpture = new THREE.Group();
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.42, 14, 28, Math.PI), bronzeMat);
  arch.castShadow = true;
  sculpture.add(arch);
  const mass = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), bronzeMat);
  mass.scale.set(1.5, 0.75, 1.0);
  mass.position.set(1.1, -0.95, 0.2);
  mass.castShadow = true;
  sculpture.add(mass);
  sculpture.position.set(-2, roofY + 1.35, 0.5);
  sculpture.rotation.y = -0.6;
  scene.add(sculpture);
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, 0.12, 24),
    concreteMaterial(1, 1, 0xd8d3ca)
  );
  pad.position.set(-2, roofY + 0.06, 0.5);
  pad.receiveShadow = true;
  scene.add(pad);

  // 계단 캐노피 (옥상 계단 개구부 위 소지붕)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 7.2), concreteMaterial(1, 2));
  canopy.position.set(9.7, roofY + 2.6, 4);
  canopy.castShadow = true;
  scene.add(canopy);
  for (const [px, pz] of [[8.85, 0.8], [10.55, 0.8], [8.85, 7.2], [10.55, 7.2]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), railSteelMat());
    post.position.set(px, roofY + 1.3, pz);
    scene.add(post);
  }

  // 다운라이트 대체 웜 앰비언트 — 린 모드(fullLights=false)에서 포인트 15개의
  // 실내 보강을 광원 1개로. 계수 0.022는 스크린샷 대조로 맞춘 값.
  let warm = null;
  if (!fullLights) {
    warm = new THREE.AmbientLight(theme.downlight.color, theme.downlight.intensity * 0.022);
    scene.add(warm);
  }

  return { downlights: { lights, warm, bulbMat } };
}
export function buildContactShadows(scene) {
  const { minX, maxX, minZ, maxZ, wallT } = BUILDING;
  const W = 0.55; // 스트립 폭(실내 방향)
  const inX0 = minX + wallT / 2;
  const inX1 = maxX - wallT / 2;
  const inZ0 = minZ + wallT / 2;
  const inZ1 = maxZ - wallT / 2;
  const mat = new THREE.MeshBasicMaterial({
    map: getAOStripTexture(),
    transparent: true,
    depthWrite: false,
  });
  // 실내 층만 (옥상은 개방형이라 제외)
  for (const floor of BUILDING.floors) {
    if (floor.id === 'roof') continue;
    const y = floor.y + 0.018;
    // [길이, 중심x, 중심z, y회전] — 그라디언트 진한 쪽이 벽에 닿게 회전
    const strips = [
      [inX1 - inX0, (inX0 + inX1) / 2, inZ0 + W / 2, Math.PI],       // 북벽
      [inX1 - inX0, (inX0 + inX1) / 2, inZ1 - W / 2, 0],             // 남벽
      [inZ1 - inZ0, inX0 + W / 2, (inZ0 + inZ1) / 2, -Math.PI / 2],  // 서벽
      [inZ1 - inZ0, inX1 - W / 2, (inZ0 + inZ1) / 2, Math.PI / 2],   // 동벽
    ];
    for (const [len, cx, cz, ry] of strips) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, W), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = ry;
      mesh.position.set(cx, y, cz);
      mesh.renderOrder = 1;
      scene.add(mesh);
    }
  }
}
