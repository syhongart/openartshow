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
import type { EditSession, OverlayEntry, OverlayHost } from '../edit/types.js';
import { loadOverlay, type OverlayItem } from '../decide/overlay.js';
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
    /** 로드한 원본 모델. 같은 `src` 를 여러 번 놓아도 지오·재질을 공유한다 */
    const models = new Map<string, Object3D>();
    /** 미리보기로 만든 임시 주소. 떠날 때 회수한다 */
    const blobUrls = new Set<string>();
    let root: Object3D | null = null;
    let THREE: ThreeGroupNS | null = null;
    let loadGLB: ((url: string) => Promise<Object3D>) | null = null;
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
      loadGLB = async (url: string) => (await loader.loadAsync(url)).scene as unknown as Object3D;
      if (!root) {
        const g = new (ns as unknown as ThreeGroupNS).Group();
        g.name = 'world2:overlay';
        env.scene.add(g as never);
        root = g as unknown as Object3D;
      }
    }

    async function modelOf(key: string, url: string): Promise<Object3D | null> {
      const hit = models.get(key);
      if (hit) return hit;
      try {
        const m = await loadGLB!(url);
        // GLB 의 `castShadow`/`receiveShadow` 기본값은 false 다 — 켜지 않으면 감독이 놓은
        // 물건만 그림자 없이 서 있게 된다(`glb-city.ts` 가 같은 자리에서 한 번 데였다).
        m.traverse((o: Object3D) => { o.castShadow = true; o.receiveShadow = true; });
        models.set(key, m);
        return m;
      } catch (e) {
        diag.failed.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      }
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
    ): Promise<OverlayEntry | null> {
      await ensureLoader();
      if (disposed || !THREE || !root) return null;
      const key = blobUrl ?? src;
      const model = await modelOf(key, blobUrl ?? assetUrl(src));
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
      return { version: loadOverlay(null).version, items };
    }

    const host: OverlayHost = {
      get THREE() { return THREE; },
      camera: env.camera,
      canvas: (env.adapter.renderer?.domElement ?? null) as HTMLElement,
      doc: env.doc as Document,
      cellX: DEFAULT_LAYOUT.cellX,
      cellZ: DEFAULT_LAYOUT.cellZ,
      get root() { return root as Object3D; },
      entries: () => entries,
      place,
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
      }
    })();

    return {
      diagnostics: () => ({ ...diag, failed: diag.failed.slice(0, 4) }),
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
