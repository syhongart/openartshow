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

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { bakePieces, rgb, type Piece } from './bake.js';
import { V, TINTS } from './palette.js';
import { roadDirs, LAMP_CLEARANCE } from './road-topology.js';
import { parcelSlots, freeSlots, jitterIn, lampReservations } from '../decide/parcel-slots.js';
import { isPlaza, plazaOccupied } from './plaza.js';

/**
 * 화분이 차지하는 반경. 덤불 반경 0.3 에 스케일을 곱하고 잎이 삐져나온 만큼을 더한다.
 *
 * 함수인 이유는 스케일이 인스턴스마다 다르기 때문이다 — 상수 하나로 잡으면 큰 화분이
 * 겹치거나 작은 화분이 자리를 낭비한다.
 */
const PLANTER_RADIUS = (s: number) => 0.3 * s + 0.15;

export const planter: PartSpec = {
  kind: 'planter',
  // 벤치보다도 작다(0.8m). near 에서만 — mid 에서도 이미 점 하나다.
  tiers: ['near'],
  salt: 0x2c8fd651,
  // 정점색이 색을 주므로 **흰색 근처**여야 한다 — 곱셈기다. 밝기만 흔들어 화분마다
  // 조금씩 다르게 보이게 한다.
  tones: [TINTS.plain, TINTS.plantPale, TINTS.plantSoft],

  // 덤불 반경 0.3 에 스케일을 곱한다. `place` 가 넣는 `sx` 가 그 스케일이다.
  footprint: (p) => PLANTER_RADIUS(p.sx),

  maxPerParcel: () => 3,

  /**
   * 빈 슬롯에 놓는다 (감독 지시로 바뀐 자리).
   *
   * 목록 마지막 차례라 남은 자리를 받는다. 화분은 작아서(반경 0.5 안팎) 나무·건물이
   * 못 쓰는 좁은 틈에도 들어간다 — 우선순위가 낮은 것이 오히려 어울린다.
   */
  place: ({ px, pz, rnd, o, halfX, halfZ, placed, radiusOf }) => {
    // 미술관이 파셀을 통째로 쓰는 칸 — 소품이 벽 안에 박힌다(plaza.ts)
    if (plazaOccupied(px, pz)) return [];
    const dirs = roadDirs(px, pz);
    const n = isPlaza(px, pz) ? 3 : Math.floor(rnd() * 3);
    if (n === 0) return [];

    const slots = parcelSlots(o, halfX, halfZ, dirs);
    const reserved = lampReservations(o, dirs, LAMP_CLEARANCE);
    const out: PlacedPart[] = [];

    for (let i = 0; i < n; i++) {
      // 화분은 둥글어서 회전이 안 보인다. 대신 **크기**를 흔들어 다양함을 만든다 —
      // 회전에 난수를 쓰면 소비만 하고 화면은 그대로다.
      const s = 0.85 + rnd() * 0.35;
      // 나무와 같은 이유로 크기를 먼저 뽑는다 — 반경이 정해져야 자리를 물어볼 수 있다.
      const r = PLANTER_RADIUS(s);
      const free = freeSlots(slots, [...placed, ...out], radiusOf, r, reserved);
      if (free.length === 0) break;

      const slot = free[Math.floor(rnd() * free.length)];
      const pos = jitterIn(rnd, slot, r);
      const tone = Math.floor(rnd() * 3);
      out.push({ kind: 'planter', x: pos.x, z: pos.z, y: 0, ry: 0, sx: s, sy: s, sz: s, tone });
    }
    return out;
  },

  asset: (T) => ({
    geometry: buildPlanter(T),
    material: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
    castShadow: true,
    receiveShadow: false,
  }),
};

/** 화분 — 테라코타 */
const POT = rgb(V.terracotta);
/** 덤불 */
const BUSH = rgb(V.shrub);

/**
 * world1 `SG.planter` 를 되살렸다.
 *
 *   통    Cylinder(0.28, 0.2, 0.42, 12) → y=0.21
 *   덤불  Sphere(0.3, 10, 8) 을 세로 0.92배 → y=0.62
 *
 * 예전에는 **덤불만** 남기고 화분을 뺐다. 재질이 하나라 갈색과 초록을 같이 못 쓴다고
 * 판단했기 때문인데, 정점색을 쓰면 된다는 것을 나무에서 배웠다. 화분 없는 덤불은
 * 땅에서 솟은 초록 공이라 감독 화면에서 그렇게 보였다.
 */
function buildPlanter(T: ThreeNS) {
  const pieces: Piece[] = [
    { geo: new T.CylinderGeometry(0.28, 0.2, 0.42, 12).translate(0, 0.21, 0), color: POT },
    { geo: new T.SphereGeometry(0.3, 10, 8).scale(1, 0.92, 1).translate(0, 0.62, 0), color: BUSH },
  ];
  return bakePieces(T, pieces);
}
