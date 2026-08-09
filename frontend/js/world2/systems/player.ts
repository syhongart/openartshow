// world2/systems/player.ts — 이동 입력 → 위치.
//
// 이동 계산은 순수 함수로 떼어 둔다(`moveDelta`). 현행에서 이동·카메라·충돌이 한 함수에
// 엉켜 "대각선이 빠른" 정규화 버그를 오래 못 잡았는데, 그건 계산만 따로 볼 수 없어서였다.

import type { FrameCtx, System } from '../kernel.js';
import { stepSubmersion, eyeYAt, underwaterAlpha, swimSpeedMult } from '../decide/swim.js';

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

/** 피치를 수직 한계 안으로 가둔다 — 넘어가면 화면이 뒤집힌다. */
export function clampPitch(pitch: number): number {
  const lim = Math.PI / 2 - 0.05;
  return Math.min(lim, Math.max(-lim, pitch));
}

export interface PlayerOptions {
  speed?: number;
  eyeHeight?: number;
  /** 헤드밥 진폭(m). **0이면 끈다** — 감독 실기기 비교용(`?bob=0`) */
  bobAmplitude?: number;
  /**
   * 시작 위치. `yaw` 는 **있을 때만** 적용한다(rad) — 없으면 지금까지처럼 0 이다.
   *
   * 물가 스폰(`?at=river|sea`)이 물 쪽을 보게 하려고 열었다. 좌표만 옮기면 바다에
   * 세워 놓고 **도시를 보게 하는** 일이 생기고(실측 2026-08-07), 그러면 "링크 하나로
   * 확인" 이라는 노브의 목적이 절반만 달성된다.
   */
  start?: { x: number; z: number; yaw?: number };
  /** 카메라에 위치·회전을 반영한다 */
  applyCamera?: (x: number, y: number, z: number, yaw: number, pitch: number) => void;

  // ── 물에 빠진다 (감독 지시 2026-07-31 *"강에 사람이 빠지게해줘"*) ────────────
  //
  // **주입으로 받는다.** 이 파일은 `decide/water.ts` 를 import 하지 않는다 — 물의 모양을
  // 알면 플레이어가 세계 지형에 묶이고, 테스트가 강을 만들어야 이 클래스를 돌릴 수 있게
  // 된다. 지금은 "물이면 이 높이" 라는 함수 하나만 알면 되고, 그 함수가 강에서 오든
  // 수영장에서 오든 여기는 모른다.
  //
  // 세 개를 **다 주지 않으면 물에 안 빠진다**(예전과 똑같이 동작한다). 빌더 미리보기처럼
  // 지형이 없는 화면에서 물 판정을 붙일 이유가 없기 때문이다.

  /** 이 좌표의 수면 높이(m). 물이 아니면 `null`. 안 주면 물 판정을 하지 않는다 */
  waterSurfaceY?: (x: number, z: number) => number | null;

  // ── 벽에 막힌다 (감독 지시 2026-08-08 태스크 #182) ───────────────────────
  //
  // **물과 같은 주입 형태다.** 이 파일은 `decide/collide.ts` 도 세계의 건물 배치도
  // 모른다 — "여기서 이만큼 움직이면 실제로는 어디까지 가는가" 라는 함수 하나만 안다.
  // 그래서 빌더 미리보기처럼 세계가 없는 화면에서는 안 주면 그만이고(예전과 똑같이
  // 통과한다), 테스트는 도시를 세우지 않고도 벽을 흉내낼 수 있다.
  /** 이동 해석. 안 주면 충돌 없이 그대로 간다(예전 동작) */
  resolveMove?: (x: number, z: number, dx: number, dz: number) => { x: number; z: number };
  /** 해저 높이(m). 완전히 잠기면 여기에 발이 닿는다 */
  seabedY?: number;
  /**
   * 물속 화면 틴트의 알파(0~1)를 매 프레임 알린다.
   *
   * **여기서 DOM 을 만지지 않는다.** 그리는 일은 화면 소유자(`main.ts`)의 몫이고, 이
   * 클래스는 수치만 낸다 — 그래야 헤드리스 테스트가 알파를 직접 읽어 검사할 수 있다.
   */
  onSubmerge?: (alpha: number) => void;
}

export class PlayerSystem implements System {
  readonly name = 'player';

  private x: number;
  private z: number;
  private yaw = 0;
  private pitch = 0;
  private readonly speed: number;
  private readonly eye: number;
  private readonly bobAmp: number;
  private readonly apply?: PlayerOptions['applyCamera'];
  private input: MoveInput = { ...NO_INPUT };
  /** 아날로그 축(조이스틱). 키보드 입력과 **합산하지 않고** 큰 쪽을 쓴다 */
  private axes = { x: 0, z: 0 };
  /** 실제로 움직인 방향(스트리밍 look-ahead용). 멈추면 마지막 방향을 유지한다 */
  private moveDir = { x: 0, z: 0 };
  /**
   * 실제로 낸 속력 ÷ 걷기 속도, 평활값(0~1). 스트리밍 look-ahead 가 읽는다.
   *
   * **1 로 시작한다** — 아직 한 번도 안 움직인 것은 *"막혔다"* 가 아니다. 0 으로 두면
   * 부팅 직후 가만히 서 있는 동안 look-ahead 가 접혀, 이 필드가 생기기 전의 동작(항상
   * 전개)이 이유 없이 바뀐다.
   */
  private moveFactor = 1;
  /** 헤드밥 위상(rad) */
  private bobPhase = 0;
  /**
   * 헤드밥 강도(0~1). 목표값을 **바로 쓰지 않고 따라가게** 하는 이유는 출발·정지 때문이다 —
   * 속력을 그대로 쓰면 키를 떼는 순간 흔들림이 툭 끊겨 화면이 튄다.
   */
  private bobIntensity = 0;

  /** 잠김 정도(0~1). `decide/swim.ts` 가 시간으로 진행시킨다 */
  private submersion = 0;
  /**
   * 마지막으로 밟은 물의 수면 높이. 물 밖으로 나오는 **도중**에 쓴다.
   *
   * 물이 아니면 수면 높이가 없는데(`null`), 그렇다고 틴트를 0 으로 끊으면 뭍에 발을
   * 딛는 순간 물속 화면이 툭 사라진다 — 아직 눈이 수면 아래인데도. 마지막 수면을
   * 기억해 두면 눈이 실제로 올라오는 동안 틴트가 자연히 옅어진다.
   */
  private lastSurfaceY: number | null = null;
  private readonly waterSurfaceY?: PlayerOptions['waterSurfaceY'];
  private readonly resolveMove?: PlayerOptions['resolveMove'];
  private readonly seabed: number;
  private readonly onSubmerge?: PlayerOptions['onSubmerge'];

  constructor(opts: PlayerOptions = {}) {
    this.speed = opts.speed ?? WALK_SPEED;
    this.eye = opts.eyeHeight ?? 1.7;
    this.bobAmp = opts.bobAmplitude ?? BOB_AMPLITUDE;
    this.x = opts.start?.x ?? 0;
    this.z = opts.start?.z ?? 0;
    // `?? 0` 이 아니라 조건이다 — 아래 `yaw` 필드 초기값이 0 이고, 여기서 다시 0 을
    // 대입하면 "기본값을 두 곳이 적는" 형태가 된다.
    if (opts.start?.yaw !== undefined) this.yaw = opts.start.yaw;
    this.apply = opts.applyCamera;
    this.waterSurfaceY = opts.waterSurfaceY;
    this.resolveMove = opts.resolveMove;
    // 기본값을 두지 않는다 — 물 판정을 안 주면 어차피 안 쓰이고, 숫자를 여기 적으면
    // `decide/water.ts` 의 `SEABED_Y` 와 값 미러링이 된다.
    this.seabed = opts.seabedY ?? 0;
    this.onSubmerge = opts.onSubmerge;
  }

  setInput(input: Partial<MoveInput>): void {
    this.input = { ...this.input, ...input };
  }

  /** 조이스틱 축을 넣는다. x=우, z=앞(음수가 전진 — 화면 위로 민 것). */
  setAxes(x: number, z: number): void {
    this.axes.x = Number.isFinite(x) ? x : 0;
    this.axes.z = Number.isFinite(z) ? z : 0;
  }

  /** 마우스 델타(픽셀)를 시선에 반영한다. 감도를 여기서 곱한다. */
  look(dx: number, dy: number, sensitivity = 0.0025): void {
    this.lookBy(-dx * sensitivity, -dy * sensitivity);
  }

  /**
   * **라디안 델타**를 직접 더한다. 감도를 이미 적용한 호출자(터치 조작)가 쓴다 —
   * `look()`에 넘기면 감도가 두 번 곱해진다.
   */
  lookBy(yawDelta: number, pitchDelta: number): void {
    if (Number.isFinite(yawDelta)) this.yaw += yawDelta;
    if (Number.isFinite(pitchDelta)) this.pitch = clampPitch(this.pitch + pitchDelta);
  }

  update(ctx: FrameCtx): void {
    // 조이스틱이 기울어져 있으면 그것을 쓰고, 아니면 키보드를 쓴다. 둘을 더하지 않는
    // 이유: 합산하면 키보드+조이스틱 동시 입력에서 길이가 2에 가까워져 클램프가 걸리고,
    // 그 순간 조이스틱의 미세 조작이 통째로 무시된다.
    const stick = Math.hypot(this.axes.x, this.axes.z);
    // 물속에서는 무겁다. **직전 프레임의 잠김**을 쓴다 — 이번 프레임 잠김은 이동한
    // 뒤에야 정해지고(새 위치에서 판정한다), 한 프레임 지연은 화면에 안 보인다.
    const speed = this.speed * swimSpeedMult(this.submersion);
    const d = stick > 0
      ? moveFromAxes(this.axes.x, this.axes.z, this.yaw, speed, ctx.dt, this.input.fast)
      : moveDelta(this.input, this.yaw, speed, ctx.dt);
    // **실제로 간 거리**를 따로 잡는다. 충돌이 붙은 뒤로 `d`(가려던 양)와 실제가 갈린다.
    let mx = 0;
    let mz = 0;
    // **가려고 했는가.** 아래 진행 계수가 이것을 본다 — "안 눌러서 안 감" 과 "눌렀는데
    // 못 감" 은 이동량만으로는 구별되지 않는다(둘 다 0 이다).
    const wanted = d.dx !== 0 || d.dz !== 0;
    if (wanted) {
      // 충돌을 안 주면 그대로 간다 — 예전 동작이 기본값이다.
      const next = this.resolveMove
        ? this.resolveMove(this.x, this.z, d.dx, d.dz)
        : { x: this.x + d.dx, z: this.z + d.dz };
      mx = next.x - this.x;
      mz = next.z - this.z;
      this.x = next.x;
      this.z = next.z;
      const l = Math.hypot(mx, mz);
      // 완전히 막혔으면 방향을 **갱신하지 않는다**. 0 으로 나누면 NaN 이 나가고,
      // 마지막으로 향하던 쪽을 유지하는 편이 화면에서도 자연스럽다.
      if (l > 0) this.moveDir = { x: mx / l, z: mz / l };
    }

    // 헤드밥 — 걷기 속도를 1로 본 비율로 흔든다.
    //
    // **이동량에서 역산한다**(입력 플래그가 아니라). 벽에 막혀 입력은 있는데 못 움직이는
    // 상황에서 제자리 흔들림이 남으면 그게 더 어색하다. 예전 이 주석은 *"지금은 충돌이
    // 없지만 나중에 붙어도 이 식은 그대로 맞다"* 라고 적고 있었는데 **절반만 맞았다** —
    // 식은 맞지만 `d`(가려던 양)를 넣고 있어서, 충돌이 붙는 순간 벽에 붙어 제자리 흔들림이
    // 남았을 것이다. 충돌을 붙이면서 **실제 이동량**으로 바꿔 그 문장을 참으로 만들었다.
    const moved = ctx.dt > 0 ? Math.hypot(mx, mz) / ctx.dt : 0;
    const ratio = this.speed > 0 ? moved / this.speed : 0;
    this.bobPhase = stepBobPhase(this.bobPhase, ratio, ctx.dt);
    // 지수 접근. dt 를 곱해 프레임레이트가 달라도 같은 시간에 같은 만큼 따라간다.
    this.bobIntensity += (Math.min(1, ratio) - this.bobIntensity) * Math.min(1, ctx.dt * 8);

    // ── 스트리밍용 진행 계수 (감독 실기기 2026-08-08) ──────────────────────────
    //
    // **헤드밥과 같은 원천에서 나오지만 별도 필드로 둔다.** 값이 같아 보인다고 공유하면
    // 다음에 한쪽 감각을 만질 때 다른 쪽이 조용히 딸려간다 — 이 저장소가 "값 미러링" 으로
    // 이름 붙인 것의 반대 형태(의도가 다른 둘이 한 값을 쓰는 것)다.
    //
    // 시상수를 헤드밥(dt×8)보다 **느리게**(dt×3, ~0.33초) 잡는다. 헤드밥은 걸음에 붙어야
    // 즉각적이어야 하지만, 스트리밍 판정은 급할수록 손해다 — 빨리 따라갈수록 경계에서
    // 자주 흔들린다.
    //
    // ⚠ **입력이 없으면 갱신하지 않는다 — 직전 값을 그대로 얼린다** (검수관 반려 B2).
    // 첫 판본은 입력 유무를 안 보고 `ratio` 만 먹였고, 그것이 **손을 뗀 정상 상태까지
    // "막혔다" 로 취급**했다. 그러면 `direction` getter 가 문서에 적어 둔 기능 — *"서서
    // 둘러볼 때 그쪽을 미리 올린다"* — 이 약 1초 만에 죽는다(τ=1/(3dt), 직접 계산).
    // 헤드밥은 반대로 **꺼져야** 맞으므로(제자리 흔들림) 위 `bobIntensity` 는 그대로 둔다.
    // 두 필드를 따로 둔 판단(바로 위 문단)이 여기서 값을 한다.
    //
    // 얼리는 것이 0/1 로 튀는 것보다 나은 이유: 끼인 채 눌렀다 뗐다 하면 목표를 1 로
    // 복원하는 설계는 look-ahead 를 0↔0.5셀(16m) 로 왕복시켜 **감독이 보고한 깜빡임을
    // 그대로 되살린다.** 얼리면 끼임 중에는 접힌 채 유지되고, 실제로 다시 걸어지는
    // 순간에만 회복된다.
    if (wanted) {
      this.moveFactor += (Math.min(1, ratio) - this.moveFactor) * Math.min(1, ctx.dt * 3);
    }

    // ── 물 (감독 지시 *"강에 사람이 빠지게해줘"*) ──────────────────────────────
    // **이동한 뒤에** 판정한다. 이동 전 좌표로 물어보면 물가를 넘어선 프레임에 아직
    // 뭍으로 읽혀, 잠김이 한 프레임 늦게 시작한다.
    const surface = this.waterSurfaceY?.(this.x, this.z) ?? null;
    if (surface !== null) this.lastSurfaceY = surface;
    this.submersion = stepSubmersion(this.submersion, surface !== null, ctx.dt);

    // 뭍에서의 눈높이(헤드밥 포함)를 만들어 넘긴다. 잠길수록 이 값의 기여가 줄어
    // **헤드밥이 저절로 잦아든다** — 물속에서 흔들림을 따로 끄는 코드가 필요 없다.
    const groundEye = this.eye + bobHeight(this.bobPhase, this.bobIntensity, this.bobAmp);
    const eyeY = eyeYAt(this.submersion, groundEye, this.seabed, this.eye);

    this.apply?.(this.x, eyeY, this.z, this.yaw, this.pitch);
    // 물에 한 번도 안 닿았으면 수면이 없다 — 그때는 알파를 계산할 것도 없이 0 이다.
    this.onSubmerge?.(this.lastSurfaceY === null ? 0 : underwaterAlpha(eyeY, this.lastSurfaceY));
  }

  get position(): { x: number; z: number } { return { x: this.x, z: this.z }; }
  /**
   * 발바닥에서 눈까지(m). **읽기 전용으로 내주는 이유**: 수평선 밴드의 각도가 이 값에서
   * 나온다(`decide/horizon.ts`). 소비자가 `?eye=` 를 다시 읽으면 그 순간 값 미러링이고,
   * 감독이 눈높이를 바꾸는 날 수평선만 옛 높이에 남는다.
   *
   * **현재 눈의 월드 y 가 아니다** — 그것은 잠김에 따라 움직이므로 카메라에서 읽는다.
   */
  get eyeHeight(): number { return this.eye; }
  /** 이동 방향. 정지 중이면 시선 방향을 쓴다 — 서서 둘러볼 때 그쪽을 미리 올리려는 것 */
  /**
   * 스트리밍이 "어느 쪽을 미리 올릴까" 에 쓰는 방향.
   *
   * ⚠ **소스가 둘이고 그 사이를 오간다** — 조작 중이면 `moveDir`(마지막으로 **실제로**
   * 간 방향), 손을 떼면 `facing(yaw)`(지금 보는 방향). 충돌이 붙기 전에는 둘이 거의
   * 같았지만, 이제 **막히면 `moveDir` 가 갱신되지 않고 낡은 채 굳는다**(위 `update` 의
   * `if (l > 0)`). 그래서 벽에 끼인 채 눌렀다 뗐다 하면 두 값이 크게 어긋난다.
   *
   * 감독 실기기 2026-08-08: *"분수대에 끼일때. 멀리있는 lod가 나왔다가 안나왔다가 해"* —
   * 그 어긋남이 `lookAheadCenter` 를 통해 판정 중심을 최대 1.0셀(32m) 흔들었고,
   * LOD 히스테리시스 폭(0.15~0.30셀)을 압도했다. **여기를 고치는 대신** 진행 계수
   * (`speedFactor`)로 look-ahead 자체를 줄이는 쪽을 골랐다 — 방향 소스를 통일하려면
   * "손 뗐을 때 어디를 미리 올릴까" 라는 별개 문제를 먼저 풀어야 하고, 막혀서 못 가는
   * 동안에는 **어느 방향이든 미리 올릴 이유가 없다**는 것이 더 단순한 참이다.
   */
  get direction(): { x: number; z: number } {
    const keys = this.input.forward || this.input.back || this.input.left || this.input.right;
    const stick = Math.hypot(this.axes.x, this.axes.z) > 0;
    return (keys || stick) ? this.moveDir : facing(this.yaw);
  }

  /**
   * 실제 진행 정도(0~1). **가려던 양이 아니라 간 양**에서 나온다.
   *
   * 스트리밍 look-ahead 가 이것을 곱한다 — 막혀 있으면 0 에 가까워져 판정 중심이 발밑에
   * 고정된다. look-ahead 의 목적이 *"가려는 쪽 파셀을 미리 올린다"* 이므로, 못 가는
   * 동안 앞을 당겨 보는 것은 목적에 어긋난 채 경계만 흔드는 일이다.
   *
   * **입력이 없는 동안은 얼어 있다**(위 `update` 참조) — 손을 뗀 것은 막힌 것이 아니다.
   */
  get speedFactor(): number { return this.moveFactor; }
  get angles(): { yaw: number; pitch: number } { return { yaw: this.yaw, pitch: this.pitch }; }
  /** 잠김 정도(0~1). 0 = 마른 땅, 1 = 완전히 가라앉음 */
  get submerged(): number { return this.submersion; }
}
