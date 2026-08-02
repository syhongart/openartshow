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

// ── 팔레트와의 관계 (검수관 조건 + 권고, 2026-08-02) ─────────────────────────
//
// `decide/daylight.ts` 의 두 상수는 `sky.js` 낮 맑음 팔레트를 **대체**하는 값이다.
// 저쪽이 바뀌면 "총량을 보존했다" 는 근거가 조용히 무너지고, 아래 전환 스냅의 크기도
// 함께 달라진다. 이 저장소가 값 미러링으로 세 번 데인 자리라 파일을 직접 읽어 묶는다
// (`world2-night.test.ts` 의 `NIGHT_FOG` 대조가 같은 형태의 선례다).
describe('낮 팔레트와의 관계', () => {
  async function dayClear(): Promise<{ sunI: number; hemiI: number }> {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('frontend/js/sky.js', 'utf8');
    const dayBlock = src.slice(src.indexOf('  day: {'));
    const line = dayBlock.slice(0, dayBlock.indexOf('\n', dayBlock.indexOf('clear:')));
    const sun = /sunI:\s*([\d.]+)/.exec(line);
    const hemi = /hemiI:\s*([\d.]+)/.exec(line);
    expect(sun, 'sky.js 낮 맑음 sunI 를 못 찾았다 — 팔레트 구조가 바뀌었다').not.toBeNull();
    expect(hemi, 'sky.js 낮 맑음 hemiI 를 못 찾았다').not.toBeNull();
    return { sunI: Number(sun![1]), hemiI: Number(hemi![1]) };
  }

  it('팔레트의 비율이 뒤집혀 있다 — 감독이 본 증상의 원인이 여기다', async () => {
    const p = await dayClear();
    // 이 부등호가 증상 그 자체다: 하늘 반사광이 태양보다 세서 그림자를 도로 채운다.
    // 팔레트가 고쳐지는 날 이 검사가 깨지고, 그때는 `decide/daylight.ts` 가 필요 없어진다.
    expect(p.hemiI, 'sky.js 낮 팔레트가 고쳐졌다면 이 모듈의 존재 이유를 재검토하라')
      .toBeGreaterThan(p.sunI);
  });

  it('총량을 보존한다 — 팔레트에서 유도한다(상수를 다시 적지 않는다)', async () => {
    const p = await dayClear();
    const before = p.sunI + p.hemiI;
    const after = DAY_SUN_I + DAY_HEMI_I;
    // "밝기가 아니라 비율을 바꾸는 변경" 이라는 주장이 실제로 참인지 본다.
    expect(Math.abs(after - before) / before, '총량이 20% 넘게 움직였다 — 대비가 아니라 노출을 바꾼 것이다')
      .toBeLessThan(0.2);
  });

  // ── 알려진 한계 — 시간대 전환 순간 대비가 한 프레임 사라진다 ────────────────
  //
  // 검수관이 잡았다(2026-08-02, 조건부 승인의 조건). `applyDayContrast` 는 three 객체에
  // **직접 대입**하는데 `sky.js` 내부의 현재값(`cur`)은 그 사실을 모른다. 그래서 낮→노을
  // 전환에서 `sky.js` 가 크로스페이드 시작점을 `cur.sunI`(= 팔레트 0.95)로 잡고, 그 순간
  // 화면에 그려지던 1.30 이 0.95 로 **한 프레임 만에 스냅**한다.
  //
  // 고치려면 `sky.js` 의 `cur` 를 함께 갱신해야 하는데 그 파일은 **라이브 오픈월드와
  // 공유**한다. `onApply` 훅은 적용 *뒤* 통지라 시작점 문제를 못 고친다. 그래서 지금은
  // **고치지 않고 크기를 재서 묶어 둔다**(검수관이 제시한 선택지 (c)).
  //
  // world2 는 behind-flag 이고 기본 시간대가 밤이라, 이 경로는 신 패널로 시간대를 능동적
  // 으로 바꿀 때만 발동한다. 감독이 낮↔노을을 오가며 비교하면 보일 수 있다.
  it('전환 스냅 크기가 알려진 범위 안이다 — 커지면 눈에 띈다', async () => {
    const p = await dayClear();
    const sunSnap = Math.abs(DAY_SUN_I - p.sunI);
    const hemiSnap = Math.abs(DAY_HEMI_I - p.hemiI);
    // 현재 0.35 / 0.45. 팔레트나 상수가 크게 벌어지면 전환이 그만큼 튄다.
    expect(sunSnap, `태양 스냅 ${sunSnap.toFixed(2)}`).toBeLessThan(0.6);
    expect(hemiSnap, `반구 스냅 ${hemiSnap.toFixed(2)}`).toBeLessThan(0.6);
  });
});
