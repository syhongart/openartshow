// world-glb/systems/glb-walkblock.ts — **씬에 나중에 붙는 물건을 걷기 격자에 반영한다.**
//
// ── 왜 `glb-walkmap.ts` 에서 갈라 나왔나 (2026-09-22, 검수관 재판정) ──────────
// 그 파일이 하루에 **세 번** 커졌다(496→501→512→516). 직전 회차에 검수관이 *"함수 여섯이
// 전부 「걷기 격자를 굽고 유지한다」는 단일 축이라 분해 축 없음"* 으로 판정했는데, 같은 날
// 두 커밋이 **굽기와 덧칠 양쪽에서 각자 `floor` 를 추가한 것**이 그 판정을 뒤집는 실증이
// 됐다. 검수관 정정: *"「부팅 1회 vs 물건 부착마다」라는 생명주기 축을 놓쳤다."*
//
// 갈린 것은 **시점과 소비자**다:
//   굽기(`glb-walkmap.ts`)  부팅 1회 · 세계 전체 · 입력은 GLB 루트
//   덧칠(이 파일)            물건이 붙을 때마다 · 그 물건 주변만 · 입력은 씬 노드 하나
//
// ⚠ **공통 순회(`gatherSurfaces`)는 복제하지 않는다** — 저쪽에서 `export` 해 쓴다.
// 복제하면 「굽기는 고쳤는데 덧칠은 옛 규칙」이 되고 그 증상은 원인에서 멀다.
import type { Object3D } from 'three/webgpu';
import {
  judgeCell, pruneUnreachable, blockMargin, type WalkGrid,
} from '../decide/walkable.js';
import { DEFAULT_BODY_R, DEFAULT_KNEE_Y } from './collision.js';
import { gatherSurfaces, walkableCount, type WalkBand } from './glb-walkmap.js';

/**
 * **씬에 붙은 물건 하나를 걷기 격자에 반영한다.** 새 격자를 낸다(입력은 안 바꾼다).
 *
 * **막기만 한다** — 이 물건이 덮은 칸 중 「사람이 못 지나가는」 칸을 0 으로 내린다.
 * 원래 0 이던 칸을 1 로 올리지 않는다(물건이 세계를 여는 일은 없다).
 *
 * **멱등이다** — 같은 물건을 두 번 칠해도 격자가 같다(칸을 덮어쓸 뿐 세거나 뒤집지
 * 않는다). 팀장 조건 1 이 요구한 성질이고 `tests/world-glb-walkmap.test.ts` ⑥ 이 본다.
 *
 * @param object **씬에 개별로 놓인 한 덩어리.** 최종 변환이 확정된 뒤에 넘겨라 —
 *               등장 연출 중간 배수로 부르면 벽 두께가 틀린다.
 * @param margin 장애물을 xz 로 더 넓힐 폭(m). 유도는 `decide/walkable.ts` 의 `blockMargin`.
 */
export function blockMesh(
  grid: WalkGrid, object: Object3D, band: WalkBand, margin: number,
): WalkGrid {
  object.updateMatrixWorld(true);
  const { floorTop, obsLow } = gatherSurfaces(object, grid, band, margin);
  const walk = new Uint8Array(grid.walk);
  // 🔴 **이 물건이 깐 바닥이 그 칸의 바닥이 된다**(경위·실측은 `WalkGrid.floor`).
  // ⚠ **「높은 쪽」이 아니라 「나중에 놓인 것」이 이긴다** — 아래 `walk` 판정의
  // `Math.max(groundY, floorTop)` 과 일부러 다른 규칙이다. 판정은 「지나갈 수 있는가」라
  // 막는 쪽이 이겨야 안전하고, 여기는 「어디에 발을 놓는가」라 **화면에 보이는 면**이
  // 이겨야 한다. ⚠⚠ `walk` 판정은 한 글자도 안 바꿨다 — 이 회차의 경계다.
  // ⚠⚠⚠ **이 규칙은 호출 순서에 의존한다**(검수관 권고 2026-09-22). 같은 칸을 덮는
  // 물건이 둘 이상이 되는 날(건물 바닥 + 그 안 단상) **나중에 칠한 쪽이 이긴다** — 지금은
  // 월드↔건물 하나의 1:1 관계뿐이라 안 터지지만, 물건이 둘이 되는 회차에는 이 줄부터 본다.
  const floor = new Float32Array(grid.floor);
  for (let k = 0; k < walk.length; k++) {
    if (Number.isFinite(floorTop[k])) floor[k] = floorTop[k];
  }
  for (let k = 0; k < walk.length; k++) {
    // 이 물건이 그 칸에 **막을 것을 안 뒀으면** 건너뛴다.
    // ⚠ **이 줄은 판정을 바꾸지 않는다 — 순회 비용을 줄일 뿐이다.** 첫 판본은 여기
    // *"이 검사가 없으면 물건이 없는 칸이 「바닥이 없다」로 읽혀 격자가 통째로 0 이 된다"*
    // 라고 적었고 **거짓이었다**(뮤테이션 M3 실측 2026-09-19: 이 줄을 지워도 30 검사가
    // 전부 통과했다). 아래 `Math.max(groundY, …)` 가 이미 바닥을 세우고 `obsLow` 가
    // `Infinity` 면 판정이 어차피 통과하기 때문이다. 게이트·판정 유효성에 대한 거짓
    // 진술은 다음 사람이 확인을 생략하게 만들어서 그대로 두지 않는다.
    if (!Number.isFinite(obsLow[k])) continue;
    // 밟을 바닥은 **둘 중 높은 쪽**이다: 물건이 제 바닥을 깔았으면 그 위를, 안 깔았으면
    // 세계의 지면을 밟는다. 세계의 바닥 높이는 여기서 안 보이지만, 이 격자가 이미
    // 「걸을 수 있다」고 판정한 칸이므로 거기 바닥이 있고 그것이 `groundY` 평면이다
    // (그 전제는 `bakeWalkmapFor` 의 `groundY: 0` 한 곳이 소유한다).
    if (!judgeCell(Math.max(band.groundY, floorTop[k]), obsLow[k], band.head)) walk[k] = 0;
  }
  return { ...grid, walk, floor };
}

/**
 * **조립부가 부르는 한 줄.** 덧칠하고 → 다시 가지친다 → **제자리에 반영한다.**
 *
 * ── 🔴 왜 **제자리**인가 — 새 객체를 내면 아무 데도 안 닿는다 ───────────────
 * 구운 격자는 부팅 때 **한 번** 공급자로 나간다(`features/npc.ts` 가 `create` 에서
 * `env.walkGrid?.()` 를 읽어 `walkSource(g, …)` 로 감싼다). 그 공급자는 **그 객체의
 * `walk` 배열**을 클로저로 든다. 여기서 새 `WalkGrid` 를 만들어 돌려주면 조립부의 변수만
 * 바뀌고 **걷기는 옛 격자를 계속 본다** — 이 저장소가 *"판정/집행 분리의 구멍 — 경계를
 * 건너는 지점은 아무도 안 본다"* 라고 이름 붙인 바로 그 자리다. 그래서 계산은 순수
 * 함수로 하고 **결과만 같은 배열에 되쓴다.** 반환도 같은 객체다.
 *
 * ── ④ 덧칠 뒤 **반드시** 다시 가지친다 (팀장 조건 1) ────────────────────────
 * 덧칠이 구역을 끊을 수 있다 — 막힌 물건 너머가 섬이 되면 그쪽 치비는 영영 못 돌아온다.
 * 기준점은 **플레이어가 선 자리**다(`bakeWalkmapFor` 와 같은 근거 — 자산 이름을 안 본다).
 *
 * @param start 가지치기 시작점. **플레이어가 선 자리**를 그대로 받는다.
 * @param head  사람 키(m). 조립부의 눈높이를 그대로 받는다 — 굽기와 **같은 값**이어야
 *              두 건물이 같은 규칙으로 판정된다.
 * @returns 입력과 **같은 객체**. 편의를 위한 반환이지 새 격자가 아니다.
 */
export function blockWalkFor(
  grid: WalkGrid,
  object: Object3D,
  head: number,
  start: { readonly x: number; readonly z: number },
): WalkGrid {
  const before = walkableCount(grid);
  // 대역은 **굽기와 같은 인자**다(`bakeWalkmapFor` 한 곳에서 유도된 값을 그대로 쓴다).
  const band: WalkBand = { groundY: 0, step: DEFAULT_KNEE_Y, head };
  const blocked = blockMesh(grid, object, band, blockMargin(DEFAULT_BODY_R));
  const pruned = pruneUnreachable(blocked, start.x, start.z);
  grid.walk.set(pruned.walk);   // 같은 배열에 되쓴다 — 위 「왜 제자리인가」 절
  // 🔴 **바닥도 같은 이유로 되쓴다** — 안 하면 「덧칠은 맞는데 발 높이는 옛 값」이 된다.
  grid.floor.set(pruned.floor);
  const after = walkableCount(grid);
  // 덧칠이 **아무것도 안 막았으면** 그것도 사실이다(물건이 격자 밖이거나 이미 벽 위다).
  // 조용히 0 을 넘기지 않는다 — 「막았다고 적혔는데 안 막혔다」가 가장 찾기 어렵다.
  console.info(
    `[walkmap] 덧칠 — 걸을 수 있는 칸 ${before} → ${after}`
    + ` (막은 것 ${before - after}, 가지치기 포함)`,
  );
  return grid;
}
