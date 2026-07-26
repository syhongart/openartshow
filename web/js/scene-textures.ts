// @ts-nocheck — 순수 이동(C-3 scene 분해), strict 타입은 후속 작업.
// scene-textures.js — 절차적 텍스처/재질 leaf 모듈. makeRand(시드 LCG)·
//   canvasToNormalTexture·파케/회반죽/콘크리트/잔디 맵·수피/잎 재질군·
//   sharedTreeMats·getAOStripTexture + 캐시 싱글톤 8개 전부(단일 소유 —
//   분산 시 텍스처 힙 2배). createParquetMaps는 무캐시 유지. scene.js에서 분해(C-3 S1).
import * as THREE from 'three';

// 시드 고정 LCG — 실행마다 동일한 배치/텍스처
export function makeRand(seedInit) {
  let seed = seedInit;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
// ---------------------------------------------------------------------------
// 노말맵 생성 유틸 — 알베도 밝기를 높이로 해석해 Sobel 기울기로 노말을 만든다.
// 타일 경계는 랩(wrap) 샘플링으로 계산하므로 심리스가 유지된다.
// 노말맵은 색 데이터가 아니므로 SRGB 지정 금지(Linear 기본값 사용).
// ---------------------------------------------------------------------------
function canvasToNormalTexture(canvas, strength) {
  const w = canvas.width;
  const h = canvas.height;
  const src = canvas.getContext('2d').getImageData(0, 0, w, h).data;

  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    lum[i] = (src[i * 4] * 0.299 + src[i * 4 + 1] * 0.587 + src[i * 4 + 2] * 0.114) / 255;
  }
  const at = (x, y) => lum[((y + h) % h) * w + ((x + w) % w)];

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
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
// ---------------------------------------------------------------------------
// 절차적 텍스처: 오크 파케 바닥 (1024x1024, 심리스)
// 플랭크의 톤/결/옹이를 (행, 열 mod N) 시드로 결정 → 오른쪽 경계를 넘는 플랭크가
// 왼쪽 첫 플랭크와 완전히 동일해져 타일 경계가 보이지 않는다.
// ---------------------------------------------------------------------------
// opts.size: map 최종 한 변(기본 1024 — 미술관 종전 동작). 내부 드로잉은 항상 1024 좌표계로 하고
//   마지막에 다운스케일한다 — 플랭크 격자·심리스 랩 로직이 size에 묶여 있어 좌표계를 줄이면 결·옹이
//   선 굵기(lineWidth 고정값)가 상대적으로 굵어져 룩이 변하기 때문. 다운스케일은 룩을 보존한다.
// opts.normal: normalMap 생성 여부(기본 true — 미술관 종전 동작). 오픈월드·빌더(space-parts의
//   parquetTex, roughness 0.5)는 디자이너 실렌더 판정으로 노멀 기여가 육안 0이라 끈다(−5.33MB).
//   미술관(scene-building, roughness 0.4·normalScale 0.7)은 판정 조건이 달라 종전 유지 — 무인자 호출.
export function createParquetMaps(opts = {}) {
  const outSize = opts.size || 1024;
  const wantNormal = opts.normal !== false;
  const size = 1024;
  const plankW = 256; // 4 plank/행 (N=4)
  const plankH = 64;  // 16행 정확히 — 상하 경계도 심리스
  const N = size / plankW;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); // 노이즈 getImageData + canvasToNormalTexture 리드백 최적화

  ctx.fillStyle = '#b98d5f';
  ctx.fillRect(0, 0, size, size);

  const oakTones = ['#b98d5f', '#c49a6c', '#ad8153', '#bf9265', '#b28758', '#c79f73', '#a97d4f'];

  // 한 장의 플랭크를 자기 영역에 클리핑해 그린다 — 결/옹이가 이웃 플랭크나
  // 캔버스 경계를 침범하지 않으므로 상하좌우 랩이 항상 맞아떨어진다.
  function drawPlank(x, y, seed) {
    const rand = makeRand(seed);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, plankW, plankH);
    ctx.clip();

    ctx.fillStyle = oakTones[Math.floor(rand() * oakTones.length)];
    ctx.fillRect(x, y, plankW, plankH);

    const grainCount = 10 + Math.floor(rand() * 8);
    for (let g = 0; g < grainCount; g++) {
      const gy = y + rand() * plankH;
      const dark = rand() > 0.5;
      const alpha = 0.05 + rand() * 0.10;
      ctx.strokeStyle = dark
        ? `rgba(90, 60, 30, ${alpha})`
        : `rgba(235, 210, 175, ${alpha})`;
      ctx.lineWidth = 0.6 + rand() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      const seg = 4;
      for (let s = 1; s <= seg; s++) {
        const sx = x + (plankW / seg) * s;
        const sy = gy + (rand() - 0.5) * 7;
        ctx.quadraticCurveTo(
          x + (plankW / seg) * (s - 0.5),
          gy + (rand() - 0.5) * 10,
          sx, sy
        );
      }
      ctx.stroke();
    }

    if (rand() > 0.82) {
      const kx = x + plankW * (0.2 + rand() * 0.6);
      const ky = y + plankH * (0.25 + rand() * 0.5);
      const kr = 2 + rand() * 4;
      const grad = ctx.createRadialGradient(kx, ky, 0.5, kx, ky, kr);
      grad.addColorStop(0, 'rgba(70, 45, 22, 0.55)');
      grad.addColorStop(0.6, 'rgba(100, 68, 36, 0.28)');
      grad.addColorStop(1, 'rgba(100, 68, 36, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(kx, ky, kr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 플랭크 경계 홈(어두움) + 상단 베벨 하이라이트 — 노말맵의 주요 높이 신호
    ctx.strokeStyle = 'rgba(60, 38, 18, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, plankW - 1.5, plankH - 1.5);
    ctx.strokeStyle = 'rgba(255, 240, 215, 0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + plankH - 1);
    ctx.lineTo(x + 1, y + 1);
    ctx.lineTo(x + plankW - 1, y + 1);
    ctx.stroke();

    ctx.restore();
  }

  for (let row = 0; row * plankH < size; row++) {
    const offset = (row % 4) * (plankW / 4);
    const y = row * plankH;
    // col=N은 오른쪽 경계를 덮는 랩 사본 — (col mod N) 시드가 col=0과 동일
    for (let col = 0; col <= N; col++) {
      const x = col * plankW - offset;
      if (x >= size) continue;
      const k = ((col % N) + N) % N;
      drawPlank(x, y, 12345 + row * 977 + k * 131);
    }
  }

  // 미세 노이즈 (픽셀 단위 무상관 노이즈 — 경계 무관)
  const rand = makeRand(24601);
  const noise = ctx.getImageData(0, 0, size, size);
  const d = noise.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 10;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(noise, 0, 0);

  // 실측 비율: repeat 16 → 타일 3.125m, 플랭크 폭 ≈19.5cm × 길이 ≈78cm (파케 블록)
  // outSize < 1024면 다운스케일한 사본을 map으로 쓴다(GPU 업로드 −75%, 근경 2.2m 육안 무손실 판정).
  let mapCanvas = canvas;
  if (outSize !== size) {
    mapCanvas = document.createElement('canvas');
    mapCanvas.width = outSize; mapCanvas.height = outSize;
    mapCanvas.getContext('2d').drawImage(canvas, 0, 0, outSize, outSize);
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
// ---------------------------------------------------------------------------
// 절차적 텍스처: 뮤지엄 화이트 벽 (미세 회반죽 노이즈)
// ---------------------------------------------------------------------------
let plasterMapsCache = null;
export function createPlasterMaps() {
  if (plasterMapsCache) return plasterMapsCache;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); // 노이즈 getImageData + canvasToNormalTexture 리드백 최적화

  ctx.fillStyle = '#f7f6f2';
  ctx.fillRect(0, 0, size, size);

  const rand = makeRand(98765);

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 8;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  for (let i = 0; i < 60; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 20 + rand() * 60;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.5;
    grad.addColorStop(0, light ? 'rgba(255,255,255,0.03)' : 'rgba(190,188,182,0.03)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
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
// ---------------------------------------------------------------------------
// 절차적 텍스처: 노출 콘크리트 (기둥/커브용) — 거푸집 조인트 + 얼룩 + 타이홀
// ---------------------------------------------------------------------------
let concreteMapsCache = null;
export function createConcreteMaps() {
  if (concreteMapsCache) return concreteMapsCache;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); // 노이즈 getImageData + canvasToNormalTexture 리드백 최적화

  ctx.fillStyle = '#8f8b84';
  ctx.fillRect(0, 0, size, size);

  const rand = makeRand(31337);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 16;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // 물얼룩/거푸집 얼룩
  for (let i = 0; i < 16; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 30 + rand() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(70, 66, 60, ${0.04 + rand() * 0.05})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 수평 거푸집 조인트 (128px 주기 → 상하 심리스)
  for (let y = 0; y < size; y += 128) {
    ctx.fillStyle = 'rgba(50, 47, 42, 0.5)';
    ctx.fillRect(0, y, size, 3);
    ctx.fillStyle = 'rgba(200, 195, 186, 0.25)';
    ctx.fillRect(0, y + 3, size, 1);
  }
  // 폼 타이 홀
  for (let y = 64; y < size; y += 128) {
    for (let x = 64; x < size; x += 128) {
      const g = ctx.createRadialGradient(x, y, 0.5, x, y, 5);
      g.addColorStop(0, 'rgba(40, 37, 33, 0.8)');
      g.addColorStop(1, 'rgba(40, 37, 33, 0)');
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
// ---------------------------------------------------------------------------
// 절차적 텍스처: 잔디
// ---------------------------------------------------------------------------
let grassMapsCache = null;
export function createGrassMaps() {
  if (grassMapsCache) return grassMapsCache;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); // canvasToNormalTexture 리드백 최적화

  ctx.fillStyle = '#5f8a3e';
  ctx.fillRect(0, 0, size, size);

  const rand = makeRand(24680);

  // 색 변화 패치
  for (let i = 0; i < 90; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 20 + rand() * 80;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.5;
    grad.addColorStop(0, light ? 'rgba(140, 180, 90, 0.12)' : 'rgba(60, 95, 40, 0.12)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 잔디 잎 스트로크
  for (let i = 0; i < 5000; i++) {
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
// ---------------------------------------------------------------------------
// 디테일 나무 — 나무껍질 텍스처 + 재귀 가지 분기 + 알파 잎 클러스터
// ---------------------------------------------------------------------------
let barkTexCache = null;
let barkNormalCache = null;
export function createBarkNormal() {
  createBarkTexture(); // 캔버스 생성 보장
  return barkNormalCache;
}
export function createBarkTexture() {
  if (barkTexCache) return barkTexCache;
  const w = 256, h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); // 노이즈 getImageData + canvasToNormalTexture 리드백 최적화

  ctx.fillStyle = '#6b5138';
  ctx.fillRect(0, 0, w, h);

  const rand = makeRand(77777);

  // 세로 골 (수피 균열)
  for (let i = 0; i < 46; i++) {
    const x0 = rand() * w;
    const dark = rand() > 0.35;
    ctx.strokeStyle = dark
      ? `rgba(38, 26, 15, ${0.25 + rand() * 0.4})`
      : `rgba(150, 120, 88, ${0.15 + rand() * 0.3})`;
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

  // 가로 마디/옹이
  for (let i = 0; i < 8; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 4 + rand() * 10;
    const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, 'rgba(30, 20, 10, 0.6)');
    grad.addColorStop(0.6, 'rgba(90, 66, 42, 0.3)');
    grad.addColorStop(1, 'rgba(90, 66, 42, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 미세 노이즈
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 18;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
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
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  // 투명 배경 위에 잎을 흩뿌림 — 알파로 실루엣이 뚫려 보임

  const rand = makeRand(50505 + variant * 999);
  const baseHue = 95 + variant * 14; // 녹색 계열 변주

  for (let i = 0; i < 150; i++) {
    // 중앙에 밀집, 가장자리로 갈수록 성김
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
    // 잎맥 하이라이트
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
    metalness: 0.0,
  }));
}
// 나무 공유 머티리얼 — 모든 디테일 트리가 같은 재질을 쓰면 숲 전체를
// 머티리얼별 소수 메시로 병합할 수 있다 (나무당 76콜 → 숲 전체 4콜)
let _treeMats = null;
export function sharedTreeMats() {
  if (!_treeMats) {
    _treeMats = {
      bark: new THREE.MeshStandardMaterial({
        map: createBarkTexture(),
        normalMap: createBarkNormal(),
        normalScale: new THREE.Vector2(0.9, 0.9),
        roughness: 0.95,
        metalness: 0.0,
      }),
      leaves: makeLeafMaterials(),
    };
  }
  return _treeMats;
}
// ---------------------------------------------------------------------------
// 접촉 그림자(가짜 AO) — 벽·바닥 접합부를 따라 어두운 그라디언트 스트립을 깐다.
// 베이크드 라이팅 전환 후 남은 "전체가 균일하게 떠 보이는" 플랫함을, 코너를
// 접지시키는 저비용 정적 디캘(층당 4장)로 회복한다. 실시간 AO 비용 0.
// ---------------------------------------------------------------------------
let _aoStripTex = null;
export function getAOStripTexture() {
  if (_aoStripTex) return _aoStripTex;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(10,8,5,0.44)'); // 벽 쪽 — 진하게 (0.34→0.44)
  grad.addColorStop(0.55, 'rgba(10,8,5,0.12)');
  grad.addColorStop(1, 'rgba(10,8,5,0)'); // 실내 쪽 — 소멸
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 128);
  _aoStripTex = new THREE.CanvasTexture(canvas);
  return _aoStripTex;
}
