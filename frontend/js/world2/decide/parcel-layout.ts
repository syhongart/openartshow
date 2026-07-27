// world2/decide/parcel-layout.ts — 파셀 배치 계산. 순수 함수만.
//
// ── 왜 배치가 판정 계층인가 ──────────────────────────────────────────────────
// 파셀 안에 무엇을 어디에 놓을지는 **입력(좌표·tier)만으로 정해지는 계산**이다. world1 은
// 이 계산이 지오메트리 생성과 같은 함수에 있어서(`new THREE.BoxGeometry(...)` 옆줄에서
// 좌표를 정한다) 배치만 따로 시험할 수 없었고, 그래서 "tier 가 바뀌면 건물이 살짝 움직이는"
// 버그를 눈으로 발견할 때까지 몰랐다.
//
// ── 두 가지 불변식 ───────────────────────────────────────────────────────────
// ① **좌표 결정론**: 같은 (px,pz)는 언제나 같은 배치를 낸다. 저장하지 않고 매번 다시
//    계산하므로("파라미터가 곧 공간"), 이게 깨지면 파셀이 언로드/재로드될 때마다 세상이
//    바뀐다.
// ② **tier 포함관계**: far ⊆ mid ⊆ near 이고, 공통 원소의 **위치가 동일**하다. tier 는
//    무엇을 그릴지만 줄이지 어디에 그릴지를 바꾸지 않는다. 이게 깨지면 멀어졌다 가까워질
//    때 건물이 순간이동한다.
//
// ── 무엇이 여기 없는가 ───────────────────────────────────────────────────────
// **파츠별 지식이 전부 빠졌다.** 종류 목록·tier 구성·난수 시드·개수·크기·색이 이제
// `parts/` 의 파츠 파일에 있다. 이 파일에 남은 것은 "파셀 하나를 어떻게 훑는가" 뿐이다 —
// 도로를 추가할 때 여기를 열 일이 없다는 것이 그 분리의 요점이다.

import { PARTS, kindsFor, maxPartsPerParcel, outermostTierFor, type PartKind } from '../parts/index.js';
import { DEFAULT_LAYOUT } from '../parts/types.js';
import type { LayoutOptions, PlacedPart } from '../parts/types.js';

export type { PartKind };
export type { LayoutOptions, PlacedPart } from '../parts/types.js';
export { kindsFor, maxPartsPerParcel, outermostTierFor };

/**
 * 32비트 정수 해시. 좌표 → 시드.
 *
 * 두 축을 **순차로 섞는다.** 흔한 `imul(px,A) ^ imul(pz,B)` 형태를 먼저 썼다가 버렸는데,
 * XOR 결합이 정보를 파괴해서 서로 다른 좌표가 같은 값으로 뭉쳤다 — 실측으로 9×9 격자에서
 * 81칸 중 69칸만 고유했고, 대각선(px===pz)에서는 41칸 중 21칸까지 무너졌다. 파셀 시드가
 * 겹치면 세상 여기저기에 똑같은 구획이 복사돼 나타난다.
 *
 * 순차 믹싱으로 바꾼 뒤 80×80(6400칸) 전 범위 무충돌이다. `Math.imul` 도 필수다 —
 * JS 의 `*` 는 부동소수점 곱이라 32비트를 넘는 순간 하위 비트가 날아간다.
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

// 기본 레이아웃의 정의는 `parts/types.ts` 에 있다(파츠가 자기 최대 개수를 계산할 때
// 읽으므로 그쪽이 SSOT 다). 여기서는 기존 소비자를 위해 재수출만 한다.
export { DEFAULT_LAYOUT };

/**
 * 파셀 배치를 계산한다.
 *
 * 핵심 구현 규약: **종류마다 독립된 시드**를 쓴다. 하나의 난수 흐름을 공유하면 tier 가
 * 낮아져 tree 를 건너뛰는 순간 그 뒤 lamp 의 난수가 어긋나 위치가 바뀐다. 종류별로 시드를
 * 갈라두면 어떤 종류를 생략하든 나머지가 그대로다 — 불변식 ②가 구조적으로 성립한다.
 *
 * 그 시드 소금(`salt`)을 파츠가 스스로 들고 있다. 예전에는 이 파일의 `KIND_SALT` 표에
 * 따로 적혀 있었고, 파츠를 추가하며 소금을 빠뜨리면 **다른 종류와 같은 난수를 받아 정확히
 * 겹쳐 서는** 형태로만 드러났다.
 */
export function parcelLayout(
  px: number,
  pz: number,
  tier: 'near' | 'mid' | 'far',
  opts: LayoutOptions = DEFAULT_LAYOUT,
): PlacedPart[] {
  const o = { ...DEFAULT_LAYOUT, ...opts };
  const out: PlacedPart[] = [];
  const halfX = o.cellX / 2 - o.margin;
  const halfZ = o.cellZ / 2 - o.margin;
  const base = hash2(px, pz);

  for (const spec of PARTS) {
    if (!spec.tiers.includes(tier)) continue;
    const rnd = rngFrom(hash2(base, spec.salt));
    out.push(...spec.place({ px, pz, rnd, o, halfX, halfZ }));
  }
  return out;
}
