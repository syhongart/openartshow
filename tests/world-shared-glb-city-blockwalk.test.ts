// 미술관을 **걷기 격자에 알리는 문** — 그 문이 없는 세계에서 코드 경로가 안 바뀐다는 축.
//
// 감독 신고 2026-09-19: *"벽사이를 걸어가네"* — 치비가 미술관 벽을 통과해 걸었다.
// 미술관은 `env.scene.add(g)` 로 **씬에 직결**되므로 세계 GLB 에서 구운 격자에 없다.
// 고치는 자리는 「미술관을 아는 코드」가 아니라 **붙는 시점에 알리는 일반 문**이고
// (팀장 판정 (B) 조건 7), 그 문은 **선택적**이어야 한다 — `world-shared/glb-city.ts` 는
// world2·world3·world5·world7·world8·world10 이 함께 쓰는 공유 본체다.
//
// 🔴 **이 파일이 재는 것은 「훅이 없으면 아무 일도 안 일어난다」이다.** 팀장이 안 (C)를
// 기각한 사유가 *"확인 안 한 공유 본체 변경은 되돌리기 비용을 알 수 없는 변경"* 이었고,
// 그 확인이 여기다.

import { describe, it, expect } from 'vitest';
import { blockPlaced } from '../frontend/js/world-shared/glb-city.js';

/** `children` 만 가진 가짜 루트 — 이 함수가 요구하는 것이 그것뿐이다(ISP) */
function fakeRoot(n: number): { children: unknown[] } {
  return { children: Array.from({ length: n }, (_, i) => ({ id: i })) };
}

describe('세운 채를 걷기 격자에 알리는 문', () => {
  it('🔴 **훅이 없으면 한 번도 안 부른다** — 다른 여섯 세계가 안 바뀐다', () => {
    const root = fakeRoot(3);
    expect(blockPlaced(root as never, undefined)).toBe(0);
  });

  it('훅이 있으면 **세운 채마다** 그 노드를 넘긴다', () => {
    const root = fakeRoot(3);
    const got: unknown[] = [];
    const n = blockPlaced(root as never, (o) => { got.push(o); });
    expect(n, '알린 채의 수가 세운 채의 수와 다르다').toBe(3);
    // **그 노드 자체**를 넘겨야 한다 — 루트를 넘기면 여러 채가 한 덩어리로 칠해진다
    expect(got).toEqual(root.children);
  });

  it('채가 하나도 없으면 0 이다 — 「안 세워졌는데 막았다」가 안 생긴다', () => {
    let called = 0;
    expect(blockPlaced(fakeRoot(0) as never, () => { called++; })).toBe(0);
    expect(called).toBe(0);
  });
});
