// @vitest-environment jsdom
//
// `world-glb/main.ts` 의 **배선 집행** 테스트 — 그 파일을 실제로 돌린다.
//
// ── 왜 생겼나 (검수관 블로커 B1, 2026-09-17) ────────────────────────────────
// 월드11의 기본 백엔드를 WebGL 로 내리면서 `main.ts` 에 **한 줄**이 들어갔다:
//
//     adapter = await createRendererAdapter(canvas, { defaultWebGL: opts.defaultWebGL });
//
// 그 줄이 **이 기능의 효과가 화면에 도달하는 유일한 경로**다(부트 → `options` →
// `main.ts` → 어댑터 → `forceWebGLFrom`). 그런데 검수관이 그 줄을 옛 1-인자 형태로
// 되돌리는 뮤테이션을 돌렸더니 **관련 테스트 44개가 전부 통과했다(0 failed).**
//
// 양쪽 끝은 각각 잡혀 있었다 — 「부트가 `defaultWebGL: true` 를 담는다」(`world11-boot-run`)와
// 「어댑터가 그 인자로 판정한다」(`world-glb-diag-knobs`). **그 둘을 잇는 `main.ts` 자체가
// 사각이었다.** CLAUDE.md 가 *"판정/집행 분리의 구멍 — 경계를 건너는 지점은 아무도 안
// 본다"* 로 이름 붙인 형태 그대로이고, 같은 규율이 *"새 판정 값을 만들면 집행 쪽 통합
// 테스트를 함께 붙인다 — three 의존이면 스텁으로 대체해 **실제 코드를 돌린다**"* 를
// 요구하고 있었다. `defaultWebGL` 이 정확히 그 「새 판정 값」이다.
//
// ⚠ **왜 소스 문자열 검사로 하지 않았나.** `world-glb-diag-knobs.test.ts` 가 이미 그 형태로
// 어댑터 쪽 배선을 보는데, 그것은 「그 글자가 있는가」이지 「값이 도달하는가」가 아니다.
// 옛 형태를 되돌린 뮤테이션이 그 검사를 통과한 것이 증거다 — 그 검사는 **어댑터 파일만**
// 읽는다. 여기서는 함수를 **불러서** 어댑터가 받은 인자를 잡는다.
//
// ── 🔴 `main.js` 는 jsdom 에서 **돈다** (2026-09-17 실측 정정) ──────────────
// `tests/world11-boot-run.test.ts` 헤더가 *"`world-glb/main.js` 는 `three/webgpu` 를
// 끌어오므로 jsdom 에서 못 돈다"* 라고 적고 있었고 **그것은 사실이 아니다.** 이 파일이
// 그 반례다 — import 1.5초, `startGlbWorld` 호출까지 정상이다(`three/webgpu` 는 모듈
// 로드만으로는 GPU 를 안 건드리고, 실제 컨텍스트 생성은 어댑터 안에서 일어난다).
// **그 진술 위에서 「그러니 통째로 mock 한다」가 선택됐고, 그 선택이 B1 사각을 만들었다.**
// 저쪽 헤더도 함께 정정했다 — 게이트 설계의 근거가 되는 진술이 거짓이면 다음 사람이
// 같은 사각을 다시 판다.
//
// ── 무엇을 스텁하는가 ───────────────────────────────────────────────────────
// **`adapters/renderer.js` 하나뿐이다.** 그것이 실제 GPU 컨텍스트를 만드는 유일한 자리다.
// 스텁은 곧바로 reject 해서 부팅을 그 지점에서 끊는다 — 우리가 재는 것은 **어댑터가
// 무엇을 받았는가**이고, 그 뒤 파이프라인은 이 검사의 대상이 아니다. 스텁이 늘면 재는
// 것이 사라진다.

import { describe, it, expect, vi, beforeEach } from 'vitest';

/** 어댑터가 받은 인자. 모듈 레벨 mock 이 채운다 */
const calls: Array<{ canvas: unknown; opts: Record<string, unknown> | undefined }> = [];

vi.mock('../frontend/js/world-glb/adapters/renderer.js', () => ({
  createRendererAdapter: (canvas: unknown, opts?: Record<string, unknown>) => {
    calls.push({ canvas, opts });
    // 여기서 끊는다 — 부팅 파이프라인은 이 검사의 대상이 아니다.
    return Promise.reject(new Error('TEST_STOP_AFTER_ADAPTER'));
  },
}));

type BootOpts = {
  tag: string;
  source: () => Promise<ArrayBuffer>;
  defaultWebGL?: boolean;
};

const boot = async (opts: BootOpts): Promise<void> => {
  const { startGlbWorld } = await import('../frontend/js/world-glb/main.js');
  const canvas = document.createElement('canvas');
  await (startGlbWorld as unknown as (c: unknown, o: BootOpts) => Promise<unknown>)(canvas, opts)
    .catch(() => null);
};

const base = (extra: Partial<BootOpts> = {}): BootOpts => ({
  tag: 'wiring-test',
  source: async () => new ArrayBuffer(8),
  ...extra,
});

describe('`main.ts` 배선 — 부트가 넘긴 옵션이 어댑터까지 **실제로** 간다', () => {
  beforeEach(() => { calls.length = 0; });

  it('어댑터가 실제로 불린다 — 안 불리면 아래 검사가 전부 공허하다', async () => {
    await boot(base());
    expect(calls.length, '`createRendererAdapter` 가 한 번도 안 불렸다').toBe(1);
  });

  it('🔴 `defaultWebGL: true` 가 어댑터까지 도달한다 (월드11의 유일한 경로)', async () => {
    await boot(base({ defaultWebGL: true }));
    expect(calls[0]?.opts, '두 번째 인자가 없다 — `main.ts` 의 배선 줄이 사라졌다').toBeDefined();
    expect(calls[0]?.opts?.defaultWebGL).toBe(true);
  });

  it('안 넘기면 `undefined` 로 간다 — world7·world8 이 타는 경로', async () => {
    await boot(base());
    // 🔴 「기본값이 같다」가 아니라 **「값이 없다」** 여야 한다. 어댑터가 인자 생략을
    // 자기 기본값(`false`)으로 해석하는 것은 `decide/backend-knob.ts` 의 책임이고,
    // `main.ts` 는 부트가 안 준 것을 **지어내지 않아야** 한다.
    expect(calls[0]?.opts?.defaultWebGL).toBeUndefined();
  });

  it('`false` 를 명시하면 그것도 그대로 간다 — 값을 삼키지 않는다', async () => {
    await boot(base({ defaultWebGL: false }));
    // `?? true` 류로 뭉개면 여기서 잡힌다(falsy 를 잃는 흔한 형태다).
    expect(calls[0]?.opts?.defaultWebGL).toBe(false);
  });

  it('캔버스도 그대로 간다 — 인자 순서가 뒤집히면 잡힌다', async () => {
    await boot(base({ defaultWebGL: true }));
    expect(calls[0]?.canvas).toBeInstanceOf(HTMLCanvasElement);
  });
});
