// world2/systems/village-parcels.ts — **동결 파셀을 들고 있는 자리.** 계산과 저장의 경계.
//
// ── 무엇을 위한 것인가 ──────────────────────────────────────────────────────
// W4 ① 이 빌더에 `frozenAt` 이라는 **문**을 냈고, 그 문에 무엇을 물릴지는 비어 있었다.
// 이 파일이 그 «무엇» 이다 — 동결 배치를 들고, 바뀌면 알린다.
//
// 판정과 근거의 SSOT 는 순수 계층 두 곳이다:
//   · `decide/overlay.ts`      — 계약(`FrozenParcel`), «near 배열 하나만 담는다»
//   · `decide/parcel-freeze.ts` — 색인 키(`keyOf`)·tier 필터(`forTier`)
// **여기서 그 규칙을 다시 적지 않는다.** 이 파일이 더하는 것은 «가변» 하나다.
//
// ── 왜 순수 계층이 아닌가 ───────────────────────────────────────────────────
// `createFrozenLookup`(순수)은 색인을 **한 번 만들고 굳힌다.** 편집은 그 반대다 —
// 감독이 건물 하나를 옮길 때마다 색인이 바뀌고, 바뀐 파셀만 다시 만들어져야 한다.
// 가변 상태를 `decide/` 에 두면 그 계층의 «순수 함수만» 규약이 깨진다.
//
// ── 알림이 왜 계약의 일부인가 ───────────────────────────────────────────────
// 동결을 바꿔도 **이미 떠 있는 파셀은 저절로 안 바뀐다.** 슬롯은 build 시점에 한 번
// 쓰이고 그 뒤로 아무도 다시 읽지 않기 때문이다. 알림 없이 저장만 하면 «편집했는데
// 화면이 그대로다 → 새로고침하면 반영돼 있다» 가 되고, 그건 화면에서만 드러난다.
// 그래서 저장과 알림을 **한 함수 안에 묶는다** — 부르는 쪽이 잊을 자리를 없앤다.

import { forTier, keyOf } from '../decide/parcel-freeze.js';
import type { FrozenParcel } from '../decide/overlay.js';
import { parcelLayout, DEFAULT_LAYOUT } from '../decide/parcel-layout.js';
import type { LayoutOptions } from '../parts/index.js';
import type { PlacedPart } from '../parts/types.js';
import type { Tier } from '../decide/lod.js';

/**
 * 마을 파셀에 편집이 닿는 유일한 통로. 조립부가 만들어 `FeatureEnv` 로 넘긴다.
 *
 * ⚠ **빌더는 이것을 import 하지 않는다.** 조회 함수(`lookup`) 하나만 주입받는다 —
 * 생성기 계층이 편집 데이터를 알게 되는 것을 막는 팀장 조건의 집행 축 ① 이고,
 * `tests/world2-parcel-freeze.test.ts` 가 그 축을 지킨다.
 */
export interface VillageParcels {
  /**
   * 빌더에 주입할 조회. 동결이 없으면 `null` — 그러면 빌더가 **계산한다.**
   *
   * `null` 과 빈 배열은 다른 뜻이다(계약 `decide/overlay.ts`): `null` = 안 손댔다,
   * 빈 배열 = 손대서 전부 지웠다.
   */
  lookup(px: number, pz: number, tier: Exclude<Tier, 'none'>): readonly PlacedPart[] | null;

  /** 이 파셀이 동결됐는가. 빈 배열로 동결된 파셀도 **참**이다 */
  isFrozen(px: number, pz: number): boolean;

  /**
   * 그 파셀의 **지금 배치**(near 기준 전체). 동결이 있으면 그것, 없으면 계산값.
   *
   * 편집이 «이 파셀을 손대겠다» 할 때 첫 스냅샷을 얻는 자리다. 계산값을 그대로
   * 동결로 넣으면 그 순간부터 밀도 노브에서 빠진다 — 감독 판정이 정한 대가다.
   *
   * **복사본을 돌려준다.** 부르는 쪽이 원소를 고쳐도 저장소가 안 바뀐다 —
   * 고친 것을 반영하려면 `freeze` 로 다시 넣어야 한다(경로를 하나로 묶는다).
   */
  partsAt(px: number, pz: number): PlacedPart[];

  /** 동결을 건다(또는 갈아 끼운다). **그 파셀은 다시 만들어진다** */
  freeze(px: number, pz: number, parts: readonly PlacedPart[]): void;

  /** 동결을 푼다 — 계산 배치로 돌아간다. 안 걸려 있었으면 아무 일도 없다 */
  thaw(px: number, pz: number): void;

  /**
   * 파일에서 읽은 것을 통째로 앉힌다. **이전 동결은 전부 사라진다.**
   *
   * 사라진 파셀도 «바뀐 파셀» 이다 — 계산 배치로 돌아가야 하므로 알림을 받는다.
   * 합집합으로 알리지 않으면 «파일을 다시 읽었더니 지운 동결이 화면에 남아 있다» 가 된다.
   */
  setAll(parcels: readonly FrozenParcel[]): void;

  /** 내보내기용 스냅샷. 계약 순서(`px`·`pz`·`parts`)를 그대로 낸다 */
  list(): FrozenParcel[];

  /** 동결된 파셀 수. 진단이 쓴다 */
  size(): number;

  /**
   * 파셀 하나가 바뀔 때마다 불린다. 조립부가 스트리밍의 `invalidate` 를 물린다.
   *
   * 여러 번 등록할 수 있다 — 진단·HUD 가 나중에 붙을 자리를 막지 않으려는 것이지
   * 지금 소비자가 둘이라는 뜻은 아니다.
   */
  onChange(cb: (px: number, pz: number) => void): void;
}

export interface VillageParcelsOptions {
  /** `partsAt` 이 계산에 쓸 레이아웃. 조립부의 것과 **같은 것**이어야 한다 */
  layout?: LayoutOptions;
}

/** 파츠 배열 복사. 원소까지 새로 만든다 — 얕게 두면 부르는 쪽이 원소를 고쳐 저장소가 샌다 */
function copyParts(parts: readonly PlacedPart[]): PlacedPart[] {
  return parts.map((p) => ({ ...p }));
}

export function createVillageParcels(opts: VillageParcelsOptions = {}): VillageParcels {
  const layout: LayoutOptions = { ...DEFAULT_LAYOUT, ...opts.layout };
  /** 키(`keyOf`) → 그 파셀의 near 기준 배치 */
  const index = new Map<string, PlacedPart[]>();
  /** 키 → 파셀 좌표. 키를 되파싱하지 않으려고 함께 든다(파싱은 형식을 두 곳에 적는 일이다) */
  const coords = new Map<string, { px: number; pz: number }>();
  const listeners: ((px: number, pz: number) => void)[] = [];

  function notify(px: number, pz: number): void {
    // 한 리스너가 던져도 나머지는 받는다. 알림 실패로 저장이 무효가 되면 «저장은 됐는데
    // 화면만 안 바뀐» 상태보다 나쁘다 — 그때는 저장까지 잃는다.
    for (const cb of listeners) {
      try { cb(px, pz); } catch { /* 이 리스너만 빠진다 */ }
    }
  }

  return {
    lookup(px, pz, tier) {
      // 동결이 하나도 없으면 여기서 끝난다. `fill()` 은 **파셀 × 종류**마다 불리므로
      // 이 경로가 라이브의 기본값이다(감독이 마을을 손대기 전까지 계속 비어 있다).
      if (index.size === 0) return null;
      const parts = index.get(keyOf(px, pz));
      if (parts === undefined) return null;
      // ⚠ 매 호출 새 배열이 나온다(`forTier` 가 `filter`). 캐시를 **일부러 안 넣었다** —
      // 무효화 축이 하나 더 생기고, 그 축은 «편집했는데 옛 배치가 나온다» 로만 드러난다.
      // 비용은 계산 경로(`parcelLayout`: 난수 + 충돌 검사)보다 확실히 싸다.
      return forTier(parts, tier);
    },

    isFrozen(px, pz) {
      return index.has(keyOf(px, pz));
    },

    partsAt(px, pz) {
      const frozen = index.get(keyOf(px, pz));
      if (frozen !== undefined) return copyParts(frozen);
      // 계산 경로는 **near 로 뽑는다.** 계약이 near 기준 배열 하나만 담기 때문이다 —
      // mid 로 뽑아 동결하면 near 에서 보일 것이 영영 사라진다.
      return copyParts(parcelLayout(px, pz, 'near', layout));
    },

    freeze(px, pz, parts) {
      const key = keyOf(px, pz);
      index.set(key, copyParts(parts));
      coords.set(key, { px: px | 0, pz: pz | 0 });
      notify(px, pz);
    },

    thaw(px, pz) {
      const key = keyOf(px, pz);
      if (!index.delete(key)) return; // 안 걸려 있었다 — 알릴 변경이 없다
      coords.delete(key);
      notify(px, pz);
    },

    setAll(parcels) {
      // 바뀐 파셀 = (이전 ∪ 새) 다. 교집합도 넣는 이유: 같은 파셀의 **내용**이 달라졌을
      // 수 있고, 여기서 그것을 비교하려면 배치 동등성 판정이 필요해진다(파츠 9필드 ×
      // 수십 개). 비교를 만드는 대신 다시 만든다 — 파일 로드는 세션당 한 번이다.
      const touched = new Map<string, { px: number; pz: number }>(coords);
      index.clear();
      coords.clear();
      for (const p of parcels) {
        const px = p.px | 0;
        const pz = p.pz | 0;
        const key = keyOf(px, pz);
        index.set(key, copyParts(p.parts));
        coords.set(key, { px, pz });
        touched.set(key, { px, pz });
      }
      for (const c of touched.values()) notify(c.px, c.pz);
    },

    list() {
      const out: FrozenParcel[] = [];
      for (const [key, parts] of index) {
        const c = coords.get(key);
        if (!c) continue; // 두 맵은 항상 함께 갱신된다 — 여기 오면 위쪽이 깨진 것이다
        out.push({ px: c.px, pz: c.pz, parts: copyParts(parts) });
      }
      return out;
    },

    size() {
      return index.size;
    },

    onChange(cb) {
      listeners.push(cb);
    },
  };
}
