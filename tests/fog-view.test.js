// fog-view.js 순수 판정 단위테스트 — 바다 원경 응시(경계 셀 + 시선 내적 + 히스테리시스).
// 좌표 관례: yaw=0 = -Z(북). fwd=(-sin yaw, -cos yaw). 바깥 법선 W(-1,0)/E(+1,0)/N(0,-1)/S(0,+1).
import { describe, it, expect } from 'vitest';
import { isViewingSea, isBehind, behindExitRadii, canDemoteByCooldown } from '../frontend/js/fog-view.js';

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

describe('isBehind — 배후 파셀 판정(각도 히스테리시스)', () => {
  it('yaw=0(전방 -Z): 정남(+Z) 파셀은 배후 true, 정북(-Z)은 false', () => {
    expect(isBehind(0, 10, 0, false)).toBe(true);   // 파셀방향(0,+1) · fwd(0,-1) dot=-1 ≤ -0.707
    expect(isBehind(0, -10, 0, false)).toBe(false); // 정북 dot=+1
  });
  it('측면 파셀(dot=0)은 배후 아님', () => {
    expect(isBehind(10, 0, 0, false)).toBe(false); // 정동 dot=0 > -0.707
  });
  it('히스테리시스: 반각 120°(dot=-0.5)는 wasBehind에 따라 갈림', () => {
    const rx = Math.sqrt(75), rz = 5; // fwd(0,-1)과 120°, dot=-0.5
    expect(isBehind(rx, rz, 0, false)).toBe(false); // 진입 임계 -0.707 미달(덜 배후)
    expect(isBehind(rx, rz, 0, true)).toBe(true);   // 유지 임계 -0.174 통과(데드존 안)
  });
  it('중심 겹침(dist≈0)은 직전 상태 유지', () => {
    expect(isBehind(0, 0, 0, true)).toBe(true);
    expect(isBehind(0, 0, 0, false)).toBe(false);
  });
});

describe('behindExitRadii — fog 연동 배후 EXIT 하한 클램프', () => {
  // world.js 실상수(CELL_MAX=24): STREAM_FULL_EXIT=1.30·24, STREAM_SHELL_EXIT=1.75·24
  const FULL = 24 * 1.30, SHELL = 24 * 1.75; // 31.2 / 42
  const FOG = { a: 24 * 1.9, b: 24 * 1.6, c: 24 * 1.4, d: 24 * 1.2 }; // 45.6 / 38.4 / 33.6 / 28.8(라이브 기본)

  it('라이브 기본 d(fog 28.8): shell=31.5(축소 온전), full=24.48', () => {
    const r = behindExitRadii(FULL, SHELL, FOG.d);
    expect(r.shell).toBeCloseTo(31.5, 6);  // max(31.5, 28.8) → 상한 42 미만
    expect(r.full).toBeCloseTo(24.48, 6);  // max(23.4, 28.8*0.85)
  });

  it('c(33.6): shell=33.6 / b(38.4): shell=38.4·full은 상한(31.2)에 걸려 축소 0', () => {
    expect(behindExitRadii(FULL, SHELL, FOG.c).shell).toBeCloseTo(33.6, 6);
    expect(behindExitRadii(FULL, SHELL, FOG.c).full).toBeCloseTo(28.56, 6);
    expect(behindExitRadii(FULL, SHELL, FOG.b).shell).toBeCloseTo(38.4, 6);
    expect(behindExitRadii(FULL, SHELL, FOG.b).full).toBeCloseTo(FULL, 6); // 상한 클램프 = 축소 0
  });

  it('가장 옅은 a(45.6): 상·하한 상한에 걸려 정상 EXIT와 동일 = 변경 전 동작(신규 노출 0)', () => {
    const r = behindExitRadii(FULL, SHELL, FOG.a);
    expect(r.shell).toBeCloseTo(SHELL, 6); // min(42, 45.6)
    expect(r.full).toBeCloseTo(FULL, 6);   // min(31.2, 38.76)
  });

  it('fog 없음(null·NaN·0·음수)은 기존 ×0.75 고정값으로 폴백', () => {
    for (const bad of [NaN, Infinity, 0, -1, undefined, null]) {
      const r = behindExitRadii(FULL, SHELL, bad);
      expect(r.shell).toBeCloseTo(SHELL * 0.75, 6); // 31.5
      expect(r.full).toBeCloseTo(FULL * 0.75, 6);   // 23.4
    }
  });

  it('불변식: 완전 소멸(shell) EXIT ≥ min(fog.far, 정상 EXIT) — 안개 안 소멸이거나 기존 동작', () => {
    for (const far of Object.values(FOG)) {
      const r = behindExitRadii(FULL, SHELL, far);
      expect(r.shell).toBeGreaterThanOrEqual(Math.min(far, SHELL) - 1e-9);
      expect(r.shell).toBeLessThanOrEqual(SHELL);   // 배후가 정면보다 오래 유지되지 않음
      expect(r.full).toBeLessThanOrEqual(FULL);
      expect(r.full).toBeLessThanOrEqual(r.shell);  // full EXIT ≤ shell EXIT 순서 보존
    }
  });
});

describe('canDemoteByCooldown — 배후 강등 쿨다운 판정(재강등 스래싱 억제)', () => {
  // world.js 실상수: DEMOTE_COOLDOWN_MS=500. 헤드리스 계측으로는 쿨다운 창을 재현할 수 없어
  // (swiftshader RAF가 JS 스레드를 점유해 150ms 요청이 실제 1.4~2.8s로 벌어짐) 상수로 증명한다.
  const CD = 500;

  it('쿨다운 창 안(경과 < 500ms)에서는 재강등을 거부한다', () => {
    expect(canDemoteByCooldown(1000, 1000, CD)).toBe(false); // 경과 0ms — 같은 프레임 재강등
    expect(canDemoteByCooldown(1000, 1001, CD)).toBe(false); // 경과 1ms
    expect(canDemoteByCooldown(1000, 1250, CD)).toBe(false); // 경과 250ms — 창 절반
    expect(canDemoteByCooldown(1000, 1499, CD)).toBe(false); // 경과 499ms — 창 직전
  });

  it('쿨다운 창 경과 후(경과 > 500ms)에는 재강등을 허용한다', () => {
    expect(canDemoteByCooldown(1000, 1501, CD)).toBe(true);  // 경과 501ms — 창 직후
    expect(canDemoteByCooldown(1000, 2000, CD)).toBe(true);  // 경과 1000ms
    expect(canDemoteByCooldown(0, 60000, CD)).toBe(true);    // 장시간 경과
  });

  it('경계값(경과 === cooldownMs)은 허용 — 원식 `< cooldownMs`(거부)의 부정이므로 `>=`', () => {
    expect(canDemoteByCooldown(1000, 1500, CD)).toBe(true);  // 경과 정확히 500ms
    expect(canDemoteByCooldown(0, CD, CD)).toBe(true);        // t0=0 기준 경계
    // 경계 직전/직후와 함께 세 점을 붙여 `<`(거부)→`>=`(허용) 전이 지점을 고정한다.
    expect(canDemoteByCooldown(1000, 1499.999, CD)).toBe(false);
    expect(canDemoteByCooldown(1000, 1500.001, CD)).toBe(true);
  });

  it('lastAt 부재(undefined = 한 번도 강등 안 된 파셀)는 항상 허용', () => {
    expect(canDemoteByCooldown(undefined, 0, CD)).toBe(true);
    expect(canDemoteByCooldown(undefined, 1000, CD)).toBe(true);
    // Map.get 미스가 곧 undefined — parcelDemoteAt에 기록이 없으면 억제할 근거가 없다.
    expect(canDemoteByCooldown(new Map().get('0,0'), 1000, CD)).toBe(true);
  });
});
