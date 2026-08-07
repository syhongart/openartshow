// 수평선 밴드 — 바다와 하늘의 경계(태스크 #202).
//
// ── 이 파일이 두 층을 보는 이유 ─────────────────────────────────────────────
// 판정(`decide/horizon.ts`)만 테스트하면 **계산된 값이 실제로 소비되는지**는 아무도 안
// 본다. 이 저장소가 반복해 겪은 사고이고(`world2-night.test.ts` 머리말), 이번 기능은
// 특히 그 구멍이 크다 — 각도·알파를 다 맞게 계산해도 배선에서 `eyeHeight` 를 안 넘기면
// 밴드가 통째로 안 생기는데, 화면에는 **"원래 수평선이 없는 세계"** 와 똑같이 보인다.
//
// 그래서 아래 두 번째 describe 는 **배선**을 본다: `features/sky.ts` 가 눈높이와 눈 y 를
// 실제로 넘기는가. three 를 띄우지 않고 소스에서 확인한다(브라우저 없이 도는 축).

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  HORIZON_MIN, HORIZON_MAX, HORIZON_NIGHT, HORIZON_LIT, HORIZON_TARGET_RATIO,
  eyeAboveSea, horizonBandAngle, horizonFogAt, horizonAlphaProfile,
  horizonRadius, horizonFog, horizonStrength,
} from '../frontend/js/world2/decide/horizon.js';
import { TIMES } from '../frontend/js/world2/decide/night.js';
import { SEA_Y } from '../frontend/js/world2/decide/water.js';
import { fogBand } from '../frontend/js/world2/decide/fog.js';
import { DEFAULT_LAYOUT } from '../frontend/js/world2/parts/types.js';

const EYE = 1.7;
const { near, far } = fogBand(DEFAULT_LAYOUT.cellX);

describe('수평선 밴드 판정', () => {
  it('수면 위 눈높이는 SEA_Y 에서 유도된다 — 물을 내리면 함께 커진다', () => {
    expect(eyeAboveSea(EYE)).toBeCloseTo(EYE - SEA_Y, 10);
    // 값 미러링 방지의 실증: `SEA_Y` 를 모르는 채 리터럴을 적었다면 이 단언이
    // 물 높이를 바꾸는 날 조용히 틀린 값을 통과시켰을 것이다.
    expect(eyeAboveSea(EYE)).toBeGreaterThan(EYE);
  });

  it('밴드 폭 = 안개가 0% 가 되는 시선각', () => {
    const band = horizonBandAngle(EYE, near);
    expect(band).toBeCloseTo(Math.atan(eyeAboveSea(EYE) / near), 12);
    // 그 각도에서 안개는 정확히 0 이다 — 되돌릴 것이 남아 있는 마지막 지점.
    expect(horizonFogAt(band, EYE, near, far)).toBeCloseTo(0, 10);
  });

  it('밴드는 안개 밴드를 따라 움직인다 — 폭을 손으로 정하지 않는다', () => {
    // near 를 절반으로 좁히면(=안개가 더 가까이서 시작) 밴드가 넓어져야 한다.
    expect(horizonBandAngle(EYE, near / 2)).toBeGreaterThan(horizonBandAngle(EYE, near));
  });

  it('알파는 THREE.Fog 와 같은 식이다 — 수평선에서 1, 밴드 끝에서 0', () => {
    expect(horizonFogAt(0, EYE, near, far)).toBe(1);
    const band = horizonBandAngle(EYE, near);
    // 중간 지점: 시선각 θ 의 수면 교점 거리에서 계산한 선형 안개 계수와 같아야 한다.
    // 안개가 정확히 절반인 거리를 역산해 그 시선각을 만든다 — 식이 다르면 여기서 갈린다.
    const dHalf = near + 0.5 * (far - near);
    expect(horizonFogAt(Math.atan(eyeAboveSea(EYE) / dHalf), EYE, near, far)).toBeCloseTo(0.5, 10);
    // far 보다 먼 구간은 1 로 잘린다(`THREE.Fog` 와 같은 clamp). 자르지 않으면 알파가
    // 1 을 넘어 텍스처에서 뭉개지고, 그 뭉갬은 화면에서 "밴드 위쪽이 균일" 로만 보인다.
    expect(horizonFogAt(band * 0.5, EYE, near, far)).toBe(1);
  });

  it('알파 프로파일은 단조 감소하고 [1 … 0] 이다', () => {
    const p = horizonAlphaProfile(64, EYE, near, far);
    expect(p).toHaveLength(64);
    expect(p[0]).toBe(1);
    expect(p[p.length - 1]).toBeCloseTo(0, 10);
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeLessThanOrEqual(p[i - 1]);
    // 전부 0..1 — 텍스처 알파로 그대로 들어가므로 범위를 벗어나면 클램프로 뭉개진다.
    for (const a of p) { expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThanOrEqual(1); }
  });

  it('퇴화 입력에서 NaN 을 만들지 않는다', () => {
    // far <= near 는 안개 밴드가 무너진 상태다. 밴드를 안 그리는 것이 옳고,
    // NaN 이 텍스처로 들어가면 알파가 통째로 깨져 화면 전체에 막이 낀다.
    expect(horizonFogAt(0.01, EYE, 50, 50)).toBe(0);
    expect(Number.isNaN(horizonBandAngle(0, near))).toBe(false);
    expect(horizonBandAngle(EYE, 0)).toBe(0);
    for (const a of horizonAlphaProfile(8, EYE, 50, 50)) expect(Number.isNaN(a)).toBe(false);
  });

  it('밴드 반경 = 안개 near — 밴드 전체가 수면보다 앞에 놓인다', () => {
    // 이 등식이 깨지면 밴드가 물에 가려 안 보인다(`decide/horizon.ts` 의 유도).
    // 가시 한계각 `atan(h/R)` 이 밴드 폭 이상이어야 한다.
    const R = horizonRadius(near);
    const visibleTo = Math.atan(eyeAboveSea(EYE) / R);
    expect(visibleTo).toBeGreaterThanOrEqual(horizonBandAngle(EYE, near));
    // 반경을 돔 근처로 키우면 그 성질이 깨진다는 것까지 확인한다 — 유도가 장식이 아님.
    expect(Math.atan(eyeAboveSea(EYE) / 500)).toBeLessThan(horizonBandAngle(EYE, near));
  });

  it('안개 밴드는 셀 크기에서 유도된 것과 같다 — 별도 사본이 아니다', () => {
    expect(horizonFog()).toEqual(fogBand(DEFAULT_LAYOUT.cellX));
  });

  it('노브 범위: 시간대 기본값이 전부 범위 안이고 상한이 1 미만이다', () => {
    for (const t of TIMES) {
      const s = horizonStrength(t);
      expect(s, `${t} 기본 세기`).toBeGreaterThan(HORIZON_MIN);
      expect(s, `${t} 기본 세기`).toBeLessThanOrEqual(HORIZON_MAX);
    }
    // 1 이면 밴드가 검정이 된다 — 후보에 넣지 않는다.
    expect(HORIZON_MAX).toBeLessThan(1);
  });
});

// ── 시간대별 세기 ───────────────────────────────────────────────────────────
// 같은 `hz` 가 시간대마다 다르게 일한다(톤매핑 어깨). 낮은 0.3 에서 밴드/하늘 비율이
// 0.988 — 밴드가 켜져 있는데 사실상 꺼진 것과 같았고, 감독이 *"낮에도 이렇게"* 라고
// 한 것이 그 상태다. 그 분기가 실제로 살아 있는지 **값으로** 본다.
describe('시간대별 밴드 세기', () => {
  it('밤과 낮이 다른 값이다 — 분기가 죽으면 낮이 다시 사실상 꺼진다', () => {
    expect(horizonStrength('night')).toBe(HORIZON_NIGHT);
    expect(horizonStrength('day')).toBe(HORIZON_LIT);
    // 자릿수 차이가 이 분기의 존재 이유다. 둘이 가까워지면 분기가 장식이 된다.
    expect(HORIZON_LIT).toBeGreaterThan(HORIZON_NIGHT * 2);
  });

  it('노을은 낮 쪽이다 — 밝은 안개 팔레트를 공유한다', () => {
    expect(horizonStrength('sunset')).toBe(HORIZON_LIT);
  });

  it('모르는 시간대는 밝은 쪽으로 떨어진다 — 밤 세기가 낮에 새면 밴드가 죽는다', () => {
    // `nightness()` 가 모르는 값을 낮으로 보는 것과 같은 규약이다. 반대로 떨어지면
    // 새 시간대를 추가하는 날 그 시간대만 밴드가 조용히 꺼진다.
    expect(horizonStrength('golden-hour')).toBe(HORIZON_LIT);
  });

  it('`?hz=` 오버라이드가 전 시간대를 덮는다 — 감독이 링크로 비교한다', () => {
    for (const t of TIMES) expect(horizonStrength(t, 0.42)).toBe(0.42);
  });

  it('오버라이드는 범위로 잘린다 — `?hz=99` 가 밴드를 검정으로 만들지 않는다', () => {
    expect(horizonStrength('day', 99)).toBe(HORIZON_MAX);
    expect(horizonStrength('day', -5)).toBe(HORIZON_MIN);
  });

  it('오버라이드 0 은 0 이다 — `null`(미지정)과 구별된다', () => {
    // `readNum` 을 쓰면 이 구별이 불가능하다. 0 이 기본값으로 되돌아가면 대조군
    // (`?hz=0`)을 볼 방법 자체가 사라진다.
    expect(horizonStrength('night', 0)).toBe(0);
    expect(horizonStrength('night', null)).toBe(HORIZON_NIGHT);
  });

  it('기준 비율은 감독이 판정한 밤 화면에서 온다 — 0..1 안의 실수다', () => {
    // 세 세기가 전부 이 하나에서 유도됐다는 것이 설계의 요점이다. 값 자체를 단언하는
    // 대신(그러면 이 파일이 미러가 된다) 범위와 방향만 묶는다 — 1 이상이면 "밴드가
    // 하늘보다 밝아도 된다" 는 뜻이 되어 부등식이 뒤집힌다.
    expect(HORIZON_TARGET_RATIO).toBeGreaterThan(0);
    expect(HORIZON_TARGET_RATIO).toBeLessThan(1);
  });
});

// ── 집행·배선 ───────────────────────────────────────────────────────────────
// three 를 띄우지 않고 소스로 확인한다. 브라우저 없이 도는 축이라 게이트에 넣을 수 있고,
// 여기서 잡으려는 결함(배선 누락)은 실행 없이도 확정적으로 드러난다.
const SRC = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('수평선 밴드 배선', () => {
  it('`features/sky.ts` 가 눈높이와 눈 y 를 **주입한다** — 노브를 다시 읽지 않는다', () => {
    const s = SRC('frontend/js/world2/features/sky.ts');
    expect(s).toMatch(/eyeHeight:\s*env\.player\.eyeHeight/);
    expect(s).toMatch(/getEyeY:\s*\(\)\s*=>\s*env\.camera\.position\.y/);
    // `?eye=` 를 여기서 다시 읽으면 값 미러링이다 — 감독이 눈높이를 바꾸는 날
    // 수평선만 옛 높이에 남고, 화면에는 원인이 안 나타난다.
    expect(s).not.toMatch(/readNum\(\s*'eye'/);
  });

  it('밴드 색은 **팔레트**에서 온다 — `scene.fog` 를 경유하지 않는다', () => {
    const s = SRC('frontend/js/world2/systems/sky.ts');
    const body = /private updateHorizon\([\s\S]*?\n  \}/.exec(s);
    expect(body).not.toBeNull();
    const u = body![0];
    // `lightOf` 는 `sky.js` 의 색 SSOT 이고 돔 텍스처도 그것을 거친다.
    expect(u).toMatch(/lightOf\(/);
    // ⚠ `scene.fog.color` 를 쓰면 안 된다. 밤 하한이 얹힌 값이고(하늘 98 · 안개 143),
    // `applyLighting` 이 크로스페이드 중에만 도는 탓에 그 하한이 **고착**된다 —
    // "하한 앞에서 읽으면 된다" 는 처방이 실측에서 아무 차이도 못 냈던 이유다.
    expect(u).not.toMatch(/scene\.fog/);
    expect(u).toMatch(/this\.horizon\.update\(/);
  });

  it('밴드 갱신이 매 프레임 `update` 에서 불린다', () => {
    const s = SRC('frontend/js/world2/systems/sky.ts');
    const body = /update\(ctx: FrameCtx\): void \{([\s\S]*?)\n  \}/.exec(s);
    expect(body).not.toBeNull();
    // 부팅 호출만 남으면 시간대가 바뀔 때 수평선만 옛 색에 머문다 — 이 저장소가
    // `groundTint` 에서 겪은 형태이고, 뮤테이션 한 건이 안 죽어서 드러났던 자리다.
    expect(body![1]).toMatch(/this\.updateHorizon\(/);
  });

  it('세기가 **시간대에서** 매 프레임 계산돼 밴드로 넘어간다', () => {
    const s = SRC('frontend/js/world2/systems/sky.ts');
    const body = /private updateHorizon\([\s\S]*?\n  \}/.exec(s);
    expect(body).not.toBeNull();
    const u = body![0];
    // 시간대를 안 보고 상수를 넘기면 낮이 다시 밤 세기로 돌아간다 — 화면에는
    // "밴드가 원래 낮에는 약한 것" 과 똑같이 보인다.
    expect(u).toMatch(/bandStrength\(/);
    // 넘기기까지 확인한다. 계산만 하고 안 넘기면 판정/집행 경계가 또 비는데,
    // 그 구멍은 양쪽 테스트 어디에도 안 걸린다(이 저장소가 이름 붙인 형태다).
    // 인자 개수를 세지 않는 이유: 첫 인자에 `this.getEyeY()` 가 들어 있어 괄호
    // 세기가 성립하지 않고, 그런 정규식은 표현만 바뀌는 리팩터에 거짓 FAIL 을 낸다.
    expect(u).toMatch(/this\.horizon\.update\(.*this\.horizonDim/);
  });

  it('`?hz=` 를 `readNumOpt` 로 읽는다 — 미지정과 0 을 구별해야 한다', () => {
    const s = SRC('frontend/js/world2/systems/horizon.ts');
    expect(s).toMatch(/readNumOpt\(\s*HORIZON_KNOB/);
    // `readNum` 으로 되돌아가면 fallback 이 강제돼 시간대 분기가 통째로 죽는다.
    expect(s).not.toMatch(/readNum\(\s*HORIZON_KNOB/);
  });

  it('밴드 재질이 `depthTest` 를 끄지 않는다', () => {
    const s = SRC('frontend/js/world2/systems/horizon.ts');
    // 끄는 순간 밴드가 건물·나무를 뚫고 그려지고, 반경 유도의 전제가 통째로 무너진다.
    expect(s).not.toMatch(/depthTest:\s*false/);
    // GLSL 은 `three.webgpu` 에 렌더 경로가 없다 — 감독 실기기가 WebGPU 다.
    // 주석에서는 언급한다(왜 안 쓰는지가 거기 적혀 있다) — 막는 것은 **호출**이다.
    expect(s).not.toMatch(/new\s+THREE\.ShaderMaterial|ShaderMaterial\s*\(/);
  });
});
