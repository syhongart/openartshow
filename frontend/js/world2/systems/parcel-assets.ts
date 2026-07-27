// world2/systems/parcel-assets.ts — 파셀 부품의 지오·재질·색, 그리고 슬롯 풀 어댑터.
//
// ── 조합을 여기서 다 세어 둔다 ───────────────────────────────────────────────
// 이 파일이 만드는 (지오, 재질) 쌍의 수가 곧 세션 전체의 파이프라인 조합 수다. 부팅 때
// 한 번 만들고 끝이므로, 여기 목록이 짧으면 실행 중 증식이 구조적으로 불가능하다.
// 현행에서 파셀 1개 승격에 머티리얼 19개·지오 44개가 새로 태어나던 것과 대비되는 지점이다.
//
// ── 색을 재질로 가르지 않는다 ────────────────────────────────────────────────
// 색조(tone)마다 재질을 만들면 조합이 종류×색조로 불어난다. 대신 `instanceColor`를 쓴다 —
// 인스턴스 색은 파이프라인 캐시키를 늘리지 않는다(구조 신호가 아니다).

import * as THREE from 'three/webgpu';
import type { InstancePools } from './instancing.js';
import type { SlotPool } from './parcel-builder.js';
import type { PartKind } from '../decide/parcel-layout.js';

/**
 * 색조 팔레트. 판정 계층은 `tone` 번호만 알고, 실제 색은 여기서 정한다 —
 * 룩을 바꿔도 배치 판정과 그 테스트가 흔들리지 않게 하려는 분리다.
 */
export const TONE_PALETTE: Record<PartKind, readonly number[]> = {
  ground: [0x2a3140, 0x2f3646, 0x262d3a],
  building: [0x3d4557, 0x454e63, 0x353c4c, 0x4a5468, 0x2e3543],
  tree: [0x2f4a3a, 0x365441, 0x284134],
  lamp: [0xc9b47a],
};

/** 부품 하나의 렌더 자산. 부팅 때 만들고 세션 내내 재사용한다. */
export interface PartAsset {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow: boolean;
  receiveShadow: boolean;
}

/**
 * 부품 자산을 만든다. **피벗은 모두 바닥**이다 — 배치 판정이 y=0을 "땅에 붙은 상태"로
 * 내보내므로, 지오메트리 쪽에서 반칸 올려두지 않으면 전부 땅에 반쯤 묻힌다.
 */
export function createPartAssets(): Record<PartKind, PartAsset> {
  const box = () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

  const ground = new THREE.BoxGeometry(1, 1, 1).translate(0, -0.5, 0); // 지면은 아래로
  const building = box();
  // 나무는 원뿔 하나로 저폴리 실루엣만. 세그먼트를 줄여 삼각형 예산을 아낀다.
  const tree = new THREE.ConeGeometry(0.6, 2.4, 6).translate(0, 1.2, 0);
  const lamp = new THREE.CylinderGeometry(0.08, 0.12, 4.2, 6).translate(0, 2.1, 0);

  // three/webgpu에는 `MeshStandardMaterialParameters` 선언이 없다. 클래스에서 생성자
  // 파라미터 타입을 뽑아 쓰면 three 버전이 올라가도 따라간다.
  type StdParams = NonNullable<ConstructorParameters<typeof THREE.MeshStandardMaterial>[0]>;
  const lit = (o: StdParams) =>
    new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05, ...o });

  return {
    ground: { geometry: ground, material: lit({ roughness: 0.95 }), castShadow: false, receiveShadow: true },
    building: { geometry: building, material: lit({}), castShadow: true, receiveShadow: true },
    tree: { geometry: tree, material: lit({ roughness: 0.9 }), castShadow: true, receiveShadow: false },
    // 가로등 기둥은 자체발광을 살짝 줘서 밤 분위기에서 형태가 읽히게 한다.
    lamp: { geometry: lamp, material: lit({ emissive: 0x2a2415, roughness: 0.6 }), castShadow: false, receiveShadow: false },
  };
}

/**
 * `InstancePools`를 파셀 빌더가 쓰는 좁은 인터페이스로 감싼다.
 * 여기서만 tone 번호 → THREE.Color 변환이 일어난다.
 */
export function createSlotPool(pools: InstancePools): SlotPool {
  const c = new THREE.Color();
  return {
    acquire: (key) => pools.acquire(key),
    setTransform: (h, x, y, z, ry, sx, sy, sz) => pools.setTransform(h, x, y, z, ry, sx, sy, sz),
    setTone: (h, tone) => {
      const palette = TONE_PALETTE[h.key as PartKind] ?? [0xffffff];
      c.setHex(palette[tone % palette.length] ?? palette[0]);
      pools.setColor(h, c);
    },
    release: (h) => pools.release(h),
  };
}
