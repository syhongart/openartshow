// world2/features/postfx.ts — 후보정(post-processing). 지금은 **블룸** 하나다.
//
// ── 감독 지시 ────────────────────────────────────────────────────────────────
// *"가로등 조명 옆에 블룸 효과 가능할까. 비용 커지나?"* → *"후보정 파일 별도로 만들어."*
//
// 비용이 커지는 것은 맞다(아래 §비용). 그래서 **파일을 따로 두고 껐다 켤 수 있게** 한다 —
// `features/index.ts` 에서 한 줄을 빼면 후보정 전체가 사라지고, `?bloom=0` 으로 세션
// 단위로도 끌 수 있다. 감독 기기에서 프레임을 재고 판단할 수 있어야 하기 때문이다.
//
// ── 왜 `three/webgpu` 의 TSL 블룸인가 ───────────────────────────────────────
// 익숙한 `UnrealBloomPass`(EffectComposer)는 GLSL `ShaderMaterial` 기반이라 **WebGPU
// 렌더 경로가 없다.** CLAUDE.md 가 "아직 열려 있는 사각" 으로 적어 둔 그것이고, 감독
// 실기기가 WebGPU 라 그쪽을 쓰면 헤드리스 통과가 아무 의미도 없어진다.
//
// `three/examples/jsm/tsl/display/BloomNode.js` 는 TSL 노드라 렌더러가 WebGPU 든
// WebGL 폴백이든 같은 정의에서 각 백엔드 셰이더를 만든다. **두 백엔드에서 같은 수단**을
// 고른다는 이 저장소의 규율에 맞는 유일한 선택지다.
//
// ── 비용 ────────────────────────────────────────────────────────────────────
// 화면 전체를 렌더타깃에 받고 다운샘플 체인 + 블러 + 합성을 돈다. 픽셀 바운드라
// **해상도에 정비례**한다 — 감독 기기는 DPR 3 에 320×519 이므로 실제 960×1557 ≈
// 150만 픽셀이고, 그것이 패스마다 반복된다.
//
// 그래서 **`threshold` 를 높게 잡는다.** 밝은 픽셀만 걸러 블러 대상 자체를 줄이는
// 것이 패스 수를 줄이는 것보다 효과가 크고, 감독이 원한 것도 "가로등 조명 옆" 이지
// 화면 전체가 뿌예지는 것이 아니다.
//
// ── 개수 불변식 ─────────────────────────────────────────────────────────────
// 후보정 셰이더가 파이프라인을 몇 개 추가하지만 **부팅 시 고정**이다. 세션 중에
// 켰다 껐다 하지 않는다 — `strength` 를 0 으로 내려도 파이프라인은 그대로 남으므로
// 낮/밤 전환에 재컴파일이 없다.

import * as THREE from 'three/webgpu';
// TSL 함수는 `three/tsl` 에 있다. `three/webgpu` 에는 `PassNode` **클래스**만 있고
// `pass()` **함수**가 없어서, 거기서 찾다가 조용히 null 로 빠졌다(첫 시도의 실패 원인).
import { pass, mrt, output, emissive } from 'three/tsl';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import { nightness, LAMP_LUMINANCE, LAMP_MAX_GLOW, type SkyTime } from '../decide/night.js';
import { BLOOM_THRESHOLD } from './postfx-params.js';
import { readNum, readLit } from '../url-knob.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

/**
 * 번짐 세기. 크게 잡으면 등이 뭉개져 형태가 사라진다 — 감독이 갓 모양을 보고
 * "가로등" 이라 읽는데, 그 실루엣을 지우면 켜진 얼룩이 된다.
 */
const STRENGTH = 1.15;

/**
 * 번짐 반경 — 정확히는 **저해상 밉을 얼마나 섞을지**다.
 *
 * ── 감독 지적: "블룸이 사각형으로 보이긴 하던데. 원으로 해야지" ──────────────
 * 가우시안 블러 자체는 본래 원형이다. 사각으로 보인 것은 **해상도 아티팩트**였다.
 *
 * three 의 블룸은 밉 5단계를 쓰고 각 단계가 해상도 절반이다:
 *
 *   화면 960×1557(DPR 3) → 밉0 480×778 · 밉1 240×389 · … · 밉4 30×48
 *
 * 밉4 는 **30×48 픽셀**이라, 그것이 전체 화면으로 늘어나면 한 텍셀이 32화면픽셀짜리
 * 블록이 된다. `radius` 가 클수록 그 저해상 밉의 기여가 커지고, 그래서 번짐 가장자리에
 * 사각 블록이 드러난다. 0.4 는 그 블록이 눈에 보이는 값이었다.
 *
 * 0.15 로 내려 사각 블록은 사라졌지만 감독 판정은 *"크기 줄이자"* 였다 — 여전히 넓었다.
 * 0.07 이면 밉0(절반 해상도)이 거의 전부를 차지해 등 지름 남짓만 번진다. 번짐 폭이
 * 좁아지는 대신 `STRENGTH` 로 밝기를 유지한다 — 폭이 아니라 세기로 존재감을 만드는
 * 쪽이 등불에 맞다(실제 등도 코어가 밝고 헤일로는 얇다).
 *
 * 화면이 작을수록 밉이 더 잘게 쪼개지므로 이 값은 **해상도에 민감하다.** 감독 화면은
 * 320×519 라 특히 그렇다. 그래서 `?bloomrad=` 로 열어 두었다.
 */
const RADIUS = 0.07;

/**
 * 이 밝기를 **넘는 픽셀만** 번진다.
 *
 * ── 이 값 때문에 블룸이 통째로 죽어 있었다 ─────────────────────────────────
 * 처음에 0.85 로 잡았는데 등불색의 휘도가 **0.805** 라 문턱을 못 넘었다. 블룸은
 * 정상적으로 돌면서 걸리는 픽셀이 하나도 없었고, 감독 화면은 *"가로등 똑같은데"* 였다.
 * "별까지 안 걸리게 좁게" 를 정하면서 **가로등이 그 문턱을 넘는지 계산하지 않은** 것이다.
 *
 * 지금은 등 쪽을 HDR 로 올려(`LAMP_MAX_GLOW` 1.8 → 휘도 1.45) 문턱 위로 보내고, 문턱은
 * 0.75 로 조금만 낮춘다. 둘 사이 여유가 충분해야 등이 **번지고**, 문턱이 별·물보다
 * 높아야 그것들은 **안 번진다.** 그 관계는 `tests/world2-night.test.ts` 가 지킨다.
 */
const THRESHOLD = BLOOM_THRESHOLD;

/**
 * URL 로 값을 읽는다. 없거나 이상하면 기본값.
 *
 * 구현은 `url-knob.ts` 하나다. 여기 있던 사본을 지우고 감싸기만 남겼다 — 범위 클램프가
 * 딸려 오는 것이 덤이다(`?bloomstr=99` 로 화면을 날려 먹지 않는다).
 */
const num = (key: string, fallback: number) => readNum(key, fallback, 0, 8);

/**
 * 🔴 **낮 바닥값** — 낮에도 발광체가 **살짝** 번진다.
 *
 * 감독 지시 2026-08-22: *"지엘비 조명에 블룸효과가 없어. 별도로 약하게 해"*
 *
 * ── 실측: 「없어」의 정체는 GLB 가 아니라 **세기 0** 이었다 ─────────────────
 * 아래 `applyLevel` 이 세기를 `STRENGTH × nightness(time, lit)` 로 계산하는데,
 * world2 기본 시간대가 `day` 이고(`main.ts:609` — `readEnum('time', 'day', TIMES)`)
 * `nightness('day')` 가 **0** 이다(`decide/night.ts:132`). 곱이 0 이므로 **낮 화면에는
 * 블룸이 아예 없다** — GLB 조명만이 아니라 가로등도 물도 전부 안 번진다.
 *
 * 즉 감독이 보신 것은 「GLB 가 블룸에서 빠졌다」가 아니라 「그 화면에 블룸이 0」이다.
 * ⚠ 이 구별이 중요하다 — 전자로 읽으면 MRT 배선을 뜯게 되는데 그쪽은 멀쩡하다.
 *
 * ── 왜 이제 낮에 켜도 되는가 (옛 근거가 만료됐다) ──────────────────────────
 * `applyLevel` 위 주석이 오래 *"낮에 켜 두면 하늘이 부옇게 떠서 대낮의 대비가 죽는다"*
 * 를 근거로 낮을 0 으로 눌러 왔다. 그것은 **화면 전체 블룸이던 시절**의 근거다.
 * 발광 채널 분리(#244) 이후 하늘 돔은 `MeshBasicMaterial` 이라 emissive 채널에서
 * **구조적으로 빠진다** — 하늘은 이제 아무리 번져도 안 뜬다. 같은 주석이 이 긴장을
 * *"해소된 것이 아니라 감독 판정 대기"* 라고 적어 두었고, 이 지시가 그 판정이다.
 *
 * ── 낮에 무엇이 함께 번지나 (실측) ─────────────────────────────────────────
 *
 *   GLB 현관 조명   `emissiveFactor [1,1,1]` × 상한        1.0   → **번진다** ← 목적
 *   물 윤슬         `waterGloss('day').sparkle`             0.85  → **번진다** ⚠ 딸려옴
 *   가로등          `LAMP_LUMINANCE × lampGlow(0)`          0     → 안 번짐(낮엔 꺼짐)
 *   작품·별·하늘돔  `MeshBasicMaterial` — 발광 채널 없음    —     → 구조적으로 빠짐
 *
 * ⚠ **물 윤슬은 의도가 아니라 딸려 오는 것이다.** 문턱(0.75)을 0.85 로 넘는다.
 * `emissiveMap` 이 검은 바탕에 흰 점이라 **점만** 번지고, 바닥값이 작으면 미미하다.
 * 감독이 거슬려 하시면 `?wspark=0` 으로 끄거나 이 값을 더 내린다.
 *
 * ── 값 (⚠ 화면 판정 전이라 근거가 없는 시작값) ─────────────────────────────
 * 0.15 는 *"약하게"* 를 숫자로 옮긴 첫 시도일 뿐이다 — 낮 세기가
 * `STRENGTH(1.15) × 0.15 ≈ 0.17` 이 되어 밤(1.15)의 **1/7** 이다.
 * **감독이 화면에서 고르기 전까지 이 수에는 근거가 없다.** `?bloomfloor=` 로 후보를
 * 비교한 뒤 확정하고 그때 이 자리에 판정을 적는다.
 *
 * ── 「별도로」는 노브 둘로 나뉜다 ───────────────────────────────────────────
 * 블룸은 화면 하나에 한 번 도는 패스라 **대상별 세기**를 줄 수 없다(패스를 하나 더
 * 두면 비용이 두 배다). 대신 축이 둘이라 실질적으로 나뉜다:
 *   · `?bloomfloor=` — 낮에 **번짐 자체**가 얼마나 실릴지(발광체 공통)
 *   · `?glbemis=`    — **GLB 조명만**의 발광 값(문턱 초과분이 곧 번짐량이다)
 * GLB 만 약하게 하려면 후자를, 낮 전체를 약하게 하려면 전자를 내린다.
 */
const BLOOM_FLOOR = 0.15;

/**
 * `?bloom=0` 이면 아예 켜지 않는다 — 대조군 측정용.
 *
 * 세기·문턱·반경도 URL 로 연다(`?bloomstr=` `?bloomthr=` `?bloomrad=`). **내가 이
 * 기능을 볼 수 없기 때문이다** — 헤드리스는 WebGL 이라 블룸이 아예 안 켜지고, 실제
 * 모습은 감독 기기(WebGPU)에서만 나온다. 값을 찾는 일을 코드 수정·배포 왕복으로
 * 하면 한 번에 몇 분씩 걸리므로, 그 자리에서 돌려볼 수 있게 열어 둔다.
 */
function enabled(): boolean {
  if (typeof location === 'undefined') return true;
  return new URLSearchParams(location.search).get('bloom') !== '0';
}

export const postfxFeature: Feature = {
  name: 'postfx',

  create(env: FeatureEnv): FeatureInstance | null {
    if (!enabled()) return null;

    // `PostProcessing` 은 `three/webgpu` 의 신형 파이프라인이다. 렌더러를 받아 자기
    // 렌더타깃을 관리하고, `outputNode` 에 적은 노드 그래프대로 합성한다.
    const PP = (THREE as unknown as { PostProcessing?: new (r: unknown) => PostProcessingLike }).PostProcessing;

    let pp: PostProcessingLike | null = null;
    let bloomNode: { strength: { value: number } } | null = null;
    /**
     * 왜 못 켰는가. **조용히 사라지지 않기 위한 것이다.**
     *
     * 첫 시도에서 `pass` 를 `three/webgpu` 에서 찾다가 못 찾아 `null` 을 돌려줬는데,
     * 기능이 목록에서 통째로 빠지니 진단에도 안 남아 "왜 블룸이 없지" 를 추적할 수가
     * 없었다. VRM 본을 하나도 못 찾고도 아무 신호가 없던 것과 **같은 실패**다.
     *
     * 그래서 실패해도 기능은 남기고 이유를 싣는다. 월드는 기본 렌더 경로로 그대로 돈다.
     */
    let failure: string | null = null;

    if (env.adapter.backend !== 'WebGPU') {
      // ── WebGL 백엔드에서는 켜지 않는다 (헤드리스 실측) ─────────────────────
      // 켜면 warmup 에서 부팅이 깨진다:
      //   TypeError: Cannot read properties of undefined (reading 'replace')
      // 스택이 **WebGL 청크**를 가리킨다 — TSL 노드 그래프를 WebGL 백엔드용 셰이더로
      // 내리는 경로에서 터진다.
      //
      // WebGPU 가 없는 기기는 이 폴백을 타므로, 여기서 막지 않으면 그 사용자들이
      // **화면을 아예 못 본다.** 블룸은 있으면 좋은 것이고 월드는 필수다.
      //
      // ── 그래서 이 기능은 헤드리스로 검증할 수 없다 ─────────────────────────
      // CLAUDE.md 가 적어 둔 사각 그대로다 — 헤드리스는 WebGL(swiftshader), 감독
      // 실기기는 WebGPU. 블룸이 실제로 어떻게 보이는지, 프레임을 얼마나 먹는지는
      // **감독 기기 실측이 유일한 판정**이다. 여기서 통과했다고 적으면 거짓이 된다.
      failure = 'WebGL 백엔드 — TSL 후보정이 부팅을 깨뜨려 켜지 않는다(WebGPU 전용)';
    } else if (!PP) {
      failure = 'three/webgpu 에 PostProcessing 이 없다';
    } else {
      try {
        pp = new PP(env.adapter.renderer);
        // ── 🔴 번짐은 **발광 채널만** 본다 (감독 2026-08-21) ────────────────────
        // 감독 신고: *"지엘비 건물에 조명을 단거야? 엄청쎄"* — 미술관 벽에 걸린 작품
        // 셋이 흰 덩어리로 뭉개져 조명처럼 보였다. 이어서 *"딱 가로등만 살짝 번짐으로
        // 안되나"*.
        //
        // **원인은 문턱이 아니라 대상이었다.** 화면 전체를 블룸에 넣으면 휘도가 문턱을
        // 넘는 것이 전부 걸리는데, 작품은 **`MeshBasicMaterial`** 이라(감독 지시 *"사진이
        // 주변 환경에 영향받지 않게"*, `decide/art-material.ts`) 조명을 안 읽고 텍스처
        // 값이 그대로 나간다 — 흰 그림이면 **1.0** 이다.
        //   ⚠ 이 자리에 *"`MeshBasicMaterial` + **`toneMapped:false`** 라"* 고 적었는데
        //   `toneMapped` 는 **WebGPU 빌드에 참조가 0건**이다(`decide/art-material.ts:84-91`
        //   이 이미 실측해 둔 것을 내가 안 읽고 인과에 넣었다 — 검수관 P18). 결론은
        //   `MeshBasicMaterial` 만으로 성립하므로 처방은 그대로지만, 인과가 틀린 채 남으면
        //   다음 사람이 `toneMapped` 로 조절하려 든다. 그리고 실측:
        //
        //   가로등 휘도 = LAMP_LUMINANCE(0.80469) × lampGlow(nightness('daylit'))
        //     `?lit=0.4`(감독 확정) → 1.0980 × 0.80469 = **0.8835**
        //     `?lit=1`(상한)        → 1.8000 × 0.80469 = 1.4484
        //
        // 즉 감독이 고른 값에서는 **작품(1.0)이 가로등(0.88)보다 밝다.** 문턱을 올리면
        // 가로등이 **먼저** 빠진다 — 나는 이것을 반대로 계산해 «문턱 1.05~1.35 로 가른다»
        // 는 후보를 감독께 드렸고, 그 셋은 전부 번짐을 통째로 끄는 화면이었다. 상한값
        // (1.45)을 실제값으로 착각한 것이 원인이다.
        //
        // ── 그래서 밝기가 아니라 **채널**로 가른다 ─────────────────────────────
        // 가로등은 `emissiveIntensity` 로 빛난다(`systems/lamp-glow.ts`). 작품은
        // `MeshBasicMaterial` 이라 **발광 속성이 아예 없다.** MRT 로 발광 채널을 따로
        // 받아 그것만 블룸에 넣으면 둘이 **구조적으로** 갈린다 — 값이 아니라 성질로
        // 갈리므로 나중에 `?lit=` 를 어디로 옮겨도 작품이 다시 걸리지 않는다.
        //
        // ── 무엇이 빠지고 무엇이 남는가 (실측, 검수관 반려 B1″ 정정) ────────────
        // 이 자리에 *"별·**물 하이라이트**·하늘 돔 — 셋 다 발광 채널이 없다"* 라고 적었고
        // **물이 틀렸다.** 실물 three 0.171.0 으로 재면 이렇다:
        //
        //   작품·별(twk)·하늘 돔   `MeshBasicMaterial`      emissive 없음   → **빠진다** ✓
        //   가로등                 Standard + emissive      0xffc86e×1.098  → 0.8835  걸림
        //   🔴 **물 윤슬**          Standard + emissive      0xffffff×0.85   → 0.85    **걸림**
        //
        // 근거: `features/ocean.ts:1090`(`emissive: 0xffffff` + `emissiveMap: sparkle`) ·
        // `:1203`(`emissiveIntensity = spark`) · `decide/water-gloss.ts:92`(낮 `sparkle`
        // 0.85 — 복합씬은 `paletteTime` 으로 접혀 낮 값을 빌린다) · 기본 경로가 `seaMat`
        // 이다(`:1035` `readEnum('water','std',…)`).
        //
        // **이것을 결함으로 단정하지 않는다.** 윤슬은 가로등과 **같은 성질**(발광)이고
        // 원래 「빛나는 것」이며, `emissiveMap` 이 검은 바탕에 흰 점이라 **점만** 번진다 —
        // 물 전체가 뜨는 것이 아니다. 감독 신고는 **그림이 뭉개진 것**이었고 그림은 이제
        // 확실히 빠진다. 다만 «가로등만» 이라는 감독 표현과는 어긋나므로 **알고 묻는다** —
        // 링크 문안에 그 사실을 넣어 판정을 받는다(*"«모르고 배포»가 아니라 «알고 묻는»"*).
        // 문턱으로 가르는 길은 없다: 윤슬 0.85 와 가로등 0.8835 의 차이가 **0.033** 이고,
        // `?lit=` 를 낮추면 가로등이 먼저 빠진다.
        //
        // ⚠ **헤드리스로 실제 렌더를 검증할 수 없다** — 이 블록은 WebGPU 에서만 돈다.
        // 검사가 **둘로 갈려 있고 축이 다르다**:
        //   `tests/world2-postfx-contract.test.ts` — **mock 0.** 실물 three 로 조립 전
        //     구간(`pass → setMRT(mrt) → getTextureNode → bloom → add`)을 태운다. 판올림으로
        //     MRT API 가 바뀌면 여기가 먼저 빨간불이 된다.
        //   `tests/world2-postfx-time.test.ts` — `vi.mock` **셋**(`three/webgpu`·`three/tsl`·
        //     `BloomNode`). 세기 계산과 시간대 소비를 잰다. 조립 계약은 **여기서 안 잠긴다.**
        // ⚠ 이 자리에 *"조립 계약 자체는 `postfx-time.test.ts` 가 **실물 three 로** 태운다"*
        // 라고 적었고 **거짓이었다**(검수관 조건 1). 다음 사람이 그 파일을 고칠 때 계약이
        // 안 잠긴다는 것을 모르고, 정작 계약을 잠그는 파일은 아무도 안 가리키게 된다.
        //
        // ⚠ **폴백의 범위**: 아래 `catch` 가 받는 것은 **조립 예외**이고, 그때는 블룸이
        // 안 켜져 감독 판정(*"번짐 끈거로 하자"*) 위로 떨어진다. **셰이더 컴파일·첫 렌더
        // 실패가 같은 경로로 가는지는 확인 못 했다**(WebGPU 가 없다 — 검수관 P19). 그리고
        // 실측으로 `getTextureNode('없는이름')` 은 **예외 없이 노드를 돌려준다** — 즉
        // **조립 성공이 렌더 성공을 뜻하지 않는다.**
        const scenePass = pass(env.scene, env.camera) as unknown as {
          setMRT?(v: unknown): void;
          getTextureNode?(name: string): { add(x: unknown): unknown };
        };
        if (typeof scenePass.setMRT !== 'function' || typeof scenePass.getTextureNode !== 'function') {
          // 구형 three 는 MRT 를 안 준다. 옛 경로(화면 전체 블룸)로 되돌리지 않는다 —
          // 그 화면이 이번 신고의 원인이고 감독이 물렀다.
          throw new Error('PassNode 에 setMRT/getTextureNode 가 없다 — 발광 채널 분리 불가');
        }
        scenePass.setMRT(mrt({ output, emissive }));
        const b = bloom(
          scenePass.getTextureNode('emissive'),
          num('bloomstr', STRENGTH),
          num('bloomrad', RADIUS),
          num('bloomthr', THRESHOLD),
        ) as unknown as { strength: { value: number } };
        bloomNode = b;
        // 원본 + 번짐. `add` 로 더하는 것이 블룸의 정의다 — 곱하거나 섞으면 어두운
        // 부분까지 영향을 받아 대비가 죽는다.
        pp.outputNode = scenePass.getTextureNode('output').add(b);
        // ── 렌더 중 실패해도 화면은 살린다 ─────────────────────────────────
        // 조립이 성공해도 **첫 렌더에서** 터질 수 있다(WebGL 백엔드에서 실제로 그랬다).
        // 훅 안에서 터지면 매 프레임 예외가 나고 화면이 통째로 멎는다 — 블룸 하나 때문에
        // 월드를 못 보는 것은 어떤 경우에도 옳지 않다.
        //
        // 그래서 첫 예외에서 훅을 스스로 떼고 기본 경로로 돌아간다. 다음 프레임부터
        // 평소대로 그려지고, 무슨 일이 있었는지는 진단에 남는다.
        env.adapter.setRenderHook((scene, camera) => {
          try {
            pp!.render();
          } catch (err) {
            failure = `렌더 실패로 자동 해제: ${String(err).slice(0, 120)}`;
            bloomNode = null;
            env.adapter.setRenderHook(null);
            env.adapter.render(scene, camera); // 이 프레임도 빠뜨리지 않는다
          }
        });
      } catch (err) {
        failure = `노드 그래프 조립 실패: ${String(err).slice(0, 120)}`;
        // 훅을 걸었을 수도 있으니 반드시 되돌린다 — 안 하면 화면이 멎는다.
        env.adapter.setRenderHook(null);
        pp = null;
        bloomNode = null;
      }
    }

    // ⚠ 이 자리에 오래 *"밤에만 번진다. 낮에 켜 두면 하늘이 부옇게 떠서 대낮의
    // 대비가 죽는다"* 라고 적혀 있었다. **지금은 낮에도 번진다** — 근거와 판정
    // 전문은 위 `BLOOM_FLOOR` 한 곳이다(하늘 돔은 MRT 로 이미 빠져 안 뜬다).
    // **파이프라인은 그대로 두고 세기만** 흔든다 — 노드를 갈아 끼우면 재컴파일이다.
    //
    // 🔴 **복합씬(`daylit`)에서는 낮인데도 번진다 — 그것이 의도다** (검수관 B4′ 정정,
    // 2026-08-21). 감독 요구가 *"주간인데. 불이 켜져있고"* 인데, 가로등이 **켜진 것처럼
    // 보이려면** 등불 휘도가 블룸 문턱을 넘어야 한다 — 그 인과는 `decide/night.ts` 의
    // `LAMP_MAX_GLOW` 주석 한 곳이 소유한다(문턱을 못 넘어 *"가로등 똑같은데"* 를 받은
    // 이력이 그 자리에 있다). 그래서 블룸은 **접지 않는 축**이고 `?lit=` 를 함께 탄다.
    // 노브를 한쪽만 태우면 감독이 값을 밀어도 절반만 움직인다(검수관 P7).
    //
    // ⚠ 위 첫 줄(*"낮에 켜 두면 대낮의 대비가 죽는다"*)과의 긴장은 **해소된 것이 아니라
    // 감독 판정 대기**다. 복합씬은 그 대가를 감수하는 씬이고, 얼마나 감수할지가 `?lit=`
    // 다 — 헤드리스로는 못 잰다(톤매핑 뒤에서만 판정된다).
    const lit = readLit();
    let lastLevel = -1;
    function applyLevel(time: SkyTime): void {
      if (!bloomNode) return;
      // 낮에도 바닥값만큼은 번진다(위 `BLOOM_FLOOR`).
      //
      // ⚠ 첫 판본은 `Math.max(floor, nightness(...))` 였고 **결합을 갉아먹었다**:
      // 복합씬 점등을 `?lit=` 로 바닥(0.15) 아래까지 내려도 번짐이 안 따라 내려간다.
      // 감독이 `?lit=` 로 값을 밀어도 절반만 움직이는 그 형태이고, 검사가 잡았다.
      // 그래서 **`nightness` 가 0 인 시간대에만** 바닥을 쓴다 — 그 0 이 고치려던 결함
      // 전부이고, 0 이 아닌 구간은 노브가 끝까지 지배한다.
      const nl = nightness(time, lit);
      const level = num('bloomstr', STRENGTH) * (nl > 0 ? nl : num('bloomfloor', BLOOM_FLOOR));
      if (level === lastLevel) return;
      lastLevel = level;
      bloomNode.strength.value = level;
    }

    return {
      system: {
        name: 'postfx',
        update() {
          // ── 시간대를 **묻는다**. 추측하지 않는다 ──────────────────────────
          // 여기 이런 줄이 있었다:
          //
          //     applyLevel(env.hemi.intensity < DAY_HEMI_MIN ? 'night' : 'day');
          //
          // 반구광 세기로 낮/밤을 가르는 간접 관측이었고, 규약("기능끼리 상태를 공유하지
          // 않는다")을 지키려고 고른 방법이었다. 문턱 0.95 의 근거는 "밤 반구광 하한이
          // 0.85" 였는데, 밤을 밝히는 커밋이 그 하한을 **1.2** 로 올리면서 밤이 낮으로
          // 읽혔다 — 세기가 0 이 되어 감독 화면에서 번짐이 사라졌고 `?bloom=0` 과
          // 구별조차 되지 않았다. 노을(0.85)만 밤으로 읽혀 **정확히 뒤집혔다.**
          //
          // 값을 고치는 것으로는 안 된다. 밤 하한(1.2)이 낮 값(1.0)보다 커진 뒤로는
          // 어떤 문턱을 골라도 이 축이 성립하지 않는다 — **재는 축이 무효가 됐다.**
          // 그래서 시간대를 계약으로 받는다(팀장 판정 A-2, `types.ts` 의 `time`).
          applyLevel(env.time());
        },
      },

      // `on` 이 false 면 블룸이 안 걸린 것이고, `failure` 가 이유를 말한다.
      diagnostics: () => ({
        on: !!bloomNode,
        failure,
        strength: lastLevel,
        // **어느 시간대로 판정했는가**(팀장 조건 5 · 뮤테이션 M4). `strength: 0` 만으로는
        // "낮이라 0" 과 "배선이 끊겨 0" 을 구별할 수 없다 — 이번 사고가 정확히 후자였고
        // 진단에 아무 신호가 없어 감독 화면을 보고서야 드러났다.
        time: env.time(),
        radius: num('bloomrad', RADIUS),
        threshold: num('bloomthr', THRESHOLD),
        // 가로등이 문턱을 넘는가. 이 둘이 뒤집히면 블룸이 켜져도 아무것도 안 번진다.
        lampPeak: +(LAMP_LUMINANCE * LAMP_MAX_GLOW).toFixed(3),
      }),

      dispose() {
        env.adapter.setRenderHook(null); // 기본 렌더 경로로 되돌린다 — 안 하면 화면이 멎는다
        (pp as unknown as { dispose?(): void } | null)?.dispose?.();
      },
    };
  },
};

// ── `DAY_HEMI_MIN` 은 삭제했다 (팀장 조건 3) ─────────────────────────────────
// 반구광 세기로 낮/밤을 가르던 문턱(0.95)이 여기 있었다. 근거는 "밤 반구광 하한이 0.85"
// 였고, 밤을 밝히는 커밋이 그것을 1.2 로 올리면서 문턱이 거짓이 됐다(위 `update` 주석에
// 전말이 있다). 이행기라며 남겨 두면 죽은 축이 미러링으로 잔존하므로 함께 지운다.

interface PostProcessingLike {
  outputNode: unknown;
  render(): void;
}
