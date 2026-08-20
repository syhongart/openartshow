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
  computeWant, diffParcels, takeBudget, streamBudgetMs, parcelKey,
  type ParcelKey, type WantEntry,
} from '../decide/stream.js';
import { lookAheadCenter, TIERS, type Tier, type TierBands } from '../decide/lod.js';

/** 로드된 파셀 한 개. 빌더가 무엇을 담든 스트리밍은 들여다보지 않는다. */
export interface ParcelHandle {
  readonly key: ParcelKey;
  readonly tier: Tier;
}

export interface ParcelBuilder {
  /**
   * 파셀을 만든다. 동기 — 예산 집행이 호출 횟수로 이뤄지므로 여기서 await하지 않는다.
   * @param instant 등장 연출을 건너뛴다(아래 `pendingInstant` 참조).
   */
  build(px: number, pz: number, tier: Exclude<Tier, 'none'>, instant?: boolean): ParcelHandle;
  /**
   * 파셀을 반납한다. 풀 슬롯 반납이 여기서 일어난다.
   * @param instant 퇴장 연출(수축)을 건너뛴다(아래 `pendingInstant` 참조).
   */
  release(handle: ParcelHandle, instant?: boolean): void;
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
  /**
   * **편집 확정으로 버린 파셀** — 다시 세울 때 등장 연출을 건너뛴다 (팀장 판정 (가),
   * 2026-08-20). 감독 판정: *"튄다 — 거슬린다."*
   *
   * ── 무엇이 문제였나 (실측) ──────────────────────────────────────────────
   * 마을 파츠를 확정하면 `village.freeze` → `notify` → `invalidate` 로 그 파셀이 통째로
   * 버려졌다가 다시 만들어지는데, 그 반납·재생성이 등장/퇴장 연출을 **그대로 탔다** —
   * **0.25s 수축 → 사라짐 → 0.4s 재성장.** 액자 쪽 튐(한 프레임 재생성)과 기전도 크기도
   * 다르다. 백로그 `G-EDIT2` 는 오래 액자 기전만 적고 있었고 마을에 대해서는 거짓이었다.
   *
   * ── 왜 여기서 판정하나 ──────────────────────────────────────────────────
   * 이 집합에 들어가는 유일한 문이 `invalidate()` 이고, 그 호출부는 `world2/main.ts` 의
   * 마을 알림 **한 곳**이다. 즉 *"편집 확정으로 버려졌다"* 가 **구조로** 성립한다 —
   * 거리·시간 같은 것을 다시 재지 않는다. 소비는 아래 ④ 로드에서 `delete` 로 하므로
   * **한 번 쓰면 사라진다**(다음 등장은 정상 연출).
   *
   * ── 전역 「즉시 창」을 기각한 이유 ───────────────────────────────────────
   * 팀장이 (나) *"확정 직후 N 프레임 동안 전부 끔"* 을 기각했다: 새 튜닝 상수가 생기고
   * 그 값은 화면으로만 판정돼 감독 왕복이 붙는데, 결함 없는 파셀의 정상 등장까지
   * 즉시화한다. 이 집합은 **버려진 그 파셀만** 가리키므로 그 비용이 없다.
   *
   * ── 경계 ────────────────────────────────────────────────────────────────
   * **재빌드 자체의 비용(ms)은 이 결정의 범위 밖이고 관측이 미해결로 남는다**(게시판 P5).
   * 여기서 없애는 것은 **연출 0.65초**다. 수치칸이 타이핑 한 글자마다 확정하는 축
   * (`world2/edit/panel/inspector.ts`)도 그대로다 — 팀장이 보류했고 발화 조건은
   * **감독이 「즉시 재빌드 반복이 거슬린다」고 말하는 것**이다.
   */
  private readonly pendingInstant = new Set<ParcelKey>();
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

    // ── 이벤트 방위 태그 (감독 마크 실측 강화, 2026-08-10) ──────────────────
    // 거리만으로는 마크 ±2.5초 창의 사건이 **화면 안(앞)인지 등 뒤인지** 안 갈렸다 —
    // "앞으로 갈 때 번개치듯" 리포트에서 승격·강등 5건이 잡혔는데 전부 용의선상에
    // 남았다. 진행 방향과의 내적 부호로 앞/뒤를 이름에 박는다. 값(거리)은 그대로다.
    // 정지 상태(dir≈0)면 방향이 없으므로 태그를 생략한다 — 없는 정보를 지어내지 않는다.
    const hasDir = Math.hypot(dir.x, dir.z) > 1e-3;
    const sideOf = (dx: number, dz: number): string =>
      hasDir ? ((dx * dir.x + dz * dir.z) >= 0 ? '(앞)' : '(뒤)') : '';

    // ① 언로드 먼저. 슬롯을 비워야 이번 프레임 로드가 그 자리를 쓸 수 있다.
    //    언로드는 예산에서 빼지 않는다 — 반납은 생성과 달리 GPU 자원을 만들지 않는다.
    for (const k of diff.unload) {
      const h = this.handles.get(k);
      if (!h) continue;
      o.builder.release(h);
      this.handles.delete(k);
      this.tiers.delete(k);
      released++;
      if (ctx.probe) {
        const pk = k.indexOf(',');
        const dx = Number(k.slice(0, pk)) * o.cellX - pos.x;
        const dz = Number(k.slice(pk + 1)) * o.cellZ - pos.z;
        ctx.probe(`ev:파셀반납${sideOf(dx, dz)}`, Math.hypot(dx, dz));
      }
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
        // ── 이벤트로도 낸다 (감독 지시 2026-08-10 *"로그 더 추가해서 원인을 파악"*) ──
        // 총계(`promoted`·`demoted`)는 *"몇 번"* 만 말하고 **언제**를 잃는다. 감독이
        // 보고한 증상은 *"뒤로 움직이는 **순간**"* 이라 시점이 전부다.
        //
        // 값은 **파셀 중심까지의 거리(m)** 다 — tier 이름은 이름에 들어 있고, 정작
        // 궁금한 것은 *"얼마나 가까운 데서 일어났나"* 이기 때문이다. 눈앞(30m)에서
        // 나는 것과 저 끝(70m)에서 나는 것은 화면에서 전혀 다른 일이다.
        if (ctx.probe) {
          const pk = r.key.indexOf(',');
          const dx = Number(r.key.slice(0, pk)) * o.cellX - pos.x;
          const dz = Number(r.key.slice(pk + 1)) * o.cellZ - pos.z;
          ctx.probe(`ev:${step < 0 ? 'tier승격' : 'tier강등'}${sideOf(dx, dz)}`, Math.hypot(dx, dz));
        }
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
      // `delete` 가 곧 소비다 — 한 번 쓰면 사라지고 다음 등장은 정상 연출이다.
      const h = o.builder.build(w.px, w.pz, w.tier, this.pendingInstant.delete(w.key));
      this.handles.set(w.key, h);
      this.tiers.set(w.key, w.tier);
      built++;
      if (ctx.probe) {
        const dx = w.px * o.cellX - pos.x;
        const dz = w.pz * o.cellZ - pos.z;
        ctx.probe(`ev:파셀생성${sideOf(dx, dz)}`, Math.hypot(dx, dz));
      }
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

  /**
   * 그 파셀을 **지금 들고 있는가** (W8-9). 마을 파츠가 화면에 있는 것과 같은 뜻이다 —
   * 여기 없으면 슬롯이 반납된 상태이고(`release` → `ZERO` 행렬) 건물은 사라져 있다.
   *
   * ── 왜 `tierMap` 을 그대로 안 쓰게 하는가 ─────────────────────────────────
   * 그 맵의 키는 `"px,pz"` 문자열이다. 소비자가 그것을 알면 **키 형식이 두 곳에 살고**,
   * `parcelKey` 를 바꾸는 순간 조용히 어긋난다(조회가 언제나 `false` 를 내고, 증상은
   * «작품이 영영 안 보인다» 로만 나타난다). 형식을 이 클래스 안에 가둔다.
   *
   * 첫 소비자는 액자다 — 감독 지시 *"건물이 사라질때 같이 사라지고 나왔으면"*.
   * 액자가 거리를 다시 재지 않는 이유는 `decide/art-light.ts` 의 `artParcelXZ` 헤더에 있다.
   *
   * ── 🔴 이 함수는 신설 직후 **아무 검사도 안 받고 있었다** (검수관 실측 2026-08-18) ──
   * 여기를 **항상 `true`** 로 바꿔도 관련 4개 스위트가 **0 failed** 였다 — 액자 쪽 검사는
   * `loaded` 콜백을 스텁으로 주입해 **소비 측만** 보고, 배선 검사는 문자열만 본다.
   * 판정과 집행을 잇는 경계가 비어 있었다(이 저장소가 이름 붙인 「판정/집행 분리의 구멍」).
   * `tests/world2-streaming-system.test.ts` 의 W8-9 블록이 그 자리를 메웠다:
   *
   *   항상 `true` 로                 5 failed
   *   항상 `false` 로                4 failed
   *   키 조립 좌표 순서 뒤집기       3 failed
   *   **등가 대조군 — 주석만**      **0 failed**
   *
   * ── ⚠ 액자 반영은 스트리밍보다 **1프레임 늦다** (검수관 P2, 같은 날) ──────────
   * `kernel.update` 는 `add` 순서대로 돌고(`kernel.ts`), `main.ts` 가 features 를
   * `kernel.add(streaming)` **앞**에 넣는다. 즉 파셀이 언로드된 그 프레임에 액자는 이미
   * 지나간 뒤다. 16ms 라 육안 영향이 없다고 판단해 **순서를 안 바꿨다** — features 의
   * add 순서는 하늘·물·NPC 가 함께 타는 자리라 되돌리기가 싸지 않다. 태스크 #115.
   */
  isLoaded(px: number, pz: number): boolean {
    return this.tiers.has(parcelKey(px, pz));
  }

  /**
   * 그 파셀을 **버린다.** 다음 `update` 가 `want` 에 다시 넣어 새로 만든다.
   *
   * ── 왜 «다시 만든다» 가 아니라 «버린다» 인가 ───────────────────────────────
   * 여기서 곧바로 `build` 하면 **프레임 예산 밖에서** 파셀이 생긴다. 스트리밍이 예산을
   * 두는 이유가 그것인데(`streamBudgetMs`), 편집이 그 규약의 뒷문이 되면 «감독이 건물을
   * 옮길 때마다 한 프레임 튄다» 가 된다. 버리기만 하면 다음 `update` 의 `diff.load` 에
   * 정상 진입해 예산·우선순위를 그대로 탄다.
   *
   * 반납은 예산에서 빼지 않는다는 규약(위 ①)과도 같은 방향이다 — 반납은 GPU 자원을
   * 만들지 않는다.
   *
   * ⚠ **한 프레임(또는 예산에 밀리면 여러 프레임) 동안 그 파셀이 비어 보인다.** 편집
   * 중에는 그것이 «지웠다가 다시 놓는» 피드백으로 읽히지만, 드래그처럼 연속으로 부르면
   * 건물이 계속 되감긴다 — 연속 조작은 놓는 순간에만 이것을 불러야 한다. 그 판단은
   * 편집 UI 몫이고 여기서 못 막는다.
   * ⚠ **「성장 애니메이션이 처음부터 돈다」는 2026-08-20 부로 이 경로에서 안 돈다** —
   * `pendingInstant` 가 그것을 껐다(위 주석). 위 문장이 남아 있는 이유는 **연속으로
   * 부르면 파셀이 계속 버려지는 것 자체**는 그대로이기 때문이다. 사라진 것은 연출이고
   * 재빌드가 아니다.
   *
   * @returns 실제로 버렸으면 `true`. 안 떠 있던 파셀이면 `false`.
   *          ⚠ **`false` 라도 할 일이 없는 것은 아니다** — 「연출 없이 세운다」 표식은
   *          그때도 남긴다(멀리서 확정하고 다가가는 경로가 그것이다).
   */
  invalidate(px: number, pz: number): boolean {
    // 키 형식은 `decide/stream.ts` 가 소유한다. 여기서 `${px},${pz}` 를 다시 적으면
    // 형식이 바뀔 때 이 문만 조용히 어긋나고, 그 증상은 «편집이 어떤 파셀에는 안 먹는다» 다.
    const key = parcelKey(px, pz);
    const h = this.handles.get(key);
    // ⚠ 안 떠 있어도 표식은 남긴다 — 편집으로 바꾼 파셀이 **아직 안 만들어졌다가** 곧
    // 만들어지는 경로가 있고(멀리서 확정), 그때도 「갱신」이지 「등장」이 아니다.
    this.pendingInstant.add(key);
    if (!h) return false;
    // 수축 없이 즉시 반납한다 — 이유는 `pendingInstant` 주석 한 곳이다.
    this.opts.builder.release(h, true);
    this.handles.delete(key);
    this.tiers.delete(key);
    // `settled` 는 건드리지 않는다 — 되돌리면 편집할 때마다 로딩 화면이 다시 뜬다.
    this.opts.markDirty?.();
    return true;
  }

  dispose(): void {
    for (const h of this.handles.values()) this.opts.builder.release(h);
    this.handles.clear();
    this.tiers.clear();
    // 표식도 비운다 — 안 떠 있는 파셀에도 add 하므로(위) 여기서 안 지우면 세션이 끝나도
    // 남는다. 개수는 편집 확정 횟수만큼이라 작지만, **안 지울 이유가 없는 것을 남기면
    // 다음 사람이 «왜 남기지» 를 조사한다.**
    this.pendingInstant.clear();
  }
}
