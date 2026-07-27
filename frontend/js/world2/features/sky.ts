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
import type { Feature, FeatureEnv, FeatureInstance } from './types.js';

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
    );

    // 神 모드 패널 — 시간대·날씨·이벤트. DOM이 없으면 조용히 건너뛴다(패널 없이도 하늘은
    // 돈다). 예전에는 이 배선이 main.ts에 있어서, 하늘을 빼도 패널 코드가 남았다.
    let panel: SkyPanel | null = null;
    const parts = env.doc ? findSkyPanel(env.doc) : null;
    if (parts) panel = attachSkyPanel(parts, sky.controls);

    return {
      system: sky,

      diagnostics() {
        // 하늘 상태 + **조명 실측값**. 번개는 조명 강도를 순간적으로 올리는 방식이라,
        // 이 값을 샘플링하지 않으면 "쳤는데 못 본 것"과 "안 친 것"을 구별할 수 없다.
        // 감독이 "천둥 불빛이 안 보인다"고 했을 때 추측이 다섯 개까지 늘어난 이유가
        // 여기에 잴 수단이 없었기 때문이다.
        return {
          ...(sky.get() as object),
          sunI: env.sun.intensity,
          hemiI: env.hemi.intensity,
          sunC: env.sun.color.getHex(),
          hemiC: env.hemi.color.getHex(),
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
