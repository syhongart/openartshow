// world2/decide/orbit.ts — **대상을 중심으로 도는 시점**의 산술. 순수 함수만.
//
// 감독 카드 판정 2026-08-13: 「시점(E3)까지 만들고 한 번에」. 그 앞 판정이
// 「world2 안을 블렌더처럼 개편」이었다.
//
// ── 왜 «도는 것» 이 필요한가 ────────────────────────────────────────────────
// 지금 편집의 시점은 **우드래그로 고개만 돌리는 것**이다(`features/overlay.ts` 의
// `look`). 제자리에서 둘러볼 수는 있어도 **건물 뒤로 돌아가 볼 수는 없다** — 옮긴 것이
// 뒤에서 어떻게 보이는지가 편집에서 가장 자주 필요한 확인인데 그게 안 된다.
//
// ── 이 파일이 모르는 것 ─────────────────────────────────────────────────────
// 플레이어도, 카메라도, 충돌도 모른다. **«어디에 서서 어디를 볼 것인가» 만** 안다.
// 그래서 three 없이 잴 수 있고, 소비자가 (A-2)(플레이어에 문을 연다)든 (C)(자유
// 카메라)든 같은 산술을 쓴다.
//
// ── yaw 규약은 `systems/player.ts` 의 `facing` 이 소유한다 ──────────────────
// `facing(yaw) = { x: -sin(yaw), z: -cos(yaw) }`. 여기서 그 식을 **다시 적지 않고**
// 그것과 맞물리는 역함수만 유도한다 — 두 곳에 적으면 한쪽만 고쳐도 아무도 모른다
// (이 저장소가 값 미러링으로 여섯 번 데인 형태).
//
//   대상 (cx,cz) 를 (px,pz) 에서 바라보는 yaw = atan2(px - cx, pz - cz)
//
// 유도: `facing` 이 (cx-px, cz-pz) 방향이어야 하므로
//   -sin(yaw) ∝ cx-px,  -cos(yaw) ∝ cz-pz  →  yaw = atan2(px-cx, pz-cz)
//
// **그래서 궤도각과 시선각이 같은 수다** — 중심에서 플레이어로 향하는 각도 θ 를 그대로
// yaw 로 쓰면 언제나 중심을 본다. 이 우연이 아래 `orbitStep` 을 짧게 만든다.

/** 어디에 서서 어디를 보는가 */
export interface OrbitPose {
  x: number;
  z: number;
  /** 중심을 바라보는 시선각(rad) */
  yaw: number;
}

/**
 * 궤도 반경의 하한(m).
 *
 * 0 을 허용하면 중심에 서게 되고 그 순간 **각도가 정의되지 않는다**(atan2(0,0) = 0 이라
 * 조용히 한 방향으로 튄다). 하한이 있으면 아무리 줌해도 대상 밖에 남는다.
 *
 * 3m 인 근거: 마을 건물의 최대 반경이 그 언저리다(`parts/building.ts` 가 폭·깊이를
 * 각각 뽑는다). 더 가까우면 건물 **안**에 들어가 벽만 보인다.
 *
 * ⚠ **화면에서만 판정된다.** 이 값은 근거가 아니라 출발점이고, 감독이 «더 붙고 싶다» 고
 * 하면 노브로 열어 판정을 받는다.
 */
export const R_MIN = 3;

/**
 * 궤도 반경의 상한(m).
 *
 * 80m 인 근거는 **스트리밍**이다 — 그 밖으로 나가면 대상이 있는 파셀이 언로드 대상이
 * 되어 «돌다 보니 건물이 사라진다» 가 난다(`decide/lod.ts` 의 밴드). 정확한 경계를
 * 여기 적지 않는 이유는 그 값이 저쪽 소유이기 때문이다 — 넉넉히 안쪽에 둔다.
 *
 * ⚠ **이 상한은 충돌과 무관하다** (검수관 권고, 2026-08-13). 첫 판본은 근거를 스트리밍
 * 하나로만 적었고, 다음 사람이 그것을 «그러니 충돌도 괜찮겠지» 로 읽을 여지가 있었다.
 * 실제로는 반대다 — 충돌 캐시(`systems/collision.ts` 의 `rebuild`)는 **호출 자리 기준
 * 3×3 파셀**뿐이라 커버가 훨씬 좁고, 이 반경은 **그것을 이미 넘는다.** 그 사각이 실물
 * 결함이었다(편집 종료 복원이 건물을 통과했다). 처방은 여기가 아니라 소비자 쪽에 있다 —
 * `systems/player.ts` 의 `RESTORE_STEP` 한 곳이다. **두 상한을 같은 것으로 읽지 마라.**
 */
export const R_MAX = 80;

/** 픽셀당 궤도 회전(rad). 800px 가로지르면 반 바퀴 — 화면 폭 한 번에 뒤가 보인다 */
export const ORBIT_YAW_PER_PX = Math.PI / 800;

/**
 * 픽셀당 눈높이 증분(m). `Shift`+드래그가 쓴다.
 *
 * 0.1 이면 400px(화면 절반쯤)을 끌어 40m — 상한(`LIFT_MAX`)까지 한 번에 간다.
 * 한 동작으로 끝까지 갈 수 있어야 «올라가려면 몇 번을 끌어야 하나» 가 안 생긴다.
 */
export const ORBIT_LIFT_PER_PX = 0.1;

/**
 * 휠 한 칸당 반경 배수. 1 보다 크면 멀어진다.
 *
 * **곱셈인 것이 요점** — 가까이서는 조금, 멀리서는 많이 움직여야 같은 손맛이 난다
 * (`decide/edit-pick.ts` 의 `scaleBy` 와 같은 근거).
 */
export const ZOOM_PER_NOTCH = 1.1;

/**
 * 대상을 바라보는 시선각. `from` 이 중심과 **같은 자리**면 `null`(각도가 없다).
 *
 * `null` 을 내는 것이 요점이다 — 0 을 내면 «북쪽을 본다» 와 «모른다» 가 구별되지 않고,
 * 부르는 쪽이 그 차이를 화면에서야 알게 된다.
 */
export function yawTo(from: { x: number; z: number }, cx: number, cz: number): number | null {
  const dx = from.x - cx;
  const dz = from.z - cz;
  if (dx === 0 && dz === 0) return null;
  return Math.atan2(dx, dz);
}

/**
 * 눈에서 대상을 내려다보는 각(rad). **음수가 아래**다.
 *
 * 부호 규약은 `systems/player.ts` 의 `look()` 이 소유한다 — 그것이
 * `lookBy(-dx*s, -dy*s)` 이므로 «마우스를 아래로(화면 y 증가) → pitch 감소» 이고,
 * 따라서 **아래를 보는 것이 음수**다. 여기서 그 규약을 다시 정하지 않는다.
 *
 * @param eyeY   눈의 월드 높이(m)
 * @param targetY 대상의 월드 높이(m)
 * @param r      수평 거리(m). 0 이면 바로 발밑이라 −90°에 수렴한다
 */
export function pitchTo(eyeY: number, targetY: number, r: number): number {
  // `atan2` 를 쓰는 이유: `r === 0` 에서 나눗셈이 터지지 않고 ±π/2 로 수렴한다.
  // 클램프는 `clampPitch`(player.ts)가 소유하므로 여기서 안 한다 — 그 한계를 두 곳에
  // 적으면 한쪽만 고쳐도 아무도 모른다.
  return -Math.atan2(eyeY - targetY, r);
}

/**
 * 중심 주위로 **한 걸음 돈다.** 새 자리와 그 자리에서 중심을 보는 시선각을 낸다.
 *
 * ── 왜 «절대 각도» 가 아니라 «델타» 인가 ────────────────────────────────────
 * 지금 서 있는 자리에서 이어져야 하기 때문이다. 절대 각도를 받으면 궤도를 시작하는
 * 순간 카메라가 **튄다** — 감독이 보던 방향과 무관한 자리로 순간이동한다.
 *
 * ── 반경을 클램프하는 자리가 여기다 ────────────────────────────────────────
 * 소비자가 각자 클램프하면 «휠은 막히는데 드래그는 안 막힌다» 같은 형태가 난다.
 *
 * @param from     지금 서 있는 자리
 * @param cx,cz    궤도 중심(고른 것, 없으면 소비자가 화면 중앙 지면을 넣는다)
 * @param dYaw     이번에 돌 각(rad)
 * @param kRadius  반경 배수(1 = 그대로)
 */
export function orbitStep(
  from: { x: number; z: number },
  cx: number,
  cz: number,
  dYaw: number,
  kRadius: number,
): OrbitPose {
  const dx = from.x - cx;
  const dz = from.z - cz;
  const r0 = Math.hypot(dx, dz);

  // ⚠ **중심에 서 있으면 각도가 없다.** 그때는 «돌» 방향이 정의되지 않으므로 지금
  // 시선을 유지하는 대신 **하한 반경으로 밀어낸다** — 그러지 않으면 아무리 드래그해도
  // 화면이 안 움직이고(반경 0 은 회전해도 같은 자리), 감독은 «궤도가 고장났다» 로 읽는다.
  const theta = r0 === 0 ? 0 : Math.atan2(dx, dz);

  const r = clampRadius(r0 * (Number.isFinite(kRadius) && kRadius > 0 ? kRadius : 1));
  const a = theta + (Number.isFinite(dYaw) ? dYaw : 0);

  return {
    x: cx + r * Math.sin(a),
    z: cz + r * Math.cos(a),
    // 궤도각이 곧 시선각이다(헤더의 유도). 다시 `yawTo` 를 부르면 방금 만든 좌표에서
    // 같은 각을 **되계산**하는 것이라 부동소수 오차만 얻는다.
    yaw: a,
  };
}

/** 반경을 허용 범위로. 유한하지 않으면 하한 */
export function clampRadius(r: number): number {
  if (!Number.isFinite(r)) return R_MIN;
  return Math.min(R_MAX, Math.max(R_MIN, r));
}

/**
 * 휠 노치 수 → 반경 배수. 위로 굴리면(음수 deltaY) 가까워진다.
 *
 * 브라우저의 `deltaY` 는 단위가 제각각이라(픽셀·줄·페이지) **부호만** 본다 —
 * 크기를 그대로 쓰면 트랙패드에서 한 번에 화면 밖으로 날아간다.
 */
export function zoomFactor(deltaY: number): number {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 1;
  return deltaY > 0 ? ZOOM_PER_NOTCH : 1 / ZOOM_PER_NOTCH;
}
