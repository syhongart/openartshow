// tests/tree-atlas.test.ts — 나무 텍스처 아틀라스의 **경계**
//
// 감독 신고 2026-08-22(스크린샷): *"나뭇잎 알파가 정확히 가려지지 않네."*
//
// ── 원인은 산술로 확정된다 ──────────────────────────────────────────────────
// 나무는 수피와 잎을 **텍스처 한 장**에 담는다(재질을 하나로 유지해 드로우콜을 안
// 늘리려고). 잎 카드가 UV 를 `[LEAF_U0, 1]` 로 눌러 넣으면 `u = LEAF_U0` 가
// **불투명(수피)과 투명(잎)의 경계에 정확히 놓인다**:
//
//   픽셀 127 = 수피 알파 1  ·  픽셀 128 = 잎 알파 0  →  선형 필터가 섞으면 **0.5**
//
// ⚠ **첫 판본은 여기서 «three 는 `a < alphaTest` 라 0.5 가 통과한다» 로 원인을
// 닫았고, 그것은 감독 화면에서 참이 아니었다**(소스 실측 2026-08-22). three 는
// **백엔드마다 연산자가 다르다** — WebGL 은 `<`(0.5 통과), WebGPU 는
// `lessThanEqual`(0.5 **잘림**). world2 는 `three/webgpu` 이므로 그 문장은
// 헤드리스에서만 참이었다. 아래 마지막 describe 가 두 연산자를 three 소스에서
// 직접 읽어 못 박는다 — 인용이 조용히 거짓이 되지 않게.
//
// 두 백엔드 어디서도 성립하는 축은 **밉맵**이다: 밉 레벨 k 의 텍셀은 원본 `2^k` px
// 를 덮으므로 `u` 가 경계 안쪽이어도 샘플이 **경계 너머 수피를 먹고**, 알파가 0.5 를
// **넘는** 표본이 카드 가장자리에 생긴다. 그 픽셀은 `<` 든 `<=` 든 살아남는다. 잎
// 카드가 3장씩 다른 각도로 서 있어 여러 방향으로 뻗는 선이 됐다.
//
// ⚠ 이 검사들은 **화면을 보지 않는다.** 헤드리스는 swiftshader WebGL 이고 world2 는
// WebGPU 라 컷아웃 결과를 원리적으로 못 본다. 여기서 잡는 것은 **경계를 밟는가**
// 하나이고, 그것이 위 산술의 전제다. 화면 판정은 감독 몫이다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LEAF_U0, ATLAS_INSET, ATLAS_INSET_KNOB, ATLAS_INSET_MAX, LEAF_MARGIN_U, remapU,
} from '../frontend/js/world2/parts/tree-atlas.js';

/** `remapU` 가 받는 최소 모양 — 정점 4개짜리 평면의 UV */
const fakeGeo = (): { attributes: { uv: { array: Float32Array } } } => ({
  attributes: { uv: { array: new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]) } },
});
const usAfter = (u0: number, u1: number): number[] => {
  const g = fakeGeo();
  remapU(g as never, u0, u1);
  return [...g.attributes.uv.array].filter((_, i) => i % 2 === 0);
};

describe('🔴 아틀라스 경계를 밟지 않는다', () => {
  it('물림이 0 보다 크다 — 0 이면 신고 이전 화면 그대로다', () => {
    expect(ATLAS_INSET, '🔴 물림이 0 — 경계 텍셀을 그대로 밟는다').toBeGreaterThan(0);
  });

  it('🔴 잎 카드의 U 가 경계(LEAF_U0)를 넘어선다', () => {
    const us = usAfter(LEAF_U0 + ATLAS_INSET, 1 - ATLAS_INSET);
    expect(Math.min(...us), '🔴 잎 UV 가 수피 경계에 닿는다 — 그 줄이 화면에 남는다')
      .toBeGreaterThan(LEAF_U0);
    expect(Math.max(...us), '🔴 잎 UV 가 텍스처 오른쪽 끝에 닿는다').toBeLessThan(1);
  });

  it('🔴 수피 카드의 U 도 경계에 안 닿는다 — 원인이 같다', () => {
    const us = usAfter(ATLAS_INSET, LEAF_U0 - ATLAS_INSET);
    expect(Math.max(...us), '🔴 수피 UV 가 잎 경계에 닿는다 — 가장자리가 반투명해진다')
      .toBeLessThan(LEAF_U0);
    expect(Math.min(...us)).toBeGreaterThan(0);
  });
});

describe('물림이 잎을 자르지 않는다 (유도 여백 안)', () => {
  // ⚠ **여기 있던 `const LEAF_MARGIN_U = 76.8 / 512` 를 지웠다**(검수관 권고 1,
  // 2026-08-22). 그 리터럴은 두 가지로 틀렸다:
  //
  //   ① **값이 20px 낙관이었다** — 타원 중심이 도달하는 거리만 셌고 타원 자체가
  //      중심에서 `len` 만큼 더 퍼진다는 것을 안 더했다. 검수관이 시드 `0x1eaf` 를
  //      시뮬레이션해 실제 잉크 여백 64.06px(좌)·81.83px(우) 를 냈고, 배치 상수에서
  //      유도한 최악치는 **56.8px** 이다. 76.8 은 둘 다와 안 맞았다.
  //   ② **코드가 아니라 테스트에 있었다** — `treeTexture` 의 `S`·분포 계수를 만지면
  //      이 안전 마진이 조용히 낡는다. 이 저장소가 세 번 겪은 값 미러링 형태다.
  //
  // 지금은 `tree.ts` 가 배치 상수에서 **유도**하고 여기서 그것을 import 한다.
  // 전제(캔버스 크기·분포 계수·타원 크기)를 바꾸면 이 검사가 저절로 따라온다.

  it('🔴 물림이 잎 여백보다 작다', () => {
    expect(ATLAS_INSET, `🔴 물림이 잎 여백(${LEAF_MARGIN_U.toFixed(4)})을 넘는다 — 잎이 잘린다`)
      .toBeLessThan(LEAF_MARGIN_U);
  });

  it('🔴 노브 상한이 여백을 넘지 않는다 — 감독이 밀어도 잎이 안 잘려야 한다', () => {
    // ⚠ 첫 판본은 `ATLAS_INSET_MAX = 0.12` 하드코딩이었고 유도 여백(0.1109) **밖**
    // 이었다 — 노브를 상한까지 밀면 잎이 잘렸다. 틀린 기준값(76.8/512 = 0.15)이
    // 틀린 상한을 통과시킨 것이다. 지금은 상한이 여백 그 자체라 `<=` 로 본다.
    expect(ATLAS_INSET_MAX).toBeLessThanOrEqual(LEAF_MARGIN_U);
  });

  const treeCode = readFileSync(
    join(process.cwd(), 'frontend/js/world2/parts/tree-atlas.ts'), 'utf8',
  ).split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');

  it('🔴 여백이 리터럴이 아니라 유도다 — 값 미러링이 되돌아오지 않게', () => {
    // 배치 상수들로 계산하는 형태여야 한다. 숫자를 도로 박으면 여기서 걸린다.
    expect(treeCode, '🔴 LEAF_MARGIN_U 가 리터럴로 돌아갔다')
      .toMatch(/LEAF_MARGIN_U\s*=\s*\(\(\)\s*=>/);
    expect(treeCode).toMatch(/LEAF_LEN_MIN\s*\+\s*LEAF_LEN_RAND/);
    // 상한도 유도여야 한다 — 손으로 고른 숫자면 또 여백 밖으로 나간다.
    expect(treeCode, '🔴 ATLAS_INSET_MAX 가 하드코딩으로 돌아갔다')
      .toMatch(/ATLAS_INSET_MAX\s*=\s*LEAF_MARGIN_U/);
  });

  // ── 🔴 판정만 보고 집행을 안 보면 둘이 갈라진다 ─────────────────────────────
  // ⚠ **위 검사만 있을 때 뮤테이션 U-D 가 0 failed 로 통과했다**(실측 2026-08-22):
  // `treeTexture` 안의 `LEAF_LEN_MIN + rnd() * LEAF_LEN_RAND` 를 `7 + rnd() * 13`
  // 리터럴로 되돌려도 아무도 안 깨졌다. 위 정규식이 **유도 식 안의**
  // `const lenMax = LEAF_LEN_MIN + LEAF_LEN_RAND` 에 걸려 통과했기 때문이다.
  //
  // 그러면 유도는 상수를 읽는데 실제 그리기는 리터럴을 쓰는 상태가 되고 — 그것이
  // 바로 없애려던 값 미러링이다. CLAUDE.md 가 이 형태를 못 박고 있다: *"판정/집행
  // 분리의 구멍 — 계산된 값이 실제로 소비되는가는 양쪽 테스트 어디에도 안 걸린다."*
  it('🔴 treeTexture 가 그 상수들을 실제로 쓴다 (집행 쪽)', () => {
    const from = treeCode.indexOf('function treeTexture');
    expect(from, 'treeTexture 를 못 찾았다').toBeGreaterThan(-1);
    const fn = treeCode.slice(from, treeCode.indexOf('\n}', from));
    expect(fn, '🔴 캔버스 크기가 유도와 갈라졌다').toMatch(/const S = TEX_S/);
    expect(fn, '🔴 분포 계수가 리터럴로 돌아갔다').toMatch(/\* LEAF_DIST_K/);
    expect(fn, '🔴 타원 크기가 리터럴로 돌아갔다')
      .toMatch(/LEAF_LEN_MIN \+ rnd\(\) \* LEAF_LEN_RAND/);
  });

  it('유도가 시드 실측보다 보수적이다 — 순서가 뒤집히면 유도가 틀린 것이다', () => {
    // 유도는 **도달 가능한 최악**, 실측은 **밟아본 값**이다. 그러므로 유도 <= 실측이
    // 성립해야 한다. 검수관 독립 실측(시드 0x1eaf): 좌 64.06px = 0.1251 U.
    // ⚠ 이 64.06 은 시드에 묶인 값이라 **유도 방향 확인용**으로만 쓴다 — 시드가
    // 바뀌면 실측은 변하지만 유도는 안 변한다.
    const SEED_MEASURED_U = 64.06 / 512;
    expect(LEAF_MARGIN_U, '🔴 유도가 시드 실측보다 크다 — 유도 식에 빠진 항이 있다')
      .toBeLessThanOrEqual(SEED_MEASURED_U);
  });

  it('수피 영역이 물림 둘을 감당한다 — 양쪽에서 물려도 폭이 남는다', () => {
    expect(LEAF_U0 - ATLAS_INSET * 2, '🔴 수피 영역이 물림에 먹혔다').toBeGreaterThan(0);
  });
});

describe('🔴 나무가 이 물림을 실제로 쓴다', () => {
  const src = readFileSync(
    join(process.cwd(), 'frontend/js/world2/parts/tree.ts'), 'utf8',
  );
  // ⚠ **주석을 걷어내고 본다.** 첫 판본은 소스 전체를 그대로 훑었고, 옛 호출을 금지하는
  // 단언이 **주석 안의 인용문**(`remapU(geo, LEAF_U0, 1)` 을 설명하는 문장)에 걸려
  // 거짓 FAIL 이 났다. 실제 호출처 둘은 이미 고쳐져 있었다.
  //
  // 검수관이 직전 회차에 정확히 이 위험을 경고했다 — *"이 저장소는 주석에 옛 코드를
  // 형태 그대로 인용하는 관행이 있다"*(GS-D8 정규식 사각). 경고를 받고 바로 같은
  // 함정에 빠졌으므로, 여기서는 **구조로** 막는다. 산문에 「조심하자」를 적는 대신
  // 주석 줄을 실제로 제거한 텍스트 위에서 판정한다.
  const code = src.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');

  it('잎·수피 양쪽 `remapU` 가 물림을 태운다', () => {
    expect(code, '🔴 잎 카드가 경계를 그대로 쓴다')
      .toMatch(/remapU\(geo,\s*LEAF_U0 \+ INSET_NOW,\s*1 - INSET_NOW\)/);
    expect(code, '🔴 수피가 경계를 그대로 쓴다')
      .toMatch(/remapU\(geo,\s*INSET_NOW,\s*LEAF_U0 - INSET_NOW\)/);
    // 옛 호출이 남아 있으면 한쪽만 고쳐진 채 통과한다.
    expect(code).not.toMatch(/remapU\(geo,\s*LEAF_U0,\s*1\)/);
    expect(code).not.toMatch(/remapU\(geo,\s*0,\s*LEAF_U0\)/);
  });

  it('노브를 읽어 넘긴다 — 되돌릴 문이 있어야 한다', () => {
    expect(code).toMatch(/readNum\(ATLAS_INSET_KNOB,\s*ATLAS_INSET,\s*0,\s*ATLAS_INSET_MAX\)/);
    expect(ATLAS_INSET_KNOB).toBe('leafinset');
  });

  it('alphaTest 가 그대로 0.5 다 — 이 회차는 컷아웃 문턱을 안 건드렸다', () => {
    // 문턱을 올려 덮는 것도 가능했지만 그러면 잎 실루엣 가장자리까지 깎인다.
    // 원인은 문턱이 아니라 **경계를 밟는 것**이라 UV 쪽을 고쳤다.
    expect(code).toMatch(/alphaTest:\s*0\.5/);
  });
});

// ── 🔴 주석이 인용한 three 소스가 실제로 그런가 ─────────────────────────────
// `ATLAS_INSET` 주석은 **three 내부 소스 두 줄을 인용**해 「백엔드마다 컷아웃 비교
// 연산자가 다르다」를 주장한다. 그 인용이 이 저장소에서 검사받지 않으면, three 를
// 올려 연산자가 바뀌는 순간 주석이 **조용히 거짓**이 된다 — 이 저장소가 `main`
// unprotected 오기로 7일을 잃은 그 형태다. 그래서 주장을 검사로 만든다.
//
// ⚠ 경로가 바뀌면 **스킵이 아니라 FAIL** 이다. 못 읽은 것은 통과가 아니고, 그때
// 해야 할 일은 «연산자를 다시 확인하고 주석을 고치는 것» 이다.
describe('🔴 three 의 컷아웃 연산자 — 주석의 인용을 실측으로 못 박는다', () => {
  const readThree = (rel: string): string => {
    const p = join(process.cwd(), 'node_modules/three/src', rel);
    try {
      return readFileSync(p, 'utf8');
    } catch {
      throw new Error(
        `🔴 three 내부 경로가 바뀌었다: ${rel}\n` +
        '   `tree.ts` 의 ATLAS_INSET 주석이 이 파일을 인용하고 있다 — 연산자를 다시 ' +
        '확인하고 주석과 이 검사를 함께 고쳐라. (못 읽은 것은 통과가 아니다)',
      );
    }
  };

  it('WebGL 은 `<` 다 — 알파 0.5 가 **통과**한다', () => {
    const glsl = readThree('renderers/shaders/ShaderChunk/alphatest_fragment.glsl.js');
    expect(glsl, '🔴 WebGL 컷아웃이 `a < alphaTest` 가 아니다 — 주석이 거짓이 됐다')
      .toMatch(/diffuseColor\.a\s*<\s*alphaTest/);
  });

  it('WebGPU 는 `<=` 다 — 알파 0.5 가 **잘린다**', () => {
    const node = readThree('materials/nodes/NodeMaterial.js');
    expect(node, '🔴 WebGPU 컷아웃이 `lessThanEqual` 이 아니다 — 주석이 거짓이 됐다')
      .toMatch(/diffuseColor\.a\.lessThanEqual\(/);
  });

  it('🔴 두 연산자가 실제로 다르다 — 이것이 정정의 핵이다', () => {
    // 이 검사가 지키는 것은 값이 아니라 **진단의 논리**다. 두 연산자가 같아지면
    // 「헤드리스에서만 참인 문장을 실기기 진단으로 쓸 뻔했다」는 서술의 근거가
    // 사라지고, 그러면 주석을 다시 써야 한다.
    const glsl = readThree('renderers/shaders/ShaderChunk/alphatest_fragment.glsl.js');
    const node = readThree('materials/nodes/NodeMaterial.js');
    const glslHasEq = /diffuseColor\.a\s*<=\s*alphaTest/.test(glsl);
    expect(glslHasEq, '🔴 WebGL 도 `<=` 가 됐다 — 백엔드 차이가 사라졌다').toBe(false);
    expect(node).not.toMatch(/diffuseColor\.a\.lessThan\(\s*alphaTestNode/);
  });

  it('주석이 이 두 파일을 실제로 인용하고 있다 — 검사와 주석이 같은 것을 본다', () => {
    // 주석에서 파일명을 지우면 이 검사가 무엇을 지키는지가 끊긴다. 양방향 대조다.
    const src = readFileSync(
      join(process.cwd(), 'frontend/js/world2/parts/tree-atlas.ts'), 'utf8',
    );
    expect(src).toContain('alphatest_fragment.glsl.js');
    expect(src).toContain('NodeMaterial.js');
    expect(src).toContain('lessThanEqual');
  });
});
