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
  blobStops, decalTransform, decalTransformRect, midStopFor,
  BLOB_INNER_R, BLOB_OUTER_R, BLOB_SCALE, DECAL_SCALE, SHADOW_SOFT,
} from '../frontend/js/world2/decide/shadow-decal.js';
import { PARTS } from '../frontend/js/world2/parts/index.js';
import { ROAD_SURFACE_Y } from '../frontend/js/world2/parts/road.js';
import type { InstancePools, SlotHandle } from '../frontend/js/world2/systems/instancing.js';
import type { PartAsset, ThreeNS } from '../frontend/js/world2/parts/types.js';

// jsdom 에는 네이티브 캔버스가 없어 `getContext` 가 null 이다. 여기서 보는 것은 **배선**
// (같은 캔버스에 다시 그리는가·텍스처 참조가 그대로인가)이므로 그리기는 no-op 이어도 된다.
// `world2-baked-parts.test.ts` 가 같은 이유로 같은 스텁을 쓴다.
// ⚠ `createImageData`/`putImageData` 는 **no-op 이 아니다.** 사각·얼룩 실루엣은 픽셀을
// 직접 계산하므로(`paintShaped`), 스텁이 진짜 버퍼를 돌려줘야 그 산술이 실제로 돈다.
// no-op 으로 두면 실루엣 코드가 **한 줄도 실행되지 않은 채** 배선 테스트가 초록이 된다 —
// 이 저장소가 *"테스트 통과는 검출력의 증거가 아니다"* 라고 적어 둔 그 형태다.
const ctx2d = {
  fillStyle: '' as unknown, filter: '', globalAlpha: 1,
  save() {}, restore() {}, clearRect() {}, fillRect() {}, drawImage() {},
  createRadialGradient: () => ({ addColorStop() {} }),
  createImageData: (w: number, h: number) => ({
    data: new Uint8ClampedArray(w * h * 4), width: w, height: h,
  }),
  putImageData() {},
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

  // ── ⚠ 높이 축이 통째로 비어 있었다 (감독 실기기 2026-08-11) ─────────────────
  // 감독: *"그림자가 바닥 위에 떠있어."*
  //
  // 원인은 데칼 y 가 **절대 높이 0.20 고정**이었던 것이다(도로 0.14 를 넘기려 잡은 값).
  // 잔디(0) 위 파츠는 그림자가 20cm 공중에 떴다. **그런데 아래 기존 테스트가 통과하고
  // 있었다** — 캐스터 `y` 를 언제나 0 으로만 줬기 때문에 `t.y + lift` 와 `절대 lift` 가
  // 우연히 같은 값이었다. 픽셀까지 검사하면서도 **캐스터가 서 있는 높이를 한 번도 안
  // 바꿔 본 것**이고, 그래서 감독 화면에서만 드러났다.
  //
  // 이 저장소가 *"판정/집행 분리의 구멍"* 이라고 부르는 것과는 또 다른 형태다 —
  // 여기서는 **입력 공간의 한 축을 아예 안 밟았다.** 상수를 고정값으로 두면 그 축이
  // 테스트에서 사라진다는 것을 기억할 자리다.
  it('★★ 그림자가 캐스터 발밑에 붙는다 — 도로 위에 서도 안 뜬다', () => {
    const { pool, calls, opts } = setup();
    const onRoad = pool.acquire('shadow:tree')!;
    const onGrass = pool.acquire('shadow:tree')!;
    // 파츠 피벗은 바닥이므로 `y` 가 곧 그 파츠가 선 지면 높이다(도로 0.14 · 잔디 0).
    pool.setTransform(onRoad, 0, 0.14, 0, 0, 1, 1, 1);
    pool.setTransform(onGrass, 0, 0, 0, 0, 1, 1, 1);
    // 각자 자기 지면에서 **같은 만큼** 떠 있다 — 절대 높이면 이 등식이 깨진다.
    expect(last(calls, onRoad).y).toBeCloseTo(0.14 + opts.y, 12);
    expect(last(calls, onGrass).y).toBeCloseTo(0 + opts.y, 12);
    // 두 그림자의 높이차 = 두 지면의 높이차. 절대 높이였다면 차가 0 이었다.
    expect(last(calls, onRoad).y - last(calls, onGrass).y).toBeCloseTo(0.14, 12);
  });

  it('★★ 도로판 위에 서는 캐스터는 그림자도 도로 위다 (검수관 블로커 B2)', () => {
    // ⚠ **이 단언이 없어서 `standsOn` 배선 전체가 검출력 0 이었다.** 검수관이 뮤테이션
    // 둘로 실측했다: ① `poseOf` 의 `groundOf` 항 삭제 ② 파츠의 `standsOn` 선언 삭제 —
    // **두 방향 다 2571/2571 통과.** 배선은 살아 있었는데(`setup()` 이 실제 `PARTS` 를
    // 쓰므로 맵은 채워진다) **`shadow:fountain` 을 잡는 테스트가 0건**이라 그 경로를
    // 아무 단언도 안 탔다.
    //
    // 이 저장소가 이름 붙인 "판정/집행 분리의 구멍" 이다 — `standsOn` 은 판정(파츠 신고)과
    // 집행(그림자가 `y` 에 더함) 사이에 **새 경계를 만들었고**, 경계를 건너는 지점은
    // 양쪽 테스트 어디에도 안 걸린다. 새 경계를 만들 때마다 이 축을 함께 만들어야 한다.
    const { pool, calls, opts } = setup();
    const onSlab = pool.acquire('shadow:fountain')!;
    const onGrass = pool.acquire('shadow:tree')!;
    // 둘 다 배치 `y` 는 0 이다(밑동 불변식) — 갈리는 것은 `standsOn` 신고뿐이다.
    pool.setTransform(onSlab, 0, 0, 0, 0, 1, 1, 1);
    pool.setTransform(onGrass, 0, 0, 0, 0, 1, 1, 1);
    // 광장 랜드마크: 도로판 위 + 띄움. 이 값이 없으면 그림자가 도로에 가려 사라진다.
    expect(last(calls, onSlab).y).toBeCloseTo(ROAD_SURFACE_Y + opts.y, 12);
    // 잔디 파츠는 그대로 — 보정이 **전부에** 걸리면 일반 그림자가 도로 높이만큼 뜬다.
    expect(last(calls, onGrass).y).toBeCloseTo(opts.y, 12);
    // 두 높이차 = 도로판 높이. 보정이 죽으면 0 이 된다(그것이 뮤테이션이 노리는 지점).
    expect(last(calls, onSlab).y - last(calls, onGrass).y).toBeCloseTo(ROAD_SURFACE_Y, 12);
  });

  it('★ 도로판 위 신고가 실제 파츠 선언에서 온다 — 시스템이 지어내지 않는다', () => {
    // `groundOf` 가 파츠 신고가 아니라 자기 상수를 보면 위 단언은 통과하면서 계약이 깨진다.
    // 신고 쪽(`PartSpec.standsOn`)이 실제로 그 값인지 레지스트리에서 직접 확인한다.
    const fountain = PARTS.find((p) => p.kind === 'fountain');
    const clock = PARTS.find((p) => p.kind === 'clock');
    expect(fountain?.standsOn).toBe(ROAD_SURFACE_Y);
    expect(clock?.standsOn).toBe(ROAD_SURFACE_Y);
    // 잔디 파츠는 신고하지 않는다 — 신고가 번지면 전부 뜬다.
    expect(PARTS.find((p) => p.kind === 'tree')?.standsOn).toBeUndefined();
  });

  it('★ 띄우는 값이 눈에 띌 만큼 크지 않다 — 그것이 이번 결함의 정체다', () => {
    // 감독이 본 것은 20cm 였다. 기본값이 그 자릿수로 돌아가면 같은 반려가 다시 온다.
    // 상한(`?shy`)까지 밀어도 20cm 를 넘지 않게 판정 상수가 막는다.
    expect(defaultOpts().y).toBeLessThanOrEqual(0.05);
    expect(defaultOpts().y).toBeGreaterThan(0);  // 0 이면 z-fighting 이 난다
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
    // 캐스터 발밑(`t.y`=0)에서 띄운 높이. **절대 높이가 아니다** — 위 ★★ 절 참조.
    expect(c.y).toBeCloseTo(0 + opts.y, 12);
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

  it('★ 셀마다 다시 그린다 — 실루엣이 종류마다 다르다 (감독 지시 2026-08-11)', () => {
    // ⚠ **이 단언은 2026-08-11 에 뒤집혔다.** 직전 판본은 *"한 번 그려 셀 수만큼 복사한다"*
    // 였고 `gradients === 1` 을 단언했다. 그때는 모든 셀이 같은 원형 블롭이라 그것이 옳았다.
    // 감독이 *"형태가 사각형이면 사각형그림자. 원형이면 원형 그림자면 해."* 를 지시하면서
    // 셀마다 그림이 달라졌으므로, 한 번만 그리면 **벤치도 나무도 원이 된다** — 즉 옛 단언을
    // 그대로 두면 지시를 어긴 상태가 초록으로 통과한다.
    //
    // 뒤집으면서 **비용 축을 잃지 않는다**: 굽기가 셀 수에 비례해졌다는 사실 자체를 여기서
    // 못 박고(경로별 횟수 합 = 셀 수), 실제 소요는 `update` 의 8ms 경고가 실측한다.
    mountAtlas();
    const at = atlasOf()!;
    let gradients = 0;   // 원형(round·post) 경로
    let pixels = 0;      // 사각·얼룩(box·foliage) 경로
    let copies = 0;
    const spy = {
      ...ctx2d,
      createRadialGradient: () => { gradients++; return { addColorStop() {} }; },
      createImageData: (w: number, h: number) => {
        pixels++;
        return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
      },
      drawImage() { copies++; },
    } as unknown as CanvasRenderingContext2D;
    (at as { sctx: CanvasRenderingContext2D }).sctx = spy;
    (at as { ctx: CanvasRenderingContext2D }).ctx = spy;

    const { sys } = setup();
    sys.bake();
    const cells = sys.stats().cells;
    // 셀 하나당 정확히 한 번 그린다 — 두 경로의 합이 셀 수다.
    expect(gradients + pixels).toBe(cells);
    expect(copies).toBe(cells);
    // 감독 판정: 사각(벤치) 하나 + 얼룩(나무) 하나 = 픽셀 경로 **정확히 둘**. 이 숫자가
    // 흔들리면 파츠 배정이 바뀐 것이고, 그 판정은 카드로만 뒤집을 수 있다.
    expect(pixels).toBe(2);
    expect(gradients).toBe(cells - 2);
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

// ── ⑥ 3회차(2026-08-11): 굽은 픽셀을 직접 본다 ─────────────────────────────
//
// 감독 지시 둘의 **결과물**을 픽셀로 확인한다. 위 절들은 "몇 번 그렸나" 를 세지만, 그것은
// 사각이 실제로 사각인지 아무것도 말해 주지 않는다 — 원형 그라디언트를 8번 그려도 횟수
// 단언은 전부 초록이다. 이 저장소가 *"테스트 통과는 검출력의 증거가 아니다"* 라고 적어 둔
// 그 자리라, 실루엣을 **실물로** 판정한다.

/** 굽은 ImageData 를 가로채는 컨텍스트 */
function pixelCtx(): { ctx: CanvasRenderingContext2D; get(): ImageData | null } {
  let out: ImageData | null = null;
  const ctx = {
    ...ctx2d,
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4), width: w, height: h,
    }),
    putImageData: (img: ImageData) => { out = img; },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, get: () => out };
}

/**
 * 픽셀의 **그늘 세기** 0~1. 두 합성 모드를 한 척도로 읽는다.
 *   normal   검정을 알파로 얹으므로 알파가 곧 세기
 *   multiply 회색을 곱하므로 `1 − 밝기` 가 세기
 * 두 모드가 같은 값을 내야 한다는 것이 아래 「같은 밝기」 절의 요점이다.
 */
function shadeAt(img: ImageData, res: number, px: number, py: number, mul: boolean): number {
  const i = (py * res + px) * 4;
  return mul ? 1 - img.data[i]! / 255 : img.data[i + 3]! / 255;
}

/**
 * 셀을 굽고 픽셀을 돌려준다.
 *
 * ⚠ **`'round'` 는 여기서 못 쓴다** — 원형은 `createRadialGradient` 경로라 픽셀을 직접
 * 만들지 않는다(그 경로는 이 변경에서 한 줄도 안 바뀌었고, 스톱 대조는 ⑤ 절이 본다).
 * 원형과 비교해야 할 때는 **`'foliage'` + `leaf: 0`** 을 쓴다 — 얼룩 깊이가 0 이면 남는
 * 것이 순수 원형 프로파일이라, 그것이 곧 "픽셀로 그린 원" 이다.
 */
function bakeCell(
  shape: 'box' | 'foliage', res: number,
  blend: 'multiply' | 'normal' = 'multiply', leaf?: number,
): ImageData {
  const p = pixelCtx();
  paintBlob(p.ctx, res, { res, density: 1, soft: SHADOW_SOFT, blend, leaf }, shape);
  const img = p.get();
  if (!img) throw new Error('굽기가 픽셀을 내지 않았다 — paintShaped 경로를 안 탄 것이다');
  return img;
}

describe('⑥ 굽은 픽셀 — 실루엣이 실제로 그 형태인가', () => {
  const RES = 64;
  const C = RES / 2;

  it('★ 사각은 대각선이 축방향보다 멀리 간다 — 원이면 같아야 한다', () => {
    // **원과 사각을 가르는 조작적 정의다.** 원은 중심에서 등거리면 세기가 같지만, 사각은
    // 같은 거리라도 대각선 쪽이 실루엣 안쪽에 더 깊이 들어 있다. `paintShaped` 의
    // `roundBoxSD` 를 `hypot` 으로 되돌리면(= 실루엣 분기 제거) 이 단언이 깨진다.
    const box = bakeCell('box', RES);
    const round = bakeCell('foliage', RES, 'multiply', 0); // 얼룩 0 = 순수 원형
    // 중심에서 같은 유클리드 거리의 두 점 — 축방향과 대각선.
    const d = 12;
    const diag = Math.round(d / Math.SQRT2);
    const axisBox = shadeAt(box, RES, C + d, C, true);
    const diagBox = shadeAt(box, RES, C + diag, C + diag, true);
    const axisRound = shadeAt(round, RES, C + d, C, true);
    const diagRound = shadeAt(round, RES, C + diag, C + diag, true);
    // 원: 등거리면 세기가 (거의) 같다.
    expect(Math.abs(axisRound - diagRound)).toBeLessThan(0.02);
    // 사각: 대각선 쪽이 더 진하다(안쪽이다).
    expect(diagBox).toBeGreaterThan(axisBox + 0.02);
  });

  it('★ 사각 모서리가 둥글다 — 감독 판정 "많이 둥글게"', () => {
    // 각진 사각이면 꼭짓점까지 실루엣이 차 있다. 둥글리면 꼭짓점이 비어 세기가 0 이다.
    const box = bakeCell('box', RES);
    // 셀 모서리에서 살짝 안쪽 — `BLOB_OUTER_R`(0.469) 사각의 꼭짓점 부근.
    const k = Math.round(RES * BLOB_OUTER_R) - 2;
    const corner = shadeAt(box, RES, C + k, C + k, true);
    const edgeMid = shadeAt(box, RES, C + k, C, true);
    // 변 중점에는 실루엣이 남아 있고, 꼭짓점은 잘려 나갔다.
    expect(corner).toBeLessThan(edgeMid);
    expect(corner).toBeLessThan(0.02);
  });

  it('★ 얼룩은 원보다 들쭉날쭉하다 — 감독 판정 "얼룩덩덩하게"', () => {
    // 같은 반경 링을 따라 세기를 재면, 원은 **정확히** 일정하고 얼룩은 흩어진다.
    //
    // ⚠ 정확한 등거리를 얻으려면 **두 가지**를 함께 맞춰야 한다. 둘 다 실측으로 배웠다:
    //   ① 링 좌표를 `Math.round` 로 잡으면 실제 반경이 흔들린다 → 원에서 분산 0.011.
    //      그래서 **피타고라스 수**를 쓴다: 13² = 12²+5² = 13²+0².
    //   ② 그래도 0.010 이 남았다. 원인은 **짝수 해상도에 중심 픽셀이 없다는 것**이다 —
    //      `res=64` 에서 중심(u=0)은 px=31.5 이므로 `C±13` 이 서로 다른 거리가 된다
    //      (실측: u = +0.211 vs −0.195). **홀수 해상도**면 중심 픽셀이 존재해
    //      (`res=65` → px=32 가 정확히 u=0) 대칭이 정확해진다.
    // 실측에 여유를 얹는 대신 오차원을 없앤 것이다.
    const R = 65;          // 홀수 — 중심 픽셀이 존재한다
    const CC = (R - 1) / 2; // = 32, 정확히 u=0
    const EXACT_R13 = [
      [13, 0], [0, 13], [-13, 0], [0, -13],
      [12, 5], [5, 12], [-12, 5], [5, -12],
      [-5, 12], [12, -5], [-12, -5], [-5, -12],
    ] as const;
    const ring = (img: ImageData): number[] =>
      EXACT_R13.map(([dx, dy]) => shadeAt(img, R, CC + dx, CC + dy, true));
    const sd = (xs: number[]): number => {
      const m = xs.reduce((a, b) => a + b, 0) / xs.length;
      return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
    };
    const roundSd = sd(ring(bakeCell('foliage', R, 'multiply', 0))); // 얼룩 0 = 원
    const leafSd = sd(ring(bakeCell('foliage', R)));
    // 원은 등거리 점에서 **완전히** 같아야 한다 — 남는 것은 8비트 양자화(1/255 ≈ 0.004)뿐.
    expect(roundSd).toBeLessThan(1 / 255);
    expect(leafSd).toBeGreaterThan(roundSd * 3);
  });

  it('★ `?shleaf=0` 이면 나무가 매끈한 원으로 돌아온다 — 되돌림 노브가 실제로 듣는다', () => {
    // 감독이 *"산만해 보일 위험"* 을 알고 고른 축이라, 되돌릴 수 있어야 판정이 뒤집힌다.
    // 얼룩 0 은 **사각과도 다르고 기본 얼룩과도 다른** 순수 원이어야 한다: 등거리 두 점의
    // 세기가 같고(원), 기본 얼룩에서는 그 등식이 깨진다.
    const flat = bakeCell('foliage', RES, 'multiply', 0);
    const leafy = bakeCell('foliage', RES);
    const d = 10;
    const diag = Math.round(d / Math.SQRT2);
    const flatAxis = shadeAt(flat, RES, C + d, C, true);
    const flatDiag = shadeAt(flat, RES, C + diag, C + diag, true);
    expect(Math.abs(flatAxis - flatDiag)).toBeLessThan(0.02);
    // 노브가 실제로 픽셀을 바꾼다 — 안 그러면 `?shleaf` 가 장식이다.
    expect(Array.from(flat.data)).not.toEqual(Array.from(leafy.data));
  });

  it('가장자리는 두 실루엣 모두 0 이다 — 하드컷이 없다', () => {
    // 셀 경계에 잔여가 남으면 확대 합성 때 **직선이 선다**. 앞 회차 감독 반려
    // (*"딱딱하다"*)와 같은 형태의 결함이라 사각·얼룩에서도 확인한다.
    for (const shape of ['box', 'foliage'] as const) {
      const img = bakeCell(shape, RES);
      for (const [px, py] of [[0, 0], [RES - 1, 0], [0, RES - 1], [RES - 1, RES - 1],
        [C, 0], [0, C]] as const) {
        expect(shadeAt(img, RES, px, py, true), `${shape} (${px},${py})`).toBeLessThan(0.01);
      }
    }
  });
});

describe('⑦ 곱하기 합성 — 굽는 그림이 재질과 짝인가', () => {
  const RES = 32;

  it('★ 곱하기 셀은 전면 불투명이다 — 투명 자리는 곱셈에서 검정으로 읽힌다', () => {
    // `MultiplyBlending` 은 알파를 안 본다. 알파 0 인 자리를 남기면 그 픽셀의 RGB(0)가
    // 그대로 곱해져 **가장자리가 검게 탄다.** 이 단언이 그 사고를 막는다.
    const img = bakeCell('box', RES);
    for (let i = 3; i < img.data.length; i += 4) expect(img.data[i]).toBe(255);
  });

  it('★ 곱하기 셀의 가장자리는 흰색이다 — 곱해도 밑이 안 변해야 그림자가 없다', () => {
    const img = bakeCell('foliage', RES);
    const i = 0; // 좌상단 = 실루엣 바깥
    expect(img.data[i]).toBe(255);
    expect(img.data[i + 1]).toBe(255);
    expect(img.data[i + 2]).toBe(255);
  });

  it('곱하기 셀은 무채색이다 — 색을 여는 것은 다음 회차의 축이다', () => {
    // 지금은 회색 곱하기다(판정 파일 「합성 모드」 절). 채널이 갈라지면 그림자가 물든다.
    const img = bakeCell('box', RES);
    for (let i = 0; i < img.data.length; i += 4) {
      expect(img.data[i]).toBe(img.data[i + 1]);
      expect(img.data[i]).toBe(img.data[i + 2]);
    }
  });

  it('normal 셀은 검정 + 가변 알파다 — 옛 동작 그대로', () => {
    const img = bakeCell('box', RES, 'normal');
    let maxA = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      expect(img.data[i]).toBe(0);
      maxA = Math.max(maxA, img.data[i + 3]!);
    }
    expect(maxA).toBeGreaterThan(100);
  });

  it('★★ 두 모드가 같은 밝기를 낸다 — 감독 판정 "진하기는 지금과 같게"', () => {
    // **이 변경의 핵심 계약이다.** 곱하기로 옮기면서 룩이 같이 움직이면, 감독이 화면에서
    // 무엇이 바뀐 것인지 분리할 수 없고 `?shblend` 도 대조군 구실을 못 한다.
    // `dst·(1−a)` 와 `dst·v`(v = 1−a)가 같은 값이라는 산술을 픽셀로 확인한다.
    for (const shape of ['box', 'foliage'] as const) {
      const mul = bakeCell(shape, RES, 'multiply');
      const nrm = bakeCell(shape, RES, 'normal');
      for (let py = 0; py < RES; py += 5) {
        for (let px = 0; px < RES; px += 5) {
          expect(shadeAt(mul, RES, px, py, true), `${shape} (${px},${py})`)
            .toBeCloseTo(shadeAt(nrm, RES, px, py, false), 2);
        }
      }
    }
  });

  it('★ 굽기가 재질의 합성 모드를 세운다 — 그림과 재질이 어긋나면 화면이 통째로 깨진다', () => {
    mountAtlas();
    const at = atlasOf()!;
    const mat = at.material as unknown as { blending: number };
    const { sys } = setup();
    sys.bake();
    // ⚠ **기본이 `normal` 로 뒤집혔다**(감독 화면 판정 2026-08-11). 굽는 그림과 재질이
    // 어긋나면 곱하기 셀(흰 바탕 회색)이 알파 합성돼 **그림자가 흰 사각**으로 보이거나,
    // 반대로 알파 셀이 곱해져 **전면 검정**이 된다. 어느 방향이든 화면이 통째로 깨지므로
    // 기본값이 무엇이든 이 짝은 성립해야 한다 — 그 성질을 ⑨-3 이 두 방향으로 본다.
    expect(mat.blending).toBe(THREE.NormalBlending);
  });
});

describe('⑧ 결정론 — 굽기를 반복해도 무늬가 안 바뀐다', () => {
  it('★ 같은 옵션으로 두 번 구우면 픽셀이 완전히 같다', () => {
    // `Math.random` 이 섞이면 감독이 슬라이더를 미는 내내 나무 그림자가 춤춘다.
    const a = bakeCell('foliage', 48);
    const b = bakeCell('foliage', 48);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
  });
});

// ── ⑨ 검수관 블로커 + 뮤테이션 구멍 (2026-08-11) ───────────────────────────
//
// **이 절은 전부 "테스트가 없어서 뮤테이션이 안 잡힌 자리"다.** 넷 중 셋은 내가 설계한
// 뮤테이션(M3·M5·M10)이 0 failed 로 드러냈고, 하나는 **검수관이 내 뮤테이션 목록 밖에서**
// 찾았다(§④ 블로커). 네 개를 나란히 두는 이유는 형태가 같아서다 — 굽는 쪽은 픽셀까지
// 봤는데 **놓는 쪽·전환 경로·원형 경로**를 안 봤다.

/** 축이 다른 bounding box 스텁 — `stubAsset` 은 rx=rz 라 사각 분기를 못 가른다 */
function stubAssetXZ(h: number, rx: number, rz: number): PartAsset {
  return {
    geometry: {
      boundingBox: { min: { x: -rx, y: 0, z: -rz }, max: { x: rx, y: h, z: rz } },
      computeBoundingBox() {},
    },
    material: {}, castShadow: false, receiveShadow: false,
  } as unknown as PartAsset;
}

describe('⑨-1 사각 실루엣이 놓는 쪽까지 간다 (검수관 블로커 §④)', () => {
  // ⚠ **이 테스트가 없어서 `poseOf` 의 box 분기를 통째로 죽여도 44/44 가 통과했다**
  // (검수관 뮤테이션 실측). 원인은 헬퍼 `stubAsset` 이 모든 캐스터에 **대칭** bounding
  // box(rx=rz)를 주는 것이었다 — 그러면 `decalTransformRect` 와 `decalTransform` 이
  // 우연히 같은 `sx/sz` 를 낸다. `decalTransformRect` 의 **산술**은 순수 테스트가 잘
  // 보고 있었지만 **그 함수가 벤치에 대해 실제로 불리는지**는 아무 데도 안 봤다.
  //
  // CLAUDE.md 가 명시한 "판정/집행 분리의 구멍 — 경계를 건너는 지점은 아무도 안 본다" 의
  // 실물이다. 이 분기가 조용히 깨지면 이번 감독 지시의 **핵심 산출물**(벤치=사각)이
  // 원형으로 되돌아가는데 CI 는 초록이다.

  /** 벤치만 비대칭(3.2:1 — 실제 밑면 1.4×0.44 비율)으로 준 시스템 */
  function setupAsym() {
    const { pools, calls } = stubPools();
    const opts = defaultOpts();
    const assets: Record<string, PartAsset> = {};
    for (const p of PARTS) {
      if (!p.shadowProfile) continue;
      assets[p.kind] = p.kind === 'bench'
        ? stubAssetXZ(1, 0.7, 0.22)   // 가로 3.2 : 세로 1
        : stubAsset(10, CASTER_R);
    }
    const sys = new ShadowDecalSystem({ pools, assets, parts: PARTS, time: () => 'day', opts });
    const pool = createSlotPool(pools, undefined, undefined, sys.warp());
    sys.attach(pool);
    return { sys, pool, calls };
  }

  it('★ 벤치 그림자는 길쭉하다 — 밑면 비율이 실제로 전달된다', () => {
    const { pool, calls } = setupAsym();
    const h = pool.acquire('shadow:bench')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    const c = last(calls, h);
    // 정사각이면 사각 분기가 안 탄 것이다 — 그것이 죽은 분기의 증상이다.
    expect(c.sx).not.toBeCloseTo(c.sz, 6);
    expect(c.sx / c.sz).toBeCloseTo(0.7 / 0.22, 6);
    // 판정 함수와 정확히 같은 값이어야 한다(집행이 자기 식으로 다시 계산하지 않는가).
    expect(c.sx).toBeCloseTo(decalTransformRect(0, 0, 0.7, 0.22, 0).sx, 9);
  });

  it('★ 벤치 그림자는 캐스터를 따라 돈다 — 원형이 안 도는 것과 짝이다', () => {
    // 벤치가 90° 돌았는데 그늘만 안 돌면 그것이 곧 결함이다. 반대로 원형은 돌면 안 된다
    // (`decalTransform` 의 `ry:0` 계약) — 두 성질을 한 테스트에서 대조한다.
    const { pool, calls } = setupAsym();
    const bench = pool.acquire('shadow:bench')!;
    const tree = pool.acquire('shadow:tree')!;
    pool.setTransform(bench, 0, 0, 0, Math.PI / 2, 1, 1, 1);
    pool.setTransform(tree, 0, 0, 0, Math.PI / 2, 1, 1, 1);
    expect(last(calls, bench).ry).toBeCloseTo(Math.PI / 2, 9);
    expect(last(calls, tree).ry).toBe(0);
  });

  it('★ 인스턴스 스케일이 축마다 따로 곱해진다 — 긴 벤치가 정사각이 되지 않는다', () => {
    // `d.rx * t.sx` / `d.rz * t.sz` 를 `max(t.sx,t.sz)` 하나로 뭉개면 여기서 걸린다.
    const { pool, calls } = setupAsym();
    const h = pool.acquire('shadow:bench')!;
    pool.setTransform(h, 0, 0, 0, 0, 2, 1, 1);   // x 만 2배
    const c = last(calls, h);
    expect(c.sx / c.sz).toBeCloseTo((0.7 * 2) / 0.22, 6);
  });

  it('원형 캐스터는 비대칭 bbox 를 줘도 정사각을 유지한다 — 룩이 안 바뀐다', () => {
    // 축별 반경을 원형에도 적용하면 **모든 그림자가 타원이 된다.** 그것은 감독이 승인한
    // 룩이 아니다(`decalTransformRect` 주석의 분리 근거). 그 경계를 못 박는다.
    const { pools, calls } = stubPools();
    const opts = defaultOpts();
    const assets: Record<string, PartAsset> = {};
    for (const p of PARTS) if (p.shadowProfile) assets[p.kind] = stubAssetXZ(10, 3, 1);
    const sys = new ShadowDecalSystem({ pools, assets, parts: PARTS, time: () => 'day', opts });
    const pool = createSlotPool(pools, undefined, undefined, sys.warp());
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    expect(last(calls, h).sx).toBeCloseTo(last(calls, h).sz, 9);
  });
});

describe('⑨-2 원형 경로의 곱하기 (뮤테이션 M3 — 0 failed 였다)', () => {
  // ⚠ **원형 경로의 흰 바탕 블록을 통째로 지워도 93/93 이 통과했다.** 그 한 줄이 없으면
  // 곱셈 결과가 `dst × 0` 이라 **원형 그림자 여섯 종이 전면 검정**이 된다 — 화면이 크게
  // 깨지는 결함인데 테스트가 조용했다. 내가 픽셀 검사를 사각·얼룩에만 붙이고 원형은
  // *"기존 경로라 안 바뀌었다"* 며 넘긴 탓이다. **안 바뀐 경로에 새 모드가 추가된 것**을
  // 놓쳤다.

  it('★ 곱하기면 흰 바탕을 먼저 깐다 — 없으면 원형 그림자가 전면 검정이 된다', () => {
    const ops: string[] = [];
    const spy = {
      ...ctx2d,
      set fillStyle(v: unknown) { ops.push(`fill=${String(v)}`); },
      get fillStyle() { return ''; },
      fillRect() { ops.push('rect'); },
      createRadialGradient: () => { ops.push('grad'); return { addColorStop() {} }; },
    } as unknown as CanvasRenderingContext2D;
    paintBlob(spy, 32, { res: 32, density: 1, soft: SHADOW_SOFT, blend: 'multiply' }, 'round');
    // 흰색 지정 → 채우기 가 그라디언트보다 **먼저** 와야 한다.
    const white = ops.indexOf('fill=#ffffff');
    const grad = ops.indexOf('grad');
    expect(white, `순서: ${ops.join(' ')}`).toBeGreaterThanOrEqual(0);
    expect(white).toBeLessThan(grad);
    // 흰 바탕 채우기가 실제로 있었다(지정만 하고 안 칠하면 소용없다).
    expect(ops.slice(white, grad)).toContain('rect');
  });

  it('normal 이면 흰 바탕을 깔지 않는다 — 옛 동작이 그대로 남아야 대조군이 된다', () => {
    const ops: string[] = [];
    const spy = {
      ...ctx2d,
      set fillStyle(v: unknown) { ops.push(`fill=${String(v)}`); },
      get fillStyle() { return ''; },
      fillRect() { ops.push('rect'); },
      createRadialGradient: () => { ops.push('grad'); return { addColorStop() {} }; },
    } as unknown as CanvasRenderingContext2D;
    paintBlob(spy, 32, { res: 32, density: 1, soft: SHADOW_SOFT, blend: 'normal' }, 'round');
    expect(ops).not.toContain('fill=#ffffff');
  });
});

describe('⑨-3 합성 모드 전환 (뮤테이션 M5 — 0 failed 였다)', () => {
  // ⚠ 기존 단언은 **기본값만** 봤다. `ensureAtlas` 가 이미 기본 모드로 재질을 만들므로
  // `bakeAtlas` 의 갱신 블록을 지워도 기본 경로는 초록이다. 실제로 확인해야 하는 것은
  // **전환**이다 — `?shblend=normal` 을 붙였을 때 재질이 따라오는가.

  it('★ `?shblend=normal` 이면 재질이 NormalBlending 으로 간다', () => {
    mountAtlas();
    const at = atlasOf()!;
    const { pools } = stubPools();
    const opts = { ...defaultOpts(), blend: 'normal' as const };
    const sys = new ShadowDecalSystem({
      pools, assets: assetsFor(), parts: PARTS, time: () => 'day', opts,
    });
    sys.bake();
    expect((at.material as unknown as { blending: number }).blending)
      .toBe(THREE.NormalBlending);
  });

  it('★ 굽는 그림과 재질이 같은 값에서 나온다 — 어긋나면 화면이 통째로 깨진다', () => {
    // multiply 로 구웠는데 재질이 Normal 이면 흰 바탕 회색이 그대로 알파 합성돼
    // **그림자가 흰 사각**으로 보인다. 반대면 전면 검정이다. 두 방향 다 본다.
    mountAtlas();
    const at = atlasOf()!;
    const mat = at.material as unknown as { blending: number };
    for (const [blend, want] of [
      ['normal', THREE.NormalBlending], ['multiply', THREE.MultiplyBlending],
    ] as const) {
      const { pools } = stubPools();
      const sys = new ShadowDecalSystem({
        pools, assets: assetsFor(), parts: PARTS, time: () => 'day',
        opts: { ...defaultOpts(), blend },
      });
      sys.bake();
      expect(mat.blending, `blend=${blend}`).toBe(want);
    }
  });
});

describe('⑨-4 노브가 재굽기를 발화한다 (뮤테이션 M10 — 0 failed 였다)', () => {
  // ⚠ `key()` 에서 `blend`·`leaf` 를 지워도 통과했다. 그러면 **노브를 밀어도 지문이 같아
  // 다시 굽지 않는다** — 화면에서는 "URL 을 붙였는데 아무 일도 안 일어난다" 로만 드러난다.

  const ctx = { hidden: false, probe: () => {} } as never;

  function bakeCounter() {
    mountAtlas();
    const at = atlasOf()!;
    let bakes = 0;
    const spy = {
      ...ctx2d,
      createRadialGradient: () => { bakes++; return { addColorStop() {} }; },
    } as unknown as CanvasRenderingContext2D;
    (at as { sctx: CanvasRenderingContext2D }).sctx = spy;
    (at as { ctx: CanvasRenderingContext2D }).ctx = spy;
    return { count: () => bakes };
  }

  it('★ `?shblend` 를 바꾸면 다시 굽는다', () => {
    const c = bakeCounter();
    const { sys, opts } = setup();
    sys.update(ctx);
    const first = c.count();
    expect(first).toBeGreaterThan(0);
    sys.update(ctx);                       // 아무것도 안 바뀜 → 다시 굽지 않는다
    expect(c.count()).toBe(first);
    opts.blend = 'multiply';               // 노브를 민다(기본이 normal 이므로 반대로)
    sys.update(ctx);
    expect(c.count()).toBeGreaterThan(first);
  });

  it('★ `?shleaf` 를 바꾸면 다시 굽는다', () => {
    const c = bakeCounter();
    const { sys, opts } = setup();
    sys.update(ctx);
    const first = c.count();
    sys.update(ctx);
    expect(c.count()).toBe(first);
    opts.leaf = 0;
    sys.update(ctx);
    expect(c.count()).toBeGreaterThan(first);
  });
});
