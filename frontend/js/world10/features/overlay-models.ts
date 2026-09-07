// world-glb/features/overlay-models.ts — **GLB 원본 캐시.** 같은 파일을 두 번 안 받는다.
//
// ── 왜 별도 파일인가 (2026-08-22) ───────────────────────────────────────────
// `features/overlay.ts` 가 **593줄**로 파일 크기 게이트의 동결 목록에 올라 있었고(상한
// 512), 실행취소가 「지운 것을 되살리는 문」을 그 파일에 요구했다. 게이트가 제시하는 두
// 길 중 **쪼개는 쪽**을 골랐다 — 감독 지시가 *"파일 분리해서 파일사이즈 폭주 안되고
// 모듈 관리 잘되게"*(2026-08-16)이고, 이 덩어리는 이미 자족적이었다: 바깥에서 받는 것은
// **로더 하나**이고 나머지(캐시 맵·실패 기록·재질 보정)는 전부 여기서 끝난다.
//
// ⚠ **동작 변경 0 이 이 파일의 계약이다.** 옮기면서 바뀐 것은 「어디에 적혀 있나」뿐이고,
// 클로저 변수 셋(`models`·`lastFail`·`loadGLB`)이 각각 모듈 상태·반환 문·주입 인자가 됐다.
//
// ⚠⚠ **`root` 를 만드는 `ensureLoader` 는 안 가져왔다.** 그쪽은 `env.scene` 에 그룹을
// 붙이는 일까지 하므로 「모델을 받는다」와 다른 축이고, 함께 옮기면 이 파일이 씬을 알게
// 된다. **경계도 판정이다** — 여기서 멈춘다.

import type { Object3D } from 'three/webgpu';
import type { LoadProgress } from '../edit/types.js';
import { recordFailure, type OverlayDiag } from '../decide/overlay-diag.js';
import { disableMatExtensions, readEmissiveCap } from '../../world-shared/glb-material.js';
import { readNum } from '../url-knob.js';

/** GLB 하나를 받아 씬 그래프를 낸다. `three`·GLTFLoader 준비는 부르는 쪽이 한다 */
export type LoadGLB = (url: string, onProgress?: (ev: ProgressEvent) => void) => Promise<Object3D>;

export interface ModelCache {
  /**
   * `key` 로 캐시하고 `url` 에서 받는다. 실패면 `null` — 사유는 `lastFailure()`.
   *
   * ⚠ **진행 중인 약속도 그대로 돌려준다**(아래 `models` 주석) — 그것이 중복 로드를 막는다.
   */
  get(key: string, url: string, onProgress?: LoadProgress): Promise<Object3D | null>;
  /** 마지막으로 `null` 을 낸 이유. 화면이 그것을 말한다 */
  lastFailure(): string | null;
  /** 새 로드를 시작하기 전에 사유를 지운다 — 옛 실패가 새 결과에 붙지 않게 */
  clearFailure(): void;
  /** 세션이 끝났다. 원본을 놓아 준다 — 담고 있는 것이 씬 그래프라 무겁다 */
  clear(): void;
}

/**
 * @param load `three`·GLTFLoader 가 준비된 뒤의 실제 로더. **주입받는다** — 여기서
 *             import 하면 배치가 0개인 세션도 로더를 내려받는다.
 */
export function createModelCache(diag: OverlayDiag, load: LoadGLB): ModelCache {
  /**
   * 로드한 원본 모델. 같은 `src` 를 여러 번 놓아도 지오·재질을 공유한다.
   *
   * ⚠ **완료본이 아니라 «진행 중인 약속»을 담는다.** 완료본만 담으면 로드가 끝나기
   * 전에 같은 것을 또 부를 때 캐시가 비어 있어 **같은 파일을 처음부터 다시 받는다.**
   * 팔레트의 자산이 12.9MB 라 그것이 N벌 동시에 파싱되면 탭이 죽는다 — 감독 신고
   * (2026-08-12 *"지엘비 씬에 놓으려고 하면 멈춘다"*)의 직접 경로가 이것이었다.
   */
  const models = new Map<string, Promise<Object3D | null>>();
  let lastFail: string | null = null;

  function get(key: string, url: string, onProgress?: LoadProgress): Promise<Object3D | null> {
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

    const p = load(url, relay)
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
        disableMatExtensions(m, readEmissiveCap(readNum));
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

  return {
    get,
    lastFailure: () => lastFail,
    clearFailure() { lastFail = null; },
    clear() { models.clear(); },
  };
}
