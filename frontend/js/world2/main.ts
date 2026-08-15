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
import { PooledParcelBuilder, type SlotPool } from './systems/parcel-builder.js';
import { createVillageParcels } from './systems/village-parcels.js';
import { ParcelFadeSystem } from './systems/parcel-fade.js';
import { ParcelGrowSystem } from './systems/parcel-grow.js';
import {
  FADE_SECONDS, FADE_EASE, FADE_EASES, GROW_SECONDS, fogFactorAt,
} from './decide/lod-fade.js';
import { StreamingSystem } from './systems/streaming.js';
import { PlayerSystem, WALK_SPEED, BOB_AMPLITUDE } from './systems/player.js';
import { SPAWN } from './decide/grid.js';
import { villageLayout, MUL_MIN, MUL_MAX } from './decide/village-rules.js';
import { spawnFor, SPAWN_SPOTS, type SpawnSpot } from './decide/spawn-spot.js';
import { waterSurfaceY as surfaceYAt, SEABED_Y } from './decide/water.js';
import { AdaptSystem } from './systems/adapt.js';
import { runBoot, waitUntil } from './boot.js';
import { findLoading, LoadingView } from './ui/loading.js';
import { attachTouchControls } from './ui/touch-controls.js';
import { attachHud, type PerfHud } from './ui/hud.js';
import { findMapDrawer, attachMapDrawer } from './ui/map-drawer.js';
import { findKnobBar, attachKnobBar, attachKnobActions } from './ui/knob-bar.js';
import {
  FEATURES, mountFeatures, combineDrawGroupKey, drawGroupKeyOf, collectDiagnostics, prewarmFeatures,
  type MountedFeature,
} from './features/index.js';
import { DEFAULT_LAYOUT } from './decide/parcel-layout.js';
import { createCollider } from './systems/collision.js';
import { fogBand, FOG_FAR_CELLS } from './decide/fog.js';
import { shadowFrustum } from './decide/shadow.js';
import { ShadowDecalSystem, defaultOpts as shadowDecalDefaults } from './systems/shadow-decal.js';
import {
  SHADOW_DENSITY, SHADOW_DENSITY_MAX, SHADOW_SOFT, SHADOW_SOFT_MAX, SHADOW_LIFT, SHADOW_LIFT_MAX,
  SHADOW_BLEND, SHADOW_BLENDS, LEAF_DEPTH, LEAF_DEPTH_MAX,
} from './decide/shadow-decal.js';
import { SHADOW_DRAW_PX, SHADOW_DRAW_MIN, SHADOW_DRAW_MAX } from './parts/shadow.js';
import { DEFAULT_BANDS, scaleBands, withNearExit, withFarEnter } from './decide/lod.js';
import { MAX_H as TOWER_MAX_H } from './parts/tower.js';
// 파츠 종류 목록은 레지스트리가 유일한 출처다. 여기 다시 적으면 파츠를 추가해도 이 루프가
// 모르고 지나가 **그 종류의 풀이 조용히 안 만들어진다** — 배치는 정상이고 테스트도 통과하니
// 원인을 짐작하기 어렵다(검수관이 잡은 열 번째 지점).
import { ALL_KINDS, PARTS } from './parts/index.js';
// URL 노브는 `url-knob.ts` 가 유일한 구현이다 — 여기·`postfx.ts`·`features/sky.ts` 가
// 같은 파싱을 각자 들고 있었고, 세 벌이 되는 순간이 값 미러링의 시작점이다.
import { readNum, readEnum, readNumOpt, writeNumOpt } from './url-knob.js';
import { TIMES, type SkyTime } from './decide/night.js';
import { SHADING_MODES, type ShadingMode } from './decide/shading.js';
import type { SurfaceSetting } from './decide/surface-material.js';
// 카메라 far 를 여기서 유도한다 — 아래 `PerspectiveCamera` 주석 참고.
import { DOME_MAX } from './systems/sky.js';

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

/**
 * 그림자 카메라가 담을 범위(셀 배수). **`SHADOW_MAP` 과 짝이다** — 둘의 비가 텍셀 크기고,
 * 그 텍셀이 곧 그림자 경계의 선명도다.
 *
 * ── 왜 `nearExit`(1.30) 에서 `farExit`(2.40) 로 넓혔나 (감독 실기기 2026-08-10) ──
 * *"뒤로 움직이는 순간 건물 밝기가 바뀌어. 낮에도."*
 *
 * 원인은 **담는 범위와 보이는 범위가 달랐던 것**이다. 건물은 `farExit`(76.8m)까지
 * 그려지는데 그림자는 `nearExit`(41.6m)까지만 담았다. 후진하면 눈앞 건물이 41.6m 를
 * 넘어가는 순간 **그림자를 통째로 잃어 밝아진다.** 전진에도 같은 경계가 있지만 그때는
 * 반대로 들어오는 것이라 화면 저 끝에서 일어나 안 보인다 — 후진은 **화면을 채운 큰
 * 건물**이 그 경계를 넘으므로 눈에 띈다. 그것이 "후진할 때만" 의 정체다.
 *
 * 감독 실측으로 축을 갈랐다: `?dsun=0`(태양·그림자 끔)에서 **안정**, `?glb=0`(외부 GLB
 * 건물 끔)에서 **여전히 깜빡임** — 즉 우리 인스턴싱 건물의 그림자가 맞다.
 *
 * ⚠ **`decide/shadow.ts` 의 주석이 이 사각을 이미 적어 두고 있었다** —
 * *"far tier 는 76.8m 까지 그려지는데 반폭은 41.6m 다 … 알고 고른 거래다."*
 * 알고 있었는데 화면에 나올 것을 예상하지 못했다. **적어 둔 사각은 사각이 아니게 되는
 * 것이 아니라, 언제 화면에 나오는지를 아무도 안 재본 사각이다.**
 *
 * ── 거래를 안 하는 방법 ─────────────────────────────────────────────────────
 * 그때 넓히지 않은 이유는 텍셀이 커져 경계가 뭉개지기 때문이었고(감독 지시 *"주간
 * 하드라이트"* 와 정면 충돌), 그 판단 자체는 옳다. 그러나 **맵을 함께 키우면 그 대가가
 * 사라진다** — 아래 표가 유도값이다(`texel = half*2 / mapSize`).
 *
 *     반폭 41.6m · 1024²  →  텍셀 0.0813m   (종전)
 *     반폭 76.8m · 1024²  →  텍셀 0.1500m   ← 넓히기만 하면 1.85배 뭉개진다
 *     반폭 76.8m · 2048²  →  텍셀 0.0750m   ← **종전보다 오히려 선명하다**
 *
 * 대가는 그림자 맵 메모리 4배(깊이 텍스처 한 장)와 그림자 패스가 담는 물체 수다.
 * 감독 실기기(iPhone·WebGPU) 실측 여유: 프레임 16.7ms 중 render 평균 **2.6ms**.
 *
 * ── 경계는 없앨 수 없다 — **보이지 않는 자리로 옮긴 것**이다 ────────────────
 * 정투영 그림자에는 언제나 끝이 있다. `farExit` 로 맞추면 그 경계가 **파셀이 사라지는
 * 거리와 같아진다** — 건물이 안 보이게 되는 것과 그림자를 잃는 것이 같은 순간에
 * 일어나므로 화면에서 분리되지 않는다. 여기서 멈춘다: 더 넓히면 텍셀만 커지고 얻는
 * 것이 없다(그 밖에는 그릴 건물이 없다).
 *
 * 두 값 다 노브로 열어 둔다 — 감독이 종전 판본(`?shband=1.3&smap=1024`)과 나란히
 * 비교할 수 있어야 판정이 선다.
 */
const SHADOW_BAND = readNum('shband', DEFAULT_BANDS.farExit, 0.5, 4);
const SHADOW_MAP = Math.round(readNum('smap', 2048, 256, 4096));

/**
 * 그림자 진하기(0=없음 · 1=완전 검정). three r171 `LightShadow.intensity`.
 *
 * ── 왜 여는가 (팀장 원인 보고 2026-08-10, 감독 채택 A안) ────────────────────
 * *"뒤로 움직이는 순간 건물 밝기가 바뀌어"* 의 직접 원인은 **캐스터의 이산 등장**이다:
 * 파셀이 60~70m 지점에서 태어나는 순간 그 타워(60m)의 그림자(낮 고도 47.4° 에서 ~55m)가
 * 시야 안 건물 위로 **한 프레임에** 떨어진다. 받는 쪽은 결백하다 — r171 WebGPU 는 그림자
 * 맵 범위 밖을 강제 "밝음" 처리하므로(three.webgpu.js:21137) 어두워지는 방법은 새 캐스터
 * 등장뿐이고, 그 자리는 스트리밍 경계뿐이다. 감독 실측 다섯 축(페이드 OFF·낮·GLB OFF·
 * 범위 4배·태양 OFF)이 전부 이 하나로 설명된다.
 *
 * 이 값은 그 이산 사건을 없애지 않는다 — **켜지고 꺼질 때의 대비를 줄인다.** 1.0 이면
 * 완전 검정이 통째로 떨어지고, 0.5 면 절반 농도라 튐이 절반이 된다. 근본 처방(키 큰
 * 파츠의 로드 반경을 그림자 길이만큼 확장)은 별건 태스크다.
 *
 * ── 기본값 0 — **실시간 태양 그림자 폐지** (감독 판정 2026-08-11, 팀장 (A) 채택) ──
 * 감독이 실기기에서 ?shint=0 화면을 직접 보고 *"그림자 없앤 버전 그게 제일 낫다.
 * 그림자 베이킹해서 하는거 아냐?"* 로 판정했다. 이 판정 전에 소진한 축을 여기 남긴다 —
 * **되살리려는 사람이 읽어야 할 목록이다**:
 *   · 범위 확장(?shband=3.2&smap=4096) — "그대로" · 농도 절반(?shint=0.5) — "그대로"
 *   · 반납 수축 시간 4배·이징 분리(?shrink=1·?shrinkease=in) — 3후보 전부 "다 그대로임"
 *   · ?shint=0 (그림자만 0) — **"뒤로갈때 어두어지는 것 없어졌어"** ← 축 확정
 * 즉 후진 그림자 명멸의 최종 원인은 미해명인 채(수축 프레임 가설까지 기각 — WebGPU
 * 그림자 맵 갱신 타이밍 가설 잔존) **실시간 캐스터 축 자체를 폐지**해 문제를 소멸시켰다.
 * 실시간 그림자를 기본으로 되살리면 이 명멸이 통째로 돌아온다. 그림자 룩은 파츠 그림자
 * 데칼(베이킹, 캐스터와 슬롯 수명 동기)로 대체한다 — 팀장 조건·설계는 태스크 #218.
 * 노브는 대조·진단용으로 남긴다(?shint=1 이 종전 화면).
 */
const SHADOW_INTENSITY = readNum('shint', 0, 0, 1);

/**
 * 그림자 카메라 파라미터. **한 번 유도해 두 곳이 함께 쓴다** — 조명 설정(프러스텀)과
 * 하늘(`shadowDist`, 태양을 얼마나 물릴지)이 따로 계산하면 짝이 어긋나고, 그 어긋남은
 * "그림자가 없다"로만 보여 원인을 짚기 어렵다.
 */
const SHADOW = shadowFrustum(
  DEFAULT_LAYOUT.cellX, SHADOW_BAND, TOWER_MAX_H, SHADOW_MAP,
);

/**
 * **접촉그림자(베이킹) 노브 다섯.** 감독 지시 2026-08-11 *"해상도 조정옵션도 만들고.
 * 기타 세부옵션을 넣자."*
 *
 * 기본값을 여기 적지 않는다 — 전부 소비처 상수를 fallback 으로 읽는다. 같은 값을 두 곳에
 * 적으면 한쪽만 고쳐도 아무도 모른다(이 저장소가 색·수치·임계값에서 세 번 데인 형태).
 *
 * ⚠ **여덟에서 셋이 빠졌다**(2026-08-11 2회차). 감독이 방향성 그림자를 폐기하고 빌더의
 * 접촉그림자를 지목하면서 `?shlen`(길이 상한)·`?shtail`(꼬리 알파)·`?shstyle`(penumbra 룩
 * 후보)이 **가리킬 대상을 잃었다** — 접촉그림자에는 길이도 꼬리도 등고선 스택도 없다.
 * 값을 남겨 두면 노브를 밀어도 아무 일이 안 일어나고, 그것이 이 저장소가 *"관측은 면제가
 * 아니라 데이터 수집"* 이라고 적어 둔 장식 상태다.
 *
 * 셋은 슬라이더로도 열려 있다(`ui/knob-bar.ts`). 나머지 둘(`shy`·`shdec`)은 URL 전용이다 —
 * `shy` 는 z-fighting 이 기기마다 다를 때의 탈출구이고 `shdec` 는 룩 A/B 대조군이라,
 * 슬라이더에 올리면 감독이 매번 지나치며 건드릴 축이 늘 뿐이다.
 *
 * ⚠ **`?shdec=0` 은 기능을 끄지 않는다** — 슬롯도 드로우콜도 그대로이고 알파만 0 이다.
 * 룩 A/B 는 이것으로 하고(다른 축이 하나도 안 움직인다), **드로우콜 비용 A/B 를 하려면
 * `parts/index.ts` 에서 `shadowParts` 한 줄을 지운다.** 그것이 이 저장소가 기능을 끄는
 * 방식이고, 노브로 흉내 내면 "껐는데 왜 draw 가 그대로냐" 로 오독된다.
 */
const SHADOW_DECAL_OPTS = {
  res: Math.round(readNum('shres', SHADOW_DRAW_PX, SHADOW_DRAW_MIN, SHADOW_DRAW_MAX)),
  // 상한이 1 이 아니다 — 기본값이 이미 1(빌더 원본)이라 1 로 자르면 노브가 한쪽으로만
  // 열린다. 근거는 `SHADOW_DENSITY_MAX` 주석.
  density: readNum('shdark', SHADOW_DENSITY, 0, SHADOW_DENSITY_MAX),
  // 상한을 `1` 로 적지 않는다 — 슬라이더(아래)와 스톱 위치 정규화의 분모까지 **세 곳**이
  // 같은 값을 봐야 한다. 한 곳에만 적고 나머지가 읽는다.
  soft: readNum('shsoft', SHADOW_SOFT, 0, SHADOW_SOFT_MAX),
  // ⚠ **절대 높이가 아니라 캐스터 발밑에서 띄우는 값이다**(감독 실기기 2026-08-11:
  // *"그림자가 바닥 위에 떠있어"*). 하한이 0.16 이었던 것은 절대 높이일 때 도로
  // (0.14)를 넘겨야 했기 때문이고, 상대 띄움에는 그 제약이 없다 — 0 까지 연다.
  y: readNum('shy', SHADOW_LIFT, 0, SHADOW_LIFT_MAX),
  on: readNum('shdec', 1, 0, 1),
  // 합성 모드. **감독 화면이 깨졌을 때 링크 하나로 되돌리는 수단이다** — `three/webgpu`
  // 에서 `MultiplyBlending` 이 동작하는지 헤드리스로 검증할 방법이 이 저장소에 없다.
  // 근거 전문은 `decide/shadow-decal.ts` 의 「합성 모드」 절 마지막 문단 한 곳이다.
  blend: readEnum('shblend', SHADOW_BLEND, SHADOW_BLENDS),
  // 잎 그림자 깊이. **기본이 0 이라 얼룩은 꺼져 있다** — 감독이 카드에서 고른 것은
  // *"얼룩덩덩하게"* 였으나 배포본을 보고 *"산만하면 `?shleaf=0` 으로 확정"* 으로
  // 뒤집었다(2026-08-11). 켜려면 `?shleaf=0.55`(= `LEAF_DEPTH_ON`) 로 민다.
  // ⚠ 이 주석은 방향이 반대로 적혀 있었다(*"0 으로 밀면 원으로 돌아온다"*) — 값만
  // 바꾸고 그 값을 설명하는 문장을 안 고친 것이고, 이번 회차에 같은 형태가 **여섯 번째**다.
  // 값 미러링과 같은 실수가 코드 값이 아니라 **서술**에서 재현된다: 한 사실을 여러 파일이
  // 서술하면 한 곳만 고쳐도 아무도 모른다(짝은 `parts/tree.ts` 의 `shadowProfile` 주석).
  leaf: readNum('shleaf', LEAF_DEPTH, 0, LEAF_DEPTH_MAX),
};

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
  // 범위는 `decide/village-rules.ts` 가 소유한다 — `?bld=`·`?tree=` 와 **같은 축**이라
  // 여기에 8 을 다시 적으면 한쪽만 고쳐도 아무도 모른다.
  return Math.round(readNum('density', MUL_MIN, MUL_MIN, MUL_MAX));
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
  /**
   * 빌더·그림자 재베이킹·편집이 **함께 쓰는** 슬롯 어댑터.
   *
   * 여기 위쪽에 있는 이유는 순서다: 기능 조립(`pools` 단계)이 이것을 만드는 `stream`
   * 단계보다 **먼저** 돈다. 그래서 `FeatureEnv.retargetSlot` 은 값이 아니라 **늦게 읽는
   * 클로저**로 넘어간다 — 편집이 실제로 부르는 시점(감독이 조작할 때)에는 이미 채워져 있다.
   */
  let slotPool: SlotPool | null = null;

  const density = readDensity();
  // 밀도는 배치 판정에만 곱한다. 풀 예산은 이 레이아웃에서 자동으로 파생되므로
  // 두 곳에 따로 적지 않는다(값 미러링 금지).
  // 표면 가산 되돌림 노브. 기본 1(켬) — `?gsurf=0` 이면 실물이 전부 지면(y=0)에 놓여
  // **2026-08-12 이전 화면**이 된다(잔디에 7cm 잠기고 그림자가 판 아래로 묻힌다).
  // 감독이 새 화면과 옛 화면을 재배포 없이 나란히 보기 위한 축이다 — 근거 전문은
  // `parts/types.ts` 의 `surface` 주석 한 곳.
  const surface = readNum('gsurf', DEFAULT_LAYOUT.surface, 0, 1);
  // ── 마을 규칙 노브 (감독 지시 *"너가 만든 규율을 내가 편집하고"*) ──────────
  // `?density=` 는 건물·나무를 **함께** 올린다(부하 시험용, 이름 유지). `?bld=`·`?tree=`
  // 는 한쪽만 올린다 — *"나무만 늘리기"* 가 안 되던 것을 연다.
  //
  // **곱셈은 `decide/village-rules.ts` 한 곳**이다. 여기와 슬라이더와 테스트가 같은
  // 함수를 부르므로 규칙이 바뀌면 셋이 함께 바뀐다(값 미러링 금지).
  const bldMul = Math.round(readNum('bld', MUL_MIN, MUL_MIN, MUL_MAX));
  const treeMul = Math.round(readNum('tree', MUL_MIN, MUL_MIN, MUL_MAX));
  const LAYOUT = villageLayout(
    { density, building: bldMul, tree: treeMul },
    surface === DEFAULT_LAYOUT.surface ? undefined : { surface },
  );

  // ── 동결 파셀 저장소 ──────────────────────────────────────────────────────
  // 감독이 손본 구역은 계산이 아니라 저장된 배열을 쓴다(판정·근거는
  // `decide/parcel-freeze.ts`·`systems/village-parcels.ts`). 여기서 만드는 이유는
  // **소유가 조립부에 있어야 하기 때문**이다 — 오버레이 기능은 파일을 읽어 앉힐 뿐이고,
  // 그 기능을 빼도 마을 배치가 사라지면 안 된다.
  //
  // 비어 있는 것이 라이브의 기본값이다. 비면 `lookup` 이 즉시 `null` 을 내므로 빌더는
  // 예전과 똑같이 전부 계산한다.
  //
  // ⚠ `LAYOUT` 을 넘기는 것이 조건이다. 저장소의 `partsAt` 이 계산 경로를 쓰는데 그것이
  // 조립부와 다른 레이아웃이면 «집으려고 스냅샷을 떴더니 화면과 다른 배치» 가 된다.
  const village = createVillageParcels({ layout: LAYOUT });

  // 충돌(태스크 #182). `?collide=0` 으로 끈다 — 예전처럼 통과한다.
  // **끄는 노브를 두는 이유**: 스모크가 켬/끔을 대조군으로 비교할 수 있어야 "정말 막고
  // 있는가" 를 잴 수 있고, 벽에 갇히는 사고가 나면 감독이 링크 하나로 빠져나올 수 있다.
  //
  // ⚠ **`collide=0` 은 대조군 전용이다 — 게이트의 본 세션에 붙이지 않는다**(검수관 P7).
  // 이 저장소는 그 사고를 이미 한 번 냈다: 게이트 넷이 `npc=0&vrm=0` 을 켜 둔 채
  // *"개수가 상수다"* 를 선언했고, 그것은 **라이브에 없는 조건의 세계**였다
  // (`scripts/smoke/world2-ready.mjs` 가 그 경위를 적고 있다). 충돌을 끄면 주행이
  // 길어져 세션이 편해지는데, 그 편함은 **라이브가 아닌 것을 잰 대가**다.
  // 라이브 상태 판정은 언제나 이 노브가 1 인 세션이 한다.
  const collide = readNum('collide', 1, 0, 1) === 1;
  // 셀 크기를 따로 넘기지 않는다 — `LAYOUT` 안에 있고, 두 곳에서 읽으면 어긋난다(P4).
  // ⚠ **빌더와 같은 조회를 넘긴다.** 한쪽에만 주입하면 렌더와 충돌이 다른 마을을 보고,
  // 그 증상은 «건물은 저기 있는데 여기서 막힌다» 다 — `collide.ts` 가 선언한
  // «보이는 자리 = 막히는 자리» 가 깨지는 자리가 정확히 여기다.
  const collider = createCollider({
    layout: LAYOUT,
    frozenAt: (px, pz, tier) => village.lookup(px, pz, tier),
  });

  const scene = new THREE.Scene();
  // ── 카메라 far 는 **하늘 돔 상한에서 유도한다** (감독 문의 2026-08-05) ────────
  // 돔이 far 를 넘으면 잘리는데, 화면에는 *"하늘이 사라졌다"* 로 보여 원인을 찾기
  // 어렵다. 예전에는 `1200` 을 손으로 적고 `DOME_MAX` 를 1100 으로 맞춰 뒀다 —
  // 두 값이 따로 살아 있었고, 한쪽만 올리는 순간 조용히 깨지는 형태였다.
  //
  // ⚠ **근거는 여기 적지 않는다**(검수관 BL-2). 깊이 정밀도 실측을 이 자리에도 적었다가
  // `systems/sky.ts` 쪽과 **곧바로 어긋났다** — 값 미러링을 없애는 커밋이 값 미러링을
  // 만든 셈이다. 왜 far 를 키워도 되는지는 `DOME_MAX` 독블록 한 곳이 소유한다.
  //
  // ×1.25 는 눈높이·부동소수 여유다. 계수가 1 이하면 돔이 잘린다(테스트가 본다).
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, DOME_MAX * 1.25);
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
  // 안개 거리는 `decide/fog.ts` 가 SSOT 다. 여기 배수를 다시 적으면 "안개 밖" 을
  // 판단해야 하는 다른 모듈이 그것을 알 방법이 없어진다 — 실제로 `npc.ts` 가 자기
  // 나름의 거리를 쓰다가 25.6m 를 헛그리고 있었다(본편 ①).
  // ── `?fogd=` — 안개 거리 배수. **감독 지시 2026-08-07** ────────────────────
  //
  // 감독: *"lod 가리기 위한 연기 그 값이 문제인듯 그냥 띠로 보여"* →
  //       *"안개 가리개가 아니라 **띠 가리개**야. 일단 가리개를 없애보자"*
  //
  // 위 문단이 *"안개가 딱 그 경계를 덮어야 세계의 끝이 안 보인다"* 고 적고 있는데,
  // **바다에서는 그 덮개 자체가 보인다.** 76.8m 는 트인 수면에서 화면상 코앞이라
  // 그 밖이 전부 균일한 안개색 — 즉 가리개가 가리는 대신 **띠가 될 수 있다.**
  //
  // ── ⚠ 이것은 가설이다. 단정하지 마라 (검수관 지적) ─────────────────────────
  // 첫 판본은 여기에 *"낮의 띠(하늘 217 / 띠 229.3)가 색공간과 무관하게 남아 있던
  // 것이 이것으로 설명된다"* 고 **단정**해서 적었다. 앞 절반은 참이다(`nightFloor`
  // 는 낮에 전 채널 0 이라 밤 하한 버그가 낮에 작동하지 않는다 — 검수관 확인). 그러나
  // **그렇다고 원인이 안개 거리라는 결론이 따라 나오지 않는다.** 유력한 반례를 하나도
  // 배제하지 않은 채 쓴 문장이었다. 이 저장소가 반복해 데인 *"참인 문장에서 성립하지
  // 않는 결론을 뽑는"* 형태 그대로다.
  //
  // ── ★ 배제되지 않은 반례: `HorizonBand` 는 이 노브로 안 사라진다 ────────────
  // `systems/horizon.ts` 의 수평선 밴드(#202, **이 저장소에서 문자 그대로 "밴드"**)는
  // `?hz=0` 이 아닌 한 항상 생성되고, 색을 **`scene.fog` 에서 가져오지 않는다** —
  // `lightOf()` 팔레트를 직접 읽는다(`tests/world2-horizon.test.ts` 가 못박고 있다:
  // *"밴드 색은 팔레트에서 온다 — scene.fog 를 경유하지 않는다"*).
  //
  // 그래서 **`?fogd=0` 을 켜도 밴드는 사라지지도 색이 바뀌지도 않는다.** 오히려
  // 세기가 지금 0(감독 확정)이라 `dim=1` 이고, 밴드는 안개색을 **감쇠 없이 그대로**
  // 칠한다 — 주변이 안개 없이 원 재질색으로 그려지는 화면에서 밴드만 안개색이면
  // **전에 없던 불일치가 새로 생길 수 있다.** `decide/horizon.ts` 가 실측으로 확인한
  // *"띠가 원근이 아니라 독립된 물체로 보인다"* 가 정확히 그 형태다.
  //
  // 감독이 *"띠 가리개"* 라고 부른 것이 **안개인지 이 밴드인지 아직 안 갈렸다.**
  // 두 축을 따로 꺼봐야 갈린다:
  //
  //   ?fogd=0          안개만 끔 — 밴드와 아래 돔 채움은 남는다
  //   ?hz=0            밴드만 끔 — 안개와 돔 채움은 남는다
  //   ?fogd=0&hz=0     둘 다 끔 — **그래도 돔 채움은 남는다**(아래)
  //   (노브 없음)       대조군
  //
  // ── ★ 세 번째 후보: 두 노브 어느 쪽에도 안 걸린다 (검수관 2차 지적) ────────
  // `sky.js:286-296`(⑨ 규칙). **하늘 돔은 완전구**이고 지평선 아래 절반이 팔레트
  // `L.fog` 색으로 **단색 채워져** 있다 — 이음새 방지용이다. `scene.fog` 도 아니고
  // `HorizonBand` 도 아닌 **제3의 안개색 표면**이고, `?fogd=0&hz=0` 으로도 안 꺼진다.
  // 끄는 노브가 없다.
  //
  // 그 채움이 평소 안 보이는 이유를 주석이 스스로 적고 있다 — **"지면에 가려"**.
  // **그런데 이번 조사는 전부 `?at=sea` 다. 바다에는 지면이 없다.** 물 평면
  // (`ocean.ts` 의 `PLANE` ≈1920m)이 우연히 근사 차폐를 하고 있을 수는 있으나 그것은
  // 검증된 적이 없고 설계 전제도 아니다.
  //
  // **그러니 `?fogd=0&hz=0` 에서도 띠가 남으면 "미지의 것" 이 아니라 여기부터 본다.**
  // 이름 있는 후보를 미지로 남겨 두는 것이 위에서 한 번 데인 그 형태다.
  //
  // ── ★ 네 번째 후보: 글린트 — 그리고 이것은 실측표를 흔든다 ─────────────────
  // `sky.js:867-923`. 수면 빛반사 띠. 주석이 스스로 **"수평선(fog 원단)까지 닿는
  // 빛기둥"** 이라고 적는다 — 정확히 지금 조사 중인 그 자리다. `waterY !== null` 이고
  // `weather === 'clear'` 이면 **항상** 생성·표시되는 가산합성 평면이고, `?fogd` 도
  // `?hz` 도 참조하지 않는다. 끄는 노브가 없다.
  //
  // **그리고 이것이 근거를 흔든다.** `decide/horizon.ts` 의 실측 조건은 **"밤 맑음"**
  // 이었다 — 글린트가 켜지는 조건과 정확히 겹친다. 시선(`yaw π`)이 광원 방위와 겹치면
  // 그 띠가 표본 열(화면 가운데 10%)에 들어와 밝기를 보탰을 것이고, 안 겹치면 안
  // 보탰을 것이다. **어느 쪽인지 검증된 적이 없다.** 즉 우리가 근거로 삼아온 표
  // (하늘 98 / 띠 143 / 물 85)에 글린트가 섞여 있었을 가능성을 배제할 수 없다.
  //
  // ── ⚠ 이 목록이 완결됐다고 믿지 마라 ───────────────────────────────────────
  // 검수관 재확인마다 후보가 **하나씩** 나왔다 — 1차 `HorizonBand`, 2차 ⑨ 돔 하반부
  // 채움, 3차 글린트. 매번 "이제 다 봤다" 고 생각한 다음에 나왔다. 부수 후보로
  // `ocean.ts` 윤슬(광원 방위 반짝임, 수평선 한 줄이 아니라 표면 전반이라 형태가
  // 다르다)과 블룸(WebGPU 전용 — 헤드리스 실측엔 무관하고 실기기에서는 배제 못 함)도
  // 훑었으나 확실성이 낮아 이름만 남긴다.
  //
  // **끄는 노브가 없는 후보가 셋이다**(⑨ 채움 · 글린트 · 윤슬). 화면에서 가르려면
  // 그것들도 열어야 한다 — 이 커밋은 거기까지 안 갔다.
  //
  //   ?fogd=1    지금(기본). near 51.2m · far 76.8m
  //   ?fogd=3~10 멀리 밀기. 띠는 물러나고 세계 끝이 드러나기 시작한다
  //
  // **`scene.fog` 만 끈다.** `fogBand` 의 다른 소비자(NPC 은닉 임계·바다 타일 범위·
  // 수평선 밴드 반경)는 **거리 판정**이라 그대로 둔다 — 시각 효과를 끄자고 판정
  // 논리까지 0 으로 만들면 NPC 가 사라지거나 바다가 없어져 **무엇을 보는지 자체가
  // 달라진다.** 실험은 한 축만 움직여야 한다.
  //
  // 안개 거리는 여전히 `decide/fog.ts` 가 SSOT 다. 여기서 곱하는 것은 **비교용
  // 배수**이고 기본값 1 이 그 SSOT 를 그대로 쓴다 — 배수를 여기 상수로 박지 않는다.
  const fogDist = readNum('fogd', 1, 0, 20);
  const fog = fogBand(CELL_X);
  /** 안개색. LOD 페이드의 시작색이기도 해서 상수로 뽑는다 — 두 곳에 적지 않는다 */
  const FOG_HEX = 0x0b0d12;
  scene.fog = fogDist > 0
    ? new THREE.Fog(FOG_HEX, fog.near * fogDist, fog.far * fogDist)
    : null;
  /** 안개가 꺼져 있을 때(`?fogd=0`) 페이드가 출발할 색 */
  const fogFallback = new THREE.Color(FOG_HEX);

  // ── LOD 페이드 — 새 파셀이 안개에서 배어 나오게 (감독 지시 2026-08-07) ────
  //
  // 감독: *"ldo로 건물들이 나타날때 디졸브 철럼 나오게 가능? 현재는 팍"*
  //
  //   ?lodfade=N      페이드 시간(초). **0 이면 끈다** = 종전 동작
  //   ?lodease=NAME   커브. lin | in | out | smooth
  //
  // 왜 "팍" 이 나는지(등장 지점의 안개 진행률 62.5%)와 기본값의 근거는
  // `decide/lod-fade.ts` 한 곳이다 — 여기에 숫자를 다시 적지 않는다.
  // 기본값은 **감독 판정 대기 중인 잠정치**이고, 판정은 이 두 노브로 받는다.
  const lodFade = readNum('lodfade', FADE_SECONDS, 0, 5);
  const lodEase = readEnum('lodease', FADE_EASE, FADE_EASES);
  // 새 부품이 땅에서 자라는 시간. `?grow=0` 이 종전 동작(즉시 완성 크기 = 팝).
  // 색 페이드가 왜 이걸 대신 못 하는지는 `systems/parcel-grow.ts` 머리 한 곳이다.
  const growSecs = readNum('grow', GROW_SECONDS, 0, 3);
  // `?shrink=` — 반납 수축 시간(초). 후진 그림자 명멸(#218, ?shint=0 으로 축 확정)의
  // 처방 후보다: 키 큰 캐스터의 그림자가 0.25s 에 걷히는 것이 명멸의 핵이라, 시간을
  // 늘려 연속 변화로 만든다. 근거·경계는 `systems/parcel-grow.ts` 의 SHRINK_SECONDS
  // 주석 한 곳. 감독 판정이 나면 그 값을 기본으로 승격한다(팀장 조건 2, 2026-08-10).
  const shrinkSecs = readNum('shrink', 0, 0, 3);
  // `?shrinkease=` — 수축 전용 이징(lin·in·out·smooth). 시간 축과 분리해 판정하기
  // 위한 것(팀장 조건 1: 'out' 앞쏠림이 시간 후보 판정을 오염시킨다). 왜 분리인지는
  // `systems/parcel-grow.ts` 의 shrinkEase 주석 한 곳. 기본 'out' = 종전 동작
  // (등장 ease 와 동일값이라 "미지정"과 구별할 필요가 없다).
  const shrinkEase = readEnum('shrinkease', 'out', FADE_EASES);

  // 적응 품질(해상도 강등·프레임 캡·tier 압력)을 통째로 끈다. **비교 실험 전용** —
  // 감독 실기기 "이동 중 밝기가 살짝 변함"(2026-08-10)에서 안개·헤드밥이 실측으로
  // 기각된 뒤 남은 이동-반응 축이 적응 해상도 하나라, 켬/끔 두 링크로 가른다.
  // 기본값 1 = 현행 그대로. 끄면 저사양 기기 보호가 사라지므로 상시 사용 금지.
  const adaptOn = readNum('adapt', 1, 0, 1) > 0;

  // tier 밴드 배율. **진단 전용** — `?band=2` 면 강등선(nearExit 41.6m)이 83.2m 로
  // 밀려 후진 코스에서 tier 전환이 사실상 사라진다. 마크 리포트가 지목한 마지막
  // 용의자(tier강등)를 분리하는 스위치다. 왜·한계는 `decide/lod.ts` 의 `scaleBands`
  // 한 곳이다. 기본값 1 = 현행 그대로. builder 와 streaming 이 **같은** 밴드를 받아야
  // 격자 생성과 tier 판정이 정합한다(한쪽만 주면 예산과 판정이 어긋난다).
  //
  // `?nearx=` 는 깜빡임 상시 처방 후보(팀장 판정 (a), 2026-08-10) — near 전환점만
  // 안개 뒤로 민다. 후보 비교용이고 감독 판정이 나면 이긴 값을 기본으로 승격한다.
  //   ?nearx=1.6   51.2m (안개 시작점 — 감춤 0%부터 시작)
  //   ?nearx=1.75  56.0m (안개 19%)
  //   ?nearx=2.0   64.0m (안개 50%)
  // 왜 이 축인지·보정 규칙은 `decide/lod.ts` 의 `withNearExit` 한 곳이다.
  const nearx = readNum('nearx', 0, 0, 2.2);
  // `?calm=1` — 파셀 **생성**을 안개 100% 지점(fog far) 뒤로 민다(팀장 판정 (a′)).
  // ⚠ **기본으로 승격하지 않는다 — 여기서 멈춘다**(감독 판정 2026-08-10 *"자라나는것
  // 느낌 좋다"*). 파셀이 자라나며 등장하는 것을 나는 "깜빡임의 한 겹"으로 규정했지만
  // 감독은 그 화면을 **연출로 긍정**했다 — 수치가 이상한 것과 화면이 잘못된 것은 다른
  // 일이다. 노브는 진단 대조용으로만 남긴다(등장을 숨긴 화면과의 A/B). 감독이 남긴
  // 문제는 "반짝임"이고 그것은 이 축이 아니다.
  // 왜 farEnter 인지·farExit 가 따라오는 규칙은 `decide/lod.ts` 의 `withFarEnter` 한 곳.
  const calm = readNum('calm', 0, 0, 1) > 0;
  let TIER_BANDS = withNearExit(
    scaleBands(DEFAULT_BANDS, readNum('band', 1, 0.5, 4)),
    nearx > 0 ? nearx : Number.NaN,
  );
  if (calm) TIER_BANDS = withFarEnter(TIER_BANDS, FOG_FAR_CELLS);

  // ── 어디서 출발할 것인가 (감독 실기기 2026-08-09) ─────────────────────────
  //
  // 감독: *"가까이 가면 뭔가 건물이 번쩍해"*
  //
  //   ?fademode=near  (기본) 그 자리의 **안개가 감춰주는 만큼만** 안개색을 섞는다
  //   ?fademode=fog          종전 — 거리와 무관하게 **무조건 안개색**으로 덮는다
  //
  // 왜 `fog` 가 번쩍이 되는지(안개는 51.2m 부터인데 부품은 50.07m·20.22m 에서도
  // 태어난다)는 `decide/lod-fade.ts` 의 `fogFactorAt` 한 곳이다 — 여기에 다시 적지 않는다.
  // `fog` 를 남겨 둔 이유는 **감독이 두 판본을 화면에서 비교해야 하기 때문**이고,
  // 판정이 끝나면 진 쪽을 걷어낸다(사이클 2항: 후보를 여럿 동시에).
  const fadeMode = readEnum('fademode', 'near', ['near', 'fog'] as const);

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

  // 물속 틴트 판. 마크업은 `world2.html` 에 있고 색도 거기 있다 — 여기서는 세기만
  // 실어 나른다. 요소가 없어도(구버전 HTML 캐시) 그냥 안 보일 뿐 터지지 않는다.
  const underwaterEl = document.getElementById('w2-underwater');
  /**
   * 마지막으로 쓴 알파. **값이 같으면 안 쓴다**(검수관 비블로커 권고 2026-07-31).
   *
   * 뭍에서는 알파가 계속 0 인데 매 프레임 `style.opacity` 를 재대입하면 스타일 무효화가
   * 매번 걸린다. 단일 속성이라 비용은 작지만, 이 저장소는 "작다는 게 근거 없이 해도
   * 된다는 뜻은 아니다" 를 이미 한 번 적었다. `-1` 로 시작하는 것은 첫 프레임에 반드시
   * 한 번 쓰이게 하려는 것이다(알파는 0 이상이라 절대 같아지지 않는다).
   */
  let lastAlpha = -1;

  const player = new PlayerSystem({
    // ── 어디서 시작할까 (감독 지시 2026-08-04 *"링크로 강 또는 바다로 한번에 갈수있어?"*) ──
    // `?at=river` / `?at=sea` 로 물가에 바로 선다. 좌표는 `decide/spawn-spot.ts` 가
    // `parcelWater` 에 물어 **찾는다** — 상수로 박으면 강이 옮겨지는 날 물속에서 시작한다.
    // 기본값 `default` 는 기존 스폰 그대로라 링크를 안 붙이면 아무것도 안 바뀐다.
    // ⚠ `LAYOUT`(밀도 노브가 바꿀 수 있는 것)이 아니라 `CELL_X/Z`(기본 셀)를 쓴다 —
    //   `parcelWater` 로 강을 찾는 계산이 지면 판정과 **같은 셀**을 봐야 물가가 맞는다.
    start: spawnFor(readEnum('at', 'default', SPAWN_SPOTS) as SpawnSpot, CELL_X, CELL_Z),
    speed: walkSpeed,
    eyeHeight,
    bobAmplitude,
    applyCamera: (x, y, z, yaw, pitch) => {
      camera.position.set(x, y, z);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
    },
    // ── 물에 빠진다 (감독 지시 2026-07-31 *"강에 사람이 빠지게해줘"*) ───────────
    // 지형을 아는 것은 조립부(여기)뿐이다. `PlayerSystem` 은 "이 좌표가 물이면 수면이
    // 여기" 라는 함수 하나만 받고 강도 바다도 모른다.
    //
    // **`CELL_Z` 다**(검수관 조건 2026-07-31). 처음에 `CELL_X` 를 넘겼는데, 강 기준선은
    // 광장을 **z 방향**으로 재서 유도하고(`decide/water.ts` 의 `riverBase`) `parcelWater`
    // 도 z 쪽에 `cellZ` 를 준다. 지금은 두 셀이 32 로 같아 관측 가능한 차이가 0 이라
    // 어떤 테스트도 안 걸렸겠지만, `water.ts:316` 주석이 경고하는 형태 그대로였다 —
    // *"`cellX` 를 넘기면 두 셀이 달라지는 날 강이 조용히 밀린다."*
    waterSurfaceY: (x, z) => surfaceYAt(x, z, CELL_Z),
    // 벽에 막힌다(태스크 #182). 지형을 아는 것은 여기뿐이라는 규약이 물과 같다 —
    // `PlayerSystem` 은 "이만큼 가려는데 실제로는 어디까지" 만 묻는다.
    // **`LAYOUT` 을 넘긴다** — `?density=N` 으로 파츠가 늘면 충돌도 같이 늘어야
    // "보이는데 안 막히는" 것이 안 생긴다.
    resolveMove: collide ? collider.resolve : undefined,
    seabedY: SEABED_Y,
    onSubmerge: (alpha) => {
      if (!underwaterEl || alpha === lastAlpha) return;
      lastAlpha = alpha;
      underwaterEl.style.opacity = String(alpha);
    },
  });

  let streaming: StreamingSystem | null = null;
  let adapt: AdaptSystem | null = null;
  let builder: PooledParcelBuilder | null = null;
  let shadowDecal: ShadowDecalSystem | null = null;
  /**
   * 그림자 데칼 노브의 **살아 있는 값**. 슬라이더가 이 객체를 직접 고치고 시스템이 매
   * 프레임 되읽는다 — 새 객체로 갈아치우면 시스템이 든 참조가 옛 것이라 배선이 끊긴다.
   */
  const shadowOpts = { ...shadowDecalDefaults(), ...SHADOW_DECAL_OPTS };
  /**
   * 부팅 때 만든 파츠 자산. **그림자 데칼이 캐스터 지오의 bounding box 를 실측**하려면
   * 필요하다 — 치수를 파츠 선언에 적지 않기로 한 대가로, 자산을 조립 시점 밖으로 들고
   * 나온다(`pools()` 지역 변수였다).
   */
  let partAssets: ReturnType<typeof createPartAssets> | null = null;
  let parcelFade: ParcelFadeSystem | null = null;
  let parcelGrow: ParcelGrowSystem | null = null;
  /** 조립된 기능들. 무엇이 켜졌는지는 `features/index.ts`가 정한다 */
  let features: MountedFeature[] = [];

  /**
   * 지금 몇 시인가 — **월드 상태이고 조립부가 소유한다**(팀장 판정 A-2, 2026-07-30).
   *
   * 하늘도 후보정도 이 값을 보고, 바꾸는 것은 `env.setTime` 하나다. 예전에는 하늘이
   * 혼자 들고 있었고 후보정은 반구광 세기로 시간대를 **추측**했다 — 밤을 밝히는 커밋이
   * 그 추측의 근거를 무너뜨려 블룸이 밤에 통째로 꺼졌다(`features/types.ts` 의 `time`
   * 주석에 전말이 있다).
   *
   * 초기값은 URL 이다. `readEnum` 이 목록 밖 값을 걸러 주므로 팔레트 조회가 `undefined`
   * 가 되는 일이 없다.
   */
  let timeOfDay: SkyTime = readEnum('time', 'night', TIMES);
  /**
   * 어떤 셰이딩으로 보는가 — **월드를 보는 방식이고 조립부가 소유한다**(바로 위
   * `timeOfDay` 와 같은 이유·같은 모양).
   *
   * 감독 지시 *"와이어 프레임 뷰. 솔리드 뷰도 구현해줘."* 에서 왔다. 바꾸는 자리는
   * 셋이고(URL·편집 패널 버튼·`Shift+Z`) 전부 `env.setShading` 하나로 모인다.
   *
   * 기본값이 `material` 인 것은 «노브를 안 켠 세션의 화면은 지금 그대로» 라는 뜻이다.
   * `readEnum` 이 목록 밖 값을 걸러 주므로 `shadingSpec` 이 모르는 값을 받는 일이 없다.
   */
  let shadingMode: ShadingMode = readEnum('shading', 'material', SHADING_MODES);
  /**
   * 표면 재질 설정(W7). **월드 상태이고 조립부가 소유한다**(위 `shadingMode` 와 같은 이유).
   *
   * ⚠ **바뀔 때만 새 배열을 낸다.** 집행(`features/surface-paint.ts`)이 참조 동등성으로
   * «안 바뀌었다» 를 판정하므로, 배열을 제자리에서 고치면 화면이 안 따라온다. 매 프레임
   * 전 표면을 훑지 않기 위한 축이고, 대가가 이 규약이다.
   *
   * 초기값은 비어 있고 — 즉 **어느 표면도 안 건드린 지금 화면** — 오버레이 JSON 을 읽은
   * 뒤 `setSurfaces` 로 채워진다.
   */
  let surfaces: readonly SurfaceSetting[] = [];

  /**
   * 파츠 풀 **밖에** 있는 표면 재질(W7). 지금은 물(해저)뿐이다.
   *
   * 팀장 판정 2026-08-15: *"물 재질은 조립부 소유 레지스트리로 모은다 — InstancePools 얹기는
   * 슬롯 풀의 의미론을 오염시키고(물은 슬롯을 안 쓴다), ocean 자체 집행은 dispose 경로가 두
   * 벌이 된다. 회수는 한 곳, 소유는 조립부, 기능은 등록·읽기 통로만."*
   *
   * `unknown` 인 것이 의도다 — 조립부는 이 재질로 **아무것도 안 한다**. 넘겨받아 들고 있다가
   * 집행에 돌려줄 뿐이고, 그래서 three 타입을 알 필요가 없다.
   */
  const extraSurfaces = new Map<string, unknown>();
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
      // 마크 버튼은 **없어도 된다** — 위 조건절에 넣지 않은 이유가 그것이다.
      // 진단용 추가물이 HUD 전체를 인질로 잡으면, 버튼 하나 오타에 실기기 수치를
      // 통째로 못 받는다.
      mark: document.getElementById('w2-hud-mark'),
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
      // 막은 기능 이름 — 리포트가 "npc·glb-city 가 판정 불가로 표시" 를 찍게 한다.
      drawBlockers: () => drawGroupKeyOf(features).blockedBy,
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
        // intensity 0 이면 캐스트 자체를 끈다 — 화면은 동일한데 그림자 패스 비용만
        // 남기 때문이다. 부팅 시점 결정이라 셰이더 재컴파일 사고(adapt.ts 머리의
        // pipeline 21→34)와 무관하다. 근거는 `SHADOW_INTENSITY` 주석 한 곳.
        dir.castShadow = SHADOW_INTENSITY > 0;
        dir.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
        // ── 프러스텀은 유도한다 (감독 지시 2026-08-02 "하드라이트 느낌이 없어") ──
        // 여기가 비어 있어서 three 기본 **±5m** 가 쓰이고 있었다. 셀이 32m 인 세계에서
        // 그 반경은 발밑뿐이라, `castShadow` 를 단 파츠들이 전부 그림자를 못 그렸다.
        // 값 넷이 서로 묶여 있으므로 `decide/shadow.ts` 가 함께 유도한다.
        dir.shadow.camera.left = -SHADOW.half;
        dir.shadow.camera.right = SHADOW.half;
        dir.shadow.camera.top = SHADOW.half;
        dir.shadow.camera.bottom = -SHADOW.half;
        dir.shadow.camera.near = SHADOW.near;
        dir.shadow.camera.far = SHADOW.far;
        dir.shadow.normalBias = SHADOW.normalBias;
        // 진하기. `?shint=` — 근거는 위 `SHADOW_INTENSITY` 주석 한 곳이다.
        (dir.shadow as unknown as { intensity: number }).intensity = SHADOW_INTENSITY;
        dir.shadow.camera.updateProjectionMatrix();
        // **타깃을 씬에 넣는다.** three 는 `target.matrixWorld` 로 광원 방향을 정하는데,
        // 씬 밖 객체는 갱신되지 않아 타깃을 옮겨도 반영이 안 된다. 기본 타깃은 월드
        // 원점이므로, 이걸 빼먹으면 플레이어가 광장을 벗어나는 순간 그림자가 사라진다.
        scene.add(dir.target);
        scene.add(dir);
        sun = dir;
        hemi = new THREE.HemisphereLight(0x8fa6d8, 0x1b2030, 1.1);
        scene.add(hemi);
      },

      pools: () => {
        pools = new InstancePools(scene);
        const assets = createPartAssets();
        partAssets = assets;
        // `?band=` 를 여기에도 넘긴다 — 예산이 밴드를 안 따라오면 배율>1 에서 슬롯이
        // 모자라(starved) "부품이 안 그려지는" 오염이 실험 결과를 덮는다.
        const budget = PooledParcelBuilder.poolBudget({ layout: LAYOUT, bands: TIER_BANDS });
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
            scene, camera, adapter: adapter!, player, pools: pools!, village,
            // ⚠ **값이 아니라 클로저다** — 이 조립(`pools` 단계)이 `slotPool` 을 만드는
            // `stream` 단계보다 먼저 돈다. 편집이 실제로 부르는 시점에는 채워져 있다.
            // 그전에 불리면 조용히 아무 일도 안 한다(그때는 마을 자체가 아직 없다).
            retargetSlot: (h, t) => {
              slotPool?.retarget?.(h, t.x, t.y, t.z, t.ry, t.sx, t.sy, t.sz);
            },
            sun: sun!, hemi: hemi!, cell: CELL_X,
            // 프러스텀과 **같은 유도**에서 나온 값이라야 짝이 맞는다. 하늘이 태양을
            // 이보다 가깝게 놓으면 타워 꼭대기가 그림자 카메라 뒤로 밀린다.
            shadowDist: SHADOW.dist,
            shadowTexel: SHADOW.texel,
            doc: typeof document !== 'undefined' ? document : null,
            time: () => timeOfDay,
            setTime: (t) => { timeOfDay = t; },
            shading: () => shadingMode,
            setShading: (m) => { shadingMode = m; },
            surfaces: () => surfaces,
            setSurfaces: (s) => { surfaces = s; },
            // 파츠 풀이 먼저다 — 물 이름과 파츠 이름이 겹칠 일은 없지만, 겹치면 파츠가
            // 이긴다(레지스트리는 «풀 밖에 있는 것» 을 위한 자리이고 덮어쓰기용이 아니다).
            // 느낌표는 바로 위 `pools: pools!` 와 같은 근거다 — 이 리터럴은 풀을 만든 뒤에만
            // 조립되고, 이 화살표는 그보다 더 뒤(기능이 부를 때)에 실행된다.
            surfaceMaterial: (kind) => pools!.materialOf(kind) ?? extraSurfaces.get(kind) ?? null,
            registerSurfaceMaterial: (kind, m) => { extraSurfaces.set(kind, m); },
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
        // ── 비용은 재봤다. 실기기에서는 없었다 ──────────────────────────────
        // 헤드리스는 총 부팅 +1,228ms(+21%)였다. 그런데 감독 실기기 판정은 **"켜도 느린거
        // 없어"** 였다. 예열이 올리는 것의 대부분이 2048×1024 캔버스 텍스처이고,
        // 텍스처 업로드는 swiftshader 가 실 GPU 보다 극단적으로 비싼 바로 그 축이다.
        //
        // 그래서 기본은 켬이다. 노브는 남긴다 — 저사양 기기에서 다시 물음이 생기면 같은
        // 빌드로 A/B 할 수 있어야 한다.
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
        // 페이드를 **빌더보다 먼저** 만든다 — 슬롯 어댑터 안쪽에 꽂아야 tone 이 확정한
        // 색을 가로챌 수 있다. `gate` 가 `streaming` 을 늦게 읽는 것은 의도다:
        // 초기 충전이 끝나기 전에는 페이드를 걸지 않는다(세계 전체가 서서히 뜨는 것은
        // 감독이 말한 "건물들이 나타날때" 가 아니다).
        parcelFade = new ParcelFadeSystem({
          pools: pools!,
          duration: lodFade,
          ease: lodEase,
          // `three/webgpu` 는 `Fog` 타입을 재수출하지 않아 구조로 읽는다.
          fadeColor: () => (scene.fog as { color?: THREE.Color } | null)?.color ?? fogFallback,
          gate: () => streaming?.ready ?? false,
          // 그 자리가 안개에 얼마나 묻혔는가. `fog` 모드는 **항상 1** — 거리를 안 보고
          // 무조건 덮던 종전 동작이고, 감독이 두 판본을 비교하기 위한 대조군이다.
          //
          // ⚠ **밴드는 `scene.fog` 에서 읽지 않고 `fogBand(CELL_X)` 로 유도한다.** 씬의
          // 안개는 시간대·날씨가 흔들고(`night-lights.ts` 가 밤에 색을 들어올린다),
          // 페이드 판정이 그 흔들림을 따라가면 같은 자리에서 회차마다 다르게 보인다.
          // 여기서 재는 것은 *"이 거리에서 안개가 감춰줄 수 있는 최대"* 이고 그것은
          // 밴드에서만 나온다 — `decide/fog.ts` 가 그 SSOT 다.
          //
          // ⚠ **`fogDist` 를 곱한다**(검수관 비블로커 P1, 2026-08-09). 안 곱하면
          // `?fogd=` 를 켠 순간 **판정과 화면이 어긋난다** — 예: `?fogd=3` 이면 씬 안개는
          // 153.6m 부터인데 판정은 51.2m 를 써서, 80m 앞 부품을 "완전히 안개에 묻혔다" 로
          // 보고 검정으로 덮는다. **고치려던 번쩍이 그 조합에서 되살아난다.**
          // 기본값(1)에서는 무해하지만 감독이 두 노브를 함께 여는 순간 판정이 오염된다.
          fogAt: fadeMode === 'fog' ? undefined : (x, z) => {
            const dx = x - player.position.x;
            const dz = z - player.position.z;
            const b = fogBand(CELL_X);
            return fogFactorAt(Math.hypot(dx, dz), { near: b.near * fogDist, far: b.far * fogDist });
          },
        });
        parcelGrow = new ParcelGrowSystem({
          pools: pools!,
          duration: growSecs,
          // 0(노브 미지정)이면 undefined → 시스템 기본(SHRINK_SECONDS)을 쓴다.
          shrinkSecs: shrinkSecs > 0 ? shrinkSecs : undefined,
          shrinkEase,
          gate: () => streaming?.ready ?? false,
        });
        // 접촉그림자 — **빌더보다 먼저** 만든다(페이드·성장과 같은 이유: 슬롯 어댑터
        // 안쪽에 워프를 꽂아야 배치가 정한 자세를 가로챌 수 있다).
        //
        // ⚠ **`sunDir` 이 없어졌다**(2026-08-11 2회차). 예전에는 광원에서 태양 방향을
        // 되읽어 넘겼고 — `SUN_AZ` 표를 복사하지 않기 위한 배선이었다 — 그림자가 그
        // 반대쪽으로 누웠다. 감독이 방향성 그림자를 폐기하고 빌더의 접촉그림자를
        // 지목하면서 이 시스템이 태양을 **아예 안 본다.** 시간대는 농도만 움직인다.
        shadowDecal = new ShadowDecalSystem({
          pools: pools!,
          assets: partAssets!,
          parts: PARTS,
          time: () => timeOfDay,
          opts: shadowOpts,
        });
        // 어댑터를 변수로 든다 — 빌더와 재적용이 **같은 것**을 써야 한다. 각자 만들면
        // 워프·성장·색이 두 벌이 되고, 재베이킹이 빌더가 모르는 자세를 쓴다.
        slotPool = createSlotPool(
          pools!, parcelFade.sink(), parcelGrow.sink(), shadowDecal.warp(),
        );
        builder = new PooledParcelBuilder({
          pool: slotPool,
          cellX: CELL_X, cellZ: CELL_Z, layout: LAYOUT,
          // 빌더는 저장소를 **모른다** — 조회 함수 하나만 받는다. 생성기 계층이 편집
          // 데이터를 알게 되는 것을 막는 팀장 조건의 집행 축 ①(W4 ① 커밋).
          frozenAt: (px, pz, tier) => village.lookup(px, pz, tier),
        });
        shadowDecal.attach(slotPool);

        // ── 개발자 옵션: 슬라이더 셋 + 굽기 버튼 ────────────────────────────
        // 감독 지시 2026-08-11 *"베이킹 버튼을 누르면 구워지고 적용되게하자. 해상도
        // 조정옵션도 만들고. 기타 세부옵션을 넣자."* — 카드 판정으로 **월드 화면 안**에
        // 두기로 확정했다(홈 진입점은 이번 회차 제외, 팀장 판정 2026-08-11: 홈에서
        // 링크하면 world2 가 사실상 라이브 승격이고 그것은 #119 에 묶인 별도 결정이다).
        //
        // 수면 노브와 **같은 바에 누적**된다 — 감독이 말한 것은 조절 막대 하나였다.
        const bar = findKnobBar(document);
        if (bar) {
          const base = shadowDecalDefaults();
          // `key` 는 **URL 노브 이름**이고 `field` 는 옵션 필드다. 둘을 나란히 받는 이유:
          // 슬라이더에서 값을 고른 감독이 그대로 `?shdark=0.6` 을 쳐서 링크로 만들 수
          // 있어야 한다(이 저장소의 판정 사이클이 링크로 돈다). 필드명을 그대로 쓰면
          // 화면의 이름과 주소의 이름이 갈라진다.
          // 슬라이더는 **수치 축만** 받는다. 지금은 옵션이 전부 숫자라 `keyof typeof base`
          // 와 같지만 필터를 남긴다 — 열거형 노브(예전 `style`)가 다시 생기는 날 그것을
          // 빠뜨리면, 슬라이더가 열거형에 숫자를 대입하는 코드가 타입검사를 통과한다.
          type NumField = {
            [K in keyof typeof base]: (typeof base)[K] extends number ? K : never
          }[keyof typeof base];
          const knob = (
            key: string, field: NumField, label: string,
            min: number, max: number, step: number,
          ) => ({
            key, label, min, max, step,
            value: () => shadowOpts[field],
            // 기본값과 다르면 "지정됨" 이다. `readNumOpt` 를 안 쓴 이유: 이 값들은
            // 시간대별 기본값이 없어(농도의 시간대 배수는 판정이 따로 곱한다) 상황에
            // 따라 흔들리지 않는다 — 상수와 비교하면 충분하다.
            overridden: () => shadowOpts[field] !== base[field],
            set: (v: number) => { shadowOpts[field] = v; },
            reset: () => { shadowOpts[field] = base[field]; },
          });
          attachKnobBar(bar, [
            knob('shdark', 'density', '그림자', 0, SHADOW_DENSITY_MAX, 0.05),
            // 「번짐」 이 클수록 가장자리가 넓게 퍼진다 — 노브 값과 스톱 위치는 방향이
            // 반대이고, 그 뒤집기는 판정(`midStopFor`)이 한다. 여기서 뒤집지 않는다.
            knob('shsoft', 'soft', '번짐', 0, SHADOW_SOFT_MAX, 0.02),
            knob('shres', 'res', '해상도', SHADOW_DRAW_MIN, SHADOW_DRAW_MAX, 8),
          ]);
          // ── 마을 규칙 슬라이더 (감독 지시 *"너가 만든 규율을 내가 편집하고"*) ──
          // ⚠ **이 셋은 미는 즉시 반영되지 않는다.** 슬롯 풀이 부팅 1회에 봉인되므로
          // (`pools.seal()` — 개수 불변식) 마을을 다시 지으려면 새로고침이 필요하다.
          // 그래서 `set()` 은 **주소만** 쓰고 아래 「마을 적용」 버튼이 새로고침한다.
          // 감독 카드 판정(2026-08-11): *"새로고침 괜찮다"*.
          //
          // 슬라이더가 움직이는데 화면이 안 변하면 **고장으로 읽힌다.** 버튼 라벨이
          // 그 사실을 말하는 유일한 자리다.
          const ruleKnob = (key: string, label: string) => ({
            key, label, min: MUL_MIN, max: MUL_MAX, step: 1,
            // 주소를 읽는다 — `set()` 이 주소에 쓰므로 슬라이더가 민 자리에 머문다.
            value: () => readNum(key, MUL_MIN, MUL_MIN, MUL_MAX),
            overridden: () => readNumOpt(key, MUL_MIN, MUL_MAX) !== null,
            set: (v: number) => writeNumOpt(key, v),
            reset: () => writeNumOpt(key, null),
          });
          attachKnobBar(bar, [
            ruleKnob('bld', '건물'),
            ruleKnob('tree', '나무'),
            ruleKnob('density', '전체'),
          ]);
          attachKnobActions(bar, [{
            key: 'w2rules',
            label: '마을 적용 (새로고침)',
            run: () => {
              // 부팅 때 쓴 값과 같으면 새로고침이 낭비다 — 그리고 아무 일도 안 일어나면
              // 감독은 버튼이 고장 났다고 읽는다. 그래서 말로 답한다.
              const same = readNum('bld', MUL_MIN, MUL_MIN, MUL_MAX) === bldMul
                && readNum('tree', MUL_MIN, MUL_MIN, MUL_MAX) === treeMul
                && Math.round(readNum('density', MUL_MIN, MUL_MIN, MUL_MAX)) === density;
              if (same) return '지금 값 그대로';
              location.reload();
              return '적용 중…';
            },
          }, {
            key: 'shbake',
            label: '그림자 굽기',
            // 소요를 돌려주면 버튼 옆에 잠깐 뜬다. 같은 값으로 다시 구우면 화면이 안
            // 바뀌는데, 그때 아무 반응이 없으면 **버튼이 고장 난 것으로 읽힌다.**
            run: () => `${Math.round(shadowDecal?.bake() ?? 0)}ms`,
          }]);
        }
        // 부팅 중에 한 번 굽는다. 첫 파셀이 놓이기 전에 아틀라스가 비어 있으면 그 프레임에
        // 투명한 사각이 뜨고, 그것이 "처음에 그림자가 없다" 로 읽힌다.
        shadowDecal.bake();
        streaming = new StreamingSystem({
          builder,
          bands: TIER_BANDS,
          cellX: CELL_X, cellZ: CELL_Z,
          getPosition: () => player.position,
          getDirection: () => player.direction,
          // 막히면 look-ahead 를 접는다 — 감독 실기기 "분수대에 끼일때 멀리있는 lod가
          // 나왔다가 안나왔다가" 의 처방. 근거는 `streaming.ts` 의 `getSpeedFactor` 한 곳.
          getSpeedFactor: () => player.speedFactor,
          markDirty: () => kernel?.markDirty(),
        });

        // ── 동결이 바뀌면 그 파셀을 다시 만든다 ──────────────────────────────
        // 이미 떠 있는 파셀은 슬롯을 build 시점에 한 번 쓰고 그 뒤로 아무도 다시 읽지
        // 않는다. 이 한 줄이 없으면 «편집했는데 화면이 그대로다 → 새로고침하면 반영돼
        // 있다» 가 된다(화면에서만 드러나는 형태).
        //
        // ⚠ **등록이 늦어도 유실이 아니다.** 기능 조립(`pools()`)이 여기보다 먼저라
        // 오버레이가 부르는 `setAll` 이 이 줄보다 앞설 수 있는데, 그 시점엔 스트리밍이
        // 없으므로 **떠 있는 파셀도 0개**다 — 다시 만들 것이 애초에 없고, 이후 build 가
        // 저장소를 저절로 읽는다. 순서를 뒤집어 고치려 하지 마라(스트리밍이 빌더를
        // 요구하고 빌더가 풀을 요구한다).
        village.onChange((px, pz) => {
          streaming?.invalidate(px, pz);
          // 충돌 캐시도 함께 버린다. 캐시는 «플레이어가 선 파셀» 로만 갱신되므로
          // (`collision.ts` 의 `rebuild`), 감독이 **제자리에 선 채** 건물을 옮기면
          // 그 파셀이 그대로라 캐시가 안 바뀐다 → 옛 자리에 계속 막힌다.
          //
          // 파셀을 안 가리고 통째로 버리는 이유: 캐시는 3×3 을 **한 배열로 뭉쳐** 들고
          // 있어서 어느 파셀에서 온 원인지 구별할 수 없다. 편집 중에만 나는 일이고
          // 다시 만드는 비용은 파셀 9개분이라 가릴 값이 없다.
          collider.invalidate();
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
        // `parcelFade` 가 `streaming` **뒤**인 이유: 이번 프레임에 태어난 슬롯은
        // `sink.apply` 가 이미 안개색으로 덮었고, 여기서는 진행만 한다. 그래서 새 슬롯이
        // 첫 프레임에 dt(≈16ms) 만큼 앞서 나가지만 기본 커브(`in`)에서 0.2% 미만이다
        // (60fps·0.45초 기준 (16.67/450)² ≈ 0.14%) —
        // 순서를 뒤집어 없앨 수도 있으나 그러면 "이번 프레임 것은 다음 프레임부터" 라는
        // 예외를 시스템 순서로 표현하게 되어, 읽는 사람이 그 규칙을 알아야 한다.
        // `parcelGrow` 도 `streaming` 뒤 — 이번 프레임에 태어난 슬롯이 이번 프레임에
        // 시작 스케일로 줄어 있어야 완성 크기가 한 프레임도 안 비친다(fade 와 같은 이유).
        // `?adapt=0` 이면 등록만 생략한다(생성은 유지 — snapshot 소비자가 null 분기
        // 없이 초기값을 읽는다). 등록이 없으면 update 가 안 돌아 해상도·캡·압력 집행 0.
        kernel.add(streaming).add(parcelFade).add(parcelGrow);
        // 그림자 데칼은 **페이드·성장 뒤**다. 그것들이 이번 프레임에 놓은 슬롯을 보고
        // 태양이 바뀌었는지 판정해야 하는데, 앞에 두면 한 프레임 늦은 자세로 굽는다.
        if (shadowDecal) kernel.add(shadowDecal);
        if (adaptOn) kernel.add(adapt);
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

    // ── 조작 훅 — **게이트가 세션을 시뮬할 수 있어야 한다** ──────────────────
    // world1 CSV(감독 실기기 76.5초)가 보여준 것: 파이프라인이 60→227 로 단조증가했고,
    // 그중 상당수가 **아무것도 새로 로드하지 않은 채 카메라만 돌렸을 때** 생겼다.
    //
    //   t=40~65  yaw 90 고정   pipe 191 정체   fps 60
    //   t=66.7   yaw 90→126    pipe 191→200    fps 29
    //   t=67.2   yaw →171      pipe →209       fps 10
    //
    // 즉 **회전은 스트리밍과 독립된 증식 축**이다. 게이트가 걷기만 시뮬하면 이 축을
    // 통째로 놓친다. 그런데 헤드리스는 pointer lock 을 못 걸어서 `mousemove` 경로가
    // 죽어 있고(`document.pointerLockElement === canvas` 조건), 터치 조이스틱은 좌표
    // 계산이 얽혀 있다. 그래서 여기에 직접 연다.
    //
    // 계측 훅과 같은 성격이다 — behind-flag 페이지 전용이고 라이브에는 이 객체 자체가
    // 없다. **잴 수 없는 축은 지켜지지 않는다.**
    look: (dYaw: number, dPitch: number) => player.lookBy(dYaw, dPitch),
    /** 이동 축(-1..1). 프레임이 돌아야 실제로 움직인다 — 시간 기반이다 */
    move: (x: number, z: number) => player.setAxes(x, z),
    /** 현재 개수 스냅샷 — 불변식 검사는 이 값을 프레임 간 비교해 판정한다 */
    stats: () => ({
      backend: adapter!.backend,
      // 하드웨어/소프트웨어까지 가른 라벨 + 근거 (감독 지시 2026-07-31).
      // `backend` 만으로는 실기기 GPU 와 헤드리스 SwiftShader 가 같은 값이라,
      // 리포트를 성능·색감 판정의 근거로 쓸 수 없었다. 판정은 `renderer.ts` 한 곳이고
      // 여기는 읽기만 한다 — 같은 판정을 두 곳에 쓰면 한쪽만 고쳐도 아무도 모른다.
      backendDetail: adapter!.backendDetail,
      backendEvidence: adapter!.backendEvidence,
      order: kernel!.order,
      /** 부하 배수. 리포트만 보고 "어느 밀도에서 잰 것인가"를 알 수 있어야 한다. */
      density,
      /** 걷는 감각 파라미터. 감독 실기기 비교에서 "어느 값이었나"를 리포트가 답해야 한다 */
      feel: { walkSpeed, eyeHeight, bobAmplitude },
      // 플레이어 상태 — "조작이 실제로 이동으로 이어졌는가"를 재는 유일한 지점이다.
      // 파셀 수만 봐서는 알 수 없다(정상 상태에서도 같은 값이다).
      // `submersion` 은 **게이트가 강 좌표를 몰라도 되게** 하려고 연다(검수관 명세
      // 2026-07-31). 스모크가 "z 몇 미터까지 걸어라" 를 알아야 하면 그 거리가 곧 값
      // 미러링이 되고, 감독이 강을 옮기는 순간 소리 없이 못 미치는 값이 된다.
      // 이 값을 보면 스모크는 **"0 보다 커질 때까지"** 만 걸으면 된다.
      player: { ...player.position, ...player.angles, submersion: player.submerged },
      // ── 지금 선 파셀 (2026-08-08) ─────────────────────────────────────────
      // `submersion` 과 **같은 이유로** 연다 — 스모크가 셀 크기를 알아야 하면 그 숫자가
      // 곧 값 미러링이고, 셀을 바꾸는 순간 소리 없이 어긋난다. 게이트 `[7]` 의 세션이
      // *"파셀을 몇 개나 건넜는가"* 를 판정하려면(검수관 반려 B1) 이 값이 필요하다.
      //
      // ⚠ `Math.round(월드/셀)` 이라는 규약은 이 저장소에 **여덟 곳 넘게 반복**돼 있다
      // (`collision.ts`·`water.ts`·`minimap.ts`·`npc.ts`·`spawn-spot.ts` …). 여기가
      // 아홉 번째다. 순수 함수 하나로 모으는 것이 맞지만 그것은 소비자 전부를 건드리는
      // 별건이라 태스크로 남긴다 — **이 줄이 SSOT 라고 적지 않는다.**
      parcel: { px: Math.round(player.position.x / CELL_X), pz: Math.round(player.position.z / CELL_Z) },
      frame: adapter!.frameStats(),
      pipelines: adapter!.pipelineCount(), // -1이면 측정 실패(0과 구별된다)
      // ── 그림자 축 (감독 지시 2026-08-02) ─────────────────────────────────
      // **적용됐는지 밖에서 볼 수 없으면 고쳤다는 말을 검증할 수 없다.** 실제로 프러스텀을
      // 넓힌 뒤 헤드리스 스크린샷이 전혀 안 바뀌었는데, 그때 "안 먹은 것"과 "먹었지만
      // 화면 차이가 없는 것"을 가를 수단이 없었다. 값을 열어 그 둘을 가른다.
      //
      // `target` 이 특히 중요하다 — three 기본 타깃은 월드 원점이고, 그 회귀가 나면
      // 그림자는 "가끔 있다가 없어지는" 형태로만 나타나 원인을 짚기 어렵다.
      shadow: sun ? {
        half: sun.shadow.camera.right,
        near: sun.shadow.camera.near,
        far: sun.shadow.camera.far,
        normalBias: sun.shadow.normalBias,
        mapSize: sun.shadow.mapSize.x,
        target: { x: sun.target.position.x, z: sun.target.position.z },
        /** 광원과 타깃의 실제 거리. 프러스텀 깊이와 짝이 맞는지 보는 값 */
        dist: sun.position.distanceTo(sun.target.position),
      } : null,
      pools: pools!.stats(),
      stream: streaming!.stats(),
      adapt: adapt!.snapshot(),
      // 슬롯이 모자라 못 그린 부품 수. 0이 아니면 `poolBudget` 산정이 틀린 것이다 —
      // 화면에는 "건물이 몇 채 없는" 모습으로만 나타나 눈으로는 알아채기 어렵다.
      // 여유 배수를 1로 내린 뒤로는 이 값이 예산의 유일한 감시 수단이다.
      builder: builder!.stats(),
      // ── LOD 페이드가 **실제로 걸리는가** (2026-08-07) ──────────────────
      // 감독이 *"디졸브는 별차이가 없네"* 라고 했을 때, 나는 그 원인을 다른 데서
      // 찾기 시작했다 — **페이드가 돌기는 하는지 한 번도 안 재보고.** 그 추측이
      // 안개 정합이라는 틀린 진단으로 이어졌고 커밋했다가 되돌렸다.
      //
      // `pending` 이 이동 중에도 0 이면 페이드가 한 번도 안 걸린 것이고, 그러면
      // 화면 차이가 없는 것이 당연하다. **"효과가 없다" 와 "안 돈다" 는 다른 일이다.**
      fade: {
        pending: parcelFade?.pending ?? null,
        duration: lodFade,
        ease: lodEase,
        // 게이트가 닫혀 있으면 `sink` 가 즉시 확정한다 — 초기 충전 중 상태를 구별한다.
        gated: !(streaming?.ready ?? false),
      },
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
      // 조명 타깃도 씬에서 뺀다. 지금은 `startWorld2` 가 페이지당 한 번뿐이라 **도달하지
      // 않는 경로**지만(검수관 확인), 재기동이 생기는 날 타깃만 씬에 쌓인다.
      if (sun) scene.remove(sun.target);
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
