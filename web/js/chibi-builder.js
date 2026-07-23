import * as THREE from "three";
import { mergeGeometries } from "../utils/BufferGeometryUtils.js";
import { normalizeChibi, FACE_SHAPE_DEF, SPECIES_HEAD_BASE } from "./chibi-schema.ts";
import { shade } from "./chibi-color.ts";
import { drawFaceCanvas, drawFaceInto } from "./chibi-face.ts";
import { toonRamp, vivid, toon, vividSkin, addOutline, lathePoints, shirtTexture, furStripeTexture, buildMuzzleGeo } from "./chibi-materials.ts";
import { easeOutCubic, easeInCubic, easeInOutCubic, easeOutBack, CHIBI_ACTION_DUR, sitWrapperY } from "./chibi-anim.ts";
function buildChibi(params) {
  const p = normalizeChibi(params);
  const mats = [];
  const geos = [];
  const texs = [];
  const mkGeo = (g) => {
    geos.push(g);
    return g;
  };
  const mkMat = (m) => {
    mats.push(m);
    return m;
  };
  const group = new THREE.Group();
  const wrapper = new THREE.Group();
  wrapper.rotation.y = Math.PI;
  group.add(wrapper);
  let skinMat;
  if (p.species === "tiger") {
    const tex = furStripeTexture(p.skin);
    texs.push(tex);
    skinMat = mkMat(new THREE.MeshToonMaterial({ map: tex, gradientMap: toonRamp() }));
  } else {
    skinMat = mkMat(new THREE.MeshToonMaterial({ color: vividSkin(p.skin), gradientMap: toonRamp(), side: THREE.FrontSide }));
  }
  const hairMat = mkMat(toon(p.hairColor, true));
  let topMat;
  if (p.pattern && p.pattern !== "plain") {
    const tex = shirtTexture(p.top, p.pattern);
    texs.push(tex);
    topMat = mkMat(new THREE.MeshToonMaterial({ map: tex, gradientMap: toonRamp() }));
  } else {
    topMat = mkMat(toon(p.top));
  }
  const bottomMat = mkMat(toon(p.bottom, true));
  const shoeMat = mkMat(toon(p.shoes));
  const isGhost = p.species === "ghost";
  const ghostSkinMat = isGhost ? mkMat(new THREE.MeshToonMaterial({ color: vividSkin(p.skin), gradientMap: toonRamp(), side: THREE.DoubleSide, transparent: true, opacity: 0.74 })) : null;
  const ghostTrimMat = isGhost ? mkMat(new THREE.MeshToonMaterial({ color: vivid(p.hairColor), gradientMap: toonRamp(), side: THREE.DoubleSide, transparent: true, opacity: 0.8 })) : null;
  const HIP_Y = 0.375;
  const KNEE_Y = 0.145;
  const legPivots = [];
  const kneePivots = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.085, HIP_Y, 0);
    const knee = new THREE.Group();
    knee.position.set(0, -KNEE_Y, 0);
    if (!isGhost) {
      const legMat = p.bottomType === "pants" || p.bottomType === "overall" ? bottomMat : skinMat;
      const thigh = new THREE.Mesh(mkGeo(new THREE.CapsuleGeometry(0.054, 0.04, 6, 12)), legMat);
      thigh.position.y = -KNEE_Y / 2;
      if (p.species === "tiger" && legMat === skinMat) thigh.userData.outlineBase = p.skin;
      addOutline(thigh, 0.011, mats, geos);
      pivot.add(thigh);
      const shin = new THREE.Mesh(mkGeo(new THREE.CapsuleGeometry(0.05, 0.05, 6, 12)), legMat);
      shin.position.y = -0.075;
      if (p.species === "tiger" && legMat === skinMat) shin.userData.outlineBase = p.skin;
      addOutline(shin, 0.011, mats, geos);
      knee.add(shin);
      const kneeJoint = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.056, 14, 12)), legMat);
      if (p.species === "tiger" && legMat === skinMat) kneeJoint.userData.outlineBase = p.skin;
      addOutline(kneeJoint, 0.011, mats, geos);
      knee.add(kneeJoint);
      const foot = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.082, 16, 12)), shoeMat);
      foot.scale.set(1, 0.72, 1.25);
      foot.position.set(0, -0.16, 0.03);
      addOutline(foot, 0.011, mats, geos);
      knee.add(foot);
    }
    pivot.add(knee);
    wrapper.add(pivot);
    legPivots.push(pivot);
    kneePivots.push(knee);
  }
  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, HIP_Y, 0);
  wrapper.add(bodyPivot);
  const bodyRoot = new THREE.Group();
  bodyRoot.position.set(0, -HIP_Y, 0);
  bodyPivot.add(bodyRoot);
  if (isGhost) {
    const sheet = new THREE.Mesh(
      mkGeo(new THREE.LatheGeometry(lathePoints([[0.17, 0.1], [0.2, 0.02], [0.235, -0.1], [0.24, -0.22], [0.2, -0.32], [0.15, -0.38]]), 24)),
      ghostSkinMat
    );
    sheet.position.y = 0.5;
    addOutline(sheet, 0.013, mats, geos);
    bodyRoot.add(sheet);
    const hemGeos = [];
    for (let i = 0; i < 5; i++) {
      const th = i * (Math.PI * 2 / 5);
      const nub = new THREE.SphereGeometry(0.045, 10, 8);
      nub.scale(1, 1.3, 1);
      nub.translate(0.15 * Math.cos(th), -0.38, 0.15 * Math.sin(th));
      hemGeos.push(nub);
    }
    const hem = new THREE.Mesh(mkGeo(mergeGeometries(hemGeos)), ghostTrimMat);
    hemGeos.forEach((g) => g.dispose());
    hem.position.y = 0.5;
    addOutline(hem, 9e-3, mats, geos);
    bodyRoot.add(hem);
  } else {
    const torso = new THREE.Mesh(mkGeo(new THREE.CapsuleGeometry(0.155, 0.115, 8, 16)), topMat);
    torso.position.y = 0.52;
    torso.scale.set(1, 1, 0.9);
    torso.userData.outlineBase = vivid(p.top);
    addOutline(torso, 0.013, mats, geos);
    bodyRoot.add(torso);
  }
  if (!isGhost && (p.bottomType === "skirt" || p.bottomType === "dress" || p.bottomType === "swimsuit")) {
    const isDress = p.bottomType === "dress";
    const isSwim = p.bottomType === "swimsuit";
    const profile = isDress ? [[0.15, 0.09], [0.2, 0.02], [0.27, -0.12], [0.31, -0.24], [0.3, -0.27]] : isSwim ? [[0.15, 0.08], [0.165, 0], [0.16, -0.09], [0.135, -0.13]] : [[0.165, 0.03], [0.22, -0.03], [0.29, -0.13], [0.3, -0.155]];
    const skirt = new THREE.Mesh(
      mkGeo(new THREE.LatheGeometry(lathePoints(profile), 24)),
      isDress || isSwim ? topMat : bottomMat
      // 원피스·수영복은 상의(색·패턴)와 한 벌
    );
    skirt.position.y = isSwim ? 0.5 : isDress ? 0.53 : 0.5;
    skirt.userData.outlineBase = isDress || isSwim ? vivid(p.top) : vivid(p.bottom);
    addOutline(skirt, 0.012, mats, geos);
    bodyRoot.add(skirt);
    if (isSwim) {
      for (const s of [-1, 1]) {
        const strap = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.03, 0.16, 0.02)), topMat);
        strap.position.set(s * 0.09, 0.6, 0.1);
        strap.rotation.z = s * 0.15;
        addOutline(strap, 8e-3, mats, geos);
        bodyRoot.add(strap);
      }
      const frill = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(0.158, 0.018, 8, 20)), mkMat(toon(shade(p.top, 0.8))));
      frill.rotation.x = Math.PI / 2;
      frill.position.y = 0.505;
      addOutline(frill, 7e-3, mats, geos);
      bodyRoot.add(frill);
    }
  } else if (!isGhost) {
    const shorts = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.35)), bottomMat);
    shorts.position.y = 0.44;
    bodyRoot.add(shorts);
    if (p.bottomType === "overall") {
      for (const s of [-1, 1]) {
        const strap = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.035, 0.22, 0.022)), bottomMat);
        strap.position.set(s * 0.07, 0.56, 0.135);
        strap.rotation.z = s * 0.1;
        addOutline(strap, 9e-3, mats, geos);
        bodyRoot.add(strap);
      }
    }
  }
  if (p.heart) {
    const heartMat = mkMat(toon("#e8619a"));
    const hg = new THREE.Group();
    hg.position.set(0, 0.55, 0.15);
    for (const s of [-1, 1]) {
      const lobe = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.042, 12, 10)), heartMat);
      lobe.position.set(s * 0.03, 0.018, 0);
      lobe.scale.set(1, 1, 0.5);
      hg.add(lobe);
    }
    const tip = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.058, 0.085, 14)), heartMat);
    tip.rotation.x = Math.PI;
    tip.position.set(0, -0.028, 0);
    tip.scale.set(1, 1, 0.5);
    hg.add(tip);
    bodyRoot.add(hg);
  }
  const armPivots = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.172, 0.625, 0);
    pivot.rotation.z = s * 0.5;
    if (isGhost) {
      const nub = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.06, 12, 10)), ghostSkinMat);
      nub.scale.set(1, 1.3, 1);
      nub.position.y = -0.05;
      addOutline(nub, 0.01, mats, geos);
      pivot.add(nub);
    } else {
      const arm = new THREE.Mesh(mkGeo(new THREE.CapsuleGeometry(0.05, 0.115, 6, 12)), skinMat);
      arm.position.y = -0.095;
      if (p.species === "tiger") arm.userData.outlineBase = p.skin;
      addOutline(arm, 0.011, mats, geos);
      pivot.add(arm);
      const sleeve = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.07, 12, 10)), topMat);
      sleeve.position.y = -0.02;
      sleeve.scale.set(1, 0.8, 1);
      pivot.add(sleeve);
    }
    bodyRoot.add(pivot);
    armPivots.push(pivot);
  }
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.7;
  bodyRoot.add(headPivot);
  const HEAD_R = 0.35;
  const fsDef = FACE_SHAPE_DEF[p.face] || FACE_SHAPE_DEF.round;
  const headBase = SPECIES_HEAD_BASE[p.species] || SPECIES_HEAD_BASE.human;
  const sX = headBase.sx * fsDef.sx, sY = headBase.sy * fsDef.sy, sZ = headBase.sz * fsDef.sz;
  const effTaper = p.species === "human" ? fsDef.taper : Math.min(0.42, headBase.taper + fsDef.taper * 0.6);
  const effFlat = p.species === "human" ? fsDef.flat : Math.max(headBase.flat, fsDef.flat * 0.7);
  const taperJaw = (geo) => {
    if (!effTaper && !effFlat) return geo;
    const pos = geo.attributes.position;
    const FLAT_Y = -HEAD_R * 0.72;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y >= 0) continue;
      if (effTaper) {
        const f = 1 - effTaper * Math.min(1, -y / HEAD_R);
        pos.setX(i, pos.getX(i) * f);
        pos.setZ(i, pos.getZ(i) * f);
      }
      if (effFlat && y < FLAT_Y) {
        pos.setY(i, FLAT_Y + (y - FLAT_Y) * (1 - effFlat));
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  };
  const skullGeo = new THREE.SphereGeometry(HEAD_R, 32, 24);
  const muzzleGeo = buildMuzzleGeo(p.species, HEAD_R);
  let mergedSkull = skullGeo;
  if (muzzleGeo) {
    mergedSkull = mergeGeometries([skullGeo, muzzleGeo]);
    skullGeo.dispose();
    muzzleGeo.dispose();
  }
  const skull = new THREE.Mesh(mkGeo(taperJaw(mergedSkull)), skinMat);
  skull.scale.set(sX, sY, sZ);
  skull.position.y = 0.25;
  if (p.species === "tiger") skull.userData.outlineBase = p.skin;
  addOutline(skull, 0.013, mats, geos);
  headPivot.add(skull);
  const faceCanvas = drawFaceCanvas(p);
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  texs.push(faceTex);
  const FACE_PHI = 1.85;
  const faceGeo = mkGeo(
    taperJaw(new THREE.SphereGeometry(HEAD_R * 1.012, 32, 24, Math.PI / 2 - FACE_PHI / 2, FACE_PHI, Math.PI * 0.33, Math.PI * 0.4))
  );
  const faceMat = mkMat(
    new THREE.MeshToonMaterial({ map: faceTex, gradientMap: toonRamp(), transparent: true, alphaTest: 0.02 })
  );
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.scale.copy(skull.scale);
  face.position.copy(skull.position);
  headPivot.add(face);
  const HAIR_R = HEAD_R * 1.07;
  const hairRoot = new THREE.Group();
  hairRoot.position.copy(skull.position);
  if (p.species === "human") hairRoot.scale.set(fsDef.sx, fsDef.sy, fsDef.sz);
  else hairRoot.scale.set(sX, sY, sZ);
  headPivot.add(hairRoot);
  const tailPivots = [];
  const earPivots = [];
  const ouchEyes = [];
  if (p.species === "human") {
    if (p.hairStyle !== "bald") {
      const shell = new THREE.Mesh(
        mkGeo(new THREE.SphereGeometry(HAIR_R, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.44)),
        hairMat
      );
      addOutline(shell, 0.012, mats, geos);
      hairRoot.add(shell);
      const staticHairGeos = [];
      if (p.hairStyle !== "short") {
        const FRONT_OPEN = 1.95;
        staticHairGeos.push(
          new THREE.SphereGeometry(HAIR_R * 0.995, 32, 16, Math.PI / 2 + FRONT_OPEN / 2, Math.PI * 2 - FRONT_OPEN, Math.PI * 0.3, Math.PI * (p.hairStyle === "bob" ? 0.42 : p.hairStyle === "long" || p.hairStyle === "wave" || p.hairStyle === "halfup" ? 0.5 : 0.34))
        );
      }
      for (const [bx, bs] of [[-0.13, 0.105], [0, 0.12], [0.13, 0.105]]) {
        const bang = new THREE.SphereGeometry(bs, 14, 10);
        bang.scale(1, 0.52, 0.5);
        bang.translate(bx, 0.21, 0.235);
        staticHairGeos.push(bang);
      }
      if (staticHairGeos.length) {
        const mergedHair = new THREE.Mesh(mkGeo(mergeGeometries(staticHairGeos)), hairMat);
        staticHairGeos.forEach((g) => g.dispose());
        addOutline(mergedHair, 0.011, mats, geos);
        hairRoot.add(mergedHair);
      }
      const tailProfile = lathePoints([[0.015, 0.03], [0.075, -0.03], [0.085, -0.14], [0.055, -0.26], [8e-3, -0.36]]);
      if (p.hairStyle === "twintail") {
        for (const s of [-1, 1]) {
          const pivot = new THREE.Group();
          pivot.position.set(s * 0.27, 0.22, -0.07);
          pivot.rotation.z = s * 0.35;
          const tail = new THREE.Mesh(mkGeo(new THREE.LatheGeometry(tailProfile, 16)), hairMat);
          tail.scale.setScalar(1.15);
          addOutline(tail, 0.011, mats, geos);
          pivot.add(tail);
          const tie = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.06, 10, 8)), mkMat(toon("#ffd166")));
          tie.position.y = 0.03;
          pivot.add(tie);
          hairRoot.add(pivot);
          tailPivots.push({ pivot, baseZ: pivot.rotation.z, baseX: 0 });
        }
      } else if (p.hairStyle === "ponytail") {
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.16, -0.26);
        pivot.rotation.x = -0.5;
        const tail = new THREE.Mesh(mkGeo(new THREE.LatheGeometry(tailProfile, 16)), hairMat);
        tail.scale.setScalar(1.25);
        addOutline(tail, 0.011, mats, geos);
        pivot.add(tail);
        hairRoot.add(pivot);
        tailPivots.push({ pivot, baseZ: 0, baseX: pivot.rotation.x });
      } else if (p.hairStyle === "buns") {
        for (const s of [-1, 1]) {
          const bun = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.1, 14, 12)), hairMat);
          bun.position.set(s * 0.2, 0.26, -0.04);
          addOutline(bun, 0.012, mats, geos);
          hairRoot.add(bun);
        }
      } else if (p.hairStyle === "long" || p.hairStyle === "wave" || p.hairStyle === "halfup") {
        const longProfile = p.hairStyle === "wave" ? [[0.08, 0.14], [0.18, 0.02], [0.13, -0.14], [0.19, -0.3], [0.12, -0.46], [0.18, -0.6], [0.07, -0.75]] : [[0.08, 0.14], [0.17, 0], [0.19, -0.22], [0.17, -0.45], [0.12, -0.62], [0.05, -0.75]];
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.06, -0.02);
        const curtain = new THREE.Mesh(
          mkGeo(new THREE.LatheGeometry(lathePoints(longProfile), p.hairStyle === "wave" ? 28 : 22, Math.PI * 0.45, Math.PI * 1.1)),
          hairMat
        );
        addOutline(curtain, 0.011, mats, geos);
        pivot.add(curtain);
        hairRoot.add(pivot);
        tailPivots.push({ pivot, baseZ: 0, baseX: 0 });
        if (p.hairStyle === "halfup") {
          const bun = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.085, 14, 12)), hairMat);
          bun.position.set(0, 0.28, -0.03);
          addOutline(bun, 0.012, mats, geos);
          hairRoot.add(bun);
          const tie = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.045, 10, 8)), mkMat(toon("#ff8fab")));
          tie.position.set(0, 0.22, 0);
          hairRoot.add(tie);
        }
      } else if (p.hairStyle === "heart") {
        for (const s of [-1, 1]) {
          const lobe = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.205, 22, 18)), hairMat);
          lobe.position.set(s * 0.135, 0.35, -0.02);
          lobe.scale.set(1, 1.12, 1);
          lobe.rotation.z = s * 0.25;
          addOutline(lobe, 0.012, mats, geos);
          hairRoot.add(lobe);
        }
        const bridge = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.12, 18, 14)), hairMat);
        bridge.position.set(0, 0.32, -0.02);
        addOutline(bridge, 0.012, mats, geos);
        hairRoot.add(bridge);
      }
    } else {
      const shine = new THREE.Mesh(
        mkGeo(new THREE.SphereGeometry(HEAD_R * 0.16, 12, 8)),
        mkMat(new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.3 }))
      );
      shine.scale.set(1, 0.45, 0.85);
      shine.position.set(-0.04, HEAD_R * 0.88, HEAD_R * 0.22);
      hairRoot.add(shine);
    }
  } else if (p.species === "robot") {
    const rod = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.011, 0.014, 0.15, 8)), skinMat);
    rod.position.set(0, 0.432, -0.02);
    addOutline(rod, 8e-3, mats, geos);
    hairRoot.add(rod);
    const bead = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.034, 12, 10)), hairMat);
    bead.position.set(0, 0.541, -0.02);
    hairRoot.add(bead);
    const collar = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(0.31, 0.016, 8, 20)), mkMat(toon(shade(p.skin, 0.55))));
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, -0.06, 0);
    addOutline(collar, 0.01, mats, geos);
    headPivot.add(collar);
    const boltMat = mkMat(toon(shade(p.skin, 0.5)));
    for (const s of [-1, 1]) for (const z of [0.06, -0.06]) {
      const bolt = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.02, 8, 8)), boltMat);
      bolt.position.set(s * 0.172, 0.66, z);
      bodyRoot.add(bolt);
    }
    const panel = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.09, 0.07, 0.012)), mkMat(toon(shade(p.skin, 0.6))));
    panel.position.set(0, 0.56, 0.135);
    addOutline(panel, 7e-3, mats, geos);
    bodyRoot.add(panel);
    for (const bx of [-0.025, 0.025]) {
      const btn = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10)), hairMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(bx, 0.56, 0.145);
      bodyRoot.add(btn);
    }
  } else if (p.species === "ghost") {
  } else {
    const sp = p.species;
    const furMat = skinMat;
    const pointMat = hairMat;
    const R = HEAD_R;
    const addPartTo = (parent, geo, mat, x, y, z, rz, rx, sc, outline) => {
      const m = new THREE.Mesh(mkGeo(geo), mat);
      m.position.set(x, y, z);
      if (rz) m.rotation.z = rz;
      if (rx) m.rotation.x = rx;
      if (sc) m.scale.setScalar(sc);
      if (outline !== false) addOutline(m, 0.011, mats, geos);
      parent.add(m);
      return m;
    };
    const addPart = (geo, mat, x, y, z, rz, rx, sc, outline) => addPartTo(hairRoot, geo, mat, x, y, z, rz, rx, sc, outline);
    const earGroup = (x, y, z, s) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      hairRoot.add(g);
      earPivots.push({ pivot: g, s });
      return g;
    };
    const M = (col) => mkMat(toon(col));
    const PINK_INNER = "#f2b3c4";
    const EAR_K = 1.34;
    const coneEars = (earR, earH, x, y, z, tilt, innerScale, outerMat, innerCol) => {
      earR *= EAR_K;
      earH *= EAR_K;
      const inMat = innerCol ? M(innerCol) : pointMat;
      for (const s of [-1, 1]) {
        const piv = earGroup(s * x, y, z, s);
        addPartTo(piv, new THREE.ConeGeometry(earR, earH, 16), outerMat || furMat, 0, 0, 0, -s * tilt, -0.12);
        if (innerScale) addPartTo(piv, new THREE.ConeGeometry(earR * innerScale, earH * 0.72, 16), inMat, 0, -earH * 0.02, R * 0.1, -s * tilt, -0.12, void 0, false);
      }
    };
    const roundEars = (er, x, y, z, m, innerCol) => {
      er *= EAR_K;
      for (const s of [-1, 1]) {
        const piv = earGroup(s * x, y, z, s);
        addPartTo(piv, new THREE.SphereGeometry(er, 14, 12), m || furMat, 0, 0, 0);
        if (innerCol) addPartTo(piv, new THREE.SphereGeometry(er * 0.62, 12, 10), M(innerCol), 0, 0, er * 0.6, 0, 0, 0, false).scale.set(1, 1, 0.55);
      }
    };
    const puffMass = (count, cover, base, yOff, col, dbl) => {
      const puffs = [];
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(1 - cover * (i + 0.5) / count);
        const theta = i * 2.399963;
        const rr = R * 1.04;
        const g = new THREE.SphereGeometry(R * base * (1 + i % 3 * 0.12), 8, 6);
        g.translate(rr * Math.sin(phi) * Math.cos(theta), rr * Math.cos(phi) + R * yOff, rr * Math.sin(phi) * Math.sin(theta));
        puffs.push(g);
      }
      const mesh = new THREE.Mesh(mkGeo(mergeGeometries(puffs)), mkMat(toon(col, dbl)));
      puffs.forEach((g) => g.dispose());
      addOutline(mesh, 0.012, mats, geos);
      hairRoot.add(mesh);
      return mesh;
    };
    if (sp === "sheep") {
      puffMass(24, 0.82, 0.24, 0.08, p.skin, true);
      for (const s of [-1, 1]) {
        addPart(new THREE.SphereGeometry(R * 0.18, 12, 10), pointMat, s * R * 0.72, R * 0.22, R * 0.08, -s * 0.62).scale.set(1, 0.5, 0.44);
        addPart(new THREE.SphereGeometry(R * 0.1, 10, 8), M("#f2c4c4"), s * R * 0.66, R * 0.2, R * 0.16, -s * 0.62, 0, 0, false).scale.set(1, 0.5, 0.3);
      }
    } else if (sp === "lion") {
      const maneGeos = [];
      const MN = 18;
      for (let i = 0; i < MN; i++) {
        const a = i / MN * Math.PI * 2 - Math.PI / 2;
        const outer = i % 2 === 0;
        const rr = R * (outer ? 1.12 : 0.98);
        const sz = R * (outer ? 0.26 : 0.205) * (0.88 + 0.22 * (i * 7 % 5 / 4));
        const g = new THREE.SphereGeometry(sz, 8, 6);
        g.scale(1, 1, 0.82);
        g.translate(Math.cos(a) * rr, Math.sin(a) * rr + R * 0.04, R * 0.06);
        maneGeos.push(g);
      }
      const mane = new THREE.Mesh(mkGeo(mergeGeometries(maneGeos)), mkMat(toon(p.hairColor, true)));
      maneGeos.forEach((g) => g.dispose());
      addOutline(mane, 0.012, mats, geos);
      hairRoot.add(mane);
      roundEars(R * 0.16, R * 0.52, R * 0.8, R * 0.05, furMat, "#e8c9a0");
    } else if (sp === "cat" || sp === "tiger") {
      coneEars(R * 0.3, sp === "tiger" ? R * 0.46 : R * 0.54, R * 0.58, R * 0.86, R * 0.05, 0.3, 0.62, void 0, PINK_INNER);
    } else if (sp === "fox") {
      coneEars(R * 0.27, R * 0.6, R * 0.58, R * 0.88, R * 0.05, 0.3, 0.55, void 0, "#fff1e0");
    } else if (sp === "raccoon") {
      coneEars(R * 0.26, R * 0.56, R * 0.6, R * 0.88, R * 0.05, 0.3, 0.5, void 0, "#d8d0c4");
    } else if (sp === "dog") {
      for (const s of [-1, 1]) {
        const piv = earGroup(s * R * 0.72, R * 0.3, 0, s);
        const ear = addPartTo(piv, new THREE.SphereGeometry(R * 0.34, 14, 12), pointMat, 0, 0, 0, -s * 0.12, 0.05);
        ear.scale.set(0.55, 1.7, 0.42);
        addPartTo(piv, new THREE.SphereGeometry(R * 0.19, 12, 10), M("#f2c4c0"), -s * R * 0.04, -R * 0.04, R * 0.09, -s * 0.12, 0.05, 0, false).scale.set(0.5, 1.55, 0.26);
      }
    } else if (sp === "rabbit") {
      for (const s of [-1, 1]) {
        const piv = earGroup(s * R * 0.34, R * 1.08, 0, s);
        addPartTo(piv, new THREE.CapsuleGeometry(R * 0.12, R * 0.82, 4, 8), furMat, 0, 0, 0, -s * 0.1);
        addPartTo(piv, new THREE.CapsuleGeometry(R * 0.065, R * 0.62, 4, 8), M(PINK_INNER), 0, R * 0.03, R * 0.07, -s * 0.1, 0, 0, false);
      }
    } else if (sp === "koala") {
      roundEars(R * 0.36, R * 0.76, R * 0.44, 0, furMat, "#f2c4d0");
      for (const s of [-1, 1]) for (const [ox, oy] of [[-0.12, 0.14], [0.12, 0.1], [0, -0.16]]) {
        addPart(new THREE.SphereGeometry(R * 0.11, 8, 6), furMat, s * (R * 0.76 + ox * R), R * 0.44 + oy * R, R * 0.02, 0, 0, 0, false);
      }
    } else if (sp === "hamster") {
      roundEars(R * 0.19, R * 0.5, R * 0.9, R * 0.05, furMat, PINK_INNER);
    } else if (sp === "pig") {
      for (const s of [-1, 1]) {
        addPart(new THREE.ConeGeometry(R * 0.17, R * 0.28, 12), furMat, s * R * 0.5, R * 0.9, R * 0.12, -s * 0.15, -0.7);
        addPart(new THREE.ConeGeometry(R * 0.09, R * 0.18, 10), M("#efa0b2"), s * R * 0.5, R * 0.86, R * 0.19, -s * 0.15, -0.7, 0, false);
      }
    } else if (sp === "chick") {
      for (const dx of [-1, 0, 1]) addPart(new THREE.ConeGeometry(R * 0.07, R * 0.22, 12), furMat, dx * R * 0.13, R * 1, 0, dx * 0.25, -0.1);
    } else if (sp === "frog") {
      for (const s of [-1, 1]) {
        const ball = addPart(new THREE.SphereGeometry(R * 0.26, 14, 12), skinMat, s * R * 0.42, R * 0.62, R * 0.34);
        const white = addPart(new THREE.SphereGeometry(R * 0.15, 12, 10), mkMat(toon("#fbfbfa")), s * R * 0.42, R * 0.66, R * 0.5, 0, 0, 0, false);
        const pup = addPart(new THREE.SphereGeometry(R * 0.075, 10, 8), mkMat(toon("#1a1a1a")), s * R * 0.42, R * 0.66, R * 0.62, 0, 0, 0, false);
        for (const m of [ball, white, pup]) ouchEyes.push({ mesh: m, baseY: m.position.y });
      }
    } else if (sp === "penguin") {
      addPart(new THREE.SphereGeometry(R * 0.14, 10, 8), furMat, 0, R * 0.98, -R * 0.1).scale.set(0.8, 0.6, 0.8);
    } else if (sp === "panda") {
      roundEars(R * 0.26, R * 0.68, R * 0.82, R * 0.05, pointMat);
    } else {
      roundEars(R * 0.26, R * 0.68, R * 0.82, R * 0.05, furMat, "#f0d6b8");
    }
    const darkNose = () => mkMat(toon("#2a2724"));
    const tip = (geo, mat, x, y, z) => addPart(geo, mat, x, y, z, 0, 0, 0, false);
    if (sp === "dog") tip(new THREE.SphereGeometry(R * 0.06, 10, 8), darkNose(), 0, -0.12 * R, 1 * R);
    else if (sp === "fox") tip(new THREE.SphereGeometry(R * 0.055, 10, 8), mkMat(toon("#fff6ea")), 0, -0.06 * R, 1.12 * R);
    else if (sp === "bear") tip(new THREE.SphereGeometry(R * 0.07, 10, 8), darkNose(), 0, -0.1 * R, 1.02 * R);
    else if (sp === "raccoon") tip(new THREE.SphereGeometry(R * 0.055, 10, 8), darkNose(), 0, -0.08 * R, 1 * R);
    else if (sp === "panda") tip(new THREE.SphereGeometry(R * 0.05, 10, 8), darkNose(), 0, -0.05 * R, 0.9 * R);
    else if (sp === "rabbit") tip(new THREE.SphereGeometry(R * 0.075, 10, 8), mkMat(toon("#e88ba0")), 0, 0.02 * R, 0.9 * R);
    else if (sp === "cat") tip(new THREE.SphereGeometry(R * 0.045, 10, 8), mkMat(toon("#e88ba0")), 0, -0.02 * R, 1 * R).scale.set(1.4, 0.85, 1);
    else if (sp === "koala") tip(new THREE.SphereGeometry(R * 0.13, 12, 10), darkNose(), 0, -0.03 * R, 0.98 * R).scale.set(1.05, 1.3, 0.95);
    else if (sp === "pig") {
      const snout = addPart(new THREE.CylinderGeometry(R * 0.2, R * 0.21, R * 0.18, 18), mkMat(toon("#efa0b2")), 0, -0.05 * R, 0.98 * R, 0, Math.PI / 2, 0, true);
      snout.userData.outlineBase = "#c07a90";
      for (const s of [-1, 1]) tip(new THREE.SphereGeometry(R * 0.032, 8, 6), mkMat(toon("#a85670")), s * 0.06 * R, -0.05 * R, 1.08 * R);
    } else if (sp === "chick" || sp === "penguin") {
      const beak = addPart(new THREE.ConeGeometry(sp === "penguin" ? R * 0.11 : R * 0.1, sp === "penguin" ? R * 0.16 : R * 0.17, 4), mkMat(toon("#f4a83a")), 0, -0.02 * R, 0.86 * R, 0, -Math.PI / 2, 0, false);
      beak.scale.set(sp === "penguin" ? 1.6 : 1.4, 0.6, 1);
    } else if (sp === "hamster") {
      for (const s of [-1, 1]) addPart(new THREE.SphereGeometry(R * 0.16, 12, 10), furMat, s * 0.6 * R, -0.06 * R, 0.55 * R, 0, 0, 0, true).scale.set(1, 0.8, 0.7);
    }
    const STUB = /* @__PURE__ */ new Set(["bear", "panda", "hamster", "koala", "penguin", "chick"]);
    const LATHE = /* @__PURE__ */ new Set(["cat", "dog", "fox", "sheep", "tiger", "lion", "raccoon"]);
    if (sp !== "frog") {
      const tailPivot = new THREE.Group();
      tailPivot.position.set(0, 0.46, -0.2);
      let baseX = -0.4;
      if (sp === "rabbit") {
        const puff = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(HEAD_R * 0.22, 12, 10)), furMat);
        addOutline(puff, 0.011, mats, geos);
        tailPivot.add(puff);
        baseX = 0;
      } else if (sp === "pig") {
        const curl = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(HEAD_R * 0.11, HEAD_R * 0.035, 8, 16, Math.PI * 1.6)), furMat);
        tailPivot.add(curl);
        baseX = 0;
      } else if (STUB.has(sp)) {
        const stub = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(HEAD_R * 0.12, 10, 8)), sp === "panda" ? pointMat : furMat);
        addOutline(stub, 0.011, mats, geos);
        tailPivot.add(stub);
        baseX = 0;
      } else if (LATHE.has(sp)) {
        tailPivot.position.set(0, 0.4, -0.13);
        const spec = {
          fox: { rad: R * 0.17, len: 1.35, up: 1, tip: "#fff6ea", bushy: true },
          cat: { rad: R * 0.075, len: 1.1, up: 1.15 },
          lion: { rad: R * 0.085, len: 1.22, up: 0.75, tip: p.hairColor },
          raccoon: { rad: R * 0.13, len: 1.15, up: 0.72, tip: "#3a3632", bushy: true },
          dog: { rad: R * 0.09, len: 1, up: 1 },
          sheep: { rad: R * 0.1, len: 0.68, up: 0.5 }
        }[sp] || { rad: R * 0.09, len: 1.05, up: 0.9 };
        const L = spec.len;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0.1 * L, -0.16 * L),
          new THREE.Vector3(0, 0.26 * L * spec.up, -0.2 * L),
          new THREE.Vector3(0, 0.42 * L * spec.up, -0.12 * L)
        ]);
        const tube = new THREE.Mesh(mkGeo(new THREE.TubeGeometry(curve, 22, spec.rad, 12, false)), furMat);
        addOutline(tube, 0.011, mats, geos);
        tailPivot.add(tube);
        if (spec.bushy) {
          for (const tt of [0.45, 0.68, 0.86]) {
            const pp = curve.getPoint(tt);
            const puff = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(spec.rad * 1.3, 12, 10)), furMat);
            puff.position.copy(pp);
            addOutline(puff, 0.011, mats, geos);
            tailPivot.add(puff);
          }
        }
        const endBall = new THREE.Mesh(
          mkGeo(new THREE.SphereGeometry(spec.rad * (spec.bushy ? 1.55 : 1.2), 12, 10)),
          spec.tip ? mkMat(toon(spec.tip)) : furMat
        );
        endBall.position.copy(curve.getPoint(1));
        addOutline(endBall, 0.011, mats, geos);
        tailPivot.add(endBall);
        baseX = 0;
      }
      tailPivot.rotation.x = baseX;
      bodyRoot.add(tailPivot);
      tailPivots.push({ pivot: tailPivot, baseZ: 0, baseX });
    }
  }
  if (p.glasses) {
    const frameMat = mkMat(toon("#3a352f"));
    const gGroup = new THREE.Group();
    gGroup.position.set(0, 0.21, HEAD_R * 1.05);
    gGroup.scale.copy(skull.scale);
    for (const s of [-1, 1]) {
      const lens = new THREE.Mesh(mkGeo(new THREE.TorusGeometry(0.072, 95e-4, 12, 28)), frameMat);
      lens.position.set(s * 0.09, 0, 0);
      gGroup.add(lens);
    }
    const bridge = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.05, 0.014, 0.014)), frameMat);
    gGroup.add(bridge);
    headPivot.add(gGroup);
  }
  if (p.outfit === "suit") {
    const collarMat = mkMat(toon("#fbfbfa"));
    for (const s of [-1, 1]) {
      const flap = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.05, 0.11, 0.02)), collarMat);
      flap.position.set(s * 0.035, 0.6, 0.145);
      flap.rotation.z = s * 0.5;
      addOutline(flap, 8e-3, mats, geos);
      bodyRoot.add(flap);
    }
    const tieMat = mkMat(toon("#c0392b"));
    const knot = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.03, 0.03, 0.02)), tieMat);
    knot.position.set(0, 0.605, 0.15);
    bodyRoot.add(knot);
    const tie = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.028, 0.14, 4)), tieMat);
    tie.rotation.x = Math.PI;
    tie.position.set(0, 0.52, 0.15);
    tie.scale.set(1, 1, 0.4);
    addOutline(tie, 7e-3, mats, geos);
    bodyRoot.add(tie);
  } else if (p.outfit === "gyoryeon") {
    const trimMat = mkMat(toon(shade(p.top, 0.75)));
    const btnMat = mkMat(toon("#3a352f"));
    for (let i = 0; i < 4; i++) {
      const btn = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.016, 8, 6)), btnMat);
      btn.position.set(0, 0.585 - i * 0.038, 0.152);
      bodyRoot.add(btn);
    }
    for (const s of [-1, 1]) {
      const collar = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.07, 0.03, 0.02)), trimMat);
      collar.position.set(s * 0.05, 0.62, 0.14);
      collar.rotation.z = s * 0.2;
      bodyRoot.add(collar);
    }
    const crown = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(HEAD_R * 0.82, HEAD_R * 0.9, 0.11, 20)), mkMat(toon(p.top)));
    crown.position.set(0, skull.position.y + HEAD_R * 0.72, -0.01);
    crown.userData.outlineBase = vivid(p.top);
    addOutline(crown, 0.012, mats, geos);
    headPivot.add(crown);
    const brim = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(HEAD_R * 0.5, HEAD_R * 0.5, 0.02, 18, 1, false, 0, Math.PI)), mkMat(toon(shade(p.top, 0.8))));
    brim.position.set(0, skull.position.y + HEAD_R * 0.66, HEAD_R * 0.62);
    brim.rotation.x = -0.15;
    addOutline(brim, 0.01, mats, geos);
    headPivot.add(brim);
  } else if (p.outfit === "artist") {
    const beretMat = mkMat(toon("#39414f"));
    const beret = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(HEAD_R * 0.78, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)), beretMat);
    beret.scale.set(1, 0.42, 1);
    beret.position.set(0.03, skull.position.y + HEAD_R * 0.74, -0.02);
    beret.rotation.z = -0.18;
    addOutline(beret, 0.011, mats, geos);
    headPivot.add(beret);
    const nub = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.022, 8, 6)), beretMat);
    nub.position.set(0.03, skull.position.y + HEAD_R * 0.88, -0.02);
    headPivot.add(nub);
    const apronMat = mkMat(toon("#f3ece0"));
    const apron = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.19, 0.26, 0.02)), apronMat);
    apron.position.set(0, 0.5, 0.145);
    addOutline(apron, 9e-3, mats, geos);
    bodyRoot.add(apron);
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.025, 0.14, 0.02)), apronMat);
      strap.position.set(s * 0.06, 0.63, 0.14);
      strap.rotation.z = -s * 0.2;
      bodyRoot.add(strap);
    }
    const daubs = [["#e0596e", -0.05, 0.46], ["#5468c4", 0.04, 0.52], ["#ffd166", 0.02, 0.42]];
    for (const [col, dx, dy] of daubs) {
      const daub = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.018, 8, 6)), mkMat(toon(col)));
      daub.position.set(dx, dy, 0.157);
      daub.scale.set(1, 1, 0.4);
      bodyRoot.add(daub);
    }
  } else if (p.outfit === "hanbok") {
    const jeogori = new THREE.Mesh(mkGeo(new THREE.CapsuleGeometry(0.162, 0.06, 8, 16)), topMat);
    jeogori.position.set(0, 0.55, 0);
    jeogori.scale.set(1, 1, 0.92);
    jeogori.userData.outlineBase = vivid(p.top);
    addOutline(jeogori, 0.012, mats, geos);
    bodyRoot.add(jeogori);
    const gitMat = mkMat(toon("#fbfbfa"));
    for (const s of [-1, 1]) {
      const git = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.045, 0.16, 0.02)), gitMat);
      git.position.set(s * 0.04, 0.6, 0.15);
      git.rotation.z = s * 0.42;
      addOutline(git, 7e-3, mats, geos);
      bodyRoot.add(git);
    }
    const goreumMat = mkMat(toon(p.bottom || "#e0596e"));
    const knot = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.035, 0.035, 0.02)), goreumMat);
    knot.position.set(-0.02, 0.57, 0.16);
    addOutline(knot, 6e-3, mats, geos);
    bodyRoot.add(knot);
    for (let i = 0; i < 2; i++) {
      const ribbon = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.022, 0.14, 0.018)), goreumMat);
      ribbon.position.set(-0.02 - i * 0.02, 0.49 - i * 0.015, 0.16);
      ribbon.rotation.z = 0.12 + i * 0.18;
      addOutline(ribbon, 6e-3, mats, geos);
      bodyRoot.add(ribbon);
    }
  } else if (p.outfit === "hoodie") {
    const hoodMat = mkMat(toon(p.top));
    const hood = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(HAIR_R * 1.18, 24, 16, Math.PI, Math.PI, 0, Math.PI * 0.62)), hoodMat);
    hood.position.set(0, skull.position.y + HEAD_R * 0.1, -0.05);
    hood.userData.outlineBase = vivid(p.top);
    addOutline(hood, 0.013, mats, geos);
    headPivot.add(hood);
    const roll = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.09, 14, 10)), hoodMat);
    roll.scale.set(1.3, 0.5, 0.7);
    roll.position.set(0, 0.66, -0.08);
    addOutline(roll, 9e-3, mats, geos);
    bodyRoot.add(roll);
    const stringMat = mkMat(toon("#fbfbfa"));
    for (const s of [-1, 1]) {
      const str = new THREE.Mesh(mkGeo(new THREE.CylinderGeometry(8e-3, 8e-3, 0.12, 6)), stringMat);
      str.position.set(s * 0.03, 0.6, 0.15);
      addOutline(str, 5e-3, mats, geos);
      bodyRoot.add(str);
    }
    const pocket = new THREE.Mesh(mkGeo(new THREE.BoxGeometry(0.16, 0.08, 0.03)), mkMat(toon(shade(p.top, 0.9))));
    pocket.position.set(0, 0.45, 0.14);
    addOutline(pocket, 8e-3, mats, geos);
    bodyRoot.add(pocket);
  }
  if (p.acc === "ribbon") {
    const rib = new THREE.Group();
    rib.position.set(0.205, 0.315, 0.205);
    rib.rotation.set(0.12, 0.62, -0.2);
    const ribMat = mkMat(toon("#ff5d73"));
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.05, 0.1, 10)), ribMat);
      wing.rotation.z = s * (Math.PI / 2);
      wing.position.x = s * 0.055;
      addOutline(wing, 7e-3, mats, geos);
      rib.add(wing);
    }
    const knot = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.032, 10, 8)), ribMat);
    addOutline(knot, 7e-3, mats, geos);
    rib.add(knot);
    hairRoot.add(rib);
  } else if (p.acc === "horns") {
    const hornMat = mkMat(toon("#c0392b"));
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(mkGeo(new THREE.ConeGeometry(0.055, 0.17, 10)), hornMat);
      horn.position.set(s * 0.17, 0.33, 0.04);
      horn.rotation.z = -s * 0.42;
      addOutline(horn, 0.012, mats, geos);
      hairRoot.add(horn);
    }
  } else if (p.acc === "flower") {
    const fl = new THREE.Group();
    fl.position.set(0.205, 0.315, 0.205);
    fl.rotation.set(0.12, 0.62, -0.15);
    const petalMat = mkMat(toon("#ffd166"));
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const petal = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.038, 8, 6)), petalMat);
      petal.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0);
      petal.scale.z = 0.5;
      addOutline(petal, 6e-3, mats, geos);
      fl.add(petal);
    }
    const core = new THREE.Mesh(mkGeo(new THREE.SphereGeometry(0.03, 8, 6)), mkMat(toon("#ff8c42")));
    core.position.z = 0.02;
    addOutline(core, 6e-3, mats, geos);
    fl.add(core);
    hairRoot.add(fl);
  }
  let haloPivot = null;
  const wingPivots = [];
  if (p.halo) {
    haloPivot = new THREE.Group();
    haloPivot.position.set(0, skull.position.y + HEAD_R * 1.5, 0);
    haloPivot.rotation.x = -Math.PI / 2 + 0.2;
    const halo = new THREE.Mesh(
      mkGeo(new THREE.TorusGeometry(HEAD_R * 0.52, HEAD_R * 0.055, 12, 28)),
      // 무조명 MeshBasic은 어두운 공간에서 홀로 쨍(떠 보임). 은은한 발광 스탠다드로 → 빛도 받고 살짝 빛난다.
      mkMat(new THREE.MeshStandardMaterial({ color: "#caa23a", emissive: "#ffcf4d", emissiveIntensity: 0.5, roughness: 0.45, metalness: 0.1 }))
    );
    haloPivot.add(halo);
    headPivot.add(haloPivot);
  }
  if (p.wings) {
    const wingMat = mkMat(toon("#fff8ef", true));
    const N = 6;
    for (const s of [-1, 1]) {
      const feathers = [];
      for (let k = 0; k < N; k++) {
        const t2 = k / (N - 1);
        const len = 0.24 + 0.34 * t2;
        const wid = 0.09 - 0.03 * t2;
        const ang = (94 - 74 * t2) * Math.PI / 180;
        const g = new THREE.SphereGeometry(1, 12, 8);
        g.scale(wid, len, wid * 0.5);
        g.translate(0, len * 0.9, 0);
        g.rotateZ(-s * ang);
        g.translate(0, 0, -0.02 * (N - 1 - k));
        feathers.push(g);
      }
      const wing = new THREE.Mesh(mkGeo(mergeGeometries(feathers)), wingMat);
      feathers.forEach((g) => g.dispose());
      const wp = new THREE.Group();
      wp.position.set(s * 0.05, 0.64, -0.12);
      wp.rotation.y = s * 0.5;
      const baseZ = s * -0.06;
      wp.rotation.z = baseZ;
      wp.add(wing);
      bodyRoot.add(wp);
      wingPivots.push({ pivot: wp, s, baseZ });
    }
  }
  let t = Math.random() * 10;
  let walkPhase = 0;
  const HEIGHT = 1.18;
  const haloBaseY = haloPivot ? haloPivot.position.y : 0;
  const SQUASH_DUR = 0.55;
  let wound = 0;
  let ouchT = 0;
  let squashT = 0;
  const BLEND_IN = 0.12, BLEND_OUT = 0.16;
  const BLEND_OUT_OVERRIDE = { jump: 0.05, kick: 0.08 };
  let action = null;
  let actionT = 0;
  let actionDur = 0;
  let bodyMotionSignal = 0;
  let bodyMotionLag = 0;
  let flying = false;
  let flyBlend = 0;
  function playAction(name) {
    if (!Object.prototype.hasOwnProperty.call(CHIBI_ACTION_DUR, name)) return false;
    action = name;
    actionT = 0;
    actionDur = CHIBI_ACTION_DUR[name];
    return true;
  }
  function refreshFace() {
    drawFaceInto(faceCanvas, p, { wound, ouch: ouchT > 0 });
    faceTex.needsUpdate = true;
  }
  function setWound(level) {
    const next = Math.max(0, Math.min(3, Math.floor(level) || 0));
    if (next === wound) return;
    wound = next;
    refreshFace();
  }
  function ouch() {
    ouchT = 0.85;
    squashT = SQUASH_DUR;
    refreshFace();
  }
  function update(delta, speed) {
    const d = Math.min(delta || 0, 0.1);
    t += d;
    if (ouchT > 0) {
      ouchT -= d;
      if (ouchT <= 0) {
        ouchT = 0;
        refreshFace();
        for (const e of ouchEyes) {
          e.mesh.scale.y = 1;
          e.mesh.position.y = e.baseY;
        }
      }
    }
    if (ouchEyes.length && ouchT > 0) {
      for (const e of ouchEyes) {
        e.mesh.scale.y = 0.32;
        e.mesh.position.y = e.baseY - HEAD_R * 0.05;
      }
    }
    if (squashT > 0) {
      squashT = Math.max(0, squashT - d);
      const k = Math.sin(squashT / SQUASH_DUR * Math.PI);
      wrapper.scale.set(1 + 0.1 * k, 1 - 0.18 * k, 1 + 0.1 * k);
    } else if (wrapper.scale.y !== 1) {
      wrapper.scale.set(1, 1, 1);
    }
    const spd = Math.max(0, speed || 0);
    const w = Math.min(1, spd / 1.3);
    walkPhase += d * (3 + 8.5 * Math.min(spd, 2.4));
    const swing = Math.sin(walkPhase);
    if (legPivots.length) {
      legPivots[0].rotation.x = swing * 0.78 * w;
      legPivots[1].rotation.x = -swing * 0.78 * w;
      legPivots[0].rotation.z = 0;
      legPivots[1].rotation.z = 0;
    }
    if (kneePivots.length) {
      const KNEE_WALK_AMT = 0.7;
      kneePivots[0].rotation.x = -Math.max(0, -swing) * KNEE_WALK_AMT * w;
      kneePivots[1].rotation.x = -Math.max(0, swing) * KNEE_WALK_AMT * w;
    }
    armPivots[0].rotation.x = -swing * 0.5 * w;
    armPivots[1].rotation.x = swing * 0.5 * w;
    const idle = 1 - w;
    armPivots[0].rotation.z = -0.5 - Math.sin(t * 1.7) * 0.05 * idle;
    armPivots[1].rotation.z = 0.5 + Math.sin(t * 1.7 + 1.3) * 0.05 * idle;
    wrapper.position.y = Math.abs(Math.cos(walkPhase)) * 0.045 * w + Math.sin(t * 2.1) * 7e-3 * idle;
    wrapper.rotation.z = Math.sin(walkPhase) * 0.045 * w;
    headPivot.rotation.z = Math.sin(t * 1.1) * 0.05 * idle;
    headPivot.rotation.x = 0.06 * w + Math.sin(t * 2.1) * 0.012 * idle;
    bodyPivot.rotation.x = 0;
    for (let i = 0; i < tailPivots.length; i++) {
      const tp = tailPivots[i];
      const sway = Math.sin(t * 2.3 + i * 2.1) * 0.09 * idle + Math.sin(walkPhase * 2 + i) * 0.14 * w;
      tp.pivot.rotation.z = tp.baseZ + sway;
      tp.pivot.rotation.x = tp.baseX + Math.abs(Math.cos(walkPhase * 2)) * 0.12 * w;
    }
    if (haloPivot) {
      haloPivot.position.y = haloBaseY + Math.sin(t * 1.3) * 8e-3;
      haloPivot.rotation.z = Math.sin(t * 0.7) * 0.05;
    }
    for (const wp of wingPivots) {
      wp.pivot.rotation.z = wp.baseZ + Math.sin(t * 2.4 + wp.s) * (0.08 + 0.12 * w);
    }
    bodyMotionSignal = 0;
    if (action) {
      actionT += d;
      if (actionT >= actionDur) {
        action = null;
        actionT = 0;
      }
    }
    if (action) {
      const dur = actionDur;
      const u = Math.min(1, actionT / dur);
      const lerp = THREE.MathUtils.lerp;
      const inK = actionT < BLEND_IN ? easeOutBack(actionT / BLEND_IN) : 1;
      const remain = dur - actionT;
      const outWin = BLEND_OUT_OVERRIDE[action] || BLEND_OUT;
      const outK = remain < outWin ? easeInOutCubic(Math.max(0, remain) / outWin) : 1;
      const aBlend = Math.min(inK, outK);
      if (action === "wave") {
        const ai = 1;
        const targetZ = 2;
        const targetX = Math.sin(actionT * 9.5) * 0.42;
        armPivots[ai].rotation.z = lerp(armPivots[ai].rotation.z, targetZ, aBlend);
        armPivots[ai].rotation.x = lerp(armPivots[ai].rotation.x, targetX, aBlend);
      } else if (action === "bow") {
        const DOWN_FRAC = 0.28;
        const bowK = u < DOWN_FRAC ? easeOutCubic(u / DOWN_FRAC) : 1 - easeInCubic((u - DOWN_FRAC) / (1 - DOWN_FRAC));
        const MAX_BOW = 0.95;
        const targetPitch = bowK * MAX_BOW;
        bodyPivot.rotation.x = lerp(bodyPivot.rotation.x, targetPitch, aBlend);
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, -0.14, aBlend);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, 0.14, aBlend);
        armPivots[0].rotation.x = lerp(armPivots[0].rotation.x, bowK * 0.3, aBlend);
        armPivots[1].rotation.x = lerp(armPivots[1].rotation.x, bowK * 0.3, aBlend);
        bodyMotionSignal = targetPitch;
      } else if (action === "jump") {
        const JUMP_H = 0.24;
        const h = Math.sin(u * Math.PI) * JUMP_H;
        const crouchK = u < 0.12 ? 1 - u / 0.12 : 0;
        const landPhase = u > 0.82 ? (u - 0.82) / 0.18 : -1;
        const landK = landPhase >= 0 ? Math.sin(Math.min(1, landPhase) * Math.PI) : 0;
        const squash = Math.max(crouchK, landK);
        const peakK = Math.max(0, 1 - Math.abs(u - 0.5) / 0.28);
        wrapper.position.y = lerp(wrapper.position.y, h, aBlend);
        const scaleY = 1 - 0.24 * squash + 0.16 * peakK;
        const scaleXZ = 1 + 0.16 * squash - 0.1 * peakK;
        wrapper.scale.x = lerp(wrapper.scale.x, scaleXZ, aBlend);
        wrapper.scale.z = lerp(wrapper.scale.z, scaleXZ, aBlend);
        wrapper.scale.y = lerp(wrapper.scale.y, scaleY, aBlend);
        const armUp = Math.sin(u * Math.PI);
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, -(0.5 + armUp * 1.3), aBlend);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, 0.5 + armUp * 1.3, aBlend);
        armPivots[0].rotation.x = lerp(armPivots[0].rotation.x, -armUp * 0.6, aBlend);
        armPivots[1].rotation.x = lerp(armPivots[1].rotation.x, -armUp * 0.6, aBlend);
        if (legPivots.length) {
          const legTuck = peakK * 0.32 - squash * 0.22;
          legPivots[0].rotation.x = lerp(legPivots[0].rotation.x, legTuck, aBlend);
          legPivots[1].rotation.x = lerp(legPivots[1].rotation.x, legTuck, aBlend);
        }
        if (kneePivots.length) {
          const kneeBend = -(squash * 0.85 + peakK * 0.3);
          kneePivots[0].rotation.x = lerp(kneePivots[0].rotation.x, kneeBend, aBlend);
          kneePivots[1].rotation.x = lerp(kneePivots[1].rotation.x, kneeBend, aBlend);
        }
        bodyMotionSignal = h / JUMP_H;
      } else if (action === "clap") {
        const clapPhase = actionT * 9;
        const meet = Math.pow(Math.max(0, Math.sin(clapPhase)), 0.7);
        const clapX = -1.5;
        const clapZ = 0.34 + meet * 0.56;
        armPivots[0].rotation.x = lerp(armPivots[0].rotation.x, clapX, aBlend);
        armPivots[1].rotation.x = lerp(armPivots[1].rotation.x, clapX, aBlend);
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, clapZ, aBlend);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, -clapZ, aBlend);
      } else if (action === "dance") {
        const dp = actionT * 8.6;
        const swingA = Math.sin(dp);
        const bounce = Math.abs(Math.sin(dp)) * 0.1;
        const hipSway = swingA * 0.16;
        wrapper.position.y = lerp(wrapper.position.y, bounce, aBlend);
        wrapper.rotation.z = lerp(wrapper.rotation.z, hipSway, aBlend);
        if (legPivots.length) {
          legPivots[0].rotation.x = lerp(legPivots[0].rotation.x, swingA * 1, aBlend);
          legPivots[1].rotation.x = lerp(legPivots[1].rotation.x, -swingA * 1, aBlend);
        }
        if (kneePivots.length) {
          kneePivots[0].rotation.x = lerp(kneePivots[0].rotation.x, -Math.max(0, -swingA) * 0.8, aBlend);
          kneePivots[1].rotation.x = lerp(kneePivots[1].rotation.x, -Math.max(0, swingA) * 0.8, aBlend);
        }
        armPivots[0].rotation.x = lerp(armPivots[0].rotation.x, -swingA * 0.85, aBlend);
        armPivots[1].rotation.x = lerp(armPivots[1].rotation.x, swingA * 0.85, aBlend);
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, -(0.65 + Math.abs(swingA) * 0.3), aBlend);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, 0.65 + Math.abs(swingA) * 0.3, aBlend);
        headPivot.rotation.z = lerp(headPivot.rotation.z, Math.sin(dp * 0.5) * 0.14, aBlend);
        bodyMotionSignal = hipSway * 1.4;
      } else if (action === "kick") {
        const COCK_FRAC = 0.24, SNAP_FRAC = 0.46;
        const HIP_MAX = 0.85, KNEE_COCK = 1.15;
        let hipK, kneeK;
        if (u < COCK_FRAC) {
          const c = easeOutCubic(u / COCK_FRAC);
          hipK = c * 0.25;
          kneeK = c * KNEE_COCK;
        } else if (u < SNAP_FRAC) {
          const sN = easeOutBack((u - COCK_FRAC) / (SNAP_FRAC - COCK_FRAC));
          hipK = 0.25 + sN * 0.75;
          kneeK = KNEE_COCK * (1 - Math.min(1, sN));
        } else {
          const r = easeInOutCubic((u - SNAP_FRAC) / (1 - SNAP_FRAC));
          hipK = 1 - r;
          kneeK = 0;
        }
        wrapper.position.y = lerp(wrapper.position.y, 5e-3, aBlend);
        if (legPivots.length) {
          legPivots[1].rotation.x = lerp(legPivots[1].rotation.x, -hipK * HIP_MAX, aBlend);
          legPivots[0].rotation.x = lerp(legPivots[0].rotation.x, hipK * 0.03, aBlend);
        }
        if (kneePivots.length) {
          kneePivots[1].rotation.x = lerp(kneePivots[1].rotation.x, -kneeK, aBlend);
        }
        bodyPivot.rotation.x = lerp(bodyPivot.rotation.x, -hipK * 0.14, aBlend);
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, -0.75, aBlend);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, 0.75, aBlend);
        bodyMotionSignal = hipK * 0.5;
      } else if (action === "run") {
        const rp = actionT * 13;
        const swingR = Math.sin(rp);
        bodyPivot.rotation.x = lerp(bodyPivot.rotation.x, 0.3, aBlend);
        if (legPivots.length) {
          legPivots[0].rotation.x = lerp(legPivots[0].rotation.x, swingR * 0.95, aBlend);
          legPivots[1].rotation.x = lerp(legPivots[1].rotation.x, -swingR * 0.95, aBlend);
        }
        if (kneePivots.length) {
          kneePivots[0].rotation.x = lerp(kneePivots[0].rotation.x, -Math.max(0, -swingR) * 1.3, aBlend);
          kneePivots[1].rotation.x = lerp(kneePivots[1].rotation.x, -Math.max(0, swingR) * 1.3, aBlend);
        }
        armPivots[0].rotation.x = lerp(armPivots[0].rotation.x, -swingR * 0.9, aBlend);
        armPivots[1].rotation.x = lerp(armPivots[1].rotation.x, swingR * 0.9, aBlend);
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, -0.35, aBlend);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, 0.35, aBlend);
        wrapper.position.y = lerp(wrapper.position.y, Math.abs(Math.sin(rp)) * 0.07, aBlend);
        bodyMotionSignal = swingR * 0.5;
      } else if (action === "sit") {
        const DOWN_FRAC = 0.3, HOLD_FRAC = 0.72;
        let sitK;
        if (u < DOWN_FRAC) sitK = easeOutCubic(u / DOWN_FRAC);
        else if (u < HOLD_FRAC) sitK = 1;
        else sitK = 1 - easeInOutCubic((u - HOLD_FRAC) / (1 - HOLD_FRAC));
        wrapper.position.y = lerp(wrapper.position.y, isGhost ? -sitK * 0.018 : sitWrapperY(sitK), aBlend);
        if (legPivots.length) {
          legPivots[0].rotation.x = lerp(legPivots[0].rotation.x, -sitK * 0.4, aBlend);
          legPivots[1].rotation.x = lerp(legPivots[1].rotation.x, -sitK * 0.4, aBlend);
        }
        if (kneePivots.length) {
          kneePivots[0].rotation.x = lerp(kneePivots[0].rotation.x, sitK * 1.9, aBlend);
          kneePivots[1].rotation.x = lerp(kneePivots[1].rotation.x, sitK * 1.9, aBlend);
        }
        bodyPivot.rotation.x = lerp(bodyPivot.rotation.x, sitK * 0.15, aBlend);
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, -0.5 - sitK * 0.15, aBlend);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, 0.5 + sitK * 0.15, aBlend);
        bodyMotionSignal = sitK * 0.4;
      } else if (action === "breakdance") {
        const dp = actionT * 10;
        const groove = Math.sin(dp * 0.5) * 0.04;
        wrapper.position.y = lerp(wrapper.position.y, 0.01, aBlend);
        wrapper.rotation.z = lerp(wrapper.rotation.z, groove, aBlend);
        const kneeAmt0 = 0.1 + Math.max(0, Math.sin(dp)) * 0.15;
        const kneeAmt1 = 0.1 + Math.max(0, -Math.sin(dp)) * 0.15;
        if (kneePivots.length) {
          kneePivots[0].rotation.x = lerp(kneePivots[0].rotation.x, kneeAmt0, aBlend);
          kneePivots[1].rotation.x = lerp(kneePivots[1].rotation.x, kneeAmt1, aBlend);
        }
        if (legPivots.length) {
          legPivots[0].rotation.x = lerp(legPivots[0].rotation.x, -kneeAmt0, aBlend);
          legPivots[1].rotation.x = lerp(legPivots[1].rotation.x, -kneeAmt1, aBlend);
        }
        armPivots[0].rotation.x = lerp(armPivots[0].rotation.x, Math.sin(dp + Math.PI) * 0.9, aBlend);
        armPivots[1].rotation.x = lerp(armPivots[1].rotation.x, Math.sin(dp) * 0.9, aBlend);
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, -0.85, aBlend);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, 0.85, aBlend);
        headPivot.rotation.z = lerp(headPivot.rotation.z, groove * 0.6, aBlend);
        bodyMotionSignal = groove * 1.3;
      } else if (action === "jumpingjack") {
        const jp = actionT * 9;
        const openK = Math.max(0, Math.sin(jp));
        wrapper.position.y = lerp(wrapper.position.y, openK * 0.05, aBlend);
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, -0.5 - openK * 1.3, aBlend);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, 0.5 + openK * 1.3, aBlend);
        armPivots[0].rotation.x = lerp(armPivots[0].rotation.x, -openK * 0.5, aBlend);
        armPivots[1].rotation.x = lerp(armPivots[1].rotation.x, -openK * 0.5, aBlend);
        if (legPivots.length) {
          legPivots[0].rotation.z = lerp(legPivots[0].rotation.z, -openK * 0.5, aBlend);
          legPivots[1].rotation.z = lerp(legPivots[1].rotation.z, openK * 0.5, aBlend);
        }
        bodyMotionSignal = openK * 0.4;
      } else if (action === "heart") {
        const HOLD_START = 0.25, HOLD_END = 0.78;
        let hK;
        if (u < HOLD_START) hK = Math.min(1, easeOutBack(u / HOLD_START));
        else if (u < HOLD_END) hK = 1;
        else hK = 1 - easeInOutCubic((u - HOLD_END) / (1 - HOLD_END));
        armPivots[0].rotation.x = lerp(armPivots[0].rotation.x, -1.1 * hK, aBlend);
        armPivots[1].rotation.x = lerp(armPivots[1].rotation.x, -1.1 * hK, aBlend);
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, 0.66 * hK, aBlend);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, -0.66 * hK, aBlend);
        headPivot.rotation.z = lerp(headPivot.rotation.z, Math.sin(t * 2.2) * 0.1 * hK, aBlend);
        wrapper.position.y = lerp(wrapper.position.y, Math.max(0, Math.sin(u * Math.PI)) * 0.03, aBlend);
        bodyMotionSignal = hK * 0.3;
      } else if (action === "sulk") {
        const droopK = Math.min(1, u / 0.22);
        bodyPivot.rotation.x = lerp(bodyPivot.rotation.x, droopK * 0.32, aBlend);
        headPivot.rotation.x = lerp(headPivot.rotation.x, droopK * 0.22, aBlend);
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, -0.3, aBlend);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, 0.3, aBlend);
        const stompPhase = actionT * 7;
        const stompK = Math.max(0, Math.sin(stompPhase));
        if (legPivots.length) {
          legPivots[1].rotation.x = lerp(legPivots[1].rotation.x, -stompK * 0.4, aBlend);
        }
        if (kneePivots.length) {
          kneePivots[1].rotation.x = lerp(kneePivots[1].rotation.x, -stompK * 0.55, aBlend);
        }
        wrapper.position.y = lerp(wrapper.position.y, 0.012, aBlend);
        bodyMotionSignal = droopK * 0.3;
      }
    }
    flyBlend += ((flying ? 1 : 0) - flyBlend) * Math.min(1, d * 6);
    if (flyBlend > 2e-3) {
      const fb = flyBlend;
      const lerp = THREE.MathUtils.lerp;
      const flap = Math.sin(t * 15);
      bodyPivot.rotation.x = lerp(bodyPivot.rotation.x, 0.22, fb);
      if (legPivots.length) {
        legPivots[0].rotation.x = lerp(legPivots[0].rotation.x, 0.45 + flap * 0.05, fb);
        legPivots[1].rotation.x = lerp(legPivots[1].rotation.x, 0.45 - flap * 0.05, fb);
        legPivots[0].rotation.z = lerp(legPivots[0].rotation.z, -0.1, fb);
        legPivots[1].rotation.z = lerp(legPivots[1].rotation.z, 0.1, fb);
      }
      if (kneePivots.length) {
        kneePivots[0].rotation.x = lerp(kneePivots[0].rotation.x, -0.35, fb);
        kneePivots[1].rotation.x = lerp(kneePivots[1].rotation.x, -0.35, fb);
      }
      if (wingPivots.length) {
        for (const wp of wingPivots) {
          wp.pivot.rotation.z = lerp(wp.pivot.rotation.z, wp.baseZ + flap * 0.6, fb);
        }
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, -0.9, fb);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, 0.9, fb);
        armPivots[0].rotation.x = lerp(armPivots[0].rotation.x, -0.15, fb);
        armPivots[1].rotation.x = lerp(armPivots[1].rotation.x, -0.15, fb);
      } else {
        const armFlap = flap * 0.55;
        armPivots[0].rotation.z = lerp(armPivots[0].rotation.z, -1.35, fb);
        armPivots[1].rotation.z = lerp(armPivots[1].rotation.z, 1.35, fb);
        armPivots[0].rotation.x = lerp(armPivots[0].rotation.x, -0.35 + armFlap, fb);
        armPivots[1].rotation.x = lerp(armPivots[1].rotation.x, -0.35 - armFlap, fb);
      }
      wrapper.position.y = lerp(wrapper.position.y, 0.02 + flap * 0.015, fb);
      headPivot.rotation.x = lerp(headPivot.rotation.x, -0.08, fb);
      bodyMotionSignal = flap * 0.4 * fb;
    }
    bodyMotionLag += (bodyMotionSignal - bodyMotionLag) * Math.min(1, d * 9);
    const secK = bodyMotionSignal - bodyMotionLag;
    if (secK !== 0 || bodyMotionLag !== 0) {
      for (const e of earPivots) {
        e.pivot.rotation.x = secK * 0.32;
        e.pivot.rotation.z = secK * 0.22 * e.s;
      }
      for (const tp of tailPivots) {
        tp.pivot.rotation.x += secK * 0.24;
      }
    }
  }
  function dispose() {
    for (const g of geos) g.dispose();
    for (const m of mats) {
      if (m.map) m.map.dispose();
      m.dispose();
    }
    for (const tx of texs) tx.dispose();
  }
  function setFlying(v) {
    flying = !!v;
  }
  return { group, height: HEIGHT, update, dispose, setWound, ouch, playAction, setFlying };
}
export {
  buildChibi
};
