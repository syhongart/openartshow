// world5/parts/adfacade.ts — **광고 파사드. 중앙 광장을 둘러싸는 벽이다.**
//
// ── 감독 지시 2026-08-08 ────────────────────────────────────────────────────
// *"진짜 뉴욕처럼 하고. … 타임스퀘어도 하고. … 진짜 3d로 꼼꼼히 하고."*
//
// ── 왜 광장 **한가운데**가 아니라 **테두리**인가 ────────────────────────────
// 광고 타워(`clocktower.ts`)는 이미 광장 북쪽 칸 한가운데 서 있다. 그런데 화면은
// 여전히 비어 있었다 — 실측으로 그 이유가 나왔다.
//
// 스폰(0,10)에서 파셀이 로드되는 반경은 `DEFAULT_BANDS.farEnter` = 2.10셀 = **67.2m**
// 다(76.8m 는 `farExit`, 즉 **이미 far 인 파셀이 유지되는** 한계라 첫 진입에는 안 쓰인다
// — 이 둘을 섞으면 실제보다 넓은 반경으로 계산하게 된다). 그 반경 안 파셀은 **14칸**이고
// 정면(±40°)에 드는 것은 **4칸뿐인데 전부 중앙 광장**이다. 즉 첫 화면에는 광고 타워
// 한 채 말고 아무것도 없고, 그 너머는 공원이라 지평선까지 평평하다.
//
// 광장을 줄이면 풀리지만 그 길은 이미 닫혀 있다(`decide/grid.ts` 의 `PLAZA_R` 주석 —
// 1칸이면 분수대와 광고 타워가 서로를 가린다). **남은 처방은 광장을 채우는 것이고,
// 타임스퀘어가 정확히 그 형태다** — 그곳의 정체는 "광장 한가운데 탑" 이 아니라
// **광장을 둘러싼 건물 파사드가 전부 광고판**이라는 것이다. 벽이 서면 같은 크기의
// 광장이 빈 곳이 아니라 **방**이 된다.
//
// ── 실존 브랜드 0 (IP) ──────────────────────────────────────────────────────
// 스크린에 들어가는 것은 **색 블록뿐**이다 — 문자도, 로고도, 알아볼 수 있는 형태도
// 없다. 대형 광고 스크린으로 둘러싸인 광장은 장르 관용구이고, 실존 상호·간판 문구·
// 특정 건물의 고유 비례는 쓰지 않는다. `clocktower.ts` 가 그은 선과 같은 선이다.
//
// ── 자리는 격자가, 무엇이 서는지는 여기가 ───────────────────────────────────
// `decide/grid.ts` 의 `plazaRimSides` 가 "이 칸의 어느 변이 광장 바깥인가" 만 답한다.
// 그 변에 광고 파사드를 세우는 판단이 이 파일의 몫이다(`plazaLandmark` 가 광장 칸 역할
// 에서 분수대·광고 타워를 고르는 것과 같은 배치).

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { plazaRimSides, type PlazaRimSide } from '../decide/grid.js';
import { plazaOccupied, h2 } from './plaza.js';
import { SETBACK, LAMP_CLEARANCE, EAVE } from './road-topology.js';
import { bakePieces, rgb, type Piece } from './bake.js';
import { V, TINTS, TINT_SET } from './palette.js';
import { hexCss, greyCss, MASK_BLOCK } from './color.js';

/**
 * 파사드 몸통의 두께(m). 얇은 판이 아니라 **얕은 상자**다.
 *
 * 판 한 장으로 두면 옆에서 봤을 때 종잇장이 서 있고, 광장 모서리는 두 파사드가 직각
 * 으로 만나는 자리라 그 각도가 실제로 보인다. 1.2m 는 옆면이 한 뼘쯤 보이는 값이고,
 * 더 두꺼우면 파사드가 아니라 건물 한 채가 되어 아래 자리 유도가 깨진다.
 */
const PANEL_T = 1.2;

/** 기단·코니스가 몸통보다 넓은 비율. 그림자 선이 생겨 층이 읽힌다 */
const LEDGE_SPREAD = 1.035;
/** 스크린·네온이 앞면에서 뜨는 거리(m). 같은 평면이면 z-파이팅이 난다 */
const SCREEN_LIFT = 0.04;

/**
 * 지오가 **뒤로**(도로 쪽) 뻗는 깊이와 **앞으로**(광장 쪽) 내미는 거리(m).
 *
 * ⚠️ **`PANEL_T` 가 아니다.** 몸통은 두께가 `PANEL_T` 지만 기단과 코니스가 그보다
 * `LEDGE_SPREAD` 만큼 두껍고, 조각들은 앞면을 `z = 0` 에 맞추고 뒤로 물러나게 굽혀
 * 있으므로 **가장 뒤는 `PANEL_T × LEDGE_SPREAD`** 다. 앞쪽으로는 스크린과 네온이
 * `SCREEN_LIFT` 만큼 뜬다.
 *
 * ── 첫 판본이 여기서 틀렸다 ─────────────────────────────────────────────────
 * `rimInset` 이 `PANEL_T`(1.2)만 빼고 있었고, 실제 뒷면은 1.242 라 **몸통이 셋백 선을
 * 0.7m 넘어 도로를 덮고 있었다.** 검사가 지오의 실제 바운딩 박스로 재면서 잡혔다 —
 * 상수를 손으로 적은 유도와 실제 지오가 어긋난 형태이고, `road-topology.ts` 의
 * `SETBACK` 주석이 기록한 사고와 같다. 그래서 지금은 **지오를 굽는 데 쓰는 바로 그
 * 두 상수에서 유도한다** — 조각의 두께를 바꾸면 자리가 저절로 따라온다.
 */
export const PANEL_BACK = PANEL_T * LEDGE_SPREAD;
export const PANEL_FRONT = SCREEN_LIFT;

/**
 * 파셀 중심에서 광장 바깥 변 쪽으로 미는 거리(m). **도로가 정한다.**
 *
 * 파사드는 광장을 최대한 넓게 남겨야 하므로 **도로가 허락하는 가장 바깥**에 선다.
 * 몸통 뒷면이 셋백 선에 정확히 닿는 자리가 그것이다:
 *
 *     inset = 파셀 반폭 − (SETBACK + LAMP_CLEARANCE) − 뒷면 깊이
 *           = 16 − 6.9 − 1.242 = 7.858m   (`DEFAULT_LAYOUT` 기준)
 *
 * ⚠️ 리터럴을 적지 않는 이유는 이 저장소가 이미 값을 치른 자리이기 때문이다 —
 * `road-topology.ts` 의 `SETBACK` 주석이 *"손으로 적은 값이 손으로 적은 설명과 어긋난
 * 채 오래 있었다"* 를 기록하고 있다. 도로를 넓히면 파사드가 저절로 물러선다.
 */
export function rimInset(half: number): number {
  return half - (SETBACK + LAMP_CLEARANCE) - PANEL_BACK;
}

/**
 * 파사드 한 장의 최대 폭(m). **모서리 겹침이 정한다 — 도로가 아니다.**
 *
 * 광장 모서리 칸(예: `(1,-1)`)은 북쪽과 동쪽 두 변이 모두 바깥이라 파사드가 **두 장**
 * 선다. 두 장은 직각으로 만나는데, 각자 자기 변 방향으로 길게 뻗으면 서로를 **관통
 * 한다** — 지오가 교차하므로 z-파이팅이 나고, 화면에서는 "광고판이 서로를 뚫고 나온"
 * 모습이 된다.
 *
 * 겹치지 않을 조건: 한 장의 끝이 **다른 장의 앞면**에 닿지 않으면 된다. 다른 장은
 * `rimInset` 에 서서 `PANEL_FRONT` 만큼 앞으로 내밀고 있으므로
 *
 *     halfW = inset − PANEL_FRONT − EAVE  →  폭 = 14.4m   (`DEFAULT_LAYOUT` 기준)
 *
 * **이 유도가 상한이다.** 아래 `place` 는 여기서 줄이기만 하므로 어떤 개체도 겹칠 수
 * 없다 — 이 관계를 `tests/world5-times-square.test.ts` 가 **부등식으로** 못 박고,
 * 모서리 칸에서 회전을 반영한 실제 상자로도 잰다(원 근사로 재면 여유가 있는지 알 수
 * 없다).
 *
 * ⚠️ **`PANEL_FRONT` 를 빼는 것은 지금 이중 여유다** — `EAVE`(0.6)가 앞면 돌출
 * (0.04)보다 훨씬 커서 그 항을 지워도 겹침이 생기지 않는다(뮤테이션으로 실측했다).
 * 그래도 남겨 두는 이유는 `SCREEN_LIFT` 를 키우는 날 자리가 저절로 따라오게 하려는
 * 것이고, 그때 이 항이 실효를 갖는다. **지금 검출력이 없다는 사실을 적어 둔다** —
 * 안 적으면 다음 사람이 이 항을 검사가 지키는 것으로 읽는다.
 */
export function panelWidth(half: number): number {
  return 2 * (rimInset(half) - PANEL_FRONT - EAVE);
}

/**
 * 파사드 높이(m). **16 ~ 21.**
 *
 * 상한 21m 는 광고 타워(22m) 바로 아래다. 넘으면 광장의 위계가 뒤집혀 한가운데 탑이
 * 둘레보다 작아지고, 그 순간 "무엇을 보라는 곳인지" 가 사라진다. 두 파츠는 서로를
 * import 하지 않으므로(파츠 하나 = 파일 하나) 이 관계는 검사가 지킨다.
 *
 * ── 하한을 14 에서 16 으로 올렸다 (검사가 시켰다) ───────────────────────────
 * 처음엔 14~20 이었다. 그런데 **스폰 정면에서 가장 가까운 파사드는 광장 북쪽 변의 한
 * 장뿐**이고(거리 49.9m), 그 한 장이 하한을 뽑으면 세로 시각이 13.8° 까지 내려간다 —
 * 같은 화면의 광고 타워(25.8°)의 절반을 겨우 넘는 값이라 "광장을 둘러싼 벽" 이 아니라
 * "저쪽에 낮은 건물이 있다" 가 된다. 정면을 채우는 것이 이 파츠의 존재 이유인데
 * **하필 정면 한 장이 제일 낮을 수 있는** 구조였다.
 *
 * 16m 는 일반 격자 건물 범위(4~20m)의 상위 3분의 1이다 — 광장 둘레도 도시의 일부이되
 * 흔한 건물은 아니라는 것이 그 값의 뜻이고, 편차 5m 는 눈높이 1.7m·거리 50m 에서
 * 16.0° ↔ 21.4° 로 갈려 스카이라인이 평평해 보이지 않는다.
 */
const H_MIN = 16;
const H_MAX = 21;

/** 폭이 최대치에서 줄어드는 하한 비율. 1.0 이면 전부 같은 폭이라 복사 티가 난다 */
const W_MIN_RATIO = 0.78;

export const adfacade: PartSpec = {
  kind: 'adfacade',
  // far 까지 그린다. 이 파츠의 **존재 이유가 멀리서 보이는 것**이다 — 스폰에서 광장
  // 북쪽 변까지가 50m 이고, near(36.8m)·mid(49.6m) 로 끊으면 첫 화면에서 사라진다.
  tiers: ['near', 'mid', 'far'],
  /**
   * 발광 신고(`PartSpec.neon`).
   *
   * `day` 가 0 이 아닌 것은 광고 타워와 같은 이유다 — 대형 스크린은 주간에 오히려 더
   * 밝게 튼다(주변이 밝으니까). 낮에 꺼져 있으면 그건 고장 난 화면이다.
   *
   * ⚠️ **광고 타워(`{0.9, 1}`)보다 낮에 조금 어둡다.** 광장의 주인공은 한가운데 탑이고
   * 파사드는 그것을 둘러싼 배경이다. 밤 값이 같은 1 인 것은 세기 축이 여기서 끝나지
   * 않기 때문이다 — 최종 밝기는 `emissiveIntensity × 마스크 텍셀`이고, 아래 마스크가
   * 광고 타워보다 한 단 어둡게 잡혀 있다. 두 파츠는 서로를 import 하지 않으므로 그
   * 관계는 검사가 지킨다.
   */
  neon: { day: 0.85, night: 1 },
  salt: 0x3ac7f1d9,
  /**
   * **곱셈기다.** 색은 정점에 굽혀 있고(`asset`) 여기 값은 거기 곱해지는 개체별 편차다.
   *
   * 개체가 열한 장이고 **같은 그림**이다(지오는 파츠당 하나라는 규약 — 스크린 배색을
   * 인스턴스마다 바꿀 방법이 없다). 그 반복을 덮는 축이 셋인데 전부 여기서 나온다:
   * 폭·높이·틴트. 셋이 함께 흔들려야 "같은 판을 복사했다" 가 "광고판이 줄지어 있다"
   * 로 읽힌다.
   *
   * ⚠️ 그래도 **스크린 배색 자체는 열한 장이 동일하다.** 정면에 두 장이 나란히 들어오는
   * 각도에서는 그것이 보인다 — 지오 하나 규약을 깨지 않고는 못 고치는 한계이고,
   * 고치려면 아틀라스 + 인스턴스 UV 오프셋이 필요하다(`building.ts` 가 그 길을 재보고
   * 「고른 길」 주석에 왜 안 갔는지 적어 두었다).
   */
  tones: TINT_SET,

  /**
   * 판의 외접원. 폭이 개체마다 다르므로 `sx` 에서 유도한다.
   *
   * 원 근사가 실제 실루엣(얇고 긴 판)보다 크게 나오는 것은 알고 있다 — 그 결과 광장
   * 가장자리에 나무·벤치가 덜 선다. **의도한 룩이다**: 타임스퀘어를 둘러싼 것은
   * 가로수가 아니라 광고판이고, 파사드 앞에 나무가 서면 광고가 가려진다.
   */
  footprint: (p) => Math.hypot(p.sx, PANEL_T) / 2 + EAVE,

  /** 모서리 칸에서 두 변이 바깥이다 — 그때 두 장 */
  maxPerParcel: () => 2,

  place: ({ px, pz, rnd, o }) => {
    const sides = plazaRimSides(px, pz);
    if (sides.length === 0) return [];
    // 미술관 GLB 가 통째로 점유한 칸은 비운다. 그 자산은 바닥이 17.2 × 24.6m 라
    // 파셀을 거의 채우고(`plaza.ts` 의 `plazaOccupied`), 파사드를 세우면 벽이
    // 서로를 뚫는다. 광장 서쪽 한 변이 열리는 것은 대가이지만, **그 자리에는 이미
    // 건물 한 채가 서 있으므로** 화면에서 뚫린 곳으로 보이지는 않는다.
    if (plazaOccupied(px, pz)) return [];

    const halfX = o.cellX / 2;
    const halfZ = o.cellZ / 2;
    const out: PlacedPart[] = [];

    for (const side of sides) {
      // 폭 방향과 미는 방향이 축마다 다르다. 북·남 변은 x 로 뻗고 z 로 밀린다.
      const alongX = side === 'north' || side === 'south';
      const spanHalf = alongX ? halfX : halfZ;
      const pushHalf = alongX ? halfZ : halfX;

      const w = panelWidth(spanHalf) * (W_MIN_RATIO + rnd() * (1 - W_MIN_RATIO));
      const h = H_MIN + rnd() * (H_MAX - H_MIN);
      const tone = Math.floor(rnd() * TINT_SET.length);
      const push = rimInset(pushHalf);

      // 변을 따라 흔든다. 나란히 선 세 장이 정확히 일렬이면 반복이 드러나고, 어긋나면
      // "각자 다른 건물의 파사드" 로 읽힌다. 흔들 수 있는 폭은 최대 폭에서 실제 폭을
      // 뺀 만큼의 절반이다 — 그 안에 있으면 위 겹침 유도가 그대로 유지된다.
      const slack = (panelWidth(spanHalf) - w) / 2;
      const jitter = (rnd() * 2 - 1) * slack;

      // `ry` 는 **판의 앞면(법선 +Z)이 광장 중심을 보게** 만든다. `rotateY(a)` 가
      // `+Z` 를 `(sin a, 0, cos a)` 로 보내므로 각 변의 안쪽 방향에서 바로 읽힌다:
      //   north(파셀의 -z 쪽) → 안쪽은 +z → a = 0
      //   south              → 안쪽은 -z → a = π
      //   west (-x 쪽)       → 안쪽은 +x → a = +π/2
      //   east (+x 쪽)       → 안쪽은 -x → a = −π/2
      const geom: Record<PlazaRimSide, { x: number; z: number; ry: number }> = {
        north: { x: jitter, z: -push, ry: 0 },
        south: { x: jitter, z: push, ry: Math.PI },
        west: { x: -push, z: jitter, ry: Math.PI / 2 },
        east: { x: push, z: jitter, ry: -Math.PI / 2 },
      };
      const g = geom[side];
      out.push({ kind: 'adfacade', x: g.x, z: g.z, y: 0, ry: g.ry, sx: w, sy: h, sz: 1, tone });
    }
    return out;
  },

  asset: (T) => ({
    geometry: buildFacade(T),
    material: new T.MeshStandardMaterial({
      vertexColors: true,
      // `emissive` 를 곱셈 항등원으로 두고 색은 맵 텍셀이 정한다 — 재질 하나로 여러
      // 색을 빛나게 하는 방법이 이것뿐이다(`tower.ts`·`clocktower.ts` 와 같은 기법).
      emissive: TINTS.plain,
      emissiveMap: facadeMask(T),
      /**
       * 부팅 초깃값. 실제 값은 `systems/neon-glow.ts` 가 위 `neon` 신고를 읽어 정한다.
       * `1` 로 두는 것은 배선이 이 파츠를 못 찾았을 때 **켜진 채로 남는 쪽**이 안전하기
       * 때문이다 — 0 이면 그 실패가 "그냥 좀 어두운 화면" 으로만 나타나 아무도 못
       * 알아챈다(포크 직후가 정확히 그 상태였다).
       */
      emissiveIntensity: 1,
      // 금속 프레임 + 유리 스크린. 광고 타워(0.55)와 같은 재료라 값도 같은 자리에 둔다.
      roughness: 0.55,
      metalness: 0.18,
    }),
    castShadow: true,
    receiveShadow: true,
  }),
};

// ── 지오메트리 ──────────────────────────────────────────────────────────────
//
// **단위 판: 폭 1 × 높이 1, 두께만 실치수.** 인스턴스가 `sx`(폭)·`sy`(높이)로 늘리고
// `sz` 는 언제나 1 이다 — 두께가 개체마다 달라지면 셋백 유도(`rimInset`)가 깨진다.
//
// 축 규약: **앞면(스크린)이 +Z**, 몸통은 -Z 쪽으로 물러난다. 그래야 `ry` 하나로
// 광장 안쪽을 향하게 만들 수 있다(위 `place` 의 표).

/** 기단이 차지하는 높이 비율. 아래가 굵어야 벽이 땅에 놓인 것으로 보인다 */
const PODIUM_R = 0.055;
/** 상단 코니스가 차지하는 높이 비율 */
const CORNICE_R = 0.06;
// `LEDGE_SPREAD`·`SCREEN_LIFT` 는 파일 위쪽에 있다 — **자리 유도가 그 둘을 읽기
// 때문**이다(`PANEL_BACK`·`PANEL_FRONT`). 지오 구획에 두면 자리 유도가 아래를
// 앞서 참조하게 되고, 그러면 "조각 두께를 바꿨는데 자리는 그대로" 가 성립한다.

/**
 * 스크린 격자. **가로 4 × 세로 5.**
 *
 * 가로 4 인 근거는 far tier(76.8m)다. 폭 14.6m 를 넷으로 나누면 한 칸이 3.65m 이고,
 * 그 거리에서 시각 2.7° — 화면에서 색 블록으로 또렷이 갈린다. 여섯으로 나누면 2.4m
 * 라 1.8° 가 되어 안개 속에서 서로 뭉갠다. 둘로 나누면 "광고 여러 개" 가 아니라
 * "색칠한 벽" 이다(`clocktower.ts` 가 3×7 을 고른 것과 같은 축의 판단이고, 판이
 * 가로로 넓으므로 가로 칸이 하나 더 많다).
 *
 * 세로 5 는 스크린 구간을 가로 칸과 비슷한 크기로 나눈 수다 — 높이 17m 기준 한 칸이
 * 2.9m 라 칸이 정사각에 가깝다. 세로로 길쭉한 칸은 광고판이 아니라 창문으로 읽힌다.
 */
const SCREEN_COLS = 4;
const SCREEN_ROWS = 5;
/** 판 사이 틈 비율. 0 이면 한 장짜리 벽지가 되고, 크면 색 블록이 아니라 점이 된다 */
const SCREEN_GAP = 0.1;
/** 스크린 영역이 판 폭에서 차지하는 비율. 나머지는 좌우 프레임이다 */
const SCREEN_SPAN = 0.9;

/**
 * 발광 마스크 텍셀. `clocktower.ts` 와 **같은 여덟 상태**다.
 *
 * 값이 겹치는 것은 베낀 것이 아니라 같은 물건이기 때문이다 — 광고 스크린은 네 가지
 * 네온색과 흰 패널, 그리고 전환 중인 어두운 화면들로 이루어진다. 다만 **세기는 다르다**
 * (아래 `facadeMask`): 파사드는 광장의 배경이라 한가운데 탑보다 한 단 어둡다.
 */
const M = {
  off: 0,
  magenta: 1,
  cyan: 2,
  amber: 3,
  lime: 4,
  /** 흰 패널 — 색만 있으면 유원지가 된다 */
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

/** 스크린 색 뽑기용 소금. 결정론이라야 "저 파란 화면 옆" 같은 장소 기억이 성립한다 */
const SALT_SCREEN = 0x6d4b28f1;

/** 켜진 화면 여덟 중 무엇인가. 꺼진 쪽에 무게를 준다 — 꺼진 판이 섞여야 켜진 판이 켜져 보인다 */
const SCREEN_STATES: readonly number[] = [
  M.magenta, M.cyan, M.amber, M.lime, M.white,
  M.dim, M.dark, M.dark,
];

function buildFacade(T: ThreeNS): InstanceType<ThreeNS['BufferGeometry']> {
  const pieces: Piece[] = [];

  /** 폭 `w`(단위)·높이 `y0~y1`(단위)·두께 `t` 의 상자. 앞면이 z=0 에 오도록 뒤로 민다 */
  const slab = (y0: number, y1: number, w: number, t: number, color: number, u: number) => {
    pieces.push({
      geo: new T.BoxGeometry(w, y1 - y0, t).translate(0, (y0 + y1) / 2, -t / 2),
      color: rgb(color),
      u: texel(u),
    });
  };

  const podiumTop = PODIUM_R;
  const corniceY0 = 1 - CORNICE_R;

  // ── 기단 ────────────────────────────────────────────────────────────────
  slab(0, podiumTop, LEDGE_SPREAD, PANEL_T * LEDGE_SPREAD, V.stoneBase, M.off);
  // ── 몸통 ────────────────────────────────────────────────────────────────
  // 어두운 프레임. 스크린 판 사이 틈으로 보이는 것이 이 색이고, 어두워야 판이 화면으로
  // 떠 보인다.
  slab(podiumTop, corniceY0, 1, PANEL_T, V.mullion, M.off);
  // ── 코니스 ──────────────────────────────────────────────────────────────
  slab(corniceY0, 1, LEDGE_SPREAD, PANEL_T * LEDGE_SPREAD, V.rooftop, M.off);

  // ── 크라운 네온 띠 ──────────────────────────────────────────────────────
  //
  // 코니스 앞면에 한 줄. 밤에 **파사드의 위 끝선이 보이게** 하는 것이 이 조각의 일이다 —
  // 없으면 광고 스크린만 공중에 떠 있고 벽이 어디서 끝나는지 안 보인다. 광고 타워가
  // 꼭대기에 링을 두른 것과 같은 역할이다.
  // ⚠️ z 는 `SCREEN_LIFT` 다 — 코니스의 **앞면이 z = 0** 이기 때문이다(`slab` 이
  // `translate(0, y, -t/2)` 로 뒤로만 물린다). 첫 판본은 여기에 코니스 두께의 절반을
  // 더해 0.66 만큼 앞으로 내밀고 있었고, 그만큼 `PANEL_FRONT` 가 거짓이 됐다.
  pieces.push({
    geo: new T.PlaneGeometry(LEDGE_SPREAD * 0.96, CORNICE_R * 0.5)
      .translate(0, corniceY0 + CORNICE_R * 0.5, SCREEN_LIFT),
    color: rgb(V.signPlate),
    u: texel(M.cyan),
  });

  // ── 세로 네온 스트립 ────────────────────────────────────────────────────
  //
  // 스크린 영역 좌우에 하나씩. 스크린이 **면**을 맡으므로 가장자리가 비면 밤에 판의
  // 윤곽이 사라져 색 블록만 공중에 뜬다(`clocktower.ts` 의 모서리 스트립과 같은 근거).
  const edgeX = SCREEN_SPAN / 2 + (1 - SCREEN_SPAN) / 4;
  const stripColors = [M.amber, M.magenta];
  // 스트립은 상자라 두께가 있다. **앞면이 `SCREEN_LIFT` 에 오도록** 절반을 물린다 —
  // 중심을 `SCREEN_LIFT` 에 두면 앞으로 `STRIP_T/2` 만큼 더 나가 `PANEL_FRONT` 를
  // 넘고, 그러면 모서리 겹침 유도(`panelWidth`)의 전제가 조용히 깨진다.
  const STRIP_T = 0.1;
  for (let i = 0; i < 2; i++) {
    const sx = i === 0 ? -edgeX : edgeX;
    pieces.push({
      geo: new T.BoxGeometry((1 - SCREEN_SPAN) / 2 * 0.55, corniceY0 - podiumTop, STRIP_T)
        .translate(sx, (podiumTop + corniceY0) / 2, SCREEN_LIFT - STRIP_T / 2),
      color: rgb(V.signPlate),
      u: texel(stripColors[i]),
    });
  }

  // ── 광고 스크린 ─────────────────────────────────────────────────────────
  //
  // **평면 조각이다 — 상자가 아니다.** 스크린은 바깥에서만 보이므로 뒷면이 필요 없고,
  // 평면은 삼각형 2 개인데 상자는 12 개다. 판이 20 장이므로 그 차이가 200 삼각형이다.
  const zoneY0 = podiumTop + (corniceY0 - podiumTop) * 0.05;
  const zoneY1 = corniceY0 - (corniceY0 - podiumTop) * 0.05;
  const cellW = SCREEN_SPAN / SCREEN_COLS;
  const cellH = (zoneY1 - zoneY0) / SCREEN_ROWS;

  for (let c = 0; c < SCREEN_COLS; c++) {
    for (let r = 0; r < SCREEN_ROWS; r++) {
      const ox = (c - (SCREEN_COLS - 1) / 2) * cellW;
      const oy = zoneY0 + (r + 0.5) * cellH;
      const state = SCREEN_STATES[h2(c, r, SALT_SCREEN) % SCREEN_STATES.length];
      pieces.push({
        // `PlaneGeometry` 의 기본 법선이 `+Z` 이므로 그대로 앞을 본다.
        geo: new T.PlaneGeometry(cellW * (1 - SCREEN_GAP), cellH * (1 - SCREEN_GAP))
          .translate(ox, oy, SCREEN_LIFT),
        // 꺼진 판의 낮 색. 발광 0 인 판(`M.dark`)도 이 색으로는 보인다 — 검정으로 두면
        // 화면에 구멍이 생긴다(`V.windowDark` 주석과 같은 이유).
        color: rgb(V.signPlate),
        u: texel(state),
      });
    }
  }

  return bakePieces(T, pieces);
}

/**
 * 발광 마스크 — **8×1 픽셀 컬러.** 기법은 `clocktower.ts` 와 같다(검은 바탕 +
 * `globalAlpha` 로 세기, 색은 팔레트 그대로).
 *
 * ⚠️ **세기가 광고 타워보다 한 단 낮다.** 광장의 주인공은 한가운데 탑이고 파사드는
 * 그것을 둘러싼 배경이다 — 배경이 더 밝으면 시선이 갈 곳을 잃고, 광장은 "무엇을 보라는
 * 곳" 이기를 그만둔다. 두 파츠는 서로를 import 하지 않으므로(파츠 하나 = 파일 하나)
 * 이 관계는 `tests/world5-times-square.test.ts` 가 두 마스크를 함께 구워 지킨다.
 *
 * 절대 밝기는 `emissiveIntensity` 와 톤매핑이 정하고 그 둘은 헤드리스(WebGL)와 감독
 * 기기(WebGPU)에서 다르다 — **여기 값을 실측이라고 적을 수 없다.** 고정하는 것은
 * 순서뿐이다: 네온 4색 ≳ 흰 패널 ≫ 어두운 화면 ≫ 거의 꺼짐.
 */
function facadeMask(T: ThreeNS) {
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

  put(M.magenta, V.neonMagenta, 0.82);
  put(M.cyan, V.neonCyan, 0.80);
  put(M.amber, V.neonAmber, 0.78);
  put(M.lime, V.neonLime, 0.76);
  put(M.white, V.signInk, 0.68);
  put(M.dim, V.windowCool, 0.28);
  put(M.dark, V.signPlate, 0.08);

  const tex = new T.CanvasTexture(cv);
  tex.magFilter = T.NearestFilter;
  tex.minFilter = T.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}
