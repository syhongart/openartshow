// decide/glb-normal.ts — GLB 재질의 노말맵 **강도 노브** 판정. 순수 함수, three 무의존.
//
// 감독 지시 2026-09-06 *"전체적으로 노말맵을 넣어줘"* → 팀장 조건 6: 재배포 없이 on/off 와 강도 3후보를
// 링크로 비교한다. 산출 GLB(`scripts/asset/nyc/textures.mjs`)에 구운 `normalTexture.scale` 위에 이 배율을
// 곱한다 — 0 이면 노말맵을 뗀다(대조군), 1 이면 산출 그대로.
//
//   ?nrm=0    노말맵 없음(텍스처 알베도는 유지)      ?nrm=0.6  약하게
//   ?nrm=1    산출 그대로(기본)                       ?nrm=1.5  강하게
//
// 판정 결과와 감독 실측은 `NORMAL_KNOB_DEFAULT` 주석 옆에 이어 적는다(팀장 조건 6).

/** 기본 배율. ⏳ 감독 판정 대기(링크 비교 뒤 굽는다) — 후보 0.6 / 1 / 1.5 */
export const NORMAL_KNOB_DEFAULT = 1;
export const NORMAL_KNOB_MAX = 3;

export interface NormalKnob {
  /** `normalScale` 에 곱할 배율 */
  scale: number;
  /** 노말맵을 뗀다(`?nrm=0`) */
  strip: boolean;
}

export function normalKnob(raw: number | null | undefined): NormalKnob {
  const k = raw == null || !Number.isFinite(raw) ? NORMAL_KNOB_DEFAULT : Math.max(0, Math.min(NORMAL_KNOB_MAX, raw));
  return { scale: k, strip: k === 0 };
}
