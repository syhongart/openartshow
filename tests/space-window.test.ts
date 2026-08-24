// @vitest-environment jsdom
//
// 창문 — **벽을 실제로 뚫는가, 그리고 그 너머가 카메라에 잡히는가.**
//
// ── 왜 이 파일이 생겼나 ─────────────────────────────────────────────────────
// 감독 지적 2026-08-24: *"창문이 없으니 답답해. 창문을 내서 주변의 바깥풍경을
// 오픈월드의 가상으로 보여줄 수 있나?"*
//
// 창문 파츠는 **벽에 붙는 장식**이었다. 프레임과 유리를 벽 안쪽 면에 덧대기만 하고
// 벽은 통짜로 남아서, 창을 아무리 놓아도 바깥이 보일 리가 없었다. 그 상태가 화면에서
// 「창문이 있는 방」으로 보였기 때문에 **다 됐다고 적힐 뻔했다.**
//
// 뚫고 나서도 안 보였다. 원인이 둘 더 있었고 **둘 다 화면에서는 「아직 안 만들었다」와
// 구별되지 않았다**:
//   ① 창밖 풍경을 220m 에 세웠는데 카메라 `far` 가 200 이었다 → 하늘이 통째로 클리핑.
//   ② 강조면(featureWall)이 벽 안쪽에 덧대는 **통짜 판**이라 뚫은 구멍을 도로 덮었다.
//
// 그래서 이 파일이 보는 것은 「창문 파츠가 놓였는가」가 아니라 **구멍·거리·가림** 셋이다.
// 셋 중 하나만 어긋나도 화면은 조용히 옛날로 돌아가고, 그때 아무도 모르는 것이 문제다.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { wallPiecesWithWindows } from '../frontend/js/space-window-wall.js';
import { scaleFor, OUTSIDE_MOODS } from '../frontend/js/space-outside.js';
import { generateSpace, wallUsable } from '../frontend/js/space-generate.js';
import { PART_TYPES } from '../frontend/js/space.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSpaceGroup } from '../frontend/js/space-render.js';

// jsdom 에는 네이티브 캔버스가 없다. 조립은 바닥·벽 텍스처를 캔버스로 굽고 지나가므로
// 2D 컨텍스트가 없으면 끝까지 못 간다. 보는 것은 **메시의 자리와 크기**이므로 그리기는
// 전부 no-op 이어도 된다(`tests/chibi-shadow.test.ts` 와 같은 처방).
// ⚠ 메서드를 손으로 나열하지 않는다 — 첫 판본이 그랬고 `strokeRect` 하나가 없어서
// 테스트 셋이 통째로 깨졌다. 조립이 어떤 그리기 명령을 쓰는지는 이 파일의 관심사가
// 아니므로, **모르는 것은 전부 no-op** 으로 받는다(손으로 조립하면 매번 다르게 틀린다).
const gradientStub = { addColorStop() {} };
// ⚠ 실제 크기로 준다 — 고정 크기로 두면 노멀맵 굽기가 배열 밖에 쓴다(`scene-textures.ts`).
const imageData = (w: number, h: number) => ({
  data: new Uint8ClampedArray(Math.max(4, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0,
});
const ctx2d = new Proxy({} as Record<string, unknown>, {
  get(t, k) {
    if (k in t) return t[k as string];
    const name = String(k);
    if (name === 'createImageData') return imageData;
    if (name.startsWith('create')) return () => gradientStub;
    if (name === 'getImageData') return (_x: number, _y: number, w: number, h: number) => imageData(w, h);
    if (name === 'measureText') return () => ({ width: 0 });
    return () => undefined;
  },
  set(t, k, v) { t[k as string] = v; return true; },
});
(HTMLCanvasElement.prototype as unknown as { getContext: (t: string) => unknown }).getContext =
  (type: string) => (type === '2d' ? ctx2d : null);

/** 조립된 그룹에서 박스 메시의 (크기, 월드 위치)를 걷어온다. */
interface BoxRow { w: number; h: number; d: number; x: number; y: number; z: number }
function boxes(group: unknown): BoxRow[] {
  const out: BoxRow[] = [];
  (group as { updateMatrixWorld(f: boolean): void }).updateMatrixWorld(true);
  (group as { traverse(fn: (o: Record<string, never>) => void): void }).traverse((o) => {
    const m = o as unknown as {
      isMesh?: boolean;
      geometry?: { parameters?: { width?: number; height?: number; depth?: number } };
      getWorldPosition(v: unknown): { x: number; y: number; z: number };
    };
    if (!m.isMesh) return;
    const pr = m.geometry && m.geometry.parameters;
    if (!pr || pr.width == null || pr.height == null || pr.depth == null) return;
    const p = m.getWorldPosition(new THREE.Vector3());
    out.push({ w: pr.width, h: pr.height, d: pr.depth, x: p.x, y: p.y, z: p.z });
  });
  return out;
}

const WIN_W = PART_TYPES.window.size[0];
const WIN_H = PART_TYPES.window.size[1];
const area = (ps: readonly { w: number; h: number }[]) => ps.reduce((s, p) => s + p.w * p.h, 0);

describe('wallPiecesWithWindows — 벽 조각', () => {
  it('창문이 없으면 통짜 한 장이다(뚫기 전 동작과 합동)', () => {
    const ps = wallPiecesWithWindows(10, 4.2, [], WIN_W, WIN_H, 2.4);
    expect(ps).toEqual([{ u: 0, y: 2.1, w: 10, h: 4.2 }]);
  });

  it('창문 1개 — 조각 넓이 합이 벽 넓이에서 창 넓이만큼 줄어든다', () => {
    const ps = wallPiecesWithWindows(10, 4.2, [2], WIN_W, WIN_H, 2.4);
    expect(ps.length).toBeGreaterThan(1);
    expect(area(ps)).toBeCloseTo(10 * 4.2 - WIN_W * WIN_H, 6);
  });

  it('창문 2개 — 창 넓이 2장만큼 줄어든다', () => {
    const ps = wallPiecesWithWindows(12, 4.2, [-3.5, 3.5], WIN_W, WIN_H, 2.4);
    expect(area(ps)).toBeCloseTo(12 * 4.2 - 2 * WIN_W * WIN_H, 6);
  });

  it('조각끼리 겹치지 않는다(겹치면 넓이 합은 맞아도 벽이 두꺼워 보인다)', () => {
    const ps = wallPiecesWithWindows(12, 4.2, [-3.5, 3.5], WIN_W, WIN_H, 2.4);
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        const ux = Math.abs(a.u - b.u) < (a.w + b.w) / 2 - 1e-9;
        const uy = Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 1e-9;
        expect(ux && uy).toBe(false);
      }
    }
  });

  it('붙어 있는 창 두 개는 한 구멍으로 합쳐진다(사이에 실 같은 조각을 만들지 않는다)', () => {
    const ps = wallPiecesWithWindows(12, 4.2, [-WIN_W / 2, WIN_W / 2], WIN_W, WIN_H, 2.4);
    expect(area(ps)).toBeCloseTo(12 * 4.2 - 2 * WIN_W * WIN_H, 6);
    for (const p of ps) expect(p.w).toBeGreaterThan(0.02);
  });

  it('거의 붙은 두 창 사이에 실 같은 조각을 만들지 않는다', () => {
    // 겹치지는 않지만 틈이 0.01m 인 배치. 그 틈을 메시로 만들면 화면에서는 안 보이면서
    // 드로우콜과 그림자 계산만 는다. ⚠ 이 표본이 없던 판본에서는 최소 조각 검사를
    // 통째로 없애도 24건이 전부 통과했다(뮤테이션 M5 실측).
    const gapAt = WIN_W / 2 + 0.005;
    const ps = wallPiecesWithWindows(12, 4.2, [-gapAt, gapAt], WIN_W, WIN_H, 2.4);
    for (const p of ps) expect(p.w).toBeGreaterThan(0.02);
    // 틈만큼은 뚫린 채로 남는다 — 메우지도, 실 조각으로 채우지도 않는다.
    expect(area(ps)).toBeCloseTo(12 * 4.2 - 2 * WIN_W * WIN_H - 0.01 * 4.2, 6);
  });

  it('벽 끝을 넘는 창은 무시한다(벽이 끊기면 방이 뚫린다)', () => {
    const ps = wallPiecesWithWindows(3, 4.2, [1.4], WIN_W, WIN_H, 2.4);
    expect(ps).toHaveLength(1);
    expect(ps[0].w).toBe(3);
  });

  it('창이 바닥이나 천장에 닿으면 통짜로 남긴다', () => {
    expect(wallPiecesWithWindows(10, 4.2, [0], WIN_W, WIN_H, 0.4)).toHaveLength(1);
    expect(wallPiecesWithWindows(10, 4.2, [0], WIN_W, WIN_H, 4.0)).toHaveLength(1);
  });

  it('치수가 0 이하면 빈 배열이다', () => {
    expect(wallPiecesWithWindows(0, 4.2, [0], WIN_W, WIN_H, 2.4)).toEqual([]);
    expect(wallPiecesWithWindows(10, 0, [0], WIN_W, WIN_H, 2.4)).toEqual([]);
  });

  it('모든 조각은 실제로 보이는 크기다(0 크기 메시를 만들지 않는다)', () => {
    const ps = wallPiecesWithWindows(9, 4.2, [-3.2, 3.2], WIN_W, WIN_H, 2.436);
    expect(ps.length).toBeGreaterThan(0);
    for (const p of ps) { expect(p.w).toBeGreaterThan(0.02); expect(p.h).toBeGreaterThan(0.02); }
  });
});

describe('scaleFor — 창밖 풍경이 카메라 far 안에 선다', () => {
  it('far=200(visit.js 현재값)에서 하늘 돔이 클리핑 평면 안이다', () => {
    // 이 검사가 없던 판본에서 돔 220 이 far 200 밖이라 **하늘이 통째로 안 보였다.**
    const s = scaleFor(200);
    expect(s.dome).toBeLessThan(200);
    expect(s.silFar).toBeLessThan(s.dome);
    expect(s.silNear).toBeLessThan(s.silFar);
  });

  it('far 가 넉넉하면 원하는 거리를 그대로 쓴다(가까이 접지 않는다)', () => {
    const s = scaleFor(1000);
    expect(s.dome).toBe(220);
    expect(s.silFar).toBe(165);
    expect(s.silNear).toBe(95);
  });

  it('far 가 아주 작아도 순서가 무너지지 않는다', () => {
    for (const far of [20, 50, 120]) {
      const s = scaleFor(far);
      expect(s.dome).toBeLessThan(far);
      expect(s.silFar).toBeLessThan(s.dome);
      expect(s.silNear).toBeGreaterThan(0);
      expect(s.silNear).toBeLessThan(s.silFar);
    }
  });

  it('far 를 안 주거나 이상한 값이면 기본값으로 버틴다', () => {
    const base = scaleFor(undefined);
    for (const bad of [NaN, 0, -5, Infinity]) expect(scaleFor(bad as number)).toEqual(base);
    expect(base.dome).toBeLessThan(200);
  });

  it('하늘 무드 후보가 열려 있다(감독이 화면으로 비교한다)', () => {
    expect(OUTSIDE_MOODS.length).toBeGreaterThanOrEqual(2);
    expect(OUTSIDE_MOODS).toContain('day');
  });
});

const artworks = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `a${i}`, title: `작품 ${i}`, imageUrl: '' }));

describe('generateSpace — 창문이 실제로 보이는 자리에 난다', () => {
  it('자동 생성 공간에는 창문이 반드시 있다(«창문이 없으니 답답해»)', () => {
    for (const n of [3, 8, 14, 22]) {
      const wins = generateSpace(artworks(n)).space.parts.filter((p) => p.t === 'window');
      expect(wins.length).toBeGreaterThan(0);
    }
  });

  it('강조면에는 창문을 내지 않는다(덧댄 판이 구멍을 도로 덮는다)', () => {
    const r = generateSpace(artworks(12)).space;
    const side = r.shell.finish.featureWall;
    expect(side).toBeTruthy();
    const wins = r.parts.filter((p) => p.t === 'window');
    expect(wins.length).toBeGreaterThan(0);
    // 강조면이 north 면 그 벽은 z 가 가장 작은 면이다 — 그 면에 창이 0개여야 한다.
    const zs = wins.map((w) => w.z);
    const minZ = Math.min(...zs);
    const onFeature = wins.filter((w) => side === 'north' && Math.abs(w.z - minZ) < 1e-6 && w.ry === 0);
    // north 강조면의 창은 ry=0 · z 최소 — 하나도 없어야 한다.
    expect(onFeature.length).toBe(0);
  });

  it('강조면은 창문 몫을 안 빼므로 벽을 더 쓴다', () => {
    // ⚠ 작품 **개수**로 보면 안 잡힌다 — 라운드로빈 배분이라 면마다 고르게 나뉘어
    //   예외를 통째로 지워도 개수는 그대로일 수 있다(뮤테이션 M8 실측). 그래서 판정
    //   그 자체(`wallUsable`)를 직접 잰다.
    const t = 0.2, len = 9;
    const feature = wallUsable(len, 'north', t);
    const plain = wallUsable(len, 'south', t);
    expect(feature).toBeGreaterThan(plain);
    expect(feature - plain).toBeCloseTo((WIN_W + 0.4) * 2, 6); // 창 2개 + 간격
  });

  it('강조면 예외가 실제 배치에 반영된다(같은 작품이 더 작은 방에 들어간다)', () => {
    const r = generateSpace(artworks(14)).space;
    const arts = r.parts.filter((p) => p.t === 'artwork');
    expect(arts.length).toBe(14);                    // 한 점도 흘리지 않는다
    const zs = arts.map((a) => a.z);
    const north = arts.filter((a) => Math.abs(a.z - Math.min(...zs)) < 1e-6);
    expect(north.length).toBeGreaterThan(0);
  });

  it('창문은 작품과 겹치지 않는다(벽 용량에서 먼저 뺐다)', () => {
    const r = generateSpace(artworks(18)).space;
    const wins = r.parts.filter((p) => p.t === 'window');
    const arts = r.parts.filter((p) => p.t === 'artwork');
    for (const w of wins) {
      for (const a of arts) {
        if (Math.abs(w.ry - a.ry) > 1e-6) continue;               // 다른 벽
        const along = Math.abs(w.ry) < 1e-6 || Math.abs(Math.abs(w.ry) - Math.PI) < 1e-6;
        const near = along ? Math.abs(w.z - a.z) : Math.abs(w.x - a.x);
        if (near > 0.5) continue;                                  // 같은 벽이 아니다
        const gap = along ? Math.abs(w.x - a.x) : Math.abs(w.z - a.z);
        expect(gap).toBeGreaterThan(WIN_W / 2);
      }
    }
  });
});


// ── 판정 → 집행 경계 ────────────────────────────────────────────────────────
// **여기가 이 파일의 핵이다.** 위의 순수 함수 검사는 조각을 어떻게 나눌지만 본다. 그
// 조각이 실제로 메시가 되는지는 양쪽 어디에도 안 걸린다 — CLAUDE.md 가 「경계를 건너는
// 지점은 아무도 안 본다」고 못 박은 자리이고, 실제로 이 회차의 세 결함이 전부 거기 있었다.
// 그래서 **진짜 three 로 조립해서 벽 메시의 자리를 잰다.**
describe('space-assembler — 창 자리에 벽이 실제로 없다', () => {
  const built = () => {
    const space = generateSpace(artworks(14)).space;
    return { space, rows: boxes(buildSpaceGroup(space)) };
  };

  it('창문이 난 벽은 통짜가 아니라 여러 조각이다', () => {
    const { space, rows } = built();
    const wins = space.parts.filter((p) => p.t === 'window');
    expect(wins.length).toBeGreaterThan(0);
    const w0 = wins[0];
    const horiz = Math.abs(w0.ry) < 1e-6 || Math.abs(Math.abs(w0.ry) - Math.PI) < 1e-6;
    // 그 벽선 위의 벽 두께(0.2) 박스들
    const t = space.shell.wallT;
    const onWall = rows.filter((r) => (horiz
      ? Math.abs(r.d - t) < 1e-6 && Math.abs(r.z - w0.z) < t
      : Math.abs(r.w - t) < 1e-6 && Math.abs(r.x - w0.x) < t));
    expect(onWall.length).toBeGreaterThanOrEqual(3); // 중앙 + 창 위/아래 최소 2
  });

  it('창 한가운데에는 어떤 벽 조각도 없다(구멍이 실재한다)', () => {
    const { space, rows } = built();
    const t = space.shell.wallT;
    const winH = PART_TYPES.window.size[1];
    for (const win of space.parts.filter((p) => p.t === 'window')) {
      const horiz = Math.abs(win.ry) < 1e-6 || Math.abs(Math.abs(win.ry) - Math.PI) < 1e-6;
      const wallRows = rows.filter((r) => (horiz
        ? Math.abs(r.d - t) < 1e-6 && Math.abs(r.z - win.z) < t
        : Math.abs(r.w - t) < 1e-6 && Math.abs(r.x - win.x) < t));
      expect(wallRows.length).toBeGreaterThan(0);
      // 창 중심 높이를 조각들에서 되찾는다 — 조각 사이의 빈 y 구간이 곧 창이다.
      const along = (r: BoxRow) => (horiz ? r.x : r.z);
      const winU = horiz ? win.x : win.z;
      const covering = wallRows.filter((r) => Math.abs(along(r) - winU) < (horiz ? r.w : r.d) / 2 - 1e-9);
      // 창 폭 안을 덮는 조각들의 y 구간에 winH 이상의 빈틈이 있어야 한다.
      const spans = covering.map((r) => [r.y - r.h / 2, r.y + r.h / 2] as const).sort((a, b) => a[0] - b[0]);
      let gap = 0, cur = 0;
      for (const [a, b] of spans) { if (a > cur) gap = Math.max(gap, a - cur); cur = Math.max(cur, b); }
      expect(gap).toBeGreaterThanOrEqual(winH - 1e-6);
    }
  });

  it('강조면은 통짜로 남는다(거기엔 창을 안 내므로 나눌 이유가 없다)', () => {
    const { space, rows } = built();
    expect(space.shell.finish.featureWall).toBe('north');
    const t = space.shell.wallT;
    const wallRows = rows.filter((r) => Math.abs(r.d - t) < 1e-6);
    const zWall = Math.min(...wallRows.map((r) => r.z));           // 북벽선
    const north = wallRows.filter((r) => Math.abs(r.z - zWall) < 1e-6);
    expect(north).toHaveLength(1);
  });
});

// ── 배선 ────────────────────────────────────────────────────────────────────
// `visit.html` 은 노드에서 못 돌린다(모듈 그래프가 three·WebGL 을 끌고 온다). 그래서
// 소스를 읽어 **두 배선이 실재하는지**만 본다. 약한 축인 걸 알고 쓴다 — 문자열이 있어도
// 죽은 코드일 수 있다(실제로 예전에 `if (false)` 로 죽여도 통과한 전례가 있다). 그래서
// 여기서 보는 것은 「호출이 있다」가 아니라 **인자에 무엇이 들어가는가** 다.
describe('visit.html 배선 — 창밖이 붙고, 카메라 far 가 전달된다', () => {
  const html = readFileSync(resolve(process.cwd(), 'frontend/visit.html'), 'utf8');

  it('창문이 있는 공간에만 창밖을 세운다', () => {
    expect(html).toMatch(/parts[^\n]*\.t === 'window'[\s\S]{0,120}buildOutsideView\(/);
  });

  it('cameraFar 를 카메라에서 읽어 넘긴다(상수를 다시 적지 않는다)', () => {
    // 이 배선이 없으면 하늘이 클리핑 평면 밖에 서서 통째로 안 보인다.
    expect(html).toMatch(/buildOutsideView\(\s*\{[^}]*cameraFar:\s*V\.getCamera\(\)\.far/);
    expect(html).not.toMatch(/cameraFar:\s*\d/);   // 숫자를 박으면 미러링이다
  });

  it('하늘 무드를 주소 노브로 연다(감독이 화면에서 비교한다)', () => {
    expect(html).toMatch(/buildOutsideView\(\s*\{[^}]*mood:[^}]*get\('sky'\)/);
  });
});
