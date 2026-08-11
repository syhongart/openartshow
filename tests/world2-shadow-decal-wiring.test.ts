// @vitest-environment jsdom
//
// 그림자 데칼 **배선** — 계산이 아니라 경계를 건너는 지점을 본다.
//
// 판정 산술은 `world2-shadow-decal.test.ts` 가 본다. 여기서 보는 것은 그 계산이
// **실제로 소비되는가**다. 이 저장소가 반복해 데인 자리가 정확히 거기다 — 판정을 순수
// 함수로 떼면 양쪽은 각각 테스트하기 쉬워지지만 "계산된 값이 실제로 쓰이는가" 는
// 어느 쪽 테스트에도 안 걸린다.
//
// 네 축을 본다:
//   ① 워프가 **그림자 키만** 건드린다 — 전부에 적용하면 건물이 눕는다
//   ② `bake()` 가 살아 있는 데칼의 자세를 **다시 쓴다** — 안 쓰면 밤에 낮 방향을 가리킨다
//   ③ 굽기를 반복해도 **캔버스 크기·텍스처 참조가 불변** — 개수 불변식의 계약
//   ④ 반납이 등록부에서 걷힌다 — 안 걷으면 재사용된 남의 슬롯을 덮어쓴다

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ShadowDecalSystem, defaultOpts } from '../frontend/js/world2/systems/shadow-decal.js';
import { createSlotPool } from '../frontend/js/world2/systems/parcel-assets.js';
import { _resetAtlasForTest, atlasOf, paintCell, SHADOW_ATLAS_PX } from '../frontend/js/world2/parts/shadow.js';
import { shadowSpan } from '../frontend/js/world2/decide/shadow-decal.js';
import { PARTS } from '../frontend/js/world2/parts/index.js';
import type { InstancePools, SlotHandle } from '../frontend/js/world2/systems/instancing.js';
import type { PartAsset, ThreeNS } from '../frontend/js/world2/parts/types.js';

// jsdom 에는 네이티브 캔버스가 없어 `getContext` 가 null 이다. 여기서 보는 것은 **배선**
// (같은 캔버스에 다시 그리는가·텍스처 참조가 그대로인가)이므로 그리기는 no-op 이어도 된다.
// `world2-baked-parts.test.ts` 가 같은 이유로 같은 스텁을 쓴다.
const ctx2d = {
  fillStyle: '' as unknown, filter: '', globalAlpha: 1,
  save() {}, restore() {}, clearRect() {}, fillRect() {}, drawImage() {},
  beginPath() {}, closePath() {}, fill() {}, ellipse() {}, roundRect() {},
  moveTo() {}, lineTo() {}, quadraticCurveTo() {},
  createLinearGradient: () => ({ addColorStop() {} }),
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

function assetsFor(): Record<string, PartAsset> {
  const out: Record<string, PartAsset> = {};
  for (const p of PARTS) if (p.shadowProfile) out[p.kind] = stubAsset(10, 2);
  return out;
}

const last = (calls: Map<SlotHandle, Call[]>, h: SlotHandle) => {
  const a = calls.get(h)!;
  return a[a.length - 1];
};

function setup(sun = { x: 0.7, y: 0.7, z: 0.14 }) {
  const { pools, calls } = stubPools();
  const opts = defaultOpts();
  const dir = { ...sun };
  const sys = new ShadowDecalSystem({
    pools, assets: assetsFor(), parts: PARTS,
    sunDir: () => dir, time: () => 'day', opts,
  });
  const pool = createSlotPool(pools, undefined, undefined, sys.warp());
  sys.attach(pool);
  return { sys, pool, calls, opts, dir };
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

  it('그림자 자세는 바뀐다 — 태양 반대쪽으로 밀리고 눕는다', () => {
    const { pool, calls } = setup();
    const h = pool.acquire('shadow:building')!;
    pool.setTransform(h, 5, 0, -3, 0.4, 6, 12, 7);
    const c = last(calls, h);
    expect(c).not.toEqual({ x: 5, y: 0, z: -3, ry: 0.4, sx: 6, sy: 12, sz: 7 });
    expect(c.sy).toBe(1);               // 평면이라 두께가 없다
    expect(c.y).toBeCloseTo(defaultOpts().y, 6); // 도로 위 높이로 옮겨졌다
    // 태양 수평 성분의 반대쪽으로 밀렸다.
    const ux = -0.7, uz = -0.14;
    const l = Math.hypot(ux, uz);
    expect((c.x - 5) * (ux / l) + (c.z + 3) * (uz / l)).toBeGreaterThan(0);
  });

  it('인스턴스 스케일이 그림자 크기에 실제로 반영된다', () => {
    // 단위 치수만 쓰면 큰 나무와 작은 나무의 그림자가 같아진다. 그 결함을 잡는다.
    const { pool, calls } = setup();
    const big = pool.acquire('shadow:tree')!;
    const small = pool.acquire('shadow:tree')!;
    pool.setTransform(big, 0, 0, 0, 0, 2, 2, 2);
    pool.setTransform(small, 0, 0, 0, 0, 0.5, 0.5, 0.5);
    expect(last(calls, big).sz).toBeGreaterThan(last(calls, small).sz * 2);
  });

  it('태양이 지평선 아래면 0 스케일 — 해가 지면 띠가 남지 않는다', () => {
    const { pool, calls } = setup({ x: 0.7, y: -0.1, z: 0.7 });
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 1, 0, 2, 0, 1, 1, 1);
    const c = last(calls, h);
    expect(c.sx).toBe(0);
    expect(c.sz).toBe(0);
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
  it('태양 방향이 바뀌면 회전이 갱신된다 — 밤에 낮 방향을 가리키지 않는다', () => {
    // 이 단언이 이 파일의 핵심이다. `bake()` 가 텍스처만 갱신하고 재적용을 빠뜨리면
    // 헤드리스에서는 아무 증상이 없고 **감독 실기기에서만** 그림자가 엉뚱한 쪽을 본다.
    const { sys, pool, calls, dir } = setup();
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    const before = last(calls, h).ry;

    // 태양을 반대편으로 옮긴다(방위 180°) — 밤에 달 방위로 넘어가는 것과 같은 형태다.
    dir.x = -0.7; dir.z = -0.14;
    sys.bake();

    const after = last(calls, h).ry;
    expect(after).not.toBeCloseTo(before, 3);
    // **정확히 반대편**인지도 본다 — "아무 값으로나 바뀌었다" 로는 부족하다. 각도를
    // [−π, π] 로 정규화한 뒤 그 크기가 π 에 붙어야 한다(태양을 180° 돌렸으므로).
    const d = ((after - before + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    expect(Math.abs(Math.abs(d) - Math.PI)).toBeLessThan(0.05);
  });

  it('길이 노브를 바꾸고 다시 구우면 살아 있는 데칼이 짧아진다', () => {
    const { sys, pool, calls, opts } = setup();
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    const before = last(calls, h).sz;
    opts.maxLen = 4;
    sys.bake();
    expect(last(calls, h).sz).toBeLessThan(before);
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
      expect(atlasOf()!.texture).toBe(tex); // 같은 객체
    }
  });

  it('굽기마다 업로드가 예약된다 — 안 되면 캔버스만 바뀌고 화면은 그대로다', () => {
    // ⚠ `needsUpdate` 를 **읽지 않는다.** three 의 `Texture.needsUpdate` 는 setter 전용이라
    // 읽으면 언제나 `undefined` 다 — `expect(...).toBe(true)` 로 짰다가 실측으로 알았다.
    // 그것을 모르고 짰다면 "단언이 통과하지 않는다" 가 아니라 **영원히 실패하는 검사**를
    // 넣을 뻔했다. 실제 신호는 `version` 이고, 그 증가가 곧 업로드 예약이다.
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
  it('밑동 타원의 세로 반경이 shadowSpan 의 blobFrac 에서 나온다', () => {
    // ── 이 저장소의 **대표적 미러링 사고**를 겨눈다 ─────────────────────────
    // 굽는 쪽이 `blobFrac` 을 자기 상수(예: 0.3)로 계산하면, 실루엣 밑동과 자세 정렬이
    // 갈라져 **그림자가 물건에서 떨어져 나온다.** 그런데 양쪽 산술 테스트는 각각
    // 통과한다 — 판정/집행 경계를 건너는 지점이라 어느 쪽에도 안 걸린다.
    //
    // 그래서 캔버스 호출을 가로채 `ellipse` 의 세로 반경이 정말 `res·blobFrac/2` 인지 본다.
    const seen: number[][] = [];
    const spy = {
      ...ctx2d,
      ellipse(...a: number[]) { seen.push(a); },
    } as unknown as CanvasRenderingContext2D;

    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    const res = 100;
    paintCell(spy, res, { index: 0, profile: 'round', span }, {
      res, density: 1, soft: 0, tail: 0.2,
    });

    expect(seen.length).toBe(1);
    const [cx, cy, rx, ry] = seen[0];
    expect(ry).toBeCloseTo(res * span.blobFrac / 2, 4); // 세로 반경 = blobFrac 유도
    expect(cy).toBeCloseTo(res * span.blobFrac / 2, 4); // 중심도 같은 값(셀 위쪽=발밑)
    expect(rx).toBeCloseTo(res * 0.5, 4);               // 가로는 셀 폭 전체 = 2r
    expect(cx).toBeCloseTo(res * 0.5, 4);
  });

  it('span 이 달라지면 밑동도 달라진다 — 상수를 박아 두면 여기서 걸린다', () => {
    const seen: number[][] = [];
    const spy = { ...ctx2d, ellipse(...a: number[]) { seen.push(a); } } as unknown as CanvasRenderingContext2D;
    const opts = { res: 100, density: 1, soft: 0, tail: 0.2 };
    // 긴 그림자(cot 큼) → 밑동이 전체에서 차지하는 비가 작다.
    paintCell(spy, 100, { index: 0, profile: 'round', span: shadowSpan(10, 2, { ux: 1, uz: 0, cot: 4 }, 999) }, opts);
    // 짧은 그림자 → 밑동 비가 크다.
    paintCell(spy, 100, { index: 0, profile: 'round', span: shadowSpan(10, 2, { ux: 1, uz: 0, cot: 0.2 }, 999) }, opts);
    expect(seen[1][3]).toBeGreaterThan(seen[0][3] * 2);
  });

  it('post 골격은 폭이 좁다 — 가로등이 나무만 한 그늘을 만들지 않는다', () => {
    const seen: number[][] = [];
    const spy = { ...ctx2d, ellipse(...a: number[]) { seen.push(a); } } as unknown as CanvasRenderingContext2D;
    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    const opts = { res: 100, density: 1, soft: 0, tail: 0.2 };
    paintCell(spy, 100, { index: 0, profile: 'round', span }, opts);
    paintCell(spy, 100, { index: 0, profile: 'post', span }, opts);
    expect(seen[1][2]).toBeLessThan(seen[0][2]); // post 의 가로 반경이 더 작다
  });
});
