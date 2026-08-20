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
