// 가로등 — 밤의 거리감을 만드는 것.
//
// ── world1 실물을 가져왔다 (감독 지시) ──────────────────────────────────────
// 감독: *"임시 아셋들 삭제하고 월드1에 있던 의자 가로등 가지고 오자."*
//
// 예전 이 파일은 원기둥 하나짜리 **플레이스홀더**였고, 주석이 스스로 그렇게 적고
// 있었다 — "빛나는 헤드가 없다. world2 는 야간이 기본이라 가로등이 룩에 미치는 영향이
// 큰데, 지금은 어두운 막대기다."
//
// world1(`world.js` 의 `SG`)은 기둥(CylinderGeometry 0.06→0.09, 높이 3.0)과
// 갓(Sphere 0.22를 세로로 눌러 y=3.06)이었다. 그 치수를 그대로 쓴다 — 라이브에서
// 사람 옆에 서 있던 값이라 스케일이 검증돼 있다.
//
// 조각이 둘이지만 재질은 하나여야 하므로(개수 불변식) `bakePieces` 로 한 지오에 굽고
// 정점색으로 기둥(어두운 금속)과 갓(밝은 유백)을 나눈다.
//
// 크기 편차를 두지 않는다. 가로등이 제각각이면 자연물이 아니라 인공물이라 눈에 띈다.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { bakePieces, rgb, type Piece } from './bake.js';
import { roadDirs, pickOffRoad } from './road-topology.js';

export const lamp: PartSpec = {
  kind: 'lamp',
  tiers: ['near'], // 가까이서만. 이 한 줄이 슬롯 예산을 far 의 1/3로 줄인다
  salt: 0x94d049bb,
  // 정점색이 색을 주므로 **흰색 근처**여야 한다 — 곱셈기다.
  tones: [0xffffff],

  maxPerParcel: (o) => o.maxLamps,

  place: ({ px, pz, rnd, o, halfX, halfZ }) => {
    const dirs = roadDirs(px, pz);
    const n = Math.floor(rnd() * (o.maxLamps + 1));
    const out: PlacedPart[] = [];
    for (let i = 0; i < n; i++) {
      // 지금은 길을 피하기만 한다. **길가에 줄지어 세우는 것**은 가로등 차례의 일이다 —
      // 그때 이 자리 선택이 `road-topology` 의 축을 따라가도록 바뀐다.
      const pos = pickOffRoad(rnd, halfX, halfZ, dirs);
      const ry = Math.floor(rnd() * 4) * (Math.PI / 2);
      out.push({ kind: 'lamp', x: pos.x, z: pos.z, y: 0, ry, sx: 1, sy: 1, sz: 1, tone: 0 });
    }
    return out;
  },

  // 자체발광을 살짝 줘서 밤에도 형태가 읽히게 한다. 실제 광원은 아니다 —
  // 조명 개수는 상수여야 하므로(개수 불변식) 가로등마다 라이트를 달 수 없다.
  asset: (T) => ({
    geometry: buildLamp(T),
    material: new T.MeshStandardMaterial({
      vertexColors: true,
      emissive: 0x2a2415,
      roughness: 0.6,
      metalness: 0.05,
    }),
    castShadow: true,
    receiveShadow: false,
  }),
};

/** 기둥 — 어두운 금속. 갓과 대비돼야 실루엣이 산다 */
const POST = rgb(0x4a4636);
/** 갓 — 유백. 자체발광과 함께 밤에 불빛으로 읽힌다 */
const HEAD = rgb(0xd8cfa8);

/**
 * world1 `SG.lampPost` + `SG.lampHead` 의 치수 그대로.
 *
 *   기둥  CylinderGeometry(0.06, 0.09, 3.0, 8)  → y=1.5 로 올려 밑동을 바닥에
 *   갓    SphereGeometry(0.22, 10, 8) 을 세로 0.8배로 눌러 y=3.06
 *
 * 세그먼트를 8·10 그대로 둔 것은 가로등이 파셀당 최대 4개뿐이라 삼각형 예산에
 * 여유가 있어서다. 나무처럼 128그루가 서는 것과 다르다.
 */
function buildLamp(T: ThreeNS) {
  const pieces: Piece[] = [
    { geo: new T.CylinderGeometry(0.06, 0.09, 3.0, 8).translate(0, 1.5, 0), color: POST },
    { geo: new T.SphereGeometry(0.22, 10, 8).scale(1, 0.8, 1).translate(0, 3.06, 0), color: HEAD },
  ];
  return bakePieces(T, pieces);
}
