// 건물 — 파셀의 뼈대. 저폴리 박스이고, 실루엣 변화는 크기와 회전이 전부다.
//
// 개수 하한이 2인 이유는 룩이다. 0~1채면 그 구획이 "아직 안 지어진 곳"처럼 보이고,
// 오픈월드에서 그런 파셀이 드문드문 섞이면 세상이 버려진 인상을 준다.

import type { PartSpec, PlacedPart } from './types.js';
import { roadDirs, pickInQuadrant, shuffledQuadrants } from './road-topology.js';
import { isPlaza } from './plaza.js';

/**
 * 바닥 한 변의 최소·최대(미터). **여기가 유일한 출처다** — 배치가 이 값으로 크기를 뽑고,
 * 사분면 안쪽 경계도 `MAX_SIDE / 2` 로 유도한다. 두 곳에 따로 적으면 크기를 키웠을 때
 * 간격이 따라오지 않아 건물이 조용히 겹친다.
 */
const MIN_SIDE = 3;
const MAX_SIDE = 8;

export const building: PartSpec = {
  kind: 'building',
  tiers: ['near', 'mid', 'far'], // 가장 멀리서도 보인다 — 스카이라인을 만드는 것이 건물이다
  salt: 0x7f4a7c15,
  tones: [0x3d4557, 0x454e63, 0x353c4c, 0x4a5468, 0x2e3543],

  // `1 + floor(rnd * max)` 의 상한이다. rnd < 1 이므로 max 를 넘지 않는다.
  //
  // 상한이 **사분면 수(4)를 넘으면 안 된다.** 넘는 순간 두 채가 같은 사분면에 배정돼
  // 겹치기 시작한다 — 그게 이 값을 6에서 4로 내린 이유의 절반이다.
  maxPerParcel: (o) => o.maxBuildings,

  place: ({ px, pz, rnd, o, halfX, halfZ }) => {
    // 광장에는 짓지 않는다. 채수 하한을 1로 내려도 어느 파셀에나 한 채는 서므로,
    // "아무것도 없는 트인 곳" 은 이 예외로만 생긴다.
    if (isPlaza(px, pz)) return [];
    const dirs = roadDirs(px, pz);
    // 1~4채. 예전엔 2~6이었고, 1000㎡ 당 3.91채로 world1(1.74채)의 **2.25배**였다.
    // 이제 2.44채 — world1 의 1.4배까지 내려온다. 하한을 1로 내린 것도 의도다:
    // 하한 2면 "한 채만 선 여유로운 구획"이 구조적으로 존재할 수 없다.
    const n = 1 + Math.floor(rnd() * o.maxBuildings);
    // 사분면을 섞어 1:1로 나눠 준다. 섞지 않으면 첫 건물이 늘 같은 사분면에 서서
    // 도시가 한쪽으로 쏠린 규칙성을 띤다.
    const quads = shuffledQuadrants(rnd);
    const out: PlacedPart[] = [];
    for (let i = 0; i < n; i++) {
      const pos = pickInQuadrant(rnd, halfX, halfZ, dirs, quads[i], MAX_SIDE / 2);
      const ry = Math.floor(rnd() * 4) * (Math.PI / 2); // 직각 배치 — 도시가 정돈돼 보인다
      const w = MIN_SIDE + rnd() * (MAX_SIDE - MIN_SIDE);
      const d = MIN_SIDE + rnd() * (MAX_SIDE - MIN_SIDE);
      const h = 4 + rnd() * 16;
      const tone = Math.floor(rnd() * 5);
      out.push({ kind: 'building', x: pos.x, z: pos.z, y: 0, ry, sx: w, sy: h, sz: d, tone });
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
