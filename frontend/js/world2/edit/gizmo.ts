// world2/edit/gizmo.ts — 3축 기즈모의 **집행**. 산술은 `decide/gizmo-math.ts` 가 갖는다.
//
// 감독 지시: *"설치 후 이동 회전 확대축소하게 해줘. 블렌더에서 가능하잖아. 기즈모 나오고."*
//
// ── 무엇을 그리나 ───────────────────────────────────────────────────────────
//   · 이동 — X·Y·Z 세 축의 막대 + 화살촉. 축을 잡고 끌면 **그 축으로만** 움직인다.
//   · 회전 — 수평 링 하나. 잡고 돌리면 `ry` 가 바뀐다.
//   · 크기 — 링 위의 작은 상자. 바깥으로 끌면 커진다.
//
// **왜 회전이 링 하나인가**: `OverlayEntry` 가 드는 회전은 `ry`(Y축) **하나**다. 3축
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
// 프레임 훅이 없다 — 소비자를 고치는 대신 **편집 모드에서만 도는 rAF** 를 여기서 돈다.
// 그리는 것은 메인 루프이고 이 루프는 위치·배율만 갱신한다. 편집이 꺼지면 멈춘다.

import {
  AXIS_DIR, angleDelta, closestOnAxis, gizmoScale, ringAngle, scaleFactorFromDrag,
  type Axis, type Ray3,
} from '../decide/gizmo-math.js';
import { scaleBy } from '../decide/edit-pick.js';
import type { OverlayEntry, OverlayHost } from './types.js';
import type { EditState, StubMesh, ThreeNS } from './state.js';

/** 잡을 수 있는 것 */
export type Handle =
  | { kind: 'move'; axis: Axis }
  | { kind: 'rotate' }
  | { kind: 'scale' };

/**
 * 기즈모가 화면에서 차지하는 크기 노브.
 *
 * ⚠ **값 판정은 감독 화면에서만 난다**(팀장 조건 2). 헤드리스는 swiftshader 라 «집기
 * 쉬운가» 를 못 잰다. 지금 값은 «카메라에서 10m 떨어진 물건의 기즈모가 약 1.2m» 가 되게
 * 잡은 것이고, 근거가 아니라 **출발점**이다. `?giz=` 노브로 열어 감독 판정을 받는다.
 */
export const GIZMO_K = 0.12;

/** 축 색 — 블렌더·마야가 공유하는 관례다(X 빨강 · Y 초록 · Z 파랑) */
const AXIS_COLOR: Record<Axis, number> = { x: 0xff5566, y: 0x66dd77, z: 0x5599ff };
const ROTATE_COLOR = 0xffcc55;
const SCALE_COLOR = 0xdddddd;

/** 축 막대의 길이·굵기(기즈모 로컬 단위 — 위 배율이 곱해진다) */
const SHAFT_LEN = 1;
const SHAFT_R = 0.035;
const HEAD_R = 0.11;
const HEAD_LEN = 0.26;
/** 회전 링의 반지름. 축 막대보다 조금 밖이라 서로 안 가린다 */
const RING_R = 1.25;
/** 크기 상자를 놓는 자리(링 위 +X 방향) */
const SCALE_AT = RING_R;

export interface Gizmo {
  /** 선택이 바뀌면 부른다. `null` 이면 숨긴다 */
  attach(e: OverlayEntry | null): void;
  /** 광선에 걸린 핸들. 축 막대·링·상자 중 하나이거나 `null` */
  hitTest(hits: readonly { object: unknown }[]): Handle | null;
  /** 드래그 시작. 잡은 순간의 기준값을 기억한다 */
  begin(h: Handle, ray: Ray3): void;
  /** 드래그 중. 항목 값을 바꿨으면 `true`(부르는 쪽이 `apply`·`refresh` 한다) */
  update(ray: Ray3): boolean;
  end(): void;
  /** 지금 드래그 중인가 — 편집 입력이 이걸 보고 물건 끌기와 갈라진다 */
  readonly dragging: boolean;
  dispose(): void;
}

export function createGizmo(host: OverlayHost, st: EditState): Gizmo {
  const THREE = host.THREE as ThreeNS;
  const disposables: { dispose?(): void }[] = [];

  const mat = (color: number) => {
    // `depthTest:false` — 기즈모는 물건에 파묻혀도 보여야 한다. 선택 링과 같은 판단이다.
    const m = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide,
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

  function addPart(m: StubMesh, h: Handle): void {
    m.renderOrder = 1000;
    m.userData.gizmo = h;
    handleOf.set(m, h);
    group.add(m as never);
  }

  // ── 이동 축 셋 ──────────────────────────────────────────────────────────
  const shaftGeo = geo(new THREE.CylinderGeometry(SHAFT_R, SHAFT_R, SHAFT_LEN, 10));
  const headGeo = geo(new THREE.ConeGeometry(HEAD_R, HEAD_LEN, 12));
  for (const axis of ['x', 'y', 'z'] as const) {
    const m = mat(AXIS_COLOR[axis]);
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
  }

  // ── 회전 링 ─────────────────────────────────────────────────────────────
  const ring = new THREE.Mesh(geo(new THREE.RingGeometry(RING_R - 0.05, RING_R + 0.05, 48)), mat(ROTATE_COLOR));
  ring.rotation.x = -Math.PI / 2;
  addPart(ring, { kind: 'rotate' });

  // ── 크기 상자 ───────────────────────────────────────────────────────────
  const cube = new THREE.Mesh(geo(new THREE.BoxGeometry(0.2, 0.2, 0.2)), mat(SCALE_COLOR));
  cube.position.set(SCALE_AT, 0, 0);
  addPart(cube, { kind: 'scale' });

  // ── 붙이기·따라가기 ─────────────────────────────────────────────────────
  let target: OverlayEntry | null = null;
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

  // 편집 모드에서만 도는 루프. 그리지 않는다 — 위치·배율만 맞춘다.
  let raf = 0;
  const tick = () => {
    if (target) place();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  // ── 드래그 ──────────────────────────────────────────────────────────────
  let active: Handle | null = null;
  /** 잡은 순간의 축 파라미터(이동·크기) 또는 각도(회전) */
  let anchor = 0;

  function axisOrigin(): readonly [number, number, number] {
    return target ? [target.x, target.y, target.z] : [0, 0, 0];
  }

  /** 크기 핸들이 실제로 놓인 방향 — 링과 함께 `ry` 만큼 돌아 있다 */
  function scaleAxis(): readonly [number, number, number] {
    const a = target?.ry ?? 0;
    return [Math.cos(a), 0, -Math.sin(a)];
  }

  return {
    attach(e: OverlayEntry | null): void {
      target = e;
      group.visible = e !== null;
      if (e) place();
    },

    hitTest(hits: readonly { object: unknown }[]): Handle | null {
      for (const h of hits) {
        const found = handleOf.get(h.object);
        if (found) return found;
      }
      return null;
    },

    begin(h: Handle, ray: Ray3): void {
      if (!target) return;
      active = h;
      if (h.kind === 'move') {
        anchor = closestOnAxis(ray, axisOrigin(), AXIS_DIR[h.axis]) ?? 0;
      } else if (h.kind === 'rotate') {
        anchor = ringAngle(ray, target.x, target.z, target.y) ?? 0;
      } else {
        anchor = closestOnAxis(ray, axisOrigin(), scaleAxis()) ?? 0;
      }
    },

    update(ray: Ray3): boolean {
      if (!active || !target) return false;
      if (active.kind === 'move') {
        const u = closestOnAxis(ray, axisOrigin(), AXIS_DIR[active.axis]);
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
      const u = closestOnAxis(ray, axisOrigin(), scaleAxis());
      if (u === null) return false;
      const f = scaleFactorFromDrag(u - anchor, size);
      anchor = u;
      // 상·하한은 계약(`S_MIN`·`S_MAX`)이 소유한다 — 여기서 다시 적지 않는다.
      const next = scaleBy(target.s, f);
      if (next === target.s) return false;
      target.s = next;
      return true;
    },

    end(): void { active = null; },

    get dragging(): boolean { return active !== null; },

    dispose(): void {
      cancelAnimationFrame(raf);
      (host.root as unknown as { remove(o: never): void }).remove(group as never);
      for (const d of disposables) d.dispose?.();
      handleOf.clear();
      // `st` 는 여기서 안 만진다 — 선택 상태의 주인은 조립자다.
      void st;
    },
  };
}
