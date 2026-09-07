// world10/decide/modal-edit.ts — **블렌더식 모달 조작의 산술과 상태 기계.** 순수 함수만.
//
// 감독 지시 2026-08-13: *"나도 블랜더 잘써서 오히려 그런 방식이 편하지."*
//
// ── 무엇이 다른가 ───────────────────────────────────────────────────────────
// 기즈모는 **핸들을 조준해야** 쓴다. 모달은 반대다:
//
//   R 을 누른다 → 마우스를 움직이면 돈다 → 클릭/Enter 로 확정, Esc/우클릭으로 취소
//
// 작은 물건이나 멀리 있는 물건에서 차이가 크다 — 기즈모 핸들이 몇 픽셀밖에 안 되는
// 상황에서도 조작이 된다.
//
// ── ⚠ 이동(`G`)은 **없앴다** (감독 지시 2026-08-13, 카드 확인) ──────────────
// *"단축키 이동은 없애고"* → 카드로 범위를 좁혀 **`G`(이동)만** 제거했다.
// `R`(회전)·`S`(크기)는 남는다.
//
// **축 고정(`X`/`Y`/`Z`)이 함께 사라진 것이 이 개정의 요점이다.** 그것은 이동 전용이었다 —
// 회전은 `ry` 하나뿐이고 **당시** 크기는 균등(비율 유지)이라 고정할 축이 애초에 없었다.
// 그래서 `ModalAxis`·`ModalDelta.dx/dy/dz`·`MOVE_PER_PX` 가 통째로 죽었고, 죽은 코드를
// 남기지 않았다(이 저장소는 「쓸 소비자가 없는 문을 미리 내지 않는다」를 여러 번 적었다).
//
// ⚠ **「크기는 균등이라 축이 없다」는 2026-08-25 부터 이 모달에 한정된 말이다**
// (팀장 판정 — `edit/target.ts` 의 축별 문). 감독 카드 「축별로 늘리기 — 세 방향」으로
// **기즈모에는 축별 크기가 생겼다.** 이 문장을 그대로 두면 낡은 판정이 코드보다 강하게
// 남으므로 갱신한다 — 8-21 판정이 축을 여는 회차의 **선결 조건**으로 지목한 자리가 여기다.
//
// **그런데 이 모달은 여전히 균등만 민다.** 축별을 여기까지 끌고 오려면 죽은 `ModalAxis` 를
// 되살려야 하고, 그러면 위 「겹침 하나가 풀렸다」(모달 중 `Z`/`X` 가 높이 조작과 충돌하던
// 것)가 **되살아난다.** 기즈모는 축이 화면에 보이지만 모달은 키를 외워야 해서, 같은 기능이
// 두 곳에서 값이 다르다. **감독이 키로 축별을 요구하면 그때 재론한다** — 지금 여는 것은
// 죽은 코드를 미리 살리는 것이고 이 파일이 스스로 금지한 형태다.
//
// 덤으로 겹침 하나가 풀렸다 — 모달 밖의 `Z`/`X` 는 높이 조작인데, 모달 중에는 축 키였다.
// 같은 키가 상황에 따라 다르게 동작하던 것이 사라졌다.
//
// **이동 수단은 안 줄었다**: 기즈모 x/y/z 축 화살표 · 좌드래그(x/z) · 수치칸 · `Z`/`X` 높이
// 키 · 패널 높이 버튼.
//
// ── 왜 «시작 스냅샷 + 누적 델타» 인가 ───────────────────────────────────────
// 매 프레임 «직전 값에 조금씩 더하기» 로 만들면 취소가 불가능하다 — 되돌릴 원본이
// 없기 때문이다. 시작 시점 값을 붙들고 **언제나 그것에 델타를 더해** 현재 값을 만들면:
//   · 취소 = 델타를 0 으로 보고 스냅샷을 그대로 쓴다
//   · 숫자를 타이핑하면 마우스 이동량을 **무시하고** 그 값을 쓴다(블렌더가 하는 것)
//
// ── 이 파일이 모르는 것 ─────────────────────────────────────────────────────
// 카메라도, 화면 크기도, 무엇이 선택됐는지도 모른다. **픽셀 이동량을 값으로 바꾸는
// 규칙**과 **키 입력이 상태를 어떻게 옮기는가**만 안다. 그래서 three 없이 잴 수 있다.

/** 무엇을 미는가. ⚠ `'move'` 는 감독 지시로 걷어냈다(헤더 참조) */
export type ModalKind = 'rotate' | 'scale';

export interface ModalState {
  readonly kind: ModalKind;
  /**
   * 타이핑한 숫자 문자열. 비어 있으면 마우스로 민다.
   *
   * 문자열로 드는 이유: `-` 와 `.` 를 **입력 도중에** 받아야 한다(`-` 만 친 상태,
   * `1.` 인 상태). 숫자로 즉시 파싱하면 그 중간 상태를 표현할 수 없고, 화면에
   * 지금 무엇을 치고 있는지 보여줄 수도 없다.
   */
  readonly digits: string;
  /** 조작을 시작한 마우스 자리(픽셀). 가로만 쓴다 — 회전·크기 둘 다 1축이다 */
  readonly startX: number;
}

/**
 * 시작 시점의 값. 취소하면 이것으로 되돌아간다.
 *
 * ⚠ **`x`·`y`·`z` 는 지금 아무도 안 바꾼다**(이동 모달이 사라졌으므로). 그래도 남기는
 * 이유는 취소가 **자세 전체**를 되돌리는 것이 계약이기 때문이다 — 조작 중에 다른 경로가
 * 위치를 건드리면(예: 슬롯 재타겟) 취소는 그것까지 원복해야 한다.
 */
export interface Pose {
  x: number;
  y: number;
  z: number;
  ry: number;
  s: number;
}

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
  dry: number;
  /** 크기 **배수**(1 = 그대로). 덧셈이 아닌 이유는 `decide/edit-pick.ts` 의 `scaleBy` 와 같다 */
  ks: number;
}

export const ZERO_DELTA: ModalDelta = { dry: 0, ks: 1 };

/** 타이핑한 숫자를 값으로. 아직 수가 아니면(`-`·`.`·빈 문자열) `null` */
export function typedValue(digits: string): number | null {
  if (digits === '' || digits === '-' || digits === '.' || digits === '-.') return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/**
 * 마우스 가로 이동량(또는 타이핑한 수) → 델타.
 *
 * **타이핑이 있으면 마우스를 무시한다** — 블렌더가 하는 것이고, 정확한 값을 넣으려는
 * 사람이 손을 떨어도 값이 안 흔들려야 한다.
 *
 * ⚠ **세로 이동을 안 본다.** 회전도 크기도 축이 하나뿐이라 볼 것이 없다(이동 모달이
 * 있던 시절에는 세로가 z·y 였다).
 */
export function modalDelta(kind: ModalKind, digits: string, dxPx: number): ModalDelta {
  const typed = typedValue(digits);

  if (kind === 'rotate') {
    // 회전은 **도(°)로 타이핑한다** — 라디안을 치는 사람은 없다.
    const v = typed !== null ? (typed * Math.PI) / 180 : dxPx * ROT_PER_PX;
    return { ...ZERO_DELTA, dry: Number.isFinite(v) ? v : 0 };
  }

  // 타이핑은 **배수 그대로**(2 = 두 배). 0 이하는 지오메트리를 뒤집으므로 무시한다 —
  // 상·하한은 계약(`decide/overlay.ts` 의 `S_MIN`·`S_MAX`)이 소유하고 여기서 안 적는다.
  if (typed !== null) return { ...ZERO_DELTA, ks: typed > 0 ? typed : 1 };
  const k = 1 + dxPx * SCALE_PER_PX;
  return { ...ZERO_DELTA, ks: Number.isFinite(k) && k > 0 ? k : 1 };
}

/** 시작 자세 + 델타 = 지금 자세. **적용은 이 한 곳이다** */
export function applyDelta(from: Pose, d: ModalDelta): Pose {
  return {
    // 위치는 모달이 안 건드린다 — 그대로 옮겨 담아야 취소가 자세 **전체**를 되돌린다.
    x: from.x,
    y: from.y,
    z: from.z,
    ry: from.ry + d.dry,
    s: from.s * d.ks,
  };
}

/** 키 입력이 상태를 어떻게 옮기는가 */
export type ModalKey =
  | { readonly act: 'digit'; readonly digits: string }
  | { readonly act: 'commit' }
  | { readonly act: 'cancel' }
  | null;

/**
 * 모달 **중** 키 하나를 해석한다. 처리 못 하는 키면 `null`(부르는 쪽이 무시한다).
 *
 * ⚠ **축 키(`X`/`Y`/`Z`)는 더 이상 받지 않는다** — 이동 모달과 함께 사라졌다(헤더 참조).
 * 그래서 그 키들은 여기서 `null` 이 되고 부르는 쪽이 통과시킨다.
 */
export function readModalKey(st: ModalState, code: string, key: string): ModalKey {
  if (code === 'Escape') return { act: 'cancel' };
  if (code === 'Enter' || code === 'NumpadEnter') return { act: 'commit' };

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

/**
 * 모달을 **여는** 키인가. 모달 밖에서만 본다.
 *
 * ⚠ **`KeyG` 는 없다** — 감독 지시로 이동 모달을 걷었다(헤더). 그래서 `G` 는 이제
 * 편집이 안 먹고 그대로 통과한다.
 */
export function modalOpener(code: string): ModalKind | null {
  if (code === 'KeyR') return 'rotate';
  if (code === 'KeyS') return 'scale';
  return null;
}

/** 화면에 지금 무엇을 하고 있는지. 블렌더가 헤더에 적는 그것 */
export function modalLabel(st: ModalState, d: ModalDelta): string {
  if (st.digits !== '') {
    const unit = st.kind === 'rotate' ? '°' : '배';
    return `${nameOf(st.kind)}: ${st.digits}${unit}`;
  }
  if (st.kind === 'rotate') return `회전: ${((d.dry * 180) / Math.PI).toFixed(1)}°`;
  return `크기: ×${d.ks.toFixed(3)}`;
}

/**
 * 모달 진행 표시의 조작 이름. **이 파일 안에서만 쓴다.**
 *
 * 🔴 2026-08-22 에 이것을 `export` 로 올리며 *"되돌리기 목록도 이것을 쓴다"* 라고 적었고
 * **거짓이었다**(검수관 반려 B2 — 실측: 그 파일 밖 소비자 0건). 되돌리기 라벨은
 * `edit/history-ops.ts` 의 `poseLabel` 이 따로 만든다. 즉 **막겠다던 값 미러링이 그대로
 * 남은 채 「해소했다」로 적혀 있었다** — 이 저장소가 반복해서 대가를 치른 형태다.
 *
 * **철회했다.** 그리고 그 둘은 애초에 미러링이 아니다 — 여기는 «지금 무엇을 하고 있나»
 * 를 실시간으로 말하고(`회전: 30.0°`), 저기는 «무엇을 되돌렸나» 를 목록에 적는다
 * (`되돌렸습니다: 회전`). 한쪽 문구를 바꿔도 다른 쪽이 깨지지 않는다. 미러링은
 * **한쪽만 고치면 아무도 모르는** 경우이고, 이것은 각자 자기 화면을 말한다.
 * 그 판단이 뒤집혀 다시 열게 되거든 **소비자와 함께** 열어라 — 소비자 없는 export 를
 * `tests/world2-edit-history.test.ts` 가 막는다.
 */
function nameOf(kind: ModalKind): string {
  return kind === 'rotate' ? '회전' : '크기';
}
