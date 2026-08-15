// @vitest-environment jsdom
//
// `?fog=` 노브(`frontend/js/fog-knob.js`)의 검출력.
//
// ⚠ **이 파일이 지켜야 하는 것은 「기본 경로 불변」이다.** 노브는 라이브 페이지에 얹히는
// 코드이고, 감독 판정이 끝나면 걷힌다. 그 사이에 노브가 **기본 화면을 바꾸면** 아무도
// 모른다 — 스모크도 `verify-live` 도 파라미터 없이 열기 때문이다. 그래서 「값이 없으면
// 스타일을 한 번도 안 만진다」를 **호출 카운트로** 못 박는다(결과 비교가 아니라 호출 자체).
//
// `nav-knob.test.ts`(커밋 `c9811d1`)가 A 경로를 **적용 전후 outerHTML 바이트 동일**로 못
// 박은 것과 같은 자리다.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFogPeak, applyFogKnob, FOG_PARAM, FOG_AA_FLOOR } from '../frontend/js/fog-knob.js';

describe('readFogPeak — 모르는 값은 전부 null(기본값 유지)로 떨어진다', () => {
  it('유효한 값을 읽는다', () => {
    expect(readFogPeak('?fog=0.45')).toBe(0.45);
    expect(readFogPeak('?fog=0.7')).toBe(0.7);
    expect(readFogPeak('?fog=0')).toBe(0);
    expect(readFogPeak('?fog=1')).toBe(1);
    expect(readFogPeak('?fog=.384')).toBe(0.384);
    expect(readFogPeak('?fog= 0.45 ')).toBe(0.45);       // 공백은 다듬는다
    expect(readFogPeak('?a=1&fog=0.5&b=2')).toBe(0.5);   // 다른 파라미터와 공존
  });

  it('파라미터가 없거나 비면 null', () => {
    expect(readFogPeak('')).toBeNull();
    expect(readFogPeak('?')).toBeNull();
    expect(readFogPeak('?nav=b')).toBeNull();
    expect(readFogPeak('?fog=')).toBeNull();
    expect(readFogPeak('?fog=   ')).toBeNull();
    expect(readFogPeak(undefined as unknown as string)).toBeNull();
    expect(readFogPeak(null as unknown as string)).toBeNull();
  });

  it('숫자가 아니면 null — `Number("")===0` 구멍을 막았는지 본다', () => {
    expect(readFogPeak('?fog=abc')).toBeNull();
    expect(readFogPeak('?fog=0.4x')).toBeNull();
    expect(readFogPeak('?fog=NaN')).toBeNull();
    expect(readFogPeak('?fog=Infinity')).toBeNull();
  });

  it('범위 밖은 **클램프하지 않고 무시**한다 — 잘못 붙은 값이 판정을 오염시키면 안 된다', () => {
    // `?fog=45`(퍼센트로 오해)가 조용히 1.0 으로 붙으면 감독이 「더 뿌옇다」를 보게 된다.
    expect(readFogPeak('?fog=45')).toBeNull();
    expect(readFogPeak('?fog=1.01')).toBeNull();
    expect(readFogPeak('?fog=-0.1')).toBeNull();
  });
});

describe('applyFogKnob — 노브가 없으면 **아무것도 하지 않는다**', () => {
  let root: HTMLElement;
  let calls: Array<[string, string]>;

  beforeEach(() => {
    document.body.innerHTML = '';
    calls = [];
    root = document.createElement('html');
    // setProperty 를 감싸 **호출 자체**를 센다. 「값이 같더라도 만지지 않았는가」가 축이다.
    const orig = root.style.setProperty.bind(root.style);
    root.style.setProperty = ((k: string, v: string) => { calls.push([k, v]); return orig(k, v); }) as never;
  });

  it('값이 없으면 setProperty 호출 0 · 배지 0', () => {
    for (const s of ['', '?', '?nav=b', '?fog=', '?fog=abc', '?fog=45', '?fog=-1']) {
      expect(applyFogKnob(s, root, document)).toBeNull();
    }
    expect(calls).toEqual([]);
    expect(document.querySelectorAll('[data-fog-badge]').length).toBe(0);
  });

  it('값이 있으면 --hero-wash-peak 를 정확히 한 번 덮어쓴다', () => {
    expect(applyFogKnob('?fog=0.3', root, document)).toBe(0.3);
    expect(calls).toEqual([['--hero-wash-peak', '0.3']]);
    expect(root.style.getPropertyValue('--hero-wash-peak')).toBe('0.3');
  });

  it('doc 없이 부르면 배지를 안 만든다(스타일 축만 쓰는 호출)', () => {
    expect(applyFogKnob('?fog=0.5', root)).toBe(0.5);
    expect(document.querySelectorAll('[data-fog-badge]').length).toBe(0);
  });
});

describe('배지 — 막지 않고 알린다', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('값을 화면에 적는다 — 인접 후보가 육안으로 같아서 라벨이 없으면 판정이 오염된다', () => {
    applyFogKnob('?fog=0.45', document.createElement('html'), document);
    const b = document.querySelector('[data-fog-badge]');
    expect(b).not.toBeNull();
    expect(b!.textContent).toContain('0.45');
  });

  it('AA 하한 아래에서는 미달을 **적되 막지는 않는다**', () => {
    const root = document.createElement('html');
    const below = FOG_AA_FLOOR - 0.05;
    expect(applyFogKnob(`?fog=${below}`, root, document)).toBe(below);   // 값은 적용된다
    expect(root.style.getPropertyValue('--hero-wash-peak')).toBe(String(below));
    expect(document.querySelector('[data-fog-badge]')!.textContent).toContain('AA 미달');
  });

  it('하한 이상에서는 경고를 안 단다 — 경계에서 방향이 뒤집히는지 본다', () => {
    applyFogKnob(`?fog=${FOG_AA_FLOOR}`, document.createElement('html'), document);
    expect(document.querySelector('[data-fog-badge]')!.textContent).not.toContain('AA 미달');
  });
});

describe('상수 — landing.html 과 어긋나면 여기서 말한다', () => {
  it('파라미터 이름이 바뀌면 감독께 드린 링크가 죽는다', () => {
    expect(FOG_PARAM).toBe('fog');
  });

  it('AA 하한은 유도값 0.384 다(유도 사슬은 landing.html 주석 한 곳)', () => {
    expect(FOG_AA_FLOOR).toBe(0.384);
  });
});
