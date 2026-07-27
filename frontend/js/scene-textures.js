import * as THREE from "three";
function makeRand(seedInit) {
  let seed = seedInit;
  return () => {
    seed = seed * 1664525 + 1013904223 >>> 0;
    return seed / 4294967296;
  };
}
function canvasToNormalTexture(canvas, strength) {
  const w = canvas.width;
  const h = canvas.height;
  const src = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = (src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114) / 255;
  }
  const at = (x, y) => lum[(y + h) % h * w + (x + w) % w];
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d");
  const img = octx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const gy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
      const i = (y * w + x) * 4;
      d[i] = Math.round((-gx * inv * 0.5 + 0.5) * 255);
      d[i + 1] = Math.round((gy * inv * 0.5 + 0.5) * 255);
      d[i + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      d[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function createParquetMaps(opts = {}) {
  const outSize = opts.size || 1024;
  const wantNormal = opts.normal !== false;
  const size = 1024;
  const plankW = 256;
  const plankH = 64;
  const N = size / plankW;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#b98d5f";
  ctx.fillRect(0, 0, size, size);
  const oakTones = ["#b98d5f", "#c49a6c", "#ad8153", "#bf9265", "#b28758", "#c79f73", "#a97d4f"];
  function drawPlank(x, y, seed) {
    const rand2 = makeRand(seed);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, plankW, plankH);
    ctx.clip();
    ctx.fillStyle = oakTones[Math.floor(rand2() * oakTones.length)];
    ctx.fillRect(x, y, plankW, plankH);
    const grainCount = 10 + Math.floor(rand2() * 8);
    for (let g = 0; g < grainCount; g++) {
      const gy = y + rand2() * plankH;
      const dark = rand2() > 0.5;
      const alpha = 0.05 + rand2() * 0.1;
      ctx.strokeStyle = dark ? `rgba(90, 60, 30, ${alpha})` : `rgba(235, 210, 175, ${alpha})`;
      ctx.lineWidth = 0.6 + rand2() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      const seg = 4;
      for (let s = 1; s <= seg; s++) {
        const sx = x + plankW / seg * s;
        const sy = gy + (rand2() - 0.5) * 7;
        ctx.quadraticCurveTo(
          x + plankW / seg * (s - 0.5),
          gy + (rand2() - 0.5) * 10,
          sx,
          sy
        );
      }
      ctx.stroke();
    }
    if (rand2() > 0.82) {
      const kx = x + plankW * (0.2 + rand2() * 0.6);
      const ky = y + plankH * (0.25 + rand2() * 0.5);
      const kr = 2 + rand2() * 4;
      const grad = ctx.createRadialGradient(kx, ky, 0.5, kx, ky, kr);
      grad.addColorStop(0, "rgba(70, 45, 22, 0.55)");
      grad.addColorStop(0.6, "rgba(100, 68, 36, 0.28)");
      grad.addColorStop(1, "rgba(100, 68, 36, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(60, 38, 18, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, plankW - 1.5, plankH - 1.5);
    ctx.strokeStyle = "rgba(255, 240, 215, 0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + plankH - 1);
    ctx.lineTo(x + 1, y + 1);
    ctx.lineTo(x + plankW - 1, y + 1);
    ctx.stroke();
    ctx.restore();
  }
  for (let row = 0; row * plankH < size; row++) {
    const offset = row % 4 * (plankW / 4);
    const y = row * plankH;
    for (let col = 0; col <= N; col++) {
      const x = col * plankW - offset;
      if (x >= size) continue;
      const k = (col % N + N) % N;
      drawPlank(x, y, 12345 + row * 977 + k * 131);
    }
  }
  const rand = makeRand(24601);
  const noise = ctx.getImageData(0, 0, size, size);
  const d = noise.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 10;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(noise, 0, 0);
  let mapCanvas = canvas;
  if (outSize !== size) {
    mapCanvas = document.createElement("canvas");
    mapCanvas.width = outSize;
    mapCanvas.height = outSize;
    mapCanvas.getContext("2d").drawImage(canvas, 0, 0, outSize, outSize);
  }
  const map = new THREE.CanvasTexture(mapCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(16, 16);
  map.anisotropy = 16;
  if (!wantNormal) return { map, normalMap: null };
  const normalMap = canvasToNormalTexture(canvas, 1.6);
  normalMap.repeat.set(16, 16);
  normalMap.anisotropy = 16;
  return { map, normalMap };
}
let plasterMapsCache = null;
function createPlasterMaps() {
  if (plasterMapsCache) return plasterMapsCache;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#f7f6f2";
  ctx.fillRect(0, 0, size, size);
  const rand = makeRand(98765);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 8;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 60; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 20 + rand() * 60;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.5;
    grad.addColorStop(0, light ? "rgba(255,255,255,0.03)" : "rgba(190,188,182,0.03)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 1.5);
  map.anisotropy = 4;
  const normalMap = canvasToNormalTexture(canvas, 0.9);
  normalMap.repeat.set(4, 1.5);
  plasterMapsCache = { map, normalMap };
  return plasterMapsCache;
}
let concreteMapsCache = null;
function createConcreteMaps() {
  if (concreteMapsCache) return concreteMapsCache;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#8f8b84";
  ctx.fillRect(0, 0, size, size);
  const rand = makeRand(31337);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 16;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 16; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 30 + rand() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(70, 66, 60, ${0.04 + rand() * 0.05})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = 0; y < size; y += 128) {
    ctx.fillStyle = "rgba(50, 47, 42, 0.5)";
    ctx.fillRect(0, y, size, 3);
    ctx.fillStyle = "rgba(200, 195, 186, 0.25)";
    ctx.fillRect(0, y + 3, size, 1);
  }
  for (let y = 64; y < size; y += 128) {
    for (let x = 64; x < size; x += 128) {
      const g = ctx.createRadialGradient(x, y, 0.5, x, y, 5);
      g.addColorStop(0, "rgba(40, 37, 33, 0.8)");
      g.addColorStop(1, "rgba(40, 37, 33, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  const normalMap = canvasToNormalTexture(canvas, 0.8);
  concreteMapsCache = { map, normalMap };
  return concreteMapsCache;
}
let grassMapsCache = null;
function createGrassMaps() {
  if (grassMapsCache) return grassMapsCache;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#5f8a3e";
  ctx.fillRect(0, 0, size, size);
  const rand = makeRand(24680);
  for (let i = 0; i < 90; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 20 + rand() * 80;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.5;
    grad.addColorStop(0, light ? "rgba(140, 180, 90, 0.12)" : "rgba(60, 95, 40, 0.12)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 5e3; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const g = 110 + rand() * 80;
    ctx.strokeStyle = `rgba(${40 + rand() * 40}, ${g}, ${30 + rand() * 30}, ${0.25 + rand() * 0.3})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 3, y - 1.5 - rand() * 3);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(60, 60);
  map.anisotropy = 4;
  const normalMap = canvasToNormalTexture(canvas, 0.8);
  normalMap.repeat.set(60, 60);
  grassMapsCache = { map, normalMap };
  return grassMapsCache;
}
let barkTexCache = null;
let barkNormalCache = null;
function createBarkNormal() {
  createBarkTexture();
  return barkNormalCache;
}
function createBarkTexture() {
  if (barkTexCache) return barkTexCache;
  const w = 256, h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#6b5138";
  ctx.fillRect(0, 0, w, h);
  const rand = makeRand(77777);
  for (let i = 0; i < 46; i++) {
    const x0 = rand() * w;
    const dark = rand() > 0.35;
    ctx.strokeStyle = dark ? `rgba(38, 26, 15, ${0.25 + rand() * 0.4})` : `rgba(150, 120, 88, ${0.15 + rand() * 0.3})`;
    ctx.lineWidth = 1 + rand() * 4;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    let x = x0;
    for (let y = 0; y <= h; y += h / 10) {
      x += (rand() - 0.5) * 14;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 4 + rand() * 10;
    const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, "rgba(30, 20, 10, 0.6)");
    grad.addColorStop(0.6, "rgba(90, 66, 42, 0.3)");
    grad.addColorStop(1, "rgba(90, 66, 42, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 18;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 2);
  barkTexCache = tex;
  barkNormalCache = canvasToNormalTexture(canvas, 1.2);
  barkNormalCache.repeat.copy(tex.repeat);
  return tex;
}
const leafTexCache = {};
function createLeafClusterTexture(variant) {
  if (leafTexCache[variant]) return leafTexCache[variant];
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const rand = makeRand(50505 + variant * 999);
  const baseHue = 95 + variant * 14;
  for (let i = 0; i < 150; i++) {
    const ang = rand() * Math.PI * 2;
    const dist = Math.pow(rand(), 0.6) * size * 0.45;
    const x = size / 2 + Math.cos(ang) * dist;
    const y = size / 2 + Math.sin(ang) * dist;
    const leafLen = 7 + rand() * 13;
    const leafW = leafLen * (0.4 + rand() * 0.25);
    const rot = rand() * Math.PI;
    const light = 22 + rand() * 26;
    const sat = 40 + rand() * 30;
    ctx.fillStyle = `hsla(${baseHue + (rand() - 0.5) * 24}, ${sat}%, ${light}%, ${0.75 + rand() * 0.25})`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, leafLen, leafW, 0, 0, Math.PI * 2);
    ctx.fill();
    if (rand() > 0.6) {
      ctx.strokeStyle = `hsla(${baseHue}, 45%, ${light + 18}%, 0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-leafLen * 0.8, 0);
      ctx.lineTo(leafLen * 0.8, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  leafTexCache[variant] = tex;
  return tex;
}
function makeLeafMaterials() {
  return [0, 1, 2].map((v) => new THREE.MeshStandardMaterial({
    map: createLeafClusterTexture(v),
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0
  }));
}
let _treeMats = null;
function sharedTreeMats() {
  if (!_treeMats) {
    _treeMats = {
      bark: new THREE.MeshStandardMaterial({
        map: createBarkTexture(),
        normalMap: createBarkNormal(),
        normalScale: new THREE.Vector2(0.9, 0.9),
        roughness: 0.95,
        metalness: 0
      }),
      leaves: makeLeafMaterials()
    };
  }
  return _treeMats;
}
let _aoStripTex = null;
function getAOStripTexture() {
  if (_aoStripTex) return _aoStripTex;
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "rgba(10,8,5,0.44)");
  grad.addColorStop(0.55, "rgba(10,8,5,0.12)");
  grad.addColorStop(1, "rgba(10,8,5,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 128);
  _aoStripTex = new THREE.CanvasTexture(canvas);
  return _aoStripTex;
}
export {
  createBarkNormal,
  createBarkTexture,
  createConcreteMaps,
  createGrassMaps,
  createParquetMaps,
  createPlasterMaps,
  getAOStripTexture,
  makeRand,
  sharedTreeMats
};
