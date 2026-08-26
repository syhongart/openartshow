// world-glb/kernel.ts — 프레임 게이팅 + System 순서 소유 + ctx 조립.
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
  /**
   * **자리비움에서 돌아온 첫 프레임인가.** 탭을 벗어났거나 화면이 꺼져 있던 동안
   * 브라우저가 `requestAnimationFrame`을 멈추고, 돌아오면 그 공백 전체가 한 프레임의
   * 소요 시간으로 들어온다. 이 프레임의 시간 계측은 **성능이 아니라 부재를 잰 것**이다.
   */
  readonly resumed: boolean;
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
  /**
   * 가시성을 보는 문서(테스트용 주입). 없으면 전역 `document`.
   *
   * 주입 가능해야 하는 이유는 하나다 — **자리비움 판정에 테스트를 붙일 수 있어야 한다.**
   * 전역만 읽으면 node 환경에서 그 분기가 영원히 안 돌고, 안 도는 코드는 검사되지 않는다.
   */
  doc?: VisibilityDoc | null;
}

/** 커널이 문서에게 요구하는 전부. `Document` 전체를 끌어오지 않으려고 좁게 적는다 */
export interface VisibilityDoc {
  readonly hidden?: boolean;
  readonly visibilityState?: string;
  addEventListener(type: string, cb: () => void): void;
  removeEventListener(type: string, cb: () => void): void;
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
  private readonly doc: VisibilityDoc | null;
  /**
   * 자리를 비웠고 아직 그 사실을 계측에 반영하지 않았다.
   *
   * **`isHidden()` 폴링으로는 못 잡는다.** iOS 는 백그라운드에서 `requestAnimationFrame`을
   * 아예 멈추므로, 돌아왔을 때 커널이 처음 보는 상태는 이미 `visible`이다. 숨는 순간을
   * 이벤트로 받아 두어야 복귀 프레임에서 "직전에 자리를 비웠다"를 알 수 있다.
   */
  private awayPending = false;
  private readonly onVisibility: () => void;

  constructor(opts: KernelOptions) {
    this.opts = opts;
    this.capS = opts.capFps && opts.capFps > 0 ? 1 / opts.capFps : 0;
    this.hiddenS = 1 / (opts.hiddenFps ?? 4);
    this.now = opts.now ?? defaultNow;
    this.raf = opts.raf ?? ((cb) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(cb) : 0));
    this.doc = opts.doc !== undefined
      ? opts.doc
      : (typeof document !== 'undefined' ? (document as unknown as VisibilityDoc) : null);
    this.onVisibility = () => { if (this.isHidden()) this.awayPending = true; };
    this.doc?.addEventListener('visibilitychange', this.onVisibility);
  }

  /**
   * System을 등록한다. **등록 순서가 실행 순서다** — 이 배열이 프레임의 계약이다.
   * 부팅 중에만 부른다(세션 도중 System이 늘면 순서 계약이 흔들린다).
   */
  add(sys: System): this {
    if (this.running) throw new Error(`[world8] System 등록은 부팅 중에만: ${sys.name}`);
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
    // 자리비움에서 돌아온 첫 프레임인가. 한 번 소비하면 내린다.
    //
    // **게이팅보다 앞에서 판정하고, 게이팅을 뚫는다.** 여기서 걸러지면 이 프레임의
    // `rawMs`(= 자리를 비운 시간)가 통째로 유실되고, 다음 정상 프레임의 작은 값이
    // 자리비움으로 찍힌다 — 부재를 안 세는 것이 아니라 **틀리게 세는 것**이 된다.
    //
    // 걸러질 조건은 `capS > 0.1초`(= 캡 10fps 미만)이고 지금 설정되는 캡은
    // `DESKTOP_CAP_FPS=30` 하나뿐이라 도달 불가능하다. 그래도 막아 둔다 — 도달 불가능이
    // 코드 어디에도 안 적힌 채 **다른 파일의 상수**에 기대고 있었고, 저사양 대응으로 캡을
    // 내리는 날 조용히 깨질 자리였다(검수관 지적 2026-07-29).
    //
    // 뚫는 것이 옳기도 하다. 복귀 프레임은 어차피 그려야 한다 — 화면이 갱신돼야 한다.
    const resumed = this.awayPending && !hidden;
    if (resumed) this.awayPending = false;

    const budget = hidden ? this.hiddenS : this.capS;
    // 게이팅 — 이번 프레임은 건너뛴다
    if (budget > 0 && this.accum < budget && !this.dirty && !resumed) return;

    const dt = this.accum;
    this.accum = 0;
    this.dirty = false;
    this.frame++;

    const ctx: FrameCtx = {
      dt,
      ageMs: t - this.startedAt,
      frame: this.frame,
      hidden,
      resumed,
      probe: this.opts.probe,
    };

    const t0 = this.now();
    for (const s of this.systems) s.update(ctx);
    const updMs = this.now() - t0;

    const r0 = this.now();
    this.opts.render();
    const renderMs = this.now() - r0;

    // 계측은 훅이 있을 때만 돈다. 없으면 이 분기가 그냥 통과한다.
    if (ctx.probe) {
      if (resumed) {
        // ── 자리비움 복귀 — **이 프레임의 시간은 성능이 아니다** ──────────────
        // `rawMs`에 자리를 비운 시간이 통째로 들어 있다. 이걸 프레임 표본에 넣으면
        // 감독이 잠깐 자리를 뜬 것이 57초짜리 히칭으로 찍히고, 평균 fps가 60에서 12로
        // 떨어진다. 실제로 그렇게 찍혀 감독이 *"12프레임 이네. 잘못느꼈은데"* 라고 자기
        // 체감을 의심했다 — **지표가 사람을 오도하면 그 지표는 없느니만 못하다.**
        //
        // 위 `rawS` 클램프(0.1초)가 이미 같은 사실을 알고 있었다. 시뮬레이션은 막았는데
        // 계측은 안 막은 것이 이 결함이었다. 한쪽만 아는 사실은 결국 다른 쪽에서 샌다.
        //
        // 버리되 **버렸다고 적는다.** 못 잰 것을 조용히 생략하지 않는다.
        ctx.probe('away_ms', rawMs);
      } else {
        ctx.probe('frame_ms', rawMs);
        ctx.probe('upd_ms', updMs);
        ctx.probe('render_ms', renderMs);
        // out_ms = 우리 콜백 밖에서 사라진 시간. 이게 크고 upd·render가 작으면 우리 코드를
        // 최적화해도 닿지 않는다(브라우저 합성·GC·OS).
        //
        // 오래 미제로 둔 "5.4초·11.5초 프리즈"가 여기 찍혔었다. 이제 자리비움이 갈려
        // 나가므로, **여기 남는 큰 값은 진짜 프리즈다.** 그게 이 분기의 진단 가치다.
        ctx.probe('out_ms', Math.max(0, rawMs - updMs - renderMs));
      }
    }
  }

  private isHidden(): boolean {
    try {
      const d = this.doc;
      return !!d && (d.hidden === true || d.visibilityState === 'hidden');
    } catch { return false; }
  }

  dispose(): void {
    this.stop();
    this.doc?.removeEventListener('visibilitychange', this.onVisibility);
    for (const s of this.systems) s.dispose?.();
    this.systems.length = 0;
  }
}
