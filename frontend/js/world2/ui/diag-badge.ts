// world2/ui/diag-badge.ts — **감독이 폰에서 직접 판별할 수 있게 하는 것.**
//
// ── 왜 만드는가 (2026-07-30) ─────────────────────────────────────────────────
// 가로등 블룸이 밤에 통째로 꺼져 있었다. 감독 실기기 화면에서 `?bloom=0`(대조군)과
// 기본이 **구별되지 않았고**, 감독은 *"둘다 꺼짐"* 이라고만 말할 수 있었다. 그 문장에서
// 원인까지 가는 데 내가 코드를 한참 읽어야 했다.
//
// 진단은 **이미 다 있었다** — `window.__world2.stats()` 에 전부 실려 있다. 그런데 그것을
// 보려면 콘솔을 열어야 하고, 감독 기기는 폰이다. **잴 수 있는데 볼 수 없었던 것이다.**
//
// 감독이 앞서 방향을 말했다: *"너도 잘 체크하고 나도 체크할수있게 하면 어떨까?"*
// HUD·지도를 접을 수 있게 만든 것이 그 절반이고, 이것이 나머지 절반이다.
//
// ── 이 파일은 기능 이름을 하나도 모른다 ─────────────────────────────────────
// **첫 판본은 그것을 어겼다.** 진단 스냅샷에서 기능 이름으로 필드를 직접 골라 읽었는데,
// 그러면 `features/index.ts` 에서 한 줄을 지워도 **배지에 그 이름이 남는다.** 규약("기능을
// 빼면 그 기능에 관한 모든 것이 함께 빠진다")을 정면으로 깬 것이고, 기능별 참조자 검사가
// 그것을 잡았다 — 주석에 적은 이름까지 걸렸고, 그 엄격함이 옳다.
//
// 이제 배지는 **문자열 배열만** 받는다. 무엇을 실을지는 각 기능이 `badgeLine()` 으로
// 스스로 고른다 — `diagnostics` 와 같은 배치다. 기능이 늘어도 이 파일은 안 바뀐다.
//
// ── 왜 기본으로 켜지 않는가 ─────────────────────────────────────────────────
// 이 화면의 목적은 **캡처**다(감독이 지도를 접게 한 이유). 진단이 상시로 떠 있으면 그
// 목적을 정면으로 방해한다. `?diag=1` 로만 켠다 — 문제를 볼 때만 켜는 도구다.
//
// ── 왜 다섯 줄 남짓인가 ─────────────────────────────────────────────────────
// 감독 화면은 320×519 다. 전부 쏟아내면 읽을 수 없고, **읽을 수 없는 진단은 없는 진단과
// 같다** — 그것이 이번 사고의 교훈이므로 여기서 되풀이하지 않는다.

/**
 * 배지가 커널에서 직접 읽는 것. **기능이 아니라 커널이 소유한 값만** 여기 있다.
 *
 * `backend` 는 WebGPU 인가를 말한다 — 이 저장소의 열린 사각(헤드리스로 검증 불가)이
 * 전부 그 값에 달려 있어 어느 문제를 보든 첫 줄에 있어야 한다.
 * `draw` 는 이 아키텍처가 상수로 지키기로 한 값이다. 프레임 시간은 **안 적는다**
 * (감독 기기와 헤드리스가 다르고, 원인은 개수다).
 */
export interface DiagCore {
  backend?: unknown;
  frame?: { draw?: unknown } | null;
}

export interface DiagBadge {
  /** 한 번 갱신한다 — 테스트가 프레임 루프 없이 값을 확인할 수 있게 열어 둔다 */
  refresh(): void;
  dispose(): void;
}

/** 갱신 주기(ms). 매 프레임 DOM 을 만지면 그 자체가 부하다 — 사람이 읽는 속도면 충분하다 */
const PERIOD = 500;

/** `?diag=1` 일 때만 켠다 */
function wanted(): boolean {
  if (typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).get('diag') === '1';
}

/**
 * 값 하나를 사람이 읽는 한 줄로. `undefined` 를 빈칸으로 흘리지 않는다 —
 * **"측정 안 됨" 과 "0" 은 다른 일이다.**
 */
function show(v: unknown): string {
  if (v === undefined || v === null) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}

/**
 * 진단 배지를 붙인다. `?diag=1` 이 아니면 `null` — 호출부가 조건을 알 필요가 없다.
 *
 * `core` 는 커널 소유 값, `lines` 는 기능들이 스스로 내놓은 줄이다. 둘을 나눈 것이
 * 이 파일이 기능 이름을 모르게 하는 장치다.
 */
export function attachDiagBadge(
  doc: Document,
  core: () => DiagCore,
  lines: () => readonly string[] = () => [],
): DiagBadge | null {
  if (!wanted()) return null;

  const box = doc.createElement('div');
  box.id = 'w2-diag';
  box.setAttribute('role', 'status');
  // 스타일을 JS 로 준다 — 인라인 `style="..."` 문자열은 CSP 의 `style-src` 대상이지만
  // CSSOM 대입은 아니다. 자기완결 규율(외부 CSS 0)과도 맞는다.
  Object.assign(box.style, {
    position: 'fixed',
    left: '8px',
    bottom: '8px',
    zIndex: '90',
    padding: '6px 8px',
    borderRadius: '6px',
    background: 'rgba(10,10,14,0.82)',
    color: '#e8e6e1',
    font: '11px/1.5 ui-monospace, monospace',
    whiteSpace: 'pre',
    pointerEvents: 'none',
    maxWidth: 'calc(100vw - 16px)',
    overflow: 'hidden',
  });
  doc.body.appendChild(box);

  function refresh(): void {
    // 진단을 읽다가 터지면 **화면이 멎는다.** 이 배지는 있으면 좋은 것이고 월드는 필수다
    // — `postfx` 가 렌더 훅에서 같은 판단을 한 것과 같은 이유다.
    let c: DiagCore;
    let ls: readonly string[];
    try {
      c = core();
      ls = lines();
    } catch (err) {
      box.textContent = `진단 실패: ${String(err).slice(0, 60)}`;
      return;
    }

    box.textContent = [
      `backend  ${show(c.backend)}`,
      `드로우콜  ${show(c.frame?.draw)}`,
      ...ls,
    ].join('\n');
  }

  refresh();
  const timer = setInterval(refresh, PERIOD);

  return {
    refresh,
    dispose() {
      clearInterval(timer);
      box.remove();
    },
  };
}
