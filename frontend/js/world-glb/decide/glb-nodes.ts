// world-glb/decide/glb-nodes.ts — GLB 노드 이름 규약. 순수.
//
// ── 문자열 재기입 방지 ────────────────────────────────────────────────────────
// 생성기와 런타임 로더가 같은 이름을 쓰게 둔다. 한 곳에서 정의하고 양쪽이 참조한다.
//
// `tests/nyc-gen.test.ts` 가 「두 값이 갈리면 여기서 깨진다」를 단언한다
// (팀장 조건 ②).
//
// ── ⚠ 구분자는 `_` 다. `.` 로 되돌리지 마라 ──────────────────────────────────
// **three 의 `GLTFLoader` 가 로드 중에 노드 이름을 고쳐 쓴다.** `createUniqueName`
// (`GLTFLoader.js:3655`) → `PropertyBinding.sanitizeNodeName`(`three.core.js:31930`) 이
// `[ ] . : /` 를 **삭제**한다. 노드(`:4207`)·메시(`:3844`)·씬(`:4345`) 이름 전부에 걸린다.
//
// 실측(three 0.171, `node -e "import('three').then(t=>…sanitizeNodeName(x))"`, 2026-09-06):
//
// | 생성기가 쓴 이름          | 로더가 붙인 이름   | 불변? |
// |---------------------------|--------------------|-------|
// | `bld.2.room.1.light`      | `bld2room1light`   | ✗     |
// | `bld.2.door`              | `bld2door`         | ✗     |
// | `bld.2.room.1.slot.3`     | `bld2room1slot3`   | ✗     |
// | `ground.walk.n`           | `groundwalkn`      | ✗     |
// | `gate.1`                  | `gate1`            | ✗     |
// | `bld_2_room_1_light`      | `bld_2_room_1_light` | ✓   |
// | `bld_2_door`              | `bld_2_door`       | ✓     |
// | `gate_1`                  | `gate_1`           | ✓     |
//
// **대가**: 이 규약이 `.` 이던 동안 `isRoomLightNode` 는 런타임에서 **한 번도 참이 아니었고**
// `systems/glb-source.ts` 의 `PointLight` 가 **0개**였다. 강도 스윕 4장이 md5 동일로 나와서야
// 드러났다(BOARD 2026-09-06). `tests/world-glb-lights.test.ts` 14개는 그동안 전부 초록이었다 —
// 검사가 GLB json 의 **원** 이름만 봤고 로더를 통과한 **뒤**는 아무도 안 봤다(CLAUDE.md
// «판정/집행 분리의 구멍 — 경계를 건너는 지점은 아무도 안 본다»).
//
// **`_` 를 고른 이유**: sanitize 가 보존하는 문자 중 `\w` 에 속해 정규식이 단순하다(`-` 는
// 음수와 헷갈린다). 대안 B(런타임 정규식만 sanitize 후 형태로 맞추기)는 규약 문자열이 두
// 형태로 갈려 미러링 함정이 되므로 버렸다(부팀장 판정 2026-09-06).
//
// **이 규약이 지켜지는 것을 검사하는 자리**: `tests/world-glb-lights.test.ts` 의
// `it('생성기의 모든 노드·메시 이름이 sanitizeNodeName 에 불변이다 — `.` 을 쓰면 로더가 지운다')`
// 와 `it('로더를 통과한 뒤에도 라이트 노드가 isRoomLightNode 를 만족한다(경계 축)')`.
// 그 둘이 three 의 실물 `PropertyBinding` 을 통과시켜 단언한다.
//
// ── 규약 전체 ────────────────────────────────────────────────────────────────
//   `street`                            루트(거리 전체, `--street-yaw` 가 도는 유일한 노드)
//   `ground_{road|walk|curb|yard}[_n|_s]`  지면 7장
//   `bld_<n>`                           건물 <n>
//   `bld_<n>_<mat>`                     건물 <n> 의 재질 <mat> 메시 묶음
//   `bld_<n>_door`                      문 빈 노드(extras: w·h)
//   `bld_<n>_room_<r>`                  실내(extras: inner)
//   `bld_<n>_room_<r>_wall_<w>`         실내 벽 <w> ∈ {back,left,right,front}
//   `bld_<n>_room_<r>_slot_<s>`         작품 슬롯(extras: w·h·wall)
//   `bld_<n>_room_<r>_light`            방 조명 빈 노드 → 런타임 `PointLight`
//   `gate_1`                            거리 끝 구조물
// 생성처는 `scripts/asset/nyc/generate.mjs` 한 곳이다.

/**
 * 실내 조명 노드의 이름 접미사.
 *
 * 전체 패턴: `bld_<n>_room_<r>_light` (예: `bld_2_room_1_light`)
 */
export const ROOM_LIGHT_SUFFIX = '_light';

/**
 * 노드 이름이 실내 조명 노드인지 확인한다.
 *
 * 패턴: `bld_<n>_room_<r>_light` (n·r은 정수)
 *
 * ⚠ 이 정규식은 **three 로더를 통과한 뒤의 이름**을 받는다 — 구분자를 `.` 로 되돌리면
 * 로더가 그 문자를 지우므로 영원히 거짓이 된다(헤더의 실측 표).
 */
export function isRoomLightNode(name: string): boolean {
  return /^bld_\d+_room_\d+_light$/.test(name);
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
