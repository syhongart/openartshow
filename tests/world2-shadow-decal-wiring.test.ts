// @vitest-environment jsdom
//
// 접촉그림자(AO 블롭) **배선** — 계산이 아니라 경계를 건너는 지점을 본다.
//
// 판정 산술은 `world2-shadow-decal.test.ts` 가 본다. 여기서 보는 것은 그 계산이
// **실제로 소비되는가**다. 이 저장소가 반복해 데인 자리가 정확히 거기다 — 판정을 순수
// 함수로 떼면 양쪽은 각각 테스트하기 쉬워지지만 "계산된 값이 실제로 쓰이는가" 는
// 어느 쪽 테스트에도 안 걸린다.
//
// 여섯 축을 본다:
//   ① 워프가 **그림자 키만** 건드린다 — 전부에 적용하면 건물이 눕는다
//   ② `bake()` 가 살아 있는 데칼의 자세를 **다시 쓴다**
//   ③ 굽기를 반복해도 **캔버스 크기·텍스처 참조가 불변** — 개수 불변식의 계약
//   ④ 반납이 등록부에서 걷힌다 — 안 걷으면 재사용된 남의 슬롯을 덮어쓴다
//   ⑤ 페인터가 판정 스톱을 그대로 칠한다 — 미러링이 없는가
//   ⑥ 워프와 성장이 **함께** 연결됐을 때 재적용이 성장을 되감지 않는다
//
// ── 2026-08-11 2회차: 태양 축 단언이 무효가 됐다 ───────────────────────────
// 감독이 방향성 penumbra 를 폐기하고 빌더의 접촉그림자를 지목했다. **약화된 것이 아니라
// 대상이 사라진 것**이다:
//   · "태양 반대쪽으로 밀린다" · "태양 방향이 바뀌면 회전이 갱신된다" · "태양이 지평선
//     아래면 0 스케일" · "길이 노브가 데칼을 짧게 한다" · penumbra 등고선 스택 전부
//     (겹당 알파 역산 · `destination-in` 곱셈 · 꼬리 그라디언트 · 골격별 실루엣 · 밴딩).
//
// **그 축들이 지키던 성질 중 새 구조에도 남는 것은 옮겼다**:
//   · "재적용이 살아 있는 데칼에 실제로 닿는다"(옛 태양 회전) → `?shy`·`?shdec` 로 확인
//   · "판정 값을 굽는 쪽이 자기 상수로 다시 계산하지 않는다"(옛 `blobFrac` 미러링) →
//     그라디언트 스톱을 `blobStops` 와 **정확히 대조**
//   · "`?shres` 전 구간에서 안 무너진다" · "농도가 한 번만 곱해진다" 는 그대로 남았다

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ShadowDecalSystem, defaultOpts } from '../frontend/js/world2/systems/shadow-decal.js';
import { createSlotPool } from '../frontend/js/world2/systems/parcel-assets.js';
import { ParcelGrowSystem } from '../frontend/js/world2/systems/parcel-grow.js';
import {
  _resetAtlasForTest, atlasOf, paintBlob, SHADOW_ATLAS_PX, SHADOW_DRAW_MIN,
} from '../frontend/js/world2/parts/shadow.js';
import {
  blobStops, decalTransform, midStopFor,
  BLOB_INNER_R, BLOB_OUTER_R, BLOB_SCALE, DECAL_SCALE, SHADOW_SOFT,
} from '../frontend/js/world2/decide/shadow-decal.js';
import { PARTS } from '../frontend/js/world2/parts/index.js';
import type { InstancePools, SlotHandle } from '../frontend/js/world2/systems/instancing.js';
import type { PartAsset, ThreeNS } from '../frontend/js/world2/parts/types.js';

// jsdom 에는 네이티브 캔버스가 없어 `getContext` 가 null 이다. 여기서 보는 것은 **배선**
// (같은 캔버스에 다시 그리는가·텍스처 참조가 그대로인가)이므로 그리기는 no-op 이어도 된다.
// `world2-baked-parts.test.ts` 가 같은 이유로 같은 스텁을 쓴다.
const ctx2d = {
  fillStyle: '' as unknown, filter: '', globalAlpha: 1,
  save() {}, restore() {}, clearRect() {}, fillRect() {}, drawImage() {},
  createRadialGradient: () => ({ addColorStop() {} }),
};
(HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () => ctx2d;

/**
 * 아틀라스를 실제로 만든다. `ensureAtlas` 는 `asset(T)` 안에서만 불리므로, 부팅이
 * `createPartAssets()` 로 전 파츠의 `asset` 을 부르는 것과 같은 일을 여기서 한다.
 *
 * ⚠ 이 한 줄을 빼면 굽기가 **조용히 아무것도 안 한다**(캔버스가 없으면 `bakeAtlas` 가 0을
 * 돌려준다). 그 성질 자체는 의도다 — 헤드리스 단위 테스트에서 죽지 않아야 하므로.
 */
function mountAtlas(): void {
  for (const p of PARTS) if (p.kind.startsWith('shadow:')) p.asset(THREE as unknown as ThreeNS);
}

interface Call { x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number }

/** setTransform 호출을 핸들별로 기록하는 스텁 풀 */
function stubPools() {
  const calls = new Map<SlotHandle, Call[]>();
  let n = 0;
  const pools = {
    acquire: (key: string) => ({ key, index: n++ } as SlotHandle),
    setTransform: (h: SlotHandle, x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number) => {
      const a = calls.get(h) ?? [];
      a.push({ x, y, z, ry, sx, sy, sz });
      calls.set(h, a);
    },
    setColor: () => {},
    release: (h: SlotHandle) => { (h as { index: number }).index = -1; },
  } as unknown as InstancePools;
  return { pools, calls };
}

/** 캐스터 자산 스텁 — `measure` 가 읽는 것은 boundingBox 뿐이다 */
function stubAsset(h: number, r: number): PartAsset {
  return {
    geometry: {
      boundingBox: { min: { x: -r, y: 0, z: -r }, max: { x: r, y: h, z: r } },
      computeBoundingBox() {},
    },
    material: {},
    castShadow: false,
    receiveShadow: false,
  } as unknown as PartAsset;
}

const CASTER_R = 2;

function assetsFor(): Record<string, PartAsset> {
  const out: Record<string, PartAsset> = {};
  for (const p of PARTS) if (p.shadowProfile) out[p.kind] = stubAsset(10, CASTER_R);
  return out;
}

const last = (calls: Map<SlotHandle, Call[]>, h: SlotHandle) => {
  const a = calls.get(h)!;
  return a[a.length - 1];
};

function setup() {
  const { pools, calls } = stubPools();
  const opts = defaultOpts();
  const sys = new ShadowDecalSystem({
    pools, assets: assetsFor(), parts: PARTS, time: () => 'day', opts,
  });
  const pool = createSlotPool(pools, undefined, undefined, sys.warp());
  sys.attach(pool);
  return { sys, pool, calls, opts };
}

beforeEach(() => { _resetAtlasForTest(); });

describe('① 워프는 그림자 키만 건드린다', () => {
  it('캐스터 자세는 바이트 동일하게 통과한다 — 건물이 눕지 않는다', () => {
    // 이 단언이 없으면 워프가 키를 안 보고 전부에 적용해도 아무도 모른다. 증상은
    // "건물이 납작하게 누웠다" 이고, 산술 테스트는 전부 통과한다.
    const { pool, calls } = setup();
    const h = pool.acquire('building')!;
    const t = { x: 5, y: 0, z: -3, ry: 0.4, sx: 6, sy: 12, sz: 7 };
    pool.setTransform(h, t.x, t.y, t.z, t.ry, t.sx, t.sy, t.sz);
    expect(last(calls, h)).toEqual(t);
  });

  it('★ 그림자는 발밑 그 자리에 눕는다 — 방향으로 밀리지 않는다', () => {
    // 이번 교체의 실질이 여기다. 옛 단언은 "태양 반대쪽으로 밀렸다" 였고, 지금 밀리면
    // 그것이 회귀다.
    const { pool, calls, opts } = setup();
    const h = pool.acquire('shadow:building')!;
    pool.setTransform(h, 5, 0, -3, 0.4, 6, 12, 7);
    const c = last(calls, h);
    expect(c.x).toBe(5);            // 캐스터 그대로
    expect(c.z).toBe(-3);
    expect(c.ry).toBe(0);           // 파츠가 돌아도 그림자는 안 돈다
    expect(c.sy).toBe(1);           // 평면이라 두께가 없다
    expect(c.y).toBeCloseTo(opts.y, 12); // 도로 위 높이로 옮겨졌다
    expect(c.sx).toBeCloseTo(c.sz, 12);  // 정사각
    // 크기가 판정에서 나왔다 — 자기 상수로 다시 계산하면 여기서 갈린다.
    expect(c.sx).toBeCloseTo(decalTransform(5, -3, CASTER_R * 7).sx, 9);
  });

  it('인스턴스 스케일이 그림자 크기에 실제로 반영된다', () => {
    // 단위 치수만 쓰면 큰 나무와 작은 나무의 그림자가 같아진다. 그 결함을 잡는다.
    const { pool, calls } = setup();
    const big = pool.acquire('shadow:tree')!;
    const small = pool.acquire('shadow:tree')!;
    pool.setTransform(big, 0, 0, 0, 0, 2, 2, 2);
    pool.setTransform(small, 0, 0, 0, 0, 0.5, 0.5, 0.5);
    expect(last(calls, big).sx).toBeCloseTo(last(calls, small).sx * 4, 9);
  });

  it('★ 높이는 크기에 영향이 없다 — 타워와 벤치를 가르는 것은 밑동뿐이다', () => {
    // 옛 구조는 길이가 `h·cot(고도)` 였다. 접촉그림자는 밑면만 본다(빌더도 그렇다).
    // `measure` 가 `h` 를 되살려 크기에 섞으면 여기서 깨진다.
    const { pools, calls } = stubPools();
    const opts = defaultOpts();
    const assets: Record<string, PartAsset> = {};
    for (const p of PARTS) if (p.shadowProfile) assets[p.kind] = stubAsset(60, CASTER_R);
    const sys = new ShadowDecalSystem({ pools, assets, parts: PARTS, time: () => 'day', opts });
    const pool = createSlotPool(pools, undefined, undefined, sys.warp());
    const tall = pool.acquire('shadow:tree')!;
    pool.setTransform(tall, 0, 0, 0, 0, 1, 1, 1);

    const base = setup();
    const short = base.pool.acquire('shadow:tree')!;
    base.pool.setTransform(short, 0, 0, 0, 0, 1, 1, 1);

    expect(last(calls, tall).sx).toBeCloseTo(last(base.calls, short).sx, 9);
  });

  it('모르는 캐스터 kind 는 0 스케일 — 화면에 정체불명 사각이 안 뜬다', () => {
    // 치수를 못 잰 종류가 생기면(자산 누락) 크기가 NaN 이 되어 텍스처가 화면을 덮을 수
    // 있다. 0 스케일로 떨어뜨린다. 옛 "태양이 지평선 아래면 0 스케일" 이 지키던 성질
    // (= 계산 불가일 때 안 그린다)을 여기로 옮겼다.
    const { pools, calls } = stubPools();
    const sys = new ShadowDecalSystem({
      pools, assets: {}, parts: PARTS, time: () => 'day', opts: defaultOpts(),
    });
    const pool = createSlotPool(pools, undefined, undefined, sys.warp());
    // 캐스터 목록에 없는 키를 직접 넣는다.
    const h = pool.acquire('shadow:없는것')!;
    pool.setTransform(h, 1, 0, 2, 0, 1, 1, 1);
    expect(last(calls, h).sx).toBe(0);
    expect(last(calls, h).sz).toBe(0);
  });

  it('?shdec=0 이면 0 스케일이다 — 슬롯은 그대로 잡고 있다', () => {
    const { pool, calls, opts } = setup();
    opts.on = 0;
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 1, 0, 2, 0, 1, 1, 1);
    expect(last(calls, h).sx).toBe(0);
    expect(h.index).toBeGreaterThanOrEqual(0); // 반납되지 않았다 — 끈 것이 아니다
  });
});

describe('② bake 가 살아 있는 데칼을 다시 쓴다', () => {
  // ⚠ 옛 단언("태양 방향이 바뀌면 회전이 갱신된다")은 무효다. 그러나 그것이 지키던
  // 성질 — **재적용이 살아 있는 데칼에 실제로 닿는가** — 는 그대로 필요하다. 태양이
  // 없어졌으므로 자세를 움직이는 남은 노브(`?shy`·`?shdec`)로 같은 경로를 돌린다.
  // 그 둘이 지금 URL 전용이라는 것이 재적용을 지울 이유가 되지 않는 근거는
  // `ShadowDecalSystem.reapply` 주석 한 곳이다.

  it('★ `?shy` 를 바꾸고 다시 구우면 살아 있는 데칼 높이가 갱신된다', () => {
    const { sys, pool, calls, opts } = setup();
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    expect(last(calls, h).y).toBeCloseTo(opts.y, 12);

    opts.y = 0.42;
    sys.bake();

    expect(last(calls, h).y).toBeCloseTo(0.42, 12);
  });

  it('★ `?shdec=0` 으로 바꾸고 다시 구우면 살아 있는 데칼이 사라진다', () => {
    const { sys, pool, calls, opts } = setup();
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    expect(last(calls, h).sx).toBeGreaterThan(0);

    opts.on = 0;
    sys.bake();

    expect(last(calls, h).sx).toBe(0);
  });

  it('죽은 핸들은 재적용에서 걷힌다 — 남의 슬롯을 덮어쓰지 않는다', () => {
    const { sys, pool, calls } = setup();
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    const before = calls.get(h)!.length;
    (h as { index: number }).index = -1; // 풀이 직접 반납한 경로
    sys.bake();
    expect(calls.get(h)!.length).toBe(before);
    expect(sys.stats().live).toBe(0);
  });

  it('★ 재굽기 지문에 태양이 없다 — 카메라만 돌려도 굽지 않는다', () => {
    // 옛 지문은 태양 방향 3성분을 소수 3자리로 담았고, 그래서 매 프레임 미세하게 흔들려
    // 재굽기가 잦았다. 지금 지문에는 연속 성분이 하나도 없다 — 시간대·노브뿐이다.
    // 같은 상태에서 update 를 여러 번 돌려 굽기가 **한 번만** 도는지 본다.
    mountAtlas();
    const { sys } = setup();
    let bakes = 0;
    const ctx = {
      dt: 0.016, hidden: false,
      probe: (k: string) => { if (k === 'shadow_bake_ms') bakes++; },
    } as never;
    for (let i = 0; i < 30; i++) sys.update(ctx);
    expect(bakes).toBe(1);
  });

  it('시간대가 바뀌면 다시 굽는다 — 밤에도 낮 농도로 남지 않는다', () => {
    mountAtlas();
    const { pools } = stubPools();
    const opts = defaultOpts();
    let t: 'day' | 'night' = 'day';
    const sys = new ShadowDecalSystem({
      pools, assets: assetsFor(), parts: PARTS, time: () => t, opts,
    });
    sys.attach(createSlotPool(pools, undefined, undefined, sys.warp()));
    let bakes = 0;
    const ctx = {
      dt: 0.016, hidden: false,
      probe: (k: string) => { if (k === 'shadow_bake_ms') bakes++; },
    } as never;
    sys.update(ctx);
    expect(bakes).toBe(1);
    t = 'night';
    sys.update(ctx);
    expect(bakes).toBe(2);
  });
});

describe('③ 굽기 불변식 — 개수가 늘지 않는다', () => {
  it('해상도를 바꿔가며 열 번 구워도 캔버스 크기와 텍스처 참조가 불변이다', () => {
    mountAtlas();
    // `canvas.width` 를 대입하면 백킹 스토어가 새로 만들어지고 three 가 텍스처를 파괴 후
    // 재생성한다 — `info.memory.textures` 가 흔들려 [7] 개수 불변식이 깨진다.
    // 그래서 해상도 노브는 **캔버스 크기가 아니라 그리는 해상도**를 움직인다.
    const { sys, opts } = setup();
    sys.bake();
    const at = atlasOf()!;
    const tex = at.texture;
    for (const res of [16, 128, 24, 96, 8, 64, 40, 128, 16, 64]) {
      opts.res = res;
      sys.bake();
      expect(at.canvas.width).toBe(SHADOW_ATLAS_PX);
      expect(at.canvas.height).toBe(SHADOW_ATLAS_PX);
      expect(at.scratch.width).toBe(128);
      expect(atlasOf()!.texture).toBe(tex); // 같은 객체
    }
  });

  it('굽기마다 업로드가 예약된다 — 안 되면 캔버스만 바뀌고 화면은 그대로다', () => {
    // ⚠ `needsUpdate` 를 **읽지 않는다.** three 의 `Texture.needsUpdate` 는 setter 전용이라
    // 읽으면 언제나 `undefined` 다 — `expect(...).toBe(true)` 로 짰다가 실측으로 알았다.
    // 실제 신호는 `version` 이고, 그 증가가 곧 업로드 예약이다.
    mountAtlas();
    const { sys } = setup();
    sys.bake();
    const at = atlasOf()!;
    const v0 = (at.texture as unknown as { version: number }).version;
    sys.bake();
    expect((at.texture as unknown as { version: number }).version).toBeGreaterThan(v0);
  });

  it('아틀라스는 캐스터마다 셀을 하나씩 갖는다 — 종류가 늘어도 넘치지 않는다', () => {
    const { sys } = setup();
    sys.bake();
    const casters = PARTS.filter((p) => p.shadowProfile).length;
    expect(sys.stats().cells).toBe(casters);
    expect(casters).toBeGreaterThan(0);
  });

  it('★ 해상도 하한 아래로는 그리지 않는다 — 셀 경계에 직선이 서지 않는다', () => {
    // ── 확대 렌더 실측(2026-08-11)이 만든 게이트 ────────────────────────────
    // 여백은 **비**라서 `res` 가 작아지면 픽셀로 1 도 안 되고, 원이 셀 가장자리에 걸려
    // 알파가 0 으로 못 내려간다. 셀을 170px 로 확대하면 그 잔여가 **직선**이 된다 —
    // `res=8` 에서 경계 알파 5/255(셀 최대의 3.6%)가 320px 확대에서 실제로 보였다.
    // 실측표는 `SHADOW_DRAW_MIN` 주석 한 곳.
    mountAtlas();
    const at = atlasOf()!;
    const seen: number[] = [];
    (at as { sctx: CanvasRenderingContext2D }).sctx = {
      ...ctx2d,
      createRadialGradient(_x0: number, _y0: number, _r0: number, _x1: number, _y1: number, r1: number) {
        seen.push(r1);
        return { addColorStop() {} };
      },
    } as unknown as CanvasRenderingContext2D;

    const { sys, opts } = setup();
    for (const res of [1, 4, 8, 12, SHADOW_DRAW_MIN, 64, 999]) {
      opts.res = res;
      sys.bake();
    }
    // 그린 바깥 반경을 res 로 되돌리면 실제로 쓰인 해상도가 나온다.
    const used = seen.map((r1) => Math.round(r1 / BLOB_OUTER_R));
    for (const u of used) {
      expect(u, `used=${u}`).toBeGreaterThanOrEqual(SHADOW_DRAW_MIN);
      expect(u, `used=${u}`).toBeLessThanOrEqual(128);
    }
    // 하한이 실제로 물렸다(전부 통과시키는 검사가 아니다).
    expect(used.slice(0, 4)).toEqual([SHADOW_DRAW_MIN, SHADOW_DRAW_MIN, SHADOW_DRAW_MIN, SHADOW_DRAW_MIN]);
    expect(used.at(-1)).toBe(128);
    // NaN 도 하한 아래로 새지 않는다.
    opts.res = Number.NaN;
    sys.bake();
    expect(Math.round(seen.at(-1)! / BLOB_OUTER_R)).toBeGreaterThanOrEqual(SHADOW_DRAW_MIN);
  });

  it('★ 셀마다 다시 그리지 않는다 — 한 번 그려 셀 수만큼 복사한다', () => {
    // 모든 셀이 같은 원형 블롭이므로 굽기 비용이 셀 수와 무관해야 한다. 셀마다 다시
    // 그리면 캐스터가 늘 때마다 굽기가 선형으로 비싸지고, 그 증상은 프레임 히칭뿐이라
    // 아무 단언도 안 걸린다.
    mountAtlas();
    const at = atlasOf()!;
    let gradients = 0;
    let copies = 0;
    const spy = {
      ...ctx2d,
      createRadialGradient: () => { gradients++; return { addColorStop() {} }; },
      drawImage() { copies++; },
    } as unknown as CanvasRenderingContext2D;
    (at as { sctx: CanvasRenderingContext2D }).sctx = spy;
    (at as { ctx: CanvasRenderingContext2D }).ctx = spy;

    const { sys } = setup();
    sys.bake();
    expect(gradients).toBe(1);
    expect(copies).toBe(sys.stats().cells);
  });
});

describe('④ 반납이 등록부에서 걷힌다', () => {
  it('release 하면 등록부에서 빠진다', () => {
    const { sys, pool } = setup();
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    expect(sys.stats().live).toBe(1);
    pool.release(h);
    expect(sys.stats().live).toBe(0);
  });

  it('캐스터를 반납해도 등록부는 흔들리지 않는다 — 워프가 관심 없는 키다', () => {
    const { sys, pool } = setup();
    const s = pool.acquire('shadow:tree')!;
    pool.setTransform(s, 0, 0, 0, 0, 1, 1, 1);
    const b = pool.acquire('building')!;
    pool.setTransform(b, 1, 0, 1, 0, 1, 1, 1);
    pool.release(b);
    expect(sys.stats().live).toBe(1);
  });

  it('dispose 는 등록부를 비운다', () => {
    const { sys, pool } = setup();
    pool.setTransform(pool.acquire('shadow:tree')!, 0, 0, 0, 0, 1, 1, 1);
    sys.dispose();
    expect(sys.stats().live).toBe(0);
  });
});

describe('⑤ 페인터가 판정을 실제로 소비한다 — 미러링이 없는가', () => {
  /**
   * 캔버스 호출을 기록하는 스파이.
   *
   * ⚠ **옛 스파이(`ellipse`·`moveTo`·`lineTo`·`roundRect` 추적)는 통째로 무효다** —
   * 그 도형들이 그리던 것이 방향성 실루엣이었고, 지금은 방사형 그라디언트 하나다.
   * 대신 **그라디언트 인자와 스톱**을 본다. 그것이 지금 룩의 전부이고, 판정
   * (`blobStops`)이 실제로 소비되는지가 걸리는 유일한 자리다.
   */
  function tracer() {
    const radial: number[][] = [];
    const stops: { t: number; a: number }[] = [];
    const seq: string[] = [];
    const rects: number[][] = [];
    const spy = {
      ...ctx2d,
      save() { seq.push('save'); },
      restore() { seq.push('restore'); },
      clearRect(...a: number[]) { seq.push('clear'); rects.push(a); },
      fillRect(...a: number[]) { seq.push('fillRect'); rects.push(a); },
      set fillStyle(v: unknown) { seq.push(typeof v === 'string' ? v : 'gradient'); },
      get fillStyle() { return '#000'; },
      createRadialGradient(...a: number[]) {
        radial.push(a);
        seq.push('createRadial');
        return {
          addColorStop(t: number, c: string) {
            stops.push({ t, a: Number(/[\d.]+\)$/.exec(c)?.[0].slice(0, -1) ?? 'NaN') });
          },
        };
      },
    } as unknown as CanvasRenderingContext2D;
    return { spy, radial, stops, seq, rects };
  }

  it('★ 스톱이 판정에서 그대로 온다 — 굽는 쪽이 자기 알파를 갖지 않는다', () => {
    // 이 저장소의 **대표적 미러링 사고**를 겨눈다. 굽는 쪽이 0.62 를 자기 상수로 적으면
    // 노브를 밀어도 안 변하거나 판정과 갈라지는데, 양쪽 산술 테스트는 각각 통과한다.
    for (const soft of [0, 0.3, SHADOW_SOFT, 1]) {
      for (const density of [0.4, 1, 1.5]) {
        const t = tracer();
        paintBlob(t.spy, 100, { res: 100, density, soft });
        const want = blobStops(soft, density);
        expect(t.stops.length, `soft=${soft} d=${density}`).toBe(want.length);
        t.stops.forEach((got, i) => {
          expect(got.t, `t[${i}] soft=${soft}`).toBeCloseTo(want[i].t, 4);
          expect(got.a, `a[${i}] d=${density}`).toBeCloseTo(want[i].a, 4);
        });
      }
    }
  });

  it('★ 그라디언트 반경이 판정 상수에서 나오고 res 비례다', () => {
    // 하한(`SHADOW_DRAW_MIN`) 클램프는 `bakeAtlas` 소관이라 여기서는 안 걸린다 — 순수
    // 비례성만 본다. 하한이 실제로 물리는지는 ③ 절이 `bakeAtlas` 경로로 확인한다.
    for (const res of [SHADOW_DRAW_MIN, 32, 64, 128]) {
      const t = tracer();
      paintBlob(t.spy, res, { res, density: 1, soft: SHADOW_SOFT });
      expect(t.radial.length, `res=${res}`).toBe(1);
      const [x0, y0, r0, x1, y1, r1] = t.radial[0];
      expect(x0, `res=${res}`).toBeCloseTo(res * 0.5, 9);
      expect(y0, `res=${res}`).toBeCloseTo(res * 0.5, 9);
      expect(x1, `res=${res}`).toBeCloseTo(res * 0.5, 9);
      expect(y1, `res=${res}`).toBeCloseTo(res * 0.5, 9);
      expect(r0, `res=${res}`).toBeCloseTo(res * BLOB_INNER_R, 9);
      expect(r1, `res=${res}`).toBeCloseTo(res * BLOB_OUTER_R, 9);
      // 바깥 반경이 셀 안에 있다 — 경계에 닿으면 알파가 0 으로 갈 자리가 없어지고,
      // 그것이 감독이 앞 회차에 반려한 하드컷의 직접 원인이었다.
      expect(r1, `res=${res}`).toBeLessThan(res * 0.5);
      expect(r0, `res=${res}`).toBeLessThan(r1);
    }
  });

  it('★ 그리기 전에 지운다 — 굽기를 반복해도 알파가 누적되지 않는다', () => {
    // `fillRect` 는 `source-over` 라 덮어쓰기가 아니다. 앞 회차에 겹당 알파 누적으로
    // density 0.45 가 248/255 로 구워진 결함을 겪었다 — 같은 형태다.
    const t = tracer();
    paintBlob(t.spy, 64, { res: 64, density: 1, soft: SHADOW_SOFT });
    expect(t.seq.indexOf('clear')).toBeGreaterThanOrEqual(0);
    expect(t.seq.indexOf('clear')).toBeLessThan(t.seq.indexOf('fillRect'));
    // 지우는 범위와 칠하는 범위가 둘 다 셀 전체다.
    for (const r of t.rects) expect(r).toEqual([0, 0, 64, 64]);
  });

  it('★ 그라디언트를 실제로 칠한다 — 만들어 놓고 안 쓰지 않는다', () => {
    const t = tracer();
    paintBlob(t.spy, 64, { res: 64, density: 1, soft: SHADOW_SOFT });
    const g = t.seq.indexOf('gradient');
    expect(g).toBeGreaterThan(t.seq.indexOf('createRadial'));
    expect(t.seq.slice(g)).toContain('fillRect');
    // 상태를 복원한다 — 안 하면 `fillStyle`·합성 모드가 다음 그리기로 샌다.
    expect(t.seq[0]).toBe('save');
    expect(t.seq.at(-1)).toBe('restore');
  });

  it('★ `?shsoft` 가 실제로 중간 스톱을 민다 — 노브가 장식이 아니다', () => {
    const midOf = (soft: number) => {
      const t = tracer();
      paintBlob(t.spy, 100, { res: 100, density: 1, soft });
      return t.stops[1].t;
    };
    expect(midOf(0)).toBeCloseTo(midStopFor(0), 4);
    expect(midOf(1)).toBeCloseTo(midStopFor(1), 4);
    expect(midOf(0)).toBeGreaterThan(midOf(1)); // 클수록 안쪽 = 더 번진다
    // 중간 지점도 죽지 않는다.
    expect(midOf(0.5)).toBeLessThan(midOf(0.25));
  });

  it('★ 농도가 겹 수와 무관하게 정확히 한 번 곱해진다', () => {
    // 앞 회차의 실패를 원리상 되살릴 수 없게 못 박는다. 스톱 알파가 density 에 **선형**
    // 이어야 한다 — 두 번 곱하면 제곱이 되고, `?shdark` 가 사실상 죽는다.
    const coreOf = (d: number) => {
      const t = tracer();
      paintBlob(t.spy, 100, { res: 100, density: d, soft: SHADOW_SOFT });
      return t.stops[0].a;
    };
    expect(coreOf(0.5)).toBeCloseTo(coreOf(1) * 0.5, 4);
    expect(coreOf(0.25)).toBeCloseTo(coreOf(1) * 0.25, 4);
    expect(coreOf(0)).toBe(0);
  });

  it('`?shres` 를 낮춰도 그림이 무너지지 않는다 — 절대 픽셀이 없다', () => {
    for (const res of [SHADOW_DRAW_MIN, 24, 32, 64, 128]) {
      const t = tracer();
      paintBlob(t.spy, res, { res, density: 1, soft: SHADOW_SOFT });
      const [, , r0, , , r1] = t.radial[0];
      // 비가 res 와 무관하게 일정하다 — 그것이 곧 해상도 독립이다.
      expect(r0 / res, `res=${res}`).toBeCloseTo(BLOB_INNER_R, 9);
      expect(r1 / res, `res=${res}`).toBeCloseTo(BLOB_OUTER_R, 9);
      expect(r0, `res=${res}`).toBeGreaterThan(0);
      // 스톱은 res 와 무관하다(정규화 오프셋이다).
      expect(t.stops.map((s) => s.t)).toEqual(blobStops(SHADOW_SOFT, 1).map((s) => s.t));
    }
  });
});

// ⑥ ── warp 와 grow 를 **함께** 연결한다 (검수관 반려 2026-08-11 의 재발 방지) ─────
//
// 이 절이 없어서 반려를 받았다. 위 ①~⑤ 는 `createSlotPool(pools, undefined, undefined, warp)`
// 로 **grow sink 를 비워 두고** 돌았고, 그래서 "재적용이 성장을 되감는다" 를 아무도 못 봤다.
// 검수관 실측: 재굽기 직후 sx 4 → 0.08(= START_SCALE × 4), `grow.pending` 0 → 1.
//
// ── 이 결함이 화면에서 언제 보이는가 ────────────────────────────────────────
// 개발자 슬라이더는 `input` 이벤트로 **드래그하는 동안 계속** 값을 민다(`knob-bar.ts` 가
// 그렇게 설계돼 있다). 즉 감독이 그림자 농도를 조절하는 내내 화면의 모든 그림자가
// 쪼그라들었다 자라기를 반복했을 것이다. **폐지한 실시간 그림자의 명멸과 증상이 같다.**
//
// ⚠ **태양이 사라진 뒤에도 이 절은 그대로 유효하다** — `bake()` 가 `reapply()` 를 부르고
// 그것이 `retarget` 을 타는 구조가 안 바뀌었기 때문이다. 슬라이더(농도·번짐·해상도)를
// 미는 것이 여전히 재굽기를 부른다.
//
// 교훈(검수관 게시판): 판정/집행 경계를 **두 곳 이상** 새로 이을 때는 "각 경로가 개별로
// 테스트됐는가" 가 아니라 **"두 경로가 같은 진입점에서 만날 때 함께 테스트됐는가"** 를 묻는다.
describe('⑥ warp + grow 동시 연결 — 재적용이 성장을 되감지 않는다', () => {
  function setupWithGrow(duration = 0.4) {
    const { pools, calls } = stubPools();
    const opts = defaultOpts();
    const sys = new ShadowDecalSystem({
      pools, assets: assetsFor(), parts: PARTS, time: () => 'day', opts,
    });
    const grow = new ParcelGrowSystem({ pools, duration, gate: () => true });
    const pool = createSlotPool(pools, undefined, grow.sink(), sys.warp());
    sys.attach(pool);
    return { sys, grow, pool, calls, opts };
  }

  it('★ 다 자란 데칼은 재굽기 후에도 완성 크기다 — 되감기지 않는다', () => {
    const { sys, grow, pool, calls, opts } = setupWithGrow();
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    grow.update({ dt: 10, hidden: false } as never); // 다 자란다
    const grown = last(calls, h).sx;
    expect(grown).toBeGreaterThan(0);
    expect(grow.pending).toBe(0);

    opts.density = 0.9; // 슬라이더를 민 것과 같다
    sys.bake();

    // 되감겼다면 여기서 START_SCALE(0.02) 배가 나온다.
    expect(last(calls, h).sx).toBeCloseTo(grown, 4);
    expect(grow.pending).toBe(0); // 성장 엔트리가 새로 생기지도 않았다
  });

  it('★ 슬라이더를 연속으로 밀어도 매번 되감기지 않는다', () => {
    // `input` 이벤트가 드래그 중 수십 번 오는 상황을 그대로 재현한다.
    const { sys, grow, pool, calls, opts } = setupWithGrow();
    const h = pool.acquire('shadow:building')!;
    pool.setTransform(h, 3, 0, 4, 0, 2, 5, 2);
    grow.update({ dt: 10, hidden: false } as never);
    const grown = last(calls, h).sx;

    for (const d of [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8]) {
      opts.density = d;
      sys.bake();
      expect(last(calls, h).sx).toBeCloseTo(grown, 4);
    }
    expect(grow.pending).toBe(0);
  });

  it('자라는 중에 재굽기하면 자라던 배수가 유지된다 — 처음으로 돌아가지 않는다', () => {
    const { sys, grow, pool, calls, opts } = setupWithGrow(0.4);
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    grow.update({ dt: 0.2, hidden: false } as never); // 절반쯤 자람
    const mid = last(calls, h).sx;

    opts.soft = 0.3;
    sys.bake();

    // 절반쯤 자란 상태가 유지돼야 한다(START_SCALE 로 떨어지면 안 된다).
    const after = last(calls, h).sx;
    expect(after).toBeGreaterThan(mid * 0.5);
    expect(grow.pending).toBe(1); // 아직 자라는 중 — 엔트리는 살아 있다
  });

  it('재굽기 뒤 수축은 **새** 자세에서 출발한다 — lastPose 가 갱신됐다', () => {
    // `retarget` 이 `lastPose` 를 안 고치면 반납 때 옛 자리로 줄어든다.
    // ⚠ 옛 판본은 태양을 돌려 자세를 바꿨다. 지금 자세를 바꾸는 것은 `?shy` 다.
    const { sys, grow, pool, calls, opts } = setupWithGrow();
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    grow.update({ dt: 10, hidden: false } as never);

    opts.y = 0.45;
    sys.bake();
    const moved = last(calls, h);
    expect(moved.y).toBeCloseTo(0.45, 9);

    pool.release(h);
    grow.update({ dt: 0.05, hidden: false } as never);
    const shrinking = last(calls, h);
    // 줄어드는 자리가 **재굽기 후 자세**여야 한다.
    expect(shrinking.y).toBeCloseTo(moved.y, 9);
    expect(shrinking.sx).toBeLessThan(moved.sx);
  });

  it('캐스터는 이 경로에 끼지 않는다 — 재굽기가 건물을 만지지 않는다', () => {
    const { sys, grow, pool, calls, opts } = setupWithGrow();
    const b = pool.acquire('building')!;
    pool.setTransform(b, 1, 0, 2, 0.3, 4, 9, 4);
    grow.update({ dt: 10, hidden: false } as never);
    const before = calls.get(b)!.length;
    opts.density = 0.7;
    sys.bake();
    expect(calls.get(b)!.length).toBe(before); // 호출 0회 추가
  });
});

describe('⑦ 크기 계약이 판정과 집행에서 하나다', () => {
  it('★ 월드 데칼 한 변이 정확히 2·r·BLOB_SCALE·DECAL_SCALE 이다', () => {
    // 굽는 쪽(`BLOB_OUTER_R`)과 놓는 쪽(`DECAL_SCALE`)이 갈라지면 그림자가 물건보다
    // 조금 크거나 작아지는데, 그 편차(6.7%)는 화면에서 알아채기 어렵다.
    const { pool, calls } = setup();
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1.5, 1, 1.5);
    const r = CASTER_R * 1.5;
    expect(last(calls, h).sx).toBeCloseTo(2 * r * BLOB_SCALE * DECAL_SCALE, 9);
    // 그라디언트 바깥 반경이 월드에서 `r · BLOB_SCALE` 이다 — 두 상수가 상쇄된다.
    expect(last(calls, h).sx * BLOB_OUTER_R).toBeCloseTo(r * BLOB_SCALE, 9);
  });
});
