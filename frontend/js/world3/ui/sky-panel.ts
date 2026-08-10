// world2/ui/sky-panel.ts — 神 모드 하늘 패널(시간대·날씨·이벤트).
//
// 라이브 오픈월드(`world-boot.js`)의 배선을 world2로 옮긴 것이다. 엔진은 `sky.js`를 그대로
// 쓰므로 여기서 하는 일은 **버튼 → set() → 상태 반영** 세 줄뿐이다.
//
// ── 왜 get()으로 다시 읽어 표시하는가 ───────────────────────────────────────
// 버튼을 눌렀다고 그 상태가 되는 게 아니다. `sky.js`가 조합을 보정한다 — 예를 들어 야간에
// 무지개는 성립하지 않으므로 요청해도 무시된다. 눌린 버튼을 그대로 켜면 화면에 없는 것이
// 켜져 보이고, 그 어긋남은 "왜 안 나오지"로만 드러나 원인을 찾기 어렵다.
// **요청이 아니라 반영된 상태를 표시한다.**

/** `sky.js`가 노출하는 것 중 패널이 쓰는 부분만. */
export interface SkyEngine {
  set(state: Record<string, unknown>, opt?: { fade?: number }): void;
  /** 번개 즉시 발동. 비가 아니면 false를 돌려준다(요청이 무시됐다는 뜻). */
  bolt?(): boolean;
  get(): {
    time: string;
    weather: string;
    fx: Record<string, boolean>;
    flashSafe?: boolean;
  };
}

export interface SkyPanelParts {
  panel: HTMLElement;
  toggle: HTMLElement;
  body: HTMLElement;
}

export interface SkyPanel {
  /** 외부에서 상태가 바뀌었을 때(URL·자동 시간대 등) 버튼 표시를 다시 맞춘다. */
  sync(): void;
  dispose(): void;
}

/** 문서에서 패널 요소를 찾는다. 없으면 null — 패널 없이도 월드는 돈다. */
export function findSkyPanel(doc: Document): SkyPanelParts | null {
  const panel = doc.getElementById('w3-god');
  const toggle = doc.getElementById('w3-god-toggle');
  const body = doc.getElementById('w3-god-body');
  if (!panel || !toggle || !body) return null;
  return { panel, toggle, body };
}

/** 방문자 실제 시각 → 시간대. `sky.js`의 autoTimeOfDay와 같은 규칙이다. */
function autoTime(d = new Date()): string {
  const h = d.getHours();
  if (h >= 7 && h < 17) return 'day';
  if ((h >= 17 && h < 20) || (h >= 5 && h < 7)) return 'sunset';
  return 'night';
}

export function attachSkyPanel(parts: SkyPanelParts, engine: SkyEngine): SkyPanel {
  const { panel, toggle, body } = parts;

  const sync = () => {
    const s = engine.get();
    if (!s) return;
    const mark = (sel: string, on: (b: HTMLElement) => boolean) => {
      panel.querySelectorAll<HTMLElement>(sel).forEach((b) => b.classList.toggle('on', on(b)));
    };
    mark('button[data-time]', (b) => b.dataset.time === s.time);
    mark('button[data-weather]', (b) => b.dataset.weather === s.weather);
    mark('button[data-fx]', (b) => !!(s.fx && s.fx[b.dataset.fx as string]));
    mark('button[data-flash]', () => !!s.flashSafe);
  };

  const onToggle = () => {
    const open = panel.getAttribute('data-open') === '1';
    panel.setAttribute('data-open', open ? '0' : '1');
    toggle.setAttribute('aria-expanded', String(!open));
    body.hidden = open;
  };

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement | null;
    const b = t?.closest<HTMLElement>(
      'button[data-time],button[data-auto],button[data-weather],button[data-fx],'
      + 'button[data-flash],button[data-bolt]',
    );
    if (!b) return;
    const s = engine.get();
    if (b.dataset.time) engine.set({ time: b.dataset.time });
    else if (b.dataset.auto) engine.set({ time: autoTime() });
    else if (b.dataset.weather) engine.set({ weather: b.dataset.weather });
    // fx·flash는 현재 반영 상태 기준 토글이다(누른 횟수가 아니라).
    else if (b.dataset.fx) engine.set({ fx: { [b.dataset.fx]: !(s?.fx?.[b.dataset.fx]) } });
    else if (b.dataset.flash) engine.set({ flashSafe: !s?.flashSafe });
    else if (b.dataset.bolt) {
      // 비가 아니면 엔진이 무시한다. 눌렀는데 아무 일도 없으면 "왜 안 되지"가 되므로
      // 버튼을 잠깐 흐리게 해 요청이 반려됐음을 알린다.
      const ok = engine.bolt?.() ?? false;
      b.classList.toggle('off', !ok);
      setTimeout(() => b.classList.remove('off'), 700);
    }
    sync();
  };

  toggle.addEventListener('click', onToggle);
  panel.addEventListener('click', onClick);
  sync();

  return {
    sync,
    dispose() {
      toggle.removeEventListener('click', onToggle);
      panel.removeEventListener('click', onClick);
    },
  };
}
