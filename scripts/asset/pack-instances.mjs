#!/usr/bin/env node
// GLB 의 **반복 노드를 `EXT_mesh_gpu_instancing` 으로 접는다.**
//
// ── 왜 (감독 질문 2026-08-28 *"로딩시간 왜 길어."*) ──────────────────────────
// world8 고정 자산(`world2-blender-edit.glb`)의 실측:
//
//   총 4.96MB = JSON 4.35MB(87.8%) + BIN 0.61MB(12.2%)
//   노드 28,728 · 그중 메시 참조 28,707 · **고유 메시는 40개**
//   상위 반복: 7229 · 3182 · 3182 · 2540 · 2540 · 2053
//
// 즉 **실제 기하 데이터는 0.61MB 뿐이고 나머지 4.35MB 가 같은 물건을 28,707번 적은
// 메타데이터**다. glTF 코어에는 인스턴싱 표현이 없어 내보내기가 낱개로 펴서 저장한다
// (`systems/glb-instance.js` 헤더가 같은 사실을 런타임 쪽에서 적고 있다 — 그쪽은 그것을
// **되묶어** 드로우콜을 줄이고, 이쪽은 **파일에서** 접는다).
//
// ⚠ **이것은 게이트가 아니다.** CI 에 물려 있지 않고 배포를 막지 않는다. 자산을 다시
// 구울 때 손으로 돌리는 도구다(`extract-world2-glb.mjs` 와 같은 자리).
//
// ⚠⚠ **파일이 작아지는 것과 «빨리 열리는 것»은 다른 축이다.** 이 스크립트는 앞의
// 것만 한다. 뒤의 것은 three 로더가 노드 28,707개 대신 40개로 `Object3D` 를 만드느냐에
// 달렸고, 그건 **재봐야 안다** — 이 저장소는 *"참인 문장에서 성립하지 않는 결론을 뽑는"*
// 형태로 이미 데인 적이 있다(개수 불변식을 «부팅 때 다 만들어 둔다»로 보증했는데
// `info.memory` 는 첫 «렌더»에 오른다). 그래서 이 도구는 판정하지 않고 **재료를 만든다.**
//
//   사용: node scripts/asset/pack-instances.mjs <입력.glb> <출력.glb> [--min N]
//         --min N  인스턴스가 N 개 미만인 메시는 접지 않는다(기본 2)

import fs from 'node:fs';

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const FLOAT = 5126;

/** GLB 를 { json, bin } 으로 가른다 */
function readGlb(buf) {
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
const pad4 = (n) => (n + 3) & ~3;

function writeGlb(json, bin) {
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

// ── 노드 변환 ───────────────────────────────────────────────────────────────
// ⚠ **부모 변환을 «합성»한다.** 이 자산은 그룹 노드 21개가 T/R/S 를 안 가져서 평탄화가
// 안전하지만(실측), 그 사실에 기대면 다른 GLB 에서 조용히 틀린다. 일반적으로 처리한다.

const IDENT = { t: [0, 0, 0], r: [0, 0, 0, 1], s: [1, 1, 1] };

/** 쿼터니언 곱 (a 다음 b) */
function qmul(a, b) {
  const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/** 벡터를 쿼터니언으로 회전 */
function qrot(q, v) {
  const [x, y, z, w] = q, [vx, vy, vz] = v;
  const ix = w * vx + y * vz - z * vy;
  const iy = w * vy + z * vx - x * vz;
  const iz = w * vz + x * vy - y * vx;
  const iw = -x * vx - y * vy - z * vz;
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x,
  ];
}

/**
 * 부모 TRS 와 자식 TRS 를 합성한다.
 *
 * ⚠ **비균등 스케일 + 회전이 겹치면 TRS 로 표현되지 않는다**(전단이 생긴다). 그때는
 * 접지 않고 원본 노드를 남긴다 — 조용히 틀린 모양을 내놓는 것보다 낫다.
 */
function compose(p, c) {
  const s = [p.s[0] * c.s[0], p.s[1] * c.s[1], p.s[2] * c.s[2]];
  const scaled = [c.t[0] * p.s[0], c.t[1] * p.s[1], c.t[2] * p.s[2]];
  const rotated = qrot(p.r, scaled);
  return {
    t: [p.t[0] + rotated[0], p.t[1] + rotated[1], p.t[2] + rotated[2]],
    r: qmul(p.r, c.r),
    s,
  };
}

const trsOf = (n) => ({
  t: n.translation ?? IDENT.t, r: n.rotation ?? IDENT.r, s: n.scale ?? IDENT.s,
});

/** 부모에 회전이 있는데 자식 스케일이 비균등이면 전단이 생겨 TRS 로 못 적는다 */
function shearRisk(p, c) {
  const uniform = Math.abs(c.s[0] - c.s[1]) < 1e-9 && Math.abs(c.s[1] - c.s[2]) < 1e-9;
  const rotated = Math.abs(p.r[3]) < 1 - 1e-9;
  return rotated && !uniform;
}

function main() {
  const [inPath, outPath, ...rest] = process.argv.slice(2);
  if (!inPath || !outPath) {
    console.error('사용: node scripts/asset/pack-instances.mjs <입력.glb> <출력.glb> [--min N]');
    process.exit(2);
  }
  const minIdx = rest.indexOf('--min');
  const MIN = minIdx >= 0 ? Number(rest[minIdx + 1]) : 2;

  const src = fs.readFileSync(inPath);
  const { json, bin } = readGlb(src);
  const nodes = json.nodes ?? [];

  // ── 1) 노드별 월드 TRS 를 구한다 ─────────────────────────────────────────
  const parent = new Map();
  for (let i = 0; i < nodes.length; i++) {
    for (const c of nodes[i].children ?? []) parent.set(c, i);
  }
  const world = new Array(nodes.length);
  const shear = new Set();
  const resolve = (i) => {
    if (world[i]) return world[i];
    const own = trsOf(nodes[i]);
    const p = parent.get(i);
    if (p === undefined) return (world[i] = own);
    const pw = resolve(p);
    if (shearRisk(pw, own)) shear.add(i);
    return (world[i] = compose(pw, own));
  };
  for (let i = 0; i < nodes.length; i++) resolve(i);

  // ── 2) 메시별로 모은다 ────────────────────────────────────────────────────
  // ⚠ **접을 수 없는 것은 남긴다**: 자식이 있는 노드(계층이 의미를 가진다) · skin ·
  //   camera · 전단 위험. 남긴 것은 원본 그대로 다시 쓴다.
  const groups = new Map();
  const keep = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const foldable = n.mesh !== undefined && !n.children?.length
      && n.skin === undefined && n.camera === undefined && !shear.has(i);
    if (!foldable) { keep.push(i); continue; }
    const g = groups.get(n.mesh) ?? [];
    g.push(i);
    groups.set(n.mesh, g);
  }

  // ── 3) 접을 그룹을 고른다 ─────────────────────────────────────────────────
  const fold = [], loose = [];
  for (const [mesh, idx] of groups) {
    if (idx.length >= MIN) fold.push([mesh, idx]);
    else loose.push(...idx);
  }

  // ── 4) 인스턴스 속성을 BIN 에 쓴다 ───────────────────────────────────────
  // `EXT_mesh_gpu_instancing` 은 T/R/S 를 **각각 선택적으로** 받는다. 전부 항등인
  // 속성은 안 쓴다 — 그만큼 파일이 준다.
  const chunks = [bin];
  let binLen = pad4(bin.length);
  if (binLen > bin.length) chunks.push(Buffer.alloc(binLen - bin.length, 0));
  json.bufferViews ??= []; json.accessors ??= [];

  const addAccessor = (values, comps, type) => {
    const buf = Buffer.alloc(values.length * 4);
    values.forEach((v, k) => buf.writeFloatLE(v, k * 4));
    const bvIdx = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: binLen, byteLength: buf.length });
    chunks.push(buf);
    binLen += pad4(buf.length);
    if (pad4(buf.length) > buf.length) chunks.push(Buffer.alloc(pad4(buf.length) - buf.length, 0));

    const count = values.length / comps;
    const min = new Array(comps).fill(Infinity);
    const max = new Array(comps).fill(-Infinity);
    for (let k = 0; k < values.length; k++) {
      const c = k % comps;
      if (values[k] < min[c]) min[c] = values[k];
      if (values[k] > max[c]) max[c] = values[k];
    }
    const idx = json.accessors.length;
    json.accessors.push({ bufferView: bvIdx, componentType: FLOAT, count, type, min, max });
    return idx;
  };

  const newNodes = [];
  const stat = { folded: 0, instances: 0, skippedT: 0, skippedR: 0, skippedS: 0 };
  for (const [mesh, idx] of fold) {
    const T = [], R = [], S = [];
    let anyT = false, anyR = false, anyS = false;
    for (const i of idx) {
      const w = world[i];
      T.push(...w.t); R.push(...w.r); S.push(...w.s);
      if (w.t.some((v) => v !== 0)) anyT = true;
      if (w.r[0] || w.r[1] || w.r[2] || w.r[3] !== 1) anyR = true;
      if (w.s.some((v) => v !== 1)) anyS = true;
    }
    const attributes = {};
    if (anyT) attributes.TRANSLATION = addAccessor(T, 3, 'VEC3'); else stat.skippedT++;
    if (anyR) attributes.ROTATION = addAccessor(R, 4, 'VEC4'); else stat.skippedR++;
    if (anyS) attributes.SCALE = addAccessor(S, 3, 'VEC3'); else stat.skippedS++;
    // ⚠ 셋 다 항등이면 속성이 비는데, 그러면 인스턴스 «수»를 적을 자리가 없다.
    //   그때는 TRANSLATION 을 강제로 넣는다(전부 0 이라 압축이 잘 듣는다).
    if (Object.keys(attributes).length === 0) attributes.TRANSLATION = addAccessor(T, 3, 'VEC3');
    newNodes.push({
      name: `inst:${nodes[idx[0]].name ?? mesh}×${idx.length}`,
      mesh,
      extensions: { EXT_mesh_gpu_instancing: { attributes } },
    });
    stat.folded++; stat.instances += idx.length;
  }

  // ── 5) 안 접은 것은 월드 TRS 로 평탄화해 남긴다 ──────────────────────────
  for (const i of [...loose, ...keep]) {
    const n = nodes[i];
    if (n.mesh === undefined && !n.children?.length) continue;   // 빈 그룹 노드는 버린다
    if (n.children?.length) continue;                             // 계층은 아래에서 다시 만든다
    const w = world[i];
    newNodes.push({
      ...n, children: undefined,
      translation: w.t, rotation: w.r, scale: w.s,
    });
  }

  json.nodes = newNodes;
  json.scenes = [{ nodes: newNodes.map((_, i) => i) }];
  json.scene = 0;
  json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), 'EXT_mesh_gpu_instancing'])];

  const out = writeGlb(json, Buffer.concat(chunks));
  fs.writeFileSync(outPath, out);

  const before = src.length, after = out.length;
  console.log(`접은 메시 ${stat.folded}종 · 인스턴스 ${stat.instances.toLocaleString()}개`);
  console.log(`  생략한 속성: T ${stat.skippedT} · R ${stat.skippedR} · S ${stat.skippedS}`);
  console.log(`  노드 ${nodes.length.toLocaleString()} → ${newNodes.length.toLocaleString()}`);
  console.log(`  ${(before / 1048576).toFixed(2)}MB → ${(after / 1048576).toFixed(2)}MB `
    + `(${((1 - after / before) * 100).toFixed(1)}% 감소)`);
  if (shear.size > 0) console.log(`  ⚠ 전단 위험으로 안 접은 노드 ${shear.size}개`);
}

main();
