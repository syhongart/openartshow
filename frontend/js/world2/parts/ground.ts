// 지면 — 파셀 한 칸을 통째로 덮는 판.
//
// 유일하게 개수가 고정(1)이고 위치도 고정이다. 그래서 난수를 색조 하나에만 쓴다.
// 여기에 틈이 생기면 아래 허공이 보이므로 셀 크기를 **정확히** 덮는다(여백 적용 안 함).

import type { PartSpec } from './types.js';

export const ground: PartSpec = {
  kind: 'ground',
  tiers: ['near', 'mid', 'far'], // 지면이 없으면 파셀이 구멍으로 보인다
  salt: 0x9e3779b9,
  tones: [0x2a3140, 0x2f3646, 0x262d3a],

  maxPerParcel: () => 1,

  place: ({ rnd, o }) => [{
    kind: 'ground',
    x: 0, z: 0, y: 0, ry: 0,
    sx: o.cellX, sy: 0.1, sz: o.cellZ,
    tone: Math.floor(rnd() * 3),
  }],

  // 지면만 피벗이 위쪽이다 — 판이 y=0 **아래로** 깔려야 그 위를 걷는다.
  asset: (T) => ({
    geometry: new T.BoxGeometry(1, 1, 1).translate(0, -0.5, 0),
    material: new T.MeshStandardMaterial({ roughness: 0.95, metalness: 0.05 }),
    castShadow: false,
    receiveShadow: true,
  }),
};
