var PLAN_KEY = "artshow-plan-v1";
function planIsPremium() {
  try {
    return localStorage.getItem(PLAN_KEY) === "premium";
  } catch (e) {
    return false;
  }
}
function readPlan() {
  return { premium: planIsPremium() };
}
function computeLimits(premium) {
  return {
    PREMIUM: premium,
    MAX_ARTWORKS: premium ? 14 : 6,
    MAX_FEATURED: premium ? 2 : 1,
    THEMES: ["daylight", "sunset", "night", "auto", "cycle"],
    FREE_THEMES: ["daylight", "auto"]
  };
}
function injectPlanBadge(premium) {
  var h1 = document.querySelector("h1");
  if (!h1) return;
  var badge = document.createElement("span");
  badge.id = "planBadge";
  badge.textContent = premium ? "PREMIUM" : "FREE";
  badge.style.cssText = "font-size:12px;vertical-align:middle;margin-left:10px;padding:3px 10px;border:1px solid #cfc6b8;border-radius:999px;color:#5733FF;letter-spacing:0.08em;";
  h1.appendChild(badge);
  if (!premium) {
    var up = document.createElement("a");
    up.href = "../#pricing";
    up.textContent = "\uC5C5\uADF8\uB808\uC774\uB4DC \u2197";
    up.style.cssText = "font-size:12px;margin-left:8px;color:#5733FF;vertical-align:middle;";
    h1.appendChild(up);
  }
}
export {
  PLAN_KEY,
  computeLimits,
  injectPlanBadge,
  planIsPremium,
  readPlan
};
