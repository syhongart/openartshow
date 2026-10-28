#!/usr/bin/env node
// 임시 작품 이미지 생성기 — `frontend/assets/art/*.png`
//
// 실행: node scripts/make-placeholder-art.mjs   (저장소 루트 기준)
//
// ── 왜 있는가 (감독 카드 2026-08-18) ───────────────────────────────────────
// *"임시 이미지로 먼저 해라"* — 라이브에 작품이 **0개**라 감독이 자기 전시를 한 번도 못
// 봤고, 그보다 급한 것이 있다: **W8-7 이 만든 그림 재질 경로를 CI 가 한 줄도 안 탄다.**
// `place()` 는 걸린 작품이 있어야 도는데 배포 문서가 `items: []` 였다.
//
// 감독 실물 작품이 본류다. 이것은 **그 전까지 경로를 살려 두는 것**이고, 그래서 이름이
// placeholder 다.
//
// ── IP: 자작이다 (팀장 조건 1, 2026-08-18) ────────────────────────────────
// 전부 수식으로 그린다 — 외부 에셋도, 생성 이미지도 아니다. `gen-textures.mjs` 와 같은
// 계보이고 그래서 §6 법무 게이트를 안 탄다.
//
// ⚠ 팀장 조건 문언: *"IP 조항상 허용 경로는 자작 또는 이미 §6 을 통과한 「Gemini 생성
// 이미지」 유형뿐이다 — **웹에서 긁어온 이미지는 임시라도 안 된다.**"* 「임시니까」가
// 예외 사유가 되는 순간 그 예외는 영구가 된다.
//
// ── ⚠ 만료가 있다 (팀장 조건 2) ───────────────────────────────────────────
// 감독 실물 이미지가 도착하면 **교체**한다. 그 항목이 `docs/OWNER-TODO.md` 에 있다 —
// **안 적으면 임시가 영구가 된다.** 그리고 존재 대조 게이트는 파일명을 하드코딩하지
// 않으므로(배치 문서에서 읽는다) 교체해도 그대로 동작한다.
//
// ── 무엇을 그리나 ──────────────────────────────────────────────────────────
// 「작품처럼 보이는 것」을 흉내 내지 않는다. **한눈에 임시라고 알아볼 수 있어야** 감독이
// 그것을 자기 작품으로 오인하지 않는다. 그래서 색 띠 + 격자 + 모서리 표식이다.
//
// 그런데 **밝기 판정에는 쓸 수 있어야** 한다(W8-7 이 방금 그 축을 열었다) — 그래서 중간
// 회색 계조를 반드시 넣는다. ⚠ 순색만 넣으면 색공간 결함이 안 갈린다: sRGB 변환은
// 극값(0·255)을 그대로 두므로 **순색 픽스처는 고쳐도 안 고쳐도 같은 값을 낸다**
// (W8-7 에서 마젠타로 재다가 그 사각을 실제로 밟았다).

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from './lib/png-encode.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'frontend', 'assets', 'art');

/**
 * 가로·세로. **정사각이 아니다** — 종횡비가 1이 아닌 것을 일부러 고른다.
 * `ArtworkItem.ar` 이 폭/높이이고, 정사각으로만 재면 그 필드가 잘못 쓰여도 안 드러난다.
 */
const W = 900;
const H = 600;

/** 색 띠. 채도가 다른 셋 — 밝기 판정에서 서로 구별된다 */
const BANDS = [
  [0x4a, 0x6f, 0xa5],
  [0xc2, 0x8b, 0x4e],
  [0x6b, 0x9e, 0x78],
];

/**
 * 한 장을 그린다.
 *
 * ⓐ 배경: 세로로 **중간 회색 계조**(64 → 192). 색공간 표시가 빠지면 이 구간이 밝게 뜬다
 * ⓑ 색 띠: 가로 3분할. 시안이 「어느 작품인지」를 구별하는 표식
 * ⓒ 격자: 20px 주기의 옅은 선. 원근·해상도 감을 준다
 * ⓓ 모서리 표식: 좌상단에 seed 만큼의 사각 — 몇 번째 임시본인지 눈으로 센다
 */
function draw(seed) {
  const band = BANDS[seed % BANDS.length];
  return (x, y) => {
    // ⓐ 세로 계조
    const t = y / (H - 1);
    let v = 64 + t * 128;
    let [r, g, b] = [v, v, v];

    // ⓑ 색 띠 — 가운데 가로 밴드
    const inBand = y > H * 0.38 && y < H * 0.62;
    if (inBand) {
      const k = 0.55;
      r = r * (1 - k) + band[0] * k;
      g = g * (1 - k) + band[1] * k;
      b = b * (1 - k) + band[2] * k;
    }

    // ⓒ 격자
    if (x % 60 === 0 || y % 60 === 0) { r += 18; g += 18; b += 18; }

    // ⓓ 모서리 표식 — seed+1 개의 사각
    const marks = seed + 1;
    if (y > 24 && y < 56) {
      for (let i = 0; i < marks; i++) {
        const x0 = 24 + i * 44;
        if (x > x0 && x < x0 + 32) { r = 240; g = 240; b = 240; }
      }
    }
    return [r, g, b];
  };
}

mkdirSync(OUT, { recursive: true });

// ⚠ 파일명은 계약을 통과해야 한다 — `decide/artwork.ts` 의 `ART_STEM_RE` 가 영숫자와
// `_-./` 만 받는다(한글 불가). 확장자는 `IMAGE_EXT` 의 넷 중 하나.
const names = ['placeholder-01.png', 'placeholder-02.png', 'placeholder-03.png'];
const made = names.map((name, i) => {
  const buf = encodePng(W, H, draw(i));
  writeFileSync(join(OUT, name), buf);
  return `${name} (${(buf.length / 1024).toFixed(1)}KB)`;
});
console.log(`임시 작품 ${made.length}장 생성 (${W}×${H}): ${made.join(' · ')}`);
console.log(`  → 종횡비 ar = ${(W / H).toFixed(4)}`);
