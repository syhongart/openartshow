// 밤 조명 하한의 **집행**. 판정은 `decide/night.ts` 가 한다.
//
// ── 왜 `systems/sky.ts` 안이 아니라 별도 파일인가 ───────────────────────────
// 처음에는 `SkySystem` 의 private 메서드로 넣었다. 그러면 테스트가 이 로직을 **다시
// 적어야** 하고, 그것이 곧 값 미러링이다 — 한쪽만 고쳐도 아무도 모른다. 이 저장소가
// 색·수치·임계값에서 세 번 겪은 사고가 정확히 그것이다.
//
// 여기로 빼면 테스트가 **실제로 돌아가는 함수**를 부른다. 그것이 판정/집행 분리의
// 경계를 실제로 검사하는 유일한 방법이다.
//
// ── 왜 three 타입을 안 쓰는가 ───────────────────────────────────────────────
// 필요한 모양은 `intensity` 와 `r/g/b` 뿐이다. 구조적 타입으로 두면 테스트가 가벼운
// 스텁으로 실제 코드를 돌릴 수 있고, `three` 와 `three/webgpu` 의 타입 네임스페이스
// 차이(TS2694)도 비껴간다.

import { nightness, nightFloor, type NightTune } from '../decide/night.js';

/** 채널을 직접 만질 수 있는 색. `THREE.Color` 가 이 모양이다 */
export interface MutableColor {
  r: number;
  g: number;
  b: number;
}

export interface HemiLike {
  intensity: number;
  color: MutableColor;
  groundColor: MutableColor;
}

export interface SunLike {
  intensity: number;
}

/** 톤매핑 노출을 가진 것. `WebGPURenderer`·`WebGLRenderer` 가 이 모양이다 */
export interface ExposureLike {
  toneMappingExposure: number;
}

/** 색을 가진 안개. `THREE.Fog`·`THREE.FogExp2` 가 이 모양이다 */
export interface FogLike {
  color: MutableColor;
}

/**
 * 밤 밝기를 얹을 대상들. **전부 선택**이다.
 *
 * 없는 것은 건너뛴다 — 하늘 기능을 빼면 안개도 노출도 손대지 않은 채로 남아야 하고,
 * 테스트가 조명만 스텁으로 넘겨도 그 부분이 검사돼야 한다.
 */
export interface NightTargets {
  hemi: HemiLike;
  sun: SunLike;
  renderer?: ExposureLike | null;
  fog?: FogLike | null;
}

/**
 * 밤이면 조명을 하한까지 끌어올린다. 낮이면 **아무것도 하지 않는다.**
 *
 * ── 멱등하다 ────────────────────────────────────────────────────────────────
 * 매 프레임 호출해도 결과가 같다. 배수를 곱하는 방식이었다면 프레임마다 곱해져
 * 발산했을 것이고, 그러면 "언제 `sky.js` 가 값을 덮어쓰는가" 를 정확히 알아야 한다.
 * 그 지식은 `sky.js` 가 바뀌는 순간 어긋난다.
 *
 * ── 이미 밝은 값은 내리지 않는다 ────────────────────────────────────────────
 * `sky.js` 는 번개에 `hemi +4.0` · `sun +1.6` 을 순간 가산한다. 하한이 그것을 덮으면
 * 번개가 사라진다. max 는 이 경우에도 옳게 동작한다.
 */
export function applyNightFloor(
  targets: NightTargets, time: string, tune?: NightTune,
): void {
  const { hemi, sun } = targets;
  const f = nightFloor(nightness(time), tune);

  // ── 노출은 조기 반환 **앞**이다 ──────────────────────────────────────────
  // 나머지는 전부 하한(max)이라 낮에는 계산해도 no-op 이지만, 노출은 **대입**이다.
  // 낮 프레임이 해야 할 일이 "밤에 올린 값을 1로 되돌리는 것" 이라, 조기 반환 뒤에
  // 두면 시간대를 낮으로 바꿔도 노출이 밤에 머문다. 테스트가 이걸 잡았다.
  if (targets.renderer) targets.renderer.toneMappingExposure = f.exposure;

  if (f.hemiI <= 0) return; // 낮 — 조명·안개는 손대지 않는다
  if (hemi.intensity < f.hemiI) hemi.intensity = f.hemiI;
  if (sun.intensity < f.sunI) sun.intensity = f.sunI;
  liftColor(hemi.groundColor, f.ground);
  liftColor(hemi.color, f.sky);

  // ── 안개 ────────────────────────────────────────────────────────────────
  // 위 넷은 **재질에 닿는 빛**을 키운다. 그래서 건물·지면은 밝아져도 하늘 돔(자체
  // 발광 캔버스)과 안개는 그대로다. 감독이 밤을 밝힌 **뒤에도** "어둡다" 고 한 것이
  // 그 구조 때문이다 — 화면에서 넓은 면적을 차지하는 쪽이 안 움직였다.
  if (targets.fog) liftColor(targets.fog.color, f.fog);
}

/**
 * 색의 각 채널을 하한까지 끌어올린다.
 *
 * **채널별** max 라 색조가 조금 변할 수 있는데 그것이 의도다 — 어두운 채널만 올라오므로
 * "검게 죽은 쪽" 이 먼저 살아난다. 밤 지면색(`0x232a24`)에서 초록·파랑이 특히 낮아,
 * 그 둘이 올라오면서 바닥이 푸른 달빛을 받은 것처럼 읽힌다.
 */
function liftColor(c: MutableColor, floor: readonly [number, number, number]): void {
  if (c.r < floor[0]) c.r = floor[0];
  if (c.g < floor[1]) c.g = floor[1];
  if (c.b < floor[2]) c.b = floor[2];
}
