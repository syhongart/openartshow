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
// ── 개수 불변식 — 객체는 상수다. 그런데 그것으로는 부족했다 ─────────────────
// `sky.js`는 비·눈·무지개·오로라를 **부팅 때 전부 만들어 `visible=false`로 재워두고**,
// 전환은 토글과 불투명도 보간으로만 한다. world2가 세운 원칙(부팅 시 전량 사전 할당,
// 런타임 개수 불변)을 그대로 따른다 — 우연이 아니라 같은 실측에서 나온 결론이다.
//
// **여기까지가 이 주석이 오래 적고 있던 것이고, 거기서 뽑은 결론이 틀렸다.**
//
// 객체 개수가 상수인 것과 GPU 자원이 상수인 것은 다른 일이다. three 의 `info.memory` 는
// 객체를 만들 때가 아니라 **처음 그릴 때** 오른다. 재워둔 메시는 렌더 목록에 안 오르므로
// 지오 버퍼도, 텍스처 업로드도, 파이프라인도 그때까지 존재하지 않는다. 그래서 감독
// 실기기에서 낮→밤→천둥을 바꾼 구간에 pipeline 31→33 · geometry 92→95 · texture 32→35 가
// 계단으로 올랐다(2026-07-29 실측, 헤드리스 재현 1바퀴 +4/+4/+3 · 2바퀴 0).
//
// 그래서 `prewarm()` 이 있다 — 부팅 예열 프레임 동안 잠든 레이어를 잠시 켜서 그 비용을
// 로딩 화면으로 옮긴다. **개수가 상수라는 주장은 이제 `npm run measure:sky-warm` 이
// 검사한다.** 주석이 보증하던 것을 게이트가 보증한다.
//
// 야간 맑음에서 실제로 그려지는 것은 돔·페이드돔·구름·별 정도이고, 나머지는 재워둔 채
// 재질·지오만 유지한다(드로우콜만 줄어든다).
//
// ── three 진입점 ────────────────────────────────────────────────────────────
// `sky.js`는 `three`(WebGL 빌드), world2는 `three/webgpu`를 import한다. 두 빌드 모두
// 클래스를 자체 정의하지 않고 `three.core.js`에서 가져오므로 **같은 클래스**다
// (`class Mesh extends` 정의 0건 확인). vite도 `vendor-three-core`를 별도 청크로 분리해
// 한 번만 로드한다. 즉 `instanceof`·씬그래프 혼선이 없다.

import * as THREE from 'three/webgpu';
import { createSkySystem, moonPlacement } from '../../sky.js';
import {
  applyNightFloor, type HemiLike, type SunLike, type ExposureLike, type FogLike,
} from './night-lights.js';
import { createMoonGlow, type MoonGlow } from './sky-moon.js';
import { nightness, type NightTune } from '../decide/night.js';
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
   * **지금 그려지는 것이 논리 상태와 아직 일치하지 않는가.** `time`/`weather`는 `set()`
   * 즉시 새 값이 되지만 화면에 올라가는 메시 집합은 잠시 다르다(돔 크로스페이드 + 별
   * 반짝임 감쇠 꼬리). 드로우콜 판정이 이 구간을 구별해야 한다.
   *
   * 어떤 축이 여기 들어가는지는 **`sky.js`가 안다** — 소비자가 세지 않는다. 세 번 연속으로
   * 축을 빠뜨린 뒤 내린 결론이다.
   */
  settling?: boolean;
  /**
   * 저사양 축소 모드. 구름·별 레이어를 아예 끄므로 **드로우콜 판정 키에 들어가야 한다**
   * (전이가 아니라 다른 상태다). world2는 아직 `setLite`를 부르지 않지만 값은 노출된다.
   */
  lite?: boolean;
}

export interface SkyOptions {
  /** 소프트웨어 렌더 여부 — 크로스페이드 스냅·저해상 돔·강수 축소 분기 */
  soft?: boolean;
  /** 초기 시간대·날씨. 오픈월드 기본은 야간 맑음(커밋 `318addf` 감독 확정) */
  time?: string;
  weather?: string;
  /**
   * 밤 밝기 축의 튜닝값(URL 노브). 없으면 `decide/night.ts` 의 기본값.
   *
   * 배선이 읽어 여기로 넘기는 이유는 판정을 순수하게 두기 위해서다 — `decide/` 가
   * `location` 을 읽는 순간 테스트가 브라우저를 필요로 하게 된다.
   */
  nightTune?: NightTune;
  /**
   * 안개를 하늘색 쪽으로 미는 계수(0..1). 감독 지시 *"안개를 약간 하늘색으로"*.
   *
   * `sky.js` 의 **팔레트 단계**로 넘어간다. 안개색은 하늘 돔 지평선도 함께 칠하므로
   * (⑨ 규칙) 나중에 `scene.fog` 만 바꾸면 둘이 어긋나 원경이 하늘보다 밝게 뜬다 —
   * 이미 그렇게 깨뜨려 감독이 *"안개가 안보여"* 로 잡은 적이 있다.
   *
   * 기본 0 이면 `sky.js` 가 테이블 객체를 그대로 돌려주므로 라이브와 완전히 같다.
   */
  fogTint?: number;
  /**
   * 달 발광체가 알파 마스크 캔버스를 만들 문서. 없으면 발광체를 만들지 않는다.
   *
   * 하늘 자체는 문서 없이도 성립하므로(테스트가 그렇게 쓴다) **선택**이다 — 문서가
   * 없다고 하늘이 통째로 안 뜨는 것은 과잉이다.
   */
  doc?: Document | null;
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
  private readonly hemi: THREE.HemisphereLight;
  private readonly scene: THREE.Scene;
  /** 밤 노출을 얹을 대상. `toneMappingExposure` 만 만진다 */
  private readonly renderer: ExposureLike | null;
  private readonly nightTune?: NightTune;
  /**
   * 달을 블룸 문턱 위로 올리는 발광체 (world2 전용).
   *
   * `liftNightLights()` 와 같은 자리다 — `sky.js` 는 라이브 world1 과 공유하므로 거기서
   * 달을 밝히면 미술관 오픈월드의 밤도 함께 바뀐다. 감독 지시가 *"월드2 만이야"* 였다.
   * 문서가 없는 환경에서는 `null` 이고, 그때는 달이 평소대로 그려질 뿐 아무것도 안 깨진다.
   */
  private readonly moon: MoonGlow | null;

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
    this.hemi = hemi;
    // 렌더러가 `unknown` 인 것은 `sky.js` 가 이 인자를 그대로 쓰기 때문이다(어떤 백엔드든
    // 받는다). 노출을 만지려면 모양을 확인해야 하는데, 확인되지 않으면 `null` 로 두고
    // **건너뛴다** — 없는 속성에 값을 쓰면 조용히 아무 일도 안 일어나고, 그러면 "노출을
    // 올렸는데 화면이 그대로" 라는 가장 찾기 어려운 실패가 된다.
    const r = renderer as { toneMappingExposure?: unknown } | null;
    this.renderer = r && typeof r.toneMappingExposure === 'number' ? (r as ExposureLike) : null;
    this.nightTune = opts.nightTune;
    this.dome = makeDome();
    this.dome.name = 'world2:sky';
    scene.add(this.dome);

    this.engine = createSkySystem({
      scene, renderer, sun, hemi, sky: this.dome,
      getPos,
      soft: opts.soft ?? false,
      // world2에는 아직 바다가 없다 — 수면 빛반사를 끈다.
      waterY: null,
      fogTint: opts.fogTint ?? 0,
    });
    // 오픈월드 기본 하늘 = 야간 맑음. fade 0으로 즉시 적용(부팅 중 크로스페이드 낭비 방지).
    this.engine.set(
      { time: opts.time ?? 'night', weather: opts.weather ?? 'clear' },
      { fade: 0 },
    );
    this.applySun();

    // 달 발광체는 **돔의 자식**이다. 돔이 플레이어를 따라 움직여도 그림 속 달과 절대
    // 어긋나지 않는다 — 어긋나는 순간이 곧 화면에 달이 둘로 보이는 순간이다.
    // `engine.set` 뒤에 만드는 것은 그때 돔 지오메트리가 확정되기 때문이고, 부팅 시
    // 한 번뿐이라 예열이 이 파이프라인도 함께 굽는다.
    //
    // 좌표를 **여기서 받아 넘긴다.** `sky.js` 를 아는 것은 이 어댑터 하나여야 하고
    // (경계 검사가 지킨다), 발광체는 world1 을 모르는 순수 부품으로 남는다.
    this.moon = createMoonGlow(this.dome, DOME_RADIUS, opts.doc ?? null, moonPlacement());
    this.applyMoon();
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
    this.liftNightLights();
    this.applyMoon();
  }

  /**
   * 달의 밝기를 시간대에 맞춘다.
   *
   * 시간대는 **엔진 반영값**(`engine.get().time`)에서 읽는다 — 크로스페이드 중에는 화면에
   * 그려지는 하늘이 요청값보다 늦으므로, 요청값을 쓰면 달만 먼저 켜지거나 꺼진다.
   * `liftNightLights()` 가 같은 출처를 쓰는 것과 같은 이유다.
   *
   * 값이 안 바뀌면 `MoonGlow` 쪽에서 그대로 빠져나온다 — 매 프레임 불러도 공짜다.
   */
  private applyMoon(): void {
    this.moon?.setNightness(nightness(this.engine.get().time));
  }

  /**
   * 달 발광체의 진단. `features/sky.ts` 가 자기 스냅샷에 실어 준다.
   *
   * `null` 은 **발광체가 없다**는 뜻이고 0 이나 빈 객체와 다르다 — 화면에서도 "측정 안 됨"
   * 과 "0" 은 다른 일이라는 규율이 여기에도 적용된다.
   */
  moonDiagnostics(): Record<string, unknown> | null {
    return this.moon?.diagnostics() ?? null;
  }

  /**
   * 밤이 너무 어둡지 않게 **하한**을 얹는다 (감독 지시).
   *
   * ── 왜 여기인가 ───────────────────────────────────────────────────────────
   * `sky.js` 의 밤 팔레트는 라이브 world1 도 쓴다. 거기서 값을 올리면 미술관 오픈월드의
   * 룩이 함께 바뀐다. 어댑터가 있는 이유가 이런 것이라 world2 쪽에서만 얹는다.
   *
   * ── 왜 곱셈이 아니라 max 인가 ────────────────────────────────────────────
   * 이 함수는 **매 프레임** 돈다. 배수를 곱하면 프레임마다 곱해져 발산한다. 하한은 몇
   * 번 적용해도 결과가 같아서(멱등), `sky.js` 가 값을 덮어쓰든 크로스페이드 중이든
   * 안전하다. "언제 덮어쓰는가" 를 알아야 하는 처방은 그 지식이 어긋나는 순간 깨진다.
   *
   * 지면색을 채널별로 올리는 것이 핵심이다. `HemisphereLight.groundColor` 는 아래에서
   * 올라오는 빛이라, 그것이 검정(원래 `0x232a24`, 명도 15%)이면 위를 향한 면에 닿는
   * 빛이 아예 없다. 강도를 올려도 검정을 곱하면 검정이다.
   */
  private liftNightLights(): void {
    // 캐스팅하는 이유: `three/webgpu` 가 `HemisphereLight` 의 필드를 타입으로 완전히
    // 재수출하지 않는다(이 저장소가 `BufferGeometry`·`CanvasTexture`·`Object3D` 에서
    // 이미 겪은 TS2694 계열이다). 런타임 모양은 `HemiLike` 와 정확히 같다.
    applyNightFloor(
      {
        hemi: this.hemi as unknown as HemiLike,
        sun: this.sun as unknown as SunLike,
        renderer: this.renderer,
        // 안개는 `main.ts` 가 만들고 `sky.js` 가 매 프레임 색을 덮어쓴다. 우리는 그
        // **뒤에** 하한을 얹으므로 순서가 맞다(`update` 에서 engine 다음에 부른다).
        fog: (this.scene.fog as FogLike | null) ?? null,
      },
      this.engine.get().time,
      this.nightTune,
    );
  }


  /** 적응계가 부하를 낮출 때 — 하늘 투명 레이어 오버드로우를 줄인다. */
  setLite(on: boolean): void {
    this.engine.setLite(on);
  }

  /**
   * 부팅 예열 — 잠들어 있는 날씨 레이어를 잠시 켠다. 반환 함수로 되돌린다.
   *
   * 무엇이 잠들어 있는지 여기서 세지 않는다. `sky.js`가 자기 레이어 목록을 안다 —
   * 이 클래스가 세면 `sky.js`에 레이어가 하나 늘 때마다 조용히 빠진다.
   *
   * `?.`인 것은 이 어댑터가 `sky.js`의 옛 버전과도 물릴 수 있어서다. 없으면 예열을
   * 건너뛴다 — 첫 등장 비용을 세션 중에 낼 뿐 동작은 정상이다.
   */
  prewarm(): () => void {
    return this.engine.prewarm?.() ?? (() => {});
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
    // 달을 먼저 뗀다 — 돔의 자식이라 돔 지오메트리를 버리기 전에 정리해야 한다.
    this.moon?.dispose();
    this.engine.dispose();
    this.scene.remove(this.dome);
    this.dome.geometry.dispose();
    const m = this.dome.material as THREE.MeshBasicMaterial;
    m.map?.dispose();
    m.dispose();
  }
}
