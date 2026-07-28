// world2/adapters/renderer.ts — 백엔드 차이를 이 파일에만 가둔다.
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
  if (!opts.forceWebGL && typeof navigator !== 'undefined' && (navigator as any).gpu && typeof document !== 'undefined') {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (adapter) {
        const probe = document.createElement('canvas');
        probe.width = probe.height = 8;
        const r = new THREE.WebGPURenderer({ canvas: probe, antialias: false });
        await r.init();
        r.dispose();
        backend = 'WebGPU';
      }
    } catch { backend = 'WebGL'; }
  }

  const renderer: any = backend === 'WebGPU'
    ? new THREE.WebGPURenderer({ canvas, antialias: true })
    : new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
  if (backend === 'WebGPU') await renderer.init();

  renderer.setClearColor(0x0b0d12, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const isGPU = backend === 'WebGPU';

  /** 후보정이 등록한 렌더 경로. `null` 이면 기본 경로다 */
  let renderHook: ((scene: THREE.Scene, camera: THREE.Camera) => void) | null = null;

  return {
    backend,
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
