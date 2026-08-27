// world-glb/decide/overlay-diag.ts — 오버레이 **진단 상태**. 순수하고 three 를 모른다.
//
// ── 왜 떼어냈나 (2026-08-16, W8-2 뮤테이션이 시켰다) ────────────────────────
// `features/overlay.ts` 에 진단 필드를 셋 넣고(`want`·`failed` 상한·`failedTotal`)
// **뮤테이션으로 검출력을 실증했더니 셋 다 `0 failed` 였다.** 전체 스위트 3,452개를
// 돌려도 안 잡혔다 — 등가라서가 아니라(동작은 실제로 달라진다) **그 축을 보는 검사가
// 하나도 없어서**다.
//
// 왜 없었나: `features/` 는 three 를 import 하므로 노드 테스트가 그 파일을 **실행할 수
// 없다.** 그래서 그쪽 검사는 전부 소스 텍스트를 읽는 형태이고, 텍스트 검사는 *"이 문자열이
// 있는가"* 까지만 본다 — 상한이 실제로 걸리는지, 총계가 실제로 오르는지는 못 본다.
//
// 순수 함수로 떼면 **진짜로 돌려 볼 수 있다.** 이 저장소가 이미 적어 둔 처방 그대로다:
// *"판정/집행 분리의 구멍 — 경계를 건너는 지점은 아무도 안 본다. 새 판정 값을 만들면
// 집행 쪽 통합 테스트를 함께 붙인다."* 여기가 판정이고, 배선 검사는 테스트 파일이 맡는다.
//
// ── 이 파일이 하지 않는 것 ─────────────────────────────────────────────────
// · **상태를 소유하지 않는다.** `Diag` 객체는 호출자가 만들고 여기서는 갱신만 한다
//   (오버레이가 여러 문서로 갈라지는 W8-3 에서 문서마다 하나씩 생긴다)
// · **로드·렌더를 모른다.** three 도 DOM 도 import 하지 않는다

/**
 * 오버레이 진단. `window.__world2.stats().overlay` 로 그대로 나가는 모양이다 —
 * 스모크(`scripts/smoke/world2-ready.mjs`)가 이 필드들로 완주를 판정한다.
 */
export interface OverlayDiag {
  /**
   * ⚠ `'idle'` 이 **없다**. 그전에는 초기값이 `'idle'` 이었는데 **밖에서 한 번도 관측될 수
   * 없었다** — 부팅 IIFE 의 첫 줄이 동기로 `'loading'` 을 쓴다. 죽은 값을 남겨 두면 대기
   * 조건을 쓰는 쪽이 그것을 유효 상태로 읽고 **영원히 참인 조건**을 짜게 된다.
   */
  state: 'loading' | 'ready' | 'failed';
  /**
   * 놓으려는 개수. `placed` 하나만으로는 **「다 놓았다」와 「절반만 놓였다」가 구별되지
   * 않는다** — 둘 다 `state='ready'` 에 양수 `placed` 다.
   *
   * `glb-city` 가 이미 같은 짝(`placed`/`want`)을 내고 `world2-ready.mjs` 가
   * *"`ready` 인데 `placed` 가 요청보다 적으면 세운 척만 한 것이다"* 로 판정한다.
   */
  want: number;
  placed: number;
  /** 로드에 실패한 `src`. 앞에서 `FAILED_KEEP` 개까지만 담는다 — 전체 횟수는 `failedTotal` */
  failed: string[];
  /** 실패한 총 횟수. `failed` 는 잘리므로 이 값이 없으면 규모를 알 수 없다 */
  failedTotal: number;
  edit: boolean;
  error?: string;

  // ── 여러 작가 (2026-08-16, W8-3 S5) ──────────────────────────────────────
  // **개수만 낸다.** 사유 목록 전체를 진단에 실으면 작가가 늘수록 `stats()` 가 커지고,
  // 그것을 매 프레임 읽는 리포트가 무거워진다. 「무엇이 잘못됐나」는 콘솔이 말하고,
  // 여기는 **「잘못된 것이 있는가」** 만 답한다 — 스모크가 판정할 수 있는 최소치다.
  /** 문서를 실제로 읽어 붙인 작가 수. 옛 단일 문서 경로에서는 1 */
  owners?: number;
  /** 대장에서 거부·변경된 항목 수. 0이 아니면 배정표가 틀렸다 */
  ledgerIssues?: number;
  /** 합치는 중 생긴 사유 수(못 읽은 문서·남의 땅·무시된 재질 등) */
  mergeIssues?: number;

  // ── 진입 (S6) — **세 갈래를 구별해 말한다** ──────────────────────────────
  // 「지정 안 됨」·「형식이 틀림」·「대장에 없음」은 사용자가 할 일이 서로 다르다.
  // 하나로 뭉개면 오타가 「그런 작가 없음」과 구별되지 않는다.
  /** `?u=` 로 지정된 작가. 없으면 `null`(마을 전체) */
  tenant?: string | null;
  /** 아이디 형식이 틀렸다. 값은 `TenantIdError` — 화면이 그대로 옮긴다 */
  tenantError?: string;
  /** 형식은 맞는데 대장에 배정이 없다. **마을은 뜬다** */
  tenantMissing?: boolean;
}

/**
 * `failed` 에 담아 두는 개수. 진단에 필요한 것은 **어떤 것이 왜 실패했나**의 표본이지
 * 전량이 아니다 — 규모는 `failedTotal` 이 답한다.
 *
 * 상한이 필요한 이유: 편집 세션에서 같은 실패가 반복되면(네트워크가 나가면 놓을 때마다
 * 난다) 이 배열만 계속 자란다. **화면에 안 나오는 누수라 `info.memory` 축이 원리적으로
 * 못 잡는다.**
 */
export const FAILED_KEEP = 4;

/** 초기 상태. `state` 가 처음부터 `'loading'` 인 이유는 위 `state` 주석에 있다. */
export function newDiag(edit: boolean): OverlayDiag {
  return { state: 'loading', want: 0, placed: 0, failed: [], failedTotal: 0, edit };
}

/**
 * 실패 하나를 기록한다. **자르되 몇 번이었는지는 센다** — 상한만 두면 「4번 실패」와
 * 「400번 실패」가 같은 값이 되고, 그것이야말로 진단이 필요한 순간에 진단을 잃는 것이다.
 */
export function recordFailure(diag: OverlayDiag, message: string, keep: number = FAILED_KEEP): void {
  diag.failedTotal++;
  if (diag.failed.length < keep) diag.failed.push(message);
}

/**
 * 놓기를 시작한다 — **몇 개를 놓을지 먼저 적는다.**
 *
 * ⚠ 순서가 요점이다. 붙인 뒤에 적으면 `state='ready'` 와 `want` 사이에 창이 생겨, 그
 * 창에서 관측한 스모크가 `placed >= want` 를 **거짓 통과**시킨다.
 */
export function beginAttach(diag: OverlayDiag, itemCount: number): void {
  diag.want = itemCount;
}

/**
 * 완주했는가. **스모크가 브라우저에서 하는 판정과 같은 식**이다
 * (`scripts/smoke/world2-ready.mjs`).
 *
 * ⚠ 지금 런타임 소비자는 없다 — 이 함수의 값어치는 **판정식을 코드가 소유하는 것**이다.
 * 그전에는 그 식이 스모크 안에만 있었고, 그러면 계약이 바뀔 때 스모크만 조용히 낡는다.
 * (`placed > want` 는 정상이다 — 편집으로 더 놓은 경우이고, 판정은 한 방향뿐이다.)
 */
export function isComplete(diag: OverlayDiag): boolean {
  return diag.state === 'ready' && diag.placed >= diag.want;
}
