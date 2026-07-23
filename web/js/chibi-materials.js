import * as THREE from "three";
import { mergeVertices } from "../utils/BufferGeometryUtils.js";
let _toonRamp = null;
function toonRamp() {
  if (_toonRamp) return _toonRamp;
  const data = new Uint8Array([230, 255]);
  const tex = new THREE.DataTexture(data, 2, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  _toonRamp = tex;
  return tex;
}
const SAT_BOOST = 1.5;
function vivid(color, mul) {
  const c = new THREE.Color(color);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * (mul || SAT_BOOST)), hsl.l);
  return c;
}
function toon(color, doubleSide) {
  return new THREE.MeshToonMaterial({
    color: vivid(color),
    gradientMap: toonRamp(),
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide
  });
}
const SKIN_SAT_BOOST = 1.6;
const SKIN_ACHROMATIC_GATE = 0.1;
function vividSkin(color) {
  const c = new THREE.Color(color);
  const chroma = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
  if (chroma < SKIN_ACHROMATIC_GATE) return c;
  const hsl = {};
  c.getHSL(hsl);
  let l = hsl.l;
  if (l > 0.65) {
    const pull = Math.min(0.14, (l - 0.65) * 1) * Math.min(1, chroma * 3);
    l -= pull;
  }
  c.setHSL(hsl.h, Math.min(1, hsl.s * SKIN_SAT_BOOST), l);
  return c;
}
const OUTLINE_SCALE = 0.8;
function addOutline(mesh, thickness, matCollect, geoCollect) {
  thickness *= OUTLINE_SCALE;
  let g = mesh.geometry.clone();
  try {
    g.deleteAttribute("normal");
    g.deleteAttribute("uv");
    const welded = mergeVertices(g);
    welded.computeVertexNormals();
    g.dispose();
    g = welded;
  } catch (_) {
    if (!g.attributes.normal) g.computeVertexNormals();
  }
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  if (nor) {
    for (let i = 0; i < pos.count; i++) {
      pos.setXYZ(
        i,
        pos.getX(i) + nor.getX(i) * thickness,
        pos.getY(i) + nor.getY(i) * thickness,
        pos.getZ(i) + nor.getZ(i) * thickness
      );
    }
    pos.needsUpdate = true;
  }
  const base = mesh.userData && mesh.userData.outlineBase ? new THREE.Color(mesh.userData.outlineBase) : mesh.material && mesh.material.color ? mesh.material.color.clone() : new THREE.Color("#3f2d22");
  const lum = 0.2126 * base.r + 0.7152 * base.g + 0.0722 * base.b;
  base.multiplyScalar(lum > 0.6 ? 0.5 : lum > 0.3 ? 0.55 : 0.65);
  const mat = new THREE.MeshBasicMaterial({ color: base, side: THREE.BackSide });
  const outline = new THREE.Mesh(g, mat);
  mesh.add(outline);
  matCollect.push(mat);
  if (geoCollect) geoCollect.push(g);
}
function lathePoints(pairs) {
  return pairs.map(([x, y]) => new THREE.Vector2(x, y));
}
function drawMiniHeart(x, cx, cy, r) {
  x.beginPath();
  x.moveTo(cx, cy + r * 0.85);
  x.bezierCurveTo(cx - r * 1.4, cy - r * 0.35, cx - r * 0.5, cy - r * 1.2, cx, cy - r * 0.35);
  x.bezierCurveTo(cx + r * 0.5, cy - r * 1.2, cx + r * 1.4, cy - r * 0.35, cx, cy + r * 0.85);
  x.closePath();
  x.fill();
}
function shirtTexture(topHex, pattern) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = vivid(topHex).getStyle();
  x.fillRect(0, 0, 128, 128);
  if (pattern === "stripe") {
    x.fillStyle = "rgba(255,255,255,0.5)";
    for (let y = 0; y < 128; y += 34) x.fillRect(0, y, 128, 17);
  } else if (pattern === "dot") {
    x.fillStyle = "rgba(255,255,255,0.72)";
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const cx = (col * 32 + (row % 2 ? 16 : 0) + 16) % 128;
        x.beginPath();
        x.arc(cx, row * 32 + 16, 7, 0, Math.PI * 2);
        x.fill();
      }
    }
  } else if (pattern === "heart") {
    x.fillStyle = "rgba(255,255,255,0.82)";
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cx = (col * 43 + (row % 2 ? 21 : 0) + 14) % 128;
        drawMiniHeart(x, cx, row * 43 + 22, 8);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.4, 2.4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function furStripeTexture(baseHex) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = vivid(baseHex).getStyle();
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = "rgba(46,28,14,0.72)";
  for (const [bx, w] of [[8, 6], [33, 9], [59, 5], [85, 9], [110, 6]]) {
    x.beginPath();
    x.moveTo(bx, 0);
    x.quadraticCurveTo(bx + 6, 64, bx, 128);
    x.lineTo(bx + w, 128);
    x.quadraticCurveTo(bx + 6 + w, 64, bx + w, 0);
    x.closePath();
    x.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.4, 1.1);
  tex.offset.set(0.2, 0);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function buildMuzzleGeo(species, R) {
  let g = null;
  if (species === "dog") {
    g = new THREE.CapsuleGeometry(0.11 * R, 0.34 * R, 4, 10);
    g.rotateX(Math.PI / 2);
    g.translate(0, -0.13 * R, 0.74 * R);
  } else if (species === "fox") {
    g = new THREE.ConeGeometry(0.15 * R, 0.4 * R, 14);
    g.rotateX(-Math.PI / 2);
    g.translate(0, -0.06 * R, 0.74 * R);
  } else if (species === "bear") {
    g = new THREE.SphereGeometry(0.24 * R, 16, 12);
    g.scale(1, 0.85, 1.25);
    g.translate(0, -0.1 * R, 0.74 * R);
  } else if (species === "raccoon") {
    g = new THREE.SphereGeometry(0.2 * R, 14, 12);
    g.scale(0.9, 0.8, 1.2);
    g.translate(0, -0.08 * R, 0.76 * R);
  } else if (species === "panda") {
    g = new THREE.SphereGeometry(0.14 * R, 12, 10);
    g.scale(1, 0.82, 0.95);
    g.translate(0, -0.05 * R, 0.74 * R);
  }
  return g;
}
export {
  addOutline,
  buildMuzzleGeo,
  furStripeTexture,
  lathePoints,
  shirtTexture,
  toon,
  toonRamp,
  vivid,
  vividSkin
};
