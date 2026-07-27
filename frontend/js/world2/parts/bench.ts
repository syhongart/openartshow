// 벤치 — 앉을 자리가 있으면 거리가 머무는 곳이 된다.
//
// 감독 지시: *"나무로 월드 1의 나무와 소품들. 가지고 오고."*
//
// ── world1 에서 무엇을 가져왔나 ──────────────────────────────────────────────
// **치수만** 가져왔다(`world.js` 의 `SG.bench`). 좌석 1.4×0.09×0.44 에 다리 둘,
// 좌석 높이 0.45m — 실제로 앉는 높이라 사람 옆에 두면 스케일이 맞다. 눈으로 맞춘 값이
// 아니라 라이브에서 검증된 값이라 그대로 계승한다.
//
// **조립 방식은 안 가져왔다.** world1 은 소품마다 개별 Mesh 를 만들고 파셀 단위로
// `mergeGeometries` 해서 드로우콜을 줄였다. world2 는 종류당 `InstancedMesh` 하나이므로
// 병합이 필요 없고, 병합하면 오히려 개수 불변식이 깨진다(파셀마다 새 지오가 생긴다).
// 여기서는 지오 하나를 부팅 때 만들고 인스턴스 행렬만 갱신한다.
//
// ── 왜 mid 까지인가 ──────────────────────────────────────────────────────────
// 벤치는 높이 0.5m 다. `far`(76.8m)에서는 몇 픽셀도 안 되어 보이지 않는데 슬롯만 먹는다.
// 가로등이 `near` 전용인 것과 같은 판단이고, 이 한 줄이 슬롯 예산을 결정한다.

import type { PartSpec, PlacedPart } from './types.js';
import { roadDirs, pickOffRoad } from './road-topology.js';
import { isPlaza } from './plaza.js';

export const bench: PartSpec = {
  kind: 'bench',
  tiers: ['near', 'mid'],
  salt: 0x5f1d3a27,
  // 나무색 둘. 하나면 온 세계 벤치가 같은 색이고, 셋 이상이면 거리가 알록달록해진다.
  tones: [0x8a6a48, 0x6f5540],

  maxPerParcel: () => 2,

  place: ({ px, pz, rnd, halfX, halfZ }) => {
    const dirs = roadDirs(px, pz);
    // **광장에 더 많이 둔다.** 광장은 "숨 쉴 곳" 으로 만든 빈 구획인데, 정말 아무것도
    // 없으면 빈 땅으로 읽힌다. 앉을 것이 있어야 머물 수 있는 자리가 된다.
    const n = isPlaza(px, pz) ? 2 : (rnd() < 0.35 ? 1 : 0);
    const out: PlacedPart[] = [];
    for (let i = 0; i < n; i++) {
      const pos = pickOffRoad(rnd, halfX, halfZ, dirs);
      // 90° 단위로만 돌린다. 벤치는 인공물이라 비스듬히 놓이면 버려진 것처럼 보인다.
      const ry = Math.floor(rnd() * 4) * (Math.PI / 2);
      const tone = Math.floor(rnd() * 2);
      out.push({ kind: 'bench', x: pos.x, z: pos.z, y: 0, ry, sx: 1, sy: 1, sz: 1, tone });
    }
    return out;
  },

  // 좌석과 다리 둘을 한 지오로 굽는다. world1 은 `mergeGeometries` 를 썼지만 여기서는
  // three 를 인자로만 받으므로(런타임 import 0) 박스 셋을 직접 합치는 대신 **좌석 하나에
  // 다리를 파묻은 한 덩어리**로 단순화했다 — 36삼각형이 24가 되고, 다리 안쪽 면은 어차피
  // 안 보인다.
  asset: (T) => ({
    geometry: new T.BoxGeometry(1.4, 0.5, 0.44).translate(0, 0.25, 0),
    material: new T.MeshStandardMaterial({ roughness: 0.82, metalness: 0.02 }),
    castShadow: true,
    receiveShadow: false,
  }),
};
