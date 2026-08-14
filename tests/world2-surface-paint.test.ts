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

/** 칠할 수 있는 표면 — **손으로 안 적는다.** 파츠 레지스트리에서 유도한다 */
const TARGETS: readonly SurfaceKind[] = (SURFACE_KINDS as readonly SurfaceKind[])
  .filter((k) => !isWorldUv(k));
const WATER: readonly SurfaceKind[] = (SURFACE_KINDS as readonly SurfaceKind[])
  .filter((k) => isWorldUv(k));

interface Harness {
  mats: Map<string, FakeMaterial>;
  /** `materialOf` 가 어떤 키로 불렸나 — 물이 새는지 보는 축 */
  asked: string[];
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
} = {}): Promise<Harness> {
  const { surfacePaintFeature } = await import(
    '../frontend/js/world2/features/surface-paint.js'
  );
  const mats = new Map<string, FakeMaterial>();
  for (const k of TARGETS) {
    if (opts.missing?.includes(k)) continue;
    mats.set(k, new FakeMaterial());
  }
  for (const [key, tex] of Object.entries(opts.foreign ?? {})) {
    const [kind, slot] = key.split(':');
    const m = mats.get(kind);
    if (m) (m as unknown as Record<string, unknown>)[slot] = tex;
  }

  const asked: string[] = [];
  let surfaces: readonly SurfaceSetting[] = opts.initial ?? [];
  const env = {
    pools: {
      materialOf(key: string) { asked.push(key); return mats.get(key) ?? null; },
    },
    surfaces: () => surfaces,
    setSurfaces: (s: readonly SurfaceSetting[]) => { surfaces = s; },
  };

  const inst = surfacePaintFeature.create(env as never);
  if (!inst) throw new Error('기능이 안 붙었다');
  return {
    mats,
    asked,
    set(list) { surfaces = list; },
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

  it('물(sea·bed)은 `materialOf` 로 조회조차 하지 않는다 — ocean.ts 소관이다', async () => {
    const h = await mount();
    expect(WATER.length).toBeGreaterThan(0); // 축이 비지 않았는가
    for (const w of WATER) expect(h.asked).not.toContain(w);
  });

  it('칠할 수 있는 표면은 전부 조회한다 — 하나라도 빠지면 그 표면만 못 칠한다', async () => {
    const h = await mount();
    for (const t of TARGETS) expect(h.asked).toContain(t);
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
