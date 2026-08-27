// world-glb/decide/shading.ts — **셰이딩 모드 판정.** 순수 함수만.
//
// ── 감독 지시에서 생겼다 ────────────────────────────────────────────────────
// *"그리고 와이어 프레임 뷰. 솔리드 뷰도 구현해줘."*
//
// ── 왜 셋인가 ───────────────────────────────────────────────────────────────
// 감독이 말한 것은 **둘**인데 지금 화면이 곧 세 번째다. 블렌더도 Wireframe / Solid /
// Material Preview 로 갈라져 있고 감독이 그 도구를 쓴다. 둘만 만들면 «돌아갈 자리» 에
// 이름이 없어지고, 이름이 없는 상태는 버튼으로도 URL 로도 가리킬 수가 없다.
//
// ── 왜 `decide/` 인가 ──────────────────────────────────────────────────────
// 모드에서 재질 스펙까지가 순수 계산이라 부수효과가 없다. 집행(`features/shading.ts`)은
// 이 스펙을 three 재질로 만들 뿐이다. 그래서 "와이어 스펙이 정말 `wireframe: true` 인가"
// 를 테스트가 three 없이 직접 물어볼 수 있다.
//
// ⚠ **그 분리가 곧 사각이기도 하다.** 이 파일이 옳아도 집행 쪽이 스펙을 안 쓰면 아무
// 테스트도 안 깨진다 — 이 저장소가 반복해서 배운 형태다(«판정/집행 경계를 건너는 지점은
// 아무도 안 본다»). 그래서 집행 쪽 통합 테스트를 짝으로 붙인다.

/**
 * 셰이딩 모드.
 *
 *   material  지금 화면 그대로 (오버라이드 없음, 기본값)
 *   solid     단색 + 조명만  — 덩어리와 그림자만 본다
 *   wire      선            — 덩어리 «안» 이 보인다
 */
export type ShadingMode = 'material' | 'solid' | 'wire';

/** 유효한 모드 목록. **타입과 같은 곳에 둔다** — `readEnum` 이 URL 값을 이것으로 거른다 */
export const SHADING_MODES = ['material', 'solid', 'wire'] as const;

/**
 * 오버라이드 재질의 명세. **three 를 모른다** — 색과 플래그뿐이다.
 *
 * `kind: 'none'` 은 «오버라이드를 걸지 않는다» 이고, 집행 쪽에서
 * `scene.overrideMaterial = null` 이 된다. 되돌릴 때 이것을 안 하면 머티리얼 모드로
 * 돌아와도 화면이 회색으로 남는다 — 뮤테이션으로 검출력을 재는 축 중 하나다.
 */
export interface ShadingSpec {
  readonly kind: 'none' | 'solid' | 'wire';
  /** 재질 색. `kind: 'none'` 이면 의미 없다 */
  readonly color: number;
  /** three 재질의 `wireframe` 플래그. **이것이 켜지면 렌더 경로가 통째로 갈린다**(아래) */
  readonly wireframe: boolean;
  /** 조명을 받는가. 솔리드는 받고(그래야 덩어리가 보인다) 와이어는 안 받는다 */
  readonly lit: boolean;
}

// ── 색 ────────────────────────────────────────────────────────────────────────
// **화면 판정 대기 중이다**(2026-08-14). 근거 없이 고른 값이 아니라 «시작점» 으로 고른
// 값이고, 감독 실기기 확인 뒤 여기서 바뀐다. 그때 왜 바뀌었는지를 이 자리에 적는다.
//
// 솔리드: 블렌더 기본 솔리드 뷰의 무채색 회색. 채도를 0 으로 두는 것이 요점이다 —
//         색이 조금이라도 있으면 «재질이 아직 남아 있나» 로 읽힌다.
const SOLID_COLOR = 0xb0b4b8;
// 와이어: 밝은 청록. **하늘도 함께 와이어가 되므로 배경 밝기를 예측할 수 없다** —
//         밝은 배경에서도 어두운 배경에서도 남는 밝기를 골랐다. 편집 강조색
//         `#8B72FF`(보라)는 **일부러 피했다**: 선택 표시와 같은 색이면 «지금 고른 것» 이
//         화면 전체와 구별되지 않는다.
const WIRE_COLOR = 0x7fe3ff;

/**
 * 모드 → 재질 명세.
 *
 * 모르는 값은 `material` 로 본다 — 오버라이드를 **안 거는** 쪽이 안전한 기본값이다
 * (`decide/night.ts` 의 `nightness` 가 모르는 값을 낮으로 보는 것과 같은 원리:
 * 잘못된 기본값이 화면을 못 보게 만드는 쪽으로 가지 않게 한다).
 */
export function shadingSpec(m: ShadingMode): ShadingSpec {
  if (m === 'solid') return { kind: 'solid', color: SOLID_COLOR, wireframe: false, lit: true };
  if (m === 'wire') return { kind: 'wire', color: WIRE_COLOR, wireframe: true, lit: false };
  return { kind: 'none', color: 0, wireframe: false, lit: false };
}

/** 오버라이드를 실제로 거는 모드인가. 집행·진단이 같은 판정을 쓰게 하는 축 */
export function overrides(m: ShadingMode): boolean {
  return shadingSpec(m).kind !== 'none';
}

/**
 * 화면에 쓰는 이름. **여기 한 곳이다** — 버튼(`panel/dom.ts`)과 키 안내(`edit/input.ts`)가
 * 같은 문자열을 봐야 «버튼은 재질이라는데 키는 머티리얼이라고 한다» 가 안 생긴다.
 *
 * 판정 파일에 UI 문자열이 있는 것이 어색해 보이지만 전례가 있다(`decide/loading-copy.ts`).
 * 값 미러링을 피하는 것이 배치의 우아함보다 우선이다 — 이 저장소가 색·구름 고도·테스트
 * 임계값에서 세 번 겪은 사고다.
 */
export const SHADING_LABEL: Readonly<Record<ShadingMode, string>> = {
  material: '재질',
  solid: '솔리드',
  wire: '와이어',
};

/**
 * 와이어 토글의 결과. **직전 모드를 함께 들고 다닌다.**
 *
 * 블렌더의 `Shift+Z` 는 «와이어 ↔ 직전» 이지 «와이어 ↔ 머티리얼» 이 아니다. 솔리드로
 * 보다가 잠깐 속을 확인하고 돌아오면 솔리드여야 한다 — 머티리얼로 튕기면 도구가 아니라
 * 장난감이 된다.
 */
export interface ShadingToggle {
  readonly mode: ShadingMode;
  /** 다음 토글에서 돌아갈 자리 */
  readonly back: ShadingMode;
}

/**
 * 「돌아갈 자리」로 성립하는 값인가 — 아니면 머티리얼로 되돌린다.
 *
 * `'wire'` 는 돌아갈 자리가 될 수 없다. 되면 «와이어에서 토글했더니 또 와이어» 가 되어
 * 키가 죽은 것으로 보인다. 그때 머티리얼로 두는 이유는 그것이 노브를 안 켠 세션의
 * 화면이고, 감독이 «원래대로» 라고 부를 자리이기 때문이다.
 *
 * 부르는 자리가 둘이다 — 부팅(`edit/mode.ts`, `?shading=wire` 로 시작한 세션)과 아래
 * `toggleWire`. **둘이 같은 규칙을 써야 한다**: 부팅만 지키면 토글은 «들어온 값이 이미
 * 옳다» 를 가정하게 되고, 그 가정은 갱신 지점이 하나 더 생기는 순간 조용히 깨진다.
 */
export function safeBack(back: ShadingMode): ShadingMode {
  return back === 'wire' ? 'material' : back;
}

/**
 * `Shift+Z` — 와이어와 직전 모드를 오간다.
 *
 * ⚠ 이 자리에 처음 적은 주석은 *"`back` 이 `'wire'` 가 되는 일은 **구조적으로 없다**"*
 * 였고 **거짓이었다**(2026-08-14, 테스트가 잡았다). 참인 것은 그보다 약하다 — 이 함수는
 * 불변식을 **유지**할 뿐 **확립**하지 못했다: `toggleWire('wire', 'wire')` 는 `back` 을
 * 그대로 물려줘 `'wire'` 를 내놓는다. 실제 호출부가 안전했던 것(초기값이 정규화돼 있고
 * `goShading` 이 `m !== 'wire'` 일 때만 갱신한다)은 **이 함수의 성질이 아니라 호출부의
 * 성질**이었다.
 *
 * 주석을 약하게 고치는 대신 `safeBack` 을 태워 **문장을 참으로 만들었다.** 게이트·불변식에
 * 대한 과장된 진술은 다음 사람이 확인을 생략하게 만든다 — 이 저장소가 `main` unprotected
 * 오기로 7일을 잃은 그 형태다.
 */
export function toggleWire(cur: ShadingMode, back: ShadingMode): ShadingToggle {
  const safe = safeBack(back);
  return cur === 'wire' ? { mode: safe, back: safe } : { mode: 'wire', back: cur };
}
