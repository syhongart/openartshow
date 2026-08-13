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
// ── base 결합은 여기 한 곳이다 ──────────────────────────────────────────────
// 계약의 `src` 는 `assets/models/…` 상대경로이고, 런타임 실제 경로는 `/app/assets/models/`,
// 저장소 안 위치는 `frontend/assets/models/` 다. 세 표기를 잇는 것은 아래 `assetUrl`
// 하나다 — 소비자가 늘 때마다 결합을 다시 적으면 값 미러링이 된다.

import type { Object3D } from 'three/webgpu';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';
import type { EditSession, LoadProgress, OverlayEntry, OverlayHost } from '../edit/types.js';
import { loadOverlay, type OverlayItem } from '../decide/overlay.js';
import { disableMatExtensions } from '../systems/glb-material.js';
import { readNum } from '../url-knob.js';
import { parcelOf } from '../decide/edit-pick.js';
import { surfaceY } from '../parts/surface.js';
import { DEFAULT_LAYOUT } from '../parts/types.js';

/** 배포된 배치 파일. 없거나 비어 있으면 아무것도 안 얹는다. */
const OVERLAY_JSON = 'assets/world2-overlay.json';

/** 팔레트에 뜰 모델 목록. `frontend/assets/models/index.json` 과 짝이다. */
const MODELS_JSON = 'assets/models/index.json';

/**
 * 한 프레임에 붙일 개수. `glb-city.ts` 의 `ATTACH_BATCH` 와 같은 근거다(한 프레임에 다
 * 붙이면 그 프레임이 통째로 멈춘다) — 값이 같은 것은 우연이고, 서로를 참조하지 않는다.
 */
const ATTACH_BATCH = 4;

/** 예열 프레임. `glb-city.ts` 의 `WARMUP_FRAMES` 와 같은 축이다(첫 렌더에 GPU 자원이 오른다). */
const WARMUP_FRAMES = 2;

function assetUrl(rel: string): string {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const root = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${root}/app/${rel}`;
}

interface Diag {
  state: 'idle' | 'loading' | 'ready' | 'failed';
  placed: number;
  /** 로드에 실패한 `src`. **못 세우고 통과시키지 않으려고 남긴다** */
  failed: string[];
  edit: boolean;
  error?: string;
}

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

/** 컬링을 잠시 끄고 몇 프레임 돌려 GPU 자원을 미리 올린다(`glb-city.ts` 와 같은 처방). */
async function warmUp(root: Object3D): Promise<void> {
  const touched: Object3D[] = [];
  try {
    root.traverse((o: Object3D) => { if (o.frustumCulled) { o.frustumCulled = false; touched.push(o); } });
    for (let i = 0; i < WARMUP_FRAMES; i++) await nextFrame();
  } finally {
    for (const o of touched) o.frustumCulled = true;
  }
}

export const overlayFeature: Feature = {
  name: 'overlay',

  create(env: FeatureEnv): FeatureInstance | null {
    const wantEdit = readNum('edit', 0, 0, 1) >= 1;
    // `?overlay=0` 으로 끈다. 편집 모드는 오버레이가 있어야 성립하므로 끄기가 안 먹는다.
    const wantOverlay = readNum('overlay', 1, 0, 1) >= 1;
    if (!wantEdit && !wantOverlay) return null;

    const diag: Diag = { state: 'idle', placed: 0, failed: [], edit: wantEdit };
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
          diag.failed.push(lastFail);
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
      await nextFrame();
      if (disposed) return entry;
      await warmUp(entry.holder);
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
      // `version` 을 상수로 적지 않고 계약이 만든 형태를 그대로 쓴다 — `emptyOverlay()`
      // 가 버전을 소유한다.
      //
      // ⚠ **동결 파셀은 이 기능이 들고 있지 않다** — 소유는 조립부(`env.village`)다.
      // 그래도 내보내기는 여기서 낸다: 계약 파일 하나에 `items` 와 `parcels` 가 함께
      // 담기므로, 저장소가 자기 몫만 따로 내면 두 조각을 합칠 자리가 또 생긴다.
      // 편집을 한 번도 안 했어도 **읽은 것이 그대로 나가야 한다**(왕복 무손실).
      return { version: loadOverlay(null).version, items, parcels: env.village.list() };
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
      entries: () => entries,
      place,
      lastFailure: () => lastFail,
      remove,
      apply: applyEntry,
      toRaw,
      look: (dx, dy) => env.player.look(dx, dy),
      surfaceAt(x, z) {
        const p = parcelOf(x, z, DEFAULT_LAYOUT.cellX, DEFAULT_LAYOUT.cellZ);
        return surfaceY(p.px, p.pz, p.lx, p.lz);
      },
    };

    void (async () => {
      try {
        diag.state = 'loading';
        // 배포된 배치 파일. 없으면(404) 빈 것으로 본다 — 배치가 아직 0개인 것이 정상이다.
        let raw: unknown = null;
        try {
          const res = await fetch(assetUrl(OVERLAY_JSON), { cache: 'no-cache' });
          if (res.ok) raw = await res.json();
        } catch { /* 파일이 없다 = 배치 0개 */ }
        if (disposed) return;

        const overlay = loadOverlay(raw);
        // ── 동결 파셀을 먼저 앉힌다 ──────────────────────────────────────────
        // GLB 배치(`items`)보다 **앞**인 이유: 이쪽은 프레임을 넘기지 않고 끝나는 반면
        // `place` 루프는 자산을 받느라 오래 걸린다. 뒤로 미루면 그동안 감독은 옛 마을을
        // 보게 되고, 다 받은 뒤에야 파셀이 통째로 다시 만들어진다.
        //
        // 비어 있으면 아무 일도 없다 — `setAll([])` 은 이전 동결이 없을 때 알림도 안 낸다.
        env.village.setAll(overlay.parcels);
        for (let i = 0; i < overlay.items.length; i++) {
          const it = overlay.items[i];
          await place(it.src, { x: it.x, y: it.y, z: it.z, ry: it.ry, s: it.s });
          if (disposed) return;
          if ((i + 1) % ATTACH_BATCH === 0) await nextFrame();
        }
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
        ...diag, failed: diag.failed.slice(0, 4), frozen: env.village.size(),
      }),
      // 배치 수가 곧 상태다. 0개도 유효한 그룹이라 `'0'` 을 낸다 — `null` 을 내면 이
      // 기능이 기본 켜짐인 탓에 드로우콜 축이 **영원히 판정 불가**가 된다(`glb-city`·
      // `npc` 가 그렇게 만들어 감독 리포트가 두 번 "측정 안 됨" 을 냈다).
      drawGroupKey: () => String(entries.length),
      dispose() {
        disposed = true;
        edit?.dispose();
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
