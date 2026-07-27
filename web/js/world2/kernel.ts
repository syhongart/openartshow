// world2/kernel.ts — 프레임 게이팅 + System 순서 소유 + ctx 조립.
//
// ── 커널이 있는 이유 ─────────────────────────────────────────────────────────
// 현행 world.js의 `update()`는 14개 시스템과 9개 계측문이 관심사 경계 없이 인터리브된 88줄
// 이고, **어느 것이 어느 것에 의존하는지가 코드 순서에만 암묵적으로 표현돼 있다.** 게다가
// `adaptQuality`가 `frameCapS`를 써서 `step`의 게이팅을 바꾼다 — 적응계가 메인 루프를
// 거꾸로 제어하는 역방향 의존이다.
//
// 여기서는 순서를 커널이 명시적으로 소유하고, System은 자기 상태만 갖는다. System이 서로를
// 부르지 않고 `ctx`(읽기 전용 스냅샷)와 이벤트만 본다. 그래서 한 System을 빼거나 순서를
// 바꾸는 일이 코드를 읽어야 알 수 있는 일이 아니게 된다.
//
// ── 계측 규약 ────────────────────────────────────────────────────────────────
// 현행은 계측이 프로덕션 코드 175줄(7.4%)을 차지하고 `profSkip`이 루프 제어 흐름에까지
// 개입한다. 테스트를 못 붙여서 계측으로 대신한 결과였고, 그 계측이 다시 파일을 키웠다.
// 여기서는 커널이 `probe` 훅 하나만 노출한다. 훅이 없으면 호출 자체가 일어나지 않는다.

export interface FrameCtx {
  /** 프레임 델타(초). 게이팅으로 건너뛴 시간이 합산돼 들어온다 */
  readonly dt: number;
  /** 부팅 후 경과(ms) */
  readonly ageMs: number;
  /** 이번 프레임 순번 */
  readonly frame: number;
  /** 문서가 숨겨졌는가 */
  readonly hidden: boolean;
  /** 계측 훅. 없으면 계측이 아예 돌지 않는다 */
  readonly probe?: (name: string, value: number) => void;
}

export interface System {
  readonly name: string;
  /** 프레임마다 호출. 부수효과는 자기 소유 상태와 자기가 만든 씬 객체에만. */
  update(ctx: FrameCtx): void;
  /** 페이지를 떠날 때 */
  dispose?(): void;
}

export interface KernelOptions {
  /** 프레임 캡(fps). 0이면 무제한 */
  capFps?: number;
  /** 비가시 시 목표 fps — 탭이 숨으면 여기까지 떨어뜨린다 */
  hiddenFps?: number;
  probe?: (name: string, value: number) => void;
  /** 렌더 호출. System 전부를 돌린 **뒤** 커널이 부른다 */
  render: () => void;
  /** rAF 주입(테스트용). 없으면 requestAnimationFrame */
  raf?: (cb: (t: number) => void) => number;
  now?: () => number;
}

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class Kernel {
  private systems: System[] = [];
  private running = false;
  private startedAt = 0;
  private lastT = 0;
  private frame = 0;
  private accum = 0;
  private capS: number;
  private hiddenS: number;
  private rafId = 0;
  private readonly opts: KernelOptions;
  private readonly now: () => number;
  private readonly raf: (cb: (t: number) => void) => number;
  /** 다음 프레임을 반드시 그려야 하는가(비동기 텍스처 도착 등). 게이팅을 1회 뚫는다 */
  private dirty = true;

  constructor(opts: KernelOptions) {
    this.opts = opts;
    this.capS = opts.capFps && opts.capFps > 0 ? 1 / opts.capFps : 0;
    this.hiddenS = 1 / (opts.hiddenFps ?? 4);
    this.now = opts.now ?? defaultNow;
    this.raf = opts.raf ?? ((cb) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(cb) : 0));
  }

  /**
   * System을 등록한다. **등록 순서가 실행 순서다** — 이 배열이 프레임의 계약이다.
   * 부팅 중에만 부른다(세션 도중 System이 늘면 순서 계약이 흔들린다).
   */
  add(sys: System): this {
    if (this.running) throw new Error(`[world2] System 등록은 부팅 중에만: ${sys.name}`);
    this.systems.push(sys);
    return this;
  }

  /** 등록된 System 이름 — 불변식 검사·HUD가 순서를 확인하는 데 쓴다 */
  get order(): string[] { return this.systems.map((s) => s.name); }

  /** 프레임 캡을 바꾼다. 적응계 판정의 **집행**은 커널이 한다(System이 하지 않는다). */
  setFrameCap(fps: number): void { this.capS = fps > 0 ? 1 / fps : 0; }
  get frameCap(): number { return this.capS > 0 ? Math.round(1 / this.capS) : 0; }

  /** 다음 프레임을 강제로 그리게 한다(캡·비가시 게이팅을 1회 통과) */
  markDirty(): void { this.dirty = true; }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startedAt = this.now();
    this.lastT = this.startedAt;
    const loop = (t: number) => {
      if (!this.running) return;
      this.rafId = this.raf(loop);
      this.tick(t);
    };
    this.rafId = this.raf(loop);
  }

  stop(): void {
    this.running = false;
    if (typeof cancelAnimationFrame !== 'undefined' && this.rafId) cancelAnimationFrame(this.rafId);
  }

  /**
   * 한 프레임. 게이팅은 **커널의 관심사**다 — System은 자기가 돌아야 할지 판단하지 않는다.
   * 테스트에서 직접 부를 수 있게 public으로 둔다(rAF 없이 시뮬).
   */
  tick(t: number): void {
    const rawMs = t - this.lastT;
    this.lastT = t;
    const rawS = Math.min(Math.max(rawMs, 0) / 1000, 0.1); // 탭 복귀 시 거대 dt 클램프
    this.accum += rawS;

    const hidden = this.isHidden();
    const budget = hidden ? this.hiddenS : this.capS;
    if (budget > 0 && this.accum < budget && !this.dirty) return; // 게이팅 — 이번 프레임은 건너뛴다

    const dt = this.accum;
    this.accum = 0;
    this.dirty = false;
    this.frame++;

    const ctx: FrameCtx = {
      dt,
      ageMs: t - this.startedAt,
      frame: this.frame,
      hidden,
      probe: this.opts.probe,
    };

    const t0 = this.now();
    for (const s of this.systems) s.update(ctx);
    const updMs = this.now() - t0;

    const r0 = this.now();
    this.opts.render();
    const renderMs = this.now() - r0;

    // 계측은 훅이 있을 때만 돈다. 없으면 이 세 줄이 그냥 통과한다.
    if (ctx.probe) {
      ctx.probe('frame_ms', rawMs);
      ctx.probe('upd_ms', updMs);
      ctx.probe('render_ms', renderMs);
      // out_ms = 우리 콜백 밖에서 사라진 시간. 이게 크고 upd·render가 작으면 우리 코드를
      // 최적화해도 닿지 않는다(브라우저 합성·GC·OS). 아직 못 푼 5.4초 프리즈의 분기 계측이다.
      ctx.probe('out_ms', Math.max(0, rawMs - updMs - renderMs));
    }
  }

  private isHidden(): boolean {
    try {
      return typeof document !== 'undefined'
        && (document.hidden || document.visibilityState === 'hidden');
    } catch { return false; }
  }

  dispose(): void {
    this.stop();
    for (const s of this.systems) s.dispose?.();
    this.systems.length = 0;
  }
}
