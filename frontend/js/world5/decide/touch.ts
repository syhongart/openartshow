// world2/decide/touch.ts — 터치 조작 판정. 순수 함수만, import 0.
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

/** 조이스틱 손잡이가 중심에서 벗어날 수 있는 최대 반경(px) */
export const STICK_RADIUS = 52;
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

/** 터치 슬롯 — 어느 손가락이 무엇을 조작 중인가 */
export interface TouchSlots {
  /** 이동 조이스틱을 쥔 touch id. 없으면 null */
  move: number | null;
  /** 시선 드래그를 쥔 touch id */
  look: number | null;
}

export const NO_SLOTS: TouchSlots = { move: null, look: null };

/**
 * **현재 화면에 닿아 있는 id 집합**으로 슬롯을 청소한다.
 *
 * 매 터치 이벤트마다 부른다. touchend가 유실돼도 다음 이벤트에서 죽은 슬롯이 정리되므로,
 * "조이스틱이 붙은 채 아바타가 저절로 걷는" 상태가 지속될 수 없다.
 */
export function reconcile(slots: TouchSlots, liveIds: readonly number[]): TouchSlots {
  const live = new Set(liveIds);
  return {
    move: slots.move !== null && live.has(slots.move) ? slots.move : null,
    look: slots.look !== null && live.has(slots.look) ? slots.look : null,
  };
}

/**
 * 새 터치를 어느 슬롯에 배정할까. 화면 좌/우 절반으로 가른다.
 * 이미 찬 슬롯이면 null — 한 손가락이 두 역할을 겸하지 않는다.
 *
 * ⚠ **world2 는 2026-08-21 에 이 함수를 지웠다**(`G-EDIT14`, 팀장 판정 (나)). 「화면 왼쪽
 * 절반」 판정이 편집 모드와 충돌하는 근원이었기 때문이다 — 같은 터치가 조이스틱과
 * `edit/input.ts` 의 `pointerdown` 에 둘 다 들어가 **물건이 선택되면서 동시에 아바타가
 * 걸었다.** world2 는 이동을 전용 DOM 원 + `setPointerCapture` 로 옮겨 원인을 없앴다.
 *
 * **여기(이 세계)는 그대로 둔다** — 팀장이 「world2 만 먼저」로 범위를 좁혔고, 이 세계에는
 * 아직 편집 모드가 없어 충돌 자체가 성립하지 않는다. **편집을 이 세계에 여는 날 함께
 * 본다** — 그때 이 파일이 world2 와 갈라져 있다는 것을 여기서 알 수 있어야 한다.
 * 판정 전문·선택지·기각 사유는 `frontend/js/world2/decide/touch.ts` 의 그 함수가 있던
 * 자리 한 곳이다(여기에 다시 적지 않는다).
 */
export function assignSlot(
  slots: TouchSlots, x: number, viewportWidth: number,
): 'move' | 'look' | null {
  const wantMove = x < viewportWidth / 2;
  if (wantMove) return slots.move === null ? 'move' : null;
  return slots.look === null ? 'look' : null;
}

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
