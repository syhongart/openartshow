// @vitest-environment jsdom
//
// world11 진입점 **집행** 테스트 — 이 부트 파일의 코드 경로를 실제로 돌린다.
//
// ── 왜 정적 검사만으로는 모자란가 ───────────────────────────────────────────
// `tests/world-glb-independence.test.ts` 가 이 파일을 표본에 넣어 「트리 밖을 import
// 하지 않는가」를 본다. 그것은 **소스를 읽는** 검사다. 이 파일이 실제로 `startGlbWorld`
// 를 어떤 인자로 부르는가 — `tag` 가 무엇이고 `source()` 가 어디서 자산을 읽는가 — 는
// 어느 정적 검사에도 안 걸린다.
//
// 이 저장소가 *"판정/집행 분리의 구멍 — 경계를 건너는 지점은 아무도 안 본다"* 라고
// 이름 붙인 형태가 정확히 그것이다. `<body data-glb>` 를 **페이지의 사실**로 삼겠다는
// 계약은 이 함수 안에서만 지켜지고, 그것을 실행해 보지 않으면 계약이 아니라 주석이다.
//
// ── 무엇을 스텁하는가 ───────────────────────────────────────────────────────
// `world-glb/main.js` 는 `three/webgpu` 를 끌어오므로 jsdom 에서 못 돈다. 그 **한 모듈만**
// 가짜로 바꾸고 `asset-url.js`(순수 함수)와 부트 파일 본문은 **진짜를 돌린다.** 스텁이
// 늘면 재는 것이 사라진다 — 여기서 잡는 것은 「부트가 계약을 어떻게 채우는가」뿐이다.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/** `startGlbWorld` 가 받은 인자. 부트 파일이 모듈 레벨에서 부르므로 밖에 둔다 */
const calls: Array<{ canvas: unknown; opts: { tag: string; source: () => Promise<ArrayBuffer>; checklist?: boolean } }> = [];

vi.mock('../frontend/js/world-glb/main.js', () => ({
  startGlbWorld: (canvas: unknown, opts: never) => {
    calls.push({ canvas, opts });
    return Promise.resolve(null);
  },
}));

/** 부트 파일은 import 되는 순간 돈다 — 케이스마다 모듈 캐시를 비운다 */
async function boot(): Promise<void> {
  vi.resetModules();
  await import('../frontend/js/world11-boot.js');
}

let errors: unknown[][] = [];
let origFetch: typeof globalThis.fetch;

beforeEach(() => {
  calls.length = 0;
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => { errors.push(a); });
  origFetch = globalThis.fetch;
  document.body.innerHTML = '<canvas id="wg-canvas"></canvas>';
  document.body.dataset.glb = './assets/worlds/manhattan-180m.glb';
});
afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = origFetch;
  document.body.removeAttribute('data-glb');
});

describe('world11-boot — 트리와의 계약을 실제로 채운다', () => {
  it('⭐ `tag` 가 `world11` 이다 — 진단 훅이 어느 페이지인지 아는 유일한 축', () => {
    // `options.ts` 의 `tag` 주석: 진단 훅 이름을 `__glbWorld` 로 **합쳤으므로** 스모크·
    // 진단이 「어느 페이지를 잡았는가」를 알 방법이 이 필드뿐이다. world8 이 world2 트리를
    // 복사한 직후 `[world2] 부팅 실패` 로 찍힌 것이 검수관 반려 사유(N2)였다 — 같은 형태를
    // world11 에서 되풀이하지 않는다.
    return boot().then(() => {
      expect(calls, 'startGlbWorld 가 한 번도 안 불렸다').toHaveLength(1);
      expect(calls[0].opts.tag).toBe('world11');
    });
  });

  it('⭐ 자산 경로를 `<body data-glb>` 에서 읽는다 — 스크립트가 정하지 않는다', async () => {
    // 이것이 world7·world8 과 나뉘는 **유일한 축**의 world11 쪽 구현이다. 경로를 부트에
    // 하드코딩하면 「어느 GLB 가 세계인가」가 페이지의 사실이 아니게 된다.
    await boot();
    let asked = '';
    globalThis.fetch = (async (u: string) => {
      asked = String(u);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as unknown as Response;
    }) as typeof globalThis.fetch;
    const buf = await calls[0].opts.source();
    // `assetUrl` 이 `/app/` 을 붙인다(그 결합의 SSOT 는 `asset-url.ts` 한 곳).
    expect(asked).toBe('/app/./assets/worlds/manhattan-180m.glb');
    expect(buf.byteLength).toBe(8);
  });

  it('⭐ **다른 경로를 적으면 그것을 받는다** — 위 검사가 상수를 재고 있지 않다는 증거', async () => {
    // 앞 검사만 있으면 `source()` 가 경로를 하드코딩해도 통과할 수 있다(그 값이 우연히
    // 같으므로). 페이지를 바꿔 **따라오는지**를 본다 — 대조군 없는 단언은 검출력이 없다.
    document.body.dataset.glb = './assets/worlds/somewhere-else.glb';
    await boot();
    let asked = '';
    globalThis.fetch = (async (u: string) => {
      asked = String(u);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) } as unknown as Response;
    }) as typeof globalThis.fetch;
    await calls[0].opts.source();
    expect(asked).toBe('/app/./assets/worlds/somewhere-else.glb');
  });

  it('⭐ 자산이 없으면 **HTTP 상태를 담아** 던진다 — 지금 그 자산이 저장소에 없다', async () => {
    // 2026-09-16 현재 `manhattan-180m.glb` 는 굽는 중이라 라이브에서 404 가 난다.
    // 그때 화면에 무엇이 뜨는지가 이 회차의 실제 동작이므로 여기서 못 박는다.
    // 부팅 파이프라인이 이 예외를 로딩 화면에 보고하는 것이 설계다(`main.ts` 의 `stream`).
    await boot();
    globalThis.fetch = (async () => ({ ok: false, status: 404 }) as unknown as Response) as typeof globalThis.fetch;
    await expect(calls[0].opts.source()).rejects.toThrow('HTTP 404');
  });

  it('`data-glb` 가 비면 fetch 전에 던진다 — 빈 주소로 요청을 날리지 않는다', async () => {
    document.body.removeAttribute('data-glb');
    await boot();
    let hits = 0;
    globalThis.fetch = (async () => { hits++; return {} as Response; }) as typeof globalThis.fetch;
    await expect(calls[0].opts.source()).rejects.toThrow('열 세계가 없다');
    expect(hits, '빈 경로로 fetch 를 날렸다').toBe(0);
  });

  it('캔버스가 없으면 조립을 시작하지 않고 **이름을 남긴다**', async () => {
    document.body.innerHTML = '';
    await boot();
    expect(calls, '캔버스 없이 startGlbWorld 가 불렸다').toHaveLength(0);
    expect(errors.flat().join(' ')).toContain('[world11]');
  });

  it('⭐ **체크리스트를 켜지 않는다** — world7 전용이라는 경계를 여기서 다시 확인한다', async () => {
    // 감독 지시 2026-08-28 *"당분간.. 월드7에만.."*. `options.ts` 는 이것을 `tag` 분기가
    // 아니라 **부트가 켜는 플래그**로 뒀다 — 그래야 트리가 페이지를 계속 같게 본다.
    // 새 페이지가 늘 때마다 그 경계가 지켜지는지 보는 자리가 필요하다.
    await boot();
    expect(calls[0].opts.checklist).toBeUndefined();
  });
});
