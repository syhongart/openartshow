// world2/decide/stream.ts — 파셀 스트리밍 판정. 순수 함수만, three import 0.
//
// ── 이 파일이 있는 이유 ──────────────────────────────────────────────────────
// 현행 `updateStreaming`은 101줄에 if가 25개인데, 그 안에서 (a)무엇을 원하는지 계산하고
// (b)큐를 청소하고 (c)언로드를 실행하고 (d)쿨다운을 만진다. 네 가지가 한 함수에 있으니
// "원하는 목록이 맞는가"만 따로 시험할 방법이 없다. 실제로 이 판정에서 난 버그 두 건이
// 실기기에 나가서야 발견됐다.
//
// 여기서는 **want를 계산하는 일**과 **want와 현실의 차이를 내는 일**만 한다. 로드·언로드
// 실행, 큐, 예산 집행은 systems/streaming.ts가 한다. 이 파일은 부수효과가 없으므로
// 테이블 테스트로 경계를 못 박을 수 있다.
//
// ── 좌표 규약 ────────────────────────────────────────────────────────────────
// 이 파일의 모든 거리는 **셀 단위**다(월드 미터가 아니다). lod.ts의 밴드가 셀 단위이므로
// 단위를 하나로 맞춘다. 미터↔셀 환산은 호출자(System)의 책임이다 — 환산이 두 곳에 있으면
// 언젠가 한쪽만 고쳐진다.

import { type Tier, type TierBands, TIERS, DEFAULT_BANDS, tierFor, loadPriority } from './lod.js';

/** 파셀 식별자. `"px,pz"` — 정수 격자 좌표 두 개. */
export type ParcelKey = string;

export function parcelKey(px: number, pz: number): ParcelKey {
  return `${px},${pz}`;
}

/**
 * 키를 되돌린다. 형식이 아니면 null — 조용히 0,0으로 떨어뜨리지 않는다.
 *
 * `Number('')`가 0이라 빈 조각(`"1,"`)이 그냥 통과한다. 0,0은 실재하는 원점 파셀이므로
 * 파싱 실패가 0,0으로 떨어지면 원점이 오염된다. 그래서 정수 리터럴을 직접 검사한다.
 */
const INT_PAIR = /^(-?\d+),(-?\d+)$/;

export function parseKey(k: ParcelKey): { px: number; pz: number } | null {
  const m = INT_PAIR.exec(k);
  if (!m) return null;
  return { px: Number(m[1]), pz: Number(m[2]) };
}

export interface WantEntry {
  key: ParcelKey;
  px: number;
  pz: number;
  tier: Exclude<Tier, 'none'>;
  /** 작을수록 먼저 로드 */
  prio: number;
  /** 판정 중심으로부터의 거리(셀) — 디버그·정렬 안정화용 */
  dist: number;
}

export interface WantInput {
  /** 판정 원의 중심(셀 단위 연속 좌표). look-ahead가 이미 반영된 값을 받는다 */
  cx: number;
  cz: number;
  /** 이동 방향(정규화 불필요). 0벡터면 방향 보너스 없음 */
  dirX: number;
  dirZ: number;
  /** 현재 tier 맵 — 히스테리시스에 쓴다. 없는 키는 첫 판정으로 다룬다 */
  have: ReadonlyMap<ParcelKey, Tier>;
  bands?: TierBands;
  /** 월드 격자 경계(포함). 없으면 무한 월드 */
  limits?: { minPx: number; maxPx: number; minPz: number; maxPz: number };
}

/**
 * 이번 프레임에 존재해야 할 파셀 목록. `none`은 담기지 않는다(= 언로드 대상).
 *
 * 순회 범위는 `farExit`에서 유도한다 — 상수로 박으면 밴드를 넓혔을 때 조용히 잘린다.
 * 실제로 현행에서 반경 상수와 임계가 따로 놀아 원거리 파셀이 영영 안 올라온 적이 있다.
 *
 * 결과는 prio 오름차순으로 **안정 정렬**된다. 동점일 때 키 순서로 갈라 프레임마다 순서가
 * 흔들리지 않게 한다 — 순서가 흔들리면 예산 컷이 매 프레임 다른 파셀을 자른다.
 */
export function computeWant(input: WantInput): WantEntry[] {
  const b = input.bands ?? DEFAULT_BANDS;
  const { cx, cz, dirX, dirZ, have } = input;

  const reach = Math.ceil(b.farExit) + 1;
  const len = Math.hypot(dirX, dirZ);
  const ux = len > 1e-6 ? dirX / len : 0;
  const uz = len > 1e-6 ? dirZ / len : 0;

  const out: WantEntry[] = [];
  const cpx = Math.round(cx);
  const cpz = Math.round(cz);

  for (let px = cpx - reach; px <= cpx + reach; px++) {
    for (let pz = cpz - reach; pz <= cpz + reach; pz++) {
      if (input.limits) {
        const L = input.limits;
        if (px < L.minPx || px > L.maxPx || pz < L.minPz || pz > L.maxPz) continue;
      }
      const ddx = px - cx;
      const ddz = pz - cz;
      const dist = Math.hypot(ddx, ddz);
      const key = parcelKey(px, pz);
      const tier = tierFor(dist, have.get(key) ?? null, b);
      if (tier === 'none') continue;

      // 진행방향 보너스: 파셀 방향 단위벡터와 이동방향의 내적. 정지 중이면 0.
      const toward = dist > 1e-6 ? (ddx / dist) * ux + (ddz / dist) * uz : 0;
      out.push({ key, px, pz, tier, prio: loadPriority(dist, toward), dist });
    }
  }

  out.sort((a, z) => (a.prio - z.prio) || (a.key < z.key ? -1 : a.key > z.key ? 1 : 0));
  return out;
}

export interface RetierEntry {
  key: ParcelKey;
  from: Tier;
  to: Exclude<Tier, 'none'>;
  prio: number;
}

export interface ParcelDiff {
  /** 아직 없는 파셀 — 새로 만들어야 한다. prio 순 */
  load: WantEntry[];
  /** want에서 사라진 파셀 — 반납해야 한다 */
  unload: ParcelKey[];
  /** 있지만 tier가 달라진 파셀. 승격/강등 모두 */
  retier: RetierEntry[];
}

/**
 * want와 현실의 차. **이 함수가 큐 청소를 대신한다.**
 *
 * 현행은 큐에 쌓인 job이 유효한지를 따로 검사해 지웠고(101줄 중 12줄), 그 검사가 want 계산과
 * 어긋나 "떠난 파셀이 뒤늦게 로드되는" 버그가 났다. 여기서는 매 프레임 want를 다시 내고
 * 차이만 본다 — 큐는 System이 이 결과로 매번 다시 만들면 되므로 청소할 상태 자체가 없다.
 *
 * **retier는 강등을 먼저 낸다.** 강등(near→mid 등)은 슬롯을 반납하고 승격은 점유한다.
 * 승격이 앞서면 프레임 예산이 중간에 잘렸을 때 "점유는 했는데 반납은 다음 프레임"인 순간이
 * 이론상 생길 수 있고, 그 순간의 점유 수가 최악치를 넘는다. 강등을 앞세우면 `takeBudget`이
 * 순서대로 자르므로 "승격만 처리된" 상태가 만들어지지 않는다.
 *
 * 정직하게 적어둔다 — **이 순서가 필요하다는 것을 실측으로 재현하지는 못했다.** 정렬을 뺀
 * 채로 속도 5종 × 프레임시간 4종 × 1,500프레임(총 30,000샘플)을 방향 회전과 함께 돌렸으나
 * 초과가 0건이었다(최대 사용률 ground 90.5%). 셀이 32m라 tier 전이가 프레임당 한둘씩만
 * 일어나고, `takeBudget`의 기아 방지 규약이 최소 1건은 늘 통과시키기 때문으로 보인다.
 * 그러니 이 정렬은 **여유 배수 1.0의 증명이 아니라 보험**이다. 비용은 n ≤ 21의 정렬 한 번.
 */
export function diffParcels(
  want: readonly WantEntry[],
  have: ReadonlyMap<ParcelKey, Tier>,
): ParcelDiff {
  const load: WantEntry[] = [];
  const retier: RetierEntry[] = [];
  const wantKeys = new Set<ParcelKey>();

  for (const w of want) {
    wantKeys.add(w.key);
    const cur = have.get(w.key);
    if (cur === undefined) { load.push(w); continue; }
    if (cur !== w.tier) retier.push({ key: w.key, from: cur, to: w.tier, prio: w.prio });
  }

  const unload: ParcelKey[] = [];
  for (const k of have.keys()) if (!wantKeys.has(k)) unload.push(k);

  // 강등(바깥으로) 먼저, 그 안에서 prio 순. `want`가 이미 prio 정렬이라 안정 정렬이면 충분하다.
  const outward = (r: RetierEntry) => (TIERS.indexOf(r.to) > TIERS.indexOf(r.from) ? 0 : 1);
  retier.sort((a, z) => outward(a) - outward(z));

  return { load, unload, retier };
}

export interface BudgetSplit<T> {
  /** 이번 프레임에 처리할 작업 */
  run: T[];
  /** 예산을 넘겨 미룬 작업 — 다음 프레임에 want가 다시 계산되므로 보관하지 않는다 */
  defer: T[];
}

/**
 * 프레임 예산을 소비하며 작업을 자른다.
 *
 * 규약: **최소 1건은 반드시 통과시킨다.** 예산보다 비싼 작업 하나가 큐 맨 앞에 있으면
 * 아무것도 못 하고 영원히 멈추기 때문이다(기아). 한 프레임 튀는 게 영영 안 올라오는 것보다 낫다.
 * 이건 현행에서 실제로 난 적 있는 교착이라 규약으로 못 박는다.
 */
export function takeBudget<T>(
  jobs: readonly T[],
  budget: number,
  costOf: (job: T) => number,
): BudgetSplit<T> {
  const run: T[] = [];
  let spent = 0;
  let i = 0;
  for (; i < jobs.length; i++) {
    const c = Math.max(0, costOf(jobs[i]));
    // 예산을 넘으면 **거기서 멈춘다**. 건너뛰고 뒤의 싼 작업을 앞당기면 prio 순서가 뒤집혀
    // 시야 정면 파셀이 뒤로 밀린다 — prio는 곧 로드 순서라는 계약을 깨는 일이다.
    if (run.length > 0 && spent + c > budget) break;
    run.push(jobs[i]);
    spent += c;
  }
  return { run, defer: jobs.slice(i) };
}

/**
 * 프레임 예산(ms). 여유가 있으면 늘리고 쫓기면 줄인다.
 *
 * 상한이 있는 이유: 예산이 크면 한 프레임에 몰아 처리해 그 프레임이 통째로 튄다. 스트리밍의
 * 목적은 총 처리량이 아니라 **프레임 균일성**이므로, 남는 시간을 다 쓰지 않는 게 맞다.
 */
export function streamBudgetMs(frameMs: number, targetMs: number, max = 6): number {
  const slack = targetMs - frameMs;
  if (!(slack > 0)) return 0.5; // 이미 늦었다 — 그래도 완전히 0으로 만들지는 않는다(기아 방지)
  return Math.min(max, Math.max(0.5, slack * 0.5));
}
