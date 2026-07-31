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
  // 실제 `CanvasTexture` 처럼 원본 캔버스를 들고 있는다. 윤슬 검사가 이 캔버스에 남은
  // G채널 표본(`_g`)을 읽어 **점이 실제로 구워졌는지**를 본다 — 들고 있지 않으면
  // `engraveSparkle` 호출 누락을 밖에서 확인할 방법이 없다.
  constructor(public image?: unknown) {}
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
  needsUpdate = false;
  // three 의 재질은 생성자 opts 를 **인스턴스 프로퍼티로 펼친다**. 스텁이 `opts` 만
  // 들고 있으면 `mat.normalScale.set(...)` 같은 실제 사용 경로가 undefined 로 터진다
  // — 코드가 아니라 스텁이 계약을 덜 재현한 것이다(감독 지시 "반짝임" 작업에서 실측).
  [k: string]: unknown;
  constructor(public opts: Record<string, unknown>) {
    Object.assign(this, opts);
  }
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

/** 버퍼 속성 스텁 — 강 판의 정점을 실제로 들여다보려고 배열을 그대로 보관한다 */
class FakeAttr {
  constructor(public array: number[], public itemSize: number) {}
}

/**
 * 강 판 지오메트리 스텁.
 *
 * 강 판이 **어디까지 뻗어 있는지**를 정점 배열로 직접 재려고 만들었다. `index.count` 만
 * 세면 "쿼드가 몇 개인가" 는 알 수 있지만 "그것이 세계 전체를 덮는 큰 판 하나인가" 는
 * 구별되지 않는다 — 겹침 블로커가 바로 그 형태였으므로 좌표를 봐야 한다.
 */
class FakeBufferGeometry {
  attrs: Record<string, FakeAttr> = {};
  index: { count: number; array: number[] } | null = null;
  disposed = false;
  setAttribute(name: string, a: FakeAttr) { this.attrs[name] = a; }
  // three 의 BufferGeometry 계약. 물살(감독 지시 2026-07-31)이 매 프레임 UV 속성을
  // 잡아 쓰므로 스텁도 이것을 줘야 한다 — 없으면 프로덕션 코드가 아니라 스텁이 터진다.
  getAttribute(name: string) { return this.attrs[name]; }
  setIndex(a: number[]) { this.index = { count: a.length, array: a }; }
  dispose() { this.disposed = true; }
}

vi.mock('three/webgpu', () => ({
  PlaneGeometry: FakeGeometry,
  MeshStandardMaterial: FakeMaterial,
  Mesh: FakeMesh,
  CanvasTexture: FakeTexture,
  BufferGeometry: FakeBufferGeometry,
  Float32BufferAttribute: FakeAttr,
  RepeatWrapping: 1000,
  // `set()` 이 있어야 한다 — three 의 Vector2 계약이고, `ocean.ts` 의 `applyGloss` 가
  // 이것을 부른다. 스텁이 계약을 덜 재현하면 **프로덕션 코드가 멀쩡한데 테스트만 깨진다**.
  Vector2: class {
    constructor(public x: number, public y: number) {}
    set(x: number, y: number) { this.x = x; this.y = y; return this; }
  },
}));

beforeAll(() => {
  // jsdom 은 네이티브 canvas 없이 `getContext('2d')`로 null 을 준다. 노멀맵을 굽는 코드가
  // 끝까지 도는 것만 보면 되므로 필요한 호출만 채운다.
  // 윤슬 검사를 위해 `putImageData` 가 **G채널을 캔버스에 남긴다.** 빈 함수로 두면
  // "무엇이 실제로 구워졌는가" 를 밖에서 볼 길이 없고, `engraveSparkle` 호출 누락이
  // 테스트를 통과한다 — 판정과 집행 사이의 그 구멍이 이 프로젝트의 상시 위험이다.
  const mkCtx = (canvas: { _g?: number[] }) => ({
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData(img: { data: Uint8ClampedArray }) {
      const g: number[] = [];
      for (let i = 1; i < img.data.length; i += 4) g.push(img.data[i]);
      canvas._g = g;
    },
  });
  (HTMLCanvasElement.prototype as unknown as { getContext: (t: string) => unknown }).getContext =
    function (this: { _g?: number[] }) { return mkCtx(this); };
});

const { oceanFeature, waveHeight } = await import('../frontend/js/world2/features/ocean.js');
const { RIVER_Y, SEA_Y, SEABED_Y, WATER_DEPTH, worldHalfExtent, waterGloss } = await import('../frontend/js/world2/decide/water.js');
const { DEFAULT_LAYOUT } = await import('../frontend/js/world2/parts/types.js');
/** 세계 절반 크기. `ocean.ts` 와 **같은 유도**를 쓴다 — 값을 적어두면 그것이 미러링이다 */
const EDGE = worldHalfExtent(DEFAULT_LAYOUT.cellX);

interface Added {
  name: string;
  position: { y: number };
  material: FakeMaterial;
  renderOrder: number;
  frustumCulled: boolean;
  castShadow: boolean;
  /** 강 판이 바다와 지오를 공유하지 않는지, 어디까지 뻗었는지를 여기서 본다 */
  geometry: unknown;
}

type Tod = 'day' | 'sunset' | 'night';

/**
 * @param initial 부팅 시각대. 광택(`waterGloss`)이 이것을 읽는다.
 *
 * 반환하는 `setTime` 으로 **세션 중 시간대 전환**을 만들 수 있다. `ocean.ts` 는
 * `update` 안에서 `env.time()` 을 다시 읽어 바뀌었을 때만 광택을 다시 거는데,
 * 시간을 고정해 두면 그 분기가 통째로 미검증으로 남는다(검수관 블로커 2026-07-31).
 */
function mount(initial: Tod = 'day') {
  const added: Added[] = [];
  const removed: Added[] = [];
  let tod: Tod = initial;
  const env = {
    scene: { add: (m: Added) => added.push(m), remove: (m: Added) => removed.push(m) },
    player: { position: { x: 0, z: 0 } },
    doc: document,
    cell: 32,
    time: () => tod,
  };
  // 실제 Feature 계약 전체를 만들지 않는다 — ocean 이 쓰는 것만 준다.
  const inst = oceanFeature.create(env as never)!;
  const sea = () => added.find((m) => m.name === 'ocean')!.material;
  return { inst, added, removed, sea, setTime: (t: Tod) => { tod = t; } };
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
  it('씬에 정확히 셋을 넣는다 — 드로우콜 +3', () => {
    // 강이 셋째 판으로 늘었다(감독 지시 2026-07-30: 강 −0.5 / 바다 −1.0). 재질·지오는
    // 공유하므로 늘어난 것은 드로우콜 하나뿐이다.
    const { added } = mount();
    expect(added.map((m) => m.name).sort()).toEqual(['ocean', 'river', 'seabed']);
  });

  it('바다와 강이 재질을 공유한다 — 물빛이 두 곳에 적히면 미러링이다', () => {
    const { added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    const river = added.find((m) => m.name === 'river')!;
    // 같은 물이다. 재질을 따로 만들면 색·윤슬·불투명도가 두 곳에서 정해진다.
    expect(river.material).toBe(sea.material);
  });

  // ── 반투명 이중 겹침 (검수관 블로커) ──────────────────────────────────────
  // 강 판도 바다처럼 세계 전체를 덮는 큰 평면이었다. 격자 안에서 물인 곳은 강뿐이므로
  // **물이 보이는 전 구간에서 두 반투명 판이 겹쳤고**, 실효 불투명도가 0.7 → 0.91 로
  // 올라가 `WATER_DEPTH` 의 캘리브레이션(단일 층 전제)이 무효가 됐다.
  //
  // 값이 아니라 전제가 깨진 형태라 어떤 수치 단언에도 안 걸렸다. 그래서 **지오가 어디까지
  // 뻗어 있는지** 를 좌표로 직접 잰다.
  describe('강 판은 물 파셀 위에만 깔린다', () => {
    it('바다와 지오를 공유하지 않는다 — 공유하면 물 전 구간이 이중 겹침이다', () => {
      const { added } = mount();
      const sea = added.find((m) => m.name === 'ocean')!;
      const river = added.find((m) => m.name === 'river')!;
      expect(river.geometry).not.toBe(sea.geometry);
    });

    it('쿼드가 하나 이상 있다 — 0 이면 강이 아예 안 보인다', () => {
      // 격자 순회나 판정이 어긋나면 지오가 조용히 비고, 화면에는 "바다만 보이는 강"으로
      // 나타난다. 에러도 경고도 없으므로 개수를 단언한다.
      const { added } = mount();
      const g = (added.find((m) => m.name === 'river')!.geometry) as FakeBufferGeometry;
      expect(g.index, '강 지오에 인덱스가 없다').not.toBeNull();
      expect(g.index!.count / 6, '강 파셀이 0개 — 강 판이 비었다').toBeGreaterThan(0);
    });

    it('세계 전체를 덮지 않는다 — 강이 지나는 폭만 덮는다', () => {
      // 강은 x 를 따라 흐르므로 x 범위는 세계를 가로지르지만 **z 범위는 좁아야** 한다.
      // 큰 판 하나면 z 도 세계 전체(그리고 그 4배인 `PLANE`)를 덮는다.
      const { added } = mount();
      const g = (added.find((m) => m.name === 'river')!.geometry) as FakeBufferGeometry;
      const pos = g.attrs.position.array;
      const zs: number[] = [];
      for (let i = 2; i < pos.length; i += 3) zs.push(pos[i]);
      const zSpan = Math.max(...zs) - Math.min(...zs);
      // 세계 절반 크기(EDGE)를 기준으로 삼는다 — 값을 적어두지 않고 유도한다.
      // 강은 굽이치므로 z 로도 꽤 움직이지만(진폭 합 200m), 세계 전체(2×EDGE)를
      // 덮지는 않는다. 큰 판이면 z 폭이 PLANE(= 4×EDGE)이 된다.
      const worldSpan = EDGE * 2;
      expect(zSpan, '강 판의 z 폭이 세계 전체를 넘는다 — 큰 판 하나로 되돌아갔다')
        .toBeLessThan(worldSpan);
    });

    it('UV 를 바다와 같은 규칙으로 낸다 — 어긋나면 무늬가 다른 크기로 흐른다', () => {
      // 재질(따라서 `repeat`·`offset`)을 공유하므로 UV 규칙이 어긋나면 강과 바다에서
      // 물결 무늬의 크기·방향이 갈린다. 바다 판의 규칙은
      // `PlaneGeometry(PLANE, PLANE).rotateX(-π/2)` → `u = x/PLANE + 0.5`,
      // `v = 0.5 − z/PLANE` 다. 정점 하나를 골라 그 식이 성립하는지 본다.
      const { added } = mount();
      const g = (added.find((m) => m.name === 'river')!.geometry) as FakeBufferGeometry;
      const pos = g.attrs.position.array;
      const uv = g.attrs.uv.array;
      const PLANE = EDGE * 4; // ocean.ts 와 같은 유도
      for (let q = 0; q < 4; q++) {
        const x = pos[q * 3];
        const z = pos[q * 3 + 2];
        expect(uv[q * 2]).toBeCloseTo(x / PLANE + 0.5, 9);
        expect(uv[q * 2 + 1]).toBeCloseTo(0.5 - z / PLANE, 9);
      }
    });

    it('법선이 전부 위쪽이다 — 뒤집히면 위에서 물이 안 보인다', () => {
      const { added } = mount();
      const g = (added.find((m) => m.name === 'river')!.geometry) as FakeBufferGeometry;
      const n = g.attrs.normal.array;
      for (let i = 0; i < n.length; i += 3) {
        expect(n[i]).toBe(0);
        expect(n[i + 1]).toBe(1);
        expect(n[i + 2]).toBe(0);
      }
    });
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

  // ── 판정/집행 경계 (팀장 조건 7) ──────────────────────────────────────────
  // 상수를 둘로 쪼갰으므로 **각 상수가 올바른 판에 꽂히는가**가 새 사각이다. 두 값을
  // 맞바꿔 꽂아도 "물이 두 층으로 있다" 는 사실은 그대로라 위 단언들이 다 통과한다 —
  // 그래서 어느 판이 어느 높이인지를 직접 본다.
  it('강 판이 RIVER_Y · 바다 판이 SEA_Y 다 — 두 상수를 맞바꿔 꽂는 것을 잡는다', () => {
    const { added } = mount();
    expect(added.find((m) => m.name === 'river')!.position.y).toBe(RIVER_Y);
    expect(added.find((m) => m.name === 'ocean')!.position.y).toBe(SEA_Y);
  });

  it('강이 바다보다 높다 — 강물이 바다로 흘러나가는 방향', () => {
    // 감독 지시가 강 −0.5 / 바다 −1.0 이므로 이 관계가 뒤집히면 지시 위반이다.
    // 값을 여기 다시 적지 않는다 — 관계만 본다.
    expect(RIVER_Y).toBeGreaterThan(SEA_Y);
    const { added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    const river = added.find((m) => m.name === 'river')!;
    expect(river.position.y).toBeGreaterThan(sea.position.y);
    // 위에 있는 판이 나중에 그려져야 겹침 정렬이 맞는다
    expect(river.renderOrder).toBeGreaterThan(sea.renderOrder);
  });

  it('둘 다 지면(y=0)보다 낮다 — 육지가 물을 덮어야 물 구멍이 성립한다', () => {
    expect(RIVER_Y).toBeLessThan(0);
    expect(SEA_Y).toBeLessThan(0);
  });

  it('해저를 바다 수면에서 유도한다 — 실측치를 적어두지 않았다', () => {
    // 예전에는 `-2.9` 를 직접 적고 주석에 "수면보다 2.4m 아래" 라고 썼다. 수면이 바뀌자
    // 그 유도가 거짓이 됐다(실제 1.9m). 산술로 바꿨으므로 수면을 옮기면 해저가 따라온다.
    expect(SEABED_Y).toBeCloseTo(SEA_Y - WATER_DEPTH, 10);
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

// ── 수면 광택 — **실제 재질에 닿는가** (검수관 블로커 2026-07-31) ─────────────
//
// 이 블록이 생긴 경위를 적어 둔다. 같은 실수를 다시 하지 않기 위한 것이다.
//
// 처음에는 `world2-water-gloss.test.ts` 에 "[B] 집행" 이라는 섹션을 두고 거기서
// **`applyGloss` 와 같은 로직을 테스트 파일 안에 다시 적어** 그 사본을 검사했다.
// 통합 테스트처럼 보였고 주석에도 "경계를 건너는 지점을 본다" 고 적었지만, 검수관이
// 실제 `ocean.ts` 를 훼손해 실증했다:
//
//   · `seaMat.needsUpdate = true;` 제거          → 47 passed 0 failed
//   · `seaMat.roughness = 0.62;` 강제 대입        → 47 passed 0 failed
//     (= `waterGloss` 를 완전히 무력화. 이 브랜치가 고치려던 버그를 그대로 재현)
//
// 즉 **이 작업의 존재 이유였던 바로 그 사고 형태**가 그 "집행 테스트" 자신에서
// 재현됐다 — 그것도 아예 없는 게 아니라 **있는 것처럼 보이는 사본**이라 더 나빴다.
//
// 그래서 여기로 옮긴다. `mount()` 는 실제 `oceanFeature.create` 를 태우므로 아래
// 단언은 진짜 `applyGloss` 가 만든 재질을 본다. 위 두 뮤테이션이 여기서는 깨진다.
//
// ── 값 미러링을 피하는 방법 ──────────────────────────────────────────────────
// 광택 수치를 여기에 다시 적지 않는다. `waterGloss(시간대)` 를 불러 **그 반환값과
// 재질을 대조**한다 — 지키려는 것은 "값이 무엇인가"(그건 `world2-water-gloss.test.ts`
// 소관)가 아니라 **"판정이 재질까지 닿는가"** 이기 때문이다.
describe('수면 광택 — 판정이 실제 재질까지 닿는가', () => {
  /** `FakeMaterial` 은 인덱스 시그니처라 필드가 `unknown` 이다. 읽을 형태로 좁힌다 */
  const glossOf = (mat: FakeMaterial) => mat as unknown as {
    normalScale: { x: number; y: number };
    roughness: number;
    needsUpdate: boolean;
  };

  it('★ 부팅 시 시간대 값이 재질에 대입된다 — 안 닿으면 판정이 장식이다', () => {
    const { sea } = mount('day');
    const g = waterGloss('day');
    const m = glossOf(sea());
    expect(m.normalScale.x).toBe(g.normalScale);
    expect(m.normalScale.y).toBe(g.normalScale);
    expect(m.roughness).toBe(g.roughness);
  });

  it('★ 밤에 부팅하면 밤 값이다 — 낮 값이 하드코딩돼 있으면 여기가 깨진다', () => {
    // 이 브랜치가 고친 버그가 정확히 그것이었다(전역 상수가 재질에 박혀 있었다).
    const { sea } = mount('night');
    const g = waterGloss('night');
    const m = glossOf(sea());
    expect(m.normalScale.x).toBe(g.normalScale);
    expect(m.roughness).toBe(g.roughness);
    // 낮과 다르다는 것까지 본다 — 두 시간대가 같은 값이면 위 단언은 통과하면서도
    // 분기가 죽어 있을 수 있다.
    expect(m.normalScale.x).not.toBe(waterGloss('day').normalScale);
  });

  it('★ needsUpdate 를 세운다 — 안 세우면 값을 바꿔도 화면이 안 바뀐다', () => {
    // 검수관 뮤테이션 ①이 노린 자리. 값을 정확히 계산하고 정확히 대입해도 이 줄이
    // 없으면 GPU 쪽 유니폼이 안 갱신돼 **화면에는 아무 일도 안 일어난다.**
    const { sea } = mount('day');
    expect(glossOf(sea()).needsUpdate).toBe(true);
  });

  it('★ update 중 시간대가 바뀌면 재질이 따라간다', () => {
    // `mount()` 가 시간을 고정하던 동안 이 분기는 통째로 미검증이었다.
    const { inst, sea, setTime } = mount('day');
    const m = glossOf(sea());
    expect(m.roughness).toBe(waterGloss('day').roughness);

    setTime('night');
    inst.system!.update({ dt: 1 } as never);
    expect(m.roughness).toBe(waterGloss('night').roughness);
    expect(m.normalScale.x).toBe(waterGloss('night').normalScale);

    // 되돌아오는 것도 본다 — 한 번 밤이 되면 낮으로 못 돌아오는 구현이 있을 수 있다.
    setTime('day');
    inst.system!.update({ dt: 1 } as never);
    expect(m.roughness).toBe(waterGloss('day').roughness);
  });

  it('시간대가 그대로면 다시 걸지 않는다 — 매 프레임 대입하면 유니폼이 계속 갱신된다', () => {
    const { inst, sea } = mount('day');
    const m = glossOf(sea());
    m.needsUpdate = false;          // 밖에서 내려두고
    inst.system!.update({ dt: 1 } as never);
    expect(m.needsUpdate).toBe(false); // 안 바뀌었으면 건드리지 않아야 한다
  });
});

// ── URL 노브 (감독 지시 2026-07-31 "URL로 값 조절할 수 있게 열어둬") ───────────
//
// 노브의 요건은 둘이고 **둘 다 깨지기 쉽다**:
//   ① 지정하면 덮는다 — 안 덮으면 감독이 값을 바꿔도 화면이 그대로다(가장 흔한 결함)
//   ② 지정 안 하면 시간대 분기가 그대로 산다 — `readNum` 을 쓰면 여기가 깨진다.
//      fallback 이 강제돼 낮 기본값이 밤에도 걸리고, 이 브랜치가 방금 고친 버그가
//      노브를 통해 되살아난다. 그래서 `readNumOpt` 가 따로 있다.
describe('URL 노브 — 수면 값을 밖에서 연다', () => {
  /** jsdom 의 `location.search` 를 바꿔 `create` 를 태운다. 끝나면 반드시 되돌린다 */
  function withSearch<T>(search: string, fn: () => T): T {
    const before = location.search;
    const to = (s: string) => window.history.replaceState({}, '', s || location.pathname);
    to(search);
    try { return fn(); } finally { to(before); }
  }
  const glossOf = (mat: FakeMaterial) => mat as unknown as {
    normalScale: { x: number; y: number }; roughness: number;
  };

  it('★ ?wns= 를 주면 시간대 값을 덮는다', () => {
    const m = withSearch('?wns=2.4', () => glossOf(mount('day').sea()));
    expect(m.normalScale.x).toBe(2.4);
    expect(m.normalScale.y).toBe(2.4);
  });

  it('★ ?wrough= 를 주면 시간대 값을 덮는다', () => {
    const m = withSearch('?wrough=0.45', () => glossOf(mount('night').sea()));
    expect(m.roughness).toBe(0.45);
  });

  it('한쪽만 줘도 나머지는 시간대 값이 산다 — 노브 하나가 둘을 덮으면 안 된다', () => {
    const m = withSearch('?wns=2', () => glossOf(mount('night').sea()));
    expect(m.normalScale.x).toBe(2);
    expect(m.roughness).toBe(waterGloss('night').roughness); // 건드리지 않았다
  });

  it('★ 노브가 없으면 시간대 분기가 그대로다 — 여기가 깨지면 노브가 기본값을 죽인 것이다', () => {
    // `readNumOpt` 대신 `readNum('wns', 0.9, ...)` 을 쓰면 정확히 이 단언이 깨진다.
    const day = withSearch('', () => glossOf(mount('day').sea()));
    const night = withSearch('', () => glossOf(mount('night').sea()));
    expect(day.normalScale.x).toBe(waterGloss('day').normalScale);
    expect(night.normalScale.x).toBe(waterGloss('night').normalScale);
    expect(day.normalScale.x).not.toBe(night.normalScale.x);
  });

  it('★ ?wns=0 도 유효한 지정이다 — `||` 로 쓰면 조용히 무시된다', () => {
    // 평평한 수면을 보려는 시도가 바로 이 값이다. `??` 가 아니라 `||` 였다면
    // 0 이 falsy 라 시간대 값으로 되돌아가고, 감독은 "노브가 안 먹는다" 고만 본다.
    const m = withSearch('?wns=0', () => glossOf(mount('day').sea()));
    expect(m.normalScale.x).toBe(0);
  });

  it('범위 밖 값은 클램프된다 — ?wns=999 로 화면이 날아가지 않는다', () => {
    const m = withSearch('?wns=999', () => glossOf(mount('day').sea()));
    expect(m.normalScale.x).toBe(3);   // NS_MAX
  });

  it('숫자가 아니면 무시하고 시간대 값으로 간다', () => {
    const m = withSearch('?wns=abc', () => glossOf(mount('day').sea()));
    expect(m.normalScale.x).toBe(waterGloss('day').normalScale);
  });

  it('★ ?wflow= 가 강물 속도를 실제로 바꾼다 — 진단만 바뀌고 UV 가 그대로면 장식이다', () => {
    // 유속은 재질이 아니라 **UV 이동량**으로 드러난다. 같은 dt 를 주고 이동 거리를
    // 비교한다 — 노브가 `phase` 계산에 안 닿으면 두 값이 같아진다.
    const shift = (search: string) => withSearch(search, () => {
      const { inst, added } = mount();
      const g = added.find((m) => m.name === 'river')!.geometry as FakeBufferGeometry;
      const uv = g.attrs.uv.array as unknown as number[];
      const before = [...uv];
      inst.system!.update({ dt: 1 } as never);
      return Math.hypot(uv[0] - before[0], uv[1] - before[1]);
    });
    const slow = shift('?wflow=0.5');
    const fast = shift('?wflow=4');
    expect(fast).toBeGreaterThan(slow * 1.5);
  });

  it('★ 진단이 실제로 걸린 값을 내보낸다 — 다시 계산하면 노브 무시를 덮는다', () => {
    const d = withSearch('?wns=1.5&wrough=0.4&wflow=3', () => {
      const { inst } = mount('night');
      return inst.diagnostics!() as {
        gloss: { normalScale: number; roughness: number };
        glossKnob: { ns: number | null; rough: number | null };
        flowMps: number;
      };
    });
    expect(d.gloss).toEqual({ normalScale: 1.5, roughness: 0.4 });
    expect(d.glossKnob).toEqual({ ns: 1.5, rough: 0.4 });
    expect(d.flowMps).toBe(3);
  });

  it('노브를 안 쓰면 진단이 그 사실을 말한다 — 값만으로는 지정 여부를 못 가린다', () => {
    const d = withSearch('', () => {
      const { inst } = mount('day');
      return inst.diagnostics!() as { glossKnob: { ns: number | null; rough: number | null } };
    });
    expect(d.glossKnob).toEqual({ ns: null, rough: null });
  });
});

// ── 물살 (감독 지시 2026-07-31 "물살로 보이고") ──────────────────────────────
// 반짝임과 달리 이것은 **정점마다 다른 값**이라 순수 함수 테스트로 못 본다.
// `riverFlowAt` 이 옳은 방향을 주는지는 `world2-river-flow.test.ts` 가 보고,
// 여기서는 **그 방향이 실제로 UV 에 실리는지**를 본다 — 경계를 건너는 지점이다.
describe('물살 — 강 UV 가 정점마다 제 방향으로 밀린다', () => {
  const riverUv = () => {
    const { inst, added } = mount();
    const river = added.find((m) => m.name === 'river')!;
    const g = river.geometry as FakeBufferGeometry;
    return { inst, uv: g.attrs.uv.array as unknown as number[] };
  };

  it('★ update 가 강 UV 를 실제로 바꾼다 — 안 바뀌면 물살이 없다', () => {
    const { inst, uv } = riverUv();
    const before = [...uv];
    inst.system!.update({ dt: 2 } as never);
    expect(uv.some((v, i) => v !== before[i])).toBe(true);
  });

  it('★ 정점마다 다른 방향으로 민다 — 전부 같으면 지금과 다를 게 없다', () => {
    // 이것이 이 작업의 핵심 단언이다. 모든 정점을 같은 양만큼 밀면 그냥 offset 을
    // 흘리는 것과 같고, 굽이를 따라 흐르지 않는다.
    const { inst, uv } = riverUv();
    const before = [...uv];
    inst.system!.update({ dt: 3 } as never);
    // 정점별 이동 벡터를 모아 서로 다른 것이 있는지 본다
    const deltas = new Set<string>();
    for (let i = 0; i < uv.length; i += 2) {
      deltas.add(`${(uv[i] - before[i]).toFixed(6)},${(uv[i + 1] - before[i + 1]).toFixed(6)}`);
    }
    expect(deltas.size).toBeGreaterThan(1);
  });

  it('누적하지 않는다 — 같은 t 면 같은 UV 다(부동소수 오차가 안 쌓인다)', () => {
    // 기준 UV 에서 매번 다시 계산하므로, 한 번에 dt=4 를 주든 dt=2 를 두 번 주든
    // 같은 결과여야 한다. 누적 구현이면 여기가 깨진다.
    const a = riverUv();
    a.inst.system!.update({ dt: 4 } as never);
    const once = [...a.uv];
    const b = riverUv();
    b.inst.system!.update({ dt: 2 } as never);
    b.inst.system!.update({ dt: 2 } as never);
    for (let i = 0; i < once.length; i++) expect(b.uv[i]).toBeCloseTo(once[i], 9);
  });

  it('UV 속성에 needsUpdate 를 세운다 — 안 세우면 GPU 버퍼가 안 올라간다', () => {
    const { inst, added } = (() => {
      const m = mount();
      return { inst: m.inst, added: m.added };
    })();
    const g = added.find((x) => x.name === 'river')!.geometry as FakeBufferGeometry;
    (g.attrs.uv as unknown as { needsUpdate?: boolean }).needsUpdate = false;
    inst.system!.update({ dt: 1 } as never);
    expect((g.attrs.uv as unknown as { needsUpdate?: boolean }).needsUpdate).toBe(true);
  });
});

describe('정리', () => {
  it('dispose 가 씬에서 빼고 자원을 전부 반납한다', () => {
    const { inst, added, removed } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    inst.dispose!();
    // ── 넣은 것을 다 뺀다 (개수를 적지 않고 대조한다) ────────────────────────
    // `2` 를 박아 두었더니 판이 셋으로 늘었을 때 **강만 씬에 남는 것**을 통과시켰다.
    // 씬에 남은 메시는 재질이 해제된 뒤에도 렌더 목록에 올라 있다. 넣은 것과 뺀 것을
    // 이름으로 맞대면 판을 몇 장 더 늘려도 이 단언이 저절로 따라온다.
    expect(removed.map((m) => m.name).sort()).toEqual(added.map((m) => m.name).sort());
    expect((sea.material as FakeMaterial).disposed).toBe(true);
    for (const k of ['map', 'normalMap', 'roughnessMap'] as const) {
      expect((sea.material.opts[k] as FakeTexture).disposed).toBe(true);
    }
  });

  it('강 판의 지오도 반납한다 — 자기 지오를 갖고 있으므로 바다 것과 별개다', () => {
    const { inst, added } = mount();
    const g = (added.find((m) => m.name === 'river')!.geometry) as FakeBufferGeometry;
    inst.dispose!();
    expect(g.disposed, '강 지오가 반납되지 않았다').toBe(true);
  });
});

// ── 윤슬 (감독 지시 2026-07-30) ─────────────────────────────────────────────
// *"윤슬이 보이는 거였으면 좋겠어. 실제 반사로 하지말고. 쉐이더 트릭으로 했으면 해."*
//
// 윤슬은 `roughnessMap`(= 층 B 노멀맵) **G채널의 낮은 점**으로 낸다. 그 자리에서만
// 스페큘러가 좁고 세게 튄다. 여기서 지키는 것은 **그 점이 실제로 텍스처에 들어갔는가**다 —
// `engraveSparkle` 을 정의만 하고 호출을 빠뜨리면 아무 일도 안 일어나면서 테스트는 통과한다.
// 실제로 이 구현에서 그 실수가 한 번 났다(주석 블록을 먼저 넣어 삽입 패턴이 어긋났다).
describe('윤슬 — roughnessMap G채널에 점이 새겨진다', () => {
  it('층 B(roughnessMap)에만 아주 낮은 G값이 있다 — 층 A(normalMap)에는 없다', () => {
    const { added } = mount();
    // `FakeMaterial` 은 생성 옵션을 `opts` 에 담는다(실제 재질처럼 필드로 펼치지 않는다).
    const opts = (added.find((m) => m.name === 'ocean')!.material as unknown as {
      opts: { normalMap: { image?: { _g?: number[] } }; roughnessMap: { image?: { _g?: number[] } } };
    }).opts;
    // 스텁 캔버스가 putImageData 로 받은 G채널 표본을 남긴다(위 beforeAll 참고).
    const gA = opts.normalMap.image?._g ?? [];
    const gB = opts.roughnessMap.image?._g ?? [];
    expect(gB.length, 'roughnessMap 의 G채널 표본이 없다 — 스텁이 안 물렸다').toBeGreaterThan(0);

    // 스파클은 G 를 0.06*255 ≈ 15 까지 눌러 넣는다. 물결 법선만으로는 그렇게 낮아지지
    // 않는다(법선 G 는 0.5 근처에서 진동한다) — 그래서 이 문턱이 스파클의 지문이다.
    const veryLowB = gB.filter((v) => v <= 24).length;
    const veryLowA = gA.filter((v) => v <= 24).length;
    expect(veryLowB, '윤슬 점이 roughnessMap 에 없다 — engraveSparkle 이 안 불렸다').toBeGreaterThan(0);
    expect(veryLowA, '층 A(normalMap)에 스파클이 섞였다 — 물결 법선이 망가진다').toBe(0);
  });

  it('점이 화면을 덮지 않는다 — 물이 서리처럼 되면 윤슬이 아니다', () => {
    const { added } = mount();
    const opts = (added.find((m) => m.name === 'ocean')!.material as unknown as {
      opts: { roughnessMap: { image?: { _g?: number[] } } };
    }).opts;
    const gB = opts.roughnessMap.image?._g ?? [];
    const ratio = gB.filter((v) => v <= 24).length / gB.length;
    // 격자 7px 칸에 16% 확률 → 픽셀 대비 약 0.3%. 상한을 넉넉히 잡되 "드문 점" 임을 지킨다.
    expect(ratio).toBeLessThan(0.05);
  });

  it('emissive 로 내지 않았다 — 스스로 빛나는 물은 밤에 어색하다 (팀장 조건 4)', () => {
    // 감독 지적: *"밤인데 빛이 이렇게 많지 않잖아."* emissive 는 광원과 무관하게 밝아진다.
    const { added } = mount();
    const opts = (added.find((m) => m.name === 'ocean')!.material as unknown as {
      opts: { emissiveMap?: unknown; emissiveIntensity?: number };
    }).opts;
    expect(opts.emissiveMap ?? null).toBeNull();
    expect(opts.emissiveIntensity ?? 0).toBe(0);
  });
});
