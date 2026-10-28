// world10/edit/gizmo.ts — 3축 기즈모의 **집행**. 산술은 `decide/gizmo-math.ts` 가 갖는다.
//
// 감독 지시: *"설치 후 이동 회전 확대축소하게 해줘. 블렌더에서 가능하잖아. 기즈모 나오고."*
//
// ── 무엇을 그리나 ───────────────────────────────────────────────────────────
//   · 이동 — X·Y·Z 세 축의 막대 + 화살촉. 축을 잡고 끌면 **그 축으로만** 움직인다.
//   · 회전 — 수평 링 하나. 잡고 돌리면 `ry` 가 바뀐다.
//   · 크기 — 링 위의 작은 상자. 바깥으로 끌면 커진다.
//
// **왜 회전이 링 하나인가**: 편집 대상(`EditTarget`)이 드는 회전은 `ry`(Y축) **하나**다.
// 오버레이 계약도 마을 파츠(`PlacedPart`)도 그 하나만 갖는다. 3축
// 회전을 주려면 계약과 소비자까지 함께 늘려야 하고, 그것은 이 단계의 범위가 아니다.
// 지금 데이터로 «이동·회전·크기» 세 가지가 전부 손에 잡힌다 — 부족하면 감독이 말한다.
//
// ── 재질은 `MeshBasicMaterial` 뿐이다 (팀장 판정 근거 ①) ────────────────────
// WebGPU 실기기 검증 축이 이 환경에 **0** 이라, 실기기에서 도는 것이 확인된 수단만 쓴다.
// 선택 링(`pick.ts`)이 이미 같은 재질이고 `systems/horizon.ts` 가 «두 백엔드에서 쓰는
// 수단» 으로 못 박아 뒀다. ⚠ 그 확인 자체가 **아직 감독 화면에서 안 났다** — 팀장 조건 2가
// 이 확인을 조작감 판정과 **같은 왕복에 묶으라**고 지정했다.
//
// ── 왜 자체 rAF 루프를 도는가 ───────────────────────────────────────────────
// 기즈모는 **화면에서 일정 크기**로 보여야 하므로(안 그러면 멀리 있는 물건의 기즈모가
// 점이 된다) 카메라가 움직일 때마다 배율을 다시 잡아야 한다. 그런데 `OverlayHost` 에는
// 프레임 훅이 없다 — 소비자를 고치는 대신 **붙어 있는 동안만 도는 rAF** 를 여기서 돈다.
// 그리는 것은 메인 루프이고 이 루프는 위치·배율만 갱신한다.
//
// ⚠ **첫 판본은 이 자리에 *"편집이 꺼지면 멈춘다"* 라고 적었고 거짓이었다**(검수관 P3,
// 2026-08-13). 실제로는 `startEditMode` 진입 즉시 — 주행 모드에서도 — 루프가 시작해
// 세션이 끝날 때까지 돌았다. `setEditing(false)` 는 `attach(null)` 로 `target` 만 비웠다.
// `target === null` 이면 계산이 없어 실해는 미미했지만, **주석-코드 불일치가 이 저장소가
// 반복해서 걸린 형태**다. 문장을 고치는 대신 **코드를 문장에 맞췄다** — 지금은 `attach`
// 가 루프를 켜고 끈다(붙을 것이 없으면 프레임을 안 잡는다).

import {
  AXIS_DIR, OPACITY_IDLE, angleDelta, closestOnAxis, emphasize, gizmoScale, handleLabel,
  partOf, partOpacity, ringAngle, scaleFactorFromDrag, shouldEmphasize,
  type Axis, type GizmoPart, type Handle, type Ray3,
} from '../decide/gizmo-math.js';
import { scaleBy } from '../decide/edit-pick.js';
import { readNum } from '../url-knob.js';
import type { OverlayHost } from './types.js';
import type { EditTarget } from './target.js';
import type { StubMesh, ThreeNS } from './state.js';

// 잡을 수 있는 것. **정의는 `decide/gizmo-math.ts` 로 옮겼다**(2026-08-22) — 강조 판정이
// 그 타입을 받아야 하는데 여기 두면 판정 파일이 집행 파일을 가리켜 순환이 된다.
//
// ⚠ **지금 이 재수출의 소비자는 0건이다**(검수관 실측 P7: 지우고 `tsc --noEmit` rc=0,
// 기즈모 검사 전부 통과). 그래도 남기는 것은 **공개 API 를 좁히지 않기 위해서**다 —
// 옮기는 김에 없애면 「타입 이동」이 「API 축소」를 겸하게 된다.
// 첫 판본은 이 자리에 *"소비자 경로는 그대로다"* 라고 적었고, **유지할 경로가 없었다**는
// 점에서 부정확했다(검수관 P7·N4). 「소비자와 함께 열어라」는 G2 조건은 **새로 여는 것**에
// 걸리고 이것은 있던 것을 유지한 경우라 대상이 아니다 — 검수관 판정.
export type { Handle } from '../decide/gizmo-math.js';

/**
 * 기즈모가 화면에서 차지하는 크기 노브.
 *
 * ⚠ **값 판정은 감독 화면에서만 난다**(팀장 조건 2). 헤드리스는 swiftshader 라 «집기
 * 쉬운가» 를 못 잰다. 지금 값은 «카메라에서 10m 떨어진 물건의 기즈모가 약 1.2m» 가 되게
 * 잡은 것이고, 근거가 아니라 **출발점**이다. `?giz=` 노브로 열어 감독 판정을 받는다.
 */
export const GIZMO_K_DEFAULT = 0.12;

/**
 * 실제로 쓰는 값. **`?giz=` 로 열려 있다**(팀장 조건 2 — 조작감 판정을 감독 화면에서
 * 받는다). 범위는 «거의 안 보임 ~ 화면을 덮음» 을 양끝으로 잡았다.
 */
export const GIZMO_K = readNum('giz', GIZMO_K_DEFAULT, 0.02, 0.6);

/** 축 색 — 블렌더·마야가 공유하는 관례다(X 빨강 · Y 초록 · Z 파랑) */
const AXIS_COLOR: Record<Axis, number> = { x: 0xff5566, y: 0x66dd77, z: 0x5599ff };
const ROTATE_COLOR = 0xffcc55;
const SCALE_COLOR = 0xdddddd;

/** 축 막대의 길이·굵기(기즈모 로컬 단위 — 위 배율이 곱해진다) */
const SHAFT_LEN = 1;
const SHAFT_R = 0.035;
const HEAD_R = 0.11;
const HEAD_LEN = 0.26;
/**
 * 🔴 **집기 판정만 넓히는 보이지 않는 프록시** (감독 신고 2026-08-20 *"왜 기즈모가 잘
 * 안 집히지?"*).
 *
 * ── 왜 필요한가 (실측) ──────────────────────────────────────────────────────
 * 판정 영역이 **그려진 것과 똑같았다.** 축 막대는 길이 1 에 반지름 `0.035` — 길이의
 * 3.5% 굵기다. `gizmoScale` 이 거리에 비례해 키우므로 화면상 굵기는 일정한데, 그
 * 일정한 굵기가 애초에 몇 픽셀이다. 3D 툴이 보이는 것보다 두꺼운 히트박스를 쓰는
 * 이유가 이것이고, 여기엔 그것이 없었다.
 *
 * ── 왜 «보이지 않는» 메시로 되는가 ──────────────────────────────────────────
 * **레이캐스트는 `visible` 을 안 본다**(위 `hitTest` 주석의 근거와 같은 성질). 그래서
 * `visible = false` 로 두면 **드로우콜은 0 인데 판정에는 걸린다.** 개수 불변식 `[7]` 이
 * 보는 것은 렌더 목록이므로 이 메시들은 거기 안 올라간다 — 지오 1·재질 1 이 부팅 때
 * 한 번 늘고 그 뒤로 상수다(기즈모 자체가 이미 그런 구조다).
 *
 * ── 값의 근거 — 겹치면 엉뚱한 축이 잡힌다 ────────────────────────────────────
 * `PICK_FROM` 이 원점을 비운다: 반경 `0.13` 인 세 실린더가 원점에서 만나면 x·y·z 가
 * 서로 겹쳐 **어느 축을 잡았는지 광선 거리로 정해진다**(= 운). `0.30 > 0.13` 이라 안 겹친다.
 * `PICK_TO` 는 회전 링(`RING_R ± 0.05` = 1.20~1.30)과 크기 상자(x 1.15~1.35) **앞에서**
 * 끝난다 — 겹치면 이동을 잡으려다 회전이 잡힌다.
 * 화살표 머리(1.00~1.26, 반경 `HEAD_R`)는 프록시를 안 씌운다: 이미 막대의 3배 굵고,
 * 씌우면 링·상자와 겹치는 구간에 들어간다.
 *
 * ⚠ **회전 링과 크기 상자는 이번에 안 넓혔다.** 링은 `RingGeometry` 라 **평면**이고
 * (옆에서 보면 두께 0), 넓히려면 토러스 프록시가 필요한데 그것이 같은 자리에 있는 크기
 * 상자와 겹친다 — 둘의 우선순위를 새로 판정해야 하고 감독이 그 둘을 지목하지는 않았다.
 * 백로그 `G-EDIT9`.
 */
export const PICK_R = 0.13;
export const PICK_FROM = 0.30;
export const PICK_TO = 1.10;

/**
 * 회전 링의 반지름. 축 막대보다 조금 밖이라 서로 안 가린다.
 * ⚠ 링의 **두께 절반**이다 — `RingGeometry(RING_R - RING_HALF, RING_R + RING_HALF)`.
 * 집기 프록시가 이 안쪽에서 끝나야 한다는 판정이 `tests/world2-gizmo.test.ts` 에 있다.
 */
export const RING_R = 1.25;
export const RING_HALF = 0.05;
/** 크기 상자를 놓는 자리(링 반경) */
const SCALE_AT = RING_R;
// 축 방향은 `decide/gizmo-math.ts` 의 `AXIS_DIR` 을 쓴다 — 여기 다시 적으면 값 미러링이다.
const AXES: readonly Axis[] = ['x', 'y', 'z'];

export interface Gizmo {
  /** 선택이 바뀌면 부른다. `null` 이면 숨긴다 */
  attach(e: EditTarget | null): void;
  /** 광선에 걸린 핸들. 축 막대·링·상자 중 하나이거나 `null` */
  hitTest(hits: readonly { object: unknown }[]): Handle | null;
  /** 드래그 시작. 잡은 순간의 기준값을 기억한다 */
  begin(h: Handle, ray: Ray3): void;
  /** 드래그 중. 항목 값을 바꿨으면 `true`(부르는 쪽이 `apply`·`refresh` 한다) */
  update(ray: Ray3): boolean;
  /**
   * 커서가 얹힌 핸들(감독 지시 *"마우스를 대면 그 축이 변화가 바로 생겼으면해"*).
   *
   * 드래그 중이 아닐 때만 의미가 있다 — 잡고 있는 동안은 `active` 가 이긴다.
   * 같은 값이면 아무 일도 안 한다(매 `pointermove` 마다 재질을 건드리지 않는다).
   */
  hover(h: Handle | null): void;
  end(): void;
  /** 지금 드래그 중인가 — 편집 입력이 이걸 보고 물건 끌기와 갈라진다 */
  readonly dragging: boolean;
  dispose(): void;
}

/**
 * 기즈모가 화면에 말을 거는 문 (2026-08-22, 감독 지시 *"축별 어떤 것이 선택되었는지"*).
 *
 * **선택 사양이다** — 안 주는 소비자(테스트 하네스)에서는 3D 강조만 남고 글자가 없다.
 * 그래도 「무엇을 잡았나」의 절반은 보이므로 조용한 no-op 이 아니다.
 */
export interface GizmoSay {
  (msg: string): void;
}

export function createGizmo(host: OverlayHost, say?: GizmoSay): Gizmo {
  const THREE = host.THREE as ThreeNS;
  const disposables: { dispose?(): void }[] = [];

  const mat = (color: number) => {
    // `depthTest:false` — 기즈모는 물건에 파묻혀도 보여야 한다. 선택 링과 같은 판단이다.
    const m = new THREE.MeshBasicMaterial({
      // ⚠ **불투명도 기본값을 여기 적지 않는다**(검수관 권고 P1, 2026-08-22). 강조가
      // 걷힐 때 돌아갈 자리가 `OPACITY_IDLE` 이므로, 두 곳에 적으면 한쪽만 고쳐도
      // 「붙이기만 해도 흐려진」 상태가 된다. 둘 다 화면에 도달하는 값이었다.
      color, transparent: true, opacity: OPACITY_IDLE, depthTest: false, side: THREE.DoubleSide,
    });
    disposables.push(m);
    return m;
  };
  const geo = <T extends { dispose?(): void }>(g: T): T => { disposables.push(g); return g; };

  const group = new THREE.Group();
  group.visible = false;
  (host.root as unknown as { add(o: never): void }).add(group as never);

  /** 레이캐스트가 맞힌 메시 → 핸들 */
  const handleOf = new Map<unknown, Handle>();

  /**
   * 파트별 재질과 **기본 색**. 강조는 이 둘만 있으면 된다 — 축 하나가 막대와 화살촉에
   * 재질을 **공유**하므로(아래 조립부) 재질 하나를 만지면 그 축 전체가 함께 밝아진다.
   *
   * ⚠ 기본 색을 함께 기억하는 것이 요점이다. 강조가 색을 덮어쓰므로, 원본을 안 들고
   * 있으면 두 번째 드래그부터 **밝아진 색 위에 또 밝아진다**(회를 거듭할수록 흰색으로 간다).
   */
  const parts = new Map<GizmoPart, { mat: { color: { setHex(v: number): void }; opacity: number }; base: number }>();

  function addPart(m: StubMesh, h: Handle): void {
    m.renderOrder = 1000;
    m.userData.gizmo = h;
    handleOf.set(m, h);
    group.add(m as never);
  }

  // ── 이동 축 셋 ──────────────────────────────────────────────────────────
  const shaftGeo = geo(new THREE.CylinderGeometry(SHAFT_R, SHAFT_R, SHAFT_LEN, 10));
  const headGeo = geo(new THREE.ConeGeometry(HEAD_R, HEAD_LEN, 12));
  // 집기 프록시는 **세 축이 지오·재질을 함께 쓴다** — 색이 필요 없다(안 그린다).
  const pickGeo = geo(new THREE.CylinderGeometry(PICK_R, PICK_R, PICK_TO - PICK_FROM, 8));
  const pickMat = mat(0xffffff);
  for (const axis of ['x', 'y', 'z'] as const) {
    const m = mat(AXIS_COLOR[axis]);
    parts.set(axis, { mat: m as never, base: AXIS_COLOR[axis] });
    // 원기둥·원뿔은 기본이 **Y축 방향**이다. X·Z 축은 눕힌다.
    const shaft = new THREE.Mesh(shaftGeo, m);
    const head = new THREE.Mesh(headGeo, m);
    const half = SHAFT_LEN / 2;
    if (axis === 'x') {
      shaft.rotation.z = -Math.PI / 2; shaft.position.set(half, 0, 0);
      head.rotation.z = -Math.PI / 2; head.position.set(SHAFT_LEN + HEAD_LEN / 2, 0, 0);
    } else if (axis === 'y') {
      shaft.position.set(0, half, 0);
      head.position.set(0, SHAFT_LEN + HEAD_LEN / 2, 0);
    } else {
      shaft.rotation.x = Math.PI / 2; shaft.position.set(0, 0, half);
      head.rotation.x = Math.PI / 2; head.position.set(0, 0, SHAFT_LEN + HEAD_LEN / 2);
    }
    addPart(shaft, { kind: 'move', axis });
    addPart(head, { kind: 'move', axis });

    // 🔴 **집기 프록시** — 그리지 않고 판정만 넓힌다. 근거는 `PICK_R` 주석 한 곳이다.
    const proxy = new THREE.Mesh(pickGeo, pickMat);
    // `visible = false` 가 이 줄의 전부다 — 렌더 목록에서 빠지고 광선에는 걸린다.
    proxy.visible = false;
    const mid = PICK_FROM + (PICK_TO - PICK_FROM) / 2;
    if (axis === 'x') { proxy.rotation.z = -Math.PI / 2; proxy.position.set(mid, 0, 0); }
    else if (axis === 'y') { proxy.position.set(0, mid, 0); }
    else { proxy.rotation.x = Math.PI / 2; proxy.position.set(0, 0, mid); }
    addPart(proxy, { kind: 'move', axis });
  }

  // ── 회전 링 ─────────────────────────────────────────────────────────────
  const ringMat = mat(ROTATE_COLOR);
  parts.set('rotate', { mat: ringMat as never, base: ROTATE_COLOR });
  const ring = new THREE.Mesh(geo(new THREE.RingGeometry(RING_R - RING_HALF, RING_R + RING_HALF, 48)), ringMat);
  ring.rotation.x = -Math.PI / 2;
  addPart(ring, { kind: 'rotate' });

  // ── 크기 상자 — **넷이다** (감독 카드 판정 2026-08-22 「축별로 늘리기 — 세 방향」) ──
  //
  // 발단 신고: *"크기 조정은 R 한축만되는것 같은데?"* — 여기에 상자가 **하나**뿐이었고
  // 그것이 균등 배율을 밀었다. 즉 「X 방향으로 끌면 전체가 커진다」였다.
  //
  // ⚠ **균등을 없애지 않았다.** 축별 셋만 남기면 「전체를 키운다」에 세 번 끌어야 하고
  // 비율이 어긋난 것을 균등하게 키우는 것이 아예 불가능해진다. 그래서 표준 3D 툴 관례를
  // 따른다 — **축 끝에 축별 상자 셋, 가운데에 균등 하나.**
  //
  // ⚠⚠ 색을 가른다: 축별은 **그 축의 색**(이동 화살표와 같은 빨강·초록·파랑)이라 «어느
  // 축인가» 를 색으로 읽고, 균등만 회색이다. 넷을 같은 회색으로 두면 위치로만 구별해야
  // 하는데, 기즈모가 화면에서 작아지면(멀리 있는 물건) 그 위치 차이가 사라진다.
  {
    const box = () => geo(new THREE.BoxGeometry(0.2, 0.2, 0.2));
    // 균등 — 가운데. 이동 화살표는 축을 따라 뻗어 있고 중심은 비어 있다.
    const evenMat = mat(SCALE_COLOR);
    parts.set('scale', { mat: evenMat as never, base: SCALE_COLOR });
    const even = new THREE.Mesh(box(), evenMat);
    even.position.set(0, 0, 0);
    addPart(even, { kind: 'scale' });
    // 축별 셋 — 링 위 각 축 끝. `SCALE_AT` 은 링 반경이라 회전 링과 같은 원 위에 선다.
    for (const axis of AXES) {
      const key = `scale:${axis}` as const;
      const m = mat(AXIS_COLOR[axis]);
      parts.set(key, { mat: m as never, base: AXIS_COLOR[axis] });
      const c = new THREE.Mesh(box(), m);
      const at = AXIS_DIR[axis];
      c.position.set(at[0] * SCALE_AT, at[1] * SCALE_AT, at[2] * SCALE_AT);
      addPart(c, { kind: 'scale', axis });
    }
  }

  // ── 붙이기·따라가기 ─────────────────────────────────────────────────────
  let target: EditTarget | null = null;
  let size = 1;

  function place(): void {
    if (!target) return;
    const cam = host.camera as unknown as { position: { x: number; y: number; z: number } };
    const p = cam?.position;
    size = p
      ? gizmoScale(p.x, p.y, p.z, target.x, target.y, target.z, GIZMO_K)
      : 1;
    group.position.set(target.x, target.y, target.z);
    group.scale.setScalar(size);
    // 링과 크기 상자는 물건과 함께 돈다 — 안 그러면 «지금 어느 방향인가» 가 안 보인다.
    group.rotation.y = target.ry;
  }

  // 붙어 있는 동안만 도는 루프. 그리지 않는다 — 위치·배율만 맞춘다.
  let raf = 0;
  const tick = () => {
    if (!target) { raf = 0; return; }   // 뗐으면 다음 프레임을 안 잡는다
    place();
    raf = requestAnimationFrame(tick);
  };
  function startLoop(): void { if (raf === 0) raf = requestAnimationFrame(tick); }
  function stopLoop(): void { if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; } }

  // ── 드래그 ──────────────────────────────────────────────────────────────
  let active: Handle | null = null;
  /** 커서가 얹힌 핸들. 잡고 있는 동안은 `active` 가 이긴다 */
  let hovered: Handle | null = null;
  /** 잡은 순간의 축 파라미터(이동·크기) 또는 각도(회전) */
  let anchor = 0;
  /**
   * 🔴 **드래그가 시작될 때 떠 두는 축 원점** (감독 신고 2026-08-22 *"딱 한단계만 움직여"*).
   *
   * 예전에는 매 프레임 `axisOrigin()`(= 물체의 **현재** 위치)을 기준으로 축 파라미터를
   * 쟀다. 그런데 이동 드래그는 그 물체를 옮기므로 **기준점이 손을 따라 같이 움직였고**,
   * 그러면 상대 거리가 0 으로 상쇄돼 한 프레임 뒤 정확히 멈춘다. 유도는
   * `decide/gizmo-math.ts` 의 `closestOnAxis` 주석에 있다 — **여기에 다시 적지 않는다.**
   *
   * 회전·크기는 물체의 위치를 안 바꿔 이 상쇄가 없었다. 같은 코드가 축마다 다르게 보인
   * 이유가 그것이고, 그래서 「이동만 안 된다」로 신고됐다.
   */
  let dragOrigin: readonly [number, number, number] = [0, 0, 0];

  /**
   * **잡은 파트를 밝게, 나머지를 흐리게** (2026-08-22, 감독 지시).
   *
   * 판정은 전부 `decide/gizmo-math.ts` 가 갖는다 — 여기는 그 답을 재질에 꽂기만 한다.
   * 아무것도 안 잡았으면(`active === null`) 모든 파트가 기본값으로 돌아간다.
   */
  function syncEmphasis(): void {
    for (const [part, p] of parts) {
      p.mat.color.setHex(emphasize(p.base, shouldEmphasize(active, hovered, part)));
      p.mat.opacity = partOpacity(active, part, hovered);
    }
  }

  function axisOrigin(): readonly [number, number, number] {
    return target ? [target.x, target.y, target.z] : [0, 0, 0];
  }

  /**
   * 크기 핸들을 **끄는 방향**. 링과 함께 `ry` 만큼 돌아 있다.
   *
   * ⚠ 축별 상자는 각자 놓인 방향으로 끈다 — Y 상자를 좌우로 끌어도 안 움직이는 것이
   * 맞다(그 상자는 높이를 뜻한다). 균등(`axis` 없음)은 **기존 그대로 X 방향**이다:
   * 감독이 신고한 것은 「한 축만 된다」이지 「균등 조작이 이상하다」가 아니었고,
   * 손에 익은 방향을 바꾸면 그것이 새 회귀가 된다.
   */
  function scaleAxis(axis?: Axis): readonly [number, number, number] {
    const a = target?.ry ?? 0;
    if (axis === 'y') return [0, 1, 0]; // 높이는 `ry` 로 안 돈다
    // X·Z 와 균등은 수평면 위에 있으므로 `ry` 를 얹는다.
    return axis === 'z' ? [Math.sin(a), 0, Math.cos(a)] : [Math.cos(a), 0, -Math.sin(a)];
  }

  return {
    attach(e: EditTarget | null): void {
      // 🔴🔴 **대상이 실제로 바뀌었을 때만 강조를 걷는다** (감독 신고 2026-08-22
      // *"마우스로 조정하면 딱 한단계만 움직여"*).
      //
      // ⚠ **이 줄이 내가 직전 배포(#252)에서 만든 회귀였다.** 검수관 권고 P4 로
      // *"잡은 것을 함께 놓는다"* 를 넣었는데 **조건 없이** 비웠고, 이 함수는
      // `panel.refresh()` 끝마다 불린다(`mode.ts` 의 그 콜백). 드래그 한 프레임이
      // `update → apply → refresh` 이므로 **자기가 방금 잡은 축을 스스로 놓았다.**
      // 그래서 첫 프레임만 먹고 멈춘다 — 감독 문언 그대로다.
      //
      // P4 의 목적은 *"대상이 사라졌는데 강조가 남는 것"* 이었고 그것은 **바뀔 때**만
      // 필요하다. 같은 대상으로 다시 불리는 것은 「선택이 그대로다」이므로 아무 일도
      // 없어야 한다. 목적은 그대로 두고 조건만 붙인다.
      //
      // ⚠ 교훈: 권고를 반영할 때 **그 함수가 언제 불리는지**를 안 봤다. `attach` 라는
      // 이름이 「붙일 때 한 번」처럼 읽혔지만 실제로는 매 프레임 경로였다.
      const changed = e !== target;
      target = e;
      group.visible = e !== null;
      if (changed && (active !== null || hovered !== null)) {
        active = null; hovered = null; syncEmphasis();
      }
      if (e) { place(); startLoop(); } else stopLoop();
    },

    hitTest(hits: readonly { object: unknown }[]): Handle | null {
      // 🔴 **안 붙어 있으면 아무것도 안 집는다** (감독 신고 2026-08-20 *"왜 기즈모가 잘
      // 안 집히지?"* 조사 중 발견).
      //
      // ⚠ **레이캐스트는 `visible` 을 안 본다** — `layers` 만 본다(three r160
      // `three.module.js` 의 `intersectObject`, WebGPU 0.171 `three.core.js` 도 같다).
      // 그래서 `attach(null)` 로 **숨긴 기즈모의 메시가 그대로 광선에 걸린다.** 게다가
      // `place()` 는 `if (!target) return` 이라 **마지막 자리에 그대로 남아 있다.**
      //
      // 증상이 고약하다: `edit/input.ts` 가 *"기즈모가 항목보다 먼저다"* 로 이것을 **먼저**
      // 보므로, 아무것도 안 고른 상태에서 그 잔상 자리를 클릭하면 **물건 선택이 안 먹는다.**
      // 감독이 «안 집힌다» 로 읽을 수 있는 형태이고, 아래 집기 프록시가 판정을 넓히면
      // **그 잔상도 함께 넓어진다** — 그래서 프록시보다 이 줄이 먼저다.
      if (!group.visible) return null;
      for (const h of hits) {
        const found = handleOf.get(h.object);
        if (found) return found;
      }
      return null;
    },

    begin(h: Handle, ray: Ray3): void {
      if (!target) return;
      active = h;
      syncEmphasis();
      // 색만으로는 「빨강이 X 였나」를 기억해야 한다 — 글자는 기억을 요구하지 않는다.
      say?.(`${handleLabel(h)} 중 — 놓으면 확정됩니다.`);
      // ⚠ **여기서 원점을 뜬다.** 드래그 내내 이 값을 쓴다(위 `dragOrigin` 주석).
      dragOrigin = axisOrigin();
      if (h.kind === 'move') {
        anchor = closestOnAxis(ray, dragOrigin, AXIS_DIR[h.axis]) ?? 0;
      } else if (h.kind === 'rotate') {
        anchor = ringAngle(ray, target.x, target.z, target.y) ?? 0;
      } else {
        anchor = closestOnAxis(ray, dragOrigin, scaleAxis(h.kind === 'scale' ? h.axis : undefined)) ?? 0;
      }
    },

    update(ray: Ray3): boolean {
      if (!active || !target) return false;
      if (active.kind === 'move') {
        const u = closestOnAxis(ray, dragOrigin, AXIS_DIR[active.axis]);
        if (u === null) return false; // 광선이 축과 나란하다 — 이 프레임은 건너뛴다
        const d = u - anchor;
        anchor = u;
        if (active.axis === 'x') target.x += d;
        else if (active.axis === 'y') target.y += d;
        else target.z += d;
        return true;
      }
      if (active.kind === 'rotate') {
        const a = ringAngle(ray, target.x, target.z, target.y);
        if (a === null) return false; // 중심에 너무 가깝다 — 각도를 신뢰할 수 없다
        target.ry += angleDelta(anchor, a);
        anchor = a;
        return true;
      }
      // 크기는 물체 위치를 안 바꾸므로 상쇄가 없었지만, **기준을 하나로 둔다** —
      // 두 벌이 있으면 다음 사람이 어느 쪽이 옳은지 다시 판정해야 한다.
      const axis = active.kind === 'scale' ? active.axis : undefined;
      const u = closestOnAxis(ray, dragOrigin, scaleAxis(axis));
      if (u === null) return false;
      const f = scaleFactorFromDrag(u - anchor, size);
      anchor = u;
      // 상·하한은 계약(`S_MIN`·`S_MAX`)이 소유한다 — 여기서 다시 적지 않는다.
      //
      // 🔴 **축별이면 그 축의 배수만 민다** (감독 카드 판정 「축별로 늘리기 — 세 방향」).
      // ⚠ 대상이 축별 문을 안 내면(`axes` 없음 — 예: 액자) **균등으로 떨어진다.** 조용히
      // 아무 일도 안 하는 것보다 낫다 — 이 저장소가 「조용한 no-op」을 반복해서 금지해 왔고,
      // 상자가 보이는데 안 움직이면 «가끔 안 된다» 가 된다.
      if (axis && target.axes) {
        const cur = target.axes.get(axis);
        const next = scaleBy(cur, f);
        if (next === cur) return false;
        target.axes.set(axis, next);
        return true;
      }
      const next = scaleBy(target.s, f);
      if (next === target.s) return false;
      target.s = next;
      return true;
    },

    // 놓으면 강조를 걷는다. **`active = null` 만 두면 밝아진 채로 남는다** — 다음
    // 드래그에서 그 위에 또 밝아져 회를 거듭할수록 흰색이 된다(`parts` 의 `base` 주석).
    hover(h: Handle | null): void {
      // 같은 값이면 재질을 안 건드린다 — `pointermove` 는 초당 수십 번 온다.
      const same = h === null ? hovered === null
        : hovered !== null && partOf(h) === partOf(hovered);
      if (same) return;
      hovered = h;
      // 잡고 있는 동안은 강조가 `active` 의 것이므로 다시 칠할 필요가 없다.
      if (active === null) syncEmphasis();
    },

    /**
     * 손을 뗀다. **`hovered` 는 일부러 안 비운다** (검수관 권고 P1, 2026-08-23).
     *
     * 드래그가 끝난 시점에 커서는 **방금 잡고 있던 핸들 위**에 있다 — 기즈모가 물체를
     * 따라 움직였고 손도 그것을 따라갔으니 둘이 같은 자리다. 여기서 비우면 강조가 한 번
     * 꺼졌다가 다음 `pointermove` 에 다시 켜져 **깜빡인다.**
     *
     * ⚠ 그래서 남는 위험은 **스테일 강조**다: 손을 뗀 뒤 커서를 전혀 안 움직이는데 다른
     * 경로로 기즈모가 옮겨가면(선택 변경 등) 옛 축이 밝은 채로 남는다. 그 경로는
     * `attach()` 가 **대상이 바뀔 때 `hovered` 를 함께 비워** 막는다. 즉 이 판단은
     * 「비우지 않는다」가 아니라 「비우는 자리를 `attach` 하나로 모은다」이다.
     */
    end(): void { active = null; syncEmphasis(); },

    get dragging(): boolean { return active !== null; },

    dispose(): void {
      stopLoop();
      (host.root as unknown as { remove(o: never): void }).remove(group as never);
      for (const d of disposables) d.dispose?.();
      handleOf.clear();
      parts.clear();
    },
  };
}
