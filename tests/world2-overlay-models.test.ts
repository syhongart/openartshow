// @vitest-environment node
//
// GLB **원본 캐시**의 동작 테스트 (2026-08-22).
//
// ── 이 파일은 검수관 게이트 명세 G3 이 만들게 했다 ─────────────────────────
// 검수관 실측(반려 회차): `features/overlay.ts` 의 `place()` 가 캐시를 **우회하도록**
// 바꾸면 — 확장 끄기·그림자·중복 로드 방지·실패 기록이 **전부** 사라지는데 —
// **전체 4,379건 중 0건이 검출**됐다. 그리고 대조군(분리 전 `4f55f871`)도 0건이었으므로
// 이번 분리가 만든 회귀가 아니라 **원래부터 있던 사각**이다.
//
// 그 사각이 닫히지 않았던 이유는 그 코드가 `features/overlay.ts` 안에 있었고 그 파일이
// three 를 import 해 **노드가 실행할 수 없었기** 때문이다. 소스 텍스트를 읽는 검사만
// 가능했고, 텍스트는 *"이 문자열이 있는가"* 까지만 본다.
//
// **분리가 그 문을 열었다** — `createModelCache` 는 로더를 **주입받으므로** 가짜 로더로
// 실제 코드를 그대로 돌릴 수 있다. 검수관이 *"분리가 오히려 이 문을 열었다"* 라고 적은
// 것이 이 자리다.
//
// ── 여기서 못 재는 것 ───────────────────────────────────────────────────────
// · `disableMatExtensions` 가 **WebGPU 에서 실제로 효과가 있는가** — 헤드리스는 WebGL 이라
//   원리적으로 못 본다(기존 한계 그대로, 이 파일이 좁히지 못한다).
// · `place()` 가 이 캐시를 **부르는가** — 그것은 배선이고 아래 마지막 describe 가
//   소스 텍스트로 본다(그 축의 한계도 거기 적었다).

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createModelCache } from '../frontend/js/world2/features/overlay-models.js';
import { newDiag, FAILED_KEEP } from '../frontend/js/world2/decide/overlay-diag.js';
import type { Object3D } from 'three/webgpu';

/** 씬 그래프 흉내. `traverse` 와 `material` 만 있으면 이 경로가 그대로 돈다 */
function fakeModel(): Object3D {
  const child = {
    // ⚠ `isMesh` 가 있어야 `disableMatExtensions` 가 이 노드를 본다(그 함수의 첫 가드).
    // 없으면 이 검사가 **빈 검사**가 된다 — 처음에 빠뜨려 실제로 빨간불이 났다.
    isMesh: true,
    castShadow: false,
    receiveShadow: false,
    material: { sheen: 1, clearcoat: 1, anisotropy: 1, ior: 1.5, emissiveIntensity: 9 },
  };
  const root = {
    castShadow: false,
    receiveShadow: false,
    traverse(f: (o: unknown) => void) { f(root); f(child); },
  };
  return root as unknown as Object3D;
}

describe('🔴 G3 · 캐시가 같은 파일을 두 번 안 받는다', () => {
  it('같은 key 를 두 번 물으면 로더는 **한 번만** 불린다', async () => {
    const load = vi.fn(async () => fakeModel());
    const c = createModelCache(newDiag(false), load);
    await Promise.all([c.get('a', '/a.glb'), c.get('a', '/a.glb')]);
    await c.get('a', '/a.glb');
    expect(load, '★ 같은 자산이 여러 벌 파싱된다 — 12.9MB 짜리에서 탭이 죽은 그 경로다')
      .toHaveBeenCalledTimes(1);
  });

  it('🔴 **끝나기 전에** 다시 물어도 한 번이다 — 완료본만 담으면 이 축이 죽는다', async () => {
    let release!: (m: Object3D) => void;
    const load = vi.fn(() => new Promise<Object3D>((res) => { release = res; }));
    const c = createModelCache(newDiag(false), load);
    const p1 = c.get('a', '/a.glb');
    const p2 = c.get('a', '/a.glb');   // 아직 진행 중
    expect(load).toHaveBeenCalledTimes(1);
    release(fakeModel());
    expect(await p1).toBe(await p2);
  });

  it('다른 key 는 따로 받는다', async () => {
    const load = vi.fn(async () => fakeModel());
    const c = createModelCache(newDiag(false), load);
    await c.get('a', '/a.glb');
    await c.get('b', '/b.glb');
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('🔴 G3 · 캐시가 모델을 손봐서 낸다', () => {
  it('🔴 그림자를 켠다 — GLB 기본값이 false 라 안 켜면 감독이 놓은 것만 그림자가 없다', async () => {
    const c = createModelCache(newDiag(false), async () => fakeModel());
    const m = (await c.get('a', '/a.glb'))!;
    const seen: { castShadow: boolean; receiveShadow: boolean }[] = [];
    (m as unknown as { traverse(f: (o: never) => void): void })
      .traverse(((o: { castShadow: boolean; receiveShadow: boolean }) => { seen.push(o); }) as never);
    expect(seen.length).toBeGreaterThan(0);
    for (const o of seen) {
      expect(o.castShadow, '★ 그림자를 안 켰다').toBe(true);
      expect(o.receiveShadow).toBe(true);
    }
  });

  it('🔴 재질 확장을 끈다 — 안 끄면 실기기(WebGPU)에서 렌더가 통째로 죽는다', async () => {
    const c = createModelCache(newDiag(false), async () => fakeModel());
    const m = (await c.get('a', '/a.glb'))!;
    let mat: Record<string, number> | null = null;
    (m as unknown as { traverse(f: (o: never) => void): void })
      .traverse(((o: { material?: Record<string, number> }) => { if (o.material) mat = o.material; }) as never);
    expect(mat, '★ 재질을 못 찾았다 — 이 검사가 빈 검사다').not.toBeNull();
    // 값 자체는 `world-shared/glb-material.ts` 가 소유한다. 여기서는 **손댔는가**만 본다 —
    // 그 값을 여기 다시 적으면 값 미러링이다.
    expect(mat!.sheen, '★ `sheen` 이 그대로다 — 확장 끄기를 안 거쳤다').toBe(0);
    expect(mat!.clearcoat).toBe(0);
  });
});

describe('🔴 G3 · 실패를 캐시하지 않는다', () => {
  it('실패한 key 는 남지 않는다 — 남기면 그 자산이 세션 내내 못 살아난다', async () => {
    let fail = true;
    const load = vi.fn(async () => {
      if (fail) throw new Error('boom');
      return fakeModel();
    });
    const c = createModelCache(newDiag(false), load);
    expect(await c.get('a', '/a.glb')).toBeNull();
    expect(c.lastFailure(), '★ 사유를 안 남겼다 — 화면이 막다른 길을 안내하게 된다')
      .toMatch(/boom/);
    fail = false;
    expect(await c.get('a', '/a.glb'), '★ 일시적 실패가 영구 실패가 됐다').not.toBeNull();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('🔴 실패 기록이 `recordFailure` 를 지난다 — 직접 push 면 상한이 안 걸린다', async () => {
    const diag = newDiag(true);
    const c = createModelCache(diag, async () => { throw new Error('boom'); });
    for (let i = 0; i < FAILED_KEEP + 20; i += 1) await c.get(`k${i}`, `/k${i}.glb`);
    expect(diag.failed.length, '★ 실패 배열이 무한히 자란다 — 화면에 안 보이는 누수다')
      .toBe(FAILED_KEEP);
    expect(diag.failedTotal, '★ 총계를 안 센다 — 4번과 400번이 같은 값이 된다')
      .toBe(FAILED_KEEP + 20);
  });

  it('`clearFailure()` 가 사유를 지운다 — 옛 실패가 새 결과에 안 붙는다', async () => {
    const c = createModelCache(newDiag(false), async () => { throw new Error('boom'); });
    await c.get('a', '/a.glb');
    expect(c.lastFailure()).not.toBeNull();
    c.clearFailure();
    expect(c.lastFailure()).toBeNull();
  });

  it('`clear()` 가 캐시를 비운다 — 세션이 끝나면 씬 그래프를 놓아 준다', async () => {
    const load = vi.fn(async () => fakeModel());
    const c = createModelCache(newDiag(false), load);
    await c.get('a', '/a.glb');
    c.clear();
    await c.get('a', '/a.glb');
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('🔴 G3 · 진행 표시', () => {
  it('총 용량을 모르면 퍼센트를 **지어내지 않는다** — 100%에서 멈춘 바는 없느니만 못하다', async () => {
    const seen: (number | null)[] = [];
    const c = createModelCache(newDiag(false), async (_u, onProgress) => {
      onProgress?.({ lengthComputable: false, loaded: 512, total: 0 } as ProgressEvent);
      onProgress?.({ lengthComputable: true, loaded: 512, total: 1024 } as ProgressEvent);
      return fakeModel();
    });
    await c.get('a', '/a.glb', (pct) => { seen.push(pct); });
    expect(seen[0], '★ 총 용량을 모르는데 퍼센트를 지어냈다').toBeNull();
    expect(seen[1]).toBeCloseTo(50, 6);
  });
});

// ── 배선 (여기서는 행위로 못 재는 것) ────────────────────────────────────────
// 위 검사들은 캐시를 **직접** 부른다. 제품에서 그 캐시가 실제로 쓰이는가는
// `features/overlay.ts` 의 `place()` 가 부르는지에 달려 있고, 그 파일은 three 를 import 해
// 노드가 실행할 수 없다. **그래서 텍스트로 못 박고, 그 한계를 안다** — 검수관이 실측한
// 「캐시 우회 뮤테이션 0건 검출」이 정확히 이 축의 사각이었다.
describe('🔴 G3 · `place()` 가 캐시를 지난다', () => {
  const src = readFileSync('frontend/js/world2/features/overlay.ts', 'utf8');
  const place = src.slice(src.indexOf('async function place('), src.indexOf('function remove('));

  it('로더를 직접 부르지 않고 캐시를 지난다 — 우회하면 확장 끄기·그림자·중복방지가 함께 사라진다', () => {
    expect(place, '★ `place()` 가 캐시를 안 지난다').toContain('await cache?.get(');
    expect(place, '★ `place()` 가 로더를 직접 부른다 — 캐시 우회다').not.toMatch(/loadGLB\s*!?\s*\(/);
  });

  it('🔴 캐시를 한 번만 만든다 — 재진입하면 빈 것으로 덮여 중복 로드 방지가 무효가 된다', () => {
    // 검수관 권고 P1. `if (THREE && loadGLB)` 가드는 첫 `import()` 를 동시에 기다리는
    // 두 호출을 못 막는다.
    const ensure = src.slice(src.indexOf('async function ensureLoader('), src.indexOf('async function place('));
    expect(ensure, '★ 캐시 생성에 `if (!cache)` 가드가 없다').toContain('if (!cache) cache = createModelCache(');
  });
});
