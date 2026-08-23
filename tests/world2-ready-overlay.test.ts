// @vitest-environment node
//
// `waitForWorld2Ready` 가 **오버레이까지 기다리는가** — 가짜 page 로 실제로 돌린다.
//
// ── 왜 텍스트 검사가 아닌가 ────────────────────────────────────────────────
// 이 저장소에는 *"소스에 `overlay` 라는 문자열이 있는가"* 로 배선을 보는 검사가 여럿
// 있고, 그것들은 **제어흐름을 안 본다**(그 한계가 각 파일에 적혀 있다). 이번 축은 그럴
// 필요가 없다 — `waitForWorld2Ready(page)` 는 `page` 를 **주입받으므로** 가짜를 넣어
// **판정 자체를 돌릴 수 있다.** 「ready 인데 절반만 놓였다」를 실제로 만들어 보고 그것이
// 빨간불이 되는지 본다.
//
// ── 이 검사가 지키는 명제 ──────────────────────────────────────────────────
// **「`ready` 는 다 놓았다는 뜻이어야 한다」** — `glb-city` 는 `placed`/`want` 짝으로 그
// 판정을 이미 하고 있었고 **오버레이만 `placed` 뿐이라 원리적으로 불가능**했다(W8-2 에서
// `want` 를 열었다). 여기가 그 판정이 실제로 도는지를 보는 자리다.
//
// ── 못 잡는 것 ─────────────────────────────────────────────────────────────
// 브라우저를 안 쓰므로 **`stats().overlay` 가 진짜로 그 모양인지**는 못 본다. 그 짝은
// `features/overlay.ts` 쪽 검사(`tests/world2-edit-place.test.ts`)와 스모크가 본다.

import { describe, it, expect, afterEach } from 'vitest';
import { waitForWorld2Ready } from '../scripts/smoke/world2-ready.mjs';

type Stats = Record<string, unknown>;

/**
 * 가짜 page. `waitForFunction` 의 콜백을 **노드에서 그대로 부른다** — 그 콜백이 보는
 * `window.__world2` 를 전역에 심어 두면 브라우저 없이 같은 판정이 돈다.
 *
 * @param frames 호출이 진행될 때마다 넘어가는 상태들. 마지막 값은 계속 유지된다.
 */
function makePage(frames: Stats[]) {
  let tick = 0;
  const cur = () => frames[Math.min(tick, frames.length - 1)];
  (globalThis as unknown as { window: unknown }).window = {
    get __world2() { return { stats: () => cur() }; },
  };
  return {
    /** 조건이 참이 될 때까지 상태를 넘긴다. 끝까지 안 되면 던진다(= 실제 타임아웃) */
    async waitForFunction(fn: (a?: unknown) => unknown, arg?: unknown) {
      for (let i = 0; i < frames.length + 4; i++) {
        if (fn(arg)) return;
        tick++;
      }
      throw new Error('timeout');
    },
    async evaluate<T>(fn: () => T): Promise<T> { return fn(); },
  };
}

afterEach(() => { delete (globalThis as unknown as { window?: unknown }).window; });

/** GLB·VRM 단계를 통과시키는 최소 상태. 오버레이 축만 남긴다 */
const PASS_BEFORE = { glbCity: { state: 'ready', placed: 1, want: 1 }, npc: { vrmWant: 0, vrmPlaced: 0 } };

describe('waitForWorld2Ready — 오버레이 축', () => {
  it('loading 을 벗어날 때까지 기다린다 — 시간이 아니라 상태다', async () => {
    const page = makePage([
      { ...PASS_BEFORE, overlay: { state: 'loading', want: 3, placed: 0 } },
      { ...PASS_BEFORE, overlay: { state: 'loading', want: 3, placed: 2 } },
      { ...PASS_BEFORE, overlay: { state: 'ready', want: 3, placed: 3 } },
    ]);
    const r = await waitForWorld2Ready(page as never);
    expect(r.reason, '다 놓였는데 이유가 붙었다').toBe('');
    expect(r.overlay).toMatchObject({ state: 'ready', want: 3, placed: 3 });
  });

  it('★ ready 인데 덜 놓였으면 빨간불이다 — 이 판정이 W8-2 가 `want` 를 연 이유다', async () => {
    const page = makePage([
      { ...PASS_BEFORE, overlay: { state: 'ready', want: 10, placed: 4, failed: ['a.glb', 'b.glb'] } },
    ]);
    const r = await waitForWorld2Ready(page as never);
    expect(r.reason, '★ 절반만 놓였는데 통과했다 — 「세운 척」이 초록불이 된다').toContain('10개 중 4개');
    // 왜 못 놓았는지도 함께 말해야 한다 — 개수만 알면 원인을 다시 찾아야 한다.
    expect(r.reason).toContain('a.glb');
  });

  it('★ state=failed 는 통과가 아니다 — 배치 없는 세계를 재고 초록불을 켜지 않는다', async () => {
    const page = makePage([
      { ...PASS_BEFORE, overlay: { state: 'failed', want: 2, placed: 0, error: '404' } },
    ]);
    const r = await waitForWorld2Ready(page as never);
    expect(r.reason).toContain('failed');
    expect(r.reason, '원인을 안 실으면 리포트만 보고 못 짚는다').toContain('404');
  });

  it('loading 에서 안 벗어나면 타임아웃을 그대로 말한다', async () => {
    const page = makePage([{ ...PASS_BEFORE, overlay: { state: 'loading', want: 1, placed: 0 } }]);
    const r = await waitForWorld2Ready(page as never);
    expect(r.reason).toContain('로딩을 못 끝냈다');
  });

  it('기능이 꺼져 있으면(`?overlay=0`) 기다리지 않는다 — 없는 것과 실패한 것은 다르다', async () => {
    const page = makePage([{ ...PASS_BEFORE }]);
    const r = await waitForWorld2Ready(page as never);
    expect(r.reason).toBe('');
    expect(r.overlay, '기능이 없으면 null 이다').toBeNull();
  });

  it('배치 0개도 정상 통과다 — 지금 라이브가 그 상태다', async () => {
    const page = makePage([{ ...PASS_BEFORE, overlay: { state: 'ready', want: 0, placed: 0 } }]);
    const r = await waitForWorld2Ready(page as never);
    expect(r.reason).toBe('');
  });

  it('앞 단계(GLB)의 판정을 가리지 않는다 — 오버레이 축이 그 위에 얹힌 것뿐이다', async () => {
    const page = makePage([
      {
        glbCity: { state: 'ready', placed: 0, want: 1 },
        npc: { vrmWant: 0 },
        overlay: { state: 'ready', want: 0, placed: 0 },
      },
    ]);
    const r = await waitForWorld2Ready(page as never);
    expect(r.reason, 'GLB 가 안 섰는데 오버레이가 통과시켰다').toContain('1채 중 0채');
  });
});
