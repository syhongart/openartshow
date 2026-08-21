// @vitest-environment jsdom
//
// tests/world2-daylit.test.ts — 복합씬 `daylit` (감독 2026-08-21).
//
// 감독 지시: *"복합씬 하나 더 만들고 싶은데. 주간 + 야간 섞고 싶어. 주간인데. 불이
// 켜져있고. 하늘에하늘은 더 진한데.. 별도 있어. 구름 당연히 있고. 전체적인 느낌은
// 주간처럼 밝지."*
//
// ── 이 파일이 재는 것: **접히는 축과 안 접히는 축의 경계** ──────────────────
// 팀장 판정 (다) 로 `SkyTime` 은 넷이 됐지만 **팔레트 계층은 셋만 안다**. 그 경계가
// `decide/night.ts` 의 `paletteTime()` 하나이고, **무엇이 그 함수를 거치고 무엇이
// 안 거치는가**가 이 씬의 정체다:
//
//   접는다(낮을 빌린다)   팔레트 · 물 광택 · 접촉그림자 · 조명 하한 · 낮 대비 · 지면 알베도
//   안 접는다(씬의 정체)  하늘 농도 · 별 · 가로등 발광 · 블룸
//
// ⚠ 이 목록은 한때 *"점등 세기 · 하늘 농도 · 별"* 셋이었고 **틀렸다** — `nightness()`
// 소비자를 둘로 세었는데 실제로는 다섯이었다(검수관 반려 B4′). 값까지 포함한 전수는
// `decide/night.ts` 의 `paletteTime` 주석 **한 곳**이다 — 여기에 다시 적지 않는다.
//
// ⚠ **접기가 한쪽으로 새면 씬이 조용히 죽는다.** 별·점등까지 접히면 화면이 낮과
// 똑같아지고, 반대로 팔레트가 안 접히면 `LIGHT['daylit']` 이 `undefined` 가 된다.
// 그래서 양쪽을 **둘 다** 못 박는다.
//
// ── ⚠ 첫 판본은 별 축을 **텍스트로** 봤고, 그것이 검수관 반려였다 (B1, 2026-08-21) ──
// `sky.js` 의 조건식 한 줄을 읽어 `'daylit'` 이 들어 있는지만 봤다. 그 검사는 초록이었고
// **화면에는 별이 하나도 안 떴다** — `sky.js` 의 `SKY_TIMES` 가 셋뿐이라 `normalize()` 가
// `'daylit'` 요청을 **조용히 버리고** 이전 시간대로 되돌리고 있었다. 조건식은 영영 거짓인
// 죽은 코드였고, 텍스트 검사는 그 사실을 **구조적으로** 볼 수 없다.
//
// 그래서 아래 GS-D4·GS-D5 는 `createSkySystem`·`SkySystem` 을 **실제로 부른다**. 캔버스
// 2D 컨텍스트만 스텁하고(`tests/sky-paint-wiring.test.ts` 가 이미 쓰는 선례) three 는
// 실물이다 — GPU 가 필요한 것은 렌더뿐이고, 씬 그래프와 `visible` 토글은 순수 JS 다.
//
// ── 이 파일이 **못 재는 것** (통과로 적지 않는다) ───────────────────────────
// ⚠ **관측 지점은 별 메시의 `visible` 이고, 그것은 「보인다」가 아니다.** 낮 하늘 위의
// AdditiveBlending 별이 눈에 띄는지는 톤매핑 뒤에서만 판정되고 이 축으로는 못 잰다 —
// 정의가 아니라 **한계**로 적는다(검수관 P6).
//
// 🔴 **블룸 세기는 아예 못 잰다.** 실측: `postfxFeature.create()` 를 이 환경에서 부르면
// `{ on: false, failure: "WebGL 백엔드 — TSL 후보정이 부팅을 깨뜨려 켜지 않는다
// (WebGPU 전용)" }` 이 나온다. `applyLevel` 이 `if (!bloomNode) return` 으로 먼저 빠지므로
// **세기 자체가 계산되지 않는다.** jsdom 도 헤드리스 스모크도 WebGL 이라 이 축은 감독
// 실기기(WebGPU)가 유일한 판정 수단이다 — 뮤테이션 N8(블룸에서 `?lit=` 를 떼기)이
// **0 failed** 인 것은 검사가 없어서가 아니라 **잴 수 있는 자리가 없어서**다.
// 텍스트로 조건식을 읽어 때우지 않는다 — 그것이 검수관 반려 B1 의 형태다. 백로그 `G-DL1`.
//
// 지면 알베도(×2.05 대 ×1.0)는 배수는 재지만 **화면에서 형광으로 보이는지**는 못 잰다.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import {
  paletteTime, nightness, TIMES, DAYLIT_LIGHTS, type SkyTime,
} from '../frontend/js/world2/decide/night.js';
import { waterGloss } from '../frontend/js/world2/decide/water-gloss.js';
import { createSkySystem } from '../frontend/js/sky.js';
import { SkySystem } from '../frontend/js/world2/systems/sky.js';
import { skyFeature } from '../frontend/js/world2/features/sky.js';
import { DAY_SUN_I, DAY_HEMI_I } from '../frontend/js/world2/decide/daylight.js';

/**
 * `sky.js` 가 캔버스에 하늘을 굽는다. jsdom 에는 2D 컨텍스트가 없으므로 **그리기만**
 * 스텁한다 — 굽는 내용은 이 파일의 관심사가 아니고(그 축은 `sky-paint-wiring.test.ts`),
 * 여기서 보는 것은 **어떤 레이어가 켜지는가**다.
 */
beforeAll(() => {
  const noop = () => {};
  const grad = () => ({ addColorStop: noop });
  const ctx = {
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    // 돔 페인트를 **체크섬으로 남긴다**. 빈 함수로 두면 "무엇이 구워졌는가" 를 밖에서
    // 볼 길이 없고, 하늘 농도 배선을 통째로 지워도 검사가 통과한다(검수관 반려 B2′).
    putImageData(img: { data: Uint8ClampedArray }) {
      let sum = 0;
      // 전 픽셀을 더하면 2048×1024×4 를 매번 훑는다. 소수 간격 표본이면 값이 바뀔 때
      // 합도 바뀌고 비용은 1/997 이다.
      for (let i = 0; i < img.data.length; i += 997) sum += img.data[i];
      paints.push(sum);
    },
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    clearRect: noop, fillRect: noop, drawImage: noop, save: noop, restore: noop,
    translate: noop, rotate: noop, scale: noop, beginPath: noop, closePath: noop,
    arc: noop, moveTo: noop, lineTo: noop, fill: noop, stroke: noop, ellipse: noop,
    rect: noop, clip: noop, quadraticCurveTo: noop, bezierCurveTo: noop, arcTo: noop,
    setTransform: noop, transform: noop, roundRect: noop, fillText: noop,
    measureText: () => ({ width: 0 }),
    createLinearGradient: grad, createRadialGradient: grad,
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
    globalCompositeOperation: '', filter: '',
  };
  // @ts-expect-error 테스트 스텁 — jsdom 은 2D 컨텍스트를 안 준다
  HTMLCanvasElement.prototype.getContext = function () { return ctx; };
});

/**
 * 별 레이어를 식별하는 값. `sky.js` 의 `mkTwk` 가 별 메시에만 주는 `renderOrder` 다.
 *
 * ⚠ 이름이 아니라 이 값으로 찾는 이유: 별 메시에는 `name` 이 없다. 재질 종류(가산합성)로
 * 찾으면 다른 레이어와 겹칠 수 있어 가장 좁은 식별자를 골랐다 — 저쪽이 바뀌면 아래
 * "둘이어야 한다" 단언이 먼저 깨져서 **조용히 0개를 세는 일이 없다**.
 */
const STAR_RENDER_ORDER = -0.92;

/** 돔이 구워질 때마다 쌓이는 체크섬. 검사가 구간을 잘라 비교한다 */
const paints: number[] = [];

/**
 * `world2.html` 의 神 모드 패널 블록. **실물을 잘라 온다** — 손으로 최소 DOM 을 지으면
 * 「버튼이 HTML 에서 사라졌다」는 회귀를 검사가 못 본다(이 저장소가 CSS·마크업에서 여러
 * 번 데인 형태다).
 */
function godPanelHtml(): string {
  const html = readFileSync(join(process.cwd(), 'frontend/world2.html'), 'utf8');
  const start = html.indexOf('<div id="w2-god"');
  expect(start, '🔴 `#w2-god` 패널을 못 찾았다 — 이 검사의 대상이 사라졌다').toBeGreaterThan(-1);
  // 패널 다음 형제까지 갈 필요 없이, 닫는 주석 없이도 `</div>` 균형만 맞추면 된다.
  let depth = 0, i = start;
  for (; i < html.length; i++) {
    if (html.startsWith('<div', i)) depth++;
    else if (html.startsWith('</div>', i)) { depth--; if (depth === 0) { i += 6; break; } }
  }
  return html.slice(start, i);
}

/** 렌더러 스텁 — `sky.js` 가 실제로 부르는 둘만 */
const fakeRenderer = () => ({ toneMappingExposure: 1, setClearColor() {} });

/**
 * 씬 그래프 노드의 **최소 모양**. `THREE.Object3D` 를 타입으로 쓰지 않는 이유는 이
 * 저장소가 이미 여러 번 겪은 TS2694(`three` 와 `three/webgpu` 의 타입 네임스페이스가
 * 서로 다르다) 때문이다 — `systems/night-lights.ts` 가 같은 이유로 구조적 타입을 쓴다.
 */
type NodeLike = { name?: string; visible: boolean; renderOrder: number; children: NodeLike[] };
const nodes = (o: unknown) => (o as NodeLike).children;

/** 별 메시들. **비어 있으면 그 자체가 실패다**(관측 지점을 잃은 것) */
function starsOf(dome: unknown): NodeLike[] {
  const found = nodes(dome).filter((c) => c.renderOrder === STAR_RENDER_ORDER);
  expect(found.length, '🔴 별 레이어를 못 찾았다 — 이 파일의 관측 지점이 사라졌다').toBe(2);
  return found;
}
const litStars = (dome: unknown) => starsOf(dome).every((m) => m.visible);

describe('🔴 GS-D1 — 접는 축: 팔레트는 시간대가 넷인 것을 모른다', () => {
  it('`daylit` 은 팔레트에서 낮으로 접힌다', () => {
    expect(paletteTime('daylit')).toBe('day');
  });

  it('나머지 셋은 자기 자신이다 — 접기가 기존 시간대를 안 건드린다', () => {
    for (const t of ['day', 'sunset', 'night'] as const) {
      expect(paletteTime(t), `🔴 ${t} 가 다른 값으로 접혔다`).toBe(t);
    }
  });

  it('🔴 물 광택은 낮과 **같다** — 밝기를 따라가는 축이다', () => {
    expect(waterGloss('daylit')).toEqual(waterGloss('day'));
  });

  it('시간대 목록에 들어 있다 — 없으면 `?time=daylit` 이 튕긴다', () => {
    expect(TIMES).toContain('daylit');
  });
});

describe('🔴 GS-D2 — 안 접는 축: 이것이 씬의 정체다', () => {
  it('🔴 불이 켜진다 — 낮은 0 인데 복합씬은 0 이 아니다', () => {
    expect(nightness('day'), '전제 — 낮에는 안 켜진다').toBe(0);
    expect(nightness('daylit'), '🔴 복합씬에 불이 안 켜진다 — 감독 요구의 절반이 죽는다')
      .toBeGreaterThan(0);
  });

  it('🔴 그런데 밤만큼 켜지지는 않는다 — 「주간처럼 밝지」와 함께 서야 한다', () => {
    expect(nightness('daylit')).toBeLessThan(nightness('night'));
  });

  it('점등 세기를 노브가 이긴다 — 화면 판정 값이라 열어 뒀다', () => {
    expect(nightness('daylit', 0.2)).toBe(0.2);
    expect(nightness('daylit', 1)).toBe(1);
  });

  it('🔴 노브는 **복합씬에만** 먹는다 — 다른 시간대를 흔들면 안 된다', () => {
    for (const t of ['day', 'sunset', 'night'] as const) {
      expect(nightness(t, 0.33), `🔴 ${t} 가 점등 노브에 흔들렸다`).toBe(nightness(t));
    }
  });

  it('기본 점등 세기가 0~1 안에 있다', () => {
    expect(DAYLIT_LIGHTS).toBeGreaterThan(0);
    expect(DAYLIT_LIGHTS).toBeLessThanOrEqual(1);
  });
});

describe('🔴 GS-D3 — 하늘은 낮보다 진하고, 별은 켜진다', () => {
  it('🔴 복합씬 하늘 농도가 낮보다 크다 — 감독 «하늘은 더 진한데»', async () => {
    const { SKY_BLUE, SKY_BLUE_DAYLIT, SKY_BLUE_MAX } =
      await import('../frontend/js/world2/systems/sky.js');
    expect(SKY_BLUE_DAYLIT, '🔴 낮과 같거나 옅다 — 그러면 「더 진한」 이 아니다')
      .toBeGreaterThan(SKY_BLUE);
    expect(SKY_BLUE_DAYLIT, '노브 상한을 넘으면 링크로 재현할 수 없다')
      .toBeLessThanOrEqual(SKY_BLUE_MAX);
  });

  // ⚠ 별 축의 텍스트 검사 두 건이 여기 있었고 **검수관이 반려했다**(B1). 그 서사는 이
  // 파일 머리말 한 곳이고, 대체물이 아래 GS-D4·GS-D5 다.
});

describe('🔴 GS-D4 — `sky.js` 실물: 별 축이 시간대와 독립으로 도달한다', () => {
  /** 하늘 엔진 하나. `sky` 돔은 `sky.js` 가 자식으로 레이어를 붙이는 대상이다 */
  function boot(wantStars?: () => boolean) {
    const scene = new THREE.Scene();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(520, 8, 8), new THREE.MeshBasicMaterial());
    scene.add(dome);
    const engine = createSkySystem({
      scene, renderer: fakeRenderer(),
      sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(),
      sky: dome, getPos: () => ({ x: 0, z: 0 }),
      ...(wantStars ? { wantStars } : {}),
    });
    return { engine, dome };
  }

  it('🔴 `wantStars` 가 참이면 **낮에도** 별 메시가 켜진다 — 이것이 도달 가능성이다', () => {
    const { engine, dome } = boot(() => true);
    engine.set({ time: 'day', weather: 'clear' }, { fade: 0 });
    expect(litStars(dome), '🔴 복합씬에서 별이 안 뜬다 — 감독 요구 «별도 있어»').toBe(true);
  });

  it('🔴 거짓이면 낮에 안 켜진다 — 참/거짓이 갈리지 않으면 위 검사는 아무것도 안 잰다', () => {
    const { engine, dome } = boot(() => false);
    engine.set({ time: 'day', weather: 'clear' }, { fade: 0 });
    expect(litStars(dome)).toBe(false);
  });

  it('🔴 world1 회귀 — 옵션을 **안 주면** 낮에 별이 없다', () => {
    const { engine, dome } = boot();
    engine.set({ time: 'day', weather: 'clear' }, { fade: 0 });
    expect(litStars(dome), '🔴 라이브 world1 의 낮 하늘에 별이 떴다').toBe(false);
  });

  it('🔴 world1 회귀 — 옵션 없이도 **밤에는** 별이 있다', () => {
    const { engine, dome } = boot();
    engine.set({ time: 'night', weather: 'clear' }, { fade: 0 });
    expect(litStars(dome), '🔴 밤에 별이 안 뜬다 — 라이브 회귀').toBe(true);
  });

  it('🔴 맑음 조건은 살아 있다 — 비 오는 밤에 별이 뜨면 안 된다', () => {
    const { engine, dome } = boot(() => true);
    engine.set({ time: 'night', weather: 'rain' }, { fade: 0 });
    expect(litStars(dome), '🔴 비구름 위로 별이 보인다').toBe(false);
  });

  it('🔴 전제 — 목록 밖 시간대는 **조용히 버려지고 이전 값이 남는다**', () => {
    // 반려(B1)의 원인이 이것이고, `paletteTime()` 으로 접는 이유도 이것이다. 예외도
    // 경고도 없이 **이전 상태가 유지**되므로 호출자는 성공과 구별할 수 없다.
    const { engine } = boot();
    engine.set({ time: 'night', weather: 'clear' }, { fade: 0 });
    engine.set({ time: 'daylit', weather: 'clear' }, { fade: 0 });
    expect(engine.get().time, '🔴 팔레트가 넷째 시간대를 받게 됐다 — 접기의 전제가 바뀌었다')
      .toBe('night');
  });

  it('🔴 전제 — 부팅 직후 엔진 시간대는 **낮**이다', () => {
    // ⚠ 이 전제 위에서만 **부팅 경로의 접기가 뮤테이션으로 안 잡힌다**(2026-08-21 실측:
    // 부팅 쪽 접기를 우회해도 0 failed). 목록 밖 값이 버려질 때 남는 것이 마침 낮이라
    // «접은 결과» 와 결과가 같기 때문이다. 즉 그 자리의 검출력은 0 이고, **그 사실을
    // 여기서 못 박아 둔다** — 초기값이 바뀌면 이 검사가 먼저 빨간불이 되어 다음 사람이
    // 부팅 경로를 다시 본다. (전환 경로는 위·아래 검사가 실제로 잡는다.)
    expect(boot().engine.get().time).toBe('day');
  });

  it('🔴 매 전환마다 다시 묻는다 — 값으로 굳으면 부팅 시각에 고정된다', () => {
    let on = false;
    const { engine, dome } = boot(() => on);
    engine.set({ time: 'day', weather: 'clear' }, { fade: 0 });
    expect(litStars(dome)).toBe(false);
    on = true;
    engine.set({ time: 'day', weather: 'clear' }, { fade: 0 });
    expect(litStars(dome), '🔴 부팅 시각의 답에 굳었다').toBe(true);
  });
});

describe('🔴 GS-D5 — `SkySystem` 실물: 접기가 별·팔레트를 양쪽으로 가른다', () => {
  function boot(time: string) {
    const scene = new THREE.Scene();
    const sun = new THREE.DirectionalLight();
    const hemi = new THREE.HemisphereLight();
    const renderer = fakeRenderer();
    const sys = new SkySystem(
      scene as unknown as never, renderer, sun as unknown as never, hemi as unknown as never,
      () => ({ x: 0, z: 0 }), { time, weather: 'clear' },
    );
    const dome = nodes(scene).find((c) => c.name === 'world2:sky')!;
    return { sys, dome, sun, hemi, renderer };
  }
  /** 프레임 한 번. 낮 대비·밤 하한은 `update` 에서 걸린다 */
  const tick = (sys: SkySystem) => sys.update(
    { dt: 1 / 60, ageMs: 16, frame: 1, hidden: false, resumed: false } as never,
  );

  it('🔴 `time:daylit` 부팅에서 별이 켜진다 — 반려된 그 경로다', () => {
    const { dome } = boot('daylit');
    expect(litStars(dome), '🔴 복합씬에 별이 없다').toBe(true);
  });

  it('🔴 그런데 팔레트는 **낮**이다 — 접기가 실제로 걸렸는가', () => {
    const { sys, sun, hemi } = boot('daylit');
    const day = boot('day');
    expect(sun.intensity, '🔴 복합씬 태양이 낮과 다르다 — 팔레트가 안 접혔다')
      .toBeCloseTo(day.sun.intensity, 5);
    expect(hemi.intensity).toBeCloseTo(day.hemi.intensity, 5);
    // 접히지 않았다면 `LIGHT['daylit']` 조회가 `undefined` 라 여기 오기 전에 죽는다.
    expect(sys.get().weather).toBe('clear');
  });

  // ⚠ 이 검사 이름은 한때 **「주간처럼 밝지」** 였고 **내용보다 넓었다**(검수관 B4′) —
  // 감독이 말한 그 인상은 조명·노출 셋으로 결정되지 않는다(블룸·지면 알베도가 함께 든다).
  // 이름을 재는 것으로 좁힌다. 나머지 축은 GS-D6 이 본다.
  it('🔴 낮 대비가 걸리고 밤 노출 하한은 안 걸린다', () => {
    const { sys, sun, hemi, renderer } = boot('daylit');
    tick(sys);
    expect(sun.intensity, '🔴 낮 하드라이트가 안 걸렸다').toBeCloseTo(DAY_SUN_I, 5);
    expect(hemi.intensity).toBeCloseTo(DAY_HEMI_I, 5);
    expect(renderer.toneMappingExposure, '🔴 밤 노출이 걸렸다 — 화면이 낮보다 어두워진다')
      .toBeCloseTo(1, 5);
  });

  it('🔴 밤은 그대로 밤이다 — 위 셋이 밤까지 낮으로 만들면 안 된다', () => {
    const { sys, renderer } = boot('night');
    tick(sys);
    expect(renderer.toneMappingExposure, '🔴 밤 노출 하한이 사라졌다').toBeGreaterThan(1);
  });

  it('🔴 밖으로 내는 `time` 은 **접기 전** 값이다 — 패널 강조·드로우콜 키가 이것을 본다', () => {
    expect(boot('daylit').sys.get().time).toBe('daylit');
    expect(boot('night').sys.get().time).toBe('night');
  });

  it('🔴 전환 경로도 산다 — 패널로 고르는 길이 죽으면 부팅만 맞는 「거짓 노브」다', () => {
    const { sys, dome } = boot('night');
    sys.set({ time: 'day' }, { fade: 0 });
    expect(litStars(dome), '전제 — 낮에는 별이 없다').toBe(false);
    sys.set({ time: 'daylit' }, { fade: 0 });
    expect(litStars(dome), '🔴 패널로 복합씬을 골랐는데 별이 안 켜진다').toBe(true);
    expect(sys.get().time).toBe('daylit');
    sys.set({ time: 'day' }, { fade: 0 });
    expect(litStars(dome), '🔴 복합씬에서 빠져나와도 별이 남는다').toBe(false);
  });

  it('🔴 시간대 없는 `set` 은 시간대를 안 바꾼다 — 날씨만 고르는 경로가 있다', () => {
    const { sys, dome } = boot('daylit');
    sys.set({ weather: 'rain' }, { fade: 0 });
    expect(sys.get().time, '🔴 날씨를 바꿨는데 시간대가 날아갔다').toBe('daylit');
    expect(litStars(dome), '비가 오면 별은 가린다').toBe(false);
    sys.set({ weather: 'clear' }, { fade: 0 });
    expect(litStars(dome), '🔴 날씨가 개도 별이 안 돌아온다').toBe(true);
  });
});


/**
 * 🔴 조립 실물 — **배선까지** 본다.
 *
 * ── 왜 이 describe 가 생겼나 (검수관 반려 B1′·B2′·B3′·B5′, 2026-08-21) ──────
 * 위 GS-D4·GS-D5 는 별 축을 실물로 잡았지만 나머지 축은 **순수 함수와 상수만** 보고
 * 있었다. 검수관이 뮤테이션으로 실측했다:
 *
 *   · 복합씬 하늘 농도를 낮과 같게 만들어도  → 전체 스위트 **추가 실패 0**
 *   · 복합씬 가로등을 아예 끄게 만들어도     → 전체 스위트 **추가 실패 0**
 *
 * 감독 요구 넷 중 **둘이 검사받지 않고 있었다.** 게다가 하늘 농도는 실제로 **버튼
 * 경로에서 죽어 있었다** — 생성 옵션이라 세션당 1회만 평가됐고, `sky.js` 의 `skyBlue`
 * 는 대입이 0 건이라 부팅 뒤 바꿀 수단이 없었다. 상수 검사(`SKY_BLUE_DAYLIT > SKY_BLUE`)
 * 는 그 사실을 **구조적으로** 볼 수 없다. 직전 반려(B1)와 같은 형태다.
 *
 * 그래서 `skyFeature.create()` 를 **실제로 부른다.** 이 함수가 `SkySystem`·`LampGlow`·
 * `GroundLift` 를 다 만들고 노브를 다 읽으므로, 배선이 끊기면 여기서 드러난다.
 */
describe('🔴 GS-D6 — 조립 실물: 감독 요구 넷이 배선까지 도달한다', () => {
  /** 기능 하나를 실제로 조립한다. `env` 는 `create` 가 실제로 만지는 것만 채운다 */
  function assemble(time: string) {
    const scene = new THREE.Scene();
    const sun = new THREE.DirectionalLight();
    const hemi = new THREE.HemisphereLight();
    const renderer = fakeRenderer();
    /** 가로등 재질. `emissiveIntensity` 가 배선의 관측 지점이다 */
    const lamp: { emissiveIntensity?: number } = { emissiveIntensity: -1 };
    /** 지면 재질들 — 알베도 배수가 곱해지는 자리 */
    const ground = { color: { r: 1, g: 1, b: 1 } };
    let now = time;
    // 🔴 **진짜 패널 마크업을 심는다.** 손으로 최소 DOM 을 만들면 「버튼이 HTML 에서
    // 사라진 회귀」를 못 본다 — `world2.html` 에서 실제 블록을 잘라 온다.
    document.body.innerHTML = godPanelHtml();
    const env = {
      scene, sun, hemi,
      adapter: { renderer },
      player: { position: { x: 0, y: 0, z: 0 } },
      pools: { materialOf: (k: string) => (k === 'lamp' ? lamp : ground) },
      time: () => now,
      setTime: (v: string) => { now = v; },
      doc: document,
      shadowDist: 70,
      shadowTexel: 0,
    };
    const from = paints.length;
    // `create` 는 기능을 못 붙이면 `null` 을 낸다. 여기서 `null` 이면 조립 자체가
    // 실패한 것이라 아래 검사가 전부 무의미하므로, 조용히 넘어가지 않고 세운다.
    const inst = skyFeature.create(env as never);
    expect(inst, '🔴 하늘 기능이 조립되지 않았다 — 이 describe 의 전제가 무너졌다').toBeTruthy();
    return {
      inst: inst!, lamp, ground, sun, hemi, renderer,
      diag: () => inst!.diagnostics!() as Record<string, unknown>,
      /** 이 조립이 구운 돔 체크섬들 */
      paints: () => paints.slice(from),
      /** 프레임 한 번. 조명 하한·낮 대비는 `update` 에서 걸린다 */
      tick: () => inst!.system!.update(
        { dt: 1 / 60, ageMs: 16, frame: 1, hidden: false, resumed: false } as never,
      ),
      /** 神 모드 패널의 시간대 버튼을 **실제로 누른다** */
      press: (t: string) => {
        const b = document.querySelector<HTMLElement>(`button[data-time="${t}"]`);
        expect(b, `🔴 «${t}» 버튼이 HTML 에 없다 — 감독이 화면에서 고를 문이 사라졌다`)
          .not.toBeNull();
        b!.click();
      },
    };
  }

  it('🔴 «불이 켜져있고» — 복합씬에서 가로등이 실제로 켜진다', () => {
    expect(assemble('day').lamp.emissiveIntensity, '전제 — 낮에는 꺼져 있다').toBe(0);
    expect(assemble('daylit').lamp.emissiveIntensity, '🔴 복합씬에서 가로등이 안 켜졌다')
      .toBeGreaterThan(0);
  });

  it('🔴 점등 노브(`?lit=`)가 배선까지 닿는다', () => {
    // 노브를 직접 못 흔드니(전역 `location`) **기본값이 실제로 소비됐는지**를 본다:
    // 복합씬 발광이 밤 발광보다 작아야 한다. 배선이 `nightness(time)`(노브 무시)로
    // 돌아가면 복합씬이 낮과 같은 0 이 되어 위 검사가 먼저 깨진다.
    const daylit = assemble('daylit').lamp.emissiveIntensity!;
    const night = assemble('night').lamp.emissiveIntensity!;
    expect(daylit, '🔴 복합씬이 한밤과 같은 세기로 켜졌다 — 점등 세기가 안 먹었다')
      .toBeLessThan(night);
  });

  it('🔴 «하늘은 더 진한데» — 패널 버튼으로도 하늘 농도가 실제로 바뀐다', () => {
    // 🔴 **이것이 B1′ 를 잡는 검사다.** 낮으로 부팅한 뒤 **패널 버튼을 눌러** 복합씬으로
    // 간다. 팔레트는 둘 다 낮이라 돔 페인트를 가르는 것은 `skyBlue` 하나뿐이다 — 완전한
    // 대조군이고, 그래서 페인트가 같으면 하늘 농도가 그 경로에 **도달하지 않은 것**이다.
    const a = assemble('day');
    const mark = paints.length;
    a.press('daylit');
    const after = paints.slice(mark);
    expect(after.length, '🔴 버튼을 눌렀는데 돔을 다시 굽지 않았다').toBeGreaterThan(0);
    expect(a.diag().time, '🔴 버튼이 시간대를 조립부에 못 전달했다').toBe('daylit');
    expect(a.diag().engineTime, '팔레트는 낮에서 빌린다 — 그래서 페인트 차이는 농도뿐이다')
      .toBe('day');

    // 같은 조립에서 낮으로 되돌린 페인트와 비교한다. 두 페인트가 같으면 농도가 안 걸렸다.
    const mark2 = paints.length;
    a.press('day');
    const back = paints.slice(mark2);
    expect(back.length, '🔴 되돌아갈 때도 돔을 다시 굽지 않았다').toBeGreaterThan(0);
    expect(after, '🔴 복합씬 하늘이 낮과 **똑같이** 구워졌다 — 감독 요구 «더 진한» 이 죽었다')
      .not.toEqual(back);
  });

  it('🔴 지면 알베도는 **접힌다** — 낮 조명 위에 밤 배수가 얹히면 형광이 된다', () => {
    const day = assemble('day').diag().groundLift;
    expect(assemble('daylit').diag().groundLift, '🔴 복합씬 지면이 낮과 다른 배수를 받았다')
      .toBe(day);
    expect(assemble('night').diag().groundLift, '전제 — 밤에는 배수가 다르다').not.toBe(day);
  });

  it('🔴 어긋남 탐지기가 산다 — 요청값과 엔진 반영값이 진단에 **둘 다** 있다', () => {
    const d = assemble('daylit').diag();
    expect(d.time, '🔴 요청 원값이 진단에서 사라졌다').toBe('daylit');
    expect(d.engineTime, '🔴 엔진 반영값이 없다 — 어긋남을 볼 축이 0 이 된다').toBe('day');
    // 접지 않는 시간대에서는 둘이 같다. 그래야 «다르면 신호» 가 성립한다.
    const n = assemble('night').diag();
    expect(n.time).toBe('night');
    expect(n.engineTime).toBe('night');
  });

  it('🔴 «주간처럼 밝지» — 노출이 낮 값이다(밤 하한이 안 걸린다)', () => {
    const d = assemble('daylit'); d.tick();
    expect(d.renderer.toneMappingExposure, '🔴 복합씬에 밤 노출이 걸렸다').toBeCloseTo(1, 5);
    const n = assemble('night'); n.tick();
    expect(n.renderer.toneMappingExposure, '전제 — 밤에는 노출이 오른다').toBeGreaterThan(1);
  });
});
