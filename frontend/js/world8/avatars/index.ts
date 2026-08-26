// world8/avatars/index.ts — 아바타 배럴.
//
// 걷기 코드(`features/npc.ts`)는 **여기만 본다.** 치비가 world1 에서 오는지, VRM 이
// 파일에서 오는지, 다음에 무엇으로 갈릴지를 알 필요가 없다.
//
// 그것이 감독이 말한 정리다 — *"나중에 그쪽을 다 날릴 거니까"*. 날리는 날 고칠 파일은
// `chibi.ts` 하나이고, 이 배럴 뒤의 소비자는 그대로다.

export type { WalkAvatar, AvatarObject, AvatarCost } from './types.js';
export { createChibiAvatar, CHIBI_COST } from './chibi.js';
export { loadVrmAvatar } from './vrm.js';
export {
  AVATAR_SOURCES, CHIBI, VRM_MALE,
  DEFAULT_CHIBI_COUNT, MAX_TOTAL_AVATARS,
  type AvatarSource,
} from './registry.js';
