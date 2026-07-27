// 나무 — world1 의 재귀 가지를 한 덩어리로 구운 것.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"지금 있는 나무를 월드1의 나무로 바꿔보자."*
//
// 예전 이 파일은 6세그먼트 원뿔 하나(12삼각형)짜리 플레이스홀더였고, 주석이 스스로
// "실루엣을 되찾는 작업이 대기 중" 이라 적고 있었다. 그 작업이다.
//
// ── 왜 그대로 못 가져오나 ────────────────────────────────────────────────────
// world1 의 `buildDetailedTree`(`scene-trees.ts`)는 **Group + Mesh 수십 개**를 만든다 —
// 재귀 가지마다 원기둥 하나, 잎 클러스터마다 알파 평면 셋. 재질도 수피 1 + 잎 3 종이다.
// world1 은 파셀 단위로 재질별 병합을 해서 그루당 4드로우콜까지 줄였다.
//
// world2 는 **종류당 InstancedMesh 하나**다. 나무가 몇 그루든 드로우콜 1이어야 하고,
// 그러려면 지오도 하나 재질도 하나여야 한다. 그래서 형태만 가져오고 조립을 다시 짰다:
//
//   · 재귀 가지 구조 — 그대로. `trunkLen 2.6 · trunkRad 0.22 · maxLevel 2` 는 world1 이
//     `world.js:676` 에서 가로수에 쓰던 값 그대로다(라이브에서 검증된 비율).
//   · 잎 — 알파 평면을 **저폴리 입체**로 바꿨다. 알파는 `transparent` 를 켜야 하고 그것이
//     파이프라인 캐시키 축이라 재질이 하나 더 는다. 불투명 입체면 같은 재질에 담긴다.
//   · 색 — 줄기(갈색)와 잎(초록)을 **정점색**으로 나눈다. `instanceColor` 는 인스턴스
//     단위라 한 나무 안에서 두 색을 쓸 수 없다. 도로가 `tones` 를 흰색 근처로 두고
//     텍스처를 곱하는 것과 같은 구조다 — 여기서는 텍스처 대신 정점색을 곱한다.
//
// ── 나무가 하나뿐인 문제 ────────────────────────────────────────────────────
// 지오가 하나이므로 **세상의 모든 나무가 같은 모양**이다. world1 은 파셀마다 시드가
// 달라 그루마다 달랐다. 이건 인스턴싱의 구조적 대가이고, 회전(4방향)·비균일 스케일·
// 정점색 위의 `tones` 곱으로 흐트러뜨린다. 그래도 가까이서 보면 같은 나무다.
//
// 최대 개수에 하한이 없다 — 나무가 0그루인 파셀은 광장처럼 읽혀서 오히려 자연스럽다.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { roadDirs, pickOffRoad } from './road-topology.js';

export const tree: PartSpec = {
  kind: 'tree',
  tiers: ['near', 'mid'], // far 에서는 뺀다 — 실루엣이 픽셀 몇 개라 비용만 든다
  salt: 0x2545f491,
  // 정점색이 곱해지므로 **흰색 근처**여야 한다. 예전 값(0x2f4a3a 같은 짙은 초록)은
  // 색 자체였는데, 이제는 곱셈기라 그대로 두면 나무가 새까매진다. 도로가 텍스처를 쓰며
  // 겪은 것과 같은 함정이고, "tones 는 곱셈기다" 테스트가 이 규약을 지킨다.
  tones: [0xffffff, 0xe8f0e0, 0xf2ece0],

  // `floor(rnd * (max + 1))` 의 상한이다. rnd < 1 이므로 max 를 넘지 않는다.
  maxPerParcel: (o) => o.maxTrees,

  place: ({ px, pz, rnd, o, halfX, halfZ }) => {
    const dirs = roadDirs(px, pz);
    const n = Math.floor(rnd() * (o.maxTrees + 1));
    const out: PlacedPart[] = [];
    for (let i = 0; i < n; i++) {
      const pos = pickOffRoad(rnd, halfX, halfZ, dirs);
      const ry = Math.floor(rnd() * 4) * (Math.PI / 2);
      // 밑동 굵기와 높이를 따로 뽑는다 — 같은 배율을 쓰면 전부 닮은꼴이 된다.
      const s = 0.8 + rnd() * 0.8;
      const sy = s * (1.2 + rnd() * 0.6);
      const tone = Math.floor(rnd() * 3);
      out.push({ kind: 'tree', x: pos.x, z: pos.z, y: 0, ry, sx: s, sy, sz: s, tone });
    }
    return out;
  },

  asset: (T) => ({
    geometry: buildTreeGeometry(T),
    // 정점색을 켠다. `tones` 의 인스턴스 색이 여기에 **곱해지므로** tones 는 흰색
    // 근처여야 한다 — 어두운 톤을 곱하면 나무가 검게 죽는다(도로에서 이미 겪었다).
    material: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.05 }),
    castShadow: true,
    receiveShadow: false, // 나무끼리 그림자를 받아봐야 안 보인다
  }),
};

// ── 지오메트리 조립 ──────────────────────────────────────────────────────────

/** 줄기 색(정점색). 인스턴스 `tones` 가 이 위에 곱해진다 */
const BARK: readonly [number, number, number] = [0.38, 0.29, 0.21];
/** 잎 색. 두 톤을 섞어 수관이 단색 덩어리로 안 보이게 한다 */
const LEAF_A: readonly [number, number, number] = [0.34, 0.52, 0.30];
const LEAF_B: readonly [number, number, number] = [0.26, 0.42, 0.24];

/** world1 `world.js:676` 이 가로수에 쓰던 값 그대로 */
const TRUNK_LEN = 2.6;
const TRUNK_RAD = 0.22;
const MAX_LEVEL = 2;

/**
 * 결정론 난수. **씨앗이 고정이다** — 지오가 하나뿐이므로 나무 모양도 하나이고, 그것이
 * 빌드마다 달라지면 골든 스냅샷이 흔들린다.
 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Piece { geo: InstanceType<ThreeNS['BufferGeometry']>; color: readonly [number, number, number] }

/**
 * 조각들을 **한 지오메트리로 굽는다.**
 *
 * `mergeGeometries`(three/addons)를 쓸 수 없다 — 파츠는 three 를 인자로만 받고
 * 애드온을 import 하지 않는다(런타임 의존 0 규율). 그래서 정점 배열을 직접 잇는다.
 *
 * 전부 non-indexed 로 통일하는 이유: 인덱스가 있는 것과 없는 것을 섞으면 인덱스 오프셋을
 * 다시 계산해야 하는데, 이 규모(수백 삼각형)에서는 그 복잡도가 정점 몇 개보다 비싸다.
 */
function bake(T: ThreeNS, pieces: readonly Piece[]) {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  for (const { geo, color } of pieces) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    for (let i = 0; i < p.length / 3; i++) col.push(color[0], color[1], color[2]);
    g.dispose();
    if (g !== geo) geo.dispose();
  }
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  return out;
}

/**
 * 재귀 가지 + 잎. world1 `buildDetailedTree` 의 구조를 그대로 따르되 Group 대신
 * **누적 행렬**을 넘긴다 — 최종 결과가 메시 트리가 아니라 정점 배열이어야 하므로
 * 부모 변환을 자식 지오에 직접 구워 넣어야 한다.
 */
function buildTreeGeometry(T: ThreeNS) {
  const rnd = rng(0x5eed7e3);
  const pieces: Piece[] = [];

  const leafAt = (m: InstanceType<ThreeNS['Matrix4']>, y: number, s: number) => {
    // world1 은 잎 클러스터가 평면 셋이었다. 여기서는 불투명 입체 셋 — 알파를 피하려는
    // 것이고(재질 하나에 담아야 한다), 저폴리라 삼각형 수도 비슷하다.
    for (let i = 0; i < 3; i++) {
      const r = (0.48 + rnd() * 0.26) * s;
      // **정팔면체(8삼각형)** 다. 정십면체(20)로 처음 만들었더니 그루당 792삼각형이 되어
      // world1(358)의 2.2배였다 — 128그루 동시 렌더면 10만 삼각형이다. 잎은 뭉쳐 있고
      // 흔들리지 않으므로 면이 적어도 실루엣이 유지되고, 대신 반지름을 조금 키워 성겨
      // 보이지 않게 했다. 개수를 줄이는 대신 면을 줄인 것은 **뭉치로 읽히려면 덩어리가
      // 여럿이어야** 하기 때문이다.
      const geo = new T.OctahedronGeometry(r, 0);
      const off = new T.Matrix4().makeTranslation(
        (rnd() - 0.5) * 0.7 * s,
        y + (rnd() - 0.5) * 0.5 * s,
        (rnd() - 0.5) * 0.7 * s,
      );
      geo.applyMatrix4(new T.Matrix4().multiplyMatrices(m, off));
      pieces.push({ geo, color: rnd() < 0.5 ? LEAF_A : LEAF_B });
    }
  };

  const branch = (level: number, len: number, rad: number, m: InstanceType<ThreeNS['Matrix4']>) => {
    // 5세그먼트 — world1 은 7이었다. 가지가 열셋이라 둘씩 줄이면 체감 없이 삼각형이
    // 50개쯤 준다. 가지는 대부분 잎에 가려 실루엣에 거의 기여하지 않는다.
    const geo = new T.CylinderGeometry(rad * 0.62, rad, len, 5).translate(0, len / 2, 0);
    geo.applyMatrix4(m);
    pieces.push({ geo, color: BARK });

    if (level < MAX_LEVEL) {
      const kids = 2 + (rnd() > 0.45 ? 1 : 0);
      for (let k = 0; k < kids; k++) {
        // 첫 분기는 완만하게, 깊을수록 크게 벌어진다 — world1 과 같은 규칙이다.
        const tilt = (level === 0 ? 0.24 : 0.4 + level * 0.12) + rnd() * 0.3;
        const yaw = (k / kids) * Math.PI * 2 + rnd() * 0.9;
        const child = new T.Matrix4()
          .multiplyMatrices(m, new T.Matrix4().makeTranslation(0, len * (0.8 + rnd() * 0.18), 0))
          .multiply(new T.Matrix4().makeRotationY(yaw))
          .multiply(new T.Matrix4().makeRotationZ(tilt));
        branch(level + 1, len * (0.6 + rnd() * 0.18), rad * 0.6, child);
      }
      if (level >= 1 && rnd() > 0.45) leafAt(m, len * 0.75, 0.6);
    } else {
      leafAt(m, len * 0.9, 0.85);
      if (rnd() > 0.5) leafAt(m, len * 0.55, 0.7);
    }
  };

  branch(0, TRUNK_LEN, TRUNK_RAD, new T.Matrix4());
  return bake(T, pieces);
}
