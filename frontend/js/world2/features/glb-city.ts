// world2/features/glb-city.ts — **얇은 래퍼.** 본체는 `world-shared/glb-city.ts` 다.
//
// ── 왜 이 파일이 남아 있나 (2026-08-16 통합) ────────────────────────────────
// 본체를 공유로 올렸지만 **`Feature`·`FeatureEnv`·`FeatureInstance` 타입은 세계마다
// 다르다**(world2 457줄 / world3·5 303줄). 공유 모듈이 그 타입을 import 하면 팀장 규칙
// R2(*"공유 모듈이 특정 세계를 알면 공유가 아니다"*)를 어긴다. 그래서 **타입은 여기 남고
// 로직은 저기 산다** — 이 파일이 그 경계다.
//
// 덤으로 「나중에 world2 만 다르게 해야 할 때」의 자리가 된다. 그때 이 래퍼가
// 공유 결과를 감싸거나, 이 파일이 다시 본체를 갖는다.
//
// ⚠ **여기에 로직을 쓰지 마라.** 로직이 늘면 세 벌 복제가 다시 시작된다 —
// 그것을 없애려고 통합한 것이다.

import type { Feature, FeatureEnv, FeatureInstance } from './types.js';
import { readNum, readEnum } from '../url-knob.js';
import { PLAZA_WEST } from '../decide/grid.js';
import { glbCity } from '../../world-shared/glb-city.js';

export const glbCityFeature: Feature = {
  name: 'glbCity',

  create(env: FeatureEnv): FeatureInstance | null {
    return glbCity.create(env, {
      worldName: 'world2',
      plazaWest: PLAZA_WEST,
      readNum,
      readEnum,
    });
  },
};
