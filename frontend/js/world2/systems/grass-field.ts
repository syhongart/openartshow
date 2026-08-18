// world2/systems/grass-field.ts — 잔디 필드의 **집행**. 판정은 `decide/grass.ts` 가 한다.
//
// ── 왜 배선을 기능 클로저가 아니라 여기 클래스로 빼는가 ─────────────────────
// `systems/ground-lift.ts` 가 적은 이유 그대로다: 배선을 `features/grass.ts` 안 클로저로
// 두면 테스트가 그 로직을 **다시 적어야** 하고, 그것이 곧 값 미러링이다. 그렇게 쓴
// 테스트는 배선이 통째로 사라져도 초록이다.
//
// ── three 타입을 안 쓴다 ────────────────────────────────────────────────────
// 필요한 모양은 «행렬을 쓸 수 있는 메시» 와 «성분을 채울 수 있는 행렬» 둘뿐이다.
// 구조적 인터페이스로 선언하면 테스트가 가벼운 스텁으로 **실제 이 코드를** 돌릴 수 있다.
// (`systems/ground-lift.ts` 의 `MutableColor`·`LiftableMaterial` 과 같은 배치다.)

import {
  GRASS_TONES, BLADE_H, BLADE_W, WRAP_MOVE_EPS, WRAP_BUDGET,
  bladeBase, bladeCount, wrapTo, edgeScale, plantable,
} from '../decide/grass.js';
import { GARDEN_SURFACE_Y } from '../parts/garden.js';

/** 성분을 직접 채우는 4×4 행렬. three 의 `Matrix4` 가 이 모양이다(column-major) */
export interface MatrixLike { elements: number[] | Float32Array }
/** 채널을 직접 채우는 색. three 의 `Color` 가 이 모양이다 */
export interface ColorLike { r: number; g: number; b: number }

/** 인스턴스 메시에서 이 시스템이 쓰는 부분만. 나머지는 몰라도 된다 */
export interface BladeMeshLike {
  visible: boolean;
  setMatrixAt(i: number, m: MatrixLike): void;
  setColorAt(i: number, c: ColorLike): void;
  readonly instanceMatrix: { needsUpdate: boolean };
  readonly instanceColor: { needsUpdate: boolean } | null;
}

export interface GrassFieldOpts {
  readonly mesh: BladeMeshLike;
  /** 재사용할 행렬 하나. 매 포기 새로 만들면 GC 가 프레임마다 돈다 */
  readonly matrix: MatrixLike;
  /** 재사용할 색 하나 */
  readonly color: ColorLike;
  readonly radius: number;
  readonly density: number;
  /** 높이 배수 노브(`?gh`) */
  readonly heightMul: number;
  readonly cell: number;
  /** 지금 플레이어가 선 자리 */
  readonly playerAt: () => { x: number; z: number };
  /** 지금 셰이딩 모드 — `'material'` 이 아니면 잔디를 숨긴다(아래 ⚠) */
  readonly shading: () => string;
}

/**
 * 플레이어를 따라다니는 잔디 필드.
 *
 * **인스턴스는 부팅에 한 번 만들어지고 세션 내내 개수가 안 변한다.** 플레이어가 움직이면
 * 타일 경계를 넘은 포기만 반대편으로 접히고(`wrapTo`), 그 자리가 잔디가 아니면 0 스케일로
 * 눕는다 — 이것이 `systems/instancing.ts` 가 미사용 슬롯에 쓰는 것과 같은 어휘다.
 */
export class GrassField {
  private readonly o: GrassFieldOpts;
  private readonly active: number;
  /** 각 포기가 마지막으로 접힌 타일 인덱스. `NaN` 이면 아직 한 번도 안 놓았다 */
  private readonly tileX: Float64Array;
  private readonly tileZ: Float64Array;
  private lastX = Number.NaN;
  private lastZ = Number.NaN;
  /** 예산제 순회 커서 — 한 프레임에 다 못 돌면 다음 프레임이 여기서 이어받는다 */
  private cursor = 0;
  private pending = false;
  private hidden = false;

  constructor(opts: GrassFieldOpts) {
    this.o = opts;
    this.active = bladeCount(opts.radius, opts.density);
    this.tileX = new Float64Array(this.active).fill(Number.NaN);
    this.tileZ = new Float64Array(this.active).fill(Number.NaN);
    this.paintTones();
  }

  /** 활성 포기 수. 진단이 읽는다 */
  get count(): number { return this.active; }

  /**
   * 색은 포기마다 고정이라 **부팅에 한 번만** 쓴다. 랩으로 자리가 바뀌어도 색은 안 따라
   * 바꾼다 — 바꾸면 걸을 때 눈앞의 풀이 색을 바꾸는 것이 보인다.
   */
  private paintTones(): void {
    const { mesh, color } = this.o;
    for (let i = 0; i < this.active; i++) {
      const hex = GRASS_TONES[bladeBase(i, this.o.radius).tone];
      color.r = ((hex >> 16) & 0xff) / 255;
      color.g = ((hex >> 8) & 0xff) / 255;
      color.b = (hex & 0xff) / 255;
      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  /**
   * 한 포기를 지금 플레이어 기준으로 다시 앉힌다.
   *
   * 자리가 잔디가 아니면(도로·광장·물) **0 스케일**이다. 지우지 않는 것이 요점이다 —
   * 지우면 개수가 변한다.
   */
  private place(i: number, cx: number, cz: number): void {
    const { radius, cell, heightMul, matrix, mesh } = this.o;
    const span = radius * 2;
    const b = bladeBase(i, radius);
    const wx = wrapTo(b.bx, cx, span);
    const wz = wrapTo(b.bz, cz, span);
    const fade = edgeScale(wx - cx, wz - cz, radius);
    const ok = fade > 0 && plantable(wx, wz, cell);

    const sw = ok ? b.sw * BLADE_W : 0;
    const sy = ok ? b.sh * BLADE_H * heightMul * fade : 0;
    const c = Math.cos(b.rot);
    const s = Math.sin(b.rot);
    const e = matrix.elements;
    // T · R_y · S — three 의 Matrix4 는 column-major 다
    e[0] = c * sw; e[1] = 0; e[2] = -s * sw; e[3] = 0;
    e[4] = 0; e[5] = sy; e[6] = 0; e[7] = 0;
    e[8] = s * sw; e[9] = 0; e[10] = c * sw; e[11] = 0;
    // 밑동은 잔디 판 **윗면**에 선다. 0 으로 두면 판 아래로 7cm 잠긴다 —
    // 그림자 데칼이 잠겨 안 보이던 그 사고(`parts/surface.ts` 헤더)와 같은 자리다.
    e[12] = wx; e[13] = GARDEN_SURFACE_Y; e[14] = wz; e[15] = 1;
    mesh.setMatrixAt(i, matrix);
  }

  /**
   * 프레임 갱신. 커널이 부른다.
   *
   * 두 단계로 나뉜다 — ① 플레이어가 `WRAP_MOVE_EPS` 이상 움직였으면 전수 재배치를
   * **예약**하고 ② 예약이 있으면 프레임당 `WRAP_BUDGET` 개씩 소화한다. 나눠 처리해도
   * 눈에 안 띄는 이유는 재배치가 필요한 포기가 언제나 가장 먼 가장자리이고, 거기는
   * `edgeScale` 이 이미 0 근처로 눕혀 둔 자리이기 때문이다.
   */
  update(): void {
    const { mesh, shading } = this.o;

    // ⚠ 셰이딩 오버라이드 중에는 숨는다.
    // `scene.overrideMaterial` 이 걸리면 three 의 렌더러가 오브젝트마다 우리 `positionNode`
    // 를 오버라이드 재질에 꽂았다 뺐다 한다(`Renderer.js` 의 `overridePositionNode` 경로).
    // 디버그 뷰에 잔디가 없는 편이 오히려 읽기 쉬우므로, 그 흔들림을 구조적으로 없앤다.
    // 이 한 줄이 `features/shading.ts` 헤더의 «positionNode 사용 0건» 전제를 대신한다.
    const hide = shading() !== 'material';
    if (hide !== this.hidden) {
      this.hidden = hide;
      mesh.visible = !hide;
    }
    if (hide) return;

    const p = this.o.playerAt();
    const moved = !(Math.abs(p.x - this.lastX) < WRAP_MOVE_EPS && Math.abs(p.z - this.lastZ) < WRAP_MOVE_EPS);
    if (moved) {
      this.lastX = p.x;
      this.lastZ = p.z;
      this.pending = true;
      this.cursor = 0;
    }
    if (!this.pending) return;

    const end = Math.min(this.active, this.cursor + WRAP_BUDGET);
    for (let i = this.cursor; i < end; i++) this.place(i, this.lastX, this.lastZ);
    this.cursor = end;
    mesh.instanceMatrix.needsUpdate = true;
    if (this.cursor >= this.active) this.pending = false;
  }
}
