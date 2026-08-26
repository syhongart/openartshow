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
// ── 마을 건물 벽 실측 (2026-08-17, D5 · 103.8s) ───────────────────────────
// 위 표는 **오버레이 GLB 경로**이고, 감독 판정으로 열린 **인스턴스 경로**는 다른 코드다.
// `placed 0`(GLB 를 하나도 안 놓은 기본 세계)에서 마을 건물 벽에 바로 떨어뜨렸다:
//
//   걸기        `frames 1 · lit 1 · texFailed 0`
//   내보내기    `items 0 · arts 1` — GLB 없이 작품만 실려 나간다
//   종횡비      `ar: 3` (인스턴스 경로에서도 300×100 을 읽는다)
//   문구        «걸었습니다 — 내보내기 하면 «…png» 을 JSON 과 함께 보내 주세요.»
//   콘솔 에러   0건
//
// ⚠ **성공 문구는 세 회차 연속 못 쟀다가 여기서 닫혔다** — 원인이 매번 달랐다:
// ① 패널 셀렉터 오류(`.w2e-say`, 실제는 `#w8-edit .note`) ② GLB 로딩 완료가 늦게 와
// «놓았습니다» 가 덮음 ③ 대기 700ms 가 텍스처 로드 **직전**에 읽음(2500ms 로 늘려 해소).
// 세 번 다 「검사 대상이 틀린 것」이 아니라 **「재는 방법이 틀린 것」**이었고, 그때마다
// `frames 1` 은 맞게 나오고 있었다 — **같은 회차에서 한 축은 참이고 다른 축은 못 잰
// 상태**가 성립한다는 것이 이 기록의 요점이다.

import {
  artNameHelp, artSrcFor, wallPose, ART_AR_DEF, ART_W_DEF, looksLikeImage,
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
  /**
   * 고른 이미지를 **화면 한가운데** 벽에 건다 (W8-5 · 폰 경로). 위와 같은 규약이다.
   *
   * ⚠⚠ **지금 프로덕션 소비자가 0이다**(W8-6, 검수관 권고 1). 「사진 걸기」 버튼은 이제
   * 조준 화면(`edit/aim-mode.ts`)을 열고, 그쪽이 `judge` → 조준 → `commit` 을 직접 탄다.
   * 이 함수는 **테스트에서만** 불린다 — 「좌표 없이 화면 중앙에 건다」는 축을 그대로
   * 유지해 두면 조준 화면이 그 위에 얹힌 것임을 다음 사람이 코드로 확인할 수 있다.
   *
   * ⚠ **다시 배선하려거든 문구부터 보라.** 이 경로의 거절 문구(`MISS_CENTER`)는 조준
   * 화면이 있다는 전제로 고쳐졌다. 조준 없이 되살리면 그 안내가 다시 거짓이 된다 —
   * 팀장 조건 2 가 정확히 그것을 막으려고 있었다. 제거 여부는 태스크로 남겼다.
   *
   * 좌표가 없는 진입점이다 — `<input type="file">` 의 `change` 에는 좌표가 없고, 모바일
   * 브라우저는 파일 드래그드롭을 지원하지 않는다. **둘의 차이는 광선을 어디로 쏘는가
   * 하나뿐**이고 나머지(이름 판정·blob 수명·종횡비·목록 갱신·문구)는 같은 몸을 탄다.
   */
  pickFile(file: File): Promise<void>;
  /**
   * **이름만** 판정한다 (W8-6). 조준 화면이 **시작하기 전에** 쓴다.
   *
   * ⚠ 왜 이것이 따로 필요한가 — 조준 화면을 띄운 **뒤에** 이름으로 거절하면 «벽은 맞았는데
   * 왜 안 걸리지» 가 된다. `hang()` 이 이름을 가장 먼저 보는 것과 **같은 이유**이고,
   * 그 순서 규약을 조준 경로에서도 지키려면 판정을 이 시점에 부를 수 있어야 한다.
   */
  judge(file: File): { readonly ok: true; readonly src: string }
    | { readonly ok: false; readonly msg: string };
  /**
   * 자세가 **정해진 뒤** 실제로 건다 (W8-6). 조준 화면의 「여기 걸기」가 부른다.
   *
   * ⚠ `judge` 를 통과한 `src` 와 `wallPose()` 가 낸 `pose` 를 받는다 — 여기서 다시
   * 판정하지 않는다. 두 번 판정하면 «조준선은 초록인데 안 걸린다» 가 성립할 자리가 생긴다.
   */
  commit(file: File, src: string, pose: WallPose): Promise<void>;
}

/** `wallPose()` 가 내는 것. 액자 중심 + 벽 바깥을 향하는 yaw */
type WallPose = NonNullable<ReturnType<typeof wallPose>>;

/**
 * 벽을 못 찾았을 때의 문구. **진입점마다 다르다** — 사용자가 할 일이 다르기 때문이다.
 * 드롭은 «다른 데 놓아라», 버튼은 «몸을 돌려 벽을 가운데 두어라» 다. 한 문구로 뭉치면
 * 폰 사용자가 «어디에 놓으라는 거지» 를 듣는다(놓을 것이 없다 — 버튼을 눌렀을 뿐이다).
 */
const MISS_DROP = '벽에 놓아 주세요 — 바닥·지붕·하늘에는 걸 수 없습니다.';
// ⚠ **이 문구는 W8-6 에서 고쳤다**(검수관 권고 1 · 팀장 조건 2). 예전에는 *"벽을 화면
// 한가운데 두고 다시 눌러 주세요"* 였는데, 폰에서는 **화면 한가운데가 편집 패널에 덮여
// 있어서 사용자가 그 지시를 따를 수가 없었다** — 팀장이 «거짓 안내» 라고 부른 것이다.
// 지금은 조준 화면이 그 자리를 대신하므로(`edit/aim-mode.ts`) 문구도 그리로 안내한다.
const MISS_CENTER = '조준 화면에서 벽을 겨눠 확정해 주세요 — 바닥·지붕·하늘에는 걸 수 없습니다.';

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

  /**
   * 이름 판정 — **세 진입점이 전부 이것을 통과해야 한다**(드롭·버튼·조준).
   *
   * ⚠ **사유를 소비자가 짓지 않는다** — `artNameHelp` 가 원인별로 낸다(검수관 블로커 B2).
   * 한 줄로 뭉갰을 때 `IMG_1234.JPG` 가 «영문·숫자·_ - . 만 씁니다» 라는 **이미 만족한
   * 조건**을 들었다. 문구를 소비자가 지으면 계약이 넓어져도 안 따라온다.
   */
  function judge(file: File): { ok: true; src: string } | { ok: false; msg: string } {
    const src = artSrcFor(file.name);
    return src
      ? { ok: true, src }
      : { ok: false, msg: `«${file.name}» 은 쓸 수 없는 이름입니다 — ${artNameHelp(file.name)}` };
  }

  /**
   * 자세가 정해진 뒤 실제로 거는 부분. **여기부터 되돌릴 것이 생긴다.**
   *
   * ⚠ 이 몸통을 진입점마다 복제하지 않는 것이 요점이다 — 순서 규약 셋이 여기 들어 있다
   * (거절이 다 끝난 뒤 blob · `ar` 을 실제로 읽는다 · 「걸었다」가 아니라 「보낼 준비가 됐다」).
   */
  async function commit(file: File, src: string, pose: WallPose): Promise<void> {
    // **거절이 다 끝난 뒤에** 임시 주소를 만든다 — 앞에서 만들면 거절할 때마다 회수
    // 대상이 하나씩 쌓인다.
    const url = URL.createObjectURL(file);
    deps.onBlobUrl(url);
    const ar = await measure(url);
    // ⚠ **`ar` 을 실제로 읽는 것이 요점 하나다.** 안 읽고 `ART_AR_DEF` 로 두면 세로 사진이
    // 가로로 늘어나고, 그 증상은 «액자가 이상하다» 로만 보여 원인을 짚기 어렵다.
    // 감독 판정 *"비율 제한은 없어"*(2026-08-17)가 이 자리에 걸린다.
    await arts.set(
      [...arts.list(), { src, ...pose, w: ART_W_DEF, ar: ar ?? ART_AR_DEF }],
      { src, url },
    );
    // 「걸었다」가 아니라 **「보낼 준비가 됐다」**다 — 그 파일은 아직 저장소에 없다.
    // 근거는 `decide/upload-plan.ts` 헤더 한 곳이다(GLB 가 같은 형태로 겪었다).
    panel.say(`걸었습니다 — 내보내기 하면 «${file.name}» 을 JSON 과 함께 보내 주세요.`);
  }

  /**
   * 드롭·버튼 두 진입점의 **공통 몸통** (W8-5). 좌표에 묶인 것은 `cast` 인자 하나뿐이고,
   * 순서 규약은 `judge`/`commit` 이 나눠 갖는다 — 진입점마다 복제하면 한쪽만 고쳐진다.
   *
   * @param cast 광선을 어디로 쏘는가. 드롭은 `castFrom(ev)`, 버튼은 `castCenter()`
   * @param miss 벽을 못 찾았을 때 화면이 할 말 — 진입점마다 사용자가 할 일이 다르다
   */
  async function hang(file: File, cast: () => boolean, miss: string): Promise<void> {
    // ⚠ **이름 판정이 먼저다.** 벽을 찾은 뒤에 이름으로 거절하면 «벽은 맞았는데 왜
    // 안 걸리지» 가 되고, 사용자가 할 일이 없는 사유를 나중에 듣는다
    // (`judgeUpload` 가 등급을 이름보다 먼저 보는 것과 같은 순서).
    const v = judge(file);
    if (!v.ok) { panel.say(v.msg, true); return; }
    if (!cast()) return;
    const hit = picker.pickFace();
    const pose = hit && wallPose(hit);
    if (!pose) {
      // ⚠ **이 문구는 한 번 거짓이었다가 고쳐졌다.** 마을 건물 벽이 안 되던 동안에는
      // *"마을 건물 벽은 아직 안 됩니다: 팔레트에서 GLB 건물을 놓고 …"* 라고 안내했다
      // (라이브 오버레이가 `items: []` 이라 그때는 걸 벽이 **0개**였다). 감독 판정
      // (2026-08-17 *"마을 건물에도 걸려야 한다"*)으로 인스턴스 경로가 열리면서 그
      // 안내가 사실과 어긋났고, **화면이 거짓을 말하는 것이 이 저장소가 가장 비싸게
      // 배운 형태**라 함께 고쳤다. 지금 남는 거절 사유는 기하뿐이다.
      panel.say(miss, true);
      return;
    }
    await commit(file, v.src, pose);
  }

  return {
    judge,
    commit,
    handles: looksLikeImage,
    drop: (file, ev) => hang(file, () => picker.castFrom(ev), MISS_DROP),
    pickFile: (file) => hang(file, () => picker.castCenter(), MISS_CENTER),
  };
}
