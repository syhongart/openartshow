// @vitest-environment jsdom
//
// 슬라이더 바 — 값을 화면에서 미는 도구 (감독 지시 2026-07-31 "유아이 바를 만들어봐").
//
// ── 이 파일이 보는 것 ────────────────────────────────────────────────────────
// `knob-bar.ts` 는 **노브가 무엇인지 모른다.** `KnobSpec` 을 받아 행을 그리고 이벤트를
// 되돌려주는 일만 한다. 그래서 여기서는 스텁 spec 으로 그 계약만 잰다 —
// "민 만큼 `set` 이 오는가", "되돌리기가 `reset` 을 부르는가", "표시가 반영 상태를
// 따라가는가".
//
// **수면 값이 실제로 바뀌는가는 여기서 안 본다.** 그것은 경계를 건너는 지점이고,
// `tests/world2-ocean.test.ts` 의 「슬라이더 바 — 실제 재질까지」 가 진짜 `ocean.ts` 를
// 태워서 본다. 이 구별을 흐리면 오늘 검수관이 잡은 사고(사본을 검사하는 "집행 테스트")를
// 그대로 되풀이하게 된다.
//
// ── 못 보는 것 ──────────────────────────────────────────────────────────────
// 손가락으로 슬라이더를 미는 감각(트랙이 충분히 긴가, 손잡이가 잡히는가)은 못 잰다.
// jsdom 에는 레이아웃이 없고, 헤드리스 브라우저에도 손가락이 없다 — 실기기 판정은
// 감독 몫이다.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { findKnobBar, attachKnobBar, digitsOf, type KnobSpec } from '../frontend/js/world2/ui/knob-bar.js';

/** `world2.html` 의 바 컨테이너와 같은 골격. 행은 JS 가 만든다 */
function putMarkup() {
  document.body.innerHTML = `
    <div id="w2-sliders" data-open="0" data-dirty="0" hidden>
      <button id="w2-sliders-toggle" type="button" aria-expanded="false" aria-controls="w2-sliders-body">
        <span class="cap">개발자 옵션</span><span class="dirty-dot"></span><span class="caret">▾</span>
      </button>
      <div id="w2-sliders-body" hidden></div>
    </div>`;
}

/**
 * 값을 실제로 들고 있는 스텁 spec. `null` 이 "지정 안 됨" 이고 그때 `fallback` 이 간다 —
 * 진짜 노브와 같은 어휘다.
 */
function makeSpec(key: string, fallback: number, over: Partial<KnobSpec> = {}) {
  const state = { v: null as number | null, sets: [] as number[], resets: 0 };
  const spec: KnobSpec = {
    key, label: key, min: 0, max: 3, step: 0.05,
    value: () => state.v ?? fallback,
    overridden: () => state.v !== null,
    set(v) { state.v = v; state.sets.push(v); },
    reset() { state.v = null; state.resets++; },
    ...over,
  };
  return { spec, state };
}

const $ = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
const rows = () => document.querySelectorAll('.w2-slide-row');

beforeEach(putMarkup);

describe('findKnobBar — 없으면 조용히 null', () => {
  it('마크업이 있으면 세 조각을 찾는다', () => {
    const p = findKnobBar(document);
    expect(p).not.toBeNull();
    expect(p!.panel.id).toBe('w2-sliders');
  });

  it('★ 마크업이 없으면 null 이다 — 바 없이도 월드는 돌아야 한다', () => {
    // 바를 못 찾았다고 기능이 죽으면, 패널을 뺀 페이지에서 물이 통째로 사라진다.
    document.body.innerHTML = '';
    expect(findKnobBar(document)).toBeNull();
  });
});

describe('digitsOf — 표시 자릿수를 step 에서 유도한다', () => {
  it('step 이 곧 표시 해상도다', () => {
    expect(digitsOf(0.05)).toBe(2);
    expect(digitsOf(0.01)).toBe(2);
    expect(digitsOf(0.1)).toBe(1);
    expect(digitsOf(1)).toBe(0);
  });

  it('★ 유도하므로 어긋날 수 없다 — 0.05 를 밀었는데 표시가 안 바뀌는 일이 없다', () => {
    // 자릿수를 spec 에 따로 받으면 `step:0.05` + `digits:1` 같은 조합이 가능해진다.
    // 그때 슬라이더는 움직이는데 숫자는 그대로라 "안 먹는다"로 읽힌다.
    for (const step of [0.05, 0.01, 0.1, 0.25, 1]) {
      const d = digitsOf(step);
      // 한 눈금 움직였을 때 표시가 반드시 달라져야 한다.
      expect((0).toFixed(d)).not.toBe(step.toFixed(d));
    }
  });

  it('망가진 step 에도 안 터진다', () => {
    expect(digitsOf(0)).toBe(2);
    expect(digitsOf(NaN)).toBe(2);
    expect(digitsOf(-1)).toBe(2);
  });
});

describe('attachKnobBar — 행 생성', () => {
  it('spec 하나당 행 하나다', () => {
    const a = makeSpec('wns', 0.9), b = makeSpec('wrough', 0.18);
    attachKnobBar(findKnobBar(document)!, [a.spec, b.spec]);
    expect(rows().length).toBe(2);
  });

  it('★ 여러 번 부르면 누적된다 — 기능마다 패널이 갈라지지 않는다', () => {
    const parts = findKnobBar(document)!;
    attachKnobBar(parts, [makeSpec('a', 1).spec]);
    attachKnobBar(parts, [makeSpec('b', 1).spec, makeSpec('c', 1).spec]);
    expect(rows().length).toBe(3);
  });

  it('range 입력에 spec 의 범위가 실린다', () => {
    const s = makeSpec('wflow', 1.1, { min: 0, max: 10, step: 0.1 });
    attachKnobBar(findKnobBar(document)!, [s.spec]);
    const input = $<HTMLInputElement>('.w2-slide-input');
    expect(input.min).toBe('0');
    expect(input.max).toBe('10');
    expect(input.step).toBe('0.1');
  });

  it('★ 행이 하나라도 있어야 바가 보인다 — 빈 상자는 고장으로 읽힌다', () => {
    const panel = $<HTMLElement>('#w2-sliders');
    expect(panel.hidden).toBe(true);
    attachKnobBar(findKnobBar(document)!, [makeSpec('a', 1).spec]);
    expect(panel.hidden).toBe(false);
  });

  it('spec 이 없으면 바가 계속 숨어 있다', () => {
    attachKnobBar(findKnobBar(document)!, []);
    expect($<HTMLElement>('#w2-sliders').hidden).toBe(true);
  });

  it('★ 라벨을 마크업으로 해석하지 않는다 — innerHTML 을 쓰지 않는다', () => {
    // 지금 라벨은 우리가 정한 상수지만, 이 저장소는 이미 프로필명 XSS 를 냈고
    // 처방이 "문자열을 마크업으로 해석시키지 않는다" 였다.
    const s = makeSpec('x', 1, { label: '<img src=x onerror=1>' });
    attachKnobBar(findKnobBar(document)!, [s.spec]);
    expect(document.querySelector('.w2-slide-cap img')).toBeNull();
    expect($('.w2-slide-cap').textContent).toContain('<img');
  });
});

describe('attachKnobBar — 조작', () => {
  it('★ 슬라이더를 밀면 spec.set 이 그 값으로 불린다', () => {
    const s = makeSpec('wns', 0.9);
    attachKnobBar(findKnobBar(document)!, [s.spec]);
    const input = $<HTMLInputElement>('.w2-slide-input');
    input.value = '1.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(s.state.sets).toEqual([1.5]);
  });

  it('★ `input` 을 듣는다(`change` 가 아니다) — 미는 동안 물이 변해야 한다', () => {
    // `change` 만 들으면 손을 뗄 때 한 번 온다. 그러면 "밀어보며 고르는" 일이 안 되고,
    // 이 도구의 존재 이유가 사라진다.
    const s = makeSpec('wns', 0.9);
    attachKnobBar(findKnobBar(document)!, [s.spec]);
    const input = $<HTMLInputElement>('.w2-slide-input');
    for (const v of ['0.5', '1.0', '1.5']) {
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(s.state.sets).toEqual([0.5, 1, 1.5]);
  });

  it('★ 되돌리기 버튼이 spec.reset 을 부른다', () => {
    const s = makeSpec('wns', 0.9);
    attachKnobBar(findKnobBar(document)!, [s.spec]);
    const input = $<HTMLInputElement>('.w2-slide-input');
    input.value = '2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(s.spec.overridden()).toBe(true);

    $<HTMLButtonElement>('.w2-slide-reset').click();
    expect(s.state.resets).toBe(1);
    expect(s.spec.overridden()).toBe(false);
    expect(s.spec.value()).toBe(0.9);   // 기본값으로 돌아왔다
  });

  it('★ 행이 여럿일 때 제 행만 움직인다', () => {
    const a = makeSpec('wns', 0.9), b = makeSpec('wrough', 0.18);
    attachKnobBar(findKnobBar(document)!, [a.spec, b.spec]);
    const inputs = document.querySelectorAll<HTMLInputElement>('.w2-slide-input');
    inputs[1].value = '0.4';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    expect(a.state.sets).toEqual([]);      // 건드리지 않았다
    expect(b.state.sets).toEqual([0.4]);
  });

  it('숫자가 아닌 값은 무시한다', () => {
    const s = makeSpec('wns', 0.9);
    attachKnobBar(findKnobBar(document)!, [s.spec]);
    const input = $<HTMLInputElement>('.w2-slide-input');
    // range 입력은 보통 숫자만 주지만, 이벤트는 밖에서도 만들 수 있다.
    Object.defineProperty(input, 'value', { value: 'zzz', configurable: true });
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(s.state.sets).toEqual([]);
  });

  it('토글이 열고 닫는다', () => {
    attachKnobBar(findKnobBar(document)!, [makeSpec('a', 1).spec]);
    const panel = $<HTMLElement>('#w2-sliders');
    const body = $<HTMLElement>('#w2-sliders-body');
    const toggle = $<HTMLButtonElement>('#w2-sliders-toggle');
    expect(body.hidden).toBe(true);
    toggle.click();
    expect(body.hidden).toBe(false);
    expect(panel.dataset.open).toBe('1');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    expect(body.hidden).toBe(true);
  });
});

describe('attachKnobBar — 표시가 반영 상태를 따라간다', () => {
  it('★ 표시값은 spec.value() 다 — 슬라이더를 어디까지 밀었는지가 아니다', () => {
    // 기능이 값을 클램프하거나 무시할 수 있다. 그때 화면에 없는 값이 떠 있으면
    // "왜 안 먹지"로만 드러난다. `sky-panel.ts` 가 `get()` 을 다시 읽는 것과 같은 이유다.
    const clamped = makeSpec('wns', 0.9, {});
    // 무엇을 밀든 1 을 넘지 않는 기능을 흉내낸다
    let held = 0.9;
    clamped.spec.set = (v) => { held = Math.min(1, v); };
    clamped.spec.value = () => held;
    attachKnobBar(findKnobBar(document)!, [clamped.spec]);

    const input = $<HTMLInputElement>('.w2-slide-input');
    input.value = '2.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect($('.w2-slide-val').textContent).toBe('1.00');  // 요청 2.5 가 아니라 반영된 1
    expect(input.value).toBe('1');                        // 손잡이도 되돌아온다
  });

  it('★ 지정값이면 행에 표시가 선다', () => {
    const s = makeSpec('wns', 0.9);
    attachKnobBar(findKnobBar(document)!, [s.spec]);
    const row = $<HTMLElement>('.w2-slide-row');
    expect(row.dataset.overridden).toBe('0');

    const input = $<HTMLInputElement>('.w2-slide-input');
    input.value = '2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(row.dataset.overridden).toBe('1');

    $<HTMLButtonElement>('.w2-slide-reset').click();
    expect(row.dataset.overridden).toBe('0');
  });

  it('★ 하나라도 지정값이면 접힌 토글에도 신호가 남는다', () => {
    // 접혀 있으면 행 안의 점이 안 보인다. 그 상태로 세션을 끝내면 지정값인 채
    // 남은 것을 모른다.
    const a = makeSpec('wns', 0.9), b = makeSpec('wrough', 0.18);
    attachKnobBar(findKnobBar(document)!, [a.spec, b.spec]);
    const panel = $<HTMLElement>('#w2-sliders');
    expect(panel.dataset.dirty).toBe('0');

    const inputs = document.querySelectorAll<HTMLInputElement>('.w2-slide-input');
    inputs[1].value = '0.4';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    expect(panel.dataset.dirty).toBe('1');

    document.querySelectorAll<HTMLButtonElement>('.w2-slide-reset')[1].click();
    expect(panel.dataset.dirty).toBe('0');
  });

  it('★ sync() 가 바깥 변화를 반영한다 — 시간대가 바뀌면 기본값이 통째로 달라진다', () => {
    // 지정하지 않은 노브는 시간대를 따라간다(낮 .9 → 밤 .35). 안 맞추면 손잡이가
    // 옛 값에 남는다.
    let fallback = 0.9;
    const s = makeSpec('wns', 0);
    s.spec.value = () => fallback;
    const bar = attachKnobBar(findKnobBar(document)!, [s.spec]);
    expect($('.w2-slide-val').textContent).toBe('0.90');

    fallback = 0.35;                       // 밤이 됐다
    expect($('.w2-slide-val').textContent).toBe('0.90');  // 아직 모른다
    bar.sync();
    expect($('.w2-slide-val').textContent).toBe('0.35');
    expect($<HTMLInputElement>('.w2-slide-input').value).toBe('0.35');
  });

  it('같은 값이면 손잡이를 되쓰지 않는다 — 드래그 중에 손가락 밑에서 튄다', () => {
    const s = makeSpec('wns', 0.9);
    const bar = attachKnobBar(findKnobBar(document)!, [s.spec]);
    const input = $<HTMLInputElement>('.w2-slide-input');
    const spy = vi.spyOn(input, 'value', 'set');
    bar.sync();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('attachKnobBar — 정리', () => {
  it('★ dispose 가 행을 걷고 바를 도로 감춘다', () => {
    const bar = attachKnobBar(findKnobBar(document)!, [makeSpec('a', 1).spec]);
    expect(rows().length).toBe(1);
    bar.dispose();
    expect(rows().length).toBe(0);
    expect($<HTMLElement>('#w2-sliders').hidden).toBe(true);
  });

  it('★ dispose 뒤에는 조작이 spec 에 닿지 않는다 — 해제된 자원을 만지면 안 된다', () => {
    const s = makeSpec('a', 1);
    const bar = attachKnobBar(findKnobBar(document)!, [s.spec]);
    const input = $<HTMLInputElement>('.w2-slide-input');
    bar.dispose();
    // 행은 문서에서 빠졌지만 참조는 살아 있다. 이벤트를 쏴도 아무 일이 없어야 한다.
    input.value = '2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(s.state.sets).toEqual([]);
  });

  // ⚠ **이 단언은 2026-08-11 에 뒤집혔다.** 예전에는 *"토글 리스너도 뗀다"* 였고
  // `dispose` 뒤 클릭이 무시되는 것을 옳다고 봤다. 그것이 옳았던 것은 **소비자가 하나뿐일
  // 때**다 — 수면 노브 말고는 아무도 이 바를 안 쓰던 시절의 계약이다.
  //
  // 두 번째 소비자(그림자 데칼)를 붙이면서 계약이 바뀌었다: `toggle` 과 `body` 는
  // **공유 자원**이므로 한 소비자가 떠난다고 토글을 떼면 **남은 소비자의 패널이 안 열린다.**
  // 그래서 토글은 바 단위로 한 번만 걸고 떼지 않는다(근거는 `knob-bar.ts` 의 `wiredToggles`
  // 주석 한 곳, 검수관 권고 태스크 #173 — *"두 번째 소비자를 붙이기 전 필수"*).
  //
  // 리스너가 남는 대가는 무엇인가: 행이 0이면 패널이 `hidden` 이라 **클릭이 도달하지
  // 않는다.** 아래 단언이 그 사실을 못 박는다 — 리스너가 남아도 사용자에게 보이는 동작은
  // 종전과 같다.
  it('dispose 뒤에도 토글 리스너는 남는다 — 그러나 패널이 숨겨져 도달하지 않는다', () => {
    const bar = attachKnobBar(findKnobBar(document)!, [makeSpec('a', 1).spec]);
    bar.dispose();
    const panel = $<HTMLElement>('#w2-sliders');
    expect(panel.hidden).toBe(true); // 감춰졌다 — 사용자는 누를 수 없다
    // 그래도 강제로 쏘면 리스너는 살아 있다. 그것이 다중 소비자를 위한 대가다.
    $<HTMLButtonElement>('#w2-sliders-toggle').click();
    expect(panel.dataset.open).toBe('1');
  });

  it('★ 두 번 붙여도 토글이 한 번만 걸린다 — 두 번째 소비자가 패널을 못 열게 하지 않는다', () => {
    // 이 단언이 없으면 그림자 노브를 붙이는 순간 **패널이 아예 안 열린다**(클릭 한 번에
    // 핸들러가 둘 돌아 열자마자 닫힌다). 화면에서는 "슬라이더가 사라졌다" 로 읽힌다.
    attachKnobBar(findKnobBar(document)!, [makeSpec('a', 1).spec]);
    attachKnobBar(findKnobBar(document)!, [makeSpec('b', 2).spec]);
    const panel = $<HTMLElement>('#w2-sliders');
    $<HTMLButtonElement>('#w2-sliders-toggle').click();
    expect(panel.dataset.open).toBe('1');
    $<HTMLButtonElement>('#w2-sliders-toggle').click();
    expect(panel.dataset.open).toBe('0');
  });

  it('다른 소비자의 행이 남아 있으면 바를 안 감춘다', () => {
    const parts = findKnobBar(document)!;
    const first = attachKnobBar(parts, [makeSpec('a', 1).spec]);
    attachKnobBar(parts, [makeSpec('b', 1).spec]);
    first.dispose();
    expect(rows().length).toBe(1);
    expect($<HTMLElement>('#w2-sliders').hidden).toBe(false);
  });
});
