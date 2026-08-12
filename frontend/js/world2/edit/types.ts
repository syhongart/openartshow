// world2/edit/types.ts — 편집 모드와 오버레이 소비자 사이의 경계.
//
// 왜 별도 파일인가: `features/overlay.ts` 는 `edit/mode.ts` 를 **동적 import** 하고
// (`?edit=1` 없는 세션이 편집 코드를 내려받지 않게), `edit/mode.ts` 는 소비자가 만든
// 씬을 만져야 한다. 타입을 한쪽에 두면 서로를 가리키게 되고, 그러면 순환 여부가
// "타입 전용이라 런타임엔 안 도는데 정적 검사는 뭐라고 볼까" 에 걸린다. 경계를 제3의
// 파일에 두면 그 질문이 아예 생기지 않는다.

import type { Object3D, Camera } from 'three/webgpu';

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
 * 편집이 씬에 닿는 유일한 통로. 소비자(`features/overlay.ts`)가 구현한다.
 *
 * 편집 모듈이 `env.scene` 을 직접 뒤지지 않게 하는 것이 요점이다 — 그러면 오버레이가
 * 아닌 것(마을 파츠·하늘)까지 집을 수 있고, 그것은 개수 불변식과 좌표 결정론을 함께
 * 건드리는 경로다. 이번 회차의 편집 대상은 **오버레이 항목뿐**이다.
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

  entries(): readonly OverlayEntry[];
  /**
   * 배치한다. `blobUrl` 이 있으면 그 주소로 로드하고 항목을 `preview` 로 표시한다.
   * 로드 실패면 `null`(화면에 사유를 띄우는 것은 부르는 쪽 몫).
   */
  place(
    src: string,
    at: { x: number; y: number; z: number; ry?: number; s?: number },
    blobUrl?: string,
  ): Promise<OverlayEntry | null>;
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
