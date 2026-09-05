// @vitest-environment jsdom
// 잎 모드(`?gmode=` · `?glod=`) — **라이브 기본은 종전과 같은가, 2D 잎은 같은 프로파일에서
// 나오는가, 링 분할이 개수를 보존하는가.**
//
// ── 이 검사가 못 보는 것 ────────────────────────────────────────────────────
// 룩. 스모크는 `grass=0` 이라 잔디 자체가 없고, 감독 실기기 링크가 유일한 판정이다.
// 여기서 초록인 것은 「기본 노브 = 종전 경로」·「삼각형 수」·「마스크가 프로파일을 따른다」·
// 「링 분할 후 총 개수 불변」까지다.
//
// ── 팀장 조건 (2026-09-05) ──────────────────────────────────────────────────
// C-1 라이브 불변: 노브 없이 메시 1·잎당 8tri·알파맵 없음. 뮤테이션(기본값 → quad)으로 확인.
// C-2 개수 불변식: 모드는 지오메트리만 갈고 상한·링·밀도는 공유. `glod` 면 메시 2 허용.
// C-3 판정 이력 보존: 마스크는 `halfWidthProfile` 에서 유도 — 프로파일이 바뀌면 마스크도.

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  GRASS_MODES, GRASS_MODE_DEFAULT, GRASS_LOD_DEFAULT, GRASS_SEG_DEFAULT, triPerBlade,
  ringModes, meshGroups, groupTriangles, bladeMaskProfile, bladeMaskPixels, quadHalfWidth,
  CARD_BLADES_DEFAULT, CARD_WIDTH_MUL, cardDensityMul, cardLeaves, cardMaskPixels,
} from '../frontend/js/world2/decide/grass-mode.js';
import { BLADE_NODES, halfWidthProfile } from '../frontend/js/world2/decide/blade-shape.js';
import { GRASS_RINGS, ringCounts, BLADE_TIP } from '../frontend/js/world2/decide/grass.js';

type Env = Parameters<typeof import('../frontend/js/world2/features/grass.js')['grassFeature']['create']>[0];
interface Instanced {
  isInstancedMesh?: boolean;
  name: string;
  count: number;
  geometry: { index: { count: number } | null };
  material: { alphaMap?: unknown; alphaTest?: number };
}

async function mountGrass(search: string) {
  const before = location.search;
  window.history.replaceState({}, '', search);
  vi.resetModules();
  try {
    const mod = await import('../frontend/js/world2/features/grass.js');
    const scene = new THREE.Scene();
    const env = {
      scene, cell: 32,
      player: { position: new THREE.Vector3(0, 0, 0) },
      shading: () => 'material' as const,
      adapter: { backend: 'WebGL', backendDetail: 'WebGL (테스트)' },
      doc: undefined,
    };
    const inst = mod.grassFeature.create(env as unknown as Env);
    const meshes: Instanced[] = [];
    scene.traverse((o: unknown) => { if ((o as Instanced).isInstancedMesh) meshes.push(o as Instanced); });
    return { inst, meshes, diag: inst?.diagnostics?.() as Record<string, unknown> | undefined };
  } finally {
    window.history.replaceState({}, '', before || location.pathname);
  }
}
afterEach(() => { vi.resetModules(); });

describe('잎 모드 — 판정(순수)', () => {
  it('기본값은 blade · lod 0 — 라이브 그대로 (팀장 C-1, 감독 판정 전)', () => {
    expect(GRASS_MODE_DEFAULT).toBe('blade');
    expect(GRASS_LOD_DEFAULT).toBe(0);
    expect(GRASS_MODES).toContain('quad');
    expect(GRASS_MODES).toContain('cross');
  });

  it('잎당 삼각형 — blade 는 마디 수에서 유도(8), quad 2·seg, cross 4·seg (감독 «살랑살랑» → 기본 마디 3)', () => {
    expect(triPerBlade('blade')).toBe((BLADE_NODES.length - 1) * 2);
    expect(triPerBlade('blade')).toBe(8);
    expect(GRASS_SEG_DEFAULT).toBe(3);
    expect(triPerBlade('quad', 1)).toBe(2);
    expect(triPerBlade('quad', 3)).toBe(6);
    expect(triPerBlade('cross', 3)).toBe(12);
    // 기본 마디로도 3D 보다 가볍다 — 아니면 «가볍게» 가 아니다
    expect(triPerBlade('quad')).toBeLessThan(triPerBlade('blade'));
  });

  it('lod 0 이면 전 링이 같은 모드 → 그룹 하나', () => {
    expect(ringModes('quad', 0)).toEqual(['quad', 'quad', 'quad']);
    expect(meshGroups(ringModes('quad', 0))).toEqual([{ mode: 'quad', rings: [0, 1, 2] }]);
    expect(meshGroups(ringModes('blade', 0))).toHaveLength(1);
  });

  it('lod 14 이면 링1(14m)만 blade, 나머지 quad → 그룹 둘', () => {
    expect(GRASS_RINGS[0].radius).toBe(14);
    expect(ringModes('quad', 14)).toEqual(['blade', 'quad', 'quad']);
    expect(meshGroups(ringModes('quad', 14))).toEqual([
      { mode: 'blade', rings: [0] }, { mode: 'quad', rings: [1, 2] },
    ]);
  });

  it('삼각형 총합 — 실측(백로그 G-W8N)과 같은 식: 포기 수 × 잎당 tri', () => {
    const counts = ringCounts(1, 1);
    const total = counts.reduce((a, b) => a + b, 0);
    expect(groupTriangles(meshGroups(ringModes('blade', 0)), counts)).toBe(total * 8);
    expect(groupTriangles(meshGroups(ringModes('quad', 0)), counts, 1)).toBe(total * 2);
    expect(groupTriangles(meshGroups(ringModes('quad', 0)), counts, 3)).toBe(total * 6);
    // A+D: 링1 은 8, 나머지 2·seg
    expect(groupTriangles(meshGroups(ringModes('quad', 14)), counts, 1))
      .toBe(counts[0] * 8 + (counts[1] + counts[2]) * 2);
  });

  it('마스크 프로파일은 halfWidthProfile 에서 유도된다 — 최대 1, 끝은 tip 비율 (C-3)', () => {
    const rows = 64;
    const prof = bladeMaskProfile(rows, BLADE_TIP, 1);
    expect(prof).toHaveLength(rows);
    expect(Math.max(...prof)).toBeCloseTo(1, 10);
    const max = Math.max(...Array.from({ length: rows }, (_, i) => halfWidthProfile(i / (rows - 1), BLADE_TIP, 1)));
    expect(prof[rows - 1]).toBeCloseTo(halfWidthProfile(1, BLADE_TIP, 1) / max, 10);
    // 배(belly)를 바꾸면 마스크도 바뀐다 — 프로파일이 SSOT 라는 뜻
    expect(bladeMaskProfile(rows, BLADE_TIP, 0)).not.toEqual(prof);
  });

  it('마스크 픽셀 — 가운데 열은 켜지고 가장자리는 끝(t=1)에서 꺼진다, 알파 채널은 255', () => {
    const w = 16, h = 64;
    const px = bladeMaskPixels(w, h, BLADE_TIP, 1);
    expect(px).toHaveLength(w * h * 4);
    const at = (x: number, y: number) => px[(y * w + x) * 4 + 1]; // G 채널
    expect(at(8, 0)).toBe(255);
    expect(at(7, h - 1)).toBe(255);
    expect(at(0, h - 1)).toBe(0);
    expect(at(w - 1, h - 1)).toBe(0);
    for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(255);
    // 세 채널이 같다 — three 가 어느 채널을 읽어도 같은 마스크
    for (let i = 0; i < px.length; i += 4) { expect(px[i]).toBe(px[i + 1]); expect(px[i]).toBe(px[i + 2]); }
  });

  it('사각 반폭 = 프로파일 최대 반폭 — 사각 폭이 원본 잎의 최대 폭과 같다', () => {
    const hw = quadHalfWidth(BLADE_TIP, 1);
    let max = 0;
    for (let i = 0; i < 200; i++) max = Math.max(max, halfWidthProfile(i / 199, BLADE_TIP, 1));
    expect(hw).toBeCloseTo(max, 2);
  });
});

describe('다발 카드(card) — 판정(순수)', () => {
  it('삼각형 — 카드는 십자와 같은 지오(4·seg), 밀도 환산은 1/잎 수', () => {
    expect(triPerBlade('card', 3)).toBe(12);
    expect(triPerBlade('card', 1)).toBe(4);
    expect(cardDensityMul(6)).toBeCloseTo(1 / 6, 10);
    expect(cardDensityMul(1)).toBe(1);
    expect(CARD_BLADES_DEFAULT).toBe(6);
    expect(CARD_WIDTH_MUL).toBeGreaterThan(1);
  });

  it('카드 잎 배치는 결정적이고 카드 안에 있다', () => {
    const a = cardLeaves(6), b = cardLeaves(6);
    expect(a).toEqual(b);
    expect(a).toHaveLength(6);
    for (const L of a) {
      expect(L.cx).toBeGreaterThan(0); expect(L.cx).toBeLessThan(1);
      expect(L.h).toBeGreaterThan(0.5); expect(L.h).toBeLessThanOrEqual(1);
      expect(Math.abs(L.lean)).toBeLessThan(0.2);
    }
    expect(cardLeaves(6, 2)).not.toEqual(a);
  });

  it('카드 마스크 — 잎이 많을수록 켜진 픽셀이 늘고, 프로파일(belly)을 바꾸면 마스크가 바뀐다 (C-3)', () => {
    const w = 64, h = 64;
    const on = (px: Uint8Array) => { let n = 0; for (let i = 1; i < px.length; i += 4) if (px[i] === 255) n++; return n; };
    const p3 = cardMaskPixels(w, h, BLADE_TIP, 1, 3);
    const p10 = cardMaskPixels(w, h, BLADE_TIP, 1, 10);
    expect(on(p3)).toBeGreaterThan(0);
    expect(on(p10)).toBeGreaterThan(on(p3));
    // 가는 잎 — 카드 면적의 절반을 넘지 않는다(넓적한 판이면 카드가 무의미하다)
    expect(on(p10)).toBeLessThan(w * h * 0.5);
    expect(cardMaskPixels(w, h, BLADE_TIP, 0, 6)).not.toEqual(cardMaskPixels(w, h, BLADE_TIP, 1, 6));
    for (let i = 3; i < p3.length; i += 4) expect(p3[i]).toBe(255);
  });
});

describe('잎 모드 — 집행(feature 조립)', () => {
  it('노브 없음 → 메시 1 · 인덱스 24(8tri) · 알파맵 없음 · 이름 grass-field (C-1)', async () => {
    const { inst, meshes, diag } = await mountGrass('?styl=1');
    expect(inst).not.toBeNull();
    expect(meshes).toHaveLength(1);
    expect(meshes[0].name).toBe('grass-field');
    expect(meshes[0].geometry.index?.count).toBe(8 * 3);
    expect(meshes[0].material.alphaMap ?? null).toBeNull();
    expect(diag?.mode).toBe('blade');
    expect(diag?.lod).toBe(0);
  });

  it('?gmode=quad → 메시 1 · 마디 3 → 6tri(인덱스 18) · 알파맵 있음 · alphaTest', async () => {
    const { meshes, diag } = await mountGrass('?styl=1&gmode=quad');
    expect(meshes).toHaveLength(1);
    expect(meshes[0].geometry.index?.count).toBe(6 * 3);
    expect(diag?.seg).toBe(3);
    expect(meshes[0].material.alphaMap).toBeTruthy();
    expect(meshes[0].material.alphaTest).toBeGreaterThan(0);
    expect(diag?.mode).toBe('quad');
  });

  it('?gmode=cross → 마디 3 → 12tri(인덱스 36)', async () => {
    const { meshes } = await mountGrass('?styl=1&gmode=cross');
    expect(meshes).toHaveLength(1);
    expect(meshes[0].geometry.index?.count).toBe(12 * 3);
  });

  it('?gmode=quad&gseg=1 → 2tri — 마디 노브가 지오에 실제로 닿는다', async () => {
    const { meshes, diag } = await mountGrass('?styl=1&gmode=quad&gseg=1');
    expect(meshes[0].geometry.index?.count).toBe(2 * 3);
    expect(diag?.seg).toBe(1);
    // 정점 줄 수 = 마디+1 → 위치 속성 정점 수 2·(seg+1)
    expect((meshes[0].geometry as unknown as { attributes: { position: { count: number } } }).attributes.position.count).toBe(4);
  });

  it('?gmode=quad&glod=14 → 메시 2, 개수 합은 단일 메시와 같다 (C-2)', async () => {
    const one = await mountGrass('?styl=1');
    const two = await mountGrass('?styl=1&gmode=quad&glod=14');
    expect(two.meshes).toHaveLength(2);
    const names = two.meshes.map((m) => m.name).sort();
    expect(names).toEqual(['grass-field-blade', 'grass-field-quad']);
    const total = two.meshes.reduce((s, m) => s + m.count, 0);
    expect(total).toBe(one.meshes[0].count);
    expect(two.diag?.blades).toBe(one.diag?.blades);
    // 진단의 삼각형 수도 판정 함수와 같다
    const counts = ringCounts(1, 1);
    expect(two.diag?.triangles).toBe(groupTriangles(meshGroups(ringModes('quad', 14)), counts, 3));
  });

  it('?gmode=card → 메시 1 · 십자 지오(마디 3 → 12tri) · 알파맵 · 활성 수는 잎 수분의 1', async () => {
    const one = await mountGrass('?styl=1');
    const card = await mountGrass('?styl=1&gmode=card');
    expect(card.meshes).toHaveLength(1);
    expect(card.meshes[0].geometry.index?.count).toBe(12 * 3);
    expect(card.meshes[0].material.alphaMap).toBeTruthy();
    expect(card.diag?.cardBlades).toBe(6);
    const ratio = (card.diag?.blades as number) / (one.diag?.blades as number);
    expect(ratio).toBeGreaterThan(1 / 6 * 0.8);
    expect(ratio).toBeLessThan(1 / 6 * 1.2);
    // 버퍼(상한)는 그대로가 아니라 활성 수에 맞춘다 — 여기서 재는 것은 활성 수뿐이다
    const card3 = await mountGrass('?styl=1&gmode=card&gcard=3');
    expect(card3.diag?.blades as number).toBeGreaterThan(card.diag?.blades as number);
  });

  it('모르는 gmode 는 기본(blade)으로 떨어진다 — 노브 오타가 화면을 바꾸지 않는다', async () => {
    const { meshes } = await mountGrass('?styl=1&gmode=hexagon');
    expect(meshes).toHaveLength(1);
    expect(meshes[0].geometry.index?.count).toBe(8 * 3);
  });
});
