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
import { readParcelAnim, scaleAdvance, type ScaleState } from '../decide/lod-fade.js';
import { glbCity } from '../../world-shared/glb-city.js';

export const glbCityFeature: Feature = {
  name: 'glbCity',

  create(env: FeatureEnv): FeatureInstance | null {
    // ── 🔴 등장 연출을 **여기서 주입한다** (감독 판정 2026-08-20 — *"자라나는 느낌이
    // 아닌데?"*) ────────────────────────────────────────────────────────────
    // 산술(`scaleAdvance`)과 상수(`?grow=`·`?shrink=`·이징)는 `decide/lod-fade.ts` 소유다.
    // `?grow=` 는 `readParcelAnim()` **한 곳**에서만 읽혀 세 갈래로 흘러간다 —
    // `main.ts` → 마을 파츠 / `artwork-scene.ts:98` → 액자 / 여기 → 미술관. 그래서
    // 감독이 `?grow=` 로 판정하면 **셋이 함께** 변한다(W8-10 이 액자를 이 SSOT 로
    // 끌어온 것과 같은 이유 — 어긋난 화면으로 판정하면 판정 자체가 틀린다).
    //
    // ⚠ **`scaleAdvance` 를 실제로 호출하는 것은 액자와 여기뿐이다**(검수관 블로커 C3
    // 실측). 첫 판본은 *"마을 파츠와 액자가 이미 **같은 함수**를 쓴다"* 고 적었고
    // **거짓이었다** — `parcel-grow.ts:27-29` 는 `lod-fade` 에서 **상수·헬퍼만** 가져다
    // 쓰고 자체 루프를 돈다. 원문(`lod-fade.ts`)의 *"같은 **식**"* 이 옮겨
    // 적히며 *"같은 함수"* 가 됐다. 결론은 참이었지만 근거가 틀렸고, `fresh`·되감기
    // 금지는 마을 파츠에 **없는 개념**이라 다음 사람을 오도한다.
    //
    // ⚠ **이 파일은 로직을 쓰지 않는다는 규칙이 있다.** 여기 있는 것은 로직이 아니라
    // **배선**이다 — 세계별로 다른 것(연출을 쓰는가)을 공유 본체에 넘기는 자리이고,
    // 그 자리를 만들려고 이 래퍼가 남아 있다(파일 헤더가 예고한 바로 그 용도다).
    // 산술을 여기 옮겨 적으면 그때는 규칙 위반이다.
    const anim = readParcelAnim();
    const states = new Map<number, ScaleState>();

    return glbCity.create(env, {
      worldName: 'world8',
      plazaWest: PLAZA_WEST,
      readNum,
      readEnum,
      copyScale: (id, up, dt) => {
        // 첫 걸음은 `fresh` 라 **목표로 순간 이동**한다 — 부팅에서 0.02배로 시작하면
        // 바운딩 스피어가 작아져 컬링되고, 그러면 `info.memory` 계단이 복귀 구간으로
        // 밀려 개수 불변식 `[7]` 이 FAIL 한다. 그 계약은 `scaleAdvance` 소유다.
        const st = states.get(id)
          ?? { k: up ? 1 : 0, up, elapsed: 0, from: up ? 1 : 0, fresh: true };
        const next = scaleAdvance(st, up, dt, anim);
        if (!next) return null;
        states.set(id, next);
        return next.k;
      },
    });
  },
};
