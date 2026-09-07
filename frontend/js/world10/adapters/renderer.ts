// world10/adapters/renderer.ts — 백엔드 차이를 이 파일에만 가둔다.
//
// ── 왜 어댑터인가 ────────────────────────────────────────────────────────────
// 현행 world.js는 `isWebGPU` 분기가 6곳인데, 그보다 **암묵적 우회가 8곳 이상** 흩어져 있고
// 그중 셋이 실제 버그를 냈다:
//
//   · 그림자 프리즈를 `renderer.shadowMap.autoUpdate`(WebGL 시맨틱)와 `sun.shadow.autoUpdate`
//     (WebGPU ShadowNode) **두 API에 이중 기록**해야 하는데, 그 이중 기록이 3곳에 반복돼
//     있었다. 한 곳을 빠뜨려 WebGPU에서 프리즈가 무실효였고 검수관이 잡았다.
//   · `render.drawCalls ?? render.calls`가 4곳에 흩어져 있었다. 같은 이름이 백엔드에 따라
//     의미가 다르다 — WebGPU의 `render.calls`는 누적 render() 횟수(reset 대상 밖)이고,
//     WebGL의 WebGLInfo에는 `drawCalls` 필드가 아예 없어 `render.calls`가 프레임당 draw다.
//     WebGPU 기준만 읽으면 폴백 기기의 HUD가 통째로 undefined가 된다.
//   · `info.reset()`이 한 번도 안 걸려 draw·삼각형이 렌더러 생애 내내 누적됐다(실기기 CSV
//     단조증가의 원인). three 신형 Renderer는 `setAnimationLoop` 내부에서만 자동 리셋하는데
//     우리는 자체 rAF 재귀를 쓴다.
//
// 그래서 커널·System은 이 세 함수만 본다. 백엔드를 갈아타든 three가 바뀌든 여기만 고친다.

import * as THREE from 'three/webgpu';
import { WebGLRenderer, PMREMGenerator as PMREMGeneratorGL } from 'three';

export type Backend = 'WebGPU' | 'WebGL';

/**
 * 백엔드를 **하드웨어/소프트웨어까지** 가른 라벨 (감독 지시 2026-07-31).
 *
 * ── 왜 `Backend` 2종으로는 부족한가 ────────────────────────────────────────
 * `'WebGL'` 한 값이 **실기기 GPU 와 헤드리스 SwiftShader 를 같은 것으로 만든다.**
 * 그러면 리포트에 `backend: WebGL` 이라 찍혀도 그것이 "감독 노트북의 Intel Iris" 인지
 * "CI 의 CPU 래스터라이저" 인지 구별할 수 없고, 성능·색감 판정의 근거로 쓸 수 없다.
 *
 * 감독 지적의 정확한 형태: *"단순히 `webgpu` 라고만 표시하면 검수관이 하드웨어 검증으로
 * 오해할 수 있다."* — 오해는 라벨이 만든다.
 *
 * `unknown` 은 **측정 실패**다. "못 잰 것은 통과가 아니다" 를 라벨 층위에서 지킨다 —
 * 판정 쪽이 `unknown` 을 `webgl-hardware` 로 낙관해석하지 못하게 값 자체를 분리한다.
 */
export type BackendDetail =
  | 'webgpu-hardware' | 'webgpu-software'
  | 'webgl-hardware' | 'webgl-software'
  | 'unknown';

/** `backendDetail` 을 그렇게 판정한 근거. 라벨만 믿지 말고 이것을 함께 읽는다. */
export interface BackendEvidence {
  /** `navigator.gpu` 존재 여부 — false 면 WebGPU 는 시도조차 안 된다 */
  hasWebGPUApi: boolean;
  /** WebGPU 어댑터가 소프트웨어 폴백이라고 스스로 밝혔는가(`isFallbackAdapter`) */
  isFallbackAdapter: boolean | null;
  /** 어댑터가 밝힌 vendor/architecture. 브라우저 버전에 따라 없을 수 있다 */
  adapterInfo: { vendor?: string; architecture?: string; device?: string } | null;
  /** WebGL `UNMASKED_RENDERER_WEBGL` 원문. SwiftShader 판정의 근거 문자열 */
  glRenderer: string | null;
  /** 판정이 확정되지 못한 이유(있으면). `unknown` 일 때 무엇이 막았는지 남긴다 */
  note: string | null;
}

export interface FrameStats {
  /** 이 프레임의 드로우콜. 두 백엔드의 스키마 차이를 흡수한 값 */
  draw: number;
  /** 이 프레임의 삼각형 수 */
  tri: number;
  /** 살아있는 지오메트리 수(reset 대상 아님 — 생존 카운터) */
  geometries: number;
  /** 살아있는 텍스처 수(생존 카운터) */
  textures: number;
}

export interface RendererAdapter {
  readonly backend: Backend;
  /** 하드웨어/소프트웨어까지 가른 라벨. 리포트·게이트는 `backend` 가 아니라 이것을 읽는다 */
  readonly backendDetail: BackendDetail;
  /** 위 라벨의 판정 근거. 라벨이 의심스러우면 이것을 본다 */
  readonly backendEvidence: BackendEvidence;
  readonly renderer: any;
  /** 절차 환경맵 생성기. realm이 어긋나면 크래시하므로 백엔드에 맞는 것을 준다 */
  makeEnvMap(scene: THREE.Scene): THREE.Texture;
  /** 그림자 갱신을 멈춘다/재개한다. 두 API에 이중 기록하는 유일한 지점 */
  freezeShadows(sun: THREE.DirectionalLight, frozen: boolean): void;
  /** 다음 렌더 1프레임만 그림자를 다시 굽는다 */
  requestShadowBake(sun: THREE.DirectionalLight): void;
  /** 프레임 통계. render() **직후** 호출해야 유효하다 */
  frameStats(): FrameStats;
  /** 프레임 경계 — 통계 리셋. render() 전에 부른다 */
  beginFrame(): void;
  /**
   * 파이프라인/프로그램 수. **개수 불변식(I2)의 측정 지점**이다.
   * WebGPU는 three 비공개 API를 읽으므로 없어지면 -1을 돌려준다(추측하지 않는다).
   */
  pipelineCount(): number;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  /**
   * 렌더 경로를 가로챈다. `null` 이면 기본 경로(`renderer.render`)로 돌아온다.
   *
   * ── 왜 어댑터가 이걸 여는가 ───────────────────────────────────────────────
   * 후보정(블룸 등)은 "씬을 그리는 방법" 자체를 바꾼다 — 화면에 직접 그리는 대신
   * 렌더타깃에 받아 후처리한 뒤 합성한다. 그 교체 지점은 **렌더러를 쥔 곳**뿐이고,
   * 그게 어댑터다.
   *
   * 훅으로 여는 이유는 후보정을 **기능으로 뺐다 넣었다** 할 수 있게 하려는 것이다.
   * 어댑터가 블룸을 직접 알면 후보정을 끄는 일이 어댑터 수술이 된다.
   *
   * 훅 안에서 `renderer` 를 어떻게 쓰든 어댑터는 관여하지 않지만, **프레임 통계는
   * 그대로 유효하다** — `beginFrame()`/`frameStats()` 는 렌더러의 info 를 읽으므로
   * 후보정이 추가한 드로우콜도 함께 세어진다.
   */
  setRenderHook(fn: ((scene: THREE.Scene, camera: THREE.Camera) => void) | null): void;
  setPixelRatio(r: number): void;
  getPixelRatio(): number;
  setSize(w: number, h: number): void;
  dispose(): void;
}

/**
 * 렌더러를 만든다. WebGPU 가용성은 **detached 8px 캔버스**로 먼저 확인한다 —
 * 라이브 캔버스에 'webgpu' 컨텍스트가 한 번 커밋되면 뒤이은 getContext('webgl2')가 null이
 * 되어 폴백 자체가 불가능해진다. 프로브에서 확정한 뒤에만 라이브 캔버스를 만진다.
 */
export async function createRendererAdapter(
  canvas: HTMLCanvasElement, opts: { forceWebGL?: boolean } = {},
): Promise<RendererAdapter> {
  let backend: Backend = 'WebGL';
  const hasWebGPUApi = typeof navigator !== 'undefined' && !!(navigator as any).gpu;
  let isFallbackAdapter: boolean | null = null;
  let adapterInfo: BackendEvidence['adapterInfo'] = null;
  let note: string | null = null;

  if (!opts.forceWebGL && hasWebGPUApi && typeof document !== 'undefined') {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        // 소프트웨어 폴백 여부는 **어댑터가 스스로 밝힌 값**을 쓴다. 렌더러 종류로
        // 유추하지 않는다 — WebGPU 가 떠 있다는 사실과 그것이 GPU 라는 사실은 다르다.
        isFallbackAdapter = adapter.isFallbackAdapter ?? null;
        const info = adapter.info ?? (adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : null);
        if (info) adapterInfo = { vendor: info.vendor, architecture: info.architecture, device: info.device };
        const probe = document.createElement('canvas');
        probe.width = probe.height = 8;
        const r = new THREE.WebGPURenderer({ canvas: probe, antialias: false });
        await r.init();
        r.dispose();
        backend = 'WebGPU';
      } else {
        note = 'requestAdapter() 가 null — WebGPU 어댑터 없음';
      }
    } catch (e) {
      backend = 'WebGL';
      note = `WebGPU 프로브 실패: ${(e as Error)?.message ?? e}`;
    }
  } else if (opts.forceWebGL) {
    note = 'forceWebGL 로 WebGPU 를 시도하지 않음 — WebGPU 미측정';
  } else if (!hasWebGPUApi) {
    note = 'navigator.gpu 없음 — 이 브라우저/실행 플래그에서 WebGPU API 미노출';
  }

  const renderer: any = backend === 'WebGPU'
    ? new THREE.WebGPURenderer({ canvas, antialias: true })
    : new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
  if (backend === 'WebGPU') await renderer.init();

  renderer.setClearColor(0x0b0d12, 1);
  // ⚠ **명시한다 — 기본값에 기대지 않는다**(검수관 권고 P12, 2026-08-18). 값은 three
  // 기본값과 같아서 **동작은 안 바뀐다.** 그런데 W8-7 이 작품 텍스처에 `SRGBColorSpace`
  // 를 표시하는 근거가 «출력이 sRGB 로 인코딩된다» 이고, 그 전제가 여기 기본값 의존으로
  // 남아 있으면 three 가 기본을 바꾸는 날 **그 표시가 조용히 무의미해진다.**
  // 다른 월드는 전부 이미 적고 있다(`world.js`·`visit.js`·`builder.js`·`main.js`·
  // `lab-glb.js`) — world2 만 빠져 있었다.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const isGPU = backend === 'WebGPU';

  // ── 백엔드 라벨 확정 — **여기가 판정의 유일한 지점이다** ────────────────────
  // 소비자(`__world2.stats()`·HUD·telemetry·스모크)는 이 값을 읽기만 한다. 같은 판정을
  // 다른 곳에 다시 쓰면 한쪽만 고쳐도 아무도 모른다(이 저장소가 세 번 데인 형태).
  const glRenderer = readGLRenderer(renderer, backend);
  const backendDetail = classifyBackend({ backend, isFallbackAdapter, adapterInfo, glRenderer });
  const backendEvidence: BackendEvidence = {
    hasWebGPUApi, isFallbackAdapter, adapterInfo, glRenderer,
    note: backendDetail === 'unknown' && !note ? '하드웨어/소프트웨어를 가를 근거 없음' : note,
  };

  /** 후보정이 등록한 렌더 경로. `null` 이면 기본 경로다 */
  let renderHook: ((scene: THREE.Scene, camera: THREE.Camera) => void) | null = null;

  return {
    backend,
    backendDetail,
    backendEvidence,
    renderer,

    makeEnvMap(scene) {
      // realm 주의: three/webgpu 의 PMREMGenerator 와 three 의 것은 다른 클래스다.
      // 백엔드와 어긋난 쪽을 쓰면 내부 타입 검사에서 크래시한다.
      const Gen: any = isGPU ? (THREE as any).PMREMGenerator : PMREMGeneratorGL;
      const pm = new Gen(renderer);
      const tex = pm.fromScene(scene, 0.02).texture;
      pm.dispose();
      return tex;
    },

    freezeShadows(sun, frozen) {
      // 이중 기록이 필요한 유일한 자리. WebGL은 renderer.shadowMap 쪽을,
      // WebGPU는 라이트의 ShadowNode 쪽을 본다 — 한쪽만 쓰면 그 백엔드에서 무실효다.
      renderer.shadowMap.autoUpdate = !frozen;
      if (sun && sun.shadow) sun.shadow.autoUpdate = !frozen;
    },

    requestShadowBake(sun) {
      renderer.shadowMap.needsUpdate = true;
      if (sun && sun.shadow) sun.shadow.needsUpdate = true;
    },

    beginFrame() {
      // 자체 rAF 재귀를 쓰므로 three가 자동 리셋해주지 않는다. 안 부르면 누적된다.
      renderer.info.reset?.();
    },

    frameStats() {
      const r = renderer.info?.render ?? {};
      const m = renderer.info?.memory ?? {};
      return {
        // WebGPU: drawCalls가 프레임당 값 / WebGL: calls가 프레임당 값(drawCalls 필드 없음)
        draw: r.drawCalls ?? r.calls ?? 0,
        tri: r.triangles ?? 0,
        geometries: m.geometries ?? 0,
        textures: m.textures ?? 0,
      };
    },

    pipelineCount() {
      try {
        if (isGPU) {
          const caches = renderer._pipelines?.caches; // three 비공개 — 없어질 수 있다
          return caches ? caches.size : -1;
        }
        const programs = renderer.info?.programs;
        return programs ? programs.length : -1;
      } catch { return -1; } // 못 재면 -1. 0으로 돌려주면 불변식 검사가 통과해버린다
    },

    render(scene, camera) {
      // 훅이 있으면 그쪽이 그린다. 없으면 평소대로 — 후보정을 빼면 이 분기가 곧
      // 사라지는 것이 아니라 **항상 기본 경로**가 된다(분기 비용은 참조 비교 하나).
      if (renderHook) renderHook(scene, camera);
      else renderer.render(scene, camera);
    },
    setRenderHook(fn) { renderHook = fn; },
    setPixelRatio(r) { renderer.setPixelRatio(r); },
    getPixelRatio() { return renderer.getPixelRatio(); },
    setSize(w, h) { renderer.setSize(w, h, false); },
    dispose() { renderer.dispose?.(); },
  };
}

// ── 백엔드 라벨 판정 (감독 지시 2026-07-31) ──────────────────────────────────
//
// 순수 함수로 뺀다 — 테스트가 브라우저 없이 이 판정을 직접 재도록. 판정/집행 경계를
// 넘는 지점(값이 실제로 소비되는가)은 `__world2.stats()` 통합으로 따로 본다.

/**
 * WebGL `UNMASKED_RENDERER_WEBGL` 원문을 읽는다. 실패하면 **추측하지 않고 null**.
 *
 * WebGPU 경로에서도 읽는다 — WebGPU 어댑터가 `isFallbackAdapter` 를 안 알려주는
 * 브라우저가 있어서, 그럴 때 GL 쪽 문자열이 유일한 실마리다.
 */
function readGLRenderer(renderer: any, backend: Backend): string | null {
  try {
    // WebGL 경로: 살아있는 컨텍스트를 그대로 쓴다(새 컨텍스트를 만들면 개수가 는다)
    const gl = backend === 'WebGL' ? renderer.getContext?.() : null;
    const ctx = gl ?? (typeof document !== 'undefined'
      ? (() => { const c = document.createElement('canvas'); return c.getContext('webgl2') || c.getContext('webgl'); })()
      : null);
    if (!ctx) return null;
    const dbg = ctx.getExtension('WEBGL_debug_renderer_info');
    return String(dbg ? ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER));
  } catch { return null; }
}

/** 소프트웨어 래스터라이저의 서명. ANGLE 이 SwiftShader 를 감싸면 둘 다 문자열에 뜬다 */
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|软件|microsoft basic render/i;

/**
 * 라벨을 확정한다. **모르면 `unknown` 이다** — 낙관 해석하지 않는다.
 *
 * @param backend  프로브가 고른 실제 렌더 경로
 * @param isFallbackAdapter  WebGPU 어댑터가 스스로 밝힌 소프트웨어 여부(없으면 null)
 * @param adapterInfo  어댑터 vendor/architecture(없으면 null)
 * @param glRenderer  WebGL UNMASKED_RENDERER 원문(없으면 null)
 */
export function classifyBackend(args: {
  backend: Backend;
  isFallbackAdapter: boolean | null;
  adapterInfo: { vendor?: string; architecture?: string; device?: string } | null;
  glRenderer: string | null;
}): BackendDetail {
  const { backend, isFallbackAdapter, adapterInfo, glRenderer } = args;

  if (backend === 'WebGPU') {
    // ① 어댑터가 스스로 폴백이라고 밝히면 그것이 가장 강한 근거다
    if (isFallbackAdapter === true) return 'webgpu-software';
    // ② vendor 문자열에 소프트웨어 서명이 있으면 소프트웨어
    const vendor = `${adapterInfo?.vendor ?? ''} ${adapterInfo?.architecture ?? ''} ${adapterInfo?.device ?? ''}`;
    if (SOFTWARE_GL.test(vendor)) return 'webgpu-software';
    // ③ 명시적으로 false 를 받았으면 하드웨어로 본다
    if (isFallbackAdapter === false) return 'webgpu-hardware';
    // ④ 둘 다 못 받았다 — **모른다.** WebGPU 가 떴다는 것만으로 하드웨어라고 적지 않는다
    return 'unknown';
  }

  // WebGL 경로 — 렌더러 문자열이 유일한 근거다
  if (glRenderer === null) return 'unknown';
  return SOFTWARE_GL.test(glRenderer) ? 'webgl-software' : 'webgl-hardware';
}
