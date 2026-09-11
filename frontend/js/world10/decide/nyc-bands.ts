// world10/decide/nyc-bands.ts — **이 세계가 어디까지 보이는가의 SSOT.** 순수 상수만.
//
// ════════════════════════════════════════════════════════════════════════════
// 「밴드는 셀 크기에서 **유도**한다」 — 팀장 판정 2026-09-11 B1(후자)
// ════════════════════════════════════════════════════════════════════════════
//
// ── 무엇이 문제였나 ─────────────────────────────────────────────────────────
// `decide/lod.ts` 의 `DEFAULT_BANDS` 는 **셀 배수**다(`farExit` 2.40셀). 그 값이 정해진
// 세계는 world2 이고 거기 셀은 **32m** 라, 배수 2.40 이 뜻한 절대 거리는 **76.8m** 였다.
// world10 은 같은 배수를 쓰면서 셀만 `NYC_CELL`(64m)로 키웠으므로 렌더 반경이 조용히
// **153.6m 로 2배**가 됐다 — 그 결과가 tri 예산 1.7배 초과였다.
//
// 2026-09-11 첫 처방은 이것을 `?band=0.5` 노브를 **부트가 선채움**하는 형태로 막았다.
// 그런데 `scaleBands` 는 **tier 밴드만** 곱한다. 안개·비행천장·그림자·페이드는 원본
// `DEFAULT_BANDS` 에서 따로 유도하므로 배율을 안 탔고, 렌더는 76.8m 에서 끊기는데 안개는
// 102.4m 에서야 시작해 **세계의 끝이 안개 없이 드러났다**(캡처
// `docs/nyc/evidence/iteration-03-grid/band05-V1.fogbug.png`). 그 구멍은 `scaleBands`
// 헤더가 *"진단 전용이고, 상시 값으로 쓰려면 안개·그림자 밴드와 함께 설계해야 한다"* 고
// **미리 적어 둔** 자리다 — 경고가 있었고 발동 조건이 왔는데 아무도 안 읽었다.
//
// ── 그래서 0.5 를 적지 않고 «유도» 한다 ─────────────────────────────────────
// 아래 `NYC_BAND_SCALE` 은 리터럴 0.5 가 아니라 **기준 셀 ÷ 이 세계의 셀** 이다. 두 가지가
// 따라온다:
//   ① **식이 뜻을 말한다** — «셀을 64m 로 키웠으니 배수를 절반으로 줄여 world2 와 **같은
//      절대 거리**(76.8m)를 쓴다». 0.5 라는 숫자는 그 결과일 뿐이고, 숫자만 적으면 다음
//      사람은 그것이 어디서 왔는지 알 수 없다(«실측에 여유를 얹은 값» 이 근거가 아닌 것과
//      같은 이유다 — 유도할 수 있으면 유도한다).
//   ② **셀을 다시 바꾸면 저절로 따라온다.** `NYC_CELL` 을 48m 로 바꾸는 회차가 오면 밴드도
//      예산도 안개도 함께 움직이고, 이 파일을 아무도 안 만져도 된다.
//
// ── 실효 거리 (전부 유도값이다 — 여기에 미터를 적지 않는다) ──────────────────
//   렌더 반경 = `NYC_BANDS.farExit × NYC_CELL`
//   안개 far  = 같은 값(`decide/fog.ts` 가 `NYC_BANDS.farExit` 에서 유도한다)
//   그림자 반경·비행 천장·페이드 구간도 같은 밴드에서 나온다.
//   그 산술(«76.8m»)은 `tests/world10-band-default.test.ts` 가 단언한다 — **기록은 테스트에
//   두고 주석에는 식만 둔다**(값 미러링 금지).
//
// ── 다섯 소비처 (팀장 조건 B1) ──────────────────────────────────────────────
//   ① tier 스트리밍  `world10/main.ts` 의 `TIER_BANDS`
//   ② 안개           `decide/fog.ts`      `FOG_NEAR_CELLS`·`FOG_FAR_CELLS`
//   ③ 비행 천장      `decide/fly.ts`      `FLY_CEIL_CELLS`
//   ④ 그림자         `world10/main.ts`    `SHADOW_BAND`
//   ⑤ 등장 페이드    `decide/lod-fade.ts` `crossingCells`·`fadeSeconds`·`residualAtSpawn`
//
// ── 판정 기록은 어디 있나 ───────────────────────────────────────────────────
// «왜 이 거리인가»(두 밴드 실측 표 두 벌 · draw 축이 판정 불가라는 것 · 경계 «중간값은
// 감독의 «더 멀리» 전에 안 연다»)는 `frontend/js/world10-boot.ts` 의 판정 기록 절
// **한 곳**이다 — 이 파일은 **값과 유도**를 소유하고 그쪽이 **경위**를 소유한다.
// 여기에 그 표를 다시 적지 않는다(한쪽만 고치면 아무도 모르는 그 형태).
//
// ── 🔴 재론 조건 (팀장 판정 B1) ─────────────────────────────────────────────
// **다섯 소비처 «밖» 에서 `DEFAULT_BANDS` 를 직접 읽는 자리가 또 나오면 상신한다.**
// 고쳐 놓고 넘어가지 않는다 — 한 자리가 새면 「반경이 두 개인 세계」가 다시 서고, 그것이
// 이번에 감독 화면까지 갈 뻔한 형태다. 지금 남아 있는 자리는 `decide/art-light.ts`
// (라이트 풀 크기 유도)와 `decide/horizon.ts`(수평선 밴드 반경)이고, 둘 다 **가시 거리가
// 아니라 다른 축**이라 이 회차에서 건드리지 않았다(보고 기록).
//
// ── 경계 — 여기서 멈춘다 ────────────────────────────────────────────────────
// `DEFAULT_BANDS` 의 **값 자체는 한 글자도 안 바꾼다**(팀장 조건 B-1). 그 상수는 world2
// 라이브가 쓰는 것이고, 이 트리의 `decide/lod.ts` 는 world2 계보라 diff 0 이 조건이다.
// 「world10 이 얼마나 멀리 보는가」를 바꾸고 싶으면 **여기** `NYC_BAND_SCALE` 의 분자·분모를
// 보는 것이지 `lod.ts` 를 보는 것이 아니다.

import {
  DEFAULT_BANDS, scaleBands, withNearExit, withFarEnter, type TierBands,
} from './lod.js';

/**
 * 셀 한 변(m). 지시서 `docs/NYC-GALLERY-WALK.md` «50~70m 거리 한 블록» 안의 값.
 *
 * ⚠ **정의가 `systems/nyc-parcels.ts` 에서 여기로 옮겨 왔다**(2026-09-11). 밴드가 이 값에서
 * 유도되므로 둘이 한 파일에 있어야 유도가 **식으로** 읽히고, `decide/` 가 `systems/` 를
 * import 하지 않는다는 이 트리의 규약(실측: 역방향 import 0건)도 지켜진다. 격자 소비자는
 * 계속 `systems/nyc-parcels.js` 에서 읽는다 — 그쪽이 **재수출**한다.
 *
 * ⚠⚠ 생성기(`scripts/asset/nyc/layout.mjs` 의 `CELL.SIZE`)와 같은 값이어야 하고, 부트·런타임이
 * `scripts/` 를 import 할 수 없어 생긴 미러링이다. `tests/nyc-grid.test.ts` 가 두 파일을 읽어
 * 대조한다 — 「격자 상수는 생성기 `layout.mjs` 의 CELL 과 같다」.
 */
export const NYC_CELL = 64;

/**
 * `DEFAULT_BANDS` 의 배수가 **어느 셀 크기를 전제로 정해졌는가**(m).
 *
 * 출처: `decide/lod.ts` 의 `DEFAULT_BANDS` 헤더 — *"현행 실측 스트리밍 반경(full 1.15·shell
 * 1.55 **CELL**)에서 출발해"*. 그 «CELL» 은 world2 의 파셀 한 변이고, 그 값은 이 트리에도
 * `parts/types.ts` 의 `DEFAULT_LAYOUT.cellX` 로 그대로 들어와 있다.
 *
 * ⚠ **여기 32 를 적은 것은 미러링이다** — 그래서 `tests/world10-band-default.test.ts` 가
 * `DEFAULT_LAYOUT.cellX` 와 대조한다(두 값이 갈리면 거기서 깨진다). `DEFAULT_LAYOUT` 를
 * 직접 import 하지 않는 이유는 그 객체가 **world2 파셀 레이아웃**(여백·건물 수까지 든)이고,
 * world10 은 그 레이아웃을 쓰지 않기 때문이다 — 「밴드의 기준 셀」과 「레이아웃의 셀」이
 * 우연히 같은 수인 것이지 같은 것을 가리키는 이름이 아니다.
 */
export const BAND_REF_CELL_M = 32;

/**
 * 밴드 배수에 곱할 값. **0.5 를 적지 않는다 — 유도한다**(위 헤더 ①②).
 *
 * 셀이 기준보다 크면 1 보다 작아지고, 그만큼 배수를 줄여 **절대 거리를 보존**한다.
 */
export const NYC_BAND_SCALE = BAND_REF_CELL_M / NYC_CELL;

/**
 * **이 세계의 밴드.** 다섯 소비처가 전부 이것을 읽는다(헤더 목록).
 *
 * `scaleBands` 는 모든 필드에 같은 양수를 곱하므로 ENTER<EXIT 히스테리시스가 보존된다 —
 * 그 성질은 `decide/lod.ts` 가 소유하고 `tests/world2-band-scale.test.ts` 가 못 박는다.
 */
export const NYC_BANDS: TierBands = scaleBands(DEFAULT_BANDS, NYC_BAND_SCALE);

/**
 * 밴드 변형 함수 재수출.
 *
 * ⚠ **왜 재수출인가**: `world10/main.ts` 는 `check:filesize` 로 **1,399줄에 동결**돼 있어
 * import 줄 하나를 늘리는 것도 baseline 변경이 된다(2026-09-06 executor 사고가 바로 그
 * baseline 을 손댄 회차다). 밴드 API 를 이 파일 한 곳으로 모으면 소비처는 **줄을 늘리지 않고
 * import 대상만 교체**하면 되고, 그것이 팀장 조건 B-1(«소비처 편집은 import 대상 교체 형태만»)
 * 이 요구하는 diff 형태이기도 하다. 역할과도 맞는다 — 이 파일이 world10 밴드의 창구다.
 */
export { scaleBands, withNearExit, withFarEnter };
export type { TierBands };
