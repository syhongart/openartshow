// world2/ui/diag-badge.ts — **감독이 폰에서 직접 판별할 수 있게 하는 것.**
//
// ── 왜 만드는가 (2026-07-30) ─────────────────────────────────────────────────
// 가로등 블룸이 밤에 통째로 꺼져 있었다. 감독 실기기 화면에서 `?bloom=0`(대조군)과
// 기본이 **구별되지 않았고**, 감독은 *"둘다 꺼짐"* 이라고만 말할 수 있었다. 그 문장에서
// 원인까지 가는 데 내가 코드를 한참 읽어야 했다.
//
// 진단은 **이미 다 있었다** — `window.__world2.stats()` 에 `backend`·`postfx.on`·
// `postfx.failure`·`strength` 가 전부 실려 있다. 그런데 그것을 보려면 콘솔을 열어야 하고,
// 감독 기기는 폰이다. **잴 수 있는데 볼 수 없었던 것이다.**
//
// 감독이 앞서 방향을 말했다: *"너도 잘 체크하고 나도 체크할수있게 하면 어떨까?"*
// HUD·지도를 접을 수 있게 만든 것이 그 절반이고, 이것이 나머지 절반이다.
//
// ── 왜 기본으로 켜지 않는가 ─────────────────────────────────────────────────
// 이 화면의 목적은 **캡처**다(감독이 지도를 접게 한 이유). 진단이 상시로 떠 있으면 그
// 목적을 정면으로 방해한다. `?diag=1` 로만 켠다 — 문제를 볼 때만 켜는 도구다.
//
// ── 무엇을 보여주는가 ───────────────────────────────────────────────────────
// **"이게 왜 안 보이나" 에 답하는 값만.** 전부 쏟아내면 폰 화면에서 읽을 수 없고, 읽을 수
// 없는 진단은 없는 진단과 같다(그것이 이번 사고의 교훈이다).
//
//   backend   WebGPU 인가 — 블룸이 켜지는 **전제**다. WebGL 이면 의도적으로 안 켠다
//             (TSL 후보정이 WebGL 백엔드에서 부팅을 깨뜨린다)
//   time      판정된 시간대. "낮이라 0" 과 "고장이라 0" 을 구별한다
//   bloom     on/off + 세기. `failure` 가 있으면 그 이유를 그대로 적는다
//   water     강 판이 덮은 파셀 수. 0 이면 강이 안 보인다
//   draw      드로우콜 — 이 아키텍처가 상수로 지키기로 한 값이다. 프레임 시간을 적지
//             않는 것은 의도다(감독 기기와 헤드리스가 다르고, 개수가 원인이다)
//
// 값의 **출처는 `stats()` 하나다.** 여기서 따로 계산하면 그것이 값 미러링이고, 화면과
// 실제가 갈리는 순간 이 배지는 거짓말을 하는 장치가 된다.

/** `stats()` 에서 우리가 읽는 부분만. 나머지는 알 필요가 없다 */
interface DiagSnapshot {
  backend?: unknown;
  frame?: { draw?: unknown } | null;
  postfx?: { on?: unknown; failure?: unknown; strength?: unknown; time?: unknown } | null;
  ocean?: { riverParcels?: unknown } | null;
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
 * `snapshot` 은 `window.__world2.stats()` 를 그대로 넘긴다. 이 모듈이 씬·렌더러를 모르는
 * 것이 중요하다 — 진단의 출처는 한 곳이어야 하고, 여기가 두 번째 출처가 되면 안 된다.
 */
export function attachDiagBadge(doc: Document, snapshot: () => DiagSnapshot): DiagBadge | null {
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
    let s: DiagSnapshot;
    try {
      s = snapshot();
    } catch (err) {
      box.textContent = `진단 실패: ${String(err).slice(0, 60)}`;
      return;
    }

    const pf = s.postfx ?? null;
    // 블룸 줄이 이 배지의 존재 이유다. 세 값을 함께 적어야 "안 켜졌다" 와 "켜졌는데
    // 세기가 0" 이 갈린다 — 그 둘을 구별할 수 없었던 것이 이번 사고의 진단 지연 원인이다.
    const bloom = pf
      ? (pf.failure
        ? `off — ${String(pf.failure).slice(0, 48)}`
        : `${pf.on ? 'on' : 'off'} · 세기 ${show(pf.strength)}`)
      : '기능 없음';

    box.textContent = [
      `backend  ${show(s.backend)}`,
      `시간대    ${show(pf?.time)}`,
      `블룸      ${bloom}`,
      `강 파셀   ${show(s.ocean?.riverParcels)}`,
      `드로우콜  ${show(s.frame?.draw)}`,
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
