// world-glb/decide/village-rules.ts — **마을이 얼마나 빽빽한가**의 판정. 순수 함수. three 무의존.
//
// ── 왜 별도 파일인가 ────────────────────────────────────────────────────────
// 감독 요구는 *"너가 만든 규율을 내가 편집하고"* 다. 그 규율을 화면 슬라이더로 열면
// **같은 곱셈이 세 곳**에 살게 된다 — `main.ts`(부팅), 슬라이더 UI(표시), 테스트(검증).
// 이 저장소가 색·수치·임계값에서 세 번 데인 값 미러링이 그 형태다.
//
// 그래서 곱셈을 여기 한 곳에 두고 셋이 **같은 함수**를 부른다. 규칙이 바뀌면 셋이 함께
// 바뀐다 — 어긋날 자리가 없다.

import { DEFAULT_LAYOUT } from '../parts/types.js';
import type { LayoutOptions, ResolvedLayout } from '../parts/types.js';

/** 노브 배수 셋. 전부 1 이면 기본 마을이다. */
export interface VillageMul {
  /** 건물·나무를 **함께** 올린다. 기존 `?density=` 로, 부하 시험용이라 이름을 유지한다 */
  density: number;
  /** 건물만 */
  building: number;
  /** 나무만 */
  tree: number;
}

/**
 * 노브 범위. 셋이 같은 것은 우연이 아니라 **같은 축**(배수)이기 때문이다.
 *
 * ⚠ **`MUL_MIN` 을 1 아래로 내리지 마라 — 편집의 놓기 상한이 여기에 기대고 있다**
 * (검수관 비블로커 1, 2026-08-14).
 *
 * `edit/actions.ts` 의 `placePartAt` 은 파셀당 상한을 `maxPartsPerParcel(kind)` 로 묻는데
 * **인자 없이**(= `DEFAULT_LAYOUT` 기준) 부른다. 실제 슬롯 예산(`parcel-builder.ts` 의
 * `poolBudget`)이 보는 것은 노브가 만든 레이아웃이다. 두 곳이 어긋나도 지금 안전한
 * 이유가 **이 하한 하나**다 — 배수가 1 이상이므로 노브 레이아웃의 `maxBuildings`·
 * `maxTrees` 는 언제나 기본값 이상이고, 편집은 «더 엄격히 거절하는» 쪽으로만 틀린다.
 *
 * 0.5 같은 값을 허용하면 노브가 예산을 **줄이는데** 편집은 기본값 기준으로 허용해
 * 초과가 성립하고, 그 결과는 «그 구역이 가끔 덜 그려진다» 로만 드러난다.
 */
export const MUL_MIN = 1;
export const MUL_MAX = 8;

/**
 * 곱 결과의 상한. **새 노브가 기존 노브보다 극단적인 값을 못 만들게 한다.**
 *
 * `density` 하나만 있던 시절의 최대치가 `maxBuildings 4×8 = 32`·`maxTrees 8×8 = 64` 였다.
 * `density × building` 을 그대로 두면 4×8×8 = 256 이 되는데, 그것은 **아무도 재본 적 없는
 * 세계**다(스모크도 게이트도 8 을 상한으로 돌았다). 축을 가르는 것과 범위를 넓히는 것은
 * 다른 일이고, 여기서는 앞의 것만 한다.
 *
 * 상한을 넓히려면 그 값으로 `smoke:vite` 와 `tests/world2-density-overlap.test.ts` 를
 * 먼저 돌려 본 뒤에 한다.
 */
export const MAX_BUILDINGS = DEFAULT_LAYOUT.maxBuildings * MUL_MAX;
export const MAX_TREES = DEFAULT_LAYOUT.maxTrees * MUL_MAX;

const clampMul = (v: number): number => {
  const n = Math.round(v);
  return Number.isFinite(n) ? Math.min(MUL_MAX, Math.max(MUL_MIN, n)) : MUL_MIN;
};

/**
 * 배수를 실제 레이아웃으로 만든다.
 *
 * 전부 1 이면 **`DEFAULT_LAYOUT` 을 그대로 돌려준다**(새 객체를 만들지 않는다). 기본
 * 세션이 참조 동등성을 유지해야 `main.ts` 의 *"밀도 1이면 기본 레이아웃"* 최적화가
 * 살아 있고, 무엇보다 **감독이 매일 보는 화면이 이 파일을 지나지 않는다**는 것이
 * 눈으로 확인된다.
 */
export function villageLayout(mul: Partial<VillageMul>, extra?: Partial<LayoutOptions>): ResolvedLayout {
  const density = clampMul(mul.density ?? MUL_MIN);
  const building = clampMul(mul.building ?? MUL_MIN);
  const tree = clampMul(mul.tree ?? MUL_MIN);
  const hasExtra = extra !== undefined && Object.keys(extra).length > 0;
  if (density === 1 && building === 1 && tree === 1 && !hasExtra) return DEFAULT_LAYOUT;
  return {
    ...DEFAULT_LAYOUT,
    maxBuildings: Math.min(MAX_BUILDINGS, DEFAULT_LAYOUT.maxBuildings * density * building),
    maxTrees: Math.min(MAX_TREES, DEFAULT_LAYOUT.maxTrees * density * tree),
    ...extra,
  };
}
