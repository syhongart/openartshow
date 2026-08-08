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
// · **렌더 tier 의 히스테리시스를 따라가지 않는다.** 여기서는 거리로만 tier 를 정한다
//   (`tierFor(dist, null)`). 렌더는 경계에서 이전 tier 를 유지하므로 **밴드 경계의 파셀은
//   잠깐 서로 다른 tier 를 볼 수 있다.** 그 파셀은 플레이어에서 최소 한 칸(32m) 떨어져
//   있어 몸이 닿지 않는다 — 도달 불가라 무해하지만, **무해한 이유가 거리이지 설계가
//   아니라는 것**을 적어 둔다. 파셀이 작아지면 이 전제가 깨진다.
// · **스트리밍이 실제로 로드했는지 안 본다.** `parcelLayout` 이 순수·결정적이라 로드 여부와
//   무관하게 같은 답이 나온다. 즉 **아직 안 그려진 건물에도 막힌다** — 로딩 중 벽을
//   통과하는 것보다 이쪽이 낫다고 봤다.

import { parcelLayout, DEFAULT_LAYOUT, type LayoutOptions } from '../decide/parcel-layout.js';
import { tierFor, DEFAULT_BANDS, type TierBands } from '../decide/lod.js';
import { blockersOf, slide, type Blocker } from '../decide/collide.js';

export interface ColliderOptions {
  cellX?: number;
  cellZ?: number;
  layout?: LayoutOptions;
  bands?: TierBands;
  /** 플레이어 몸 반경(m). 빌더 아바타(0.34)와 같은 수준으로 둔다 */
  bodyRadius?: number;
}

export interface Collider {
  /** 이동을 해석해 실제로 갈 수 있는 좌표를 낸다 */
  resolve(x: number, z: number, dx: number, dz: number): { x: number; z: number };
  /** 지금 캐시에 든 원 개수 — 진단용(테스트가 "정말 뭔가 보고 있는가" 를 확인한다) */
  count(): number;
}

const DEFAULT_BODY_R = 0.34;

export function createCollider(opts: ColliderOptions = {}): Collider {
  const cellX = opts.cellX ?? DEFAULT_LAYOUT.cellX;
  const cellZ = opts.cellZ ?? DEFAULT_LAYOUT.cellZ;
  const layout = opts.layout ?? DEFAULT_LAYOUT;
  const bands = opts.bands ?? DEFAULT_BANDS;
  const bodyR = opts.bodyRadius ?? DEFAULT_BODY_R;

  let cachePx = NaN;
  let cachePz = NaN;
  let cache: Blocker[] = [];

  /** 플레이어가 선 파셀 기준 3×3 의 원 목록을 다시 만든다 */
  function rebuild(px: number, pz: number): void {
    const out: Blocker[] = [];
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        // 거리로만 tier 를 정한다(위 「하지 않는 것」 참조). 'none' 은 파츠가 없다.
        const tier = tierFor(Math.hypot(dx, dz), null, bands);
        if (tier === 'none') continue;
        const qx = px + dx;
        const qz = pz + dz;
        out.push(...blockersOf(parcelLayout(qx, qz, tier, layout), qx * cellX, qz * cellZ));
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
  };
}
