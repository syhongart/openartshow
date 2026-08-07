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
  HORIZON_MIN, HORIZON_MAX, HORIZON_DEFAULT,
  eyeAboveSea, horizonBandAngle, horizonFogAt, horizonAlphaProfile,
  horizonRadius, horizonFog,
} from '../frontend/js/world2/decide/horizon.js';
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

  it('노브 범위: 기본값이 범위 안이고 상한이 1 미만이다', () => {
    expect(HORIZON_DEFAULT).toBeGreaterThan(HORIZON_MIN);
    expect(HORIZON_DEFAULT).toBeLessThanOrEqual(HORIZON_MAX);
    // 1 이면 밴드가 검정이 된다 — 후보에 넣지 않는다.
    expect(HORIZON_MAX).toBeLessThan(1);
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

  it('밴드 재질이 `depthTest` 를 끄지 않는다', () => {
    const s = SRC('frontend/js/world2/systems/horizon.ts');
    // 끄는 순간 밴드가 건물·나무를 뚫고 그려지고, 반경 유도의 전제가 통째로 무너진다.
    expect(s).not.toMatch(/depthTest:\s*false/);
    // GLSL 은 `three.webgpu` 에 렌더 경로가 없다 — 감독 실기기가 WebGPU 다.
    // 주석에서는 언급한다(왜 안 쓰는지가 거기 적혀 있다) — 막는 것은 **호출**이다.
    expect(s).not.toMatch(/new\s+THREE\.ShaderMaterial|ShaderMaterial\s*\(/);
  });
});
