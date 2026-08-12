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

import { PARTS, specFor, kindsFor, maxPartsPerParcel, outermostTierFor, type PartKind } from '../parts/index.js';
import { DEFAULT_LAYOUT } from '../parts/types.js';
import { surfaceY } from '../parts/surface.js';
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
    // `out` 을 그대로 넘긴다 — 뒤에 오는 파츠가 앞서 놓인 것을 보고 자리를 피한다.
    // 목록 순서가 곧 우선순위이고, 그래서 `parts/index.ts` 의 배열 순서가 룩에 영향을
    // 준다(예전에는 "실제 동작은 순서와 무관" 했다. 이제 아니다).
    const made = spec.place({ px, pz, rnd, o, halfX, halfZ, placed: out, radiusOf });

    // ── 표면 높이를 여기 한 곳에서 더한다 (팀장 판정 B, 2026-08-12) ──────────
    // 파츠는 **지면 기준 상대 높이**만 안다(밑동이면 y=0). 실제로 밟는 바닥은 그 자리에
    // 깔린 판이 정하고(잔디 0.07 · 도로 0.14 · 광장 0), 그 판정은 `parts/surface.ts` 다.
    //
    // **왜 파츠마다가 아니라 여기인가**: 파츠는 계속 늘고 새 파츠를 만드는 사람이 이
    // 가산을 잊으면 **조용히 잠긴다** — 이번 결함이 감독 스크린샷이 오기까지 아무에게도
    // 안 보였던 그 형태다. 호출부가 하나뿐(`spec.place` 는 저장소 전체에서 이 줄에서만
    // 불린다)이라 여기 두면 새 파츠가 자동으로 따라온다.
    //
    // 반대로 **바닥 판과 그림자는 이미 절대 y** 를 갖고 태어나므로 빼야 한다(`absoluteY`).
    // 그림자가 여기 드는 이유가 덜 자명하다 — `parts/shadow.ts` 의 `place` 가 **캐스터
    // 자세를 복사**하는데, 캐스터는 위 순회에서 **이미 가산된 뒤**라 여기서 또 더하면
    // 이중 가산이다.
    //
    // ⚠ *"캐스터가 먼저"* 는 **우연한 배열 순서가 아니라 구조가 강제한다** — `parts/index.ts`
    // 의 `PARTS = [...BASE, ...shadowParts(BASE)]` 가 그림자를 언제나 BASE **전체 뒤**에
    // 붙인다. `BASE` 안을 어떻게 재정렬해도 그림자가 자기 캐스터보다 앞설 수 없다.
    // (검수관 권고 2026-08-12 — 첫 판본은 *"목록 순서상"* 이라고만 적어 다음 사람이
    // 우연으로 읽고 재확인하게 만들었다.)
    if (spec.absoluteY) out.push(...made);
    else for (const p of made) out.push({ ...p, y: p.y + surfaceY(px, pz, p.x, p.z) * o.surface });
  }
  return out;
}

/**
 * 놓인 부품의 점유 반경. 종류를 몰라도 되게 하는 조회 한 겹.
 *
 * 모르는 종류는 0 이다 — 겹침 판정에서 빠진다. 파츠 목록에 없는 것이 배치에 들어 있을
 * 수는 없으므로 실질적으로 도달하지 않지만, 0 을 돌려주는 쪽이 안전하다(임의의 큰 값을
 * 돌려주면 모르는 종류 하나가 파셀 전체를 비워 버린다).
 */
function radiusOf(p: PlacedPart): number {
  return specFor(p.kind)?.footprint(p) ?? 0;
}
