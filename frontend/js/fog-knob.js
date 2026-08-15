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
// ⚠ **0.384 아래는 본문 대비 AA(4.5:1) 미달이다** — 1280 폭에서 `.tagline-ko` 가 하한이고,
// 그 값은 이 그림에 대해 **유도**된 것이다(근거·유도 사슬은 `landing.html` 의
// `--hero-wash-peak` 선언 옆 한 곳). 노브는 그 아래도 **막지 않는다**: 판정용 비교 자료이고,
// 감독이 «더 줄여도 되는가» 를 화면으로 보시는 것이 이 장치의 목적이다. 대신 미달 구간에서는
// 배지가 그 사실을 화면에 적는다 — **막지 않고 알린다**(`verify-live` 와 같은 원리).

/** URL 파라미터 이름. */
export const FOG_PARAM = 'fog';

/** AA 4.5:1 하한(유도값). 이 아래에서 배지가 경고를 단다. SSOT 는 `landing.html` 주석. */
export const FOG_AA_FLOOR = 0.384;

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
 */
function mountBadge(doc, v) {
  const el = doc.createElement('div');
  const low = v < FOG_AA_FLOOR;
  el.setAttribute('data-fog-badge', '');
  el.textContent = low ? `fog=${v}  ·  AA 미달(하한 ${FOG_AA_FLOOR})` : `fog=${v}`;
  el.style.cssText = [
    'position:fixed', 'z-index:99999', 'left:50%', 'bottom:14px', 'transform:translateX(-50%)',
    'padding:6px 12px', 'border-radius:999px',
    `background:${low ? '#7a2e2e' : '#17140f'}`, 'color:#f6f1e4',
    'font:600 12px/1.2 system-ui,sans-serif', 'letter-spacing:0.04em',
    'pointer-events:none', 'white-space:nowrap',
  ].join(';');
  (doc.body || doc.documentElement).appendChild(el);
}

// 브라우저에서만 자동 실행. 테스트는 위 순수 함수를 직접 부른다.
if (typeof document !== 'undefined' && typeof location !== 'undefined') {
  applyFogKnob(location.search, document.documentElement, document);
}
