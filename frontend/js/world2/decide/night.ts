// 밤의 밝기와 가로등 점등 — **순수 판정.** 씬도 재질도 모른다.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"밤에는 가로등이 켜져야 하고… 지금 밤이 너무 어두워."*
//
// ── 왜 어두웠나 ─────────────────────────────────────────────────────────────
// `sky.js` 의 `LIGHT.night.clear` 를 열어 보면 원인이 **밝기가 아니라 색**이다:
//
//   sunI 0.24 · hemiI 0.55   ← 낮(0.95 / 1.0) 대비 그리 낮지 않다
//   hemiS 0x39445c (명도 27%)
//   hemiG 0x232a24 (명도 **15%**)  ← 지면을 비추는 색이 거의 검정이다
//
// `HemisphereLight` 의 `groundColor` 는 **아래에서 올라오는 빛**이다. 그것이 검정이면
// 위를 향한 면(바닥·도로·정원)에 닿는 빛이 없다. 감독이 앞서 *"바닥이 검다"* 고 한 것과
// 같은 뿌리다. 밝기를 올려도 검정을 곱하면 검정이라 안 밝아진다.
//
// ── 왜 `sky.js` 를 안 고치는가 ──────────────────────────────────────────────
// 라이브 world1 이 같은 파일을 쓴다. 밤 팔레트를 거기서 바꾸면 미술관 오픈월드의 룩이
// 함께 바뀐다. world2 쪽 어댑터에서만 **하한**을 얹는다 — 그것이 어댑터가 있는 이유다.
//
// ── 왜 하한(max)인가 ────────────────────────────────────────────────────────
// 보정을 곱셈으로 하면 매 프레임 곱해져 발산한다. 하한은 **몇 번 적용해도 결과가 같다**
// (멱등). `sky.js` 가 값을 덮어쓰든 안 쓰든, 크로스페이드 중이든 아니든 안전하다.
// 이 성질이 없으면 "언제 적용되는가" 를 정확히 알아야 하고, 그 지식은 곧 어긋난다.

/** 하늘이 아는 시간대. `sky.js` 의 `LIGHT` 최상위 키와 같다 */
export type SkyTime = 'day' | 'sunset' | 'night';

/**
 * 밤 정도 0~1. 모르는 값은 낮으로 본다 — 밝은 쪽이 안전한 기본값이다(어두워서 아무것도
 * 안 보이는 것보다 밝아서 밋밋한 편이 낫다).
 */
export function nightness(time: string): number {
  if (time === 'night') return 1;
  // 노을은 이미 어둑하지만 가로등이 완전히 켜질 시간은 아니다. 실제 도시도 이때
  // 하나둘 켜지기 시작한다.
  if (time === 'sunset') return 0.4;
  return 0;
}

/** 조명 하한. 이보다 어두우면 끌어올린다 */
export interface NightFloor {
  /** `HemisphereLight.intensity` 하한 */
  hemiI: number;
  /** `DirectionalLight.intensity` 하한 — 달빛 */
  sunI: number;
  /** `HemisphereLight.groundColor` 채널 하한(0~1 RGB) */
  ground: readonly [number, number, number];
  /** `HemisphereLight.color` 채널 하한(0~1 RGB) */
  sky: readonly [number, number, number];
}

/**
 * 한밤의 목표 지면색 — `0x3a4250`.
 *
 * 명도 약 25% 로, 원래 값(15%)보다 밝지만 낮(0x8fa385, 60%)에는 한참 못 미친다.
 * 밤을 밤으로 두면서 바닥의 형태만 읽히게 하는 선이다. 푸른 기를 남긴 것은 달빛
 * 아래 지면이 중성 회색으로 보이면 시간대가 사라지기 때문이다.
 */
const NIGHT_GROUND = [0x3a / 255, 0x42 / 255, 0x50 / 255] as const;

/** 한밤의 목표 천공색 — `0x4a5878`. 원래 0x39445c 보다 한 단계 밝다 */
const NIGHT_SKY = [0x4a / 255, 0x58 / 255, 0x78 / 255] as const;

/** 한밤의 반구광 하한. 원래 0.55 */
const NIGHT_HEMI_I = 0.85;
/** 한밤의 달빛 하한. 원래 0.24 */
const NIGHT_SUN_I = 0.34;

/**
 * 밤 정도에 비례한 하한. 낮(`n=0`)에는 전부 0이라 **아무 일도 하지 않는다** —
 * 낮 값이 이미 하한보다 높으므로 자연히 no-op 이 되는 것이 아니라, 하한 자체가
 * 0 이라 계산도 무의미해진다. 낮 룩을 건드릴 여지를 원천적으로 없앤다.
 */
export function nightFloor(n: number): NightFloor {
  const k = Math.max(0, Math.min(1, n));
  const lerp = (v: number) => v * k;
  return {
    hemiI: lerp(NIGHT_HEMI_I),
    sunI: lerp(NIGHT_SUN_I),
    ground: [lerp(NIGHT_GROUND[0]), lerp(NIGHT_GROUND[1]), lerp(NIGHT_GROUND[2])],
    sky: [lerp(NIGHT_SKY[0]), lerp(NIGHT_SKY[1]), lerp(NIGHT_SKY[2])],
  };
}

/**
 * 가로등 발광 강도(`emissiveIntensity`). 0 이면 꺼진 것.
 *
 * 낮에 **완전히 0** 인 것이 중요하다. 약하게라도 켜 두면 대낮에 가로등이 누렇게 떠서
 * 고장난 것처럼 보인다 — 켜진 것도 꺼진 것도 아닌 상태가 가장 나쁘다.
 *
 * 밤에 1을 넘지 않는 이유: `emissive` 는 조명과 무관하게 더해지는 값이라, 크게 주면
 * 흰색으로 타서 형태가 뭉개진다. 등의 **모양**이 보여야 등으로 읽힌다.
 */
export function lampGlow(n: number): number {
  const k = Math.max(0, Math.min(1, n));
  // 노을(0.4)에서 이미 0.6 까지 올라온다 — 해가 지기 시작하면 먼저 켜지는 편이
  // 자연스럽고, 어두워진 뒤에 켜지면 "늦게 켜졌다"는 인상이 남는다.
  return k <= 0 ? 0 : Math.min(1, 0.35 + k * 0.65);
}
