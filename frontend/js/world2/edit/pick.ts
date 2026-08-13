// world2/edit/pick.ts — **화면 좌표 → 세계 좌표**, 그리고 «무엇을 집었나».
//
// 산술 자체는 `decide/edit-pick.ts` 가 순수 함수로 갖고 있다(three 없이 시험 가능).
// 여기 있는 것은 그 함수들을 **실제 카메라·씬에 물리는 배선**이다 — 광선을 쏘고, 맞은
// 것에서 오버레이 항목을 되찾고, 선택 링을 그 자리에 놓는다.
//
// ⚠ **마을 파츠는 애초에 대상이 아니다.** `host.root` 아래만 훑으므로 건물·나무는 광선에
// 걸려도 항목으로 환원되지 않는다(`entryOf` 가 `null`). 그것을 집게 만드는 것이 W4 이고,
// 그때는 개수 불변식과 좌표 결정론을 함께 건드리므로 별도 단계로 잡혀 있다.

import { ndcOf, rayPlaneY, snapTo } from '../decide/edit-pick.js';
import type { OverlayEntry, OverlayHost } from './types.js';
import { SNAP, type EditState, type ThreeNS } from './state.js';

export interface Picker {
  /** 이 이벤트 좌표로 광선을 갱신한다. 캔버스 밖이면 `false` */
  castFrom(ev: { clientX: number; clientY: number }): boolean;
  /** 광선이 **지면**과 만나는 자리(표면 높이 반영 + 스냅) */
  groundAt(): { x: number; z: number } | null;
  /** 광선이 주어진 높이의 수평면과 만나는 자리(스냅) */
  planeAt(y: number): { x: number; z: number } | null;
  /** 광선에 걸린 오버레이 항목. 없으면 `null` */
  pick(): OverlayEntry | null;
  /** 선택 링을 그 항목 위로. `null` 이면 숨긴다 */
  syncMarker(e: OverlayEntry | null): void;
  dispose(): void;
}

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

  function castFrom(ev: { clientX: number; clientY: number }): boolean {
    const rect = (canvas as unknown as { getBoundingClientRect(): DOMRect }).getBoundingClientRect();
    const ndc = ndcOf(ev.clientX, ev.clientY, rect);
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

  function pick(): OverlayEntry | null {
    const hits = raycaster.intersectObjects(
      (host.root as unknown as { children: unknown[] }).children, true,
    );
    for (const h of hits) {
      const e = entryOf(h.object);
      if (e) return e;
    }
    return null;
  }

  function syncMarker(e: OverlayEntry | null): void {
    marker.visible = e !== null;
    if (!e) return;
    const box = new THREE.Box3();
    box.setFromObject(e.holder as never);
    const r = box.min.x === Infinity
      ? 2
      : Math.max(1, Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2);
    marker.scale.setScalar(r);
    marker.position.set(e.x, e.y + 0.06, e.z);
  }

  return {
    castFrom,
    groundAt,
    planeAt,
    pick,
    syncMarker,
    dispose() {
      (host.root as unknown as { remove(o: never): void }).remove(marker as never);
      markerMat.dispose?.();
      markerGeo.dispose?.();
    },
  };
}
