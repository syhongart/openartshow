// 나무 — 저폴리 원뿔 실루엣.
//
// ⚠️ 현재는 **플레이스홀더**다. 6세그먼트 원뿔 하나(12삼각형)이고, world1 의 나무는
// 가지 290 + 잎 67 = 358삼각형이었다. 감독 판정은 "이전 것이 좋았어" — 실루엣을 되찾는
// 작업이 대기 중이다. 개수 불변식 때문에 그대로 가져올 수는 없고(재질이 4종이었다),
// 잎 변종을 `tones` 로 흡수해 1종으로 접어야 한다.
//
// 최대 개수에 하한이 없다 — 나무가 0그루인 파셀은 광장처럼 읽혀서 오히려 자연스럽다.

import type { PartSpec, PlacedPart } from './types.js';
import { roadDirs, pickOffRoad } from './road-topology.js';

export const tree: PartSpec = {
  kind: 'tree',
  tiers: ['near', 'mid'], // far 에서는 뺀다 — 실루엣이 픽셀 몇 개라 비용만 든다
  salt: 0x2545f491,
  tones: [0x2f4a3a, 0x365441, 0x284134],

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
    geometry: new T.ConeGeometry(0.6, 2.4, 6).translate(0, 1.2, 0),
    material: new T.MeshStandardMaterial({ roughness: 0.9, metalness: 0.05 }),
    castShadow: true,
    receiveShadow: false, // 나무끼리 그림자를 받아봐야 안 보인다
  }),
};
