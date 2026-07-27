import { getCanvasFont } from "./fonts.js";
function dataUrlToBlob(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}
function drawWatermark(ctx, w, h, galleryName) {
  const bandHeight = Math.max(90, Math.round(h * 0.14));
  const grad = ctx.createLinearGradient(0, h - bandHeight, 0, h);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, h - bandHeight, w, bandHeight);
  const pad = Math.max(20, Math.round(w * 0.025));
  const s = Math.max(1, w / 1400);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `300 ${Math.round(18 * s)}px ${getCanvasFont()}`;
  ctx.fillText(galleryName || "OpenArtShow \uC804\uC2DC", pad, h - pad - 6 * s);
  ctx.fillStyle = "#5f9e7d";
  ctx.font = `300 ${Math.round(16 * s)}px ${getCanvasFont()}`;
  drawLetterSpacedRight(ctx, "OpenArtShow", w - pad, h - pad - 22 * s, 2.5 * s);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `300 ${Math.round(12 * s)}px ${getCanvasFont()}`;
  ctx.fillText("syhongart.github.io/openartshow", w - pad, h - pad - 4 * s);
}
function drawLetterSpacedRight(ctx, text, rightX, y, spacing) {
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((sum, cw) => sum + cw, 0) + spacing * (chars.length - 1);
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  let x = rightX - total;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}
function getShareUrl() {
  const href = window.location.href;
  if (href.length < 2e3) return href;
  return window.location.origin + window.location.pathname.replace(/index\.html$/, "landing.html");
}
export {
  dataUrlToBlob,
  drawWatermark,
  getShareUrl
};
