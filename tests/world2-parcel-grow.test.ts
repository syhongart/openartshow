// 스케일 인(성장 등장) — **부품이 완성 크기로 태어나는 프레임이 정말 없는가.**
//
// 색 페이드가 안개 0% 거리에서 무력하다는 것이 이 시스템의 존재 이유이므로
// (`systems/parcel-grow.ts` 머리), 검사도 그 성질을 겨눈다: place 직후 프레임에
// 이미 작아져 있어야 하고(팝 프레임 0), 끝나면 정확히 완성 자세여야 하며(영구 축소
// 없음), 꺼져 있으면 아무것도 안 만져야 한다(종전 동작).
//
// 실제 `createSlotPool` + 실제 `ParcelGrowSystem` 을 스텁 풀 위에서 돌린다 — 경계를
// 건너는 지점(setTransform 순서·release 순서)은 어느 단위 테스트에도 안 걸린다.

import { describe, it, expect } from 'vitest';
import { ParcelGrowSystem } from '../frontend/js/world2/systems/parcel-grow.js';
import { createSlotPool } from '../frontend/js/world2/systems/parcel-assets.js';
import type { InstancePools, SlotHandle } from '../frontend/js/world2/systems/instancing.js';

interface Call { x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number }

/** setTransform 호출을 핸들별로 기록하는 스텁 풀 */
function stubPools() {
  const calls = new Map<SlotHandle, Call[]>();
  const pools = {
    acquire: (key: string) => ({ key, index: 1 } as SlotHandle),
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

const T = { x: 10, y: 0, z: -20, ry: 0.5, sx: 4, sy: 12, sz: 5 };

function setup(duration = 0.4, gateOpen = true) {
  const { pools, calls } = stubPools();
  const grow = new ParcelGrowSystem({ pools, duration, gate: () => gateOpen });
  const pool = createSlotPool(pools, undefined, grow.sink());
  const h = pool.acquire('building')!;
  pool.setTransform(h, T.x, T.y, T.z, T.ry, T.sx, T.sy, T.sz);
  return { grow, pool, h, calls };
}

const last = (calls: Map<SlotHandle, Call[]>, h: SlotHandle) => {
  const a = calls.get(h)!;
  return a[a.length - 1];
};

describe('성장 등장 — 팝 프레임이 없다', () => {
  it('place 직후, update 를 기다리지 않고 이미 작다', () => {
    // 이 단언이 이 파일의 핵심이다. 첫 프레임을 기다리면 완성 크기가 한 번 렌더된다 —
    // 고치려는 팝 그 자체다.
    const { h, calls } = setup();
    const c = last(calls, h);
    expect(c.sx).toBeLessThan(T.sx * 0.05);
    expect(c.sy).toBeLessThan(T.sy * 0.05);
    // 위치·회전은 처음부터 완성값 — 자라는 것은 크기뿐이다.
    expect(c.x).toBe(T.x);
    expect(c.ry).toBe(T.ry);
  });

  it('중간 프레임에는 중간 크기다', () => {
    const { grow, h, calls } = setup(0.4);
    grow.update({ dt: 0.2, hidden: false } as never);
    const c = last(calls, h);
    expect(c.sy).toBeGreaterThan(T.sy * 0.2);
    expect(c.sy).toBeLessThan(T.sy);
  });

  it('끝나면 정확히 완성 자세이고 목록에서 빠진다 — 영구 축소가 없다', () => {
    // 이 단언이 없으면 마지막 보간값(1 언저리)으로 영원히 남아도 아무도 모른다.
    // 도시 전체가 0.1% 씩 작아진 채 굳는 결함은 육안으로 절대 안 잡힌다.
    const { grow, h, calls } = setup(0.4);
    grow.update({ dt: 10, hidden: false } as never);
    expect(last(calls, h)).toEqual(T);
    expect(grow.pending).toBe(0);
  });

  it('duration 0 이면 아무것도 안 만진다 — ?grow=0 = 종전 동작', () => {
    const { h, calls } = setup(0);
    // 빌더의 setTransform 1회뿐 — grow 가 덧쓴 호출이 없다.
    expect(calls.get(h)!.length).toBe(1);
    expect(last(calls, h)).toEqual(T);
  });

  it('초기 충전 중(gate 닫힘)에는 걸지 않는다', () => {
    const { h, calls, grow } = setup(0.4, false);
    expect(calls.get(h)!.length).toBe(1);
    expect(last(calls, h)).toEqual(T);
    expect(grow.pending).toBe(0);
  });

  it('밖에서 죽은 핸들은 update 가 걷어낸다 — 죽은 슬롯을 만지지 않는다', () => {
    // `pool.release` 경로는 이제 수축을 거친다(아래 절). 여기서 보는 것은 그 경로를
    // **안 탄** 죽음이다 — 풀이 직접 반납해 index=-1 이 된 핸들을 계속 만지면
    // 재사용된 남의 슬롯을 칠한다.
    const { grow, h, calls } = setup(0.4);
    const before = calls.get(h)!.length;
    (h as { index: number }).index = -1;
    grow.update({ dt: 0.1, hidden: false } as never);
    expect(grow.pending).toBe(0);
    expect(calls.get(h)!.length).toBe(before); // 죽은 뒤 setTransform 0회
  });

  it('슬롯 재사용이면 처음부터 다시 자란다', () => {
    const { grow, pool, h, calls } = setup(0.4);
    grow.update({ dt: 0.39, hidden: false } as never); // 거의 다 자람
    pool.setTransform(h, T.x, T.y, T.z, T.ry, T.sx, T.sy, T.sz); // 같은 슬롯에 재배치
    const c = last(calls, h);
    expect(c.sy).toBeLessThan(T.sy * 0.05); // 다시 시작 크기
  });
});

describe('수축 소멸 — 사라질 때도 팝이 없다', () => {
  it('release 는 즉시 반납되지 않고, 줄어든 뒤 반납된다', () => {
    // 이것이 이 절의 핵심이다. 즉시 반납되면(index=-1) 부품이 그 프레임에 사라진다 —
    // 감독 마크가 잡은 tier강등 41.6m 의 반짝임 그 자체다.
    const { grow, pool, h, calls } = setup(0.4);
    grow.update({ dt: 10, hidden: false } as never); // 다 자란 상태
    pool.release(h);
    expect(h.index).toBeGreaterThanOrEqual(0); // 아직 살아 있다 — 반납이 미뤄졌다
    grow.update({ dt: 0.1, hidden: false } as never);
    const mid = last(calls, h);
    expect(mid.sy).toBeLessThan(T.sy); // 줄어드는 중
    expect(mid.sy).toBeGreaterThan(0);
    grow.update({ dt: 10, hidden: false } as never);
    expect(h.index).toBe(-1); // 이제 반납됐다
    expect(grow.pending).toBe(0);
  });

  it('shrinkSecs 가 수축 속도를 실제로 바꾼다 — ?shrink= 노브의 집행 검사', () => {
    // 같은 경과 시간(0.2s)에서: 기본(0.25s)은 거의 다 줄었고, 2.0s 는 아직 크다.
    // 이 단언이 없으면 노브가 옵션만 받고 안 쓰는 no-op 이어도 아무도 모른다.
    const mkWith = (shrinkSecs?: number) => {
      const { pools, calls } = stubPools();
      const grow = new ParcelGrowSystem({ pools, duration: 0.4, shrinkSecs, gate: () => true });
      const pool = createSlotPool(pools, undefined, grow.sink());
      const h = pool.acquire('building')!;
      pool.setTransform(h, T.x, T.y, T.z, T.ry, T.sx, T.sy, T.sz);
      grow.update({ dt: 10, hidden: false } as never); // 다 자란 상태
      pool.release(h);
      grow.update({ dt: 0.2, hidden: false } as never);
      return last(calls, h).sy / T.sy;
    };
    const fast = mkWith(undefined); // 기본 0.25s — 0.2s 면 수축 80%+ 진행
    const slow = mkWith(2.0);       // 노브 2.0s — 0.2s 면 수축 10% 구간
    expect(slow).toBeGreaterThan(fast);
    expect(slow).toBeGreaterThan(0.5); // 2.0s 수축이 0.2s 만에 절반 아래로 내려가면 안 쓴 것
  });

  it('shrinkEase 가 수축 곡선을 실제로 바꾼다 — ?shrinkease= 노브의 집행 검사', () => {
    // 같은 시간(수축 25% 지점)에서: 'out'(종전)은 초반 가속이라 많이 줄었고,
    // 'in'(초반 느림)은 아직 거의 그대로여야 한다. 등장 ease 와 분리됐다는 증거다.
    const mkWith = (shrinkEase?: 'in' | 'out') => {
      const { pools, calls } = stubPools();
      const grow = new ParcelGrowSystem({ pools, duration: 0.4, shrinkSecs: 1.0, shrinkEase, gate: () => true });
      const pool = createSlotPool(pools, undefined, grow.sink());
      const h = pool.acquire('building')!;
      pool.setTransform(h, T.x, T.y, T.z, T.ry, T.sx, T.sy, T.sz);
      grow.update({ dt: 10, hidden: false } as never);
      pool.release(h);
      grow.update({ dt: 0.25, hidden: false } as never);
      return last(calls, h).sy / T.sy;
    };
    const eased = mkWith('in');
    const legacy = mkWith('out');
    expect(eased).toBeGreaterThan(legacy);
    expect(eased).toBeGreaterThan(0.85); // t=0.25 의 in(t²)=6.25% 감쇠 — 90%+ 남아야 맞다
  });

  it('자라다 만 채 죽으면 그 크기에서 줄어든다 — 커졌다 죽는 역팝이 없다', () => {
    const { grow, pool, h, calls } = setup(0.4);
    grow.update({ dt: 0.1, hidden: false } as never); // 일부만 자람
    const grown = last(calls, h).sy;
    pool.release(h);
    grow.update({ dt: 0.01, hidden: false } as never);
    expect(last(calls, h).sy).toBeLessThanOrEqual(grown * 1.01);
  });

  it('기능이 꺼져 있으면(duration 0) 즉시 반납 — 종전 동작', () => {
    const { pool, h } = setup(0);
    pool.release(h);
    expect(h.index).toBe(-1);
  });

  it('dispose 는 수축 중이던 반납을 흘려보낸다 — 슬롯이 영원히 점유되지 않는다', () => {
    const { grow, pool, h } = setup(0.4);
    grow.update({ dt: 10, hidden: false } as never);
    pool.release(h);
    expect(h.index).toBeGreaterThanOrEqual(0);
    grow.dispose();
    expect(h.index).toBe(-1);
  });
});

// ── 성장 중 편집 드래그 (W5 E2.5 · 팀장 결정2 조건① 실측) ───────────────────
//
// 팀장 조건 원문(2026-08-13, `docs/BOARD.md`): *"성장 중 파츠 드래그 1케이스 실측 —
// `parcel-grow.ts:151` 이 자기 `retarget`(:194, curScale 유지)을 어댑터로 공급하므로
// **편집의 매 프레임 호출이 그 구현을 경유하는지 명시**."*
//
// ⚠ **처음엔 이것을 코드 리딩으로만 확인하고 브리프에 적었다** — 검수관 반려 B1
// (2026-08-13): *"이 저장소가 반복해서 이름 붙인 함정(참인 문장에서 성립하지 않는
// 결론을 뽑는 것)을 코드 리딩만으로 재현하지 않는다. 팀장이 «실측»을 명시했는데
// 구조 논증으로 대체된 것 자체가 조건 미해소다."* 맞는 지적이라 축으로 만든다.
//
// 왜 이 창이 실제로 열려 있나: 파셀은 카메라가 다가가면 **자라면서** 나타나고, 감독은
// 그 몇 백 ms 안에 건물을 집어 밀 수 있다. 편집이 `place` 를 타면 그 순간 부품이
// `START_SCALE`(0.02)로 되감기고, 드래그하는 내내 그 되감기가 반복된다 —
// 폐지한 실시간 그림자의 명멸과 같은 증상이다(검수관 반려 2026-08-11 이 그것을
// 그림자 재베이킹에서 실측했고, 편집은 **같은 문을 세 번째로 쓰는 소비자**다).
describe('성장 중에 편집이 자세를 밀어도 되감기지 않는다', () => {
  it('★ 자라던 배수를 유지한 채 **새 자세로** 계속 자란다', () => {
    const { grow, pool, h, calls } = setup(0.4);
    grow.update({ dt: 0.2, hidden: false } as never); // 절반쯤 자랐다
    const mid = last(calls, h).sy;
    expect(mid, '중간 크기여야 이 축이 의미가 있다').toBeGreaterThan(T.sy * 0.2);
    expect(mid).toBeLessThan(T.sy);

    // 편집이 그 프레임에 건물을 +10m 민다 — `SlotPool.retarget` 이 그 문이다.
    pool.retarget!(h, T.x + 10, T.y, T.z, T.ry, T.sx, T.sy, T.sz);

    const after = last(calls, h);
    expect(after.x, '★ 새 자리로 안 갔다 — 편집이 화면에 안 보인다').toBe(T.x + 10);
    expect(after.sy, '★ 성장이 START_SCALE 로 되감겼다 — 드래그 내내 부품이 쪼그라든다')
      .toBeCloseTo(mid, 6);
    expect(grow.pending, '성장이 취소되면 안 된다 — 계속 자라야 한다').toBe(1);
  });

  it('★ 그대로 두면 **새 자세의** 완성 크기로 끝난다 — 목표가 갱신됐다', () => {
    const { grow, pool, h, calls } = setup(0.4);
    grow.update({ dt: 0.2, hidden: false } as never);
    pool.retarget!(h, T.x + 10, T.y, T.z, T.ry, T.sx, T.sy, T.sz);
    grow.update({ dt: 10, hidden: false } as never);
    expect(last(calls, h), '★ 성장이 끝나며 옛 자리로 되돌아갔다')
      .toEqual({ ...T, x: T.x + 10 });
  });

  it('★ 다 자란 뒤에 밀면 완성 크기 그대로 옮겨간다 — 다시 자라지 않는다', () => {
    const { grow, pool, h, calls } = setup(0.4);
    grow.update({ dt: 10, hidden: false } as never); // 완성
    expect(grow.pending).toBe(0);
    pool.retarget!(h, T.x + 10, T.y, T.z, T.ry, T.sx, T.sy, T.sz);
    expect(last(calls, h), '★ 다 자란 것을 밀었더니 크기가 흔들렸다')
      .toEqual({ ...T, x: T.x + 10 });
    expect(grow.pending, '★ 다 자란 것이 다시 자라기 시작했다').toBe(0);
  });

  it('★ 수축 시작 자세도 **옮긴 자리**로 갱신된다 — 반납 때 옛 자리로 안 튄다', () => {
    // 팀장이 (다)안(`pools.setTransform` 직접 호출)을 기각한 근거 중 하나가 이것이다:
    // *"`lastPose` 를 안 갱신해 다 자란 슬롯도 반납(수축) 때 옛 자리로 튄다."*
    // 그 성질이 `retarget` 경로에서는 지켜지는지 본다.
    const { grow, pool, h, calls } = setup(0.4);
    grow.update({ dt: 10, hidden: false } as never);
    pool.retarget!(h, T.x + 10, T.y, T.z, T.ry, T.sx, T.sy, T.sz);
    pool.release(h); // 스트리밍이 그 파셀을 걷는다 → 수축이 시작된다
    grow.update({ dt: 0.05, hidden: false } as never);
    expect(last(calls, h).x, '★ 반납이 시작되자 건물이 옛 자리로 튀었다').toBe(T.x + 10);
  });
});
