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
import { createActions } from '../frontend/js/world2/edit/actions.js';
import { createEditState, select } from '../frontend/js/world2/edit/state.js';
import { artTarget } from '../frontend/js/world2/edit/target.js';
import { createArtsPort } from '../frontend/js/world2/systems/art-port.js';
import { ART_W_MIN, ART_W_MAX, type ArtworkItem } from '../frontend/js/world2/decide/artwork.js';
import type { OverlayHost, OverlayEntry } from '../frontend/js/world2/edit/types.js';

const art = (over: Partial<ArtworkItem> = {}): ArtworkItem => ({
  src: 'assets/art/a.png', x: 1, y: 3, z: 2, ry: 0, w: 2.4, ar: 1.5, ...over,
});

/**
 * 「사라짐」축을 안 보는 케이스의 `onLost`. 그 축을 보는 것은 아래 「사라지면 화면이
 * 말한다」 한 곳이고, 거기서는 하네스의 `pickArt`(=제품과 같은 형태)를 태운다.
 */
const noLost = (): void => {};

/**
 * 마을 파츠 하나 — `villageTarget` 이 실제로 서려면 **문이 열려 있어야** 한다.
 * 안 열면 `host.village` 가 없어 어댑터가 `null` 을 내고(`edit/target.ts:142-143`),
 * 그러면 `select()` 가 `st.villageSel` 까지 `null` 로 되돌려 **마을을 고른 상태가 아예
 * 안 만들어진다.** 그 상태로 「복제가 숨는가」를 재면 검사가 **헛돈다** — 그래서 아래
 * 검사가 `st.target?.kind` 를 먼저 단언한다.
 */
const villagePart = () => ({ kind: 'tree', x: 1, z: 2, y: 0, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 });

/** `village.freeze` 호출 수 — 「확정이 몇 번 났는가」가 이 회차의 판정 값이다 */
const freezes = { n: 0 };

function fakeHost(parts?: readonly unknown[]): OverlayHost {
  return {
    doc: document,
    cellX: 32,
    cellZ: 32,
    entries: () => [],
    apply() {},
    remove() {},
    surfaceAt: () => 0,
    // 문을 **줄지 말지가 축**이다 — 안 주면 마을 어댑터가 안 선다(위 주석).
    // `isFrozen` 까지 필요하다 — 선택 줄이 「손본 구역」인지를 화면에 적는다(`dom.ts:399`).
    village: parts
      ? { partsAt: () => parts, freeze: () => { freezes.n++; }, isFrozen: () => false }
      : null,
    // **실시간 반영의 문.** 없으면 `apply()` 가 조기 반환하고 `live` 가 `false` 다 —
    // 「3D 클릭으로 골랐다」를 재현하려면 이 문과 `slot` 이 **둘 다** 있어야 한다.
    retargetSlot: () => { /* 씬을 미는 흉내 */ },
  } as unknown as OverlayHost;
}

function mount(opts: {
  arts?: readonly ArtworkItem[];
  withArtDoor?: boolean;
  village?: readonly unknown[];
} = {}) {
  const host = fakeHost(opts.village);
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
    // 🔴 **제품(`edit/mode.ts` 의 `pickArt`)과 같은 형태로 적는다** — 세 번째 인자까지.
    // 검수관 3차 블로커 B-A 가 정확히 이 어긋남이었다: 제품은 콜백을 **안 넘겼는데**
    // 하네스는 넘기고 있어서, 「조립이 그 부품을 물리는가」가 어디서도 안 보였다.
    // 지금은 `onLost` 가 필수 인자라 **양쪽 다 안 넘길 수 없다** — 그래도 *무엇을*
    // 넘기는지는 타입이 못 보므로, 하네스가 제품과 같은 것을 넘겨야 아래
    // 「사라지면 화면이 말한다」 검사가 제품 경로를 대변한다.
    pickArt: opts.withArtDoor === false ? undefined : (i: number) => {
      select(st, host, {
        art: { index: i, target: artTarget(port, i, () => { st.artLost = true; }) },
      });
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
    select(st, host, { art: { index: 0, target: artTarget(port, 0, noLost) } });
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

    select(st, host, { art: { index: 0, target: artTarget(port, 0, noLost) } });
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
    const body = CODE.slice(at, at + 1400);
    expect(body, '🔴 어댑터를 안 만든다').toContain('artTarget(port,');
    expect(body, '🔴 선택 경로를 안 탄다').toContain('select(st, host,');
    expect(body, '🔴 화면 갱신·탭 전환을 안 부른다').toContain('panel.onPicked()');
  });

  /**
   * 🔴 **검수관 3차 블로커 B-A.** 위 검사는 이 결함을 **통과시켰다** — `artTarget(port,`
   * 가 있는지만 봤고, 제품은 `artTarget(port, i)` 로 **두 인자**만 넘기고 있었다.
   * 그래서 「고른 작품이 사라졌다」를 화면에 알리는 콜백이 **아무 데도 안 연결된 채**
   * 어댑터 검사만 초록이었고, 화면은 없는 작품의 크기가 커졌다고 **거짓을 말했다.**
   *
   * ⚠ **이 검사가 그 축의 주 방어선이 아니다.** 주 방어선은 `tsc` 다 — `onLost` 를
   * 필수 인자로 만들었으므로 안 넘기면 **컴파일이 실패한다**(그것을 되돌리는 뮤테이션은
   * 타입체크에서 잡히지 이 파일에서 잡히지 않는다). 여기서 보는 것은 타입이 못 보는
   * 나머지 절반, **무엇을 넘기는가**다: `() => {}` 를 넘겨도 `tsc` 는 통과한다.
   *
   * 🔴 **이 검사는 거짓 FAIL 을 낼 수 있다 — 어떻게 나는지 적어 둔다**(검수관 재확인 R2).
   * 소스를 **문자열 윈도**(`pickArt:` 이후 1400자)로 보므로, 배선을 위쪽으로 빼는
   * **정상적인 리팩터**에서 빨간불이 된다:
   *
   *     const onArtLost = () => { st.artLost = true; };   // ← 윈도 밖으로 나간다
   *     …
   *     pickArt: … artTarget(port, i, onArtLost)
   *
   * 그때 할 일은 **단언을 지우는 것이 아니라** 윈도를 넓히거나 찾는 대상을 그 이름으로
   * 바꾸는 것이다. 배선이 실제로 살아 있는지는 아래 「사라지면 화면이 말한다」 3건과
   * `tsc` 가 함께 본다 — 이 줄 하나가 무너져도 그 둘은 그대로다.
   */
  it('🔴 B-A — `onLost` 를 **상태에 배선**한다 (타입은 무엇을 넘기는지 못 본다)', () => {
    const at = CODE.indexOf('pickArt:');
    const body = CODE.slice(at, at + 1400);
    expect(body, '🔴 사라짐을 상태로 옮기지 않는다 — 화면이 말할 근거가 없다')
      .toMatch(/artLost\s*=\s*true/);
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
    select(st, host, { art: { index: 0, target: artTarget(port, 0, noLost) } });
    panel.onPicked();
    expect(sizeRow()!.style.display).not.toBe('none');
    const inp = sizeInput()!;
    expect(inp.min).toBe(String(ART_W_MIN));
    expect(inp.max).toBe(String(ART_W_MAX));
    expect(Number(inp.value)).toBeCloseTo(2.4, 6);
  });

  it('🔴 V5 — **손을 떼면(`change`) 목록에 실린다.** 이것이 안 되면 편집이 저장에 안 남는다', async () => {
    const { panel, st, host, port } = mount({ arts: [art({ w: 2.4 })] });
    select(st, host, { art: { index: 0, target: artTarget(port, 0, noLost) } });
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
    select(st, host, { art: { index: 0, target: artTarget(port, 0, noLost) } });
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
    select(st, host, { art: { index: 0, target: artTarget(port, 0, noLost) } });
    panel.onPicked();
    expect(findBtn('바닥에')!.hidden, '🔴 「바닥에」가 액자에서 보인다 — 눌러도 아무 일이 없다').toBe(true);
    expect(findBtn('복제')!.hidden, '🔴 「복제」가 액자에서 보인다 — 「먼저 고르세요」라고 거짓말한다').toBe(true);
  });

  it('🔴 「복제」는 **마을 파츠를 고른 동안에도** 숨는다', () => {
    // ⚠ 이 검사가 늦게 생겼다. 액자에서 같은 결함(«방금 골랐는데 먼저 고르라고 한다»)을
    // 판정해 고쳤는데(검수관 권고 P3) **마을이 그대로 남아 있었다** — `duplicate()` 는
    // `st.selected` 하나만 보고(`edit/actions.ts:150`), 마을을 고르면 `select()` 가
    // 그것을 `null` 로 만든다(`edit/state.ts:333`). 결함을 한 종류에서 고치고 **같은
    // 형태가 남은 다른 종류를 안 본** 자리다(2026-08-20).
    const { panel, st, host } = mount({ village: [villagePart()] });
    select(st, host, {
      village: { px: 0, pz: 0, index: 0, kind: 'tree', x: 1, y: 0, z: 2, frozen: false, slot: null },
    });
    panel.onPicked();
    // 🔴 **먼저 이것을 단언한다** — 어댑터가 안 서면 아래 단언은 「대상이 없어서」 통과하고
    // 검사가 헛돈다. 이번 회차에 검출력 0 인 검사를 하나 지웠고, 그 형태를 미리 막는다.
    expect(st.target?.kind, '🔴 하네스가 마을 어댑터를 못 세웠다 — 아래 단언이 헛돈다').toBe('village');
    expect(findBtn('복제')!.hidden, '🔴 「복제」가 마을에서 보인다 — 눌러도 「먼저 고르세요」만 뜬다').toBe(true);
    // 「바닥에」는 마을에서 **쓸 수 있다** — 둘의 조건이 다르다는 것이 이 줄의 요점이다.
    expect(findBtn('바닥에')!.hidden, '🔴 「바닥에」까지 숨었다 — 마을에서 쓸 수 있는 버튼이다').toBe(false);
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

// ── 「사라졌다」가 화면에 도달하는가 (검수관 3차 블로커 B-A) ─────────────────

/**
 * 🔴 **부품이 동작한다 ≠ 조립이 그 부품을 물린다.** 이 파일 헤더가 그 문장을 적어 놓고
 * **그 파일을 만든 회차에 같은 형태를 하나 더 만들었다**(검수관 3차 지적).
 * `world2-art-edit.test.ts` 의 `onLost` 검사는 어댑터를 직접 부르며 콜백을 넘겼고,
 * 제품(`edit/mode.ts`)은 안 넘겼다. 뮤테이션이 1 failed 를 내면서도 미배선을 못 잡았다.
 *
 * 그래서 여기서는 **하네스의 `pickArt`**(제품과 같은 형태로 적은 것)를 태우고, 끝의
 * 화면 문자열까지 간다 — 어댑터도, 상태 칸도, 문구도 중간에서 끊기면 빨간불이다.
 *
 * ⚠ **이 검사가 제품의 `mode.ts` 를 실행하지는 않는다**(three 의존이 커서 jsdom 에서
 * 못 태운다). 하네스가 제품과 같은지는 위 정적 검사 둘과 **`tsc`** 가 본다 — 세 축이
 * 함께여야 이 경로가 덮인다. 못 재는 것을 잰 것처럼 적지 않는다.
 */
describe('★ 고른 작품이 목록에서 사라지면 **화면이 말한다**', () => {
  const notes = (): string =>
    Array.from(document.querySelectorAll('#w2-edit .note'))
      .map((n) => n.textContent ?? '').join(' | ');

  it('🔴 사라진 뒤 조작하면 경고가 뜬다 — 조용히 no-op 이 되지 않는다', () => {
    const { panel, st, port, handlers } = mount({ arts: [art(), art({ src: 'assets/art/b.png' })] });
    handlers.pickArt!(0);
    expect(st.artLost, '★ 고른 직후에는 멀쩡하다').toBe(false);

    // 다른 경로가 그 작품을 걷어간다(되돌리기·문서 재로드가 이 형태다).
    void port.set(port.list().slice(1));
    st.target!.width!.set(9);
    st.target!.commit();
    panel.refresh();

    expect(st.artLost, '🔴 어댑터의 `onLost` 가 상태로 안 옮겨졌다 — 배선이 끊겼다').toBe(true);
    expect(notes(), '🔴 화면이 아무 말도 안 한다 — 감독은 계속 밀다 값을 잃는다')
      .toContain('목록에서 사라졌습니다');
  });

  it('🔴 문구가 마을의 「미리보기만 끊김」과 **달라야** 한다 — 정반대 의미다', () => {
    const { panel, st, port, handlers } = mount();
    handlers.pickArt!(0);
    void port.set([]);
    st.target!.commit();
    panel.refresh();
    // 마을 문구는 «조작과 저장은 그대로 됩니다» 다. 액자에 그 말을 하면 거짓이다.
    expect(notes(), '🔴 액자에 마을 문구가 떴다 — 사라진 작품을 저장된다고 안내한다')
      .not.toContain('조작과 저장은 그대로');
    expect(notes()).toContain('반영되지 않습니다');
  });

  it('★ 다시 고르면 경고가 걷힌다 — `select()` 가 푸는 유일한 자리다', () => {
    const { panel, st, port, handlers } = mount({ arts: [art(), art({ src: 'assets/art/b.png' })] });
    handlers.pickArt!(0);
    void port.set(port.list().slice(1));
    st.target!.commit();
    panel.refresh();
    expect(st.artLost).toBe(true);

    handlers.pickArt!(0);          // 남아 있는 작품을 고른다
    panel.refresh();
    expect(st.artLost, '🔴 옛 선택의 「끊김」이 새 선택에 물려졌다').toBe(false);
    expect(notes()).not.toContain('목록에서 사라졌습니다');
  });
});

describe('🔴 키 안내는 상황 메시지에 밀려나지 않는다 — 태스크 #66', () => {
  // ── 왜 이 블록이 생겼나 (2026-08-20) ──────────────────────────────────────
  // 힌트가 **한 요소·한 분기**였다. 그래서 마을 파츠를 고르거나 경고가 뜨면 키 목록이
  // **통째로 사라졌다** — 하필 **무언가를 고른 직후**, 즉 조작이 필요한 바로 그 순간에.
  // `sayLead` 는 모드가 바뀔 때 한 번 말하고 다른 `say()` 가 덮으면 사라지므로, 화면에
  // 계속 남는 줄은 이쪽뿐이다(검수관 권고 P1 이 그 줄을 만든 이유).
  //
  // ⚠ **못 잡는 것**: 실제로 읽히는 크기·줄바꿈(CSS·화면 폭) · 문구가 실제 키와 맞는지
  // (그 값 미러링은 태스크 #44 소관) · 모바일 레이아웃.

  /** 패널 안에서 키 안내를 담은 줄 */
  const keysLine = (): string => Array
    .from(document.querySelectorAll('#w2-edit .note'))
    .map((n) => n.textContent ?? '')
    .find((t) => t.includes('WASD')) ?? '';

  it('🔴 마을 파츠를 골라도 키 안내가 남는다', () => {
    const { panel, st } = mount();
    // 마을 파츠 선택 상태를 만든다 — 그때 상황 메시지가 뜨는 분기다.
    // ⚠ 이 리터럴은 `as never` 라 **타입 검사를 안 받는다** — 예전에 `index` 를 `idx` 로
    // 적고 있었고 아무도 못 봤다(2026-08-20 정정). 이 블록은 `villageTarget` 을 안 타고
    // 「키 안내가 남는가」만 보므로 증상이 없었으나, 다음 사람이 이 줄을 복사한다.
    st.villageSel = { px: 0, pz: 0, index: 0, kind: 'tree', frozen: false } as never;
    panel.refresh();
    expect(keysLine(), '🔴 파츠를 고르자 키 안내가 사라졌다 — 조작이 필요한 순간에').toContain('WASD');
    // 상황 메시지도 함께 있어야 한다 — 하나가 다른 하나를 밀어내지 않는다.
    const all = Array.from(document.querySelectorAll('#w2-edit .note')).map((n) => n.textContent ?? '');
    expect(all.some((t) => t.includes('손본 구역')), '🔴 상황 메시지가 사라졌다').toBe(true);
  });

  it('★ 아무것도 안 골라도 키 안내가 있다 — 기본 상태', () => {
    const { panel } = mount();
    panel.refresh();
    expect(keysLine()).toContain('WASD');
  });

  it("★ 안내에 `Esc` 취소가 적혀 있다 — 태스크 #97 로 연 문을 화면이 말한다", () => {
    const { panel } = mount();
    panel.refresh();
    expect(keysLine(), '🔴 취소 키를 열어 놓고 화면에 안 적었다').toContain('Esc');
  });
});

describe('🔴 `Esc` 로 고른 것을 취소한다 — 태스크 #97', () => {
  // ── 왜 이 문이 필요했나 (2026-08-20) ──────────────────────────────────────
  // 팔레트에서 고른 뒤 취소하는 문이 **그 버튼을 다시 누르는 것 하나**였다. 「고른 상태」는
  // 화면에 크게 안 드러나는데(커서가 안 바뀐다) **지면을 클릭하면 물건이 생기므로**,
  // 취소를 모르면 의도치 않게 놓고 다시 지워야 한다.
  //
  // ── ⚠ 여기 있는 것은 **함수의 행위**다 (전 경로는 다른 파일) ──────────────
  // 처음에는 `world2-edit-listeners.test.ts` 에 붙였다가 4건 전부 실패했다 —
  // `Cannot set properties of undefined`. 그 파일의 `Harness` 는 `st` 를 노출하지 않고
  // `EditSession` 계약(`edit/types.ts:311`)도 `dispose()`+조준 진단뿐이다. **거기까지는
  // 참이다.**
  //
  // 🔴 **그런데 «행위로 못 잰다» 는 거짓이었다**(검수관 블로커 H1). `st` **직접 대입**이
  // 막힌 것이지 **제품 경로**가 막힌 게 아니었다 — 팔레트 버튼을 클릭하면 `palette.ts` 의
  // `pick()` 이 pending 을 세운다. 전 경로 행위 검사는 **`world2-edit-listeners.test.ts`
  // 의 GS-E1** 에 있고, 그것이 이 회차의 주 축이다.
  //
  // 여기 남은 것은 **함수 단위 행위**(경계·반환값)이고 그 축은 여전히 값이 있다 —
  // GS-E1 은 「사용자가 `Esc` 로 취소한다」를 재고, 여기는 「그 함수가 무엇을 건드리고
  // 무엇을 안 건드리는가」를 잰다.
  //
  // ⚠ **못 잡는 것**: 실제 브라우저에서 `Esc` 가 이 경로까지 오는지(모달·조준이 먼저
  // 삼키는 순서는 각 파일 소관) · 팔레트 버튼의 강조가 풀리는지 · 모바일 터치 경로.

  const mkActions = (): ReturnType<typeof createActions> & { st: ReturnType<typeof createEditState> } => {
    const h = mount();
    const actions = createActions(h.host, h.st, h.panel);
    return Object.assign(actions, { st: h.st });
  };

  it('🔴 고른 파츠가 풀린다 — 그리고 `true` 를 낸다(이벤트를 삼켜도 된다는 신호)', () => {
    const a = mkActions();
    a.st.pendingPart = 'tree';
    expect(a.cancelPending(), '🔴 풀 것이 있는데 false 를 냈다').toBe(true);
    expect(a.st.pendingPart, '🔴 고른 것이 안 풀렸다 — 지면을 클릭하면 나무가 생긴다').toBeNull();
  });

  it('🔴 고른 GLB 도 같은 문으로 풀린다 — 둘을 갈라 두면 하나만 기억한다', () => {
    const a = mkActions();
    a.st.pendingSrc = 'assets/models/x.glb';
    expect(a.cancelPending()).toBe(true);
    expect(a.st.pendingSrc).toBeNull();
  });

  it('🔴 **고를 것이 없으면 `false`** — 다른 `Esc` 소비자가 살아 있어야 한다', () => {
    // 계약의 절반이 여기다. 조용히 `true` 를 내면 부르는 쪽이 이벤트를 삼켜
    // «아무것도 안 골랐는데 Esc 가 먹통» 이 되고, 증상은 모달·조준 쪽에서 엉뚱하게 뜬다.
    const a = mkActions();
    expect(a.cancelPending(), '🔴 풀 것이 없는데 삼키라고 했다').toBe(false);
  });

  it('★ 선택(놓은 뒤)은 안 건드린다 — 크기 조절 중 Esc 로 대상이 사라지면 안 된다', () => {
    const a = mkActions();
    a.st.pendingPart = 'tree';
    a.st.villageSel = { px: 0, pz: 0, idx: 0, kind: 'tree', frozen: false } as never;
    a.cancelPending();
    expect(a.st.villageSel, '🔴 고른 것을 풀면서 선택까지 풀었다').not.toBeNull();
  });

  it('★ 배선 — `Esc` 가 그 문을 부른다 (정적 축 — **보조**다)', () => {
    // ⚠ **이 축만으로는 부족하다** — 검수관 실측(G2): 이 줄을 **주석 처리**하면 문자열이
    // 소스에 남아 여기는 **통과**하고 `Esc` 취소만 죽는다(`GS-A1` 이 「못 잡는 것 ⓐ」로
    // 이름 붙인 사각). 그 형태를 잡는 것은 `world2-edit-listeners.test.ts` 의 **GS-E1**
    // 이고, 실측으로 확인했다 — G2 에서 GS-E1 만 **1 failed**.
    // 여기 남기는 이유는 **줄을 통째로 지우는 형태**에서 둘 다 빨간불이 되어 원인을 빨리
    // 좁혀 주기 때문이다(E3 실측: **2 failed**).
    // ⚠ **cwd 상대 경로다** — 이 파일은 jsdom 환경이라 `import.meta.url` 이 `file:` 스킴이
    // 아니고 `fileURLToPath` 가 던진다(이 파일 위쪽 선례에 실측이 적혀 있다). 처음에
    // `fileURLToPath` 로 썼다가 `ReferenceError` 를 보고 알았다.
    const src = readFileSync('frontend/js/world2/edit/input.ts', 'utf8').replace(/\s+/g, ' ');
    expect(src, '🔴 Esc 가 취소를 안 부른다 — 문을 만들고 열쇠를 안 줬다')
      .toContain("ev.code === 'Escape' && actions.cancelPending()");
  });
});

// ── 🔴 GS-L1 확정 시점 — 감독 «수치칸 타이핑이 거슬린다» (팀장 판정 (C)) ─────
//
// 마을 수치칸은 **타이핑 한 글자마다** 확정했고, 마을의 확정은 곧 파셀 재빌드다 —
// 「12.5」를 치면 **네 번**이다. 감독이 카드에서 「거슬린다」로 답했다.
//
// 미룰 수 있는 조건은 **화면이 이미 맞을 것** 하나다. 그것을 `kind` 로 갈랐던 것이
// 틀렸다 — 마을도 3D 클릭으로 고르면 `apply()` 가 슬롯을 즉시 밀어 화면이 맞고,
// 아웃라이너에서 고르면 슬롯을 몰라 안 맞는다. **같은 종류 안에서 갈린다.**
// 그래서 대상이 `live` 로 스스로 선언하고 수치칸은 그것만 본다.
//
// ⚠ **팀장 조건 3 이 2방향을 지정했다** — 「미룬다」만 재면 아웃라이너 경로가 깨져도
// 안 보인다(그 경로에서 미루면 「화면과 수치가 다른 것을 말한다」가 생긴다).
describe('🔴 GS-L1 — 확정은 «화면이 맞는가» 로 갈린다 (종류가 아니라)', () => {
  const numInput = (): HTMLInputElement => {
    const el = document.querySelector<HTMLInputElement>('#w2-edit input[type="number"]');
    if (!el) throw new Error('수치칸이 없다 — 하네스가 인스펙터를 안 세웠다');
    return el;
  };
  const type = (inp: HTMLInputElement, v: string): void => {
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const blur = (inp: HTMLInputElement): void => {
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  };
  /** 마을 파츠를 고른 상태. `slot` 을 주면 3D 클릭 경로, 안 주면 아웃라이너 경로다 */
  const pickVillage = (withSlot: boolean) => {
    const h = mount({ village: [villagePart()] });
    freezes.n = 0;
    select(h.st, h.host, {
      village: {
        px: 0, pz: 0, index: 0, kind: 'tree', x: 1, y: 0, z: 2, frozen: false,
        slot: withSlot ? { key: 'tree', index: 0 } : null,
      },
    });
    h.panel.onPicked();
    return h;
  };

  it('🔴 3D 클릭으로 고르면 — 타이핑 중 확정 **0회**, 손을 떼면 **1회**', () => {
    const h = pickVillage(true);
    expect(h.st.target?.live, '🔴 슬롯이 있는데 실시간이 아니라고 한다 — 검사가 헛돈다').toBe(true);
    const inp = numInput();
    type(inp, '1'); type(inp, '12'); type(inp, '12.'); type(inp, '12.5');
    expect(freezes.n, '🔴 타이핑 한 글자마다 파셀을 다시 세운다 — 감독이 거슬린다고 한 그것이다')
      .toBe(0);
    blur(inp);
    expect(freezes.n, '🔴 손을 뗐는데 확정이 안 났다 — 값이 아무 데도 안 남는다').toBe(1);
  });

  it('🔴 아웃라이너로 고르면 — **종전대로** 타이핑마다 확정한다', () => {
    // 그 경로는 `apply()` 가 화면을 못 미므로(슬롯을 모른다) 미루면 **화면과 수치가
    // 다른 것을 말한다.** 팀장이 이 경로를 안 바꾸는 것을 조건으로 달았다.
    const h = pickVillage(false);
    expect(h.st.target?.live, '🔴 슬롯이 없는데 실시간이라고 한다').toBe(false);
    const inp = numInput();
    type(inp, '1'); type(inp, '12');
    expect(freezes.n, '🔴 화면이 안 따라오는 경로인데 확정을 미뤘다').toBe(2);
  });

  it('🔴 슬롯이 **죽었으면** 실시간이 아니다 — 스트리밍이 파셀을 걷어간 경우', () => {
    // ⚠ **이 검사는 뮤테이션이 사각을 실측한 뒤에 생겼다** — `canApply()` 에서
    // `slot.index >= 0` 를 빼도 **0 failed** 였다(위 두 검사가 살아 있는 슬롯만 썼다).
    // 그 조건은 내가 팀장 조건 1(`apply()` 와 같은 식)을 지키려고 **추가한** 것이라
    // 재는 것도 내 몫이다.
    //
    // 실물에서 이 상태가 나는 경로: 수치칸에 값을 치는 동안 카메라가 멀어져 스트리밍이
    // 그 파셀을 걷어간다. 슬롯은 반납되며 `index` 에 `-1` 이 박힌다(`instancing.ts`).
    // 그때 화면은 이미 그 파츠를 안 그리므로 「미룬다」의 전제가 깨져 있다.
    const h = mount({ village: [villagePart()] });
    freezes.n = 0;
    select(h.st, h.host, {
      village: {
        px: 0, pz: 0, index: 0, kind: 'tree', x: 1, y: 0, z: 2, frozen: false,
        slot: { key: 'tree', index: -1 },
      },
    });
    h.panel.onPicked();
    expect(h.st.target?.live, '🔴 죽은 슬롯인데 실시간이라고 한다 — 미루면 값이 화면에 안 보인다')
      .toBe(false);
    const inp = numInput();
    type(inp, '9');
    expect(freezes.n, '🔴 죽은 슬롯인데 확정을 미뤘다').toBe(1);
  });

  it('★ 손을 **두 번** 떼도 그만큼만 확정한다 — 상태를 바꾸는 함수는 두 번 부른다', () => {
    const h = pickVillage(true);
    const inp = numInput();
    type(inp, '3');
    blur(inp);
    blur(inp);
    expect(freezes.n, '🔴 blur 두 번에 확정 수가 안 맞는다').toBe(2);
  });
});
