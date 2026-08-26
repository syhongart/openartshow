// world8/decide/gizmo-math.ts — 기즈모의 **산술만**. three 를 import 하지 않는다.
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
 *
 * ── ⚠ `a` 는 **드래그 내내 고정이어야 한다** (감독 신고 2026-08-22) ───────────
 * 감독: *"마우스로 조정하면 딱 한단계만 움직여."*
 *
 * 위 문단이 *"프레임마다 그 수의 차이를 쓰면 어긋나지 않는다"* 라고 적고 있는데 **그것은
 * `a` 가 고정일 때만 참이다.** 집행부는 `a` 로 **물체의 현재 위치**를 넘기고 있었고,
 * 드래그가 물체를 옮기면 기준점이 함께 따라간다. 그러면 상쇄가 일어난다 — 유도:
 *
 *   마우스가 가리키는 축 위 절대 위치를 `P`, 기준점을 `O` 라 하면 `u = P − O`.
 *   1프레임: `d₁ = u₁ − anchor = P₁ − P₀`  →  물체가 `d₁` 만큼 간다  →  `O₁ = O₀ + d₁`
 *   2프레임: `u₂ = P₂ − O₁ = P₂ − O₀ − d₁`
 *            `d₂ = u₂ − u₁ = (P₂ − P₁) − d₁`
 *   손이 같은 속도로 움직이면 `P₂ − P₁ = d₁` 이므로 **`d₂ = 0`** — 그 프레임은 멈춘다.
 *
 * ⚠ **첫 판본은 여기서 *"정확히 멈춘다"* 라고 적었고 실측이 그것을 정정했다.** 0 이
 * 되는 것은 **그 프레임뿐**이고 다음 프레임에는 기준점이 안 따라왔으므로 다시 전진한다.
 * 손이 1m 씩 네 번 나아갈 때를 실제로 돌려 보면(순수 함수만, 원점을 물체에 묶어서):
 *
 *   손    1  2  3  4
 *   물체  1  1  2  2      ← 멈추는 게 아니라 **한 프레임 걸러** 간다(절반 속도)
 *
 * 그러므로 이 결함 하나만으로는 「딱 한 단계만 움직인다」가 **설명되지 않는다.** 감독이
 * 본 증상은 여기에 **다른 결함이 겹친** 것이었다 — `edit/gizmo.ts` 의 `attach()` 가
 * 매 프레임 잡은 축을 놓고 있었다(그 함수 주석). 증상이 하나여도 원인이 하나라고
 * 가정하지 않는다 — 이 저장소가 이름 붙인 그 형태다.
 *
 * 회전·크기가 멀쩡했던 것은 그 둘이 물체의 **위치**를 안 바꿔서 기준점이 가만히 있었기
 * 때문이다 — 같은 코드가 축마다 다르게 보인 이유가 그것이다.
 *
 * 그래서 `edit/gizmo.ts` 는 `begin()` 에서 기준점을 떠서 드래그 내내 그것을 넘긴다.
 * 이 함수는 순수하므로 그 성질을 **두 방식을 나란히 돌려** 검사로 못 박았다
 * (`tests/world2-gizmo.test.ts` 의 드래그 시뮬레이션).
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

/**
 * 잡을 수 있는 것. **`edit/gizmo.ts` 가 이 타입을 재수출한다**(소비자 경로 유지).
 *
 * 🔴 **크기에 `axis` 가 붙었다** (감독 카드 판정 2026-08-22 「축별로 늘리기 — 세 방향」).
 * 발단 신고: *"크기 조정은 R 한축만되는것 같은데?"* — 상자가 X 하나뿐이었다.
 *
 * ⚠ **`axis` 는 선택 사양이고 그것이 설계다.** 없으면 **균등**(세 축을 함께 = 기존 동작),
 * 있으면 그 축만. 균등을 없애지 않은 이유: 「전체를 키운다」가 가장 흔한 조작인데 축별만
 * 남기면 그때마다 세 번 끌어야 하고, **비율이 어긋난 상태를 균등하게 키우는 것**이 아예
 * 불가능해진다(`decide/overlay.ts` 의 `sx?` 주석이 같은 이유로 `s` 를 보존한다).
 */
export type Handle =
  | { kind: 'move'; axis: Axis }
  | { kind: 'rotate' }
  | { kind: 'scale'; axis?: Axis };

/**
 * 기즈모를 이루는 파트. 축 셋은 재질을 축마다 하나씩 공유한다.
 *
 * ⚠ **축별 크기가 `'scale'` 하나를 공유하면 안 된다** — 세 상자가 **함께** 밝아져
 * 「어느 축을 잡았나」가 화면에서 사라진다. 감독이 얹기 강조를 요구한 이유가 정확히
 * 그것이었다(*"마우스를 대면 그 축이 변화가 바로 생겼으면해"*). 그래서 파트를 가른다.
 */
export type ScalePart = `scale:${Axis}`;
export type GizmoPart = Axis | 'rotate' | 'scale' | ScalePart;

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
  if (h.kind === 'move') return h.axis;
  // 축별 크기는 축마다 다른 파트다(위 주석) — 균등(`axis` 없음)만 `'scale'` 을 쓴다.
  if (h.kind === 'scale' && h.axis) return `scale:${h.axis}`;
  return h.kind;
}

/** 그 핸들이 이 파트인가. `null` 이면 전부 `false`(잡은 것·얹은 것 양쪽이 쓴다) */
export function isActivePart(active: Handle | null, part: GizmoPart): boolean {
  return active !== null && partOf(active) === part;
}

/**
 * 이 파트의 불투명도.
 *
 * **아무것도 안 잡지도 얹지도 않았으면 전부 `IDLE`** — 그것이 「평상시 룩을 안 바꾼다」의
 * 집행이다.
 *
 * ── 잡은 것과 **얹은 것**을 구별한다 (감독 지시 2026-08-22) ──────────────────
 * 감독: *"마우스를 대면 그 축이 변화가 바로 생겼으면해."*
 *
 * 그전에는 **잡아야만** 달라졌다. 그래서 「이 축이 잡히긴 하나」를 알려면 일단 눌러 봐야
 * 했고, 눌렀는데 엉뚱한 축이면 되돌려야 한다 — 확인 비용이 조작 비용과 같았다.
 *
 * **둘의 강조 방식을 일부러 다르게 뒀다**:
 *
 *   잡음(`active`)  그 축 `ACTIVE` + **나머지 `DIMMED`**  ← 조작 중이니 집중시킨다
 *   얹음(`hovered`) 그 축 `ACTIVE` + 나머지 `IDLE`        ← 아직 조작 전이니 안 흐린다
 *
 * 얹었을 때까지 나머지를 흐리면 커서가 지나가기만 해도 기즈모 전체가 깜빡인다 —
 * 「바로 반응한다」가 「부산하다」가 되는 경계가 거기다.
 */
export function partOpacity(
  active: Handle | null,
  part: GizmoPart,
  hovered: Handle | null = null,
): number {
  if (active !== null) return isActivePart(active, part) ? OPACITY_ACTIVE : OPACITY_DIMMED;
  if (isActivePart(hovered, part)) return OPACITY_ACTIVE;
  return OPACITY_IDLE;
}

/**
 * 이 파트를 밝혀야 하는가 — 잡았든 얹었든.
 *
 * 색 강조는 둘을 **같게** 준다(불투명도만 위처럼 갈린다). 색까지 갈라 세 단계를 만들면
 * 「지금 잡은 건가 얹은 건가」를 색으로 읽어야 하는데, 그건 이 회차가 없애려던 바로 그
 * 기억 부담이다 — 상태줄 글자가 그 구별을 이미 말한다.
 */
export function shouldEmphasize(
  active: Handle | null,
  hovered: Handle | null,
  part: GizmoPart,
): boolean {
  return isActivePart(active, part) || (active === null && isActivePart(hovered, part));
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
  if (h.kind === 'rotate') return '회전';
  // 균등과 축별을 **글자로도** 가른다. 상자 넷이 비슷하게 생겼으므로 색·위치만으로는
  // 「지금 잡은 것이 전체인가 한 축인가」가 안 갈린다 — 그 구별이 이 회차의 본체다.
  return h.axis ? `${AXIS_NAME[h.axis]}축 크기` : '전체 크기';
}
