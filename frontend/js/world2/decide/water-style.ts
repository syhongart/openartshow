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

/** 수면 메시의 이름. `features/ocean.ts` 가 붙이는 것과 **같은 문자열이어야 한다** */
export const STYLED_WATER_NAMES = ['ocean', 'river', 'ocean-wave2', 'river-wave2'] as const;

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

// ── 깊이 램프 ───────────────────────────────────────────────────────────────
//
// 화면 깊이 차(수면 ↔ 그 뒤 표면)를 미터로 읽어 색을 고른다. 물가에서 이 값이 0 에
// 가까운 이유는 육지 지면 판이 수면 바로 뒤에 있기 때문이고, 그래서 **포말이 물가에만
// 생기는 것이 공짜로 나온다** — 물가까지의 거리를 따로 굽지 않아도 된다.
//
// 값의 근거: 해저는 수면에서 `WATER_DEPTH`(2.4m) 아래다. 그러니 «깊은 물» 은 그 근처에서
// 포화해야 하고, 중간은 그 절반이다. 포말은 그보다 훨씬 얕은 띠여야 선으로 보인다.
export const FOAM_DEPTH = 0.35;    // 이보다 얕으면 포말
export const MID_DEPTH = 1.2;
export const DEEP_DEPTH = 2.4;

/** 프레넬 지수. 감독 명세가 `pow(1 - dot(viewDir, normal), 3.0)` 이라 3 을 그대로 쓴다 */
export const FRESNEL_POW = 3.0;

/**
 * 불투명도. 기존 물(`OPACITY = 0.7`)보다 조금 높다 — 게임풍은 물빛이 진해야 색이 서고,
 * 얕은 곳은 어차피 깊이 램프가 밝게 만들어 바닥이 비치는 인상을 대신 준다.
 */
export const STYLE_OPACITY = 0.82;
