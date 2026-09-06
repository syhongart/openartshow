// GLB 읽기/쓰기 유틸 — pack-instances.mjs 와 같은 포맷
// 통합은 별도 회차 (pack-instances.mjs 에서 가져온 기능)

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

/** GLB 를 { json, bin } 으로 가른다 */
export function readGlb(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('glTF 매직이 아니다');
  const total = dv.getUint32(8, true);
  let off = 12, json = null, bin = null;
  while (off < total) {
    const len = dv.getUint32(off, true);
    const type = dv.getUint32(off + 4, true);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === JSON_CHUNK) json = JSON.parse(new TextDecoder().decode(body));
    else if (type === BIN_CHUNK) bin = body;
    off += 8 + len;
  }
  if (!json) throw new Error('JSON 청크가 없다');
  return { json, bin: bin ?? Buffer.alloc(0) };
}

/** 4바이트 경계로 올림 — glTF 는 청크와 bufferView 정렬을 요구한다 */
export const pad4 = (n) => (n + 3) & ~3;

export function writeGlb(json, bin) {
  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = Buffer.alloc(pad4(jsonBuf.length) - jsonBuf.length, 0x20);   // 공백
  const binPad = Buffer.alloc(pad4(bin.length) - bin.length, 0);
  const jsonLen = jsonBuf.length + jsonPad.length;
  const binLen = bin.length + binPad.length;
  const total = 12 + 8 + jsonLen + (binLen > 0 ? 8 + binLen : 0);

  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
  const jsonHead = Buffer.alloc(8);
  jsonHead.writeUInt32LE(jsonLen, 0); jsonHead.writeUInt32LE(JSON_CHUNK, 4);
  const parts = [head, jsonHead, jsonBuf, jsonPad];
  if (binLen > 0) {
    const binHead = Buffer.alloc(8);
    binHead.writeUInt32LE(binLen, 0); binHead.writeUInt32LE(BIN_CHUNK, 4);
    parts.push(binHead, bin, binPad);
  }
  return Buffer.concat(parts);
}
