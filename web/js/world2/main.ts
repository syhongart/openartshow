// world2/main.ts — Composition Root. **조립만 한다.**
//
// 로직은 전부 kernel/decide/systems에 있고, 여기서는 그것들을 잇기만 한다. 현행 world.js가
// 2371줄이 된 경로가 "조립 자리에 로직이 한 줄씩 스며든" 것이었으므로, 이 파일에 판정이
// 생기려 하면 그건 decide로 가야 한다는 신호다.
//
// 부팅 순서가 곧 의존 순서다: 렌더러 → 풀 → 예열 → 스트리밍 충전 → 첫 프레임.

import * as THREE from 'three/webgpu';
import { Kernel } from './kernel.js';
import { createRendererAdapter, type RendererAdapter } from './adapters/renderer.js';
import { InstancePools } from './systems/instancing.js';
import { createPartAssets, createSlotPool } from './systems/parcel-assets.js';
import { PooledParcelBuilder } from './systems/parcel-builder.js';
import { StreamingSystem } from './systems/streaming.js';
import { PlayerSystem } from './systems/player.js';
import { AdaptSystem } from './systems/adapt.js';
import { runBoot, waitUntil } from './boot.js';
import { findLoading, LoadingView } from './ui/loading.js';
import { attachTouchControls } from './ui/touch-controls.js';
import { attachHud, type PerfHud } from './ui/hud.js';
import { findSkyPanel, attachSkyPanel, type SkyPanel } from './ui/sky-panel.js';
import { SkySystem } from './systems/sky.js';
import { DEFAULT_LAYOUT, type PartKind } from './decide/parcel-layout.js';

const CELL = 32;
const ALL_KINDS: readonly PartKind[] = ['ground', 'building', 'tree', 'lamp'];

/*
 * 동시 파셀 수 상수(`MAX_PARCELS = 20`)를 여기서 없앴다.
 *
 * 그 값은 헤드리스 실측 최대(17)에 눈대중 여유를 얹은 것이었는데, LOD 밴드에서 유도한
 * 이론 최악치는 **21**이다(farExit=2.40 반경 안 격자점 최대). 즉 상수가 이미 모자랐고,
 * 예산에 곱해둔 여유 배수 1.25가 그 부족을 덮어 `starved`를 0으로 만들고 있었다. 두 값이
 * 각각 틀린 채 서로를 상쇄하던 상태다 — 한쪽만 고쳤으면 그 자리에서 슬롯이 굶었다.
 *
 * 이제 `poolBudget`이 밴드에서 직접 유도한다. 밴드를 넓히면 예산이 따라오고, 실측을
 * 다시 뜰 필요도 없다.
 */

/**
 * 부하 배수 — `?density=N`(1~8). 파셀당 파츠 수를 N배로 올린다.
 *
 * 재작성의 반증 조건 중 하나가 **"밀도를 올려도 개수가 상수인가"**였다. 슬롯 풀
 * 설계가 옳다면 파츠를 몇 배로 늘려도 드로우콜·파이프라인·재질 수는 안 변해야 한다
 * (종류당 InstancedMesh 하나이므로). 그 예측이 틀리면 이 구조 자체가 틀린 것이다.
 *
 * 참고 — 라이브 오픈월드는 파셀마다 개별 메시를 만들어 정중앙 5방에서 드로우콜
 * **146**, 스폰 시 218~263이었다(OPENWORLD.md 실측). world2는 같은 상황에서 9~10이다.
 *
 * URL 파라미터로 둔 이유: 헤드리스 자동 시험과 감독 실기기 확인을 같은 수단으로
 * 하기 위해서다. 별도 빌드를 만들면 "무엇을 쟀는지"가 또 흐려진다.
 */
function readDensity(): number {
  if (typeof location === 'undefined') return 1;
  const raw = Number(new URLSearchParams(location.search).get('density'));
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.min(8, Math.round(raw)));
}

export interface WorldHandle {
  kernel: Kernel;
  dispose(): void;
}

export async function startWorld2(canvas: HTMLCanvasElement): Promise<WorldHandle | null> {
  const loadingParts = findLoading(document);
  const loading = loadingParts ? new LoadingView(loadingParts) : null;

  let adapter: RendererAdapter | null = null;
  let pools: InstancePools | null = null;
  let kernel: Kernel | null = null;

  const density = readDensity();
  // 밀도는 배치 판정에만 곱한다. 풀 예산은 이 레이아웃에서 자동으로 파생되므로
  // 두 곳에 따로 적지 않는다(값 미러링 금지).
  const LAYOUT = density === 1 ? DEFAULT_LAYOUT : {
    ...DEFAULT_LAYOUT,
    maxBuildings: DEFAULT_LAYOUT.maxBuildings * density,
    maxTrees: DEFAULT_LAYOUT.maxTrees * density,
    maxLamps: DEFAULT_LAYOUT.maxLamps * density,
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1200);
  scene.fog = new THREE.Fog(0x0b0d12, CELL * 0.9, CELL * 1.9);

  const player = new PlayerSystem({
    start: { x: 0, z: 0 },
    applyCamera: (x, y, z, yaw, pitch) => {
      camera.position.set(x, y, z);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    },
  });

  let streaming: StreamingSystem | null = null;
  let adapt: AdaptSystem | null = null;
  let builder: PooledParcelBuilder | null = null;
  let sky: SkySystem | null = null;
  let skyPanel: SkyPanel | null = null;
  // 하늘 엔진(sky.js)이 색·강도를 직접 제어하는 주입 대상 — 참조를 보관한다.
  let sun: THREE.DirectionalLight | null = null;
  let hemi: THREE.HemisphereLight | null = null;
  let lastTri = 0;

  // 성능 HUD. 모바일에는 콘솔이 없으므로 화면 표시 + 클립보드 복사가 실기기 수치를 받는
  // 유일한 경로다. DOM만 먼저 잡아두고 커널 probe를 여기로 흘려보낸다.
  const hudRoot = document.getElementById('w2-hud');
  const hud: PerfHud | null = (hudRoot
    && document.getElementById('w2-hud-body')
    && document.getElementById('w2-hud-copy')
    && document.getElementById('w2-hud-toggle'))
    ? attachHud({
      root: hudRoot,
      body: document.getElementById('w2-hud-body')!,
      copy: document.getElementById('w2-hud-copy')!,
      toggle: document.getElementById('w2-hud-toggle')!,
    }, {
      backend: () => adapter?.backend ?? '—',
      counts: () => {
        const f = adapter?.frameStats();
        return {
          draw: f?.draw ?? 0,
          pipeline: adapter?.pipelineCount() ?? -1,
          geometries: f?.geometries ?? 0,
          textures: f?.textures ?? 0,
        };
      },
      /**
       * 드로우콜 판정의 그룹 키. `sky.js`가 시간대·날씨·fx에 따라 구름·별·비·눈·무지개·
       * 오로라의 `visible`을 토글하므로 드로우콜은 **하늘을 바꾸면 정당하게 변한다.**
       * 전 구간 상수로 판정하면 하늘을 만진 결과가 증식으로 찍힌다(감독 실기기 리포트에서
       * `draw 9~12 ← 불변식 위반`이 그렇게 나왔고, 같은 리포트의 pipeline·geometry·
       * texture는 전부 상수였다). 상태별로 묶어야 "파셀 로드가 드로우콜을 늘렸다"는
       * 진짜 회귀만 남는다.
       *
       * ── 전이 구간은 `null`을 돌려 판정에서 뺀다 ──────────────────────────
       * `set()`이 불리는 즉시 `time`/`weather`는 새 값이 되지만 **그려지는 것**은 최대
       * 1.8초 동안 다르다 — `fadeDome`이 하나 더 그려지고, `cloudMesh.visible` 갱신은
       * `phase !== 1` 가드로 멈춰 이전 상태의 구름이 남는다. 그래서 전이 구간을 도착 키에
       * 넣으면 그 그룹이 곧바로 "변동"으로 찍히고(검수관이 잡은 블로커), `|xfade` 축을
       * 하나 더 붙이는 것으로도 안 닫힌다 — **출발지가 다르면 남아 있는 구름도 다르므로**
       * 같은 `도착|xfade` 키 안에서 여전히 값이 갈린다.
       *
       * 전이 구간은 정의상 "무엇을 그리는지가 섞여 있는" 구간이라 상수를 요구할 근거가
       * 없다. 빼되 **몇 표본을 뺐는지 리포트에 적는다** — 조용히 빼면 그게 「못 잰 것을
       * 통과로 적는」 것이다.
       *
       * `flashSafe`는 넣지 않는다 — 광과민성 보호 모드는 조명 강도·색만 바꾸고 무엇을
       * 그릴지는 안 바꾼다. 넣으면 그룹만 쪼개져 표본이 흩어진다.
       *
       * `lite`는 **아직 world2에 배선되지 않았다**(`sky.setLite`를 부르는 곳이 없다).
       * 배선하는 순간 반드시 이 키에 넣어라 — `flashSafe`와 정반대로 `cloudMesh`·별
       * 레이어의 `visible`을 직접 끄는, 즉 "무엇을 그릴지"를 바꾸는 축이다. 그때 키에
       * 없으면 지금 고친 것과 똑같은 오탐이 재현된다. (`sky.js`의 `get()`이 `lite`를
       * 노출하지 않으므로 그 노출부터 함께 해야 한다.)
       */
      skyKey: () => {
        const s = sky?.get();
        if (!s) return 'none';
        if (s.xfade) return null; // 전이 중 — 판정에서 제외
        const fx = Object.entries(s.fx ?? {})
          .filter(([, on]) => on).map(([k]) => k).sort().join('+');
        return `${s.time}|${s.weather}${fx ? `|${fx}` : ''}`;
      },
      stream: () => {
        const s = streaming?.stats();
        return {
          loaded: s?.loaded ?? 0, built: s?.built ?? 0, released: s?.released ?? 0,
          starved: builder?.stats().starved ?? 0,
        };
      },
      adapt: () => {
        const a = adapt?.snapshot();
        return {
          pixelRatio: a?.ratio ?? 1,
          frameCap: kernel?.frameCap ?? 0,
          triAvg: a?.triAvg ?? 0,
        };
      },
    })
    : null;

  // 부팅 단계별 경과(ms). 진단 훅이 노출한다 — "부팅이 순식간에 끝났다"는 관측이
  // 진짜인지(정말 빨랐는지) 가짜인지(단계를 건너뛰었는지) 가르는 유일한 근거다.
  const timeline: Array<{ stage: string; atMs: number }> = [];
  let lastStage = '';

  const ok = await runBoot({
    onProgress: (r) => {
      if (r.stage !== lastStage) {
        lastStage = r.stage;
        timeline.push({ stage: r.stage, atMs: Math.round(r.elapsedMs) });
      }
      loading?.update(r);
    },
    onError: (stage, err) => {
      loading?.fail(stage, err);
      console.error('[world2] 부팅 실패', stage, err);
    },
    steps: {
      renderer: async () => {
        adapter = await createRendererAdapter(canvas);
        adapter.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        adapter.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
        camera.updateProjectionMatrix();

        // 조명은 **개수 고정**이다. 라이트 풀 처방이 프로그램 캐시를 10→12 상수로 묶어
        // 프레임타임 총량을 21,114ms → 2,253ms로 줄인 그 원리를 여기서도 지킨다.
        //
        // 색·강도는 초기값일 뿐이다 — `sky.js`가 시간대·날씨에 따라 직접 제어한다(주입 대상).
        const dir = new THREE.DirectionalLight(0xffe9c4, 2.2);
        dir.position.set(60, 120, 40);
        dir.castShadow = true;
        dir.shadow.mapSize.set(1024, 1024);
        scene.add(dir);
        sun = dir;
        hemi = new THREE.HemisphereLight(0x8fa6d8, 0x1b2030, 1.1);
        scene.add(hemi);
      },

      pools: () => {
        pools = new InstancePools(scene);
        const assets = createPartAssets();
        const budget = PooledParcelBuilder.poolBudget({ layout: LAYOUT });
        for (const kind of ALL_KINDS) {
          const a = assets[kind];
          pools.create({
            key: kind,
            geometry: a.geometry,
            material: a.material,
            max: budget[kind],
            castShadow: a.castShadow,
            receiveShadow: a.receiveShadow,
          });
          // instanceColor 버퍼를 지금 깨워 둔다. 세션 중 첫 setColor에서 만들어지면
          // 그 프레임에 업로드 스파이크가 된다.
          pools.warmColors(kind);
        }
        // 봉인 — 이후 풀 생성은 예외다. 개수 불변식의 집행 지점.
        pools.seal();

        // 하늘 — 라이브 오픈월드의 `sky.js`를 그대로 쓴다(systems/sky.ts 주석 참고).
        // 여기서 만들면 예열 단계가 하늘 파이프라인까지 함께 굽는다(세션 중 첫 등장으로
        // 미루면 그게 곧 스파이크다).
        sky = new SkySystem(
          scene,
          adapter!.renderer,
          sun!,
          hemi!,
          () => ({ x: player.position.x, z: player.position.z }),
        );

        // 神 모드 패널 — 시간대·날씨·이벤트. 없으면 조용히 건너뛴다(패널 없이도 월드는 돈다).
        // HUD 바로 아래에 두어, 하늘을 바꾸면서 그 자리에서 수치 변화를 볼 수 있게 했다.
        const panelParts = findSkyPanel(document);
        if (panelParts) skyPanel = attachSkyPanel(panelParts, sky.controls);
      },

      warmup: async (report, yieldFrame) => {
        // 슬롯이 0 스케일이어도 InstancedMesh는 렌더 목록에 오르므로 파이프라인이 컴파일된다.
        // (`visible=false`를 쓰지 않는 이유가 이것이다.) 몇 프레임 돌려 그 비용을 부팅에
        // 몰아넣는다 — 세션 중에 나면 그게 바로 스파이크다.
        for (let i = 0; i < 3; i++) {
          adapter!.beginFrame();
          adapter!.render(scene, camera);
          report((i + 1) / 3);
          await yieldFrame();
        }
      },

      stream: async (report, yieldFrame) => {
        builder = new PooledParcelBuilder({
          pool: createSlotPool(pools!), cellX: CELL, cellZ: CELL, layout: LAYOUT,
        });
        streaming = new StreamingSystem({
          builder,
          cellX: CELL, cellZ: CELL,
          getPosition: () => player.position,
          getDirection: () => player.direction,
          markDirty: () => kernel?.markDirty(),
        });

        adapt = new AdaptSystem({
          dpr: window.devicePixelRatio || 1,
          mobileCap: 1.5,
          targets: {
            setPixelRatio: (r) => adapter!.setPixelRatio(r),
            getPixelRatio: () => adapter!.getPixelRatio(),
            setFrameCap: (fps) => kernel?.setFrameCap(fps),
            lastTri: () => lastTri,
            isStreaming: () => (streaming?.stats().pending ?? 0) > 0,
          },
        });

        // 등록 순서가 실행 순서다: 입력 → 스트리밍 → 적응.
        // 적응이 마지막인 이유는 이번 프레임의 스트리밍 상태를 보고 판정해야 하기 때문이다.
        kernel = new Kernel({
          // 커널 계측을 HUD로 흘린다. probe가 없으면 계측 자체가 돌지 않으므로,
          // HUD가 없는 환경에서는 이 배선의 비용도 0이다.
          probe: hud ? (name, value) => hud.sample(name, value) : undefined,
          render: () => {
            adapter!.beginFrame();
            adapter!.render(scene, camera);
            lastTri = adapter!.frameStats().tri;
            pools!.flush();
            hud?.tick(); // render 직후 — frameStats가 유효한 유일한 시점
          },
        });
        // sky는 player 뒤에 둔다 — 카메라 위치를 읽어 돔·구름을 따라 옮기므로
        // 같은 프레임의 최신 위치를 봐야 한 프레임 늦게 따라오지 않는다.
        kernel.add(player).add(sky!).add(streaming).add(adapt);
        kernel.start();

        // 커널이 돌아야 파셀이 채워진다 — 여기서 블로킹 루프를 돌면 교착한다.
        await waitUntil(
          () => streaming!.ready,
          () => streaming!.progress(),
          report,
          yieldFrame,
        );
      },
    },
  });

  if (!ok) {
    // 명시적 타입의 지역 변수로 받는다 — TS는 부팅 콜백(함수 내부)에서의 할당을
    // 추적하지 못해 여기서 `kernel`을 null로 확정해버린다. 실패 지점에 따라 커널이
    // 이미 돌고 있을 수도 있으므로 반드시 멈춰야 한다(멈추지 않으면 rAF가 계속 돈다).
    (kernel as Kernel | null)?.dispose();
    return null;
  }

  // 로딩 화면은 **첫 프레임이 실제로 그려진 뒤** 걷는다. 순서가 반대면 화면이 빈 채로
  // 남는 순간이 생기고, 그게 감독 보고로 올라온 문제였다.
  kernel!.markDirty();
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  loading?.dismiss();

  const onResize = () => {
    adapter!.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
    kernel!.markDirty();
  };
  window.addEventListener('resize', onResize);
  const input = bindInput(canvas, player);

  // 터치 조작. 터치 기기가 아니면 스스로 아무것도 하지 않는다(데스크톱에 조이스틱 안 뜸).
  const stickBase = document.getElementById('w2-stick');
  const stickKnob = document.getElementById('w2-stick-knob');
  const touch = (stickBase && stickKnob)
    ? attachTouchControls(canvas, { base: stickBase, knob: stickKnob }, {
      setAxes: (x, z) => player.setAxes(x, z),
      look: (yaw, pitch) => player.lookBy(yaw, pitch),
    })
    : { active: false, dispose() {} };
  // 조작 안내는 입력 방식에 맞춘 것만 보여준다 — 모바일에서 "WASD"는 소음이다.
  const hint = document.getElementById('w2-hint');
  if (hint) {
    hint.textContent = touch.active
      ? '왼쪽을 밀어 이동 · 오른쪽을 쓸어 둘러보기'
      : 'WASD·방향키로 이동 · 화면을 클릭하면 시선 조작 · Shift 달리기';
  }

  // ── 진단 훅 ───────────────────────────────────────────────────────────────
  // behind-flag 검증 페이지 전용이다. 라이브(world.html)에는 없다.
  //
  // 이걸 붙이는 이유: 이 아키텍처의 핵심 주장이 "재질·지오·파이프라인·드로우콜 개수가
  // 세션 내내 상수"인데, 잴 수단이 없으면 그 주장은 검증할 수 없는 문장일 뿐이다.
  // 실제로 첫 스모크에서 이 항목이 "측정 불가"로 남았고, 그건 검증기의 잘못이 아니라
  // 측정 지점을 안 만들어 둔 설계의 잘못이었다.
  (window as unknown as Record<string, unknown>).__world2 = {
    /** 부팅 단계별 경과(ms) */
    timeline,
    /** 현재 개수 스냅샷 — 불변식 검사는 이 값을 프레임 간 비교해 판정한다 */
    stats: () => ({
      backend: adapter!.backend,
      order: kernel!.order,
      /** 부하 배수. 리포트만 보고 "어느 밀도에서 잰 것인가"를 알 수 있어야 한다. */
      density,
      // 플레이어 상태 — "조작이 실제로 이동으로 이어졌는가"를 재는 유일한 지점이다.
      // 파셀 수만 봐서는 알 수 없다(정상 상태에서도 같은 값이다).
      player: { ...player.position, ...player.angles },
      frame: adapter!.frameStats(),
      pipelines: adapter!.pipelineCount(), // -1이면 측정 실패(0과 구별된다)
      pools: pools!.stats(),
      stream: streaming!.stats(),
      adapt: adapt!.snapshot(),
      // 슬롯이 모자라 못 그린 부품 수. 0이 아니면 `poolBudget` 산정이 틀린 것이다 —
      // 화면에는 "건물이 몇 채 없는" 모습으로만 나타나 눈으로는 알아채기 어렵다.
      // 여유 배수를 1로 내린 뒤로는 이 값이 예산의 유일한 감시 수단이다.
      builder: builder!.stats(),
      // 하늘 상태 + **조명 실측값**. 번개는 조명 강도를 순간적으로 올리는 방식이라,
      // 이 값을 샘플링하지 않으면 "쳤는데 못 본 것"과 "안 친 것"을 구별할 수 없다.
      // 감독이 "천둥 불빛이 안 보인다"고 했을 때 추측이 다섯 개까지 늘어난 이유가
      // 여기에 잴 수단이 없었기 때문이다.
      sky: sky
        ? {
          ...(sky.get() as object),
          sunI: sun?.intensity ?? -1, hemiI: hemi?.intensity ?? -1,
          // 번개는 색도 흰색으로 당긴다. 섬광이 끝난 뒤 되돌아오는지 재려면 색이
          // 필요하다 — intensity만 보면 "색이 물든 채 고착된" 상태를 놓친다.
          sunC: sun?.color?.getHex?.() ?? -1, hemiC: hemi?.color?.getHex?.() ?? -1,
        }
        : null,
      hidden: typeof document !== 'undefined' && document.hidden,
    }),
  };

  return {
    kernel: kernel!,
    dispose() {
      window.removeEventListener('resize', onResize);
      input.dispose();
      touch.dispose();
      hud?.dispose();
      skyPanel?.dispose();
      // non-null 단언을 쓰는 이유: 이 셋은 부팅 콜백 안에서 할당되는데, TS 제어흐름
      // 분석은 함수 내부 할당을 추적하지 않아 바깥에서는 여전히 null로 본다.
      // 여기는 부팅 성공(ok===true) 경로에서만 도달하므로 셋 다 반드시 존재한다.
      kernel!.dispose();
      pools!.dispose();
      adapter!.dispose();
    },
  };
}

/** 키보드·포인터 입력을 플레이어에 잇는다. 입력 해석은 여기, 이동 계산은 PlayerSystem. */
function bindInput(canvas: HTMLCanvasElement, player: PlayerSystem): { dispose(): void } {
  const KEYS: Record<string, keyof import('./systems/player.js').MoveInput> = {
    KeyW: 'forward', ArrowUp: 'forward',
    KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'fast', ShiftRight: 'fast',
  };
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    const k = KEYS[e.code];
    if (!k) return;
    e.preventDefault();
    player.setInput({ [k]: down });
  };
  const kd = onKey(true), ku = onKey(false);
  const onMove = (e: MouseEvent) => {
    if (document.pointerLockElement === canvas) player.look(e.movementX, e.movementY);
  };
  const onClick = () => { canvas.requestPointerLock?.(); };
  // 창을 벗어나면 키가 눌린 채로 남아 계속 걸어간다 — 실기기에서 흔한 불만이라 막는다.
  const onBlur = () => player.setInput({ forward: false, back: false, left: false, right: false, fast: false });

  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('click', onClick);

  return {
    dispose() {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('click', onClick);
    },
  };
}
