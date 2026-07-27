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
    // 옛 구현이 정확히 `tmp.copy(base).lerp(rim, k)` 패턴이었다. 이 두 메서드가 없으면
    // 그 패턴을 되살렸을 때 TypeError로 죽는다 — 회귀는 잡히지만 "무엇이 틀렸는지"가
    // 안 보인다. 실제 three와 같은 선형 혼합으로 구현해 단언 diff가 나오게 한다.
    copy(o: Color) { this.hex = o.getHex(); return this; }
    lerp(o: Color, k: number) {
      const t = Math.min(1, Math.max(0, k));
      const a = this.hex, b = o.getHex();
      const mix = (sh: number) => {
        const av = (a >> sh) & 255, bv = (b >> sh) & 255;
        return Math.round(av + (bv - av) * t);
      };
      this.hex = (mix(16) << 16) | (mix(8) << 8) | mix(0);
      return this;
    }
  }
  /**
   * **실제 행렬 수학을 구현한다.** no-op 스텁이면 안 된다.
   *
   * 처음에는 `compose`/`multiply`가 `return this`만 하는 껍데기였다. 그 결과 구름 판의
   * 스케일 축이 뒤바뀐 실제 버그(가로 w × 세로 0.5 유닛 → 화면에서 실선)를 테스트가
   * 통과시켰고, 감독 실기기에서야 드러났다. **검증하지 않는 스텁은 검증했다는 착각만
   * 준다** — 그 축은 비어 있는 게 아니라 거짓으로 채워진다.
   *
   * three와 같은 열 우선(column-major) 16원소 배열을 쓴다.
   */
  class Mat4 {
    elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    set(e: number[]) { this.elements = e.slice(); return this; }
    identity() { return this.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
    /** this = this · m (three의 multiply와 동일 — 오른쪽 곱) */
    multiply(m: Mat4) {
      const a = this.elements, b = m.elements, out = new Array(16).fill(0);
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
          let s = 0;
          for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
          out[c * 4 + r] = s;
        }
      }
      this.elements = out;
      return this;
    }
    /** 위치·쿼터니언·스케일 → T·R·S */
    compose(p: { x: number; y: number; z: number }, q: Quat, s: { x: number; y: number; z: number }) {
      const { x, y, z, w } = q;
      const x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2;
      const yy = y * y2, yz = y * z2, zz = z * z2;
      const wx = w * x2, wy = w * y2, wz = w * z2;
      this.elements = [
        (1 - (yy + zz)) * s.x, (xy + wz) * s.x, (xz - wy) * s.x, 0,
        (xy - wz) * s.y, (1 - (xx + zz)) * s.y, (yz + wx) * s.y, 0,
        (xz + wy) * s.z, (yz - wx) * s.z, (1 - (xx + yy)) * s.z, 0,
        p.x, p.y, p.z, 1,
      ];
      return this;
    }
    makeRotationX(t: number) {
      const c = Math.cos(t), s = Math.sin(t);
      return this.set([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
    }
    makeRotationZ(t: number) {
      const c = Math.cos(t), s = Math.sin(t);
      return this.set([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    }
    clone() { return new Mat4().set(this.elements); }
  }

  class Quat {
    x = 0; y = 0; z = 0; w = 1;
    setFromAxisAngle(axis: { x: number; y: number; z: number }, angle: number) {
      const h = angle / 2, s = Math.sin(h);
      this.x = axis.x * s; this.y = axis.y * s; this.z = axis.z * s; this.w = Math.cos(h);
      return this;
    }
    /** this = this * q (three와 동일한 해밀턴 곱) */
    multiply(q: Quat) {
      const { x: ax, y: ay, z: az, w: aw } = this;
      const { x: bx, y: by, z: bz, w: bw } = q;
      this.x = ax * bw + aw * bx + ay * bz - az * by;
      this.y = ay * bw + aw * by + az * bx - ax * bz;
      this.z = az * bw + aw * bz + ax * by - ay * bx;
      this.w = aw * bw - ax * bx - ay * by - az * bz;
      return this;
    }
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
    matrices: number[][] = [];
    setMatrixAt(i: number, m: { elements: number[] }) {
      this.matrixCount++;
      this.matrices[i] = m.elements.slice();
    }
    dispose() { this.disposed = true; }
  }

  return {
    Vector3: Vec3, Vector2: Vec3, Object3D: Obj3D, Group: Obj3D,
    Mesh, InstancedMesh, Color, Matrix4: Mat4,
    Quaternion: Quat,
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

// ── 구름 판의 실제 크기 ──────────────────────────────────────────────────────
// 이 블록이 없어서 실제 버그가 통과했다.
//
// `compose`가 T·R·S를 만들고 뒤에 `multiply(_flat)`을 붙이면 최종은 T·R·S·Flat이고,
// 오른쪽 곱이라 정점에는 **Flat이 먼저** 적용된다. PlaneGeometry는 XY 평면인데 Flat이
// 이를 XZ로 눕히므로 판의 두 번째 축은 z다. 그런데 스케일을 `(w, h, 1)`로 주고 있어서
// z가 1배로 남았고, 구름이 **가로 w × 세로 0.5 유닛**이 됐다. 화면에서는 실선이었다.
//
// 눈으로는 안 보인다. 행렬을 실제로 곱해서 판의 두 축 길이를 재야 보인다.
describe('구름 판의 실제 크기 — 행렬을 곱해서 잰다', () => {
  /** 최종 행렬에서 로컬 축 e(단위벡터)가 월드에서 갖는 길이. */
  const axisLen = (m: number[], col: 0 | 1 | 2) =>
    Math.hypot(m[col * 4], m[col * 4 + 1], m[col * 4 + 2]);

  it('가로축이 w, 세로축이 h다 — 축이 뒤바뀌면 판이 선이 된다', () => {
    const { sys, clouds } = build();
    sys.update({ dt: 1 / 60, hidden: false } as never);
    const specs = specsOf();
    for (let i = 0; i < specs.length; i++) {
      const m = clouds.matrices[i];
      // PlaneGeometry는 로컬 x·y에만 정점이 있다(z는 두께 축, 정점 없음). 따라서 판의
      // 실제 크기를 정하는 것은 col0·col1 두 개뿐이고, col2가 무엇이든 화면과 무관하다.
      //
      // 세 축을 모아 정렬해 비교하면 안 된다 — (w,h,1)과 (w,1,h)는 **집합이 같아서**
      // 뒤바뀐 것을 통과시킨다. 실제로 그렇게 썼다가 뮤테이션에서 걸렸다.
      expect(axisLen(m, 0)).toBeCloseTo(specs[i].w, 2); // 로컬 x = 판의 가로
      expect(axisLen(m, 1)).toBeCloseTo(specs[i].h, 2); // 로컬 y = 판의 세로
    }
  });

  it('가로:세로 비가 설계 범위 안이다 — 어느 구름도 선이 아니다', () => {
    const { sys, clouds } = build();
    sys.update({ dt: 1 / 60, hidden: false } as never);
    for (const m of clouds.matrices as number[][]) {
      const w = axisLen(m, 0), h = axisLen(m, 1);
      // h = w × (0.42~0.64)이므로 비는 최대 약 2.4:1이다. 이보다 크면 판이 눌린 것이다.
      expect(w / h).toBeLessThan(3);
      expect(h / w).toBeLessThan(3);
    }
  });

  it('구름마다 크기가 다르다 — 한 크기로 굳으면 배치가 기계적으로 보인다', () => {
    const { sys, clouds } = build();
    sys.update({ dt: 1 / 60, hidden: false } as never);
    const widths = new Set(clouds.matrices.map((m: number[]) => Math.round(axisLen(m, 0))));
    expect(widths.size).toBeGreaterThan(1);
  });
});
