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
  ax /= len; az /= len;

  const s = speed * (input.fast ? 2.2 : 1) * dt;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  // yaw 회전 적용 — 카메라가 보는 방향이 "앞"이다.
  return {
    dx: (ax * cos - az * sin) * s,
    dz: (ax * sin + az * cos) * s,
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

  /** 마우스/터치 델타(픽셀)를 시선에 반영한다. */
  look(dx: number, dy: number, sensitivity = 0.0025): void {
    this.yaw -= dx * sensitivity;
    this.pitch = clampPitch(this.pitch - dy * sensitivity);
  }

  update(ctx: FrameCtx): void {
    const d = moveDelta(this.input, this.yaw, this.speed, ctx.dt);
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
    const moving = this.input.forward || this.input.back || this.input.left || this.input.right;
    return moving ? this.moveDir : facing(this.yaw);
  }
  get angles(): { yaw: number; pitch: number } { return { yaw: this.yaw, pitch: this.pitch }; }
}
