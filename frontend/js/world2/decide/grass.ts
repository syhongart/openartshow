// world2/decide/grass.ts — 잔디 필드의 **판정**. 순수 함수만, three 무의존.
//
// ── 왜 필요한가 (감독 지시 2026-08-18) ──────────────────────────────────────
// 감독이 모바일 게임 광고(Archery Clash) 화면을 참조로 주면서 *"사실적 PBR 이 아니라
// stylized game rendering"* 을 요구했다. 지금 world2 의 잔디는 파셀을 통째로 덮는
// **평면 한 장**이고(`parts/garden.ts`), 그 위에 캔버스로 그은 짧은 선이 결을 흉내낸다.
// 위에서 내려다보면 그럴듯하지만 눈높이에서는 바닥이 그냥 초록 종이다.
//
// ── 왜 파츠(`parts/grass.ts`)가 아니라 별도 기능인가 (설계 판정 2026-08-18) ──
// 파츠로 등록하면 인스턴싱·LOD·페이드·스트리밍을 공짜로 얻는다. 그런데 넷이 걸린다:
//   ① 스트리밍 예산이 블레이드 수를 모른다 — `systems/parcel-builder.ts` 의
//      `costOf(tier) = kindsFor(tier).length * 0.4` 는 **종류 수**만 센다. 파셀당 수천
//      인스턴스가 비용 0 으로 잡히고, 그 초과가 곧 파셀 로드 히칭이다.
//   ② `asset(T)` 가 백엔드를 모른다 — 파츠 자산은 `pools` 단계에서 만들어지는데 그때
//      백엔드를 전달할 통로가 없다. 바람은 WebGPU 에서만 되므로(아래 `pickGrassWind`)
//      재질을 고를 수 없고, 잘못 고르면 **화면 전체가 안 뜬다**.
//   ③ 배치 골든이 폭발한다 — `parcelLayout` 이 블레이드마다 `PlacedPart` 를 내면
//      골든 대상이 36,459 에서 수백만이 되고, 그 골든은 그 뒤로 안전망 노릇을 못 한다.
//   ④ 편집 픽킹·파셀 상한 UI 가 블레이드를 집는 대상으로 만든다.
// 그래서 `features/ocean.ts` 가 세운 전례 — **기능이 자기 메시를 소유한다** — 를 따른다.
//
// ── 개수 불변식과의 관계 ────────────────────────────────────────────────────
// 여기 있는 어떤 함수도 «몇 개를 만드는가» 를 세션 중에 바꾸지 않는다. 버퍼는 부팅에
// `MAX_BLADES` 로 한 번 잡고, 밀도 노브는 **활성 개수만** 줄인다(나머지는 0 스케일 —
// `systems/instancing.ts` 가 미사용 슬롯에 쓰는 것과 같은 어휘다). 버퍼 크기가 세션 중
// 변하면 그 순간 `[7]` 개수 불변식이 깨진다.

import { surfaceY } from '../parts/surface.js';
import { GARDEN_SURFACE_Y } from '../parts/garden.js';
import { ROAD_SURFACE_Y } from '../parts/road.js';
import { roadDirs, onRoad, ROAD_HALF } from '../parts/road-topology.js';
import { parcelWater } from './water.js';

// ── 바람: 백엔드 화이트리스트 ───────────────────────────────────────────────
//
// `decide/water.ts` 의 `pickWaterMode` 와 **같은 모양이고 같은 이유**다. world2 의 WebGL
// 경로는 `WebGPURenderer({forceWebGL})` 가 아니라 **레거시 `WebGLRenderer`**
// (`adapters/renderer.ts` 의 `new WebGLRenderer(...)`)라서, 노드 재질(TSL)에 렌더 경로가
// 아예 없다. 그쪽에 노드 재질을 물리면 `resolveIncludes ← WebGLProgram` 스택으로 죽고
// 화면이 통째로 비는데, 그 실패를 **헤드리스(swiftshader=WebGL)가 재현하지 못한다** —
// 감독 실기기(WebGPU)에서만 보이는 사고가 이 저장소에서 이미 났다.
//
// 그래서 화이트리스트다. 「아는 조합만 켠다」는 모르는 조합에서 **안 켜지는** 쪽으로
// 실패하고, 블랙리스트는 **켜지는** 쪽으로 실패한다.
export const GRASS_WIND_MODES = ['off', 'tsl'] as const;
export type GrassWindMode = (typeof GRASS_WIND_MODES)[number];

/**
 * 이 백엔드에서 실제로 켤 바람 모드.
 *
 * `backend` 는 `RendererAdapter.backend` 의 문자열을 그대로 받는다 — 타입을 import 하면
 * `decide/` 가 어댑터(그리고 전이로 three)에 묶인다.
 *
 * ⚠ 폴백은 **조용하면 안 된다.** 호출부가 `off` 를 받으면 `console.warn` 과 진단에
 * 남긴다(`features/grass.ts`). 감독이 바람 없는 화면을 보고 *"이게 최선이냐"* 로 룩을
 * 판정하는 것이 이 노브를 연 목적을 통째로 무효화한다.
 */
export function pickGrassWind(requested: GrassWindMode, backend: string): GrassWindMode {
  if (requested !== 'tsl') return 'off';
  return backend === 'WebGPU' ? 'tsl' : 'off';
}

// ── 필드 치수 ───────────────────────────────────────────────────────────────

// ── 3중 링 — 육지 전체를 덮되 멀수록 성기게 (감독 판정 2026-08-18) ──────────
//
// 감독: *"내가 이동하면 잔디가 앞에 생성되는게 어색해. lod생성 육지. 건물 있는곳은 다
// 생성되어야지."*
//
// 첫 판본은 **플레이어 중심 반경 24m 원 하나**였다. 그 경계가 시야 안(24m)에 들어오므로
// 걸으면 경계선이 함께 따라오고, 그것이 «앞에서 생겨난다» 로 보인다. 균일 분포라
// 「가까이는 빽빽, 멀리는 성기게」도 표현할 수 없었다 — 밀도를 올리면 먼 곳까지 같이
// 올라가 개수만 폭발한다.
//
// 그래서 인스턴스를 **세 링으로 쪼갠다.** 각 링이 자기 타일에서 따로 토러스 랩을 돌고,
// 반경이 커질수록 밀도를 낮추고 잎을 키운다. 효과 셋:
//   ⓐ **거리 LOD 가 공짜로 나온다** — 근거리는 빽빽하고 원거리는 성기다.
//   ⓑ **경계가 안 보인다** — 가장 먼 링(70m)이 안개 시작(`FOG_NEAR_CELLS × cell` = 51.2m)
//      **바깥**이라 그 경계는 안개에 묻힌다. 안쪽 두 링의 경계는 바깥 링이 메운다.
//   ⓒ 같은 개수로 **훨씬 넓은 땅**을 덮는다. 24m 원 → 70m 원은 면적이 8.5배다.
//
// ⚠ 반경을 하나로 키우는 안을 버린 이유: 밀도를 유지한 채 70m 로 키우면
// `(140)² × 16 = 313,600` 이다. 링으로 나누면 6.5만으로 같은 범위를 덮는다.

/** 링 하나. `scale` 은 잎 크기 배수 — 멀수록 키워야 성겨진 것이 덜 티 난다 */
export interface GrassRing {
  readonly radius: number;
  readonly density: number;
  readonly scale: number;
}

/**
 * 링 셋. **안쪽부터 바깥으로.** 밀도 합이 아니라 «그 반경 안의 밀도» 다 — 링이 겹치므로
 * 근거리의 실효 밀도는 세 링의 합(28+5+1 = 34/m²)이다.
 *
 * 70m 의 근거: 안개가 51.2m 에서 시작해 `FOG_FAR` 까지 걸린다. 그 안쪽에서 링이 끝나면
 * 경계가 맨눈에 보이므로, **안개가 이미 먹은 자리**에서 끝나야 한다.
 */
export const GRASS_RINGS: readonly GrassRing[] = [
  { radius: 14, density: 28, scale: 1.00 },
  { radius: 34, density: 5, scale: 1.35 },
  { radius: 70, density: 1.0, scale: 1.90 },
];

/** 반경 배수 노브(`?grad`)의 범위. 1 이 위 표 그대로다 */
export const GRASS_RADIUS_MUL_MIN = 0.4;
export const GRASS_RADIUS_MUL_MAX = 1.6;

/**
 * 기본 밀도(포기/m²). 게임풍은 밀도가 인상을 만든다 — 성기면 즉시 «잔디 몇 개» 로 보인다.
 *
 * **8 → 16 (감독 실기기 2026-08-18 *"더 빽빽히"*).** 8 은 한 포기 사이가 35cm 라 잎
 * 하나하나가 따로 보였다. 16 이면 25cm 이고 잎 폭(13cm)의 두 배 안쪽이라 **뭉텅이로**
 * 읽힌다 — 참조 화면(Archery Clash)이 그 상태다.
 *
 * 드로우콜은 안 변한다(인스턴싱 하나). 늘어나는 것은 삼각형 수(포기당 6)와 정점 셰이더
 * 호출이고, 바람이 정점 셰이더에서 도므로 그쪽이 실질 비용이다.
 */
export const GRASS_DENSITY = 16;

/**
 * 인스턴스 버퍼 상한. **부팅에 이 크기로 한 번 잡고 세션 내내 안 바꾼다.**
 *
 * 60,000 의 근거: 기본값(R=24·d=16)이 쓰는 것은 정사각 타일 `(2R)² × d = 36,864` 이고,
 * 밀도 노브를 1.6배까지 올려도 담긴다. 그 위(또는 반경 최대 52)에서는 상한에 눌려
 * **밀도가 자동으로 묽어진다** — 버퍼를 더 늘리는 대신 묽어지는 쪽을 고른 이유는 ⓐ 버퍼
 * 크기가 노브에 따라 변하면 개수 불변식의 baseline 이 노브마다 달라지고 ⓑ 안 쓰는 슬롯도
 * **정점 셰이더는 돈다**(0 스케일이라 래스터라이즈만 빠진다)는 것이다.
 * ⚠ 밀도를 8 → 16 으로 올리며 40,000 → 60,000 으로 함께 키웠다(감독 *"더 빽빽히"*).
 * 둘은 짝이다 — 밀도만 올리면 상한에 눌려 실제로는 안 빽빽해진다.
 */
export const MAX_BLADES = 72000;

// ── 풀잎 실루엣 (감독 실기기 판정 2026-08-18 *"지금 뾰족가시같아"*) ──────────
//
// 첫 판본은 높이 0.34m · 폭 0.055m 로 **6:1** 이었고 끝 반폭이 0.06(밑동의 12%)까지
// 좁아졌다. 화면에서 그것은 잎이 아니라 **가시**로 읽힌다.
//
// 참조 화면(Archery Clash)의 잔디는 개별 잎이 잘 안 보일 만큼 **넓적하고 뭉툭**하다.
// 게임풍은 «가늘고 사실적인 잎» 이 아니라 «뭉텅이로 읽히는 덩어리» 를 노린다 — 잎이
// 가늘면 원거리에서 사라지고 근거리에서 바늘처럼 선다.
//
// 그래서 셋을 함께 바꾼다: 폭을 키우고(2.4배), 끝을 뭉툭하게 하고(끝 반폭 = 밑동의 60%),
// 높이를 조금 낮춘다. 결과 비율은 3:1 이다.
// **폭과 끝은 노브로 열어 둔다** — 이것은 화면으로만 판정되는 값이고, 기본값이 무엇이어야
// 하는지는 감독이 실기기에서 돌려 보고 정한다(`url-knob.ts` 가 세운 규약).
export const BLADE_H = 0.28;
export const BLADE_W = 0.13;

/**
 * 잎 끝의 뭉툭함. `0` = 바늘처럼 뾰족 · `1` = 끝까지 밑동 폭(직사각형).
 *
 * ⚠ **0.6 → 0.14 (감독 판정 2026-08-18 *"잎같지 않아. 끝이 뾰족하지 않고"*).**
 *
 * 1차의 «가시» 를 고치려고 0.6 으로 뭉툭하게 했는데 그것은 과잉이었다 — 잎은 **끝이
 * 뾰족한 것이 맞다.** 1차가 가시로 보인 진짜 원인은 끝이 아니라 **폭**이었다(5.5cm,
 * 6:1). 폭을 13cm 로 넓힌 지금은 끝을 뾰족하게 해도 가시가 아니라 잎이다.
 *
 * 그리고 **테이퍼를 곡선으로** 바꾼다(`features/grass.ts` 의 지오메트리). 각진 3단
 * 테이퍼가 «인공적으로 보인다» 의 한 축이었다 — 실제 잎은 밑동에서 천천히, 끝으로 갈수록
 * 급하게 좁아진다.
 */
export const BLADE_TIP = 0.14;

/**
 * 잔디 색 3종. 감독 코멘트의 *"단순히 한 색을 쓰지 말고 2~3개 초록색을 섞어야 한다"* 를
 * 그대로 받았다. 다만 감독이 준 값(#78D833·#54B92C·#328C2A)을 그대로 쓰지 **않는다** —
 * 그 셋은 채도가 매우 높아 현행 `GRASS_BASE(0x74ae5b)` 와 나란히 놓으면 실제 풀만
 * 형광으로 뜨고 바닥 판과 두 종류의 잔디처럼 갈린다. 여기 값은 감독 팔레트의 **색상각**
 * (100~110°)을 따르되 채도를 바닥 판 쪽으로 당긴 것이다.
 *
 * ⚠ **이 색은 밤 알베도 배수와 아무 관계가 없다**(검수관 권고 P3, 2026-08-18 — 첫 판본이
 * 반대로 적었다). `decide/ground-albedo.ts` 는 `srgbLuminance(p.groundBase) ×
 * meanLuminance(p.tones)` 로 **파츠 상수만** 읽는다. 여기 값도, 잔디 텍스처도 안 본다.
 *
 * ⚠⚠ **실제 위험은 반대 방향이고 아직 안 고쳤다.** `systems/ground-lift.ts` 는
 * `GROUND_KEYS`(= `groundBase` 를 신고한 파츠)만 밝히는데 블레이드 메시는 파츠가 아니다.
 * 즉 **밤에 바닥 판만 최대 `MAX_LIFT`(≈3.16)로 뜨고 풀은 그대로 남아, 풀이 지면보다
 * 어둡게 가라앉는다.** 감독의 밤 A/B 에서 바로 보일 축이다.
 * 고치지 않은 이유: 처방(시간대별 블레이드 색 보정)은 값 판단이 필요하고, 그 값은 감독이
 * 밤 화면을 본 뒤에만 정해진다. **먼저 보이고 나서 고친다** — 지금 임의 값을 넣으면
 * 감독이 판정할 대상이 내 추측이 된다.
 */
export const GRASS_TONES = [0x8ac05e, 0x74ae5b, 0x5c9450] as const;

// ── 바람 파라미터 ───────────────────────────────────────────────────────────
//
// 감독 명세: *"uv.y 를 곱하는 이유는 풀 밑부분 → 안 움직임, 풀 끝부분 → 많이 움직임"*.
// 여기 상수는 그 가중을 **제곱**으로 쓴다 — 선형이면 밑동도 눈에 띄게 밀려 풀이 통째로
// 기우는 것처럼 보인다. 제곱이면 밑동이 단단하고 끝만 살랑인다.
// ⚠ **감독 실기기 2026-08-18: *"흔들리는 잔디 처럼 해줘야지."*** 첫 판본은 값 셋이
// 동시에 «느리고 넓게» 였다: 속도 1.4rad/s = **주기 4.5초**, 파수 0.55rad/m = **파장 11m**,
// 그리고 위상이 **위치만의 함수**였다. 결과는 «필드 전체가 아주 천천히 같이 기우는» 것이라
// 화면에서 «흔들린다» 로 안 읽힌다 — 잔디가 흔들리는 인상은 **주기가 짧고 이웃끼리 위상이
// 다를 때** 나온다.
//
// 셋을 함께 고친다: 주기를 2.4초로 당기고, 파장을 5.7m 로 줄이고, **개별 잎 위상 지터**를
// 넣는다(아래 `WIND_JITTER_*`). 지터가 핵심이다 — 그것이 없으면 파장을 아무리 줄여도
// 수 cm 떨어진 이웃 잎은 같은 위상이라 «잔디밭» 이 아니라 «천 한 장» 처럼 움직인다.
export const WIND_AMP = 0.12;      // 끝점이 밀리는 거리(m) — 잎 높이(0.28)의 43%
export const WIND_SPEED = 2.6;     // 위상 속도(rad/s) — 주기 2.4초
export const WIND_WAVE_K = 1.1;    // 공간 파수(rad/m) — 파장 5.7m
export const WIND_DIR_X = 0.86;    // 바람 방향(단위벡터). 대각이면 물결이 더 읽힌다
export const WIND_DIR_Z = 0.51;
export const WIND_GUST_K = 0.03;   // 돌풍 노이즈의 공간 주파수(낮을수록 넓게 뭉친다)
export const WIND_GUST_T = 0.35;   // 돌풍이 흘러가는 속도

/**
 * 개별 잎 위상 지터. **고주파 공간항**이라 수 cm 떨어진 이웃도 위상이 갈린다.
 *
 * 파수가 크다는 것이 요점이다 — `WIND_WAVE_K`(1.1)가 «물결이 지나간다» 를 만들고, 이쪽
 * (9.7 / 7.3)이 «잎마다 따로 논다» 를 만든다. 둘이 함께 있어야 잔디밭으로 보인다.
 * 진폭(rad)은 작게 둔다: 크면 이웃끼리 반대 방향으로 기울어 «지직거림» 이 된다.
 */
export const WIND_JITTER_KX = 9.7;
export const WIND_JITTER_KZ = 7.3;
/**
 * ⚠ **1.2 → 0.28 (감독 판정 2026-08-18 *"바람에 흔들리는 느낌이 아니고 혼자 살아있는
 * 스스로 움직이는것같은 느낌이야"*).**
 *
 * 1.2rad(69°)은 이웃 잎이 **거의 반대 위상**으로 기울 만큼 크다. 그러면 «바람이 지나간다»
 * 가 아니라 «잎마다 제 뜻대로 움직인다» 로 보인다 — 정확히 감독이 지적한 것이다.
 *
 * 지터의 목적은 «같은 각도로 굳는 것»을 깨는 것이지 **위상을 흩는 것이 아니다.** 0.28rad
 * (16°)이면 잎들이 여전히 **한 덩어리로 물결치되** 판박이처럼 보이지 않는다. 물결(공간
 * 파동)이 주인공이고 지터는 그 위의 잔결이다 — 그 서열이 뒤집히면 바람이 사라진다.
 */
export const WIND_JITTER_AMP = 0.28;

/**
 * 돌풍이 굽힘에 실리는 비율. **바람 «세기» 자체를 물결치게 만드는 축이다.**
 *
 * 감독이 원한 «바람에 흔들린다» 는 방향이 아니라 **세기가 오르내리는 것**이다 — 실제
 * 바람은 한 줄기가 지나가며 그 구역만 세게 눕혔다가 놓는다. 그래서 돌풍 노이즈의 진폭을
 * 키우고(0.35 → 0.75) 하한을 낮춘다(0.75 → 0.35): 어떤 구역은 거의 멈춰 있고 어떤 구역은
 * 크게 눕는다.
 */
export const WIND_GUST_MIX = 0.75;
export const WIND_GUST_BASE = 0.35;

// ── 갱신 예산 ───────────────────────────────────────────────────────────────

/**
 * 랩 재계산을 시작할 플레이어 이동 거리(m).
 *
 * 매 프레임 전수 재계산은 낭비다 — 플레이어가 1m 움직이는 동안 타일 경계를 넘는 포기는
 * 없거나 극소수다. 바람은 셰이더가 하므로 CPU 가 놀아도 화면은 계속 움직인다.
 */
export const WRAP_MOVE_EPS = 1.0;

/**
 * 한 프레임에 재배치할 포기 수의 상한.
 *
 * 예산이 없으면 1.4만 포기의 유효성 판정(도로·광장·물)이 한 프레임에 몰려 스파이크가
 * 난다. 나눠 처리해도 **눈에 안 띄는 이유**는 재배치 대상이 언제나 플레이어에게서
 * 가장 먼 가장자리이고, 거기는 `edgeScale` 이 이미 0 근처로 눕혀 둔 자리이기 때문이다.
 */
export const WRAP_BUDGET = 2048;

// ── 결정적 난수 ─────────────────────────────────────────────────────────────
//
// `decide/parcel-layout.ts` 의 `hash2`/`rngFrom` 과 **같은 계열**이지만 여기서 다시
// 만든다. 저쪽은 파셀 좌표 두 개를 섞는 형태라 «i 번째 포기» 라는 1차원 입력에 맞지 않고,
// 억지로 맞추면 (i, 0) 같은 인공 좌표를 넣게 된다.

/** 정수 하나를 [0,1) 실수로 흩는다. 같은 `i` 는 세션이 바뀌어도 같은 값이다 */
export function bladeHash(i: number, salt: number): number {
  let h = (i * 0x9e3779b1) ^ (salt * 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 13), 0x297a2d39);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ── 배치 ────────────────────────────────────────────────────────────────────

/**
 * 이 반경·밀도에서 활성화할 포기 수. **버퍼 크기가 아니라 활성 수다.**
 *
 * 정사각 타일 `(2R)²` 을 채운 뒤 원 밖을 `edgeScale` 이 눕히므로, 실제로 보이는 것은
 * 여기 계산의 π/4 ≈ 79% 다. 원만 채우도록 계산을 바꾸지 않는 이유는 랩어라운드가
 * **정사각 타일 위에서만** 균일하기 때문이다(원 타일은 이어붙일 수 없다).
 */
export function bladeCount(radius: number, density: number): number {
  const span = radius * 2;
  return Math.max(0, Math.round(span * span * density));
}

/**
 * 링별 인스턴스 수. 합이 `MAX_BLADES` 를 넘으면 **비율을 유지한 채** 눌러 담는다.
 *
 * 비율 유지가 요점이다 — 앞 링부터 채우고 자르면 밀도 노브를 올렸을 때 **바깥 링만**
 * 사라져 「멀리 잔디가 없어지는」 것으로 보인다.
 */
export function ringCounts(radiusMul: number, densityMul: number): number[] {
  const raw = GRASS_RINGS.map((r) => bladeCount(r.radius * radiusMul, r.density * densityMul));
  const total = raw.reduce((a, b) => a + b, 0);
  if (total <= MAX_BLADES) return raw;
  const k = MAX_BLADES / total;
  return raw.map((n) => Math.floor(n * k));
}

/** `i` 가 몇 번째 링인가. 누적 경계로 가른다 */
export function ringOf(i: number, counts: readonly number[]): number {
  let acc = 0;
  for (let r = 0; r < counts.length; r++) {
    acc += counts[r];
    if (i < acc) return r;
  }
  return counts.length - 1;
}

/** 그 링이 시작하는 인덱스 — 링 안에서의 상대 위치를 구할 때 쓴다 */
export function ringStart(ring: number, counts: readonly number[]): number {
  let acc = 0;
  for (let r = 0; r < ring; r++) acc += counts[r];
  return acc;
}

/**
 * `i` 번째 포기의 **타일 안 고정 자세**. 플레이어 위치와 무관하고 세션 내내 안 변한다.
 *
 * 감독 명세의 *"Scale/Rotation/Height/Green/Bending Random"* 이 여기 다섯 값이다.
 * 축마다 소금(salt)을 갈라 쓰는 것은 `parcel-layout.ts` 가 세운 규약과 같은 이유다 —
 * 하나의 난수 흐름을 공유하면 한 축의 범위를 바꿀 때 나머지 축이 전부 따라 움직인다.
 */
export function bladeBase(i: number, radius: number): {
  /** 타일 로컬 좌표 [0, 2R) */
  bx: number;
  bz: number;
  /** Y 회전(rad) */
  rot: number;
  /** 폭 배수 */
  sw: number;
  /** 높이 배수 */
  sh: number;
  /** 색 인덱스 (0..GRASS_TONES.length-1) */
  tone: number;
} {
  const span = radius * 2;
  return {
    bx: bladeHash(i, 0x1f83d9ab) * span,
    bz: bladeHash(i, 0x5be0cd19) * span,
    rot: bladeHash(i, 0x9b05688c) * Math.PI * 2,
    // 폭보다 높이의 변주를 크게 준다 — 높이가 실루엣을 만들고, 폭은 두꺼워질수록
    // 저폴리 티가 난다(게임풍은 가늘고 뾰족한 쪽이 읽기 좋다).
    sw: 0.75 + bladeHash(i, 0xcbbb9d5d) * 0.5,
    sh: 0.6 + bladeHash(i, 0x629a292a) * 0.8,
    tone: Math.floor(bladeHash(i, 0x152fecd8) * GRASS_TONES.length) % GRASS_TONES.length,
  };
}

/**
 * 타일 좌표를 플레이어 중심 타일로 접는다(토러스 랩).
 *
 * 결과는 언제나 `[center - span/2, center + span/2)` 안이다. 플레이어가 걸어가면 뒤쪽
 * 경계를 넘은 포기가 앞쪽에 다시 나타나고, 그 포기만 새 자리를 받는다 — **인스턴스가
 * 생기거나 사라지지 않는다.** 개수 불변식이 구조적으로 성립하는 지점이 여기다.
 */
export function wrapTo(base: number, center: number, span: number): number {
  return base + span * Math.round((center - base) / span);
}

/**
 * 가장자리 감쇠. 반경 안쪽은 1, 바깥은 0, 그 사이는 부드럽게.
 *
 * 팝인을 막는 것이 목적이다 — 경계에서 딱 잘리면 걸을 때마다 풀이 한 줄씩 튀어나온다.
 * 안쪽 82% 까지는 온전한 높이를 유지한다: 더 일찍 눕히기 시작하면 필드 전체가 접시처럼
 * 가운데만 볼록해 보인다.
 */
export function edgeScale(dx: number, dz: number, radius: number): number {
  const d = Math.sqrt(dx * dx + dz * dz);
  const inner = radius * 0.82;
  if (d <= inner) return 1;
  if (d >= radius) return 0;
  const t = 1 - (d - inner) / (radius - inner);
  // smoothstep — 선형이면 감쇠가 시작·끝나는 지점에 띠가 보인다
  return t * t * (3 - 2 * t);
}

// ── 갓돌 띠 (감독 화면 판정 대비, 2026-08-18) ───────────────────────────────
//
// 첫 판본은 «잔디면 심고 아니면 안 심는다» 였다. 그런데 검수관이 링크가 열리는 자리를
// 실측하니 **정면 0~5m 에 한 포기도 없었다** — 강가 스폰의 발밑이 도로이기 때문이다.
// 블레이드 모양과 바람은 근거리에서 판정되는데 근거리가 통째로 비면, 감독은 열자마자
// «잔디가 성기다» 또는 «안 켜졌나» 로 읽는다. 그것이 이 노브를 연 목적을 무효화한다.
//
// 그래서 도로 **갓돌 근처 띠**에만 짧은 풀이 삐져나오게 한다. 감독이 준 참조 화면도
// 길가까지 풀이 차 있고, 실제로 포장 경계는 풀이 가장 잘 비집고 나오는 자리다.
// **도로 한복판에는 안 난다** — 띠 폭이 갓돌에서 재어지므로 폭을 키워도 중앙은 안 채워진다.
// **실측 (2026-08-18, 저장소 판정 함수를 그대로 실행 · 시야 ±37° 기준)**
//
//   스폰       0–5m   5–10m   시야내   전체(360°)
//   ─────────────────────────────────────────────
//   river   0 →  6  110→148  127→171  7,169→7,722    ← 새 페이지 링크의 기본값
//   default 0 → 14    0→ 26    0→194      0→  604    ← 기본 스폰(전에는 통째로 0이었다)
//
// `default` 가 **0 → 604** 인 것이 이 띠의 값어치다 — 광장·도로 구역에서는 잔디 필드가
// 아예 안 보였다.
//
// ⚠ **여기서 멈춘다.** `river` 의 0–5m 가 6 에 그치는 것은 띠가 좁아서가 아니라 **그 자리
// 정면이 강이기 때문**이다. 띠를 넓히면 도로 한복판이 풀로 덮여 «관리 안 된 길» 이 되고,
// 그 이상은 **스폰 좌표를 새로 만드는 일**(`decide/spawn-spot.ts` 에 스팟 추가)이라 이
// 기능의 범위 밖이다. 감독이 화면을 보고 «근거리가 비었다» 라고 판정하면 그때 연다 —
// 지금 미리 넣으면 감독이 판정할 대상이 내 추측이 된다.
export const ROAD_EDGE_BAND = 0.55;
/** 갓돌 풀의 높이 배수. 잔디밭 풀보다 낮아야 «비집고 나온 것» 으로 읽힌다 */
export const ROAD_EDGE_SCALE = 0.45;

/**
 * 이 월드 좌표에 풀이 **얼마나** 서는가. `0` 이면 안 심는다.
 *
 * 판정은 **전부 기존 SSOT 에 위임한다** — 도로·광장·잔디의 갈림은 `parts/surface.ts` 의
 * `surfaceY` 가, 물은 `decide/water.ts` 의 `parcelWater` 가, 도로 기하는
 * `parts/road-topology.ts` 가 이미 답을 갖고 있다. 여기서 조건을 다시 쓰면 강 경로나 도로
 * 폭을 바꿨을 때 잔디만 안 따라오고, 그 증상은 **강 위에 풀이 자라는** 것으로 나타난다.
 *
 * 잔디 판정을 `=== GARDEN_SURFACE_Y` 로 하는 것이 요점이다: 새 표면이 생겨도 그 표면이
 * 잔디 높이를 쓰지 않는 한 여기 안 들어온다.
 *
 * **광장은 0 이다.** 감독이 포장으로 만든 자리이고 분수·시계탑이 서는 곳이라, 풀이 비집고
 * 나오면 «관리 안 된 광장» 이 된다 — 도로 갓돌과 성격이 다르다.
 */
export function plantScale(wx: number, wz: number, cell: number): number {
  const px = Math.round(wx / cell);
  const pz = Math.round(wz / cell);
  if (parcelWater(px, pz, cell, cell) === 'water') return 0;
  // 파셀 로컬 좌표 — `surfaceY` 는 파셀 중심 기준으로 받는다
  const lx = wx - px * cell;
  const lz = wz - pz * cell;
  const y = surfaceY(px, pz, lx, lz);
  if (y === GARDEN_SURFACE_Y) return 1;
  if (y !== ROAD_SURFACE_Y) return 0;   // 광장 — 포장은 비워 둔다

  // 갓돌까지 거리. 도로는 파셀 중심에서 뻗은 **십자**라, 세로 길 위에서는 `ROAD_HALF-|x|`,
  // 가로 길 위에서는 `ROAD_HALF-|z|` 가 경계까지 거리다. 교차부는 사방이 길이라 `min` 이
  // 작아지고 따라서 거리가 커진다 — 저절로 «가장자리 아님» 이 된다.
  if (!onRoad(lx, lz, roadDirs(px, pz))) return 0;
  const toEdge = ROAD_HALF - Math.min(Math.abs(lx), Math.abs(lz));
  return toEdge < ROAD_EDGE_BAND ? ROAD_EDGE_SCALE : 0;
}
