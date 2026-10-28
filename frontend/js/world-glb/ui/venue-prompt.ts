// world-glb/ui/venue-prompt.ts — 「전시장 들어가기」 안내. 밖에서 건물에 다가가면 뜬다.
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
  /**
   * 들어갈 **전시장(갤러리) id**. 아직 못 정했으면 null.
   *
   * ⚠ 게터인 이유 — 갤러리 목록은 `galleries/index.json` 을 읽어 정하므로 마운트 시점에
   * 아직 없다. 값으로 넘기면 「영영 안 뜬다」가 된다(위치·건물과 같은 이유).
   *
   * ⚠⚠ **world2 의 `?u=` 와 다른 개념이다.** 저쪽은 「마을 땅 주인」이고 대장에 등록돼야
   * 하며, 이쪽은 「어느 전시를 여는가」다. 이름이 같아서 처음에 이 안내를 world2 테넌트에
   * 묶었고, 그 결과 `?u=` 를 붙여야만 들어갈 수 있게 됐다 — 감독 지적 2026-08-23:
   * *"이게 왜 있어? GLB문앞에서 들어가져야지."* 건물 앞이면 주소와 무관하게 들어간다.
   */
  readonly tenant: () => string | null;
  /** 관람객 현재 위치. 없으면 null */
  readonly player: () => { x: number; z: number } | null;
  /** 건물 진입 지점과 반경. 아직 안 떴으면 null */
  readonly venue: () => { x: number; z: number; radius: number } | null;
  /** 주소 이동. 주입하지 않으면 `location.assign`(테스트가 이 파일을 돌릴 수 있게) */
  readonly navigate?: (href: string) => void;
  /** 폴링 간격(ms). 테스트가 0 을 주면 타이머를 걸지 않는다. */
  readonly intervalMs?: number;
  /**
   * 전환 암전 길이(ms). 0 이면 즉시 이동한다(테스트·모션 감소 설정).
   *
   * 감독 지적 2026-08-24: *"들어가기 하면 팍 들어가는데.. 디졸브로 보여주면 어떨까?"*
   * 페이지가 통째로 바뀌는 이동이라(주소를 바꿔 다시 여는 것 — `decide/tenant-entry.ts`)
   * 아무 연출이 없으면 화면이 한 번에 갈린다. 나가는 쪽을 어둠으로 덮고 넘긴다.
   */
  readonly fadeMs?: number;
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
  // ── 전환: 어둠으로 덮고 넘어간다 ─────────────────────────────────────────
  // 들어가는 쪽(`visit.html`)은 자기 CSS 로 밝아지므로 여기서는 **나가는 쪽만** 맡는다.
  // 양쪽을 한 스크립트가 잡으려면 페이지를 넘어 상태를 옮겨야 하는데, 이 저장소의 이동은
  // 「주소를 바꿔 다시 여는 것」이라 그 상태가 남지 않는다(sessionStorage 를 쓰면 되지만
  // 뒤로가기·직접입력에서 유령 암전이 생긴다 — 각자 자기 쪽만 맡는 편이 단순하고 안전하다).
  const reduced = () => {
    try { return !!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; }
    catch { return false; }
  };
  btn.addEventListener('click', () => {
    const href = current?.href;
    if (!href) return;
    const ms = deps.fadeMs ?? 420;
    if (ms <= 0 || reduced()) { go(href); return; }   // 모션 감소 설정이면 연출을 건너뛴다
    const veil = doc.createElement('div');
    veil.setAttribute('style', [
      'position:fixed', 'inset:0', 'z-index:9999', 'background:#000',
      'opacity:0', `transition:opacity ${ms}ms ease-in`, 'pointer-events:none',
    ].join(';'));
    doc.body.appendChild(veil);
    // 다음 프레임에 값을 바꿔야 transition 이 걸린다(같은 프레임에 바꾸면 즉시 적용된다).
    const raf = doc.defaultView?.requestAnimationFrame;
    const kick = () => { veil.style.opacity = '1'; };
    if (raf) raf.call(doc.defaultView, kick); else kick();
    doc.defaultView?.setTimeout(() => go(href), ms);
  });
  doc.body.appendChild(btn);

  function refresh(): VenueEntryView {
    const v = deps.venue();
    const view = venueEntryView({
      player: deps.player(),
      entry: v ? { x: v.x, z: v.z } : null,
      radius: v ? v.radius : 0,
      tenant: deps.tenant(),
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
