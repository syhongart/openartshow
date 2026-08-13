// world2/edit/input.ts — 포인터·키·끌어다놓기. 그리고 **언제 붙어 있는가**.
//
// ── 이 파일의 요점은 리스너가 아니라 「붙였다 뗀다」 다 ──────────────────────
// **주행 모드에서는 편집 리스너가 하나도 없다.** 조건문으로 걸러내는 것이 아니라 붙였다
// 떼는 것이 요점이다 — 조건이 하나라도 새면 주행이 또 죽고, 그 실패는 감독 화면에서만
// 드러난다(2026-08-12 사고가 정확히 그랬다). 그래서 이 모듈이 주행에 미치는 영향이
// **구조적으로 0** 이다.
//
// 예외는 `Tab` 하나다. 편집이 꺼져 있어도 켤 수 있어야 하므로 상시 붙는다.

import { isSafeSrc } from '../decide/overlay.js';
import type { OverlayHost } from './types.js';
import { RY_STEP, Y_STEP, select, type EditState } from './state.js';
import {
  applyDelta, modalDelta, modalLabel, modalOpener, readModalKey, ZERO_DELTA,
} from '../decide/modal-edit.js';
import { ORBIT_LIFT_PER_PX, ORBIT_YAW_PER_PX, zoomFactor } from '../decide/orbit.js';
import type { Panel } from './panel/dom.js';
import type { Picker } from './pick.js';
import type { Actions } from './actions.js';
import type { Gizmo } from './gizmo.js';

export interface InputDeps {
  host: OverlayHost;
  st: EditState;
  panel: Panel;
  picker: Picker;
  actions: Actions;
  gizmo: Gizmo;
  /** `Tab` 과 토글 버튼이 부르는 것. 모드 전환은 조립자(`mode.ts`)가 소유한다 */
  toggleEditing(): void;
  /** 드래그드롭으로 만든 임시 주소를 소비자에게 넘겨 회수하게 한다 */
  onBlobUrl(url: string): void;
}

export interface Input {
  bind(): void;
  unbind(): void;
  /** 편집 여부와 무관하게 붙는 것(`Tab`). 세션 시작·끝에 한 번씩 */
  bindAlways(): void;
  unbindAlways(): void;
}

export function createInput(deps: InputDeps): Input {
  const { host, st, panel, picker, actions } = deps;
  const doc = host.doc;
  const canvas = host.canvas;
  /**
   * 마지막 마우스 자리. **모달은 키로 시작하므로 시작점을 따로 기억해야 한다** —
   * 그 순간의 `PointerEvent` 가 없기 때문이다. 이것이 없으면 `G` 를 누른 직후 첫
   * 마우스 이동에 물건이 화면 끝으로 튄다(시작점이 0,0 이 되므로).
   */
  let mouseX = 0;
  let mouseY = 0;

  // ── 궤도 시점 (W5 E3) ───────────────────────────────────────────────────
  //
  // 감독 카드 판정 2026-08-13: 「시점(E3)까지 만들고 한 번에」.
  //
  // 지금까지 편집의 시점은 **우드래그로 고개만 돌리는 것**이었다. 제자리에서 둘러볼 수는
  // 있어도 **건물 뒤로 돌아가 볼 수는 없었다** — 옮긴 것이 뒤에서 어떻게 보이는지가
  // 편집에서 가장 자주 필요한 확인인데 그게 안 됐다.
  //
  // 조작은 블렌더를 따른다: **중클릭 드래그** = 궤도, `Alt`+좌드래그 = 같은 것(중클릭이
  // 없는 트랙패드용), **휠** = 줌. `Shift`+드래그 = 위아래(눈높이).
  //
  // ⚠ **팬은 안 넣는다**(팀장 승인). 궤도 중심이 「고른 것」이므로 **다른 것을 클릭하는
  // 것이 곧 팬**이다. 문이 좁을수록 좋고, 감독이 필요하다고 하면 그때 연다.

  /** 궤도 드래그 중인가. `null` 이면 아니다 */
  let orbitDrag: { shift: boolean } | null = null;

  /**
   * 무엇을 중심으로 도는가.
   *
   * 고른 것이 있으면 그것, 없으면 **지금 보고 있는 지면**이다. 아무것도 안 골랐다고
   * 궤도를 죽이면 «클릭부터 해야 화면이 돈다» 가 되고, 그것은 둘러보려는 사람에게
   * 순서를 강요하는 것이다.
   *
   * ⚠ 화면 중앙 지면을 구하려면 광선이 필요한데, 그 광선은 **포인터 위치**로만 쏠 수
   * 있다(`picker.castFrom` 이 이벤트를 받는다). 중클릭 드래그 중에는 포인터가 곧
   * 시선이 아니므로 근사다 — 감독이 «중심이 엉뚱하다» 고 하면 그때 화면 중앙 광선을
   * 따로 연다(지금은 그 문이 없다).
   */
  const orbitCenter = (ev: PointerEvent): { x: number; y: number; z: number } | null => {
    const t = st.target;
    if (t) return { x: t.x, y: t.y, z: t.z };
    if (!picker.castFrom(ev)) return null;
    const at = picker.planeAt(0);
    return at ? { x: at.x, y: 0, z: at.z } : null;
  };

  /** 궤도 한 걸음. 문이 없는 소비자면 **조용히 아무것도 안 한다** */
  const stepOrbit = (ev: PointerEvent, dx: number, dy: number, kRadius: number): void => {
    if (!host.orbit) return;
    const c = orbitCenter(ev);
    if (!c) return;
    // `Shift` 는 **위아래**다 — 가로 이동을 무시하고 눈높이만 민다. 두 축을 동시에
    // 열면 대각선 드래그에서 «돌면서 올라가» 어디를 보고 있었는지 놓친다.
    const shift = orbitDrag?.shift ?? false;
    host.orbit(
      c.x, c.y, c.z,
      shift ? 0 : -dx * ORBIT_YAW_PER_PX,
      shift ? -dy * ORBIT_LIFT_PER_PX : 0,
      kRadius,
    );
  };

  const onWheel = (ev: WheelEvent) => {
    if (!host.orbit || ev.target !== canvas) return;
    // 편집 중 휠은 **줌 전용**이다. 안 막으면 페이지가 스크롤되고, 편집 패널이 길어지는
    // 넓은 화면에서 그것이 실제로 일어난다.
    ev.preventDefault();
    const c = orbitCenter(ev as unknown as PointerEvent);
    if (!c) return;
    host.orbit(c.x, c.y, c.z, 0, 0, zoomFactor(ev.deltaY));
  };

  // ── 포인터 ──────────────────────────────────────────────────────────────
  const onPointerDown = (ev: PointerEvent) => {
    // 모달 중 클릭은 **확정/취소**다. 캔버스 밖이어도 받는다 — 조작 중에 커서가
    // 패널 위로 나가도 확정할 수 있어야 한다(블렌더도 그렇다).
    if (st.modal) {
      if (ev.button === 0) endModal(true);
      else if (ev.button === 2) endModal(false);
      return;
    }
    if (ev.target !== canvas) return;
    if (ev.button === 2) { st.orbiting = true; return; }
    // 중클릭(1) 또는 `Alt`+좌클릭 = 궤도. 후자는 **중클릭이 없는 트랙패드**용이고
    // 블렌더도 같은 대안을 준다(그쪽은 환경설정 «Emulate 3 Button Mouse»).
    if (ev.button === 1 || (ev.button === 0 && ev.altKey)) {
      orbitDrag = { shift: ev.shiftKey };
      // 중클릭 기본 동작(자동 스크롤)을 막는다 — 안 막으면 커서가 스크롤 모드로 바뀐다.
      ev.preventDefault();
      return;
    }
    if (ev.button !== 0) return;
    if (!picker.castFrom(ev)) return;

    // ⚠ **기즈모가 항목보다 먼저다.** 핸들은 물건 위에 겹쳐 그려지므로(`depthTest:false`)
    // 항목을 먼저 찾으면 축을 잡으려던 클릭이 «물건 선택» 으로 먹힌다 — 그러면 기즈모가
    // 있어도 못 쓴다. 광선은 한 번만 쏘고 결과를 두 소비자가 나눠 본다.
    const handle = deps.gizmo.hitTest(picker.intersect());
    if (handle) {
      deps.gizmo.begin(handle, picker.ray());
      return;
    }

    const hit = picker.pick();
    if (hit) {
      // **선택을 바꾸는 자리는 `select()` 하나다** — 세 칸이 함께 움직여야 링·패널·
      // 기즈모가 같은 것을 가리킨다(`state.ts` 의 불변식).
      select(st, host, { entry: hit });
      st.dragging = hit;
      st.dragPlaneY = hit.y;
      panel.refresh();
      return;
    }
    if (st.pendingSrc) {
      const at = picker.groundAt();
      if (at) void actions.placeAt(st.pendingSrc, at);
      // 하늘을 클릭하면 광선이 지면 평면과 안 만나 `null` 이 온다. 예전엔 여기서 **아무
      // 말도 안 했다** — 화면은 「지면을 클릭하면 놓입니다」 라고 안내해 놓고 침묵하니
      // «또 안 먹네» 가 된다(실측 2026-08-12: 1280×800 에서 화면 중앙 y=50% 는 지평선이라
      // 안 놓이고, y=62% 부터 놓였다). 침묵이 이번 사고의 절반이었다.
      else panel.say('그 자리는 하늘입니다 — 화면 아래쪽 땅을 클릭하세요.', true);
      return;
    }

    // ── 마을 파츠 (W4 ②-c) ──────────────────────────────────────────────────
    // **오버레이보다 뒤다.** 감독이 놓은 GLB 가 마을 건물에 겹쳐 있으면 놓은 쪽이
    // 먼저 잡혀야 한다 — 마을은 어디에나 있고 GLB 는 일부러 그 자리에 둔 것이다.
    // 그리고 **놓기(`pendingSrc`)보다도 뒤다**: 팔레트에서 고른 상태로 건물을 클릭하면
    // 의도는 «여기 놓는다» 이지 «저 건물을 고른다» 가 아니다.
    const vhit = picker.pickVillage();
    if (vhit) {
      select(st, host, { village: vhit });
      // ⚠ 마을 파츠는 **좌드래그로 안 끈다**(`st.dragging` 을 안 채운다). 그 경로는
      // 지면 평면 교차로 x·z 를 매 프레임 밀어 넣는데, 마을에서는 그것이 곧 파셀
      // 재빌드라 건물이 드래그 내내 깜빡인다. 옮기기는 **기즈모 축**으로 한다 —
      // 판단과 그 대가는 `target.ts` 헤더 한 곳이다.
      panel.refresh();
      return;
    }

    select(st, host, null);
    panel.refresh();
  };

  /**
   * 지금 모달 상태로 대상 값을 다시 만든다. **마우스 이동과 숫자 타이핑이 같은 자리로
   * 들어온다** — 타이핑도 즉시 화면에 보여야 하므로 둘이 갈라지면 안 된다.
   */
  const applyModal = () => {
    const m = st.modal;
    const t = st.target;
    const from = st.modalFrom;
    if (!m || !t || !from) return;
    const d = modalDelta(m.kind, m.axis, m.digits, mouseX - m.startX, mouseY - m.startY);
    const p = applyDelta(from, d);
    t.x = p.x; t.y = p.y; t.z = p.z; t.ry = p.ry; t.s = p.s;
    // 조작 중에는 `apply` 만 — 확정은 끝낼 때 한 번이다(`target.ts` 헤더).
    t.apply();
    // 블렌더가 헤더에 적는 그것. **화면이 지금 무엇을 하고 있는지 말한다** — 모달은
    // 눈에 보이는 핸들이 없어서, 이 한 줄이 없으면 «키를 눌렀는데 뭐가 시작된 건지»
    // 를 알 수 없다(기즈모는 잡은 축이 색으로 보이지만 모달은 아무것도 안 보인다).
    panel.say(`${modalLabel(m, d)}  ·  X/Y/Z 축 · 숫자 입력 · 클릭·Enter 확정 · Esc 취소`);
    panel.refresh();
  };

  /** 모달 조작을 끝낸다. `keep=false` 면 시작 자세로 되돌린다(취소) */
  const endModal = (keep: boolean) => {
    const t = st.target;
    const from = st.modalFrom;
    if (t && from) {
      if (keep) {
        t.commit();
      } else {
        // 취소 — 델타 0 을 적용하면 시작 자세다. `commit` 을 **안 부르므로** 동결도
        // 안 생긴다(마을 파츠를 잘못 건드렸다가 무르는 경로가 여기다).
        const p = applyDelta(from, ZERO_DELTA);
        t.x = p.x; t.y = p.y; t.z = p.z; t.ry = p.ry; t.s = p.s;
        t.apply();
      }
    }
    st.modal = null;
    st.modalFrom = null;
    // 상태 줄이 조작 문구(`이동 X: 2.5m`)를 든 채 남으면 **끝났는지 아닌지**가 화면에서
    // 구별되지 않는다 — 모달은 보이는 핸들이 없으므로 그 줄이 유일한 표지다.
    panel.say(keep ? '확정했습니다.' : '취소했습니다 — 시작 자리로 되돌렸습니다.');
    panel.refresh();
  };

  const onPointerMove = (ev: PointerEvent) => {
    mouseX = ev.clientX;
    mouseY = ev.clientY;
    // ⚠ **모달이 가장 먼저다.** 조작 중에는 기즈모도 드래그도 안 듣는다 — 블렌더가
    // 그렇고, 안 그러면 `G` 로 밀던 중 기즈모 위를 지나가면 두 조작이 겹친다.
    if (st.modal) { applyModal(); return; }
    // 궤도가 **고개 돌리기보다 먼저다** — 둘 다 드래그라 순서가 곧 «어느 버튼이 이기는가»
    // 이고, 중클릭을 눌렀는데 시선만 도는 것은 조작이 안 먹는 것으로 읽힌다.
    if (orbitDrag) { stepOrbit(ev, ev.movementX, ev.movementY, 1); return; }
    if (st.orbiting) { host.look(ev.movementX, ev.movementY); return; }
    if (deps.gizmo.dragging) {
      if (!picker.castFrom(ev)) return;
      if (!deps.gizmo.update(picker.ray())) return; // 축과 나란하거나 값이 안 바뀐 프레임
      // **드래그 중에는 `apply` 만.** 확정(`commit`)은 손을 뗄 때 한 번이다 —
      // 마을에서 매 프레임 확정하면 파셀이 프레임마다 다시 만들어진다(`target.ts`).
      st.target?.apply();
      panel.refresh();
      return;
    }
    if (!st.dragging) return;
    if (!picker.castFrom(ev)) return;
    const at = picker.planeAt(st.dragPlaneY);
    if (!at) return;
    st.dragging.x = at.x;
    st.dragging.z = at.z;
    host.apply(st.dragging);
    panel.refresh();
  };

  // `pointercancel` 도 같은 정리를 한다 — 터치에서 브라우저가 제스처를 가로채면
  // `pointerup` 이 **안 온다.** 그러면 `dragging` 이 영구히 남아 이후 모든 손가락이
  // 물건을 끌고 다닌다. 이 저장소는 이미 그 축을 안다(`builder.js` 의
  // *"브라우저가 제스처를 가로챌 때(pointercancel) — 커밋 없이 정리만"*) — 여기만 빠져 있었다.
  const onPointerUp = () => {
    // **여기가 확정 지점이다.** 드래그가 실제로 있었을 때만 부른다 — 빈 곳을 클릭했다
    // 떼는 것만으로 파셀이 다시 만들어지면 헛일이다.
    if (st.dragging || deps.gizmo.dragging) st.target?.commit();
    st.dragging = null;
    st.orbiting = false;
    // ⚠ 여기서 `endOrbit()` 을 부르지 **않는다.** 그것은 «편집을 끝냈다» 이지 «드래그를
    // 놓았다» 가 아니다 — 손을 뗄 때마다 눈높이가 지면으로 떨어지면 궤도가 성립하지 않는다.
    orbitDrag = null;
    deps.gizmo.end();
  };

  // 캔버스 클릭이 포인터락으로 가는 것을 **캡처 단계**에서 끊는다(`mode.ts` 헤더 참조).
  const onClickCapture = (ev: Event) => {
    if (ev.target === canvas) ev.stopPropagation();
  };
  const onContextMenu = (ev: Event) => { if (ev.target === canvas) ev.preventDefault(); };

  // ── 키 ──────────────────────────────────────────────────────────────────
  // 주행 키(WASD·화살표·Shift)는 `main.ts` 가 소유한다.
  //
  // ⚠ **모달(`G`/`R`/`S`)이 들어오면서 그 «서로 안 겹친다» 가 깨졌다** — `S` 는 주행의
  // «뒤로» 다(`main.ts:1252` 의 `KeyS: 'back'`). 두 가지로 지킨다:
  //   ① **대상을 골랐을 때만** 모달을 연다. 아무것도 안 골랐으면 `S` 는 그냥 뒤로 걷는다.
  //   ② 모달이 실제로 먹은 키만 `stopPropagation()` 한다. 편집은 **document** 에,
  //      주행은 **window** 에 붙어 있어서 버블 순서가 document → window 다 —
  //      즉 등록 순서와 무관하게 **구조적으로** 우리가 먼저 보고 끊을 수 있다.
  //      (`keyup` 은 안 막는다. 막으면 주행이 «눌린 채» 로 굳는다.)
  //
  // ⚠ **`R`/`F`(크기)를 키에서 뺐다.** 블렌더에서 `R` 은 회전이고 감독이 *"블랜더 잘써서
  // 오히려 그런 방식이 편하지"* 라고 했다 — 표준 쪽을 남긴다. 크기는 `S` 모달로 간다.
  // 패널의 「− 크기 / 크기 +」 버튼은 그대로라 조작 수단이 사라지지는 않는다.
  const EDIT_KEYS = new Set([
    'KeyQ', 'KeyE', 'KeyZ', 'KeyX', 'Delete', 'Backspace',
  ]);

  const onKeyDown = (ev: KeyboardEvent) => {
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    // 조합키는 브라우저·OS 것이다(⌘R 새로고침, Ctrl+Shift+I). 가로채면 안 된다 —
    // 특히 `R`·`S` 는 모달 여는 키라 이 가드가 없으면 저장·새로고침을 먹는다.
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;

    // ── 모달이 가장 먼저다 ────────────────────────────────────────────────
    // 조작 중에는 숫자·`Escape`·축 키를 받아야 하므로 `EDIT_KEYS` 걸러내기보다 앞이다.
    if (st.modal) {
      const act = readModalKey(st.modal, ev.code, ev.key);
      if (!act) {
        // ⚠ **모달을 여는 키(G/R/S)는 모달 중에도 삼킨다** — 검수관 반려 B2, 2026-08-13.
        //
        // `readModalKey` 는 `S` 를 축·숫자·확정·취소 어디에도 안 넣으므로 `null` 을 내고,
        // 그러면 이 return 이 `stopPropagation` **앞**이라 이벤트가 window 로 올라간다.
        // `main.ts` 의 `KEYS` 가 `KeyS: 'back'` 이므로 **크기 모달이 열린 채 뒤로 걷기가
        // 함께 켜진다.** 검수관 jsdom 재현: 첫 `S` 는 `defaultPrevented=true`(모달을
        // 연다), 두 번째부터 `false`(주행으로 샌다) — OS 키 반복이 그것을 만든다.
        //
        // 그래서 **여는 키만** 삼킨다. `W`·`A`·`D` 는 그대로 통과하므로 아래 «모르는 키는
        // 통과» 규칙과 충돌하지 않는다. 대가는 정직하게 적는다: **모달 중에는 뒤로
        // 걷기가 안 된다**(`S` 가 죽는다). 앞·옆으로는 걸어다닐 수 있다.
        //
        // 왜 «모달을 연 그 키만» 이 아니라 «여는 키 전부» 인가: 후자는 상태에 안 묶여
        // «모달 중 조작 키는 주행으로 안 샌다» 한 문장으로 설명된다. 전자는 G 모달에서는
        // `S` 가 살고 S 모달에서는 죽어, 같은 키가 상황따라 다르게 동작한다.
        if (modalOpener(ev.code)) { ev.preventDefault(); ev.stopPropagation(); }
        // 그 외 모르는 키는 **통과시킨다** — 조작 중에도 WASD 로 걸어다닐 수 있어야 한다
        // (델타는 월드 기준이라 카메라가 움직여도 값은 안 흔들린다).
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      if (act.act === 'cancel') { endModal(false); return; }
      if (act.act === 'commit') { endModal(true); return; }
      // 상태는 **갈아 끼운다**(불변 객체) — 제자리 수정하면 «어디서 바뀌었나» 가 흩어진다.
      st.modal = act.act === 'axis'
        ? { ...st.modal, axis: act.axis }
        : { ...st.modal, digits: act.digits };
      applyModal();
      return;
    }

    // ── 모달 진입 ─────────────────────────────────────────────────────────
    const opener = modalOpener(ev.code);
    if (opener) {
      // ⚠ **대상이 없으면 조용히 통과한다.** 여기서 «먼저 고르세요» 를 말하면 `S` 로
      // 뒤로 걸을 때마다 안내가 뜬다 — 아래 `EDIT_KEYS` 의 «말없이 죽지 않는다» 와
      // 반대로 가는 것이 맞는 자리다. 저 키들은 편집 전용이고 이 키는 **주행과 공유**다.
      if (!st.target) return;
      ev.preventDefault();
      ev.stopPropagation();
      const sel = st.target;
      st.modal = { kind: opener, axis: null, digits: '', startX: mouseX, startY: mouseY };
      st.modalFrom = { x: sel.x, y: sel.y, z: sel.z, ry: sel.ry, s: sel.s };
      // 시작 즉시 한 번 그린다 — 마우스를 움직이기 전에도 «무엇이 시작됐는지» 가 보여야
      // 한다(델타 0 이라 값은 안 변한다).
      applyModal();
      return;
    }

    if (!EDIT_KEYS.has(ev.code)) return;
    // ⚠ **말없이 죽지 않는다.** 예전에는 `if (!selected) return` 이 맨 위에 있어서
    // 아무것도 안 골랐을 때 편집키가 **침묵**했다 — 같은 조작의 패널 버튼은
    // *"먼저 물건을 클릭해 고르세요"* 라고 말하는데 키만 조용했다. 조작이 안 먹는 것과
    // 대상이 없는 것은 다른 일이고, 화면이 그것을 갈라 줘야 한다.
    if (!st.target) { panel.say('먼저 물건을 클릭해 고르세요.'); return; }
    ev.preventDefault();
    const sel = st.target;
    switch (ev.code) {
      case 'KeyQ': sel.ry -= RY_STEP; break;
      case 'KeyE': sel.ry += RY_STEP; break;
      case 'KeyZ': sel.y -= Y_STEP; break;
      case 'KeyX': sel.y += Y_STEP; break;
      // `Backspace` 도 받는다 — **맥 키보드에는 `Delete` 코드의 키가 없다**(그 자리가
      // `Backspace` 다). hint 가 "Del 삭제" 를 광고하는데 맥에서는 영구 무반응이었다.
      case 'Delete': case 'Backspace': actions.removeSelected(); return;
    }
    sel.apply();
    // 키 한 번은 «조작이 끝났다» 이다 — 버튼과 같다.
    sel.commit();
    panel.refresh();
  };

  /** 모드 전환 단축키. 편집 중이 아닐 때도 들어야 하므로 **항상** 붙어 있다. */
  const onModeKey = (ev: KeyboardEvent) => {
    if (ev.code !== 'Tab') return;
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    ev.preventDefault(); // 포커스 이동을 막는다 — 안 막으면 패널 버튼으로 포커스가 튄다
    deps.toggleEditing();
  };

  // ── 끌어다 놓기 ─────────────────────────────────────────────────────────
  const onDragOver = (ev: DragEvent) => { ev.preventDefault(); };
  const onDrop = (ev: DragEvent) => {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (!file) return;
    const src = `assets/models/${file.name}`;
    if (!isSafeSrc(src)) {
      // 계약(`decide/overlay.ts`)이 허용 문자를 정한다. 여기서 넓히지 않고 **왜 안 되는지**
      // 를 말한다 — 계약 주석이 *"거부 사유가 한 종류라 원인을 알 수 없다"* 고 남긴 자리다.
      panel.say(`«${file.name}» 은 쓸 수 없는 이름입니다 — 영문·숫자·_ - . 만, 확장자는 소문자 .glb`, true);
      return;
    }
    if (!picker.castFrom(ev)) return;
    const at = picker.groundAt();
    if (!at) { panel.say('지면이 보이는 쪽에 놓아 주세요.', true); return; }
    const url = URL.createObjectURL(file);
    deps.onBlobUrl(url);
    actions.previewUrls.set(src, url);
    // ⚠ **드롭은 `pendingSrc` 를 안 본다** — 파일명에서 `src` 를 직접 만든다. 그래서
    // 팔레트에서 뭔가 골라 둔 채 드롭해도 그 «고른 것» 이 아니라 **드롭한 파일**이 놓인다.
    //
    // 다만 부수효과가 하나 있다: `placeAt` 이 성공하면 고르기를 푸는데(감독 신고
    // 「흩어뿌리기」 처방), 그 해제가 **드롭으로 놓았을 때도** 일어난다. 즉 골라 둔 것이
    // 함께 풀린다. 해로운 동작은 아니고 «놓았으면 다루기로 넘어간다» 와 일관되지만,
    // 적어 두지 않으면 다음 사람이 «왜 드롭했더니 팔레트 고르기가 풀리지» 를 재조사한다
    // (검수관 권고 P2, 2026-08-13).
    void actions.placeAt(src, at, url);
  };

  // ── 배선 ────────────────────────────────────────────────────────────────
  let bound = false;

  return {
    bind(): void {
      if (bound) return;
      bound = true;
      doc.addEventListener('click', onClickCapture, true);
      doc.addEventListener('contextmenu', onContextMenu);
      doc.addEventListener('pointerdown', onPointerDown);
      doc.addEventListener('pointermove', onPointerMove);
      doc.addEventListener('pointerup', onPointerUp);
      doc.addEventListener('pointercancel', onPointerUp);
      // `passive: false` 여야 `preventDefault()` 가 먹는다 — 기본값이 passive 인
      // 브라우저가 있고, 그러면 줌이 페이지 스크롤과 함께 일어난다.
      doc.addEventListener('wheel', onWheel, { passive: false });
      doc.addEventListener('keydown', onKeyDown);
      doc.addEventListener('dragover', onDragOver);
      doc.addEventListener('drop', onDrop);
    },
    unbind(): void {
      if (!bound) return;
      bound = false;
      doc.removeEventListener('click', onClickCapture, true);
      doc.removeEventListener('contextmenu', onContextMenu);
      doc.removeEventListener('pointerdown', onPointerDown);
      doc.removeEventListener('pointermove', onPointerMove);
      doc.removeEventListener('pointerup', onPointerUp);
      doc.removeEventListener('pointercancel', onPointerUp);
      doc.removeEventListener('wheel', onWheel);
      doc.removeEventListener('keydown', onKeyDown);
      doc.removeEventListener('dragover', onDragOver);
      doc.removeEventListener('drop', onDrop);
    },
    bindAlways(): void { doc.addEventListener('keydown', onModeKey); },
    unbindAlways(): void { doc.removeEventListener('keydown', onModeKey); },
  };
}
