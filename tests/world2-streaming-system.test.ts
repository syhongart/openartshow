// world2 StreamingSystem 집행 계층 테스트 — 가짜 빌더로 부수효과를 관찰한다.
//
// 판정(무엇을 원하는가)은 world2-stream.test.ts가 본다. 여기서는 **집행**만 본다:
// 만든 것을 반드시 반납하는가, 예산을 지키는가, tier 변경이 재생성으로 새지 않는가.
// 마지막 항목이 이 아키텍처의 존재 이유다 — 파셀 승격 때 머티리얼 19개·지오 44개가
// 새로 태어나던 것이 스파이크의 원인이었다.

import { describe, it, expect } from 'vitest';
import { StreamingSystem, type ParcelBuilder, type ParcelHandle } from '../frontend/js/world2/systems/streaming.js';
import type { FrameCtx } from '../frontend/js/world2/kernel.js';
import type { Tier } from '../frontend/js/world2/decide/lod.js';

/** 호출을 세는 가짜 빌더. retierable=false면 재생성 경로를 강제한다. */
function fakeBuilder(retierable = true) {
  const log = { build: 0, release: 0, retier: 0 };
  const live = new Set<string>();
  const builder: ParcelBuilder = {
    build(px, pz, tier) {
      log.build++;
      const k = `${px},${pz}`;
      live.add(k);
      return { key: k, tier };
    },
    release(h) { log.release++; live.delete(h.key); },
    retier(h, tier) {
      log.retier++;
      return retierable ? { key: h.key, tier } : null;
    },
    costOf(tier) { return tier === 'near' ? 3 : tier === 'mid' ? 2 : 1; },
  };
  return { builder, log, live };
}

const ctx = (o: Partial<FrameCtx> = {}): FrameCtx => ({
  dt: 1 / 60, ageMs: 1000, frame: 1, hidden: false, resumed: false, ...o,
});

/** 예산이 넉넉한 프레임을 반복해 스트리밍이 안정될 때까지 돌린다 */
function settle(sys: StreamingSystem, n = 40) {
  for (let i = 0; i < n; i++) sys.update(ctx({ dt: 0.0001, frame: i + 1 }));
}

const make = (over: Partial<Parameters<typeof mkSys>[0]> = {}) => mkSys(over);
function mkSys(o: {
  builder?: ParcelBuilder;
  pos?: { x: number; z: number };
  markDirty?: () => void;
} = {}) {
  const fb = fakeBuilder();
  const pos = o.pos ?? { x: 0, z: 0 };
  const sys = new StreamingSystem({
    builder: o.builder ?? fb.builder,
    cellX: 32, cellZ: 32,
    getPosition: () => pos,
    markDirty: o.markDirty,
    // 이 파일은 **스트리밍 기계**를 본다 — 로드·반납·누수·예산. 그 성질은 물이 있든
    // 없든 같아야 하므로 지형을 끈다. 실제 월드는 이 옵션을 주지 않아 물이 걸린다.
    // (끄지 않으면 원점 두 파셀 옆 강 때문에 13이 11이 되고, 밴드가 바뀐 것도 강이
    // 옮겨진 것도 똑같은 실패로 보인다.)
    blocked: () => false,
  });
  return { sys, fb, pos };
}

describe('StreamingSystem — 부팅 충전', () => {
  it('원하는 파셀을 전부 만들고 나면 안정된다', () => {
    const { sys, fb } = make();
    settle(sys);
    expect(sys.stats().loaded).toBe(13); // near 5 + mid 4 + far 4
    expect(sys.ready).toBe(true);
    expect(fb.log.build).toBe(13);
    expect(fb.log.release).toBe(0);
  });

  it('안정되면 더 이상 만들지 않는다 — 매 프레임 재생성하지 않는다', () => {
    const { sys, fb } = make();
    settle(sys);
    const after = fb.log.build;
    settle(sys, 10);
    expect(fb.log.build).toBe(after);
  });

  it('한 프레임에 몰아 만들지 않는다 — 예산이 분산을 강제한다', () => {
    const { sys, fb } = make();
    sys.update(ctx({ dt: 0.014 })); // 여유 ~2.7ms → 예산 ~1.3ms
    expect(fb.log.build).toBeGreaterThan(0);
    expect(fb.log.build).toBeLessThan(13);
    expect(sys.ready).toBe(false);
  });

  it('예산이 0이어도 진행한다 — 느린 기기에서 영영 안 뜨면 안 된다', () => {
    const { sys, fb } = make();
    for (let i = 0; i < 30; i++) sys.update(ctx({ dt: 0.5, frame: i + 1 })); // 항상 지각
    expect(fb.log.build).toBeGreaterThan(0);
  });
});

describe('StreamingSystem — 진행률', () => {
  it('첫 프레임 전에는 0이다 — 로딩이 끝난 것처럼 보이면 안 된다', () => {
    const { sys } = make();
    expect(sys.progress()).toBe(0);
    expect(sys.ready).toBe(false);
  });

  it('충전이 끝나면 1이다', () => {
    const { sys } = make();
    settle(sys);
    expect(sys.progress()).toBe(1);
  });

  it('중간에는 0과 1 사이', () => {
    const { sys } = make();
    sys.update(ctx({ dt: 0.014 }));
    const p = sys.progress();
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe('StreamingSystem — 이동', () => {
  it('멀어진 파셀을 반납하고 새 파셀을 만든다', () => {
    const { sys, fb, pos } = make();
    settle(sys);
    const before = fb.log.build;
    pos.x = 32 * 6; // 6셀 이동 — 겹치는 파셀이 없다
    settle(sys);
    expect(fb.log.release).toBeGreaterThan(0);
    expect(fb.log.build).toBeGreaterThan(before);
    expect(sys.stats().loaded).toBe(13); // 개수는 그대로
  });

  it('만든 만큼 반납한다 — 누수가 없다', () => {
    const { sys, fb, pos } = make();
    settle(sys);
    for (const x of [3, 7, 11, 2, 0]) { pos.x = 32 * x; settle(sys); }
    sys.dispose();
    expect(fb.log.release).toBe(fb.log.build);
    expect(fb.live.size).toBe(0);
  });

  it('한 칸 이동은 대부분의 파셀을 유지한다 — 전면 재생성하지 않는다', () => {
    const { sys, fb, pos } = make();
    settle(sys);
    const before = fb.log.build;
    pos.x = 32; // 1셀
    settle(sys);
    // 13개 중 새로 만드는 건 소수여야 한다. 전면 재생성이면 13이 된다.
    expect(fb.log.build - before).toBeLessThan(8);
  });
});

describe('StreamingSystem — tier 변경이 재생성으로 새지 않는다(이 아키텍처의 존재 이유)', () => {
  it('retier가 되면 build를 부르지 않는다', () => {
    const { sys, fb, pos } = make();
    settle(sys);
    const before = fb.log.build;
    pos.x = 32; // tier 경계가 이동해 승격·강등이 발생한다
    settle(sys);
    expect(fb.log.retier).toBeGreaterThan(0);
    // 새로 시야에 든 파셀만 build 대상 — 기존 파셀의 tier 변경은 build를 늘리지 않는다.
    expect(fb.log.build - before).toBeLessThan(fb.log.retier + 8);
  });

  it('retier가 null을 돌려주면 재생성으로 떨어진다(폴백이 살아 있다)', () => {
    const hard = fakeBuilder(false);
    const { sys, pos } = make({ builder: hard.builder });
    settle(sys);
    const before = hard.log.build;
    pos.x = 32;
    settle(sys);
    expect(hard.log.retier).toBeGreaterThan(0);
    expect(hard.log.build).toBeGreaterThan(before);
    expect(hard.log.release).toBeGreaterThan(0);
  });
});

// ── 교체의 방향 ─────────────────────────────────────────────────────────────
// `retiered` 총계는 "몇 번 바뀌었나" 만 말한다. 한 방향으로 흘러간 것과 같은 경계를
// 오간 것을 구별하지 못해서, 팀장이 건 판정 기준("42m 에 왕복 3건 이상이면 히스테리시스
// 폭 확대 병행", 2026-08-07)을 그 수로는 잴 수 없었다. 방향을 나눠 센다.
//
// **부호는 `>0` 으로 못 지킨다** (검수관 권고 P5, 2026-08-08). 승격/강등을 뒤바꾸는
// 뮤테이션이 22건 전부 초록이었다 — 이동 과도기에는 양쪽이 다 나오기 때문이다(실측:
// 멀어짐 첫 8프레임에 promoted=3, demoted=6). 부호가 뒤집혀도 안 깨지면, 팀장 조건 3
// (42m 왕복 3건 → 히스테리시스 확대)을 **반대로** 판정하게 된다. 그래서 대소를 본다.
function sweep(sys: StreamingSystem, n = 8) {
  let promoted = 0; let demoted = 0; let retiered = 0;
  for (let i = 0; i < n; i++) {
    sys.update(ctx());
    const s = sys.stats();
    promoted += s.promoted; demoted += s.demoted; retiered += s.retiered;
  }
  return { promoted, demoted, retiered };
}

describe('StreamingSystem — 교체 방향(승격·강등)', () => {
  it('멀어지면 **강등이 승격보다 많다** — 부호가 뒤집히면 깨진다', () => {
    const { sys, pos } = make();
    settle(sys);
    pos.x = 32; // 경계 밖으로 밀어 강등을 유도한다
    const { promoted, demoted, retiered } = sweep(sys);
    expect(retiered).toBeGreaterThan(0);
    expect(demoted, '멀어지는데 강등이 승격보다 적다 — 부호가 뒤집혔다').toBeGreaterThan(promoted);
    // 방향이 없는 교체(같은 tier 재적용)는 어느 쪽에도 안 세므로 합이 총계 이하다.
    expect(promoted + demoted).toBeLessThanOrEqual(retiered);
  });

  // ── 여기서 멈춘다: 되돌아옴은 **대소로 못 잰다** (실측 2026-08-08) ──────────
  // 검수관 권고 P5 는 되돌아옴에 `promoted > demoted` 를 제안했고, 나는 그대로 썼다가
  // 실측에 반증당했다 — 되돌아와도 **promoted=3 vs demoted=6** 이다.
  //
  // 이유: 이동은 방향과 무관하게 강등이 우세하다. 새로 시야에 드는 파셀은 `build` 로
  // 들어오지 `retier` 로 들어오지 않으므로 **승격에 안 세어지고**, 뒤에 남겨진 파셀은
  // 전부 강등으로 세어진다. 즉 이 비대칭은 결함이 아니라 스트리밍의 성질이다.
  //
  // 그래서 부호 보증은 **위 「멀어지면」 하나가 전담**한다(뮤테이션으로 확인: 승격/강등을
  // 뒤바꾸면 그 테스트가 깨진다). 여기서는 되돌아올 때 승격 경로가 **실행되는지**만 본다.
  it('되돌아오면 승격이 잡힌다 — 왕복을 볼 수 있는 유일한 축이다', () => {
    const { sys, pos } = make();
    settle(sys);
    pos.x = 32;
    sweep(sys);
    pos.x = 0; // 제자리로 — 같은 경계를 되돌아온다
    expect(sweep(sys).promoted).toBeGreaterThan(0);
  });

  it('정지 상태에서는 어느 쪽도 세지 않는다 — 유휴 노이즈가 왕복으로 보이면 안 된다', () => {
    const { sys } = make();
    settle(sys);
    const { promoted, demoted, retiered } = sweep(sys);
    expect({ promoted, demoted, retiered }).toEqual({ promoted: 0, demoted: 0, retiered: 0 });
  });

  // 재생성 폴백(`retier`→null)에서도 방향이 세지는가. 카운팅이 `retier()` 호출 **이전**이라
  // 두 경로가 같이 지나야 하는데, 그것을 지나는 테스트가 없었다(검수관 권고 P6).
  it('retier 가 null 이라 재생성으로 떨어져도 방향은 세어진다', () => {
    const hard = fakeBuilder(false);
    const { sys, pos } = make({ builder: hard.builder });
    settle(sys);
    pos.x = 32;
    const { promoted, demoted, retiered } = sweep(sys);
    expect(retiered).toBeGreaterThan(0);
    expect(promoted + demoted, '재생성 경로에서 방향이 안 세어진다').toBeGreaterThan(0);
    expect(hard.log.build).toBeGreaterThan(0); // 정말 재생성 경로를 지났다
  });
});

describe('StreamingSystem — 커널 협조', () => {
  it('탭이 숨으면 아무것도 하지 않는다', () => {
    const { sys, fb } = make();
    for (let i = 0; i < 10; i++) sys.update(ctx({ hidden: true, dt: 0.0001 }));
    expect(fb.log.build).toBe(0);
  });

  it('파셀이 바뀐 프레임에 강제 렌더를 요청한다 — 팝인 방지', () => {
    let dirty = 0;
    const { sys } = make({ markDirty: () => { dirty++; } });
    sys.update(ctx({ dt: 0.0001 }));
    expect(dirty).toBe(1);
  });

  it('변화가 없으면 강제 렌더를 요청하지 않는다', () => {
    let dirty = 0;
    const { sys } = make({ markDirty: () => { dirty++; } });
    settle(sys);
    const before = dirty;
    settle(sys, 5);
    expect(dirty).toBe(before);
  });

  it('probe가 없으면 계측이 아예 돌지 않는다', () => {
    const { sys } = make();
    expect(() => sys.update(ctx({ probe: undefined }))).not.toThrow();
  });

  it('probe가 있으면 파셀 수를 보고한다', () => {
    const seen: string[] = [];
    const { sys } = make();
    sys.update(ctx({ dt: 0.0001, probe: (n) => { seen.push(n); } }));
    expect(seen).toContain('parcels_loaded');
    expect(seen).toContain('parcels_pending');
  });
});

describe('StreamingSystem — tier 맵 일관성', () => {
  it('tierMap과 loaded 수가 어긋나지 않는다', () => {
    const { sys, pos } = make();
    settle(sys);
    for (const x of [1, 4, 0]) { pos.x = 32 * x; settle(sys); }
    expect(sys.tierMap.size).toBe(sys.stats().loaded);
  });

  it('byTier 합이 loaded와 같다', () => {
    const { sys } = make();
    settle(sys);
    const s = sys.stats();
    const sum = (Object.values(s.byTier) as number[]).reduce((a, b) => a + b, 0);
    expect(sum).toBe(s.loaded);
  });

  it('none은 tierMap에 남지 않는다', () => {
    const { sys, pos } = make();
    settle(sys);
    pos.x = 32 * 4;
    settle(sys);
    expect([...sys.tierMap.values()].includes('none' as Tier)).toBe(false);
  });
});
