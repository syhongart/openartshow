// fog-view.js 순수 판정 단위테스트 — 바다 원경 응시(경계 셀 + 시선 내적 + 히스테리시스).
// 좌표 관례: yaw=0 = -Z(북). fwd=(-sin yaw, -cos yaw). 바깥 법선 W(-1,0)/E(+1,0)/N(0,-1)/S(0,+1).
import { describe, it, expect } from 'vitest';
import { isViewingSea } from '../web/js/fog-view.js';

const W = 10, H = 10;
const D2R = Math.PI / 180;

describe('isViewingSea — 바다 원경 응시 판정', () => {
  it('내부 파셀은 모든 yaw에서 false(경계 아님 → 바다 안 보임)', () => {
    for (let deg = 0; deg < 360; deg += 30) {
      expect(isViewingSea(5, 5, deg * D2R, W, H, false)).toBe(false);
      expect(isViewingSea(5, 5, deg * D2R, W, H, true)).toBe(false); // 내부는 히스테리시스와 무관
    }
  });

  it('북쪽 경계(pz=0): 북(yaw=0) 응시→true, 남(yaw=π)→false', () => {
    expect(isViewingSea(5, 0, 0, W, H, false)).toBe(true);          // fwd=(0,-1)=북, N법선 dot=1
    expect(isViewingSea(5, 0, Math.PI, W, H, false)).toBe(false);   // fwd=(0,+1)=남
  });

  it('서쪽 경계(px=0): 서(yaw=+90°) 응시→true, 동(yaw=-90°)→false', () => {
    expect(isViewingSea(0, 5, 90 * D2R, W, H, false)).toBe(true);   // fwd=(-1,0)=서, W법선 dot=1
    expect(isViewingSea(0, 5, -90 * D2R, W, H, false)).toBe(false); // fwd=(+1,0)=동
  });

  it('남쪽 경계(pz=h-1): 남(yaw=π) 응시→true', () => {
    expect(isViewingSea(5, H - 1, Math.PI, W, H, false)).toBe(true); // fwd=(0,+1)=남, S법선 dot=1
  });

  it('히스테리시스: 반각 50°(dot≈0.643) 시선은 wasSea에 따라 갈림', () => {
    const yaw = 50 * D2R; // 북경계 N법선과 50° → dot=cos50°≈0.643
    expect(isViewingSea(5, 0, yaw, W, H, false)).toBe(false); // OFF→ON 진입 임계 0.707 미달
    expect(isViewingSea(5, 0, yaw, W, H, true)).toBe(true);   // ON 유지 임계 0.5 초과
  });

  it('코너 셀(0,0): 북서 대각(yaw=45°) 응시→true(두 법선 중 max)', () => {
    expect(isViewingSea(0, 0, 45 * D2R, W, H, false)).toBe(true); // W·N 둘 다 dot≈0.707 = 진입 임계
  });
});
