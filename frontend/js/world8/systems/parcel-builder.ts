// world8/systems/parcel-builder.ts — 파셀을 슬롯 점유로 만든다.
//
// ── 여기서 지오메트리를 만들지 않는다 ────────────────────────────────────────
// 이 파일에 `new Geometry`도 `new Material`도 없다. 부팅 때 만들어둔 InstancedMesh의
// 슬롯을 점유하고 행렬을 쓸 뿐이다. 그래서 파셀이 몇 개 뜨든 재질·지오·파이프라인·드로우콜
// 개수가 상수다.
//
// 이게 스파이크 처방의 전부다. 실측으로 파셀 1개 승격 시 **머티리얼 19개·지오 44개**가 새로
// 태어났고, 비용은 데이터 크기가 아니라 **새 조합의 개수**에 비례했다(텍스처를 58% 깎아도
// 스파이크가 그대로였던 이유). 새 조합을 0으로 만들면 원인 자체가 사라진다.
//
// ── retier가 싼 이유 ─────────────────────────────────────────────────────────
// 배치 판정(decide/parcel-layout.ts)이 "tier는 무엇을 그릴지만 줄이지 어디에 그릴지는
// 바꾸지 않는다"를 보장한다. 그래서 near→mid는 **lamp 슬롯만 반납하면 끝**이다 — 남는
// 부품은 손댈 필요조차 없다. 판정 계층의 불변식이 집행 계층의 비용을 직접 깎는 사례다.

import type { SlotHandle } from './instancing.js';
import type { ParcelBuilder, ParcelHandle } from './streaming.js';
import { parcelKey } from '../decide/stream.js';
import {
  type Tier, type TierBands, DEFAULT_BANDS, tierReach, maxLatticePoints,
} from '../decide/lod.js';
import { parcelLayout, DEFAULT_LAYOUT } from '../decide/parcel-layout.js';
import {
  ALL_KINDS, kindsFor, maxPartsPerParcel, outermostTierFor,
  type LayoutOptions, type PartKind, type PlacedPart,
} from '../parts/index.js';

/**
 * 슬롯 풀에 필요한 것만 추린 인터페이스. `InstancePools`가 그대로 만족한다(tone 변환만
 * 어댑터가 얹는다). 이 좁은 문 덕분에 이 파일 전체를 three 없이 시험할 수 있다.
 */
export interface SlotPool {
  acquire(key: string): SlotHandle | null;
  setTransform(h: SlotHandle, x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number): void;
  /**
   * **이미 놓인 슬롯의 자세만 다시 쓴다.** 빌더는 쓰지 않는다 — 그림자 데칼 재베이킹처럼
   * "같은 슬롯을 그대로 두고 자세만 갱신" 하는 소비자를 위한 문이다.
   *
   * `setTransform` 과 갈라 놓은 이유: 그쪽은 **새 배치**를 뜻해서 성장 애니메이션을 처음부터
   * 돌린다. 재적용에 그것을 태우면 자세를 고칠 때마다 부품이 되감긴다(검수관 반려
   * 2026-08-11 — 실측으로 sx 4 → 0.08 재현). 근거는 `parcel-grow.ts` 의 `retarget` 주석.
   */
  retarget?(h: SlotHandle, x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number): void;
  setTone(h: SlotHandle, tone: number): void;
  release(h: SlotHandle): void;
  /**
   * **연출 없이** 처리하는 구간을 연다/닫는다 (팀장 판정 (가), 2026-08-20).
   *
   * 빌더가 파셀 하나를 만들거나 반납하는 **그 구간에서만** 켠다. 왜 그 구간뿐인지와
   * 왜 전역 창을 기각했는지는 구현부(`systems/parcel-assets.ts` 의 `setInstant`)
   * 주석 **한 곳**이다 — 여기에 다시 적지 않는다.
   *
   * 선택 문이다: 안 구현한 풀(테스트 스텁 등)에서는 종전대로 연출이 돈다.
   */
  setInstant?(on: boolean): void;
}

interface PooledHandle extends ParcelHandle {
  key: string;
  tier: Tier;
  px: number;
  pz: number;
  /** 종류별 점유 슬롯. retier가 종류 단위로 더하고 빼기 위해 나눠 둔다 */
  byKind: Map<PartKind, SlotHandle[]>;
}

export interface ParcelBuilderOptions {
  pool: SlotPool;
  cellX: number;
  cellZ: number;
  /**
   * **동결된 파셀의 배치.** `null` 이면 계산한다(`parcelLayout`).
   *
   * 감독이 손으로 옮긴 구역은 계산이 아니라 저장된 배열을 쓴다 — 판정·근거의 SSOT 는
   * `decide/parcel-freeze.ts` 한 곳이다. 여기서는 «주입받는다» 는 사실만 안다:
   * 빌더가 계약(`decide/overlay.ts`)을 직접 import 하면 생성기 계층이 편집 데이터를
   * 알게 되고, 그것을 막는 것이 팀장 조건의 집행 축 ① 이다(테스트가 그 축을 지킨다).
   */
  frozenAt?(px: number, pz: number, tier: Exclude<Tier, 'none'>): readonly PlacedPart[] | null;
  layout?: LayoutOptions;
  /** 동시에 떠 있을 수 있는 최대 파셀 수 — 풀 예산 산정에 쓴다 */
  maxParcels?: number;
}

/** 풀이 모자라 못 그린 부품 수. 0이 아니면 예산 산정이 틀린 것이다. */
export interface BuilderStats {
  starved: number;
  byKindStarved: Record<string, number>;
}

export class PooledParcelBuilder implements ParcelBuilder {
  private readonly pool: SlotPool;
  private readonly cellX: number;
  private readonly cellZ: number;
  private readonly layout: LayoutOptions;
  /** 동결 조회. 없으면 언제나 계산한다(라이브 기본값) */
  private readonly frozenAt?: ParcelBuilderOptions['frozenAt'];
  private starved = 0;
  private byKindStarved: Record<string, number> = {};

  constructor(opts: ParcelBuilderOptions) {
    this.pool = opts.pool;
    this.cellX = opts.cellX;
    this.cellZ = opts.cellZ;
    this.layout = { ...DEFAULT_LAYOUT, cellX: opts.cellX, cellZ: opts.cellZ, ...opts.layout };
    this.frozenAt = opts.frozenAt;
  }

  /**
   * 풀 크기 예산. 부팅 때 이 값으로 InstancedMesh를 잡는다.
   *
   * ── 무엇이 바뀌었나 ────────────────────────────────────────────────────────
   * 예전 식은 `파셀당 최대 × MAX_PARCELS(20) × 1.25`였고, 뒤 두 항이 **둘 다 근거 없는
   * 상수**였다. 20은 실측 최대(17)에 눈대중을 얹은 값이라 이론 최악치(21)보다 작았고,
   * 여유 배수 1.25가 그 부족을 가려 `starved`가 0으로 나왔다. 서로를 상쇄하던 두 값이다.
   *
   * 지금은 밴드에서 유도한다:
   *   슬롯 = 파셀당 최대 파츠 × `그 종류가 살아 있는 가장 바깥 tier의 EXIT 반경 안 격자점 최대`
   *
   * tier를 반영하는 것이 핵심이다. lamp는 near에만 있으니 7파셀분이면 충분한데 예전엔
   * far와 같은 20파셀분을 잡고 있었다. 실측 사용률이 두 밀도 모두 20% 남짓이던 이유다.
   *
   * ── 여유 배수를 왜 없앨 수 있나 ────────────────────────────────────────────
   * 근거는 상한이 **기하학적으로 닫혀 있다**는 것이다. tier를 유지하려면 EXIT 반경 안에
   * 있어야 하고, 그 반경 안 격자점 수에는 위치와 무관한 최댓값이 있다. 언로드는 예산 밖에서
   * 먼저 처리되므로(streaming.ts ①) 슬롯이 밀려 쌓이지도 않는다.
   *
   * 이론상 남는 초과 경로는 "승격이 처리되고 강등은 프레임 예산에 잘려 밀리는" 순간이라
   * `diffParcels`가 강등을 앞에 내도록 함께 고쳤다. 다만 그 경로는 **실측으로 재현되지
   * 않았다**(정렬을 뺀 채 30,000샘플, 초과 0건) — 보험이지 증명은 아니다.
   *
   * 실측 최대 사용률은 ground 90.5%까지 올라간다. 예산이 실제로 빡빡하게 쓰인다는 뜻이고,
   * 그래서 `headroom`을 손잡이로 남겨 둔다 — 밴드나 스트리밍 순서를 만질 때 되돌릴 곳이다.
   *
   * ── 이 예산이 기대는 암묵 여유 (상수를 만질 때 함께 봐야 한다) ─────────────
   * `tierFor`는 EXIT를 넘겨도 **한 프레임에 한 단계만** 강등한다. 그래서 한 프레임에
   * 밴드 폭보다 크게 움직이면 "실제 거리보다 안쪽 tier에 잔류하는" 파셀이 생기고, 그만큼
   * 슬롯이 최악치를 넘길 수 있다. 지금은 그 일이 일어나지 않는데, 근거는 상수들의 관계다:
   *
   *   프레임당 이동 = speed(9) × fast(2.2) × dt클램프(0.1s) = 1.98m = **0.062셀**  (CELL=32)
   *   가장 좁은 밴드 폭 = nearExit − nearEnter = 1.30 − 1.15 = **0.15셀**
   *
   * 2배 이상 여유가 있고 `player.ts`에 텔레포트 경로도 없다. 다만 **speed·fast 배수·dt
   * 클램프·CELL·밴드 폭 중 하나만 바뀌어도 이 여유가 조용히 잠식된다** — 이 diff가 고친
   * 결함(상수 두 개가 서로를 상쇄)과 정확히 같은 형태다. 그 상수들을 만지면 여기를 다시
   * 계산하고, `tests/world2-slot-budget.test.ts`의 중간 크기 점프 케이스를 함께 보라.
   */
  static poolBudget(opts: {
    layout?: LayoutOptions;
    bands?: TierBands;
    /** 여유 배수. 1 = 이론 최악치 그대로 */
    headroom?: number;
  } = {}): Record<PartKind, number> {
    const layout = opts.layout ?? DEFAULT_LAYOUT;
    const bands = opts.bands ?? DEFAULT_BANDS;
    const headroom = opts.headroom ?? 1;
    const parcelsAt = new Map<string, number>();
    const out = {} as Record<PartKind, number>;
    for (const k of ALL_KINDS) {
      const tier = outermostTierFor(k);
      if (!tier) { out[k] = 0; continue; } // 어느 tier에도 없는 종류 — 슬롯이 필요 없다
      let parcels = parcelsAt.get(tier);
      if (parcels === undefined) {
        parcels = maxLatticePoints(tierReach(tier, bands));
        parcelsAt.set(tier, parcels);
      }
      out[k] = Math.ceil(maxPartsPerParcel(k, layout) * parcels * headroom);
    }
    return out;
  }

  /**
   * @param instant 등장 연출을 건너뛴다 — 편집 확정으로 버려졌던 파셀을 **다시 세우는**
   *   경우다. 판정은 `systems/streaming.ts` 의 `pendingInstant` 가 하고 여기서는 집행만
   *   한다. 근거 전문은 `systems/parcel-assets.ts` 의 `setInstant` 주석 한 곳이다.
   */
  build(px: number, pz: number, tier: Exclude<Tier, 'none'>, instant = false): ParcelHandle {
    const h: PooledHandle = {
      // 키 형식은 `decide/stream.ts` 가 소유한다. 여기 리터럴로 적혀 있었고 그것은 값
      // 미러링이었다 — 스트리밍이 자기 맵 키를 따로 만들므로 두 형식이 갈라져도 지금은
      // 아무 증상이 없다. **증상 없는 미러링이 가장 오래 산다.**
      key: parcelKey(px, pz), tier, px, pz, byKind: new Map(),
    };
    // `finally` 로 닫는다 — `fill` 이 던지면 스위치가 켜진 채 남고, 그때부터 **모든**
    // 파셀이 연출 없이 등장한다(증상이 «가끔 안 자란다» 라 원인을 못 찾는다).
    if (instant) this.pool.setInstant?.(true);
    try {
      for (const kind of kindsFor(tier)) this.fill(h, kind, tier);
    } finally {
      if (instant) this.pool.setInstant?.(false);
    }
    return h;
  }

  /** @param instant 퇴장 연출(수축)을 건너뛴다 — `build` 의 같은 인자와 같은 이유다. */
  release(handle: ParcelHandle, instant = false): void {
    const h = handle as PooledHandle;
    if (instant) this.pool.setInstant?.(true);
    try {
      for (const slots of h.byKind.values()) {
        for (const s of slots) this.pool.release(s);
      }
    } finally {
      if (instant) this.pool.setInstant?.(false);
    }
    h.byKind.clear();
  }

  /**
   * tier만 바꾼다. 배치가 tier와 무관하게 같으므로 **차이나는 종류만** 더하고 뺀다.
   * 공통 종류는 슬롯을 그대로 둔다 — 행렬조차 다시 쓰지 않는다.
   */
  retier(handle: ParcelHandle, tier: Exclude<Tier, 'none'>): ParcelHandle {
    const h = handle as PooledHandle;
    const want = new Set(kindsFor(tier));

    for (const [kind, slots] of h.byKind) {
      if (want.has(kind)) continue;
      for (const s of slots) this.pool.release(s);
      h.byKind.delete(kind);
    }
    // 새 tier를 **먼저** 세운다. fill이 tier로 배치를 계산하므로, 옛 tier가 남아 있으면
    // 승격 시 새 종류가 배치에 없어 0개로 채워진다(mid→near에서 lamp가 안 생긴다).
    h.tier = tier;
    for (const kind of want) {
      if (!h.byKind.has(kind)) this.fill(h, kind, tier);
    }
    return h;
  }

  /**
   * tier별 예상 비용(ms). 실제 시간이 아니라 **상대 비중**이면 충분하다 — 예산 집행이
   * 비율로만 이뤄지고, 틀려도 기아 방지 규약이 막아준다.
   */
  costOf(tier: Exclude<Tier, 'none'>): number {
    return kindsFor(tier).length * 0.4;
  }

  stats(): BuilderStats {
    return { starved: this.starved, byKindStarved: { ...this.byKindStarved } };
  }

  /** 한 종류의 부품을 배치대로 채운다. tier를 인자로 받는다(핸들 상태에 기대지 않는다). */
  private fill(h: PooledHandle, kind: PartKind, tier: Exclude<Tier, 'none'>): void {
    // ⚠ **동결이 계산을 대신하는 유일한 자리다.** `parcelLayout` 안에 분기를 넣으면 골든
    // 해시가 깨지고, 그때 고칠 것은 해시가 아니라 설계다(`parcel-layout.ts` 헤더).
    // `null` 과 빈 배열은 다른 뜻이다 — `null` = 안 손댔다(계산해라), 빈 배열 = 손대서
    // 전부 지웠다(아무것도 놓지 마라). `??` 가 아니라 명시적 분기인 이유가 그것이다.
    const frozen = this.frozenAt?.(h.px, h.pz, tier) ?? null;
    const parts = frozen !== null ? frozen : parcelLayout(h.px, h.pz, tier, this.layout);
    const ox = h.px * this.cellX;
    const oz = h.pz * this.cellZ;
    const slots: SlotHandle[] = [];
    for (const p of parts) {
      if (p.kind !== kind) continue;
      const s = this.pool.acquire(kind);
      if (!s) {
        // 조용히 넘기지 않는다. 풀 예산이 틀렸다는 신호이고, 화면에는 "건물이 몇 채
        // 사라진" 모습으로 나타나 원인을 짐작하기 어렵다.
        this.starved++;
        this.byKindStarved[kind] = (this.byKindStarved[kind] ?? 0) + 1;
        continue;
      }
      this.pool.setTransform(s, ox + p.x, p.y, oz + p.z, p.ry, p.sx, p.sy, p.sz);
      this.pool.setTone(s, p.tone);
      slots.push(s);
    }
    if (slots.length) h.byKind.set(kind, slots);
  }
}
