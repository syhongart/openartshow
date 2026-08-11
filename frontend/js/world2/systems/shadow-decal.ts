// world2/systems/shadow-decal.ts — 그림자 데칼의 **집행**.
//
// 판정은 `decide/shadow-decal.ts`(순수 산술), 굽기는 `parts/shadow.ts`(캔버스), 여기는
// 그 둘을 슬롯 풀에 붙이는 배선이다. 셋을 나눈 이유는 감독 지시 *"별도 베이킹 파일로
// 분리해"* 이기도 하고, 각각 다른 것을 테스트해야 하기 때문이기도 하다 — 산술은 three
// 없이, 굽기는 캔버스로, 배선은 실제 풀 위에서.
//
// ── 이 파일이 하는 일 셋 ────────────────────────────────────────────────────
// ① **워프** — 배치가 정한 그림자 자세(= 캐스터 자세 복사)를 태양에서 유도한 자세로 바꾼다.
// ② **등록부** — 살아 있는 데칼 핸들과 그 **원본**(캐스터) 자세를 기억한다. 태양이 바뀌면
//    원본에서 다시 유도해야 하므로, 워프된 결과가 아니라 원본을 들고 있어야 한다.
// ③ **재베이킹** — 아틀라스를 다시 굽고 등록부 전체의 자세를 다시 적용한다. 감독의
//    「그림자 굽기」 버튼이 부르는 것이 이것이고, 시간대·태양이 바뀔 때도 자동으로 돈다.
//
// ── 시간대 전환 때 자세 재계산은 **선택이 아니라 요구사항**이다 ─────────────
// 낮·노을은 태양 방위(`SUN_AZ`)를 쓰고 밤은 달 방위(`MOON_AZ`)를 쓴다 — 즉 **방위각이
// 바뀐다.** 텍스처만 다시 굽고 자세를 고정하면 밤에 그림자가 낮 방향을 가리킨 채 남는다.
// 그 증상은 헤드리스에서 안 보이고 감독 실기기에서만 보인다.

import type { FrameCtx, System } from '../kernel.js';
import type { InstancePools, SlotHandle } from './instancing.js';
import type { PoseWarp, SlotTransform } from './parcel-assets.js';
import type { SlotPool } from './parcel-builder.js';
import type { PartAsset, PartSpec, ThreeNS } from '../parts/types.js';
import type { SkyTime } from '../decide/night.js';
import {
  sunGround, shadowSpan, decalTransform, densityFor,
  SHADOW_MAX_LEN, SHADOW_Y, SHADOW_DENSITY, SHADOW_SOFT, SHADOW_TAIL,
  type SunGround,
} from '../decide/shadow-decal.js';
import { bakeAtlas, casterProfiles, shadowKindOf, SHADOW_DRAW_PX, type BakeEntry } from '../parts/shadow.js';

/** 노브가 미는 값. 슬라이더가 **이 객체를 직접 고친다** — 새로 만들면 배선이 끊긴다 */
export interface ShadowDecalOpts {
  /** 그리는 해상도(px). `?shres` */
  res: number;
  /** 농도(시간대 배수 적용 전). `?shdark` */
  density: number;
  /** 블러. `?shsoft` */
  soft: number;
  /** 꼬리 끝 알파. `?shtail` */
  tail: number;
  /** 길이 상한(m). `?shlen` */
  maxLen: number;
  /** 데칼 높이(m). `?shy` */
  y: number;
  /** 0 이면 완전 투명하게 굽는다(룩 A/B 전용 — 슬롯도 드로우콜도 그대로다). `?shdec` */
  on: number;
}

export function defaultOpts(): ShadowDecalOpts {
  return {
    res: SHADOW_DRAW_PX, density: SHADOW_DENSITY, soft: SHADOW_SOFT,
    tail: SHADOW_TAIL, maxLen: SHADOW_MAX_LEN, y: SHADOW_Y, on: 1,
  };
}

/** 캐스터 하나의 **단위 치수**(스케일 1 기준). 지오 bounding box 에서 실측한다 */
interface CasterDims {
  /** 높이(m) */
  h: number;
  /** 밑동 반경(m) — 가로·세로 반폭 중 큰 쪽(외접) */
  r: number;
}

export interface ShadowDecalOptions {
  pools: InstancePools;
  /** 부팅 때 만든 파츠 자산. 캐스터 지오의 bounding box 를 여기서 실측한다 */
  assets: Record<string, PartAsset>;
  /** 파츠 목록 — 캐스터와 골격을 여기서 유도한다(목록을 다시 적지 않는다) */
  parts: readonly PartSpec[];
  /** 씬 → 광원 방향(정규화). `systems/sky.ts` 가 매 프레임 갱신하는 광원에서 읽는다 */
  sunDir: () => { x: number; y: number; z: number };
  time: () => SkyTime;
  opts: ShadowDecalOpts;
}

export class ShadowDecalSystem implements System {
  readonly name = 'shadow-decal';

  private readonly o: ShadowDecalOptions;
  /** kind → 단위 치수. 부팅 때 한 번 실측하고 끝 */
  private readonly dims = new Map<string, CasterDims>();
  /** 아틀라스 셀 순서 — `parts/shadow.ts` 의 `shadowParts` 와 **같은 순서**여야 한다 */
  private readonly cells: { kind: string; profile: 'round' | 'box' | 'post' }[];
  /**
   * 살아 있는 데칼과 그 **원본**(캐스터) 자세.
   *
   * `Map` 이지 `WeakMap` 이 아니다 — 재베이킹이 **전체를 순회**해야 하는데 WeakMap 은
   * 순회가 안 된다. 대신 `release` 에서 반드시 걷어야 하고, 그것을 안 하면 죽은 핸들이
   * 쌓여 재사용된 남의 슬롯을 덮어쓴다(그 경로를 배선 테스트가 본다).
   */
  private readonly live = new Map<SlotHandle, SlotTransform>();
  private pool: SlotPool | null = null;

  /** 마지막으로 구운 태양·시간대·옵션. 이것이 바뀌면 다시 굽는다 */
  private lastKey = '';
  /** 마지막 굽기 소요(ms). 진단·버튼 라벨이 읽는다 */
  lastBakeMs = 0;

  constructor(o: ShadowDecalOptions) {
    this.o = o;
    this.cells = casterProfiles(o.parts);
    for (const c of this.cells) {
      const a = o.assets[c.kind];
      this.dims.set(c.kind, a ? measure(a) : { h: 1, r: 0.5 });
    }
  }

  /**
   * 슬롯 풀을 연결한다. **재적용이 탈 유일한 경로다.**
   *
   * `pools.setTransform` 을 직접 부르지 않는 이유: 그러면 `parcel-grow` 가 새 자세를
   * 모른 채 옛 자세로 수축해 데칼이 엉뚱한 데로 줄어든다. 어댑터를 다시 타면 성장·색
   * 배선이 전부 따라오고, 감독이 버튼을 눌렀을 때 데칼이 **다시 자라나며** 갈아 끼워진다 —
   * 눌렀는데 아무 일도 안 일어난 것처럼 보이지 않는다.
   */
  attach(pool: SlotPool): void { this.pool = pool; }

  warp(): PoseWarp {
    return {
      map: (h, t) => {
        if (!h.key.startsWith('shadow:')) return t;
        this.live.set(h, t);
        return this.poseOf(h.key, t);
      },
      release: (h) => { this.live.delete(h); },
    };
  }

  /** 캐스터 자세 → 데칼 자세. 태양이 지평선 아래면 0 스케일(= 안 보임) */
  private poseOf(shadowKind: string, t: SlotTransform): SlotTransform {
    const g = this.ground();
    const casterKind = shadowKind.slice('shadow:'.length);
    const d = this.dims.get(casterKind);
    if (!g || !d || this.o.opts.on <= 0) {
      // 0 스케일은 이 저장소의 "안 쓰는 슬롯" 규약과 같은 수단이다(`instancing.ts` 의
      // `ZERO`). `visible=false` 나 `count` 축소를 쓰지 않는 이유가 거기 적혀 있다.
      return { ...t, sx: 0, sy: 0, sz: 0 };
    }
    // 인스턴스 스케일을 단위 치수에 곱한다 — 건물은 `sx·sz` 가 3~8m 로 흔들리고 나무는
    // 0.6~1.9배다. 단위 치수만 쓰면 큰 나무와 작은 나무의 그림자가 같아진다.
    const h = d.h * t.sy;
    const r = d.r * Math.max(t.sx, t.sz);
    const span = shadowSpan(h, r, g, this.o.opts.maxLen);
    const p = decalTransform(t.x, t.z, span, g);
    return { x: p.x, y: this.o.opts.y, z: p.z, ry: p.ry, sx: p.sx, sy: 1, sz: p.sz };
  }

  private ground(): SunGround | null {
    const d = this.o.sunDir();
    return sunGround(d.x, d.y, d.z);
  }

  /**
   * 아틀라스를 다시 굽고 살아 있는 데칼 자세를 다시 적용한다.
   *
   * @returns 소요(ms)
   */
  bake(): number {
    const t0 = nowMs();
    const g = this.ground();
    const density = this.o.opts.on > 0 ? densityFor(this.o.time(), this.o.opts.density) : 0;
    const entries: BakeEntry[] = this.cells.map((c, index) => {
      const d = this.dims.get(c.kind) ?? { h: 1, r: 0.5 };
      // 실루엣은 **종류당 하나**다. 인스턴스마다 스케일이 다르지만 인스턴스별 UV 가
      // 불가능하므로 단위 치수로 굽고 자세로 늘린다. 그 근사의 한계는 이 파일 끝 참조.
      const span = shadowSpan(d.h, d.r, g ?? { ux: 0, uz: 1, cot: 1 }, this.o.opts.maxLen);
      return { index, profile: c.profile, span };
    });
    bakeAtlas(entries, {
      res: this.o.opts.res, density, soft: this.o.opts.soft, tail: this.o.opts.tail,
    });
    this.reapply();
    this.lastKey = this.key();
    this.lastBakeMs = nowMs() - t0;
    return this.lastBakeMs;
  }

  /** 살아 있는 데칼 전부의 자세를 원본에서 다시 유도해 쓴다 */
  private reapply(): void {
    const pool = this.pool;
    if (!pool) return;
    for (const [h, t] of this.live) {
      // 죽은 핸들은 건너뛴다. `release` 에서 걷지만, 풀이 직접 반납한 경로(`grow` 밖에서
      // 죽는 경우)는 여기로 오지 않으므로 한 번 더 본다.
      if (h.index < 0) { this.live.delete(h); continue; }
      // 어댑터를 다시 탄다 — 워프가 다시 불려 새 태양 자세가 나오고, `live` 도 같은
      // 원본으로 덮어써진다(원본이 원본으로 갱신되므로 값이 표류하지 않는다).
      //
      // ⚠ **`setTransform` 이 아니라 `retarget` 이다.** 처음에 `setTransform` 을 썼고
      // 그것이 검수관 반려 사유였다 — 그 경로는 `grow.place` 를 타서 성장을 START_SCALE
      // 로 되감는다(실측: sx 4 → 0.08). 슬라이더는 드래그하는 **동안** 값을 밀므로,
      // 감독이 농도를 조절하는 내내 화면의 모든 그림자가 쪼그라들었다 자라기를 반복했다.
      // 폐지한 실시간 그림자의 명멸과 증상이 같다. 근거는 `parcel-grow.ts` 의 `retarget`.
      //
      // `retarget` 이 없는 풀(구형 소비자)이면 자세 갱신을 **건너뛴다.** 조용히
      // `setTransform` 으로 떨어지면 그 되감기가 되살아나므로, 차라리 안 하는 편이 낫다.
      pool.retarget?.(h, t.x, t.y, t.z, t.ry, t.sx, t.sy, t.sz);
    }
  }

  /** 다시 구워야 하는지 판정하는 지문. 태양 방향·시간대·노브가 전부 들어간다 */
  private key(): string {
    const d = this.o.sunDir();
    const o = this.o.opts;
    // 태양 방향은 소수 3자리까지만 본다. 매 프레임 미세하게 흔들리는데(플레이어 추종
    // 스냅) 그때마다 다시 구우면 굽기가 프레임 예산을 먹는다.
    const f = (n: number) => (Number.isFinite(n) ? n.toFixed(3) : 'x');
    return `${f(d.x)},${f(d.y)},${f(d.z)}|${this.o.time()}|${o.res}|${o.density}|${o.soft}|${o.tail}|${o.maxLen}|${o.y}|${o.on}`;
  }

  update(ctx: FrameCtx): void {
    if (ctx.hidden) return;
    if (this.key() === this.lastKey) return;
    const ms = this.bake();
    ctx.probe?.('shadow_bake_ms', ms);
    // 굽기가 프레임 예산을 먹으면 알린다. 지금 규모(셀 8개 × 128² + 행렬 ≤504)에서는
    // 넘을 일이 없다고 보지만, **그 판단을 근거 없이 믿지 않기 위해** 축을 남긴다.
    // 실기기에서 이 경고가 뜨면 그때 `bakeAtlas` 안 루프를 chunk 로 쪼갠다.
    if (ms > 8) ctx.probe?.('ev:그림자굽기지연', Math.round(ms));
  }

  /** 진단·HUD 가 읽는 것 */
  stats(): { live: number; cells: number; lastBakeMs: number } {
    return { live: this.live.size, cells: this.cells.length, lastBakeMs: this.lastBakeMs };
  }

  dispose(): void {
    this.live.clear();
    this.pool = null;
  }
}

/**
 * 지오메트리 bounding box 에서 단위 치수를 실측한다.
 *
 * **치수를 파츠 선언에 적지 않는 이유가 이것이다** — 지오를 고치면 여기가 따라온다.
 * 적어 두었다면 시계탑을 새로 만든 날(2026-08-09) 그림자만 옛 크기로 남았을 것이고,
 * 그 증상은 "그림자가 물건보다 크다" 로만 드러난다.
 */
function measure(a: PartAsset): CasterDims {
  const g = a.geometry as unknown as {
    boundingBox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } | null;
    computeBoundingBox(): void;
  };
  if (!g.boundingBox) g.computeBoundingBox();
  const b = g.boundingBox;
  if (!b) return { h: 1, r: 0.5 };
  const h = Math.max(0.1, b.max.y - b.min.y);
  // 외접 반경. 각진 캐스터가 45° 돌아서면 실제 폭이 √2배가 되지만, 인스턴스별 실루엣이
  // 불가능하므로 여기서 근사한다 — **알고 남기는 사각**이다(이 파일 머리 참조).
  const rx = Math.max(Math.abs(b.min.x), Math.abs(b.max.x));
  const rz = Math.max(Math.abs(b.min.z), Math.abs(b.max.z));
  return { h, r: Math.max(0.05, Math.max(rx, rz)) };
}

function nowMs(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
}

/** 그림자 슬롯 키인가 — 소비처가 문자열 규약을 다시 적지 않게 */
export function isShadowKey(key: string): boolean { return key.startsWith('shadow:'); }

export { shadowKindOf };
export type { ThreeNS };
