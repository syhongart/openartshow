// world-glb/decide/glb-nodes.ts — GLB 노드 이름 규약. 순수.
//
// ── 문자열 재기입 방지 ────────────────────────────────────────────────────────
// 생성기와 런타임 로더가 같은 이름을 쓰게 둔다. 한 곳에서 정의하고 양쪽이 참조한다.
//
// `tests/nyc-gen.test.ts` 가 「두 값이 갈리면 여기서 깨진다」를 단언한다
// (팀장 조건 ②).

/**
 * 실내 조명 노드의 이름 접미사.
 *
 * 전체 패턴: `bld.<n>.room.<r>.light` (예: `bld.2.room.1.light`)
 */
export const ROOM_LIGHT_SUFFIX = '.light';

/**
 * 노드 이름이 실내 조명 노드인지 확인한다.
 *
 * 패턴: `bld.<n>.room.<r>.light` (n·r은 정수)
 */
export function isRoomLightNode(name: string): boolean {
  return /^bld\.\d+\.room\.\d+\.light$/.test(name);
}
