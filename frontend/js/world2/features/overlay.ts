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
  newDiag, recordFailure, beginAttach, type OverlayDiag,
} from '../decide/overlay-diag.js';
import { loadLedger, owners } from '../decide/village-ledger.js';
import {
  planMerge, totalItems, type MergePlan, type OverlayDoc,
} from '../decide/multi-overlay.js';
import { createStaticStore, loadLegacyOverlay } from '../store/static-store.js';
import { resolveEntry } from '../decide/tenant-entry.js';
import { mountTenantEntry, type TenantBar } from '../ui/tenant-bar.js';
import { mountArtworks, type ArtNode, type ArtworkScene } from '../systems/artwork-scene.js';
import { createArtsPort } from '../systems/art-port.js';
import { disableMatExtensions } from '../../world-shared/glb-material.js';
import {
  ATTACH_BATCH, attachAll, warmUpNode, type CullableNode,
} from '../../world-shared/attach-loop.js';
import { readNum } from '../url-knob.js';
import { parcelOf } from '../decide/edit-pick.js';
import { surfaceY } from '../parts/surface.js';
import { DEFAULT_LAYOUT } from '../parts/types.js';
// base 결합은 `asset-url.ts` **한 곳**이다. W7 에서 소비자가 둘이 되면서 모듈로 올렸다.
import { assetUrl } from '../asset-url.js';

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
    /**
     * 로드한 원본 모델. 같은 `src` 를 여러 번 놓아도 지오·재질을 공유한다.
     *
     * ⚠ **완료본이 아니라 «진행 중인 약속»을 담는다.** 완료본만 담으면 로드가 끝나기
     * 전에 같은 것을 또 부를 때 캐시가 비어 있어 **같은 파일을 처음부터 다시 받는다.**
     * 팔레트의 자산이 12.9MB 라 그것이 N벌 동시에 파싱되면 탭이 죽는다 — 감독 신고
     * (2026-08-12 *"지엘비 씬에 놓으려고 하면 멈춘다"*)의 직접 경로가 이것이었다.
     */
    const models = new Map<string, Promise<Object3D | null>>();
    /** `place` 가 마지막으로 `null` 을 낸 이유. 화면이 그것을 말한다 */
    let lastFail: string | null = null;
    /** 미리보기로 만든 임시 주소. 떠날 때 회수한다 */
    const blobUrls = new Set<string>();
    let root: Object3D | null = null;
    let THREE: ThreeGroupNS | null = null;
    let loadGLB: ((url: string, onProgress?: (ev: ProgressEvent) => void) => Promise<Object3D>) | null = null;
    let edit: EditSession | null = null;
    /** 진입 바(W8-3 S6). DOM 이 없거나 마크업이 없으면 `null` — 그래도 세계는 뜬다 */
    let tenantBar: TenantBar | null = null;
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
      if (!root) {
        const g = new (ns as unknown as ThreeGroupNS).Group();
        g.name = 'world2:overlay';
        env.scene.add(g as never);
        root = g as unknown as Object3D;
      }
    }

    function modelOf(key: string, url: string, onProgress?: LoadProgress): Promise<Object3D | null> {
      // **진행 중인 것도 돌려준다** — 이 한 줄이 중복 로드를 막는다(위 `models` 주석).
      const hit = models.get(key);
      if (hit) return hit;

      // ⚠ 아래에서 `.catch` 가 `models.delete(key)` 를 하는데 `models.set(key, p)` 는 그
      // **뒤에** 온다. 순서가 뒤집혀 «실패한 약속이 캐시에 영구히 남는» 것처럼 읽히지만
      // 그렇지 않다 — `loadGLB` 가 `async` 함수라 **동기적으로 reject 할 수 없고**,
      // `then`/`catch` 콜백은 언제나 마이크로태스크로 미뤄진다. 그래서 동기 실행인
      // `set` 이 항상 먼저다. (검수관이 이 지점을 블로커 후보로 짚었고 실측으로 기우로
      // 판정됐다 — 다음 사람이 같은 우려를 다시 하지 않게 적어 둔다.)

      const relay = onProgress
        ? (ev: ProgressEvent) => {
          // 총 용량을 서버가 안 주면(`lengthComputable === false`) **퍼센트를 지어내지
          // 않는다** — `null` 을 넘겨 받은 양만 말하게 한다.
          const total = ev.lengthComputable && ev.total > 0 ? ev.total : 0;
          onProgress(total > 0 ? (ev.loaded / total) * 100 : null, ev.loaded);
        }
        : undefined;

      const p = loadGLB!(url, relay)
        .then((m) => {
          // ⚠ **이 한 줄이 없으면 감독 실기기에서 화면이 멈춘다.**
          //
          // `three/webgpu` 는 `sheen`·`clearcoat`·`anisotropy`·`ior` 를 처리하다 렌더
          // 파이프라인 생성에 실패하고, 그러면 **그 뒤 모든 프레임이 통째로 무효**가 된다
          // (2026-08-12 감독 콘솔: `TSL.NormalNode: Vertex attribute "normal" not found` →
          // `[Invalid RenderPipeline "renderPipeline_m.DarkShine_*"]` 가 매 프레임).
          //
          // 이것은 새 발견이 아니다 — **감독이 2026-07-29 에 이미 판정한 것**이고
          // (`raw` 안 보임 / `noext` 보임), `glb-city` 는 그때 기본을 `noext` 로 옮겼다.
          // **오버레이만 그 처방을 안 받고 있었다.** 같은 자산(`lab-space.glb`)이 그 확장을
          // 전부 쓰는데도.
          //
          // 헤드리스는 WebGL 이라 이 축을 **원리적으로 못 본다.** 그래서 게이트가 아니라
          // *"GLB 를 놓는 경로는 반드시 이 함수를 지난다"* 는 구조가 유일한 방어다.
          disableMatExtensions(m);
          // GLB 의 `castShadow`/`receiveShadow` 기본값은 false 다 — 켜지 않으면 감독이 놓은
          // 물건만 그림자 없이 서 있게 된다(`glb-city.ts` 가 같은 자리에서 한 번 데였다).
          m.traverse((o: Object3D) => { o.castShadow = true; o.receiveShadow = true; });
          return m;
        })
        .catch((e: unknown) => {
          lastFail = `${key}: ${e instanceof Error ? e.message : String(e)}`;
          // ⚠ **상한이 있다**(2026-08-16, W8-2). 그전에는 무제한 `push` 였다 — 편집 세션에서
          // 같은 실패를 반복하면(네트워크가 나가면 놓을 때마다 난다) 이 배열만 계속 자란다.
          // 화면에 안 나오는 누수라 `info.memory` 축이 **원리적으로 못 잡는다.**
          //
          // 자르되 **몇 번이었는지는 센다** — 상한만 두면 「4번 실패」와 「400번 실패」가
          // 같은 값이 되고, 그것이야말로 진단이 필요한 순간에 진단을 잃는 것이다.
          recordFailure(diag, lastFail);
          // **실패는 캐시하지 않는다.** 남겨 두면 그 `src` 는 세션 내내 되살아나지
          // 못한다(일시적 네트워크 실패가 영구 실패가 된다).
          models.delete(key);
          return null;
        });

      models.set(key, p);
      return p;
    }

    function applyEntry(e: OverlayEntry): void {
      const h = e.holder as unknown as {
        position: Vec3Like; rotation: { y: number }; scale: { setScalar(s: number): void };
        updateMatrixWorld(f: boolean): void;
      };
      h.position.set(e.x, e.y, e.z);
      h.rotation.y = e.ry;
      h.scale.setScalar(e.s);
      // 부착을 프레임에 걸쳐 나누므로 렌더 직전 일괄 갱신과 어긋날 수 있다. 낡은 행렬은
      // 프러스텀 컬링을 **원점 기준**으로 판정하게 만든다(`glb-city.ts` 의 실측 근거).
      h.updateMatrixWorld(true);
    }

    async function place(
      src: string,
      at: { x: number; y: number; z: number; ry?: number; s?: number },
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
      lastFail = null;
      const model = await modelOf(key, blobUrl ?? assetUrl(src), onProgress);
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

    function toRaw(): unknown {
      const items: OverlayItem[] = entries.map((e) => ({
        src: e.src, x: e.x, y: e.y, z: e.z, ry: e.ry, s: e.s,
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
      // 조작 중 실시간 반영(W5 E2.5). **개수는 안 변한다** — 이미 점유한 슬롯의 행렬만
      // 다시 쓰는 함수 하나이고, `acquire`·`release` 는 안 넘어간다(팀장 판정 2026-08-13).
      retargetSlot: env.retargetSlot,
      entries: () => entries,
      place,
      lastFailure: () => lastFail,
      remove,
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
              it.src, { x: it.x, y: it.y, z: it.z, ry: it.ry, s: it.s }, undefined, undefined, false,
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
      // `frozen` 은 `diag` 에 넣지 않고 여기서 읽는다 — 저장소가 소유하는 값이라
      // 복사해 두면 갈라진다(편집이 저장소를 직접 고치므로 복사본은 즉시 낡는다).
      diagnostics: () => ({
        // `failed` 는 이미 `FAILED_KEEP` 상한이 걸려 있다 — 여기서 다시 자르지 않는다.
        // 그전에는 여기서만 `slice(0, 4)` 로 잘랐고, **배열 자체는 무제한으로 자랐다**
        // (화면에 보이는 것만 4개였을 뿐 누수는 그대로였다).
        ...diag, frozen: env.village.size(), art: artScene?.stats() ?? null, aim: edit?.aim() ?? null,
      }),
      // 배치 수가 곧 상태다. 0개도 유효한 그룹이라 `'0'` 을 낸다 — `null` 을 내면 이
      // 기능이 기본 켜짐인 탓에 드로우콜 축이 **영원히 판정 불가**가 된다(`glb-city`·
      // `npc` 가 그렇게 만들어 감독 리포트가 두 번 "측정 안 됨" 을 냈다).
      drawGroupKey: () => String(entries.length),
      dispose() {
        disposed = true;
        edit?.dispose();
        tenantBar?.dispose();
        artScene?.dispose();
        for (const u of blobUrls) { try { URL.revokeObjectURL(u); } catch { /* 이미 회수됨 */ } }
        blobUrls.clear();
        if (root) {
          (env.scene as unknown as { remove(o: never): void }).remove(root as never);
          root = null;
        }
        entries.length = 0;
        models.clear();
      },
    };
  },
};
