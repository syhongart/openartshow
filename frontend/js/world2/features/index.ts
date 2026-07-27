// world2/features/index.ts — **켜져 있는 기능 목록. 여기가 유일한 선언 지점이다.**
//
// 기능을 끄려면 이 배열에서 한 줄을 지운다. 켜려면 한 줄을 넣는다. `main.ts`는 이 목록을
// 읽어 조립만 하므로, 기능을 넣고 빼는 데 조립부를 건드릴 일이 없다.
//
// ── 순서의 의미 ──────────────────────────────────────────────────────────────
// 이 배열 순서가 곧 **커널 System 실행 순서**다(코어 System 뒤에 붙는다). 하늘이 플레이어
// 뒤에 와야 하는 이유가 그것이다 — 카메라 위치를 읽어 돔·구름을 따라 옮기므로, 같은
// 프레임의 최신 위치를 봐야 한 프레임 늦게 따라오지 않는다.
//
// 진단 키와 드로우콜 그룹 키는 **이름순으로 정렬**되므로 이 순서에 의존하지 않는다
// (`combineDrawGroupKey` 참고). 기능을 재배치해도 판정 그룹이 갈라지지 않는다.
//
// ── 여기 들어올 것 ───────────────────────────────────────────────────────────
// 오픈월드 교체 전에 이식할 셋이 대기 중이다. 각각 개수 불변식과 부딪히는 지점이 달라서,
// 그대로 가져올 수 있는 것과 계약만 계승해 새로 써야 하는 것이 갈린다.
//
//   · npc         — 워커·NPC. **수가 동적이라** 슬롯 풀로 흡수하거나 상한을 고정해야 한다
//   · multiplayer — 원격 플레이어. 룸 ID가 라이브 오픈월드와 충돌하지 않아야 한다
//
// 둘 다 붙일 때 `main.ts`를 건드리지 않는다. 이 배열에 한 줄씩이다. `ocean`이 방금 그렇게
// 들어왔다 — 수면 메시·진단·정리가 전부 `features/ocean.ts` 안에 있고 조립부는 무변경이다.
// (`sky.js`의 `waterY` 연동은 아직이다. 지금은 하늘이 물을 모르고, 물도 하늘을 모른다.)

import type { Feature } from './types.js';
import { skyFeature } from './sky.js';
import { oceanFeature } from './ocean.js';
import { minimapFeature } from './minimap.js';

export const FEATURES: readonly Feature[] = [
  skyFeature,
  oceanFeature,
  minimapFeature,
];

export type { Feature, FeatureEnv, FeatureInstance, MountedFeature } from './types.js';
export { mountFeatures, combineDrawGroupKey, collectDiagnostics } from './types.js';
