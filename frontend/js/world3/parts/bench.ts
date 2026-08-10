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
//
// 마을 개조로 등받이가 생겨 높이가 0.5 → 0.84m 가 됐다. **그래도 `tiers` 는 그대로다** —
// far 끝(76.8m)에서 0.84m 는 여전히 몇 픽셀이고, 등받이는 가로 1.4m 를 넓히는 것이
// 아니라 세로로 자란 것이라 원거리 실루엣이 늘지 않는다. 무엇보다 `tiers` 는 슬롯
// 예산의 근거라, 룩 때문에 건드리면 벤치가 아니라 **다른 파츠들의 자리**가 흔들린다.
//
// ── 도시 벤치 → 통나무 마을 벤치 (2026-08-08 포근마을 개조) ─────────────────
// `place`·`footprint`·`maxPerParcel`·`tiers`·`salt` 을 한 줄도 안 건드렸다. 좌판
// 길이 1.4m 와 좌석 높이 0.45m 도 그대로 계승한다 — 아래 `buildBench` 주석 참고.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { bakePieces, rgb, type Piece } from './bake.js';
import { roadDirs, LAMP_CLEARANCE } from './road-topology.js';
import { parcelSlots, freeSlots, takeSlots, jitterIn, lampReservations } from '../decide/parcel-slots.js';
import { isPlaza, plazaOccupied } from './plaza.js';
import { V, TINTS } from './palette.js';

/**
 * 벤치가 차지하는 반경(미터). 좌판(`SEAT_LEN`) 의 절반에 앉을 여유를 얹은 값이다.
 *
 * **길이를 여기 숫자로 다시 적지 않는다** — 주석의 값 미러링도 값 미러링이라, 좌판을
 * 늘렸을 때 이 주석만 옛 값을 말하게 된다. 이 저장소는 `lampAnchors` 주석이 도로 폭
 * 변경으로 통째로 거짓이 된 전례가 있다.
 */
const BENCH_RADIUS = 0.95;

export const bench: PartSpec = {
  kind: 'bench',
  tiers: ['near', 'mid'],
  salt: 0x5f1d3a27,
  // 정점색이 색을 주므로 **흰색 근처**여야 한다 — 곱셈기다. 나무색 변주는 정점색이
  // 아니라 tones 의 밝기로 준다(같은 벤치가 조금씩 바래 보인다).
  //
  // world2 는 `0xeee6d8` 을 직접 적었다. 값은 팔레트의 `butter` 와 사실상 같은 역할
  // 이었는데 이름이 없어서, 그 색이 "바랜 나무" 를 뜻하는지 우연인지 알 수 없었다.
  // `place` 가 `floor(rnd() * 2)` 로 뽑으므로 **길이 2 를 유지해야 한다** — 늘리면
  // 뽑히지 않는 톤이 생기고 줄이면 인덱스가 배열 밖으로 나간다.
  tones: [TINTS.plain, TINTS.butter],

  // 회전이 직각 배수라 긴 변의 절반이 곧 반경이고, 앉을 자리를 남기려 조금 더 준다.
  // 상수 하나를 자리 탐색과 겹침 판정이 함께 본다 — 둘이 어긋나면 "안 겹친다고 판정한
  // 자리에 놓았는데 겹치는" 상태가 된다.
  //
  // 마을 개조로 등받이가 붙었지만 **값은 그대로다.** 최대 도달이 √(0.7² + 0.25²) =
  // 0.75m 라 여전히 안쪽이고, 실루엣이 실제로 안 커졌는데 반경만 키우면 벤치가 쓰지도
  // 않을 자리를 잡고 앉아 나무·화분이 밀린다.
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

/** 좌판·등받이 — 통나무. `V.wood` 가 팔레트에서 *"목재(벤치·다리·표지판)"* 로 이름 붙은 색이다 */
const LOG = rgb(V.wood);
/**
 * 다리·지주 — 좌판보다 어두운 나무.
 *
 * world2 주석의 판정을 그대로 계승한다: *"같은 색이면 한 덩어리로 보인다."* 통나무로
 * 바뀌어도 그 이유는 그대로다 — 오히려 둥근 면끼리는 실루엣 경계가 더 흐려서 색 대비가
 * 없으면 다리가 좌판에 녹는다.
 */
const LEG = rgb(V.woodDeep);

/**
 * 좌판 길이(미터). world1 `SG.bench` 에서 계승했다.
 *
 * **`BENCH_RADIUS` 가 이 값을 근거로 삼는다** — 늘리면 위 `footprint` 를 반드시 함께
 * 본다. 좌판만 늘리고 반경을 그대로 두면 "안 겹친다고 판정한 자리에 놓았는데 겹치는"
 * 상태가 되고, 그것은 파셀 안 겹침 검사가 아니라 감독 화면에서 드러난다.
 */
const SEAT_LEN = 1.4;
/**
 * 앉는 면의 높이(미터). **라이브에서 검증된 값이라 통나무로 바뀌어도 그대로 간다.**
 *
 * 박스 좌판일 때는 판의 윗면이 곧 이 높이였다. 통나무는 원기둥이라 **중심이 아니라
 * 윗면**이 이 값이어야 하므로, 아래에서 중심을 `SEAT_TOP − LOG_R` 로 내려 잡는다.
 * 중심을 0.45 에 두면 앉는 면이 0.555 로 올라가 어른 무릎 높이를 넘는다.
 */
const SEAT_TOP = 0.45;
/** 좌판 통나무 반지름. 둘을 나란히 놓아 옛 좌판 깊이 0.44 를 그대로 채운다 */
const LOG_R = 0.105;
/** 좌판 통나무 중심 간격. `LOG_R` 에서 유도 — 두 통나무가 맞닿아 틈이 없다 */
const LOG_GAP = LOG_R * 1.1;
/** 등받이 통나무의 z. 뒤로 물러 앉아야 등이 닿는다 */
const BACK_Z = -0.17;

/**
 * 통나무 마을 벤치 — 조각 일곱.
 *
 *   좌판  Cylinder(LOG_R, …, SEAT_LEN, 8) ×2   눕혀서 나란히. 윗면이 SEAT_TOP
 *   등받이 Cylinder(0.08, …, SEAT_LEN, 8)       한 줄. 마을 벤치의 실루엣을 만든다
 *   뒷지주 Cylinder(0.055→0.085, 0.80, 6) ×2    땅에서 등받이까지 하나로 관통
 *   앞다리 Cylinder(0.055→0.085, 0.32, 6) ×2
 *
 * ── world2 에서 무엇이 바뀌었나 ────────────────────────────────────────────
 * world2 는 world1 `SG.bench` 의 **박스 3개**(좌석 Box(1.4,0.09,0.44) + 다리 둘)였다.
 * 그 앞 세대는 박스 **하나**로 뭉뚱그렸고, world2 주석이 그것을 이렇게 잡았다 —
 * *"벤치가 벤치로 읽히는 것은 좌석 아래가 비어 있기 때문이다."* 그 판정은 지금도 참이라
 * 좌판 아래를 비워 둔 구성을 그대로 계승했다.
 *
 * 마을에서 바뀐 것은 **재료의 단면**이다. 각진 판재는 도시 공원 벤치로 읽히고, 파스텔
 * 로우폴리에서는 그 직각이 유독 튄다. 원기둥은 세그먼트 8 만으로도 모서리가 사라진다.
 *
 * 등받이는 world2 에 없던 조각이다. 통나무 벤치는 좌판만 있으면 **평상**으로 보이고,
 * 등받이 한 줄이 들어가야 "앉는 것" 으로 읽힌다.
 *
 * ── 삼각형 예산 (실측, 2026-08-08) ─────────────────────────────────────────
 * **36 → 192(5.3배).** 배수만 보면 이 개조에서 가장 큰데 **절대량이 작다** — 벤치는
 * `near`·`mid` 뿐이고 파셀당 최대 2개라 인스턴스가 수십 단위다(가로등은 `far` 까지
 * 파셀당 4개, 100 단위). 그래서 좌판·등받이는 8세그로 둥글게 가고, 눈에 덜 걸리는
 * 다리·지주만 6세그로 아낀다.
 *
 * 실측: 삼각형 192 · 높이 0 ~ 0.840m · 실루엣 반경 0.743m.
 *
 * ── `footprint` 를 왜 안 건드렸나 ──────────────────────────────────────────
 * `BENCH_RADIUS` 0.95 는 좌판 절반(0.7)에 앉을 여유를 얹은 값이다. 등받이가 z 로
 * 나가지만 최대 도달은 `√(0.7² + 0.25²) = 0.74m(실측 0.743)` 로 여전히 안쪽이다 — 실루엣 반경이
 * 실제로 안 커졌으므로 조정하지 않는다.
 */
function buildBench(T: ThreeNS) {
  /** 통나무 하나를 x축으로 눕힌다. `rotateZ` 가 세로 원기둥을 가로로 돌린다 */
  const log = (r: number, len: number, y: number, z: number) =>
    new T.CylinderGeometry(r, r, len, 8).rotateZ(Math.PI / 2).translate(0, y, z);
  /** 세로 다리. 아래가 굵어야 땅을 딛고 선 것으로 보인다 */
  const post = (h: number, x: number, z: number) =>
    new T.CylinderGeometry(0.055, 0.085, h, 6).translate(x, h / 2, z);

  const seatCY = SEAT_TOP - LOG_R;
  const pieces: Piece[] = [
    { geo: log(LOG_R, SEAT_LEN, seatCY, -LOG_GAP), color: LOG },
    { geo: log(LOG_R, SEAT_LEN, seatCY, LOG_GAP), color: LOG },
    // 등받이. 지주가 이 안까지 올라와 물린다(지주 0.80 > 등받이 중심 0.76)
    { geo: log(0.08, SEAT_LEN, 0.76, BACK_Z), color: LOG },
    { geo: post(0.80, -0.55, BACK_Z), color: LEG },
    { geo: post(0.80, 0.55, BACK_Z), color: LEG },
    // 앞다리는 좌판 아래에서 끝난다 — 좌판 하단(seatCY − LOG_R = 0.24)보다 위로 물린다
    { geo: post(0.32, -0.55, 0.14), color: LEG },
    { geo: post(0.32, 0.55, 0.14), color: LEG },
  ];
  return bakePieces(T, pieces);
}
