// world2/features/sky.ts — 하늘·날씨 기능.
//
// `main.ts` 다섯 군데에 흩어져 있던 하늘 배선을 전부 여기로 모았다. 이 파일 하나를
// `features/index.ts` 목록에서 빼면 하늘도, 神 모드 패널도, 진단도, 드로우콜 판정 키도
// 함께 사라진다 — 그게 이 구조의 요점이다.
//
// 하늘 엔진 자체(`frontend/js/sky.js`, 1,112줄)는 아직 모놀리식이다. 시간대 3종·날씨 4종·
// 구름·별·비·눈·번개·오로라·무지개가 한 클로저 안에 있어서, 지금은 "하늘 전체"만 켜고 끌
// 수 있고 "비만 다른 구현으로" 같은 건 안 된다. 그 분해는 world2가 라이브가 된 뒤다 —
// 지금 `sky.js`는 라이브 `world.js`도 쓰는 공유 파일이라 건드리면 라이브가 위험하다.
// 이 계약이 먼저 서 있으면, 쪼갠 조각들을 여기에 얹기만 하면 된다.

import { SkySystem } from '../systems/sky.js';
import { findSkyPanel, attachSkyPanel, type SkyPanel } from '../ui/sky-panel.js';
import {
  // `lampGlow` 는 더 이상 여기서 부르지 않는다 — `systems/neon-glow.ts` 가 그 곡선을
  // 일반화한 `neonGlow` 로 파츠 넷을 함께 켠다. 저 함수는 남겨 뒀다: 가로등만 재는
  // 기존 검사들이 그것을 부르고, `neonGlow` 와 산술적으로 같다는 것이 그 검사들의
  // 근거가 된다(`tests/world5-neon-glow.test.ts` 가 동치를 못 박는다).
  nightness, TIMES, type SkyTime,
  NIGHT_HEMI_I, NIGHT_SUN_I, NIGHT_EXPOSURE, NIGHT_FOG_SCALE, NIGHT_GROUND_SCALE,
} from '../decide/night.js';
import { readNum, readEnum } from '../url-knob.js';
import { DAY_SUN_I, DAY_HEMI_I } from '../decide/daylight.js';
import { GroundLift } from '../systems/ground-lift.js';
import { NeonGlow } from '../systems/neon-glow.js';
import { NIGHT_GROUND_LIFT, MAX_LIFT } from '../decide/ground-albedo.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

// 시간대 목록(`TIMES`)은 `decide/night.ts` 로 옮겼다 — 조립부도 그것을 읽으므로 여기
// 사본을 두면 값 미러링이다. 날씨는 아직 소비자가 하늘 하나이므로 여기 남는다.
const WEATHERS = ['clear', 'overcast', 'rain', 'snow'] as const;

/**
 * 안개를 하늘색으로 미는 기본 계수 (감독 지시 *"약간 하늘색으로"*).
 *
 * 물리적으로도 이 방향이 맞다 — 원거리 대기는 레일리 산란으로 푸르게 수렴한다. 그래서
 * 시간대를 가리지 않고 **전 팔레트에 같은 계수**를 건다. 밤만 손대면 낮·노을과 톤이
 * 갈리고, 그건 "약간 하늘색"이 아니라 "밤만 다른 세계"가 된다.
 *
 * 0.12 는 *약간* 의 해석이다. 밤 맑음 `#3d4762` 가 `#455472` 가 되어 남색이 조금 열리는
 * 정도이고, 낮 맑음 `#e9eef2` 는 `#dce7f0` 으로 흰 기가 빠진다. **감독 판정 전의
 * 출발점**이지 확정값이 아니다 — `?fogsky=` 로 조정한다.
 */
export const FOG_SKY_TINT = 0.12;

export const skyFeature: Feature = {
  name: 'sky',

  create(env: FeatureEnv): FeatureInstance {
    // 풀 봉인 직후·예열 직전에 만들어진다(features 단계). 여기서 만들어야 예열이 하늘
    // 파이프라인까지 함께 굽는다 — 세션 중 첫 등장으로 미루면 그게 곧 스파이크다.
    const sky = new SkySystem(
      env.scene,
      env.adapter.renderer,
      env.sun,
      env.hemi,
      () => ({ x: env.player.position.x, z: env.player.position.z }),
      {
        // ── 시간대·날씨 ───────────────────────────────────────────────────
        // **시간대는 이제 조립부가 소유한다**(`env.time()`, 팀장 판정 A-2 2026-07-30).
        // `?time=` 을 읽는 것도 조립부이고 하늘은 소비자다 — 하늘이 혼자 들고 있었을 때
        // 후보정이 반구광으로 시간대를 추측하다 블룸이 밤에 통째로 꺼졌다
        // (`features/types.ts` 의 `time` 주석에 전말이 있다).
        //
        // 날씨는 아직 소비자가 하늘 하나이므로 여기서 URL 을 읽는다. 헤드리스 측정과
        // 감독 확인이 링크 하나로 끝나야 하므로 노브 자체는 유지한다.
        sunDist: env.shadowDist,
        // 낮 대비 — 감독이 실기기에서 값을 비교할 수 있게 연다(밤 노브 `nsun`/`nhemi` 전례).
        dayLight: {
          sun: readNum('dsun', DAY_SUN_I, 0, 6),
          hemi: readNum('dhemi', DAY_HEMI_I, 0, 4),
        },
        time: env.time(),
        weather: readEnum('weather', 'clear', WEATHERS),

        // ── 밤 밝기 축 (`?nhemi=` `?nsun=` `?nexp=` `?nfog=` `?nground=`) ──
        // 감독: *"밤이 어둡다."* — 두 번째 지적이다. 첫 번째에 반구광·달빛을 올렸는데도
        // 어둡다는 것은, 올린 축이 **화면에서 어두운 부분을 덮지 못한다**는 뜻이었다.
        // 조명은 재질에 닿는 빛만 키우므로 하늘 돔·안개는 그대로 남는다.
        //
        // 기본값은 헤드리스 스윕이 정했다(`decide/night.ts` 의 각 상수 주석에 실측표).
        // 노브를 남겨 두는 이유는 **헤드리스가 WebGL 이고 감독 기기는 WebGPU** 라
        // 톤매핑을 거친 최종 밝기가 같지 않기 때문이다 — 최종 판정은 감독 화면이다.
        //
        // `undefined` 를 넘기지 않는 것이 중요하다. `readNum` 이 URL 부재 시 상수를
        // 그대로 돌려주므로, 여기 적힌 것이 곧 배포값이다.
        nightTune: {
          hemiI: readNum('nhemi', NIGHT_HEMI_I, 0, 4),
          sunI: readNum('nsun', NIGHT_SUN_I, 0, 4),
          exposure: readNum('nexp', NIGHT_EXPOSURE, 0.2, 3),
          // ── 하한 0 — 클램프가 감독의 판정을 조용히 바꾸고 있었다 ──────────
          // 이 하한은 한때 0.05 였다. 근거는 *"기본값(0.2)이 곧 하한이면 그 아래를
          // 볼 수 없다"* 였고 그 자체는 맞았다. **그런데 0.05 도 여전히 하한이었다.**
          //
          // `readNum` 은 `Math.max(min, …)` 으로 **조용히 클램프한다** — 거절하지도,
          // 알리지도 않는다. 그래서 감독이 `?nfog=0` 으로 열어 *"이게 좋아"* 라고 한
          // 화면은 실제로 **0.05 였다.** 감독은 자기가 0 을 봤다고 믿었고, 그 오차가
          // 그대로 기본값 결정으로 갈 뻔했다. 값을 옮겨 적는 사람이 없어도 **노브
          // 자체가 relay 였고 거기서 값이 다듬어졌다.**
          //
          // 하한을 0 으로 연다. 안개 하한이 완전히 사라지는 것은 `sky.js` 팔레트를
          // 그대로 쓰는 것이라 위험한 상태가 아니다(원래 없던 것을 얹은 쪽이
          // `decide/night.ts` 의 색공간 건이다). **노브의 끝값은 실제로 그 값이어야
          // 한다** — 못 가는 자리를 열어 두면 그 자리에서 나온 판정이 거짓이 된다.
          fogScale: readNum('nfog', NIGHT_FOG_SCALE, 0, 4),
          groundScale: readNum('nground', NIGHT_GROUND_SCALE, 0.2, 4),
        },

        // ── 안개 하늘색 틴트 (`?fogsky=`) ────────────────────────────────
        // 감독: *"안개를 약간 하늘색으로 하면 어떨까."*
        //
        // 노브를 여는 이유는 밤 밝기와 같다 — **헤드리스는 WebGL, 감독 기기는
        // WebGPU** 라 톤매핑을 거친 최종 색이 같지 않다. 색은 수치로 정할 수 없고
        // 감독 화면이 유일한 게이트이므로, 링크에서 바로 돌려 볼 수 있어야 한다.
        //
        // `0` 이면 `sky.js` 가 팔레트를 그대로 돌려주므로 라이브와 완전히 같다 —
        // 되돌리는 방법이 `?fogsky=0` 하나로 끝난다.
        fogTint: readNum('fogsky', FOG_SKY_TINT, 0, 1),

        // ── 수평선 밴드 (`?hz=`) ─────────────────────────────────────────
        // 감독 실기기 2026-08-05, 태스크 #202: 바다에서 하늘과 바다의 경계가 없다.
        // 무엇이 경계를 지우고 있었는지·왜 안개 far 를 미는 쪽이 아닌지는
        // `decide/horizon.ts` 머리말 **한 곳**이 소유한다.
        //
        // 두 값을 **읽지 않고 받는다.** 눈높이는 `?eye=` 노브라 여기서 다시 읽으면
        // 값 미러링이고(감독이 눈높이를 바꾸는 날 수평선만 옛 높이에 남는다), 눈의
        // 월드 y 는 잠길 때 움직이므로 카메라가 유일한 출처다.
        eyeHeight: env.player.eyeHeight,
        getEyeY: () => env.camera.position.y,
      },
    );

    // 神 모드 패널 — 시간대·날씨·이벤트. DOM이 없으면 조용히 건너뛴다(패널 없이도 하늘은
    // 돈다). 예전에는 이 배선이 main.ts에 있어서, 하늘을 빼도 패널 코드가 남았다.
    let panel: SkyPanel | null = null;
    const parts = env.doc ? findSkyPanel(env.doc) : null;
    if (parts) {
      // ── 패널에 맨 컨트롤을 주지 않는다 (팀장 조건 4) ─────────────────────
      // 패널이 시간대를 고르면 **조립부의 setter 를 먼저 거친다.** 엔진에 직접 주면
      // 소유가 다시 갈리고(조립부 값 ≠ 엔진 값) 블룸·가로등이 옛 시간대를 본다.
      //
      // `set` 하나만 감싼다 — `get`·`bolt` 는 상태를 바꾸지 않으므로 그대로 통과한다.
      // 감싼 것만 넘기는 것이 중요하다: 맨 `sky.controls` 가 함께 노출되면 setter 를
      // 우회하는 세 번째 쓰기 경로가 열린다.
      panel = attachSkyPanel(parts, {
        ...sky.controls,
        set(state, opt) {
          if (typeof state.time === 'string') env.setTime(state.time as SkyTime);
          sky.controls.set(state, opt);
        },
      });
    }

    // ── 가로등 점등 (감독 지시) ────────────────────────────────────────────
    // *"밤에는 가로등이 켜져야 하고."*
    //
    // **왜 하늘이 이걸 하는가.** 켜고 끄는 판단의 근거가 시간대이고, 시간대를 아는 것은
    // 하늘뿐이다. 기능 규약이 *"기능을 빼면 그 기능에 관한 모든 것이 함께 빠진다"* 이니,
    // 하늘을 빼면 가로등도 낮 상태(꺼짐)로 남는 것이 맞다. `sky.js` 주석 ⑩도 원래
    // *"onApply 로 가로등·창 발광을 배선측에서 연동"* 하라고 적어 두고 있었다.
    //
    // **만지는 것은 `emissiveIntensity` 하나뿐이다.** uniform 이라 파이프라인 캐시키에
    // 들어가지 않는다 — 매 프레임 바꿔도 재컴파일이 없다. `emissive` 색이나 `map` 유무
    // 같은 구조 신호를 건드리면 그 순간 전량 재컴파일이 된다.
    // ── 네온 발광 (감독 지시 2026-08-08 *"밤에 건물 네온"*) ──────────────────
    //
    // ⚠️ 이 자리에는 `materialOf('lamp')` **한 종류만** 만지는 클로저가 있었다. 그래서
    // 마천루·광고 타워·다리에 `emissive` 를 넣어도 **낮에도 밤에도 영원히 꺼진 채**
    // 남았고, 감독 지시가 화면에 하나도 안 나타났다.
    //
    // 그리고 이 파일 아래쪽(`groundLift` 옆) 주석이 그 클로저를 스스로 이렇게 적고
    // 있었다 — *"테스트가 같은 식을 옆에 다시 쓰고 있고, **배선이 사라져도 그 테스트는
    // 초록이다**."* 대상이 넷으로 늘어나는 마당에 검출력 0 인 구조를 키울 이유가 없어
    // `systems/neon-glow.ts` 로 뺐다. 이제 테스트가 실제로 돌아가는 코드를 부른다.
    //
    // 시간대는 **조립부에 묻는다**(`env.time()`). 예전에는 `sky.get().time`(엔진
    // 반영값)을 읽었는데, 같은 밤을 재는 두 소비자(등·블룸)가 서로 다른 원천을 보면
    // 언젠가 갈린다 — 원천을 하나로 모은다(팀장 판정 A-2).
    const neon = new NeonGlow(env.pools);
    neon.apply(env.time()); // 부팅 프레임부터 맞춰 둔다 — 밤에 들어왔는데 첫 프레임만 꺼져 있으면 깜빡인다

    // ── 지면 알베도 (`?glift=`) ────────────────────────────────────────────
    // 감독: *"정상적으로 밝은 느낌 나게 해."* (2026-08-05)
    //
    // 밤 처방은 지금까지 전부 **빛**이었다(조명 하한·노출·안개). 빛은 알베도에 곱해지
    // 므로 알베도가 낮은 파츠는 밤에 검정으로 죽는다 — 도로가 화면에서 4/255 다.
    // 노출을 더 올려 고칠 수 없다: 그것은 화면 전체를 밝혀 하늘까지 뜬다(그 벽에서
    // `NIGHT_EXPOSURE` 가 1.6→1.4 로 내려왔다). 감독이 원하는 것은 **하늘은 밤인 채로
    // 지면만 정상적으로 보이는 것**이고, 알베도는 그 재질에만 걸리므로 정확히 그렇다.
    //
    // **전 파츠에 같은 배수**라 대비는 낮과 동일하다 — 파츠별로 갈라 대비를 좁힌 첫
    // 판본은 감독 판정으로 철회됐다(*"밤이여도 이전이 더 좋은데?"*).
    //
    // **왜 하늘이 이걸 하는가** — 가로등과 같은 이유다. 근거가 시간대이고, 기능 규약이
    // *"기능을 빼면 그 기능에 관한 모든 것이 함께 빠진다"* 이다. 하늘을 빼면 밤 자체가
    // 없으므로(조명 하한도 노출도 `SkySystem` 이 건다) 지면도 낮 알베도로 남는 것이 맞다.
    //
    // 배선이 `systems/ground-lift.ts` 에 있는 이유는 테스트가 **실제로 돌아가는 코드**를
    // 부르게 하려는 것이다 — 옛 `applyLampGlow`(지금은 `systems/neon-glow.ts` 로
    // 옮겼다)는 클로저 안이라 테스트가 같은 식을 옆에
    // 다시 쓰고 있고, 배선이 사라져도 그 테스트는 초록이다.
    const groundLift = new GroundLift(env.pools, readNum('glift', NIGHT_GROUND_LIFT, 1, MAX_LIFT));
    groundLift.apply(env.time()); // 가로등과 같은 이유로 부팅 프레임부터 맞춘다

    return {
      system: {
        name: sky.name,
        update(ctx) {
          sky.update(ctx);
          // 하늘이 시간대를 옮긴 **뒤에** 읽는다. 순서가 뒤집히면 한 프레임 늦은 값으로
          // 켜져서, 시간대를 바꿀 때 가로등만 뒤늦게 따라온다.
          neon.apply(env.time());
          groundLift.apply(env.time());
        },
        dispose: () => sky.dispose?.(),
      },

      // 부팅 예열에 날씨 레이어를 얹는다. 이것이 없으면 예열 프레임은 "지금 보이는 하늘"만
      // 굽고, 감독이 날씨를 바꾸는 순간 비·눈·오로라의 지오·텍스처·파이프라인이 한꺼번에
      // 생긴다 — 실기기 실측에서 pipeline +2 · geometry +3 · texture +3 계단이 그것이었다.
      prewarm: () => sky.prewarm(),

      diagnostics() {
        // 하늘 상태 + **조명 실측값**. 번개는 조명 강도를 순간적으로 올리는 방식이라,
        // 이 값을 샘플링하지 않으면 "쳤는데 못 본 것"과 "안 친 것"을 구별할 수 없다.
        // 감독이 "천둥 불빛이 안 보인다"고 했을 때 추측이 다섯 개까지 늘어난 이유가
        // 여기에 잴 수단이 없었기 때문이다.
        const r = env.adapter.renderer as { toneMappingExposure?: number } | null;
        const fog = env.scene.fog as { color?: { getHex(): number } } | null;
        return {
          ...(sky.get() as object),
          // ── 사본이 어긋나면 보이게 한다 (팀장 조건 5) ────────────────────
          // 위 스프레드의 `time` 은 **엔진 반영값**이고, 아래는 **조립부가 소유한 진실**
          // 이다. `sky.js` 는 조합 보정을 적용한 결과를 돌려주므로 요청값과 반영값이
          // 어긋나는 경로가 이론상 있다 — 어긋나면 진단에서 보여야 하고, 침묵하면 이번
          // 블룸 사고의 재판이다(그 사고도 두 값이 갈렸는데 아무 신호가 없었다).
          ownedTime: env.time(),
          sunI: env.sun.intensity,
          hemiI: env.hemi.intensity,
          sunC: env.sun.color.getHex(),
          hemiC: env.hemi.color.getHex(),
          // ── 밤 하한이 **실제로 걸렸는가** ────────────────────────────────
          // 아래 셋이 없어서 지난번 진단이 "밤을 밝혔다" 를 확인해 주지 못했다.
          // `hemiG` 는 지면을 비추는 색이라 밤 밝기의 핵심인데 안 실려 있었고,
          // `exposure`·`fogC` 는 이번에 축으로 연 것이라 함께 싣는다. 값이 안 변했으면
          // 처방이 안 걸린 것이고, 변했는데 화면이 그대로면 축이 틀린 것이다.
          hemiG: env.hemi.groundColor.getHex(),
          exposure: typeof r?.toneMappingExposure === 'number' ? r.toneMappingExposure : null,
          fogC: fog?.color ? fog.color.getHex() : null,
          // 네온이 켜졌는가. 화면으로는 "좀 밝네" 로만 보이는 것을 숫자로 남긴다.
          //
          // `neonMissing` 이 비어 있지 않으면 그 파츠는 **발광을 신고했는데 아무것도
          // 안 걸린 것**이다 — 포크 직후 마천루·광고 타워·다리가 정확히 그 상태였고,
          // 화면에서는 "그냥 좀 어두운" 것으로만 보였다. 숫자로 남겨야 알아챈다.
          lampGlow: neon.intensityOf('lamp') ?? null,
          neonWired: neon.wired,
          neonMissing: neon.missing,
          // 지면 알베도 배수. `groundMissing` 이 비어 있지 않으면 그 파츠에는 **아무것도
          // 안 걸린 것**이다 — 조용히 넘어가면 기능이 죽은 줄 모른다.
          groundLift: groundLift.scale,
          groundMissing: groundLift.missing,
        };
      },

      /**
       * 드로우콜 판정 그룹 키.
       *
       * `sky.js`가 시간대·날씨·fx에 따라 구름·별·비·눈·무지개·오로라의 `visible`을
       * 토글하므로 드로우콜은 **하늘을 바꾸면 정당하게 변한다.** 전 구간 상수로 판정하면
       * 하늘을 만진 결과가 증식으로 찍힌다(감독 실기기 리포트에서 `draw 9~12 ← 불변식
       * 위반`이 그렇게 나왔고, 같은 리포트의 pipeline·geometry·texture는 전부 상수였다).
       *
       * `settling`이면 `null`을 돌려 그 표본을 판정에서 뺀다 — 지금 그려지는 것이 논리
       * 상태와 어긋나는 중이라는 뜻이고, **무엇이 전이인지는 `sky.js`가 판정한다**(축을
       * 소비자가 세다가 세 번 연속으로 빠뜨렸다: 크로스페이드 돔 · lite · 별 감쇠 꼬리).
       *
       * `flashSafe`는 키에 넣지 않는다 — 광과민성 보호 모드는 조명 강도·색만 바꾸고
       * 무엇을 그릴지는 안 바꾼다. `lite`는 넣는다 — 구름·별 레이어를 아예 끄므로 전이가
       * 아니라 다른 상태다.
       */
      drawGroupKey() {
        const s = sky.get();
        if (s.settling) return null;
        const fx = Object.entries(s.fx ?? {})
          .filter(([, on]) => on).map(([k]) => k).sort().join('+');
        return `${s.time}|${s.weather}${fx ? `|${fx}` : ''}${s.lite ? '|lite' : ''}`;
      },

      dispose() {
        panel?.dispose();
      },
    };
  },
};
