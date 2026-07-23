function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function lerpAngle(a, b, t) {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
function resolveAutoTheme(theme) {
  if (theme !== "auto") return theme;
  const h = (/* @__PURE__ */ new Date()).getHours();
  if (h >= 6 && h < 16) return "daylight";
  if (h >= 16 && h < 19) return "sunset";
  return "night";
}
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h << 5) + h + str.charCodeAt(i) >>> 0;
  return h.toString(36);
}
export {
  djb2,
  easeInOutCubic,
  lerpAngle,
  resolveAutoTheme
};
