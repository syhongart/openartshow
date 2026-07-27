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
import { SkySystem } from './systems/sky.js';
import { DEFAULT_LAYOUT, type PartKind } from './decide/parcel-layout.js';

const CELL = 32;
/**
 * 스트리밍이 동시에 띄우는 최대 파셀 수. 풀 예산의 분모다.
 *
 * 정지 상태의 산술값은 13이지만 **실측은 그보다 크다.** look-ahead가 판정 중심을 0.5셀
 * 앞으로 밀기 때문에 정지 중에도 want가 16이고, 이동 중에는 17까지 관측됐다(헤드리스
 * 계측, 30샘플). 산술값 13으로 잡았으면 여유 배수(1.25)를 까먹는 순간 슬롯이 모자라
 * 파셀이 조용히 덜 그려졌을 것이다 — 화면에는 "건물이 몇 채 없는" 모습으로만 나타나
 * 원인을 짐작하기 어려운 종류의 결함이다.
 *
 * 실측 17에 이동·전이 여유를 얹어 20으로 잡는다. 굶주림 여부는 진단 훅의
 * `builder.starved`로 감시한다(0이 아니면 이 값이 틀린 것이다).
 */
const MAX_PARCELS = 20;
const ALL_KINDS: readonly PartKind[] = ['ground', 'building', 'tree', 'lamp'];

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
        const budget = PooledParcelBuilder.poolBudget(MAX_PARCELS, DEFAULT_LAYOUT);
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
        builder = new PooledParcelBuilder({ pool: createSlotPool(pools!), cellX: CELL, cellZ: CELL });
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
      // 플레이어 상태 — "조작이 실제로 이동으로 이어졌는가"를 재는 유일한 지점이다.
      // 파셀 수만 봐서는 알 수 없다(정상 상태에서도 같은 값이다).
      player: { ...player.position, ...player.angles },
      frame: adapter!.frameStats(),
      pipelines: adapter!.pipelineCount(), // -1이면 측정 실패(0과 구별된다)
      pools: pools!.stats(),
      stream: streaming!.stats(),
      adapt: adapt!.snapshot(),
      // 슬롯이 모자라 못 그린 부품 수. 0이 아니면 MAX_PARCELS 예산이 틀린 것이다 —
      // 화면에는 "건물이 몇 채 없는" 모습으로만 나타나 눈으로는 알아채기 어렵다.
      builder: builder!.stats(),
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
