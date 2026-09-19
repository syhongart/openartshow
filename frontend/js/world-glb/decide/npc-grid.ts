// world-glb/decide/npc-grid.ts — **치비가 어느 격자를 걷는가.** 순수 판정만.
//
// ── 왜 이 파일이 생겼나 (감독 요구 2026-09-19) ──────────────────────────────
// *"블렌더 파일이 계속 바뀔수있자나. **맨하탄이 홍콩이 될수도** 있고. **매번 치비를
// 수정하지 않아도 자동으로** 다니게."*
//
// 걷기 집행(`features/npc.ts`)은 지금까지 **파셀 도로 격자 하나**만 알았다. GLB 세계에는
// 그 격자가 없어 격자를 굽게 됐고(`systems/glb-walkmap.ts`), 그러자 집행 쪽에 「어느
// 격자인가」에 딸린 판정이 셋 붙었다 — 공급자 선택 · 밴드 단위 환산 · 도달 판정.
// 그 셋을 집행부에 두면 **격자를 바꿀 때마다 집행 코드를 읽어야 한다.** 판정을 여기
// 모아 두면 집행은 「공급자가 답한다」만 알면 된다.
//
// ⚠ **이 파일은 격자를 만들지 않는다.** 굽는 것은 `systems/glb-walkmap.ts` 이고,
// 격자 자료형과 공급자 구현은 `decide/walkable.ts`, 걷기 규칙은 `decide/npc-walk.ts` 다.
// 여기 있는 것은 **셋을 잇는 선택**뿐이다.

import { parcelSource, type Cell, type WalkSource } from './npc-walk.js';
import { walkSource, type WalkGrid } from './walkable.js';

/**
 * 어느 격자를 걸을 것인가. 구운 격자가 있으면 그것, 없으면 **지금까지의 파셀 격자**.
 *
 * ⚠ **`baked` 가 없으면 코드 경로가 한 글자도 안 바뀐다**(world2·world7·world8).
 * `parcelSource` 는 `npc-walk.ts` 가 지금까지 인라인으로 하던 그것이다.
 */
export function chooseWalkSource(
  baked: WalkGrid | null,
  cellX: number,
  cellZ: number,
  bodyRadius: number,
): WalkSource {
  return baked ? walkSource(baked, bodyRadius) : parcelSource(cellX, cellZ);
}

/**
 * 파셀 셀 단위로 정해진 밴드를 **공급자 칸 단위**로 환산한다.
 *
 * 스폰 밴드(`features/npc.ts` 의 `SPAWN_REACH`)는 안개에서 유도한 값이고 **단위가 파셀
 * 셀**이다. 구운 격자는 칸이 사람 몸만 해서 같은 수를 그대로 쓰면 밴드가 100배 좁아진다
 * — 미터를 거쳐 환산한다.
 *
 * ⚠ **파셀 공급자에서는 항등이다**(`src.cell === cellX` 라 나눗셈이 원래 수를 돌려준다).
 * 기존 동작이 그대로라는 뜻이고, 그 불변은 `tests/world-glb-walkmap.test.ts` ② 가 본다.
 */
export function bandCells(src: WalkSource, parcelCells: number, cellX: number): number {
  return Math.max(1, Math.round((parcelCells * cellX) / src.cell));
}

/**
 * 이 격자에서 쓸 **도달 판정**(m). 칸 한 변의 절반을 넘지 않는다.
 *
 * ── 🔴 왜 유도해야 하는가 — 안 하면 목표가 몸보다 **앞서 달린다** (실측 2026-09-19) ──
 * 구운 격자의 칸은 사람 몸만 하다(기본 0.34m). 이웃 칸까지의 거리가 곧 칸 한 변이므로
 * 파셀 기준으로 고른 `arrive`(0.35m)가 **그보다 크다.** 그러면 목표를 세우는 순간 이미
 * 「도착」이라 재조준이 매 프레임 다시 돌고, **목표 칸만 한 칸씩 앞서 나간다.**
 *
 * ⚠ **「사람이 안 움직인다」로는 안 잡힌다** — 목표가 멀어지다 보면 몸은 결국 따라가기
 * 시작한다. 그 뮤테이션(M2)이 검사 18개를 **전부 통과했고**, 잡힌 것은 `features/npc.ts`
 * 진단의 `cellDrift`(몸과 목표 칸의 어긋남)를 만든 뒤였다.
 *
 * 절반인 이유: 목표에 닿기 **전에** 도착으로 읽히면 안 되고(→ 칸보다 작다), 동시에 한
 * 프레임 이동거리(속도 ≤ 1.3m/s × dt ≤ 0.1s = 0.13m)보다는 커야 목표 주변에서 진동하지
 * 않는다. 절반은 그 사이를 어떤 칸 크기에서도 만족하는 가장 단순한 값이다.
 *
 * @param parcelArrive 파셀 격자(32m)를 전제로 고른 값. 거기서는 이 값이 그대로 나온다
 */
export function arriveFor(cell: number, parcelArrive: number): number {
  return Math.min(parcelArrive, cell / 2);
}

/**
 * **차선·회피를 얹는가.** 구운 격자에서는 **안 얹는다**.
 *
 * ── 왜 (실측 2026-09-19) ────────────────────────────────────────────────────
 * 차선 오프셋은 `LANE_BOUND = ROAD_SEG / 2` 에서 유도되고 그것은 **파셀 도로 폭 5m** 다
 * (`decide/npc-lane.ts`). 파셀 세계에서는 경로가 언제나 도로 **중심선**이라 ±1.25m 가
 * 도로 안에 들어온다. 구운 격자는 다르다 — 경로가 통로 안 **아무 칸**이나 지나므로
 * 가장자리 칸에서 1.25m 를 더하면 **벽 안으로 민다.** 합성 세계 실측에서 치비가 통로
 * 경계 칸(z≈2.4, 벽면 2.5)에 그려졌다.
 *
 * 폭을 격자에서 유도할 수는 있지만 **이 회차의 경계 밖이다** — 팀장이 「군중 회피」를
 * 다음 회차로 명시했고 차선·회피는 같은 계층이다. 켜는 것이 아니라 **안 켜는 것**이
 * 경계를 지키는 쪽이다.
 *
 * ⚠ **격자를 안 주는 세계에서는 언제나 참이다** — 코드 경로가 한 글자도 안 바뀐다.
 */
export function lanesOn(baked: WalkGrid | null): boolean {
  return baked === null;
}

/**
 * **몸이 자기 목표 칸에서 얼마나 떨어져 있는가**(m, 전체 최대). 아무도 없으면 `null`.
 *
 * 진단이 읽는 값이고, `arriveFor` 유도가 **실제로 소비되는지**를 보는 유일한 창이다
 * (위 `arriveFor` 의 ⚠ 절). 정상이면 「한 칸 + 도달 판정」을 안 넘는다 — 목표는 언제나
 * 이웃 칸이기 때문이다.
 */
export function cellDriftOf(
  src: WalkSource,
  bodies: ReadonlyArray<{ readonly x: number; readonly z: number; readonly cell: Cell }>,
): number | null {
  if (bodies.length === 0) return null;
  let worst = 0;
  for (const b of bodies) {
    const c = src.center(b.cell.px, b.cell.pz);
    const d = Math.hypot(b.x - c.x, b.z - c.z);
    if (d > worst) worst = d;
  }
  return Number(worst.toFixed(3));
}
