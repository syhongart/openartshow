// world2/decide/modal-edit.ts — **블렌더식 모달 조작의 산술과 상태 기계.** 순수 함수만.
//
// 감독 지시 2026-08-13: *"나도 블랜더 잘써서 오히려 그런 방식이 편하지."*
//
// ── 무엇이 다른가 ───────────────────────────────────────────────────────────
// 지금까지는 **기즈모를 잡아야만** 옮길 수 있었다. 블렌더는 반대다:
//
//   G 를 누른다 → 마우스를 움직이면 따라온다 → 클릭/Enter 로 확정, Esc/우클릭으로 취소
//
// 핸들을 조준할 필요가 없다는 것이 요점이다. 작은 물건이나 멀리 있는 물건에서 특히
// 차이가 크다 — 기즈모 핸들이 몇 픽셀밖에 안 되는 상황에서도 조작이 된다.
//
// ── 왜 «시작 스냅샷 + 누적 델타» 인가 ───────────────────────────────────────
// 매 프레임 «직전 값에 조금씩 더하기» 로 만들면 취소가 불가능하다 — 되돌릴 원본이
// 없기 때문이다. 시작 시점 값을 붙들고 **언제나 그것에 델타를 더해** 현재 값을 만들면:
//   · 취소 = 델타를 0 으로 보고 스냅샷을 그대로 쓴다
//   · 축을 도중에 바꿔도 누적 오차가 안 생긴다(X 로 밀다 Y 로 바꿔도 원점이 같다)
//   · 숫자를 타이핑하면 마우스 이동량을 **무시하고** 그 값을 쓴다(블렌더가 하는 것)
//
// ── 이 파일이 모르는 것 ─────────────────────────────────────────────────────
// 카메라도, 화면 크기도, 무엇이 선택됐는지도 모른다. **픽셀 이동량을 값으로 바꾸는
// 규칙**과 **키 입력이 상태를 어떻게 옮기는가**만 안다. 그래서 three 없이 잴 수 있다.
//
// ⚠ 화면 투영을 안 쓰는 대가: 카메라가 멀리 있어도 픽셀당 이동량이 같다. 블렌더는
// 거리에 비례시킨다. 그것을 하려면 카메라를 알아야 하고, 그 순간 이 계층이 three 에
// 묶인다 — 먼저 계수로 내보고 감독이 «너무 느리다/빠르다» 고 하면 그때 카메라 거리를
// 인자로 **받는다**(import 하지 않는다).

/** 무엇을 미는가 */
export type ModalKind = 'move' | 'rotate' | 'scale';

/** 어느 축으로만 밀 것인가. `null` 이면 자유(이동은 지면 평면, 회전·크기는 축이 하나뿐) */
export type ModalAxis = 'x' | 'y' | 'z' | null;

export interface ModalState {
  readonly kind: ModalKind;
  readonly axis: ModalAxis;
  /**
   * 타이핑한 숫자 문자열. 비어 있으면 마우스로 민다.
   *
   * 문자열로 드는 이유: `-` 와 `.` 를 **입력 도중에** 받아야 한다(`-` 만 친 상태,
   * `1.` 인 상태). 숫자로 즉시 파싱하면 그 중간 상태를 표현할 수 없고, 화면에
   * 지금 무엇을 치고 있는지 보여줄 수도 없다.
   */
  readonly digits: string;
  /** 조작을 시작한 마우스 자리(픽셀) */
  readonly startX: number;
  readonly startY: number;
}

/** 시작 시점의 값. 취소하면 이것으로 되돌아간다 */
export interface Pose {
  x: number;
  y: number;
  z: number;
  ry: number;
  s: number;
}

/**
 * 픽셀당 이동량(m). 1600px 을 가로지르면 80m — 마을 파셀(32m) 두 칸 반이다.
 *
 * ⚠ **감독 화면에서만 판정된다.** 헤드리스는 조작감을 못 잰다. 이 값은 근거가 아니라
 * **출발점**이고, `?mspd=` 같은 노브로 열어 판정을 받는 것이 다음 단계다.
 */
export const MOVE_PER_PX = 0.05;

/** 픽셀당 회전(라디안). 1000px 가로지르면 약 한 바퀴 */
export const ROT_PER_PX = 0.00628;

/** 픽셀당 크기 배수 증분. 1000px 가로지르면 약 2배 */
export const SCALE_PER_PX = 0.001;

/**
 * 조작 결과. **시작 스냅샷에 이것을 적용하면 현재 값**이다.
 *
 * 절대값이 아니라 델타인 것이 요점 — 취소는 이것을 0 으로 보면 끝난다.
 */
export interface ModalDelta {
  dx: number;
  dy: number;
  dz: number;
  dry: number;
  /** 크기 **배수**(1 = 그대로). 덧셈이 아닌 이유는 `decide/edit-pick.ts` 의 `scaleBy` 와 같다 */
  ks: number;
}

export const ZERO_DELTA: ModalDelta = { dx: 0, dy: 0, dz: 0, dry: 0, ks: 1 };

/** 타이핑한 숫자를 값으로. 아직 수가 아니면(`-`·`.`·빈 문자열) `null` */
export function typedValue(digits: string): number | null {
  if (digits === '' || digits === '-' || digits === '.' || digits === '-.') return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/**
 * 마우스 이동량(또는 타이핑한 수) → 델타.
 *
 * **타이핑이 있으면 마우스를 무시한다** — 블렌더가 하는 것이고, 정확한 값을 넣으려는
 * 사람이 손을 떨어도 값이 안 흔들려야 한다.
 *
 * 축이 없을 때(`axis === null`):
 *   · 이동 — 지면 평면(x·z). 가로 이동은 x, 세로 이동은 z 다. 화면 기준이 아니라
 *     **월드 기준**이라 카메라가 돌아가 있으면 직관과 어긋난다 ⚠ 그것이 이 회차의
 *     알려진 한계이고, 축 고정(`X`/`Z`)을 쓰면 그 모호함이 사라진다.
 *   · 회전·크기 — 축이 하나뿐이라 자유와 같다.
 */
export function modalDelta(
  kind: ModalKind,
  axis: ModalAxis,
  digits: string,
  dxPx: number,
  dyPx: number,
): ModalDelta {
  const typed = typedValue(digits);

  if (kind === 'rotate') {
    // 회전은 **도(°)로 타이핑한다** — 라디안을 치는 사람은 없다.
    const v = typed !== null ? (typed * Math.PI) / 180 : dxPx * ROT_PER_PX;
    return { ...ZERO_DELTA, dry: v };
  }

  if (kind === 'scale') {
    // 타이핑은 **배수 그대로**(2 = 두 배). 0 이하는 지오메트리를 뒤집으므로 무시한다 —
    // 상·하한은 계약(`decide/overlay.ts` 의 `S_MIN`·`S_MAX`)이 소유하고 여기서 안 적는다.
    if (typed !== null) return { ...ZERO_DELTA, ks: typed > 0 ? typed : 1 };
    const k = 1 + dxPx * SCALE_PER_PX;
    return { ...ZERO_DELTA, ks: k > 0 ? k : 1 };
  }

  // ── 이동 ──────────────────────────────────────────────────────────────────
  if (axis === 'x') return { ...ZERO_DELTA, dx: typed ?? dxPx * MOVE_PER_PX };
  if (axis === 'z') return { ...ZERO_DELTA, dz: typed ?? dxPx * MOVE_PER_PX };
  if (axis === 'y') {
    // 세로 이동은 **위로 끌면 올라간다** — 화면 y 는 아래가 양수라 부호를 뒤집는다.
    return { ...ZERO_DELTA, dy: typed ?? -dyPx * MOVE_PER_PX };
  }
  // 축 자유 — 지면 평면
  if (typed !== null) return { ...ZERO_DELTA, dx: typed };
  return { ...ZERO_DELTA, dx: dxPx * MOVE_PER_PX, dz: dyPx * MOVE_PER_PX };
}

/** 시작 자세 + 델타 = 지금 자세. **적용은 이 한 곳이다** */
export function applyDelta(from: Pose, d: ModalDelta): Pose {
  return {
    x: from.x + d.dx,
    y: from.y + d.dy,
    z: from.z + d.dz,
    ry: from.ry + d.dry,
    s: from.s * d.ks,
  };
}

/** 키 입력이 상태를 어떻게 옮기는가 */
export type ModalKey =
  | { readonly act: 'axis'; readonly axis: ModalAxis }
  | { readonly act: 'digit'; readonly digits: string }
  | { readonly act: 'commit' }
  | { readonly act: 'cancel' }
  | null;

/**
 * 모달 **중** 키 하나를 해석한다. 처리 못 하는 키면 `null`(부르는 쪽이 무시한다).
 *
 * ⚠ **축 키를 두 번 누르면 해제된다** — 블렌더가 그렇다. 잘못 눌렀을 때 조작을
 * 취소했다 다시 시작하지 않아도 된다.
 */
export function readModalKey(st: ModalState, code: string, key: string): ModalKey {
  if (code === 'Escape') return { act: 'cancel' };
  if (code === 'Enter' || code === 'NumpadEnter') return { act: 'commit' };

  if (code === 'KeyX') return { act: 'axis', axis: st.axis === 'x' ? null : 'x' };
  if (code === 'KeyY') return { act: 'axis', axis: st.axis === 'y' ? null : 'y' };
  if (code === 'KeyZ') return { act: 'axis', axis: st.axis === 'z' ? null : 'z' };

  if (code === 'Backspace') {
    return { act: 'digit', digits: st.digits.slice(0, -1) };
  }
  // 숫자·부호·소수점만 받는다. `key` 를 보는 이유: `code` 는 자판 배열에 묶여 있고
  // (`Minus` 가 어디 있는지가 배열마다 다르다) 우리가 원하는 것은 **찍힌 글자**다.
  if (/^[0-9]$/.test(key)) return { act: 'digit', digits: st.digits + key };
  if (key === '-' && st.digits === '') return { act: 'digit', digits: '-' };
  if (key === '.' && !st.digits.includes('.')) return { act: 'digit', digits: `${st.digits}.` };

  return null;
}

/** 모달을 **여는** 키인가. 모달 밖에서만 본다 */
export function modalOpener(code: string): ModalKind | null {
  if (code === 'KeyG') return 'move';
  if (code === 'KeyR') return 'rotate';
  if (code === 'KeyS') return 'scale';
  return null;
}

/** 화면에 지금 무엇을 하고 있는지. 블렌더가 헤더에 적는 그것 */
export function modalLabel(st: ModalState, d: ModalDelta): string {
  const ax = st.axis ? ` ${st.axis.toUpperCase()}` : '';
  if (st.digits !== '') {
    const unit = st.kind === 'rotate' ? '°' : st.kind === 'scale' ? '배' : 'm';
    return `${nameOf(st.kind)}${ax}: ${st.digits}${unit}`;
  }
  if (st.kind === 'rotate') return `회전${ax}: ${((d.dry * 180) / Math.PI).toFixed(1)}°`;
  if (st.kind === 'scale') return `크기: ×${d.ks.toFixed(3)}`;
  const m = st.axis === 'y' ? d.dy : st.axis === 'z' ? d.dz : d.dx;
  return `이동${ax}: ${m.toFixed(2)}m${st.axis === null ? ` / ${d.dz.toFixed(2)}m` : ''}`;
}

function nameOf(kind: ModalKind): string {
  return kind === 'move' ? '이동' : kind === 'rotate' ? '회전' : '크기';
}
