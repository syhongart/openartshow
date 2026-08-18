// world2/decide/water-style.ts — 게임풍 수면의 **판정과 색 SSOT**. 순수, three 무의존.
//
// ── 왜 `?water=std|tsl` 을 확장하지 않고 새 축인가 ──────────────────────────
// 두 가지가 갈랐다.
//   ① `decide/water.ts` 는 `check:filesize` **동결**이다(558줄). `WATER_MODES` 에
//      `'stylized'` 한 단어도 못 넣는다.
//   ② 설령 넣을 수 있어도 **축이 다르다.** `?water=` 는 «수면을 어느 구현으로 그리나»
//      이고 이것은 «게임풍 레이어를 얹나» 다. 한 열거형에 섞으면 `std × stylized`
//      조합을 표현할 수 없고, 조합을 못 쓰면 감독이 «기존 물 + 새 룩» 을 못 본다.
//
// ── 기존 물을 한 줄도 안 건드린다 ───────────────────────────────────────────
// 켜지면 기존 수면 메시를 `visible=false` 로 물리고 **같은 지오메트리를 공유하는** 새
// 메시를 얹는다. 지오메트리를 공유하는 것이 요점이다:
//   · 지오메트리 개수가 안 늘어난다(개수 불변식).
//   · `features/ocean.ts` 가 매 프레임 정점 y 를 갱신하는 파동(`surfaceLift`)이 **그대로
//     우리 메시에도 온다** — 같은 position 버퍼이기 때문이다. 파형을 다시 유도할 필요가
//     없고, 따라서 두 수면이 갈라져 찢어지는 일도 구조적으로 없다.
//   · 소유는 그대로 ocean 이다. 우리는 dispose 하지 않는다(회수 경로가 두 벌이 되면
//     그것이 이 저장소가 금지한 형태다 — `features/types.ts` 의 팀장 판정).

/**
 * **대역(proxy) 을 얹을 수면.** 이름은 `features/ocean.ts` 가 붙이는 것과 같아야 한다.
 *
 * ⚠ 층2(`*-wave2`)는 여기 **없다.** 두 가지 이유가 겹친다(검수관 반려 B3·P1, 2026-08-18):
 *   ① **트랜스폼은 공유되지 않는다.** `features/ocean.ts` 가 `sea2`(= `ocean-wave2`)의
 *      `position` 을 매 프레임 플레이어에게 스냅 추종시킨다. 우리는 자세를 `create()` 에서
 *      한 번만 복사하므로 대역이 스폰 자리에 남고, 게다가 정점은 **현재** 스냅 좌표 기준
 *      파고로 갱신되므로 파형이 월드와 어긋난다. 정점 버퍼를 공유해도 이 축은 안 따라온다 —
 *      *"두 수면이 갈라질 수 없다"* 는 첫 판본의 주장은 **정점에 대해서만 참**이었다.
 *   ② **반투명이 두 겹으로 곱해진다.** 원본은 층1/층2 가 서로 **다른 재질**이라 겹치는 것이
 *      설계였다. 같은 재질을 두 겹 얹으면 실효 불투명도가 `1-(1-0.82)² = 0.967` 이 되어
 *      `STYLE_OPACITY` 가 화면에 없는 값이 된다. `features/ocean.ts` 가 큰 판 두 장을
 *      겹치지 않는 이유로 같은 사고를 이미 기록해 뒀다.
 * 게임풍 수면은 자체 룩(깊이색·프레넬·포말)이 인상을 만들므로 층2 간섭무늬가 없어도 된다.
 */
export const STYLED_WATER_NAMES = ['ocean', 'river'] as const;

/**
 * **숨기기만 하는 수면.** 대역을 안 얹는다(위 ⚠). 그대로 두면 게임풍 수면 위에 기존
 * 반투명 층이 겹쳐 색이 탁해진다.
 */
export const HIDE_ONLY_NAMES = ['ocean-wave2', 'river-wave2'] as const;

/**
 * ⚠ `'seabed'` 는 **일부러 뺐다.** 해저는 물 아래로 계속 보여야 하고, 그것이 깊이감의
 * 원천이다. 숨기면 물 밑이 빈 공간이 되어 깊은 물이 오히려 얕아 보인다.
 */
export const KEEP_VISIBLE = ['seabed'] as const;

export const WATER_STYLE_MODES = ['off', 'on'] as const;
export type WaterStyleMode = (typeof WATER_STYLE_MODES)[number];

/**
 * 이 백엔드에서 게임풍 수면을 켜는가. `decide/grass.ts` 의 `pickGrassWind` 와 같은 모양.
 *
 * **WebGL 에서는 안 켠다.** 프레넬·화면 깊이는 노드 그래프(TSL)로만 만드는데 world2 의
 * WebGL 경로는 레거시 `WebGLRenderer` 라 노드 재질에 렌더 경로가 없다. 반쪽만 켜는
 * 선택지도 있었지만 버렸다 — 감독의 A/B 가 «게임풍 물 vs 기존 물» 이어야 하는데
 * 반쪽짜리를 보여 주면 그 비교 자체가 무효가 된다.
 */
export function pickWaterStyle(requested: WaterStyleMode, backend: string): WaterStyleMode {
  if (requested !== 'on') return 'off';
  return backend === 'WebGPU' ? 'on' : 'off';
}

// ── 색 — 감독 명세를 그대로 받는다 (2026-08-18) ─────────────────────────────
//
// 감독 코멘트가 hex 를 직접 지정했다: 얕은 물 #27C6C8 · 중간 #149FAE · 깊은 물 #087D91 ·
// 포말 #9EE7D8. *"게임 스타일에서는 청록색을 상당히 강하게 넣는 편이 좋다"* 는 판단이
// 함께 왔으므로 채도를 낮추지 않는다 — 기존 물(`features/ocean.ts` 의 `WATER`)보다
// 훨씬 선명한 것이 **의도**다.
export const SHALLOW = 0x27c6c8;
export const MID = 0x149fae;
export const DEEP = 0x087d91;
export const FOAM = 0x9ee7d8;

/** 프레넬로 섞을 하늘빛. 비스듬히 볼 때 수면이 하늘을 되비추는 자리다 */
export const SKY_TINT = 0xbfe6ff;

/**
 * 정점에 구워 넣는 어트리뷰트 이름. **깊이 텍스처를 안 쓰는 이유가 여기 있다.**
 *
 * ── 왜 화면 깊이를 버렸나 (감독 실기기 2026-08-18 *"쌔까매"*) ────────────────
 * 첫 판본은 `viewportLinearDepth.sub(linearDepth())` 로 물 두께를 쟀다. 그런데 그 노드가
 * 읽는 `viewportDepthTexture` 는 **렌더러가 `backdropNode` 를 볼 때만** 준비하는 자원이다
 * — `features/ocean-tsl.ts` 가 그것을 `backdropNode` 안에서만 쓰는 것이 우연이 아니었다.
 * `colorNode` 에서 직접 샘플하면 WebGPU 파이프라인이 성립하지 않는다.
 *
 * ⚠ **그 실패는 헤드리스가 원리적으로 못 잡는다** — WebGL 경로는 이 재질을 아예 안 탄다
 * (`pickWaterStyle` 화이트리스트). 실제로 `verify-live` 는 이 화면을 열고 **200 · 자산 실패
 * 0 · 콘솔 에러 0 으로 PASS 했다.** 감독 실기기가 유일한 판정 축이었고, 그것이
 * `G-STYL10` 이 말한 그대로다.
 *
 * ── 그리고 이 편이 룩에도 낫다 ──────────────────────────────────────────────
 * 검수관 권고 P-E: 해저가 `SEABED_Y` **평면 한 장**이라 강의 실제 두께가 사실상 상수다.
 * 즉 화면 깊이를 정확히 재도 그라데이션이 거의 안 나온다. **강 중심에서 물가까지의 거리**로
 * 바꾸면 «가운데가 깊고 물가가 얕다» 가 실제 기하와 무관하게 성립한다 — 게임풍이 원하는
 * 것이 정확히 그것이다.
 *
 * 값은 `0`(강 중심·가장 깊음) ~ `1`(물가·가장 얕음). **바다 판은 전부 `0`** 이다 —
 * 바다는 «깊은 물» 이 기본이고 물가 포말은 강에서만 난다.
 */
export const SHORE_ATTR = 'w2ShoreDist';

// ── 물가 램프 ───────────────────────────────────────────────────────────────
//
// `SHORE_ATTR`(0 = 강 중심, 1 = 물가) 위의 구간이다. **미터가 아니라 정규화 거리**다 —
// 단위를 화면 깊이에 묶었던 첫 판본이 어떻게 실패했는지는 위 주석에 있다.
//
// 값의 근거: 강 반폭이 `RIVER_HALF`(24m)이므로 `1` 이 24m 다. 포말은 물가 2.4m 안쪽에만
// 나야 «선» 으로 보이고(0.10), 중간색은 절반쯤(0.55)에서 넘어가야 가운데가 충분히 깊다.
export const FOAM_EDGE = 0.10;
export const MID_EDGE = 0.55;

/** 프레넬 지수. 감독 명세가 `pow(1 - dot(viewDir, normal), 3.0)` 이라 3 을 그대로 쓴다 */
export const FRESNEL_POW = 3.0;

/**
 * 불투명도. 기존 물(`OPACITY = 0.7`)보다 조금 높다 — 게임풍은 물빛이 진해야 색이 서고,
 * 얕은 곳은 어차피 물가 램프가 밝게 만들어 바닥이 비치는 인상을 대신 준다.
 */
export const STYLE_OPACITY = 0.82;
