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

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { bakePieces, rgb, type Piece } from './bake.js';
import { roadDirs, LAMP_CLEARANCE } from './road-topology.js';
import { parcelSlots, freeSlots, takeSlots, jitterIn, lampReservations } from '../decide/parcel-slots.js';
import { isPlaza, plazaOccupied } from './plaza.js';

/** 벤치가 차지하는 반경(미터). 좌판 1.4m 의 절반 + 앉을 여유 */
const BENCH_RADIUS = 0.95;

export const bench: PartSpec = {
  kind: 'bench',
  // 전 계층 — mid→far 강등(56m, 안개 19%)이 벤치를 걷어내는 순간이 깜빡임의 한 겹이었다
  // (감독 실측 2026-08-10). 근거·경계는 `planter.ts` 의 tiers 주석 한 곳이다.
  tiers: ['near', 'mid', 'far'],
  salt: 0x5f1d3a27,
  // 정점색이 색을 주므로 **흰색 근처**여야 한다 — 곱셈기다. 나무색 변주는 정점색이
  // 아니라 tones 의 밝기로 준다(같은 벤치가 조금씩 바래 보인다).
  tones: [0xffffff, 0xeee6d8],

  // 좌판 1.4 × 0.44. 회전이 직각 배수라 긴 변의 절반이 곧 반경이고, 앉을 자리를
  // 남기려 조금 더 준다. 상수 하나를 자리 탐색과 겹침 판정이 함께 본다 — 둘이 어긋나면
  // "안 겹친다고 판정한 자리에 놓았는데 겹치는" 상태가 된다.
  shadowProfile: 'box',
  footprint: () => BENCH_RADIUS,

  maxPerParcel: () => 2,

  /**
   * 빈 슬롯에 놓는다 (감독 지시로 바뀐 자리).
   *
   * 나무 다음 차례라 나무가 쓰고 남은 자리를 받는다 — `parts/index.ts` 의 목록 순서가
   * 곧 우선순위다. 벤치는 많아야 둘이라 자리 경쟁에서 밀려도 티가 안 나지만, 나무
   * 여덟 그루가 밀리면 파셀이 휑해진다.
   */
  place: ({ px, pz, rnd, o, halfX, halfZ, placed, radiusOf }) => {
    // 미술관이 파셀을 통째로 쓰는 칸 — 소품이 벽 안에 박힌다(plaza.ts)
    if (plazaOccupied(px, pz)) return [];
    const dirs = roadDirs(px, pz);
    // **광장에 더 많이 둔다.** 광장은 "숨 쉴 곳" 으로 만든 빈 구획인데, 정말 아무것도
    // 없으면 빈 땅으로 읽힌다. 앉을 것이 있어야 머물 수 있는 자리가 된다.
    const n = isPlaza(px, pz) ? 2 : (rnd() < 0.35 ? 1 : 0);
    if (n === 0) return [];

    const slots = parcelSlots(o, halfX, halfZ, dirs);
    const free = freeSlots(
      slots, placed, radiusOf, BENCH_RADIUS,
      lampReservations(o, dirs, LAMP_CLEARANCE),
    );
    return takeSlots(rnd, free, n, BENCH_RADIUS).map((slot) => {
      const pos = jitterIn(rnd, slot, BENCH_RADIUS);
      // 90° 단위로만 돌린다. 벤치는 인공물이라 비스듬히 놓이면 버려진 것처럼 보인다.
      const ry = Math.floor(rnd() * 4) * (Math.PI / 2);
      const tone = Math.floor(rnd() * 2);
      return { kind: 'bench', x: pos.x, z: pos.z, y: 0, ry, sx: 1, sy: 1, sz: 1, tone };
    });
  },

  asset: (T) => ({
    geometry: buildBench(T),
    material: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.02 }),
    castShadow: true,
    receiveShadow: false,
  }),
};

/** 좌석 — 나무 */
const SEAT = rgb(0x8a6a48);
/** 다리 — 좌석보다 어두운 나무. 같은 색이면 한 덩어리로 보인다 */
const LEG = rgb(0x5f4a33);

/**
 * world1 `SG.bench` 의 치수 그대로.
 *
 *   좌석  Box(1.4, 0.09, 0.44) → y=0.45   실제로 앉는 높이다
 *   다리  Box(0.12, 0.42, 0.4) → x=±0.58, y=0.21
 *
 * 예전에는 이것을 **박스 하나**로 뭉뚱그렸다("좌석에 다리를 파묻은 한 덩어리"). 24삼각형
 * 으로 싸긴 했지만 멀리서도 벤치로 안 보이는 통짜 블록이었다 — 벤치가 벤치로 읽히는
 * 것은 **좌석 아래가 비어 있기** 때문이다. 감독이 "임시 아셋" 이라 한 것이 이런 것들이다.
 */
function buildBench(T: ThreeNS) {
  const pieces: Piece[] = [
    { geo: new T.BoxGeometry(1.4, 0.09, 0.44).translate(0, 0.45, 0), color: SEAT },
    { geo: new T.BoxGeometry(0.12, 0.42, 0.4).translate(-0.58, 0.21, 0), color: LEG },
    { geo: new T.BoxGeometry(0.12, 0.42, 0.4).translate(0.58, 0.21, 0), color: LEG },
  ];
  return bakePieces(T, pieces);
}
