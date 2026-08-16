// 동결 저장소 — **손본 구역이 화면까지 도달하는가.**
//
// ── 왜 이 파일이 따로 있나 ──────────────────────────────────────────────────
// `world2-parcel-freeze.test.ts` 는 **빌더가 동결을 쓰는가**까지 본다(W4 ①). 그때 빌더에
// 난 문(`frozenAt`)에 무엇을 물릴지는 비어 있었고, 조립부는 그것을 **주입하지 않고**
// 있었다 — 즉 그 시점의 초록불은 «부품이 맞물린다» 였지 «화면이 바뀐다» 가 아니었다.
//
// 이 파일이 그 나머지다. 세 층:
//   ① 저장소(`systems/village-parcels.ts`) — 가변·복사·알림
//   ② 경계 — 저장소 + **실제** `PooledParcelBuilder` + **실제** `StreamingSystem`
//   ③ 배선(정적·약함) — `main.ts` 가 세 끝을 이었는가
//
// ②가 이 파일의 존재 이유다. ①만 있으면 «저장은 되는데 화면은 그대로» 가 통과한다 —
// 이 저장소가 구름 `alpha` 미소비로 이미 데인 형태이고, 그 증상은 **새로고침하면 반영돼
// 있다**여서 원인을 짐작하기 가장 어려운 축에 속한다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createVillageParcels } from '../frontend/js/world2/systems/village-parcels.js';
import { PooledParcelBuilder, type SlotPool } from '../frontend/js/world2/systems/parcel-builder.js';
import { StreamingSystem } from '../frontend/js/world2/systems/streaming.js';
import { parcelLayout, DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { parcelKey } from '../frontend/js/world2/decide/stream.js';
import type { SlotHandle } from '../frontend/js/world2/systems/instancing.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';
import type { FrameCtx } from '../frontend/js/world2/kernel.js';

function part(kind: string, x: number, z: number): PlacedPart {
  return { kind, x, y: 0, z, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 } as PlacedPart;
}

// ── ① 저장소 ────────────────────────────────────────────────────────────────

describe('동결 저장소 — 가변·복사·알림', () => {
  it('비어 있으면 언제나 null — 라이브 기본값', () => {
    const v = createVillageParcels();
    expect(v.lookup(0, 0, 'near')).toBeNull();
    expect(v.isFrozen(0, 0)).toBe(false);
    expect(v.size()).toBe(0);
  });

  it('freeze 한 것이 lookup 으로 나온다', () => {
    const v = createVillageParcels();
    v.freeze(3, -7, [part('building', 1, 2)]);
    // 캐스터 1 + 유도된 그림자 1. 그림자는 **저장되지 않고 조회 때 만들어진다**
    // (검수관 반려 B1 — 근거는 `decide/parcel-freeze.ts` 의 `withShadows` 절).
    expect(v.lookup(3, -7, 'near')).toHaveLength(2);
    expect(v.lookup(0, 0, 'near'), '다른 파셀은 그대로 계산이다').toBeNull();
    expect(v.isFrozen(3, -7)).toBe(true);
  });

  it('★ 빈 배열로 동결한 파셀은 `null` 이 아니다 — 「다 지웠다」와 「안 손댔다」', () => {
    // 뭉개면 «다 지웠는데 재방문마다 되살아난다» 가 된다.
    const v = createVillageParcels();
    v.freeze(1, 1, []);
    expect(v.lookup(1, 1, 'near'), '빈 배열은 「아무것도 놓지 마라」다').toEqual([]);
    expect(v.isFrozen(1, 1), '빈 배열로 동결한 것도 동결이다').toBe(true);
  });

  it('thaw 하면 계산으로 돌아간다', () => {
    const v = createVillageParcels();
    v.freeze(2, 2, [part('tree', 0, 0)]);
    v.thaw(2, 2);
    expect(v.lookup(2, 2, 'near')).toBeNull();
    expect(v.size()).toBe(0);
  });

  it('★ 넘긴 배열을 나중에 고쳐도 저장소가 안 바뀐다 — 입력 복사', () => {
    // 얕게 들면 편집이 «저장 전 상태» 를 만지는 것만으로 저장소가 조용히 바뀐다.
    const v = createVillageParcels();
    const mine = [part('building', 1, 1)];
    v.freeze(0, 0, mine);
    mine[0].x = 999;
    mine.push(part('tree', 5, 5));
    const got = v.lookup(0, 0, 'near')!;
    expect(got).toHaveLength(2); // 캐스터 + 유도된 그림자
    expect(got[0].x, '원소를 얕게 들었다 — 입력이 저장소로 샌다').toBe(1);
  });

  it('★ list()·partsAt() 가 낸 것을 고쳐도 저장소가 안 바뀐다 — 출력 복사', () => {
    const v = createVillageParcels();
    v.freeze(0, 0, [part('building', 1, 1)]);
    const snap = v.list();
    snap[0].parts[0].x = 999;
    snap[0].parts.push(part('tree', 0, 0));
    expect(v.lookup(0, 0, 'near')![0].x, '출력이 저장소를 가리킨다').toBe(1);
    expect(v.lookup(0, 0, 'near')).toHaveLength(2); // 캐스터 + 그림자

    const got = v.partsAt(0, 0);
    got[0].x = 777;
    expect(v.lookup(0, 0, 'near')![0].x).toBe(1);
  });

  it('partsAt — 동결이 없으면 계산값, 있으면 동결값', () => {
    const v = createVillageParcels();
    const computed = parcelLayout(3, -7, 'near');
    expect(v.partsAt(3, -7), '동결 전에는 계산 경로여야 한다').toEqual(computed);
    v.freeze(3, -7, [part('building', 9, 9)]);
    expect(v.partsAt(3, -7)).toHaveLength(1);
  });

  it('★ partsAt 은 near 로 계산한다 — 계약이 near 배열 하나만 담는다', () => {
    // mid 로 뽑아 동결하면 near 에서 보일 것이 영영 사라진다. tier 가 갈리는 날
    // 이 축이 판정을 요구한다(지금은 셋이 같아 «같다» 로만 성립한다).
    const v = createVillageParcels();
    expect(v.partsAt(3, -7)).toEqual(parcelLayout(3, -7, 'near'));
  });

  it('list() 가 계약 형태로 낸다', () => {
    const v = createVillageParcels();
    v.freeze(-2, 5, [part('building', 1, 2)]);
    expect(v.list()).toEqual([{ px: -2, pz: 5, parts: [part('building', 1, 2)] }]);
  });

  it('파셀 좌표는 정수로 접힌다 — 격자 인덱스라 소수가 의미 없다', () => {
    const v = createVillageParcels();
    v.freeze(1.7, -2.3, [part('tree', 0, 0)]);
    expect(v.list()[0]).toMatchObject({ px: 1, pz: -2 });
    expect(v.isFrozen(1, -2), '접힌 좌표로 찾을 수 있어야 한다').toBe(true);
  });

  describe('알림 — 바뀐 파셀만, 그러나 빠짐없이', () => {
    const track = () => {
      const v = createVillageParcels();
      const seen: string[] = [];
      v.onChange((px, pz) => seen.push(`${px},${pz}`));
      return { v, seen };
    };

    it('freeze·thaw 가 그 좌표로 알린다', () => {
      const { v, seen } = track();
      v.freeze(3, -7, []);
      expect(seen).toEqual(['3,-7']);
      v.thaw(3, -7);
      expect(seen).toEqual(['3,-7', '3,-7']);
    });

    it('★ 안 걸린 파셀을 thaw 하면 알리지 않는다 — 바뀐 것이 없다', () => {
      const { v, seen } = track();
      v.thaw(9, 9);
      expect(seen, '없는 것을 지우고 파셀을 다시 만들면 헛일이다').toEqual([]);
    });

    it('★ setAll 은 사라진 파셀도 알린다 — 계산으로 돌아가야 한다', () => {
      const { v, seen } = track();
      v.freeze(1, 1, []);
      seen.length = 0;
      v.setAll([{ px: 2, pz: 2, parts: [] }]);
      expect(new Set(seen), '지운 동결이 화면에 남는다').toEqual(new Set(['1,1', '2,2']));
      expect(v.isFrozen(1, 1)).toBe(false);
      expect(v.isFrozen(2, 2)).toBe(true);
    });

    it('setAll 이 빈 목록이고 이전도 없으면 아무도 안 부른다', () => {
      const { v, seen } = track();
      v.setAll([]);
      expect(seen).toEqual([]);
    });

    it('★ 한 리스너가 던져도 나머지가 받는다', () => {
      // 알림 실패로 저장까지 잃으면 «화면만 안 바뀐» 상태보다 나쁘다.
      const v = createVillageParcels();
      const seen: string[] = [];
      v.onChange(() => { throw new Error('첫 리스너가 죽었다'); });
      v.onChange((px, pz) => seen.push(`${px},${pz}`));
      expect(() => v.freeze(0, 0, [])).not.toThrow();
      expect(seen).toEqual(['0,0']);
    });
  });
});

// ── ② 경계 — 저장소 · 실제 빌더 · 실제 스트리밍 ──────────────────────────────
//
// **여기가 이 파일의 요점이다.** 위 절은 전부 저장소 안에서만 참이고, 화면까지 오는
// 경로에는 세 경계가 있다: 저장소→빌더(`frozenAt`) · 저장소→스트리밍(`onChange`) ·
// 스트리밍→빌더(`invalidate` 뒤 재빌드). 셋 중 하나만 끊겨도 «저장은 됐는데 화면은
// 그대로» 가 되고, 그 증상은 새로고침하면 사라져서 원인을 짚기 어렵다.

const CELL = DEFAULT_LAYOUT.cellX;
/** 동결 파츠에 쓸 알아볼 수 있는 로컬 좌표. 계산 경로가 낼 확률이 없는 값이면 된다 */
const MARK = { x: 7.25, z: 3.5 };

interface LiveSlot { kind: string; x: number; z: number }

/** 살아 있는 슬롯을 추적하는 풀. `release` 된 것은 즉시 빠진다 */
function trackingPool(): { pool: SlotPool; live: Map<SlotHandle, LiveSlot> } {
  const live = new Map<SlotHandle, LiveSlot>();
  let n = 0;
  const pool: SlotPool = {
    acquire(key) {
      const h = { key, index: n++ } as unknown as SlotHandle;
      live.set(h, { kind: key, x: NaN, z: NaN });
      return h;
    },
    setTransform(h, x, _y, z) {
      const r = live.get(h);
      if (r) { r.x = x; r.z = z; }
    },
    setTone() { /* 색은 이 축과 무관하다 */ },
    release(h) { live.delete(h); },
  };
  return { pool, live };
}

function rig() {
  const village = createVillageParcels();
  const { pool, live } = trackingPool();
  const builder = new PooledParcelBuilder({
    pool,
    cellX: CELL, cellZ: DEFAULT_LAYOUT.cellZ,
    frozenAt: (px, pz, tier) => village.lookup(px, pz, tier),
  });
  const sys = new StreamingSystem({
    builder,
    cellX: CELL, cellZ: DEFAULT_LAYOUT.cellZ,
    getPosition: () => ({ x: 0, z: 0 }),
    // 지형을 끈다 — 이 파일이 보는 것은 동결 경로이지 강이 어디 있는가가 아니다.
    blocked: () => false,
  });
  // **조립부와 같은 배선.** 이 한 줄이 `main.ts` 의 `village.onChange(...)` 에 대응한다.
  village.onChange((px, pz) => { sys.invalidate(px, pz); });

  const ctx = (frame: number): FrameCtx => ({
    dt: 0.0001, ageMs: 1000, frame, hidden: false, resumed: false,
  });
  let frame = 0;
  const settle = (n = 40) => { for (let i = 0; i < n; i++) sys.update(ctx(++frame)); };
  /** 동결 표식을 단 슬롯이 화면(= 살아 있는 슬롯)에 있는가 */
  const marked = () => [...live.values()].filter((s) => s.x === MARK.x && s.z === MARK.z);

  return { village, sys, live, settle, marked };
}

describe('경계 — 동결이 화면까지 온다', () => {
  it('사전 조건: 원점 파셀이 계산 경로에서 파츠를 낸다', () => {
    // 이 단언이 깨지면 아래 축들이 **빈 검사**가 된다(0 → 0 은 언제나 같다).
    expect(parcelLayout(0, 0, 'near').length).toBeGreaterThan(0);
  });

  it('★ 이미 떠 있는 파셀도 동결을 걸면 다시 만들어진다', () => {
    const { village, settle, marked, live } = rig();
    settle();
    const before = live.size;
    expect(before, '파셀이 하나도 안 떴다 — 아래 판정이 성립하지 않는다').toBeGreaterThan(0);
    expect(marked(), '표식이 계산 경로에서 나왔다 — 다른 값을 골라라').toHaveLength(0);

    village.freeze(0, 0, [part('building', MARK.x, MARK.z)]);
    settle();

    expect(
      marked(),
      '★ 동결이 화면에 안 왔다 — `frozenAt` 주입·`onChange` 배선·`invalidate` 중 하나가 끊겼다',
    ).toHaveLength(2); // 건물 + 그 그림자(같은 자리)
    expect(
      live.size,
      '동결(1개)이 원래 배치를 대신해야 한다 — 늘었다면 옛 슬롯이 안 반납된 것이다',
    ).toBeLessThan(before);
  });

  it('★ 빈 배열로 동결하면 그 파셀이 비고, thaw 하면 돌아온다', () => {
    const { village, settle, live } = rig();
    settle();
    const before = live.size;

    village.freeze(0, 0, []);
    settle();
    const emptied = live.size;
    expect(emptied, '★ 다 지웠는데 파셀이 그대로다').toBeLessThan(before);

    village.thaw(0, 0);
    settle();
    expect(live.size, '★ 동결을 풀었는데 계산 배치가 안 돌아왔다').toBe(before);
  });

  it('★ 손대지 않은 파셀은 하나도 안 바뀐다 — 경계는 파셀 단위다', () => {
    const { village, settle, live } = rig();
    settle();
    const snapshot = [...live.values()]
      .map((s) => `${s.kind}@${s.x.toFixed(3)},${s.z.toFixed(3)}`).sort();

    // 안 떠 있는 먼 파셀을 동결한다 — 화면에 아무 변화가 없어야 한다.
    village.freeze(50, 50, [part('building', MARK.x, MARK.z)]);
    settle();
    const after = [...live.values()]
      .map((s) => `${s.kind}@${s.x.toFixed(3)},${s.z.toFixed(3)}`).sort();
    expect(after, '★ 남의 파셀 동결이 화면을 바꿨다 — 「파라미터가 곧 공간」이 통째로 깨진다').toEqual(snapshot);
  });

  it('setAll 로 읽어들인 동결도 같은 경로를 탄다 (파일 로드)', () => {
    const { village, settle, marked } = rig();
    settle();
    village.setAll([{ px: 0, pz: 0, parts: [part('building', MARK.x, MARK.z)] }]);
    settle();
    expect(marked(), '★ 파일에서 읽은 동결이 화면에 안 왔다').toHaveLength(2);
  });

  it('안 떠 있는 파셀의 invalidate 는 false — 할 일이 없다', () => {
    const { sys, settle } = rig();
    settle();
    expect(sys.invalidate(999, 999)).toBe(false);
    expect(sys.invalidate(0, 0), '떠 있는 파셀은 실제로 버려진다').toBe(true);
  });

  it('★ 빌더와 스트리밍이 **같은 파셀 키 형식**을 쓴다 (형식 소유는 decide/stream.ts)', () => {
    // 왜 이 축이 여기 있나: `invalidate` 는 키로 파셀을 찾는다. 두 쪽이 형식을 각자
    // 적으면 **지금은 아무 증상이 없다가**(스트리밍이 자기 맵 키를 따로 만든다) 형식이
    // 바뀌는 날 «편집이 어떤 파셀에는 안 먹는다» 로만 드러난다.
    //
    // ⚠ **뮤테이션 실측(2026-08-13): 빌더를 리터럴로 되돌리는 것만으로는 이 축이
    // 안 깨진다 — 지금 두 형식이 같기 때문이다.** 깨지는 것은 `parcelKey` 의 형식을
    // 바꿨을 때이고, 그것이 정확히 이 축이 지키려는 것이다(형식이 한 곳에서만 바뀐다).
    const { pool } = trackingPool();
    const b = new PooledParcelBuilder({ pool, cellX: CELL, cellZ: DEFAULT_LAYOUT.cellZ });
    expect(b.build(3, -7, 'near').key).toBe(parcelKey(3, -7));
    expect(b.build(0, 0, 'near').key).toBe(parcelKey(0, 0));
  });

  it('invalidate 는 프레임 예산 밖에서 build 하지 않는다 — 버리기만 한다', () => {
    // 여기서 곧바로 만들면 «건물을 옮길 때마다 한 프레임 튄다» 가 된다.
    const { sys, settle, live } = rig();
    settle();
    const before = live.size;
    sys.invalidate(0, 0);
    expect(live.size, '★ invalidate 가 그 자리에서 다시 만들었다').toBeLessThan(before);
  });
});

// ── ③ 배선 (정적·약함) ──────────────────────────────────────────────────────
//
// ②는 배선을 **테스트가 직접** 물린다(`village.onChange(...)`). 그래서 `main.ts` 의
// 같은 줄이 지워져도 ②는 전부 초록이다. 그 구멍을 좁힌다 — `world2-streaming-system.
// test.ts` 의 배선 절과 같은 성격이고 같은 한계를 갖는다(**글자가 있는지만 본다**).

describe('배선 — main.ts 가 세 끝을 이었는가 (정적·약함)', () => {
  const src = readFileSync('frontend/js/world2/main.ts', 'utf8');

  it('저장소를 만들어 빌더에 조회를 주입한다', () => {
    expect(src, '저장소 생성이 없다').toMatch(/createVillageParcels\s*\(/);
    expect(src, 'frozenAt 주입이 없다 — 빌더는 영영 계산만 한다')
      .toMatch(/frozenAt\s*:\s*\(px,\s*pz,\s*tier\)\s*=>\s*village\.lookup\(/);
  });

  it('동결 변경을 스트리밍 재빌드에 잇는다', () => {
    expect(src, 'onChange→invalidate 배선이 없다 — 편집이 화면에 안 온다')
      .toMatch(/village\.onChange\(\s*\(px,\s*pz\)\s*=>\s*\{\s*streaming\?\.invalidate\(px,\s*pz\)/);
  });

  it('기능 계약으로 저장소를 넘긴다', () => {
    expect(src, 'env.village 가 없다 — 오버레이가 파일을 읽어도 앉힐 자리가 없다')
      .toMatch(/pools:\s*pools!,\s*village/);
  });
});

describe('배선 — 오버레이가 파일과 저장소를 잇는가 (정적·약함)', () => {
  const src = readFileSync('frontend/js/world2/features/overlay.ts', 'utf8');

  it('읽은 parcels 를 저장소에 앉힌다', () => {
    // ⚠ **인자 이름이 아니라 「앉히는가」를 본다**(2026-08-16 정정). 첫 판본은
    // `setAll(overlay.parcels)` 를 글자 그대로 요구했고, W8-3 이 여러 작가 문서를
    // 합치면서 인자가 `plan.parcels` 가 되자 **빨간불이 났다** — 목적(배포된 동결이
    // 화면에 온다)은 그대로인데 변수명에 묶여 있었던 것이다.
    //
    // 「한 번만 부르는가」·「합쳐진 것을 넣는가」는 `world2-multi-wiring.test.ts` 가
    // 더 정확히 본다. 여기는 **호출 자체가 사라지지 않는 것**까지만 지킨다.
    expect(src, 'setAll 이 없다 — 배포된 동결이 화면에 안 온다')
      .toMatch(/env\.village\.setAll\(/);
  });

  it('내보내기에 parcels 를 담는다', () => {
    expect(src, 'toRaw 가 parcels 를 빠뜨린다 — 편집한 마을이 저장되지 않는다')
      .toMatch(/parcels:\s*env\.village\.list\(\)/);
  });

  it('편집에 마을 문 둘을 연다 (W4 ②-c)', () => {
    // ⚠ 이 축이 없으면 «집기» 를 재는 행위 테스트가 전부 초록인데 **실제 세션에서는
    // 아무것도 안 집힌다** — 그쪽은 자기 host 를 만들어 문을 직접 물리기 때문이다.
    // N10 뮤테이션(문을 `null` 로)이 0 failed 로 그 구멍을 드러냈다(2026-08-13).
    expect(src, '레이캐스트 문이 안 열렸다').toMatch(/instances:\s*env\.pools/);
    expect(src, '배치 조회 문이 안 열렸다').toMatch(/village:\s*env\.village/);
  });
});

// ── 그림자가 캐스터를 따라간다 (검수관 반려 B1, 2026-08-13) ─────────────────
//
// **이 절은 반려에서 생겼다.** W4 ④ 는 *"그림자는 손댈 것이 없었다 — `parcel-layout.ts`
// 에 `shadow:` 가 한 건도 없다"* 라는 grep 결과로 범위를 줄였는데, 그 문장은 참이면서
// 결론이 거짓이었다: `PARTS = [...BASE, ...shadowParts(BASE)]` 를 순회하므로 배치에
// 그림자가 **대량으로** 들어간다(검수관 실측 11×11 파셀 3,716개 중 1,238개, 33%).
//
// 그 결과 편집이 캐스터만 옮기고 짝 그림자는 옛 자리에 남았다 — 게이트 6종·45축·
// 뮤테이션 5종 전부가 이 클래스를 안 봐서 통과했다. **못 잰 것이 통과로 적힌** 사례다.
//
// 처방은 짝 맞추기가 아니라 **저장하지 않기**다(자세가 두 벌이면 반드시 갈라진다).
// 그래서 여기서 재는 것은 «짝이 맞는가» 가 아니라 **«그림자가 캐스터에서 나오는가»** 다.

const shadowsOf = (parts: readonly PlacedPart[]) => parts.filter((p) => p.kind.startsWith('shadow:'));
const castersOf = (parts: readonly PlacedPart[]) => parts.filter((p) => !p.kind.startsWith('shadow:'));

describe('그림자는 저장되지 않고 유도된다', () => {
  it('★ 저장에는 그림자가 없다 — 내보내기 파일에도 안 나간다', () => {
    const v = createVillageParcels();
    // 편집이 스냅샷을 뜨면 계산 배치가 그대로 오고, 거기엔 그림자가 섞여 있다.
    const snap = v.partsAt(3, -7);
    expect(shadowsOf(snap).length, '전제가 깨졌다 — 계산 배치에 그림자가 없다').toBeGreaterThan(0);

    v.freeze(3, -7, snap);
    const stored = v.list()[0].parts;
    expect(shadowsOf(stored), '★ 그림자가 저장됐다 — 캐스터를 옮기면 짝이 옛 자리에 남는다')
      .toHaveLength(0);
    expect(castersOf(stored).length, '캐스터까지 사라졌다').toBe(castersOf(snap).length);
  });

  it('★ 조회에는 그림자가 붙는다 — 손본 구역만 그림자가 사라지면 안 된다', () => {
    const v = createVillageParcels();
    v.freeze(0, 0, [part('building', 1, 2)]);
    const got = v.lookup(0, 0, 'near')!;
    expect(shadowsOf(got), '★ 동결한 파셀에 그림자가 안 붙었다').toHaveLength(1);
    expect(shadowsOf(got)[0].kind).toBe('shadow:building');
  });

  it('★ 캐스터를 옮기면 그림자가 **그 자리로** 온다 — 반려된 결함 그 자체', () => {
    const v = createVillageParcels();
    v.freeze(0, 0, [part('building', 1, 2)]);
    // 감독이 건물을 옮긴다(편집 경로가 하는 일 = 캐스터를 고쳐 다시 freeze).
    v.freeze(0, 0, [part('building', 30, 40)]);
    const sh = shadowsOf(v.lookup(0, 0, 'near')!);
    expect(sh, '그림자가 통째로 사라졌다').toHaveLength(1);
    expect(
      [sh[0].x, sh[0].z],
      '★ 옮겼는데 그림자가 옛 자리에 남았다 — 유령 그림자(검수관 B1 실측 형태)',
    ).toEqual([30, 40]);
  });

  it('★ 캐스터를 지우면 그림자도 사라진다 — 그림자만 남지 않는다', () => {
    const v = createVillageParcels();
    v.freeze(0, 0, [part('building', 1, 2), part('tree', 9, 9)]);
    expect(shadowsOf(v.lookup(0, 0, 'near')!)).toHaveLength(2);
    // 건물만 지운다.
    v.freeze(0, 0, [part('tree', 9, 9)]);
    const sh = shadowsOf(v.lookup(0, 0, 'near')!);
    expect(sh, '★ 지운 건물의 그림자가 남았다').toHaveLength(1);
    expect(sh[0].kind).toBe('shadow:tree');
  });

  it('★ 그림자가 붙은 것을 다시 저장해도 배로 늘지 않는다 — 왕복 안정', () => {
    // 편집은 `lookup` 이 아니라 `partsAt` 을 쓰지만, 파일을 읽고(그림자가 섞여 있을 수
    // 있다) 다시 쓰는 경로가 있으므로 멱등이어야 한다.
    const v = createVillageParcels();
    v.freeze(0, 0, [part('building', 1, 2)]);
    const withSh = v.lookup(0, 0, 'near')!; // 캐스터 1 + 그림자 1
    v.freeze(0, 0, withSh);
    expect(v.list()[0].parts, '★ 저장에 그림자가 섞였다').toHaveLength(1);
    expect(v.lookup(0, 0, 'near'), '★ 그림자가 배로 늘었다').toHaveLength(2);
  });

  it('그림자를 안 드리우는 종류에는 안 붙는다', () => {
    const v = createVillageParcels();
    v.freeze(0, 0, [part('ground', 0, 0)]);
    expect(shadowsOf(v.lookup(0, 0, 'near')!), '★ 바닥에 그림자가 생겼다').toHaveLength(0);
  });

  it('★ 파일에서 읽은 것에 그림자가 섞여 있어도 걷어낸다 (setAll)', () => {
    const v = createVillageParcels();
    v.setAll([{ px: 0, pz: 0, parts: [part('building', 1, 2), part('shadow:building', 99, 99)] }]);
    const stored = v.list()[0].parts;
    expect(stored, '★ 파일의 그림자가 그대로 저장됐다 — 옛 자리에 고정된다').toHaveLength(1);
    const sh = shadowsOf(v.lookup(0, 0, 'near')!);
    expect([sh[0].x, sh[0].z], '★ 파일에 적힌 옛 그림자 좌표가 살아남았다').toEqual([1, 2]);
  });
});
