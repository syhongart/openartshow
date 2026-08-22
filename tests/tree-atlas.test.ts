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
//   three 의 컷아웃은 `if (a < alphaTest) discard` 이고 `alphaTest = 0.5` 다
//   → **0.5 는 «작다» 가 아니므로 통과한다** → 수피 색 한 줄이 카드 가장자리에 남는다
//
// 그 띠가 화면에서 가는 선으로 보였고, 잎 카드가 3장씩 다른 각도로 서 있어 여러
// 방향으로 뻗었다. 밉맵이 이것을 키운다(레벨이 오를수록 더 넓게 섞인다).
//
// ⚠ 이 검사들은 **화면을 보지 않는다.** 헤드리스는 swiftshader WebGL 이고 world2 는
// WebGPU 라 컷아웃 결과를 원리적으로 못 본다. 여기서 잡는 것은 **경계를 밟는가**
// 하나이고, 그것이 위 산술의 전제다. 화면 판정은 감독 몫이다.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LEAF_U0, ATLAS_INSET, ATLAS_INSET_KNOB, ATLAS_INSET_MAX, remapU,
} from '../frontend/js/world2/parts/tree.js';

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

describe('물림이 잎을 자르지 않는다 (실측 여백 안)', () => {
  // `treeTexture` 실측: 텍스처 폭 512, 잎 영역 [128, 512], 타원이 실제로 그려지는
  // 범위는 중심 320 ± 115.2 = **[204.8, 435.2]** 이다. 즉 양쪽에 약 77px(0.15) 여백.
  // 물림이 그 여백을 넘으면 잎 실루엣이 잘린다 — 고치려다 더 나빠진다.
  const LEAF_MARGIN_U = 76.8 / 512;

  it('🔴 물림이 잎 여백보다 작다', () => {
    expect(ATLAS_INSET, `🔴 물림이 잎 여백(${LEAF_MARGIN_U.toFixed(4)})을 넘는다 — 잎이 잘린다`)
      .toBeLessThan(LEAF_MARGIN_U);
  });

  it('🔴 노브 상한도 여백 안이다 — 감독이 밀어도 잎이 안 잘려야 한다', () => {
    expect(ATLAS_INSET_MAX).toBeLessThan(LEAF_MARGIN_U);
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
