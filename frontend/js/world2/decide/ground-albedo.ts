// 지면 파츠의 **알베도** — 낮 휘도를 레지스트리에서 유도하고 밤 배수를 판정한다.
// 순수 판정이라 three 도 씬도 모른다.
//
// ── 왜 이 파일이 생겼나 (감독 지시 2026-08-05 *"재질 배선 진행해"*) ──────────
// 밤이 밤답지 않다는 지적을 여러 번 받았고, 처방은 매번 조명·노출이었다. 그런데
// `decide/night.ts` 의 실측이 그 축의 한계를 드러냈다: 지면을 덮는 파츠들의 재질은
// **시간대를 전혀 받지 않는다.** 밤 처방은 전부 빛이고, 빛은 알베도에 **곱해진다.**
// 그래서 같은 조명 한 벌이 알베도가 높은 잔디는 형광으로, 낮은 도로는 검정으로 만든다.
// 두 증상은 한 축의 양끝이다.
//
// ── 무엇을 만지는가 ─────────────────────────────────────────────────────────
// `MeshStandardMaterial.color` 하나다. **uniform 이라 파이프라인 캐시키에 안 들어간다** —
// 매 프레임 바꿔도 재컴파일이 없다(`systems/instancing.ts` 의 `materialOf` 주석이 정한
// 규약이고, 가로등 `emissiveIntensity` 가 그 첫 소비자였다). `map`·`transparent` 같은
// 구조 신호는 여기서 절대 건드리지 않는다.
//
// ── 목록을 여기에 적지 않는다 ───────────────────────────────────────────────
// 처음엔 지면 파츠 세 이름을 배열 리터럴로 이 파일에 적었고, `world2-parts-registry`
// 테스트가 그것을 잡았다(그 검사는 파츠 이름이 한 줄에 둘 이상 인용되면 목록을 다시 적은
// 것으로 본다 — 이 주석이 이름을 나열하지 않는 이유이기도 하다). 옳은 지적이다: 새 지면
// 파츠가 생기면 그 목록이 조용히 낡고, 증상은 *"그 파츠만 밤에 안 어두워짐"* 이라 원인을
// 짐작하기 어렵다.
//
// 그래서 파츠가 **자기 성질을 신고**하고(`PartSpec.groundBase`) 여기서는 레지스트리를
// 걸러내기만 한다. 색의 원천도 파츠 쪽에 있다 — 텍스처를 굽는 것이 파츠이므로 거기가
// 원래 자리이고, 이 방향(`decide → parts`)이 기존 의존과도 같다.

import { PARTS } from '../parts/index.js';

/** 지면을 덮는 파츠 이름. **레지스트리에서 유도된다** — 여기 목록을 적지 않는다 */
export const GROUND_KEYS: readonly string[] =
  PARTS.filter((p) => p.groundBase !== undefined).map((p) => p.kind);

/** sRGB 채널(0~1) → 선형. IEC 61966-2-1 의 역전달함수 */
function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * sRGB hex 의 **선형 휘도**(Rec.709). 0~1.
 *
 * 감마를 반드시 푼다. sRGB 채널값을 그대로 가중합하면 어두운 색이 실제보다 훨씬 밝게
 * 나오고, 그러면 아래 배수가 통째로 틀린다 — 아스팔트(`#2a2d33`)는 sRGB 평균 0.18 이지만
 * 선형 휘도는 **0.026** 이다. 7배 차이다.
 */
export function srgbLuminance(hex: number): number {
  const r = toLinear(((hex >> 16) & 0xff) / 255);
  const g = toLinear(((hex >> 8) & 0xff) / 255);
  const b = toLinear((hex & 0xff) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** `tones` 의 평균 휘도. 배치가 균등 확률로 고르므로 기대값이 이것이다 */
function meanLuminance(tones: readonly number[]): number {
  let s = 0;
  for (const t of tones) s += srgbLuminance(t);
  return s / tones.length;
}

/**
 * 각 파츠의 **낮 대표 알베도 휘도.**
 *
 * 최종 알베도 = `map` 샘플 × `material.color` × `instanceColor`(=`tones`) 이므로
 * `groundBase × tones 평균` 으로 잡는다. `map` 이 없는 파츠는 `groundBase` 가 흰색(=1)
 * 이라 `tones` 만 남는다 — 같은 식이 양쪽을 덮는다.
 *
 * ⚠ **근사다.** 텍스처는 바탕색 위에 풀결·자갈·얼룩을 덧그리므로 실제 텍셀 평균은
 * 바탕과 조금 다르다. 그 편차를 재려면 캔버스를 실제로 굽고 픽셀을 평균 내야 하는데,
 * 그것은 순수 판정이 아니고 DOM 이 필요하다. 여기서 필요한 것은 **파츠 사이의 비**이고
 * 덧그림은 저대비·저면적이라(불투명도 0.32/0.45 상한) 비를 뒤집지 않는다. 근사인 것을
 * 적어 두는 이유는, 언젠가 텍스처가 크게 바뀌면 이 전제부터 다시 봐야 하기 때문이다.
 */
export const DAY_ALBEDO: Record<string, number> = Object.fromEntries(
  PARTS.filter((p) => p.groundBase !== undefined)
    .map((p) => [p.kind, srgbLuminance(p.groundBase as number) * meanLuminance(p.tones)]),
);

/**
 * 밤 알베도의 **기준 파츠.** 이보다 밝은 것만 여기까지 끌어내린다.
 *
 * ── 왜 지면 판인가 (값을 고르지 않고 유도한다) ─────────────────────────────
 * 세 파츠의 낮 휘도는 잔디 0.316 · 지면 0.135 · 도로 0.026 이다. 그런데 **지면 대 도로
 * 5.2배는 감독이 승인한 대비다** — *"바닥 격자 바닥이 잘 드러나지 않아"* 에 대한 처방이
 * 정확히 지면을 그 자리까지 밝힌 것이었다(`parts/ground.ts` 의 `tones` 주석). 그 대비를
 * 줄이면 그때 고친 것이 되돌아간다.
 *
 * 튀어 있는 것은 잔디 하나다(도로의 12배). 그러니 기준은 **지면 판**이고, 밤 배수는
 * `지면 / 잔디` 로 저절로 나온다. 임의로 고른 숫자가 없고, 파츠의 색을 바꾸면 배수가
 * 따라온다.
 *
 * 도로는 밤에 손대지 않는다(배수 1). 알베도 0.026 자체가 낮은 것은 낮·밤 공통 사안이라
 * 밤 처방으로 고칠 것이 아니다 — `decide/night.ts` 의 `NIGHT_GROUND_SCALE` 주석이 이미
 * 같은 판정을 내렸다. **밤에 지면을 밝히는 방향은 여기 없다**: 배수는 항상 1 이하다.
 */
const TINT_REF = 'ground';

/**
 * 밤 알베도 압축의 **강도**. 1 이면 기준 파츠까지 완전히 내린다.
 *
 * 기본값이 1 인 이유는 위 유도가 이미 "어디까지" 를 정했기 때문이다 — 강도를 따로 깎으면
 * 그 깎은 값이 근거 없는 숫자가 된다. 노브(`?gtint=`)를 여는 이유는 밤 노브들과 같다:
 * **헤드리스는 WebGL 이고 감독 기기는 WebGPU** 라 톤매핑을 거친 최종 밝기가 같지 않고,
 * 최종 판정은 감독 화면이다. `?gtint=0` 이면 이 기능 전체가 no-op 이라 되돌리는 방법이
 * 하나로 끝난다.
 */
export const GROUND_TINT_STRENGTH = 1;

/**
 * 시간대별 지면 알베도 배수. `material.color` 에 곱할 **회색 스칼라**다.
 *
 * ── 낮에는 정확히 1 ─────────────────────────────────────────────────────────
 * `n=0` 이면 전부 1(곱셈 항등원)이라 낮 룩을 건드릴 여지가 원천적으로 없다. 노을(0.4)
 * 에서는 부분적으로 눌린다 — 해가 기울면 잔디의 형광기가 먼저 빠지는 편이 자연스럽다.
 *
 * ── 왜 색조가 아니라 밝기만 만지는가 ────────────────────────────────────────
 * 밤에 지면 색조를 푸르게 미는 것은 **룩의 판단**이고 디자이너·감독 소관이다. 여기서
 * 고치는 것은 그것이 아니라 **파츠 사이의 밝기 비**다. 축을 섞으면 어느 쪽이 화면을
 * 움직였는지 못 가른다 — 이 저장소가 반복해 겪은 형태다.
 */
export function groundTint(
  n: number, strength: number = GROUND_TINT_STRENGTH,
): Record<string, number> {
  const k = Math.max(0, Math.min(1, n));
  const s = Math.max(0, Math.min(1, strength));
  const ref = DAY_ALBEDO[TINT_REF];
  const out: Record<string, number> = {};
  for (const key of GROUND_KEYS) {
    // 기준이 없으면(기준 파츠가 빠진 세계) 아무것도 하지 않는다 — 잘못 눌러 어두워지는
    // 것보다 손대지 않는 편이 안전하다. 그 상태는 아래 테스트가 잡는다.
    // 기준보다 어두운 것도 그대로 둔다 — 밤에 밝히는 것은 이 판정의 일이 아니다.
    const target = ref ? Math.min(1, ref / DAY_ALBEDO[key]) : 1;
    out[key] = 1 + (target - 1) * s * k;
  }
  return out;
}
