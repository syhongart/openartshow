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
//
// ── 검출력 실측 (2026-08-13, 별도 클론) ─────────────────────────────────────
// 통과는 검출력의 증거가 아니므로 결함을 되살려 쟀다. 대조군 **40 passed**(깨끗).
//
//   M1 부팅부에서 `input.bind()` 를 무조건 호출        → **1 failed**
//   M2 `unbind` 에서 `pointercancel` 만 뺌            → **3 failed**
//   M3 `case 'Backspace'` 제거 (맥에서 삭제 불가)      → **1 failed**
//   M4 패널을 화면 왼쪽으로 (모바일 조이스틱 가림)      → **1 failed**
//   M5 `state` 를 두 벌 만든다 (분해 특유의 결함)       → **2 failed**
//   M6 `dispose` 가 상시 리스너를 안 뗀다              → **1 failed**
//
// **M1 이 이 파일의 존재 이유다.** 검수관이 2026-08-12 에 옛 소스 텍스트 축으로 같은
// 결함을 심고 **20/20 통과**를 실측했다 — 등록 코드의 «위치» 는 정상이고 «언제 불리나»
// 만 틀렸기 때문이다. 행위로 옮기니 잡힌다.
//
// **M5 는 분해가 새로 연 위험이다.** 상태를 객체로 뽑으면 «두 번 만들기» 가 가능해지고,
// 그러면 패널이 보는 `selected` 와 조작이 바꾸는 `selected` 가 갈린다. 화면에서만
// 드러나는 형태라 게이트가 없으면 감독이 발견한다.

import { describe, it, expect, afterEach } from 'vitest';
import { startEditMode } from '../frontend/js/world2/edit/mode.js';
import type { EditSession, OverlayEntry, OverlayHost } from '../frontend/js/world2/edit/types.js';
import { makeThreeStub, type StubHit } from './helpers/three-stub.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';

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
  hits: StubHit[];
  /**
   * **마을 인스턴스** 광선에 걸릴 것. 위 `hits` 와 갈라 둔 이유: 편집은 광선을 두 곳에
   * 쏘고(오버레이 루트의 자식들 · 슬롯 풀의 인스턴스 메시들) 한 배열을 공유하면
   * «마을을 집었다» 를 재려는 케이스가 오버레이 쪽에서 먼저 걸린다.
   */
  villageHits: StubHit[];
  /** 마을 인스턴스 메시(가짜). `getMatrixAt` 이 내는 위치를 테스트가 정한다 */
  villageMesh: { at: { x: number; y: number; z: number } };
  /** `refreshBounds` · `intersectObjects` 의 **호출 순서**가 여기 쌓인다 */
  order: string[];
  /** 선택 링. 「어느 것을 골랐나」를 화면이 실제로 말하는지 재는 유일한 축이다 */
  marker: () => { visible?: boolean; position?: { x: number; z: number } } | undefined;
  /** 편집이 건 동결. 키는 `px,pz` */
  frozen: Map<string, PlacedPart[]>;
  /**
   * 기즈모 핸들 메시 하나. **드래그 경로를 재려면 이것이 필요하다** — 핸들을 `hits` 에
   * 넣어야 `gizmo.hitTest` 가 잡고 `dragging` 이 켜진다. P1 뮤테이션(손 뗄 때 확정 안 함)이
   * 0 failed 로 그 구멍을 드러냈다(2026-08-13).
   */
  gizmoHandle: () => unknown;
  /** 수치칸(X·Y·Z·°·×) */
  fields: () => HTMLInputElement[];
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

interface VillageFixture {
  /** 파셀 → 배치. 없는 파셀이면 빈 배열 */
  parts?: Record<string, PlacedPart[]>;
  frozen?: (px: number, pz: number) => boolean;
  /** 맞힌 인스턴스의 주인. `null` 이면 «빈 슬롯» */
  owner?: { key: string } | null;
}

function makeHarness(vf?: VillageFixture): Harness {
  const { doc, live } = spyDoc();
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  // jsdom 의 `getBoundingClientRect` 는 전부 0 이라 NDC 변환이 `null` 로 떨어진다 —
  // 그러면 클릭이 통째로 무시돼 이 파일이 아무것도 안 재게 된다(빈 검사).
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    toJSON() { return {}; },
  }) as DOMRect;

  const hits: StubHit[] = [];
  const villageHits: StubHit[] = [];
  const order: string[] = [];
  // 가짜 인스턴스 메시. `at` 이 곧 `getMatrixAt` 이 낼 이동 성분이다.
  const villageMesh = {
    at: { x: 0, y: 0, z: 0 },
    getMatrixAt(_i: number, m: { elements: number[] }): void {
      m.elements[12] = this.at.x; m.elements[13] = this.at.y; m.elements[14] = this.at.z;
    },
  };
  const entries: OverlayEntry[] = [];
  const removed: OverlayEntry[] = [];
  /** 편집이 건 동결. 테스트가 «무엇이 저장됐나» 를 직접 본다 */
  const frozenStore = new Map<string, PlacedPart[]>();
  // ⚠ `add`/`remove` 가 **실제로 담는다.** 빈 함수였을 때 선택 링(`pick.ts` 의 marker)이
  // 어디에도 안 남아서 «링이 떴는가» 를 재는 축이 통째로 불가능했다 — N11 뮤테이션이
  // 0 failed 로 그 구멍을 드러냈다(2026-08-13).
  const root = {
    children: [] as unknown[],
    add(o: unknown) { this.children.push(o); },
    remove(o: unknown) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); },
  };

  const THREE = makeThreeStub({
    hits: (objs) => {
      const village = objs.includes(villageMesh);
      order.push(village ? 'cast:village' : 'cast:overlay');
      return village ? villageHits : hits;
    },
  });

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
    // 마을 문은 **옵션이다.** 안 열면 `pickVillage` 가 즉시 `null` 을 내고 오버레이만
    // 집던 예전 경로가 그대로 돈다 — 이 파일의 기존 축들은 그 상태를 전제로 한다.
    instances: vf
      ? {
        raycastTargets: () => [villageMesh],
        refreshBounds: () => { order.push('refreshBounds'); },
        ownerAt: () => (vf.owner === undefined ? { key: 'building' } : vf.owner),
      }
      : null,
    village: vf
      ? {
        partsAt: (px, pz) => (frozenStore.get(`${px},${pz}`) ?? vf.parts?.[`${px},${pz}`] ?? [])
          .map((p) => ({ ...p })),
        isFrozen: (px, pz) => frozenStore.has(`${px},${pz}`) || (vf.frozen?.(px, pz) ?? false),
        // 실제 저장소(`systems/village-parcels.ts`)의 **관찰 가능한 성질만** 흉내낸다:
        // 넣으면 그 뒤 `partsAt` 이 그것을 낸다. 파셀 재빌드는 여기서 안 재진다
        // (그 축은 `world2-village-parcels.test.ts` 의 경계 절이 실제 부품으로 본다).
        freeze: (px, pz, parts) => { frozenStore.set(`${px},${pz}`, parts.map((p) => ({ ...p }))); },
        thaw: (px, pz) => { frozenStore.delete(`${px},${pz}`); },
      }
      : null,
    surfaceAt: () => 0,
  };

  // 팔레트 요청은 이 축과 무관하다 — 목록이 없으면 끌어다 놓기만 쓰는 정상 경로로 간다.
  const session = startEditMode(host, { modelsUrl: 'about:blank', onBlobUrl() { } });
  current = session;
  return {
    session, live, doc, canvas, entries, removed, hits, root, villageHits, villageMesh, order,
    frozen: frozenStore,
    gizmoHandle: () => {
      for (const c of root.children as { children?: unknown[] }[]) {
        const kids = c?.children;
        if (!Array.isArray(kids)) continue;
        const found = (kids as { userData?: Record<string, unknown> }[])
          .find((k) => k?.userData?.gizmo);
        if (found) return found;
      }
      return undefined;
    },
    fields: () => [...doc.querySelectorAll('#w2-edit input[type="number"]')] as HTMLInputElement[],
    // `pick.ts` 가 선택 링에 `renderOrder = 999` 를 준다. 기즈모는 `Group` 이라 안 섞인다.
    marker: () => (root.children as { renderOrder?: number; visible?: boolean; position?: { x: number; z: number } }[])
      .find((c) => c?.renderOrder === 999),
  };
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

// ── 마을 파츠 집기 (W4 ②-c) ─────────────────────────────────────────────────
//
// 여기서 재는 것은 **클릭 한 번이 무엇을 고르는가**다. 순수 환원(`matchPart`)과 picker
// 단위 축은 `world2-village-pick.test.ts` 가 본다 — 이 파일은 그 위, 「리스너가 붙은
// 실제 세션에서 상태가 어떻게 되는가」다.
//
// ⚠ 두 선택 칸(`selected`·`villageSel`)이 **동시에 채워지면** 링과 패널이 서로 다른 것을
// 가리킨다. 그 불변식은 여기서만 잴 수 있다(picker 는 상태를 안 쓴다).

/**
 * 파셀 (0,0) 로컬 (5, 3) 에 건물 하나. 셀 40 이므로 월드도 (5, 3) 이다.
 *
 * ⚠ **그림자 데칼 파츠를 같은 자리에 넣는다.** 배치 배열에는 실제로 들어 있고
 * (`kindsFor` 가 `shadow:*` 를 포함한다), 그것이 없으면 「데칼은 안 집힌다」 축이
 * **다른 이유로** 통과한다 — 배열에 없는 종류라 매칭이 실패할 뿐이다. N2 뮤테이션이
 * 0 failed 로 그 빈 검사를 드러냈다(2026-08-13).
 */
const VILLAGE_FIXTURE = {
  parts: {
    '0,0': [
      { kind: 'tree', x: -9, y: 0, z: -9, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 },
      { kind: 'building', x: 5, y: 0, z: 3, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 },
      { kind: 'shadow:building', x: 5, y: 0, z: 3, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 },
    ] as PlacedPart[],
  },
};

function clickAt(h: Harness, x = 400, y = 500): void {
  h.canvas.dispatchEvent(new PointerEvent('pointerdown', {
    button: 0, clientX: x, clientY: y, bubbles: true,
  }));
}

describe('마을 파츠를 클릭으로 고른다 (행위)', () => {
  it('★ 건물을 클릭하면 파셀·인덱스로 환원된다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '★ 마을 파츠를 못 집었다').toContain('마을: building');
    expect(h.doc.body.textContent).toContain('파셀 (0, 0) #1');
  });

  it('★ 레이캐스트 **전에** 경계구를 다시 잡는다 — 안 하면 멀리 있는 것이 안 집힌다', () => {
    // W4 ②-a 가 실증한 지뢰다. `frustumCulled=false` 로는 안 막히고 경고도 없다 —
    // 순서가 뒤집히면 화면에는 «어떤 건물은 클릭이 안 먹는다» 로만 드러난다.
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    const rb = h.order.indexOf('refreshBounds');
    const cast = h.order.indexOf('cast:village');
    expect(rb, 'refreshBounds 가 아예 안 불렸다').toBeGreaterThanOrEqual(0);
    expect(rb, '★ 경계구를 레이캐스트 뒤에 잡았다 — 캐시된 옛 구로 걸러진다').toBeLessThan(cast);
  });

  it('★ 오버레이 항목이 먼저다 — 겹쳐 있으면 놓은 GLB 를 고른다', () => {
    // 마을은 어디에나 있고 GLB 는 일부러 그 자리에 둔 것이다.
    const h = makeHarness(VILLAGE_FIXTURE);
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '★ 마을이 오버레이를 가로챘다').not.toContain('마을: building');
    expect(h.doc.body.textContent).toContain('선택: a.glb');
  });

  it('★ 빈 곳을 클릭하면 마을 선택도 풀린다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent).toContain('마을: building');
    h.villageHits.length = 0;
    clickAt(h);
    expect(h.doc.body.textContent, '★ 안 고른 것이 계속 골라진 채로 남는다').not.toContain('마을: building');
    expect(h.doc.body.textContent).toContain('선택: 없음');
  });

  it('★ 그림자 데칼은 집히지 않는다 — 집을 수 없는 것이다', () => {
    // 픽스처 배치에 `shadow:building` 이 **실제로 있다.** 안 거르면 매칭이 성공해서
    // 감독은 «건물을 눌렀는데 그림자가 골라진» 상태가 된다.
    const h = makeHarness({ ...VILLAGE_FIXTURE, owner: { key: 'shadow:building' } });
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '★ 데칼이 집혔다 — 지면 근처 클릭이 전부 여기서 끝난다')
      .not.toContain('마을:');
  });

  it('★ 환원 못 한 히트 **뒤에** 있는 것을 집는다 — 첫 건에서 멈추지 않는다', () => {
    // 광선은 가까운 순으로 여러 건을 낸다. 앞의 하나가 환원되지 않는다고 멈추면
    // 그 뒤에 있는 «집을 수 있는 것» 까지 못 집는다 — «어떤 각도에서만 안 집힌다» 다.
    const h = makeHarness({
      ...VILLAGE_FIXTURE,
      // 첫 히트는 배치에 없는 자리, 둘째는 건물 자리.
      owner: { key: 'building' },
    });
    const ghost = {
      at: { x: 17, y: 0, z: 17 },
      getMatrixAt(_i: number, m: { elements: number[] }): void {
        m.elements[12] = 17; m.elements[13] = 0; m.elements[14] = 17;
      },
    };
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: ghost, instanceId: 0 }, { object: h.villageMesh, instanceId: 1 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '★ 첫 히트가 환원 실패하자 그 뒤를 안 봤다')
      .toContain('파셀 (0, 0) #1');
  });

  it('★ 마을을 고르면 선택 링이 그 자리에 뜬다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    const m = h.marker();
    expect(m, '선택 링을 못 찾았다 — 하네스가 root 를 안 담고 있다').toBeDefined();
    expect(m?.visible, '★ 골랐는데 링이 안 뜬다 — 무엇을 골랐는지 화면이 침묵한다').toBe(true);
    expect([m?.position?.x, m?.position?.z], '★ 링이 엉뚱한 자리에 떴다').toEqual([5, 3]);
  });

  it('★ 오버레이를 고르면 마을 안내가 사라진다 — 선택은 하나다', () => {
    // `villageSel` 이 안 풀리면 패널 아래 안내가 «마을 파츠는 아직 고르기만…» 으로
    // 남는다. 선택은 GLB 인데 안내는 마을을 말하는 상태다.
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent).toContain('「손본 구역」이 되어');

    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    clickAt(h);
    expect(h.doc.body.textContent, '★ GLB 를 골랐는데 마을 안내가 남아 있다')
      .not.toContain('「손본 구역」이 되어');
  });

  it('★ 편집을 끄면 마을 선택도 풀린다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent).toContain('마을: building');
    pressTab(); // 주행으로
    expect(h.doc.body.textContent, '★ 주행으로 돌아왔는데 고른 것이 남아 있다')
      .not.toContain('마을: building');
    expect(h.marker()?.visible, '★ 주행 모드인데 선택 링이 떠 있다').toBe(false);
  });

  it('환원할 수 없는 히트는 조용히 넘긴다 — 엉뚱한 것을 고르지 않는다', () => {
    // 배치에 없는 자리를 맞혔다(파셀은 맞지만 그 자리에 building 이 없다).
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 17, y: 0, z: 17 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '★ 「가장 가까운 것」을 집어 엉뚱한 건물이 골라졌다')
      .not.toContain('마을:');
  });

  it('손본 파셀이면 화면이 그렇게 말한다', () => {
    const h = makeHarness({ ...VILLAGE_FIXTURE, frozen: () => true });
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent).toContain('손본 구역');
  });

  it('마을 문이 닫힌 세션은 예전 그대로다 — 라이브 격리', () => {
    const h = makeHarness(); // 문을 안 연다
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.order, '★ 문이 닫혔는데 마을에 광선을 쐈다').not.toContain('cast:village');
    expect(h.doc.body.textContent).toContain('선택: 없음');
  });
});

// ── 마을 파츠 옮기기·지우기·되돌리기 (W4 ②-d) ───────────────────────────────
//
// 여기서 재는 것은 **조작이 동결로 이어지는가**다. 「동결이 화면까지 오는가」는
// `world2-village-parcels.test.ts` 의 경계 절이 실제 빌더·스트리밍으로 본다.
//
// ⚠ 이 절의 존재 이유: 조작 경로가 다섯이다(기즈모 드래그 · 수치칸 · 조작 버튼 ·
// 편집키 · 삭제). **하나만 `commit()` 을 빠뜨려도 그 경로에서만 조용히 안 저장된다** —
// 화면은 바뀌었는데 파일에는 없는 형태이고, 감독은 내보내기를 열어 봐야 안다.

/**
 * 편집키 하나를 누른다. **편집이 그 키를 먹었으면 `true`**.
 *
 * 반환값이 곧 «주행이 살아 있는가» 의 축이다 — 편집은 자기가 처리한 키만
 * `preventDefault`·`stopPropagation` 한다(`input.ts`). 주행(`main.ts`)은 window 에 붙어
 * 있어서 document 버블 뒤에 오므로, 여기서 `true` 가 나오면 그 키는 주행에 안 간다.
 *
 * `key`(찍힌 글자)를 따로 받는 이유: 모달의 숫자·부호·소수점은 `code` 가 아니라 `key` 로
 * 본다(자판 배열에 안 묶이게 — `decide/modal-edit.ts`).
 */
function pressKey(code: string, key = ''): boolean {
  const ev = new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true });
  document.dispatchEvent(ev);
  return ev.defaultPrevented;
}

/**
 * 마우스를 옮긴다. **모달은 키로 시작하므로 시작점이 마지막 이동 자리다** —
 * 모달을 열기 전에 한 번 불러 두지 않으면 시작점이 (0,0) 이라 첫 이동에 값이 튄다.
 */
function movePointer(x: number, y: number): void {
  document.dispatchEvent(new PointerEvent('pointermove', {
    clientX: x, clientY: y, bubbles: true,
  }));
}

/** 마을 건물 하나를 골라 둔 하네스 */
function pickedVillage(vf: VillageFixture = VILLAGE_FIXTURE): Harness {
  const h = makeHarness(vf);
  h.villageMesh.at = { x: 5, y: 0, z: 3 };
  h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
  pressTab();
  clickAt(h);
  return h;
}

/** 저장된 동결에서 그 파츠를 꺼낸다. 파셀 키는 기본이 원점이다 */
function frozenPart(h: Harness, kind = 'building', key = '0,0'): PlacedPart | undefined {
  return h.frozen.get(key)?.find((p) => p.kind === kind);
}

describe('마을 파츠를 조작하면 그 구역이 동결된다 (행위)', () => {
  it('고르기만 해서는 동결되지 않는다 — 손대지 않은 구역은 계산 그대로', () => {
    const h = pickedVillage();
    expect(h.frozen.size, '★ 클릭만 했는데 구역이 「손본 구역」이 됐다').toBe(0);
  });

  it('★ 편집키(회전)가 동결로 이어진다', () => {
    const h = pickedVillage();
    pressKey('KeyE');
    expect(h.frozen.size, '★ 회전했는데 저장되지 않았다').toBe(1);
    expect(frozenPart(h)?.ry, '회전이 반영되지 않았다').toBeGreaterThan(0);
  });

  it('★ 높이 키가 동결로 이어진다', () => {
    const h = pickedVillage();
    pressKey('KeyX');
    expect(frozenPart(h)?.y, '★ 높이가 저장되지 않았다').toBeGreaterThan(0);
  });

  it('★ 크기 버튼은 **비율을 유지한 채** 민다 — 비균등이 무너지면 건물이 정육면체가 된다', () => {
    // ⚠ 이 축은 원래 `KeyR`(크게) 를 눌렀다. **`R` 은 회전 모달로 갔다**(블렌더 표준) —
    // 키가 사라진 것이 아니라 옮겨간 것이라, 같은 성질을 남은 경로(패널 버튼)로 잰다.
    // 모달 `S` 경로의 같은 성질은 아래 「블렌더식 모달 조작」 절이 따로 본다.
    const h = makeHarness({
      parts: {
        '0,0': [{ kind: 'building', x: 5, y: 0, z: 3, ry: 0, sx: 4, sy: 8, sz: 2, tone: 0 }] as PlacedPart[],
      },
    });
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    [...h.doc.querySelectorAll('button')].find((b) => b.textContent === '크기 +')!.click();
    const p = frozenPart(h)!;
    expect(p.sx, '★ 크기가 안 커졌다').toBeGreaterThan(4);
    // 4 : 8 : 2 = 1 : 2 : 0.5 가 유지돼야 한다.
    expect(p.sy / p.sx).toBeCloseTo(2, 5);
    expect(p.sz / p.sx).toBeCloseTo(0.5, 5);
  });

  it('★ 지우면 배열에서 빠진 채로 동결된다 — 「다 지웠다」와 「안 손댔다」', () => {
    const h = pickedVillage();
    pressKey('Delete');
    const parts = h.frozen.get('0,0');
    expect(parts, '★ 지웠는데 저장되지 않았다 — 재방문하면 되살아난다').toBeDefined();
    expect(parts?.some((p) => p.kind === 'building'), '★ 지운 건물이 남아 있다').toBe(false);
    expect(parts?.some((p) => p.kind === 'tree'), '★ 옆의 나무까지 지웠다').toBe(true);
  });

  it('★ 되돌리기가 동결을 푼다', () => {
    const h = pickedVillage({ ...VILLAGE_FIXTURE, frozen: () => true });
    pressKey('KeyE');
    expect(h.frozen.size).toBe(1);
    // 「구역 되돌리기」 버튼을 찾아 누른다.
    const btn = [...h.doc.querySelectorAll('button')].find((b) => b.textContent === '구역 되돌리기');
    expect(btn, '되돌리기 버튼이 없다').toBeDefined();
    btn!.click();
    expect(h.frozen.size, '★ 되돌렸는데 동결이 남아 있다').toBe(0);
  });

  it('되돌리기 버튼은 마을을 골랐을 때만 보인다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    pressTab();
    const btn = [...h.doc.querySelectorAll('button')].find((b) => b.textContent === '구역 되돌리기');
    expect(btn?.hidden, '★ 아무것도 안 골랐는데 되돌리기가 보인다').toBe(true);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    clickAt(h);
    expect(btn?.hidden, '★ 마을을 골랐는데 되돌리기가 안 보인다').toBe(false);
  });

  it('★ 오버레이 항목은 예전 그대로다 — 조작해도 동결이 생기지 않는다', () => {
    // 어댑터 도입이 오버레이 경로를 바꾸면 안 된다(동작 변경 0).
    const h = makeHarness(VILLAGE_FIXTURE);
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    pressTab();
    clickAt(h);
    const before = e.ry;
    pressKey('KeyE');
    expect(e.ry, '★ GLB 회전이 안 먹는다').not.toBe(before);
    expect(h.frozen.size, '★ GLB 를 만졌는데 마을 구역이 동결됐다').toBe(0);
  });
});

// ── 조작 경로 다섯이 **전부** 확정하는가 ────────────────────────────────────
//
// ⚠ **이 절은 뮤테이션이 만들었다.** 위 절만 있을 때 «확정을 빠뜨린다» 를 심어 보니
// 편집키 경로만 잡히고 **기즈모 드래그·조작 버튼·수치칸 셋은 0 failed** 였다
// (P1·P3·P4, 2026-08-13). 경로마다 `commit()` 을 따로 부르는 구조라, 하나가 빠지면
// **그 경로에서만** 조용히 안 저장된다 — 화면은 바뀌었는데 파일에는 없는 형태다.

describe('조작 경로마다 동결이 저장된다 (행위)', () => {
  it('★ 기즈모를 잡았다 놓으면 확정된다', () => {
    const h = pickedVillage();
    const handle = h.gizmoHandle();
    expect(handle, '기즈모 핸들을 못 찾았다 — 이 축이 빈 검사가 된다').toBeDefined();
    // 핸들을 광선에 물려 잡는다(`gizmo.hitTest` → `begin` → `dragging`).
    h.hits.push({ object: handle });
    clickAt(h);
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(h.frozen.size, '★ 기즈모로 옮기고 놓았는데 저장되지 않았다').toBe(1);
  });

  it('빈 곳을 클릭했다 떼는 것만으로는 확정하지 않는다 — 헛일을 안 한다', () => {
    const h = pickedVillage();
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(h.frozen.size, '★ 아무것도 안 했는데 파셀이 다시 만들어진다').toBe(0);
  });

  it('★ 조작 버튼(회전)이 확정한다', () => {
    const h = pickedVillage();
    const btn = [...h.doc.querySelectorAll('button')].find((b) => b.textContent === '회전 ↻');
    expect(btn, '회전 버튼이 없다').toBeDefined();
    btn!.click();
    expect(h.frozen.size, '★ 버튼으로 회전했는데 저장되지 않았다').toBe(1);
    expect(frozenPart(h)?.ry).toBeGreaterThan(0);
  });

  it('★ 수치칸이 확정하고, **월드 좌표를 파셀 로컬로** 되돌린다', () => {
    // 파셀 (1,0) 을 쓰는 것이 요점이다. 원점 파셀이면 월드=로컬이라 변환 결함이 안 보인다.
    const h = makeHarness({
      parts: {
        '1,0': [{ kind: 'building', x: 5, y: 0, z: 3, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 }] as PlacedPart[],
      },
    });
    h.villageMesh.at = { x: 45, y: 0, z: 3 }; // 셀 40 → 파셀 (1,0) 의 로컬 (5,3)
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '파셀 (1,0) 을 못 집었다').toContain('파셀 (1, 0)');

    const [fx] = h.fields();
    expect(fx, '수치칸을 못 찾았다').toBeDefined();
    fx.value = '50';
    fx.dispatchEvent(new Event('input', { bubbles: true }));

    expect(h.frozen.size, '★ 수치를 쳤는데 저장되지 않았다').toBe(1);
    expect(
      frozenPart(h, 'building', '1,0')?.x,
      '★ 월드 좌표가 그대로 저장됐다 — 파셀 원점을 안 뺐다(건물이 파셀 하나만큼 날아간다)',
    ).toBeCloseTo(10, 6);
  });
});

// ── 아웃라이너 (W5 E1) ──────────────────────────────────────────────────────
//
// 「이 구역에 뭐가 있나」를 목록으로 보여주고, 클릭하면 3D 클릭과 **같은 경로**로 고른다.
// 갈라지면 «목록으로 고른 것은 기즈모가 안 붙는다» 가 나고 화면에서만 드러난다.
//
// ⚠ 넓은 화면에서만 보이는 것은 **CSS 미디어 쿼리**가 정한다(`css.ts`). jsdom 은 실제
// 레이아웃을 안 하므로 **가시성은 여기서 못 잰다** — DOM 이 있고 클릭이 먹는가만 본다.
// 「PC 에서 실제로 보이는가」는 감독 화면이 유일한 판정이다.

const outlinerEl = (h: Harness) => h.doc.getElementById('w2-outliner');
const outlinerItems = (h: Harness) =>
  [...(outlinerEl(h)?.querySelectorAll('.items button') ?? [])] as HTMLButtonElement[];

describe('아웃라이너 — 구역 목록 (행위)', () => {
  it('아무것도 안 골랐으면 목록이 비어 있다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    pressTab();
    expect(outlinerEl(h), '아웃라이너 DOM 이 없다').toBeTruthy();
    expect(outlinerItems(h), '★ 안 골랐는데 목록이 차 있다').toHaveLength(0);
  });

  it('★ 마을을 고르면 그 구역의 파츠가 전부 뜬다', () => {
    const h = pickedVillage();
    const items = outlinerItems(h);
    // 픽스처는 tree·building·shadow:building 셋인데 **그림자는 저장 형태에 없다**
    // (`partsAt` 은 캐스터만 — `stripShadows`). 즉 목록에 2개만 와야 한다.
    expect(items.map((b) => b.textContent), '★ 그림자가 목록에 떴다 — 집을 수 없는 것이다')
      .toEqual(['tree #0', 'building #1']);
  });

  it('★ 고른 것이 목록에서 강조된다', () => {
    const h = pickedVillage();
    const on = outlinerItems(h).filter((b) => b.dataset.on === '1');
    expect(on, '★ 무엇을 골랐는지 목록이 말하지 않는다').toHaveLength(1);
    expect(on[0].textContent).toBe('building #1');
  });

  it('★ 목록을 클릭하면 3D 클릭과 같은 경로로 고른다 — 기즈모까지 붙는다', () => {
    const h = pickedVillage();
    // 지금은 building #1 이 골라져 있다. 목록에서 tree #0 으로 바꾼다.
    outlinerItems(h)[0].click();
    expect(h.doc.body.textContent, '★ 목록 클릭이 선택을 안 바꿨다').toContain('마을: tree');
    expect(h.gizmoHandle(), '★ 목록으로 고르면 기즈모가 안 붙는다 — 경로가 갈렸다').toBeDefined();
    const m = h.marker();
    expect(m?.visible, '★ 목록으로 골랐는데 선택 링이 안 뜬다').toBe(true);
    // 링은 **그 파츠 자리**여야 한다. 처음 클릭한 파츠 자리에 남으면 안 된다.
    expect([m?.position?.x, m?.position?.z], '★ 링이 옛 파츠 자리에 남았다').toEqual([-9, -9]);
  });

  it('★ 목록으로 고른 뒤 조작하면 그 파츠가 바뀐다 — 표시만 옮겨간 게 아니다', () => {
    const h = pickedVillage();
    outlinerItems(h)[0].click(); // tree #0
    pressKey('KeyE');            // 회전
    expect(frozenPart(h, 'tree')?.ry, '★ 목록으로 고른 것이 조작에 안 걸린다').toBeGreaterThan(0);
    expect(frozenPart(h, 'building')?.ry, '★ 엉뚱한 파츠가 돌았다').toBe(0);
  });

  it('빈 곳을 클릭하면 목록도 비워진다 — 화면에 안 보이는 것이 골라지지 않게', () => {
    const h = pickedVillage();
    expect(outlinerItems(h).length).toBeGreaterThan(0);
    h.villageHits.length = 0;
    clickAt(h);
    expect(outlinerItems(h), '★ 옛 구역 목록이 남았다').toHaveLength(0);
  });

  it('편집을 끄면 아웃라이너가 주행 모드로 표시된다', () => {
    const h = pickedVillage();
    expect(outlinerEl(h)?.dataset.mode).toBe('edit');
    pressTab();
    expect(outlinerEl(h)?.dataset.mode, '★ 주행으로 돌아왔는데 편집 목록이 남는다').toBe('drive');
  });
});

// ── 블렌더식 모달 조작 (W5 E2) ──────────────────────────────────────────────
//
// 감독 지시 2026-08-13: *"나도 블랜더 잘써서 오히려 그런 방식이 편하지."*
//
// 산술과 상태 기계는 `tests/world2-modal-edit.test.ts` 가 **직접 부르는** 축으로 본다.
// 여기서 재는 것은 그것이 **실제로 배선됐는가** 다 — W4 에서 순수 함수는 맞는데 조립부가
// 안 부르는 형태가 두 번 나왔고(N10·N12), 순수 축만으로는 안 잡혔다.
//
// ⚠ **이 절의 절반은 「주행이 사는가」 다.** `S` 는 주행의 «뒤로» 이고(`main.ts:1252`),
// `R` 은 브라우저 새로고침(⌘R)과 겹친다. 편집이 그 키를 언제 먹고 언제 안 먹는지가
// 곧 «걸어다닐 수 있는가» 라서, 값 검사보다 이쪽이 더 비싼 축이다.

/** 패널 맨 아래 hint 줄. 화면이 광고하는 키 목록이다 */
const hintText = (h: Harness): string => {
  const notes = [...h.doc.querySelectorAll('#w2-edit .note')];
  return notes[notes.length - 1]?.textContent ?? '';
};

/** 비균등 스케일 건물 하나만 있는 구역 — 비율 유지 축이 쓴다 */
const SCALED_FIXTURE: VillageFixture = {
  parts: {
    '0,0': [{ kind: 'building', x: 5, y: 0, z: 3, ry: 0, sx: 4, sy: 8, sz: 2, tone: 0 }] as PlacedPart[],
  },
};

/** 마을 건물을 골라 두고 **마우스 시작점까지 정한** 하네스 */
function modalReady(vf: VillageFixture = VILLAGE_FIXTURE): Harness {
  const h = pickedVillage(vf);
  movePointer(400, 300);
  return h;
}

describe('블렌더식 모달 — 주행이 산다 (행위)', () => {
  it('★ 아무것도 안 골랐으면 `S` 는 주행 키 그대로다', () => {
    // 이 하나가 이번 회차에서 가장 비싼 축이다. `S` 를 무조건 가로채면 편집 모드에서
    // **뒤로 걷기가 통째로 죽는다** — 2026-08-12 에 편집이 주행을 죽인 그 형태다.
    const h = makeHarness(VILLAGE_FIXTURE);
    pressTab();
    expect(h.doc, '하네스 확인용').toBeTruthy();
    expect(pressKey('KeyS', 's'), '★ 안 골랐는데 편집이 S 를 먹었다 — 뒤로 걷기가 죽는다').toBe(false);
    expect(pressKey('KeyG', 'g'), '★ 안 골랐는데 편집이 G 를 먹었다').toBe(false);
    expect(pressKey('KeyR', 'r'), '★ 안 골랐는데 편집이 R 을 먹었다').toBe(false);
  });

  it('고른 뒤에는 G·R·S 가 모달을 연다', () => {
    for (const [code, key] of [['KeyG', 'g'], ['KeyR', 'r'], ['KeyS', 's']] as const) {
      const h = modalReady();
      expect(pressKey(code, key), `★ ${key} 가 모달을 안 연다`).toBe(true);
      expect(h.doc.body.textContent, '★ 모달이 열렸는데 화면이 아무 말도 안 한다')
        .toMatch(/이동|회전|크기/);
      h.session.dispose();
    }
  });

  it('★ 모달 중에도 WASD 는 통과한다 — 조작하며 걸어다닐 수 있어야 한다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    expect(h.doc.getElementById('w2-edit'), '패널 확인용').toBeTruthy();
    for (const [code, key] of [['KeyW', 'w'], ['KeyA', 'a'], ['KeyD', 'd']] as const) {
      expect(pressKey(code, key), `★ 조작 중 ${key} 가 막혔다 — 주행이 죽는다`).toBe(false);
    }
  });

  it('★ 조합키는 안 가로챈다 — ⌘R·Ctrl+S 가 죽으면 브라우저가 망가진다', () => {
    const h = modalReady();
    expect(h.doc, '하네스 확인용').toBeTruthy();
    for (const mod of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      const ev = new KeyboardEvent('keydown', {
        code: 'KeyR', key: 'r', bubbles: true, cancelable: true, ...mod,
      });
      document.dispatchEvent(ev);
      expect(ev.defaultPrevented, `★ ${JSON.stringify(mod)} + R 을 편집이 먹었다`).toBe(false);
    }
  });

  it('★ 없어진 키를 화면이 광고하지 않는다 — R/F 크기는 S 모달로 갔다', () => {
    // hint 는 키 목록의 **두 번째 사본**이라(태스크 #44) 한쪽만 고치면 «화면이 광고하는
    // 키가 안 먹는다» 가 난다. 실제로 이 회차에 R/F 를 빼면서 그 어긋남이 났다.
    // ⚠ hint 는 **아무것도 안 골랐을 때**의 화면이다 — 마을을 고르면 그 자리를 「손본
    // 구역」 안내가 차지한다(`dom.ts` 의 `refresh`). 그것도 실제 화면이라 여기서 축을
    // 나눈다: 문구는 선택 없는 상태에서, 키가 실제로 죽었는지는 고른 상태에서 본다.
    const idle = makeHarness(VILLAGE_FIXTURE);
    pressTab();
    expect(hintText(idle), '★ hint 가 사라진 R/F 크기를 아직 광고한다').not.toContain('R/F');
    expect(hintText(idle), '★ hint 가 새 모달 키를 안 알려준다').toContain('G 이동');
    idle.session.dispose();

    const h = modalReady();
    expect(h.doc.getElementById('w2-edit'), '패널 확인용').toBeTruthy();
    expect(pressKey('KeyF', 'f'), '★ F 가 아직 먹는다 — hint 와 어긋난다').toBe(false);
  });
});

describe('블렌더식 모달 — 마우스가 따라온다 (행위)', () => {
  it('★ G 로 밀고 좌클릭하면 그 자리에 확정된다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    movePointer(600, 300); // +200px = +10m (MOVE_PER_PX = 0.05)
    clickAt(h);
    expect(h.frozen.size, '★ 확정했는데 저장되지 않았다').toBe(1);
    expect(frozenPart(h)?.x, '★ 마우스를 따라오지 않았다 — 모달이 배선되지 않았다')
      .toBeCloseTo(15, 6);
  });

  it('★ Enter 로도 확정된다 — 손을 마우스에서 안 떼는 사람이 있다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    movePointer(600, 300);
    expect(pressKey('Enter', 'Enter'), 'Enter 를 편집이 안 먹었다').toBe(true);
    expect(frozenPart(h)?.x).toBeCloseTo(15, 6);
  });

  it('★ Esc 는 **시작 자리로 되돌린다** — 그리고 동결도 안 남긴다', () => {
    // 취소가 값을 안 되돌리면 «되돌렸다고 생각한 것이 그대로 남는» 최악의 형태다.
    // 동결까지 남으면 그 구역이 밀도 슬라이더에서 영영 빠진다.
    const h = modalReady();
    pressKey('KeyG', 'g');
    movePointer(900, 300);
    expect(pressKey('Escape', 'Escape'), 'Escape 를 편집이 안 먹었다').toBe(true);
    expect(h.frozen.size, '★ 취소했는데 구역이 「손본 구역」이 됐다').toBe(0);
    // 값이 실제로 되돌아갔는지는 **다음 조작을 확정시켜** 본다 — 취소 자체는 저장을
    // 안 하므로 저장소만 봐서는 «되돌렸다» 와 «애초에 안 옮겼다» 가 구별되지 않는다.
    pressKey('KeyE');
    expect(frozenPart(h)?.x, '★ Esc 를 눌러도 옮긴 자리가 남았다').toBeCloseTo(5, 6);
  });

  it('★ 우클릭도 취소다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    movePointer(900, 300);
    h.canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 2, clientX: 900, clientY: 300, bubbles: true,
    }));
    expect(h.frozen.size, '★ 우클릭 취소가 동결을 남겼다').toBe(0);
    pressKey('KeyE');
    expect(frozenPart(h)?.x, '★ 우클릭으로 취소해도 옮긴 자리가 남았다').toBeCloseTo(5, 6);
  });

  it('★ 축을 고정하면 그 축으로만 간다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    expect(pressKey('KeyX', 'x'), 'X 를 편집이 안 먹었다').toBe(true);
    movePointer(600, 900); // 가로 +200px · 세로 +600px
    clickAt(h);
    const p = frozenPart(h)!;
    expect(p.x, '★ X 축 이동이 안 먹는다').toBeCloseTo(15, 6);
    expect(p.z, '★ X 로 고정했는데 z 가 움직였다').toBeCloseTo(3, 6);
  });

  it('★ 숫자를 치면 마우스를 무시하고 그 값이 된다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    pressKey('KeyX', 'x');
    pressKey('Digit7', '7');
    movePointer(9999, 9999); // 손이 떨려도 값이 안 흔들려야 한다
    pressKey('Enter', 'Enter');
    expect(frozenPart(h)?.x, '★ 7 을 쳤는데 마우스 이동량이 섞였다').toBeCloseTo(12, 6);
  });

  it('★ R 은 회전이다 — 도(°)로 친다', () => {
    const h = modalReady();
    pressKey('KeyR', 'r');
    pressKey('Digit9', '9');
    pressKey('Digit0', '0');
    pressKey('Enter', 'Enter');
    expect(frozenPart(h)?.ry, '★ 90 을 쳤는데 90° 가 아니다').toBeCloseTo(Math.PI / 2, 6);
  });

  it('★ S 는 크기이고 **비율을 유지한다** — 무너지면 건물이 정육면체가 된다', () => {
    const h = modalReady(SCALED_FIXTURE);
    pressKey('KeyS', 's');
    pressKey('Digit2', '2');
    pressKey('Enter', 'Enter');
    const p = frozenPart(h)!;
    expect(p.sx, '★ 2배를 쳤는데 안 커졌다').toBeCloseTo(8, 6);
    // 4 : 8 : 2 = 1 : 2 : 0.5 가 유지돼야 한다.
    expect(p.sy / p.sx, '★ 모달 크기 조작이 비율을 무너뜨렸다').toBeCloseTo(2, 6);
    expect(p.sz / p.sx).toBeCloseTo(0.5, 6);
  });

  it('★ 오버레이 항목도 같은 문으로 옮긴다 — 두 형태가 갈라지지 않는다', () => {
    const h = makeHarness();
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    pressTab();
    clickAt(h);
    movePointer(400, 300);
    pressKey('KeyG', 'g');
    pressKey('KeyX', 'x');
    pressKey('Digit4', '4');
    pressKey('Enter', 'Enter');
    expect(e.x, '★ GLB 는 모달로 안 움직인다 — 어댑터가 한쪽만 배선됐다').toBeCloseTo(4, 6);
  });

  it('★ 화면이 지금 무엇을 하는지 말한다 — 모달은 보이는 핸들이 없다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    movePointer(500, 300);
    expect(h.doc.body.textContent, '★ 조작 중인데 화면이 아무 말도 안 한다').toContain('이동');
    pressKey('KeyX', 'x');
    expect(h.doc.body.textContent, '★ 고정한 축이 화면에 안 보인다').toContain('이동 X');
    pressKey('Escape', 'Escape');
    expect(h.doc.body.textContent, '★ 끝났는데 조작 문구가 남아 있다 — 진행 중인지 알 수 없다')
      .not.toContain('이동 X:');
  });

  it('★ 선택이 바뀌면 진행 중 조작이 끝난다 — 새 대상이 옛 자리로 튀지 않는다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    movePointer(900, 300);
    outlinerItems(h)[0].click(); // tree #0 으로 갈아탄다
    movePointer(1200, 300);      // 모달이 살아 있으면 나무가 끌려간다
    pressKey('KeyE');            // 확정시켜 저장된 값을 본다
    expect(frozenPart(h, 'tree')?.x, '★ 새 대상이 옛 조작에 끌려갔다').toBeCloseTo(-9, 6);
  });

  it('모달 중에는 기즈모·드래그가 안 듣는다 — 두 조작이 겹치지 않는다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    // 기즈모 핸들 위를 지나가도 모달만 먹는다.
    if (h.gizmoHandle()) h.hits.push({ object: h.gizmoHandle() });
    movePointer(600, 300);
    clickAt(h);
    expect(frozenPart(h)?.x, '★ 모달 중 다른 조작이 끼어들었다').toBeCloseTo(15, 6);
  });
});
