// @vitest-environment jsdom
//
// **끌어다 놓기가 실제로 등급을 본다** (W8-3 S7).
//
// ── 왜 실행 검사인가 ───────────────────────────────────────────────────────
// `decide/upload-plan.ts` 의 판정은 순수라 이미 실제로 돌린다(`world2-upload-plan.test.ts`).
// 하지만 **그 판정이 드롭 경로에 꽂혔는가**는 그 파일이 못 본다 — 이 저장소가 이름 붙인
// *"계산된 값이 실제로 소비되는가"* 다. `startEditMode` 를 실제로 띄우고 **파일을 떨군다.**
//
// ── 세 갈래가 서로 다른 지점에서 멈춘다 ────────────────────────────────────
// ① 등급 부족 → 「특별 프리미엄」 문구에서 멈춘다
// ② 등급은 되는데 이름이 계약 위반 → 「쓸 수 없는 이름」에서 멈춘다
// ③ 둘 다 통과 → **그 두 문구가 안 뜬다**(그 뒤는 피커 소관이고 이 축이 아니다)
//
// 셋이 같은 문구로 뭉개지면 무료 사용자가 파일 이름만 고치다 끝난다.

import { describe, it, expect, afterEach } from 'vitest';
import { startEditMode } from '../frontend/js/world2/edit/mode.js';
import type { EditSession, OverlayHost } from '../frontend/js/world2/edit/types.js';
import { makeThreeStub } from './helpers/three-stub.js';

let current: EditSession | null = null;
afterEach(() => { current?.dispose(); current = null; document.body.innerHTML = ''; });

/** jsdom 에는 `createObjectURL` 이 없다. 드롭이 미리보기 주소를 만드는 자리에서 쓴다 */
function stubObjectUrl(): void {
  const U = globalThis.URL as unknown as Record<string, unknown>;
  if (typeof U.createObjectURL !== 'function') {
    let n = 0;
    U.createObjectURL = () => `blob:stub/${++n}`;
    U.revokeObjectURL = () => { };
  }
}

/** 드롭 경로에 필요한 **최소한**. 판정이 거부하면 피커까지 가지도 않는다 */
function boot(
  canUploadGlb: boolean | undefined,
  items: readonly { src: string }[] = [],
): { doc: Document; placed: string[] } {
  stubObjectUrl();
  const doc = document;
  const canvas = doc.createElement('canvas');
  // jsdom 은 레이아웃이 없어 `getBoundingClientRect` 가 0×0 이고, 그러면 `ndcOf` 가
  // `null` 을 내 **드롭이 판정 직후 조용히 끝난다.** 크기를 줘야 뒷경로가 실제로 돈다.
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    toJSON() { return {}; },
  }) as DOMRect;
  doc.body.appendChild(canvas);
  const placed: string[] = [];
  const root = {
    children: [] as unknown[],
    add(o: unknown) { this.children.push(o); },
    remove(o: unknown) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); },
  };
  const host: OverlayHost = {
    THREE: makeThreeStub({ hits: () => [] }),
    camera: {} as never,
    canvas,
    doc,
    cellX: 40,
    cellZ: 40,
    root: root as never,
    entries: () => [],
    place: async (src: string) => { placed.push(src); return null; },
    lastFailure: () => null,
    remove() { },
    apply() { },
    toRaw: () => ({ version: 2, items: items.map((i) => ({ ...i, x: 0, y: 0, z: 0 })), parcels: [] }),
    look() { },
    instances: null,
    village: null,
    surfaceAt: () => 0,
  };
  const session = startEditMode(host, {
    modelsUrl: 'about:blank',
    onBlobUrl() { },
    // `undefined` 를 넘기면 **실제 등급을 본다**(「생략 = 기존 동작」). 저장소가 비어
    // 있으므로 무료로 떨어진다 — fail-closed 를 이 경로로 확인한다.
    ...(canUploadGlb === undefined ? {} : { canUploadGlb }),
  });
  current = session;
  // 편집 모드를 켠다 — `Tab` 이 그 문이고, 드롭 리스너는 `bind()` 안에서만 붙는다
  // (`EditSession` 에는 모드 전환이 노출돼 있지 않다).
  doc.dispatchEvent(new doc.defaultView!.KeyboardEvent('keydown', { code: 'Tab' }));
  return { doc, placed };
}

/** 파일을 떨군다. jsdom 은 `DataTransfer` 를 안 주므로 필요한 모양만 얹는다 */
function drop(doc: Document, name: string): void {
  const ev = new doc.defaultView!.Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', {
    value: { files: [new doc.defaultView!.File([], name)] },
  });
  // 피커가 화면 좌표를 본다 — 없으면 NDC 가 성립하지 않아 뒷경로가 안 돈다.
  Object.defineProperty(ev, 'clientX', { value: 400 });
  Object.defineProperty(ev, 'clientY', { value: 300 });
  doc.dispatchEvent(ev);
}

/** 「JSON 내보내기」 버튼. 패널이 만든 실제 버튼을 누른다 */
function exportClick(doc: Document): void {
  const btn = [...doc.querySelectorAll('#w2-edit button')]
    .find((b) => b.textContent === 'JSON 내보내기') as HTMLButtonElement | undefined;
  if (!btn) throw new Error('내보내기 버튼을 못 찾았다 — 패널 구조가 바뀌었다');
  btn.click();
}

const said = (doc: Document) => doc.body.textContent ?? '';

describe('★ 드롭이 등급을 본다', () => {
  it('★ 등급이 안 되면 거부하고 **어디서 열리는지** 말한다', () => {
    const { doc, placed } = boot(false);
    drop(doc, 'house.glb');
    expect(said(doc), '★ 등급 사유가 화면에 안 뜬다').toContain('특별 프리미엄');
    expect(placed, '★ 등급이 안 되는데 배치가 일어났다').toEqual([]);
  });

  it('★ 등급을 안 넘기면 **실제 등급**을 본다 — 저장소가 비면 무료다(fail-closed)', () => {
    const { doc, placed } = boot(undefined);
    drop(doc, 'house.glb');
    expect(said(doc), '★ 「모른다」가 「된다」로 샜다').toContain('특별 프리미엄');
    expect(placed).toEqual([]);
  });

  it('★ 등급은 되는데 이름이 계약 위반이면 **다른 사유**다', () => {
    const { doc, placed } = boot(true);
    drop(doc, '한글이름.glb');
    expect(said(doc), '★ 이름 사유가 등급 사유로 뭉개졌다').not.toContain('특별 프리미엄');
    expect(said(doc)).toContain('쓸 수 없는 이름');
    expect(placed).toEqual([]);
  });

  it('★ 둘 다 통과하면 그 두 문구가 안 뜬다 — 특별 프리미엄이 실제로 열린다', () => {
    const { doc } = boot(true);
    drop(doc, 'house.glb');
    const msg = said(doc);
    expect(msg, '★ 특별 프리미엄인데 등급에서 막혔다').not.toContain('특별 프리미엄');
    expect(msg, '★ 계약이 받는 이름인데 이름에서 막혔다').not.toContain('쓸 수 없는 이름');
  });

  it('파일이 없는 드롭은 조용히 지나간다 — 텍스트를 끌어다 놓는 일이 흔하다', () => {
    const { doc, placed } = boot(true);
    const ev = new doc.defaultView!.Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', { value: { files: [] } });
    doc.dispatchEvent(ev);
    expect(placed).toEqual([]);
  });
});

describe('★ 내보내기가 「보낼 준비가 됐다」고 말한다', () => {
  it('★ 드롭한 GLB 를 가리키면 **아직 라이브가 아니라고** 말한다', () => {
    // 이 배치는 계약상 **완벽히 유효하다** — 그래서 관문(`reviewOverlay`)은 깨끗하다고
    // 판정하고, 이 줄이 없으면 화면이 «저장했습니다» 로 끝난다.
    const { doc } = boot(true, [{ src: 'assets/models/house.glb' }]);
    drop(doc, 'house.glb');
    exportClick(doc);
    const msg = said(doc);
    expect(msg, '★ 저장 자체가 안 됐다').toContain('저장했습니다');
    expect(msg, '★ 🔴 저장소에 없는 GLB 를 가리키는데 조용히 통과했다')
      .toContain('아직 라이브가 아닙니다');
    expect(msg, '★ 무엇을 보내야 하는지 안 말한다').toContain('house.glb');
  });

  it('★ 커밋된 자산만 쓰면 아무 말도 안 붙는다 — 할 일이 없으면 침묵이다', () => {
    const { doc } = boot(true, [{ src: 'assets/models/committed.glb' }]);
    exportClick(doc);
    const msg = said(doc);
    expect(msg).toContain('저장했습니다');
    expect(msg, '★ 보낼 것이 없는데 경고가 떴다').not.toContain('아직 라이브가 아닙니다');
  });
});
