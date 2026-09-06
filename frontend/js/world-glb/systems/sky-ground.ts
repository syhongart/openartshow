// world-glb/systems/sky-ground.ts — hemi 지면색 덮어쓰기. **순수**(three import 0).
//
// ── 왜 별도 파일인가 ─────────────────────────────────────────────────────────
// `systems/sky.ts` 는 `scripts/smoke/filesize-baseline.json` 이 **853줄로 동결**한 파일이다
// (baseline 은 「커지면 FAIL」이고, 올리는 것은 검수관 판정 사안이다 —
// `scripts/smoke/check-filesize.mjs` 헤더). 그래서 이 기능의 **독블록과 로직을 여기 둔다.**
// 앞선 회차에 이 로직이 `sky.ts` 안에서 15줄을 먹었고 baseline 이 868 로 올라갔다 —
// 그 우회를 되돌리는 것이 이 파일의 존재 이유다.
//
// ── 무엇을 하는가 ────────────────────────────────────────────────────────────
// `?hemig=` 노브(`url-knob.ts` `readHexOpt`)가 준 16진 색으로 `HemisphereLight.groundColor`
// 를 덮어쓴다. 없으면(`undefined`) **아무것도 하지 않는다** — 그때 화면은 이 기능이 들어오기
// 전과 한 픽셀도 다르지 않다(대조군이 곧 그 상태다).
//
// ── 부르는 자리가 판정이다 ───────────────────────────────────────────────────
// `SkySystem.update()` 안, **`engine.update()` 직후·`liftNightLights()` 직전**이다.
//   · `engine.update()`(= `sky.js`) 가 시간대·날씨마다 팔레트 지면색을 정한다 → 그 **뒤**라야
//     덮어쓴 값이 남는다(앞이면 매 프레임 팔레트가 다시 덮는다).
//   · `liftNightLights()` 는 밤에 지면색 하한을 얹는다 → 그 **앞**이라야 노브를 켜도 밤 하한이
//     그대로 산다(뒤면 밤에 하한이 무시되고, 그것은 노브가 아니라 밤 조명 변경이다).
// 시간대·날씨 전부에 적용된다.
//
// ⚠ 구조적 타입으로 받는다(three 를 import 하지 않는다) — 테스트가 three 실물
// `HemisphereLight` 를 그대로 넘겨 돌린다(`tests/world-glb-lights.test.ts`
// 「applyHemiGround — three 실물 HemisphereLight」). `three/webgpu` 의 타입 선언은
// `HemisphereLight.groundColor` 를 노출하지 않아 `sky.ts` 쪽 호출은 캐스팅한다
// (TS2694 계열 — `night-lights.ts` 가 이미 같은 이유로 캐스팅한다).

/**
 * `HemisphereLight` 중 이 함수가 쓰는 부분만.
 *
 * ⚠ `night-lights.ts` 의 `HemiLike` 를 재사용하지 않는 것은 **모양이 다르기 때문**이다 —
 * 저쪽 `MutableColor` 는 `r`·`g`·`b` 뿐이다(밤 하한을 채널별로 올린다). 여기는 `setHex`
 * 가 필요하다: 16진 노브 값을 채널로 직접 쓰면 sRGB→linear 변환을 건너뛰어 **다른 색**이
 * 된다. 같은 이름을 쓰지 않는 것도 그래서다(둘이 미러링으로 보이면 다음 사람이 합친다).
 */
export interface HemiGroundTarget {
  groundColor: { setHex(hex: number): unknown };
}

/**
 * `hex` 가 있으면 `hemi.groundColor` 를 그 색으로 덮어쓴다. `undefined` 면 불변.
 *
 * @param hemi 반구광(three `HemisphereLight` 또는 같은 모양)
 * @param hex  16진 정수 색. `undefined` 면 팔레트 기본값을 그대로 둔다.
 */
export function applyHemiGround(hemi: HemiGroundTarget, hex: number | undefined): void {
  if (hex === undefined) return;
  hemi.groundColor.setHex(hex);
}
