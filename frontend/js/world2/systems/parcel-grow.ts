// world2/systems/parcel-grow.ts — 새로 태어난 부품을 **땅에서 자라나게** 한다(스케일 인).
//
// ── 왜 색 페이드로 부족한가 (감독 마크 실측 2026-08-10) ─────────────────────
// 색 페이드(`parcel-fade.ts`)는 **안개색을 섞는** 방식이라, 안개가 0% 인 거리에서는
// 원리상 아무것도 못 가린다(섞을 안개가 없다 — 그 성질 자체는 옳아서 "번쩍" 수정으로
// 넣은 것이다). 그런데 감독 📍 마크 세 개가 전부 **선명 구역 안의 존재 사건**을 가리켰다:
//
//     tier승격 36.8m · tier강등 41.6m   ← 안개 시작(51.2m)보다 안쪽. 안개율 0%
//     파셀생성 67.2m                     ← 안개율 62.5%. 37.5% 실루엣이 그대로 팝
//
// 즉 남은 "번쩍" 은 **부품이 존재하기 시작하는 그 프레임**이고, 색으로는 못 가린다.
// 크기는 안개와 무관하게 어느 거리에서든 통한다 — 0 에서 시작해 제 크기로 자라면
// 등장이 한 프레임이 아니라 한 호흡이 된다.
//
// ── 개수 불변식을 건드리지 않는다 (팀장 조건 ①과 같은 형태) ─────────────────
// 여기서 만드는 GPU 자원이 **0 이다.** 인스턴스 행렬은 슬롯이 이동할 때마다 이미 매번
// 갱신되는 버퍼이고, 우리는 그 숫자를 몇 프레임 더 쓸 뿐이다. 재질·지오·파이프라인
// 무접촉.
//
// ── 충돌은 스케일을 따라가지 않는다 (알고 받아들인 것) ──────────────────────
// 충돌 판정은 배치 좌표에서 유도되고 시각 스케일을 모른다. 자라는 0.4초 동안 화면보다
// 충돌이 큰 상태가 된다 — 부품은 36m 밖에서 태어나므로 그 시간 안에 닿을 수 없다
// (달리기 11m/s × 0.4s = 4.4m). 등장 거리가 그보다 안쪽으로 내려오면 이 전제가 깨진다.

import type { System, FrameCtx } from '../kernel.js';
import type { InstancePools, SlotHandle } from './instancing.js';
import { fadeMix, type FadeEase } from '../decide/lod-fade.js';

/** 부품 하나의 완성 자세. `createSlotPool.setTransform` 이 넘긴 그대로다 */
export interface SlotTransform {
  x: number; y: number; z: number; ry: number;
  sx: number; sy: number; sz: number;
}

/**
 * 시작 스케일 배수. 0 으로 두지 않는 이유: three 는 스케일 0 행렬도 그리지만(면적 0),
 * 역행렬이 필요한 경로(노멀 행렬)에서 특이행렬이 된다. 시각적으로 0 과 구별 불가한
 * 최솟값으로 둔다.
 */
const START_SCALE = 0.02;

export interface GrowSink {
  /** 슬롯이 자리를 잡았다. 지금부터 자라기 시작한다 */
  place(h: SlotHandle, t: SlotTransform): void;
  /** 슬롯이 반납된다. 진행 중이면 버린다 */
  release(h: SlotHandle): void;
}

export interface ParcelGrowOptions {
  pools: InstancePools;
  /** 자라는 시간(초). 0 이면 아무것도 하지 않는다 — 종전 동작 */
  duration: number;
  ease?: FadeEase;
  /** 초기 충전 중에는 걸지 않는다 — `parcel-fade.ts` 와 같은 이유, 같은 gate */
  gate: () => boolean;
}

interface Entry {
  t: SlotTransform;
  elapsed: number;
}

/**
 * 진행 중인 성장 애니메이션. 핸들 객체를 키로 쓰는 이유는 `parcel-fade.ts` 와 같다 —
 * 슬롯 swap 이 인덱스를 제자리에서 고치므로 인덱스 키는 남의 슬롯을 만진다.
 */
export class ParcelGrowSystem implements System {
  readonly name = 'parcel-grow';

  private readonly pools: InstancePools;
  private readonly duration: number;
  private readonly ease: FadeEase;
  private readonly gate: () => boolean;
  private readonly entries = new Map<SlotHandle, Entry>();

  constructor(opts: ParcelGrowOptions) {
    this.pools = opts.pools;
    this.duration = opts.duration;
    this.ease = opts.ease ?? 'out'; // 등장은 초반이 빨라야 "없다가 있는" 프레임이 짧다
    this.gate = opts.gate;
  }

  /** `createSlotPool(pools, toneSink, growSink)` 에 꽂는 문 */
  sink(): GrowSink {
    return {
      place: (h, t) => this.begin(h, t),
      release: (h) => { this.entries.delete(h); },
    };
  }

  /** 지금 자라는 중인 슬롯 수. 테스트가 본다 */
  get pending(): number { return this.entries.size; }

  private begin(h: SlotHandle, t: SlotTransform): void {
    if (!(this.duration > 0) || !this.gate()) {
      this.entries.delete(h); // 재사용 슬롯에 옛 성장이 남지 않게
      return; // setTransform 은 이미 완성 자세를 썼다 — 종전 동작 그대로
    }
    this.entries.set(h, { t: { ...t }, elapsed: 0 });
    // 첫 프레임을 기다리지 않고 지금 줄인다. 안 그러면 update 전에 완성 크기로 한 번
    // 렌더돼 — 고치려는 팝 그 자체가 한 프레임 보인다(`parcel-fade.ts` 와 같은 함정).
    this.apply(h, t, START_SCALE);
  }

  private apply(h: SlotHandle, t: SlotTransform, k: number): void {
    this.pools.setTransform(h, t.x, t.y, t.z, t.ry, t.sx * k, t.sy * k, t.sz * k);
  }

  update(ctx: FrameCtx): void {
    if (this.entries.size === 0) return;
    for (const [h, e] of this.entries) {
      if (h.index < 0) { this.entries.delete(h); continue; } // 죽은 핸들 — fade 와 동일
      e.elapsed += ctx.dt;
      const mix = fadeMix(e.elapsed, this.duration, this.ease);
      this.apply(h, e.t, Math.max(START_SCALE, mix));
      if (mix >= 1) {
        // 끝값을 정확히 박는다. 보간 마지막 값은 mix=1 이라 이미 정확하지만, 위
        // `Math.max` 가 있는 한 이 줄이 완성 자세의 유일한 보증이다.
        this.apply(h, e.t, 1);
        this.entries.delete(h);
      }
    }
    ctx.probe?.('parcel_growing', this.entries.size);
  }

  dispose(): void { this.entries.clear(); }
}
