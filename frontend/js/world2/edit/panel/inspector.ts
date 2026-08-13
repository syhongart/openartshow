// world2/edit/panel/inspector.ts — 선택한 것의 **수치를 직접 친다.**
//
// 감독 카드 선택(2026-08-12): 기즈모·되돌리기·목록·시점 전환과 함께 **수치 입력**.
//
// ── 왜 필요한가 — 기즈모가 못 하는 일이 있다 ────────────────────────────────
// 드래그는 «대충 저기» 는 빠르지만 «정확히 12.5» 는 못 한다. 축 정렬(두 건물을 같은 x 에
// 세우기)·미러 배치·정확한 90° 회전은 수로만 된다. 둘은 경쟁이 아니라 짝이다.
//
// ── 함정 하나 — refresh 가 타이핑을 지운다 ──────────────────────────────────
// 편집의 거의 모든 동작이 끝에 `refresh()` 를 부르고, 그것이 입력칸을 현재 값으로
// 되쓰면 **치는 도중에 글자가 사라진다.** 특히 기즈모 드래그는 프레임마다 refresh 를
// 부르므로, 값을 치다가 실수로 화면을 건드리면 입력이 통째로 날아간다.
// 그래서 **포커스가 있는 칸은 건드리지 않는다**(아래 `sync`).

import type { OverlayEntry, OverlayHost } from '../types.js';
import type { EditState } from '../state.js';

/** 한 줄짜리 수치 칸의 정의. 읽기와 쓰기를 짝으로 둔다 — 한쪽만 고치면 조용히 어긋난다 */
interface Field {
  key: string;
  label: string;
  /** 항목 → 화면에 보일 수 */
  get(e: OverlayEntry): number;
  /** 화면의 수 → 항목. 범위 밖이면 아무것도 안 한다 */
  set(e: OverlayEntry, v: number): void;
  /** 소수 몇 자리로 보일 것인가 */
  digits: number;
  step: number;
}

const DEG = 180 / Math.PI;

const FIELDS: readonly Field[] = [
  { key: 'x', label: 'X', get: (e) => e.x, set: (e, v) => { e.x = v; }, digits: 2, step: 0.5 },
  { key: 'y', label: 'Y', get: (e) => e.y, set: (e, v) => { e.y = v; }, digits: 2, step: 0.25 },
  { key: 'z', label: 'Z', get: (e) => e.z, set: (e, v) => { e.z = v; }, digits: 2, step: 0.5 },
  // 회전만 **도(°)** 로 보여 준다 — 라디안을 치라고 하면 «90도» 를 넣을 방법이 없다.
  {
    key: 'ry', label: '°', digits: 1, step: 15,
    get: (e) => e.ry * DEG,
    set: (e, v) => { e.ry = v / DEG; },
  },
  {
    key: 's', label: '×', digits: 3, step: 0.1,
    get: (e) => e.s,
    // 상·하한은 계약(`S_MIN`·`S_MAX`)이 소유한다. 여기서 값을 다시 적지 않고, 범위를
    // 벗어난 입력은 **버린다** — 조용히 잘라 넣으면 감독이 친 수와 화면이 달라진다.
    set: (e, v) => { if (v > 0) e.s = v; },
  },
];

export interface Inspector {
  readonly root: HTMLElement;
  /** 선택·값이 바뀌었을 때. **포커스가 있는 칸은 안 건드린다** */
  sync(e: OverlayEntry | null): void;
}

export function createInspector(
  host: OverlayHost,
  st: EditState,
  onChanged: () => void,
): Inspector {
  const doc = host.doc;
  const root = doc.createElement('div');
  root.className = 'row insp';

  const inputs = new Map<string, HTMLInputElement>();

  for (const f of FIELDS) {
    const wrap = doc.createElement('label');
    wrap.className = 'fld';
    const tag = doc.createElement('span');
    tag.textContent = f.label;
    const inp = doc.createElement('input');
    inp.type = 'number';
    inp.step = String(f.step);
    inp.inputMode = 'decimal';
    // 편집키(Q/E/R/F/Z/X·Delete)는 `input.ts` 가 INPUT 을 걸러내므로 여기서 또 막지
    // 않는다 — 값 미러링을 만들지 않는다.

    const commit = () => {
      if (!st.selected) return;
      // ⚠ **빈 칸을 먼저 막는다 — `Number('')` 는 `0` 이고 그것은 finite 다.**
      // `type=number` 는 중간 입력을 담지 못한다: 사용자가 `-` 나 `7.` 를 치는 순간
      // 브라우저가 value 를 **빈 문자열로 바꾼다**(유효한 부동소수점이 아니라서).
      // 그래서 «지우고 다시 친다» 라는 가장 흔한 동작에서 좌표가 **0 으로 튀고**, 물건이
      // 원점으로 순간이동한다. `isFinite` 만으로는 안 걸린다 — 테스트가 잡았다.
      if (inp.value.trim() === '') return;
      const v = Number(inp.value);
      if (!Number.isFinite(v)) return;
      f.set(st.selected, v);
      host.apply(st.selected);
      onChanged();
    };
    inp.addEventListener('input', commit);
    // Enter 는 «다 쳤다» 는 신호다 — 포커스를 놓아 `sync` 가 정규화된 값을 되쓰게 한다.
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') inp.blur(); });

    inputs.set(f.key, inp);
    wrap.append(tag, inp);
    root.append(wrap);
  }

  return {
    root,
    sync(e: OverlayEntry | null): void {
      const on = e !== null;
      for (const f of FIELDS) {
        const inp = inputs.get(f.key);
        if (!inp) continue;
        inp.disabled = !on;
        // ⚠ **치는 중인 칸은 건드리지 않는다.** 이걸 빼면 드래그 중 refresh 가 프레임마다
        // 입력을 되써서 타이핑이 불가능해진다.
        if (doc.activeElement === inp) continue;
        inp.value = on ? f.get(e).toFixed(f.digits) : '';
      }
    },
  };
}
