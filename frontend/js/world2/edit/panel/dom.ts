// world2/edit/panel/dom.ts — 패널을 짓고, **화면에 말한다**.
//
// ── 이 파일이 소유하는 것 ───────────────────────────────────────────────────
// `say()`(한 줄 상태)와 `refresh()`(선택·개수·경고 갱신). 편집의 거의 모든 동작이 끝에
// 이 둘을 부르므로, 여기가 «화면이 지금 무엇을 말하고 있는가» 의 단일 지점이다.
//
// ── 왜 조작 버튼(회전·크기·높이)까지 여기인가 ──────────────────────────────
// 그 버튼들이 하는 일은 «선택된 항목의 수를 한 칸 옮기고 반영» 뿐이고, **선택이 없을 때
// 무엇을 말하는가**가 그 동작의 절반이다(아래 `nudge`). 동작과 안내를 갈라 두면 한쪽만
// 고쳐져 «버튼은 말하는데 키는 침묵» 같은 어긋남이 난다 — 이 저장소가 실제로 겪은 형태다
// (`input.ts` 의 키 핸들러 주석).
//
// ⚠ `innerHTML` 을 쓰지 않는다 — 이 저장소의 UI 규약이다(`knob-bar.ts` 의 XSS 근거).

import type { OverlayHost, VillagePick } from '../types.js';
import { RY_STEP, S_STEP, Y_STEP, type EditState } from '../state.js';
import { describe as describeTarget, nudgeScale, type EditTarget } from '../target.js';
import { CSS } from './css.js';
import { createInspector } from './inspector.js';
import { createOutliner } from './outliner.js';
import { createSurfacePanel, type SurfacePanel } from './surface.js';
import { createBadge } from './badge.js';
import { createTabs } from './tabs.js';
import { TAB_ON_PICK } from '../../decide/edit-tabs.js';
import type { ViewSide } from '../../decide/orbit.js';
import { SHADING_LABEL, SHADING_MODES, type ShadingMode } from '../../decide/shading.js';
import type { SurfaceSetting } from '../../decide/surface-material.js';
import type { ArtworkItem } from '../../decide/artwork.js';

/** 패널이 «자기가 못 하는 일» 을 넘기는 곳. 조립자(`mode.ts`)가 채운다. */
export interface PanelHandlers {
  toggleEditing(): void;
  duplicate(): void;
  removeSelected(): void;
  /** 고른 마을 파츠가 속한 파셀을 계산 배치로 되돌린다 */
  thawSelected(): void;
  /**
   * 아웃라이너 목록에서 골랐다. **3D 클릭과 같은 `select()` 로 이어져야 한다** —
   * 갈라지면 «목록으로 고른 것은 기즈모가 안 붙는다» 가 난다.
   */
  pickVillage(v: VillagePick): void;
  /** 정해진 시점으로 간다(W6). **키와 같은 함수로 이어져야 한다** */
  setView(side: ViewSide | 'focus'): void;
  /** 셰이딩을 그 모드로(W6). 위와 같은 이유로 키와 한 함수다 */
  setShading(m: ShadingMode): void;

  /**
   * 표면 재질 목록(W7 · 「월드스튜디오」). **`setShading` 과 같은 이유로 선택 사양이다** —
   * 소비자가 문을 안 주면 그 칸만 빠지고 나머지 편집은 그대로 산다.
   *
   * ⚠ **셋이 짝이다.** `surfaces` 만 있고 `setSurfaces` 가 없으면 읽기 전용 슬라이더가
   * 되어 «움직이는데 아무 일도 안 난다» 는 거짓 UI 가 되므로, 조립이 **둘 다 있을 때만**
   * 패널을 만든다. `previewUrl` 은 없어도 된다(미리보기 없이 `src` 만 저장된다).
   */
  surfaces?(): readonly SurfaceSetting[];
  setSurfaces?(s: readonly SurfaceSetting[]): void;
  registerPreview?(src: string, file: File): void;
  listTextures?(): Promise<readonly string[]>;

  /**
   * 고른 사진을 **화면 한가운데** 벽에 건다 (W8-5 · 폰 경로). **선택 사양** — 위
   * 표면 재질 넷이 세운 「문을 안 주면 그 칸을 통째로 안 만든다」 규약 그대로다.
   *
   * ⚠ **왜 패널에 있고 캔버스에 없나.** 폰에서는 이것이 유일한 투입구다 — 드래그드롭이
   * 없고, 캔버스를 탭하는 길은 주행용 터치 조이스틱(`ui/touch-controls.ts`)과 겹친다
   * (편집이 그것을 떼지 않는다 — 백로그). 패널 버튼은 그 충돌 밖에 있다.
   */
  hangPhoto?(file: File): void;

  /**
   * 걸린 작품 목록과 그 선택 (W8-11). **선택 사양이고 둘이 짝이다** — 근거는
   * `panel/outliner.ts` 의 같은 이름 인자 한 곳이다(여기에 다시 적지 않는다).
   */
  artList?(): readonly ArtworkItem[];
  pickArt?(index: number): void;

  exportNow(): void;
}

export interface Panel {
  readonly root: HTMLElement;
  /** 팔레트 버튼이 들어갈 자리 */
  readonly palette: HTMLElement;
  say(msg: string, warn?: boolean): void;
  refresh(): void;
  /** 모드가 바뀌었을 때 겉모습(펼침·토글 라벨·강조)을 맞춘다 */
  setMode(editing: boolean): void;
  /**
   * 조준 중에는 패널을 **접는다** (W8-6). 편집 모드는 그대로다.
   *
   * ⚠ **`setMode(false)` 로 접으면 안 된다.** 그것은 `dataset.open` 과 `dataset.mode` 를
   * **함께** 바꾸므로 배지와 아웃라이너까지 사라지고, 토글 라벨이 「✏️ 편집」으로 돌아가
   * 화면이 «주행 모드로 나갔다» 고 거짓말한다. 그래서 세 번째 축(`data-aim`)을 쓴다 —
   * 접는 판정은 CSS 한 곳이 갖는다(`css.ts` 의 규약).
   */
  setAiming(on: boolean): void;
  /**
   * **무언가를 골랐다** — 그 탭으로 옮기고 화면을 갱신한다(감독 지시 2026-08-19 개편).
   *
   * ⚠ `refresh()` 안에서 할 수 없다. 그 함수는 거의 모든 동작 끝에 불리므로 「골랐다」와
   * 「값을 하나 밀었다」가 구별되지 않고, 그러면 **수치칸을 칠 때마다 탭이 튄다.**
   * 어느 탭으로 가는지와 그 근거는 `decide/edit-tabs.ts` 의 `TAB_ON_PICK` 한 곳이다.
   */
  onPicked(): void;
  /** 모드 전환 안내는 평범한 note 보다 크게 말한다 */
  sayLead(msg: string): void;
  el(tag: string, cls?: string, text?: string): HTMLElement;
  button(label: string, onClick: () => void): HTMLButtonElement;
  dispose(): void;
}

export function createPanel(
  host: OverlayHost,
  st: EditState,
  handlers: PanelHandlers,
  /** `refresh()` 끝에 불린다 — 선택 링 갱신처럼 DOM 밖의 후속을 조립자가 건다 */
  onRefresh: () => void,
): Panel {
  const doc = host.doc;

  const style = doc.createElement('style');
  style.textContent = CSS;
  doc.head.appendChild(style);

  const panel = doc.createElement('div');
  panel.id = 'w2-edit';

  const el = (tag: string, cls?: string, text?: string): HTMLElement => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const button = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  };

  const title = el('h4', undefined, '배치 편집');
  const palette = el('div', 'row pal');
  const selLine = el('div', 'sel', '선택: 없음');
  const rowRot = el('div', 'row');
  const rowScale = el('div', 'row');
  const rowY = el('div', 'row');
  const rowOps = el('div', 'row');
  const rowOut = el('div', 'row');
  const rowView = el('div', 'row');
  const rowShade = el('div', 'row');
  const inspector = createInspector(host, st, () => { refresh(); });
  // 아웃라이너는 **패널 밖**에 산다(왼쪽 별도 컨테이너). 넓은 화면에서만 보이는 것은
  // CSS 가 정하고 여기서는 폭을 모른다 — `css.ts` 의 미디어 쿼리 한 곳이 판정한다.
  // 카테고리 탭 (감독 지시 2026-08-19 *"막 나열하니 정신없잖아"*). 무엇을 어느 탭에
  // 넣는지는 `decide/edit-tabs.ts` 한 곳이 소유한다 — 아래 조립은 그 표를 따를 뿐이다.
  const tabs = createTabs(host);
  const outliner = createOutliner(host, st, (v) => { handlers.pickVillage(v); },
    // 문 **둘 다** 있을 때만 넘긴다 — 한쪽만 있으면 눌러도 아무 일이 안 나는 목록이
    // 되고, 그것이 「조용한 no-op」이다(`PanelHandlers` 의 표면 재질 넷과 같은 규약).
    handlers.artList && handlers.pickArt
      ? { list: handlers.artList, pick: handlers.pickArt }
      : undefined);
  /**
   * 표면 재질(W7 · 「월드스튜디오」). **선택과 무관한 전역 패널**이라 인스펙터와 자리가
   * 다르다 — 재질은 종류당 하나를 온 세계가 공유하므로 «무엇을 골랐는가» 와 상관없이 먹는다.
   * 그래서 아래 조립에서도 셰이딩(역시 화면 전체 상태) 옆에 둔다.
   */
  const surface: SurfacePanel | null = handlers.surfaces && handlers.setSurfaces
    ? createSurfacePanel(host, {
      surfaces: handlers.surfaces,
      setSurfaces: handlers.setSurfaces,
      say: (m, warn) => { say(m, warn); },
      registerPreview: handlers.registerPreview,
      listTextures: handlers.listTextures,
    })
    : null;
  // 배지도 패널 **밖**에 산다(화면 상단 중앙). 근거는 `badge.ts` 헤더 한 곳이다 —
  // 「뭘 골랐는지」를 크게 말하는 것이 이 회차 감독 요구다.
  const badge = createBadge(host, st);
  const status = el('div', 'note', 'GLB 를 이 화면에 끌어다 놓거나, 위에서 골라 지면을 클릭.');
  const hint = el('div', 'note', '');
  /**
   * 🔴 **키 안내 — 상황 메시지에 밀려나지 않는다** (태스크 #66, 2026-08-20).
   *
   * 그전에는 `hint` **하나**에 상황과 키를 함께 담고 분기로 갈랐다. 그래서 마을 파츠를
   * 고르거나 경고가 뜨면 **키 목록이 통째로 사라졌다** — 감독이 조작을 잊었을 때
   * 돌아올 자리가 없어지는 형태이고, 하필 **무언가를 고른 직후**(= 조작이 필요한
   * 바로 그 순간)에 사라졌다.
   */
  const keys = el('div', 'note', '');
  /** 접힘/펼침 + 편집/주행을 함께 쥔 버튼. 접혔을 때 화면에 남는 유일한 것이다 */
  const toggle = button('✏️ 편집', () => { handlers.toggleEditing(); });
  toggle.className = 'toggle';

  const nudge = (fn: (t: EditTarget) => void) => () => {
    if (!st.target) { say('먼저 물건을 클릭해 고르세요.'); return; }
    fn(st.target);
    st.target.apply();
    // 버튼 한 번은 «조작이 끝났다» 이다 — 드래그와 달리 이어질 프레임이 없다.
    st.target.commit();
    refresh();
  };

  rowRot.append(
    button('↺ 회전', nudge((e) => { e.ry -= RY_STEP; })),
    button('회전 ↻', nudge((e) => { e.ry += RY_STEP; })),
  );
  rowScale.append(
    button('− 크기', nudge((t) => { nudgeScale(t, 1 / S_STEP); })),
    button('크기 +', nudge((t) => { nudgeScale(t, S_STEP); })),
  );
  // 「바닥에」는 **벽에 걸린 액자에서 숨는다**(검수관 권고 P2). 액자의 `ground()` 는 지금
  // 높이를 그대로 내므로 눌러도 아무 일이 없고, 팀장 규약이 그 형태를 금한다 —
  // *"조용히 no-op 만 남기면 «가끔 안 움직인다» 가 된다"*. 근거는 `target.ts` 한 곳이다.
  const groundBtn = button('바닥에', nudge((t) => { t.y = t.ground(); }));
  rowY.append(
    button('− 높이', nudge((e) => { e.y -= Y_STEP; })),
    button('높이 +', nudge((e) => { e.y += Y_STEP; })),
    groundBtn,
  );
  const snapBtn = button('격자 0.5m', () => { st.snapOn = !st.snapOn; refresh(); });
  // 「구역 되돌리기」는 **마을을 골랐을 때만** 뜬다. 늘 보이면 «무엇이 되돌아가는가» 가
  // 모호하고(오버레이 배치는 파셀 개념이 없다), 안 보이면 되돌릴 방법이 없는 줄 안다.
  const thawBtn = button('구역 되돌리기', () => { handlers.thawSelected(); });
  // 「복제」는 **오버레이(GLB)를 골랐을 때만** 뜬다 — `actions.duplicate` 가 `st.selected`
  // 하나만 보므로(`actions.ts:150`) 다른 종류를 고른 채 누르면 *"먼저 물건을 클릭해
  // 고르세요"* 가 뜬다. **방금 골랐는데** 그렇게 말하는 것이 위 「바닥에」와 같은 형태의
  // 거짓 안내다.
  // ⚠ **처음에는 액자만 숨겼고(검수관 권고 P3) 마을이 그대로 남아 있었다** — 마을을 고르면
  // `select()` 가 `st.selected` 를 `null` 로 만들므로(`state.ts:333`) 같은 거짓말이 났다.
  // 결함을 한 종류에서 고치고 **같은 형태가 남은 다른 종류를 안 본** 자리다(2026-08-20).
  // 마을 복제 자체는 열 수 있고 `copyPart()`(`target.ts:276`)가 그 목적으로 이미 있으나
  // 소비자가 0이다 — 파셀당 상한(`canPlacePart`)을 태워야 해서 별건이다(백로그 `G-EDIT6`).
  const dupBtn = button('복제', () => { handlers.duplicate(); });
  rowOps.append(
    snapBtn,
    dupBtn,
    button('삭제', () => { handlers.removeSelected(); }),
    thawBtn,
  );
  rowOut.append(button('JSON 내보내기', () => { handlers.exportNow(); }));
  // ── 사진 걸기 (W8-5 · 감독 카드 「폰에서 넣기 먼저」 2026-08-17) ────────────
  // 드롭과 **같은 일**을 하는 두 번째 문이다. ⚠ W8-6 부터 이 버튼은 바로 걸지 않고
  // **조준 화면**(`edit/aim-mode.ts`)을 연다 — 폰에서 화면 한가운데가 이 패널에 덮여
  // 조준이 성립하지 않았기 때문이다. 문이 없으면 이 행 자체가 안 생긴다.
  const rowPhoto = el('div', 'row photo');
  if (handlers.hangPhoto) {
    const hang = handlers.hangPhoto;
    const fileIn = doc.createElement('input');
    fileIn.type = 'file';
    // `image/*` 로 열어 둔다 — 폰 사진첩이 바로 뜬다. 받는 형식은 여기서 좁히지 않는다:
    // 계약(`decide/artwork.ts`)이 판정하고 **거절 사유를 화면이 말한다.** 여기서 좁히면
    // 「고를 수는 있는데 왜 안 되는지 모르는」 것과 「아예 안 보이는」 것이 갈려, 감독이
    // HEIC 사진을 **찾지도 못한 채** 원인을 모르게 된다.
    fileIn.accept = 'image/*';
    fileIn.className = 'photo-in';
    // ⚠ **포커스 순서에서 뺀다**(검수관 권고, W8-5). 이 입력은 눈에 안 보이지만
    // `opacity:0` 이라 렌더 트리에는 남아 있고 — 그것이 `.click()` 을 살리려는 의도다
    // (`css.ts` 의 `.photo-in` 참조) — 그대로 두면 **보이지 않는 요소에 포커스가 멈춘다.**
    // 진짜 조작 지점은 바로 옆 버튼이므로 그쪽만 순서에 남긴다.
    fileIn.tabIndex = -1;
    fileIn.setAttribute('aria-hidden', 'true');
    fileIn.addEventListener('change', () => {
      const f = fileIn.files?.[0];
      // ⚠ **값을 반드시 비운다.** 안 비우면 같은 사진을 다시 고를 때 `change` 가 아예
      // 안 나고(값이 그대로라 브라우저가 변경으로 안 본다), 화면은 아무 말도 안 한다 —
      // «두 번째부터 버튼이 죽는다» 로 보인다. 벽을 못 찾아 거절당한 뒤 몸을 돌려 같은
      // 사진을 다시 거는 것이 **가장 흔한 흐름**이라 이 줄이 없으면 기능이 반쯤 죽는다.
      fileIn.value = '';
      if (f) hang(f);
    });
    rowPhoto.append(button('🖼 사진 걸기', () => { fileIn.click(); }), fileIn);
  }
  // ── 정해진 시점 (W6, 감독 지시 2026-08-13) ────────────────────────────────
  // *"보는 시점도 탑. 왼쪽오른쪽. f누르면 확대 등."*
  // 버튼과 키가 **같은 함수**로 간다(`handlers.setView` → `input.setView`) — 각자
  // 구현하면 한쪽만 고쳐져 어긋난다.
  rowView.append(
    button('탑', () => { handlers.setView('top'); }),
    button('정면', () => { handlers.setView('front'); }),
    button('좌', () => { handlers.setView('left'); }),
    button('우', () => { handlers.setView('right'); }),
    button('확대', () => { handlers.setView('focus'); }),
  );
  // ── 셰이딩 뷰 (W6, 감독 지시 2026-08-13) ──────────────────────────────────
  // *"그리고 와이어 프레임 뷰. 솔리드 뷰도 구현해줘."*
  //
  // 라벨은 `SHADING_LABEL` 한 곳에서 온다 — 여기에 «와이어» 라고 직접 적으면 키 안내
  // (`input.ts`)와 값 미러링이 되고, 한쪽만 고쳐도 아무도 모른다.
  //
  // 버튼은 **절대 지정**이고 `Shift+Z` 는 토글이다. 다른 함수인 이유는 `Input.setShading`
  // 주석 한 곳에 있다.
  const shadeBtns = SHADING_MODES.map((m) =>
    button(SHADING_LABEL[m], () => { handlers.setShading(m); }));
  rowShade.append(...shadeBtns);

  const head = el('div', 'head');
  head.append(title, toggle);
  const body = el('div', 'body');
  // ── 공용(상시) — 탭 **밖**이다 ──────────────────────────────────────────
  // 시점과 셰이딩은 «무엇을 골랐든» 늘 필요하다. 탭 안에 넣으면 「표면을 만지다가 위에서
  // 보려면 탭을 옮겨야」 하고, 그것이 블렌더 뷰포트 헤더·유니티 씬뷰 툴바가 피한 형태다.
  // 감독 문언의 *"공용기능"* 이 이것이다(근거는 `decide/edit-tabs.ts` 헤더 한 곳).
  // 셋을 한 상자에 묶는다 — 그래야 스크롤에서 **함께** 고정된다(검수관 권고 P-h).
  // 시점·셰이딩만 위에 두고 탭 바만 sticky 로 하면 「늘 필요하다」던 둘이 먼저 사라진다.
  const toolbar = el('div', 'toolbar');
  toolbar.append(rowView, rowShade, tabs.bar);
  body.append(toolbar);

  // ── 탭 내용 ─────────────────────────────────────────────────────────────
  // 「놓기」 — 아직 없는 것을 만든다.
  tabs.panes.place.append(palette);
  // 문이 없으면 붙이지 않는다 — 빈 행도 `.row` 여백을 먹어 «뭔가 빠진 자리» 처럼 보인다.
  if (handlers.hangPhoto) tabs.panes.place.append(rowPhoto);

  // 「속성」 — 고른 것 하나를 만진다.
  // 크기 슬라이더는 **수치칸 바로 뒤**다(W8-11) — 같은 것을 두 방식으로 미는 짝이라
  // 떨어뜨리면 감독이 둘을 다른 기능으로 읽는다. 대상이 실치수를 안 내면 `sync` 가
  // 이 줄을 숨긴다(빈 자리가 안 남는다).
  // 아무것도 안 골랐을 때 **빈 칸으로 두지 않는다** — 「고장났나」와 「고를 게 없다」는
  // 화면에서 구별되어야 한다(`decide/edit-tabs.ts` 의 `tabHasContent` 주석과 짝이다).
  const propsEmpty = el('div', 'note', '물건을 클릭해 고르면 여기에서 옮기고 크기를 바꿉니다.');
  /** 이 문서에 무엇이 있나 — `배치 N개` 가 갈 자리(검수관 권고 P-d) */
  const propsCount = el('div', 'note');
  tabs.panes.props.append(propsEmpty, propsCount, selLine, inspector.root, inspector.sizeRow,
    inspector.toneRow, rowRot, rowScale, rowY, rowOps);

  // 「표면」 — 세계 전체의 재질. **없을 수도 있다**(소비자가 문을 안 주면 그 칸만 빠진다).
  if (surface) tabs.panes.surface.append(surface.root);
  else tabs.panes.surface.append(el('div', 'note', '이 화면에서는 표면 재질을 쓸 수 없습니다.'));

  // 「파일」 — 이 문서를 다룬다.
  tabs.panes.file.append(rowOut);

  body.append(tabs.panes.place, tabs.panes.props, tabs.panes.surface, tabs.panes.file);
  // 상태 줄은 탭 **밖 맨 아래**다 — 어느 탭에서 한 일이든 결과를 여기 한 곳에서 읽는다.
  body.append(status, hint, keys);
  panel.append(head, body);
  panel.dataset.open = '0';
  panel.dataset.mode = 'drive';
  doc.body.appendChild(panel);

  function say(msg: string, warn = false): void {
    status.textContent = msg;
    status.className = warn ? 'note warn' : 'note';
  }

  function refresh(): void {
    // 탭 라벨의 「지금 볼 게 있나」 표시. 판정은 `decide/edit-tabs.ts` 가 소유한다.
    const has = st.target !== null;
    tabs.sync(has);
    // 안내와 조작칸은 **서로를 대신한다** — 둘이 함께 보이면 «고르라» 는 문장 아래에
    // 조작 가능한 칸이 있어 화면이 두 가지를 말한다.
    // ⚠ **`rowOps`(격자·복제·삭제·구역되돌리기)는 예외로 남는다**(검수관 권고 P-e).
    // 「격자 0.5m」가 선택과 무관한 전역 토글이라 그 줄을 통째로 숨길 수 없다 — 즉 위
    // 문장은 **수치칸·조작 버튼에 대해서만** 참이다. 개별 버튼 숨김은 아래 `groundBtn`·
    // `dupBtn` 두 줄이다(조건이 서로 다르다).
    propsEmpty.hidden = has;
    propsCount.hidden = has;
    if (!has) propsCount.textContent = `이 문서에 배치 ${host.entries().length}개`;
    selLine.hidden = !has;
    inspector.root.hidden = !has;
    rowRot.hidden = !has;
    rowScale.hidden = !has;
    rowY.hidden = !has;
    // 근거는 각 버튼을 만드는 자리에 있다. **둘의 조건이 다르다** — 「바닥에」는 액자만
    // 빼고, 「복제」는 오버레이만 남긴다(마을도 못 한다).
    groundBtn.hidden = st.target?.kind === 'art';
    dupBtn.hidden = st.target?.kind !== 'overlay';
    snapBtn.dataset.on = st.snapOn ? '1' : '0';
    // ── 셰이딩 버튼 ────────────────────────────────────────────────────────
    // **지금 모드를 강조한다.** 없으면 눌러도 화면이 그대로인 모드(재질)에서 «안 먹었나» 가
    // 된다 — 이 저장소가 «조작이 안 먹는 것과 대상이 없는 것은 다른 일» 로 여러 번 적은 축이다.
    //
    // 문이 없는 소비자(빌더 미리보기·테스트 하네스)에서는 **행 자체를 감춘다.** 누를 수
    // 없는 버튼을 보여주는 것은 안내가 아니라 막다른 길이다.
    const curShade = host.shading?.() ?? null;
    rowShade.hidden = curShade === null;
    for (let i = 0; i < shadeBtns.length; i++) {
      shadeBtns[i]!.dataset.on = SHADING_MODES[i] === curShade ? '1' : '0';
    }
    thawBtn.hidden = st.villageSel === null;
    // 팔레트 강조 — **두 칸을 함께 본다**(W6 E). 파츠 버튼은 `src` 가 없으므로 `src` 만
    // 보면 «파츠를 골랐는데 아무것도 강조 안 된다» 가 된다. 대조는 라벨이 아니라
    // `data-asset`/`data-id` 로 한다 — 라벨은 사람이 읽는 것이고 언제든 바뀐다.
    for (const b of palette.querySelectorAll('button')) {
      const on = b.dataset.asset === 'part'
        ? b.dataset.id === st.pendingPart
        : b.dataset.src === st.pendingSrc && st.pendingSrc !== null;
      b.dataset.on = on ? '1' : '0';
    }
    // 문안은 `target.ts` 의 `describe` 한 곳이 만든다 — 두 형태의 표시를 여기서 나누면
    // 새 형태가 생길 때마다 이 분기가 자란다.
    // ⚠ 동결 여부는 **저장소에 직접 묻는다** — `st.villageSel.frozen` 은 고른 순간의
    // 스냅샷이라 조작해서 동결시켜도 안 바뀐다(`target.ts` 의 `describeShort` 주석).
    const v = st.villageSel;
    const frozenNow = v ? (host.village?.isFrozen(v.px, v.pz) ?? v.frozen) : false;
    selLine.textContent = st.target
      ? describeTarget(st.target, st.selected, v) + (frozenNow ? ' · 손본 구역' : '')
      // ⚠ **여기 `배치 N개` 를 적지 않는다**(검수관 권고 P-d). `selLine` 은 선택이 없으면
      // 숨으므로(`:336`) 그 문자열은 **화면에 절대 안 뜬다** — 그런데 검사는
      // `textContent` 로 통과했다(jsdom 은 감춘 요소의 글자도 센다). 배치 개수는 아래
      // 속성 탭 안내가 대신 말한다.
      : '선택: 없음';
    const previews = host.entries().filter((e) => e.preview).length;
    if (st.artLost) {
      // ⚠ **위 `detached` 와 정반대라 문구가 달라야 한다**(W8-11). 저쪽은 «조작과 저장은
      // 그대로 됩니다» 이고 여기는 «지금 조작이 반영되지 않습니다» 다 — 한 문구를 돌려쓰면
      // 액자가 사라졌는데 저장된다고 안내하게 되고, 그러면 감독이 계속 밀다 값을 잃는다.
      //
      // 두 칸이 동시에 참일 수는 없다(선택은 하나이고 `artLost` 는 작품 선택 중에만,
      // `detached` 는 마을 선택 중에만 세워진다) — 그래서 순서는 판정이 아니라 서술이다.
      hint.className = 'note warn';
      hint.textContent = '⚠ 그 작품이 목록에서 사라졌습니다 —'
        + ' 지금 조작은 반영되지 않습니다. 목록에서 다시 골라 주세요.';
    } else if (st.detached) {
      // ⚠ **끊긴 것은 미리보기뿐이다** — 값은 계속 바뀌고 확정도 정상이다(`state.ts`).
      // 그 둘을 갈라 말하지 않으면 감독이 «편집이 죽었다» 로 읽고 조작을 멈춘다.
      hint.className = 'note warn';
      hint.textContent = '⚠ 그 구역이 화면에서 멀어져 미리보기가 끊겼습니다 —'
        + ' 조작과 저장은 그대로 됩니다. 가까이 가서 다시 고르면 다시 보입니다.';
    } else if (previews > 0) {
      hint.className = 'note warn';
      hint.textContent = `⚠ ${previews}개는 저장소에 없는 파일입니다 — JSON 과 함께 그 GLB 도 주셔야 배포에 붙습니다.`;
    } else if (st.villageSel) {
      hint.className = 'note';
      hint.textContent = '마을 파츠 — 옮기면 그 구역이 「손본 구역」이 되어 밀도 슬라이더에서 빠집니다.'
        + ' 「구역 되돌리기」로 계산 배치로 돌아갑니다.';
    } else {
      // 상황 메시지가 없을 때는 그 줄을 **비운다** — 빈 요소는 자리를 안 차지한다.
      hint.className = 'note';
      hint.textContent = '';
      // ⚠ **비행 키는 아래 `keys` 로 옮겼다**(태스크 #66). `sayLead` 는 모드가 바뀔 때
      // **한 번** 말하고 다른 `say()` 가 덮으면 사라진다 — 화면에 계속 남는 줄이 필요하고,
      // 그 줄이 상황 메시지에 밀려나면 애초의 목적(검수관 권고 P1)이 무너진다.
    }
    // 🔴 **키 안내는 분기 밖이다** — 어떤 상황이든 화면에 남는다(태스크 #66).
    // ⚠ 이 줄은 **키 목록의 두 번째 사본이다**(첫 번째는 `input.ts` 의 `EDIT_KEYS`
    // 와 `modalOpener`). 값 미러링이고, 한쪽만 고치면 «화면이 광고하는 키가 안 먹는다»
    // 가 난다 — 실제로 R/F 를 뺄 때 이 줄을 함께 고쳐야 했다. 태스크 #44 가 그것이다.
    // ⚠ 「출발 자리로」의 대상은 비행·궤도가 옮긴 것뿐이다 — 판정은 `edit/input.ts` (P-C).
    keys.className = 'note';
    keys.textContent = 'WASD 날기 · Space 위 · C 아래 (편집 끄면 출발 자리로) · '
      + 'R 회전 · S 크기 (마우스로 밀고 클릭 확정 · Esc 취소 · 숫자 입력)'
      + ' · Esc = 고른 것 취소'
      + ' · 중클릭(또는 Alt+좌)드래그 = 대상 중심으로 돌기 · Shift+드래그 = 위아래 · 휠 = 줌'
      + ' · 시점 1 정면 / 3 우 / 7 탑 / 9 좌 · F 확대 · Shift+Z 와이어 토글'
      + ' · 좌드래그 이동 · 우드래그 시점 · Q/E 회전 · Z/X 높이 · Del·⌫ 삭제';
    inspector.sync(st.target);
    outliner.sync();
    badge.sync();
    onRefresh();
  }

  return {
    root: panel,
    palette,
    say,
    refresh,
    setMode(editing: boolean): void {
      panel.dataset.open = editing ? '1' : '0';
      panel.dataset.mode = editing ? 'edit' : 'drive';
      // 주행 중에는 아웃라이너를 감춘다 — 편집 도구가 걸어다니는 화면을 가리지 않는다.
      outliner.root.dataset.mode = editing ? 'edit' : 'drive';
      badge.setMode(editing);
      toggle.textContent = editing ? '✕ 편집 끝' : '✏️ 편집';
    },
    setAiming(on: boolean): void {
      // dataset 하나만 건드린다 — 무엇을 감출지는 CSS 가 정한다.
      panel.dataset.aim = on ? '1' : '0';
    },
    onPicked(): void {
      // 아무것도 안 골라졌으면 탭을 옮기지 않는다 — 선택을 **푸는** 것도 이 문을 지난다
      // (`select(…, null)`), 그때 빈 속성 탭으로 끌려가면 하던 일을 잃는다.
      if (st.target) tabs.show(TAB_ON_PICK);
      refresh();
    },
    sayLead(msg: string): void {
      status.textContent = msg;
      status.className = 'lead';
    },
    el,
    button,
    dispose(): void {
      badge.dispose();
      outliner.dispose();
      panel.remove();
      style.remove();
    },
  };
}
