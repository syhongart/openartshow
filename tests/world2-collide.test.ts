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
import { createCollider, DEFAULT_BODY_R } from '../frontend/js/world2/systems/collision.js';
import { parcelLayout, DEFAULT_LAYOUT } from '../frontend/js/world2/decide/parcel-layout.js';
import { SPAWN } from '../frontend/js/world2/decide/grid.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';
import { PlayerSystem, facing } from '../frontend/js/world2/systems/player.js';
import type { FrameCtx } from '../frontend/js/world2/kernel.js';
import { coverageOf, covOkOf, yawToward, shortestTurn } from '../scripts/smoke/measure-invariants.mjs';

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
  it('이미 갇힌 상태면 걸어 나오게 둔다', () => {
    const r = slide(10, 0, 1, 0, wall, DEFAULT_BODY_R);
    expect(r).toEqual({ x: 11, z: 0 });
  });

  // ── 갇힘 가드가 **자유이동이 아니다** (검수관 P5) ──────────────────────────
  // 이 두 검사가 없던 동안 갇힘 분기는 `return { x: x+dx, z: z+dz }` 한 줄이었고, 그것은
  // **원 안에 한 프레임 들어가면 그 프레임에 벽을 뚫고 어디로든 갈 수 있다**는 뜻이었다.
  // 위 검사 하나로는 그 차이를 못 본다 — 중심에서 밖으로 나가는 이동은 두 판본 다 통과다.
  it('갇힌 상태에서 **더 깊이** 들어가는 이동은 버린다', () => {
    // 원 (10,0,r=2) · 몸 0.34 → 걸림 반경 2.34. (11.5,0) 은 거리 1.5 로 갇힌 상태다.
    // 거기서 중심 쪽(-x)으로 가면 침투가 0.84 → 1.84 로 **늘어난다**.
    const r = slide(11.5, 0, -1, 0, wall, DEFAULT_BODY_R);
    expect(r).toEqual({ x: 11.5, z: 0 });
  });

  it('갇힌 상태에서 침투가 줄는 방향은 그대로 받는다 — 끼이면 안 된다', () => {
    // 같은 자리에서 z 로 움직이면 중심과의 거리가 늘어 침투가 줄어든다.
    const r = slide(11.5, 0, 0, 1, wall, DEFAULT_BODY_R);
    expect(r).toEqual({ x: 11.5, z: 1 });
  });

  // ── 자동 우회 — **접선으로 스쳐 지나간다** (감독 판정 2026-08-08) ────────────
  //
  // 축분리는 **비스듬히** 부딪힐 때만 미끄러진다. 두 축이 함께 막히면 완전히 서는데,
  // 감독 실기기에서 *"분수대에 끼일때"* 로 확인됐다. 막은 원의 표면 방향으로 흘려보낸다.
  //
  // **실효 실측**(순수 모듈, 스폰에서 200m 직진 시도):
  //   우회 없음  이동 25.3m · 막힌 프레임 3495/4000
  //   우회 있음  이동 **198.1m** · 막힌 프레임 **1**/4000
  // ⚠ **인공 픽스처로는 이 축을 못 잡는다** — 처음에 원 하나를 대각으로 맞히는 검사를
  // 썼는데 실패했다. 대각 정통은 법선과 이동이 일직선이라 **접선이 정확히 0** 이고,
  // 비스듬하게 하면 이번엔 축분리가 한 축을 살려서 접선까지 안 온다. 즉 **한 원짜리
  // 픽스처에서는 축분리가 이미 접선 역할을 한다.** 우회가 버는 것은 **여러 원이 축
  // 방향을 각각 막는** 실제 배치이고, 그래서 검사도 실제 배치로 한다(§2 에 있다).
  it('완전 정면(접선 0)은 그대로 선다 — 좌우 정보가 없으면 고르지 않는다', () => {
    // (7,0) 에서 원 (10,0) 중심으로 정확히 +x. 법선과 이동이 일직선이라 접선이 0.
    const r = slide(7, 0, 1, 0, wall, DEFAULT_BODY_R);
    expect(r).toEqual({ x: 7, z: 0 });
  });

  it('우회로 흘러가도 원 안으로는 못 들어간다 — 우회는 통과가 아니다', () => {
    // 접선이 다른 원에 막히면 제자리다. 어느 경로로 끝나든 **결과가 원 밖**이어야 한다.
    for (const [dx, dz] of [[1, 0], [0.7, 0.7], [0.2, 0.9], [-0.5, 0.5]]) {
      const r = slide(7.5, 0.3, dx, dz, wall, DEFAULT_BODY_R);
      expect(blocked(r.x, r.z, wall, DEFAULT_BODY_R), `d=(${dx},${dz})`).toBe(false);
    }
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

  // ⚠ 이 검사의 제목은 원래 *"멀리 떨어진 두 지점은 서로 다른 것을 본다 — 캐시가
  // 갱신된다"* 였고 **본문이 그것을 확인하지 않았다**(검수관 지적 P6). `near`·`far` 를
  // 재놓고 `Number.isFinite` 만 봤으니, 캐시가 아예 갱신되지 않아도 통과한다 — 제목이
  // 주장하는 축의 검출력이 0 이었다. 기대값을 **독립적으로 계산해** 대조한다.
  it('선 파셀의 3×3 을 정확히 본다 — 캐시가 실제로 갱신된다', () => {
    const c = createCollider();
    /**
     * `collision.ts` 의 `rebuild` 가 내야 할 개수를 테스트가 따로 센다.
     * **tier 를 `near` 로 고정한 것이 계약이다** — 대각을 `mid` 로 강등하면 `tiers:
     * ['near']` 인 파츠(planter)가 조용히 빠지고, 그 회귀를 이 대조가 잡는다.
     */
    const expectAt = (px: number, pz: number) => {
      let n = 0;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const qx = px + dx;
          const qz = pz + dz;
          n += blockersOf(
            parcelLayout(qx, qz, 'near', DEFAULT_LAYOUT),
            qx * DEFAULT_LAYOUT.cellX, qz * DEFAULT_LAYOUT.cellZ,
          ).length;
        }
      }
      return n;
    };
    c.resolve(0, 0, 0.01, 0);
    expect(c.count()).toBe(expectAt(0, 0));
    c.resolve(DEFAULT_LAYOUT.cellX * 20, DEFAULT_LAYOUT.cellZ * 20, 0.01, 0);
    expect(c.count()).toBe(expectAt(20, 20));
    // 되돌아오면 처음 값으로 — `parcelLayout` 이 결정적이기 때문이다.
    c.resolve(0, 0, 0.01, 0);
    expect(c.count()).toBe(expectAt(0, 0));
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

  // ── 자동 우회의 실효 — **실제 배치에서만 드러난다** (감독 판정 2026-08-08) ────
  //
  // 감독 실기기: *"분수대에 끼일때"*. 처방은 두 축 다 막히면 막은 원의 **표면 방향**으로
  // 흘려보내는 것(`decide/collide.ts` 의 접선 투영)이다.
  //
  // §1 에 적은 대로 **한 원짜리 픽스처로는 이 축을 못 잡는다.** 우회가 실제로 버는 것은
  // 여러 원이 x·z 축을 각각 막아 축분리가 둘 다 버리는 상황이고, 그건 도시 배치에서 나온다.
  //
  // 실측(스폰에서 200m 직진 시도, 5cm 스텝):
  //   우회 없음  이동 25.3m · 막힌 프레임 3495/4000
  //   우회 있음  이동 **198.1m** · 막힌 프레임 **1**/4000
  //
  // 임계 100m 는 그 중간이다 — 우회를 되돌리면 25.3m 로 떨어져 **이 검사가 깨진다.**
  it('스폰에서 200m 직진 — 우회가 없으면 25m 에서 멈춘다', () => {
    const c = createCollider();
    const step = 0.05;
    let x: number = SPAWN.x;
    let z: number = SPAWN.z;
    let moved = 0;
    for (let i = 0; i < 4000; i++) {
      const r = c.resolve(x, z, 0, -step);
      moved += Math.hypot(r.x - x, r.z - z);
      x = r.x; z = r.z;
    }
    expect(moved, '접선 우회가 빠지면 25m 대로 떨어진다').toBeGreaterThan(100);
  });

  it('빈 하늘(막을 것이 없는 좌표)에서는 그대로 간다', () => {
    // 파츠가 없는 곳을 찾을 수 없을 수도 있으므로, 빈 배열을 직접 넣어 확인한다.
    expect(slide(0, 0, 5, 5, [], DEFAULT_BODY_R)).toEqual({ x: 5, z: 5 });
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

// ── §5 게이트 — 스모크가 "안 돌아다닌 세션" 을 잡는가 (G-COL1) ──────────────
//
// 이 절이 생긴 경위가 이 파일에서 가장 중요한 교훈이다. 충돌을 붙이자 스모크 세션이
// 스폰 앞 분수대에서 **6.9m 만 걷고 멈췄고**, 개수 게이트 `[7]`·`[7.6]` 은 **PASS 를
// 보고했다.** 거짓말이 아니었다 — 아무 데도 안 갔으니 아무것도 안 늘었다.
//
// **게이트가 재는 축이 "개수" 였고, 그 축이 유효할 조건("세션이 실제로 움직였다")을
// 아무도 안 봤다.** 그 조건을 판정으로 만든 것이 `coverageOf` + `covOk` 이고, 여기서
// 그 판정 함수의 검출력을 확인한다.
describe('§5 게이트 — coverageOf 가 제자리 세션을 잡는다', () => {
  it('제자리에 머문 세션은 재방문 0 이다 — 이것이 압축의 존재 이유다', () => {
    // 충돌 도입 직후 실제로 났던 모양: 같은 칸에서 leg 를 다 소모한다.
    const c = coverageOf(['0,0', '0,0', '0,0', '0,0', '0,0']);
    expect(c.unique).toBe(1);
    expect(c.revisits).toBe(0);
  });

  it('연속 중복을 압축하지 않으면 제자리가 재방문으로 세어진다 — 대조 계산', () => {
    // 압축을 뺀 계산(= 예전 방식으로 세면 어떻게 되는가)을 직접 해서, 위 검사가
    // 지키는 것이 무엇인지 못 박는다. **압축 없이 세면 재방문 4 로 통과해 버린다.**
    const seq = ['0,0', '0,0', '0,0', '0,0', '0,0'];
    const naive = seq.length - new Set(seq).size;
    expect(naive).toBe(4);
    expect(coverageOf(seq).revisits).toBe(0);
  });

  it('건너갔다 돌아온 세션은 고유 3·재방문 2 다', () => {
    const c = coverageOf(['0,0', '0,-1', '0,-2', '0,-1', '0,0']);
    expect(c.unique).toBe(3);
    expect(c.revisits).toBe(2);
  });

  it('한 칸 안에서 여러 leg 를 걸어도 고유 수는 안 늘어난다', () => {
    const c = coverageOf(['0,0', '0,0', '0,-1', '0,-1', '0,-1', '0,0']);
    expect(c.unique).toBe(2);
    expect(c.revisits).toBe(1);
  });

  // ── 임계 비교식 자체 — **검수관 조건 1** (2026-08-08) ─────────────────────
  //
  // 위 네 검사는 `coverageOf`(세는 함수)만 본다. **그 결과를 합격/불합격으로 바꾸는
  // 비교식은 아무도 안 봤다.** 검수관이 `/tmp` 별도 클론에서 `covOk = true` 로 고정하는
  // 뮤테이션을 돌렸더니 이 파일 26건이 **전부 그대로 통과**했다.
  //
  // 즉 이 게이트가 잡으려던 사고("아무 데도 안 갔는데 PASS")를 **판정식이 죽는 방식으로
  // 똑같이 재현**할 수 있었고 CI 는 초록이었다. 그래서 `covOkOf` 를 함수로 뽑고 여기서
  // 직접 겨냥한다 — §6(배선)보다 **한 층 아래**를 메우는 것이지 §6 을 대체하지 않는다.
  describe('covOkOf — 두 조건이 모두 필요하다', () => {
    it('고유 파셀이 부족하면 불합격', () => {
      expect(covOkOf({ unique: 2, revisits: 1, path: [] })).toBe(false);
    });

    it('재방문이 0 이면 불합격 — 스모크가 실제로 이 모양으로 FAIL 했다', () => {
      // 실측 경로 `0,0 → 0,-1 → 1,-1 → 2,-1`: 고유 4 인데 재방문 0.
      // `&&` 를 `||` 로 바꾸면 이 케이스가 통과해 버린다 — 그 뮤테이션을 이 검사가 잡는다.
      expect(covOkOf({ unique: 4, revisits: 0, path: [] })).toBe(false);
    });

    it('둘 다 채우면 합격', () => {
      expect(covOkOf({ unique: 3, revisits: 1, path: [] })).toBe(true);
    });

    it('넉넉히 채워도 합격 — 임계가 상한이 아니다', () => {
      expect(covOkOf({ unique: 5, revisits: 3, path: [] })).toBe(true);
    });
  });

  // ── 복귀 재조준 수학 (스모크 FAIL 이 만든 것) ────────────────────────────
  //
  // `look(π)` 뒤돌기는 **갈 때 경로가 직선일 때만** 왕복이 된다. 우회가 붙어 대각으로
  // 흐르자 그 전제가 깨져 재방문 0 으로 FAIL 했다. 방향을 회전량이 아니라 **목표 좌표**로
  // 정의하는 쪽으로 바꿨고, 그 산술을 여기서 못 박는다.
  describe('yawToward / shortestTurn — 출발점으로 재조준', () => {
    it('-z 쪽 목표는 yaw 0 이다 — facing(0) = (0,-1) 이므로', () => {
      expect(yawToward({ x: 0, z: 0 }, { x: 0, z: -10 })).toBeCloseTo(0, 6);
    });

    it('+z 쪽 목표는 yaw ±π 다 — 뒤돌기와 같은 값이어야 한다', () => {
      expect(Math.abs(yawToward({ x: 0, z: 0 }, { x: 0, z: 10 }))).toBeCloseTo(Math.PI, 6);
    });

    it('facing(yawToward(...)) 가 실제로 목표를 향한다 — 규약을 직접 대조한다', () => {
      // 값을 손으로 적지 않는다. `player.ts` 의 `facing` 을 그대로 불러 방향을 확인한다 —
      // 그 규약이 바뀌면 이 검사가 먼저 깨져야 한다.
      for (const to of [{ x: 5, z: -3 }, { x: -8, z: 12 }, { x: 0, z: -1 }, { x: 7, z: 0 }]) {
        const f = facing(yawToward({ x: 0, z: 0 }, to));
        const len = Math.hypot(to.x, to.z);
        expect(f.x).toBeCloseTo(to.x / len, 6);
        expect(f.z).toBeCloseTo(to.z / len, 6);
      }
    });

    it('최단 회전으로 정규화한다 — 350° 를 한 바퀴 돌지 않는다', () => {
      // 정규화가 없으면 이 값이 +6.11(오른쪽으로 350°)이 되어 세션이 헛돈다.
      expect(shortestTurn(0, Math.PI * 2 - 0.17)).toBeCloseTo(-0.17, 6);
      expect(shortestTurn(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2, 6);
    });
  });
});

// ── §6 게이트 배선 — 커버리지가 판정에 실제로 곱해지는가 (정적·약함) ────────
// §4 와 같은 성격의 약한 검사다. 스모크 모듈은 브라우저를 띄우므로 단위 테스트로
// 돌릴 수 없고, **진짜 축은 executor 스모크 회차**다. 여기서 보는 것은 "판정식에서
// 커버리지가 빠지지 않았는가" 하나다 — 그것이 빠지면 `coverageOf` 는 계산만 하고
// 아무것도 막지 않는 장식이 된다(이 저장소가 여러 번 겪은 형태다).
describe('§6 게이트 배선 — covOk 가 pass 와 status 에 닿는다 (정적·약함)', () => {
  const inv = readFileSync('scripts/smoke/measure-invariants.mjs', 'utf8');
  const run = readFileSync('scripts/smoke/run.mjs', 'utf8');

  it('measure-invariants 의 pass 가 covOk 를 곱한다', () => {
    expect(inv).toMatch(/const\s+pass\s*=[\s\S]{0,200}?covOk/);
  });

  it('run.mjs 가 [7]·[7.6] 에 covOk 를 하드 실패로 넘긴다 — observe 에서도 FAIL', () => {
    // `perfStatus(pass, errors, hard)` 의 셋째 인자. observe 모드에서 INFO 로 내려가면
    // CI 에서 무력해지므로 **하드 축**이어야 한다.
    const calls = run.match(/perfStatus\(r\.pass,\s*r\.errors,\s*!r\.covOk\)/g) ?? [];
    expect(calls.length, '[7]·[7.6] 두 곳 다 넘겨야 한다').toBe(2);
  });

  it('세션이 -z 고정 6회가 아니다 — 막히면 방향을 튼다', () => {
    // 옛 형태(`for (let i = 0; i < WALK_LEGS; i++)` 안에서 move 만)는 배치에 막히면
    // 0m 세션이 된다. 방향 전환이 사라지면 이 검사가 잡는다.
    expect(inv).toMatch(/TURN_RAD/);
    expect(inv).toMatch(/STUCK_M/);
  });
});

// ── 동결이 충돌에도 먹는가 (W4 ④) ───────────────────────────────────────────
//
// `collide.ts` 가 선언한 것은 **«보이는 자리 = 막히는 자리»** 다. 렌더(빌더)와 충돌이
// 각자 배치를 구하므로, 한쪽만 동결을 보면 그 선언이 깨진다 — 증상은 둘이고 **둘 다
// 화면에서만** 드러난다: 옮긴 건물을 통과해 걸어지거나, 지운 건물이 보이지 않는 벽으로
// 남는다.
//
// ⚠ 캐시 무효화가 이 절의 절반이다. 캐시는 «플레이어가 선 파셀» 로만 갱신되는데
// (`rebuild` 의 `cachePx`/`cachePz`), 편집 중에는 **제자리에 선 채** 건물을 옮기는 것이
// 기본 자세다. 그러면 파셀이 안 바뀌어 캐시가 그대로 남는다.

describe('충돌이 동결을 본다 (W4 ④)', () => {
  const CELL = 32;
  /** 파셀 (0,0) 로컬 (6, 0) 에 건물 하나 — 원점에서 +x 로 6m */
  const at = (x: number, z: number): PlacedPart[] =>
    [{ kind: 'building', x, y: 0, z, ry: 0, sx: 3, sy: 3, sz: 3, tone: 0 } as PlacedPart];

  /**
   * 원점에서 **건물 자리(+x 6m)로** 걸어 실제로 얼마나 갔나.
   *
   * ⚠ 목표를 건물 **안**에 두는 것이 조건이다. 첫 판본은 12m 를 걸었는데 그 목표가
   * 건물 반대편(반경 ~1.7m + 몸 0.34m 밖)이라 **막는 코드가 있어도 통과**했다 —
   * 네 축이 한꺼번에 빨간불이 되어 드러났다. 「막힌다」를 재려면 막히는 자리를 찍어야 한다.
   */
  const walkX = (c: ReturnType<typeof createCollider>): number =>
    c.resolve(0, 0, 6, 0).x;

  it('★ 동결이 없으면 예전 그대로 — 계산 배치로 막는다', () => {
    const a = createCollider();
    const b = createCollider({ frozenAt: () => null });
    expect(walkX(b), '★ null(안 손댔다)이 계산 경로를 안 탔다').toBe(walkX(a));
  });

  it('★ 동결한 건물이 막는다 — 계산에는 없는 자리다', () => {
    const c = createCollider({ frozenAt: (px, pz) => (px === 0 && pz === 0 ? at(6, 0) : []) });
    // 건물 반경(sx 3)만큼 막히므로 6m 까지 못 간다.
    expect(walkX(c), '★ 동결한 건물을 통과했다 — 화면에 있는 것이 안 막는다').toBeLessThan(6);
  });

  it('★ 빈 배열로 동결하면 막을 것이 없다 — 「다 지웠다」', () => {
    const c = createCollider({ frozenAt: () => [] });
    expect(walkX(c), '★ 지운 건물이 보이지 않는 벽으로 남았다').toBe(6);
  });

  it('★ 옮기면 옛 자리는 뚫리고 새 자리가 막는다', () => {
    let parts = at(6, 0);
    const c = createCollider({ frozenAt: (px, pz) => (px === 0 && pz === 0 ? parts : []) });
    expect(walkX(c)).toBeLessThan(6);

    // 건물을 옆으로 치운다(+z 로 20m).
    parts = at(6, 20);
    c.invalidate();
    expect(walkX(c), '★ 옮겼는데 옛 자리에 계속 막힌다').toBe(6);
  });

  it('★ `invalidate` 없이는 안 바뀐다 — 그래서 그 문이 계약의 일부다', () => {
    // 이 축은 «캐시가 실제로 있다» 를 못 박는다. 캐시가 없어지면 빨간불이 되고,
    // 그때 `invalidate` 와 그 호출부(`main.ts`)를 함께 재검토하게 된다.
    let parts = at(6, 0);
    const c = createCollider({ frozenAt: (px, pz) => (px === 0 && pz === 0 ? parts : []) });
    expect(walkX(c)).toBeLessThan(6);
    parts = at(6, 20);
    expect(
      walkX(c),
      '★ 캐시가 사라졌다 — `invalidate` 의 존재 이유를 다시 판정하라(지금은 무해하다)',
    ).toBeLessThan(6);
  });

  it('손대지 않은 파셀은 계산 그대로 — 경계는 파셀 단위다', () => {
    const only00 = createCollider({ frozenAt: (px, pz) => (px === 0 && pz === 0 ? [] : null) });
    const plain = createCollider();
    // ⚠ `count()` 전에 `resolve` 를 한 번 태운다 — 캐시는 `resolve` 가 만든다.
    // 첫 판본은 그냥 `count()` 를 불러 **둘 다 0** 이었고, 그것이 「비었다」로 읽혔다.
    only00.resolve(0, 0, 0, 0);
    plain.resolve(0, 0, 0, 0);
    // 파셀 (0,0) 만 비웠으므로 이웃 파셀의 원은 그대로 남아야 한다.
    expect(only00.count(), '★ 한 파셀을 비웠더니 3×3 이 통째로 비었다').toBeGreaterThan(0);
    expect(only00.count()).toBeLessThan(plain.count());
  });
});

describe('배선 — main.ts 가 충돌에도 동결을 먹이는가 (정적·약함)', () => {
  const src = readFileSync('frontend/js/world2/main.ts', 'utf8');

  it('collider 에 frozenAt 을 주입한다', () => {
    expect(src, '★ 렌더만 동결을 본다 — 「보이는 자리 = 막히는 자리」가 깨진다')
      .toMatch(/createCollider\(\{[\s\S]{0,200}frozenAt:\s*\(px,\s*pz,\s*tier\)\s*=>\s*village\.lookup\(/);
  });

  it('동결이 바뀌면 충돌 캐시도 버린다', () => {
    expect(src, '★ 제자리에서 옮기면 옛 자리에 계속 막힌다')
      .toMatch(/collider\.invalidate\(\)/);
  });
});
