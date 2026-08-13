// 그림자 텍셀 스냅 — **추종점이 텍셀 격자 위로만 움직이는가.**
//
// 반짝임을 없애는 성질: 스냅된 카메라는 **정수 텍셀 단위로만** 움직인다. 정수 텍셀
// 이동은 그림자 맵 픽셀의 평행이동이라 래스터화가 다시 계산될 자리가 없다. ⚠ 처음엔
// *"텍셀보다 작게 움직이면 결과 불변"* 으로 적었고 **틀렸다** — 칸 경계 근처에서는
// 미소 이동도 한 칸을 넘긴다(반올림의 본성). 필요한 성질은 불변이 아니라 **이동량의
// 양자화**이고, 이 파일의 핵심 단언이 그것이다.

import { describe, it, expect } from 'vitest';
import { snapToShadowTexel, shadowFrustum } from '../frontend/js/world2/decide/shadow.js';

// 낮 태양 비슷한 방향(정규화). dirY 가 0.7 정도인 기울어진 광원.
const D = (() => {
  const v = { x: 0.5, y: -0.7, z: 0.3 };
  const l = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / l, y: v.y / l, z: v.z / l };
})();
const TEXEL = shadowFrustum(32, 2.4, 60, 2048).texel;

const snap = (x: number, z: number) => snapToShadowTexel(x, z, D.x, D.y, D.z, TEXEL);

describe('snapToShadowTexel', () => {
  it('스냅된 이동은 항상 정수 텍셀 단위다 — 반짝임 제거 성질 그 자체', () => {
    // 광원 기저 축(right·up')에 사영한 두 스냅점의 차가 각 축 보폭의 정수배여야 한다.
    const rx = D.z, rz = -D.x;
    const rl = Math.hypot(rx, rz);
    const r = { x: rx / rl, z: rz / rl };
    const u = { x: -r.z, z: r.x };
    const stepV = TEXEL / Math.abs(D.y);
    const frac = (v: number, step: number) => {
      const m = Math.abs(v / step) % 1;
      return Math.min(m, 1 - m);
    };
    const a = snap(100, -50);
    // 미소~중간 규모의 임의 이동 — 어느 것이든 차이가 격자 보폭의 정수배.
    for (const [dx, dz] of [
      [TEXEL * 0.2, 0], [0, TEXEL * 0.2], [-TEXEL * 0.7, TEXEL * 1.3],
      [3.14, -2.7], [-0.01, 0.02],
    ]) {
      const b = snap(100 + dx, -50 + dz);
      const da = (b.x - a.x) * r.x + (b.z - a.z) * r.z;
      const db = (b.x - a.x) * u.x + (b.z - a.z) * u.z;
      expect(frac(da, TEXEL)).toBeLessThan(1e-9);
      expect(frac(db, stepV)).toBeLessThan(1e-9);
    }
  });

  it('크게 움직이면 결과가 따라온다 — 스냅이 고정점이 아니라 격자다', () => {
    const a = snap(100, -50);
    const b = snap(100 + TEXEL * 40, -50);
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeGreaterThan(TEXEL * 10);
  });

  it('스냅 오차가 텍셀 규모를 넘지 않는다 — 판정 중심이 화면 밖으로 튀지 않는다', () => {
    // up' 축 보폭은 texel/|dirY| 라 오차 상한도 그만큼 커진다. 그 이상 벗어나면
    // 그림자 프러스텀 여유를 갉아먹는다.
    const bound = (TEXEL + TEXEL / Math.abs(D.y)) * 0.5 + 1e-9;
    for (const [x, z] of [[0, 0], [123.4, -567.8], [-31.9, 47.05]]) {
      const s = snap(x, z);
      expect(Math.hypot(s.x - x, s.z - z)).toBeLessThanOrEqual(bound);
    }
  });

  it('퇴화 입력 — texel 0·비유한 좌표·수직/수평 태양이면 그대로 돌려준다', () => {
    expect(snapToShadowTexel(3, 4, D.x, D.y, D.z, 0)).toEqual({ x: 3, z: 4 });
    expect(snapToShadowTexel(Number.NaN, 4, D.x, D.y, D.z, TEXEL).z).toBe(4);
    // 정수리 태양(수평 성분 0) — 기저 퇴화, 스냅 없이 통과
    expect(snapToShadowTexel(3, 4, 0, -1, 0, TEXEL)).toEqual({ x: 3, z: 4 });
    // 수평 태양(dirY≈0) — 지면이 모로 보여 스냅 무의미, 통과
    expect(snapToShadowTexel(3, 4, 1, 0, 0, TEXEL)).toEqual({ x: 3, z: 4 });
  });
});
