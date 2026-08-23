// world2/ui/venue-prompt.ts — 「전시장 들어가기」 안내. 밖에서 건물에 다가가면 뜬다.
//
// 감독 판정 2026-08-22: 진입은 **씬 전환**이고, 그 전환은 이 저장소의 확립된 처방을
// 그대로 쓴다 — *"이동은 주소를 바꿔 페이지를 다시 여는 것"*(`decide/tenant-entry.ts`).
//
// ── 이 파일은 무엇을 보여줄지 정하지 않는다 ───────────────────────────────
// 표시 여부·문구·갈 곳은 전부 `decide/venue-entry.ts` 가 판정한 `VenueEntryView` 로
// 받는다. 여기 조건문을 하나라도 더 두면 그 분기는 **노드가 못 도는 자리**에 생기고,
// 안 도는 코드는 검사되지 않는다(`ui/tenant-bar.ts` 가 같은 이유를 적고 있다).
//
// ── 매 프레임이 아니라 주기 폴링이다 ──────────────────────────────────────
// 진입 판정은 걷는 속도(2.6~4.6 m/s)에 대해 0.2초면 0.5~0.9m 마다다 — 사람이 문 앞에
// 서는 것을 놓칠 수 없는 간격이고, 커널 파이프라인에 System 을 하나 더 얹지 않아도 된다.
// 위치·건물은 **게터로 주입**받는다(전역을 만지면 이 파일을 노드에서 못 돌린다).
import { venueEntryView, type VenueEntryView } from '../decide/venue-entry.js';

export interface VenuePromptDeps {
  /** 주소의 `?u=` 로 정해진 작가. null 이면 안내가 뜨지 않는다(갈 곳이 없다). */
  readonly tenant: string | null;
  /** 관람객 현재 위치. 없으면 null */
  readonly player: () => { x: number; z: number } | null;
  /** 건물 진입 지점과 반경. 아직 안 떴으면 null */
  readonly venue: () => { x: number; z: number; radius: number } | null;
  /** 주소 이동. 주입하지 않으면 `location.assign`(테스트가 이 파일을 돌릴 수 있게) */
  readonly navigate?: (href: string) => void;
  /** 폴링 간격(ms). 테스트가 0 을 주면 타이머를 걸지 않는다. */
  readonly intervalMs?: number;
}

export interface VenuePrompt {
  /** 지금 상태로 한 번 갱신한다. 테스트는 타이머 없이 이것만 부른다. */
  refresh(): VenueEntryView;
  /**
   * 마지막 판정. **진단용이다** — 「왜 안 뜨지」를 화면에서 가를 수 있어야 한다.
   * 안 뜨는 이유가 넷이고(건물 미로드 / 위치 없음 / 갈 곳 없음 / 멀다) 화면에서는
   * 넷 다 「없다」로 똑같이 보인다. `distance` 가 그것을 가른다.
   */
  readonly view: VenueEntryView | null;
  dispose(): void;
}

const CSS = [
  'position:fixed', 'left:50%', 'bottom:calc(18px + env(safe-area-inset-bottom,0px))',
  'transform:translateX(-50%)', 'z-index:8', 'display:none',
  'padding:11px 20px', 'border-radius:999px', 'border:1px solid rgba(255,255,255,.22)',
  'background:rgba(18,18,22,.78)', '-webkit-backdrop-filter:blur(10px)', 'backdrop-filter:blur(10px)',
  'color:#f4f2ee', 'font:600 14px/1.2 Pretendard,"Apple SD Gothic Neo",system-ui,sans-serif',
  'letter-spacing:-.01em', 'cursor:pointer', 'box-shadow:0 6px 22px rgba(0,0,0,.34)',
].join(';');

/** 안내를 붙이고 주기적으로 갱신한다. */
export function mountVenuePrompt(doc: Document, deps: VenuePromptDeps): VenuePrompt {
  const btn = doc.createElement('button');
  btn.type = 'button';
  btn.setAttribute('style', CSS);
  btn.setAttribute('aria-live', 'polite');
  const go = deps.navigate ?? ((href: string) => { doc.defaultView?.location.assign(href); });
  let current: VenueEntryView | null = null;
  btn.addEventListener('click', () => { if (current?.href) go(current.href); });
  doc.body.appendChild(btn);

  function refresh(): VenueEntryView {
    const v = deps.venue();
    const view = venueEntryView({
      player: deps.player(),
      entry: v ? { x: v.x, z: v.z } : null,
      radius: v ? v.radius : 0,
      tenant: deps.tenant,
    });
    current = view;
    btn.style.display = view.show ? 'block' : 'none';
    if (view.show && btn.textContent !== view.label) btn.textContent = view.label;
    return view;
  }

  refresh();
  const every = deps.intervalMs ?? 200;
  const timer = every > 0 && typeof setInterval !== 'undefined' ? setInterval(refresh, every) : null;

  return {
    refresh,
    get view() { return current; },
    dispose() {
      if (timer !== null) clearInterval(timer);
      btn.remove();
    },
  };
}
