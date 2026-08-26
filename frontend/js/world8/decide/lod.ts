// world2/decide/lod.ts — 거리 tier 판정. 순수 함수만, import 0.
//
// 왜 별 파일인가. 현행 world.js는 tier 판정이 `updateStreaming`(101줄, if 25개) 안에서
// 언로드 실행·큐 정리·쿨다운 부수효과와 뒤엉켜 있어, 판정만 떼어 시험할 지점이 없다.
// 그래서 이 판정에서 난 버그 두 건(`RATIO_FLOOR` no-op 계열)이 실기기에 나가서야 발견됐다.
// 여기 있는 함수들은 전부 입력→출력이므로 테이블 테스트로 경계를 못 박을 수 있다.
//
// 히스테리시스가 규약인 이유: 레퍼런스(hyperfy)의 LOD는 여유대역이 없어 경계에서 깜빡인다.
// 우리는 tier마다 ENTER(들어가는 거리)와 EXIT(나오는 거리)를 따로 두고, EXIT > ENTER를
// 불변식으로 강제한다 — 같은 값이면 경계에 선 물체가 매 프레임 tier를 오간다.

/** 렌더 tier. near=풀 품질 · mid=텍스처만 · far=단색 임포스터 · none=미로드 */
export type Tier = 'near' | 'mid' | 'far' | 'none';

export const TIERS: readonly Tier[] = ['near', 'mid', 'far', 'none'] as const;

/**
 * tier별 거리 임계(셀 단위). ENTER < EXIT 이어야 히스테리시스가 성립한다.
 * 값의 근거: 현행 실측 스트리밍 반경(full 1.15·shell 1.55 CELL)에서 출발해
 * 중간 tier(mid)를 끼워 넣었다. 정지 시 상하좌우(거리 1.0)=near, 대각(1.414)=mid가 되어
 * 현행 로드 개수를 재현한다 — 회귀 기준선을 유지하려는 선택이다.
 */
export interface TierBands {
  nearEnter: number; nearExit: number;
  midEnter: number; midExit: number;
  farEnter: number; farExit: number;
}

export const DEFAULT_BANDS: TierBands = {
  nearEnter: 1.15, nearExit: 1.30,
  midEnter: 1.55, midExit: 1.75,
  farEnter: 2.10, farExit: 2.40,
};

/**
 * 밴드 전체를 같은 배율로 늘리거나 줄인다(`?band=` 진단 노브).
 *
 * ── 왜 (감독 실기기 2026-08-10 "후진 중 밝기 살짝 하락 → 정지 시 회복") ─────
 * 안개·헤드밥·적응 해상도·전환 연출·태양(그림자)이 전부 감독 실측으로 기각된 뒤,
 * 마크 리포트 창의 유일한 사건이 tier강등(41.6m)이었다. 강등선 자체를 코스 밖으로
 * 밀어 "강등이 없는 세계"를 만들면 이 축을 최종 분리할 수 있다 — 그 실험 스위치다.
 *
 * 모든 필드에 **같은** 양수를 곱하므로 ENTER<EXIT 순서(히스테리시스 불변식)가
 * 보존된다. 배율이 1이면 원본 객체를 그대로 돌려준다(기본 경로 무비용).
 * ⚠ 안개(`decide/fog.ts` 의 `FOG_FAR_CELLS`)는 이 배율을 따라가지 않는다 —
 * 진단 전용이고, 상시 값으로 쓰려면 안개·그림자 밴드와 함께 설계해야 한다.
 */
export function scaleBands(b: TierBands, k: number): TierBands {
  if (!(k > 0) || k === 1) return b;
  return {
    nearEnter: b.nearEnter * k, nearExit: b.nearExit * k,
    midEnter: b.midEnter * k, midExit: b.midExit * k,
    farEnter: b.farEnter * k, farExit: b.farExit * k,
  };
}

/**
 * near 전환점(nearExit)을 지정 거리로 밀고, 뒤 밴드들을 순서가 살게 최소 보정한다.
 *
 * ── 왜 (팀장 판정 2026-08-10, 처방 (a)) ─────────────────────────────────────
 * 깜빡임의 원인이 tier 전환(강등선 nearExit 1.30셀=41.6m — 안개 0% 완전 노출)의
 * 부품 교체로 **실측 확정**됐다(`?band=2` 에서 소멸, 감독 판정 "깜빡이는건 없어졌어").
 * 처방은 교체를 안개가 감춰주는 거리 뒤로 미는 것 — fademode=near 철학("그 자리
 * 안개가 감춰주는 만큼만")과 같은 축이다. **얼마나 밀어야 충분한지는 화면으로만
 * 판정되므로** 값을 노브(`?nearx=`)로 열어 후보를 비교한다(결정 사이클 2항).
 *
 * 보정 규칙: nearEnter 는 원래 폭(0.15)을 유지해 히스테리시스가 살고, mid·far 는
 * ENTER<EXIT 순서가 깨지는 만큼만 바깥으로 밀린다(원래 값보다 안으로 오지 않는다).
 * far 가 밀리면 렌더 반경이 안개 far(2.40)를 넘을 수 있다 — 그 구간은 안개 100%
 * 뒤라 화면에는 안 보이고 슬롯 예산만 는다(예산은 밴드에서 유도되므로 따라온다).
 */
export function withNearExit(b: TierBands, nearExit: number): TierBands {
  if (!(nearExit > 0) || nearExit === b.nearExit) return b;
  const nearEnter = nearExit - (b.nearExit - b.nearEnter);
  const midEnter = Math.max(b.midEnter, nearExit);
  const midExit = Math.max(b.midExit, midEnter + (b.midExit - b.midEnter));
  const farEnter = Math.max(b.farEnter, midExit);
  const farExit = Math.max(b.farExit, farEnter + (b.farExit - b.farEnter));
  return { nearEnter, nearExit, midEnter, midExit, farEnter, farExit };
}

/**
 * 파셀 **생성 거리**(farEnter)를 지정 값으로 밀고, farExit 는 원래 폭을 유지한 채 따라간다.
 *
 * ── 왜 (팀장 판정 (a′), 2026-08-10) ─────────────────────────────────────────
 * 깜빡임의 마지막 겹을 파셀 생성으로 봤다 — farEnter 2.10셀=67.2m 는 안개 진행 62.5%
 * 지점이라 파셀 전체(건물 포함)가 자라나며 등장하는 것이 **반쯤 보인다**(감독 마크
 * 리포트에 "파셀생성 67.2 반복"이 실제로 찍혔다). 생성을 안개 100% 지점(=fog far)
 * 뒤로 밀면 등장이 화면에 안 보인다. 소멸 축은 여기가 아니라 파츠 `tiers` 전 계층
 * 연장이 막는다(`parts/planter.ts` 의 tiers 주석 한 곳).
 *
 * ⚠ **그러나 이 함수는 기본 경로에 편입하지 않는다 — 판정이 뒤집혔다**(감독 2026-08-10
 * *"자라나는것 느낌 좋다"*). 등장이 보이는 것은 결함이 아니라 연출이었다. 내 규정이
 * 틀린 지점: 마크에 찍힌 사건이 전부 화면의 문제인 것은 아니다 — **감독이 그것을
 * 문제라고 했는가**를 먼저 봐야 했다. `?calm=` 진단 노브(main.ts)만 이 함수를 쓴다.
 *
 * farExit 폭(0.30)을 유지하는 이유: 폭이 좁아지면 생성↔반납 히스테리시스가 죽어 경계에서
 * 파셀이 태어났다 죽었다 반복한다. near·mid 는 건드리지 않는다 — 그 전환들은 이제
 * 화면상 no-op 이라(위 tiers 연장) 밀 이유가 없다.
 */
export function withFarEnter(b: TierBands, farEnter: number): TierBands {
  if (!(farEnter > 0) || farEnter === b.farEnter) return b;
  return {
    ...b,
    farEnter: Math.max(b.midExit, farEnter),
    farExit: Math.max(b.midExit, farEnter) + (b.farExit - b.farEnter),
  };
}

/** ENTER < EXIT 불변식 검사. 밴드를 만드는 모든 경로가 이걸 통과해야 한다. */
export function validBands(b: TierBands): boolean {
  return b.nearEnter < b.nearExit
    && b.nearExit <= b.midEnter
    && b.midEnter < b.midExit
    && b.midExit <= b.farEnter
    && b.farEnter < b.farExit;
}

/**
 * 거리 → tier. `prev`(현재 tier)를 받아 히스테리시스를 적용한다.
 *
 * 규칙: 안쪽으로 올라갈 때는 ENTER를, 바깥으로 내려갈 때는 EXIT를 쓴다.
 * 그래서 ENTER와 EXIT 사이 구간에 있는 물체는 **현재 tier를 유지**한다 — 이것이 깜빡임 차단.
 * `prev`가 없으면(첫 판정) ENTER 기준만 쓴다.
 */
export function tierFor(dist: number, prev: Tier | null, b: TierBands = DEFAULT_BANDS): Tier {
  const rank = (t: Tier) => TIERS.indexOf(t); // 작을수록 안쪽(near=0)
  const byEnter: Tier = dist <= b.nearEnter ? 'near'
    : dist <= b.midEnter ? 'mid'
      : dist <= b.farEnter ? 'far' : 'none';
  if (prev == null) return byEnter;

  // 안쪽으로(= rank 감소) 갈 때는 ENTER를 넘겼으므로 그대로 승격.
  if (rank(byEnter) < rank(prev)) return byEnter;

  // 바깥으로 내려가려면 현재 tier의 EXIT를 넘어야 한다. 아직이면 유지.
  const exitOf: Record<Tier, number> = {
    near: b.nearExit, mid: b.midExit, far: b.farExit, none: Infinity,
  };
  if (dist <= exitOf[prev]) return prev;

  // EXIT를 넘었다 — 한 단계만 내린다(여러 단계 급락 방지: 급락은 그 자체로 스파이크다).
  return TIERS[Math.min(TIERS.length - 1, rank(prev) + 1)];
}

/**
 * 이동방향 look-ahead를 반영한 판정 중심.
 * 입력이 정규화돼 있지 않아도 안전하게 다룬다(길이 0이면 그대로 위치를 반환).
 *
 * ⚠ **이 함수는 "예측" 이 아니라 "중심 이동" 이다 — 제로섬이다.** 진행방향 반경이
 * 늘어나는 만큼 **반대쪽 반경이 줄어든다.** 1인칭에서 후진하면 줄어드는 쪽이
 * **보고 있는 쪽**이라 화면 정면이 반경 밖으로 밀려나 언로드된다.
 * 그래서 라이브(`systems/streaming.ts`)는 `ahead` 를 **0 으로 준다** — 근거·실측 표·
 * 되살리는 옳은 방법은 그 파일의 `lookAhead` 주석 한 곳이다(여기에 다시 적지 않는다).
 *
 * ⚠⚠ 이 자리에 원래 *"현행에서 검증된 값(0.5 CELL)을 계승한다 — 가려는 쪽 파셀을
 * 미리 올려 경계 히칭을 줄인다"* 라고 적혀 있었고 **그 문장이 사고의 절반이다**
 * (감독 실기기 2026-08-09 *"뒤에 조금만 가면 갑자기 사라져"*). "검증된" 은 정지·전진만
 * 밟아 본 것이었고 후진은 아무도 안 재봤다. 나는 이 결함을 한 번 고쳤다가 **이 문장을
 * 근거 삼아 되돌렸다**(`df9a6d1` → revert). 문장을 지우는 이유가 그것이다 —
 * 틀린 근거가 코드에 남아 있으면 다음 사람이 같은 되돌림을 한다(검수관 블로커, 2026-08-09).
 *
 * 아래 기본값 `0.5` 는 **모든 호출부가 값을 명시해 도달하지 않는다.** 남겨 두면 위 문장과
 * 같은 함정이 되므로, 새 호출부를 만들거든 반드시 값을 명시하라.
 */
export function lookAheadCenter(
  px: number, pz: number, dirX: number, dirZ: number, ahead = 0.5,
): { x: number; z: number } {
  const len = Math.hypot(dirX, dirZ);
  if (!(len > 1e-6)) return { x: px, z: pz };
  return { x: px + (dirX / len) * ahead, z: pz + (dirZ / len) * ahead };
}

/**
 * 그 tier로 **머무를 수 있는** 최대 거리(셀).
 *
 * ENTER가 아니라 EXIT인 이유: 히스테리시스 때문에 ENTER를 이미 지난 파셀도 EXIT까지는
 * 현재 tier를 유지한다(`tierFor`). 예산을 ENTER로 잡으면 딱 그 경계대역에 있는 파셀만큼
 * 슬롯이 모자란다 — 그것도 조용히.
 */
export function tierReach(tier: Exclude<Tier, 'none'>, b: TierBands = DEFAULT_BANDS): number {
  return tier === 'near' ? b.nearExit : tier === 'mid' ? b.midExit : b.farExit;
}

/**
 * 반경 `r`(셀)의 닫힌 원판이 **어디에 놓이든** 품을 수 있는 정수 격자점의 최대 개수.
 *
 * ── 왜 이 함수가 필요한가 ────────────────────────────────────────────────────
 * 슬롯 풀 예산 = `파셀당 최대 파츠 수 × 동시에 뜰 수 있는 파셀 수`인데, 뒤쪽 항이
 * 그동안 근거 없는 상수(20)였다. 실측 최대(17)에 눈대중 여유를 얹은 값이라 **이론
 * 최악치(farExit=2.40에서 21)보다 작았고**, 예산에 곱해둔 여유 배수 1.25가 그 부족을
 * 가려주고 있었다. 값 두 개가 각각 틀린 채 서로를 상쇄하던 상태다.
 *
 * 밴드에서 유도하면 밴드를 넓혔을 때 예산이 저절로 따라온다. `computeWant`의 순회 범위를
 * `farExit`에서 유도한 것과 같은 이유다 — 상수로 박으면 조용히 어긋난다.
 *
 * ── 왜 정확한 최댓값이 나오는가 ───────────────────────────────────────────────
 * 최적 위치의 원판은 언제나 격자점 **두 개 이상이 경계에 닿도록** 밀어붙일 수 있다(더
 * 못 밀면 이미 그 상태다). 그러니 후보 중심은 "격자점을 중심으로 한 반경 r 원들의 쌍별
 * 교점"이면 충분하다. 격자점이 하나도 없는 경우를 위해 원점도 후보에 넣는다.
 * 격자를 촘촘히 훑는 방식은 최적점을 통째로 건너뛸 수 있어 쓰지 않는다.
 */
export function maxLatticePoints(r: number): number {
  if (!(r >= 0)) return 0;
  const reach = Math.ceil(r) + 1;
  const pts: Array<[number, number]> = [];
  for (let i = -reach; i <= reach; i++) {
    for (let j = -reach; j <= reach; j++) pts.push([i, j]);
  }

  const rr = r * r;
  const EPS = 1e-9; // 교점은 경계에 정확히 놓이므로 부동소수 오차만큼 열어준다
  const count = (cx: number, cz: number): number => {
    let n = 0;
    for (const [x, z] of pts) {
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz <= rr + EPS) n++;
    }
    return n;
  };

  let best = count(0, 0);
  for (let a = 0; a < pts.length; a++) {
    for (let b = a + 1; b < pts.length; b++) {
      const dx = pts[b][0] - pts[a][0];
      const dz = pts[b][1] - pts[a][1];
      const d2 = dx * dx + dz * dz;
      if (d2 > 4 * rr) continue; // 두 원이 만나지 않는다
      const d = Math.sqrt(d2);
      const h = Math.sqrt(Math.max(0, rr - d2 / 4));
      const mx = (pts[a][0] + pts[b][0]) / 2;
      const mz = (pts[a][1] + pts[b][1]) / 2;
      const ux = -dz / d;
      const uz = dx / d;
      const c1 = count(mx + ux * h, mz + uz * h);
      if (c1 > best) best = c1;
      const c2 = count(mx - ux * h, mz - uz * h);
      if (c2 > best) best = c2;
    }
  }
  return best;
}

/**
 * 로드 우선순위. 작을수록 먼저. 거리 위주에 진행방향 보너스를 얹는다.
 * 현행 `prio = 맨해튼거리*10 − dirBonus` 규약을 계승하되 유클리드로 바꿨다 —
 * 격자 맨해튼은 대각 파셀을 과소평가해 시야 정면 대각이 늦게 올라왔다.
 */
export function loadPriority(
  dist: number, towardDot: number, dirBonusWeight = 5,
): number {
  return dist * 10 - (towardDot > 0 ? towardDot * dirBonusWeight : 0);
}
