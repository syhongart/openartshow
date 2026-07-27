// fonts.js — 캔버스/WebGL 텍스트 폰트 정책(런타임 측).
//
// 배경: CSS @font-face는 DOM 텍스트에만 적용된다. 3D 씬의 라벨(작품 플라크·아바타
// 이름표·사진 워터마크·타격 의성어)은 <canvas>에 fillText로 굽는데, 캔버스는
// (1) 폰트 스택을 직접 지정해야 하고 (2) "그리는 그 순간" 폰트가 로드돼 있지 않으면
// 조용히 시스템 폰트로 폴백해 그대로 텍스처에 구워진다(이후 로드돼도 교체 안 됨).
//
// 단일 진실원본(SSOT): 폰트 스택과 @font-face는 frontend/vendor/fonts/fonts.css 한 곳에만
// 정의된다(:root --app-font). 이 모듈은 스택을 재정의하지 않고 그 값을 런타임에 읽어
// 캔버스에 그대로 쓴다. fonts.css는 index.html <head>에 정적 <link>로 로드되므로
// main.js 실행 시점엔 @font-face가 이미 문서에 존재한다.

// 캔버스에 실제로 그리는 weight(한글 나눔 400/700/800 + 라틴 Pretendard 300/400/700).
// 나눔은 unicode-range가 한글로 제한돼 load()에 한글 프로브('가')를 넘겨야 로드된다.
const LOAD_SPECS = [
  ["400 16px 'NanumGothic'", '가'],
  ["700 16px 'NanumGothic'", '가'],
  ["800 16px 'NanumGothic'", '가'],
  ["300 16px 'Pretendard'", undefined],
  ["400 16px 'Pretendard'", undefined],
  ["700 16px 'Pretendard'", undefined],
];

let _stack = null; // fonts.css의 --app-font에서 읽은 폰트 스택(캐시)
let _ready = null;

// --app-font(SSOT)를 읽는다. 보장의 핵심은 index.html <head>의 정적 <link rel=stylesheet>가
// 뒤따르는 module 스크립트(main.js)의 "실행 시작"을 fonts.css 로드 완료까지 막아주는 것 —
// 그래서 이 함수가 도는 시점엔 @font-face·변수가 이미 문서에 존재한다(검수 실측 확인).
// getComputedStyle은 스타일 해석을 강제하는 보조 안전장치.
function readStack() {
  if (_stack) return _stack;
  if (typeof document === 'undefined' || !document.documentElement) return 'sans-serif';
  const v = getComputedStyle(document.documentElement).getPropertyValue('--app-font').trim();
  _stack = v || 'sans-serif'; // fonts.css 미로드 시에만 폴백(정상 경로에선 항상 SSOT 값)
  return _stack;
}

/**
 * 캔버스 텍스트에 쓸 폰트 스택 문자열. fonts.css의 --app-font(SSOT)에서 읽는다.
 * `ctx.font = `700 34px ${getCanvasFont()}`` 형태로 사용.
 * @returns {string}
 */
export function getCanvasFont() {
  return readStack();
}

/**
 * 캔버스 텍스처를 굽기 전에 필요한 weight의 폰트 로드를 보장한다. 한 번만 로드하고
 * 이후엔 캐시된 프로미스를 재사용한다. document.fonts 미지원 환경에서는 즉시 resolve.
 * @returns {Promise<void>}
 */
export function ensureCanvasFonts() {
  if (_ready) return _ready;
  readStack(); // getComputedStyle로 fonts.css 로드 완료 보장 → 아래 load()가 @font-face에 매칭됨
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) {
    _ready = Promise.resolve();
    return _ready;
  }
  const jobs = LOAD_SPECS.map(([spec, text]) =>
    (text ? document.fonts.load(spec, text) : document.fonts.load(spec)).catch(() => {})
  );
  _ready = Promise.all(jobs)
    .then(() => document.fonts.ready)
    .then(() => undefined)
    .catch(() => undefined);
  return _ready;
}
