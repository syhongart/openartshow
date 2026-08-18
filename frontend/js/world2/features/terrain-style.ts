// world2/features/terrain-style.ts — 스타일라이즈드 지형. **새 기계장치를 안 만든다.**
//
// 감독 지시 2026-08-18: 지형에 노이즈 색 변주와 레이어 질감. 그런데 그것을 얹는 경로가
// **이미 둘 다 있다**:
//   · 생성 — `scripts/gen-textures.mjs` 가 순수 수식으로 심리스 PNG 를 굽는다(IP 자작)
//   · 적용 — `features/surface-paint.ts` 가 맵 슬롯 교체·부팅 스냅샷·복원·회수를 전부 한다
// 그래서 이 파일이 하는 일은 **둘을 잇는 프리셋 한 벌**이 전부다. 로드도 dispose 도 여기서
// 안 만든다 — 만들면 회수 경로가 두 벌이 되고, 그것이 이 저장소가 금지한 형태다
// (`features/types.ts` 의 팀장 판정 *"회수는 한 곳, 소유는 조립부"*).
//
// ── 감독 명세 중 못 하는 것 ─────────────────────────────────────────────────
// *"Slope 기반 Rock 자동 배치"* 는 **입력이 0 이다** — `parts/surface.ts` 가 적은 대로
// world2 지형은 전부 평면이라 경사라는 값이 존재하지 않는다. 그래서 rock 타일을 굽지도
// 않았다(얹을 표면이 없는 자산은 죽은 자산이다). 대신 흙 얼룩을 타일 안에 구워 같은
// 인상을 만든다 — 같은 결과, 다른 근거다.

import type { Feature, FeatureEnv, FeatureInstance } from './types.js';
import type { SurfaceSetting } from '../decide/surface-material.js';
import { readNum, readNumOpt } from '../url-knob.js';
import { STYLIZED_KNOB, stylizedOn } from '../decide/stylized.js';

/**
 * 얹을 프리셋. `repeat` 은 노브가 곱한다.
 *
 * 기본 배율의 근거: 파셀 한 변이 32m 이고 잔디 판은 그 한 칸을 통째로 덮는다. `repeat:16`
 * 이면 타일 하나가 2m 로 보이는데, 실제 풀(인스턴싱 메시)이 30cm 급이라 그 사이 바닥
 * 무늬가 2m 면 «풀 사이로 비치는 땅» 으로 자연스럽게 읽힌다. 더 잘게 하면 멀리서
 * 모아레가 지고, 더 크게 하면 얼룩이 «판» 으로 보인다.
 */
const PRESET: readonly SurfaceSetting[] = [
  {
    kind: 'garden',
    map: 'assets/textures/grass-toon.png',
    repeat: 16, turns: 0, metalness: 0, roughness: 1,
  },
  {
    kind: 'ground',
    map: 'assets/textures/dirt-toon.png',
    // 지면은 광장처럼 넓게 드러나는 자리라 잔디보다 성기게 — 같은 배율이면 광장에서
    // 반복이 눈에 띈다.
    repeat: 10, turns: 0, metalness: 0, roughness: 1,
  },
];

export const terrainStyleFeature: Feature = {
  name: 'terrain-style',
  create(env: FeatureEnv): FeatureInstance | null {
    const master = readNum(STYLIZED_KNOB, 0, 0, 1);
    if (!stylizedOn(master, readNumOpt('gtex', 0, 1))) return null;

    const tile = readNum('gtile', 1, 0.25, 4);
    const current = env.surfaces();
    const taken = new Set(current.map((s) => s.kind));

    // **감독이 이미 설정한 종류는 안 덮는다.** 설정은 오버레이 JSON 이나 편집 패널에서
    // 오고, 그것은 감독이 직접 고른 값이다 — 프리셋이 이기면 감독의 선택이 조용히
    // 사라지고 «편집이 안 먹는다» 로 보인다. 비어 있는 자리만 채운다.
    const add = PRESET.filter((p) => !taken.has(p.kind))
      .map((p) => ({ ...p, repeat: p.repeat * tile }));

    if (add.length > 0) {
      // ⚠ **새 배열을 준다**(제자리 수정 금지). 집행이 참조 동등성으로 «바뀌었는가» 를
      // 판정하므로 같은 배열을 고치면 화면이 안 따라오고, 그 실패는 «가끔 안 먹는다» 로만
      // 보인다 — `FeatureEnv.surfaces` 의 계약이 그 사실을 못 박고 있다.
      env.setSurfaces([...current, ...add]);
    }

    return {
      diagnostics: () => ({
        applied: add.map((s) => s.kind),
        // 감독이 직접 설정한 것이 있어 우리가 비켜선 종류. 화면이 기대와 다를 때
        // 여기를 먼저 본다.
        skipped: PRESET.filter((p) => taken.has(p.kind)).map((p) => p.kind),
        tile,
      }),
      // ⚠ dispose 가 없다. 표면 설정의 소유는 조립부이고 되돌리기는
      // `features/surface-paint.ts` 의 부팅 스냅샷이 한다 — 여기서 또 되돌리면 회수가
      // 두 벌이 된다. 이 기능이 하는 일은 «설정을 한 번 얹는 것» 뿐이다.
    };
  },
};
