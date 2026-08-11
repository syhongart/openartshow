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
import { ParcelGrowSystem } from '../frontend/js/world2/systems/parcel-grow.js';
import { _resetAtlasForTest, atlasOf, paintCell, SHADOW_ATLAS_PX } from '../frontend/js/world2/parts/shadow.js';
import {
  shadowSpan, decalLocalZ, styleOf, penumbraPlan,
  SHADOW_PAD, SHADOW_STYLE, SHADOW_STYLES,
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
  /**
   * 캔버스 호출을 전부 기록하는 스파이.
   *
   * ⚠ **`ellipse` 만 보던 옛 스파이로는 이제 부족하다.** 2026-08-11 재설계로 실루엣이
   * 「밑동 타원 + 꼬리 사다리꼴」한 path 가 됐고 그것을 `layers` 겹 그린다. 좌표가
   * `moveTo`·`lineTo`·`roundRect` 로도 나가므로, 전부 모아야 "실루엣이 여백 안에 있는가"
   * 를 볼 수 있다 — 그것이 감독 반려의 직접 원인이었던 축이다.
   */
  function tracer() {
    const ellipses: number[][] = [];
    const pts: { x: number; y: number }[] = [];
    const alphas: number[] = [];
    const blurs: string[] = [];
    const stops: { t: number; a: number }[] = [];
    const spy = {
      ...ctx2d,
      set globalAlpha(v: number) { alphas.push(v); },
      get globalAlpha() { return 1; },
      set filter(v: string) { blurs.push(v); },
      get filter() { return 'none'; },
      ellipse(...a: number[]) {
        ellipses.push(a);
        const [cx, cy, rx, ry] = a;
        pts.push({ x: cx - rx, y: cy - ry }, { x: cx + rx, y: cy + ry });
      },
      moveTo(x: number, y: number) { pts.push({ x, y }); },
      lineTo(x: number, y: number) { pts.push({ x, y }); },
      quadraticCurveTo(_a: number, _b: number, x: number, y: number) { pts.push({ x, y }); },
      roundRect(x: number, y: number, w: number, h: number) {
        pts.push({ x, y }, { x: x + w, y: y + h });
      },
      createLinearGradient: () => ({
        addColorStop(t: number, c: string) {
          stops.push({ t, a: Number(/[\d.]+\)$/.exec(c)?.[0].slice(0, -1) ?? 'NaN') });
        },
      }),
    } as unknown as CanvasRenderingContext2D;
    return { spy, ellipses, pts, alphas, blurs, stops };
  }

  const OPTS = { density: 1, soft: 0.3, tail: 0.2 } as const;

  it('밑동 타원의 세로 반경이 shadowSpan 의 blobFrac 에서 나온다', () => {
    // ── 이 저장소의 **대표적 미러링 사고**를 겨눈다 ─────────────────────────
    // 굽는 쪽이 `blobFrac` 을 자기 상수(예: 0.3)로 계산하면, 실루엣 밑동과 자세 정렬이
    // 갈라져 **그림자가 물건에서 떨어져 나온다.** 그런데 양쪽 산술 테스트는 각각
    // 통과한다 — 판정/집행 경계를 건너는 지점이라 어느 쪽에도 안 걸린다.
    //
    // ⚠ 옛 단언은 `ry === res·blobFrac/2` 였다. **여백이 생겨 기준이 `inner` 로 바뀌었고**,
    // 밑동 중심도 `decalLocalZ` 를 통과한다. 두 식 모두 판정 쪽 상수에서 유도하므로
    // 미러링을 겨누는 성질은 그대로다 — 오히려 `SHADOW_PAD` 라는 축이 하나 늘었다.
    const t = tracer();
    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    const res = 100;
    // 확산 0(`soft:0`)이면 코어 등고선만 남아 원본 실루엣 치수를 직접 볼 수 있다.
    paintCell(t.spy, res, { index: 0, profile: 'round', span }, { ...OPTS, res, soft: 0 });

    const inner = res * (1 - 2 * SHADOW_PAD);
    // 확산이 0 이라 모든 겹이 같은 도형이다 — 겹 수만큼 불린다.
    expect(t.ellipses.length).toBe(styleOf(SHADOW_STYLE).layers);
    const [cx, cy, rx, ry] = t.ellipses[0];
    expect(ry).toBeCloseTo(inner * span.blobFrac / 2, 4);
    expect(cy).toBeCloseTo((decalLocalZ(span.blobFrac / 2) + 0.5) * res, 4);
    expect(rx).toBeCloseTo(inner * 0.5, 4);
    expect(cx).toBeCloseTo(res * 0.5, 4);
  });

  it('실루엣이 캔버스 경계에 닿지 않는다 — 감독 반려의 직접 원인을 막는다', () => {
    // ── 이 단언이 이번 재설계의 **핵심 회귀 게이트**다 ────────────────────────
    // 옛 판본은 `rx = res·0.5`·`cy − ry = 0`·꼬리가 `res` 까지라 사방이 경계에 닿아
    // 있었고, 그래서 블러를 아무리 걸어도 알파가 0 으로 갈 자리가 없었다(헤드리스 실측:
    // 경계 알파가 셀 최대치의 31~39%). 여백을 지우거나 확산 상한을 풀면 여기서 깨진다.
    for (const style of SHADOW_STYLES) {
      for (const soft of [0, 0.3, 0.5]) {
        for (const profile of ['round', 'box', 'post'] as const) {
          const t = tracer();
          const res = 100;
          const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
          paintCell(t.spy, res, { index: 0, profile, span }, { ...OPTS, res, soft, style });
          const tag = `${style}/${profile}/soft=${soft}`;
          expect(t.pts.length, tag).toBeGreaterThan(0);
          for (const p of t.pts) {
            // 여유는 블러 몫이다. 도형 자체는 여백 안에 있어야 한다.
            expect(p.x, `${tag} x=${p.x}`).toBeGreaterThanOrEqual(0);
            expect(p.x, `${tag} x=${p.x}`).toBeLessThanOrEqual(res);
            expect(p.y, `${tag} y=${p.y}`).toBeGreaterThanOrEqual(0);
            expect(p.y, `${tag} y=${p.y}`).toBeLessThanOrEqual(res);
          }
        }
      }
    }
  });

  it('완전그늘이 끝으로 갈수록 좁아진다 — 폭 일정한 직사각형이 아니다', () => {
    // ── 진단 ② ("꼬리가 폭 일정한 직사각형이다") ─────────────────────────────
    // 옛 판본은 `fillRect` 하나라 꼬리 폭이 상수였다(실측: y40·70·100·126 모두 같은 폭).
    //
    // ⚠ **처음에는 "최외곽이 끝에서 넓어진다" 로 단언했고 그것은 틀린 주장이 됐다.**
    // 최외곽 등고선은 이제 **원본 실루엣 그 자체**이고(바깥 확장을 없앴다), 원본 실루엣의
    // 폭은 `span.width` 로 일정한 것이 맞다 — 그림자의 바깥 경계는 평행광 근사에서 실제로
    // 평행하다. 끝으로 갈수록 넓어지는 것은 **반그림자**이고, 그것은 전체 폭이 아니라
    // **완전그늘이 좁아지는 것**으로 나타난다. 그 성질을 여기서 본다.
    const res = 100;
    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    const t = tracer();
    paintCell(t.spy, res, { index: 0, profile: 'round', span }, { ...OPTS, res, soft: 0.5 });
    // 사다리꼴 꼭짓점 넷이 겹마다 나온다. 밑동 y(=위쪽 두 점)와 끝 y 를 갈라 폭을 잰다.
    const cy = (decalLocalZ(span.blobFrac / 2) + 0.5) * res;
    const halfAt = (near: boolean) => {
      const sel = t.pts.filter((p) => (near ? Math.abs(p.y - cy) < 0.6 : p.y > cy + 1));
      // ⚠ 중앙점을 뺀다 — 둥근 꼬리 끝의 `quadraticCurveTo` 종점이 `(cx, endY)` 라
      // 반폭 0 으로 들어오고, 그러면 아래 `min` 단언이 **무엇을 해도 통과**한다.
      return sel.map((p) => Math.abs(p.x - res / 2)).filter((h) => h > 1);
    };
    const footHalves = halfAt(true);
    const tipHalves = halfAt(false);
    // 최외곽(= 원본 실루엣)은 밑동과 끝의 폭이 같다 — 바깥 경계는 평행하다.
    expect(Math.max(...tipHalves)).toBeCloseTo(Math.max(...footHalves), 3);
    // 코어의 끝은 코어의 밑동보다 확실히 좁다 = 완전그늘이 멀어질수록 사라진다.
    expect(Math.min(...tipHalves)).toBeLessThan(Math.min(...footHalves) * 0.75);
    // 그리고 그 좁아짐은 겹마다 다르다 — 한 겹만 좁히면 부채꼴이 안 생긴다.
    expect(new Set(tipHalves.map((h) => h.toFixed(2))).size).toBeGreaterThan(3);
  });

  it('접지부의 반그림자가 꼬리 끝보다 좁다 — 발밑이 선명하고 끝이 흐리다', () => {
    // ── 진단 ④ ("블러 반경이 전 영역 균일하다. 실제는 접지부가 선명하고 끝이 흐리다") ──
    // ⚠ **처음에는 이것을 "겹마다 블러가 다른가" 로 단언했고 축을 잘못 잡은 것이었다.**
    // 블러는 등고선 **계단**을 메우는 것이라 겹마다 다를 이유가 없다(`penumbraPlan` 주석).
    // 접지·끝의 선명도 차이를 만드는 것은 **등고선이 벌어지는 폭**이고, 그것은
    // `contactTight`(밑동) 대 `flare`+`umbraTaper`(끝)가 정한다. 그 폭을 직접 잰다.
    const res = 100;
    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    const t = tracer();
    paintCell(t.spy, res, { index: 0, profile: 'round', span }, { ...OPTS, res, soft: 0.5 });

    // 밑동 반경들의 퍼짐 = 접지부 반그림자 폭.
    const footR = t.ellipses.map((e) => e[2]);
    const footSpread = Math.max(...footR) - Math.min(...footR);
    // 끝 반폭들의 퍼짐 = 꼬리 끝 반그림자 폭.
    const cy = (decalLocalZ(span.blobFrac / 2) + 0.5) * res;
    const tipHalf = t.pts.filter((p) => p.y > cy + 1).map((p) => Math.abs(p.x - res / 2));
    const tipSpread = Math.max(...tipHalf) - Math.min(...tipHalf);

    expect(footSpread).toBeGreaterThan(0);              // 접지부에도 반그림자는 있다
    expect(tipSpread).toBeGreaterThan(footSpread * 1.5); // 끝이 확실히 더 넓다

    // ⚠ 위 두 줄만으로는 **부족했다** — 뮤테이션 실측(2026-08-11): `contactTight` 를
    // `flare` 로 바꿔(= 접지·끝 구분을 없애) 돌려도 0 failed 였다. `umbraTaper` 가 끝을
    // 따로 벌려 주는 바람에 비율 단언이 계속 통과한 것이다. 그래서 접지부 폭이 **판정
    // 쪽 `contactTight` 에서 나왔는지**를 직접 대조한다 — 이 저장소의 미러링 축과 같다.
    const sp = styleOf(SHADOW_STYLE);
    const rx = res * (1 - 2 * SHADOW_PAD) * 0.5;
    const plan = penumbraPlan(0.5, res, rx, sp);
    expect(footSpread).toBeCloseTo(plan.inner * sp.contactTight, 4);
    // 끝 폭은 `flare` 와 `umbraTaper` 를 **둘 다** 소비한다. 정확한 등식은 못 쓴다 —
    // 이 표본에는 밑동 타원의 아래쪽 경계점(`cy + ryb`)도 섞여 들어온다. 하한만 본다.
    expect(tipSpread).toBeGreaterThanOrEqual(plan.inner * sp.flare + rx * sp.umbraTaper - 1e-4);
  });

  it('블러가 등고선 간격에서 나온다 — 계단이 경계로 읽히지 않는다', () => {
    // 옛 판본은 `blur = soft·res` 라 간격과 무관했다. 지금은 간격이 정하므로
    // `layers` 를 바꾸면 블러가 **따라 변해야** 한다.
    const res = 100;
    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    const blurOf = (style: (typeof SHADOW_STYLES)[number]) => {
      const t = tracer();
      paintCell(t.spy, res, { index: 0, profile: 'round', span }, { ...OPTS, res, soft: 0.5, style });
      const v = t.blurs.filter((b) => b !== 'none');
      expect(v.length, style).toBeGreaterThan(0); // 블러가 아예 없으면 계단이 보인다
      return Number(/[\d.]+/.exec(v[0])![0]);
    };
    // 룩마다 간격·`blurK` 가 달라 블러도 달라야 한다.
    expect(new Set(SHADOW_STYLES.map(blurOf)).size).toBe(SHADOW_STYLES.length);

    // `soft=0` 이면 반그림자가 없으므로 블러도 없다 — 하드 실루엣으로 되돌아간다.
    const hard = tracer();
    paintCell(hard.spy, res, { index: 0, profile: 'round', span }, { ...OPTS, res, soft: 0 });
    expect(hard.blurs.every((b) => b === 'none')).toBe(true);
  });

  it('농도가 겹 수만큼 누적되지 않는다 — 정확히 한 번만 곱해진다', () => {
    // 실측으로 잡은 결함이다 — `globalAlpha = density` 를 겹마다 쓰면 `contact`(6겹)가
    // density 0.45 에서도 알파 248/255 로 구워졌다. `?shdark` 가 사실상 죽는다.
    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    const run = (density: number) => {
      const t = tracer();
      paintCell(t.spy, 100, { index: 0, profile: 'round', span }, {
        res: 100, density, soft: 0.3, tail: 0.2, style: 'contact',
      });
      return t;
    };
    const sp = styleOf('contact');
    const t = run(0.45);
    // 등고선 알파는 `density` 와 **무관**하고 겹마다 같다. 마지막 곱셈 단계에서만 다르다.
    const layerAlphas = t.alphas.slice(0, sp.layers);
    expect(new Set(layerAlphas).size).toBe(1);
    expect(1 - Math.pow(1 - layerAlphas[0], sp.layers)).toBeCloseTo(sp.core, 6);
    // 농도는 마지막 합성 단계에 정확히 한 번 온다.
    expect(t.alphas.at(-1)).toBeCloseTo(0.45, 9);
    // 농도를 바꿔도 등고선 알파는 안 변한다 — 변하면 겹 수만큼 누적된다는 뜻이다.
    expect(run(0.9).alphas[0]).toBeCloseTo(layerAlphas[0], 9);
  });

  it('감쇠를 마지막에 한 번 곱한다 — 겹마다 곱하면 밴딩이 layers 배로 증폭된다', () => {
    // ── 화면의 가로 줄무늬를 없앤 수정을 지키는 단언 (2026-08-11) ──────────────
    // 겹마다 그라디언트를 `fillStyle` 로 걸면 겹당 소스 알파가 매번 8비트로 양자화되고,
    // 그 1 단위 오차가 겹 수만큼 증폭돼 계단이 된다. 실측 세로 프로파일에서 계단 **수가
    // `layers` 와 정확히 같았고**, 그라디언트 스톱을 4배로 늘려도 그대로였다.
    // `destination-in` 으로 마지막에 한 번 곱하면 양자화가 한 번만 일어난다.
    const ops: string[] = [];
    const seq: string[] = [];
    const grads: unknown[] = [];
    const base = {
      ...ctx2d,
      set globalCompositeOperation(v: string) { ops.push(v); },
      get globalCompositeOperation() { return 'source-over'; },
      set fillStyle(v: unknown) { seq.push(typeof v === 'string' ? v : 'gradient'); },
      get fillStyle() { return '#000'; },
      fillRect() { seq.push('fillRect'); },
      fill() { seq.push('fill'); },
      createLinearGradient() { const g = { addColorStop() {} }; grads.push(g); return g; },
    } as unknown as CanvasRenderingContext2D;

    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    paintCell(base, 100, { index: 0, profile: 'round', span }, { ...OPTS, res: 100 });

    // 그라디언트는 **한 번만** 만들어진다(겹마다 만들면 굽기 소요도 layers 배가 된다).
    expect(grads.length).toBe(1);
    expect(ops).toContain('destination-in');
    // 등고선은 전부 순수 검정으로 채워지고, 그라디언트는 마지막 `fillRect` 에만 쓰인다.
    const gradAt = seq.indexOf('gradient');
    expect(gradAt).toBeGreaterThan(seq.indexOf('fill'));      // 스택을 다 그린 뒤다
    expect(seq.slice(gradAt)).toContain('fillRect');
    expect(seq.slice(0, gradAt)).not.toContain('fillRect');
    expect(seq.slice(gradAt)).not.toContain('fill');          // 곱셈 뒤로는 안 그린다
  });

  it('꼬리 그라디언트가 0 에서 끝난다 — 알파가 뚝 끊기지 않는다', () => {
    // 진단 ②/③. 옛 판본의 마지막 스톱은 `tail`(기본 0.2)이었고 그 값에서 잘렸다.
    const t = tracer();
    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    paintCell(t.spy, 100, { index: 0, profile: 'round', span }, { ...OPTS, res: 100, tail: 1 });
    expect(t.stops.length).toBeGreaterThan(0);
    const last = t.stops.filter((s) => s.t === 1);
    expect(last.length).toBeGreaterThan(0);
    for (const s of last) expect(s.a).toBe(0);
    // `tail=1`(옛 규약이면 균일한 띠)에서도 끝이 0 이다.
    expect(t.stops.filter((s) => s.t === 0).every((s) => s.a === 1)).toBe(true);
  });

  it('span 이 달라지면 밑동도 달라진다 — 상수를 박아 두면 여기서 걸린다', () => {
    const t = tracer();
    const o = { ...OPTS, res: 100, soft: 0 };
    // 긴 그림자(cot 큼) → 밑동이 전체에서 차지하는 비가 작다.
    paintCell(t.spy, 100, { index: 0, profile: 'round', span: shadowSpan(10, 2, { ux: 1, uz: 0, cot: 4 }, 999) }, o);
    const longRy = t.ellipses[0][3];
    const t2 = tracer();
    // 짧은 그림자 → 밑동 비가 크다.
    paintCell(t2.spy, 100, { index: 0, profile: 'round', span: shadowSpan(10, 2, { ux: 1, uz: 0, cot: 0.2 }, 999) }, o);
    expect(t2.ellipses[0][3]).toBeGreaterThan(longRy * 2);
  });

  it('post 골격은 폭이 좁다 — 가로등이 나무만 한 그늘을 만들지 않는다', () => {
    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    const o = { ...OPTS, res: 100, soft: 0 };
    const a = tracer(); paintCell(a.spy, 100, { index: 0, profile: 'round', span }, o);
    const b = tracer(); paintCell(b.spy, 100, { index: 0, profile: 'post', span }, o);
    expect(b.ellipses[0][2]).toBeLessThan(a.ellipses[0][2]); // post 의 가로 반경이 더 작다
  });

  it('정수리 태양은 꼬리를 안 그린다 — 그림자가 원이다', () => {
    // `blobFrac = 1` 이면 밑동만 남아야 한다. 확산분이 삐져나오면 원이 원이 아니게 된다.
    const t = tracer();
    const span = shadowSpan(10, 2, { ux: 0, uz: 1, cot: 0 }, 999);
    expect(span.blobFrac).toBeCloseTo(1, 9);
    paintCell(t.spy, 100, { index: 0, profile: 'round', span }, { ...OPTS, res: 100, soft: 0.5 });
    // 사다리꼴이 그려졌다면 `lineTo` 가 나온다. 타원의 `moveTo` 만 있어야 한다.
    const lines = t.pts.length - t.ellipses.length * 2 - t.ellipses.length; // moveTo 1 + 경계 2
    expect(lines).toBe(0);
  });

  it('`?shres` 를 낮춰도 실루엣이 무너지지 않는다 — 절대 픽셀이 없다', () => {
    // 좌표를 절대 픽셀로 박으면 낮은 res 에서 실루엣이 캔버스를 벗어나거나 사라진다.
    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    for (const res of [8, 16, 32, 64, 128]) {
      const t = tracer();
      paintCell(t.spy, res, { index: 0, profile: 'round', span }, { ...OPTS, res });
      const [cx, cy, rx, ry] = t.ellipses[0];
      // 치수가 res 에 **비례**한다 — 그것이 곧 해상도 독립이다.
      expect(rx / res, `res=${res}`).toBeCloseTo(t.ellipses[0][2] / res, 9);
      expect(cx, `res=${res}`).toBeCloseTo(res * 0.5, 6);
      expect(ry, `res=${res}`).toBeGreaterThan(0);
      for (const p of t.pts) {
        expect(p.x, `res=${res}`).toBeGreaterThanOrEqual(0);
        expect(p.x, `res=${res}`).toBeLessThanOrEqual(res);
      }
      expect(cy, `res=${res}`).toBeLessThan(res);
    }
  });

  it('겹 하나에 beginPath 가 한 번뿐이다 — 밑동이 꼬리를 지우지 않는다', () => {
    // ── 뮤테이션이 **뚫고 나간 자리**를 메운다 (2026-08-11) ────────────────────
    // `roundRect` 헬퍼에 `beginPath()` 를 되살리는 뮤테이션이 위 단언 전부를 통과했다.
    // 밑동과 꼬리가 **한 path** 가 된 뒤로 그 한 줄은 앞서 그린 사다리꼴을 통째로 버리고,
    // 증상은 "각진 물건(`box`)만 그림자에 꼬리가 없다" 로 나타난다. 스파이는 path 상태를
    // 흉내 내지 못하므로(전부 no-op) 좌표로는 원리상 못 잡는다 — **호출 순서**로 본다.
    const layers = styleOf(SHADOW_STYLE).layers;
    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);

    /** `native` 가 false 면 `roundRect` 없는 환경(폴백 경로)을 강제한다 */
    const seqOf = (profile: 'round' | 'box' | 'post', native: boolean) => {
      const seq: string[] = [];
      const base = {
        ...ctx2d,
        beginPath() { seq.push('begin'); },
        fill() { seq.push('fill'); },
      } as Record<string, unknown>;
      if (!native) delete base.roundRect;
      paintCell(base as unknown as CanvasRenderingContext2D, 100,
        { index: 0, profile, span }, { ...OPTS, res: 100 });
      return seq.join(',');
    };

    const want = Array(layers).fill('begin,fill').join(',');
    for (const profile of ['round', 'box', 'post'] as const) {
      for (const native of [true, false]) {
        expect(seqOf(profile, native), `${profile}/${native ? 'native' : 'fallback'}`).toBe(want);
      }
    }
  });

  it('룩 후보가 실제로 다른 그림을 만든다 — `?shstyle` 이 장식이 아니다', () => {
    const span = shadowSpan(10, 2, { ux: 1, uz: 0, cot: 1.5 }, 999);
    const shapeOf = (style: (typeof SHADOW_STYLES)[number]) => {
      const t = tracer();
      paintCell(t.spy, 100, { index: 0, profile: 'round', span }, {
        ...OPTS, res: 100, soft: 0.4, style,
      });
      return { layers: t.ellipses.length, alpha: t.alphas[0], pts: t.pts.length };
    };
    const s = shapeOf('soft'), c = shapeOf('contact'), d = shapeOf('diffuse');
    expect(new Set([s.layers, c.layers, d.layers]).size).toBe(3);
    expect(new Set([s.alpha, c.alpha, d.alpha]).size).toBe(3);
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
// 그렇게 설계돼 있다 — "미는 **동안** 물이 변해야 한다"). 즉 감독이 그림자 농도를 조절하는
// 내내 화면의 모든 그림자가 쪼그라들었다 자라기를 반복했을 것이다. **폐지한 실시간 그림자의
// 명멸과 증상이 같다** — 고치려던 것을 새 경로로 되살릴 뻔했다.
//
// 교훈(검수관 게시판): 판정/집행 경계를 **두 곳 이상** 새로 이을 때는 "각 경로가 개별로
// 테스트됐는가" 가 아니라 **"두 경로가 같은 진입점에서 만날 때 함께 테스트됐는가"** 를 묻는다.
describe('⑥ warp + grow 동시 연결 — 재적용이 성장을 되감지 않는다', () => {
  function setupWithGrow(duration = 0.4) {
    const { pools, calls } = stubPools();
    const opts = defaultOpts();
    const dir = { x: 0.7, y: 0.7, z: 0.14 };
    const sys = new ShadowDecalSystem({
      pools, assets: assetsFor(), parts: PARTS,
      sunDir: () => dir, time: () => 'day', opts,
    });
    const grow = new ParcelGrowSystem({ pools, duration, gate: () => true });
    const pool = createSlotPool(pools, undefined, grow.sink(), sys.warp());
    sys.attach(pool);
    return { sys, grow, pool, calls, opts, dir };
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
    // `retarget` 이 `lastPose` 를 안 고치면 반납 때 옛 자리로 줄어든다. 태양을 돌려
    // 자세를 크게 바꾼 뒤 수축시켜 그 자리를 본다.
    const { sys, grow, pool, calls, dir } = setupWithGrow();
    const h = pool.acquire('shadow:tree')!;
    pool.setTransform(h, 0, 0, 0, 0, 1, 1, 1);
    grow.update({ dt: 10, hidden: false } as never);

    dir.x = -0.7; dir.z = -0.14; // 태양 반대편으로
    sys.bake();
    const moved = last(calls, h);

    pool.release(h);
    grow.update({ dt: 0.05, hidden: false } as never);
    const shrinking = last(calls, h);
    // 줄어드는 위치가 **재굽기 후 자세**여야 한다.
    expect(shrinking.x).toBeCloseTo(moved.x, 4);
    expect(shrinking.z).toBeCloseTo(moved.z, 4);
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
