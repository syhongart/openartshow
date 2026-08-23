// chibi-shadow.ts — 치비 프리뷰에서 **어느 메시가 그림자를 드리우는가**의 SSOT.
//
// ── 왜 생겼나 (2026-08-07, 감독 신고 "한 템포 느리게 반응해") ────────────────
//   캐릭터 편집기 프리뷰가 프레임당 98 draw 를 쓰고 있었고 그 절반이 그림자였다.
//   `rebuildPreview()` 가 **모든 메시**에 `castShadow = true` 를 걸어, 그림자맵이 같은
//   캐릭터를 depth pass 로 통째로 한 번 더 그렸다.
//       98 = 49(본체 45 + 바닥·shadowCatcher·벽 3 + 배경 1) + 45(depth) + 4(VSM blur)
//
// ── 무엇을 거르는가 — 아웃라인 셸 하나뿐이다 ────────────────────────────────
//   `addOutline`(chibi-materials.ts:92)이 원본 메시의 **자식으로** BackSide 셸을 붙인다.
//   치비 45메시 중 **20개가 이것**이다. 셸은 원본을 감싼 복제본이므로, 원본이 caster 로
//   남아 있는 한 셸이 그림자에 새로 기여할 수 있는 것이 **없다** — 이건 실측이 아니라
//   **기하가 보증한다.** 20 draw 를 공짜로 쓰고 있었다.
//       98 → 78 draw (-20.4%), 그림자 depth pass 45 → 25 (-44%)
//   룩 손실은 원리적으로 0이고, 조건이 한 줄이며, 조정할 값이 없다.
//
// ── 왜 "작은 파츠도 거르기"를 안 했나 — 판정이 뒤집힌 기록 ──────────────────
//   후보 비교에서 권고안은 **셸 제외 + 반지름 0.08 미만 제외**(98→65 draw, -33.7%)였다.
//   근거는 *"비셸 파츠 반지름이 정강이 0.075 다음 발 0.1025 로 뛴다 — 0.08 은 그 갭에
//   놓은 값이다"* 였고, 4룩 × 정지/점프에서 육안차 픽셀 0개까지 확인돼 있었다.
//
//   **그 갭은 사람 기본 룩에만 있었다.** 임계 근처 밴드를 검사하는 테스트를 붙이자마자
//   세 룩 전부 실패했다. 전 룩(사람·고양이·개·토끼·곰·양·장식풀)의 반지름을 합집합으로
//   줄 세우면 0.08 근처가 이렇다:
//       … 0.074  0.075  0.0756  0.077  0.0815  0.082 │ 0.1075 …
//   토끼의 0.077 과 장식 룩의 0.0815 가 "갭"을 메운다. **실제 갭은 0.082 → 0.1075**
//   (0.0255)이고, 0.08 은 갭이 아니라 **파츠 6개가 몰린 자리 한복판**이었다. 크기가 9%
//   밖에 차이 안 나는 두 파츠(0.075 와 0.082)의 운명이 갈리는 자리다.
//
//   임계를 진짜 갭 한복판(≈0.095)으로 옮기면 **모든 룩에 있는 0.082 파츠 2개가 빠지므로
//   육안차 0 이라는 검증이 무효가 된다** — 다시 재야 하고, 그 왕복만큼 값이 또 흔들린다.
//   얻는 것은 13 draw(78→65, 전체의 6%)뿐이다. 메인 씬 렌더 스킵(render-gate.ts)이 이미
//   프레임당 115 draw 를 걷어냈으므로 여기서 매직넘버를 안고 갈 이유가 약하다.
//
//   **경계: 여기서 멈춘다.** 반지름 기준을 다시 열려면 먼저 위 분포를 다시 재고, 임계가
//   실제 갭 안에 있는지 확인하고, 그 임계로 육안 비교를 **다시** 해야 한다. 앞의 셋 중
//   하나라도 건너뛰면 같은 고리를 또 돈다. (분포를 재는 방법은
//   `tests/chibi-shadow.test.ts` 의 `countShadowCasters(...).radii` 다.)
//
// ── 기각된 다른 후보 (다시 열지 않기 위해 적는다) ───────────────────────────
//   · **그림자맵 해상도·blurSamples 축소**: draw 가 **한 개도 안 준다**(98 그대로).
//     해상도는 픽셀 처리량 축이고 여기 병목은 draw call 축이다 — 다른 축이다. 게다가
//     그림자 진하기가 20.4→19.4 로 **룩만 바뀐다.** 비용은 그대로 두고 룩을 잃는 자리.
//   · **프록시 캡슐 2개로 대체**(-41.8%): 감독이 이미 반려한 blobShadow 와 같은 방향으로
//     회귀한다. 발밑 그림자가 좁아지고(면적 85%) 옅어지며(-18%), 확대하면 발 바깥쪽이
//     밝게 뜬다. 성능이 더 나와도 **되돌린 판정을 다시 되돌리지 않는다.**
//   · **그림자맵 2프레임마다 갱신**(-41.8%): 정지 상태 손실은 0이지만 **동작 중 그림자가
//     1프레임 지연되는 것을 못 쟀다**(포즈를 고정해 재는 하네스라 그 축이 측정에 안
//     들어온다). 못 잰 것을 이득으로 세지 않는다.

import * as THREE from 'three';

interface MeshLike {
  isMesh?: boolean;
  parent?: { isMesh?: boolean } | null;
  material?: { side?: number } | { side?: number }[];
  geometry?: {
    boundingSphere?: { radius: number } | null;
    computeBoundingSphere?(): void;
  };
}

/**
 * 아웃라인 셸인가 — `addOutline` 이 원본 메시의 **자식으로** 붙인 BackSide 복제본.
 *
 * 부모가 메시라는 것과 BackSide 라는 것을 **둘 다** 본다. 어느 한쪽만 보면 오탐이 난다:
 * 메시의 자식이지만 셸이 아닌 파츠가 있을 수 있고, BackSide 를 쓰는 독립 파츠도 있을 수
 * 있다. 둘을 함께 만족하는 것은 `addOutline` 이 만든 것뿐이다.
 */
export function isOutlineShell(o: MeshLike): boolean {
  if (!o.parent || !o.parent.isMesh) return false;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  return mats.some((m) => m && m.side === THREE.BackSide);
}

/**
 * 이 메시의 로컬 바운딩 반지름. 아직 계산되지 않았으면 계산시킨다.
 * 지금 caster 판정에는 쓰지 않는다 — 위 "판정이 뒤집힌 기록" 절의 분포를 다시 잴 때 쓴다.
 */
export function meshRadius(o: MeshLike): number {
  const g = o.geometry;
  if (!g) return 0;
  if (!g.boundingSphere && typeof g.computeBoundingSphere === 'function') g.computeBoundingSphere();
  return g.boundingSphere ? g.boundingSphere.radius : 0;
}

/** 이 메시가 그림자를 드리워야 하는가 — 아웃라인 셸만 아니면 드리운다. */
export function shouldCastShadow(o: MeshLike): boolean {
  if (!o.isMesh) return false;
  return !isOutlineShell(o);
}

interface Traversable {
  traverse(fn: (o: unknown) => void): void;
}

/**
 * 치비 그룹의 그림자 caster 를 배선한다. 재조립마다 새 그룹이라 매번 부른다.
 *
 * `castShadow = false` 도 **명시적으로** 쓴다 — 기본값에 기대면, 나중에 어딘가에서
 * 전부 true 로 켜는 코드가 생겼을 때 이 함수가 그것을 되돌리지 못한다.
 */
export function applyPreviewShadowCasters(group: Traversable): void {
  group.traverse((o) => {
    const m = o as MeshLike;
    if (!m.isMesh) return;
    (m as { castShadow?: boolean }).castShadow = shouldCastShadow(m);
  });
}

/** caster 배선 통계(검증·진단용 순수 가산). 렌더 경로에서는 쓰지 않는다. */
export function countShadowCasters(group: Traversable): {
  meshes: number; shells: number; casters: number; radii: number[];
} {
  let meshes = 0, shells = 0, casters = 0;
  const radii: number[] = [];
  group.traverse((o) => {
    const m = o as MeshLike;
    if (!m.isMesh) return;
    meshes++;
    if (isOutlineShell(m)) { shells++; return; }
    radii.push(meshRadius(m));
    if (shouldCastShadow(m)) casters++;
  });
  return { meshes, shells, casters, radii };
}
