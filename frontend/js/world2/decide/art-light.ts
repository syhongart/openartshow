// world2/decide/art-light.ts — **작품 조명.** 순수 함수만 (W8-4).
//
// ── 감독 요구 ─────────────────────────────────────────────────────────────
// *"glb 건물 벽에 작품을 걸고 **안에 조명을 비출수있을까**"* (2026-08-16)
// 카드 판정: *"작품마다 스포트 + 천장등 · 마을 건물 벽에도 · 작품과 조명 함께"*
//
// ── 🔴 W8-7 이후 — **이 풀은 액자 테두리만 비춘다** (2026-08-18) ──────────
// 감독 지시(*"작품에는 재질감 전혀없이 … 그림자 영역에서도 그대로"*)로 그림 평면이
// `MeshBasicMaterial` 이 됐다. Basic 은 라이트를 **아예 안 읽으므로**, 여기서 정한
// 스포트는 이제 **테두리(`frameMat`, Standard)에만** 닿는다.
//
// **「그림 조명」으로 읽지 마라** — 풀 크기 판정(조건 1~3)은 그대로 유효하지만 조명
// 대상이 절반이 됐다. 라이트를 그대로 둔 것은 **팀장 판정 2**(*"감독이 라이트를 문제라고
// 한 발화가 없다. 새 축을 여는 것은 「감독이 그것을 문제라고 했는가」 원칙 위반"*)이고,
// 되돌리기 비용도 비대칭이다(두는 것 0, 빼는 것은 풀 구조·`[7]` 기준선·GS-C 테스트).
// 재질 쪽 판정은 `decide/art-material.ts` 한 곳이다.
//
// ── ⚠ world2 에 **실제 라이트를 넣는 첫 사례**다 ──────────────────────────
// 지금 world2 의 실시간 라이트는 **태양 1 + 하늘빛 1, 총 2개**이고 가로등마저 발광 재질로
// 흉내낸 것이다(`parts/lamp.ts:151-156`). 그래서 팀장 판정을 받았고 **조건 6개가 구속**이다.
// 이 파일은 그중 순수 판정 몫이고, 각 조건이 어디서 지켜지는지 아래에 적는다.
//
// ── 처방의 출처: 라이브 오픈월드가 이미 검증했다 ──────────────────────────
// `world.js:296-330` 이 SpotLight 35~65개를 **부팅에 만들고 개수를 절대 안 바꾼다**
// (`intensity` 0↔목표로 켜고 끈다, `visible=false` 금지). 우리는 그 형태를 따르되
// **풀 크기를 유도한다** — 그 파일의 5·13 을 베끼면 근거 없는 상수가 하나 더 생긴다.
//
// ── three r171 실측에서 나온 규칙 하나 ────────────────────────────────────
// `castShadow` 는 `intensity` 와 달리 **캐시키 안**이다(`AnalyticLightNode.js:40`). 그리고
// 그림자를 켜면 라이트마다 **텍스처 2장**이 생겨 `[7]` 개수 불변식이 FAIL 한다
// (`ShadowNode.js:358-362` + `Textures.js:271`). → **1차는 `castShadow=false` 확정**
// (팀장 조건 5). 그림자는 감독 카드로 직행한다.
//
// ── ⚠ 조건 6 — WebGPU 판정 유보 ──────────────────────────────────────────
// 이 파일의 **어떤 값도 실기기에서 검증되지 않았다.** 헤드리스는 swiftshader(WebGL)이고
// 감독 실기기는 WebGPU 라 렌더 경로가 다르다. 여기서 잴 수 있는 것은 **개수와 산술**뿐이고
// «어떻게 보이는가» 는 감독 판정이 유일한 축이다. 헤드리스 통과를 근거로 적지 않는다.

import { maxLatticePoints, tierReach, DEFAULT_BANDS, type TierBands } from './lod.js';
import { frameSize, type ArtworkItem } from './artwork.js';

/**
 * 파셀당 조명 개수 상한.
 *
 * ⚠ **이 값만은 유도가 아니라 판단이다** — 정직하게 적는다. 상한을 정하는 것은 성능
 * 예산인데 이 환경에서 실기기 프레임 시간을 잴 수 없다(조건 6). 그래서 «셀 수 있는 것»
 * 에 붙였다: `DEFAULT_LAYOUT.maxBuildings = 4` — **파셀에 건물이 넷이면 건물마다 최소
 * 하나는 조명 받는 작품이 있다**가 보장된다. 그것이 «자기 건물에 조명» 이라는 감독 요구의
 * 최소 성립 조건이다.
 *
 * 넘는 작품은 **걸리되 라이트 없이** 뜬다(팀장 조건 4 — 아래 `assignArtLights`).
 *
 * **재론 트리거**: 감독이 실기기에서 «어둡다» 또는 «느리다» 중 하나를 말하는 순간.
 * 전자면 올리고 후자면 내린다 — 둘 다 화면에서만 판정된다.
 */
export const ART_LIGHT_PER_PARCEL = 4;

/**
 * 약한 기기의 파셀당 상한(팀장 조건 3 — soft 완화 축 계승).
 *
 * ── 🧠 **팀장 판정 2026-08-17 — 조건 3 의 저자 의도** ─────────────────────
 * *"soft 의 작용 축은 **파셀당 cap(배정)** 이고, 풀 크기는 **조건 2 소관**이다 — 유도
 * 변수는 «동시에 보이는 방의 수»이지 soft 가 아니다."* 그래서 **풀 크기는 이 값으로
 * 줄이지 않는다.** soft 는 **몇 개를 켜는가**만 바꾼다.
 *
 * 조건 3 의 원문은 표의 한 줄(*"약한 기기에서 파셀당 cap 축소"*)이고 **문언만으로는
 * 풀 크기까지 규율하는지 안 갈렸다** — 그것이 아래 사고의 원인이자, 저자 의도를 여기
 * 적어 두는 이유다(다음에 풀 산정을 만지는 사람이 읽는 자리가 여기다).
 *
 * ⚠⚠ **이 문장은 한동안 거짓이었다**(검수관 블로커 B1). 집행부가
 * `artLightPoolSize(perParcel)` 을 불러 soft 를 넘기면 풀이 28 → **7** 로 줄었고,
 * 같은 회차의 테스트는 *"풀은 `perParcel` 을 따라 잡힌다"* 라고 **반대**를 적고 있었다 —
 * 두 파일이 모순인 채 게이트가 전부 초록이었다. 왜 안 잡혔나: 그것을 «잰다» 던 단언이
 * `artLightPoolSize(4) === artLightPoolSize(4)` 라 **동어반복**이었다(뮤테이션 0 failed.
 * 대조로 조건 1·2·4·5 는 각각 4·1·6·1). **다섯 중 하나만 장식이었는데 다섯 다 있다고
 * 보고됐다.**
 *
 * **이 문장을 지키는 자리는 여기가 아니라 집행부다** — 순수 함수는 인자로 받은 값을 쓸 뿐
 * «누가 무엇을 넘기는가» 를 강제할 수 없다. 축은 `tests/world2-artwork-scene.test.ts` 의
 * **「★ GS-C」**이고 `perParcel` 1 과 4 로 각각 씬을 만들어 **라이트 수가 같고 켜진 수만
 * 다른가**를 한 테스트에서 비교한다. 두 값을 한자리에서 비교하지 않으면 어떤 단언도
 * 동어반복으로 무너진다.
 */
export const ART_LIGHT_PER_PARCEL_SOFT = 1;

/**
 * 라이트 풀 크기. **「동시에 보이는 방의 수」에서 유도한다**(팀장 조건 2).
 *
 * `maxLatticePoints(tierReach('near'))` 가 그 수다 — 반경 안 격자점의 **위치 무관 최댓값**
 * 이고, 슬롯 풀 예산(`parcel-builder.ts`)이 이미 같은 함수로 유도한다. 실측(기본 밴드):
 * near 1.30셀(41.6m) → **7파셀**. 따라서 풀 = 4 × 7 = **28**.
 *
 * **왜 near 인가**: 실내 조명은 가까이서만 의미가 있다. mid(12) 이상을 잡으면 화면에
 * 기여하지 않는 라이트가 셰이더 비용을 상시로 문다 — `lamp` 가 near 에만 있는 것과 같은
 * 판단이고, 예전 예산이 `lamp` 를 far 기준으로 잡아 사용률 20% 였던 그 실수를 안 되풀이한다.
 *
 * **작품 총수에서 유도하지 않는 것이 핵심이다**(팀장 조건 2의 괄호). 그래야 감독 카드
 * 「작품 수는 요금제가 정한다」와 충돌하지 않는다 — 작품이 몇이든 라이트 개수는 상수다.
 */
export function artLightPoolSize(
  perParcel: number = ART_LIGHT_PER_PARCEL,
  bands: TierBands = DEFAULT_BANDS,
): number {
  const parcels = maxLatticePoints(tierReach('near', bands));
  return Math.max(0, Math.floor(perParcel)) * parcels;
}

/** 어느 파셀인가. `parcelOf` 와 같은 식이지만 **좌표 둘만** 본다(three 를 안 들인다) */
function cellOf(x: number, z: number, cellX: number, cellZ: number): string {
  return `${Math.round(x / cellX)},${Math.round(z / cellZ)}`;
}

/**
 * 어느 작품이 조명을 받는가. **결정적이다** — 같은 입력이 언제나 같은 답을 낸다.
 *
 * 파셀마다 앞에서부터 `perParcel` 개까지 켠다. «가까운 순» 같은 카메라 의존 규칙을 쓰지
 * 않는 이유: 카메라가 움직일 때마다 배정이 바뀌면 **작품이 걸어 다니는 동안 깜빡인다.**
 * 배열 순서는 작가가 정한 순서이고(먼저 건 것이 먼저), 그것이 예측 가능하다.
 *
 * 팀장 조건 4 를 **여기서 계약으로 만든다**: 초과분은 `false` 이고, 그것은 «안 걸린다» 가
 * 아니라 «걸리되 라이트 없이» 다. 소비자는 액자를 그대로 만들고 라이트만 안 붙인다.
 */
export function assignArtLights(
  arts: readonly Pick<ArtworkItem, 'x' | 'z'>[],
  perParcel: number,
  cellX: number,
  cellZ: number,
): { lit: boolean[]; skipped: number } {
  const cap = Math.max(0, Math.floor(perParcel));
  const used = new Map<string, number>();
  const lit: boolean[] = [];
  let skipped = 0;
  for (const a of arts) {
    const key = cellOf(a.x, a.z, cellX, cellZ);
    const n = used.get(key) ?? 0;
    const on = n < cap;
    if (on) used.set(key, n + 1); else skipped++;
    lit.push(on);
  }
  return { lit, skipped };
}

// ── 스포트 하나의 배치 ─────────────────────────────────────────────────────

/**
 * 액자에서 조명까지의 거리(m)와 들어올림.
 *
 * 미술관 조명의 관례는 **위 앞쪽 30도** 근처다 — 정면에서 쏘면 반사가 관람자 눈으로
 * 오고(글레어), 너무 위에서 쏘면 액자 아래가 죽는다. `LIGHT_DIST` 1.6m / `LIGHT_LIFT`
 * 0.9m 는 `atan(0.9/1.6) ≈ 29.4°` 로 그 관례에 놓인다 — **두 수를 따로 고르지 않고 각도
 * 하나에서 유도한 것**이 요점이다(둘을 각자 만지면 각도가 조용히 바뀐다).
 */
export const LIGHT_DIST = 1.6;
export const LIGHT_LIFT = 0.9;

/**
 * 스포트 원뿔이 액자를 덮을 여유. `1.0` 이면 액자 모서리가 원뿔 경계에 정확히 닿아
 * 가장자리가 어두워진다 — 액자보다 조금 넓게 쏜다.
 */
export const CONE_MARGIN = 1.25;

/** 원뿔 가장자리의 부드러움(three `SpotLight.penumbra`). 하드 엣지는 «무대 조명» 으로 읽힌다 */
export const CONE_PENUMBRA = 0.45;

export interface SpotPlan {
  /** 라이트 위치(월드) */
  readonly pos: { x: number; y: number; z: number };
  /** 겨냥점 = 액자 중심 */
  readonly target: { x: number; y: number; z: number };
  /** `SpotLight.angle`(라디안, 반각) */
  readonly angle: number;
  /** `SpotLight.distance` — 이 너머는 계산에서 빠진다 */
  readonly distance: number;
  readonly penumbra: number;
}

/**
 * 작품 하나를 비추는 스포트의 자세. **순수 산술이라 실제로 돌려 검사한다.**
 *
 * 각도는 액자 크기에서 **유도한다** — 상수로 박으면 큰 벽화는 가장자리가 죽고 작은
 * 작품은 벽이 함께 밝아진다. 대각선 절반을 덮는 각에 `CONE_MARGIN` 을 곱한다.
 *
 * ⚠ 위치는 액자의 **법선 방향**이다. `ry` 가 벽 바깥을 향하므로(`wallPose` 계약)
 * `sin/cos` 를 그대로 쓴다 — 부호를 뒤집으면 조명이 벽 **안쪽**에서 쏘게 되고,
 * 그러면 화면에는 아무 변화가 없어서 «조명이 안 켜진다» 로만 보인다.
 */
export function spotFor(item: ArtworkItem): SpotPlan {
  const { w, h } = frameSize(item);
  const half = Math.hypot(w, h) / 2;
  const nx = Math.sin(item.ry), nz = Math.cos(item.ry);
  const pos = {
    x: item.x + nx * LIGHT_DIST,
    y: item.y + LIGHT_LIFT,
    z: item.z + nz * LIGHT_DIST,
  };
  const reach = Math.hypot(LIGHT_DIST, LIGHT_LIFT);
  return {
    pos,
    target: { x: item.x, y: item.y, z: item.z },
    // 원뿔 반각. 상한은 three 의 `SpotLight.angle` 한계(π/2)보다 안쪽으로 둔다.
    angle: Math.min(Math.atan((half * CONE_MARGIN) / reach), Math.PI / 2 - 0.01),
    // 액자까지 닿고 그 뒤 벽에서 끝난다 — 더 멀리 잡으면 뒤쪽 물건까지 셰이딩에 든다.
    distance: reach * 2,
    penumbra: CONE_PENUMBRA,
  };
}
