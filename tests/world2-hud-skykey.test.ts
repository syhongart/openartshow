// @vitest-environment jsdom
//
// HUD 표본 수집 통합 테스트 — 판정과 집행이 경계를 건너는 지점.
//
// ── 왜 이 파일이 필요한가 ────────────────────────────────────────────────────
// `constancyByGroup`은 순수 함수라 표로 시험하기 쉽다. 그런데 그 함수가 받는 두 배열
// (`draw`와 `drawSkyKey`)이 **같은 인덱스에서 같은 프레임인가**는 순수 함수 테스트로
// 절대 안 잡힌다. 링이 한 칸 어긋나도 판정은 조용히 돌아가고, 심지어 통과한다.
//
// 검수관이 이 diff를 보고 지목한 것이 정확히 그 구멍이었다 — "테스트가 전부 순수 함수만
// 겨냥한다. sky.js 실제 visible 토글 조건과 skyKey()가 일치하는지 검증하는 통합 테스트는
// 이 diff에 없다." CLAUDE.md의 「판정/집행 분리의 구멍」이 말하는 그대로다.
//
// 여기서는 `attachHud`를 DOM 스텁 위에서 **실제로 돌린다.** 리포트 전문은 복사 버튼의
// 클립보드 실패 폴백(textarea)에서 그대로 읽는다 — 프로덕션 경로를 그대로 통과시키는
// 방법이라, 리포트 조립이 깨지면 여기서 먼저 운다.

import { describe, it, expect, beforeEach } from 'vitest';
import { attachHud, type HudSource } from '../web/js/world2/ui/hud.js';

function parts() {
  const mk = (id: string) => {
    const el = document.createElement('button');
    el.id = id;
    document.body.appendChild(el);
    return el;
  };
  return {
    root: mk('root'), body: mk('body'), copy: mk('copy'), toggle: mk('toggle'),
  };
}

/** 드로우콜과 하늘 상태를 시험이 직접 조종하는 가짜 소스 */
function source(over: Partial<HudSource> = {}) {
  const state = { draw: 9, sky: 'night|clear' as string | null, throwOnSky: false };
  const src: HudSource = {
    backend: () => 'WebGPU',
    counts: () => ({ draw: state.draw, pipeline: 10, geometries: 9, textures: 9 }),
    skyKey: () => {
      if (state.throwOnSky) throw new Error('sky.get() 폭발');
      return state.sky;
    },
    stream: () => ({ loaded: 16, built: 0, released: 0, starved: 0 }),
    adapt: () => ({ pixelRatio: 2, frameCap: 0, triAvg: 54205 }),
    ...over,
  };
  return { src, state };
}

/** 복사 버튼을 눌러 리포트 전문을 얻는다 — 클립보드가 없으므로 textarea 폴백이 탄다 */
async function report(copyBtn: HTMLElement): Promise<string> {
  copyBtn.click();
  await new Promise((r) => setTimeout(r, 0));
  const ta = document.querySelector('textarea');
  return ta ? (ta as HTMLTextAreaElement).value : '';
}

const drawLineOf = (text: string) => text.split('\n').find((l) => l.startsWith('draw')) ?? '';

beforeEach(() => { document.body.innerHTML = ''; });

describe('HUD 표본 수집 — draw와 하늘 상태의 짝', () => {
  it('전이 구간(skyKey null) 표본은 draw에도 안 들어가고, 뺀 수가 리포트에 남는다', async () => {
    const p = parts();
    const { src, state } = source();
    const hud = attachHud(p, src);

    // 안정 구간 — night|clear에서 draw 9
    for (let i = 0; i < 5; i++) hud.tick();
    // 전이 구간 — fadeDome이 하나 더 그려져 draw 10. 이 표본은 빠져야 한다.
    state.sky = null; state.draw = 10;
    for (let i = 0; i < 3; i++) hud.tick();
    // 도착 — night|rain에서 draw 12
    state.sky = 'night|rain'; state.draw = 12;
    for (let i = 0; i < 5; i++) hud.tick();

    const line = drawLineOf(await report(p.copy));
    // 전이 표본(10)이 night|rain 그룹에 섞였다면 12~10 변동으로 위반이 찍힌다.
    expect(line).not.toContain('불변식 위반');
    expect(line).toContain('night|clear=9');
    expect(line).toContain('night|rain=12');
    expect(line).toContain('하늘 전이 중 3표본 제외');
    hud.dispose();
  });

  // 이것이 이 파일의 존재 이유다. 링이 한 칸 어긋나면 draw 9가 night|rain 키와 짝지어지고,
  // 그 순간 없는 위반이 만들어진다(또는 있는 위반이 숨는다).
  it('상태가 여러 번 바뀌어도 각 표본이 제 키와 짝지어진다', async () => {
    const p = parts();
    const { src, state } = source();
    const hud = attachHud(p, src);

    const route: Array<[string | null, number]> = [
      ['night|clear', 9], ['night|clear', 9],
      [null, 10],
      ['night|rain', 12], ['night|rain', 12],
      [null, 13],
      ['day|clear', 10], ['day|clear', 10],
      [null, 11],
      ['night|clear', 9], // 되돌아와도 같은 그룹에 같은 값
    ];
    for (const [sky, draw] of route) { state.sky = sky; state.draw = draw; hud.tick(); }

    const line = drawLineOf(await report(p.copy));
    expect(line).not.toContain('불변식 위반');
    expect(line).toContain('night|clear=9');
    expect(line).toContain('night|rain=12');
    expect(line).toContain('day|clear=10');
    expect(line).toContain('하늘 전이 중 3표본 제외');
    hud.dispose();
  });

  // 같은 하늘 상태에서 드로우콜이 늘어난 것 — 슬롯 풀 설계가 무너졌다는 뜻이라
  // 이건 반드시 잡혀야 한다. 판정을 완화하면서 이게 같이 죽지 않았는지 보는 테스트다.
  it('같은 하늘 상태에서 드로우콜이 늘면 그 상태를 지목해 잡는다', async () => {
    const p = parts();
    const { src, state } = source();
    const hud = attachHud(p, src);

    for (let i = 0; i < 3; i++) hud.tick();      // night|clear = 9
    state.draw = 14;                              // 하늘은 그대로인데 늘었다
    for (let i = 0; i < 3; i++) hud.tick();

    const line = drawLineOf(await report(p.copy));
    expect(line).toContain('불변식 위반');
    expect(line).toContain('night|clear 9~14');
    hud.dispose();
  });

  // `draw.push` 뒤에 키를 구하는 순서였다면 여기서 두 링이 영구히 어긋난다.
  it('skyKey()가 던져도 두 링이 어긋나지 않는다', async () => {
    const p = parts();
    const { src, state } = source();
    const hud = attachHud(p, src);

    for (let i = 0; i < 3; i++) hud.tick();      // night|clear = 9
    state.throwOnSky = true;
    for (let i = 0; i < 2; i++) hud.tick();      // 예외 — 둘 다 안 들어가야 한다
    state.throwOnSky = false;
    state.sky = 'night|rain'; state.draw = 12;
    for (let i = 0; i < 3; i++) hud.tick();

    const line = drawLineOf(await report(p.copy));
    // 어긋났다면 9가 night|rain과 짝지어져 12~9 변동이 찍힌다.
    expect(line).not.toContain('불변식 위반');
    expect(line).toContain('night|clear=9');
    expect(line).toContain('night|rain=12');
    hud.dispose();
  });

  it('skyKey가 없는 소스면 옛 판정으로 떨어진다 — 하위호환', async () => {
    const p = parts();
    const { src, state } = source({ skyKey: undefined });
    const hud = attachHud(p, src);

    for (let i = 0; i < 3; i++) hud.tick();
    state.draw = 12;
    for (let i = 0; i < 3; i++) hud.tick();

    const line = drawLineOf(await report(p.copy));
    expect(line).toContain('불변식 위반');
    expect(line).not.toContain('제외');
    hud.dispose();
  });
});
