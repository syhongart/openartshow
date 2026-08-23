// world2/decide/parcel-slots.ts — 파셀 안의 **자리 배정.** 순수 함수만.
//
// ── 감독 지시에서 생겼다 ────────────────────────────────────────────────────
// *"지금 보면 나무 건물 다른 것들 가로등, 겹쳐져 있는 것들이 보여. 구획을 잘 배치해서
// 균형, 통일감 있게 보이게 해줘."*
//
// ── 무엇이 겹쳤나 ───────────────────────────────────────────────────────────
// 건물은 이미 겹치지 않았다. `pickInQuadrant` 가 사분면을 1:1로 나눠 주고, 그 주석은
// *"겹침이 구조적으로 사라진다 — 충돌 판정도, 재시도도 필요 없다"* 고 적고 있다.
//
// **그런데 그 문장은 건물 안에서만 참이었다.** 나무·벤치·화분은 `pickOffRoad` 로
// 사분면을 **무작위로** 골랐고, 그건 건물이 이미 선 사분면일 수 있다. 나무 여덟 그루가
// 같은 6.5m 칸에서 각자 난수를 뽑으니 자기들끼리도 겹쳤다.
//
// 파츠와 파츠 **사이**를 아무도 보지 않았다. 이 저장소가 반복해서 배운 형태다 — 각
// 조각은 자기 안에서 옳은데, 경계를 건너는 지점에 검사가 없다.
//
// ── 처방: 자리를 먼저 만들고 나눠 준다 ─────────────────────────────────────
// 지금까지는 파츠가 각자 좌표를 **뽑았다.** 앞으로는 파셀이 자리 목록을 **가지고 있고**
// 파츠가 그중 빈 것을 **가져간다.** 두 파츠가 같은 자리를 가져가는 일이 원리적으로
// 없어진다.
//
//   ┌───────────────────────────────┐   가운데 십자 = 도로 + 인도(가로등)
//   │  ┌────┬────┐ ║ ┌────┬────┐   │   네 모서리  = 사분면, 각 2×2 슬롯
//   │  │ s0 │ s1 │ ║ │ s0 │ s1 │   │
//   │  ├────┼────┤ ║ ├────┼────┤   │   건물은 사분면을 통째로 쓰고
//   │  │ s2 │ s3 │ ║ │ s2 │ s3 │   │   나무·벤치·화분은 남은 슬롯을 쓴다
//   │  └────┴────┘ ║ └────┴────┘   │
//   │ ══════════════╬═════════════ │
//   │  ┌────┬────┐ ║ ┌────┬────┐   │
//   │  │ …  │ …  │ ║ │ …  │ …  │   │
//   └───────────────────────────────┘
//
// ── 왜 격자인데 격자로 안 보이는가 (감독 확정 A안) ─────────────────────────
// 감독이 고른 것은 *"구역은 나누되 안에서는 자연스럽게"* 다. 슬롯은 **자리의 후보**일
// 뿐이고 물건은 슬롯 안에서 흔들려 놓인다(`jitterIn`). 겹침은 슬롯이 막고, 규칙성은
// 흔들림이 지운다. 슬롯 중심에 정확히 박으면 조경 화단처럼 인공적으로 읽힌다.
//
// ── 왜 `decide/` 인가 ──────────────────────────────────────────────────────
// 좌표만으로 정해지는 계산이라 부수효과가 없다. 그래서 "임의 파셀 N개에서 겹치는 쌍이
// 0인가" 를 테스트가 직접 물어볼 수 있다 — 이 기능의 성패가 그 한 줄이다.

import { SETBACK, lampAnchors, type Dir } from '../parts/road-topology.js';
import type { PlacedPart, ResolvedLayout } from '../parts/types.js';

/** 사분면 하나를 몇 등분하는가. 2 면 2×2 = 4슬롯 */
const SPLIT = 2;

/** 사분면당 슬롯 수 */
export const SLOTS_PER_QUADRANT = SPLIT * SPLIT;

/** 파셀당 슬롯 수 — 사분면 4개 × 슬롯 */
export const SLOTS_PER_PARCEL = 4 * SLOTS_PER_QUADRANT;

export interface Slot {
  /** 사분면 0~3. `pickInQuadrant` 와 같은 규약(bit0 = +x, bit1 = +z) */
  q: number;
  /** 중심 좌표(파셀 중심 기준 오프셋) */
  x: number;
  z: number;
  /** 이 슬롯이 감당하는 반경 — 흔들림의 상한이자 크기 상한 */
  r: number;
}

/**
 * 파셀의 자리 목록. **난수를 쓰지 않는다** — 같은 파셀이면 언제나 같은 목록이다.
 *
 * 도로가 있으면 안쪽 `SETBACK` 을 비우고(인도), 없으면 중앙까지 쓴다. 길이 없는 파셀에서
 * 가운데를 비우면 땅이 도넛처럼 보인다는 것은 `pickInQuadrant` 가 이미 배운 것이다.
 */
export function parcelSlots(
  o: ResolvedLayout, halfX: number, halfZ: number, dirs: readonly Dir[],
): Slot[] {
  const inset = dirs.length === 0 ? 0 : Math.min(SETBACK, Math.min(halfX, halfZ));
  const spanX = (halfX - inset) / SPLIT;
  const spanZ = (halfZ - inset) / SPLIT;
  // ── 슬롯 반경 = 짧은 변의 절반 ──────────────────────────────────────────
  // 이웃 슬롯 중심 사이 거리가 `spanX`(또는 `spanZ`)이므로, 반경을 그 절반으로 두면
  // 두 슬롯의 원이 정확히 접한다. 긴 쪽을 쓰면 좁은 축에서 이웃을 침범한다.
  //
  // 대각선 이웃은 중심 거리가 `hypot(spanX, spanZ)` 로 더 머니 자동으로 안전하다.
  const r = Math.max(0, Math.min(spanX, spanZ) / 2);

  const out: Slot[] = [];
  for (let q = 0; q < 4; q++) {
    const sx = q & 1 ? 1 : -1;
    const sz = q & 2 ? 1 : -1;
    for (let i = 0; i < SLOTS_PER_QUADRANT; i++) {
      const ix = i % SPLIT;
      const iz = (i / SPLIT) | 0;
      out.push({
        q,
        x: sx * (inset + (ix + 0.5) * spanX),
        z: sz * (inset + (iz + 0.5) * spanZ),
        r,
      });
    }
  }
  return out;
}

/**
 * 이미 놓인 것과 부딪히지 않는 슬롯만 남긴다.
 *
 * ── 왜 "사분면 점유" 가 아니라 거리 검사인가 ──────────────────────────────
 * 건물은 사분면을 쓰고 가로등은 도로 축에 서며 광장 랜드마크는 중앙에 있다 — 자리를
 * 정하는 방식이 저마다 다르다. "무엇이 어느 사분면을 썼는가" 를 종류마다 따로 알아야
 * 하면, 파츠를 하나 추가할 때마다 이 함수를 고쳐야 하고 **빠뜨리면 조용히 겹친다.**
 *
 * 좌표와 반경만 보면 종류를 몰라도 된다. 새 파츠가 어떤 방식으로 자리를 잡든, 반경만
 * 신고하면 뒤에 오는 파츠가 저절로 피한다.
 *
 * @param reserved 그려지지 않더라도 비워 둘 자리(가로등 등). 좌표·반경만 본다
 */
export function freeSlots(
  slots: readonly Slot[],
  placed: readonly PlacedPart[],
  radiusOf: (p: PlacedPart) => number,
  myRadius: number,
  reserved: readonly { x: number; z: number; r: number }[] = [],
): Slot[] {
  // ── 슬롯 **전체**를 점유한다고 본다 ──────────────────────────────────────
  // 검사는 슬롯 중심에서 하는데 실제 배치는 `jitterIn` 으로 흔들린 뒤 자리다. 물건
  // 반경만으로 재면 그 흔들림 폭이 검사에서 통째로 빠진다 — 41×41 실측에서
  // `building×tree 0.16m` 처럼 **딱 흔들림만큼** 겹치는 것들이 그래서 남았다.
  //
  // 유효 반경을 `max(물건, 슬롯)` 으로 두면 흔들림이 어디로 가든 슬롯 안이므로 안전
  // 하다. 자리가 조금 보수적으로 줄지만, 줄어든 자리는 "덜 놓임" 이고 안 줄이면
  // "겹침" 이다. 감독이 지적한 쪽은 후자다.
  return slots.filter((s) => {
    const r = Math.max(myRadius, s.r);
    for (const p of placed) {
      const pr = radiusOf(p);
      if (pr <= 0) continue; // 평면(지면·잔디·도로)은 겹침 개념이 없다
      if (hit(s.x, s.z, r, p.x, p.z, pr)) return false;
    }
    for (const v of reserved) {
      if (hit(s.x, s.z, r, v.x, v.z, v.r)) return false;
    }
    return true;
  });
}

function hit(ax: number, az: number, ar: number, bx: number, bz: number, br: number): boolean {
  const dx = ax - bx;
  const dz = az - bz;
  const rr = ar + br;
  return dx * dx + dz * dz < rr * rr;
}

/**
 * 목록에서 `n` 개를 **겹치지 않게** 골라 쓴다.
 *
 * 고른 자리를 `taken` 에 쌓아 다음 선택이 그것을 피하게 하는 것이 요점이다. 같은 파츠가
 * 여러 개일 때(나무 여덟 그루) 자기들끼리 겹치는 것이 원래 문제의 절반이었다.
 *
 * 자리가 모자라면 **있는 만큼만** 돌려준다. 억지로 밀어 넣지 않는다 — 나무 여덟 그루가
 * 목표인데 자리가 셋뿐이면, 셋만 서는 것이 여덟이 겹쳐 서는 것보다 낫다.
 */
export function takeSlots(
  rnd: () => number,
  free: readonly Slot[],
  n: number,
  myRadius: number,
): Slot[] {
  const pool = free.slice();
  const taken: Slot[] = [];
  while (taken.length < n && pool.length > 0) {
    // 무작위로 뽑는다 — 앞에서부터 채우면 늘 같은 사분면부터 차서 한쪽으로 쏠린다.
    const k = Math.floor(rnd() * pool.length);
    const s = pool.splice(k, 1)[0];
    // 같은 이유로 슬롯 반경을 함께 본다 — 둘 다 흔들리면 두 배로 가까워진다.
    const r = Math.max(myRadius, s.r);
    if (taken.some((t) => hit(t.x, t.z, Math.max(myRadius, t.r), s.x, s.z, r))) continue;
    taken.push(s);
  }
  return taken;
}

/**
 * 슬롯 안에서 흔들어 놓는다 — 감독이 고른 *"안에서는 자연스럽게"*.
 *
 * 흔들림 폭은 **슬롯 반경에서 물건 반경을 뺀 만큼**이다. 그래야 흔들어도 슬롯을 벗어나지
 * 않고, 벗어나지 않으면 겹침 보장이 유지된다. 물건이 슬롯만큼 크면 폭이 0이 되어 중심에
 * 그대로 선다 — 자연스러움보다 겹치지 않는 것이 먼저다.
 *
 * ── 왜 사각이 아니라 원인가 ────────────────────────────────────────────────
 * 처음에 `x`·`z` 를 각각 `±room` 으로 흔들었다. 그러면 **대각선으로 `room×√2` 까지**
 * 나간다 — 겹침 판정은 원형 거리로 하는데 흔들림만 사각이라, 두 물건이 서로 마주 보는
 * 모서리로 밀리면 판정이 보장한 간격을 넘어선다.
 *
 * 실측으로 41×41 파셀에서 `tree×tree` 겹침이 그렇게 남았다. 슬롯은 제 몫을 했고
 * 흔들림이 그 경계를 넘은 것이다 — **자리를 나눠도 흔들림이 새면 겹친다.**
 *
 * 반지름에 `sqrt` 를 씌우는 것은 원 안 균등 분포를 위해서다. 안 씌우면 중심에 몰려
 * 흔들림이 있으나 마나 해진다(면적이 반지름 제곱에 비례하므로).
 */
export function jitterIn(
  rnd: () => number, s: Slot, myRadius: number,
): { x: number; z: number } {
  const room = Math.max(0, s.r - myRadius);
  const ang = rnd() * Math.PI * 2;
  const rad = Math.sqrt(rnd()) * room;
  return {
    x: s.x + Math.cos(ang) * rad,
    z: s.z + Math.sin(ang) * rad,
  };
}

/**
 * 가로등이 예약한 자리. 그려지는 tier 와 무관하게 항상 비운다.
 *
 * 가로등이 파셀 경계(16m)로 옮겨 간 뒤로는 슬롯 격자(반폭 13.5m 안)와 대개 만나지
 * 않는다 — 바깥 슬롯이 반경 2.4m 를 넘을 때만 걸린다. **그래도 남겨 둔다**: 이 함수가
 * 지키는 것은 현재 좌표가 아니라 "가로등 자리는 tier 와 무관하게 비운다"는 규약이고,
 * `LAMP_OFFSET` 이나 자리 규칙이 다시 안쪽으로 오면 그 순간 다시 실효를 갖는다.
 */
export function lampReservations(
  o: ResolvedLayout, dirs: readonly Dir[], r: number,
): { x: number; z: number; r: number }[] {
  return lampAnchors(o, dirs).map((a) => ({ x: a.x, z: a.z, r }));
}
