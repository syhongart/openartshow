// world-glb/systems/grass-field.ts — 잔디 필드의 **집행**. 판정은 `decide/grass.ts` 가 한다.
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
  GRASS_TONES, GRASS_RINGS, BLADE_H, BLADE_W, WRAP_MOVE_EPS, WRAP_BUDGET,
  bladeBase, ringCounts, ringOf, ringStart, wrapTo, edgeScale, plantScale,
} from '../decide/grass.js';
import { GARDEN_SURFACE_Y } from '../parts/garden.js';

/** 성분을 직접 채우는 4×4 행렬. three 의 `Matrix4` 가 이 모양이다(column-major) */
export interface MatrixLike { elements: number[] | Float32Array }
/** 채널을 직접 채우는 색. three 의 `Color` 가 이 모양이다 */
export interface ColorLike { r: number; g: number; b: number }

/** 인스턴스 메시에서 이 시스템이 쓰는 부분만. 나머지는 몰라도 된다 */
export interface BladeMeshLike {
  visible: boolean;
  /** 버퍼 크기. 활성 수보다 클 수 있다(`?gden` 이 활성만 줄인다) */
  readonly count: number;
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
  /** 반경 배수 노브(`?grad`) — 링 표에 곱한다 */
  readonly radiusMul: number;
  /** 밀도 배수 노브(`?gden`) */
  readonly densityMul: number;
  /** 높이 배수 노브(`?gh`) */
  readonly heightMul: number;
  /** 폭 배수 노브(`?gw`) — 감독 판정 *"뾰족가시같아"* 로 열었다 */
  readonly widthMul: number;
  readonly cell: number;
  /** 지금 플레이어가 선 자리 */
  readonly playerAt: () => { x: number; z: number };
  /** 지금 셰이딩 모드 — `'material'` 이 아니면 잔디를 숨긴다(아래 ⚠) */
  readonly shading: () => string;
  /**
   * 색 인덱스 → 잎 색 `0xRRGGBB`. 팔레트·채도 노브가 여기서 갈린다.
   *
   * 상수 배열이 아니라 **함수**인 것이 요점이다 — 감독이 색 슬라이더를 밀면 값이 바뀌고,
   * 그때 `recolor()` 가 같은 통로로 다시 읽는다. 배열을 받아 두면 그 시점의 스냅샷이
   * 박혀 슬라이더가 무력해진다(`ui/knob-bar.ts` 가 `value()` 를 함수로 받는 것과 같은 이유).
   */
  readonly toneHex: (idx: number) => number;
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
  /** 링별 인스턴스 수 — 인덱스를 링으로 가르는 유일한 근거 */
  private readonly counts: number[];
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
    this.counts = ringCounts(opts.radiusMul, opts.densityMul);
    this.active = this.counts.reduce((a, b) => a + b, 0);
    this.tileX = new Float64Array(this.active).fill(Number.NaN);
    this.tileZ = new Float64Array(this.active).fill(Number.NaN);
    this.paintTones();

    // ── 부팅 상태를 여기서 확정한다. **`update()` 를 기다리면 늦는다.** ──────
    //
    // 커널은 예열(prewarm) **뒤에** 생긴다(`main.ts` 의 mount → prewarm 3프레임 →
    // `new Kernel` → `start`). 그러니 생성자가 안 잡아 두면 그 3프레임이 다음 두 결함을
    // 그대로 렌더한다 — 둘 다 검수관이 잡았다(N1·R2, 2026-08-18).
    //
    // ① **숨김이 안 걸린다.** `?shading=wire|solid` 로 열면 `shadingFeature` 가 mount
    //    시점에 이미 `scene.overrideMaterial` 을 세우는데, 잔디는 `visible` 기본값이
    //    `true` 라 예열 프레임이 `Renderer.js` 의 `overridePositionNode` 스왑 경로를
    //    **정확히 탄다.** `features/shading.ts` 헤더가 «구조적으로 없앴다» 고 적은 그
    //    경로다 — 초기값을 안 맞추면 그 문장이 예열 창에서 거짓이 된다.
    // ② **모든 블레이드가 항등행렬로 원점에 겹쳐 선다.** `InstancedMesh` 의
    //    `instanceMatrix` 기본값이 항등이라, 첫 전수 배치가 끝날 때까지(예산제라 기본
    //    9프레임) 18,432개가 스케일 1 로 한 자리에 뭉쳐 있다.
    this.hidden = opts.shading() !== 'material';
    opts.mesh.visible = !this.hidden;

    const p = opts.playerAt();
    this.lastX = p.x;
    this.lastZ = p.z;
    for (let i = 0; i < this.active; i++) this.place(i, this.lastX, this.lastZ);

    // ③ **잉여 슬롯을 영행렬로 눕힌다**(검수관 블로커 C5, 2026-08-18).
    // three 는 `InstancedMesh` 생성자에서 `instanceMatrix` 를 **항등행렬로 채운다**
    // (`three.core.js` 의 `setMatrixAt` 초기화 루프 — 실측). 버퍼가 활성 수보다 크면
    // (`?gden=0` 이면 활성 0 · 버퍼 1) 그 슬롯은 `place()` 를 한 번도 안 거쳐 **항등인
    // 채로 남고**, `frustumCulled=false` 라 **월드 원점에 기본 크기 블레이드가 실제로
    // 그려진다.** 스폰에서 13.6m 떨어진 광장 한복판이라 눈에 띈다.
    const e0 = opts.matrix.elements;
    for (let k = 0; k < 16; k++) e0[k] = 0;
    for (let i = this.active; i < opts.mesh.count; i++) opts.mesh.setMatrixAt(i, opts.matrix);

    opts.mesh.instanceMatrix.needsUpdate = true;
  }

  /** 활성 포기 수. 진단이 읽는다 */
  get count(): number { return this.active; }

  /**
   * 색 노브가 움직였다 — 전수를 다시 칠한다.
   *
   * 전수인 것은 색이 포기마다 고정이라서다(아래 `paintTones` 주석). 15만 회 `setColorAt`
   * 은 감독이 슬라이더를 놓을 때마다 한 번이고, 매 프레임 도는 경로가 아니다.
   * **버퍼도 인스턴스도 새로 안 만든다** — 이미 있는 `instanceColor` 를 덮어쓸 뿐이라
   * 개수 불변식과 무관하다.
   */
  recolor(): void { this.paintTones(); }

  /**
   * 색은 포기마다 고정이라 **부팅에 한 번만** 쓴다. 랩으로 자리가 바뀌어도 색은 안 따라
   * 바꾼다 — 바꾸면 걸을 때 눈앞의 풀이 색을 바꾸는 것이 보인다.
   */
  private paintTones(): void {
    const { mesh, color } = this.o;
    for (let i = 0; i < this.active; i++) {
      const r = ringOf(i, this.counts);
      const hex = this.o.toneHex(bladeBase(i, GRASS_RINGS[r].radius * this.o.radiusMul).tone);
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
    const { cell, heightMul, widthMul, matrix, mesh } = this.o;
    // 이 포기가 속한 링이 반경·잎 크기를 정한다. 링마다 따로 랩을 돌므로 거리 LOD 가
    // 저절로 생긴다 — 안쪽 링은 좁고 빽빽하게, 바깥 링은 넓고 성기게.
    const ri = ringOf(i, this.counts);
    const ring = GRASS_RINGS[ri];
    const radius = ring.radius * this.o.radiusMul;
    const span = radius * 2;
    // 링 안에서의 상대 인덱스를 쓴다 — 전역 `i` 를 쓰면 링이 바뀔 때 같은 난수를 다시
    // 밟아 링끼리 겹쳐 선다.
    const b = bladeBase(i - ringStart(ri, this.counts) + ri * 7919, radius);
    const wx = wrapTo(b.bx, cx, span);
    const wz = wrapTo(b.bz, cz, span);
    const fade = edgeScale(wx - cx, wz - cz, radius);
    // `plantScale` 은 boolean 이 아니라 **높이 배수**다 — 도로 갓돌 띠에 짧은 풀이
    // 삐져나오게 하려는 것이고, 그 근거는 `decide/grass.ts` 의 갓돌 띠 절에 있다.
    const ps = fade > 0 ? plantScale(wx, wz, cell) : 0;
    const ok = ps > 0;

    const sw = ok ? b.sw * BLADE_W * widthMul * ring.scale : 0;
    const sy = ok ? b.sh * BLADE_H * heightMul * fade * ps * ring.scale : 0;
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
      // ⚠ **커서를 되감지 않는다**(검수관 권고 P4, 2026-08-18 — 첫 판본은 여기서 `0` 으로
      // 되감았다). 전수 1회에 필요한 프레임은 `ceil(active / WRAP_BUDGET)` 이고, 기본값
      // (active 18,432)은 9프레임이라 보행 중 재예약 주기 안에 완주한다. 그러나 `?gden=2`
      // (18프레임)나 `?grad=52`(20프레임)에서는 **완주 전에 매번 되감기므로 인덱스 뒤쪽
      // 20~25% 가 걷는 내내 갱신되지 않는다.** 낡은 포기는 옛 중심 기준으로 접혀 있어
      // `edgeScale` 가드를 못 받고 **뒤쪽에 풀이 뭉쳐 남는 것**으로 보인다.
      //
      // 순회는 인덱스 순서이고 «어느 포기가 갱신을 필요로 하는가» 와 무관하므로, 부분
      // 통과가 덮는 집합은 사실상 무작위 부분집합이다 — 이어받아야 모든 포기가 순환한다.
    }
    if (!this.pending) return;

    const end = Math.min(this.active, this.cursor + WRAP_BUDGET);
    for (let i = this.cursor; i < end; i++) this.place(i, this.lastX, this.lastZ);
    mesh.instanceMatrix.needsUpdate = true;
    // 한 바퀴를 다 돌면 처음으로 접고 예약을 내린다. 그 사이 또 움직였으면 `moved` 가
    // 예약을 다시 세우므로, 결과적으로 **모든 인덱스가 «한 사이클 이내의» 중심으로
    // 순환 갱신된다.** «최신 중심» 이 아닌 것이 요점이다(검수관 권고 R1) — 멈춘 시점에
    // 진행 중이던 사이클은 `[cursor, active)` 만 마치므로 `[0, cursor)` 는 걷는 도중
    // 프레임의 중심으로 남는다. 오차 상한은 «한 사이클 소요 × 보행속도»(기본 9프레임
    // ≈ 0.15초)이고, 이것을 감수하고 고른 이유는 되감기 판본이 `?gden=2` 에서 **뒤쪽
    // 20~25% 를 주행 내내 갱신하지 못했기** 때문이다.
    this.cursor = end >= this.active ? 0 : end;
    if (this.cursor === 0) this.pending = false;
  }
}
