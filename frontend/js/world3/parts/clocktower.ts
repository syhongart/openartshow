// 마을회관 종탑 — 광장 한가운데. 분수대와 짝이고, 광장마다 둘 중 하나가 선다.
//
// 감독 지시: *"가운데. 분수대있고 시계탑있고."*
//
// ── world2 는 "4각 기둥 하나 + 텍스처" 였다. 왜 바뀌었나 (2026-08-08) ───────
// 그때의 제약은 이랬다: *"기둥·시계면·지붕을 따로 만들어 합치는 게 자연스럽지만 **병합을
// 못 쓴다** — `utils/BufferGeometryUtils.js` 가 `'three'` WebGL 빌드를 import 하는데
// world2 는 `'three/webgpu'` 다. 섞으면 두 빌드의 `BufferGeometry` 가 달라진다."*
//
// **그 제약은 이제 없다.** 나무가 재귀 가지를 굽느라 정점 배열을 직접 잇는 코드를 썼고,
// 가로등·벤치·화분이 같은 것을 필요로 하면서 `bake.ts` 로 올라갔다. 애드온을 import 하지
// 않고도 조각 여럿을 한 지오로 굽을 수 있다 — 개수 불변식(지오 1·재질 1)을 지키면서.
//
// 그래서 텍스처를 걷고 **형태로 만든다.** 텍스처판의 한계가 실제로 있었다: 4각 기둥
// 하나에 시계를 그렸으므로 **탑의 실루엣이 막대기 하나**였고, 종탑인데 종이 없었다.
// 로우폴리 마을에서 랜드마크를 정하는 것은 무늬가 아니라 윤곽이다.
//
// 캔버스 비율 함정(world1 도로가 압축비 9.6배로 무늬를 잃은 것, 이 파일이 1:6 캔버스로
// 피해 갔던 것)은 이제 **만나지 않는다** — UV 로 그리는 것이 없어졌다. 그 이력은 여전히
// `road.ts` 에 살아 있고, 거기서 유효하다.
//
// ── 높이 12m 의 뜻이 바뀌었다 ───────────────────────────────────────────────
// world2 주석: *"건물이 4~20m 이므로 12m 면 중간 키에 눈에 띈다."* 마을에서는 집이
// 3.2~5.6m 라 12m 가 **집의 2.1배**다 — 중간 키가 아니라 광장을 내려다보는 랜드마크다.
// 값을 바꾸지 않았는데 역할이 올라간 경우라, 값 옆에 그 사실만 적어 둔다.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { plazaLandmark } from './plaza.js';
import { bakePieces, rgb, type Piece } from './bake.js';
import { V, TINTS } from './palette.js';

/**
 * 탑 전체 높이(미터). **12. 값을 안 바꿨다.**
 *
 * world2 에서는 건물(4~20m) 사이의 중간 키였다. 마을에서는 집(3.2~5.6m)의 2.1배라
 * 광장 랜드마크가 됐다 — 같은 값이 다른 뜻을 갖게 된 경우다.
 *
 * **등대(16~26m, `tower.ts`)보다 반드시 낮아야 한다.** 마을에서 가장 높은 것은 하나여야
 * 하고, 그 자리는 등대다. 둘이 비슷해지면 멀리서 볼 때 어느 쪽으로 가야 할지가 흐려진다.
 */
const H = 12;

/**
 * 몸통 외접원 반지름. 4각이므로 한 면 폭은 `R × √2 ≈ 2.0m`.
 *
 * ⚠️ **이 값을 키우면 안 된다.** `footprint` 가 `R + 0.4` 이고 종탑은 파셀 중앙 **고정**
 * 배치라 자리를 양보할 수 없다 — 실루엣이 커지면 겹침 판정이 아니라 화면에서 파고든다.
 * 아래 모든 조각의 외접 반경이 `1.8`(= footprint) 안에 들어가는지 확인하며 잡았고, 가장
 * 큰 것이 지붕 처마 띠의 **1.725** 다.
 */
const R = 1.4;

export const clocktower: PartSpec = {
  kind: 'clock',
  // far 까지 그린다(76.8m). **높이 12m 짜리는 스카이라인에 걸려야 랜드마크다.**
  //
  // near 전용(41.6m)으로 뒀다가 감독이 "시계탑도 안 보이던데" 로 잡았다. 스폰 지점에서
  // 가장 가까운 광장이 91m 라 처음 들어가면 무조건 안 보였다. 멀리서 보여야 다가갈
  // 이유가 생긴다.
  tiers: ['near', 'mid', 'far'],
  salt: 0x5a6b7c8d,
  // 정점색을 구우므로 `tones` 는 **곱셈기**다 — 흰색 하나만 둔다.
  // (world2 도로에서 어두운 톤을 곱해 길이 검게 나온 사고가 있었다. 텍스처가 정점색으로
  //  바뀌어도 곱셈이라는 사실은 그대로다 — 파츠 자산 테스트가 두 경우를 함께 본다.)
  tones: [TINTS.plain],

  // 사각 기둥이라 모서리까지가 반경이다(`R` = 외접원 반경).
  footprint: () => R + 0.4,

  maxPerParcel: () => 1,

  place: ({ px, pz }) => {
    if (plazaLandmark(px, pz) !== 'clock') return [];
    const out: PlacedPart[] = [{
      kind: 'clock',
      x: 0, z: 0, y: 0, ry: 0,
      sx: 1, sy: 1, sz: 1,
      tone: 0,
    }];
    return out;
  },

  asset: (T) => ({
    geometry: buildBelfryGeometry(T),
    material: new T.MeshStandardMaterial({
      vertexColors: true,
      // 집(0.72)과 등대(0.78) 사이. 회관은 회반죽 벽이지만 석재 기단과 목재 종탑이
      // 섞여 있어 어느 한쪽으로 몰면 한 재질만 어색해진다.
      roughness: 0.75,
      metalness: 0.0,
    }),
    castShadow: true,
    receiveShadow: true,
  }),
};

// ── 지오메트리 ──────────────────────────────────────────────────────────────
//
// **실제 치수로 만든다.** `place` 가 `sx=sy=sz=1` 을 내므로 여기 적힌 숫자가 곧 미터다
// (집·등대는 단위 1 짜리를 인스턴스가 늘리는 방식이라 정반대다 — 두 규약이 한 폴더에
// 섞여 있으니 조각을 옮겨 붙일 때 주의한다). 피벗은 바닥.
//
// 높이 배분 — 합이 정확히 `H` 다:
//
//   0.00 ~ 0.30   기단(돌)
//   0.30 ~ 4.90   몸통(회관 1층). 굽 0.30~0.52 가 겹쳐 있다
//   4.90 ~ 5.06   1층 처마
//   5.06 ~ 5.18   종탑 바닥판
//   5.18 ~ 8.28   종탑 — **네 기둥만 세워 실제로 뚫는다**(종이 보여야 종탑이다)
//   8.28 ~ 8.52   종탑 상판
//   8.52 ~ 11.12  사각뿔 지붕
//   11.12 ~ 12.00 첨탑과 꼭대기 구슬

/** 몸통 구간. 아래가 넓고 위가 좁아야 탑처럼 보인다 — 평행하면 상자다 */
const BODY_Y0 = 0.30;
const BODY_H = 4.60;
const BODY_R0 = R;
const BODY_R1 = 1.30;

/**
 * 4각 기둥의 **반 칸 회전.** `CylinderGeometry(r, r, h, 4)` 는 기본적으로 대각선이 축을
 * 향해 마름모로 선다. 45° 돌리면 변이 축에 평행해진다 — `building.ts` 가 사각뿔 지붕에
 * 쓴 것과 같은 처방이고, 여기서는 **시계면·문·창을 평평한 벽에 붙이기 위해** 필요하다.
 */
const QUAD = Math.PI / 4;

/**
 * 그 높이에서의 몸통 외접 반지름. 시계·문·창이 전부 이걸 읽는다.
 *
 * 벽까지의 **수직 거리**는 이 값이 아니라 `bodyR(y) / √2` 다(45° 돌린 정사각형의 변까지
 * 거리). 둘을 헷갈리면 시계가 벽 속에 잠기거나 허공에 뜬다 — 아래 `faceX()` 가 그 변환을
 * 한 곳에서만 한다.
 */
function bodyR(y: number): number {
  return BODY_R0 + (BODY_R1 - BODY_R0) * ((y - BODY_Y0) / BODY_H);
}
/** 그 높이의 **벽면까지 거리**. 붙일 것은 전부 이 값 바깥에 놓는다 */
function faceX(y: number): number {
  return bodyR(y) * Math.SQRT1_2;
}

function buildBelfryGeometry(T: ThreeNS) {
  const pieces: Piece[] = [];
  const add = (geo: Piece['geo'], color: number) => pieces.push({ geo, color: rgb(color) });

  /** 4각 단 하나. `y` 는 바닥 높이 */
  const quad = (rTop: number, rBot: number, h: number, y: number, color: number) =>
    add(
      new T.CylinderGeometry(rTop, rBot, h, 4).rotateY(QUAD).translate(0, y + h / 2, 0),
      color,
    );
  /** 납작한 판/띠. `a` 는 한 변 — 외접 반경은 `a × 0.707` 이라 1.8 을 넘지 않게 잡는다 */
  const slab = (a: number, h: number, y: number, color: number) =>
    add(new T.BoxGeometry(a, h, a).translate(0, y + h / 2, 0), color);

  // ── 기단 ────────────────────────────────────────────────────────────────
  quad(1.44, 1.50, 0.30, 0.00, V.stone);
  // 굽. 벽과 땅 사이를 끊어 주면 건물이 땅에 **놓인** 것으로 보인다(집과 같은 처방).
  quad(1.42, 1.44, 0.22, 0.30, V.wallBase);

  // ── 몸통(회관 1층) ──────────────────────────────────────────────────────
  quad(BODY_R1, BODY_R0, BODY_H, BODY_Y0, V.wall);

  // 문. 광장을 향하는 z+ 면. 벽과 같은 평면이면 z-파이팅이 나므로 살짝 띄운다.
  add(new T.BoxGeometry(0.90, 2.00, 0.10).translate(0, 1.30, faceX(1.30)), V.door);
  // 문 위 차양 — 마을회관이면 현관이 있어야 한다. 이 판 하나로 "들어갈 수 있는 건물" 이
  // 된다(집에서 같은 조각이 같은 일을 한다).
  add(new T.BoxGeometry(1.34, 0.14, 0.36).translate(0, 2.42, faceX(2.42) + 0.13), V.trim);

  // 창. 양 옆면에 하나씩 — 정면은 문과 시계가 이미 쓰고 있다.
  for (const s of [1, -1]) {
    add(new T.BoxGeometry(0.10, 0.86, 0.66).translate(s * faceX(2.90), 2.90, 0), V.trim);
    add(new T.BoxGeometry(0.11, 0.70, 0.52).translate(s * faceX(2.90), 2.90, 0), V.glass);
  }

  // ── 시계면 ──────────────────────────────────────────────────────────────
  clockFaces(T, add);

  // 1층 처마. 지붕선을 한 겹 둘러 주면 실루엣이 로우폴리답게 끊긴다.
  slab(2.36, 0.16, 4.90, V.roofShade);

  // ── 종탑 ────────────────────────────────────────────────────────────────
  slab(1.90, 0.12, 5.06, V.wallBase);
  /**
   * **네 기둥만 세운다.** 막힌 단으로 만들고 어두운 판을 붙여 "뚫린 것처럼" 보이게 하는
   * 편이 조각 수는 적지만, 그러면 종이 안 보인다. 종탑에서 종이 안 보이면 그냥 2층이다.
   *
   * 기둥 바깥 모서리가 (0.85, 0.85) 라 외접 반경 1.202 — `footprint`(1.8) 안이다.
   */
  const POST = 0.26;
  const POST_OFF = 0.72;
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      add(
        new T.BoxGeometry(POST, 3.10, POST).translate(sx * POST_OFF, 5.18 + 1.55, sz * POST_OFF),
        V.wall,
      );
    }
  }
  slab(1.90, 0.24, 8.28, V.wallBase);

  // ── 종 ──────────────────────────────────────────────────────────────────
  // 8각 원뿔대 하나로 종이 된다 — 아래가 벌어지고 위가 좁으면 눈은 그것을 종으로 읽는다.
  // 아랫단에 살짝 넓은 테를 두르는 것이 결정적이다. 없으면 그냥 고깔이다.
  add(new T.CylinderGeometry(0.30, 0.54, 0.80, 8).translate(0, 6.92, 0), V.brass);
  add(new T.CylinderGeometry(0.54, 0.58, 0.12, 8).translate(0, 6.58, 0), V.wood);
  // 종 꼭지(고리)와 나무 걸이 보. 보가 없으면 종이 공중에 떠 있다.
  add(new T.CylinderGeometry(0.07, 0.10, 0.18, 6).translate(0, 7.41, 0), V.metal);
  add(new T.BoxGeometry(1.60, 0.18, 0.20).translate(0, 7.59, 0), V.woodDeep);

  // ── 지붕 ────────────────────────────────────────────────────────────────
  // 처마 띠를 지붕보다 **먼저** 5cm 낮게 깔아 상판과 지붕 사이를 끊는다.
  // 한 변 2.44 → 외접 1.725 로, `footprint`(1.8) 안에서 가장 큰 조각이다.
  slab(2.44, 0.10, 8.47, V.roofShade);
  // 사각뿔. `ConeGeometry(r, h, 4)` 의 `r` 은 밑면 **외접원** 반지름이다.
  add(
    new T.ConeGeometry(1.70, 2.60, 4).rotateY(QUAD).translate(0, 8.52 + 1.30, 0),
    V.roof,
  );
  // 첨탑과 꼭대기 구슬. 실루엣의 마지막 7%인데 없으면 사각뿔이 뭉툭하게 끝난다.
  add(new T.CylinderGeometry(0.05, 0.08, 0.55, 6).translate(0, 11.395, 0), V.metal);
  add(new T.OctahedronGeometry(0.20).translate(0, H - 0.20, 0), V.brass);

  return bakePieces(T, pieces);
}

/**
 * 네 면의 시계. **텍스처판이 하던 일을 형태로 옮긴 자리다.**
 *
 * world2 는 4각 기둥의 옆면 UV(u=둘레, v=높이)에 캔버스를 u 로 4번 반복해 네 면 모두에
 * 같은 시계를 걸었다. 그 결과는 유지한다 — 광장은 사방에서 접근하므로 한 면만 시계면
 * 반대쪽에서 온 사람에게는 그냥 기둥이다.
 *
 * 각 면은 z+ 기준으로 만들고 `rotateY` 로 돌린다. **회전을 `translate` 뒤에 걸어야**
 * 위치까지 함께 돈다 — 순서를 뒤집으면 네 시계가 전부 z+ 에 겹쳐 쌓인다.
 */
function clockFaces(T: ThreeNS, add: (geo: Piece['geo'], color: number) => void): void {
  /** 시계 중심 높이. 1층 처마(4.90) 바로 아래, 문 차양(2.42) 위 */
  const CY = 4.00;
  const RAD = 0.58;
  const DIAL = 12; // 원 분할. 로우폴리라 12각이면 멀리서 원으로 읽힌다

  /**
   * 바늘 하나. `deg` 는 12시에서 **시계방향** 각도다.
   *
   * `rotateZ` 는 반시계라 부호를 뒤집는다. 막대를 +y 로 세워 두고 원점 기준으로 돌린 뒤
   * 면 위치로 옮긴다 — 순서가 반대면 막대가 시계 밖에서 돈다.
   */
  const hand = (deg: number, len: number, w: number, z: number, ry: number) => {
    add(
      new T.BoxGeometry(w, RAD * len, 0.02)
        .translate(0, (RAD * len) / 2, 0)
        .rotateZ((-deg * Math.PI) / 180)
        .translate(0, CY, z)
        .rotateY(ry),
      V.metal,
    );
  };

  for (let i = 0; i < 4; i++) {
    const ry = i * (Math.PI / 2);
    const z = faceX(CY);
    // 테두리 → 판 순으로 겹쳐 깐다. 크림 벽(0.9545)에 흰 판(0.9817)만 놓으면 명도차가
    // 0.027 이라 시계가 벽에 묻힌다 — `road.ts` 가 잔디/흙에서 겪은 것과 같은 형태다.
    // 지붕 그늘색(0.4357)으로 링을 두르면 차가 0.55 로 벌어져 멀리서도 원이 읽힌다.
    add(new T.CircleGeometry(RAD + 0.08, DIAL).translate(0, CY, z + 0.010).rotateY(ry), V.roofShade);
    add(new T.CircleGeometry(RAD, DIAL).translate(0, CY, z + 0.020).rotateY(ry), V.trim);
    // 바늘은 **10시 10분.** 시계 이미지의 관습이고, 두 바늘이 겹치지 않아 작게 보일 때도
    // 시계로 읽힌다(world2 텍스처판에서 그대로 가져온 판단이다).
    hand(300, 0.50, 0.075, z + 0.030, ry);
    hand(60, 0.72, 0.050, z + 0.030, ry);
    add(new T.CircleGeometry(0.07, 8).translate(0, CY, z + 0.040).rotateY(ry), V.metal);
  }
}
