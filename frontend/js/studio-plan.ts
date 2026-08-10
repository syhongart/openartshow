// @ts-nocheck — C단계 C-2 S1: studio-main IIFE에서 순수 이동(로직 1바이트 불변).
// studio strict화는 별도 후속(S0 선례). 무상태 — 반환값/부수효과(배지 주입)만.
//
// 플랜(P2 임시 운영): 결제 대신 활성화 코드 — 랜딩 요금제 섹션에서 등록.
// PLAN_KEY 문자열은 landing writer와 공유하는 계약 → 불변.

export var PLAN_KEY = 'artshow-plan-v1';

export function planIsPremium() {
  try { return localStorage.getItem(PLAN_KEY) === 'premium'; } catch (e) { return false; }
}

// 현재 플랜을 읽어 프리미엄 여부만 반환(무상태).
export function readPlan() {
  return { premium: planIsPremium() };
}

// 플랜 → 한도/테마 상수 계산(무상태 반환값). MAX_ARTWORKS/MAX_FEATURED·THEMES/FREE_THEMES.
export function computeLimits(premium) {
  return {
    PREMIUM: premium,
    MAX_ARTWORKS: premium ? 14 : 6,
    MAX_FEATURED: premium ? 2 : 1,
    THEMES: ['daylight', 'sunset', 'night', 'auto', 'cycle'],
    FREE_THEMES: ['daylight', 'auto']
  };
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
export function injectPlanBadge(premium) {
  var h1 = document.querySelector('h1');
  if (!h1) return;
  var badge = document.createElement('span');
  badge.id = 'planBadge';
  badge.textContent = premium ? 'PREMIUM' : 'FREE';
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
