// world-glb/systems/boot-error-log.ts — 부팅 구간에 실제로 난 에러를 모은다.
//
// ── 왜 생겼나 (검수관 블로커 B1, 2026-08-28) ────────────────────────────────
// 체크리스트의 「콘솔」 항목이 **구조적으로 항상 초록**이었다. 세던 값은 `runBoot` 의
// `onError` 카운터였는데, `boot.ts:104-106` 이 그 콜백을 부른 **직후 `return false`** 하고
// `main.ts` 가 그때 `return null` 한다 — 즉 카운터가 1 이 되는 순간 체크리스트 호출부에
// 도달하지 못한다. 「에러 없음」 말고는 나올 수가 없는 칸이었다.
//
// 그리고 정작 이 체크리스트가 잡아야 할 사고는 그 카운터에 **애초에 안 닿았다**:
// `mountFeatures`(`features/types.ts`)는 개별 기능 조립 실패를 try/catch 로 흡수하고
// 콜백으로만 알린다(*"하늘이 죽었다고 월드 전체가 안 뜨는 건 과잉"* — 그 판단은 옳다).
// **기능 하나가 조용히 빠진 채 나머지가 뜨는 것**이 바로 감독이 눈으로 못 가리는 형태다.
//
// ── 왜 숫자가 아니라 이 객체를 넘기는가 ────────────────────────────────────
// `showBootChecklist(mount, n: number)` 였다면 고친 뒤에도 누가 **아무 숫자나** 다시
// 넘길 수 있다(그게 정확히 B1 이 난 형태다 — 0 고정 변수를 넘기고 있었다). 타입을
// 이 객체로 바꾸면 그 자리에 `bootErrors` 같은 카운터를 넣는 것이 **컴파일 에러**가
// 된다. 산문 대신 구조로 막는다.
//
// ── 못 잡는 것 ──────────────────────────────────────────────────────────────
// ① **부팅 자체가 실패하면 체크리스트가 아예 안 뜬다**(위 제어흐름 그대로다). 그 경우는
//    로딩 화면의 `fail` 이 대신 알리므로 이번 범위 밖으로 둔다 — 백로그 `G-W7E`.
// ② `console.error` 만 찍고 던지지 않는 코드. 전역 `console` 을 갈아끼우면 잡히지만,
//    남의 GLB 를 여는 페이지에서 전역 함수를 바꿔 놓는 쪽이 더 위험하다고 봤다.
//    ⚠ 그래서 이 수집기가 세는 것은 **콘솔에 찍힌 모든 것**이 아니다. 화면 라벨을
//    「콘솔」이 아니라 실제로 세는 것에 맞춰 적어야 한다.
// ③ 부팅이 끝난 «뒤» 나는 에러. `dispose()` 로 리스너를 뗀다 — 세션 내내 켜 두면
//    체크리스트가 다시 그려지지 않으므로 세기만 하고 아무도 안 읽는다.

/** 상한. 한 프레임에 같은 에러가 수백 번 나는 경우가 있어 화면과 메모리를 함께 막는다 */
const MAX = 20;

export interface BootErrorLog {
  /** 잡힌 것들의 이름. 표시용이자 개수(`length`) */
  readonly labels: readonly string[];
  /** 명시적으로 하나 넣는다(기능 조립 실패처럼 예외가 삼켜지는 자리) */
  add(label: string, err?: unknown): void;
  /** 전역 리스너를 뗀다. **반드시 부른다** — 안 떼면 다음 세계까지 따라간다 */
  dispose(): void;
}

/**
 * 수집기를 만들고 **즉시 듣기 시작한다.** 부팅을 시작하기 전에 불러야 한다.
 *
 * `window` 가 없는 환경(SSR·워커)에서도 죽지 않는다 — 그때는 `add()` 만 동작한다.
 */
export function createBootErrorLog(): BootErrorLog {
  const labels: string[] = [];
  const push = (label: string) => {
    if (labels.length < MAX) labels.push(label);
  };

  const onError = (e: ErrorEvent) => push(e.message || '스크립트 에러');
  const onRejection = (e: PromiseRejectionEvent) => {
    const r = e.reason;
    push(r instanceof Error ? r.message : String(r ?? '처리되지 않은 거부'));
  };

  const w = typeof window !== 'undefined' ? window : null;
  w?.addEventListener('error', onError);
  w?.addEventListener('unhandledrejection', onRejection);

  return {
    labels,
    add(label, err) {
      // 이름을 남기는 것이 요점이다 — 모바일에서 감독은 개발자 도구를 못 연다.
      // 「에러 2건」만 뜨면 무엇이 죽었는지 알 방법이 화면에 없다.
      push(err instanceof Error ? `${label}: ${err.message}` : label);
    },
    dispose() {
      w?.removeEventListener('error', onError);
      w?.removeEventListener('unhandledrejection', onRejection);
    },
  };
}
