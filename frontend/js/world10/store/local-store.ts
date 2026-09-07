// world10/store/local-store.ts — **이 기기에만 남는 저장.** 편집 결과를 잃지 않으려고 있다.
//
// ── 왜 필요한가 ────────────────────────────────────────────────────────────
// 배포 저장소(`static-store.ts`)는 **읽기 전용**이다 — 서버가 0이므로 작가가 편집한 것을
// 어디에도 못 쓴다. 그러면 새로고침 한 번에 작업이 날아가고, 그것은 「사용」이 성립하지
// 않는 상태다(감독 요구 *"자기 작품을 놔야하는데"*).
//
// 그래서 **이 기기에 임시로** 담는다. 진짜 발행은 파일 내보내기 → 저장소 커밋(S7)이고,
// 이것은 그 사이를 잇는다.
//
// ── ⚠ GLB 바이트는 담지 않는다 ─────────────────────────────────────────────
// 오버레이 문서는 **배치 정보**(좌표·회전·`src` 문자열)뿐이라 작다. 12.9MB 짜리 GLB 를
// 여기 넣으면 `LocalProfileStore` 가 이미 겪은 QuotaExceededError(`mypage/store.ts:192-206`)를
// 훨씬 큰 규모로 재현하고 **다른 사람 프로필까지 밀어낸다.**
//
// 그것을 «주의하자» 로 두지 않고 **크기 상한으로 막는다** — 계약이 지키지 않으면 언젠가
// 누가 `src` 에 dataURL 을 넣는다(편집 모드의 드롭 미리보기가 이미 `blob:` 을 만든다).
//
// ── 저장이 실패해도 던지지 않는다 ──────────────────────────────────────────
// 사파리 프라이빗 모드는 `setItem` 이 던진다. 그때 편집 화면이 통째로 죽으면 안 되므로
// **실패를 값으로 돌려주고** 화면이 «이 브라우저에서는 저장이 안 됩니다» 라고 말한다.
// (`LocalProfileStore` 가 같은 형태다.)

import { type OverlayStore, type LoadResult, loaded, failed } from './types.js';

/** 키 규약. `mypage` 의 `lu-profile::<uid>` 와 같은 모양 — 한 저장소 안에서 형태가 갈리면 못 찾는다 */
export const OVERLAY_KEY_PREFIX = 'lu-wg-overlay::';
export const LEDGER_KEY = 'lu-wg-ledger';

/**
 * 문서 하나의 크기 상한(문자). **넉넉하지만 무한이 아니다.**
 *
 * 유도: 배치 하나가 JSON 으로 대략 120자(좌표 3 + 회전 + 스케일 + `src` 경로)이므로
 * 200KB 면 **1,500개 이상**을 담는다 — 감독 요구 *"작품갯수가 정해진것은 아니잖아"* 를
 * 실질적으로 막지 않는다. 반면 dataURL 하나(수 MB)는 즉시 걸린다.
 *
 * ⚠ 이 값은 **브라우저 총 quota(보통 5~10MB)를 나눠 쓰는 몫**이지 그 자체가 한계가
 * 아니다. 총량을 넘기면 `setItem` 이 던지고 그것은 아래에서 값으로 잡힌다.
 */
export const MAX_DOC_CHARS = 200_000;

export type SaveFailure =
  /** 문서가 상한을 넘었다 — 자산 바이트를 넣었을 가능성이 높다 */
  | 'too-large'
  /** 브라우저가 저장을 거부했다(프라이빗 모드·quota 초과) */
  | 'denied';

/** 저장 실패를 값으로 돌려주기 위한 오류. **화면이 사유를 말할 수 있어야 한다** */
export class OverlaySaveError extends Error {
  readonly failure: SaveFailure;

  constructor(failure: SaveFailure, message: string) {
    super(message);
    this.name = 'OverlaySaveError';
    this.failure = failure;
  }
}

/** 저장소 접근. 없거나 막혀 있으면 `null` — 서버 렌더·프라이빗 모드에서 던지지 않는다 */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch { return null; }
}

function readKey(key: string): LoadResult {
  const s = storage();
  if (!s) return failed('unreachable');   // 저장소 자체가 없다 = 「모른다」
  let text: string | null;
  try { text = s.getItem(key); } catch { return failed('unreachable'); }
  if (text === null) return failed('not-found');
  try { return loaded(JSON.parse(text)); } catch { return failed('malformed'); }
}

/**
 * 이 기기 저장소.
 *
 * ⚠ `authoritativeList` 가 **false** 다 — 이 기기의 저장만 보므로 «그 작가 문서가 없다» 는
 * «그런 작가가 없다» 가 아니라 **«이 기기는 모른다»** 다. 화면은 그 차이를 그대로 전한다.
 */
export function createLocalStore(): OverlayStore {
  return {
    name: 'local',
    authoritativeList: false,
    async loadLedger(): Promise<LoadResult> {
      return readKey(LEDGER_KEY);
    },
    async loadOverlay(owner: string): Promise<LoadResult> {
      return readKey(OVERLAY_KEY_PREFIX + owner);
    },
    async saveOverlay(owner: string, doc: unknown): Promise<void> {
      const text = JSON.stringify(doc);
      // **크기를 먼저 본다.** quota 를 터뜨린 뒤 잡으면 그 시점에 이미 다른 키가
      // 밀려났을 수 있다(브라우저가 무엇을 버리는지 우리가 못 정한다).
      if (text.length > MAX_DOC_CHARS) {
        throw new OverlaySaveError(
          'too-large',
          `배치 문서가 너무 큽니다(${Math.round(text.length / 1024)}KB). `
          + '자산 파일 자체가 들어간 것은 아닌지 확인해 주세요.',
        );
      }
      const s = storage();
      if (!s) throw new OverlaySaveError('denied', '이 브라우저에서는 저장이 안 됩니다.');
      try {
        s.setItem(OVERLAY_KEY_PREFIX + owner, text);
      } catch {
        throw new OverlaySaveError('denied', '저장 공간이 가득 찼거나 브라우저가 저장을 막았습니다.');
      }
    },
  };
}

/**
 * 읽기는 로컬 우선, 없으면 배포본. **쓰기는 로컬만.**
 *
 * ── 왜 이 순서인가 ────────────────────────────────────────────────────────
 * 작가가 방금 편집한 것이 **배포본보다 최신**이다. 배포본을 먼저 보면 편집 결과가 매번
 * 덮여 보이고, 그러면 저장한 의미가 없다.
 *
 * ⚠ 그 대가: 저장소에 새 판본이 배포돼도 **이 기기에 로컬 사본이 있으면 그것을 본다.**
 * 「내보내기 → 커밋」을 마친 작가가 옛 사본을 계속 보게 되는 형태다. 지금은 로컬 사본을
 * 지우는 것이 그 해소이고(편집 화면이 그 버튼을 준다 — S7), **여기서 자동으로 판단하지
 * 않는다** — 어느 쪽이 최신인지 알 방법이 서버 없이는 없다(「못 잰 것을 통과로 적지 않는다」).
 */
export function createLayeredStore(local: OverlayStore, remote: OverlayStore): OverlayStore {
  async function firstHit(
    pick: (s: OverlayStore) => Promise<LoadResult>,
  ): Promise<LoadResult> {
    const hit = await pick(local);
    if (hit.failure === null) return hit;
    const far = await pick(remote);
    if (far.failure === null) return far;
    // 둘 다 실패했다 — **더 확정적인 사유를 남긴다.** 배포본이 「없다」고 말했으면
    // 그것이 로컬의 「모른다」보다 정보가 많다.
    return far.failure === 'not-found' ? far : hit;
  }

  return {
    name: `${local.name}+${remote.name}`,
    // 로컬이 섞이는 순간 목록은 **전역적으로 참이 아니다.**
    authoritativeList: false,
    loadLedger: () => firstHit((s) => s.loadLedger()),
    loadOverlay: (owner) => firstHit((s) => s.loadOverlay(owner)),
    // 쓰기는 로컬만 — 배포본은 원리적으로 못 쓴다.
    saveOverlay: local.saveOverlay ? (o, d) => local.saveOverlay!(o, d) : undefined,
  };
}
