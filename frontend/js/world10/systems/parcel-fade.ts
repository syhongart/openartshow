// world10/systems/parcel-fade.ts — 새로 태어난 파셀을 **안개색에서 꺼낸다**.
//
// ── 무엇을 하는가 ───────────────────────────────────────────────────────────
// 파셀이 생기는 순간 그 부품들의 `instanceColor` 를 안개색으로 덮고, 정해진 시간에
// 걸쳐 원래 색으로 되돌린다. 화면에서는 안개 속에서 서서히 배어 나오는 것으로 보인다.
// 왜 그것이 "팍" 을 고치는지(등장 지점의 안개 진행률 62.5%)는 `decide/lod-fade.ts`.
//
// ── 개수 불변식을 건드리지 않는다 ───────────────────────────────────────────
// 여기서 만드는 GPU 자원이 **0 이다.** `instanceColor` 버퍼는 부팅 때 `warmColors` 가
// 이미 깨워 뒀고(그게 `USE_INSTANCING_COLOR` 정의를 확정하는 지점이다), 재질의 구조
// 신호는 아무것도 바꾸지 않는다 — 우리가 만지는 것은 버퍼 안의 숫자뿐이다.
// 팀장 조건 ①("첫 등장 순간에 버퍼 생성·재질 재컴파일이 나면 [7] 파이프라인 계단이다")이
// 겨냥한 사고가 이 경로이고, 그래서 이 파일에는 `new` 로 만드는 three 객체가 색 임시
// 버퍼 두 개뿐이다(둘 다 모듈 로드 시 1회).
//
// ── 초기 충전 중에는 페이드하지 않는다 ──────────────────────────────────────
// 로딩이 끝나는 순간 파셀 수백 개가 한꺼번에 태어난다. 그때까지 페이드를 걸면 세계
// **전체**가 서서히 나타나는 다른 연출이 된다. 감독 지시는 "건물들이 나타날때" —
// 걷다가 새로 뜨는 것을 가리킨다. 그래서 `gate()`(= `streaming.ready`)가 열린 뒤에만 건다.

import * as THREE from 'three/webgpu';
import type { System, FrameCtx } from '../kernel.js';
import type { InstancePools, SlotHandle } from './instancing.js';
import type { ToneSink } from './parcel-assets.js';
import { fadeMix, FADE_SECONDS, FADE_EASE, type FadeEase } from '../decide/lod-fade.js';

/** 페이드 임시 색. 모듈 로드 시 1회 — 프레임 루프에서 할당하지 않는다 */
const _cur = new THREE.Color();

interface Entry {
  /** 이 슬롯이 최종적으로 가져야 할 색 */
  target: THREE.Color;
  /**
   * 이 슬롯이 **출발한 색**. 슬롯마다 다르다 — 그 자리의 안개가 감춰주는 만큼만
   * 안개색을 섞은 값이기 때문이다(아래 `startColor`).
   *
   * 예전에는 이 필드가 없었고 `update` 가 매 프레임 `fadeColor()` 하나를 모두에게
   * 썼다. 그것이 "번쩍" 의 직접 원인이다.
   */
  from: THREE.Color;
  /** 경과(초) */
  elapsed: number;
}

export interface ParcelFadeOptions {
  pools: InstancePools;
  /** 페이드 시간(초). 0 이면 페이드하지 않는다 — 종전 동작과 동일 */
  duration?: number;
  ease?: FadeEase;
  /**
   * 시작색 공급자. 보통 `scene.fog.color` 다 — 그 거리에서 **완전히 묻힌 상태**의 색이라
   * 페이드 시작이 현재 렌더 결과와 이어진다. 안개가 꺼져 있으면(`?fogd=0`) 호출자가
   * 팔레트 색을 대신 준다.
   */
  fadeColor: () => THREE.Color;
  /** 페이드를 걸어도 되는가. 초기 충전이 끝났는지를 본다 */
  gate: () => boolean;
  /**
   * 그 부품 자리가 **안개에 얼마나 묻혀 있는가**(0~1). 0 이면 안개색을 하나도 안 섞는다.
   *
   * ── 왜 열었나 (감독 실기기 2026-08-09) ─────────────────────────────────────
   * *"가까이 가면 뭔가 건물이 번쩍해"*
   *
   * 안 주면 **항상 1** — 즉 종전 동작(무조건 안개색으로 덮기)이다. 그것이 결함이었다:
   * 안개는 51.2m 부터 시작하는데 부품은 **50.07m(건물)·20.22m(화분)** 에서도 태어나고,
   * 그 거리에서 거의 검정(`0x0b0d12`)으로 덮으면 디졸브가 아니라 **검은 덩어리가
   * 나타났다 밝아지는 것**이 된다. 실측 표와 유도는 `decide/lod-fade.ts` 의
   * `fogFactorAt` 주석 한 곳이다 — 여기에 다시 적지 않는다.
   *
   * ⚠ **호출자가 `?fademode=fog` 로 이 함수를 상수 1 로 만들 수 있다** — 감독이 두
   * 판본을 화면에서 비교하기 위한 노브다. 판정이 끝나면 진 쪽을 걷어낸다.
   */
  fogAt?: (x: number, z: number) => number;
}

/**
 * 진행 중인 페이드를 들고 매 프레임 색을 갱신한다.
 *
 * ── 슬롯 인덱스가 아니라 **핸들 객체**로 추적하는 이유 ──────────────────────
 * `InstancePools.release` 는 마지막 슬롯을 빈자리로 옮기며 **핸들의 index 를 제자리에서
 * 고친다.** 인덱스를 키로 잡으면 그 순간 남의 슬롯을 칠하게 된다. 핸들 객체를 키로 쓰면
 * 이사와 무관하게 같은 대상을 가리킨다.
 */
export class ParcelFadeSystem implements System {
  readonly name = 'parcel-fade';

  private readonly pools: InstancePools;
  private readonly duration: number;
  private readonly ease: FadeEase;
  private readonly fadeColor: () => THREE.Color;
  private readonly gate: () => boolean;
  private readonly fogAt: (x: number, z: number) => number;
  private readonly entries = new Map<SlotHandle, Entry>();

  constructor(opts: ParcelFadeOptions) {
    this.pools = opts.pools;
    this.duration = opts.duration ?? FADE_SECONDS;
    this.ease = opts.ease ?? FADE_EASE;
    this.fadeColor = opts.fadeColor;
    this.gate = opts.gate;
    // 안 주면 항상 1 — **종전 동작이 기본값이다**(무조건 안개색으로 덮는다).
    this.fogAt = opts.fogAt ?? (() => 1);
  }

  /**
   * 이 자리에서 페이드가 **출발할 색**. 목표색에 안개색을 그만큼만 섞는다.
   *
   *   안개율 1 → 안개색 그대로(먼 곳. 종전과 같다)
   *   안개율 0 → **목표색 그대로** → 페이드 폭 0 → 아무 일도 안 일어난다
   *
   * 좌표를 모르면(`x`·`z` 가 `undefined`) 종전대로 안개색을 쓴다 — 조용히 틀리는 것보다
   * 조용히 예전으로 돌아가는 편이 낫다.
   */
  private startColor(out: THREE.Color, target: THREE.Color, x?: number, z?: number): THREE.Color {
    if (x === undefined || z === undefined) return out.copy(this.fadeColor());
    const k = this.fogAt(x, z);
    const f = Number.isFinite(k) ? Math.min(1, Math.max(0, k)) : 1;
    return out.copy(target).lerp(this.fadeColor(), f);
  }

  /**
   * 파셀 빌더가 색을 정하는 지점에 꽂는 문. `createSlotPool(pools, sink)` 에 넘긴다.
   *
   * 어댑터를 **감싸지 않고 안쪽에 꽂는** 이유: 감싸면 tone→색 변환이 어댑터 안에 숨어
   * 있어 목표색을 알 수 없다. 여기서는 이미 확정된 색을 받는다.
   */
  sink(): ToneSink {
    return {
      apply: (h, hex, x, z) => this.begin(h, hex, x, z),
      release: (h) => { this.entries.delete(h); },
    };
  }

  /** 지금 페이드 중인 슬롯 수. HUD·테스트가 본다 */
  get pending(): number { return this.entries.size; }

  private begin(h: SlotHandle, hex: number, x?: number, z?: number): void {
    // 페이드가 꺼져 있거나 초기 충전 중이면 종전과 똑같이 즉시 확정한다.
    if (!(this.duration > 0) || !this.gate()) {
      _cur.setHex(hex);
      this.pools.setColor(h, _cur);
      this.entries.delete(h); // 재사용 슬롯에 옛 페이드가 남아 있지 않게
      return;
    }
    let e = this.entries.get(h);
    if (e) { e.target.setHex(hex); e.elapsed = 0; } // 슬롯 재사용 — 처음부터 다시
    else {
      e = { target: new THREE.Color(hex), from: new THREE.Color(), elapsed: 0 };
      this.entries.set(h, e);
    }
    // 출발색을 **이 슬롯 자리 기준으로** 정한다. 안개가 0% 인 거리면 목표색과 같아져
    // 페이드가 아무 일도 안 한다 — 그것이 맞다(안개가 안 감춰주는데 덮으면 "번쩍" 이다).
    this.startColor(e.from, e.target, x, z);
    // 첫 프레임을 기다리지 않고 지금 덮는다. 안 그러면 `update` 가 오기 전에 한 프레임이
    // 렌더돼 **바로 그 프레임에 팝인이 보인다** — 고치려는 것 자체다.
    this.pools.setColor(h, e.from);
  }

  update(ctx: FrameCtx): void {
    if (this.entries.size === 0) return;
    for (const [h, e] of this.entries) {
      // 반납된 슬롯은 죽은 핸들 표식을 단다(`release` 가 index=-1). 이사 간 것이 아니므로
      // 여기서 걷어낸다 — 안 걷으면 `setColor` 가 조용히 무시돼 목록만 자란다.
      if (h.index < 0) { this.entries.delete(h); continue; }
      e.elapsed += ctx.dt;
      const mix = fadeMix(e.elapsed, this.duration, this.ease);
      // **엔트리마다 자기 출발색에서** 간다. 예전에는 `fadeColor()` 하나를 모두에게
      // 썼고, 그래서 안개가 0% 인 자리의 부품도 검정에서 출발했다.
      _cur.copy(e.from).lerp(e.target, mix);
      this.pools.setColor(h, _cur);
      if (mix >= 1) {
        // 끝값을 한 번 더 박는다. **뮤테이션으로 확인했다 — 이 줄을 지워도 테스트가
        // 깨지지 않는다.** `lerp(alpha=1)` 이 이미 목표색을 주고, 이 엔트리는 바로
        // 아래에서 지워져 아무도 그 값을 다시 읽지 않기 때문이다. 즉 여기가 막는
        // "보간 오차 잔류" 는 **관측 가능한 것이 없다.** 방어로만 남긴다.
        this.pools.setColor(h, e.target);
        this.entries.delete(h);
      }
    }
    ctx.probe?.('parcel_fading', this.entries.size);
  }

  dispose(): void { this.entries.clear(); }
}
