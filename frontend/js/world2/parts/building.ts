// 건물 — 파셀의 뼈대. 저폴리 박스이고, 실루엣 변화는 크기와 회전이 전부다.
//
// 개수 하한이 2인 이유는 룩이다. 0~1채면 그 구획이 "아직 안 지어진 곳"처럼 보이고,
// 오픈월드에서 그런 파셀이 드문드문 섞이면 세상이 버려진 인상을 준다.

import type { PartSpec } from './types.js';

export const building: PartSpec = {
  kind: 'building',
  tiers: ['near', 'mid', 'far'], // 가장 멀리서도 보인다 — 스카이라인을 만드는 것이 건물이다
  salt: 0x7f4a7c15,
  tones: [0x3d4557, 0x454e63, 0x353c4c, 0x4a5468, 0x2e3543],

  // `2 + floor(rnd * (max - 1))` 의 상한이다. rnd < 1 이므로 max 를 넘지 않는다.
  maxPerParcel: (o) => o.maxBuildings,

  place: ({ rnd, o, halfX, halfZ }) => {
    const n = 2 + Math.floor(rnd() * (o.maxBuildings - 1));
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = (rnd() * 2 - 1) * halfX;
      const z = (rnd() * 2 - 1) * halfZ;
      const ry = Math.floor(rnd() * 4) * (Math.PI / 2); // 직각 배치 — 도시가 정돈돼 보인다
      const w = 3 + rnd() * 5;
      const d = 3 + rnd() * 5;
      const h = 4 + rnd() * 16;
      out.push({ kind: 'building', x, z, y: 0, ry, sx: w, sy: h, sz: d, tone: Math.floor(rnd() * 5) });
    }
    return out;
  },

  asset: (T) => ({
    geometry: new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    material: new T.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 }),
    castShadow: true,
    receiveShadow: true,
  }),
};
