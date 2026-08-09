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
   * ⚠ 이 문단은 원래 *"`getDirection` 은 소스가 둘이고(조작 중 = 실제 이동 방향 /
   * 손 뗌 = 시선 방향)"* 로 시작했다. **2026-08-09 부로 거짓이다** — 그 이원화가
   * 후진 결함의 원인이어서 없앴고(`systems/player.ts` 의 `direction` 본문이 경위의
   * SSOT 다), 지금 소스는 마지막으로 실제로 간 방향 하나뿐이다. 검수관 비블로커 1.
   *
   * **그런데 이 계수는 그 정정 뒤에도 유효하다.** 이유가 소스 개수가 아니기 때문이다:
   * 충돌이 붙은 뒤로 **막히면 방향 값이 낡은 채 굳는다**(`player.ts` 의 `if (l > 0)`).
   * 그래서 벽에 끼인 채 눌렀다 뗐다 하면 방향이 크게 튀고, `lookAheadCenter` 가 판정
   * 중심을 최대 **1.0셀(32m)** 옮긴다. 소스를 하나로 합쳐도 이 축은 남는다.
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
   * look-ahead 거리(셀). **기본값 0 — 끈다.**
   *
   * ── 왜 껐나 (감독 실기기 2026-08-09) ──────────────────────────────────────
   * *"뒤에 조금만 가면 갑자기 사라져"* — 스크린샷 두 장에서 강 건너 건물·가로등·강이
   * 통째로 사라졌다.
   *
   * **이 값은 "예측" 이 아니라 "판정 중심 이동" 이다 — 제로섬이다.** 중심을 진행방향으로
   * 옮기면 그쪽 반경이 늘어나는 만큼 **반대쪽 반경이 줄어든다.** 1인칭에서 후진할 때
   * 줄어드는 쪽은 **보고 있는 쪽**이라, 화면 정면이 반경 밖으로 밀려나 언로드된다.
   *
   * 실측(순수 함수, 플레이어가 파셀 (0,0) 한가운데, 앞 = −z, `ahead` 0.5):
   *
   *     상태   중심z    앞 1셀  앞 2셀  앞 3셀 | 뒤 1셀  뒤 2셀
   *     정지    0.00     near    far     none  |  near    far
   *     전진   −0.50     near    mid     none  |  mid     none
   *     후진   +0.50     mid    **none**  none  |  near    mid
   *                             ↑ 64m 앞이 통째로 사라진다
   *
   * ── 무엇을 잃는가 (정직하게) ────────────────────────────────────────────
   * 위 표에서 보듯 look-ahead 의 실제 이득은 *"더 멀리 본다"* 가 아니라 **진행방향
   * 파셀의 tier 승격**이다(전진 시 앞 2셀 far→mid). 끄면 그 예열이 사라져 앞 2셀이
   * 저해상으로 남는다 — 다만 **사라지지는 않고**, 가까워지면 자연히 승격된다.
   * 화질 예열 하나와 "보는 것이 사라짐" 을 맞바꾼 것이고, 후자가 압도적으로 나쁘다.
   *
   * ── 예측 로딩은 죽지 않았다 ────────────────────────────────────────────
   * 감독 반문 *"뒤로 가도 예측로딩 하면 안되나?"* 에 대한 답: 진행방향 우선순위 보너스
   * (`decide/stream.ts` 의 `toward` → `loadPriority`)가 **살아 있다.** 그쪽이 진짜
   * 예측이다 — 우선순위만 바꾸므로 **아무것도 잃지 않는다.** 나는 처음에 이 둘을
   * 구별하지 못하고 *"look-ahead 를 끄면 예측이 사라진다"* 라고 판단했고, 그래서
   * 이 값을 0 으로 내린 커밋(`df9a6d1`)을 한 번 되돌렸다. **그 판단이 틀렸다.**
   *
   * ── 더 나은 안이 있다 (미집행) ──────────────────────────────────────────
   * 중심을 옮기는 대신 **진행방향으로만 반경을 늘리면**(비대칭 밴드 / 두 원판의 합집합)
   * 얻기만 하고 잃지 않는다. 대가는 파셀 수 증가이고, 슬롯 예산(`poolBudget`)이 밴드
   * 반경에서 유도되므로 개수 불변식 게이트의 기준선이 함께 움직인다 — 되돌리기가 비싸
   * **팀장 판정 대상**이다(태스크 #232).
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
    // look-ahead 를 **실제 진행 정도로 줄인다**(위 `getSpeedFactor` 문단). 안 주면 1.
    // 음수·NaN 이 들어와도 0~1 로 가둔다.
    //
    // ⚠ **기본값이 0 이므로 이 계수는 지금 아무 일도 하지 않는다**(0 을 줄여도 0).
    //    옵션과 배선을 남겨 둔 것은 아래 `lookAhead` 를 다시 켤 때 짝이 필요해서다.
    //    "동작한다" 고 읽지 마라 — 죽어 있다(태스크 #231).
    const raw = o.getSpeedFactor?.() ?? 1;
    const factor = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 1;
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
