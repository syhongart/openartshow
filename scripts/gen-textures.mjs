#!/usr/bin/env node
// 심리스 텍스처 생성기 — `frontend/assets/textures/*.png`
//
// 실행: node scripts/gen-textures.mjs   (저장소 루트 기준)
//
// ── 왜 생성기인가 (감독 지시 2026-08-14) ────────────────────────────────────
// *"땅의 텍스쳐 심리스를 주면 그대로 적용할수있게 하는거지."* — 감독이 자기 텍스처를 줄
// 것이고 그것이 본류다. 이 파일이 만드는 셋은 **시작점**이다: 화면을 열었을 때 고를 것이
// 하나도 없으면 슬라이더만 있고 아무 일도 안 나는 화면이 되고, 그러면 감독이 「되는지」를
// 판정할 수가 없다.
//
// ── IP: 자작이다 ────────────────────────────────────────────────────────────
// 전부 수식으로 그린다 — 외부 에셋도, 생성 이미지도 아니다. CLAUDE.md 의 「파츠 에셋은 자작
// 지오메트리만」과 같은 계보이고, 그래서 §6 법무 게이트를 안 탄다. (AI 생성 이미지는 그쪽이
// 아니라 「외부 에셋」이라는 판정이 2026-08-13 에 있었다 — 여기서는 해당 없다.)
//
// ── 심리스의 조건 ──────────────────────────────────────────────────────────
// 각 픽셀 함수가 **x·y 에 대해 폭·높이 주기로 순환**해야 한다. 그래서 아래는 전부
// `sin(2πx/W)` 꼴이거나 모듈러 격자다 — 경계에서 값이 이어진다. `SIZE` 를 바꿔도 성립한다.
//
// ⚠ **결과 PNG 는 추적한다.** 「생성물은 추적하지 않는다」 규율의 대상은 배포 때 CI 가 만드는
// 산출물(`devlog/*.html` 등)이고, 이것은 **자산**이다 — `devlog/img/` 를 추적하는 것과 같은
// 이유다(생성 디렉터리라고 통째로 무시하면 자산이 날아간다. 실제로 한 번 날렸다).

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng, clamp255 } from './lib/png-encode.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'frontend', 'assets', 'textures');

/**
 * 한 변 픽셀 수. 256 인 것은 판단이다 — 512 면 파일이 넷 다 합쳐 1MB 를 넘고, 128 이면
 * 배율을 낮췄을 때(타일 하나가 크게 보일 때) 뭉갠 것이 보인다.
 */
const SIZE = 256;

// ── PNG 인코딩 ─────────────────────────────────────────────────────────────
// ⚠ **인코더는 여기 없다** — `scripts/lib/png-encode.mjs` 가 SSOT 다(W8-8). 원래는 이
// 파일 안에 있었는데 작품 이미지 생성기가 같은 것을 필요로 하면서 **두 벌이 될 뻔했다.**
// 옮긴 뒤 텍스처 3종을 재생성해 md5 바이트 동일을 확인했다.
//
// `png(rgb)` 는 이 파일의 정사각 규약(`SIZE`)을 그대로 유지하는 얇은 감싸개다 — 폭·높이를
// 아는 것은 이 생성기이고, 인코더는 그것을 인자로 받는다.

const png = (rgb) => encodePng(SIZE, SIZE, rgb);

/**
 * 값 잡음. **격자 주기로 순환한다** — `sin` 합이라 경계에서 저절로 이어진다.
 * 진짜 펄린이 아니어도 된다: 우리가 필요한 것은 «균일하지 않게 보이는 것» 이고,
 * 심리스가 구조적으로 보장되는 쪽이 훨씬 중요하다.
 */
/** 격자점 해시 → 0~1. 정수 좌표만 받는다 */
function hash(ix, iy, seed) {
  let h = ix * 374761393 + iy * 668265263 + seed * 2246822519;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const smooth = (t) => t * t * (3 - 2 * t);

/**
 * 값 노이즈 한 옥타브. **`cells` 격자를 모듈러로 감아 심리스가 구조적으로 보장된다** —
 * 오른쪽 끝 칸의 이웃이 왼쪽 첫 칸이므로 경계에서 값이 정확히 이어진다.
 *
 * ⚠ **`sin` 합을 버리고 이것으로 왔다.** 첫 판본은 `sin(u)·cos(v)` 곱이라 마루가 축에
 * 정렬돼 **X 자 격자**가 보였고, 축을 기울여 다섯 방향으로 섞은 두 번째 판본은 자갈에서
 * **세로 줄무늬**가 남았다(둘 다 생성물을 직접 열어 실측). 삼각함수 합은 방향이 유한하므로
 * 주파수를 올릴수록 그 방향이 드러난다 — 격자 해시는 방향 자체가 없다.
 */
function noise(x, y, cells, seed) {
  const g = SIZE / cells;
  const fx = x / g;
  const fy = y / g;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  const m = (v) => ((v % cells) + cells) % cells;
  const a = hash(m(x0), m(y0), seed);
  const b = hash(m(x0 + 1), m(y0), seed);
  const c = hash(m(x0), m(y0 + 1), seed);
  const d = hash(m(x0 + 1), m(y0 + 1), seed);
  const top = a + (b - a) * tx;
  const bot = c + (d - c) * tx;
  return top + (bot - top) * ty; // 0~1
}

/**
 * 옥타브 합 — 큰 얼룩 위에 잔 알갱이. 반환은 대략 -1~1.
 *
 * `cells` 는 **`SIZE` 의 약수**여야 격자가 픽셀에 딱 떨어진다(2·4·8·16·32·64).
 */
function wobble(x, y, cells, seed) {
  let s = 0;
  let norm = 0;
  for (let i = 0; i < 3; i++) {
    const w = 1 / (1 + i * 1.4);
    s += (noise(x, y, cells * 2 ** i, seed + i * 17) - 0.5) * 2 * w;
    norm += w;
  }
  return s / norm;
}

/** 격자선까지의 거리(0=선 위, 1=칸 한가운데). `mod` 라 경계에서 이어진다 */
function gridEdge(x, y, cells) {
  const c = SIZE / cells;
  const fx = Math.min((x % c) / c, 1 - (x % c) / c);
  const fy = Math.min((y % c) / c, 1 - (y % c) / c);
  return Math.min(fx, fy) * 2; // 0~1
}

// ── 셋 ─────────────────────────────────────────────────────────────────────
// 색은 world2 팔레트에 어울리는 중성색으로 잡았다. **최종 룩은 감독 판정**이고, 배율·각도·
// 반짝임을 화면에서 돌려 본 뒤에야 정해진다 — 그래서 여기 값에 근거를 길게 적지 않는다.

const TEXTURES = {
  /** 광장·길에 어울리는 정사각 포장. 4×4 칸 */
  'stone-tile.png': (x, y) => {
    const e = gridEdge(x, y, 4);
    const grout = e < 0.06 ? 0.55 : 1; // 줄눈
    const n = wobble(x, y, 8, 1) * 10;
    const base = 150 + n;
    return [base * grout, (base - 4) * grout, (base - 10) * grout];
  },

  /** 건물 벽에 어울리는 벽돌. 세로로 반 칸씩 어긋난다 */
  'brick.png': (x, y) => {
    const rows = 8;
    const h = SIZE / rows;
    const row = Math.floor(y / h);
    // 홀수 줄을 반 칸 민다 — `SIZE` 가 짝수 칸이라 좌우 경계에서 이어진다
    const sx = (x + (row % 2 ? SIZE / 8 : 0)) % SIZE;
    const cw = SIZE / 4;
    const fx = Math.min((sx % cw) / cw, 1 - (sx % cw) / cw) * 2;
    const fy = Math.min((y % h) / h, 1 - (y % h) / h) * 2;
    const mortar = Math.min(fx, fy) < 0.09;
    const n = wobble(x, y, 8, 3) * 12;
    return mortar
      ? [172 + n * 0.3, 168 + n * 0.3, 160 + n * 0.3]
      : [150 + n, 96 + n * 0.8, 78 + n * 0.6];
  },

  /** 물속 바닥에 어울리는 자갈 — 격자 없이 잡음만 */
  'pebble.png': (x, y) => {
    // 자갈은 «점점이» 여야 한다 — 큰 얼룩(8칸)과 잔 알갱이(32칸)를 겹친다.
    const v = 0.55 * wobble(x, y, 8, 5) + 0.45 * wobble(x, y, 32, 11);
    const base = 128 + v * 38;
    return [base * 0.92, base * 0.95, base * 0.86];
  },
};

mkdirSync(OUT, { recursive: true });
const made = [];
for (const [name, fn] of Object.entries(TEXTURES)) {
  const buf = png(fn);
  writeFileSync(join(OUT, name), buf);
  made.push(`${name} (${(buf.length / 1024).toFixed(1)}KB)`);
}

// 팔레트 매니페스트. `assets/models/index.json` 과 **같은 형태**다 — 손으로 관리하면
// 어긋나므로 여기서 함께 굽는다(그 어긋남을 `tests/world2-textures.test.ts` 가 검사한다).
writeFileSync(
  join(OUT, 'index.json'),
  `${JSON.stringify({ textures: Object.keys(TEXTURES).sort() }, null, 2)}\n`,
);

console.log(`텍스처 ${made.length}장 생성: ${made.join(' · ')}`);
