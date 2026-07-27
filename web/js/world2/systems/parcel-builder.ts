// world2/systems/parcel-builder.ts — 파셀을 슬롯 점유로 만든다.
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
import type { Tier } from '../decide/lod.js';
import {
  parcelLayout, kindsFor, maxPartsPerParcel,
  DEFAULT_LAYOUT, type LayoutOptions, type PartKind,
} from '../decide/parcel-layout.js';

/**
 * 슬롯 풀에 필요한 것만 추린 인터페이스. `InstancePools`가 그대로 만족한다(tone 변환만
 * 어댑터가 얹는다). 이 좁은 문 덕분에 이 파일 전체를 three 없이 시험할 수 있다.
 */
export interface SlotPool {
  acquire(key: string): SlotHandle | null;
  setTransform(h: SlotHandle, x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number): void;
  setTone(h: SlotHandle, tone: number): void;
  release(h: SlotHandle): void;
}

const ALL_KINDS: readonly PartKind[] = ['ground', 'building', 'tree', 'lamp'];

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
  private starved = 0;
  private byKindStarved: Record<string, number> = {};

  constructor(opts: ParcelBuilderOptions) {
    this.pool = opts.pool;
    this.cellX = opts.cellX;
    this.cellZ = opts.cellZ;
    this.layout = { ...DEFAULT_LAYOUT, cellX: opts.cellX, cellZ: opts.cellZ, ...opts.layout };
  }

  /**
   * 풀 크기 예산. 부팅 때 이 값으로 InstancedMesh를 잡는다.
   *
   * 여유 배수(1.25)를 두는 이유: 스트리밍이 언로드보다 로드를 먼저 처리하는 프레임이 있어
   * 순간적으로 정원을 넘길 수 있다. 여기서 모자라면 파셀이 조용히 덜 그려진다 — 조용한 게
   * 문제라 stats로도 노출한다.
   */
  static poolBudget(maxParcels: number, layout: LayoutOptions = DEFAULT_LAYOUT): Record<PartKind, number> {
    const out = {} as Record<PartKind, number>;
    for (const k of ALL_KINDS) {
      out[k] = Math.ceil(maxPartsPerParcel(k, layout) * maxParcels * 1.25);
    }
    return out;
  }

  build(px: number, pz: number, tier: Exclude<Tier, 'none'>): ParcelHandle {
    const h: PooledHandle = {
      key: `${px},${pz}`, tier, px, pz, byKind: new Map(),
    };
    for (const kind of kindsFor(tier)) this.fill(h, kind, tier);
    return h;
  }

  release(handle: ParcelHandle): void {
    const h = handle as PooledHandle;
    for (const slots of h.byKind.values()) {
      for (const s of slots) this.pool.release(s);
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
    const parts = parcelLayout(h.px, h.pz, tier, this.layout);
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
