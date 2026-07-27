// @vitest-environment jsdom
//
// world2 하늘 **집행** 테스트 — 판정이 아니라 통합 지점을 본다.
//
// ── 왜 이 파일이 따로 있는가 ─────────────────────────────────────────────────
// `world2-sky.test.ts`가 `decide/sky.ts`의 순수 함수를 검증한다. 그런데 이번 사고는
// 순수 함수가 틀려서 난 게 아니었다 — `cloudLayout`이 구름마다 `alpha`를 계산해 뒀는데
// **집행 쪽이 그 값을 한 번도 읽지 않았다.** 40장이 전부 최대 불투명으로 겹쳐 그려져
// 하늘이 얼룩졌고, 감독이 실기기에서 "노이즈가 많다"고 보고했다.
//
// 판정 함수만 테스트하면 이 결함은 영원히 안 잡힌다. `cloudTint`가 완벽하게 동작해도
// 아무도 호출하지 않으면 화면은 그대로 틀리다. 그래서 **실제 집행 코드를 돌려서**
// "판정 결과가 GPU로 가는가"를 확인한다.
//
// three는 스텁으로 대체한다. 여기서 검증하려는 건 three의 렌더링이 아니라 우리 코드가
// three에 **무엇을 건네는가**이므로, 건네받은 값을 기록하는 가짜가 오히려 정확한 도구다.

import { describe, it, expect, vi, beforeAll } from 'vitest';

/** 스텁이 만든 객체를 테스트에서 들여다볼 수 있게 모아둔다. */
const spy = vi.hoisted(() => ({
  instanced: [] as any[],
  meshes: [] as any[],
  materials: [] as any[],
  textures: [] as any[],
}));

vi.mock('three/webgpu', () => {
  class Vec3 {
    x = 0; y = 0; z = 0;
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
    normalize() {
      const l = Math.hypot(this.x, this.y, this.z) || 1;
      this.x /= l; this.y /= l; this.z /= l; return this;
    }
  }
  class Obj3D {
    children: any[] = [];
    parent: any = null;
    name = '';
    position = new Vec3();
    frustumCulled = true;
    renderOrder = 0;
    add(...cs: any[]) { for (const c of cs) { this.children.push(c); c.parent = this; } return this; }
    remove(...cs: any[]) {
      for (const c of cs) {
        const i = this.children.indexOf(c);
        if (i >= 0) this.children.splice(i, 1);
        if (c.parent === this) c.parent = null;
      }
      return this;
    }
  }
  class Geo { disposed = false; dispose() { this.disposed = true; } }
  class Tex {
    colorSpace: string | null = null;
    generateMipmaps = true;
    minFilter: unknown = null;
    magFilter: unknown = null;
    needsUpdate = false;
    disposed = false;
    constructor() { spy.textures.push(this); }
    dispose() { this.disposed = true; }
  }
  class Mat {
    disposed = false;
    map: any = null;
    constructor(p: Record<string, unknown> = {}) { Object.assign(this, p); spy.materials.push(this); }
    dispose() { this.disposed = true; }
  }
  class Color {
    hex = 0;
    constructor(h?: number) { this.hex = h ?? 0; }
    setHex(h: number) { this.hex = h; return this; }
    getHex() { return this.hex; }
  }
  class Mat4 {
    compose() { return this; }
    multiply() { return this; }
    makeRotationX() { return this; }
    makeRotationZ() { return this; }
  }
  class Mesh extends Obj3D {
    constructor(public geometry: any, public material: any) { super(); spy.meshes.push(this); }
  }
  class InstancedMesh extends Obj3D {
    /** setColorAt이 받은 색을 인덱스별로 기록 — 이 테스트의 관측 지점이다. */
    colors: (number | undefined)[] = [];
    matrixCount = 0;
    instanceColor: { needsUpdate: boolean } | null = null;
    instanceMatrix = { needsUpdate: false, setUsage() { /* no-op */ } };
    disposed = false;
    constructor(public geometry: any, public material: any, public count: number) {
      super();
      spy.instanced.push(this);
    }
    setColorAt(i: number, c: any) {
      this.colors[i] = c.getHex();
      if (!this.instanceColor) this.instanceColor = { needsUpdate: false };
    }
    setMatrixAt() { this.matrixCount++; }
    dispose() { this.disposed = true; }
  }

  return {
    Vector3: Vec3, Vector2: Vec3, Object3D: Obj3D, Group: Obj3D,
    Mesh, InstancedMesh, Color, Matrix4: Mat4,
    Quaternion: class { setFromAxisAngle() { return this; } },
    SphereGeometry: Geo, PlaneGeometry: Geo,
    MeshBasicMaterial: Mat, CanvasTexture: Tex,
    BackSide: 'BackSide', DoubleSide: 'DoubleSide', FrontSide: 'FrontSide',
    DynamicDrawUsage: 'DynamicDrawUsage',
    SRGBColorSpace: 'srgb', LinearFilter: 'LinearFilter',
  };
});

const { SkySystem, CLOUD_LAYOUT, CLOUD_BASE, CLOUD_RIM, HORIZON } =
  await import('../web/js/world2/systems/sky.js');
const { cloudLayout, cloudTint, DEFAULT_CLOUDS } =
  await import('../web/js/world2/decide/sky.js');

/**
 * jsdom은 캔버스 2D를 구현하지 않는다. `makeSkyTexture`/`makeCloudTexture`가 `ctx` null을
 * 방어하고 있어 죽지는 않지만, 그러면 **그리기 경로가 통째로 안 돌아** 회귀를 못 잡는다.
 * 최소 스텁을 붙여 실제 경로를 태우고, 무엇이 그려졌는지 셀 수 있게 한다.
 */
const paint = { linear: 0, radial: 0, stops: 0, fills: 0 };
beforeAll(() => {
  const grad = () => ({ addColorStop() { paint.stops++; } });
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).getContext = () => ({
    clearRect() { /* no-op */ },
    fillRect() { paint.fills++; },
    createLinearGradient() { paint.linear++; return grad(); },
    createRadialGradient() { paint.radial++; return grad(); },
    set fillStyle(_v: unknown) { /* 대입만 받는다 */ },
  });
});

const COUNT = 24;
const FIELD = 900;

function build() {
  spy.instanced.length = 0;
  spy.meshes.length = 0;
  spy.materials.length = 0;
  spy.textures.length = 0;
  paint.linear = paint.radial = paint.stops = paint.fills = 0;
  const parent: any = { add() { /* no-op */ }, remove() { /* no-op */ }, children: [] };
  const sys = new SkySystem(parent, () => ({ x: 0, z: 0 }), { cloudCount: COUNT, field: FIELD });
  return { sys, clouds: spy.instanced[0] };
}

/** SkySystem이 쓰는 것과 **같은 출처**로 배치를 재현한다(값을 다시 적지 않는다). */
const specsOf = () =>
  cloudLayout({ ...DEFAULT_CLOUDS, ...CLOUD_LAYOUT, count: COUNT, field: FIELD });

describe('SkySystem — 판정 결과가 실제로 GPU로 가는가', () => {
  it('구름 개수만큼 색을 넣는다', () => {
    const { clouds } = build();
    expect(clouds.colors.filter((c: unknown) => c !== undefined)).toHaveLength(COUNT);
  });

  it('넣은 색이 cloudTint 결과와 정확히 일치한다 — 집행이 판정을 그대로 쓴다', () => {
    const { clouds } = build();
    const want = specsOf().map((c) =>
      cloudTint(c, CLOUD_BASE, CLOUD_RIM, HORIZON, CLOUD_LAYOUT.minY, CLOUD_LAYOUT.maxY));
    expect(clouds.colors).toEqual(want);
  });

  // ★ 이 테스트가 이 파일의 존재 이유다.
  //
  // 옛 구현은 `base.lerp(rim, 0.35 + t*0.4)`로 색을 정했다 — 고도만 보고 alpha는 무시했다.
  // 그건 `cloudTint`에 alpha=1을 준 것과 정확히 같다. 그러므로 "alpha를 무시하고 있다"는
  // 것은 "색 배열이 alpha=1로 계산한 배열과 같다"는 것과 동치다.
  //
  // 누군가 이 호출을 옛 방식으로 되돌리면, 다른 어떤 테스트도 안 깨지고 이것만 깨진다.
  it('alpha를 무시한 색 배열과 다르다 — 무시하면 이 테스트만 깨진다', () => {
    const { clouds } = build();
    const ignoringAlpha = specsOf().map((c) =>
      cloudTint({ ...c, alpha: 1 }, CLOUD_BASE, CLOUD_RIM, HORIZON,
        CLOUD_LAYOUT.minY, CLOUD_LAYOUT.maxY));
    expect(clouds.colors).not.toEqual(ignoringAlpha);
  });

  it('구름 색이 전부 같지 않다 — 한 색으로 뭉치면 판이 겹쳐 얼룩진다', () => {
    const { clouds } = build();
    expect(new Set(clouds.colors).size).toBeGreaterThan(1);
  });

  it('instanceColor 갱신을 표시한다 — 안 하면 색이 GPU에 올라가지 않는다', () => {
    const { clouds } = build();
    expect(clouds.instanceColor?.needsUpdate).toBe(true);
  });
});

describe('SkySystem — 개수 불변식', () => {
  it('드로우 대상이 정확히 2개다 (돔 1 + 구름 InstancedMesh 1)', () => {
    build();
    expect(spy.meshes).toHaveLength(1);    // 스카이돔
    expect(spy.instanced).toHaveLength(1); // 구름
  });

  it('재질이 2개뿐이다 — 투명도별로 재질을 나누면 파이프라인이 늘어난다', () => {
    build();
    expect(spy.materials).toHaveLength(2);
  });

  it('update를 오래 돌려도 새 객체가 생기지 않는다', () => {
    const { sys } = build();
    const before = {
      meshes: spy.meshes.length, instanced: spy.instanced.length,
      materials: spy.materials.length, textures: spy.textures.length,
    };
    for (let i = 0; i < 600; i++) {
      sys.update({ dt: 1 / 60, hidden: false } as never);
    }
    expect({
      meshes: spy.meshes.length, instanced: spy.instanced.length,
      materials: spy.materials.length, textures: spy.textures.length,
    }).toEqual(before);
  });
});

describe('SkySystem — 텍스처 색공간', () => {
  // 색공간을 빠뜨리면 three가 캔버스를 선형으로 취급하고 출력에서 sRGB로 재인코딩한다.
  // 어두운 계조가 크게 벌어져 밴딩·디더가 증폭된다 — 감독이 본 노이즈의 원인이었다.
  // 눈으로는 "색이 좀 이상한데" 정도로만 보여서 놓치기 쉬우므로 여기서 못 박는다.
  it('모든 텍스처에 sRGB 색공간이 지정돼 있다', () => {
    build();
    expect(spy.textures.length).toBeGreaterThan(0);
    for (const t of spy.textures) expect(t.colorSpace).toBe('srgb');
  });

  it('밉맵을 만들지 않는다 — 항상 확대되는 용도라 체인이 쓰이지 않는다', () => {
    build();
    for (const t of spy.textures) expect(t.generateMipmaps).toBe(false);
  });

  it('하늘을 실제로 그린다 — 그라디언트 2개(몸통·헤이즈) + 태양 2개(헤일로·코어)', () => {
    build();
    // 세로 그라디언트 1 + 지평선 헤이즈 1 = 2, 태양 헤일로 1 + 코어 1 = 2.
    // 구름 텍스처도 방사 그라디언트를 여러 개 쓰므로 하한으로만 확인한다.
    expect(paint.linear).toBe(2);
    expect(paint.radial).toBeGreaterThanOrEqual(2);
    expect(paint.stops).toBeGreaterThan(0);
  });
});

describe('SkySystem — dispose', () => {
  it('지오메트리·재질·텍스처를 빠짐없이 반납한다', () => {
    const { sys } = build();
    sys.dispose();
    for (const m of spy.materials) expect(m.disposed).toBe(true);
    for (const t of spy.textures) expect(t.disposed).toBe(true);
    expect(spy.instanced[0].disposed).toBe(true);
  });
});
