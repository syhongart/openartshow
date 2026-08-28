// GLB 월드(world7·world8)의 낮 빛 대비 — **감독이 값을 직접 정한 축이다.**
//
// ── 이 파일이 왜 따로 있나 ──────────────────────────────────────────────────
// `tests/world2-daylight.test.ts` 가 같은 이름의 상수를 이미 잠그고 있는데, **그 계약을
// 여기에 그대로 대면 두 군데가 깨진다**(비율 1.08 < 2 · 총량 2.50 > 2.34). 갈린 것이
// 사고가 아니라 감독 판정이라서다:
//
//   *"태양의 주광원은 동작하는데.. 주변 반사광. 실제 세상으로 보면 청공광이라고
//   할수있겠지? 그런 역활을 하는 필라이트가 없어서. 콘트라스트가 쎄게 느겼던 것 같아."*
//   → 후보 셋(`?dhemi=1.1`·`1.65`·`2.2`)을 걸어 드렸고 → *"1.2 제일 자연스러운데"*
//
// **그런데 이 트리에는 daylight 계약 검사가 0 이었다.** 그래서 1.20 으로 바꾼 커밋이
// 게이트 8종을 그냥 통과했다 — world2 였다면 두 개가 빨간불이 났을 변경이다. 감독
// 판정값이 아무 검사 없이 서 있으면, 다음 사람이 world2 를 보고 「동기화」하는 순간
// 조용히 사라진다(이 트리의 no-sync 정책은 지금 **문서에만** 있다).
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
// 화면이 「자연스러운가」. 그건 감독 실기기가 판정했고 여기서 다시 잴 방법이 없다
// (헤드리스는 WebGL 이라 WebGPU 근거도 못 된다). 여기가 지키는 것은 **계약**이다 —
// 감독이 고른 값이 그대로 나오는가, 태양 우위가 남아 있는가, 노브로 재현 가능한가.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  dayLightMix, DAY_SUN_I, DAY_HEMI_I,
} from '../frontend/js/world-glb/decide/daylight.js';
import { DAY_HEMI_I as W2_HEMI_I } from '../frontend/js/world2/decide/daylight.js';
import { nightness } from '../frontend/js/world-glb/decide/night.js';

describe('GLB 월드 낮 빛 — 감독 판정값의 계약', () => {
  it('⭐ 감독이 고른 값이 그대로 화면에 간다 — 1.20', () => {
    // 감독은 링크로 준 셋(1.1·1.65·2.2)이 아니라 **넷째 값**을 냈다. 후보 선택이 아니라
    // 직접 정한 값이므로 근사치로 뭉개지 않는다.
    expect(DAY_HEMI_I, '감독 판정 2026-08-28 — 바꾸려면 감독 확인이 필요하다').toBe(1.2);
    expect(dayLightMix(0)!.hemi, '상수는 맞는데 함수가 다른 값을 낸다').toBe(1.2);
  });

  it('⭐ world2 와 **같다** — 둘 다 같은 감독 판정값이다 (2026-08-28 뒤집힘)', () => {
    // ⚠ **이 검사는 원래 반대였다**: *"world2 와 갈려 있다 — 「동기화」로 되돌아가는
    // 것을 막는다"*. 그때 근거는 감독이 본 것이 world8 화면이고 world2 는 라이브라
    // 지시 없이 함께 바꾸지 않는다는 것이었다.
    //
    // **그리고 이 검사가 실제로 그 일을 했다.** world2 를 1.2 로 올리자 여기가
    // 빨간불이 났고, 메시지가 *"감독 판정을 확인하고 이 검사를 고쳐라"* 였다 — 지금이
    // 정확히 그 상황이다. 배포 후 카드로 라이브 확대를 물었고 감독이 **「월드2도
    // 1.2 로」** 를 골랐다. 그래서 부등호가 아니라 **등호**로 뒤집는다.
    //
    // 검출력은 유지된다 — 한쪽만 되돌리면 여전히 잡힌다(뮤테이션 (나), 파일 하단).
    expect(DAY_HEMI_I, `world2(${W2_HEMI_I})와 갈렸다 — 한쪽만 되돌린 것은 아닌지 확인하라`)
      .toBe(W2_HEMI_I);
  });

  it('태양 우위는 남는다 — 필라이트를 넣은 것이지 방향광을 버린 것이 아니다', () => {
    // 이 부등호까지 뒤집히면 팔레트(0.95 < 1.0)로 되돌아간 것이고, 그것이 애초에
    // 감독이 *"하드라이트 느낌이 없어"* 라고 한 상태다. 하한은 여기다.
    expect(DAY_SUN_I).toBeGreaterThan(DAY_HEMI_I);
  });

  it('⭐ 옛 계약 둘이 **의도적으로** 깨져 있다 — 기록', () => {
    // 이 검사는 「깨져 있음」을 못 박는다. 다음 사람이 옛 계약을 되살리면 여기가 먼저
    // 빨간불이 나서 **되돌리기 전에** 이 주석을 읽게 된다.
    // ⚠ 옛 계약은 world2 것이었고, 2026-08-28 에 **world2 쪽도 같이 뒤집혔다** —
    // 지금은 `tests/world2-daylight.test.ts` 에도 같은 형태의 기록 검사가 서 있다.
    expect(DAY_SUN_I / DAY_HEMI_I, '옛 계약(>2)으로 되돌아갔다 — 필라이트가 없는 세계다')
      .toBeLessThan(2);
    // 팔레트 총량 1.95 를 넘는다 — 밝아진 것이 아니라 **그늘이 열린 것**이다.
    expect(DAY_SUN_I + DAY_HEMI_I, '총량 보존은 이 트리의 목표가 아니다').toBeGreaterThan(1.95);
  });

  it('노브로 재현할 수 있다 — 감독이 본 링크와 기본값이 같은 화면이어야 한다', () => {
    // `?dhemi=` 상한을 **소스에서 읽는다**(값 미러링 금지). 기본값이 상한 밖이면
    // 감독이 본 `?dhemi=1.2` 화면을 링크로 다시 못 만든다.
    const src = readFileSync('frontend/js/world-glb/features/sky.ts', 'utf8');
    const m = /readNum\('dhemi',\s*DAY_HEMI_I,\s*([\d.]+),\s*([\d.]+)\)/.exec(src);
    expect(m, '`?dhemi=` 노브가 사라졌거나 모양이 바뀌었다').not.toBeNull();
    const [lo, hi] = [Number(m![1]), Number(m![2])];
    expect(DAY_HEMI_I).toBeGreaterThanOrEqual(lo);
    expect(DAY_HEMI_I, `기본값 ${DAY_HEMI_I} 가 노브 상한 ${hi} 밖이다`).toBeLessThanOrEqual(hi);
  });

  it('낮에만 적용된다 — 밤·노을은 `applyNightFloor` 소관이다', () => {
    expect(dayLightMix(nightness('day'))).not.toBeNull();
    expect(dayLightMix(nightness('night')), '밤을 건드리면 밤 하한과 충돌한다').toBeNull();
    expect(dayLightMix(nightness('sunset'))).toBeNull();
  });

  it('멱등이다 — 매 프레임 돌아도 발산하지 않는다', () => {
    expect(dayLightMix(0)).toEqual(dayLightMix(0));
    expect(dayLightMix(0)!.sun).toBe(DAY_SUN_I);
  });
});

// ── 검출력 실측 (뮤테이션, 2026-08-28) ─────────────────────────────────────
// 「검사가 통과했다」는 검출력의 증거가 아니다. 결함을 일부러 심어 실제로 깨지는지 봤다.
//
// **1차 — 이 파일만**(`npx vitest run tests/glb-daylight.test.ts`, 7건):
//   (가) 감독 판정값을 옛 0.55 로 되돌림          → 3 failed  ← 판정 소실 시나리오
//   (나) world2 값을 1.2 로 맞춰 「동기화」        → 1 failed
//   (다) `DAY_SUN_I` 1.3 → 1.0 (태양 우위 소실)   → 1 failed
//   (라) `?dhemi=` 상한 4 → 1 (기본값 재현 불가)  → 1 failed
//   (마) `?dhemi=` 노브를 통째로 삭제              → 1 failed
//   (바) `dayLightMix` 가 밤에도 값을 냄           → 1 failed
//   6/6. 특히 (가)가 이 파일의 존재 이유다 — **그 변경은 신설 전까지 게이트 8종을 전부
//   통과했다.** world2 였다면 두 개가 빨간불이 났을 변경이다.
//
// **2차 — world2 확대 회차**(감독 판정 「월드2도 1.2 로」). (나)의 「동기화」가 이제
// 감독이 고른 상태이므로 그 케이스는 성립하지 않고, 대신 **한쪽만 되돌리는** 축이
// 생겼다. 두 파일 합산(`+ tests/world2-daylight.test.ts`, 17건):
//   (가) world2 만 옛 0.55 로 되돌림               → 4 failed
//   (나) world-glb 만 옛 0.55 로 되돌림            → 3 failed
//   (다) 둘 다 0.55 (완전 회귀)                    → 5 failed
//   (라) world2 `DAY_SUN_I` 1.3 → 1.0             → 1 failed
//   (마) world2 를 3.0 으로 과하게 밝힘            → 5 failed  ← 노출 변경 영역
//   5/5. (가)(나)가 이번에 새로 생긴 축이다 — 두 트리가 **같은 감독 판정값**을 쓰게
//   됐으므로, 이제 위험한 것은 「갈리는 것」이 아니라 **「한쪽만 움직이는 것」**이다.
