// world2/systems/artwork-mount.ts — **부팅 배선**. 씬을 만드는 일과 갈라 둔다.
//
// ── 왜 갈랐나 (W8-11) ────────────────────────────────────────────────────────
// `artwork-scene.ts` 가 **W8-11 의 `retarget`+`sizeMul` 을 얹자** `check:filesize`
// 상한(532줄)을 넘었다. ⚠ 조건을 빼면 거짓으로 읽힌다(검수관 재검수 ⑤-d) —
// `git show origin/main:…artwork-scene.ts | wc -l` 은 **522** 로 상한 아래이고,
// 다음 사람이 `main` 을 확인하면 이 문장이 틀렸다고 결론낸다. 자를 자리를 고를 때
// **줄 수가 아니라 의존 방향**으로 골랐다 — 이 파일의 두 함수는 `createArtworkScene`
// 을 *부르지만* 그 반대는 없다. 즉 씬은 배선을 모른 채 성립하고, 배선만 three 의
// `TextureLoader`·`SRGBColorSpace` 같은 **부팅 시점 지식**을 안다. 그 비대칭이 경계다.
//
// 같은 처방을 W8-9 에서 계약(`artwork-types.ts`)에 이미 썼다.
//
// ⚠ **여기 원래 *"소비자 경로가 안 바뀌게 `artwork-scene.ts` 가 재수출한다"* 라고
// 적혀 있었고 두 절이 다 거짓이었다**(검수관 반려 B2, 2026-08-19). 재수출은 **없고**,
// 소비자 경로는 **실제로 바뀌었다** — `features/overlay.ts` 와 테스트 둘이 이 커밋에서
// 고쳐졌다. 처음엔 정말 재수출로 썼는데 `check:cycles` 가 **순환**으로 잡았다
// (mount → scene, scene → mount). 그래서 소비자를 고치는 쪽으로 바꿨고 **문장을 안
// 따라 고쳤다.**
//
// 그 사정이 이 파일의 실제 규약이다: **재수출은 순환이라 못 한다.** 여기서 무언가를
// 옮길 때 「배럴로 감싸면 경로가 유지된다」를 시도하지 마라 — 게이트가 막는다.
// 대신 소비자를 고치고, 그 diff 가 섞이는 대가는 받아들인다.
//
// 타입만은 예외다(아래 `export type`) — mount 가 scene 을 부르는 단방향이라 순환이 없다.

import { createArtworkScene } from './artwork-scene.js';
import type { ArtThreeNS, ArtNode, ArtworkScene } from './artwork-types.js';
/**
 * 진입점이 **자기 시그니처 타입**을 함께 낸다 — `mountArtworks(THREE, scene: ArtNode…):
 * ArtworkScene` 이 그 둘이다. 배럴을 늘리려는 것이 아니라, 부팅하는 쪽이 두 모듈에서
 * 나눠 받지 않게 하려는 것이다(원산지는 `artwork-types.ts` 한 곳 그대로).
 */
export type { ArtNode, ArtworkScene } from './artwork-types.js';

/**
 * 작품 이미지를 받는 로더. `createArtworkScene` 의 `loadTexture` 에 그대로 넣는다.
 *
 * ⚠ **로더를 한 번만 만든다.** 첫 배선은 작품마다 `new TextureLoader()` 를 했고, three 의
 * 로더는 매니저·캐시를 들고 있어 벌마다 캐시가 갈린다 — 같은 이미지를 두 번 거는 문서에서
 * 같은 파일을 두 번 받는다.
 *
 * 실패는 **값으로** 돌려준다(`null`). 던지면 뒤 작품이 통째로 안 걸린다 — 액자는 서고
 * 그림만 비는 것이 「로드 실패」의 정직한 표시다.
 *
 * ── 🔴 `colorSpace` 를 반드시 준다 (감독 지시 2026-08-18 두 번째) ────────────
 * *"그냥 **뷰어처럼** 밝기가 보였으면해"* — 뷰어는 원본을 원본대로 낸다.
 *
 * three r152+ 의 `TextureLoader` 는 `colorSpace` 를 **설정하지 않는다**(기본
 * `NoColorSpace` = 선형 취급). 그런데 사진 파일은 **sRGB 인코딩**이다. 표시를 안 하면
 * 셰이더가 sRGB 값을 선형으로 잘못 읽고, 출력에서 선형→sRGB 변환이 한 번 더 걸려
 * **원본보다 밝고 색이 바래** 나온다. 「뷰어처럼」의 반대다.
 *
 * ⚠ 이 저장소의 **다른 색 텍스처는 전부 이것을 준다** — `horizon.ts:89` ·
 * `garden.ts:210` · `tree.ts:250` · `road.ts:283` · `shadow.ts:200` ·
 * `surface-paint.ts:246`. **작품 텍스처만 빠져 있었다**(W8-4 부터 W8-7 B1 까지).
 * 화면을 픽셀로 안 보고 액자 **개수**만 확인해 온 것이 이것을 놓친 직접 원인이다.
 *
 * ⚠⚠ **순색으로는 이 결함을 못 잡는다.** sRGB 변환은 극값(0·255)을 그대로 두므로,
 * 마젠타 `rgb(255,0,255)` 같은 순색 픽스처는 고쳐도 안 고쳐도 같은 값을 낸다 —
 * 대역이 실물의 성질을 안 가지는 그 형태다. **중간 회색으로 재야 갈린다.**
 *
 * @param resolve 계약의 `src` → 실제 URL. base 결합은 `asset-url.ts` 한 곳이 소유한다
 */
export function textureLoaderFor(
  THREE: unknown,
  resolve: (src: string) => string,
): ((src: string) => Promise<unknown | null>) | undefined {
  const NS = THREE as {
    TextureLoader?: new () => { loadAsync(u: string): Promise<unknown> };
    SRGBColorSpace?: unknown;
  };
  const TL = NS.TextureLoader;
  if (!TL) return undefined;
  const loader = new TL();
  return async (src: string) => {
    try {
      const tex = await loader.loadAsync(resolve(src));
      // 값을 여기에 적지 않는다 — three 가 소유한 상수를 그대로 얹는다(값 미러링 회피).
      if (tex && NS.SRGBColorSpace !== undefined) {
        (tex as { colorSpace?: unknown }).colorSpace = NS.SRGBColorSpace;
      }
      return tex;
    } catch { return null; }
  };
}

/**
 * 부팅용 진입점 — 씬 생성과 로더 배선을 **한 줄로** 묶는다.
 *
 * ⚠ 이 함수가 있는 이유는 편의가 아니라 **`features/overlay.ts` 의 크기**다. 그 파일은
 * `check:filesize` 상한에 붙어 있고(감독 지시 *"파일사이즈 폭주 안되고 모듈 관리 잘되게"*),
 * 배선을 인라인으로 넣자 게이트가 커밋을 막았다 — W8-3 의 `mountTenantEntry` 와 같은 형태다.
 *
 * @param resolve 계약의 `src` → 실제 URL(`asset-url.ts` 의 `assetUrl`)
 */
export function mountArtworks(
  THREE: unknown,
  scene: ArtNode,
  layout: { cellX: number; cellZ: number },
  resolve: (src: string) => string,
  perParcel?: number,
  /** 부팅 시점 작품 목록 — 풀 크기 유도용. 생략하면 격자 상한을 쓴다(편집 세션) */
  arts?: readonly { readonly x: number; readonly z: number }[],
): ArtworkScene {
  return createArtworkScene({
    THREE: THREE as ArtThreeNS,
    scene,
    cellX: layout.cellX,
    cellZ: layout.cellZ,
    perParcel,
    arts,
    loadTexture: textureLoaderFor(THREE, resolve),
    // 캐시 키를 **실제 URL**로 잡는다 — 같은 `src` 에 새 `blob:` 이 붙으면(같은 파일명을
    // 다시 드롭) 키가 달라져 자동으로 다시 로드된다. `src` 를 키로 쓰면 낡은 그림이 남는다.
    texKey: resolve,
  });
}
