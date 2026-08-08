// world2 플레이어 충돌 (태스크 #182) — **판정·조회·집행 세 층을 각각, 그리고 경계를.**
//
// ── 왜 세 층인가 ───────────────────────────────────────────────────────────
// 이 저장소가 반복해서 값을 치른 형태가 *"판정/집행 분리의 구멍 — 경계를 건너는 지점은
// 아무도 안 본다"* 다. `decide/` 를 순수 함수로 두면 각 쪽은 테스트하기 쉬워지지만,
// **"계산된 값이 실제로 소비되는가" 는 양쪽 테스트 어디에도 안 걸린다.**
// 그래서 여기서 세 번째 층(§3)이 `PlayerSystem` 을 실제로 돌린다 — 충돌 함수를 주입하고
// **플레이어가 정말 안 지나가는지**를 본다. 이것이 없으면 `resolveMove` 를 배선에서
// 빠뜨려도 위 두 층은 전부 초록이다.

// ── 검출력 실측 (뮤테이션, 2026-08-08) ─────────────────────────────────────
// **통과는 검출력의 증거가 아니다.** 결함을 일부러 되살려 실제로 깨지는지 봤다.
// 이름이 아니라 **적용 원문**으로 적는다(태스크 #192 — 이름만 적어 서로 다른 것을 같은
// 이름으로 부른 사고가 있었다).
//
//   대조군                                                    17 passed
//   `slide` 의 축분리 두 `if` → 한 번에 판정                   → §1 비스듬히 FAIL
//   `player.ts` 의 `this.resolveMove ? … : …` → 주입 무시      → §3 **3개** FAIL
//   `blockersOf` 의 `if (r > 0)` → `if (true)`                 → §1 반경0 FAIL
//   `main.ts` 의 `resolveMove: …` 줄 삭제                      → §4 배선 FAIL
//   `player.ts` 헤드밥의 `mx, mz` → `d.dx, d.dz`               → §3 헤드밥 FAIL
//   `collide.ts` 의 "이미 갇혔으면 통과" 가드 삭제              → §1 갇힘 FAIL
//   `collision.ts` 의 `Math.round` → `Math.floor` (2곳)        → **17 passed(안 깨짐)**
//
// ⚠ **마지막 것은 사각이 아니라 등가에 가까운 뮤테이션이다.** 3×3 커버가 여유를 줘서
// floor 로도 현재 파츠 크기에서는 안 닿는다 — 그 사실을 확인하고 `collision.ts` 의
// **틀린 주석을 고쳤다**(원래 *"발밑 파셀을 놓친다"* 라고 적혀 있었고 거짓이었다).
// **안 깨진 뮤테이션에는 등가와 진짜 사각이 있고, 이것은 전자다** — 억지로 잡는 검사를
// 만들면 그것이 장식이다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { blockersOf, blocked, slide, type Blocker } from '../frontend/js/world2/decide/collide.js';
import { createCollider } from '../frontend/js/world2/systems/collision.js';
import { parcelLayout, DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { PlayerSystem } from '../frontend/js/world2/systems/player.js';
import type { FrameCtx } from '../frontend/js/world2/kernel.js';

const frame = (dt: number, n = 1): FrameCtx =>
  ({ dt, ageMs: n * dt * 1000, frame: n, hidden: false, resumed: false, probe: () => {} });

describe('§1 판정 — decide/collide (순수)', () => {
  const wall: Blocker[] = [{ x: 10, z: 0, r: 2 }];

  it('원 안이면 막힌 것으로 본다', () => {
    expect(blocked(10, 0, wall, 0.34)).toBe(true);
    // 반경 2 + 몸 0.34 = 2.34 밖
    expect(blocked(12.5, 0, wall, 0.34)).toBe(false);
  });

  it('막는 것이 없으면 그대로 간다', () => {
    expect(slide(0, 0, 1, 2, [], 0.34)).toEqual({ x: 1, z: 2 });
  });

  it('벽으로 곧장 가면 막힌다', () => {
    const r = slide(7, 0, 1, 0, wall, 0.34);
    expect(r.x).toBe(7); // x 가 안 늘었다
  });

  // 이것이 "끼임" 과 "미끄러짐" 을 가른다. 축을 나눠 시도하지 않으면 벽에 비스듬히
  // 부딪힌 순간 **두 축이 함께 죽어** 제자리에 붙는다.
  it('벽에 비스듬히 부딪히면 막힌 축만 버리고 옆으로 계속 간다', () => {
    const r = slide(7, 0, 1, 1, wall, 0.34);
    expect(r.x).toBe(7);        // 벽 쪽은 막혔고
    expect(r.z).toBe(1);        // 벽을 따라서는 갔다
  });

  // 스폰이 겹쳤거나 파츠가 나중에 들어오면 몸이 원 안에 있을 수 있다. 그때 막아 버리면
  // **영원히 못 나온다** — 회복 가능한 쪽을 고른다.
  it('이미 갇힌 상태면 판정을 끄고 걸어 나오게 둔다', () => {
    const r = slide(10, 0, 1, 0, wall, 0.34);
    expect(r).toEqual({ x: 11, z: 0 });
  });

  it('반경 0 인 파츠는 막지 않는다 — 지면·도로가 그렇게 선언돼 있다', () => {
    const parts = [{ kind: 'ground', x: 0, z: 0, y: 0, ry: 0, sx: 32, sy: 1, sz: 32, tone: 0 }];
    expect(blockersOf(parts, 0, 0)).toEqual([]);
  });

  it('파셀 원점을 더해 월드 좌표로 낸다', () => {
    const parts = parcelLayout(3, 4, 'near', DEFAULT_LAYOUT);
    const b = blockersOf(parts, 100, 200);
    expect(b.length).toBeGreaterThan(0);
    // 파셀 로컬 좌표는 ±cellX/2 안이므로, 원점을 더했으면 100 근처에 모여 있어야 한다.
    for (const one of b) {
      expect(Math.abs(one.x - 100)).toBeLessThan(DEFAULT_LAYOUT.cellX);
      expect(Math.abs(one.z - 200)).toBeLessThan(DEFAULT_LAYOUT.cellZ);
    }
  });
});

describe('§2 조회 — systems/collision (근처 3×3 + 캐시)', () => {
  it('실제 파셀 배치에서 막을 것을 찾아낸다 — 0건이면 아무것도 안 보는 것이다', () => {
    const c = createCollider();
    c.resolve(0, 0, 0.01, 0);
    // 측정기 생존. 도시에 건물·나무가 있는데 0 이면 조회가 죽은 것이다.
    expect(c.count()).toBeGreaterThan(0);
  });

  it('멀리 떨어진 두 지점은 서로 다른 것을 본다 — 캐시가 갱신된다', () => {
    const c = createCollider();
    c.resolve(0, 0, 0.01, 0);
    const near = c.count();
    c.resolve(DEFAULT_LAYOUT.cellX * 20, DEFAULT_LAYOUT.cellZ * 20, 0.01, 0);
    const far = c.count();
    // 개수가 같을 수는 있어도(우연) 캐시 키가 갱신됐는지는 아래 결정성으로 본다.
    expect(Number.isFinite(near) && Number.isFinite(far)).toBe(true);
    // 되돌아오면 처음과 같은 개수여야 한다 — `parcelLayout` 이 결정적이기 때문이다.
    c.resolve(0, 0, 0.01, 0);
    expect(c.count()).toBe(near);
  });

  it('건물 한가운데로 걸어 들어가려 하면 막힌다', () => {
    const c = createCollider();
    // 파셀 (0,0) 의 실제 배치에서 반경이 가장 큰 것을 고른다 — 그 중심으로 걸어간다.
    const parts = parcelLayout(0, 0, 'near', DEFAULT_LAYOUT);
    const bs = blockersOf(parts, 0, 0).sort((a, b) => b.r - a.r);
    expect(bs.length, '파셀 (0,0) 에 막을 것이 하나도 없다').toBeGreaterThan(0);
    const t = bs[0];
    // 원 밖 가까이에서 중심 쪽으로 한 걸음.
    const startX = t.x + t.r + 0.5;
    const moved = c.resolve(startX, t.z, -0.4, 0);
    expect(moved.x, '건물 안으로 들어갔다').toBeGreaterThan(startX - 0.4);
  });

  it('빈 하늘(막을 것이 없는 좌표)에서는 그대로 간다', () => {
    // 파츠가 없는 곳을 찾을 수 없을 수도 있으므로, 빈 배열을 직접 넣어 확인한다.
    expect(slide(0, 0, 5, 5, [], 0.34)).toEqual({ x: 5, z: 5 });
  });
});

// ── §3 집행 — 경계를 건너는 지점 ──────────────────────────────────────────
// **여기가 이 파일의 핵심이다.** 위 두 층이 아무리 초록이어도, `PlayerSystem` 이
// `resolveMove` 를 안 부르면 화면에서는 여전히 벽을 통과한다.
describe('§3 집행 — PlayerSystem 이 충돌을 실제로 소비하는가', () => {
  /** x >= 5 를 벽으로 막는 가짜 세계. 도시를 세우지 않고 경계만 본다. */
  const stopAtFive = (x: number, z: number, dx: number, dz: number) =>
    ({ x: Math.min(5, x + dx), z: z + dz });

  it('주입하면 벽에서 멈춘다', () => {
    const p = new PlayerSystem({ start: { x: 0, z: 0 }, resolveMove: stopAtFive });
    p.setInput({ right: true });
    for (let i = 0; i < 200; i++) p.update(frame(1 / 60, i));
    expect(p.position.x).toBeLessThanOrEqual(5);
  });

  it('주입하지 않으면 예전처럼 통과한다 — 기본값이 바뀌지 않았다', () => {
    const p = new PlayerSystem({ start: { x: 0, z: 0 } });
    p.setInput({ right: true });
    for (let i = 0; i < 200; i++) p.update(frame(1 / 60, i));
    expect(p.position.x).toBeGreaterThan(5);
  });

  // `player.ts` 는 원래 *"나중에 충돌이 붙어도 이 식은 그대로 맞다"* 고 적어 두었는데
  // **가려던 양(`d`)을 넣고 있어서 절반만 맞았다.** 벽에 붙어 못 움직이는데 헤드밥이
  // 계속 흔들리면 제자리걸음처럼 보인다 — 실제 이동량으로 바꿔 그 문장을 참으로 만들었고,
  // 이 검사가 그것을 지킨다.
  it('벽에 붙어 못 움직이면 헤드밥이 잦아든다 — 제자리걸음이 남지 않는다', () => {
    const ys: number[] = [];
    const p = new PlayerSystem({
      start: { x: 0, z: 0 },
      resolveMove: stopAtFive,
      applyCamera: (_x, y) => { ys.push(y); },
    });
    p.setInput({ right: true });
    // 벽에 닿을 때까지 충분히 걷는다.
    for (let i = 0; i < 400; i++) p.update(frame(1 / 60, i));
    const tail = ys.slice(-60);
    const swing = Math.max(...tail) - Math.min(...tail);
    expect(swing, `벽에 붙었는데 눈높이가 ${swing.toFixed(4)}m 흔들린다`).toBeLessThan(0.005);
  });

  it('벽을 따라서는 계속 걸어진다 — 막혀도 다른 축은 산다', () => {
    const p = new PlayerSystem({ start: { x: 0, z: 0 }, resolveMove: stopAtFive });
    p.setInput({ right: true, forward: true });
    for (let i = 0; i < 200; i++) p.update(frame(1 / 60, i));
    expect(p.position.x).toBeLessThanOrEqual(5);
    expect(Math.abs(p.position.z), '벽에 붙어 옆으로도 못 간다').toBeGreaterThan(1);
  });
});

// ── §4 배선 — 조립부가 실제로 연결했는가 ──────────────────────────────────
// ⚠ **§3 까지 전부 초록이어도 `main.ts` 가 `resolveMove` 를 안 넘기면 화면에서는 그대로
// 통과한다.** §3 은 가짜 함수를 직접 주입하므로 조립부를 보지 않는다 — 그 구멍을 여기서
// 좁힌다.
//
// **이것은 약한 검사다.** 소스에 그 글자가 있는지만 본다 — 값이 옳은지, 조건이 항상
// 거짓이 아닌지는 못 본다. `main.ts` 가 three 를 import 해서 단위 테스트로 돌릴 수 없기
// 때문이고, **진짜 축은 브라우저 스모크**다(후속). 못 잡는 것을 적어 두는 이유는, 이
// 검사가 초록이라고 "배선이 맞다" 로 읽히지 않게 하기 위해서다.
describe('§4 배선 — main.ts 가 충돌을 플레이어에 연결한다 (정적·약함)', () => {
  const src = readFileSync('frontend/js/world2/main.ts', 'utf8');

  it('createCollider 를 만들어 PlayerSystem 에 넘긴다', () => {
    expect(src, 'createCollider 를 부르지 않는다').toMatch(/createCollider\s*\(/);
    expect(src, 'resolveMove 를 PlayerSystem 에 넘기지 않는다').toMatch(/resolveMove\s*:/);
  });

  it('끄는 노브가 있다 — 갇히는 사고가 나면 링크로 빠져나온다', () => {
    expect(src).toMatch(/readNum\(\s*'collide'/);
  });
});
