// @vitest-environment jsdom
//
// 수면 기능 테스트.
//
// ── 왜 이 파일이 필요한가 ────────────────────────────────────────────────────
// 감독이 요구한 것은 *"복셀은 물이 살랑살랑 진짜 물 느낌이 나"* 였다. 그 처방은 **노멀맵
// 두 장을 서로 다른 방향으로 흘리는 것**이고, 흘리는 일은 `system.update`가 한다.
//
// 여기가 정확히 이 프로젝트가 반복해 뚫린 자리다 — **판정과 집행의 경계.** 텍스처를 굽는
// 코드도, 흐름 속도 상수도 각각은 멀쩡한데 `update`가 `offset`을 안 만지면 물은 그냥
// 멈춰 있다. 그리고 그 사실은 어느 단위 테스트에도 안 걸리고, 눈으로 봐야만 알 수 있다.
// (구름 `alpha` 미소비가 똑같은 형태였다 — 순수 함수 안에서만 참인 테스트를 걸어두고
// 통합 지점은 아무도 안 봤다.)
//
// ── 어떻게 three 없이 도는가 ────────────────────────────────────────────────
// `ocean.ts`는 `three/webgpu`를 직접 import 하므로(파츠의 `asset(T)` 주입과 다르다)
// 모듈째 스텁으로 갈아 끼운다. 그래도 **돌아가는 것은 실제 ocean 코드**다 — 실제로 씬에
// 무엇을 넣는지, update가 무엇을 만지는지 그대로 관찰한다.

import { describe, it, expect, vi, beforeAll } from 'vitest';

/** 텍스처 스텁 — 관찰 대상은 `offset`과 `repeat`뿐이다 */
class FakeTexture {
  offset = { x: 0, y: 0, set(x: number, y: number) { this.x = x; this.y = y; }, copy(o: { x: number; y: number }) { this.x = o.x; this.y = o.y; } };
  repeat = { x: 1, y: 1, set(x: number, y: number) { this.x = x; this.y = y; } };
  wrapS = 0;
  wrapT = 0;
  disposed = false;
  dispose() { this.disposed = true; }
}

class FakeGeometry {
  disposed = false;
  constructor(public w: number, public h: number) {}
  rotateX() { return this; }
  dispose() { this.disposed = true; }
}

class FakeMaterial {
  disposed = false;
  constructor(public opts: Record<string, unknown>) {}
  dispose() { this.disposed = true; }
}

class FakeMesh {
  position = { y: 0 };
  castShadow = false;
  receiveShadow = false;
  frustumCulled = true;
  renderOrder = 0;
  name = '';
  constructor(public geometry: unknown, public material: unknown) {}
}

vi.mock('three/webgpu', () => ({
  PlaneGeometry: FakeGeometry,
  MeshStandardMaterial: FakeMaterial,
  Mesh: FakeMesh,
  CanvasTexture: FakeTexture,
  RepeatWrapping: 1000,
  Vector2: class { constructor(public x: number, public y: number) {} },
}));

beforeAll(() => {
  // jsdom 은 네이티브 canvas 없이 `getContext('2d')`로 null 을 준다. 노멀맵을 굽는 코드가
  // 끝까지 도는 것만 보면 되므로 필요한 호출만 채운다.
  const ctx = {
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData() {},
  };
  (HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () => ctx;
});

const { oceanFeature, waveHeight } = await import('../frontend/js/world2/features/ocean.js');
const { SEA_Y, SEABED_Y } = await import('../frontend/js/world2/decide/water.js');

interface Added { name: string; position: { y: number }; material: FakeMaterial; renderOrder: number; frustumCulled: boolean; castShadow: boolean }

function mount() {
  const added: Added[] = [];
  const removed: Added[] = [];
  const env = {
    scene: { add: (m: Added) => added.push(m), remove: (m: Added) => removed.push(m) },
    player: { position: { x: 0, z: 0 } },
    doc: document,
    cell: 32,
  };
  // 실제 Feature 계약 전체를 만들지 않는다 — ocean 이 쓰는 것만 준다.
  const inst = oceanFeature.create(env as never)!;
  return { inst, added, removed };
}

describe('waveHeight — 타일이 이어진다', () => {
  it('u·v 가 1 늘어도 같은 값 — 격자 솔기가 생기지 않는다', () => {
    for (const t of [0, 0.13, 0.37, 0.62, 0.91]) {
      expect(waveHeight(0, t)).toBeCloseTo(waveHeight(1, t), 9);
      expect(waveHeight(t, 0)).toBeCloseTo(waveHeight(t, 1), 9);
    }
  });

  it('평평하지 않다 — 물결이 실제로 있다', () => {
    const vals = [];
    for (let i = 0; i < 40; i++) vals.push(waveHeight(i / 40, (i * 7 % 40) / 40));
    expect(Math.max(...vals) - Math.min(...vals)).toBeGreaterThan(0.5);
  });
});

describe('수면 조립 — 개수 불변식', () => {
  it('씬에 정확히 둘을 넣는다 — 드로우콜 +2', () => {
    const { added } = mount();
    expect(added.map((m) => m.name).sort()).toEqual(['ocean', 'seabed']);
  });

  it('해저가 수면보다 아래다 — 뒤집히면 물이 안 비친다', () => {
    const { added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    const bed = added.find((m) => m.name === 'seabed')!;
    expect(bed.position.y).toBe(SEABED_Y);
    expect(sea.position.y).toBe(SEA_Y);
    expect(bed.position.y).toBeLessThan(sea.position.y);
    // 수면이 나중에 그려져야 해저 위에 겹친다
    expect(sea.renderOrder).toBeGreaterThan(bed.renderOrder);
  });

  it('수면이 반투명이다 — 불투명하면 바닥이 안 비쳐 물로 안 읽힌다', () => {
    const { added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    expect(sea.material.opts.transparent).toBe(true);
    expect(sea.material.opts.opacity as number).toBeLessThan(1);
    expect(sea.material.opts.opacity as number).toBeGreaterThan(0.4);
  });

  it('그림자 패스를 만들지 않는다 — 드로우콜이 넷이 되면 안 된다', () => {
    const { added } = mount();
    for (const m of added) expect(m.castShadow).toBe(false);
  });

  it('프러스텀 컬링을 끈다 — 판이 커서 통째로 사라질 수 있다', () => {
    const { added } = mount();
    for (const m of added) expect(m.frustumCulled).toBe(false);
  });

  it('DOM 이 없으면 켜지 않는다 — 조립부가 물을 몰라도 된다', () => {
    expect(oceanFeature.create({ doc: null } as never)).toBeNull();
  });
});

// ── 여기가 이 파일의 핵심이다 ────────────────────────────────────────────────
describe('살랑임 — update 가 실제로 물결을 흘린다', () => {
  const flow = () => {
    const { inst, added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    const norm = sea.material.opts.normalMap as FakeTexture;
    const rough = sea.material.opts.roughnessMap as FakeTexture;
    const map = sea.material.opts.map as FakeTexture;
    return { inst, norm, rough, map };
  };

  it('시간이 지나면 노멀맵 offset 이 움직인다 — 안 움직이면 물이 멈춰 있다', () => {
    const { inst, norm } = flow();
    const before = { ...norm.offset };
    inst.system!.update({ dt: 1 } as never);
    expect(norm.offset.x !== before.x || norm.offset.y !== before.y).toBe(true);
  });

  it('두 층이 서로 다른 방향으로 흐른다 — 같으면 흐르는 벽지가 된다', () => {
    const { inst, norm, rough } = flow();
    inst.system!.update({ dt: 4 } as never);
    // 방향 벡터가 평행하지 않아야 한다(외적 ≠ 0)
    const cross = norm.offset.x * rough.offset.y - norm.offset.y * rough.offset.x;
    expect(Math.abs(cross)).toBeGreaterThan(1e-9);
  });

  it('밝기 무늬가 노멀맵 층과 함께 간다 — 따로 놀면 무늬와 빛이 어긋난다', () => {
    const { inst, norm, map } = flow();
    inst.system!.update({ dt: 3 } as never);
    expect(map.offset.x).toBeCloseTo(norm.offset.x, 12);
    expect(map.offset.y).toBeCloseTo(norm.offset.y, 12);
  });

  // 진단은 **검증을 위해 만든 값**이라 스스로도 검증돼야 한다. 헤드리스 스모크가 물결을
  // 두 번 연속 "측정 불가"로 남겨서 이 필드를 신설했는데, 그게 텍스처가 아니라 내부
  // 시간값을 되돌려주면 "계산은 도는데 텍스처엔 안 꽂힌 상태"를 통과시킨다 — 그러면
  // 측정 지점을 만든 의미가 정확히 반대로 뒤집힌다.
  it('진단이 텍스처의 실제 offset 을 내보낸다 — 계산값을 되돌려주면 못 잡는다', () => {
    const { inst, norm, rough } = flow();
    inst.system!.update({ dt: 2 } as never);
    const d = inst.diagnostics!() as { flowA: number[]; flowB: number[] };
    expect(d.flowA).toEqual([norm.offset.x, norm.offset.y]);
    expect(d.flowB).toEqual([rough.offset.x, rough.offset.y]);
    // 멈춘 물과 구별돼야 관측에 쓸모가 있다
    expect(Math.abs(d.flowA[0]) + Math.abs(d.flowA[1])).toBeGreaterThan(0);

    // ── 검출력은 여기서 나온다 ──────────────────────────────────────────────
    // 위의 일치 검사만으로는 아무것도 증명되지 않는다. 정상 상태에서는 텍스처 offset 과
    // 내부 계산값이 **정확히 같은 수**라, 진단이 어느 쪽을 읽든 통과한다(실제로 진단을
    // 계산값 반환으로 바꿔봤더니 14건 전부 통과했다 — 동어반복이었다).
    //
    // 그래서 둘을 갈라놓는다. 텍스처만 밖에서 되돌리면, 텍스처를 읽는 진단은 멈춤을
    // 보고하고 계산값을 읽는 진단은 여전히 흐른다고 거짓말한다.
    norm.offset.set(0, 0);
    rough.offset.set(0, 0);
    const stopped = inst.diagnostics!() as { flowA: number[]; flowB: number[] };
    expect(stopped.flowA).toEqual([0, 0]);
    expect(stopped.flowB).toEqual([0, 0]);
  });

  it('흐름이 시간에 비례한다 — dt 를 무시하면 프레임레이트마다 속도가 달라진다', () => {
    const a = flow();
    a.inst.system!.update({ dt: 1 } as never);
    const one = { ...a.norm.offset };
    const b = flow();
    b.inst.system!.update({ dt: 0.5 } as never);
    b.inst.system!.update({ dt: 0.5 } as never);
    expect(b.norm.offset.x).toBeCloseTo(one.x, 12);
    expect(b.norm.offset.y).toBeCloseTo(one.y, 12);
  });
});

describe('정리', () => {
  it('dispose 가 씬에서 빼고 자원을 전부 반납한다', () => {
    const { inst, added, removed } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    inst.dispose!();
    expect(removed).toHaveLength(2);
    expect((sea.material as FakeMaterial).disposed).toBe(true);
    for (const k of ['map', 'normalMap', 'roughnessMap'] as const) {
      expect((sea.material.opts[k] as FakeTexture).disposed).toBe(true);
    }
  });
});
