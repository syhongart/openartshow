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

/**
 * 실제 풀이 서는 반경(m). 기본 24.
 *
 * 상한 52 는 임의의 넉넉한 값이 아니라 **안개 시작에서 유도**한다 —
 * `decide/fog.ts` 의 `FOG_NEAR_CELLS(1.6) × cell(32) = 51.2m`. 그보다 멀리 심으면
 * 안개가 이미 먹은 자리에 풀을 그리는 것이라 드로우 비용만 나가고 화면은 안 변한다.
 * 그 바깥은 현행 잔디 텍스처(`parts/garden.ts` 의 평면)가 계속 담당하고, 전환은
 * `edgeScale` 이 가장자리에서 0 으로 눕혀 감춘다.
 */
export const GRASS_RADIUS = 24;
export const GRASS_RADIUS_MIN = 8;
export const GRASS_RADIUS_MAX = 52;

/** 기본 밀도(포기/m²). 게임풍은 밀도가 인상을 만든다 — 성기면 즉시 «잔디 몇 개» 로 보인다 */
export const GRASS_DENSITY = 8;

/**
 * 인스턴스 버퍼 상한. **부팅에 이 크기로 한 번 잡고 세션 내내 안 바꾼다.**
 *
 * 40,000 의 근거: 기본값(R=24·d=8)이 쓰는 것은 정사각 타일 `(2R)² × d = 18,432` 이고,
 * 밀도 노브 최대(×2)에서 36,864 다. 즉 **기본 구성의 노브 전 범위를 담는 최소치**에
 * 자리를 조금 남긴 값이다. 반경까지 최대(52)로 올리면 이 상한에 눌리는데(§`bladeCount`),
 * 그때는 밀도가 자동으로 묽어진다 — 버퍼를 늘리는 대신 묽어지는 쪽을 고른 이유는
 * 버퍼 크기가 노브에 따라 변하면 개수 불변식의 baseline 이 노브마다 달라지기 때문이다.
 */
export const MAX_BLADES = 40000;

/** 풀 한 포기의 기준 높이·폭(m). 실제 값은 포기마다 `bladeBase` 가 변주한다 */
export const BLADE_H = 0.34;
export const BLADE_W = 0.055;

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
export const WIND_AMP = 0.10;      // 끝점이 밀리는 거리(m) — 풀 높이의 30% 안쪽
export const WIND_SPEED = 1.4;     // 위상 속도(rad/s)
export const WIND_WAVE_K = 0.55;   // 공간 파수(rad/m) — 물결이 지나가는 간격
export const WIND_DIR_X = 0.86;    // 바람 방향(단위벡터). 대각이면 물결이 더 읽힌다
export const WIND_DIR_Z = 0.51;
export const WIND_GUST_K = 0.03;   // 돌풍 노이즈의 공간 주파수(낮을수록 넓게 뭉친다)
export const WIND_GUST_T = 0.15;   // 돌풍이 흘러가는 속도

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
  return Math.max(0, Math.min(MAX_BLADES, Math.round(span * span * density)));
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

/**
 * 이 월드 좌표에 풀을 심을 수 있는가.
 *
 * 판정은 **전부 기존 SSOT 에 위임한다** — 도로·광장·잔디의 갈림은 `parts/surface.ts` 의
 * `surfaceY` 가, 물은 `decide/water.ts` 의 `parcelWater` 가 이미 답을 갖고 있다. 여기서
 * 조건을 다시 쓰면 강 경로나 광장 배치를 바꿨을 때 잔디만 안 따라오고, 그 증상은
 * **강 위에 풀이 자라는** 것으로 나타난다(이 저장소가 값 미러링으로 세 번 겪은 형태).
 *
 * 잔디 판정을 `=== GARDEN_SURFACE_Y` 로 하는 것이 요점이다: 도로(0.14)와 광장(0)은
 * 자동으로 빠진다. 새 표면이 생겨도 그 표면이 잔디 높이를 쓰지 않는 한 여기 안 들어온다.
 */
export function plantable(wx: number, wz: number, cell: number): boolean {
  const px = Math.round(wx / cell);
  const pz = Math.round(wz / cell);
  if (parcelWater(px, pz, cell, cell) === 'water') return false;
  // 파셀 로컬 좌표 — `surfaceY` 는 파셀 중심 기준으로 받는다
  return surfaceY(px, pz, wx - px * cell, wz - pz * cell) === GARDEN_SURFACE_Y;
}
