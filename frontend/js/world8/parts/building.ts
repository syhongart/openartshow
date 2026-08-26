// 건물 — 파셀의 뼈대. 저폴리 박스이고, 실루엣 변화는 크기와 회전이 전부다.
//
// 개수 하한이 2인 이유는 룩이다. 0~1채면 그 구획이 "아직 안 지어진 곳"처럼 보이고,
// 오픈월드에서 그런 파셀이 드문드문 섞이면 세상이 버려진 인상을 준다.

import type { PartSpec, PlacedPart } from './types.js';
import {
  roadDirs, pickInQuadrant, shuffledQuadrants, SETBACK, LAMP_CLEARANCE, EAVE,
  type Dir,
} from './road-topology.js';
import { isPlaza } from './plaza.js';
import { isTowerParcel } from './zoning.js';

/**
 * 바닥 한 변의 최소·최대(미터). **여기가 유일한 출처다** — 배치가 이 값으로 크기를 뽑고,
 * 사분면 안쪽 경계도 `MAX_SIDE / 2` 로 유도한다. 두 곳에 따로 적으면 크기를 키웠을 때
 * 간격이 따라오지 않아 건물이 조용히 겹친다.
 */
const MIN_SIDE = 3;
/**
 * 건물 최대 변(미터). **사분면 폭에 맞춘 값이다.**
 *
 * 8 이었는데 사분면이 6.5m 라 건물이 제 구획을 넘었다 — 도로 위로 올라가고 가로등을
 * 덮었다. 감독이 *"겹쳐져 있는 것들이 보여"* 라고 한 것의 큰 몫이 이것이다.
 *
 * 6 이면 사분면 안에 들어간다. 도시의 덩치는 **높이**(4~20m)가 만들지 바닥 넓이가
 * 만드는 것이 아니라, 이 축소로 스카이라인은 그대로다.
 */
const MAX_SIDE = 6;

// `EAVE`(처마·간판 여유)는 `road-topology.ts` 로 옮겼다. 타워가 같은 값을 필요로
// 하면서 미러링이 생겼기 때문이다(검수관 블로커 2026-08-02 B1). 이 값이 왜 있는지와
// 무엇을 잘못했다 고쳤는지의 기록도 그 파일에 함께 옮겼다 —
// **사고 이력은 값을 따라간다.** 값만 옮기고 이력을 남기면 다음 사람이 값만 본다.

/**
 * 재표집 횟수. **자리를 못 찾으면 그 채는 안 선다** — 늘려도 없는 자리가 생기지 않는다.
 *
 * 12 인 이유: 사분면 넷을 세 바퀴 돈다. 자리가 있으면 대개 첫 바퀴에 잡히고, 세 바퀴를
 * 다 헛돌면 파셀이 이미 포화한 것이다. 이 값을 올리면 포화 근처에서 배치가 조금 촘촘해지고
 * 비용이 선형으로 는다 — `?density=1`(기본)에서는 **한 번도 안 불린다**.
 *
 * ⚠ **성능을 재게 되면 여기서 시작하라**(검수관 P3). 결함이 있던 판본은 이 구간이
 * `O(1)`(값은 틀렸지만 쌌다)이었고 지금은 `O(FREE_TRIES × 이미 놓인 것 수)` 다.
 * `?bld=8&tree=8&density=8` 의 프레임 시간은 **아직 안 쟀다** — 겹침과 개수만 봤다.
 */
const FREE_TRIES = 12;

/**
 * 이미 놓인 것들을 피해 자리를 찾는다. 못 찾으면 `null`.
 *
 * 사분면을 순환하며(`quads[(i + t) % 4]`) 표집하는 것은 한 사분면만 두드리다 실패하는
 * 것을 막기 위해서다 — 붐비는 쪽과 빈 쪽이 갈리는데 그것을 모르고 시작하기 때문이다.
 */
function findFree(
  rnd: () => number,
  halfX: number,
  halfZ: number,
  dirs: readonly Dir[],
  inset: number,
  reach: number,
  quads: readonly number[],
  i: number,
  others: readonly PlacedPart[],
  radiusOf: (p: PlacedPart) => number,
): { x: number; z: number } | null {
  for (let t = 0; t < FREE_TRIES; t++) {
    const pos = pickInQuadrant(rnd, halfX, halfZ, dirs, quads[(i + t) % quads.length], inset);
    let ok = true;
    for (const p of others) {
      const r = radiusOf(p);
      if (r <= 0) continue; // 평면(지면·도로)은 겹침 개념이 없다
      if (Math.hypot(pos.x - p.x, pos.z - p.z) < reach + r) { ok = false; break; }
    }
    if (ok) return pos;
  }
  return null;
}

export const building: PartSpec = {
  kind: 'building',
  /** 감독이 심리스 텍스처를 얹는 표면 (W7) — 목록은 여기서 유도된다 */
  paintable: true,
  tiers: ['near', 'mid', 'far'], // 가장 멀리서도 보인다 — 스카이라인을 만드는 것이 건물이다
  salt: 0x7f4a7c15,
  // 지면과 같은 이유로 밝혔다. 예전 값(0x3d4557 계열, 명도 27%)은 낮 하늘 아래서
  // **새까만 덩어리**로 보였다 — 안개 너머 먼 건물은 희게 보이는데 눈앞 건물이 검으니
  // 원근이 뒤집힌 것처럼 읽혔다.
  //
  // 명도 55% 대. 하늘(밝은 회청)보다는 어두워야 실루엣이 살고, 지면(40%)보다는 밝아야
  // 벽이 바닥에서 일어선 것으로 보인다.
  tones: [0x8892a0, 0x929cab, 0x7d8794, 0x9aa4b2, 0x737d8a],

  // `1 + floor(rnd * max)` 의 상한이다. rnd < 1 이므로 max 를 넘지 않는다.
  //
  // 상한이 **사분면 수(4)를 넘으면 안 된다.** 넘는 순간 두 채가 같은 사분면에 배정돼
  // 겹치기 시작한다 — 그게 이 값을 6에서 4로 내린 이유의 절반이다.
  /**
   * 바닥 사각형을 감싸는 원. 회전이 직각 배수라 긴 변의 절반이면 충분하고, 처마·간판이
   * 벽면을 조금 넘으므로 `EAVE` 만큼 여유를 얹는다.
   *
   * **이 반경이 배치 한계와 같은 값을 봐야 한다.** 그러지 않아서 실제로 겹쳤다 — 아래
   * `EAVE` 주석 참고.
   */
  // 그림자는 **원**이다 — 지오는 박스지만 감독이 사각 그늘을 벤치에만 주기로 판정했다
  // (카드 2026-08-11: *"벤치만"*). 큰 건물은 사각 그늘이 인공적으로 읽힌다는 판정이다.
  // 지오를 따라 `box` 로 되돌리지 마라 — 근거는 `parts/types.ts` 의 그 필드 주석 한 곳.
  shadowProfile: 'round',
  footprint: (p) => Math.max(p.sx, p.sz) * 0.5 + EAVE,

  maxPerParcel: (o) => o.maxBuildings,

  place: ({ px, pz, rnd, o, halfX, halfZ, placed, radiusOf }) => {
    // 광장에는 짓지 않는다. 채수 하한을 1로 내려도 어느 파셀에나 한 채는 서므로,
    // "아무것도 없는 트인 곳" 은 이 예외로만 생긴다.
    if (isPlaza(px, pz)) return [];
    // 타워 파셀에도 짓지 않는다. 타워는 파셀 **중앙**을 통째로 쓰는데(`tower.ts`),
    // 건물은 사분면에서 자리를 뽑으므로 둘이 같은 파셀에 서면 사분면 안쪽이 타워와
    // 겹친다 — `footprint` 경쟁으로는 못 막는다. 타워가 중앙 고정이라 언제나 먼저
    // 놓이고, 겹침 판정은 "앞선 것을 피한다" 이지 "뒤엣것을 밀어낸다" 가 아니다.
    if (isTowerParcel(px, pz, o.cellX, o.cellZ)) return [];
    const dirs = roadDirs(px, pz);
    // 1~4채. 예전엔 2~6이었고, 1000㎡ 당 3.91채로 world1(1.74채)의 **2.25배**였다.
    // 이제 2.44채 — world1 의 1.4배까지 내려온다. 하한을 1로 내린 것도 의도다:
    // 하한 2면 "한 채만 선 여유로운 구획"이 구조적으로 존재할 수 없다.
    const n = 1 + Math.floor(rnd() * o.maxBuildings);
    // 사분면을 섞어 1:1로 나눠 준다. 섞지 않으면 첫 건물이 늘 같은 사분면에 서서
    // 도시가 한쪽으로 쏠린 규칙성을 띤다.
    const quads = shuffledQuadrants(rnd);
    const out: PlacedPart[] = [];
    for (let i = 0; i < n; i++) {
      const ry = Math.floor(rnd() * 4) * (Math.PI / 2); // 직각 배치 — 도시가 정돈돼 보인다
      // ── 크기를 자리보다 먼저 뽑는다 (감독 지시로 바뀐 순서) ─────────────────
      // 얼마나 물러서야 하는지가 **건물 크기에 달려 있다.** 자리를 먼저 정하면 그 뒤에
      // 정해진 크기가 도로나 가로등을 덮어도 알 수 없다 — 실제로 그랬다.
      const w = MIN_SIDE + rnd() * (MAX_SIDE - MIN_SIDE);
      const d = MIN_SIDE + rnd() * (MAX_SIDE - MIN_SIDE);
      const h = 4 + rnd() * 16;
      const half = Math.max(w, d) / 2;

      // 안쪽 경계 = 셋백 + 자기 반폭 + 가로등 여유. 유도값이라 크기 상한을 바꿔도
      // 저절로 따라온다(예전 `MAX_SIDE / 2` 는 `SETBACK` 에 가려 무실효였다 —
      // `pickInQuadrant` 가 `max(SETBACK, minInset)` 을 쓰는데 셋백이 더 컸다).
      const inset = half + (dirs.length === 0 ? 0 : SETBACK + LAMP_CLEARANCE);
      // 바깥 경계는 **겹침 반경만큼** 당긴다. 반폭만 당겼더니 처마 몫(`EAVE`)이 남아
      // 이웃 파셀 건물과 실제로 겹쳤다. 주석은 처음부터 옳았고 값만 모자랐다.
      //
      // 이 값이면 양쪽 파셀의 건물이 최대로 밀려도 중심 거리가 `2 × reach` 이므로 겹침
      // 반경의 합과 정확히 같아진다 — 접하되 겹치지 않는다.
      const reach = half + EAVE;
      const outerX = Math.min(halfX, o.cellX / 2 - reach);
      const outerZ = Math.min(halfZ, o.cellZ / 2 - reach);

      // ── 사분면이 동나면 자리를 찾아 놓는다 (2026-08-12) ──────────────────
      // `i < 4` 는 **한 줄도 안 바뀐다** — 사분면 1:1 배정이 겹침을 구조적으로 막는
      // 그 경로 그대로다. `?density=1`(기본) 에서는 `n ≤ 4` 라 아래 분기를 절대 안 탄다.
      //
      // 5채째부터가 문제였다. `shuffledQuadrants` 는 언제나 4개를 돌려주므로
      // `quads[4]` 는 `undefined` 이고, `road-topology.ts` 의 `quad & 1` 은
      // `undefined & 1 === 0` 이라 **예외도 NaN 도 없이 사분면 0 으로 떨어졌다.**
      // 순열이라 거기엔 이미 건물이 서 있다 — 실측: `density=2` 에서 겹침 3,192건
      // (21×21 파셀·3 tier, 최대 4.27m). 화면에만 나타나는 형태라 아무도 못 봤다.
      //
      // **왜 서브셀 분할이 아닌가 — 공간이 없다.** 두 건물이 안 겹치려면 중심 거리가
      // `reach₁ + reach₂` 여야 하고 상한은 `2 × (MAX_SIDE/2 + EAVE)` = **7.2m** 다.
      // 그런데 한 사분면에서 실제로 표집되는 띠는 축당 `[inset, outerX]` 이고
      // (`inset = half + SETBACK + LAMP_CLEARANCE`, `outerX = min(halfX, cellX/2 - reach)`)
      // 큰 건물일수록 좁아진다 — 검수관 정밀 계산으로 **2.5m(대형)~5.1m(중형)**.
      // 쪼개기 전에 이미 7.2m 에 못 미치므로 2×2 로 나누면 더 나빠진다.
      //
      // ⚠ 이 자리에 원래 *"쪼개면 폭이 3.3m"* 이라고 적었는데 다른 파일의 근사 상수
      // (6.5m)를 반으로 나눈 **근사 위의 근사**였다(검수관 P2). 결론은 같지만 근거가
      // 규율(*"유도할 수 있으면 유도한다"*)에 못 미쳤다 — 위 식은 전부 코드 상수에서 온다.
      //
      // 그래서 **자리가 되는 만큼만 놓는다**(나무가 이미 쓰는 방식 — `tree.ts` 의
      // `freeSlots`). 밀도를 올리면 채수가 상한이 아니라 **파셀이 감당하는 만큼**에서
      // 포화한다. 그것이 정직한 동작이다.
      const pos = i < 4
        ? pickInQuadrant(rnd, outerX, outerZ, dirs, quads[i], inset)
        : findFree(rnd, outerX, outerZ, dirs, inset, reach, quads, i, [...placed, ...out], radiusOf);
      // 자리가 없으면 이 채는 포기한다.
      if (!pos) continue;
      const tone = Math.floor(rnd() * 5);
      out.push({ kind: 'building', x: pos.x, z: pos.z, y: 0, ry, sx: w, sy: h, sz: d, tone });
    }
    return out;
  },

  asset: (T) => ({
    geometry: new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    material: new T.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 }),
    castShadow: true,
    receiveShadow: true,
  }),
};
