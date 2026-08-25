// world2/export/imported-scene.ts — **되읽은 GLB 의 「남의 메시」를 씬에 올린다.**
//
// ── 감독 지시 2026-08-25 ─────────────────────────────────────────────────────
// *"들어가게 해달라"* · *"블랜더의 glb로 내보낸 것은 그대로 올라와야지."*
//
// 감독이 우리 GLB 를 블렌더에서 열어 오브젝트를 추가해 내보냈는데 되읽기가 그것을 못
// 실었다. 되읽기는 재질 이름으로 **우리 파츠만** 알아보고 모양은 안 읽기 때문이다
// (`import-glb.ts` 헤더). 그 통로를 여는 것이 이 파일이다.
//
// ── 팀장 판정 2026-08-25 — (B) 합친다 ───────────────────────────────────────
// 되읽은 GLB 는 **별도 레이어**로 얹히고 `?edit=1` 오버레이 배치는 그대로 남는다.
//
// ⚠⚠ **재론 조건이 있다 — 이 판정은 조건부다.** 지금 (B)가 성립하는 이유는
// `export/collect.ts` 가 **오버레이를 안 담기 때문**이다. 담지 않으므로 「파일에 없음」이
// 「지운 것」을 뜻하지 않고, 그래서 두 벌도 안 생긴다.
//
// **내보내기가 오버레이를 담게 되는 회차(백로그 `G-GLB-C`)에 이 판정은 덮기로 전환된다.**
// 그때 이 파일을 안 고치면 오버레이 물건이 **두 벌**이 된다 — 한 번은 GLB 조각으로,
// 한 번은 원장에서. 이 회차에 `withShadows` 로 정확히 그 형태를 겪었다(검수관 반려 B5).
//
// 첫 판정은 (A) 덮기였고 **근거의 전제가 거짓이었다** — 팀장이 «내보내기에 오버레이가
// 포함된다» 를 전제했는데 실측하니 아니었다. 집행 전에 반환해 재판정을 받았다.
//
// ── ⚠ 올라온 메시는 **충돌 판정을 안 탄다** ─────────────────────────────────
// 걸어서 통과한다. 이 세계의 충돌은 **배치 목록**(`frozenAt` 체인)에서 나오는데, 여기
// 올라온 메시는 그 목록에 없기 때문이다. 즉 「보이는 자리 = 막히는 자리」가 이 갈래에서는
// 성립하지 않는다 — 그 불변식은 우리 파츠에 대해서만 참이다.
//
// 붙이려면 삼각형 단위 판정이 필요하고, 그것은 이 세계의 충돌 설계(파츠 원기둥·상자,
// `systems/collision.ts`)와 **다른 축**이다. 임의 지오의 정확한 충돌은 별도 결정이므로
// 여기서 멈춘다 — 감독 보고에 이 사실을 적는다.
//
// ── 왜 `features/overlay.ts` 에 안 넣는가 ───────────────────────────────────
// 저쪽은 `?edit=1` 편집 도구와 얽혀 있다(실행취소·기즈모·원장 저장). 여기는 «파일에서 온
// 것을 얹기» 뿐이라 그 기계가 필요 없고, 섞으면 편집 원장에 파일 유래 물건이 들어가
// 「무엇이 감독이 놓은 것인가」가 흐려진다. 로더 준비 패턴만 저쪽에서 따온다.

import type { Object3D, Scene } from 'three/webgpu';
import { extractForeignGlb } from './foreign-glb.js';

export interface ImportedScene {
  /**
   * 되읽은 GLB 를 씬에 얹는다. **이전에 얹은 것은 걷어낸다** — 되읽기는 매번 «그 파일이
   * 곧 세계» 이므로 쌓이면 안 된다.
   *
   * @returns 얹은 메시 노드 수. 남의 메시가 없으면 0.
   */
  apply(buf: ArrayBuffer): Promise<number>;
  /** 얹은 것을 전부 걷어낸다 */
  clear(): void;
  dispose(): void;
}

/** three 네임스페이스 중 이 파일이 쓰는 부분만 */
interface ThreeNS {
  Group: new () => Object3D;
}

export function createImportedScene(scene: Scene): ImportedScene {
  let root: Object3D | null = null;
  let loadGLB: ((url: string) => Promise<Object3D>) | null = null;
  let THREE: ThreeNS | null = null;
  let disposed = false;
  /**
   * 회차 번호. **늦게 도착한 로드가 화면을 건드리지 않게** 하는 유일한 수단이다.
   *
   * ⚠ 이것이 없으면 두 벌이 된다: `apply` 를 연달아 부르면 A 가 `await` 에 걸린 사이
   * B 가 `clear()` 를 지나가고(그때 `root` 는 아직 `null`), 뒤늦게 A 가 `scene.add` 를
   * 하고 이어서 B 도 한다. `root` 는 B 만 가리키므로 **A 는 영영 안 걷히고 dispose 도
   * 안 된다.** 파일을 두 번 빠르게 고르는 것만으로 재현된다.
   */
  let gen = 0;

  /**
   * three·GLTFLoader 를 **처음 필요할 때만** 내려받는다(`features/overlay.ts` 와 같은 규약).
   * 되읽기를 안 하면 로더가 아예 안 온다 — 부팅 비용 0.
   */
  async function ensureLoader(): Promise<void> {
    if (THREE && loadGLB) return;
    const [{ GLTFLoader }, ns] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/webgpu'),
    ]);
    THREE = ns as unknown as ThreeNS;
    const loader = new GLTFLoader();
    loadGLB = async (url: string) => (await loader.loadAsync(url)).scene as unknown as Object3D;
  }

  /**
   * 씬에서 떼고 GPU 자원을 놓아 준다. 안 하면 되읽을 때마다 샌다.
   *
   * ⚠ **재질을 놓는 것만으로는 텍스처가 안 놓인다** — three 규약상 `material.dispose()`
   * 는 자기 맵을 건드리지 않는다(공유될 수 있어서다). 블렌더 GLB 는 텍스처를 들고 오므로
   * 반복 되읽기에서 GPU 텍스처가 그대로 샌다.
   *
   * 슬롯 이름(`map`·`normalMap`…)을 나열하지 않는다 — 그것이 곧 값 미러링이고, three 가
   * 슬롯을 하나 늘리면 조용히 낡는다. **`isTexture` 로 판정**하면 이름을 몰라도 된다.
   * (같은 텍스처를 두 재질이 공유해 두 번 불려도 three 의 `dispose` 는 멱등이다.)
   */
  function disposeTree(node: Object3D): void {
    (node as unknown as { traverse(cb: (o: unknown) => void): void }).traverse((o) => {
      const m = o as { geometry?: { dispose?(): void }; material?: unknown };
      m.geometry?.dispose?.();
      const mat = m.material;
      for (const one of Array.isArray(mat) ? mat : [mat]) {
        if (!one || typeof one !== 'object') continue;
        for (const v of Object.values(one as Record<string, unknown>)) {
          const tex = v as { isTexture?: boolean; dispose?(): void } | null;
          if (tex && typeof tex === 'object' && tex.isTexture) tex.dispose?.();
        }
        (one as { dispose?(): void }).dispose?.();
      }
    });
  }

  function clear(): void {
    if (!root) return;
    (scene as unknown as { remove(o: Object3D): void }).remove(root);
    disposeTree(root);
    root = null;
  }

  return {
    async apply(buf: ArrayBuffer): Promise<number> {
      const my = ++gen;
      // 잘라내기가 먼저다 — 원본을 통째로 로더에 넘기면 125만 삼각형을 GPU 로 올린 뒤
      // 버리게 되고, 우리 파츠는 이미 인스턴스로 서 있으므로 두 벌이 된다.
      const cut = extractForeignGlb(buf);
      // 올릴 것이 없으면 **여기서 비운다** — 남의 메시가 없는 파일을 고른 것도 편집이다.
      if (!cut.glb) { clear(); return 0; }

      await ensureLoader();
      if (disposed || my !== gen || !THREE || !loadGLB) return 0;

      // blob URL 로 넘긴다 — 로더가 URL 만 받기 때문이다. world2 의 CSP 가 `blob:` 을
      // 허용하고 있어 새로 열 것이 없다(`world2.html` 의 `connect-src`).
      const url = URL.createObjectURL(new Blob([cut.glb], { type: 'model/gltf-binary' }));
      let loaded: Object3D;
      try {
        loaded = await loadGLB(url);
      } finally {
        // 로더가 다 읽은 뒤 즉시 놓는다 — 안 놓으면 파일이 탭 수명 내내 메모리에 남는다.
        URL.revokeObjectURL(url);
      }

      // ── 늦게 도착한 회차는 **자기가 만든 것만 버리고 화면을 안 건드린다** ────────
      // `disposed` 만 보던 판본은 여기서 `scene.add` 를 해 두 벌을 만들었다.
      if (disposed || my !== gen) { disposeTree(loaded); return 0; }

      // ⚠ `clear()` 가 **`await` 뒤**인 것이 중요하다. 앞에 두면 ① 로드가 실패했을 때
      // 이전 GLB 가 이미 사라진 뒤이고(복원 수단이 없다) ② 로드 중 화면이 비어 깜빡인다.
      clear();
      const g = new THREE.Group();
      g.name = 'world2:imported-glb';
      (g as unknown as { add(o: Object3D): void }).add(loaded);
      (scene as unknown as { add(o: Object3D): void }).add(g);
      root = g;
      return cut.meshNodes;
    },
    clear,
    dispose(): void {
      disposed = true;
      clear();
    },
  };
}
