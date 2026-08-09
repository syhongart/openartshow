// 광고 타워 — 중앙 광장 북쪽 칸의 랜드마크. 분수대와 짝이다.
//
// ── 시계탑에서 광고 타워로 (감독 지시 2026-08-08) ───────────────────────────
// *"타임스퀘어도 하고. … 밤에 건물 네온."*
//
// 이 파일은 world2 시절 **시계탑**이었다(감독 지시 *"가운데. 분수대있고 시계탑있고."*).
// 4각 기둥 하나에 시계면을 캔버스로 그린 12m 짜리였고, 그 판단은 그때 맞았다 —
// 마을 광장의 랜드마크로는 시계가 정확한 기호다.
//
// 뉴욕에서는 아니다. 광장 한가운데 서서 사방을 밝히는 것은 시계가 아니라 **광고
// 스크린을 두른 쐐기형 타워**다. `kind` 는 `'clock'` 그대로 둔다 — 배치·슬롯 예산·
// 골든 스냅샷이 전부 그 이름을 키로 쓰고 있고, 룩을 바꾸자고 그것을 흔들면 "타워가
// 멋있어졌는가" 와 "배치가 그대로인가" 가 한 diff 에서 안 갈린다(world3 집 개조와
// 같은 규율). 파일 이름도 같은 이유로 유지한다.
//
// ── 실존 브랜드 0 (팀장 직권 판정 2026-08-08) ───────────────────────────────
// 감독의 *"법무팀 검토 중지"* 는 **이번 회차의 검토 프로세스 중지**이지 IP 규율의
// 폐지가 아니다. 그래서 스크린에 들어가는 것은 **색 블록뿐**이다 — 문자도, 로고도,
// 알아볼 수 있는 형태도 없다. 광고판이라는 것은 **색이 면마다 다르게 켜져 있다**는
// 사실만으로 읽히고, 그것이 이 파일이 그리는 전부다.
//
// ── 왜 텍스처가 아니라 조각으로 스크린을 만드나 ─────────────────────────────
// 옛 판본은 캔버스 한 장을 4각 기둥에 둘렀다. 그 방식은 **면마다 같은 그림**이 되고
// (u 를 4번 반복하므로), 밤에 스크린만 빛나게 하려면 `emissiveMap` 의 UV 가 그림과
// 같아야 해서 "어디가 스크린인지" 를 텍셀 단위로 맞춰야 한다.
//
// 조각으로 쪼개면 그 문제가 통째로 사라진다. 판 하나가 곧 색 블록 하나이고,
// `Piece.u` 로 마스크 텍셀을 한 점 고정하면 **판마다 다른 색으로 빛난다**. 감독이
// 요구한 "자작 추상 패턴·색 블록" 이 정확히 이 구조다.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { plazaLandmark, h2 } from './plaza.js';
import { EAVE } from './road-topology.js';
import { bakePieces, rgb, type Piece } from './bake.js';
import { V, TINTS } from './palette.js';
import { hexCss, greyCss, MASK_BLOCK } from './color.js';

/**
 * 탑 높이(미터). **12 → 22.**
 *
 * ── 왜 올렸나 ────────────────────────────────────────────────────────────
 * 옛 주석: *"건물이 4~20m 이므로 12m 면 중간 키에 눈에 띈다."* 그 전제가 world5 에서
 * 깨졌다 — 이제 같은 도시에 32~60m 짜리 타워가 선다(`tower.ts`). 12m 는 **일반 건물
 * 키의 중간**이지 랜드마크가 아니다.
 *
 * 22m 는 일반 건물 상한(20m)을 막 넘고 타워 하한(32m)에는 못 미치는 값이다. 그 자리가
 * 의도다: 광장에서는 확실히 가장 높지만 **스카이라인의 주인공은 아니다.** 광고 타워가
 * 마천루보다 높으면 도시의 위계가 뒤집힌다.
 *
 * ⚠️ `tower.ts` 의 **`WORLD_MAX_H`** 를 넘지 않는다 — 그림자 프러스텀이 그 값을 세계
 * 최고 높이로 삼는다(`main.ts` 의 `shadowFrustum`). 넘으면 이 탑의 그림자만 소리 없이
 * 잘리고, 화면에서 원인을 짚기 가장 어려운 형태가 된다.
 *
 * ⚠️ 이 줄은 오래 *"`MAX_H`(60)를 넘지 않는다"* 라고 적고 있었고, **랜드마크 마천루
 * (96m)가 생긴 순간 그 문장이 거짓이 됐다** — 세계 최고 높이는 더 이상 `MAX_H` 가
 * 아니다. 값을 60 이라고 괄호에 적어 둔 것이 그 오류를 눈에 안 띄게 만들었다(값
 * 미러링의 변종이다: 다른 파일의 값을 주석에 복사하면 그쪽이 바뀌어도 아무도 모른다).
 */
const H = 22;

/**
 * 외접원 반지름(미터). **1.4 → 3.2.**
 *
 * 3각이므로 한 면 폭은 `R × √3 ≈ 5.5m` 다. 광고 스크린이 그 면을 채우므로 이 값이 곧
 * **스크린 크기**이고, 1.4(면 폭 2.4m)로는 스크린이 게시판만 해서 광고 타워로 안 읽힌다.
 *
 * 상한의 근거는 배치다. 파셀 중앙 고정이고 도로 셋백 + 가로등 여유가 6.9m 이므로
 * 파셀 반폭 16 에서 설 수 있는 반경은 9.1m — 기단까지 쳐도(`R × 1.12 + EAVE = 4.2m`)
 * 절반이 남는다. 더 키울 수 있지만 **광장이 좁아 보이기 시작하는 선**에서 멈춘다:
 * 광장 칸이 32m 인데 지름 6.4m 짜리가 서면 이미 한 변의 1/5 다.
 */
const R = 3.2;

/** 기단이 본체보다 넓은 비율. 아래가 퍼져야 탑이 땅에 놓인 것으로 보인다 */
const PODIUM_SPREAD = 1.12;

export const clocktower: PartSpec = {
  kind: 'clock',
  // far 까지 그린다(76.8m). **높이 22m 짜리는 스카이라인에 걸려야 랜드마크다.**
  //
  // near 전용(41.6m)으로 뒀다가 감독이 "시계탑도 안 보이던데" 로 잡았다. 스폰 지점에서
  // 가장 가까운 광장이 91m 라 처음 들어가면 무조건 안 보였다. 멀리서 보여야 다가갈
  // 이유가 생긴다.
  tiers: ['near', 'mid', 'far'],
  /**
   * 발광 신고(`PartSpec.neon`). 광고 타워. **낮에도 거의 그대로 켜져 있다** — 대형 스크린은 주간에 오히려
   *  더 밝게 튼다(주변이 밝으니까). 0 으로 두면 낮에 검은 판때기가 된다.
   */
  neon: { day: 0.9, night: 1 },
  salt: 0x5a6b7c8d,
  // 정점색이 색을 주므로 **흰색 근처**여야 한다 — 곱셈기다.
  //
  // 옛 판본은 `map`(석재 캔버스)이 색을 갖고 있어서 같은 이유로 흰색 하나였다. 그림을
  // 정점색으로 옮겼어도 **이유와 값이 그대로**인 드문 경우다: 개체가 세계에 하나뿐이라
  // (중앙 광장 북쪽 칸) 개체차를 만들 이유 자체가 없다.
  tones: [TINTS.plain],

  /**
   * 3각 기둥이라 **꼭짓점까지가 반경**이다(`R` = 외접원 반경). 기단이 그보다 12% 넓고,
   * 스크린 판이 면에서 6cm 떠 있지만 그것은 내접원(`R/2`) 쪽이라 꼭짓점을 못 넘는다.
   *
   * ⚠️ **`R + 0.4` 에서 바꿨다** (계약 예외 ① — 실루엣 반경이 실제로 달라졌다).
   * `R` 이 1.4 → 3.2 로 커졌으므로 옛 식 그대로면 반경이 1.8 → 3.6 으로 따라오긴 한다.
   * 그런데 옛 `+0.4` 는 근거 없는 여유였고, 기단(`× 1.12`)을 새로 넣었으므로 **실제
   * 실루엣에서 유도한다** — 그러면 기단 비율을 바꾸는 날 반경이 저절로 따라온다.
   * `EAVE` 를 쓰는 것은 `building`·`tower` 와 같은 여유폭을 쓰기 위해서다(그 값이
   * 무엇이고 왜 있는지는 `road-topology.ts` 한 곳이다).
   */
  footprint: () => R * PODIUM_SPREAD + EAVE,

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
    // 지오는 **실치수**다. `place` 가 `sx=sy=sz=1` 로 내므로 스케일이 걸리지 않는다 —
    // 개체가 하나뿐이라 크기 변주가 필요 없고, 실치수로 두면 스크린 판 간격 같은
    // 값을 미터로 읽을 수 있다.
    geometry: buildAdTower(T),
    material: new T.MeshStandardMaterial({
      vertexColors: true,
      // `emissive` 를 곱셈 항등원으로 두고 색은 맵 텍셀이 정한다(`tower.ts` 와 같은
      // 기법이고 이유도 같다 — 재질 하나로 여러 색을 빛나게 하는 방법이 이것뿐이다).
      emissive: TINTS.plain,
      emissiveMap: screenMask(T),
      /**
       * 부팅 초깃값. 실제 값은 `systems/neon-glow.ts` 가 이 파츠의 `neon` 신고
       * (`{ day: 0.9, night: 1 }`)를 읽어 시간대에 맞춰 정한다.
       *
       * **낮에도 0.9 로 거의 그대로 켜 둔다** — 대형 광고 스크린은 주간에 오히려 더
       * 밝게 튼다(주변이 밝으니까). 광장 광고판이 낮에 꺼져 있으면 그게 고장 난
       * 화면이다. 가로등(`day: 0`)과 정반대인 것이 의도다.
       *
       * ⚠️ 이 자리에는 *"낮에는 세기를 낮춰야 하는데 지금은 그 조절축이 없다"* 고
       * 적혀 있었다. **`neon` 신고가 바로 그 조절축이고 이미 있다** — 검수관이
       * 블로커로 잡았다(B4).
       */
      emissiveIntensity: 1,
      // 금속 프레임과 유리 스크린이 섞인 표면이다. 석재(0.85)보다 매끈해야 광고판으로
      // 읽히지만, 완전 광택이면 밤에 반사만 남고 스크린 색이 죽는다.
      roughness: 0.55,
      metalness: 0.18,
    }),
    castShadow: true,
    receiveShadow: true,
  }),
};

// ── 지오메트리 ──────────────────────────────────────────────────────────────
//
// **삼각기둥이 뼈대다.** 감독이 *"삼각/쐐기형"* 을 지목했고, 그 형태가 광장에서 하는
// 일이 있다 — 사각기둥은 어느 방향에서 보든 면이 정면으로 오지만, 삼각기둥은 **모서리
// 가 먼저 온다.** 그래서 걸어 들어오는 사람에게 스크린 두 면이 동시에 비스듬히 보이고,
// 그것이 "광고가 사방을 둘러싼" 인상을 만든다.
//
// three 의 `CylinderGeometry(r, r, h, 3)` 는 첫 꼭짓점을 `+Z` 에 둔다
// (`x = r·sin θ`, `z = r·cos θ`, θ 는 0 에서 시작). 그러므로 꼭짓점은 0°·120°·240°,
// **면의 중심은 그 사이인 60°·180°·300°** 다. 스크린 판은 그 세 방향에 붙인다.

/** 면 중심 방향(라디안). 위 유도 그대로 — 여기 각도를 손으로 적으면 각수를 바꿀 때 어긋난다 */
const FACES = 3;
function faceAngle(i: number): number {
  return Math.PI / FACES + (i * 2 * Math.PI) / FACES;
}
/** 내접원 반지름 = 면 중심까지의 거리. 정삼각형이면 외접원의 절반이다 */
const INRADIUS = R * Math.cos(Math.PI / FACES);

/** 높이 구간(미터). 표 하나가 실루엣을 정한다 */
const Y = {
  podiumTop: 1.4,
  /** 스크린 구간은 **수직**이다 — 위로 좁아지면 판이 벽에서 떠 어긋난다 */
  screenTop: 15.4,
  corniceTop: 16.2,
  taperTop: 19.5,
  ringTop: 20.0,
  top: H,
} as const;

/** 스크린 격자. 가로 3 × 세로 7 — 아래 `SCREEN_*` 주석이 근거다 */
const SCREEN_COLS = 3;
const SCREEN_ROWS = 7;
/** 스크린 판이 벽에서 뜨는 거리(m). 벽과 같은 평면이면 z-파이팅이 난다 */
const SCREEN_LIFT = 0.06;
/** 판 사이 틈 비율. 0 이면 한 장짜리 벽지가 되고, 크면 색 블록이 아니라 점이 된다 */
const SCREEN_GAP = 0.12;

/**
 * 발광 마스크 텍셀. **광고판이 여덟 가지 상태를 오간다.**
 *
 * 실제 광고판은 화면마다 밝기와 색이 제각각이고, 그중 몇은 전환 중이라 거의 꺼져
 * 있다. 전부 최대로 켜면 색 덩어리 하나가 되어 오히려 광고판으로 안 읽힌다 —
 * **꺼진 판이 섞여 있어야 켜진 판이 켜져 보인다.**
 */
const M = {
  off: 0,
  magenta: 1,
  cyan: 2,
  amber: 3,
  lime: 4,
  /** 흰 패널 — 색만 있으면 유원지가 된다. 흰 화면 하나가 도시를 만든다 */
  white: 5,
  /** 어두운 화면 — 전환 중 */
  dim: 6,
  /** 거의 꺼진 화면 */
  dark: 7,
} as const;

const MASK_TEXELS = 8;
function texel(i: number): number {
  return (i + 0.5) / MASK_TEXELS;
}

/**
 * 스크린 색 뽑기용 소금. `plaza.ts` 의 `h2` 를 쓰는 이유는 **결정론** 하나다 —
 * `Math.random()` 을 쓰면 새로고침마다 광고판 배색이 달라지고, 그러면 "저 파란
 * 화면 옆" 같은 장소 기억이 성립하지 않는다.
 */
const SALT_SCREEN = 0x2e5b8a11;

/** 켜진 화면 8종 중 무엇인가. 꺼진 쪽에 무게를 조금 준다 */
const SCREEN_STATES: readonly number[] = [
  M.magenta, M.cyan, M.amber, M.lime, M.white,
  M.dim, M.dark, M.dark,
];

function buildAdTower(T: ThreeNS): InstanceType<ThreeNS['BufferGeometry']> {
  const pieces: Piece[] = [];
  /** 삼각 기둥 한 토막 */
  const drum = (y0: number, y1: number, rTop: number, rBot: number, color: number, u: number) => {
    pieces.push({
      geo: new T.CylinderGeometry(rTop, rBot, y1 - y0, FACES)
        .translate(0, (y0 + y1) / 2, 0),
      color: rgb(color),
      u: texel(u),
    });
  };

  // ── 뼈대 ────────────────────────────────────────────────────────────────
  drum(0, Y.podiumTop, R * 1.05, R * PODIUM_SPREAD, V.stoneBase, M.off);
  // 스크린 코어는 **수직**이다(위 `Y.screenTop` 주석). 색은 어두운 프레임 —
  // 판 사이 틈으로 보이는 것이 이 색이고, 어두워야 판이 화면으로 떠 보인다.
  drum(Y.podiumTop, Y.screenTop, R * 0.94, R * 0.94, V.mullion, M.off);
  drum(Y.screenTop, Y.corniceTop, R * 1.02, R * 1.06, V.rooftop, M.off);
  drum(Y.corniceTop, Y.taperTop, R * 0.52, R * 0.86, V.stone, M.off);
  // 왕관 링 — 꼭대기를 한 바퀴 두르는 네온. 멀리서 이 탑을 알아보는 표식이다.
  drum(Y.taperTop, Y.ringTop, R * 0.58, R * 0.58, V.signPlate, M.cyan);
  // 마스트. 6각이면 충분하다 — 화면에서 몇 픽셀 굵기라 각수가 실루엣에 안 나타난다.
  pieces.push({
    geo: new T.CylinderGeometry(0.07, 0.10, Y.top - Y.ringTop, 6)
      .translate(0, (Y.ringTop + Y.top) / 2, 0),
    color: rgb(V.poleMetal),
    u: texel(M.magenta),
  });

  // ── 모서리 네온 스트립 ──────────────────────────────────────────────────
  //
  // 꼭짓점(0°·120°·240°)을 따라 세로로 세운다. 스크린이 **면**을 맡으므로 모서리가
  // 비면 탑의 윤곽이 밤에 사라진다 — 색 블록만 공중에 떠 보인다.
  for (let i = 0; i < FACES; i++) {
    const a = (i * 2 * Math.PI) / FACES;
    pieces.push({
      geo: new T.BoxGeometry(0.26, Y.screenTop - Y.podiumTop - 0.4, 0.26)
        .rotateY(a)
        .translate(Math.sin(a) * R * 0.97, (Y.podiumTop + Y.screenTop) / 2, Math.cos(a) * R * 0.97),
      color: rgb(V.signPlate),
      // 모서리마다 색을 갈라 탑이 한 색으로 뭉치지 않게 한다
      u: texel([M.amber, M.lime, M.magenta][i]),
    });
  }

  // ── 광고 스크린 ─────────────────────────────────────────────────────────
  //
  // **평면 조각이다 — 상자가 아니다.** 스크린은 바깥에서만 보이므로 뒷면이 필요 없고,
  // 평면은 삼각형 2 개인데 상자는 12 개다. 판이 63 장이므로 그 차이가 630 삼각형이다.
  //
  // 격자를 3×7 로 잡은 근거: 면 폭이 5.5m 이므로 가로 3 칸이면 한 칸이 1.7m 다.
  // 그보다 잘게 나누면 far tier(76.8m)에서 칸이 1픽셀 아래로 내려가 색이 뭉개지고,
  // 2 칸이면 판이 너무 커서 "광고 여러 개" 가 아니라 "색칠한 벽" 이 된다. 세로 7 은
  // 스크린 구간(14m)을 가로 칸과 비슷한 크기(2m)로 나눈 수다.
  const faceW = 2 * R * Math.sin(Math.PI / FACES);
  const cellW = (faceW * 0.92) / SCREEN_COLS;
  const zoneY0 = Y.podiumTop + 0.8;
  const zoneY1 = Y.screenTop - 0.6;
  const cellH = (zoneY1 - zoneY0) / SCREEN_ROWS;

  for (let f = 0; f < FACES; f++) {
    const a = faceAngle(f);
    for (let c = 0; c < SCREEN_COLS; c++) {
      for (let r = 0; r < SCREEN_ROWS; r++) {
        const ox = (c - (SCREEN_COLS - 1) / 2) * cellW;
        const oy = zoneY0 + (r + 0.5) * cellH;
        const state = SCREEN_STATES[
          h2(f * 97 + c, r, SALT_SCREEN) % SCREEN_STATES.length
        ];
        pieces.push({
          // `PlaneGeometry` 의 기본 법선은 `+Z` 다. `rotateY(a)` 로 면 방향에 맞추고
          // 그 방향으로 밀어내면 판이 벽 바깥을 본다.
          geo: new T.PlaneGeometry(cellW * (1 - SCREEN_GAP), cellH * (1 - SCREEN_GAP))
            .rotateY(a)
            .translate(
              Math.sin(a) * (INRADIUS + SCREEN_LIFT) + Math.cos(a) * ox,
              oy,
              Math.cos(a) * (INRADIUS + SCREEN_LIFT) - Math.sin(a) * ox,
            ),
          // 꺼진 판의 낮 색. 발광이 0 인 판(`M.dark`)도 이 색으로는 보인다 —
          // **검정으로 두면 화면에 구멍이 생긴다**(`V.windowDark` 주석과 같은 이유).
          color: rgb(V.signPlate),
          u: texel(state),
        });
      }
    }
  }

  return bakePieces(T, pieces);
}

/**
 * 발광 마스크 — **8×1 픽셀 컬러.** 기법은 `tower.ts` 와 같다(검은 바탕 + `globalAlpha`
 * 로 세기, 색은 팔레트 그대로). 여기 값이 다른 것은 **광고판이 건물보다 밝기 때문**이다:
 * 마천루의 창은 0.4~0.5 인데 여기 네온은 0.9 대다. 그 차이가 광장에 들어섰을 때
 * "여기가 중심이다" 를 만든다.
 */
function screenMask(T: ThreeNS) {
  const cv = document.createElement('canvas');
  cv.width = MASK_TEXELS;
  cv.height = 1;
  const g = cv.getContext('2d')!;
  // 검은 바탕 — 칠하지 않은 텍셀은 발광 0 이다(색이 아니라 강도. `color.ts` 참고)
  g.fillStyle = greyCss(MASK_BLOCK);
  g.fillRect(0, 0, MASK_TEXELS, 1);

  const put = (i: number, hex: number, a: number) => {
    g.globalAlpha = a;
    g.fillStyle = hexCss(hex);
    g.fillRect(i, 0, 1, 1);
    g.globalAlpha = 1;
  };

  // 세기는 전부 **상대비**다. 절대 밝기는 `emissiveIntensity` 와 톤매핑이 정하고 그
  // 둘은 헤드리스(WebGL)와 감독 기기(WebGPU)에서 다르다 — 여기 값을 실측이라고
  // 적을 수 없다. 고정하는 것은 순서뿐이다: 네온 4색 ≳ 흰 패널 ≫ 어두운 화면 ≫ 꺼짐.
  put(M.magenta, V.neonMagenta, 0.95);
  put(M.cyan, V.neonCyan, 0.92);
  put(M.amber, V.neonAmber, 0.90);
  put(M.lime, V.neonLime, 0.88);
  put(M.white, V.signInk, 0.80);
  put(M.dim, V.windowCool, 0.34);
  put(M.dark, V.signPlate, 0.10);

  const tex = new T.CanvasTexture(cv);
  tex.magFilter = T.NearestFilter;
  tex.minFilter = T.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}
