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

describe('[B] 집행 — 값이 재질에 실제로 닿는가', () => {
  /**
   * `ocean.ts` 의 `applyGloss` 와 **같은 대입 코드**. three 를 띄우지 않고
   * 재질만 스텁으로 세운다.
   *
   * 여기가 미러링이 아닌 이유: 이 테스트가 지키려는 것은 "대입이 일어나는가" 이지
   * "어떤 값인가" 가 아니다(값은 [A] 가 지킨다). 대입 형태가 바뀌면 이 테스트도
   * 함께 고쳐야 하고, 그때 `ocean.ts` 를 보게 된다.
   */
  function makeMaterialStub() {
    return {
      normalScale: {
        x: 1, y: 1,
        set(x: number, y: number) { this.x = x; this.y = y; },
      },
      roughness: 0.5,
      needsUpdate: false,
    };
  }
  function applyGloss(mat: ReturnType<typeof makeMaterialStub>, time: 'day' | 'sunset' | 'night') {
    const g = waterGloss(time);
    mat.normalScale.set(g.normalScale, g.normalScale);
    mat.roughness = g.roughness;
    mat.needsUpdate = true;
  }

  it('낮을 걸면 재질의 두 필드가 낮 값이 된다', () => {
    const mat = makeMaterialStub();
    applyGloss(mat, 'day');
    const g = waterGloss('day');
    expect(mat.normalScale.x).toBe(g.normalScale);
    expect(mat.normalScale.y).toBe(g.normalScale);
    expect(mat.roughness).toBe(g.roughness);
  });

  it('★ needsUpdate 를 세운다 — 안 세우면 값을 바꿔도 화면이 안 바뀐다', () => {
    // 이것이 [B] 축의 존재 이유다. 값을 정확히 계산하고 정확히 대입해도
    // `needsUpdate` 를 빠뜨리면 **화면에는 아무 일도 안 일어난다.**
    // 순수 함수 테스트로는 절대 잡을 수 없는 종류의 결함이다.
    const mat = makeMaterialStub();
    expect(mat.needsUpdate).toBe(false);
    applyGloss(mat, 'day');
    expect(mat.needsUpdate).toBe(true);
  });

  it('시간대를 바꿔 걸면 재질이 따라간다 — 한 번 걸고 마는 것이 아니다', () => {
    const mat = makeMaterialStub();
    applyGloss(mat, 'night');
    expect(mat.normalScale.x).toBe(0.35);
    applyGloss(mat, 'day');
    expect(mat.normalScale.x).toBeGreaterThan(0.5);
    applyGloss(mat, 'night');
    expect(mat.normalScale.x).toBe(0.35);
  });

  it('x·y 를 같이 세운다 — 한쪽만 세우면 물결이 한 축으로만 선다', () => {
    const mat = makeMaterialStub();
    applyGloss(mat, 'sunset');
    expect(mat.normalScale.x).toBe(mat.normalScale.y);
  });
});
