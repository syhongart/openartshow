// world2/avatars/types.ts — 거리를 걷는 것의 계약. **외부 의존 0.**
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"월드원이 있는 폴더에 있는 거 그냥 끌어다 쓰지 말고… 결국에는 월드투로 갈 거니까
// 월드투에 맞게 파일 정리를 좀 잘 해놔. 나중에 그쪽을 다 날릴 거니까."*
//
// 그 전까지 `features/npc.ts`가 `../../chibi.js`를 직접 잡고 있었다. world1 폴더를
// 지우는 순간 world2 가 함께 죽는 구조다. 감독이 지적한 것이 정확히 이 줄이다.
//
// ── 무엇을 world2 가 소유하는가 ─────────────────────────────────────────────
// **계약**이다. "거리를 걷는 것" 이 무엇인지는 world2 가 정하고, 그 자리에 무엇을
// 끼울지는 나중 문제로 남긴다. 치비든 VRM 이든 아직 없는 무엇이든, 이 세 가지만
// 지키면 걷기 코드가 종류를 몰라도 된다.
//
// 이 파일이 아무것도 import 하지 않는 것이 요점이다. 계약이 남의 것을 참조하면
// 그 남의 것을 지울 때 계약도 함께 무너진다.

/**
 * 거리를 걷는 아바타.
 *
 * 타입을 `THREE.Object3D` 로 적지 않고 **필요한 모양만** 적는다. 이유가 둘이다:
 *
 *   · `three` 와 `three/webgpu` 가 서로 다른 타입 네임스페이스를 내놓고, 둘 다
 *     `Object3D` 를 타입으로 재수출하지 않는다(TS2694 — 이 저장소에서 세 번 겪었다).
 *   · 계약이 three 를 모르면 테스트에서 스텁으로 갈아 끼우기 쉽다.
 */
export interface AvatarObject {
  position: { set(x: number, y: number, z: number): void };
  rotation: { y: number };
  visible: boolean;
  removeFromParent(): void;
  /**
   * 하위 객체를 훑는다. `THREE.Object3D` 가 이 모양이다.
   *
   * 걷기에는 필요 없지만 **GPU 업로드 예열**에 필요하다 — 아바타의 메시들에 손을
   * 뻗어야 하는 유일한 지점이라, 계약에 넣는 대신 여기 하나만 연다.
   */
  traverse(fn: (o: unknown) => void): void;
}

export interface WalkAvatar {
  /** 씬에 붙일 것 */
  readonly group: AvatarObject;
  /**
   * 한 프레임 진행.
   *
   * `speed` 는 **지금 걷는 속도(m/s)** 다. 0 이면 서 있는 것이고, 구현은 이 값으로
   * 걸음 애니메이션의 빠르기와 세기를 정한다. "걷는 중인가" 같은 불리언이 아니라
   * 속도를 주는 이유는, 천천히 걷는 것과 빨리 걷는 것을 구현이 구분할 수 있어야
   * 하기 때문이다.
   */
  update(dt: number, speed: number): void;
  /** 지오·재질·텍스처를 반납한다 */
  dispose(): void;
}

/** 비용 실측 — 진단에 싣는다. 아바타를 갈아 끼울 때 무엇이 무거워졌는지 보이게 한다 */
export interface AvatarCost {
  meshes: number;
  materials: number;
  triangles: number;
}
