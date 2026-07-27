// world2/parts/types.ts — 파셀 부품 계약.
//
// ── 왜 만드는가 ──────────────────────────────────────────────────────────────
// 감독 지시: *"날씨 파일이나 캐릭터 파일은 별도로 만들어서 넣었다 뺐다 할 수 있어야지.
// 한 파일 안에다 다 넣지 마."* — 하늘은 `features/` 로 그렇게 했다. 파츠는 아직이었다.
//
// 도로 하나를 추가하려면 **아홉 군데**를 손대야 했다:
//
//   decide/parcel-layout.ts   `PartKind` · `KINDS_BY_TIER` · `KIND_SALT`
//                             `countFor` · `makePart` · `maxPartsPerParcel`   (6)
//   systems/parcel-assets.ts  `TONE_PALETTE` · `createPartAssets`             (2)
//   systems/parcel-builder.ts `ALL_KINDS`                                     (1)
//
// 하늘이 `main.ts` 다섯 군데에 흩어져 있던 것과 같은 형태다. 나무·가로등·도로를 이 상태로
// 얹으면 아홉이 열둘이 된다.
//
// ── 규약: 파츠 하나 = 파일 하나 = `parts/index.ts` 의 한 줄 ─────────────────
// 종류·등장 tier·난수 시드·색 팔레트·개수·배치·지오메트리가 전부 한 파일에 있다.
// 목록에서 한 줄을 지우면 그 파츠의 흔적이 전부 사라진다.
//
// ── three 를 import 하지 않는다 ──────────────────────────────────────────────
// 배치는 순수 판정이라 `decide/` 의 "import 0" 규율을 받고, 지오메트리는 three 가 필요하다.
// 둘을 한 파일에 두려고 **three 를 인자로 받는다**(`asset(T)`). `typeof import(...)` 는
// 타입 위치에서만 쓰이므로 런타임 의존이 0이다 — 이 파일들은 three 없이 로드되고,
// 배치 테스트도 three 없이 돈다.

import type { Tier } from '../decide/lod.js';

/** three 네임스페이스. 값이 아니라 타입으로만 쓴다(런타임 import 0) */
export type ThreeNS = typeof import('three/webgpu');

/** 부품 하나가 놓일 자리. 파셀 중심 기준 오프셋이고, 파셀 원점 가산은 호출자가 한다. */
export interface PlacedPart {
  kind: string;
  x: number;
  z: number;
  /** 바닥에서의 높이(피벗은 부품 바닥) */
  y: number;
  /** Y축 회전(라디안) */
  ry: number;
  sx: number;
  sy: number;
  sz: number;
  /** 팔레트 인덱스 — 실제 색은 파츠의 `tones` 가 정한다(배치는 색을 모른다) */
  tone: number;
}

export interface LayoutOptions {
  cellX: number;
  cellZ: number;
  /** 파셀 가장자리 여백(미터) — 이웃 파셀과 부품이 겹치지 않게 */
  margin?: number;
  /**
   * 건물 최대 개수. **4를 넘기지 마라** — 건물은 사분면에 1:1로 배정돼 겹침을
   * 구조적으로 피하는데, 5채부터는 한 사분면에 둘이 들어가 그 보장이 깨진다.
   */
  maxBuildings?: number;
  maxTrees?: number;
  maxLamps?: number;
}

export type ResolvedLayout = Required<LayoutOptions>;

/**
 * 레이아웃 기본값. **파츠 계약 쪽에 둔다** — 파츠의 `maxPerParcel` 이 이 값을 읽으므로,
 * 배치 계산 파일에 두면 `parts/` → `decide/` → `parts/` 순환이 된다.
 */
export const DEFAULT_LAYOUT: ResolvedLayout = {
  cellX: 32, cellZ: 32, margin: 2.5,
  maxBuildings: 4, maxTrees: 8, maxLamps: 4,
};

/** 배치 함수가 받는 것. 파셀 좌표와 **자기 몫의 난수**만 본다. */
export interface PlaceContext {
  px: number;
  pz: number;
  /** 이 파츠 전용 난수. 종류마다 시드가 갈려 있어 다른 종류의 소비에 영향받지 않는다 */
  rnd: () => number;
  o: ResolvedLayout;
  /** 부품이 놓일 수 있는 반경(여백 적용 후) */
  halfX: number;
  halfZ: number;
}

/** 부품 하나의 렌더 자산. 부팅 때 만들고 세션 내내 재사용한다. */
export interface PartAsset {
  geometry: InstanceType<ThreeNS['BufferGeometry']>;
  material: InstanceType<ThreeNS['Material']>;
  castShadow: boolean;
  receiveShadow: boolean;
}

/**
 * 파츠 선언. `parts/index.ts` 의 목록에 넣는 것이 곧 "켜는 것"이다.
 *
 * `tiers` 가 `KINDS_BY_TIER` 와 슬롯 예산을 **함께** 결정한다. 예전에는 두 곳에 따로
 * 적혀 있어서, 한쪽만 고치면 "가까이서만 보이는데 먼 거리 예산을 잡고 앉은" 상태가 됐다
 * (lamp 가 실제로 그랬다 — near 전용인데 far 와 같은 20파셀분을 잡고 있었다).
 */
export interface PartSpec {
  readonly kind: string;

  /**
   * 이 파츠가 등장하는 tier. **near 가 상위집합**이라는 규약이 여기 표현된다 —
   * 멀리서 보이는 것은 가까이서도 보여야 한다.
   */
  readonly tiers: readonly Exclude<Tier, 'none'>[];

  /**
   * 난수 시드 소금. 종류마다 달라야 한다 — 하나의 난수 흐름을 공유하면 tier 가 낮아져
   * 어떤 종류를 건너뛰는 순간 그 뒤 종류의 위치가 전부 어긋난다.
   */
  readonly salt: number;

  /**
   * 색 팔레트. `tone` 인덱스가 여기를 가리킨다.
   *
   * ⚠️ **이 값은 색이 아니라 곱셈기다.** `instanceColor` 는 프래그먼트에서
   * `diffuseColor *= instanceColor` 로 적용된다. 재질에 `map` 이 없으면 곱해질 것이
   * 흰색이라 여기 적은 값이 그대로 보이지만, **텍스처가 있으면 텍스처와 곱해진다.**
   *
   * 실제로 도로에서 이걸 놓쳤다. 다른 파츠와 같은 방식으로 어두운 회색을 골랐더니
   * 아스팔트 텍스처와 곱해져 최종 알베도가 선형 0.0003 대 — 거의 검정이 됐다. 텍스처는
   * 멀쩡했는데 화면에서 길이 안 보였다.
   *
   * 규칙: **`asset` 이 `map` 을 쓰면 `tones` 는 흰색 근처여야 한다.** 색을 바꾸고 싶으면
   * 텍스처를 그렇게 굽는 편이 낫다 — 곱셈은 어둡게만 만들 수 있고 밝게는 못 만든다.
   */
  readonly tones: readonly number[];

  /**
   * 한 파셀이 쓸 수 있는 최대 개수. **슬롯 예산의 근거**이므로 `place` 가 실제로 내는
   * 최댓값과 반드시 일치해야 한다 — 작으면 부품이 조용히 안 그려지고, 크면 쓰지도 않을
   * 슬롯을 잡고 앉는다. `tests/world2-parts-registry.test.ts` 가 표본으로 대조한다.
   */
  maxPerParcel(o: ResolvedLayout): number;

  /** 배치. 순수 함수다 — 같은 입력이면 언제나 같은 결과 */
  place(ctx: PlaceContext): PlacedPart[];

  /** 지오메트리·재질. 부팅 때 한 번 부른다. **피벗은 바닥**(y=0 이 땅에 붙은 상태) */
  asset(T: ThreeNS): PartAsset;
}
