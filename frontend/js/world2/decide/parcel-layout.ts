// world2/decide/parcel-layout.ts — 파셀 배치 계산. 순수 함수만, import 0.
//
// ── 왜 배치가 판정 계층인가 ──────────────────────────────────────────────────
// 파셀 안에 무엇을 어디에 놓을지는 **입력(좌표·tier)만으로 정해지는 계산**이다. 현행은 이
// 계산이 지오메트리 생성과 같은 함수에 있어서(`new THREE.BoxGeometry(...)` 옆줄에서 좌표를
// 정한다) 배치만 따로 시험할 수 없었고, 그래서 "tier가 바뀌면 건물이 살짝 움직이는" 버그를
// 눈으로 발견할 때까지 몰랐다.
//
// ── 두 가지 불변식 ───────────────────────────────────────────────────────────
// ① **좌표 결정론**: 같은 (px,pz)는 언제나 같은 배치를 낸다. 저장하지 않고 매번 다시
//    계산하므로("파라미터가 곧 공간"), 이게 깨지면 파셀이 언로드/재로드될 때마다 세상이
//    바뀐다.
// ② **tier 포함관계**: far ⊆ mid ⊆ near 이고, 공통 원소의 **위치가 동일**하다. tier는
//    무엇을 그릴지만 줄이지 어디에 그릴지를 바꾸지 않는다. 이게 깨지면 멀어졌다 가까워질
//    때 건물이 순간이동한다.

export type PartKind = 'ground' | 'building' | 'tree' | 'lamp';

export interface PlacedPart {
  kind: PartKind;
  /** 파셀 중심 기준 오프셋(월드 미터). 파셀 원점 가산은 호출자가 한다 */
  x: number;
  z: number;
  /** 바닥에서의 높이(피벗은 부품 바닥) */
  y: number;
  /** Y축 회전(라디안) */
  ry: number;
  sx: number;
  sy: number;
  sz: number;
  /** 팔레트 인덱스 — 실제 색은 렌더 계층이 정한다(판정은 색을 모른다) */
  tone: number;
}

/**
 * 32비트 정수 해시. 좌표 → 시드.
 *
 * 두 축을 **순차로 섞는다.** 흔한 `imul(px,A) ^ imul(pz,B)` 형태를 먼저 썼다가 버렸는데,
 * XOR 결합이 정보를 파괴해서 서로 다른 좌표가 같은 값으로 뭉쳤다 — 실측으로 9×9 격자에서
 * 81칸 중 69칸만 고유했고, 대각선(px===pz)에서는 41칸 중 21칸까지 무너졌다. 파셀 시드가
 * 겹치면 세상 여기저기에 똑같은 구획이 복사돼 나타난다.
 *
 * 순차 믹싱으로 바꾼 뒤 80×80(6400칸) 전 범위 무충돌이다. `Math.imul`도 필수다 —
 * JS의 `*`는 부동소수점 곱이라 32비트를 넘는 순간 하위 비트가 날아간다.
 */
export function hash2(px: number, pz: number): number {
  let h = 0x9e3779b9;
  h = Math.imul(h ^ (px | 0), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h ^ (pz | 0), 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x27d4eb2d);
  return (h ^ (h >>> 15)) >>> 0;
}

/** 시드에서 0~1 난수를 뽑는 순수 생성기(mulberry32). 상태를 클로저에 가둔다. */
export function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LayoutOptions {
  cellX: number;
  cellZ: number;
  /** 파셀 가장자리 여백(미터) — 이웃 파셀과 부품이 겹치지 않게 */
  margin?: number;
  /** 건물 최대 개수(near 기준) */
  maxBuildings?: number;
  maxTrees?: number;
  maxLamps?: number;
}

export const DEFAULT_LAYOUT: Required<LayoutOptions> = {
  cellX: 32, cellZ: 32, margin: 2.5,
  maxBuildings: 6, maxTrees: 8, maxLamps: 4,
};

/**
 * tier별로 그릴 종류. **near가 상위집합**이라는 규약이 여기에 표현된다.
 * 순서도 의미가 있다 — 배치는 이 순서로 생성되므로, 앞쪽 종류는 tier가 내려가도 같은
 * 난수 흐름을 받아 같은 자리에 남는다.
 */
const KINDS_BY_TIER: Record<'near' | 'mid' | 'far', readonly PartKind[]> = {
  near: ['ground', 'building', 'tree', 'lamp'],
  mid: ['ground', 'building', 'tree'],
  far: ['ground', 'building'],
};

export function kindsFor(tier: 'near' | 'mid' | 'far'): readonly PartKind[] {
  return KINDS_BY_TIER[tier];
}

/**
 * 반경이 넓은 tier부터. `outermostTierFor`가 이 순서로 훑는다.
 *
 * 이 순서가 맞는 근거는 **`validBands`의 `nearExit ≤ midEnter < midExit ≤ farEnter < farExit`**
 * 이다 — EXIT 반경이 near < mid < far로 단조 중첩되므로 far가 언제나 가장 넓다.
 * `KINDS_BY_TIER`의 배열 순서와는 무관하다.
 */
const TIER_OUTWARD_IN = ['far', 'mid', 'near'] as const;

/**
 * 이 종류가 그려지는 **반경이 가장 넓은 tier**. 어디에도 없으면 null.
 *
 * 슬롯 예산이 여기서 나온다 — lamp는 near에만 있으므로 near 반경 안에 들어올 수 있는
 * 파셀 수만큼만 있으면 되고, 그건 far 반경 파셀 수의 1/3이다. 예산을 종류와 무관하게
 * "최대 파셀 수"로 잡으면 tree·lamp가 도달 불가능한 최악치를 잡고 앉아 있게 된다.
 *
 * **의존하는 것은 `validBands`(EXIT 반경 단조 중첩)이지 "near가 상위집합"이 아니다.**
 * 처음엔 상위집합 규약을 근거로 적었는데 검수관이 반례로 짚었다 — `KINDS_BY_TIER`에
 * 구멍이 있어도(어떤 종류가 mid에만 있고 near에 없어도) 이 스캔은 여전히 옳다.
 * 근거를 잘못 지목한 주석은 나중에 엉뚱한 것을 지키게 만든다.
 *
 * `KINDS_BY_TIER`에서 유도하므로 tier 구성이 바뀌면 예산이 저절로 따라온다.
 */
export function outermostTierFor(kind: PartKind): 'near' | 'mid' | 'far' | null {
  for (const t of TIER_OUTWARD_IN) if (KINDS_BY_TIER[t].includes(kind)) return t;
  return null;
}

/**
 * 파셀 배치를 계산한다.
 *
 * 핵심 구현 규약: **종류마다 독립된 시드**를 쓴다. 하나의 난수 흐름을 공유하면 tier가
 * 낮아져 tree를 건너뛰는 순간 그 뒤 lamp의 난수가 어긋나 위치가 바뀐다. 종류별로 시드를
 * 갈라두면 어떤 종류를 생략하든 나머지가 그대로다 — 불변식 ②가 구조적으로 성립한다.
 */
export function parcelLayout(
  px: number,
  pz: number,
  tier: 'near' | 'mid' | 'far',
  opts: LayoutOptions = DEFAULT_LAYOUT,
): PlacedPart[] {
  const o = { ...DEFAULT_LAYOUT, ...opts };
  const kinds = kindsFor(tier);
  const out: PlacedPart[] = [];
  const halfX = o.cellX / 2 - o.margin;
  const halfZ = o.cellZ / 2 - o.margin;
  const base = hash2(px, pz);

  for (const kind of kinds) {
    // 종류별 시드 분리 — tier가 바뀌어도 같은 종류는 같은 난수를 받는다.
    const rnd = rngFrom(hash2(base, KIND_SALT[kind]));
    if (kind === 'ground') {
      out.push({
        kind, x: 0, z: 0, y: 0, ry: 0,
        sx: o.cellX, sy: 0.1, sz: o.cellZ,
        tone: Math.floor(rnd() * 3),
      });
      continue;
    }
    const n = countFor(kind, rnd, o);
    for (let i = 0; i < n; i++) {
      const x = (rnd() * 2 - 1) * halfX;
      const z = (rnd() * 2 - 1) * halfZ;
      const ry = Math.floor(rnd() * 4) * (Math.PI / 2); // 직각 배치 — 도시가 정돈돼 보인다
      out.push(makePart(kind, x, z, ry, rnd));
    }
  }
  return out;
}

const KIND_SALT: Record<PartKind, number> = {
  ground: 0x9e3779b9, building: 0x7f4a7c15, tree: 0x2545f491, lamp: 0x94d049bb,
};

function countFor(kind: PartKind, rnd: () => number, o: Required<LayoutOptions>): number {
  if (kind === 'building') return 2 + Math.floor(rnd() * (o.maxBuildings - 1));
  if (kind === 'tree') return Math.floor(rnd() * (o.maxTrees + 1));
  if (kind === 'lamp') return Math.floor(rnd() * (o.maxLamps + 1));
  return 0;
}

function makePart(kind: PartKind, x: number, z: number, ry: number, rnd: () => number): PlacedPart {
  if (kind === 'building') {
    const w = 3 + rnd() * 5;
    const d = 3 + rnd() * 5;
    const h = 4 + rnd() * 16;
    return { kind, x, z, y: 0, ry, sx: w, sy: h, sz: d, tone: Math.floor(rnd() * 5) };
  }
  if (kind === 'tree') {
    const s = 0.8 + rnd() * 0.8;
    return { kind, x, z, y: 0, ry, sx: s, sy: s * (1.2 + rnd() * 0.6), sz: s, tone: Math.floor(rnd() * 3) };
  }
  // lamp — 크기 편차를 두지 않는다(가로등이 제각각이면 인공물처럼 보인다)
  return { kind, x, z, y: 0, ry, sx: 1, sy: 1, sz: 1, tone: 0 };
}

/**
 * 종류별 최대 개수 — 슬롯 풀 예산 산정에 쓴다.
 *
 * 풀은 부팅 때 고정 크기로 잡으므로, "한 파셀이 최대 몇 개를 쓰는가 × 동시 로드 파셀 수"를
 * 알아야 한다. 이 값이 실제 배치보다 작으면 슬롯이 모자라 파셀이 조용히 덜 그려진다.
 */
export function maxPartsPerParcel(kind: PartKind, opts: LayoutOptions = DEFAULT_LAYOUT): number {
  const o = { ...DEFAULT_LAYOUT, ...opts };
  if (kind === 'ground') return 1;
  if (kind === 'building') return o.maxBuildings; // 2 + floor(rnd*(max-1)) ≤ max
  if (kind === 'tree') return o.maxTrees;
  return o.maxLamps;
}
