// @ts-nocheck — main.js 분해 1차 순수 leaf 이동, strict 타입은 후속.
// main-gpu.js — GPU 자가 진단 프로브(순수 조회: 1회용 캔버스로 렌더러명·소프트
//   웨어 판별만 하고 결과 객체를 반환, DOM/전역 상태 미수정). main.js에서 추출.
//   ⚠️ showGpuNotice(DOM 배너 생성·body 삽입)는 순수 아님 → main.js 잔류(1차 제외).

// 소프트웨어 렌더링(하드웨어 가속 꺼짐/원격 데스크톱/블랙리스트) 판별 문자열.
// 2026년 데스크톱 Chrome/Edge 최다는 WARP("Microsoft Basic Render Driver") —
// 하드웨어 가속을 수동으로 끄면 SwiftShader가 아니라 WARP로 동작한다 (전문가 진단).
const SOFT_GPU_RE = /swiftshader|llvmpipe|softpipe|software (?:rasterizer|renderer|adapter)|microsoft basic render|\bwarp\b|gdi generic|mesa offscreen|apple software renderer/i;

// GPU 프로브 — 렌더러 생성 "전"에 1회용 캔버스로 판별한다 (antialias 등
// 컨텍스트 생성 시점 옵션을 결과에 따라 정해야 하므로).
// 2차 신호: failIfMajorPerformanceCaveat 컨텍스트가 거부되면 브라우저 스스로
// "심각한 성능 제약"을 인정한 것 — 렌더러명이 가려진 환경도 잡는다.
export function probeGpu() {
  const out = { name: '', soft: false };
  try {
    const c1 = document.createElement('canvas');
    const strict =
      c1.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
      c1.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    const caveat = !strict;

    const c2 = document.createElement('canvas');
    const gl = c2.getContext('webgl2') || c2.getContext('webgl');
    if (!gl) return { name: '', soft: true }; // WebGL 자체 불가 직전 상태
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    out.name = String(
      (ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || ''
    );
    out.soft = SOFT_GPU_RE.test(out.name) || caveat;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext(); // 프로브 컨텍스트 즉시 반납
  } catch (_) { /* 판별 실패 시 정상 GPU로 간주 */ }
  return out;
}
