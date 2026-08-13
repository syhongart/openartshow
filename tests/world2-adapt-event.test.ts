// 적응 해상도 전환의 ev: 발화 — **강등이 마크 리포트에 찍히는가.**
//
// 감독 실기기 "이동 중 밝기가 살짝 변함"(2026-08-10)에서 안개·헤드밥이 실측으로
// 기각된 뒤 남은 이동-반응 축이 적응 해상도다. 판정은 감독 마크 창과 `?adapt=0`
// 켬/끔 실측인데, 그 판정 수단인 `ev:해상도` 발화 자체가 안 돌면 "이벤트 0건" 이
// "발동 안 함" 과 구별되지 않는다 — 그 구멍을 이 검사가 막는다(발화 줄을 지우면
// 여기가 깨진다 — 뮤테이션 확인 완료).

import { describe, it, expect } from 'vitest';
import { AdaptSystem } from '../frontend/js/world2/systems/adapt.js';
import { WARMUP_MS, DEMOTE_FPS } from '../frontend/js/world2/decide/adapt.js';
import type { FrameCtx } from '../frontend/js/world2/kernel.js';

describe('AdaptSystem ev:해상도', () => {
  it('강등 결정이 집행될 때 ev:해상도 를 발화한다', () => {
    let ratio = 1.5;
    const adapt = new AdaptSystem({
      dpr: 3, mobileCap: 1.5,
      targets: {
        setPixelRatio: (r) => { ratio = r; },
        getPixelRatio: () => ratio,
        setFrameCap: () => {},
        lastTri: () => 1000,
        isStreaming: () => false,
      },
    });
    const events: Array<{ name: string; value: number }> = [];
    const ctx = (dt: number): FrameCtx => ({
      dt, ageMs: WARMUP_MS + 1, frame: 0, hidden: false, resumed: false,
      probe: (name, value) => { events.push({ name, value }); },
    });
    // fps EMA(초기 60)를 DEMOTE_FPS 아래로 끌어내린다 — 저 fps 프레임을 반복 공급.
    for (let i = 0; i < 60; i++) adapt.update(ctx(0.2));
    expect(adapt.snapshot().fps).toBeLessThan(DEMOTE_FPS); // 전제가 성립했는가
    const fired = events.filter((e) => e.name === 'ev:해상도');
    expect(fired.length).toBeGreaterThan(0);
    expect(fired[0].value).toBe(ratio); // 발화 값 = 실제 집행된 배율
    expect(ratio).toBeLessThan(1.5); // 강등이 실제로 집행됐다
  });
});
