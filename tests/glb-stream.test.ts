// 거리 컬링(`world-glb/systems/glb-stream.ts`)의 **검출력**.
//
// ── 왜 브라우저가 없어도 되나 ───────────────────────────────────────────────
// 그 파일은 런타임 import 가 **0개**다(`import type` 둘뿐). 셀 목록을 `userData` 에서
// 읽고 `visible` 을 토글할 뿐이라 **평범한 객체**로 검사된다 — three 도 캔버스도 없다.
//
// ── 무엇을 막는가 (검수관 명세 GS-C1·GS-C2, 2026-08-27) ─────────────────────
// 이 시스템은 도입 회차에 **한 번도 등록되지 않은 채** 통과했다. `kernel.add` 가
// `kernel.start()` 앞인데 실체는 예열 뒤에 만들어져 그 시점에 늘 `null` 이었다.
// 그런데 진단은 `457/457` 을 냈고 **그 값은 「전부 반경 안」의 정상 출력과 같았다** —
// 스윕이라는 우회로로 잡은 것이지 진단이 알려준 게 아니다.
//
// 그래서 두 축을 함께 못 박는다: ① 거리 판정이 실제로 맞는가 ② **「안 쟀다」가
// 「정상」과 구별되는가.** ②가 없으면 같은 사고가 재발해도 똑같이 초록이다.

import { describe, it, expect } from 'vitest';
import { createGlbStream } from '../frontend/js/world-glb/systems/glb-stream.js';

/** 셀 하나를 흉내낸다. 트리의 `InstancedMesh` 가 갖는 것만 갖는다 */
function cell(x: number, z: number, r: number) {
  return { visible: true, userData: { cellCenter: { x, z }, cellRadius: r } };
}
/** `loose` 로 옮겨진 노드 — 셀 정보가 없다 */
function loose() {
  return { visible: true, userData: {} };
}

const tick = (t: number) => ({ dt: 0.016, ageMs: t, frame: 1, hidden: false, resumed: false });

describe('거리 컬링', () => {
  it('반경 밖 셀은 꺼지고 안쪽은 켜진다 — **셀 가장자리**로 잰다', () => {
    const near = cell(0, 0, 10);      // 중심 0m · 가장자리 -10 → 언제나 안
    const edge = cell(0, 100, 10);    // 중심 100m · 가장자리 90m
    const far = cell(0, 500, 10);     // 가장자리 490m
    const s = createGlbStream({
      root: { children: [near, edge, far] } as never,
      getPosition: () => ({ x: 0, z: 0 }),
      radius: 95,
    });
    s.update(tick(1000) as never);
    expect(near.visible, '가까운 셀이 꺼졌다').toBe(true);
    // 가장자리 90m < 반경 95m → 켜져야 한다. **중심(100m)으로 재면 꺼진다** —
    // 이 단언이 「가장자리로 잰다」를 못 박는 자리다.
    expect(edge.visible, '셀 가장자리가 반경 안인데 꺼졌다 — 중심으로 재고 있다').toBe(true);
    expect(far.visible, '먼 셀이 안 꺼졌다').toBe(false);
    expect(s.stats().on).toBe(2);
  });

  it('셀 정보가 없는 노드는 **건드리지 않는다** — 어디 있는지 모르는 것을 끄면 사라진다', () => {
    const orphan = loose();
    const far = cell(0, 900, 10);
    const s = createGlbStream({
      root: { children: [orphan, far] } as never,
      getPosition: () => ({ x: 0, z: 0 }),
      radius: 50,
    });
    s.update(tick(1000) as never);
    expect(orphan.visible, 'loose 노드를 껐다').toBe(true);
    expect(far.visible).toBe(false);
    // 전체 셀 수에도 안 들어간다 — 판정 대상이 아니다.
    expect(s.stats().total).toBe(1);
  });

  it('**「한 번도 안 쟀다」가 「정상」과 구별된다** — 이 시스템이 죽었던 그 형태다', () => {
    const a = cell(0, 0, 10);
    const b = cell(0, 10, 10);
    const s = createGlbStream({
      root: { children: [a, b] } as never,
      getPosition: () => ({ x: 0, z: 0 }),
      radius: 1000,   // 전부 반경 안 — update 가 돌면 on === total 이 된다
    });
    // 아직 안 돌았다. `on` 이 `total` 과 같으면 **죽은 것과 정상이 구별되지 않는다.**
    expect(s.stats().ticks, '판정 횟수가 0 이 아니다').toBe(0);
    expect(s.stats().on, '안 쟀는데 정상값을 보고한다 — 등록 누락이 초록으로 통과한다')
      .toBe(-1);
    s.update(tick(1000) as never);
    // 돌고 나서야 「전부 켜짐」이 된다. 두 상태가 다른 값이어야 한다.
    expect(s.stats().ticks).toBe(1);
    expect(s.stats().on).toBe(2);
    expect(s.stats().total).toBe(2);
  });

  it('주기 안에는 다시 판정하지 않는다 — 매 프레임 돌 필요가 없다', () => {
    const c = cell(0, 0, 10);
    const s = createGlbStream({
      root: { children: [c] } as never,
      getPosition: () => ({ x: 0, z: 0 }),
      radius: 100,
      everyMs: 350,
    });
    s.update(tick(1000) as never);
    s.update(tick(1100) as never);   // 100ms 뒤 — 주기 안
    expect(s.stats().ticks, '주기 안인데 또 돌았다').toBe(1);
    s.update(tick(1400) as never);   // 400ms 뒤 — 주기 밖
    expect(s.stats().ticks).toBe(2);
  });
});
