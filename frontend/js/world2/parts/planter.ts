// 화분 — 거리에 초록을 얹는 작은 것.
//
// 감독 지시: *"나무로 월드 1의 나무와 소품들. 가지고 오고."*
//
// world1 의 `SG.planter` 는 화분(원기둥) + 덤불(구) 두 조각을 정점색으로 칠해 병합한
// 것이었다. 여기서는 **덤불만** 남기고 화분을 아래로 눌러 담았다 — 이유는 재질이다.
//
// world2 의 파츠는 종류당 재질 하나이고 색은 `tones` 의 인스턴스 색으로 준다(개수
// 불변식). 그래서 한 인스턴스 안에서 화분(갈색)과 덤불(초록)을 따로 칠할 수가 없다.
// 정점색을 쓰면 되지만 그러면 이 파츠만 다른 재질 설정을 갖게 되고, 그것이 파이프라인
// 캐시키 축이라 조합이 하나 늘어난다.
//
// 초록 쪽을 남긴 것은 거리에서 눈에 띄는 게 그쪽이라서다. 화분은 발치라 잘 안 보인다.
// 나무(`tree.ts`)보다 훨씬 작아 **나무를 못 놓는 좁은 자리**를 메우는 것이 이 파츠의 몫이다.

import type { PartSpec, PlacedPart } from './types.js';
import { roadDirs, pickOffRoad } from './road-topology.js';
import { isPlaza } from './plaza.js';

export const planter: PartSpec = {
  kind: 'planter',
  // 벤치보다도 작다(0.8m). near 에서만 — mid 에서도 이미 점 하나다.
  tiers: ['near'],
  salt: 0x2c8fd651,
  // 잎 색 셋. 같은 초록이 반복되면 복사한 티가 나고, 미묘하게 다르면 심어 놓은 것으로 읽힌다.
  tones: [0x4c6b42, 0x5c7a4a, 0x415f3c],

  maxPerParcel: () => 3,

  place: ({ px, pz, rnd, halfX, halfZ }) => {
    const dirs = roadDirs(px, pz);
    const n = isPlaza(px, pz) ? 3 : Math.floor(rnd() * 3);
    const out: PlacedPart[] = [];
    for (let i = 0; i < n; i++) {
      const pos = pickOffRoad(rnd, halfX, halfZ, dirs);
      // 화분은 둥글어서 회전이 안 보인다. 대신 **크기**를 흔들어 다양함을 만든다 —
      // 회전에 난수를 쓰면 소비만 하고 화면은 그대로다.
      const s = 0.85 + rnd() * 0.35;
      const tone = Math.floor(rnd() * 3);
      out.push({ kind: 'planter', x: pos.x, z: pos.z, y: 0, ry: 0, sx: s, sy: s, sz: s, tone });
    }
    return out;
  },

  asset: (T) => ({
    // 구를 살짝 눌러 덤불처럼. 8×6 이면 60삼각형 — world1 의 10×8(160)보다 가볍고
    // 이 크기에서는 차이가 안 보인다.
    geometry: new T.SphereGeometry(0.34, 8, 6).scale(1, 0.92, 1).translate(0, 0.34, 0),
    material: new T.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }),
    castShadow: true,
    receiveShadow: false,
  }),
};
