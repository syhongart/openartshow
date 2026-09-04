// world-shared/ground-fog.ts — **지면 안개(높이 안개).** 판정은 순수 함수, 집행은 노드 빌더.
//
// ── 왜 생겼나 (감독 카드 판정 2026-09-04) ───────────────────────────────────
// 감독: *"게임처럼 안개효과 뭔가 진짜 리얼한 느낌을 주고 싶어."* → 카드 「리얼 안개는
// 어느 깊이까지」 답: **「바닥에 깔리는 높이 안개까지」**.
//
// 지금 안개는 `THREE.Fog` 선형 하나다 — 카메라에서 멀수록 안개색으로 덮는 거리 안개.
// 게임에서 "리얼" 로 읽히는 것은 그 위에 **낮게 깔린 층**이 하나 더 있는 화면이다:
// 발치는 뿌옇고 건물 위쪽은 또렷하다. 이 파일은 그 층을 더한다.
//
// ── 무엇을 바꾸지 않는가 (경계) ─────────────────────────────────────────────
// - **거리 안개의 SSOT 는 그대로다.** 거리(near/far)는 각 트리의 `decide/fog.ts` 가,
//   색은 `sky.js` 팔레트가 `scene.fog` 에 써 넣는다. 여기는 그 둘을 **읽기만** 한다 —
//   `scene.fog` 의 `color`·`near`·`far` 를 `reference` 노드로 참조하므로 크로스페이드·
//   밤 하한(`decide/night.ts`)·`?fogd=` 가 종전과 똑같이 반영된다. 값을 여기 다시
//   적지 않는다(값 미러링 금지).
// - **`scene.fog` 는 남는다.** 거리 소비자(NPC 은닉·바다 타일·수평선 밴드)와 헤드리스
//   폴백(레거시 `WebGLRenderer` — `fogNode` 를 모른다)이 그것을 쓴다. 이 파일은
//   **WebGPU 경로에서만** 그 위에 층을 얹는다. three 는 `scene.fogNode` 가 있으면 그것을
//   쓰고 없으면 `scene.fog` 를 `rangeFog` 로 자동 변환한다(`renderers/common/nodes/
//   Nodes.js` `updateFog`). 즉 `strength` 0 = **fogNode 를 안 단다** = 종전 경로 그대로.
// - **하늘 돔·수평선 밴드는 안개를 안 받는다**(`fog:false`). 그 표면까지 덮는 것은
//   깊이 기반 후처리(3단계) 몫이고 이 파일 밖이다.
//
// ── 왜 `world-shared/` 인가 (팀장 부수 의견 2026-09-04) ─────────────────────
// world2 와 world-glb(월드7·8)는 no-sync 포크이고 **체리픽 표는 한 번도 쓰인 적이
// 없다**(실측). 한쪽에 넣고 "동기화한다" 는 존재하지 않는 절차다. 안개는 팔레트 입력 →
// 인자 출력의 순수 판정이라 어느 월드 소유도 아니다. 조건: 공용에 두는 것은 **판정과
// 노드 조립**까지이고, `scene.fogNode =` 대입(집행)은 각 트리의 feature 파일에 남긴다.
// **이 파일은 어느 세계인지 모른다**(R2) — URL 노브도 여기서 읽지 않는다. 값은
// `GroundFogParams` 로 주입받는다.
//
// ── 헤드리스가 못 보는 것 ───────────────────────────────────────────────────
// 스모크(swiftshader)는 레거시 `WebGLRenderer` 로 떨어져 **이 노드가 아예 안 돈다.**
// 그래서 여기 테스트가 재는 것은 「식이 맞는가」와 「노드 그래프가 SSOT 를 참조하는가」
// 뿐이고, 화면은 감독 실기기 링크가 유일한 판정이다. **"헤드리스 PASS" 를 이 안개의
// 근거로 적지 마라**(팀장 조건 C4).
//
// ── 식 ──────────────────────────────────────────────────────────────────────
//   range  = smoothstep(near, far, viewZ)                     ← three 의 rangeFog 와 동일
//   height = saturate(exp((h0 − y) · k))                       ← y ≤ h0 에서 1, 위로 지수 감쇠
//   ground = height · smoothstep(0, near, viewZ) · strength    ← 눈앞은 안 끼고 거리 따라 차오름
//   factor = range + ground − range·ground                     ← 두 층의 확률적 합성(1 을 안 넘는다)
//
// `smoothstep(0, near, viewZ)` 가 없으면 카메라가 층 안에 있을 때 코앞까지 뿌예져
// 화면 전체가 안개색이 된다 — 그것은 "리얼" 이 아니라 고장으로 읽힌다.

/** 지면 안개 매개변수. 값의 근거는 아래 상수 주석 한 곳. */
export interface GroundFogParams {
  /** 층의 기준 고도(m). 이 아래는 밀도 1 */
  h0: number;
  /** 고도 감쇠(1/m). 클수록 층이 얇다 — 두께 감각은 대략 3/k m */
  k: number;
  /** 세기 0~1. **0 이면 노드를 달지 않는다**(종전 화면) */
  strength: number;
}

/**
 * 기본값. ⚠ **`strength` 0 은 「감독 판정 전」의 값이다** — 라이브 화면을 바꾸지 않기
 * 위해서다. 후보를 `?fogs= ?fogh= ?fogk=` 노브로 열어 링크로 드리고, 감독이 고르면
 * 그 값을 여기로 옮기고 이 주석에 판정을 적는다(하늘 `SKY_BLUE` 가 그렇게 굳었다).
 *
 * h0·k 의 기본 후보 근거: 눈높이 1.6m 에서 발치가 뿌옇고 3m 위 창문은 또렷하려면
 * 층 천장을 눈높이 아래(1.0m)에 두고 3/k ≈ 6.7m 안에서 사라지게 한다. **실측 없음** —
 * 후보 링크의 출발점일 뿐이다.
 */
export const GROUND_FOG_H0 = 1.0;
export const GROUND_FOG_K = 0.45;
export const GROUND_FOG_STRENGTH = 0;

/** 노브 상한. 넘어가면 화면이 단색이 돼 "고장" 으로 읽힌다 */
export const GROUND_FOG_MAX: Readonly<GroundFogParams> = { h0: 20, k: 4, strength: 1 };

export const DEFAULT_GROUND_FOG: Readonly<GroundFogParams> = {
  h0: GROUND_FOG_H0, k: GROUND_FOG_K, strength: GROUND_FOG_STRENGTH,
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** GLSL/TSL `smoothstep` 과 같은 식 — 셰이더와 값이 어긋나면 테스트가 의미를 잃는다 */
export function smoothstep(e0: number, e1: number, x: number): number {
  if (e1 === e0) return x < e0 ? 0 : 1;
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** 고도 인자 0~1. `y ≤ h0` 에서 1 */
export function heightFactor(y: number, p: GroundFogParams): number {
  return clamp01(Math.exp((p.h0 - y) * p.k));
}

/** 거리 인자 — three `rangeFog` 와 동일 */
export function rangeFactor(viewZ: number, near: number, far: number): number {
  return smoothstep(near, far, viewZ);
}

/** 지면 안개 인자. 눈앞(viewZ→0)에서는 0 */
export function groundFactor(y: number, viewZ: number, near: number, p: GroundFogParams): number {
  return heightFactor(y, p) * smoothstep(0, near, viewZ) * p.strength;
}

/** 두 층의 합성. 어느 쪽이 1 이면 1, 둘 다 0 이면 0, 1 을 넘지 않는다 */
export function combineFog(range: number, ground: number): number {
  return range + ground - range * ground;
}

/** 최종 인자 — 셰이더 그래프와 같은 식을 CPU 에서 계산한다(테스트·진단용) */
export function groundFogFactor(
  y: number, viewZ: number, near: number, far: number, p: GroundFogParams,
): number {
  return combineFog(rangeFactor(viewZ, near, far), groundFactor(y, viewZ, near, p));
}

/** 켤 것인가 — 집행 쪽이 이것으로 `scene.fogNode` 를 달지 말지 정한다 */
export function groundFogEnabled(p: GroundFogParams): boolean {
  return p.strength > 0;
}

// ── 노드 빌더 ────────────────────────────────────────────────────────────────
//
// `three/tsl` 을 **import 하지 않는다.** 주입받는다 — 그래야 이 파일이 노드에서 스텁으로
// 돌고(브라우저 0·WebGPU 0 환경), 그래프가 무엇을 참조하는지 테스트가 셀 수 있다.
// 실물 주입은 각 트리의 feature 가 `import * as tsl from 'three/tsl'` 로 한다.

/** TSL 노드의 최소 형태 — 여기서 쓰는 메서드만 */
export interface TslNodeLike {
  negate(): TslNodeLike;
  sub(b: TslNodeLike | number): TslNodeLike;
  mul(b: TslNodeLike | number): TslNodeLike;
  add(b: TslNodeLike | number): TslNodeLike;
  setGroup?(g: unknown): TslNodeLike;
}

/** `three/tsl` 에서 실제로 쓰는 것만. 전부 0.171 에 있다(실측 2026-09-04) */
export interface TslLike {
  fog(color: TslNodeLike, factor: TslNodeLike): unknown;
  reference(name: string, type: string, obj: object): TslNodeLike;
  positionWorld: { y: TslNodeLike };
  positionView: { z: TslNodeLike };
  smoothstep(e0: TslNodeLike | number, e1: TslNodeLike | number, x: TslNodeLike): TslNodeLike;
  float(v: number): TslNodeLike;
  exp(x: TslNodeLike): TslNodeLike;
  saturate(x: TslNodeLike): TslNodeLike;
  /** 프레임당 1회 갱신 그룹. three 내부의 `updateFog` 가 쓰는 것과 같다 */
  renderGroup?: unknown;
}

/** `scene.fog` 의 최소 형태 — `reference` 가 이 객체의 필드를 uniform 으로 읽는다 */
export interface FogLike { color: unknown; near: number; far: number }

/**
 * `scene.fogNode` 에 넣을 노드를 조립한다.
 *
 * 색·near·far 는 **`fog` 객체를 참조**한다 — 값을 복사하지 않는다. 그래서 `sky.js` 가
 * `scene.fog.color` 를 크로스페이드하면 이 노드도 따라간다. 부팅 때 **한 번만** 부른다:
 * fogNode 는 재질 캐시키에 들어가므로 세션 중 교체하면 파이프라인이 다시 구워져
 * [7] 개수 불변식이 계단을 낸다.
 */
export function buildGroundFogNode(tsl: TslLike, fog: FogLike, p: GroundFogParams): unknown {
  const grp = tsl.renderGroup;
  const ref = (name: string, type: string) => {
    const n = tsl.reference(name, type, fog);
    return grp !== undefined && typeof n.setGroup === 'function' ? n.setGroup(grp) : n;
  };
  const color = ref('color', 'color');
  const near = ref('near', 'float');
  const far = ref('far', 'float');

  const viewZ = tsl.positionView.z.negate();
  const range = tsl.smoothstep(near, far, viewZ);
  const height = tsl.saturate(tsl.exp(tsl.float(p.h0).sub(tsl.positionWorld.y).mul(p.k)));
  const ground = height.mul(tsl.smoothstep(tsl.float(0), near, viewZ)).mul(p.strength);
  const factor = range.add(ground).sub(range.mul(ground));
  return tsl.fog(color, factor);
}
