// world2/edit/mode.ts — **감독이 직접 놓는 화면.** `?edit=1` 로만 켜진다.
//
// ── 이 파일은 배선만 한다 (분해 2026-08-13) ─────────────────────────────────
// 예전에는 상태·패널·레이캐스트·조작·리스너가 전부 이 한 함수 안에 있었다(652행). 기즈모가
// 붙으면 1000행을 넘고 그때는 분해 자체가 대공사가 되므로 **키우기 전에** 갈랐다.
//   `state.ts`      상수 + 가변 상태
//   `pick.ts`       광선·선택 링
//   `panel/`        css · dom(say/refresh) · palette
//   `actions.ts`    놓기·복제·삭제·내보내기
//   `input.ts`      리스너와 «언제 붙어 있는가»
// 조립 순서가 곧 의존 방향이다 — 아래로 갈수록 앞의 것을 받는다. 되먹임은 **콜백 둘**
// (`onRefresh`·`toggleEditing`)뿐이고, 그 둘이 여기서 합쳐진다.
//
// ── 왜 editor 가 아니라 world2 안인가 (팀장 판정 2026-08-09) ─────────────────
// three.js editor 는 WebGL 이고 world2 는 WebGPU 라 룩이 다르다. world2 안에서 놓으면
// **보는 화면이 곧 배포 화면**이다.
//
// ── 이 모듈은 `?edit=1` 없는 세션에 로드조차 되지 않는다 ────────────────────
// `features/overlay.ts` 가 동적 import 로만 부른다. 그것이 라이브 격리의 전부라
// 정적 import 로 되돌리면 이 파일이 기본 번들에 들어간다(테스트가 그 축을 지킨다).
// ⚠ **분해로 늘어난 파일들도 같은 청크에 있어야 한다** — 전부 이 파일 아래로만 매달리고
// 라이브 모듈이 정적으로 가리키지 않으므로 그 성질이 유지된다.
//
// ── `TransformControls` 를 안 쓰는 이유 ─────────────────────────────────────
// `vite.config.js` 의 청크 화이트리스트가 `examples/jsm/` 중 `GLTFLoader`·
// `BufferGeometryUtils` 만 허용한다. 그 밖을 쓰면 라이브가 editor 청크를 통째로 받는다.
// `Raycaster` 는 three 코어라 무료다 — 그래서 gizmo 대신 **광선 ∩ 지면**으로 옮긴다.
// ⚠ 이 근거는 **번들 격리**이지 «three 가 두 벌 올라간다» 가 아니다(실측 2026-08-13:
// r171 부터 `three.module.js` 와 `three.webgpu.js` 가 둘 다 `three.core.js` 를 import 해
// `Object3D`·`Vector3` 가 동일하고, `vite.config.js` 도 코어를 별도 청크로 가른다).
// 기즈모를 붙일 때 다시 판정한다 — 태스크 #50.
//
// ── 포인터락 (`main.ts` 무수정) ─────────────────────────────────────────────
// 주행 모드는 캔버스 클릭으로 포인터락에 들어간다(`main.ts:1179`). 편집 중에 그것이
// 걸리면 커서가 사라져 아무것도 집을 수 없다. `main.ts` 를 고치는 대신 **document 캡처
// 단계**에서 캔버스 클릭만 끊는다 — 캡처는 document → canvas 순이라 canvas 의 at-target
// 리스너에 도달하기 전에 멈출 수 있다. 대신 시점 회전은 **우클릭 드래그**로 준다.

import type { EditSession, OverlayHost } from './types.js';
import { createEditState } from './state.js';
import { createPicker } from './pick.js';
import { createPanel } from './panel/dom.js';
import { loadPalette } from './panel/palette.js';
import { createActions } from './actions.js';
import { createInput } from './input.js';

export interface EditOptions {
  /** 팔레트 목록(`assets/models/index.json`) 의 실제 주소 */
  readonly modelsUrl: string;
  /** 미리보기로 만든 임시 주소를 소비자에게 넘겨 회수하게 한다 */
  onBlobUrl(url: string): void;
}

export function startEditMode(host: OverlayHost, opts: EditOptions): EditSession {
  const doc = host.doc;
  const st = createEditState();

  const picker = createPicker(host, st);

  // `panel` 은 조작 핸들러를 필요로 하고 그 핸들러는 `panel` 을 필요로 한다. 함수 선언은
  // 호이스팅되므로 **이름으로 먼저 묶고 실행 시점에 채워진 값을 본다** — 조립자가 이
  // 되먹임을 흡수하는 것이 요점이고, 그래서 아래 모듈들끼리는 순환이 없다.
  const panel = createPanel(host, st, {
    toggleEditing: () => { setEditing(!st.editing); },
    duplicate: () => { void actions.duplicate(); },
    removeSelected: () => { actions.removeSelected(); },
    exportNow: () => { actions.exportNow(); },
  }, () => { picker.syncMarker(st.selected); });

  const actions = createActions(host, st, panel);

  const input = createInput({
    host, st, panel, picker, actions,
    toggleEditing: () => { setEditing(!st.editing); },
    onBlobUrl: opts.onBlobUrl,
  });

  // ── 모드 전환 ───────────────────────────────────────────────────────────
  function setEditing(on: boolean): void {
    if (on === st.editing) return;
    st.editing = on;
    panel.setMode(on);
    if (on) {
      input.bind();
      // 편집에 들어오면 주행 모드의 포인터락을 푼다. 안 그러면 커서가 없어 못 집는다.
      try { doc.exitPointerLock?.(); } catch { /* 애초에 안 걸려 있었다 */ }
      // ⚠ **이 한 줄이 2026-08-12 사고의 절반이다.** 시점 조작이 우드래그로 바뀌는데 그
      // 안내가 패널 맨 아래 작은 글씨에만 있었다. 감독은 마우스를 움직여도 화면이 안 도니
      // *"아무것도 안 먹는다"* 로 읽었다. 모드가 바뀌는 순간 크게 말한다.
      panel.sayLead('편집 모드 — 시점은 마우스 오른쪽 버튼 드래그. 이동은 WASD 그대로.');
    } else {
      input.unbind();
      st.selected = null;
      st.pendingSrc = null;
      st.dragging = null;
      st.orbiting = false;
      panel.say('주행 모드 — 화면을 클릭하면 마우스로 시점이 돕니다.');
    }
    panel.refresh();
  }

  loadPalette(panel, st, opts.modelsUrl);

  // 모드 키만 상시다 — 편집이 꺼져 있어도 `Tab` 으로 켤 수 있어야 한다.
  input.bindAlways();

  panel.say('편집하려면 오른쪽 위 「편집」 버튼(또는 Tab). 지금은 평소처럼 걸어다닐 수 있습니다.');
  panel.refresh();

  return {
    dispose() {
      // 로드 중에 떠나면 `busy` 가 `true` 로 남는다. 지금은 리스너를 다 떼므로 재진입
      // 경로가 없어 실해는 없지만, 세션을 되살리는 경로가 생기면 그때 조용히 잠긴다.
      st.busy = false;
      input.unbind();
      input.unbindAlways();
      panel.dispose();
      picker.dispose();
    },
  };
}
