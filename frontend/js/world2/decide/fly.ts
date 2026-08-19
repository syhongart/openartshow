// world2/decide/fly.ts — **편집 중 비행**의 판정. three 도 DOM 도 안 만진다.
//
// 감독 지시 2026-08-19: *"내가 하늘을 날아서 보고 편집하게 하는건 어때"*
//
// 그전에 감독이 *"저 위에서 보는 시점 좋다. 개발자 편집모드에서 필요해"* 라고 했고,
// 내가 「탑뷰를 어떻게 쓰실지」를 카드로 물었더니 **선택지 밖의 답**이 왔다. 정해진 시점
// 넷을 오가는 것이 아니라 **원하는 자리로 가서 본다** — 언리얼 에디터·유니티 씬뷰·
// 블렌더 플라이 모드가 그것이다.
//
// ── 팀장 판정 (2026-08-19) ─────────────────────────────────────────────────
// (가) `PlayerSystem` 확장 채택. 근거는 **스트리밍**이다 — 이 세계는 플레이어 위치로
// 파셀을 로드하므로, 시점만 따로 날려 보내면 「날아간 곳이 빈 세계」가 확정이다. 궤도가
// 플레이어를 통째로 옮기는 방식을 택한 것도 같은 이유다.
//
// 조건 셋이 붙었고 이 파일이 그중 첫째를 집행한다:
//   ① **문을 좌표가 아니라 입력으로 연다.** `moveTo(x,z)` 류는 «언제나 용도보다 넓다»
//      (2026-08-13 판정 (A-1) 기각 논리). 그래서 아래는 **연속 이동량**만 내고, 편집은
//      「어디로 갈지」를 여전히 못 정한다 — 산술·클램프·복원은 `PlayerSystem` 이 소유한다.
//   ② 궤도와 같은 규율 3종(편집에서만 · `orbitFrom` 공유 복원 · `lift` 소비 지점)
//   ③ 상한은 궤도의 `LIFT_MAX` 와 **다른 상수**로 신설 — 아래가 그 유도다.
//
// ── 🔴 상한을 어디서 유도했나 — 실측 넷 (팀장 조건 ③) ──────────────────────
// 팀장 조건: *"실측+여유가 아니라 **스트리밍 언로드·안개 경계에서 유도**한다. 무제한은
// 불가 — 언로드 경계 위로 나가면 빈 세계가 확정이다."*
//
// 실측한 것:
//   ① `DEFAULT_BANDS.farExit` = **2.40 셀** — 파셀이 그리기를 멈추는 거리(`decide/lod.ts`)
//   ② `FOG_FAR_CELLS` = `farExit` = **2.40 셀** — 안개 100% (`decide/fog.ts`)
//   ③ `FOG_NEAR_CELLS` = **1.6 셀** — 안개가 끼기 시작
//   ④ 두 백엔드의 안개가 **뷰 깊이**를 쓴다 — WebGL 은 `vFogDepth = -mvPosition.z`
//      (`ShaderChunk/fog_vertex.glsl.js:4`), WebGPU 는 `positionView.z.negate()`
//      (`nodes/fog/FogNode.js:36`). **직접 grep 해서 확인했다.**
//
// ④가 이 유도의 전제다. 수직으로 내려다볼 때 지면까지의 **뷰 깊이가 곧 고도**이므로,
// 안개 밴드가 **수평 거리와 똑같이 고도에도 걸린다.** 그래서:
//
//   고도 > `FOG_FAR_CELLS`  → **바로 아래 지면조차 안개 100%** = 화면이 안개색뿐이다
//   고도 > `FOG_NEAR_CELLS` → 흐려지기 시작한다(볼 수는 있다)
//
// **하드 상한은 `FOG_FAR_CELLS` 다.** 그 위로 올라가는 것은 「높이 나는 것」이 아니라
// **「아무것도 안 보이는 것」**이라, 무제한을 막으라는 팀장 조건이 여기서 값으로 유도된다.
//
// ⚠ 카메라 절두체(FOV 70°)로도 계산해 봤다: 고도 h 에서 화면 세로 절반에 들어오는 지면
// 반경은 `h·tan(35°) ≈ 0.70h` 이고, 그것이 로드 반경(`farExit`)을 넘는 고도는 **약
// 3.43 셀**이다. 즉 **안개가 절두체보다 먼저 막는다**(2.40 < 3.43) — 로드 반경으로
// 유도하면 이미 안개색인 구간을 상한으로 삼게 된다. 두 축 중 **좁은 쪽**이 답이다.
//
// ⚠⚠ **궤도의 `LIFT_MAX`(40m) 는 손대지 않는다.** 그 값의 근거는 *"파셀 하나가 화면에
// 다 들어오면 어느 구역을 보는지 흐려진다"* 이고 **궤도의 목적**에서 나왔다. 비행의
// 목적은 정확히 그 반대(감독: 「하늘을 날아서」)라, 한 값을 공유하면 **의도가 다른 둘이
// 한 값을 쓰는** 형태가 된다(`bobIntensity`/`moveFactor` 를 가른 그 근거).
//
// ── 이 범위에서 **안 고치는 것** (팀장 조건, 경계도 판정이다) ────────────────
// 비행 고도에서 **로드 반경 밖 파셀이 빈 채로 보이는 것**은 이번 범위 밖이다. 스트리밍은
// x·z 기준이라 시점을 따로 날리는 (나) 안을 택했어도 같은 문제였다. 감독이 화면에서
// 문제라고 하면 그때 재론한다 — 이 문장이 없으면 다음 사람이 같은 고리를 다시 돈다.

import { DEFAULT_BANDS } from './lod.js';
import { FOG_NEAR_CELLS } from './fog.js';

/**
 * 비행 고도 상한(**셀 배수**). 위 유도의 결론 — 안개 100% 선이 하드 상한이다.
 *
 * ⚠ **미터가 아니라 셀로 낸다.** `PlayerSystem` 은 레이아웃도 충돌 구현도 모르고
 * (`RESTORE_STEP` 주석이 그 규율을 적어 두었다), 셀 크기를 여기서 읽으면 이 판정이
 * 세계 지형에 묶인다. 미터 변환은 **배선하는 쪽**이 `× cellX` 로 한다.
 *
 * `FOG_FAR_CELLS` 를 직접 import 하지 않고 `DEFAULT_BANDS.farExit` 를 쓰는 이유:
 * 전자가 후자로 정의돼 있고(`fog.ts:65`), 원본을 가리키는 편이 한 다리 짧다.
 */
export const FLY_CEIL_CELLS = DEFAULT_BANDS.farExit;

/**
 * 비행 고도 **기본 상한**(셀 배수). 안개가 끼기 시작하는 선이다.
 *
 * 🔴 **이 값은 감독 판정 대기 중이다.** 화면에서만 판정되는 값이라 노브(`?flyup=`)로
 * 후보를 열어 배포하고 카드로 받는다 — CLAUDE.md 의 의사결정 사이클(*"설명하지 말고
 * 만들어서 배포한다 / 후보를 여럿 동시에 / 답은 카드 퀴즈로"*)이고, 팀장도 *"배포 전에
 * 값을 묻지 않는다"* 로 못 박았다.
 *
 * 기본을 **안개 시작선**에 둔 이유: 그 아래가 «선명하게 보이는 최대 고도» 다. 더 올리면
 * 넓게 보이지만 흐려지고, 편집은 보고 하는 일이다. 감독이 «더 높이» 라고 하면 노브
 * 후보 중 하나를 골라 이 값을 바꾼다.
 */
export const FLY_UP_CELLS = FOG_NEAR_CELLS;

/**
 * 비행 속도 배수. 걷기(`WALK_SPEED`)에 곱한다.
 *
 * 3 인 근거: 파셀 하나(1 셀)를 건너는 데 걷기로 6.4초가 걸리는데, 위에서 내려다보며
 * 자리를 옮기는 동작은 «저기까지» 가 파셀 몇 개 단위다. 그 왕복이 매번 6초면 도구가
 * 아니라 인내심 시험이 된다. **화면에서 판정되는 값**이라 노브로 함께 연다.
 */
export const FLY_SPEED_MULT = 3;

/** 비행 입력. `MoveInput` 과 달리 **수직 둘**이 있다 — 그것이 비행과 걷기의 차이다 */
export interface FlyInput {
  readonly forward: boolean;
  readonly back: boolean;
  readonly left: boolean;
  readonly right: boolean;
  readonly up: boolean;
  readonly down: boolean;
  readonly fast: boolean;
}

export const NO_FLY: FlyInput = {
  forward: false, back: false, left: false, right: false,
  up: false, down: false, fast: false,
};

/** 한 프레임의 이동량(m). `dy` 는 **고도 증분**이고 상한 클램프는 소비자가 한다 */
export interface FlyDelta {
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
}

export const NO_DELTA: FlyDelta = { dx: 0, dy: 0, dz: 0 };

/**
 * 이번 프레임에 얼마나 움직이는가. **좌표가 아니라 증분이다** — 팀장 조건 ①.
 *
 * ── 전후는 **시선 방향**, 좌우는 **수평**이다 ───────────────────────────────
 * 블렌더 플라이·언리얼 에디터가 그렇게 한다: 위를 보고 앞으로 가면 **올라간다.**
 * 그것이 「난다」의 조작 감각이고, 전후까지 수평으로 묶으면 상하 키로만 고도를 바꿔야 해
 * 손이 두 배로 바쁘다.
 *
 * 좌우(스트레이프)를 수평으로 두는 것은 반대 이유다 — 피치를 섞으면 옆으로 갈 때
 * 화면이 기울어 보이고, 실제로 두 도구 모두 스트레이프는 수평이다.
 *
 * ⚠ **정규화를 대각선에만 건다.** 전후와 좌우를 함께 누르면 길이가 √2 가 되어 대각선이
 * 빠르다 — 걷기(`moveDelta`)가 이미 같은 처방을 갖고 있고, 여기서 다르게 하면 «걸을
 * 때와 날 때 대각선 속도가 다르다» 가 된다.
 *
 * ⚠⚠ **수직 입력은 정규화에 안 넣는다.** 상하는 시선과 독립된 축이고(절대 y), 넣으면
 * 「위로 가면서 앞으로」가 각각 느려진다 — 그것이 비행에서 가장 흔한 조합이다.
 *
 * @param yaw   좌우 방위(rad). 0 이 -z 를 본다(`facing` 규약과 같다)
 * @param pitch 상하 시선(rad). 위를 보면 양수
 * @param speed 이동 속도(m/s)
 * @param runMult `fast` 일 때의 배수. ⚠ **인자로 받는다 — 여기 수를 적지 않는다.**
 *   그 값은 `systems/player.ts` 의 `RUN_MULT` 가 소유하는데, 이 파일이 그것을 import
 *   하면 `player → fly → player` 순환이 된다(`check:cycles` 가 막는다). 첫 판본은
 *   `2.2` 를 그냥 적었고 그것이 정확히 이 저장소가 「값 미러링」이라 부르는 형태다 —
 *   달리기 감각을 고치는 날 걷기만 바뀌고 비행은 옛 값으로 남는다.
 */
export function flyDelta(
  input: FlyInput, yaw: number, pitch: number, speed: number, dt: number, runMult: number,
): FlyDelta {
  if (!Number.isFinite(dt) || dt <= 0) return NO_DELTA;

  const fwd = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
  const side = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const vert = (input.up ? 1 : 0) - (input.down ? 1 : 0);
  if (fwd === 0 && side === 0 && vert === 0) return NO_DELTA;

  // 대각선만 정규화 — 위 주석의 근거.
  const plane = fwd !== 0 && side !== 0 ? Math.SQRT1_2 : 1;
  const v = speed * (input.fast ? runMult : 1) * dt;

  // 시선 방향의 수평 성분은 `cos(pitch)` 로 줄어든다 — 위를 볼수록 앞으로 덜 가고
  // 위로 더 간다. 그 배분이 곧 「시선 방향으로 난다」이다.
  const cp = Math.cos(pitch);
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);

  const dx = (fwd * -sinY * cp + side * cosY) * plane * v;
  const dz = (fwd * -cosY * cp - side * sinY) * plane * v;
  const dy = (fwd * Math.sin(pitch) * plane + vert) * v;

  return { dx, dy, dz };
}

/**
 * 고도를 상한 안으로. 하한이 0 인 것은 **지면 아래로 안 내려간다**는 뜻이다.
 *
 * ⚠ 지면 아래를 막는 것은 충돌이 아니라 이 클램프다 — 비행은 충돌을 안 태우므로
 * (궤도와 같은 규율) 막을 것이 여기밖에 없다. 물속 편집은 별개 축이고 열려 있지 않다.
 */
export function clampFlyLift(lift: number, maxM: number): number {
  if (!Number.isFinite(lift)) return 0;
  return Math.min(Math.max(0, maxM), Math.max(0, lift));
}
