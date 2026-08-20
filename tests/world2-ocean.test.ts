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

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

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
  needsUpdate = false;
  disposed = false;
  dispose() { this.disposed = true; }

  /**
   * `Texture.clone()` — **이미지는 공유하고 `offset`·`repeat` 만 별도**로 갖는 사본.
   *
   * 두 번째 물결 층(감독 지시 2026-08-03)이 같은 노말맵을 다른 스케일·방향으로 쓰려고
   * 이것을 부른다. 스텁이 안 갖고 있어서 `clone is not a function` 으로 터졌다 —
   * 위 `FakeMaterial` 주석이 이미 이름 붙인 형태다: **코드가 아니라 스텁이 계약을 덜
   * 재현한 것**이다. 구현을 스텁에 맞춰 비틀지 않고 스텁을 실물에 맞춘다.
   */
  clone(): FakeTexture {
    const t = new FakeTexture(this.image);
    t.wrapS = this.wrapS;
    t.wrapT = this.wrapT;
    t.repeat.set(this.repeat.x, this.repeat.y);
    t.offset.set(this.offset.x, this.offset.y);
    return t;
  }
}

/**
 * `PlaneGeometry` 스텁.
 *
 * ── 왜 정점을 실제로 만드는가 (2026-08-05) ───────────────────────────────────
 * 예전에는 `w`·`h` 만 들고 `rotateX()` 가 `this` 를 돌려주는 껍데기였다. 바다 정점
 * 파동 패치(팀장 판정 A)가 `getAttribute('position')` 을 부르자 **프로덕션 코드가
 * 멀쩡한데 테스트만 터졌다** — 이 파일 `FakeMaterial` 주석이 이미 이름 붙인 형태다
 * (*"스텁이 계약을 덜 재현하면 …"*). 그래서 three 의 계약대로 정점을 만든다.
 *
 * `rotateX` 도 **실제로 회전시킨다.** no-op 으로 두면 정점이 XY 평면에 남아, 프로덕션이
 * 읽는 `p[i+1]`(y) 이 테스트에서만 다른 축을 가리킨다 — 거짓 재현은 미검출보다 나쁘다.
 * three 의 `PlaneGeometry` 는 XY 평면에 (z=0) 만들고, `rotateX(-π/2)` 는 그것을
 * `(x, y, 0) → (x, 0, −y)` 로 옮긴다.
 */
class FakeGeometry {
  disposed = false;
  attrs: Record<string, FakeAttr> = {};
  constructor(public w: number, public h: number, public ws = 1, public hs = 1) {
    const pos: number[] = [];
    for (let iy = 0; iy <= hs; iy++) {
      // three 와 같은 순서·부호: y 는 위(+h/2)에서 아래(−h/2)로 훑는다.
      const y = h / 2 - (iy * h) / hs;
      for (let ix = 0; ix <= ws; ix++) {
        pos.push((ix * w) / ws - w / 2, y, 0);
      }
    }
    this.attrs.position = new FakeAttr(pos, 3);
    // ── uv 도 만든다 (검수관 블로커 BL-6, 2026-08-05) ───────────────────────
    // 패치가 텍스처 월드 스케일을 맞추려고 `getAttribute('uv')` 를 만지는데, 스텁이
    // position 만 갖고 있으면 **프로덕션이 멀쩡한데 테스트만 터진다**(이 파일이 이미
    // 같은 이유로 position 을 실제로 만들게 됐다 — 아래 클래스 주석).
    //
    // three 의 `PlaneGeometry` 규칙 그대로: `u = ix/ws`, `v = 1 − iy/hs`.
    const uv: number[] = [];
    for (let iy = 0; iy <= hs; iy++) {
      for (let ix = 0; ix <= ws; ix++) uv.push(ix / ws, 1 - iy / hs);
    }
    this.attrs.uv = new FakeAttr(uv, 2);
  }

  /** `-π/2` 만 재현한다 — 이 파일이 쓰는 유일한 각도이고, 임의 각도는 쓸 일이 없다 */
  rotateX(rad: number) {
    if (Math.abs(rad + Math.PI / 2) > 1e-9) {
      throw new Error(`FakeGeometry.rotateX: -π/2 만 재현한다(받은 값 ${rad})`);
    }
    const p = this.attrs.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const y = p[i + 1];
      p[i + 1] = p[i + 2];
      p[i + 2] = -y;
    }
    return this;
  }

  getAttribute(name: string) { return this.attrs[name]; }
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
  // `x`·`z` 도 준다 — 바다 패치가 플레이어를 따라 **가로로** 움직이므로(팀장 판정 A),
  // `y` 만 있으면 그 이동을 검사가 볼 수 없고 프로덕션에서는 `undefined` 대입이 된다.
  position = { x: 0, y: 0, z: 0 };
  castShadow = false;
  receiveShadow = false;
  frustumCulled = true;
  renderOrder = 0;
  name = '';
  constructor(public geometry: unknown, public material: unknown) {}
}

/** 버퍼 속성 스텁 — 강 판의 정점을 실제로 들여다보려고 배열을 그대로 보관한다 */
/**
 * three 의 `DynamicDrawUsage` 실제 값. 스텁이 임의 값을 주면 **테스트에서만 다른 상수**가
 * 생기고 그것이 곧 값 미러링이다. 아래 `FakeAttr` 와 mock 이 같은 이름을 본다.
 */
const DYNAMIC_DRAW_USAGE = 35048;

class FakeAttr {
  /** three 의 기본값(`StaticDrawUsage`). `setUsage` 가 실제로 바꾸는지 검사가 볼 수 있게 둔다. */
  usage = 35044;
  /** three 의 계약. 진단이 정점 수를 이것으로 읽는다 — 없으면 `undefined` 가 보고된다 */
  needsUpdate = false;
  constructor(public array: number[], public itemSize: number) {}
  get count() { return this.array.length / this.itemSize; }
  /** 강 판이 매 프레임 정점 y 를 덮어쓰므로 동적 버퍼로 선언한다 — three 의 계약이다. */
  setUsage(u: number) { this.usage = u; return this; }
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

// ── TSL 노드 물 스텁 ────────────────────────────────────────────────────────
// **이것이 없으면 `useTsl === true` 가지를 한 번도 못 돈다.** 실제 `createTslWater` 는
// three 의 노드 시스템을 세우는데 이 하네스의 three 는 스텁이라 세울 수 없다. 그래서
// 핸들 계약만 재현한다 — 돌아가는 것은 여전히 **실제 `ocean.ts` 코드**다.
//
// 왜 필요했나(검수관 반려 2026-08-02 B1): TSL 모드에서 `update()` 의
// `normA.offset.set(...)` 이 `null.offset` 으로 매 프레임 터져 화면이 통째로 멈추는
// 결함이 있었다. 그런데 그때 있던 테스트는 전부 `mount('day','WebGL')` 이라 이 가지가
// **한 번도 실행되지 않았고**, vitest 1,304 통과·tsc 0·스모크 16 PASS 가 전부 초록이었다.
const tslCalls = { created: 0, times: [] as string[], disposed: 0 };
vi.mock('../frontend/js/world2/features/ocean-tsl.js', () => ({
  createTslWater: () => {
    tslCalls.created += 1;
    return {
      // 실제 `createTslWater` 는 `MeshBasicNodeMaterial` 을 돌려준다. 여기서는 씬에
      // 꽂히기만 하면 되므로 빈 재질로 족하다.
      material: new FakeMaterial({}),
      setTime: (t: string) => { tslCalls.times.push(t); },
      dispose: () => { tslCalls.disposed += 1; },
    };
  },
}));

vi.mock('three/webgpu', () => ({
  PlaneGeometry: FakeGeometry,
  MeshStandardMaterial: FakeMaterial,
  Mesh: FakeMesh,
  CanvasTexture: FakeTexture,
  BufferGeometry: FakeBufferGeometry,
  Float32BufferAttribute: FakeAttr,
  RepeatWrapping: 1000,
  // 강 판이 매 프레임 정점 y 를 덮어쓰므로 `setUsage(DynamicDrawUsage)` 를 건다
  // (수면 변위, 2026-08-03). three 의 실제 값과 같게 둔다 — 스텁이 다른 값을 주면
  // "테스트에서만 다른 상수" 가 생기고, 그것이 곧 값 미러링이다.
  DynamicDrawUsage: DYNAMIC_DRAW_USAGE,
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

const { oceanFeature, waveHeight, SEA_PATCH_METRICS, peakOf } = await import('../frontend/js/world2/features/ocean.js');
const { RIVER_Y, SEA_Y, SEABED_Y, WATER_DEPTH, worldHalfExtent, waterGloss } = await import('../frontend/js/world2/decide/water.js');
// 두 번째 물결 층 검사가 쓴다. **실물을 import 한다** — 총 불투명도(`OPACITY`)와 배분
// 공식(`splitOpacity`)을 여기 다시 적으면 그 순간 미러링이고, 값을 바꿔도 검사가 옛
// 값을 지키게 된다.
const { OPACITY, layerOpacity, RIVER_SEG } = await import('../frontend/js/world2/features/ocean.js');
// 층2 패치의 높이 단언이 쓴다. **값을 여기 적지 않는다** — `PATCH_SEP` 을 옮기거나
// `?wamp` 기본값을 바꾸면 검사가 따라와야 한다.
const { PATCH_SEP, WAVE_AMP_DEFAULT } = await import('../frontend/js/world2/decide/wave.js');
const { DEFAULT_LAYOUT } = await import('../frontend/js/world2/parts/types.js');
/** 세계 절반 크기. `ocean.ts` 와 **같은 유도**를 쓴다 — 값을 적어두면 그것이 미러링이다 */
const EDGE = worldHalfExtent(DEFAULT_LAYOUT.cellX);

interface Added {
  name: string;
  // 바다 패치가 플레이어를 따라 **가로로** 움직인다(팀장 판정 A). `y` 만 적어 두면
  // 그 이동을 검사가 아예 못 읽는다 — `FakeMesh` 와 같은 모양을 유지한다.
  position: { x: number; y: number; z: number };
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
function mount(initial: Tod = 'day', backend = 'WebGL') {
  const added: Added[] = [];
  const removed: Added[] = [];
  /** 표면 재질 레지스트리에 신고된 것 — 팀장 조건 1 의 관측 지점 */
  const registered = new Map<string, unknown>();
  let tod: Tod = initial;
  const env = {
    scene: { add: (m: Added) => added.push(m), remove: (m: Added) => removed.push(m) },
    player: { position: { x: 0, z: 0 } },
    doc: document,
    cell: 32,
    time: () => tod,
    // 수면 구현 분기가 이것을 읽는다(`pickWaterMode`). 기본을 `WebGL` 로 두는 것은
    // **라이브의 최악 조건**을 기본 대조군으로 삼으려는 것이다 — `navigator.gpu` 가
    // 없는 기기가 실제 방문자의 다수이고, 그 경로가 깨지면 월드가 통째로 안 뜬다.
    adapter: { backend },
    /**
     * 표면 재질 레지스트리(W7). **ocean 이 자기 해저 재질을 여기 신고한다.**
     *
     * 팀장 조건 1(2026-08-15): *"등록 시점 계약을 주석이 아니라 검사로 강제한다"* —
     * 그래서 대역이 등록을 **기록**하고, 아래 「표면 재질 등록」 절이 그것을 단언한다.
     * 등록 호출을 지우면 그 축이 깨진다(주석은 안 깨진다).
     */
    registerSurfaceMaterial: (kind: string, m: unknown) => { registered.set(kind, m); },
  };
  // 실제 Feature 계약 전체를 만들지 않는다 — ocean 이 쓰는 것만 준다.
  const inst = oceanFeature.create(env as never)!;
  const sea = () => added.find((m) => m.name === 'ocean')!.material;
  return {
    inst, added, removed, sea, registered,
    setTime: (t: Tod) => { tod = t; },
    // 바다 패치가 플레이어를 따라 움직이는지 보려면 플레이어가 **실제로 움직여야** 한다
    // (팀장 판정 A). 고정 좌표만 쓰면 그 가지가 통째로 미검증으로 남는다 — TSL 분기가
    // 정확히 그렇게 새어나갔다(위 스텁 주석).
    setPlayer: (x: number, z: number) => { env.player.position.x = x; env.player.position.z = z; },
  };
}

describe('waveHeight — 타일이 이어진다', () => {
  it('u·v 가 1 늘어도 같은 값 — 격자 솔기가 생기지 않는다', () => {
    for (const t of [0, 0.13, 0.37, 0.62, 0.91]) {
      expect(waveHeight(0, t)).toBeCloseTo(waveHeight(1, t), 9);
      expect(waveHeight(t, 0)).toBeCloseTo(waveHeight(t, 1), 9);
    }
  });

  it('★ 마루가 좁고 골이 넓다 — 대칭 대조군보다 실제로 골이 넓어야 한다', () => {
    // ── 이 테스트는 한 번 틀렸다. 그 기록을 남긴다 (검수관 블로커 2026-07-31) ──
    // 처음 판본은 *"표본 평균이 −0.05 보다 낮다"* 였고 주석에 "`WAVE_SKEW` 를 1 로
    // 되돌리면 깨진다" 고 적었다. **거짓이었다.** 검수관이 실측했다:
    //
    //   skew 1(대칭)  → mean −0.4938   ← 비대칭을 꺼도 임계값을 한참 밑돈다
    //   skew 1.7      → mean −0.7927
    //   합성 직후 raw → mean  0.3147   ← 0.5 가 아니다
    //
    // `softLight` 4옥타브 합성 **자체가** 평균을 크게 끌어내리고 있었다. 그래서 그 축은
    // 감마가 아니라 **합성의 편향**을 재고 있었고, 정작 이 커밋이 넣은 비대칭이 사라져도
    // 침묵했다. 이 저장소가 반복해 겪은 형태 그대로다 — *"참인 문장에서 성립하지 않는
    // 결론을 뽑는 것. 값이 아니라 재는 축이 틀린다."*
    //
    // 원인은 **기준선이 없었다는 것**이다. "낮다" 를 재려면 무엇보다 낮은지가 있어야 하는데
    // 테스트가 대칭 버전을 만들 수단이 없었다. 그래서 `waveHeight` 가 skew 를 인자로도
    // 받게 하고, 여기서 **대조군을 직접 만든다.**
    const sample = (skew?: number) => {
      const vals: number[] = [];
      for (let i = 0; i < 64; i++) {
        for (let j = 0; j < 64; j++) vals.push(waveHeight(i / 64, j / 64, skew));
      }
      return vals;
    };
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

    const asym = sample();          // 기본값 = WAVE_SKEW
    const sym = sample(1);          // 감마 없음 = 대칭

    // ★ 이것이 검출 지점이다. `WAVE_SKEW` 를 1 로 되돌리면 두 표본이 **같아져서** 깨진다.
    expect(mean(asym), '비대칭이 대칭과 같다 — 감마가 안 먹고 있다')
      .toBeLessThan(mean(sym) - 0.1);

    // 그렇다고 바닥에 깔리면 안 된다 — 마루가 실제로 서 있어야 한다.
    expect(Math.max(...asym)).toBeGreaterThan(0.5);
  });

  it('대칭 대조군은 실제로 대칭 쪽이다 — 대조군 자체가 기울어 있으면 위 비교가 무의미하다', () => {
    // 위 테스트는 **상대 비교**라 대조군이 이미 극단으로 기울어 있으면 차이가 안 난다.
    // 대조군이 적어도 비대칭본보다는 덜 치우쳤음을 따로 못박는다.
    const vals: number[] = [];
    for (let i = 0; i < 32; i++) {
      for (let j = 0; j < 32; j++) vals.push(waveHeight(i / 32, j / 32, 1));
    }
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    // 합성 편향 때문에 0 은 아니지만(검수관 실측 −0.49), 완전히 바닥에 붙지는 않는다.
    expect(m).toBeGreaterThan(-0.9);
  });

  it('평평하지 않다 — 물결이 실제로 있다', () => {
    const vals = [];
    for (let i = 0; i < 40; i++) vals.push(waveHeight(i / 40, (i * 7 % 40) / 40));
    expect(Math.max(...vals) - Math.min(...vals)).toBeGreaterThan(0.5);
  });
});

describe('수면 조립 — 개수 불변식', () => {
  it('씬에 정확히 다섯을 넣는다 — 드로우콜 +5', () => {
    // 강이 셋째 판으로 늘었다(감독 지시 2026-07-30: 강 −0.5 / 바다 −1.0). 재질·지오는
    // 공유하므로 늘어난 것은 드로우콜 하나뿐이었다.
    //
    // ── 3 → 5 (감독 지시 2026-08-03, 팀장 판정 A) ────────────────────────────
    // 두 번째 물결 층이 바다·강에 각각 하나씩 붙었다. **이것은 단언을 느슨하게 만든
    // 것이 아니라 예산을 갱신한 것**이고, 둘의 차이는 아래 두 검사가 지킨다:
    // 재질·지오를 공유하므로 늘어난 것은 **드로우콜 둘뿐**이다.
    //
    // 팀장 조건이 정확히 이 자리를 겨눴다 — *"개수 불변식에 반영되는지 확인하고 가라.
    // 예산 갱신 없이 통과하면 그게 게이트 구멍이다."* 게이트는 통과하지 않았고,
    // 이름 없는 메시 둘을 빈 문자열로 잡아냈다.
    const { added } = mount();
    expect(added.map((m) => m.name).sort())
      .toEqual(['ocean', 'ocean-wave2', 'river', 'river-wave2', 'seabed']);
  });

  it('두 번째 층이 재질 하나를 공유한다 — 바다·강이 따로 만들면 미러링이다', () => {
    const { added } = mount();
    const s2 = added.find((m) => m.name === 'ocean-wave2')!;
    const r2 = added.find((m) => m.name === 'river-wave2')!;
    expect(r2.material).toBe(s2.material);
  });

  it('★ 두 번째 층이 첫 층과 다른 재질이다 — 같으면 간섭이 아니라 중복이다', () => {
    // 이 처방의 본체는 **다른 법선을 겹치는 것**이다. 재질이 같으면 같은 노말맵을
    // 두 번 그릴 뿐이라 무늬가 겹쳐 보일 뿐 간섭이 없다 — 비용만 늘고 효과는 0이다.
    const { added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    const s2 = added.find((m) => m.name === 'ocean-wave2')!;
    expect(s2.material).not.toBe(sea.material);
    const a = (sea.material as Record<string, unknown>).normalMap;
    const b = (s2.material as Record<string, unknown>).normalMap;
    expect(b, '두 번째 층에 노말맵이 없다 — 법선을 안 겹친다').toBeTruthy();
    expect(b, '두 층이 같은 텍스처 인스턴스다 — repeat 가 공유돼 스케일이 안 갈린다')
      .not.toBe(a);
  });

  it('★ 두 층의 무늬 크기가 정수비가 아니다 — 정렬되면 간섭이 끊긴다', () => {
    // 팀장 조건: *"두 층 속도·스케일 비를 정수비로 두지 마라 — 주기적으로 정렬되는
    // 순간 간섭이 사라지고 '한 장' 으로 보이는 박동이 생긴다."*
    const { added } = mount();
    const sea = added.find((m) => m.name === 'ocean')!;
    const s2 = added.find((m) => m.name === 'ocean-wave2')!;
    const r1 = ((sea.material as Record<string, unknown>).normalMap as { repeat: { x: number } }).repeat.x;
    const r2 = ((s2.material as Record<string, unknown>).normalMap as { repeat: { x: number } }).repeat.x;
    expect(r1).toBeGreaterThan(0);
    expect(r2).toBeGreaterThan(0);
    const ratio = r1 / r2;
    // 작은 정수비에서 충분히 떨어져 있는가. 황금비는 유리수로 가장 느리게 근사되는
    // 수라 이 검사를 넉넉히 통과한다 — 손으로 고른 값이면 여기서 걸린다.
    for (let p = 1; p <= 6; p++) {
      for (let q = 1; q <= 6; q++) {
        expect(
          Math.abs(ratio - p / q),
          `스케일 비 ${ratio.toFixed(3)} 가 ${p}/${q} 에 너무 가깝다 — 두 층이 정렬된다`,
        ).toBeGreaterThan(0.04);
      }
    }
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

    it('★ 파셀 경계에서 정점 x 가 갈리지 않는다 — 갈리면 물에 금이 간다', () => {
      // ── 이 검사가 여기 있는 이유 (검수관 뮤테이션 실증 2026-08-04) ──────────
      // 같은 검사를 `world2-surface-lift.test.ts` 에 두 번 썼고 **두 번 다 tautology**
      // 였다. 마지막 판본은 `riverGeometry` 의 정점 식을 테스트 파일에 복사해 복사본끼리
      // 비교했는데, `px·cell + cell/2 == (px+1)·cell − cell/2` 가 항등식이라 프로덕션이
      // 무엇을 하든 참이었다 — 실제로 정점 식에 +0.05m 를 주입해도 전부 통과했다.
      //
      // **실제 코드를 돌려야 한다.** 여기서는 `mount()` 가 진짜 `riverGeometry()` 를
      // 실행하므로 그 결과 배열을 직접 읽는다. 강 판은 파셀마다 독립 정점을 쓰고
      // 왼쪽 파셀의 마지막 열(i=S)과 오른쪽 파셀의 첫 열(i=0)이 **다른 산술 경로**를
      // 지나므로, 두 값이 갈리면 경계에 같은 위치의 x 가 둘 생긴다.
      const { added } = mount();
      const g = (added.find((m) => m.name === 'river')!.geometry) as FakeBufferGeometry;
      const pos = g.getAttribute('position').array;
      expect(pos.length, '강 정점이 없다 — 아래 단언이 공허해진다').toBeGreaterThan(0);

      // 실제로 나온 x 값을 전부 모은다(중복 제거).
      const xs = [...new Set<number>(pos.filter((_, i) => i % 3 === 0))].sort((a, b) => a - b);
      // 인접한 두 x 가 "거의 같지만 다르면" 경계가 갈린 것이다. 정상이면 세그먼트 간격
      // (cellX / RIVER_SEG)만큼 떨어져 있거나 정확히 같은 값 하나로 합쳐진다.
      // ★ SSOT 를 경유한다 — 여기 `32 / 8` 을 적었다가 지웠다. 그것이 검수관 지적 ② 와
      //   같은 형태(값 미러링)이고, 셀 크기나 세분이 바뀌면 이 검사가 조용히 stale 해진다.
      const step = DEFAULT_LAYOUT.cellX / RIVER_SEG;
      const split = [];
      for (let i = 1; i < xs.length; i++) {
        const d = xs[i] - xs[i - 1];
        if (d > 0 && d < step * 0.5) split.push([xs[i - 1], xs[i]]);
      }
      expect(split.slice(0, 3), `경계에서 x 가 갈린 곳 ${split.length}군데`).toEqual([]);
    });

    it('★ 정점 버퍼가 동적으로 선언된다 — 매 프레임 y 를 덮어쓴다', () => {
      // 커밋 메시지가 *"`DynamicDrawUsage` 로 드라이버에 알린다"* 고 주장하는데, 그 주장을
      // 보는 검사가 없었다(검수관 지적 ④). 정적 버퍼로 두면 갱신마다 재할당이 날 수 있고
      // 그 손해는 **실기기에서만** 드러난다 — 헤드리스가 못 잡는 축이라 더더욱 선언을 본다.
      const { added } = mount();
      const g = (added.find((m) => m.name === 'river')!.geometry) as FakeBufferGeometry;
      expect(g.getAttribute('position').usage, '강 정점 버퍼가 정적으로 남아 있다')
        .toBe(DYNAMIC_DRAW_USAGE);
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
    // ⚠ 층1은 더 이상 `SEA_Y` 가 아니다 — 층2(패치)의 **골 밑**으로 내려가 있다.
    // 근거는 `decide/wave.ts` 의 `patchVertexY` 헤더. 여기서 재는 것은 «해저보다
    // 위인가» 이므로 그 목적은 그대로 성립한다.
    expect(sea.position.y).toBe(SEA_Y - WAVE_AMP_DEFAULT);
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
    // 바다 «수면» 을 들고 있는 것은 이제 층2다 — 층1은 그 골을 받치는 판이라
    // `LIFT_AMP` 만큼 아래다. 상수를 맞바꿔 꽂는 것은 두 단언이 함께 잡는다.
    expect(added.find((m) => m.name === 'ocean-wave2')!.position.y).toBe(SEA_Y);
    expect(added.find((m) => m.name === 'ocean')!.position.y).toBe(SEA_Y - WAVE_AMP_DEFAULT);
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
    // 두 번째 파동 층이 `roughnessMap` → `map`(tint) 으로 옮겨졌다.
    // 예전 구조는 노멀맵을 거칠기맵 자리에 태워 검은 줄기를 만들었다(감독 실기기 실증).
    const map = sea.material.opts.map as FakeTexture;
    const spark = sea.material.opts.emissiveMap as FakeTexture;
    return { inst, norm, map, spark };
  };

  it('시간이 지나면 노멀맵 offset 이 움직인다 — 안 움직이면 물이 멈춰 있다', () => {
    const { inst, norm } = flow();
    const before = { ...norm.offset };
    inst.system!.update({ dt: 1 } as never);
    expect(norm.offset.x !== before.x || norm.offset.y !== before.y).toBe(true);
  });

  it('두 층이 서로 다른 방향으로 흐른다 — 같으면 흐르는 벽지가 된다', () => {
    // 층 둘의 정체가 바뀌었다(노멀맵 + 거칠기맵 → 노멀맵 + 밝기맵). **단언은 그대로다** —
    // 지키려는 것은 "두 무늬가 어긋나 간섭한다" 이지 어느 슬롯을 쓰느냐가 아니다.
    const { inst, norm, map } = flow();
    inst.system!.update({ dt: 4 } as never);
    // 방향 벡터가 평행하지 않아야 한다(외적 ≠ 0)
    const cross = norm.offset.x * map.offset.y - norm.offset.y * map.offset.x;
    expect(Math.abs(cross)).toBeGreaterThan(1e-9);
  });

  it('★ 밝기 무늬가 노멀맵과 **따로** 흐른다 — 붙여 두면 두 층이 한 덩어리가 된다', () => {
    // ── 이 단언은 뒤집힌 것이다 (감독 실기기 실증 2026-07-31) ──────────────────
    // 예전에는 정반대였다: *"밝기 무늬가 노멀맵 층과 함께 간다 — 따로 놀면 무늬와 빛이
    // 어긋난다."* 그때는 `tint.offset.copy(normA.offset)` 이었고, 두 번째 파동을
    // `roughnessMap` 이 맡고 있었으니 밝기는 노멀맵에 붙어 있어도 층이 둘이었다.
    //
    // 그 `roughnessMap` 슬롯이 검은 줄기의 원인이라 비웠다. 이제 두 번째 파동은 `tint`
    // 가 맡으므로 **붙어 있으면 안 된다** — 붙이면 층이 하나가 되고 "흐르는 벽지" 가 된다.
    //
    // 단언을 느슨하게 만든 것이 아니라 **계약이 바뀐 것**이다. 옛 단언은 옛 구조에서만
    // 참이었고, 지금 그대로 두면 고쳐야 할 결함을 통과시킨다.
    const { inst, norm, map } = flow();
    inst.system!.update({ dt: 3 } as never);
    const same = Math.abs(map.offset.x - norm.offset.x) < 1e-9
              && Math.abs(map.offset.y - norm.offset.y) < 1e-9;
    expect(same, '밝기 무늬가 노멀맵에 붙어 있다 — 두 층이 한 덩어리로 미끄러진다').toBe(false);
  });

  it('★ 윤슬도 물결과 어긋나게 흐른다 — 붙어 있으면 점이 박혀 명멸하지 않는다', () => {
    // 윤슬이 물결에 붙어 흐르면 무늬 위 한 점에 고정된 채 같이 미끄러진다. 그러면
    // "흐르는 반짝이 무늬" 이지 반짝임이 아니다 — 나타났다 사라지는 것이 윤슬이다.
    const { inst, norm, spark } = flow();
    const before = { ...spark.offset };
    inst.system!.update({ dt: 3 } as never);
    // 움직이긴 해야 한다
    expect(spark.offset.x !== before.x || spark.offset.y !== before.y).toBe(true);
    // 그러나 물결과 같은 속도는 아니다
    const same = Math.abs(spark.offset.x - norm.offset.x) < 1e-9
              && Math.abs(spark.offset.y - norm.offset.y) < 1e-9;
    expect(same, '윤슬이 물결과 같은 속도다 — 점이 무늬에 박힌다').toBe(false);
  });

  // 진단은 **검증을 위해 만든 값**이라 스스로도 검증돼야 한다. 헤드리스 스모크가 물결을
  // 두 번 연속 "측정 불가"로 남겨서 이 필드를 신설했는데, 그게 텍스처가 아니라 내부
  // 시간값을 되돌려주면 "계산은 도는데 텍스처엔 안 꽂힌 상태"를 통과시킨다 — 그러면
  // 측정 지점을 만든 의미가 정확히 반대로 뒤집힌다.
  it('진단이 텍스처의 실제 offset 을 내보낸다 — 계산값을 되돌려주면 못 잡는다', () => {
    const { inst, norm, map, spark } = flow();
    inst.system!.update({ dt: 2 } as never);
    const d = inst.diagnostics!() as { flowA: number[]; flowB: number[]; flowSparkle: number[] };
    expect(d.flowA).toEqual([norm.offset.x, norm.offset.y]);
    expect(d.flowB).toEqual([map.offset.x, map.offset.y]);
    expect(d.flowSparkle).toEqual([spark.offset.x, spark.offset.y]);
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
    map.offset.set(0, 0);
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
    emissiveIntensity: number;
    needsUpdate: boolean;
  };

  it('★ 부팅 시 시간대 값이 재질에 대입된다 — 안 닿으면 판정이 장식이다', () => {
    const { sea } = mount('day');
    const g = waterGloss('day');
    const m = glossOf(sea());
    expect(m.normalScale.x).toBe(g.normalScale);
    expect(m.normalScale.y).toBe(g.normalScale);
    expect(m.roughness).toBe(g.roughness);
    // 반짝임 세기도 **재질에 닿아야** 한다. 뮤테이션 실측(2026-07-31): 이 단언이 없을 때
    // `seaMat.emissiveIntensity = spark;` 줄을 통째로 지워도 62건 전부 통과했다 —
    // 값은 계산되는데 화면에는 아무 일도 안 일어나는 상태를 아무도 안 보고 있었다.
    expect(m.emissiveIntensity).toBe(g.sparkle);
  });

  it('★ 반짝임 세기가 시간대를 따라간다 — 안 따라가면 밤에도 낮처럼 빛난다', () => {
    // M4 뮤테이션(밤 sparkle 을 낮 값으로) 대응. 감독의 예전 지적
    // *"밤인데 빛이 이렇게 많지 않잖아"* 를 지키는 **집행 쪽** 자리다
    // (판정 쪽은 `world2-water-gloss.test.ts` 가 본다).
    const { inst, sea, setTime } = mount('day');
    const m = glossOf(sea());
    expect(m.emissiveIntensity).toBe(waterGloss('day').sparkle);
    setTime('night');
    inst.system!.update({ dt: 1 } as never);
    expect(m.emissiveIntensity).toBe(waterGloss('night').sparkle);
    // 낮보다 확실히 어두워야 한다 — 두 값이 같아지면 위 두 단언은 통과하면서도
    // 시간대 분기가 죽어 있을 수 있다.
    expect(m.emissiveIntensity).toBeLessThan(waterGloss('day').sparkle);
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
        gloss: { normalScale: number; roughness: number; sparkle: number; opacity: number };
        glossKnob: {
          ns: number | null; rough: number | null; flow: number | null; opa: number | null;
        };
        flowMps: number;
      };
    });
    // 반짝임·투명도는 노브로 지정하지 않았으므로 기본값이 그대로 온다 — 셋만 덮인다.
    expect(d.gloss.normalScale).toBe(1.5);
    expect(d.gloss.roughness).toBe(0.4);
    expect(d.gloss.sparkle).toBe(waterGloss('night').sparkle);
    expect(d.gloss.opacity).toBeGreaterThan(0);   // 상수 기본값이 살아 있다
    expect(d.glossKnob).toEqual({ ns: 1.5, rough: 0.4, flow: 3, opa: null });
    expect(d.flowMps).toBe(3);
  });

  it('노브를 안 쓰면 진단이 그 사실을 말한다 — 값만으로는 지정 여부를 못 가린다', () => {
    // 세 노브가 **전부** null 이어야 한다. 유속만 `readNum` 이던 시절에는 이 자리에
    // 기본값 1.1 이 들어와 "지정했다"와 구별되지 않았다.
    const d = withSearch('', () => {
      const { inst } = mount('day');
      return inst.diagnostics!() as {
        glossKnob: {
          ns: number | null; rough: number | null; flow: number | null; opa: number | null;
        };
        flowMps: number;
      };
    });
    expect(d.glossKnob).toEqual({ ns: null, rough: null, flow: null, opa: null });
    // 그래도 실제로 쓰이는 유속은 기본값이다 — "미지정"이 "0"이 되면 강이 멈춘다.
    expect(d.flowMps).toBeGreaterThan(0);
  });
});

// ── 슬라이더 바 → 실제 재질 (감독 지시 2026-07-31 "유아이 바를 만들어봐") ─────
//
// `world2-knob-bar.test.ts` 는 스텁 spec 으로 **바의 계약**만 본다. 여기서는 진짜
// `oceanFeature.create` 를 태워 **슬라이더를 민 것이 재질까지 가는가**를 본다.
//
// 이 구별이 오늘 검수관이 잡은 블로커의 핵심이다. 로직을 테스트 안에 다시 적으면
// 사본만 지켜지고, 정작 `ocean.ts` 를 훼손해도 아무것도 안 깨진다. 그러니 바를 진짜
// 문서에 세우고 진짜 이벤트를 쏜다.
describe('슬라이더 바 — 민 것이 실제 재질까지 간다', () => {
  const BAR = `
    <div id="w2-sliders" data-open="0" data-dirty="0" hidden>
      <button id="w2-sliders-toggle" type="button" aria-expanded="false"></button>
      <div id="w2-sliders-body" hidden></div>
    </div>`;
  beforeEach(() => { document.body.innerHTML = BAR; window.history.replaceState({}, '', location.pathname); });
  afterEach(() => { document.body.innerHTML = ''; window.history.replaceState({}, '', location.pathname); });

  const glossOf = (mat: FakeMaterial) => mat as unknown as {
    normalScale: { x: number; y: number }; roughness: number;
  };
  const inputs = () => document.querySelectorAll<HTMLInputElement>('.w2-slide-input');
  const resets = () => document.querySelectorAll<HTMLButtonElement>('.w2-slide-reset');
  const push = (el: HTMLInputElement, v: string) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  it('★ 문서에 바가 있으면 수면 노브 다섯이 붙는다', () => {
    // 셋 → 넷(흰 윤슬 `wspark`) → 다섯(수면 투명도 `wopa`). 해저에 자갈이 깔리면서
    // "얼마나 비쳐야 좋은가" 가 비로소 고를 수 있는 값이 됐다(감독 지시 2026-07-31).
    mount('day');
    expect(inputs().length).toBe(5);
    expect(document.getElementById('w2-sliders')!.hidden).toBe(false);
  });

  it('★ 물결 슬라이더를 밀면 재질의 normalScale 이 바뀐다 — 이 축이 없으면 바가 장식이다', () => {
    const { sea } = mount('day');
    const m = glossOf(sea());
    expect(m.normalScale.x).toBe(waterGloss('day').normalScale);
    push(inputs()[0], '2.4');
    expect(m.normalScale.x).toBe(2.4);
    expect(m.normalScale.y).toBe(2.4);
  });

  it('★ 거칠기 슬라이더를 밀면 재질의 roughness 가 바뀐다', () => {
    const { sea } = mount('night');
    const m = glossOf(sea());
    push(inputs()[1], '0.42');
    expect(m.roughness).toBe(0.42);
  });

  it('★ 유속 슬라이더를 밀면 강 UV 이동량이 바뀐다', () => {
    const { inst, added } = mount('day');
    const g = added.find((x) => x.name === 'river')!.geometry as FakeBufferGeometry;
    const uv = g.attrs.uv.array as unknown as number[];

    const shift = () => {
      const before = [...uv];
      inst.system!.update({ dt: 1 } as never);
      return Math.hypot(uv[0] - before[0], uv[1] - before[1]);
    };
    push(inputs()[4], '0.5');
    const slow = shift();
    push(inputs()[4], '5');
    const fast = shift();
    expect(fast).toBeGreaterThan(slow * 1.5);
  });

  it('★ 되돌리기를 누르면 시간대 기본값으로 돌아온다', () => {
    const { sea } = mount('night');
    const m = glossOf(sea());
    push(inputs()[0], '2.8');
    expect(m.normalScale.x).toBe(2.8);
    resets()[0].click();
    expect(m.normalScale.x).toBe(waterGloss('night').normalScale);
  });

  it('★ 민 값이 주소에 실린다 — 그래야 화면 밖으로 나갈 수 있다', () => {
    // 이 도구의 목적 자체다. 값이 화면 안에만 있으면 감독이 숫자를 눈으로 읽어
    // 옮겨 적어야 하고, 사람이 옮기는 그 구간이 오늘 이미 훼손을 냈다.
    mount('day');
    push(inputs()[0], '1.25');
    expect(location.search).toContain('wns=1.25');
  });

  it('★ 되돌리면 주소에서도 사라진다 — 기본값을 주소가 기억하면 안 된다', () => {
    mount('day');
    push(inputs()[1], '0.5');
    expect(location.search).toContain('wrough');
    resets()[1].click();
    expect(location.search).not.toContain('wrough');
  });

  it('★ 주소에 값이 있으면 슬라이더가 그 자리에서 시작한다', () => {
    window.history.replaceState({}, '', '?wns=2.15');
    mount('day');
    expect(inputs()[0].value).toBe('2.15');
    expect(document.querySelectorAll<HTMLElement>('.w2-slide-row')[0].dataset.overridden).toBe('1');
  });

  it('★ 시간대가 바뀌면 안 잡은 슬라이더가 따라간다', () => {
    const { inst, setTime } = mount('day');
    expect(inputs()[0].value).toBe(String(waterGloss('day').normalScale));
    setTime('night');
    inst.system!.update({ dt: 1 } as never);
    expect(inputs()[0].value).toBe(String(waterGloss('night').normalScale));
  });

  it('★ 잡아둔 슬라이더는 시간대를 따라가지 않는다 — 그게 "잡는다"의 뜻이다', () => {
    const { inst, sea, setTime } = mount('day');
    push(inputs()[0], '2.2');
    setTime('night');
    inst.system!.update({ dt: 1 } as never);
    expect(inputs()[0].value).toBe('2.2');
    expect(glossOf(sea()).normalScale.x).toBe(2.2);
    // 안 잡은 거칠기는 밤을 따라간다 — 노브가 서로를 끌고 가지 않는다.
    expect(glossOf(sea()).roughness).toBe(waterGloss('night').roughness);
  });

  it('★ dispose 가 바를 걷는다 — 해제된 재질을 만지는 핸들러가 남으면 안 된다', () => {
    const { inst } = mount('day');
    expect(inputs().length).toBe(5);
    inst.dispose!();
    expect(inputs().length).toBe(0);
    expect(document.getElementById('w2-sliders')!.hidden).toBe(true);
  });

  it('바가 없는 문서에서도 물은 뜬다 — 패널은 있으면 좋은 것이지 필수가 아니다', () => {
    document.body.innerHTML = '';
    const { sea, added } = mount('day');
    // 3 → 5: 두 번째 물결 층이 바다·강에 각각 붙었다(2026-08-03). 위 "씬에 정확히
    // 다섯을 넣는다" 가 이름까지 못 박으므로 여기서는 개수만 본다.
    expect(added.length).toBe(5);
    expect(glossOf(sea()).normalScale.x).toBe(waterGloss('day').normalScale);
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

  it('★ 되감기가 없다 — 타일 경계를 넘어도 이동량이 일정하다 (감독 "이동하다가 끊기네")', () => {
    // ── 왜 이 축이 따로 필요한가 (뮤테이션 실측 2026-07-31) ────────────────────
    // `% RIPPLE_M` 되감기를 **그대로 되살려도 62건 전부 통과했다.** 감독이 실기기에서
    // 직접 본 결함인데 방어선이 하나도 없었다.
    //
    // 옆의 "누적하지 않는다" 테스트가 못 잡는 이유: 그것은 *같은 t 면 같은 UV 인가* 를
    // 보는데, 되감기가 있어도 그 성질은 참이다. 되감기는 **시간을 가로질러야** 드러난다.
    //
    // 되감기의 실제 증상은 "어느 한 순간 무늬가 튄다" 이다. 그러니 같은 dt 를 계속 주며
    // **매 스텝 이동량이 일정한지**를 본다 — 되감는 순간 한 스텝만 값이 달라진다.
    // 흐름이 단위벡터라 되감긴 위치가 타일 격자와 안 맞기 때문이다.
    const { inst, uv } = riverUv();
    const steps: number[] = [];
    let prev = [...uv];
    // 기본 유속 1.1 m/s · RIPPLE_M 16m → 약 14.5초마다 되감긴다. 40초를 돌면 두 번 겪는다.
    for (let i = 0; i < 40; i++) {
      inst.system!.update({ dt: 1 } as never);
      steps.push(Math.hypot(uv[0] - prev[0], uv[1] - prev[1]));
      prev = [...uv];
    }
    const spread = Math.max(...steps) - Math.min(...steps);
    expect(spread, '스텝마다 이동량이 다르다 — 되감기가 무늬를 튀게 한다').toBeLessThan(1e-9);
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
    for (const k of ['map', 'normalMap', 'emissiveMap'] as const) {
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

// ── 윤슬 (감독 지시 2026-07-31 "흰 반짝임효과 해줘") ─────────────────────────
//
// ── 이 블록은 통째로 뒤집혔다. 왜인지 적어 둔다 ──────────────────────────────
// 예전 판본은 윤슬을 `roughnessMap`(= 층 B 노멀맵) **G채널의 낮은 점**으로 냈다. 그 자리만
// 거칠기가 낮아 스페큘러가 좁고 세게 튄다는 설계였고, `emissive` 는 팀장 조건 4 로 금지였다
// (*"스스로 빛나는 물은 광원과 무관해져 밤 지적과 충돌한다"*).
//
// **실기기에서 반짝임이 0 이었다.** 좁은 스페큘러는 반사할 것이 있어야 보이는데 이 씬에는
// `scene.environment` 가 없다. 게다가 같은 구조가 더 큰 사고를 내고 있었다 — 노멀맵의 G 는
// 법선 Y성분이라 0~1 을 오가고, 그것이 거칠기로 읽히면 G≈0 인 자리가 **완전 거울**이 되어
// 검게 나온다. 감독 스크린샷의 "검은 물줄기" 가 그것이었다(거칠기 슬라이더를 1.00 까지
// 올려도 안 사라졌다 — 곱셈이라 0 은 0 이다).
//
// 그래서 슬롯을 비우고 윤슬을 **별도 발광맵의 흰 점**으로 옮겼다. 팀장 조건 4 가 지키려던
// 것(밤에 물이 밝아지지 않을 것)은 `waterGloss(time).sparkle` 의 시간대 분기가 대신 지킨다.
//
// 아래 단언들은 **느슨해진 것이 아니라 대상이 바뀐 것**이다. 옛 단언은 옛 구조에서만
// 참이었고, 그대로 두면 지금 고친 결함을 다시 부른다.
describe('윤슬 — 발광맵에 흰 점이 새겨진다', () => {
  const seaOpts = () => {
    const { added } = mount();
    // `FakeMaterial` 은 생성 옵션을 `opts` 에 담는다(실제 재질처럼 필드로도 펼친다).
    return (added.find((m) => m.name === 'ocean')!.material as unknown as {
      opts: {
        normalMap: { image?: { _g?: number[] } };
        emissiveMap: { image?: { _g?: number[] } };
        roughnessMap?: unknown;
        emissive?: unknown;
      };
    }).opts;
  };

  it('★ 발광맵에 아주 밝은 점이 있다 — 없으면 반짝임이 아예 없다', () => {
    const opts = seaOpts();
    // 스텁 캔버스가 putImageData 로 받은 G채널 표본을 남긴다(위 beforeAll 참고).
    const g = opts.emissiveMap.image?._g ?? [];
    expect(g.length, '발광맵 표본이 없다 — 스텁이 안 물렸다').toBeGreaterThan(0);
    // 바탕은 0(검정), 점 중심은 255. 물결 무늬가 아니라 **점**이므로 최댓값이 끝까지 간다.
    expect(g.filter((v) => v >= 250).length, '흰 점이 없다 — sparkleTexture 가 안 불렸다')
      .toBeGreaterThan(0);
  });

  it('★ 발광맵 바탕은 검다 — 바탕이 밝으면 물 전체가 빛난다(감독 예전 지적)', () => {
    // 이것이 팀장 조건 4 의 근거를 지키는 자리다. 점만 밝고 나머지가 0 이라야
    // *"밤인데 빛이 이렇게 많지 않잖아"* 가 유지된다.
    const g = seaOpts().emissiveMap.image?._g ?? [];
    const dark = g.filter((v) => v === 0).length / g.length;
    expect(dark, '발광맵 바탕이 검지 않다 — 물 전체가 밝아진다').toBeGreaterThan(0.8);
  });

  it('점이 화면을 덮지 않는다 — 물이 서리처럼 되면 윤슬이 아니다', () => {
    const g = seaOpts().emissiveMap.image?._g ?? [];
    // 격자 7px 칸에 16% 확률 + 점마다 halo 4px → 픽셀 대비 약 1.6%.
    // 상한을 넉넉히 잡되 "드문 점" 임을 지킨다.
    expect(g.filter((v) => v > 0).length / g.length).toBeLessThan(0.08);
  });

  it('노멀맵에는 점이 섞이지 않는다 — 섞이면 물결 법선이 망가진다', () => {
    const gA = seaOpts().normalMap.image?._g ?? [];
    // 법선 G 는 0.5 근처에서 진동한다. 0 이나 255 로 끝까지 가는 값이 있으면 오염이다.
    expect(gA.filter((v) => v >= 250 || v === 0).length).toBe(0);
  });

  it('★ roughnessMap 슬롯이 비어 있다 — 여기 무엇을 꽂으면 검은 줄기가 돌아온다', () => {
    // 이 단언이 감독 실기기 사고의 재발 방지선이다. 노멀맵이든 무엇이든 이 슬롯에
    // 0 근처 값을 갖는 맵이 꽂히면 그 자리가 거울이 되고, 환경맵이 없는 한 검게 나온다.
    expect(seaOpts().roughnessMap ?? null).toBeNull();
  });
});

// ── 집행: `ocean.create` 가 백엔드 판정을 실제로 쓰는가 ─────────────────────
//
// `pickWaterMode` 자체는 `tests/world2-water.test.ts` 가 양쪽 가지를 다 돌린다. 그것은
// **판정**이다. 여기는 **집행** — 조립부가 그 판정을 정말 소비하는지 본다. 누가
// `const useTsl = waterMode === 'tsl'` 로 되돌려도 판정 테스트는 전부 초록이고,
// 그 상태로 배포하면 WebGL 기기에서 월드가 통째로 안 뜬다(실측한 형태다).
//
// **WebGPU 가지는 여기서 안 돈다** — 그쪽은 `createTslWater` 가 실제 노드 그래프를
// 만드는데, 이 하네스의 three 는 스텁이라 그것을 세울 수 없다. 그 가지를 보는 축은
// 스모크 `[12]` 이고, 거기서도 GPU 러너가 붙기 전까지는 안 돈다. 못 재는 것을 잰
// 것처럼 적지 않는다.
describe('수면 구현 분기 — 판정이 조립까지 닿는가', () => {
  function withSearch<T>(search: string, fn: () => T): T {
    const before = location.search;
    const to = (s: string) => window.history.replaceState({}, '', s || location.pathname);
    to(search);
    try { return fn(); } finally { to(before); }
  }
  const diagOf = (inst: { diagnostics?(): unknown }) => inst.diagnostics!() as {
    water: { requested: string; active: string; backend: string; denied: boolean };
    flowA: unknown;
  };

  it('★ WebGL 에서 ?water=tsl 이면 기존 물이 걸린다 — 노드 재질을 넘기면 부팅이 죽는다', () => {
    const d = withSearch('?water=tsl', () => diagOf(mount('day', 'WebGL').inst));
    expect(d.water.requested).toBe('tsl');
    expect(d.water.active, 'WebGL 인데 TSL 물이 걸렸다 — 첫 렌더에서 월드가 통째로 죽는다')
      .toBe('std');
    expect(d.water.denied).toBe(true);
  });

  it('폴백이면 기존 물의 텍스처가 실제로 살아 있다 — active 만 맞고 재질이 비면 소용없다', () => {
    // `active: 'std'` 를 보고하면서 정작 텍스처를 안 구웠으면 화면은 밋밋한 판이다.
    // 진단 문자열과 재질 상태가 어긋날 수 있으므로 둘 다 본다.
    const d = withSearch('?water=tsl', () => diagOf(mount('day', 'WebGL').inst));
    expect(d.flowA, '폴백인데 노멀맵 흐름이 null 이다 — 기존 물 텍스처가 안 구워졌다')
      .not.toBeNull();
  });

  it('노브를 안 주면 std 이고 거부도 없다 — 게이팅이 기본 경로를 건드리지 않는다', () => {
    const d = diagOf(mount('day', 'WebGL').inst);
    expect(d.water.requested).toBe('std');
    expect(d.water.active).toBe('std');
    expect(d.water.denied, '요청하지도 않았는데 거부로 적히면 진단이 거짓말을 한다')
      .toBe(false);
  });

  it('진단이 백엔드를 그대로 옮긴다 — 어긋나면 폴백 원인을 밖에서 못 읽는다', () => {
    const d = withSearch('?water=tsl', () => diagOf(mount('day', 'WebGL').inst));
    expect(d.water.backend).toBe('WebGL');
  });
});

// ── TSL 모드를 **실제로 돌린다** (검수관 반려 2026-08-02 B1 재제출) ──────────
//
// 위 `describe('수면 구현 분기')` 는 `diagnostics()` 만 읽고 `system.update()` 를 한 번도
// 부르지 않았다. 그래서 매 프레임 터지는 결함이 통과했다. 여기는 **프레임을 돌린다.**
//
// `kernel.ts` 는 `system.update()` 를 try/catch 없이 순회하고, `tick()` 은 다음 rAF 를
// 먼저 예약한 뒤 돌기 때문에, 여기서 예외가 나면 **매 프레임 반복되고 `render()` 가
// 한 번도 안 불린다** — 화면이 검은 채로 콘솔만 쌓인다. 그 형태를 여기서 못 박는다.
describe('TSL 모드 — 프레임을 실제로 돌린다', () => {
  function withSearch<T>(search: string, fn: () => T): T {
    const before = location.search;
    const to = (s: string) => window.history.replaceState({}, '', s || location.pathname);
    to(search);
    try { return fn(); } finally { to(before); }
  }
  const tslMount = () => withSearch('?water=tsl', () => mount('day', 'WebGPU'));

  beforeEach(() => { tslCalls.created = 0; tslCalls.times = []; tslCalls.disposed = 0; });

  it('WebGPU + ?water=tsl 이면 TSL 물이 실제로 만들어진다 — 전제가 성립하는지 먼저 본다', () => {
    const m = tslMount();
    const d = m.inst.diagnostics!() as { water: { active: string; denied: boolean } };
    expect(d.water.active, '이 전제가 깨지면 아래 검사들이 std 경로를 재게 된다').toBe('tsl');
    expect(d.water.denied).toBe(false);
    expect(tslCalls.created, '`createTslWater` 가 안 불렸다 — TSL 물이 조립되지 않았다').toBe(1);
  });

  it('★ 프레임을 여러 번 돌려도 예외가 나지 않는다 — 가드를 빼면 여기가 깨진다', () => {
    const m = tslMount();
    // 한 프레임으로는 부족하다. 매 프레임 도는 자리라는 것이 요점이므로 여러 번 돈다.
    expect(() => {
      for (let i = 0; i < 5; i += 1) m.inst.system!.update({ dt: 1 / 60 } as never);
    }, 'TSL 모드에서 update 가 터진다 — 실기기에서 화면이 통째로 멈춘다').not.toThrow();
  });

  it('★ 시간대가 바뀌면 TSL 물에 전달된다 — 판정이 집행까지 닿는가', () => {
    const m = tslMount();
    m.inst.system!.update({ dt: 1 / 60 } as never);
    const before = tslCalls.times.length;
    m.setTime('night');
    m.inst.system!.update({ dt: 1 / 60 } as never);
    expect(tslCalls.times.length, '시간대를 바꿨는데 `setTime` 이 안 불렸다').toBeGreaterThan(before);
    expect(tslCalls.times.at(-1)).toBe('night');
  });

  it('★ dispose 도 터지지 않는다 — 정리 도중 예외는 뒤의 정리를 통째로 건너뛴다', () => {
    const m = tslMount();
    m.inst.system!.update({ dt: 1 / 60 } as never);
    expect(() => m.inst.dispose?.()).not.toThrow();
    expect(tslCalls.disposed, 'TSL 물이 정리되지 않았다 — 재질이 샌다').toBe(1);
  });

  it('진단이 텍스처 흐름을 null 로 적는다 — 없는 것을 0 으로 채우면 "멈춘 물" 과 구별이 안 된다', () => {
    const m = tslMount();
    m.inst.system!.update({ dt: 1 / 60 } as never);
    const d = m.inst.diagnostics!() as { flowA: unknown; flowB: unknown; flowSparkle: unknown };
    expect(d.flowA).toBeNull();
    expect(d.flowB).toBeNull();
    expect(d.flowSparkle).toBeNull();
  });
});

// ── 두 번째 물결 층 — **동적 축** (검수관 반려 2026-08-03, 게이트 명세 G-1~G-6) ──
//
// 처음 얹었을 때 추가한 검사 셋은 전부 **조립 시점 정적 속성**만 봤다(재질 동일성·
// 텍스처 인스턴스·repeat 비). 검수관 뮤테이션이 그 구멍을 실측으로 드러냈다 —
// **두 번째 층이 아예 정지해도, 시간대 분기를 통째로 지워도, 불투명도를 1.0 으로
// 올려도, dispose 를 빼도 78건이 전부 통과했다.**
//
// 즉 "무늬가 미끄러지는 게 아니라 간섭한다" 는 커밋 제목의 주장을 보는 검사가 0건이었다.
// 이 저장소가 *"판정/집행 분리의 구멍 — 경계를 건너는 지점은 아무도 안 본다"* 로 이름
// 붙인 형태 그대로다. 여기서 그 넷을 덮는다.
describe('두 번째 물결 층 — 동적 축', () => {
  /** 반투명 물 판만. 해저(불투명)는 정렬 논의 대상이 아니다 */
  const waterPlanes = (added: Added[]) =>
    added.filter((m) => m.name !== 'seabed');

  it('★ G-1 렌더 순서가 물리적 높이 순서다 — 어긋나면 아래 판이 위를 덮는다', () => {
    // 네 판 모두 `depthWrite: false` 라 **깊이 버퍼가 순서를 교정해 주지 않는다.**
    // 그리는 순서가 곧 겹치는 순서다. 처음엔 `sea 1 · river 2 · sea2 3 · river2 4` 로
    // 줘서 −0.99m 의 sea2 가 −0.50m 의 river 위에 덧칠됐다(검수관 BR-1).
    const { added } = mount();
    const ps = waterPlanes(added)
      .map((m) => ({ name: m.name, y: m.position.y as number, order: m.renderOrder as number }))
      .sort((a, b) => a.order - b.order);
    expect(ps.length, '물 판을 못 찾았다 — 아래 단언이 공허해진다').toBeGreaterThanOrEqual(4);
    for (let i = 1; i < ps.length; i++) {
      expect(
        ps[i].y,
        `renderOrder ${ps[i - 1].order}(${ps[i - 1].name}, y=${ps[i - 1].y}) 뒤에 `
        + `${ps[i].order}(${ps[i].name}, y=${ps[i].y}) 가 온다 — 아래 판이 위를 덮는다`,
      ).toBeGreaterThanOrEqual(ps[i - 1].y);
    }
  });

  it('★ G-2 겹친 실효 불투명도가 단일 층 값 그대로다 — 물이 탁해지면 안 된다', () => {
    // 반투명 두 장이 겹치면 실효 불투명도가 곱으로 오른다. 이 파일 주석이 이미
    // *"`WATER_DEPTH` 는 단일 반투명 층을 전제로 고른 값이라 캘리브레이션이 무효가
    // 된다"* 고 적어 뒀는데, 그 위에 또 한 겹을 얹었다(검수관 BR-2 — 강 구역 실효
    // 불투명도 0.910 → 0.970, 바닥 비침 −66%).
    const { added, sea } = mount();
    const s2 = added.find((m) => m.name === 'ocean-wave2')!;
    const o1 = (sea() as Record<string, unknown>).opacity as number;
    const o2 = (s2.material as Record<string, unknown>).opacity as number;
    // 두 층을 통과해 바닥까지 가는 빛의 비율.
    const pass = (1 - o1) * (1 - o2);
    expect(o2, '두 번째 층이 불투명하다').toBeLessThan(1);
    expect(
      1 - pass,
      `겹친 실효 불투명도 ${(1 - pass).toFixed(3)} — 단일 층 전제(${OPACITY})가 깨졌다`,
    ).toBeCloseTo(OPACITY, 3);
  });

  it('G-2b 배분 공식이 총량을 보존한다 — 어떤 조합에서도', () => {
    // ⚠ 이 검사가 **첫 판본을 바로 잡았다.** 처음엔 위 층을 상수(0.42)로 고정하고
    // 아래 층만 낮췄는데, `total=0.3` 이면 위 층만으로 이미 초과라 배분이 성립하지
    // 않았다. 그래서 층 수에서 유도하는 균등 배분으로 바꿨다.
    for (const total of [0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
      for (const layers of [1, 2, 3, 4]) {
        const o = layerOpacity(total, layers);
        expect(1 - (1 - o) ** layers, `total=${total} layers=${layers}`)
          .toBeCloseTo(total, 9);
      }
    }
  });

  it('G-2c 층이 늘수록 층당 값이 낮아진다 — 겹칠수록 옅게', () => {
    const one = layerOpacity(0.7, 1);
    const two = layerOpacity(0.7, 2);
    const four = layerOpacity(0.7, 4);
    expect(two).toBeLessThan(one);
    expect(four).toBeLessThan(two);
  });

  it('★ G-3 시간대 분기가 두 번째 층에도 걸린다 — 안 걸면 밤에 물이 도로 밝아진다', () => {
    // 감독이 이미 지적한 축이다(*"밤인데 빛이 이렇게 많지 않잖아"*). 아래 층만 잦아들고
    // 위 층이 낮의 기울기로 남으면 그 지적이 되살아난다.
    const { added, setTime, inst } = mount('day');
    const s2 = () => added.find((m) => m.name === 'ocean-wave2')!.material as Record<string, unknown>;
    const nsOf = (m: Record<string, unknown>) => (m.normalScale as { x: number }).x;

    expect(nsOf(s2()), '낮 기울기가 안 걸렸다').toBeCloseTo(waterGloss('day').normalScale, 6);
    setTime('night');
    inst.system!.update!({ dt: 1 / 60 } as never);
    expect(nsOf(s2()), '밤이 됐는데 두 번째 층이 낮 기울기로 남았다')
      .toBeCloseTo(waterGloss('night').normalScale, 6);
    expect(s2().roughness, '밤 거칠기가 안 걸렸다').toBeCloseTo(waterGloss('night').roughness, 6);
  });

  it('★ G-4 두 층이 **둘 다** 흐르고, 방향이 평행하지 않다 — 이것이 처방의 본체다', () => {
    // 두 번째 층이 정지하면 간섭이 아예 안 일어난다. 그 상태가 게이트를 통과했다
    // (검수관 뮤테이션 M8: `normB.offset` 갱신을 지워도 78건 전부 통과).
    const { added, inst } = mount();
    const nm = (name: string) =>
      ((added.find((m) => m.name === name)!.material as Record<string, unknown>)
        .normalMap as { offset: { x: number; y: number } });
    const a0 = { ...nm('ocean').offset };
    const b0 = { ...nm('ocean-wave2').offset };
    for (let i = 0; i < 60; i++) inst.system!.update!({ dt: 1 / 60 } as never);
    const da = { x: nm('ocean').offset.x - a0.x, y: nm('ocean').offset.y - a0.y };
    const db = { x: nm('ocean-wave2').offset.x - b0.x, y: nm('ocean-wave2').offset.y - b0.y };

    expect(Math.hypot(da.x, da.y), '첫 층이 안 흐른다').toBeGreaterThan(1e-6);
    expect(Math.hypot(db.x, db.y), '두 번째 층이 안 흐른다 — 간섭이 일어나지 않는다')
      .toBeGreaterThan(1e-6);
    // 외적이 0 이면 평행 — 같은 방향으로 나란히 흐르면 겹치는 자리가 안 바뀐다.
    const cross = Math.abs(da.x * db.y - da.y * db.x);
    expect(cross, `두 흐름이 평행하다(외적 ${cross.toExponential(2)}) — 간섭이 생기지 않는다`)
      .toBeGreaterThan(1e-9);
  });

  it('★ G-5 두 층의 월드 무늬 속도비가 정수비가 아니다 — 정렬되면 간섭이 끊긴다', () => {
    // UV 속도가 아니라 **월드** 속도를 본다. 무늬 한 장이 덮는 미터가 층마다 다르므로
    // UV 만 보면 같은 속도로 보이는데 화면에서는 다르다(검수관 R-3 이 지적한 혼동).
    const { added, inst } = mount();
    const mapOf = (name: string) =>
      ((added.find((m) => m.name === name)!.material as Record<string, unknown>)
        .normalMap as { offset: { x: number; y: number }; repeat: { x: number } });
    const a = mapOf('ocean');
    const b = mapOf('ocean-wave2');
    const a0 = { ...a.offset };
    const b0 = { ...b.offset };
    for (let i = 0; i < 60; i++) inst.system!.update!({ dt: 1 / 60 } as never);
    // 월드 속도 = UV 속도 ÷ repeat (repeat 이 클수록 무늬가 작다)
    const wa = Math.hypot(a.offset.x - a0.x, a.offset.y - a0.y) / a.repeat.x;
    const wb = Math.hypot(b.offset.x - b0.x, b.offset.y - b0.y) / b.repeat.x;
    expect(wa).toBeGreaterThan(0);
    expect(wb).toBeGreaterThan(0);
    const ratio = wa > wb ? wa / wb : wb / wa;
    for (let p = 1; p <= 6; p++) {
      for (let q = 1; q <= 6; q++) {
        expect(
          Math.abs(ratio - p / q),
          `월드 속도비 ${ratio.toFixed(3)} 가 ${p}/${q} 에 너무 가깝다 — 두 층이 정렬된다`,
        ).toBeGreaterThan(0.04);
      }
    }
  });

  it('★ G-6 정리가 두 번째 층의 재질·텍스처까지 닿는다 — 빠지면 누수다', () => {
    // 씬에서 빼는 것은 잡혔지만(뮤테이션 M7) dispose 는 안 잡혔다(M6). 하늘 돔에서
    // 겪은 형태다(#143).
    const { added, inst } = mount();
    const s2 = added.find((m) => m.name === 'ocean-wave2')!;
    const mat = s2.material as Record<string, unknown>;
    const map = mat.normalMap as { disposed: boolean };
    inst.dispose!();
    expect(mat.disposed, '두 번째 층 재질이 안 치워졌다').toBe(true);
    expect(map.disposed, '두 번째 층 노말맵이 안 치워졌다').toBe(true);
  });
});

// ── 바다 정점 파동 패치 — **집행**을 본다 (감독 실기기 2026-08-05, 팀장 판정 A) ────
//
// `tests/world2-ocean-patch.test.ts` 는 예산·유도(순수 산술)를 본다. 그것만으로는
// **"계산한 파동이 실제 버퍼에 꽂히는가"** 가 미검증으로 남는다 — 이 저장소가 구름
// `alpha` 에서 정확히 그렇게 새어나갔고, CLAUDE.md 가 *"판정/집행 분리의 구멍 — 경계를
// 건너는 지점은 아무도 안 본다"* 로 이름 붙인 자리다.
//
// 애초에 이 기능이 필요해진 이유가 그 형태였다: 바다 판이 평면인 채 `surfaceLift` 만
// 존재했고, 순수 함수 테스트는 내내 초록이었다.
describe('바다 패치 — 정점이 실제로 울렁이는가 (집행)', () => {
  const patchOf = (added: Added[]) => {
    const m = added.find((x) => x.name === 'ocean-wave2')!;
    return (m.geometry as FakeGeometry).getAttribute('position');
  };

  it('층2 메시가 세분 패치를 쓴다 — 정점 수가 유도값과 같다', () => {
    const { added } = mount();
    expect(patchOf(added).count).toBe(SEA_PATCH_METRICS.vertices);
  });

  it('★ update 한 번이면 평평하지 않다 — 이것이 "울렁임"의 유일한 증거다', () => {
    const { inst, added } = mount();
    const pos = patchOf(added);
    // 부팅 직후는 `PlaneGeometry` 그대로라 평평하다.
    expect(peakOf(pos.array as never)).toBe(0);
    inst.system!.update({ dt: 1 } as never);
    // ⚠ 이 단언이 이 커밋의 핵심이다. `p[i + 1] = …` 한 줄을 지우면 여기가 깨진다.
    expect(peakOf(pos.array as never)).toBeGreaterThan(0);
    expect(pos.needsUpdate, '버퍼 갱신을 안 알리면 GPU 에 안 올라간다').toBe(true);
  });

  it('시간이 흐르면 파형이 달라진다 — 굳어 있으면 정지한 물이다', () => {
    const { inst, added } = mount();
    const pos = patchOf(added);
    inst.system!.update({ dt: 0.5 } as never);
    const first = (pos.array as number[]).slice();
    inst.system!.update({ dt: 0.9 } as never);
    const moved = (pos.array as number[]).some((v, i) => Math.abs(v - first[i]) > 1e-9);
    expect(moved, '두 프레임의 정점이 완전히 같다 — 파동이 시간을 안 쓴다').toBe(true);
  });

  it('★ 골이 아래 층을 뚫지 않는다 — 두 판이 교차하면 물이 갈라져 보인다', () => {
    // 목적은 그대로다. **재는 축만 바뀌었다**(2026-08-20).
    //
    // 예전에는 층2 정점의 로컬 y 가 `0.01` 아래로 안 내려가는지를 봤다. 그 형태는 층2를
    // `+ LIFT_AMP` 만큼 들어올린 구현에서만 성립하고, 그 리프트가 **평균 수면을 진폭에
    // 묶는** 결함이었다(`decide/wave.ts` 의 `patchVertexY` 헤더). 이제 층2 평균은
    // `SEA_Y + PATCH_SEP` 에 고정이고 **아래 층이 골 밑으로 내려간다.**
    //
    // 그래서 로컬 y 로는 판정할 수 없다 — 두 판의 **월드 y** 를 비교해야 한다. 축을
    // 옮기면서 단언을 느슨하게 만들지 않는다: 예전 검사가 막던 것(두 판의 교차)을
    // 그대로 막고, 오히려 아래 판의 위치까지 함께 본다.
    const { inst, added } = mount();
    const pos = patchOf(added);
    const under = added.find((x) => x.name === 'ocean')!;
    const over = added.find((x) => x.name === 'ocean-wave2')!;
    for (const dt of [0.1, 0.7, 1.3, 2.9, 5.2]) {
      inst.system!.update({ dt } as never);
      const ys = (pos.array as number[]).filter((_, i) => i % 3 === 1);
      const troughWorld = over.position.y + Math.min(...ys);
      expect(troughWorld).toBeGreaterThanOrEqual(under.position.y);
    }
  });

  it('★ 층2의 평균 높이가 진폭에 딸려 오르지 않는다 — 집행 쪽 단언', () => {
    // `decide` 쪽 단언(`world2-ocean-patch.test.ts`)은 순수 함수만 본다. **그 값이
    // 실제로 버퍼에 그렇게 꽂히는가**는 여기서만 걸린다 — 판정/집행 분리의 구멍이
    // 이 결함을 낳은 자리이므로 양쪽에 단언을 둔다.
    const { inst, added } = mount();
    const pos = patchOf(added);
    const over = added.find((x) => x.name === 'ocean-wave2')!;
    inst.system!.update({ dt: 1.1 } as never);
    const ys = (pos.array as number[]).filter((_, i) => i % 3 === 1);
    const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
    // 패치는 181m 각형이라 파장(16m·9.9m·6.1m)을 여러 번 덮는다 — 평균은 `PATCH_SEP`
    // 로 수렴한다. 리프트가 되살아나면 진폭(0.2m)만큼 어긋나 200배 떨어진다.
    expect(Math.abs(mean - PATCH_SEP)).toBeLessThan(0.001);
    expect(over.position.y).toBe(SEA_Y);
  });

  it('★ 플레이어를 따라오되 **스냅 단위로만** 움직인다 — 아니면 무늬가 따라다닌다', () => {
    const { inst, added, setPlayer } = mount();
    const mesh = added.find((x) => x.name === 'ocean-wave2')!;
    const snap = SEA_PATCH_METRICS.snap;

    // 반 칸도 안 되는 이동에는 안 움직인다.
    setPlayer(snap * 0.3, 0);
    inst.system!.update({ dt: 1 } as never);
    expect(mesh.position.x).toBe(0);

    // 한 칸을 넘으면 정확히 한 칸 옮겨간다.
    setPlayer(snap * 1.2, snap * -2.1);
    inst.system!.update({ dt: 1 } as never);
    expect(mesh.position.x).toBeCloseTo(snap, 9);
    expect(mesh.position.z).toBeCloseTo(-2 * snap, 9);
  });

  it('패치가 움직여도 같은 월드 지점의 높이는 그대로다 — 이음새가 안 생긴다', () => {
    // A 안이 성립하는 근거를 **조립된 상태에서** 확인한다(순수 함수 쪽은 별도 파일).
    //
    // ⚠ 처음엔 "월드 원점(0,0) 에 해당하는 정점" 을 찾았다. `SEA_PATCH_TILES` 가 7 로
    // 늘자 세그먼트가 홀수(49)가 되어 **중심에 정점이 없어졌고** 검사가 깨졌다.
    // 특정 좌표에 정점이 있다고 가정한 것이 잘못이다 — 세그먼트 수는 유도값이라
    // 홀짝이 언제든 바뀐다. 그래서 **실재하는 정점 하나를 골라** 그 월드 좌표를 쓴다.
    const { inst, added, setPlayer } = mount();
    const pos = patchOf(added);
    const mesh = added.find((x) => x.name === 'ocean-wave2')!;
    const snap = SEA_PATCH_METRICS.snap;

    /** 주어진 월드 좌표에 놓인 정점의 y. 없으면 null */
    const heightAtWorld = (wx: number, wz: number) => {
      const p = pos.array as number[];
      for (let i = 0; i < p.length; i += 3) {
        if (Math.abs(p[i] + mesh.position.x - wx) < 1e-6
          && Math.abs(p[i + 2] + mesh.position.z - wz) < 1e-6) return p[i + 1];
      }
      return null;
    };

    inst.system!.update({ dt: 2 } as never);
    // 판 한가운데 정점을 고른다.
    //
    // ⚠ 처음엔 `count/2` 로 잡았다. 정점은 `(seg+1)²` 격자라 그 인덱스는 **행 중앙의
    // 왼쪽 끝**(row 25, col 0)이고, 판을 +x 로 옮기면 대응 정점이 판 밖(col −7)으로
    // 나가 "격자가 안 겹친다" 로 깨졌다. 1차원 인덱스를 2차원 격자의 중앙으로 착각한
    // 것이다 — 격자를 다루면서 격자 규칙을 안 쓴 자리다.
    const arr = pos.array as number[];
    const side = SEA_PATCH_METRICS.seg + 1;
    const mid = Math.floor(SEA_PATCH_METRICS.seg / 2);
    const k = (mid * side + mid) * 3;
    const wx = arr[k] + mesh.position.x;
    const wz = arr[k + 2] + mesh.position.z;
    const before = heightAtWorld(wx, wz);
    expect(before, '방금 고른 정점을 다시 못 찾았다 — 검사가 무효다').not.toBeNull();

    // 시간은 **멈춘 채**(dt 0) 판만 옮긴다 — 파형이 위치 때문에 바뀌는지만 본다.
    // 스냅 단위로 옮기므로 정점 격자가 정확히 겹쳐 같은 월드 좌표에 정점이 다시 온다.
    //
    // ⚠ **한 칸만 옮긴다.** 세 칸(≈110m 대각)을 옮겼더니 기준 정점이 새 판 범위
    // (반쪽 ≈90.6m) 밖으로 나가 "정점을 못 찾음" 으로 깨졌다. 검사가 보려는 것은
    // 이동량이 아니라 **격자가 겹치는가**이므로 한 칸이면 족하다.
    setPlayer(snap, snap);
    inst.system!.update({ dt: 0 } as never);
    const after = heightAtWorld(wx, wz);
    expect(after, '판을 옮기니 그 월드 좌표에 정점이 없다 — 격자가 안 겹친다').not.toBeNull();
    expect(after).toBeCloseTo(before!, 9);
  });

  it('진단이 상수가 아니라 버퍼를 읽는다 — peak 이 실제 배열과 일치한다', () => {
    const { inst, added } = mount();
    inst.system!.update({ dt: 1.7 } as never);
    const d = inst.diagnostics!() as { seaPatch: { peak: number; vertices: number } | null };
    expect(d.seaPatch).not.toBeNull();
    expect(d.seaPatch!.peak).toBeCloseTo(peakOf(patchOf(added).array as never), 12);
    expect(d.seaPatch!.vertices).toBe(SEA_PATCH_METRICS.vertices);
  });

  it('TSL 모드에는 패치가 없고, 진단이 그것을 `null` 로 말한다', () => {
    // `0` 으로 채우면 "패치가 있는데 평평하다" 와 구별되지 않는다 — 못 잰 것을 통과로
    // 적지 않는다는 규율 그대로다.
    //
    // ⚠ **`WebGPU` 백엔드만으로는 TSL 이 안 걸린다.** `?water=tsl` 요청과 백엔드가
    // 함께 정한다(`pickWaterMode`). 처음에 백엔드만 바꿔 놓고 이 테스트를 썼다가
    // 기본 물이 떠서 깨졌다 — 요청과 채택을 갈라 놓은 설계를 테스트가 안 따라간 것이다.
    const before = location.search;
    window.history.replaceState({}, '', '?water=tsl');
    try {
      const { inst } = mount('day', 'WebGPU');
      const d = inst.diagnostics!() as { seaPatch: unknown; water: { active: string } };
      expect(d.water.active, 'TSL 이 실제로 걸리지 않았다 — 이 검사가 딴것을 보고 있다').toBe('tsl');
      expect(d.seaPatch).toBeNull();
    } finally {
      window.history.replaceState({}, '', before || location.pathname);
    }
  });

  it('패치 지오가 정리된다 — 빠지면 누수다', () => {
    const { inst, added } = mount();
    const g = added.find((x) => x.name === 'ocean-wave2')!.geometry as FakeGeometry;
    inst.dispose!();
    expect(g.disposed, '패치 지오가 안 치워졌다').toBe(true);
  });
});

// ── 노브 극값 — 검수관 게이트 명세 G1 (2026-08-05) ──────────────────────────
// 검수관 블로커 BL-1 이 나온 자리다. `?wamp=0` 은 "파도를 끈다" 는 뜻인데, 위치 추종이
// 진폭 조건 안에 들어 있어 **층2가 원점에 못 박히고 1cm 분리까지 소실**됐다.
// 노브 하나가 관계없는 축을 함께 껐고, 그것을 보는 검사가 없었다.
describe('바다 패치 — 노브 극값에서도 구조가 유지된다 (G1)', () => {
  /** jsdom `location.search` 를 바꿔 모듈 상수를 다시 읽게 한다. 끝나면 되돌린다 */
  async function withSearch<T>(search: string, fn: (m: typeof import('../frontend/js/world2/features/ocean.js')) => T): Promise<T> {
    const before = location.search;
    window.history.replaceState({}, '', search);
    // 노브는 모듈 최상위에서 한 번 읽는다 — 재평가하려면 모듈 캐시를 비워야 한다.
    vi.resetModules();
    try {
      const mod = await import('../frontend/js/world2/features/ocean.js');
      return fn(mod);
    } finally {
      window.history.replaceState({}, '', before || location.pathname);
      vi.resetModules();
    }
  }

  it('★ ?wamp=0 이어도 층2가 플레이어를 따라온다 — BL-1 회귀 검사', async () => {
    const moved = await withSearch('?wamp=0', (mod) => {
      const added: Added[] = [];
      const player = { position: { x: 0, z: 0 } };
      const env = {
        scene: { add: (m: Added) => added.push(m), remove: () => {} },
        player, doc: document, cell: 32, time: () => 'day', adapter: { backend: 'WebGL' },
        // 표면 재질 레지스트리는 **계약 필수**다(W7). 옵셔널로 두면 «없어도 조용히
        // 넘어간다» 가 되어 등록 강제(팀장 조건 1)가 약해진다 — 그래서 여기서도 준다.
        registerSurfaceMaterial: () => {},
      };
      const inst = mod.oceanFeature.create(env as never)!;
      const mesh = added.find((x) => x.name === 'ocean-wave2')!;
      const snap = mod.SEA_PATCH_METRICS.snap;
      player.position.x = snap * 2;
      player.position.z = snap * -1;
      inst.system!.update({ dt: 1 } as never);
      return { x: mesh.position.x, z: mesh.position.z, snap };
    });
    expect(moved.x, '진폭 0 인데 층2가 안 따라왔다 — 노브가 관계없는 축을 껐다')
      .toBeCloseTo(moved.snap * 2, 9);
    expect(moved.z).toBeCloseTo(moved.snap * -1, 9);
  });

  it('★ ?wamp=0 이어도 1cm 분리가 남는다 — 아래 층과 정확히 겹치면 안 된다', async () => {
    const ys = await withSearch('?wamp=0', (mod) => {
      const added: Added[] = [];
      const env = {
        scene: { add: (m: Added) => added.push(m), remove: () => {} },
        player: { position: { x: 0, z: 0 } },
        doc: document, cell: 32, time: () => 'day', adapter: { backend: 'WebGL' },
        // 레지스트리는 계약 필수다 — 근거는 위 하네스 주석 한 곳.
        registerSurfaceMaterial: () => {},
      };
      const inst = mod.oceanFeature.create(env as never)!;
      inst.system!.update({ dt: 1 } as never);
      const g = added.find((x) => x.name === 'ocean-wave2')!.geometry as FakeGeometry;
      const p = g.getAttribute('position').array as number[];
      return p.filter((_, i) => i % 3 === 1);
    });
    // 전부 정확히 0.01 — 평평하되 아래 층 위에 떠 있다.
    expect(Math.min(...ys)).toBeCloseTo(0.01, 9);
    expect(Math.max(...ys)).toBeCloseTo(0.01, 9);
  });

  it('★ ?wpatch=0 이면 되돌아간다 — 되돌리기 스위치가 실제로 작동한다', async () => {
    // 검수관 권고: 옛 스위치(`SEA_PATCH_SEG > 0`)는 정적으로 항상 참이라 **한 번도
    // 실행된 적이 없었다**. 있다고 적힌 장치가 없는 상태였다.
    const r = await withSearch('?wpatch=0', (mod) => {
      const added: Added[] = [];
      const env = {
        scene: { add: (m: Added) => added.push(m), remove: () => {} },
        player: { position: { x: 0, z: 0 } },
        doc: document, cell: 32, time: () => 'day', adapter: { backend: 'WebGL' },
        // 레지스트리는 계약 필수다 — 근거는 위 하네스 주석 한 곳.
        registerSurfaceMaterial: () => {},
      };
      const inst = mod.oceanFeature.create(env as never)!;
      inst.system!.update({ dt: 1 } as never);
      const d = inst.diagnostics!() as { seaPatch: unknown };
      const sea = added.find((x) => x.name === 'ocean')!.geometry;
      const w2 = added.find((x) => x.name === 'ocean-wave2')!.geometry;
      return {
        seaPatch: d.seaPatch, sharesGeo: sea === w2, seg: mod.SEA_PATCH_METRICS.seg,
        // 되돌린 경로에서 층1이 내려가면 안 된다 — 내릴 이유(층2의 골)가 없다.
        underY: added.find((x) => x.name === 'ocean')!.position.y,
      };
    });
    expect(r.seg, '스위치를 껐는데 세그먼트가 남아 있다').toBe(0);
    expect(r.seaPatch, '스위치를 껐는데 진단이 패치를 보고한다').toBeNull();
    expect(r.sharesGeo, '되돌렸으면 층2가 옛 큰 평면(같은 지오)으로 돌아가야 한다').toBe(true);
    // 검수관 권고 3 (2026-08-20): 패치가 없는 경로에서 층1이 `SEA_Y` 로 남는지는
    // 코드 읽기로만 확인돼 있었다. 그 확인이 «판정/집행 분리의 구멍» 이 되지 않게
    // 단언으로 박는다 — `if (patchGeo)` 가드를 지우면 여기가 깨진다.
    expect(r.underY, '패치가 없는데 층1을 내렸다 — 내릴 골이 없다').toBe(SEA_Y);
  });
});

// ── G5 · 층2 UV 월드 스케일 정합 (검수관 게이트 명세 2026-08-05) ──────────────
// 블로커 BL-6 이 나온 자리다. `layer2Mat` 을 공유하는 메시들의 **월드 무늬 크기**가
// 서로 달라도 아무 검사가 안 잡았다 — 실제로 10.59× 어긋난 채 통과했다.
//
// 핵심: UV 는 지오 로컬 0..1 이므로, 같은 `repeat` 를 다른 크기 지오에 쓰면 월드 무늬가
// 달라진다. 그래서 **`지오 한 변 × uv 범위 / repeat`** 를 메시마다 산출해 비교한다.
//
// ⚠ **메시 목록 위에서 돈다**(검수관 명시). `sea2` 에 하드코딩하면 다음에 추가되는
// 이동 메시가 그대로 빠져나간다.
describe('층2 월드 스케일 정합 (G5)', () => {
  /** 이 메시의 층2 무늬 한 장이 덮는 월드 거리(m) */
  const worldTile = (m: Added, repeatX: number) => {
    const g = m.geometry as FakeGeometry;
    const uv = g.getAttribute('uv').array as number[];
    let uMin = Infinity, uMax = -Infinity;
    for (let i = 0; i < uv.length; i += 2) {
      if (uv[i] < uMin) uMin = uv[i];
      if (uv[i] > uMax) uMax = uv[i];
    }
    const pos = g.getAttribute('position').array as number[];
    let xMin = Infinity, xMax = -Infinity;
    for (let i = 0; i < pos.length; i += 3) {
      if (pos[i] < xMin) xMin = pos[i];
      if (pos[i] > xMax) xMax = pos[i];
    }
    return (xMax - xMin) / ((uMax - uMin) * repeatX);
  };

  it('★ 층2 재질을 공유하는 모든 메시의 월드 무늬 크기가 같다', () => {
    const { added } = mount();
    // 층2 재질을 쓰는 메시를 **목록으로** 모은다.
    const w2 = added.filter((m) => m.name === 'ocean-wave2' || m.name === 'river-wave2');
    expect(w2.length, '층2 메시를 못 찾았다 — 이 검사가 무효다').toBeGreaterThanOrEqual(2);
    const repeatX = (w2[0].material as { normalMap?: { repeat: { x: number } } }).normalMap!.repeat.x;
    const tiles = w2.map((m) => ({ name: m.name, tile: worldTile(m, repeatX) }));
    const base = tiles[0].tile;
    for (const t of tiles) {
      expect(
        Math.abs(t.tile - base) / base,
        `${t.name} 의 월드 무늬가 ${t.tile.toFixed(3)}m 로 ${base.toFixed(3)}m 와 다르다 `
        + '— 같은 재질인데 크기가 갈리면 간섭 설계와 흐름 속도가 함께 깨진다',
      ).toBeLessThan(1e-9);
    }
  });

  it('★ 이동 메시의 스냅 보폭이 월드 무늬의 정수배다 — 아니면 걸을 때마다 무늬가 튄다', () => {
    // `offset` 은 재질 공유라 이동 보정을 못 한다. 대신 보폭이 무늬 정수배면
    // `RepeatWrapping` 에서 위상차가 정수라 무늬가 제자리에 남는다.
    const { added } = mount();
    const sea2 = added.find((m) => m.name === 'ocean-wave2')!;
    const repeatX = (sea2.material as { normalMap?: { repeat: { x: number } } }).normalMap!.repeat.x;
    const ratio = SEA_PATCH_METRICS.snap / worldTile(sea2, repeatX);
    expect(
      Math.abs(ratio - Math.round(ratio)),
      `스냅 ${SEA_PATCH_METRICS.snap.toFixed(3)}m 가 무늬의 ${ratio.toFixed(4)} 배다`,
    ).toBeLessThan(1e-9);
  });
});

// ── 표면 재질 레지스트리 (W7 — 팀장 조건 1·2) ──────────────────────────────
//
// 팀장 판정 2026-08-15: *"물 재질은 조립부 소유 레지스트리(`env.surfaceMaterial`)로 모은다
// — InstancePools 얹기는 슬롯 풀의 의미론을 오염시키고(물은 슬롯을 안 쓴다), ocean 자체
// 집행은 dispose 경로가 두 벌이 된다. 회수는 한 곳, 소유는 조립부, 기능은 등록·읽기 통로만."*
//
// 조건 1: *"등록 시점 계약을 **주석이 아니라 검사로** 강제한다. 부팅 완료 시점에 등록을
// 단언하고 뮤테이션으로 검출력을 확인한다 — 안 깨지면 장식이다."*
//
// ⚠ 이 절은 `mount()` 를 태우므로 **실제 `oceanFeature.create` 가 돈다.** 정적 문자열
//   검사가 아니다 — 등록 호출을 지우면 아래 축이 실제로 깨진다.

describe('표면 재질 레지스트리', () => {
  it('★ 부팅에 해저(bed)를 신고한다 — 안 하면 물속을 칠할 문이 통째로 없다', () => {
    const h = mount();
    expect(h.registered.has('bed'), '★ 해저가 레지스트리에 없다 — 감독 요구는 「물속 포함」이다')
      .toBe(true);
  });

  it('★ 신고한 것이 **해저 메시가 실제로 쓰는 그 재질**이다 (조건 2 — 판정/집행 경계)', () => {
    // 다른 재질을 신고하면 «칠했는데 화면은 그대로» 가 된다. 순수 축으로는 안 걸리는
    // 자리라(양쪽 다 각자 옳다) 여기서 씬에 올라간 메시와 대조한다.
    const h = mount();
    const bedMesh = h.added.find((m) => m.name === 'seabed');
    expect(bedMesh, '★ 해저 메시를 씬에서 못 찾았다 — 이름이 바뀌었으면 이 축부터 고친다')
      .toBeTruthy();
    expect(h.registered.get('bed')).toBe(bedMesh!.material);
  });

  it('★ 수면(sea)은 신고하지 않는다 — 신고하면 일렁임이 멈춘다', () => {
    // 일렁임은 `normA`·`tint`·`sparkle` 의 `offset` 을 매 프레임 굴리는 것이라, 그 슬롯을
    // 갈아 끼우면 굴러가는 텍스처가 재질에서 떨어져 나간다. 근거·재론 조건은
    // `decide/surface-material.ts` 의 `PAINTABLE_WATER` 주석 한 곳.
    const h = mount();
    expect(h.registered.has('sea'), '★ 수면이 신고됐다 — 칠하면 물이 멈춘다').toBe(false);
    // 그리고 신고한 것은 **해저 하나뿐**이어야 한다 — 물 메시가 다섯인데 하나만 연다.
    expect([...h.registered.keys()]).toEqual(['bed']);
  });

  it('시간대·백엔드가 달라도 신고는 그대로다 — 부팅 경로가 갈려도 문이 닫히지 않는다', () => {
    for (const tod of ['day', 'sunset', 'night'] as const) {
      for (const backend of ['WebGL', 'WebGPU']) {
        const h = mount(tod, backend);
        expect(h.registered.has('bed'), `★ ${tod}/${backend} 에서 신고가 빠졌다`).toBe(true);
      }
    }
  });
});
