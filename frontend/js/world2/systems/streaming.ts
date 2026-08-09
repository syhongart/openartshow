// world2/systems/streaming.ts — 파셀 생명주기 집행.
//
// ── 판정과 집행의 분리 ───────────────────────────────────────────────────────
// 이 파일에는 **거리 임계도 우선순위 공식도 없다.** 전부 decide/stream.ts와 decide/lod.ts에
// 있고 여기서는 그 결과를 실행만 한다. 현행 `updateStreaming`이 101줄·if 25개가 된 이유가
// 정확히 이 둘을 한 함수에 둔 것이었다.
//
// ── 큐를 보관하지 않는다 ─────────────────────────────────────────────────────
// 현행은 로드 큐를 상태로 들고 있었고, 그래서 (a)큐에 남은 job이 유효한지 매 프레임 검사하고
// (b)떠난 파셀 job을 지우는 코드가 필요했다. 그 검사가 want 계산과 어긋나 "이미 떠난 파셀이
// 뒤늦게 로드되는" 버그가 났다. 여기서는 매 프레임 want를 새로 내고 차이만 본다 — 보관하는
// 큐가 없으니 청소할 상태도, 어긋날 두 번째 진실도 없다.
//
// ── 부하 분산 ────────────────────────────────────────────────────────────────
// 프레임당 처리량은 남은 프레임 시간에서 나온다(streamBudgetMs). 남는 시간을 다 쓰지 않고
// 절반만 쓰며 상한을 둔다 — 목적이 총 처리량이 아니라 프레임 균일성이기 때문이다.

import type { FrameCtx, System } from '../kernel.js';
import {
  computeWant, diffParcels, takeBudget, streamBudgetMs,
  type ParcelKey, type WantEntry,
} from '../decide/stream.js';
import { lookAheadCenter, TIERS, type Tier, type TierBands } from '../decide/lod.js';

/** 로드된 파셀 한 개. 빌더가 무엇을 담든 스트리밍은 들여다보지 않는다. */
export interface ParcelHandle {
  readonly key: ParcelKey;
  readonly tier: Tier;
}

export interface ParcelBuilder {
  /** 파셀을 만든다. 동기 — 예산 집행이 호출 횟수로 이뤄지므로 여기서 await하지 않는다. */
  build(px: number, pz: number, tier: Exclude<Tier, 'none'>): ParcelHandle;
  /** 파셀을 반납한다. 풀 슬롯 반납이 여기서 일어난다. */
  release(handle: ParcelHandle): void;
  /**
   * tier만 바꿔본다. 재생성 없이 됐으면 새 핸들, 안 되면 null(그러면 release→build).
   * 슬롯 풀 설계에서는 대개 여기서 끝난다 — 그게 스파이크를 없애는 지점이다.
   */
  retier?(handle: ParcelHandle, tier: Exclude<Tier, 'none'>): ParcelHandle | null;
  /** tier별 예상 비용(ms). 예산 산정에만 쓴다 — 틀려도 기아 방지 규약이 막아준다. */
  costOf(tier: Exclude<Tier, 'none'>): number;
}

export interface StreamingOptions {
  builder: ParcelBuilder;
  /** 셀 크기(월드 미터). 미터↔셀 환산은 **여기 한 곳에서만** 한다 */
  cellX: number;
  cellZ: number;
  getPosition: () => { x: number; z: number };
  /** 이동/시선 방향(월드). 없으면 방향 보너스 0 */
  getDirection?: () => { x: number; z: number };
  /**
   * 실제 진행 정도(0~1). `lookAhead` 에 곱해진다. **없으면 1**(예전 동작).
   *
   * ── 왜 생겼나 (감독 실기기 2026-08-08) ────────────────────────────────────
   * *"분수대에 끼일때. 멀리있는 lod가 나왔다가 안나왔다가 해"*
   *
   * `getDirection` 은 소스가 둘이고(조작 중 = 실제 이동 방향 / 손 뗌 = 시선 방향)
   * 충돌이 붙은 뒤로 **막히면 앞쪽 값이 낡은 채 굳는다.** 그래서 벽에 끼인 채
   * 눌렀다 뗐다 하면 방향이 크게 튀고, `lookAheadCenter` 가 판정 중심을 최대
   * **1.0셀(32m)** 옮긴다.
   *
   * 실측(순수 모듈, 2.0셀 거리의 파셀 하나를 방향만 돌려 관찰):
   *
   *     방향   0°  거리 1.968셀  far
   *     방향  90°  거리 1.403셀  **mid**
   *     방향 180°  거리 1.968셀  far
   *     방향 270°  거리 2.403셀  **none** ← 사라진다
   *
   * LOD 히스테리시스 폭은 near 0.15셀·far 0.30셀 — **중심 진동이 3~6배 압도한다.**
   * 깜빡임을 막으라고 둔 여유대역이 무력화된 것이다.
   *
   * 처방은 밴드를 넓히는 것이 아니라 **진동 자체를 없애는 것**이다. look-ahead 의 목적이
   * *"가려는 쪽 파셀을 미리 올린다"* 이므로 **못 가는 동안에는 미리 올릴 이유가 없다.**
   * 막히면 이 계수가 0 에 가까워져 판정 중심이 발밑에 고정되고, 방향이 뭐로 튀든
   * 결과가 안 변한다.
   */
  getSpeedFactor?: () => number;
  bands?: TierBands;
  limits?: { minPx: number; maxPx: number; minPz: number; maxPz: number };
  /**
   * 지을 수 없는 파셀. 생략하면 `computeWant`의 기본값(= 물)이 쓰인다.
   *
   * 실제 월드는 생략하는 것이 맞다 — 물 판정은 `decide/water.ts` 하나뿐이고 여기서 다시
   * 정하지 않는다. 이 문은 **지형과 무관하게 스트리밍 기계만 시험하려는 테스트**를 위한
   * 것이다(로드/반납/누수는 물이 있든 없든 같은 성질이어야 한다).
   */
  blocked?: (px: number, pz: number) => boolean;
  /** 프레임 목표 시간(ms). 기본 60fps */
  targetMs?: number;
  /**
   * look-ahead 거리(셀). **기본 0 — 꺼져 있다** (팀장 판정 2026-08-09, 아래 소비 지점 참조).
   *
   * 값을 주면 예전처럼 진행 방향 앞을 미리 올린다. 되돌릴 때 쓰는 문이다.
   */
  lookAhead?: number;
  /** 파셀이 바뀐 프레임에 강제 렌더를 요청한다(커널 게이팅 1회 통과) */
  markDirty?: () => void;
}

export interface StreamStats {
  loaded: number;
  wanted: number;
  /** 이번 프레임에 실제로 만든/반납한 수 */
  built: number;
  released: number;
  retiered: number;
  /**
   * 교체의 **방향**. 직진 중이라면 강등만 나와야 한다 — 승격이 섞이면 그만큼이
   * 경계 왕복이다(팀장 조건 3, 2026-08-07: 42m 에 왕복 3건 이상이면 히스테리시스
   * 폭 확대를 병행한다).
   *
   * 왜 `retiered` 총계로 못 보는가: 그 수는 "몇 번 바뀌었나" 만 말하고, 한 방향으로
   * 흘러간 것과 같은 경계를 오간 것을 구별하지 못한다. **재는 축이 없으면 판정도 없다.**
   */
  promoted: number;
  demoted: number;
  /** 아직 못 따라잡은 작업 수 */
  pending: number;
  byTier: Record<string, number>;
}

export class StreamingSystem implements System {
  readonly name = 'streaming';

  private readonly opts: StreamingOptions;
  private readonly handles = new Map<ParcelKey, ParcelHandle>();
  /** decide 계층에 넘길 tier 맵. handles와 항상 같이 갱신한다 */
  private readonly tiers = new Map<ParcelKey, Tier>();
  private last: StreamStats = {
    loaded: 0, wanted: 0, built: 0, released: 0, retiered: 0,
    promoted: 0, demoted: 0, pending: 0, byTier: {},
  };
  /** 초기 충전이 끝났는가 — 로딩 화면이 이걸 본다 */
  private settled = false;

  constructor(opts: StreamingOptions) {
    this.opts = opts;
  }

  update(ctx: FrameCtx): void {
    // 탭이 숨어 있으면 스트리밍하지 않는다. 보이지 않는 화면을 위해 GPU 자원을 만드는 건
    // 그 자체로 낭비이고, 복귀 프레임에 몰려 스파이크가 된다.
    if (ctx.hidden) return;

    const o = this.opts;
    const pos = o.getPosition();
    const dir = o.getDirection?.() ?? { x: 0, z: 0 };

    // 미터 → 셀. 이 환산은 이 두 줄에만 존재한다.
    const cellPx = pos.x / o.cellX;
    const cellPz = pos.z / o.cellZ;
    // look-ahead 를 **실제 진행 정도로 줄인다**(위 `getSpeedFactor` 문단). 안 주면 1 —
    // 예전 동작이 기본값이다. 음수·NaN 이 들어와도 0~1 로 가둔다: 이 값이 커지면
    // 판정 중심이 더 멀리 튀어 고치려던 증상을 되살린다.
    const raw = o.getSpeedFactor?.() ?? 1;
    const factor = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
    // ── 기본 0 — **look-ahead 를 껐다** (감독 지시 + 팀장 판정 2026-08-09) ──────
    //
    // 감독 실기기: *"뒤로 후진했다가 놓으면 앞이 갑자기 나타나"* · *"뒤로 뺄 때 더 빨리
    // lod 가 동작하는 것 같기도 해"* → *"근본원인을 찾아 복구해. 코드를 또 만들지 말고."*
    //
    // ── 기전 ────────────────────────────────────────────────────────────────
    // `getDirection` 이 주는 방향은 **소스가 둘**이다(`systems/player.ts` 의 `direction`):
    // 조작 중이면 `moveDir`(실제로 간 방향), 손을 떼면 `facing(yaw)`(보는 방향).
    // **후진은 그 둘이 정반대가 되는 유일한 조작**이라, 후진하는 내내 판정 중심이 몸보다
    // 뒤에 놓인다 → 뒤쪽은 계속 승격되고 앞쪽은 계속 강등된다. 손을 떼는 순간 중심이
    // 앞으로 1.0셀(32m) 건너뛰고 그것이 통째로 뒤집힌다.
    //
    // ── 실측 (기본 라이브 값, 헤드리스 2026-08-09) ───────────────────────────
    // 후진 16틱 뒤 손 떼기 직전의 **동시 페이드 슬롯**:
    //
    //     후진  125        ← 파셀 하나가 17~19 슬롯이니 7파셀분이 동시에 교체 중
    //     전진    4        ← 대조군. 전진은 두 소스가 거의 같아 방향 점프가 없다
    //
    // **31배.** 감독이 *"뒤로 뺄 때 LOD 가 더 빨리 동작한다"* 고 한 것이 이 수다.
    // (손 뗀 뒤 **새로 로드된 파셀은 양쪽 다 0** 이었다 — 부팀장의 첫 가설 "손 떼면
    // 무더기로 새로 로드된다" 는 실측으로 **틀렸다**. 일어나는 일은 로드가 아니라 교체다.)
    //
    // ── 왜 방향 소스를 통일하지 않고 look-ahead 를 껐나 ──────────────────────
    // 소스 통일이 근본 처방이지만 **새 코드**이고, 감독이 이번에 명시적으로 금지했다.
    // 그리고 "손 뗐을 때 어디를 미리 올릴까" 라는 별개 설계 문제를 먼저 풀어야 한다.
    // 0 은 코드 신설 없이 방향 의존을 **원리적으로** 없앤다 — 중심이 늘 발밑이면
    // 방향이 무엇이든 판정이 같다.
    //
    // ── 대가 (알고 치른다) ──────────────────────────────────────────────────
    // 진행 방향 파셀을 미리 올리는 예측 로딩을 잃는다. 앞으로 걸을 때 파셀이 조금 늦게
    // 뜰 수 있다. 그 교환이 감독 화면에서 나쁘면 `?` 노브가 아니라 이 기본값을 되돌리고
    // **방향 소스 통일**(별건 태스크)로 가는 것이 순서다.
    const c = lookAheadCenter(cellPx, cellPz, dir.x, dir.z, (o.lookAhead ?? 0) * factor);

    const want = computeWant({
      cx: c.x, cz: c.z, dirX: dir.x, dirZ: dir.z,
      have: this.tiers, bands: o.bands, limits: o.limits, blocked: o.blocked,
    });
    const diff = diffParcels(want, this.tiers);

    let built = 0, released = 0, retiered = 0, promoted = 0, demoted = 0;

    // ① 언로드 먼저. 슬롯을 비워야 이번 프레임 로드가 그 자리를 쓸 수 있다.
    //    언로드는 예산에서 빼지 않는다 — 반납은 생성과 달리 GPU 자원을 만들지 않는다.
    for (const k of diff.unload) {
      const h = this.handles.get(k);
      if (!h) continue;
      o.builder.release(h);
      this.handles.delete(k);
      this.tiers.delete(k);
      released++;
    }

    // ② 예산 산정. dt는 초 단위이므로 ms로 환산한다.
    const frameMs = ctx.dt * 1000;
    const targetMs = o.targetMs ?? 1000 / 60;
    let budget = streamBudgetMs(frameMs, targetMs);

    // ③ retier — 대개 슬롯 행렬만 고치므로 생성보다 훨씬 싸다. 먼저 처리한다.
    const rt = takeBudget(diff.retier, budget, (r) => o.builder.costOf(r.to) * 0.25);
    for (const r of rt.run) {
      const h = this.handles.get(r.key);
      if (!h) continue;
      // 방향을 **바꾸기 전에** 읽는다 — 아래에서 `this.tiers` 를 덮어쓴다.
      const from = this.tiers.get(r.key);
      if (from) {
        const step = TIERS.indexOf(r.to) - TIERS.indexOf(from);
        if (step < 0) promoted++; else if (step > 0) demoted++;
      }
      const next = o.builder.retier?.(h, r.to) ?? null;
      if (next) {
        this.handles.set(r.key, next);
        this.tiers.set(r.key, r.to);
      } else {
        // 재생성 경로 — 여기 오는 게 잦으면 풀 설계가 틀린 것이다.
        o.builder.release(h);
        const pk = r.key.indexOf(',');
        const built2 = o.builder.build(Number(r.key.slice(0, pk)), Number(r.key.slice(pk + 1)), r.to);
        this.handles.set(r.key, built2);
        this.tiers.set(r.key, r.to);
      }
      budget -= o.builder.costOf(r.to) * 0.25;
      retiered++;
    }

    // ④ 로드 — 남은 예산으로. prio 순서를 지킨다(takeBudget이 순서를 보장한다).
    const ld = takeBudget(diff.load, Math.max(0, budget), (w: WantEntry) => o.builder.costOf(w.tier));
    for (const w of ld.run) {
      const h = o.builder.build(w.px, w.pz, w.tier);
      this.handles.set(w.key, h);
      this.tiers.set(w.key, w.tier);
      built++;
    }

    // 파셀이 바뀌었으면 다음 프레임은 반드시 그린다. 프레임 캡에 걸려 새 파셀이 한 박자
    // 늦게 나타나면 그게 팝인으로 보인다.
    if ((built || released || retiered) && o.markDirty) o.markDirty();

    const pending = ld.defer.length + rt.defer.length;
    if (!this.settled && pending === 0 && diff.load.length === 0) this.settled = true;

    const byTier: Record<string, number> = {};
    for (const t of this.tiers.values()) byTier[t] = (byTier[t] ?? 0) + 1;

    this.last = {
      loaded: this.handles.size, wanted: want.length,
      built, released, retiered, promoted, demoted, pending, byTier,
    };

    if (ctx.probe) {
      ctx.probe('parcels_loaded', this.handles.size);
      ctx.probe('parcels_pending', pending);
      if (built) ctx.probe('parcels_built', built);
    }
  }

  /** 이번 프레임 스냅샷. 판정하지 않고 사실만 돌려준다. */
  stats(): StreamStats { return this.last; }

  /**
   * 초기 충전 진행률 0~1. 로딩 화면이 쓴다.
   * `wanted`가 0인 첫 프레임에 1을 돌려주면 로딩이 끝난 것처럼 보이므로 0으로 둔다.
   */
  progress(): number {
    const { loaded, wanted } = this.last;
    if (wanted <= 0) return this.settled ? 1 : 0;
    return Math.min(1, loaded / wanted);
  }

  /** 원하는 파셀이 전부 올라왔는가 — 로딩 화면을 걷어도 되는 시점 */
  get ready(): boolean { return this.settled; }

  /** 현재 tier 맵의 읽기 전용 뷰(HUD·불변식 검사용) */
  get tierMap(): ReadonlyMap<ParcelKey, Tier> { return this.tiers; }

  dispose(): void {
    for (const h of this.handles.values()) this.opts.builder.release(h);
    this.handles.clear();
    this.tiers.clear();
  }
}
