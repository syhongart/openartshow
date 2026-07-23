import * as THREE from "three";
const LIGHTMAP_INTENSITY = 1.7;
const perfNow = () => typeof performance !== "undefined" ? performance.now() : 0;
function detectSoftGPU(renderer) {
  try {
    const gl = renderer && renderer.getContext && renderer.getContext();
    if (!gl) return false;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "") : "";
    return /swiftshader|llvmpipe|softpipe|software|microsoft basic/i.test(r);
  } catch {
    return false;
  }
}
const bakeRes = (renderer, opts) => opts.res || (detectSoftGPU(renderer) ? 256 : 512);
function bakeOneSurface(s, renderer, spots, res) {
  const rt = new THREE.WebGLRenderTarget(res, res, { colorSpace: THREE.SRGBColorSpace });
  const bs = new THREE.Scene();
  const white = new THREE.Mesh(s.mesh.geometry, new THREE.MeshStandardMaterial({ color: 16777215, roughness: 0.9, metalness: 0 }));
  white.position.copy(s.mesh.position);
  white.quaternion.copy(s.mesh.quaternion);
  bs.add(white);
  spots.forEach((sp) => {
    const c = sp.clone();
    c.target = sp.target.clone();
    bs.add(c);
    bs.add(c.target);
  });
  const cam = new THREE.OrthographicCamera(-s.width / 2, s.width / 2, s.height / 2, -s.height / 2, 0.05, 60);
  cam.position.copy(s.center).addScaledVector(s.normal, 20);
  cam.up.copy(s.up);
  cam.lookAt(s.center);
  cam.updateMatrixWorld();
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0, 1);
  renderer.clear();
  renderer.render(bs, cam);
  const geo = s.mesh.geometry, pos = geo.attributes.position;
  s.mesh.updateWorldMatrix(true, false);
  const vpm = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), v = new THREE.Vector3();
  const uv1 = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(s.mesh.matrixWorld).applyMatrix4(vpm);
    uv1[i * 2] = v.x * 0.5 + 0.5;
    uv1[i * 2 + 1] = v.y * 0.5 + 0.5;
  }
  geo.setAttribute("uv1", new THREE.BufferAttribute(uv1, 2));
  s.mesh.material.lightMap = rt.texture;
  s.mesh.material.lightMapIntensity = LIGHTMAP_INTENSITY;
  s.mesh.material.needsUpdate = true;
  white.material.dispose();
  return rt;
}
function bakeShellLightmaps(group, renderer, opts = {}) {
  const shell = group.userData.shell || [];
  if (!shell.length || !renderer) return { ms: 0, surfaces: 0, res: 0 };
  const res = bakeRes(renderer, opts);
  const spots = [];
  group.traverse((o) => {
    if (o.isSpotLight) spots.push(o);
  });
  const prevRT = renderer.getRenderTarget(), prevTone = renderer.toneMapping, prevClear = new THREE.Color();
  renderer.getClearColor(prevClear);
  const prevAlpha = renderer.getClearAlpha();
  renderer.toneMapping = THREE.NoToneMapping;
  const rts = [], t0 = perfNow();
  for (const s of shell) rts.push(bakeOneSurface(s, renderer, spots, res));
  renderer.setRenderTarget(prevRT);
  renderer.toneMapping = prevTone;
  renderer.setClearColor(prevClear, prevAlpha);
  spots.forEach((sp) => {
    group.remove(sp);
    if (sp.target) group.remove(sp.target);
  });
  group.userData.baked = true;
  group.userData.bakedRTs = rts;
  return { ms: Math.round(perfNow() - t0), surfaces: shell.length, res };
}
function bakeShellLightmapsAsync(group, renderer, opts = {}) {
  const shell = group.userData.shell || [];
  if (!shell.length || !renderer) return { promise: Promise.resolve({ ms: 0, surfaces: 0, res: 0 }), cancel() {
  } };
  const res = bakeRes(renderer, opts);
  const perFrame = Math.max(1, opts.perFrame || 1);
  const spots = [];
  group.traverse((o) => {
    if (o.isSpotLight) spots.push(o);
  });
  spots.forEach((sp) => {
    group.remove(sp);
    if (sp.target) group.remove(sp.target);
  });
  const schedule = typeof requestAnimationFrame !== "undefined" ? (fn) => requestAnimationFrame(fn) : typeof setTimeout !== "undefined" ? (fn) => setTimeout(fn, 0) : (fn) => Promise.resolve().then(fn);
  const rts = [];
  let i = 0, cancelled = false;
  const t0 = perfNow();
  const promise = new Promise((resolve) => {
    function step() {
      if (cancelled) {
        group.userData.bakedRTs = rts;
        return resolve({ cancelled: true, surfaces: i, res });
      }
      const prevRT = renderer.getRenderTarget(), prevTone = renderer.toneMapping, prevClear = new THREE.Color();
      renderer.getClearColor(prevClear);
      const prevAlpha = renderer.getClearAlpha();
      renderer.toneMapping = THREE.NoToneMapping;
      const end = Math.min(shell.length, i + perFrame);
      for (; i < end; i++) rts.push(bakeOneSurface(shell[i], renderer, spots, res));
      renderer.setRenderTarget(prevRT);
      renderer.toneMapping = prevTone;
      renderer.setClearColor(prevClear, prevAlpha);
      group.userData.bakedRTs = rts;
      if (opts.onProgress) {
        try {
          opts.onProgress(i, shell.length);
        } catch {
        }
      }
      if (i >= shell.length) {
        group.userData.baked = true;
        return resolve({ ms: Math.round(perfNow() - t0), surfaces: shell.length, res });
      }
      schedule(step);
    }
    schedule(step);
  });
  return { promise, cancel() {
    cancelled = true;
  } };
}
export {
  bakeShellLightmaps,
  bakeShellLightmapsAsync,
  detectSoftGPU
};
