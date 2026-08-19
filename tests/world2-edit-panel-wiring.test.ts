// @vitest-environment jsdom
//
// **편집 패널의 DOM·배선** — 작품 칸(W8-11)과 카테고리 탭(2026-08-19).
//
// ── 🔴 왜 생겼나 — 검수관 반려 B4 (2026-08-19) ─────────────────────────────
// W8-11 이 만든 UI·배선 계층의 검출력이 **0** 이었다. 검수관이 전체 스위트(3947건)
// 기준으로 다섯 뮤테이션을 심었고 **전부 0 failed** 였다:
//
//   V1  아웃라이너 작품 칸 배선을 `undefined` 로            0 failed
//   V2  크기 슬라이더를 **항상** 표시(거짓 슬라이더)         0 failed
//   V3  `edit/mode.ts` 의 `pickArt` 배선 제거               0 failed
//   V4  아웃라이너 라벨에서 크기 제거(서명이 변경을 못 봄)    0 failed
//   V5  인스펙터 `change` 의 `commit()` 제거                0 failed
//
// **V5 가 가장 무겁다** — 감독이 슬라이더에서 손을 떼도 값이 저장에 안 실리는데 어느
// 검사도 안 깨진다. 그런데 `world2-art-edit.test.ts` 헤더의 「못 재는 것」 표는 그 사각을
// *「슬라이더 손맛」* 으로만 적어 **원리적 한계처럼** 보이게 했다. 실제로는 이 저장소에
// jsdom 으로 패널을 만들어 검사하는 관행이 **이미 셋** 있다(`world2-photo-button` ·
// `world2-aim` · `world2-shading`) — 즉 **「못 잰 것」이 아니라 「안 잰 것」**이었고,
// 그 구분이 표에서 지워진 것이 이 저장소가 이름 붙인 「못 잰 것이 통과로 적히는 경향」이다.
//
// 직전 회차(W8-9)에도 검수관이 같은 형태를 잡았다(신설한 판정을 항상 참으로 해도
// 0 failed). **한 회차 만의 재발**이라 축을 파일로 만들어 되돌아오지 못하게 한다.
//
// ── 이 파일을 만든 뒤 같은 다섯을 다시 심었다 (실측, 이 파일만 실행) ────────
//   V1  아웃라이너 작품 칸 배선을 `undefined` 로            0 → **2 failed**
//   V2  크기 슬라이더를 항상 표시                          0 → **1 failed**
//   V3  `edit/mode.ts` 의 `artList`/`pickArt` 블록 제거      0 → **2 failed**
//   V4  아웃라이너 라벨에서 크기 제거                       0 → **1 failed**
//   V5  인스펙터 `change` 의 `commit()` 제거                0 → **1 failed**
//
// ⚠ **V1 은 첫 판본에서도 0 failed 였다.** 그때 검사가 `createOutliner` 를 **직접**
// 부르며 문을 넘겨서, 조립(`panel/dom.ts`)이 실제로 넘기는지를 안 봤기 때문이다 —
// 「부품이 동작한다」와 「조립이 그 부품을 물린다」는 다른 일이고, 이 저장소가
// **「판정/집행 경계는 아무도 안 본다」**로 이름 붙인 바로 그 자리다. 패널 경유로
// 고쳐서야 2 failed 가 됐다. 새 검사를 쓸 때 **뮤테이션을 안 돌렸으면 이 구멍이
// 그대로 남았을 것**이다.
//
// ── 이 파일이 **못** 재는 것 (통과를 그 근거로 쓰지 않는다) ─────────────────
// · **픽셀 레이아웃** — jsdom 은 CSS 를 계산하지 않는다. 「탭 넷이 한 줄에 들어가는가」·
//   「폭 212px 을 안 넘치는가」는 여기서 **구조적으로 못 잰다**(실제 브라우저에서 쟀다:
//   탭 y좌표 4개 동일·각 46px). 그래서 아래는 **어느 칸이 보이는가**만 본다.
// · **손맛** — 슬라이더 스텝·범위가 손에 맞는지는 감독 체감이다.
// · **미디어 쿼리** — 아웃라이너는 좁은 화면에서 CSS 로만 숨는다. JS 는 폭을 모른다.
// · **WebGPU·실기기**.
//
// ⚠ jsdom 의 `input[type=range]` 는 `value` 를 min/max 로 **클램프한다.** 그래서 아래
// 하네스는 **min/max 를 먼저 세팅한 뒤** value 를 넣는다(`sync` 가 그 순서를 지킨다).
// 순서를 뒤집으면 값이 조용히 튀고 검사가 엉뚱한 것을 재게 된다.

import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach } from 'vitest';
import { createPanel, type PanelHandlers } from '../frontend/js/world2/edit/panel/dom.js';
import { createOutliner } from '../frontend/js/world2/edit/panel/outliner.js';
import { createEditState, select } from '../frontend/js/world2/edit/state.js';
import { artTarget } from '../frontend/js/world2/edit/target.js';
import { createArtsPort } from '../frontend/js/world2/systems/art-port.js';
import { ART_W_MIN, ART_W_MAX, type ArtworkItem } from '../frontend/js/world2/decide/artwork.js';
import type { OverlayHost, OverlayEntry } from '../frontend/js/world2/edit/types.js';

const art = (over: Partial<ArtworkItem> = {}): ArtworkItem => ({
  src: 'assets/art/a.png', x: 1, y: 3, z: 2, ry: 0, w: 2.4, ar: 1.5, ...over,
});

function fakeHost(): OverlayHost {
  return {
    doc: document,
    cellX: 32,
    cellZ: 32,
    entries: () => [],
    apply() {},
    remove() {},
    surfaceAt: () => 0,
  } as unknown as OverlayHost;
}

function mount(opts: { arts?: readonly ArtworkItem[]; withArtDoor?: boolean } = {}) {
  const host = fakeHost();
  const st = createEditState();
  const port = createArtsPort((s) => s);
  void port.set(opts.arts ?? [art()]);
  const noop = () => {};

  const handlers = {
    toggleEditing: noop,
    duplicate: noop,
    removeSelected: noop,
    thawSelected: noop,
    pickVillage: noop,
    setView: noop,
    setShading: noop,
    exportNow: noop,
    // **문을 줄지 말지가 이 하네스의 축 하나다** — 안 주면 칸 자체가 없어야 한다.
    artList: opts.withArtDoor === false ? undefined : () => port.list(),
    pickArt: opts.withArtDoor === false ? undefined : (i: number) => {
      select(st, host, { art: { index: i, target: artTarget(port, i) } });
      panel.onPicked();
    },
  } as unknown as PanelHandlers;

  const panel = createPanel(host, st, handlers, noop);
  return { panel, st, host, port, handlers };
}

/** 패널 안의 탭 버튼 하나 */
const tabBtn = (label: string): HTMLButtonElement | null =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('#w2-edit .tabbar button'))
    .find((b) => b.textContent?.includes(label)) ?? null;

const pane = (id: string): HTMLElement | null =>
  document.querySelector<HTMLElement>(`#w2-edit .pane[data-tab="${id}"]`);

/** 「지금 보이는가」 — CSS 를 못 쓰므로 `data-on` 과 `hidden` 으로 판정한다 */
const paneOn = (id: string): boolean => pane(id)?.dataset.on === '1';

const sizeRow = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('#w2-edit .size-row');
const sizeInput = (): HTMLInputElement | null =>
  document.querySelector<HTMLInputElement>('#w2-edit .size-row input[type="range"]');

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

// ── 카테고리 탭 (감독 지시 2026-08-19) ──────────────────────────────────────

describe('★ 카테고리 탭 — 「막 나열하니 정신없잖아」', () => {
  it('★ 탭이 넷이고 처음은 「놓기」다', () => {
    mount();
    const btns = document.querySelectorAll('#w2-edit .tabbar button');
    expect(btns.length).toBe(4);
    expect(paneOn('place')).toBe(true);
    expect(paneOn('props')).toBe(false);
  });

  it('🔴 한 번에 **한 칸만** 보인다 — 넷이 다 보이면 개편이 통째로 무의미하다', () => {
    mount();
    for (const [label, id] of [['속성', 'props'], ['표면', 'surface'], ['파일', 'file']] as const) {
      tabBtn(label)!.click();
      const on = ['place', 'props', 'surface', 'file'].filter(paneOn);
      expect(on, `★ ${label} 탭에서 보이는 칸이 하나가 아니다`).toEqual([id]);
    }
  });

  it('🔴 시점·셰이딩은 **탭 밖**이다 — 「공용기능」이 탭에 갇히면 안 된다', () => {
    mount();
    const body = document.querySelector('#w2-edit .body')!;
    // 탭 바보다 **앞**에 있어야 한다(어느 탭에서도 보인다).
    const bar = body.querySelector('.tabbar');
    expect(bar, '★ 탭 바가 없다').not.toBeNull();
    // 🔴 시점·셰이딩과 탭 바가 **같은 상자**에 있어야 함께 고정된다(검수관 권고 P-h).
    const toolbar = body.querySelector('.toolbar');
    expect(toolbar, '★ 상시 툴바 상자가 없다').not.toBeNull();
    expect(toolbar!.contains(bar!), '🔴 탭 바가 툴바 밖이다').toBe(true);
    const viewBtn = Array.from(toolbar!.querySelectorAll('button')).some((b) => b.textContent === '탑');
    expect(viewBtn, '🔴 시점 버튼이 상시 툴바에 없다 — 스크롤하면 사라진다').toBe(true);
    const kids = Array.from(body.children);
    const barAt = kids.findIndex((e) => e.classList.contains('toolbar'));
    const paneAt = kids.findIndex((e) => e.classList.contains('pane'));
    // 시점 버튼(탑)이 어느 pane 안에도 있으면 안 된다.
    for (const id of ['place', 'props', 'surface', 'file']) {
      const inside = Array.from(pane(id)!.querySelectorAll('button'))
        .some((b) => b.textContent === '탑' || b.textContent === '와이어');
      expect(inside, `★ 시점·셰이딩이 ${id} 탭 안에 있다`).toBe(false);
    }
    expect(barAt).toBeLessThan(paneAt);
  });

  it('🔴 골랐으면 **속성 탭으로** 옮긴다 — 안 옮기면 「골랐는데 아무것도 안 뜬다」', () => {
    const { panel, st, host, port } = mount();
    expect(paneOn('place')).toBe(true);
    select(st, host, { art: { index: 0, target: artTarget(port, 0) } });
    panel.onPicked();
    expect(paneOn('props'), '🔴 골랐는데 놓기 탭에 남았다').toBe(true);
  });

  it('★ 선택을 **푸는** 것은 탭을 안 옮긴다 — 하던 일을 잃지 않는다', () => {
    const { panel, st, host } = mount();
    tabBtn('표면')!.click();
    select(st, host, null);
    panel.onPicked();
    expect(paneOn('surface'), '★ 선택 해제가 탭을 끌고 갔다').toBe(true);
  });

  it('🔴 MB·MC — 「지금 볼 게 없다」를 탭 라벨이 **미리** 알린다', () => {
    // 검수관이 `tabHasContent` 를 항상 true 로 · `tabs.sync(has)` 를 제거하는 뮤테이션을
    // 각각 심었고 **둘 다 0 failed** 였다. 판정(`decide/edit-tabs.ts`)과 배선(`refresh`)이
    // 둘 다 무검사였다는 뜻이다 — 신설한 판정에 검출력이 안 붙는 그 형태의 재발이다.
    const { panel, st, host, port } = mount();
    panel.refresh();
    const propsTab = tabBtn('속성')!;
    expect(propsTab.dataset.empty, '🔴 아무것도 안 골랐는데 「볼 게 있다」고 한다').toBe('1');
    // 다른 탭은 선택과 무관하게 늘 내용이 있다.
    expect(tabBtn('놓기')!.dataset.empty).toBe('0');
    expect(tabBtn('표면')!.dataset.empty).toBe('0');

    select(st, host, { art: { index: 0, target: artTarget(port, 0) } });
    panel.refresh();
    expect(propsTab.dataset.empty, '🔴 골랐는데 여전히 「볼 게 없다」고 한다').toBe('0');
  });

  it('★ 아무것도 안 골랐으면 속성 탭이 **이유를 말한다** — 빈 칸으로 두지 않는다', () => {
    const { panel } = mount();
    panel.refresh();
    const notes = Array.from(pane('props')!.querySelectorAll('.note'))
      .filter((e) => !(e as HTMLElement).hidden);
    expect(notes.length, '★ 빈 속성 탭에 안내가 없다').toBeGreaterThan(0);
    expect(notes[0].textContent).toContain('클릭해 고르면');
  });
});

// ── 🔴 컨트롤↔탭 대응 (검수관 재검수 명세 G5 / 뮤테이션 MD) ────────────────
//
// 검수관이 「내보내기」를 `file` → `place` 탭으로 옮기는 뮤테이션을 심었더니 **0 failed**
// 였다. 즉 **감독 지시(*"막 나열하니 정신없잖아"*)의 산출물 전체 — 무엇이 어느 탭에
// 있는가 — 가 통째로 무검사**였다. `decide/edit-tabs.ts` 는 「탭을 넷으로 가른 기준」을
// 길게 소유하는데 조립이 그 표를 따르는지는 아무도 안 봤다.
//
// ⚠ **라벨이 아니라 「그 칸에 무엇이 들어 있나」로 짚는다.** 라벨은 사람이 읽는 것이고
// 언제든 바뀐다(이 저장소의 팔레트 강조가 같은 이유로 `data-*` 를 쓴다). 다만 버튼은
// 지금 식별자가 없어 글자로 찾을 수밖에 없다 — 그 한계를 적어 둔다.

describe('★ 무엇이 어느 탭에 있는가 — 개편의 산출물 그 자체', () => {
  const inPane = (id: string, label: string): boolean =>
    Array.from(pane(id)!.querySelectorAll('button')).some((b) => b.textContent === label);

  it('🔴 MD — 「JSON 내보내기」는 **파일** 탭이다', () => {
    mount();
    expect(inPane('file', 'JSON 내보내기'), '🔴 내보내기가 파일 탭에 없다').toBe(true);
    for (const id of ['place', 'props', 'surface']) {
      expect(inPane(id, 'JSON 내보내기'), `🔴 내보내기가 ${id} 탭에도 있다`).toBe(false);
    }
  });

  it('🔴 조작 버튼(회전·크기·높이·삭제)은 **속성** 탭이다', () => {
    mount();
    for (const label of ['↺ 회전', '− 크기', '− 높이', '삭제']) {
      expect(inPane('props', label), `🔴 「${label}」 가 속성 탭에 없다`).toBe(true);
      expect(inPane('place', label), `🔴 「${label}」 가 놓기 탭에도 있다`).toBe(false);
    }
  });

  it('🔴 팔레트는 **놓기** 탭이다 — 「아직 없는 것을 만든다」', () => {
    mount();
    expect(pane('place')!.querySelector('.pal'), '🔴 팔레트가 놓기 탭에 없다').not.toBeNull();
    for (const id of ['props', 'surface', 'file']) {
      expect(pane(id)!.querySelector('.pal'), `🔴 팔레트가 ${id} 탭에도 있다`).toBeNull();
    }
  });

  it('🔴 크기 슬라이더는 **속성** 탭이다 — 고른 것 하나를 만지는 값이다', () => {
    mount();
    expect(pane('props')!.querySelector('.size-row'), '🔴 크기 슬라이더가 속성 탭에 없다').not.toBeNull();
  });
});

// ── 작품 칸 배선 (검수관 V1·V3·V4) ──────────────────────────────────────────

describe('★ 아웃라이너 작품 칸 — 배선이 실제로 이어지는가', () => {
  function outliner(withDoor: boolean, port: ReturnType<typeof createArtsPort>, onPick: (i: number) => void) {
    const host = fakeHost();
    const st = createEditState();
    return createOutliner(host, st, () => {},
      withDoor ? { list: () => port.list(), pick: onPick } : undefined);
  }

  it('🔴 V1 — **패널이** 아웃라이너에 문을 넘긴다', () => {
    // ⚠ 첫 판본은 `createOutliner` 를 **직접** 부르며 문을 넘겨서, `dom.ts` 가 실제로
    // 넘기는지를 안 봤다 — 검수관이 심은 V1(배선을 `undefined` 로)에 **0 failed** 였다.
    // 「부품이 동작한다」와 「조립이 그 부품을 물린다」는 다른 일이고, 이 저장소가
    // 「판정/집행 경계는 아무도 안 본다」로 이름 붙인 그 자리다. 패널 경유로 재는다.
    const { panel } = mount({ arts: [art({ src: 'assets/art/a.png' }), art({ src: 'assets/art/b.png' })] });
    panel.refresh();
    const lists = document.querySelectorAll('#w2-outliner .items');
    const artList = lists[lists.length - 1];
    expect(artList.querySelectorAll('button').length, '🔴 패널이 작품 문을 안 넘긴다').toBe(2);
  });

  it('🔴 V1b — 패널이 넘긴 `pick` 이 **선택까지** 이어진다', () => {
    const { panel, st } = mount({ arts: [art({ src: 'a' }), art({ src: 'b' })] });
    panel.refresh();
    const lists = document.querySelectorAll('#w2-outliner .items');
    const btns = lists[lists.length - 1].querySelectorAll('button');
    (btns[1] as HTMLButtonElement).click();
    expect(st.artSel, '🔴 목록 클릭이 선택으로 안 이어진다').toBe(1);
    expect(st.target?.kind).toBe('art');
  });

  it('★ 문을 **안 주면** 칸 자체가 안 생긴다 — 선택 사양 규약', () => {
    const port = createArtsPort((s) => s);
    void port.set([art()]);
    const o = outliner(false, port, () => {});
    o.sync();
    const titles = Array.from(document.querySelectorAll('#w2-outliner h4')).map((e) => e.textContent);
    expect(titles.some((t) => t?.includes('걸린 작품')), '★ 문이 없는데 칸이 생겼다').toBe(false);
  });

  it('🔴 V3 — 줄을 클릭하면 그 인덱스로 `pick` 이 불린다', () => {
    const port = createArtsPort((s) => s);
    void port.set([art({ src: 'a' }), art({ src: 'b' }), art({ src: 'c' })]);
    const got: number[] = [];
    const o = outliner(true, port, (i) => { got.push(i); });
    o.sync();
    const lists = document.querySelectorAll('#w2-outliner .items');
    const btns = lists[lists.length - 1].querySelectorAll('button');
    (btns[2] as HTMLButtonElement).click();
    expect(got, '🔴 클릭이 선택으로 안 이어진다').toEqual([2]);
  });

  it('🔴 V4 — 크기가 바뀌면 줄 라벨이 **따라온다**', async () => {
    const port = createArtsPort((s) => s);
    void port.set([art({ src: 'assets/art/a.png', w: 2.4 })]);
    const o = outliner(true, port, () => {});
    o.sync();
    const label0 = document.querySelector('#w2-outliner .items:last-of-type button')!.textContent;
    expect(label0).toContain('2.40');

    await port.set([art({ src: 'assets/art/a.png', w: 6 })]);
    o.sync();
    const label1 = document.querySelector('#w2-outliner .items:last-of-type button')!.textContent;
    // 개수로만 서명을 잡으면 여기서 옛 라벨이 남는다 — 그것이 V4 가 심는 결함이다.
    expect(label1, '🔴 크기를 바꿨는데 목록이 옛 값을 말한다').toContain('6.00');
  });
});

// ── 조립자 배선 (검수관 V3) ────────────────────────────────────────────────
//
// ⚠ **정적 검사다 — 약한 축인 것을 알고 쓴다.** `edit/mode.ts` 를 실제로 돌리려면
// three·스트리밍·충돌까지 물린 host 가 필요하고, 그 대역을 만드는 비용이 이 축의
// 값어치를 넘는다. 이 저장소에 같은 형태의 선례가 있다(`world2-multi-wiring.test.ts`
// 가 `features/overlay.ts` 소스를 문자열로 본다).
//
// **못 잡는 것**: 배선이 있지만 **틀린** 경우(엉뚱한 포트를 넘긴다든지). 그것은 위
// jsdom 축이 패널 경유로 잡는다 — 둘이 짝이고 어느 쪽도 혼자서는 충분하지 않다.

describe('★ 조립자가 작품 문을 패널에 넘긴다 (정적)', () => {
  // ⚠ **jsdom 환경에서는 `import.meta.url` 이 `file:` 스킴이 아니다** — 선례
  // (`world2-multi-wiring.test.ts`)는 node 환경이라 `fileURLToPath` 가 통하지만 여기서는
  // `TypeError: The URL must be of scheme file` 이 난다(실측). vitest 는 저장소 루트에서
  // 도므로 cwd 상대 경로로 읽는다.
  const CODE = readFileSync('frontend/js/world2/edit/mode.ts', 'utf8');

  it('🔴 V3 — `artList`·`pickArt` 를 **둘 다** 넘긴다', () => {
    expect(CODE, '🔴 목록 문을 안 넘긴다').toMatch(/artList:\s*port\s*&&/);
    expect(CODE, '🔴 선택 문을 안 넘긴다').toMatch(/pickArt:\s*port\s*&&/);
  });

  it('🔴 선택이 `select()` 한 곳을 지난다 — 3D 클릭과 갈라지면 안 된다', () => {
    const at = CODE.indexOf('pickArt:');
    expect(at, '★ pickArt 배선이 없다').toBeGreaterThan(0);
    const body = CODE.slice(at, at + 400);
    expect(body, '🔴 어댑터를 안 만든다').toContain('artTarget(port,');
    expect(body, '🔴 선택 경로를 안 탄다').toContain('select(st, host,');
    expect(body, '🔴 화면 갱신·탭 전환을 안 부른다').toContain('panel.onPicked()');
  });
});

// ── 크기 슬라이더 (검수관 V2·V5) ────────────────────────────────────────────

describe('★ 크기 슬라이더 — 거짓 UI 와 확정', () => {
  it('🔴 V2 — 실치수를 안 내는 대상에서는 **줄이 숨는다**', () => {
    const { panel, st, host } = mount();
    panel.refresh();
    expect(sizeRow()!.style.display, '🔴 아무것도 안 골랐는데 슬라이더가 보인다').toBe('none');

    const entry = { src: 'x.glb', x: 0, y: 0, z: 0, ry: 0, s: 1 } as unknown as OverlayEntry;
    select(st, host, { entry });
    panel.refresh();
    expect(sizeRow()!.style.display, '🔴 GLB 는 실치수가 없는데 슬라이더가 보인다').toBe('none');
  });

  it('🔴 액자를 고르면 줄이 뜨고 **계약 범위**를 쓴다', () => {
    const { panel, st, host, port } = mount({ arts: [art({ w: 2.4 })] });
    select(st, host, { art: { index: 0, target: artTarget(port, 0) } });
    panel.onPicked();
    expect(sizeRow()!.style.display).not.toBe('none');
    const inp = sizeInput()!;
    expect(inp.min).toBe(String(ART_W_MIN));
    expect(inp.max).toBe(String(ART_W_MAX));
    expect(Number(inp.value)).toBeCloseTo(2.4, 6);
  });

  it('🔴 V5 — **손을 떼면(`change`) 목록에 실린다.** 이것이 안 되면 편집이 저장에 안 남는다', async () => {
    const { panel, st, host, port } = mount({ arts: [art({ w: 2.4 })] });
    select(st, host, { art: { index: 0, target: artTarget(port, 0) } });
    panel.onPicked();
    const inp = sizeInput()!;

    // 미는 중 — 목록은 아직 그대로여야 한다(`apply`/`commit` 분리).
    inp.value = '6';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    expect(port.list()[0].w, '★ 미는 중에 목록이 바뀌었다 — 취소할 자리가 없어진다').toBe(2.4);

    // 손을 뗐다 — 여기서 확정된다.
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
    expect(port.list()[0].w, '🔴 손을 뗐는데 값이 저장에 안 실렸다').toBe(6);
  });

  it('★ 슬라이더 표시가 실치수를 말한다', () => {
    const { panel, st, host, port } = mount({ arts: [art({ w: 2.4 })] });
    select(st, host, { art: { index: 0, target: artTarget(port, 0) } });
    panel.onPicked();
    const num = document.querySelector('#w2-edit .size-row .num')!;
    expect(num.textContent).toBe('2.40m');
    const inp = sizeInput()!;
    inp.value = '5';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    expect(num.textContent).toBe('5.00m');
  });
});

// ── 액자에서 숨는 버튼 (검수관 권고 P2·P3) ──────────────────────────────────

describe('★ 액자에서 쓸 수 없는 버튼은 **숨는다** — 조용한 no-op 을 남기지 않는다', () => {
  const findBtn = (label: string): HTMLButtonElement | null =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('#w2-edit .body button'))
      .find((b) => b.textContent === label) ?? null;

  it('🔴 「바닥에」·「복제」가 액자를 고른 동안 숨는다', () => {
    const { panel, st, host, port } = mount();
    select(st, host, { art: { index: 0, target: artTarget(port, 0) } });
    panel.onPicked();
    expect(findBtn('바닥에')!.hidden, '🔴 「바닥에」가 액자에서 보인다 — 눌러도 아무 일이 없다').toBe(true);
    expect(findBtn('복제')!.hidden, '🔴 「복제」가 액자에서 보인다 — 「먼저 고르세요」라고 거짓말한다').toBe(true);
  });

  it('★ 오버레이에서는 그대로 보인다 — 액자에서만 숨는 것이 의도다', () => {
    const { panel, st, host } = mount();
    const entry = { src: 'x.glb', x: 0, y: 0, z: 0, ry: 0, s: 1 } as unknown as OverlayEntry;
    select(st, host, { entry });
    panel.onPicked();
    expect(findBtn('바닥에')!.hidden).toBe(false);
    expect(findBtn('복제')!.hidden).toBe(false);
  });
});
