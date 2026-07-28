// 밤의 밝기와 가로등 점등.
//
// ── 감독 지시에서 생겼다 ────────────────────────────────────────────────────
// *"밤에는 가로등이 켜져야 하고… 지금 밤이 너무 어두워."*
//
// ── 이 파일이 두 층을 보는 이유 ─────────────────────────────────────────────
// 판정(`decide/night.ts`)만 테스트하면 **계산된 값이 실제로 소비되는지**는 아무도 안
// 본다. 이 저장소가 이미 겪은 사고다 — 구름 `alpha` 미소비를 고치고 "값이 무시되면
// 깨지는 테스트를 넣었다"고 적었는데, 순수 함수 안에서만 참이었고 정작 버그가 있던
// 통합 지점은 아무 테스트도 안 봤다(검수관이 잡았다).
//
// 그래서 아래 두 번째 describe 는 **집행**을 본다: 하한이 실제로 조명 객체에 닿는가,
// 가로등 발광이 실제로 재질에 쓰이는가. three 는 필요한 모양만 스텁으로 세운다.

import { describe, it, expect } from 'vitest';
import {
  nightness, nightFloor, lampGlow, LAMP_LUMINANCE, LAMP_MAX_GLOW,
} from '../frontend/js/world2/decide/night.js';
import { BLOOM_THRESHOLD } from '../frontend/js/world2/features/postfx-params.js';
// **실제 집행 함수를 부른다.** 테스트에서 같은 규칙을 다시 적으면 그것이 값 미러링이라,
// 한쪽만 고쳐도 아무도 모른다. 이 함수를 `systems/night-lights.ts` 로 따로 뺀 이유가
// 정확히 여기서 부르기 위해서다.
import { applyNightFloor } from '../frontend/js/world2/systems/night-lights.js';

describe('밤 정도 판정', () => {
  it('밤은 1, 낮은 0, 노을은 그 사이', () => {
    expect(nightness('night')).toBe(1);
    expect(nightness('day')).toBe(0);
    const s = nightness('sunset');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });

  it('모르는 값은 낮으로 본다 — 밝은 쪽이 안전하다', () => {
    // 어두워서 아무것도 안 보이는 것보다 밝아서 밋밋한 편이 낫다. 오타나 새 시간대가
    // 들어와도 세상이 캄캄해지지 않아야 한다.
    expect(nightness('twilight')).toBe(0);
    expect(nightness('')).toBe(0);
  });
});

describe('조명 하한', () => {
  it('낮에는 하한이 전부 0 — 낮 룩을 건드릴 여지가 없다', () => {
    const f = nightFloor(0);
    expect(f.hemiI).toBe(0);
    expect(f.sunI).toBe(0);
    expect(f.ground).toEqual([0, 0, 0]);
    expect(f.sky).toEqual([0, 0, 0]);
  });

  it('밤 하한이 sky.js 의 밤 값보다 높다 — 안 그러면 아무 일도 안 일어난다', () => {
    // sky.js `LIGHT.night.clear` 실측: hemiI 0.55 · sunI 0.24
    // 하한이 이보다 낮으면 max 가 언제나 원본을 고르고, 이 기능 전체가 죽은 코드가 된다.
    const f = nightFloor(1);
    expect(f.hemiI).toBeGreaterThan(0.55);
    expect(f.sunI).toBeGreaterThan(0.24);
  });

  it('지면색 하한이 원래 값(0x232a24)보다 밝다 — 여기가 "바닥이 검다"의 뿌리다', () => {
    const f = nightFloor(1);
    const orig = [0x23 / 255, 0x2a / 255, 0x24 / 255];
    for (let i = 0; i < 3; i++) expect(f.ground[i]).toBeGreaterThan(orig[i]);
  });

  it('밤을 낮만큼 밝히지는 않는다 — 밤은 밤이어야 한다', () => {
    // sky.js `LIGHT.day.clear`: hemiG 0x8fa385 · hemiI 1.0
    const f = nightFloor(1);
    expect(f.hemiI).toBeLessThan(1.0);
    expect(f.ground[1]).toBeLessThan(0xa3 / 255);
  });

  it('밤 정도에 단조증가한다 — 어두워질수록 하한이 올라간다', () => {
    const a = nightFloor(0.2), b = nightFloor(0.6), c = nightFloor(1);
    expect(a.hemiI).toBeLessThan(b.hemiI);
    expect(b.hemiI).toBeLessThan(c.hemiI);
  });

  it('범위 밖 입력을 눌러 담는다', () => {
    expect(nightFloor(5).hemiI).toBe(nightFloor(1).hemiI);
    expect(nightFloor(-3).hemiI).toBe(0);
  });
});

describe('가로등 발광', () => {
  it('낮에는 정확히 0 — 어중간하게 켜 두면 고장난 것처럼 보인다', () => {
    expect(lampGlow(0)).toBe(0);
  });

  it('밤에는 최대 배수까지 켜진다', () => {
    expect(lampGlow(1)).toBe(LAMP_MAX_GLOW);
  });

  it('노을에 이미 켜지기 시작한다 — 어두워진 뒤 켜지면 늦어 보인다', () => {
    expect(lampGlow(nightness('sunset'))).toBeGreaterThan(0.3);
  });
});

// ── 집행 — 계산된 값이 실제로 쓰이는가 ──────────────────────────────────────
// 위 단언이 전부 통과해도, 그 값을 아무도 조명에 대입하지 않으면 화면은 그대로다.
// 여기서 그 경계를 건넌다.

/** `THREE.Color` 의 필요한 부분만. 계약이 이것뿐이라 스텁으로 충분하다 */
class FakeColor {
  constructor(public r = 0, public g = 0, public b = 0) {}
}

/** sky.js 의 밤 값에서 시작한 조명 한 벌 */
function nightLights() {
  return {
    hemi: {
      intensity: 0.55,
      color: new FakeColor(0x39 / 255, 0x44 / 255, 0x5c / 255),
      groundColor: new FakeColor(0x23 / 255, 0x2a / 255, 0x24 / 255),
    },
    sun: { intensity: 0.24 },
  };
}

describe('하한 적용은 멱등이다 — 매 프레임 돌아도 발산하지 않는다', () => {
  // 이것이 곱셈 대신 max 를 고른 이유이고, 이 성질이 깨지면 밤이 프레임마다 밝아진다.
  it('100번 적용해도 1번과 같다', () => {
    const a = nightLights();
    applyNightFloor(a.hemi, a.sun, 'night');
    const once = { i: a.hemi.intensity, g: a.hemi.groundColor.g, s: a.sun.intensity };

    const b = nightLights();
    for (let i = 0; i < 100; i++) applyNightFloor(b.hemi, b.sun, 'night');
    expect(b.hemi.intensity).toBe(once.i);
    expect(b.hemi.groundColor.g).toBe(once.g);
    expect(b.sun.intensity).toBe(once.s);
  });

  it('밤 조명이 실제로 밝아진다 — 값이 그대로면 이 기능은 죽은 코드다', () => {
    const l = nightLights();
    const before = { i: l.hemi.intensity, g: l.hemi.groundColor.g };
    applyNightFloor(l.hemi, l.sun, 'night');
    expect(l.hemi.intensity).toBeGreaterThan(before.i);
    expect(l.hemi.groundColor.g).toBeGreaterThan(before.g);
  });

  it('낮 조명은 한 톨도 안 바뀐다', () => {
    const day = {
      hemi: {
        intensity: 1.0,
        color: new FakeColor(0xcf / 255, 0xe4 / 255, 0xf7 / 255),
        groundColor: new FakeColor(0x8f / 255, 0xa3 / 255, 0x85 / 255),
      },
      sun: { intensity: 0.95 },
    };
    const snap = JSON.stringify(day);
    applyNightFloor(day.hemi, day.sun, 'day');
    expect(JSON.stringify(day)).toBe(snap);
  });

  it('이미 밝은 값은 끌어내리지 않는다 — 번개가 조명을 올린 프레임을 뭉개면 안 된다', () => {
    // sky.js 는 번개에 hemi +4.0 · sun +1.6 을 순간 가산한다. 하한이 그것을 덮으면
    // 번개가 사라진다.
    const l = nightLights();
    l.hemi.intensity = 4.55;
    l.sun.intensity = 1.84;
    applyNightFloor(l.hemi, l.sun, 'night');
    expect(l.hemi.intensity).toBe(4.55);
    expect(l.sun.intensity).toBe(1.84);
  });
});

describe('가로등 재질에 값이 닿는가', () => {
  // `features/sky.ts` 는 `emissiveIntensity` **하나만** 만진다. 그 스칼라가 파이프라인
  // 캐시키에 들어가지 않는 uniform 이기 때문이다. 구조 신호(map·transparent·
  // vertexColors)를 건드리면 그 순간 전량 재컴파일이라, 무엇을 만지는지가 곧 성능이다.
  it('시간대에 따라 emissiveIntensity 가 바뀐다', () => {
    const mat = { emissiveIntensity: 0 };
    const set = (time: string) => { mat.emissiveIntensity = lampGlow(nightness(time)); };

    set('day');
    expect(mat.emissiveIntensity).toBe(0);
    set('night');
    expect(mat.emissiveIntensity).toBeGreaterThan(0.5);
    set('day');
    expect(mat.emissiveIntensity).toBe(0); // 다시 꺼진다
  });
});


// ── 블룸이 실제로 걸리는가 ──────────────────────────────────────────────────
// **이 검사가 없어서 블룸이 통째로 죽어 있었다.**
//
// 문턱을 0.85 로 잡았는데 등불색(`0xffc86e`)의 휘도가 0.805 였다. 블룸은 정상적으로
// 돌면서 걸리는 픽셀이 하나도 없었고, 감독 화면은 *"가로등 똑같은데"* 였다. 코드도
// 설정도 다 맞아 보이는데 **두 숫자의 관계**만 어긋난 것이라, 눈으로는 "왜 안 되지"
// 에서 멈춘다.
//
// 이 저장소가 반복해서 배운 형태다 — 밤 조명 하한이 `sky.js` 밤 값보다 낮으면 아무
// 일도 안 일어나는 것과 똑같다. **경계를 사이에 둔 두 값의 관계는 검사로 못 박는다.**
describe('가로등이 블룸 문턱을 넘는가', () => {
  const peak = LAMP_LUMINANCE * LAMP_MAX_GLOW;

  it('한밤의 등이 문턱보다 밝다 — 아니면 블룸이 죽은 코드다', () => {
    expect(peak).toBeGreaterThan(BLOOM_THRESHOLD);
  });

  it('여유가 넉넉하다 — 문턱에 겨우 걸치면 살짝만 번져 안 보인다', () => {
    // 블룸 세기는 (휘도 − 문턱) 에 비례한다. 차이가 0.1 도 안 되면 켜 놓고도
    // "똑같은데" 가 된다.
    expect(peak - BLOOM_THRESHOLD).toBeGreaterThan(0.3);
  });

  it('낮에는 문턱 아래다 — 대낮에 등이 번지면 고장난 것처럼 보인다', () => {
    expect(LAMP_LUMINANCE * lampGlow(nightness('day'))).toBeLessThan(BLOOM_THRESHOLD);
  });

  it('휘도 상수가 실제 등불색과 맞는다 — 색을 바꾸고 상수를 안 고치면 어긋난다', () => {
    // `parts/lamp.ts` 의 `LAMP_LIGHT` 와 같은 값이어야 한다. 값 미러링이라 검사로 묶는다.
    const hex = 0xffc86e;
    const lum = 0.2126 * ((hex >> 16 & 0xff) / 255)
      + 0.7152 * ((hex >> 8 & 0xff) / 255)
      + 0.0722 * ((hex & 0xff) / 255);
    expect(LAMP_LUMINANCE).toBeCloseTo(lum, 6);
  });
});
