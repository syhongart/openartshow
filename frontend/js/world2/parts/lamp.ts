// 가로등 — 밤의 거리감을 만드는 것.
//
// ── world1 실물을 가져왔다 (감독 지시) ──────────────────────────────────────
// 감독: *"임시 아셋들 삭제하고 월드1에 있던 의자 가로등 가지고 오자."*
//
// 예전 이 파일은 원기둥 하나짜리 **플레이스홀더**였고, 주석이 스스로 그렇게 적고
// 있었다 — "빛나는 헤드가 없다. world2 는 야간이 기본이라 가로등이 룩에 미치는 영향이
// 큰데, 지금은 어두운 막대기다."
//
// world1(`world.js` 의 `SG`)은 기둥(CylinderGeometry 0.06→0.09, 높이 3.0)과
// 갓(Sphere 0.22를 세로로 눌러 y=3.06)이었다. 그 치수를 그대로 쓴다 — 라이브에서
// 사람 옆에 서 있던 값이라 스케일이 검증돼 있다.
//
// 조각이 둘이지만 재질은 하나여야 하므로(개수 불변식) `bakePieces` 로 한 지오에 굽고
// 정점색으로 기둥(어두운 금속)과 갓(밝은 유백)을 나눈다.
//
// 크기 편차를 두지 않는다. 가로등이 제각각이면 자연물이 아니라 인공물이라 눈에 띈다.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { bakePieces, rgb, type Piece } from './bake.js';
import { roadDirs, DIRS, ROAD_HALF, SETBACK } from './road-topology.js';

/**
 * 인도 한가운데까지의 거리(미터). 차도 끝(`ROAD_HALF`)과 건물 셋백(`SETBACK`) 사이가
 * 인도이므로 그 **중점**이다. 두 값에서 유도한다 — 6.25 를 직접 적으면 인도 폭을
 * 조정할 때 가로등만 옛 자리에 남는다(값 미러링).
 */
export const LAMP_OFFSET = (ROAD_HALF + SETBACK) / 2;

export const lamp: PartSpec = {
  kind: 'lamp',
  tiers: ['near'], // 가까이서만. 이 한 줄이 슬롯 예산을 far 의 1/3로 줄인다
  salt: 0x94d049bb,
  // 정점색이 색을 주므로 **흰색 근처**여야 한다 — 곱셈기다.
  tones: [0xffffff],

  // 방향당 하나이므로 최댓값은 방향 수다. **유도한다** — 4 를 적어 두면 방향이 늘 때
  // 슬롯이 모자라고, 그 부족은 `starved` 로만 나타나 원인을 찾기 어렵다.
  maxPerParcel: () => DIRS.length,

  /**
   * 도로 축을 따라 **인도 위에** 세운다.
   *
   * ── 감독 지적 ─────────────────────────────────────────────────────────────
   * *"아니 무슨 가로등을 나무처럼 심어 놨어."*
   *
   * 그 전까지 이 함수는 나무·벤치와 똑같은 `pickOffRoad` 를 썼다 — 길만 피하고 사분면
   * 아무 데나 뽑는 것이다. 나무는 그래야 자연스럽지만 가로등은 **길을 밝히는 물건**이라
   * 길에서 떨어져 정원 한가운데 서 있으면 용도를 잃는다. 이 파일 주석이 스스로
   * *"길가에 줄지어 세우는 것은 가로등 차례의 일"* 이라 적어 두고 그 차례가 오지 않았다.
   *
   * ── 왜 난수를 하나도 안 쓰는가 ──────────────────────────────────────────────
   * 가로등 자리는 **도로가 정한다.** 난수를 섞으면 이웃 파셀과 줄이 안 맞아 다시
   * "심어 놓은" 모습이 된다. 여기서 결정론은 성능이 아니라 **룩의 요건**이다.
   *
   * ── 줄이 이어지는 원리 ──────────────────────────────────────────────────────
   * 옆으로 비키는 쪽을 **축마다 고정**한다 — 동서 도로는 늘 +z 쪽, 남북 도로는 늘 +x 쪽.
   * "진행 방향의 오른쪽" 같은 규칙을 쓰면 east 와 west 가 **같은 도로선의 반대편**을
   * 골라서, 파셀 경계마다 가로등이 길 건너로 옮겨 다닌다.
   *
   * 축 방향 거리는 **셀의 1/4** 이다. 그러면 세계좌표에서 가로등이
   *
   *   … , px·cell − cell/4 , px·cell + cell/4 , (px+1)·cell − cell/4 , …
   *
   * 로 놓여 간격이 `cell/2` 로 **균등**해진다(중심의 교차로만 비어 있다).
   *
   * 반폭(`halfX`)의 절반이 아니다. 반폭은 `cell/2 − margin` 이라 파셀 경계를 넘는 순간
   * 간격이 어긋난다(기본값에서 18.5m 와 13.5m 가 번갈아 나온다). 균등 간격을 결정하는
   * 것은 **파셀 중심 사이 거리**이므로 셀에서 유도해야 한다. 반폭은 파셀 밖으로 나가지
   * 않게 눌러 주는 데만 쓴다.
   */
  place: ({ px, pz, o, halfX, halfZ }) => {
    const out: PlacedPart[] = [];
    const alongX = Math.min(o.cellX / 4, halfX);
    const alongZ = Math.min(o.cellZ / 4, halfZ);
    const at = (x: number, z: number): PlacedPart =>
      ({ kind: 'lamp', x, z, y: 0, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 });
    for (const d of roadDirs(px, pz)) {
      if (d === 'east') out.push(at(alongX, LAMP_OFFSET));
      else if (d === 'west') out.push(at(-alongX, LAMP_OFFSET));
      else if (d === 'north') out.push(at(LAMP_OFFSET, -alongZ));
      else out.push(at(LAMP_OFFSET, alongZ));
    }
    return out;
  },

  /**
   * 실제 광원은 아니다 — 조명 개수는 상수여야 하므로(개수 불변식) 가로등마다 라이트를
   * 달 수 없다. 대신 **자체발광**으로 켜진 것처럼 보이게 한다.
   *
   * ── 감독 지시 ─────────────────────────────────────────────────────────────
   * *"밤에는 가로등이 켜져야 하고."*
   *
   * 예전 값은 `0x2a2415` 로 **어두운 황갈색**이었다. 그 색은 밤에도 배경과 구분되지
   * 않아서, 발광을 켜 둔 의미가 없었다. 등불색으로 바꾸고 **강도를 0에서 시작**한다 —
   * 켜고 끄는 것은 `emissiveIntensity`(uniform)로 하고, 그 값을 하늘이 시간대에 따라
   * 정한다(`features/sky.ts` → `decide/night.ts`).
   *
   * `emissive` **색**을 매 프레임 바꾸지 않고 강도만 만지는 이유: 색은 그대로 두고
   * 스칼라 하나만 흔들면 만질 것이 최소가 되고, 낮에 정확히 0으로 꺼진다.
   *
   * 발광이 기둥에도 걸린다(재질이 하나다). 그대로 두는 쪽을 택했다 — 등 아래 금속이
   * 빛을 받아 밝은 것은 실제로도 그렇고, 갓만 빛나게 하려면 파츠를 하나 더 만들어야
   * 하는데 그 드로우콜이 이 효과보다 비싸다.
   */
  asset: (T) => ({
    geometry: buildLamp(T),
    material: new T.MeshStandardMaterial({
      vertexColors: true,
      emissive: LAMP_LIGHT,
      // 낮에서 시작한다. 밤이면 하늘이 첫 프레임에 올린다.
      emissiveIntensity: 0,
      roughness: 0.6,
      metalness: 0.05,
    }),
    castShadow: true,
    receiveShadow: false,
  }),
};

/**
 * 등불색. 나트륨등의 따뜻한 노랑을 조금 눅인 값이다.
 *
 * 순백으로 하면 밤에 형광등처럼 차갑고, 채도를 더 올리면 주황 점으로만 보여 등의
 * 형태가 사라진다. 이 값이 **켜졌다고 읽히면서 갓 모양도 남는** 선이다.
 */
const LAMP_LIGHT = 0xffc86e;

/** 기둥 — 어두운 금속. 갓과 대비돼야 실루엣이 산다 */
const POST = rgb(0x4a4636);
/** 갓 — 유백. 자체발광과 함께 밤에 불빛으로 읽힌다 */
const HEAD = rgb(0xd8cfa8);

/**
 * world1 `SG.lampPost` + `SG.lampHead` 의 치수 그대로.
 *
 *   기둥  CylinderGeometry(0.06, 0.09, 3.0, 8)  → y=1.5 로 올려 밑동을 바닥에
 *   갓    SphereGeometry(0.22, 10, 8) 을 세로 0.8배로 눌러 y=3.06
 *
 * 세그먼트를 8·10 그대로 둔 것은 가로등이 파셀당 최대 4개뿐이라 삼각형 예산에
 * 여유가 있어서다. 나무처럼 128그루가 서는 것과 다르다.
 */
function buildLamp(T: ThreeNS) {
  const pieces: Piece[] = [
    { geo: new T.CylinderGeometry(0.06, 0.09, 3.0, 8).translate(0, 1.5, 0), color: POST },
    { geo: new T.SphereGeometry(0.22, 10, 8).scale(1, 0.8, 1).translate(0, 3.06, 0), color: HEAD },
  ];
  return bakePieces(T, pieces);
}
