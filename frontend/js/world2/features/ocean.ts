// world2/features/ocean.ts — 바다와 강. 감독 확정 "섬. 강", 표현은 "복셀스처럼".
//
// ── 물을 그리지 않고 물을 만든다 ────────────────────────────────────────────
// 이 파일이 하는 일은 **큰 판 셋을 지면보다 낮게 깔아 두는 것**이 전부다 — 해저·바다·강.
// `decide/water.ts`가 물이라 판정한 파셀을 스트리밍이 아예 로드하지 않고, 그 구멍으로 이
// 판들이 비친다.
//
// 그래서 강의 경로를 바꿔도 이 파일은 손댈 것이 없다. **강 모양을 아는 곳은 판정 하나뿐**
// 이고 여기는 "물의 높이"만 안다 — 강 판도 격자 전체를 덮되 강 구멍으로만 드러난다.
//
// ── 왜 판이 둘인가 ──────────────────────────────────────────────────────────
// 감독: *"복셀스처럼 바다, 강을 표현하자고."*
//
// Voxels 물의 성격은 **밝은 반투명**이다 — 물 너머로 바닥이 비치고, 깊어질수록 물빛이
// 바닥을 이긴다. 그 "비침"이 물을 물로 읽히게 한다. 그런데 반투명 판만 깔면 아래에
// 아무것도 없어 **하늘이 비친다.** 물이 아니라 유리 구멍이 된다. 그래서 해저 판을 함께
// 깐다. 처음에 불투명 짙은 물색 판 하나로 만들었던 것을 감독이 잡은 지점이 정확히 여기다.
//
// ── 왜 셰이더가 아니라 UV 스크롤인가 (감독 지시) ────────────────────────────
// 감독: *"복셀은 물이 살랑살랑 진짜 물 느낌이 나. 쉐이더를 기가막히게 쓴듯."*
//
// 맞다. 다만 **우리는 GLSL `ShaderMaterial`을 쓸 수 없다** — `three/webgpu` 빌드에 그
// 렌더 경로가 아예 없고, 감독 실기기가 WebGPU다. 헤드리스(WebGL/swiftshader)에서 통과해도
// 실기기에서 안 뜨는 형태의 사각이라, 여기서 셰이더를 쓰면 검증할 방법 자체가 없다.
//
// 그래서 두 백엔드에서 **똑같이 도는 수단**을 고른다: 노멀맵 두 장을 서로 다른 방향·속도로
// 흘린다. 두 파동이 간섭하며 만드는 무늬는 되풀이 주기가 길어 눈에 안 띄고, 빛이 물결
// 기울기를 따라 미끄러지며 반짝인다 — 일렁임의 정체는 사실 색이 아니라 **법선**이다.
//
// 비용도 성격이 다르다. 매 프레임 바뀌는 것은 `offset` 두 쌍(uniform 4개)뿐이고, 재질도
// 지오도 파이프라인도 그대로다. 개수 불변식에 아무 영향이 없다.
//
// ── 개수 불변식 ──────────────────────────────────────────────────────────────
// 메시 **셋**(해저·바다·강)·재질 둘(바다와 강이 공유)·지오 하나(셋이 공유)·텍스처 셋을
// 부팅 시 만들고 세션 내내 그대로 둔다. 드로우콜 **+3** 고정이다(그림자 패스 없음 —
// `castShadow`/`receiveShadow` 셋 다 끈다).
//
// 강이 셋째 판으로 늘어난 것은 감독이 강과 바다에 **다른 높이**를 지시했기 때문이다
// (강 −0.5 · 바다 −1.0). 재질·지오를 공유하므로 늘어난 것은 드로우콜 하나뿐이고
// 파이프라인 축은 그대로다.
//
// `transparent: true`는 파이프라인 캐시키 축이라 세션 중에 켜고 끄면 전량 재컴파일을
// 부른다. **부팅 시 한 번 정하고 다시 만지지 않는다** — 그래서 안전하다.

import * as THREE from 'three/webgpu';
// TSL 노드 — `?water=tsl` 에서만 실제로 쓰인다. `three/webgpu` 가 이미 이 코드를
// 번들에 담고 있으므로(법무 실사 2026-08-01: 배포 번들에 `worley` 문자열 존재 확인)
// 정적 import 로 늘어나는 바이트가 사실상 없다.
import * as TSL from 'three/tsl';
import {
  RIVER_Y, SEA_Y, SEABED_Y, WATER_DEPTH, worldHalfExtent, parcelWater, waterGloss, riverFlowAt,
  WATER_MODES, pickWaterMode, type WaterMode,
} from '../decide/water.js';
import type { SkyTime } from '../decide/night.js';
import { GRID_MIN_X, GRID_MAX_X, GRID_MIN_Z, GRID_MAX_Z } from '../decide/grid.js';
import { DEFAULT_LAYOUT } from '../parts/types.js';
import { readNum, readNumOpt, writeNumOpt, readEnum } from '../url-knob.js';
import { createTslWater, type TslWaterHandle, type TslNamespace } from './ocean-tsl.js';
import { findKnobBar, attachKnobBar } from '../ui/knob-bar.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

/** 세계의 바깥 가장자리(미터). 격자에서 유도한다 — 격자를 넓히면 물도 함께 물러난다 */
const EDGE = worldHalfExtent(DEFAULT_LAYOUT.cellX);

/**
 * 물 판의 한 변(미터).
 *
 * **세계 지름의 여러 배**여야 한다. 가장자리에 서서 바깥을 볼 때 물이 끝나고 허공이
 * 보이면 유한 세계가 아니라 부서진 세계로 읽힌다. 안개가 60.8m에서 모든 것을 덮으므로
 * 실제로 필요한 건 `세계 반경 + 안개 거리` 남짓이지만, 판 하나 늘린다고 드는 비용이
 * 삼각형 두 개뿐이라 넉넉히 잡는다.
 */
const PLANE = EDGE * 4;

/** 물결 한 무늬가 덮는 거리(미터). 파셀(32m)의 절반 — 사람 눈높이에서 잔물결로 읽히는 크기 */
const RIPPLE_M = 16;

/**
 * 강물이 흐르는 속력(m/s). 걷는 속도(5 m/s)보다 느려야 **강이 흐르는 것**으로 읽힌다 —
 * 빠르면 급류가 되고, 너무 느리면 고인 물이다. 실개천~완만한 강의 유속대다.
 */
const RIVER_FLOW_MPS = 1.1;

// ── URL 노브 (감독 지시 2026-07-31 "URL로 값 조절할 수 있게 열어둬") ──────────
// 세 값을 연다. **내가 볼 수 없는 것을 감독이 보기 때문이다** — 헤드리스는
// SwiftShader(WebGL)이고 감독 실기기는 WebGPU라 수면 반사가 도는 경로가 다르다.
// 값 하나 바꾸는 데 코드 수정 → 스모크 → 배포 왕복이면 한 번 맞추는 데 하루가 든다.
//
//   ?wns=    물결 기울기(normalScale)  0~3    기본: 시간대별(낮 .9 / 노을 .7 / 밤 .35)
//   ?wrough= 수면 거칠기(roughness)    0~1    기본: 시간대별(낮 .18 / 노을 .3 / 밤 .62)
//   ?wflow=  강 유속(m/s)              0~10   기본: RIVER_FLOW_MPS
//
// 앞 둘은 `readNumOpt` 다 — **기본값이 시간대마다 다르기 때문이다.** `readNum` 은
// fallback 을 강제해 "지정 안 됨" 과 "기본값과 같은 값을 지정함" 을 구별하지 못하고,
// 그러면 낮 기본값이 밤에도 걸려 **시간대 분기가 통째로 죽는다** — 이 브랜치가 방금
// 고친 버그(전역 하드코딩)의 재발이다. `null` 로 갈라내야 `노브 ?? 시간대값` 이 된다.
//
// `wflow` 는 기본값이 하나뿐이라 `readNum` 으로 족하다.
//
// 노브는 디버그 전용이 아니다 — 기본값이 곧 배포값이고, 노브는 그 기본값을 무엇으로
// 정할지 감독이 실기기에서 고르는 수단이다. 값이 확정되면 기본값으로 옮긴다.
//
// **검은 점 진단 도구이기도 하다**(감독 보고, 헤드리스에서 재현 실패). `?wrough=0.45`
// 로 사라지면 원인은 근-거울면인데 반사할 환경맵이 없는 것이고, `?wns=0.35` 로
// 사라지면 물결 기울기 쪽이다. 가설을 코드가 아니라 화면이 가른다.
//
// `STEP` 은 화면 슬라이더의 눈금이자 표시 해상도다(`knob-bar.ts` 가 자릿수를 여기서
// 유도한다 — 따로 적으면 "0.05 를 밀었는데 표시가 안 바뀌는" 어긋남이 가능해진다).
const NS_KNOB = 'wns', NS_MIN = 0, NS_MAX = 3, NS_STEP = 0.05;
const ROUGH_KNOB = 'wrough', ROUGH_MIN = 0, ROUGH_MAX = 1, ROUGH_STEP = 0.01;
const FLOW_KNOB = 'wflow', FLOW_MIN = 0, FLOW_MAX = 10, FLOW_STEP = 0.1;
// 흰 윤슬 세기(감독 지시 2026-07-31 "흰 반짝임효과"). 상한을 2 로 둔다 — 1 을 넘기면
// 발광이 물빛을 이겨 수면이 하얗게 뜨는데, **그 과한 지점을 볼 수 있어야** 감독이
// 어디까지가 좋은지 고를 수 있다. 노브의 상한은 안전선이 아니라 탐색 범위다.
const SPARK_KNOB = 'wspark', SPARK_MIN = 0, SPARK_MAX = 2, SPARK_STEP = 0.05;
// 수면 불투명도(감독 지시 2026-07-31 "투명하게 보이는 효과는 어때"). 해저 자갈이
// 깔리면서 **얼마나 비쳐야 좋은가**가 비로소 고를 수 있는 값이 됐다 — 그전에는 물
// 아래가 단색이라 투명도를 바꿔도 볼 것이 없었다.
// 0 이면 물이 사라지고 1 이면 자갈이 안 보인다. 양 끝을 다 볼 수 있어야 중간을 고른다.
const OPA_KNOB = 'wopa', OPA_MIN = 0, OPA_MAX = 1, OPA_STEP = 0.02;

/**
 * 수면 구현 선택 — `?water=std|tsl`. **기본은 `std`(기존 물)다.**
 *
 * ── 왜 노브인가 (팀장 판정 B, 2026-08-01) ──────────────────────────────────
 * 감독 지시: *"물은 이거쓰자. 지금 어색해"* + three.js `webgpu_backdrop_water` 링크.
 *
 * 전면 교체가 아니라 병행이다. **물 룩의 유일한 판정자는 감독 실기기 육안**인데
 * (헤드리스는 SwiftShader 고, 고주파 물결을 넣었다 되돌린 전례가 있다), 전면 교체는
 * 그 판정을 받기 전에 되돌릴 수 없는 지점을 지나버린다 — 아래 노브 5개와 슬라이더가
 * 전부 `MeshStandardMaterial` 의 PBR 파라미터에 묶여 있다.
 *
 * 기본을 `std` 로 두는 것은 behind-flag 와 같은 논리다. 라이브 방문자는 감독 판정
 * 전까지 검증된 경로만 본다.
 *
 * **이 분기는 한시적이다**(팀장 조건 5 — 청산 조항). 감독이 고르면 진 쪽 코드를
 * 지우는 것까지가 이 작업이고, 그래야 *"코드지저분하게하지말고"* 와 어긋나지 않는다.
 *
 * 후보 목록과 백엔드 판정은 `decide/water.ts` 가 소유한다 — 여기서 다시 적지 않는다.
 */

/** 수면 빛깔. 밝은 청록 — 어두우면 반투명이라도 바닥이 안 비쳐 보인다 */
const WATER = 0x8fc9dd;
/** 해저 빛깔. 물빛에 물든 모래. 채도를 낮춰야 물 너머로 보일 때 자연스럽다 */
const BED = 0x9aa89b;
/** 수면 불투명도. 낮추면 바닥이 또렷해 물웅덩이가 되고, 높이면 반투명인 뜻이 없어진다 */
export const OPACITY = 0.7;

/**
 * 두 물결층이 흐르는 속도(m/s). **서로 다르고 방향도 어긋나야** 한다.
 *
 * 같은 속도로 같은 방향이면 두 층이 한 덩어리로 미끄러져 "무늬가 흐르는 벽지"가 된다.
 * 어긋나면 겹치는 자리가 계속 바뀌어 물이 살아 있는 것처럼 보인다 — 강이 사인파 둘을
 * 겹쳐 되풀이를 숨긴 것과 같은 원리다.
 *
 * 0.05 m/s 언저리는 잔잔한 호수, 0.2 를 넘으면 강물처럼 흐른다. 도시 안 물이라 잔잔한
 * 쪽으로 잡았다.
 */
const FLOW_A = { x: 0.035, z: 0.021 };
const FLOW_B = { x: -0.019, z: 0.030 };

// ── 두 번째 물결 층 (감독 지시 2026-08-03, 팀장 판정 A) ─────────────────────
//
// 감독: *"물 표현. 한방향으로 흐르는데. 물은 복합적인 사인파들로 구성되어있잖아."*
//
// 정확한 지적이다. 지금까지 **법선을 만드는 층은 하나뿐**이었다(`normA`). `tint` 와
// `sparkle` 이 다른 방향으로 흐르지만 그것들은 색·반짝임이라 **형상에 기여하지 않는다.**
// 그래서 물결 무늬가 모양을 유지한 채 통째로 미끄러졌다 — "천이 흘러가는" 느낌의 정체다.
//
// 실제 수면은 방향·파장·속도가 다른 파동이 **겹쳐 간섭**한다. 마루가 생겼다 사라지고
// 무늬 모양 자체가 시시각각 변한다. 그것이 물이 살아 있어 보이는 이유다.
//
// ── ⚠ 사인파로 돌아가지 않는다 ──────────────────────────────────────────────
// 감독이 말한 "복합적인 사인파" 를 **공간 무늬**로 읽으면 안 된다. 2026-07-31 에 사인파
// 넷을 겹친 판본이 있었고 감독이 *"ㅈ런. 일자형 말고"* 라고 기각했다 — 사인파는 마루가
// 직선이라 몇 개를 겹쳐도 격자·빗금이 남는다. 높이장은 값 노이즈 그대로 둔다.
// 되살리는 것은 무늬가 아니라 **여러 파동이 다른 속도로 지나가며 간섭한다는 성질**이다.
//
// ── 비율을 정수비로 두지 않는다 (팀장 조건) ────────────────────────────────
// 두 층이 **같은 텍스처**를 쓰므로, 스케일·속도가 정수비면 주기적으로 두 층이 정확히
// 정렬된다. 그 순간 간섭이 사라져 "한 장" 으로 보이고, 물이 규칙적으로 박동한다.
//
// 그래서 **황금비**를 쓴다. 연분수 전개가 `[1;1,1,1,…]` 라 유리수로 가장 느리게 근사되는
// 수이고 — 즉 **정수비에서 가장 먼 수**다. "적당히 안 맞는 값" 을 손으로 고르는 대신
// 성질에서 유도한다.
const PHI = (1 + Math.sqrt(5)) / 2;
/** 두 번째 층의 무늬 크기 배수. 1보다 크면 더 큰 너울이 된다 */
const LAYER2_SCALE = PHI;
/**
 * 두 번째 층 무늬가 **월드에서** 첫 층의 몇 배 속도로 흐르는가.
 *
 * ⚠ 처음엔 `LAYER2_SPEED = 1 / PHI` 를 두고 `a * LAYER2_SPEED * LAYER2_SCALE` 로 썼다.
 * `(1/φ) × φ = 1` 이라 **UV 속도가 첫 층과 정확히 같았다**(검수관 R-3). 결과적으로
 * 월드 속도비는 `repeat` 차이 덕에 φ 가 나와 팀장 조건은 충족했지만, **상수 이름과
 * 주석이 코드와 다른 것을 말하고 있었다** — 다음 사람이 이 값을 속도 노브로 오인한다.
 *
 * 그래서 **재는 축을 월드로 바꾼다.** 화면에서 눈에 보이는 것이 월드 속도이므로 그것을
 * 직접 적고, UV 환산은 계산이 맡는다. 값이 φ 인 것은 위와 같은 이유다(정수비 회피).
 */
const LAYER2_WORLD_SPEED = PHI;
/**
 * 두 번째 층의 흐름 방향. `FLOW_A` 를 **황금각(≈137.5°)만큼 돌린 것**이다.
 *
 * 각도도 손으로 고르지 않는다 — 황금각은 어떤 정수배로도 한 바퀴에 맞아떨어지지 않아서
 * (해바라기 씨가 그 각으로 배열되는 이유다) 두 방향이 평행해지는 순간이 없다.
 */
const GOLDEN_ANGLE = 2 * Math.PI * (1 - 1 / PHI);
const FLOW_C = {
  x: FLOW_A.x * Math.cos(GOLDEN_ANGLE) - FLOW_A.z * Math.sin(GOLDEN_ANGLE),
  z: FLOW_A.x * Math.sin(GOLDEN_ANGLE) + FLOW_A.z * Math.cos(GOLDEN_ANGLE),
};
/**
 * 층 하나에 줄 불투명도 — **겹친 실효 불투명도가 `total` 이 되도록** 나눈다.
 *
 * ── 왜 필요한가 (검수관 반려 BR-2, 2026-08-03) ──────────────────────────────
 * 반투명 판이 겹치면 실효 불투명도가 곱으로 올라간다. 이 파일은 그 사실을 이미 알고
 * 있었다 — 강 판을 파셀 위에만 깐 이유가 그것이고, 주석이 *"`WATER_DEPTH` 는 단일
 * 반투명 층을 전제로 고른 값이라 그 캘리브레이션이 무효가 된다. 값이 아니라 전제가
 * 깨진 형태다"* 라고 적고 있다.
 *
 * **그런데 그 위에 또 한 겹을 얹었다.** 검수관 실측:
 *
 *   바다  투과 0.300 → 0.174 (−42%)
 *   강    투과 0.090 → 0.030 (−66%),  실효 불투명도 0.910 → 0.970
 *
 * 물가에서 바닥이 어렴풋이 비치는 정도는 감독이 노브(`?wopa=`)로 고른 축이다. 그것을
 * 아무 기록 없이 바꿔 놓았고 검사도 없었다(`LAYER2_OPACITY` 를 1.0 으로 바꿔도 78건
 * 전부 통과했다).
 *
 * ── 균등 배분으로 간다 ──────────────────────────────────────────────────────
 * 처음엔 위 층을 상수(0.42)로 고정하고 아래 층만 낮췄다. 그런데 **위 층 값이 총량보다
 * 크면 배분이 성립하지 않는다** — 아래를 0 으로 해도 총량을 못 맞춘다. 새로 넣은
 * G-2b 검사가 `total=0.3, second=0.42` 에서 그것을 바로 잡았다.
 *
 * 그래서 층 수에서 유도한다: `(1−o)ⁿ = 1−total` → `o = 1 − (1−total)^(1/n)`.
 * 상수 하나가 사라지고(위 층 불투명도), 총량 보존이 **어떤 값에서도** 성립한다.
 * 두 층이 대등하게 섞이는 것이 물리적으로도 자연스럽다 — 둘 다 같은 물이다.
 *
 * @param total  겹쳤을 때 나와야 할 실효 불투명도. `OPACITY` 또는 `?wopa=` 노브값
 * @param layers 겹치는 층 수
 */
export function layerOpacity(total: number, layers: number): number {
  if (layers <= 1) return total;
  if (total >= 1) return 1;
  return 1 - Math.pow(1 - total, 1 / layers);
}

/** 물 판이 몇 겹인가. 두 번째 물결 층이 붙으면 2 다 */
const WATER_LAYERS = 2;

/**
 * 물결 높이장. 사인파 넷을 겹친다 — 아래 두 텍스처가 이 하나의 함수에서 나온다.
 *
 * 주기가 캔버스 폭의 정수배여야 타일 이음매가 안 보인다 — 네 항 모두 `u`나 `v`가 1 늘 때
 * 위상이 2π의 정수배만큼 도는 계수를 골랐다. 이게 깨지면 물 위에 격자 솔기가 뜬다.
 * 테스트가 그것을 검사하므로 **export 한다**(그 목적 외에 쓰지 않는다). `u`/`v`는 0~1.
 */
export function waveHeight(u: number, v: number, skew: number = WAVE_SKEW): number {
  // ── 사인파를 버렸다 (감독 실기기 지시 2026-07-31 "일자형 말고") ───────────────
  // 감독이 스크린샷을 보며: *"ㅈ런. 일자형 말고."*
  //
  // 예전 판본은 사인파 넷을 겹쳤다. 그런데 **사인파는 방향을 가진 줄무늬**다 — 몇 개를
  // 겹쳐도 각 항의 마루가 직선을 이루고, 그 직선들이 교차하며 격자·빗금이 남는다.
  // 실기기 화면에 뜬 것이 정확히 그 빗금이었다.
  //
  // 더 나쁜 것은 그 직전에 내가 `soft-light` 합성으로 **대비를 올렸다**는 점이다.
  // 무늬를 또렷하게 만든 것이 맞는데, 또렷해진 것이 하필 줄무늬였다. 층을 겹치는 방향은
  // 옳았고 **겹칠 재료가 틀렸다.**
  //
  // 값 노이즈는 방향이 없다. 격자점마다 독립적인 난수를 두고 보간하므로 어느 축으로
  // 흘려도 줄이 생기지 않는다 — 물결이 물결로 보이는 최소 조건이다.
  //
  // ── 심리스는 이제 **주기 wrap** 이 보증한다 ──────────────────────────────────
  // 예전에는 "계수가 2π 정수배" 라는 규칙으로 타일을 이었고, 그 규칙을 어겨 가로 솔기가
  // 뜬 적이 있다(사람이 지켜야 하는 규칙이었다). 노이즈는 다르다 — `hash2` 가 격자
  // 좌표를 **주기로 감아** 읽으므로 u=0 과 u=1 이 같은 격자점을 보고, 이음매가
  // 구조적으로 존재할 수 없다. 지킬 규칙이 사람에게서 함수로 옮겨갔다.
  //
  // ── 합성은 그대로 남긴다 (감독 지시 "포토샵 합성기능") ──────────────────────
  // 옥타브를 그냥 더하면 평균으로 수렴해 흐리멍덩해진다. `soft-light` 는 중립값(0.5)이
  // 있어 층을 겹쳐도 대비가 살아 있다 — 큰 너울의 마루에서 잔물결이 도드라지고 골에서
  // 잦아든다. 그것이 실제 수면이 하는 일이다.
  let h = valueNoise(u, v, NOISE_OCTAVES[0]);
  for (let i = 1; i < NOISE_OCTAVES.length; i++) {
    h = softLight(h, valueNoise(u, v, NOISE_OCTAVES[i]));
  }
  // ── 마루를 세우고 골을 넓힌다 (물결의 비대칭) ───────────────────────────────
  // 노이즈든 사인파든 **위아래가 대칭**이다. 봉우리와 골이 같은 모양이라, 아무리 대비를
  // 올려도 "울퉁불퉁한 표면" 이지 물결이 아니다. 감독이 계속 지적한 밋밋함의 남은 절반이
  // 여기 있다 — 디테일이 부족한 게 아니라 **모양이 틀렸다**.
  //
  // 실제 수면은 비대칭이다. 중력이 물을 아래로 당기므로 골은 넓고 완만하게 퍼지고
  // 마루는 좁고 뾰족하게 선다(파도가 부서지기 직전의 그 형태다). 사진 노멀맵이 좋아
  // 보이는 이유도 디테일보다 이 비대칭이 크다.
  //
  // 감마 곡선 하나로 만든다. `a^k`(k>1)는 작은 값을 더 눌러 **골을 넓히고**, 1 근처는
  // 거의 그대로 둬 **마루를 남긴다.** 좌표를 건드리지 않으므로 심리스는 그대로다.
  const skewed = Math.pow(h, skew);
  // −1~1 로 편다(소비처가 그 범위를 기대한다). 노이즈는 극단값이 드물어 그대로 펴면
  // 진폭이 작다 — 늘리고 잘라낸다.
  return Math.max(-1, Math.min(1, (skewed * 2 - 1) * WAVE_GAIN));
}

/**
 * 물결 비대칭 지수. **1 이면 대칭**(감마 없음)이고 클수록 골이 넓어진다.
 *
 * 1.7 은 골이 확실히 퍼지되 마루가 바늘처럼 가늘어지지 않는 지점이다. 2 를 넘기면
 * 수면이 "물" 이 아니라 "구겨진 천" 으로 읽힌다.
 *
 * ── 왜 `waveHeight` 가 이 값을 **인자로도** 받는가 (검수관 블로커 2026-07-31) ──
 * 처음에는 이 상수를 함수 안에서 직접 읽었고, 테스트는 "표본 평균이 0 보다 낮다" 로
 * 비대칭을 재려 했다. **그 축은 비대칭을 재고 있지 않았다.** 검수관이 실측했다:
 *
 *   skew 1(대칭)  → mean −0.4938      ← 이미 임계값(−0.05)을 한참 밑돈다
 *   skew 1.7      → mean −0.7927
 *   합성 직후 raw → mean  0.3147      ← 0.5 가 아니다
 *
 * `softLight` 4옥타브 합성 **자체가** 평균을 0.5 밑으로 크게 끌어내리고 있었다. 그래서
 * 비대칭을 꺼도 단언이 통과했다 — 그 테스트는 감마가 아니라 **합성의 편향**을 재고 있었고,
 * 주석에 적힌 "1 로 되돌리면 깨진다" 는 **거짓 주장**이었다.
 *
 * 원인은 **기준선이 없다는 것**이다. "낮다" 를 재려면 무엇보다 낮은지가 있어야 하는데
 * 테스트가 대칭 버전을 만들 수단이 없었다. 그래서 인자로 연다 — 기본값이 있어 소비처는
 * 그대로이고, 테스트는 `waveHeight(u, v, 1)` 로 **대칭 대조군**을 직접 만들어 비교한다.
 * 이제 `WAVE_SKEW` 를 1 로 되돌리면 두 표본이 같아져 깨진다.
 */
const WAVE_SKEW = 1.7;
/** 진폭 배수. 노이즈는 극단값이 드물어 그대로 펴면 물결이 밋밋하다 */
const WAVE_GAIN = 1.6;

// ── 수면 변위 — 물이 **제자리에서 오르내린다** (감독 지시 2026-08-03) ─────────
//
// 감독 판정: *"물이 일렁인다는 느낌이 없네"* (실기기 WebGPU).
//
// ── 왜 노말맵 2겹으로는 안 됐나 ─────────────────────────────────────────────
// 직전 처방(층을 둘로 겹쳐 간섭)은 **무늬의 단조로운 반복**은 깼지만 일렁임을 만드는
// 축이 아니었다. 원인이 둘이고 **둘 다 구조적**이었다:
//   ① 높이가 0 이다 — 판이 `PlaneGeometry(…, 1, 1)` 이라 정점이 4개였고, `waveHeight`
//      는 노말맵 텍스처를 굽는 데만 쓰였다. 노말맵은 빛 반사 방향만 속이므로 실루엣이
//      평평하고 시차가 없다. 눈높이에서는 스침각이라 더 압축된다.
//   ② 정재파가 없다 — 두 층 다 `FLOW × t` 로 **병진**한다. 진행파 둘의 합은 여전히
//      진행파다. 제자리 상하 운동은 마주 보는 파가 만나야 생긴다.
//
// 그래서 이 처방은 **정점을 실제로 올린다.** 수용 기준(팀장 조건 4)은 감독의 언어로:
//   *"강가에 서서 보면, 무늬가 흐르는 것과 별개로 물 표면이 제자리에서 오르내리고
//     물가 경계선이 출렁인다."*

/**
 * 변위가 담당할 **최단 파장**(m). 이보다 잔 물결은 노말맵이 계속 담당한다 —
 * 두 축의 분담 정의이고, 세분 수는 여기서 **유도된다**(손으로 정하지 않는다).
 *
 * 팀장이 확정한 값은 8m 였는데 유도해 보니 예산을 넘었다:
 *   λ=8m  → 세분 16×16 → 쿼드당 512 삼각형 → 최악 60칸 × 512 = 30,720 (씬 대비 **+30%**)
 *   λ=16m → 세분  8×8  → 쿼드당 128 삼각형 → 최악 60칸 × 128 =  7,680 (씬 대비 **+7.5%**)
 * 감독이 무게를 물었고("에이는 무겁지 않아?") 그 답의 전제가 +7% 였으므로 예산 초과로
 * 판정해 16m 로 올렸다 — 팀장 조건 1 이 그 경우를 명시적으로 허용한다.
 * 강 폭이 48m(`RIVER_HALF × 2`)라 파장 16m 면 강을 가로질러 파형이 3개 들어간다.
 */
const LIFT_LAMBDA_M = 16;

/**
 * 물 쿼드 하나(32m)를 몇 조각으로 나눌 것인가. **파장에서 유도한다.**
 * 파장당 4점(나이퀴스트에 여유) → 세그먼트 간격 = λ/4.
 *
 * `1` 이면 정점이 네 귀퉁이뿐이라 변위가 사실상 꺼진다 — **되돌리기 스위치가 이 상수
 * 하나다**(팀장 조건 2). 실기기에서 무거우면 여기만 1 로 되돌리면 옛 평면으로 간다.
 *
 * 총량 유도(실측이 아니라 밴드에서 — 팀장 조건 1):
 *   한 x 열의 물 칸 = `|pz·cellZ − C| < RIVER_HALF` 를 만족하는 정수 pz.
 *   길이 `2·RIVER_HALF / cellZ = 48/32 = 1.5` 구간이므로 **최대 2칸**.
 *   → 이론 최악 = `GRID_W × 2 = 60` 칸 → 정점 60 × 9² = **4,860** · 삼각형 **7,680**.
 */
export const RIVER_SEG = Math.max(1, Math.round(DEFAULT_LAYOUT.cellX / (LIFT_LAMBDA_M / 4)));
export const LIFT_LAMBDA = LIFT_LAMBDA_M;

/**
 * 파고(m, 마루~골의 **절반**). 강은 땅보다 50cm 아래이므로(`RIVER_Y`) 이 값이 그보다
 * 크면 물이 둔치를 넘는다. 여유를 크게 둔다 — 넘치는 것은 결함으로 보이고,
 * 실루엣은 진폭보다 **움직임**으로 읽힌다.
 */
const LIFT_AMP = readNum('wamp', 0.13, 0, 0.4);

/**
 * 진행파 : 정재파 배분. `0` 이면 전부 흘러가고 `1` 이면 전부 제자리에서 오르내린다.
 * **노브로 뺀 이유**(팀장 조건 3): 어느 배분이 "일렁임" 으로 읽히는지는 감독 실기기
 * 육안 판정이고, 헤드리스로는 못 정한다. 기본값은 정재 쪽에 무게를 둔다 —
 * 감독이 지적한 것이 *"한 방향으로 흐르는데"* 였으므로 병진이 이미 과했다.
 */
const LIFT_STANDING = readNum('wstd', 0.65, 0, 1);

/**
 * 겹치는 파들. 감독 요청이 *"물은 복합적인 사인파들로 구성되어있잖아"* 였다.
 * 방향과 주파수 비를 정수비에서 멀리 둔다 — 정수비면 짧은 주기로 패턴이 되풀이된다.
 * `dir` 은 단위벡터, `rel` 은 기본 파수 대비 배율, `amp` 는 상대 진폭(합이 1).
 */
const LIFT_WAVES = [
  { dx: 1, dz: 0, rel: 1, amp: 0.5 },
  { dx: 0.5, dz: 0.866, rel: PHI, amp: 0.3 },              // 60°
  { dx: -0.309, dz: 0.951, rel: PHI * PHI, amp: 0.2 },     // 108°
];

/**
 * 수면 높이(m). **월드 좌표만의 함수다** — 이 성질이 파셀 경계의 이음새를 막는다.
 * 강 판은 파셀마다 독립된 정점을 쓰므로(같은 좌표에 정점이 둘) 위치 기반이 아니면
 * 두 값이 갈려 틈이 벌어진다.
 *
 * 진행파 `sin(k·x − ωt)` 와 정재파 `sin(k·x)·cos(ωt)` 를 섞는다. 정재파가 곧
 * "제자리 오르내림" 이다 — 공간 패턴이 고정된 채 진폭만 시간에 따라 오간다.
 *
 * ω 는 **깊은 물 분산관계 `ω = √(gk)`** 에서 유도한다(실측에 여유를 얹지 않는다).
 * λ=16m 면 주기 3.2초로, 사람이 물가에서 보는 잔잔한 강의 리듬과 맞는다.
 */
export function surfaceLift(
  x: number, z: number, t: number,
  amp: number = LIFT_AMP, standing: number = LIFT_STANDING,
): number {
  if (amp <= 0) return 0;
  const k0 = (2 * Math.PI) / LIFT_LAMBDA_M;
  let h = 0;
  for (const w of LIFT_WAVES) {
    const k = k0 * w.rel;
    const phase = k * (w.dx * x + w.dz * z);
    const omega = Math.sqrt(9.81 * k);
    h += w.amp * (
      (1 - standing) * Math.sin(phase - omega * t)
      + standing * Math.sin(phase) * Math.cos(omega * t)
    );
  }
  return h * amp;
}

/**
 * 노이즈 옥타브의 격자 해상도. **전부 정수**여야 타일이 감긴다 — 이 배열이 심리스의
 * 유일한 전제이고, 소수를 넣으면 `hash2` 의 wrap 이 어긋나 이음매가 생긴다.
 *
 * 3(큰 너울) → 7 → 15 → 31. 2배가 아니라 **서로 소에 가깝게** 띄운다. 정확히 2배씩
 * 늘리면 격자점이 겹쳐 층이 같은 자리에서 꺾이고, 그 자국이 다시 격자무늬로 읽힌다.
 *
 * ── 61·127 을 얹었다가 되돌렸다 (감독 실기기 판정 2026-07-31) ────────────────
 * 감독이 *"느낌이 아쉬워"* 라고 해서 **고주파 부족**으로 진단했다. 노멀맵이 128px 인데
 * 최고 옥타브가 31 이면 격자가 4px 이라 그보다 잔 결이 들어갈 자리가 없다 — 사실이었다.
 * 그래서 512px 로 키우고 61·127 을 얹었다.
 *
 * **실기기에서 더 나빠졌다.** 감독: *"이단물결은 아까가 나아. 되돌려."*
 *
 * 사실은 맞았는데 **결론이 틀렸다.** 잔결이 들어갈 자리가 없던 것은 맞지만, 그것이
 * "잔결을 넣으면 좋아진다" 를 뜻하지 않았다. 320px 폭 화면에서 127 옥타브는 화면 1px
 * 보다도 촘촘해져 밉맵이 뭉개거나 지글거리고, **물결이 아니라 사포 표면**이 된다.
 * 물결로 읽히려면 무늬가 눈에 보이는 크기여야 한다.
 *
 * 이 저장소가 명문화한 형태다 — *"참인 문장에서 성립하지 않는 결론을 뽑는 것.
 * 값이 아니라 재는 축이 틀린다."* 나는 "표현될 자리가 없다" 는 참인 관찰에서
 * "그러니 넣으면 나아진다" 를 뽑았고, 그 사이에 **화면 크기**라는 항이 빠져 있었다.
 *
 * 고주파를 다시 시도한다면 **화면 픽셀 대비 무늬 크기**부터 따져야 한다. 옥타브를
 * 늘리는 것이 아니라 무늬 자체를 바꾸는 쪽일 가능성이 높다.
 */
const NOISE_OCTAVES = [3, 7, 15, 31];

/**
 * 노멀맵 한 변(px). 나머지 텍스처(`AUX_N`)와 같은 값이지만 **이름을 나눠 둔다** —
 * 한 번 512 로 키웠다가 되돌린 자리라, 다음에 다시 손댈 때 어디를 만지는지 분명해야 한다.
 *
 * 512 + 옥타브 6단을 실기기에서 시도했고 **감독이 되돌리라고 판정했다**(위 주석).
 * 부팅 비용은 41ms → 454ms 였고 로딩 체감은 없었다 — 즉 **비용이 문제가 아니라
 * 결과가 문제였다.** 성능이 허락한다고 좋아지는 것이 아니라는 실측이다.
 */
const NORMAL_N = 128;

/**
 * 나머지 텍스처(밝기·윤슬·자갈) 한 변(px). 노멀맵만큼 클 필요가 없다 —
 * 밝기는 완만하고, 윤슬은 점이고, 자갈은 물을 통해 흐려져 보인다.
 *
 * 부팅 시 굽는 비용이 해상도의 제곱으로 늘어서, 필요 없는 곳까지 키우면
 * 로딩만 길어지고 화면은 그대로다.
 *
 * ── 한 번 256 으로 올렸다가 되돌렸다 (검수관 권고 2026-07-31) ────────────────
 * 노멀맵을 512 로 올리면서 이것도 128 → 256 으로 같이 올렸는데, **근거를 어디에도
 * 적지 않았다.** 검수관이 짚었다 — 주석은 "클 필요 없다" 고 해놓고 값은 2배로 올린
 * 상태였고, 그 2배가 부팅 비용을 순수하게 늘리고 있었다(픽셀 4배).
 *
 * 되돌린다. 이 셋은 옥타브 확장의 수혜자가 아니다:
 *   · `sparkleTexture`·`pebbleTexture` 는 `NOISE_OCTAVES` 를 **아예 안 쓴다**
 *     (자체 상수와 시드 랜덤을 쓴다) — 해상도만 늘 뿐 잔결이 생기지 않는다.
 *   · `waveTintTexture` 는 옥타브를 쓰지만 **밝기**라 고주파가 눈에 안 띈다.
 *
 * 고주파가 필요한 곳은 **법선**뿐이고 그것이 `NORMAL_N` 이다.
 */
const AUX_N = 128;

/**
 * 격자 해시 — 정수 좌표 하나에 0~1 난수 하나. **주기로 감아 읽는 것**이 핵심이다.
 *
 * `period` 로 감기 때문에 좌표 `0` 과 `period` 가 같은 값을 받고, 그래서 타일 경계가
 * 이어진다. 심리스를 사람이 지키는 규칙에서 **함수의 성질**로 옮긴 자리다.
 *
 * `Math.imul` 을 쓴다 — 일반 곱셈은 32비트를 넘으면 부동소수로 새서 해시가 뭉개진다.
 */
function hash2(xi: number, yi: number, period: number): number {
  const x = ((xi % period) + period) % period;
  const y = ((yi % period) + period) % period;
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * 심리스 값 노이즈. 타일 하나에 `freq × freq` 격자를 깔고 그 사이를 부드럽게 잇는다.
 *
 * 보간에 스무스스텝(`t²(3−2t)`)을 쓴다. 선형 보간이면 격자 경계에서 기울기가 꺾이고,
 * **노멀맵은 기울기를 그대로 읽으므로** 그 꺾임이 화면에 격자 선으로 나타난다.
 */
function valueNoise(u: number, v: number, freq: number): number {
  const x = u * freq, y = v * freq;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, freq), b = hash2(x0 + 1, y0, freq);
  const c = hash2(x0, y0 + 1, freq), d = hash2(x0 + 1, y0 + 1, freq);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

/**
 * 포토샵 `소프트 라이트`. 밑층 `a` 를 윗층 `b` 로 부드럽게 조인다.
 *
 * `b`가 0.5면 `a` 그대로다 — **중립값이 있다**는 것이 덧셈과 다른 점이고, 그래서 층을
 * 아무리 겹쳐도 전체가 회색으로 수렴하지 않는다.
 *
 * W3C 합성 명세(`css-compositing-1`)의 식 그대로다. `a < 0.25` 가지의 다항식은 제곱근을
 * 근사하면서 미분 연속을 맞춘 것 — 여기서 꺾이면 노멀맵에 그 자국이 선으로 남는다.
 */
function softLight(a: number, b: number): number {
  if (b <= 0.5) return a - (1 - 2 * b) * a * (1 - a);
  const d = a <= 0.25 ? ((16 * a - 12) * a + 4) * a : Math.sqrt(a);
  return a + (2 * b - 1) * (d - a);
}

/**
 * 높이장을 노멀맵으로 굽는다. **일렁임의 정체는 색이 아니라 법선이다** — 빛이 기울기를
 * 따라 미끄러지며 반짝이는 것이 물처럼 보이게 한다.
 *
 * 인접 표본의 차분으로 기울기를 구해 접선공간 노멀(RGB)로 적는다.
 */
// 반환 타입은 일부러 적지 않는다. `three/webgpu` 는 `CanvasTexture` 를 타입으로
// 재수출하지 않아(TS2305/TS2694) 이름으로 적을 방법이 없고, 추론이 정확히 같은 타입을 준다.
function waveNormalTexture(strength: number) {
  const N = NORMAL_N;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(N, N);
  const d = 1 / N;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const v = y / N;
      // 중앙차분. 가장자리는 wrap 으로 이어 붙여야 타일 경계에 솔기가 생기지 않는다
      const dx = (waveHeight((u + d) % 1, v) - waveHeight((u - d + 1) % 1, v)) * strength;
      const dy = (waveHeight(u, (v + d) % 1) - waveHeight(u, (v - d + 1) % 1)) * strength;
      // 접선공간 노멀 = normalize(-dx, -dy, 1) → 0~255
      const len = Math.hypot(dx, dy, 1);
      const i = (y * N + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(PLANE / RIPPLE_M, PLANE / RIPPLE_M);
  return tex;
}

// ── 윤슬 (감독 지시 2026-07-30) ─────────────────────────────────────────────
// *"물 느낌이 잘나왔으면 좋겠는데. 쉐이더 멋진것으로… 윤슬이 보이는 거였으면 좋겠어.
//   실제 반사로 하지말고. 쉐이더 트릭으로 했으면 해."*
//
// 윤슬은 잔물결에 빛이 부서지는 반짝임이다. 그런데 **감독이 이전에 정반대를 지적했다** —
// *"밤 강에서 반사가 어색하네. 밤인데 빛이 이렇게 많지 않잖아."* 그 처방으로
// `normalScale` 과 `roughness` 를 내려 하이라이트를 **넓게 퍼뜨린 은은한 띠**로 만들었다.
//
// 두 요구가 같은 파라미터의 반대 방향이다. 전체를 다시 밝히면 밤 지적이 되살아난다.
// 그래서 **전체 밝기는 그대로 두고 점만 반짝이게** 한다 — 그것이 윤슬의 실제 모습이고
// (넓은 빛무리가 아니라 잔물결 하나하나가 점으로 튄다), 밤에도 물 전체가 밝아지지 않는다.
//
// ── 왜 GLSL 이 아니고 이 방식인가 (팀장 판정 2026-07-30) ────────────────────
// `three/webgpu` 에는 GLSL `ShaderMaterial` 렌더 경로가 없다(이 파일 위쪽 주석). TSL 노드
// 재질은 world2 최초 도입이고 **헤드리스로 검증할 수 없는 축**이 늘어난다(감독 실기기가
// 유일 판정). 팀장이 그 3중 위험을 근거로 기각하고 현행 방식 확장을 지시했다:
// *"반짝임의 정체는 법선 위의 스페큘러이고, 이것은 실제 광원 방향을 따른다."*
//
// **`emissive` 로 내지 않는다**(팀장 조건 4) — 스스로 빛나는 물은 광원과 무관해져 밤
// 지적과 정면 충돌한다. 반짝임은 반드시 광원 의존 경로(roughness 변조)로 낸다.
//
// ── 왜 거칠기맵 슬롯을 버렸나 (감독 실기기 실증 2026-07-31) ──────────────────
// 예전 판본은 *"슬롯을 추가하지 않는다"* 를 내걸고 **층 B 노멀맵을 `roughnessMap` 자리에
// 태웠다.** three 표준 재질이 `roughnessMap` 의 G채널만 읽으니 R·B 는 남고, 그 G 에
// 윤슬을 눌러 넣으면 텍스처 한 장이 두 역할을 한다 — 텍스처 0장 추가, 드로우콜 0.
//
// **그 절약이 화면을 망가뜨렸다.** 노멀맵의 G 는 법선의 Y성분이라 0~1 전 구간을 오간다.
// 실효 거칠기는 `스칼라 × G` 이므로 G≈0 인 자리가 **완전 거울**이 되는데, 이 씬에는
// `scene.environment` 가 없어 거울이 반사할 것이 없다 → **검다.** 그 자리는 파동 무늬를
// 따라 띠를 이루고 `offset` 이 흐르므로 **검은 줄기가 물 위를 흘러간다.**
//
// 감독 실기기 스크린샷이 이것을 확정했다 — 거칠기 슬라이더를 **1.00(최대)** 까지 올렸는데도
// 줄기가 그대로였다. 곱셈이라 G=0 인 자리는 어떤 스칼라를 곱해도 0 이다. 값으로 못 고친다.
//
// 앞서 나는 원인을 "환경맵 부재로 근-거울면이 어둡다" 로 짚었는데, **절반만 맞았다.**
// 환경맵이 없는 것은 맞지만 진짜 원인은 *어디가 거울이 되는지를 노멀맵이 정하고 있던 것*
// 이다. 거칠기를 아무리 올려도 안 사라지는 이유가 거기 있었다.
//
// 그래서 슬롯을 **비운다.** 거칠기는 시간대·노브가 정하는 스칼라 하나로 간다.
// 주석이 "R·B 는 아무도 안 본다" 고 적었던 것은 사실이었지만, **G 는 노멀의 Y이면서
// 동시에 거칠기**라는 것 — 한 채널이 두 역할을 맡고 있다는 것 — 을 못 봤다.

// ── 윤슬을 흰 빛으로 낸다 (감독 지시 2026-07-31 "흰 반짝임효과 해줘") ──────────
// 예전에는 윤슬을 **거칠기 변조로만** 냈다. 좁은 스페큘러가 광원을 튕기는 방식이라
// 물리적으로는 옳지만, 반사할 환경이 없으면 **아무것도 안 보인다** — 실기기에서 실제로
// 반짝임이 0 이었다.
//
// ── 팀장 조건 4 를 뒤집는다 (근거는 지킨다) ──────────────────────────────────
// 2026-07-30 팀장 판정은 *"`emissive` 로 내지 않는다 — 스스로 빛나는 물은 광원과 무관해져
// 밤 지적과 정면 충돌한다"* 였다. 그 **근거**는 지금도 옳다(감독의 예전 지적: *"밤인데 빛이
// 이렇게 많지 않잖아"*). 그러나 근거가 지키려던 것은 "밤에 물이 밝아지지 않을 것" 이지
// "emissive 를 쓰지 말 것" 이 아니다 — 그것은 수단이었다.
//
// 수단을 바꾸되 목적은 `emissiveIntensity` 의 **시간대 분기**로 지킨다(낮 강 · 밤 약).
// 그리고 감독이 이번에 직접 지시했고, 현행 수단이 실기기에서 0 이라는 것이 실증됐다.
const SPARKLE_CELL = 7;      // 스파클 격자 한 칸(px) — 촘촘하면 물이 서리처럼 된다
const SPARKLE_RATE = 0.16;   // 칸당 점이 생길 확률
const SPARKLE_CORE = 1.0;    // 점 중심 밝기(0~1)
const SPARKLE_HALO = 0.35;   // 점 둘레 밝기 — 1px 점만 두면 멀리서 사라진다

/**
 * 윤슬 발광맵. **검은 바탕에 흰 점**이고 `emissiveMap` 슬롯에 꽂힌다.
 *
 * 검은 곳은 `emissive` 가 0 이라 물빛 그대로다 — 즉 이 텍스처는 물 전체를 밝히지 않고
 * **점만** 밝힌다. 감독의 예전 지적(밤에 빛이 너무 많다)이 여기서 지켜진다.
 *
 * 점 둘레에 옅은 halo 를 둔다. 1px 점만 두면 밉맵이 먼 거리에서 그것을 평균내 **없애버려**,
 * 가까이서만 반짝이고 멀리서는 아무것도 없는 물이 된다.
 *
 * 시드를 고정한다. 매 실행 같은 배치여야 스크린샷 비교가 성립한다.
 */
function sparkleTexture() {
  const N = AUX_N;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(N, N);
  // 바탕은 검정(발광 0). `createImageData` 가 0으로 채워 주지만 알파는 세워야 한다.
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;

  let seed = 20260730;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const put = (x: number, y: number, v: number) => {
    // 타일 경계를 **넘어가지 않고 감는다**. 점이 가장자리에 걸렸을 때 halo 가 잘리면
    // 그 자리에 반짝임이 반쪽인 점이 생기고, 타일이 이어붙는 자리마다 그것이 줄지어 선다.
    const i = (((y + N) % N) * N + ((x + N) % N)) * 4;
    const c = Math.max(img.data[i], v * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
  };

  for (let cy = 0; cy < N; cy += SPARKLE_CELL) {
    for (let cx = 0; cx < N; cx += SPARKLE_CELL) {
      if (rand() > SPARKLE_RATE) continue;
      // 칸 안 임의 위치 — 격자 그대로 두면 점이 줄지어 서 격자무늬로 읽힌다
      const x = cx + Math.floor(rand() * SPARKLE_CELL);
      const y = cy + Math.floor(rand() * SPARKLE_CELL);
      put(x, y, SPARKLE_CORE);
      put(x + 1, y, SPARKLE_HALO); put(x - 1, y, SPARKLE_HALO);
      put(x, y + 1, SPARKLE_HALO); put(x, y - 1, SPARKLE_HALO);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(PLANE / RIPPLE_M, PLANE / RIPPLE_M);
  return tex;
}

/**
 * 해저 자갈(감독 지시 2026-07-31 *"바닥에 검은 돌들이 있는 심리스로 깔아서. 투명하게
 * 보이는 효과는 어때"*).
 *
 * ── 이것이 물을 물로 만든다 ──────────────────────────────────────────────────
 * 지금까지 해저는 **단색 판**이었다. 물이 반투명인데 아래에 볼 것이 없으니 방문자에게
 * 깊이를 읽을 단서가 하나도 없었고, 그래서 물이 "색칠한 판" 으로 보였다. 반투명이라는
 * 성질은 **뒤에 무엇이 있을 때만** 의미가 있다.
 *
 * 자갈이 깔리면 얕은 데선 또렷하고 깊은 데선 물빛에 묻힌다. 그 차이가 곧 깊이다 —
 * 수면 무늬를 아무리 다듬어도 이것 없이는 물이 얕아 보이지 않는다.
 *
 * ── 왜 노이즈 두 겹인가 ──────────────────────────────────────────────────────
 * 돌 하나하나를 그리지 않는다. 굵은 노이즈로 **돌덩이 크기의 얼룩**을 만들고, 잔 노이즈로
 * 그 위에 자잘한 결을 얹는다. 물을 통해 보면 어차피 흐려지므로 형태보다 **명암의 밀도**가
 * 중요하다 — 검은 점이 촘촘히 박힌 느낌이면 자갈로 읽힌다.
 *
 * 심리스는 `valueNoise` 가 보증한다(정수 주기로 감긴다).
 */
function pebbleTexture() {
  const N = AUX_N;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      // 굵은 얼룩(돌덩이) 위에 잔결을 얹는다. 곱하지 않고 `soft-light` 로 겹치는 이유는
      // 곱셈이 전체를 어둡게만 만들기 때문이다 — 밝은 자갈과 어두운 자갈이 섞여야 한다.
      const stone = softLight(valueNoise(u, v, PEBBLE_COARSE), valueNoise(u, v, PEBBLE_FINE));
      // 0~1 을 `PEBBLE_DARK ~ PEBBLE_LIGHT` 로 옮긴다. 아주 검은 돌이 섞여야 감독이
      // 말한 "검은 돌" 이 되지만, 바닥 전체가 검으면 물이 구멍처럼 보인다.
      const s = PEBBLE_DARK + stone * (PEBBLE_LIGHT - PEBBLE_DARK);
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = s * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // 자갈은 물결보다 **잘게** 반복해야 돌 크기로 읽힌다. 물결 무늬(16m)와 같은 주기로
  // 깔면 돌 하나가 방 하나만 해진다.
  tex.repeat.set(PLANE / PEBBLE_M, PLANE / PEBBLE_M);
  return tex;
}

/** 자갈 무늬 한 타일이 덮는 거리(미터). 사람 걸음에 돌 몇 개가 지나갈 크기 */
const PEBBLE_M = 6;
/** 굵은 얼룩(돌덩이) 격자 — 정수여야 심리스 */
const PEBBLE_COARSE = 11;
/** 잔결 격자 — 정수여야 심리스 */
const PEBBLE_FINE = 23;
/** 가장 어두운 돌. 0 에 너무 가까우면 물 아래가 구멍처럼 보인다 */
const PEBBLE_DARK = 0.18;
/** 가장 밝은 돌. 1 에 가까우면 자갈이 아니라 모래가 된다 */
const PEBBLE_LIGHT = 0.85;

/**
 * 밝기 무늬. 같은 높이장에서 굽는다 — 물마루가 밝고 골이 어둡다.
 *
 * 색은 넣지 않는다. 재질의 `color`가 색을 정하고 이 텍스처는 곱해질 뿐이라, 여기에 색을
 * 넣으면 두 곳에서 색을 정하는 미러링이 된다(이 프로젝트가 도로에서 이미 겪었다 —
 * 어두운 톤이 텍스처와 곱해져 길이 검게 나왔다).
 */
function waveTintTexture() {
  const N = AUX_N;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const g = cv.getContext('2d')!;
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // 높이 −1~1 → 밝기 0.82~1.0. 폭을 좁게 잡아야 무늬가 얼룩으로 보이지 않는다
      const s = (waveHeight(x / N, y / N) * 0.5 + 0.5) * 0.18 + 0.82;
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = s * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(PLANE / RIPPLE_M, PLANE / RIPPLE_M);
  return tex;
}

/**
 * 강 판의 지오메트리 — **물 파셀 위에만 깐 쿼드 묶음.**
 *
 * 왜 큰 평면 하나가 아닌지는 아래 `river` 조립부 주석에 적었다(요약: 바다 판과 상시
 * 이중 겹침이 되어 반투명 캘리브레이션이 무효화된다).
 *
 * **어디가 물인지는 `parcelWater` 에만 묻는다.** 강 중심선·반폭을 여기서 다시 계산하면
 * 그것이 값 미러링이고, 판정이 강을 옮겼을 때 물 구멍과 강 판이 어긋난다.
 *
 * 격자 안만 순회하는 것이 중요하다 — `parcelWater` 는 격자 **밖**도 `'water'` 로
 * 돌려주는데(세계의 끝 = 바다) 그쪽은 바다 판이 덮는다. 밖까지 깔면 바다 전체에 강
 * 높이의 판이 한 장 더 생겨 원래 문제로 되돌아간다.
 *
 * UV 는 바다 판(`PlaneGeometry(PLANE, PLANE).rotateX(-π/2)`)과 **같은 규칙**으로 낸다.
 * 그 회전 뒤 `u = x/PLANE + 0.5` · `v = 0.5 − z/PLANE` 가 되므로 그대로 쓴다 — 어긋나면
 * 물결 무늬가 강과 바다에서 다른 크기·다른 방향으로 흐른다(같은 재질이므로 `repeat` 와
 * `offset` 은 저절로 공유된다).
 */
function riverGeometry(): { geo: THREE.BufferGeometry; baseUv: number[]; flow: number[] } {
  const cellX = DEFAULT_LAYOUT.cellX;
  const cellZ = DEFAULT_LAYOUT.cellZ;
  const pos: number[] = [];
  const uv: number[] = [];
  /** 정점별 흐름 방향(UV 공간, 단위벡터). 매 프레임 UV 를 이 방향으로 민다. */
  const flow: number[] = [];
  const idx: number[] = [];
  let n = 0;

  for (let px = GRID_MIN_X; px <= GRID_MAX_X; px++) {
    for (let pz = GRID_MIN_Z; pz <= GRID_MAX_Z; pz++) {
      if (parcelWater(px, pz, cellX, cellZ) !== 'water') continue;

      // 파셀이 덮는 범위. 지면 판과 **같은 규칙**이라야 물 구멍에 정확히 들어맞는다.
      const x0 = px * cellX - cellX / 2;
      const x1 = px * cellX + cellX / 2;
      const z0 = pz * cellZ - cellZ / 2;
      const z1 = pz * cellZ + cellZ / 2;

      // ── 쿼드를 `RIVER_SEG` 조각으로 나눈다 (감독 지시 2026-08-03) ────────────
      // 예전에는 네 귀퉁이뿐이었다. 그러면 **높이를 줄 자리가 없다** — 그것이 감독이
      // *"일렁인다는 느낌이 없네"* 라고 판정한 원인이었다. 세분 수는 파장에서 유도한다
      // (`RIVER_SEG`). `1` 이면 옛 모양 그대로이므로 되돌리기 스위치이기도 하다.
      //
      // y 는 0 으로 두고 높이는 메시의 `position.y`(= RIVER_Y)가 준다 — 바다 판과
      // 같은 방식이라 높이를 옮길 때 손댈 곳이 한 군데다. 물결 변위는 매 프레임
      // `surfaceLift` 가 이 y 를 덮어쓴다.
      const S = RIVER_SEG;
      for (let i = 0; i <= S; i++) {
        for (let j = 0; j <= S; j++) {
          const vx = x0 + (x1 - x0) * (i / S);
          const vz = z0 + (z1 - z0) * (j / S);
          pos.push(vx, 0, vz);
          uv.push(vx / PLANE + 0.5, 0.5 - vz / PLANE);
          // 흐름 방향 — **정점의 x 로** 구한다(파셀 중심이 아니라). 한 파셀 안에서도
          // 좌우 끝의 접선이 달라야 굽이가 부드럽게 이어진다. 월드 (x,z) 를 UV 로
          // 옮길 때 v 축이 뒤집히므로(`0.5 - z/PLANE`) z 성분의 부호를 바꾼다.
          const f = riverFlowAt(vx);
          flow.push(f.x, -f.z);
        }
      }
      // 위에서 내려다볼 때 앞면이 되도록 감는다(반시계). 뒤집히면 위에서 안 보인다.
      // 옛 감기 `(0,2,1),(0,3,2)` 를 격자로 옮긴 것이다 — 0=(i,j) 1=(i+1,j) 2=(i+1,j+1) 3=(i,j+1).
      for (let i = 0; i < S; i++) {
        for (let j = 0; j < S; j++) {
          const a = n + i * (S + 1) + j;      // (i,   j  )
          const b = a + (S + 1);              // (i+1, j  )
          idx.push(a, b + 1, b, a, a + 1, b + 1);
        }
      }
      n += (S + 1) * (S + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  const posAttr = new THREE.Float32BufferAttribute(pos, 3);
  // 매 프레임 y 를 덮어쓴다 — 드라이버에 그 사실을 알린다(정적 버퍼로 두면 갱신마다
  // 재할당이 날 수 있다). **개수는 안 는다** — 부팅 1회 생성이고 갱신은 내용뿐이라
  // 스모크 `[7]` 개수 불변식이 그대로 성립한다.
  posAttr.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('position', posAttr);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  // 법선은 전부 위쪽 — 수평 판이므로 계산할 것이 없다. `computeVertexNormals` 를 쓰면
  // 같은 값을 삼각형마다 다시 구하는 셈이고, 물결은 노말맵이 낸다.
  g.setAttribute('normal', new THREE.Float32BufferAttribute(
    new Array(n * 3).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3,
  ));
  g.setIndex(idx);
  // 기준 UV 를 따로 들고 있는다. 매 프레임 **기준에서 다시 계산**한다 —
  // 누적하면 부동소수 오차가 쌓여 무늬가 서서히 어긋난다.
  return { geo: g, baseUv: uv.slice(), flow };
}

export const oceanFeature: Feature = {
  name: 'ocean',

  create(env: FeatureEnv): FeatureInstance | null {
    // 캔버스가 없는 환경(테스트·헤드리스 조립)에서는 켜지 않는다. 기능이 스스로 판단하고
    // 조립부는 물을 모른다 — `Feature.create`가 null을 돌려줄 수 있게 한 이유다.
    if (!env.doc) return null;

    // 세그먼트 1 — 물결은 정점이 아니라 법선으로 낸다. 정점을 쪼개면 삼각형만 늘고,
    // 실제 파도 진폭이 없는 지금은 보이는 차이가 0이다.
    const geo = new THREE.PlaneGeometry(PLANE, PLANE, 1, 1).rotateX(-Math.PI / 2);

    // 해저에 자갈을 깐다(감독 지시 2026-07-31). 단색 판이던 것이 이 텍스처 하나로
    // **물 아래 볼 것**이 된다 — 반투명이라는 성질이 비로소 뜻을 갖는다.
    const pebble = pebbleTexture();
    const bedMat = new THREE.MeshStandardMaterial({
      color: BED, roughness: 0.95, map: pebble,
    });
    const bed = new THREE.Mesh(geo, bedMat);
    bed.position.y = SEABED_Y;

    // ── 수면 구현 분기 (감독 지시 2026-08-01, 팀장 판정 B) ────────────────────
    // `?water=tsl` 이면 TSL 노드 물(`ocean-tsl.ts`)을 쓴다. 기본은 기존 물.
    // **요청이 곧 채택은 아니다** — 노드 재질은 WebGPU 전용이라 백엔드가 함께 정한다.
    // 왜 그런지(실측 스택 포함)는 `decide/water.ts` 의 `pickWaterMode` 한 곳에 있다.
    const waterMode: WaterMode = readEnum('water', 'std', WATER_MODES);
    const activeMode = pickWaterMode(waterMode, env.adapter.backend);
    const useTsl = activeMode === 'tsl';
    /**
     * 요청은 했는데 백엔드가 받쳐주지 않아 못 쓴 경우. **조용히 폴백하지 않는다.**
     *
     * 감독이 `?water=tsl` 을 열고 기존 물을 보면서 "새 물이 이 모양이냐" 고 판정하면
     * 비교 자체가 무효가 된다 — 이 저장소가 반복해서 데인 형태다(못 쓴 것이 통과로
     * 적히는 것). 진단으로 내보내고 콘솔에도 한 줄 남긴다.
     */
    const tslDenied = waterMode === 'tsl' && !useTsl;
    if (tslDenied) {
      console.warn(
        `[ocean] ?water=tsl 요청 — 그러나 백엔드가 ${env.adapter.backend} 라 기존 물로 폴백했다. `
        + '노드 재질은 WebGPU 에서만 컴파일된다.',
      );
    }

    // TSL 모드에서는 아래 텍스처 셋을 **굽지 않는다.** 노드 물은 절차적 노이즈로
    // 물결을 만들므로 쓰이지 않는데, 그냥 만들면 부팅에 수백 ms 를 버린다
    // (실측 근거: 노멀맵 512px 판본이 41ms → 454ms 였다).
    //
    // **셋을 한 덩어리로 묶는다.** 처음에는 각각 `null` 로 뒀는데, 그러면 소비 지점마다
    // 세 번 가드해야 하고 **실제로 빠뜨렸다** — `update()` 의 `normA.offset.set(...)`
    // 세 줄에 가드가 없어, TSL 모드를 켜면 첫 프레임부터 `null.offset` 예외가 매 프레임
    // 반복되고 `render()` 가 한 번도 안 불려 **화면이 통째로 멈춘다**(검수관 반려
    // 2026-08-02 B1). 앰비언트 `three/webgpu` 선언이 `any` 로 붕괴해 tsc 도 못 잡았다.
    //
    // 묶으면 "셋 중 하나만 null" 이라는 불가능한 상태가 타입에서 사라지고, 가드가
    // `if (tex)` 한 번으로 끝난다. 네 번째 텍스처가 생겨도 빠뜨릴 자리가 없다 —
    // 손으로 조립하지 않으면 틀릴 자리가 없다는 이 저장소의 규율 그대로다.
    const tex = useTsl ? null : {
      normA: waveNormalTexture(2.2),
      sparkle: sparkleTexture(),  // 흰 윤슬(감독 지시 2026-07-31)
      tint: waveTintTexture(),
    };

    const seaMat = new THREE.MeshStandardMaterial({
      color: WATER,
      map: tex?.tint ?? undefined,
      normalMap: tex?.normA ?? undefined,
      // ── 층이 둘인 것은 그대로다. 다만 **거칠기가 아니라 밝기로** 겹친다 ──────
      // 예전에는 두 번째 노멀맵을 `roughnessMap` 에 태워 "거칠기가 물결을 따라 변하는"
      // 층을 만들었다. 그것이 검은 줄기의 원인이었다(위 주석). 이제 `tint`(map)가
      // 노멀맵과 **다른 방향·속도로** 흐르며 두 번째 파동 노릇을 한다 — 간섭 무늬는
      // 남고, 거칠기는 어디서도 0 으로 떨어지지 않는다.
      //
      // 윤슬은 별도 발광맵으로 뺐다. 광원 의존이 아니게 됐지만, 대신 **실제로 보인다** —
      // 광원 의존이던 예전 판본은 실기기에서 반짝임이 0 이었다.
      emissive: 0xffffff,
      emissiveMap: tex?.sparkle ?? undefined,
      // ── 반짝임 세기 (감독 지적) ─────────────────────────────────────────
      // *"밤 강에서 반사가 어색하네. 밤인데 빛이 이렇게 많지 않잖아. 달빛이나 주변
      // 가로등."*
      //
      // 예전 값(normalScale 0.85 · roughness 0.28)은 **한낮 바다**의 것이었다. 거친
      // 물결 법선에 좁은 스페큘러가 얹혀, 수면 곳곳에 흰 덩어리가 떠 있었다.
      //
      // 두 축을 함께 내린다:
      //   · `normalScale` — 물결 기울기를 낮춰 빛이 튀는 각도 자체를 줄인다
      //   · `roughness`   — 하이라이트를 넓게 퍼뜨려 **덩어리 대신 은은한 띠**로 만든다
      //
      // 좁고 밝은 점을 그냥 어둡게만 하면 "약한 점"이 될 뿐 여전히 점이다. 달빛이
      // 물에 비치는 모습은 넓게 번지는 쪽이라, 퍼뜨리는 것이 세기를 줄이는 것보다
      // 중요하다.
      //
      // 시간대로 분기하지 않는다. 낮에도 이 정도가 과하지 않고, 분기를 넣으면
      // 바다가 하늘의 상태를 알아야 해서 기능 사이에 결합이 생긴다.
      // 광택은 **시간대가 정한다**(`decide/water.ts` 의 `waterGloss`). 여기서 값을
      // 다시 적지 않는다 — 예전에 밤을 위해 낮춘 전역값이 낮의 반짝임을 죽였고,
      // 그 값이 이 자리에 하드코딩돼 있었다(감독 지시 2026-07-31 "반짝임부터 살려봐").
      normalScale: new THREE.Vector2(1, 1),  // 아래 applyGloss 가 즉시 덮는다
      roughness: 0.5,                         // 〃
      metalness: 0.05,
      transparent: true,
      opacity: OPACITY,
      // 반투명 판이 깊이를 기록하면, 같은 물 위에 훗날 무엇을 띄우든 정렬이 꼬인다.
      depthWrite: false,
    });
    // 광택을 시간대에 맞춘다. 판정은 `waterGloss` 가 하고 여기는 집행만 한다 —
    // **경계를 건너는 지점**이라 통합 테스트로 따로 본다(`tests/world2-water-gloss.test.ts`).
    // 값이 재질에 실제로 닿는지는 순수 함수 테스트로는 알 수 없다.
    //
    // 노브는 **여기서 한 번만 읽는다**(`create` 시점). `applyGloss` 안에서 읽으면
    // 시간대가 바뀔 때마다 URL 을 다시 파싱하게 되고, 무엇보다 세션 중에 값이 달라질
    // 수 있는 것처럼 보인다 — URL 은 세션 내내 고정이므로 그 여지를 만들지 않는다.
    //
    // **가변이다**(감독 지시 "유아이 바를 만들어봐"). 처음에는 `const` 로 두고 부팅
    // 시점의 URL 만 읽었는데, 슬라이더가 생기면서 세션 중에 바뀔 수 있게 됐다.
    // `null` 은 여전히 "지정 안 됨" 이고 그때 시간대 값이 산다 — 되돌리기가 곧
    // `null` 대입이다.
    let nsKnob = readNumOpt(NS_KNOB, NS_MIN, NS_MAX);
    let roughKnob = readNumOpt(ROUGH_KNOB, ROUGH_MIN, ROUGH_MAX);
    let sparkKnob = readNumOpt(SPARK_KNOB, SPARK_MIN, SPARK_MAX);
    let opaKnob = readNumOpt(OPA_KNOB, OPA_MIN, OPA_MAX);
    /** 실제로 재질에 걸린 값. 진단이 이것을 내보낸다 — 화면만 보고는 무슨 값인지 모른다 */
    let glossNow = { normalScale: 0, roughness: 0, sparkle: 0, opacity: 0 };

    // TSL 물은 여기서 만든다 — `seaMat` 이 이미 있어야 `applyGloss` 가 그것을 건너뛸지
    // 판정할 수 있다. `three/tsl` 은 조립부가 아니라 여기서 받는다(`ocean-tsl.ts` 가
    // three 를 직접 import 하지 않게 하려는 것 — 그 파일 주석 참고).
    const tslWater: TslWaterHandle | null = useTsl
      ? createTslWater(THREE, TSL as unknown as TslNamespace)
      : null;

    // ── 두 번째 물결 층 (감독 지시 2026-08-03) ──────────────────────────────
    // 법선을 만드는 층이 하나뿐이라 무늬가 모양을 유지한 채 미끄러졌다. 같은 노말맵을
    // **다른 크기·다른 방향·다른 속도**로 한 겹 더 얹으면 두 법선이 겹쳐 간섭이 생긴다 —
    // 겹치는 자리가 계속 바뀌므로 무늬 모양 자체가 변한다.
    //
    // TSL 물에는 안 얹는다. 그쪽은 셰이더가 직접 파동을 만들므로 이 처방이 필요 없고,
    // 노드 재질에 `normalMap` 을 붙이는 경로도 다르다.
    const normB = tex ? tex.normA.clone() : null;
    if (normB) {
      // **텍스처 인스턴스는 별도지만 이미지는 공유한다** — `clone` 은 `image` 를 참조로
      // 넘긴다. 캔버스를 다시 굽지 않으므로 부팅 비용은 안 늘고, GPU 업로드만 하나 는다.
      // **첫 층에서 파생시킨다**(검수관 R-5). `(PLANE / RIPPLE_M)` 을 여기 다시 적으면
      // 같은 식이 네 번째가 되고, 첫 층 repeat 계산을 바꿨을 때 이 층만 남는다.
      normB.repeat.set(
        tex!.normA.repeat.x / LAYER2_SCALE,
        tex!.normA.repeat.y / LAYER2_SCALE,
      );
      normB.needsUpdate = true;
    }
    const layer2Mat = normB
      ? new THREE.MeshStandardMaterial({
        color: WATER,
        normalMap: normB,
        // 세기·거칠기는 아래 `applyGloss` 가 시간대에 맞춰 함께 건다. 여기서 값을
        // 적으면 시간대 분기가 이 층만 비껴간다.
        normalScale: new THREE.Vector2(1, 1),
        roughness: 0.5,
        metalness: 0.05,
        transparent: true,
        opacity: layerOpacity(OPACITY, WATER_LAYERS),  // applyGloss 가 즉시 덮는다
        // 아래 층과 같은 이유로 깊이를 안 쓴다. 더해서, 이 층은 **아래 층 바로 위**라
        // 깊이를 쓰면 z-fighting 이 난다.
        depthWrite: false,
      })
      : null;
    const applyGloss = (time: SkyTime): void => {
      // TSL 물은 PBR 파라미터가 없다. `normalScale`·`roughness` 는 `MeshStandardMaterial`
      // 의 축이고 노드 재질에는 대응물이 없다 — 여기서 시간대만 넘기고 끝낸다.
      // **슬라이더는 이 모드에서 무력하다.** 예전 주석은 "`attachKnobBar` 가 건너뛴다"
      // 고 적었는데 사실이 아니다 — 바는 그대로 붙고, 다만 `glossNow` 가 갱신되지 않아
      // 손잡이가 0 에 머문다(검수관 권고 4). 동작이 아니라 서술이 틀렸던 자리다.
      // 청산(팀장 조건 5) 때 이긴 쪽에 맞춰 정리한다.
      if (tslWater) { tslWater.setTime(time); return; }
      const g = waterGloss(time);
      // 노브가 지정됐으면 그것이, 아니면 시간대 값이 간다. `??` 라서 `0` 도 유효한
      // 지정으로 통과한다(`||` 였으면 `?wns=0` 이 조용히 무시된다 — 평평한 수면을
      // 보려는 시도가 바로 그 값이다).
      const ns = nsKnob ?? g.normalScale;
      const rough = roughKnob ?? g.roughness;
      const spark = sparkKnob ?? g.sparkle;
      seaMat.normalScale.set(ns, ns);
      seaMat.roughness = rough;
      // 흰 윤슬의 세기. `emissiveMap` 이 검은 바탕에 흰 점이므로 이 값은 **점만** 밝힌다.
      seaMat.emissiveIntensity = spark;
      // 불투명도는 시간대와 무관하다 — 물의 탁도는 하루 중 시각이 아니라 물 자체의
      // 성질이다. 그래서 노브가 없으면 상수(`OPACITY`)가 간다.
      const opa = opaKnob ?? OPACITY;
      // 두 번째 층이 있으면 **총량을 나눠 갖는다**(검수관 BR-2). 안 그러면 겹친 만큼
      // 물이 진해져 `WATER_DEPTH` 캘리브레이션이 무효가 된다 — 이 파일 주석이 이미
      // "값이 아니라 전제가 깨진 형태" 라고 이름 붙인 자리다.
      seaMat.opacity = layer2Mat ? layerOpacity(opa, WATER_LAYERS) : opa;
      seaMat.needsUpdate = true;
      // ── 두 번째 층도 같은 시간대를 따른다 ──────────────────────────────────
      // 안 걸면 밤에 아래 층만 잦아들고 위 층이 낮의 기울기로 남아, **밤에 물이 도로
      // 밝아진다** — 감독이 이미 한 번 지적한 축이다(*"밤인데 빛이 이렇게 많지 않잖아"*).
      // 불투명도는 이 층의 고유값을 지킨다(위 층은 법선을 겹치는 것이 일이고 물을 더
      // 진하게 만드는 것이 아니다). 그래서 `opa` 를 곱해 **아래 층에 비례**시킨다 —
      // 노브로 물을 투명하게 하면 위 층도 함께 옅어진다.
      if (layer2Mat) {
        layer2Mat.normalScale.set(ns, ns);
        layer2Mat.roughness = rough;
        // 위 층은 **고정**이고 아래 층이 총량을 맞춘다(`splitOpacity`). 예전에는 여기서
        // `opa` 에 비례시켰는데, 그러면 두 값이 함께 움직여 곱이 총량과 어긋난다.
        layer2Mat.opacity = layerOpacity(opa, WATER_LAYERS);
        layer2Mat.needsUpdate = true;
      }
      glossNow = { normalScale: ns, roughness: rough, sparkle: spark, opacity: opa };
    };
    let glossTime = env.time();
    applyGloss(glossTime);

    // 강 유속도 `readNumOpt` 로 통일한다. 기본값이 하나뿐이라 `readNum` 으로도 값은
    // 맞지만, 그러면 **"지정 안 됨" 을 알 수 없다** — 슬라이더가 "이건 내가 잡은 값"
    // 을 표시해야 하는데 세 노브 중 하나만 그것을 모르는 상태가 된다.
    let flowKnob = readNumOpt(FLOW_KNOB, FLOW_MIN, FLOW_MAX);
    const flowMps = (): number => flowKnob ?? RIVER_FLOW_MPS;

    // ── 화면 슬라이더 (감독 지시 2026-07-31 "유아이 바를 만들어봐") ──────────
    // 노브 정의는 **여기 하나뿐**이다. `knob-bar.ts` 는 키도 범위도 모르고 행을 그리는
    // 일만 한다 — 정의를 UI 쪽에도 적으면 그것이 곧 값 미러링이다.
    //
    // 슬라이더를 밀면 **주소도 갱신한다**(`writeNumOpt`). 그래야 감독이 찾은 값이 화면
    // 안에 갇히지 않는다 — 주소를 그대로 보내면 값이 전달되고, 사람이 숫자를 옮겨 적는
    // 구간이 사라진다(이 프로젝트가 오늘 relay 훼손으로 데인 자리다).
    //
    // `value()` 는 슬라이더가 아니라 **재질에 실제로 걸린 값**(`glossNow`)을 읽는다.
    // 요청이 아니라 반영된 상태를 표시한다는 뜻이고, `sky-panel.ts` 가 `get()` 을 다시
    // 읽는 것과 같은 이유다.
    const barParts = env.doc ? findKnobBar(env.doc) : null;
    const knobBar = barParts ? attachKnobBar(barParts, [
      {
        key: NS_KNOB, label: '물결', min: NS_MIN, max: NS_MAX, step: NS_STEP,
        value: () => glossNow.normalScale,
        overridden: () => nsKnob !== null,
        set(v) { nsKnob = v; writeNumOpt(NS_KNOB, v); applyGloss(glossTime); },
        reset() { nsKnob = null; writeNumOpt(NS_KNOB, null); applyGloss(glossTime); },
      },
      {
        key: ROUGH_KNOB, label: '거칠기', min: ROUGH_MIN, max: ROUGH_MAX, step: ROUGH_STEP,
        value: () => glossNow.roughness,
        overridden: () => roughKnob !== null,
        set(v) { roughKnob = v; writeNumOpt(ROUGH_KNOB, v); applyGloss(glossTime); },
        reset() { roughKnob = null; writeNumOpt(ROUGH_KNOB, null); applyGloss(glossTime); },
      },
      {
        key: SPARK_KNOB, label: '반짝임', min: SPARK_MIN, max: SPARK_MAX, step: SPARK_STEP,
        value: () => glossNow.sparkle,
        overridden: () => sparkKnob !== null,
        set(v) { sparkKnob = v; writeNumOpt(SPARK_KNOB, v); applyGloss(glossTime); },
        reset() { sparkKnob = null; writeNumOpt(SPARK_KNOB, null); applyGloss(glossTime); },
      },
      {
        key: OPA_KNOB, label: '투명도', min: OPA_MIN, max: OPA_MAX, step: OPA_STEP,
        // 슬라이더를 오른쪽으로 밀수록 **물이 진해진다**(자갈이 덜 비친다).
        // 라벨과 방향이 반대로 느껴질 수 있지만, 재질 값(`opacity`)을 그대로 보여주는
        // 것이 진단·주소와 어긋나지 않는 유일한 방법이다.
        value: () => glossNow.opacity,
        overridden: () => opaKnob !== null,
        set(v) { opaKnob = v; writeNumOpt(OPA_KNOB, v); applyGloss(glossTime); },
        reset() { opaKnob = null; writeNumOpt(OPA_KNOB, null); applyGloss(glossTime); },
      },
      {
        key: FLOW_KNOB, label: '유속', min: FLOW_MIN, max: FLOW_MAX, step: FLOW_STEP,
        // 유속은 재질이 아니라 매 프레임 UV 계산에 쓰인다 — 되읽을 "걸린 값"이 따로
        // 없으므로 소비처와 같은 함수를 쓴다.
        value: flowMps,
        overridden: () => flowKnob !== null,
        set(v) { flowKnob = v; writeNumOpt(FLOW_KNOB, v); },
        reset() { flowKnob = null; writeNumOpt(FLOW_KNOB, null); },
      },
    ]) : null;

    // 수면 재질 — TSL 모드면 노드 재질, 아니면 기존 PBR. **두 메시가 같은 것을 쓴다**
    // (강과 바다는 같은 물이다 — 높이만 다르고 `waterSurfaceY` 가 그것을 판정한다).
    const surfaceMat = tslWater ? tslWater.material : seaMat;
    const sea = new THREE.Mesh(geo, surfaceMat);
    sea.position.y = SEA_Y;
    // 해저보다 늦게 그려야 그 위에 비친다.
    sea.renderOrder = 1;

    const sea2 = layer2Mat ? new THREE.Mesh(geo, layer2Mat) : null;
    if (sea2) {
      // ⚠ 여기 *"같은 높이면 z-fighting 이다"* 라고 적혀 있었다. **틀린 이유다**
      // (검수관 R-4) — 두 재질 모두 `depthWrite: false` 라 깊이 버퍼에 안 쓰이고,
      // 그러면 z-fighting 이 성립하지 않는다. 순서를 정하는 것은 `renderOrder` 다.
      // 1cm 는 물속에서 올려다볼 때 두 면이 정확히 겹쳐 보이지 않게 하는 몫으로만 둔다.
      sea2.position.y = SEA_Y + 0.01;
      // ── 렌더 순서는 **물리적 높이 순서**여야 한다 (검수관 BR-1) ──────────────
      // 처음엔 `sea 1 · river 2 · sea2 3 · river2 4` 로 줬다. 그러면 −0.99m 의 sea2 가
      // −0.50m 의 river **위에** 덧칠된다 — 깊이를 안 쓰므로 그리는 순서가 곧 겹치는
      // 순서이고, 강 파셀 구멍에서는 두 판이 함께 보인다. 강은 스폰 앞이라 감독 눈에
      // 가장 자주 드는 물이다.
      sea2.renderOrder = 2;
    }

    // ── 강 판 (감독 지시 2026-07-30) ────────────────────────────────────────
    // *"강은 땅보다 50 cm 밑, 바다는 땅보다 1미터 밑에 있게해."*
    //
    // 두 높이를 요구하므로 판이 하나일 수 없다. **재질은 바다와 공유한다** — 같은
    // 물이고, 재질을 따로 만들면 물빛·윤슬·불투명도가 두 곳에 적히는 미러링이 된다.
    //
    // ── 지오는 공유하지 않는다 (검수관 블로커) ──────────────────────────────
    // 처음에는 지오도 공유했다(둘 다 세계보다 큰 `PLANE` 판). 그러면 **강이 보이는 모든
    // 곳에서 두 판이 겹쳐 그려진다** — 격자 안에서 물인 곳은 강뿐이므로 "겹치는 구역"이
    // 국지적인 게 아니라 물이 보이는 전 구간이 그 상태였다.
    //
    // 반투명 두 장이 겹치면 실효 불투명도가 `1 − (1 − 0.7)² = 0.91` 로 올라간다.
    // `WATER_DEPTH` 는 **단일 반투명 층**을 전제로 고른 값이므로(물가에서 바닥이 어렴풋이
    // 비치는 깊이) 그 캘리브레이션이 무효가 된다. 값이 아니라 전제가 깨진 형태다.
    //
    // 그래서 강 판을 **물 파셀 위에만** 깐다. `parcelWater` 가 'water' 로 분류한 칸에
    // 정확히 그 칸 크기의 쿼드를 놓는다 — 판정과 렌더가 **같은 해상도**를 쓰므로 틈도
    // 초과도 없다. 강 폭에 맞춰 리본을 그리는 방법도 있지만, 그러면 판정(파셀 단위)과
    // 렌더(미터 단위)의 해상도가 달라 강 가장자리에 바다가 비치는 띠가 생긴다.
    //
    // 강 모양을 이 파일이 정하지는 않는다 — `decide/water.ts` 에 묻는다. 판정이 강 경로를
    // 바꾸면 이 지오가 따라온다(이 파일 머리말이 지키려는 성질 그대로다).
    //
    // 강이 바다보다 위에 있으므로 더 늦게 그린다. 하구에는 50cm 단차가 생기는데 1차는
    // 그대로 둔다(팀장 판정: *"감독은 폭포를 지시하지 않았다 — 지시 안 한 연출을 추측으로
    // 메우지 않는다"*). 안개가 60.8m 에서 덮으므로 멀리서는 보이지 않는다.
    const { geo: riverGeo, baseUv: riverBaseUv, flow: riverFlow } = riverGeometry();
    const river = new THREE.Mesh(riverGeo, surfaceMat);
    // 매 프레임 쓸 UV 속성을 붙잡아 둔다 — `getAttribute` 를 프레임마다 부르면
    // 문자열 조회가 반복된다(작지만, 이 루프는 초당 60번 돈다).
    const riverUvAttr = riverGeo.getAttribute('uv');
    // 물결 변위가 쓸 정점 배열. UV 와 같은 이유로 프레임마다 `getAttribute` 를 안 부른다.
    const riverPosAttr = riverGeo.getAttribute('position');
    river.position.y = RIVER_Y;
    river.renderOrder = 3;  // sea(1) → sea2(2) → river(3) → river2(4): 높이 순서 그대로

    // 강에도 같은 두 번째 층을 얹는다 — **재질과 지오를 그대로 공유**하므로 개수는
    // 드로우콜 하나만 는다. 강이 감독 눈에 가장 자주 드는 물이라(스폰 앞) 여기가 빠지면
    // 처방이 반쪽이 된다.
    const river2 = layer2Mat ? new THREE.Mesh(riverGeo, layer2Mat) : null;
    if (river2) {
      river2.position.y = RIVER_Y + 0.01;
      river2.renderOrder = 4;  // 가장 위(−0.49m)라 마지막
    }

    for (const m of [bed, sea, river, sea2, river2].filter((x): x is THREE.Mesh => !!x)) {
      m.castShadow = false;
      m.receiveShadow = false;
      // 프러스텀 컬링을 끈다. 판이 워낙 커서 바운딩 스피어 중심(원점)이 시야 밖으로
      // 나가는 각도에서 통째로 사라질 수 있다 — 그 순간 세계 바닥에 구멍이 뚫린 것처럼 보인다.
      m.frustumCulled = false;
      env.scene.add(m);
    }
    bed.name = 'seabed';
    sea.name = 'ocean';
    river.name = 'river';
    // 두 번째 물결 층. **이름을 안 주면 개수 검사가 빈 문자열로 잡는다** — 실제로
    // 그렇게 잡혔고, 그 덕에 예산이 늘어난 것을 놓치지 않았다.
    if (sea2) sea2.name = 'ocean-wave2';
    if (river2) river2.name = 'river-wave2';

    let t = 0;

    return {
      system: {
        name: 'ocean',
        update(ctx) {
          t += ctx.dt;

          // ── 시간대가 바뀌면 광택을 다시 건다 ──────────────────────────────
          // **바뀔 때만** 건다. 매 프레임 대입하면 three 가 유니폼을 계속 갱신하고,
          // 무엇보다 "왜 바뀌었나" 를 리포트에서 추적할 수 없다.
          const now = env.time();
          if (now !== glossTime) {
            glossTime = now;
            applyGloss(now);
            // 슬라이더 표시도 다시 맞춘다. **지정하지 않은 노브의 기본값이 통째로
            // 바뀌는 순간**이라(낮 .9 → 밤 .35), 안 맞추면 손잡이가 옛 값에 남는다.
            knobBar?.sync();
          }
          // UV 단위로 환산해서 흘린다. 한 무늬가 RIPPLE_M 미터를 덮으므로
          // `초당 미터 / RIPPLE_M`이 초당 UV 이동량이다 — 화면 속도가 실제 m/s와 맞는다.
          //
          // TSL 물에는 이 텍스처들이 아예 없다(`tex === null`). **가드가 여기 있어야
          // 한다** — 매 프레임 도는 자리라 빠지면 예외가 초당 60번 쌓이고 렌더가 멈춘다.
          const a = t / RIPPLE_M;
          if (tex) {
            tex.normA.offset.set(FLOW_A.x * a, FLOW_A.z * a);
            // ── 층 둘이 서로 어긋나게 흐른다 ──────────────────────────────────
            // 예전에는 `tint` 를 노멀맵에 **붙여** 같이 흘리고(`copy`), 두 번째 층을
            // `roughnessMap` 에 태웠다. 그 슬롯이 검은 줄기의 원인이라 비웠으므로
            // (위 슬롯 주석) 두 번째 파동 노릇을 `tint` 가 이어받는다.
            //
            // **서로 다른 방향·속도라야 한다.** 같이 흐르면 두 무늬가 한 덩어리로
            // 미끄러져 "흐르는 벽지" 가 되고, 어긋나면 겹치는 자리가 계속 바뀌어 물이
            // 살아 있는 것처럼 보인다.
            tex.tint.offset.set(FLOW_B.x * a, FLOW_B.z * a);
            // 윤슬은 또 다른 속도로 흘린다 — 물결과 어긋나야 점이 **명멸**한다.
            // 물결에 붙여 두면 점이 무늬에 박혀 같이 미끄러질 뿐 반짝이지 않는다.
            tex.sparkle.offset.set(FLOW_A.x * a * 0.6, FLOW_A.z * a * 0.6);
          }
          // ── 두 번째 물결 층 (감독 지시 2026-08-03) ────────────────────────
          // 방향은 황금각만큼 돌아가 있고 속도는 황금비의 역수다. **어느 것도 첫 층과
          // 정수비가 아니라서** 두 층이 정렬되는 순간이 없다 — 간섭이 끊기지 않는다.
          // 스케일이 다르므로 UV 환산도 그만큼 나눠야 화면 속도가 맞다.
          if (normB) {
            // 월드 속도를 UV 로 환산한다 — 무늬 한 장이 `RIPPLE_M × LAYER2_SCALE`
            // 미터를 덮으므로 그것으로 나눈다. 이러면 상수가 뜻하는 것과 화면에서
            // 보이는 것이 같아진다(검수관 R-3: 예전 식은 두 배수가 상쇄돼 UV 속도가
            // 첫 층과 **정확히 같았다** — 이름과 코드가 다른 것을 말했다).
            const b = (t * LAYER2_WORLD_SPEED) / (RIPPLE_M * LAYER2_SCALE);
            normB.offset.set(FLOW_C.x * b, FLOW_C.z * b);
          }

          // ── 강만 제 방향으로 흐른다 (감독 지시 "물살로 보이고") ──────────────
          // 위 `offset` 은 텍스처 하나에 걸리므로 **씬 전체가 한 방향**이다. 바다는
          // 방향이 없으니 그것으로 족하지만, 강은 굽이를 따라 흘러야 강으로 읽힌다.
          // 그래서 강만 **UV 를 정점별로** 민다 — 정점마다 접선이 다르고 래스터라이저가
          // 그 사이를 보간하므로, 파셀(32m) 해상도의 flow map 이 공짜로 생긴다.
          //
          // **기준 UV 에서 매번 다시 계산한다**(누적하지 않는다). 누적하면 부동소수
          // 오차가 쌓여 무늬가 서서히 어긋나고, 그 어긋남은 오래 봐야 보여서 잡기 어렵다.
          //
          // ── 되감지 않는다 (감독 실기기 실증 2026-07-31) ─────────────────────
          // 감독: *"심리스가 아니여서 이동하다가 끊기네."*
          //
          // 예전에는 `% RIPPLE_M` 으로 타일 하나마다 되감았고, 주석은 *"흐름 벡터가 전부
          // 단위벡터라 모든 정점이 같은 순간에 되감기고 무늬가 주기 경계에서 정확히
          // 겹친다"* 고 적었다. **틀렸다.**
          //
          // 같은 순간에 되감기는 것은 맞다. 그러나 되감긴 **위치**가 타일 격자와 안 맞는다 —
          // UV 이동량은 `riverFlow × phase` 인데 흐름이 단위벡터라 성분이 `|fx| < 1` 이다.
          // `phase` 가 한 타일을 채웠을 때 실제 u 이동량은 `fx × 한 타일` 이라 **타일 주기의
          // 정수배가 아니다.** 그래서 되감는 순간 무늬가 튄다.
          //
          // 게다가 `fx` 는 **정점마다 다르다**(굽이를 따라 접선이 달라지므로). 튀는 양이
          // 정점마다 달라 파셀 경계에서 무늬가 찢어진다 — 그것이 화면에서 "끊김" 으로 보였다.
          //
          // 그냥 안 되감으면 된다. 텍스처가 `RepeatWrapping` 이라 UV 가 1을 넘어도 이어지고,
          // 되감기가 없으면 어긋날 순간도 없다. float32 정밀도가 걱정이지만 실측 범위에서
          // 문제되지 않는다 — 10시간을 흘려도 `phase` 는 수십 수준이다.
          const phase = (t * flowMps()) / PLANE;
          const uvArr = riverUvAttr.array as Float32Array;
          for (let i = 0; i < uvArr.length; i += 2) {
            uvArr[i]     = riverBaseUv[i]     + riverFlow[i]     * phase;
            uvArr[i + 1] = riverBaseUv[i + 1] + riverFlow[i + 1] * phase;
          }
          riverUvAttr.needsUpdate = true;

          // ── 수면을 실제로 올린다 (감독 지시 2026-08-03) ────────────────────
          // 위 UV 이동은 무늬를 **흘려보낼** 뿐이고 판은 평평하다. 감독 판정
          // *"물이 일렁인다는 느낌이 없네"* 가 그 사실을 정확히 짚었다.
          //
          // `x`·`z` 는 안 건드리고 **y 만** 덮어쓴다. `surfaceLift` 가 월드 좌표만의
          // 함수라 파셀 경계에서 이웃 쿼드와 같은 값이 나오고, 그래서 정점이 갈려 있어도
          // 틈이 안 생긴다(강 판은 파셀마다 독립 정점을 쓴다).
          //
          // `RIVER_SEG === 1` 이면 네 귀퉁이뿐이라 의미가 없다 — 되돌리기 스위치가
          // 여기서도 성립하게 통째로 건너뛴다(불필요한 버퍼 업로드도 안 난다).
          if (RIVER_SEG > 1 && LIFT_AMP > 0) {
            const p = riverPosAttr.array as Float32Array;
            for (let i = 0; i < p.length; i += 3) p[i + 1] = surfaceLift(p[i], p[i + 2], t);
            riverPosAttr.needsUpdate = true;
          }
        },
      },

      diagnostics() {
        const { x, z } = env.player.position;
        return {
          // 높이가 둘로 갈렸으므로 둘 다 보고한다. 하나만 내보내면 "어느 판을 본
          // 것인지" 를 밖에서 구별할 수 없다.
          y: SEA_Y,
          riverY: RIVER_Y,
          depth: `${WATER_DEPTH.toFixed(1)}m`,
          riverDepth: `${(RIVER_Y - SEABED_Y).toFixed(1)}m`,
          // 강 판이 덮은 파셀 수. **0 이면 강이 아예 안 보인다** — 판정이 강을 옮겼거나
          // 격자 순회가 어긋나면 조용히 빈 지오가 되고, 화면에는 "바다만 보이는 강"으로
          // 나타난다. 에러도 경고도 없으므로 셀 수 있게 내보낸다.
          riverParcels: riverGeo.index ? riverGeo.index.count / 6 : 0,
          // 세계의 끝에 얼마나 가까운지. 격자가 사각형이므로 **가장 가까운 변**까지의
          // 거리다 — 원형이던 시절의 `반경 − 중심거리` 를 그대로 두면 모서리 근처에서
          // 음수가 나와 "밖에 있다"고 잘못 읽힌다.
          fromEdge: `${(EDGE - Math.max(Math.abs(x), Math.abs(z))).toFixed(0)}m`,

          // ── 물결이 실제로 흐르는가 ─────────────────────────────────────────
          // 감독이 요구한 것은 "살랑살랑"이고, 그 정체는 이 두 offset 이 매 프레임
          // 움직이는 것이다. 그런데 헤드리스에서 그것을 확인할 길이 없어 스모크가
          // 두 번 연속 "측정 불가"로 남겼다 — 검증기의 잘못이 아니라 측정 지점을
          // 안 만들어 둔 잘못이다(이 파일 위쪽 진단 훅 주석이 같은 말을 한다).
          //
          // **텍스처에서 직접 읽는다.** `t`나 `FLOW_A * a` 를 되돌려주면 "계산은
          // 했는데 텍스처에 안 꽂혔다"를 못 잡는다 — 구름 `alpha` 미소비가 정확히
          // 그 형태였고, 판정과 집행 사이의 그 구멍이 이 프로젝트의 상시 위험이다.
          //
          // 두 층을 다 내보내는 이유: 하나만 보면 "둘이 같은 방향으로 흐르는"
          // 결함(= 흐르는 벽지)을 밖에서 판별할 수 없다.
          //
          // **TSL 모드에서는 `null` 이다.** 노드 물에는 이 텍스처들이 아예 없다(굽지도
          // 않는다). 0 이나 `[0,0]` 으로 채우면 "흐르지 않는 물"과 구별되지 않으므로,
          // 없는 것은 없다고 적는다 — 못 잰 것을 통과로 적지 않는다는 규율 그대로다.
          flowA: tex ? [tex.normA.offset.x, tex.normA.offset.y] : null,
          flowB: tex ? [tex.tint.offset.x, tex.tint.offset.y] : null,
          // 윤슬 층도 따로 본다. 이 값이 안 움직이면 점이 무늬에 박혀 명멸하지 않는다 —
          // 화면에서는 "반짝임이 없다" 가 아니라 "반짝임이 밋밋하다" 로 보여서 알기 어렵다.
          flowSparkle: tex ? [tex.sparkle.offset.x, tex.sparkle.offset.y] : null,

          // ── 어느 물이 실제로 걸렸는가 ──────────────────────────────────────
          // `requested` 와 `active` 를 **따로** 내보낸다. 하나만 보면 "TSL 을 요청했고
          // TSL 이 떴다" 와 "TSL 을 요청했지만 폴백했다" 가 구별되지 않는다. 폴백은
          // 정상 동작이지만 **비교 판정을 무효화하는** 상태라 셀 수 있어야 한다.
          water: {
            requested: waterMode,
            active: activeMode,
            backend: env.adapter.backend,
            denied: tslDenied,
          },

          // ── 지금 걸려 있는 값 (감독 지시 "URL로 값 조절할 수 있게 열어둬") ────
          // 노브를 열면 **화면만 보고는 무슨 값을 보고 있는지 알 수 없다.** 감독이
          // `?wns=` 를 여러 번 바꿔가며 고르는 동안 "지금 얼마인가" 를 되돌려주지
          // 않으면, 좋았던 값을 나중에 재현할 수 없다.
          //
          // `waterGloss(시간대)` 를 다시 계산해 적지 않는다 — **재질에 실제로 대입된
          // 값**을 그대로 내보낸다. 다시 계산하면 노브가 무시된 결함을 진단이 덮는다.
          gloss: glossNow,
          // 노브가 걸렸는지 자체도 내보낸다. 값만 보면 "기본값과 같은 값을 지정한 것"
          // 과 "지정 안 한 것" 이 구별되지 않고, 그것이 `readNumOpt` 를 만든 이유다.
          glossKnob: { ns: nsKnob, rough: roughKnob, flow: flowKnob, opa: opaKnob },
          flowMps: flowMps(),
        };
      },

      dispose() {
        // 슬라이더 행과 리스너를 먼저 뗀다. 남겨 두면 해제된 재질을 만지는 핸들러가
        // 문서에 살아 있게 된다.
        knobBar?.dispose();
        // 세 판을 다 뗀다. `river` 가 빠져 있었다 — 판을 늘리면서 이 목록을 안 늘렸고,
        // 씬에 남은 메시는 재질이 해제된 뒤에도 렌더 목록에 올라 있다.
        env.scene.remove(bed);
        env.scene.remove(sea);
        env.scene.remove(river);
        // 두 번째 물결 층. **빠뜨리면 씬에 남아 누수가 된다** — 이 저장소가 하늘 돔에서
        // 한 번 겪은 형태다(#143). 지오는 위 둘과 공유하므로 여기서 dispose 하지 않는다.
        if (sea2) env.scene.remove(sea2);
        if (river2) env.scene.remove(river2);
        layer2Mat?.dispose();
        normB?.dispose();
        geo.dispose();
        riverGeo.dispose(); // 강은 자기 지오를 갖는다(파셀 단위 쿼드 묶음)
        bedMat.dispose();
        pebble.dispose();
        seaMat.dispose();
        tslWater?.dispose();
        // TSL 모드에서는 이 셋이 없다. 가드가 없으면 정리 도중 예외가 나고, 그 뒤의
        // 정리가 통째로 중단된다(`main.ts` 의 try/catch 가 삼켜서 조용히 샌다).
        if (tex) {
          tex.normA.dispose();
          tex.sparkle.dispose();
          tex.tint.dispose();
        }
      },
    };
  },
};
