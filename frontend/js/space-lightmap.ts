// @ts-nocheck — 순수 이동(C-3 분해). strict 타입 정합은 후속 마일스톤.
// space-lightmap.ts — GPU 셸 라이트맵 베이크(leaf · three만 의존). space-render.js에서 순수 추출.
import * as THREE from 'three';
import { unshareMaterial } from './space-parts.js';
// ── GPU 셸 라이트맵 베이크(팀장 승인 A: 무저장·결정론·방문 즉시) ──────────────
// 스포트라이트만 셸(바닥·벽·피처월) 표면에 GPU 렌더-투-텍스처로 구움 → material.lightMap(uv1).
// hemi/key는 실시간 유지(파츠도 계속 밝음). 결정론(난수·시간 미사용) → 동일 기기 재베이크 동일.
// 하이브리드: lightMap(정적 스포트)=가산, 실시간 라이트(아바타/물)=directDiffuse 가산.
const LIGHTMAP_INTENSITY = 1.7; // 실시간 스포트 풀 밝기에 맞춘 튜닝
const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : 0);

// 소프트웨어 래스터라이저(SwiftShader/llvmpipe 등) 감지 → 256² 폴백으로 실기기 독립성(#54).
export function detectSoftGPU(renderer) {
  try {
    const gl = renderer && renderer.getContext && renderer.getContext();
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
    return /swiftshader|llvmpipe|softpipe|software|microsoft basic/i.test(r);
  } catch { return false; }
}
const bakeRes = (renderer, opts) => opts.res || (detectSoftGPU(renderer) ? 256 : 512); // 소프트=256², 그 외 512²

// 표면 1개를 라이트맵으로 굽는다(정투영 카메라 RTT + uv1 정렬). 렌더러 상태 저장/복원은 호출부 책임.
// group을 받는 이유: 라이트맵은 표면마다 내용이 다르므로 재질을 공유할 수 없다(unshareMaterial 참조).
// 분리한 인스턴스는 group.userData.mats에 등록해야 disposeSpaceGroup이 회수한다.
function bakeOneSurface(s, renderer, spots, res, group) {
  // 재질 캐시가 준 공유 인스턴스에 그대로 lightMap을 쓰면, 같은 캐시 키를 가진 다른 표면(북/남벽은
  // 항상 같은 폭이라 언제나 같은 키다)이 서로를 덮어써 마지막에 구운 조명 패턴만 남는다.
  const own = unshareMaterial(s.mesh);
  if (own && group) (group.userData.mats || (group.userData.mats = [])).push(own);
  const rt = new THREE.WebGLRenderTarget(res, res, { colorSpace: THREE.SRGBColorSpace });
  const bs = new THREE.Scene();
  const white = new THREE.Mesh(s.mesh.geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 }));
  white.position.copy(s.mesh.position); white.quaternion.copy(s.mesh.quaternion); bs.add(white);
  spots.forEach((sp) => { const c = sp.clone(); c.target = sp.target.clone(); bs.add(c); bs.add(c.target); });
  const cam = new THREE.OrthographicCamera(-s.width / 2, s.width / 2, s.height / 2, -s.height / 2, 0.05, 60);
  cam.position.copy(s.center).addScaledVector(s.normal, 20); cam.up.copy(s.up); cam.lookAt(s.center); cam.updateMatrixWorld();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(bs, cam);
  const geo = s.mesh.geometry, pos = geo.attributes.position; s.mesh.updateWorldMatrix(true, false);
  const vpm = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), v = new THREE.Vector3();
  const uv1 = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(s.mesh.matrixWorld).applyMatrix4(vpm); uv1[i * 2] = v.x * 0.5 + 0.5; uv1[i * 2 + 1] = v.y * 0.5 + 0.5; }
  geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
  s.mesh.material.lightMap = rt.texture; s.mesh.material.lightMapIntensity = LIGHTMAP_INTENSITY; s.mesh.material.needsUpdate = true;
  white.material.dispose();
  return rt;
}

// 동기 베이크(빌더 '굽기' 버튼 — 사용자 개시, 즉시). 실기기 독립성: 소프트 GPU면 256² 폴백.
export function bakeShellLightmaps(group, renderer, opts = {}) {
  const shell = group.userData.shell || []; if (!shell.length || !renderer) return { ms: 0, surfaces: 0, res: 0 };
  const res = bakeRes(renderer, opts);
  const spots = []; group.traverse((o) => { if (o.isSpotLight) spots.push(o); });
  const prevRT = renderer.getRenderTarget(), prevTone = renderer.toneMapping, prevClear = new THREE.Color(); renderer.getClearColor(prevClear); const prevAlpha = renderer.getClearAlpha();
  renderer.toneMapping = THREE.NoToneMapping; // 라이트맵=톤매핑 전 선형 조사량
  const rts = [], t0 = perfNow();
  for (const s of shell) rts.push(bakeOneSurface(s, renderer, spots, res, group));
  renderer.setRenderTarget(prevRT); renderer.toneMapping = prevTone; renderer.setClearColor(prevClear, prevAlpha);
  spots.forEach((sp) => { group.remove(sp); if (sp.target) group.remove(sp.target); });
  group.userData.baked = true; group.userData.bakedRTs = rts;
  return { ms: Math.round(perfNow() - t0), surfaces: shell.length, res };
}

// 비동기 베이크(방문자 첫 입장 — 비차단). 표면을 프레임에 나눠 구워 메인 루프를 막지 않는다(#54).
// 스포트는 시작 시 그룹에서 제거 → 방문자 화면은 hemi/key로 유지되고 표면별 라이트맵이 점진적으로 채워짐
// (이중 조명 없음). { promise, cancel } 반환 — dispose 시 반드시 cancel 호출.
export function bakeShellLightmapsAsync(group, renderer, opts = {}) {
  const shell = group.userData.shell || [];
  if (!shell.length || !renderer) return { promise: Promise.resolve({ ms: 0, surfaces: 0, res: 0 }), cancel() {} };
  const res = bakeRes(renderer, opts);
  const perFrame = Math.max(1, opts.perFrame || 1);
  const spots = []; group.traverse((o) => { if (o.isSpotLight) spots.push(o); });
  spots.forEach((sp) => { group.remove(sp); if (sp.target) group.remove(sp.target); }); // 시작 시 실시간 스포트 제거
  const schedule = (typeof requestAnimationFrame !== 'undefined') ? (fn) => requestAnimationFrame(fn)
    : (typeof setTimeout !== 'undefined') ? (fn) => setTimeout(fn, 0) : (fn) => Promise.resolve().then(fn);
  const rts = []; let i = 0, cancelled = false; const t0 = perfNow();
  const promise = new Promise((resolve) => {
    function step() {
      if (cancelled) { group.userData.bakedRTs = rts; return resolve({ cancelled: true, surfaces: i, res }); }
      const prevRT = renderer.getRenderTarget(), prevTone = renderer.toneMapping, prevClear = new THREE.Color(); renderer.getClearColor(prevClear); const prevAlpha = renderer.getClearAlpha();
      renderer.toneMapping = THREE.NoToneMapping;
      const end = Math.min(shell.length, i + perFrame);
      for (; i < end; i++) rts.push(bakeOneSurface(shell[i], renderer, spots, res, group));
      renderer.setRenderTarget(prevRT); renderer.toneMapping = prevTone; renderer.setClearColor(prevClear, prevAlpha);
      group.userData.bakedRTs = rts; // 부분 결과도 등록(중도 dispose 회수)
      if (opts.onProgress) { try { opts.onProgress(i, shell.length); } catch {} }
      if (i >= shell.length) { group.userData.baked = true; return resolve({ ms: Math.round(perfNow() - t0), surfaces: shell.length, res }); }
      schedule(step);
    }
    schedule(step);
  });
  return { promise, cancel() { cancelled = true; } };
}
