// @vitest-environment jsdom
// @vitest-environment-options { "url": "http://localhost/app/index.html" }
//
// 캐릭터 딥링크 — HUD 통합. 검수관 게이트 명세 **G-B · G-C · G-D(집행) · G-F**.
//
// ── 왜 이 파일이 생겼나 (검수관 반려, 2026-08-08) ─────────────────────────
// 첫 판본은 테스트가 0건이었고 블로커 3건이 들어갔다. 셋의 뿌리는 하나였다 —
// **1회 명령을 세션 상태로 남긴 것.** 그래서 여기서 가장 무겁게 보는 것은 기능이
// 아니라 **수명**이다: 파라미터가 소비되는가, 복귀 훅이 1회로 끝나는가.
//
// ── 판정 축 (검수관 지정) ─────────────────────────────────────────────────
// **`opacity` 로 재지 마라.** jsdom 은 스타일시트를 안 읽고, 실브라우저에서도
// transition 0.3s·`prefers-reduced-motion` 분기에 좌우된다. 여기서는
// **`overlay.classList.contains('lu-open')` 과 `uiState.chibiOpen`** 으로 본다.
//
// ── 실제 편집기를 돌린다 ──────────────────────────────────────────────────
// `createChibiMaker` 를 스텁하지 않는다. 스텁하면 이 변경의 핵심(`close()` 가 4경로의
// 단일 지점이고 거기서 콜백이 1회 돈다)이 **재현물끼리의 약속**이 되어 아무것도
// 보증하지 않는다. three 는 jsdom 에서 로드되고, WebGL 이 필요한 것은 `open()` 의
// 렌더러뿐이라 예외를 삼키고 진행한다.
//
// ── 못 보는 것 ────────────────────────────────────────────────────────────
// 실브라우저 렌더·CSS·포커스, 실기기 터치, WebGPU. 그리고 **CI 스모크는 이 경로를
// 한 번도 열지 않는다**(`smoke/config.mjs` 가 `/app/index.html` 을 파라미터 없이만
// 연다) — 딥링크 세션의 콘솔 에러 0 은 측정된 적이 없다.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── WebGL 렌더러만 스텁한다 ───────────────────────────────────────────────
// jsdom 에는 WebGL 이 없어 `new THREE.WebGLRenderer()` 가 던진다. **three 전체를
// 스텁하지 않는다** — 씬 그래프·재질·지오메트리는 실제 코드가 그대로 돌아야 편집기
// `open()`/`close()` 의 진짜 경로를 지난다. 화면에 그리는 부분만 갈아끼운다.
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class StubRenderer {
    domElement: HTMLCanvasElement;
    shadowMap = { enabled: false, type: 0 };
    constructor(opts: { canvas?: HTMLCanvasElement } = {}) {
      this.domElement = opts.canvas ?? document.createElement('canvas');
    }
    setPixelRatio() {}
    setSize() {}
    setClearColor() {}
    render() {}
    dispose() {}
    getContext() { return null; }
    setAnimationLoop() {}
  }
  return { ...actual, WebGLRenderer: StubRenderer };
});
import { buildAvatarDeepLink, AVATAR_PARAM, BACK_PARAM } from '../frontend/js/avatar-deeplink.js';

// ── 캔버스 2D 스텁 ────────────────────────────────────────────────────────
// jsdom 에는 2D 컨텍스트도 없다(`node-canvas` 미설치). 편집기는 배경 그라데이션·벽지·
// 얼굴을 **절차 생성 CanvasTexture** 로 그리므로(외부 에셋 0 원칙의 결과다) 그 자리가
// 전부 `getContext('2d')` 를 지난다. 없으면 `open()` 이 `createLinearGradient` 에서
// 죽고, 그러면 "편집기가 안 열렸다" 와 "환경이 부족하다" 가 구별되지 않는다.
//
// 픽셀 결과는 보지 않는다 — 이 파일이 재는 것은 **딥링크 배선**이다.
function make2dStub(canvas: HTMLCanvasElement) {
  const gradient = { addColorStop() {} };
  const store: Record<string, unknown> = {
    canvas, globalAlpha: 1, lineWidth: 1, font: '10px sans-serif',
    fillStyle: '#000', strokeStyle: '#000', globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: true, lineCap: 'butt', lineJoin: 'miter',
    textAlign: 'start', textBaseline: 'alphabetic', shadowBlur: 0, shadowColor: 'transparent',
    filter: 'none', miterLimit: 10, lineDashOffset: 0,
  };
  return new Proxy(store, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient'
        || prop === 'createConicGradient') return () => gradient;
      if (prop === 'createPattern') return () => null;
      if (prop === 'getImageData') {
        return (_x: number, _y: number, w: number, h: number) =>
          ({ data: new Uint8ClampedArray(Math.max(4, (w || 1) * (h || 1) * 4)), width: w || 1, height: h || 1 });
      }
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'getLineDash') return () => [];
      return () => {};
    },
    set(target, prop: string, value) { target[prop] = value; return true; },
  });
}

HTMLCanvasElement.prototype.getContext = function patched(this: HTMLCanvasElement, type: string) {
  if (type === '2d') return make2dStub(this) as unknown as CanvasRenderingContext2D;
  return null;
} as typeof HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=';

/** `location` 을 갈아끼운다. jsdom 의 `location` 은 직접 대입이 막혀 있다. */
function setSearch(search: string) {
  const url = `http://localhost/app/index.html${search}`;
  window.history.replaceState(null, '', url);
}

/** 모듈 상태(`initialized` 가드)를 버리고 HUD 를 새로 부팅한다. */
async function bootHud() {
  vi.resetModules();
  document.body.innerHTML = '';
  const hud = await import('../frontend/js/ui-hud.js');
  hud.initUI({});
  return hud;
}

const overlay = () => document.getElementById('lu-chibi-maker');
const isOpen = () => overlay()?.classList.contains('lu-open') ?? false;

/** 원본 `location`. G-C 가 프록시로 갈아끼우므로 매 테스트 시작에 되돌린다. */
const REAL_LOCATION = window.location;

/** `location.href` 대입을 가로채 값만 모은다(jsdom 은 실제 이동을 못 한다). */
function interceptNavigation(sink: string[]) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: new Proxy(REAL_LOCATION, {
      set(target, prop, value) {
        if (prop === 'href') { sink.push(String(value)); return true; }
        return Reflect.set(target, prop, value);
      },
      get(target, prop) {
        const v = Reflect.get(target, prop);
        return typeof v === 'function' ? v.bind(target) : v;
      },
    }),
  });
}

beforeEach(() => {
  localStorage.clear();
  // 프록시가 남으면 다음 테스트의 `location.search` 판정이 오염된다 — 실제로 그렇게
  // 새어 G-C 전체가 "편집기가 안 열림" 으로 보였다.
  Object.defineProperty(window, 'location', { configurable: true, value: REAL_LOCATION });
  setSearch('');
});

// ── G-B · 왕복 계약 ───────────────────────────────────────────────────────
describe('G-B — 마이페이지가 만든 링크로 편집기가 열린다', () => {
  it('하네스 생존 확인 — 편집기 자체는 열린다', async () => {
    // **맨 앞에 둔다**(검수관 공통 규율). 스텁·환경이 불완전하면 열림 판정 *전에*
    // 죽어 "안 열림" 과 구별되지 않는다. 여기가 통과해야 아래 판정이 의미를 갖는다.
    const hud = await bootHud();
    expect(overlay(), '편집기 오버레이가 DOM 에 없다').toBeTruthy();
    expect(isOpen()).toBe(false);
  });

  it('**생산자가 만든 URL 로 부팅하면 열린다** — 이 파일의 핵심 단언', async () => {
    const url = buildAvatarDeepLink('./index.html', 'mypage');
    setSearch(url.slice(url.indexOf('?')));
    await bootHud();
    expect(isOpen()).toBe(true);
  });

  it('back 없이 avatar 만 있어도 열린다', async () => {
    setSearch(`?${AVATAR_PARAM}=1`);
    await bootHud();
    expect(isOpen()).toBe(true);
  });
});

// ── G-F · 회귀 — 파라미터가 없으면 아무것도 달라지지 않는다 ───────────────
// **G-B 와 반드시 짝이다.** G-B 만 있으면 "항상 연다" 뮤테이션이 통과한다.
describe('G-F — 평소 미술관은 편집기가 열리지 않는다', () => {
  it('파라미터가 없으면 닫힌 채로 뜬다', async () => {
    await bootHud();
    expect(isOpen()).toBe(false);
  });

  it('다른 파라미터만 있어도 열리지 않는다', async () => {
    setSearch('?g=abc&debug=perf');
    await bootHud();
    expect(isOpen()).toBe(false);
  });

  it('avatar 값이 켜짐이 아니면 열리지 않는다', async () => {
    setSearch(`?${AVATAR_PARAM}=0`);
    await bootHud();
    expect(isOpen()).toBe(false);
  });
});

// ── G-D 집행 · 파라미터를 실제로 소비한다 ─────────────────────────────────
// 순수 축(`stripDeepLinkParams`)은 `avatar-deeplink.test.ts` 가 본다. 여기서는
// **그 값이 실제로 `location` 에 반영되는가** — 경계를 건너는 지점이다.
describe('G-D — 딥링크가 URL 에서 사라진다 (B1·B3 의 뿌리)', () => {
  it('부팅 후 avatar·back 이 URL 에 없다', async () => {
    const url = buildAvatarDeepLink('./index.html', 'mypage');
    setSearch(url.slice(url.indexOf('?')));
    await bootHud();
    expect(window.location.search.includes(AVATAR_PARAM)).toBe(false);
    expect(window.location.search.includes(BACK_PARAM)).toBe(false);
  });

  it('**다른 파라미터는 살아남는다** — 갤러리 전환이 조용히 깨지지 않게', async () => {
    setSearch(`?g=abc&${AVATAR_PARAM}=1&${BACK_PARAM}=mypage&debug=perf`);
    await bootHud();
    expect(window.location.search).toBe('?g=abc&debug=perf');
  });

  it('히스토리를 늘리지 않는다 — 뒤로가기로 편집기가 다시 열리면 안 된다', async () => {
    const before = window.history.length;
    setSearch(`?${AVATAR_PARAM}=1&${BACK_PARAM}=mypage`);
    await bootHud();
    // `replaceState` 이므로 길이가 그대로다(`pushState` 면 늘어난다).
    expect(window.history.length).toBe(before);
  });
});

// ── G-C · 복귀 경로 전수 ──────────────────────────────────────────────────
// **4경로를 개별 `it` 으로 둔다**(검수관 명세). 하나로 묶으면 어느 경로가 죽었는지
// 안 나오고, 한 경로만 죽이는 뮤테이션이 통과한다.
//
// 첫 판본이 저장(✓)·닫기(×) 버튼에만 리스너를 걸어 **ESC·배경클릭에서 복귀가 안 됐다**
// (검수관 B2). 지금은 `close()` 단일 지점이라 네 경로가 전부 같은 곳을 지난다 —
// 편집기 코드가 *"경로가 늘면 여기로 모아라"* 라고 적어 둔 그 자리다.
describe('G-C — 닫는 네 경로 모두 복귀한다', () => {
  let hrefs: string[];

  async function bootWithBack() {
    hrefs = [];
    setSearch(`?${AVATAR_PARAM}=1&${BACK_PARAM}=mypage`);
    const hud = await bootHud();
    interceptNavigation(hrefs);
    expect(isOpen(), '테스트 전제: 편집기가 열려 있어야 한다').toBe(true);
    return hud;
  }

  it('① 저장(✓)', async () => {
    await bootWithBack();
    document.getElementById('lu-am-save')!.click();
    expect(hrefs).toEqual(['./mypage.html']);
  });

  it('② 닫기(×)', async () => {
    await bootWithBack();
    document.getElementById('lu-am-close')!.click();
    expect(hrefs).toEqual(['./mypage.html']);
  });

  it('③ ESC — 첫 판본에서 빠져 있던 경로', async () => {
    await bootWithBack();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(hrefs).toEqual(['./mypage.html']);
  });

  it('④ 배경 클릭 — 첫 판본에서 빠져 있던 경로', async () => {
    await bootWithBack();
    overlay()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(hrefs).toEqual(['./mypage.html']);
  });

  it('**복귀 훅은 1회성이다** — 세션에 남으면 미술관에서 저장할 때마다 튕긴다', async () => {
    // 검수관 B1 의 회귀 축. 한 번 복귀한 뒤 편집기를 다시 열고 닫아도
    // **더는 이동하지 않아야** 한다.
    await bootWithBack();
    document.getElementById('lu-am-close')!.click();
    expect(hrefs.length).toBe(1);

    // 두 번째 닫기 — 미술관에서 편집기를 다시 열고 닫는 상황에 해당한다.
    // 훅이 남아 있으면 여기서 또 이동하고, 그것이 B1(저장하면 튕겨 나감)의 형태다.
    document.getElementById('lu-am-close')!.click();
    document.getElementById('lu-am-save')!.click();
    expect(hrefs.length, '두 번째 닫기에서도 이동했다 — 훅이 세션에 남아 있다').toBe(1);
  });

  it('back 이 없으면 닫아도 이동하지 않는다', async () => {
    hrefs = [];
    setSearch(`?${AVATAR_PARAM}=1`);
    await bootHud();
    interceptNavigation(hrefs);
    document.getElementById('lu-am-close')!.click();
    expect(hrefs).toEqual([]);
  });

  it('화이트리스트 밖 back 은 이동하지 않는다 — 열린 리다이렉트 차단(집행)', async () => {
    hrefs = [];
    setSearch(`?${AVATAR_PARAM}=1&${BACK_PARAM}=https%3A%2F%2Fevil.example`);
    await bootHud();
    interceptNavigation(hrefs);
    document.getElementById('lu-am-close')!.click();
    expect(hrefs).toEqual([]);
  });
});
