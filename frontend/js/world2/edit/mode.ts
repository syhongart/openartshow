// world2/edit/mode.ts — **감독이 직접 놓는 화면.** `?edit=1` 로만 켜진다.
//
// ── 제품명은 「월드스튜디오」다 (감독 명명 2026-08-15) ──────────────────────
// 이 모듈의 제품명은 「월드스튜디오」다(감독 명명 2026-08-15). 코드 이름이 `edit` 로 남은
// 것은 팀장 판정 — 이름의 적용 범위(world2 편집 한정인지, builder 포함 상위 브랜드인지)가
// 미확정인 상태에서 구조를 리네임하면 범위 확정 후 또 옮긴다. 되돌리기 쉬운 표면 반영이
// 기본값이고, 리네임은 범위 확정 후 **별도 회차·별도 PR** 에서만 재론한다. W7 에 섞지 않는다.
//
// ⚠ 범위는 그 뒤 **감독 카드로 확정됐다 — 「world2 편집 화면만」**(2026-08-15). 팀장 판정에
// 따라 그 확정이 전면 리네임의 **재론 자격**을 열었고, 실행은 태스크 #72 다(팀장 재서명 대상).
// 즉 이 주석의 «미확정» 은 판정 당시의 상태이고 지금은 해소됐다 — 그런데도 코드 이름이
// 그대로인 이유는 **리네임 diff 를 단독으로 두기 위해서**다. 라이브 격리가 아래 「동적
// import」 절의 한 줄에 걸려 있고, 그 줄이 깨지는 사고는 다른 변경과 섞였을 때 검출이 가장
// 어렵다. 되돌리기 비싼 것은 리네임이 아니라 그 사고다.
//
// ── 이 파일은 배선만 한다 (분해 2026-08-13) ─────────────────────────────────
// 예전에는 상태·패널·레이캐스트·조작·리스너가 전부 이 한 함수 안에 있었다(652행). 기즈모가
// 붙으면 1000행을 넘고 그때는 분해 자체가 대공사가 되므로 **키우기 전에** 갈랐다.
//   `state.ts`      상수 + 가변 상태
//   `pick.ts`       광선·선택 링
//   `gizmo.ts`      3축 기즈모(산술은 `decide/gizmo-math.ts`)
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
// ── 기즈모는 **자작**이다 (팀장 판정 2026-08-13) ────────────────────────────
// ⚠ 이 절은 오래 *"`TransformControls` 를 안 쓰는 이유 … gizmo 대신 광선 ∩ 지면으로
// 옮긴다"* 라고 적혀 있었고 **이제 거짓이다** — 기즈모가 실제로 붙었다.
//
// 상신해 판정을 받았다: three 의 `TransformControls`(화이트리스트 확장 또는 vendor 복사)
// vs 자작 → **자작.** 근거·조건·재론 조건의 SSOT 는 `decide/gizmo-math.ts` 헤더 한 곳이다
// — 여기에 다시 적지 않는다.
//
// 여기서만 참인 것 하나: 청크 화이트리스트(`vite.config.js`)가 `examples/jsm/` 중
// `GLTFLoader`·`BufferGeometryUtils` 만 허용하고, 자작은 **그것을 안 건드린다.**
//
// ── 포인터락 (`main.ts` 무수정) ─────────────────────────────────────────────
// 주행 모드는 캔버스 클릭으로 포인터락에 들어간다(`main.ts:1179`). 편집 중에 그것이
// 걸리면 커서가 사라져 아무것도 집을 수 없다. `main.ts` 를 고치는 대신 **document 캡처
// 단계**에서 캔버스 클릭만 끊는다 — 캡처는 document → canvas 순이라 canvas 의 at-target
// 리스너에 도달하기 전에 멈출 수 있다. 대신 시점 회전은 **우클릭 드래그**로 준다.

import type { EditSession, OverlayHost } from './types.js';
import { createEditState, select } from './state.js';
import { artTarget } from './target.js';
import { createPicker } from './pick.js';
import { createGizmo } from './gizmo.js';
import { createPanel } from './panel/dom.js';
import { loadPalette } from './panel/palette.js';
import { createActions } from './actions.js';
import { createArtworkMode } from './artwork-mode.js';
import { createAimMode } from './aim-mode.js';
import { createInput } from './input.js';
import { createFlyInput } from './fly-input.js';
import type { ArtsPort } from '../systems/art-port.js';
import { safeBack } from '../decide/shading.js';
// ⚠ **요금제는 어댑터를 거친다** — `adapters/plan.ts` 헤더가 그 이유를 갖는다(경계 게이트가
// 직접 import 를 막았고 그것이 옳다). 여기서 층위 값을 다시 적지 않는다(값 미러링).
import { canUploadGlb, tierLabel } from '../adapters/plan.js';

export interface EditOptions {
  /** 팔레트 목록(`assets/models/index.json`) 의 실제 주소 */
  readonly modelsUrl: string;
  /** 미리보기로 만든 임시 주소를 소비자에게 넘겨 회수하게 한다 */
  onBlobUrl(url: string): void;
  /**
   * 자기 GLB 를 올릴 수 있는가. **생략하면 실제 등급을 본다** — 이 저장소의 확장 규약
   * (「생략 = 기존 동작」)이고, 테스트는 값을 넣어 두 분기를 다 돌린다.
   */
  readonly canUploadGlb?: boolean;
  /**
   * 벽에 걸린 작품 목록(W8-4 D2). **생략하면 이미지 드롭이 통째로 없다** — 「생략 =
   * 기존 동작」 규약이고, 그래야 이 기능이 `OverlayHost` 계약을 안 건드린다(팀장 판정 (나)).
   */
  readonly arts?: ArtsPort;
}

export function startEditMode(host: OverlayHost, opts: EditOptions): EditSession {
  const doc = host.doc;
  const st = createEditState();
  // `Shift+Z` 가 와이어에서 **돌아갈 자리**를 세션 시작 값으로 맞춘다(W6).
  //
  // `createEditState()` 는 소비자를 모르므로 `'material'` 로 시작한다. 그런데 세션이
  // `?shading=solid` 로 들어왔으면 첫 토글이 와이어→**머티리얼**로 튕겨 «내가 보던
  // 솔리드가 사라진다» 가 된다. 조건은 `safeBack` 하나가 소유한다(`?shading=wire`
  // 로 시작하면 돌아갈 곳이 없어 머티리얼이다).
  st.shadingBack = safeBack(host.shading?.() ?? 'material');

  const picker = createPicker(host, st);
  const gizmo = createGizmo(host);
  /**
   * 작품 포트를 지역으로 잡는다 (W8-11). `opts.arts` 를 클로저 안에서 바로 쓰면 TS 가
   * **좁힘을 못 유지한다**(선택 프로퍼티라 매 호출 시점에 다시 `undefined` 일 수 있다).
   * 한 번 잡아 두면 아래 두 핸들러가 같은 객체를 본다 — 인스턴스가 갈릴 자리도 없다.
   */
  const port = opts.arts;

  // `panel` 은 조작 핸들러를 필요로 하고 그 핸들러는 `panel` 을 필요로 한다. 함수 선언은
  // 호이스팅되므로 **이름으로 먼저 묶고 실행 시점에 채워진 값을 본다** — 조립자가 이
  // 되먹임을 흡수하는 것이 요점이고, 그래서 아래 모듈들끼리는 순환이 없다.
  const panel = createPanel(host, st, {
    toggleEditing: () => { setEditing(!st.editing); },
    duplicate: () => { void actions.duplicate(); },
    removeSelected: () => { actions.removeSelected(); },
    thawSelected: () => { actions.thawSelected(); },
    // 아웃라이너 목록 클릭 → **3D 클릭과 같은 함수.** 여기서 갈라지면 «목록으로 고른
    // 것은 기즈모가 안 붙는다» 가 나고, 그 어긋남은 화면에서만 드러난다.
    pickVillage: (v) => { select(st, host, { village: v }); panel.onPicked(); },
    // ── 걸린 작품 (W8-11 · 감독 지시 *"그림과 액자 크기 위치를 조절"*) ────────
    // 목록도 선택도 **포트 하나**에서 온다. 어댑터를 여기서 만드는 이유는 `select()`
    // 주석 한 곳에 있다 — 요약하면 «`edit/state.ts` 가 작품 시스템을 알게 되지 않도록».
    //
    // 위 `pickVillage` 와 **같은 규약**이다: 목록 클릭이 3D 클릭과 같은 `select()` 로
    // 이어진다. 지금은 3D 로 액자를 집는 경로가 없지만(감독 카드 「슬라이더 먼저」),
    // 생길 때 이 줄이 그대로 그 자리가 된다.
    artList: port && (() => port.list()),
    pickArt: port && ((i: number) => {
      // ⚠ **세 번째 인자를 반드시 넘긴다** — 어댑터는 화면을 모르므로, 고른 작품이
      // 목록에서 사라진 것을 여기서 상태로 옮겨야 `refresh` 가 말할 수 있다.
      // 마을은 이 배선이 `edit/state.ts` 에 있는데(`villageTarget` 의 `onDetach`),
      // 작품은 어댑터를 **밖에서** 만들기 때문에 그 자리가 여기다.
      //
      // 🔴 직전 판본이 이 인자를 안 넘겼고 어댑터 검사는 초록이었다 — 검사가 콜백을
      // 직접 넘기며 부르기 때문이다(검수관 3차 블로커 B-A). 지금은 `onLost` 가
      // **선택 인자가 아니라서** 안 넘기면 `tsc` 가 막는다. 근거는 `target.ts` 한 곳.
      //
      // `select()` 가 `st.artLost = false` 로 먼저 리셋하므로 순서는 안전하다 —
      // 이 콜백은 `apply`/`commit`/`remove` 안에서만, 그것도 한 번만 불린다.
      select(st, host, {
        art: { index: i, target: artTarget(port, i, () => { st.artLost = true; }) },
      });
      panel.onPicked();
    }),
    // 시점 버튼과 시점 키는 **같은 함수**다 — `input` 이 소유하고 패널은 부르기만 한다.
    setView: (side) => { input.setView(side); },
    // 셰이딩도 마찬가지 — 버튼과 `Shift+Z` 가 한 구현을 본다(W6).
    setShading: (m) => { input.setShading(m); },
    // ── 표면 재질(W7 · 「월드스튜디오」) ───────────────────────────────────
    // **위임만** 한다 — 목록의 소유는 조립부(`FeatureEnv.surfaces`)이고 집행은
    // `features/surface-paint.ts` 다. 이 모듈은 화면이 그 문에 닿는 통로일 뿐이라,
    // 편집을 빼도 오버레이 JSON 의 표면 설정은 그대로 산다.
    //
    // 셋 다 host 가 안 주면 `undefined` 이고, 그러면 패널이 그 칸을 통째로 안 만든다.
    surfaces: host.surfaces,
    setSurfaces: host.setSurfaces,
    registerPreview: host.registerPreview,
    listTextures: host.listTextures,
    // ── 사진 걸기 → **조준 화면**(W8-6) ──────────────────────────────────
    // W8-5 에서는 여기서 바로 걸었고(`art.pickFile`) 화면 한가운데가 패널에 가려
    // **두 번에 한 번만** 걸렸다. 이제 조준 화면이 뜨고, 벽에 맞았는지를 **보면서**
    // 확정한다. 걸기 자체는 여전히 `artwork-mode` 의 같은 몸통(`commit`)을 탄다.
    hangPhoto: opts.arts && ((file: File) => { aim?.start(file); }),
    exportNow: () => { actions.exportNow(); },
  }, () => {
    // 선택 표시는 **둘이 짝이다** — 바닥 링(어느 것인가)과 기즈모(어떻게 움직이나).
    // 둘 다 마을 파츠에 붙는다(W4 ②-d). 기즈모가 무엇을 미는지는 `st.target` 이 알고,
    // 링은 «어느 자리인가» 라서 원본 선택을 본다 — 그래서 인자가 서로 다르다.
    picker.syncMarker();
    gizmo.attach(st.target);
  });

  // 작품 모드를 **밖으로 뺐다**(W8-5). 예전에는 `createInput` 인자 안에서 인라인으로
  // 만들었는데, 이제 소비자가 둘이다 — 드롭은 `input` 이, 「사진 걸기」 버튼은 `panel` 이
  // 부른다. 두 곳이 각자 만들면 **인스턴스가 둘**이 되고, 그러면 같은 코드인데도
  // 상태(`measure` 주입 등)가 갈릴 자리가 생긴다.
  const art = opts.arts
    ? createArtworkMode({ panel, picker, arts: opts.arts, onBlobUrl: opts.onBlobUrl })
    : null;

  // 조준 화면(W8-6). 작품 문이 없으면 이것도 없다 — 걸 것이 없는데 조준할 이유가 없다.
  const aim = art ? createAimMode({ host, panel, picker, art }) : null;

  // 작품 포트를 함께 넘긴다 — 내보내기가 「보낼 준비가 됐다」에 이미지도 세야 한다(D3).
  const actions = createActions(host, st, panel, opts.arts);

  const input = createInput({
    host, st, panel, picker, actions, gizmo,
    toggleEditing: () => { setEditing(!st.editing); },
    onBlobUrl: opts.onBlobUrl,
    // 작품 목록을 안 받았으면 이미지 드롭 자체가 없다 — 그때는 GLB 판정이 이름으로 거절한다.
    art: art ?? undefined,
    canUploadGlb: opts.canUploadGlb ?? canUploadGlb(),
    tierLabel: tierLabel(),
  });

  // ── 비행 (2026-08-19, 감독 지시 *"하늘을 날아서 보고 편집하게"*) ──────────
  //
  // `input` 과 **나란히 두되 따로 묶는다.** 키 성격이 달라서다(누르는 동안 매 프레임 vs
  // 한 번 누르면 한 번) — 근거는 `edit/fly-input.ts` 헤더 한 곳이다.
  //
  // `host.fly` 가 없는 소비자(빌더 미리보기·테스트 하네스)에서는 이 모듈이 리스너만 달고
  // 아무 일도 안 한다 — 궤도가 `host.orbit?.()` 로 세운 규약과 같다.
  const fly = createFlyInput({
    doc,
    fly: host.fly ? (input2, dt) => { host.fly!(input2, dt); } : undefined,
    // ⚠ **편집 중인지를 여기서 묻는다.** `bind`/`unbind` 로도 갈리지만, 루프가 한 프레임
    // 늦게 멈추는 창이 있어 그 사이 주행에서 날아갈 수 있다. 두 겹으로 막는다.
    // 🔴 **모달 중에는 안 난다**(검수관 반려 B1-②). `stopPropagation` 은 같은 `doc` 노드의
    // `fly-input` 리스너를 못 막으므로, 크기·회전 모달이 열린 채로 WASD 가 그대로 날았다.
    // 모달은 「이 하나를 조작하는 중」이라 시점이 움직이면 대상이 화면에서 달아난다.
    editing: () => st.editing && st.modal === null,
  });

  // ── 모드 전환 ───────────────────────────────────────────────────────────
  function setEditing(on: boolean): void {
    if (on === st.editing) return;
    st.editing = on;
    panel.setMode(on);
    if (on) {
      input.bind();
      fly.bind();
      // 편집에 들어오면 주행 모드의 포인터락을 푼다. 안 그러면 커서가 없어 못 집는다.
      try { doc.exitPointerLock?.(); } catch { /* 애초에 안 걸려 있었다 */ }
      // ⚠ **이 한 줄이 2026-08-12 사고의 절반이다.** 시점 조작이 우드래그로 바뀌는데 그
      // 안내가 패널 맨 아래 작은 글씨에만 있었다. 감독은 마우스를 움직여도 화면이 안 도니
      // *"아무것도 안 먹는다"* 로 읽었다. 모드가 바뀌는 순간 크게 말한다.
      // 🔴 **이 문구가 한 번 거짓이 됐다**(검수관 조건 C1, 2026-08-19). 예전에는
      // *"이동은 WASD 그대로"* 였는데, 비행이 **WASD 를 가져가면서** 속도(3배)·충돌(없음)·
      // 수직축(시선을 탄다)·복원(편집을 끄면 출발점으로)이 전부 달라졌다. 그런데도 문구는
      // 그대로였고, `Space`·`Ctrl`·`Shift` 는 **화면 어디에도 없었다.**
      //
      // ⚠⚠ **바로 위 네 줄이 2026-08-12 사고를 적고 있다** — 조작이 바뀌었는데 안내가
      // 안 따라간 그 사고다. **그것을 기록한 자리에서 같은 형태를 반복했고**, 이번에는
      // 안내가 «없는» 것이 아니라 «틀린 것을 말하는» 쪽이라 더 나빴다.
      // **코드가 조작을 바꿀 때 문구는 저절로 따라오지 않는다.**
      panel.sayLead('편집 모드 — WASD 로 날아서 이동 (Space 위 · C 아래).'
        + ' 시점은 마우스 오른쪽 버튼 드래그. 편집을 끄면 출발 자리로 돌아갑니다.');
    } else {
      input.unbind();
      fly.unbind();
      // ⚠ **궤도를 먼저 걷는다** (W5 E3, 팀장 조건 2·3). 편집 중에는 눈높이가 떠 있고
      // 충돌을 무시했으므로 벽 안에 서 있을 수 있다 — 주행으로 돌아가기 전에
      // `PlayerSystem` 이 둘 다 원복한다. 이 한 줄이 빠지면 감독이 편집을 끈 뒤
      // **공중에 뜬 채 건물 안에 갇힌다.**
      host.endOrbit?.();
      gizmo.attach(null);
      select(st, host, null);
      // 조준 중에 편집을 끄면 조준 화면이 화면에 남는다 — 주행하는데 「여기 걸기」가
      // 떠 있는 형태다. pending 을 푸는 것과 같은 이유이고 같은 자리다.
      aim?.cancel();
      st.pendingSrc = null;
      // 파츠 고르기도 함께 푼다(W6 E) — 하나만 풀면 주행에서 돌아왔을 때 «지면을
      // 클릭했더니 나무가 생긴다» 가 된다.
      st.pendingPart = null;
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
    // 조준 진단 — **캐시된 값**이다(`types.ts` 의 규약). 게이트가 `casts` 를 본다.
    aim: () => aim?.stats() ?? null,
    dispose() {
      // 로드 중에 떠나면 `busy` 가 `true` 로 남는다. 지금은 리스너를 다 떼므로 재진입
      // 경로가 없어 실해는 없지만, 세션을 되살리는 경로가 생기면 그때 조용히 잠긴다.
      st.busy = false;
      // 편집을 켜 둔 채 세션이 끝나는 경로다(`?edit=1` 을 떼고 새로고침 등). `setEditing`
      // 을 안 거치므로 여기서도 걷어야 «떠 있는 채 갇힘» 이 안 남는다.
      if (st.editing) host.endOrbit?.();
      input.unbind();
      fly.unbind();
      input.unbindAlways();
      aim?.dispose();
      panel.dispose();
      picker.dispose();
      gizmo.dispose();
    },
  };
}
