const SOFT_GPU_RE = /swiftshader|llvmpipe|softpipe|software (?:rasterizer|renderer|adapter)|microsoft basic render|\bwarp\b|gdi generic|mesa offscreen|apple software renderer/i;
function probeGpu() {
  const out = { name: "", soft: false };
  try {
    const c1 = document.createElement("canvas");
    const strict = c1.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) || c1.getContext("webgl", { failIfMajorPerformanceCaveat: true });
    const caveat = !strict;
    const c2 = document.createElement("canvas");
    const gl = c2.getContext("webgl2") || c2.getContext("webgl");
    if (!gl) return { name: "", soft: true };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    out.name = String(
      ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || gl.getParameter(gl.RENDERER) || ""
    );
    out.soft = SOFT_GPU_RE.test(out.name) || caveat;
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  } catch (_) {
  }
  return out;
}
export {
  probeGpu
};
