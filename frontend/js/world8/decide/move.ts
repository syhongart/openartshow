// world8/decide/move.ts — **걷기·보기의 순수 판정.** three 도 DOM 도 안 만진다.
//
// ── 왜 떼어냈나 (팀장 조건 ②, 2026-08-19) ──────────────────────────────────
// **팀장 조건이고, 633줄이 실제로 과했다.** 그 둘이 이유의 전부다.
//
// ⚠ **이 자리에 원래 *"게이트가 막았다 … 우회하지 않고 따른다"* 라고 적혀 있었고 그것은
// 부정확했다**(검수관 반려 B3). `check:filesize` 는 파일이 **커지는 것**을 막는 게 아니라
// **몰래 커지는 것**을 막는다 — 그 파일 헤더가 *"그 진척은 `--write` 로 다시 구워
// 기록한다"* 로 기록이 정상 사용법임을 명시하고, 실제로 이번 회차가 `features/overlay.ts`
// 를 +8줄 늘리고 기록하는 그 경로를 밟았다.
//
// **왜 이 정정이 중요한가**: 틀린 채로 두면 다음 사람이 이 게이트를 「우회 불가능한 벽」으로
// 학습한다. 그리고 정정을 커밋 메시지에만 적었던 것이 반려 사유였다 — **커밋 메시지는
// 다음 사람이 읽는 자리가 아니다**(지난 회차 P-4 *"확인할 수 없는 주소는 주소가 아니다"*와
// 같은 형태). 판정은 값 옆에 적는다.
//
// ── 무엇을 담는가 — 「player.ts 의 순수 부분」이 정직한 답이다 ──────────────
// 이동(`moveDelta`·`moveFromAxes`·`facing`) · 걷는 감각(헤드밥·속도) · 시선 한계
// (`clampPitch`) · 편집 궤도의 상한과 복원 걸음(`LIFT_MAX`·`RESTORE_STEP`).
//
// ⚠ 이 넷이 한 주제로 묶이지는 **않는다.** 「이동」이라는 파일명이 `clampPitch` 나
// `LIFT_MAX` 까지 덮지는 못한다 — 그래서 이름이 무엇을 약속하는지 여기 적어 둔다:
// **「플레이어가 어떻게 움직이고 어디까지 보는가」의 파라미터와 순수 계산.**
// 더 잘게 가르는 것(예: 궤도 상수를 `decide/orbit.ts` 로)은 **행위 불변 분해의 범위를
// 넘는다** — 이 회차는 옮기기만 하고 재배치는 안 한다. 그것이 「행위 불변」을 diff 로
// 보이게 하는 유일한 방법이다.
//
// ── 소비자는 **한 줄도 안 바뀐다** ──────────────────────────────────────────
// `systems/player.ts` 가 이 모듈을 그대로 재수출한다. 제품 2곳(`main.ts`·
// `features/types.ts`)과 테스트 9개가 예전 경로로 계속 import 하고, 그래서 팀장 조건의
// **「기존 테스트 단언 무수정」이 구조적으로** 지켜진다(고쳐야 할 단언이 애초에 없다).
// 순환은 없다 — 이 파일은 `systems/` 를 부르지 않는다(`check:cycles` 가 본다).


export interface MoveInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  /** 달리기 */
  fast: boolean;
}

export const NO_INPUT: MoveInput = { forward: false, back: false, left: false, right: false, fast: false };

/**
 * 이번 프레임의 이동량. yaw는 라디안(+Z가 정면 0).
 *
 * **대각선을 정규화한다.** 안 하면 W+D가 W보다 √2배 빨라진다 — 플레이어는 이걸 버그로
 * 인지하지 못하고 그냥 대각선으로만 다니게 되고, 그러면 스트리밍 look-ahead 판정도 함께
 * 왜곡된다.
 */
export function moveDelta(
  input: MoveInput, yaw: number, speed: number, dt: number,
): { dx: number; dz: number } {
  let ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let az = (input.back ? 1 : 0) - (input.forward ? 1 : 0);
  const len = Math.hypot(ax, az);
  if (!(len > 0)) return { dx: 0, dz: 0 };
  // 키보드는 켜짐/꺼짐뿐이라 대각선을 길이 1로 **정규화**한다.
  ax /= len; az /= len;
  return moveFromAxes(ax, az, yaw, speed, dt, input.fast);
}

/**
 * 축 값(-1~1) → 이동량. 조이스틱처럼 **크기가 의미 있는** 입력이 쓴다.
 *
 * 여기서는 정규화하지 않고 **클램프**한다. 정규화하면 살짝 민 조이스틱도 전속력이 되어
 * 아날로그 조작이 무의미해진다. 반대로 클램프를 빼면 대각선이 √2배 빨라진다 —
 * 두 가지를 동시에 피하는 지점이 "길이가 1을 넘을 때만 자른다"이다.
 */
export function moveFromAxes(
  ax: number, az: number, yaw: number, speed: number, dt: number, fast = false,
): { dx: number; dz: number } {
  if (!Number.isFinite(ax) || !Number.isFinite(az)) return { dx: 0, dz: 0 };
  const len = Math.hypot(ax, az);
  if (!(len > 0)) return { dx: 0, dz: 0 };
  const k = len > 1 ? 1 / len : 1; // 1 초과만 자른다(작은 기울임은 그대로 느리게)
  const s = speed * (fast ? RUN_MULT : 1) * dt;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const x = ax * k, z = az * k;
  // 로컬 축(x=우, z=앞이 음수)을 월드로 옮긴다. 기저는 카메라 자세에서 나온다:
  //   forward = (-sin, -cos)  ← facing()과 같은 식
  //   right   = ( cos, -sin)  ← forward를 y축으로 90° 돌린 것
  // 이동 = x·right + (-z)·forward 를 전개한 것이 아래 두 줄이다.
  //
  // 부호를 한 번 틀린 적이 있다. yaw=0에서는 두 식이 우연히 같아서 통과했고, 시선을
  // 돌린 뒤에야 좌우가 뒤집혔다(90°에서 정확히 반대편). 그래서 이 함수의 테스트는
  // 반드시 **여러 yaw에서 facing과 일치하는지**로 해야 한다 — 속력만 비교하면 못 잡는다.
  return {
    dx: (x * cos + z * sin) * s,
    dz: (-x * sin + z * cos) * s,
  };
}

/** 시야 방향 단위벡터(XZ). 스트리밍 look-ahead가 쓴다. */
export function facing(yaw: number): { x: number; z: number } {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}

// ── 걷는 감각 ────────────────────────────────────────────────────────────────
//
// 감독 판정: **"땅에 붙어가는 느낌이야."**
//
// 눈높이를 의심할 자리가 아니었다. 실측하면 셋이 전부 같은 1.7m 이다 —
// 라이브 미술관(`config.ts` EYE_HEIGHT) · world1 오픈월드 · world2. 다른 것은 둘이었다:
//
//   | | 걷기 속도 | 헤드밥 |
//   |---|---|---|
//   | 라이브 미술관 | 2.5 m/s (달리기 4.5) | 있음 |
//   | world1        | 3.0 m/s              | — |
//   | **world2(전)**| **9.0 m/s (달리기 19.8)** | **없음** |
//
// 9m/s 는 사람 걷기(1.4m/s)의 6.4배이고 Shift 를 누르면 19.8m/s — 시속 71km 다.
// **스케일 감각은 절대 높이가 아니라 높이 대비 속도로 들어온다.** 같은 1.7m 라도 그
// 높이에서 그렇게 미끄러지면 시점이 낮게 읽힌다. 그리고 헤드밥이 없으면 발이 땅을 딛는
// 신호가 하나도 없어 걷는 게 아니라 활강하는 느낌이 된다 — "붙어**간다**" 가 이것이다.
//
// 원인이 둘인데 하나만 고치면 안 된다. 속도만 내리면 여전히 미끄러지고, 헤드밥만 넣으면
// 19.8m/s 로 흔들리며 날아간다. 이 프로젝트가 이미 두 번 겪은 **상쇄** 형태다.

/** 헤드밥 진폭(m). 라이브(`player.js` BOB_AMPLITUDE=0.03)보다 크다 — 오픈월드는 걸음이 빠르다 */
export const BOB_AMPLITUDE = 0.045;
/** 헤드밥 각속도(rad/s). 걷기 속도에서의 값이고, 실제로는 속력 비율이 곱해진다 */
export const BOB_FREQ = 7.5;
/**
 * 기본 걷기 속도(m/s). 9 에서 내렸다.
 *
 * 9 는 실수가 아니라 **세계 크기와 묶인 값**이었다 — 섬 지름 480m 를 53초에 건너도록
 * 잡았다. 그래서 라이브와 같은 2.5 로 내릴 수는 없다(3분 넘게 걸려 세계가 지루해진다).
 * 5.0 이면 걸어서 96초·달려서 44초 — 넓다는 감각은 남기고 자동차 속도만 없앤다.
 */
export const WALK_SPEED = 5;
/** 달리기 배수. 5 × 2.2 = 11m/s — 전력질주 상한 근처다(예전 19.8은 시속 71km였다) */
export const RUN_MULT = 2.2;

/**
 * 헤드밥 위상을 진행시킨다. **속력 비율에 비례**해야 빨리 걸을 때 빨리 흔들린다.
 *
 * 고정 각속도로 돌리면 살금살금 걸어도 뛰는 리듬으로 흔들려 발과 화면이 어긋난다.
 */
export function stepBobPhase(phase: number, ratio: number, dt: number): number {
  return phase + dt * BOB_FREQ * Math.max(0, ratio);
}

/**
 * 위상·강도 → 카메라 y 오프셋(m).
 *
 * `amp` 를 인자로 받는 이유는 **끌 수 있어야 하기 때문**이다(`?bob=0`). 상수를 직접
 * 읽으면 감독이 실기기에서 끄고 비교할 수단이 없다.
 */
export function bobHeight(phase: number, intensity: number, amp = BOB_AMPLITUDE): number {
  return Math.sin(phase) * amp * Math.max(0, Math.min(1, intensity));
}

/**
 * 편집 궤도로 올라갈 수 있는 최대 눈높이 가산(m).
 *
 * 40m 인 근거: 마을에서 가장 높은 파츠가 시계탑이고 건물이 12m 언저리다. 그 두 배를
 * 넘게 올라가면 파셀 하나가 화면에 다 들어와 «어느 구역을 보고 있나» 가 오히려 흐려진다.
 *
 * ⚠ **화면에서만 판정된다.** 이 값은 근거가 아니라 출발점이고, 감독이 «더 올라가고
 * 싶다» 고 하면 노브로 열어 판정을 받는다.
 */
export const LIFT_MAX = 40;

/**
 * 편집 종료 복원을 나누는 **걸음 길이(m)**. 근거는 충돌 캐시의 커버 범위다.
 *
 * `systems/collision.ts` 의 `Collider.resolve` 는 넘겨받은 자리 기준 3×3 파셀만 캐시하고,
 * 그 파일이 실측해 적어 둔 여유가 **«플레이어 앞뒤로 최소 `cellX`»** 다(지금 32m).
 * 걸음이 그 안에 있으면 목표가 언제나 캐시 안에 든다.
 *
 * 8m 는 그 여유의 **4분의 1** — `Math.round` 를 쓰는 이유와 같은 논리다(결함을 막아서가
 * 아니라 마진을 벌어서). 최악(반경 80m 반대편, 160m)에도 20걸음이고, 편집을 끌 때
 * 한 번뿐이라 비용이 화면에 안 나타난다.
 *
 * ⚠⚠ **「최악 160m·20걸음」이 비행에서는 더 이상 최악이 아니다**(검수관 P2, 2026-08-19).
 * 궤도는 반경 상한이 80m 라 그 계산이 유계였는데 **비행은 수평 상한이 없다** — Shift 로
 * 30초만 날면 약 1.3km 이고 `ceil(1320/8) = 165 걸음`, 걸음마다 `Collider.resolve` 가
 * 3×3 파셀 캐시를 다시 세운다. *"비용이 화면에 안 나타난다"* 는 그 규모에서 미실측이다.
 * → **재론 조건: 셀이 8m 이하로 줄거나, 비행이 복원 출발점을 세우는 경로가 생기면**
 * (후자는 2026-08-19 에 이미 생겼다 — 실비용은 아직 안 쟀다. `docs/BACKLOG.md` 의 `G-FLY7`).
 *
 * ⚠ **셀 크기를 여기서 읽지 않는다** — `PlayerSystem` 은 충돌 구현도 레이아웃도 모르고
 * (`resolveMove` 를 주입받을 뿐이다), 그것을 알게 하면 이 클래스가 세계 지형에 묶인다.
 * 대신 **그 전제를 테스트가 실제 `Collider` 로 지킨다**(`tests/world2-player-orbit.test.ts`).
 * 셀이 8m 이하로 줄면 그 축이 빨간불이 되고, 그때 이 값을 재론한다.
 */
export const RESTORE_STEP = 8;

/** 피치를 수직 한계 안으로 가둔다 — 넘어가면 화면이 뒤집힌다. */
export function clampPitch(pitch: number): number {
  const lim = Math.PI / 2 - 0.05;
  return Math.min(lim, Math.max(-lim, pitch));
}
