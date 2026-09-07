// world-glb/ui/glb-checklist-panel.ts — 자가진단 결과를 화면에 띄운다. **판정은 안 한다.**
//
// 판정은 `decide/glb-checklist.ts` 가 소유한다(순수 함수·DOM 접촉 0). 이 파일은 그
// 결과를 그리기만 한다 — 조립을 UI 안에 인라인하면 **어떤 검사도 안 닿는다**는 것을
// 이 트리는 `import-notice.ts` 회차에 실측으로 배웠다(판정을 바꿔도 4,785건 중 0건이
// 깨졌다). 그래서 같은 형태를 지킨다.
//
// ⚠ **world7 에만 뜬다** — 감독 지시 2026-08-28 *"당분간.. 월드7에만.."*. 그 분기는
// `options.ts` 의 `checklist` 플래그이고 `world7-boot.ts` 만 켠다. `tag` 로 갈라 짜지
// 않는 이유는 그 파일의 경계 조항이다(*"`if (tag === …)` 가 두 곳을 넘는 순간 그것이
// 포크 시점"* — 지금 그 분기는 **0곳**이고, 여기서 처음 늘리지 않는다).

import type { ChecklistItem, ChecklistState, ChecklistInput } from '../decide/glb-checklist.js';
import { summarize, buildChecklist } from '../decide/glb-checklist.js';
import type { BootErrorLog } from '../systems/boot-error-log.js';

/** 상태 → 표식. `na`·`unknown` 을 ✅ 로 뭉개지 않는 것이 이 표의 요점이다 */
const MARK: Record<ChecklistState, string> = {
  ok: '✅', warn: '⚠️', unknown: '❓', na: '—',
};
const COLOR: Record<ChecklistState, string> = {
  ok: '#7fd88f', warn: '#ffcf6b', unknown: '#9aa4b2', na: '#6b7280',
};

export interface ChecklistPanel {
  /** 결과를 다시 그린다 */
  show(items: readonly ChecklistItem[]): void;
  dispose(): void;
}

/**
 * 패널을 만든다. **바로 뜨지는 않는다** — `show()` 를 불러야 보인다.
 *
 * ⚠ 닫아도 **사라지지 않고 접힌다.** 다시 펼 수 있어야 「아까 뭐가 노랬더라」에 답한다.
 */
export function createChecklistPanel(mount: HTMLElement): ChecklistPanel {
  const root = document.createElement('div');
  root.id = 'wg-checklist';
  root.style.cssText = [
    'position:absolute', 'left:12px', 'top:64px', 'z-index:40',
    'max-width:min(360px, calc(100vw - 24px))',
    'background:rgba(16,18,24,.92)', 'color:#e8ecf2',
    'border:1px solid rgba(255,255,255,.14)', 'border-radius:12px',
    'font:13px/1.5 system-ui, -apple-system, sans-serif',
    'box-shadow:0 8px 28px rgba(0,0,0,.45)',
    'display:none', 'overflow:hidden',
  ].join(';');

  const head = document.createElement('button');
  head.type = 'button';
  head.style.cssText = [
    'all:unset', 'box-sizing:border-box', 'display:flex', 'width:100%',
    'align-items:center', 'gap:8px', 'padding:10px 12px', 'cursor:pointer',
    'font-weight:600',
  ].join(';');
  const headText = document.createElement('span');
  const caret = document.createElement('span');
  caret.textContent = '▾';
  caret.style.cssText = 'margin-left:auto;opacity:.6;font-size:11px';
  head.append(headText, caret);

  const body = document.createElement('div');
  body.style.cssText = 'padding:0 12px 10px;display:grid;gap:7px';

  const foot = document.createElement('div');
  foot.style.cssText = [
    'padding:8px 12px', 'border-top:1px solid rgba(255,255,255,.08)',
    'color:#9aa4b2', 'font-size:11px',
  ].join(';');
  // ⚠ **이 화면이 무엇을 «못» 보는지 적는다.** 초록만 보고 「다 됐다」로 읽히면
  // 이 저장소가 반복해서 당한 «못 잰 것이 통과로 적히는» 형태가 화면에서 재현된다.
  foot.textContent = '화면이 실제로 맞는지는 눈으로 봐야 합니다 — 이 표는 수치만 봅니다.';

  let open = true;
  const sync = () => {
    body.style.display = open ? 'grid' : 'none';
    foot.style.display = open ? 'block' : 'none';
    caret.textContent = open ? '▾' : '▸';
  };
  head.addEventListener('click', () => { open = !open; sync(); });

  root.append(head, body, foot);
  mount.appendChild(root);

  return {
    show(items) {
      const s = summarize(items);
      headText.textContent = `불러오기 점검 — ${s.text}`;
      headText.style.color = s.ok ? '#7fd88f' : '#ffcf6b';
      body.replaceChildren();
      for (const it of items) {
        const row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:18px 1fr;gap:8px;align-items:start';
        const mark = document.createElement('span');
        mark.textContent = MARK[it.state];
        mark.style.cssText = 'line-height:1.5';
        const text = document.createElement('div');
        const name = document.createElement('div');
        name.textContent = it.label;
        name.style.cssText = `color:${COLOR[it.state]};font-weight:600`;
        const detail = document.createElement('div');
        detail.textContent = it.detail;
        detail.style.cssText = 'color:#c3cad4;font-size:12px';
        text.append(name, detail);
        if (it.hint) {
          const hint = document.createElement('div');
          hint.textContent = it.hint;
          hint.style.cssText = 'color:#8d96a3;font-size:11px;margin-top:2px';
          text.appendChild(hint);
        }
        row.append(mark, text);
        body.appendChild(row);
      }
      // 접혀 있었어도 새 결과가 오면 편다 — 감독이 파일을 새로 올린 것이므로.
      open = true;
      sync();
      root.style.display = 'block';
    },
    dispose() { root.remove(); },
  };
}

/** `__glbWorld.stats()` 가 주는 모양 중 체크리스트가 읽는 것만 */
interface GlbWorldHooks {
  stats(): {
    glb: ChecklistInput['glb'];
    glbStream: ChecklistInput['stream'];
    glbMap: ChecklistInput['map'];
    pipelines: number;
  };
  ahead(n: number): readonly { d: number; name: string }[];
  timeline: readonly { stage: string; atMs: number }[];
}

/**
 * **부팅 직후 자가진단을 띄운다.** 호출자는 `world-glb/main.ts` 이고(부트 파일이 아니다 —
 * 부트는 `options.checklist` 를 켜기만 한다, 검수관 권고 P1), 「world7 에만」은 그
 * 플래그가 가른다. `tag` 로 갈라 짜지 않는 이유는 `options.ts` 의 경계 조항이다.
 *
 * ⚠ **`__glbWorld` 훅을 읽는다** — 같은 값을 두 번 조립하지 않기 위해서다(한쪽만
 * 고쳐도 아무도 모르는 그 형태). 그래서 부팅 «후» 에 부른다.
 *
 * ⚠⚠ **두 번째 인자가 숫자가 아닌 것은 사고 때문이다**(검수관 블로커 B1). 여기가
 * `errors: number` 였을 때 호출자가 넘기던 변수는 **구조적으로 항상 0** 이었고, 그래서
 * 「에러 없음」 말고는 나올 수 없는 칸이었다. 타입을 수집기로 바꾸면 그 자리에 아무
 * 카운터나 넣는 것이 컴파일 에러가 된다 — 경위는 `systems/boot-error-log.ts` 헤더.
 *
 * ⚠⚠⚠ **던지지 않는다.** 진단이 세계를 죽이면 본말전도다.
 */
export function showBootChecklist(mount: HTMLElement, log: BootErrorLog): ChecklistPanel | null {
  try {
    const hooks = (globalThis as unknown as { __glbWorld?: GlbWorldHooks }).__glbWorld;
    if (!hooks) return null;
    const s = hooks.stats();
    const panel = createChecklistPanel(mount);
    panel.show(buildChecklist({
      glb: s.glb, stream: s.glbStream, map: s.glbMap, pipelines: s.pipelines,
      ahead: hooks.ahead(4), timeline: hooks.timeline, errors: log.labels,
    }));
    return panel;
  } catch (err) {
    console.error('[glb-world] 체크리스트 실패', err);
    return null;
  }
}
