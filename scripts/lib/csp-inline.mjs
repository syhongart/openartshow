// 인라인 `<script>` 의 CSP sha256 핀 — **계산 규약 한 곳.**
//
// ── 왜 생겼나 (2026-08-08 실측) ─────────────────────────────────────────────
// 소스 HTML 의 `script-src` 에 박힌 `'sha256-…'` 는 **빌드가 실측해 재작성하는 값의
// 사본**이다(`vite.config.js` 의 `cspReconcile`). 즉 값 미러링이고, 이 저장소가 세 번
// 덴 그 형태다 — 한쪽만 고치면 아무도 모른다. 실제로 모르고 있었다.
//
// ── ⚠ 누가 깨뜨렸나 — 처음 적은 귀인이 틀렸다 (검수관 B1) ───────────────────
// 이 파일은 처음에 *"프로필 서브메뉴를 붙이면서 어긋났다"* 고 적었다. **틀렸다.**
// 아래 모듈(`reconcilePins`)로 `landing.html` 의 이력을 재생한 실측이다:
//
//   missing  커밋       내용
//   ─────────────────────────────────────────────────────────────────────
//      0    fcd364d    (정상)
//      1    08dc904    로그인하면 모바일 메뉴가 안 열렸다 — 스코프 사고 수정  ← 여기서 깨졌다
//      1    ae0344b    (그대로)
//      1    fa45ebc    홈에서 마이페이지로 — 프로필 메뉴 추가(해시 **값**만 바뀜)
//      0    8b8f076    (이 모듈로 수정)
//
// 재현: `git show <커밋>:frontend/landing.html` 을 `reconcilePins()` 에 먹인다.
//
// 정확한 사실이 훨씬 날카롭다 — **모바일 메뉴가 안 열린 사고를 고친 커밋이, 같은 블록의
// CSP 핀을 깨뜨려 vite 를 안 거치는 경로에서 같은 증상을 되살렸다.** 고친 것이 같은
// 증상을 다른 원인으로 재생산한 것이고, 그래서 이 게이트가 필요하다.
// 부수로 **이 게이트의 소급 검출력이 실측됐다** — `08dc904` 를 잡는다. 장식이 아니다.
//
// 나머지 두 파일은 결함이 아니었다(아래 `'unsafe-inline'` 절 참조):
//   builder.html / visit.html   인라인 1 · 핀 0 · `'unsafe-inline'` 유효 → 차단 안 됨
//
// **배포본은 안전하다** — vite 가 디스크 최종본을 실측해 다시 쓴다. 위험한 것은 소스를
// vite 없이 여는 경로다: `scripts/smoke/assemble.mjs` 의 baseline 은
// `cp frontend/landing.html "$OUT/index.html"` 로 **원문을 그대로** 쓰고, 로컬에서
// `frontend/` 를 정적 서버로 열 때도 마찬가지다. 그 경로에서는 핀이 안 맞는 블록이
// **통째로 실행되지 않는다.**
//
// 그것이 왜 심각한가: landing 의 그 블록에는 **햄버거 배선이 같이 들어 있다.** 차단되면
// 2026-08-08 감독 실기기 사고(모바일에서 메뉴가 안 열려 사이트를 돌아다닐 수 없음)와
// 같은 증상이 된다. 그 사고의 재발 방지로 만든 것이 `landing-inline-scope.test.ts` 인데,
// 그 검사는 **스코프**만 보므로 CSP 차단은 못 본다 — 증상이 같고 원인이 다르다.
//
// ── 이 파일이 SSOT 다 ───────────────────────────────────────────────────────
// `vite.config.js`(재작성)와 `tests/csp-inline-pins.test.ts`(정합 검사)가 **둘 다 여기서
// 유도**한다. 계산 규약을 양쪽에 적으면 그 순간 또 미러링이고, 규약이 미묘하게 갈리면
// "빌드는 통과했는데 검사가 빨간불" 또는 그 반대가 된다.

import { createHash } from 'node:crypto';

/**
 * 브라우저가 **실행하는** `type` 값. 이 밖(`application/ld+json`·`importmap` 등)은
 * 스크립트가 아니므로 CSP `script-src` 해시 대상이 아니다.
 */
export const EXEC_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);

/**
 * 해시 스캔용 사본 — **HTML 주석을 지운다.**
 *
 * ⚠ 이 한 줄에 실측 근거가 있다: 주석 안의 `<script>` 텍스트(예: CSP 를 설명하는 주석)가
 * 정규식 매치를 오염시키면 body 경계가 어긋나 **브라우저 실제 해시와 불일치**한다.
 * 브라우저는 주석 안 script 를 무시하므로 스캔도 무시해야 한다. 파일 자체는 주석을
 * 유지한다(지우는 것은 이 사본뿐).
 */
function scannable(html) {
  return html.replace(/<!--[\s\S]*?-->/g, ' ');
}

/**
 * 실행되는 인라인 `<script>` 블록들. `src` 가 있는 것은 외부 참조라 해시가 필요 없다.
 * @returns {{type: string, body: string, hash: string}[]} `hash` 는 `'sha256-…'` 따옴표 포함
 */
export function inlineExecScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(scannable(html))) !== null) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const typeM = attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i);
    const type = typeM ? typeM[1].toLowerCase() : '';
    if (!EXEC_TYPES.has(type)) continue;
    out.push({ type, body: m[2], hash: sha256Pin(m[2]) });
  }
  return out;
}

/** 본문 → `'sha256-…'`(따옴표 포함, CSP 소스표현 그대로). */
export function sha256Pin(body) {
  return `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
}

/** CSP 메타의 `content` 원문. 없으면 `null`. */
export function cspContent(html) {
  const m = /<meta http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"/i.exec(html);
  return m ? m[1] : null;
}

/** `script-src` 디렉티브 원문. 없으면 `null`. */
export function scriptSrc(html) {
  const content = cspContent(html);
  if (!content) return null;
  const m = /script-src[^;]*/i.exec(content);
  return m ? m[0] : null;
}

/** `script-src` 에 박혀 있는 핀 집합. CSP 메타가 없으면 빈 집합. */
export function pinnedHashes(html) {
  const src = scriptSrc(html);
  if (!src) return new Set();
  return new Set(src.match(/'sha256-[^']+'/g) ?? []);
}

/**
 * 정합 판정.
 *
 * ── ⚠ `'unsafe-inline'` 을 반드시 함께 봐야 한다 (2026-08-08, 내가 틀렸던 자리) ──────
 * 처음 이 판정을 "핀에 없는 블록 = 차단" 으로만 짰고, 그래서 `builder.html`·`visit.html`
 * 을 **결함으로 오진했다.** 두 파일은 핀이 없는 게 아니라 `script-src 'self'
 * 'unsafe-inline'` 을 쓴다 — CSP 사양상 **해시·nonce 가 하나도 없을 때만**
 * `'unsafe-inline'` 이 유효하고, 그 조건에서 인라인은 전부 허용된다. 즉 차단되지 않는다.
 *
 * 반대로 **해시가 하나라도 있으면 `'unsafe-inline'` 은 무시된다.** 그래서 landing 처럼
 * 핀을 쓰는 페이지에서는 핀에 없는 블록이 실제로 죽는다. 같은 문자열이 들어 있어도
 * 다른 판정이 나오는 것이라, 이 분기를 안 넣으면 오탐과 누락이 **동시에** 생긴다.
 *
 * ── 실패 축은 `missing` 하나다 ──────────────────────────────────────────────
 * `dead` 는 존재하지 않는 스크립트를 허용하는 것이라 **보안상 무해**하다. 실패로 만들면
 * 이번 지시(프로필 메뉴)와 무관한 파일들을 함께 고쳐야 하고, 범위를 넓히면 리뷰가
 * 커진다 — 정리는 백로그 `G-CSP1` 이다.
 *
 * ⚠ 그 판단의 대가를 적어 둔다: 이 저장소에서 *"무해하니 남긴다"* 는 **장식이 되는
 * 형태**다(관측만 남기고 승격을 안 하면 그때부터 장식이라고 규율이 이미 적었다).
 * dead 핀은 "왜 있는지 모르는 값" 이라 다음 사람이 그것을 근거로 삼을 수 있다.
 */
export function reconcilePins(html) {
  const scripts = inlineExecScripts(html);
  const pinned = pinnedHashes(html);
  const src = scriptSrc(html);
  const actual = new Set(scripts.map((s) => s.hash));
  // 해시·nonce 가 하나도 없을 때만 `'unsafe-inline'` 이 산다(CSP3 §7.5).
  const hasNonce = src ? /'nonce-[^']+'/.test(src) : false;
  const unsafeInlineActive = Boolean(src)
    && /'unsafe-inline'/.test(src)
    && pinned.size === 0
    && !hasNonce;
  return {
    scripts,
    pinned,
    /** `'unsafe-inline'` 이 실제로 유효한가 — 유효하면 핀 없이도 인라인이 실행된다 */
    unsafeInlineActive,
    /** 실행되는데 허용될 근거가 없다 → **그 블록은 차단된다** */
    missing: unsafeInlineActive ? [] : scripts.filter((s) => !pinned.has(s.hash)),
    /** 핀에 있는데 대응 블록이 없다 → 무해하지만 거짓 정보 */
    dead: [...pinned].filter((h) => !actual.has(h)),
  };
}
