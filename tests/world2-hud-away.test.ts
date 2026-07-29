// HUD 가 자리비움 표본을 프레임 통계에 섞지 않는가.
//
// 커널이 `away_ms` 로 갈라 보내고(`world2-kernel.test.ts`), 리포트가 그 사실을 적는다
// (`world2-telemetry.test.ts`). **그 사이에 HUD 가 있다.** 이름을 하나 잘못 보면 갈라 보낸
// 값이 도로 프레임 링에 들어가고, 세 파일의 단위 테스트는 전부 통과한 채로 감독 리포트만
// 다시 12fps 가 된다 — 이 저장소가 반복해서 미끄러진 "경계를 건너는 지점"이다.
//
// 그래서 여기서는 **실제 `attachHud` 를 돌린다.** DOM 은 최소 스텁으로 세운다.

import { describe, it, expect } from 'vitest';
import { attachHud, type HudParts, type HudSource } from '../frontend/js/world2/ui/hud.js';

/** addEventListener 로 붙은 핸들러를 직접 발화시킬 수 있는 요소 스텁 */
function el() {
  const handlers: Record<string, Array<() => void>> = {};
  return {
    textContent: '',
    dataset: {} as Record<string, string>,
    addEventListener(t: string, cb: () => void) { (handlers[t] ??= []).push(cb); },
    removeEventListener(t: string, cb: () => void) {
      const a = handlers[t] ?? []; const i = a.indexOf(cb); if (i >= 0) a.splice(i, 1);
    },
    fire(t: string) { for (const cb of [...(handlers[t] ?? [])]) cb(); },
  };
}

function makeHud() {
  const root = el(); const body = el(); const copy = el(); const toggle = el();
  const src: HudSource = {
    backend: () => 'WebGL',
    counts: () => ({ draw: 100, pipeline: 10, geometries: 20, textures: 15 }),
    stream: () => ({ loaded: 9, built: 0, released: 0, starved: 0 }),
    adapt: () => ({ pixelRatio: 1, frameCap: 0, triAvg: 1000 }),
  };
  const hud = attachHud(
    { root, body, copy, toggle } as unknown as HudParts,
    src,
  );
  /** HUD 를 펼치면 그 자리에서 다시 그린다 — 화면 문자열을 즉시 읽을 수 있다 */
  const open = () => { toggle.fire('click'); return body.textContent; };
  return { hud, open, body, toggle };
}

/** "60fps  max 17ms  히칭 0" 첫 줄에서 fps 숫자만 뽑는다 */
const fpsOf = (s: string) => Number(/^(\d+)fps/.exec(s.split('\n')[0])?.[1] ?? -1);

describe('HUD — 자리비움은 프레임 통계에 섞이지 않는다', () => {
  it('평상시 프레임만 있으면 60fps 로 읽힌다', () => {
    const { hud, open } = makeHud();
    for (let i = 0; i < 60; i++) hud.sample('frame_ms', 16.7);
    expect(fpsOf(open())).toBe(60);
    hud.dispose();
  });

  it('자리비움 57초가 들어와도 fps 와 히칭이 그대로다', () => {
    const { hud, open } = makeHud();
    for (let i = 0; i < 60; i++) hud.sample('frame_ms', 16.7);
    hud.sample('away_ms', 57_197);   // 감독 실기기에서 실제로 찍혔던 값
    const s = open();
    expect(fpsOf(s)).toBe(60);
    expect(s).toContain('히칭 0');
    hud.dispose();
  });

  it('대조 — 같은 값을 frame_ms 로 넣으면 무너진다', () => {
    // 이 테스트가 없으면 위 단언이 "그 축을 실제로 보고 있는가"를 증명하지 못한다.
    // 자리비움을 안 갈라냈을 때 감독 리포트가 어떻게 됐는지가 바로 이것이다.
    const { hud, open } = makeHud();
    for (let i = 0; i < 60; i++) hud.sample('frame_ms', 16.7);
    hud.sample('frame_ms', 57_197);
    const s = open();
    expect(fpsOf(s)).toBeLessThan(10);
    expect(s).not.toContain('히칭 0');
    hud.dispose();
  });

  it('out_ms 로도 새지 않는다 — 자리비움은 어느 링에도 안 들어간다', () => {
    // 커널은 복귀 프레임에서 `out_ms` 도 보내지 않는다. 만약 보내게 되면 "우리 콜백 밖에서
    // 사라진 시간"이 자리비움으로 부풀어, 아직 못 푼 진짜 프리즈 진단을 덮는다.
    const { hud, open } = makeHud();
    for (let i = 0; i < 60; i++) { hud.sample('frame_ms', 16.7); hud.sample('out_ms', 7); }
    hud.sample('away_ms', 57_197);
    expect(fpsOf(open())).toBe(60);
    hud.dispose();
  });
});
