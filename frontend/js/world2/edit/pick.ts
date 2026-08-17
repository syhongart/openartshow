// world2/edit/pick.ts — **화면 좌표 → 세계 좌표**, 그리고 «무엇을 집었나».
//
// 산술 자체는 `decide/edit-pick.ts` 가 순수 함수로 갖고 있다(three 없이 시험 가능).
// 여기 있는 것은 그 함수들을 **실제 카메라·씬에 물리는 배선**이다 — 광선을 쏘고, 맞은
// 것에서 오버레이 항목을 되찾고, 선택 링을 그 자리에 놓는다.
//
// ⚠ 이 헤더는 오래 *"마을 파츠는 애초에 대상이 아니다"* 로 끝났고 **W4 ②-c 에서 거짓이
// 됐다.** 지금은 `pickVillage()` 가 인스턴스 메시를 따로 쏴서 건물·나무를 집는다.
// 두 경로가 갈라져 있는 것이 요점이다:
//
//   `pick()`        `host.root` 아래(오버레이 GLB) — 맞은 것이 곧 항목이다
//   `pickVillage()` 슬롯 풀의 인스턴스 — 맞은 것을 **위치로 되짚어** 파셀·인덱스로 환원한다
//
// 환원이 필요한 이유와 그것이 성립하는 조건은 `decide/village-pick.ts` 헤더 한 곳이다.

import { ndcOf, rayPlaneY, snapTo } from '../decide/edit-pick.js';
import { parcelOf } from '../decide/edit-pick.js';
import { matchPart } from '../decide/village-pick.js';
import { mul3x3, toWorldNormal, type WallHit } from '../decide/artwork.js';
import { isShadowKey } from '../systems/shadow-decal.js';
import type { Ray3 } from '../decide/gizmo-math.js';
import type { OverlayEntry, OverlayHost, RaycastMesh, VillagePick } from './types.js';
import { SNAP, type EditState, type ThreeNS } from './state.js';

export interface Picker {
  /** 이 이벤트 좌표로 광선을 갱신한다. 캔버스 밖이면 `false` */
  castFrom(ev: { clientX: number; clientY: number }): boolean;
  /**
   * **화면 한가운데**로 광선을 갱신한다 (W8-5). 캔버스 크기를 못 재면 `false`.
   *
   * ── 왜 형제 함수인가 — 좌표의 **출처**가 다르다 ──────────────────────────
   * `castFrom` 은 좌표가 **이벤트에서** 온다(마우스·드래그드롭). 그런데 모바일에는 그
   * 이벤트가 없다 — 파일 선택(`<input type="file">`)의 `change` 에는 좌표가 없고,
   * 모바일 브라우저는 파일 드래그드롭을 지원하지 않는다. 그래서 좌표를 **카메라에서**
   * 받는다: 「벽을 화면 가운데 두고 버튼을 누른다」가 조작 모형이다.
   *
   * ⚠ **`castFrom({clientX:0, clientY:0})` 과 다르다.** 그것은 캔버스 **좌상단**을 쏜다.
   * 이 구분이 조용히 틀리면 «버튼을 눌러도 엉뚱한 데가 잡힌다» 가 되고, 화면에서는
   * «가끔 된다» 로만 보인다 — 뮤테이션 축으로 잡아 둔 자리다.
   *
   * ⚠⚠ **이 형태를 고른 것은 팀장 판정 (가)다**(2026-08-17). 「고르기 → 벽 탭」 2단계는
   * 상호배타 불변식 5곳 + `input.ts` 동결(여유 0줄) + 터치 이중 입력을 함께 열어야 한다.
   * 「(나)로 전환할 때 **좌표 공급부만** 교체되면 된다」가 팀장 조건이고, 그래서 이 함수는
   * `castFrom` 과 같은 층에 같은 반환 규약으로 선다.
   */
  castCenter(): boolean;
  /** 광선이 **지면**과 만나는 자리(표면 높이 반영 + 스냅) */
  groundAt(): { x: number; z: number } | null;
  /** 광선이 주어진 높이의 수평면과 만나는 자리(스냅) */
  planeAt(y: number): { x: number; z: number } | null;
  /** 광선에 걸린 오버레이 항목. 없으면 `null` */
  pick(): OverlayEntry | null;
  /**
   * 광선에 걸린 것 **전부**(가까운 순). 기즈모 핸들이 여기 섞여 온다 — 기즈모 그룹도
   * `host.root` 의 자식이라 같은 레이캐스트에 잡히고, 그래서 광선을 두 번 쏘지 않는다.
   */
  intersect(): readonly { object: unknown }[];
  /**
   * 광선에 걸린 **마을 파츠**. 없으면 `null`.
   *
   * `pick()` 과 별개 경로인 이유·환원이 성립하는 조건은 이 파일 헤더와
   * `decide/village-pick.ts` 헤더에 있다.
   */
  pickVillage(): VillagePick | null;
  /**
   * 광선이 맞힌 **면**(점 + 월드 법선). 없으면 `null` (W8-4 D).
   *
   * ⚠ **「벽인가」를 여기서 판정하지 않는다.** 이 함수는 맞힌 면을 **그대로** 준다.
   * 벽 여부는 `decide/artwork.ts` 의 `wallPose()` 가 `null` 로 답한다 — 판정은 순수
   * 계층이 소유하고 여기는 배선이라는 이 저장소의 경계 그대로다. 여기서 걸러 버리면
   * 「왜 안 걸리는가」의 사유가 두 곳으로 갈린다.
   */
  pickFace(): WallHit | null;
  /** 지금 광선. 기즈모 산술이 쓴다(three 타입을 순수 계층에 넘기지 않으려고 평평하게 준다) */
  ray(): Ray3;
  /**
   * 선택 링을 지금 고른 것 위로 놓는다. **무엇이 골라져 있는지는 상태가 안다** —
   * 부르는 쪽이 «오버레이 먼저, 없으면 마을» 순서를 다시 적으면 그 순서가 두 곳이 된다.
   */
  syncMarker(): void;
  dispose(): void;
}

/**
 * 마을 파츠 선택 링의 반경(m).
 *
 * 「어느 것을 골랐나」만 말하면 되므로 실제 치수를 재지 않는다. 마을 파츠는 건물 밑동이
 * 3~8m, 나무가 1~2m 라 그 사이에서 **양쪽 다 알아볼 수 있는** 크기를 골랐다 — 작은
 * 나무에서는 링이 조금 크고 큰 건물에서는 조금 작다. 정확히 감싸려면 파츠 자산의
 * 밑동 반경(`parts/shadow.ts` 의 `measure`)이 필요하고, 그것을 편집으로 끌어오는 값이
 * 이 정밀도보다 크지 않다.
 */
const VILLAGE_MARK_R = 2.2;

export function createPicker(host: OverlayHost, st: EditState): Picker {
  const THREE = host.THREE as ThreeNS;
  const canvas = host.canvas;
  const raycaster = new THREE.Raycaster();

  // ── 선택 표시 ───────────────────────────────────────────────────────────
  // 바닥 링 하나. `MeshBasicMaterial` 은 이 저장소가 두 백엔드에서 이미 쓰는 수단이다
  // (`systems/horizon.ts` 헤더). gizmo 를 안 쓰는 것과 같은 이유로 헬퍼도 안 쓴다.
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0x8b72ff, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide,
  });
  // 지오메트리도 변수로 든다 — `dispose` 에서 재질만 회수하면 링 지오가 남는다(검수관 P3).
  const markerGeo = new THREE.RingGeometry(0.86, 1, 40);
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  marker.renderOrder = 999;
  (host.root as unknown as { add(o: never): void }).add(marker as never);

  function rectOf(): DOMRect {
    return (canvas as unknown as { getBoundingClientRect(): DOMRect }).getBoundingClientRect();
  }

  function castFrom(ev: { clientX: number; clientY: number }): boolean {
    const ndc = ndcOf(ev.clientX, ev.clientY, rectOf());
    if (!ndc) return false;
    raycaster.setFromCamera(ndc, host.camera);
    return true;
  }

  function castCenter(): boolean {
    // 중앙 **클라이언트 좌표**를 지어 `ndcOf` 에 태운다 — NDC `(0,0)` 을 직접 넣지 않는
    // 것이 요점이다. 폭·높이 0 을 거르는 가드가 `ndcOf` 안에 있고(그것이 없으면 나눗셈이
    // `Infinity` 를 내 조용히 아무것도 안 맞는다), 여기서 (0,0)을 손으로 넣으면 그 가드를
    // **우회**한다. 계산 경로가 하나여야 두 함수가 같이 낡거나 같이 고쳐진다.
    const rect = rectOf();
    const ndc = ndcOf(rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
    if (!ndc) return false;
    raycaster.setFromCamera(ndc, host.camera);
    return true;
  }

  function groundAt(): { x: number; z: number } | null {
    const o = raycaster.ray.origin, d = raycaster.ray.direction;
    // 먼저 y=0 으로 잡고, 그 자리의 표면 높이로 한 번 더 잡는다. 잔디(0.07)·도로(0.14)가
    // 서로 다른 높이라 한 번만 재면 물건이 잠기거나 뜬다(감독 발견 2026-08-12 와 같은 축).
    const first = rayPlaneY({ ox: o.x, oy: o.y, oz: o.z, dx: d.x, dy: d.y, dz: d.z }, 0);
    if (!first) return null;
    const sy = host.surfaceAt(first.x, first.z);
    const second = rayPlaneY({ ox: o.x, oy: o.y, oz: o.z, dx: d.x, dy: d.y, dz: d.z }, sy) ?? first;
    return st.snapOn
      ? { x: snapTo(second.x, SNAP), z: snapTo(second.z, SNAP) }
      : second;
  }

  function planeAt(y: number): { x: number; z: number } | null {
    const o = raycaster.ray.origin, d = raycaster.ray.direction;
    const p = rayPlaneY({ ox: o.x, oy: o.y, oz: o.z, dx: d.x, dy: d.y, dz: d.z }, y);
    if (!p) return null;
    return st.snapOn ? { x: snapTo(p.x, SNAP), z: snapTo(p.z, SNAP) } : p;
  }

  /** 맞은 오브젝트에서 **오버레이 항목**을 되찾는다. 마을 파츠는 애초에 대상이 아니다. */
  function entryOf(obj: unknown): OverlayEntry | null {
    let cur = obj as { parent?: unknown } | null;
    const root = host.root as unknown;
    while (cur && (cur as { parent?: unknown }).parent !== root) {
      cur = (cur as { parent?: unknown }).parent as { parent?: unknown } | null;
    }
    if (!cur) return null;
    return host.entries().find((e) => (e.holder as unknown) === cur) ?? null;
  }

  function intersect(): readonly { object: unknown }[] {
    return raycaster.intersectObjects(
      (host.root as unknown as { children: unknown[] }).children, true,
    );
  }

  function pick(): OverlayEntry | null {
    for (const h of intersect()) {
      const e = entryOf(h.object);
      if (e) return e;
    }
    return null;
  }

  /** 맞힌 인스턴스의 이동 성분을 담는다. 클릭당 한 번이라 재사용해도 안전하다 */
  const mat = new THREE.Matrix4();

  function pickVillage(): VillagePick | null {
    const inst = host.instances;
    const vil = host.village;
    // 소비자가 안 물렸으면 마을은 대상이 아니다 — 오버레이만 집던 예전 동작 그대로다.
    if (!inst || !vil) return null;

    // ⚠⚠ **레이캐스트 전에 반드시.** 안 부르면 «멀리 있는 것이 가끔 안 집힌다» 가
    // 기본 동작이고 경고도 예외도 없다(근거·실증은 `instancing.ts` 의 `refreshBounds`).
    inst.refreshBounds();
    const targets = inst.raycastTargets();
    if (targets.length === 0) return null;

    // `false` — 인스턴스 메시 자신이 대상이고 자식은 없다.
    const hits = raycaster.intersectObjects(targets as unknown[], false);
    for (const h of hits) {
      const id = h.instanceId;
      if (typeof id !== 'number') continue;
      const owner = inst.ownerAt(h.object, id);
      // 빈 슬롯(`ZERO` 행렬)은 주인이 없다. 광선에 걸릴 일도 거의 없지만 조기에 끊는다.
      if (!owner) continue;
      // 그림자 데칼은 **집을 수 없는 것**이다. 안 거르면 지면 근처 클릭이 전부 여기서
      // 끝나 «바닥을 눌렀는데 아무것도 안 집힌다» 가 된다. 판정은 `shadow-decal.ts` 소유.
      if (isShadowKey(owner.key)) continue;

      // 여기서 좁힌다 — `instanceId` 가 왔다는 사실이 «인스턴스 메시다» 를 말해 준다.
      (h.object as RaycastMesh).getMatrixAt(id, mat);
      const e = mat.elements;
      // 열 우선 4×4 의 이동 성분은 12·13·14 다.
      const wx = e[12], wy = e[13], wz = e[14];
      if (!Number.isFinite(wx) || !Number.isFinite(wy) || !Number.isFinite(wz)) continue;

      const p = parcelOf(wx, wz, host.cellX, host.cellZ);
      const m = matchPart(vil.partsAt(p.px, p.pz), owner.key, p.lx, p.lz);
      // 환원 실패는 **다음 히트를 본다.** 여기서 `null` 로 끝내면 앞의 한 건 때문에
      // 뒤에 있는 집을 수 있는 것까지 못 집는다.
      if (!m) continue;

      return {
        px: p.px, pz: p.pz, index: m.index, kind: owner.key,
        x: wx, y: wy, z: wz, frozen: vil.isFrozen(p.px, p.pz),
        // ⚠ **맞힌 그 슬롯을 그대로 들고 간다.** 조작 중 실시간 반영이 이것 하나에
        // 달려 있고, 역인덱스를 안 만들어도 되는 이유가 여기다 — 고르는 순간 이미
        // 답이 온다(W4 ②-c 가 «라이브가 그 비용을 낸다» 로 안 만든 그것).
        slot: owner,
      };
    }
    return null;
  }

  /** 레이캐스트 히트에서 벽 검출이 쓰는 필드만. 전부 선택 — 실물이 안 줄 수 있다 */
  type FaceHit = {
    object?: unknown;
    instanceId?: number;
    distance?: number;
    point?: { x: number; y: number; z: number };
    face?: { normal: { x: number; y: number; z: number } } | null;
  };

  /** 히트 하나를 벽으로 환원한다. 못 하면 `null` — 부르는 쪽이 다음 히트를 본다 */
  function faceOf(hit: FaceHit, m: ArrayLike<number> | null): WallHit | null {
    if (!hit.face || !hit.point || !m) return null;
    const n = toWorldNormal(hit.face.normal, m);
    if (!n) return null;
    return { point: { x: hit.point.x, y: hit.point.y, z: hit.point.z }, normal: n };
  }

  /**
   * 오버레이 GLB 의 첫 유효 면 + 그 거리.
   *
   * ⚠⚠ **`intersect()` 를 안 쓴다 — 허용목록으로 쏜다**(검수관 권고 P1). 선택 링(`marker`)과
   * 기즈모 그룹이 **`host.root` 의 자식**이라 `intersect()` 에 그대로 잡히는데, `faceOf` 는
   * 「벽인가」를 판정하지 않고 **법선을 계산할 수 있는 첫 면**을 그대로 낸다. 그래서 광선
   * 앞에 UI 가 있으면 그 면이 이기고 `wallPose` 가 거절해 **뒤에 진짜 벽이 있는데도**
   * «벽에 놓아 주세요» 가 뜬다.
   *
   * 숨은 링도 해당한다 — **three r171 은 레이캐스트에서 `visible` 을 안 본다**(`layers` 만
   * 본다). `marker.visible = false` 는 보호가 아니다.
   *
   * 허용목록으로 잡은 것이 요점이다: `pick()` 이 `entryOf()` 로 **등록된 항목만** 통과시키는
   * 것과 같은 원리이고, 검수관이 짚은 «두 규약이 갈린 축» 을 여기서 닫는다. UI 는
   * 배제 목록에 이름을 올려서가 아니라 **구조적으로** 못 들어온다.
   */
  function faceInOverlay(): { hit: WallHit; d: number } | null {
    const holders = new Set(host.entries().map((e) => e.holder as unknown));
    if (holders.size === 0) return null;
    for (const h of raycaster.intersectObjects([...holders], true)) {
      const hit = h as FaceHit;
      const mw = (hit.object as { matrixWorld?: { elements?: ArrayLike<number> } } | undefined)
        ?.matrixWorld?.elements ?? null;
      const w = faceOf(hit, mw);
      if (w) return { hit: w, d: hit.distance ?? Infinity };
    }
    return null;
  }

  /** 맞힌 인스턴스의 행렬. `pickVillage` 의 `mat` 과 **다른 변수**여야 한다(같은 광선에서 둘 다 쓴다) */
  const faceMat = new THREE.Matrix4();

  /**
   * 마을 파츠(인스턴스 건물·나무)의 첫 유효 면 + 거리 (감독 판정 2026-08-17).
   *
   * ⚠ **법선이 두 변환을 거친다** — 인스턴스 행렬(`getMatrixAt`)과 그 메시의
   * `matrixWorld`. 하나만 곱하면 파셀이 원점에서 멀수록 액자가 엉뚱한 데를 본다.
   * 그리고 마을 파츠는 **비균등 스케일**(`parts/building.ts` 의 `sx: w, sy: h, sz: d`)이라
   * `toWorldNormal` 이 정규행렬을 쓰게 바뀌었다 — 근거는 그 함수 주석 한 곳이다.
   */
  function faceInVillage(): { hit: WallHit; d: number } | null {
    const inst = host.instances;
    if (!inst) return null;
    // ⚠⚠ **레이캐스트 전에 반드시** — 근거는 `pickVillage` 의 같은 줄에 있다.
    inst.refreshBounds();
    const targets = inst.raycastTargets();
    if (targets.length === 0) return null;
    for (const h of raycaster.intersectObjects(targets as unknown[], false)) {
      const hit = h as FaceHit;
      if (typeof hit.instanceId !== 'number') continue;
      const owner = inst.ownerAt(hit.object, hit.instanceId);
      if (!owner) continue;
      // 그림자 데칼은 **벽이 아니다.** 안 거르면 지면 근처 드롭이 여기서 끝나고,
      // 데칼은 눕힌 판이라 `wallPose` 가 어차피 거절해 «왜 안 걸리지» 만 남는다.
      if (isShadowKey(owner.key)) continue;
      (hit.object as RaycastMesh).getMatrixAt(hit.instanceId, faceMat);
      const mw = (hit.object as { matrixWorld?: { elements?: ArrayLike<number> } } | undefined)
        ?.matrixWorld?.elements;
      // 메시가 원점에 있으면 `matrixWorld` 없이도 맞지만 **가정하지 않는다.**
      const m = mw ? mul3x3(mw, faceMat.elements) : faceMat.elements;
      const w = faceOf(hit, m);
      if (w) return { hit: w, d: hit.distance ?? Infinity };
    }
    return null;
  }

  /**
   * 맞힌 면을 그대로 낸다 (W8-4 D). **오버레이 GLB 와 마을 파츠를 둘 다 본다.**
   *
   * ⚠ **우선순위가 아니라 거리로 고른다.** `pick()`/`pickVillage()` 는 «오버레이 먼저,
   * 없으면 마을» 인데 그것은 **고르기**의 규약이고 벽은 다르다 — 광선이 실제로 먼저
   * 맞은 면에 걸려야 한다. 우선순위로 하면 마을 건물 앞에 서서 드롭했는데 뒤편 오버레이
   * GLB 벽에 액자가 걸리고, 화면에서는 «걸었다는데 안 보인다» 로만 보인다.
   */
  function pickFace(): WallHit | null {
    const a = faceInOverlay();
    const b = faceInVillage();
    if (!a) return b?.hit ?? null;
    if (!b) return a.hit;
    return a.d <= b.d ? a.hit : b.hit;
  }

  /** 링을 그 자리에 놓는다. `null` 이면 숨긴다 — 표시의 유일한 자리 */
  function showMarker(at: { x: number; y: number; z: number; r: number } | null): void {
    marker.visible = at !== null;
    if (!at) return;
    marker.scale.setScalar(at.r);
    marker.position.set(at.x, at.y + 0.06, at.z);
  }

  function syncMarker(): void {
    const e = st.selected;
    if (e) {
      const box = new THREE.Box3();
      box.setFromObject(e.holder as never);
      const r = box.min.x === Infinity
        ? 2
        : Math.max(1, Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2);
      showMarker({ x: e.x, y: e.y, z: e.z, r });
      return;
    }
    const v = st.villageSel;
    // 마을 파츠는 holder 가 없다 — `Box3` 로 잴 대상 자체가 없으므로 반경을 상수로 둔다.
    // 정확한 치수는 `parts/shadow.ts` 의 `measure` 가 알지만, 그것을 여기로 끌어오면
    // 편집이 파츠 자산 계층에 붙는다. 「어느 것을 골랐나」에 필요한 정밀도가 아니다.
    showMarker(v ? { x: v.x, y: v.y, z: v.z, r: VILLAGE_MARK_R } : null);
  }

  return {
    castFrom,
    castCenter,
    groundAt,
    planeAt,
    pick,
    pickVillage,
    pickFace,
    intersect,
    ray(): Ray3 {
      const o = raycaster.ray.origin, d = raycaster.ray.direction;
      return { ox: o.x, oy: o.y, oz: o.z, dx: d.x, dy: d.y, dz: d.z };
    },
    syncMarker,
    dispose() {
      (host.root as unknown as { remove(o: never): void }).remove(marker as never);
      markerMat.dispose?.();
      markerGeo.dispose?.();
    },
  };
}
