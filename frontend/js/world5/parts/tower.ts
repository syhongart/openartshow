// world5/parts/tower.ts — 고층 타워. **스카이라인을 만드는 파츠다.**
//
// ── 감독 지시 2026-08-02 (world2 시절) ──────────────────────────────────────
// 대도시의 스카이라인을 원한다. 지금 건물은 높이 4~20m 육면체 하나뿐이라 지평선이
// 평평하다.
//
// ── 왜 형태가 아니라 높이·희소성부터였나 (디자이너 진단 2026-08-02) ─────────
// *"스카이라인이 평평한 건 건물 형태가 아니라 높이 상한(20m)과 배치 확률(파셀당 최대
// 4채 균일 분포) 때문이다 — 셋백 실루엣을 붙이기 전에 '20m를 훌쩍 넘는 덩어리가 도심
// 쪽에 몰려서 드물게 선다' 는 사실만으로도 스카이라인이 바뀐다."*
//
// 그래서 **1단계는 단일 매스였다.** 이 파일은 오래 `BoxGeometry(1,1,1)` 하나였고,
// 주석이 스스로 *"계단식 셋백·첨탑·창문은 이것이 화면에서 확인된 뒤에 얹는다"* 라고
// 적어 두고 있었다.
//
// ── 2단계 — **그 형태를 이제 얹는다** (감독 지시 2026-08-08, world5) ────────
// *"진짜 뉴욕처럼 하고. 엠파이어 빌딩 등 뉴욕 상징물을 넣어줘. … 진짜 3d로 꼼꼼히
// 하고. 밤에 건물 네온. 건물 외벽 조명도 넣고."*
//
// 1단계의 전제(높이 32~60m·도심 집중·파셀당 1채)는 화면에서 이미 확인됐으므로
// **배치는 한 줄도 안 건드린다.** 바뀐 것은 `asset` 하나 — 단일 매스가 셋백 4단 +
// 왕관부 + 랜턴 + 마스트로 갈렸고, 색이 `tones` 에서 **정점색**으로 옮겨 갔다.
// world3(포근마을)에서 집을 개조할 때와 같은 규율이다: 룩을 바꾸자고 배치를 흔들면
// "건물이 멋있어졌는가" 와 "겹치지 않는가" 가 한 diff 에서 안 갈린다.
//
// ── 양식이지 특정 건물이 아니다 (법무 실사 2026-08-02 · 팀장 판정 A) ────────
// 실존 건물의 형상을 알아볼 수 있게 재현하는 것은 금지다 — 상표권자가 건물 외관 디자인
// 자체를 등록상표로 보유한 사례가 있고 엔터테인먼트 분야까지 지정돼 있다.
//
// ⚠️ 감독의 *"법무팀 검토 중지"*(2026-08-08)는 **이번 회차의 검토 프로세스 중지**이지
// 이 규율의 폐지가 아니다(팀장 직권 판정 2026-08-08). 여기서 만드는 것은 **아르데코
// 마천루라는 양식의 자작 해석**이다: 계단식 셋백·수직 창 스트립·왕관부 조명·랜턴과
// 마스트는 1930년대 고층 건축의 공통 문법이고, 어느 한 건물의 고유 비례·장식·명칭을
// 옮기지 않았다. 아래 단 높이·폭 비율은 전부 이 파일에서 새로 정한 값이다.
//
// 이격은 값으로 기록한다(팀장 조건 ②) — 아래 상수 주석이 그 기록이다.

import type { PartSpec, PlacedPart, ThreeNS } from './types.js';
import { roadDirs, SETBACK, LAMP_CLEARANCE, EAVE } from './road-topology.js';
import { isTowerParcel } from './zoning.js';
import { isCentralPark } from '../decide/grid.js';
import { bakePieces, rgb, type Piece } from './bake.js';
import { V, TINTS, TINT_SET } from './palette.js';
import { hexCss, greyCss, MASK_BLOCK } from './color.js';

// 처마 여유(`EAVE`)·도로 셋백·가로등 여유는 전부 `road-topology.ts` 가 소유한다.
// 여기 다시 적지 않는다 — 처음엔 적었고, 그것이 검수관 블로커였다(2026-08-02 B1).
// 위험을 주석으로 서술하면서 그 위험을 새로 만든 형태다.

/**
 * 바닥 한 변(m). **9~13m.**
 *
 * 상한의 근거는 배치 부등식이다. `pickInQuadrant` 가 아니라 파셀 중앙 고정이므로 더
 * 여유롭지만, 셋백이 바뀔 여지를 감안해 이론 최댓값에서 물러선 값을 쓴다:
 *
 *   파셀 반폭 16 − 도로 셋백 6.0 − 가로등 여유 0.9 − 처마 0.6 = 8.5m 까지 반폭 가능
 *   → 한 변 17m 까지 이론상 가능하지만, 도로 폭은 감독 지시로 이미 두 번 바뀌었다
 *     (`road-topology.ts` 의 `ROAD_SEG` 주석). 그 절반 수준에서 멈춘다.
 *
 * 하한 9m 인 것은 일반 건물 상한(6m)보다 확실히 커야 "다른 종류의 구조물" 로 읽히기
 * 때문이다. 겹치면 그냥 조금 큰 건물이 된다.
 */
const MIN_SIDE = 9;
const MAX_SIDE = 13;

/**
 * 높이(m). **32~60m.**
 *
 * 기준은 시계탑이다 — 12m 짜리가 "스카이라인에 걸리는 랜드마크" 로 실측된 전례다
 * (`clocktower.ts`). 타워는 그 2.5~5배로 잡아야 랜드마크가 아니라 **도시의 골격**으로
 * 읽힌다.
 *
 * 상한을 60m 에서 끊는 것은 **보이는 범위가 그것으로 끝나기 때문**이다. far tier 로드
 * 반경이 76.8m 이고 안개 완전가시거리가 60.8m 다 — 그보다 훨씬 높게 만들어도 "이미
 * 보이는 것이 더 커질" 뿐 "안 보이던 곳까지 보이게" 되지 않는다.
 *
 * 비례는 높이:바닥 = 2.5:1 ~ 6.7:1 이다. 낮고 넓은 개체가 뭉툭해 보이지 않도록 **높이와
 * 바닥을 같은 난수로 상관시킨다**(아래 `place`) — 큰 것은 크게, 작은 것은 작게.
 */
const MIN_H = 32;
/**
 * **export 한다** — 그림자 카메라가 "세계에서 가장 높은 것" 을 알아야 프러스텀 깊이를
 * 유도할 수 있다(`decide/shadow.ts`). 60 을 그쪽에 다시 적으면, 타워를 높이는 날
 * 그림자만 옛 높이에 맞춰진 채 남고 꼭대기 그림자가 소리 없이 잘린다.
 *
 * ⚠️ **아르데코 개조(2026-08-08)에서 이 값을 바꾸지 않았다 — 바꾸지 않으려고 지오를
 * 그렇게 설계했다.** 마스트 꼭대기가 단위 지오에서 정확히 `y = 1.0` 이고 그것을 넘는
 * 조각이 하나도 없다(`TOP` 상수와 `tests` 없이도 아래 `LEVELS` 표에서 읽힌다).
 * 첨탑을 1.0 위로 얹었다면 실제 높이가 `MAX_H` 를 넘어 `shadowFrustum` 의 근거가
 * 조용히 거짓이 되고, 증상은 **가장 높은 건물의 꼭대기 그림자만 잘리는** 것으로
 * 나타난다 — 화면에서 원인을 짐작하기 가장 어려운 형태다.
 */
export const MAX_H = 60;

export const tower: PartSpec = {
  kind: 'tower',
  // far 까지 그린다. 고층의 의미는 **멀리서 보이는 것**이라, near 에만 두면 다가가야
  // 나타나는 유령이 된다 — 스카이라인이 성립하지 않는다.
  tiers: ['near', 'mid', 'far'],
  /**
   * 발광 신고(`PartSpec.neon`). 마천루. 낮에도 **완전히 끄지 않는다** — 사무실 창은 대낮에도 일부 켜져
   *  있고, 0 으로 두면 낮 화면에서 건물이 통짜 회색 덩어리가 된다.
   *  0.25 는 "있는 듯 없는 듯" 을 노린 값이고 화면 판정 전이다.
   */
  neon: { day: 0.25, night: 1 },
  salt: 0x5bd1e995,
  /**
   * **곱셈기다 — 색이 아니다.** 석재·유리·창의 색은 이제 정점에 굽혀 있고(`asset`),
   * 여기 값은 거기에 곱해지는 개체별 색조 편차다.
   *
   * ── 단일 매스 시절의 값을 그대로 두면 도시가 죽는다 ─────────────────────────
   * 예전 값은 `[0xb8bcc4, 0xc3c0b8, 0xaeb5bd, 0xc8c4ba, 0xb2b8c0]` 였고, 그때는
   * 지오가 민무늬 박스라 **이 배열이 곧 최종 색**이었다. 그 시절 주석도 스스로 경고하고
   * 있었다 — *"파사드 텍스처가 붙는 단계에서는 이 배열이 곱셈기로 바뀌므로 흰색 근방으로
   * 다시 잡아야 한다."* 정점색이 붙은 지금이 정확히 그 단계다.
   *
   * 그대로 뒀다면 `0xb8` (72%) × 석재 정점색이 되어 타워만 도시에서 한 겹 어두워졌을
   * 것이다. `road.ts` 가 어두운 톤 × 아스팔트 텍스처로 최종 알베도 선형 0.0003 을 낸
   * 그 사고와 같은 형태다.
   *
   * 개수는 5 그대로다 — `place` 가 `Math.floor(rnd() * TONES.length)` 대신
   * `TINT_SET.length` 를 읽으므로 배열이 바뀌어도 따라오지만, 5 를 유지하면 배치
   * 골든 스냅샷의 `tone` 분포가 그대로 남는다(배치는 한 줄도 안 건드린다는 규율).
   */
  tones: TINT_SET,

  /** 바닥 사각형을 감싸는 원. 회전이 직각 배수라 긴 변의 절반 + 처마면 충분하다 */
  // ⚠️ 셋백 실루엣은 **위로 갈수록 좁아지므로** 밑단이 여전히 최대 반경이다. 기단
  // (`PODIUM_SPREAD` 1.045)이 본체보다 4.5% 넓은데, 한 변 13m 기준 돌출은
  // `13 × 0.045 / 2 = 0.29m` 로 `EAVE`(0.6) 안이다 — 그래서 이 식을 안 바꿨다.
  // 기단을 더 넓히면 여기를 다시 본다.
  footprint: (p) => Math.max(p.sx, p.sz) * 0.5 + EAVE,

  maxPerParcel: () => 1,

  place: ({ px, pz, rnd, o }) => {
    if (!isTowerParcel(px, pz, o.cellX, o.cellZ)) return [];
    // 공원 안에는 마천루가 서지 않는다. `isTowerParcel` 은 확률 판정이라 공원을
    // 모르고, 모르면 잔디 한가운데 60m 짜리가 선다.
    if (isCentralPark(px, pz)) return [];

    // ── 자리는 파셀 중앙 고정이다 ──────────────────────────────────────────
    // 사분면에 뽑지 않는다. 이유가 둘이다:
    //   · 중앙이 도로에서 가장 먼 지점이라 셋백이 저절로 지켜진다(아래 단언 참고)
    //   · 파셀당 한 채뿐이라 자리를 다툴 상대가 없다 — 흔들 이유가 없다
    // `fountain`·`clocktower` 가 같은 이유로 중앙 고정이다.
    //
    // **크기를 먼저 뽑는다.** 자리가 고정이므로 순서가 결과를 바꾸지는 않지만, 크기가
    // 셋백을 만족하는지 검사하려면 크기가 먼저 있어야 한다(`building.ts` 가 감독 지시로
    // 바꾼 순서와 같은 이유다).
    //
    // 높이와 바닥을 **같은 난수로 상관시킨다** — 독립으로 뽑으면 "낮고 뚱뚱한" 개체가
    // 나와 비례가 2.5:1 아래로 내려가고, 그러면 타워가 아니라 창고로 보인다.
    const bulk = rnd();
    const side = MIN_SIDE + bulk * (MAX_SIDE - MIN_SIDE);
    // 높이는 조금 더 흔든다 — 바닥이 같아도 높이가 다르면 스카이라인에 굴곡이 생긴다.
    const h = MIN_H + (bulk * 0.6 + rnd() * 0.4) * (MAX_H - MIN_H);
    const ry = Math.floor(rnd() * 4) * (Math.PI / 2);
    const tone = Math.floor(rnd() * TINT_SET.length);

    // 도로가 있는 파셀에서 중앙 고정이 셋백을 지키는지 **유도로 확인한다.**
    // 중앙에서 파셀 변까지 `cellX/2`, 거기서 도로 셋백과 가로등 여유를 빼면 설 수 있는
    // 반폭이 나온다. 이 값보다 크면 도로를 덮으므로 그때는 세우지 않는다.
    //
    // ── ⚠️ 이 실패는 **아무 데도 안 나타난다** (검수관 블로커 2026-08-02 B2) ──
    // 처음 이 자리에 "`starved` 로 세어진다" 고 적었다. **거짓이다.** `starved` 는
    // 풀 슬롯 고갈(`pool.acquire()` 실패)에서만 오른다(`systems/parcel-builder.ts`).
    // 여기서 `[]` 를 돌려주면 조립부는 이 파셀에 타워를 **요청하지도 않으므로** 그
    // 카운터는 손도 안 탄다.
    //
    // 즉 지금은 "겹치지 않는다" 를 "안 세운다" 로 사서 **관측을 잃은** 상태다. 그
    // 거래 자체는 맞다고 본다 — 조용히 겹치는 편이 더 나쁘다. 다만 **잃은 것을
    // 잃었다고 적어 둔다.** 파셀 크기나 셋백을 줄이는 변경이 오면 타워가 소리 없이
    // 사라지고, 그때 이 주석이 유일한 단서다.
    //
    // 현재 `DEFAULT_LAYOUT`(cell 32)에서는 이 분기가 **도달 불가능**하다:
    //   16 − (SETBACK 6.0 + LAMP_CLEARANCE 0.9) − EAVE 0.6 = 8.5m  >  MAX_SIDE/2 = 6.5m
    // 그래서 `tests/world2-zoning.test.ts` 가 **좁은 셀 기준으로 타워 파셀을 다시 찾아**
    // 이 가지를 직접 돌린다. 그냥 좁은 셀만 넘기면 물 판정까지 바뀌어 배제 조건에
    // 걸리고, 이 가드에는 도달조차 안 한다 — 첫 판본이 실제로 그랬고 뮤테이션으로
    // 드러났다(검수관 R4).
    const clearance = roadDirs(px, pz).length === 0 ? 0 : SETBACK + LAMP_CLEARANCE;
    const maxHalf = Math.min(o.cellX, o.cellZ) / 2 - clearance - EAVE;
    if (side / 2 > maxHalf) return [];

    const out: PlacedPart[] = [{
      kind: 'tower', x: 0, z: 0, y: 0, ry, sx: side, sy: h, sz: side, tone,
    }];
    return out;
  },

  asset: (T) => ({
    // 피벗을 바닥에 둔다 — `y: 0` 이 지면이고 `sy` 가 곧 높이가 된다.
    geometry: buildTower(T),
    material: new T.MeshStandardMaterial({
      // 정점색이 곧 색이다 — `tones` 는 거기 곱해지는 틴트다(위 `tones` 주석).
      vertexColors: true,
      // ── 발광은 **맵이 색까지 정한다** ────────────────────────────────────
      // `lamp.ts` 는 흑백 2텍셀 마스크로 "빛나는가/아닌가" 만 갈랐다. 타워는 한 물건
      // 안에서 **창(따뜻함)·업라이트(호박색)·왕관(호박색 강)·랜턴(찬 흰빛)·마스트
      // (마젠타)** 가 전부 다른 색이어야 하는데 `emissive` 는 재질당 하나뿐이다.
      //
      // 그래서 `emissive` 를 **곱셈 항등원**으로 두고 색을 맵 텍셀에 칠한다
      // (`emissive × emissiveMap` 이므로 항등원이면 맵 색이 그대로 나온다).
      // `TINTS.plain` 이 그 항등원이다 — 흰색 리터럴을 새로 적지 않으려는 것이기도 하다.
      emissive: TINTS.plain,
      emissiveMap: towerMask(T),
      /**
       * 부팅 초깃값. **실제 값은 `systems/neon-glow.ts` 가 정한다** — 이 파츠가
       * `neon: { day, night }` 로 신고했고, 그 신고를 `NeonGlow` 가 부팅 첫 프레임에
       * 읽어 시간대에 맞춰 덮어쓴다.
       *
       * ⚠️ 이 자리에는 *"배선이 `materialOf('lamp')` 한 종류만 만지므로 0 으로 두면
       * 영원히 꺼진다 … 배선이 생기면 이 값을 0 으로 되돌리고 이 문단을 지운다"* 는
       * 문단이 있었다. **배선은 생겼는데 그 문단이 남아 있었다** — 검수관이 블로커로
       * 잡았다(B4). 다음 사람에게 *"아직 배선이 없다"* 고 거짓말하는 주석이었고,
       * 이 저장소가 세 번 명문화한 *"배선 유효성에 대한 거짓 진술은 다음 사람이
       * 확인을 생략하게 만든다"* 에 정확히 해당한다.
       *
       * 값을 `1` 로 남겨 둔 이유: `NeonGlow` 가 못 찾는 경우(재질에 이 속성이 없거나
       * 풀에 파츠가 없을 때)에도 **네온이 켜진 채로 남는 쪽**이 안전하다. 0 이면 그
       * 실패가 "그냥 좀 어두운" 화면으로만 나타나 아무도 못 알아챈다 — 포크 직후가
       * 정확히 그 상태였다. `NeonGlow.missing` 이 진단에 실리지만 진단을 여는 사람은
       * 이미 뭔가 이상하다고 느낀 사람이다.
       */
      emissiveIntensity: 1,
      roughness: 0.8,
      metalness: 0.08,
    }),
    // 건물과 같다. 높은 만큼 **그림자가 길게 떨어지는 것이 스카이라인의 절반**이다 —
    // 그림자가 없으면 타워가 배경 그림처럼 떠 보인다.
    castShadow: true,
    receiveShadow: true,
  }),
};

// ── 지오메트리 ──────────────────────────────────────────────────────────────
//
// **단위 타워: 밑면 1×1, 전체 높이 1.** 인스턴스가 `sx`·`sy`·`sz` 로 늘린다.
// `place` 가 `sx === sz === side` 로 내므로 **가로세로는 언제나 균등**하고, 세로만
// `h/side` = 2.5~6.7 배로 늘어난다. 셋백 비율은 그 스케일에서 보존된다 — 위로 갈수록
// 좁아지는 실루엣은 x·z 비율의 문제이기 때문이다.
//
// ⚠️ **어느 조각도 `y = 1.0` 을 넘지 않는다.** `MAX_H` 가 그림자 프러스텀의 근거이므로
// (위 주석) 1.0 을 넘는 순간 그 근거가 조용히 거짓이 된다. 아래 `LEVELS` 표의 마지막
// 값이 정확히 1 인 것이 그 보증이다.

/**
 * 단(段) 경계의 높이 비율. **표 하나가 실루엣 전체를 정한다.**
 *
 * ── 왜 셋백이 4단인가 ──────────────────────────────────────────────────────
 * 3단이면 실루엣이 "넓은 상자 위에 좁은 상자" 로 읽혀 계단이라기보다 이층집이 된다.
 * 5단 이상은 far tier(76.8m)에서 단 하나가 1~2픽셀이라 구별되지 않고, 조각만 늘어난다.
 * 4단이 **안개 완전가시거리(60.8m)에서 계단이 셋 이상 세어지는** 최소값이다.
 *
 * ── 왜 아래가 두껍고 위로 갈수록 얇은가 ────────────────────────────────────
 * 1단이 전체의 32%, 이후 20% → 14% → 7% 로 준다. 등분하면 계단이 규칙적이라
 * 사다리로 보인다 — 실제 셋백 규제는 높이에 비례해 후퇴폭을 요구하므로 위로 갈수록
 * 층이 짧아지고, 그 체감이 "높다" 를 만든다.
 */
const LEVELS = {
  podiumTop: 0.045,
  lobbyTop: 0.078,
  /** 1단은 세로로 셋으로 쪼갠다 — **업라이트 그라데이션을 조각 단위로 만들기 위해서다** */
  t1a: 0.170, t1b: 0.280, t1Top: 0.400,
  cor1Top: 0.418,
  t2a: 0.500, t2Top: 0.620,
  cor2Top: 0.638,
  t3a: 0.700, t3Top: 0.780,
  cor3Top: 0.798,
  t4a: 0.836, t4Top: 0.868,
  cor4Top: 0.882,
  crownTop: 0.930,
  crownCapTop: 0.944,
  lanternTop: 0.976,
  lanternCapTop: 0.986,
  /** 마스트 꼭대기 = 전체 높이. **여기가 정확히 1 이어야 `MAX_H` 가 참이다** */
  top: 1.0,
} as const;

/** 단별 한 변(비율). 1.0 이 인스턴스 `side` 다 */
const W1 = 1.0, W2 = 0.78, W3 = 0.56, W4 = 0.38;
/** 기단이 본체보다 넓은 비율. `footprint` 주석이 이 값을 읽는다 */
const PODIUM_SPREAD = 1.045;
/** 코니스(단 사이 띠)가 아랫단보다 넓은 비율. 그림자 선이 생겨 계단이 읽힌다 */
const CORNICE_SPREAD = 1.055;

/**
 * 발광 마스크의 텍셀 인덱스. **가로 한 줄짜리 텍스처의 칸 번호다.**
 *
 * 구간이 아니라 **한 점**을 읽는 것이 핵심이다(`bake.ts` 의 `Piece.u` 주석) — 구간으로
 * 압축하면 텍셀 경계에서 보간이 섞여 창 스트립 끝이 어중간하게 빛난다.
 */
const M = {
  off: 0,
  /** 창(따뜻한 쪽). 주거·사무 혼합 */
  winWarm: 1,
  /** 창(차가운 쪽). 형광등 사무실 — 한 건물 안에서 층마다 갈려야 도시가 살아 있다 */
  winCool: 2,
  /** 외벽 업라이트, 단 밑동. **아래에서 위로 비추는 빛의 가장 밝은 자리** */
  upLit: 3,
  /** 외벽 업라이트, 그 위. 빛이 퍼져 옅어지는 구간 */
  upDim: 4,
  /** 왕관부 조명 — 아르데코 마천루의 정체성이 여기 있다 */
  crown: 5,
  /** 랜턴(꼭대기 전망실) */
  lantern: 6,
  /** 마스트 — 항공장애등 */
  mast: 7,
} as const;

const MASK_TEXELS = 8;

/** 텍셀 중앙의 u. 필터링이 경계를 흐려도 값이 섞이지 않는 유일한 지점이다 */
function texel(i: number): number {
  return (i + 0.5) / MASK_TEXELS;
}

function buildTower(T: ThreeNS): InstanceType<ThreeNS['BufferGeometry']> {
  const pieces: Piece[] = [];
  /** 축에 나란한 상자 한 단. y0~y1 을 채우고 한 변이 `w` */
  const slab = (y0: number, y1: number, w: number, color: number, u: number) => {
    pieces.push({
      geo: new T.BoxGeometry(w, y1 - y0, w).translate(0, (y0 + y1) / 2, 0),
      color: rgb(color),
      u: texel(u),
    });
  };

  // ── 기단 ────────────────────────────────────────────────────────────────
  // 본체보다 조금 넓다. 없으면 벽이 땅에서 자란 것처럼 보인다(world3 집이 `wallBase`
  // 로 배운 것과 같다 — *"굽이 있어야 집이 땅에 **놓인** 것으로 보인다"*).
  slab(0, LEVELS.podiumTop, W1 * PODIUM_SPREAD, V.stoneBase, M.off);
  // 로비 유리띠. 지상층이 통유리인 것이 고층 건축의 공통 문법이고, 밤에 **발밑이 밝아야**
  // 건물이 땅에 붙어 있는 것으로 읽힌다.
  slab(LEVELS.podiumTop, LEVELS.lobbyTop, W1 * 1.01, V.glass, M.winWarm);

  // ── 1단 (전체의 32%) — 세 조각으로 나눠 업라이트를 만든다 ──────────────
  //
  // ⚠️ **실광원을 쓰지 않았다.** 파셀은 스트리밍되므로 파셀에 실리는 광원은 카메라가
  // 움직일 때마다 증감한다 — world1 프리즈의 직접 원인이었던 단조증가 축 그 자체다
  // (`smoke:vite` `[7]` 개수 불변식이 그것을 지킨다). 팀장 판정(2026-08-08)도 일반
  // 격자 건물은 **실광원 0** 으로 못 박았다.
  //
  // 대신 두 겹으로 흉내낸다:
  //   ① **정점색**이 아래로 갈수록 밝다(`stone` → `stoneBase` → `mullion`).
  //      조명이 없어도 성립하는 알베도 그라데이션이라 낮에도 말이 된다.
  //   ② **발광 마스크**가 밑동을 `upLit`, 그 위를 `upDim` 으로 읽는다. 밤에만 보인다.
  // 두 겹이 같은 방향이라 서로를 강화한다 — 한 겹만이면 낮에 밋밋하거나 밤에 안 보인다.
  slab(LEVELS.lobbyTop, LEVELS.t1a, W1, V.stone, M.upLit);
  slab(LEVELS.t1a, LEVELS.t1b, W1, V.stoneBase, M.upDim);
  slab(LEVELS.t1b, LEVELS.t1Top, W1, V.mullion, M.off);
  slab(LEVELS.t1Top, LEVELS.cor1Top, W1 * CORNICE_SPREAD, V.mullion, M.off);

  // ── 2단 (20%) ───────────────────────────────────────────────────────────
  slab(LEVELS.cor1Top, LEVELS.t2a, W2, V.stone, M.upLit);
  slab(LEVELS.t2a, LEVELS.t2Top, W2, V.stoneBase, M.off);
  slab(LEVELS.t2Top, LEVELS.cor2Top, W2 * CORNICE_SPREAD, V.mullion, M.off);

  // ── 3단 (14%) ───────────────────────────────────────────────────────────
  slab(LEVELS.cor2Top, LEVELS.t3a, W3, V.stone, M.upLit);
  slab(LEVELS.t3a, LEVELS.t3Top, W3, V.stoneBase, M.off);
  slab(LEVELS.t3Top, LEVELS.cor3Top, W3 * CORNICE_SPREAD, V.mullion, M.off);

  // ── 4단 (7%) — 여기부터는 다시 밝아진다 ─────────────────────────────────
  // 중간이 어둡고 꼭대기가 밝은 것은 의도다. 밤 하늘을 배경으로 **왕관부만 떠오르는**
  // 것이 아르데코 마천루의 실루엣이고, 그러려면 그 바로 아래가 어두워야 대비가 선다.
  slab(LEVELS.cor3Top, LEVELS.t4a, W4, V.stone, M.upLit);
  slab(LEVELS.t4a, LEVELS.t4Top, W4, V.stone, M.off);
  slab(LEVELS.t4Top, LEVELS.cor4Top, W4 * CORNICE_SPREAD, V.mullion, M.off);

  // ── 왕관부 ──────────────────────────────────────────────────────────────
  // 감독 지시 *"건물 외벽 조명도 넣고"* 의 가장 눈에 띄는 자리다.
  slab(LEVELS.cor4Top, LEVELS.crownTop, W4 * 0.82, V.stone, M.crown);
  slab(LEVELS.crownTop, LEVELS.crownCapTop, W4 * 0.92, V.mullion, M.off);

  // ── 랜턴 + 마스트 ───────────────────────────────────────────────────────
  //
  // 8각으로 만든다. 4각이면 아래 상자들과 구별이 안 되고, 16각은 far 에서 원과 다르지
  // 않으면서 삼각형만 두 배다. **실루엣이 상자에서 벗어나는 최소 각수**가 8이다.
  pieces.push({
    geo: new T.CylinderGeometry(W4 * 0.20, W4 * 0.26, LEVELS.lanternTop - LEVELS.crownCapTop, 8)
      .translate(0, (LEVELS.crownCapTop + LEVELS.lanternTop) / 2, 0),
    color: rgb(V.glass),
    u: texel(M.lantern),
  });
  pieces.push({
    geo: new T.ConeGeometry(W4 * 0.24, LEVELS.lanternCapTop - LEVELS.lanternTop, 8)
      .translate(0, (LEVELS.lanternTop + LEVELS.lanternCapTop) / 2, 0),
    color: rgb(V.mullion),
    u: texel(M.off),
  });
  // 마스트. 6각이면 충분하다 — 화면에서 몇 픽셀 굵기라 각수가 실루엣에 안 나타난다.
  pieces.push({
    geo: new T.CylinderGeometry(W4 * 0.03, W4 * 0.045, LEVELS.top - LEVELS.lanternCapTop, 6)
      .translate(0, (LEVELS.lanternCapTop + LEVELS.top) / 2, 0),
    color: rgb(V.poleMetal),
    u: texel(M.mast),
  });

  // ── 수직 창 스트립 ──────────────────────────────────────────────────────
  //
  // 아르데코의 표식이 **수직선**이다. 창을 층별 가로줄로 넣으면 현대 커튼월이 되고,
  // 세로로 길게 넣어야 1930년대 마천루로 읽힌다.
  //
  // 면마다 하나씩 넷을 두르는 이유: 파셀 중앙 고정 + `ry` 가 직각 배수라 **어느
  // 방향에서 봐도 정면이 하나 보인다.** 한 면만 넣으면 뒤에서 본 타워가 민무늬다.
  //
  // 두께 0.012 는 벽에서 살짝 띄우는 값이다. 벽과 같은 평면이면 z-파이팅이 난다
  // (world3 집이 문에서 배운 것과 같다).
  const strip = (w: number, y0: number, y1: number, faceHalf: number, u: number) => {
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      pieces.push({
        geo: new T.BoxGeometry(w, y1 - y0, 0.012)
          .rotateY(a)
          .translate(Math.sin(a) * faceHalf, (y0 + y1) / 2, Math.cos(a) * faceHalf),
        color: rgb(V.windowDark),
        u: texel(u),
      });
    }
  };
  // 1단은 warm, 2단은 cool, 3단은 warm — 층마다 갈려야 "사람이 사는 건물" 로 보인다.
  // 한 색으로 통일하면 창이 인쇄된 무늬처럼 읽힌다.
  strip(W1 * 0.62, LEVELS.lobbyTop + 0.012, LEVELS.t1Top - 0.012, W1 / 2, M.winWarm);
  strip(W2 * 0.60, LEVELS.cor1Top + 0.010, LEVELS.t2Top - 0.010, W2 / 2, M.winCool);
  strip(W3 * 0.58, LEVELS.cor2Top + 0.008, LEVELS.t3Top - 0.008, W3 / 2, M.winWarm);

  return bakePieces(T, pieces);
}

/**
 * 발광 마스크 — **8×1 픽셀. 흑백이 아니라 컬러다.**
 *
 * `lamp.ts` 는 2×1 흑백이었다("빛나는가 아닌가"). 여기서는 조각마다 **색과 세기가
 * 함께** 달라야 하므로 텍셀에 팔레트 색을 그대로 칠하고, 세기는 검은 바탕 위
 * `globalAlpha` 로 만든다 — 색 리터럴을 새로 적지 않고 밝기를 낮추는 방법이다.
 *
 * `NearestFilter` + 밉맵 끄기는 `lamp.ts` 와 같은 이유다. UV 가 텍셀 중앙 한 점이라
 * 이론상 필요 없지만, 텍셀이 여덟으로 촘촘해졌으므로 안전장치의 값이 그만큼 커졌다.
 */
function towerMask(T: ThreeNS) {
  const cv = document.createElement('canvas');
  cv.width = MASK_TEXELS;
  cv.height = 1;
  const g = cv.getContext('2d')!;
  // 검은 바탕 — 칠하지 않은 텍셀은 발광 0 이다(색이 아니라 강도. `color.ts` 참고)
  g.fillStyle = greyCss(MASK_BLOCK);
  g.fillRect(0, 0, MASK_TEXELS, 1);

  /** 텍셀 하나를 팔레트 색으로. `a` 가 세기(검은 바탕과 섞이므로 그대로 배수가 된다) */
  const put = (i: number, hex: number, a: number) => {
    g.globalAlpha = a;
    g.fillStyle = hexCss(hex);
    g.fillRect(i, 0, 1, 1);
    g.globalAlpha = 1;
  };

  // ── 세기 값의 근거 ─────────────────────────────────────────────────────
  // 전부 **상대비**로 잡았다. 절대 밝기는 `emissiveIntensity`(현재 1)와 톤매핑이
  // 정하고, 그 둘은 헤드리스(WebGL/swiftshader)와 감독 기기(WebGPU)에서 다르다 —
  // **여기서 절대값을 실측했다고 적을 수 없다.** 대신 서로의 비만 고정한다:
  //
  //   왕관 > 랜턴 ≫ 창 > 업라이트 밑동 > 업라이트 위
  //
  // 이 순서가 뒤집히면 룩이 무너진다(예: 업라이트가 창보다 밝으면 벽이 형광판이 된다).
  // 감독 화면에서 절대값을 조정할 때도 **비는 유지**한다.
  put(M.winWarm, V.windowWarm, 0.50);
  put(M.winCool, V.windowCool, 0.40);
  put(M.upLit, V.neonAmber, 0.30);
  put(M.upDim, V.neonAmber, 0.13);
  put(M.crown, V.neonAmber, 0.88);
  put(M.lantern, V.windowCool, 0.95);
  put(M.mast, V.aviationRed, 1.0);

  const tex = new T.CanvasTexture(cv);
  tex.magFilter = T.NearestFilter;
  tex.minFilter = T.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}
