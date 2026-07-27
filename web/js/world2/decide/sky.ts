// world2/decide/sky.ts — 하늘·구름 판정. 순수 함수만, import 0.
//
// ── 구름도 개수 불변식을 지킨다 ──────────────────────────────────────────────
// 구름은 InstancedMesh **하나**다. 부팅 때 최대 개수로 잡고 세션 내내 그 수가 변하지 않는다.
// "멀리 가면 구름을 더 만든다" 같은 설계를 쓰지 않는 이유는 파셀에서와 같다 — 개수가 변하는
// 순간 파이프라인·드로우콜이 흔들리고, 그게 우리가 없애려는 스파이크다.
//
// 그래서 구름은 **순환**한다. 바람에 밀려 경계를 넘으면 반대편으로 되돌린다(랩어라운드).
// 같은 40장이 영원히 도는 것이고, 그 사실이 눈에 띄지 않을 만큼 넓게 흩어두는 게 배치의 일이다.

/** 구름이 도는 정사각 영역의 한 변(월드 미터). 이 밖으로 나가면 반대편으로 감긴다. */
export const CLOUD_FIELD = 900;

export interface CloudSpec {
  /** 시작 위치(월드) */
  x: number;
  z: number;
  /** 고도 */
  y: number;
  /** 가로·세로 크기 */
  w: number;
  h: number;
  /** Y축 회전 — 같은 텍스처를 돌려 써도 반복이 덜 보이게 */
  ry: number;
  /** 불투명도 배수(0~1) */
  alpha: number;
}

/**
 * 32비트 해시 — parcel-layout과 같은 순차 믹싱을 쓴다.
 * XOR 결합을 쓰면 서로 다른 인덱스가 같은 값으로 뭉쳐 구름이 겹쳐 보인다.
 */
function hash1(n: number): number {
  let h = 0x9e3779b9;
  h = Math.imul(h ^ (n | 0), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

const rand = (n: number, salt: number) => hash1(n * 73856093 + salt) / 4294967296;

export interface CloudLayout {
  count: number;
  /** 고도 범위 */
  minY: number;
  maxY: number;
  /** 크기 범위 */
  minSize: number;
  maxSize: number;
  field?: number;
}

export const DEFAULT_CLOUDS: CloudLayout = {
  count: 40, minY: 120, maxY: 260, minSize: 90, maxSize: 240,
};

/**
 * 구름 배치. 결정론적이므로 새로고침해도 같은 하늘이다.
 *
 * 고도와 크기에 상관을 준다 — 높이 뜬 것을 크게 만들면 원근이 어긋나 하늘이 낮아 보인다.
 * 높은 구름일수록 작고 옅게 둔다.
 */
export function cloudLayout(opts: CloudLayout = DEFAULT_CLOUDS): CloudSpec[] {
  const o = { ...DEFAULT_CLOUDS, ...opts };
  const field = o.field ?? CLOUD_FIELD;
  const out: CloudSpec[] = [];
  for (let i = 0; i < o.count; i++) {
    const t = rand(i, 0x11);                       // 고도 비율 0~1
    const y = o.minY + (o.maxY - o.minY) * t;
    // 높을수록 작게 — 원근 일관성.
    const sizeT = 1 - t * 0.55;
    const w = o.minSize + (o.maxSize - o.minSize) * sizeT * (0.7 + rand(i, 0x22) * 0.6);
    out.push({
      x: (rand(i, 0x33) - 0.5) * field,
      z: (rand(i, 0x44) - 0.5) * field,
      y,
      w,
      h: w * (0.42 + rand(i, 0x55) * 0.22),        // 가로로 퍼진 비율
      ry: rand(i, 0x66) * Math.PI * 2,
      alpha: 0.5 + (1 - t) * 0.4 + rand(i, 0x77) * 0.1, // 높을수록 옅게
    });
  }
  return out;
}

/**
 * 바람에 밀린 위치. **경계를 넘으면 반대편으로 감는다.**
 *
 * 나머지 연산으로 감으므로 시간이 얼마나 흘렀든 위치가 항상 영역 안이다 — 오래 켜 둔 뒤
 * 구름이 저 멀리 사라지는 일이 없다. 플레이어 위치를 중심으로 감아서, 어디로 걸어가든
 * 하늘이 비지 않는다.
 */
export function driftedX(
  baseX: number, elapsedS: number, windX: number, centerX: number, field = CLOUD_FIELD,
): number {
  return wrap(baseX + windX * elapsedS, centerX, field);
}

export function driftedZ(
  baseZ: number, elapsedS: number, windZ: number, centerZ: number, field = CLOUD_FIELD,
): number {
  return wrap(baseZ + windZ * elapsedS, centerZ, field);
}

/** `center`를 중심으로 한 폭 `field` 구간 안으로 감는다. */
export function wrap(v: number, center: number, field: number): number {
  if (!Number.isFinite(v) || !(field > 0)) return center;
  const half = field / 2;
  let d = v - center;
  d = ((d + half) % field + field) % field - half; // 음수 나머지 보정
  return center + d;
}

/**
 * 하늘 그라디언트 색을 세로 위치로 보간한다.
 *
 * `stops`는 위치(0=지평, 1=천정) 오름차순이어야 한다. 정렬을 요구하는 대신 검사만 하고,
 * 어긋나면 그대로 쓴다 — 색 데이터는 사람이 손으로 넣는 것이라 조용히 재정렬하면 의도와
 * 다른 하늘이 나오고 원인을 찾기 어렵다.
 */
export interface SkyStop { at: number; color: number }

export function validStops(stops: readonly SkyStop[]): boolean {
  if (stops.length < 2) return false;
  for (let i = 1; i < stops.length; i++) if (stops[i].at <= stops[i - 1].at) return false;
  return stops[0].at <= 0 && stops[stops.length - 1].at >= 1;
}

/** 0~1 높이에서의 색(0xRRGGBB). 구간 사이는 선형 보간. */
export function skyColorAt(stops: readonly SkyStop[], t: number): number {
  if (stops.length === 0) return 0;
  const y = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  if (y <= stops[0].at) return stops[0].color;
  for (let i = 1; i < stops.length; i++) {
    if (y <= stops[i].at) {
      const a = stops[i - 1], b = stops[i];
      const span = b.at - a.at;
      const k = span > 1e-9 ? (y - a.at) / span : 0;
      return mixHex(a.color, b.color, k);
    }
  }
  return stops[stops.length - 1].color;
}

/**
 * 구름 한 장의 최종 색. **인스턴스별 투명도를 색으로 옮긴다.**
 *
 * `MeshBasicMaterial.opacity`는 재질 전역이라 구름 40장에 각각 다른 투명도를 줄 수 없다.
 * 투명도별로 재질을 나누면 개수 불변식이 깨진다(파이프라인 조합 증가) — 그건 우리가 없애려는
 * 바로 그것이다. 그래서 다른 길을 쓴다: 알파 블렌딩에서 **배경색에 가까운 픽셀은 겹쳐도 눈에
 * 띄지 않는다.** 옅어야 할 구름은 색을 지평선색 쪽으로 당긴다. 보이는 결과는 "옅다"와 같고
 * 재질은 하나 그대로다.
 *
 * 이 함수가 생긴 경위: `cloudLayout`이 `alpha`를 계산해 두었는데 집행 쪽(systems/sky.ts)이
 * 그 값을 **한 번도 읽지 않았다.** 40장이 전부 최대 불투명으로 겹쳐 그려져 하늘이 얼룩졌고
 * 감독이 실기기에서 "노이즈가 많다"고 보고했다. 판정과 집행을 나눈 구조에서는 이렇게 값이
 * 계산만 되고 소비되지 않는 누락이 생길 수 있다 — 그래서 색 결정을 순수 함수로 끌어내려
 * 테스트가 소비를 강제하게 만든다.
 */
export function cloudTint(
  spec: CloudSpec,
  base: number,
  rim: number,
  horizon: number,
  minY: number,
  maxY: number,
): number {
  const span = Math.max(1e-6, maxY - minY);
  const raw = Number.isFinite(spec.y) ? (spec.y - minY) / span : 0;
  const t = Math.min(1, Math.max(0, raw));
  // 높이 뜬 구름일수록 햇빛을 더 받은 인상 — 림 쪽으로 기울인다.
  const lit = mixHex(base, rim, 0.35 + t * 0.4);
  const a = Number.isFinite(spec.alpha) ? Math.min(1, Math.max(0, spec.alpha)) : 1;
  return mixHex(lit, horizon, 1 - a);
}

/** 두 hex 색을 선형 혼합. 감마는 무시한다(하늘 그라디언트에서는 차이가 눈에 띄지 않는다). */
export function mixHex(a: number, b: number, k: number): number {
  const t = Math.min(1, Math.max(0, k));
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
