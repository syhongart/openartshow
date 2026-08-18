// world2 StreamingSystem 집행 계층 테스트 — 가짜 빌더로 부수효과를 관찰한다.
//
// 판정(무엇을 원하는가)은 world2-stream.test.ts가 본다. 여기서는 **집행**만 본다:
// 만든 것을 반드시 반납하는가, 예산을 지키는가, tier 변경이 재생성으로 새지 않는가.
// 마지막 항목이 이 아키텍처의 존재 이유다 — 파셀 승격 때 머티리얼 19개·지오 44개가
// 새로 태어나던 것이 스파이크의 원인이었다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
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
  /** look-ahead 방향. 안 주면 예전처럼 방향이 없다(중심 = 발밑) */
  dir?: { x: number; z: number };
  /** 진행 계수. 안 주면 옵션 자체를 넘기지 않는다 — 기본값 1 경로를 그대로 탄다 */
  speedFactor?: number;
  /**
   * look-ahead 거리(셀). 안 주면 **라이브 기본값(0 = 꺼짐)** 을 탄다.
   *
   * 명시할 수 있게 연 이유: 기본값이 0 이 된 뒤로 `speedFactor` 배선을 검사하려면
   * 곱할 대상이 필요하다. **그 배선은 여전히 살아 있고**(다시 켤 때 짝이 된다),
   * 그것이 끊기는 것과 기본값이 0 인 것은 다른 일이다.
   */
  lookAhead?: number;
} = {}) {
  const fb = fakeBuilder();
  const pos = o.pos ?? { x: 0, z: 0 };
  const sys = new StreamingSystem({
    builder: o.builder ?? fb.builder,
    cellX: 32, cellZ: 32,
    getPosition: () => pos,
    markDirty: o.markDirty,
    getDirection: o.dir ? () => o.dir! : undefined,
    getSpeedFactor: o.speedFactor === undefined ? undefined : () => o.speedFactor!,
    lookAhead: o.lookAhead,
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

// ═══════════════════════════════════════════════════════════════════════════
// W8-9 — `isLoaded(px,pz)` : 「그 파셀을 지금 들고 있는가」
//
// 🔴 **검수관 실측(2026-08-18)이 이 블록을 만들었다.** 신설 직후 `isLoaded` 를
// **항상 `true`** 로 바꿔도 관련 4개 스위트가 **0 failed** 였다 — 액자 쪽 테스트는
// `loaded` 콜백을 스텁으로 주입해 **소비 측만** 보고, 배선 테스트는 문자열만 본다.
// 즉 판정(여기)과 집행(액자)을 잇는 경계가 아무 검사도 안 받고 있었다.
// 이 저장소가 「판정/집행 분리의 구멍」이라고 이름 붙인 바로 그 형태다.
// ═══════════════════════════════════════════════════════════════════════════

describe('StreamingSystem — isLoaded (W8-9)', () => {
  it('★ 첫 프레임 전에는 아무것도 안 들고 있다', () => {
    const { sys } = make();
    expect(sys.isLoaded(0, 0), '★ 로드 전인데 true 다 — 액자가 헛것을 보고 뜬다').toBe(false);
  });

  it('★ 충전이 끝나면 발밑 파셀을 들고 있다', () => {
    const { sys } = make();
    settle(sys);
    expect(sys.isLoaded(0, 0)).toBe(true);
  });

  it('🔴 멀어지면 false, 돌아오면 다시 true — 액자의 생사가 이 한 줄에 달려 있다', () => {
    const { sys, pos } = make();
    settle(sys);
    expect(sys.isLoaded(0, 0)).toBe(true);

    pos.x = 32 * 6;              // 6셀 이동 — 겹치는 파셀이 없다
    settle(sys);
    expect(sys.isLoaded(0, 0), '★ 언로드됐는데 true 다 — 액자가 공중에 남는다').toBe(false);
    expect(sys.isLoaded(6, 0), '★ 새로 온 파셀을 못 본다').toBe(true);

    pos.x = 0;
    settle(sys);
    expect(sys.isLoaded(0, 0), '★ 돌아왔는데 false 다 — 액자가 영영 안 돌아온다').toBe(true);
  });

  it('★ `tierMap` 과 **같은 것**을 본다 — 두 조회가 갈리면 아무도 모른다', () => {
    const { sys, pos } = make();
    pos.x = 32 * 3;
    settle(sys);
    for (const [key, tier] of sys.tierMap) {
      const [px, pz] = key.split(',').map(Number);
      expect(sys.isLoaded(px, pz), `★ tierMap 에 ${key}(${tier}) 가 있는데 isLoaded 는 false`)
        .toBe(true);
    }
    // 반대 방향 — 맵에 없는 먼 파셀
    expect(sys.isLoaded(99, 99)).toBe(false);
  });

  it('★ 부호를 뒤집으면 다른 파셀이다 — 키 조립이 좌표 순서를 지킨다', () => {
    const { sys, pos } = make();
    pos.x = 32 * 4; pos.z = 0;
    settle(sys);
    // (4,0) 은 발밑이라 로드돼 있고, (0,4) 는 멀어서 없다. 두 값이 같으면 키가
    // `px`·`pz` 를 뒤섞고 있다는 뜻이다.
    expect(sys.isLoaded(4, 0)).toBe(true);
    expect(sys.isLoaded(0, 4)).toBe(false);
    expect(sys.isLoaded(-4, 0)).toBe(false);
  });

  it('★ dispose 뒤에는 아무것도 안 들고 있다', () => {
    const { sys } = make();
    settle(sys);
    sys.dispose();
    expect(sys.isLoaded(0, 0), '★ 떠난 뒤에도 로드됐다고 답한다').toBe(false);
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

// ── 진행 계수가 look-ahead 에 실제로 곱해지는가 (판정→집행 경계) ──────────────
//
// **검수관 반려 B1 로 생긴 절이다.** `player.speedFactor`(계산) → `main.ts`(배선) →
// 여기(소비) 로 이어지는 경계를 아무 테스트도 안 보고 있었다. `CLAUDE.md` 가 이름까지
// 붙여 경고하는 형태다 — *"판정/집행 분리의 구멍 — 경계를 건너는 지점은 아무도 안 본다"*.
//
// 관측은 **로드된 파셀의 tier 맵**으로 한다. 계수가 look-ahead 를 줄이면 판정 중심이
// 발밑으로 당겨지고, 그러면 진행 방향 파셀의 tier 가 실제로 달라진다. 중간 변수를
// 들여다보지 않고 **화면에 나가는 결과**로 재는 것이 요점이다.
const tierSnapshot = (sys: StreamingSystem) =>
  [...sys.tierMap.entries()].map(([k, t]) => `${k}=${t}`).sort().join(' ');

// ⚠ **아래 두 절은 지금 라이브에서 아무것도 안 지킨다** — `lookAhead` 기본값이 0 이라
// 계수를 곱할 대상이 없기 때문이다(2026-08-09, 감독 실기기 *"뒤에 조금만 가면 갑자기
// 사라져"*). 그래서 각 케이스에 `lookAhead` 를 **명시적으로 준다.** 배선이 끊기는 것과
// 기본값이 0 인 것은 다른 일이고, 다시 켤 때 이 검사가 필요하다.
// 기본값이 0 이라는 사실 자체는 바로 아래 절이 따로 못 박는다.
describe('StreamingSystem — getSpeedFactor 가 look-ahead 를 접는다 (lookAhead 를 켠 상태)', () => {
  const dir = { x: 0, z: -1 };
  const AHEAD = 0.5; // 기본값이 0 이 되기 전의 값. 여기서만 쓴다

  it('계수 0 과 1 은 서로 다른 파셀 구성을 만든다', () => {
    const a = make({ dir, speedFactor: 1, lookAhead: AHEAD });
    const b = make({ dir, speedFactor: 0, lookAhead: AHEAD });
    settle(a.sys); settle(b.sys);
    expect(tierSnapshot(a.sys)).not.toBe(tierSnapshot(b.sys));
  });

  it('계수 0 은 방향을 안 준 것과 같다 — look-ahead 가 통째로 접힌다', () => {
    const zero = make({ dir, speedFactor: 0, lookAhead: AHEAD });
    const none = make({ lookAhead: AHEAD });
    settle(zero.sys); settle(none.sys);
    expect(tierSnapshot(zero.sys)).toBe(tierSnapshot(none.sys));
  });

  it('안 주면 1 과 같다 — 예전 동작이 기본값이다', () => {
    const absent = make({ dir, lookAhead: AHEAD });
    const one = make({ dir, speedFactor: 1, lookAhead: AHEAD });
    settle(absent.sys); settle(one.sys);
    expect(tierSnapshot(absent.sys)).toBe(tierSnapshot(one.sys));
  });

  it('1 을 넘는 값·음수·NaN 은 0~1 로 가둔다 — 커지면 고치려던 증상이 되살아난다', () => {
    const one = make({ dir, speedFactor: 1, lookAhead: AHEAD });
    const zero = make({ dir, speedFactor: 0, lookAhead: AHEAD });
    settle(one.sys); settle(zero.sys);
    for (const over of [3, 1e9]) {
      const s = make({ dir, speedFactor: over, lookAhead: AHEAD });
      settle(s.sys);
      expect(tierSnapshot(s.sys), `${over} 가 1 로 안 잘렸다`).toBe(tierSnapshot(one.sys));
    }
    for (const bad of [-1, NaN]) {
      const s = make({ dir, speedFactor: bad, lookAhead: AHEAD });
      settle(s.sys);
      // 음수는 0 으로(뒤로 당기지 않는다), NaN 은 1 로(옵션이 없는 셈) 떨어진다.
      expect(tierSnapshot(s.sys)).toBe(tierSnapshot(bad < 0 ? zero.sys : one.sys));
    }
  });
});

// ── 기본값이 0 이라는 것 자체를 못 박는다 (감독 실기기 2026-08-09) ─────────────
//
// *"뒤에 조금만 가면 갑자기 사라져"* — 후진하니 64m 앞 건물이 통째로 언로드됐다.
// `lookAheadCenter` 가 판정 중심을 옮기는 **제로섬**이라, 1인칭 후진에서는 화면 정면이
// 반경 밖으로 밀려난다. 근거와 값 판단은 `systems/streaming.ts` 의 `lookAhead` 주석
// 한 곳이다 — 여기에 다시 적지 않는다.
//
// **이 절이 없으면 기본값을 되돌려도 아무 검사도 안 깨진다.** 바로 위 절은 `lookAhead`
// 를 명시적으로 주므로 기본값과 무관하고, `world2-stream.test.ts` 의 제로섬 표도
// 순수 함수라 기본값을 안 본다. 그 사이가 정확히 이 결함이 통과하던 구멍이다.
describe('StreamingSystem — lookAhead 기본값은 0 이다 (판정 중심을 안 옮긴다)', () => {
  it('방향을 줘도 파셀 구성이 정지 상태와 같다', () => {
    const still = make({});
    const fwd = make({ dir: { x: 0, z: -1 } });
    const back = make({ dir: { x: 0, z: +1 } });
    settle(still.sys); settle(fwd.sys); settle(back.sys);
    expect(tierSnapshot(fwd.sys), '전진이 중심을 옮겼다 — 반대쪽을 잃는다').toBe(tierSnapshot(still.sys));
    expect(tierSnapshot(back.sys), '후진이 중심을 옮겼다 — 보는 쪽을 잃는다').toBe(tierSnapshot(still.sys));
  });

  it('후진해도 앞쪽 2셀(64m) 파셀이 살아 있다 — 감독이 본 그 파셀이다', () => {
    const back = make({ dir: { x: 0, z: +1 } });
    settle(back.sys);
    // 앞 = −z. 정지 기준 far 밴드 안이므로 반드시 로드돼 있어야 한다.
    expect(back.sys.tierMap.get('0,-2'), '후진 중 64m 앞이 사라졌다').toBeDefined();
  });
});

// ── 배선 — main.ts 가 두 끝을 이었는가 (정적·약함) ────────────────────────────
//
// 위 절은 계수를 **직접 주입**하므로 조립부를 보지 않는다. `main.ts:getSpeedFactor` 한
// 줄이 지워져도 위 검사는 전부 초록이다. 그 구멍을 좁힌다 — `world2-collide.test.ts` §4
// 와 같은 성격이고 같은 한계를 갖는다(글자가 있는지만 본다).
describe('배선 — main.ts 가 speedFactor 를 스트리밍에 넘긴다 (정적·약함)', () => {
  const src = readFileSync('frontend/js/world2/main.ts', 'utf8');

  it('player.speedFactor 를 getSpeedFactor 로 넘긴다', () => {
    expect(src, 'getSpeedFactor 배선이 없다').toMatch(/getSpeedFactor\s*:\s*\(\)\s*=>\s*player\.speedFactor/);
  });
});
