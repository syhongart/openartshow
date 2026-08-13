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
import { RY_STEP, S_STEP, Y_STEP, select, type EditState } from './state.js';
import { nudgeScale } from './target.js';
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

  // ── 포인터 ──────────────────────────────────────────────────────────────
  const onPointerDown = (ev: PointerEvent) => {
    if (ev.target !== canvas) return;
    if (ev.button === 2) { st.orbiting = true; return; }
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

  const onPointerMove = (ev: PointerEvent) => {
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
    deps.gizmo.end();
  };

  // 캔버스 클릭이 포인터락으로 가는 것을 **캡처 단계**에서 끊는다(`mode.ts` 헤더 참조).
  const onClickCapture = (ev: Event) => {
    if (ev.target === canvas) ev.stopPropagation();
  };
  const onContextMenu = (ev: Event) => { if (ev.target === canvas) ev.preventDefault(); };

  // ── 키 ──────────────────────────────────────────────────────────────────
  // 주행 키(WASD·화살표·Shift)는 `main.ts` 가 소유한다. 여기서 쓰는 것은 그 목록에 없는
  // 것뿐이라 서로 가로채지 않는다.
  const EDIT_KEYS = new Set([
    'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyZ', 'KeyX', 'Delete', 'Backspace',
  ]);

  const onKeyDown = (ev: KeyboardEvent) => {
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
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
      case 'KeyR': nudgeScale(sel, S_STEP); break;
      case 'KeyF': nudgeScale(sel, 1 / S_STEP); break;
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
      doc.removeEventListener('keydown', onKeyDown);
      doc.removeEventListener('dragover', onDragOver);
      doc.removeEventListener('drop', onDrop);
    },
    bindAlways(): void { doc.addEventListener('keydown', onModeKey); },
    unbindAlways(): void { doc.removeEventListener('keydown', onModeKey); },
  };
}
