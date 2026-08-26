// world8/export/foreign-glb.ts — **되읽기가 못 싣는 메시만 남긴 GLB 를 잘라낸다.** three import 0.
//
// ── 왜 필요한가 (감독 지시 2026-08-25) ──────────────────────────────────────
// 감독이 우리 GLB 를 블렌더에서 열어 **오브젝트를 하나 추가**해 내보내고 되읽었더니
// *"재질이름형식이 아니다"* 가 떴다. 결함이 아니라 설계 한계였다 — `import-glb.ts` 는
// 재질 이름(`kind#tone`)으로 **우리 파츠만** 알아보고 모양은 아예 안 읽는다(위치·크기·
// 회전만 읽어 우리가 이미 가진 지오에 얹는다). 새 메시를 실을 통로가 없었다.
//
// 감독 판정: *"들어가게 해달라"* · *"블랜더의 glb로 내보낸 것은 그대로 올라와야지."*
//
// ── 왜 원본을 통째로 로더에 안 넘기는가 ─────────────────────────────────────
// 그러면 **125만 삼각형과 텍스처를 전부 GPU 로 올린 뒤 버린다** — `import-glb.ts` 헤더가
// GLTFLoader 를 피한 이유가 정확히 그것이다. 우리 파츠는 이미 씬에 인스턴스로 서 있으므로
// 두 벌이 되기까지 한다.
//
// 그래서 **JSON 청크만 잘라 낸다**: 우리 파츠를 쓰는 노드를 씬 트리에서 빼고, 남의 메시만
// 남긴 GLB 를 새로 조립한다. 바이너리 청크는 **손대지 않는다** — accessor 인덱스가 그대로
// 유지되므로 참조가 안 깨지고, 안 쓰이는 accessor 는 로더가 읽지 않는다.
//
// ⚠ **파일 크기는 안 줄어든다**(바이너리를 그대로 두므로). 줄이려면 bufferView 를 다시
// 채워 넣어야 하는데, 그 이득은 «메모리에 잠깐 더 있는 바이트» 뿐이고 대가는 인덱스
// 재배열 전체다. GPU 로 올라가는 것은 남은 노드가 참조하는 것뿐이라 실제 비용이 아니다.
//
// ── 무엇을 「우리 것」으로 보는가 ────────────────────────────────────────────
// 재질 이름이 `kind#tone` 형식이거나 `water` 인 메시. 그 판정은 `import-glb.ts` 와 **같은
// 함수**를 쓴다(`parseComboName`·`stripDupSuffix`) — 두 곳이 다르게 판정하면 어떤 메시는
// 배치로도 안 실리고 잘라내기에서도 빠져 **조용히 사라진다.**

import { readGlbJson, parseComboName, stripDupSuffix } from './import-glb.js';

export interface ForeignResult {
  /** 남의 메시만 남긴 GLB. 올릴 수 없으면 `null` — 사유는 `reason` */
  glb: ArrayBuffer | null;
  /**
   * `glb` 가 `null` 인 이유. `'none'` = 남의 메시가 없다(정상),
   * `'no-bin'` = **버퍼를 약속했는데 BIN 청크가 없다**(그 파일은 아무도 못 읽는다).
   */
  reason: 'ok' | 'none' | 'no-bin';
  /** 남긴 메시 노드 수 */
  meshNodes: number;
  /** 우리 파츠라서 뺀 메시 노드 수 — 둘을 함께 보여야 «전부 빠졌다» 를 알아챈다 */
  ourNodes: number;
}

/** GLB 컨테이너에서 BIN 청크의 바이트 범위를 찾는다. 없으면 `null` */
function findBinChunk(buf: ArrayBuffer): { offset: number; length: number } | null {
  const dv = new DataView(buf);
  const jsonLen = dv.getUint32(12, true);
  // [0..12) 헤더 · [12..20) JSON 청크 헤더 · [20, 20+jsonLen) JSON
  let at = 20 + jsonLen;
  while (at + 8 <= buf.byteLength) {
    const len = dv.getUint32(at, true);
    const type = dv.getUint32(at + 4, true);
    // ⚠ **선언 길이가 파일 끝을 넘으면 그 청크는 없는 것으로 본다**(검수관 권고 P1).
    // 안 보던 판본은 잘린 GLB 에서 `new Uint8Array(src, offset, length)` 가
    // `RangeError: Invalid typed array length` 로 던졌다. 던지면 되읽기 전체가
    // 넘어가고, 그러면 파츠 배치까지 안 실린다 — 이 회차가 고친 바로 그 형태다.
    if (at + 8 + len > buf.byteLength) return null;
    if (type === 0x004e4942) return { offset: at + 8, length: len };   // 'BIN\0'
    at += 8 + len;
  }
  return null;
}

/** 이 메시가 **우리 파츠**인가. 판정은 `import-glb.ts` 와 같은 함수를 쓴다 */
function isOurMesh(g: Record<string, any>, meshIndex: number): boolean {
  const prim = g.meshes?.[meshIndex]?.primitives?.[0];
  if (!prim || prim.material === undefined) return false;
  const name = g.materials?.[prim.material]?.name;
  if (typeof name !== 'string') return false;
  // 물판도 우리가 만든 것이다 — 되읽기가 다시 만들므로 여기서 빼야 두 벌이 안 된다.
  if (stripDupSuffix(name) === 'water') return true;
  return parseComboName(name) !== null;
}

/**
 * 우리 파츠가 아닌 메시만 남긴 GLB 를 만든다.
 *
 * 노드 **인덱스는 그대로 둔다** — `children`·`scenes[].nodes` 만 걸러내므로 skin·animation
 * 같은 다른 참조가 살아 있어도 안 깨진다. 지우는 대신 «가리키지 않는» 방식이다.
 *
 * 그룹 노드는 **자식 중 하나라도 남으면 유지한다.** 블렌더에서 "나무 전체를 5m 옮기기" 를
 * 하면 부모 Empty 에 변환이 걸리는데(그 사실이 `import-glb.ts` 헤더에 적혀 있다), 그
 * 부모를 지우면 남은 자식의 월드 좌표가 어긋난다.
 */
export function extractForeignGlb(buf: ArrayBuffer): ForeignResult {
  const g = readGlbJson(buf);
  const nodes: Record<string, any>[] = g.nodes ?? [];

  let meshNodes = 0;
  let ourNodes = 0;

  // 순환 방어 — 손으로 편집된 파일이 순환을 만들면 무한 재귀가 난다(`import-glb.ts` 와
  // 같은 이유). `keep` 캐시가 방문 표시를 겸한다.
  const keep = new Map<number, boolean>();
  const visiting = new Set<number>();

  const shouldKeep = (index: number): boolean => {
    const cached = keep.get(index);
    if (cached !== undefined) return cached;
    if (visiting.has(index)) return false;      // 순환 — 이 갈래는 안 센다
    visiting.add(index);

    const node = nodes[index];
    let result = false;
    if (node) {
      if (node.mesh !== undefined) {
        if (isOurMesh(g, node.mesh)) ourNodes++;
        else { meshNodes++; result = true; }
      }
      // 메시가 없어도(또는 우리 것이어도) 자식이 남으면 이 노드는 변환 때문에 남긴다.
      for (const c of node.children ?? []) if (shouldKeep(c)) result = true;
    }

    visiting.delete(index);
    keep.set(index, result);
    return result;
  };

  for (const scene of g.scenes ?? []) for (const n of scene.nodes ?? []) shouldKeep(n);

  if (meshNodes === 0) return { glb: null, reason: 'none', meshNodes: 0, ourNodes };

  // ── 버퍼를 약속했는데 BIN 이 없으면 **넘기지 않는다** (실측 2026-08-25) ────
  // GLTFLoader 는 그런 파일에서 `GLTFBinaryExtension.body` 가 `null` 인 채 진행하다
  // `null.slice` 로 죽는다. 실측: `buffers: [{byteLength: 426276}]` 인데 후속 청크가
  // 없는 GLB 를 넣었더니 «Cannot read properties of null (reading 'slice')» 가 났다.
  //
  // 그 크래시가 되읽기 전체를 넘어뜨려 **파츠 배치까지 안 실렸다** — 감독이 신고한
  // «아무 일도 안 일어난다» 와 같은 형태다. 미리 걸러 사유를 말한다.
  //
  // `uri` 가 있는 버퍼는 외부 파일이라 여기 해당 없다(자기완결 GLB 가 아니므로 어차피
  // CSP 가 막는다). 판정 대상은 **GLB 내장 버퍼**뿐이다.
  const bin = findBinChunk(buf);
  const needsBin = ((g.buffers ?? []) as Record<string, unknown>[])
    .some((b) => b.uri === undefined && ((b.byteLength as number) ?? 0) > 0);
  if (needsBin && !bin) return { glb: null, reason: 'no-bin', meshNodes, ourNodes };

  // ── 남길 노드만 가리키도록 트리를 다시 엮는다 ────────────────────────────
  // 원본을 안 건드린다 — 같은 `ArrayBuffer` 로 되읽기(`parseWorldGlb`)도 돌기 때문이다.
  const out: Record<string, any> = { ...g };
  out.nodes = nodes.map((node, i) => {
    if (!keep.get(i)) return node;              // 어차피 아무도 안 가리킨다
    const copy = { ...node };
    if (node.children) copy.children = node.children.filter((c: number) => keep.get(c));
    // 우리 파츠 메시를 쓰던 노드는 **변환만 남기고 메시를 뗀다**(자식 때문에 살아남은 경우).
    if (node.mesh !== undefined && isOurMesh(g, node.mesh)) delete copy.mesh;
    return copy;
  });
  out.scenes = (g.scenes ?? []).map((s: Record<string, any>) => ({
    ...s,
    nodes: (s.nodes ?? []).filter((n: number) => keep.get(n)),
  }));

  return { glb: packGlb(out, bin, buf), reason: 'ok', meshNodes, ourNodes };
}

/** 새 JSON + **원본 BIN** 으로 GLB 를 조립한다 */
function packGlb(
  gltf: Record<string, any>,
  bin: { offset: number; length: number } | null,
  src: ArrayBuffer,
): ArrayBuffer {
  const json = new TextEncoder().encode(JSON.stringify(gltf));
  // 청크는 4바이트 정렬이다. JSON 은 공백(0x20), BIN 은 0 으로 채운다 — 스펙 규정이다.
  const jsonPad = (4 - (json.length % 4)) % 4;
  const jsonLen = json.length + jsonPad;
  const binLen = bin ? bin.length + ((4 - (bin.length % 4)) % 4) : 0;
  const total = 12 + 8 + jsonLen + (bin ? 8 + binLen : 0);

  const out = new ArrayBuffer(total);
  const dv = new DataView(out);
  const u8 = new Uint8Array(out);

  dv.setUint32(0, 0x46546c67, true);            // 'glTF'
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);                 // ⚠ 전체 파일 길이 — JSON 청크 길이가 아니다
  dv.setUint32(12, jsonLen, true);
  dv.setUint32(16, 0x4e4f534a, true);           // 'JSON'
  u8.set(json, 20);
  for (let i = 0; i < jsonPad; i++) u8[20 + json.length + i] = 0x20;

  if (bin) {
    const at = 20 + jsonLen;
    dv.setUint32(at, binLen, true);
    dv.setUint32(at + 4, 0x004e4942, true);     // 'BIN\0'
    u8.set(new Uint8Array(src, bin.offset, bin.length), at + 8);
  }
  return out;
}
