// scripts/asset/nyc/glb-build.mjs — glTF 2.0 문서를 조립하는 작은 빌더. 텍스처 0, 재질은 색·거칠기만.
//
// 정점 속성은 POSITION·NORMAL(float32)·COLOR_0(u8 VEC4 normalized). ⚠ COLOR_0 를 VEC3 u8 로 두면
// byteStride 3 이라 glTF 의 4바이트 정렬 요구를 어긴다(첫 executor 판본의 오류) — VEC4 로 둔다.
// 인덱스는 u32. bufferView 는 속성 종류별로 하나씩(정렬 4 유지).
import { writeGlb, pad4 } from './glb-write.mjs';

export function glbBuilder() {
  const json = {
    asset: { version: '2.0', generator: 'openartshow nyc-street generate.mjs' },
    scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [],
    accessors: [], bufferViews: [], buffers: [],
  };
  const chunks = [];       // Buffer 조각(정렬된 채로)
  let binLen = 0;
  const matIndex = new Map();
  const meshIndex = new Map();

  function view(buf, target) {
    const off = binLen;
    const padded = pad4(buf.length);
    chunks.push(buf);
    if (padded > buf.length) chunks.push(Buffer.alloc(padded - buf.length));
    binLen += padded;
    json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: buf.length, target });
    return json.bufferViews.length - 1;
  }
  function accessor(bufferView, componentType, count, type, extra = {}) {
    json.accessors.push({ bufferView, componentType, count, type, ...extra });
    return json.accessors.length - 1;
  }

  return {
    /** 재질 — 같은 이름은 한 번만. `color` 는 linear RGB, `alpha` < 1 이면 BLEND */
    material(name, color, roughness, alpha = 1) {
      if (matIndex.has(name)) return matIndex.get(name);
      const m = {
        name,
        pbrMetallicRoughness: { baseColorFactor: [...color, alpha], metallicFactor: 0, roughnessFactor: roughness },
        doubleSided: alpha < 1,
      };
      if (alpha < 1) m.alphaMode = 'BLEND';
      json.materials.push(m);
      matIndex.set(name, json.materials.length - 1);
      return matIndex.get(name);
    },

    /** 메시 — `key` 가 같으면 같은 메시를 재사용한다(반복 모듈 → 런타임 인스턴싱) */
    mesh(key, geo, materialIdx) {
      if (meshIndex.has(key)) return meshIndex.get(key);
      const pos = new Float32Array(geo.pos), nrm = new Float32Array(geo.nrm);
      const col = new Uint8Array(geo.col), idx = new Uint32Array(geo.idx);
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) {
        if (pos[i + k] < min[k]) min[k] = pos[i + k];
        if (pos[i + k] > max[k]) max[k] = pos[i + k];
      }
      const n = pos.length / 3;
      const aPos = accessor(view(Buffer.from(pos.buffer), 34962), 5126, n, 'VEC3', { min, max });
      const aNrm = accessor(view(Buffer.from(nrm.buffer), 34962), 5126, n, 'VEC3');
      const aCol = accessor(view(Buffer.from(col.buffer), 34962), 5121, n, 'VEC4', { normalized: true });
      const aIdx = accessor(view(Buffer.from(idx.buffer), 34963), 5125, idx.length, 'SCALAR');
      json.meshes.push({
        name: key,
        primitives: [{ attributes: { POSITION: aPos, NORMAL: aNrm, COLOR_0: aCol }, indices: aIdx, material: materialIdx }],
      });
      meshIndex.set(key, json.meshes.length - 1);
      return meshIndex.get(key);
    },

    /** 노드 — 반환값은 인덱스. `parent` 를 주면 그 노드의 children 에 붙는다, 없으면 씬 루트 */
    node({ name, mesh, translation, rotation, scale, extras, parent }) {
      const n = { name };
      if (mesh !== undefined) n.mesh = mesh;
      if (translation) n.translation = translation;
      if (rotation) n.rotation = rotation;
      if (scale) n.scale = scale;
      if (extras) n.extras = extras;
      json.nodes.push(n);
      const i = json.nodes.length - 1;
      if (parent === undefined) json.scenes[0].nodes.push(i);
      else (json.nodes[parent].children ??= []).push(i);
      return i;
    },

    finish() {
      const bin = Buffer.concat(chunks, binLen);
      json.buffers = [{ byteLength: bin.length }];
      const glb = writeGlb(json, bin);
      let triangles = 0;
      for (const n of json.nodes) if (n.mesh !== undefined) {
        const acc = json.accessors[json.meshes[n.mesh].primitives[0].indices];
        triangles += acc.count / 3;
      }
      return {
        glb, json,
        summary: { triangles, nodes: json.nodes.length, meshes: json.meshes.length, materials: json.materials.length, bytes: glb.length },
      };
    },
  };
}

/** y 축 회전 쿼터니언 */
export const quatY = (rad) => [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)];
