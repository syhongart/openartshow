// world3/features/glb-city.ts — **얇은 래퍼.** 본체는 `world-shared/glb-city.ts` 다.
//
// 근거·주의는 `world2/features/glb-city.ts` 헤더 한 곳이다(여기 다시 적으면 세 벌
// 복제가 주석에서 다시 시작된다 — 그것을 없애려고 통합했다).
//
// ⚠ 통합 전 이 파일은 865줄이었고 `EXT_OFF`·`disableMatExtensions` 를 **인라인으로
// 복제**하고 있었다(백로그 #47). 그 복제는 공유 모듈이 `world-shared/glb-material.ts`
// 하나를 쓰면서 사라졌다.

import type { Feature, FeatureEnv, FeatureInstance } from './types.js';
import { readNum, readEnum } from '../url-knob.js';
import { PLAZA_WEST } from '../decide/grid.js';
import { glbCity } from '../../world-shared/glb-city.js';

export const glbCityFeature: Feature = {
  name: 'glbCity',

  create(env: FeatureEnv): FeatureInstance | null {
    return glbCity.create(env, {
      worldName: 'world3',
      plazaWest: PLAZA_WEST,
      readNum,
      readEnum,
    });
  },
};
