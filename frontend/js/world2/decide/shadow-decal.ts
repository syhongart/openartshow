// world2/decide/shadow-decal.ts — 파츠 그림자 데칼의 **판정**. 순수 함수만.
//
// ── 왜 데칼인가 (감독 판정 2026-08-11) ──────────────────────────────────────
// 실시간 태양 그림자는 폐지했다. 이동 중 명멸했고, 감독이 `?shint=0` 화면을 *"제일 낫다"*
// 로 판정했다(경위는 `main.ts` 의 `SHADOW_INTENSITY` 주석 한 곳). 그런데 그림자가 아예
// 없으니 물건이 땅에 놓인 게 아니라 **떠 보인다** — 접지감이 사라졌다.
//
// 감독: *"그림자 베이킹해서 하는거 아냐?"* → 캐스터마다 **눕힌 평면 인스턴스**를 하나씩
// 붙이고, 실루엣은 부팅 때 구운 캔버스 아틀라스에서 읽는다. 그림자가 파츠 하나가 되므로
// 파셀 수명·tier·성장·수축·슬롯 예산이 전부 기존 구조에서 따라온다.
//
// ── 이 파일이 소유하는 것 ───────────────────────────────────────────────────
// 태양 → 지면 기저, 그림자 치수, 데칼 자세, 아틀라스 격자, 시간대 농도. **전부 산술이고
// three 를 모른다.** 굽는 쪽(`parts/shadow.ts`)과 놓는 쪽(`systems/shadow-decal.ts`)이
// 같은 함수를 보게 하는 것이 요점이다 — 한쪽이 자기 식으로 다시 계산하면 실루엣과 자세가
// 어긋나고, 그것은 화면에서 "그림자가 물건에서 떨어져 있다" 로만 드러난다.

import { DEFAULT_LAYOUT } from '../parts/types.js';
import type { SkyTime } from './night.js';

// ── 상수 — 노브의 fallback 이 되는 SSOT. `main.ts` 는 이것을 읽어 `readNum` 한다 ──

/** 그림자 농도(알파 배수). `?shdark` */
export const SHADOW_DENSITY = 0.45;

/** 블러 반경을 셀 픽셀에 대한 비로. 0 이면 하드 실루엣. `?shsoft` */
export const SHADOW_SOFT = 0.12;

/** 꼬리 끝 알파. 1 이면 균일한 띠, 0 이면 끝이 사라진다. `?shtail` */
export const SHADOW_TAIL = 0.2;

/**
 * 데칼이 놓이는 높이(m). 도로(0.14)보다 위여야 도로 위에도 그림자가 진다. `?shy`
 *
 * z-fighting 은 기기마다 깊이 정밀도가 달라 여기서 다 막을 수 없다 — 그래서 노브로 연다.
 * 재질 쪽 `depthWrite:false` 가 1차 방어이고 이 높이가 2차다.
 */
export const SHADOW_Y = 0.20;

/**
 * 그림자 **길이 상한**(m). 셀 한 변. `?shlen`
 *
 * ── 왜 상한이 필요한가 (팀장 조건 1 의 설계 단계 판정) ─────────────────────
 * 노을 고도는 12.3°(`sky.js` 의 `sunEl`)라 `cot ≈ 4.58` 이다. 타워(60m)의 물리적 그림자는
 * **275m — 8.6셀**이 된다. 상한 없이 두면 셋이 동시에 터진다:
 *   ① 스트리밍 가장자리에서 **로드되지 않은 땅 위**로 뻗어 허공에 뜬다.
 *   ② 데칼에는 자기 차폐가 없다 — 그 275m 띠가 도로·건물·다른 그림자를 그대로 관통해
 *      지나가고, 화면에서는 그것이 고장으로 읽힌다.
 *   ③ 투명 쿼드 면적이 8.6배가 되어 필레이트가 무너진다(이 기능의 실제 비용은 드로우콜이
 *      아니라 **투명 면적**이다. 그래서 이 상한이 곧 성능 손잡이다).
 *
 * ── 왜 클립도 페이드도 아닌 클램프인가 ─────────────────────────────────────
 * **클립**(프러스텀에서 잘라내기)은 잘린 자리가 하드컷으로 보인다. **페이드**(경계 근처
 * 알파 0)는 데칼이 파셀 경계를 알아야 하는데 데칼은 파셀을 모르고, 알게 만들면 이웃
 * 파셀의 로드 상태까지 물어야 한다 — 데칼 하나가 스트리밍을 참조하기 시작한다.
 * **클램프는 `cot` 를 자르는 것뿐**이라 실루엣이 잘리지 않고 그냥 짧아진다. 굽는 쪽과
 * 놓는 쪽이 같은 `shadowSpan` 을 보므로 어긋날 자리도 없다.
 *
 * 32m 는 데칼이 **자기 파셀의 바로 이웃 링을 넘지 않는다**는 뜻이다. 스트리밍 최외곽
 * (76.8m)에서는 그 이웃이 없을 수 있지만 그 거리의 안개율이 100% 다(`decide/fog.ts`) —
 * **재본 대가이지 짐작이 아니다.**
 *
 * ⚠ 아직 안 잰 것: 노을에서 이 상한이 **화면에 보이는가**(그림자가 부자연스럽게 뚝 끊긴
 * 것처럼 읽히는가). 감독 실기기 `?time=sunset` 판정으로 닫는다.
 */
export const SHADOW_MAX_LEN = DEFAULT_LAYOUT.cellX;

/**
 * 시간대별 농도 배수.
 *
 * 반구광 세기로 시간대를 추측하지 않는다 — `features/types.ts` 가 그 규약을 명시한다.
 * 밤에 0.35 인 것은 달빛 그림자가 실제로 옅기 때문이고, 이 값이 0 이 아닌 것은 밤에도
 * 접지감이 필요하기 때문이다(그림자가 통째로 사라지면 밤에만 물건이 다시 뜬다).
 */
export const DENSITY_BY_TIME: Readonly<Record<SkyTime, number>> = {
  day: 1, sunset: 0.8, night: 0.35,
};

// ── 태양 → 지면 기저 ────────────────────────────────────────────────────────

/** 그림자가 뻗는 지면 방향(단위벡터)과 길이 배수 */
export interface SunGround {
  /** 그림자가 뻗는 방향 x — 태양 수평 성분의 **반대** */
  ux: number;
  uz: number;
  /** 길이 배수 = cot(고도). 높이 h 인 물체의 그림자 길이가 `h·cot` 이다 */
  cot: number;
}

/**
 * 광원 방향에서 지면 그림자 기저를 유도한다. 지평선 아래거나 정수리면 null.
 *
 * ── 방향을 어디서 읽는가 — **미러링 0** ────────────────────────────────────
 * `SUN_AZ`·고도표를 여기로 복사하지 않는다. `systems/sky.ts` 의 `applySun()` 이 매 프레임
 * `sun.position` 과 `sun.target.position` 을 쓰고 있으므로, **그 둘의 차이를 정규화한 것**이
 * 곧 광원 방향이다. 밤에 달 방위(`MOON_AZ`)로 넘어가는 것도 공짜로 따라온다 — 태양표를
 * 복사했다면 밤에 그림자가 엉뚱한 쪽을 가리켰을 것이고, 그것은 화면에서만 드러난다.
 *
 * @param dx,dy,dz 씬 → 광원 방향(정규화 가정)
 */
export function sunGround(dx: number, dy: number, dz: number): SunGround | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(dz)) return null;
  // 지평선 아래(또는 정확히 수평)면 그림자가 지면에 정의되지 않는다. 무한히 긴 그림자를
  // 상한으로 잘라 그리는 것보다 **안 그리는 편**이 정직하다 — 해가 진 순간에 세계 전체가
  // 32m 짜리 띠로 덮이는 것이 더 큰 사고다.
  if (!(dy > 1e-3)) return null;
  const h = Math.hypot(dx, dz);
  // 정수리 태양 — 수평 성분이 0 이라 방향이 정의되지 않는다. 그림자는 발밑 원이 되므로
  // 임의 방향(+Z)을 주고 `cot = 0` 으로 밑동만 남긴다.
  if (h < 1e-6) return { ux: 0, uz: 1, cot: 0 };
  return { ux: -dx / h, uz: -dz / h, cot: h / dy };
}

// ── 그림자 치수 ─────────────────────────────────────────────────────────────

/** 그림자 하나의 치수. **굽는 쪽과 놓는 쪽이 이것을 공유한다** */
export interface ShadowSpan {
  /** 전체 길이(m) = 밑동 지름 + 뻗는 길이 */
  len: number;
  /** 폭(m) = 밑동 지름 */
  width: number;
  /**
   * 전체 길이에서 밑동 지름이 차지하는 비(0~1).
   *
   * **이 값이 이 설계에서 가장 조용히 어긋나기 쉬운 자리다.** 캔버스는 이것으로 밑동
   * 블롭의 크기를 정하고, 자세는 이것으로 평면을 캐스터에 정렬한다. 페인터가 자기 상수로
   * 계산하면 그림자 밑동이 물건에서 떨어져 나오는데, 산술 테스트는 양쪽 다 통과한다.
   * 그래서 **한 함수에서 함께 나온다.**
   */
  blobFrac: number;
}

/**
 * 캐스터 하나의 그림자 치수를 유도한다.
 *
 * @param h      캐스터 높이(m)
 * @param r      캐스터 밑동 반경(m)
 * @param g      `sunGround` 결과
 * @param maxLen 뻗는 길이의 상한(m). `SHADOW_MAX_LEN` 또는 `?shlen`
 */
export function shadowSpan(h: number, r: number, g: SunGround, maxLen: number): ShadowSpan {
  const rr = Math.max(0.05, r);
  const cast = Math.min(Math.max(0, h) * g.cot, Math.max(0, maxLen));
  const len = rr * 2 + cast;
  return { len, width: rr * 2, blobFrac: (rr * 2) / len };
}

// ── 데칼 자세 ───────────────────────────────────────────────────────────────

/** 데칼 인스턴스 하나의 자세. y 는 호출자가 `SHADOW_Y` 로 준다 */
export interface DecalPose {
  x: number;
  z: number;
  ry: number;
  sx: number;
  sz: number;
}

/**
 * 데칼 평면의 자세를 유도한다.
 *
 * ── 좌표 규약 — **여기가 부호를 손으로 유도하면 반반 확률로 틀리는 자리다** ──
 * 데칼 지오는 `PlaneGeometry(1,1).rotateX(-π/2)` 다. 회전을 실제로 풀어 보면
 * `(x, y, 0) → (x, 0, -y)` 이므로 **평면의 +Y(=UV v=1)가 로컬 −Z 로 간다.**
 * 여기에 `CanvasTexture` 의 `flipY`(기본 true)가 겹쳐 **캔버스 픽셀 y=0(셀 위쪽)이
 * v=1, 즉 로컬 −Z** 에 대응한다.
 *
 * 그래서 규약을 이렇게 못 박는다:
 *
 *     캔버스 셀 **위쪽** = 발밑 = 로컬 −Z        캔버스 셀 **아래쪽** = 그림자 끝 = 로컬 +Z
 *
 * 즉 그림자는 **로컬 +Z 방향으로 뻗는다.** three 의 Y축 회전 θ 는 로컬 (0,0,1) 을 월드
 * `(sinθ, 0, cosθ)` 로 보내므로, 그것을 `(ux, uz)` 와 같게 두면 **`ry = atan2(ux, uz)`** 다.
 *
 * 위치는 **밑동 중심이 캐스터 중심에 오도록** 민다. 밑동 중심은 평면 로컬 z 로
 * `−0.5 + blobFrac/2` 지점이고, 월드로는 중심에서 `(−len/2 + r)` 만큼이다. 뒤집으면
 * `평면중심 = 캐스터중심 + (len/2 − r)·(ux, uz)`.
 *
 * ⚠ 이 유도가 맞는지는 **산술로 확인되지 않는다** — 부호를 뒤집어도 식은 그럴듯하고,
 * 화면 증상은 "그림자가 해 쪽에 있다" 라 눈에는 즉시 보인다. 그래서 테스트가 실제
 * three 행렬을 조립해 로컬 (0,0,+0.5) 의 월드 위치를 본다(`world2-shadow-decal.test.ts`).
 */
export function decalTransform(
  casterX: number, casterZ: number, span: ShadowSpan, g: SunGround,
): DecalPose {
  const back = span.len / 2 - span.width / 2;
  return {
    x: casterX + g.ux * back,
    z: casterZ + g.uz * back,
    ry: Math.atan2(g.ux, g.uz),
    sx: span.width,
    sz: span.len,
  };
}

// ── 아틀라스 격자 ───────────────────────────────────────────────────────────

export interface AtlasCell {
  /** 캔버스 픽셀 사각 */
  px: number; py: number; size: number;
  /** UV 사각(0~1). 지오메트리에 구워 넣는다 */
  u0: number; v0: number; u1: number; v1: number;
}

export interface AtlasGrid {
  cols: number;
  cellPx: number;
  cellOf(i: number): AtlasCell;
}

/**
 * 아틀라스 격자를 유도한다. 셀 수가 늘어도 넘치지 않는다.
 *
 * 격자를 `4×4` 처럼 **고정으로 적지 않는 이유**: 캐스터 파츠는 늘어난다(다리·간판 같은
 * 것이 백로그에 있다). 고정 격자는 아홉 번째 캐스터가 생기는 날 조용히 남의 셀을 읽고,
 * 그 증상은 "특정 물건의 그림자만 이상하다" 로 나타난다.
 *
 * ⚠ 셀 픽셀에 하한을 두지 않는다 — 캐스터가 아주 많아지면 셀이 작아져 실루엣이 뭉개진다.
 * 그때 늘려야 하는 것은 아틀라스 크기이고, 그 판단을 여기서 삼키면 안 된다. 대신
 * 레지스트리 테스트가 `cellPx` 하한을 단언해 **넘어가는 순간 빨간불**이 되게 한다.
 */
export function atlasGrid(count: number, atlasPx: number): AtlasGrid {
  const n = Math.max(1, Math.ceil(count));
  const cols = Math.ceil(Math.sqrt(n));
  const cellPx = Math.floor(atlasPx / cols);
  return {
    cols,
    cellPx,
    cellOf(i: number): AtlasCell {
      const cx = i % cols;
      const cy = Math.floor(i / cols);
      const px = cx * cellPx;
      const py = cy * cellPx;
      // UV 를 셀 경계에서 **반 텍셀 안쪽으로** 물린다. 경계를 정확히 쓰면 선형 필터링이
      // 이웃 셀을 반 텍셀 빨아들여, 밑동 옆에 남의 그림자 자락이 비친다(밉맵에서 더 심하다).
      const inset = 0.5 / atlasPx;
      return {
        px, py, size: cellPx,
        u0: px / atlasPx + inset,
        v0: 1 - (py + cellPx) / atlasPx + inset,
        u1: (px + cellPx) / atlasPx - inset,
        v1: 1 - py / atlasPx - inset,
      };
    },
  };
}

// ── 농도 ────────────────────────────────────────────────────────────────────

/** 시간대 배수를 곱한 최종 농도. 0~1 로 잘린다 */
export function densityFor(time: SkyTime, base: number): number {
  const m = DENSITY_BY_TIME[time] ?? 1;
  return Math.min(1, Math.max(0, base * m));
}
