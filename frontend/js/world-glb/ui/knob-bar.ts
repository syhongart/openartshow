// world-glb/ui/knob-bar.ts — 값을 화면에서 직접 미는 슬라이더 바.
//
// ── 무엇에 쓰는 물건인가 (감독 지시 2026-07-31 "유아이 바를 만들어봐") ────────
// 감독이 렌더 파라미터를 **보면서 고르는** 도구다. 디버그 패널이 아니다 — 여기서
// 고른 값이 곧 배포 기본값이 된다.
//
// 왜 필요한가: 내가 볼 수 없는 것을 감독이 본다. 헤드리스는 SwiftShader(WebGL)이고
// 감독 실기기는 WebGPU라 렌더 경로가 다르다. 값 하나 바꾸는 데 코드 수정 → 스모크 →
// 배포 왕복이면 한 번 맞추는 데 하루가 든다. URL 노브(`?wns=0.9`)가 그 왕복을 없앴고,
// 이 바는 **주소창에 숫자를 치는 일**까지 없앤다.
//
// ── 이 파일은 노브가 무엇인지 모른다 ────────────────────────────────────────
// 키·범위·라벨·기본값을 여기에 적지 않는다. 그것을 적는 순간 소비처(`ocean.ts`)와
// 두 곳에 같은 값이 살게 되고, 한쪽만 고쳐도 아무도 모르는 상태가 된다 — 이 저장소가
// 색·수치·임계값에서 세 번 데인 형태다. 여기는 `KnobSpec` 을 받아 **행을 그리고
// 이벤트를 되돌려주는 일**만 한다.
//
// ── 여러 기능이 한 바에 모인다 ──────────────────────────────────────────────
// `attachKnobBar` 를 여러 번 부르면 행이 누적된다. 지금 소비자는 수면 하나지만
// 노브는 이미 아홉 개다(하늘 여섯·GLB 둘·수면 셋). 나중에 하늘이 자기 노브를 붙여도
// 패널이 둘로 갈라지지 않는다 — 감독이 말한 것은 "유아이 바" 하나였다.
//
// ── 못 하는 것 ──────────────────────────────────────────────────────────────
// 화면에서 그 값이 실제로 어떻게 보이는지는 이 파일도, 어떤 테스트도 모른다.
// 헤드리스는 SwiftShader라 수면 반사가 실기기와 다르게 나온다 — 육안 판정은 감독 몫이고,
// 이 바는 그 판정을 **빠르게** 만드는 도구일 뿐이다.

/**
 * 노브 하나의 계약. 값을 소유하는 쪽(기능)이 구현한다.
 *
 * `value()`/`overridden()` 이 **함수**인 것이 중요하다. 값은 바깥에서도 바뀐다 —
 * 시간대가 낮에서 밤으로 넘어가면 지정하지 않은 노브의 기본값이 통째로 달라진다.
 * 스냅샷을 받아 두면 그때 슬라이더가 옛 값을 가리킨 채 남는다.
 */
export interface KnobSpec {
  /** URL 파라미터 이름 겸 식별자 */
  readonly key: string;
  /** 화면 라벨. 짧아야 한다(라벨 칸이 38px 다) */
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** 지금 실제로 걸려 있는 값 */
  value(): number;
  /** 그 값이 사용자가 지정한 것인가(= 상황별 기본값이 아닌가) */
  overridden(): boolean;
  /** 슬라이더가 움직였다 */
  set(v: number): void;
  /** 되돌리기 — 지정을 해제해 상황별 기본값으로 돌린다 */
  reset(): void;
}

export interface KnobBarParts {
  panel: HTMLElement;
  toggle: HTMLElement;
  body: HTMLElement;
}

export interface KnobBar {
  /** 바깥에서 값이 바뀌었을 때(시간대 전환 등) 슬라이더 표시를 다시 맞춘다 */
  sync(): void;
  dispose(): void;
}

/**
 * 누르면 무언가를 하는 버튼 하나. **슬라이더가 아니라 동작이다.**
 *
 * 첫 소비자는 감독의 「그림자 굽기」다(지시 2026-08-11 *"내가 베이킹 버튼을 누르면
 * 구워지고 적용되게하자"*). 슬라이더는 값을 밀지만 굽기는 **밀 값이 없다** — 지금 상태로
 * 다시 굽는 것이라 `KnobSpec` 에 안 맞는다.
 */
export interface KnobAction {
  readonly key: string;
  readonly label: string;
  /** 눌렀다. 돌려준 문자열이 있으면 라벨 옆에 잠깐 띄운다(예: 소요 ms) */
  run(): string | void;
}

/** 토글이 이미 배선된 바. `attachKnobBar`·`attachKnobActions` 가 함께 본다 */
const wiredToggles = new WeakSet<HTMLElement>();

/** 문서에서 바를 찾는다. 없으면 null — 바 없이도 월드는 돈다 */
export function findKnobBar(doc: Document): KnobBarParts | null {
  const panel = doc.getElementById('wg-sliders');
  const toggle = doc.getElementById('wg-sliders-toggle');
  const body = doc.getElementById('wg-sliders-body');
  if (!panel || !toggle || !body) return null;
  return { panel, toggle, body };
}

/**
 * `step` 에서 표시 소수 자릿수를 유도한다.
 *
 * 자릿수를 `KnobSpec` 에 따로 받지 않는 이유: 그러면 `step: 0.05` 와 `digits: 1` 처럼
 * **서로 어긋난 조합**이 가능해진다(0.05 를 밀었는데 표시가 안 바뀐다). step 이 곧
 * 표시 해상도이므로 유도하면 어긋날 자리가 없다.
 */
export function digitsOf(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 2;
  const s = String(step);
  const dot = s.indexOf('.');
  // 지수 표기(1e-3)는 `String` 이 소수점을 안 쓴다. 그 경우만 로그로 되돌린다.
  if (dot < 0) return s.includes('e-') ? Math.min(6, Math.ceil(-Math.log10(step))) : 0;
  return s.length - dot - 1;
}

/**
 * 슬라이더 행을 만들어 붙인다. 여러 번 불러도 행이 누적된다.
 *
 * 반환된 `sync()` 를 시간대 전환 같은 외부 변화 뒤에 부르면 표시가 다시 맞는다.
 */
export function attachKnobBar(parts: KnobBarParts, specs: readonly KnobSpec[]): KnobBar {
  const { panel, toggle, body } = parts;
  const doc = panel.ownerDocument;

  /** 행마다 붙잡아 두는 것 — `sync` 가 매번 DOM 을 다시 뒤지지 않게 */
  interface Row {
    spec: KnobSpec;
    row: HTMLElement;
    input: HTMLInputElement;
    val: HTMLElement;
  }
  const rows: Row[] = [];

  // ── 행 생성 ────────────────────────────────────────────────────────────────
  // `innerHTML` 을 쓰지 않는다. 지금 라벨은 우리가 정한 상수라 안전하지만, 이 저장소는
  // 이미 프로필명 XSS 를 냈고 그 처방이 "문자열을 마크업으로 해석시키지 않는다" 였다.
  // 노브 라벨이 언젠가 바깥에서 오면 그때 이 파일을 다시 볼 사람은 없다.
  for (const spec of specs) {
    const row = doc.createElement('div');
    row.className = 'wg-slide-row';
    row.dataset.key = spec.key;

    const cap = doc.createElement('span');
    cap.className = 'wg-slide-cap';
    const pin = doc.createElement('span');
    pin.className = 'wg-slide-pin';
    pin.setAttribute('aria-hidden', 'true');
    cap.append(pin, doc.createTextNode(spec.label));

    const input = doc.createElement('input');
    input.type = 'range';
    input.className = 'wg-slide-input';
    input.dataset.key = spec.key;
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    input.setAttribute('aria-label', spec.label);

    const val = doc.createElement('span');
    val.className = 'wg-slide-val';

    const reset = doc.createElement('button');
    reset.type = 'button';
    reset.className = 'wg-slide-reset';
    reset.dataset.reset = spec.key;
    reset.textContent = '↺';
    // 되돌리기가 무엇으로 돌아가는지 적는다. "기본값"이라고만 하면 그 기본값이
    // 시간대마다 다르다는 사실이 안 보인다 — 그것이 이 노브들의 성격이다.
    reset.title = `${spec.label} — 시간대 기본값으로`;
    reset.setAttribute('aria-label', `${spec.label} 되돌리기`);

    row.append(cap, input, val, reset);
    body.append(row);
    rows.push({ spec, row, input, val });
  }

  // ── 표시 갱신 ──────────────────────────────────────────────────────────────
  // **요청이 아니라 반영된 상태를 표시한다.** 슬라이더를 어디까지 밀었는지가 아니라
  // 기능이 실제로 쓰고 있는 값을 되읽는다 — 기능이 값을 클램프하거나 무시할 수 있고,
  // 그때 화면에 없는 값이 슬라이더에 떠 있으면 "왜 안 먹지"로만 드러난다.
  // (`sky-panel.ts` 가 같은 이유로 `get()` 을 다시 읽는다.)
  const sync = () => {
    let dirty = false;
    for (const r of rows) {
      const v = r.spec.value();
      const on = r.spec.overridden();
      if (on) dirty = true;
      // 드래그 중인 슬라이더의 값을 되쓰면 손가락 밑에서 손잡이가 튄다.
      // 같은 값이면 건드리지 않는다.
      const next = String(v);
      if (r.input.value !== next) r.input.value = next;
      r.val.textContent = v.toFixed(digitsOf(r.spec.step));
      r.row.dataset.overridden = on ? '1' : '0';
    }
    panel.dataset.dirty = dirty ? '1' : '0';
  };

  const onToggle = () => {
    const open = panel.getAttribute('data-open') === '1';
    panel.setAttribute('data-open', open ? '0' : '1');
    toggle.setAttribute('aria-expanded', String(!open));
    body.hidden = open;
  };
  // ⚠ **토글은 바 하나에 한 번만 건다** (검수관 권고, 태스크 #173 — *"두 번째 소비자를
  // 붙이기 전 필수"*). 이 함수는 소비자마다 불리는데 `toggle`·`body` 는 **공유**다.
  // 두 번 걸면 클릭 한 번에 핸들러가 둘 돌아 열리자마자 닫힌다 — 패널이 아예 안 열린다.
  //
  // 행 이벤트(`input`·`click`)는 중복돼도 무해하다. 각 핸들러가 `rows.find` 로 **자기
  // 행만** 찾고 남의 키는 그대로 흘려보내기 때문이다. 토글만 상태를 뒤집으므로 토글만
  // 문제다 — 그 비대칭을 여기 적어 두지 않으면 다음 사람이 셋 다 감싸거나 셋 다 놔둔다.
  const alreadyWired = wiredToggles.has(toggle);
  if (!alreadyWired) wiredToggles.add(toggle);

  // `input` 이지 `change` 가 아니다 — 미는 **동안** 물이 변해야 한다. 그것이 이
  // 도구의 전부다. `change` 는 손을 뗄 때만 와서 "밀어보며 고르는" 일이 안 된다.
  const onInput = (e: Event) => {
    const el = e.target as HTMLInputElement | null;
    const key = el?.dataset?.key;
    if (!key) return;
    const r = rows.find((x) => x.spec.key === key);
    if (!r) return;
    const n = Number(el!.value);
    if (!Number.isFinite(n)) return;
    r.spec.set(n);
    sync();
  };

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement | null;
    const b = t?.closest<HTMLElement>('button[data-reset]');
    if (!b) return;
    const r = rows.find((x) => x.spec.key === b.dataset.reset);
    if (!r) return;
    r.spec.reset();
    sync();
  };

  if (!alreadyWired) toggle.addEventListener('click', onToggle);
  body.addEventListener('input', onInput);
  body.addEventListener('click', onClick);

  // 노브가 하나라도 붙어야 바가 보인다. 기능이 전부 빠진 빌드에서 빈 상자가 떠 있으면
  // 그 자체가 고장으로 읽힌다.
  if (rows.length > 0) panel.hidden = false;
  sync();

  return {
    sync,
    dispose() {
      // 토글 리스너는 **떼지 않는다.** 소비자가 여럿이므로 하나가 떠난다고 떼면 남은
      // 소비자의 패널이 안 열린다. 리스너 하나가 남아도 패널이 숨겨지면 무해하고,
      // 다시 붙일 때는 위 `wiredToggles` 가 중복을 막는다.
      body.removeEventListener('input', onInput);
      body.removeEventListener('click', onClick);
      for (const r of rows) r.row.remove();
      rows.length = 0;
      // 마지막 소비자가 떠나면 바를 도로 감춘다. 남은 행이 없는데 상자만 떠 있으면
      // 위와 같은 이유로 고장처럼 보인다.
      if (body.childElementCount === 0) panel.hidden = true;
    },
  };
}

/**
 * 동작 버튼을 바에 붙인다. 슬라이더와 **같은 바에 누적**된다(`attachKnobBar` 와 같은 규약).
 *
 * ── 왜 눌린 결과를 라벨에 띄우는가 ──────────────────────────────────────────
 * 굽기는 화면이 거의 안 바뀔 수도 있다 — 같은 값으로 다시 구우면 결과가 같으니 당연하다.
 * 그때 아무 반응이 없으면 감독은 **버튼이 고장 났다고 읽는다.** 소요 ms 를 잠깐 띄우면
 * "돌긴 돌았다" 가 화면에 남는다. `sky-panel.ts` 가 반려를 표시하는 것과 같은 이유다.
 */
export function attachKnobActions(
  parts: KnobBarParts, actions: readonly KnobAction[],
): { dispose(): void } {
  const { panel, toggle, body } = parts;
  const doc = panel.ownerDocument;
  const rows: HTMLElement[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];

  for (const a of actions) {
    const row = doc.createElement('div');
    row.className = 'wg-slide-row wg-slide-act';
    row.dataset.key = a.key;

    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'wg-slide-run';
    btn.dataset.run = a.key;
    // `innerHTML` 을 쓰지 않는다 — `attachKnobBar` 머리의 XSS 근거와 같다.
    btn.textContent = a.label;

    const out = doc.createElement('span');
    out.className = 'wg-slide-val';

    row.append(btn, out);
    body.append(row);
    rows.push(row);
  }

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement | null;
    const b = t?.closest<HTMLElement>('button[data-run]');
    if (!b) return;
    const a = actions.find((x) => x.key === b.dataset.run);
    if (!a) return;
    const msg = a.run();
    const out = b.parentElement?.querySelector<HTMLElement>('.wg-slide-val');
    if (out && typeof msg === 'string') {
      out.textContent = msg;
      // 남겨 두면 다음에 눌렀을 때 옛 값이 새 값처럼 읽힌다.
      timers.push(setTimeout(() => { out.textContent = ''; }, 1600));
    }
  };

  const onToggle = () => {
    const open = panel.getAttribute('data-open') === '1';
    panel.setAttribute('data-open', open ? '0' : '1');
    toggle.setAttribute('aria-expanded', String(!open));
    body.hidden = open;
  };
  // 슬라이더 없이 버튼만 붙는 경우가 있으므로 여기서도 토글을 본다. 중복 방지 근거는
  // `attachKnobBar` 쪽 주석 한 곳이다.
  if (!wiredToggles.has(toggle)) {
    wiredToggles.add(toggle);
    toggle.addEventListener('click', onToggle);
  }
  body.addEventListener('click', onClick);
  if (rows.length > 0) panel.hidden = false;

  return {
    dispose() {
      body.removeEventListener('click', onClick);
      for (const t of timers) clearTimeout(t);
      timers.length = 0;
      for (const r of rows) r.remove();
      rows.length = 0;
      if (body.childElementCount === 0) panel.hidden = true;
    },
  };
}
