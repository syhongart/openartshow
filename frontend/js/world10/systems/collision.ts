// world2 충돌 — **조회와 캐시.** 판정 산술은 `decide/collide.ts` 가 한다.
//
// 이 파일이 있는 이유는 하나다: **매 프레임 세계 전체를 뒤지지 않기 위해서.**
// 감독 우려(*"이거 하면 많이 무거워지지 않나"*, 2026-08-08)에 대한 실제 답이 여기 있다.
//
// ── 어떻게 가볍나 ──────────────────────────────────────────────────────────
// ① **근처 3×3 파셀만 본다.** 도시가 아무리 넓어져도 검사 대상은 그대로다 — 비용이
//    **세계 크기와 무관**하다. world1 은 로드된 파셀 전체를 돌았고(`world.js` 의 `blocked`),
//    그 형태는 스트리밍 범위가 늘면 같이 무거워진다.
// ② **파셀을 넘을 때만 다시 만든다.** 플레이어가 한 파셀 안에 있는 동안 목록은 그대로다.
//    파셀 폭이 32m 라 재계산은 수십 초에 한 번 수준이고, 그 사이 프레임들은 **배열 순회만**
//    한다.
// ③ **씬에 아무것도 안 넣는다.** 프록시는 숫자 배열이다 — 드로우콜·지오메트리·텍스처가
//    하나도 안 는다. 성능 게이트 `[7]`(개수 불변식)·`[7.6]`(드로우콜 대조군)이 보는 값을
//    건드리지 않는다. ⚠ **다만 그 게이트들은 CPU 시간을 재지 않는다** — 이 파일이
//    무거워져도 스모크는 초록이다. 그래서 ①②를 구조로 못 박아 둔 것이다.
//
// ── 왜 System 이 아닌가 ────────────────────────────────────────────────────
// 커널의 `System` 으로 만들면 플레이어 이동과 **다른 프레임에** 돌게 되고(등록 순서 계약),
// 한 프레임 늦은 보정은 벽을 뚫었다 되돌아오는 떨림으로 보인다. 충돌은 이동을 **적용하기
// 전에** 끼어들어야 해서, `PlayerSystem` 이 함수로 주입받는 형태가 맞다 — 물 판정
// (`waterSurfaceY`)이 이미 그 패턴이고 같은 문법을 따른다.
//
// ── 이 파일이 **하지 않는 것** ─────────────────────────────────────────────
// · **3×3 은 전부 `near` 로 본다.** 여기 원래 `tierFor(거리, null)` 로 tier 를 정하고
//   *"밴드 경계의 파셀은 **잠깐** 서로 다른 tier 를 볼 수 있다 … 최소 한 칸(32m) 떨어져
//   있어 몸이 닿지 않는다"* 라고 적혀 있었는데 **두 문장 다 거짓이었다**(검수관 실측):
//   ① `nearEnter = 1.15` 인데 대각 4칸의 거리는 `√2 = 1.414` 라 **잠깐이 아니라 상시**
//      `mid` 로 강등됐다. 히스테리시스와 무관하다. 그래서 `tiers: ['near']` 인 `planter`
//      가 대각 파셀에서 통째로 빠졌다(121파셀 대조 100건, 전부 planter).
//   ② *"최소 한 칸(32m)"* 은 파셀 **중심** 사이 거리다. 파셀 **내용물**은 경계에서
//      `margin`(2.5m) 안쪽까지 온다 — 실제 최소 간격은 32m 가 아니라 2.5m 였다.
//   동작은 그때도 안전했지만(planter 유효 반경 0.85m < 2.5m) **안전을 준 것은 32m 도
//   3×3 도 아니라 `margin` 이었다.** 지금은 전부 `near` 로 봐서 그 논증 자체가 필요 없다 —
//   원 개수는 평균 88 → 91 수준으로 늘 뿐이고, `collide.ts` 가 선언한 *"보이는 자리 =
//   막히는 자리"* 가 저절로 참이 된다.
// · **스트리밍이 실제로 로드했는지 안 본다.** `parcelLayout` 이 순수·결정적이라 로드 여부와
//   무관하게 같은 답이 나온다. 즉 **아직 안 그려진 건물에도 막힌다** — 로딩 중 벽을
//   통과하는 것보다 이쪽이 낫다고 봤다.

import { parcelLayout, DEFAULT_LAYOUT, type LayoutOptions } from '../decide/parcel-layout.js';
import { blockersOf, slide, type Blocker } from '../decide/collide.js';
import type { PlacedPart } from '../parts/types.js';

export interface ColliderOptions {
  /**
   * **동결된 파셀의 배치.** `null` 이면 계산한다(`parcelLayout`).
   *
   * 빌더(`parcel-builder.ts`)가 받는 것과 **같은 함수**를 받는 것이 조건이다 — 조립부가
   * 한쪽에만 주입하면 렌더와 충돌이 다른 마을을 보게 되고, 그 증상은 «건물은 저기 있는데
   * 여기서 막힌다» 다. 충돌은 언제나 `near` 로 묻는다(3×3 전부 `near` 로 보는 이유는
   * 아래 「하지 않는 것」 ①).
   *
   * 충돌 계층이 계약(`decide/overlay.ts`)을 직접 import 하지 않는 것도 빌더와 같다 —
   * 조회 함수 하나만 받는다.
   */
  frozenAt?(px: number, pz: number, tier: 'near' | 'mid' | 'far'): readonly PlacedPart[] | null;

  /**
   * 파셀 배치 규칙. **셀 크기도 여기서 읽는다** — `layout.cellX`/`cellZ`.
   *
   * ⚠ 여기 원래 `cellX?`·`cellZ?` 가 **따로** 있었고 `layout` 에도 같은 필드가 있었다
   * (검수관 지적 P4). 호출부는 `createCollider({ cellX: CELL_X, cellZ: CELL_Z, layout })`
   * 처럼 둘 다 넘겼고, 그러면 **한쪽만 바꿨을 때 조회 격자와 배치 격자가 어긋난다** —
   * 증상은 "파셀 경계 근처에서만 벽이 없다" 로 나타나 원인을 짚기 어렵다.
   * 값이 하나뿐인 곳으로 좁혔다.
   */
  layout?: LayoutOptions;
  /** 플레이어 몸 반경(m). 기본값과 그 근거는 `DEFAULT_BODY_R` 한 곳이다 */
  bodyRadius?: number;
}

export interface Collider {
  /** 이동을 해석해 실제로 갈 수 있는 좌표를 낸다 */
  resolve(x: number, z: number, dx: number, dz: number): { x: number; z: number };
  /** 지금 캐시에 든 원 개수 — 진단용(테스트가 "정말 뭔가 보고 있는가" 를 확인한다) */
  count(): number;
  /**
   * 캐시를 버린다 — 다음 `resolve` 가 다시 만든다.
   *
   * ⚠ **이 문이 없으면 편집이 반쪽이 된다.** 캐시는 «플레이어가 선 파셀» 로만 갱신되므로
   * (`rebuild` 의 `cachePx`/`cachePz`), 감독이 **제자리에 선 채** 건물을 옮기면 그 파셀은
   * 그대로라 캐시가 안 바뀐다 → 옮긴 건물의 **옛 자리에 계속 막히고** 새 자리는 통과한다.
   * 화면과 몸이 다른 말을 하는 형태이고, 편집 중에는 바로 그 자세가 기본이다.
   */
  invalidate(): void;
}

/**
 * 플레이어 몸 반경(m).
 *
 * ── 왜 0.34 인가 — **여기 근거가 없었다**(검수관 지적 P3) ────────────────────
 * `ColliderOptions.bodyRadius` 주석은 *"빌더 아바타(0.34)와 같은 수준"* 이라고 적고
 * 있었는데, world1 계열(`world.js`·`visit.js`)의 플레이어 반경은 **0.3** 이다. 두 값이
 * 다른 것 자체는 문제가 아니지만(빌더 아바타와 1인칭 플레이어는 다른 것이다) **어느
 * 쪽을 따랐는지 읽는 사람이 알 수 없었다.**
 *
 * 판정: **0.3 보다 크게 잡는다.** 이유는 이 충돌이 원 하나로 몸을 근사하고
 * (`decide/collide.ts`) 파츠 쪽 원도 `footprint` 로 근사하기 때문이다 — 양쪽이 근사면
 * 오차가 겹치는 방향은 **뚫리는 쪽**이고, 감독 지시가 *"뚫고 가면 안 됨"* 이다(#71).
 * 0.04m 는 그 방향의 여유다. 어깨너비 40cm 를 원으로 감싸는 값이기도 하다.
 *
 * **여기가 이 값의 SSOT 다** — `tests/world2-grid.test.ts` 의 스폰 요건이 이것을 읽는다.
 * 테스트에 숫자를 다시 적으면 한쪽만 고쳐도 아무도 모른다.
 */
export const DEFAULT_BODY_R = 0.34;

export function createCollider(opts: ColliderOptions = {}): Collider {
  const layout = opts.layout ?? DEFAULT_LAYOUT;
  const frozenAt = opts.frozenAt;
  const cellX = layout.cellX;
  const cellZ = layout.cellZ;
  const bodyR = opts.bodyRadius ?? DEFAULT_BODY_R;

  let cachePx = NaN;
  let cachePz = NaN;
  let cache: Blocker[] = [];

  /** 플레이어가 선 파셀 기준 3×3 의 원 목록을 다시 만든다 */
  function rebuild(px: number, pz: number): void {
    const out: Blocker[] = [];
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        // **전부 `near`** — 대각을 `mid` 로 보면 near 전용 파츠가 조용히 빠진다
        // (위 「하지 않는 것」의 ①). 몸이 닿는 거리에서는 렌더가 보여주는 것을 전부 막는다.
        const qx = px + dx;
        const qz = pz + dz;
        // ⚠ **동결이 계산을 대신하는 자리** — 빌더(`parcel-builder.ts` 의 `fill`)와 **같은
        // 규칙**이어야 한다. 한쪽만 동결을 보면 «보이는 자리 = 막히는 자리»(`collide.ts` 의
        // 선언)가 깨져서, 옮긴 건물을 통과하거나 지운 건물이 보이지 않는 벽으로 남는다.
        //
        // `null` 과 빈 배열은 다른 뜻이다: `null` = 안 손댔다(계산해라), 빈 배열 = 손대서
        // 전부 지웠다(막을 것이 없다). `??` 는 `null`/`undefined` 만 걸러 내므로 빈 배열은
        // 그대로 통과한다 — 그것이 여기서 필요한 동작이다.
        const frozen = frozenAt?.(qx, qz, 'near') ?? null;
        const parts = frozen !== null ? frozen : parcelLayout(qx, qz, 'near', layout);
        out.push(...blockersOf(parts, qx * cellX, qz * cellZ));
      }
    }
    cache = out;
    cachePx = px;
    cachePz = pz;
  }

  return {
    resolve(x, z, dx, dz) {
      // `Math.round` 다 — 파셀 원점이 `px * cellX` 이므로 파셀은 그 좌표를 **중심**으로
      // 한다(파츠는 원점 ±cellX/2 에 놓인다).
      //
      // ⚠ 여기 원래 *"`Math.floor` 를 쓰면 반 칸 어긋나 발밑 파셀을 놓친다"* 라고 적혀
      // 있었고 **거짓이었다**(뮤테이션 실측: floor 로 바꿔도 17개 전부 통과).
      // 실제 차이는 **여유의 균등함**이다:
      //   round → 커버가 항상 플레이어 앞뒤로 최소 `cellX`(32m)
      //   floor → 파셀 끝에 서면 앞쪽 여유가 절반(16m)까지 줄어든다
      // 지금 파츠 중 가장 큰 것의 반경으로도 16m 를 못 채우므로 **floor 여도 현재는
      // 안 닿는다** — 그래서 뮤테이션이 안 깨진 것이고, 그것이 정상이다(등가에 가까운
      // 뮤테이션). round 를 쓰는 이유는 결함을 막아서가 아니라 **마진이 두 배**라서다.
      // 파셀이 작아지거나 파츠가 커지면 그 마진이 실제로 필요해진다.
      const px = Math.round(x / cellX);
      const pz = Math.round(z / cellZ);
      if (px !== cachePx || pz !== cachePz) rebuild(px, pz);
      return slide(x, z, dx, dz, cache, bodyR);
    },
    count() { return cache.length; },

    invalidate() {
      // 좌표를 `NaN` 으로 되돌리면 다음 `resolve` 의 «같은 파셀인가» 비교가 반드시 거짓이
      // 되어 `rebuild` 를 탄다(`NaN !== NaN`). 캐시 배열만 비우는 것으로는 부족하다 —
      // 그러면 «원이 0개인 파셀» 과 구별되지 않아 다시 만들 계기가 없다.
      cachePx = NaN;
      cachePz = NaN;
    },
  };
}
