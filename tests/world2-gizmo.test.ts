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

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  AXIS_DIR, angleDelta, closestOnAxis, gizmoScale, ringAngle, scaleFactorFromDrag,
} from '../frontend/js/world2/decide/gizmo-math.js';
import { startEditMode } from '../frontend/js/world2/edit/mode.js';
import type { EditSession, OverlayEntry, OverlayHost } from '../frontend/js/world2/edit/types.js';
import { makeThreeStub, type StubRay } from './helpers/three-stub.js';

// ── 🔴 얹기 강조 (감독 지시 2026-08-22 *"마우스를 대면 그 축이 변화가 바로 생겼으면해"*) ──
describe('얹기 강조 판정 — 잡은 것과 얹은 것을 가른다', () => {
  const X = { kind: 'move', axis: 'x' } as const;
  const Y = { kind: 'move', axis: 'y' } as const;

  it('아무것도 안 잡고 안 얹었으면 전부 평상시다 — 룩을 안 바꾼다', () => {
    for (const part of ['x', 'y', 'z', 'rotate', 'scale'] as const) {
      expect(partOpacity(null, part, null)).toBe(OPACITY_IDLE);
      expect(shouldEmphasize(null, null, part), '★ 아무것도 없는데 밝아졌다').toBe(false);
    }
  });

  it('★ 얹으면 그 축만 밝아지고 **나머지는 안 흐려진다**', () => {
    expect(partOpacity(null, 'x', X), '★ 얹은 축이 안 밝다').toBe(OPACITY_ACTIVE);
    expect(partOpacity(null, 'y', X), '★ 얹기만 했는데 나머지를 흐렸다 — 커서가 지나가면 깜빡인다')
      .toBe(OPACITY_IDLE);
    expect(partOpacity(null, 'rotate', X)).toBe(OPACITY_IDLE);
    expect(shouldEmphasize(null, X, 'x')).toBe(true);
    expect(shouldEmphasize(null, X, 'y')).toBe(false);
  });

  it('★ 잡으면 나머지가 흐려진다 — 얹기와 다른 단계다', () => {
    expect(partOpacity(X, 'x', null)).toBe(OPACITY_ACTIVE);
    expect(partOpacity(X, 'y', null), '★ 잡았는데 나머지가 안 흐려졌다').toBe(OPACITY_DIMMED);
  });

  it('★ 잡은 것이 얹은 것을 이긴다 — 끌면서 다른 축 위를 지나도 안 흔들린다', () => {
    // 드래그 중 커서가 Y 막대 위를 지나가는 상황. 강조는 잡은 X 의 것이어야 한다.
    expect(partOpacity(X, 'x', Y), '★ 잡은 축이 흐려졌다').toBe(OPACITY_ACTIVE);
    expect(partOpacity(X, 'y', Y), '★ 얹힌 축이 잡은 축을 밀어냈다').toBe(OPACITY_DIMMED);
    expect(shouldEmphasize(X, Y, 'y'), '★ 끌던 중 다른 축이 함께 밝아졌다').toBe(false);
    expect(shouldEmphasize(X, Y, 'x')).toBe(true);
  });
});

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
  /** `host.toRaw()` 가 돌려줄 것. 테스트가 «손실 있는 데이터» 를 만들 수 있게 연다 */
  raw: { value: unknown };
};

let current: EditSession | null = null;

/**
 * `requestAnimationFrame` 호출 수. 기즈모 루프가 «언제 도는가» 를 재는 유일한 수단이다 —
 * 내부 상태를 안 들여다보고 **밖에서 관측**한다.
 */
let rafCount = 0;
const realRaf = globalThis.requestAnimationFrame;
beforeEach(() => {
  rafCount = 0;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    rafCount++;
    return realRaf(cb);
  }) as typeof globalThis.requestAnimationFrame;
});
afterEach(() => {
  current?.dispose();
  current = null;
  globalThis.requestAnimationFrame = realRaf;
  document.body.innerHTML = '';
});

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
  const raw = { value: { version: 2, items: [], parcels: [] } as unknown };

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
    toRaw: () => raw.value,
    look() { },
    // 마을 파츠는 이 파일들의 축이 아니다 — 문을 닫아 두면 `pickVillage` 가 즉시
    // `null` 을 내고 오버레이만 집던 예전 경로가 그대로 돈다.
    instances: null,
    village: null,
    // 미술관 벽(태스크 #112). 이 하네스에는 미술관이 없다 — `null` 이 사실이다.
    glbCity: null,
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
    session, entry, hits, canvas, root, raw,
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
  dragPath(h, mesh, [from, to]);
}

/**
 * 🔴 **여러 점을 거치는 드래그.** 실제 손은 `pointermove` 를 초당 수십 번 낸다.
 *
 * ⚠ **위 `drag` 가 두 점만 보내는 것이 이 파일의 사각이었다**(감독 신고 2026-08-22
 * *"마우스로 조정하면 딱 한단계만 움직여"*). 시작점과 끝점 하나씩이면 `update` 가 **한
 * 번만** 돌고, 「한 스텝 뒤에 멈춘다」는 두 번째 스텝부터 드러나는 결함이라 **구조적으로
 * 볼 수 없었다.** 축 드래그 검사가 넷이나 있었는데 전부 초록이었던 이유가 그것이다.
 *
 * 값이 아니라 **재는 축**이 틀렸던 형태다 — 이 저장소가 이름 붙인 그것이다.
 */
function dragPath(h: Harness, mesh: unknown, path: readonly [number, number][]): void {
  h.hits.length = 0;
  h.hits.push({ object: mesh });
  const [first, ...rest] = path;
  aimAt(h, first![0], first![1]);
  h.canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 400, clientY: 400, bubbles: true }));
  for (const [x, z] of rest) {
    aimAt(h, x, z);
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, clientY: 400, bubbles: true }));
  }
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

  // ── 🔴 감독 신고 «딱 한단계만 움직여» (2026-08-22) ────────────────────────
  // 이동 축의 기준점이 **물체 자신**이었고, 드래그가 그 물체를 옮기니 기준점이 손을 따라
  // 같이 움직여 상대 거리가 0 으로 상쇄됐다. 유도는 `decide/gizmo-math.ts` 의
  // `closestOnAxis` 주석 한 곳이다 — 여기에 다시 적지 않는다.
  //
  // ⚠ **이 검사가 없어서 넉 달을 못 봤다.** 위 축 드래그 검사 넷은 전부 두 점짜리였고,
  // 이 결함은 **두 번째 스텝부터** 드러난다. 그래서 「테스트 통과」와 「동작한다」가
  // 갈렸다 — 값이 아니라 재는 축이 틀린 형태다.
  it('🔴 여러 스텝을 끌면 **매 스텝** 따라온다 — 한 스텝 뒤 멈추지 않는다', () => {
    const h = makeHarness();
    // 손이 X 축을 따라 1m 씩 네 번 나아간다.
    dragPath(h, handleMesh(h, 'move', 'x'), [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
    expect(h.entry.x, '★ 손이 4m 갔는데 물건이 그만큼 안 왔다 — 기준점이 물체를 따라갔다')
      .toBeCloseTo(4, 5);
  });

  it('🔴 스텝을 잘게 나눠도 총 이동은 같다 — 프레임 수에 결과가 안 걸린다', () => {
    const coarse = makeHarness();
    dragPath(coarse, handleMesh(coarse, 'move', 'x'), [[0, 0], [6, 0]]);
    const fine = makeHarness();
    // 같은 6m 를 여섯 번에 나눠 간다. 손이 지나간 경로가 같으므로 결과도 같아야 한다.
    dragPath(fine, handleMesh(fine, 'move', 'x'),
      [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]]);
    expect(fine.entry.x, '★ 프레임을 잘게 쪼개니 덜 움직였다 — 매 스텝 좌표계가 바뀐다')
      .toBeCloseTo(coarse.entry.x, 5);
    expect(fine.entry.x).toBeCloseTo(6, 5);
  });

  it('🔴 커서를 얹으면 그 축이 실제로 밝아진다 — 배선이 살아 있는가', () => {
    const h = makeHarness();
    const x = handleMesh(h, 'move', 'x') as { material: { opacity: number } };
    const y = handleMesh(h, 'move', 'y') as { material: { opacity: number } };
    const before = x.material.opacity;
    h.hits.length = 0;
    h.hits.push({ object: x });
    // ⚠ **캔버스로** 보낸다 — `gizmo-hover.ts` 는 캔버스 밖이면 무조건 걷는다.
    h.canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, clientY: 400, bubbles: true }));
    expect(x.material.opacity, '★ 얹었는데 안 밝아졌다 — 배선이 끊겼다')
      .toBeGreaterThan(before);
    expect(y.material.opacity, '★ 얹기만 했는데 나머지가 흐려졌다').toBe(before);
  });

  it('🔴 선택이 바뀌면 얹은 것도 함께 걷힌다 — `end()` 가 안 비우는 대신 여기가 맡는다', () => {
    // `gizmo.ts` 의 `end()` 주석이 *"비우는 자리를 `attach` 하나로 모은다"* 라고 주장한다.
    // 그 주장이 거짓이면 **스테일 강조**가 남는다 — 손을 뗀 자리의 축이 계속 밝다.
    const h = makeHarness();
    const x = handleMesh(h, 'move', 'x') as { material: { opacity: number } };
    const idle = x.material.opacity;
    h.hits.length = 0;
    h.hits.push({ object: x });
    h.canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, clientY: 400, bubbles: true }));
    expect(x.material.opacity, '얹기가 먼저 성립해야 이 검사가 의미가 있다').toBeGreaterThan(idle);
    // 선택을 푼다(= 대상이 바뀐다).
    h.hits.length = 0;
    h.canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 400, clientY: 500, bubbles: true }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(x.material.opacity, '★ 대상이 바뀌었는데 얹은 강조가 남았다 — 스테일이다')
      .toBe(idle);
  });

  it('🔴 Z 축도 같다 — 한 축만 고치고 넘어가지 않았다', () => {
    const h = makeHarness();
    dragPath(h, handleMesh(h, 'move', 'z'), [[0, 0], [0, -1], [0, -2], [0, -3]]);
    expect(h.entry.z, '★ Z 축이 한 스텝 뒤 멈췄다').toBeCloseTo(-3, 5);
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

  it('★ 붙을 것이 없으면 프레임을 안 잡는다', async () => {
    // ⚠ **검수관 P3 가 잡은 것**: 헤더 주석이 *"편집이 꺼지면 멈춘다"* 라고 적고 있었는데
    // 실제로는 세션 진입 즉시 시작해 `dispose` 까지 돌았다. `target === null` 이면 계산이
    // 없어 실해는 미미했지만 **주석-코드 불일치**는 이 저장소가 반복해서 걸린 형태다.
    // 코드를 문장에 맞춘 뒤, 그 문장을 **검사로** 만든다 — 안 그러면 다시 갈라진다.
    const h = makeHarness();
    const settle = () => new Promise((r) => setTimeout(r, 40));

    await settle();
    const running = rafCount;
    await settle();
    expect(rafCount, '붙어 있는 동안은 프레임을 잡아야 한다').toBeGreaterThan(running);

    // 빈 곳을 클릭해 선택을 푼다 → `attach(null)`
    h.hits.length = 0;
    h.canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 400, clientY: 500, bubbles: true }));
    await settle();
    const stopped = rafCount;
    await settle();
    expect(rafCount, '★ 뗐는데도 루프가 계속 돈다 — 주석이 거짓이 된다').toBe(stopped);
  });
});

// ── 수치 입력 — 기즈모가 못 하는 «정확히 얼마» ──────────────────────────────

function fields(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>('#w2-edit .fld input')];
}

describe('수치 입력 (행위)', () => {
  it('다섯 칸이 있다 — x·y·z·회전·크기', () => {
    makeHarness();
    expect(fields().length).toBe(5);
  });

  it('고르면 현재 값이 뜬다', () => {
    const h = makeHarness();
    h.entry.x = 3.5;
    h.entry.ry = Math.PI / 2;
    // 값이 바뀐 뒤의 갱신은 refresh 를 타므로, 조작 하나로 그것을 유발한다
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true, cancelable: true }));
    const [x, , , deg] = fields();
    expect(Number(x.value), '★ 좌표가 칸에 안 뜬다').toBeCloseTo(3.5, 2);
    // 회전은 **도**로 보여야 한다 — 라디안을 치라고 하면 「90도」를 넣을 방법이 없다.
    expect(Number(deg.value)).toBeGreaterThan(89);
  });

  it('치면 항목이 바뀌고 씬에 반영된다', () => {
    const h = makeHarness();
    const before = h.applied;
    const [x] = fields();
    x.value = '12.5';
    x.dispatchEvent(new Event('input', { bubbles: true }));
    expect(h.entry.x, '★ 친 값이 항목에 안 들어갔다').toBeCloseTo(12.5, 5);
    expect(h.applied, '★ 씬 반영이 안 불렸다 — 수만 바뀌고 화면은 그대로다').toBeGreaterThan(before);
  });

  it('회전 칸은 도로 받아 라디안으로 넣는다', () => {
    const h = makeHarness();
    const deg = fields()[3];
    deg.value = '90';
    deg.dispatchEvent(new Event('input', { bubbles: true }));
    expect(h.entry.ry).toBeCloseTo(Math.PI / 2, 5);
  });

  it('★ 치는 중인 칸은 refresh 가 덮어쓰지 않는다', () => {
    // 이 축이 없으면 기즈모 드래그가 프레임마다 refresh 를 불러 **타이핑이 불가능**해진다.
    // 실제로 값을 치다가 화면을 살짝 건드리기만 해도 입력이 통째로 날아간다.
    const h = makeHarness();
    const [x] = fields();
    x.focus();
    x.value = '7.5';             // 치고 있는 중
    h.entry.x = 999;             // 딴 데서 값이 바뀐 상황
    // 드래그 등으로 refresh 가 도는 것을 흉내낸다
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true, cancelable: true }));
    expect(x.value, '★ 치는 중에 입력칸이 덮어써졌다 — 값을 칠 수 없게 된다').toBe('7.5');
  });

  it('★ 칸을 비워도 좌표가 0 으로 튀지 않는다', () => {
    // `type=number` 는 중간 입력을 못 담는다 — 사용자가 `-` 나 `7.` 를 치는 순간 브라우저가
    // value 를 **빈 문자열**로 바꾼다. 그때 `Number('')` 는 **0** 이고 finite 라서,
    // 「지우고 다시 친다」 라는 가장 흔한 동작에서 물건이 원점으로 순간이동한다.
    // 이 축이 실제로 그 결함을 잡았다(구현 직후, 2026-08-13).
    const h = makeHarness();
    h.entry.x = 42;
    const [x] = fields();
    x.value = '';
    x.dispatchEvent(new Event('input', { bubbles: true }));
    expect(h.entry.x, '★ 칸을 비웠더니 좌표가 0 이 됐다').toBe(42);
  });

  it('아무것도 안 골랐으면 칸이 잠긴다', () => {
    const h = makeHarness();
    // 빈 곳을 클릭해 선택을 푼다
    h.hits.length = 0;
    h.canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 400, clientY: 500, bubbles: true }));
    expect(fields().every((f) => f.disabled), '★ 대상이 없는데 칸이 열려 있다').toBe(true);
  });
});

// ── 내보내기 — 검수관 권고 P1 (2026-08-13) ──────────────────────────────────
// 분해로 `exportNow` 가 `mode.ts` → `actions.ts` 로 옮겨갔는데 **통합 테스트가 없었다.**
// 검수관이 옛 판본과 텍스트 대조로 «로직 그대로» 를 확인해 블로커에서 뺐지만, 이 파일을
// 또 만질 때 회귀를 못 잡는 것은 그대로다.

describe('내보내기 (행위)', () => {
  function clickExport(): void {
    const btn = [...document.querySelectorAll<HTMLButtonElement>('#w2-edit button')]
      .find((b) => b.textContent === 'JSON 내보내기');
    expect(btn, '내보내기 버튼을 못 찾았다 — 이 검사가 공허해진다').toBeTruthy();
    btn?.click();
  }

  it('무손실이면 한 번에 저장한다', () => {
    const h = makeHarness();
    const saved: string[] = [];
    const realCreate = URL.createObjectURL;
    URL.createObjectURL = ((b: Blob) => { saved.push(b.type); return 'blob:x'; }) as typeof URL.createObjectURL;
    const realRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = (() => { }) as typeof URL.revokeObjectURL;
    try {
      clickExport();
      expect(saved.length, '★ 무손실인데 저장이 안 됐다').toBe(1);
      expect(saved[0]).toBe('application/json');
      void h;
    } finally {
      URL.createObjectURL = realCreate;
      URL.revokeObjectURL = realRevoke;
    }
  });

  it('★ 손실이 있으면 1차 클릭에서 저장하지 않는다 — 2차에 저장한다', () => {
    // 계약이 «버렸다» 고 말하는 데이터를 만든다(경로가 커밋 불가한 항목).
    const h = makeHarness();
    h.raw.value = { version: 2, items: [{ src: '../secret.glb' }], parcels: [] };
    const saved: string[] = [];
    const realCreate = URL.createObjectURL;
    URL.createObjectURL = ((b: Blob) => { saved.push(b.type); return 'blob:x'; }) as typeof URL.createObjectURL;
    const realRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = (() => { }) as typeof URL.revokeObjectURL;
    try {
      clickExport();
      expect(saved.length, '★ 손실이 있는데 1차 클릭에서 그대로 저장했다').toBe(0);
      clickExport();
      expect(saved.length, '★ 2차 클릭에서도 저장이 안 됐다 — 감독이 내보낼 방법이 없다').toBe(1);
    } finally {
      URL.createObjectURL = realCreate;
      URL.revokeObjectURL = realRevoke;
    }
  });
});

// ── 🔴 GS-G1 집기 판정 — 감독 신고 «왜 기즈모가 잘 안 집히지?» (2026-08-20) ──
//
// 이 파일 헤더가 *"기즈모가 화면에서 집기 좋은 크기인가"* 를 **「여기서 못 재는 것」**
// 으로 적어 뒀고, 감독이 정확히 그 자리를 신고했다. **화면 크기는 여전히 못 잰다** —
// 잴 수 있는 것은 ⓐ 겹침 방지 **산술** ⓑ 숨김 안전장치의 **행위** 둘이다.
import {
  createGizmo, PICK_R, PICK_FROM, PICK_TO, RING_R, RING_HALF,
} from '../frontend/js/world2/edit/gizmo.js';

describe('🔴 GS-G1 — 집기 프록시가 엉뚱한 것을 잡지 않는다 (산술)', () => {
  it('🔴 세 축 프록시가 **원점에서 안 겹친다**', () => {
    // 겹치면 x·y·z 중 어느 축을 잡았는지가 **광선 거리로** 정해진다(= 운).
    expect(PICK_FROM, `🔴 프록시가 원점을 침범한다 — 반경 ${PICK_R} 인데 ${PICK_FROM} 부터다`)
      .toBeGreaterThan(PICK_R);
  });

  it('🔴 프록시가 **회전 링 앞에서 끝난다**', () => {
    // 겹치면 이동을 잡으려던 클릭이 회전으로 먹힌다.
    expect(PICK_TO, '🔴 이동 프록시가 회전 링을 파고든다').toBeLessThan(RING_R - RING_HALF);
  });

  it('★ 프록시 길이가 양수다 — 값을 뒤집어 놓고 지나가지 않게', () => {
    expect(PICK_TO).toBeGreaterThan(PICK_FROM);
  });
});

describe('🔴 GS-G2 — 안 붙어 있으면 아무것도 안 집는다 (행위)', () => {
  /** 기즈모만 돌리는 최소 host — 광선은 우리가 직접 만든 히트 목록으로 대신한다 */
  const mini = () => {
    const root = { children: [] as unknown[], add(o: unknown) { this.children.push(o); } };
    const host = {
      THREE: makeThreeStub({}),
      root,
      camera: { position: { x: 0, y: 5, z: 10 } },
    } as unknown as OverlayHost;
    const gizmo = createGizmo(host);
    const group = root.children[0] as { children: unknown[] };
    return { gizmo, group };
  };
  const target = () => ({
    kind: 'overlay', x: 0, y: 0, z: 0, ry: 0, s: 1,
    apply() {}, commit() {}, remove: () => true, ground: () => 0,
  } as unknown as Parameters<ReturnType<typeof createGizmo>['attach']>[0]);

  it('🔴 `attach(null)` 상태에서는 **잔상 메시가 걸려도** `null` 이다', () => {
    const { gizmo, group } = mini();
    const mesh = group.children[0];
    expect(mesh, '🔴 기즈모가 부품을 하나도 안 만들었다 — 검사가 헛돈다').toBeTruthy();
    // ⚠ 이 목록은 **레이캐스터가 실제로 내주는 형태**다. three 는 `visible` 을 안 보므로
    // 숨긴 기즈모의 메시가 이렇게 그대로 온다 — 그것이 이 검사의 전제다.
    expect(gizmo.hitTest([{ object: mesh }]), '🔴 안 붙었는데 축이 잡힌다 — 물건 선택이 먹히지 않는다')
      .toBeNull();
  });

  it('★ **등가 대조군** — 붙어 있으면 같은 메시가 잡힌다', () => {
    const { gizmo, group } = mini();
    gizmo.attach(target());
    const mesh = group.children[0];
    expect(gizmo.hitTest([{ object: mesh }]), '🔴 붙였는데도 안 잡힌다 — 안전장치가 과했다')
      .not.toBeNull();
  });

  it('🔴 축 하나가 **메시 셋**을 등록한다 — 막대·머리·프록시', () => {
    const { gizmo, group } = mini();
    gizmo.attach(target());
    const kinds = group.children
      .map((m) => gizmo.hitTest([{ object: m }]))
      .filter((h): h is NonNullable<typeof h> => h !== null);
    const xs = kinds.filter((h) => h.kind === 'move' && h.axis === 'x');
    expect(xs.length, '🔴 X 축 부품이 셋이 아니다 — 프록시가 등록에서 빠졌다').toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 잡은 축 표시 (2026-08-22, 감독 지시 *"기즈모? 선택되었을때 축별 어떤 것이 선택되었는지
// 표시가 필요해."*)
//
// ⚠ **착수 전 실측이 이 회차의 전제다.** `edit/input.ts` 가 *"기즈모는 잡은 축이 색으로
// 보이지만 모달은 아무것도 안 보인다"* 라고 적고 있어 「이미 표시가 있다」로 읽힐 수
// 있었는데, `gizmo.ts` 전체에서 `hover`·`highlight` 가 **0건**이었다. 축마다 색이 다른
// 것과 잡은 축이 표시되는 것은 다른 일이다.
import {
  emphasize, handleLabel, isActivePart, partOf, partOpacity, shouldEmphasize,
  OPACITY_ACTIVE, OPACITY_DIMMED, OPACITY_IDLE, EMPHASIS_MIX,
} from '../frontend/js/world2/decide/gizmo-math.js';
import type { Handle } from '../frontend/js/world2/decide/gizmo-math.js';

describe('🔴 GS-G3 — 잡은 축 강조 (산술)', () => {
  const MOVE_X: Handle = { kind: 'move', axis: 'x' };
  const MOVE_Z: Handle = { kind: 'move', axis: 'z' };
  const ROT: Handle = { kind: 'rotate' };
  const SCL: Handle = { kind: 'scale' };

  it('핸들이 자기 파트를 짚는다', () => {
    expect(partOf(MOVE_X)).toBe('x');
    expect(partOf(MOVE_Z)).toBe('z');
    expect(partOf(ROT)).toBe('rotate');
    expect(partOf(SCL)).toBe('scale');
  });

  it('🔴 잡은 것만 활성이다 — 축 하나를 잡았는데 셋이 다 밝으면 표시가 아니다', () => {
    expect(isActivePart(MOVE_X, 'x')).toBe(true);
    for (const p of ['y', 'z', 'rotate', 'scale'] as const) {
      expect(isActivePart(MOVE_X, p), `★ X 를 잡았는데 ${p} 가 활성이다`).toBe(false);
    }
  });

  it('🔴 아무것도 안 잡았으면 **평상시 룩 그대로** — 이 회차가 안 건드리는 경계다', () => {
    for (const p of ['x', 'y', 'z', 'rotate', 'scale'] as const) {
      expect(isActivePart(null, p)).toBe(false);
      expect(partOpacity(null, p), `★ 안 잡았는데 ${p} 의 불투명도가 바뀌었다`).toBe(OPACITY_IDLE);
    }
  });

  it('🔴 잡으면 그것만 진해지고 나머지는 흐려진다', () => {
    expect(partOpacity(ROT, 'rotate')).toBe(OPACITY_ACTIVE);
    expect(partOpacity(ROT, 'x')).toBe(OPACITY_DIMMED);
    // 흐린 쪽이 **0 이 아니다** — 완전히 지우면 축 배치가 사라져 방향 감각이 나빠진다.
    expect(OPACITY_DIMMED, '★ 안 잡은 축이 통째로 사라진다').toBeGreaterThan(0);
    expect(OPACITY_DIMMED).toBeLessThan(OPACITY_IDLE);
    expect(OPACITY_ACTIVE).toBeGreaterThan(OPACITY_IDLE);
  });

  it('🔴 강조는 **색상을 유지한 채** 밝아진다 — 채널 순서가 뒤집히면 축을 잘못 읽는다', () => {
    const RED = 0xff5566;
    const on = emphasize(RED, true);
    const ch = (c: number, sh: number) => (c >> sh) & 0xff;
    // 세 채널이 **전부** 오르거나 유지된다(이미 255 인 채널은 그대로).
    for (const sh of [16, 8, 0]) {
      expect(ch(on, sh), `★ 채널 ${sh} 가 어두워졌다`).toBeGreaterThanOrEqual(ch(RED, sh));
    }
    // 그리고 실제로 밝아져야 한다 — 전부 그대로면 강조가 아니다.
    const sum = (c: number) => ch(c, 16) + ch(c, 8) + ch(c, 0);
    expect(sum(on), '★ 강조했는데 밝기가 그대로다').toBeGreaterThan(sum(RED));
    // 순서(빨강 > 파랑 > 초록)가 유지되어야 색상이 보존된 것이다.
    expect(ch(on, 16)).toBeGreaterThan(ch(on, 8));
  });

  it('🔴 배수가 아니라 **흰색까지의 거리** 비율이다 — 배수의 실패를 실제 색으로 잰다', () => {
    // 이미 최대인 채널은 그대로, 어두운 채널은 그 비율만큼 오른다.
    expect(emphasize(0xff0000, true) >> 16 & 0xff).toBe(0xff);
    expect(emphasize(0xff0000, true) & 0xff).toBe(Math.round(0xff * EMPHASIS_MIX));
    // ⚠ **배수 방식이 실제로 깨지는 곳을 그대로 못 박는다**(검수관 권고 P2 실측).
    // ① 순수 원색은 배수로 **변화 0** — 강조가 아예 안 보인다. lerp 은 보인다.
    expect(emphasize(0xff0000, true), '★ 순수 원색에서 강조가 안 보인다').not.toBe(0xff0000);
    // ② 밝은 회색은 배수로 순백이 된다 — lerp 은 흰색에 안 붙는다.
    expect(emphasize(0xdddddd, true), '★ 밝은 회색이 순백으로 날아갔다').not.toBe(0xffffff);
    // ③ 색상 이동: 채널 사이의 **간격**이 남아야 한다.
    // ⚠ **`>=` 였고 배수를 못 잡았다**(검수관 권고 N1). `#ffcc55` 에서 lerp 은
    // `#ffe3a2`(255 ≥ 227)이고 배수는 `#ffff7b`(255 ≥ 255)라 **둘 다 통과**했다 —
    // 이름은 「색상 이동」인데 그것을 안 쟀다. `>` 면 배수만 걸린다(255 > 255 = 거짓).
    // P3 에서 지적한 「이름이 자기가 재지 않는 것을 말한다」의 약한 재발이었다.
    const c = emphasize(0xffcc55, true);
    const ch = (sh: number) => (c >> sh) & 0xff;
    expect(ch(16), '★ R·G 가 함께 상한에 붙었다 — 주황빛 노랑이 순노랑으로 이동했다')
      .toBeGreaterThan(ch(8));
    expect(ch(8)).toBeGreaterThan(ch(0));
  });

  it('끄면 원래 색 그대로', () => {
    expect(emphasize(0xff5566, false)).toBe(0xff5566);
  });

  it('🔴 **두 번 강조하면 실제로 누적된다** — 그래서 집행부가 기본 색에서 다시 계산해야 한다', () => {
    // ⚠ **첫 판본이 빈 단언이었다**(검수관 권고 P3, 2026-08-22). 그때 식은
    // `emphasize(RED, true) === emphasize(emphasize(RED, false), true)` 였는데
    // `emphasize(RED, false) === RED` 라 **항등식**이었다 — 「두 번 강조」를 이름에 적어
    // 놓고 한 번도 두 번 강조하지 않았다. `E9`(집기 프록시 덕에 무조건 참이던 부등식)와
    // 같은 형태이고, 검수관이 「더 있는지」를 물어 찾은 둘째다.
    const RED = 0xff5566;
    const once = emphasize(RED, true);
    const twice = emphasize(once, true);
    expect(twice, '★ 두 번 강조가 누적되지 않는다 — 그러면 집행부의 base 재계산이 무의미하다')
      .not.toBe(once);
    // 누적은 **흰색 쪽으로만** 간다 — 그것이 「회를 거듭할수록 흰색이 된다」의 실체다.
    const ch = (c: number, sh: number) => (c >> sh) & 0xff;
    for (const sh of [16, 8, 0]) expect(ch(twice, sh)).toBeGreaterThanOrEqual(ch(once, sh));
  });

  it('🔴 라벨이 **축 이름을 말한다** — 색만으로는 「빨강이 X 였나」를 기억해야 한다', () => {
    expect(handleLabel(MOVE_X)).toContain('X');
    expect(handleLabel({ kind: 'move', axis: 'y' })).toContain('Y');
    expect(handleLabel(MOVE_Z)).toContain('Z');
    expect(handleLabel(ROT)).toBe('회전');
    expect(handleLabel(SCL)).toBe('크기');
    // 셋이 서로 구별된다 — 같은 문자열이면 목록에서 못 고른다.
    const all = [MOVE_X, { kind: 'move', axis: 'y' } as Handle, MOVE_Z, ROT, SCL].map(handleLabel);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('🔴 GS-G4 — 잡은 축 강조 (행위)', () => {
  /** 재질을 들여다볼 수 있는 최소 host */
  const mini = () => {
    const root = { children: [] as unknown[], add(o: unknown) { this.children.push(o); } };
    const said: string[] = [];
    const host = {
      THREE: makeThreeStub({}),
      root,
      camera: { position: { x: 0, y: 5, z: 10 } },
    } as unknown as OverlayHost;
    const gizmo = createGizmo(host, (m) => { said.push(m); });
    const group = root.children[0] as { children: { material?: { color?: { getHex?(): number }; opacity: number } }[] };
    return { gizmo, group, said };
  };
  const target = () => ({
    kind: 'overlay', x: 0, y: 0, z: 0, ry: 0, s: 1,
    apply() {}, commit() {}, remove: () => true, ground: () => 0,
  } as unknown as Parameters<ReturnType<typeof createGizmo>['attach']>[0]);
  // `Ray3` 는 평평한 6수다(`decide/gizmo-math.ts`) — 중첩 객체가 아니다.
  const RAY = { ox: 0, oy: 5, oz: 10, dx: 0, dy: -0.4, dz: -0.9 };

  /** 그려지는 파트들의 불투명도 모음(집기 프록시는 안 그려지므로 뺀다) */
  const opacities = (g: ReturnType<typeof mini>['group']) =>
    g.children.filter((m) => m.material).map((m) => m.material!.opacity);

  it('🔴 붙이기만 해서는 아무것도 안 흐려진다 — 평상시 룩 무변경', () => {
    const m = mini();
    m.gizmo.attach(target());
    for (const o of opacities(m.group)) expect(o).toBe(OPACITY_IDLE);
  });

  it('🔴 축을 잡으면 흐려지는 파트가 생긴다', () => {
    const m = mini();
    m.gizmo.attach(target());
    m.gizmo.begin({ kind: 'move', axis: 'x' }, RAY);
    const os = opacities(m.group);
    expect(os.some((o) => o === OPACITY_ACTIVE), '★ 진해진 파트가 없다').toBe(true);
    expect(os.some((o) => o === OPACITY_DIMMED), '★ 흐려진 파트가 없다 — 구별이 안 된다').toBe(true);
  });

  it('🔴 놓으면 **전부 원래대로** — 안 걷으면 다음 드래그에서 그 위에 또 밝아진다', () => {
    const m = mini();
    m.gizmo.attach(target());
    m.gizmo.begin({ kind: 'rotate' }, RAY);
    m.gizmo.end();
    for (const o of opacities(m.group)) {
      expect(o, '★ 놓았는데 강조가 남아 있다').toBe(OPACITY_IDLE);
    }
  });

  /** 그려지는 파트들의 색 모음 */
  const colors = (g: ReturnType<typeof mini>['group']) =>
    g.children.filter((m) => m.material).map((m) => m.material!.color!.getHex!());

  it('🔴 잡으면 색이 밝아지고, 놓으면 **정확히 원래 색**으로 돌아온다', () => {
    const m = mini();
    m.gizmo.attach(target());
    const before = colors(m.group);
    m.gizmo.begin({ kind: 'move', axis: 'x' }, RAY);
    expect(colors(m.group), '★ 잡았는데 색이 하나도 안 변했다').not.toEqual(before);
    m.gizmo.end();
    expect(colors(m.group), '★ 놓았는데 색이 안 돌아왔다').toEqual(before);
  });

  it('🔴 여러 번 잡았다 놓아도 색이 안 밀린다 — **기본 색에서 다시 계산**하는가', () => {
    // 현재 색에서 강조하면 회를 거듭할수록 흰색으로 간다. 그 형태는 `end()` 에서
    // 원복이 안 되는 것으로 먼저 드러나고, 다음 드래그에서 그 위에 또 밝아진다.
    // (뮤테이션 실측 2026-08-22: 이 축이 없을 때 그 결함이 **0 failed** 였다.)
    const m = mini();
    m.gizmo.attach(target());
    const base = colors(m.group);
    for (let i = 0; i < 4; i += 1) {
      m.gizmo.begin({ kind: 'move', axis: 'y' }, RAY);
      m.gizmo.end();
    }
    expect(colors(m.group), '★ 네 번 잡았다 놓았더니 색이 밀렸다 — 강조가 누적된다').toEqual(base);
  });

  /**
   * **고유 재질** 목록. 메시가 아니라 재질로 세는 것이 요점이다 — 축 하나가 막대와
   * 화살촉에 재질을 **공유**하므로 메시로 세면 축 하나가 둘로 잡힌다.
   *
   * ⚠ 첫 판본은 메시 단위로 「변한 개수 < 전체」를 봤고 **빈 검사였다**(뮤테이션 실측
   * 2026-08-22: 「전부 강조」로 바꿔도 0 failed). 집기 프록시가 강조 대상이 아니라
   * 언제나 안 변하고, 그래서 그 부등식이 **무조건 참**이었다.
   */
  const mats = (g: ReturnType<typeof mini>['group']) =>
    [...new Set(g.children.map((m) => m.material).filter(Boolean))] as
      { color: { getHex(): number } }[];

  it('🔴 축 하나를 잡으면 **재질 하나만** 밝아진다 — 전부 밝아지면 구별이 안 된다', () => {
    const m = mini();
    m.gizmo.attach(target());
    const all = mats(m.group);
    expect(all.length, '★ 재질을 못 모았다 — 검사가 헛돈다').toBeGreaterThan(2);
    const before = new Map(all.map((x) => [x, x.color.getHex()]));
    m.gizmo.begin({ kind: 'move', axis: 'x' }, RAY);
    const changed = all.filter((x) => x.color.getHex() !== before.get(x));
    expect(changed.length, '★ 잡은 축 하나만 밝아져야 한다').toBe(1);
  });

  it('🔴 회전을 잡아도 마찬가지 — 파트 종류가 달라도 하나다', () => {
    const m = mini();
    m.gizmo.attach(target());
    const all = mats(m.group);
    const before = new Map(all.map((x) => [x, x.color.getHex()]));
    m.gizmo.begin({ kind: 'rotate' }, RAY);
    expect(all.filter((x) => x.color.getHex() !== before.get(x)).length).toBe(1);
  });

  it('🔴 `attach()` 가 강조 잔재를 안 남긴다 — 다시 붙였을 때 엉뚱한 축이 밝으면 안 된다', () => {
    // 검수관 권고 P4. 드래그 중 대상이 사라지면 `end()` 없이 `attach(null)` 이 온다.
    // 그때 강조가 남으면 **다음에 붙이는 순간** 잡지도 않은 축이 밝게 보인다.
    const m = mini();
    m.gizmo.attach(target());
    const base = colors(m.group);
    m.gizmo.begin({ kind: 'move', axis: 'x' }, RAY);
    m.gizmo.attach(null);          // end() 없이 대상이 사라진다
    m.gizmo.attach(target());      // 다시 붙인다
    expect(colors(m.group), '★ 다시 붙였는데 잡지도 않은 축이 밝다').toEqual(base);
    for (const o of opacities(m.group)) expect(o).toBe(OPACITY_IDLE);
  });

  it('🔴 화면이 **무엇을 잡았는지 말한다** — 축 이름이 글자로 나온다', () => {
    const m = mini();
    m.gizmo.attach(target());
    m.gizmo.begin({ kind: 'move', axis: 'z' }, RAY);
    expect(m.said.at(-1), '★ 잡았는데 화면이 침묵한다').toMatch(/Z축/);
  });

  it('말하는 문이 없어도 강조는 동작한다 — 선택 사양의 계약', () => {
    const root = { children: [] as unknown[], add(o: unknown) { this.children.push(o); } };
    const host = {
      THREE: makeThreeStub({}), root, camera: { position: { x: 0, y: 5, z: 10 } },
    } as unknown as OverlayHost;
    const g = createGizmo(host); // say 없이
    g.attach(target());
    expect(() => { g.begin({ kind: 'scale' }, RAY); g.end(); }).not.toThrow();
  });
});

// ── 조립 배선 (여기서는 행위로 못 재는 것) ───────────────────────────────────
//
// 위 GS-G4 는 `createGizmo` 를 **직접** 부르며 `say` 를 넘긴다. 그런데 제품에서 글자가
// 실제로 뜨는가는 `edit/mode.ts` 가 그 문을 물리는지에 달려 있고, **안 물려도 위 검사는
// 전부 초록이다**(뮤테이션 실측 2026-08-22: `createGizmo(host)` 로 되돌려도 0 failed).
// 이 저장소가 검수관 블로커 B-A 로 겪은 「조립이 그 부품을 안 물린」 형태 그대로다.
//
// ⚠ 한계는 다른 정적 축과 같다 — 「적혀 있다」까지이고 「불린다」는 못 본다.
describe('🔴 GS-G5 — 조립이 기즈모의 말하는 문을 물린다', () => {
  // ⚠ **cwd 기준 상대 경로다.** 이 파일은 jsdom 환경이라 `import.meta.url` 이 `file:`
  // 스킴이 아니고 `fileURLToPath` 가 던진다(실측 2026-08-22).
  const src = (() => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    return readFileSync('frontend/js/world2/edit/mode.ts', 'utf8');
  })();

  it('`createGizmo` 에 둘째 인자를 넘긴다 — 안 넘기면 축 이름이 화면에 안 뜬다', () => {
    expect(src, '★ 조립이 `say` 를 안 물렸다').toMatch(/createGizmo\(host,\s*\(/);
  });

  it('그 문이 **패널**로 간다 — 다른 데로 가면 감독이 못 본다', () => {
    const call = src.slice(src.indexOf('createGizmo(host'), src.indexOf('createGizmo(host') + 200);
    expect(call).toContain('panel.say');
  });
});
