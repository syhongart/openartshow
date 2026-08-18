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

// ── 시각효과(VFX)는 어디에 있나 — **아직 한 축으로 모여 있지 않다** ──────────
//
// 감독 확인: *"이런 특수효과 이펙트는 따로 파일로 분류하고 있지?"* → 후보정만 그렇고
// 나머지는 흩어져 있다. 정리를 **world1 폐기 시점(#119)으로 미루기로 확정**했다 —
// 지금 `fx/` 를 만들면 날씨가 여전히 `sky.js`(world1) 안에 남아 "이펙트는 fx 에 있다"가
// 반만 참이 되고, 반만 참인 규칙이 아무 규칙도 없는 것보다 위험하기 때문이다.
//
// 그때까지 헤매지 않도록 **소재를 여기 적어 둔다:**
//
//   블룸(화면 후보정)   `features/postfx.ts` + `postfx-params.ts`   ← 유일하게 분리됨
//   가로등 점등         세 곳에 쪼개져 있다:
//                         · 재질·마스크  `parts/lamp.ts`
//                         · 켜고 끄기    `features/sky.ts` (시간대를 아는 곳이 하늘뿐)
//                         · 판정         `decide/night.ts`
//   물 일렁임           `features/ocean.ts` (노멀맵 2층 UV 스크롤)
//   밤 조명 하한        `systems/night-lights.ts` + `decide/night.ts`
//   날씨·하늘           **world1 `frontend/js/sky.js`** — 비·눈·오로라·무지개·번개·
//                       구름·별이 전부 그 안이다. world2 는 `systems/sky.ts` 어댑터
//                       하나로만 닿는다.
//
// #119 에서 `sky.js` 를 world2 로 가져올 때, 위 항목을 `world2/fx/` 로 함께 모은다.
// **물 일렁임은 예외로 둔다** — 물 재질의 일부라 떼면 재질 하나를 두 파일이 나눠 갖게
// 된다. 옮길 것은 "여러 파일에 쪼개진 것"(가로등 점등)과 "남의 집에 있는 것"(날씨)이다.

import type { Feature } from './types.js';
import { skyFeature } from './sky.js';
import { oceanFeature } from './ocean.js';
import { minimapFeature } from './minimap.js';
import { npcFeature } from './npc.js';
import { postfxFeature } from './postfx.js';
import { glbCityFeature } from './glb-city.js';
import { overlayFeature } from './overlay.js';
import { shadingFeature } from './shading.js';
import { surfacePaintFeature } from './surface-paint.js';
import { grassFeature } from './grass.js';
import { waterStyleFeature } from './water-style.js';
import { terrainStyleFeature } from './terrain-style.js';

export const FEATURES: readonly Feature[] = [
  skyFeature,
  oceanFeature,
  minimapFeature,
  // 사람은 플레이어 뒤에 온다 — 같은 프레임의 최신 플레이어 위치를 보고 멀어진 사람을
  // 데려오기 때문이다. 한 프레임 늦으면 재배치가 시야 안에서 일어나 눈앞에서 튄다.
  npcFeature,
  // ── 실험 전용 (`?glb=N`) ─────────────────────────────────────────────────
  // 감독 지시 *"건물대신 미술관 건물을 올려보자. 50개."* 개수 불변식을 **일부러 깨는**
  // 기능이라 평상시에는 꺼져 있다 — `?glb=` 가 없으면 `create` 가 `null` 이라 로더
  // 코드조차 내려받지 않는다. 실험이 끝나면 이 줄과 파일을 함께 지운다.
  glbCityFeature,
  // ── 스타일라이즈드 잔디 (`?styl=1` 또는 `?grass=1`) ───────────────────────
  // 감독 지시 2026-08-18(모바일 게임 광고 화면 참조). **기본은 꺼져 있다** — `create` 가
  // `null` 을 돌려주므로 노브 없이는 씬을 한 번도 안 만진다.
  //
  // 사람(`npc`) 뒤인 것은 같은 이유다: 플레이어 위치를 읽어 필드를 접으므로 한 프레임
  // 늦으면 걸을 때 앞쪽 풀이 뒤늦게 따라온다. 셰이딩보다 **앞**이어야 하는 것도 짝이다 —
  // 오버라이드가 걸리기 전에 잔디가 자기 `visible` 을 정해야 한다.
  grassFeature,
  // ── 스타일라이즈드 수면 (`?styl=1` 또는 `?wstyle=1`) ──────────────────────
  // **`ocean` 보다 뒤여야 한다** — 기존 수면 메시를 이름으로 찾아 숨기고 같은 지오메트리를
  // 공유하는 메시를 얹으므로, 저쪽이 먼저 씬에 들어와 있어야 한다.
  waterStyleFeature,
  // ── 사용자 배치 (`assets/world2-overlay.json`) ────────────────────────────
  // 감독이 `?edit=1` 화면에서 놓고 내보낸 JSON 을 읽어 얹는다. **가산 레이어**라 마을
  // 기본 배치 계산에는 손대지 않는다. 파일이 비어 있으면(지금이 그렇다) 아무것도 안 붙고,
  // 그때도 GLTFLoader 를 내려받지 않는다 — 배치가 0개면 로더가 필요 없기 때문이다.
  overlayFeature,
  // ── 스타일라이즈드 지형 (`?styl=1` 또는 `?gtex=1`) ────────────────────────
  // **`surfacePaintFeature` 보다 앞이어야 한다.** 이 기능은 표면 «설정» 을 얹고 집행은
  // 저쪽이 한다 — 뒤에 두면 부팅 첫 프레임에 설정이 없는 상태로 한 번 반영되고 다음
  // 프레임에 또 반영된다(화면에는 안 보이지만 재질을 두 번 만진다). 오버레이가 표면보다
  // 앞인 것과 같은 논리다.
  terrainStyleFeature,
  // ── 표면 재질 (심리스 텍스처) ─────────────────────────────────────────────
  // 감독 지시 *"땅의 텍스쳐 심리스를 주면 그대로 적용할수있게 … 타일링 배율 … 각도 조절"*
  // — 파츠 재질의 맵 슬롯을 갈아 끼운다. **오버레이보다 뒤**여야 한다: 설정이 오버레이
  // JSON 에서 오므로, 앞에 있으면 부팅 첫 프레임에 «아직 안 읽은 상태» 를 반영하고 다음
  // 프레임에 한 번 더 반영한다(화면에는 안 보이지만 재질을 두 번 만진다).
  //
  // 셰이딩보다 **앞**인 것도 같은 이유다. 셰이딩은 `overrideMaterial` 로 씬 전체를 덮으므로
  // 그 프레임에 재질이 무엇이든 결과가 같지만, 순서가 «재질을 정하고 → 덮는다» 여야
  // 다음 사람이 읽을 때 뒤집히지 않는다.
  surfacePaintFeature,
  // ── 셰이딩 뷰 (`?shading=solid|wire`) ─────────────────────────────────────
  // 감독 지시 *"와이어 프레임 뷰. 솔리드 뷰도 구현해줘."* — `scene.overrideMaterial` 을
  // 꽂는다. **후보정보다 앞**이어야 한다: 후보정은 씬을 렌더타깃에 받아 가공하므로,
  // 오버라이드가 이미 걸린 결과 위에서 돌아야 «와이어 화면에 블룸» 이 성립한다.
  //
  // 오버레이(편집)보다 뒤인 것도 의도다 — 편집이 그 프레임에 놓은 것도 함께 덮인다.
  // 새로 놓은 물건만 원래 재질로 남으면 그것이 곧 «셰이딩이 안 먹는 것» 으로 보인다.
  shadingFeature,
  // 후보정은 **맨 마지막**이다. 렌더 경로를 통째로 가로채므로, 앞선 기능이 씬에 무엇을
  // 넣든 그 결과 위에서 동작해야 한다. 여기서 한 줄을 지우면 후보정이 통째로 빠지고
  // 어댑터는 기본 렌더 경로로 남는다.
  postfxFeature,
];

export type { Feature, FeatureEnv, FeatureInstance, MountedFeature } from './types.js';
export {
  mountFeatures, combineDrawGroupKey, drawGroupKeyOf, collectDiagnostics, prewarmFeatures,
} from './types.js';
