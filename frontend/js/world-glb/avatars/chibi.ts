// world-glb/avatars/chibi.ts — 아야모(치비) 어댑터.
//
// ── 이 파일의 존재 이유는 하나다 ────────────────────────────────────────────
// **world2 에서 world1 의 치비를 참조하는 유일한 지점.** 감독 지시:
//
//   *"월드원 폴더에 있는 거 그냥 끌어다 쓰지 마. 나중에 그쪽을 다 날릴 거니까."*
//
// 그러니 치비를 안 쓰는 것이 아니라, **쓰는 자리를 한 곳으로 모은다.** world1 을
// 지우는 날 갈아 끼울 파일이 이것 하나이고, 나머지 world2 코드는 손댈 것이 없다.
// `systems/sky.ts` 가 `sky.js` 에 대해 이미 같은 일을 하고 있다 — 같은 모양으로 맞췄다.
//
// 그 경계가 지켜지는지는 `tests/world2-boundary.test.ts` 가 감시한다. 문서로만 적으면
// 다음 사람이(또는 다음의 내가) 편한 자리에서 `../../chibi.js` 를 다시 잡는다 —
// 실제로 이 파일이 생기기 전 `features/npc.ts` 가 그렇게 하고 있었다.
//
// ── 왜 지금 복사해 오지 않는가 ──────────────────────────────────────────────
// 치비 체인은 8모듈 4,700줄이고 **라이브 미술관이 지금 쓰고 있다.** 복사해 오면 그
// 순간부터 같은 로직이 두 벌이 되고, 한쪽만 고치는 사고가 난다(이 저장소가 값 미러링을
// 금지하는 이유가 그것이다). world1 을 실제로 지우는 시점(#119)에 옮기는 것이 맞고,
// 그때까지는 **접점을 좁혀 두는 것**이 정리다.

import { buildChibi, randomChibiLook } from '../../chibi.js';
import type { WalkAvatar, AvatarCost } from './types.js';

/**
 * 치비 한 체를 만든다.
 *
 * `buildChibi` 의 반환은 이미 `group`·`update(dt, speed)`·`dispose()` 를 갖고 있어서
 * 계약과 모양이 같다. 그래서 감싸는 대신 **그대로 통과시킨다** — 의미 없는 래퍼
 * 객체를 하나 더 만들면 호출이 한 겹 깊어지기만 한다.
 *
 * 여기서 하는 일은 타입을 world2 의 계약으로 **좁히는 것**이다. 그러면 world2 코드가
 * `setWound`·`ouch`·`playAction`·`setFlying` 같은 미술관 전용 API 에 손을 뻗을 수
 * 없다 — 뻗어 두면 나중에 옮길 때 그것들까지 따라와야 한다.
 */
export function createChibiAvatar(): WalkAvatar {
  return buildChibi(randomChibiLook()) as WalkAvatar;
}

/**
 * 치비 한 체의 실측 비용. `tests/world2-chibi-cost.test.ts` 가 못 박은 값이다.
 *
 * 상수로 들고 있는 이유: 매 체마다 씬을 순회해 세면 부팅이 느려지고, 값은 어차피
 * 룩과 무관하게 거의 같다(재질이 체마다 새로 생기는 구조라 그렇다). **테스트가 이
 * 숫자를 지키므로** 치비가 무거워지면 거기서 먼저 깨진다.
 */
export const CHIBI_COST: AvatarCost = { meshes: 45, materials: 29, triangles: 24360 };
