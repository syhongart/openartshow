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
  nightness, lampGlow,
  NIGHT_HEMI_I, NIGHT_SUN_I, NIGHT_EXPOSURE, NIGHT_FOG_SCALE, NIGHT_GROUND_SCALE,
} from '../decide/night.js';
import { readNum, readEnum } from '../url-knob.js';
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

/** `sky.js` 의 `LIGHT` 최상위 키. 목록 밖 값이 넘어가면 팔레트 조회가 `undefined` 가 된다 */
const TIMES = ['day', 'sunset', 'night'] as const;
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
        // ── 시간대·날씨 (`?time=` `?weather=`) ────────────────────────────
        // 神 모드 패널로도 바꿀 수 있지만, 그건 **DOM 이 있어야** 한다. 헤드리스 측정과
        // 감독 확인이 둘 다 링크 하나로 끝나야 해서 URL 로도 연다. 낮을 대조군으로
        // 띄우지 못하면 "밤이 얼마나 어두운가" 를 수치로 말할 수 없다.
        time: readEnum('time', 'night', TIMES),
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
          fogScale: readNum('nfog', NIGHT_FOG_SCALE, 0.2, 4),
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
      },
    );

    // 神 모드 패널 — 시간대·날씨·이벤트. DOM이 없으면 조용히 건너뛴다(패널 없이도 하늘은
    // 돈다). 예전에는 이 배선이 main.ts에 있어서, 하늘을 빼도 패널 코드가 남았다.
    let panel: SkyPanel | null = null;
    const parts = env.doc ? findSkyPanel(env.doc) : null;
    if (parts) panel = attachSkyPanel(parts, sky.controls);

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
    const lampMat = env.pools.materialOf('lamp') as { emissiveIntensity?: number } | null;
    let lampLit = -1; // 마지막으로 쓴 값. 같은 값을 다시 쓰지 않으려는 것

    function applyLampGlow(): void {
      if (!lampMat) return;
      const g = lampGlow(nightness(sky.get().time));
      // 값이 안 바뀌었으면 건드리지 않는다. 매 프레임 같은 수를 대입해도 three 는
      // 조용히 넘어가지만, 만지지 않는 것이 만지는 것보다 언제나 싸다.
      if (g === lampLit) return;
      lampLit = g;
      lampMat.emissiveIntensity = g;
    }

    applyLampGlow(); // 부팅 프레임부터 맞춰 둔다 — 밤에 들어왔는데 첫 프레임만 꺼져 있으면 깜빡인다

    return {
      system: {
        name: sky.name,
        update(ctx) {
          sky.update(ctx);
          // 하늘이 시간대를 옮긴 **뒤에** 읽는다. 순서가 뒤집히면 한 프레임 늦은 값으로
          // 켜져서, 시간대를 바꿀 때 가로등만 뒤늦게 따라온다.
          applyLampGlow();
        },
        dispose: () => sky.dispose?.(),
      },

      diagnostics() {
        // 하늘 상태 + **조명 실측값**. 번개는 조명 강도를 순간적으로 올리는 방식이라,
        // 이 값을 샘플링하지 않으면 "쳤는데 못 본 것"과 "안 친 것"을 구별할 수 없다.
        // 감독이 "천둥 불빛이 안 보인다"고 했을 때 추측이 다섯 개까지 늘어난 이유가
        // 여기에 잴 수단이 없었기 때문이다.
        const r = env.adapter.renderer as { toneMappingExposure?: number } | null;
        const fog = env.scene.fog as { color?: { getHex(): number } } | null;
        return {
          ...(sky.get() as object),
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
          // 가로등이 켜졌는가. 화면으로는 "좀 밝네" 로만 보이는 것을 숫자로 남긴다.
          lampGlow: lampLit,
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
