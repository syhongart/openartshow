// world2/systems/player.ts — 이동 입력 → 위치.
//
// 이동 계산은 순수 함수로 떼어 둔다(`moveDelta`). 현행에서 이동·카메라·충돌이 한 함수에
// 엉켜 "대각선이 빠른" 정규화 버그를 오래 못 잡았는데, 그건 계산만 따로 볼 수 없어서였다.

import type { FrameCtx, System } from '../kernel.js';

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
  const s = speed * (fast ? 2.2 : 1) * dt;
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

/** 피치를 수직 한계 안으로 가둔다 — 넘어가면 화면이 뒤집힌다. */
export function clampPitch(pitch: number): number {
  const lim = Math.PI / 2 - 0.05;
  return Math.min(lim, Math.max(-lim, pitch));
}

export interface PlayerOptions {
  speed?: number;
  eyeHeight?: number;
  start?: { x: number; z: number };
  /** 카메라에 위치·회전을 반영한다 */
  applyCamera?: (x: number, y: number, z: number, yaw: number, pitch: number) => void;
}

export class PlayerSystem implements System {
  readonly name = 'player';

  private x: number;
  private z: number;
  private yaw = 0;
  private pitch = 0;
  private readonly speed: number;
  private readonly eye: number;
  private readonly apply?: PlayerOptions['applyCamera'];
  private input: MoveInput = { ...NO_INPUT };
  /** 아날로그 축(조이스틱). 키보드 입력과 **합산하지 않고** 큰 쪽을 쓴다 */
  private axes = { x: 0, z: 0 };
  /** 실제로 움직인 방향(스트리밍 look-ahead용). 멈추면 마지막 방향을 유지한다 */
  private moveDir = { x: 0, z: 0 };

  constructor(opts: PlayerOptions = {}) {
    this.speed = opts.speed ?? 9;
    this.eye = opts.eyeHeight ?? 1.7;
    this.x = opts.start?.x ?? 0;
    this.z = opts.start?.z ?? 0;
    this.apply = opts.applyCamera;
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
    const d = stick > 0
      ? moveFromAxes(this.axes.x, this.axes.z, this.yaw, this.speed, ctx.dt, this.input.fast)
      : moveDelta(this.input, this.yaw, this.speed, ctx.dt);
    if (d.dx !== 0 || d.dz !== 0) {
      this.x += d.dx;
      this.z += d.dz;
      const l = Math.hypot(d.dx, d.dz);
      this.moveDir = { x: d.dx / l, z: d.dz / l };
    }
    this.apply?.(this.x, this.eye, this.z, this.yaw, this.pitch);
  }

  get position(): { x: number; z: number } { return { x: this.x, z: this.z }; }
  /** 이동 방향. 정지 중이면 시선 방향을 쓴다 — 서서 둘러볼 때 그쪽을 미리 올리려는 것 */
  get direction(): { x: number; z: number } {
    const keys = this.input.forward || this.input.back || this.input.left || this.input.right;
    const stick = Math.hypot(this.axes.x, this.axes.z) > 0;
    return (keys || stick) ? this.moveDir : facing(this.yaw);
  }
  get angles(): { yaw: number; pitch: number } { return { yaw: this.yaw, pitch: this.pitch }; }
}
