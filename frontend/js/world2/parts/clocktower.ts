// 시계탑 — 광장 한가운데. 분수대와 짝이고, 광장마다 둘 중 하나가 선다.
//
// 감독 지시: *"가운데. 분수대있고 시계탑있고."*
//
// ── 형태를 world3 종탑으로 교체했다 (감독 지시 2026-08-09) ──────────────────
// *"시계탑도 동물의 숲에 있는 시계탑을 world2로 교체하자"*
//
// 여기 있던 것은 **4각 기둥 하나에 캔버스 텍스처로 시계를 그린 것**이었다. 그때의
// 제약이 이랬다: *"기둥·시계면·지붕을 따로 만들어 합치는 게 자연스럽지만 **병합을 못
// 쓴다** — `utils/BufferGeometryUtils.js` 가 `'three'` WebGL 빌드를 import 하는데 world2
// 는 `'three/webgpu'` 다. 섞으면 두 빌드의 `BufferGeometry` 가 달라진다."*
//
// **그 제약은 world3 에서 이미 풀렸다.** 애드온을 import 하지 않고 정점 배열을 직접 잇는
// 코드가 `bake.ts` 로 올라갔고, 그것으로 조각 여럿을 한 지오로 굽는다 — 개수 불변식(파츠당
// 지오 1·재질 1)을 지키면서. `bake.ts` 는 두 세계가 **바이트까지 동일**하므로 옮길 것이
// 지오메트리뿐이었다.
//
// 텍스처판의 한계는 실제로 있었다: 4각 기둥 하나였으므로 **탑의 실루엣이 막대기**였고,
// 시계탑인데 종이 없었다. 로우폴리에서 랜드마크를 정하는 것은 무늬가 아니라 윤곽이다.
//
// 캔버스 비율 함정(world1 도로가 압축비 9.6배로 무늬를 잃은 것, 옛 판이 1:6 캔버스로
// 피해 갔던 것)은 이제 **만나지 않는다** — UV 로 그리는 것이 없어졌다. 그 이력은 여전히
// `road.ts` 에 살아 있고 거기서 유효하다.
//
// ── 옮기지 **않은** 것 ──────────────────────────────────────────────────────
// 색이다. world3 팔레트는 마을용이라 그대로 오면 크림 벽 + 산호 지붕이 회청색 도시
// 한복판에 선다. 화면으로만 갈리는 축이라 두 안(`?clock=village|city`)을 노브로 열어
// 배포하고 감독 판정을 받았다 — **결과는 `city`** 이고, 진 쪽과 노브는 지웠다.
// 경위와 근거는 아래 `PALETTE` 절.
//
// 치수(H·R·조각 배치)는 **한 값도 안 바꿨다.** 형태와 색을 동시에 바꾸면 화면에서 무엇
// 때문에 달라졌는지 갈리지 않는다.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { plazaLandmark } from './plaza.js';
import { bakePieces, rgb, type Piece } from './bake.js';

// ── 색 — **city 확정** (감독 판정 2026-08-09) ────────────────────────────────
//
// 지오메트리는 world3 것을 그대로 옮겼지만 **색은 그대로 옮길 수 없었다.** world3 팔레트는
// 마을용이라 벽이 크림(`0xfff2df`)이고 지붕이 산호(`0xe8705f`)인데, world2 는 건물이
// 회청(`0x8892a0` 계열)·타워가 회백(`0xb8bcc4` 계열)인 도시다.
//
// 글로 정할 수 없는 축이라 **두 안(`?clock=village|city`)을 만들어 배포하고 감독께 링크로**
// 드렸다. 감독 판정: ***city***.
//
// **판정이 내 예상을 뒤집었다.** 나는 `village` 를 권장으로 올렸다 — 근거는 ① 감독 지시
// (*"동물의 숲에 있는 시계탑을 world2로 교체"*)의 문자적 해석이고 ② 회청 도시에서 크림+산호가
// 확 도드라져 광장 랜드마크로 읽힌다는 것이었다. 감독은 **덜 튀는 쪽**을 골랐다.
//
// 그래서 내 ②는 근거가 아니라 **취향의 진술**이었다 — "도드라진다" 를 나는 장점으로 셌고
// 감독은 그렇게 세지 않았다. 도시의 랜드마크는 배경과 싸워서 되는 것이 아니라 **같은 어휘
// 안에서 높이와 형태로** 되는 것이고, 그 판단은 화면을 보는 사람 몫이다.
// ①도 과했다 — 감독이 지정한 것은 **형태**였지 색까지가 아니었다.
//
// 다음에 이 색을 만질 사람에게: **`village` 팔레트는 지웠다.** 되살리고 싶으면
// `world3/parts/palette.ts` 의 `V` 에 원본이 있다(그쪽 독블록에 역참조를 적어 뒀다).

/** 종탑이 쓰는 색 이름 */
interface Palette {
  stone: number; wall: number; wallBase: number; door: number; glass: number;
  trim: number; roof: number; roofShade: number; brass: number; metal: number;
  wood: number; woodDeep: number;
}

/**
 * 도시 톤. 벽을 `tower.ts` 의 회백(`0xb8bcc4` 계열)에 붙이고 기단을 한 단 어둡게 깔았다.
 *
 * **지붕만 무채색이 아니다 — 구리 녹청(`0x4d8a79`).** 벽·기단·금속을 전부 회색 계열로
 * 맞추면 12m 짜리가 배경 건물과 같은 색이 되어 랜드마크가 아니라 작은 건물로 읽힌다.
 * 녹청은 회청 도시와 색상환에서 갈리면서도 도시 시계탑의 관용색이라 튀지 않는다.
 * (world3 의 산호 지붕이 마을에서 하던 역할을 도시 어휘로 옮겨 놓은 자리다.)
 *
 * ⚠️ 이 값들을 회색 쪽으로 더 밀지 마라 — 그러면 위 문단이 말한 "배경과 같은 색" 이 된다.
 * 감독이 고른 것은 **무채색**이 아니라 **차분한 도시 톤 + 녹청 포인트** 다.
 */
export const PALETTE: Palette = {
  stone: 0x9aa0a8, wall: 0xc3c7cd, wallBase: 0xa8adb5, door: 0x4e5157,
  glass: 0x93b6cc, trim: 0xdfe3e8, roof: 0x4d8a79, roofShade: 0x3d6f61,
  brass: 0xc9a55e, metal: 0x515861, wood: 0x8a7458, woodDeep: 0x6b5844,
};

/**
 * 탑 전체 높이(미터). **12. 옛 판과 같은 값이고, 일부러 안 건드렸다.**
 *
 * 형태가 통째로 바뀌었으니 높이도 다시 잡고 싶어지지만, 그러면 이번 교체가 화면에서
 * 무엇 때문에 달라졌는지 갈리지 않는다 — 형태만 바꾸고 치수는 고정한다.
 *
 * world2 에서 이 값의 뜻: 건물이 4~20m 이므로 **중간 키**다. 광장에서는 크게 보이고
 * 멀리서는 스카이라인에 안 걸린다. 스카이라인은 `tower.ts`(20m 초과) 소관이고, 그
 * 역할을 시계탑이 뺏으면 도심 쪽으로 유도되던 시선이 흐려진다.
 *
 * ⚠️ world3 의 같은 값은 **다른 뜻**이다(집 3.2~5.6m 의 2.1배 = 마을 최고 랜드마크).
 * 같은 12 가 두 세계에서 다른 역할을 하므로, 한쪽을 고칠 때 다른 쪽을 따라 고치지 마라.
 */
export const H = 12;

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
  tones: [0xffffff],

  // 사각 기둥이라 모서리까지가 반경이다(`R` = 외접원 반경).
  shadowProfile: 'box',
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
      // 건물(0.85)보다 조금 매끈하게. 석재 기단·회벽·목재 종탑이 섞여 있어 어느
      // 한쪽으로 몰면 한 재질만 어색해진다 — 중간값으로 둔다.
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
// (`building.ts`·`tower.ts` 는 단위 1 짜리를 인스턴스가 늘리는 방식이라 정반대다 — 두 규약이 한 폴더에
// 섞여 있으니 조각을 옮겨 붙일 때 주의한다). 피벗은 바닥.
//
// 높이 배분 — 합이 정확히 `H` 다:
//
//   0.00 ~ 0.30   기단(돌)
//   0.30 ~ 4.90   몸통(탑 1층). 굽 0.30~0.52 가 겹쳐 있다
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
  quad(1.44, 1.50, 0.30, 0.00, PALETTE.stone);
  // 굽. 벽과 땅 사이를 끊어 주면 건물이 땅에 **놓인** 것으로 보인다(집과 같은 처방).
  quad(1.42, 1.44, 0.22, 0.30, PALETTE.wallBase);

  // ── 몸통(탑 1층) ────────────────────────────────────────────────────────
  quad(BODY_R1, BODY_R0, BODY_H, BODY_Y0, PALETTE.wall);

  // 문. 광장을 향하는 z+ 면. 벽과 같은 평면이면 z-파이팅이 나므로 살짝 띄운다.
  add(new T.BoxGeometry(0.90, 2.00, 0.10).translate(0, 1.30, faceX(1.30)), PALETTE.door);
  // 문 위 차양 — 현관이 있어야 "들어갈 수 있는 건물" 로 읽힌다. 이 판 하나가 그 일을
  // 전부 한다(조각 하나로 값이 가장 큰 자리다).
  add(new T.BoxGeometry(1.34, 0.14, 0.36).translate(0, 2.42, faceX(2.42) + 0.13), PALETTE.trim);

  // 창. 양 옆면에 하나씩 — 정면은 문과 시계가 이미 쓰고 있다.
  for (const s of [1, -1]) {
    add(new T.BoxGeometry(0.10, 0.86, 0.66).translate(s * faceX(2.90), 2.90, 0), PALETTE.trim);
    add(new T.BoxGeometry(0.11, 0.70, 0.52).translate(s * faceX(2.90), 2.90, 0), PALETTE.glass);
  }

  // ── 시계면 ──────────────────────────────────────────────────────────────
  clockFaces(T, add);

  // 1층 처마. 지붕선을 한 겹 둘러 주면 실루엣이 로우폴리답게 끊긴다.
  slab(2.36, 0.16, 4.90, PALETTE.roofShade);

  // ── 종탑 ────────────────────────────────────────────────────────────────
  slab(1.90, 0.12, 5.06, PALETTE.wallBase);
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
        PALETTE.wall,
      );
    }
  }
  slab(1.90, 0.24, 8.28, PALETTE.wallBase);

  // ── 종 ──────────────────────────────────────────────────────────────────
  // 8각 원뿔대 하나로 종이 된다 — 아래가 벌어지고 위가 좁으면 눈은 그것을 종으로 읽는다.
  // 아랫단에 살짝 넓은 테를 두르는 것이 결정적이다. 없으면 그냥 고깔이다.
  add(new T.CylinderGeometry(0.30, 0.54, 0.80, 8).translate(0, 6.92, 0), PALETTE.brass);
  add(new T.CylinderGeometry(0.54, 0.58, 0.12, 8).translate(0, 6.58, 0), PALETTE.wood);
  // 종 꼭지(고리)와 나무 걸이 보. 보가 없으면 종이 공중에 떠 있다.
  add(new T.CylinderGeometry(0.07, 0.10, 0.18, 6).translate(0, 7.41, 0), PALETTE.metal);
  add(new T.BoxGeometry(1.60, 0.18, 0.20).translate(0, 7.59, 0), PALETTE.woodDeep);

  // ── 지붕 ────────────────────────────────────────────────────────────────
  // 처마 띠를 지붕보다 **먼저** 5cm 낮게 깔아 상판과 지붕 사이를 끊는다.
  // 한 변 2.44 → 외접 1.725 로, `footprint`(1.8) 안에서 가장 큰 조각이다.
  slab(2.44, 0.10, 8.47, PALETTE.roofShade);
  // 사각뿔. `ConeGeometry(r, h, 4)` 의 `r` 은 밑면 **외접원** 반지름이다.
  add(
    new T.ConeGeometry(1.70, 2.60, 4).rotateY(QUAD).translate(0, 8.52 + 1.30, 0),
    PALETTE.roof,
  );
  // 첨탑과 꼭대기 구슬. 실루엣의 마지막 7%인데 없으면 사각뿔이 뭉툭하게 끝난다.
  add(new T.CylinderGeometry(0.05, 0.08, 0.55, 6).translate(0, 11.395, 0), PALETTE.metal);
  add(new T.OctahedronGeometry(0.20).translate(0, H - 0.20, 0), PALETTE.brass);

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
      PALETTE.metal,
    );
  };

  for (let i = 0; i < 4; i++) {
    const ry = i * (Math.PI / 2);
    const z = faceX(CY);
    // 테두리 → 판 순으로 겹쳐 깐다. 크림 벽(0.9545)에 흰 판(0.9817)만 놓으면 명도차가
    // 0.027 이라 시계가 벽에 묻힌다 — `road.ts` 가 잔디/흙에서 겪은 것과 같은 형태다.
    // 지붕 그늘색(0.4357)으로 링을 두르면 차가 0.55 로 벌어져 멀리서도 원이 읽힌다.
    add(new T.CircleGeometry(RAD + 0.08, DIAL).translate(0, CY, z + 0.010).rotateY(ry), PALETTE.roofShade);
    add(new T.CircleGeometry(RAD, DIAL).translate(0, CY, z + 0.020).rotateY(ry), PALETTE.trim);
    // 바늘은 **10시 10분.** 시계 이미지의 관습이고, 두 바늘이 겹치지 않아 작게 보일 때도
    // 시계로 읽힌다(world2 텍스처판에서 그대로 가져온 판단이다).
    hand(300, 0.50, 0.075, z + 0.030, ry);
    hand(60, 0.72, 0.050, z + 0.030, ry);
    add(new T.CircleGeometry(0.07, 8).translate(0, CY, z + 0.040).rotateY(ry), PALETTE.metal);
  }
}
