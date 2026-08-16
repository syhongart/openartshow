// world2/decide/upload-plan.ts — **자기 GLB 건물을 올리는 일**의 판정. 순수.
//
// ── 감독 지시 (2026-08-16, 카드 답) ────────────────────────────────────────
// *"특별 프리미엄 사용자는 자기만의 지엘비 건물을 올려서 사용할수있게할꺼야."*
//
// 두 가지를 판정한다 — **누가 올릴 수 있는가**(`judgeUpload`)와 **올린 것이 지금 어디에
// 있는가**(`pendingAssets`). 후자가 이 회차에서 발견한 실물 결함이다.
//
// ── 🔴 왜 「보낼 준비가 됐다」인가 — 지금은 조용히 거짓말을 한다 ────────────
// 편집 화면에 GLB 를 끌어다 놓으면 `src` 가 `assets/models/<이름>` 이 되고 화면에는
// `blob:` 미리보기가 뜬다. 그 상태로 내보내면 **계약(`decide/overlay.ts`)은 완벽히
// 유효하다고 판정한다** — 경로 형식이 규칙에 맞기 때문이다. 그래서 `validateOverlay`
// 관문은 `issues` 0 을 내고, 화면은 *"저장했습니다"* 라고 말한다.
//
// **그런데 그 GLB 는 저장소에 없다.** 파일을 함께 보내지 않으면 라이브에서는 그 자리가
// 비어 있다(로드 실패 → `diag.failed`). 작가는 «올렸다» 고 믿고, 결과는 «안 올라갔다» 다.
// 이 저장소가 「못 잰 것을 통과로 적지 않는다」로 부르는 바로 그 형태이고, 여기서는
// **못 보낸 것이 보낸 것으로 적히고 있었다.**
//
// 그래서 화면은 **「올렸다」가 아니라 「보낼 준비가 됐다」**고 말한다(계획 W8-3 S7).
// 서버가 붙는 날 이 판정의 뒤만 바뀐다 — 그때 `pending` 이 0 이 되는 것이 «SaaS 가 됐다»
// 의 정확한 정의다.
//
// ⚠ **권한 판정은 보안 장치가 아니다.** 서버가 없으므로 사용자가 `localStorage` 를 고쳐
// 어떤 층위든 켤 수 있다(`studio-plan.ts` 헤더가 같은 것을 적고 있다). 이것이 막는 것은
// «자기 등급으로 뭘 할 수 있는지 모르는 상태» 이지 악의가 아니다.

/** 층위 이름을 화면에 옮길 때 쓴다. 값은 `studio-plan.ts` 가 소유한다 — 여기 적지 않는다 */
export interface UploadContext {
  /** 이 사용자가 자기 GLB 를 올릴 수 있는가 */
  readonly canUpload: boolean;
  /** 지금 등급의 표시명(`TIER_LABEL`). 모르면 빈 문자열 */
  readonly tierLabel?: string;
}

export type UploadVerdict =
  | { readonly ok: true; readonly src: string }
  | { readonly ok: false; readonly reason: 'plan' | 'name'; readonly message: string };

/** 계약이 받는 자산 경로 접두. `decide/overlay.ts` 의 `isSafeSrc` 와 짝이다 */
export const ASSET_PREFIX = 'assets/models/';

/**
 * 끌어다 놓은 파일을 받을 것인가.
 *
 * **등급을 먼저 본다.** 이름 규칙을 먼저 보면 무료 사용자가 이름을 고치느라 몇 번을
 * 시도한 뒤에야 «어차피 안 됩니다» 를 듣는다 — 사용자가 할 일이 없는 사유를 먼저 말한다.
 *
 * ⚠ **fail-closed**: `canUpload` 가 참이 아니면 전부 거부다. 저장소를 못 읽어 등급을
 * 모르는 경우도 여기로 온다(`studio-plan.ts` 의 `planTier` 가 이미 무료로 떨어뜨린다).
 *
 * @param safeName 이름이 계약을 통과하는가. `isSafeSrc` 판정을 **주입받는다** — 여기서
 *                 다시 구현하면 두 곳이 갈리고, 계약이 넓어져도 이쪽이 안 따라온다
 */
export function judgeUpload(fileName: string, ctx: UploadContext, safeName: boolean): UploadVerdict {
  if (!ctx.canUpload) {
    const now = ctx.tierLabel ? ` 지금 등급은 「${ctx.tierLabel}」입니다.` : '';
    return {
      ok: false,
      reason: 'plan',
      message: `자기 GLB 건물 올리기는 「특별 프리미엄」에서 열립니다.${now}`,
    };
  }
  if (!safeName) {
    return {
      ok: false,
      reason: 'name',
      message: `«${fileName}» 은 쓸 수 없는 이름입니다 — 영문·숫자·_ - . 만, 확장자는 소문자 .glb`,
    };
  }
  return { ok: true, src: ASSET_PREFIX + fileName };
}

/**
 * 내보낼 문서가 **이 기기에만 있는 GLB** 를 가리키는가.
 *
 * @param json `validateOverlay` 가 정규화한 문서(내보낼 바로 그 내용). 문자열을 받는
 *             이유는 «실제로 나가는 것» 을 재기 위해서다 — 편집 상태를 재면 관문이 걸러낸
 *             항목까지 세어 개수가 어긋난다
 * @param localOnly 이 세션이 `blob:` 으로 미리보기 중인 `src` 들(= 드롭으로 들어온 것)
 * @returns 중복을 걷고 정렬한 경로들. 비었으면 그대로 라이브에 올릴 수 있다
 *
 * ⚠ **못 잡는 것 — 적어 둔다.** 새로고침하면 `blob:` 이 죽어 `localOnly` 가 빈다. 저장된
 * 문서를 다음 날 열어 내보내면 **이 함수는 0을 낸다** — 참조는 여전히 깨져 있는데도.
 * 그것까지 잡으려면 `assets/models/index.json` 목록과 대조해야 하고, 그 목록은 지금
 * 팔레트(`edit/panel/palette.ts:113`)만 받아 두고 상태에 안 남긴다. **여기서 멈춘다** —
 * 목록을 상태로 올리는 것은 별개 변경이고, 지금 잡는 축(세션 내 드롭)이 감독이 실제로
 * 쓰는 경로다. 재론 조건: 저장 → 재방문 → 내보내기가 실사용 흐름이 될 때.
 */
export function pendingAssets(json: string, localOnly: ReadonlySet<string>): string[] {
  if (localOnly.size === 0) return [];
  let doc: unknown;
  try { doc = JSON.parse(json); } catch { return []; }
  const items = (doc as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  const hit = new Set<string>();
  for (const it of items) {
    const src = (it as { src?: unknown })?.src;
    if (typeof src === 'string' && localOnly.has(src)) hit.add(src);
  }
  return [...hit].sort();
}

/** 목록에 몇 개까지 이름을 적을까. 넘으면 «외 N개» — 패널 한 줄이 화면을 덮지 않게 */
export const NAME_LIMIT = 3;

/**
 * 「보낼 준비가 됐다」 한 줄. **비었으면 빈 문자열** — 할 일이 없으면 말하지 않는다.
 *
 * 문구가 «올렸습니다» 가 아닌 것이 이 함수의 요점이다. 지금 구조에서 발행은
 * *작가가 파일을 받아 → 감독이 저장소에 넣는* 두 걸음이고, 그 사실을 화면이 숨기면
 * 작가는 빈 자리를 보고서야 안다.
 */
export function pendingNotice(pending: readonly string[]): string {
  if (pending.length === 0) return '';
  const names = pending.map((p) => p.slice(ASSET_PREFIX.length));
  const shown = names.slice(0, NAME_LIMIT).join(', ');
  const more = names.length > NAME_LIMIT ? ` 외 ${names.length - NAME_LIMIT}개` : '';
  return `아직 라이브가 아닙니다 — 이 GLB ${pending.length}개를 JSON 과 함께 보내 주세요: ${shown}${more}`;
}
