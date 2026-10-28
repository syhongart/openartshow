// scripts/asset/nyc/coplanar.mjs — 생성기 **실산출 GLB** 에서 축 정렬 면을 복원해 «동일 평면 겹침» 을 센다.
//
//   node scripts/asset/nyc/coplanar.mjs [--seed=1] [--all]     # 표를 찍는다(--all 이면 마주보는 쌍까지)
//
// 왜 생겼나 — 감독 실기기 2026-09-06: *"이동하면 벽이 우글우글해. 2개의 메쉬가 동시에 붙어있으면
// 우글우글하잖아"*(월드10 갤러리 1층 창 너머 실내 벽면) + *"그것뿐 아니라 도로에서도 그런 게 보여"*.
// 두 면이 **같은 평면에서 같은 방향**을 보면 깊이값이 같아 프레임마다 래스터라이저의 승자가 바뀐다
// (z-fighting). 눈에는 삼각형 경계를 따라 «우글거림» 으로 보인다.
//
// **재는 대상은 실산출이다.** 픽스처가 아니라 `buildStreet()` 가 낸 GLB 의 정점·인덱스를 파싱해
// 쿼드를 복원한다. 그래서 지면 판(`ground_*`)·건물 입면·실내 셸·거리 끝 구조물이 **전부 자동으로**
// 범위에 들어간다 — 새 부품을 추가해도 검사를 고칠 필요가 없다(감독 요구 ①).
//
// ⚠ **판정 축은 «같은 방향(`same`)» 쌍 하나다.** 마주보는(법선이 반대) 동일 평면 쌍은 정상 접촉이고
// (도로↔보도 옆면·벽↔창틀 뒷면·기둥↔인방 밑면) three 의 기본 `side: FrontSide` 백페이스 컬링으로
// **둘 중 한 면만 그려지므로 z-fighting 이 원리상 나지 않는다.** 수정 전 실산출에서 그런 쌍이
// **1,569** 개였고 전부 그 형태였다(2026-09-06 실측). 마주보는 쌍까지 0 을 요구하면 «부품을 맞대어
// 쌓는 것» 자체를 금지하게 되므로 `opposed` 로 **열거만** 하고 게이트로 쓰지 않는다. 대신 그 수가
// 0 이 되면 검출기가 아무것도 못 재고 있다는 뜻이라 테스트가 그것을 따로 단언한다.
//
// 소스 줄은 GLB 에서 복원되지 않는다(정점만 남는다). 대신 **노드 이름·재질·면 좌표·사각형 범위**를
// 낸다 — `bld_2_roomWall x=7.500 +` 는 `facade.mjs` 갤러리 실내 블록의 좌벽 판이고, `ground_curb_n`
// 은 `layout.mjs groundPlan()` 의 연석이다. 그 세 값이면 고칠 자리가 지목된다.
//
// 한계: 메시 노드에 조상 변환이 있으면 월드 좌표가 아니므로 **예외를 던진다**(`--street-yaw` 는 루트를
// 돌린다 — 그 인자로 만든 산출에는 쓸 수 없다). 그리고 쿼드 복원은 `modules.mjs box()` 의 인덱스
// 패턴(`b,b+1,b+2 / b,b+2,b+3`)을 전제한다 — 어긋나면 `unpaired` 로 세어 테스트가 0 을 단언한다.
import { buildStreet } from './generate.mjs';

const AXIS = 'xyz';
const COMPONENT = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const EPS = 1e-6;

/** GLB 바이너리에서 BIN 청크를 꺼낸다 */
function binChunk(glb) {
  const dv = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  for (let off = 12; off + 8 <= glb.byteLength; ) {
    const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
    if (type === 0x004e4942) return glb.subarray(off + 8, off + 8 + len);   // 'BIN\0'
    off += 8 + len;
  }
  throw new Error('GLB 에 BIN 청크가 없다');
}

/**
 * 실산출에서 축 정렬 쿼드를 복원한다.
 * 반환 `{ quads, stats }` — quad = `{ node, mat, axis, coord, dir, u, v, u0, u1, v0, v1 }`
 * (`axis` 는 법선 축 0/1/2, `dir` ±1, `u`·`v` 는 나머지 두 축).
 */
export function quadsOf({ glb, json }) {
  const bin = binChunk(glb);
  const read = (ai) => {
    const a = json.accessors[ai], bv = json.bufferViews[a.bufferView];
    const T = COMPONENT[a.componentType];
    return new T(bin.buffer, bin.byteOffset + (bv.byteOffset ?? 0), a.count * NUM[a.type]);
  };
  const parent = new Map();
  json.nodes.forEach((n, i) => (n.children ?? []).forEach((c) => parent.set(c, i)));

  const quads = [];
  const stats = { meshNodes: 0, triangles: 0, unpaired: 0, nonAxisAligned: 0 };
  for (let ni = 0; ni < json.nodes.length; ni++) {
    const nd = json.nodes[ni];
    if (nd.mesh === undefined) continue;
    for (let k = ni; k !== undefined; k = parent.get(k)) {
      const a = json.nodes[k];
      if (a.translation || a.rotation || a.scale) throw new Error(`메시 노드 ${nd.name} 의 조상 ${a.name} 에 변환이 있다 — 월드 좌표로 복원할 수 없다`);
    }
    stats.meshNodes++;
    const prim = json.meshes[nd.mesh].primitives[0];
    const pos = read(prim.attributes.POSITION), nrm = read(prim.attributes.NORMAL), idx = read(prim.indices);
    const mat = json.materials[prim.material].name;
    stats.triangles += idx.length / 3;
    for (let t = 0; t + 6 <= idx.length; t += 6) {
      const b = idx[t];
      if (idx[t + 1] !== b + 1 || idx[t + 2] !== b + 2 || idx[t + 3] !== b || idx[t + 4] !== b + 2 || idx[t + 5] !== b + 3) { stats.unpaired += 2; continue; }
      const axis = [0, 1, 2].find((c) => Math.abs(Math.abs(nrm[b * 3 + c]) - 1) < EPS);
      let ok = axis !== undefined;
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      if (ok) for (let k = 0; k < 4 && ok; k++) for (let c = 0; c < 3; c++) {
        if (Math.abs(nrm[(b + k) * 3 + c] - nrm[b * 3 + c]) > EPS) { ok = false; break; }
        const val = pos[(b + k) * 3 + c];
        if (val < lo[c]) lo[c] = val;
        if (val > hi[c]) hi[c] = val;
        if (c === axis && Math.abs(val - pos[b * 3 + axis]) > EPS) { ok = false; break; }
      }
      if (!ok) { stats.nonAxisAligned += 2; continue; }
      const [u, v] = [0, 1, 2].filter((c) => c !== axis);
      quads.push({ node: nd.name, mat, axis, coord: pos[b * 3 + axis], dir: Math.sign(nrm[b * 3 + axis]),
        u, v, u0: lo[u], u1: hi[u], v0: lo[v], v1: hi[v] });
    }
  }
  return { quads, stats };
}

/**
 * 같은 축·같은 좌표(|Δ|<1e-6)에 있고 사각형이 `minArea` 넘게 겹치는 쿼드 쌍을 모은다.
 * `same` = 법선 방향이 같은 쌍(**z-fighting**) · `opposed` = 마주보는 쌍(정상 접촉, 백페이스 컬링)
 */
export function coplanarPairs(quads, { minArea = 1e-4 } = {}) {
  const planes = new Map();
  for (const q of quads) {
    const key = `${q.axis}@${q.coord.toFixed(6)}`;
    if (!planes.has(key)) planes.set(key, []);
    planes.get(key).push(q);
  }
  const same = [], opposed = [];
  for (const list of planes.values()) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const du = Math.min(a.u1, b.u1) - Math.max(a.u0, b.u0);
      const dv = Math.min(a.v1, b.v1) - Math.max(a.v0, b.v0);
      if (du <= 0 || dv <= 0 || du * dv <= minArea) continue;
      (a.dir === b.dir ? same : opposed).push({ a, b, area: du * dv });
    }
  }
  return { same, opposed };
}

/** 겹침 쌍을 «노드쌍 × 평면» 으로 묶어 사람이 읽는 줄로 만든다 — 좌표·재질·범위로 고칠 자리를 지목한다 */
export function formatPairs(pairs, { limit = 200 } = {}) {
  const rect = (q) => `${AXIS[q.u]} ${q.u0.toFixed(2)}..${q.u1.toFixed(2)} · ${AXIS[q.v]} ${q.v0.toFixed(2)}..${q.v1.toFixed(2)}`;
  const rolled = new Map();
  for (const p of pairs) {
    const key = `${p.a.node}[${p.a.mat}] ↔ ${p.b.node}[${p.b.mat}] @ ${AXIS[p.a.axis]}=${p.a.coord.toFixed(3)} ${p.a.dir > 0 ? '+' : '−'}`;
    if (!rolled.has(key)) rolled.set(key, { n: 0, area: 0, ex: p });
    const e = rolled.get(key);
    e.n++; e.area += p.area;
  }
  return [...rolled.entries()]
    .sort((x, y) => y[1].area - x[1].area).slice(0, limit)
    .map(([key, e]) => `${key} · 쿼드쌍 ${e.n} · 겹침면적 ${e.area.toFixed(4)}m²\n    A ${rect(e.ex.a)}\n    B ${rect(e.ex.b)}`);
}

/** 한 번에: 산출 → 쿼드 → 쌍 */
export function analyzeStreet(opts = {}) {
  const built = buildStreet(opts);
  const { quads, stats } = quadsOf(built);
  return { ...coplanarPairs(quads), quads, stats };
}

if (process.argv[1] && process.argv[1].endsWith('coplanar.mjs')) {
  const seed = Number(process.argv.find((a) => a.startsWith('--seed='))?.slice(7) ?? 1);
  const { same, opposed, quads, stats } = analyzeStreet({ seed });
  console.log(`쿼드 ${quads.length} · 삼각형 ${stats.triangles} · 메시노드 ${stats.meshNodes} · 미쌍 ${stats.unpaired} · 비축정렬 ${stats.nonAxisAligned}`);
  console.log(`\n=== 같은 방향 겹침(z-fighting) — 쿼드쌍 ${same.length} ===`);
  for (const line of formatPairs(same)) console.log('  ' + line);
  if (process.argv.includes('--all')) {
    console.log(`\n=== 마주보는 겹침(정상 접촉 — 게이트 아님) — 쿼드쌍 ${opposed.length} ===`);
    for (const line of formatPairs(opposed, { limit: 40 })) console.log('  ' + line);
  }
}
