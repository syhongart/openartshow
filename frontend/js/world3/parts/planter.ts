// 화분 — 거리에 초록을 얹는 작은 것. 마을에서는 **꽃이 핀 관목 화분**이다.
//
// 감독 지시: *"나무로 월드 1의 나무와 소품들. 가지고 오고."*
//
// world1 의 `SG.planter` 는 화분(원기둥) + 덤불(구) 두 조각을 정점색으로 칠해 병합한
// 것이었다. 한때 여기서 **덤불만** 남기고 화분을 뺐던 시기가 있는데, 재질이 하나라
// 갈색과 초록을 같이 못 쓴다고 판단했기 때문이다. 정점색을 쓰면 된다는 것을 나무에서
// 배워 되돌렸다 — 화분 없는 덤불은 땅에서 솟은 초록 공이라 감독 화면에서 그렇게 보였다.
//
// 나무(`tree.ts`)보다 훨씬 작아 **나무를 못 놓는 좁은 자리**를 메우는 것이 이 파츠의 몫이다.
//
// ── 포근마을 개조 (2026-08-08) ─────────────────────────────────────────────
// 바뀐 것은 색과 조각 구성이다. 배치(`place`)·반경(`footprint`)·개수는 한 줄도 안 건드렸다.
//
//   · 덤불 구 하나 → **구 셋을 겹친 동글동글한 관목.** 구 하나는 어느 각도에서 봐도
//     완전한 원이라 "공" 으로 읽힌다. 셋을 어긋나게 겹치면 윤곽이 울퉁불퉁해져 비로소
//     식물이 된다 — 나무 캐노피를 3단으로 쌓은 것과 같은 이유다.
//   · **꽃 셋.** 이 파츠가 near 전용이라(가까이서만 보인다) 작은 디테일이 값을 한다.
//     멀리서 보이는 나무는 열매를, 발치에서 보이는 화분은 꽃을 다는 셈이다.
//   · 화분에 **테두리 링.** 통만 있으면 잘린 원기둥이고, 링 한 겹이 얹히면 그릇이 된다.
//     집(`building.ts`)에 굽을 두른 것과 같은 수법이다.
//
// ── 삼각형 실측 188 → 248 (+32%) ──────────────────────────────────────────
// 첫 판본은 292 였다(+55%). 셋을 되받아 248 로 내렸다:
//
//   화분 세그 12 → 10        정면에서 보이는 면이 다섯이라 각진 것이 오히려 룩에 맞다
//   통 뚜껑 제거(openEnded)  링과 땅에 가려 **어느 시점에서도 안 보이는** 캡 두 장
//   관목 가운데 8×6 → 7×5    반지름 0.26m 짜리 구다. 이 크기에서 7각과 8각은 구별 안 된다
//
// **near 전용이라 인스턴스가 적다**(파셀당 최대 3, near 밴드 안에서만). 나무(far 까지,
// 파셀당 8)와 달리 총량 기여가 작으므로 여기서 더 깎을 이유는 없다 — 예산은 나무 쪽에서
// 아끼는 것이 훨씬 값이 크다.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { bakePieces, rgb, type Piece } from './bake.js';
import { roadDirs, LAMP_CLEARANCE } from './road-topology.js';
import { parcelSlots, freeSlots, jitterIn, lampReservations } from '../decide/parcel-slots.js';
import { isPlaza, plazaOccupied } from './plaza.js';
import { V, TINTS } from './palette.js';

/**
 * 화분이 차지하는 반경. 덤불 반경 0.3 에 스케일을 곱하고 잎이 삐져나온 만큼을 더한다.
 *
 * 함수인 이유는 스케일이 인스턴스마다 다르기 때문이다 — 상수 하나로 잡으면 큰 화분이
 * 겹치거나 작은 화분이 자리를 낭비한다.
 *
 * ⚠️ **지오메트리를 바꿀 때 이 0.3 이 상한이다.** 관목이 구 셋으로 늘면서 실제 최대
 * 수평 반경이 `SIDE_OFF + SIDE_R` = 0.30 이 됐다 — 정확히 상한에 닿아 있다. 여기를
 * 넘기면 화분이 서로 파고들거나 가로등 여유를 먹는데, 그 증상은 화면에서 "가끔 겹친다"
 * 로만 나타나 원인을 짚기 어렵다. 조각을 옆으로 더 벌리려면 이 값부터 본다.
 */
const PLANTER_RADIUS = (s: number) => 0.3 * s + 0.15;

export const planter: PartSpec = {
  kind: 'planter',
  // 벤치보다도 작다(0.8m). near 에서만 — mid 에서도 이미 점 하나다.
  tiers: ['near'],
  salt: 0x2c8fd651,
  // 정점색이 색을 주므로 **흰색 근처**여야 한다 — 곱셈기다. 밝기만 흔들어 화분마다
  // 조금씩 다르게 보이게 한다.
  //
  // 포근마을 개조에서 리터럴 셋(`0xffffff, 0xf0f4e8, 0xe4ecdc`)을 팔레트 틴트로 옮겼다.
  // 지면·나무와 달리 `blush` 를 섞는다 — 이 파츠는 꽃이 주인공이라 분홍기가 꽃 쪽으로
  // 읽히고, 관목에 곱해져도 초록이 살짝 따뜻해질 뿐이다.
  tones: [TINTS.plain, TINTS.mint, TINTS.blush],

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

// ── 지오메트리 ──────────────────────────────────────────────────────────────
//
// **피벗은 바닥**(y=0 이 땅). world1 `SG.planter` 의 비율을 이어받았다:
//   통 0.42 높이 · 관목 중심 0.6 대 · 전체 0.9m — 사람 무릎 높이다.

/** 화분 세그먼트. 12 였다. 10 이면 정면에서 보이는 면이 다섯이라 로우폴리감이 산다 */
const POT_SEG = 10;
/** 화분 통 — 위가 넓다 */
const POT_TOP_R = 0.28;
const POT_BOT_R = 0.20;
const POT_H = 0.42;
/** 테두리 링. 통보다 살짝 넓게 튀어나와야 그릇의 아가리로 읽힌다 */
const RIM_R = 0.30;
const RIM_H = 0.06;

/** 관목 가운데 덩어리 */
const BUSH_R = 0.26;
const BUSH_Y = 0.66;
/**
 * 곁덩어리 둘. **`SIDE_OFF + SIDE_R` 이 0.30 을 넘으면 안 된다** — 위 `PLANTER_RADIUS`
 * 가 그 값을 반경으로 신고하고 있고, 넘기면 신고와 실물이 어긋난다.
 */
const SIDE_R = 0.17;
const SIDE_OFF = 0.13;

/** 꽃 한 송이. 정이십면체 하나(20삼각형)면 이 크기에서 구와 구별되지 않는다 */
const BLOOM_R = 0.055;

function buildPlanter(T: ThreeNS) {
  const pieces: Piece[] = [];
  const add = (geo: Piece['geo'], color: number) => pieces.push({ geo, color: rgb(color) });

  // 화분 통. 테라코타 — 팔레트에서 굴뚝 벽돌과 같은 색을 쓴다. 마을 안에서 구운 흙은
  // 한 종류라는 뜻이고, 색을 하나 더 만들면 그만큼 팔레트가 흐려진다.
  //
  // **뚜껑을 안 만든다**(`openEnded = true`). 위는 테두리 링이 반경 0.30 으로 통보다 넓게
  // 덮고 아래는 땅에 붙으므로, 캡 두 장(20삼각형)은 **어느 시점에서도 안 보인다.**
  // 화분 하나에서 20 이면 전체의 8% 다 — 안 보이는 면을 굽지 않는 것이 가장 싼 절약이다.
  add(
    new T.CylinderGeometry(POT_TOP_R, POT_BOT_R, POT_H, POT_SEG, 1, true)
      .translate(0, POT_H / 2, 0),
    V.brick,
  );
  // 테두리. 통 위에 얹는다(중심 = 통 높이 + 링 반높이).
  add(
    new T.CylinderGeometry(RIM_R, RIM_R, RIM_H, POT_SEG).translate(0, POT_H + RIM_H / 2, 0),
    V.wallBase,
  );

  // 관목 가운데. 아랫부분이 테두리(상단 0.48) 안으로 들어가야 심긴 것으로 보인다 —
  // 실측 하단 = 0.66 − 0.26×0.92 = 0.42 < 0.48 ✓
  add(
    new T.SphereGeometry(BUSH_R, 7, 5).scale(1, 0.92, 1).translate(0, BUSH_Y, 0),
    V.bush,
  );
  // 곁덩어리 둘. 색을 갈라 밝은 쪽을 하나 섞는다 — 같은 초록이면 겹친 티가 안 나고
  // 그냥 울퉁불퉁한 공 하나로 보인다.
  add(
    new T.SphereGeometry(SIDE_R, 6, 4).translate(-SIDE_OFF, BUSH_Y - 0.07, SIDE_OFF * 0.4),
    V.leafLight,
  );
  add(
    new T.SphereGeometry(SIDE_R, 6, 4).translate(SIDE_OFF, BUSH_Y - 0.10, -SIDE_OFF * 0.5),
    V.bush,
  );

  // 꽃 셋. 관목 위쪽에 박는다 — 아래에 달면 잎에 가려 안 보인다.
  // 좌표를 난수가 아니라 손으로 적은 것은 셋뿐이기 때문이다. 난수를 쓰면 씨앗을 고정해야
  // 하고(지오가 하나라 모양이 빌드마다 달라지면 안 된다) 그 씨앗을 관리하는 값이 하나
  // 더 는다. 셋은 눈으로 고르는 편이 낫다.
  const blooms: readonly [number, number, number, number][] = [
    [-0.12, BUSH_Y + 0.17, 0.10, V.flowerPink],
    [0.14, BUSH_Y + 0.13, -0.06, V.flowerYellow],
    [0.02, BUSH_Y + 0.21, -0.14, V.flowerWhite],
  ];
  for (const [x, y, z, color] of blooms) {
    add(new T.IcosahedronGeometry(BLOOM_R, 0).translate(x, y, z), color);
  }

  return bakePieces(T, pieces);
}
