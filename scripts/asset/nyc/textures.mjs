// scripts/asset/nyc/textures.mjs — **절차 생성 타일 텍스처**(자작). 감독 지시 2026-09-06 *"벽돌 텍스쳐 · 전체
// 노말맵"*, 팀장 판정 C(BOARD): 외부 CC0 는 감독이 화면을 보고 «가짜 같다» 고 한 회차에만 §6 로 재론.
//
// 전부 결정적(seed)이고 `scripts/lib/png-encode.mjs`(의존성 0) 로 PNG 를 만든다. 타일 1장 = `TILE_M`(2m)
// 월드 길이 — `modules.box` 의 평면 투영 UV 와 짝이다(지시서 §6 «512~1024 공유 타일»).
//
//   brickAlbedo(seed, mat)  — 러닝본드 벽돌 + 줄눈. 벽돌색은 팔레트(art-direction §2), 줄눈 `#B9AA98`.
//                            baseColorFactor 는 흰색 → 텍스처가 색을 정한다(줄눈이 벽돌색으로 물들지 않게).
//   brickNormal(seed)       — 벽돌 높이맵(면 1 · 줄눈 0 · 면 위 미세 요철) → Sobel 노말.
//   stuccoNormal(seed)      — 아이보리 입면·실내 벽: 저주파 굴곡 + 미세 입자.
//   asphaltNormal(seed)     — 골재 입자. walkNormal(seed) — 1.5m 판 줄눈(타일 2m 안에 4/3 판 — 이음새가
//                            안 맞아 줄눈이 2m 마다 반복되게 판을 2m/2 = 1.0m 로 둔다; 아트 기준 1.5m 는
//                            «절제된 줄눈» 이 목적이라 1.0m 격자로 대체하고 그 사실을 여기 적는다).
//
// 노말맵 규약: 접선 공간, +z 가 면 밖, R=x G=y B=z (glTF/three 기본). 강도는 재질의 `normalTexture.scale`
// 이 정하고 런타임 노브 `?nrm=` 가 그 위에 곱한다(`world-glb/features/glb-normal.ts`).

import { encodePng } from '../../lib/png-encode.mjs';

export const TEX_SIZE = 512;
export const GROUT = '#B9AA98';   // art-direction §2 벽돌 줄눈

/** 결정적 해시 노이즈(0..1) — 정수 격자에서 값 노이즈, 선형 보간 */
function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x, y, cell, seed) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const s = (t) => t * t * (3 - 2 * t);
  const a = hash(gx, gy, seed), b = hash(gx + 1, gy, seed), c = hash(gx, gy + 1, seed), d = hash(gx + 1, gy + 1, seed);
  const u = s(fx), v = s(fy);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
/** 타일 경계에서 이어지도록 좌표를 감싼다 */
const wrap = (v, n) => ((v % n) + n) % n;

function hexRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** 벽돌 격자 — 코스 높이 76mm·벽돌 240mm(줄눈 10mm 포함), 2m 타일에 약 26 코스 × 8.3 장 */
const BRICK = { courseM: 0.076, lenM: 0.24, groutM: 0.011 };
export function brickCell(px, py, size) {
  const m = 2 / size;                          // 픽셀 → m (TILE_M = 2)
  const y = py * m, x = px * m;
  const course = Math.floor(y / BRICK.courseM);
  const yIn = y - course * BRICK.courseM;
  const shift = (course % 2) * (BRICK.lenM / 2);
  const col = Math.floor((x + shift) / BRICK.lenM);
  const xIn = (x + shift) - col * BRICK.lenM;
  const inGrout = yIn < BRICK.groutM || xIn < BRICK.groutM;
  return { course, col, inGrout, xIn, yIn };
}

/** 벽돌 알베도 PNG — `mat` 은 팔레트 hex(벽돌 면 기준색) */
export function brickAlbedo(seed, brickHex) {
  const size = TEX_SIZE, base = hexRgb(brickHex), grout = hexRgb(GROUT);
  return encodePng(size, size, (x, y) => {
    const c = brickCell(x, y, size);
    if (c.inGrout) {
      const g = 0.9 + 0.2 * noise(wrap(x, size), wrap(y, size), 6, seed + 7);
      return grout.map((v) => v * g);
    }
    // 벽돌마다 밝기·채도 변주(0.78~1.08) + 면 위 미세 얼룩
    const k = 0.78 + 0.30 * hash(c.col, c.course, seed);
    const spot = 0.94 + 0.12 * noise(wrap(x, size), wrap(y, size), 9, seed + 3);
    return base.map((v) => v * k * spot);
  });
}

/** 높이 함수 → Sobel 노말 PNG. `height(x,y)` 는 0..1, `strength` 는 기울기 배율 */
function normalFromHeight(height, strength) {
  const size = TEX_SIZE;
  const h = (x, y) => height(wrap(x, size), wrap(y, size));
  return encodePng(size, size, (x, y) => {
    const dx = (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
    const dy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));
    let nx = -dx * strength, ny = -dy * strength, nz = 1;
    const len = Math.hypot(nx, ny, nz);
    nx /= len; ny /= len; nz /= len;
    return [(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255];
  });
}

export function brickNormal(seed) {
  const size = TEX_SIZE;
  return normalFromHeight((x, y) => {
    const c = brickCell(x, y, size);
    if (c.inGrout) return 0;
    // 줄눈 가장자리 둥글림 + 면 위 미세 요철
    const edge = Math.min(c.xIn - BRICK.groutM, c.yIn - BRICK.groutM) / 0.012;
    const rim = Math.min(1, Math.max(0, edge));
    return 0.6 + 0.4 * rim + 0.08 * (noise(x, y, 5, seed + 11) - 0.5);
  }, 2.2);
}

export function stuccoNormal(seed) {
  return normalFromHeight((x, y) => 0.5 + 0.35 * (noise(x, y, 48, seed + 21) - 0.5) + 0.15 * (noise(x, y, 4, seed + 22) - 0.5), 1.6);
}

export function asphaltNormal(seed) {
  return normalFromHeight((x, y) => 0.5 + 0.5 * (noise(x, y, 3, seed + 31) - 0.5) + 0.1 * (noise(x, y, 24, seed + 32) - 0.5), 1.2);
}

/** 보도 — 1.0m 판 격자 줄눈(폭 12mm, 깊이) + 미세 입자 */
export function walkNormal(seed) {
  const size = TEX_SIZE, m = 2 / size, slab = 1.0, groutW = 0.012;
  return normalFromHeight((x, y) => {
    const xm = (x * m) % slab, ym = (y * m) % slab;
    const inGrout = xm < groutW || ym < groutW;
    return (inGrout ? 0.2 : 0.7) + 0.1 * (noise(x, y, 4, seed + 41) - 0.5);
  }, 1.8);
}

/** 재질 이름 → 어떤 타일을 쓰는가. 색 이름은 `layout.mjs` PALETTE 키 */
export function textureSetFor(name) {
  if (name === 'brickA' || name === 'brickA_B' || name === 'brickB') return { albedo: `brick.${name}`, normal: 'brick.n', normalScale: 1.0 };
  if (name.endsWith('Trim')) return { normal: 'stucco.n', normalScale: 0.6 };
  if (name.startsWith('ivory') || name === 'roomWall' || name === 'roomCeil') return { normal: 'stucco.n', normalScale: 0.8 };
  if (name === 'asphalt') return { normal: 'asphalt.n', normalScale: 0.7 };
  if (name === 'walk' || name === 'curb' || name === 'roomFloor') return { normal: 'walk.n', normalScale: 0.9 };
  return null;   // metal · glass — 텍스처 없음
}
