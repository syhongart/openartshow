// frontend/js/avatar-deeplink.ts — 캐릭터 디자인 딥링크 프로토콜 (SSOT)
//
// 감독 지시 2026-08-08: *"캐릭터 꾸미기 누르면 캐릭터 디자인으로 바로 이동해야지."*
//
// ── 왜 별도 모듈인가 (검수관 P2·G-A) ──────────────────────────────────────
// 첫 판본은 `avatar=1`·`back=mypage`·`./mypage.html` 을 **생산자(`mypage/app.ts`)와
// 소비자(`ui-hud.ts`) 양쪽에 각각 박아** 두었다. 값 미러링이고, 한쪽만 고치면
// **조용히 안 열린다** — 에러도 안 나고 버튼만 아무 일도 안 한다. 이 저장소가 세 번
// 겪은 형태다.
//
// 둘은 같은 vite 번들이라 import 로 미러를 **없앨 수 있다.** 없앨 수 있는 미러를
// 게이트(`literal-mirror`)로 묶는 것은 미러를 정당화하는 것이라 하지 않는다
// (그 파일은 *"CSP 제약상 import 로 없앨 수 없는 것"* 을 위한 자리다).
//
// ── 이 모듈은 순수하다 ────────────────────────────────────────────────────
// DOM·history·location 을 만지지 않는다. 문자열을 받아 문자열·판정을 돌려준다.
// 그래서 jsdom 없이도 전부 테스트되고, 소비자가 어떤 방식으로 URL 을 바꾸든
// (replaceState·pushState) 이 파일은 모른다.

/** 편집기를 열라는 신호. 값이 정확히 `'1'` 일 때만 연다. */
export const AVATAR_PARAM = 'avatar';
export const AVATAR_ON = '1';

/** 닫은 뒤 돌아갈 곳의 **키**. 경로 자체가 아니다 — 아래 주석 참조. */
export const BACK_PARAM = 'back';

/**
 * 돌아갈 곳. **키 → 경로**이고 경로는 이 코드가 갖는다.
 *
 * `back` 값을 그대로 `location.href` 에 넣으면 열린 리다이렉트가 된다
 * (`?back=https://evil.example`). 값은 키일 뿐이다.
 *
 * ⚠ **`Map` 인 것이 요점이다** (검수관 P1, 실측). 첫 판본은 plain object 였고
 * `BACK_TARGETS[key]` 가 프로토타입 체인에 걸렸다:
 * ```
 * ?back=constructor  → function Object() { [native code] }   truthy!
 * ?back=toString     → function toString() { [native code] } truthy!
 * ?back=__proto__    → [object Object]                       truthy!
 * ```
 * 외부 호스트로 나가지는 못해(전부 `//` 로 시작하지 않는다) 열린 리다이렉트는
 * 아니었지만, 주석은 *"화이트리스트로만 정한다"* 고 단언하고 있었고 그것이
 * 부정확했다. **보안 처방의 자기주장은 케이스 표로 확인하기 전까지 주장일 뿐이다.**
 */
const BACK_TARGETS = new Map<string, string>([
  ['mypage', './mypage.html'],
]);

/** 돌아갈 경로. 화이트리스트에 없으면 `null`. */
export function resolveBackTarget(key: string | null | undefined): string | null {
  if (typeof key !== 'string' || !key) return null;
  const target = BACK_TARGETS.get(key);
  // 형태 단언 — 화이트리스트에 나중에 외부 URL 이 들어오는 것까지 막는다(검수관 G-E).
  // 값을 추가하는 사람이 이 줄을 보고 "상대 경로여야 하는구나" 를 알게 된다.
  //
  // ⚠ **이것은 중복 방어다** (검수관 P-d, 실측). 이 줄을 지워도 테스트는 안 깨진다 —
  // 목적(외부 URL 유입 차단)을 `tests/avatar-deeplink.test.ts` 의
  // 「등록된 값은 전부 상대 경로다」가 **화이트리스트 값을 직접 훑어** 이미 강제하기
  // 때문이다. 안 깨지는 것이 정상이고 장식이라는 뜻이 아니다 — 그쪽 축이 사라지는 날
  // 이 줄이 유일한 방어가 된다.
  if (!target || !target.startsWith('./')) return null;
  return target;
}

/** 화이트리스트 키 전부. 테스트가 목록을 다시 적지 않게 한다. */
export function backTargetKeys(): string[] {
  return [...BACK_TARGETS.keys()];
}

/**
 * 생산자 — 마이페이지가 만드는 링크.
 *
 * @param page  이동할 페이지(예: `'./index.html'`)
 * @param back  돌아올 키. 화이트리스트에 없으면 붙이지 않는다(생산 단계에서 거른다).
 */
export function buildAvatarDeepLink(page: string, back?: string): string {
  const params = new URLSearchParams();
  params.set(AVATAR_PARAM, AVATAR_ON);
  if (back && resolveBackTarget(back)) params.set(BACK_PARAM, back);
  return `${page}?${params.toString()}`;
}

export interface DeepLinkIntent {
  /** 편집기를 열어야 하는가. */
  open: boolean;
  /** 닫은 뒤 갈 곳. 화이트리스트를 통과한 **경로**다(키가 아니다). */
  backTarget: string | null;
}

/** 소비자 — `location.search` 를 읽어 무엇을 할지 정한다. */
export function readAvatarDeepLink(search: string): DeepLinkIntent {
  const params = new URLSearchParams(search || '');
  if (params.get(AVATAR_PARAM) !== AVATAR_ON) return { open: false, backTarget: null };
  return { open: true, backTarget: resolveBackTarget(params.get(BACK_PARAM)) };
}

/**
 * 딥링크 파라미터를 **덜어낸** search 문자열을 만든다(`'?g=abc'` 또는 `''`).
 *
 * ── 왜 소비해야 하는가 (검수관 B1·B3) ──────────────────────────────────────
 * 첫 판본은 파라미터를 URL 에 그대로 남겼다. 그래서 딥링크가 "1회 명령" 이 아니라
 * **"세션 상태"** 가 됐고, 블로커 셋이 전부 거기서 나왔다:
 *
 *  · 미술관에 입장해 관람하다가 `C` 키로 편집기를 다시 열고 저장하면 **미술관에서
 *    튕겨 나간다** — 복귀 리스너가 세션 내내 살아 있었다.
 *  · 사진 공유 링크(`getShareUrl()` 이 `location.href` 를 직반환한다)에 딥링크가
 *    실려 나가 **공유받은 제3자가 편집기 화면을 본다.**
 *  · 뒤로가기로 미술관에 도달할 수 없다 — 매번 편집기가 다시 열린다.
 *
 * **다른 파라미터는 반드시 보존한다.** `?g=`(갤러리 전환)·`?debug=perf` 가 살아 있어야
 * 한다. "전부 지우기" 로 만들면 그 기능들이 조용히 깨지고, 그것을 잡는 단언이 없으면
 * 아무도 모른다(검수관이 보존 단언을 필수로 걸라고 명세한 이유다).
 *
 * ⚠ **"보존" 은 바이트 동일이 아니다** (검수관 P-g). `URLSearchParams.toString()` 이
 * 살아남는 값을 재인코딩한다 — `?t=a%20b` 는 `?t=a+b` 로 나온다. 쿼리 문자열로서
 * 의미는 같고(둘 다 공백) 딥링크가 있을 때만 일어나지만, 바이트 비교로 검사하는
 * 소비자가 생기면 그때는 다른 값이다.
 *
 * hash 는 여기서 다루지 않는다 — 호출자가 붙인다(`?avatar=1#gd=...` 의 공유 갤러리).
 */
export function stripDeepLinkParams(search: string): string {
  const params = new URLSearchParams(search || '');
  if (!params.has(AVATAR_PARAM) && !params.has(BACK_PARAM)) return search || '';
  params.delete(AVATAR_PARAM);
  params.delete(BACK_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
