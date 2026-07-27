// world2/systems/sky.ts — 하늘. 라이브 오픈월드의 `sky.js`를 **그대로 쓰는 어댑터**다.
//
// ── 왜 새로 안 짜고 가져오는가 (감독 지시 2026-07-27) ────────────────────────
// world2를 시작하며 하늘도 새로 짰다. 그리고 같은 함정을 처음부터 다시 밟았다.
//
//   ① `ShaderMaterial`(GLSL)로 그렸다 → `three.webgpu` 빌드에는 렌더 경로가 없어
//      감독 실기기에서 하늘이 통째로 안 보였다.
//   ② 캔버스 텍스처에 `colorSpace`를 안 줬다 → 어두운 계조가 벌어져 밴딩·디더가
//      증폭됐고, 그게 하늘 색이 3배 밝아지는 것과 겹쳐 서로를 가렸다.
//   ③ 구름 판의 스케일 축이 눕히기 전 기준이었다 → 세로가 1 유닛이라 실선이 됐다.
//
// `sky.js`(929줄)에는 이 셋이 **전부 없다.** GLSL 0건이고, `tex.colorSpace = SRGBColorSpace`가
// 이미 지정돼 있고, 돔·구름이 전부 구(球)라 축 문제가 성립하지 않는다. 하네스 실측으로만
// 얻은 지식이 코드에 굳어 있다는 게 이런 것이고, 나는 그걸 처음부터 다시 배운 셈이다.
//
// 감독 판단이 정확했다 — **"원래 오픈월드 하늘 좋았는데."**
//
// ── 개수 불변식은 이미 지켜져 있다 ──────────────────────────────────────────
// `sky.js`는 비·눈·무지개·오로라를 **부팅 때 전부 만들어 `visible=false`로 재워두고**,
// 전환은 토글과 불투명도 보간으로만 한다. world2가 세운 원칙(부팅 시 전량 사전 할당,
// 런타임 개수 불변)을 그대로 따른다 — 우연이 아니라 같은 실측에서 나온 결론이다.
//
// 야간 맑음에서 실제로 그려지는 것은 돔·페이드돔·구름·별 정도이고, 나머지는 재워둔 채
// 재질·지오만 유지한다(파이프라인 개수는 상수, 드로우콜만 줄어든다).
//
// ── three 진입점 ────────────────────────────────────────────────────────────
// `sky.js`는 `three`(WebGL 빌드), world2는 `three/webgpu`를 import한다. 두 빌드 모두
// 클래스를 자체 정의하지 않고 `three.core.js`에서 가져오므로 **같은 클래스**다
// (`class Mesh extends` 정의 0건 확인). vite도 `vendor-three-core`를 별도 청크로 분리해
// 한 번만 로드한다. 즉 `instanceof`·씬그래프 혼선이 없다.

import * as THREE from 'three/webgpu';
import { createSkySystem } from '../../sky.js';
import type { FrameCtx, System } from '../kernel.js';

/** 태양까지의 거리 — `getSunDir()` 방향에 이 값을 곱해 광원을 배치한다. */
const SUN_DIST = 70;
/** 돔 반경. 카메라 far보다 작아야 잘리지 않는다(`sky.js`가 지오메트리를 교체하며 유지). */
const DOME_RADIUS = 520;

/** `sky.js`가 `get()`으로 돌려주는 **반영된** 상태(요청이 아니다 — 조합 보정이 적용된 결과). */
export interface SkyState {
  time: string;
  weather: string;
  fx: Record<string, boolean>;
  flashSafe?: boolean;
  /**
   * 돔 크로스페이드 진행 중인가. **`time`/`weather`는 `set()` 즉시 새 값이 되지만 실제로
   * 그려지는 것은 최대 1.8초 동안 다르다** — `fadeDome`이 하나 더 그려지고, 구름 가시성
   * 갱신도 그동안 멈춰 있어 이전 상태가 남는다. 드로우콜 판정이 이 구간을 구별해야 한다.
   */
  xfade?: boolean;
}

export interface SkyOptions {
  /** 소프트웨어 렌더 여부 — 크로스페이드 스냅·저해상 돔·강수 축소 분기 */
  soft?: boolean;
  /** 초기 시간대·날씨. 오픈월드 기본은 야간 맑음(커밋 `318addf` 감독 확정) */
  time?: string;
  weather?: string;
}

/**
 * 주입용 스카이돔 껍데기.
 *
 * `sky.js`가 부팅 직후 `sky.geometry`를 자기 것으로 교체하고 텍스처도 직접 굽는다.
 * 그래서 여기서는 "BackSide·fog 없음·먼저 그려지는 메시"라는 **형태만** 맞춰 준다.
 */
function makeDome(): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 24, 12), mat);
  m.renderOrder = -1;
  m.frustumCulled = false;
  return m;
}

/**
 * 하늘 System. `sky.js`를 소유하고 커널 프레임에 물린다.
 *
 * 배선은 라이브 오픈월드와 같은 **3접점**이다 — 생성 / `update` / `getSunDir`.
 * 조명색·안개·클리어색은 `sky.js`가 자기 소유로 제어하므로 여기서 건드리지 않는다.
 */
export class SkySystem implements System {
  readonly name = 'sky';

  private readonly dome: THREE.Mesh;
  private readonly engine: ReturnType<typeof createSkySystem>;
  private readonly sun: THREE.DirectionalLight;
  private readonly scene: THREE.Scene;

  constructor(
    scene: THREE.Scene,
    renderer: unknown,
    sun: THREE.DirectionalLight,
    hemi: THREE.HemisphereLight,
    getPos: () => { x: number; z: number },
    opts: SkyOptions = {},
  ) {
    this.scene = scene;
    this.sun = sun;
    this.dome = makeDome();
    this.dome.name = 'world2:sky';
    scene.add(this.dome);

    this.engine = createSkySystem({
      scene, renderer, sun, hemi, sky: this.dome,
      getPos,
      soft: opts.soft ?? false,
      // world2에는 아직 바다가 없다 — 수면 빛반사를 끈다.
      waterY: null,
    });
    // 오픈월드 기본 하늘 = 야간 맑음. fade 0으로 즉시 적용(부팅 중 크로스페이드 낭비 방지).
    this.engine.set(
      { time: opts.time ?? 'night', weather: opts.weather ?? 'clear' },
      { fade: 0 },
    );
    this.applySun();
  }

  /** 하늘 그림의 해·달 방위와 그림자 방향을 맞춘다. */
  private applySun(): void {
    const d = this.engine.getSunDir();
    if (!d) return;
    this.sun.position.set(d.x * SUN_DIST, d.y * SUN_DIST, d.z * SUN_DIST);
  }

  update(ctx: FrameCtx): void {
    if (ctx.hidden) return;
    // 크로스페이드·강수·오로라·번개 진행. 조명·안개·클리어색 갱신도 여기서 일어난다.
    // 돔이 플레이어를 따라오게 하는 것도 `sky.js`가 주입받은 `getPos`로 직접 처리한다.
    this.engine.update(ctx.dt);
    this.applySun();
  }

  /** 적응계가 부하를 낮출 때 — 하늘 투명 레이어 오버드로우를 줄인다. */
  setLite(on: boolean): void {
    this.engine.setLite(on);
  }

  /**
   * 시간대·날씨·이벤트 변경(神 모드 패널·URL 파라미터용).
   *
   * `set` 직후 태양을 다시 맞춘다 — `sky.js`가 그림 속 해·달 방위를 바꾸는데 광원이 옛
   * 방향에 남아 있으면 그림자가 하늘과 어긋난다.
   */
  set(state: Record<string, unknown>, opt?: { fade?: number }): void {
    this.engine.set(state, opt);
    this.applySun();
  }

  get(): SkyState {
    return this.engine.get();
  }

  /**
   * 패널이 붙을 수 있게 엔진 자체를 내준다.
   *
   * `set`/`get`만 노출하는 얇은 창구다 — 패널이 `sky.js`의 나머지(update·dispose 등)를
   * 만지면 System이 소유권을 잃는다. 프레임 진행과 자원 반납은 끝까지 이 클래스 몫이다.
   */
  /** 번개 즉시 발동(비일 때만). 자동 발동은 평균 13~20초 간격이라 확인이 어렵다. */
  bolt(): boolean {
    return this.engine.bolt?.() ?? false;
  }

  get controls(): {
    set: SkySystem['set']; get: SkySystem['get']; bolt: SkySystem['bolt'];
  } {
    return {
      set: this.set.bind(this),
      get: this.get.bind(this),
      bolt: this.bolt.bind(this),
    };
  }

  dispose(): void {
    this.engine.dispose();
    this.scene.remove(this.dome);
    this.dome.geometry.dispose();
    const m = this.dome.material as THREE.MeshBasicMaterial;
    m.map?.dispose();
    m.dispose();
  }
}
