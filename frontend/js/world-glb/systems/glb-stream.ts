// world-glb/systems/glb-stream.ts — **안개 너머의 격자 셀을 끈다.**
//
// ── 감독 지시 2026-08-27 ────────────────────────────────────────────────────
// *"저 지엘비를 우리 시스템에 박아버리면. 가능할 문제인가."* → *"개선 작업해야지."*
//
// world2 는 파셀 스트리밍으로 **근처만** 세운다. world8 은 GLB 가 통째로 하나라 그
// 장치가 안 걸렸고, 그 대가가 감독 실기기 리포트에 찍혔다 — **삼각형 2,110,989**,
// 이 저장소가 잡아 둔 예산(`decide/adapt.ts` 의 `TRI_BUDGET = 60,000`)의 **35배**다.
//
// ── 왜 이것이 「화면을 안 바꾸는」 최적화인가 ────────────────────────────────
// 같은 리포트에 **안개far 76.8** 이 찍혀 있었다(`fogBand(CELL_X)` = 32m × 2.40).
// **76.8m 너머는 이미 안개가 완전히 덮는다.** 그런데 카메라 far 는 하늘 돔 기준(1200m)
// 이라 1km 밖 건물까지 그리고 있었다 — **보이지도 않는 것을 그린 것이다.**
//
// 그러므로 이 최적화는 「멀리 있는 것을 포기한다」가 아니라 **「안 보이는 것을 안 그린다」**
// 다. 감독 판정 축(화면)을 안 건드린다.
//
// ── 왜 프러스텀 컬링으로는 부족했나 ─────────────────────────────────────────
// `glb-instance.js` 의 격자는 이미 프러스텀 컬링을 되살렸다(화면 «밖» 은 안 그린다).
// 그러나 화면 «안» 이면 거리와 무관하게 그린다 — 정면을 보면 그 방향 1km 가 전부 대상이다.
// 프러스텀은 **방향**을 보고 이 시스템은 **거리**를 본다. 둘은 직교한다.
//
// ── 못 하는 것 ──────────────────────────────────────────────────────────────
// · **메모리는 안 준다.** GLB 는 통째로 받아야 열리고, 인스턴스는 이미 다 만들어져 있다.
//   여기서 줄이는 것은 **그리는 것**뿐이다(world2 파셀은 «만들지 않아» 메모리도 준다).
// · **LOD 가 아니다.** 멀리 있는 것을 «단순하게» 그리지 않는다 — GLB 에 단순한 판본이
//   없기 때문이다(백로그 `G-W8N` 의 처방 후보 ⓐ). 여기서는 켜거나 끌 뿐이다.
// · 셀 «가장자리» 판정이라 셀보다 작은 물건 단위로는 못 자른다. 셀 크기가 곧 해상도다.

import type { Object3D } from 'three/webgpu';
import type { FrameCtx, System } from '../kernel.js';

export interface GlbStreamOptions {
  /** 인스턴싱 결과 그룹. 자식들의 `userData.cellCenter`·`cellRadius` 를 읽는다 */
  root: Object3D;
  /** 지금 플레이어 위치 */
  getPosition: () => { x: number; z: number };
  /**
   * 이 거리(m) 안의 셀만 켠다. **안개 far 에서 유도한다** — 여기 상수를 박지 않는다.
   * 안개가 완전히 덮는 거리 너머는 그려도 안 보인다.
   */
  radius: number;
  /**
   * 판정 주기(ms). 매 프레임 돌 필요가 없다 — 셀이 수십 m 라 한 프레임에 넘나들 수 없다.
   * 짧으면 정확하고 길면 싸다.
   */
  everyMs?: number;
}

/** 기본 판정 주기. `glb-collide.js` 의 근처 목록 갱신과 같은 값이다(같은 성격의 일이다) */
const DEFAULT_EVERY_MS = 350;

interface Cell {
  node: Object3D & { visible: boolean };
  x: number;
  z: number;
  r: number;
}

/**
 * 셀 단위 거리 컬링. `kernel` 에 등록하면 주기마다 `visible` 을 토글한다.
 *
 * ⚠ **`visible` 만 만진다** — 씬에서 빼지 않는다. 빼고 넣으면 three 가 매번 행렬을
 * 다시 계산하고, 그 비용이 아끼려던 것을 먹는다. `visible=false` 면 렌더 목록에
 * 안 오르므로 드로우콜·삼각형이 그만큼 준다.
 */
export function createGlbStream(opts: GlbStreamOptions): System & {
  /**
   * 진단 — 지금 켜진 셀 / 전체 셀.
   * ⚠ `on === -1` 또는 `ticks === 0` 이면 **아직 안 쟀다**(등록 누락일 수 있다).
   */
  stats(): { on: number; total: number; radius: number; ticks: number };
} {
  const every = opts.everyMs ?? DEFAULT_EVERY_MS;
  const cells: Cell[] = [];
  for (const child of opts.root.children) {
    const ud = (child as { userData?: { cellCenter?: { x: number; z: number }; cellRadius?: number } }).userData;
    // 셀 정보가 없는 것(`loose` 로 옮겨진 노드)은 **건드리지 않는다** — 어디에 속하는지
    // 모르는 것을 끄면 조용히 사라진다.
    if (!ud?.cellCenter || typeof ud.cellRadius !== 'number') continue;
    cells.push({
      node: child as Cell['node'],
      x: ud.cellCenter.x,
      z: ud.cellCenter.z,
      r: ud.cellRadius,
    });
  }

  let nextAt = -1;
  /**
   * 지금 켜진 셀. **`-1` 은 「아직 한 번도 안 쟀다」다** — `cells.length` 로 초기화하지
   * 않는 것이 요점이다(검수관 블로커 B4, 2026-08-27).
   *
   * ⚠ **이 시스템은 이번 회차에 이미 한 번 완전히 죽어 있었다** — `kernel.add` 가
   * 등록 순서 때문에 한 번도 안 불렸는데 진단은 `457/457` 을 냈고, 그 값은 「전부 반경
   * 안」의 **정상 출력과 완전히 같았다.** 스윕이라는 우회로로 잡은 것이지 진단이 알려준
   * 게 아니다. 같은 상태가 재발해도 똑같이 초록이었을 것이다.
   *
   * 이 저장소의 *"못 잰 것은 통과가 아니다"* 를 **진단 값 수준으로 내린 것**이다 —
   * 집계 진단의 초기값을 「정상으로 보이는 값」으로 두지 않는다.
   */
  let on = -1;
  /** 판정을 몇 번 돌았는가. `0` 이면 등록이 안 됐거나 첫 주기 전이다 */
  let ticks = 0;

  return {
    name: 'glbStream',
    update(ctx: FrameCtx): void {
      if (ctx.ageMs < nextAt) return;
      nextAt = ctx.ageMs + every;
      const p = opts.getPosition();
      let lit = 0;
      for (const c of cells) {
        // 셀 **가장자리**까지의 거리로 본다 — 중심으로 재면 큰 셀이 억울하게 꺼진다.
        const near = Math.hypot(c.x - p.x, c.z - p.z) - c.r;
        const want = near <= opts.radius;
        if (c.node.visible !== want) c.node.visible = want;
        if (want) lit++;
      }
      on = lit;
      ticks++;
    },
    stats: () => ({ on, total: cells.length, radius: opts.radius, ticks }),
  };
}
