// 낮 빛 대비 — **감독 지시의 본체이고, 내가 한 번 틀린 축이다.**
//
// ── 이 검사가 서 있는 배경 ──────────────────────────────────────────────────
// 감독 지시 *"주간에 하드라이트 느낌이 없어"* 의 원인을 처음엔 그림자 카메라 프러스텀
// (±5m)으로 짚었고 **틀렸다.** 같은 좌표에서 2×2 로 재니 대비(화면 밝기 표준편차)가
// 프러스텀으로는 +0.25, 광비율로는 +3.74 였다 — **광비율이 7~15배다.**
//
// 낮 팔레트가 태양 0.95 · 반구 1.0 이라 하늘 반사광이 태양보다 세고, 그래서 그림자
// 영역을 도로 채운다. 그림자를 아무리 정확히 그려도 반사광이 메우면 대비가 안 생긴다.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
// 이 값이 화면에서 "하드라이트로 보이는가" 는 여기서 알 수 없다 — 룩 판정은 디자이너와
// 감독 실기기 몫이고, 헤드리스는 WebGL 이라 WebGPU 근거도 되지 못한다. 여기가 지키는
// 것은 **계약**이다: 낮에만 적용되는가, 멱등인가, 비율이 뒤집혀 있는가.

import { describe, it, expect } from 'vitest';
import {
  dayLightMix, DAY_SUN_I, DAY_HEMI_I,
} from '../frontend/js/world2/decide/daylight.js';
import { nightness } from '../frontend/js/world2/decide/night.js';

describe('낮 빛 대비 — 계약', () => {
  it('태양이 반구광보다 세다 — 이 부등호가 뒤집히면 하드라이트가 아니다', () => {
    // 감독이 본 증상이 정확히 이 부등호가 반대였던 것이다(팔레트 0.95 < 1.0).
    expect(DAY_SUN_I).toBeGreaterThan(DAY_HEMI_I);
    // 비율이 축이다. 2 배 아래로 내려가면 실측상 대비가 거의 안 생겼다.
    expect(DAY_SUN_I / DAY_HEMI_I).toBeGreaterThan(2);
  });

  it('총량을 크게 흔들지 않는다 — 밝기가 아니라 비율을 바꾸는 변경이다', () => {
    // 팔레트 총량 0.95 + 1.0 = 1.95. 여기서 크게 벗어나면 "대비를 올린" 것이 아니라
    // "화면을 밝히거나 어둡게 한" 것이 된다.
    const total = DAY_SUN_I + DAY_HEMI_I;
    expect(total).toBeGreaterThan(1.95 * 0.8);
    expect(total).toBeLessThan(1.95 * 1.2);
  });

  it('낮에만 적용된다 — 밤·노을은 `applyNightFloor` 소관이다', () => {
    expect(dayLightMix(nightness('day'))).not.toBeNull();
    // 두 축이 같은 값을 반대로 당기면 어느 쪽이 이겼는지 아무도 모른다.
    expect(dayLightMix(nightness('night')), '밤을 건드리면 밤 하한과 충돌한다').toBeNull();
    expect(dayLightMix(nightness('sunset')), '노을의 부드러운 빛은 물리적으로 맞다').toBeNull();
  });

  it('멱등이다 — 매 프레임 돌아도 발산하지 않는다', () => {
    // 이 축의 소비 지점은 매 프레임 돈다. 처음에 배수로 설계했다가
    // `night-lights.ts` 의 경고 주석("배수를 곱하면 프레임마다 곱해져 발산한다")을 읽고
    // 절대값으로 고쳤다. 그 성질을 검사로 굳힌다.
    const a = dayLightMix(0)!;
    const b = dayLightMix(0)!;
    expect(a).toEqual(b);
    // 값 자체가 입력에 의존하지 않는다 = 몇 번 대입해도 같다.
    expect(a.sun).toBe(DAY_SUN_I);
    expect(a.hemi).toBe(DAY_HEMI_I);
  });

  it('URL 노브가 상수를 덮는다 — 감독이 실기기에서 값을 비교할 수 있어야 한다', () => {
    const t = dayLightMix(0, { sun: 2.2, hemi: 0.2 })!;
    expect(t.sun).toBe(2.2);
    expect(t.hemi).toBe(0.2);
    // 한쪽만 줘도 나머지는 상수로 남는다.
    expect(dayLightMix(0, { sun: 2.2 })!.hemi).toBe(DAY_HEMI_I);
  });

  it('밤 판정 범위 밖의 값에도 안전하다', () => {
    expect(dayLightMix(-1)).not.toBeNull();  // 음수는 낮으로 본다
    expect(dayLightMix(2)).toBeNull();
  });
});
