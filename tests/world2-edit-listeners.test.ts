// @vitest-environment jsdom
//
// 편집 리스너가 **언제 붙어 있는가** — 행위로 잰다.
//
// ── 왜 소스 텍스트가 아니라 실제 등록을 세는가 ──────────────────────────────
// 이 축들은 원래 `world2-overlay-wiring.test.ts` 에서 **소스 텍스트 위치**로 검사했다
// (`bindEditListeners` 와 `unbindEditListeners` 사이에 `doc.addEventListener` 가 있는가).
// 그 방식이 약하다는 것은 이미 실측돼 있었다 — 검수관이 뮤테이션 4종으로 두들겨
// **넷째가 안 잡히는 것을 확인했다**(2026-08-12): 부팅부에서 `bindEditListeners()` 를
// 무조건 부르면 주행이 그대로 죽는데 **20/20 통과**였다. 텍스트는 *"어디에 적혀 있나"*
// 만 보고 *"실제로 언제 불리나"* 를 못 본다.
//
// 2026-08-13 의 파일 분해가 그 약점을 한 번 더 드러냈다: 코드가 `input.ts` 로 옮겨가자
// 여섯 축이 **일제히 빨간불**이 됐다. 동작은 하나도 안 바뀌었는데 검사가 깨진 것이다.
// 경로만 고쳐 옮기면 이번 구현 형태를 박제할 뿐이라, 행위로 승격했다(태스크 #43).
//
// ── 이 파일이 재는 것 ───────────────────────────────────────────────────────
// `host.doc` 이 주입 가능하다는 점을 쓴다 — 진짜 document 를 Proxy 로 감싸 등록/해제만
// 가로채 **살아 있는 리스너 수**를 센다. 실제 DOM 조작(패널 생성 등)은 그대로 통과한다.
//
// **여기서 못 재는 것**: 리스너가 붙어 있는지와 별개로 «캔버스 클릭이 포인터락에 실제로
// 도달하는가» — 그건 `main.ts` 와 브라우저 이벤트 순서의 일이고 jsdom 이 재현하지 않는다.
// 감독 실기기 확인이 그 축의 유일한 판정이다.

import { describe, it, expect, afterEach } from 'vitest';
import { startEditMode } from '../frontend/js/world2/edit/mode.js';
import type { EditSession, OverlayEntry, OverlayHost } from '../frontend/js/world2/edit/types.js';

/** 편집 조작을 가로채는 리스너들. `keydown` 은 모드 키(`Tab`)가 상시라 따로 본다. */
const GRABBY = ['click', 'contextmenu', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'drop'];

function spyDoc(): { doc: Document; live: Map<string, number> } {
  const live = new Map<string, number>();
  const bump = (type: string, d: number) => live.set(type, (live.get(type) ?? 0) + d);
  const real = document;
  const doc = new Proxy(real, {
    get(t, k, r) {
      if (k === 'addEventListener') {
        return (type: string, fn: EventListener, opt?: unknown) => {
          bump(type, +1);
          real.addEventListener(type, fn, opt as never);
        };
      }
      if (k === 'removeEventListener') {
        return (type: string, fn: EventListener, opt?: unknown) => {
          bump(type, -1);
          real.removeEventListener(type, fn, opt as never);
        };
      }
      const v = Reflect.get(t, k, r);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
    },
  }) as Document;
  return { doc, live };
}

/** `GRABBY` 중 지금 살아 있는 리스너 총합 */
function grabbyCount(live: Map<string, number>): number {
  let n = 0;
  for (const type of GRABBY) n += live.get(type) ?? 0;
  return n;
}

type Harness = {
  session: EditSession;
  live: Map<string, number>;
  doc: Document;
  canvas: HTMLCanvasElement;
  entries: OverlayEntry[];
  removed: OverlayEntry[];
  /** 광선에 걸릴 것. 비우면 «빈 곳을 클릭» 이 된다 */
  hits: { object: unknown }[];
  /**
   * 씬 루트. **테스트가 이것을 알아야 항목을 «고를» 수 있다** — `pick.ts` 의 `entryOf`
   * 는 맞은 오브젝트에서 부모를 거슬러 «부모가 root 인 것» 을 찾아 항목으로 환원한다.
   * 여기를 비워 두면 클릭이 언제나 «빈 곳» 이 되고 이 파일의 선택 축이 통째로 빈
   * 검사가 된다(첫 판본이 그랬다 — 3개가 빨간불이 되어 드러났다).
   */
  root: unknown;
};

let current: EditSession | null = null;
afterEach(() => { current?.dispose(); current = null; document.body.innerHTML = ''; });

function makeHarness(): Harness {
  const { doc, live } = spyDoc();
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  // jsdom 의 `getBoundingClientRect` 는 전부 0 이라 NDC 변환이 `null` 로 떨어진다 —
  // 그러면 클릭이 통째로 무시돼 이 파일이 아무것도 안 재게 된다(빈 검사).
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    toJSON() { return {}; },
  }) as DOMRect;

  const hits: { object: unknown }[] = [];
  const entries: OverlayEntry[] = [];
  const removed: OverlayEntry[] = [];
  const root = { children: [] as unknown[], add() { }, remove() { } };

  const THREE = {
    Raycaster: class {
      ray = { origin: { x: 0, y: 10, z: 0 }, direction: { x: 0, y: -1, z: 0 } };
      setFromCamera(): void { }
      intersectObjects(): { object: unknown }[] { return hits; }
    },
    Mesh: class {
      position = { set(): void { } };
      rotation = { x: 0 };
      scale = { setScalar(): void { } };
      visible = false;
      renderOrder = 0;
    },
    RingGeometry: class { dispose(): void { } },
    MeshBasicMaterial: class { dispose(): void { } },
    Box3: class {
      min = { x: Infinity, y: Infinity, z: Infinity };
      max = { x: -Infinity, y: -Infinity, z: -Infinity };
      setFromObject(): void { }
    },
    DoubleSide: 2,
  };

  const host: OverlayHost = {
    THREE,
    camera: {} as never,
    canvas,
    doc,
    cellX: 40,
    cellZ: 40,
    root: root as never,
    entries: () => entries,
    place: async () => null,
    lastFailure: () => null,
    remove(e) { removed.push(e); const i = entries.indexOf(e); if (i >= 0) entries.splice(i, 1); },
    apply() { },
    toRaw: () => ({ version: 2, items: [], parcels: [] }),
    look() { },
    surfaceAt: () => 0,
  };

  // 팔레트 요청은 이 축과 무관하다 — 목록이 없으면 끌어다 놓기만 쓰는 정상 경로로 간다.
  const session = startEditMode(host, { modelsUrl: 'about:blank', onBlobUrl() { } });
  current = session;
  return { session, live, doc, canvas, entries, removed, hits, root };
}

/** 항목 하나를 씬에 있는 것처럼 꾸미고, 광선에 걸리게 한다 */
function addEntry(h: Harness): OverlayEntry {
  // `entryOf` 는 «부모가 root 인 조상» 을 찾으므로 holder 를 root 에 직접 매단다.
  const holder = { parent: h.root };
  const e: OverlayEntry = {
    id: 1, src: 'assets/models/a.glb', preview: false,
    holder: holder as never, x: 0, y: 0, z: 0, ry: 0, s: 1,
  };
  h.entries.push(e);
  return e;
}

function pressTab(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', bubbles: true, cancelable: true }));
}

describe('주행이 산다 — 편집 리스너는 편집 모드에서만 붙는다 (행위)', () => {
  // ⚠ **이 절은 감독 신고에서 생겼다**(2026-08-12): *"저 위에 링크 클릭하면 마우스 터치,
  // 키보드 동작안해."* `?edit=1` 이 편집 모드 상시 켜짐이라 편집 리스너가 캔버스 클릭을
  // 캡처 단계에서 끊었고, 그래서 `main.ts` 의 포인터락 요청이 **영영 안 불렸다** →
  // 마우스를 움직여도 시점이 안 돈다.
  //
  // 배포 전 검증은 *"포인터락 미발생 = PASS"* 로 쟀다. 감독에게 그것은 성공이 아니라
  // *"화면이 안 돌아간다"* 였다 — **재는 축이 틀렸다.** 그래서 여기서는 반대 방향을 본다.

  it('부팅 직후는 주행 모드다 — 편집 리스너가 하나도 없다', () => {
    const h = makeHarness();
    expect(
      grabbyCount(h.live),
      '★ 부팅부터 편집 리스너가 붙어 있다 = 주행이 죽는다(감독 신고 2026-08-12).'
      + ' 소스 텍스트 검사가 놓쳤던 형태가 정확히 이것이다 — 등록 코드는 bind 안에 있는데'
      + ' 부팅부가 그 bind 를 무조건 부르는 경우.',
    ).toBe(0);
  });

  it('편집을 켜면 붙고, 끄면 **전부** 뗀다', () => {
    const h = makeHarness();
    pressTab();
    const on = grabbyCount(h.live);
    expect(on, '편집을 켰는데 리스너가 안 붙었다 — 그러면 아무것도 못 집는다').toBeGreaterThan(0);

    pressTab();
    expect(
      grabbyCount(h.live),
      '★ bind/unbind 가 어긋났다 — 편집을 꺼도 남는 리스너가 주행을 계속 막는다.',
    ).toBe(0);
  });

  it('여러 번 켜고 꺼도 새지 않는다 — 중복 등록이 쌓이면 한 번의 클릭이 여러 번 처리된다', () => {
    const h = makeHarness();
    for (let i = 0; i < 3; i++) { pressTab(); pressTab(); }
    expect(grabbyCount(h.live)).toBe(0);
    pressTab();
    const once = grabbyCount(h.live);
    pressTab(); pressTab(); // 껐다 다시 켠다
    expect(grabbyCount(h.live), '★ 켤 때마다 리스너가 누적된다').toBe(once);
  });

  it('dispose 하면 상시 리스너(Tab)까지 전부 사라진다', () => {
    const h = makeHarness();
    pressTab(); // 편집을 켜 둔 채로 떠난다 — 가장 새기 쉬운 경로
    h.session.dispose();
    current = null;
    let total = 0;
    for (const n of h.live.values()) total += n;
    expect(total, '★ dispose 후에도 리스너가 남는다 — 세션을 다시 열면 두 벌이 된다').toBe(0);
  });

  it('편집이 꺼져 있어도 Tab 은 듣는다 — 그러지 않으면 켤 방법이 버튼뿐이다', () => {
    const h = makeHarness();
    expect(h.live.get('keydown') ?? 0, 'Tab 을 듣는 리스너가 없다').toBeGreaterThan(0);
  });
});

describe('선택된 항목에 대한 키 조작 (행위)', () => {
  /** 항목을 하나 놓고 클릭으로 고른다 */
  function selectOne(h: Harness): OverlayEntry {
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    pressTab(); // 편집 모드
    h.canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0, clientX: 400, clientY: 500, bubbles: true,
    }));
    return e;
  }

  it('맥 키보드에도 삭제가 있다 — `Delete` 코드의 키가 없는 기기가 있다', () => {
    // hint 가 "Del 삭제" 를 광고하는데 맥에서는 그 자리가 `Backspace` 라 영구 무반응이었다.
    const h = makeHarness();
    const e = selectOne(h);
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backspace', bubbles: true, cancelable: true }));
    expect(h.removed, '★ Backspace 가 안 먹는다 — 맥에서 삭제할 방법이 없어진다').toContain(e);
  });

  it('Delete 도 그대로 먹는다', () => {
    const h = makeHarness();
    const e = selectOne(h);
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Delete', bubbles: true, cancelable: true }));
    expect(h.removed).toContain(e);
  });

  it('회전 키가 실제로 값을 바꾼다', () => {
    const h = makeHarness();
    const e = selectOne(h);
    const before = e.ry;
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true, cancelable: true }));
    expect(e.ry, '★ 편집키가 값을 안 바꾼다').not.toBe(before);
  });
});

describe('드래그가 갇히지 않는다 (행위)', () => {
  it('pointercancel 도 드래그를 정리한다 — 터치에서 pointerup 이 안 오는 경로', () => {
    // 브라우저가 제스처를 가로채면 `pointerup` 이 **안 온다.** 그러면 `dragging` 이 영구히
    // 남아 이후 모든 손가락이 물건을 끌고 다닌다(`builder.js` 가 이미 겪은 축).
    const h = makeHarness();
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    pressTab();
    h.canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0, clientX: 400, clientY: 500, bubbles: true,
    }));
    document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));

    // 취소 뒤의 이동은 물건을 끌면 안 된다.
    const x = e.x;
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: 550, bubbles: true }));
    expect(e.x, '★ pointercancel 뒤에도 드래그가 살아 있다 — 이후 모든 터치가 물건을 끈다').toBe(x);
  });
});
