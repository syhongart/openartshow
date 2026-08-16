// world5/features/glb-city.ts — **얇은 래퍼.** 본체는 `world-shared/glb-city.ts` 다.
//
// 근거·주의는 `world2/features/glb-city.ts` 헤더 한 곳이다.
//
// ⚠ 통합 전 이 파일은 world3 판과 **세계 이름 3곳만 다른 865줄 복제**였다(diff 실측).
// `EXT_OFF`·`disableMatExtensions` 인라인도 함께 있었다(백로그 #47) — 둘 다 사라졌다.

import type { Feature, FeatureEnv, FeatureInstance } from './types.js';
import { readNum, readEnum } from '../url-knob.js';
import { PLAZA_WEST } from '../decide/grid.js';
import { glbCity } from '../../world-shared/glb-city.js';

export const glbCityFeature: Feature = {
  name: 'glbCity',

  create(env: FeatureEnv): FeatureInstance | null {
    return glbCity.create(env, {
      worldName: 'world5',
      plazaWest: PLAZA_WEST,
      readNum,
      readEnum,
    });
  },
};
