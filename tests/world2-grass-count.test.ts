// @vitest-environment jsdom
// tests/world2-grass-count.test.ts — 잔디가 **개수를 늘리지 않는가.**
//
// ── 왜 생겼나 (팀장 조건 2, 2026-08-21) ─────────────────────────────────────
// 감독 지시로 스타일 룩이 기본 ON 이 되자 스모크의 `[7]` 개수 불변식이 「세션이 안
// 돌아다녔다」로 FAIL 했다. 원인은 잔디였다 — 이 환경은 4코어·GPU 0 이라 잔디가 켜지면
// 프레임 시간이 `kernel.ts` 의 `dt` 클램프(0.1초)를 넘고, **넘은 만큼이 버려져 게임 내
// 시간이 거의 안 흐른다.** 걸어도 제자리라 파셀을 못 건넌다.
//
// 그래서 팀장 판정으로 스모크 세션에서 잔디를 껐다(`WORLD2_QUERY` 의 `grass=0`).
// **그 대가로 못 재게 된 것이 「잔디가 개수에 기여하는가」이고, 이 파일이 그것을 대신
// 본다** — 이동이 필요 없으므로 프레임 시간과 무관하게 돈다.
//
// ⚠ **이 파일이 「잔디가 검증됐다」를 뜻하지 않는다.** 보는 것은 개수 축 하나다:
// 메시가 하나인가 · `update()` 를 돌려도 새로 안 만드는가 · 노브를 바꿔도 그 성질이
// 유지되는가. 화면(잎 모양·바람·색)은 감독 실기기가 유일한 판정 축이고 여기 없다.
//
// ⚠⚠ **재론 트리거**: 잔디가 `InstancedMesh` 하나가 아니게 되면(파셀별 생성 등 스트리밍과
// 결합) `grass=0` 의 근거였던 *"잔디는 스트리밍 증식 축과 독립"* 이 무효가 된다.
// 그때는 이 파일이 먼저 빨간불이 되어야 한다 — 그것이 이 검사의 두 번째 몫이다.
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';

type Env = Parameters<
  typeof import('../frontend/js/world2/features/grass.js')['grassFeature']['create']
>[0];

/** 잔디 메시를 구조로만 받는다(위 주석). 필요한 것은 개수 축에 쓰는 네 필드뿐이다. */
interface Instanced {
  isInstancedMesh?: boolean;
  geometry: unknown;
  material: unknown;
  count: number;
}

async function mountGrass(search = '?styl=1') {
  const before = location.search;
  window.history.replaceState({}, '', search);
  // 노브는 모듈 최상위·`create` 진입에서 읽으므로 캐시를 비워야 재평가된다.
  vi.resetModules();
  try {
    const mod = await import('../frontend/js/world2/features/grass.js');
    const scene = new THREE.Scene();
    const env = {
      scene,
      cell: 32,
      player: { position: new THREE.Vector3(0, 0, 0) },
      shading: () => 'material' as const,
      // WebGL 로 둔다 — 바람(TSL)은 WebGPU 전용이고 이 축은 개수라 무관하다.
      adapter: { backend: 'WebGL', backendDetail: 'WebGL (테스트)' },
      doc: undefined,
    };
    const inst = mod.grassFeature.create(env as unknown as Env);
    // ⚠ 타입을 **구조로** 받는다 — 이 저장소의 `three` 선언에는 `InstancedMesh` 가
    // 없다(런타임에는 있다). `world2-water-style.test.ts` 가 세운 것과 같은 패턴이다.
    const meshes = (): Instanced[] => {
      const out: Instanced[] = [];
      scene.traverse((o: unknown) => {
        if ((o as Instanced).isInstancedMesh) out.push(o as Instanced);
      });
      return out;
    };
    return { inst, scene, meshes };
  } finally {
    window.history.replaceState({}, '', before || location.pathname);
  }
}

afterEach(() => { vi.resetModules(); });

describe('잔디 개수 축 — 스모크가 `grass=0` 으로 못 보는 자리', () => {
  it('★★ 메시가 **하나**다 — 이것이 `grass=0` 을 정당화한 논증의 전제다', async () => {
    // `WORLD2_QUERY` 에서 잔디를 끈 근거는 *"잔디는 `InstancedMesh` 하나라 `[7]` 이 재는
    // 스트리밍 증식 축과 독립"* 이었다. 그 전제가 깨지면 근거도 깨진다.
    const { inst, meshes } = await mountGrass();
    expect(inst, '`?styl=1` 인데 잔디가 안 붙었다').not.toBeNull();
    expect(meshes().length, '잔디 메시가 하나가 아니다 — `grass=0` 의 근거가 무효다').toBe(1);
  });

  it('★★ `update()` 를 돌려도 새로 만들지 않는다 — 이동 없이 증식을 본다', async () => {
    const { inst, meshes } = await mountGrass();
    const before = meshes();
    const geo = before[0].geometry;
    const mat = before[0].material;
    const count = before[0].count;
    // 세션 시뮬의 「시간만 흐르는」 구간에 해당한다. 파셀을 건널 필요가 없다.
    for (let i = 0; i < 60; i++) inst?.system?.update?.({ dt: 1 / 60 } as never);
    const after = meshes();
    expect(after.length, 'update 중에 잔디 메시가 늘었다').toBe(1);
    expect(after[0].geometry, '지오메트리가 새로 만들어졌다').toBe(geo);
    expect(after[0].material, '재질이 새로 만들어졌다').toBe(mat);
    expect(after[0].count, '인스턴스 수가 변했다').toBe(count);
  });

  it('★ 밀도·반경 노브를 바꿔도 메시는 여전히 하나다', async () => {
    // 노브가 개수 구조를 바꾸면(예: 링마다 메시) 위 논증이 조용히 무효가 된다.
    for (const q of ['?styl=1&gden=2', '?styl=1&grad=2', '?styl=1&gden=0']) {
      const { meshes } = await mountGrass(q);
      expect(meshes().length, `${q} 에서 잔디 메시가 하나가 아니다`).toBe(1);
    }
  });

  it('`?grass=0` 은 완전한 no-op 이다 — 스모크가 그 항등원 위에 서 있다', async () => {
    // `WORLD2_QUERY` 가 이 항등원에 의존한다. 깨지면 스모크가 재는 세계가 달라진다.
    const { inst, meshes } = await mountGrass('?styl=1&grass=0');
    expect(inst, '`?grass=0` 인데 잔디가 붙었다').toBeNull();
    expect(meshes().length, '`?grass=0` 인데 씬에 메시가 생겼다').toBe(0);
  });
});
