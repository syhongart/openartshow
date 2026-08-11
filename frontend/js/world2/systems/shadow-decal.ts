// world2/systems/shadow-decal.ts — 접촉그림자(AO 블롭)의 **집행**.
//
// 판정은 `decide/shadow-decal.ts`(순수 산술), 굽기는 `parts/shadow.ts`(캔버스), 여기는
// 그 둘을 슬롯 풀에 붙이는 배선이다. 셋을 나눈 이유는 감독 지시 *"별도 베이킹 파일로
// 분리해"* 이기도 하고, 각각 다른 것을 테스트해야 하기 때문이기도 하다 — 산술은 three
// 없이, 굽기는 캔버스로, 배선은 실제 풀 위에서.
//
// ── 2026-08-11(2회차) — 태양 축이 사라졌다 ─────────────────────────────────
// 감독이 방향성 penumbra 데칼을 폐기하고 빌더의 접촉그림자를 지목했다(경위는
// `decide/shadow-decal.ts` 머리 한 곳). 이 파일에서 **없어진 것**:
//   ① `sunDir` 옵션과 광원에서 태양 방향을 되읽던 배선(`main.ts` 쪽도 함께)
//   ② `SunGround`·`shadowSpan` 소비, 자세의 방위 회전·후방 오프셋
//   ③ 재굽기 지문(`key()`)의 태양 성분과 그 소수 3자리 라운딩
//   ④ `maxLen`·`tail`·`style` 노브
// **남은 것**: 캐스터 밑동 반경 실측(`measure`) → 블롭 크기, 시간대 농도, 굽기 버튼.
//
// ── 시간대는 이제 **농도만** 움직인다 ───────────────────────────────────────
// 예전에는 밤에 달 방위(`MOON_AZ`)로 넘어가면서 그림자가 통째로 돌았고, 그래서 시간대
// 전환 때 자세 재계산이 **요구사항**이었다. 접촉그림자는 방향이 없으므로 자세가 시간대와
// 무관하다 — 그런데도 `reapply` 를 남긴 이유는 아래 그 함수 주석에 있다.

import type { FrameCtx, System } from '../kernel.js';
import type { InstancePools, SlotHandle } from './instancing.js';
import type { PoseWarp, SlotTransform } from './parcel-assets.js';
import type { SlotPool } from './parcel-builder.js';
import type { PartAsset, PartSpec, ThreeNS } from '../parts/types.js';
import type { SkyTime } from '../decide/night.js';
import type { ShadowBlend } from '../decide/shadow-decal.js';
import {
  decalTransform, decalTransformRect, densityFor,
  SHADOW_Y, SHADOW_DENSITY, SHADOW_SOFT, SHADOW_BLEND, LEAF_DEPTH,
} from '../decide/shadow-decal.js';
import type { CasterCell, ShadowShape } from '../parts/shadow.js';
import { bakeAtlas, casterProfiles, shadowKindOf, SHADOW_DRAW_PX } from '../parts/shadow.js';

/** 노브가 미는 값. 슬라이더가 **이 객체를 직접 고친다** — 새로 만들면 배선이 끊긴다 */
export interface ShadowDecalOpts {
  /** 그리는 해상도(px). `?shres` */
  res: number;
  /** 농도 배수(시간대 배수 적용 전). `?shdark`. 1 이 빌더 원본 */
  density: number;
  /** 중간 스톱 위치 손잡이. `?shsoft` — 의미 변경은 `SHADOW_SOFT` 주석 */
  soft: number;
  /** 데칼 높이(m). `?shy` */
  y: number;
  /** 0 이면 완전 투명하게 굽는다(룩 A/B 전용 — 슬롯도 드로우콜도 그대로다). `?shdec` */
  on: number;
  /** 합성 모드. `?shblend` — WebGPU 되돌림 수단이다. 근거는 판정 파일의 「합성 모드」 절 */
  blend: ShadowBlend;
  /** 잎 그림자 깊이. `?shleaf` — 0 이면 나무도 매끈한 원이 된다 */
  leaf: number;
}

export function defaultOpts(): ShadowDecalOpts {
  return {
    res: SHADOW_DRAW_PX, density: SHADOW_DENSITY, soft: SHADOW_SOFT,
    y: SHADOW_Y, on: 1, blend: SHADOW_BLEND, leaf: LEAF_DEPTH,
  };
}

/**
 * 캐스터 하나의 **단위 치수**(스케일 1 기준). 지오 bounding box 에서 실측한다.
 *
 * ⚠ 높이(`h`)가 없다. 방향성 그림자는 길이가 `h·cot(고도)` 였지만 접촉그림자는 발밑
 * 원이라 높이와 무관하다 — 빌더도 `AO_GROUNDED` 를 밑면 크기로만 정한다. 60m 타워와
 * 벤치의 그림자 크기 차이는 **밑동 반경**에서만 나온다.
 */
interface CasterDims {
  /** 밑동 반경(m) — 가로·세로 반폭 중 큰 쪽(외접). **원형 실루엣이 쓰는 값** */
  r: number;
  /**
   * 축별 반폭(m). **사각 실루엣만 쓴다.**
   *
   * 벤치는 1.4×0.44 로 가로세로 3.2:1 이라, 외접 반경 하나로 정사각 평면을 만들면 사각
   * 그림자가 **정사각**이 되어 감독 지시(*"형태가 사각형이면 사각형그림자"*)가 화면에서
   * 성립하지 않는다. 원형이 이 값을 안 쓰는 이유는 `decalTransformRect` 주석에 있다.
   */
  rx: number;
  rz: number;
}

export interface ShadowDecalOptions {
  pools: InstancePools;
  /** 부팅 때 만든 파츠 자산. 캐스터 지오의 bounding box 를 여기서 실측한다 */
  assets: Record<string, PartAsset>;
  /** 파츠 목록 — 캐스터를 여기서 유도한다(목록을 다시 적지 않는다) */
  parts: readonly PartSpec[];
  time: () => SkyTime;
  opts: ShadowDecalOpts;
}

export class ShadowDecalSystem implements System {
  readonly name = 'shadow-decal';

  private readonly o: ShadowDecalOptions;
  /** kind → 단위 치수. 부팅 때 한 번 실측하고 끝 */
  private readonly dims = new Map<string, CasterDims>();
  /** 아틀라스 셀 순서 — `parts/shadow.ts` 의 `shadowParts` 와 **같은 순서**여야 한다 */
  private readonly cells: CasterCell[];
  /** 셀별 실루엣. `bakeAtlas` 가 이 순서로 굽는다 — `cells` 에서 유도하므로 어긋날 수 없다 */
  private readonly shapes: ShadowShape[];
  /** kind → 실루엣. 자세 유도가 사각인지 물어보는 자리 */
  private readonly shapeOf = new Map<string, ShadowShape>();
  /**
   * 살아 있는 데칼과 그 **원본**(캐스터) 자세.
   *
   * `Map` 이지 `WeakMap` 이 아니다 — 재적용이 **전체를 순회**해야 하는데 WeakMap 은
   * 순회가 안 된다. 대신 `release` 에서 반드시 걷어야 하고, 그것을 안 하면 죽은 핸들이
   * 쌓여 재사용된 남의 슬롯을 덮어쓴다(그 경로를 배선 테스트가 본다).
   */
  private readonly live = new Map<SlotHandle, SlotTransform>();
  private pool: SlotPool | null = null;

  /** 마지막으로 구운 시간대·옵션. 이것이 바뀌면 다시 굽는다 */
  private lastKey = '';
  /** 마지막 굽기 소요(ms). 진단·버튼 라벨이 읽는다 */
  lastBakeMs = 0;

  constructor(o: ShadowDecalOptions) {
    this.o = o;
    this.cells = casterProfiles(o.parts);
    this.shapes = this.cells.map((c) => c.shape);
    for (const c of this.cells) {
      const a = o.assets[c.kind];
      this.dims.set(c.kind, a ? measure(a) : { r: 0.5, rx: 0.5, rz: 0.5 });
      this.shapeOf.set(c.kind, c.shape);
    }
  }

  /**
   * 슬롯 풀을 연결한다. **재적용이 탈 유일한 경로다.**
   *
   * `pools.setTransform` 을 직접 부르지 않는 이유: 그러면 `parcel-grow` 가 새 자세를
   * 모른 채 옛 자세로 수축해 데칼이 엉뚱한 데로 줄어든다. 어댑터를 다시 타면 성장·색
   * 배선이 전부 따라온다.
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

  /**
   * 캐스터 자세 → 접촉그림자 자세.
   *
   * 위치는 캐스터 그대로다(발밑). 크기만 밑동 반경에서 유도한다.
   */
  private poseOf(shadowKind: string, t: SlotTransform): SlotTransform {
    const casterKind = shadowKind.slice('shadow:'.length);
    const d = this.dims.get(casterKind);
    if (!d || this.o.opts.on <= 0) {
      // 0 스케일은 이 저장소의 "안 쓰는 슬롯" 규약과 같은 수단이다(`instancing.ts` 의
      // `ZERO`). `visible=false` 나 `count` 축소를 쓰지 않는 이유가 거기 적혀 있다.
      return { ...t, sx: 0, sy: 0, sz: 0 };
    }
    // 인스턴스 스케일을 단위 치수에 곱한다 — 건물은 `sx·sz` 가 3~8m 로 흔들리고 나무는
    // 0.6~1.9배다. 단위 치수만 쓰면 큰 나무와 작은 나무의 그림자가 같아진다.
    // ⚠ 사각은 축을 **따로** 곱한다. 원형이 `max(sx,sz)` 하나로 가는 것은 방향이 없어서
    // 였고(그 근거는 `measure` 주석), 사각에는 그 면제가 없다.
    const p = this.shapeOf.get(casterKind) === 'box'
      ? decalTransformRect(t.x, t.z, d.rx * t.sx, d.rz * t.sz, t.ry)
      : decalTransform(t.x, t.z, d.r * Math.max(t.sx, t.sz));
    return { x: p.x, y: this.o.opts.y, z: p.z, ry: p.ry, sx: p.sx, sy: 1, sz: p.sz };
  }

  /**
   * 아틀라스를 다시 굽고 살아 있는 데칼 자세를 다시 적용한다.
   *
   * @returns 소요(ms)
   */
  bake(): number {
    const t0 = nowMs();
    const density = this.o.opts.on > 0 ? densityFor(this.o.time(), this.o.opts.density) : 0;
    bakeAtlas(this.shapes, {
      res: this.o.opts.res, density, soft: this.o.opts.soft,
      blend: this.o.opts.blend, leaf: this.o.opts.leaf,
    });
    this.reapply();
    this.lastKey = this.key();
    this.lastBakeMs = nowMs() - t0;
    return this.lastBakeMs;
  }

  /**
   * 살아 있는 데칼 전부의 자세를 원본에서 다시 유도해 쓴다.
   *
   * ── 태양이 사라졌는데 왜 남기는가 (2026-08-11 2회차 판정) ──────────────────
   * 이 경로는 **워프 때문에** 생겼고, 워프는 남았다. 지금 자세를 실제로 움직이는 것은
   * `?shy`(높이)와 `?shdec`(0 스케일) 둘이고, 크기 배수를 노브로 여는 것이 다음 판정
   * 회차의 유력한 축이다(크기는 화면으로만 판정된다 — 값을 글로 못 정한다). 재적용이
   * 없으면 그 순간 **굽기 버튼이 텍스처만 갈고 자세를 안 고치는** 상태가 되고, 화면에서는
   * "버튼을 눌렀는데 절반만 바뀐다" 로 읽힌다.
   *
   * ⚠ **`setTransform` 이 아니라 `retarget` 이다.** 처음에 `setTransform` 을 썼고 그것이
   * 검수관 반려 사유였다 — 그 경로는 `grow.place` 를 타서 성장을 START_SCALE 로 되감는다
   * (실측: sx 4 → 0.08). 슬라이더는 드래그하는 **동안** 값을 밀므로, 감독이 농도를
   * 조절하는 내내 화면의 모든 그림자가 쪼그라들었다 자라기를 반복했다. 폐지한 실시간
   * 그림자의 명멸과 증상이 같다. 근거는 `parcel-grow.ts` 의 `retarget` 주석 한 곳이다.
   * **이 체인(`parcel-assets.retarget` → `parcel-grow.retarget`)의 유일한 소비자가 여기다**
   * — 지우면 체인이 통째로 죽고, 되살릴 때 같은 반려를 다시 받는다.
   *
   * `retarget` 이 없는 풀(구형 소비자)이면 자세 갱신을 **건너뛴다.** 조용히
   * `setTransform` 으로 떨어지면 그 되감기가 되살아나므로, 차라리 안 하는 편이 낫다.
   */
  private reapply(): void {
    const pool = this.pool;
    if (!pool) return;
    for (const [h, t] of this.live) {
      // 죽은 핸들은 건너뛴다. `release` 에서 걷지만, 풀이 직접 반납한 경로(`grow` 밖에서
      // 죽는 경우)는 여기로 오지 않으므로 한 번 더 본다.
      if (h.index < 0) { this.live.delete(h); continue; }
      // 어댑터를 다시 탄다 — 워프가 다시 불려 새 자세가 나오고, `live` 도 같은 원본으로
      // 덮어써진다(원본이 원본으로 갱신되므로 값이 표류하지 않는다).
      pool.retarget?.(h, t.x, t.y, t.z, t.ry, t.sx, t.sy, t.sz);
    }
  }

  /**
   * 다시 구워야 하는지 판정하는 지문. 시간대·노브가 전부 들어간다.
   *
   * ⚠ 태양 성분이 빠지면서 **소수 3자리 라운딩도 함께 없앴다.** 그것은 태양 방향이 매
   * 프레임 미세하게 흔들려서(플레이어 추종 스냅) 넣었던 장치이고, 지금 이 지문에는
   * 연속적으로 흔들리는 성분이 하나도 없다 — 전부 노브와 열거형이다. 그래서 재굽기가
   * 노브를 만지거나 시간대가 넘어갈 때만 돈다.
   */
  private key(): string {
    const o = this.o.opts;
    // ⚠ `blend`·`leaf` 를 빠뜨리면 **노브를 밀어도 다시 굽지 않는다** — 지문이 같아
    // `update` 가 조기 반환하고, 화면에서는 "URL 을 붙였는데 아무 일도 안 일어난다" 로만
    // 드러난다. 새 노브를 여는 사람은 반드시 이 줄을 함께 본다.
    return `${this.o.time()}|${o.res}|${o.density}|${o.soft}|${o.y}|${o.on}|${o.blend}|${o.leaf}`;
  }

  update(ctx: FrameCtx): void {
    if (ctx.hidden) return;
    if (this.key() === this.lastKey) return;
    const ms = this.bake();
    ctx.probe?.('shadow_bake_ms', ms);
    // 굽기가 프레임 예산을 먹으면 알린다. 지금 규모(그라디언트 1회 + 셀 8개 복사 + 행렬
    // ≤504)에서는 넘을 일이 없다고 보지만, **그 판단을 근거 없이 믿지 않기 위해** 축을
    // 남긴다. 실기기에서 이 경고가 뜨면 그때 `bakeAtlas` 안 루프를 chunk 로 쪼갠다.
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
 *
 * **빌더의 `AO_GROUNDED` 표를 옮겨 오지 않는 이유도 같다** — 그 표는 손으로 적은 절대
 * 미터라 지오 변경을 안 따라온다. 배수 하나로 유도하는 근거는 `BLOB_SCALE` 주석 한 곳.
 */
function measure(a: PartAsset): CasterDims {
  const g = a.geometry as unknown as {
    boundingBox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } | null;
    computeBoundingBox(): void;
  };
  if (!g.boundingBox) g.computeBoundingBox();
  const b = g.boundingBox;
  if (!b) return { r: 0.5, rx: 0.5, rz: 0.5 };
  // 외접 반경. 각진 캐스터가 45° 돌아서면 실제 폭이 √2배가 되지만, 원형 블롭에는 방향이
  // 없으므로 그 편차가 화면에 안 나타난다.
  // ⚠ **사각 실루엣에는 그 면제가 없다** — 데칼이 캐스터 `ry` 를 따라 돌기 때문에 45°
  // 회전이 그대로 보인다. 다만 world2 파츠 배치는 회전이 직각 배수라(각 파츠의 `footprint`
  // 주석이 그것을 근거로 반경을 잡고 있다) 지금은 도달하지 않는다. 자유 회전 배치가
  // 들어오는 날 여기가 먼저 깨진다.
  const rx = Math.max(Math.abs(b.min.x), Math.abs(b.max.x));
  const rz = Math.max(Math.abs(b.min.z), Math.abs(b.max.z));
  return {
    r: Math.max(0.05, Math.max(rx, rz)),
    rx: Math.max(0.05, rx),
    rz: Math.max(0.05, rz),
  };
}

function nowMs(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
}

/** 그림자 슬롯 키인가 — 소비처가 문자열 규약을 다시 적지 않게 */
export function isShadowKey(key: string): boolean { return key.startsWith('shadow:'); }

export { shadowKindOf };
export type { ThreeNS };
