const LITE_ENTER_FPS = 24;
const LITE_EXIT_FPS = 45;
const LITE_VISIBLE_NPCS = 3;
const SPEC_KEY = "lu-spec-v2";
const PERF_GEN = 4;
function readSpec() {
  try {
    const raw = localStorage.getItem(SPEC_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.gen === PERF_GEN && (parsed.v === "low" || parsed.v === "high")) return parsed.v;
      return null;
    }
    return null;
  } catch (_) {
    return null;
  }
}
function writeSpec(v) {
  try {
    if (v) localStorage.setItem(SPEC_KEY, JSON.stringify({ v, gen: PERF_GEN }));
    else localStorage.removeItem(SPEC_KEY);
    localStorage.removeItem("lu-spec-v1");
    localStorage.removeItem("lu-lowspec-v1");
  } catch (_) {
  }
}
const PX_BUDGET = { low: 83e5, base: 11e6, high: 18e6 };
const MOBILE_PX_CAP = 1.5;
export {
  LITE_ENTER_FPS,
  LITE_EXIT_FPS,
  LITE_VISIBLE_NPCS,
  MOBILE_PX_CAP,
  PX_BUDGET,
  readSpec,
  writeSpec
};
