// @vitest-environment jsdom
//
// 기즈모 — **산술**과 **그 산술이 실제로 소비되는가**를 함께 잰다.
//
// ── 왜 두 층인가 (팀장 조건 1, 2026-08-13) ──────────────────────────────────
// 판정(`decide/gizmo-math.ts`)을 순수 함수로 두면 각 쪽은 시험하기 쉬워지지만,
// **«계산된 값이 실제로 소비되는가» 는 양쪽 단위 테스트 어디에도 안 걸린다.** 이 저장소가
// 이미 그 구멍에 데였다 — 구름 `alpha` 미소비를 고치고 *"값이 무시되면 깨지는 테스트를
// 넣었다"* 고 적었는데 순수 함수 안에서만 참이었고 통합 지점은 아무도 안 봤다(검수관이
// 잡았다). 그래서 팀장이 기즈모 승인 조건 1로 **경계 통합 테스트**를 못 박았다.
//
// 아래 두 번째 describe 가 그것이다: 스텁 three 로 `startEditMode` 를 **실제로 돌리고**,
// 기즈모 핸들을 광선에 걸어 포인터 이벤트를 흘려 «항목 값이 바뀌는가» 를 본다.
//
// ── 여기서 못 재는 것 ───────────────────────────────────────────────────────
// **조작감**(«블렌더처럼» 인가) · 기즈모가 화면에서 집기 좋은 크기인가 · `MeshBasicMaterial`
// 이 WebGPU 실기기에서 실제로 그려지는가. 셋 다 감독 화면에서만 판정되고, 팀장 조건 2가
// 그 확인을 **한 번의 왕복에 묶으라**고 지정했다. 통과로 적지 않는다.

import { describe, it, expect, afterEach } from 'vitest';
import {
  AXIS_DIR, angleDelta, closestOnAxis, gizmoScale, ringAngle, scaleFactorFromDrag,
} from '../frontend/js/world2/decide/gizmo-math.js';
import { startEditMode } from '../frontend/js/world2/edit/mode.js';
import type { EditSession, OverlayEntry, OverlayHost } from '../frontend/js/world2/edit/types.js';
import { makeThreeStub, type StubRay } from './helpers/three-stub.js';

describe('기즈모 산술 — three 없이', () => {
  it('수직으로 내려꽂는 광선은 x축의 자기 x좌표를 가리킨다', () => {
    const u = closestOnAxis(
      { ox: 3, oy: 10, oz: 0, dx: 0, dy: -1, dz: 0 }, [0, 0, 0], AXIS_DIR.x,
    );
    expect(u).toBeCloseTo(3, 6);
  });

  it('축과 나란한 광선은 null — 그 순간 물건이 축을 따라 날아간다', () => {
    // 광선이 x축과 평행하면 «어디를 가리키는가» 가 정해지지 않는다. 값을 지어내면
    // 최근접점이 축 위 아무 데로나 튀고, 화면에서는 물건이 순간이동한다.
    const u = closestOnAxis(
      { ox: 0, oy: 1, oz: 0, dx: 1, dy: 0, dz: 0 }, [0, 0, 0], AXIS_DIR.x,
    );
    expect(u).toBeNull();
  });

  it('축 원점이 원점이 아니어도 축 기준 파라미터를 낸다', () => {
    const u = closestOnAxis(
      { ox: 7, oy: 5, oz: 2, dx: 0, dy: -1, dz: 0 }, [2, 0, 2], AXIS_DIR.x,
    );
    expect(u, '축 원점 x=2 에서 7 까지는 5 다').toBeCloseTo(5, 6);
  });

  it('링 각도 — +z 방향은 0, +x 방향은 +90°', () => {
    // `ry` 가 Y축 회전이라 z 가 기준축이다. 이 관례가 깨지면 링을 돌릴 때 물건이
    // 90° 어긋난 채 따라온다.
    const zDir = ringAngle({ ox: 0, oy: 10, oz: 5, dx: 0, dy: -1, dz: 0 }, 0, 0, 0);
    const xDir = ringAngle({ ox: 5, oy: 10, oz: 0, dx: 0, dy: -1, dz: 0 }, 0, 0, 0);
    expect(zDir).toBeCloseTo(0, 6);
    expect(xDir).toBeCloseTo(Math.PI / 2, 6);
  });

  it('링 중심에 너무 가까우면 null — 각도가 손떨림에 통째로 뒤집힌다', () => {
    expect(ringAngle({ ox: 0.01, oy: 10, oz: 0, dx: 0, dy: -1, dz: 0 }, 0, 0, 0)).toBeNull();
  });

  it('카메라 뒤쪽 평면은 null', () => {
    // 위로 쏘는 광선은 y=0 평면을 **뒤로** 만난다. 그것을 받아들이면 등 뒤의 물건이 돈다.
    expect(ringAngle({ ox: 0, oy: 10, oz: 5, dx: 0, dy: 1, dz: 0 }, 0, 0, 0)).toBeNull();
  });

  it('각도 차이는 짧은 쪽으로 접힌다 — 안 그러면 ±π 를 넘을 때 한 바퀴 되감긴다', () => {
    expect(angleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2, 6);
    expect(angleDelta(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(-0.2, 6);
    expect(Math.abs(angleDelta(0, Math.PI * 1.9)), '언제나 π 이하로 접힌다')
      .toBeLessThanOrEqual(Math.PI + 1e-9);
  });

  it('기즈모 배율은 거리에 비례한다 — 멀리 있어도 화면에서 같은 크기', () => {
    const near = gizmoScale(0, 0, 0, 0, 0, 10, 0.1);
    const far = gizmoScale(0, 0, 0, 0, 0, 40, 0.1);
    expect(far / near).toBeCloseTo(4, 6);
  });

  it('카메라가 물건 안에 있어도 기즈모가 사라지지 않는다', () => {
    expect(gizmoScale(1, 2, 3, 1, 2, 3, 0.1)).toBeGreaterThan(0);
  });

  it('크기 드래그는 기즈모 크기로 정규화된다 — 멀리서도 같은 손 이동에 같은 배율', () => {
    // 정규화가 없으면 멀리서 잡았을 때 한 번에 수십 배가 된다(기즈모가 그만큼 크므로
    // 축 파라미터의 절대 이동도 그만큼 크다).
    const nearF = scaleFactorFromDrag(0.5, 1);
    const farF = scaleFactorFromDrag(5, 10);
    expect(nearF).toBeCloseTo(farF, 6);
  });

  it('크기 배수는 0 이하로 안 간다 — 뒤집힌 채 사라지는 것을 막는다', () => {
    expect(scaleFactorFromDrag(-999, 1)).toBeGreaterThan(0);
  });
});

// ── 경계 — 산술이 실제로 항목에 먹는가 ──────────────────────────────────────

type Harness = {
  session: EditSession;
  entry: OverlayEntry;
  hits: { object: unknown }[];
  ray: StubRay;
  canvas: HTMLCanvasElement;
  root: { children: unknown[] };
  applied: number;
};

let current: EditSession | null = null;
afterEach(() => { current?.dispose(); current = null; document.body.innerHTML = ''; });

type GizmoMesh = { userData: { gizmo?: { kind: string; axis?: string } } };

function makeHarness(): Harness {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    toJSON() { return {}; },
  }) as DOMRect;

  const hits: { object: unknown }[] = [];
  const rays: StubRay[] = [];
  const root = { children: [] as unknown[], add(o: unknown) { root.children.push(o); }, remove() { } };
  const entries: OverlayEntry[] = [];
  const state = { applied: 0 };

  const host: OverlayHost = {
    THREE: makeThreeStub({ rays, hits: () => hits }),
    // 기즈모가 배율을 잡으려면 카메라 위치가 필요하다
    camera: { position: { x: 0, y: 20, z: 0 } } as never,
    canvas,
    doc: document,
    cellX: 40,
    cellZ: 40,
    root: root as never,
    entries: () => entries,
    place: async () => null,
    lastFailure: () => null,
    remove() { },
    apply() { state.applied++; },
    toRaw: () => ({ version: 2, items: [], parcels: [] }),
    look() { },
    surfaceAt: () => 0,
  };

  const session = startEditMode(host, { modelsUrl: 'about:blank', onBlobUrl() { } });
  current = session;

  const holder = { parent: root };
  const entry: OverlayEntry = {
    id: 1, src: 'assets/models/a.glb', preview: false,
    holder: holder as never, x: 0, y: 0, z: 0, ry: 0, s: 1,
  };
  entries.push(entry);

  // 편집 모드로 들어가 항목을 고른다 — 그래야 기즈모가 붙는다.
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', bubbles: true, cancelable: true }));
  hits.push({ object: holder });
  canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 400, clientY: 500, bubbles: true }));
  document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  hits.length = 0;

  return {
    session, entry, hits, canvas, root,
    ray: rays[0],
    get applied() { return state.applied; },
  };
}

/** 기즈모 그룹에서 원하는 핸들 메시를 찾는다 */
function handleMesh(h: Harness, kind: string, axis?: string): unknown {
  for (const child of h.root.children) {
    const g = child as { children?: unknown[] };
    if (!Array.isArray(g.children)) continue;
    for (const m of g.children) {
      const u = (m as GizmoMesh).userData?.gizmo;
      if (u && u.kind === kind && (axis === undefined || u.axis === axis)) return m;
    }
  }
  return null;
}

/** 광선 원점을 옮긴다 — 스텁은 방향을 (0,-1,0) 으로 고정하므로 원점이 곧 «가리키는 곳» 이다 */
function aimAt(h: Harness, x: number, z: number): void {
  h.ray.origin.x = x;
  h.ray.origin.z = z;
}

function drag(h: Harness, mesh: unknown, from: [number, number], to: [number, number]): void {
  h.hits.length = 0;
  h.hits.push({ object: mesh });
  aimAt(h, from[0], from[1]);
  h.canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 400, clientY: 400, bubbles: true }));
  aimAt(h, to[0], to[1]);
  document.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, clientY: 400, bubbles: true }));
  document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
}

describe('기즈모 경계 — 계산이 실제로 항목에 먹는가', () => {
  it('기즈모가 선택된 항목에 붙는다 — 핸들이 씬에 생긴다', () => {
    const h = makeHarness();
    expect(handleMesh(h, 'move', 'x'), '★ 이동 핸들이 없다 — 기즈모가 안 붙었다').not.toBeNull();
    expect(handleMesh(h, 'rotate'), '★ 회전 링이 없다').not.toBeNull();
    expect(handleMesh(h, 'scale'), '★ 크기 핸들이 없다').not.toBeNull();
  });

  it('X축 핸들을 끌면 x 만 바뀐다', () => {
    const h = makeHarness();
    drag(h, handleMesh(h, 'move', 'x'), [0, 0], [4, 0]);
    expect(h.entry.x, '★ 축 드래그가 항목에 안 먹었다 — 산술과 집행이 이어지지 않았다').toBeCloseTo(4, 5);
    expect(h.entry.y, '★ X축을 끌었는데 y 가 움직였다').toBe(0);
    expect(h.entry.z, '★ X축을 끌었는데 z 가 움직였다').toBe(0);
  });

  it('Z축 핸들을 끌면 z 만 바뀐다', () => {
    const h = makeHarness();
    drag(h, handleMesh(h, 'move', 'z'), [0, 0], [0, -3]);
    expect(h.entry.z).toBeCloseTo(-3, 5);
    expect(h.entry.x).toBe(0);
  });

  it('회전 링을 끌면 ry 가 바뀐다', () => {
    const h = makeHarness();
    // +z(각 0) 에서 +x(각 +90°) 로 끈다
    drag(h, handleMesh(h, 'rotate'), [0, 5], [5, 0]);
    expect(h.entry.ry, '★ 링 드래그가 ry 에 안 먹었다').toBeCloseTo(Math.PI / 2, 4);
  });

  it('크기 핸들을 바깥으로 끌면 커진다', () => {
    const h = makeHarness();
    drag(h, handleMesh(h, 'scale'), [1, 0], [3, 0]);
    expect(h.entry.s, '★ 크기 핸들이 안 먹었다').toBeGreaterThan(1);
  });

  it('드래그가 host.apply 를 부른다 — 값만 바뀌고 화면이 안 따라오면 아무 일도 안 일어난 것이다', () => {
    const h = makeHarness();
    const before = h.applied;
    drag(h, handleMesh(h, 'move', 'x'), [0, 0], [2, 0]);
    expect(h.applied, '★ 씬 반영이 안 불렸다').toBeGreaterThan(before);
  });

  it('기즈모 핸들을 잡으면 «물건 끌기» 가 시작되지 않는다', () => {
    // 핸들은 물건 위에 겹쳐 그려지므로(depthTest:false) 항목을 먼저 찾으면 축을 잡으려던
    // 클릭이 통째로 «선택» 으로 먹힌다. 그러면 기즈모가 있어도 못 쓴다.
    const h = makeHarness();
    const axis = handleMesh(h, 'move', 'x');
    h.hits.length = 0;
    // 핸들과 항목이 **둘 다** 광선에 걸린 상태 — 실제로 늘 이렇다
    h.hits.push({ object: axis }, { object: h.entry.holder });
    aimAt(h, 0, 0);
    h.canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 400, clientY: 400, bubbles: true }));
    aimAt(h, 6, 4);
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, clientY: 400, bubbles: true }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));

    expect(h.entry.x, '★ 축을 잡았는데 x 가 안 움직였다').toBeCloseTo(6, 5);
    expect(h.entry.z, '★ 축을 잡았는데 평면 드래그가 함께 먹었다 — z 까지 끌렸다').toBe(0);
  });

  it('편집을 끄면 기즈모가 사라진다 — 주행 중에 핸들이 떠 있으면 안 된다', () => {
    const h = makeHarness();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', bubbles: true, cancelable: true }));
    const group = h.root.children.find((c) => Array.isArray((c as { children?: unknown[] }).children));
    expect((group as { visible: boolean }).visible, '★ 편집을 껐는데 기즈모가 보인다').toBe(false);
  });
});
