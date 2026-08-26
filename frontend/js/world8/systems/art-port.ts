// world8/systems/art-port.ts — **걸린 작품 목록의 소유자**. three 를 안 쓴다 (W8-4 D2).
//
// ── 왜 이 작은 파일이 따로 있나 — 두 가지 이유 ─────────────────────────────
// ① **편집이 `features/overlay.ts` 의 지역 변수에 닿을 방법이 없다.** 작품 배열은
//    부팅이 읽어 들고 있고(`plan.arts`), 편집은 거기에 하나를 더해 다시 걸어야 한다.
//    그 배열을 `OverlayHost` 에 멤버로 얹는 길은 **팀장이 (나)로 기각**했다(2026-08-17):
//    *"(가)의 「멤버 35→36」 선례 비용은 diff 한 줄이 아니라 **다음 +1 의 문턱**이다."*
//    그래서 목록의 소유를 이 포트로 내리고, 편집에는 `startEditMode(host, opts)` 의
//    **`opts`** 로 건넨다 — `OverlayHost` 계약은 **무변경**이다.
// ② **`features/overlay.ts` 가 `check:filesize` 상한(568줄)에 붙어 있다.** 조립을
//    인라인으로 넣으면 게이트가 커밋을 막는다 — `mountArtworks`·`mountTenantEntry` 와
//    같은 처방이고, 이것이 **세 번째** 관측이다(태스크 #85).
//
// ── 미리보기(`blob:`)를 여기서 푸는 이유 ───────────────────────────────────
// 편집에서 떨어뜨린 이미지는 `assets/art/<이름>` 이라는 **저장소에 아직 없는 경로**를
// 갖는다(발행은 작가가 파일을 보내는 두 걸음이다 — `decide/upload-plan.ts` 헤더). 그
// 상태로도 화면에는 즉시 떠야 하므로 `src` → 실제 URL 결합에 세션 한정 매핑을 끼운다.
// **결합의 자리는 여기 하나다** — `mountArtworks` 에 넘기는 `resolve` 가 이 함수라서,
// 부팅 경로와 편집 경로가 같은 문을 쓴다.

import type { ArtPose, ArtworkItem } from '../decide/artwork.js';

/**
 * 이 포트가 쓰는 씬 표면. 원래 **`place` 하나**였고 이유는 *"넓히면 편집이 씬 수명주기에
 * 닿는다"* 였다.
 *
 * ⚠ **W8-11 에서 `retarget` 이 붙었다 — 그 이유를 어기지 않는다.** 막으려던 것은
 * 편집이 «만들고 없애는» 데 닿는 것이고(`place`·`dispose`), `retarget` 은 **이미 서 있는**
 * 액자의 행렬만 다시 쓴다. 개수·수명은 손대지 않는다. 마을 파츠에 열어 준
 * `OverlayHost.retargetSlot` 과 같은 성질이고 그때도 같은 근거로 좁게 열었다.
 *
 * 확정은 여전히 `place` 다 — `retarget` 은 `w` 를 **스케일 배수**로만 반영하므로 미는
 * 동안 테두리가 함께 커진다. 손을 떼면 `set()` → `place()` 가 정확한 치수로 다시 만든다.
 */
export interface ArtPlacer {
  place(arts: readonly ArtworkItem[]): Promise<void>;
  retarget(index: number, t: ArtPose): void;
}

export interface ArtsPort {
  /** 지금 걸린 작품 전부. `toRaw()` 가 이것을 그대로 낸다(왕복 무손실) */
  list(): readonly ArtworkItem[];
  /**
   * 걸린 작품을 **통째로 갈아 끼운다**(전체 대체 — `ArtworkScene.place` 와 같은 의미론).
   *
   * @param preview 세션 한정 미리보기. 이 `src` 를 `resolve` 가 `blob:` 로 답하게 된다
   */
  set(next: readonly ArtworkItem[], preview?: { src: string; url: string }): Promise<void>;
  /** 계약의 `src` → 실제 URL. 미리보기가 있으면 그것이 이긴다 */
  resolve(src: string): string;
  /** 이 세션이 미리보기로만 갖고 있는 `src` 들. 「보낼 준비가 됐다」가 이것을 센다 */
  localOnly(): ReadonlySet<string>;
  /**
   * 걸린 액자 **하나의 자세만** 씬에 민다 (W8-11). 목록은 **안 바꾼다** — 조작 중
   * 미리보기이고, 확정은 `set()` 이다(`EditTarget` 의 `apply`/`commit` 규약 그대로).
   *
   * 씬이 안 물렸으면 아무 일도 안 한다. 그것이 조용한 no-op 인 것은 맞지만, 여기서는
   * 「목록은 그대로이므로 확정하면 반영된다」가 성립한다 — 편집이 죽지 않는다.
   */
  retarget(index: number, t: ArtPose): void;
  /** 씬을 물린다. `mountArtworks` 직후 한 번 — 안 물리면 `set` 은 목록만 바꾼다 */
  attach(scene: ArtPlacer): void;
}

/**
 * @param assetUrl base 결합. `asset-url.ts` 가 소유한다 — 여기서 다시 만들지 않는다
 */
export function createArtsPort(assetUrl: (src: string) => string): ArtsPort {
  const previews = new Map<string, string>();
  let items: readonly ArtworkItem[] = [];
  let scene: ArtPlacer | null = null;

  return {
    list: () => items,
    async set(next, preview) {
      if (preview) previews.set(preview.src, preview.url);
      // ⚠ **목록을 먼저 바꾼다.** `place` 가 던져도(텍스처 로더는 값으로 실패하지만
      // 씬이 없어질 수는 있다) 내보내기에는 남아야 한다 — 화면에 안 떴다고 작품이
      // 사라지면 그것이 D1.5 가 고친 「보낸 것이 사라진다」의 재발이다.
      items = next;
      await scene?.place(next);
    },
    retarget(index, t) { scene?.retarget(index, t); },
    resolve: (src) => previews.get(src) ?? assetUrl(src),
    localOnly: () => new Set(previews.keys()),
    attach(s) { scene = s; },
  };
}
