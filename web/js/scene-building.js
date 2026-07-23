import * as THREE from "three";
import { mergeGeometries } from "../utils/BufferGeometryUtils.js";
import { ROOM, BUILDING } from "./config.js";
import {
  createParquetMaps,
  createPlasterMaps,
  createConcreteMaps,
  getAOStripTexture
} from "./scene-textures.js";
const HALF = ROOM.size / 2;
const WALL_T = 0.3;
const BASEBOARD_H = 0.12;
const BASEBOARD_T = 0.02;
const MULLION_GAP = 2.5;
function splitRect(outer, holes) {
  let rects = [outer];
  for (const h of holes) {
    const next = [];
    for (const r of rects) {
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
function parquetSegmentMaterial(rect, tint) {
  const maps = createParquetMaps();
  const perM = 16 / 50;
  const w = rect.x1 - rect.x0;
  const d = rect.z1 - rect.z0;
  const map = maps.map.clone();
  const nrm = maps.normalMap.clone();
  for (const t of [map, nrm]) {
    t.needsUpdate = true;
    t.repeat.set(perM * w, perM * d);
    t.offset.set((rect.x0 - BUILDING.minX) * perM % 1, (rect.z0 - BUILDING.minZ) * perM % 1);
  }
  return new THREE.MeshStandardMaterial({
    map,
    normalMap: nrm,
    normalScale: new THREE.Vector2(0.7, 0.7),
    color: tint || 16777215,
    roughness: 0.4,
    metalness: 0
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
    color: colorTint || 16777215,
    roughness: 0.9,
    metalness: 0
  });
}
function plasterMaterial() {
  return new THREE.MeshStandardMaterial({
    map: createPlasterMaps().map,
    normalMap: createPlasterMaps().normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    color: 16777215,
    roughness: 0.92,
    metalness: 0
  });
}
const railSteelMat = () => new THREE.MeshStandardMaterial({
  color: 2499615,
  roughness: 0.4,
  metalness: 0.75
});
function buildRailing(scene, x0, z0, x1, z1, floorY) {
  const mat = railSteelMat();
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 14214376,
    transparent: true,
    opacity: 0.22,
    roughness: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = Math.atan2(x1 - x0, z1 - z0);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 10), mat);
  top.rotation.x = Math.PI / 2;
  top.position.y = 1.05;
  group.add(top);
  const nPosts = Math.max(2, Math.round(len / 1.2) + 1);
  for (let i = 0; i < nPosts; i++) {
    const t = nPosts === 1 ? 0.5 : i / (nPosts - 1);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.05, 0.045), mat);
    post.position.set(0, 0.525, -len / 2 + t * len);
    group.add(post);
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.85), glassMat);
  glass.rotation.y = Math.PI / 2;
  glass.position.y = 0.55;
  group.add(glass);
  group.rotation.y = ang;
  group.position.set(cx, floorY, cz);
  group.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  scene.add(group);
}
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
    const h = topY - s.yFrom + 0.25;
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(width, h, stepRun),
      mat
    );
    step.position.set(cx, topY - h / 2, s.z0 + (i + 0.5) * stepRun);
    step.castShadow = true;
    step.receiveShadow = true;
    scene.add(step);
  }
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
function buildCofferCeiling(scene, floorY, segments, lightsOut, theme, lightGrid, fullLights) {
  const ceilY = floorY + BUILDING.clearH;
  const beamD = 0.32;
  const beamW = 0.14;
  const gap = 1.1;
  const beamMat = concreteMaterial(2, 0.4, 13617599);
  const recessMat = new THREE.MeshStandardMaterial({
    color: 3486253,
    normalMap: createPlasterMaps().normalMap,
    normalScale: new THREE.Vector2(0.25, 0.25),
    roughness: 0.95
  });
  const canMat = new THREE.MeshStandardMaterial({ color: 1710102, roughness: 0.5, metalness: 0.6 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 16774880,
    emissive: theme.downlight.emissive,
    emissiveIntensity: 2.5 * (theme.downlight.intensity / 22),
    roughness: 1
  });
  const beamGeos = [];
  const canGeos = [];
  const bulbGeos = [];
  for (const r of segments) {
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    const recess = new THREE.Mesh(new THREE.PlaneGeometry(w, d), recessMat);
    recess.rotation.x = Math.PI / 2;
    recess.position.set((r.x0 + r.x1) / 2, ceilY + beamD, (r.z0 + r.z1) / 2);
    scene.add(recess);
    const zStart = Math.ceil((r.z0 - BUILDING.minZ) / gap);
    for (let k = zStart; ; k++) {
      const z = BUILDING.minZ + k * gap;
      if (z > r.z1 - 0.05) break;
      if (z < r.z0 + 0.05) continue;
      const g = new THREE.BoxGeometry(w, beamD, beamW);
      g.translate((r.x0 + r.x1) / 2, ceilY + beamD / 2, z);
      beamGeos.push(g);
    }
    const xStart = Math.ceil((r.x0 - BUILDING.minX) / gap);
    for (let k = xStart; ; k++) {
      const x = BUILDING.minX + k * gap;
      if (x > r.x1 - 0.05) break;
      if (x < r.x0 + 0.05) continue;
      const g = new THREE.BoxGeometry(beamW, beamD, d);
      g.translate(x, ceilY + beamD / 2, (r.z0 + r.z1) / 2);
      beamGeos.push(g);
    }
    for (let kx = xStart; ; kx++) {
      const cxCell = BUILDING.minX + kx * gap + gap / 2;
      if (cxCell > r.x1 - 0.2) break;
      if (cxCell < r.x0 + 0.2) continue;
      for (let kz = zStart; ; kz++) {
        const czCell = BUILDING.minZ + kz * gap + gap / 2;
        if (czCell > r.z1 - 0.2) break;
        if (czCell < r.z0 + 0.2) continue;
        if ((kx * 7 + kz * 5) % 3 !== 0) continue;
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
function buildSouthFacade(scene) {
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 14478578,
    transparent: true,
    opacity: 0.1,
    roughness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mullionMat = railSteelMat();
  const z = BUILDING.maxZ;
  const W = BUILDING.maxX - BUILDING.minX;
  const f1 = floorById("f1");
  const f2 = floorById("f2");
  const H1 = BUILDING.clearH;
  for (const [gx0, gx1] of [[BUILDING.minX, -1.5], [1.5, BUILDING.maxX]]) {
    const gw = gx1 - gx0;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(gw, H1), glassMat);
    pane.position.set((gx0 + gx1) / 2, f1.y + H1 / 2, z);
    pane.rotation.y = Math.PI;
    scene.add(pane);
  }
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
  const b1 = floorById("b1");
  const b1wall = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, BUILDING.storyH, BUILDING.wallT), concreteMaterial(4, 1));
  b1wall.position.set(0, b1.y + BUILDING.storyH / 2, z);
  scene.add(b1wall);
}
function createBuilding(scene, theme, fullLights) {
  const B = BUILDING;
  const W = B.maxX - B.minX;
  const D = B.maxZ - B.minZ;
  const outer = { x0: B.minX, x1: B.maxX, z0: B.minZ, z1: B.maxZ };
  const lights = [];
  let bulbMat = null;
  const roomFloors = ["b1", "f1", "f2"];
  for (const f of B.floors) {
    const holes = B.slabHoles[f.id] || [];
    const segs = splitRect(outer, holes);
    for (const r of segs) {
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(w, B.slabT, d),
        concreteMaterial(w / 6, d / 6)
      );
      slab.position.set((r.x0 + r.x1) / 2, f.y - B.slabT / 2, (r.z0 + r.z1) / 2);
      slab.castShadow = true;
      slab.receiveShadow = true;
      scene.add(slab);
      const top = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        parquetSegmentMaterial(r, f.id === "b1" ? 10127472 : f.id === "roof" ? 13482132 : 16777215)
      );
      top.rotation.x = -Math.PI / 2;
      top.position.set((r.x0 + r.x1) / 2, f.y + 2e-3, (r.z0 + r.z1) / 2);
      top.receiveShadow = true;
      scene.add(top);
    }
  }
  const lightGrids = {
    b1: [[-6, -3], [0, -3], [6, -3], [0, 3]],
    f1: [[-7, -4], [0, -4], [7, -4], [-7, 4], [0, 4], [7, 4]],
    f2: [[-7, -4.5], [0, -4.5], [7, -4.5], [-7, 5], [7, 5]]
  };
  const aboveOf = { b1: "f1", f1: "f2", f2: "roof" };
  for (const id of roomFloors) {
    const f = floorById(id);
    const holesAbove = B.slabHoles[aboveOf[id]] || [];
    const segs = splitRect(outer, holesAbove);
    const bm = buildCofferCeiling(scene, f.y, segs, lights, theme, lightGrids[id], fullLights);
    if (!bulbMat) bulbMat = bm;
  }
  const shellMat = concreteMaterial(3, 2);
  const shellH = floorById("roof").y - floorById("b1").y;
  const shellYc = floorById("b1").y + shellH / 2;
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
  for (const id of roomFloors) {
    const f = floorById(id);
    const pMat = plasterMaterial();
    const lining = [
      { w: W, h: BUILDING.clearH, x: 0, z: B.minZ + 0.02, ry: 0 },
      { w: D, h: BUILDING.clearH, x: B.maxX - 0.02, z: 0, ry: -Math.PI / 2 },
      { w: D, h: BUILDING.clearH, x: B.minX + 0.02, z: 0, ry: Math.PI / 2 }
    ];
    for (const L of lining) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), pMat);
      p.position.set(L.x, f.y + BUILDING.clearH / 2, L.z);
      p.rotation.y = L.ry;
      p.receiveShadow = true;
      scene.add(p);
    }
  }
  buildSouthFacade(scene);
  for (const s of B.stairs) buildStair(scene, s);
  const f1y = floorById("f1").y;
  const f2y = floorById("f2").y;
  const roofY = floorById("roof").y;
  buildRailing(scene, -8.7, -7, -8.7, -1, f1y);
  buildRailing(scene, -10.7, -7, -8.7, -7, f1y);
  buildRailing(scene, -8.7, 1, -8.7, 7, f2y);
  buildRailing(scene, -10.7, 1, -8.7, 1, f2y);
  buildRailing(scene, -4, -3, 5, -3, f2y);
  buildRailing(scene, -4, 3, 5, 3, f2y);
  buildRailing(scene, -4, -3, -4, 3, f2y);
  buildRailing(scene, 5, -3, 5, 3, f2y);
  buildRailing(scene, 8.7, 1, 8.7, 7, roofY);
  buildRailing(scene, 8.7, 1, 10.7, 1, roofY);
  const parapetMat = concreteMaterial(4, 0.5);
  const pH = 1.1;
  const pT = 0.25;
  const pSegs = [
    { w: W + 0.6, d: pT, x: 0, z: B.minZ - pT / 2 },
    { w: W + 0.6, d: pT, x: 0, z: B.maxZ + pT / 2 },
    { w: pT, d: D, x: B.minX - pT / 2, z: 0 },
    { w: pT, d: D, x: B.maxX + pT / 2, z: 0 }
  ];
  for (const s of pSegs) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(s.w, pH, s.d), parapetMat);
    seg.position.set(s.x, roofY + pH / 2, s.z);
    seg.castShadow = true;
    seg.receiveShadow = true;
    scene.add(seg);
  }
  const benchWood = new THREE.MeshStandardMaterial({
    map: createParquetMaps().map,
    color: 12163695,
    roughness: 0.6
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
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 5194806, roughness: 0.45, metalness: 0.65 });
  const sculpture = new THREE.Group();
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.42, 14, 28, Math.PI), bronzeMat);
  arch.castShadow = true;
  sculpture.add(arch);
  const mass = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), bronzeMat);
  mass.scale.set(1.5, 0.75, 1);
  mass.position.set(1.1, -0.95, 0.2);
  mass.castShadow = true;
  sculpture.add(mass);
  sculpture.position.set(-2, roofY + 1.35, 0.5);
  sculpture.rotation.y = -0.6;
  scene.add(sculpture);
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 1.9, 0.12, 24),
    concreteMaterial(1, 1, 14209994)
  );
  pad.position.set(-2, roofY + 0.06, 0.5);
  pad.receiveShadow = true;
  scene.add(pad);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 7.2), concreteMaterial(1, 2));
  canopy.position.set(9.7, roofY + 2.6, 4);
  canopy.castShadow = true;
  scene.add(canopy);
  for (const [px, pz] of [[8.85, 0.8], [10.55, 0.8], [8.85, 7.2], [10.55, 7.2]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), railSteelMat());
    post.position.set(px, roofY + 1.3, pz);
    scene.add(post);
  }
  let warm = null;
  if (!fullLights) {
    warm = new THREE.AmbientLight(theme.downlight.color, theme.downlight.intensity * 0.022);
    scene.add(warm);
  }
  return { downlights: { lights, warm, bulbMat } };
}
function buildContactShadows(scene) {
  const { minX, maxX, minZ, maxZ, wallT } = BUILDING;
  const W = 0.55;
  const inX0 = minX + wallT / 2;
  const inX1 = maxX - wallT / 2;
  const inZ0 = minZ + wallT / 2;
  const inZ1 = maxZ - wallT / 2;
  const mat = new THREE.MeshBasicMaterial({
    map: getAOStripTexture(),
    transparent: true,
    depthWrite: false
  });
  for (const floor of BUILDING.floors) {
    if (floor.id === "roof") continue;
    const y = floor.y + 0.018;
    const strips = [
      [inX1 - inX0, (inX0 + inX1) / 2, inZ0 + W / 2, Math.PI],
      // 북벽
      [inX1 - inX0, (inX0 + inX1) / 2, inZ1 - W / 2, 0],
      // 남벽
      [inZ1 - inZ0, inX0 + W / 2, (inZ0 + inZ1) / 2, -Math.PI / 2],
      // 서벽
      [inZ1 - inZ0, inX1 - W / 2, (inZ0 + inZ1) / 2, Math.PI / 2]
      // 동벽
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
export {
  buildContactShadows,
  createBuilding
};
