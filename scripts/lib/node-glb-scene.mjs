// **node 에서 GLB 를 three 씬으로 읽는다.** 브라우저도 렌더러도 없이.
//
// ── 왜 이 파일이 따로 있는가 ────────────────────────────────────────────────
// 2026-09-22 까지 이 저장소에서 맨해튼 자산(45MB · 메시 21,286)을 재려면 브라우저를
// 띄우는 길밖에 없었고, 그 길은 `timeout 900` 에 **EXIT=124** 로 죽었다. 그래서
// *"GLB 파싱이 무겁다"* 가 진단으로 굳어 있었다 — **틀린 진단이었다.** 여기 실측:
// 읽기 + 텍스처 청크 제거 ~150~1,900ms(디스크 캐시에 좌우된다) · `GLTFLoader.parse`
// **~900ms**. 죽은 것은 파싱이 아니라 `startGlbWorld` **전체 부팅**이었다.
//
// 그 사실을 한 파일로 만들어 둔다 — 다음 사람이 「맨해튼은 node 에서 못 읽는다」로
// 다시 결론 내리지 않게 하려는 것이다. 「못 잰다」는 **적힌 시점의 환경**에 대한
// 진술이고, 이 저장소는 `bpy` 에서 같은 교훈을 한 번 샀다(`measure-glb-roundtrip.mjs`
// 헤더의 *"한계 선언은 불가능 선언이 아니다"*).
//
// ⚠ **쓸 수 있는 것은 기하뿐이다.** 재질은 색 세 값만 남고 텍스처는 아예 없다
// (아래 `stripTextures`). 화면·색·재질을 재는 데 쓰면 안 된다.

import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * jsdom + **canvas 2D 결손 보충**을 전역에 건다.
 *
 * ⚠ **우리 코드를 한 줄도 대체하지 않는다.** jsdom 에 canvas 2D 컨텍스트가 없어서
 * 파츠 텍스처·치비 얼굴이 그것을 부르다 죽는 것뿐이고, 여기서 «그려진» 픽셀은 어느
 * 판정의 근거도 아니다. 선례·근거 전문은 `tests/world-glb-walkgrid-boot.test.ts` 의
 * `install2d` 한 곳이다 — 여기에 다시 적지 않는다.
 *
 * 픽셀을 보는 축이 있는 소비자는 **이 함수를 쓰면 안 된다.**
 */
export function installBrowserShims() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
  for (const k of ['window', 'document', 'navigator', 'HTMLCanvasElement', 'HTMLElement', 'Image']) {
    if (globalThis[k] === undefined) {
      Object.defineProperty(globalThis, k, { value: dom.window[k], writable: true, configurable: true });
    }
  }
  const proto = globalThis.HTMLCanvasElement?.prototype;
  if (!proto) return;
  const grad = { addColorStop: () => {} };
  const img = (w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h });
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
      if (k === 'createImageData') return (w, h) => img(w, h ?? w);
      if (k === 'getImageData') return (_x, _y, w, h) => img(w, h);
      if (k === 'measureText') return () => ({ width: 0 });
      return () => undefined;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  proto.getContext = function getContext(kind) { return kind === '2d' ? ctx : null; };
}

/**
 * GLB 의 **이미지 청크만** 떼어낸다.
 *
 * BIN 을 그대로 옮기고 `bufferViews`·`accessors` 인덱스를 **한 개도 안 건드린다** —
 * 기하가 원본과 바이트 단위로 같다는 뜻이다. 재질은 이름과 `pbrMetallicRoughness` 의
 * 스칼라 셋만 남긴다(텍스처 참조가 있으면 로더가 이미지를 찾으러 간다).
 *
 * 왜 떼는가: node 에 `createImageBitmap` 이 없어 `GLTFLoader` 가 재질 처리에서 멈춘다.
 * ⚠ 실측(`manhattan-180m.glb`): 이미지는 **1.2%**(530,708 / 45,498,128 B) 다 —
 * 「45MB 라 무겁다」의 원인이 텍스처라고 짐작했다면 그것도 틀린 진단이었다.
 */
export function stripTextures(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('GLB magic 이 아니다');
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binOff = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binOff);
  const bin = buf.subarray(binOff + 8, binOff + 8 + binLen);
  const s = { ...json, images: [], textures: [], samplers: [] };
  s.materials = (json.materials ?? []).map((m) => {
    const n = { name: m.name, doubleSided: m.doubleSided };
    const p = m.pbrMetallicRoughness;
    if (p) {
      n.pbrMetallicRoughness = {
        baseColorFactor: p.baseColorFactor,
        metallicFactor: p.metallicFactor,
        roughnessFactor: p.roughnessFactor,
      };
    }
    return n;
  });
  const jb = Buffer.from(JSON.stringify(s), 'utf8');
  const jc = Buffer.concat([jb, Buffer.alloc((4 - (jb.length % 4)) % 4, 0x20)]);
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546c67, 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + 8 + jc.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(jc.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  const o = Buffer.concat([head, jh, jc, bh, bin]);
  return {
    bytes: o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength),
    imageBytes: (json.images ?? []).reduce(
      (n, im) => n + (json.bufferViews[im.bufferView]?.byteLength ?? 0), 0,
    ),
  };
}

/**
 * 파일 하나를 **씬 하나**로. 메시·삼각형·구간별 소요를 함께 낸다.
 *
 * 반환하는 트리는 `GLTFLoader` 산출 그대로이므로 **인스턴싱 «전»** 이다 — 걷기 격자와
 * 충돌이 요구하는 바로 그 형태다(근거는 `world-glb/systems/glb-source.ts` 의
 * `collisionRoot`). 묶인 뒤에는 행렬이 속성으로 들어가 `matrixWorld` 하나로 표현되지
 * 않으므로, 여기서 인스턴싱을 흉내내면 그 축이 깨진다.
 */
export async function loadGlbScene(file) {
  const timing = {};
  let t = Date.now();
  const raw = fs.readFileSync(file);
  const { bytes, imageBytes } = stripTextures(raw);
  timing.read = Date.now() - t;

  t = Date.now();
  const scene = await new Promise((res, rej) => {
    new GLTFLoader().parse(bytes, '', (g) => res(g.scene), rej);
  });
  timing.parse = Date.now() - t;

  scene.updateMatrixWorld(true);
  let meshes = 0;
  let triangles = 0;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry;
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return { scene, meshes, triangles, bytes: raw.length, imageBytes, timing };
}
