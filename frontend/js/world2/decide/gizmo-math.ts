// world2/decide/gizmo-math.ts — 기즈모의 **산술만**. three 를 import 하지 않는다.
//
// ── 왜 자작인가 (팀장 판정 2026-08-13) ──────────────────────────────────────
// 감독 지시: *"설치 후 이동 회전 확대축소하게 해줘. 블렌더에서 가능하잖아. 기즈모 나오고."*
// three 의 `TransformControls` 를 쓸지 자작할지를 상신했고 **(c) 자작** 으로 판정됐다.
// 근거 셋을 그대로 옮긴다:
//   ① WebGPU 실기기 검증 축이 이 환경에 **0** 인 이상, 유일한 위험 통제는 «실기기에서
//      이미 도는 것으로 확인된 수단» 만 쓰는 것이다 — `MeshBasicMaterial`+`RingGeometry`
//      는 그 수단이고 외부 1000행은 미지다. PR #169(`anisotropy` 파이프라인 무효화)가
//      정확히 그 사각의 실증이다.
//   ② `TransformControls` 는 산술·렌더·이벤트가 한 덩어리라 이 저장소가 강제하는
//      판정(순수)/집행(three) 분리에 **테스트 축을 붙일 자리가 없다.**
//   ③ 자작만 청크 화이트리스트 — 번들 격리라는 되돌리기 비싼 경계 — 를 안 건드린다.
//
// ⚠ **재론 조건 (팀장 조건 3)**: **감독이 조작감을 반려하면 (b) vendor 복사
// (`TransformControls` 를 들여와 import 경로만 `three/webgpu` 로)로 전환한다.** 그 전환이
// 성립하는 근거는 실측돼 있다 — three r171 부터 `three.module.js` 와 `three.webgpu.js` 가
// 둘 다 `three.core.js` 를 import 해서 `Object3D`·`Vector3` 가 **동일**하고, `vite.config.js`
// 도 코어를 별도 청크로 가른다. 즉 «three 가 두 벌 올라간다» 는 위험은 없다. 이 문장을
// 안 적어 두면 다음 사람이 같은 분기를 처음부터 다시 돈다.
//
// ── 여기 있는 것과 없는 것 ──────────────────────────────────────────────────
// **있다**: 광선과 축선의 최근접, 광선과 평면의 교차각, 화면 크기 보정 배율.
// **없다**: 히트 판정(three 의 `Raycaster` 가 메시로 한다) · 메시 생성 · 이벤트.
//
// 이 분리가 지키는 것은 «드래그가 물건을 얼마나 움직이는가» 를 브라우저 없이 시험할 수
// 있다는 것이다. 그러나 **그것만으로는 부족하다**(팀장 조건 1) — 계산된 값이 집행 쪽에서
// 실제로 소비되는지는 양쪽 단위 테스트 어디에도 안 걸린다. 경계 통합 테스트가 짝이다.

/** 광선 하나. `dir` 은 정규화돼 있다고 가정한다(three 의 `Raycaster` 가 그렇게 준다) */
export interface Ray3 {
  ox: number; oy: number; oz: number;
  dx: number; dy: number; dz: number;
}

export type Axis = 'x' | 'y' | 'z';

/** 축 이름 → 단위 벡터. 세 곳에서 쓰므로 여기 한 곳에 둔다 */
export const AXIS_DIR: Record<Axis, readonly [number, number, number]> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};

/**
 * 두 직선이 «거의 평행» 인지 가르는 분모 하한.
 *
 * 광선이 축과 나란해지면 최근접점이 축 위 어디로든 튄다 — 그 순간 물건이 화면 밖으로
 * 날아간다. 값 자체보다 **막는다는 사실**이 중요하고, 1e-6 은 배정밀도에서 «두 방향이
 * 거의 같다» 를 뜻하는 관례적 하한이다. 실기기에서 이 경계가 체감되면 그때 올린다.
 */
const PARALLEL_EPS = 1e-6;

/**
 * 광선과 **축선**(점 `a` 를 지나고 방향 `n` 인 직선)의 최근접점을, 축 위 파라미터 `u` 로.
 *
 * 이동 기즈모의 핵심이다. 마우스는 화면 위 2D 인데 물건은 축을 따라 1D 로만 움직여야
 * 하므로, «광선이 축의 어디를 가리키는가» 를 하나의 수로 환원한다. 프레임마다 그 수의
 * **차이**를 쓰면 (드래그 시작점을 붙잡은 채) 손가락과 물건이 어긋나지 않는다.
 *
 * 두 직선이 평행에 가까우면 `null` — 부르는 쪽이 그 프레임을 건너뛴다.
 */
export function closestOnAxis(
  ray: Ray3,
  a: readonly [number, number, number],
  n: readonly [number, number, number],
): number | null {
  const rx = ray.ox - a[0], ry = ray.oy - a[1], rz = ray.oz - a[2];
  const d1d1 = ray.dx * ray.dx + ray.dy * ray.dy + ray.dz * ray.dz;
  const d1d2 = ray.dx * n[0] + ray.dy * n[1] + ray.dz * n[2];
  const d2d2 = n[0] * n[0] + n[1] * n[1] + n[2] * n[2];
  const d1r = ray.dx * rx + ray.dy * ry + ray.dz * rz;
  const d2r = n[0] * rx + n[1] * ry + n[2] * rz;

  const denom = d1d1 * d2d2 - d1d2 * d1d2;
  if (Math.abs(denom) < PARALLEL_EPS) return null;
  // ⚠ **분자의 부호를 뒤집어 적었다가 테스트가 잡았다**(2026-08-13, 구현 직후).
  // `(d1d2 * d1r - d1d1 * d2r)` 는 부호가 반대라, 축을 오른쪽으로 끌면 물건이 왼쪽으로
  // 가고 크기 핸들은 바깥으로 끌수록 작아졌다. 화면 없이 잡힌 이유는 순수 함수라
  // «수직으로 내려꽂는 광선은 자기 x 를 가리킨다» 를 **수로** 단언할 수 있었기 때문이다 —
  // 이 계층을 가른 것의 값이 여기서 났다.
  return (d1d1 * d2r - d1d2 * d1r) / denom;
}

/**
 * 광선이 **수평면**(y = `planeY`)과 만나는 점의, `cx`·`cz` 기준 방위각(라디안).
 *
 * 회전 기즈모(수평 링)가 쓴다. 프레임마다 각도의 **차이**를 물건의 `ry` 에 더한다.
 *
 * 광선이 평면과 만나지 않거나(평행·반대 방향) 중심에 너무 가까우면 `null` 이다 —
 * 중심 근처에서는 각도가 미세한 손떨림에 통째로 뒤집힌다.
 */
export function ringAngle(
  ray: Ray3,
  cx: number, cz: number, planeY: number,
  /** 중심에서 이 거리 안이면 각도를 신뢰하지 않는다(m) */
  minRadius = 0.05,
): number | null {
  if (Math.abs(ray.dy) < PARALLEL_EPS) return null;
  const t = (planeY - ray.oy) / ray.dy;
  if (t <= 0) return null; // 카메라 뒤
  const px = ray.ox + ray.dx * t;
  const pz = ray.oz + ray.dz * t;
  const ux = px - cx, uz = pz - cz;
  if (Math.hypot(ux, uz) < minRadius) return null;
  // `atan2(x, z)` 순서다 — 이 저장소의 `ry` 는 **Y축 회전**이라 z 가 기준축이다.
  return Math.atan2(ux, uz);
}

/**
 * 두 각도의 차이를 **−π..π** 로 접는다.
 *
 * 이게 없으면 링을 돌리다 ±π 를 넘는 순간 물건이 한 바퀴 되감긴다 — 각도를 그냥 빼면
 * 차이가 2π 에 가까운 값으로 나오기 때문이다. 드래그는 «짧은 쪽» 으로 도는 것이 언제나
 * 옳다(한 프레임에 반 바퀴 이상 돌릴 수는 없다).
 */
export function angleDelta(from: number, to: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * 기즈모를 **화면에서 일정한 크기**로 보이게 하는 배율.
 *
 * 안 하면 멀리 있는 물건의 기즈모가 점이 되어 못 집고, 코앞의 것은 화면을 덮는다.
 * 원근 카메라에서 화면 크기는 거리에 반비례하므로 거리에 비례해 키우면 상쇄된다.
 *
 * `k` 는 «화면에서 이만큼» 을 정하는 노브다 — 값 판정은 감독 화면에서만 난다(팀장 조건 2).
 */
export function gizmoScale(
  camX: number, camY: number, camZ: number,
  gx: number, gy: number, gz: number,
  k: number,
): number {
  const dist = Math.hypot(camX - gx, camY - gy, camZ - gz);
  // 카메라가 물건 안에 있으면 0 이 되어 기즈모가 사라진다 — 하한을 둔다.
  return Math.max(0.05, dist * k);
}

/**
 * 크기 핸들의 드래그를 **배수**로.
 *
 * 축 파라미터의 차이를 그대로 스케일에 더하면 멀리서 잡았을 때 한 번에 수십 배가 된다.
 * 기즈모 자체가 거리에 비례해 커지므로(위 `gizmoScale`) **그 크기로 나눠** 화면 기준의
 * 상대 이동으로 환산한다. 그러면 가까이서든 멀리서든 «같은 손 이동 = 같은 배율» 이다.
 */
export function scaleFactorFromDrag(deltaU: number, gizmoSize: number, sensitivity = 1): number {
  if (!(gizmoSize > 0)) return 1;
  const f = 1 + (deltaU / gizmoSize) * sensitivity;
  // 0 이하로 뒤집히면 물건이 뒤집힌 채 사라진다 — 부르는 쪽의 `scaleBy` 가 최종 상·하한을
  // 소유하지만, 여기서 음수·0 을 먼저 막아 그 함수에 이상한 값이 들어가지 않게 한다.
  return Math.max(0.01, f);
}
