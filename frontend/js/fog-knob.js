// fog-knob.js — 히어로 종이 wash 강도 노브(`?fog=`)
//
// ── 왜 있나 ────────────────────────────────────────────────────────────────
// 감독 지시 2026-08-15: *"이미지에 안개가 너무 많아"*. **줄이는 방향은 정해졌고 얼마나가
// 열려 있다.** 그리고 그것은 **화면으로만 갈린다** — 값·룩·거리는 글로 설득할 수 없다
// (`CLAUDE.md` 「판단이 갈리는 것은 이 사이클로 결정한다」 1·2항). 그래서 후보를 한 배포에
// 담아 노브로 연다. 감독이 링크 하나로 눌러 비교하고 판정하신다.
//
// 형태는 `?nav=` 노브(2026-08-10, 커밋 `c9811d1`)의 선례를 그대로 따른다.
//
// ── 왜 인라인이 아니라 파일인가 ────────────────────────────────────────────
// `landing.html` 의 CSP 가 `script-src 'self' 'sha256-…'` 4핀이다. 인라인으로 쓰면 그
// 핀을 다시 계산해야 하고(`tests/csp-inline-pins.test.ts` 가 검사한다), 이 저장소가 **세 번
// 덴** 자리가 정확히 그것이다(`scripts/lib/csp-inline.mjs` 머리주석의 실측 이력 — 모바일
// 메뉴 사고를 고친 커밋이 같은 블록의 핀을 깨뜨렸다). 외부 파일은 `'self'` 로 이미 허용되고
// vite 가 `<script type="module" src>` 를 진입점으로 잡아 번들하므로 배포물에도 들어간다.
// **즉 이 노브는 CSP 핀을 한 글자도 건드리지 않는다** — 그것이 이 파일이 파일인 이유다.
//
// ── 이 파일이 지키는 안전장치 ──────────────────────────────────────────────
// **노브가 없으면 아무것도 하지 않는다.** `readFogPeak` 가 `null` 을 돌려주면
// `applyFogKnob` 은 스타일도 DOM 도 **한 군데도** 만지지 않고 즉시 돌아간다. 기본 화면은
// CSS 의 `--hero-wash-peak` 가 그대로 정한다(값과 판정 근거는 `landing.html` 그 선언 옆).
// `tests/fog-knob.test.ts` 가 그 성질을 못 박는다.
//
// ── 값의 의미와 **판정에 쓸 수 있는 범위** ─────────────────────────────────
// `--hero-wash-peak` 는 78% 스톱의 α 이고, 52% 스톱이 `calc(peak * 0.62)` 라 **하나로 전체가
// 따라온다.** 0% 스톱(α0) · 30% 스톱(α0.06) · 100% 스톱(α1.0)은 안 움직인다 — 즉 하늘은
// 그대로이고 하단이 배경으로 흘러드는 성질도 유지된다(실측: peak 0.30 에서도 히어로 하단
// 2% 244,240,228 vs 다음 섹션 246,241,228, RGB 거리 2.63).
//
// ── 대비 판정 — **두 축을 섞지 않는다**(검수관 반려 B1) ────────────────────
// 첫 판본은 `FOG_AA_FLOOR = 0.384` 하나로 판정했고, 그래서 **채택값 0.35 에서 배지가
// «AA 미달» 을 주장했다.** 실측(검수관, 배포본 1280×800): `?fog=0.35` 화면과 노브 없는
// 기본 화면은 **대비값이 소수점까지 동일한데**, 앞쪽에만 미달 낙인이 붙어 있었다.
// 같은 픽셀에 상반된 판정이 라이브에 동시에 존재한 것이다.
//
// 원인은 값이 아니라 **축이 하나였던 것**이다. 0.384 는 **산술 유도**값이고 렌더 기준이
// 아니다 — `landing.html` 의 `--hero-wash-peak` 선언 옆 ④가 실측한 대로 **1280 렌더는
// 산술보다 항상 높다**(+0.26~0.60). 그래서 산술로 미달인 구간이 렌더로는 통과일 수 있고,
// 실제로 0.35 가 그 구간이다(렌더 `.tagline-sub` 1280 **4.56** · 390 **4.98**, 여유 0.06).
// ⚠ 요소 이름을 적는다 — 이 자리를 «tagline» 으로 뭉뚱그린 것이 반려 B4 였다.
// `.tagline-sub` 는 `.tagline-ko`(1280 4.82)의 **자식**이고 둘의 값이 다르다.
//
// 그러므로 판정을 **렌더로 실측된 두 점**으로 한다. 그 사이는 «안 재봤다» 이지 «미달» 이
// 아니다 — 이 저장소의 규율이 *"못 잰 것은 통과가 아니다"* 인데, 그 대우인 *"못 잰 것을
// 미달로 적는 것"* 도 같은 결함이다(둘 다 재지 않은 것에 판정을 붙인다).
// 노브는 어느 구간도 **막지 않는다**: 감독이 «더 줄여도 되는가» 를 화면으로 보시는 것이
// 이 장치의 목적이다. 배지는 **막지 않고 알린다**(`verify-live` 와 같은 원리).

/** URL 파라미터 이름. */
export const FOG_PARAM = 'fog';

/**
 * **산술** 유도 하한. `contrast(--ink, bg(α)) = 4.5` 를 푼 값이고 **렌더 기준이 아니다.**
 * 유도 사슬의 SSOT 는 `landing.html` 의 `--hero-wash-peak` 선언 옆 한 곳.
 *
 * ⚠ **이 상수로 화면 판정을 하지 마라.** 그렇게 해서 채택값이 미달로 낙인찍혔다(위 주석).
 * 남겨 두는 이유는 유도와 렌더가 **얼마나 갈리는지**가 이 자리의 안전 여유를 읽는 축이기
 * 때문이다 — 0.384(산술) vs 0.35(렌더 통과)의 차가 곧 «산술이 보수적인 쪽으로 틀린 폭» 이다.
 */
export const FOG_ARITH_FLOOR = 0.384;

/** **렌더로** AA(4.5:1) 통과가 실측된 가장 낮은 값. 감독 채택값과 같다. */
export const FOG_RENDER_PASS_FLOOR = 0.35;

/** **렌더로** AA 미달이 실측된 가장 높은 값(`fog=0`, 1280: `.tagline-sub` 2.66 · h1 2.62). */
export const FOG_RENDER_FAIL_MAX = 0;

/**
 * 렌더 실측 기준 판정. **세 값이고, 가운데가 「안 재봤다」다.**
 *
 * `'unknown'` 을 `'fail'` 로 접지 않는 이유: 접으면 배지가 재지 않은 구간에 대해 미달을
 * **주장**하게 된다. 판정용 노브에서 없는 근거로 붙인 라벨은 감독의 비교를 오염시킨다 —
 * `readFogPeak` 이 범위 밖을 클램프하지 않고 무시하는 것과 같은 이유다.
 *
 * @param {number} v
 * @returns {'pass'|'unknown'|'fail'}
 */
export function fogVerdict(v) {
  if (v >= FOG_RENDER_PASS_FLOOR) return 'pass';
  if (v <= FOG_RENDER_FAIL_MAX) return 'fail';
  return 'unknown';
}

/**
 * `?fog=` 를 읽는다. **모르는 값은 전부 `null`(= 기본값 유지)로 떨어진다** — 오타·빈 값·
 * 범위 밖·파라미터 부재가 전부 같은 안전한 결과를 낸다. 여기서 예외를 던지면 조용한 콘솔
 * 에러가 되고, 감독이 링크를 잘못 눌렀을 때 화면이 아니라 로그로만 알려주게 된다.
 *
 * 범위는 `[0, 1]` — CSS 알파의 정의역이다. 밖의 값을 **클램프하지 않고 무시**하는 이유는
 * `?fog=45`(퍼센트로 오해)가 조용히 1.0 으로 붙어 «더 뿌옇게» 나오는 것을 막기 위해서다.
 * 판정용 노브에서 잘못 붙은 값은 **판정 자체를 오염시킨다.**
 *
 * @param {string} search `location.search` 형태(`'?fog=0.45'`). 빈 문자열 허용.
 * @returns {number|null}
 */
export function readFogPeak(search) {
  let raw = '';
  try {
    raw = new URLSearchParams(String(search || '')).get(FOG_PARAM) || '';
  } catch {
    return null; // URLSearchParams 가 던질 입력은 없지만, 파싱은 실패해도 기본값으로 산다.
  }
  const t = raw.trim();
  if (t === '') return null;
  // `Number` 는 빈 문자열·공백을 0 으로 읽으므로 위에서 먼저 거른다. `'0.4x'` 는 NaN.
  const v = Number(t);
  if (!Number.isFinite(v) || v < 0 || v > 1) return null;
  return v;
}

/**
 * 노브를 적용한다. **값이 없으면 아무것도 하지 않는다.**
 *
 * @param {string} search `location.search`
 * @param {HTMLElement} root `document.documentElement`
 * @param {Document} [doc] 배지를 붙일 문서. 생략하면 배지 없음(테스트에서 스타일 축만 볼 때).
 * @returns {number|null} 적용된 값, 없으면 null
 */
export function applyFogKnob(search, root, doc) {
  const v = readFogPeak(search);
  if (v === null) return null;
  root.style.setProperty('--hero-wash-peak', String(v));
  if (doc) mountBadge(doc, v);
  return v;
}

/**
 * 지금 어느 후보를 보고 있는지 화면에 적는다. **노브가 있을 때만 생긴다.**
 *
 * 왜 필요한가: 값이 연속이라 링크를 여러 개 눌러 비교하면 «지금 어느 것인지» 가 화면에서
 * 안 보인다. `?nav=` 는 후보가 넷뿐이고 메뉴 구성이 눈에 보여 필요 없었지만, wash 강도는
 * **인접 후보끼리 육안으로 거의 같다**(실측: 0.45·0.42·0.384 는 1280 크롭에서 구별 불가).
 * 라벨이 없으면 감독이 비교한 것이 무엇인지 모르는 채 판정하게 된다.
 *
 * 스타일은 인라인이다 — CSS 파일을 건드리면 기본 경로에 영향이 갈 수 있고, 이 배지는
 * 판정이 끝나면 노브와 함께 걷힌다.
 * ⚠ **글자에 알파를 얹지 않는다**(`landing.html` `:root` 주석의 규칙) — 불투명 색만 쓴다.
 *
 * 문구는 `fogVerdict` 의 세 값을 그대로 적는다. **`pass` 에 아무 말도 안 붙이는 것이
 * 요점이다** — 채택값이 그 구간이고, 거기에 경고를 달았던 것이 반려 사유였다.
 */
const BADGE = {
  pass:    { text: v => `fog=${v}`, bg: '#17140f' },
  unknown: { text: v => `fog=${v}  ·  대비 미측정(렌더 통과 하한 ${FOG_RENDER_PASS_FLOOR})`, bg: '#6b5324' },
  fail:    { text: v => `fog=${v}  ·  본문 대비 AA 미달(렌더 실측)`, bg: '#7a2e2e' },
};

function mountBadge(doc, v) {
  const el = doc.createElement('div');
  const b = BADGE[fogVerdict(v)];
  el.setAttribute('data-fog-badge', '');
  el.textContent = b.text(v);
  el.style.cssText = [
    'position:fixed', 'z-index:99999', 'left:50%', 'bottom:14px', 'transform:translateX(-50%)',
    'padding:6px 12px', 'border-radius:999px',
    `background:${b.bg}`, 'color:#f6f1e4',
    'font:600 12px/1.2 system-ui,sans-serif', 'letter-spacing:0.04em',
    'pointer-events:none', 'white-space:nowrap',
  ].join(';');
  (doc.body || doc.documentElement).appendChild(el);
}

// 브라우저에서만 자동 실행. 테스트는 위 순수 함수를 직접 부른다.
if (typeof document !== 'undefined' && typeof location !== 'undefined') {
  applyFogKnob(location.search, document.documentElement, document);
}
