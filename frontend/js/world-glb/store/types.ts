// world-glb/store/types.ts — **오버레이 저장 어댑터의 계약.** 구현은 옆 파일들이 한다.
//
// ── 감독 카드 (2026-08-16) ─────────────────────────────────────────────────
// SaaS 강도 = **「구조만 먼저」** — 사용자 단위로 쪼개고 **저장 자리를 어댑터로 가둔다.**
// **서버 0 · 비용 0.**
//
// 이것은 감독이 8일 전 승인한 패턴의 **두 번째 적용**이다(`MYPAGE-PLAN.md:270-276`,
// 저장 구조 B = 어댑터 + 로컬). 그 문서가 값어치를 적었다 — *"B로 만들어 두면 OAuth 키가
// 나온 뒤 **C로 가는 길은 파일 하나 추가**다."*
//
// ── 왜 전부 비동기인가 ─────────────────────────────────────────────────────
// 지금 구현은 `fetch` 와 `localStorage` 뿐이라 동기로 둘 수도 있다. **그러면 안 된다** —
// 서버가 붙는 날 **모든 호출부가 `await` 로 바뀌고, 그것이 「구조를 다시 뜯는」 일**이다.
// 어댑터의 값어치는 «그날 어댑터 뒤만 바뀐다» 인데 시그니처가 동기면 그 값어치가 0이다.
// (`ProfileStore`(`mypage/store.ts:53-74`)가 같은 이유로 전부 비동기다.)
//
// ── `authoritativeList` — 「없다」와 「모른다」는 다르다 ────────────────────
// 로컬 저장소는 **이 기기의 것만** 본다. 그러므로 «작가 목록에 없음» 은 «그런 작가가
// 없다» 가 아니라 **«이 기기는 모른다»** 다. 화면은 그 차이를 사용자에게 그대로 전한다 —
// `ProfileStore.authoritativeUniqueness` 가 같은 이유로 있고, 그 주석이 이 규율을 적었다:
// *"못 잰 것을 통과로 적지 않는다는 규율이 여기에 걸려 있다."*
//
// ── 이 계약이 **하지 않는 것** ─────────────────────────────────────────────
// · **판정하지 않는다** — 날것(`unknown`)을 돌려준다. 해석은 `decide/` 소관
//   (`loadOverlay`·`loadLedger`). 저장소가 스키마를 알면 계약이 두 곳에 생긴다
// · **GLB 바이트를 담지 않는다** — 12.9MB 짜리가 `LocalProfileStore` 가 이미 겪은
//   QuotaExceededError(`mypage/store.ts:192-206`)를 훨씬 큰 규모로 재현하고
//   **다른 사람 프로필까지 밀어낸다**. 자산은 파일로 내보내 저장소에 넣는다(S7)
// · **던지지 않는다** — 못 읽으면 `null`. 「서버가 죽어도 전시를 보는 것만은 되어야 한다」
//   (`backend/README.md`)가 이 축에서는 «저장소가 죽어도 마을은 뜬다» 로 나타난다

/** 왜 못 읽었나. **`null` 하나로 뭉개지 않는다** — 화면이 다르게 말해야 하는 것들이다 */
export type LoadFailure =
  /** 그런 문서가 없다(404). 새 작가이거나 오타다 */
  | 'not-found'
  /** 읽었는데 JSON 이 아니다 */
  | 'malformed'
  /** 네트워크·권한 등으로 **못 물어봤다** — 「없다」가 아니라 「모른다」 */
  | 'unreachable';

export interface LoadResult {
  /** 날것. 성공했을 때만 있다. **해석은 `decide/` 가 한다** */
  raw: unknown | null;
  /** 실패 사유. 성공하면 `null` */
  failure: LoadFailure | null;
}

/** 성공 결과 — 팩토리로 두어 호출부가 `{ raw, failure: null }` 을 매번 적지 않게 한다 */
export function loaded(raw: unknown): LoadResult {
  return { raw, failure: null };
}

/** 실패 결과 */
export function failed(failure: LoadFailure): LoadResult {
  return { raw: null, failure };
}

export interface OverlayStore {
  /** 사람이 읽는 이름. 진단(`stats()`)에 그대로 나간다 — 어느 저장소를 쓰는지 리포트가 답해야 한다 */
  readonly name: string;

  /**
   * 이 저장소의 작가 목록이 **전역적으로 참인가.**
   *
   * 로컬은 `false` 다 — 이 기기의 저장만 보므로 «목록에 없음» 은 «없다» 가 아니라
   * **«모른다»** 이다. 화면은 이 값을 그대로 사용자에게 전한다.
   */
  readonly authoritativeList: boolean;

  /** 마을 대장(`(px,pz) → owner`). 없으면 `not-found` — 배정 0 인 마을은 정상이다 */
  loadLedger(): Promise<LoadResult>;

  /** 한 작가의 오버레이 문서 */
  loadOverlay(owner: string): Promise<LoadResult>;

  /**
   * 저장. **선택 사양이다** — 배포된 JSON 을 읽기만 하는 저장소는 이것이 없다.
   * 있는지 없는지가 곧 «이 화면에서 저장이 되는가» 이므로 화면이 그것을 보고 말한다.
   */
  saveOverlay?(owner: string, doc: unknown): Promise<void>;
}
