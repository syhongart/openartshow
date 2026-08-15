// @vitest-environment jsdom
//
// 표면 재질 **패널** — 화면 조작이 계약의 문에 실제로 닿는가.
//
// 감독 지시 2026-08-14: *"타일링 배율로 촘촘히 힐것인지. 조절하고 각도 조절하고"* /
// *"심리스텍스처. 디퓨저맵. 노말맵. 하이라이트. 메탈릭. 러프니스 조절하게 하자"*
//
// ── 왜 별도 파일인가 ────────────────────────────────────────────────────────
// `world2-edit-listeners.test.ts` 가 이미 1896줄이고 **분해 대상**이다(검수관 비블로커,
// 태스크 #69). 거기에 더하면 그 문제를 키운다 — 새 축은 새 파일에 둔다.
//
// ── 이 파일이 지키는 것 ─────────────────────────────────────────────────────
// 「판정/집행 경계는 아무도 안 본다」가 이 저장소의 반복된 실패다. 여기서 그 경계는 둘이다:
//   ① 슬라이더를 움직이면 **`setSurfaces` 가 실제로 새 배열을 받는가**
//      (참조 동등성이 집행의 판정 축이라, 제자리 수정이면 화면이 안 따라온다)
//   ② 「반짝임」 노브가 계약의 **`roughness` 로 뒤집혀** 들어가는가
//      (화면 이름과 계약 필드가 다른 유일한 자리라, 여기만 어긋나면 순수 축에 안 걸린다)
//
// ── 이 파일이 **못** 재는 것 ────────────────────────────────────────────────
// jsdom 은 실제 렌더를 안 한다. 「슬라이더를 밀었을 때 화면이 어떻게 보이는가」·「드롭존이
// 눈에 띄는가」는 **감독 실기기가 유일한 판정**이고, 통과를 그 근거로 쓰지 않는다.

import { describe, it, expect, beforeEach } from 'vitest';
import { createSurfacePanel } from '../frontend/js/world2/edit/panel/surface.js';
import {
  MAP_SLOTS, SURFACE_KINDS, SURFACE_LABEL, defaultSetting, roughnessToGloss, settingOf,
  type SurfaceKind, type SurfaceSetting,
} from '../frontend/js/world2/decide/surface-material.js';

interface Said { msg: string; warn: boolean }

function mount(opts: {
  initial?: readonly SurfaceSetting[];
  noPreview?: boolean;
  /** 커밋된 텍스처 파일명 목록 */
  textures?: readonly string[];
  /** 목록 fetch 가 실패하는 경우 */
  listFails?: boolean;
} = {}) {
  let surfaces: readonly SurfaceSetting[] = opts.initial ?? [];
  /** `setSurfaces` 가 받은 배열들. **참조를 그대로 모은다** — 동등성을 재려면 그래야 한다 */
  const pushed: (readonly SurfaceSetting[])[] = [];
  const said: Said[] = [];
  const previewed: string[] = [];
  /** 목록 로드가 끝났는가 — 비동기라 기다릴 손잡이가 필요하다 */
  let listed: Promise<void> = Promise.resolve();

  const panel = createSurfacePanel({ doc: document } as never, {
    surfaces: () => surfaces,
    setSurfaces: (s) => { pushed.push(s); surfaces = s; },
    say: (msg, warn = false) => { said.push({ msg, warn }); },
    registerPreview: opts.noPreview ? undefined : (src: string, f: File) => {
      previewed.push(`${src}|${f.name}`);
    },
    listTextures: () => {
      const p = opts.listFails
        ? Promise.reject(new Error('네트워크'))
        : Promise.resolve(opts.textures ?? []);
      listed = p.then(() => undefined);
      return p;
    },
  });
  document.body.append(panel.root);

  const q = <T extends Element>(sel: string): T => {
    const e = panel.root.querySelector<T>(sel);
    if (!e) throw new Error(`못 찾음: ${sel}`);
    return e;
  };
  return {
    panel,
    pushed,
    said,
    previewed,
    // 패널이 목록을 «기다리지 않고» 붙이므로, 테스트는 그 다음 마이크로태스크까지 기다린다
    get listed() { return listed.then(() => new Promise<void>((r) => { setTimeout(r, 0); })); },
    get surfaces() { return surfaces; },
    root: panel.root,
    q,
    all: <T extends Element>(sel: string) => [...panel.root.querySelectorAll<T>(sel)],
    /** 표면 고르기 버튼 */
    pick(kind: SurfaceKind) {
      const b = [...panel.root.querySelectorAll('.surf-pick button')]
        .find((x) => x.textContent === SURFACE_LABEL[kind]) as HTMLButtonElement | undefined;
      if (!b) throw new Error(`표면 버튼 없음: ${kind}`);
      b.click();
    },
    /** 슬롯 칸 */
    slot(name: string) { return q<HTMLElement>(`.surf-slot[data-slot="${name}"]`); },
    /** 슬라이더 — 라벨로 찾는다(순서에 안 기댄다) */
    range(label: string): HTMLInputElement {
      const row = [...panel.root.querySelectorAll('.surf-row')]
        .find((r) => r.querySelector('.lbl')?.textContent === label);
      if (!row) throw new Error(`슬라이더 행 없음: ${label}`);
      return row.querySelector('input[type="range"]') as HTMLInputElement;
    },
    setRange(label: string, v: number) {
      const input = this.range(label);
      input.value = String(v);
      input.dispatchEvent(new Event('input'));
    },
  };
}

/** jsdom 에는 `DragEvent` 가 없다 — 파일 목록만 실은 최소 대역을 만든다 */
function fileDrop(el: HTMLElement, name: string, type = 'drop'): void {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const file = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(ev, 'dataTransfer', { value: { files: [file] } });
  el.dispatchEvent(ev);
}

const FIRST = SURFACE_KINDS[0] as SurfaceKind;

beforeEach(() => { document.body.textContent = ''; });

// ── 표면 고르기 ────────────────────────────────────────────────────────────

describe('표면 고르기', () => {
  it('칠할 수 있는 표면이 전부 버튼으로 뜬다', () => {
    const h = mount();
    const labels = h.all('.surf-pick button').map((b) => b.textContent);
    expect(labels).toEqual(SURFACE_KINDS.map((k) => SURFACE_LABEL[k]));
  });

  it('★ 수면은 목록에 없다 — 칠하면 일렁임이 멈추기 때문이다', () => {
    const h = mount();
    expect(h.all('.surf-pick button').map((b) => b.textContent)).not.toContain('수면');
  });

  it('첫 표면이 처음부터 골라져 있다 — 아무것도 못 하는 화면을 만들지 않는다', () => {
    const h = mount();
    const on = h.all<HTMLButtonElement>('.surf-pick button').filter((b) => b.dataset.on === '1');
    expect(on).toHaveLength(1);
    expect(on[0].textContent).toBe(SURFACE_LABEL[FIRST]);
  });

  it('고른 표면의 값이 화면에 뜬다 — 표면을 바꾸면 화면도 바뀐다', () => {
    const [k1, k2] = SURFACE_KINDS as readonly SurfaceKind[];
    const h = mount({
      initial: [
        { ...defaultSetting(k1), repeat: 4 },
        { ...defaultSetting(k2), repeat: 16 },
      ],
    });
    expect(h.range('배율').value).toBe('4');
    h.pick(k2);
    expect(h.range('배율').value).toBe('16');
  });
});

// ── 값 조절 ────────────────────────────────────────────────────────────────

describe('값 조절', () => {
  it('★ 배율을 밀면 setSurfaces 가 **새 배열**을 받는다 (판정/집행 경계 ①)', () => {
    const h = mount();
    const before = h.surfaces;
    h.setRange('배율', 8);
    expect(h.pushed).toHaveLength(1);
    expect(h.pushed[0], '★ 같은 배열을 다시 냈다 — 집행이 「안 바뀌었다」로 읽는다')
      .not.toBe(before);
    expect(settingOf(h.pushed[0], FIRST).repeat).toBe(8);
  });

  it('★ 「반짝임」이 계약의 roughness 로 뒤집혀 들어간다 (판정/집행 경계 ②)', () => {
    const h = mount();
    h.setRange('반짝임', 0.75);
    const s = settingOf(h.surfaces, FIRST);
    expect(s.roughness, '★ 반짝임을 roughness 에 그대로 넣었다').toBeCloseTo(0.25, 10);
    // 화면으로 되읽었을 때 민 값 그대로여야 한다 — 왕복이 안 맞으면 슬라이더가 튄다
    expect(roughnessToGloss(s.roughness)).toBeCloseTo(0.75, 10);
    expect(h.range('반짝임').value).toBe('0.75');
  });

  it('「거칠기」 노브는 화면에 없다 — 같은 값의 양면을 둘 다 내면 거짓 UI 다', () => {
    const h = mount();
    const labels = h.all('.surf-row .lbl').map((e) => e.textContent);
    expect(labels).toContain('반짝임');
    expect(labels).not.toContain('거칠기');
  });

  it('메탈릭이 그대로 들어간다', () => {
    const h = mount();
    h.setRange('메탈릭', 0.6);
    expect(settingOf(h.surfaces, FIRST).metalness).toBeCloseTo(0.6, 10);
  });

  it('★ 각도는 버튼 넷이다 — 연속 노브면 「중간값이 있는 척」 하는 거짓 UI 가 된다', () => {
    const h = mount();
    const rot = h.all('.surf-row').find((r) => r.querySelector('.lbl')?.textContent === '각도')!;
    expect(rot.querySelector('input[type="range"]'), '★ 각도가 슬라이더다').toBeNull();
    expect([...rot.querySelectorAll('button')].map((b) => b.textContent))
      .toEqual(['0°', '90°', '180°', '270°']);
  });

  it('각도 버튼이 turns 0~3 으로 간다 — 라디안이 아니다', () => {
    const h = mount();
    const rot = h.all('.surf-row').find((r) => r.querySelector('.lbl')?.textContent === '각도')!;
    const btns = [...rot.querySelectorAll('button')] as HTMLButtonElement[];
    btns[2].click(); // 180°
    expect(settingOf(h.surfaces, FIRST).turns).toBe(2);
    expect(btns[2].dataset.on).toBe('1');
    expect(btns[0].dataset.on).toBe('');
  });

  it('표면마다 값이 따로 간다 — 하나를 만져도 다른 표면이 안 움직인다', () => {
    const [k1, k2] = SURFACE_KINDS as readonly SurfaceKind[];
    const h = mount();
    h.setRange('배율', 8);
    h.pick(k2);
    h.setRange('배율', 32);
    expect(settingOf(h.surfaces, k1).repeat).toBe(8);
    expect(settingOf(h.surfaces, k2).repeat).toBe(32);
  });
});

// ── 맵 슬롯 드롭 ───────────────────────────────────────────────────────────

describe('맵 슬롯', () => {
  it('슬롯 넷이 전부 있다 — 계약의 목록에서 유도된다', () => {
    const h = mount();
    expect(h.all<HTMLElement>('.surf-slot').map((e) => e.dataset.slot)).toEqual([...MAP_SLOTS]);
  });

  it('★ 떨어뜨리면 그 슬롯에 src 가 들어간다 — 어디에 놓았는가가 곧 어디에 바르는가다', () => {
    const h = mount();
    fileDrop(h.slot('normalMap'), 'rock.png');
    const s = settingOf(h.surfaces, FIRST);
    expect(s.normalMap).toBe('assets/textures/rock.png');
    expect(s.map, '★ 엉뚱한 슬롯에 들어갔다').toBeUndefined();
  });

  it('★ 문서 전역 드롭(GLB)까지 안 새어나간다 — 새면 이미지가 모델로 취급된다', () => {
    const h = mount();
    let leaked = 0;
    document.addEventListener('drop', () => { leaked++; });
    fileDrop(h.slot('map'), 'a.png');
    expect(leaked, '★ 슬롯 드롭이 문서까지 올라갔다').toBe(0);
    document.removeEventListener('drop', () => { leaked++; });
  });

  it('dragover 가 기본 동작을 막는다 — 안 막으면 브라우저가 파일을 새 탭으로 연다', () => {
    const h = mount();
    const box = h.slot('map');
    const ev = new Event('dragover', { bubbles: true, cancelable: true });
    box.dispatchEvent(ev);
    expect(ev.defaultPrevented, '★ 편집 화면이 통째로 사라진다').toBe(true);
    expect(box.dataset.over, '★ 어느 칸에 놓는지 화면이 말하지 않는다').toBe('1');
  });

  it('끌던 것이 벗어나면 강조가 풀린다', () => {
    const h = mount();
    const box = h.slot('map');
    box.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    box.dispatchEvent(new Event('dragleave', { bubbles: true }));
    expect(box.dataset.over).toBeUndefined();
  });

  it('★ 쓸 수 없는 이름은 거절하고 **왜인지 말한다** — 몰래 고쳐 주지 않는다', () => {
    const h = mount();
    fileDrop(h.slot('map'), '한글이름.png');
    expect(settingOf(h.surfaces, FIRST).map, '★ 위험한 이름이 저장됐다').toBeUndefined();
    expect(h.said.at(-1)?.warn, '★ 조용히 무시했다').toBe(true);
    expect(h.said.at(-1)?.msg).toContain('한글이름.png');
  });

  it('확장자가 모델이면 거절한다 — 슬롯이 GLB 를 받지 않는다', () => {
    const h = mount();
    fileDrop(h.slot('map'), 'house.glb');
    expect(settingOf(h.surfaces, FIRST).map).toBeUndefined();
    expect(h.said.at(-1)?.warn).toBe(true);
  });

  it('× 를 누르면 그 슬롯만 걷힌다', () => {
    const h = mount();
    fileDrop(h.slot('map'), 'a.png');
    fileDrop(h.slot('normalMap'), 'b.png');
    (h.slot('map').querySelector('button') as HTMLButtonElement).click();
    const s = settingOf(h.surfaces, FIRST);
    expect(s.map).toBeUndefined();
    expect(s.normalMap, '★ 옆 슬롯까지 걷혔다').toBe('assets/textures/b.png');
  });

  it('채워진 슬롯이 화면에 표시된다', () => {
    const h = mount();
    const box = h.slot('map');
    expect(box.dataset.on).toBe('');
    fileDrop(box, 'grass.png');
    expect(box.dataset.on).toBe('1');
    // 파일 이름은 `select` 가 말한다 — `.sname` 은 「아직 커밋 안 됐다」 만 말한다.
    expect((box.querySelector('select') as HTMLSelectElement).value)
      .toBe('assets/textures/grass.png');
    expect(box.querySelector('.sname')?.textContent).toBe('커밋 대기');
  });

  it('★ 드롭한 것이 고르기 목록에도 들어간다 — 없으면 화면이 「비어 있음」으로 되돌아간다', () => {
    const h = mount();
    fileDrop(h.slot('map'), 'grass.png');
    const opts = [...h.slot('map').querySelectorAll('option')].map((o) => o.value);
    expect(opts).toContain('assets/textures/grass.png');
  });

  it('★ 목록에서 고르면 그 슬롯에 들어간다 — 커밋된 텍스처를 쓰는 경로다', async () => {
    const h = mount({ textures: ['stone-tile.png', 'brick.png'] });
    await h.listed;
    const sel = h.slot('map').querySelector('select') as HTMLSelectElement;
    expect([...sel.querySelectorAll('option')].map((o) => o.value))
      .toEqual(['', 'assets/textures/brick.png', 'assets/textures/stone-tile.png']);
    sel.value = 'assets/textures/brick.png';
    sel.dispatchEvent(new Event('change'));
    expect(settingOf(h.surfaces, FIRST).map).toBe('assets/textures/brick.png');
  });

  it('「없음」을 고르면 걷힌다', async () => {
    const h = mount({ textures: ['brick.png'] });
    await h.listed;
    const sel = h.slot('map').querySelector('select') as HTMLSelectElement;
    sel.value = 'assets/textures/brick.png';
    sel.dispatchEvent(new Event('change'));
    sel.value = '';
    sel.dispatchEvent(new Event('change'));
    expect(settingOf(h.surfaces, FIRST).map).toBeUndefined();
  });

  it('목록을 못 받아도 드롭은 그대로 된다 — 파일 0장이 정상 상태다', async () => {
    const h = mount({ listFails: true });
    await h.listed.catch(() => {});
    fileDrop(h.slot('map'), 'a.png');
    expect(settingOf(h.surfaces, FIRST).map).toBe('assets/textures/a.png');
    // 조용해야 한다 — 정상 상태를 오류로 말하지 않는다
    expect(h.said.filter((x) => x.warn)).toHaveLength(0);
  });

  it('미리보기 문이 없어도 저장은 된다 — 없으면 커밋해야 그림이 뜬다', () => {
    const h = mount({ noPreview: true });
    fileDrop(h.slot('map'), 'a.png');
    expect(settingOf(h.surfaces, FIRST).map).toBe('assets/textures/a.png');
  });

  it('미리보기 문이 있으면 src 와 파일을 함께 넘긴다', () => {
    const h = mount();
    fileDrop(h.slot('map'), 'a.png');
    // **`src` 와 파일을 함께** 넘긴다 — 조립부가 그 자리를 blob 으로 대신해야 하므로
    // 파일만으로는 «어느 자리인가» 를 모른다.
    expect(h.previewed).toEqual(['assets/textures/a.png|a.png']);
  });
});

// ── 커밋 대기 안내 ─────────────────────────────────────────────────────────

describe('커밋 대기', () => {
  it('★ 드롭한 파일이 아직 저장소에 없다고 말한다 — 안 적으면 「왜 그림이 안 뜨지」가 된다', () => {
    const h = mount();
    fileDrop(h.slot('map'), 'grass.png');
    const note = h.q<HTMLElement>('.note');
    expect(note.textContent).toContain('커밋 대기');
    expect(note.textContent).toContain('grass.png');
  });

  it('걷어내면 안내도 사라진다 — 이미 없는 파일을 커밋하라고 하지 않는다', () => {
    const h = mount();
    fileDrop(h.slot('map'), 'grass.png');
    (h.slot('map').querySelector('button') as HTMLButtonElement).click();
    expect(h.q<HTMLElement>('.note').textContent).toBe('');
  });
});

// ── 바깥 변경 반영 ─────────────────────────────────────────────────────────

describe('sync', () => {
  it('바깥에서 설정이 바뀌면 화면이 따라온다 — 부팅 로드·되돌리기 경로다', () => {
    let surfaces: readonly SurfaceSetting[] = [];
    const panel = createSurfacePanel({ doc: document } as never, {
      surfaces: () => surfaces,
      setSurfaces: (s) => { surfaces = s; },
      say: () => {},
    });
    document.body.append(panel.root);
    const rep = () => (panel.root.querySelector('input[type="range"]') as HTMLInputElement).value;
    expect(rep()).toBe('1');
    surfaces = [{ ...defaultSetting(FIRST), repeat: 24 }];
    panel.sync();
    expect(rep()).toBe('24');
  });
});
