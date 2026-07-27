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
export function injectPlanBadge(premium) {
  var h1 = document.querySelector('h1');
  if (!h1) return;
  var badge = document.createElement('span');
  badge.id = 'planBadge';
  badge.textContent = premium ? 'PREMIUM' : 'FREE';
  badge.style.cssText = 'font-size:12px;vertical-align:middle;margin-left:10px;padding:3px 10px;border:1px solid #cfc6b8;border-radius:999px;color:#5733FF;letter-spacing:0.08em;';
  h1.appendChild(badge);
  if (!premium) {
    var up = document.createElement('a');
    up.href = '../#pricing';
    up.textContent = '업그레이드 ↗';
    up.style.cssText = 'font-size:12px;margin-left:8px;color:#5733FF;vertical-align:middle;';
    h1.appendChild(up);
  }
}
