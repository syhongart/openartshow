// 광장 판정 테스트.
//
// 광장은 "건물이 0인 파셀" 이다. 감독 지적 "빽빽하다" 의 셋째 원인(숨 쉴 곳이 없다)에
// 대한 처방이고, 감독이 직접 채택했다.
//
// 두 성질이 중요하다 — **갈 수 있어야 하고, 적당히 드물어야 한다.**

import { describe, it, expect } from 'vitest';
import { isPlaza, PLAZA_P } from '../frontend/js/world2/parts/plaza.js';
import { roadDirs } from '../frontend/js/world2/parts/road-topology.js';

describe('광장 — 길이 닿는 곳에만', () => {
  // 갈 수 없는 광장은 광장이 아니라 "아직 안 만든 곳" 으로 읽힌다.
  //
  // 예전에는 "길 없는 파셀은 광장이 아니다"를 검사했다. 도로가 확률이던 시절에는 길이
  // 하나도 없는 파셀이 2.6% 있었기 때문이다. **감독 지시로 도로가 격자가 되면서 그런
  // 파셀이 세상에서 사라졌다** — 표본이 빈 배열이 되어 단언이 한 번도 돌지 않았고,
  // `checked > 50` 가드가 그것을 잡았다(가드가 없었으면 빈 검사가 조용히 통과했다).
  //
  // 계약이 사라진 게 아니라 **더 강해졌다**: 이제 모든 광장이 예외 없이 길에 닿는다.
  it('모든 광장이 길에 닿는다 — 갈 수 없는 광장은 없다', () => {
    let plazas = 0;
    for (let px = -40; px <= 40; px++) {
      for (let pz = -40; pz <= 40; pz++) {
        if (!isPlaza(px, pz)) continue;
        plazas++;
        expect(roadDirs(px, pz).length).toBeGreaterThan(0);
      }
    }
    // 표본에 광장이 실제로 있었는지 확인한다 — 없으면 위 단언이 한 번도 안 돌고
    // 빈 검사가 통과한다(이 프로젝트에서 실제로 겪은 실패 방식이다).
    expect(plazas).toBeGreaterThan(0);
  });

  it('광장이 실제로 나온다 — 그리고 도시를 뒤덮지 않는다', () => {
    let plazas = 0;
    const n = 81 * 81;
    for (let px = -40; px <= 40; px++) {
      for (let pz = -40; pz <= 40; pz++) if (isPlaza(px, pz)) plazas++;
    }
    const rate = plazas / n;
    // 이론값 = 0.974 × PLAZA_P
    expect(rate).toBeGreaterThan(PLAZA_P * 0.6);
    expect(rate).toBeLessThan(PLAZA_P * 1.4);
  });

  it('같은 파셀은 언제나 같은 답 — 결정론', () => {
    for (let i = -30; i <= 30; i++) {
      expect(isPlaza(i, i * 3)).toBe(isPlaza(i, i * 3));
    }
  });

  it('확률을 올리면 광장이 는다 — 값이 실제로 먹는다', () => {
    const count = (p: number) => {
      let n = 0;
      for (let px = -30; px <= 30; px++) {
        for (let pz = -30; pz <= 30; pz++) if (isPlaza(px, pz, p)) n++;
      }
      return n;
    };
    expect(count(0.3)).toBeGreaterThan(count(0.06));
    // 확률 0 이어도 **중앙 광장은 남는다** — 감독이 위치를 지정한 곳이라 확률이 끼어들지
    // 않는다. 그래서 0 을 기대하면 틀리고, "확률로 생긴 것이 없다" 를 봐야 한다.
    const central = count(0);
    expect(central).toBeGreaterThan(0);
    expect(count(0.06)).toBeGreaterThan(central);
  });

  // 도로 위상과 시드가 겹치면 "특정 모양의 길에만 광장이 생기는" 편향이 나온다.
  it('길 모양과 광장이 얽혀 있지 않다', () => {
    const byDirs = [0, 0, 0, 0, 0];
    const totalByDirs = [0, 0, 0, 0, 0];
    for (let px = -40; px <= 40; px++) {
      for (let pz = -40; pz <= 40; pz++) {
        const d = roadDirs(px, pz).length;
        totalByDirs[d]++;
        if (isPlaza(px, pz)) byDirs[d]++;
      }
    }
    // 방향 수 1~4 각각에서 광장 비율이 비슷해야 한다(표본이 충분한 구간만 본다).
    for (let d = 1; d <= 4; d++) {
      if (totalByDirs[d] < 200) continue;
      const rate = byDirs[d] / totalByDirs[d];
      expect(rate).toBeGreaterThan(PLAZA_P * 0.4);
      expect(rate).toBeLessThan(PLAZA_P * 1.8);
    }
  });
});
