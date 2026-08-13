// world2/edit/types.ts — 편집 모드와 오버레이 소비자 사이의 경계.
//
// 왜 별도 파일인가: `features/overlay.ts` 는 `edit/mode.ts` 를 **동적 import** 하고
// (`?edit=1` 없는 세션이 편집 코드를 내려받지 않게), `edit/mode.ts` 는 소비자가 만든
// 씬을 만져야 한다. 타입을 한쪽에 두면 서로를 가리키게 되고, 그러면 순환 여부가
// "타입 전용이라 런타임엔 안 도는데 정적 검사는 뭐라고 볼까" 에 걸린다. 경계를 제3의
// 파일에 두면 그 질문이 아예 생기지 않는다.

import type { Object3D, Camera } from 'three/webgpu';
import type { PlacedPart } from '../parts/types.js';

/**
 * 로드 진행 알림.
 *
 * `pct` 가 **`null` 이면 총 용량을 모른다는 뜻**이다 — 그때는 퍼센트를 지어내지 않고
 * 받은 양만 말한다(`lab-glb.js:192-199` 가 세운 규약). 지어낸 퍼센트는 100%에서 멈춰
 * 있는 바가 되고, 그건 없느니만 못하다.
 */
export type LoadProgress = (pct: number | null, loadedBytes: number) => void;

/** 씬에 놓인 배치 하나. **가변이다** — 편집이 값을 바꾸고 `apply` 로 씬에 반영한다. */
export interface OverlayEntry {
  /** 세션 안에서만 유효한 식별자. 내보내기에는 안 나간다 */
  readonly id: number;
  readonly src: string;
  /**
   * 저장소에 **없는** 파일인가(드래그드롭한 것).
   *
   * 미리보기는 브라우저 임시 주소(`blob:`)로 로드된다 — 새로고침하면 사라지고, 내보낸
   * JSON 에는 파일명만 남는다. 감독이 그 GLB 를 따로 주셔야 배포에 붙는다. 화면이 그
   * 사실을 말해야 하므로 항목이 스스로 들고 있는다.
   */
  readonly preview: boolean;
  readonly holder: Object3D;
  x: number;
  y: number;
  z: number;
  ry: number;
  s: number;
}

/**
 * 편집이 **마을 인스턴스**에 닿는 좁은 문. `InstancePools` 가 그대로 만족한다.
 *
 * 풀 전체를 넘기지 않는 이유는 `SlotPool`(`parcel-builder.ts`)과 같다 — 편집이 슬롯을
 * 만들거나 반납할 수 있게 되면 개수 불변식의 집행 지점(`seal()`)이 뒷문으로 열린다.
 * 여기 있는 셋은 전부 **읽기**다.
 *
 * ⚠ `refreshBounds` 를 레이캐스트 **전에** 부르지 않으면 «멀리 있는 것이 가끔 안
 * 집힌다» 가 기본 동작이다. 이유와 실증은 `systems/instancing.ts` 의 그 메서드 한 곳이다.
 */
export interface VillageRaycast {
  /**
   * ⚠ `unknown[]` 인 것은 **의도**다. 여기에 `RaycastMesh` 를 요구하면 `InstancePools` 가
   * 구조적으로 불합격한다 — 그쪽이 `Object3D[]` 로 선언돼 있고 `getMatrixAt` 은
   * `InstancedMesh` 에만 있기 때문이다. 목록의 정적 타입을 좁히는 대신 **맞힌 것 하나를**
   * 좁힌다(아래 `RaycastMesh`). 실제로 그 시점에는 `instanceId` 가 왔다는 사실이
   * «이것은 인스턴스 메시다» 를 이미 말해 준다.
   */
  raycastTargets(): readonly unknown[];
  refreshBounds(): void;
  ownerAt(mesh: unknown, instanceId: number): { readonly key: string } | null;
}

/**
 * 레이캐스트가 **맞힌** 인스턴스 메시. 편집이 실제로 읽는 것만 적은 구조 타입.
 *
 * `getMatrixAt` 하나가 이 회차의 요점이다 — 맞힌 인스턴스의 **위치**가 나와야 그것을
 * 파셀·파츠로 되짚을 수 있다(`decide/village-pick.ts` 헤더).
 */
export interface RaycastMesh {
  getMatrixAt(index: number, target: { elements: ArrayLike<number> }): void;
}

/**
 * 편집이 **마을 배치**에 닿는 좁은 문. `VillageParcels`(`systems/village-parcels.ts`)가
 * 그대로 만족한다.
 *
 * ⚠ 지금은 읽기 하나뿐이다. 동결을 **거는** 문(`freeze`)은 아직 안 연다 — 쓰는 소비자가
 * 없는데 문을 미리 내면 «준비됨» 이 «충족됨» 으로 읽힌다(이 저장소가 계약 조건 c 에서
 * 정확히 그 형태로 한 번 데였다). 편집이 실제로 옮기기 시작할 때 함께 연다.
 */
export interface VillageRead {
  /** 그 파셀의 지금 배치(near 기준 전체). 동결이 있으면 그것, 없으면 계산값 */
  partsAt(px: number, pz: number): PlacedPart[];
  /** 이 파셀이 동결됐는가 — 화면이 «손본 구역» 임을 말해야 한다 */
  isFrozen(px: number, pz: number): boolean;
}

/**
 * 마을 파츠 하나를 가리키는 **세션 안의 이름**.
 *
 * ⚠ `index` 는 «그 순간의 배열에서 몇 번째» 다. 파셀을 동결하기 전까지 그 배열은 계산
 * 결과이므로 **밀도 노브가 바뀌면 다른 것을 가리킨다** — 계약(`decide/overlay.ts`)이
 * «파츠에는 이름이 없다» 로 길게 적은 그 문제다. 그래서 이 값을 저장하지 않는다.
 */
export interface VillagePick {
  readonly px: number;
  readonly pz: number;
  readonly index: number;
  readonly kind: string;
  /** 월드 좌표 — 선택 링을 놓는 자리 */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** 이미 손본 파셀인가 */
  readonly frozen: boolean;
}

/**
 * 편집이 씬에 닿는 유일한 통로. 소비자(`features/overlay.ts`)가 구현한다.
 *
 * 편집 모듈이 `env.scene` 을 직접 뒤지지 않게 하는 것이 요점이다 — 그러면 오버레이가
 * 아닌 것(하늘·지면·GLB)까지 집을 수 있다.
 *
 * ⚠ 이 문단은 오래 *"이번 회차의 편집 대상은 **오버레이 항목뿐**"* 으로 끝났고 **W4 에서
 * 거짓이 됐다** — 마을 파츠가 대상이 됐다. 다만 접근 방식은 그대로다: 씬을 뒤지는 대신
 * 좁은 문(`instances`·`village`)을 받는다.
 */
export interface OverlayHost {
  /** 동적 import 로 받아 둔 `three/webgpu` 네임스페이스. 편집이 또 import 하지 않는다 */
  readonly THREE: unknown;
  readonly camera: Camera;
  readonly canvas: HTMLElement;
  readonly doc: Document;
  readonly cellX: number;
  readonly cellZ: number;
  /** 레이캐스트 대상이 되는 루트. 자식이 곧 항목 holder 다 */
  readonly root: Object3D;
  /** 마을 인스턴스 레이캐스트. 없으면 마을 파츠를 집지 않는다(오버레이만) */
  readonly instances: VillageRaycast | null;
  /** 마을 배치 조회. 없으면 마을 파츠를 집지 않는다 */
  readonly village: VillageRead | null;

  entries(): readonly OverlayEntry[];
  /**
   * 배치한다. `blobUrl` 이 있으면 그 주소로 로드하고 항목을 `preview` 로 표시한다.
   * 로드 실패면 `null` — 사유는 `lastFailure()` 로 묻는다.
   */
  place(
    src: string,
    at: { x: number; y: number; z: number; ry?: number; s?: number },
    blobUrl?: string,
    onProgress?: LoadProgress,
  ): Promise<OverlayEntry | null>;
  /**
   * `place` 가 마지막으로 `null` 을 낸 이유.
   *
   * 왜 필요한가: 예전에는 화면이 *"콘솔의 진단을 보세요"* 라고 말했는데 이 경로에
   * `console.*` 호출이 **0건**이었다 — 감독이 콘솔을 열어도 아무것도 없다. 거짓 안내는
   * 안내가 아니라 막다른 길이다(검수관 지적, 2026-08-12).
   */
  lastFailure(): string | null;
  remove(e: OverlayEntry): void;
  /** 항목의 x·y·z·ry·s 를 씬에 반영한다 */
  apply(e: OverlayEntry): void;
  /** 지금 상태를 계약 원본(raw JSON) 으로. `validateOverlay` 에 그대로 넣는다 */
  toRaw(): unknown;
  /** 시점을 돌린다(편집 모드는 포인터락을 안 쓰므로 우클릭 드래그로 대신한다) */
  look(dx: number, dy: number): void;
  /** 그 자리에서 밟는 바닥 높이(m) */
  surfaceAt(x: number, z: number): number;
}

/** 편집 모드를 켠다. 반환값이 정리 핸들이다. */
export interface EditSession {
  dispose(): void;
}
