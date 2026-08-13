// world2/decide/edit-pick.ts — 편집 모드의 좌표 계산. **순수 함수만. three 무의존.**
//
// 편집 모드는 화면에서만 확인되는 것이 대부분이지만(드래그감·선택감), 그 아래 깔린
// 산술은 three 없이 잴 수 있다. 여기 두면 헤드리스에서 재는 것과 감독 화면에서 보는 것이
// 갈리지 않는다 — `parcel-layout.ts` 가 판정/집행을 가른 것과 같은 이유다.

export interface RayLike {
  readonly ox: number; readonly oy: number; readonly oz: number;
  readonly dx: number; readonly dy: number; readonly dz: number;
}

export interface RectLike {
  readonly left: number; readonly top: number;
  readonly width: number; readonly height: number;
}

/**
 * 클라이언트 좌표 → NDC(-1..1). 캔버스 폭·높이가 0 이면 `null`(레이캐스트 불가).
 *
 * 0 을 거르는 이유: 폭 0 이면 나눗셈이 `Infinity` 를 내고, 그것을 그대로 레이캐스터에
 * 넣으면 조용히 아무것도 안 맞는다. 원인이 화면에 안 드러나는 형태라 여기서 끊는다.
 */
export function ndcOf(cx: number, cy: number, r: RectLike): { x: number; y: number } | null {
  if (!(r.width > 0) || !(r.height > 0)) return null;
  return {
    x: ((cx - r.left) / r.width) * 2 - 1,
    y: -(((cy - r.top) / r.height) * 2 - 1),
  };
}

/**
 * 광선 ∩ 수평면(y = planeY). 평행하거나 **뒤쪽에서** 만나면 `null`.
 *
 * 뒤쪽(t < 0)을 거르는 것이 요점이다 — 하늘을 클릭하면 광선이 위를 향하는데, 부호를
 * 안 보면 카메라 **뒤** 지면에 물건이 놓인다. 감독 화면에는 아무 일도 안 일어난 것처럼
 * 보이고 물건은 등 뒤 어딘가에 쌓인다.
 */
export function rayPlaneY(ray: RayLike, planeY: number): { x: number; z: number } | null {
  if (!Number.isFinite(ray.dy) || Math.abs(ray.dy) < 1e-6) return null;
  const t = (planeY - ray.oy) / ray.dy;
  if (!Number.isFinite(t) || t <= 0) return null;
  const x = ray.ox + ray.dx * t;
  const z = ray.oz + ray.dz * t;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { x, z };
}

/** 격자 스냅. `step <= 0` 이면 스냅하지 않는다(자유 배치). */
export function snapTo(v: number, step: number): number {
  if (!(step > 0) || !Number.isFinite(v)) return v;
  return Math.round(v / step) * step;
}

/**
 * 월드 좌표가 어느 파셀의 어디인가. `parcel-builder.ts:203` 의 `ox = px * cellX` 와 짝이다
 * — 파셀 원점이 셀 중심이므로 반올림으로 인덱스를 얻고 나머지가 로컬 좌표다.
 *
 * `surfaceY(px, pz, lx, lz)` 에 그대로 넣으라고 만든 함수다. 그 함수가 파셀 로컬 좌표를
 * 받는데, 편집은 월드 좌표로만 클릭을 받는다.
 */
export function parcelOf(
  x: number, z: number, cellX: number, cellZ: number,
): { px: number; pz: number; lx: number; lz: number } {
  const px = Math.round(x / cellX);
  const pz = Math.round(z / cellZ);
  return { px, pz, lx: x - px * cellX, lz: z - pz * cellZ };
}

/**
 * 스케일을 배수로 민다. 곱셈인 것은 **작은 물건과 큰 물건이 같은 손맛을 내야** 하기
 * 때문이다 — 덧셈이면 s=0.05 에서 한 번 누르면 20배가 되고 s=50 에서는 표도 안 난다.
 * 클램프는 계약(`decide/overlay.ts` 의 `S_MIN`·`S_MAX`)이 하므로 여기서 안 한다.
 */
export function scaleBy(s: number, factor: number): number {
  const n = s * factor;
  return Number.isFinite(n) && n > 0 ? n : s;
}
