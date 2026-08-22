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

// ── 잡은 축 표시 (2026-08-22, 감독 지시) ──────────────────────────────────────
//
// 감독: *"기즈모? 선택되었을때 축별 어떤 것이 선택되었는지 표시가 필요해."*
//
// ⚠ **`edit/input.ts` 가 오래 *"기즈모는 잡은 축이 색으로 보이지만 모달은 아무것도 안
// 보인다"* 라고 적고 있었고, 그 문장이 이 회차 전까지 오해를 불렀다.** 실측(2026-08-22,
// 착수 직전): 축마다 색이 다른 것은 맞지만(X 빨강·Y 초록·Z 파랑) **잡았을 때 달라지는
// 것이 하나도 없었다** — `gizmo.ts` 전체에 `hover`·`highlight` 가 0건이었다.
// 「축마다 색이 다르다」와 「잡은 축이 표시된다」는 다른 일인데 한 문장이 둘 다인 것처럼
// 읽혔다. **이 회차가 그 문장을 참으로 만들었다**(검수관 권고 P6) — 이제 실제로 구별된다.
//
// ── 왜 판정을 여기 두는가 ────────────────────────────────────────────────────
// 「어느 파트가 활성인가」와 「그때 얼마나 밝은가」는 three 없이 답할 수 있고, 그러면
// 검사가 실제 코드를 돌린다. 집행(`gizmo.ts`)은 이 답을 재질에 꽂기만 한다.

/** 잡을 수 있는 것. **`edit/gizmo.ts` 가 이 타입을 재수출한다**(소비자 경로 유지) */
export type Handle =
  | { kind: 'move'; axis: Axis }
  | { kind: 'rotate' }
  | { kind: 'scale' };

/** 기즈모를 이루는 파트. 축 셋은 재질을 축마다 하나씩 공유한다 */
export type GizmoPart = Axis | 'rotate' | 'scale';

/**
 * 불투명도 셋.
 *
 * ⚠ **`IDLE` 은 기존 값이다**(`gizmo.ts` 의 `mat()` 이 0.95 로 만들어 왔다). 아무것도
 * 안 잡았을 때의 화면을 바꾸지 않는 것이 이 회차의 경계다 — 감독이 지목한 것은
 * 「잡았을 때」이고, 평상시 룩을 함께 건드리면 무엇이 달라졌는지가 흐려진다.
 *
 * `DIMMED` 는 **0 이 아니다.** 안 잡은 축을 완전히 지우면 「어느 방향으로 가고 있나」의
 * 기준이 사라져 오히려 방향 감각이 나빠진다 — 흐릿하게 남겨 축 셋의 배치를 유지한다.
 */
export const OPACITY_IDLE = 0.95;
export const OPACITY_ACTIVE = 1;
export const OPACITY_DIMMED = 0.22;

/** 활성 파트를 흰색 쪽으로 섞는 비율. 색상(빨강·초록·파랑)은 남기고 밝기만 올린다 */
export const EMPHASIS_MIX = 0.45;

/** 그 핸들이 건드리는 파트 */
export function partOf(h: Handle): GizmoPart {
  return h.kind === 'move' ? h.axis : h.kind;
}

/** 지금 잡은 것이 이 파트인가. 아무것도 안 잡았으면 전부 `false` */
export function isActivePart(active: Handle | null, part: GizmoPart): boolean {
  return active !== null && partOf(active) === part;
}

/**
 * 이 파트의 불투명도.
 *
 * **아무것도 안 잡았으면 전부 `IDLE`** — 그것이 「평상시 룩을 안 바꾼다」의 집행이다.
 */
export function partOpacity(active: Handle | null, part: GizmoPart): number {
  if (active === null) return OPACITY_IDLE;
  return isActivePart(active, part) ? OPACITY_ACTIVE : OPACITY_DIMMED;
}

/**
 * 활성이면 흰색 쪽으로 섞은 색, 아니면 원래 색.
 *
 * 채널마다 `c + (255 - c) · MIX` 다 — 곱셈이 아니라 **흰색까지 남은 거리의 비율**이라,
 * 이미 밝은 채널은 조금 오르고 어두운 채널이 많이 올라 **색상이 유지된 채 밝아진다**.
 *
 * ⚠ **첫 판본은 배수 방식의 실패를 *"빨강 축이 주황으로 보인다"* 라고 적었고 실측과
 * 달랐다**(검수관 권고 P2, 2026-08-22). 실제 축 색으로 재면 그 일은 **어느 색에서도
 * 안 일어난다.** 배수(×1.45)가 실제로 깨지는 곳은 셋이다:
 *
 *   `#dddddd`(크기 상자) → **`#ffffff` 순백으로 날아간다**(세 채널이 함께 상한에 붙는다)
 *   `#ffcc55`(회전 링)   → `#ffff7b` — 주황빛 노랑이 **순노랑으로 색상 이동**
 *   `#ff0000`(순수 원색) → **변화 0** — 이미 상한이라 강조가 아예 안 보인다
 *
 * 채택한 lerp 은 같은 색에서 `#ececec`·`#ffe3a2`·`#ff7373` 이다. **결론은 그대로이고
 * 근거만 실측으로 바뀌었다** — 「추측한 실패 형태」와 「실제 실패 형태」가 달랐다.
 */
export function emphasize(color: number, on: boolean): number {
  if (!on) return color;
  const ch = (shift: number): number => {
    const c = (color >> shift) & 0xff;
    return Math.round(c + (0xff - c) * EMPHASIS_MIX) & 0xff;
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** 축 이름. 화면이 「무엇을 잡았나」를 말할 때 쓴다 */
const AXIS_NAME: Record<Axis, string> = { x: 'X', y: 'Y', z: 'Z' };

/**
 * 무엇을 잡았는지 한 줄로.
 *
 * ⚠ **축 이름을 반드시 넣는다** — 감독 문언이 *"축별 어떤 것이 선택되었는지"* 이고,
 * 색만으로는 「빨강이 X 였나」를 기억해야 한다. 글자는 기억을 요구하지 않는다.
 */
export function handleLabel(h: Handle): string {
  if (h.kind === 'move') return `${AXIS_NAME[h.axis]}축 이동`;
  return h.kind === 'rotate' ? '회전' : '크기';
}
