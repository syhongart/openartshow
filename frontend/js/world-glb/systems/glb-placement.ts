// world-glb/systems/glb-placement.ts — **낱개 메시와 인스턴스를 같은 것으로 다룬다.**
//
// ── 왜 (팀장 판정 (B), 2026-08-28) ──────────────────────────────────────────
// GLB 는 같은 배치를 두 방식으로 실어 온다:
//   ① 낱개 `Mesh` 하나씩 (glTF 코어 — 우리 내보내기가 내는 형태)
//   ② `InstancedMesh` 한 벌 + 인스턴스 행렬 (`EXT_mesh_gpu_instancing`)
//
// **world7 은 임의 GLB 를 받으므로 둘 다, 그리고 섞인 것도 들어온다.** 그런데 후처리
// (그림자 띄움·크기 복원)는 전부 ①만 전제하고 노드 속성(`position`·`scale`·`rotation`)을
// 직접 만지고 있었다. ②에서는 그 값이 **인스턴스 행렬 안**에 있어서:
//   · 노드를 만지면 그 노드의 인스턴스가 **전부 같이** 움직인다(하나만 고칠 수 없다)
//   · 진단 카운트가 노드 수만 세어 「8,625개 중 8개」 같은 거짓이 나온다
//
// 그래서 **행렬 한 벌 = 배치 하나**로 정규화한다. 소비자는 낱개인지 인스턴스인지 모른다.
//
// ⚠ **`commit()` 을 안 부르면 수정이 사라진다.** 인스턴스 쪽은 임시 객체에 분해해 주므로
// 되쓰기가 필요하다. 낱개 쪽도 `updateMatrix()` 가 필요해 같은 자리에 뒀다 — 두 경로가
// 다르게 생겼으면 소비자가 분기를 알아야 하고, 그러면 정규화한 의미가 없다.
//
// ⚠⚠ **읽기 전용 순회는 `commit()` 없이 쓴다**(캐스터 색인 등). 그때는 비용이 분해뿐이다.

/** three 에서 쓰는 것만 — 이 파일은 백엔드(webgl/webgpu)를 모른다 */
export interface ThreeMath {
  Matrix4: new () => Matrix4Like;
  Vector3: new () => Vec3;
  Quaternion: new () => QuatLike;
  Euler: new () => EulerLike;
}
interface Vec3 { x: number; y: number; z: number; }
interface QuatLike { setFromEuler(e: EulerLike): unknown; }
interface EulerLike { x: number; y: number; z: number; setFromQuaternion(q: QuatLike): unknown; }
interface Matrix4Like {
  elements: ArrayLike<number>;
  decompose(p: Vec3, q: QuatLike, s: Vec3): unknown;
  compose(p: Vec3, q: QuatLike, s: Vec3): unknown;
}

/**
 * 이 행렬이 y 축을 얼마나 늘리는가 — 두 번째 열의 길이.
 *
 * ⚠ **왜 필요한가**: `position.y += 0.02` 같은 이동은 **그 좌표계 기준**이다. 부모에
 * 스케일이 있으면 월드에서 그만큼 왜곡된다(부모 1.5배면 0.02 가 0.03 이 된다). 원본
 * 자산은 그룹 노드 21개가 변환을 안 가져서(실측) **우연히** 안전했고, 그래서 이 결함이
 * 오래 안 보였다 — **임의 GLB 를 받는 world7 에서는 안 그렇다.**
 */
function scaleY(m: Matrix4Like): number {
  const e = m.elements;
  const len = Math.hypot(e[4] as number, e[5] as number, e[6] as number);
  return len > 1e-9 ? len : 1;
}

interface MeshLike {
  isMesh?: boolean;
  parent?: { matrixWorld?: Matrix4Like } | null;
  matrixWorld?: Matrix4Like;
  isInstancedMesh?: boolean;
  count?: number;
  name?: string;
  material?: unknown;
  geometry?: unknown;
  position: Vec3;
  scale: Vec3;
  rotation: { y: number };
  updateMatrix(): void;
  getMatrixAt?(i: number, m: Matrix4Like): void;
  setMatrixAt?(i: number, m: Matrix4Like): void;
  instanceMatrix?: { needsUpdate: boolean };
}

/** 배치 하나 — 낱개 메시든 인스턴스든 소비자에게는 같아 보인다 */
export interface Placement {
  /** 첫 재질(배열이면 [0]). 판정은 대개 재질 이름으로 한다 */
  readonly material: { name?: string } | undefined;
  readonly geometry: unknown;
  /** 노드 이름 — 인스턴스면 그 묶음의 이름이다(개별 이름은 GLB 에 없다) */
  readonly name: string | undefined;
  /** 읽고 **쓸 수 있다**. 쓴 뒤 `commit()` 을 불러야 반영된다 */
  readonly position: Vec3;
  readonly scale: Vec3;
  readonly rotation: { y: number };
  /** 인스턴스면 true — 소비자가 굳이 알 필요는 없지만 진단에 쓴다 */
  readonly instanced: boolean;
  /**
   * **월드 기준으로 y 를 움직인다.** `position.y += d` 를 직접 쓰면 부모 스케일만큼
   * 왜곡되므로(위 `scaleY` 주석) 이동은 이 문을 통한다. `commit()` 은 따로 불러야 한다.
   */
  liftY(worldDelta: number): void;
  commit(): void;
}

const first = (m: unknown): { name?: string } | undefined =>
  (Array.isArray(m) ? m[0] : m) as { name?: string } | undefined;

/**
 * 배치를 하나씩 넘긴다. **낱개와 인스턴스를 구별하지 않는다.**
 *
 * ⚠ 넘기는 `Placement` 는 **재사용된다**(인스턴스 경로에서 임시 객체를 돌려 쓴다).
 * 보관하려면 값을 복사해라 — 참조를 모아두면 마지막 값만 남는다.
 */
export function eachPlacement(
  root: { traverse(f: (o: MeshLike) => void): void },
  THREE: ThreeMath,
  fn: (p: Placement) => void,
): void {
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const eul = new THREE.Euler();

  // 월드 스케일을 읽으려면 최신이어야 한다.
  (root as { updateMatrixWorld?(f: boolean): void }).updateMatrixWorld?.(true);

  root.traverse((o) => {
    if (!o.isMesh) return;

    if (!o.isInstancedMesh) {
      // 낱개의 `position` 은 **부모 좌표계**다 — 부모의 월드 스케일로 나눈다.
      const k = o.parent?.matrixWorld ? scaleY(o.parent.matrixWorld) : 1;
      fn({
        material: first(o.material), geometry: o.geometry, name: o.name,
        position: o.position, scale: o.scale, rotation: o.rotation,
        instanced: false,
        liftY: (d) => { o.position.y += d / k; },
        commit: () => o.updateMatrix(),
      });
      return;
    }

    const n = o.count ?? 0;
    if (!o.getMatrixAt || !o.setMatrixAt) return;
    // 인스턴스 행렬은 **노드 좌표계**다 — 노드 자신의 월드 스케일로 나눈다.
    const kx = o.matrixWorld ? scaleY(o.matrixWorld) : 1;
    // 인스턴스 rotation 은 y 만 노출한다 — 소비자(그림자 규약)가 y 만 쓴다.
    // ⚠ x·z 회전이 있는 인스턴스는 `commit()` 에서 **그 값이 보존된다**(아래 `eul` 재사용).
    const rot = { y: 0 };
    // 지금 몇 번째 인스턴스인지 — `commit()` 이 이 값을 보고 되쓴다. 클로저에 두는 이유는
    // `Placement` 표면에 인스턴스 개념을 새지 않게 하기 위해서다(소비자는 몰라야 한다).
    let idx = 0;
    const view: Placement = {
      material: first(o.material), geometry: o.geometry, name: o.name,
      position: pos, scale: scl, rotation: rot, instanced: true,
      liftY: (d) => { pos.y += d / kx; },
      commit: () => {
        eul.y = rot.y;
        quat.setFromEuler(eul);
        m.compose(pos, quat, scl);
        o.setMatrixAt!(idx, m);
        o.instanceMatrix!.needsUpdate = true;
      },
    };
    for (let i = 0; i < n; i++) {
      idx = i;
      o.getMatrixAt(i, m);
      m.decompose(pos, quat, scl);
      eul.setFromQuaternion(quat);
      rot.y = eul.y;
      fn(view);
    }
  });
}
