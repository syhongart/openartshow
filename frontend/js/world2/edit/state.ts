// world2/edit/state.ts — 편집 세션의 **가변 상태와 조작 단위**. DOM·three 를 안 만진다.
//
// ── 왜 상태를 한 곳에 모으나 ────────────────────────────────────────────────
// 분해 전에는 이 값들이 `startEditMode` 의 지역 변수였고, 그래서 **그 함수를 가르는
// 순간 값이 따라갈 곳이 없었다.** 파일을 나누려면 «누가 이 값을 쥐는가» 를 먼저 정해야
// 한다 — 그것이 이 파일이다.
//
// **가변 객체 하나를 공유한다.** 각 모듈에 값을 복사해 넘기지 않는다 — 복사하면
// `selected` 를 바꾼 쪽과 읽는 쪽이 갈라지고, 그 어긋남은 «클릭했는데 패널이 옛 것을
// 보여준다» 같은 형태로만 드러난다(화면에서만 보이는 결함이 이 저장소에서 가장 비쌌다).
//
// ⚠ **이 파일은 «동작 변경 0» 분해의 일부다.** 값도 의미도 분해 전과 같아야 한다 —
// 여기서 상수를 손보고 싶어지면 그것은 별도 커밋이다.

import type { OverlayEntry, OverlayHost, VillagePick } from './types.js';
import { overlayTarget, villageTarget, type EditTarget } from './target.js';
import type { ModalState, Pose } from '../decide/modal-edit.js';

/** 회전 한 번. 24등분이라 세 번이면 45°, 여섯 번이면 90° 다. */
export const RY_STEP = Math.PI / 12;
/** 크기 한 번(배수). 계약의 `S_MIN`·`S_MAX` 가 상·하한을 소유한다 */
export const S_STEP = 1.15;
/** 높이 한 번(m) */
export const Y_STEP = 0.25;
/** 지면 스냅 격자(m). 0 이면 자유 배치 */
export const SNAP = 0.5;

type XYZ = { x: number; y: number; z: number };

/**
 * 동적 import 로 받은 `three/webgpu` 중 **편집이 실제로 쓰는 것만** 적은 구조 타입.
 *
 * 왜 `typeof import('three/webgpu')` 가 아닌가: 그러면 이 모듈이 three 를 정적으로
 * 가리키게 되고, 편집 코드가 기본 번들에 끌려 들어갈 여지가 생긴다. 편집은 소비자가
 * 넘겨준 네임스페이스를 쓸 뿐 스스로 import 하지 않는다(`types.ts` 의 `THREE: unknown`).
 */
export type ThreeNS = {
  Raycaster: new () => {
    ray: { origin: XYZ; direction: XYZ };
    setFromCamera(coords: { x: number; y: number }, cam: unknown): void;
    // `instanceId` 는 `InstancedMesh` 를 맞혔을 때만 온다 — 그래서 선택 필드다.
    // 이것이 없으면 마을 파츠를 «몇 번째 인스턴스인가» 로 환원할 방법이 없다.
    intersectObjects(objs: unknown[], recursive: boolean): { object: unknown; instanceId?: number }[];
  };
  /** 맞힌 인스턴스의 자세를 읽는다. 편집은 **이동 성분만** 본다(`elements[12..14]`) */
  Matrix4: new () => { elements: ArrayLike<number> };
  Mesh: new (g: unknown, m: unknown) => StubMesh;
  Group: new () => StubGroup;
  RingGeometry: new (inner: number, outer: number, seg: number) => Disposable;
  BoxGeometry: new (w: number, h: number, d: number) => Disposable;
  CylinderGeometry: new (rt: number, rb: number, h: number, seg: number) => Disposable;
  ConeGeometry: new (r: number, h: number, seg: number) => Disposable;
  MeshBasicMaterial: new (p: Record<string, unknown>) => Disposable;
  Box3: new () => { min: XYZ; max: XYZ; setFromObject(o: never): unknown };
  DoubleSide: number;
};

export type Disposable = { dispose?(): void };

/**
 * three 의 `Mesh` 중 편집이 실제로 만지는 것만.
 *
 * ⚠ **필드를 늘리면 테스트 스텁도 늘려야 한다** — 구조 타입이라 빠진 필드가 곧 컴파일
 * 에러다. 그것이 이 타입의 값이기도 하다: 편집이 three 의 무엇에 기대고 있는지가 한
 * 곳에 적혀 있어서, 스텁으로 실제 코드를 돌리는 행위 테스트가 성립한다.
 */
export type StubMesh = {
  position: { x: number; y: number; z: number; set(x: number, y: number, z: number): void };
  rotation: { x: number; y: number; z: number };
  scale: { setScalar(s: number): void; set(x: number, y: number, z: number): void };
  visible: boolean;
  renderOrder: number;
  /** 어느 핸들인가를 여기 적는다 — 레이캐스트가 맞힌 메시에서 되찾는다 */
  userData: Record<string, unknown>;
};

export type StubGroup = {
  position: { set(x: number, y: number, z: number): void };
  rotation: { x: number; y: number; z: number };
  scale: { setScalar(s: number): void };
  visible: boolean;
  children: unknown[];
  add(o: never): void;
  remove(o: never): void;
};

/** 편집 세션이 들고 있는 전부. 모듈들이 **같은 객체**를 본다. */
export interface EditState {
  selected: OverlayEntry | null;
  /**
   * 고른 **마을 파츠**. `selected` 와 **동시에 채워지지 않는다** — 선택은 하나다.
   *
   * ⚠ 이 주석은 ②-c 에서 *"한 칸에 합치려면 공통 인터페이스를 먼저 정해야 한다"* 로
   * 끝났다. ②-d 가 그 인터페이스를 만들었다(`target.ts` 의 `EditTarget`) — 다만 **이
   * 칸은 남는다.** 어댑터는 «미는 다섯 값» 만 알고, «무엇을 골랐나»(파셀 좌표·인덱스·
   * 손본 구역인가)는 화면이 말해야 하는 별개 정보이기 때문이다.
   *
   * **불변식: 둘 중 최대 하나만 채워진다.** 채우는 자리는 `select()` **하나**이고,
   * 그것을 테스트가 본다(둘 다 채워지면 링과 패널이 서로 다른 것을 가리킨다).
   */
  villageSel: VillagePick | null;
  /**
   * 지금 고른 것의 **조작 어댑터**. 기즈모·수치칸·조작 버튼이 이것만 본다.
   *
   * 위 두 칸과 **함께 움직인다** — 어긋나면 «패널은 건물을 말하는데 기즈모는 GLB 를
   * 민다» 가 된다. 그래서 셋을 바꾸는 자리를 `select()` **하나로 좁혔다**(아래).
   * 다른 곳에서 `st.selected = …` 를 직접 쓰면 그 순간 불변식이 깨진다.
   */
  target: EditTarget | null;
  /**
   * 진행 중인 **블렌더식 모달 조작**(G/R/S). `null` 이면 조작 중이 아니다.
   *
   * 짝인 `modalFrom` 과 **함께 움직인다** — 상태만 있고 스냅샷이 없으면 취소가
   * 불가능하고, 스냅샷만 있고 상태가 없으면 되돌릴 계기가 없다.
   */
  modal: ModalState | null;
  /**
   * 조작을 시작한 순간의 자세. **취소가 여기로 되돌린다.**
   *
   * 매 프레임 «직전 값에 더하기» 로 만들면 되돌릴 원본이 없다 — 언제나 이것에
   * 델타를 더해 현재 값을 만든다(근거는 `decide/modal-edit.ts` 헤더).
   */
  modalFrom: Pose | null;
  pendingSrc: string | null;
  dragging: OverlayEntry | null;
  dragPlaneY: number;
  orbiting: boolean;
  snapOn: boolean;
  /** 내보내기 2단 클릭 — 손실이 있으면 1차는 저장하지 않는다 */
  armed: boolean;
  /**
   * GLB 를 받는 중인가. **받는 동안 새 배치를 받지 않는다.**
   *
   * 왜 잠그나 (감독 신고 2026-08-12 *"완전히 굳어 탭을 닫아야 했다"*): 진행 표시가 없던
   * 시절엔 눌러도 화면이 그대로라 «안 먹었나» 하고 다시 누르게 된다. 그러면 12.9MB 자산이
   * 여러 벌 동시에 파싱되고 각각이 붙는 순간 프레임이 멈춘다 — 한 번의 히칭이 아니라
   * **누적**이 탭을 죽였다. 진행 표시(`actions.ts` 의 `placeAt`)와 이 잠금은 **짝이다**:
   * 표시만 있고 잠금이 없으면 조급한 연타가 그대로 통과하고, 잠금만 있고 표시가 없으면
   * 잠긴 것이 멈춘 것과 구별되지 않는다.
   */
  busy: boolean;
  /**
   * 편집 모드인가. **기본은 주행이다** (감독 신고 2026-08-12).
   *
   * 처음엔 `?edit=1` 이 곧 편집 모드 상시 켜짐이었고, 그것이 **주행을 통째로 죽였다.**
   * 편집 리스너가 캔버스 클릭을 캡처 단계에서 끊으므로 `main.ts` 의 포인터락 요청이
   * 영영 안 불리고, `main.ts` 의 `onMove` 는 `pointerLockElement === canvas` 일 때만
   * `player.look()` 을 부른다 → **마우스를 움직여도 시점이 안 돈다.**
   *
   * 감독 신고: *"저 위에 링크 클릭하면 마우스 터치, 키보드 동작안해."*
   *
   * ⚠ **검증이 이것을 놓친 방식이 핵심이다.** 나는 *"포인터락 미발생 = PASS"* 로 쟀다.
   * 감독에게 그것은 성공이 아니라 *"화면이 안 돌아간다"* 였다. 값이 아니라 **재는 축이
   * 틀렸다** — 그래서 지금은 두 축을 함께 건다(주행 중엔 걸리고, 편집 중엔 안 걸린다).
   *
   * 그래서 뒤집는다: `?edit=1` 은 *"편집 도구를 쓸 수 있게 한다"* 만 뜻하고 부팅 직후는
   * **주행 모드**다(리스너를 아예 안 붙인다 = 라이브와 동일). 편집은 버튼·`Tab` 으로 켠다.
   */
  editing: boolean;
}

export function createEditState(): EditState {
  return {
    selected: null,
    villageSel: null,
    target: null,
    modal: null,
    modalFrom: null,
    pendingSrc: null,
    dragging: null,
    dragPlaneY: 0,
    orbiting: false,
    snapOn: true,
    armed: false,
    busy: false,
    editing: false,
  };
}

/**
 * 선택을 바꾸는 **유일한 자리.** 세 칸(`selected`·`villageSel`·`target`)이 함께 움직인다.
 *
 * ── 왜 함수로 좁히나 ────────────────────────────────────────────────────────
 * 칸이 셋인데 대입이 여섯 파일에 흩어져 있으면, 새 경로가 하나 생길 때마다 «세 개 다
 * 썼는가» 를 사람이 기억해야 한다. 이 저장소는 그 형태로 이미 데였다 — 분해 회차의
 * M5 뮤테이션(«state 두 벌»)이 정확히 «패널이 보는 것과 조작이 바꾸는 것이 갈린다» 였다.
 *
 * **선택은 하나다**: 오버레이를 고르면 마을 선택이 풀리고, 반대도 같다.
 *
 * ⚠ 마을 어댑터는 `null` 을 낼 수 있다(문이 닫혔다·인덱스가 배열 밖·종류 불일치).
 * 그때는 **아무것도 안 고른 것**으로 떨어진다 — 표시만 남기고 조작이 안 되는 상태를
 * 만들지 않는다. 그 상태가 정확히 «골랐는데 아무것도 안 먹는다» 이기 때문이다.
 */
export function select(
  st: EditState,
  host: OverlayHost,
  what: { entry: OverlayEntry } | { village: VillagePick } | null,
): void {
  // ⚠ **선택이 바뀌면 진행 중 모달은 끝난다.** 안 끝내면 옛 대상의 스냅샷을 든 채
  // 새 대상을 밀게 되고, 취소하면 **새 대상이 옛 대상의 자리로 튄다.**
  st.modal = null;
  st.modalFrom = null;
  if (what && 'entry' in what) {
    st.selected = what.entry;
    st.villageSel = null;
    st.target = overlayTarget(host, what.entry);
    return;
  }
  if (what && 'village' in what) {
    const t = villageTarget(host, what.village);
    st.selected = null;
    st.villageSel = t ? what.village : null;
    st.target = t;
    return;
  }
  st.selected = null;
  st.villageSel = null;
  st.target = null;
}
