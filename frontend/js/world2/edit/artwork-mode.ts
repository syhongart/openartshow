// world2/edit/artwork-mode.ts — **이미지를 끌어다 그 자리 벽에 건다** (W8-4 D2).
//
// ── 감독 요구가 화면에 닿는 자리다 ────────────────────────────────────────
// *"glb 건물 벽에 작품을 걸고 안에 조명을 비출수있을까"*(2026-08-16). W8-4 A~C 로 계약·
// 판정·집행이 전부 서 있고 배포됐는데 **거는 문이 없어서** `arts` 가 언제나 빈 배열이었다.
//
// ── 왜 2단계가 아니라 드롭 한 번인가 ──────────────────────────────────────
// 처음에는 GLB 팔레트처럼 「고르기 → 클릭」을 생각했고, 그러면 `st.pendingArt` 라는
// **세 번째 pending 슬롯**이 필요했다. 상호배타 불변식이 **8곳**에 퍼져 있고 7개 테스트가
// 그것을 지킨다(`decide/asset-library.ts`·`edit/panel/*`·`edit/input.ts`·`edit/actions.ts`·
// `edit/mode.ts`·`edit/state.ts`). 그런데 **이미지는 그 비용이 필요 없다** — `drop`
// 이벤트에 `clientX/clientY` 가 있어서 GLB 가 지면을 찍는 그 자리에서 **벽을 찍으면**
// 된다. pending 슬롯 **0개 추가**, 불변식 **무변경**.
//
// ── 판정은 여기 없다 ─────────────────────────────────────────────────────
// 「벽인가」는 `decide/artwork.ts` 의 `wallPose()` 가 `null` 로 답하고, 「쓸 수 있는
// 이름인가」는 `artSrcFor()` 가 답한다. 이 파일은 **그 답들을 화면과 잇는 배선**이다.
//
// ── 팀장 판정 (나) — `OverlayHost` 무변경 (2026-08-17) ─────────────────────
// *"`OverlayHost` **무변경**, `edit/artwork-mode.ts` 신설 + 의존성 **인자 주입**"*
// 작품 목록은 `systems/art-port.ts` 가 소유하고 여기는 `deps.arts` 로 **받는다.**
//
// ── 브라우저 실측 (2026-08-17, `_site` vite 조립 + swiftshader, 120.5s) ────
// 노드 테스트가 원리적으로 못 재는 것만 잰 회차다. `?edit=1` 로 열어 팔레트 GLB 를 놓고
// 300×100 PNG 를 그 벽에 떨어뜨린 뒤 **내보낸 JSON 을 직접 읽었다**:
//
//   부팅        라이트 풀 28개가 편집 세션에서 실제로 섰다 (작품 0개인데도 — 검수관
//               B3-2 가 실측한 구멍을 D2 가 닫았다는 실물 확인)
//   걸기        `frames 1 · lit 1 · texFailed 0`
//   내보내기    `{"src":"assets/art/hung.png","x":-3.5,"y":1.428…,"z":7.751…,`
//               ` "ry":3.14159…,"w":2.4,"ar":3}`
//   판정        **`ar: 3` — 300×100 을 실제로 읽었다.** 기본값(1.2)이 아니다
//   거절        벽이 없을 때 아래 문구가 화면에 실제로 떴다
//   콘솔 에러   0건
//
// ⚠ **못 잰 것 하나**: 성공 문구(«걸었습니다 …»)를 화면에서 직접 확인하지 못했다.
// GLB 로딩 완료가 늦게 와서 `placeAt` 의 «놓았습니다» 가 상태줄을 덮었기 때문이다.
// 걸린 사실 자체는 `frames 1` 과 내보낸 JSON 이 확정하지만, **문구는 못 봤다.**

import {
  artSrcFor, wallPose, ART_AR_DEF, ART_W_DEF, looksLikeImage,
} from '../decide/artwork.js';
import type { ArtsPort } from '../systems/art-port.js';
import type { Panel } from './panel/dom.js';
import type { Picker } from './pick.js';

export interface ArtworkModeDeps {
  readonly panel: Panel;
  readonly picker: Picker;
  readonly arts: ArtsPort;
  /** 미리보기로 만든 임시 주소를 소비자에게 넘겨 회수하게 한다(GLB 와 같은 문) */
  onBlobUrl(url: string): void;
  /**
   * 이미지 URL → 종횡비. **주입받는다** — 기본 구현(`measureAspect`)은 `Image` 를 쓰므로
   * 노드가 못 돌린다. 주입이 없으면 이 경로의 검사는 「브라우저에서 눈으로」뿐이 된다.
   */
  measure?(url: string): Promise<number | null>;
}

export interface ArtworkMode {
  /** 이 파일을 작품으로 다룰 것인가. `edit/input.ts` 의 드롭 분기가 쓴다 */
  handles(fileName: string): boolean;
  /** 떨어뜨린 이미지를 그 자리 벽에 건다. **던지지 않는다** — 사유는 화면이 말한다 */
  drop(file: File, ev: { clientX: number; clientY: number }): Promise<void>;
}

/**
 * 이미지의 종횡비(가로/세로). 못 재면 `null` 이고 호출부가 기본값으로 간다.
 *
 * ⚠ **`studio-image.ts` 의 `fileToDataURL` 을 재사용하지 않았다** — 중복처럼 보이지만
 * 합치려 들면 막힌다. `tests/world2-boundary.test.ts` 의 허용 접두사는
 * `vendor/`·`utils/`·`js/world-shared/`·`js/shared/` 뿐이고 `js/studio-image.js` 는
 * 어디에도 안 걸려 **경계 게이트가 FAIL 한다**(실측). 그리고 필요한 것이 그 함수의
 * 절반도 아니다: 그쪽은 canvas 리사이즈 + `toDataURL` 까지 하는데 여기는 `blob:` 을
 * 그대로 쓰므로 dataURL 이 아예 불필요하다.
 */
export function measureAspect(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      resolve(w > 0 && h > 0 ? w / h : null);
    };
    // 실패도 **값으로** 돌려준다. 던지면 액자가 아예 안 걸린다 — 종횡비 하나 때문에
    // 작품을 못 거는 것보다 기본 비율로 거는 편이 낫고, 감독이 화면에서 고칠 수 있다.
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function createArtworkMode(deps: ArtworkModeDeps): ArtworkMode {
  const { panel, picker, arts } = deps;
  const measure = deps.measure ?? measureAspect;

  async function drop(file: File, ev: { clientX: number; clientY: number }): Promise<void> {
    // ⚠ **이름 판정이 먼저다.** 벽을 찾은 뒤에 이름으로 거절하면 «벽은 맞았는데 왜
    // 안 걸리지» 가 되고, 사용자가 할 일이 없는 사유를 나중에 듣는다
    // (`judgeUpload` 가 등급을 이름보다 먼저 보는 것과 같은 순서).
    const src = artSrcFor(file.name);
    if (!src) {
      panel.say(`«${file.name}» 은 쓸 수 없는 이름입니다 — 영문·숫자·_ - . 만 씁니다.`, true);
      return;
    }
    if (!picker.castFrom(ev)) return;
    const hit = picker.pickFace();
    const pose = hit && wallPose(hit);
    if (!pose) {
      // ⚠ **다음에 할 일을 말한다.** 실측(2026-08-17): 라이브 `world2-overlay.json` 은
      // `items: []` 이고 `pickFace()` 는 오버레이 GLB 만 본다 — 즉 **아무것도 안 놓인
      // 세계에서는 이 거절이 100% 뜬다.** 이유를 안 적으면 «걸리는 벽이 하나도 없다» 가
      // «기능이 안 먹는다» 로 읽히고, 그것이 이 저장소에서 가장 비쌌던 형태다(감독 신고
      // 2026-08-12 *"아무것도 안 먹는다"*). 마을 건물(인스턴스) 벽 지원은 D1 이 범위 밖으로
      // 둔 것이고 재론 트리거는 `edit/pick.ts` 의 `pickFace` 주석 한 곳이다.
      panel.say('벽에 놓아 주세요 — 바닥·지붕에는 못 겁니다.'
        + ' 마을 건물 벽은 아직 안 됩니다: 팔레트에서 GLB 건물을 놓고 그 벽에 놓으세요.', true);
      return;
    }
    // 여기서부터 되돌릴 것이 생긴다. **거절이 다 끝난 뒤에** 임시 주소를 만든다 —
    // 앞에서 만들면 거절할 때마다 회수 대상이 하나씩 쌓인다.
    const url = URL.createObjectURL(file);
    deps.onBlobUrl(url);
    const ar = await measure(url);
    // ⚠ **`ar` 을 실제로 읽는 것이 이 함수의 요점 하나다.** 안 읽고 `ART_AR_DEF` 로
    // 두면 세로 사진이 가로로 늘어나고, 그 증상은 «액자가 이상하다» 로만 보여 원인을
    // 짚기 어렵다. 감독 판정 *"비율 제한은 없어"*(2026-08-17)가 이 자리에 걸린다.
    await arts.set(
      [...arts.list(), { src, ...pose, w: ART_W_DEF, ar: ar ?? ART_AR_DEF }],
      { src, url },
    );
    // 「걸었다」가 아니라 **「보낼 준비가 됐다」**다 — 그 파일은 아직 저장소에 없다.
    // 근거는 `decide/upload-plan.ts` 헤더 한 곳이다(GLB 가 같은 형태로 겪었다).
    panel.say(`걸었습니다 — 내보내기 하면 «${file.name}» 을 JSON 과 함께 보내 주세요.`);
  }

  return { handles: looksLikeImage, drop };
}
