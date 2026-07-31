// 수면 광택 — 판정(`waterGloss`)과 **집행**(재질에 실제로 닿는가) 양쪽.
//
// ── 왜 두 축인가 ────────────────────────────────────────────────────────────
// 이 저장소가 명문화한 사고 형태: *"판정/집행 분리의 구멍 — 경계를 건너는 지점은
// 아무도 안 본다. `decide/` 를 순수 함수로 두면 각 쪽은 테스트하기 쉬워지지만,
// '계산된 값이 실제로 소비되는가' 는 양쪽 테스트 어디에도 안 걸린다."*
//
// 실제로 이 저장소는 구름 `alpha` 미소비로 그 사고를 냈다 — 순수 함수 안에서만 참인
// 테스트를 넣고 "값이 무시되면 깨진다" 고 적었는데, 정작 버그가 있던 통합 지점은
// 아무 테스트도 안 봤다(검수관이 잡았다).
//
// 그래서 축을 둘로 나눈다:
//   [A] 판정 — `waterGloss(time)` 이 시간대별로 다른 값을 주는가 (순수)
//   [B] 집행 — 그 값이 `MeshStandardMaterial` 에 **실제로 대입되는가** (스텁 통합)
//
// [B] 는 three 의존을 스텁으로 대체해 **실제 대입 코드를 돌린다**. `ocean.ts` 전체를
// 띄우려면 캔버스·씬·풀이 필요해서 단위 테스트가 못 닿는데, 대입 로직만 떼면 닿는다.
//
// ── 못 보는 것 ──────────────────────────────────────────────────────────────
// 화면에 실제로 반짝임이 보이는지는 못 본다(헤드리스는 SwiftShader 이고, 감독 실기기는
// WebGPU 다). 값이 재질에 닿았다는 것과 눈에 보인다는 것은 다른 일이다 — 육안 판정은
// 감독 몫이다.

import { describe, it, expect } from 'vitest';
import { waterGloss } from '../frontend/js/world2/decide/water.js';

describe('[A] waterGloss — 판정', () => {
  it('낮은 좁고 강하다 — 반짝임이 나오려면 물결 기울기가 살아야 한다', () => {
    const g = waterGloss('day');
    // 감독 지시 "반짝임부터 살려봐" 의 핵심. 예전 전역값 0.35 로는 법선이 평평해
    // 빛이 튈 각도가 없었다.
    expect(g.normalScale).toBeGreaterThan(0.5);
    // 거칠기가 낮아야 하이라이트가 **점**으로 맺힌다. 높으면 흐린 띠가 된다.
    expect(g.roughness).toBeLessThan(0.3);
  });

  it('★ 밤은 예전 지시를 지킨다 — 낮을 살리려다 밤을 되돌리면 안 된다', () => {
    // 감독이 예전에 *"밤인데 빛이 이렇게 많지 않잖아"* 라고 지적해 낮춘 값이다.
    // 이 단언이 그 지시를 보존한다 — 누가 전역으로 반짝임을 올리면 여기가 깨진다.
    const g = waterGloss('night');
    expect(g.normalScale).toBe(0.35);
    expect(g.roughness).toBe(0.62);
  });

  it('낮이 밤보다 반짝인다 — 이 순서가 뒤집히면 지시가 뒤집힌 것이다', () => {
    const day = waterGloss('day');
    const night = waterGloss('night');
    expect(day.normalScale).toBeGreaterThan(night.normalScale);
    expect(day.roughness).toBeLessThan(night.roughness);
  });

  it('노을은 낮과 밤 사이다 — 광원이 낮고 커서 띠가 길게 끌린다', () => {
    const s = waterGloss('sunset');
    const day = waterGloss('day');
    const night = waterGloss('night');
    expect(s.normalScale).toBeLessThan(day.normalScale);
    expect(s.normalScale).toBeGreaterThan(night.normalScale);
    expect(s.roughness).toBeGreaterThan(day.roughness);
    expect(s.roughness).toBeLessThan(night.roughness);
  });

  it('세 시간대가 서로 다른 값이다 — 하나라도 같으면 분기가 무의미해진다', () => {
    const seen = new Set(['day', 'sunset', 'night'].map((t) => {
      const g = waterGloss(t as 'day' | 'sunset' | 'night');
      return `${g.normalScale}/${g.roughness}`;
    }));
    expect(seen.size).toBe(3);
  });
});

// ── [B] 집행 축은 여기 없다 (검수관 블로커 2026-07-31, 실증으로 제거) ─────────
//
// 이 자리에 "[B] 집행 — 값이 재질에 실제로 닿는가" 라는 섹션이 있었다. `ocean.ts` 의
// `applyGloss` 를 **테스트 파일 안에 다시 적은 사본**을 만들고 그 사본을 검사했다.
// 주석에는 "경계를 건너는 지점을 본다" 고 적혀 있었지만, 검수관이 실제 `ocean.ts` 를
// 훼손해 실증한 결과:
//
//   · `seaMat.needsUpdate = true;` 제거     → 47 passed 0 failed
//   · `seaMat.roughness = 0.62;` 강제 대입   → 47 passed 0 failed
//     (= `waterGloss` 완전 무력화. 이 브랜치가 고치려던 버그를 그대로 재현)
//
// 사본은 **자기 자신만 지킨다.** 그리고 없는 것보다 나쁘다 — 통합 축이 있다고 읽히니
// 아무도 진짜를 만들지 않는다. 이 파일이 경고하던 구름 `alpha` 사고가, 그 경고를 적은
// 파일 자신에서 되풀이된 형태다.
//
// **집행 축은 `tests/world2-ocean.test.ts` 의 「수면 광택」 블록으로 옮겼다.** 거기는
// `mount()` 가 실제 `oceanFeature.create` 를 태우므로 위 두 뮤테이션이 실제로 깨진다.
// 이 파일에는 판정([A])만 남긴다.
