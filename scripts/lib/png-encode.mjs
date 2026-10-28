// scripts/lib/png-encode.mjs — **의존성 0 PNG 인코더.** 자산 생성기들이 공유한다.
//
// ── 왜 라이브러리가 아니라 이것인가 ────────────────────────────────────────
// `sharp`·`pngjs` 를 받지 않는다. PNG 의 최소 형태는 시그니처 + IHDR + IDAT + IEND 이고
// 압축은 Node 내장 zlib 이면 된다. 의존성 하나를 아끼려는 것이 아니라 **생성기가 무엇을
// 하는지 다음 사람이 통째로 읽을 수 있게** 하려는 것이다.
//
// ── 왜 SSOT 로 뽑았나 (W8-8) ──────────────────────────────────────────────
// 원본은 `scripts/gen-textures.mjs` 안에 있었고 `SIZE` 상수에 묶여 정사각만 만들었다.
// 작품 이미지 생성기(`make-placeholder-art.mjs`)가 같은 것을 필요로 하는 순간
// **인코더가 두 벌이 된다** — 이 저장소가 색·수치 미러링으로 세 번 데인 그 형태다.
// 그래서 여기로 옮기고 폭·높이를 인자로 받게 했다. `gen-textures.mjs` 는 이제 소비자다.
//
// ⚠ **옮기면서 산출물이 바뀌면 안 된다.** 옮긴 뒤 텍스처 3종을 재생성해 md5 가 옮기기
// 전과 **바이트 동일**함을 확인했다(W8-8). 그 확인 없이 옮기면 「리팩터링인데 룩이
// 바뀐」 형태가 되고, 그것은 아무도 안 본다.

import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** 0~255 로 자른다. 생성기가 수식으로 그리므로 범위를 벗어나는 것이 정상이다 */
export const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/**
 * `rgb(x, y) -> [r,g,b]` 로 `width`×`height` RGB PNG 를 만든다.
 *
 * 필터 타입은 None 고정이다 — 압축률보다 **읽기 쉬움**을 고른다(원본 주석 그대로).
 * 색 타입 2(truecolor)·비트깊이 8 이라 알파가 없다. 작품 이미지도 액자 판 위에 얹히므로
 * 투명이 필요 없다.
 */
export function encodePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgb(x, y);
      raw[p++] = clamp255(r);
      raw[p++] = clamp255(g);
      raw[p++] = clamp255(b);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
