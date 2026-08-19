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

import type { OverlayHost } from '../types.js';
import type { EditState } from '../state.js';
import type { EditTarget } from '../target.js';

/** 한 줄짜리 수치 칸의 정의. 읽기와 쓰기를 짝으로 둔다 — 한쪽만 고치면 조용히 어긋난다 */
interface Field {
  key: string;
  label: string;
  /** 대상 → 화면에 보일 수 */
  get(e: EditTarget): number;
  /** 화면의 수 → 대상. 범위 밖이면 아무것도 안 한다 */
  set(e: EditTarget, v: number): void;
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
  sync(e: EditTarget | null): void;
  /**
   * 크기 슬라이더 줄 (W8-11). 인스펙터 본체와 **다른 요소**라 조립이 따로 붙인다 —
   * 수치칸은 한 줄에 다섯이 나란한 격자이고 슬라이더는 가로로 긴 한 줄이라,
   * 같은 컨테이너에 넣으면 격자가 무너진다.
   *
   * `width` 를 안 내는 대상(GLB·마을 파츠)에서는 **줄이 통째로 숨는다** — 비활성
   * 슬라이더를 남기면 «왜 안 움직이지» 가 되고, 그것이 이 저장소가 「거짓 UI」라고
   * 부르는 형태다(`surface.ts` 의 읽기 전용 슬라이더 근거와 같다).
   */
  readonly sizeRow: HTMLElement;
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

  // ── 크기 슬라이더 (W8-11) ──────────────────────────────────────────────────
  // 감독 카드 판정(2026-08-18): **슬라이더·숫자**(끌기는 나중). 위 `×` 수치칸이 「정확히
  // 얼마」를 맡고 이 줄이 「훑어서 찾는다」를 맡는다 — `surface.ts` 의 배율 슬라이더가
  // 같은 근거로 range 를 골랐다(*"«촘촘히» 를 찾는 동작은 값을 아는 것이 아니라 훑는 것"*).
  const sizeRow = doc.createElement('div');
  sizeRow.className = 'surf-row size-row';
  const sizeLbl = doc.createElement('span');
  sizeLbl.className = 'lbl';
  sizeLbl.textContent = '크기';
  const sizeIn = doc.createElement('input');
  sizeIn.type = 'range';
  // ⚠ **`step` 은 범위에서 유도하지 않는다.** 0.01m = 1cm 가 감독이 손으로 맞추는
  // 최소 단위이고, 범위가 바뀌어도 그 감각은 안 바뀐다. 범위로 나누면 상한을 늘리는
  // 순간 손잡이가 거칠어진다.
  sizeIn.step = '0.01';
  const sizeVal = doc.createElement('span');
  sizeVal.className = 'num';
  sizeRow.append(sizeLbl, sizeIn, sizeVal);
  sizeIn.addEventListener('input', () => {
    const w = st.target?.width;
    if (!st.target || !w) return;
    w.set(Number(sizeIn.value));
    // 드래그하는 내내 `apply` 만 — 확정은 손을 뗄 때 한 번이다. 여기서 `commit` 을
    // 부르면 `place()` 전체 대체가 프레임마다 돌아 지오·재질이 죽고 태어난다
    // (`target.ts` 의 `artTarget` 헤더가 그 근거를 소유한다).
    st.target.apply();
    sizeVal.textContent = `${w.get().toFixed(2)}m`;
  });
  // `change` 는 손을 뗐을 때 온다 — 그것이 이 슬라이더의 「확정」이다.
  sizeIn.addEventListener('change', () => {
    if (!st.target?.width) return;
    st.target.commit();
    onChanged();
  });

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
      if (!st.target) return;
      // ⚠ **빈 칸을 먼저 막는다 — `Number('')` 는 `0` 이고 그것은 finite 다.**
      // `type=number` 는 중간 입력을 담지 못한다: 사용자가 `-` 나 `7.` 를 치는 순간
      // 브라우저가 value 를 **빈 문자열로 바꾼다**(유효한 부동소수점이 아니라서).
      // 그래서 «지우고 다시 친다» 라는 가장 흔한 동작에서 좌표가 **0 으로 튀고**, 물건이
      // 원점으로 순간이동한다. `isFinite` 만으로는 안 걸린다 — 테스트가 잡았다.
      if (inp.value.trim() === '') return;
      const v = Number(inp.value);
      if (!Number.isFinite(v)) return;
      f.set(st.target, v);
      st.target.apply();
      // ⚠ **수치칸은 타이핑 한 글자마다 확정한다 — 단 액자는 예외다.**
      //
      // 원래 규약: 드래그와 달리 «손을 떼는 순간» 이 없으므로 `blur` 를 기다리면 값을
      // 치고 다른 데를 클릭할 때까지 마을 파셀이 안 바뀌고, 그 사이 화면과 수치가 다른
      // 것을 말한다. 마을에서는 이것이 곧 파셀 재빌드라 타이핑 중 건물이 깜빡이는데,
      // 그 대가를 아는 채로 고른 것이다.
      //
      // 🔴 **액자에서는 그 거래가 성립하지 않는다**(검수관 재검수 B-1 조건 ③, 2026-08-19).
      // 액자의 `commit()` 은 `port.set()` → `place()` 를 태우고, 그것이 `clearPlaced()` 로
      // **모든 액자의 지오·재질을 dispose 하고 다시 만든다.** 「12.5」를 치면 네 글자에
      // 전량 재생성이 네 번이다 — 마을의 「한 파셀 재빌드」와 규모가 다르다.
      //
      // 그리고 **미룰 수 있다**: 액자는 `apply()` 가 씬을 즉시 맞추므로(`retarget`)
      // **화면은 이미 맞다.** 원래 규약이 막으려던 「화면과 수치가 다른 것을 말한다」가
      // 액자에서는 애초에 안 생긴다. 그래서 확정만 `change`(=blur) 로 미룬다.
      //
      // ⚠⚠ **그 문장에는 경계가 있다 — 「다른 경로가 `place()` 를 태우기 전까지」다**
      // (검수관 3차 권고 P-1, 실측 근거 아래). `apply()` 는 **씬만** 밀고 목록은 안
      // 건드리므로, 그 사이에 누가 `port.set()` 을 부르면 `place()` 가 **목록 기준으로**
      // 씬을 다시 세우고 확정 안 된 값은 화면에서도 사라진다:
      //
      //   a 를 6m 로 밀고(확정 없이) → b 를 확정  ⇒  목록·화면 모두 a: 2.4m, b: 5m
      //   값을 치고 blur 없이 선택을 풀면          ⇒  그 값은 목록에 안 남는다
      //
      // 즉 「화면이 이미 맞다」는 **확정까지의 짧은 창 안에서만** 참이다. 그래도 이 규약을
      // 유지하는 이유: 실제 브라우저에서 다른 컨트롤을 누르면 `mousedown` → `blur` →
      // `change` 가 **선택 변경보다 먼저** 오고, 화면의 선택 문(아웃라이너·탭)은 전부
      // `click` 이라 그 순서를 탄다. 클릭으로 하는 조작에서는 창이 안 열린다.
      //
      // 🔴 **안 잰 경로가 하나 있다 — 드래그&드롭으로 사진을 한 장 더 걸기.** 드롭은
      // 포커스를 안 옮기므로 `change` 가 안 나는데 `artwork-mode.ts` 가 `set()` 을 부른다.
      // 검수관도 브라우저에서 못 쟀다(드롭까지 재려면 vite 빌드가 필요하고 `smoke:vite`
      // 는 Bash 도구 상한 밖이다). **못 잰 것을 통과로 적지 않는다** — 이 줄이 그 기록이다.
      if (st.target.kind !== 'art') st.target.commit();
      onChanged();
    };
    inp.addEventListener('input', commit);
    // 액자의 확정 지점 — 위 근거대로 손을 뗄 때 한 번이다.
    inp.addEventListener('change', () => {
      if (st.target?.kind !== 'art') return;
      st.target.commit();
      onChanged();
    });
    // Enter 는 «다 쳤다» 는 신호다 — 포커스를 놓아 `sync` 가 정규화된 값을 되쓰게 한다.
    // (액자에서는 `blur` 가 `change` 를 내므로 이것이 곧 확정이기도 하다.)
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') inp.blur(); });

    inputs.set(f.key, inp);
    wrap.append(tag, inp);
    root.append(wrap);
  }

  return {
    root,
    sizeRow,
    sync(e: EditTarget | null): void {
      const w = e?.width;
      // 줄을 통째로 숨긴다 — 근거는 `Inspector.sizeRow` 주석 한 곳이다.
      sizeRow.style.display = w ? '' : 'none';
      if (w) {
        sizeIn.min = String(w.min);
        sizeIn.max = String(w.max);
        // ⚠ 수치칸과 **같은 이유로** 잡는 중에는 안 되쓴다. 되쓰면 드래그 중 `refresh`
        // 가 손잡이를 옛 값으로 되돌려 슬라이더가 손에서 튄다.
        if (doc.activeElement !== sizeIn) sizeIn.value = String(w.get());
        sizeVal.textContent = `${w.get().toFixed(2)}m`;
      }
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
