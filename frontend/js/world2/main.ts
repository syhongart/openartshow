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
import { PlayerSystem, WALK_SPEED, BOB_AMPLITUDE } from './systems/player.js';
import { SPAWN } from './decide/grid.js';
import { AdaptSystem } from './systems/adapt.js';
import { runBoot, waitUntil } from './boot.js';
import { findLoading, LoadingView } from './ui/loading.js';
import { attachTouchControls } from './ui/touch-controls.js';
import { attachHud, type PerfHud } from './ui/hud.js';
import { findMapDrawer, attachMapDrawer } from './ui/map-drawer.js';
import {
  FEATURES, mountFeatures, combineDrawGroupKey, collectDiagnostics, prewarmFeatures,
  type MountedFeature,
} from './features/index.js';
import { DEFAULT_LAYOUT } from './decide/parcel-layout.js';
// 파츠 종류 목록은 레지스트리가 유일한 출처다. 여기 다시 적으면 파츠를 추가해도 이 루프가
// 모르고 지나가 **그 종류의 풀이 조용히 안 만들어진다** — 배치는 정상이고 테스트도 통과하니
// 원인을 짐작하기 어렵다(검수관이 잡은 열 번째 지점).
import { ALL_KINDS } from './parts/index.js';
// URL 노브는 `url-knob.ts` 가 유일한 구현이다 — 여기·`postfx.ts`·`features/sky.ts` 가
// 같은 파싱을 각자 들고 있었고, 세 벌이 되는 순간이 값 미러링의 시작점이다.
import { readNum } from './url-knob.js';

// 셀 크기는 **레이아웃이 소유한다.** 여기 `32` 를 다시 적으면 안 된다.
//
// 물이 들어오면서 이게 실제 위험이 됐다(검수관 지적). `computeWant` 의 기본 물 차단은
// `parcelWater(px, pz, DEFAULT_LAYOUT.cellX, cellZ)` 로 파셀 중심의 월드 좌표를 구하는데,
// `StreamingSystem` 이 미터↔셀 변환에 쓰는 것은 여기서 주입한 값이다. 두 값이 어긋나면
// **물 판정과 파셀 격자가 서로 다른 자로 재게 되고**, 증상은 "건물이 물 위에 서는" 모습으로
// 만 나타난다 — 양쪽 단위 테스트 어디에도 안 걸린다.
//
// 오늘은 둘 다 32라 우연히 맞았다. 우연에 기대지 않는다. 이 프로젝트가 값 미러링으로 이미
// 세 번 겪은 형태이고(캔버스 색 vs 상수 · 구름 고도 두 곳 · 테스트 임계값), 그때마다
// "한쪽만 고쳐도 아무도 모른다"가 문제였다.
const CELL_X = DEFAULT_LAYOUT.cellX;
const CELL_Z = DEFAULT_LAYOUT.cellZ;

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
  return Math.round(readNum('density', 1, 1, 8));
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
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1200);
  // ── 안개 거리 (감독 실기기 판정) ──────────────────────────────────────────
  // 예전 값은 `0.9 ~ 1.9` 셀 = **28.8m 부터 60.8m** 이었다. 파셀 하나 거리에서 안개가
  // 시작되니, 화면이 이렇게 갈렸다:
  //
  //   가까운 건물 — 태양 반대 면이 검다(그림자 면 대비)
  //   조금 먼 건물 — 흰 안개에 묻힌다
  //   **중간이 없다**
  //
  // 스크린샷에서 눈앞 건물이 새까맣고 그 너머 건물이 새하얗게 보인 것이 이것이다.
  // 원근이 뒤집힌 것처럼 읽힌다 — 보통은 먼 것이 흐릿하고 가까운 것이 또렷하다.
  //
  // `1.6 ~ 2.4` 셀 = **51.2m 부터 76.8m**. 시작을 늦춰 또렷한 범위를 1.8배로 넓히고,
  // 끝을 far 렌더 반경(76.8m)에 정확히 맞춘다. 그 너머는 파셀이 로드되지 않으므로
  // 안개가 딱 그 경계를 덮어야 **세계의 끝이 안 보인다** — 더 늘리면 빈 공간이 드러나고,
  // 더 줄이면 지금처럼 답답해진다. 렌더 반경에서 유도한 값이라 밴드를 넓히면 함께 따라온다.
  scene.fog = new THREE.Fog(0x0b0d12, CELL_X * 1.6, CELL_X * 2.4);

  // 걷는 감각 — 감독 실기기에서 값을 확정하기 위해 URL 로 연다.
  //
  //   ?speed=N  걷기 속도(m/s)      기본 5      달리기는 ×2.2
  //   ?eye=N    눈높이(m)           기본 1.7    라이브 미술관과 같은 값
  //   ?bob=N    헤드밥 진폭(m)      기본 0.045  0이면 끈다
  //
  // 감독 판정이 "땅에 붙어가는 느낌"이었고, 이 감각은 **정지 스크린샷으로 판정할 수
  // 없다** — 움직여봐야 안다. density 를 URL 로 둔 것과 같은 이유다.
  const walkSpeed = readNum('speed', WALK_SPEED, 1, 20);
  const eyeHeight = readNum('eye', 1.7, 0.5, 3);
  const bobAmplitude = readNum('bob', BOB_AMPLITUDE, 0, 0.2);

  const player = new PlayerSystem({
    start: { x: SPAWN.x, z: SPAWN.z },
    speed: walkSpeed,
    eyeHeight,
    bobAmplitude,
    applyCamera: (x, y, z, yaw, pitch) => {
      camera.position.set(x, y, z);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    },
  });

  let streaming: StreamingSystem | null = null;
  let adapt: AdaptSystem | null = null;
  let builder: PooledParcelBuilder | null = null;
  /** 조립된 기능들. 무엇이 켜졌는지는 `features/index.ts`가 정한다 */
  let features: MountedFeature[] = [];
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
       * 드로우콜 판정의 그룹 키. **여기에 기능별 로직이 없다** — 켜진 기능들이 각자
       * 내놓은 키를 합칠 뿐이다(`combineDrawGroupKey`).
       *
       * 드로우콜은 가시성에 따라 정당하게 변하고(하늘 날씨 등), 그 상태가 무엇인지는
       * 기능이 안다. 예전에는 이 자리에 하늘 전용 코드가 박혀 있어서, 하늘을 빼도 이
       * 로직이 남고 바다를 넣으면 여기에 또 붙여야 했다.
       *
       * 기능이 하나도 없으면 빈 문자열이고, 그래도 판정은 정상으로 돈다.
       */
      drawGroupKey: () => combineDrawGroupKey(features),
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

        // ── 기능 조립 ────────────────────────────────────────────────────
        // **여기에 기능별 코드가 없다.** 무엇을 켤지는 `features/index.ts`가 정하고,
        // 이 자리는 그 목록을 읽어 만들 뿐이다. 기능을 넣고 빼는 데 이 파일을 고칠 일이
        // 없어야 한다 — 그게 이 구조의 목적이다.
        //
        // 풀 봉인 직후·예열 직전이 조립 시점인 이유: 여기서 만들어야 예열 단계가 그
        // 기능의 파이프라인까지 함께 굽는다. 세션 중 첫 등장으로 미루면 그게 곧
        // 스파이크다(하늘이 실제로 그랬다).
        //
        // 한 기능이 실패해도 나머지는 켠다. 하늘이 죽었다고 월드 전체가 안 뜨는 건 과잉이다.
        features = mountFeatures(
          FEATURES,
          {
            scene, camera, adapter: adapter!, player, pools: pools!,
            sun: sun!, hemi: hemi!, cell: CELL_X,
            doc: typeof document !== 'undefined' ? document : null,
          },
          (name, err) => console.error(`[world2] 기능 조립 실패: ${name}`, err),
        );
      },

      warmup: async (report, yieldFrame) => {
        // 슬롯이 0 스케일이어도 InstancedMesh는 렌더 목록에 오르므로 파이프라인이 컴파일된다.
        // (`visible=false`를 쓰지 않는 이유가 이것이다.) 몇 프레임 돌려 그 비용을 부팅에
        // 몰아넣는다 — 세션 중에 나면 그게 바로 스파이크다.
        //
        // ── 그런데 그것만으로는 "지금 보이는 것"만 구웠다 ────────────────────
        // 조건부로만 등장하는 것은 여전히 안 구워진 채 남는다. 하늘이 그랬다 — 비·눈·
        // 별·오로라를 부팅 때 다 만들어 두고도 `visible=false`라 렌더 목록에 안 올랐고,
        // three의 `info.memory`는 **처음 그릴 때** 오르므로 GPU에는 아무것도 없었다.
        //
        // 헤드리스 실측(2026-07-29): 시간대×날씨 12조합을 두 바퀴 돌리면 **1바퀴에서만**
        // geometry +4 · texture +4 · pipeline +3이 오르고 2바퀴는 전부 0이었다. 증식이
        // 아니라 첫 등장 비용이라는 서명이다. 감독 실기기에서도 같은 계단이 낮→밤→천둥
        // 구간에 났다.
        //
        // 그래서 예열 프레임 동안 숨은 것을 잠시 켠다. **무엇을 켤지는 기능이 안다** —
        // 여기에 기능별 분기가 없다.
        //
        // ── `?prewarm=0` 으로 끌 수 있다 (감독 지적 2026-07-29) ──────────────
        // *"이거 재질 이거 다 올리면 비용 커질수도"* — 맞는 지적이다. 예열은 **언젠가
        // 쓸 것을 미리 GPU 에 올린다.** 세션 내내 날씨를 안 바꾸면 그만큼이 순수 낭비고,
        // 저사양 기기에서는 부팅 지연과 메모리 압박으로 돌아온다.
        //
        // 그래서 노브를 연다. 켜고 끈 두 상태를 **같은 빌드에서** 비교할 수 있어야 어느
        // 쪽이 나은지 판정할 수 있다. 대조군을 만들려고 코드를 고치면 그 순간 두 측정이
        // 다른 코드를 잰 것이 되고, 그 사실은 리포트에 안 나타난다.
        //
        // 기본은 켬이다. 계단은 실측된 결함이고 예열은 실측으로 그것을 없앴다 —
        // 비용 쪽은 아직 실측이 없으므로, 검증된 것을 기본으로 둔다.
        const wantPrewarm = readNum('prewarm', 1, 0, 1) >= 1;
        const undoPrewarm = wantPrewarm ? prewarmFeatures(features) : () => {};
        try {
          for (let i = 0; i < 3; i++) {
            adapter!.beginFrame();
            adapter!.render(scene, camera);
            report((i + 1) / 3);
            await yieldFrame();
          }
        } finally {
          // 예열이 도중에 던져도 되돌린다. 안 되돌리면 날씨 레이어가 전부 보이는
          // 하늘로 세션이 시작된다 — 예열을 안 한 것보다 나쁘다.
          undoPrewarm();
        }
      },

      stream: async (report, yieldFrame) => {
        builder = new PooledParcelBuilder({
          pool: createSlotPool(pools!), cellX: CELL_X, cellZ: CELL_Z, layout: LAYOUT,
        });
        streaming = new StreamingSystem({
          builder,
          cellX: CELL_X, cellZ: CELL_Z,
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
        // ── 등록 순서가 곧 실행 순서다 ───────────────────────────────────
        // 코어: 입력 → (기능들) → 스트리밍 → 적응.
        //
        // 기능이 `player` 뒤에 오는 이유: 하늘은 카메라 위치를 읽어 돔·구름을 따라 옮기고,
        // 훗날 멀티플레이어는 이번 프레임 위치를 보내야 한다. 앞에 두면 한 프레임 늦는다.
        // `adapt`가 마지막인 이유: 이번 프레임의 스트리밍 상태를 보고 판정해야 한다.
        //
        // 기능들 사이의 순서는 `features/index.ts`의 배열 순서다 — 거기서 정한다.
        kernel.add(player);
        for (const m of features) if (m.instance.system) kernel.add(m.instance.system);
        kernel.add(streaming).add(adapt);
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
  // 조작 안내는 **감독 지시로 없앴다**(*"도움말없애줘"*). 화면 하단을 상시 차지하는데,
  // 조작이 밀고 쓸기뿐이라 한 번 해보면 알게 되는 것이었다. 문구를 채우던 코드도 함께
  // 지운다 — 요소만 지우고 코드를 남기면 다음 사람이 "왜 안 보이지" 를 여기서 찾는다.

  // 미니맵 책갈피 — 왼쪽 가장자리에서 펼치고 접는다(감독 지시).
  const drawerParts = findMapDrawer(document);
  const mapDrawer = drawerParts ? attachMapDrawer(drawerParts) : null;

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
      /** 걷는 감각 파라미터. 감독 실기기 비교에서 "어느 값이었나"를 리포트가 답해야 한다 */
      feel: { walkSpeed, eyeHeight, bobAmplitude },
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
      /** 켜진 기능 목록 — 리포트만 보고 "무엇이 켜진 상태에서 잰 것인가"를 알 수 있어야 한다 */
      features: features.map((m) => m.name),
      // 기능별 진단. **여기에 기능별 분기가 없다** — 각 기능이 스스로 내놓는다.
      // 기능을 빼면 진단에서도 저절로 사라진다(예전에는 `sky:` 키가 여기 박혀 있었다).
      ...collectDiagnostics(features),
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
      mapDrawer?.dispose();
      // 기능 정리. System의 `dispose`는 커널이 부르므로, 여기서는 기능이 따로 붙인
      // UI·리스너만 거둔다. 여기에도 기능별 분기가 없다.
      for (const m of features) {
        try { m.instance.dispose?.(); } catch (err) { console.error(`[world2] ${m.name} 정리 실패`, err); }
      }
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
