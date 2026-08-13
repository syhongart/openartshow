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

import type { OverlayEntry } from './types.js';

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
    intersectObjects(objs: unknown[], recursive: boolean): { object: unknown }[];
  };
  Mesh: new (g: unknown, m: unknown) => {
    position: { set(x: number, y: number, z: number): void };
    rotation: { x: number };
    scale: { setScalar(s: number): void };
    visible: boolean;
    renderOrder: number;
  };
  RingGeometry: new (inner: number, outer: number, seg: number) => { dispose?(): void };
  MeshBasicMaterial: new (p: Record<string, unknown>) => { dispose?(): void };
  Box3: new () => { min: XYZ; max: XYZ; setFromObject(o: never): unknown };
  DoubleSide: number;
};

/** 편집 세션이 들고 있는 전부. 모듈들이 **같은 객체**를 본다. */
export interface EditState {
  selected: OverlayEntry | null;
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
