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
import { DEFAULT_LAYOUT, type PartKind } from './decide/parcel-layout.js';

const CELL = 32;
/** 스트리밍이 동시에 띄우는 최대 파셀 수(기본 밴드 기준 13) + 전이 여유 */
const MAX_PARCELS = 16;
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
  let lastTri = 0;

  const ok = await runBoot({
    onProgress: (r) => loading?.update(r),
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
        const sun = new THREE.DirectionalLight(0xffe9c4, 2.2);
        sun.position.set(60, 120, 40);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        scene.add(sun);
        scene.add(new THREE.HemisphereLight(0x8fa6d8, 0x1b2030, 1.1));
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
        const builder = new PooledParcelBuilder({ pool: createSlotPool(pools!), cellX: CELL, cellZ: CELL });
        streaming = new StreamingSystem({
          builder,
          cellX: CELL, cellZ: CELL,
          getPosition: () => player.position,
          getDirection: () => player.direction,
          markDirty: () => kernel?.markDirty(),
        });

        const adapt = new AdaptSystem({
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
          render: () => {
            adapter!.beginFrame();
            adapter!.render(scene, camera);
            lastTri = adapter!.frameStats().tri;
            pools!.flush();
          },
        });
        kernel.add(player).add(streaming).add(adapt);
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

  return {
    kernel: kernel!,
    dispose() {
      window.removeEventListener('resize', onResize);
      input.dispose();
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
