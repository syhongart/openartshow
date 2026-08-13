#!/usr/bin/env node
// scripts/png-chunks.mjs — 생성된 이미지에 **무엇이 딸려 왔는지** 열거한다.
//
// ── 왜 필요한가 ───────────────────────────────────────────────────────────
// Gemini/Imagen 출력에는 **C2PA 매니페스트 + SynthID 워터마크**가 실린다(보안담당
// 2026-08-13 웹 확인). 우리는 base64 를 그대로 파일로 굽기 때문에 구글이 넣은 것이
// **그대로 공개 저장소에 영구 커밋**된다 — 공개 저장소는 한 번 병합되면 되돌려도
// blob 이 남는다.
//
// ── 이 스크립트가 하지 **않는** 것 ────────────────────────────────────────
// **스트립하지 않는다.** 팀장 판정 2026-08-13(분기 A) = **보존**.
//
// 판정 근거가 "위생" 이 아니라 **비가역성** 이라는 점을 값 옆에 적어 둔다 — 법무는
// *"가시적 크레딧 문구가 있으면 양쪽이 법적으로 동일하니 저장소 위생 판단"* 으로 성격을
// 낮췄는데, 팀장이 그 프레임을 **절반만 맞다**고 정정했다:
//
//   보존 → 스트립은 언제든 가능(신규분부터). **스트립 → 보존은 불가능하다** — 원본이
//   없고 다시 생성하면 다른 그림이 나온다. 되돌릴 수 없는 쪽을 기본값으로 삼지 않는다.
//
// 부수 근거: 스트립해도 **SynthID 는 픽셀에 남는다.** "표시를 제거한다" 는 프레임 자체가
// 절반만 참이고, 그래서 스트립은 비용만 있고 이득이 없는 선택지다.
//
// ── 팀장 조건 — 첫 실물을 사람이 보기 전에는 영구화하지 않는다 ────────────
// *"워크플로가 로그를 「찍기만」 하고 자동 커밋한다면 확인 없는 영구 blob 이다."*
// 그래서 `--fail-on-extra` 를 만들었다. 비-필수 청크가 하나라도 있으면 **커밋 전에**
// job 을 세운다 — 그때 사람이 로그를 읽고, 유형이 예상대로(C2PA·XMP 등)면 아래
// `ACCEPTED` 에 근거와 함께 올려 통과시킨다. 예상 밖이면 팀장 재상신이다.
// **목록을 비워 둔 채 시작하는 것이 요점이다** — 무엇이 들어오는지 우리가 아직 못 봤다.
//
// ── 한계 (통과로 적지 않기 위해 적는다) ──────────────────────────────────
//  · **청크 이름과 바이트 수만** 본다. 내용을 해석하지 않는다 — C2PA 매니페스트가
//    무엇을 주장하는지, SynthID 가 픽셀에 어떻게 박혔는지는 **이 축으로 안 보인다.**
//  · **픽셀에 박힌 워터마크는 원리상 못 잡는다.** SynthID 는 메타데이터가 아니라
//    이미지 데이터 자체를 건드리므로 청크를 다 지워도 남는다.
//  · `--fail-on-extra` 없이는 종료코드가 **항상 0** 이다 — 그때는 게이트가 아니라 관측이다.
//    ⚠ 이 줄은 첫 판본에서 *"종료코드는 항상 0"* 이라고만 적혀 있었고, 같은 회차에
//    `--fail-on-extra` 를 얹으면서 **거짓이 됐다.** 값과 문장을 같이 고친다.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const KB = (n) => `${(n / 1024).toFixed(1)}KB`;

/** PNG 청크 열거. 반환 `[{ type, length }]`. */
export function pngChunks(buf) {
  const out = [];
  let off = 8; // 시그니처
  while (off + 8 <= buf.length) {
    const length = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('latin1');
    out.push({ type, length });
    if (type === 'IEND') break;
    off += 12 + length; // len(4) + type(4) + data + crc(4)
    if (length < 0 || off <= 0) break; // 손상된 파일에서 무한루프 방지
  }
  return out;
}

/** JPEG 마커 세그먼트 열거. `APPn`·`COM` 이 메타데이터가 실리는 자리다. */
export function jpegSegments(buf) {
  const out = [];
  let off = 2; // SOI
  while (off + 4 <= buf.length) {
    if (buf[off] !== 0xff) break;
    const marker = buf[off + 1];
    if (marker === 0xda) { out.push({ type: 'SOS(이후 압축데이터)', length: buf.length - off }); break; }
    const length = buf.readUInt16BE(off + 2);
    const name = marker >= 0xe0 && marker <= 0xef ? `APP${marker - 0xe0}` : marker === 0xfe ? 'COM' : `0x${marker.toString(16)}`;
    out.push({ type: name, length });
    off += 2 + length;
  }
  return out;
}

/** WebP(RIFF) 청크 열거. `EXIF`·`XMP ` 가 메타데이터 자리다. */
export function webpChunks(buf) {
  const out = [];
  let off = 12; // RIFF(4) + size(4) + WEBP(4)
  while (off + 8 <= buf.length) {
    const type = buf.subarray(off, off + 4).toString('latin1');
    const length = buf.readUInt32LE(off + 4);
    out.push({ type, length });
    off += 8 + length + (length % 2); // 홀수면 패딩 1
  }
  return out;
}

// 이미지 데이터 그 자체 — 여기 없는 것이 "딸려 온 것" 이다.
const ESSENTIAL = {
  png: new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'bKGD', 'pHYs']),
  jpeg: new Set(['APP0', 'SOS(이후 압축데이터)']),
  webp: new Set(['VP8 ', 'VP8L', 'VP8X', 'ALPH', 'ANIM', 'ANMF']),
};

export function inspect(buf) {
  if (buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { kind: 'png', chunks: pngChunks(buf) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) return { kind: 'jpeg', chunks: jpegSegments(buf) };
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return { kind: 'webp', chunks: webpChunks(buf) };
  }
  return { kind: null, chunks: [] };
}

// 사람이 실물을 보고 통과시킨 청크. **비어 있는 채로 시작한다** — 아직 아무것도 안 봤다.
// 채울 때는 반드시 **어느 run 에서 무엇을 보고 넣었는지**를 옆에 적는다. 근거 없이
// 늘어나면 이 목록은 게이트가 아니라 통과 도장이 된다.
export const ACCEPTED = new Set([
  // 예) 'caBX',  // run #123 에서 확인 — C2PA 매니페스트 12KB. 팀장 판정 2026-__-__.
]);

function main() {
  const args = process.argv.slice(2);
  const failOnExtra = args.includes('--fail-on-extra');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('사용법: node scripts/png-chunks.mjs <이미지 경로> [--fail-on-extra]');
    process.exit(2);
  }
  const buf = fs.readFileSync(file);
  const { kind, chunks } = inspect(buf);
  console.log(`파일: ${file} (${KB(buf.length)})`);
  if (!kind) {
    // **못 읽은 것을 "깨끗하다" 로 적지 않는다.** 그러므로 fail 모드에서는 세운다 —
    // 형식을 모른다는 것은 메타데이터가 없다는 뜻이 아니라 **못 봤다**는 뜻이다.
    console.log('⚠ 알려진 이미지 형식이 아니다 — 메타데이터를 열거하지 못했다.');
    if (failOnExtra) {
      console.error('::error::형식을 못 읽어 메타데이터를 확인하지 못했다 — 못 잰 것을 통과로 적지 않는다.');
      process.exit(1);
    }
    return;
  }
  const essential = ESSENTIAL[kind];
  const extra = chunks.filter((c) => !essential.has(c.type) && !ACCEPTED.has(c.type));
  console.log(`형식: ${kind.toUpperCase()} · 청크 ${chunks.length}개`);
  for (const c of chunks) {
    const mark = essential.has(c.type) ? ' ' : ACCEPTED.has(c.type) ? '·' : '＋';
    console.log(`  ${mark} ${c.type.padEnd(22)} ${String(c.length).padStart(9)} bytes`);
  }
  if (extra.length) {
    const bytes = extra.reduce((a, c) => a + c.length, 0);
    console.log(`\n＋ 로 표시한 ${extra.length}개(${KB(bytes)})가 **이미지 데이터가 아닌 것**이다: ${extra.map((c) => c.type).join(', ')}`);
    console.log('  내용은 해석하지 않았다 — 이름과 크기만 본 것이다.');
    if (failOnExtra) {
      console.error('::error::확인되지 않은 메타데이터가 있어 커밋 전에 세운다(팀장 조건 2026-08-13, 분기 A).');
      console.error('  사람이 위 목록을 읽고 판정하라. 예상대로면 png-chunks.mjs 의 ACCEPTED 에 근거와 함께 올린다.');
      console.error('  예상 밖이면 커밋하지 말고 팀장 재상신 — 공개 저장소는 한 번 커밋되면 blob 이 안 지워진다.');
      process.exit(1);
    }
  } else {
    console.log('\n확인되지 않은 청크 0개. 단 **픽셀에 박힌 워터마크(SynthID 등)는 이 축으로 안 보인다.**');
  }
}

// 경로에 공백·특수문자가 있어도 맞도록 `pathToFileURL` 을 쓴다(손으로 `file://` 를
// 붙이면 인코딩이 어긋나 CLI 가 조용히 아무 일도 안 하게 된다).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
