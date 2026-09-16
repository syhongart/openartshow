// 맨해튼 180m 자산(월드11 1단계) — **검증기의 검출력**과 실물 자산의 회귀 게이트.
//
// 감독 지시 2026-09-16(카드 «우리 월드 11 로»)로 받은 blend 를 GLB 로 굽는 절차는
// `scripts/asset/manhattan/README.md` 한 곳이다 — 여기에 다시 적지 않는다.
//
// ── 이 파일이 지키는 둘 ──────────────────────────────────────────────────────
//   ① `verify-glb.mjs` 의 판정 축이 **실제로 FAIL 을 낸다**(뮤테이션 4건)
//   ② 커밋된 자산이 그 판정을 통과한다 — 자산이 아직 없는 동안은 «없다» 를 단언한다
//
// ── 왜 ① 이 먼저인가 ────────────────────────────────────────────────────────
// 「검사를 만들었다」는 검출력의 증거가 아니다(`CLAUDE.md`: *"테스트 통과는 검출력의
// 증거가 아니다 … 안 깨지면 게이트가 아니라 장식이다"*). 이 저장소는 그것을 두 번
// 실물로 겪었다 — 훅 규칙의 `warn` 축이 **구조적으로 검출력 0** 이었고, GLB 이름 검사가
// **로더 통과 전만** 봤다. 그래서 판정 축마다 **깨지는 뮤턴트를 한 건씩** 둔다.
//
// ── 뮤테이션이 실제로 뒤집은 것 (2026-09-16) ────────────────────────────────
// **M1 이 첫 판본을 죽였다.** 그때 이름 검사는 «로드된 씬에서 `.` 을 찾는다» 였는데,
// 로더가 **이미 지운 뒤**라 `.` 을 넣은 뮤턴트가 0건으로 통과했다 — 검출력이 구조적으로
// 0 이었다. 그래서 축을 **경계**로 옮겼다(`nameIntegrity`: GLB 의 원 이름 ↔ 로드 후 이름).
//
// **M3 이 bbox 축의 한계를 드러냈다.** GLTFLoader 는 accessor 의 `min`/`max` **선언**으로
// boundingBox 를 세우므로, 정점 바이트를 고쳐도 bbox 는 안 움직인다. bbox 는 「선언이
// 맞는가」를 보는 축이지 「정점이 온전한가」를 보는 축이 **아니다.**
//
// **M4 는 그 빈자리를 누가 메우는지 말한다** — 인덱스 하나를 어긋내면 삼각형 수도 bbox 도
// 안 변하고 `sha256` 만 변한다. 해시 축을 지우면 M3b·M4 가 빨간불이 된다.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readGlb, writeGlb } from '../scripts/asset/nyc/glb-write.mjs';
import { loadScene, measureScene, measureContainer, nameIntegrity, checkCameras, loaderBlocker } from '../scripts/asset/manhattan/verify-glb.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const ASSET = join(ROOT, 'frontend/assets/worlds/manhattan-180m.glb');
const CAMERAS = join(ROOT, 'frontend/assets/worlds/manhattan-180m-cameras.json');

/**
 * 자산이 커밋되는 회차에 `node scripts/asset/manhattan/verify-glb.mjs <자산>` 의 실측을
 * 여기에 박는다. **박기 전에는 `null` 이어야 한다** — 값만 먼저 적으면 없는 파일을
 * 통과로 적는 그 형태가 된다.
 */
const EXPECTED: null | {
  bytes: number; sha256: string; nodes: number; meshes: number; triangles: number;
  bbox: { size: [number, number, number] };
} = null;

// ── 합성 GLB — 뮤테이션의 대상 ───────────────────────────────────────────────
// 실물(91MiB·21,313 노드)로 뮤테이션을 돌리면 한 케이스에 수 초가 든다. 판정 축은
// 크기와 무관하므로 삼각형 하나짜리로 같은 축을 전부 때린다.

function buildSynthetic(nodeCount = 1): Buffer {
  const pos = new Float32Array([0, 0, 0, 2, 0, 0, 0, 3, 0]);
  const idx = new Uint16Array([0, 1, 2]);
  const png = Buffer.from('89504e470d0a1a0a', 'hex');   // 바이트 수만 세므로 헤더면 충분하다
  const bin = Buffer.concat([
    Buffer.from(pos.buffer), Buffer.from(idx.buffer), Buffer.alloc(2), png,
  ]);
  const json = {
    asset: { version: '2.0', generator: 'manhattan-glb.test' },
    scene: 0,
    scenes: [{ name: 'manhattan_synth', nodes: [...Array(nodeCount).keys()] }],
    // 노드 여럿이 **같은 mesh 를 참조**한다 — 그것이 glTF 의 인스턴싱이다.
    nodes: [...Array(nodeCount).keys()].map((i) => ({ name: `manhattan_node_${i}`, mesh: 0 })),
    meshes: [{ name: 'tri_0', primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ name: 'mat_0' }],
    images: [{ name: 'img_0', bufferView: 2, mimeType: 'image/png' }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [2, 3, 0] },
      { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 6 },
      { buffer: 0, byteOffset: 44, byteLength: png.length },
    ],
    buffers: [{ byteLength: bin.length }],
  };
  return writeGlb(json, bin);
}

/** 합성 GLB 를 열어 고친 뒤 다시 싼다. 뮤턴트는 **파일이 아니라 메모리**에만 산다. */
function mutate(edit: (json: Record<string, any>, bin: Buffer) => Buffer | void, nodeCount = 1): Buffer {
  const { json, bin } = readGlb(buildSynthetic(nodeCount));
  const next = edit(json, Buffer.from(bin));
  return writeGlb(json, next ?? bin);
}

describe('① verify-glb 의 판정 축이 실제로 FAIL 을 낸다 (뮤테이션)', () => {
  it('원본(뮤턴트 아님)은 모든 축을 통과한다 — 대조군', async () => {
    const bytes = buildSynthetic();
    const c = measureContainer(bytes);
    const s = measureScene(await loadScene(bytes));
    expect(c.externalRefs).toEqual([]);
    expect(nameIntegrity(bytes, s).rewrittenCount).toBe(0);
    expect(s.triangles).toBe(1);
    expect(s.bbox.size).toEqual([2, 3, 0]);
    expect(c.imageBytes).toBe(8);
  });

  it('M1 — 이름에 `.` 을 넣으면 **경계 축**이 깨진다 (로드 후만 보면 안 깨진다)', async () => {
    const m = mutate((json) => { json.nodes[0].name = 'manhattan.node.0'; });
    const s = measureScene(await loadScene(m));
    const n = nameIntegrity(m, s);
    expect(n.rewrittenCount, '로더가 고쳐 쓴 이름을 여기서 잡아야 한다').toBe(1);
    expect(n.rewritten[0]).toBe('manhattan.node.0');
    expect(n.bannedInJsonCount).toBe(1);

    // ⚠ **이 줄이 첫 판본을 죽인 자리다.** 로드된 씬에는 `.` 이 **없다** — 로더가 지웠기
    // 때문이다. 즉 「로드 후 이름에서 `.` 찾기」는 언제나 0건이고 검출력이 0 이다.
    for (const name of s.namesAfterLoad) expect(name).not.toContain('.');
    expect(s.namesAfterLoad.has('manhattannode0')).toBe(true);
  });

  it('M1b — **공백**도 같은 구멍이다. 실물에서 이 축으로 1건이 빠져나갔다', async () => {
    // 블렌더의 마스터 컬렉션은 이름이 `Scene Collection` 이고, three 는 공백을 지우는
    // 대신 `_` 로 **바꾼다**(`sanitizeNodeName`). 그래서 `.` 만 보던 첫 판본은 이것을
    // 통과시켰고, 실물 GLB 에서 `rewritten: ["Scene Collection"]` 1건이 나왔다.
    const m = mutate((json) => { json.nodes[0].name = 'Scene Collection'; });
    const s = measureScene(await loadScene(m));
    const n = nameIntegrity(m, s);
    expect(n.rewrittenCount, '공백을 빠뜨리면 여기가 0 이 된다').toBe(1);
    expect(s.namesAfterLoad.has('Scene_Collection')).toBe(true);
  });

  it('M2 — 이미지를 외부 URL 로 바꾸면 자기완결 축이 깨진다', () => {
    const m = mutate((json) => { delete json.images[0].bufferView; json.images[0].uri = 'https://example.com/a.png'; });
    const c = measureContainer(m);
    expect(c.externalRefs).toHaveLength(1);
    expect(c.externalRefs[0]).toContain('https://example.com/a.png');
  });

  it('M3a — accessor 의 min/max **선언**을 바꾸면 bbox 축이 깨진다', async () => {
    const m = mutate((json) => { json.accessors[0].max = [2, 999, 0]; });
    const s = measureScene(await loadScene(m));
    expect(s.bbox.size).not.toEqual([2, 3, 0]);
    expect(s.bbox.max[1]).toBe(999);
  });

  it('M3b — **정점 바이트**만 바꾸면 bbox 는 안 움직인다 (축의 한계를 못 박는다)', async () => {
    const base = buildSynthetic();
    const m = mutate((_json, bin) => { bin.writeFloatLE(999, 4); return bin; });
    const s = measureScene(await loadScene(m));
    // GLTFLoader 는 accessor 의 min/max **선언**으로 boundingBox 를 세운다 — 실제 좌표를
    // 다시 훑지 않는다. 그러니 bbox 통과를 「정점이 온전하다」로 읽으면 안 된다.
    expect(s.bbox.size).toEqual([2, 3, 0]);
    expect(measureContainer(m).sha256).not.toBe(measureContainer(base).sha256);
  });

  it('M4 — 인덱스를 어긋내면 **의미 축은 못 본다.** 그것이 sha256 축이 있는 이유다', async () => {
    const base = buildSynthetic();
    const m = mutate((_json, bin) => { bin.writeUInt16LE(2, 36); return bin; });   // idx[0]: 0 → 2
    const s = measureScene(await loadScene(m));
    // 삼각형 수도 bbox 도 그대로다 — 축이 이 둘뿐이면 이 변조는 **통과한다**
    expect(s.triangles).toBe(1);
    expect(s.bbox.size).toEqual([2, 3, 0]);
    // 잡는 것은 해시뿐이다
    expect(measureContainer(m).sha256).not.toBe(measureContainer(base).sha256);
  });
});

describe('②a 인스턴싱 — 「mesh 는 줄고 노드는 그대로」가 판정 축이다', () => {
  // 실측(2026-09-16): 같은 원본에서 구운 두 자산.
  //   통짜본      jsonMeshes 19,482 · meshShareRatio 1.09 · 씬 Mesh 21,286 · tri 1,322,096
  //   인스턴스본  jsonMeshes    988 · meshShareRatio 21.54 · 씬 Mesh 21,286 · tri 1,322,096
  // **mesh 수만 24분의 1 이고 나머지가 전부 같다** — 그것이 「화면을 안 바꾸고 묶었다」다.
  // 그러니 이 축이 실제로 FAIL 을 내는지가 중요하다.

  it('노드 셋이 mesh 하나를 공유하면 share=3 이고 씬 Mesh 는 3 이다', async () => {
    const bytes = buildSynthetic(3);
    const c = measureContainer(bytes);
    const s = measureScene(await loadScene(bytes));
    expect(c.jsonMeshes).toBe(1);
    expect(c.nodesReferencingMesh).toBe(3);
    expect(c.meshShareRatio).toBe(3);
    // ⚠ **공유해도 three 는 Mesh 를 3개 만든다** — 드로우콜은 안 준다. 바이트만 준다.
    expect(s.meshes, '공유가 Mesh 객체를 줄인다고 읽으면 안 된다').toBe(3);
    expect(s.triangles).toBe(3);
  });

  it('M5 — 공유를 풀면(mesh 를 복제하면) share 가 1 로 떨어진다', () => {
    const m = mutate((json) => {
      const src = json.meshes[0];
      json.meshes = json.nodes.map(() => structuredClone(src));
      json.nodes.forEach((n: Record<string, number>, i: number) => { n.mesh = i; });
    }, 3);
    const c = measureContainer(m);
    expect(c.jsonMeshes).toBe(3);
    expect(c.meshShareRatio, '인스턴싱이 사라진 것을 이 축이 잡아야 한다').toBe(1);
  });

  it('M6 — 노드가 사라지면 **형상이 사라진다**. mesh 수만 보면 못 잡는다', async () => {
    const m = mutate((json) => { json.scenes[0].nodes = [0]; }, 3);
    const c = measureContainer(m);
    const s = measureScene(await loadScene(m));
    // mesh 수는 그대로 1 이다 — 「mesh 가 줄었다」만 보면 이 손실이 통과한다
    expect(c.jsonMeshes).toBe(1);
    // 씬을 실제로 훑어야 잡힌다
    expect(s.meshes).toBe(1);
    expect(s.triangles).toBe(1);
  });

  it('M7 — WebP 가 required 면 로더 검증을 **건너뛰고 그 사실을 말한다**', () => {
    expect(loaderBlocker({ extensionsRequired: [] })).toBeNull();
    expect(loaderBlocker({})).toBeNull();
    const blocked = loaderBlocker({ extensionsRequired: ['EXT_texture_webp'] });
    // 조용한 통과가 아니라 **이유가 있는 건너뜀**이어야 한다(못 잰 것은 통과가 아니다).
    expect(blocked).toContain('EXT_texture_webp');
    expect(blocked).toContain('Image');
  });
});

describe('② 카메라 JSON — quaternion 과 forward 가 갈리지 않는다', () => {
  it('둘이 어긋난 문서를 넣으면 checkCameras 가 잡는다 (뮤테이션)', () => {
    const ok = { axis: 'gltf-y-up', cameras: [{ name: 'c_1', quaternion: [0, 0, 0, 1], forward: [0, 0, -1] }], lights: [] };
    expect(checkCameras(ok).problems).toEqual([]);
    const bad = structuredClone(ok);
    bad.cameras[0].forward = [0, 0, 1];
    expect(checkCameras(bad).problems).toHaveLength(1);
    const dotted = structuredClone(ok);
    dotted.cameras[0].name = 'c.1';
    expect(checkCameras(dotted).problems).toHaveLength(1);
  });
});

describe('③ 커밋된 자산', () => {
  it('자산과 기대값은 **함께** 온다 — 한쪽만 있으면 빨간불이다', () => {
    const has = existsSync(ASSET);
    if (!has) {
      expect(EXPECTED, '자산이 없는데 기대값이 박혀 있다 — 없는 파일을 통과로 적는 형태다').toBeNull();
      return;
    }
    expect(
      EXPECTED,
      '자산이 생겼다 — `node scripts/asset/manhattan/verify-glb.mjs <자산>` 실측을 EXPECTED 에 박아라',
    ).not.toBeNull();
  });

  it.runIf(existsSync(ASSET) && EXPECTED !== null)('자산이 판정을 통과한다', async () => {
    const bytes = readFileSync(ASSET);
    const c = measureContainer(bytes);
    const s = measureScene(await loadScene(bytes));
    expect(c.bytes).toBe(EXPECTED!.bytes);
    expect(c.sha256).toBe(EXPECTED!.sha256);
    expect(c.externalRefs, '자기완결 — GLB 안에 외부 URI 가 있으면 안 된다').toEqual([]);
    expect(s.nodes).toBe(EXPECTED!.nodes);
    expect(s.meshes).toBe(EXPECTED!.meshes);
    expect(s.triangles).toBe(EXPECTED!.triangles);
    const n = nameIntegrity(bytes, s);
    expect(n.rewrittenCount, `로더가 고쳐 쓴 이름: ${n.rewritten.join(', ')}`).toBe(0);
    expect(n.bannedInJsonCount).toBe(0);
    expect(s.bbox.size).toEqual(EXPECTED!.bbox.size);
    if (existsSync(CAMERAS)) expect(checkCameras(JSON.parse(readFileSync(CAMERAS, 'utf8'))).problems).toEqual([]);
  });
});
