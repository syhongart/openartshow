// world2/systems/adapt.ts — 적응 품질 집행.
//
// ── 역방향 의존을 끊은 자리 ──────────────────────────────────────────────────
// 현행에서는 `adaptQuality`가 `frameCapS`를 직접 써서 메인 루프의 게이팅을 바꿨다 —
// 적응계가 루프를 거꾸로 제어하는 구조였고, 그래서 "왜 프레임이 갑자기 30에 묶였는가"를
// 추적하려면 루프와 적응계를 같이 읽어야 했다.
//
// 여기서는 판정이 decide/adapt.ts(순수)에 있고, 집행은 커널이 제공하는 명시적 API
// (`setFrameCap`)로만 한다. System은 커널 내부를 모른다.
//
// ── 계측 순서 문제(숨기지 않는다) ────────────────────────────────────────────
// 삼각형 수는 `render()` **직후**에만 유효한데 System은 그 전에 돈다. 그래서 이 System이
// 보는 tri는 언제나 **직전 프레임** 값이다. 한 프레임 늦은 값으로 판정하는 셈인데,
// 적응 판정은 3초 지속 조건·쿨다운을 쓰므로 1프레임 지연은 무해하다. 다만 이걸 모르면
// "왜 tri가 안 맞지?"로 시간을 버리므로 계약으로 적어 둔다.

import type { FrameCtx, System } from '../kernel.js';
import {
  decideResolution, decideFrameCap, decideTierPressure,
  resolutionBands, initialController,
  type ControllerState, type AdaptInput, type ResolutionBands,
} from '../decide/adapt.js';

export interface AdaptTargets {
  /** 해상도 배율 집행 */
  setPixelRatio: (r: number) => void;
  getPixelRatio: () => number;
  /** 프레임 캡 집행 — 커널이 소유한 게이팅 */
  setFrameCap: (fps: number) => void;
  /** 직전 프레임 삼각형 수 */
  lastTri: () => number;
  /** 스트리밍이 밀려 있는가 — 판정을 미루는 조건 */
  isStreaming: () => boolean;
  /** tier 압력 집행(밴드 축소). 없으면 압력 축을 쓰지 않는다 */
  applyTierPressure?: (scale: number) => void;
}

export interface AdaptOptions {
  targets: AdaptTargets;
  /** 기기 DPR과 모바일 상한 */
  dpr: number;
  mobileCap: number;
  /** 데스크톱 발열 캡 fps */
  capFps?: number;
}

export interface AdaptSnapshot {
  fps: number;
  ratio: number;
  capped: boolean;
  pressureApplied: boolean;
  triAvg: number;
}

/** fps·tri의 지수이동평균 계수. 값이 클수록 최근을 무겁게 본다. */
const EMA = 0.1;

export class AdaptSystem implements System {
  readonly name = 'adapt';

  private readonly o: AdaptOptions;
  private readonly bands: ResolutionBands;
  private st: ControllerState = initialController();
  private fps = 60;
  private triAvg = 0;
  private capped = false;
  private pressureApplied = false;

  constructor(opts: AdaptOptions) {
    this.o = opts;
    this.bands = resolutionBands(opts.dpr, opts.mobileCap);
  }

  update(ctx: FrameCtx): void {
    const dtMs = ctx.dt * 1000;
    if (dtMs > 0) {
      const inst = 1000 / dtMs;
      this.fps += (inst - this.fps) * EMA;
    }
    // 직전 프레임 값(위 주석 참조). render 전이라 이번 프레임 값은 아직 없다.
    const tri = this.o.targets.lastTri();
    this.triAvg += (tri - this.triAvg) * EMA;

    const input: AdaptInput = {
      fps: this.fps,
      ageMs: ctx.ageMs,
      dtMs,
      streaming: this.o.targets.isStreaming(),
      hidden: ctx.hidden,
    };

    // ① 해상도 — 가장 싸고 되돌리기 쉬운 축이라 먼저 쓴다.
    const cur = this.o.targets.getPixelRatio();
    const r = decideResolution(this.st, input, cur, this.bands);
    this.st = r.next;
    if (r.decision) this.o.targets.setPixelRatio(r.decision.ratio);

    // ② 프레임 캡 — 비가역이므로 지속 조건을 넘겨야 진입한다.
    const c = decideFrameCap(this.st, input, this.capped, this.o.capFps);
    this.st = c.next;
    if (c.decision) {
      this.capped = true;
      this.o.targets.setFrameCap(c.decision.capFps);
    }

    // ③ tier 압력 — fps와 tri가 **동시에** 나빠야 한다(축을 잘못 고르지 않기 위한 장치).
    if (this.o.targets.applyTierPressure) {
      const t = decideTierPressure(this.st, input, this.triAvg, this.pressureApplied);
      this.st = t.next;
      if (t.decision) {
        this.pressureApplied = true;
        this.o.targets.applyTierPressure(t.decision.scale);
      }
    }

    if (ctx.probe) {
      ctx.probe('fps', this.fps);
      ctx.probe('tri_avg', this.triAvg);
      ctx.probe('px_ratio', cur);
    }
  }

  snapshot(): AdaptSnapshot {
    return {
      fps: this.fps,
      ratio: this.o.targets.getPixelRatio(),
      capped: this.capped,
      pressureApplied: this.pressureApplied,
      triAvg: this.triAvg,
    };
  }
}
