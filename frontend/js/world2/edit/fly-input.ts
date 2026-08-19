// world2/edit/fly-input.ts — **편집 비행의 키 입력.** 산술은 안 한다.
//
// 감독 지시 2026-08-19: *"내가 하늘을 날아서 보고 편집하게 하는건 어때"*
//
// ── 왜 `edit/input.ts` 가 아니라 새 파일인가 ────────────────────────────────
// ① **그 파일은 상한에 붙어 있다**(625줄 동결). 늘리려면 baseline 을 다시 구워야 하고,
//    그 커밋의 diff 가 「비행」이 아니라 「input.ts 를 만졌다」로 읽힌다.
// ② 그리고 성격이 다르다 — `input.ts` 의 키는 **한 번 누르면 한 번 일어나는 일**이고
//    (회전 · 삭제 · 시점 전환), 비행은 **누르고 있는 동안 매 프레임 일어나는 일**이다.
//    전자는 `keydown` 핸들러에서 끝나지만 후자는 루프가 필요하다.
//
// ── 루프를 여기가 도는 이유 ─────────────────────────────────────────────────
// `PlayerSystem.update()` 가 소비하게 만드는 편이 「시스템이 프레임을 받는다」는 커널
// 규약에는 맞다. 그런데 그러려면 **주행 이동과 비행 이동 중 무엇을 쓸지**를 그 안에서
// 갈라야 하고, 그것은 주행 경로에 편집 전용 분기를 심는 일이다 — 팀장 조건 ②의
// *"편집에서만"* 을 정면으로 어긴다.
//
// 그래서 **편집이 켜져 있는 동안에만 도는 루프**를 여기 둔다. `unbind()` 하면 루프가
// 멈추고 주행에는 이 파일의 코드가 한 줄도 안 돈다.
//
// ⚠ **키 상태를 여기가 들고 있는다**(`keydown`/`keyup` 토글). `input.ts` 처럼 이벤트마다
// 처리하지 않는 이유는 위 ②다 — 「지금 눌려 있는가」를 알아야 프레임마다 움직인다.
// 창을 벗어나면(`blur`) 전부 놓은 것으로 친다. 안 그러면 **키가 눌린 채로 남아 계속
// 날아간다** — 알트탭 한 번에 세계 밖으로 나가는 형태다.

import { NO_FLY, type FlyInput } from '../decide/fly.js';

/** 비행 키 배치. WASD 는 주행과 같고 수직 둘만 더한다 */
const FLY_KEYS: Readonly<Record<string, keyof FlyInput>> = {
  KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right',
  // 위/아래는 **Space/C** 다.
  //
  // 🔴 **하강 키가 두 번 틀렸다. 두 번 다 「무엇을 봐야 하는가」를 몰라서였다.**
  //
  //   1차 `Ctrl` — `Ctrl+W`(하강+전진)는 Chrome 계열에서 페이지가 **막을 수 없는** 탭
  //     닫기다. 편집은 자동 저장이 0이라(`G-FLY9`) 한 번에 작업을 잃는다.
  //   2차 `Shift` — 「브라우저 예약이 아니다」만 보고 골랐는데, **편집에서 `Shift` 는 이미
  //     세 가지 뜻**이었다: `Shift`+드래그 = 위아래 팬(`input.ts` 의 `orbitDrag`) ·
  //     `Shift+Z` = 와이어 토글 · 주행 달리기(`main.ts`). 누르는 순간 하강이 시작되므로
  //     **팬을 시작하기 전에 지면까지 가라앉고, 와이어를 토글할 때마다 고도가 떨어졌다.**
  //
  // ⚠⚠ **교훈(검수관)**: *"키를 옮길 때 봐야 하는 것은 «그 코드가 다른 키표에 있는가»가
  // 아니라 «그 키가 **수식키로** 쓰이는가» 다"* — 후자는 코드표 grep 으로 안 나온다.
  // 2차 때 나는 `EDIT_KEYS` 코드표만 보고, **그 문장이 가리키는 바로 그 파일의
  // `ev.shiftKey` 두 곳**을 안 봤다.
  //
  // 그래서 이번엔 **수식키를 아예 안 쓴다.** `KeyC` 는 실측으로 이 저장소 어디에도 안
  // 쓰이고(`EDIT_KEYS`·`VIEW_KEYS`·`modalOpener`·주행 키맵 전수 확인), 게임에서 웅크리기·
  // 하강의 관례 자리다. 그리고 아래 `onDown` 이 **수식키가 눌려 있으면 통째로 무시**하므로
  // `Ctrl+C`(복사) 같은 조합도 하강을 일으키지 않는다.
  //
  // ⚠ 이 배치는 `GS-F3` 검사가 지킨다 — 수식키를 비행 키로 다시 넣으면 빨간불이 된다.
  Space: 'up', KeyC: 'down',
};

export interface FlyInputHost {
  readonly doc: Document;
  /** 한 프레임의 비행. 없으면 이 모듈은 아무것도 안 한다(궤도와 같은 선택 사양 규약) */
  fly?(input: FlyInput, dt: number): void;
  /** 지금 편집 중인가 — 꺼져 있으면 루프가 돌아도 아무 일도 안 일어난다 */
  editing(): boolean;
}

export interface FlyInputHandle {
  bind(): void;
  unbind(): void;
  /** 지금 눌려 있는 키 상태. 검사가 읽는다 */
  current(): FlyInput;
}

export function createFlyInput(host: FlyInputHost): FlyInputHandle {
  const held = new Set<keyof FlyInput>();
  let raf = 0;
  let last = 0;

  const snapshot = (): FlyInput => ({
    forward: held.has('forward'), back: held.has('back'),
    left: held.has('left'), right: held.has('right'),
    up: held.has('up'), down: held.has('down'),
    // ⚠ **`fast` 는 지금 어떤 키에도 안 걸려 있다** — `Shift` 를 하강으로 옮기면서 비었다.
    // `FlyInput`·`flyDelta` 의 계약은 그대로 두었다(검사 19건이 그 축을 재고, 계약을 줄이면
    // 그 회차의 diff 가 「키 교체」가 아니라 「계약 변경」이 된다). **가속을 다시 열 것인가는
    // `G-FLY10`** — `FLY_SPEED_MULT = 3` 이 이미 걷기의 3배라 급하지 않다.
    fast: held.has('fast'),
  });

  const onDown = (ev: KeyboardEvent) => {
    // ⚠ **입력칸에서는 안 먹는다.** 패널의 수치칸에 `w` 를 치면 날아가면 안 된다 —
    // `input.ts` 가 같은 판정을 갖고 있고 같은 이유다.
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    // 🔴 **수식키가 눌려 있으면 통째로 무시한다**(검수관 반려 B4). `input.ts` 가 같은
    // 판정을 갖고 있고 같은 이유다 — `Ctrl+C`·`Ctrl+S` 같은 조합이 하강을 일으키면 안 되고,
    // `Shift`+드래그(팬)·`Alt`+드래그(궤도)가 비행과 겹치면 안 된다.
    //
    // ⚠ 이 가드는 **지금 아무 비행 키도 안 죽인다** — `FLY_KEYS` 에 수식키가 없기 때문이다.
    // 앞으로 누가 수식키를 넣으면 조용히 안 먹게 되는데, 그때 `GS-F3` 이 먼저 빨간불을 낸다.
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey) return;
    const k = FLY_KEYS[ev.code];
    if (!k || !host.editing()) return;
    held.add(k);
    wake();
    // `Space` 는 기본 동작이 스크롤이라 막는다. 안 막으면 날면서 화면이 함께 튄다.
    if (ev.code === 'Space') ev.preventDefault();
  };
  const onUp = (ev: KeyboardEvent) => {
    const k = FLY_KEYS[ev.code];
    if (k) held.delete(k);
  };
  /** 창을 벗어나면 전부 놓는다 — 위 헤더의 「알트탭 한 번에 세계 밖」 */
  const onBlur = () => { held.clear(); };

  /**
   * 🔴 **누르고 있는 동안에만 프레임을 잡는다.** 첫 판본은 `bind()` 부터 계속 돌았고,
   * 기존 검사가 그것을 잡았다 — `tests/world2-gizmo.test.ts` 의 *"붙을 것이 없으면
   * 프레임을 안 잡는다"* 가 전역 rAF 호출 수를 세는데, 아무도 키를 안 눌러도 내 루프가
   * 그 수를 밀어 올렸다(실측: 13 → 16).
   *
   * 그 검사는 검수관 P3 가 만든 것이고 규율이 이미 서 있었다 — **편집 중이라고 늘 도는
   * 것이 아니라 할 일이 있을 때만 돈다.** 비행도 같은 규율을 받는다. 편집 중 대부분의
   * 시간은 키를 안 누르고 있으므로 실질 이득도 크다.
   */
  const tick = (now: number) => {
    // ⚠ **재예약을 조건 뒤로 옮겼다.** 앞에 두면 «멈춰야 할 프레임에 이미 다음을 잡아»
    // 한 프레임이 더 돈다 — 위 검사가 재는 것이 정확히 그 수다.
    if (!host.editing() || held.size === 0) { raf = 0; last = 0; return; }
    raf = host.doc.defaultView?.requestAnimationFrame?.(tick) ?? 0;
    const dt = last > 0 ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    // dt 상한 0.1초: 탭이 백그라운드였다 돌아오면 `now` 가 크게 뛴다. 그대로 곱하면
    // **한 프레임에 수백 미터**를 날아간다(`clampFlyLift` 가 고도는 막지만 x·z 는 안 막는다).
    if (dt <= 0) return;
    host.fly?.(snapshot(), dt);
  };

  /** 멈춰 있으면 깨운다. 이미 돌고 있으면 아무 일도 안 한다(루프가 둘이 되면 두 배 난다) */
  const wake = () => {
    if (raf) return;
    last = 0;
    raf = host.doc.defaultView?.requestAnimationFrame?.(tick) ?? 0;
  };

  return {
    bind(): void {
      // ⚠ `host.fly` 가 없어도 리스너는 단다(검수관 P4). 키가 눌리면 루프도 돈다 — 다만
      // `host.fly?.()` 가 no-op 이라 아무 일도 안 일어난다. *"리스너만 달고 아무 일도 안
      // 한다"* 는 **절반만 참**이고, 그 절반은 rAF 한 개다.
      host.doc.addEventListener('keydown', onDown);
      host.doc.addEventListener('keyup', onUp);
      host.doc.defaultView?.addEventListener?.('blur', onBlur);
      // ⚠ **여기서 루프를 시작하지 않는다** — 위 `tick` 주석의 규율. 첫 키에 깨어난다.
      last = 0;
    },
    unbind(): void {
      host.doc.removeEventListener('keydown', onDown);
      host.doc.removeEventListener('keyup', onUp);
      host.doc.defaultView?.removeEventListener?.('blur', onBlur);
      if (raf) host.doc.defaultView?.cancelAnimationFrame?.(raf);
      raf = 0;
      held.clear();
    },
    current(): FlyInput {
      return held.size === 0 ? NO_FLY : snapshot();
    },
  };
}
