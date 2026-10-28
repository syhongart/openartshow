// @vitest-environment node
//
// 붙이는 루프가 **프레임을 몇 번 넘기는가**.
//
// ── 왜 이 축이 필요한가 ────────────────────────────────────────────────────
// 감독 요구(2026-08-16): *"작품갯수가 정해진것은 아니잖아. 작가별로 다를 수있고."*
//
// 그 요구의 선결 조건이 부팅 비용인데 **아무도 재고 있지 않았다** —
// `frontend/assets/world2-overlay.json` 이 34바이트·items **0개**라 이 축이 한 번도
// 측정된 적이 없다(백로그 #45). 「못 잰 것은 통과가 아니다」가 규율이므로 **고치기 전에
// 재는 축을 먼저** 만든다.
//
// ── 브라우저를 안 쓴다 ─────────────────────────────────────────────────────
// `attachAll` 이 `nextFrame` 을 **주입받으므로** 가짜를 넣어 호출 횟수를 셀 수 있다.
// 헤드리스는 ~4fps 라 시간으로 재면 편차가 크고 실기기와도 무관하다 — **프레임 수는
// 이산이고 결정론적**이라 그 편차가 아예 안 낀다.
//
// ── 이 파일이 지키는 명제 ──────────────────────────────────────────────────
// **「항목마다 예열하면 3배가 넘는다」** — 이것이 W8-2 의 전제이고, 여기서 수치로 못 박는다.
// 그 수치가 틀리면(예: 배치 크기가 바뀌면) 이 테스트가 먼저 깨진다.

import { describe, it, expect } from 'vitest';
import {
  attachAll, warmUpNode, ATTACH_BATCH, WARMUP_FRAMES, type CullableNode,
} from '../frontend/js/world-shared/attach-loop.js';

/** 프레임 넘김을 세는 가짜. 실제로는 아무 일도 안 한다 */
function makeClock() {
  let frames = 0;
  return { frames: () => frames, nextFrame: async () => { frames++; } };
}

describe('attachAll — 배치마다만 프레임을 넘긴다', () => {
  it('항목 N개면 넘김이 ⌊N/batch⌋ 다', async () => {
    for (const n of [0, 1, 3, 4, 5, 8, 100]) {
      const c = makeClock();
      const done = await attachAll({
        items: Array.from({ length: n }, (_, i) => i),
        place: async () => {},
        nextFrame: c.nextFrame,
      });
      expect(done, `${n}개를 다 붙였나`).toBe(n);
      expect(c.frames(), `${n}개일 때 프레임 넘김`).toBe(Math.floor(n / ATTACH_BATCH));
    }
  });

  it('★ 항목마다 예열하면 3배가 넘는다 — W8-2 의 전제를 수치로 못 박는다', async () => {
    const N = 100;
    // 지금(부팅) — `place` 가 프레임을 안 넘긴다
    const now = makeClock();
    await attachAll({
      items: Array.from({ length: N }, (_, i) => i),
      place: async () => {},
      nextFrame: now.nextFrame,
    });

    // 그전(부팅이 편집용 `place` 를 그대로 탔을 때) — 항목마다 3프레임
    //   `await nextFrame()` 1 + `warmUp` 의 `WARMUP_FRAMES` 2 = 3
    const before = makeClock();
    await attachAll({
      items: Array.from({ length: N }, (_, i) => i),
      place: async () => { for (let i = 0; i < 1 + WARMUP_FRAMES; i++) await before.nextFrame(); },
      nextFrame: before.nextFrame,
    });

    expect(now.frames(), 'N=100 부팅 프레임').toBe(25);          // ⌊100/4⌋
    expect(before.frames(), 'N=100 옛 프레임').toBe(325);        // 3·100 + ⌊100/4⌋
    // 13배. 이 비율이 W8-2 를 착수한 이유다.
    expect(before.frames() / now.frames()).toBe(13);
  });

  it('중단 신호를 매 항목 뒤에 본다 — teardown 이 루프를 세운다', async () => {
    const c = makeClock();
    let placed = 0;
    const done = await attachAll({
      items: Array.from({ length: 50 }, (_, i) => i),
      place: async () => { placed++; },
      nextFrame: c.nextFrame,
      aborted: () => placed >= 7,
    });
    // 7개째에서 멈춘다. **붙인 뒤에** 묻으므로 7 이 맞다(6 이 아니다)
    expect(done).toBe(7);
    expect(placed).toBe(7);
  });

  it('batch 가 0 이하여도 무한 넘김·나눗셈 오류가 안 난다 — 계약이 클램프한다', async () => {
    for (const bad of [0, -1, -100, 0.4]) {
      const c = makeClock();
      await attachAll({
        items: [1, 2, 3],
        place: async () => {},
        nextFrame: c.nextFrame,
        batch: bad,
      });
      // 1 로 클램프되므로 항목마다 넘긴다 = 3
      expect(c.frames(), `batch=${bad}`).toBe(3);
    }
  });

  it('place 가 던지면 그대로 올라간다 — 루프가 실패를 삼키지 않는다', async () => {
    const c = makeClock();
    await expect(attachAll({
      items: [1, 2, 3],
      place: async (n) => { if (n === 2) throw new Error('boom'); },
      nextFrame: c.nextFrame,
    })).rejects.toThrow('boom');
  });
});

describe('warmUpNode — 컬링을 되돌린다', () => {
  /** `frustumCulled` 만 있는 최소 노드 */
  function node(culled: boolean, children: CullableNode[] = []): CullableNode {
    const self: CullableNode = {
      frustumCulled: culled,
      traverse(fn) { fn(self); for (const c of children) c.traverse(fn); },
    };
    return self;
  }

  it('예열 동안 컬링을 끄고, 끝나면 되돌린다', async () => {
    const c = makeClock();
    const leaf = node(true);
    const root = node(true, [leaf]);
    await warmUpNode(root, c.nextFrame);
    expect(c.frames()).toBe(WARMUP_FRAMES);
    expect(root.frustumCulled, '루트가 되돌아왔나').toBe(true);
    expect(leaf.frustumCulled, '자식이 되돌아왔나').toBe(true);
  });

  it('★ 원래 꺼져 있던 것은 켜지 않는다 — 일부러 끈 것을 이 함수가 바꾸면 안 된다', async () => {
    const c = makeClock();
    const off = node(false);          // 하늘 돔·바다처럼 일부러 끈 것
    const on = node(true);
    const root = node(true, [off, on]);
    await warmUpNode(root, c.nextFrame);
    expect(off.frustumCulled, '꺼져 있던 것이 켜졌다면 이 함수가 남의 설정을 바꾼 것이다').toBe(false);
    expect(on.frustumCulled).toBe(true);
  });

  it('★ 중간에 던져도 컬링이 꺼진 채 남지 않는다 — finally 가 그 축이다', async () => {
    const leaf = node(true);
    const root = node(true, [leaf]);
    await expect(warmUpNode(root, async () => { throw new Error('frame died'); }))
      .rejects.toThrow('frame died');
    expect(root.frustumCulled, '던진 뒤에도 되돌아왔나').toBe(true);
    expect(leaf.frustumCulled).toBe(true);
  });
});

describe('부팅 경로가 실제로 예열을 건너뛰는가 — 집행 지점', () => {
  // ⚠ 순수 루프만 테스트하면 **판정/집행 경계를 건너는 지점이 사각으로 남는다**
  // (이 저장소가 규율로 적은 그 형태 — *"계산된 값이 실제로 소비되는가"*).
  // `features/overlay.ts` 의 부팅 루프가 `place(..., false)` 를 넘기지 않으면
  // 위 25프레임이 325프레임이 되는데, 그것을 순수 테스트는 못 본다.
  it('★ 부팅 루프가 place 에 warm=false 를 넘긴다', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      fileURLToPath(new URL('../frontend/js/world2/features/overlay.ts', import.meta.url)),
      'utf8',
    );
    // `attachAll` 의 `place` 콜백이 다섯째 인자로 `false` 를 넘기는 형태.
    expect(src, '★ 부팅이 항목마다 예열하면 프레임이 13배가 된다')
      .toMatch(/place\(\s*\n?\s*it\.src,[^)]*undefined,\s*undefined,\s*false,?\s*\n?\s*\)/);
    // 그리고 루프 자체가 공유 모듈이어야 한다 — 손으로 짠 `for` 로 되돌아가면
    // 프레임 넘김을 세는 축이 다시 사라진다.
    expect(src, '★ 부팅 루프가 attachAll 을 쓰지 않는다').toContain('attachAll({');
  });
});
