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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  readFogPeak, applyFogKnob, fogVerdict,
  FOG_PARAM, FOG_ARITH_FLOOR, FOG_RENDER_PASS_FLOOR, FOG_RENDER_FAIL_MAX,
} from '../frontend/js/fog-knob.js';

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

describe('fogVerdict — **산술 유도 하한과 렌더 기준 판정을 섞지 않는다**(검수관 반려 B1)', () => {
  // 첫 판본은 하한 하나(0.384)로 판정했고, 그래서 **채택값 0.35 에서 배지가 「AA 미달」을
  // 주장했다.** 노브 없는 기본 화면과 `?fog=0.35` 는 대비값이 소수점까지 같은데 앞쪽에만
  // 낙인이 붙었다 — 같은 픽셀에 상반된 판정이 라이브에 동시에 존재한 것이다.
  it('채택값(0.35)은 pass 다 — 이 한 줄이 반려 사유를 직접 막는다', () => {
    expect(fogVerdict(0.35)).toBe('pass');
    expect(fogVerdict(FOG_RENDER_PASS_FLOOR)).toBe('pass');
    expect(fogVerdict(0.7)).toBe('pass');
    expect(fogVerdict(1)).toBe('pass');
  });

  it('산술 하한(0.384)과 렌더 통과 하한(0.35) **사이**는 pass 다 — 옛 축이면 fail 이었다', () => {
    // 두 값 사이가 갈라지는 구간이고, 축을 다시 하나로 접으면 여기서 먼저 깨진다.
    expect(FOG_ARITH_FLOOR).toBeGreaterThan(FOG_RENDER_PASS_FLOOR);
    expect(fogVerdict(0.36)).toBe('pass');
    expect(fogVerdict(0.38)).toBe('pass');
  });

  it('통과 하한 아래는 fail 이 아니라 **unknown** — 안 재본 것에 판정을 붙이지 않는다', () => {
    expect(fogVerdict(0.34)).toBe('unknown');
    expect(fogVerdict(0.2)).toBe('unknown');
    expect(fogVerdict(0.01)).toBe('unknown');
  });

  it('렌더로 미달이 실측된 점만 fail', () => {
    expect(fogVerdict(0)).toBe('fail');
    expect(fogVerdict(FOG_RENDER_FAIL_MAX)).toBe('fail');
  });
});

describe('배지 — 막지 않고 알린다', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  const badge = (fog: number | string) => {
    applyFogKnob(`?fog=${fog}`, document.createElement('html'), document);
    return document.querySelector('[data-fog-badge]')!.textContent!;
  };

  it('값을 화면에 적는다 — 인접 후보가 육안으로 같아서 라벨이 없으면 판정이 오염된다', () => {
    expect(badge(0.45)).toContain('0.45');
  });

  it('**채택값에는 아무 경고도 안 붙는다** — 반려 사유가 정확히 이것이었다', () => {
    const t = badge(0.35);
    expect(t).toContain('0.35');
    expect(t).not.toContain('미달');
    expect(t).not.toContain('미측정');
  });

  it('안 재본 구간은 「미측정」이라고 적는다 — 미달이라고 적지 않는다', () => {
    const t = badge(0.2);
    expect(t).toContain('미측정');
    expect(t).not.toContain('미달');
  });

  it('렌더 실측 미달 구간에서만 미달을 **적되 막지는 않는다**', () => {
    const root = document.createElement('html');
    expect(applyFogKnob('?fog=0', root, document)).toBe(0);          // 값은 적용된다
    expect(root.style.getPropertyValue('--hero-wash-peak')).toBe('0');
    expect(document.querySelector('[data-fog-badge]')!.textContent).toContain('미달');
  });
});

describe('상수 — landing.html 과 어긋나면 여기서 말한다', () => {
  it('파라미터 이름이 바뀌면 감독께 드린 링크가 죽는다', () => {
    expect(FOG_PARAM).toBe('fog');
  });

  it('산술 유도 하한은 0.384 다(유도 사슬은 landing.html 주석 한 곳)', () => {
    expect(FOG_ARITH_FLOOR).toBe(0.384);
  });

  // 값 미러링 방지. `FOG_RENDER_PASS_FLOOR` 와 `--hero-wash-peak` 는 **같은 값이어야 하는
  // 것이 아니라** 채택값이 실측 통과 구간 안에 있어야 하는 관계다(채택값을 올리면 갈라진다).
  // 그래서 상등이 아니라 **부등식**으로 못 박는다 — 상등으로 적으면 정당한 변경이 FAIL 한다.
  it('라이브 채택값이 「렌더 통과가 실측된 구간」 안에 있다', () => {
    // `import.meta.url` 을 쓰지 않는다 — jsdom 환경에서는 http 스킴이라 `readFileSync` 가 던진다.
    const css = readFileSync(resolve(process.cwd(), 'frontend/landing.html'), 'utf8');
    const m = css.match(/--hero-wash-peak:\s*([0-9.]+)\s*;/);
    expect(m, '`--hero-wash-peak` 선언을 landing.html 에서 못 찾았다').not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(FOG_RENDER_PASS_FLOOR);
  });
});

// ── 배선 축 — **모듈 top-level 자동실행**(검수관 조건 C2) ──────────────────────
// 위 describe 들은 전부 순수 함수를 **직접** 부른다. 그래서 «그 함수가 실제로 페이지에
// 연결돼 있는가» 는 어느 검사에도 안 걸렸다 — 판정/집행 경계를 건너는 지점은 아무도 안 본다는
// 이 저장소의 상시 결함이 그대로 재현된 자리다.
//
// **뮤테이션 실측**(2026-08-15 · 대조군 21 passed · exit 0). 왼쪽이 반려 시점, 오른쪽이 지금:
//   M9  `location.search` → `location.href`   0 failed → **1 failed**  (URLSearchParams 가
//                                              경로째 키로 먹어 `get('fog')` 가 null 이 된다)
//   M10 자동실행 블록 통째 삭제               0 failed → **1 failed**
//   M11 `documentElement` → `body`            0 failed → **1 failed**  (`:root` 가 아닌 곳에 붙는다)
//   M13 값 유무와 무관하게 무조건 setProperty  0 failed → **3 failed**  (기본 경로 오염 —
//                                              이 파일의 제1 관심사인데 검출력이 0이었다)
// 판정 축(B1)도 함께 되살려 봤다:
//   M14 산술 하한 하나로 판정(= 반려 사유 그 자체)          **5 failed**
//   M15 `unknown` 을 `fail` 로 접기                          **2 failed**
//   M16 통과 하한을 라이브 채택값 위로 올림(0.5)            **4 failed**
//
// ⚠ **이 실측을 얻기까지 하네스가 한 번 무효였다** — 첫 회차는 대조군까지 `exit 1` 이었고
// (복사본에 `scripts/` 가 없어 `vite.config.js` 가 esbuild 단계에서 죽었다) 그 상태의
// 「0 failed」는 **검출 실패가 아니라 측정 실패**였다. 이 저장소에서 검사 하네스가 무효였던
// 것이 이번이 네 번째이고, 매번 «성공 케이스가 exit 0 인지» 를 안 봐서 놓쳤다.
// 그래서 스크립트가 대조군 종료코드를 먼저 확인하고 아니면 **판정을 내지 않고 멈춘다.**
describe('배선 — import 만으로 실제로 붙는가', () => {
  beforeEach(() => {
    vi.resetModules();                                  // top-level 을 매번 다시 실행시킨다
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
  });

  it('M9·M10·M11 — 노브가 있으면 documentElement 에 붙고 배지가 뜬다', async () => {
    window.history.replaceState({}, '', '/landing.html?fog=0.5');
    await import('../frontend/js/fog-knob.js');
    expect(document.documentElement.style.getPropertyValue('--hero-wash-peak')).toBe('0.5');
    expect(document.querySelectorAll('[data-fog-badge]').length).toBe(1);
  });

  it('M13 — 노브가 없으면 **style 속성 자체가 안 생긴다**', async () => {
    window.history.replaceState({}, '', '/landing.html');
    await import('../frontend/js/fog-knob.js');
    // `getAttribute` 로 본다: `setProperty(k, '')` 는 값이 비어도 속성을 만든다.
    expect(document.documentElement.getAttribute('style')).toBeNull();
    expect(document.querySelectorAll('[data-fog-badge]').length).toBe(0);
  });

  it('M13 — 오타·범위 밖 파라미터도 기본 경로를 안 만진다', async () => {
    window.history.replaceState({}, '', '/landing.html?fog=45&nav=b');
    await import('../frontend/js/fog-knob.js');
    expect(document.documentElement.getAttribute('style')).toBeNull();
    expect(document.querySelectorAll('[data-fog-badge]').length).toBe(0);
  });
});
