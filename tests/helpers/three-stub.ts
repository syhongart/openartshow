// tests/helpers/three-stub.ts — 편집 모듈이 기대하는 three 의 **최소 대역**.
//
// ── 왜 공유 파일인가 ────────────────────────────────────────────────────────
// 편집 행위 테스트가 둘(`world2-edit-place` · `world2-edit-listeners`)이고 둘 다 같은
// 스텁을 필요로 한다. 각자 갖고 있으면 `ThreeNS` 가 늘 때마다 **한쪽만 고쳐도 아무도
// 모른다** — 이 저장소가 값 미러링으로 이미 세 번 데인 형태다. 늘어난 타입은 컴파일
// 에러로 드러나지만, 그것은 «둘 다 고쳤는가» 가 아니라 «각자 컴파일되는가» 만 보장한다.
//
// ⚠ 이 스텁이 재는 것은 **편집 코드의 흐름**이지 three 의 동작이 아니다. 실제 렌더·
// 레이캐스트 정확도·WebGPU 파이프라인은 여기서 하나도 안 재진다.

/** 스텁이 만든 광선. 테스트가 방향을 바꿔 하늘/지면을 가려 쏠 수 있다 */
export type StubRay = {
  origin: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
};

/**
 * 레이캐스트 한 건. `instanceId` 는 `InstancedMesh` 를 맞혔을 때만 온다.
 *
 * `point`·`face` 는 **벽 검출**(W8-4 D)이 쓴다. 실물 three 와 같은 성질을 갖게 둘 다
 * 선택 필드다 — `face` 는 Line·Points 를 맞히면 실제로 안 온다. **대역이 실물의 핵심
 * 성질을 안 가지면 그 축의 검출력은 0이다**(이 저장소가 뮤테이션으로 배운 것).
 *
 * ⚠ `face.normal` 은 실물에서 **로컬 좌표계**다. 그래서 `object.matrixWorld` 를 함께
 * 주지 않으면 「월드 변환을 했는가」를 잴 수 없다 — 테스트가 그것을 확인한다.
 */
export type StubHit = {
  object: unknown;
  instanceId?: number;
  point?: { x: number; y: number; z: number };
  face?: { normal: { x: number; y: number; z: number } } | null;
};

export interface ThreeStubOptions {
  /** 만들어진 광선이 여기 쌓인다 — 테스트가 방향을 바꿔 쓴다 */
  rays?: StubRay[];
  /**
   * 레이캐스트가 돌려줄 것. 매번 불린다(테스트가 도중에 바꿀 수 있게).
   *
   * **인자로 대상 목록을 받는다** — 편집은 광선을 두 곳에 쏜다(오버레이 루트의 자식들,
   * 그리고 마을 인스턴스 메시들). 목록을 안 보면 두 경로가 같은 히트를 받아서,
   * «마을을 집었다» 를 재려는 테스트가 오버레이 쪽에서 먼저 걸린다.
   */
  hits?: (objs: readonly unknown[]) => readonly StubHit[];
}

/**
 * `ThreeNS` 를 만족하는 스텁.
 *
 * 기하는 전부 «생성됐고 dispose 가능하다» 만 흉내낸다 — 편집 코드가 기하의 **내용**에
 * 의존하면 그때 이 스텁이 거짓말을 하게 되므로, 그런 의존이 생기면 여기가 아니라
 * 설계를 본다.
 */
export function makeThreeStub(opts: ThreeStubOptions = {}) {
  const { rays, hits } = opts;
  class Disposable { dispose(): void { } }

  return {
    Raycaster: class {
      // 위에서 아래로 쏜다 → y=0 평면 교차가 원점 근처에서 성립한다
      ray: StubRay = { origin: { x: 0, y: 10, z: 0 }, direction: { x: 0, y: -1, z: 0 } };
      constructor() { rays?.push(this.ray); }
      setFromCamera(): void { /* NDC 는 이 축에서 안 본다 */ }
      intersectObjects(objs: readonly unknown[]): readonly StubHit[] {
        return hits ? hits(objs) : [];
      }
    },
    Mesh: class {
      position = {
        x: 0, y: 0, z: 0,
        set(x: number, y: number, z: number): void { this.x = x; this.y = y; this.z = z; },
      };
      rotation = { x: 0, y: 0, z: 0 };
      scale = { setScalar(): void { }, set(): void { } };
      visible = false;
      renderOrder = 0;
      userData: Record<string, unknown> = {};
    },
    Group: class {
      position = { set(): void { } };
      rotation = { x: 0, y: 0, z: 0 };
      scale = { setScalar(): void { } };
      visible = false;
      children: unknown[] = [];
      add(o: never): void { this.children.push(o); }
      remove(o: never): void {
        const i = this.children.indexOf(o);
        if (i >= 0) this.children.splice(i, 1);
      }
    },
    RingGeometry: Disposable,
    BoxGeometry: Disposable,
    CylinderGeometry: Disposable,
    ConeGeometry: Disposable,
    MeshBasicMaterial: Disposable,
    // `min.x === Infinity` 는 «빈 상자» 표시다 — 마커 반지름이 기본값으로 간다
    Box3: class {
      min = { x: Infinity, y: Infinity, z: Infinity };
      max = { x: -Infinity, y: -Infinity, z: -Infinity };
      setFromObject(): void { }
    },
    // 편집은 **이동 성분만** 읽는다(`elements[12..14]`). 테스트가 인스턴스 위치를
    // 지정하려면 `getMatrixAt` 이 이 배열을 채우면 되므로, 여기서는 빈 4×4 단위행렬만
    // 준다 — 값은 맞힌 메시 쪽(테스트가 만든 가짜 인스턴스 메시)이 써 넣는다.
    Matrix4: class {
      elements: number[] = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    },
    DoubleSide: 2,
  };
}
