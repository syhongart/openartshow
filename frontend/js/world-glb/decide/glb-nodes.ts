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

/**
 * 실내 조명 색(16진). **값 출처: `docs/nyc/art-direction.md` §2 「전시 조명 `#FFF6EA` (≈3800K)」.**
 *
 * 흰색(`0xffffff`)이 아닌 이유가 그 표에 적혀 있다 — 전시 조명은 중성 온백색이고,
 * 흰색 광원은 벽면 아이보리를 푸르게 민다. 값을 바꾸려면 그 표를 먼저 고친다(미러링 금지).
 */
export const ROOM_LIGHT_COLOR = 0xfff6ea;

/**
 * 실내 조명 강도(three `PointLight.intensity`).
 *
 * ⏳ **임시값이다 — 감독·디자이너 판정 전.** 강도 스윕(6 / 12 / 24)을 캡처해 판정을 받은 뒤
 * 그 값을 여기에 굽는다. 그때 이 문단을 「왜 그 값인가 + 실측 표」로 바꾼다.
 *
 * ⚠ 이 값을 URL 노브로 열지 않는다 — 스윕은 **별도 클론에서** 이 상수를 바꿔 가며 돈다.
 * 앞선 회차에 `?pli=` 노브를 `world-glb/main.ts` 에 넣었다가 그 파일의 동결 baseline
 * (1250줄)을 올려 게이트를 우회한 사고가 났다(2026-09-06). 노브는 그 파일을 키운다.
 */
export const ROOM_LIGHT_INTENSITY = 12;
