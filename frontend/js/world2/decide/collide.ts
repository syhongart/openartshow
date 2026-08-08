// world2 플레이어 충돌 — **판정만.** 씬도 three 도 모른다.
//
// ── 왜 (감독 실기기 2026-08-03, 태스크 #182) ────────────────────────────────
// *"world2 에 플레이어 충돌이 없다 — 건물·나무·지형을 전부 통과한다."*
//
// ── 감독이 준 제약이 그대로 설계다 (2026-08-08) ─────────────────────────────
// *"이거 하면 많이 무거워지지 않나. 디테일하게 하지말고. 그리고 별도의 파일로 관리해."*
//
// 그래서 셋을 지킨다:
// ① **원 하나로 막는다.** 건물 모양을 따라가지 않는다 — 파츠마다 `footprint(p)` 가
//    **이미 점유 반경을 선언**하고 있고(`parts/*.ts`), 배치 로직이 겹침을 피할 때 쓰는
//    바로 그 값이다. 충돌이 그 값을 재사용하면 **"보이는 자리 = 막히는 자리" 가 구조적으로
//    같아진다** — 따로 관리하는 두 번째 진실이 생기지 않는다.
// ② **가볍다.** 여기는 순수 산술뿐이고, 몇 개를 검사할지는 호출자(`systems/collision.ts`)가
//    근처 파셀로 좁힌다. 씬에 아무것도 안 넣으므로 드로우콜·지오메트리가 늘지 않는다.
// ③ **별도 파일.** 판정은 여기, 캐시·조회는 `systems/collision.ts`, 집행은 `player.ts`
//    한 줄. 나중에 방식을 바꾸거나 꺼야 할 때 이 두 파일만 본다.
//
// ── Y 축을 안 보는 이유 ────────────────────────────────────────────────────
// world2 의 지면은 **완전 평면(상면 y=0)** 이다 — 높이맵도 terrain 함수도 없다(실측:
// `parts/ground.ts` 가 파셀당 판 1장을 y=0 에 깐다). 플레이어 눈높이도 상수 + 헤드밥이고
// 물에서만 내려간다. 그래서 *"지형을 통과한다"* 는 **땅으로 꺼진다는 뜻이 아니라 건물·나무를
// 수평으로 지나간다는 뜻**이고, XZ 2D 판정이면 충분하다.
//
// ── 이 파일이 **하지 않는 것** ─────────────────────────────────────────────
// · **높이 구분이 없다.** 벤치처럼 낮은 것도 똑같이 막는다(넘어가지 못한다). world1 은
//   `STEP_OVER` 로 낮은 것을 넘게 했는데, 그 축을 넣으려면 프록시에 `top` 이 필요하고
//   *"디테일하게 하지 말라"* 는 지시와 어긋난다. **넘어야 할 것이 생기면 그때 연다.**
// · **회전을 안 본다.** `PlacedPart.ry` 가 있지만 원은 회전에 불변이라 무시한다 — 긴 건물을
//   길이 방향으로 지나갈 때 실제 벽보다 조금 일찍 막힌다(`footprint` 가 `max(sx,sz)/2` 라서).
//   박스로 바꾸면 정확해지지만 판정 비용과 코드가 같이 는다.
// · **터널링을 안 막는다.** 한 프레임 이동량이 반경보다 크면 통과할 수 있다. 지금 걷기
//   속도(수 m/s)와 프레임 간격에서는 도달하지 않지만, **속도를 크게 올리면 열리는 구멍**이다.
// · **GLB 시티 건물은 대상이 아니다.** 그쪽은 크기를 런타임 `Box3` 로 재고 배치도 별도
//   경로다(`features/glb-city.ts`). 붙이려면 그 크기를 캐시해 `Blocker` 로 넘겨야 한다.

import type { PlacedPart } from '../parts/types.js';
import { specFor } from '../parts/index.js';

/** 막는 원 하나. 월드 좌표계다(파셀 원점이 이미 더해져 있다). */
export interface Blocker {
  x: number;
  z: number;
  /** 점유 반경(m). 파츠의 `footprint(p)` 를 그대로 쓴다 */
  r: number;
}

/**
 * 파셀 배치 결과를 막는 원 목록으로 바꾼다.
 *
 * `ox`·`oz` 는 파셀 원점(`px * cellX`, `pz * cellZ`) — `PlacedPart` 의 좌표는 파셀 기준
 * 오프셋이고 원점 가산은 호출자 몫이라는 규약을 그대로 따른다(`parts/types.ts`).
 *
 * **반경 0 은 버린다.** 지면·도로·정원이 `footprint: () => 0` 으로 선언돼 있어 —
 * *"이건 밟고 지나가는 것"* 이라는 뜻이 이미 파츠 쪽에 적혀 있다. 여기서 다시 종류를
 * 나열하지 않는다(값 미러링이 된다).
 */
export function blockersOf(parts: readonly PlacedPart[], ox: number, oz: number): Blocker[] {
  const out: Blocker[] = [];
  for (const p of parts) {
    const r = specFor(p.kind)?.footprint(p) ?? 0;
    if (r > 0) out.push({ x: ox + p.x, z: oz + p.z, r });
  }
  return out;
}

/** 이 좌표가 어떤 원 안에 있는가. `bodyR` 은 플레이어 반경. */
export function blocked(x: number, z: number, blockers: readonly Blocker[], bodyR: number): boolean {
  for (const b of blockers) {
    const dx = x - b.x;
    const dz = z - b.z;
    const rr = b.r + bodyR;
    if (dx * dx + dz * dz < rr * rr) return true;
  }
  return false;
}

/**
 * 이동을 해석한다 — 막히면 **벽을 따라 미끄러진다.**
 *
 * **축을 나눠 따로 시도한다**(X 먼저, 그다음 Z). 한 번에 밀면 벽에 비스듬히 부딪혔을 때
 * 통째로 멈춰서 **끼인 것처럼 느껴진다.** 나눠 시도하면 막힌 축만 버려지고 나머지 축은
 * 살아서, 벽에 붙어도 옆으로 계속 걸어진다. world1·방문자뷰가 쓰던 방식과 같다.
 *
 * 시작점이 이미 원 안이면(스폰이 겹쳤거나 파츠가 나중에 들어온 경우) **그대로 통과시킨다** —
 * 밀어내려다 더 깊이 밀어 넣는 것보다, 걸어 나올 수 있게 두는 쪽이 회복 가능하다.
 */
export function slide(
  x: number, z: number,
  dx: number, dz: number,
  blockers: readonly Blocker[],
  bodyR: number,
): { x: number; z: number } {
  if (blockers.length === 0) return { x: x + dx, z: z + dz };
  // 갇힌 채로 시작하면 판정을 끈다. 안 그러면 두 축이 다 막혀 영원히 못 나온다.
  if (blocked(x, z, blockers, bodyR)) return { x: x + dx, z: z + dz };

  let nx = x;
  let nz = z;
  if (dx !== 0 && !blocked(x + dx, nz, blockers, bodyR)) nx = x + dx;
  if (dz !== 0 && !blocked(nx, z + dz, blockers, bodyR)) nz = z + dz;
  return { x: nx, z: nz };
}
