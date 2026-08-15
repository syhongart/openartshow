// @vitest-environment node
//
// 표면 재질 **집행** — 텍스처를 갈아 끼울 때 옛 것을 회수하는가.
//
// 감독 지시 2026-08-14: *"땅의 텍스쳐 심리스를 주면 그대로 적용할수있게 … 타일링 배율로
// 촘촘히 힐것인지 조절하고 각도 조절하고"*
//
// ── 이 파일이 존재하는 이유는 「기능이 되는가」가 아니다 ────────────────────
// 조사가 찾아낸 것은 두 사실의 겹침이었다:
//   ① `features/overlay.ts` 의 제거 경로에 `dispose()` 가 **0건**이고 「갈아 끼우기」 경로
//      자체가 없었다 → 텍스처 교체를 넣으면 `info.memory.textures` 가 **단조증가**한다
//   ② `[7]` 개수 불변식은 `?edit=1` 을 **안 연다**(`WORLD2_QUERY='?time=day&weather=clear'`)
//      → 편집 중 그 증가를 보는 축이 **0개**다
// 각각은 감당할 만한데 겹치면 «조용히 새고 아무도 안 본다» 가 된다. 규율이 이 저장소의
// 상시 위험이라고 적은 «못 잰 것이 통과로 적히는 경향» 이 정확히 이 형태다.
//
// 그래서 이 파일의 중심 축은 **회수**다(아래 「C. 회수」·「D. 개수」). 기능 축은 그것을
// 세우기 위한 발판이다.
//
// ── 대역이 실물의 핵심 성질을 갖게 만든다 ───────────────────────────────────
// 뮤테이션 `0 failed` 의 네 번째 원인이 «대역이 실물의 핵심 성질을 안 가짐» 이었다.
// 여기서 실물의 핵심 성질은 셋이고 대역이 **셋 다** 갖는다:
//
//   ① `repeat`·`center` 가 **`set(x,y)` 를 갖는 객체**다 — 대입으로 바꾸면 실물에서
//      안 먹는데 테스트는 통과하는 자리가 생긴다
//   ② `dispose()` 호출을 **텍스처마다 따로** 기록한다 — 「어느 것을 버렸나」를 못 재면
//      «옛 것 대신 새 것을 버린다» 는 뮤테이션이 통과한다
//   ③ 재질이 **슬롯 대입과 `needsUpdate` 를 따로** 기록한다 — 슬롯 유무가 노드 그래프
//      구조라서(`MaterialNode.js:75`), 「언제 재컴파일을 부르는가」가 그 자체로 판정 대상이다
//
// ── 검출력을 실측했다 (뮤테이션 10건, 2026-08-15) ──────────────────────────
// 「테스트 통과는 검출력의 증거가 아니다」가 이 저장소의 규율이고, 저장소에 **텍스처 축
// 뮤테이션이 한 번도 없었다**(geo·draw 만 있었다). 그래서 이 회차에 실측했다 — 기준선
// 27 passed 에서 각 건을 넣고 되돌렸다.
//
//   M1  회수(`dispose`)를 지운다               5 failed
//   M2  갈아 끼울 때 옛 것을 안 버린다          2 failed
//   M3  남의(파츠) 텍스처까지 버린다            1 failed
//   M4  변환 변경에 `needsUpdate` 를 세운다     1 failed
//   M5  `center` 를 안 세운다                   1 failed
//   M6  항상 재컴파일한다                       3 failed
//   M7  색공간을 전 슬롯에 건다                 1 failed
//   M8  빠진 표면을 안 되돌린다                 1 failed
//   M9  같은 그림도 매번 새로 만든다            3 failed
//   M10 물을 대상에서 안 뺀다                   1 failed
//
// 그리고 B1·B2 회귀 축(아래 「늦은 등록」·「설정 재공급 없이」)도 실측했다 — 기준선 37:
//
//   L1  지연 스냅샷을 지운다(B1 이전 상태)      3 failed
//   L2  `update()` 의 `pending` 조건을 지운다     1 failed
//   L3  `pending.add` 를 지운다                   1 failed
//
// L2·L3 이 깨는 축은 **같은 하나**다(「폴링만으로 잡힌다」). 두 뮤테이션이 같은 경로의
// 앞뒤를 끊기 때문이고, 그 축이 B2 의 유일한 실물 검출 지점이라는 뜻이다 — 지우면 방문자
// 영구 불능이 다시 조용해진다.
//
// ⚠ **10건 중 6건이 테스트 단 하나로만 잡힌다**(M3·M4·M5·M7·M8·M10). 그 축을 지우거나
// 단언을 약화하면 그 결함의 검출력이 **통째로 0** 이 된다 — 중복 축을 만들어 메우는 대신
// 이 사실을 여기 적어 둔다. 각 건이 실물의 서로 다른 성질이라 겹칠 자리가 없기 때문이고,
// 그러므로 이 파일에서 테스트를 지울 때는 «무엇이 안 잡히게 되는가» 를 위 표에서 확인한다.
//
// ── 이 파일이 **못** 재는 것 (통과를 근거로 쓰지 않는다) ────────────────────
// 헤드리스는 코어 `WebGLRenderer`(swiftshader)라 실기기 렌더 결과를 못 본다. 「무늬가
// 이어지는가」·「배율이 적당한가」·「첫 적용 히칭이 체감되는가」는 **감독 실기기가 유일한
// 판정**이다. 여기서 지키는 것은 «어느 텍스처가 언제 만들어지고 언제 버려지는가» 까지다.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SURFACE_KINDS, defaultSetting, isWorldUv,
  type SurfaceKind, type SurfaceSetting,
} from '../frontend/js/world2/decide/surface-material.js';

// ── three 대역 ──────────────────────────────────────────────────────────────

class FakeVec2 {
  x = 0;
  y = 0;
  /** ⚠ 실물이 `Vector2` 라 **메서드**다(헤더 ①). 필드 대입으로 바꾸면 실물에서 안 먹는다 */
  set(x: number, y: number): void { this.x = x; this.y = y; }
}

class FakeTexture {
  static made: FakeTexture[] = [];
  repeat = new FakeVec2();
  center = new FakeVec2();
  rotation = 0;
  wrapS = 0;
  wrapT = 0;
  colorSpace = 'srgb-linear';
  /** `needsUpdate` **대입 횟수**. 실물에서 이것이 이미지 재업로드다(`Texture.js:293-300`) */
  updates = 0;
  disposed = 0;
  constructor(public image: unknown) { FakeTexture.made.push(this); }
  set needsUpdate(v: boolean) { if (v) this.updates++; }
  get needsUpdate(): boolean { return false; }
  dispose(): void { this.disposed++; }
}

const REPEAT_WRAPPING = 1000;
const SRGB = 'srgb';

vi.mock('three/webgpu', () => ({
  Texture: FakeTexture,
  RepeatWrapping: REPEAT_WRAPPING,
  SRGBColorSpace: SRGB,
}));

/** `new Image()` 는 node 에 없다. 로드는 안 시키고 **객체가 만들어지는 것만** 흉내낸다 */
class FakeImage {
  static made: FakeImage[] = [];
  onload: (() => void) | null = null;
  private _src = '';
  constructor() { FakeImage.made.push(this); }
  get src(): string { return this._src; }
  set src(v: string) { this._src = v; }
}

// ── 재질 대역 ───────────────────────────────────────────────────────────────

/** 파츠가 만든 텍스처. **우리 것이 아니다** — 이것이 dispose 되면 남의 것을 버린 것이다 */
class ForeignTexture {
  disposed = 0;
  dispose(): void { this.disposed++; }
}

class FakeMaterial {
  map: unknown = null;
  normalMap: unknown = null;
  metalnessMap: unknown = null;
  roughnessMap: unknown = null;
  metalness = 0.05;
  roughness = 0.95;
  /** 재컴파일 요청 **횟수**(헤더 ③) */
  recompiles = 0;
  set needsUpdate(v: boolean) { if (v) this.recompiles++; }
  get needsUpdate(): boolean { return false; }
}

/** 칠할 수 있는 표면 — **손으로 안 적는다.** 계약에서 유도한다 */
const TARGETS: readonly SurfaceKind[] = SURFACE_KINDS as readonly SurfaceKind[];
/** 그중 물. 파츠 풀 밖에 있어 **레지스트리로만** 닿는다 */
const WATER: readonly SurfaceKind[] = TARGETS.filter((k) => isWorldUv(k));
/** 파츠 쪽. 풀에서 온다 */
const PARTS_TARGETS: readonly SurfaceKind[] = TARGETS.filter((k) => !isWorldUv(k));

interface Harness {
  mats: Map<string, FakeMaterial>;
  /** `materialOf` 가 어떤 키로 불렸나 — 물이 새는지 보는 축 */
  asked: string[];
  /** 드롭 미리보기 표. 조립부가 소유하는 것의 대역이라 테스트가 직접 채운다 */
  previews: Map<string, string>;
  /** 부팅 뒤 등록 */
  registerLate(kind: string): void;
  set(list: readonly SurfaceSetting[]): void;
  update(): void;
  diag(): Record<string, unknown>;
  dispose(): void;
  owned(): number;
}

async function mount(opts: {
  /** 부팅 설정 */
  initial?: readonly SurfaceSetting[];
  /** 이 종류에는 재질이 없다(풀에 없는 종류) */
  missing?: readonly string[];
  /** 이 종류의 이 슬롯에는 파츠가 만든 텍스처가 이미 붙어 있다 */
  foreign?: Record<string, ForeignTexture>;
  /**
   * 이 종류는 **부팅 뒤에** 레지스트리에 들어온다(늦은 등록).
   *
   * 실물에서 이것이 나는 경로: `FEATURES` 배열 순서가 바뀌거나, ocean 이 지연 초기화되거나,
   * 새 물 표면이 비동기로 등록될 때. 검수관 블로커 B1 이 이 자리였다.
   */
  late?: readonly string[];
} = {}): Promise<Harness> {
  const { surfacePaintFeature } = await import(
    '../frontend/js/world2/features/surface-paint.js'
  );
  const mats = new Map<string, FakeMaterial>();
  for (const k of TARGETS) {
    if (opts.missing?.includes(k)) continue;
    mats.set(k, new FakeMaterial());
  }
  /**
   * 레지스트리 — 파츠 풀 밖의 재질(물). **부팅 전에 미리 채운다**: 실물에서도 `ocean` 이
   * 자기 메시를 만드는 시점이 `surfacePaintFeature.create` 보다 앞이다(`FEATURES` 배열
   * 순서 — ocean 이 surface 보다 먼저다).
   */
  const registry = new Map<string, unknown>();
  /** 드롭 미리보기 — 조립부가 소유하는 표의 대역 */
  const previews = new Map<string, string>();
  for (const w of WATER) {
    if (opts.missing?.includes(w) || opts.late?.includes(w)) continue;
    registry.set(w, mats.get(w));
  }
  for (const [key, tex] of Object.entries(opts.foreign ?? {})) {
    const [kind, slot] = key.split(':');
    const m = mats.get(kind);
    if (m) (m as unknown as Record<string, unknown>)[slot] = tex;
  }

  const asked: string[] = [];
  /**
   * **파츠 풀에 무엇을 물었나.** 조립부는 파츠 풀과 레지스트리를 합쳐 답하는데, 물이 풀에
   * 들어가면 슬롯 의미론이 오염된다(팀장이 그 선택지를 기각한 이유다) — 그래서 «풀은
   * 물에 대해 null 을 낸다» 를 잴 수 있게 대역을 갈라 둔다.
   */
  const poolKeys = new Set(PARTS_TARGETS as readonly string[]);
  let surfaces: readonly SurfaceSetting[] = opts.initial ?? [];
  const env = {
    // 조립부(`main.ts`)와 **같은 합성 규칙**을 쓴다 — 대역이 실물의 핵심 성질을 갖게 하는
    // 것이 이 파일의 규약이고, 여기서 규칙이 갈리면 「조립부에서만 나는 결함」이 생긴다.
    surfaceMaterial(kind: string) {
      asked.push(kind);
      return (poolKeys.has(kind) ? mats.get(kind) : undefined) ?? registry.get(kind) ?? null;
    },
    registerSurfaceMaterial(kind: string, m: unknown) { registry.set(kind, m); },
    // 조립부가 base 결합과 드롭 미리보기를 함께 흡수한다(`main.ts`). 대역은 그 **형태만**
    // 흉내낸다 — 여기서 `src` 를 그대로 돌려주면 「집행이 URL 을 스스로 만든다」는 결함이
    // 통과해 버린다(아래 「주소」 절이 그 축이다).
    textureUrl: (src: string) => previews.get(src) ?? `/app/${src}`,
    setTexturePreview: (src: string, url: string) => { previews.set(src, url); },
    surfaces: () => surfaces,
    setSurfaces: (s: readonly SurfaceSetting[]) => { surfaces = s; },
  };

  const inst = surfacePaintFeature.create(env as never);
  if (!inst) throw new Error('기능이 안 붙었다');
  return {
    mats,
    asked,
    previews,
    set(list) { surfaces = list; },
    /** 부팅 뒤에 재질을 신고한다 — 실물의 `registerSurfaceMaterial` 과 같은 문이다 */
    registerLate(kind: string) { env.registerSurfaceMaterial(kind, mats.get(kind)); },
    // 이 기능의 `update` 는 프레임 컨텍스트를 안 읽는다(폴링 한 줄) — 그래서 빈 것을 준다
    update() { inst.system?.update({} as never); },
    diag: () => (inst.diagnostics?.() ?? {}) as Record<string, unknown>,
    dispose: () => inst.dispose?.(),
    owned: () => Number((inst.diagnostics?.() as { owned?: number } | undefined)?.owned ?? -1),
  };
}

/** 설정 하나를 짓는다. `defaultSetting` 을 태워 기본값을 **여기 다시 안 적는다** */
function setting(kind: SurfaceKind, over: Partial<SurfaceSetting> = {}): SurfaceSetting {
  return { ...defaultSetting(kind), ...over };
}

const A = 'assets/textures/a.png';
const B = 'assets/textures/b.png';

beforeEach(() => {
  FakeTexture.made = [];
  FakeImage.made = [];
  (globalThis as unknown as { Image: unknown }).Image = FakeImage;
  vi.resetModules();
});

// ── A. 부팅 ────────────────────────────────────────────────────────────────

describe('부팅', () => {
  it('설정이 비면 어느 재질도 안 건드린다 — 「생략 = 지금 동작」', async () => {
    const h = await mount();
    for (const m of h.mats.values()) {
      expect(m.map).toBe(null);
      expect(m.recompiles).toBe(0);
    }
    expect(FakeTexture.made).toHaveLength(0);
  });

  it('칠할 수 있는 표면은 전부 조회한다 — 하나라도 빠지면 그 표면만 못 칠한다', async () => {
    const h = await mount();
    for (const t of TARGETS) expect(h.asked).toContain(t);
  });

  // ⚠ 이 축은 옛 판본에서 *"물은 `materialOf` 로 **조회조차** 하지 않는다"* 였고 **이제
  //   유효하지 않다.** 그때는 물 재질에 닿을 문이 아예 없었다(파츠 풀 밖이라 `materialOf`
  //   가 못 찾는다). 지금은 조립부 레지스트리가 그 문이고(팀장 판정 2026-08-15), 물도
  //   정식 대상이다 — 그래서 «안 묻는다» 가 아니라 **«무엇을 통해 오는가»** 를 잰다.
  it('물은 파츠 풀이 아니라 **레지스트리**에서 온다 — 슬롯 의미론을 안 더럽힌다', async () => {
    const h = await mount();
    expect(WATER.length, '물이 대상에서 통째로 빠졌다 — 감독 요구는 「물속 포함」이다')
      .toBeGreaterThan(0);
    for (const w of WATER) {
      expect(h.asked, `${w} 를 조회는 한다`).toContain(w);
      // 대역의 풀은 물에 null 을 낸다(위 `poolKeys`). 그런데도 재질을 얻어 칠했다면
      // 레지스트리를 거쳤다는 뜻이다.
      expect(h.mats.get(w), `${w} 재질이 있어야 이 축이 성립한다`).toBeTruthy();
    }
  });

  it('레지스트리에 물이 안 들어와 있으면 그 표면만 조용히 건너뛴다', async () => {
    const w = WATER[0];
    const h = await mount({ missing: [w], initial: [setting(w, { map: A })] });
    expect(h.owned()).toBe(0);
  });

  it('재질이 없는 종류는 조용히 건너뛴다 — 던지지 않는다', async () => {
    const kind = TARGETS[0];
    const h = await mount({ missing: [kind], initial: [setting(kind, { map: A })] });
    expect(h.owned()).toBe(0);
  });

  it('부팅 설정이 있으면 첫 프레임 전에 이미 반영돼 있다', async () => {
    const kind = TARGETS[0];
    const h = await mount({ initial: [setting(kind, { map: A })] });
    expect(h.mats.get(kind)!.map).toBeInstanceOf(FakeTexture);
    expect(h.owned()).toBe(1);
  });
});

// ── B. 적용 ────────────────────────────────────────────────────────────────

describe('적용', () => {
  it('배율·각도가 텍스처 변환에 들어간다 — center 는 (0.5,0.5)', async () => {
    const kind = TARGETS[0];
    const h = await mount({ initial: [setting(kind, { map: A, repeat: 8, turns: 1 })] });
    const t = FakeTexture.made[0];
    expect([t.repeat.x, t.repeat.y]).toEqual([8, 8]);
    expect([t.center.x, t.center.y]).toEqual([0.5, 0.5]);
    expect(t.rotation).toBeCloseTo(Math.PI / 2, 10);
  });

  it('turns 0~3 이 0°·90°·180°·270° 로 간다', async () => {
    for (const turns of [0, 1, 2, 3] as const) {
      FakeTexture.made = [];
      vi.resetModules();
      const kind = TARGETS[0];
      await mount({ initial: [setting(kind, { map: A, turns })] });
      expect(FakeTexture.made[0].rotation).toBeCloseTo((turns * Math.PI) / 2, 10);
    }
  });

  it('반복 래핑을 세운다 — 안 세우면 심리스가 가장자리에서 끊긴다', async () => {
    const kind = TARGETS[0];
    await mount({ initial: [setting(kind, { map: A })] });
    expect(FakeTexture.made[0].wrapS).toBe(REPEAT_WRAPPING);
    expect(FakeTexture.made[0].wrapT).toBe(REPEAT_WRAPPING);
  });

  it('`map` 만 sRGB 다 — 노말·메탈릭·러프니스는 색이 아니라 수치다', async () => {
    const kind = TARGETS[0];
    await mount({
      initial: [setting(kind, {
        map: A, normalMap: A, metalnessMap: A, roughnessMap: A,
      })],
    });
    const [color, ...data] = FakeTexture.made;
    expect(color.colorSpace).toBe(SRGB);
    expect(data).toHaveLength(3);
    for (const t of data) expect(t.colorSpace).not.toBe(SRGB);
  });

  it('메탈릭·러프니스가 재질에 들어간다', async () => {
    const kind = TARGETS[0];
    const h = await mount({
      initial: [setting(kind, { map: A, metalness: 0.7, roughness: 0.2 })],
    });
    expect(h.mats.get(kind)!.metalness).toBe(0.7);
    expect(h.mats.get(kind)!.roughness).toBe(0.2);
  });

  it('맵 슬롯 넷이 각각 자기 자리에 꽂힌다', async () => {
    const kind = TARGETS[0];
    const h = await mount({
      initial: [setting(kind, {
        map: A, normalMap: B, metalnessMap: A, roughnessMap: B,
      })],
    });
    const m = h.mats.get(kind)!;
    for (const slot of ['map', 'normalMap', 'metalnessMap', 'roughnessMap'] as const) {
      expect(m[slot], slot).toBeInstanceOf(FakeTexture);
    }
    // 슬롯마다 **다른** 텍스처여야 한다 — 하나를 공유하면 배율이 함께 움직인다
    expect(new Set([m.map, m.normalMap, m.metalnessMap, m.roughnessMap]).size).toBe(4);
  });

  it('여러 표면을 동시에 칠한다 — 서로를 덮지 않는다', async () => {
    const [k1, k2] = TARGETS;
    const h = await mount({
      initial: [setting(k1, { map: A, repeat: 4 }), setting(k2, { map: B, repeat: 16 })],
    });
    expect(h.mats.get(k1)!.map).not.toBe(h.mats.get(k2)!.map);
    expect(h.owned()).toBe(2);
  });
});

// ── B-2. 재컴파일을 언제 부르는가 ──────────────────────────────────────────

describe('재컴파일', () => {
  it('없던 슬롯이 생기면 한 번 부른다 — 노드 그래프가 실제로 바뀌는 유일한 경우', async () => {
    const kind = TARGETS[0];
    const h = await mount({ initial: [setting(kind, { map: A })] });
    expect(h.mats.get(kind)!.recompiles).toBe(1);
  });

  it('같은 슬롯에 다른 그림이면 **안 부른다** — 그래프는 그대로다', async () => {
    const kind = TARGETS[0];
    const h = await mount({ initial: [setting(kind, { map: A })] });
    const before = h.mats.get(kind)!.recompiles;
    h.set([setting(kind, { map: B })]);
    h.update();
    expect(h.mats.get(kind)!.recompiles).toBe(before);
  });

  it('배율만 바꾸면 재질도 텍스처도 재업로드를 안 부른다', async () => {
    const kind = TARGETS[0];
    const h = await mount({ initial: [setting(kind, { map: A, repeat: 2 })] });
    const tex = FakeTexture.made[0];
    const mBefore = h.mats.get(kind)!.recompiles;
    const tBefore = tex.updates;
    h.set([setting(kind, { map: A, repeat: 32, turns: 3 })]);
    h.update();
    // 변환은 반영되고
    expect(tex.repeat.x).toBe(32);
    expect(tex.rotation).toBeCloseTo((3 * Math.PI) / 2, 10);
    // 비용은 안 낸다 — `needsUpdate` 는 실물에서 이미지 재업로드다
    expect(h.mats.get(kind)!.recompiles).toBe(mBefore);
    expect(tex.updates).toBe(tBefore);
  });
});

// ── C. 회수 — **이 파일의 중심 축** ────────────────────────────────────────

describe('회수', () => {
  it('갈아 끼우면 옛 텍스처를 버린다 — 새 것은 살아 있다', async () => {
    const kind = TARGETS[0];
    const h = await mount({ initial: [setting(kind, { map: A })] });
    const old = FakeTexture.made[0];
    h.set([setting(kind, { map: B })]);
    h.update();
    const fresh = FakeTexture.made[1];
    expect(old.disposed).toBe(1);
    expect(fresh.disposed).toBe(0);
    expect(h.mats.get(kind)!.map).toBe(fresh);
  });

  it('같은 그림을 다시 주면 안 버리고 안 만든다 — 변환만 다시 건다', async () => {
    const kind = TARGETS[0];
    const h = await mount({ initial: [setting(kind, { map: A, repeat: 2 })] });
    const t = FakeTexture.made[0];
    h.set([setting(kind, { map: A, repeat: 8 })]);
    h.update();
    expect(FakeTexture.made).toHaveLength(1);
    expect(t.disposed).toBe(0);
    expect(t.repeat.x).toBe(8);
  });

  it('슬롯을 걷으면 버리고 부팅 상태로 되돌린다', async () => {
    const kind = TARGETS[0];
    const h = await mount({ initial: [setting(kind, { map: A })] });
    const t = FakeTexture.made[0];
    h.set([setting(kind)]);
    h.update();
    expect(t.disposed).toBe(1);
    expect(h.mats.get(kind)!.map).toBe(null);
    expect(h.owned()).toBe(0);
  });

  it('목록에서 표면이 통째로 빠지면 되돌린다 — 화면과 JSON 이 갈리지 않게', async () => {
    const [k1, k2] = TARGETS;
    const h = await mount({
      initial: [setting(k1, { map: A }), setting(k2, { map: B })],
    });
    const t1 = FakeTexture.made[0];
    h.set([setting(k2, { map: B })]);
    h.update();
    expect(t1.disposed).toBe(1);
    expect(h.mats.get(k1)!.map).toBe(null);
    expect(h.mats.get(k2)!.map).toBeInstanceOf(FakeTexture);
    expect(h.owned()).toBe(1);
  });

  it('teardown 이 전부 회수한다', async () => {
    const [k1, k2] = TARGETS;
    const h = await mount({
      initial: [
        setting(k1, { map: A, normalMap: B }),
        setting(k2, { map: B }),
      ],
    });
    expect(h.owned()).toBe(3);
    h.dispose();
    for (const t of FakeTexture.made) expect(t.disposed).toBeGreaterThan(0);
    expect(h.owned()).toBe(0);
  });

  it('⚠ 파츠가 만든 텍스처는 **절대 안 버린다** — 우리 것이 아니다', async () => {
    const kind = TARGETS[0];
    const mine = new ForeignTexture();
    const h = await mount({
      foreign: { [`${kind}:map`]: mine },
      initial: [setting(kind, { map: A })],
    });
    // 우리 것으로 덮었다가
    expect(h.mats.get(kind)!.map).toBeInstanceOf(FakeTexture);
    // 걷으면 **원래 것이 돌아온다** — 그리고 그것은 한 번도 안 버려졌다
    h.set([setting(kind)]);
    h.update();
    expect(h.mats.get(kind)!.map).toBe(mine);
    expect(mine.disposed).toBe(0);
    h.dispose();
    expect(mine.disposed).toBe(0);
  });

  it('파츠 텍스처가 있던 슬롯은 덮을 때 재컴파일을 안 부른다 — 그래프가 그대로다', async () => {
    const kind = TARGETS[0];
    const h = await mount({
      foreign: { [`${kind}:map`]: new ForeignTexture() },
      initial: [setting(kind, { map: A })],
    });
    expect(h.mats.get(kind)!.recompiles).toBe(0);
  });

  it('부팅 메탈릭·러프니스가 되돌아온다 — 코드에 기본값을 다시 안 적는다', async () => {
    const kind = TARGETS[0];
    const h = await mount();
    const m = h.mats.get(kind)!;
    const was = { metalness: m.metalness, roughness: m.roughness };
    h.set([setting(kind, { map: A, metalness: 1, roughness: 0 })]);
    h.update();
    expect(m.metalness).toBe(1);
    h.dispose();
    expect(m.metalness).toBe(was.metalness);
    expect(m.roughness).toBe(was.roughness);
  });
});

// ── D. 개수 — 편집 세션이 새는가 ──────────────────────────────────────────

describe('개수', () => {
  it('⚠ 스무 번을 갈아 끼워도 들고 있는 텍스처가 안 는다', async () => {
    const kind = TARGETS[0];
    const h = await mount({ initial: [setting(kind, { map: A })] });
    expect(h.owned()).toBe(1);
    for (let i = 0; i < 20; i++) {
      h.set([setting(kind, { map: `assets/textures/t${i}.png`, repeat: (i % 8) + 1 })]);
      h.update();
      expect(h.owned(), `${i}회차`).toBe(1);
    }
    // 만든 것은 21장, 살아 있는 것은 1장 — 나머지 20장이 전부 회수됐다
    expect(FakeTexture.made).toHaveLength(21);
    expect(FakeTexture.made.filter((t) => t.disposed === 0)).toHaveLength(1);
  });

  it('진단이 표면 수와 보유 텍스처 수를 낸다 — 개수 축이 읽는 자리다', async () => {
    const [k1, k2] = TARGETS;
    const h = await mount({
      initial: [setting(k1, { map: A, roughnessMap: B }), setting(k2, { map: A })],
    });
    expect(h.diag()).toMatchObject({ surfaces: 2, owned: 3 });
  });
});

// ── E. 폴링 ────────────────────────────────────────────────────────────────

describe('폴링', () => {
  it('같은 배열이면 아무것도 안 한다 — 참조 동등성이 판정 축이다', async () => {
    const kind = TARGETS[0];
    const list = [setting(kind, { map: A })];
    const h = await mount({ initial: list });
    const t = FakeTexture.made[0];
    for (let i = 0; i < 5; i++) h.update();
    expect(FakeTexture.made).toHaveLength(1);
    expect(t.disposed).toBe(0);
    expect(h.mats.get(kind)!.recompiles).toBe(1);
  });

  it('내용이 같아도 **새 배열**이면 반영한다 — 제자리 수정을 막는 계약', async () => {
    const kind = TARGETS[0];
    const h = await mount({ initial: [setting(kind, { map: A, repeat: 2 })] });
    h.set([setting(kind, { map: A, repeat: 2 })]);
    h.update();
    // 같은 src 라 새로 만들지도 버리지도 않는다 — 반영은 변환 재설정으로 끝난다
    expect(FakeTexture.made).toHaveLength(1);
    expect(FakeTexture.made[0].disposed).toBe(0);
  });
});

// ── F. 주소 — 집행이 URL 을 스스로 만들지 않는가 ───────────────────────────
//
// base 결합(`asset-url.ts`)과 드롭 미리보기를 **조립부가 한 자리에서** 흡수한다. 집행이
// `src` 를 그대로 `img.src` 에 넣으면 두 가지가 조용히 깨진다:
//   ① base 가 붙은 배포에서만 404 (로컬에서는 상대 경로가 우연히 맞는다)
//   ② 감독이 방금 떨어뜨린 파일이 커밋 전에는 안 보인다
// 둘 다 **이 환경에서 재현되지 않는** 형태라 축이 없으면 통과한다.

describe('주소', () => {
  it('★ `env.textureUrl` 을 거친다 — src 를 그대로 쓰지 않는다', async () => {
    const kind = TARGETS[0];
    await mount({ initial: [setting(kind, { map: A })] });
    const img = FakeTexture.made[0].image as FakeImage;
    expect(img.src, '★ 상대 경로를 그대로 넣었다 — base 가 붙은 배포에서만 깨진다')
      .toBe(`/app/${A}`);
  });

  it('★ 드롭 미리보기가 있으면 그것을 쓴다 — 커밋 전에도 화면에 뜬다', async () => {
    const kind = TARGETS[0];
    const h = await mount();
    h.previews.set(A, 'blob:preview-1');
    h.set([setting(kind, { map: A })]);
    h.update();
    const img = FakeTexture.made[0].image as FakeImage;
    expect(img.src).toBe('blob:preview-1');
  });

  it('슬롯 넷이 각자 자기 주소를 받는다', async () => {
    const kind = TARGETS[0];
    await mount({ initial: [setting(kind, { map: A, normalMap: B })] });
    const srcs = FakeTexture.made.map((t) => (t.image as FakeImage).src);
    expect(srcs).toEqual([`/app/${A}`, `/app/${B}`]);
  });
});

// ── G. 늦은 등록 — 부팅에 없던 재질도 칠할 수 있는가 (검수관 블로커 B1) ────
//
// `FeatureEnv.registerSurfaceMaterial` 주석이 *"언제 등록해도 된다 … 설정이 안 바뀌어도 다음
// 폴링에 다시 시도한다"* 라고 약속한다. **그 약속이 참인지를 여기서 못 박는다.**
//
// ⚠ 첫 판본은 이 헤더가 «약속을 못 박는다» 라고 적으면서 **다른 명제를 쟀다**(검수관 B2) —
// 축 1이 `h.set([...])` 로 설정을 다시 주고 있었고, 주석 스스로 *"새 배열을 줘야 폴링이
// 본다"* 라고 적어 두었다. 즉 검사가 재는 것은 «설정을 다시 주면 반영된다» 였고 약속은
// «폴링이 잡는다» 였다. **문장과 검사가 같은 명제를 재야 한다** — 아래 「설정 재공급 없이」
// 축이 그 간극을 메운다.
//
// 그전에는 거짓이었다: `base` 를 채우는 곳이 `create()` 부팅 루프 하나뿐이라, 그 시점에
// 재질이 없던 표면은 «그 프레임» 이 아니라 **세션 전체에서 영구히** 칠할 수도 되돌릴 수도
// 없었다. 지금 동작하던 이유는 `FEATURES` 배열 순서가 우연히 맞아서였다(ocean 이 앞).
//
// 검수관 판정: *"문장을 고치는 대신 주장을 참으로 만드는 것이 이 저장소 처방이다(GS-3
// 전례). 어느 쪽이든 **검사로 못 박는 것**이 옳다."*

describe('늦은 등록', () => {
  const LATE = WATER[0];

  it('★ 부팅에 없던 표면도 나중에 등록되면 칠해진다 — 영구 불능이 아니다', async () => {
    const h = await mount({ late: [LATE] });
    // 아직 재질이 없다 — 설정을 줘도 아무 일이 없어야 한다(던지지 않는다)
    h.set([setting(LATE, { map: A })]);
    h.update();
    expect(h.owned(), '재질이 없는데 텍스처를 만들었다').toBe(0);

    // 늦게 등록된다
    h.registerLate(LATE);
    // **새 배열**을 줘야 폴링이 본다 — 참조 동등성이 판정 축이다
    h.set([setting(LATE, { map: A })]);
    h.update();
    expect(h.owned(), '★ 늦게 등록된 표면이 영구히 안 칠해진다 — B1 회귀').toBe(1);
    expect(h.mats.get(LATE)!.map).toBeInstanceOf(FakeTexture);
  });

  it('★ 늦게 등록된 표면도 되돌릴 수 있다 — 스냅샷이 그때 떠야 한다', async () => {
    const h = await mount({ late: [LATE] });
    h.registerLate(LATE);
    const m = h.mats.get(LATE)!;
    const was = { metalness: m.metalness, roughness: m.roughness };
    h.set([setting(LATE, { map: A, metalness: 1, roughness: 0 })]);
    h.update();
    expect(m.metalness).toBe(1);
    h.dispose();
    expect(m.metalness, '★ 되돌릴 기준선이 없다').toBe(was.metalness);
    expect(m.roughness).toBe(was.roughness);
  });

  it('늦게 뜬 스냅샷이 **우리 텍스처를 원래 값으로 오인하지 않는다**', async () => {
    // `base` 가 비었다는 것은 우리가 그 표면을 한 번도 안 만졌다는 뜻이라 안전하다는 것이
    // 지연 스냅샷의 근거다. 그 근거가 실제로 성립하는지 본다 — 칠한 뒤에 걷어도 원래
    // 상태(맵 없음)로 돌아와야 한다.
    const h = await mount({ late: [LATE] });
    h.registerLate(LATE);
    h.set([setting(LATE, { map: A })]);
    h.update();
    h.set([setting(LATE)]);
    h.update();
    expect(h.mats.get(LATE)!.map, '★ 우리 텍스처가 「원래 값」으로 굳었다').toBe(null);
  });
});

// ── H. 설정 재공급 없이 (검수관 블로커 B2) ────────────────────────────────
//
// **방문자 세션이 이 축의 실물이다.** 설정은 `features/overlay.ts` 가 부팅에 딱 한 번
// `setSurfaces` 로 주고, 방문자는 편집을 안 하므로 그 참조가 세션 내내 안 바뀐다.
// 그래서 «설정을 다시 주면 반영된다» 는 방문자에게 아무 보장도 아니다 — 그 재공급이
// 오지 않기 때문이다.
//
// 위 「늦은 등록」 축들은 설정을 다시 주고 잰다. 여기서는 **다시 주지 않는다.**

describe('설정 재공급 없이', () => {
  const LATE = WATER[0];

  it('★ 늦게 등록된 재질이 **폴링만으로** 잡힌다 — 방문자 세션의 유일한 경로다', async () => {
    // 부팅에 설정은 이미 있고 재질만 없다 — 방문자가 늦은 등록을 만나는 형태 그대로다.
    const h = await mount({ late: [LATE], initial: [setting(LATE, { map: A })] });
    expect(h.owned(), '재질이 없는데 텍스처를 만들었다').toBe(0);

    h.registerLate(LATE);
    // **설정을 다시 주지 않는다.** 폴링만 돈다.
    h.update();

    expect(h.owned(), '★ 폴링이 안 잡는다 — 방문자에게 영구히 안 칠해진다(B2 회귀)').toBe(1);
    expect(h.mats.get(LATE)!.map).toBeInstanceOf(FakeTexture);
  });

  it('미해결이 없으면 폴링이 아무것도 안 한다 — 조기 반환이 그대로 산다', async () => {
    const kind = PARTS_TARGETS[0];
    const list = [setting(kind, { map: A })];
    const h = await mount({ initial: list });
    const t = FakeTexture.made[0];
    for (let i = 0; i < 5; i++) h.update();
    // 재질을 다시 만들지도, 버리지도 않는다 — `pending` 이 비면 비용이 0 이어야 한다
    expect(FakeTexture.made).toHaveLength(1);
    expect(t.disposed).toBe(0);
  });

  it('한 번 잡히면 다시 안 만든다 — 재시도가 매 프레임 반복되지 않는다', async () => {
    const h = await mount({ late: [LATE], initial: [setting(LATE, { map: A })] });
    h.registerLate(LATE);
    h.update();
    const made = FakeTexture.made.length;
    for (let i = 0; i < 5; i++) h.update();
    expect(FakeTexture.made).toHaveLength(made);
  });
});
