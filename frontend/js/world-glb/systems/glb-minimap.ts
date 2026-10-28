// world-glb/systems/glb-minimap.ts — **GLB 에서 지도를 굽는다.**
//
// ── 감독 지시 2026-08-26 ────────────────────────────────────────────────────
// *"GLB파일을 임포트 하면. 알아서 지도 만들고, 충돌만들고. 인스턴스.. 등 하게끔해."*
//
// 충돌(`glb-collider.ts`)과 인스턴싱(`glb-instance.js`)은 이미 자동이었다. **지도만
// 아니었다** — `decide/minimap.ts` 가 `roadDirs`·`isPlaza`·`parcelWater` 로 **절차적
// 파셀 규칙에서** 지도를 만들기 때문이다. 지금 자산은 그 도시를 내보낸 파일이라 우연히
// 거의 맞지만, **블렌더에서 얹은 조형물은 지도에 없고 임의 GLB 는 완전히 틀린다.**
//
// 팀장 조건 2(2026-08-26)가 「미니맵 산출물」을 GLB 어댑터 대상으로 **명시적으로 열어
// 둔** 세 자리 중 하나다.
//
// ── 왜 렌더러로 «찍지» 않는가 ───────────────────────────────────────────────
// 정투영 카메라로 한 번 렌더해 텍스처를 뜨는 방법이 더 «진짜 같은» 그림을 준다. 안 고른
// 이유 셋:
//   ① **백엔드 의존**: `readRenderTargetPixels` 가 WebGPU 에서는 async 이고, 이 저장소는
//      *"헤드리스는 WebGL, 감독 실기기는 WebGPU"* 사각을 이미 갖고 있다. 부팅 경로에
//      백엔드 분기를 새로 여는 것은 그 사각을 넓힌다.
//   ② **부팅 타이밍**: 렌더러가 서고 씬이 준비된 뒤에야 찍을 수 있는데, 미니맵 기능은
//      `pools` 단계에서 조립된다. 순서를 뒤집으면 조립 순서 계약이 흔들린다.
//   ③ **검증 불가**: 헤드리스는 `preserveDrawingBuffer:false` 라 픽셀을 되읽을 수 없다 —
//      「지도가 구워졌는가」를 잴 축이 없어진다. 이 회차에 검은 화면을 눈으로만 보고
//      엉뚱한 데를 판 사고가 정확히 그 형태였다.
//
// 그래서 **씬 그래프만 읽어 캔버스에 직접 칠한다.** 메시마다 월드 바운딩을 구해 위에서
// 본 사각형으로 놓는다. 렌더러를 안 쓰므로 백엔드와 무관하고, 결과가 캔버스라
// **검사가 픽셀을 셀 수 있다.**
//
// ⚠ **못 하는 것**: 회전한 물체는 축정렬 사각형으로 뭉개진다(바운딩이라 그렇다) ·
// 텍스처 무늬는 안 나온다(재질 기본색만) · 지붕 아래 것은 위에 있는 것에 가린다.
// 지도로서는 충분하지만 **항공사진이 아니다.**

import * as THREE from 'three/webgpu';
import type { Object3D } from 'three/webgpu';

/** 구운 지도 한 장 */
export interface GlbMap {
  /** 정사각 캔버스. 북쪽(−Z)이 위다 */
  canvas: HTMLCanvasElement;
  /** 이 지도가 덮는 월드 범위 — 화면 좌표 환산에 쓴다 */
  min: { x: number; z: number };
  max: { x: number; z: number };
  /** 칠한 메시 수 — 진단용. 0 이면 지도가 비었다는 뜻이고 그것은 사실이 아니어야 한다 */
  painted: number;
}

/** 한 변 픽셀 수. 미니맵이 148px 이므로 확대해도 뭉개지지 않을 만큼만 크게 잡는다 */
const PX = 512;
/** 이보다 작은 것은 안 그린다(m). 잔디·자갈까지 그리면 지도가 노이즈가 된다 */
const MIN_SPAN = 1.2;

/** 재질에서 색을 꺼낸다. 못 꺼내면 `null` — 부르는 쪽이 기본색을 쓴다 */
function colorOf(mat: unknown): string | null {
  const m = mat as { color?: { isColor?: boolean; getHexString?(): string } } | null;
  if (!m?.color?.isColor || typeof m.color.getHexString !== 'function') return null;
  return `#${m.color.getHexString()}`;
}

/**
 * 씬을 훑어 위에서 본 지도를 굽는다. **부팅 1회**용이다.
 *
 * ⚠ **인스턴싱 «전» 트리를 준다.** `InstancedMesh` 하나는 바운딩이 한 덩어리라
 * **7,229개가 사각형 하나**로 뭉개진다.
 */
export function bakeGlbMap(root: Object3D): GlbMap | null {
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return null;

  root.updateMatrixWorld(true);
  const world = new THREE.Box3().setFromObject(root as never);
  if (world.isEmpty()) return null;

  const spanX = world.max.x - world.min.x;
  const spanZ = world.max.z - world.min.z;
  if (spanX <= 0 || spanZ <= 0) return null;
  // 정사각 캔버스에 넣으므로 **긴 변**을 기준으로 맞춘다 — 짧은 축이 늘어나면 지도가
  // 실제 비율과 달라지고, 그러면 「저기까지 얼마나 남았나」가 틀린다.
  const span = Math.max(spanX, spanZ);
  const originX = (world.min.x + world.max.x) / 2 - span / 2;
  const originZ = (world.min.z + world.max.z) / 2 - span / 2;
  const scale = PX / span;

  const canvas = doc.createElement('canvas');
  canvas.width = PX;
  canvas.height = PX;
  const g = canvas.getContext('2d');
  if (!g) return null;
  // 바탕 — 지도에 아무것도 없는 자리(세계 밖)다.
  g.fillStyle = '#1a1712';
  g.fillRect(0, 0, PX, PX);

  // ── 낮은 것부터 칠한다 ────────────────────────────────────────────────────
  // 지면 → 도로 → 건물 순으로 쌓여야 위에서 본 그림이 된다. 높이(바운딩 `max.y`)로
  // 정렬하면 그 순서가 저절로 나온다 — 「무엇이 지면인가」를 판정할 필요가 없다.
  const items: { x: number; z: number; w: number; h: number; y: number; c: string }[] = [];
  const box = new THREE.Box3();
  root.traverse((o: Object3D) => {
    const m = o as { isMesh?: boolean; visible?: boolean; material?: unknown; geometry?: unknown };
    if (!m.isMesh || !m.geometry || m.visible === false) return;
    box.setFromObject(o as never);
    if (box.isEmpty()) return;
    const w = box.max.x - box.min.x;
    const h = box.max.z - box.min.z;
    if (w < MIN_SPAN && h < MIN_SPAN) return;
    items.push({
      x: (box.min.x - originX) * scale,
      z: (box.min.z - originZ) * scale,
      w: Math.max(1, w * scale),
      h: Math.max(1, h * scale),
      y: box.max.y,
      c: colorOf(Array.isArray(m.material) ? m.material[0] : m.material) ?? '#6b6152',
    });
  });
  items.sort((a, b) => a.y - b.y);

  for (const it of items) {
    g.fillStyle = it.c;
    g.fillRect(it.x, it.z, it.w, it.h);
  }

  return {
    canvas,
    min: { x: originX, z: originZ },
    max: { x: originX + span, z: originZ + span },
    painted: items.length,
  };
}
