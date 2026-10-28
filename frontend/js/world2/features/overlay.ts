// world2/features/overlay.ts — **사용자 배치를 읽어 씬에 얹는다.** 계약은 `decide/overlay.ts`.
//
// ── 왜 가산 레이어인가 ──────────────────────────────────────────────────────
// 마을은 저장하지 않는다(`decide/parcel-layout.ts`: *"같은 (px,pz)는 언제나 같은 배치를
// 낸다"*). 사용자 배치는 본질적으로 "저장된 임의 배치" 라 정면 충돌한다. 그래서 기본
// 배치 계산에는 손대지 않고 **위에 얹기만** 한다 — 이 파일은 `parcel-layout` 도
// `parcel-builder` 도 부르지 않는다.
//
// ── 개수 불변식 ─────────────────────────────────────────────────────────────
// 부팅에 한 번 로드해 붙이고, 파셀 언로드에 따라 **생성·파괴하지 않는다.** 스트리밍에
// 묶으면 파셀을 드나들 때마다 지오·텍스처가 오르내려 [7] 게이트가 증식으로 읽는다.
// 배치 수가 곧 상수이므로 `drawGroupKey` 는 그 수를 낸다(0개면 `'0'`).
//
// ── `?edit=1` 없는 세션에 무엇이 도는가 — **"영향 0" 이 아니다** (검수관 P1) ──
// 정확히는 **편집 청크 영향 0** 이다. 이 기능 자체는 `?overlay=` 기본값 1 이라 기본
// 세션에서도 켜지고, `world2-overlay.json` fetch 가 **한 건 나간다.** 배치가 0개면
// 거기서 끝난다(GLTFLoader 도, `edit/mode.js` 도 안 받는다).
//
// 실측(2026-08-12, `vite preview` + 헤드리스): 기본 세션 응답 38건 · 4xx 0 · 콘솔 에러 0
// (`?overlay=0` 은 37건 — 차이 1건이 이 fetch 다). `?edit=1` 세션도 콘솔 에러 0.
//
// ⚠ **진단은 `window.__world2.stats().overlay` 에 있다** — `window.__world2.overlay` 가
// 아니다(`main.ts:1129` 의 `...collectDiagnostics(features)` 가 `stats()` 안에 있다).
// 이 자리를 틀리게 적어 위임 보낸 탓에 *"진단 미노출"* 이라는 거짓 FAIL 이 한 번 났다.
//
// ── base 결합은 `asset-url.ts` 한 곳이다 ────────────────────────────────────
// 계약의 `src` 는 `assets/models/…` 상대경로이고, 런타임 실제 경로는 `/app/assets/models/`,
// 저장소 안 위치는 `frontend/assets/models/` 다. 세 표기를 잇는 것은 `assetUrl` 하나다 —
// 소비자가 늘 때마다 결합을 다시 적으면 값 미러링이 된다.
//
// ⚠ 이 절은 오래 *"아래 `assetUrl` 하나다"* 라고 적혀 있었고 그 함수가 **이 파일 안에**
// 있었다. W7 에서 소비자가 실제로 늘어(표면 텍스처) 문장이 거짓이 될 참이었으므로,
// 주석을 고치는 대신 **함수를 모듈로 올려 문장을 참으로 유지했다**(`asset-url.ts`).

import type { Object3D } from 'three/webgpu';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';
import type { EditSession, LoadProgress, OverlayEntry, OverlayHost } from '../edit/types.js';
import { loadOverlay, type OverlayItem } from '../decide/overlay.js';
import {
  newDiag, beginAttach, type OverlayDiag,
} from '../decide/overlay-diag.js';
import { loadLedger, owners } from '../decide/village-ledger.js';
import {
  planMerge, totalItems, type MergePlan, type OverlayDoc,
} from '../decide/multi-overlay.js';
import { createStaticStore, loadLegacyOverlay } from '../store/static-store.js';
import { resolveEntry } from '../decide/tenant-entry.js';
import { mountTenantEntry, type TenantBar } from '../ui/tenant-bar.js';
import { mountVenuePrompt, type VenuePrompt } from '../ui/venue-prompt.js';
import { VENUE_NEAR_RADIUS, VENUE_FALLBACK_RADIUS, venueAnchorOf } from '../decide/venue-entry.js';
import { mountArtworks, type ArtNode, type ArtworkScene } from '../systems/artwork-mount.js';
import { createArtsPort } from '../systems/art-port.js';
import { createModelCache, type ModelCache } from './overlay-models.js';
import {
  ATTACH_BATCH, attachAll, warmUpNode, type CullableNode,
} from '../../world-shared/attach-loop.js';
import { readNum } from '../url-knob.js';
import { parcelOf } from '../decide/edit-pick.js';
import { surfaceY } from '../parts/surface.js';
import { DEFAULT_LAYOUT } from '../parts/types.js';
// base 결합은 `asset-url.ts` **한 곳**이다. W7 에서 소비자가 둘이 되면서 모듈로 올렸다.
import { assetUrl } from '../asset-url.js';
import { FLY_UP_CELLS, flyLiftMeters } from '../decide/fly.js';

// ⚠ 배치 파일 경로는 **`store/static-store.ts` 가 소유한다**(2026-08-16, W8-3 S5).
// 그전에는 여기 `OVERLAY_JSON` 상수가 있었고 이 파일이 직접 `fetch` 했다 — 저장 자리를
// 어댑터로 가두는 것이 감독 카드(「구조만 먼저」)의 요구라 옮겼다. 여기 남겨 두면
// **경로가 두 곳에 생기고**, 서버가 붙는 날 한쪽만 바뀐다.

/** 팔레트에 뜰 모델 목록. `frontend/assets/models/index.json` 과 짝이다. */
const MODELS_JSON = 'assets/models/index.json';

/**
 * 커밋된 텍스처 목록(W7). `scripts/gen-textures.mjs` 가 파일과 **함께** 굽고,
 * `tests/world2-textures.test.ts` 가 그 짝을 검사한다 — 손으로 관리하면 어긋나고,
 * 증상은 「목록에 있는데 404」 라 원인이 목록이라는 것이 화면에 안 보인다.
 */
const TEXTURES_JSON = 'assets/textures/index.json';

// ⚠ `ATTACH_BATCH`·`WARMUP_FRAMES` 는 **`world-shared/attach-loop.ts` 가 소유한다**
// (2026-08-16, W8-2). 그전에는 여기와 `glb-city.ts` 에 각각 있었고 주석이
// *"값이 같은 것은 우연이고, 서로를 참조하지 않는다"* 라고 적고 있었다 — 백로그 #38 이
// 「공유 상수 승격 검토」로 그 자리를 이미 지목했다. **glb-city 도 같은 커밋에서 이관했다.**
//
// ⚠⚠ 이 괄호는 원래 *"glb-city 쪽 이관은 아직이다 — 별도 회차"* 라고 적혀 있었고
// **거짓이었다**(같은 커밋에서 그 이관을 했다). 나는 이관을 계획하며 이 문장을 먼저 썼고,
// 실제로 옮긴 뒤 문장을 안 고쳤다. 다음 사람이 이것을 읽으면 **이미 된 일을 또 하려 든다.**
//
// 진단(`Diag`·`FAILED_KEEP`·실패 기록)은 `../decide/overlay-diag.ts` 가 소유한다 —
// 왜 순수 모듈로 뗐는지는 **그 파일 헤더 한 곳**이다(뮤테이션이 시켰다).

type Vec3Like = { set(x: number, y: number, z: number): void };
type ThreeGroupNS = {
  Group: new () => Object3D & { position: Vec3Like; rotation: { y: number }; scale: { setScalar(s: number): void } };
  Box3: new () => { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number }; setFromObject(o: never): unknown };
};

function nextFrame(): Promise<void> {
  return new Promise((res) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => res());
    else setTimeout(res, 0);
  });
}

/** 컬링을 잠시 끄고 몇 프레임 돌려 GPU 자원을 미리 올린다. 구현은 공유 모듈이 소유한다. */
async function warmUp(root: Object3D): Promise<void> {
  await warmUpNode(root as unknown as CullableNode, nextFrame);
}

export const overlayFeature: Feature = {
  name: 'overlay',

  create(env: FeatureEnv): FeatureInstance | null {
    const wantEdit = readNum('edit', 0, 0, 1) >= 1;
    // `?overlay=0` 으로 끈다. 편집 모드는 오버레이가 있어야 성립하므로 끄기가 안 먹는다.
    const wantOverlay = readNum('overlay', 1, 0, 1) >= 1;
    if (!wantEdit && !wantOverlay) return null;

    const diag: OverlayDiag = newDiag(wantEdit);
    // ⚠ 지금은 배포 저장소 고정이다. 주입 자리는 S6(진입)에서 연다 — 여기서 미리 넓히면
    // 쓰는 사람이 없는 노브가 생기고, 그것은 「지금 안 쓰는 것을 미리 공유」다.
    const store = createStaticStore();
    const entries: OverlayEntry[] = [];
    /** GLB 원본 캐시. 로더가 준비된 뒤 `ensureLoader` 가 만든다 */
    let cache: ModelCache | null = null;
    /** 미리보기로 만든 임시 주소. 떠날 때 회수한다 */
    const blobUrls = new Set<string>();
    let root: Object3D | null = null;
    let THREE: ThreeGroupNS | null = null;
    let loadGLB: ((url: string, onProgress?: (ev: ProgressEvent) => void) => Promise<Object3D>) | null = null;
    let edit: EditSession | null = null;
    /** 진입 바(W8-3 S6). DOM 이 없거나 마크업이 없으면 `null` — 그래도 세계는 뜬다 */
    let tenantBar: TenantBar | null = null;
    let venuePrompt: VenuePrompt | null = null;
    // 들어갈 전시장 id. `galleries/index.json` 이 SSOT 라 런타임에 읽는다(값 미러링 0).
    let venueGallery: string | null = null;
    /** 액자·조명(W8-4). 작품이 0개여도 만든다 — 라이트 풀이 **부팅에** 서야 하기 때문이다 */
    let artScene: ArtworkScene | null = null;
    // 걸린 작품. **소유는 포트가 갖는다** — `toRaw` 도 편집도 같은 목록을 본다(D2).
    const arts = createArtsPort(assetUrl);
    let nextId = 1;
    let disposed = false;

    /** three·GLTFLoader 를 처음 필요할 때만 내려받는다. 배치가 0개면 안 받는다. */
    async function ensureLoader(): Promise<void> {
      if (THREE && loadGLB) return;
      const [{ GLTFLoader }, ns] = await Promise.all([
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/webgpu'),
      ]);
      THREE = ns as unknown as ThreeGroupNS;
      const loader = new GLTFLoader();
      // `loadAsync(url, onProgress)` — three 의 `Loader.loadAsync` 가 2번째 인자를 그대로
      // `load()` 의 진행 콜백으로 넘긴다(r171 `src/loaders/Loader.js:19-25` 실측).
      loadGLB = async (url: string, onProgress?: (ev: ProgressEvent) => void) =>
        (await loader.loadAsync(url, onProgress)).scene as unknown as Object3D;
      // 캐시는 로더가 서고 나서야 뜻이 있다 — 그전에 만들면 「받을 수 없는 캐시」다.
      //
      // 🔴 **`if (!cache)` 가 필수다**(검수관 권고 P1, 2026-08-22). 위 `if (THREE && loadGLB)`
      // 가드는 **첫 `import()` 를 동시에 기다리는 두 호출을 못 막는다** — 둘 다 통과해
      // 여기 오면 나중 것이 캐시를 **새 빈 것으로 덮고**, 그 순간 「진행 중인 약속을
      // 담는다」는 중복 로드 방지가 무효가 된다(12.9MB 자산이 N벌 파싱되는 그 경로 —
      // 감독 신고 2026-08-12). 분리 전에는 `models` 가 클로저 최상단의 단일 Map 이라
      // 이 창이 아예 없었다. **분리가 연 창이므로 분리한 자리에서 닫는다.**
      if (!cache) cache = createModelCache(diag, loadGLB);
      if (!root) {
        const g = new (ns as unknown as ThreeGroupNS).Group();
        g.name = 'world2:overlay';
        env.scene.add(g as never);
        root = g as unknown as Object3D;
      }
    }

    function applyEntry(e: OverlayEntry): void {
      const h = e.holder as unknown as {
        position: Vec3Like; rotation: { y: number };
        scale: { setScalar(s: number): void; set(x: number, y: number, z: number): void };
        updateMatrixWorld(f: boolean): void;
      };
      h.position.set(e.x, e.y, e.z);
      h.rotation.y = e.ry;
      // 🔴 **축별 배수를 곱한다**(감독 카드 판정 2026-08-22). ⚠ 이 한 줄이 **판정과 화면을
      // 잇는 유일한 지점**이다 — 계약에 `sx?` 를 더하고 기즈모에 상자를 달아도 여기가
      // `setScalar(e.s)` 면 **아무것도 안 움직인다**(구름 `alpha` 미소비와 같은 형태).
      h.scale.set(e.s * (e.sx ?? 1), e.s * (e.sy ?? 1), e.s * (e.sz ?? 1));
      // 부착을 프레임에 걸쳐 나누므로 렌더 직전 일괄 갱신과 어긋날 수 있다. 낡은 행렬은
      // 프러스텀 컬링을 **원점 기준**으로 판정하게 만든다(`glb-city.ts` 의 실측 근거).
      h.updateMatrixWorld(true);
    }

    async function place(
      src: string,
      // ⚠ 축별도 받는다(생략 = 기존 동작). 안 열면 저장된 값이 씬에 안 실린다.
      at: { x: number; y: number; z: number; ry?: number; s?: number;
        sx?: number; sy?: number; sz?: number },
      blobUrl?: string,
      onProgress?: LoadProgress,
      /**
       * 붙인 직후 **이 항목만** 예열할 것인가. 기본은 예열한다(= 편집 경로).
       *
       * ⚠ **부팅 루프는 `false` 를 넘긴다.** 그쪽은 배치마다 프레임을 넘기고 **끝에서
       * 한 번** `warmUp(root)` 하므로, 항목마다 또 하면 프레임이 **3배**가 된다
       * (`3.25N` vs `0.25N` — 근거·수치는 `world-shared/attach-loop.ts` 헤더 한 곳).
       *
       * 이 인자가 없던 동안 **부팅이 편집용 비용을 그대로 물고 있었다.** 아래 예열
       * 주석은 그 사실을 모른 채 *"편집 중 한 개씩 놓는 경로는 그 루프를 안 탄다"* 만
       * 적고 있었다 — 참이지만 **역은 아니었다**(부팅은 이 함수를 탄다).
       */
      warm = true,
    ): Promise<OverlayEntry | null> {
      await ensureLoader();
      if (disposed || !THREE || !root) return null;
      const key = blobUrl ?? src;
      cache?.clearFailure();
      const model = await cache?.get(key, blobUrl ?? assetUrl(src), onProgress);
      if (!model || disposed) return null;

      // 피벗 보정 — 자산마다 로컬 원점이 제각각이라 상수로 적으면 자산 교체에 낡는다.
      // 바닥을 y=0 에, XZ 중심을 원점에 맞춘다.
      const box = new THREE.Box3();
      box.setFromObject(model as never);
      const fix = box.min.x === Infinity
        ? { x: 0, y: 0, z: 0 }
        : { x: -(box.min.x + box.max.x) / 2, y: -box.min.y, z: -(box.min.z + box.max.z) / 2 };

      const holder = new THREE.Group();
      const copy = (model as unknown as { clone(deep: boolean): Object3D }).clone(true);
      (copy as unknown as { position: Vec3Like }).position.set(fix.x, fix.y, fix.z);
      (holder as unknown as { add(o: never): void }).add(copy as never);
      (root as unknown as { add(o: never): void }).add(holder as never);

      const entry: OverlayEntry = {
        id: nextId++,
        src,
        preview: blobUrl !== undefined,
        holder: holder as unknown as Object3D,
        x: at.x, y: at.y, z: at.z, ry: at.ry ?? 0, s: at.s ?? 1,
        // 생략은 생략으로 — 계약과 같은 규칙이라 안 만진 항목에 키가 안 붙는다.
        ...(at.sx === undefined ? {} : { sx: at.sx }),
        ...(at.sy === undefined ? {} : { sy: at.sy }),
        ...(at.sz === undefined ? {} : { sz: at.sz }),
      };
      applyEntry(entry);
      entries.push(entry);
      diag.placed = entries.length;

      // ── 붙인 직후가 가장 위험한 프레임이다 ────────────────────────────────
      // 부팅 루프는 `ATTACH_BATCH` 마다 프레임을 넘기고 끝에서 한 번 예열한다(아래).
      // 그런데 **편집 중 한 개씩 놓는 경로는 그 루프를 안 탄다** — 붙이자마자 첫 렌더가
      // 오고, 거기서 지오·텍스처·파이프라인이 한꺼번에 GPU 에 올라간다. `glb-city.ts` 가
      // 같은 자산으로 **감독 실기기 1,072ms 히칭**을 실측해 프레임 분할을 넣은 그 구간인데
      // 이쪽에만 빠져 있었다(감독 신고 2026-08-12).
      //
      // `root` 전체가 아니라 **새로 붙은 holder 만** 연다 — 예열 창(부팅)은 이미 지났고,
      // 이미 놓인 것까지 다시 열면 그것들의 컬링이 매번 흔들린다. `npc.ts` 의
      // *"VRM 은 비동기라 예열 창을 이미 지났을 수 있다 — 합류하는 체만 다시 연다"* 와
      // 같은 처방이다.
      if (warm) {
        await nextFrame();
        if (disposed) return entry;
        await warmUp(entry.holder);
      }
      return entry;
    }

    function remove(e: OverlayEntry): void {
      const i = entries.indexOf(e);
      if (i < 0) return;
      entries.splice(i, 1);
      (root as unknown as { remove(o: never): void } | null)?.remove(e.holder as never);
      diag.placed = entries.length;
    }

    /** 지운 것을 되살린다(2026-08-22). 계약·근거는 `edit/types.ts` 의 `restore` 한 곳이다 */
    function restore(e: OverlayEntry, at?: number): boolean {
      if (disposed || !root || entries.indexOf(e) >= 0) return false;
      entries.splice(at ?? entries.length, 0, e);
      (root as unknown as { add(o: never): void }).add(e.holder as never);
      // 자세까지 되돌린 뒤 되살릴 수 있다 — 안 부르면 씬 행렬이 지우기 전 것이다.
      applyEntry(e);
      diag.placed = entries.length;
      return true;
    }

    function toRaw(): unknown {
      const items: OverlayItem[] = entries.map((e) => ({
        src: e.src, x: e.x, y: e.y, z: e.z, ry: e.ry, s: e.s,
        // 🔴 **빠지면 조정한 축별 크기가 저장할 때 사라진다.** 이 함수가 그 사고를 이미
        // 겪었다(아래 `arts` 누락 D1.5 — 그때 검증은 「무손실」이라 했다). 옵션 필드라
        // 안 담아도 검증이 조용한 것까지 같은 형태다.
        ...(e.sx === undefined ? {} : { sx: e.sx }),
        ...(e.sy === undefined ? {} : { sy: e.sy }),
        ...(e.sz === undefined ? {} : { sz: e.sz }),
      }));
      // ⚠ 동결 파셀·표면·작품은 이 기능이 **안 들고 있다**(소유는 조립부와 `plan`). 그래도
      // 전부 여기서 낸다 — 계약 파일 **하나**에 담기므로 각자 내면 합칠 자리가 또 생긴다.
      // 🔴 `arts` 가 **빠져 있었다**(D1.5). 편집·내보내기로 사라졌는데 `validateOverlay` 가
      // `undefined` 를 issue 없이 `[]` 로 채워 **`clean===true`·「무손실」**이었다.
      return {
        version: loadOverlay(null).version,
        items,
        parcels: env.village.list(),
        surfaces: env.surfaces(),
        arts: arts.list(),
      };
    }

    const host: OverlayHost = {
      get THREE() { return THREE; },
      camera: env.camera,
      canvas: (env.adapter.renderer?.domElement ?? null) as HTMLElement,
      doc: env.doc as Document,
      cellX: DEFAULT_LAYOUT.cellX,
      cellZ: DEFAULT_LAYOUT.cellZ,
      get root() { return root as Object3D; },
      // 마을 파츠를 집는 두 문. `InstancePools`·`VillageParcels` 가 **구조적으로** 좁은
      // 인터페이스를 만족하므로 어댑터가 필요 없다 — 그 좁힘의 값은 편집이 풀 전체를
      // 만질 수 없다는 것이지 여기서 변환하는 데 있지 않다.
      instances: env.pools,
      village: env.village,
      // 🔴 미술관 벽 (태스크 #112). **매번 다시 묻는다** — 자산이 13.5MB 라 로드가
      // 비동기여서 편집을 켠 시점과 미술관이 선 시점의 선후가 정해져 있지 않다.
      // 한 번 읽어 캐시하면 «먼저 켠 세션에서만 안 걸린다» 가 되고, 그것은 재현 조건이
      // 타이밍이라 화면에서 «가끔 안 된다» 로만 보인다.
      get glbCity() { return env.glbCityRoot?.() ?? null; },
      // 조작 중 실시간 반영(W5 E2.5). **개수는 안 변한다** — 이미 점유한 슬롯의 행렬만
      // 다시 쓰는 함수 하나이고, `acquire`·`release` 는 안 넘어간다(팀장 판정 2026-08-13).
      retargetSlot: env.retargetSlot,
      setTouchEditing: env.setTouchEditing,
      entries: () => entries,
      place,
      lastFailure: () => cache?.lastFailure() ?? null,
      remove,
      restore,
      apply: applyEntry,
      toRaw,
      look: (dx, dy) => env.player.look(dx, dy),
      // 궤도 시점(W5 E3). `look` 과 나란히 **위임만** 한다 — 산술은 `PlayerSystem` 이
      // 소유하고 이 기능은 통로다(팀장 판정 (A-2)).
      orbit: (cx, cy, cz, dYaw, dHeight, kRadius) => {
        env.player.orbit(cx, cy, cz, dYaw, dHeight, kRadius);
      },
      orbitTo: (cx, cy, cz, preset) => { env.player.orbitTo(cx, cy, cz, preset); },
      endOrbit: () => { env.player.endOrbit(); },
      // 비행(2026-08-19). 궤도와 **같은 통로**이고, 상한만 여기서 미터로 바꿔 넘긴다 —
      // `PlayerSystem` 은 셀 크기를 모르고(`RESTORE_STEP` 주석의 규율), `decide/fly.ts` 는
      // 셀로만 말한다. **그 경계가 여기다.** `flyLiftMeters` 를 쓰는 이유는 그 함수
      // 주석 한 곳에 있다(셀을 미터 자리에 넣으면 2.4m 천장이 되고 아무 검사도 안 깨진다).
      fly: (input, dt) => {
        env.player.flyBy(input, dt, flyLiftMeters(FLY_UP_CELLS, DEFAULT_LAYOUT.cellX));
      },
      // 셰이딩(W6). 여기도 **위임만** 한다 — 상태는 조립부가 소유하고(`FeatureEnv.shading`)
      // 집행은 `features/shading.ts` 다. 이 기능은 편집이 그 문에 닿는 통로일 뿐이라,
      // 오버레이를 빼도 URL 노브는 그대로 산다.
      shading: () => env.shading(),
      setShading: (m) => { env.setShading(m); },
      // 표면 재질(W7). 셰이딩과 **같은 이유로 위임만** 한다 — 목록의 소유는 조립부이고
      // 집행은 `features/surface-paint.ts` 다. 이 기능은 편집이 그 문에 닿는 통로다.
      surfaces: () => env.surfaces(),
      setSurfaces: (s) => { env.setSurfaces(s); },
      // 떨어뜨린 이미지를 그 `src` 자리에서 즉시 보여지게 한다. **회수는 여기 한 곳**이다 —
      // GLB 미리보기가 이미 `blobUrls` 로 모아 떠날 때 지우고 있어서, 표면 텍스처를 위해
      // 또 모으면 회수 경로가 두 벌이 된다.
      // ── 커밋된 텍스처 목록 ─────────────────────────────────────────────
      // **실패해도 조용하다** — 파일이 아직 0장인 것이 정상 상태이고, 그때 경고를 띄우면
      // 정상이 오류로 보인다(패널이 빈 목록으로 그냥 산다).
      listTextures: async () => {
        const res = await fetch(assetUrl(TEXTURES_JSON), { cache: 'no-cache' });
        if (!res.ok) return [];
        const raw = (await res.json()) as { textures?: unknown };
        return Array.isArray(raw.textures) ? raw.textures.filter((t) => typeof t === 'string') : [];
      },
      registerPreview: (src: string, file: File) => {
        const url = URL.createObjectURL(file);
        blobUrls.add(url);
        env.setTexturePreview(src, url);
      },
      surfaceAt(x, z) {
        const p = parcelOf(x, z, DEFAULT_LAYOUT.cellX, DEFAULT_LAYOUT.cellZ);
        return surfaceY(p.px, p.pz, p.lx, p.lz);
      },
    };

    void (async () => {
      try {
        // `diag.state` 는 이미 `'loading'` 이다(초기값). 여기서 다시 쓰지 않는다 —
        // 같은 값을 두 곳에 적으면 한쪽만 고쳐도 아무도 모른다.
        //
        // ── 대장이 있으면 여러 작가, 없으면 옛 단일 문서 (2026-08-16, W8-3 S5) ──
        // **하위호환이 이 분기의 전부다.** 대장·작가 문서가 하나도 배포되지 않은 상태에서
        // 세계가 **지금과 똑같이 떠야 한다** — 그 보장이 없으면 이 회차는 라이브 회귀다.
        const ledgerRaw = await store.loadLedger();
        if (disposed) return;
        const { ledger, issues: ledgerIssues } = loadLedger(ledgerRaw.raw);
        diag.ledgerIssues = ledgerIssues.length;

        // ── 누구의 땅을 보는가 + 진입 바 (2026-08-16, W8-3 S6) ──────────────
        // 감독 카드: 진입은 **둘 다** — 주소(`?u=`)에 있으면 그것, 없으면 마을 전체이고
        // 입력 창으로 옮겨 간다. 판정·문구·주소 조립은 `decide/tenant-entry.ts` 와
        // `ui/tenant-bar.ts` 가 소유한다 — 여기 두면 **노드가 못 도는 자리**에 분기가 생기고
        // 안 도는 코드는 검사되지 않는다. 진입 바가 부착 루프 **앞**인 이유는 그 파일들 헤더.
        const ent = resolveEntry(env.doc?.defaultView?.location?.search ?? '', owners(ledger));
        diag.tenant = ent.tenant;
        if (ent.tenantError) diag.tenantError = ent.tenantError;
        if (ent.tenantMissing) diag.tenantMissing = true;
        if (env.doc) tenantBar = mountTenantEntry(env.doc, ent);
        // 🔴 전시장 진입 안내 (감독 판정 2026-08-22 「들어가면 씬 전환」).
        // 위치·건물을 **게터로** 넘긴다 — 미술관은 13.5MB 비동기라 마운트 시점에 아직
        // 없을 수 있고(`glbCity` 게터가 같은 이유를 적고 있다), 관람객은 계속 움직인다.
        // 건물 위치는 `Object3D.position` 만 읽는다 — 여기에는 three import 가 없어
        // `Box3` 를 못 만들고, 좁은 구조적 타입으로 읽는 것이 `glbCityRoot` 와 같은 방식이다.
        if (env.doc) venuePrompt = mountVenuePrompt(env.doc, {
          tenant: () => venueGallery,
          player: () => env.player?.position ?? null,
          // 진입 지점 유도는 `decide/venue-anchor` 소관이다 — 여기(three import 있음)에
          // 두면 노드가 못 돌려 영영 검사되지 않는다. 감독 판정(문 앞 3m)은 건물 중심에서
          // 재면 성립하지 않으므로(중심 3m 는 건물 내부다) 문 노드를 기준으로 쓴다.
          venue: () => venueAnchorOf(env.glbCityRoot?.(), VENUE_NEAR_RADIUS, VENUE_FALLBACK_RADIUS),
        });
        // 갤러리 목록을 읽어 들어갈 전시장을 정한다. `?u=` 가 그 목록에 있으면 그것,
        // 없으면 첫 전시. **`?u=` 를 요구하지 않는다** — 건물 앞이면 들어가진다(감독 지적).
        // 실패해도 조용하다: 안내가 안 뜰 뿐이고 `diagnostics().venue` 로 이유가 갈린다.
        void (async () => {
          try {
            const res = await fetch('./galleries/index.json');
            if (!res.ok) return;
            const list: unknown = await res.json();
            if (!Array.isArray(list)) return;
            const ids = list.map((g) => (g && typeof g === 'object' ? (g as { id?: unknown }).id : null))
              .filter((v): v is string => typeof v === 'string' && v !== '');
            if (!ids.length) return;
            venueGallery = (ent.tenant && ids.includes(ent.tenant)) ? ent.tenant : ids[0];
          } catch { /* 목록을 못 읽으면 안내를 띄우지 않는다 */ }
        })();
        const who = ent.who;

        let plan: MergePlan;
        if (who.length === 0) {
          // 대장이 없다(또는 배정 0). **옛 경로 그대로** — 단일 문서를 마을 전체로 본다.
          const legacy = await loadLegacyOverlay();
          if (disposed) return;
          const one = loadOverlay(legacy.raw);
          plan = {
            groups: [{ owner: '', items: one.items }],
            parcels: one.parcels, arts: one.arts, issues: [],
          };
          // ⚠ 옛 경로에서는 **`surfaces` 를 그대로 쓴다** — 그것이 지금 라이브 동작이고,
          // 마을 운영자(감독)의 단일 문서이기 때문이다. 여러 작가일 때만 무시한다.
          env.setSurfaces(one.surfaces);
        } else {
          // ⚠ **문서를 하나씩 받는다.** `Promise.all` 로 묶으면 한 요청의 예외가 전부를
          // reject 하고, 그것이 팀장이 병합 조건으로 건 **실패 격리**를 깬다.
          const docs: OverlayDoc[] = [];
          for (const owner of who) {
            const got = await store.loadOverlay(owner);
            if (disposed) return;
            docs.push({ owner, raw: got.raw, failure: got.failure });
          }
          plan = planMerge(ledger, docs);
          // 여러 작가일 때 표면 재질은 **마을 것**이다(감독 카드) — 작가 문서의 것은
          // `planMerge` 가 무시하고 사유를 냈다. 마을 기본값을 그대로 둔다.
        }
        diag.owners = plan.groups.length;
        diag.mergeIssues = plan.issues.length;

        // **놓기 전에 몇 개를 놓을지부터 적는다.** 뒤에 적으면 `state='ready'` 와 `want`
        // 사이에 창이 생겨, 그 창에서 관측한 스모크가 `placed >= want` 를 거짓 통과시킨다.
        // (편집 세션에서 더 놓으면 `placed > want` 가 되는데 그것은 정상이다 — 이 값이
        //  뜻하는 것은 **부팅이 놓으려던 개수**이고, 판정은 `placed < want` 한 방향뿐이다.)
        beginAttach(diag, totalItems(plan));
        // ── 동결 파셀을 먼저 앉힌다 ──────────────────────────────────────────
        // GLB 배치(`items`)보다 **앞**인 이유: 이쪽은 프레임을 넘기지 않고 끝나는 반면
        // `place` 루프는 자산을 받느라 오래 걸린다. 뒤로 미루면 그동안 감독은 옛 마을을
        // 보게 되고, 다 받은 뒤에야 파셀이 통째로 다시 만들어진다.
        //
        // ⚠ **한 번만 부른다.** `setAll` 이 `index.clear()` 로 시작하므로(실측
        // `village-parcels.ts:169-181`) 작가마다 부르면 **마지막 것만 남고**, 증상은
        // «다른 작가 파셀이 안 보인다» 로만 난다. `planMerge` 가 이미 합쳐 뒀다.
        env.village.setAll(plan.parcels);
        // ⚠ **부팅은 항목마다 예열하지 않는다**(`warm = false`) — 배치마다 프레임을
        // 넘기고 **끝에서 한 번** `warmUp(root)` 한다. 그전에는 `place()` 안의 3프레임을
        // 부팅도 물어 `frames(N) = 3.25N + 2` 였다(N=100 → 327프레임). 지금은 `0.25N + 2`.
        // 루프 자체는 `world-shared/attach-loop.ts` 가 소유한다 — **순수 함수라 테스트가
        // 프레임 넘김 횟수를 직접 센다**(그전에는 이 축을 재는 것이 0개였다).
        //
        // 그룹을 **이어서** 돈다(하나의 `attachAll` 이 아니라 작가마다) — 그래야 한 작가의
        // 배치가 실패해도 다음 작가가 계속된다. 배치 예산은 그룹마다 새로 세지만, 프레임
        // 넘김 총량은 `⌊N/4⌋` 근처로 같다(그룹 경계에서만 몇 프레임 더 든다).
        for (const group of plan.groups) {
          await attachAll({
            items: group.items,
            place: (it: OverlayItem) => place(
              it.src,
              { x: it.x, y: it.y, z: it.z, ry: it.ry, s: it.s, sx: it.sx, sy: it.sy, sz: it.sz },
              undefined, undefined, false,
            ),
            nextFrame,
            aborted: () => disposed,
            batch: ATTACH_BATCH,
          });
          if (disposed) return;
        }
        // ── 벽에 건 작품 (W8-4) — 라이트 풀은 한 번에 서고 안 변한다(조건 1) ──
        // ⚠ **편집 세션은 작품 0개여도 씬을 세운다**(D2). 검수관 B3-2 가 실측한 구멍이 여기다:
        // `arts` 0 · GLB 0 이면 `ensureLoader()` 미호출 → `THREE` null → 씬이 없고, 그러면
        // **편집에서 건 작품이 화면에 안 뜬다.** 라이브(비편집)의 개수는 그대로다.
        if (plan.arts.length > 0 || wantEdit) await ensureLoader();
        if (disposed) return;
        if (THREE) {
          artScene = mountArtworks(THREE, env.scene as unknown as ArtNode, DEFAULT_LAYOUT, arts.resolve, undefined, wantEdit ? undefined : plan.arts);
          arts.attach(artScene);
        }
        await arts.set(plan.arts);

        if (root) await warmUp(root);
        if (disposed) return;
        diag.state = 'ready';

        if (wantEdit && env.doc) {
          // ⚠ **정적 import 로 바꾸지 마라.** `?edit=1` 없는 세션은 이 청크를 내려받지
          //   않는다 — 그것이 라이브 격리의 전부다. `tests/world2-overlay-wiring.test.ts`
          //   가 이 파일에 편집 모듈 정적 import 가 없음을 검사한다.
          const mod = await import('../edit/mode.js');
          if (disposed) return;
          // 편집은 로더가 있어야 물건을 놓을 수 있다. 배치가 0개면 아직 안 받았다.
          await ensureLoader();
          if (disposed) return;
          edit = mod.startEditMode(host, {
            modelsUrl: assetUrl(MODELS_JSON),
            onBlobUrl: (u: string) => blobUrls.add(u),
            arts,
          });
        }
      } catch (e) {
        diag.state = 'failed';
        diag.error = e instanceof Error ? e.message : String(e);
        // ⚠ **콘솔에도 낸다 — 이 한 줄이 게이트의 눈이다** (검수관 블로커, 2026-08-13).
        //
        // 이 `catch` 는 오버레이 로드부터 `startEditMode()` 까지를 통째로 감싼다. 즉
        // 편집 패널·기즈모·피커·액션·입력·팔레트 초기화 중 **어디서 던져도** 여기로 온다.
        // 그런데 `diag` 는 `window.__world2.stats().overlay` 로만 노출되고, 스모크의
        // `collectPage` 는 그 필드를 **한 번도 안 읽는다** — 콘솔과 pageerror 만 본다.
        //
        // 그래서 이 줄이 없으면 «편집 화면이 통째로 안 뜨는데 게이트는 초록» 이 성립한다.
        // `?edit=1` 을 스모크에 넣은 바로 그 회차에 검수관이 이 사각을 짚었다 —
        // 주석으로 «못 잡는다» 를 적는 대신 **잡게 만드는** 쪽을 골랐다.
        //
        // ⚠ 부작용을 알고 넣는다: 이제 이 경로의 실패가 **스모크를 빨간불로 만든다.**
        // 그것이 목적이다. 조용히 실패하던 것이 있었다면 지금 드러난다.
        console.error('[world2:overlay] 오버레이/편집 초기화 실패', e);
      }
    })();

    return {
      // ── 액자를 건물과 함께 재운다 (W8-9) ──────────────────────────────────
      // 감독 지시 2026-08-18 *"멀리떨어졌을때 건물이 사라질때 같이 사라지고 나왔으면해"*.
      //
      // ⚠ **이 기능에 `system` 이 생긴 것이 이번 변경의 핵심 배선이다** — 그전까지
      // 오버레이는 커널 `update` 를 아예 안 받았고, 그래서 «프레임마다 무엇을 본다» 는
      // 자리가 존재하지 않았다. 거리 판정은 여기 없다: `env.parcelLoaded` 가 스트리밍의
      // 답을 그대로 나른다(근거는 `features/types.ts` 의 그 필드 한 곳).
      system: {
        name: 'overlayArt',
        update: (ctx) => artScene?.update(env.parcelLoaded, ctx.dt),
      },
      // `frozen` 은 `diag` 에 넣지 않고 여기서 읽는다 — 저장소가 소유하는 값이라
      // 복사해 두면 갈라진다(편집이 저장소를 직접 고치므로 복사본은 즉시 낡는다).
      diagnostics: () => ({
        // `failed` 는 이미 `FAILED_KEEP` 상한이 걸려 있다 — 여기서 다시 자르지 않는다.
        // 그전에는 여기서만 `slice(0, 4)` 로 잘랐고, **배열 자체는 무제한으로 자랐다**
        // (화면에 보이는 것만 4개였을 뿐 누수는 그대로였다).
        ...diag, frozen: env.village.size(), art: artScene?.stats() ?? null, aim: edit?.aim() ?? null,
        // 진입 안내가 안 뜰 때 이유를 가른다 — 화면에서는 네 경우가 똑같이 「없다」로 보인다.
        venue: venuePrompt?.view ?? null,
      }),
      // 배치 수가 곧 상태다. 0개도 유효한 그룹이라 `'0'` 을 낸다 — `null` 을 내면 이
      // 기능이 기본 켜짐인 탓에 드로우콜 축이 **영원히 판정 불가**가 된다(`glb-city`·
      // `npc` 가 그렇게 만들어 감독 리포트가 두 번 "측정 안 됨" 을 냈다).
      drawGroupKey: () => String(entries.length),
      dispose() {
        disposed = true;
        edit?.dispose();
        tenantBar?.dispose();
        venuePrompt?.dispose();
        artScene?.dispose();
        for (const u of blobUrls) { try { URL.revokeObjectURL(u); } catch { /* 이미 회수됨 */ } }
        blobUrls.clear();
        if (root) {
          (env.scene as unknown as { remove(o: never): void }).remove(root as never);
          root = null;
        }
        entries.length = 0;
        cache?.clear();
      },
    };
  },
};
