// world10/diag-ahead.ts — **「떴다」와 「보인다」를 가르는 축.**
//
// ── 왜 별 파일인가 ──────────────────────────────────────────────────────────
// `main.ts` 안에 두었더니 파일 크기 게이트가 잡았다(1262→1284). 진단은 조립부의 관심사가
// 아니므로 밖으로 낸다 — world7 이 같은 이유로 `glb-diag.js` 를 갖고 있다.
//
// ── 왜 필요한가 (실측 2026-08-26) ───────────────────────────────────────────
// world8 을 포크로 다시 세운 첫 회차에 **화면이 완전히 검었다.** 수치는 전부 정상이었다:
//
//   콘솔 에러 0 · GLB 28,707 메시 · 삼각형 135만 · triAvg 120만 · 기능 10개 · sky "daylit"
//
// 그래서 나는 하늘·그림자·재질·톤매핑을 차례로 의심했고 **전부 헛다리였다.** 답은 이
// 훅 한 줄이 즉시 말해 줬다:
//
//   정면 0.3m — inst:블렌더_조형물×1   ← 화면 전체가 이것 하나였다
//
// 조형물이 스폰 코앞에 서서 시야를 통째로 막고 있었다. **세계는 처음부터 정상이었다.**
//
// ⚠ 헤드리스는 `preserveDrawingBuffer:false` 라 픽셀을 되읽을 수 없고, 스크린샷은
// 「검다」까지만 말하고 **왜 검은지**는 말하지 않는다. 그 틈을 재는 축이 이것뿐이다.
//
// ⚠⚠ **`visible:false` 도 잡힌다** — three 의 레이캐스트는 가시성을 안 본다. 화면에
// 없는 것이 목록에 뜨는 것은 버그가 아니라 그 사실이고, 그래서 `vis` 를 함께 낸다.

import * as THREE from 'three/webgpu';
import type { Camera, Scene } from 'three/webgpu';

/** 레이캐스트 결과 중 이 파일이 쓰는 것만. `three/webgpu` 가 `Intersection` 을 안 낸다 */
interface Hit {
  distance: number;
  object: { name: string; visible: boolean; parent: { name: string } | null };
}

export interface AheadHit {
  /** 카메라에서의 거리(m) */
  d: number;
  name: string;
  /** 부모 이름 — 어느 레이어의 것인지 (`world8:glb-source` 등) */
  parent: string;
  /** 화면에 그려지는가. `false` 면 재워둔 것이다 */
  vis: boolean;
}

/** 카메라 정면으로 쏴서 앞에 놓인 것을 가까운 순으로 `n` 개 돌려준다. */
export function aheadOf(scene: Scene, camera: Camera, n = 6): AheadHit[] {
  const rc = new THREE.Raycaster();
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  rc.set(camera.position, dir);
  rc.far = (camera as unknown as { far: number }).far;
  return (rc.intersectObject(scene as never, true) as unknown as Hit[])
    .slice(0, n)
    .map((h) => ({
      d: +h.distance.toFixed(1),
      name: h.object.name || '(무명)',
      parent: h.object.parent?.name || '',
      vis: h.object.visible,
    }));
}
