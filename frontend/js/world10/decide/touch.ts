// world10/decide/touch.ts — 터치 조작 판정. 순수 함수만, import 0.
//
// ── 이 파일이 존재하는 이유(실기기 사고) ─────────────────────────────────────
// 기존 조이스틱에서 감독 실기기로 발견된 버그가 있다. `touchend`의 `changedTouches`만
// 보고 슬롯을 해제했는데, 브라우저가 메인 스레드를 길게 블록하면(실측 frame_ms 11,489ms)
// 그 사이 손을 뗀 touchend가 **유실**된다. 그러면 슬롯이 영구히 남아
//   ① 새 터치가 거부돼 조이스틱이 화면에 붙은 채 반응하지 않고
//   ② 마지막 이동 벡터가 계속 적용돼 아바타가 저절로 걷는다.
//
// 처방은 "변화분(changedTouches)이 아니라 **현재 닿아 있는 것 전부**(e.touches)를 진실로
// 삼아 매 이벤트마다 죽은 슬롯을 청소한다"였다. 그 청소 규칙이 `reconcile`이고, 순수
// 함수이므로 시험할 수 있다 — 실기기에서만 드러나던 버그를 테스트로 못 박는 지점이다.

/**
 * 조이스틱 손잡이가 중심에서 벗어날 수 있는 최대 반경(px).
 *
 * ⚠ **60 은 오픈월드(world1)의 값이다** (감독 지시 2026-08-23 *"형태 크기 똑같이.
 * 새로 만들라는게 아니라. 가지고 와야지."*). 원본은 `frontend/js/player.js` 의
 * `JOYSTICK_RADIUS` 이고, 그 파일은 라이브 런타임 보호파일이라 여기서 값을 맞춘다 —
 * `GS-J8` 이 두 곳을 대조해 묶는다.
 *
 * **이 값이 52 였을 때 무엇이 달랐나**: 링이 112px(반경 56)이므로 52 면 손잡이 중심이
 * **링 안에 머물고**, 60 이면 **링을 4px 넘어간다.** 화면에 보이는 차이라 감독 문언
 * 「형태 크기 똑같이」에 걸린다 — 감도만의 문제가 아니었다.
 *
 * ⚠⚠ 이것은 **조작 감도도 함께 바꾼다** — 같은 손 이동에 대한 기울기가 52/60 만큼
 * 작아진다(끝까지 미는 데 더 멀리 가야 한다). 그것도 world1 과 같아지는 방향이다.
 */
export const STICK_RADIUS = 60;
/** 이 비율 미만의 기울임은 0으로 — 손가락을 얹기만 해도 걷는 것을 막는다 */
export const DEADZONE = 0.18;

export interface Vec2 { x: number; y: number }

/**
 * 조이스틱 기울임 → 축 값. 반환 길이는 0~1이다.
 *
 * **정규화가 아니라 클램프**인 것이 핵심이다. 길이를 항상 1로 만들면 살짝 밀어도 전속력이
 * 되어 아날로그 조작의 의미가 사라진다. 반경을 넘어선 것만 1로 자른다.
 */
export function stickAxes(dx: number, dy: number, radius = STICK_RADIUS, deadzone = DEADZONE): Vec2 {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { x: 0, y: 0 };
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 0, y: 0 };
  const t = Math.min(1, len / Math.max(1e-6, radius));
  if (t < deadzone) return { x: 0, y: 0 };
  // 데드존 바깥을 0~1로 다시 편다 — 데드존 경계에서 속도가 튀지 않게.
  const scaled = (t - deadzone) / (1 - deadzone);
  return { x: (dx / len) * scaled, y: (dy / len) * scaled };
}

/** 손잡이를 그릴 위치(중심 기준 오프셋). 반경 밖으로 나가지 않는다. */
export function knobOffset(dx: number, dy: number, radius = STICK_RADIUS): Vec2 {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 0, y: 0 };
  const k = Math.min(1, radius / len);
  return { x: dx * k, y: dy * k };
}

/**
 * 터치 슬롯 — 어느 손가락이 무엇을 조작 중인가.
 *
 * ⚠ **이동(`move`) 슬롯이 여기서 빠졌다** (2026-08-21, 팀장 판정 (나)). 이동 조이스틱은
 * 이제 **전용 DOM 원**이 `setPointerCapture` 로 직접 붙들므로 이 계층이 id 를 셀 필요가
 * 없다. 남은 것은 시선 하나다 — 그것만 여전히 캔버스 위 아무 데서나 시작하기 때문이다.
 * 왜 그렇게 바꿨는지는 `assignSlot` 이 있던 자리의 주석 한 곳에 있다.
 */
export interface TouchSlots {
  /** 시선 드래그를 쥔 touch id */
  look: number | null;
}

export const NO_SLOTS: TouchSlots = { look: null };

/**
 * **현재 화면에 닿아 있는 id 집합**으로 슬롯을 청소한다.
 *
 * 매 터치 이벤트마다 부른다. touchend가 유실돼도 다음 이벤트에서 죽은 슬롯이 정리되므로,
 * "조이스틱이 붙은 채 아바타가 저절로 걷는" 상태가 지속될 수 없다.
 */
export function reconcile(slots: TouchSlots, liveIds: readonly number[]): TouchSlots {
  const live = new Set(liveIds);
  return {
    look: slots.look !== null && live.has(slots.look) ? slots.look : null,
  };
}

// ── ⚠ `assignSlot` 이 여기 있었다 — 지웠다 (팀장 판정 (나), 2026-08-21) ─────
//
// 그 함수는 새 터치를 **화면 좌/우 절반**으로 갈랐다(`x < viewportWidth / 2` → 이동).
// 주행만 있을 때는 맞는 설계였다. 그런데 편집(`?edit=1`)이 생기면서 **그 판정이 충돌의
// 근원**이 됐다: 캔버스 왼쪽 절반 어디를 눌러도 이동 슬롯이 잡히는데, 같은 터치가
// `edit/input.ts` 의 `pointerdown` 에도 들어가서 **물건이 선택되면서 동시에 아바타가
// 걸었다**(백로그 `G-EDIT14` — 그 항목이 오래 「있다고 적혀 있었는데 없던」 참조였다).
//
// **선택지 셋 중 (나) 를 골랐다**(팀장):
//   (가) 편집 중 조이스틱을 뗀다 → 폰에서 편집 중 이동 수단이 **0**이 된다(궤도·줌·비행이
//        폰에 없다). 기각.
//   (다) 편집 중에만 축소·이동 → 같은 기능이 두 형태로 살아 **코드가 두 벌**이 된다. 기각.
//   **(나) 전용 DOM 원 + `setPointerCapture`** → 판정이 원 안으로 좁아져 **캔버스 나머지가
//        편집에 자유로워진다.** 원인 제거이고, 선례가 같은 저장소에 있다
//        (`frontend/builder.html` 의 `.joy` — 112px 원 + 포인터 캡처).
//
// 그래서 이 자리에 대응 함수를 **다시 만들지 않았다** — 「원 안인가」는 브라우저가
// `pointerdown` 의 타깃으로 이미 알려주므로 순수 함수로 다시 계산할 것이 없다.
// **쓸 소비자가 없는 문을 미리 내지 않는다**(`decide/modal-edit.ts`).
//
// ⚠ 대가를 정직하게 적는다: **조이스틱이 「누른 자리에 생기는」 것을 잃었다.** 그 설계의
// 근거는 *"엄지가 닿는 위치가 기기·손 크기마다 다르므로 고정하면 누군가는 늘 불편하다"*
// 였고 지금도 참이다. 그러나 「누른 자리에 생긴다」와 「전용 요소 안에서만 판정한다」는
// **양립 불가**다 — 자리가 정해져야 판정 영역이 정해진다. 편집 충돌 쪽이 더 비싸서 이쪽을
// 내줬다. 되돌릴 조건: 감독이 실기기에서 **「조이스틱 자리가 손에 안 맞는다」** 고 말할 때.

/** 시선 회전량(라디안). 픽셀 이동을 감도로 환산한다. */
export const LOOK_SENSITIVITY = 0.0032;

export function lookDelta(dx: number, dy: number, sensitivity = LOOK_SENSITIVITY): Vec2 {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { x: 0, y: 0 };
  // `-0 * s`는 -0이다. 값으로는 0과 같지만 밖으로 흘려보내지 않는다 — Object.is 나
  // 직렬화에서 0과 다르게 취급돼 엉뚱한 곳에서 시간을 쓰게 만드는 종류다.
  const norm = (v: number) => (v === 0 ? 0 : v);
  return { x: norm(-dx * sensitivity), y: norm(-dy * sensitivity) };
}

/**
 * 터치 기기인가. 조이스틱을 띄울지 판정한다.
 *
 * 화면 폭이 아니라 **포인터 종류**로 본다. 좁은 창의 데스크톱에 조이스틱이 뜨거나,
 * 큰 태블릿에서 안 뜨는 일을 막는다.
 */
export function isTouchDevice(nav: { maxTouchPoints?: number } | undefined, matchCoarse: boolean): boolean {
  const pts = nav?.maxTouchPoints ?? 0;
  return pts > 0 || matchCoarse;
}
