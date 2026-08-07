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
// **팔레트 hex 를 채널 값으로 만드는 일을 three 에게 시킨다.** 아래 `palette()` 독블록이
// 이유를 소유한다 — 요약하면 변환식을 여기 적는 순간 그것이 미러링이고, 이 파일은 실제로
// 그 미러링 때문에 **자기가 지킨다고 적은 것을 못 지킨 채 통과**한 적이 있다.
// `three/webgpu` 가 아니라 `three` 인 것은 색 관리가 두 빌드의 공유 코드이고, WebGPU
// 번들은 node 에서 무겁기만 하기 때문이다.
import { Color } from 'three';
import {
  nightness, nightFloor, lampGlow, LAMP_LUMINANCE, LAMP_MAX_GLOW, type NightTune,
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
    // ── 왜 `intensity` 만 비교하면 안 되는가 ──────────────────────────────
    // 처음에 `f.hemiI < 1.0`(낮의 hemiI)로 적었는데, 스윕이 고른 1.2 에서 깨졌다.
    // 그런데 **그게 밤이 낮보다 밝다는 뜻이 아니다** — 반구광이 실제로 내는 빛은
    // `intensity × 색` 이고, 밤 색은 낮 색보다 훨씬 어둡다. 세기 하나만 보는 판정은
    // 색을 무시하므로 애초에 밝기를 재는 기준이 아니었다.
    //
    // 실제 조명량으로 비교한다. 이 프로젝트가 반복해서 배운 것이 그것이다 —
    // "밝기를 올려도 검정을 곱하면 검정" 이면, 거꾸로 "세기가 커도 어두운 색을
    // 곱하면 어둡다" 도 참이다.
    const lum = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const f = nightFloor(1);

    // sky.js `LIGHT.day.clear`: hemiS 0xcfe4f7 · hemiG 0x8fa385 · hemiI 1.0
    const dayHemiI = 1.0;
    const daySky = [0xcf / 255, 0xe4 / 255, 0xf7 / 255];
    const dayGround = [0x8f / 255, 0xa3 / 255, 0x85 / 255];

    expect(f.hemiI * lum(f.sky)).toBeLessThan(dayHemiI * lum(daySky));
    expect(f.hemiI * lum(f.ground)).toBeLessThan(dayHemiI * lum(dayGround));
  });

  it('밤이 낮의 절반을 넘지 않는다 — 밝히다가 낮이 되면 시간대가 사라진다', () => {
    // 위 검사는 "낮보다 어둡다" 만 본다. 그 경계에 바짝 붙어도 통과하므로, 얼마나
    // 어두운지를 따로 못 박는다. 스윕 실측에서 밤은 낮 대비 화면 휘도 20% 였고,
    // 조명량으로는 47% 다(색이 어두워 화면에서 더 어둡게 나온다).
    const lum = (c: readonly number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    const f = nightFloor(1);
    const dayLight = 1.0 * lum([0xcf / 255, 0xe4 / 255, 0xf7 / 255]);
    expect(f.hemiI * lum(f.sky)).toBeLessThan(dayLight * 0.5);
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

/**
 * `sky.js` 팔레트 hex → **집행이 실제로 만지는 채널 값.**
 *
 * ── 이 헬퍼가 없어서 블로커가 났다 (검수관 2026-08-07) ──────────────────────
 * 아래 스텁들은 원래 `0x3d / 255` 처럼 **sRGB 바이트 비율**을 담고 있었고, 주석은 그것을
 * *"팔레트를 선형으로 담고 있다"* 고 적었다. **거짓이다.** 프로덕션에서 하한이 얹히는
 * `scene.fog.color`·`HemisphereLight.color` 는 `THREE.Color` 의 **선형** 채널이고,
 * `0x3d4762` 의 선형 r 은 0.0467 — sRGB 숫자(0.2392)와 **5배** 차다.
 *
 * 그래서 그 스텁 위에서는 `fogScale` 이 무엇이든 팔레트도 하한도 **같은 배수만큼** 움직여
 * 비교가 항상 `scale ≤ 1.05` 로 환원됐다. 즉 검사는 `> 1` 만 잡고 `(0, 1]` 구간 전체가
 * 무방비였다 — `?nfog=0.9` 는 실제로 안개를 팔레트의 **4.6배**로 밝히는데 PASS 했다.
 * 원래 사고와 같은 자릿수인데 통과한 것이다.
 *
 * ── 왜 변환식을 여기 적지 않는가 ────────────────────────────────────────────
 * `SRGBToLinear` 를 손으로 옮겨 적으면 그것이 곧 값 미러링이고, three 가 색 관리 정책을
 * 바꾸는 날 이 파일만 옛 공간에 남는다. **프로덕션과 같은 코드에 같은 일을 시킨다** —
 * `sky.js` 도 `Color.set(hex)` 로 같은 경로를 탄다.
 */
function palette(hex: number): { r: number; g: number; b: number } {
  const c = new Color(hex);
  return { r: c.r, g: c.g, b: c.b };
}

/** `THREE.Color` 의 필요한 부분만. 계약이 이것뿐이라 스텁으로 충분하다 */
class FakeColor {
  constructor(public r = 0, public g = 0, public b = 0) {}
}

/** sky.js 의 밤 값(`LIGHT.night.clear`)에서 시작한 조명 한 벌 */
function nightLights() {
  const sky = palette(0x39445c), ground = palette(0x232a24);
  return {
    hemi: {
      intensity: 0.55,
      color: new FakeColor(sky.r, sky.g, sky.b),
      groundColor: new FakeColor(ground.r, ground.g, ground.b),
    },
    sun: { intensity: 0.24 },
  };
}

describe('하한 적용은 멱등이다 — 매 프레임 돌아도 발산하지 않는다', () => {
  // 이것이 곱셈 대신 max 를 고른 이유이고, 이 성질이 깨지면 밤이 프레임마다 밝아진다.
  it('100번 적용해도 1번과 같다', () => {
    const a = nightLights();
    applyNightFloor({ hemi: a.hemi, sun: a.sun }, 'night');
    const once = { i: a.hemi.intensity, g: a.hemi.groundColor.g, s: a.sun.intensity };

    const b = nightLights();
    for (let i = 0; i < 100; i++) applyNightFloor({ hemi: b.hemi, sun: b.sun }, 'night');
    expect(b.hemi.intensity).toBe(once.i);
    expect(b.hemi.groundColor.g).toBe(once.g);
    expect(b.sun.intensity).toBe(once.s);
  });

  it('밤 조명이 실제로 밝아진다 — 값이 그대로면 이 기능은 죽은 코드다', () => {
    const l = nightLights();
    const before = { i: l.hemi.intensity, g: l.hemi.groundColor.g };
    applyNightFloor({ hemi: l.hemi, sun: l.sun }, 'night');
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
    applyNightFloor({ hemi: day.hemi, sun: day.sun }, 'day');
    expect(JSON.stringify(day)).toBe(snap);
  });

  it('이미 밝은 값은 끌어내리지 않는다 — 번개가 조명을 올린 프레임을 뭉개면 안 된다', () => {
    // sky.js 는 번개에 hemi +4.0 · sun +1.6 을 순간 가산한다. 하한이 그것을 덮으면
    // 번개가 사라진다.
    const l = nightLights();
    l.hemi.intensity = 4.55;
    l.sun.intensity = 1.84;
    applyNightFloor({ hemi: l.hemi, sun: l.sun }, 'night');
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

// ── 화면 전체에 걸리는 두 축 (감독 2차 지적) ────────────────────────────────
//
// 감독: *"밤이 어둡다."* — 반구광·달빛을 이미 올린 **뒤**에 나온 말이다.
//
// 원인은 올린 축의 **적용 범위**였다. 조명은 재질에 닿는 빛을 키우므로 건물·지면은
// 밝아지지만, 하늘 돔(자체 발광 캔버스)과 안개는 그대로 남는다. 화면에서 넓은 면적을
// 차지하는 쪽이 안 움직이면 전체 인상은 바뀌지 않는다.
//
// 그래서 노출과 안개를 축으로 열었다. 아래 검사는 **그 축이 실제로 닿는지**를 본다 —
// 값을 계산해 두고 아무 데도 안 쓰는 것이 이 저장소가 구름 `alpha` 에서 겪은 사고다.
describe('노출과 안개 — 계산한 값이 실제로 소비되는가', () => {
  // 채널 값은 전부 `palette()` 를 거친다 — **집행이 실제로 만지는 공간과 같아야** 검사가
  // 검사가 된다(그 독블록이 전말을 소유한다). 조명 쪽도 같이 옮긴 이유는 한 스텁 안에서
  // 안개만 선형이고 반구광만 sRGB 이면, 다음에 이 파일을 여는 사람이 어느 쪽이 맞는지
  // 판단할 근거가 없기 때문이다.
  const targets = () => ({
    hemi: {
      intensity: 0.55,
      color: palette(0x39445c),
      groundColor: palette(0x232a24),
    },
    sun: { intensity: 0.24 },
    renderer: { toneMappingExposure: 1 },
    // sky.js 가 밤에 칠하는 안개색 그대로
    fog: { color: palette(0x3d4762) },
  });

  /**
   * 허용 초과분 — **하한이 팔레트를 이겨도 되는 한계.**
   *
   * `NIGHT_FOG_SCALE` 독블록의 실측에서 온다: 채택값 0.2 는 항등 배수(0.1951)보다
   * 커서 r 채널이 팔레트를 **1.025배** 넘어선다. 임계는 그 2.5% 를 덮어야 하고(안 그러면
   * 기본값이 FAIL 한다), 동시에 그 두 배는 되지 말아야 한다(아래 표의 0.5 = 2.56배부터
   * 전부 놓친다). 1.05 는 그 사이다. **저쪽 값이 바뀌면 이 근거를 다시 본다.**
   */
  const FOG_TOL = 1.05;

  /**
   * 하한 적용 뒤 안개가 팔레트보다 밝아진 **배수**를 채널별로 준다. 1 을 넘으면
   * 그 채널에서 하한이 팔레트를 이겼다는 뜻이다.
   *
   * 배수로 돌려주는 이유: 절댓값을 그대로 단언하면 `sky.js` 팔레트가 바뀌는 날 검사가
   * 통째로 낡는다. 이 축이 지키는 것은 색이 아니라 **두 값의 관계**다.
   */
  const fogLift = (tune?: NightTune): [ch: 'r' | 'g' | 'b', ratio: number][] => {
    const t = targets();
    const base = { ...t.fog.color };
    applyNightFloor(t, 'night', tune);
    return (['r', 'g', 'b'] as const).map((ch) => [ch, t.fog.color[ch] / base[ch]]);
  };

  it('노출 튜닝이 렌더러에 닿는다', () => {
    const t = targets();
    applyNightFloor(t, 'night', { exposure: 1.4 });
    expect(t.renderer.toneMappingExposure).toBeCloseTo(1.4, 6);
  });

  it('안개 밝기 배수가 안개색에 닿는다', () => {
    const t = targets();
    const before = t.fog.color.g;
    applyNightFloor(t, 'night', { fogScale: 1.5 });
    expect(t.fog.color.g).toBeGreaterThan(before);
  });

  it('낮에는 노출이 1로 돌아온다 — max 로 뒀다면 한 번 올라간 뒤 안 내려온다', () => {
    const t = targets();
    applyNightFloor(t, 'night', { exposure: 1.6 });
    expect(t.renderer.toneMappingExposure).toBeGreaterThan(1);
    applyNightFloor(t, 'day', { exposure: 1.6 });
    expect(t.renderer.toneMappingExposure).toBe(1);
  });

  it('노출·안개가 없어도 조명은 그대로 걸린다 — 대상은 전부 선택이다', () => {
    const t = targets();
    const bare = { hemi: t.hemi, sun: t.sun };
    applyNightFloor(bare, 'night');
    expect(bare.hemi.intensity).toBeGreaterThan(0.55);
  });

  it('기본값이 실제로 밤을 밝힌다 — 아니면 스윕이 고른 값이 죽은 코드다', () => {
    // 축을 여는 커밋에서는 이 테스트가 "아무것도 바꾸지 않는다" 였다(기본값이 곱셈
    // 항등원이었으므로). 스윕이 값을 정한 뒤로는 **반대가 참이어야 한다** — 기본
    // 경로로 들어온 사용자가 밝아진 밤을 본다.
    const t = targets();
    applyNightFloor(t, 'night');
    expect(t.renderer.toneMappingExposure).toBeGreaterThan(1);
    expect(t.hemi.intensity).toBeGreaterThan(0.55);
  });

  it('기본값에서 안개 하한이 팔레트를 못 이긴다 — 지평선보다 밝게 뜨지 않는다', () => {
    // 감독: *"안개가 안보여"*. `sky.js` 가 하늘 돔 지평선을 안개색으로 칠하므로
    // (그 파일 주석 ⑨ *"지평선 = fog색 — 이음새 제거의 핵"*) 안개만 밝히면 원경이
    // 하늘에 녹아드는 대신 **하늘보다 밝게 떠서 도드라진다.**
    //
    // ── 이 검사는 원래 *"안개색을 한 톨도 안 바꾼다"* 였고 `NIGHT_FOG_SCALE = 1` 을
    //    지키고 있었다. **그런데 1 이 항등원이 아니었다** — 하한이 얹히는 채널은
    //    선형인데 `NIGHT_FOG` 는 sRGB 숫자라, 1 에서 안개가 팔레트보다 3~5배 밝게
    //    고착돼 있었다(전말은 `decide/night.ts` 의 `NIGHT_FOG_SCALE`). 즉 그 검사는
    //    **자기가 지킨다고 적은 것을 지키지 못한 채 통과**하고 있었다.
    //
    // 그래서 수단(= 값 무변경)이 아니라 **목적**을 검사한다: 하한 적용 뒤 안개가
    // 팔레트 선형색보다 밝아지지 않을 것. 이러면 `NIGHT_FOG` 의 색공간을 나중에
    // 바로잡아도(그때 항등원은 다시 1 이 된다) 이 검사는 그대로 유효하다.
    for (const [ch, ratio] of fogLift()) {
      expect(ratio, `${ch} 채널 — 하한 ÷ 팔레트`).toBeLessThanOrEqual(FOG_TOL);
    }
  });

  // ── 검출력 — 위 검사가 무엇을 실제로 잡는가 ───────────────────────────────
  // 뮤테이션을 테스트로 굳힌 것이다. 표의 배수는 `palette()` 가 만든 **선형** 채널
  // 기준이고, 그래서 `NIGHT_FOG_SCALE` 이 sRGB 숫자를 얹는다는 사실이 그대로 드러난다.
  //
  //   fogScale   하한 ÷ 팔레트(r · g · b)      옛 스텁(sRGB 숫자)에서는
  //   ────────┼──────────────────────────┼──────────────────────────
  //   0.2(기본) 1.025 · 0.884 · 0.629       0.2 전부 → PASS (같음)
  //   0.5        2.563 · 2.209 · 1.573      0.5 전부 → **PASS** ← 놓쳤다
  //   0.9        4.614 · 3.977 · 2.832      0.9 전부 → **PASS** ← 놓쳤다
  //   1.0        5.126 · 4.419 · 3.147      1.0 전부 → **PASS** ← 놓쳤다
  //   1.6        8.202 · 7.070 · 5.034      1.6 전부 → FAIL (유일하게 잡히던 것)
  //
  // 옛 스텁은 팔레트도 하한도 sRGB 숫자였다. 두 값이 **같은 배수만큼** 함께 움직이니
  // 비교가 언제나 `fogScale ≤ 1.05` 로 환원됐고, 검사가 실제로 지킨 것은 *"배수가 1 을
  // 넘지 않는다"* 뿐이었다. `?nfog=` 는 `[0.05, 4]` 로 열려 있고 그 구간의 절반이
  // **원래 사고를 그대로 재현하는 구간**인데 전부 통과했다.
  it.each([0.5, 0.9, 1.0, 1.6])('fogScale=%s 는 잡힌다 — 위 검사가 장식이 아님', (scale) => {
    const over = fogLift({ fogScale: scale }).filter(([, r]) => r > FOG_TOL);
    expect(
      over.map(([ch]) => ch),
      `fogScale ${scale} 인데 어느 채널도 팔레트를 못 이겼다 — 이 축이 죽어 있다`,
    ).not.toHaveLength(0);
  });

  it('노브 하한(0.05)은 통과한다 — 임계가 안 밝히는 값까지 잡으면 거짓 FAIL 이다', () => {
    // 위 검사를 통과시키려고 임계를 늘리는 것과 반대 방향의 확인이다. 임계가 너무
    // 빡빡하면 *"안개를 어둡게 두는"* 정당한 값이 FAIL 하고, 그러면 다음 사람이
    // 임계를 늘려 검출력을 통째로 잃는다.
    for (const [ch, ratio] of fogLift({ fogScale: 0.05 })) {
      expect(ratio, `${ch} 채널`).toBeLessThanOrEqual(FOG_TOL);
    }
  });

  it('낮은 여전히 무변경이다 — 밤 기본값이 낮으로 새면 안 된다', () => {
    const t = targets();
    const snap = JSON.stringify({ hemi: t.hemi, sun: t.sun, fog: t.fog });
    applyNightFloor(t, 'day');
    expect(JSON.stringify({ hemi: t.hemi, sun: t.sun, fog: t.fog })).toBe(snap);
    expect(t.renderer.toneMappingExposure).toBe(1);
  });
});

// ── 미러링 방어 ─────────────────────────────────────────────────────────────
// `decide/night.ts` 의 `NIGHT_FOG` 는 `sky.js` 밤 맑음 팔레트의 `fog` 값을 **복제**한
// 것이다. 저쪽이 바뀌면 이쪽 하한이 조용히 어긋나고, 그러면 `fogScale=1` 이 더 이상
// 항등원이 아니게 된다(모르는 사이에 안개가 어두워지거나 밝아진다).
//
// 이 저장소가 색·수치·임계값 미러링으로 세 번 겪은 사고라, 파일을 직접 읽어 묶는다.
describe('안개 하한이 sky.js 밤 팔레트와 같은 값인가', () => {
  it('night.clear.fog 가 0x3d4762 그대로다', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('frontend/js/sky.js', 'utf8');
    // `night:` 블록 안 `clear:` 줄의 fog 값
    const nightBlock = src.slice(src.indexOf('  night: {'));
    const clearLine = nightBlock.slice(0, nightBlock.indexOf('\n', nightBlock.indexOf('clear:')));
    const m = /fog:\s*0x([0-9a-fA-F]{6})/.exec(clearLine);
    expect(m, 'sky.js 밤 맑음 fog 값을 못 찾았다 — 팔레트 구조가 바뀌었다').not.toBeNull();
    expect(m![1].toLowerCase()).toBe('3d4762');
  });
});
