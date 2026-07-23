import * as THREE from "three";
import { mergeGeometries } from "../utils/BufferGeometryUtils.js";
import { makeRand, sharedTreeMats } from "./scene-textures.js";
function bakeGroupByMaterial(group) {
  group.updateMatrixWorld(true);
  const buckets = /* @__PURE__ */ new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  const meshes = [];
  for (const [mat, geos] of buckets) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = !(mat.alphaTest > 0);
    meshes.push(m);
    for (const g of geos) g.dispose();
  }
  return meshes;
}
function buildDetailedTree(seed, opts) {
  const rand = makeRand(seed);
  const { bark: barkMat, leaves: leafMats } = sharedTreeMats();
  const maxLevel = opts.maxLevel;
  const leafScale = opts.leafScale;
  function addLeafCluster(parent, y, s) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.3 * s, 1.8 * s),
        leafMats[Math.floor(rand() * leafMats.length)]
      );
      plane.position.set(
        (rand() - 0.5) * 0.7 * s,
        y + (rand() - 0.5) * 0.6 * s,
        (rand() - 0.5) * 0.7 * s
      );
      plane.rotation.set(
        (rand() - 0.5) * 1,
        rand() * Math.PI,
        (rand() - 0.5) * 0.7
      );
      parent.add(plane);
    }
  }
  function branch(level, len, rad) {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(rad * 0.62, rad, len, 7);
    geo.translate(0, len / 2, 0);
    const limb = new THREE.Mesh(geo, barkMat);
    limb.castShadow = true;
    g.add(limb);
    if (level < maxLevel) {
      const kids = 2 + (rand() > 0.45 ? 1 : 0);
      for (let k = 0; k < kids; k++) {
        const child = branch(
          level + 1,
          len * (0.6 + rand() * 0.18),
          rad * 0.6
        );
        child.position.y = len * (0.8 + rand() * 0.18);
        const tiltBase = level === 0 ? 0.24 : 0.4 + level * 0.12;
        child.rotation.z = tiltBase + rand() * 0.3;
        child.rotation.y = k / kids * Math.PI * 2 + rand() * 0.9;
        g.add(child);
      }
      if (level >= 1 && rand() > 0.45) {
        addLeafCluster(g, len * 0.75, leafScale * 0.7);
      }
    } else {
      addLeafCluster(g, len * 0.9, leafScale);
      if (rand() > 0.5) addLeafCluster(g, len * 0.55, leafScale * 0.8);
    }
    return g;
  }
  return branch(0, opts.trunkLen, opts.trunkRad);
}
export {
  bakeGroupByMaterial,
  buildDetailedTree
};
