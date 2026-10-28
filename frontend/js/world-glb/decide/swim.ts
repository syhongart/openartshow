// world-glb/decide/swim.ts — 물에 빠진다는 것. 순수 함수만, three 의존 0.
//
// 감독 지시 2026-07-31: *"강에 사람이 빠지게해줘"*
//
// ── 무엇이 문제였나 ──────────────────────────────────────────────────────────
// `PlayerSystem` 의 y 는 **상수**였다(`eye` + 헤드밥). 지형 높이 개념이 없으니 강이든
// 바다든 그 위를 **걸어서 건넜다.** 감독이 강을 스폰 정면으로 옮겨 달라고 한 직후에
// 이 지시가 온 것이 그래서다 — 물이 눈앞에 오자 물 위를 걷는 것이 보였다.
//
// ── 왜 이 파일이 따로 있나 ───────────────────────────────────────────────────
// "여기가 물인가" 는 `decide/water.ts` 가 답한다. 이 파일은 그 답을 **소비해서** 몸이
// 어떻게 되는지만 정한다 — 물의 모양이 바뀌어도 여기는 안 바뀌고, 가라앉는 속도를
// 조정해도 물의 모양은 안 바뀐다.
//
// 그리고 여기는 **어디가 물인지 묻지 않는다.** 잠김 여부를 인자로 받는다. 그래야
// 테스트가 강을 만들지 않고도 이 파일 전부를 돌릴 수 있고, 나중에 수영장이든 분수대든
// 다른 물이 생겨도 이 파일을 고칠 일이 없다.
//
// ── 못 정하는 것 ─────────────────────────────────────────────────────────────
// 화면이 실제로 물속처럼 보이는지는 못 정한다(그건 오버레이 색과 감독 육안의 일이다).
// 여기가 정하는 것은 **얼마나 잠겼는가** 하나다.

/**
 * 완전히 잠기는 데 걸리는 시간(초).
 *
 * 즉시 내리면 물가에 발을 딛는 순간 화면이 **툭 떨어져** 순간이동으로 읽힌다. 반대로
 * 너무 느리면 물 위를 한참 걸어간 뒤에야 가라앉아 인과가 안 보인다.
 */
export const SINK_SECONDS = 1.6;

/**
 * 물 밖으로 나와 원래 높이를 되찾는 데 걸리는 시간(초). **가라앉는 것보다 빠르다.**
 *
 * 비대칭인 것이 의도다. 빠지는 것은 사고이므로 천천히 실감 나야 하고, 빠져나오는 것은
 * 플레이어가 **의도한 조작**이라 즉각 응답해야 답답하지 않다. 같은 값으로 두면 뭍에
 * 올라선 뒤에도 한참 물속 화면이 남아 조작이 먹지 않는 것처럼 느껴진다.
 */
export const RISE_SECONDS = 0.9;

/**
 * 물속 이동 속도 배수.
 *
 * 0 이면 물에 갇혀 세계를 못 벗어난다 — 이 프로젝트에는 리스폰이 없으므로 **걸어서
 * 나오는 것이 유일한 탈출로**다. 그 길을 막으면 새로고침 말고는 방법이 없어진다.
 * 0.45 는 물이 확실히 무겁게 느껴지면서 몇 초면 물가에 닿는 값이다.
 */
export const SWIM_SPEED_MULT = 0.45;

/**
 * 물속 화면 틴트의 **상한** 알파.
 *
 * 1 로 두면 완전 암전이라 어느 쪽이 뭍인지 안 보이고, 위의 `SWIM_SPEED_MULT` 주석이
 * 지키려던 탈출로가 화면 쪽에서 다시 막힌다. 물에 빠진 것은 분명히 보이되 **길은
 * 보이는** 세기다.
 */
export const UNDERWATER_MAX_ALPHA = 0.72;

/**
 * 틴트가 상한에 닿는 잠수 깊이(m). 눈이 수면 아래로 이만큼 내려가면 최대다.
 *
 * 수면을 막 넘는 순간부터 상한이면 물가에서 화면이 번쩍인다. 사람 눈높이(1.7m)보다
 * 작게 잡아, 바닥에 발을 딛고 서면 이미 상한에 닿아 있도록 한다.
 */
export const UNDERWATER_FULL_DEPTH = 1.2;

/**
 * 잠김 정도를 한 프레임 진행시킨다. `0` = 마른 땅, `1` = 완전히 가라앉음.
 *
 * **시간으로 보간한다**(위치가 아니라). 물에 들어간 깊이로 바로 정하면 물가를 한 발
 * 넘나들 때마다 화면이 오르내려 멀미가 난다. 시간 보간이면 잠깐 스친 물은 거의
 * 영향이 없고, 머무를수록 가라앉는다 — 인과가 화면에 그대로 보인다.
 *
 * @param current 직전 프레임의 잠김 정도(0~1)
 * @param inWater 지금 물 위에 서 있는가
 * @param dt 프레임 간격(초)
 */
export function stepSubmersion(current: number, inWater: boolean, dt: number): number {
  // 탭 전환 후 첫 프레임에 dt 가 몇 초로 튀는 일이 실제로 있다. 그때 한 번에 완전히
  // 가라앉거나 솟구치는 것을 막는다 — 값이 유한하지 않은 경우도 같이 막힌다.
  const step = Number.isFinite(dt) ? Math.max(0, Math.min(0.25, dt)) : 0;
  const from = Number.isFinite(current) ? Math.max(0, Math.min(1, current)) : 0;
  const seconds = inWater ? SINK_SECONDS : RISE_SECONDS;
  const delta = (step / seconds) * (inWater ? 1 : -1);
  return Math.max(0, Math.min(1, from + delta));
}

/**
 * 잠김 정도 → 카메라 눈높이(m).
 *
 * 물에 완전히 잠기면 발이 해저를 딛으므로 눈은 `해저 + 눈높이` 에 온다. 그 사이는
 * 선형 보간이다.
 *
 * **`groundEye` 를 인자로 받는 이유**는 헤드밥 때문이다. 여기서 눈높이 상수를 직접
 * 읽으면 헤드밥이 물에서만 사라지고, 그 어긋남은 물 밖에서는 절대 안 보인다.
 * 호출자가 이미 흔들림을 얹은 값을 넘긴다.
 *
 * @param submersion 잠김 정도(0~1)
 * @param groundEye 뭍에서의 눈높이(헤드밥 포함)
 * @param seabedY 해저 높이(m, 음수)
 * @param eyeHeight 발바닥에서 눈까지(m)
 */
export function eyeYAt(
  submersion: number, groundEye: number, seabedY: number, eyeHeight: number,
): number {
  const t = Number.isFinite(submersion) ? Math.max(0, Math.min(1, submersion)) : 0;
  const sunk = seabedY + eyeHeight;
  return lerp(groundEye, sunk, t);
}

/**
 * 선형 보간. **`a + (b − a)·t` 가 아니라 이 형태를 쓴다.**
 *
 * 두 식은 수학적으로 같지만 부동소수에서는 다르다. `t = 1` 일 때 앞의 식은
 * `a + (b − a)` 를 계산하므로 뺄셈·덧셈에서 오차가 남는다 — 실제로 `swimSpeedMult(1)`
 * 이 `0.45` 가 아니라 `0.44999999999999996` 을 줘서 테스트가 깨졌다.
 *
 * 그때 단언을 `toBeCloseTo` 로 늘리는 것이 손쉬운 길이었지만, 그건 **테스트를 느슨하게
 * 만들어 통과시키는 것**이다. 이 식은 `t = 0` 과 `t = 1` 에서 각각 `a`·`b` 를 정확히
 * 돌려주므로 끝점을 정확히 단언할 수 있다.
 */
function lerp(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

/**
 * 물속 화면 틴트의 알파(0~`UNDERWATER_MAX_ALPHA`).
 *
 * **눈 높이와 수면만 비교한다** — 잠김 정도로 계산하지 않는다. 둘은 다른 일이다:
 * 잠김이 0.5 여도 그 순간 눈이 아직 수면 위면 물속 화면이 아니어야 한다. 잠김으로
 * 재면 몸이 반쯤 잠긴 것과 **눈이 잠긴 것**을 구별하지 못한다.
 *
 * 그래서 뭍에서는 이 함수가 정확히 0 을 준다. 마른 땅에서 화면이 파래지는 것은
 * 세기가 약해서 안 보이는 문제가 아니라 판정이 틀린 것이라, 0 이 나오는 것 자체를
 * 테스트가 지킨다.
 */
export function underwaterAlpha(eyeY: number, surfaceY: number): number {
  if (!Number.isFinite(eyeY) || !Number.isFinite(surfaceY)) return 0;
  const depth = surfaceY - eyeY;         // 눈이 수면 아래로 내려간 깊이
  if (!(depth > 0)) return 0;            // 수면 위 — 물속이 아니다
  const t = Math.min(1, depth / UNDERWATER_FULL_DEPTH);
  return t * UNDERWATER_MAX_ALPHA;
}

/**
 * 잠김 정도 → 이동 속도 배수.
 *
 * 잠기는 **도중**에도 비례해 무거워진다. 완전히 잠긴 뒤에만 느려지게 하면, 가라앉는
 * 1.6초 동안은 물 위를 평소 속도로 달릴 수 있어 강을 그냥 가로질러 버린다 —
 * 이 지시가 고치려던 바로 그 그림이다.
 */
export function swimSpeedMult(submersion: number): number {
  const t = Number.isFinite(submersion) ? Math.max(0, Math.min(1, submersion)) : 0;
  return lerp(1, SWIM_SPEED_MULT, t);
}
