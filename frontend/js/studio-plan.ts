// @ts-nocheck — C단계 C-2 S1: studio-main IIFE에서 순수 이동(로직 1바이트 불변).
// studio strict화는 별도 후속(S0 선례). 무상태 — 반환값/부수효과(배지 주입)만.
//
// 플랜(P2 임시 운영): 결제 대신 활성화 코드 — 랜딩 요금제 섹션에서 등록.
// PLAN_KEY 문자열은 landing writer와 공유하는 계약 → 불변.

export var PLAN_KEY = 'artshow-plan-v1';

// ── 플랜은 **층위**다 (2026-08-16, W8-3 S1) ─────────────────────────────────
// 그전에는 `premium: boolean` **둘뿐**이었다. 감독 지시로 셋이 됐다 —
// *"특별 프리미엄 사용자는 자기만의 지엘비 건물을 올려서 사용할수있게할꺼야."*
//
// ⚠ **저장 값은 그대로 문자열이다** — `'premium'` 은 예전 그대로 읽히므로 **이미 프리미엄인
// 브라우저가 등급을 잃지 않는다.** 새 값 `'premium_plus'` 만 더했다.
//
// ⚠⚠ **이것은 보안 장치가 아니다.** 서버가 없으므로 사용자가 `localStorage` 를 직접 고쳐
// 어떤 층위든 켤 수 있다. 활성화 코드는 **편의 장치**이고 그 사실은 원래 주석(*"P2 임시
// 운영: 결제 대신 활성화 코드"*)이 이미 말하고 있다. 진짜 권한은 결제·서버가 생기는 날의
// 일이다 — 그때 이 파일 뒤가 바뀐다.
export var TIER_FREE = 'free';
export var TIER_PREMIUM = 'premium';
/** 「특별 프리미엄」 — 자기 GLB 건물 업로드가 열린다(감독 지시 2026-08-16) */
export var TIER_PREMIUM_PLUS = 'premium_plus';

/** 층위 이름. 화면에 그대로 쓴다 — 표시명을 여러 곳에 적으면 갈라진다 */
export var TIER_LABEL = {
  free: '무료',
  premium: '프리미엄',
  premium_plus: '특별 프리미엄'
};

/**
 * 지금 층위. 모르는 값은 **무료로 떨어뜨린다**(fail-closed) — 저장이 손상됐을 때
 * 권한을 열어 주는 쪽으로 실패하면 안 된다.
 */
export function planTier() {
  try {
    var v = localStorage.getItem(PLAN_KEY);
    if (v === TIER_PREMIUM || v === TIER_PREMIUM_PLUS) return v;
  } catch (e) { /* 접근 불가 = 무료 */ }
  return TIER_FREE;
}

/**
 * 프리미엄 **이상**인가. ⚠ 이름이 남긴 함정: `=== 'premium'` 로 두면 특별 프리미엄
 * 사용자가 프리미엄 기능을 **잃는다.** 층위를 넓히는 순간 이 형태가 전부 그렇다.
 */
export function planIsPremium() {
  return planTier() !== TIER_FREE;
}

/** 자기 GLB 건물을 올릴 수 있는가 — 특별 프리미엄만(감독 지시) */
export function canUploadGlb() {
  return planTier() === TIER_PREMIUM_PLUS;
}

// 현재 플랜(무상태). `premium` 은 **하위호환**으로 남긴다 — 기존 호출부가 그것을 읽는다.
export function readPlan() {
  var tier = planTier();
  return { tier: tier, premium: tier !== TIER_FREE, canUploadGlb: tier === TIER_PREMIUM_PLUS };
}

// 플랜 → 한도/테마 상수 계산(무상태 반환값). MAX_ARTWORKS/MAX_FEATURED·THEMES/FREE_THEMES.
//
// ⚠ **boolean 도 받는다** — 기존 호출부가 `computeLimits(plan.premium)` 이었다. 층위를
// 넓히면서 그 시그니처를 깨면 소비자를 전부 찾아 고쳐야 하고, 하나라도 놓치면 **무료로
// 조용히 떨어진다**(증상이 화면에만 난다). 「생략·옛 형태 = 기존 동작」이 이 저장소의
// 확장 규약이다.
export function computeLimits(tierOrPremium) {
  var tier = tierOrPremium === true ? TIER_PREMIUM
    : tierOrPremium === false ? TIER_FREE
      : (tierOrPremium || TIER_FREE);
  var premium = tier !== TIER_FREE;
  return {
    PREMIUM: premium,
    TIER: tier,
    /** 자기 GLB 업로드 — W8-3 S7 이 이 값으로 화면을 가른다 */
    CAN_UPLOAD_GLB: tier === TIER_PREMIUM_PLUS,
    // ⚠ 특별 프리미엄의 **작품 수·대표작 수는 프리미엄과 같다.** 감독이 연 것은 업로드
    // 권한이지 점수가 아니다 — 값을 지어내지 않는다(요금 체계는 감독 소관).
    MAX_ARTWORKS: premium ? 14 : 6,
    MAX_FEATURED: premium ? 2 : 1,
    THEMES: ['daylight', 'sunset', 'night', 'auto', 'cycle'],
    FREE_THEMES: ['daylight', 'auto']
  };
}

// ── 활성화 코드 (P2 임시 운영) ─────────────────────────────────────────────
// ⚠ **판정이 `landing.html` 에 인라인으로 복제돼 있었다.** 이 파일 헤더가 *"PLAN_KEY
// 문자열은 landing writer 와 공유하는 계약"* 이라고 적었지만 공유되는 것은 **문자열뿐이고
// 검증 함수는 따로**였다. 층위를 셋으로 넓히면 **랜딩만 조용히 낡아** 「코드를 넣었는데
// 아무 일도 안 일어난다」로 나타난다. 그래서 판정을 여기로 모은다.
//
// 형식은 그대로다(`ART-XXXX-XXXX`) — 이미 발급된 코드가 있으면 계속 통해야 한다.
// 층위는 **해시 나머지**로 가른다.
var CODE_RE = /^ART-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/** djb2. 랜딩에 있던 것과 **같은 식**이다 — 기존 코드가 그대로 통해야 한다 */
export function planCodeHash(code) {
  var h = 5381;
  for (var i = 0; i < code.length; i++) h = ((h << 5) + h + code.charCodeAt(i)) >>> 0;
  return h % 9973;
}

/** 나머지 → 층위. `777` 은 기존 프리미엄 값이라 **바꾸지 않는다**(발급된 코드가 죽는다) */
export var CODE_REMAINDER = { premium: 777, premium_plus: 4242 };

/**
 * 코드가 어느 층위를 여는가. 아니면 `null`.
 *
 * ⚠ 무작위 코드가 통과할 확률은 나머지당 약 1/9973 이다 — **브루트포스가 쉽다.**
 * 그것을 알고 쓴다: 서버가 없으므로 `localStorage` 직접 조작이 더 쉽고, 이 코드는
 * **보안 경계가 아니라 편의 장치**다(위 층위 주석과 같은 이유).
 */
export function planTierForCode(code) {
  var c = String(code || '').trim().toUpperCase();
  if (!CODE_RE.test(c)) return null;
  var r = planCodeHash(c);
  if (r === CODE_REMAINDER.premium_plus) return TIER_PREMIUM_PLUS;
  if (r === CODE_REMAINDER.premium) return TIER_PREMIUM;
  return null;
}

/** 코드를 적용한다. 통하면 그 층위를, 아니면 `null` 을 낸다 */
export function applyPlanCode(code) {
  var tier = planTierForCode(code);
  if (!tier) return null;
  try { localStorage.setItem(PLAN_KEY, tier); } catch (e) { /* 저장 불가 — 이번 세션만 */ }
  return tier;
}

// 플랜 한도 안내 주입 — 「작품 목록」 블록 제목 옆.
//
// ── 왜 이 파일인가 (2026-08-16) ─────────────────────────────────────────────
// `studio.html` 에 *"최대 14점 · 대표작 2점"* 이 **정적으로** 박혀 있었고 그것은
// **무료 사용자(6점·1점)에게 거짓**이었다. `guide.html:692` 가 글자 그대로 같은 결함이었고
// 같은 날 고쳤는데 **이 자리를 안 셌다** — 랜딩까지 세면 같은 형태가 세 번째다.
//
// 문구를 고치면 미러링이 하나 더 늘 뿐이다. 그래서 **HTML 자리를 비우고 값을 여기서
// 채운다** — 이 파일이 한도의 SSOT(`computeLimits`)를 소유하므로 값이 갈라질 자리가 없다.
// 배지 주입(`injectPlanBadge`)과 같은 성격이라 같은 파일에 둔다.
//
// (처음에는 `studio-form.ts` 에 넣었는데 `check:filesize` 가 막았다 — 그 파일은 이미
//  608줄이고 게이트가 *"쪼개거나 근거를 대라"* 고 했다. **게이트가 더 나은 자리로 밀었다.**)
export function injectPlanLimits(limits) {
  var el = document.getElementById('planLimitHint');
  if (!el) return;   // 이 모듈을 쓰는 다른 페이지에서는 조용히 넘어간다
  el.textContent = '작품 ' + limits.MAX_ARTWORKS + '점 · 대표작 ' + limits.MAX_FEATURED + '점'
    + (limits.PREMIUM ? '' : ' (무료 플랜)');
}

// 플랜 배지 주입 — 헤더 h1 옆(FREE면 업그레이드 링크 동반).
//
// ── 색은 리터럴이 아니라 토큰이다 (2026-08-09 그린 전환 미수리분) ──────────
// 여기 두 곳이 `#5733FF` 를 박고 있었다. 그것은 **폐기된 `--oas-violet-ink`** 의 원값
// 이다 — 사이트는 2026-07-30 에 그린으로 넘어갔고 `studio.html` 의 2층 토큰
// (`--violet-ink`)은 이미 `--oas-accent-ink` 를 가리키고 있었는데, **JS 안의 리터럴만
// 따라오지 않았다.** 라이브 스튜디오 헤더에 옛 팔레트 보라가 그대로 떠 있었다
// (실측 아이보리 위 5.56:1 — 대비는 통과하므로 대비 게이트로는 영원히 안 잡힌다).
// 같은 줄의 `#cfc6b8` 도 `--oas-warm-gray-300` 의 원값 복사였다(값은 맞고 자리가 틀렸다).
//
// **CSS 변수는 인라인 스타일에서 그대로 참조된다** — `getComputedStyle` 로 읽어 오거나
// 상수로 빼거나 클래스로 옮길 필요가 없다. `var()` 는 상속되므로 이 요소가 붙는
// `<h1>` 의 조상(`:root`)에 정의된 값이 그대로 해소된다. 세 처방 중 이것만이
// **값을 이 파일에 다시 적지 않는다.**
//
// ⚠ 참조하는 이름은 **`studio.html` 의 2층 토큰**이다. 이 모듈의 소비자는
// `studio-main.ts` 하나이고 그것을 로드하는 페이지도 `studio.html` 하나다(실측).
// 다른 페이지에서 쓰게 되면 그 페이지에도 같은 이름이 있어야 한다.
export function injectPlanBadge(tierOrPremium) {
  var h1 = document.querySelector('h1');
  if (!h1) return;
  // ⚠ **층위를 그대로 보여준다**(2026-08-16). boolean 만 받던 시절에는 배지가
  // `PREMIUM`/`FREE` 둘뿐이었고, 특별 프리미엄을 켜도 화면이 `PREMIUM` 이라고 말했다 —
  // **감독이 코드를 넣고도 켜졌는지 확인할 수 없는 상태**였다(실기기 실측으로 잡았다).
  // 옛 호출부가 boolean 을 넘겨도 돌게 둔다(「옛 형태 = 기존 동작」).
  var tier = tierOrPremium === true ? TIER_PREMIUM
    : tierOrPremium === false ? TIER_FREE
      : (tierOrPremium || TIER_FREE);
  var premium = tier !== TIER_FREE;
  var badge = document.createElement('span');
  badge.id = 'planBadge';
  badge.textContent = TIER_LABEL[tier] || TIER_LABEL[TIER_FREE];
  badge.style.cssText = 'font-size:12px;vertical-align:middle;margin-left:10px;padding:3px 10px;border:1px solid var(--neutral-warm-gray-300);border-radius:999px;color:var(--violet-ink);letter-spacing:0.08em;';
  h1.appendChild(badge);
  if (!premium) {
    var up = document.createElement('a');
    up.href = '../#pricing';
    up.textContent = '업그레이드 ↗';
    up.style.cssText = 'font-size:12px;margin-left:8px;color:var(--violet-ink);vertical-align:middle;';
    h1.appendChild(up);
  }
}
