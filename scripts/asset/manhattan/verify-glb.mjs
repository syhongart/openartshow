// scripts/asset/manhattan/verify-glb.mjs — 구워진 맨해튼 GLB 가 쓸 수 있는 물건인지 **판정**한다.
//
//   사용: node scripts/asset/manhattan/verify-glb.mjs <자산.glb> [--cameras <cameras.json>] [--json]
//
// ── 왜 `extract.py` 안이 아니라 여기인가 — 구현자≠검증자 ────────────────────
// `extract.py` 는 bpy 로 구우면서 자기 실측표를 쓴다. 그 표는 **블렌더가 무엇을 내보내려
// 했는가**이지 **three 가 무엇을 읽는가**가 아니다. 이 저장소는 그 둘이 갈리는 대가를 이미
// 치렀다 — `frontend/js/world10/decide/glb-nodes.ts` 헤더의 회차에서 검사가 «GLB json 의 원
// 이름» 만 봤고 **로더를 통과한 뒤는 아무도 안 봤다.** 그래서 이 파일은 실제 `GLTFLoader` 를
// 통과시킨 씬을 잰다.
//
// ── ⚠ 이 검사가 **못 보는 것** ──────────────────────────────────────────────
// ① **텍스처 픽셀.** Node 에는 이미지 디코더가 없어(`self`·`createObjectURL`·`Image` 부재)
//    `loadTexture` 플러그인 훅으로 **빈 `Texture` 를 꽂아** 건너뛴다. 그래서 「이미지가 깨졌다」
//    는 여기서 안 잡힌다 — 임베드 **바이트 수와 mime** 까지만 본다.
// ② **화면.** 노드 수·삼각형 수가 맞아도 빈 화면일 수 있다(`CLAUDE.md`: 200·0·0 은 빈 화면과
//    구별되지 않는다). 렌더 판정은 감독 실기기가 유일한 축이다.
// ③ **성능.** 드로우콜·메모리는 여기서 재지 않는다(스모크 [7][7.6] 소관).
//
// 못 잰 것을 통과로 적지 않기 위해 위 셋을 **결과 JSON 의 `notMeasured` 에 그대로 싣는다.**

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readGlb } from '../nyc/glb-write.mjs';

/**
 * three 가 이름에서 **고쳐 쓰는** 문자들(`PropertyBinding.sanitizeNodeName`,
 * `three.core.js:31930`): 공백류는 `_` 로 바뀌고 `[ ] . : /` 는 지워진다.
 *
 * ⚠ **공백을 빠뜨리면 검출력에 구멍이 난다** — 첫 판본이 그랬고, 블렌더의 마스터
 * 컬렉션 `Scene Collection` 이 실제로 그 구멍으로 빠져나갔다(2026-09-16).
 */
export const NAME_BANNED = /[\s[\]./:]/;

// ⚠ **로드된 씬에서 `.` 을 찾는 검사는 검출력이 0 이다.** 로더가 이미 지웠으므로 언제나
// 0건이 나온다 — 통과가 「이름이 온전하다」가 아니라 「로더가 일을 했다」를 뜻한다.
// 첫 판본이 정확히 그 검사였고 뮤테이션 M1 이 **즉시 뒤집었다**(`.` 을 넣은 뮤턴트가
// 0건으로 통과했다). 이 저장소가 훅 규칙의 `warn` 축에서 겪은 것과 같은 형태다.
//
// 그래서 축을 **경계**로 옮긴다: GLB json 의 **원 이름**과 로드 **후** 이름을 대조해
// 「로더가 고쳐 쓴 이름이 0개」를 본다. 그러면 `.` 뿐 아니라 중복 고유화(`_1` 접미사)
// 같은 다른 재기입도 함께 잡힌다.

export const NOT_MEASURED = [
  '텍스처 픽셀 — Node 에 이미지 디코더가 없어 빈 Texture 로 대체했다(바이트·mime 만 봤다)',
  '화면 — 노드·삼각형 수가 맞아도 빈 화면일 수 있다(실기기가 유일한 축)',
  '성능 — 드로우콜·메모리는 스모크 [7][7.6] 소관이다',
];

/** GLB 바이트를 실제 `GLTFLoader` 로 통과시켜 씬을 잰다. */
export async function loadScene(bytes) {
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const loader = new GLTFLoader();
  // 텍스처 디코딩만 건너뛴다 — 노드 이름 치환(`createUniqueName`) 경로는 그대로 탄다.
  loader.register(() => ({ name: 'node_stub_textures', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
  return new Promise((res, rej) => loader.parse(ab, '', res, rej));
}

/** 로드된 씬의 실측. 이름 판정은 `nameIntegrity` 가 한다(위 주석). */
export function measureScene(gltf) {
  let nodes = 0;
  let meshes = 0;
  let tri = 0;
  const names = new Set();
  gltf.scene.traverse((o) => {
    nodes += 1;
    if (typeof o.name === 'string') names.add(o.name);
    if (!o.isMesh) return;
    meshes += 1;
    const g = o.geometry;
    if (g?.index) tri += g.index.count / 3;
    else if (g?.attributes?.position) tri += g.attributes.position.count / 3;
  });
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  return {
    nodes,
    meshes,
    triangles: tri,
    uniqueNames: names.size,
    namesAfterLoad: names,
    bbox: { min: box.min.toArray().map(r2), max: box.max.toArray().map(r2), size: size.toArray().map(r2) },
  };
}

const r2 = (v) => Math.round(v * 100) / 100;

/**
 * **경계 축** — GLB 가 적은 이름과 three 가 들고 있는 이름이 같은가.
 *
 * `rewritten` 이 0 이 아니면 그 이름으로 노드를 찾는 코드는 런타임에 **한 번도 참이
 * 아니다.** 이 저장소는 그 상태로 `PointLight` 0개를 배포한 적이 있다.
 */
export function nameIntegrity(bytes, sceneMeasure) {
  const { json } = readGlb(bytes);
  const after = sceneMeasure.namesAfterLoad;
  const declared = (json.nodes ?? []).map((n) => n?.name).filter((n) => typeof n === 'string' && n !== '');
  const rewritten = declared.filter((n) => !after.has(n));
  const banned = declared.filter((n) => NAME_BANNED.test(n));
  return {
    declaredNodeNames: declared.length,
    rewritten: rewritten.slice(0, 10),
    rewrittenCount: rewritten.length,
    bannedInJson: banned.slice(0, 10),
    bannedInJsonCount: banned.length,
  };
}

/** GLB 컨테이너 수준의 실측 — 로더가 안 보는 축(임베드 바이트·외부 URI). */
export function measureContainer(bytes) {
  const { json } = readGlb(bytes);
  const bv = json.bufferViews ?? [];
  const external = [];
  for (const key of ['buffers', 'images']) {
    for (const item of json[key] ?? []) {
      if (typeof item.uri === 'string' && !item.uri.startsWith('data:')) external.push(`${key}: ${item.uri}`);
    }
  }
  const images = (json.images ?? []).map((i) => ({
    name: i.name ?? null,
    mimeType: i.mimeType ?? null,
    bytes: i.bufferView != null ? bv[i.bufferView].byteLength : null,
  }));
  return {
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    jsonNodes: (json.nodes ?? []).length,
    jsonMeshes: (json.meshes ?? []).length,
    materials: (json.materials ?? []).length,
    images,
    imageBytes: images.reduce((a, i) => a + (i.bytes ?? 0), 0),
    externalRefs: external,
    extensionsUsed: json.extensionsUsed ?? [],
    generator: json.asset?.generator ?? null,
  };
}

/**
 * 카메라 JSON 의 **자기 정합**을 본다.
 *
 * `quaternion` 과 `forward` 는 같은 행렬에서 나온 두 표현이다 — 어긋나면 한쪽을 쓰는
 * 코드와 다른 쪽을 쓰는 코드가 **다른 데를 본다**(값 미러링의 전형이다). 그래서 three 로
 * 쿼터니언을 실제 적용해 −Z 를 돌려보고 `forward` 와 맞추다.
 */
export function checkCameras(doc) {
  const bad = [];
  for (const c of doc.cameras ?? []) {
    if (NAME_BANNED.test(c.name)) bad.push(`${c.name}: 이름에 로더가 지우는 문자`);
    const q = new THREE.Quaternion(...c.quaternion);
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const want = new THREE.Vector3(...c.forward);
    const d = f.distanceTo(want);
    if (d > 1e-3) bad.push(`${c.name}: quaternion↔forward 불일치 ${d.toFixed(5)}`);
  }
  return { cameras: (doc.cameras ?? []).length, lights: (doc.lights ?? []).length, axis: doc.axis ?? null, problems: bad };
}

export async function verify(glbPath, camerasPath) {
  const bytes = readFileSync(glbPath);
  const container = measureContainer(bytes);
  const gltf = await loadScene(bytes);
  const scene = measureScene(gltf);
  const names = nameIntegrity(bytes, scene);
  delete scene.namesAfterLoad;   // Set 은 JSON 으로 못 싣는다 — 판정은 위에서 끝났다
  const cameras = camerasPath ? checkCameras(JSON.parse(readFileSync(camerasPath, 'utf8'))) : null;
  return { path: glbPath, container, scene, names, cameras, notMeasured: NOT_MEASURED };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const glb = args.find((a) => !a.startsWith('--'));
  const ci = args.indexOf('--cameras');
  if (!glb) {
    console.error('사용: node scripts/asset/manhattan/verify-glb.mjs <자산.glb> [--cameras <cameras.json>]');
    process.exit(2);
  }
  const out = await verify(glb, ci >= 0 ? args[ci + 1] : undefined);
  console.log(JSON.stringify(out, null, 1));
  const fail =
    out.names.rewrittenCount > 0 ||
    out.names.bannedInJsonCount > 0 ||
    out.container.externalRefs.length > 0 ||
    (out.cameras?.problems.length ?? 0) > 0;
  process.exit(fail ? 1 : 0);
}
