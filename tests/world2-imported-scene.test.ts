// 되읽은 GLB 를 씬에 얹는 층 — **두 벌이 되지 않는가, 자원을 놓는가.**
//
// ── 왜 이 파일이 생겼나 (2026-08-25) ────────────────────────────────────────
// `export/imported-scene.ts` 가 들어올 때 검사가 **0건**이었다. 순수 함수
// (`foreign-glb.ts`)만 10건 있었고, 정작 «화면에 몇 벌이 서는가»·«GPU 자원을 놓는가» 는
// 아무도 안 봤다. 그 상태에서 코드를 읽어 결함 둘을 찾았다:
//
//   ① **재진입 두 벌.** `clear()` 가 `await` **앞**에 있어서, `apply` 를 연달아 부르면
//      A 가 로드 중인 사이 B 가 `clear()` 를 지나가고(그때 `root` 는 `null`) 뒤늦게 A 와
//      B 가 각각 `scene.add` 를 한다. `root` 는 B 만 가리키므로 **A 는 영영 안 걷힌다.**
//   ② **텍스처 누수.** `material.dispose()` 는 three 규약상 자기 맵을 안 놓는다.
//      블렌더 GLB 는 텍스처를 들고 오므로 반복 되읽기에서 그대로 샌다.
//
// 둘 다 **코드를 읽어서** 찾았고 검사가 없어서 조용했다. 고친 뒤 이 파일을 세운다 —
// 안 세우면 다음 사람이 `clear()` 를 도로 앞으로 옮겨도 아무 일이 안 일어난다.
//
// ── 왜 스텁으로 실제 코드를 돌리는가 ────────────────────────────────────────
// 이 층은 three 와 GLTFLoader 에 의존해 헤드리스에서 그대로는 못 돈다. 그렇다고 로직을
// 순수 함수로 또 빼면 «계산된 값이 실제로 소비되는가» 를 아무도 안 보게 된다(이 저장소의
// 「판정/집행 경계」 조항). 그래서 의존만 스텁하고 **실제 모듈을 실행**한다 —
// `tests/world2-sky-system.test.ts` 가 세운 전례다.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// `three` 본체가 모듈 최상위에서 `ProgressEvent` 를 만진다(브라우저 전역). node 환경에는
// 없어서 **import 만으로 터진다** — 스텁이 닿기 전에 나므로 여기서 먼저 채운다.
if (typeof (globalThis as Record<string, unknown>).ProgressEvent === 'undefined') {
  (globalThis as Record<string, unknown>).ProgressEvent = class {};
}

// ── three 스텁 ───────────────────────────────────────────────────────────────
// ⚠ `vi.mock` 의 factory 는 **hoist 된다** — 파일 위쪽에 선언한 클래스를 참조하면 아직
// 정의 전이라 실제 모듈이 로드된다(그 상태로 돌렸더니 `three.core.js` 가 터졌다).
// `vi.hoisted` 로 factory 와 같은 시점에 올려야 한다.
const H = vi.hoisted(() => {
  class FakeObject3D {
    name = '';
    children: FakeObject3D[] = [];
    geometry?: { disposed: boolean; dispose(): void } | undefined;
    material?: unknown;
    add(o: FakeObject3D) { this.children.push(o); }
    traverse(cb: (o: unknown) => void) { cb(this); for (const c of this.children) c.traverse(cb); }
  }
  /**
   * 로더가 낸 씬 그래프 흉내 — 지오·재질·텍스처를 달아 dispose 를 셀 수 있게 한다.
   *
   * `this` 대신 **클로저로 자기를 참조**한다. 객체 리터럴의 `this` 는 `vi.hoisted` 안에서
   * 컨텍스트 타입을 못 받아 `{}` 로 추론된다(typecheck 가 그것을 잡았다).
   */
  const flag = (extra: Record<string, unknown> = {}) => {
    const o = { disposed: false, dispose: () => { o.disposed = true; }, ...extra };
    return o;
  };
  const makeLoaded = () => {
    const n = new FakeObject3D();
    n.name = 'loaded';
    n.geometry = flag();
    // ⚠ `...flag()` 로 펼치면 **`dispose` 가 원본을 참조해** 이 객체의 `disposed` 를 못
    // 바꾼다(첫 판본이 그렇게 깨졌다). 자기 참조 클로저로 묶는다.
    const mat: Record<string, unknown> = {
      disposed: false,
      // 텍스처 슬롯. **이름을 검사에서 고정하지 않는다** — 제품 코드가 `isTexture` 로
      // 판정하므로 슬롯 이름이 무엇이든 놓여야 한다.
      map: flag({ isTexture: true }),
      normalMap: flag({ isTexture: true }),
      // 텍스처가 아닌 값이 섞여 있어도 안 터져야 한다
      color: { r: 1, g: 1, b: 1 },
      name: 'Material.001',
      dispose: () => { mat.disposed = true; },
    };
    n.material = mat;
    return n;
  };
  /** 로드 완료 시점을 검사가 쥔다 — 재진입을 재현하려면 그 타이밍이 필요하다 */
  const state = {
    pending: [] as { resolve(v: FakeObject3D): void; reject(e: Error): void }[],
    autoResolve: true,
  };
  return { FakeObject3D, makeLoaded, state };
});

const { makeLoaded } = H;
/** hoisted 클래스는 밖에서 값으로만 보인다 — 타입은 이렇게 꺼낸다 */
type Fake = InstanceType<typeof H.FakeObject3D>;

vi.mock('three/webgpu', () => ({ Group: H.FakeObject3D }));

vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    loadAsync(): Promise<{ scene: unknown }> {
      if (H.state.autoResolve) return Promise.resolve({ scene: H.makeLoaded() });
      return new Promise((resolve, reject) => {
        H.state.pending.push({ resolve: (v) => resolve({ scene: v }), reject });
      });
    }
  },
}));

const { createImportedScene } = await import('../frontend/js/world2/export/imported-scene.js');

/** 씬 스텁 — add/remove 를 세어 「몇 벌이 서 있는가」를 본다 */
function makeScene() {
  const children: Fake[] = [];
  return {
    children,
    add(o: Fake) { children.push(o); },
    remove(o: Fake) {
      const i = children.indexOf(o);
      if (i >= 0) children.splice(i, 1);
    },
  };
}

/** 합성 GLB — 남의 메시 하나가 들어 있어야 `apply` 가 로더까지 간다 */
function glbWithForeign(): ArrayBuffer {
  const gltf = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { name: 'root', children: [1, 2] },
      { mesh: 0 },                       // 우리 파츠 — 빠진다
      { mesh: 1, name: 'Cube' },         // 남의 것 — 남는다
    ],
    meshes: [
      { primitives: [{ attributes: { POSITION: 0 }, material: 0 }] },
      { primitives: [{ attributes: { POSITION: 0 }, material: 1 }] },
    ],
    materials: [{ name: 'building#1' }, { name: 'Material.001' }],
    accessors: [{ componentType: 5126, count: 3, type: 'VEC3' }],
  };
  const json = new TextEncoder().encode(JSON.stringify(gltf));
  const pad = (4 - (json.length % 4)) % 4;
  const total = 20 + json.length + pad;
  const out = new ArrayBuffer(total);
  const dv = new DataView(out);
  const u8 = new Uint8Array(out);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, json.length + pad, true);
  dv.setUint32(16, 0x4e4f534a, true);
  u8.set(json, 20);
  for (let i = 0; i < pad; i++) u8[20 + json.length + i] = 0x20;
  return out;
}

beforeEach(() => { H.state.pending = []; H.state.autoResolve = true; });

/** 마이크로태스크를 몇 번 흘린다 — `apply` 안의 `await` 들을 지나가게 */
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await Promise.resolve(); };

/**
 * 로더를 **미리 준비시킨다.** `ensureLoader` 는 동적 import 둘을 `Promise.all` 로 기다리므로
 * 마이크로태스크 몇 번으로는 못 지나간다. 한 번 정상 완료시켜 두면 이후 `apply` 는
 * `if (THREE && loadGLB) return` 으로 즉시 통과해 **타이밍을 검사가 쥘 수 있다.**
 */
async function primed(scene: ReturnType<typeof makeScene>) {
  const layer = createImportedScene(scene as never);
  await layer.apply(glbWithForeign());
  H.state.autoResolve = false;
  return layer;
}

describe('두 벌이 되지 않는다', () => {
  it('연속으로 되읽어도 씬에 그룹은 **하나**다', async () => {
    const scene = makeScene();
    const layer = createImportedScene(scene as never);
    await layer.apply(glbWithForeign());
    await layer.apply(glbWithForeign());
    await layer.apply(glbWithForeign());
    expect(scene.children.filter((c) => c.name === 'world2:imported-glb')).toHaveLength(1);
  });

  it('★ 로드가 **겹쳐도** 하나다 — 늦게 온 회차가 화면을 안 건드린다', async () => {
    // ⚠ 이것이 결함 ①의 재현이다. `clear()` 를 `await` 앞으로 되돌리면 여기가 깨진다.
    // 첫 회차가 아직 로드 중인 상태에서 둘째가 들어오는 것을 만든다.
    const scene = makeScene();
    const layer = await primed(scene);

    const first = layer.apply(glbWithForeign());
    await tick();
    const second = layer.apply(glbWithForeign());
    await tick();

    expect(H.state.pending.length, '두 로드가 동시에 떠 있어야 이 검사가 성립한다').toBe(2);
    // **첫째가 나중에** 끝나게 한다 — 늦게 도착한 응답이 화면을 덮는 시나리오.
    H.state.pending[1].resolve(makeLoaded());
    H.state.pending[0].resolve(makeLoaded());
    await Promise.all([first, second]);

    expect(scene.children.filter((c) => c.name === 'world2:imported-glb')).toHaveLength(1);
  });

  it('늦게 온 회차의 씬 그래프는 **버려진다** — 붙지도, 새지도 않는다', async () => {
    const scene = makeScene();
    const layer = await primed(scene);
    const first = layer.apply(glbWithForeign());
    await tick();
    const second = layer.apply(glbWithForeign());
    await tick();
    expect(H.state.pending.length, '표본이 비면 아래 단언이 공회전한다').toBe(2);

    const stale = makeLoaded();
    H.state.pending[1].resolve(makeLoaded());
    H.state.pending[0].resolve(stale);                 // 첫째 = 늦게 도착한 헌 것
    await Promise.all([first, second]);

    expect(stale.geometry!.disposed, '버린 것의 지오를 안 놓으면 그대로 샌다').toBe(true);
  });
});

describe('자원을 놓는다', () => {
  it('걷어낼 때 지오·재질·**텍스처**를 전부 놓는다', async () => {
    const scene = makeScene();
    const layer = createImportedScene(scene as never);
    await layer.apply(glbWithForeign());
    const loaded = scene.children[0].children[0];
    layer.clear();

    const mat = loaded.material as Record<string, { disposed?: boolean }>;
    expect(loaded.geometry!.disposed).toBe(true);
    expect(mat.disposed).toBe(true);
    // ⚠ 결함 ②의 재현: `material.dispose()` 만 부르면 아래 둘이 `false` 로 남는다.
    expect(mat.map.disposed, 'material.dispose() 는 맵을 안 놓는다').toBe(true);
    expect(mat.normalMap.disposed, '슬롯 이름을 나열하지 않고 isTexture 로 판정한다').toBe(true);
  });

  it('`dispose()` 뒤에 도착한 로드는 화면에 안 붙는다', async () => {
    const scene = makeScene();
    const layer = await primed(scene);
    const p = layer.apply(glbWithForeign());
    await tick();
    expect(H.state.pending.length, '표본이 비면 아래 단언이 공회전한다').toBe(1);

    layer.dispose();
    const late = makeLoaded();
    H.state.pending[0].resolve(late);
    await p;

    expect(scene.children, 'dispose 뒤에는 아무것도 안 남아야 한다').toHaveLength(0);
    expect(late.geometry!.disposed, '버린 것을 안 놓으면 샌다').toBe(true);
  });
});

describe('실패해도 화면을 망가뜨리지 않는다', () => {
  it('로드가 실패하면 **이전 것이 그대로 남는다**', async () => {
    const scene = makeScene();
    const layer = createImportedScene(scene as never);
    await layer.apply(glbWithForeign());           // 성공 — 1벌
    expect(scene.children).toHaveLength(1);
    const before = scene.children[0];

    H.state.autoResolve = false;
    const p = layer.apply(glbWithForeign());
    await tick();
    expect(H.state.pending.length, '표본이 비면 아래 단언이 공회전한다').toBe(1);
    H.state.pending[0].reject(new Error('망가진 GLB'));
    await expect(p).rejects.toThrow('망가진 GLB');

    // ⚠ `clear()` 가 `await` 앞에 있으면 여기가 0 이 된다 — 사용자는 멀쩡하던 화면이
    // 실패 한 번에 비는 것을 본다. 복원 수단이 없다.
    expect(scene.children).toHaveLength(1);
    expect(scene.children[0]).toBe(before);
  });

  it('남의 메시가 없는 파일을 고르면 **비운다** — 그것도 편집이다', async () => {
    const scene = makeScene();
    const layer = createImportedScene(scene as never);
    await layer.apply(glbWithForeign());
    expect(scene.children).toHaveLength(1);

    // 우리 파츠만 있는 GLB → `extractForeignGlb` 가 `null` 을 낸다
    const onlyOurs = (() => {
      const gltf = {
        asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
        materials: [{ name: 'building#1' }],
        accessors: [{ componentType: 5126, count: 3, type: 'VEC3' }],
      };
      const json = new TextEncoder().encode(JSON.stringify(gltf));
      const pad = (4 - (json.length % 4)) % 4;
      const total = 20 + json.length + pad;
      const out = new ArrayBuffer(total);
      const dv = new DataView(out); const u8 = new Uint8Array(out);
      dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
      dv.setUint32(12, json.length + pad, true); dv.setUint32(16, 0x4e4f534a, true);
      u8.set(json, 20);
      for (let i = 0; i < pad; i++) u8[20 + json.length + i] = 0x20;
      return out;
    })();

    expect(await layer.apply(onlyOurs)).toBe(0);
    expect(scene.children, '이전 파일의 물건이 남아 있으면 «파일이 곧 세계» 가 깨진다').toHaveLength(0);
  });
});
