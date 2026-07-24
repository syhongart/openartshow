import * as THREE from "three";
import { mergeGeometries } from "../utils/BufferGeometryUtils.js";
import { FOOTPRINT, STORY_H, PART_TYPES, TINT_PALETTES } from "./space.js";
import {
  bakeUVRepeat,
  floorMatTex,
  finishMat,
  wallMat,
  featureMat,
  shellFlatMat,
  partY,
  MATS,
  FRAME_MAT_ID,
  artworkCanvasDims,
  box,
  partGeo,
  artworkSize,
  artworkImageMaterial,
  matteMarginFor,
  partMat,
  UNIQUE_TEX_TYPES,
  partAccent
} from "./space-parts.js";
function spaceDims(space) {
  const [fw, fd] = FOOTPRINT[space.shell.footprint];
  const H = STORY_H[space.shell.storyH];
  const floors = Math.max(1, Math.min(4, space.shell.floors | 0 || 1));
  return { fw, fd, hw: fw / 2, hd: fd / 2, H, t: space.shell.wallT, floors, totalH: floors * H };
}
function buildStairRamp(track, s) {
  const w = Math.abs(s.x1 - s.x0);
  const run = Math.hypot(s.z1 - s.z0, s.yTo - s.yFrom);
  const geo = new THREE.BoxGeometry(w, 0.18, run);
  const mat = new THREE.MeshStandardMaterial({ color: 10131086, roughness: 0.92, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set((s.x0 + s.x1) / 2, (s.yFrom + s.yTo) / 2, (s.z0 + s.z1) / 2);
  mesh.rotation.x = Math.atan2(s.yTo - s.yFrom, s.z1 - s.z0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  track(mesh);
  return mesh;
}
const TINT_TYPES = /* @__PURE__ */ new Set(["rug", "drape"]);
const TINT_DEFAULT = { rug: TINT_PALETTES.rug[0], drape: TINT_PALETTES.drape[0] };
const RUG_ACCENT_DEFAULT = "#d6ccb7";
const tintColor = (p) => new THREE.Color(p.color || TINT_DEFAULT[p.t] || "#ffffff");
const rugAccentColor = (p) => p.color ? tintColor(p).lerp(new THREE.Color(16777215), 0.35) : new THREE.Color(RUG_ACCENT_DEFAULT);
const DOOR_W = 2.6;
// [오픈월드 청크] 파츠 생성을 프레임 분산하기 위한 내부 제너레이터. 본문은 종전 buildSpaceGroup과
// 문장 순서·부작용 100% 동일 — 셸 완성 직후 `yield g`(청크0), 파츠 그룹 경계마다 예산-가드 yield만 가산.
// 드레인(budget=Infinity)이면 가드가 발화하지 않아 직선 실행 = 종전과 바이트동일(미술관/빌더/방문 무회귀).
function* _spaceGroupGen(space, opts = {}) {
  const g = new THREE.Group();
  const geos = [], mats = [];
  const track = (o) => {
    if (o.material && o.material.userData && o.material.userData.uvRepeat && o.geometry) {
      const [rx, ry] = o.material.userData.uvRepeat;
      bakeUVRepeat(o.geometry, rx, ry);
    }
    if (o.geometry) geos.push(o.geometry);
    if (o.material) mats.push(o.material);
    return o;
  };
  const { fw, fd, hw, hd, H, t, floors, totalH } = spaceDims(space);
  const shellSurf = [];
  // [오픈월드 LOD] flatShell: shellOnly 원경 파셀의 셸 표면을 단색 임포스터로 후처리(fill-rate·draw call 절감).
  // shellOnly와 함께일 때만 활성 — flat=false면 아래 flatSegs.push가 전부 스킵되어 씬그래프·바이트 100% 현행 동일
  // (라이브 3면 main/visit/builder는 flatShell을 넘기지 않으므로 무영향 — noSpots 순수 가산 전례와 동형).
  const flat = !!(opts.flatShell && opts.shellOnly);
  const flatSegs = [];
  const UP_Y = () => new THREE.Vector3(0, 1, 0);
  let floorM = null;
  for (let f = 0; f < floors; f++) {
    const sm = track(new THREE.Mesh(new THREE.BoxGeometry(fw, 0.1, fd), floorMatTex(space.shell.finish.floor, fw, fd)));
    sm.position.set(0, f * H - 0.05, 0);
    sm.receiveShadow = true;
    g.add(sm);
    if (flat) flatSegs.push({ mesh: sm, kind: "floor", id: space.shell.finish.floor });
    shellSurf.push({ mesh: sm, center: new THREE.Vector3(0, f * H + 1e-3, 0), normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1), width: fw, height: fd });
    if (f === 0) floorM = sm;
  }
  if (!opts.hideCeiling) {
    const ceilM = track(new THREE.Mesh(new THREE.BoxGeometry(fw, 0.1, fd), finishMat("ceiling", space.shell.finish.ceiling)));
    ceilM.position.set(0, totalH, 0);
    g.add(ceilM);
    if (flat) flatSegs.push({ mesh: ceilM, kind: "ceiling", id: space.shell.finish.ceiling });
    shellSurf.push({ mesh: ceilM, center: new THREE.Vector3(0, totalH - 0.051, 0), normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1), width: fw, height: fd });
  }
  const WALL_DIRS = ["north", "south", "west", "east"];
  const DOOR_H = 2.4;
  const wallFin = space.shell.finish.wall;
  for (let f = 0; f < floors; f++) {
    const baseY = f * H;
    const openSet = f === 0 ? new Set(space.shell.entries || []) : /* @__PURE__ */ new Set();
    [[0, -hd, fw + t, t], [0, hd, fw + t, t], [-hw, 0, t, fd - t], [hw, 0, t, fd - t]].forEach(([x, z, ww, dd], wi) => {
      const wallW = Math.max(ww, dd);
      const inN = new THREE.Vector3(-x, 0, -z).normalize();
      const horiz = ww >= dd;
      const len = horiz ? ww : dd, thick = horiz ? dd : ww;
      if (openSet.has(WALL_DIRS[wi]) && len > DOOR_W + 0.8) {
        const side = (len - DOOR_W) / 2, lintelH = Math.max(1e-3, H - DOOR_H), off = DOOR_W / 2 + side / 2;
        for (const s of [-1, 1]) {
          const sw = horiz ? side : thick, sd = horiz ? thick : side;
          const sx = x + (horiz ? s * off : 0), sz = z + (horiz ? 0 : s * off);
          const seg = track(new THREE.Mesh(new THREE.BoxGeometry(sw, H, sd), wallMat(wallFin, side, H)));
          seg.position.set(sx, baseY + H / 2, sz);
          seg.receiveShadow = true;
          g.add(seg);
          if (flat) flatSegs.push({ mesh: seg, kind: "wall", id: wallFin });
          shellSurf.push({ mesh: seg, center: new THREE.Vector3(sx + inN.x * (t / 2), baseY + H / 2, sz + inN.z * (t / 2)), normal: inN, up: UP_Y(), width: side, height: H });
        }
        const lw = horiz ? DOOR_W : thick, ld = horiz ? thick : DOOR_W;
        const lintel = track(new THREE.Mesh(new THREE.BoxGeometry(lw, lintelH, ld), wallMat(wallFin, DOOR_W, lintelH)));
        lintel.position.set(x, baseY + DOOR_H + lintelH / 2, z);
        lintel.receiveShadow = true;
        g.add(lintel);
        if (flat) flatSegs.push({ mesh: lintel, kind: "wall", id: wallFin });
      } else {
        const m = track(new THREE.Mesh(new THREE.BoxGeometry(ww, H, dd), wallMat(wallFin, wallW, H)));
        m.position.set(x, baseY + H / 2, z);
        m.receiveShadow = true;
        g.add(m);
        if (flat) flatSegs.push({ mesh: m, kind: "wall", id: wallFin });
        shellSurf.push({ mesh: m, center: new THREE.Vector3(x + inN.x * (t / 2), baseY + H / 2, z + inN.z * (t / 2)), normal: inN, up: UP_Y(), width: wallW, height: H });
      }
    });
  }
  const fwSide = space.shell.finish.featureWall;
  if (fwSide && fwSide !== "none") {
    const fwW = fwSide === "east" || fwSide === "west" ? fd - 0.2 : fw - 0.2;
    const fwl = track(new THREE.Mesh(new THREE.BoxGeometry(fw - 0.2, H - 0.2, 0.02), featureMat(space.shell.finish.featureFinish, fwW, H - 0.2)));
    const map = { north: [0, -hd + t / 2 + 0.02, 0], south: [0, hd - t / 2 - 0.02, 0], east: [hw - t / 2 - 0.02, 0, Math.PI / 2], west: [-hw + t / 2 + 0.02, 0, Math.PI / 2] };
    const [px, pz, ry] = map[fwSide] || map.north;
    fwl.position.set(px, H / 2, pz);
    if (ry) fwl.rotation.y = ry;
    g.add(fwl);
    if (flat) flatSegs.push({ mesh: fwl, kind: "feature", id: space.shell.finish.featureFinish });
    const fwN = { north: [0, 0, 1], south: [0, 0, -1], east: [-1, 0, 0], west: [1, 0, 0] }[fwSide] || [0, 0, 1];
    shellSurf.push({ mesh: fwl, center: new THREE.Vector3(px + fwN[0] * 0.02, H / 2, pz + fwN[2] * 0.02), normal: new THREE.Vector3(fwN[0], fwN[1], fwN[2]), up: UP_Y(), width: fwW, height: H - 0.2 });
  }
  for (const s of space.shell.stairs || []) g.add(buildStairRamp(track, s));
  // [청크] partRefs를 셸 시점에 빈 배열로 만들어 userData에 참조로 넣고, 파츠 루프가 이 배열에 push한다.
  // 종전에도 userData.partRefs는 파츠 루프가 채우던 배열 — 참조 시점만 셸로 당겨 청크0에서 dims/partRefs 노출.
  const partRefs = [];
  g.userData = { dims: { fw, fd, hw, hd, H, t, floors, totalH }, partRefs, geos, mats, floor: floorM, shell: shellSurf };
  const budget0 = (yield g); // 셸 완성(청크0). 재개 시 step()의 chunkParts를 첫 예산으로 수령(드레인=Infinity면 가드 미발화).
  const byKey = {};
  (opts.shellOnly ? [] : space.parts).forEach((p, i) => {
    const key = `${p.t}:${p.variant || ""}:${p.mat || ""}`;
    (byKey[key] = byKey[key] || { type: p.t, variant: p.variant, mat: p.mat, list: [] }).list.push({ p, i });
  });
  const pY = (p, type) => p.y != null ? p.y : partY(type, H) + (p.floor || 0) * H;
  let chunkAcc = 0, budget = budget0 ?? Infinity; // 그룹 경계 예산 가드(파츠 루프 내부 const acc와 이름 분리). budget0=Infinity(드레인) → 전량 직선 실행.
  for (const grp of Object.values(byKey)) {
    const { type, variant, mat, list } = grp;
    if (type === "artwork") {
      const D = PART_TYPES.artwork.size[2];
      const ART_OFF_Z = 0.03;
      const canvasPos = (p, cz) => new THREE.Vector3(p.x + Math.sin(p.ry) * cz, pY(p, "artwork"), p.z + Math.cos(p.ry) * cz);
      const addFrameMesh = (geo2, mat2, p, i) => {
        const fm = new THREE.Mesh(geo2, mat2);
        fm.position.set(p.x, pY(p, "artwork"), p.z);
        fm.rotation.y = p.ry;
        fm.castShadow = true;
        fm.receiveShadow = true;
        if (opts.pickable) fm.userData.partIndex = i;
        g.add(fm);
        partRefs.push({ part: p, index: i, object: fm });
        return fm;
      };
      const byStyle = { minimal: [], classic: [], frameless: [] };
      for (const it of list) (byStyle[it.p.frame] || byStyle.minimal).push(it);
      for (const style of ["minimal", "classic", "frameless"]) {
        const items = byStyle[style];
        if (!items.length) continue;
        const frameMat = (MATS[FRAME_MAT_ID[style]] || MATS.frameBlack)();
        mats.push(frameMat);
        const withSrc = items.filter(({ p }) => p.src);
        const noSrc = items.filter(({ p }) => !p.src);
        if (noSrc.length) {
          const [dw, dh] = PART_TYPES.artwork.size;
          const frameGeo = partGeo("artwork", { style, w: dw, h: dh, d: D });
          geos.push(frameGeo);
          const { cw, ch } = artworkCanvasDims(style, dw, dh);
          const canvasGeo = box(cw, ch, 0.015);
          geos.push(canvasGeo);
          const paperMat = MATS.paper();
          mats.push(paperMat);
          for (const { p, i } of noSrc) {
            addFrameMesh(frameGeo, frameMat, p, i);
            const cm = new THREE.Mesh(canvasGeo, paperMat);
            cm.position.copy(canvasPos(p, ART_OFF_Z));
            cm.rotation.y = p.ry;
            cm.castShadow = true;
            g.add(cm);
          }
        }
        for (const { p, i } of withSrc) {
          const { W, H: H2 } = artworkSize(p.ar);
          const frameGeo = partGeo("artwork", { style, w: W, h: H2, d: D });
          geos.push(frameGeo);
          addFrameMesh(frameGeo, frameMat, p, i);
          const { cw, ch } = artworkCanvasDims(style, W, H2);
          const canvasGeo = box(cw, ch, 0.015);
          geos.push(canvasGeo);
          const cMat = artworkImageMaterial(p.src, cw, ch, opts.onAsyncTex, matteMarginFor(style, W, H2));
          mats.push(cMat);
          const cm = new THREE.Mesh(canvasGeo, cMat);
          cm.position.copy(canvasPos(p, ART_OFF_Z));
          cm.rotation.y = p.ry;
          cm.castShadow = true;
          g.add(cm);
        }
      }
      continue;
    }
    const geo = partGeo(type, { variant, mat }), material = partMat(type, { mat });
    geos.push(geo);
    mats.push(material);
    const isTint = TINT_TYPES.has(type);
    const canInstance = !UNIQUE_TEX_TYPES.has(type) && list.length > 1 && !opts.pickable;
    if (canInstance) {
      const im = new THREE.InstancedMesh(geo, material, list.length);
      im.castShadow = true;
      im.receiveShadow = true;
      list.forEach(({ p }, k) => {
        const m4 = new THREE.Matrix4().compose(new THREE.Vector3(p.x, pY(p, type), p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.ry, 0)), new THREE.Vector3(1, 1, 1));
        im.setMatrixAt(k, m4);
        if (isTint) im.setColorAt(k, tintColor(p));
      });
      if (isTint && im.instanceColor) im.instanceColor.needsUpdate = true;
      im.instanceMatrix.needsUpdate = true;
      g.add(im);
    } else {
      for (const { p, i } of list) {
        const useMat = isTint ? material.clone() : material;
        if (isTint) {
          useMat.color.copy(tintColor(p));
          mats.push(useMat);
        }
        const mm = new THREE.Mesh(geo, useMat);
        mm.position.set(p.x, pY(p, type), p.z);
        mm.rotation.y = p.ry;
        mm.castShadow = true;
        mm.receiveShadow = true;
        if (opts.pickable) mm.userData.partIndex = i;
        g.add(mm);
        partRefs.push({ part: p, index: i, object: mm });
      }
    }
    const acc = partAccent(type, { variant, mat });
    if (acc) {
      geos.push(acc.geo);
      const place = (p) => {
        const [ox, oy, oz] = acc.off;
        return { pos: new THREE.Vector3(p.x + Math.cos(p.ry) * ox + Math.sin(p.ry) * oz, pY(p, type) + oy, p.z - Math.sin(p.ry) * ox + Math.cos(p.ry) * oz), ry: p.ry };
      };
      const accMat = (MATS[acc.mat] || MATS.paper)();
      mats.push(accMat);
      const accTint = acc.tint === "rugAccent";
      if (list.length > 1) {
        const aim = new THREE.InstancedMesh(acc.geo, accMat, list.length);
        aim.castShadow = true;
        list.forEach(({ p }, k) => {
          const pl = place(p);
          aim.setMatrixAt(k, new THREE.Matrix4().compose(pl.pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pl.ry, 0)), new THREE.Vector3(1, 1, 1)));
          if (accTint) aim.setColorAt(k, rugAccentColor(p));
        });
        if (accTint && aim.instanceColor) aim.instanceColor.needsUpdate = true;
        aim.instanceMatrix.needsUpdate = true;
        g.add(aim);
      } else {
        if (accTint) accMat.color.copy(rugAccentColor(list[0].p));
        const pl = place(list[0].p);
        const am = new THREE.Mesh(acc.geo, accMat);
        am.position.copy(pl.pos);
        am.rotation.y = pl.ry;
        am.castShadow = true;
        g.add(am);
      }
    }
    chunkAcc += grp.list.length; // [청크] 파츠 개수 누계 — 예산 도달 시 그룹 경계에서 프레임 양보.
    if (chunkAcc >= budget) { budget = (yield) ?? Infinity; chunkAcc = 0; }
  }
  if (flat && flatSegs.length) {
    // [오픈월드 LOD] 셸 세그먼트를 계열(kind:id)별로 병합 → 파셀당 draw call 60→소수, 단색 공유재질로 텍스처 페치 0.
    // 원본 텍스처 mesh는 씬에서만 remove(원본 지오/재질은 geos/mats에 남아 unload 시 정상 dispose — 회귀 없는 회수 경로).
    const buckets = /* @__PURE__ */ new Map();
    for (const seg of flatSegs) {
      const key = seg.kind + ":" + seg.id;
      let b = buckets.get(key);
      if (!b) buckets.set(key, b = { kind: seg.kind, id: seg.id, geos: [] });
      seg.mesh.updateMatrix();
      b.geos.push(seg.mesh.geometry.clone().applyMatrix4(seg.mesh.matrix));
      g.remove(seg.mesh);
    }
    for (const b of buckets.values()) {
      const merged = mergeGeometries(b.geos, false);
      b.geos.forEach((x) => x.dispose()); // 병합용 clone 회수(merged는 독립 복사본)
      if (!merged) continue;
      geos.push(merged); // 병합 지오는 파셀 소유(unload dispose 대상)
      const fm = new THREE.Mesh(merged, shellFlatMat(b.kind, b.id)); // 공유 단색재질(userData.shared → dispose 스킵, mats에 안 넣음)
      fm.receiveShadow = true;
      g.add(fm);
    }
  }
}
// 기존 시그니처 보존 — 전량 드레인(budget=Infinity → yield 가드 미발화 → 직선 실행 = 종전 바이트동일).
function buildSpaceGroup(space, opts = {}) {
  const gen = _spaceGroupGen(space, opts);
  const g = gen.next().value;         // 셸
  while (!gen.next(Infinity).done) {} // 파츠 전량(가드 미발화)
  return g;
}
// 순수가산 신규 export — 오픈월드 전용 청크 빌더. group은 셸만(파츠 0) 즉시, step(chunkParts)으로 파츠 프레임 분산.
function buildSpaceGroupChunked(space, opts = {}) {
  const gen = _spaceGroupGen(space, opts);
  const group = gen.next().value;     // 셸 즉시(파츠 0)
  let done = false;
  return { group, step(chunkParts) { if (done) return true; done = !!gen.next(chunkParts).done; return done; }, get done() { return done; } };
}
let _aoTex = null;
function aoTexture() {
  if (_aoTex) return _aoTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 60);
  g.addColorStop(0, "rgba(0,0,0,0.62)");
  g.addColorStop(0.55, "rgba(0,0,0,0.30)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  _aoTex = new THREE.CanvasTexture(c);
  _aoTex.colorSpace = THREE.SRGBColorSpace;
  return _aoTex;
}
const AO_GROUNDED = { pedestal: 1.2, pillar: 1.5, bench: 2, planter: 1.3, vitrine: 1.4, labelStand: 1, stair: 1.6, wreath: 1.1, cake: 1, banner: 1.1, bigplant: 1.3, palm: 1.2, succulent: 0.5, vase: 0.5, floorlamp: 1, stanchion: 1.6, mirror: 1.1, sign: 1.1, railing: 1.3, lounge: 1.9, reception: 2, glasspanel: 1.3, stool: 0.55 };
const ART_SPOT_CAP = 10;
function addRoomLighting(group, opts = {}) {
  const u = group.userData || {};
  const dims = u.dims;
  if (!dims) return;
  const { H, hw, hd } = dims;
  const geos = u.geos || (u.geos = []);
  const mats = u.mats || (u.mats = []);
  const refs = u.partRefs || [];
  const aoMat = new THREE.MeshBasicMaterial({ map: aoTexture().clone(), transparent: true, depthWrite: false });
  aoMat.map.needsUpdate = true;
  mats.push(aoMat);
  refs.forEach(({ part, object }) => {
    const s = AO_GROUNDED[part.t];
    if (!s) return;
    const geo = new THREE.PlaneGeometry(s, s);
    geos.push(geo);
    const pl = new THREE.Mesh(geo, aoMat);
    pl.rotation.x = -Math.PI / 2;
    const baseY = object.position.y - PART_TYPES[part.t].size[1] / 2 + 0.015;
    pl.position.set(object.position.x, Math.max(0.015, baseY), object.position.z);
    group.add(pl);
  });
  if (opts.noSpots) return;
  refs.filter(({ part }) => part.t === "artwork" || part.t === "screen").slice(0, ART_SPOT_CAP).forEach(({ object }) => {
    const p = object.position;
    const toC = new THREE.Vector3(-p.x, 0, -p.z);
    if (toC.lengthSq() < 1e-3) toC.set(0, 0, 1);
    toC.normalize();
    const sl = new THREE.SpotLight(16769978, 23, 11, 0.72, 1, 1);
    sl.position.set(p.x + toC.x * 2.1, H - 0.15, p.z + toC.z * 2.1);
    sl.target.position.set(p.x, p.y, p.z);
    group.add(sl);
    group.add(sl.target);
  });
  for (const [dx, dz] of [[-hw * 0.4, -hd * 0.35], [hw * 0.15, hd * 0.1], [hw * 0.5, -hd * 0.1]]) {
    const dl = new THREE.SpotLight(16768176, 18, 12, 0.6, 1, 1.1);
    dl.position.set(dx, H - 0.1, dz);
    dl.target.position.set(dx, 0, dz);
    group.add(dl);
    group.add(dl.target);
  }
}
function disposeSpaceGroup(g) {
  const u = g.userData || {};
  (u.geos || []).forEach((x) => x.dispose && x.dispose());
  (u.mats || []).forEach((m) => {
    if (m.map && m.map.dispose && !(m.map.userData && m.map.userData.shared)) m.map.dispose();
    if (m.normalMap && m.normalMap.dispose && !(m.normalMap.userData && m.normalMap.userData.shared)) m.normalMap.dispose();
    m.dispose && m.dispose();
  });
  (u.bakedRTs || []).forEach((rt) => rt.dispose && rt.dispose());
}
function buildPartPreview(type) {
  const g = new THREE.Group();
  const geo = partGeo(type), m = partMat(type);
  if (TINT_TYPES.has(type)) m.color.copy(tintColor({ t: type }));
  g.add(new THREE.Mesh(geo, m));
  const acc = partAccent(type);
  if (acc) {
    const accMat = (MATS[acc.mat] || MATS.paper)();
    if (acc.tint === "rugAccent") accMat.color.copy(rugAccentColor({ t: type }));
    const am = new THREE.Mesh(acc.geo, accMat);
    const [ox, oy, oz] = acc.off;
    am.position.set(ox, oy, oz);
    g.add(am);
  }
  return g;
}
function uniqueTexCount(space) {
  return space.parts.reduce((n, p) => n + (UNIQUE_TEX_TYPES.has(p.t) ? 1 : 0), 0);
}
export {
  DOOR_W,
  addRoomLighting,
  buildPartPreview,
  buildSpaceGroup,
  buildSpaceGroupChunked,
  disposeSpaceGroup,
  spaceDims,
  uniqueTexCount
};
