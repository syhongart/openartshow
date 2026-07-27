// world2/systems/parcel-assets.ts — 파츠 자산을 실제로 만들고, 슬롯 풀 어댑터를 얹는다.
//
// ── 조합을 여기서 다 세어 둔다 ───────────────────────────────────────────────
// 이 파일이 만드는 (지오, 재질) 쌍의 수가 곧 세션 전체의 파이프라인 조합 수다. 부팅 때
// 한 번 만들고 끝이므로, 파츠 목록이 짧으면 실행 중 증식이 구조적으로 불가능하다.
// world1 에서 파셀 1개 승격에 머티리얼 19개·지오 44개가 새로 태어나던 것과 대비되는 지점.
//
// ── 지오메트리는 여기 없다 ───────────────────────────────────────────────────
// 파츠마다 `asset(THREE)` 가 자기 지오·재질을 만든다(`parts/*.ts`). 이 파일은 three 를
// 넘겨주고 결과를 모을 뿐이다. 그래서 파츠를 추가할 때 이 파일을 열 일이 없다 —
// 예전에는 `TONE_PALETTE` 와 `createPartAssets` 두 곳에 같은 종류를 또 적어야 했다.
//
// ── 색을 재질로 가르지 않는다 ────────────────────────────────────────────────
// 색조(tone)마다 재질을 만들면 조합이 종류×색조로 불어난다. 대신 `instanceColor` 를 쓴다 —
// 인스턴스 색은 파이프라인 캐시키를 늘리지 않는다(구조 신호가 아니다).

import * as THREE from 'three/webgpu';
import type { InstancePools } from './instancing.js';
import type { SlotPool } from './parcel-builder.js';
import { PARTS, tonesFor, type PartKind } from '../parts/index.js';
import type { PartAsset } from '../parts/types.js';

export type { PartAsset };

/**
 * 파츠 자산을 만든다. **피벗은 모두 바닥**이다 — 배치 판정이 y=0 을 "땅에 붙은 상태"로
 * 내보내므로, 지오메트리 쪽에서 반칸 올려두지 않으면 전부 땅에 반쯤 묻힌다.
 */
export function createPartAssets(): Record<PartKind, PartAsset> {
  const out = {} as Record<PartKind, PartAsset>;
  for (const spec of PARTS) out[spec.kind as PartKind] = spec.asset(THREE);
  return out;
}

/**
 * `InstancePools` 를 파셀 빌더가 쓰는 좁은 인터페이스로 감싼다.
 * 여기서만 tone 번호 → THREE.Color 변환이 일어난다.
 */
export function createSlotPool(pools: InstancePools): SlotPool {
  const c = new THREE.Color();
  return {
    acquire: (key) => pools.acquire(key),
    setTransform: (h, x, y, z, ry, sx, sy, sz) => pools.setTransform(h, x, y, z, ry, sx, sy, sz),
    setTone: (h, tone) => {
      const palette = tonesFor(h.key);
      c.setHex(palette[tone % palette.length] ?? palette[0]);
      pools.setColor(h, c);
    },
    release: (h) => pools.release(h),
  };
}
