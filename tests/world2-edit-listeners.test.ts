// @vitest-environment jsdom
//
// 편집 리스너가 **언제 붙어 있는가** — 행위로 잰다.
//
// ── 왜 소스 텍스트가 아니라 실제 등록을 세는가 ──────────────────────────────
// 이 축들은 원래 `world2-overlay-wiring.test.ts` 에서 **소스 텍스트 위치**로 검사했다
// (`bindEditListeners` 와 `unbindEditListeners` 사이에 `doc.addEventListener` 가 있는가).
// 그 방식이 약하다는 것은 이미 실측돼 있었다 — 검수관이 뮤테이션 4종으로 두들겨
// **넷째가 안 잡히는 것을 확인했다**(2026-08-12): 부팅부에서 `bindEditListeners()` 를
// 무조건 부르면 주행이 그대로 죽는데 **20/20 통과**였다. 텍스트는 *"어디에 적혀 있나"*
// 만 보고 *"실제로 언제 불리나"* 를 못 본다.
//
// 2026-08-13 의 파일 분해가 그 약점을 한 번 더 드러냈다: 코드가 `input.ts` 로 옮겨가자
// 여섯 축이 **일제히 빨간불**이 됐다. 동작은 하나도 안 바뀌었는데 검사가 깨진 것이다.
// 경로만 고쳐 옮기면 이번 구현 형태를 박제할 뿐이라, 행위로 승격했다(태스크 #43).
//
// ── 이 파일이 재는 것 ───────────────────────────────────────────────────────
// `host.doc` 이 주입 가능하다는 점을 쓴다 — 진짜 document 를 Proxy 로 감싸 등록/해제만
// 가로채 **살아 있는 리스너 수**를 센다. 실제 DOM 조작(패널 생성 등)은 그대로 통과한다.
//
// **여기서 못 재는 것**: 리스너가 붙어 있는지와 별개로 «캔버스 클릭이 포인터락에 실제로
// 도달하는가» — 그건 `main.ts` 와 브라우저 이벤트 순서의 일이고 jsdom 이 재현하지 않는다.
// 감독 실기기 확인이 그 축의 유일한 판정이다.
//
// ── 검출력 실측 (2026-08-13, 별도 클론) ─────────────────────────────────────
// 통과는 검출력의 증거가 아니므로 결함을 되살려 쟀다. 대조군 **40 passed**(깨끗).
//
//   M1 부팅부에서 `input.bind()` 를 무조건 호출        → **1 failed**
//   M2 `unbind` 에서 `pointercancel` 만 뺌            → **3 failed**
//   M3 `case 'Backspace'` 제거 (맥에서 삭제 불가)      → **1 failed**
//   M4 패널을 화면 왼쪽으로 (모바일 조이스틱 가림)      → **1 failed**
//   M5 `state` 를 두 벌 만든다 (분해 특유의 결함)       → **2 failed**
//   M6 `dispose` 가 상시 리스너를 안 뗀다              → **1 failed**
//
// **M1 이 이 파일의 존재 이유다.** 검수관이 2026-08-12 에 옛 소스 텍스트 축으로 같은
// 결함을 심고 **20/20 통과**를 실측했다 — 등록 코드의 «위치» 는 정상이고 «언제 불리나»
// 만 틀렸기 때문이다. 행위로 옮기니 잡힌다.
//
// **M5 는 분해가 새로 연 위험이다.** 상태를 객체로 뽑으면 «두 번 만들기» 가 가능해지고,
// 그러면 패널이 보는 `selected` 와 조작이 바꾸는 `selected` 가 갈린다. 화면에서만
// 드러나는 형태라 게이트가 없으면 감독이 발견한다.
//
// ── 모달 조작(W5 E2) 검출력 실측 (2026-08-13, 별도 클론) ────────────────────
// **이 파일 + `tests/world2-modal-edit.test.ts` 를 함께 돌린 대조군 97 passed
// — 실측 시점 `602f628`.** 두 파일에 걸쳐 잡히므로 표를 여기 **한 곳**에만 둔다
// (순수 쪽 헤더가 이리로 가리킨다).
//
// ⚠ **대조군 숫자에는 실측 커밋을 붙인다.** 그냥 «97 passed» 라고만 적으면 축이 늘 때마다
// 낡고, 다음 사람은 그것을 «지금 돌리면 97» 로 읽는다(검수관 비블로커, 2026-08-13 —
// 실제로 이 줄이 그렇게 낡아 있었다). 시점을 붙이면 **그때의 사실**이라 낡지 않는다.
//
//   M-A 취소가 값을 안 되돌린다(`endModal` 의 복원 제거)    → **2 failed**
//   M-B 확정이 `commit` 을 안 부른다                       → **7 failed**
//   M-C 축 고정이 안 먹는다(`modalDelta` 의 축 분기 제거)   → **3 failed**
//   M-D 대상이 없어도 `S` 를 가로챈다 (주행 「뒤로」가 죽는다) → **1 failed**
//   M-E 모달 중 모르는 키까지 가로챈다 (WASD 가 죽는다)     → **1 failed**
//   M-F 크기를 곱셈 대신 덧셈으로                          → **3 failed**
//   M-G Y 축 부호를 안 뒤집는다 (위로 끌면 내려간다)        → **1 failed**
//   M-H 타이핑이 마우스를 못 이긴다                        → **3 failed**
//   M-I 축 키를 두 번 눌러도 해제 안 됨                     → **1 failed**
//   M-J `modalOpener` 가 주행 키(`W`)도 연다               → **1 failed**
//   M-K 선택이 바뀌어도 모달이 안 끝난다                    → **1 failed**
//   M-L 조합키 가드 제거 (⌘R 을 편집이 먹는다)             → **1 failed**
//   M-M hint 를 옛 문구(`R/F 크기`)로 되돌림                → **1 failed**
//   M-N 조작 중 화면이 아무 말도 안 한다                    → **1 failed**
//   M-O 모달 분기를 `EDIT_KEYS` 검사 **뒤로** 옮김          → **1 failed**
//
// **0 failed 는 없었다.** M-B 가 7 로 가장 넓은 것은 확정이 다섯 경로의 공통 종착점이기
// 때문이고, 결함의 파급을 그대로 반영한다.
//
// ⚠ **실측 과정에서 드러난 함정 하나를 적어 둔다**: 자동화 스크립트의 정규식이 M-M 을
// **적용조차 못 한 채** 0 failed 를 냈다. 그것은 «검사가 약하다» 가 아니라 «뮤테이션이
// 안 심겼다» 이고, 둘은 화면에서 똑같이 보인다. 수작업으로 다시 심어 1 failed 를 확인했다.
// **0 failed 를 만나면 검사를 의심하기 전에 뮤테이션이 실제로 들어갔는지부터 본다.**
//
// ── 실시간 반영(W5 E2.5) 검출력 실측 (2026-08-13, 별도 클론) ────────────────
// 이 파일 + `world2-modal-edit` + `world2-instancing-raycast` + `world2-edit-place`
// 를 함께 돌린 대조군 **139 passed** — 실측 시점 `34a4703`.
//
//   P-A `instancing.ts` 의 죽은 핸들 가드 제거              → **1 failed**
//   P-B 조작 중 슬롯을 안 민다(`retargetSlot` 호출 제거)     → **6 failed**
//   P-C 슬롯에 **파셀 로컬** 좌표를 보낸다                   → **0 → 1 failed** ⚠ 아래
//   P-D 죽었다고 알리지 않는다(조용한 no-op)                → **2 failed**
//   P-E 죽은 슬롯에도 민다(`index < 0` 검사 제거)           → **3 failed**
//   P-F 고른 슬롯을 안 들고 간다(`slot: owner` → `null`)    → **7 failed**
//   P-G 소비자가 문을 안 잇는다(`overlay.ts`)               → **1 failed**
//   P-H 조립부가 `retarget` 대신 `setTransform` 을 쓴다      → **1 failed**
//   P-I 새로 골라도 경고가 안 풀린다                        → **1 failed**
//   P-J 목록 경로가 가짜 슬롯을 든다                        → **1 failed**
//   P-K 반납 swap 이 핸들 index 를 안 고친다                → **1 failed**
//
// ⚠⚠ **P-C 가 0 failed 였고, 그것이 이 회차에서 가장 값진 결과다.**
// 원인은 픽스처였다 — 그때 축은 파셀 **(0,0)** 에서 쟀고, 원점 파셀에서는 «파셀 로컬»과
// «월드»가 **같은 수**라 두 좌표계를 구별하는 검사가 **원리적으로 성립하지 않는다.**
// 즉 「검사가 약하다」가 아니라 **축이 비어 있었다.**
//
// 더 뼈아픈 것은 첫 판본이 **그 사실을 알아채고도 틀린 처방을 적었다**는 점이다:
// *"파셀 원점이 (0,0) 이라 이 축만으로는 두 좌표계가 구별되지 않으므로 옮긴 뒤의 값으로
// 본다"* — 옮겨도 오프셋이 0 이면 여전히 같은 수다. **관측은 맞았고 결론이 안 따라왔다.**
// 처방: `OFFSET_FIXTURE`(파셀 (2,-1))를 만들어 다시 재니 **1 failed**(재현 확인).
//
// ── 검수관 반려 해소분 검출력 실측 (2026-08-13, 별도 클론) ──────────────────
// 조건부 승인의 블로커 둘을 해소하며 세운 축이 실제로 잡는지 재확인했다.
// 이 파일 + `world2-parcel-grow` 대조군 **89 passed**(실측 시점 `d237f99` + 해소분).
//
//   Q-1 모달 중 «여는 키를 삼키는» 처방 제거 (B2 재발)   → **2 failed**
//   Q-2 `parcel-assets` 가 `retarget` 대신 `place` 호출  → **2 failed**
//   Q-3 `parcel-grow.retarget` 의 `lastPose` 미갱신       → **1 failed**
//
// Q-2·Q-3 은 팀장 조건 ①(성장 중 드래그 실측)의 축이 실제로 그 두 결함을 잡는다는
// 뜻이다 — 그 축은 `tests/world2-parcel-grow.test.ts` 끝 절에 있다.
//
// ⚠ 실측 위생 하나 더: 마지막 뮤테이션(P-K)이 **되돌려지지 않은 채** 클론에 남아 있었다.
// 앞선 측정은 오염되지 않았지만(P-K 가 마지막이었다), 순서가 달랐으면 그 뒤 전부가
// 오염된다. 그리고 P-K 는 지시(`moved.index` 한 줄만 삭제)와 달리 **줄 전체**가
// 지워져 있었다 — 결과는 유효하나 심은 것이 명세와 다르면 그 숫자의 의미도 달라진다.

import { describe, it, expect, afterEach } from 'vitest';
import { startEditMode } from '../frontend/js/world2/edit/mode.js';
import type { EditSession, OverlayEntry, OverlayHost } from '../frontend/js/world2/edit/types.js';
import { makeThreeStub, type StubHit } from './helpers/three-stub.js';
import type { PlacedPart } from '../frontend/js/world2/parts/types.js';
import {
  SHADING_LABEL, SHADING_MODES, type ShadingMode,
} from '../frontend/js/world2/decide/shading.js';

/** 편집 조작을 가로채는 리스너들. `keydown` 은 모드 키(`Tab`)가 상시라 따로 본다. */
const GRABBY = ['click', 'contextmenu', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'drop'];

function spyDoc(): { doc: Document; live: Map<string, number> } {
  const live = new Map<string, number>();
  const bump = (type: string, d: number) => live.set(type, (live.get(type) ?? 0) + d);
  const real = document;
  const doc = new Proxy(real, {
    get(t, k, r) {
      if (k === 'addEventListener') {
        return (type: string, fn: EventListener, opt?: unknown) => {
          bump(type, +1);
          real.addEventListener(type, fn, opt as never);
        };
      }
      if (k === 'removeEventListener') {
        return (type: string, fn: EventListener, opt?: unknown) => {
          bump(type, -1);
          real.removeEventListener(type, fn, opt as never);
        };
      }
      const v = Reflect.get(t, k, r);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
    },
  }) as Document;
  return { doc, live };
}

/** `GRABBY` 중 지금 살아 있는 리스너 총합 */
function grabbyCount(live: Map<string, number>): number {
  let n = 0;
  for (const type of GRABBY) n += live.get(type) ?? 0;
  return n;
}

/** `retargetSlot` 한 번의 인자 전부 — 슬롯과 자세를 평평하게 편다 */
type RetargetCall = {
  key: string; index: number;
  x: number; y: number; z: number; ry: number; sx: number; sy: number; sz: number;
};

type Harness = {
  session: EditSession;
  live: Map<string, number>;
  doc: Document;
  canvas: HTMLCanvasElement;
  entries: OverlayEntry[];
  removed: OverlayEntry[];
  /** 광선에 걸릴 것. 비우면 «빈 곳을 클릭» 이 된다 */
  hits: StubHit[];
  /**
   * **마을 인스턴스** 광선에 걸릴 것. 위 `hits` 와 갈라 둔 이유: 편집은 광선을 두 곳에
   * 쏘고(오버레이 루트의 자식들 · 슬롯 풀의 인스턴스 메시들) 한 배열을 공유하면
   * «마을을 집었다» 를 재려는 케이스가 오버레이 쪽에서 먼저 걸린다.
   */
  villageHits: StubHit[];
  /** 마을 인스턴스 메시(가짜). `getMatrixAt` 이 내는 위치를 테스트가 정한다 */
  villageMesh: { at: { x: number; y: number; z: number } };
  /** `refreshBounds` · `intersectObjects` 의 **호출 순서**가 여기 쌓인다 */
  order: string[];
  /** 선택 링. 「어느 것을 골랐나」를 화면이 실제로 말하는지 재는 유일한 축이다 */
  marker: () => { visible?: boolean; position?: { x: number; z: number } } | undefined;
  /** 편집이 건 동결. 키는 `px,pz` */
  frozen: Map<string, PlacedPart[]>;
  /**
   * 조작 중 슬롯에 밀린 자세들(순서대로). **여기가 «손을 따라오는가» 의 유일한 축이다** —
   * jsdom 에는 화면이 없으므로 «무엇이 슬롯으로 나갔는가» 로만 잴 수 있다.
   */
  retargeted: RetargetCall[];
  /** `orbitTo` 로 나간 시점 요청. 「키·버튼이 실제로 문에 닿았는가」를 잰다 */
  views: { cx: number; cy: number; cz: number; lift: number; radius: number; yaw: number | null }[];
  /** `setShading` 으로 나간 요청(순서대로). 같은 이유로 «문에 닿았는가» 를 잰다 */
  shadings: ShadingMode[];
  /** 지금 월드가 들고 있는 셰이딩. 토글 왕복을 재려면 마지막 요청이 아니라 이것을 본다 */
  shadingNow: () => ShadingMode;
  /** 패널의 셰이딩 버튼 셋. 라벨로 찾는다 — 그것이 화면에 보이는 이름이다 */
  shadeButtons: () => HTMLButtonElement[];
  /**
   * 기즈모 핸들 메시 하나. **드래그 경로를 재려면 이것이 필요하다** — 핸들을 `hits` 에
   * 넣어야 `gizmo.hitTest` 가 잡고 `dragging` 이 켜진다. P1 뮤테이션(손 뗄 때 확정 안 함)이
   * 0 failed 로 그 구멍을 드러냈다(2026-08-13).
   */
  gizmoHandle: () => unknown;
  /** 수치칸(X·Y·Z·°·×) */
  fields: () => HTMLInputElement[];
  /**
   * 씬 루트. **테스트가 이것을 알아야 항목을 «고를» 수 있다** — `pick.ts` 의 `entryOf`
   * 는 맞은 오브젝트에서 부모를 거슬러 «부모가 root 인 것» 을 찾아 항목으로 환원한다.
   * 여기를 비워 두면 클릭이 언제나 «빈 곳» 이 되고 이 파일의 선택 축이 통째로 빈
   * 검사가 된다(첫 판본이 그랬다 — 3개가 빨간불이 되어 드러났다).
   */
  root: unknown;
};

let current: EditSession | null = null;
afterEach(() => { current?.dispose(); current = null; document.body.innerHTML = ''; });

interface VillageFixture {
  /** 파셀 → 배치. 없는 파셀이면 빈 배열 */
  parts?: Record<string, PlacedPart[]>;
  frozen?: (px: number, pz: number) => boolean;
  /** 맞힌 인스턴스의 주인. `null` 이면 «빈 슬롯» */
  owner?: { key: string; index: number } | null;
  /**
   * `retargetSlot` 문을 열 것인가. 기본은 **연다**(라이브와 같다).
   *
   * `false` 로 닫으면 문이 없는 소비자가 된다 — 조작이 확정 시점에만 보이는 W4 동작
   * 그대로다. 그 경로가 여전히 도는지 재는 축이 있다.
   */
  retarget?: boolean;
  /**
   * 셰이딩 문(`shading`·`setShading`)을 열 것인가. 기본은 **연다**(라이브와 같다).
   *
   * `false` 로 닫으면 문이 없는 소비자가 된다(빌더 미리보기 등) — 그때 편집은 버튼과
   * 키를 **조용히 무시**해야 하고, 그 경로를 재는 축이 있다. 문이 없는데 뭔가 하려 들면
   * 그것이 곧 «없는 문에 대고 예외를 던지는» 경로다.
   */
  shadingDoor?: boolean;
  /** 세션 시작 셰이딩. `?shading=` 로 들어온 세션을 흉내낸다 */
  shadingStart?: ShadingMode;
}

function makeHarness(vf?: VillageFixture): Harness {
  const { doc, live } = spyDoc();
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  // jsdom 의 `getBoundingClientRect` 는 전부 0 이라 NDC 변환이 `null` 로 떨어진다 —
  // 그러면 클릭이 통째로 무시돼 이 파일이 아무것도 안 재게 된다(빈 검사).
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    toJSON() { return {}; },
  }) as DOMRect;

  const hits: StubHit[] = [];
  const villageHits: StubHit[] = [];
  const order: string[] = [];
  // 가짜 인스턴스 메시. `at` 이 곧 `getMatrixAt` 이 낼 이동 성분이다.
  const villageMesh = {
    at: { x: 0, y: 0, z: 0 },
    getMatrixAt(_i: number, m: { elements: number[] }): void {
      m.elements[12] = this.at.x; m.elements[13] = this.at.y; m.elements[14] = this.at.z;
    },
  };
  const entries: OverlayEntry[] = [];
  const removed: OverlayEntry[] = [];
  /** 편집이 건 동결. 테스트가 «무엇이 저장됐나» 를 직접 본다 */
  const frozenStore = new Map<string, PlacedPart[]>();
  /** `retargetSlot` 이 받은 것 전부(순서대로). 조작 중 실시간 반영을 재는 축 */
  const retargeted: RetargetCall[] = [];
  const views: Harness['views'] = [];
  // 셰이딩 문(W6). **월드 상태를 흉내낸다** — `setShading` 이 값을 실제로 바꿔야 다음
  // `shading()` 이 그것을 읽고, 그래야 `Shift+Z` 토글의 왕복을 잴 수 있다. 기록만 하고
  // 값을 안 바꾸면 토글이 언제나 같은 자리에서 출발해 왕복 축이 통째로 빈 검사가 된다.
  let shadingNow: ShadingMode = vf?.shadingStart ?? 'material';
  const shadings: ShadingMode[] = [];
  // ⚠ `add`/`remove` 가 **실제로 담는다.** 빈 함수였을 때 선택 링(`pick.ts` 의 marker)이
  // 어디에도 안 남아서 «링이 떴는가» 를 재는 축이 통째로 불가능했다 — N11 뮤테이션이
  // 0 failed 로 그 구멍을 드러냈다(2026-08-13).
  const root = {
    children: [] as unknown[],
    add(o: unknown) { this.children.push(o); },
    remove(o: unknown) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); },
  };

  const THREE = makeThreeStub({
    hits: (objs) => {
      const village = objs.includes(villageMesh);
      order.push(village ? 'cast:village' : 'cast:overlay');
      return village ? villageHits : hits;
    },
  });

  const host: OverlayHost = {
    THREE,
    camera: {} as never,
    canvas,
    doc,
    cellX: 40,
    cellZ: 40,
    root: root as never,
    entries: () => entries,
    place: async () => null,
    lastFailure: () => null,
    remove(e) { removed.push(e); const i = entries.indexOf(e); if (i >= 0) entries.splice(i, 1); },
    apply() { },
    toRaw: () => ({ version: 2, items: [], parcels: [] }),
    look() { },
    // 마을 문은 **옵션이다.** 안 열면 `pickVillage` 가 즉시 `null` 을 내고 오버레이만
    // 집던 예전 경로가 그대로 돈다 — 이 파일의 기존 축들은 그 상태를 전제로 한다.
    instances: vf
      ? {
        raycastTargets: () => [villageMesh],
        refreshBounds: () => { order.push('refreshBounds'); },
        ownerAt: () => (vf.owner === undefined ? { key: 'building', index: 3 } : vf.owner),
      }
      : null,
    // 조작 중 실시간 반영(W5 E2.5). **마지막으로 밀린 자세를 그대로 담는다** — 화면이
    // 없는 하네스에서 «따라왔는가» 를 재는 유일한 축이다.
    retargetSlot: vf && vf.retarget !== false
      ? (slot, t) => { retargeted.push({ key: slot.key, index: slot.index, ...t }); }
      : undefined,
    village: vf
      ? {
        partsAt: (px, pz) => (frozenStore.get(`${px},${pz}`) ?? vf.parts?.[`${px},${pz}`] ?? [])
          .map((p) => ({ ...p })),
        isFrozen: (px, pz) => frozenStore.has(`${px},${pz}`) || (vf.frozen?.(px, pz) ?? false),
        // 실제 저장소(`systems/village-parcels.ts`)의 **관찰 가능한 성질만** 흉내낸다:
        // 넣으면 그 뒤 `partsAt` 이 그것을 낸다. 파셀 재빌드는 여기서 안 재진다
        // (그 축은 `world2-village-parcels.test.ts` 의 경계 절이 실제 부품으로 본다).
        freeze: (px, pz, parts) => { frozenStore.set(`${px},${pz}`, parts.map((p) => ({ ...p }))); },
        thaw: (px, pz) => { frozenStore.delete(`${px},${pz}`); },
      }
      : null,
    surfaceAt: () => 0,
    // 시점 문(W6). **실제로 불렸는가**만 기록한다 — 카메라가 어디로 갔는지는
    // `PlayerSystem` 의 일이고 `tests/world2-player-orbit.test.ts` 가 본다.
    orbitTo: (cx, cy, cz, preset) => {
      views.push({ cx, cy, cz, lift: preset.lift, radius: preset.radius, yaw: preset.yaw });
    },
    // 셰이딩 문(W6). 짝으로만 열고 닫는다 — 하나만 있으면 토글이 «지금 무엇인가» 를
    // 몰라 성립하지 않는다(`edit/types.ts` 의 그 주석을 픽스처가 그대로 지킨다).
    ...(vf?.shadingDoor === false ? {} : {
      shading: () => shadingNow,
      setShading: (m: ShadingMode) => { shadingNow = m; shadings.push(m); },
    }),
  };

  // 팔레트 요청은 이 축과 무관하다 — 목록이 없으면 끌어다 놓기만 쓰는 정상 경로로 간다.
  const session = startEditMode(host, { modelsUrl: 'about:blank', onBlobUrl() { } });
  current = session;
  return {
    session, live, doc, canvas, entries, removed, hits, root, villageHits, villageMesh, order,
    frozen: frozenStore,
    retargeted,
    views,
    shadings,
    shadingNow: () => shadingNow,
    shadeButtons: () => [...doc.querySelectorAll('#w2-edit button')]
      .filter((b) => SHADING_MODES.some((m) => SHADING_LABEL[m] === b.textContent)) as HTMLButtonElement[],
    gizmoHandle: () => {
      for (const c of root.children as { children?: unknown[] }[]) {
        const kids = c?.children;
        if (!Array.isArray(kids)) continue;
        const found = (kids as { userData?: Record<string, unknown> }[])
          .find((k) => k?.userData?.gizmo);
        if (found) return found;
      }
      return undefined;
    },
    fields: () => [...doc.querySelectorAll('#w2-edit input[type="number"]')] as HTMLInputElement[],
    // `pick.ts` 가 선택 링에 `renderOrder = 999` 를 준다. 기즈모는 `Group` 이라 안 섞인다.
    marker: () => (root.children as { renderOrder?: number; visible?: boolean; position?: { x: number; z: number } }[])
      .find((c) => c?.renderOrder === 999),
  };
}

/** 항목 하나를 씬에 있는 것처럼 꾸미고, 광선에 걸리게 한다 */
function addEntry(h: Harness): OverlayEntry {
  // `entryOf` 는 «부모가 root 인 조상» 을 찾으므로 holder 를 root 에 직접 매단다.
  const holder = { parent: h.root };
  const e: OverlayEntry = {
    id: 1, src: 'assets/models/a.glb', preview: false,
    holder: holder as never, x: 0, y: 0, z: 0, ry: 0, s: 1,
  };
  h.entries.push(e);
  return e;
}

function pressTab(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', bubbles: true, cancelable: true }));
}

describe('주행이 산다 — 편집 리스너는 편집 모드에서만 붙는다 (행위)', () => {
  // ⚠ **이 절은 감독 신고에서 생겼다**(2026-08-12): *"저 위에 링크 클릭하면 마우스 터치,
  // 키보드 동작안해."* `?edit=1` 이 편집 모드 상시 켜짐이라 편집 리스너가 캔버스 클릭을
  // 캡처 단계에서 끊었고, 그래서 `main.ts` 의 포인터락 요청이 **영영 안 불렸다** →
  // 마우스를 움직여도 시점이 안 돈다.
  //
  // 배포 전 검증은 *"포인터락 미발생 = PASS"* 로 쟀다. 감독에게 그것은 성공이 아니라
  // *"화면이 안 돌아간다"* 였다 — **재는 축이 틀렸다.** 그래서 여기서는 반대 방향을 본다.

  it('부팅 직후는 주행 모드다 — 편집 리스너가 하나도 없다', () => {
    const h = makeHarness();
    expect(
      grabbyCount(h.live),
      '★ 부팅부터 편집 리스너가 붙어 있다 = 주행이 죽는다(감독 신고 2026-08-12).'
      + ' 소스 텍스트 검사가 놓쳤던 형태가 정확히 이것이다 — 등록 코드는 bind 안에 있는데'
      + ' 부팅부가 그 bind 를 무조건 부르는 경우.',
    ).toBe(0);
  });

  it('편집을 켜면 붙고, 끄면 **전부** 뗀다', () => {
    const h = makeHarness();
    pressTab();
    const on = grabbyCount(h.live);
    expect(on, '편집을 켰는데 리스너가 안 붙었다 — 그러면 아무것도 못 집는다').toBeGreaterThan(0);

    pressTab();
    expect(
      grabbyCount(h.live),
      '★ bind/unbind 가 어긋났다 — 편집을 꺼도 남는 리스너가 주행을 계속 막는다.',
    ).toBe(0);
  });

  it('여러 번 켜고 꺼도 새지 않는다 — 중복 등록이 쌓이면 한 번의 클릭이 여러 번 처리된다', () => {
    const h = makeHarness();
    for (let i = 0; i < 3; i++) { pressTab(); pressTab(); }
    expect(grabbyCount(h.live)).toBe(0);
    pressTab();
    const once = grabbyCount(h.live);
    pressTab(); pressTab(); // 껐다 다시 켠다
    expect(grabbyCount(h.live), '★ 켤 때마다 리스너가 누적된다').toBe(once);
  });

  it('dispose 하면 상시 리스너(Tab)까지 전부 사라진다', () => {
    const h = makeHarness();
    pressTab(); // 편집을 켜 둔 채로 떠난다 — 가장 새기 쉬운 경로
    h.session.dispose();
    current = null;
    let total = 0;
    for (const n of h.live.values()) total += n;
    expect(total, '★ dispose 후에도 리스너가 남는다 — 세션을 다시 열면 두 벌이 된다').toBe(0);
  });

  it('편집이 꺼져 있어도 Tab 은 듣는다 — 그러지 않으면 켤 방법이 버튼뿐이다', () => {
    const h = makeHarness();
    expect(h.live.get('keydown') ?? 0, 'Tab 을 듣는 리스너가 없다').toBeGreaterThan(0);
  });
});

describe('선택된 항목에 대한 키 조작 (행위)', () => {
  /** 항목을 하나 놓고 클릭으로 고른다 */
  function selectOne(h: Harness): OverlayEntry {
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    pressTab(); // 편집 모드
    h.canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0, clientX: 400, clientY: 500, bubbles: true,
    }));
    return e;
  }

  it('맥 키보드에도 삭제가 있다 — `Delete` 코드의 키가 없는 기기가 있다', () => {
    // hint 가 "Del 삭제" 를 광고하는데 맥에서는 그 자리가 `Backspace` 라 영구 무반응이었다.
    const h = makeHarness();
    const e = selectOne(h);
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backspace', bubbles: true, cancelable: true }));
    expect(h.removed, '★ Backspace 가 안 먹는다 — 맥에서 삭제할 방법이 없어진다').toContain(e);
  });

  it('Delete 도 그대로 먹는다', () => {
    const h = makeHarness();
    const e = selectOne(h);
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Delete', bubbles: true, cancelable: true }));
    expect(h.removed).toContain(e);
  });

  it('회전 키가 실제로 값을 바꾼다', () => {
    const h = makeHarness();
    const e = selectOne(h);
    const before = e.ry;
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true, cancelable: true }));
    expect(e.ry, '★ 편집키가 값을 안 바꾼다').not.toBe(before);
  });
});

describe('드래그가 갇히지 않는다 (행위)', () => {
  it('pointercancel 도 드래그를 정리한다 — 터치에서 pointerup 이 안 오는 경로', () => {
    // 브라우저가 제스처를 가로채면 `pointerup` 이 **안 온다.** 그러면 `dragging` 이 영구히
    // 남아 이후 모든 손가락이 물건을 끌고 다닌다(`builder.js` 가 이미 겪은 축).
    const h = makeHarness();
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    pressTab();
    h.canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0, clientX: 400, clientY: 500, bubbles: true,
    }));
    document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }));

    // 취소 뒤의 이동은 물건을 끌면 안 된다.
    const x = e.x;
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 100, clientY: 550, bubbles: true }));
    expect(e.x, '★ pointercancel 뒤에도 드래그가 살아 있다 — 이후 모든 터치가 물건을 끈다').toBe(x);
  });
});

// ── 마을 파츠 집기 (W4 ②-c) ─────────────────────────────────────────────────
//
// 여기서 재는 것은 **클릭 한 번이 무엇을 고르는가**다. 순수 환원(`matchPart`)과 picker
// 단위 축은 `world2-village-pick.test.ts` 가 본다 — 이 파일은 그 위, 「리스너가 붙은
// 실제 세션에서 상태가 어떻게 되는가」다.
//
// ⚠ 두 선택 칸(`selected`·`villageSel`)이 **동시에 채워지면** 링과 패널이 서로 다른 것을
// 가리킨다. 그 불변식은 여기서만 잴 수 있다(picker 는 상태를 안 쓴다).

/**
 * 파셀 (0,0) 로컬 (5, 3) 에 건물 하나. 셀 40 이므로 월드도 (5, 3) 이다.
 *
 * ⚠ **그림자 데칼 파츠를 같은 자리에 넣는다.** 배치 배열에는 실제로 들어 있고
 * (`kindsFor` 가 `shadow:*` 를 포함한다), 그것이 없으면 「데칼은 안 집힌다」 축이
 * **다른 이유로** 통과한다 — 배열에 없는 종류라 매칭이 실패할 뿐이다. N2 뮤테이션이
 * 0 failed 로 그 빈 검사를 드러냈다(2026-08-13).
 */
const VILLAGE_FIXTURE = {
  parts: {
    '0,0': [
      { kind: 'tree', x: -9, y: 0, z: -9, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 },
      { kind: 'building', x: 5, y: 0, z: 3, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 },
      { kind: 'shadow:building', x: 5, y: 0, z: 3, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 },
    ] as PlacedPart[],
  },
};

function clickAt(h: Harness, x = 400, y = 500): void {
  h.canvas.dispatchEvent(new PointerEvent('pointerdown', {
    button: 0, clientX: x, clientY: y, bubbles: true,
  }));
}

describe('마을 파츠를 클릭으로 고른다 (행위)', () => {
  it('★ 건물을 클릭하면 파셀·인덱스로 환원된다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '★ 마을 파츠를 못 집었다').toContain('마을: building');
    expect(h.doc.body.textContent).toContain('파셀 (0, 0) #1');
  });

  it('★ 레이캐스트 **전에** 경계구를 다시 잡는다 — 안 하면 멀리 있는 것이 안 집힌다', () => {
    // W4 ②-a 가 실증한 지뢰다. `frustumCulled=false` 로는 안 막히고 경고도 없다 —
    // 순서가 뒤집히면 화면에는 «어떤 건물은 클릭이 안 먹는다» 로만 드러난다.
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    const rb = h.order.indexOf('refreshBounds');
    const cast = h.order.indexOf('cast:village');
    expect(rb, 'refreshBounds 가 아예 안 불렸다').toBeGreaterThanOrEqual(0);
    expect(rb, '★ 경계구를 레이캐스트 뒤에 잡았다 — 캐시된 옛 구로 걸러진다').toBeLessThan(cast);
  });

  it('★ 오버레이 항목이 먼저다 — 겹쳐 있으면 놓은 GLB 를 고른다', () => {
    // 마을은 어디에나 있고 GLB 는 일부러 그 자리에 둔 것이다.
    const h = makeHarness(VILLAGE_FIXTURE);
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '★ 마을이 오버레이를 가로챘다').not.toContain('마을: building');
    expect(h.doc.body.textContent).toContain('선택: a.glb');
  });

  it('★ 빈 곳을 클릭하면 마을 선택도 풀린다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent).toContain('마을: building');
    h.villageHits.length = 0;
    clickAt(h);
    expect(h.doc.body.textContent, '★ 안 고른 것이 계속 골라진 채로 남는다').not.toContain('마을: building');
    expect(h.doc.body.textContent).toContain('선택: 없음');
  });

  it('★ 그림자 데칼은 집히지 않는다 — 집을 수 없는 것이다', () => {
    // 픽스처 배치에 `shadow:building` 이 **실제로 있다.** 안 거르면 매칭이 성공해서
    // 감독은 «건물을 눌렀는데 그림자가 골라진» 상태가 된다.
    const h = makeHarness({ ...VILLAGE_FIXTURE, owner: { key: 'shadow:building', index: 3 } });
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '★ 데칼이 집혔다 — 지면 근처 클릭이 전부 여기서 끝난다')
      .not.toContain('마을:');
  });

  it('★ 환원 못 한 히트 **뒤에** 있는 것을 집는다 — 첫 건에서 멈추지 않는다', () => {
    // 광선은 가까운 순으로 여러 건을 낸다. 앞의 하나가 환원되지 않는다고 멈추면
    // 그 뒤에 있는 «집을 수 있는 것» 까지 못 집는다 — «어떤 각도에서만 안 집힌다» 다.
    const h = makeHarness({
      ...VILLAGE_FIXTURE,
      // 첫 히트는 배치에 없는 자리, 둘째는 건물 자리.
      owner: { key: 'building', index: 3 },
    });
    const ghost = {
      at: { x: 17, y: 0, z: 17 },
      getMatrixAt(_i: number, m: { elements: number[] }): void {
        m.elements[12] = 17; m.elements[13] = 0; m.elements[14] = 17;
      },
    };
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: ghost, instanceId: 0 }, { object: h.villageMesh, instanceId: 1 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '★ 첫 히트가 환원 실패하자 그 뒤를 안 봤다')
      .toContain('파셀 (0, 0) #1');
  });

  it('★ 마을을 고르면 선택 링이 그 자리에 뜬다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    const m = h.marker();
    expect(m, '선택 링을 못 찾았다 — 하네스가 root 를 안 담고 있다').toBeDefined();
    expect(m?.visible, '★ 골랐는데 링이 안 뜬다 — 무엇을 골랐는지 화면이 침묵한다').toBe(true);
    expect([m?.position?.x, m?.position?.z], '★ 링이 엉뚱한 자리에 떴다').toEqual([5, 3]);
  });

  it('★ 오버레이를 고르면 마을 안내가 사라진다 — 선택은 하나다', () => {
    // `villageSel` 이 안 풀리면 패널 아래 안내가 «마을 파츠는 아직 고르기만…» 으로
    // 남는다. 선택은 GLB 인데 안내는 마을을 말하는 상태다.
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent).toContain('「손본 구역」이 되어');

    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    clickAt(h);
    expect(h.doc.body.textContent, '★ GLB 를 골랐는데 마을 안내가 남아 있다')
      .not.toContain('「손본 구역」이 되어');
  });

  it('★ 편집을 끄면 마을 선택도 풀린다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent).toContain('마을: building');
    pressTab(); // 주행으로
    expect(h.doc.body.textContent, '★ 주행으로 돌아왔는데 고른 것이 남아 있다')
      .not.toContain('마을: building');
    expect(h.marker()?.visible, '★ 주행 모드인데 선택 링이 떠 있다').toBe(false);
  });

  it('환원할 수 없는 히트는 조용히 넘긴다 — 엉뚱한 것을 고르지 않는다', () => {
    // 배치에 없는 자리를 맞혔다(파셀은 맞지만 그 자리에 building 이 없다).
    const h = makeHarness(VILLAGE_FIXTURE);
    h.villageMesh.at = { x: 17, y: 0, z: 17 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '★ 「가장 가까운 것」을 집어 엉뚱한 건물이 골라졌다')
      .not.toContain('마을:');
  });

  it('손본 파셀이면 화면이 그렇게 말한다', () => {
    const h = makeHarness({ ...VILLAGE_FIXTURE, frozen: () => true });
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent).toContain('손본 구역');
  });

  it('마을 문이 닫힌 세션은 예전 그대로다 — 라이브 격리', () => {
    const h = makeHarness(); // 문을 안 연다
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.order, '★ 문이 닫혔는데 마을에 광선을 쐈다').not.toContain('cast:village');
    expect(h.doc.body.textContent).toContain('선택: 없음');
  });
});

// ── 마을 파츠 옮기기·지우기·되돌리기 (W4 ②-d) ───────────────────────────────
//
// 여기서 재는 것은 **조작이 동결로 이어지는가**다. 「동결이 화면까지 오는가」는
// `world2-village-parcels.test.ts` 의 경계 절이 실제 빌더·스트리밍으로 본다.
//
// ⚠ 이 절의 존재 이유: 조작 경로가 다섯이다(기즈모 드래그 · 수치칸 · 조작 버튼 ·
// 편집키 · 삭제). **하나만 `commit()` 을 빠뜨려도 그 경로에서만 조용히 안 저장된다** —
// 화면은 바뀌었는데 파일에는 없는 형태이고, 감독은 내보내기를 열어 봐야 안다.

/**
 * 편집키 하나를 누른다. **편집이 그 키를 먹었으면 `true`**.
 *
 * 반환값이 곧 «주행이 살아 있는가» 의 축이다 — 편집은 자기가 처리한 키만
 * `preventDefault`·`stopPropagation` 한다(`input.ts`). 주행(`main.ts`)은 window 에 붙어
 * 있어서 document 버블 뒤에 오므로, 여기서 `true` 가 나오면 그 키는 주행에 안 간다.
 *
 * `key`(찍힌 글자)를 따로 받는 이유: 모달의 숫자·부호·소수점은 `code` 가 아니라 `key` 로
 * 본다(자판 배열에 안 묶이게 — `decide/modal-edit.ts`).
 */
function pressKey(code: string, key = '', mods: { shiftKey?: boolean } = {}): boolean {
  const ev = new KeyboardEvent('keydown', {
    code, key, bubbles: true, cancelable: true, ...mods,
  });
  document.dispatchEvent(ev);
  return ev.defaultPrevented;
}

/**
 * 마우스를 옮긴다. **모달은 키로 시작하므로 시작점이 마지막 이동 자리다** —
 * 모달을 열기 전에 한 번 불러 두지 않으면 시작점이 (0,0) 이라 첫 이동에 값이 튄다.
 */
function movePointer(x: number, y: number): void {
  document.dispatchEvent(new PointerEvent('pointermove', {
    clientX: x, clientY: y, bubbles: true,
  }));
}

/**
 * 마을 건물 하나를 골라 둔 하네스.
 *
 * `at` 은 그 인스턴스의 **월드** 자리다 — `parcelOf` 가 이것에서 파셀을 역산하므로
 * 픽스처의 파셀 키와 짝이 맞아야 한다(`OFFSET_FIXTURE` 주석 참조).
 */
function pickedVillage(
  vf: VillageFixture = VILLAGE_FIXTURE,
  at: { x: number; y: number; z: number } = { x: 5, y: 0, z: 3 },
): Harness {
  const h = makeHarness(vf);
  h.villageMesh.at = at;
  h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
  pressTab();
  clickAt(h);
  return h;
}

/** 저장된 동결에서 그 파츠를 꺼낸다. 파셀 키는 기본이 원점이다 */
function frozenPart(h: Harness, kind = 'building', key = '0,0'): PlacedPart | undefined {
  return h.frozen.get(key)?.find((p) => p.kind === kind);
}

describe('마을 파츠를 조작하면 그 구역이 동결된다 (행위)', () => {
  it('고르기만 해서는 동결되지 않는다 — 손대지 않은 구역은 계산 그대로', () => {
    const h = pickedVillage();
    expect(h.frozen.size, '★ 클릭만 했는데 구역이 「손본 구역」이 됐다').toBe(0);
  });

  it('★ 편집키(회전)가 동결로 이어진다', () => {
    const h = pickedVillage();
    pressKey('KeyE');
    expect(h.frozen.size, '★ 회전했는데 저장되지 않았다').toBe(1);
    expect(frozenPart(h)?.ry, '회전이 반영되지 않았다').toBeGreaterThan(0);
  });

  it('★ 높이 키가 동결로 이어진다', () => {
    const h = pickedVillage();
    pressKey('KeyX');
    expect(frozenPart(h)?.y, '★ 높이가 저장되지 않았다').toBeGreaterThan(0);
  });

  it('★ 크기 버튼은 **비율을 유지한 채** 민다 — 비균등이 무너지면 건물이 정육면체가 된다', () => {
    // ⚠ 이 축은 원래 `KeyR`(크게) 를 눌렀다. **`R` 은 회전 모달로 갔다**(블렌더 표준) —
    // 키가 사라진 것이 아니라 옮겨간 것이라, 같은 성질을 남은 경로(패널 버튼)로 잰다.
    // 모달 `S` 경로의 같은 성질은 아래 「블렌더식 모달 조작」 절이 따로 본다.
    const h = makeHarness({
      parts: {
        '0,0': [{ kind: 'building', x: 5, y: 0, z: 3, ry: 0, sx: 4, sy: 8, sz: 2, tone: 0 }] as PlacedPart[],
      },
    });
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    [...h.doc.querySelectorAll('button')].find((b) => b.textContent === '크기 +')!.click();
    const p = frozenPart(h)!;
    expect(p.sx, '★ 크기가 안 커졌다').toBeGreaterThan(4);
    // 4 : 8 : 2 = 1 : 2 : 0.5 가 유지돼야 한다.
    expect(p.sy / p.sx).toBeCloseTo(2, 5);
    expect(p.sz / p.sx).toBeCloseTo(0.5, 5);
  });

  it('★ 지우면 배열에서 빠진 채로 동결된다 — 「다 지웠다」와 「안 손댔다」', () => {
    const h = pickedVillage();
    pressKey('Delete');
    const parts = h.frozen.get('0,0');
    expect(parts, '★ 지웠는데 저장되지 않았다 — 재방문하면 되살아난다').toBeDefined();
    expect(parts?.some((p) => p.kind === 'building'), '★ 지운 건물이 남아 있다').toBe(false);
    expect(parts?.some((p) => p.kind === 'tree'), '★ 옆의 나무까지 지웠다').toBe(true);
  });

  it('★ 되돌리기가 동결을 푼다', () => {
    const h = pickedVillage({ ...VILLAGE_FIXTURE, frozen: () => true });
    pressKey('KeyE');
    expect(h.frozen.size).toBe(1);
    // 「구역 되돌리기」 버튼을 찾아 누른다.
    const btn = [...h.doc.querySelectorAll('button')].find((b) => b.textContent === '구역 되돌리기');
    expect(btn, '되돌리기 버튼이 없다').toBeDefined();
    btn!.click();
    expect(h.frozen.size, '★ 되돌렸는데 동결이 남아 있다').toBe(0);
  });

  it('되돌리기 버튼은 마을을 골랐을 때만 보인다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    pressTab();
    const btn = [...h.doc.querySelectorAll('button')].find((b) => b.textContent === '구역 되돌리기');
    expect(btn?.hidden, '★ 아무것도 안 골랐는데 되돌리기가 보인다').toBe(true);
    h.villageMesh.at = { x: 5, y: 0, z: 3 };
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    clickAt(h);
    expect(btn?.hidden, '★ 마을을 골랐는데 되돌리기가 안 보인다').toBe(false);
  });

  it('★ 오버레이 항목은 예전 그대로다 — 조작해도 동결이 생기지 않는다', () => {
    // 어댑터 도입이 오버레이 경로를 바꾸면 안 된다(동작 변경 0).
    const h = makeHarness(VILLAGE_FIXTURE);
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    pressTab();
    clickAt(h);
    const before = e.ry;
    pressKey('KeyE');
    expect(e.ry, '★ GLB 회전이 안 먹는다').not.toBe(before);
    expect(h.frozen.size, '★ GLB 를 만졌는데 마을 구역이 동결됐다').toBe(0);
  });
});

// ── 조작 경로 다섯이 **전부** 확정하는가 ────────────────────────────────────
//
// ⚠ **이 절은 뮤테이션이 만들었다.** 위 절만 있을 때 «확정을 빠뜨린다» 를 심어 보니
// 편집키 경로만 잡히고 **기즈모 드래그·조작 버튼·수치칸 셋은 0 failed** 였다
// (P1·P3·P4, 2026-08-13). 경로마다 `commit()` 을 따로 부르는 구조라, 하나가 빠지면
// **그 경로에서만** 조용히 안 저장된다 — 화면은 바뀌었는데 파일에는 없는 형태다.

describe('조작 경로마다 동결이 저장된다 (행위)', () => {
  it('★ 기즈모를 잡았다 놓으면 확정된다', () => {
    const h = pickedVillage();
    const handle = h.gizmoHandle();
    expect(handle, '기즈모 핸들을 못 찾았다 — 이 축이 빈 검사가 된다').toBeDefined();
    // 핸들을 광선에 물려 잡는다(`gizmo.hitTest` → `begin` → `dragging`).
    h.hits.push({ object: handle });
    clickAt(h);
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(h.frozen.size, '★ 기즈모로 옮기고 놓았는데 저장되지 않았다').toBe(1);
  });

  it('빈 곳을 클릭했다 떼는 것만으로는 확정하지 않는다 — 헛일을 안 한다', () => {
    const h = pickedVillage();
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    expect(h.frozen.size, '★ 아무것도 안 했는데 파셀이 다시 만들어진다').toBe(0);
  });

  it('★ 조작 버튼(회전)이 확정한다', () => {
    const h = pickedVillage();
    const btn = [...h.doc.querySelectorAll('button')].find((b) => b.textContent === '회전 ↻');
    expect(btn, '회전 버튼이 없다').toBeDefined();
    btn!.click();
    expect(h.frozen.size, '★ 버튼으로 회전했는데 저장되지 않았다').toBe(1);
    expect(frozenPart(h)?.ry).toBeGreaterThan(0);
  });

  it('★ 수치칸이 확정하고, **월드 좌표를 파셀 로컬로** 되돌린다', () => {
    // 파셀 (1,0) 을 쓰는 것이 요점이다. 원점 파셀이면 월드=로컬이라 변환 결함이 안 보인다.
    const h = makeHarness({
      parts: {
        '1,0': [{ kind: 'building', x: 5, y: 0, z: 3, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 }] as PlacedPart[],
      },
    });
    h.villageMesh.at = { x: 45, y: 0, z: 3 }; // 셀 40 → 파셀 (1,0) 의 로컬 (5,3)
    h.villageHits.push({ object: h.villageMesh, instanceId: 0 });
    pressTab();
    clickAt(h);
    expect(h.doc.body.textContent, '파셀 (1,0) 을 못 집었다').toContain('파셀 (1, 0)');

    const [fx] = h.fields();
    expect(fx, '수치칸을 못 찾았다').toBeDefined();
    fx.value = '50';
    fx.dispatchEvent(new Event('input', { bubbles: true }));

    expect(h.frozen.size, '★ 수치를 쳤는데 저장되지 않았다').toBe(1);
    expect(
      frozenPart(h, 'building', '1,0')?.x,
      '★ 월드 좌표가 그대로 저장됐다 — 파셀 원점을 안 뺐다(건물이 파셀 하나만큼 날아간다)',
    ).toBeCloseTo(10, 6);
  });
});

// ── 아웃라이너 (W5 E1) ──────────────────────────────────────────────────────
//
// 「이 구역에 뭐가 있나」를 목록으로 보여주고, 클릭하면 3D 클릭과 **같은 경로**로 고른다.
// 갈라지면 «목록으로 고른 것은 기즈모가 안 붙는다» 가 나고 화면에서만 드러난다.
//
// ⚠ 넓은 화면에서만 보이는 것은 **CSS 미디어 쿼리**가 정한다(`css.ts`). jsdom 은 실제
// 레이아웃을 안 하므로 **가시성은 여기서 못 잰다** — DOM 이 있고 클릭이 먹는가만 본다.
// 「PC 에서 실제로 보이는가」는 감독 화면이 유일한 판정이다.

const outlinerEl = (h: Harness) => h.doc.getElementById('w2-outliner');
const outlinerItems = (h: Harness) =>
  [...(outlinerEl(h)?.querySelectorAll('.items button') ?? [])] as HTMLButtonElement[];

describe('아웃라이너 — 구역 목록 (행위)', () => {
  it('아무것도 안 골랐으면 목록이 비어 있다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    pressTab();
    expect(outlinerEl(h), '아웃라이너 DOM 이 없다').toBeTruthy();
    expect(outlinerItems(h), '★ 안 골랐는데 목록이 차 있다').toHaveLength(0);
  });

  it('★ 마을을 고르면 그 구역의 파츠가 전부 뜬다', () => {
    const h = pickedVillage();
    const items = outlinerItems(h);
    // 픽스처는 tree·building·shadow:building 셋인데 **그림자는 저장 형태에 없다**
    // (`partsAt` 은 캐스터만 — `stripShadows`). 즉 목록에 2개만 와야 한다.
    expect(items.map((b) => b.textContent), '★ 그림자가 목록에 떴다 — 집을 수 없는 것이다')
      .toEqual(['tree #0', 'building #1']);
  });

  it('★ 고른 것이 목록에서 강조된다', () => {
    const h = pickedVillage();
    const on = outlinerItems(h).filter((b) => b.dataset.on === '1');
    expect(on, '★ 무엇을 골랐는지 목록이 말하지 않는다').toHaveLength(1);
    expect(on[0].textContent).toBe('building #1');
  });

  it('★ 목록을 클릭하면 3D 클릭과 같은 경로로 고른다 — 기즈모까지 붙는다', () => {
    const h = pickedVillage();
    // 지금은 building #1 이 골라져 있다. 목록에서 tree #0 으로 바꾼다.
    outlinerItems(h)[0].click();
    expect(h.doc.body.textContent, '★ 목록 클릭이 선택을 안 바꿨다').toContain('마을: tree');
    expect(h.gizmoHandle(), '★ 목록으로 고르면 기즈모가 안 붙는다 — 경로가 갈렸다').toBeDefined();
    const m = h.marker();
    expect(m?.visible, '★ 목록으로 골랐는데 선택 링이 안 뜬다').toBe(true);
    // 링은 **그 파츠 자리**여야 한다. 처음 클릭한 파츠 자리에 남으면 안 된다.
    expect([m?.position?.x, m?.position?.z], '★ 링이 옛 파츠 자리에 남았다').toEqual([-9, -9]);
  });

  it('★ 목록으로 고른 뒤 조작하면 그 파츠가 바뀐다 — 표시만 옮겨간 게 아니다', () => {
    const h = pickedVillage();
    outlinerItems(h)[0].click(); // tree #0
    pressKey('KeyE');            // 회전
    expect(frozenPart(h, 'tree')?.ry, '★ 목록으로 고른 것이 조작에 안 걸린다').toBeGreaterThan(0);
    expect(frozenPart(h, 'building')?.ry, '★ 엉뚱한 파츠가 돌았다').toBe(0);
  });

  it('빈 곳을 클릭하면 목록도 비워진다 — 화면에 안 보이는 것이 골라지지 않게', () => {
    const h = pickedVillage();
    expect(outlinerItems(h).length).toBeGreaterThan(0);
    h.villageHits.length = 0;
    clickAt(h);
    expect(outlinerItems(h), '★ 옛 구역 목록이 남았다').toHaveLength(0);
  });

  it('편집을 끄면 아웃라이너가 주행 모드로 표시된다', () => {
    const h = pickedVillage();
    expect(outlinerEl(h)?.dataset.mode).toBe('edit');
    pressTab();
    expect(outlinerEl(h)?.dataset.mode, '★ 주행으로 돌아왔는데 편집 목록이 남는다').toBe('drive');
  });
});

// ── 블렌더식 모달 조작 (W5 E2) ──────────────────────────────────────────────
//
// 감독 지시 2026-08-13: *"나도 블랜더 잘써서 오히려 그런 방식이 편하지."*
//
// 산술과 상태 기계는 `tests/world2-modal-edit.test.ts` 가 **직접 부르는** 축으로 본다.
// 여기서 재는 것은 그것이 **실제로 배선됐는가** 다 — W4 에서 순수 함수는 맞는데 조립부가
// 안 부르는 형태가 두 번 나왔고(N10·N12), 순수 축만으로는 안 잡혔다.
//
// ⚠ **이 절의 절반은 「주행이 사는가」 다.** `S` 는 주행의 «뒤로» 이고(`main.ts:1252`),
// `R` 은 브라우저 새로고침(⌘R)과 겹친다. 편집이 그 키를 언제 먹고 언제 안 먹는지가
// 곧 «걸어다닐 수 있는가» 라서, 값 검사보다 이쪽이 더 비싼 축이다.

/** 패널 맨 아래 hint 줄. 화면이 광고하는 키 목록이다 */
const hintText = (h: Harness): string => {
  const notes = [...h.doc.querySelectorAll('#w2-edit .note')];
  return notes[notes.length - 1]?.textContent ?? '';
};

/** 비균등 스케일 건물 하나만 있는 구역 — 비율 유지 축이 쓴다 */
const SCALED_FIXTURE: VillageFixture = {
  parts: {
    '0,0': [{ kind: 'building', x: 5, y: 0, z: 3, ry: 0, sx: 4, sy: 8, sz: 2, tone: 0 }] as PlacedPart[],
  },
};

/** 마을 건물을 골라 두고 **마우스 시작점까지 정한** 하네스 */
function modalReady(
  vf: VillageFixture = VILLAGE_FIXTURE,
  at?: { x: number; y: number; z: number },
): Harness {
  const h = pickedVillage(vf, at);
  movePointer(400, 300);
  return h;
}

/**
 * **원점이 아닌 파셀**에 건물 하나 — 파셀 (2,-1) 이므로 월드 오프셋이 (80, -40) 이다.
 *
 * ⚠ **이 픽스처는 뮤테이션 실측이 만들게 했다.** 원점 파셀(0,0)에서는 «파셀 로컬» 과
 * «월드» 가 **같은 수**라, 슬롯에 어느 쪽을 보내든 값이 같다 — 두 좌표계를 구별하는
 * 축이 **원리적으로 성립하지 않는다.** P-C 뮤테이션(`x: w.x` → `x: p.x`)이 0 failed 로
 * 그것을 드러냈다(2026-08-13).
 *
 * ⚠⚠ 첫 판본은 그 사실을 **알아채고도 틀린 처방을 적었다**: *"파셀 원점이 (0,0) 이라
 * 이 축만으로는 두 좌표계가 구별되지 않으므로 옮긴 뒤의 값으로 본다"* — 옮겨도 오프셋이
 * 0 이면 여전히 같은 수다. **관측은 맞았고 결론이 안 따라왔다**(이 저장소가 이름 붙여
 * 둔 형태: *"참인 문장에서 성립하지 않는 결론을 뽑는 것"*).
 */
const OFFSET_FIXTURE: VillageFixture = {
  parts: {
    '2,-1': [{ kind: 'building', x: 5, y: 0, z: 3, ry: 0, sx: 1, sy: 1, sz: 1, tone: 0 }] as PlacedPart[],
  },
};
/** 위 픽스처의 건물이 실제로 서 있는 월드 자리 — 파셀 (2,-1) 로 역산된다 */
const OFFSET_AT = { x: 2 * 40 + 5, y: 0, z: -1 * 40 + 3 };

describe('블렌더식 모달 — 주행이 산다 (행위)', () => {
  it('★ 아무것도 안 골랐으면 `S` 는 주행 키 그대로다', () => {
    // 이 하나가 이번 회차에서 가장 비싼 축이다. `S` 를 무조건 가로채면 편집 모드에서
    // **뒤로 걷기가 통째로 죽는다** — 2026-08-12 에 편집이 주행을 죽인 그 형태다.
    const h = makeHarness(VILLAGE_FIXTURE);
    pressTab();
    expect(h.doc, '하네스 확인용').toBeTruthy();
    expect(pressKey('KeyS', 's'), '★ 안 골랐는데 편집이 S 를 먹었다 — 뒤로 걷기가 죽는다').toBe(false);
    expect(pressKey('KeyG', 'g'), '★ 안 골랐는데 편집이 G 를 먹었다').toBe(false);
    expect(pressKey('KeyR', 'r'), '★ 안 골랐는데 편집이 R 을 먹었다').toBe(false);
  });

  it('★ 고른 뒤에도 `G` 는 **안 연다** — 감독 지시로 이동 모달을 걷었다', () => {
    // *"단축키 이동은 없애고"*(2026-08-13, 카드로 「G(이동)만」 으로 좁힘).
    // 되살아나면 그 요구가 무효가 되므로 행위로 못 박는다.
    const h = modalReady();
    expect(h.doc.getElementById('w2-edit'), '패널 확인용').toBeTruthy();
    expect(pressKey('KeyG', 'g'), '★ G 가 다시 모달을 연다').toBe(false);
  });

  it('고른 뒤에는 R·S 가 모달을 연다', () => {
    for (const [code, key] of [['KeyR', 'r'], ['KeyS', 's']] as const) {
      const h = modalReady();
      expect(pressKey(code, key), `★ ${key} 가 모달을 안 연다`).toBe(true);
      expect(h.doc.body.textContent, '★ 모달이 열렸는데 화면이 아무 말도 안 한다')
        .toMatch(/회전|크기/);
      h.session.dispose();
    }
  });

  it('★ 모달 중에도 W·A·D 는 통과한다 — 조작하며 걸어다닐 수 있어야 한다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    expect(h.doc.getElementById('w2-edit'), '패널 확인용').toBeTruthy();
    for (const [code, key] of [['KeyW', 'w'], ['KeyA', 'a'], ['KeyD', 'd']] as const) {
      expect(pressKey(code, key), `★ 조작 중 ${key} 가 막혔다 — 주행이 죽는다`).toBe(false);
    }
  });

  it('★ 모달 중 반복 `S` 가 주행으로 새지 않는다 (검수관 반려 B2)', () => {
    // 검수관 jsdom 재현(2026-08-13): 첫 `S` 는 모달을 열고(먹힘), **두 번째부터
    // `defaultPrevented=false`** 가 되어 window 로 올라갔다. `main.ts` 의
    // `KEYS.KeyS = 'back'` 이 그것을 받아 **크기 모달이 열린 채 뒤로 걷기가 함께
    // 켜진다.** OS 키 반복(누르고 있기)이 그 상황을 만든다.
    const h = modalReady();
    expect(pressKey('KeyS', 's'), '첫 S 는 모달을 연다').toBe(true);
    expect(pressKey('KeyS', 's'), '★ 반복 S 가 주행으로 샌다 — 크기 조작 중 뒤로 걷는다')
      .toBe(true);
    expect(pressKey('KeyS', 's'), '★ 세 번째도 샌다').toBe(true);
    expect(h.doc.body.textContent, '반복 입력이 조작을 망가뜨리지도 않아야 한다')
      .toContain('크기');
  });

  it('★ 모달 중 다른 모달 키도 삼킨다 — G 조작 중 S 가 뒤로 걷기로 새지 않게', () => {
    // 「모달 중 조작 키는 주행으로 안 샌다」한 문장으로 설명되는 규칙이다. 「모달을 연
    // 그 키만」으로 좁히면 G 모달에서는 S 가 살고 S 모달에서는 죽어, 같은 키가 상황따라
    // 다르게 동작한다.
    const h = modalReady();
    pressKey('KeyG', 'g');
    expect(h.doc.getElementById('w2-edit'), '패널 확인용').toBeTruthy();
    expect(pressKey('KeyS', 's'), '★ 이동 조작 중 S 가 주행으로 샌다').toBe(true);
    expect(pressKey('KeyR', 'r'), '★ 이동 조작 중 R 이 샌다').toBe(true);
  });

  it('★ 조합키는 안 가로챈다 — ⌘R·Ctrl+S 가 죽으면 브라우저가 망가진다', () => {
    const h = modalReady();
    expect(h.doc, '하네스 확인용').toBeTruthy();
    for (const mod of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      const ev = new KeyboardEvent('keydown', {
        code: 'KeyR', key: 'r', bubbles: true, cancelable: true, ...mod,
      });
      document.dispatchEvent(ev);
      expect(ev.defaultPrevented, `★ ${JSON.stringify(mod)} + R 을 편집이 먹었다`).toBe(false);
    }
  });

  it('★ 없어진 키를 화면이 광고하지 않는다 — R/F 크기는 S 모달로 갔다', () => {
    // hint 는 키 목록의 **두 번째 사본**이라(태스크 #44) 한쪽만 고치면 «화면이 광고하는
    // 키가 안 먹는다» 가 난다. 실제로 이 회차에 R/F 를 빼면서 그 어긋남이 났다.
    // ⚠ hint 는 **아무것도 안 골랐을 때**의 화면이다 — 마을을 고르면 그 자리를 「손본
    // 구역」 안내가 차지한다(`dom.ts` 의 `refresh`). 그것도 실제 화면이라 여기서 축을
    // 나눈다: 문구는 선택 없는 상태에서, 키가 실제로 죽었는지는 고른 상태에서 본다.
    const idle = makeHarness(VILLAGE_FIXTURE);
    pressTab();
    expect(hintText(idle), '★ hint 가 사라진 R/F 크기를 아직 광고한다').not.toContain('R/F');
    // ⚠ **`G 이동` 도 이제 없어야 한다** — 감독 지시로 이동 모달을 걷었다(2026-08-13).
    // 화면이 광고하는 키가 안 먹으면 그것이 「안내가 아니라 막다른 길」이다.
    expect(hintText(idle), '★ hint 가 사라진 G 이동을 아직 광고한다').not.toContain('G 이동');
    expect(hintText(idle), '★ hint 가 남은 모달 키를 안 알려준다').toContain('R 회전');
    idle.session.dispose();

    // ⚠ **`F` 는 이제 「확대」다**(W6, 감독 지시 *"f누르면 확대"*). 옛 축은 「F 가 안
    // 먹는다」로 R/F 크기 제거를 확인했는데, 지금 F 가 먹는 것은 **다른 뜻**이다.
    // 그래서 「크기가 안 바뀐다」로 재는 쪽이 옳다 — 키가 살아 있다는 사실만으로는
    // 옛 기능이 남았는지 알 수 없다.
    const h = modalReady();
    const before = h.doc.body.textContent ?? '';
    expect(before, '하네스 확인 — 고른 것이 있어야 크기를 잴 수 있다').toContain('×1.00');
    pressKey('KeyF', 'f');
    expect(h.doc.body.textContent, '★ F 가 아직 크기를 바꾼다 — 옛 기능이 남았다')
      .toContain('×1.00');
    expect(h.frozen.size, '★ F 가 조작으로 잡혀 동결이 났다').toBe(0);
  });
});

describe('블렌더식 모달 — 마우스가 따라온다 (행위)', () => {
  it('★ R 로 돌리고 좌클릭하면 그 각도로 확정된다', () => {
    const h = modalReady();
    pressKey('KeyR', 'r');
    movePointer(600, 300); // +200px (ROT_PER_PX = 0.00628)
    clickAt(h);
    expect(h.frozen.size, '★ 확정했는데 저장되지 않았다').toBe(1);
    expect(frozenPart(h)?.ry, '★ 마우스를 따라오지 않았다 — 모달이 배선되지 않았다')
      .toBeCloseTo(200 * 0.00628, 6);
  });

  it('★ Enter 로도 확정된다 — 손을 마우스에서 안 떼는 사람이 있다', () => {
    const h = modalReady();
    pressKey('KeyR', 'r');
    movePointer(600, 300);
    expect(pressKey('Enter', 'Enter'), 'Enter 를 편집이 안 먹었다').toBe(true);
    expect(frozenPart(h)?.ry).toBeCloseTo(200 * 0.00628, 6);
  });

  it('★ Esc 는 **시작 값으로 되돌린다** — 그리고 동결도 안 남긴다', () => {
    // 취소가 값을 안 되돌리면 «되돌렸다고 생각한 것이 그대로 남는» 최악의 형태다.
    // 동결까지 남으면 그 구역이 밀도 슬라이더에서 영영 빠진다.
    const h = modalReady();
    pressKey('KeyR', 'r');
    movePointer(900, 300);
    expect(pressKey('Escape', 'Escape'), 'Escape 를 편집이 안 먹었다').toBe(true);
    expect(h.frozen.size, '★ 취소했는데 구역이 「손본 구역」이 됐다').toBe(0);
    // 값이 실제로 되돌아갔는지는 **다음 조작을 확정시켜** 본다 — 취소 자체는 저장을
    // 안 하므로 저장소만 봐서는 «되돌렸다» 와 «애초에 안 돌렸다» 가 구별되지 않는다.
    // `Q` 는 −15° 한 칸이므로, 취소가 안 됐으면 그 위에 큰 각이 얹혀 있다.
    pressKey('KeyQ');
    expect(frozenPart(h)?.ry, '★ Esc 를 눌러도 돌린 각이 남았다')
      .toBeCloseTo(-Math.PI / 12, 6);
  });

  it('★ 우클릭도 취소다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    movePointer(900, 300);
    h.canvas.dispatchEvent(new PointerEvent('pointerdown', {
      button: 2, clientX: 900, clientY: 300, bubbles: true,
    }));
    expect(h.frozen.size, '★ 우클릭 취소가 동결을 남겼다').toBe(0);
    pressKey('KeyE');
    expect(frozenPart(h)?.x, '★ 우클릭으로 취소해도 옮긴 자리가 남았다').toBeCloseTo(5, 6);
  });

  it('★ 축 키는 **모달 중에도 안 먹는다** — 이동과 함께 사라졌다', () => {
    // 축 고정은 이동 전용이었다(회전은 `ry` 하나, 크기는 균등). 그래서 `X`/`Y`/`Z` 가
    // 모달 중에 `null` 이 되고, **모달 밖의 `Z`/`X`(높이)와 겹치던 것도 함께 풀렸다.**
    const h = modalReady();
    pressKey('KeyR', 'r');
    expect(pressKey('KeyX', 'x'), '★ 축 키가 아직 모달에 먹힌다').toBe(false);
    expect(pressKey('KeyY', 'y')).toBe(false);
    expect(pressKey('KeyZ', 'z')).toBe(false);
    // 그리고 조작 자체는 살아 있다 — 축 키가 모달을 깨지 않았다.
    movePointer(600, 300);
    clickAt(h);
    expect(frozenPart(h)?.ry, '★ 축 키를 누르니 회전이 죽었다')
      .toBeCloseTo(200 * 0.00628, 6);
  });

  it('★ 세로 이동은 무시한다 — 회전·크기는 축이 하나뿐이다', () => {
    const h = modalReady();
    pressKey('KeyR', 'r');
    movePointer(400, 900); // 가로 0 · 세로 +600px
    clickAt(h);
    expect(frozenPart(h)?.ry, '★ 세로로만 끌었는데 값이 바뀌었다').toBeCloseTo(0, 6);
  });

  it('★ 숫자를 치면 마우스를 무시하고 그 값이 된다', () => {
    const h = modalReady();
    pressKey('KeyR', 'r');
    pressKey('Digit4', '4');
    pressKey('Digit5', '5');
    movePointer(9999, 9999); // 손이 떨려도 값이 안 흔들려야 한다
    pressKey('Enter', 'Enter');
    expect(frozenPart(h)?.ry, '★ 45 를 쳤는데 마우스 이동량이 섞였다')
      .toBeCloseTo(Math.PI / 4, 6);
  });

  it('★ R 은 회전이다 — 도(°)로 친다', () => {
    const h = modalReady();
    pressKey('KeyR', 'r');
    pressKey('Digit9', '9');
    pressKey('Digit0', '0');
    pressKey('Enter', 'Enter');
    expect(frozenPart(h)?.ry, '★ 90 을 쳤는데 90° 가 아니다').toBeCloseTo(Math.PI / 2, 6);
  });

  it('★ S 는 크기이고 **비율을 유지한다** — 무너지면 건물이 정육면체가 된다', () => {
    const h = modalReady(SCALED_FIXTURE);
    pressKey('KeyS', 's');
    pressKey('Digit2', '2');
    pressKey('Enter', 'Enter');
    const p = frozenPart(h)!;
    expect(p.sx, '★ 2배를 쳤는데 안 커졌다').toBeCloseTo(8, 6);
    // 4 : 8 : 2 = 1 : 2 : 0.5 가 유지돼야 한다.
    expect(p.sy / p.sx, '★ 모달 크기 조작이 비율을 무너뜨렸다').toBeCloseTo(2, 6);
    expect(p.sz / p.sx).toBeCloseTo(0.5, 6);
  });

  it('★ 오버레이 항목도 같은 문으로 옮긴다 — 두 형태가 갈라지지 않는다', () => {
    const h = makeHarness();
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    pressTab();
    clickAt(h);
    movePointer(400, 300);
    pressKey('KeyR', 'r');
    pressKey('Digit9', '9');
    pressKey('Digit0', '0');
    pressKey('Enter', 'Enter');
    expect(e.ry, '★ GLB 는 모달로 안 돌아간다 — 어댑터가 한쪽만 배선됐다')
      .toBeCloseTo(Math.PI / 2, 6);
  });

  it('★ 화면이 지금 무엇을 하는지 말한다 — 모달은 보이는 핸들이 없다', () => {
    const h = modalReady();
    pressKey('KeyR', 'r');
    movePointer(500, 300);
    expect(h.doc.body.textContent, '★ 조작 중인데 화면이 아무 말도 안 한다').toContain('회전:');
    pressKey('Escape', 'Escape');
    expect(h.doc.body.textContent, '★ 끝났는데 조작 문구가 남아 있다 — 진행 중인지 알 수 없다')
      .not.toContain('회전:');
  });

  it('★ 선택이 바뀌면 진행 중 조작이 끝난다 — 새 대상이 옛 자리로 튀지 않는다', () => {
    const h = modalReady();
    pressKey('KeyG', 'g');
    movePointer(900, 300);
    outlinerItems(h)[0].click(); // tree #0 으로 갈아탄다
    movePointer(1200, 300);      // 모달이 살아 있으면 나무가 끌려간다
    pressKey('KeyE');            // 확정시켜 저장된 값을 본다
    expect(frozenPart(h, 'tree')?.x, '★ 새 대상이 옛 조작에 끌려갔다').toBeCloseTo(-9, 6);
  });

  it('모달 중에는 기즈모·드래그가 안 듣는다 — 두 조작이 겹치지 않는다', () => {
    const h = modalReady();
    pressKey('KeyR', 'r');
    // 기즈모 핸들 위를 지나가도 모달만 먹는다.
    if (h.gizmoHandle()) h.hits.push({ object: h.gizmoHandle() });
    movePointer(600, 300);
    clickAt(h);
    expect(frozenPart(h)?.ry, '★ 모달 중 다른 조작이 끼어들었다')
      .toBeCloseTo(200 * 0.00628, 6);
  });
});

// ── 조작 중 실시간 반영 (W5 E2.5) ───────────────────────────────────────────
//
// 감독 지시 2026-08-13: *"gpu지원으로 쾌적하게 움직이게 하자."*
// W4 는 «드래그 중 마을 건물이 안 따라온다» 를 대가로 받아들이고 탈출로를 적어 두었다
// (`edit/target.ts` 헤더). 팀장 판정(2026-08-13)으로 그 탈출로를 탔다 — 슬롯 자세만
// 갱신하는 좁은 문 하나(`OverlayHost.retargetSlot`).
//
// ⚠ **jsdom 에는 화면이 없다.** 그래서 «따라왔는가» 를 픽셀로 못 잰다 — 대신 «무엇이
// 슬롯으로 나갔는가»(`h.retargeted`)로 잰다. 실제로 그 자세가 눈에 보이는지는 감독
// 실기기가 유일한 판정이고, 여기서 재는 것은 **경로가 실제로 이어졌는가** 다.

/** 마지막으로 슬롯에 밀린 자세 */
const lastPush = (h: Harness): RetargetCall | undefined => h.retargeted[h.retargeted.length - 1];

describe('조작 중 슬롯이 손을 따라온다 (행위)', () => {
  it('★ 확정하기 **전에** 이미 슬롯이 밀린다 — 이것이 이 회차의 전부다', () => {
    const h = modalReady();
    pressKey('KeyR', 'r');
    movePointer(600, 300);
    expect(h.retargeted.length, '★ 조작 중인데 슬롯이 안 밀렸다 — 건물이 안 따라온다')
      .toBeGreaterThan(0);
    expect(h.frozen.size, '★ 조작 중에 동결이 났다 — 파셀이 프레임마다 다시 만들어진다')
      .toBe(0);
  });

  it('★ 밀린 자세는 **월드 좌표**다 — 로컬을 그대로 보내면 건물이 원점 쪽으로 순간이동한다', () => {
    // **원점이 아닌 파셀에서 재야 한다** — 근거는 `OFFSET_FIXTURE` 주석 한 곳이다.
    // 건물은 파셀 (2,-1) 의 로컬 (5, 3) = 월드 (85, -37) 에 있다. 월드 x 를 95 로 옮기면
    // 로컬은 15 라 두 좌표계가 **다른 수**가 된다.
    //
    // ⚠ **이동을 수치칸으로 잰다** — 이동 모달(`G`)이 사라졌기 때문이다(감독 지시
    // 2026-08-13). 수치칸은 «월드 좌표를 보여주고 받는» 문이라(`target.ts` 의 어댑터)
    // 이 축이 재려는 변환을 그대로 지난다.
    const h = modalReady(OFFSET_FIXTURE, OFFSET_AT);
    const [fx] = h.fields();
    expect(fx, '수치칸을 못 찾았다').toBeDefined();
    fx.value = '95';
    fx.dispatchEvent(new Event('input', { bubbles: true }));
    const p = lastPush(h)!;
    expect(p.x, '★ 슬롯에 파셀 로컬 x 가 나갔다 — 건물이 파셀 원점 쪽으로 튄다')
      .toBeCloseTo(95, 6);
    expect(p.z, '★ 슬롯에 파셀 로컬 z 가 나갔다').toBeCloseTo(-37, 6);
  });

  it('★ 확정도 같은 자리에 저장된다 — 화면과 파일이 갈라지면 안 된다', () => {
    // 슬롯에는 월드를, 저장소에는 **파셀 로컬**을 쓴다. 두 변환이 어긋나면 «조작할 땐
    // 맞았는데 새로고침하면 옮겨져 있다» 가 난다 — 확정 뒤에야 드러나는 형태다.
    const h = modalReady(OFFSET_FIXTURE, OFFSET_AT);
    const [fx] = h.fields();
    fx.value = '95';
    fx.dispatchEvent(new Event('input', { bubbles: true }));
    const saved = frozenPart(h, 'building', '2,-1');
    expect(saved?.x, '★ 저장된 x 가 파셀 로컬이 아니다').toBeCloseTo(15, 6);
    expect(saved?.z, '★ 저장된 z 가 바뀌었다').toBeCloseTo(3, 6);
  });

  it('★ 고른 그 슬롯에 민다 — 키·번호가 어긋나면 남의 건물이 움직인다', () => {
    const h = modalReady();
    pressKey('KeyR', 'r');
    movePointer(600, 300);
    const p = lastPush(h)!;
    expect(p.key, '★ 엉뚱한 종류의 슬롯을 밀었다').toBe('building');
    expect(p.index, '★ 엉뚱한 번호의 슬롯을 밀었다').toBe(3);
  });

  it('★ 회전·크기도 함께 나간다 — 위치만 따라오면 반쪽이다', () => {
    const h = modalReady(SCALED_FIXTURE);
    pressKey('KeyR', 'r');
    pressKey('Digit9', '9');
    pressKey('Digit0', '0');
    const rot = lastPush(h)!;
    expect(rot.ry, '★ 회전이 슬롯에 안 나갔다').toBeCloseTo(Math.PI / 2, 6);

    pressKey('Escape', 'Escape');
    pressKey('KeyS', 's');
    pressKey('Digit2', '2');
    const sc = lastPush(h)!;
    expect(sc.sx, '★ 크기가 슬롯에 안 나갔다').toBeCloseTo(8, 6);
    expect(sc.sy / sc.sx, '★ 슬롯에 나간 크기가 비율을 잃었다').toBeCloseTo(2, 6);
  });

  it('기즈모·키·버튼도 같은 경로다 — 모달만 되면 조작 수단이 갈린다', () => {
    const h = pickedVillage();
    pressKey('KeyE'); // 회전 키 한 번
    expect(h.retargeted.length, '★ 편집키 조작이 슬롯에 안 나갔다').toBeGreaterThan(0);
    expect(lastPush(h)?.ry, '회전이 반영되지 않았다').toBeGreaterThan(0);
  });

  it('★ 오버레이(GLB)는 슬롯을 안 탄다 — 마을 인스턴스가 아니다', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    pressTab();
    clickAt(h);
    pressKey('KeyE');
    expect(h.retargeted, '★ GLB 조작이 마을 슬롯을 밀었다 — 엉뚱한 건물이 움직인다')
      .toHaveLength(0);
  });

  it('★ 문이 없는 소비자는 W4 동작 그대로다 — 확정 때만 보인다', () => {
    // `retargetSlot` 은 선택 사양이다(`OverlayHost`). 안 여는 소비자가 깨지면 안 된다.
    const h = pickedVillage({ ...VILLAGE_FIXTURE, retarget: false });
    pressKey('KeyE');
    expect(h.retargeted, '문을 안 열었는데 밀렸다').toHaveLength(0);
    expect(frozenPart(h)?.ry, '★ 문이 없으면 확정까지 죽는다 — 편집 자체가 망가졌다')
      .toBeGreaterThan(0);
  });

  it('아웃라이너 목록에서 고른 것은 안 따라온다 — 슬롯을 모른다(알려진 한계)', () => {
    // ⚠ 이것을 **통과 축으로 적는 것이 정직하다** — 목록 클릭은 레이캐스트를 안 타서
    // `ownerAt` 이 안 불린다. 감독이 이 차이를 지적하면 편집 세션 전용 역인덱스를
    // 만든다(`edit/types.ts` 의 `VillagePick.slot` 주석). 지금은 «확정하면 보인다» 다.
    const h = pickedVillage();
    h.retargeted.length = 0;
    outlinerItems(h)[0].click(); // tree #0
    pressKey('KeyE');
    expect(h.retargeted, '목록 경로가 슬롯을 알게 됐다 — 그러면 이 주석을 지워라')
      .toHaveLength(0);
    expect(frozenPart(h, 'tree')?.ry, '★ 목록으로 고른 것의 확정까지 죽었다')
      .toBeGreaterThan(0);
  });
});

describe('조작 중 슬롯이 죽으면 (행위)', () => {
  /** 스트리밍이 이미 걷어간 슬롯을 집은 상태 */
  const detached = () => pickedVillage({ ...VILLAGE_FIXTURE, owner: { key: 'building', index: -1 } });

  it('★ 화면이 말한다 — 조용한 no-op 은 «가끔 안 움직인다» 가 된다', () => {
    // 팀장 조건 (나)-1: *"조용히 no-op 만 남기면 «가끔 안 움직인다»가 된다."*
    const h = detached();
    pressKey('KeyE');
    expect(h.doc.body.textContent, '★ 미리보기가 끊겼는데 화면이 아무 말도 안 한다')
      .toContain('미리보기가 끊겼');
  });

  it('★ 그래도 편집과 저장은 산다 — 끊긴 것은 미리보기뿐이다', () => {
    const h = detached();
    pressKey('KeyE');
    expect(frozenPart(h)?.ry, '★ 슬롯이 죽었다고 저장까지 죽었다 — 조작을 통째로 잃는다')
      .toBeGreaterThan(0);
  });

  it('★ 죽은 슬롯에는 밀지 않는다 — 남의 건물이 움직인다', () => {
    const h = detached();
    pressKey('KeyE');
    expect(h.retargeted, '★ index < 0 인 슬롯에 자세를 밀었다').toHaveLength(0);
  });

  it('★ 다시 고르면 경고가 풀린다 — 멀쩡한 조작에 옛 경고가 붙지 않게', () => {
    const h = detached();
    pressKey('KeyE');
    expect(h.doc.body.textContent).toContain('미리보기가 끊겼');
    // 살아 있는 것을 다시 고른다(목록 경로 — 슬롯은 없지만 정상 상태다).
    outlinerItems(h)[0].click();
    expect(h.doc.body.textContent, '★ 새로 골랐는데 옛 경고가 남았다')
      .not.toContain('미리보기가 끊겼');
  });
});

// ── 선택 배지 (W6) ──────────────────────────────────────────────────────────
//
// 감독 지시 2026-08-13: *"내가 뭘 선택했는지 나오게 해줘."* 카드 확인: **화면에 큰 글씨로.**
//
// ⚠ **jsdom 은 레이아웃을 안 한다.** 「큰 글씨인가」·「가운데인가」는 여기서 원리적으로
// 못 잰다 — 그건 CSS 이고 감독 화면이 유일한 판정이다. 이 절이 재는 것은 **문안이 옳게
// 뜨고 옳게 사라지는가** 다. 조사 실측이 밝힌 옛 실패도 그 형태였다: 표시가 없던 게
// 아니라 **전부 작고 구석에 있었다.**

const badgeEl = (h: Harness) => h.doc.getElementById('w2-badge');
const badgeText = (h: Harness) => badgeEl(h)?.textContent ?? '';
const badgeOn = (h: Harness) => badgeEl(h)?.dataset.on === '1';

describe('선택 배지 — 뭘 골랐는지 화면이 말한다 (행위)', () => {
  it('아무것도 안 골랐으면 **숨는다**', () => {
    const h = makeHarness(VILLAGE_FIXTURE);
    pressTab();
    expect(badgeEl(h), '배지 DOM 이 없다').toBeTruthy();
    expect(badgeOn(h), '★ 안 골랐는데 배지가 떴다 — 「선택: 없음」을 크게 띄우지 않는다')
      .toBe(false);
  });

  it('★ 마을 파츠를 고르면 **그것이 무엇인지** 뜬다', () => {
    const h = pickedVillage();
    expect(badgeOn(h), '★ 골랐는데 배지가 안 뜬다').toBe(true);
    expect(badgeText(h), '★ 배지가 무엇을 골랐는지 안 말한다').toContain('building');
    expect(badgeText(h), '★ 어느 구역인지 안 말한다').toContain('(0, 0)');
  });

  it('★ GLB 도 뜬다 — 아웃라이너는 오버레이를 아예 안 보여준다', () => {
    // 조사 실측: 아웃라이너는 `st.villageSel` 이 없으면 목록을 비운다 → **오버레이는
    // 화면 폭과 무관하게 목록에 안 나온다.** 배지가 그 구멍을 메운다.
    const h = makeHarness();
    const e = addEntry(h);
    h.hits.push({ object: e.holder });
    pressTab();
    clickAt(h);
    expect(badgeOn(h), '★ GLB 를 골랐는데 배지가 안 뜬다').toBe(true);
    expect(badgeText(h), '★ 파일명이 안 나온다').toContain('a.glb');
  });

  it('★ 빈 곳을 클릭하면 배지가 **사라진다** — 옛 이름이 남으면 더 나쁘다', () => {
    const h = pickedVillage();
    expect(badgeOn(h)).toBe(true);
    h.villageHits.length = 0;
    clickAt(h);
    expect(badgeOn(h), '★ 선택을 풀었는데 배지가 남았다').toBe(false);
  });

  it('★ 다른 것을 고르면 배지도 **따라 바뀐다**', () => {
    const h = pickedVillage();
    expect(badgeText(h)).toContain('building');
    outlinerItems(h)[0].click(); // tree #0
    expect(badgeText(h), '★ 배지가 옛 대상을 그대로 말한다').toContain('tree');
  });

  it('「손본 구역」인지도 말한다 — 그것이 밀도 슬라이더에서 빠지는 이유다', () => {
    const h = pickedVillage();
    pressKey('KeyE'); // 회전 → 동결
    expect(badgeText(h), '손본 구역 표시가 없다').toContain('손본 구역');
  });

  it('편집을 끄면 배지가 주행 모드로 표시된다', () => {
    const h = pickedVillage();
    expect(badgeEl(h)?.dataset.mode).toBe('edit');
    pressTab();
    expect(badgeEl(h)?.dataset.mode, '★ 주행으로 돌아왔는데 배지가 남는다').toBe('drive');
  });

  it('★ 배지는 클릭을 안 먹는다 — 화면 한가운데라 먹으면 그 자리를 영영 못 고른다', () => {
    // CSS 의 `pointer-events:none` 이 그것을 한다. jsdom 이 레이아웃을 안 하므로
    // **선언이 있는지**로만 잰다 — 실제 동작은 감독 화면 판정이다.
    const h = pickedVillage();
    expect(h.doc.head.textContent ?? '', '★ 배지가 포인터를 먹는다')
      .toContain('#w2-badge{position:fixed;z-index:45;pointer-events:none');
  });
});

// ── 정해진 시점 (W6) ────────────────────────────────────────────────────────
//
// 감독 지시 2026-08-13: *"보는 시점도 탑. 왼쪽오른쪽. f누르면 확대 등."*
//
// 값(어느 각·얼마나 멀리)은 `tests/world2-orbit.test.ts` 가 순수 계층에서 본다.
// 여기서 재는 것은 **키·버튼이 실제로 그 문에 닿는가** 다 — 순수 함수가 맞아도
// 조립부가 안 부르면 화면에서는 아무 일도 안 난다(W4 의 N10·N12 가 그 형태였다).

describe('정해진 시점 — 키와 버튼이 문에 닿는다 (행위)', () => {
  it('★ 숫자 키가 시점을 바꾼다 — 1 정면 · 3 우 · 7 탑 · 9 좌', () => {
    const h = pickedVillage();
    for (const code of ['Digit1', 'Digit3', 'Digit7', 'Digit9']) {
      expect(pressKey(code), `★ ${code} 를 편집이 안 먹었다`).toBe(true);
    }
    expect(h.views.length, '★ 시점 문이 안 불렸다').toBe(4);
    // 넷이 서로 달라야 한다 — 같으면 표가 한 값을 가리키고 있다.
    const yaws = h.views.map((v) => v.yaw);
    expect(new Set(yaws.map(String)).size, '★ 네 시점이 같은 곳을 본다').toBeGreaterThan(2);
  });

  it('★ 넘패드도 받는다 — 노트북에 넘패드가 없어 일반 숫자열도 받는 것과 짝이다', () => {
    const h = pickedVillage();
    expect(pressKey('Numpad7'), '★ 넘패드를 안 받는다').toBe(true);
    expect(h.views[0]?.yaw, '★ 탑이 방위를 유지하지 않는다').toBeNull();
  });

  it('★ F 는 확대다 — 다른 시점보다 가깝고 방위를 유지한다', () => {
    const h = pickedVillage();
    pressKey('Digit1'); // 정면
    pressKey('KeyF');
    const [front, focus] = h.views;
    expect(focus, '★ F 가 시점 문을 안 불렀다').toBeDefined();
    expect(Math.hypot(focus.radius, focus.lift), '★ 확대가 정면보다 멀다')
      .toBeLessThan(Math.hypot(front.radius, front.lift));
    expect(focus.yaw, '★ 확대가 방위를 바꿨다 — 보던 쪽을 잃는다').toBeNull();
  });

  it('★ 고른 것을 중심으로 본다 — 아니면 엉뚱한 데를 돈다', () => {
    const h = pickedVillage();
    pressKey('Digit1');
    const v = h.views[0];
    // 픽스처의 건물은 파셀 (0,0) 의 로컬 (5,0,3) = 월드 같은 값(원점 파셀).
    expect([v.cx, v.cz], '★ 고른 것이 아니라 딴 데를 중심으로 잡았다').toEqual([5, 3]);
  });

  it('★ 아무것도 안 골랐으면 **말하고** 안 움직인다', () => {
    // 중심이 없으면 「무엇을 중심으로 도는가」가 정의되지 않는다. 임의로 정하면
    // 감독이 보던 자리에서 튄다 — 침묵보다 안내가 낫다.
    const h = makeHarness(VILLAGE_FIXTURE);
    pressTab();
    expect(pressKey('Digit7'), '★ 안 골랐는데 키가 그냥 통과했다').toBe(true);
    expect(h.views.length, '★ 안 골랐는데 시점이 움직였다').toBe(0);
    expect(h.doc.body.textContent, '★ 아무 말도 안 한다').toContain('먼저 물건을 클릭');
  });

  it('★ 모달 중에는 숫자가 **타이핑**이다 — 시점으로 새지 않는다', () => {
    const h = pickedVillage();
    movePointer(400, 300);
    pressKey('KeyR', 'r');
    pressKey('Digit7', '7');
    expect(h.views.length, '★ 조작 중 숫자가 시점을 바꿨다 — 타이핑이 죽는다').toBe(0);
    expect(h.doc.body.textContent, '★ 타이핑이 화면에 안 보인다').toContain('7');
  });

  it('★ 패널 버튼도 **같은 문**으로 간다 — 키와 갈라지면 한쪽만 고쳐진다', () => {
    const h = pickedVillage();
    const btn = [...h.doc.querySelectorAll('button')].find((b) => b.textContent === '탑');
    expect(btn, '★ 탑 버튼이 없다').toBeDefined();
    btn!.click();
    expect(h.views.length, '★ 버튼이 시점 문을 안 불렀다').toBe(1);
    expect(h.views[0].yaw, '★ 버튼이 키와 다른 값을 보냈다').toBeNull();
  });

  it('시점 버튼 다섯이 다 있다 — 화면이 광고하는 것과 짝이다', () => {
    const h = pickedVillage();
    const labels = [...h.doc.querySelectorAll('button')].map((b) => b.textContent);
    for (const want of ['탑', '정면', '좌', '우', '확대']) {
      expect(labels, `★ 「${want}」 버튼이 없다`).toContain(want);
    }
  });
});

// ── 셰이딩 뷰 (W6) ──────────────────────────────────────────────────────────
//
// 감독 지시 2026-08-13: *"그리고 와이어 프레임 뷰. 솔리드 뷰도 구현해줘."*
//
// 값(어느 재질이 꽂히는가)은 `tests/world2-shading.test.ts` 가 판정·집행 계층에서 본다.
// 여기서 재는 것은 **키·버튼이 실제로 그 문에 닿는가** 다.

describe('셰이딩 뷰 — 키와 버튼이 문에 닿는다 (행위)', () => {
  it('★ Shift+Z 가 와이어를 켠다', () => {
    const h = pickedVillage();
    expect(pressKey('KeyZ', 'Z', { shiftKey: true }), '★ Shift+Z 를 편집이 안 먹었다').toBe(true);
    expect(h.shadings, '★ 셰이딩 문이 안 불렸다').toEqual(['wire']);
  });

  it('★ Z 단독은 **높이**다 — 셰이딩으로 새면 기존 조작이 죽는다', () => {
    // `KeyZ` 가 `EDIT_KEYS`(높이 내리기)에도 있어서 분기 **순서가 곧 동작**이다.
    // 셰이딩 분기를 `EDIT_KEYS` 뒤로 옮기면 이 축이 빨간불이 된다.
    const h = pickedVillage();
    const y0 = h.frozen.size;
    expect(pressKey('KeyZ'), '★ Z 를 편집이 안 먹었다').toBe(true);
    expect(h.shadings, '★ Z 단독이 셰이딩을 바꿨다').toEqual([]);
    // 높이 조작은 마을 파츠를 동결시킨다 — «무언가 실제로 일어났다» 의 관측 가능한 흔적.
    expect(h.frozen.size, '★ Z 가 높이를 안 움직였다').toBeGreaterThan(y0);
  });

  it('★ Shift+Z 를 두 번 누르면 돌아온다 — 토글이지 편도가 아니다', () => {
    const h = pickedVillage();
    pressKey('KeyZ', 'Z', { shiftKey: true });
    pressKey('KeyZ', 'Z', { shiftKey: true });
    expect(h.shadings, '★ 왕복이 아니다').toEqual(['wire', 'material']);
    expect(h.shadingNow(), '★ 원래 자리로 안 돌아왔다').toBe('material');
  });

  it('★ 솔리드에서 갔다 오면 **솔리드**로 돌아온다 — 머티리얼로 튕기지 않는다', () => {
    // 「돌아갈 자리」를 버튼이 함께 갱신하지 않으면 여기서 머티리얼이 나온다.
    const h = pickedVillage();
    h.shadeButtons().find((b) => b.textContent === SHADING_LABEL.solid)!.click();
    pressKey('KeyZ', 'Z', { shiftKey: true });
    pressKey('KeyZ', 'Z', { shiftKey: true });
    expect(h.shadingNow(), '★ 보던 솔리드가 사라졌다').toBe('solid');
  });

  it('★ ?shading=wire 로 시작한 세션은 첫 토글에 머티리얼로 간다', () => {
    // 돌아갈 자리가 와이어면 «눌렀는데 또 와이어» 가 되어 키가 죽은 것으로 보인다.
    const h = pickedVillage({ ...VILLAGE_FIXTURE, shadingStart: 'wire' });
    pressKey('KeyZ', 'Z', { shiftKey: true });
    expect(h.shadingNow(), '★ 와이어에서 못 빠져나온다').toBe('material');
  });

  it('★ 패널 버튼도 **같은 문**으로 간다 — 그리고 절대 지정이다', () => {
    const h = pickedVillage();
    const wire = h.shadeButtons().find((b) => b.textContent === SHADING_LABEL.wire)!;
    wire.click();
    wire.click();
    // 버튼은 토글이 아니다 — 두 번 눌러도 그 모드다. 토글이면 「와이어로 가라」가
    // 「와이어면 나가라」가 되어 버튼 라벨이 거짓말을 한다.
    expect(h.shadingNow(), '★ 버튼이 토글처럼 동작한다').toBe('wire');
    expect(h.shadings, '★ 버튼이 문을 안 불렀다').toEqual(['wire', 'wire']);
  });

  it('셰이딩 버튼 셋이 다 있고 지금 모드가 강조된다', () => {
    const h = pickedVillage();
    expect(h.shadeButtons().length, '★ 버튼이 셋이 아니다').toBe(SHADING_MODES.length);
    // 강조가 없으면 «화면이 그대로인 모드»(재질)에서 눌러도 먹었는지 알 수 없다.
    const on = () => h.shadeButtons().filter((b) => b.dataset.on === '1').map((b) => b.textContent);
    expect(on(), '★ 시작 모드가 강조되지 않는다').toEqual([SHADING_LABEL.material]);
    h.shadeButtons().find((b) => b.textContent === SHADING_LABEL.wire)!.click();
    expect(on(), '★ 바꿨는데 강조가 안 따라온다').toEqual([SHADING_LABEL.wire]);
  });

  it('★ 모달 중에는 Shift+Z 가 안 먹는다 — 조작이 먼저다', () => {
    const h = pickedVillage();
    movePointer(400, 300);
    pressKey('KeyR', 'r');
    pressKey('KeyZ', 'Z', { shiftKey: true });
    expect(h.shadings, '★ 조작 중에 셰이딩이 바뀌었다').toEqual([]);
  });

  it('★ 문이 없는 소비자에서는 **조용히** 무시한다 — 예외도, 흔적도 없다', () => {
    // 빌더 미리보기·테스트 하네스처럼 셰이딩을 안 여는 소비자가 있다.
    const h = pickedVillage({ ...VILLAGE_FIXTURE, shadingDoor: false });
    expect(() => pressKey('KeyZ', 'Z', { shiftKey: true })).not.toThrow();
    expect(h.shadings, '★ 없는 문이 불렸다').toEqual([]);
  });

  it('★ 문이 없으면 버튼을 아예 안 보여준다 — 누를 수 없는 버튼은 막다른 길이다', () => {
    const h = pickedVillage({ ...VILLAGE_FIXTURE, shadingDoor: false });
    const row = h.shadeButtons()[0]?.parentElement as HTMLElement | undefined;
    expect(row?.hidden, '★ 못 쓰는 버튼이 화면에 남는다').toBe(true);
  });

  it('화면이 광고하는 키와 실제 키가 같다 — Shift+Z', () => {
    // hint 는 키 목록의 **두 번째 사본**이다(태스크 #44). 한쪽만 고치면 «화면이
    // 광고하는 키가 안 먹는다» 가 난다.
    //
    // ⚠ **아무것도 안 고른 상태로 잰다** — 무언가 고르면 hint 가 그 대상 안내로 바뀌어
    // 키 목록이 통째로 사라진다(기존 동작이고 이번 범위가 아니다). 고른 상태로 재면
    // 이 축이 언제나 빨간불이라 축 자체가 못 선다.
    const h = makeHarness(VILLAGE_FIXTURE);
    pressTab();
    expect(h.doc.body.textContent, '★ 안내에 Shift+Z 가 없다').toContain('Shift+Z');
  });
});
