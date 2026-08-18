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

  // ── 스타일라이즈드 지형 (감독 지시 2026-08-18, 모바일 게임 광고 화면 참조) ──
  //
  // 감독 코멘트: *"단순히 한 색을 쓰지 말고 Noise로 2~3개 초록색을 섞어야 합니다"*
  // (밝은 #78D833 · 기본 #54B92C · 어두운 #328C2A).
  //
  // ⚠ **평균 휘도를 `GRASS_BASE`(0x74ae5b) 근방으로 유지한다.** 밤 조명 배수가 잔디
  // 색의 휘도에서 유도되므로(`decide/ground-albedo.ts`), 여기가 밝아지면 **밤에 잔디가
  // 형광으로 뜨는** 옛 사고가 재현된다.
  //
  // **실측(2026-08-18, 아래 함수를 256² 전 픽셀에 돌려 잰 값)**: 이 타일의 평균 RGB 는
  // (83.5, 182.7, 44.5), 휘도 151.6 이고 `GRASS_BASE` 는 155.7 — **-2.6%** 다.
  // (감독이 준 3색의 단순 평균은 150.3 이지만 얼룩 분포가 밝은 쪽에 조금 치우쳐 있어
  // 타일 실측은 그보다 높다. 그래서 «3색 평균» 이 아니라 **타일을 직접 재야** 한다.)
  // 색을 만지면 이 실측을 다시 뜬다 — 숫자를 옮겨 적기만 하면 그 순간 거짓이 된다.

  /** 게임풍 잔디 — 초록 3색을 저주파 얼룩으로 섞고 잔 결을 얹는다 */
  'grass-toon.png': (x, y) => {
    // 감독 지정 3색. 순서는 어두움 → 기본 → 밝음
    const dark = [50, 140, 42];
    const base = [84, 185, 44];
    const lite = [120, 216, 51];
    // 큰 얼룩(4칸) — 이것이 «한 장을 복사한 것처럼» 안 보이게 하는 주역이다.
    // 잔디는 위에서 내려다보는 면적이 넓어서, 저주파가 없으면 반복이 바로 읽힌다.
    const blob = wobble(x, y, 4, 21);
    // 잔 결(32칸) — 풀잎 방향을 흉내낸다. 실제 풀은 인스턴싱 메시가 따로 서므로
    // 여기는 «그 사이에 비치는 바닥» 이고, 그래서 대비를 약하게 둔다.
    const fine = wobble(x, y, 32, 23) * 0.35;
    const t = Math.max(0, Math.min(1, blob * 0.5 + 0.5 + fine * 0.5));
    // 3색 보간 — 두 색만 쓰면 중간이 산술 평균으로 흐려져 «3색을 섞었다» 가 안 보인다
    const mix2 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
    const c = t < 0.5 ? mix2(dark, base, t * 2) : mix2(base, lite, (t - 0.5) * 2);
    // 잔 명암을 곱으로 얹는다. 더하기로 하면 어두운 쪽이 회색으로 뜬다(채도 손실)
    const shade = 1 + wobble(x, y, 64, 29) * 0.06;
    return [c[0] * shade, c[1] * shade, c[2] * shade];
  },

  /**
   * 게임풍 흙 — 광장·지면용.
   *
   * ⚠ **밝게 굽는다(평균 ~235).** `ground` 파츠는 인스턴스 컬러(`tones` 평균 ≈ 0.42)가
   * 색을 갖고 있고 맵은 거기에 **곱해진다** — 중간 밝기로 구우면 지면이 통째로 어두워져
   * 「텍스처를 얹었더니 땅이 죽었다」가 된다. 흰색 근처로 굽고 명암만 담는다.
   * (`parts/garden.ts` 의 `tones` 가 «흰색 근처여야 한다» 고 적은 것과 같은 이유다.)
   */
  'dirt-toon.png': (x, y) => {
    // 큰 패치 + 잔 알갱이. 자갈(`pebble.png`)보다 곱게 — 저쪽은 물속 바닥이라 점점이가
    // 목적이지만 여기는 밟는 땅이라 얼룩이 커야 «흙» 으로 읽힌다.
    const v = 0.62 * wobble(x, y, 6, 31) + 0.38 * wobble(x, y, 24, 37);
    const base = 235 + v * 16;
    // 노랑기 있는 흙색 방향으로 살짝 기울인다. 중성 회색이면 «시멘트» 로 보인다.
    return [base, base * 0.965, base * 0.915];
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
