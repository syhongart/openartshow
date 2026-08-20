// world2/edit/gizmo.ts — 3축 기즈모의 **집행**. 산술은 `decide/gizmo-math.ts` 가 갖는다.
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
  AXIS_DIR, angleDelta, closestOnAxis, gizmoScale, ringAngle, scaleFactorFromDrag,
  type Axis, type Ray3,
} from '../decide/gizmo-math.js';
import { scaleBy } from '../decide/edit-pick.js';
import { readNum } from '../url-knob.js';
import type { OverlayHost } from './types.js';
import type { EditTarget } from './target.js';
import type { StubMesh, ThreeNS } from './state.js';

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
/** 크기 상자를 놓는 자리(링 위 +X 방향) */
const SCALE_AT = RING_R;

export interface Gizmo {
  /** 선택이 바뀌면 부른다. `null` 이면 숨긴다 */
  attach(e: EditTarget | null): void;
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

export function createGizmo(host: OverlayHost): Gizmo {
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
  // 집기 프록시는 **세 축이 지오·재질을 함께 쓴다** — 색이 필요 없다(안 그린다).
  const pickGeo = geo(new THREE.CylinderGeometry(PICK_R, PICK_R, PICK_TO - PICK_FROM, 8));
  const pickMat = mat(0xffffff);
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
  const ring = new THREE.Mesh(geo(new THREE.RingGeometry(RING_R - RING_HALF, RING_R + RING_HALF, 48)), mat(ROTATE_COLOR));
  ring.rotation.x = -Math.PI / 2;
  addPart(ring, { kind: 'rotate' });

  // ── 크기 상자 ───────────────────────────────────────────────────────────
  const cube = new THREE.Mesh(geo(new THREE.BoxGeometry(0.2, 0.2, 0.2)), mat(SCALE_COLOR));
  cube.position.set(SCALE_AT, 0, 0);
  addPart(cube, { kind: 'scale' });

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
    attach(e: EditTarget | null): void {
      target = e;
      group.visible = e !== null;
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
      stopLoop();
      (host.root as unknown as { remove(o: never): void }).remove(group as never);
      for (const d of disposables) d.dispose?.();
      handleOf.clear();
    },
  };
}
