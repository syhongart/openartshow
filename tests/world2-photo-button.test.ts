// @vitest-environment jsdom
//
// **「사진 걸기」 버튼** — 폰에서 사진을 넣는 유일한 문이 실제로 서는가 (W8-5).
//
// 감독 카드 2026-08-17: *"폰에서 넣기 먼저"*. 그전까지 world2 편집에 `<input type="file">`
// 이 **0건**이었고 투입구가 데스크톱 드래그드롭 하나뿐이었다 — 모바일 브라우저는 파일
// 드래그드롭을 지원하지 않으므로 **감독은 이 기능을 쓸 수가 없었다.**
//
// ── 왜 별도 파일인가 ────────────────────────────────────────────────────────
// `world2-edit-listeners.test.ts` 가 1896줄이고 **분해 대상**이다(태스크 #69). 거기에
// 더하면 그 문제를 키운다 — 새 축은 새 파일에 둔다(`world2-surface-panel.test.ts` 선례).
//
// ── 이 파일이 지키는 것 ─────────────────────────────────────────────────────
// ① **선택 사양 규약** — 문을 안 주면 그 행이 통째로 안 생긴다(표면 재질 넷의 규약)
// ② **버튼 → 숨긴 입력 → 핸들러** 사슬이 실제로 이어지는가
// ③ 🔴 **`change` 뒤 값을 비우는가** — 안 비우면 같은 사진을 다시 고를 때 `change` 가
//    아예 안 나고 «두 번째부터 버튼이 죽는다» 가 된다. 벽을 못 찾아 거절당한 뒤 몸을
//    돌려 **같은 사진을 다시 거는 것이 가장 흔한 흐름**이라 이것이 빠지면 기능이 반쯤 죽는다
//
// ── 이 파일이 **못** 재는 것 ────────────────────────────────────────────────
// jsdom 은 OS 파일 피커를 안 띄우고 터치도 없다. 「폰에서 버튼이 실제로 눌리는가」·
// 「사진첩이 뜨는가」는 **감독 실기기가 유일한 판정**이고, 통과를 그 근거로 쓰지 않는다.
// 그리고 여기서 `change` 는 우리가 직접 dispatch 하므로 브라우저의 「값이 같으면 change 가
// 안 난다」 동작이 **재현되지 않는다** — 그래서 ③은 「두 번 불렸다」가 아니라 **「빈
// 문자열을 대입했다」**로 잰다(그 축만이 실제 검출력을 갖는다).

import { describe, it, expect, beforeEach } from 'vitest';
import { createPanel, type PanelHandlers } from '../frontend/js/world2/edit/panel/dom.js';
import { createEditState } from '../frontend/js/world2/edit/state.js';
import type { OverlayHost } from '../frontend/js/world2/edit/types.js';

const FILE = (name: string) => ({ name }) as unknown as File;

function mount(opts: { withDoor?: boolean } = {}) {
  const got: File[] = [];
  const host = { doc: document, entries: () => [] } as unknown as OverlayHost;
  const st = createEditState();
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
    // **문을 줄지 말지가 이 하네스의 축이다** — 안 주면 행 자체가 없어야 한다.
    hangPhoto: opts.withDoor === false ? undefined : (f: File) => { got.push(f); },
  } as unknown as PanelHandlers;

  const panel = createPanel(host, st, handlers, noop);
  const input = panel.root.querySelector<HTMLInputElement>('input[type="file"]');

  /** 입력에 대입된 값들. ③을 재는 유일한 축이다 */
  const valueSets: string[] = [];
  if (input) {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!;
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => desc.get!.call(input),
      set: (v: string) => { valueSets.push(String(v)); desc.set!.call(input, v); },
    });
  }

  /** 버튼을 누른 것과 파일을 고른 것을 **갈라서** 흘린다 — 사슬의 어느 고리가 끊겼는지 보려고 */
  function choose(files: readonly File[]): void {
    if (!input) throw new Error('파일 입력이 없다');
    Object.defineProperty(input, 'files', { configurable: true, value: files });
    input.dispatchEvent(new Event('change'));
  }

  return { panel, input, got, valueSets, choose };
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

describe('★ 「사진 걸기」 — 폰에서 사진을 넣는 유일한 문 (W8-5)', () => {
  it('★ 문을 주면 버튼과 파일 입력이 선다', () => {
    const { panel, input } = mount();
    expect(input, '★ 파일 입력이 없다 — 폰에서 투입구가 0개가 된다').not.toBeNull();
    expect(input!.accept, '★ 사진첩이 아니라 파일 브라우저가 뜬다').toBe('image/*');
    const btn = [...panel.root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('사진'));
    expect(btn, '★ 사진 걸기 버튼이 없다').toBeTruthy();
  });

  it('★ 문을 안 주면 **행 자체가 안 생긴다** — 표면 재질이 세운 규약', () => {
    // 누를 수 없는 버튼을 보여주는 것은 안내가 아니라 막다른 길이다(`dom.ts` refresh 주석).
    const { panel, input } = mount({ withDoor: false });
    expect(input, '★ 문이 없는데 파일 입력이 섰다').toBeNull();
    expect(panel.root.querySelector('.photo'), '★ 빈 행이 남아 여백을 먹는다').toBeNull();
  });

  it('★ 버튼이 **숨긴 입력을 대신 누른다** — 사슬 ①', () => {
    const { panel, input } = mount();
    let clicked = 0;
    input!.click = () => { clicked++; };
    const btn = [...panel.root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('사진'))!;
    btn.click();
    expect(clicked, '★ 버튼이 파일 입력을 안 연다 — 눌러도 아무 일이 없다').toBe(1);
  });

  it('★ 고른 파일이 핸들러까지 간다 — 사슬 ②', () => {
    const { got, choose } = mount();
    choose([FILE('IMG_1234.JPG')]);
    expect(got.length, '★ 파일을 골랐는데 아무 데도 안 간다').toBe(1);
    expect(got[0]!.name).toBe('IMG_1234.JPG');
  });

  it('★ 🔴 고른 뒤 **값을 비운다** — 같은 사진을 다시 걸 수 있어야 한다', () => {
    // 거절(벽을 못 찾음) → 몸을 돌림 → **같은 사진 재선택**이 가장 흔한 흐름이다.
    // 값이 남아 있으면 브라우저가 `change` 를 안 내보내고 화면은 아무 말도 안 한다.
    const { valueSets, choose } = mount();
    choose([FILE('a.png')]);
    expect(valueSets, '★ 값을 안 비운다 — 두 번째부터 버튼이 죽는다').toContain('');
  });

  it('★ 파일 없이 change 가 와도 조용하다 (피커 취소)', () => {
    const { got, choose } = mount();
    choose([]);
    expect(got.length, '★ 취소했는데 걸기가 돌았다').toBe(0);
  });

  it('★ 파일 입력이 **화면 왼쪽 절반을 안 먹는다** — 패널 안에 산다', () => {
    // `panel/css.ts` 헤더가 못 박은 제약이다: 왼쪽 절반은 터치 조이스틱 판정 영역이라
    // 거기에 무엇을 두면 **폰에서 이동이 불가능해진다**. 패널은 오른쪽 고정이므로
    // 「패널 안에 있는가」가 그 제약을 지키는 구조적 축이다.
    const { panel, input } = mount();
    expect(panel.root.contains(input!), '★ 파일 입력이 패널 밖으로 나갔다').toBe(true);
  });
});
